import Phaser from 'phaser';
import { BOSS } from '../config/GameConfig';
import { TAU } from '../core/math';
import type { Arena } from '../effects/Arena';
import { BRAND } from '../config/brand';
import { TEX } from '../effects/Textures';
import { ATTACK_RECOVERY, attacksForStage, bossTextureKey, type BossAttackId, type BossDef } from '../config/bosses';
import { createAttack, type AttackCtx, type AttackScript } from './bossAttacks';
import type { HazardField } from './Hazards';

export interface BossContext {
  dt: number;
  playerX: number;
  playerY: number;
  arena: Arena;
  hazards: HazardField;
  fire: (x: number, y: number, angle: number, speed: number, color: number, opts?: { homingTime?: number; turnRate?: number; radius?: number }) => void;
  cue: (x: number, y: number, radius: number, color: number) => void;
  onAttack: (name: string) => void;
}

/**
 * A faction boss (config/bosses.ts). Three stages sized 35/35/30% of total
 * HP; each stage unlocks one more signature attack, and the last stage may
 * run two attacks at once. Between stages the boss is briefly invulnerable
 * while it re-forms, which gives the player a readable beat.
 */
export class Boss {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius: number = BOSS.radius;
  def: BossDef | null = null;

  stage = 0;
  stageHp: number[] = [];
  hp = 0;
  invulnerable = false;
  /** Vanished mid-teleport: cannot hurt or be hurt. */
  intangible = false;

  private held = false;
  private recover = 0;
  private transition = 0;
  private running: AttackScript[] = [];
  private nextAttack = 0;
  private pulse = 0;
  private driftAngle = 0;
  private encounter = 0;

  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, depth: number) {
    this.aura = scene.add.image(0, 0, TEX.ring).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.glow = scene.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.glow).setDepth(depth + 2).setVisible(false);
  }

  spawn(def: BossDef, x: number, y: number, stageHp: number[], encounter: number): void {
    this.def = def;
    this.active = true;
    this.encounter = encounter;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = def.radius;
    this.stage = 0;
    this.stageHp = [...stageHp];
    this.hp = this.stageHp[0];
    this.invulnerable = false;
    this.intangible = false;
    this.held = false;
    this.transition = 0;
    this.running = [];
    this.nextAttack = 0;
    this.recover = 1.6;
    this.driftAngle = Math.random() * TAU;

    this.glow.setVisible(true).setTint(def.color).setScale(2.6).setAlpha(0.7);
    this.aura.setVisible(true).setTint(def.color).setScale(0.9).setAlpha(0.45);
    const frame = this.body.setTexture(bossTextureKey(def)).frame;
    // Wide art: size by width so every boss reads at the same scale.
    const width = def.radius * 3.4;
    this.body.setVisible(true).setDisplaySize(width, (frame.height / frame.width) * width).setAlpha(1);
  }

  deactivate(): void {
    this.active = false;
    this.running = [];
    this.glow.setVisible(false);
    this.body.setVisible(false);
    this.aura.setVisible(false);
  }

  get maxStageHp(): number {
    return this.stageHp[this.stage] ?? 1;
  }

  get totalStages(): number {
    return this.stageHp.length;
  }

  get color(): number {
    return this.def?.color ?? BRAND.emberOrange;
  }

  /** Fraction of total HP left, across all stages (0..1). */
  get totalHpFraction(): number {
    const total = this.stageHp.reduce((a, b) => a + b, 0) || 1;
    const left = this.hp + this.stageHp.slice(this.stage + 1).reduce((a, b) => a + b, 0);
    return Math.max(0, left / total);
  }

  /**
   * Apply damage. Returns 'stage' when a stage was cleared, 'dead' when the
   * final stage fell, or 'hit' otherwise.
   */
  damage(amount: number, ctx: { onStageChange: (stage: number) => void }): 'hit' | 'stage' | 'dead' {
    if (this.invulnerable || this.intangible) return 'hit';
    this.hp -= amount;
    if (this.hp > 0) return 'hit';

    if (this.stage >= this.stageHp.length - 1) {
      this.hp = 0;
      return 'dead';
    }
    this.stage += 1;
    this.hp = this.stageHp[this.stage];
    this.invulnerable = true;
    this.transition = 1.6;
    // A stage break cancels whatever was running: the phase change is a breath.
    this.running = [];
    this.held = false;
    this.setVanished(false);
    ctx.onStageChange(this.stage);
    return 'stage';
  }

  private setVanished(on: boolean): void {
    this.intangible = on;
  }

  update(ctx: BossContext): void {
    const dt = ctx.dt;
    this.pulse += dt;
    const def = this.def;
    if (!def) return;

    if (this.transition > 0) {
      this.transition -= dt;
      this.vx *= 0.9;
      this.vy *= 0.9;
      if (this.transition <= 0) {
        this.invulnerable = false;
        this.recover = 0.8;
      }
    } else {
      if (!this.held) this.move(ctx, def);
      this.runAttacks(ctx, def);
    }

    if (!this.held) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const point = { x: this.x, y: this.y };
      if (ctx.arena.clamp(point, 0.8)) {
        this.x = point.x;
        this.y = point.y;
        this.vx *= -0.6;
        this.vy *= -0.6;
      }
    }

    this.render();
  }

  private move(ctx: BossContext, def: BossDef): void {
    const a = ctx.arena;
    switch (def.movement) {
      case 'rooted': {
        // Planted near the top of the board, swaying.
        const tx = a.cx + Math.sin(this.pulse * 0.5) * a.rx * 0.25;
        const ty = a.cy - a.ry * 0.5;
        this.vx = (tx - this.x) * 1.2;
        this.vy = (ty - this.y) * 1.2;
        break;
      }
      case 'swoop': {
        // Figure eight across the upper board.
        this.driftAngle += ctx.dt * 0.7;
        const tx = a.cx + Math.sin(this.driftAngle) * a.rx * 0.55;
        const ty = a.cy - a.ry * 0.25 + Math.sin(this.driftAngle * 2) * a.ry * 0.25;
        this.vx = (tx - this.x) * 1.3;
        this.vy = (ty - this.y) * 1.3;
        break;
      }
      case 'hover': {
        // Keeps a stand-off distance from the phoenix.
        const dx = ctx.playerX - this.x;
        const dy = ctx.playerY - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const drift = dist > 230 ? 60 : dist < 170 ? -60 : 0;
        this.vx = (dx / dist) * drift;
        this.vy = (dy / dist) * drift;
        break;
      }
      default: {
        // Slow drift around the board.
        this.driftAngle += ctx.dt * 0.4;
        const target = a.pointAt(this.driftAngle, 0.45);
        this.vx = (target.x - this.x) * 0.9;
        this.vy = (target.y - this.y) * 0.9;
      }
    }
  }

  private runAttacks(ctx: BossContext, def: BossDef): void {
    const actx = this.attackCtx(ctx, def);
    this.running = this.running.filter((script) => !script(actx));
    if (this.running.length > 0) return;

    this.recover -= ctx.dt;
    if (this.recover > 0) return;

    const pool = attacksForStage(def, this.stage);
    const first = pool[this.nextAttack % pool.length];
    this.nextAttack += 1;
    const started: BossAttackId[] = [first];
    // Phase 3: sometimes combine two different attacks.
    if (this.stage >= 2 && Math.random() < 0.35) {
      const other = pool.filter((id) => id !== first)[Math.floor(Math.random() * (pool.length - 1))];
      if (other) started.push(other);
    }
    for (const id of started) {
      this.running.push(createAttack(id));
      ctx.onAttack(def.attackNames[def.attacks.indexOf(id)]);
    }
    const recovery = Math.max(...started.map((id) => ATTACK_RECOVERY[id]));
    // Later phases recover a little faster; a combo earns a longer breather.
    this.recover = recovery * (this.stage === 0 ? 1 : this.stage === 1 ? 0.9 : 0.8) * (started.length > 1 ? 1.4 : 1);
  }

  private attackCtx(ctx: BossContext, def: BossDef): AttackCtx {
    return {
      dt: ctx.dt,
      playerX: ctx.playerX,
      playerY: ctx.playerY,
      arena: ctx.arena,
      hazards: ctx.hazards,
      color: def.color,
      pace: 1 + Math.min(5, this.encounter) * 0.06,
      boss: {
        x: this.x,
        y: this.y,
        radius: this.radius,
        vanish: (on) => this.setVanished(on),
        hold: (on) => {
          this.held = on;
          if (on) {
            this.vx = 0;
            this.vy = 0;
          }
        },
        moveTo: (x, y) => {
          this.x = x;
          this.y = y;
        },
      },
      fire: (x, y, angle, speed, opts) => ctx.fire(x, y, angle, speed, def.color, opts),
      cue: (x, y, radius) => ctx.cue(x, y, radius, def.color),
    };
  }

  private render(): void {
    this.glow.setPosition(this.x, this.y);
    this.aura.setPosition(this.x, this.y);
    const beat = 0.5 + 0.5 * Math.sin(this.pulse * 3);
    // Upright art with a slow breath and a lean into movement.
    const lean = Math.max(-0.12, Math.min(0.12, this.vx / 1200));
    this.body.setPosition(this.x, this.y + Math.sin(this.pulse * 2) * 2).setRotation(lean);

    const flicker = this.invulnerable ? 0.5 + 0.4 * Math.sin(this.pulse * 22) : 1;
    const fade = this.intangible ? 0.12 : 1;
    this.glow.setScale(2.4 + beat * 0.35).setAlpha(0.7 * flicker * fade);
    this.aura.setScale(0.85 + beat * 0.1).setAlpha((0.3 + beat * 0.25) * fade);
    this.body.setAlpha(flicker * fade);
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
    this.aura.destroy();
  }
}
