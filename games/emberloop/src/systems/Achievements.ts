/** Achievement catalogue and the evaluation of a finished run against it. */

export interface RunSummary {
  score: number;
  survivalTime: number;
  bestCombo: number;
  embers: number;
  level: number;
  kills: number;
  bursts: number;
  bossesDefeated: number;
  legendaryTaken: boolean;
  damageTaken: number;
  /** Longest stretch (seconds) in this run without taking a hit. */
  longestClean: number;
}

export interface LifetimeTotals {
  totalEmbers: number;
  runs: number;
  totalKills: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** True when this run (plus lifetime totals) earns the achievement. */
  earned: (run: RunSummary, totals: LifetimeTotals) => boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-flight',
    name: 'First Flight',
    description: 'Complete your first run.',
    icon: '🪶',
    earned: (_run, totals) => totals.runs >= 1,
  },
  {
    id: 'heatwave',
    name: 'Heatwave',
    description: 'Reach a 25 combo in one run.',
    icon: '🔥',
    earned: (run) => run.bestCombo >= 25,
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Score 10,000 in a single run.',
    icon: '💥',
    earned: (run) => run.score >= 10000,
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Survive 120 seconds.',
    icon: '⏱',
    earned: (run) => run.survivalTime >= 120,
  },
  {
    id: 'ashborn-slayer',
    name: 'Ashborn Slayer',
    description: 'Defeat the Ashborn boss.',
    icon: '👑',
    earned: (run) => run.bossesDefeated >= 1,
  },
  {
    id: 'ascendant',
    name: 'Ascendant',
    description: 'Reach level 10 in one run.',
    icon: '🌟',
    earned: (run) => run.level >= 10,
  },
  {
    id: 'hoarder',
    name: 'Ember Hoarder',
    description: 'Bank 500 embers across all runs.',
    icon: '💎',
    earned: (_run, totals) => totals.totalEmbers >= 500,
  },
  {
    id: 'burst-master',
    name: 'Burst Master',
    description: 'Trigger 10 Phoenix Bursts in one run.',
    icon: '☄',
    earned: (run) => run.bursts >= 10,
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Go 60 seconds without taking damage.',
    icon: '🛡',
    earned: (run) => run.longestClean >= 60,
  },
  {
    id: 'flawless',
    name: 'Flawless Rising',
    description: 'Survive 90 seconds without taking a single hit.',
    icon: '🕊',
    earned: (run) => run.survivalTime >= 90 && run.damageTaken === 0,
  },
  {
    id: 'legendary',
    name: 'Legend Forged',
    description: 'Take a legendary upgrade.',
    icon: '⚜',
    earned: (run) => run.legendaryTaken,
  },
  {
    id: 'exterminator',
    name: 'Exterminator',
    description: 'Destroy 1,000 enemies across all runs.',
    icon: '⚔',
    earned: (_run, totals) => totals.totalKills >= 1000,
  },
];

export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, Achievement> = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/**
 * Return the ids newly earned by this run — i.e. earned now and not already
 * present in `alreadyEarned`.
 */
export function newlyEarned(
  run: RunSummary,
  totals: LifetimeTotals,
  alreadyEarned: readonly string[],
): string[] {
  const have = new Set(alreadyEarned);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.earned(run, totals)).map((a) => a.id);
}
