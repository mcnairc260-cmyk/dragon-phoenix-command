/**
 * EMBERLOOP — centralized tuning constants.
 *
 * Everything a designer would want to tweak lives here. Nothing in this file
 * imports Phaser, so it is safe to pull into unit tests.
 */

/** Reference portrait viewport the game is tuned against (iPhone 14 logical px). */
export const DESIGN = { width: 390, height: 844 } as const;

/**
 * The arena is a circle in *normalised* space that is rendered as an ellipse so
 * it fills a tall portrait screen. All gameplay maths uses the normalised radius
 *   n = sqrt((dx/rx)^2 + (dy/ry)^2)
 * where n = 1 is the arena wall. This keeps "circular arena" logic (angular
 * wedges, orbits, radial spawns) while using the whole phone screen.
 */
export const ARENA = {
  /** Fraction of half-width used for the horizontal radius. */
  radiusXFactor: 0.94,
  /** Fraction of half-height used for the vertical radius. */
  radiusYFactor: 0.9,
  /** Vertical centre of the arena as a fraction of screen height (HUD sits above). */
  centerYFactor: 0.52,
  /** Radius used when drawing arena art in unit space before the ellipse scale. */
  drawRadius: 1000,
  /** Enemies spawn at this normalised radius (just outside the wall/screen). */
  spawnRadius: 1.18,
  /** Enemies further out than this are culled. */
  cullRadius: 1.9,
  /** Degrees per second the arena art slowly rotates. */
  spinDegPerSec: 1.6,
} as const;

export const PLAYER = {
  maxHealth: 3,
  radius: 13,
  /** Hit radius is smaller than the visual — forgiving hitbox feels better on touch. */
  hitRadius: 9,
  /** Peak speed in px/sec at pointer-far distance. */
  baseSpeed: 430,
  /** Higher = snappier response to the pointer; lower = more drift/momentum. */
  accel: 12.5,
  /** Velocity retained per second when the pointer is released (momentum glide). */
  dragPerSecond: 0.0016,
  /** Pointer distance (px) at which the player runs at full speed. */
  fullSpeedDistance: 90,
  invulnAfterHit: 1.25,
  /** Ring in which passing enemies/projectiles counts as a near-miss. */
  nearMissRadius: 46,
  /** Same danger object cannot re-trigger a near-miss faster than this. */
  nearMissCooldown: 0.5,
} as const;

export const BURST = {
  maxEnergy: 100,
  /** Energy per second at full speed while the pointer is held. */
  energyPerSecondMoving: 14,
  /** Trickle even while idle so a stuck player still recovers. */
  energyPerSecondIdle: 3.5,
  energyPerNearMiss: 7,
  energyPerKill: 2.2,
  radius: 190,
  damage: 4,
  cooldown: 1.1,
  /** Time scale + duration of the burst slow-motion moment. */
  slowMoScale: 0.35,
  slowMoDuration: 0.42,
  shake: 0.016,
} as const;

export const SCORING = {
  emberScore: 12,
  nearMissScore: 18,
  killScore: 20,
  eliteKillScore: 220,
  bossKillScore: 1500,
  scorePerSecond: 8,
  /** Combo needed per multiplier step. */
  comboPerStep: 3,
  multiplierStep: 0.5,
  maxMultiplier: 8,
  /** Seconds a combo survives without a new near-miss/pickup. */
  baseComboDuration: 3.2,
  /** Multiplier at which the phoenix visually transforms (ascended form). */
  ascendedMultiplier: 3,
} as const;

export const XP = {
  perEmber: 1,
  perKill: 1,
  perEliteKill: 6,
  perBossStage: 10,
  /** XP required to go from `level` to `level + 1`. */
  base: 9,
  growth: 1.24,
  linear: 3,
} as const;

export const DIFFICULTY = {
  /** Threat rises with elapsed time (per minute) and with player level. */
  threatPerMinute: 1,
  threatPerLevel: 0.34,
  spawnIntervalStart: 1.45,
  spawnIntervalDecay: 0.87,
  spawnIntervalMin: 0.3,
  speedPerThreat: 0.085,
  speedMax: 2.15,
  hpPerThreat: 0.34,
  maxEnemiesStart: 6,
  maxEnemiesPerThreat: 2.2,
  maxEnemiesCap: 32,
  /** An elite spawns every N player levels. */
  eliteEveryLevels: 3,
  /** First boss appears at this elapsed time (seconds), then every `bossInterval`. */
  firstBossAt: 170,
  bossInterval: 150,
  /** Seconds between arena sector collapses (scales down with threat). */
  collapseIntervalStart: 22,
  collapseIntervalMin: 8,
} as const;

/** Seconds of elapsed run time before each enemy archetype joins the spawn table. */
export const ENEMY_UNLOCK: Record<string, number> = {
  cinder: 0,
  dart: 14,
  spitter: 30,
  orbiter: 50,
  splitter: 74,
  mine: 96,
};

export const ENEMY = {
  cinder: { hp: 1, speed: 62, radius: 14, score: 20, xp: 1, weight: 34 },
  dart: { hp: 2, speed: 520, radius: 13, score: 34, xp: 1, weight: 22, telegraph: 0.72, chargeTime: 0.75, restTime: 0.9 },
  spitter: { hp: 3, speed: 46, radius: 16, score: 40, xp: 2, weight: 18, fireInterval: 2.5, telegraph: 0.55, projectileSpeed: 190 },
  orbiter: { hp: 2, speed: 150, radius: 13, score: 38, xp: 2, weight: 16, orbitTime: 2.6, diveSpeed: 430 },
  splitter: { hp: 4, speed: 54, radius: 21, score: 55, xp: 2, weight: 12, children: 3 },
  mine: { hp: 2, speed: 0, radius: 15, score: 30, xp: 1, weight: 10, armTime: 2.4, blastRadius: 96 },
} as const;

export const ELITE = {
  hpMultiplier: 9,
  radiusMultiplier: 1.9,
  speedMultiplier: 0.8,
  emberDrop: 10,
} as const;

export const BOSS = {
  name: 'THE ASHBORN',
  /** Hit points for each of the three stages (stage 1 → 3). */
  stageHp: [44, 56, 68],
  radius: 54,
  warningTime: 3,
  emberDrop: 40,
  /** Boss contact damage ignores nothing — same 1 HP as anything else. */
} as const;

export const PICKUP = {
  emberRadius: 9,
  basePickupRadius: 34,
  /** Ember shards drift toward the player once inside the pickup radius. */
  magnetSpeed: 430,
  lifetime: 14,
  /** Chance an ordinary kill drops an ember shard. */
  dropChance: 0.72,
  /** Ambient shards spawned by the arena itself, seconds between. */
  ambientInterval: 2.1,
  maxAmbient: 14,
} as const;

export const HAZARD = {
  /** Angular width of a collapsing sector, in degrees. */
  sectorWidth: 62,
  telegraphTime: 1.6,
  activeTime: 4.2,
  /** Inner normalised radius the collapse starts at (0 = arena centre). */
  innerRadius: 0.32,
  damageCooldown: 0.9,
} as const;

export const AUDIO = {
  masterVolume: 0.65,
  musicVolume: 0.4,
  sfxVolume: 0.75,
} as const;

export const STORAGE_KEY = 'emberloop.save.v1';

/** Enable the FPS counter with ?debug=1 (or a dev build + localStorage flag). */
export const DEBUG_FLAG = 'debug';
