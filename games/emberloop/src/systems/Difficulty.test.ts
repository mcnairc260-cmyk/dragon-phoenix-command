import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMY_UNLOCK } from '../config/GameConfig';
import { bossStageHp, bossTimeFor, difficultyAt, shouldSpawnElite, threatAt } from './Difficulty';

describe('threatAt', () => {
  it('is zero at the start of a run', () => {
    expect(threatAt(0, 1)).toBe(0);
  });

  it('rises with elapsed time', () => {
    expect(threatAt(60, 1)).toBeCloseTo(1);
    expect(threatAt(120, 1)).toBeCloseTo(2);
  });

  it('rises with player level as well as time', () => {
    expect(threatAt(0, 5)).toBeCloseTo(4 * DIFFICULTY.threatPerLevel);
    expect(threatAt(60, 5)).toBeGreaterThan(threatAt(60, 1));
  });
});

describe('difficultyAt', () => {
  it('spawns slower at the start than later', () => {
    const early = difficultyAt(0, 1);
    const late = difficultyAt(180, 8);
    expect(late.spawnInterval).toBeLessThan(early.spawnInterval);
  });

  it('never drops below the minimum spawn interval', () => {
    const extreme = difficultyAt(3600, 40);
    expect(extreme.spawnInterval).toBeGreaterThanOrEqual(DIFFICULTY.spawnIntervalMin);
  });

  it('caps enemy speed and enemy count', () => {
    const extreme = difficultyAt(3600, 40);
    expect(extreme.speedMultiplier).toBeLessThanOrEqual(DIFFICULTY.speedMax);
    expect(extreme.maxEnemies).toBeLessThanOrEqual(DIFFICULTY.maxEnemiesCap);
  });

  it('increases monotonically in pressure over a run', () => {
    let previousEnemies = 0;
    let previousInterval = Infinity;
    for (let t = 0; t <= 300; t += 30) {
      const d = difficultyAt(t, 1);
      expect(d.maxEnemies).toBeGreaterThanOrEqual(previousEnemies);
      expect(d.spawnInterval).toBeLessThanOrEqual(previousInterval);
      previousEnemies = d.maxEnemies;
      previousInterval = d.spawnInterval;
    }
  });

  it('only offers cinders in the opening seconds', () => {
    expect(difficultyAt(0, 1).table.map((t) => t.kind)).toEqual(['cinder']);
  });

  it('unlocks each archetype at its configured time', () => {
    for (const [kind, unlockAt] of Object.entries(ENEMY_UNLOCK)) {
      const before = difficultyAt(Math.max(0, unlockAt - 1), 1).table.map((t) => t.kind);
      const after = difficultyAt(unlockAt, 1).table.map((t) => t.kind);
      if (unlockAt > 0) expect(before).not.toContain(kind);
      expect(after).toContain(kind);
    }
  });

  it('unlocks all six archetypes by 100 seconds', () => {
    expect(difficultyAt(100, 1).table).toHaveLength(6);
  });

  it('shortens the arena collapse interval but respects its floor', () => {
    expect(difficultyAt(0, 1).collapseInterval).toBe(DIFFICULTY.collapseIntervalStart);
    expect(difficultyAt(600, 20).collapseInterval).toBe(DIFFICULTY.collapseIntervalMin);
  });
});

describe('bosses and elites', () => {
  it('schedules the first boss at the configured time and repeats', () => {
    expect(bossTimeFor(0)).toBe(DIFFICULTY.firstBossAt);
    expect(bossTimeFor(1)).toBe(DIFFICULTY.firstBossAt + DIFFICULTY.bossInterval);
  });

  it('scales boss stage HP with each subsequent boss', () => {
    const first = bossStageHp([10, 20, 30], 0);
    const second = bossStageHp([10, 20, 30], 1);
    expect(first).toEqual([10, 20, 30]);
    expect(second[0]).toBeGreaterThan(first[0]);
    expect(second).toHaveLength(3);
  });

  it('spawns an elite every N levels but never at level 1', () => {
    expect(shouldSpawnElite(1)).toBe(false);
    expect(shouldSpawnElite(DIFFICULTY.eliteEveryLevels)).toBe(true);
    expect(shouldSpawnElite(DIFFICULTY.eliteEveryLevels + 1)).toBe(false);
    expect(shouldSpawnElite(DIFFICULTY.eliteEveryLevels * 2)).toBe(true);
  });
});
