import type { BallBody } from './BallBody';
import type { Pocket, TableGeometry } from './TableGeometry';

/**
 * Pocket capture.
 *
 * Capture is deliberately *only* a proximity test against a point set back
 * inside the throat. Everything that makes pocketing feel earned — clipping a
 * jaw, rattling between the two jaws, hanging in the mouth and rolling back
 * out — is produced by the jaw circles in `RailCollision`, not by special-cased
 * rules here. A ball rejects because it genuinely bounced off a jaw and lost
 * the line, which is why rejection looks right instead of scripted.
 */

export interface PocketCapture {
  ball: BallBody;
  pocket: Pocket;
}

/** The pocket this ball has dropped into, or null. */
export function findCapture(ball: BallBody, table: TableGeometry): Pocket | null {
  if (ball.pocketed) return null;
  for (const pocket of table.pockets) {
    const dx = ball.position.x - pocket.centre.x;
    const dy = ball.position.y - pocket.centre.y;
    if (dx * dx + dy * dy <= pocket.captureRadius * pocket.captureRadius) {
      return pocket;
    }
  }
  return null;
}

/** Remove a ball from play. Its state freezes at the moment of capture. */
export function capture(ball: BallBody, pocket: Pocket): void {
  ball.pocketed = true;
  ball.pocketId = pocket.id;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.spin.x = 0;
  ball.spin.y = 0;
  ball.spin.z = 0;
  ball.resting = true;
}

/**
 * Is this ball outside the rectangle the cushions enclose?
 *
 * Only reachable through a pocket mouth, so it means "in the throat". Used to
 * suppress cushion collisions for a ball that is already on its way down, and
 * as the escape hatch that stops a ball wedged behind the geometry from
 * bouncing forever.
 */
export function isInPocketThroat(ball: BallBody, table: TableGeometry): boolean {
  return (
    Math.abs(ball.position.x) > table.length / 2 || Math.abs(ball.position.y) > table.width / 2
  );
}
