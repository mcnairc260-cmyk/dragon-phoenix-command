/**
 * Ultimates (founder decision 2026-11-20: ultimates replace the Phoenix Burst,
 * and releasing your finger is the control).
 *
 * Every run starts with the Phoenix Burst as the phoenix's innate ultimate.
 * Taking the Ascension Shard (level 1) lets the player trade it for the
 * elemental ultimate of one element shard they own; Ascension levels 2–3
 * raise its power and evolve the phoenix (Awakened → Radiant → Transcendent).
 * One ultimate per run. The charge meter and release control are the ones the
 * Burst always used.
 *
 * Pure data: no Phaser, unit-tested. The effects run in scenes/UltimateController.
 */
import { BRAND, SIGNAL } from '../config/brand';
import type { UpgradeLevels } from './UpgradeDefs';

export type UltimateId =
  | 'burst'
  | 'supernova'
  | 'absolute-zero'
  | 'void-collapse'
  | 'worldroot'
  | 'storm-apocalypse'
  | 'celestial';

export interface UltimateDef {
  id: UltimateId;
  name: string;
  /** Element shard that unlocks it (null = the innate Burst). */
  element: string | null;
  color: number;
  /** One line for the choice card and How to Play. */
  blurb: string;
  /** Seconds the effect stays active; the next cast waits at least this long. */
  duration: number;
}

export const ULTIMATES: readonly UltimateDef[] = [
  {
    id: 'burst',
    name: 'Phoenix Burst',
    element: null,
    color: BRAND.rebirthGold,
    blurb: 'A blast that damages everything nearby and clears enemy bullets.',
    duration: 0,
  },
  {
    id: 'supernova',
    name: 'Phoenix Supernova',
    element: 'ember',
    color: BRAND.emberOrange,
    blurb: 'A huge fire explosion that sets enemies burning and wipes bullets. Brief protection while it fires.',
    duration: 3,
  },
  {
    id: 'absolute-zero',
    name: 'Absolute Zero',
    element: 'frost',
    color: BRAND.signalCyan,
    blurb: 'An expanding frost wave freezes enemies solid and slows bosses.',
    duration: 3,
  },
  {
    id: 'void-collapse',
    name: 'Void Collapse',
    element: 'void',
    color: SIGNAL.violet,
    blurb: 'A singularity drags enemies in, grinds them, then implodes. Bosses resist the pull.',
    duration: 2.6,
  },
  {
    id: 'worldroot',
    name: 'Worldroot Rebirth',
    element: 'nature',
    color: SIGNAL.toxic,
    blurb: 'Restores a heart, raises a shield, lashes out with roots and regrows a little more.',
    duration: 5,
  },
  {
    id: 'storm-apocalypse',
    name: 'Storm Apocalypse',
    element: 'storm',
    color: BRAND.rebirthGold,
    blurb: 'Lightning strikes bosses and elites first, chaining between enemies. You fly faster.',
    duration: 3,
  },
  {
    id: 'celestial',
    name: 'Celestial Ascendancy',
    element: 'arcane',
    color: SIGNAL.magenta,
    blurb: 'Become celestial for 6 seconds: rapid piercing bolts and a golden-purple aura.',
    duration: 6,
  },
];

export const ULTIMATES_BY_ID: ReadonlyMap<UltimateId, UltimateDef> = new Map(ULTIMATES.map((u) => [u.id, u]));

export const ELEMENT_SHARDS: readonly string[] = ULTIMATES.filter((u) => u.element).map((u) => u.element as string);

/** Ultimates the player may choose right now: one per elemental shard they own. */
export function eligibleUltimates(build: UpgradeLevels): UltimateDef[] {
  return ULTIMATES.filter((u) => u.element !== null && (build[u.element] ?? 0) > 0);
}

export function ownsElement(build: UpgradeLevels): boolean {
  return ELEMENT_SHARDS.some((id) => (build[id] ?? 0) > 0);
}

/** Damage/heal multiplier from Ascension level: 1, 1.35, 1.7. */
export function ultimatePower(ascensionLevel: number): number {
  const tier = Math.max(1, Math.min(3, ascensionLevel));
  return 1 + (tier - 1) * 0.35;
}

export const EVOLUTION_STAGES = ['Mortal', 'Awakened', 'Radiant', 'Transcendent'] as const;

export function evolutionStage(ascensionLevel: number): (typeof EVOLUTION_STAGES)[number] {
  return EVOLUTION_STAGES[Math.max(0, Math.min(3, ascensionLevel))];
}

/**
 * Tuning. Base numbers at Ascension 1; damage and heal-free numbers scale with
 * `ultimatePower`. Radii also scale with the Void Shard's range bonus.
 */
export const ULT = {
  supernova: { radius: 260, damage: 8, burnDps: 1.6, burnTime: 3, protect: 0.9, bossFactor: 0.5 },
  absoluteZero: { radius: 300, damage: 3, freeze: 2.5, freezePerTier: 0.5, bossSlow: 0.5, bossSlowTime: 4, expandTime: 0.6 },
  voidCollapse: { pullRadius: 280, pullSpeed: 260, coreRadius: 70, tickDamage: 1.2, tick: 0.25, implodeRadius: 170, implodeDamage: 6 },
  worldroot: { hearts: 1, heartsAtTier3: 2, rootRadius: 220, rootDamage: 4, regrowAfter: 4 },
  storm: { strikes: 12, interval: 0.25, damage: 3, range: 420, chain: 2, chainFalloff: 0.6, chainRange: 170, speedBoost: 1.3, speedTime: 4 },
  celestial: { interval: 0.35, bolts: 3, damage: 1.5, pierce: 2, speed: 620, life: 1.4 },
} as const;
