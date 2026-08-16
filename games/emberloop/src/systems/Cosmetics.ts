/**
 * Phoenix colour palettes. Cosmetic only — nothing here touches gameplay
 * numbers, and the unlock conditions are read from persisted lifetime stats.
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
    core: 0xfff1c9,
    glow: 0xff4d00,
    accent: 0xffb347,
    requirement: 'Unlocked',
    unlocked: () => true,
  },
  {
    id: 'azure',
    name: 'Azure Ghost',
    core: 0xe8fbff,
    glow: 0x00a3ff,
    accent: 0x00e5ff,
    requirement: 'Score 5,000 in a single run',
    unlocked: (s) => s.highScore >= 5000,
  },
  {
    id: 'violet',
    name: 'Violet Ash',
    core: 0xf6e9ff,
    glow: 0x8b2bff,
    accent: 0xd08bff,
    requirement: 'Survive 120 seconds',
    unlocked: (s) => s.longestSurvival >= 120,
  },
  {
    id: 'gold',
    name: 'Molten Gold',
    core: 0xfffbe6,
    glow: 0xffab00,
    accent: 0xffe082,
    requirement: 'Bank 750 total embers',
    unlocked: (s) => s.totalEmbers >= 750,
  },
  {
    id: 'verdant',
    name: 'Verdant Flame',
    core: 0xeaffef,
    glow: 0x00c46a,
    accent: 0x7dffb0,
    requirement: 'Defeat the Ashborn',
    unlocked: (s) => s.bossesDefeated >= 1,
  },
  {
    id: 'spectral',
    name: 'Spectral White',
    core: 0xffffff,
    glow: 0xc9d8ff,
    accent: 0xff5aa8,
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
