import * as THREE from 'three';
import { BALL_RADIUS } from '../physics/PhysicsConstants';
import type { TableGeometry } from '../physics/TableGeometry';
import type { Vec2 } from '../physics/Vec';
import { clamp } from '../physics/Vec';

/**
 * The camera.
 *
 * Two framings, smoothly blended:
 *
 *  • AIMING — behind the cue ball, looking down the shot. This is what makes
 *    aiming legible: the aim line runs away from the viewer, so a small change
 *    in angle is a visible change on screen. A top-down view would make aiming
 *    precise but flat, and a fixed 3/4 view makes the player do the mental
 *    rotation on every shot.
 *
 *  • WATCHING — pulled up and back to take in the whole table while the balls
 *    run, then eased back down for the next shot. That transition is doing the
 *    cinematic work; nothing else needs to move.
 *
 * Elevation is a player control because the right height genuinely differs
 * between a long straight pot (low, down the line) and a positional shot where
 * you need to see the whole table (high).
 */

const MIN_ELEVATION = 0.16;
const MAX_ELEVATION = 1.25;
const MIN_DISTANCE = 0.45;
const MAX_DISTANCE = 1.5;

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;

  /** Elevation of the aiming camera, in radians above the cloth. */
  elevation = 0.52;
  /** Distance behind the cue ball, in metres. */
  distance = 1.02;
  /** 0 = fully aiming, 1 = fully pulled back to watch. */
  private blend = 0;

  private readonly position = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private initialised = false;

  constructor(private readonly table: TableGeometry, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.02, 60);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  adjustElevation(delta: number): void {
    this.elevation = clamp(this.elevation + delta, MIN_ELEVATION, MAX_ELEVATION);
  }

  adjustDistance(factor: number): void {
    this.distance = clamp(this.distance * factor, MIN_DISTANCE, MAX_DISTANCE);
  }

  /**
   * Advance the camera one frame.
   *
   * `watching` drives the blend rather than setting the pose directly, so the
   * camera keeps easing even when the shot ends mid-transition — it never snaps.
   */
  update(cueBall: Vec2, aimAngle: number, watching: boolean, dt: number): void {
    const targetBlend = watching ? 1 : 0;
    // Frame-rate independent easing; the camera is presentation only, so unlike
    // the simulation it is free to depend on wall-clock time.
    const k = 1 - Math.exp(-dt * (watching ? 2.4 : 3.6));
    this.blend += (targetBlend - this.blend) * k;

    const aimPose = this.aimingPose(cueBall, aimAngle);
    const watchPose = this.watchingPose();

    const desiredPos = aimPose.position.lerp(watchPose.position, this.blend);
    const desiredTarget = aimPose.target.lerp(watchPose.target, this.blend);

    if (!this.initialised) {
      this.position.copy(desiredPos);
      this.target.copy(desiredTarget);
      this.initialised = true;
    } else {
      const follow = 1 - Math.exp(-dt * 9);
      this.position.lerp(desiredPos, follow);
      this.target.lerp(desiredTarget, follow);
    }

    this.camera.position.copy(this.position);
    this.camera.lookAt(this.target);
  }

  /** Snap to the current pose — used on the first frame and after a reset. */
  reset(): void {
    this.initialised = false;
    this.blend = 0;
  }

  private aimingPose(cueBall: Vec2, aimAngle: number) {
    const dirX = Math.cos(aimAngle);
    const dirY = Math.sin(aimAngle);
    const back = this.distance * Math.cos(this.elevation);
    const up = this.distance * Math.sin(this.elevation);

    const position = new THREE.Vector3(
      cueBall.x - dirX * back,
      BALL_RADIUS + up,
      -(cueBall.y - dirY * back),
    );
    // Look a little ahead of the ball rather than at it, so the aim line has
    // room on screen instead of running off the bottom edge.
    const lookAhead = 0.42;
    const target = new THREE.Vector3(
      cueBall.x + dirX * lookAhead,
      BALL_RADIUS,
      -(cueBall.y + dirY * lookAhead),
    );

    // Never let the camera drop below the rail cap or clip through the table.
    position.y = Math.max(position.y, 0.14);
    return { position, target };
  }

  private watchingPose() {
    // High and square-on, far enough back that the whole table plus a margin of
    // rail fits the frame at the widest aspect ratios a phone will produce.
    return {
      position: new THREE.Vector3(0, this.table.length * 0.66, this.table.width * 1.15),
      target: new THREE.Vector3(0, 0, 0),
    };
  }
}
