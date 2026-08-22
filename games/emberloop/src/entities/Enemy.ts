import Phaser from 'phaser';
import { ELITE, ENEMY } from '../config/GameConfig';
import { TAU } from '../core/math';
import { BRAND, SIGNAL } from '../config/brand';
import { TEX } from '../effects/Textures';
import type { EnemyKind } from '../systems/Difficulty';

/**
 * Palette per archetype: [glow, body]. Three sit exactly on the Brand Bible
 * accents; the other three use the functional signal hues from `config/brand`,
 * because six threats cannot be told apart at a glance with three colours and
 * readable telegraphs are a hard requirement.
 */
export const ENEMY_COLORS: Record<EnemyKind, [number, number]> = {
  cinder: [BRAND.emberOrange, 0xffc9a8],
  dart: [SIGNAL.violet, 0xe6ccff],
  spitter: [BRAND.signalCyan, 0xcdf6ff],
  orbiter: [BRAND.rebirthGold, 0xffe9b0],
  splitter: [SIGNAL.magenta, 0xffc8dd],
  mine: [SIGNAL.crimson, 0xffc4c0],
};

const TEXTURE_FOR: Record<EnemyKind, string> = {
  cinder: TEX.cinder,
  dart: TEX.dart,
  spitter: TEX.spitter,
  orbiter: TEX.orbiter,
  splitter: TEX.splitter,
  mine: TEX.mine,
};

/** Callbacks the game scene hands to enemies so they can affect the world. */
export interface EnemyContext {
  playerX: number;
  playerY: number;
  dt: number;
  /** Fire an enemy projectile. */
  fire: (x: number, y: number, angle: number, speed: number, color: number) => void;
  /** A magma mine reached zero on its timer. */
  detonate: (enemy: Enemy) => void;
}

export type EnemyPhase = 'rest' | 'telegraph' | 'charge' | 'approach' | 'orbit' | 'dive' | 'arming';

export class Enemy {
  active = false;
  kind: EnemyKind = 'cinder';
  isElite = false;

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  hp = 1;
  maxHp = 1;
  radius = 14;
  speed = 60;
  score = 20;
  xp = 1;
  /** Children spawned when a splitter dies. */
  splitCount = 0;
  /** Set true for the smaller shards a splitter leaves behind. */
  isChild = false;

  phase: EnemyPhase = 'rest';
  phaseTimer = 0;
  /** Direction locked in during a telegraph, used by the charge/dive. */
  lockedAngle = 0;
  orbitAngle = 0;
  orbitDir = 1;
  /** Marks near-miss cooldown so one pass cannot farm infinite Heat. */
  nearMissTimer = 0;

  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly crown: Phaser.GameObjects.Image;
  private readonly telegraph: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private pulse = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.telegraph = scene.add
      .rectangle(0, 0, 4, 4, 0xffffff, 0.5)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 1)
      .setVisible(false);
    this.glow = scene.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.cinder).setDepth(depth + 1).setVisible(false);
    this.crown = scene.add
      .image(0, 0, TEX.crown)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 2)
      .setVisible(false);
    this.hpBar = scene.add
      .rectangle(0, 0, 40, 4, BRAND.emberOrange, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2)
      .setVisible(false);
  }

  spawn(options: {
    kind: EnemyKind;
    x: number;
    y: number;
    hpMultiplier: number;
    speedMultiplier: number;
    elite?: boolean;
    child?: boolean;
  }): void {
    const base = ENEMY[options.kind];
    this.active = true;
    this.kind = options.kind;
    this.isElite = options.elite === true;
    this.isChild = options.child === true;
    this.x = options.x;
    this.y = options.y;
    this.vx = 0;
    this.vy = 0;
    this.nearMissTimer = 0;
    this.pulse = Math.random() * TAU;

    const childScale = this.isChild ? 0.6 : 1;
    const eliteScale = this.isElite ? ELITE.radiusMultiplier : 1;

    this.maxHp = Math.max(1, Math.round(base.hp * options.hpMultiplier * (this.isElite ? ELITE.hpMultiplier : 1) * (this.isChild ? 0.5 : 1)));
    this.hp = this.maxHp;
    this.radius = base.radius * childScale * eliteScale;
    this.speed = base.speed * options.speedMultiplier * (this.isElite ? ELITE.speedMultiplier : 1) * (this.isChild ? 1.25 : 1);
    this.score = base.score * (this.isElite ? 8 : 1) * (this.isChild ? 0.5 : 1);
    this.xp = base.xp * (this.isElite ? 6 : 1);
    this.splitCount = options.kind === 'splitter' && !this.isChild ? ENEMY.splitter.children : 0;

    this.orbitAngle = Math.random() * TAU;
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.phase = this.initialPhase();
    this.phaseTimer = this.initialPhaseTime();

    const [glowColor, bodyColor] = ENEMY_COLORS[options.kind];
    this.glow.setVisible(true).setTint(glowColor).setScale((this.radius / 64) * 2.6).setAlpha(0.7);
    this.body
      .setVisible(true)
      .setTexture(TEXTURE_FOR[options.kind])
      .setTint(this.isElite ? 0xffffff : bodyColor)
      .setDisplaySize(this.radius * 2.3, this.radius * 2.3)
      .setRotation(0);
    this.crown.setVisible(this.isElite).setTint(glowColor);
    this.hpBar.setVisible(this.isElite);
    this.telegraph.setVisible(false).setFillStyle(glowColor, 0.55);
  }

  private initialPhase(): EnemyPhase {
    switch (this.kind) {
      case 'dart':
        return 'rest';
      case 'orbiter':
        return 'approach';
      case 'mine':
        return 'arming';
      default:
        return 'rest';
    }
  }

  private initialPhaseTime(): number {
    switch (this.kind) {
      case 'dart':
        return ENEMY.dart.restTime;
      case 'spitter':
        return ENEMY.spitter.fireInterval;
      case 'mine':
        return ENEMY.mine.armTime;
      case 'orbiter':
        return 0;
      default:
        return 0;
    }
  }

  deactivate(): void {
    this.active = false;
    this.glow.setVisible(false);
    this.body.setVisible(false);
    this.crown.setVisible(false);
    this.hpBar.setVisible(false);
    this.telegraph.setVisible(false);
  }

  get glowColor(): number {
    return ENEMY_COLORS[this.kind][0];
  }

  /** Returns true when the enemy died from this damage. */
  damage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  update(ctx: EnemyContext): void {
    const dt = ctx.dt;
    this.pulse += dt;
    if (this.nearMissTimer > 0) this.nearMissTimer -= dt;
    this.phaseTimer -= dt;

    switch (this.kind) {
      case 'cinder':
        this.updateChase(ctx, 1);
        break;
      case 'dart':
        this.updateDart(ctx);
        break;
      case 'spitter':
        this.updateSpitter(ctx);
        break;
      case 'orbiter':
        this.updateOrbiter(ctx);
        break;
      case 'splitter':
        this.updateChase(ctx, 0.9);
        break;
      case 'mine':
        this.updateMine(ctx);
        break;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.render();
  }

  /** Steer straight at the player. */
  private updateChase(ctx: EnemyContext, speedScale: number): void {
    const dx = ctx.playerX - this.x;
    const dy = ctx.playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.vx = (dx / dist) * this.speed * speedScale;
    this.vy = (dy / dist) * this.speed * speedScale;
  }

  /** Pause → telegraph a line → commit to a straight charge. */
  private updateDart(ctx: EnemyContext): void {
    if (this.phase === 'rest') {
      this.updateChase(ctx, 0.12);
      if (this.phaseTimer <= 0) {
        this.phase = 'telegraph';
        this.phaseTimer = ENEMY.dart.telegraph;
        this.lockedAngle = Math.atan2(ctx.playerY - this.y, ctx.playerX - this.x);
      }
    } else if (this.phase === 'telegraph') {
      this.vx = 0;
      this.vy = 0;
      // Keep tracking loosely during the wind-up so it stays threatening but dodgeable.
      const desired = Math.atan2(ctx.playerY - this.y, ctx.playerX - this.x);
      this.lockedAngle = Phaser.Math.Angle.RotateTo(this.lockedAngle, desired, 1.6 * ctx.dt);
      this.showTelegraphLine(this.lockedAngle, 700, 5 + (1 - this.phaseTimer / ENEMY.dart.telegraph) * 7);
      if (this.phaseTimer <= 0) {
        this.phase = 'charge';
        this.phaseTimer = ENEMY.dart.chargeTime;
        this.telegraph.setVisible(false);
        this.vx = Math.cos(this.lockedAngle) * this.speed;
        this.vy = Math.sin(this.lockedAngle) * this.speed;
      }
    } else {
      // Charging: hold the locked velocity, then decelerate into the next rest.
      if (this.phaseTimer <= 0) {
        this.phase = 'rest';
        this.phaseTimer = ENEMY.dart.restTime;
      } else {
        this.vx *= 0.985;
        this.vy *= 0.985;
      }
    }
  }

  /** Hover at range, telegraph, then fire an aimed shot. */
  private updateSpitter(ctx: EnemyContext): void {
    const dx = ctx.playerX - this.x;
    const dy = ctx.playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Maintain a stand-off distance: approach when far, back away when close.
    const preferred = 210;
    const drift = dist > preferred ? 1 : -0.7;
    this.vx = (dx / dist) * this.speed * drift;
    this.vy = (dy / dist) * this.speed * drift;

    if (this.phase === 'rest' && this.phaseTimer <= 0) {
      this.phase = 'telegraph';
      this.phaseTimer = ENEMY.spitter.telegraph;
    } else if (this.phase === 'telegraph') {
      this.lockedAngle = Math.atan2(dy, dx);
      this.showTelegraphLine(this.lockedAngle, dist, 3);
      if (this.phaseTimer <= 0) {
        this.telegraph.setVisible(false);
        const shots = this.isElite ? 5 : 1;
        const spread = 0.24;
        for (let i = 0; i < shots; i++) {
          const offset = (i - (shots - 1) / 2) * spread;
          ctx.fire(this.x, this.y, this.lockedAngle + offset, ENEMY.spitter.projectileSpeed, this.glowColor);
        }
        this.phase = 'rest';
        this.phaseTimer = ENEMY.spitter.fireInterval;
      }
    }
  }

  /** Circle the player, then commit to a fast inward dive. */
  private updateOrbiter(ctx: EnemyContext): void {
    const dx = ctx.playerX - this.x;
    const dy = ctx.playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const orbitRadius = 140;

    if (this.phase === 'approach') {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
      if (dist <= orbitRadius * 1.15) {
        this.phase = 'orbit';
        this.phaseTimer = ENEMY.orbiter.orbitTime;
        this.orbitAngle = Math.atan2(this.y - ctx.playerY, this.x - ctx.playerX);
      }
    } else if (this.phase === 'orbit') {
      this.orbitAngle += this.orbitDir * (this.speed / orbitRadius) * ctx.dt;
      const targetX = ctx.playerX + Math.cos(this.orbitAngle) * orbitRadius;
      const targetY = ctx.playerY + Math.sin(this.orbitAngle) * orbitRadius;
      // Velocity chases the orbit point so the motion stays smooth near the player.
      this.vx = (targetX - this.x) * 6;
      this.vy = (targetY - this.y) * 6;
      if (this.phaseTimer <= 0) {
        this.phase = 'telegraph';
        this.phaseTimer = 0.5;
      }
    } else if (this.phase === 'telegraph') {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.lockedAngle = Math.atan2(dy, dx);
      this.showTelegraphLine(this.lockedAngle, dist, 6);
      if (this.phaseTimer <= 0) {
        this.telegraph.setVisible(false);
        this.phase = 'dive';
        this.phaseTimer = 1.1;
        this.vx = Math.cos(this.lockedAngle) * ENEMY.orbiter.diveSpeed;
        this.vy = Math.sin(this.lockedAngle) * ENEMY.orbiter.diveSpeed;
      }
    } else {
      this.vx *= 0.985;
      this.vy *= 0.985;
      if (this.phaseTimer <= 0) this.phase = 'approach';
    }
  }

  /** Stationary; pulses faster and faster, then detonates. */
  private updateMine(ctx: EnemyContext): void {
    this.vx = 0;
    this.vy = 0;
    if (this.phaseTimer <= 0) {
      ctx.detonate(this);
    }
  }

  private showTelegraphLine(angle: number, length: number, thickness: number): void {
    this.telegraph.setVisible(true);
    this.telegraph.setPosition(this.x, this.y);
    this.telegraph.setSize(length, thickness);
    this.telegraph.setRotation(angle);
    this.telegraph.setAlpha(0.25 + 0.3 * Math.abs(Math.sin(this.pulse * 12)));
  }

  private render(): void {
    this.glow.setPosition(this.x, this.y);
    this.body.setPosition(this.x, this.y);

    switch (this.kind) {
      case 'dart':
        this.body.setRotation(this.phase === 'charge' ? Math.atan2(this.vy, this.vx) : this.lockedAngle);
        this.glow.setAlpha(this.phase === 'telegraph' ? 0.6 + 0.4 * Math.sin(this.pulse * 18) : 0.65);
        break;
      case 'mine': {
        // Warning pulse accelerates as the fuse burns down.
        const t = 1 - Math.max(0, this.phaseTimer) / ENEMY.mine.armTime;
        const rate = 5 + t * 26;
        const beat = Math.abs(Math.sin(this.pulse * rate));
        this.glow.setAlpha(0.35 + beat * 0.65);
        this.glow.setScale((this.radius / 64) * (2.4 + beat * 1.6));
        this.body.setRotation(this.pulse * 0.6);
        break;
      }
      case 'spitter':
        this.glow.setAlpha(this.phase === 'telegraph' ? 0.55 + 0.45 * Math.sin(this.pulse * 20) : 0.6);
        this.body.setRotation(this.lockedAngle);
        break;
      case 'orbiter':
        this.body.setRotation(this.pulse * 3);
        this.glow.setAlpha(this.phase === 'telegraph' ? 0.6 + 0.4 * Math.sin(this.pulse * 20) : 0.65);
        break;
      case 'splitter':
        this.body.setRotation(this.pulse * 0.8);
        break;
      default:
        this.body.setRotation(this.pulse * 1.2);
        break;
    }

    if (this.isElite) {
      this.crown.setPosition(this.x, this.y - this.radius - 14).setAlpha(0.9);
      this.hpBar.setPosition(this.x, this.y - this.radius - 26);
      this.hpBar.setSize(Math.max(2, 46 * (this.hp / this.maxHp)), 4);
    }
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
    this.crown.destroy();
    this.hpBar.destroy();
    this.telegraph.destroy();
  }
}
