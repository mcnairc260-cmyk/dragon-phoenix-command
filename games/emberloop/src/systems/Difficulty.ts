import { BOARD, DIFFICULTY, ENEMY } from '../config/GameConfig';
import { clamp } from '../core/math';

export type EnemyKind = 'cinder' | 'dart' | 'spitter' | 'orbiter' | 'splitter' | 'mine';

export const ENEMY_KINDS: readonly EnemyKind[] = ['cinder', 'dart', 'spitter', 'orbiter', 'splitter', 'mine'];

/** The three behaviours the faction species use (chaser, charger, shooter). */
const FACTION_KINDS: readonly EnemyKind[] = ['cinder', 'dart', 'spitter'];
/** The older procedural enemies, joining as occasional extras. */
const EXTRA_KINDS: readonly EnemyKind[] = ['orbiter', 'splitter', 'mine'];

export interface DifficultySnapshot {
  /** Composite pressure value driving every other number. */
  threat: number;
  spawnInterval: number;
  speedMultiplier: number;
  hpMultiplier: number;
  maxEnemies: number;
  collapseInterval: number;
  /** Enemy kinds currently in the spawn table, with their weights. */
  table: { kind: EnemyKind; weight: number }[];
}

/** Where a run is: board 0–5 within loop 0, 1, 2… (`index` counts boards from the start). */
export interface BoardRef {
  index: number;
  loop: number;
  board: number;
}

export function boardRef(index: number): BoardRef {
  const i = Math.max(0, Math.floor(index));
  return { index: i, loop: Math.floor(i / BOARD.count), board: i % BOARD.count };
}

/**
 * Threat for a point in the board sequence. A pure function of the board and
 * the seconds into its wave — never of player level or collecting speed.
 */
export function boardThreat(index: number, secondsIntoWave: number): number {
  const { loop, board } = boardRef(index);
  const ramp = clamp(secondsIntoWave / BOARD.waveSeconds, 0, 1) * BOARD.inBoardRamp;
  return board * BOARD.boardStep + loop * BOARD.loopStep + ramp;
}

/** Spawn table: the board's faction behaviours, plus the extras once they have joined. */
export function boardTable(index: number): { kind: EnemyKind; weight: number }[] {
  const { loop, board } = boardRef(index);
  const table: { kind: EnemyKind; weight: number }[] = FACTION_KINDS.map((kind) => ({ kind, weight: ENEMY[kind].weight }));
  for (const kind of EXTRA_KINDS) {
    if (loop > 0 || board >= (BOARD.extrasFrom[kind] ?? Infinity)) {
      table.push({ kind, weight: ENEMY[kind].weight * BOARD.extrasWeightMul });
    }
  }
  return table;
}

/** The pressure numbers for a given threat. */
export function difficultyFromThreat(threat: number, table: { kind: EnemyKind; weight: number }[]): DifficultySnapshot {
  const t = Math.max(0, threat);
  const spawnInterval = clamp(
    DIFFICULTY.spawnIntervalStart * Math.pow(DIFFICULTY.spawnIntervalDecay, t),
    DIFFICULTY.spawnIntervalMin,
    DIFFICULTY.spawnIntervalStart,
  );
  const speedMultiplier = clamp(1 + t * DIFFICULTY.speedPerThreat, 1, DIFFICULTY.speedMax);
  // HP steps in whole numbers so enemies never sit at awkward fractional health.
  const hpMultiplier = 1 + Math.floor(t) * DIFFICULTY.hpPerThreat;
  const maxEnemies = Math.round(
    clamp(DIFFICULTY.maxEnemiesStart + t * DIFFICULTY.maxEnemiesPerThreat, DIFFICULTY.maxEnemiesStart, DIFFICULTY.maxEnemiesCap),
  );
  const collapseInterval = clamp(
    DIFFICULTY.collapseIntervalStart - t * 2.2,
    DIFFICULTY.collapseIntervalMin,
    DIFFICULTY.collapseIntervalStart,
  );
  return { threat: t, spawnInterval, speedMultiplier, hpMultiplier, maxEnemies, collapseInterval, table };
}

export function difficultyForBoard(index: number, secondsIntoWave: number): DifficultySnapshot {
  const snapshot = difficultyFromThreat(boardThreat(index, secondsIntoWave), boardTable(index));
  if (index !== 0) return snapshot;
  // The run's first board eases the player in (BOARD.firstBoard).
  const ease = BOARD.firstBoard;
  return {
    ...snapshot,
    spawnInterval: snapshot.spawnInterval * ease.spawnIntervalMul,
    speedMultiplier: snapshot.speedMultiplier * ease.enemySpeedMul,
    maxEnemies: Math.max(3, snapshot.maxEnemies - ease.maxEnemiesLess),
    table: snapshot.table.filter((t) => secondsIntoWave >= (ease.unlockAt[t.kind] ?? 0)),
  };
}

/** Arena sector collapses are held back on the run's first board. */
export function collapsesOn(index: number): boolean {
  return index !== 0;
}

/** Boss HP multiplier: +15% per board, +60% per loop. */
export function bossHpScale(index: number): number {
  const { loop, board } = boardRef(index);
  return 1 + board * BOARD.bossHpPerBoard + loop * BOARD.bossHpPerLoop;
}

export function bossStageHp(stageHp: readonly number[], index: number): number[] {
  const scale = bossHpScale(index);
  return stageHp.map((hp) => Math.round(hp * scale));
}

/** Seconds into a board's wave at which elites arrive. */
export function elitesFor(index: number): number[] {
  const { loop, board } = boardRef(index);
  if (index === 0) return [BOARD.firstBoard.eliteAt];
  const second = loop > 0 || board >= BOARD.secondEliteFromBoard;
  return second ? [...BOARD.eliteAt] : [BOARD.eliteAt[0]];
}
