import Phaser from 'phaser';
import { ARENA, BOSS, BURST, CONTROL, DIFFICULTY, ELITE, ENEMY, HAZARD, PICKUP, PLAYER, SCORING } from '../config/GameConfig';
import { ObjectPool } from '../core/ObjectPool';
import { weightedIndex } from '../core/Rng';
import { session } from '../core/Session';
import { clamp, TAU } from '../core/math';
import { applyCamera } from '../core/viewport';
import { BRAND, BRAND_CSS } from '../config/brand';
import { Boss } from '../entities/Boss';
import { Enemy } from '../entities/Enemy';
import { Pickup } from '../entities/Pickup';
import { Projectile } from '../entities/Projectile';
import { Player } from '../entities/Player';
import { Arena } from '../effects/Arena';
import { Fx } from '../effects/Fx';
import { TEX } from '../effects/Textures';
import { audio } from '../systems/AudioEngine';
import { bossStageHp, bossPhaseAt, bossTimeFor, difficultyAt, eliteIntervalAt, type EnemyKind } from '../systems/Difficulty';
import { haptics } from '../systems/Haptics';
import { addXp, createLevelState, levelProgress, type LevelState } from '../systems/Leveling';
import { CONTROL_MODES, recordRun, type ControlMode } from '../systems/Progression';
import type { RunSummary } from '../systems/Achievements';
import {
  breakCombo,
  createScoreState,
  heatFraction,
  isAscended,
  scoreEmber,
  scoreKill,
  scoreNearMiss,
  scoreTime,
  tickCombo,
  type ScoreState,
} from '../systems/Scoring';
import { Tutorial } from '../systems/Tutorial';
import { Hud } from '../ui/Hud';
import { computeStats, UPGRADES_BY_ID, type PlayerStats, type UpgradeLevels } from '../upgrades/UpgradeDefs';
import { draftUpgrades, takeUpgrade } from '../upgrades/UpgradeDraft';
import { gameOverPanel, pausePanel, progressionPanel, upgradePanel } from '../ui/panels';

const DEPTH = {
  arena: 0,
  trail: 6,
  pickup: 10,
  projectile: 20,
  enemy: 30,
  boss: 40,
  player: 50,
  fx: 62,
  hud: 100,
} as const;

interface TrailNode {
  x: number;
  y: number;
  life: number;
  sprite: Phaser.GameObjects.Image;
}

/** The run. Everything gameplay happens here. */
export class GameScene extends Phaser.Scene {
  private arena!: Arena;
  private fx!: Fx;
  private hud!: Hud;
  private player!: Player;
  private boss!: Boss;

  private enemyPool!: ObjectPool<Enemy>;
  private projectilePool!: ObjectPool<Projectile>;
  private pickupPool!: ObjectPool<Pickup>;
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly pickups: Pickup[] = [];
  private readonly trail: TrailNode[] = [];
  private trailSpritePool!: ObjectPool<Phaser.GameObjects.Image>;

  private score!: ScoreState;
  private levels!: LevelState;
  private build: UpgradeLevels = {};
  private stats!: PlayerStats;
  private tutorial!: Tutorial;

  private elapsed = 0;
  private spawnTimer = 0;
  private collapseTimer = 0;
  private ambientTimer = 0;
  private homingTimer = 0;
  private trailTimer = 0;
  private trailDamageTimer = 0;
  private hazardHitTimer = 0;
  private timeScale = 1;
  private slowMoHandle = 0;

  private bossIndex = 0;
  private bossWarned = false;
  private bossActive = false;

  private paused = false;
  private dead = false;
  private pendingLevelUps = 0;

  /** Virtual steering target the player flies toward, in world coordinates. */
  private readonly pointer = { active: false, x: 0, y: 0 };
  /** Where the finger went down, and where the phoenix was at that moment. */
  private readonly touchAnchor = { x: 0, y: 0 };
  private readonly playerAnchor = { x: 0, y: 0 };
  private controlMode: ControlMode = 'relative';
  private stick?: Phaser.GameObjects.Graphics;
  private eliteTimer = 0;
  private emberChain = 0;
  private emberChainTimer = 0;
  private phaseAnnounced = 0;
  private distanceMoved = 0;
  private runBursts = 0;
  private runDamage = 0;
  private runLongestClean = 0;
  private runBosses = 0;
  private legendaryTaken = false;

  constructor() {
    super('Game');
  }

  create(data: { pointerX?: number; pointerY?: number }): void {
    const { w: width, h: height } = applyCamera(this);
    this.cameras.main.setBackgroundColor(BRAND_CSS.voidBlack);
    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.resetRunState();

    this.arena = new Arena(this, DEPTH.arena);
    this.fx = new Fx(this, DEPTH.fx);
    this.arena.reducedMotion = session.settings.reducedMotion;
    this.fx.reducedMotion = session.settings.reducedMotion;
    this.fx.setViewport(width, height);
    this.arena.layout(width, height);

    this.stats = computeStats(this.build);
    this.player = new Player(this, DEPTH.player, session.palette, this.stats);
    this.player.reducedMotion = session.settings.reducedMotion;
    this.player.spawn(this.arena.cx, this.arena.cy);

    this.boss = new Boss(this, DEPTH.boss);
    this.hud = new Hud(this, DEPTH.hud, () => this.openPause());
    this.hud.layout(width, height);

    this.enemyPool = new ObjectPool<Enemy>(() => new Enemy(this, DEPTH.enemy), (e) => e.deactivate(), 14);
    this.projectilePool = new ObjectPool<Projectile>(() => new Projectile(this, DEPTH.projectile), (p) => p.deactivate(), 24);
    this.pickupPool = new ObjectPool<Pickup>(() => new Pickup(this, DEPTH.pickup), (p) => p.deactivate(), 16);
    this.trailSpritePool = new ObjectPool<Phaser.GameObjects.Image>(
      () =>
        this.add
          .image(0, 0, TEX.glow)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.trail)
          .setVisible(false),
      (s) => s.setVisible(false),
      12,
    );

    this.controlMode = session.settings.controlMode;
    this.stick = this.add.graphics().setDepth(DEPTH.hud - 1).setBlendMode(Phaser.BlendModes.ADD);

    this.tutorial = new Tutorial(!session.save.tutorialSeen);

    // The first objective is visible immediately instead of relying on the
    // ambient pickup timer. A short arc also teaches steering through motion.
    if (!session.save.tutorialSeen) {
      for (const [angle, radius] of [[-0.55, 0.2], [-0.1, 0.32], [0.35, 0.44]] as const) {
        const point = this.arena.pointAt(angle, radius);
        this.spawnPickup(point.x, point.y, 0);
      }
      this.fx.shockwave(this.player.x, this.player.y, session.palette.glow, 150, 360);
    }

    // In absolute mode the phoenix should already be heading for the tap that
    // launched the run. In the offset modes that would be a lurch toward a
    // point the player never aimed at, so it simply holds station.
    if (this.controlMode === 'absolute' && typeof data?.pointerX === 'number') {
      this.pointer.x = data.pointerX;
      this.pointer.y = data.pointerY ?? this.arena.cy;
    } else {
      this.pointer.x = this.player.x;
      this.pointer.y = this.player.y;
    }

    this.bindInput();
    audio.unlock();
    audio.startMusic();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private resetRunState(): void {
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.pickups.length = 0;
    this.trail.length = 0;
    this.build = {};
    this.score = createScoreState();
    this.levels = createLevelState();
    this.elapsed = 0;
    this.spawnTimer = 0.6;
    this.collapseTimer = 12;
    this.ambientTimer = 0.4;
    this.homingTimer = 0;
    this.trailTimer = 0;
    this.trailDamageTimer = 0;
    this.hazardHitTimer = 0;
    this.timeScale = 1;
    this.eliteTimer = DIFFICULTY.eliteIntervalStart;
    this.emberChain = 0;
    this.emberChainTimer = 0;
    this.phaseAnnounced = 0;
    this.bossIndex = 0;
    this.bossWarned = false;
    this.bossActive = false;
    this.paused = false;
    this.dead = false;
    this.pendingLevelUps = 0;
    this.distanceMoved = 0;
    this.runBursts = 0;
    this.runDamage = 0;
    this.runLongestClean = 0;
    this.runBosses = 0;
    this.legendaryTaken = false;
    this.pointer.active = false;
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      if (objects.length > 0) return; // pause button
      audio.unlock();
      this.pointer.active = true;
      // Anchor both the finger and the phoenix, so relative/joystick steering
      // is measured from where the drag began rather than from the screen.
      this.touchAnchor.x = pointer.worldX;
      this.touchAnchor.y = pointer.worldY;
      this.playerAnchor.x = this.player.x;
      this.playerAnchor.y = this.player.y;
      this.updateSteerTarget(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.pointer.active = true;
      this.updateSteerTarget(pointer.worldX, pointer.worldY);
    });
    const release = () => {
      if (!this.pointer.active) return;
      this.pointer.active = false;
      // Releasing is the burst input — that is the whole control scheme.
      if (!this.paused && !this.dead && this.player.canBurst()) this.doBurst();
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.on(Phaser.Input.Events.GAME_OUT, release);

    // Desktop convenience: space bursts, Esc/P pauses.
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.paused && !this.dead && this.player.canBurst()) this.doBurst();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
    this.input.keyboard?.on('keydown-P', () => this.openPause());
  }

  /**
   * Resolve a finger position into the point the phoenix should fly toward.
   *
   * All three control modes collapse to "here is a target": the player physics
   * (speed ramps with distance to target) then behaves identically, so the
   * modes differ only in where the target comes from.
   */
  private updateSteerTarget(fingerX: number, fingerY: number): void {
    const dx = fingerX - this.touchAnchor.x;
    const dy = fingerY - this.touchAnchor.y;

    if (this.controlMode === 'absolute') {
      this.pointer.x = fingerX;
      this.pointer.y = fingerY;
      return;
    }

    if (this.controlMode === 'joystick') {
      // Direction from the planted stick; distance sets throttle. Aiming the
      // target ahead of the phoenix keeps the existing speed ramp meaningful.
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        this.pointer.x = this.player.x;
        this.pointer.y = this.player.y;
        return;
      }
      const throttle = Math.min(1, dist / CONTROL.stickRadius);
      const reach = PLAYER.fullSpeedDistance * throttle * 1.2;
      this.pointer.x = this.player.x + (dx / dist) * reach;
      this.pointer.y = this.player.y + (dy / dist) * reach;
      return;
    }

    // Relative: the phoenix mirrors the finger's movement from where it was
    // when the drag started, amplified so a short thumb sweep crosses the
    // caldera. The finger never has to sit on top of the phoenix.
    const target = {
      x: this.playerAnchor.x + dx * CONTROL.relativeGain,
      y: this.playerAnchor.y + dy * CONTROL.relativeGain,
    };
    this.arena.clamp(target, 1);
    this.pointer.x = target.x;
    this.pointer.y = target.y;
  }

  /** Draw the joystick ring while a joystick drag is active. */
  private drawStick(): void {
    if (!this.stick) return;
    const g = this.stick;
    g.clear();
    if (this.controlMode !== 'joystick' || !this.pointer.active) return;
    g.lineStyle(2, BRAND.steel, 0.35);
    g.strokeCircle(this.touchAnchor.x, this.touchAnchor.y, CONTROL.stickRadius);
    const dx = this.pointer.x - this.player.x;
    const dy = this.pointer.y - this.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const throttle = Math.min(1, dist / (PLAYER.fullSpeedDistance * 1.2));
    g.fillStyle(BRAND.emberOrange, 0.5);
    g.fillCircle(
      this.touchAnchor.x + (dx / dist) * CONTROL.stickRadius * throttle,
      this.touchAnchor.y + (dy / dist) * CONTROL.stickRadius * throttle,
      12,
    );
  }

  private onResize(): void {
    const { w, h } = applyCamera(this);
    this.arena.layout(w, h);
    this.hud.layout(w, h);
    this.fx.setViewport(w, h);
  }

  private onBlur(): void {
    if (!this.paused && !this.dead) this.openPause();
    audio.suspend();
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    window.clearTimeout(this.slowMoHandle);
    session.ui.closePanel();
    session.ui.hideHint();
    // Phaser destroys every GameObject the scene created; the pools only hold
    // references to those, so clearing the arrays is enough to avoid leaks.
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.pickups.length = 0;
    this.trail.length = 0;
    this.enemyPool.clear();
    this.projectilePool.clear();
    this.pickupPool.clear();
    this.trailSpritePool.clear();
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  override update(_time: number, delta: number): void {
    // Clamp dt so a backgrounded tab cannot teleport everything on return.
    const rawDt = Math.min(delta / 1000, 0.05);

    if (this.paused || this.dead) return;
    const dt = rawDt * this.timeScale;

    this.elapsed += dt;
    const difficulty = difficultyAt(this.elapsed);

    this.arena.update(dt);
    this.updatePlayer(dt);
    this.updateSpawning(dt, difficulty.spawnInterval, difficulty.maxEnemies, difficulty.hpMultiplier, difficulty.speedMultiplier, difficulty.table);
    this.updateCollapses(dt, difficulty.collapseInterval);
    this.updateBossSchedule(dt, difficulty);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateTrail(dt);
    this.updateAutoAttacks(dt);
    this.checkCollisions(dt);

    this.updateEliteSchedule(dt);
    if (this.emberChainTimer > 0) {
      this.emberChainTimer -= dt;
      if (this.emberChainTimer <= 0) this.emberChain = 0;
    }
    this.announcePhase();

    scoreTime(this.score, dt);
    tickCombo(this.score, dt);
    this.player.setAscended(isAscended(this.score));
    this.runLongestClean = Math.max(this.runLongestClean, this.player.cleanTimer);

    this.drawStick();
    this.updateHud(dt);
    this.updateTutorial(dt);
  }

  private updatePlayer(dt: number): void {
    const before = { x: this.player.x, y: this.player.y };
    this.player.update(dt, this.pointer, this.arena);
    this.distanceMoved += Math.hypot(this.player.x - before.x, this.player.y - before.y);

    // Arena collapse damage, rate-limited so standing in lava is a slow burn.
    this.hazardHitTimer -= dt;
    if (this.hazardHitTimer <= 0 && this.arena.sectorDamageAt(this.player.x, this.player.y)) {
      this.hazardHitTimer = HAZARD.damageCooldown;
      this.damagePlayer();
    }
  }

  // ── Spawning ──────────────────────────────────────────────────────────────
  private updateSpawning(
    dt: number,
    interval: number,
    maxEnemies: number,
    hpMultiplier: number,
    speedMultiplier: number,
    table: { kind: EnemyKind; weight: number }[],
  ): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.enemies.length >= maxEnemies || table.length === 0) return;

    // While the boss is alive the ordinary spawn cadence halves so the fight reads.
    this.spawnTimer = interval * (this.bossActive ? 2 : 1);
    const index = weightedIndex(table.map((t) => t.weight), Math.random());
    if (index < 0) return;
    const kind = table[index].kind;

    const spawn = kind === 'mine' ? this.arena.randomInsidePoint(Math.random, 0.8) : this.arena.randomEdgePoint();
    this.spawnEnemy(kind, spawn.x, spawn.y, hpMultiplier, speedMultiplier);
  }

  private spawnEnemy(
    kind: EnemyKind,
    x: number,
    y: number,
    hpMultiplier: number,
    speedMultiplier: number,
    options: { elite?: boolean; child?: boolean } = {},
  ): Enemy {
    const enemy = this.enemyPool.acquire();
    enemy.spawn({ kind, x, y, hpMultiplier, speedMultiplier, ...options });
    this.enemies.push(enemy);
    if (options.elite) {
      this.fx.shockwave(x, y, enemy.glowColor, 180, 520);
      session.ui.toast('Elite rising');
      audio.warning();
      haptics.play('boss');
    }
    return enemy;
  }

  private updateCollapses(dt: number, interval: number): void {
    this.collapseTimer -= dt;
    if (this.collapseTimer > 0) return;
    this.collapseTimer = interval;
    this.arena.spawnSector();
    audio.warning();
  }

  private updateBossSchedule(dt: number, difficulty: { hpMultiplier: number; speedMultiplier: number }): void {
    void dt;
    if (this.bossActive) return;
    const dueAt = bossTimeFor(this.bossIndex);

    if (!this.bossWarned && this.elapsed >= dueAt - BOSS.warningTime) {
      this.bossWarned = true;
      session.ui.toast(`${BOSS.name} awakens`, 3000);
      audio.bossWarning();
      haptics.play('boss');
      this.fx.flash(BRAND.emberOrange, 0.3, 400);
    }

    if (this.elapsed >= dueAt) {
      this.bossActive = true;
      this.bossWarned = false;
      const spawn = this.arena.pointAt(-Math.PI / 2, 0.55);
      this.boss.spawn(spawn.x, spawn.y, bossStageHp(BOSS.stageHp, this.bossIndex));
      this.fx.shockwave(spawn.x, spawn.y, BRAND.emberOrange, 460, 700);
      this.fx.chromaticFlash(10, 240);
      this.fx.shake(0.012, 420);
      audio.setIntensity(1);
      void difficulty;
    }
  }

  // ── Entity updates ────────────────────────────────────────────────────────
  private updateEnemies(dt: number): void {
    const ctx = {
      playerX: this.player.x,
      playerY: this.player.y,
      dt,
      fire: (x: number, y: number, angle: number, speed: number, color: number) => this.fireEnemyShot(x, y, angle, speed, color),
      detonate: (enemy: Enemy) => this.detonateMine(enemy),
    };

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) {
        this.removeEnemyAt(i);
        continue;
      }
      enemy.update(ctx);
      // Anything that wanders far outside the caldera is recycled.
      if (this.arena.norm(enemy.x, enemy.y) > ARENA.cullRadius) {
        enemy.deactivate();
        this.removeEnemyAt(i);
      }
    }

    if (this.bossActive && this.boss.active) {
      this.boss.update({
        dt,
        playerX: this.player.x,
        playerY: this.player.y,
        arena: this.arena,
        fire: (x, y, angle, speed, color) => this.fireEnemyShot(x, y, angle, speed, color),
        summon: (x, y) => this.spawnEnemy('cinder', x, y, 1.4, 1.1),
        onStageChange: (stage) => this.onBossStage(stage),
      });
    }
  }

  private removeEnemyAt(index: number): void {
    const enemy = this.enemies[index];
    this.enemies.splice(index, 1);
    this.enemyPool.release(enemy);
  }

  private fireEnemyShot(x: number, y: number, angle: number, speed: number, color: number): void {
    const projectile = this.projectilePool.acquire();
    projectile.spawn({
      x,
      y,
      angle,
      speed: speed * this.stats.enemyProjectileSpeedMul,
      color,
      hostile: true,
      radius: 7,
      life: 7,
    });
    this.projectiles.push(projectile);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const alive = projectile.update(dt, () => this.nearestEnemy(projectile.x, projectile.y));
      if (!alive || this.arena.norm(projectile.x, projectile.y) > 1.25) {
        projectile.deactivate();
        this.projectiles.splice(i, 1);
        this.projectilePool.release(projectile);
      }
    }
  }

  private updatePickups(dt: number): void {
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = PICKUP.ambientInterval;
      if (this.pickups.length < PICKUP.maxAmbient) {
        const point = this.arena.randomInsidePoint();
        this.spawnPickup(point.x, point.y, 0);
      }
    }

    const magnet = PICKUP.basePickupRadius * this.stats.pickupRadiusMul;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const alive = pickup.update(dt, this.player.x, this.player.y, magnet);
      if (!alive) {
        pickup.deactivate();
        this.pickups.splice(i, 1);
        this.pickupPool.release(pickup);
      }
    }
  }

  private spawnPickup(x: number, y: number, scatter: number): void {
    const pickup = this.pickupPool.acquire();
    const palette = this.player.colors;
    pickup.spawn(x, y, palette.glow, palette.accent, scatter);
    this.pickups.push(pickup);
  }

  private updateTrail(dt: number): void {
    if (this.stats.trailDps > 0) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.09;
        const sprite = this.trailSpritePool.acquire();
        sprite
          .setVisible(true)
          .setPosition(this.player.x, this.player.y)
          .setTint(this.player.colors.glow)
          .setScale(this.stats.trailRadius / 48)
          .setAlpha(0.5);
        this.trail.push({ x: this.player.x, y: this.player.y, life: 1.4, sprite });
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const node = this.trail[i];
      node.life -= dt;
      if (node.life <= 0) {
        node.sprite.setVisible(false);
        this.trailSpritePool.release(node.sprite);
        this.trail.splice(i, 1);
        continue;
      }
      node.sprite.setAlpha(0.42 * (node.life / 1.4));
    }

    // Trail damage ticks on a fixed cadence rather than per-frame.
    this.trailDamageTimer -= dt;
    if (this.trailDamageTimer <= 0 && this.trail.length > 0 && this.stats.trailDps > 0) {
      const tick = 0.2;
      this.trailDamageTimer = tick;
      const damage = this.stats.trailDps * tick;
      for (const enemy of [...this.enemies]) {
        if (!enemy.active) continue;
        for (const node of this.trail) {
          if (Math.hypot(enemy.x - node.x, enemy.y - node.y) <= this.stats.trailRadius + enemy.radius) {
            this.damageEnemy(enemy, damage, false);
            break;
          }
        }
      }
    }
  }

  private updateAutoAttacks(dt: number): void {
    if (this.stats.homingShots <= 0) return;
    this.homingTimer -= dt;
    if (this.homingTimer > 0) return;
    this.homingTimer = this.stats.homingInterval;

    for (let i = 0; i < this.stats.homingShots; i++) {
      const target = this.nearestEnemy(this.player.x, this.player.y);
      const angle = target
        ? Math.atan2(target.y - this.player.y, target.x - this.player.x) + (Math.random() - 0.5) * 0.4
        : Math.random() * TAU;
      const projectile = this.projectilePool.acquire();
      projectile.spawn({
        x: this.player.x,
        y: this.player.y,
        angle,
        speed: 320,
        color: this.player.colors.accent,
        hostile: false,
        homing: true,
        damage: this.stats.homingDamage,
        radius: 6,
        life: 3.2,
      });
      this.projectiles.push(projectile);
    }
  }

  /** Closest live enemy (boss included) to a point — used by homing shots. */
  private nearestEnemy(x: number, y: number): { x: number; y: number; active: boolean } | null {
    let best: { x: number; y: number; active: boolean } | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    if (this.bossActive && this.boss.active) {
      const dist = Math.hypot(this.boss.x - x, this.boss.y - y);
      if (dist < bestDist) best = this.boss;
    }
    return best;
  }

  // ── Collisions ────────────────────────────────────────────────────────────
  private checkCollisions(dt: number): void {
    void dt;
    const px = this.player.x;
    const py = this.player.y;
    const hitR = this.player.hitRadius;
    const nearR = this.player.nearMissRadius;
    const blades = this.player.bladePositions();
    const bladeDamage = this.stats.orbitBladeDamage;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) continue;
      const dist = Math.hypot(enemy.x - px, enemy.y - py);

      if (dist <= hitR + enemy.radius) {
        this.damagePlayer();
        // Shove the enemy off so a single contact cannot chain-hit.
        const angle = Math.atan2(enemy.y - py, enemy.x - px);
        enemy.x += Math.cos(angle) * 26;
        enemy.y += Math.sin(angle) * 26;
      } else if (dist <= nearR + enemy.radius && enemy.nearMissTimer <= 0) {
        enemy.nearMissTimer = PLAYER.nearMissCooldown;
        this.registerNearMiss(enemy.x, enemy.y);
      }

      if (blades.length > 0) {
        for (const blade of blades) {
          if (Math.hypot(enemy.x - blade.x, enemy.y - blade.y) <= 16 + enemy.radius) {
            this.damageEnemy(enemy, bladeDamage * 0.4, true);
            break;
          }
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.active) continue;

      if (projectile.hostile) {
        const dist = Math.hypot(projectile.x - px, projectile.y - py);
        if (dist <= hitR + projectile.radius) {
          if (this.stats.reflectChance > 0 && Math.random() < this.stats.reflectChance) {
            projectile.reflect(this.player.colors.accent);
            this.fx.burstSparks(projectile.x, projectile.y, this.player.colors.accent, 6, 140);
            audio.hitEnemy();
          } else {
            this.damagePlayer();
            this.releaseProjectile(i);
          }
          continue;
        }
        if (dist <= nearR + projectile.radius && projectile.nearMissTimer <= 0) {
          projectile.nearMissTimer = PLAYER.nearMissCooldown;
          this.registerNearMiss(projectile.x, projectile.y);
        }
      } else {
        let consumed = false;
        for (const enemy of this.enemies) {
          if (!enemy.active) continue;
          if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) <= projectile.radius + enemy.radius) {
            this.damageEnemy(enemy, projectile.damage, true);
            consumed = true;
            break;
          }
        }
        if (!consumed && this.bossActive && this.boss.active) {
          if (Math.hypot(projectile.x - this.boss.x, projectile.y - this.boss.y) <= projectile.radius + this.boss.radius) {
            this.damageBoss(projectile.damage);
            consumed = true;
          }
        }
        if (consumed) {
          this.fx.burstSparks(projectile.x, projectile.y, this.player.colors.accent, 5, 150);
          this.releaseProjectile(i);
        }
      }
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (Math.hypot(pickup.x - px, pickup.y - py) <= hitR + pickup.radius + 6) {
        this.collectPickup(pickup);
        pickup.deactivate();
        this.pickups.splice(i, 1);
        this.pickupPool.release(pickup);
      }
    }

    if (this.bossActive && this.boss.active) {
      const dist = Math.hypot(this.boss.x - px, this.boss.y - py);
      if (dist <= hitR + this.boss.radius) this.damagePlayer();
      for (const blade of blades) {
        if (Math.hypot(this.boss.x - blade.x, this.boss.y - blade.y) <= 16 + this.boss.radius) {
          this.damageBoss(bladeDamage * 0.4);
          break;
        }
      }
    }
  }

  private releaseProjectile(index: number): void {
    const projectile = this.projectiles[index];
    projectile.deactivate();
    this.projectiles.splice(index, 1);
    this.projectilePool.release(projectile);
  }

  // ── Rewards & damage ──────────────────────────────────────────────────────
  private registerNearMiss(x: number, y: number): void {
    const gained = scoreNearMiss(this.score, this.stats.nearMissMul);
    this.player.addBurstEnergy(BURST.energyPerNearMiss * this.stats.nearMissMul);
    audio.nearMiss(this.score.combo);
    this.fx.burstSparks(x, y, this.player.colors.accent, 4, 120);
    if (this.score.combo % 5 === 0) {
      this.fx.floatText(this.player.x, this.player.y - 34, `${this.score.combo} HEAT`, BRAND_CSS.rebirthGold, 15);
      haptics.play('pickup');
    } else if (gained > 0 && this.score.multiplier > 1) {
      this.fx.floatText(x, y, `+${gained}`, BRAND_CSS.rebirthGold, 13);
    }
  }

  private collectPickup(pickup: Pickup): void {
    scoreEmber(this.score, this.stats.emberValueMul);
    audio.pickup(this.score.combo);
    haptics.play('pickup');
    this.fx.burstEmbers(pickup.x, pickup.y, this.player.colors.glow, 5);

    // Ember Chain — shards gathered in quick succession pay escalating XP. This
    // is the reward for collecting fast that replaces the old, backwards
    // arrangement where levelling quickly made the run harder.
    this.emberChain = this.emberChainTimer > 0 ? this.emberChain + 1 : 1;
    this.emberChainTimer = PICKUP.chainWindow;
    const bonus = Math.min(PICKUP.chainXpMax - 1, Math.floor(this.emberChain / PICKUP.chainStep));
    if (bonus > 0 && this.emberChain % PICKUP.chainStep === 0) {
      this.fx.floatText(pickup.x, pickup.y - 18, `CHAIN ×${this.emberChain}`, BRAND_CSS.signalCyan, 14);
      this.fx.shockwave(pickup.x, pickup.y, BRAND.signalCyan, 90, 300);
    }
    this.grantXp(PICKUP_XP + bonus);
  }

  private grantXp(amount: number): void {
    const gained = addXp(this.levels, amount, this.stats.xpMul);
    if (gained > 0) {
      this.pendingLevelUps += gained;
      audio.levelUp();
      haptics.play('levelUp');
      this.fx.shockwave(this.player.x, this.player.y, this.player.colors.accent, 220, 500);
      // No elite spawn here: levelling must never summon extra danger, or
      // collecting well becomes self-punishing. Elites are on their own clock.
      this.openDraft();
    }
  }

  /** Elites arrive on a clock that tightens with elapsed time only. */
  private updateEliteSchedule(dt: number): void {
    if (this.bossActive) return;
    this.eliteTimer -= dt;
    if (this.eliteTimer > 0) return;
    this.eliteTimer = eliteIntervalAt(this.elapsed);
    this.spawnElite();
  }

  /**
   * Name the stretch of the run the player is in. Legible progress is most of
   * what makes a survival run feel worth continuing.
   */
  private announcePhase(): void {
    const phase = bossPhaseAt(this.elapsed);
    if (phase <= this.phaseAnnounced) return;
    this.phaseAnnounced = phase;
    if (phase > 0) session.ui.toast(`Phase ${romanNumeral(phase + 1)}`, 2600);
  }

  private spawnElite(): void {
    const difficulty = difficultyAt(this.elapsed);
    const kinds: EnemyKind[] = difficulty.table.map((t) => t.kind).filter((k) => k !== 'mine');
    const kind = kinds.length > 0 ? kinds[Math.floor(Math.random() * kinds.length)] : 'cinder';
    const point = this.arena.randomEdgePoint();
    this.spawnEnemy(kind, point.x, point.y, difficulty.hpMultiplier, difficulty.speedMultiplier, { elite: true });
  }

  private damageEnemy(enemy: Enemy, amount: number, canCrit: boolean): void {
    let damage = amount;
    let crit = false;
    if (canCrit && this.stats.critChance > 0 && Math.random() < this.stats.critChance) {
      crit = true;
      damage *= 2;
    }

    const died = enemy.damage(damage);
    audio.hitEnemy();

    if (crit) {
      this.fx.flashOrb(enemy.x, enemy.y, this.player.colors.accent, this.stats.critRadius, 240);
      this.fx.shockwave(enemy.x, enemy.y, this.player.colors.accent, this.stats.critRadius, 300);
      // Critical explosions splash everything nearby.
      for (const other of [...this.enemies]) {
        if (other === enemy || !other.active) continue;
        if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= this.stats.critRadius) {
          if (other.damage(damage * 0.5)) this.killEnemy(other);
        }
      }
    }

    if (this.stats.chainTargets > 0) this.chainLightning(enemy);
    if (died) this.killEnemy(enemy);
  }

  private chainLightning(source: Enemy): void {
    let remaining = this.stats.chainTargets;
    const hit = new Set<Enemy>([source]);
    let from = source;
    while (remaining-- > 0) {
      let best: Enemy | null = null;
      let bestDist = 170;
      for (const enemy of this.enemies) {
        if (!enemy.active || hit.has(enemy)) continue;
        const dist = Math.hypot(enemy.x - from.x, enemy.y - from.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = enemy;
        }
      }
      if (!best) break;
      hit.add(best);
      this.zap(from.x, from.y, best.x, best.y);
      if (best.damage(this.stats.chainDamage)) this.killEnemy(best);
      from = best;
    }
  }

  private zap(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.add.graphics().setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(3, BRAND.signalCyan, 0.9);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1, 0xffffff, 1);
    g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private killEnemy(enemy: Enemy): void {
    if (!enemy.active) return;
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;

    const wasElite = enemy.isElite;
    const x = enemy.x;
    const y = enemy.y;
    const color = enemy.glowColor;
    const splitCount = enemy.splitCount;

    scoreKill(this.score, wasElite ? SCORING.eliteKillScore : enemy.score);
    this.grantXp(enemy.xp);
    this.player.addBurstEnergy(BURST.energyPerKill);

    enemy.deactivate();
    this.removeEnemyAt(index);

    audio.enemyDeath();
    this.fx.burstSparks(x, y, color, wasElite ? 26 : 12, wasElite ? 380 : 240);
    this.fx.puffSmoke(x, y, BRAND.carbon, 2);
    if (wasElite) {
      this.fx.shockwave(x, y, color, 260, 520);
      this.fx.shake(0.008, 200);
      haptics.play('levelUp');
    }

    // Drops.
    const drops = wasElite ? ELITE.emberDrop : Math.random() < PICKUP.dropChance ? 1 : 0;
    for (let i = 0; i < drops; i++) this.spawnPickup(x, y, 40 + Math.random() * 90);

    if (splitCount > 0) {
      const difficulty = difficultyAt(this.elapsed);
      for (let i = 0; i < splitCount; i++) {
        const angle = (i / splitCount) * TAU;
        this.spawnEnemy(
          'splitter',
          x + Math.cos(angle) * 22,
          y + Math.sin(angle) * 22,
          difficulty.hpMultiplier,
          difficulty.speedMultiplier,
          { child: true },
        );
      }
    }

    if (this.stats.shrapnelOnKill > 0) {
      for (let i = 0; i < this.stats.shrapnelOnKill; i++) {
        const projectile = this.projectilePool.acquire();
        projectile.spawn({
          x,
          y,
          angle: Math.random() * TAU,
          speed: 260,
          color: this.player.colors.accent,
          hostile: false,
          damage: 1,
          radius: 5,
          life: 1.1,
        });
        this.projectiles.push(projectile);
      }
    }
  }

  private detonateMine(enemy: Enemy): void {
    const x = enemy.x;
    const y = enemy.y;
    const radius = ENEMY.mine.blastRadius;

    this.fx.flashOrb(x, y, BRAND.emberOrange, radius, 300);
    this.fx.shockwave(x, y, BRAND.rebirthGold, radius * 1.4, 420);
    this.fx.burstSparks(x, y, BRAND.emberOrange, 22, 340);
    this.fx.shake(0.01, 240);
    audio.enemyDeath();

    if (Math.hypot(this.player.x - x, this.player.y - y) <= radius) this.damagePlayer();

    const index = this.enemies.indexOf(enemy);
    enemy.deactivate();
    if (index >= 0) this.removeEnemyAt(index);
  }

  private damagePlayer(): void {
    const result = this.player.takeDamage();
    if (result === 'ignored') return;

    if (result === 'shielded' || result === 'armored') {
      audio.hitEnemy();
      this.fx.shockwave(this.player.x, this.player.y, BRAND.signalCyan, 140, 340);
      this.fx.floatText(this.player.x, this.player.y - 30, result === 'shielded' ? 'SHIELD' : 'ARMOR', BRAND_CSS.signalCyan, 14);
      haptics.play('tap');
      return;
    }

    this.runDamage += 1;
    breakCombo(this.score);
    audio.damage();
    haptics.play('damage');
    this.fx.flash(BRAND.emberOrange, 0.34, 260);
    this.fx.chromaticFlash(8, 200);
    this.fx.shake(0.014, 300);
    this.fx.burstSparks(this.player.x, this.player.y, BRAND.emberOrange, 18, 300);

    if (result === 'revived') {
      this.fx.shockwave(this.player.x, this.player.y, BRAND.rebirthGold, 320, 700);
      this.fx.floatText(this.player.x, this.player.y - 40, 'SECOND DAWN', BRAND_CSS.rebirthGold, 18);
      session.ui.toast('Second Dawn');
      return;
    }
    if (result === 'dead') this.die();
  }

  // ── Phoenix Burst ─────────────────────────────────────────────────────────
  private doBurst(): void {
    this.player.consumeBurst();
    this.runBursts += 1;

    const { x, y } = this.player;
    const radius = this.player.burstRadius;
    const damage = this.player.burstDamage;
    const color = this.player.colors.glow;
    const accent = this.player.colors.accent;

    audio.burst();
    haptics.play('burst');
    this.fx.flashOrb(x, y, accent, radius * 0.8, 320);
    this.fx.shockwave(x, y, accent, radius * 2.2, 520);
    this.fx.shockwave(x, y, color, radius * 1.5, 400, 0.8);
    this.fx.burstSparks(x, y, accent, 44, 520);
    this.fx.burstEmbers(x, y, color, 26);
    this.fx.chromaticFlash(12, 220);
    this.fx.flash(color, 0.22, 220);
    this.fx.shake(BURST.shake, 320);
    this.slowMo(BURST.slowMoScale, BURST.slowMoDuration);

    for (const enemy of [...this.enemies]) {
      if (!enemy.active) continue;
      if (Math.hypot(enemy.x - x, enemy.y - y) <= radius + enemy.radius) {
        this.damageEnemy(enemy, damage, false);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.hostile) continue;
      if (Math.hypot(projectile.x - x, projectile.y - y) <= radius) {
        this.fx.burstSparks(projectile.x, projectile.y, accent, 4, 120);
        this.releaseProjectile(i);
      }
    }

    if (this.bossActive && this.boss.active && Math.hypot(this.boss.x - x, this.boss.y - y) <= radius + this.boss.radius) {
      this.damageBoss(damage);
    }
  }

  private slowMo(scale: number, duration: number): void {
    this.timeScale = session.settings.reducedMotion ? Math.max(scale, 0.7) : scale;
    this.fx.slowMo(scale, duration);
    window.clearTimeout(this.slowMoHandle);
    // Real-time restore: the slow-motion must not slow down its own recovery.
    this.slowMoHandle = window.setTimeout(() => {
      this.timeScale = 1;
    }, duration * 1000);
  }

  // ── Boss ──────────────────────────────────────────────────────────────────
  private damageBoss(amount: number): void {
    const result = this.boss.damage(amount, { onStageChange: (stage) => this.onBossStage(stage) });
    audio.hitEnemy();
    if (result === 'dead') this.killBoss();
  }

  private onBossStage(stage: number): void {
    this.fx.shockwave(this.boss.x, this.boss.y, this.boss.color, 520, 700);
    this.fx.chromaticFlash(10, 220);
    this.fx.shake(0.012, 400);
    session.ui.toast(`Stage ${stage + 1}`);
    audio.bossWarning();
    haptics.play('boss');
    // Clear the screen of bullets so a stage change is a breath, not a wall.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].hostile) this.releaseProjectile(i);
    }
    for (let i = 0; i < 6; i++) this.spawnPickup(this.boss.x, this.boss.y, 90 + Math.random() * 120);
    this.grantXp(10);
  }

  private killBoss(): void {
    const x = this.boss.x;
    const y = this.boss.y;
    this.boss.deactivate();
    this.bossActive = false;
    this.bossIndex += 1;
    this.runBosses += 1;

    scoreKill(this.score, SCORING.bossKillScore);
    // Felling a boss restores health and pays a large XP lump. Without a reward
    // this size there is no reason to fight one rather than kite it forever.
    if (this.player.health < PLAYER.maxHealth) {
      this.player.health = Math.min(PLAYER.maxHealth, this.player.health + BOSS.healOnKill);
      this.fx.floatText(this.player.x, this.player.y - 46, '+1 LIFE', BRAND_CSS.rebirthGold, 18);
    }
    this.grantXp(BOSS.xpOnKill);
    audio.bossDeath();
    audio.setIntensity(0);
    haptics.play('boss');
    this.slowMo(0.3, 0.9);
    this.fx.flashOrb(x, y, BRAND.rebirthGold, 460, 700);
    this.fx.shockwave(x, y, BRAND.emberOrange, 900, 1000);
    this.fx.burstSparks(x, y, BRAND.rebirthGold, 70, 640);
    this.fx.shake(0.02, 700);
    this.fx.flash(BRAND.rebirthGold, 0.4, 500);
    session.ui.toast('Ashborn felled', 3000);

    for (let i = 0; i < BOSS.emberDrop; i++) this.spawnPickup(x, y, 60 + Math.random() * 220);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].hostile) this.releaseProjectile(i);
    }
  }

  // ── Upgrades ──────────────────────────────────────────────────────────────
  private openDraft(): void {
    if (this.paused || this.dead || this.pendingLevelUps <= 0) return;
    this.paused = true;
    const cards = draftUpgrades(this.build, Math.random, { playerLevel: this.levels.level });

    session.ui.openPanel(upgradePanel(cards, this.levels.level), {
      pick: (dataset) => {
        const id = dataset.id;
        if (!id) return;
        this.build = takeUpgrade(this.build, id);
        this.stats = computeStats(this.build);
        this.player.applyStats(this.stats);
        this.score.comboDuration = SCORING.baseComboDuration * this.stats.comboDurationMul;
        if (UPGRADES_BY_ID.get(id)?.rarity === 'legendary') this.legendaryTaken = true;
        audio.upgradeSelect();
        haptics.play('levelUp');
        this.fx.shockwave(this.player.x, this.player.y, this.player.colors.accent, 300, 600);
        this.closeDraft();
      },
      skip: () => this.closeDraft(),
    });
  }

  private closeDraft(): void {
    session.ui.closePanel();
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.paused = false;
    // Multiple levels can land at once (a boss stage, a big pickup chain).
    if (this.pendingLevelUps > 0) this.time.delayedCall(80, () => this.openDraft());
  }

  // ── Pause / results ───────────────────────────────────────────────────────
  private openPause(): void {
    if (this.paused || this.dead) return;
    this.paused = true;
    this.pointer.active = false;
    audio.uiTap();

    session.ui.openPanel(pausePanel(session.settings, this.build), {
      resume: () => {
        session.ui.closePanel();
        this.paused = false;
        audio.resume();
      },
      restart: () => {
        session.ui.closePanel();
        this.scene.restart();
      },
      quit: () => {
        session.ui.closePanel();
        this.scene.start('Title');
      },
      control: () => {
        // Cycle the steering style. Applied live so the player can feel the
        // difference immediately on resume rather than restarting the run.
        const order = CONTROL_MODES;
        const next = order[(order.indexOf(session.settings.controlMode) + 1) % order.length];
        session.setSetting('controlMode', next);
        this.controlMode = next;
        this.pointer.active = false;
        audio.uiTap();
        this.paused = false;
        this.openPause();
      },
      toggle: (dataset) => {
        const key = dataset.key as 'sound' | 'music' | 'haptics' | 'reducedMotion' | undefined;
        if (!key) return;
        session.setSetting(key, !session.settings[key]);
        this.arena.reducedMotion = session.settings.reducedMotion;
        this.fx.reducedMotion = session.settings.reducedMotion;
        this.player.reducedMotion = session.settings.reducedMotion;
        audio.uiTap();
        // Re-render so the toggle state is visibly correct.
        this.paused = false;
        this.openPause();
      },
    });
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.pointer.active = false;
    this.player.stopTrail();

    audio.gameOver();
    audio.setIntensity(0);
    haptics.play('gameOver');
    this.slowMo(0.25, 1.1);
    this.fx.flashOrb(this.player.x, this.player.y, BRAND.emberOrange, 420, 700);
    this.fx.shockwave(this.player.x, this.player.y, BRAND.rebirthGold, 700, 900);
    this.fx.burstSparks(this.player.x, this.player.y, BRAND.emberOrange, 60, 520);
    this.fx.chromaticFlash(14, 320);
    this.fx.shake(0.02, 600);
    this.fx.flash(BRAND.emberOrange, 0.4, 500);
    session.ui.hideHint();

    // Real-time delay so the death beat plays at full length during slow motion.
    window.setTimeout(() => this.showResults(), 1100);
  }

  private showResults(): void {
    if (!this.scene.isActive()) return;
    session.markTutorialSeen();

    const summary: RunSummary = {
      score: Math.round(this.score.score),
      survivalTime: this.elapsed,
      bestCombo: this.score.bestCombo,
      embers: this.score.embers,
      level: this.levels.level,
      kills: this.score.kills,
      bursts: this.runBursts,
      bossesDefeated: this.runBosses,
      legendaryTaken: this.legendaryTaken,
      damageTaken: this.runDamage,
      longestClean: this.runLongestClean,
    };

    const result = recordRun(session.save, summary);
    session.save = result.save;
    session.persist();

    session.ui.openPanel(
      gameOverPanel({
        score: summary.score,
        survivalTime: summary.survivalTime,
        bestCombo: summary.bestCombo,
        embers: summary.embers,
        level: summary.level,
        kills: summary.kills,
        highScore: result.save.highScore,
        isHighScore: result.isHighScore,
        newAchievements: result.newAchievements,
        newPalettes: result.newPalettes,
        build: this.build,
      }),
      {
        restart: () => {
          session.ui.closePanel();
          this.scene.restart();
        },
        quit: () => {
          session.ui.closePanel();
          this.scene.start('Title');
        },
        progress: () => this.openProgressFromResults(),
      },
    );
  }

  private openProgressFromResults(): void {
    const render = () => {
      session.ui.openPanel(progressionPanel(session.save), {
        close: () => {
          session.ui.closePanel();
          this.showResults();
        },
        palette: (dataset) => {
          const id = dataset.id;
          if (!id || !session.save.unlockedPalettes.includes(id)) return;
          session.selectPalette(id);
          audio.uiTap();
          render();
        },
      });
    };
    render();
  }

  // ── HUD & tutorial ────────────────────────────────────────────────────────
  private updateHud(dt: number): void {
    this.hud.update(
      {
        score: this.score.score,
        multiplier: this.score.multiplier,
        combo: this.score.combo,
        heat: heatFraction(this.score),
        elapsed: this.elapsed,
        health: this.player.health,
        level: this.levels.level,
        xpProgress: levelProgress(this.levels),
        burstFraction: this.player.burstFraction,
        burstCharges: this.player.burstCharges,
        maxBurstCharges: this.player.maxBurstCharges,
        ...(this.bossActive && this.boss.active
          ? {
              bossName: BOSS.name,
              bossHp: clamp(this.boss.hp / this.boss.maxStageHp, 0, 1),
              bossStage: this.boss.stage,
              bossStages: this.boss.totalStages - this.boss.stage,
            }
          : {}),
      },
      dt,
    );

    const threats = this.enemies
      .filter((e) => e.active)
      .map((e) => ({ x: e.x, y: e.y, color: e.glowColor }));
    this.hud.updateEdgeMarkers(threats);
  }

  private updateTutorial(dt: number): void {
    // Death can be triggered part-way through an update; never re-open a hint
    // over the results panel.
    if (this.tutorial.finished || this.dead || this.paused) return;
    const hint = this.tutorial.update(dt, {
      distanceMoved: this.distanceMoved,
      embersCollected: this.score.embers,
      nearMisses: this.score.nearMisses,
      burstsUsed: this.runBursts,
      burstReady: this.player.burstCharges > 0,
    });
    if (hint) session.ui.showHint(hint);
    else session.ui.hideHint();
  }
}

/** XP awarded by a single ember shard, before any Ember Chain bonus. */
const PICKUP_XP = 1;

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function romanNumeral(n: number): string {
  return NUMERALS[Math.min(Math.max(n, 1), NUMERALS.length) - 1];
}
