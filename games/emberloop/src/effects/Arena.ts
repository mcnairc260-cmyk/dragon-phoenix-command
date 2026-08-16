import Phaser from 'phaser';
import { ARENA, HAZARD } from '../config/GameConfig';
import { TAU } from '../core/math';
import { TEX } from './Textures';

export interface ArenaPoint {
  x: number;
  y: number;
}

interface Crack {
  /** Polyline in unit space (radius = ARENA.drawRadius). */
  points: { x: number; y: number }[];
  width: number;
  phase: number;
  speed: number;
}

export type SectorState = 'telegraph' | 'active' | 'fading';

export interface CollapsingSector {
  /** Centre angle in radians. */
  angle: number;
  halfWidth: number;
  state: SectorState;
  timer: number;
}

/**
 * The volcanic caldera.
 *
 * Gameplay maths treats the arena as a unit circle; rendering stretches it into
 * an ellipse so it fills a portrait phone screen. `norm()` returns 1.0 exactly
 * at the wall regardless of the screen's aspect ratio.
 */
export class Arena {
  cx = 0;
  cy = 0;
  rx = 100;
  ry = 100;

  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly crackLayer: Phaser.GameObjects.Graphics;
  private readonly hazardLayer: Phaser.GameObjects.Graphics;
  private readonly rimLayer: Phaser.GameObjects.Graphics;
  private readonly haze: Phaser.GameObjects.Image[] = [];
  private readonly cracks: Crack[] = [];
  private spin = 0;
  private time = 0;

  readonly sectors: CollapsingSector[] = [];
  reducedMotion = false;

  constructor(scene: Phaser.Scene, baseDepth: number) {
    this.bg = scene.add.graphics().setDepth(baseDepth);
    this.crackLayer = scene.add.graphics().setDepth(baseDepth + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.hazardLayer = scene.add.graphics().setDepth(baseDepth + 2).setBlendMode(Phaser.BlendModes.ADD);
    this.rimLayer = scene.add.graphics().setDepth(baseDepth + 3).setBlendMode(Phaser.BlendModes.ADD);

    // Three slow-drifting additive blobs stand in for real heat distortion at a
    // fraction of the cost of a shader.
    for (let i = 0; i < 3; i++) {
      const img = scene.add
        .image(0, 0, TEX.smoke)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xff5a1a)
        .setAlpha(0.07)
        .setDepth(baseDepth + 2);
      this.haze.push(img);
    }

    this.generateCracks();
  }

  /** Recompute geometry for the current viewport. */
  layout(width: number, height: number): void {
    this.cx = width / 2;
    this.cy = height * ARENA.centerYFactor;
    this.rx = (width / 2) * ARENA.radiusXFactor;
    this.ry = (height / 2) * ARENA.radiusYFactor;
    this.drawBackground(width, height);
  }

  /** Normalised radius: 1.0 sits exactly on the arena wall. */
  norm(x: number, y: number): number {
    const dx = (x - this.cx) / this.rx;
    const dy = (y - this.cy) / this.ry;
    return Math.hypot(dx, dy);
  }

  angleOf(x: number, y: number): number {
    // Angle is measured in normalised space so wedges look symmetric on screen.
    return Math.atan2((y - this.cy) / this.ry, (x - this.cx) / this.rx);
  }

  /** Convert (angle, normalised radius) into screen coordinates. */
  pointAt(angle: number, radius: number): ArenaPoint {
    return {
      x: this.cx + Math.cos(angle) * this.rx * radius,
      y: this.cy + Math.sin(angle) * this.ry * radius,
    };
  }

  /** Push a point back inside the wall. Returns true when it was outside. */
  clamp(point: ArenaPoint, maxNorm = 1): boolean {
    const n = this.norm(point.x, point.y);
    if (n <= maxNorm || n === 0) return false;
    const scale = maxNorm / n;
    point.x = this.cx + (point.x - this.cx) * scale;
    point.y = this.cy + (point.y - this.cy) * scale;
    return true;
  }

  randomEdgePoint(rng: () => number = Math.random): ArenaPoint & { angle: number } {
    const angle = rng() * TAU;
    const p = this.pointAt(angle, ARENA.spawnRadius);
    return { ...p, angle };
  }

  randomInsidePoint(rng: () => number = Math.random, maxNorm = 0.85): ArenaPoint {
    const angle = rng() * TAU;
    // sqrt keeps the distribution uniform by area rather than clustered at the centre.
    const radius = Math.sqrt(rng()) * maxNorm;
    return this.pointAt(angle, radius);
  }

  // ── Collapsing sectors ────────────────────────────────────────────────────
  spawnSector(rng: () => number = Math.random): void {
    this.sectors.push({
      angle: rng() * TAU,
      halfWidth: Phaser.Math.DegToRad(HAZARD.sectorWidth) / 2,
      state: 'telegraph',
      timer: HAZARD.telegraphTime,
    });
  }

  /** True when the point sits inside an *active* (damaging) collapsed sector. */
  sectorDamageAt(x: number, y: number): boolean {
    const n = this.norm(x, y);
    if (n < HAZARD.innerRadius || n > 1.02) return false;
    const a = this.angleOf(x, y);
    for (const sector of this.sectors) {
      if (sector.state !== 'active') continue;
      const delta = Math.abs(Phaser.Math.Angle.Wrap(a - sector.angle));
      if (delta <= sector.halfWidth) return true;
    }
    return false;
  }

  update(dt: number): void {
    this.time += dt;
    if (!this.reducedMotion) this.spin += Phaser.Math.DegToRad(ARENA.spinDegPerSec) * dt;

    for (let i = this.sectors.length - 1; i >= 0; i--) {
      const sector = this.sectors[i];
      sector.timer -= dt;
      if (sector.timer > 0) continue;
      if (sector.state === 'telegraph') {
        sector.state = 'active';
        sector.timer = HAZARD.activeTime;
      } else if (sector.state === 'active') {
        sector.state = 'fading';
        sector.timer = 0.7;
      } else {
        this.sectors.splice(i, 1);
      }
    }

    this.drawCracks();
    this.drawHazards();
    this.drawRim();
    this.updateHaze();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  private generateCracks(): void {
    const R = ARENA.drawRadius;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * TAU + Math.random() * 0.2;
      const points: { x: number; y: number }[] = [];
      let angle = baseAngle;
      const steps = 5 + Math.floor(Math.random() * 4);
      const start = 0.16 + Math.random() * 0.2;
      for (let s = 0; s <= steps; s++) {
        const t = start + (1 - start) * (s / steps);
        angle += (Math.random() - 0.5) * 0.28;
        points.push({ x: Math.cos(angle) * R * t, y: Math.sin(angle) * R * t });
      }
      this.cracks.push({
        points,
        width: 2 + Math.random() * 4,
        phase: Math.random() * TAU,
        speed: 0.5 + Math.random() * 1.1,
      });
    }
  }

  private drawBackground(width: number, height: number): void {
    const g = this.bg;
    g.clear();
    // Void backdrop beyond the caldera.
    g.fillStyle(0x05030a, 1);
    g.fillRect(0, 0, width, height);

    // The caldera floor: concentric obsidian bands, warmest at the rim.
    // Channels are blended by hand — Phaser's Color constructor takes separate
    // r/g/b arguments, so passing a packed hex to it silently blows out to red.
    const inner = { r: 0x0d, g: 0x05, b: 0x08 };
    const outer = { r: 0x2a, g: 0x0d, b: 0x10 };
    const bands = 14;
    for (let i = bands; i >= 0; i--) {
      const t = i / bands;
      const color = Phaser.Display.Color.GetColor(
        Math.round(inner.r + (outer.r - inner.r) * t),
        Math.round(inner.g + (outer.g - inner.g) * t),
        Math.round(inner.b + (outer.b - inner.b) * t),
      );
      g.fillStyle(color, 1);
      g.fillEllipse(this.cx, this.cy, this.rx * 2 * t, this.ry * 2 * t);
    }
  }

  private drawCracks(): void {
    const g = this.crackLayer;
    g.clear();
    g.setPosition(this.cx, this.cy);
    g.setScale(this.rx / ARENA.drawRadius, this.ry / ARENA.drawRadius);
    g.setRotation(this.spin);

    for (const crack of this.cracks) {
      // Each crack breathes on its own phase so the floor never looks static.
      const pulse = 0.35 + 0.35 * Math.sin(this.time * crack.speed + crack.phase);
      g.lineStyle(crack.width * 3.4, 0xff3300, pulse * 0.2);
      this.strokePolyline(g, crack.points);
      g.lineStyle(crack.width, 0xff8a3d, pulse);
      this.strokePolyline(g, crack.points);
      g.lineStyle(crack.width * 0.4, 0xffd9a0, pulse * 0.9);
      this.strokePolyline(g, crack.points);
    }
  }

  private strokePolyline(g: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): void {
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
  }

  private drawHazards(): void {
    const g = this.hazardLayer;
    g.clear();
    if (this.sectors.length === 0) return;
    g.setPosition(this.cx, this.cy);
    g.setScale(this.rx / ARENA.drawRadius, this.ry / ARENA.drawRadius);

    const R = ARENA.drawRadius;
    for (const sector of this.sectors) {
      const from = sector.angle - sector.halfWidth;
      const to = sector.angle + sector.halfWidth;
      let color = 0xff2a00;
      let alpha: number;
      if (sector.state === 'telegraph') {
        // Fast strobe while the ground is cracking — unmistakable warning.
        const t = 1 - sector.timer / HAZARD.telegraphTime;
        alpha = 0.1 + 0.22 * Math.abs(Math.sin(t * Math.PI * 6));
        color = 0xffaa00;
      } else if (sector.state === 'active') {
        alpha = 0.42 + 0.12 * Math.sin(this.time * 9);
      } else {
        alpha = 0.3 * (sector.timer / 0.7);
      }

      g.fillStyle(color, alpha);
      g.beginPath();
      g.moveTo(Math.cos(from) * R * HAZARD.innerRadius, Math.sin(from) * R * HAZARD.innerRadius);
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      }
      for (let i = steps; i >= 0; i--) {
        const a = from + ((to - from) * i) / steps;
        g.lineTo(Math.cos(a) * R * HAZARD.innerRadius, Math.sin(a) * R * HAZARD.innerRadius);
      }
      g.closePath();
      g.fillPath();

      if (sector.state !== 'telegraph') {
        g.lineStyle(6, 0xffe08a, alpha * 0.8);
        g.strokePath();
      }
    }
  }

  private drawRim(): void {
    const g = this.rimLayer;
    g.clear();
    const pulse = 0.55 + 0.2 * Math.sin(this.time * 1.5);
    g.lineStyle(10, 0xff3d00, 0.1 * pulse);
    g.strokeEllipse(this.cx, this.cy, this.rx * 2, this.ry * 2);
    g.lineStyle(3, 0xff7a2a, 0.55 * pulse);
    g.strokeEllipse(this.cx, this.cy, this.rx * 2, this.ry * 2);
    g.lineStyle(1, 0xffd7a8, 0.7 * pulse);
    g.strokeEllipse(this.cx, this.cy, this.rx * 2 - 3, this.ry * 2 - 3);
  }

  private updateHaze(): void {
    if (this.reducedMotion) {
      for (const h of this.haze) h.setVisible(false);
      return;
    }
    for (let i = 0; i < this.haze.length; i++) {
      const h = this.haze[i];
      const t = this.time * (0.12 + i * 0.05) + i * 2.1;
      h.setVisible(true);
      h.setPosition(
        this.cx + Math.cos(t) * this.rx * 0.45,
        this.cy + Math.sin(t * 1.3) * this.ry * 0.4,
      );
      h.setScale(4 + Math.sin(t * 0.7) * 1.2);
      h.setAlpha(0.05 + 0.03 * Math.sin(t * 1.7));
    }
  }

  reset(): void {
    this.sectors.length = 0;
    this.hazardLayer.clear();
  }

  destroy(): void {
    this.bg.destroy();
    this.crackLayer.destroy();
    this.hazardLayer.destroy();
    this.rimLayer.destroy();
    for (const h of this.haze) h.destroy();
  }
}
