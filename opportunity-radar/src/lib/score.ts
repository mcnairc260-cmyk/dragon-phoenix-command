import type { ScoreComponents } from '../types/opportunity';

/**
 * Opportunity Score — transparent weighted average of six 0–100 factors.
 * Weights are product policy; change them here and the whole app follows.
 */
export const SCORE_WEIGHTS: Record<keyof ScoreComponents, number> = {
  marketGrowth: 0.25,
  competitionAdvantage: 0.2,
  revenuePotential: 0.2,
  timingUrgency: 0.15,
  easeOfExecution: 0.1,
  dataConfidence: 0.1,
};

export const SCORE_FACTOR_LABELS: Record<keyof ScoreComponents, string> = {
  marketGrowth: 'Market growth',
  competitionAdvantage: 'Competition advantage',
  revenuePotential: 'Revenue potential',
  timingUrgency: 'Timing & urgency',
  easeOfExecution: 'Ease of execution',
  dataConfidence: 'Data confidence',
};

export interface ScoreBand {
  min: number;
  label: 'Exceptional' | 'Strong' | 'Promising' | 'Watch' | 'Early / Uncertain';
  /** CSS variable name; components resolve it — no hex values in logic. */
  colorVar: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { min: 90, label: 'Exceptional', colorVar: '--or-gold' },
  { min: 80, label: 'Strong', colorVar: '--or-cyan' },
  { min: 70, label: 'Promising', colorVar: '--or-green' },
  { min: 60, label: 'Watch', colorVar: '--or-muted' },
  { min: 0, label: 'Early / Uncertain', colorVar: '--or-smoke' },
];

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Compute the 0–100 Opportunity Score from its components.
 * Rounds to a whole number — decimals would imply precision the data doesn't have.
 */
export function computeScore(components: ScoreComponents): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreComponents)[]).reduce(
    (sum, key) => sum + clamp(components[key]) * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(clamp(total));
}

export function scoreBand(score: number): ScoreBand {
  const band = SCORE_BANDS.find((b) => score >= b.min);
  return band ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

export const SCORE_EXPLANATION =
  'The Opportunity Score is a weighted blend of six factors: market growth (25%), ' +
  'competition advantage (20%), revenue potential (20%), timing & urgency (15%), ' +
  'ease of execution (10%), and data confidence (10%). Scores from demonstration ' +
  'data are estimates for illustration — not verified market analysis.';
