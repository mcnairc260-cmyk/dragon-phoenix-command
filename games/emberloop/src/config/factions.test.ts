import { describe, expect, it } from 'vitest';
import { FACTIONS, ROLE_KIND, SPECIES, factionForBoard, speciesFor, type Role } from './factions';
import { BOSSES, bossFor } from './bosses';

const ROLES: Role[] = ['chaser', 'charger', 'shooter'];

describe('enemy factions', () => {
  it('has the 18 species of the founder roster, 3 roles per faction', () => {
    expect(SPECIES).toHaveLength(18);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(18);
    for (const faction of FACTIONS) {
      for (const role of ROLES) expect(speciesFor(role, faction.id)).not.toBeNull();
    }
  });

  it('maps each role onto an existing behaviour', () => {
    expect(ROLE_KIND).toEqual({ chaser: 'cinder', charger: 'dart', shooter: 'spitter' });
  });

  it('gives each board one faction, in roster order, repeating every six boards', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((b) => factionForBoard(b).id)).toEqual([
      'volcanic',
      'frostborn',
      'shadow',
      'nature',
      'aerial',
      'arcane',
      'volcanic',
    ]);
  });

  it("pairs every board's faction with its own boss", () => {
    for (let b = 0; b < 12; b++) expect(bossFor(b).faction).toBe(factionForBoard(b).id);
    expect(BOSSES).toHaveLength(FACTIONS.length);
  });

  it('keeps tuning inside sane bounds', () => {
    for (const s of SPECIES) {
      expect(s.speedMul).toBeGreaterThan(0.5);
      expect(s.speedMul).toBeLessThan(1.6);
      expect(s.hpMul).toBeGreaterThanOrEqual(1);
      expect(s.sizeMul).toBeLessThanOrEqual(1.25);
    }
  });
});
