import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../config/GameConfig';
import { ACHIEVEMENTS, newlyEarned, type LifetimeTotals, type RunSummary } from './Achievements';
import { PALETTES, unlockedPaletteIds } from './Cosmetics';
import { addXp, createLevelState, levelProgress, xpForLevel } from './Leveling';
import {
  createSave,
  loadSave,
  recordRun,
  saveSave,
  toLifetimeStats,
  type SaveData,
  type StorageLike,
} from './Progression';

class FakeStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function makeRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    score: 0,
    survivalTime: 0,
    bestCombo: 0,
    embers: 0,
    level: 1,
    kills: 0,
    bursts: 0,
    bossesDefeated: 0,
    legendaryTaken: false,
    damageTaken: 0,
    longestClean: 0,
    ...overrides,
  };
}

describe('leveling', () => {
  it('requires more XP at each level', () => {
    for (let l = 1; l < 20; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });

  it('reaches level 2 quickly enough for an early upgrade choice', () => {
    // ~1 XP per ember/kill: the first upgrade must land inside the opening ~30s.
    expect(xpForLevel(1)).toBeLessThanOrEqual(12);
  });

  it('levels up when XP crosses the threshold', () => {
    const state = createLevelState();
    const gained = addXp(state, xpForLevel(1));
    expect(gained).toBe(1);
    expect(state.level).toBe(2);
    expect(state.xp).toBe(0);
  });

  it('carries surplus XP into the next level', () => {
    const state = createLevelState();
    addXp(state, xpForLevel(1) + 3);
    expect(state.level).toBe(2);
    expect(state.xp).toBe(3);
  });

  it('handles multiple level-ups from one large award', () => {
    const state = createLevelState();
    const gained = addXp(state, 1000);
    expect(gained).toBeGreaterThan(1);
    expect(state.level).toBe(1 + gained);
  });

  it('applies the XP multiplier upgrade', () => {
    const plain = createLevelState();
    const boosted = createLevelState();
    addXp(plain, 4);
    addXp(boosted, 4, 2);
    expect(boosted.xp).toBe(plain.xp * 2);
  });

  it('reports progress between 0 and 1', () => {
    const state = createLevelState();
    expect(levelProgress(state)).toBe(0);
    addXp(state, state.xpToNext / 2);
    expect(levelProgress(state)).toBeCloseTo(0.5);
  });
});

describe('achievements', () => {
  it('defines at least eight achievements with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  const totals: LifetimeTotals = { totalEmbers: 0, runs: 1, totalKills: 0 };

  it('awards the first-run achievement after one run', () => {
    expect(newlyEarned(makeRun(), totals, [])).toContain('first-flight');
  });

  it('does not re-award achievements already earned', () => {
    expect(newlyEarned(makeRun(), totals, ['first-flight'])).not.toContain('first-flight');
  });

  it('awards score, combo and survival milestones', () => {
    const earned = newlyEarned(makeRun({ score: 12000, bestCombo: 30, survivalTime: 130 }), totals, []);
    expect(earned).toEqual(expect.arrayContaining(['inferno', 'heatwave', 'endurance']));
  });

  it('awards flawless only on a hitless long run', () => {
    expect(newlyEarned(makeRun({ survivalTime: 95, damageTaken: 0 }), totals, [])).toContain('flawless');
    expect(newlyEarned(makeRun({ survivalTime: 95, damageTaken: 1 }), totals, [])).not.toContain('flawless');
  });

  it('uses lifetime totals for cumulative achievements', () => {
    const many: LifetimeTotals = { totalEmbers: 600, runs: 12, totalKills: 1200 };
    const earned = newlyEarned(makeRun(), many, []);
    expect(earned).toEqual(expect.arrayContaining(['hoarder', 'exterminator']));
  });
});

describe('cosmetics', () => {
  it('defines at least five palettes', () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(5);
  });

  it('unlocks only the default palette for a fresh player', () => {
    expect(unlockedPaletteIds(toLifetimeStats(createSave()))).toEqual(['ember']);
  });

  it('unlocks additional palettes as lifetime stats grow', () => {
    const ids = unlockedPaletteIds({
      highScore: 6000,
      longestSurvival: 130,
      totalEmbers: 800,
      bossesDefeated: 1,
      achievements: 6,
      runs: 20,
    });
    expect(ids).toHaveLength(PALETTES.length);
  });
});

describe('save persistence', () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadSave(storage)).toEqual(createSave());
  });

  it('round-trips a save', () => {
    const save = createSave();
    save.highScore = 4321;
    save.settings.music = false;
    saveSave(storage, save);
    expect(loadSave(storage)).toEqual(save);
  });

  it('survives corrupt JSON', () => {
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadSave(storage)).toEqual(createSave());
  });

  it('repairs a partial save without throwing', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ highScore: 'lots', achievements: [1, 'heatwave'] }));
    const loaded = loadSave(storage);
    expect(loaded.highScore).toBe(0);
    expect(loaded.achievements).toEqual(['heatwave']);
    expect(loaded.settings).toEqual(createSave().settings);
  });

  it('falls back to the default palette when the selected one is not unlocked', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...createSave(), selectedPalette: 'spectral' }));
    expect(loadSave(storage).selectedPalette).toBe('ember');
  });

  it('tolerates a missing storage backend', () => {
    expect(() => saveSave(null, createSave())).not.toThrow();
    expect(loadSave(null)).toEqual(createSave());
  });
});

describe('recordRun', () => {
  const base = (): SaveData => createSave();

  it('records a new high score', () => {
    const result = recordRun(base(), makeRun({ score: 900 }));
    expect(result.isHighScore).toBe(true);
    expect(result.save.highScore).toBe(900);
  });

  it('keeps the old high score when the run is worse', () => {
    const previous = { ...base(), highScore: 5000 };
    const result = recordRun(previous, makeRun({ score: 900 }));
    expect(result.isHighScore).toBe(false);
    expect(result.save.highScore).toBe(5000);
  });

  it('accumulates lifetime currency and kills', () => {
    let save = base();
    save = recordRun(save, makeRun({ embers: 40, kills: 12 })).save;
    save = recordRun(save, makeRun({ embers: 30, kills: 8 })).save;
    expect(save.totalEmbers).toBe(70);
    expect(save.totalKills).toBe(20);
    expect(save.runs).toBe(2);
  });

  it('does not mutate the previous save', () => {
    const previous = base();
    recordRun(previous, makeRun({ score: 9999, embers: 50 }));
    expect(previous.highScore).toBe(0);
    expect(previous.totalEmbers).toBe(0);
    expect(previous.achievements).toEqual([]);
  });

  it('reports newly unlocked achievements and palettes', () => {
    const result = recordRun(base(), makeRun({ score: 6000, survivalTime: 130, bossesDefeated: 1 }));
    expect(result.newAchievements).toEqual(expect.arrayContaining(['first-flight', 'endurance', 'ashborn-slayer']));
    expect(result.newPalettes).toEqual(expect.arrayContaining(['azure', 'violet', 'verdant']));
    expect(result.save.unlockedPalettes).toContain('violet');
  });

  it('does not report the same unlock twice', () => {
    const first = recordRun(base(), makeRun({ score: 6000 }));
    const second = recordRun(first.save, makeRun({ score: 7000 }));
    expect(second.newPalettes).not.toContain('azure');
    expect(second.newAchievements).not.toContain('first-flight');
  });

  it('keeps the longest survival time across runs', () => {
    let save = base();
    save = recordRun(save, makeRun({ survivalTime: 88 })).save;
    save = recordRun(save, makeRun({ survivalTime: 41 })).save;
    expect(save.longestSurvival).toBe(88);
  });
});
