import { describe, expect, it } from 'vitest';
import { BOARD, DIFFICULTY } from '../config/GameConfig';
import { boardRef, boardTable, boardThreat, bossHpScale, bossStageHp, collapsesOn, difficultyForBoard, elitesFor } from './Difficulty';

const start = (index: number) => boardThreat(index, 0);
const end = (index: number) => boardThreat(index, BOARD.waveSeconds);

describe('boards', () => {
  it('numbers boards 0–5 within loops', () => {
    expect(boardRef(0)).toEqual({ index: 0, loop: 0, board: 0 });
    expect(boardRef(5)).toEqual({ index: 5, loop: 0, board: 5 });
    expect(boardRef(6)).toEqual({ index: 6, loop: 1, board: 0 });
    expect(boardRef(13)).toEqual({ index: 13, loop: 2, board: 1 });
  });

  it('makes each board a little harder than the last within a loop', () => {
    for (let i = 1; i < 6; i++) {
      expect(start(i)).toBeGreaterThan(start(i - 1));
      expect(start(i) - start(i - 1)).toBeLessThanOrEqual(0.5); // "not a lot"
    }
  });

  it('ramps gently across a single board', () => {
    expect(end(0) - start(0)).toBeCloseTo(BOARD.inBoardRamp);
    expect(boardThreat(0, 9999)).toBeCloseTo(end(0));
  });

  it('makes every loop-2 board harder than its loop-1 twin', () => {
    for (let b = 0; b < 6; b++) expect(start(6 + b)).toBeGreaterThan(start(b));
  });

  it('lets loop 2 start below where loop 1 ended, so looping back is not a wall', () => {
    expect(start(6)).toBeLessThan(start(5));
    expect(start(6)).toBeGreaterThan(start(2));
  });

  it('depends only on the board and the seconds into it (never player level)', () => {
    expect(boardThreat.length).toBe(2);
    expect(difficultyForBoard(4, 30)).toEqual(difficultyForBoard(4, 30));
  });
});

describe('board spawn tables', () => {
  it('opens with only the faction behaviours', () => {
    expect(boardTable(0).map((t) => t.kind)).toEqual(['cinder', 'dart', 'spitter']);
  });

  it('adds the older enemies as extras, one board at a time, at reduced weight', () => {
    expect(boardTable(1).map((t) => t.kind)).toContain('orbiter');
    expect(boardTable(1).map((t) => t.kind)).not.toContain('splitter');
    expect(boardTable(3).map((t) => t.kind)).toEqual(['cinder', 'dart', 'spitter', 'orbiter', 'splitter', 'mine']);
    expect(boardTable(6)).toHaveLength(6); // loop 2 keeps them all
  });
});

describe('pressure numbers', () => {
  it('respects every floor and cap even far into the loops', () => {
    const extreme = difficultyForBoard(60, 60);
    expect(extreme.spawnInterval).toBeGreaterThanOrEqual(DIFFICULTY.spawnIntervalMin);
    expect(extreme.speedMultiplier).toBeLessThanOrEqual(DIFFICULTY.speedMax);
    expect(extreme.maxEnemies).toBeLessThanOrEqual(DIFFICULTY.maxEnemiesCap);
    expect(extreme.collapseInterval).toBeGreaterThanOrEqual(DIFFICULTY.collapseIntervalMin);
  });

  it('spawns faster and allows more enemies on later boards', () => {
    expect(difficultyForBoard(5, 0).spawnInterval).toBeLessThan(difficultyForBoard(0, 0).spawnInterval);
    expect(difficultyForBoard(5, 0).maxEnemies).toBeGreaterThan(difficultyForBoard(0, 0).maxEnemies);
  });
});

describe('bosses and elites per board', () => {
  it('scales boss HP gently by board and more by loop', () => {
    expect(bossHpScale(0)).toBe(1);
    expect(bossHpScale(5)).toBeCloseTo(1.75);
    expect(bossHpScale(6)).toBeCloseTo(1.6);
    expect(bossHpScale(11)).toBeGreaterThan(bossHpScale(5));
    expect(bossStageHp([10, 20, 30], 0)).toEqual([10, 20, 30]);
  });

  it('sends one elite early on, two from board 4 and in later loops', () => {
    expect(elitesFor(0)).toHaveLength(1);
    expect(elitesFor(3)).toHaveLength(2);
    expect(elitesFor(6)).toHaveLength(2);
  });
});

describe('first-board onboarding (founder feedback: the start was too hard)', () => {
  it('brings enemy types in one at a time on the first board only', () => {
    const kinds = (s: number) => difficultyForBoard(0, s).table.map((t) => t.kind);
    expect(kinds(0)).toEqual(['cinder']);
    expect(kinds(15)).toEqual(['cinder', 'dart']);
    expect(kinds(30)).toEqual(['cinder', 'dart', 'spitter']);
    expect(difficultyForBoard(1, 0).table.map((t) => t.kind)).toContain('spitter');
  });

  it('thins spawns, holds back collapses and delays the elite on the first board', () => {
    expect(difficultyForBoard(0, 0).spawnInterval).toBeGreaterThan(difficultyForBoard(6, 0).spawnInterval);
    expect(difficultyForBoard(0, 0).maxEnemies).toBeLessThan(DIFFICULTY.maxEnemiesStart);
    expect(collapsesOn(0)).toBe(false);
    expect(collapsesOn(1)).toBe(true);
    expect(elitesFor(0)).toEqual([BOARD.firstBoard.eliteAt]);
  });

  it('does not ease loop 2 board 1', () => {
    expect(difficultyForBoard(6, 0).table).toHaveLength(6);
  });
});
