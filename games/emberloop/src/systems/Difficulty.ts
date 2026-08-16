import { DIFFICULTY, ENEMY, ENEMY_UNLOCK } from '../config/GameConfig';
import { clamp } from '../core/math';

export type EnemyKind = 'cinder' | 'dart' | 'spitter' | 'orbiter' | 'splitter' | 'mine';

export const ENEMY_KINDS: readonly EnemyKind[] = ['cinder', 'dart', 'spitter', 'orbiter', 'splitter', 'mine'];

export interface DifficultySnapshot {
  /** Composite pressure value driving every other number. */
  threat: number;
  spawnInterval: number;
  speedMultiplier: number;
  hpMultiplier: number;
  maxEnemies: number;
  collapseInterval: number;
  /** Enemy kinds currently unlocked, with their spawn weights. */
  table: { kind: EnemyKind; weight: number }[];
}

/**
 * Threat = elapsed minutes + a contribution from player level.
 *
 * Levelling is player-driven, so an aggressive player who collects fast pulls
 * the difficulty forward: the game keeps pace with skill rather than only clock.
 */
export function threatAt(elapsedSeconds: number, playerLevel: number): number {
  const timeThreat = (elapsedSeconds / 60) * DIFFICULTY.threatPerMinute;
  const levelThreat = Math.max(0, playerLevel - 1) * DIFFICULTY.threatPerLevel;
  return timeThreat + levelThreat;
}

export function difficultyAt(elapsedSeconds: number, playerLevel: number): DifficultySnapshot {
  const threat = threatAt(elapsedSeconds, playerLevel);

  const spawnInterval = clamp(
    DIFFICULTY.spawnIntervalStart * Math.pow(DIFFICULTY.spawnIntervalDecay, threat),
    DIFFICULTY.spawnIntervalMin,
    DIFFICULTY.spawnIntervalStart,
  );

  const speedMultiplier = clamp(1 + threat * DIFFICULTY.speedPerThreat, 1, DIFFICULTY.speedMax);

  // HP steps in whole numbers so enemies never sit at awkward fractional health.
  const hpMultiplier = 1 + Math.floor(threat) * DIFFICULTY.hpPerThreat;

  const maxEnemies = Math.round(
    clamp(
      DIFFICULTY.maxEnemiesStart + threat * DIFFICULTY.maxEnemiesPerThreat,
      DIFFICULTY.maxEnemiesStart,
      DIFFICULTY.maxEnemiesCap,
    ),
  );

  const collapseInterval = clamp(
    DIFFICULTY.collapseIntervalStart - threat * 2.2,
    DIFFICULTY.collapseIntervalMin,
    DIFFICULTY.collapseIntervalStart,
  );

  const table = ENEMY_KINDS.filter((kind) => elapsedSeconds >= (ENEMY_UNLOCK[kind] ?? 0)).map((kind) => ({
    kind,
    weight: ENEMY[kind].weight,
  }));

  return { threat, spawnInterval, speedMultiplier, hpMultiplier, maxEnemies, collapseInterval, table };
}

/** Elapsed time (seconds) at which boss number `index` (0-based) appears. */
export function bossTimeFor(index: number): number {
  return DIFFICULTY.firstBossAt + index * DIFFICULTY.bossInterval;
}

/** True when a level-up should also spawn an elite. */
export function shouldSpawnElite(level: number): boolean {
  return level > 1 && level % DIFFICULTY.eliteEveryLevels === 0;
}

/** Boss HP per stage scales with how many bosses have already been beaten. */
export function bossStageHp(stageHp: readonly number[], bossIndex: number): number[] {
  const scale = 1 + bossIndex * 0.45;
  return stageHp.map((hp) => Math.round(hp * scale));
}
