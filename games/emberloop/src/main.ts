import Phaser from 'phaser';
import './style.css';
import { session } from './core/Session';
import { RENDER_SCALE } from './core/viewport';
import { BRAND_CSS } from './config/brand';
import { VIEWPORT_EVENT, measureSafeArea, stageHeight } from './core/safeArea';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { TitleScene } from './scenes/TitleScene';
import { audio } from './systems/AudioEngine';
import { Ui } from './ui/Ui';
import { Capacitor } from '@capacitor/core';

const ui = new Ui();
session.init(ui);
measureSafeArea();

const gameRoot = document.getElementById('game-root') as HTMLElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

/**
 * On a phone the game owns the entire viewport. On a desktop landscape window a
 * full-width canvas would be an unplayable letterbox, so we frame a portrait
 * "phone" instead of stretching the design.
 */
function computeViewport(): { width: number; height: number; landscapePhone: boolean } {
  const w = window.innerWidth;
  // Normally innerHeight; the full screen on iPhone Home Screen apps that report a short viewport.
  const h = stageHeight();
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const landscape = w > h;

  if (landscape && !coarse) {
    // 9:19.5 — the aspect the game is designed around.
    return { width: Math.min(w, Math.round(h * 0.462)), height: h, landscapePhone: false };
  }
  return { width: w, height: h, landscapePhone: landscape && coarse };
}

function applyViewport(): void {
  const { width, height, landscapePhone } = computeViewport();
  for (const el of [gameRoot, uiRoot]) {
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = '50%';
    el.style.right = 'auto';
    el.style.transform = 'translateX(-50%)';
  }
  ui.setRotateVisible(landscapePhone);
  measureSafeArea();
  if (game) {
    // The canvas backing store runs at device resolution; scenes divide by
    // RENDER_SCALE to stay in CSS-pixel space.
    game.scale.resize(width * RENDER_SCALE, height * RENDER_SCALE);
    game.scale.setZoom(1 / RENDER_SCALE);
  }
  // DOM layouts that depend on the insets (the main menu art) re-fit on this.
  window.dispatchEvent(new Event(VIEWPORT_EVENT));
}

const initial = computeViewport();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: BRAND_CSS.voidBlack,
  width: initial.width * RENDER_SCALE,
  height: initial.height * RENDER_SCALE,
  zoom: 1 / RENDER_SCALE,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
    // The whole aesthetic is additive glow; premultiplied alpha keeps it clean.
    premultipliedAlpha: true,
  },
  input: {
    activePointers: 2,
  },
  fps: { target: 60, forceSetTimeOut: false },
  scene: [BootScene, TitleScene, GameScene],
});

applyViewport();

window.addEventListener('resize', applyViewport);
window.addEventListener('orientationchange', () => {
  // iOS reports stale dimensions immediately after the rotation event.
  window.setTimeout(applyViewport, 150);
});
// A Home Screen app can report its insets late, without a resize event, so
// check again once the page has settled and whenever it comes back.
window.visualViewport?.addEventListener('resize', applyViewport);
window.addEventListener('pageshow', applyViewport);
window.addEventListener('load', () => {
  for (const delay of [250, 1000]) window.setTimeout(applyViewport, delay);
});

/* Belt-and-braces gesture blocking: CSS handles most of it, but iOS Safari
   still fires these for pinch-zoom and double-tap zoom. */
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('touchmove', (event) => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false });
document.addEventListener('dblclick', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());

// Pause audio when the tab is hidden; the scenes handle pausing the run itself.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else {
    if (!ui.panelOpen) audio.resume();
    applyViewport();
  }
});

if (session.debug) {
  // Development-only bridge: lets automated playtests inspect live run state.
  // Never exposed without ?debug=1 (or a dev build).
  (window as unknown as Record<string, unknown>).__EMBERLOOP__ = { game, session };

  // FPS readout, sampled a few times a second across every scene.
  ui.setFpsVisible(true);
  let last = 0;
  const sampleFps = (now: number) => {
    if (now - last > 250) {
      last = now;
      ui.setFps(game.loop.actualFps);
    }
    requestAnimationFrame(sampleFps);
  };
  requestAnimationFrame(sampleFps);
}

// Skipped in the native iPhone app: the game ships inside the app, so it is already offline.
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    // sw.js is copied verbatim from public/ and sits next to index.html.
    const swUrl = new URL('sw.js', window.location.href).href;
    navigator.serviceWorker
      .register(swUrl, { scope: './', updateViaCache: 'none' })
      .then((registration) => {
        // A Home Screen app is usually resumed, not reopened, so look for a new
        // deploy whenever it comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
        });
      })
      .catch(() => {
        // Offline support is a bonus, never a requirement to play.
      });
  });

  // When a new version takes over, reload into it, but never in the middle of a run.
  const hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !game.scene.isActive('Game')) window.location.reload();
  });
}
