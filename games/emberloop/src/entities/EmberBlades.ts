import Phaser from 'phaser';
import { BRAND } from '../config/brand';
import { TEX } from '../effects/Textures';
import { BLADES, slotAngle, type BladeSpec } from '../upgrades/EmberBlades';
import { segmentDistance } from './Hazards';
import type { Enemy } from './Enemy';

export const BLADE_TEXTURE = 'weapon-ember-blade';

/**
 * The art's sword points right with its edge tilted ~11° down; this rotates the
 * sprite so the blade's own axis lines up with its direction of travel.
 */
const ART_TILT = 0.19;
/** Max angle a sword sweeps between collision checks (radians), so fast spins never skip a hit. */
const SWEEP_STEP = 0.12;
/**
 * Each trail covers at most 35% of the gap to the next sword (and never more
 * than ~50°), whatever the spin speed: long and lush with one or two blades,
 * short enough with six that clear gaps remain and the ring never reads as solid.
 */
const TRAIL_GAP_SHARE = 0.35;
const TRAIL_ARC_MAX = 0.9;
const TRAIL_MAX_POINTS = 24;
/** Boss key in the per-sword cooldown maps. */
const BOSS_KEY = -1;

interface Blade {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  /** Current offset from the shared orbit angle; eases toward `target` when blades are added. */
  offset: number;
  target: number;
  /** 0→1 while the sword is being forged in. */
  forge: number;
  /** Recent world positions for the cosmetic trail (newest first), with their age in seconds. */
  trail: { x: number; y: number; age: number }[];
  /** Per-enemy cooldowns: enemy serial → seconds left. */
  cooldowns: Map<number, number>;
}

export interface BladeTargets {
  enemies: readonly Enemy[];
  boss: { x: number; y: number; radius: number } | null;
  hitEnemy: (enemy: Enemy, damage: number, x: number, y: number) => void;
  hitBoss: (damage: number, x: number, y: number) => void;
  sparks: (x: number, y: number, count: number) => void;
}

/**
 * EMBER BLADES weapon (upgrades/EmberBlades.ts has the tuning).
 *
 * Only the swords hurt: each has its own capsule matching the metal, swept in
 * small angular steps so a fast spin cannot pass through an enemy, with a
 * per-sword, per-enemy cooldown. Trails, sparks and glows are drawn on their
 * own layer and never take part in collision.
 */
export class EmberBlades {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;
  private readonly blades: Blade[] = [];
  private readonly trailLayer: Phaser.GameObjects.Graphics;
  private readonly flicker: Phaser.GameObjects.Graphics;
  private angle = 0;
  private sparkTimer = 0;
  private flickerTimer = 0;
  private time = 0;
  /** Infernal Cyclone look: hotter swords, stronger trails, lightning flickers. */
  cyclone = false;
  reducedMotion = false;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
    this.trailLayer = scene.add.graphics().setDepth(depth - 0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.flicker = scene.add.graphics().setDepth(depth + 0.4).setBlendMode(Phaser.BlendModes.ADD);
  }

  get count(): number {
    return this.blades.length;
  }

  /** World positions of the swords (for tests and effects). */
  positions(px: number, py: number): { x: number; y: number; angle: number }[] {
    return this.blades.map((b) => {
      const a = this.angle + b.offset;
      return { x: px + Math.cos(a) * BLADES.orbitRadius, y: py + Math.sin(a) * BLADES.orbitRadius, angle: a };
    });
  }

  /** Match the weapon level: forge in new swords and re-space them evenly. */
  setCount(n: number, px: number, py: number): void {
    const count = Math.max(0, Math.min(BLADES.maxLevel, n));
    while (this.blades.length < count) {
      const sprite = this.scene.add.image(px, py, BLADE_TEXTURE).setDepth(this.depth).setAlpha(0);
      const glow = this.scene.add.image(px, py, TEX.glowTight).setTint(BRAND.emberOrange).setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depth - 0.1).setAlpha(0);
      // A new sword starts where its slot will be and is forged in place.
      const index = this.blades.length;
      const offset = slotAngle(index, count);
      this.blades.push({ sprite, glow, offset, target: offset, forge: 0, trail: [], cooldowns: new Map() });
    }
    while (this.blades.length > count) {
      const b = this.blades.pop();
      b?.sprite.destroy();
      b?.glow.destroy();
    }
    // Everyone gets a new evenly spaced slot; existing swords glide there.
    this.blades.forEach((b, i) => {
      b.target = slotAngle(i, count);
    });
  }

  update(dt: number, px: number, py: number, prevX: number, prevY: number, spec: BladeSpec, targets: BladeTargets): void {
    this.time += dt;
    if (this.blades.length === 0) {
      this.trailLayer.clear();
      this.flicker.clear();
      return;
    }

    const before = this.angle;
    // Clockwise on screen: Y points down, so increasing the angle turns clockwise.
    this.angle = (this.angle + spec.angularSpeed * dt) % (Math.PI * 2);
    const sweep = spec.angularSpeed * dt;
    const steps = Math.max(1, Math.ceil(sweep / SWEEP_STEP));

    for (const blade of this.blades) {
      // Glide to the new even spacing (shortest way round).
      const diff = Phaser.Math.Angle.Wrap(blade.target - blade.offset);
      blade.offset += diff * Math.min(1, dt * 7);
      if (blade.forge < 1) blade.forge = Math.min(1, blade.forge + dt / 0.35);
      for (const [key, left] of blade.cooldowns) {
        if (left - dt <= 0) blade.cooldowns.delete(key);
        else blade.cooldowns.set(key, left - dt);
      }

      // Swept capsule collision along this frame's arc (and the phoenix's own movement).
      if (blade.forge >= 0.6) {
        for (let s = 1; s <= steps; s++) {
          const k = s / steps;
          const a = before + sweep * k + blade.offset;
          const cx = prevX + (px - prevX) * k + Math.cos(a) * BLADES.orbitRadius;
          const cy = prevY + (py - prevY) * k + Math.sin(a) * BLADES.orbitRadius;
          this.collide(blade, cx, cy, a + Math.PI / 2, spec.damage, targets);
        }
      }

      // Visuals.
      const a = this.angle + blade.offset;
      const x = px + Math.cos(a) * BLADES.orbitRadius;
      const y = py + Math.sin(a) * BLADES.orbitRadius;
      const travel = a + Math.PI / 2;
      const grow = Phaser.Math.Easing.Back.Out(blade.forge);
      const scale = (BLADES.length / blade.sprite.width) * grow;
      blade.sprite.setPosition(x, y).setRotation(travel - ART_TILT).setScale(scale).setAlpha(Math.min(1, blade.forge * 2));
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 9 + blade.offset * 3);
      blade.glow
        .setPosition(x, y)
        .setScale((this.cyclone ? 0.6 : 0.45) * grow)
        .setTint(this.cyclone ? BRAND.rebirthGold : BRAND.emberOrange)
        .setAlpha((this.cyclone ? 0.5 : 0.32) + 0.12 * pulse);
      if (this.cyclone) blade.sprite.setTint(BRAND.ghostWhite, BRAND.ghostWhite, BRAND.rebirthGold, BRAND.rebirthGold);
      else blade.sprite.clearTint();

      // Trail samples the tail end of the sword, so it always lies behind the blade.
      for (const point of blade.trail) point.age += dt;
      blade.trail.unshift({ x: x - Math.cos(travel) * BLADES.length * 0.45, y: y - Math.sin(travel) * BLADES.length * 0.45, age: 0 });
      const arc = Math.min(TRAIL_ARC_MAX, (TRAIL_GAP_SHARE * Math.PI * 2) / this.blades.length);
      const maxAge = spec.angularSpeed > 0 ? arc / spec.angularSpeed : 0;
      while (blade.trail.length > 1 && (blade.trail.length > TRAIL_MAX_POINTS || blade.trail[blade.trail.length - 1].age > maxAge)) blade.trail.pop();
    }

    this.drawTrails();
    this.ambient(dt, px, py, targets);
  }

  private collide(blade: Blade, cx: number, cy: number, travel: number, damage: number, t: BladeTargets): void {
    // Capsule from the hilt to the tip along the direction of travel.
    const half = BLADES.length / 2;
    const hx = cx - Math.cos(travel) * half;
    const hy = cy - Math.sin(travel) * half;
    for (const enemy of t.enemies) {
      if (!enemy.active || blade.cooldowns.has(enemy.serial)) continue;
      if (segmentDistance(enemy.x, enemy.y, hx, hy, travel, BLADES.length) > enemy.radius + BLADES.capsuleRadius) continue;
      blade.cooldowns.set(enemy.serial, BLADES.hitCooldown);
      t.hitEnemy(enemy, damage, cx, cy);
    }
    const boss = t.boss;
    if (boss && !blade.cooldowns.has(BOSS_KEY) && segmentDistance(boss.x, boss.y, hx, hy, travel, BLADES.length) <= boss.radius + BLADES.capsuleRadius) {
      blade.cooldowns.set(BOSS_KEY, BLADES.hitCooldown);
      t.hitBoss(damage, cx, cy);
    }
  }

  /** Cosmetic only: a tapering run of soft embers behind each sword, never part of collision. */
  private drawTrails(): void {
    const g = this.trailLayer;
    g.clear();
    const hot = this.cyclone;
    for (const blade of this.blades) {
      const pts = blade.trail;
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const f = 1 - i / Math.max(1, n);
        const r = ((hot ? 4.2 : 3.2) * f + 0.6) * blade.forge;
        g.fillStyle(BRAND.emberOrange, (hot ? 0.42 : 0.3) * f);
        g.fillCircle(pts[i].x, pts[i].y, r * 1.7);
        g.fillStyle(BRAND.rebirthGold, (hot ? 0.75 : 0.55) * f);
        g.fillCircle(pts[i].x, pts[i].y, r * 0.7);
      }
    }
  }

  /** Occasional sparks; with Infernal Cyclone, brief lightning flickers. */
  private ambient(dt: number, px: number, py: number, t: BladeTargets): void {
    if (this.reducedMotion) {
      this.flicker.clear();
      return;
    }
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = this.cyclone ? 0.12 : 0.28;
      const pos = this.positions(px, py);
      const p = pos[Math.floor(Math.random() * pos.length)];
      if (p) t.sparks(p.x, p.y, this.cyclone ? 2 : 1);
    }

    this.flicker.clear();
    if (!this.cyclone) return;
    this.flickerTimer -= dt;
    if (this.flickerTimer <= -0.08) this.flickerTimer = 0.35 + Math.random() * 0.4;
    if (this.flickerTimer < 0) {
      // A short jagged arc hugging one sword.
      const pos = this.positions(px, py);
      const p = pos[Math.floor((this.time * 7) % pos.length)];
      if (!p) return;
      this.flicker.lineStyle(2, BRAND.signalCyan, 0.9);
      this.flicker.beginPath();
      this.flicker.moveTo(p.x, p.y);
      for (let i = 1; i <= 3; i++) {
        this.flicker.lineTo(p.x + (Math.random() - 0.5) * 26, p.y + (Math.random() - 0.5) * 26);
      }
      this.flicker.strokePath();
    }
  }

  /** Run over: the swords fade out. */
  hide(): void {
    for (const b of this.blades) {
      b.sprite.setVisible(false);
      b.glow.setVisible(false);
    }
    this.trailLayer.clear();
    this.flicker.clear();
  }

  destroy(): void {
    for (const b of this.blades) {
      b.sprite.destroy();
      b.glow.destroy();
    }
    this.blades.length = 0;
    this.trailLayer.destroy();
    this.flicker.destroy();
  }
}
