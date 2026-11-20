import { describe, expect, it } from 'vitest';
import { FACTIONS, ROLE_KIND, SPECIES, pickSpecies, unlockedFactions, type Role } from './factions';

const ROLES: Role[] = ['chaser', 'charger', 'shooter'];

describe('enemy factions', () => {
  it('has the 18 species of the founder roster, 3 roles per faction', () => {
    expect(SPECIES).toHaveLength(18);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(18);
    for (const faction of FACTIONS) {
      for (const role of ROLES) {
        expect(SPECIES.filter((s) => s.faction === faction.id && s.role === role)).toHaveLength(1);
      }
    }
  });

  it('maps each role onto an existing behaviour', () => {
    expect(ROLE_KIND).toEqual({ chaser: 'cinder', charger: 'dart', shooter: 'spitter' });
  });

  it('introduces factions over time, starting with the Volcanic Legion', () => {
    expect(unlockedFactions(0).map((f) => f.id)).toEqual(['volcanic']);
    expect(unlockedFactions(10_000)).toHaveLength(6);
    const times = FACTIONS.map((f) => f.unlockAt);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('only picks species from unlocked factions, with the right role', () => {
    for (let t = 0; t < 260; t += 7) {
      const allowed = new Set(unlockedFactions(t).map((f) => f.id));
      for (const role of ROLES) {
        for (const roll of [0, 0.3, 0.6, 0.999]) {
          const s = pickSpecies(role, t, () => roll);
          expect(s).not.toBeNull();
          expect(allowed.has(s!.faction)).toBe(true);
          expect(s!.role).toBe(role);
        }
      }
    }
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
