import type Phaser from 'phaser';

/**
 * Device-pixel handling.
 *
 * The canvas backing store is rendered at `RENDER_SCALE` device pixels per CSS
 * pixel (capped at 2 — beyond that the fill-rate cost buys nothing visible), and
 * the camera is zoomed by the same factor. The result: text and thin HUD lines
 * are crisp on retina screens while all gameplay code still works in a stable
 * CSS-pixel coordinate space (~390 x 844 on a modern phone).
 *
 * Every scene should therefore use `viewSize()` rather than `scene.scale.width`,
 * and `pointer.worldX/worldY` rather than `pointer.x/y`.
 */
export const RENDER_SCALE = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);

export interface ViewSize {
  w: number;
  h: number;
}

export function viewSize(scene: Phaser.Scene): ViewSize {
  return {
    w: scene.scale.width / RENDER_SCALE,
    h: scene.scale.height / RENDER_SCALE,
  };
}

/** Apply the zoom and re-centre so world (0,0) maps to the top-left pixel. */
export function applyCamera(scene: Phaser.Scene): ViewSize {
  const view = viewSize(scene);
  const cam = scene.cameras.main;
  cam.setZoom(RENDER_SCALE);
  cam.centerOn(view.w / 2, view.h / 2);
  return view;
}
