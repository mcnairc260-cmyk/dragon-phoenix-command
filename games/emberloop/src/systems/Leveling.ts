import { XP } from '../config/GameConfig';

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return Math.round(XP.base * Math.pow(XP.growth, l - 1) + (l - 1) * XP.linear);
}

export interface LevelState {
  level: number;
  xp: number;
  xpToNext: number;
}

export function createLevelState(): LevelState {
  return { level: 1, xp: 0, xpToNext: xpForLevel(1) };
}

/**
 * Add XP and return how many levels were gained. Handles multi-level gains from
 * a single large pickup (e.g. a boss stage clear) by looping.
 */
export function addXp(state: LevelState, amount: number, xpMul = 1): number {
  state.xp += amount * xpMul;
  let gained = 0;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = xpForLevel(state.level);
    gained += 1;
  }
  return gained;
}

/** 0..1 progress through the current level, for the XP bar. */
export function levelProgress(state: LevelState): number {
  if (state.xpToNext <= 0) return 0;
  return Math.min(1, state.xp / state.xpToNext);
}
