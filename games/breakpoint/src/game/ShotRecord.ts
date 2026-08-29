import { cloneBall, type BallBody } from '../physics/BallBody';
import type { SimEvent } from '../physics/PhysicsWorld';
import type { Vec2, Vec3 } from '../physics/Vec';

/**
 * The complete, replayable description of one shot.
 *
 * Everything Phase 2 and beyond needs is derived from this and nothing else:
 * rules need the first contact, the rail contacts and the scratch flag; the AI
 * needs the pre-shot state and the parameters that produced the outcome;
 * replay and multiplayer need the pre-shot state plus the strike, because the
 * simulation is deterministic and will reproduce the rest exactly.
 *
 * Being a plain data object is deliberate — `JSON.stringify` on one of these is
 * a complete, portable shot.
 */

export interface BallSnapshot {
  id: number;
  number: number;
  position: Vec2;
  velocity: Vec2;
  spin: Vec3;
  pocketed: boolean;
  pocketId: string | null;
}

export interface ShotRecord {
  /** Monotonic index within the session. */
  index: number;
  /** Wall-clock time the shot was committed, for ordering across sessions. */
  timestamp: number;

  // --- inputs -------------------------------------------------------------
  preShotBalls: BallSnapshot[];
  cueBallPosition: Vec2;
  /** Aim heading in radians, measured from +x. */
  aimAngle: number;
  /** Normalised power the player dialled in, 0..1. */
  power: number;
  /** Cue tip contact point in ball radii: x right of centre, y above centre. */
  cueContactPoint: Vec2;

  // --- what the strike actually produced -----------------------------------
  impulse: {
    velocity: Vec2;
    spin: Vec3;
    speed: number;
  };

  // --- what happened -------------------------------------------------------
  events: SimEvent[];
  /** Ball numbers pocketed, in the order they dropped. */
  ballsPocketed: number[];
  /** Pocket ids, parallel to `ballsPocketed`. */
  pocketsUsed: string[];
  /** Rail ids contacted, in order, with duplicates preserved. */
  railContacts: string[];
  /** Number of the first object ball the cue ball touched, or null. */
  firstObjectBallContact: number | null;
  /** True if the cue ball was pocketed. */
  scratch: boolean;
  postShotBalls: BallSnapshot[];
  /** Simulated seconds from strike to the last ball stopping. */
  durationSeconds: number;
  /** Simulation steps consumed. Determinism checks compare this too. */
  steps: number;
}

export function snapshotBall(b: BallBody): BallSnapshot {
  const c = cloneBall(b);
  return {
    id: c.id,
    number: c.number,
    position: c.position,
    velocity: c.velocity,
    spin: c.spin,
    pocketed: c.pocketed,
    pocketId: c.pocketId,
  };
}

/**
 * Reduce a raw event stream into the summary fields.
 *
 * `cueBallId` is needed because "first object ball contact" is specifically the
 * cue ball's first contact — object balls hitting each other during a break do
 * not count, and getting that wrong would quietly break every rules variant
 * built on top of this later.
 */
export function summariseEvents(
  events: readonly SimEvent[],
  cueBallId: number,
  ballNumberById: (id: number) => number,
) {
  const ballsPocketed: number[] = [];
  const pocketsUsed: string[] = [];
  const railContacts: string[] = [];
  let firstObjectBallContact: number | null = null;
  let scratch = false;

  for (const e of events) {
    switch (e.type) {
      case 'ball-ball':
        if (firstObjectBallContact === null) {
          if (e.a === cueBallId) firstObjectBallContact = ballNumberById(e.b);
          else if (e.b === cueBallId) firstObjectBallContact = ballNumberById(e.a);
        }
        break;
      case 'rail':
        railContacts.push(e.rail);
        break;
      case 'pocket':
        ballsPocketed.push(ballNumberById(e.ball));
        pocketsUsed.push(e.pocket);
        if (e.ball === cueBallId) scratch = true;
        break;
      case 'jaw':
      case 'rest':
        break;
    }
  }

  return { ballsPocketed, pocketsUsed, railContacts, firstObjectBallContact, scratch };
}
