import { PHOENIX_FIRE, SCORING } from '../config/GameConfig';

/**
 * Seconds between Phoenix Fire bolts. Heat speeds it up: each multiplier step
 * above x1 fires PHOENIX_FIRE.heatRatePerStep faster, capped at heatRateMax.
 * The Time Shard's cooldown multiplier applies on top.
 */
export function phoenixFireInterval(multiplier: number, cooldownMul = 1): number {
  const steps = Math.max(0, (multiplier - 1) / SCORING.multiplierStep);
  const rate = 1 + Math.min(PHOENIX_FIRE.heatRateMax, steps * PHOENIX_FIRE.heatRatePerStep);
  return (PHOENIX_FIRE.interval * cooldownMul) / rate;
}
