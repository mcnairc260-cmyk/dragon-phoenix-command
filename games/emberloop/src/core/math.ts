/** Small maths helpers. Framework-free so tests can use them directly. */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential approach.
 * `rate` is roughly "how many e-folds per second"; dt in seconds.
 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

export function angleDelta(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** True when two circles overlap. Cheaper than distance() — no sqrt. */
export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function randRange(min: number, max: number, rng: () => number = Math.random): number {
  return min + rng() * (max - min);
}

export function pickOne<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}
