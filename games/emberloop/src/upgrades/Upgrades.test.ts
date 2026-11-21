import { describe, expect, it } from 'vitest';
import { createRng } from '../core/Rng';
import { draftUpgrades, takeUpgrade } from './UpgradeDraft';
import { BASE_STATS, COOLDOWN_FLOOR, FROST_CAP, UPGRADES, computeStats, type UpgradeLevels } from './UpgradeDefs';

const STACK_LIMITS: Record<string, number> = {
  ember: 5,
  frost: 4,
  void: 5,
  nature: 4,
  storm: 5,
  arcane: 3,
  ascension: 3,
  titan: 4,
  time: 4,
  hunter: 4,
  ward: 3,
  cosmic: 4,
};

const maxed = (): UpgradeLevels => Object.fromEntries(UPGRADES.map((u) => [u.id, u.maxLevel]));

describe('Power Shard catalogue', () => {
  it('is exactly the 12 founder shards with the brief’s stacking limits', () => {
    expect(UPGRADES).toHaveLength(12);
    expect(Object.fromEntries(UPGRADES.map((u) => [u.id, u.maxLevel]))).toEqual(STACK_LIMITS);
  });

  it('gives every shard art, an effect line and a description per level', () => {
    for (const u of UPGRADES) {
      expect(u.art.length).toBeGreaterThan(0);
      for (let level = 1; level <= u.maxLevel; level++) {
        expect(u.effect(level).length).toBeGreaterThan(0);
        expect(u.describe(level).length).toBeGreaterThan(0);
      }
    }
  });

  it('shows current → next on repeat picks', () => {
    const ember = UPGRADES.find((u) => u.id === 'ember')!;
    expect(ember.describe(1)).toBe('+12% damage');
    expect(ember.describe(2)).toBe('+12% damage  →  +24% damage');
  });

  it('only offers Ascension once an element shard is owned', () => {
    const offered = (owned: UpgradeLevels) => {
      const rng = createRng(11);
      for (let i = 0; i < 400; i++) if (draftUpgrades(owned, rng).some((c) => c.def.id === 'ascension')) return true;
      return false;
    };
    expect(offered({})).toBe(false);
    expect(offered({ titan: 2, time: 1 })).toBe(false);
    expect(offered({ frost: 1 })).toBe(true);
  });
});

describe('computeStats', () => {
  it('returns base stats for an empty build', () => {
    expect(computeStats({})).toEqual(BASE_STATS);
  });

  it('applies each shard’s per-level effect', () => {
    const s = computeStats({ ember: 2, void: 3, storm: 1, titan: 2, hunter: 3, cosmic: 1 });
    expect(s.damageMul).toBeCloseTo(1.24);
    expect(s.rangeMul).toBeCloseTo(1.3);
    expect(s.speedMul).toBeCloseTo(1.08);
    expect(s.armorChance).toBeCloseTo(0.14 + 0.1); // Titan 2 + Molten Armor (Ember + Titan synergy)
    expect(s.critChance).toBeCloseTo(0.18);
    expect(s.xpMul).toBeCloseTo(1.12);
    expect(s.emberValueMul).toBeCloseTo(1.12);
  });

  it('ignores levels beyond a shard’s limit', () => {
    expect(computeStats({ ember: 99 })).toEqual(computeStats({ ember: 5 }));
  });

  it('caps Frost slow at 48%', () => {
    expect(computeStats({ frost: 4 }).enemySlow).toBeCloseTo(FROST_CAP);
    expect(computeStats({ frost: 99 }).enemySlow).toBeLessThanOrEqual(FROST_CAP);
  });

  it('shortens cooldowns with Time but never below the floor or to zero', () => {
    const s = computeStats({ time: 4, ward: 3, arcane: 3, nature: 4 });
    expect(s.cooldownMul).toBeCloseTo(COOLDOWN_FLOOR);
    expect(s.shieldRecharge).toBeCloseTo(8 * COOLDOWN_FLOOR);
    expect(s.homingInterval).toBeCloseTo(1.2 * COOLDOWN_FLOOR);
    expect(s.regenInterval).toBeCloseTo(25 * COOLDOWN_FLOOR);
    expect(computeStats({ time: 99 }).cooldownMul).toBeGreaterThan(0);
  });

  it('only regrows hearts from Nature level 2, on a bounded timer', () => {
    expect(computeStats({ nature: 1 }).regenInterval).toBe(0);
    expect(computeStats({ nature: 2 }).regenInterval).toBe(45);
    expect(computeStats({ nature: 4 }).regenInterval).toBe(25);
  });

  it('keeps Arcane extra projectiles bounded', () => {
    expect(computeStats({ arcane: 1 }).homingShots).toBe(1);
    expect(computeStats({ arcane: 99 }).homingShots).toBe(3);
  });

  it('shortens the Ward shield recharge per level', () => {
    expect(computeStats({ ward: 1 }).shieldRecharge).toBe(14);
    expect(computeStats({ ward: 2 }).shieldRecharge).toBe(11);
    expect(computeStats({ ward: 3 }).shieldRecharge).toBe(8);
  });

  it('never mutates the shared BASE_STATS object', () => {
    computeStats(maxed());
    expect(BASE_STATS.speedMul).toBe(1);
    expect(BASE_STATS.damageMul).toBe(1);
    expect(BASE_STATS.cooldownMul).toBe(1);
  });
});

describe('draftUpgrades', () => {
  it('returns three distinct cards', () => {
    const cards = draftUpgrades({}, createRng(1234));
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.def.id)).size).toBe(3);
  });

  it('is deterministic for a given seed', () => {
    const a = draftUpgrades({}, createRng(99)).map((c) => c.def.id);
    const b = draftUpgrades({}, createRng(99)).map((c) => c.def.id);
    expect(a).toEqual(b);
  });

  it('never offers a maxed shard, nor Ascension without an element', () => {
    const owned: UpgradeLevels = { ward: 3, titan: 4 };
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const ids = draftUpgrades(owned, rng).map((c) => c.def.id);
      expect(ids).not.toContain('ward');
      expect(ids).not.toContain('titan');
      expect(ids).not.toContain('ascension');
    }
  });

  it('reports the next level and whether the card is new', () => {
    const cards = draftUpgrades({ storm: 2 }, createRng(3), { count: 20 });
    const storm = cards.find((c) => c.def.id === 'storm');
    expect(storm?.nextLevel).toBe(3);
    expect(storm?.isNew).toBe(false);
    expect(cards.find((c) => c.def.id !== 'storm')?.isNew).toBe(true);
  });

  it('degrades gracefully when almost everything is maxed', () => {
    expect(draftUpgrades(maxed(), createRng(1))).toHaveLength(0);
    expect(draftUpgrades({ ...maxed(), storm: 0 }, createRng(1))).toHaveLength(1);
  });

  it('offers common shards more often than rarer ones', () => {
    const rng = createRng(2024);
    const counts = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 500; i++) {
      for (const card of draftUpgrades({}, rng)) counts[card.def.rarity] += 1;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.legendary).toBeGreaterThan(0);
  });
});

describe('takeUpgrade', () => {
  it('increments the level immutably', () => {
    const owned: UpgradeLevels = { storm: 1 };
    expect(takeUpgrade(owned, 'storm').storm).toBe(2);
    expect(owned.storm).toBe(1);
  });

  it('clamps at the stacking limit', () => {
    expect(takeUpgrade({ ward: 3 }, 'ward').ward).toBe(3);
  });

  it('ignores unknown ids', () => {
    const owned = { storm: 1 };
    expect(takeUpgrade(owned, 'swift')).toBe(owned);
  });
});
