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

/**
 * Steering feel. `relative` is the default because on a phone the finger sits
 * on top of whatever it is pointing at — with absolute steering the phoenix is
 * permanently hidden under the thumb, exactly when you most need to see it.
 */
export const CONTROL = {
  /** Relative mode: phoenix travel per pixel of finger travel. */
  relativeGain: 1.75,
  /** Joystick mode: distance from the planted stick at which throttle is full. */
  stickRadius: 62,
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
  /**
   * Threat rises with **elapsed time only**.
   *
   * It deliberately does NOT rise with player level. Levelling is driven by
   * collecting shards, and tying enemy pressure to it punished the exact
   * behaviour the game is built around: collect faster, get shot at more. Now
   * the clock sets the pressure and levelling is pure upside — collecting fast
   * means more upgrades against the same wave, which is the incentive we want.
   */
  threatPerMinute: 1,
  spawnIntervalStart: 1.45,
  spawnIntervalDecay: 0.87,
  spawnIntervalMin: 0.32,
  speedPerThreat: 0.075,
  speedMax: 2.0,
  hpPerThreat: 0.3,
  maxEnemiesStart: 6,
  maxEnemiesPerThreat: 2.0,
  maxEnemiesCap: 28,
  /**
   * Elites are on the clock too, for the same reason. They are as much a reward
   * (a big ember payout) as a threat, so they must not arrive faster just
   * because the player is collecting well.
   */
  eliteIntervalStart: 46,
  eliteIntervalMin: 26,
  /**
   * Boss cadence. The first boss lands early enough that a typical run actually
   * meets one — the old 170s meant most runs ended without ever seeing the
   * headline encounter, which is a poor reason to stop playing.
   */
  firstBossAt: 80,
  bossInterval: 100,
  /** Seconds between arena sector collapses (scales down with threat). */
  collapseIntervalStart: 24,
  collapseIntervalMin: 9,
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
  /** Health restored for felling a boss — the reason to fight rather than flee. */
  healOnKill: 1,
  /** Bonus XP on a boss kill, on top of the per-stage award. */
  xpOnKill: 24,
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
  ambientInterval: 1.9,
  maxAmbient: 16,
  /**
   * Ember Chain: shards collected within this window of each other build a
   * streak that pays escalating XP. This is the positive incentive that
   * replaces the old (backwards) "levelling makes it harder" pressure.
   */
  chainWindow: 2.8,
  /** Every N chained shards adds +1 XP per shard, up to `chainXpMax`. */
  chainStep: 4,
  chainXpMax: 4,
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
