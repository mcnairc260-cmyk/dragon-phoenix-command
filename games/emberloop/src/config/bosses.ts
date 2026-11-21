/**
 * The six faction bosses (founder's Boss Roster art, art/boss-roster.png; cut
 * out by scripts/extract-bosses.py). Founder decision 2026-11-20 "3a": they
 * replace THE ASHBORN and rotate by faction, one per boss encounter.
 *
 * Phases follow the brief: three stages sized 35% / 35% / 30% of total HP, so
 * phase 2 starts below 65% and phase 3 below 30%. Each phase unlocks one more
 * signature attack; phase 3 can also combine two attacks.
 */
import { BRAND, SIGNAL } from './brand';
import type { FactionId } from './factions';

import magmatharArt from '../assets/bosses/magmathar.png';
import criotharisArt from '../assets/bosses/criotharis.png';
import nethermorphArt from '../assets/bosses/nethermorph.png';
import blightbloomArt from '../assets/bosses/blightbloom.png';
import skyrendArt from '../assets/bosses/skyrend.png';
import aurelionArt from '../assets/bosses/aurelion.png';

export type BossAttackId =
  | 'lava-wave'
  | 'meteor-rain'
  | 'eruption-rings'
  | 'ice-shard-barrage'
  | 'frost-nova'
  | 'ice-wall-prison'
  | 'void-beams'
  | 'teleport-strike'
  | 'gravity-well'
  | 'vine-snare'
  | 'toxic-spores'
  | 'seed-swarm'
  | 'feather-storm'
  | 'dive-bomb'
  | 'wind-tornadoes'
  | 'orbiting-orbs'
  | 'arcane-laser-grid'
  | 'reality-rift';

export type BossMovement = 'drift' | 'rooted' | 'swoop' | 'hover';

export interface BossDef {
  id: string;
  name: string;
  title: string;
  faction: FactionId;
  color: number;
  url: string;
  /** Collision radius (CSS px); the sprite is drawn wider than this. */
  radius: number;
  movement: BossMovement;
  /** Attacks in unlock order: phase 1 uses [0], phase 2 adds [1], phase 3 adds [2]. */
  attacks: [BossAttackId, BossAttackId, BossAttackId];
  /** Names shown on the HUD and in toasts, matching the poster. */
  attackNames: [string, string, string];
}

export const BOSSES: readonly BossDef[] = [
  {
    id: 'magmathar',
    name: 'MAGMATHAR',
    title: 'The Core Titan',
    faction: 'volcanic',
    color: BRAND.emberOrange,
    url: magmatharArt,
    radius: 46,
    movement: 'drift',
    attacks: ['lava-wave', 'meteor-rain', 'eruption-rings'],
    attackNames: ['Lava Wave', 'Meteor Rain', 'Eruption Rings'],
  },
  {
    id: 'criotharis',
    name: 'CRIOTHARIS',
    title: 'The Winter Alpha',
    faction: 'frostborn',
    color: BRAND.signalCyan,
    url: criotharisArt,
    radius: 44,
    movement: 'swoop',
    attacks: ['ice-shard-barrage', 'frost-nova', 'ice-wall-prison'],
    attackNames: ['Ice Shard Barrage', 'Frost Nova', 'Ice Wall Prison'],
  },
  {
    id: 'nethermorph',
    name: 'NETHERMORPH',
    title: 'The Void Harbinger',
    faction: 'shadow',
    color: SIGNAL.violet,
    url: nethermorphArt,
    radius: 42,
    movement: 'hover',
    attacks: ['void-beams', 'teleport-strike', 'gravity-well'],
    attackNames: ['Void Beams', 'Teleport Strike', 'Gravity Well'],
  },
  {
    id: 'blightbloom',
    name: 'BLIGHTBLOOM',
    title: 'The Wildfeeder',
    faction: 'nature',
    color: SIGNAL.toxic,
    url: blightbloomArt,
    radius: 48,
    movement: 'rooted',
    attacks: ['seed-swarm', 'toxic-spores', 'vine-snare'],
    attackNames: ['Seed Swarm', 'Toxic Spores', 'Vine Snare'],
  },
  {
    id: 'skyrend',
    name: 'SKYREND',
    title: 'The Storm Crown',
    faction: 'aerial',
    color: SIGNAL.magenta,
    url: skyrendArt,
    radius: 40,
    movement: 'swoop',
    attacks: ['feather-storm', 'dive-bomb', 'wind-tornadoes'],
    attackNames: ['Feather Storm', 'Dive Bomb', 'Wind Tornadoes'],
  },
  {
    id: 'aurelion',
    name: 'AURELION',
    title: 'The Arcane Warden',
    faction: 'arcane',
    color: BRAND.rebirthGold,
    url: aurelionArt,
    radius: 46,
    movement: 'drift',
    attacks: ['orbiting-orbs', 'arcane-laser-grid', 'reality-rift'],
    attackNames: ['Orbiting Orbs', 'Arcane Laser Grid', 'Reality Rift'],
  },
];

export const bossTextureKey = (b: BossDef): string => `boss-${b.id}`;

/** Boss encounter n (0-based) → which boss. Rotates through the factions in arrival order. */
export function bossFor(index: number): BossDef {
  return BOSSES[((index % BOSSES.length) + BOSSES.length) % BOSSES.length];
}

/** Phase shares of total HP: below 65% is phase 2, below 30% is phase 3. */
export const PHASE_SHARES = [0.35, 0.35, 0.3] as const;

/** Attacks available in a phase (0-based stage). */
export function attacksForStage(def: BossDef, stage: number): BossAttackId[] {
  return def.attacks.slice(0, Math.max(1, Math.min(3, stage + 1)));
}

/** Seconds of recovery after each attack, before the next one may start. */
export const ATTACK_RECOVERY: Record<BossAttackId, number> = {
  'lava-wave': 2.4,
  'meteor-rain': 2.2,
  'eruption-rings': 2,
  'ice-shard-barrage': 1.8,
  'frost-nova': 2.2,
  'ice-wall-prison': 2.6,
  'void-beams': 2,
  'teleport-strike': 2.2,
  'gravity-well': 3,
  'vine-snare': 2,
  'toxic-spores': 2.6,
  'seed-swarm': 2,
  'feather-storm': 2.2,
  'dive-bomb': 2.2,
  'wind-tornadoes': 3,
  'orbiting-orbs': 2.4,
  'arcane-laser-grid': 2.4,
  'reality-rift': 2.8,
};
