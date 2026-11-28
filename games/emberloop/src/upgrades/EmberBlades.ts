/**
 * EMBER BLADES — an upgradeable orbital melee weapon (founder brief, 2026-11-21;
 * art: art/ember-blades.png, sword cut out to src/assets/weapons/ember-blade.png).
 *
 * Taken from the normal level-up draft like a shard (no separate levelling).
 * Level n = n swords, evenly spaced, orbiting clockwise. Only the swords deal
 * damage; trails and sparks are cosmetic. Pure tuning, unit-tested; the weapon
 * runs in entities/EmberBlades.ts.
 */

export const BLADES = {
  maxLevel: 6,
  /** Orbit radius in CSS px: just outside the 56 px phoenix art. */
  orbitRadius: 46,
  /** Drawn sword length and the collision capsule that matches the metal. */
  length: 34,
  capsuleRadius: 5,
  /** Damage per hit, before the Ember Shard bonus (applied once, in GameScene.damageEnemy). */
  baseDamage: 2,
  /** The same sword cannot hit the same enemy again for this long. */
  hitCooldown: 0.4,
  /** Seconds per revolution by weapon level (index = level). */
  revSeconds: [0, 2, 2, 2, 1.7, 1.7, 1.4],
  level5DamageMul: 1.25,
  /** Storm Shard: +3% spin per level, capped at +12%. */
  stormSpinPerLevel: 0.03,
  stormSpinCap: 0.12,
  /** Infernal Cyclone synergy. */
  cycloneSpin: 0.12,
  cycloneDamage: 0.2,
  /** Bosses are armoured: blades deal half damage to them (as Phoenix Supernova does). */
  bossDamageMul: 0.5,
  /** Hard floor on revolution time, so collisions can never get frantic. */
  minRevSeconds: 1.1,
} as const;

export const BLADE_LEVEL_TEXT = [
  '',
  'Summon one red-hot orbiting blade.',
  'Add a second blade.',
  'Add a third blade.',
  'Add a fourth blade and increase rotation speed.',
  'Add a fifth blade and increase damage.',
  'Add a sixth blade and increase rotation speed.',
] as const;

export interface BladeSpec {
  count: number;
  revSeconds: number;
  /** Radians per second, clockwise on screen (positive = clockwise with Y down). */
  angularSpeed: number;
  damage: number;
}

export function bladeSpec(level: number, stormLevel: number, cyclone: boolean): BladeSpec {
  const lv = Math.max(0, Math.min(BLADES.maxLevel, Math.floor(level)));
  if (lv === 0) return { count: 0, revSeconds: 0, angularSpeed: 0, damage: 0 };
  const spin = 1 + Math.min(BLADES.stormSpinCap, Math.max(0, stormLevel) * BLADES.stormSpinPerLevel) + (cyclone ? BLADES.cycloneSpin : 0);
  const revSeconds = Math.max(BLADES.minRevSeconds, BLADES.revSeconds[lv] / spin);
  const damage = BLADES.baseDamage * (lv >= 5 ? BLADES.level5DamageMul : 1) * (cyclone ? 1 + BLADES.cycloneDamage : 1);
  return { count: lv, revSeconds, angularSpeed: (Math.PI * 2) / revSeconds, damage };
}

/** Even spacing: the slot angle of blade i of n (360° / n apart). */
export function slotAngle(i: number, n: number): number {
  return n > 0 ? (i / n) * Math.PI * 2 : 0;
}
