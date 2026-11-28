import { clamp, TAU } from '../core/math';
import type { Arena } from '../effects/Arena';
import type { BossAttackId } from '../config/bosses';
import type { HazardField } from './Hazards';

/** What a boss attack script may touch. */
export interface AttackCtx {
  dt: number;
  playerX: number;
  playerY: number;
  arena: Arena;
  hazards: HazardField;
  color: number;
  /** 1 for the first encounter, rising slowly with later bosses. */
  pace: number;
  boss: {
    x: number;
    y: number;
    radius: number;
    /** Hide (intangible + invulnerable) or show the boss. */
    vanish: (on: boolean) => void;
    /** Hold the boss still while a script moves it. */
    hold: (on: boolean) => void;
    moveTo: (x: number, y: number) => void;
  };
  fire: (x: number, y: number, angle: number, speed: number, opts?: { homingTime?: number; turnRate?: number; radius?: number }) => void;
  /** Purely visual cue (a ring) for wind-ups. */
  cue: (x: number, y: number, radius: number) => void;
}

/** One running attack. Returns true when it has fully finished. */
export type AttackScript = (ctx: AttackCtx) => boolean;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** A point inside the board at normalised radius ≤ maxNorm. */
function inside(ctx: AttackCtx, x: number, y: number, maxNorm = 0.85): { x: number; y: number } {
  const p = { x, y };
  ctx.arena.clamp(p, maxNorm);
  return p;
}

function ring(ctx: AttackCtx, x: number, y: number, count: number, speed: number, offset: number, gaps: { at: number; width: number }[] = []): void {
  for (let i = 0; i < count; i++) {
    if (gaps.some((g) => ((i - g.at + count) % count) < g.width)) continue;
    ctx.fire(x, y, offset + (i / count) * TAU, speed * ctx.pace);
  }
}

function aimAt(ctx: AttackCtx): number {
  return Math.atan2(ctx.playerY - ctx.boss.y, ctx.playerX - ctx.boss.x);
}

/** Builds a script from timed steps: each step fires once when t passes `at`. */
function timeline(steps: { at: number; run: (ctx: AttackCtx) => void }[], duration: number): AttackScript {
  let t = 0;
  let next = 0;
  return (ctx) => {
    t += ctx.dt;
    while (next < steps.length && t >= steps[next].at) {
      steps[next].run(ctx);
      next += 1;
    }
    return t >= duration;
  };
}

export function createAttack(id: BossAttackId): AttackScript {
  switch (id) {
    // ── Magmathar ───────────────────────────────────────────────────────────
    case 'lava-wave':
      // A band of fire sweeps the whole board; the outlined gap is the safe way through.
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              const a = ctx.arena;
              const fromTop = ctx.playerY > a.cy;
              const speed = 210 * ctx.pace;
              const gapW = 104;
              const x1 = a.cx - a.rx;
              const x2 = a.cx + a.rx;
              ctx.hazards.add({
                kind: 'wave',
                color: ctx.color,
                x1,
                x2,
                y: fromTop ? a.cy - a.ry : a.cy + a.ry,
                vy: fromTop ? speed : -speed,
                r: 16,
                gapW,
                gapX: clamp(ctx.playerX + rand(-80, 80), x1 + gapW / 2 + 6, x2 - gapW / 2 - 6),
                telegraph: 1.1,
                active: (a.ry * 2) / speed,
              });
            },
          },
        ],
        1.1 + 2.2,
      );
    case 'meteor-rain':
      return timeline(
        [0, 0.55].map((at, wave) => ({
          at,
          run: (ctx: AttackCtx) => {
            for (let i = 0; i < 4; i++) {
              const p =
                wave === 0 && i === 0
                  ? { x: ctx.playerX, y: ctx.playerY }
                  : ctx.arena.randomInsidePoint(Math.random, 0.8);
              ctx.hazards.add({ kind: 'zone', color: ctx.color, x: p.x, y: p.y, r: 40, telegraph: 1.1, active: 0.22 });
            }
          },
        })),
        1.9,
      );
    case 'eruption-rings':
      return timeline(
        [0, 0.55, 1.1].map((at) => ({
          at,
          run: (ctx: AttackCtx) => {
            const count = 22;
            ring(ctx, ctx.boss.x, ctx.boss.y, count, 150, Math.random() * TAU, [{ at: Math.floor(Math.random() * count), width: 3 }]);
          },
        })),
        1.4,
      );

    // ── Criotharis ──────────────────────────────────────────────────────────
    case 'ice-shard-barrage':
      return timeline(
        [0, 0.3, 0.6, 0.9].map((at) => ({
          at,
          run: (ctx: AttackCtx) => {
            const base = aimAt(ctx);
            for (let i = -2; i <= 2; i++) ctx.fire(ctx.boss.x, ctx.boss.y, base + i * 0.14, 240 * ctx.pace);
          },
        })),
        1.1,
      );
    case 'frost-nova':
      return timeline(
        [
          { at: 0, run: (ctx) => ctx.cue(ctx.boss.x, ctx.boss.y, 120) },
          {
            at: 0.6,
            run: (ctx) => {
              const count = 40;
              const at = Math.floor(Math.random() * count);
              ring(ctx, ctx.boss.x, ctx.boss.y, count, 165, 0, [
                { at, width: 5 },
                { at: (at + count / 2) % count, width: 5 },
              ]);
            },
          },
          {
            at: 1.1,
            run: (ctx) => {
              const count = 40;
              const at = Math.floor(Math.random() * count);
              ring(ctx, ctx.boss.x, ctx.boss.y, count, 165, TAU / 80, [
                { at, width: 5 },
                { at: (at + count / 2) % count, width: 5 },
              ]);
            },
          },
        ],
        1.4,
      );
    case 'ice-wall-prison':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              // Three walls in a U around the phoenix; the open side is never the board edge.
              const a = ctx.arena;
              const towardCentre = Math.atan2(a.cy - ctx.playerY, a.cx - ctx.playerX);
              const open = Math.round(towardCentre / (Math.PI / 2)) * (Math.PI / 2);
              const d = 96;
              for (let k = 1; k <= 3; k++) {
                const side = open + k * (Math.PI / 2);
                const c = inside(ctx, ctx.playerX + Math.cos(side) * d, ctx.playerY + Math.sin(side) * d, 0.97);
                ctx.hazards.add({ kind: 'wall', effect: 'block', color: ctx.color, x: c.x, y: c.y, angle: side + Math.PI / 2, length: 212, r: 9, telegraph: 0.9, active: 3.2 });
              }
            },
          },
          ...[1.6, 2.6].map((at) => ({
            at,
            run: (ctx: AttackCtx) => {
              const base = aimAt(ctx);
              for (let i = -1; i <= 1; i++) ctx.fire(ctx.boss.x, ctx.boss.y, base + i * 0.22, 170 * ctx.pace);
            },
          })),
        ],
        4.1,
      );

    // ── Nethermorph ─────────────────────────────────────────────────────────
    case 'void-beams':
      return timeline(
        [0, 1.05].map((at) => ({
          at,
          run: (ctx: AttackCtx) => {
            const base = aimAt(ctx);
            for (let i = -1; i <= 1; i++) {
              ctx.hazards.add({ kind: 'beam', color: ctx.color, x: ctx.boss.x, y: ctx.boss.y, angle: base + i * 0.42, length: 1100, r: 10, telegraph: 0.9, active: 0.45 });
            }
          },
        })),
        2.4,
      );
    case 'teleport-strike':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              ctx.boss.hold(true);
              ctx.boss.vanish(true);
            },
          },
          {
            at: 0.45,
            run: (ctx) => {
              const angle = Math.random() * TAU;
              const p = inside(ctx, ctx.playerX + Math.cos(angle) * 150, ctx.playerY + Math.sin(angle) * 150, 0.8);
              ctx.boss.moveTo(p.x, p.y);
              ctx.boss.vanish(false);
              ctx.hazards.add({ kind: 'zone', color: ctx.color, x: p.x, y: p.y, r: 96, telegraph: 0.8, active: 0.25 });
            },
          },
          { at: 1.3, run: (ctx) => ring(ctx, ctx.boss.x, ctx.boss.y, 10, 170, Math.random() * TAU) },
          { at: 1.5, run: (ctx) => ctx.boss.hold(false) },
        ],
        1.6,
      );
    case 'gravity-well':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              const angle = Math.random() * TAU;
              const p = inside(ctx, ctx.playerX + Math.cos(angle) * 170, ctx.playerY + Math.sin(angle) * 170, 0.75);
              ctx.hazards.add({ kind: 'well', effect: 'pull', color: ctx.color, x: p.x, y: p.y, r: 230, pull: 115, core: 30, telegraph: 0.8, active: 3.5 });
            },
          },
        ],
        4.3,
      );

    // ── Blightbloom ─────────────────────────────────────────────────────────
    case 'seed-swarm':
      return timeline(
        [0, 0.8].map((at) => ({
          at,
          run: (ctx: AttackCtx) => {
            const base = aimAt(ctx);
            for (let i = 0; i < 8; i++) {
              // Partially homing: they curve toward you for 1.4 s, then fly straight.
              ctx.fire(ctx.boss.x, ctx.boss.y, base - 0.9 + (i / 7) * 1.8, 140 * ctx.pace, { homingTime: 1.4, turnRate: 1.8, radius: 7 });
            }
          },
        })),
        1.2,
      );
    case 'toxic-spores':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              for (let i = 0; i < 3; i++) {
                const angle = Math.random() * TAU;
                const dist = rand(70, 140);
                const p = inside(ctx, ctx.playerX + Math.cos(angle) * dist, ctx.playerY + Math.sin(angle) * dist);
                ctx.hazards.add({ kind: 'zone', color: ctx.color, x: p.x, y: p.y, r: 52, telegraph: 1, active: 4.5 });
              }
            },
          },
        ],
        1.6,
      );
    case 'vine-snare':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              ctx.hazards.add({ kind: 'zone', effect: 'root', color: ctx.color, x: ctx.playerX, y: ctx.playerY, r: 38, telegraph: 0.85, active: 1 });
              for (let i = 0; i < 3; i++) {
                const angle = Math.random() * TAU;
                const p = inside(ctx, ctx.playerX + Math.cos(angle) * rand(80, 150), ctx.playerY + Math.sin(angle) * rand(80, 150));
                ctx.hazards.add({ kind: 'zone', effect: 'root', color: ctx.color, x: p.x, y: p.y, r: 38, telegraph: 0.85, active: 1 });
              }
            },
          },
        ],
        1.9,
      );

    // ── Skyrend ─────────────────────────────────────────────────────────────
    case 'feather-storm': {
      let t = 0;
      let shot = 0;
      let spin = Math.random() * TAU;
      return (ctx) => {
        t += ctx.dt;
        spin += ctx.dt * 2.4;
        shot -= ctx.dt;
        if (shot <= 0 && t < 1.8) {
          shot = 0.11;
          for (let arm = 0; arm < 4; arm++) ctx.fire(ctx.boss.x, ctx.boss.y, spin + (arm / 4) * TAU, 185 * ctx.pace);
        }
        return t >= 1.9;
      };
    }
    case 'dive-bomb': {
      let t = 0;
      let target = { x: 0, y: 0 };
      let start = { x: 0, y: 0 };
      let landed = false;
      return (ctx) => {
        if (t === 0) {
          target = { x: ctx.playerX, y: ctx.playerY };
          start = { x: ctx.boss.x, y: ctx.boss.y };
          ctx.boss.hold(true);
          ctx.hazards.add({ kind: 'zone', color: ctx.color, x: target.x, y: target.y, r: 78, telegraph: 1, active: 0.25 });
        }
        t += ctx.dt;
        if (t > 0.75 && !landed) {
          // The dive itself: the last quarter-second of the warning.
          const k = clamp((t - 0.75) / 0.25, 0, 1);
          ctx.boss.moveTo(start.x + (target.x - start.x) * k, start.y + (target.y - start.y) * k);
          if (k >= 1) {
            landed = true;
            ring(ctx, target.x, target.y, 12, 175, Math.random() * TAU);
          }
        }
        if (t >= 1.5) ctx.boss.hold(false);
        return t >= 1.5;
      };
    }
    case 'wind-tornadoes':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              for (let i = 0; i < 3; i++) {
                const p = ctx.arena.pointAt(Math.random() * TAU, 0.8);
                const angle = Math.atan2(ctx.playerY - p.y, ctx.playerX - p.x) + rand(-0.5, 0.5);
                const speed = 80 * ctx.pace;
                ctx.hazards.add({ kind: 'tornado', color: ctx.color, x: p.x, y: p.y, r: 28, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, telegraph: 0.7, active: 5.5 });
              }
            },
          },
        ],
        1.5,
      );

    // ── Aurelion ────────────────────────────────────────────────────────────
    case 'orbiting-orbs':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              const dir = Math.random() < 0.5 ? -1 : 1;
              const offset = Math.random() * TAU;
              for (let i = 0; i < 6; i++) {
                ctx.hazards.add({ kind: 'orb', color: ctx.color, r: 14, orbitAngle: offset + (i / 6) * TAU, orbitSpeed: 1.5 * dir, orbitBase: 60, orbitAmp: 150, telegraph: 0.6, active: 5, x: ctx.boss.x, y: ctx.boss.y });
              }
            },
          },
        ],
        2,
      );
    case 'arcane-laser-grid':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              const a = ctx.arena;
              const jitter = rand(-18, 18);
              for (const k of [-1, 0, 1]) {
                ctx.hazards.add({ kind: 'beam', color: ctx.color, x: a.cx - a.rx, y: a.cy + k * a.ry * 0.55 + jitter, angle: 0, length: a.rx * 2, r: 9, telegraph: 1.1, active: 0.5 });
              }
              for (const k of [-1, 1]) {
                ctx.hazards.add({ kind: 'beam', color: ctx.color, x: a.cx + k * a.rx * 0.45 + jitter, y: a.cy - a.ry, angle: Math.PI / 2, length: a.ry * 2, r: 9, telegraph: 1.1, active: 0.5 });
              }
            },
          },
        ],
        1.7,
      );
    case 'reality-rift':
      return timeline(
        [
          {
            at: 0,
            run: (ctx) => {
              for (let i = 0; i < 3; i++) {
                let p = ctx.arena.randomInsidePoint(Math.random, 0.8);
                // Never open a rift right on top of the phoenix.
                for (let tries = 0; tries < 6 && Math.hypot(p.x - ctx.playerX, p.y - ctx.playerY) < 100; tries++) {
                  p = ctx.arena.randomInsidePoint(Math.random, 0.8);
                }
                ctx.hazards.add({ kind: 'zone', color: ctx.color, x: p.x, y: p.y, r: 48, telegraph: 0.9, active: 4, period: 1.1, on: 0.35 });
              }
            },
          },
        ],
        1.6,
      );
  }
}
