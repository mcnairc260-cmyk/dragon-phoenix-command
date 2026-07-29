import type { Category } from '../types/opportunity';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type RiskTolerance = 'low' | 'medium' | 'high';

export interface UserPreferences {
  displayName: string;
  preferredCategories: Category[];
  maxBudgetUsd: number | null;
  experienceLevel: ExperienceLevel;
  riskTolerance: RiskTolerance;
  emailAlerts: boolean;
  weeklyDigest: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: '',
  preferredCategories: [],
  maxBudgetUsd: null,
  experienceLevel: 'intermediate',
  riskTolerance: 'medium',
  emailAlerts: false,
  weeklyDigest: false,
  reducedMotion: false,
};

const STORAGE_KEY = 'or:preferences:v1';

/** Swappable persistence seam — replace with an account-backed store post-auth. */
export interface PreferencesStore {
  load(): UserPreferences;
  save(prefs: UserPreferences): void;
}

export class LocalPreferencesStore implements PreferencesStore {
  load(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  save(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage unavailable (private mode / quota) — preferences stay in memory only.
    }
  }
}
