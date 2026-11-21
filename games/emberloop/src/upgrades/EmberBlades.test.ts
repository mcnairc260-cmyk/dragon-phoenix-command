import { describe, expect, it } from 'vitest';
import { BLADES, BLADE_LEVEL_TEXT, bladeSpec, slotAngle } from './EmberBlades';
import { UPGRADES, computeStats } from './UpgradeDefs';
import { completedBy, hasSynergy } from './Synergies';

const rev = (lv: number, storm = 0, cyclone = false) => bladeSpec(lv, storm, cyclone).revSeconds;

describe('Ember Blades', () => {
  it('has no blades until the weapon is taken, then one blade per level up to six', () => {
    expect(computeStats({}).orbitBlades).toBe(0);
    expect(computeStats({ ember: 5, storm: 5 }).orbitBlades).toBe(0); // Ember Shard does not grant it
    for (let lv = 1; lv <= 6; lv++) expect(bladeSpec(lv, 0, false).count).toBe(lv);
    expect(computeStats({ 'ember-blades': 99 }).orbitBlades).toBe(6);
    expect(bladeSpec(9, 0, false).count).toBe(6);
  });

  it('is a six-level weapon card with the brief’s level texts', () => {
    const card = UPGRADES.find((u) => u.id === 'ember-blades')!;
    expect(card.maxLevel).toBe(6);
    expect(card.weapon).toBe(true);
    expect([1, 2, 3, 4, 5, 6].map((l) => card.describe(l))).toEqual(BLADE_LEVEL_TEXT.slice(1));
  });

  it('spaces N blades 360/N degrees apart', () => {
    for (let n = 1; n <= 6; n++) {
      for (let i = 1; i < n; i++) expect(slotAngle(i, n) - slotAngle(i - 1, n)).toBeCloseTo((Math.PI * 2) / n);
    }
  });

  it('spins at 2 s per revolution, faster at level 4 and fastest (1.4 s) at level 6', () => {
    expect(rev(1)).toBeCloseTo(2);
    expect(rev(3)).toBeCloseTo(2);
    expect(rev(4)).toBeLessThan(rev(3));
    expect(rev(6)).toBeCloseTo(1.4);
  });

  it('gains damage at level 5 only (Ember is applied later, once, by the damage system)', () => {
    expect(bladeSpec(4, 0, false).damage).toBe(BLADES.baseDamage);
    expect(bladeSpec(5, 0, false).damage).toBeCloseTo(BLADES.baseDamage * 1.25);
    expect(bladeSpec(6, 0, false).damage).toBeCloseTo(BLADES.baseDamage * 1.25);
  });

  it('lets Storm add a capped spin bonus, and never spins faster than the floor', () => {
    expect(rev(1, 2)).toBeLessThan(rev(1, 0));
    expect(rev(1, 5)).toBeCloseTo(rev(1, 4)); // capped at +12%
    expect(rev(6, 5, true)).toBeGreaterThanOrEqual(BLADES.minRevSeconds);
  });

  it('ignores Time (cooldowns) for spin speed', () => {
    expect(computeStats({ 'ember-blades': 3, time: 4 }).orbitBlades).toBe(3);
    // bladeSpec takes no cooldown input at all: spin depends only on level, Storm and Infernal Cyclone.
    expect(bladeSpec.length).toBe(3);
  });

  it('Infernal Cyclone needs the weapon plus Ember and Storm, and boosts spin and damage once', () => {
    expect(hasSynergy({ ember: 1, storm: 1 }, 'infernal-cyclone')).toBe(false);
    expect(hasSynergy({ 'ember-blades': 1, ember: 1, storm: 1 }, 'infernal-cyclone')).toBe(true);
    expect(completedBy({ ember: 1, storm: 2 }, 'ember-blades').map((s) => s.id)).toEqual(['infernal-cyclone']);
    const plain = bladeSpec(3, 0, false);
    const hot = bladeSpec(3, 0, true);
    expect(hot.damage).toBeCloseTo(plain.damage * 1.2);
    expect(hot.revSeconds).toBeCloseTo(plain.revSeconds / 1.12);
  });
});
