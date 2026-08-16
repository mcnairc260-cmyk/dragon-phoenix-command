import { describe, expect, it } from 'vitest';
import { createRng } from '../core/Rng';
import { draftUpgrades, takeUpgrade } from './UpgradeDraft';
import { BASE_STATS, UPGRADES, computeStats, type UpgradeLevels } from './UpgradeDefs';

describe('upgrade catalogue', () => {
  it('has at least 18 upgrades', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(18);
  });

  it('covers all three build families', () => {
    const families = new Set(UPGRADES.map((u) => u.family));
    expect([...families].sort()).toEqual(['defense', 'offense', 'utility']);
  });

  it('covers all three rarities', () => {
    const rarities = new Set(UPGRADES.map((u) => u.rarity));
    expect([...rarities].sort()).toEqual(['common', 'legendary', 'rare']);
  });

  it('uses unique ids', () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
  });

  it('gives every upgrade a positive max level and a description', () => {
    for (const u of UPGRADES) {
      expect(u.maxLevel).toBeGreaterThan(0);
      expect(u.describe(1).length).toBeGreaterThan(0);
    }
  });
});

describe('computeStats', () => {
  it('returns base stats for an empty build', () => {
    expect(computeStats({})).toEqual(BASE_STATS);
  });

  it('stacks repeated levels of the same upgrade', () => {
    const one = computeStats({ swift: 1 });
    const three = computeStats({ swift: 3 });
    expect(one.speedMul).toBeCloseTo(1.12);
    expect(three.speedMul).toBeCloseTo(1.36);
  });

  it('ignores levels beyond an upgrade maxLevel', () => {
    const capped = computeStats({ swift: 99 });
    const atMax = computeStats({ swift: 4 });
    expect(capped).toEqual(atMax);
  });

  it('stacks across compatible upgrades from different families', () => {
    const stats = computeStats({ 'orbit-blades': 2, 'crit-bloom': 2, swift: 1, shield: 1 });
    expect(stats.orbitBlades).toBe(2);
    expect(stats.critChance).toBeCloseTo(0.24);
    expect(stats.speedMul).toBeCloseTo(1.12);
    expect(stats.shieldRecharge).toBe(14);
  });

  it('shortens the shield recharge with additional levels', () => {
    expect(computeStats({ shield: 1 }).shieldRecharge).toBe(14);
    expect(computeStats({ shield: 2 }).shieldRecharge).toBe(11);
    expect(computeStats({ shield: 3 }).shieldRecharge).toBe(8);
  });

  it('multiplies rather than adds enemy projectile slowdown', () => {
    const stats = computeStats({ 'slow-projectiles': 3 });
    expect(stats.enemyProjectileSpeedMul).toBeCloseTo(0.82 ** 3);
    expect(stats.enemyProjectileSpeedMul).toBeGreaterThan(0);
  });

  it('never mutates the shared BASE_STATS object', () => {
    computeStats({ swift: 4, 'orbit-blades': 4 });
    expect(BASE_STATS.speedMul).toBe(1);
    expect(BASE_STATS.orbitBlades).toBe(0);
  });

  it('grants a second burst charge from the legendary', () => {
    expect(computeStats({ 'second-burst': 1 }).burstCharges).toBe(2);
  });
});

describe('draftUpgrades', () => {
  it('returns three distinct cards', () => {
    const rng = createRng(1234);
    const cards = draftUpgrades({}, rng);
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.def.id)).size).toBe(3);
  });

  it('is deterministic for a given seed', () => {
    const a = draftUpgrades({}, createRng(99)).map((c) => c.def.id);
    const b = draftUpgrades({}, createRng(99)).map((c) => c.def.id);
    expect(a).toEqual(b);
  });

  it('never offers an upgrade already at max level', () => {
    const owned: UpgradeLevels = { 'second-burst': 1, ashfall: 1 };
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const ids = draftUpgrades(owned, rng).map((c) => c.def.id);
      expect(ids).not.toContain('second-burst');
      expect(ids).not.toContain('ashfall');
    }
  });

  it('reports the next level and whether the card is new', () => {
    const cards = draftUpgrades({ swift: 2 }, createRng(3), { count: 20 });
    const swift = cards.find((c) => c.def.id === 'swift');
    expect(swift?.nextLevel).toBe(3);
    expect(swift?.isNew).toBe(false);
    const fresh = cards.find((c) => c.def.id !== 'swift');
    expect(fresh?.isNew).toBe(true);
  });

  it('degrades gracefully when almost everything is maxed', () => {
    const owned: UpgradeLevels = Object.fromEntries(UPGRADES.map((u) => [u.id, u.maxLevel]));
    expect(draftUpgrades(owned, createRng(1))).toHaveLength(0);

    const nearlyMaxed: UpgradeLevels = { ...owned, swift: 0 };
    expect(draftUpgrades(nearlyMaxed, createRng(1))).toHaveLength(1);
  });

  it('offers commons far more often than legendaries', () => {
    const rng = createRng(2024);
    const counts = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 500; i++) {
      for (const card of draftUpgrades({}, rng)) counts[card.def.rarity] += 1;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.legendary);
    expect(counts.legendary).toBeGreaterThan(0);
  });

  it('offers legendaries more often at high player level', () => {
    const rate = (level: number) => {
      const rng = createRng(555);
      let legendaries = 0;
      for (let i = 0; i < 600; i++) {
        for (const card of draftUpgrades({}, rng, { playerLevel: level })) {
          if (card.def.rarity === 'legendary') legendaries += 1;
        }
      }
      return legendaries;
    };
    expect(rate(25)).toBeGreaterThan(rate(1));
  });
});

describe('takeUpgrade', () => {
  it('increments the level immutably', () => {
    const owned: UpgradeLevels = { swift: 1 };
    const next = takeUpgrade(owned, 'swift');
    expect(next.swift).toBe(2);
    expect(owned.swift).toBe(1);
  });

  it('adds a brand new upgrade at level 1', () => {
    expect(takeUpgrade({}, 'shield').shield).toBe(1);
  });

  it('clamps at maxLevel', () => {
    expect(takeUpgrade({ 'second-burst': 1 }, 'second-burst')['second-burst']).toBe(1);
  });

  it('ignores unknown ids', () => {
    const owned = { swift: 1 };
    expect(takeUpgrade(owned, 'not-a-real-upgrade')).toBe(owned);
  });
});
