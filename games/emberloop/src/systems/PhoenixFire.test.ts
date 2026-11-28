import { describe, expect, it } from 'vitest';
import { PHOENIX_FIRE, SCORING } from '../config/GameConfig';
import { phoenixFireInterval } from './PhoenixFire';

describe('phoenixFireInterval', () => {
  it('fires at the base interval with no Heat', () => {
    expect(phoenixFireInterval(1)).toBeCloseTo(PHOENIX_FIRE.interval);
  });

  it('fires faster as Heat rises', () => {
    const one = phoenixFireInterval(1 + SCORING.multiplierStep);
    expect(one).toBeLessThan(PHOENIX_FIRE.interval);
    expect(one).toBeCloseTo(PHOENIX_FIRE.interval / (1 + PHOENIX_FIRE.heatRatePerStep));
  });

  it('caps the Heat bonus', () => {
    expect(phoenixFireInterval(99)).toBeCloseTo(PHOENIX_FIRE.interval / (1 + PHOENIX_FIRE.heatRateMax));
  });

  it('applies the Time Shard cooldown multiplier', () => {
    expect(phoenixFireInterval(1, 0.8)).toBeCloseTo(PHOENIX_FIRE.interval * 0.8);
  });

  it('never fires faster than the cap allows, even below x1', () => {
    expect(phoenixFireInterval(0.5)).toBeCloseTo(PHOENIX_FIRE.interval);
  });
});
