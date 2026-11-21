/**
 * The six enemy factions and their 18 species (founder's Enemy Collection art,
 * art/enemy-collection.png; sprites cut out by scripts/extract-enemies.py).
 *
 * Since 2026-11-21 each faction is one BOARD (GameConfig BOARD): its three
 * species for a wave, then its boss (config/bosses.ts), then a rest screen.
 *
 * Every species reuses one of the three proven behaviours in entities/Enemy.ts:
 *   chaser  → the `cinder` pursuit AI
 *   charger → the `dart` rest / telegraph-line / locked dash / recover AI
 *   shooter → the `spitter` stand-off / telegraph / aimed shot AI
 * Species only change look, faction colour, speed, toughness and size, so the
 * tuned behaviours stay intact. Orbiters, splitters and mines are unchanged.
 */
import { BRAND, SIGNAL } from './brand';
import type { EnemyKind } from '../systems/Difficulty';

import lavaBrute from '../assets/enemies/lava-brute.png';
import magmaScorpion from '../assets/enemies/magma-scorpion.png';
import emberOrb from '../assets/enemies/ember-orb.png';
import frostfang from '../assets/enemies/frostfang.png';
import crystalCrawler from '../assets/enemies/crystal-crawler.png';
import shardGolem from '../assets/enemies/shard-golem.png';
import shadowProwler from '../assets/enemies/shadow-prowler.png';
import voidWraith from '../assets/enemies/void-wraith.png';
import stormRevenant from '../assets/enemies/storm-revenant.png';
import thornwood from '../assets/enemies/thornwood.png';
import sporeStalker from '../assets/enemies/spore-stalker.png';
import venomBloom from '../assets/enemies/venom-bloom.png';
import ashwing from '../assets/enemies/ashwing.png';
import nightHerald from '../assets/enemies/night-herald.png';
import vipercoil from '../assets/enemies/vipercoil.png';
import runebound from '../assets/enemies/runebound.png';
import eyeSentinel from '../assets/enemies/eye-sentinel.png';
import emberSlime from '../assets/enemies/ember-slime.png';

export type Role = 'chaser' | 'charger' | 'shooter';
export type FactionId = 'volcanic' | 'frostborn' | 'shadow' | 'nature' | 'aerial' | 'arcane';

export const ROLE_KIND: Record<Role, EnemyKind> = { chaser: 'cinder', charger: 'dart', shooter: 'spitter' };
export const KIND_ROLE: Partial<Record<EnemyKind, Role>> = { cinder: 'chaser', dart: 'charger', spitter: 'shooter' };

export interface Faction {
  id: FactionId;
  name: string;
  /** Glow, telegraph line and projectile colour. */
  color: number;
}

export interface Species {
  id: string;
  name: string;
  faction: FactionId;
  role: Role;
  url: string;
  /** Which way the art faces: 1 right, -1 left, 0 front-on (never mirrored). */
  faces: 1 | -1 | 0;
  speedMul: number;
  hpMul: number;
  sizeMul: number;
}

/** In board order: board 1 is the Volcanic Legion … board 6 the Arcane Sentinels. */
export const FACTIONS: readonly Faction[] = [
  { id: 'volcanic', name: 'Volcanic Legion', color: BRAND.emberOrange },
  { id: 'frostborn', name: 'Frostborn Pack', color: BRAND.signalCyan },
  { id: 'shadow', name: 'Shadow Void', color: SIGNAL.violet },
  { id: 'nature', name: 'Nature Blight', color: SIGNAL.toxic },
  { id: 'aerial', name: 'Aerial Terrors', color: SIGNAL.magenta },
  { id: 'arcane', name: 'Arcane Sentinels', color: BRAND.rebirthGold },
];

const S = (
  id: string,
  name: string,
  faction: FactionId,
  role: Role,
  url: string,
  faces: 1 | -1 | 0,
  speedMul: number,
  hpMul: number,
  sizeMul: number,
): Species => ({ id, name, faction, role, url, faces, speedMul, hpMul, sizeMul });

/** Chasers trade speed for toughness; the fast ones are fragile, the slow ones soak hits. */
export const SPECIES: readonly Species[] = [
  S('lava-brute', 'Lava Brute', 'volcanic', 'chaser', lavaBrute, 0, 0.8, 2, 1.15),
  S('magma-scorpion', 'Magma Scorpion', 'volcanic', 'charger', magmaScorpion, 0, 1, 1, 1),
  S('ember-orb', 'Ember Orb', 'volcanic', 'shooter', emberOrb, 0, 1, 1, 0.95),

  S('frostfang', 'Frostfang', 'frostborn', 'chaser', frostfang, 1, 1.35, 1, 1.05),
  S('crystal-crawler', 'Crystal Crawler', 'frostborn', 'charger', crystalCrawler, 0, 1.1, 1, 1),
  S('shard-golem', 'Shard Golem', 'frostborn', 'shooter', shardGolem, 0, 0.85, 1.5, 1.1),

  S('shadow-prowler', 'Shadow Prowler', 'shadow', 'chaser', shadowProwler, 1, 1.25, 1, 1.05),
  S('void-wraith', 'Void Wraith', 'shadow', 'charger', voidWraith, 0, 1.15, 1, 1),
  S('storm-revenant', 'Storm Revenant', 'shadow', 'shooter', stormRevenant, 0, 1, 1, 1),

  S('thornwood', 'Thornwood', 'nature', 'chaser', thornwood, 0, 0.75, 2.5, 1.2),
  S('spore-stalker', 'Spore Stalker', 'nature', 'charger', sporeStalker, 0, 0.95, 1.5, 1.05),
  S('venom-bloom', 'Venom Bloom', 'nature', 'shooter', venomBloom, 0, 0.7, 1.5, 1),

  S('ashwing', 'Ashwing', 'aerial', 'chaser', ashwing, 0, 1.45, 1, 1.05),
  S('night-herald', 'Night Herald', 'aerial', 'charger', nightHerald, 1, 1.2, 1, 1.05),
  S('vipercoil', 'Vipercoil', 'aerial', 'shooter', vipercoil, 1, 1, 1, 1),

  S('runebound', 'Runebound', 'arcane', 'chaser', runebound, 0, 1, 2, 1.1),
  S('eye-sentinel', 'Eye Sentinel', 'arcane', 'charger', eyeSentinel, 0, 1.1, 1.5, 1),
  S('ember-slime', 'Ember Slime', 'arcane', 'shooter', emberSlime, 0, 0.9, 1.5, 1),
];

export const FACTION_BY_ID: Record<FactionId, Faction> = Object.fromEntries(FACTIONS.map((f) => [f.id, f])) as Record<
  FactionId,
  Faction
>;

export const speciesTextureKey = (s: Species): string => `enemy-${s.id}`;

/** The faction a board belongs to (board 0–5; loops repeat the same order). */
export function factionForBoard(board: number): Faction {
  return FACTIONS[((board % FACTIONS.length) + FACTIONS.length) % FACTIONS.length];
}

/** The species a board's faction fields for a behaviour. */
export function speciesFor(role: Role, faction: FactionId): Species | null {
  return SPECIES.find((s) => s.faction === faction && s.role === role) ?? null;
}
