/**
 * Shard synergies (founder brief §7). A synergy switches on once every shard it
 * needs has been taken at least once, and stays on for the run. Several can
 * be active together.
 *
 * Founder decision "2a": the original upgrades' mechanics live on here —
 * Firestorm brings back the orbiting Emberblades with chain lightning, Thunder
 * Tempest the chain lightning, Molten Armor the flame armour.
 *
 * Pure data: no Phaser, unit-tested. Effects run in scenes/SynergyController
 * (plus Firestorm and Molten Armor stat bonuses folded in computeStats).
 */
import { BRAND, SIGNAL } from '../config/brand';
import type { UpgradeLevels } from './UpgradeDefs';

export type SynergyId =
  | 'firestorm'
  | 'frozen-barrage'
  | 'shadow-execution'
  | 'phoenix-renewal'
  | 'thunder-tempest'
  | 'molten-armor'
  | 'temporal-echo'
  | 'celestial-harvest'
  | 'titans-judgment'
  | 'celestial-barrage';

export interface SynergyDef {
  id: SynergyId;
  name: string;
  requires: readonly string[];
  color: number;
  blurb: string;
}

export const SYNERGIES: readonly SynergyDef[] = [
  {
    id: 'firestorm',
    name: 'Firestorm',
    requires: ['ember', 'storm'],
    color: BRAND.emberOrange,
    blurb: 'A ring of lightning-fire blades orbits you; every 1.2 s a blade hit chains lightning.',
  },
  {
    id: 'frozen-barrage',
    name: 'Frozen Barrage',
    requires: ['frost', 'arcane'],
    color: BRAND.signalCyan,
    blurb: 'Fans of ice shards that chill enemies; 3 chilling hits freeze an enemy (bosses resist).',
  },
  {
    id: 'shadow-execution',
    name: 'Shadow Execution',
    requires: ['void', 'hunter'],
    color: SIGNAL.violet,
    blurb: 'Critical hits detonate a void explosion around the target (once every 0.6 s).',
  },
  {
    id: 'phoenix-renewal',
    name: 'Phoenix Renewal',
    requires: ['nature', 'ward'],
    color: SIGNAL.toxic,
    blurb: 'A shield that stays unbroken for 12 s blooms and restores a heart.',
  },
  {
    id: 'thunder-tempest',
    name: 'Thunder Tempest',
    requires: ['storm', 'arcane'],
    color: BRAND.rebirthGold,
    blurb: 'Every 2.5 s, lightning strikes a nearby enemy and jumps to 3 more, weaker each jump.',
  },
  {
    id: 'molten-armor',
    name: 'Molten Armor',
    requires: ['ember', 'titan'],
    color: BRAND.emberOrange,
    blurb: '+10% chance to shrug off hits; anything that hits you is scorched (once a second).',
  },
  {
    id: 'temporal-echo',
    name: 'Temporal Echo',
    requires: ['time', 'void'],
    color: BRAND.signalCyan,
    blurb: 'Graze shots echo a moment later at half damage. Echoes never echo.',
  },
  {
    id: 'celestial-harvest',
    name: 'Celestial Harvest',
    requires: ['cosmic', 'nature'],
    color: SIGNAL.toxic,
    blurb: 'Every 25 embers collected, a healing pulse restores a heart (once every 20 s).',
  },
  {
    id: 'titans-judgment',
    name: "Titan's Judgment",
    requires: ['titan', 'hunter'],
    color: BRAND.rebirthGold,
    blurb: 'Every 2 hits you take or shrug off charge a golden counterblast around you.',
  },
  {
    id: 'celestial-barrage',
    name: 'Celestial Barrage',
    requires: ['arcane', 'void', 'hunter'],
    color: SIGNAL.magenta,
    blurb: 'Rare: every 3.5 s, 4 piercing star-bolts that can critically strike.',
  },
];

export const SYNERGIES_BY_ID: ReadonlyMap<SynergyId, SynergyDef> = new Map(SYNERGIES.map((s) => [s.id, s]));

const owns = (build: UpgradeLevels, id: string) => (build[id] ?? 0) > 0;

export function isActive(def: SynergyDef, build: UpgradeLevels): boolean {
  return def.requires.every((id) => owns(build, id));
}

export function activeSynergies(build: UpgradeLevels): SynergyDef[] {
  return SYNERGIES.filter((s) => isActive(s, build));
}

export function hasSynergy(build: UpgradeLevels, id: SynergyId): boolean {
  const def = SYNERGIES_BY_ID.get(id);
  return def ? isActive(def, build) : false;
}

/** Synergies that taking `shardId` now would switch on (for the level-up cards). */
export function completedBy(build: UpgradeLevels, shardId: string): SynergyDef[] {
  if (owns(build, shardId)) return [];
  const next = { ...build, [shardId]: 1 };
  return SYNERGIES.filter((s) => s.requires.includes(shardId) && !isActive(s, build) && isActive(s, next));
}

/** Tuning, in one place. Damage numbers are before the Ember damage bonus. */
export const SYN = {
  firestorm: { chainEvery: 1.2, chainTargets: 2, chainDamage: 1.5, chainRange: 160 },
  frozenBarrage: { every: 2, shards: 5, spread: 0.16, damage: 1, speed: 420, hitsToFreeze: 3, chillTime: 3, freeze: 1.2, chillSlow: 0.3 },
  shadowExecution: { cooldown: 0.6, radius: 90, damage: 2 },
  phoenixRenewal: { bloomAfter: 12 },
  thunderTempest: { every: 2.5, range: 260, damage: 3, jumps: 3, falloff: 0.7, jumpRange: 170 },
  moltenArmor: { armor: 0.1, cooldown: 1, radius: 85, damage: 2 },
  temporalEcho: { delay: 0.35, damage: 0.5, cooldown: 0.4 },
  celestialHarvest: { every: 25, cooldown: 20 },
  titansJudgment: { charges: 2, radius: 170, damage: 6, cooldown: 6 },
  celestialBarrage: { every: 3.5, bolts: 4, damage: 2, pierce: 3, speed: 560 },
} as const;
