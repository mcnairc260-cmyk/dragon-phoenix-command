import "server-only";

import { env } from "@/lib/server/env";

/**
 * Per-user sliding-window limiter for the AI endpoints.
 *
 * In-memory by design: a single-process deployment is the target, and an
 * in-memory window is honest about what it protects — the user's own API bill
 * and a runaway client loop, not a distributed attacker. Behind multiple
 * instances this becomes per-instance; swap the store for Redis at that point.
 * The seam is `hits`, and nothing else needs to change.
 */
const hits = new Map<string, number[]>();

/** Stops the map growing without bound in a long-lived process. */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, timestamps] of hits) {
    const live = timestamps.filter((t) => now - t < windowMs);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  max = env.AI_RATE_LIMIT_MAX,
  windowMs = env.AI_RATE_LIMIT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    hits.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, remaining: max - timestamps.length };
}

/** Test seam. Never called from application code. */
export function resetRateLimits() {
  hits.clear();
  lastSweep = 0;
}

export function describeRetryAfter(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `${minutes} minutes`;
  return `${Math.ceil(minutes / 60)} hours`;
}
