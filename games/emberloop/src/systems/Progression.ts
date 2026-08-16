import { STORAGE_KEY } from '../config/GameConfig';
import { newlyEarned, type LifetimeTotals, type RunSummary } from './Achievements';
import { unlockedPaletteIds, type LifetimeStats } from './Cosmetics';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  version: 1;
  highScore: number;
  longestSurvival: number;
  bestCombo: number;
  totalEmbers: number;
  totalKills: number;
  runs: number;
  bossesDefeated: number;
  achievements: string[];
  unlockedPalettes: string[];
  selectedPalette: string;
  tutorialSeen: boolean;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: true,
  haptics: true,
  reducedMotion: false,
};

export function createSave(): SaveData {
  return {
    version: 1,
    highScore: 0,
    longestSurvival: 0,
    bestCombo: 0,
    totalEmbers: 0,
    totalKills: 0,
    runs: 0,
    bossesDefeated: 0,
    achievements: [],
    unlockedPalettes: ['ember'],
    selectedPalette: 'ember',
    tutorialSeen: false,
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Storage shape we need — lets tests inject a fake instead of touching the DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function coerceNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Load a save, repairing anything malformed. A corrupt or partial save must
 * never block a player from starting a run, so every field falls back.
 */
export function loadSave(storage: StorageLike | null | undefined): SaveData {
  const base = createSave();
  if (!storage) return base;
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return base; // Private-mode Safari can throw on access.
  }
  if (!raw) return base;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!parsed || typeof parsed !== 'object') return base;
  const data = parsed as Partial<SaveData> & Record<string, unknown>;

  const settings = (data.settings ?? {}) as Partial<Settings>;
  const merged: SaveData = {
    version: 1,
    highScore: coerceNumber(data.highScore),
    longestSurvival: coerceNumber(data.longestSurvival),
    bestCombo: coerceNumber(data.bestCombo),
    totalEmbers: coerceNumber(data.totalEmbers),
    totalKills: coerceNumber(data.totalKills),
    runs: coerceNumber(data.runs),
    bossesDefeated: coerceNumber(data.bossesDefeated),
    achievements: coerceStringArray(data.achievements),
    unlockedPalettes: coerceStringArray(data.unlockedPalettes),
    selectedPalette: typeof data.selectedPalette === 'string' ? data.selectedPalette : 'ember',
    tutorialSeen: data.tutorialSeen === true,
    settings: {
      sound: settings.sound !== false,
      music: settings.music !== false,
      haptics: settings.haptics !== false,
      reducedMotion: settings.reducedMotion === true,
    },
  };

  // Re-derive cosmetics so an unlock added in a later version appears retroactively.
  merged.unlockedPalettes = mergeUnique(merged.unlockedPalettes, unlockedPaletteIds(toLifetimeStats(merged)));
  if (!merged.unlockedPalettes.includes(merged.selectedPalette)) merged.selectedPalette = 'ember';
  return merged;
}

export function saveSave(storage: StorageLike | null | undefined, data: SaveData): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode — progression is a nicety, never a hard failure.
  }
}

function mergeUnique(a: readonly string[], b: readonly string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

export function toLifetimeStats(save: SaveData): LifetimeStats {
  return {
    highScore: save.highScore,
    longestSurvival: save.longestSurvival,
    totalEmbers: save.totalEmbers,
    bossesDefeated: save.bossesDefeated,
    achievements: save.achievements.length,
    runs: save.runs,
  };
}

export interface RunRecordResult {
  save: SaveData;
  newAchievements: string[];
  newPalettes: string[];
  isHighScore: boolean;
}

/**
 * Fold a finished run into the save. Pure: returns a new SaveData rather than
 * mutating, which keeps "what did this run unlock?" trivially answerable.
 */
export function recordRun(previous: SaveData, run: RunSummary): RunRecordResult {
  const save: SaveData = {
    ...previous,
    achievements: [...previous.achievements],
    unlockedPalettes: [...previous.unlockedPalettes],
    settings: { ...previous.settings },
  };

  const isHighScore = run.score > save.highScore;
  save.highScore = Math.max(save.highScore, Math.round(run.score));
  save.longestSurvival = Math.max(save.longestSurvival, run.survivalTime);
  save.bestCombo = Math.max(save.bestCombo, run.bestCombo);
  save.totalEmbers += run.embers;
  save.totalKills += run.kills;
  save.bossesDefeated += run.bossesDefeated;
  save.runs += 1;

  const totals: LifetimeTotals = {
    totalEmbers: save.totalEmbers,
    runs: save.runs,
    totalKills: save.totalKills,
  };
  const newAchievements = newlyEarned(run, totals, save.achievements);
  save.achievements = [...save.achievements, ...newAchievements];

  const beforePalettes = new Set(save.unlockedPalettes);
  const afterPalettes = unlockedPaletteIds(toLifetimeStats(save));
  const newPalettes = afterPalettes.filter((id) => !beforePalettes.has(id));
  save.unlockedPalettes = mergeUnique(save.unlockedPalettes, afterPalettes);

  return { save, newAchievements, newPalettes, isHighScore };
}

/** Convenience singleton around window.localStorage for the running game. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
