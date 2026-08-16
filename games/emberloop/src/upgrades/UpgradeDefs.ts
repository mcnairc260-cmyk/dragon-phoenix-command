/**
 * Upgrade catalogue.
 *
 * Every upgrade is a pure description: a set of stat deltas applied per level.
 * Nothing here touches Phaser or the DOM, so the whole build system is testable.
 */

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
}

export interface UpgradeDef {
  id: string;
  name: string;
  family: UpgradeFamily;
  rarity: Rarity;
  maxLevel: number;
  icon: string;
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
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: readonly UpgradeDef[] = [
  // ── OFFENSE ────────────────────────────────────────────────────────────────
  {
    id: 'orbit-blades',
    name: 'Emberblades',
    family: 'offense',
    rarity: 'common',
    maxLevel: 4,
    icon: '🗡',
    describe: (n) => `${n} fire blade${n > 1 ? 's' : ''} orbit you, burning anything they touch.`,
    apply: (s) => {
      s.orbitBlades += 1;
    },
  },
  {
    id: 'blade-heat',
    name: 'White-Hot Edge',
    family: 'offense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '♨',
    describe: (n) => `Orbiting blades deal +${n} damage and swing wider.`,
    apply: (s) => {
      s.orbitBladeDamage += 1;
    },
  },
  {
    id: 'chain-lightning',
    name: 'Chain Lightning',
    family: 'offense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '⚡',
    describe: (n) => `Damage arcs to ${n + 1} nearby enemies.`,
    apply: (s, level) => {
      s.chainTargets += 1;
      if (level > 1) s.chainDamage += 0.5;
    },
  },
  {
    id: 'crit-bloom',
    name: 'Critical Bloom',
    family: 'offense',
    rarity: 'common',
    maxLevel: 4,
    icon: '✹',
    describe: (n) => `${pct(n * 0.12)} chance for hits to detonate in a fire bloom.`,
    apply: (s) => {
      s.critChance += 0.12;
      s.critRadius += 8;
    },
  },
  {
    id: 'homing-embers',
    name: 'Homing Embers',
    family: 'offense',
    rarity: 'common',
    maxLevel: 4,
    icon: '✦',
    describe: (n) => (n === 1 ? 'Auto-fire a seeking ember at the nearest threat.' : `Fire ${n} seeking embers per volley.`),
    apply: (s) => {
      s.homingShots += 1;
      s.homingInterval = Math.max(0.55, s.homingInterval - 0.16);
    },
  },
  {
    id: 'burst-force',
    name: 'Solar Detonation',
    family: 'offense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '☀',
    describe: () => 'Phoenix Burst deals +60% damage and reaches 20% further.',
    apply: (s) => {
      s.burstDamageMul += 0.6;
      s.burstRadiusMul += 0.2;
    },
  },
  {
    id: 'magma-trail',
    name: 'Magma Wake',
    family: 'offense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '🌋',
    describe: (n) => `Leave a burning trail dealing ${(n * 2.5).toFixed(1)} damage/sec.`,
    apply: (s) => {
      s.trailDps += 2.5;
      s.trailRadius += 5;
    },
  },
  {
    id: 'ashfall',
    name: 'Ashfall Doctrine',
    family: 'offense',
    rarity: 'legendary',
    maxLevel: 1,
    icon: '☄',
    describe: () => 'Every kill spits three embers of shrapnel. Crits chain twice.',
    apply: (s) => {
      s.critChance += 0.18;
      s.chainTargets += 2;
      s.chainDamage += 0.5;
      s.shrapnelOnKill = 3;
    },
  },

  // ── DEFENSE ────────────────────────────────────────────────────────────────
  {
    id: 'shield',
    name: 'Cinder Shield',
    family: 'defense',
    rarity: 'common',
    maxLevel: 3,
    icon: '🛡',
    describe: (n) => `A shield absorbs one hit, recharging every ${(14 - (n - 1) * 3).toFixed(0)}s.`,
    apply: (s, level) => {
      // Level 1 grants the shield at 14s; each level shortens the recharge.
      s.shieldRecharge = level === 1 ? 14 : Math.max(5, s.shieldRecharge - 3);
    },
  },
  {
    id: 'long-invuln',
    name: 'Ashen Grace',
    family: 'defense',
    rarity: 'common',
    maxLevel: 3,
    icon: '⏳',
    describe: () => 'Invulnerability after a hit lasts 0.5s longer.',
    apply: (s) => {
      s.invulnBonus += 0.5;
    },
  },
  {
    id: 'reflect',
    name: 'Mirror Flame',
    family: 'defense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '🪞',
    describe: (n) => `${pct(n * 0.25)} chance to reflect enemy projectiles back.`,
    apply: (s) => {
      s.reflectChance += 0.25;
    },
  },
  {
    id: 'emergency-heal',
    name: 'Second Dawn',
    family: 'defense',
    rarity: 'legendary',
    maxLevel: 2,
    icon: '🕊',
    describe: () => 'When a hit would kill you, survive it and restore 1 health.',
    apply: (s) => {
      s.emergencyHeals += 1;
    },
  },
  {
    id: 'flame-armor',
    name: 'Flame Armor',
    family: 'defense',
    rarity: 'rare',
    maxLevel: 3,
    icon: '🜂',
    describe: (n) => `${pct(n * 0.15)} chance to shrug off damage entirely.`,
    apply: (s) => {
      s.armorChance += 0.15;
    },
  },

  // ── UTILITY ────────────────────────────────────────────────────────────────
  {
    id: 'pickup-radius',
    name: 'Ember Draw',
    family: 'utility',
    rarity: 'common',
    maxLevel: 4,
    icon: '🧲',
    describe: () => 'Pull ember shards in from 45% further away.',
    apply: (s) => {
      s.pickupRadiusMul += 0.45;
    },
  },
  {
    id: 'swift',
    name: 'Updraft',
    family: 'utility',
    rarity: 'common',
    maxLevel: 4,
    icon: '💨',
    describe: () => 'Move 12% faster.',
    apply: (s) => {
      s.speedMul += 0.12;
    },
  },
  {
    id: 'slow-projectiles',
    name: 'Heavy Air',
    family: 'utility',
    rarity: 'rare',
    maxLevel: 3,
    icon: '🌫',
    describe: () => 'Enemy projectiles travel 18% slower.',
    apply: (s) => {
      s.enemyProjectileSpeedMul *= 0.82;
    },
  },
  {
    id: 'more-xp',
    name: 'Rising Insight',
    family: 'utility',
    rarity: 'common',
    maxLevel: 4,
    icon: '📈',
    describe: () => 'Gain 25% more experience.',
    apply: (s) => {
      s.xpMul += 0.25;
    },
  },
  {
    id: 'combo-duration',
    name: 'Long Burn',
    family: 'utility',
    rarity: 'common',
    maxLevel: 3,
    icon: '⏱',
    describe: () => 'Your Heat combo lasts 30% longer before cooling.',
    apply: (s) => {
      s.comboDurationMul += 0.3;
    },
  },
  {
    id: 'near-miss',
    name: 'Brinkwalker',
    family: 'utility',
    rarity: 'rare',
    maxLevel: 3,
    icon: '🎯',
    describe: () => 'Near-misses give 60% more Heat, score and burst energy.',
    apply: (s) => {
      s.nearMissMul += 0.6;
    },
  },
  {
    id: 'second-burst',
    name: 'Twin Phoenix',
    family: 'utility',
    rarity: 'legendary',
    maxLevel: 1,
    icon: '🔥',
    describe: () => 'Store a second Phoenix Burst charge.',
    apply: (s) => {
      s.burstCharges += 1;
    },
  },
  {
    id: 'ember-value',
    name: 'Molten Fortune',
    family: 'utility',
    rarity: 'rare',
    maxLevel: 3,
    icon: '💎',
    describe: () => 'Ember shards are worth 40% more score and currency.',
    apply: (s) => {
      s.emberValueMul += 0.4;
    },
  },
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
  return stats;
}
