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
 * Threat = elapsed minutes. Nothing else.
 *
 * This used to add a term for player level, which meant collecting shards
 * quickly — the whole point of the game — summoned more enemies, faster
 * enemies and tougher enemies. That inverted the incentive: the optimal play
 * was to ignore shards. The clock alone now sets the pressure, so levelling is
 * pure upside and collecting fast is rewarded rather than punished.
 */
export function threatAt(elapsedSeconds: number): number {
  return (Math.max(0, elapsedSeconds) / 60) * DIFFICULTY.threatPerMinute;
}

export function difficultyAt(elapsedSeconds: number): DifficultySnapshot {
  const threat = threatAt(elapsedSeconds);

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

/**
 * Seconds between elite spawns at the given point in a run.
 *
 * Time-based for the same reason threat is: an elite is a big ember payout as
 * much as a threat, and it must not arrive sooner just because the player is
 * collecting well.
 */
export function eliteIntervalAt(elapsedSeconds: number): number {
  const threat = threatAt(elapsedSeconds);
  return clamp(
    DIFFICULTY.eliteIntervalStart - threat * 5,
    DIFFICULTY.eliteIntervalMin,
    DIFFICULTY.eliteIntervalStart,
  );
}

/**
 * Which boss encounter number is due at this time (0 = none yet). Used to name
 * the phase the player is in, so progress through a run is legible.
 */
export function bossPhaseAt(elapsedSeconds: number): number {
  if (elapsedSeconds < DIFFICULTY.firstBossAt) return 0;
  return Math.floor((elapsedSeconds - DIFFICULTY.firstBossAt) / DIFFICULTY.bossInterval) + 1;
}

/** Boss HP per stage scales with how many bosses have already been beaten. */
export function bossStageHp(stageHp: readonly number[], bossIndex: number): number[] {
  const scale = 1 + bossIndex * 0.45;
  return stageHp.map((hp) => Math.round(hp * scale));
}
