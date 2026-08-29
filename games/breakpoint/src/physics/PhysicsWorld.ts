import {
  belowRestThreshold,
  cloneBall,
  createBall,
  forceRest,
  integrateOrientation,
  type BallBody,
} from './BallBody';
import { resolveBallCollision, timeOfImpact } from './BallCollision';
import { applyClothFriction } from './FrictionModel';
import {
  BALL_INERTIA,
  BALL_MASS,
  FIXED_DT,
  MAX_SHOT_SECONDS,
} from './PhysicsConstants';
import { capture, findCapture } from './PocketPhysics';
import {
  depenetrateJaw,
  depenetrateRail,
  jawTimeOfImpact,
  railGap,
  railTimeOfImpact,
  resolveJawCollision,
  resolveRailCollision,
  withinRailSpan,
} from './RailCollision';
import { createTable, type Pocket, type TableGeometry } from './TableGeometry';
import type { Vec2 } from './Vec';

/**
 * The simulation.
 *
 * Two properties are load-bearing and are each covered by a regression test:
 *
 *  1. **Fixed timestep.** `step()` always advances exactly FIXED_DT (1/120 s).
 *     The renderer calls it in a fixed-step accumulator loop, so a 30 fps
 *     machine and a 144 fps machine produce bit-identical results.
 *
 *  2. **Continuous collision within the step.** A step is not integrated in one
 *     go. The world repeatedly finds the *earliest* contact in the remaining
 *     time, advances everything exactly to it, resolves it, and continues. A
 *     ball at break speed covers ~10 cm per step — nearly two ball diameters —
 *     so integrating blindly would let it pass through another ball. Cutting
 *     the step at the contact makes tunnelling impossible rather than unlikely.
 *
 * There is no randomness anywhere. Identical inputs give identical outputs.
 */

export type SimEvent =
  | { type: 'ball-ball'; time: number; a: number; b: number; impulse: number; at: Vec2 }
  | { type: 'rail'; time: number; ball: number; rail: string; impulse: number; at: Vec2 }
  | { type: 'jaw'; time: number; ball: number; jaw: string; impulse: number; at: Vec2 }
  | { type: 'pocket'; time: number; ball: number; pocket: string; at: Vec2 }
  | { type: 'rest'; time: number };

/** Cap on contact resolutions inside one 1/120 s step. */
const MAX_SUBSTEPS = 48;
/** Sub-step times below this are treated as zero to avoid a stall loop. */
const TIME_EPSILON = 1e-9;

/** Stable identity for a contact, used to retire inert ones within a step. */
function contactKey(c: Contact): string {
  return `${c.kind}:${c.a}:${c.b}:${c.railIndex}`;
}

interface Contact {
  time: number;
  kind: 'ball' | 'rail' | 'jaw';
  a: number;
  b: number;
  railIndex: number;
}

export class PhysicsWorld {
  readonly table: TableGeometry;
  readonly balls: BallBody[] = [];
  /** Simulated seconds since the world was created. */
  time = 0;
  /** Events produced since `clearEvents()`. Drained each frame by game code. */
  readonly events: SimEvent[] = [];
  /** Set if a non-finite state was ever detected and quarantined. */
  corrupted = false;

  /** Contacts retired for the current step; see `step()`. */
  private readonly inert = new Set<string>();

  constructor(table: TableGeometry = createTable()) {
    this.table = table;
  }

  addBall(number: number, position: Vec2): BallBody {
    const ball = createBall(this.balls.length, number, position);
    this.balls.push(ball);
    return ball;
  }

  get cueBall(): BallBody | undefined {
    return this.balls.find((b) => b.number === 0);
  }

  clearEvents(): void {
    this.events.length = 0;
  }

  /** True when nothing is moving — the shot is over and input can reopen. */
  isSettled(): boolean {
    return this.balls.every((b) => b.pocketed || b.resting);
  }

  /** Total kinetic energy, translational + rotational. */
  totalEnergy(): number {
    let e = 0;
    for (const b of this.balls) {
      if (b.pocketed) continue;
      const v2 = b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y;
      const w2 = b.spin.x * b.spin.x + b.spin.y * b.spin.y + b.spin.z * b.spin.z;
      e += 0.5 * BALL_MASS * v2 + 0.5 * BALL_INERTIA * w2;
    }
    return e;
  }

  snapshot(): BallBody[] {
    return this.balls.map(cloneBall);
  }

  restore(snapshot: readonly BallBody[]): void {
    this.balls.length = 0;
    for (const b of snapshot) this.balls.push(cloneBall(b));
  }

  /** Advance exactly one fixed timestep. */
  step(): void {
    let remaining = FIXED_DT;
    this.inert.clear();

    for (let iter = 0; iter < MAX_SUBSTEPS && remaining > TIME_EPSILON; iter++) {
      const contact = this.findEarliestContact(remaining);
      const dt = contact ? Math.max(contact.time, 0) : remaining;

      if (dt > TIME_EPSILON) this.integrate(dt);
      remaining -= dt;

      if (!contact) break;

      // A contact that produces no impulse is *inert*: geometrically touching,
      // but not actually approaching once the contact point's own motion is
      // taken into account (a ball with heavy draw held against a cushion is
      // the usual case). Left in the candidate set it would be re-detected at
      // t = 0 for the rest of the step and the loop would spin without
      // advancing time — the balls would appear to freeze mid-table. Retiring
      // it for the remainder of this step is what guarantees forward progress.
      if (this.resolve(contact) <= 0) this.inert.add(contactKey(contact));
    }

    this.depenetrate();
    this.time += FIXED_DT;
    this.settleBalls();
    this.sanitize();
  }

  /**
   * Run to completion and return how long the shot took.
   *
   * Used by the regression suite and by the shot recorder; the interactive game
   * steps frame by frame so the player can watch.
   */
  simulateToRest(maxSeconds = MAX_SHOT_SECONDS): number {
    const start = this.time;
    const limit = Math.ceil(maxSeconds / FIXED_DT);
    for (let i = 0; i < limit && !this.isSettled(); i++) this.step();
    return this.time - start;
  }

  // ---------------------------------------------------------------- internals

  /**
   * Integrate positions by `dt` at the current velocities — which is exactly
   * the assumption the time-of-impact solver made — then apply cloth friction
   * and roll the render orientation forward.
   */
  private integrate(dt: number): void {
    for (const b of this.balls) {
      if (b.pocketed || b.resting) continue;
      const px = b.position.x;
      const py = b.position.y;
      b.position.x = px + b.velocity.x * dt;
      b.position.y = py + b.velocity.y * dt;

      const pocket = this.sweptCapture(b, px, py);
      if (pocket) {
        capture(b, pocket);
        this.events.push({
          type: 'pocket',
          time: this.time,
          ball: b.id,
          pocket: pocket.id,
          at: { x: pocket.centre.x, y: pocket.centre.y },
        });
        continue;
      }

      applyClothFriction(b, dt);
      integrateOrientation(b, dt);
    }
  }

  /**
   * Capture test swept along the ball's path this sub-step.
   *
   * A point test would let a ball moving 12 m/s skip straight over a 5.7 cm
   * capture disc, so the test is against the closest approach of the segment
   * the ball actually travelled.
   */
  private sweptCapture(b: BallBody, fromX: number, fromY: number): Pocket | null {
    const dx = b.position.x - fromX;
    const dy = b.position.y - fromY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-14) return findCapture(b, this.table);

    for (const pocket of this.table.pockets) {
      const t = Math.max(
        0,
        Math.min(1, ((pocket.centre.x - fromX) * dx + (pocket.centre.y - fromY) * dy) / lenSq),
      );
      const cx = fromX + dx * t - pocket.centre.x;
      const cy = fromY + dy * t - pocket.centre.y;
      if (cx * cx + cy * cy <= pocket.captureRadius * pocket.captureRadius) return pocket;
    }
    return null;
  }

  /**
   * Earliest contact in (0, limit], scanning in a fixed order so that ties
   * always resolve the same way. Determinism depends on this ordering.
   */
  private findEarliestContact(limit: number): Contact | null {
    let best: Contact | null = null;
    const take = (c: Contact) => {
      if (this.inert.has(contactKey(c))) return;
      if (!best || c.time < best.time) best = c;
    };

    const n = this.balls.length;
    for (let i = 0; i < n; i++) {
      const a = this.balls[i];
      if (a.pocketed) continue;

      for (let j = i + 1; j < n; j++) {
        const b = this.balls[j];
        if (b.pocketed) continue;
        if (a.resting && b.resting) continue;
        const t = timeOfImpact(a, b, limit);
        if (t !== null) take({ time: t, kind: 'ball', a: i, b: j, railIndex: -1 });
      }

      if (a.resting) continue;

      for (let r = 0; r < this.table.rails.length; r++) {
        const t = railTimeOfImpact(a, this.table.rails[r], limit);
        if (t !== null) take({ time: t, kind: 'rail', a: i, b: -1, railIndex: r });
      }
      for (let k = 0; k < this.table.jaws.length; k++) {
        const t = jawTimeOfImpact(a, this.table.jaws[k], limit);
        if (t !== null) take({ time: t, kind: 'jaw', a: i, b: -1, railIndex: k });
      }
    }

    return best;
  }

  private resolve(c: Contact): number {
    if (c.kind === 'ball') {
      const a = this.balls[c.a];
      const b = this.balls[c.b];
      const impulse = resolveBallCollision(a, b);
      if (impulse > 0) {
        this.events.push({
          type: 'ball-ball',
          time: this.time,
          a: a.id,
          b: b.id,
          impulse,
          at: { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 },
        });
      }
      return impulse;
    }

    const ball = this.balls[c.a];
    if (c.kind === 'rail') {
      const rail = this.table.rails[c.railIndex];
      const impulse = resolveRailCollision(ball, rail);
      if (impulse > 0) {
        this.events.push({
          type: 'rail',
          time: this.time,
          ball: ball.id,
          rail: rail.id,
          impulse,
          at: { x: ball.position.x, y: ball.position.y },
        });
      }
      return impulse;
    }

    const jaw = this.table.jaws[c.railIndex];
    const impulse = resolveJawCollision(ball, jaw);
    if (impulse > 0) {
      this.events.push({
        type: 'jaw',
        time: this.time,
        ball: ball.id,
        jaw: jaw.id,
        impulse,
        at: { x: ball.position.x, y: ball.position.y },
      });
    }
    return impulse;
  }

  /**
   * Position-only escape hatch: push any ball that has ended the step inside a
   * cushion or a jaw back to the surface.
   *
   * This is the safety net for inert contacts. A ball the impulse solver
   * declined to act on keeps its inward velocity, so without this it would
   * creep through the rail over successive steps. Correcting position without
   * touching velocity cannot add energy, which is what keeps the "no energy
   * created" guarantee intact.
   */
  private depenetrate(): void {
    for (const ball of this.balls) {
      if (ball.pocketed) continue;
      for (const rail of this.table.rails) {
        if (railGap(ball, rail) < 0 && withinRailSpan(ball, rail)) depenetrateRail(ball, rail);
      }
      for (const jaw of this.table.jaws) depenetrateJaw(ball, jaw);
    }
  }

  /** Snap balls below the rest thresholds to exact zero, and emit 'rest' once. */
  private settleBalls(): void {
    const wasSettled = this.balls.every((b) => b.pocketed || b.resting);
    for (const b of this.balls) {
      if (b.pocketed || b.resting) continue;
      if (belowRestThreshold(b)) forceRest(b);
    }
    if (!wasSettled && this.isSettled()) {
      this.events.push({ type: 'rest', time: this.time });
    }
  }

  /**
   * The NaN/Infinity tripwire.
   *
   * Nothing in the model should produce a non-finite value — every
   * normalisation guards its divisor and every friction term is clamped — but a
   * physics core that silently poisons the whole table is far worse than one
   * that stops a single ball, so the state is checked every step and any bad
   * ball is frozen rather than allowed to spread NaN through a collision.
   */
  private sanitize(): void {
    for (const b of this.balls) {
      if (
        Number.isFinite(b.position.x) &&
        Number.isFinite(b.position.y) &&
        Number.isFinite(b.velocity.x) &&
        Number.isFinite(b.velocity.y) &&
        Number.isFinite(b.spin.x) &&
        Number.isFinite(b.spin.y) &&
        Number.isFinite(b.spin.z)
      ) {
        continue;
      }
      this.corrupted = true;
      if (!Number.isFinite(b.position.x)) b.position.x = 0;
      if (!Number.isFinite(b.position.y)) b.position.y = 0;
      forceRest(b);
    }
  }
}
