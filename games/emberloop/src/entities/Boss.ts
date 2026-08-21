import Phaser from 'phaser';
import { BOSS } from '../config/GameConfig';
import { TAU } from '../core/math';
import type { Arena } from '../effects/Arena';
import { BRAND, SIGNAL } from '../config/brand';
import { TEX } from '../effects/Textures';

export interface BossContext {
  dt: number;
  playerX: number;
  playerY: number;
  arena: Arena;
  fire: (x: number, y: number, angle: number, speed: number, color: number) => void;
  summon: (x: number, y: number) => void;
  onStageChange: (stage: number) => void;
}

// Stages walk the brand accents in order: Dragon fire → the unknown → systems.
const STAGE_COLORS = [BRAND.emberOrange, SIGNAL.violet, BRAND.signalCyan];

/**
 * THE ASHBORN — a three-stage boss.
 *
 * Stage 1: drifting radial bullet crowns.
 * Stage 2: rotating spiral streams plus summoned cinders.
 * Stage 3: telegraphed charges followed by expanding bullet shockwaves.
 *
 * Between stages the boss is briefly invulnerable while it re-forms, which
 * gives the player a readable beat to reposition and collect.
 */
export class Boss {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = BOSS.radius;

  stage = 0;
  stageHp: number[] = [];
  hp = 0;
  invulnerable = false;

  private attackTimer = 0;
  private stateTimer = 0;
  private spiralAngle = 0;
  private phase: 'idle' | 'charge-telegraph' | 'charging' | 'transition' = 'idle';
  private lockedAngle = 0;
  private pulse = 0;
  private driftAngle = 0;

  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly telegraph: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, depth: number) {
    this.telegraph = scene.add
      .rectangle(0, 0, 4, 4, BRAND.emberOrange, 0.4)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 1)
      .setVisible(false);
    this.aura = scene.add.image(0, 0, TEX.ring).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.glow = scene.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.boss).setDepth(depth + 2).setVisible(false);
  }

  spawn(x: number, y: number, stageHp: number[]): void {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.stage = 0;
    this.stageHp = [...stageHp];
    this.hp = this.stageHp[0];
    this.invulnerable = false;
    this.phase = 'idle';
    this.attackTimer = 1.5;
    this.stateTimer = 0;
    this.spiralAngle = 0;
    this.driftAngle = Math.random() * TAU;

    this.glow.setVisible(true).setScale(2.6).setAlpha(0.75);
    this.aura.setVisible(true).setScale(1.1).setAlpha(0.5);
    this.body.setVisible(true).setDisplaySize(this.radius * 2.4, this.radius * 2.4);
    this.applyStageColor();
  }

  deactivate(): void {
    this.active = false;
    this.glow.setVisible(false);
    this.body.setVisible(false);
    this.aura.setVisible(false);
    this.telegraph.setVisible(false);
  }

  get maxStageHp(): number {
    return this.stageHp[this.stage] ?? 1;
  }

  get totalStages(): number {
    return this.stageHp.length;
  }

  get color(): number {
    return STAGE_COLORS[Math.min(this.stage, STAGE_COLORS.length - 1)];
  }

  private applyStageColor(): void {
    this.glow.setTint(this.color);
    this.aura.setTint(this.color);
    this.body.setTint(BRAND.ghostWhite);
  }

  /**
   * Apply damage. Returns 'stage' when a stage was cleared, 'dead' when the
   * final stage fell, or 'hit' otherwise.
   */
  damage(amount: number, ctx: Pick<BossContext, 'onStageChange'>): 'hit' | 'stage' | 'dead' {
    if (this.invulnerable) return 'hit';
    this.hp -= amount;
    if (this.hp > 0) return 'hit';

    if (this.stage >= this.stageHp.length - 1) {
      this.hp = 0;
      return 'dead';
    }
    this.stage += 1;
    this.hp = this.stageHp[this.stage];
    this.invulnerable = true;
    this.phase = 'transition';
    this.stateTimer = 1.6;
    this.applyStageColor();
    ctx.onStageChange(this.stage);
    return 'stage';
  }

  update(ctx: BossContext): void {
    const dt = ctx.dt;
    this.pulse += dt;
    this.stateTimer -= dt;
    this.attackTimer -= dt;

    if (this.phase === 'transition') {
      this.vx *= 0.9;
      this.vy *= 0.9;
      if (this.stateTimer <= 0) {
        this.invulnerable = false;
        this.phase = 'idle';
        this.attackTimer = 0.8;
      }
    } else {
      switch (this.stage) {
        case 0:
          this.updateStage1(ctx);
          break;
        case 1:
          this.updateStage2(ctx);
          break;
        default:
          this.updateStage3(ctx);
          break;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // The boss stays inside the caldera like everything else.
    const point = { x: this.x, y: this.y };
    if (ctx.arena.clamp(point, 0.82)) {
      this.x = point.x;
      this.y = point.y;
      this.vx *= -0.6;
      this.vy *= -0.6;
    }

    this.render();
  }

  /** Stage 1 — slow drift, radial bullet crowns. */
  private updateStage1(ctx: BossContext): void {
    this.driftAngle += ctx.dt * 0.4;
    const target = ctx.arena.pointAt(this.driftAngle, 0.45);
    this.vx = (target.x - this.x) * 0.9;
    this.vy = (target.y - this.y) * 0.9;

    if (this.attackTimer <= 0) {
      const count = 14;
      const offset = Math.random() * TAU;
      for (let i = 0; i < count; i++) {
        ctx.fire(this.x, this.y, offset + (i / count) * TAU, 150, this.color);
      }
      this.attackTimer = 2.4;
    }
  }

  /** Stage 2 — figure-eight movement, rotating spiral, periodic summons. */
  private updateStage2(ctx: BossContext): void {
    this.driftAngle += ctx.dt * 0.7;
    // Lissajous path (1:2) traces a figure eight across the caldera.
    const target = {
      x: ctx.arena.cx + Math.sin(this.driftAngle) * ctx.arena.rx * 0.5,
      y: ctx.arena.cy + Math.sin(this.driftAngle * 2) * ctx.arena.ry * 0.35,
    };
    this.vx = (target.x - this.x) * 1.3;
    this.vy = (target.y - this.y) * 1.3;

    this.spiralAngle += ctx.dt * 2.6;
    if (this.attackTimer <= 0) {
      for (let arm = 0; arm < 3; arm++) {
        ctx.fire(this.x, this.y, this.spiralAngle + (arm / 3) * TAU, 175, this.color);
      }
      this.attackTimer = 0.14;
    }

    if (this.stateTimer <= 0) {
      ctx.summon(this.x, this.y);
      this.stateTimer = 5.5;
    }
  }

  /** Stage 3 — telegraphed charges, then an expanding bullet shockwave. */
  private updateStage3(ctx: BossContext): void {
    if (this.phase === 'idle') {
      const dx = ctx.playerX - this.x;
      const dy = ctx.playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.vx = (dx / dist) * 70;
      this.vy = (dy / dist) * 70;
      if (this.attackTimer <= 0) {
        this.phase = 'charge-telegraph';
        this.stateTimer = 0.85;
        this.lockedAngle = Math.atan2(dy, dx);
      }
    } else if (this.phase === 'charge-telegraph') {
      this.vx *= 0.85;
      this.vy *= 0.85;
      const desired = Math.atan2(ctx.playerY - this.y, ctx.playerX - this.x);
      this.lockedAngle = Phaser.Math.Angle.RotateTo(this.lockedAngle, desired, 1.2 * ctx.dt);
      this.telegraph
        .setVisible(true)
        .setPosition(this.x, this.y)
        .setSize(900, 10 + (1 - this.stateTimer / 0.85) * 16)
        .setRotation(this.lockedAngle)
        .setAlpha(0.3 + 0.35 * Math.abs(Math.sin(this.pulse * 14)));
      if (this.stateTimer <= 0) {
        this.telegraph.setVisible(false);
        this.phase = 'charging';
        this.stateTimer = 0.9;
        this.vx = Math.cos(this.lockedAngle) * 560;
        this.vy = Math.sin(this.lockedAngle) * 560;
      }
    } else if (this.phase === 'charging') {
      this.vx *= 0.985;
      this.vy *= 0.985;
      if (this.stateTimer <= 0) {
        // Slam: a full ring of bullets erupts where the charge ended.
        const count = 20;
        for (let i = 0; i < count; i++) {
          ctx.fire(this.x, this.y, (i / count) * TAU, 210, this.color);
        }
        this.phase = 'idle';
        this.attackTimer = 1.9;
      }
    }
  }

  private render(): void {
    this.glow.setPosition(this.x, this.y);
    this.body.setPosition(this.x, this.y).setRotation(this.pulse * 0.35);
    this.aura.setPosition(this.x, this.y);

    const beat = 0.5 + 0.5 * Math.sin(this.pulse * 3);
    this.glow.setScale(2.4 + beat * 0.35).setAlpha(this.invulnerable ? 0.4 + 0.5 * Math.sin(this.pulse * 22) : 0.75);
    this.aura.setScale(0.95 + beat * 0.1).setAlpha(0.35 + beat * 0.25);
    this.body.setAlpha(this.invulnerable ? 0.5 + 0.4 * Math.sin(this.pulse * 22) : 1);
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
    this.aura.destroy();
    this.telegraph.destroy();
  }
}
