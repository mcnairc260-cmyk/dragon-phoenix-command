/**
 * Reads the CSS safe-area insets so the canvas HUD can avoid notches and the
 * home indicator. CSS `env()` is not readable from JS directly, so we measure a
 * hidden probe element that has the insets applied as padding.
 *
 * It also repairs a fault seen on an iPhone 17 Pro Max Home Screen web app
 * (founder screenshot, 2026-11-25): the page still draws under the status bar,
 * but the viewport is one status bar shorter than the screen and the top inset
 * reads 0. The result is the top of the page under the Dynamic Island and an
 * unused black band at the bottom. Public WebKit reports describe the same
 * kind of iOS 26 regression (an inset-top of 0, a short 100vh in standalone
 * web apps). When the fault is present, `stageHeight()` gives the full screen
 * height and the top inset is at least the missing height.
 */

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let probe: HTMLElement | null = null;
const cached: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

/** Fired on `window` after the game re-sizes itself or re-reads the insets. */
export const VIEWPORT_EVENT = 'emberloop:viewport';

/** The largest status bar on any iPhone is about 62 CSS px; a bigger gap is something else. */
const MAX_STATUS_BAR = 80;

function ensureProbe(): HTMLElement {
  if (probe) return probe;
  probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'padding-top:env(safe-area-inset-top, 0px)',
    'padding-right:env(safe-area-inset-right, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)',
    'padding-left:env(safe-area-inset-left, 0px)',
  ].join(';');
  document.body.appendChild(probe);
  return probe;
}

/** An iPhone Home Screen web app (not a Safari tab, not the native app). */
function iphoneStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true && /iPhone/.test(navigator.userAgent);
}

/**
 * CSS px the viewport is short of the screen in an iPhone Home Screen web app
 * held upright, or 0. A Home Screen app owns the whole screen, so any short
 * fall is the fault described above. Safari tabs are never touched: there the
 * browser bars really do take space.
 */
export function viewportShortfall(): number {
  if (!iphoneStandalone()) return 0;
  if (window.innerWidth > window.innerHeight) return 0;
  // iOS reports the screen in portrait whatever the rotation.
  const full = Math.max(window.screen.width, window.screen.height);
  const gap = Math.round(full - window.innerHeight);
  return gap > 0 && gap <= MAX_STATUS_BAR ? gap : 0;
}

/** The height the game should fill: the viewport, or the full screen when the fault is present. */
export function stageHeight(): number {
  return window.innerHeight + viewportShortfall();
}

export function measureSafeArea(): SafeArea {
  const style = getComputedStyle(ensureProbe());
  const envTop = parseFloat(style.paddingTop) || 0;
  const repairTop = viewportShortfall();
  cached.top = Math.max(envTop, repairTop);
  cached.right = parseFloat(style.paddingRight) || 0;
  cached.bottom = parseFloat(style.paddingBottom) || 0;
  cached.left = parseFloat(style.paddingLeft) || 0;

  // Keep the CSS layer (panels, toasts, menu) in step. Only override the
  // live env() value when the repair is in force, so the normal path is unchanged.
  const root = document.documentElement.style;
  if (repairTop > envTop) root.setProperty('--safe-top', `${cached.top}px`);
  else root.removeProperty('--safe-top');
  return cached;
}

export function safeArea(): SafeArea {
  return cached;
}
