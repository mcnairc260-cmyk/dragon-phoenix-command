import { describe, expect, it } from 'vitest';
import { ELEMENT_SHARD_IDS } from './UpgradeDefs';
import { ELEMENT_SHARDS, ULTIMATES, eligibleUltimates, evolutionStage, ownsElement, ultimatePower } from './Ultimates';

describe('ultimates', () => {
  it('has the innate Burst plus the six elemental ultimates of the brief', () => {
    expect(ULTIMATES.map((u) => u.id)).toEqual([
      'burst',
      'supernova',
      'absolute-zero',
      'void-collapse',
      'worldroot',
      'storm-apocalypse',
      'celestial',
    ]);
  });

  it('pairs each element shard with exactly one ultimate', () => {
    expect([...ELEMENT_SHARDS].sort()).toEqual([...ELEMENT_SHARD_IDS].sort());
  });

  it('offers only the ultimates of element shards the player owns', () => {
    expect(eligibleUltimates({})).toEqual([]);
    expect(eligibleUltimates({ frost: 1, titan: 3 }).map((u) => u.id)).toEqual(['absolute-zero']);
    expect(eligibleUltimates({ ember: 2, arcane: 1 }).map((u) => u.id)).toEqual(['supernova', 'celestial']);
    expect(ownsElement({ time: 4 })).toBe(false);
  });

  it('scales power by Ascension tier and clamps outside 1..3', () => {
    expect(ultimatePower(1)).toBe(1);
    expect(ultimatePower(2)).toBeCloseTo(1.35);
    expect(ultimatePower(3)).toBeCloseTo(1.7);
    expect(ultimatePower(9)).toBeCloseTo(1.7);
    expect(ultimatePower(0)).toBe(1);
  });

  it('names the evolution stages', () => {
    expect([0, 1, 2, 3].map(evolutionStage)).toEqual(['Mortal', 'Awakened', 'Radiant', 'Transcendent']);
  });
});
