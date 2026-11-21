import Phaser from 'phaser';
import { TAU } from '../core/math';

/**
 * Boss attack hazards that are not plain bullets (bullets reuse Projectile, so
 * they stay grazeable). Every hazard has a TELEGRAPH (drawn as a pulsing
 * outline, harmless) before it turns ACTIVE (filled, harmful), so each attack
 * is readable before it can hurt — a hard requirement of the brief.
 *
 *  zone    circle: meteor marks, teleport slam, dive impact, spores, vines, rifts
 *  beam    line from a point at an angle: void beams, laser grid
 *  wave    full-width band sweeping down/up with a safe gap: lava wave
 *  wall    solid bar that blocks movement, never damages: ice wall prison
 *  well    pulls the phoenix in; only its small core hurts: gravity well
 *  tornado wanders; contact hurts and shoves: wind tornadoes
 *  orb     circles the boss: orbiting orbs
 */
export type HazardKind = 'zone' | 'beam' | 'wave' | 'wall' | 'well' | 'tornado' | 'orb';
export type HazardEffect = 'damage' | 'root' | 'block' | 'pull';

export interface Hazard {
  kind: HazardKind;
  effect: HazardEffect;
  color: number;
  x: number;
  y: number;
  /** Zone/well/tornado/orb radius; beam/wave/wall half-thickness. */
  r: number;
  angle: number;
  length: number;
  telegraph: number;
  active: number;
  /** Seconds since it turned active. */
  t: number;
  vx: number;
  vy: number;
  /** Wave: horizontal extent and the safe gap. */
  x1: number;
  x2: number;
  gapX: number;
  gapW: number;
  /** Well: pull speed (px/s) and harmful core radius. */
  pull: number;
  core: number;
  /** Rift: damaging only `on` seconds out of every `period`. */
  period: number;
  on: number;
  /** Wall: which side of it the phoenix was on when it rose (0 = not yet known). */
  side: number;
  /** Orb: orbit around the boss. */
  orbitAngle: number;
  orbitSpeed: number;
  orbitBase: number;
  orbitAmp: number;
}

const DEFAULTS: Hazard = {
  kind: 'zone',
  effect: 'damage',
  color: 0xffffff,
  x: 0,
  y: 0,
  r: 40,
  angle: 0,
  length: 0,
  telegraph: 1,
  active: 0.3,
  t: 0,
  vx: 0,
  vy: 0,
  x1: 0,
  x2: 0,
  gapX: 0,
  gapW: 0,
  pull: 0,
  core: 0,
  period: 0,
  on: 0,
  side: 0,
  orbitAngle: 0,
  orbitSpeed: 0,
  orbitBase: 0,
  orbitAmp: 0,
};

/** What a hazard can do to the phoenix. */
export interface HazardTarget {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitRadius: number;
  damage: () => void;
  root: (seconds: number) => void;
}

/** Hard cap so no attack combination can flood the screen. */
const MAX_HAZARDS = 40;

export class HazardField {
  readonly list: Hazard[] = [];
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly solid: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    // Walls and well cores are drawn opaque; everything else glows additively.
    this.solid = scene.add.graphics().setDepth(depth);
    this.g = scene.add.graphics().setDepth(depth + 0.5).setBlendMode(Phaser.BlendModes.ADD);
  }

  add(partial: Partial<Hazard>): Hazard {
    const hazard: Hazard = { ...DEFAULTS, ...partial };
    if (this.list.length >= MAX_HAZARDS) this.list.shift();
    this.list.push(hazard);
    return hazard;
  }

  clear(): void {
    this.list.length = 0;
    this.g.clear();
    this.solid.clear();
  }

  get count(): number {
    return this.list.length;
  }

  /** Advance timers and movement. `bossX/Y` anchors orbs. */
  update(dt: number, bossX: number, bossY: number, bounds: { cx: number; cy: number; rx: number; ry: number }): void {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      if (h.telegraph > 0) {
        h.telegraph -= dt;
        if (h.kind === 'orb') this.placeOrb(h, bossX, bossY, dt);
        continue;
      }
      h.t += dt;
      h.active -= dt;
      if (h.active <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      if (h.kind === 'wave') h.y += h.vy * dt;
      if (h.kind === 'tornado') {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        // Bounce off the board edges.
        if (Math.abs(h.x - bounds.cx) > bounds.rx - h.r) h.vx = -h.vx;
        if (Math.abs(h.y - bounds.cy) > bounds.ry - h.r) h.vy = -h.vy;
      }
      if (h.kind === 'orb') this.placeOrb(h, bossX, bossY, dt);
    }
  }

  private placeOrb(h: Hazard, bossX: number, bossY: number, dt: number): void {
    h.orbitAngle += h.orbitSpeed * dt;
    // Orbit radius breathes in and out so the ring is dodgeable by timing.
    const radius = h.orbitBase + h.orbitAmp * (0.5 - 0.5 * Math.cos(h.t * 1.6));
    h.x = bossX + Math.cos(h.orbitAngle) * radius;
    h.y = bossY + Math.sin(h.orbitAngle) * radius;
  }

  /** Apply active hazards to the phoenix. */
  affect(p: HazardTarget, dt: number): void {
    for (const h of this.list) {
      if (h.telegraph > 0) continue;
      switch (h.kind) {
        case 'zone':
        case 'orb': {
          if (h.period > 0 && h.t % h.period > h.on) break; // rift between pulses
          if (Math.hypot(p.x - h.x, p.y - h.y) <= h.r + p.hitRadius) {
            if (h.effect === 'root') p.root(1.1);
            else p.damage();
          }
          break;
        }
        case 'tornado': {
          const d = Math.hypot(p.x - h.x, p.y - h.y);
          if (d <= h.r + p.hitRadius) {
            p.damage();
            // Shove the phoenix out along the line from the tornado's centre.
            const a = d > 1 ? Math.atan2(p.y - h.y, p.x - h.x) : Math.random() * TAU;
            p.x = h.x + Math.cos(a) * (h.r + p.hitRadius + 26);
            p.y = h.y + Math.sin(a) * (h.r + p.hitRadius + 26);
          }
          break;
        }
        case 'beam': {
          if (segmentDistance(p.x, p.y, h.x, h.y, h.angle, h.length) <= h.r + p.hitRadius) p.damage();
          break;
        }
        case 'wave': {
          const inBand = Math.abs(p.y - h.y) <= h.r + p.hitRadius;
          const inGap = Math.abs(p.x - h.gapX) <= h.gapW / 2 - p.hitRadius;
          if (inBand && !inGap) p.damage();
          break;
        }
        case 'wall': {
          // Keep the phoenix on the side it was on when the wall rose. Using a
          // remembered side (not the nearest side) means a big step on a slow
          // frame can never tunnel through the bar.
          const ux = Math.cos(h.angle);
          const uy = Math.sin(h.angle);
          const nx = -uy;
          const ny = ux;
          const rx = p.x - h.x;
          const ry = p.y - h.y;
          const along = rx * ux + ry * uy;
          const across = rx * nx + ry * ny;
          if (h.side === 0) h.side = across >= 0 ? 1 : -1;
          const min = h.r + p.hitRadius;
          const s = across * h.side;
          // Within the bar's length, closer than `min` or just past it (≤ 60 px): push back.
          if (Math.abs(along) <= h.length / 2 + p.hitRadius && s < min && s > -60) {
            const push = min - s;
            p.x += nx * h.side * push;
            p.y += ny * h.side * push;
            const into = (p.vx * nx + p.vy * ny) * h.side;
            if (into < 0) {
              p.vx -= nx * h.side * into;
              p.vy -= ny * h.side * into;
            }
          }
          break;
        }
        case 'well': {
          const d = Math.hypot(h.x - p.x, h.y - p.y);
          if (d <= h.r && d > 1) {
            const step = Math.min(d, h.pull * dt * (0.4 + (1 - d / h.r)));
            p.x += ((h.x - p.x) / d) * step;
            p.y += ((h.y - p.y) / d) * step;
          }
          if (d <= h.core + p.hitRadius) p.damage();
          break;
        }
      }
    }
  }

  draw(): void {
    const g = this.g;
    const s = this.solid;
    g.clear();
    s.clear();
    const blink = 0.5 + 0.5 * Math.sin(this.time * 14);
    for (const h of this.list) {
      const warn = h.telegraph > 0;
      const a = warn ? 0.35 + 0.45 * blink : 0.75;
      switch (h.kind) {
        case 'zone':
        case 'tornado':
        case 'orb': {
          const pulsing = h.period > 0 && !warn ? (h.t % h.period <= h.on ? 1 : 0.25) : 1;
          if (warn) {
            g.lineStyle(3, h.color, a);
            g.strokeCircle(h.x, h.y, h.r);
            g.fillStyle(h.color, 0.1 + 0.1 * blink);
            g.fillCircle(h.x, h.y, h.r);
          } else {
            g.fillStyle(h.color, (h.kind === 'zone' ? 0.42 : 0.6) * pulsing);
            g.fillCircle(h.x, h.y, h.r);
            g.lineStyle(2, 0xffffff, 0.7 * pulsing);
            g.strokeCircle(h.x, h.y, h.r * (h.kind === 'tornado' ? 0.55 + 0.1 * Math.sin(h.t * 20) : 1));
            if (h.kind === 'tornado') g.strokeCircle(h.x, h.y, h.r * 0.25);
          }
          break;
        }
        case 'beam': {
          const ex = h.x + Math.cos(h.angle) * h.length;
          const ey = h.y + Math.sin(h.angle) * h.length;
          if (warn) {
            g.lineStyle(2 + (1 - Math.max(0, h.telegraph)) * 4, h.color, a);
          } else {
            g.lineStyle(h.r * 2, h.color, 0.7);
            g.lineBetween(h.x, h.y, ex, ey);
            g.lineStyle(h.r * 0.7, 0xffffff, 0.9);
          }
          g.lineBetween(h.x, h.y, ex, ey);
          break;
        }
        case 'wave': {
          const top = h.y - h.r;
          const gapL = h.gapX - h.gapW / 2;
          const gapR = h.gapX + h.gapW / 2;
          g.fillStyle(h.color, warn ? 0.18 + 0.2 * blink : 0.65);
          g.fillRect(h.x1, top, Math.max(0, gapL - h.x1), h.r * 2);
          g.fillRect(gapR, top, Math.max(0, h.x2 - gapR), h.r * 2);
          // The safe gap is outlined in white so it reads instantly.
          g.lineStyle(2, 0xffffff, warn ? a : 0.8);
          g.strokeRect(gapL, top, h.gapW, h.r * 2);
          break;
        }
        case 'wall': {
          const ux = Math.cos(h.angle) * (h.length / 2);
          const uy = Math.sin(h.angle) * (h.length / 2);
          if (warn) {
            g.lineStyle(h.r * 2, h.color, 0.15 + 0.25 * blink);
            g.lineBetween(h.x - ux, h.y - uy, h.x + ux, h.y + uy);
          } else {
            s.lineStyle(h.r * 2, 0xbfefff, 0.92);
            s.lineBetween(h.x - ux, h.y - uy, h.x + ux, h.y + uy);
            g.lineStyle(3, h.color, 0.9);
            g.lineBetween(h.x - ux, h.y - uy, h.x + ux, h.y + uy);
          }
          break;
        }
        case 'well': {
          g.lineStyle(2, h.color, warn ? a : 0.5);
          g.strokeCircle(h.x, h.y, h.r);
          if (!warn) {
            for (let i = 0; i < 3; i++) {
              const rr = h.r * (((this.time * 0.7 + i / 3) % 1) * 0.9 + 0.1);
              g.lineStyle(2, h.color, 0.55 * (rr / h.r));
              g.strokeCircle(h.x, h.y, h.r - rr + h.core);
            }
            s.fillStyle(0x10061c, 0.95);
            s.fillCircle(h.x, h.y, h.core);
            g.lineStyle(3, h.color, 0.9);
            g.strokeCircle(h.x, h.y, h.core);
          }
          break;
        }
      }
    }
  }

  destroy(): void {
    this.g.destroy();
    this.solid.destroy();
  }
}

/** Distance from a point to a segment that starts at (x,y) and runs `length` along `angle`. */
export function segmentDistance(px: number, py: number, x: number, y: number, angle: number, length: number): number {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const along = Math.max(0, Math.min(length, (px - x) * ux + (py - y) * uy));
  return Math.hypot(px - (x + ux * along), py - (y + uy * along));
}
