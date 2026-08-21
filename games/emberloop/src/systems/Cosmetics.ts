import { BRAND, SIGNAL } from '../config/brand';

/**
 * Phoenix colour palettes. Cosmetic only — nothing here touches gameplay
 * numbers, and the unlock conditions are read from persisted lifetime stats.
 *
 * The default "Ember" palette is the Brand Bible trinity exactly: Ghost White
 * body, Ember Orange glow, Rebirth Gold accent. Unlockables are variations on
 * that structure rather than free-for-all colours.
 */

export interface Palette {
  id: string;
  name: string;
  /** Core body colour. */
  core: number;
  /** Outer glow / trail colour. */
  glow: number;
  /** Accent used for wings, burst ring and HUD highlights. */
  accent: number;
  /** Human-readable unlock requirement. */
  requirement: string;
  /** Returns true when the lifetime stats satisfy the unlock. */
  unlocked: (stats: LifetimeStats) => boolean;
}

export interface LifetimeStats {
  highScore: number;
  longestSurvival: number;
  totalEmbers: number;
  bossesDefeated: number;
  achievements: number;
  runs: number;
}

export const PALETTES: readonly Palette[] = [
  {
    id: 'ember',
    name: 'Ember',
    core: BRAND.ghostWhite,
    glow: BRAND.emberOrange,
    accent: BRAND.rebirthGold,
    requirement: 'Unlocked',
    unlocked: () => true,
  },
  {
    id: 'azure',
    name: 'Azure Ghost',
    core: BRAND.ghostWhite,
    glow: BRAND.signalCyan,
    accent: 0x7ff0ff,
    requirement: 'Score 5,000 in a single run',
    unlocked: (s) => s.highScore >= 5000,
  },
  {
    id: 'violet',
    name: 'Violet Ash',
    core: BRAND.ghostWhite,
    glow: SIGNAL.violet,
    accent: 0xe0b3ff,
    requirement: 'Survive 120 seconds',
    unlocked: (s) => s.longestSurvival >= 120,
  },
  {
    id: 'gold',
    name: 'Molten Gold',
    core: BRAND.ghostWhite,
    glow: BRAND.rebirthGold,
    accent: 0xffe08a,
    requirement: 'Bank 750 total embers',
    unlocked: (s) => s.totalEmbers >= 750,
  },
  {
    id: 'verdant',
    name: 'Verdant Flame',
    core: BRAND.ghostWhite,
    glow: 0x2ce6a4,
    accent: 0x9dffd8,
    requirement: 'Defeat the Ashborn',
    unlocked: (s) => s.bossesDefeated >= 1,
  },
  {
    id: 'spectral',
    name: 'Spectral White',
    core: 0xffffff,
    glow: BRAND.steel,
    accent: SIGNAL.magenta,
    requirement: 'Earn 6 achievements',
    unlocked: (s) => s.achievements >= 6,
  },
];

export const PALETTES_BY_ID: ReadonlyMap<string, Palette> = new Map(PALETTES.map((p) => [p.id, p]));

export const DEFAULT_PALETTE = PALETTES[0];

export function getPalette(id: string | undefined): Palette {
  return (id && PALETTES_BY_ID.get(id)) || DEFAULT_PALETTE;
}

/** Ids of every palette whose unlock condition the given stats satisfy. */
export function unlockedPaletteIds(stats: LifetimeStats): string[] {
  return PALETTES.filter((p) => p.unlocked(stats)).map((p) => p.id);
}
