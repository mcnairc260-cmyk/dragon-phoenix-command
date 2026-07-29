import { describe, expect, it } from 'vitest';
import { applyFilters, EMPTY_FILTERS, fitScore, sortOpportunities } from './filters';
import { DEFAULT_PREFERENCES } from './preferences';
import { OPPORTUNITIES } from '../data/opportunities';

describe('applyFilters', () => {
  it('returns everything with empty filters', () => {
    expect(applyFilters(OPPORTUNITIES, EMPTY_FILTERS)).toHaveLength(OPPORTUNITIES.length);
  });

  it('matches search terms case-insensitively across fields', () => {
    const results = applyFilters(OPPORTUNITIES, { ...EMPTY_FILTERS, search: 'VOICE agents' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((o) => `${o.title} ${o.shortDescription} ${o.fullDescription}`.toLowerCase().includes('voice'))).toBe(true);
  });

  it('returns empty for a nonsense search', () => {
    expect(applyFilters(OPPORTUNITIES, { ...EMPTY_FILTERS, search: 'zzqxvnope' })).toHaveLength(0);
  });

  it('filters by category', () => {
    const results = applyFilters(OPPORTUNITIES, { ...EMPTY_FILTERS, categories: ['Micro-SaaS'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((o) => o.category === 'Micro-SaaS')).toBe(true);
  });

  it('combines filters with AND semantics', () => {
    const results = applyFilters(OPPORTUNITIES, {
      ...EMPTY_FILTERS,
      categories: ['Micro-SaaS'],
      competitionLevels: ['High'],
    });
    expect(results.every((o) => o.category === 'Micro-SaaS' && o.competitionLevel === 'High')).toBe(
      true,
    );
  });

  it('filters by max startup cost using the range minimum', () => {
    const results = applyFilters(OPPORTUNITIES, { ...EMPTY_FILTERS, maxStartupCost: 1000 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((o) => o.startupCostRange.minUsd <= 1000)).toBe(true);
  });

  it('filters by minimum score', () => {
    const results = applyFilters(OPPORTUNITIES, { ...EMPTY_FILTERS, minScore: 80 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((o) => o.score >= 80)).toBe(true);
  });
});

describe('sortOpportunities', () => {
  it('sorts by score descending', () => {
    const sorted = sortOpportunities(OPPORTUNITIES, 'score');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].score).toBeGreaterThanOrEqual(sorted[i].score);
    }
  });

  it('sorts by lowest startup cost first', () => {
    const sorted = sortOpportunities(OPPORTUNITIES, 'cost');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].startupCostRange.minUsd).toBeLessThanOrEqual(
        sorted[i].startupCostRange.minUsd,
      );
    }
  });

  it('sorts by newest signal (updatedAt) first', () => {
    const sorted = sortOpportunities(OPPORTUNITIES, 'newest');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].updatedAt >= sorted[i].updatedAt).toBe(true);
    }
  });

  it('puts Low competition first for the competition sort', () => {
    const sorted = sortOpportunities(OPPORTUNITIES, 'competition');
    expect(sorted[0].competitionLevel).toBe('Low');
    expect(sorted[sorted.length - 1].competitionLevel).toBe('High');
  });

  it('does not mutate the input array', () => {
    const input = [...OPPORTUNITIES];
    sortOpportunities(input, 'score');
    expect(input).toEqual(OPPORTUNITIES);
  });
});

describe('fitScore', () => {
  it('boosts preferred categories', () => {
    const target = OPPORTUNITIES[0];
    const withPref = fitScore(target, {
      ...DEFAULT_PREFERENCES,
      preferredCategories: [target.category],
    });
    const withOtherPref = fitScore(target, {
      ...DEFAULT_PREFERENCES,
      preferredCategories: [target.category === 'Micro-SaaS' ? 'Education' : 'Micro-SaaS'],
    });
    expect(withPref).toBeGreaterThan(withOtherPref);
  });

  it('penalizes opportunities above the stated budget', () => {
    const expensive = OPPORTUNITIES.find((o) => o.startupCostRange.minUsd >= 2000)!;
    const inBudget = fitScore(expensive, { ...DEFAULT_PREFERENCES, maxBudgetUsd: 25000 });
    const overBudget = fitScore(expensive, { ...DEFAULT_PREFERENCES, maxBudgetUsd: 500 });
    expect(inBudget).toBeGreaterThan(overBudget);
  });

  it('stays within 0–100', () => {
    for (const o of OPPORTUNITIES) {
      const fit = fitScore(o, {
        ...DEFAULT_PREFERENCES,
        preferredCategories: ['Education'],
        maxBudgetUsd: 100,
        experienceLevel: 'beginner',
        riskTolerance: 'low',
      });
      expect(fit).toBeGreaterThanOrEqual(0);
      expect(fit).toBeLessThanOrEqual(100);
    }
  });
});
