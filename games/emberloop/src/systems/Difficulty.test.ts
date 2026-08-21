import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMY_UNLOCK } from '../config/GameConfig';
import { bossPhaseAt, bossStageHp, bossTimeFor, difficultyAt, eliteIntervalAt, threatAt } from './Difficulty';

describe('threatAt', () => {
  it('is zero at the start of a run', () => {
    expect(threatAt(0)).toBe(0);
  });

  it('rises with elapsed time', () => {
    expect(threatAt(60)).toBeCloseTo(1);
    expect(threatAt(120)).toBeCloseTo(2);
  });

  it('never goes negative', () => {
    expect(threatAt(-30)).toBe(0);
  });
});

/**
 * The central design rule, and the reason this file exists: collecting shards
 * quickly must never make the game harder. Difficulty is a function of the
 * clock alone, so levelling is pure upside.
 */
describe('difficulty is independent of player progress', () => {
  it('depends only on elapsed time', () => {
    // Same instant, and there is no other input that could change the answer.
    expect(difficultyAt(90)).toEqual(difficultyAt(90));
  });

  it('takes no player-level argument at all', () => {
    expect(threatAt.length).toBe(1);
    expect(difficultyAt.length).toBe(1);
  });

  it('gives identical pressure at a given time regardless of how the run went', () => {
    const at120 = difficultyAt(120);
    expect(at120.spawnInterval).toBe(difficultyAt(120).spawnInterval);
    expect(at120.maxEnemies).toBe(difficultyAt(120).maxEnemies);
    expect(at120.speedMultiplier).toBe(difficultyAt(120).speedMultiplier);
  });
});

describe('difficultyAt', () => {
  it('spawns slower at the start than later', () => {
    expect(difficultyAt(180).spawnInterval).toBeLessThan(difficultyAt(0).spawnInterval);
  });

  it('never drops below the minimum spawn interval', () => {
    expect(difficultyAt(3600).spawnInterval).toBeGreaterThanOrEqual(DIFFICULTY.spawnIntervalMin);
  });

  it('caps enemy speed and enemy count', () => {
    const extreme = difficultyAt(3600);
    expect(extreme.speedMultiplier).toBeLessThanOrEqual(DIFFICULTY.speedMax);
    expect(extreme.maxEnemies).toBeLessThanOrEqual(DIFFICULTY.maxEnemiesCap);
  });

  it('increases monotonically in pressure over a run', () => {
    let previousEnemies = 0;
    let previousInterval = Infinity;
    for (let t = 0; t <= 300; t += 30) {
      const d = difficultyAt(t);
      expect(d.maxEnemies).toBeGreaterThanOrEqual(previousEnemies);
      expect(d.spawnInterval).toBeLessThanOrEqual(previousInterval);
      previousEnemies = d.maxEnemies;
      previousInterval = d.spawnInterval;
    }
  });

  it('only offers cinders in the opening seconds', () => {
    expect(difficultyAt(0).table.map((t) => t.kind)).toEqual(['cinder']);
  });

  it('unlocks each archetype at its configured time', () => {
    for (const [kind, unlockAt] of Object.entries(ENEMY_UNLOCK)) {
      const before = difficultyAt(Math.max(0, unlockAt - 1)).table.map((t) => t.kind);
      const after = difficultyAt(unlockAt).table.map((t) => t.kind);
      if (unlockAt > 0) expect(before).not.toContain(kind);
      expect(after).toContain(kind);
    }
  });

  it('unlocks all six archetypes by 100 seconds', () => {
    expect(difficultyAt(100).table).toHaveLength(6);
  });

  it('shortens the arena collapse interval but respects its floor', () => {
    expect(difficultyAt(0).collapseInterval).toBe(DIFFICULTY.collapseIntervalStart);
    expect(difficultyAt(600).collapseInterval).toBe(DIFFICULTY.collapseIntervalMin);
  });
});

describe('elite scheduling', () => {
  it('is time-based, so collecting fast never summons elites sooner', () => {
    expect(eliteIntervalAt.length).toBe(1);
    expect(eliteIntervalAt(0)).toBe(DIFFICULTY.eliteIntervalStart);
  });

  it('tightens as the run goes on, down to a floor', () => {
    expect(eliteIntervalAt(120)).toBeLessThan(eliteIntervalAt(0));
    expect(eliteIntervalAt(3600)).toBe(DIFFICULTY.eliteIntervalMin);
  });
});

describe('bosses', () => {
  it('schedules the first boss early enough that a normal run meets one', () => {
    expect(bossTimeFor(0)).toBe(DIFFICULTY.firstBossAt);
    expect(DIFFICULTY.firstBossAt).toBeLessThanOrEqual(90);
  });

  it('repeats on a fixed interval', () => {
    expect(bossTimeFor(1)).toBe(DIFFICULTY.firstBossAt + DIFFICULTY.bossInterval);
    expect(bossTimeFor(2)).toBe(DIFFICULTY.firstBossAt + DIFFICULTY.bossInterval * 2);
  });

  it('scales stage HP with each subsequent boss', () => {
    const first = bossStageHp([10, 20, 30], 0);
    const second = bossStageHp([10, 20, 30], 1);
    expect(first).toEqual([10, 20, 30]);
    expect(second[0]).toBeGreaterThan(first[0]);
    expect(second).toHaveLength(3);
  });

  it('reports the phase the run is in', () => {
    expect(bossPhaseAt(0)).toBe(0);
    expect(bossPhaseAt(DIFFICULTY.firstBossAt - 1)).toBe(0);
    expect(bossPhaseAt(DIFFICULTY.firstBossAt)).toBe(1);
    expect(bossPhaseAt(DIFFICULTY.firstBossAt + DIFFICULTY.bossInterval)).toBe(2);
  });
});
