import { describe, expect, it } from 'vitest';
import { computeScore, SCORE_WEIGHTS, scoreBand } from './score';
import type { ScoreComponents } from '../types/opportunity';
import { OPPORTUNITIES } from '../data/opportunities';

const uniform = (value: number): ScoreComponents => ({
  marketGrowth: value,
  competitionAdvantage: value,
  revenuePotential: value,
  timingUrgency: value,
  easeOfExecution: value,
  dataConfidence: value,
});

describe('computeScore', () => {
  it('weights sum to exactly 1', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('returns the same value when all components are equal', () => {
    expect(computeScore(uniform(0))).toBe(0);
    expect(computeScore(uniform(50))).toBe(50);
    expect(computeScore(uniform(100))).toBe(100);
  });

  it('applies the documented weights', () => {
    // Only market growth (25%) at 100 → 25.
    expect(computeScore({ ...uniform(0), marketGrowth: 100 })).toBe(25);
    // Only ease of execution (10%) at 100 → 10.
    expect(computeScore({ ...uniform(0), easeOfExecution: 100 })).toBe(10);
  });

  it('clamps out-of-range component values', () => {
    expect(computeScore(uniform(150))).toBe(100);
    expect(computeScore(uniform(-20))).toBe(0);
  });

  it('rounds to whole numbers — no fake precision', () => {
    const score = computeScore({ ...uniform(50), marketGrowth: 51 });
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('scoreBand', () => {
  it('maps scores to the documented bands', () => {
    expect(scoreBand(95).label).toBe('Exceptional');
    expect(scoreBand(90).label).toBe('Exceptional');
    expect(scoreBand(89).label).toBe('Strong');
    expect(scoreBand(80).label).toBe('Strong');
    expect(scoreBand(79).label).toBe('Promising');
    expect(scoreBand(70).label).toBe('Promising');
    expect(scoreBand(69).label).toBe('Watch');
    expect(scoreBand(60).label).toBe('Watch');
    expect(scoreBand(59).label).toBe('Early / Uncertain');
    expect(scoreBand(0).label).toBe('Early / Uncertain');
  });
});

describe('seed data integrity', () => {
  it('every seed score equals computeScore of its components', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.score).toBe(computeScore(o.scoreComponents));
    }
  });

  it('all seed records are labeled demo', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.isDemo).toBe(true);
      expect(o.sourceStatus).toBe('demo');
    }
  });

  it('related opportunity ids all resolve', () => {
    const ids = new Set(OPPORTUNITIES.map((o) => o.id));
    for (const o of OPPORTUNITIES) {
      for (const rel of o.relatedOpportunityIds) {
        expect(ids.has(rel)).toBe(true);
        expect(rel).not.toBe(o.id);
      }
    }
  });

  it('slugs and ids are unique', () => {
    expect(new Set(OPPORTUNITIES.map((o) => o.slug)).size).toBe(OPPORTUNITIES.length);
    expect(new Set(OPPORTUNITIES.map((o) => o.id)).size).toBe(OPPORTUNITIES.length);
  });
});
