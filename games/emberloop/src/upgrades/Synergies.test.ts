import { describe, expect, it } from 'vitest';
import { UPGRADES, computeStats } from './UpgradeDefs';
import { SYNERGIES, activeSynergies, completedBy, hasSynergy } from './Synergies';

describe('shard synergies', () => {
  it('has the 10 synergies of the brief plus Infernal Cyclone, with their exact requirements', () => {
    expect(SYNERGIES.map((s) => [s.name, [...s.requires].sort().join('+')])).toEqual([
      ['Firestorm', 'ember+storm'],
      ['Frozen Barrage', 'arcane+frost'],
      ['Shadow Execution', 'hunter+void'],
      ['Phoenix Renewal', 'nature+ward'],
      ['Thunder Tempest', 'arcane+storm'],
      ['Molten Armor', 'ember+titan'],
      ['Temporal Echo', 'time+void'],
      ['Celestial Harvest', 'cosmic+nature'],
      ["Titan's Judgment", 'hunter+titan'],
      ['Celestial Barrage', 'arcane+hunter+void'],
      ['Infernal Cyclone', 'ember+ember-blades+storm'],
    ]);
  });

  it('only names real shards', () => {
    const ids = new Set(UPGRADES.map((u) => u.id));
    for (const s of SYNERGIES) for (const r of s.requires) expect(ids.has(r)).toBe(true);
  });

  it('switches on when every required shard is owned at least once', () => {
    expect(activeSynergies({ ember: 1 })).toEqual([]);
    expect(activeSynergies({ ember: 1, storm: 3 }).map((s) => s.id)).toEqual(['firestorm']);
    expect(hasSynergy({ arcane: 1, void: 1 }, 'celestial-barrage')).toBe(false);
    expect(hasSynergy({ arcane: 1, void: 1, hunter: 1 }, 'celestial-barrage')).toBe(true);
  });

  it('supports several synergies at once', () => {
    const ids = activeSynergies({ arcane: 1, void: 1, hunter: 1, storm: 1 }).map((s) => s.id);
    expect(ids).toEqual(['shadow-execution', 'thunder-tempest', 'celestial-barrage']);
  });

  it('tells a level-up card which synergies it would complete', () => {
    expect(completedBy({ ember: 2 }, 'storm').map((s) => s.id)).toEqual(['firestorm']);
    expect(completedBy({ void: 1, hunter: 1 }, 'arcane').map((s) => s.id)).toEqual(['celestial-barrage']);
    expect(completedBy({ ember: 1, storm: 1 }, 'storm')).toEqual([]); // already owned
    expect(completedBy({}, 'ember')).toEqual([]);
  });

  it('keeps blades out of Firestorm and bounds Molten Armor', () => {
    expect(computeStats({ ember: 1, storm: 1 }).orbitBlades).toBe(0);
    expect(computeStats({ ember: 1, titan: 1 }).armorChance).toBeCloseTo(0.07 + 0.1);
    expect(computeStats({ ember: 5, titan: 4 }).armorChance).toBeLessThanOrEqual(0.4);
  });
});
