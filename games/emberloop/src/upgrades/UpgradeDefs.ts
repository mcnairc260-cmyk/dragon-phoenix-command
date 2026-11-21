/**
 * Upgrade catalogue: the 12 Power Shards (founder's Power Shards art,
 * art/power-shards.png; founder decision 2026-11-20 "2a": the shards replace
 * the original 21 upgrades).
 *
 * Every shard is a pure description: a set of stat deltas applied per level.
 * Nothing here touches Phaser or the DOM, so the whole build system is testable.
 *
 * The original upgrades' mechanics (orbit blades, chain lightning, magma trail,
 * shrapnel, reflection, second Burst charge…) are still implemented and driven
 * by the stats below; they return as shard synergies (Stage 5, EXPANSION.md).
 */
import emberArt from '../assets/shards/ember.png';
import frostArt from '../assets/shards/frost.png';
import voidArt from '../assets/shards/void.png';
import natureArt from '../assets/shards/nature.png';
import stormArt from '../assets/shards/storm.png';
import arcaneArt from '../assets/shards/arcane.png';
import ascensionArt from '../assets/shards/ascension.png';
import titanArt from '../assets/shards/titan.png';
import timeArt from '../assets/shards/time.png';
import hunterArt from '../assets/shards/hunter.png';
import wardArt from '../assets/shards/ward.png';
import cosmicArt from '../assets/shards/cosmic.png';

export type UpgradeFamily = 'offense' | 'defense' | 'utility';
export type Rarity = 'common' | 'rare' | 'legendary';

/** Aggregated player stats produced by `computeStats()`. */
export interface PlayerStats {
  /** Number of orbiting fire blades circling the player. */
  orbitBlades: number;
  orbitBladeDamage: number;
  /** Chain lightning arcs per trigger (0 = disabled). */
  chainTargets: number;
  chainDamage: number;
  /** Chance a hit becomes a critical explosion. */
  critChance: number;
  critRadius: number;
  /** Homing ember projectiles fired automatically. */
  homingShots: number;
  homingInterval: number;
  homingDamage: number;
  /** Phoenix Burst damage and radius scaling. */
  burstDamageMul: number;
  burstRadiusMul: number;
  burstCharges: number;
  /** Burning trail left behind the player (damage per second, 0 = off). */
  trailDps: number;
  trailRadius: number;
  /** Shrapnel embers thrown out by every kill. */
  shrapnelOnKill: number;

  /** Regenerating shield: absorbs one hit, recharges after N seconds (0 = off). */
  shieldRecharge: number;
  invulnBonus: number;
  /** Chance an incoming projectile is reflected back as a player projectile. */
  reflectChance: number;
  /** One-shot revive/heal that triggers at 1 HP (count of charges). */
  emergencyHeals: number;
  /** Flat damage reduction: chance to fully ignore a hit. */
  armorChance: number;

  pickupRadiusMul: number;
  speedMul: number;
  /** Multiplier applied to enemy projectile speed (below 1 = slower). */
  enemyProjectileSpeedMul: number;
  xpMul: number;
  comboDurationMul: number;
  nearMissMul: number;
  emberValueMul: number;

  /** Multiplies all damage the phoenix deals (Ember). */
  damageMul: number;
  /** Fraction enemies are slowed by, 0..FROST_CAP (Frost). Bosses get half. */
  enemySlow: number;
  /** Multiplies graze reach, graze-shot reach and Burst radius (Void). */
  rangeMul: number;
  /** Seconds per regenerated heart, 0 = off (Nature). */
  regenInterval: number;
  /** Multiplies every cooldown: Burst, shield, regen, auto-fire (Time). */
  cooldownMul: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  family: UpgradeFamily;
  rarity: Rarity;
  maxLevel: number;
  icon: string;
  /** Crystal artwork URL. */
  art: string;
  /** False keeps a shard out of the draft entirely. */
  available: boolean;
  /** Extra draft condition on the current build (Ascension needs an element shard). */
  requires?: (owned: UpgradeLevels) => boolean;
  /** Player-facing effect at a given owned level (1-based). */
  effect: (level: number) => string;
  /** Short player-facing text for the given (1-based) level being offered. */
  describe: (nextLevel: number) => string;
  /** Mutates the accumulating stat block for one owned level. */
  apply: (stats: PlayerStats, level: number) => void;
}

export const BASE_STATS: PlayerStats = {
  orbitBlades: 0,
  orbitBladeDamage: 1,
  chainTargets: 0,
  chainDamage: 1,
  critChance: 0,
  critRadius: 74,
  homingShots: 0,
  homingInterval: 1.5,
  homingDamage: 1,
  burstDamageMul: 1,
  burstRadiusMul: 1,
  burstCharges: 1,
  trailDps: 0,
  trailRadius: 26,
  shrapnelOnKill: 0,

  shieldRecharge: 0,
  invulnBonus: 0,
  reflectChance: 0,
  emergencyHeals: 0,
  armorChance: 0,

  pickupRadiusMul: 1,
  speedMul: 1,
  enemyProjectileSpeedMul: 1,
  xpMul: 1,
  comboDurationMul: 1,
  nearMissMul: 1,
  emberValueMul: 1,

  damageMul: 1,
  enemySlow: 0,
  rangeMul: 1,
  regenInterval: 0,
  cooldownMul: 1,
};

/** Hard limits so no stack of shards can break the game. */
export const FROST_CAP = 0.48;
export const COOLDOWN_FLOOR = 0.72;

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Builds `describe` from `effect`: "+12% damage" or "+12% → +24% damage". */
function shard(def: Omit<UpgradeDef, 'describe'>): UpgradeDef {
  return {
    ...def,
    describe: (next) => (next <= 1 ? def.effect(1) : `${def.effect(next - 1)}  →  ${def.effect(next)}`),
  };
}

/** Shards that each unlock an elemental ultimate (mirrors upgrades/Ultimates.ts). */
export const ELEMENT_SHARD_IDS = ['ember', 'frost', 'void', 'nature', 'storm', 'arcane'] as const;

const REGEN_SECONDS = [0, 0, 45, 35, 25];
const WARD_SECONDS = [0, 14, 11, 8];
const ARCANE_INTERVAL = [0, 1.6, 1.4, 1.2];

export const UPGRADES: readonly UpgradeDef[] = [
  shard({
    id: 'ember', name: 'Ember Shard', family: 'offense', rarity: 'common', maxLevel: 5, icon: '🔥', art: emberArt, available: true,
    effect: (l) => `+${l * 12}% damage`,
    apply: (s) => { s.damageMul += 0.12; },
  }),
  shard({
    id: 'frost', name: 'Frost Shard', family: 'defense', rarity: 'common', maxLevel: 4, icon: '❄️', art: frostArt, available: true,
    effect: (l) => `Enemies ${pct(Math.min(FROST_CAP, l * 0.12))} slower (bosses half)`,
    apply: (s) => { s.enemySlow = Math.min(FROST_CAP, s.enemySlow + 0.12); },
  }),
  shard({
    id: 'void', name: 'Void Shard', family: 'offense', rarity: 'common', maxLevel: 5, icon: '🌀', art: voidArt, available: true,
    effect: (l) => `+${l * 10}% range: graze reach, graze shots, Burst`,
    apply: (s) => { s.rangeMul += 0.1; },
  }),
  shard({
    id: 'nature', name: 'Nature Shard', family: 'defense', rarity: 'rare', maxLevel: 4, icon: '🌿', art: natureArt, available: true,
    effect: (l) => (l <= 1 ? 'Restore 1 heart now' : `Restore 1 heart now; regrow 1 every ${REGEN_SECONDS[l]}s`),
    apply: (s, level) => { s.regenInterval = REGEN_SECONDS[level] ?? 0; },
  }),
  shard({
    id: 'storm', name: 'Storm Shard', family: 'utility', rarity: 'common', maxLevel: 5, icon: '⚡', art: stormArt, available: true,
    effect: (l) => `+${l * 8}% flight speed`,
    apply: (s) => { s.speedMul += 0.08; },
  }),
  shard({
    id: 'arcane', name: 'Arcane Shard', family: 'offense', rarity: 'legendary', maxLevel: 3, icon: '✴️', art: arcaneArt, available: true,
    effect: (l) => `Auto-fire ${l} seeking bolt${l > 1 ? 's' : ''} every ${ARCANE_INTERVAL[l]}s`,
    apply: (s, level) => {
      s.homingShots = level;
      s.homingInterval = ARCANE_INTERVAL[level] ?? 1.2;
    },
  }),
  shard({
    id: 'ascension', name: 'Ascension Shard', family: 'utility', rarity: 'legendary', maxLevel: 3, icon: '🜂', art: ascensionArt,
    // Turns the Burst into an elemental ultimate (upgrades/Ultimates.ts); only
    // offered once the player owns an element shard to draw it from.
    available: true,
    requires: (owned) => ELEMENT_SHARD_IDS.some((id) => (owned[id] ?? 0) > 0),
    effect: (l) =>
      l <= 1 ? 'Awaken: trade the Burst for an elemental ultimate' : `${l === 2 ? 'Radiant' : 'Transcendent'}: ultimate +${(l - 1) * 35}% power`,
    apply: () => undefined,
  }),
  shard({
    id: 'titan', name: 'Titan Shard', family: 'defense', rarity: 'common', maxLevel: 4, icon: '🛡️', art: titanArt, available: true,
    effect: (l) => `${l * 7}% chance to shrug off a hit`,
    apply: (s) => { s.armorChance += 0.07; },
  }),
  shard({
    id: 'time', name: 'Time Shard', family: 'utility', rarity: 'common', maxLevel: 4, icon: '⏳', art: timeArt, available: true,
    effect: (l) => `Cooldowns ${l * 7}% shorter`,
    apply: (s) => { s.cooldownMul = Math.max(COOLDOWN_FLOOR, s.cooldownMul - 0.07); },
  }),
  shard({
    id: 'hunter', name: 'Hunter Shard', family: 'offense', rarity: 'common', maxLevel: 4, icon: '🎯', art: hunterArt, available: true,
    effect: (l) => `${l * 6}% crit chance (double damage + blast)`,
    apply: (s) => { s.critChance += 0.06; },
  }),
  shard({
    id: 'ward', name: 'Ward Shard', family: 'defense', rarity: 'rare', maxLevel: 3, icon: '✚', art: wardArt, available: true,
    effect: (l) => `Shield blocks 1 hit, recharges in ${WARD_SECONDS[l]}s`,
    apply: (s, level) => { s.shieldRecharge = WARD_SECONDS[level] ?? 8; },
  }),
  shard({
    id: 'cosmic', name: 'Cosmic Shard', family: 'utility', rarity: 'common', maxLevel: 4, icon: '🌌', art: cosmicArt, available: true,
    effect: (l) => `+${l * 12}% XP and ember value`,
    apply: (s) => {
      s.xpMul += 0.12;
      s.emberValueMul += 0.12;
    },
  }),
];

export const UPGRADES_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(
  UPGRADES.map((u) => [u.id, u]),
);

/** Owned upgrade levels, keyed by upgrade id. */
export type UpgradeLevels = Readonly<Record<string, number>>;

/**
 * Fold every owned upgrade level into a single stat block.
 * Pure: same input always produces the same output.
 */
export function computeStats(levels: UpgradeLevels): PlayerStats {
  const stats: PlayerStats = { ...BASE_STATS };
  for (const def of UPGRADES) {
    const owned = levels[def.id] ?? 0;
    const capped = Math.min(owned, def.maxLevel);
    for (let level = 1; level <= capped; level++) def.apply(stats, level);
  }
  // Time shortens every timed effect in one place, so new ones cannot forget it.
  stats.cooldownMul = Math.max(COOLDOWN_FLOOR, stats.cooldownMul);
  stats.homingInterval *= stats.cooldownMul;
  stats.shieldRecharge *= stats.cooldownMul;
  stats.regenInterval *= stats.cooldownMul;
  stats.enemySlow = Math.min(FROST_CAP, Math.max(0, stats.enemySlow));
  return stats;
}
