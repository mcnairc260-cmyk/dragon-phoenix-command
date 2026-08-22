/**
 * Seedable RNG (mulberry32). The game itself runs on Math.random, but every
 * function that takes randomness accepts an injected `() => number` so unit
 * tests can drive it deterministically.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Weighted pick without replacement helper: given items with weights, return the
 * index chosen by `roll` (0..1). Returns -1 when total weight is zero.
 */
export function weightedIndex(weights: readonly number[], roll: number): number {
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0) return -1;
  let target = roll * total;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    target -= w;
    if (target < 0) return i;
  }
  // Floating-point safety: fall back to the last item with weight.
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return -1;
}
