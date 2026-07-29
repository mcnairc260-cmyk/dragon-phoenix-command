import type {
  Category,
  CompetitionLevel,
  Difficulty,
  GrowthVelocity,
  LocationMode,
  Opportunity,
  OpportunityType,
  TimeWindow,
} from '../types/opportunity';
import type { UserPreferences } from './preferences';

export interface FilterState {
  search: string;
  categories: Category[];
  opportunityTypes: OpportunityType[];
  competitionLevels: CompetitionLevel[];
  difficulties: Difficulty[];
  growthVelocities: GrowthVelocity[];
  timeWindows: TimeWindow[];
  locationModes: LocationMode[];
  maxStartupCost: number | null;
  minScore: number | null;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  categories: [],
  opportunityTypes: [],
  competitionLevels: [],
  difficulties: [],
  growthVelocities: [],
  timeWindows: [],
  locationModes: [],
  maxStartupCost: null,
  minScore: null,
};

export function countActiveFilters(f: FilterState): number {
  return (
    f.categories.length +
    f.opportunityTypes.length +
    f.competitionLevels.length +
    f.difficulties.length +
    f.growthVelocities.length +
    f.timeWindows.length +
    f.locationModes.length +
    (f.maxStartupCost !== null ? 1 : 0) +
    (f.minScore !== null ? 1 : 0)
  );
}

function matchesSearch(o: Opportunity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    o.title,
    o.shortDescription,
    o.fullDescription,
    o.category,
    o.opportunityType,
    o.targetCustomer,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

function inList<T>(list: T[], value: T): boolean {
  return list.length === 0 || list.includes(value);
}

export function applyFilters(opportunities: Opportunity[], f: FilterState): Opportunity[] {
  return opportunities.filter(
    (o) =>
      matchesSearch(o, f.search) &&
      inList(f.categories, o.category) &&
      inList(f.opportunityTypes, o.opportunityType) &&
      inList(f.competitionLevels, o.competitionLevel) &&
      inList(f.difficulties, o.difficulty) &&
      inList(f.growthVelocities, o.growthVelocity) &&
      inList(f.timeWindows, o.timeWindow) &&
      inList(f.locationModes, o.locationMode) &&
      (f.maxStartupCost === null || o.startupCostRange.minUsd <= f.maxStartupCost) &&
      (f.minScore === null || o.score >= f.minScore),
  );
}

export type SortKey =
  | 'score'
  | 'growth'
  | 'competition'
  | 'cost'
  | 'newest'
  | 'bestFit';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Highest Opportunity Score' },
  { key: 'growth', label: 'Fastest growing' },
  { key: 'competition', label: 'Lowest competition' },
  { key: 'cost', label: 'Lowest startup cost' },
  { key: 'newest', label: 'Newest signal' },
  { key: 'bestFit', label: 'Best fit for you' },
];

const GROWTH_ORDER: Record<GrowthVelocity, number> = {
  Explosive: 3,
  Accelerating: 2,
  Rising: 1,
  Steady: 0,
};

const COMPETITION_ORDER: Record<CompetitionLevel, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
};

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

/**
 * Fit score (0–100) against the user's stated preferences.
 * Deliberately coarse — it ranks demo recommendations, nothing more.
 */
export function fitScore(o: Opportunity, prefs: UserPreferences): number {
  let fit = 50;
  if (prefs.preferredCategories.length > 0) {
    fit += prefs.preferredCategories.includes(o.category) ? 25 : -10;
  }
  if (prefs.maxBudgetUsd !== null) {
    fit += o.startupCostRange.minUsd <= prefs.maxBudgetUsd ? 15 : -25;
  }
  const experienceRank = { beginner: 0, intermediate: 1, advanced: 2 }[prefs.experienceLevel];
  const gap = DIFFICULTY_ORDER[o.difficulty] - experienceRank;
  if (gap > 0) fit -= gap * 15; // harder than the user's experience
  if (prefs.riskTolerance === 'low' && o.competitionLevel === 'High') fit -= 10;
  if (prefs.riskTolerance === 'high' && o.growthVelocity === 'Explosive') fit += 10;
  return Math.max(0, Math.min(100, fit));
}

export function sortOpportunities(
  opportunities: Opportunity[],
  key: SortKey,
  prefs?: UserPreferences,
): Opportunity[] {
  const sorted = [...opportunities];
  switch (key) {
    case 'score':
      sorted.sort((a, b) => b.score - a.score);
      break;
    case 'growth':
      sorted.sort(
        (a, b) =>
          GROWTH_ORDER[b.growthVelocity] - GROWTH_ORDER[a.growthVelocity] || b.score - a.score,
      );
      break;
    case 'competition':
      sorted.sort(
        (a, b) =>
          COMPETITION_ORDER[a.competitionLevel] - COMPETITION_ORDER[b.competitionLevel] ||
          b.score - a.score,
      );
      break;
    case 'cost':
      sorted.sort(
        (a, b) => a.startupCostRange.minUsd - b.startupCostRange.minUsd || b.score - a.score,
      );
      break;
    case 'newest':
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
    case 'bestFit': {
      if (!prefs) {
        sorted.sort((a, b) => b.score - a.score);
        break;
      }
      sorted.sort((a, b) => fitScore(b, prefs) - fitScore(a, prefs) || b.score - a.score);
      break;
    }
  }
  return sorted;
}
