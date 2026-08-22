import { SCORING } from '../config/GameConfig';
import { clamp } from '../core/math';

/**
 * Score / Heat / combo model — deliberately pure so it can be unit tested and
 * reasoned about without running the game.
 *
 * Heat is the visual "how alive is my combo" bar: it is simply the fraction of
 * the combo timer remaining, so it drains visibly and refills on every risky act.
 */
export interface ScoreState {
  score: number;
  combo: number;
  bestCombo: number;
  comboTimer: number;
  comboDuration: number;
  multiplier: number;
  embers: number;
  nearMisses: number;
  kills: number;
}

export function createScoreState(comboDurationMul = 1): ScoreState {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    comboDuration: SCORING.baseComboDuration * comboDurationMul,
    multiplier: 1,
    embers: 0,
    nearMisses: 0,
    kills: 0,
  };
}

/** Multiplier grows one step per `comboPerStep` chained actions, capped. */
export function multiplierForCombo(combo: number): number {
  const steps = Math.floor(combo / SCORING.comboPerStep);
  return clamp(1 + steps * SCORING.multiplierStep, 1, SCORING.maxMultiplier);
}

/** 0..1 Heat meter derived from the remaining combo time. */
export function heatFraction(state: ScoreState): number {
  if (state.comboDuration <= 0) return 0;
  return clamp(state.comboTimer / state.comboDuration, 0, 1);
}

function bumpCombo(state: ScoreState, amount: number): void {
  state.combo += amount;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboTimer = state.comboDuration;
  state.multiplier = multiplierForCombo(state.combo);
}

/** Award raw points through the current multiplier. Returns points added. */
export function addPoints(state: ScoreState, base: number): number {
  const gained = Math.round(base * state.multiplier);
  state.score += gained;
  return gained;
}

export function scoreNearMiss(state: ScoreState, nearMissMul = 1): number {
  state.nearMisses += 1;
  bumpCombo(state, 1);
  return addPoints(state, SCORING.nearMissScore * nearMissMul);
}

export function scoreEmber(state: ScoreState, emberValueMul = 1): number {
  state.embers += 1;
  bumpCombo(state, 1);
  return addPoints(state, SCORING.emberScore * emberValueMul);
}

export function scoreKill(state: ScoreState, base: number = SCORING.killScore): number {
  state.kills += 1;
  return addPoints(state, base);
}

/** Passive survival score. Not combo-bumping, but still multiplied. */
export function scoreTime(state: ScoreState, dt: number): number {
  const gained = SCORING.scorePerSecond * dt * state.multiplier;
  state.score += gained;
  return gained;
}

/** Advance the combo timer; combo collapses to zero when it runs out. */
export function tickCombo(state: ScoreState, dt: number): void {
  if (state.comboTimer <= 0) return;
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer === 0) {
    state.combo = 0;
    state.multiplier = 1;
  }
}

/** Taking a hit costs the player their combo — risk has a price. */
export function breakCombo(state: ScoreState): void {
  state.combo = 0;
  state.comboTimer = 0;
  state.multiplier = 1;
}

export function isAscended(state: ScoreState): boolean {
  return state.multiplier >= SCORING.ascendedMultiplier;
}
