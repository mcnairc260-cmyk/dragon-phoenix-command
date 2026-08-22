/**
 * Reads the CSS safe-area insets so the canvas HUD can avoid notches and the
 * home indicator. CSS `env()` is not readable from JS directly, so we measure a
 * hidden probe element that has the insets applied as padding.
 */

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let probe: HTMLElement | null = null;
const cached: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

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

export function measureSafeArea(): SafeArea {
  const style = getComputedStyle(ensureProbe());
  cached.top = parseFloat(style.paddingTop) || 0;
  cached.right = parseFloat(style.paddingRight) || 0;
  cached.bottom = parseFloat(style.paddingBottom) || 0;
  cached.left = parseFloat(style.paddingLeft) || 0;
  return cached;
}

export function safeArea(): SafeArea {
  return cached;
}
