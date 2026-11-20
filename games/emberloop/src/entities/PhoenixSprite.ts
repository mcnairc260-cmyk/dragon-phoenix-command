import Phaser from 'phaser';
import { clamp, damp } from '../core/math';
import bodyUrl from '../assets/phoenix-body.png';
import wingLeftUrl from '../assets/phoenix-wing-left.png';
import wingRightUrl from '../assets/phoenix-wing-right.png';

/**
 * The founder-supplied phoenix illustration, cut into three layers by
 * scripts/make-phoenix-layers.py so the wings can beat around their shoulders.
 * The art is a three-quarter view, so it stays upright: it mirrors to face the
 * direction of travel and banks into turns instead of spinning.
 */
export const PHOENIX_TEX = {
  body: 'phoenix-body',
  wingLeft: 'phoenix-wing-left',
  wingRight: 'phoenix-wing-right',
} as const;

// Texture-space points (280 x 256), printed by scripts/make-phoenix-layers.py.
const TEX_W = 280;
const TEX_H = 256;
const ANCHOR = { x: 168.6, y: 119.5 }; // torso centre = gameplay position
const LEFT_PIVOT = { x: 147.3, y: 106.7 };
const RIGHT_PIVOT = { x: 202.7, y: 102.4 };

/** On-screen size: ~95 CSS px wingspan. */
const BASE_SCALE = 0.34;

export function loadPhoenixTextures(scene: Phaser.Scene): void {
  scene.load.image(PHOENIX_TEX.body, bodyUrl);
  scene.load.image(PHOENIX_TEX.wingLeft, wingLeftUrl);
  scene.load.image(PHOENIX_TEX.wingRight, wingRightUrl);
}

export class PhoenixSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly wingNear: Phaser.GameObjects.Image;
  private readonly wingFar: Phaser.GameObjects.Image;

  private phase = 0;
  private facing = 1; // +1 = head to the right (as drawn), -1 = mirrored
  private turn = 1; // eased toward `facing`; passing through 0 reads as a turn
  private bank = 0;
  private size = 1;

  reducedMotion = false;

  constructor(scene: Phaser.Scene, depth: number) {
    const layer = (key: string, pivot: { x: number; y: number }) =>
      scene.add
        .image(pivot.x - ANCHOR.x, pivot.y - ANCHOR.y, key)
        .setOrigin(pivot.x / TEX_W, pivot.y / TEX_H);

    this.wingFar = layer(PHOENIX_TEX.wingRight, RIGHT_PIVOT);
    this.wingNear = layer(PHOENIX_TEX.wingLeft, LEFT_PIVOT);
    this.body = layer(PHOENIX_TEX.body, ANCHOR);
    // Both wings sit behind the body, whose opaque edge hides the shoulder cuts.
    this.container = scene.add.container(0, 0, [this.wingFar, this.wingNear, this.body]).setDepth(depth);
  }

  setSize(size: number): this {
    this.size = size;
    return this;
  }

  /**
   * Advance the animation.
   * @param vx,vy current velocity (px/s); @param effort 0..1 how hard it is flying.
   */
  update(dt: number, x: number, y: number, vx: number, vy: number, effort: number): void {
    const e = clamp(effort, 0, 1);

    // Wing-beat: slow glide strokes at rest, quicker and deeper when pushing.
    const hz = this.reducedMotion ? 1.1 : 1.6 + 2.6 * e;
    const amp = this.reducedMotion ? 0.06 : 0.13 + 0.11 * e;
    this.phase += dt * hz * Math.PI * 2;
    // Fast downstroke, slower recovery: a skewed sine reads as real flight.
    const s = Math.sin(this.phase + 0.35 * Math.sin(this.phase));
    const wing = s * amp; // > 0 = wings up

    // Rotation is applied after the container's mirror, so the same signs work both ways.
    this.wingNear.setRotation(wing);
    this.wingFar.setRotation(-wing * 0.85);
    // Downstroke lifts the body a touch; the far wing foreshortens as it sweeps.
    const lift = this.reducedMotion ? 0 : -s * 2.2;
    this.wingFar.setScale(1, 1 - Math.max(0, -s) * 0.06);

    // Face the direction of travel, with hysteresis so hovering never flickers.
    if (vx > 40) this.facing = 1;
    else if (vx < -40) this.facing = -1;
    this.turn = damp(this.turn, this.facing, 14, dt);

    // Bank into horizontal motion; nose up when climbing, down when diving.
    const targetBank = clamp(vx / 430, -1, 1) * 0.22 + clamp(vy / 430, -1, 1) * 0.08 * this.facing;
    this.bank = damp(this.bank, this.reducedMotion ? targetBank * 0.5 : targetBank, 8, dt);

    const scale = BASE_SCALE * this.size;
    this.container
      .setPosition(x, y + lift)
      .setRotation(this.bank)
      .setScale(scale * this.turn, scale);
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
  }
}
