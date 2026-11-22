import Phaser from 'phaser';
import { TEX } from '../effects/Textures';
import { BRAND } from '../config/brand';

export interface HomingTarget {
  x: number;
  y: number;
  active: boolean;
}

/**
 * One pooled projectile. The same class covers enemy shots, player homing
 * embers and reflected bullets — only `hostile`, `homing` and tint differ.
 */
export class Projectile {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = 6;
  hostile = true;
  homing = false;
  damage = 1;
  life = 0;
  /** Cooldown so a single bullet cannot chain near-misses every frame. */
  nearMissTimer = 0;
  /** Extra enemies this shot passes through (Celestial Ascendancy). */
  pierce = 0;
  /** Last enemy hit, so a piercing shot cannot hit the same one twice in a row. */
  lastHit: unknown = null;
  /** Fired by an ultimate: its kills do not charge the ultimate meter. */
  fromUltimate = false;
  /** Synergy shot type: 'ice' chills, 'echo' never echoes again, 'star' is Celestial Barrage. */
  tag: '' | 'ice' | 'echo' | 'star' = '';
  /** Seconds of homing left (Infinity = for its whole life) and turn rate in rad/s. */
  homingTime = Infinity;
  turnRate = 6;

  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly rim: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, depth: number) {
    this.glow = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.bullet).setDepth(depth + 1).setVisible(false);
    // Enemy bullets wear a dark ring so danger never looks like the blue crystal loot.
    this.rim = scene.add.image(0, 0, TEX.glowTight).setTint(BRAND.voidBlack).setDepth(depth - 0.5).setVisible(false);
  }

  spawn(options: {
    x: number;
    y: number;
    angle: number;
    speed: number;
    color: number;
    hostile?: boolean;
    homing?: boolean;
    damage?: number;
    radius?: number;
    life?: number;
    pierce?: number;
    homingTime?: number;
    turnRate?: number;
  }): void {
    this.active = true;
    this.x = options.x;
    this.y = options.y;
    this.vx = Math.cos(options.angle) * options.speed;
    this.vy = Math.sin(options.angle) * options.speed;
    this.hostile = options.hostile !== false;
    this.homing = options.homing === true;
    this.damage = options.damage ?? 1;
    this.radius = options.radius ?? 6;
    this.life = options.life ?? 6;
    this.nearMissTimer = 0;
    this.pierce = options.pierce ?? 0;
    this.lastHit = null;
    this.fromUltimate = false;
    this.tag = '';
    this.homingTime = options.homingTime ?? Infinity;
    this.turnRate = options.turnRate ?? 6;

    this.glow.setVisible(true).setTint(options.color).setScale((this.radius / 32) * 2.4).setAlpha(0.85);
    this.body.setVisible(true).setTint(0xffffff).setDisplaySize(this.radius * 2.6, this.radius * 2.6);
    this.rim.setVisible(this.hostile).setScale((this.radius * 4) / 64).setAlpha(0.8);
  }

  deactivate(): void {
    this.active = false;
    this.glow.setVisible(false);
    this.body.setVisible(false);
    this.rim.setVisible(false);
  }

  /** Reflect a hostile bullet back at its owners (Mirror Flame upgrade). */
  reflect(color: number): void {
    this.hostile = false;
    this.homing = true;
    this.vx *= -1.25;
    this.vy *= -1.25;
    this.life = Math.max(this.life, 3);
    this.glow.setTint(color);
    this.rim.setVisible(false);
  }

  update(dt: number, findTarget: () => HomingTarget | null): boolean {
    this.life -= dt;
    if (this.nearMissTimer > 0) this.nearMissTimer -= dt;
    if (this.life <= 0) return false;

    if (this.homing && this.homingTime > 0) {
      this.homingTime -= dt;
      const target = findTarget();
      if (target) {
        const desired = Math.atan2(target.y - this.y, target.x - this.x);
        const current = Math.atan2(this.vy, this.vx);
        // Limited turn rate keeps homing shots readable rather than instant-hit.
        const next = Phaser.Math.Angle.RotateTo(current, desired, this.turnRate * dt);
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(next) * speed;
        this.vy = Math.sin(next) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const angle = Math.atan2(this.vy, this.vx);
    this.glow.setPosition(this.x, this.y);
    this.rim.setPosition(this.x, this.y);
    this.body.setPosition(this.x, this.y).setRotation(angle);
    return true;
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
    this.rim.destroy();
  }
}
