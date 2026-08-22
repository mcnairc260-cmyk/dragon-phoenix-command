import { describe, expect, it } from 'vitest';
import { SCORING } from '../config/GameConfig';
import {
  addPoints,
  breakCombo,
  createScoreState,
  heatFraction,
  isAscended,
  multiplierForCombo,
  scoreEmber,
  scoreKill,
  scoreNearMiss,
  scoreTime,
  tickCombo,
} from './Scoring';

describe('multiplierForCombo', () => {
  it('starts at 1x and steps every comboPerStep', () => {
    expect(multiplierForCombo(0)).toBe(1);
    expect(multiplierForCombo(SCORING.comboPerStep - 1)).toBe(1);
    expect(multiplierForCombo(SCORING.comboPerStep)).toBe(1 + SCORING.multiplierStep);
    expect(multiplierForCombo(SCORING.comboPerStep * 2)).toBe(1 + SCORING.multiplierStep * 2);
  });

  it('caps at maxMultiplier', () => {
    expect(multiplierForCombo(10_000)).toBe(SCORING.maxMultiplier);
  });
});

describe('score accumulation', () => {
  it('multiplies points by the current multiplier', () => {
    const s = createScoreState();
    s.multiplier = 3;
    expect(addPoints(s, 10)).toBe(30);
    expect(s.score).toBe(30);
  });

  it('awards embers and raises the combo', () => {
    const s = createScoreState();
    scoreEmber(s);
    expect(s.embers).toBe(1);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(SCORING.emberScore);
  });

  it('applies ember value upgrades', () => {
    const s = createScoreState();
    scoreEmber(s, 2);
    expect(s.score).toBe(SCORING.emberScore * 2);
  });

  it('scales near-miss score with the near-miss multiplier', () => {
    const s = createScoreState();
    scoreNearMiss(s, 1.6);
    expect(s.score).toBe(Math.round(SCORING.nearMissScore * 1.6));
    expect(s.nearMisses).toBe(1);
  });

  it('reaches higher multipliers as the combo chains, boosting later points', () => {
    const s = createScoreState();
    for (let i = 0; i < SCORING.comboPerStep; i++) scoreNearMiss(s);
    expect(s.multiplier).toBe(1 + SCORING.multiplierStep);
    const before = s.score;
    scoreKill(s, 100);
    expect(s.score - before).toBe(Math.round(100 * s.multiplier));
  });

  it('tracks best combo even after the combo collapses', () => {
    const s = createScoreState();
    for (let i = 0; i < 7; i++) scoreEmber(s);
    expect(s.bestCombo).toBe(7);
    breakCombo(s);
    expect(s.combo).toBe(0);
    expect(s.multiplier).toBe(1);
    expect(s.bestCombo).toBe(7);
  });

  it('accrues survival score without touching the combo', () => {
    const s = createScoreState();
    s.multiplier = 2;
    scoreTime(s, 1);
    expect(s.score).toBeCloseTo(SCORING.scorePerSecond * 2);
    expect(s.combo).toBe(0);
  });
});

describe('combo timer', () => {
  it('expires the combo when the timer drains', () => {
    const s = createScoreState();
    scoreEmber(s);
    expect(heatFraction(s)).toBe(1);
    tickCombo(s, s.comboDuration / 2);
    expect(heatFraction(s)).toBeCloseTo(0.5);
    tickCombo(s, s.comboDuration);
    expect(s.combo).toBe(0);
    expect(s.multiplier).toBe(1);
    expect(heatFraction(s)).toBe(0);
  });

  it('refreshes the timer on each combo action', () => {
    const s = createScoreState();
    scoreEmber(s);
    tickCombo(s, s.comboDuration * 0.9);
    scoreNearMiss(s);
    expect(s.comboTimer).toBe(s.comboDuration);
    expect(s.combo).toBe(2);
  });

  it('honours the Long Burn combo-duration upgrade', () => {
    const s = createScoreState(1.3);
    expect(s.comboDuration).toBeCloseTo(SCORING.baseComboDuration * 1.3);
  });
});

describe('ascended form', () => {
  it('triggers at the configured multiplier', () => {
    const s = createScoreState();
    expect(isAscended(s)).toBe(false);
    s.multiplier = SCORING.ascendedMultiplier;
    expect(isAscended(s)).toBe(true);
  });
});
