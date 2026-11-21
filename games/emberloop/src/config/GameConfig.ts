/**
 * EMBERLOOP — centralized tuning constants.
 *
 * Everything a designer would want to tweak lives here. Nothing in this file
 * imports Phaser, so it is safe to pull into unit tests.
 */

/** Reference portrait viewport the game is tuned against (iPhone 14 logical px). */
export const DESIGN = { width: 390, height: 844 } as const;

/**
 * The arena wall is a rounded rectangle (a superellipse) fitted to the frame of
 * the board art; see effects/Arena.ts. All gameplay maths uses the normalised
 * radius n, where n = 1 is the wall. This keeps "circular arena" logic (angular
 * wedges, orbits, radial spawns) whatever the shape or screen size.
 */
export const ARENA = {
  /** Radius used when drawing hazard wedges in unit space before the arena scale. */
  drawRadius: 1000,
  /** Enemies spawn at this normalised radius (just outside the wall/screen). */
  spawnRadius: 1.18,
  /** Enemies further out than this are culled. */
  cullRadius: 1.9,
} as const;

/**
 * Graze shots (founder decision 2026-11-20, "option B"): every near-miss also
 * fires a real ember from the phoenix. Grazing an enemy shoots that enemy;
 * grazing a bullet shoots the nearest enemy. Close flying is now an attack as
 * well as the Heat/Burst engine. Damage is deliberately small: the Burst stays
 * the big hit.
 */
export const GRAZE_SHOT = {
  /** Damage when you grazed the enemy itself. */
  damageEnemyGraze: 1,
  /** Damage when you grazed a bullet (shot goes to the nearest enemy). */
  damageBulletGraze: 0.5,
  speed: 560,
  radius: 5,
  life: 1.2,
  /** Bullet grazes only fire if an enemy is this close (px). */
  bulletGrazeRange: 260,
} as const;

export const PLAYER = {
  maxHealth: 3,
  radius: 13,
  /**
   * On-screen wingspan of the phoenix art in CSS px. Kept small so the bird reads
   * close to its hitbox, fits through gaps between enemies, and never hides the
   * Emberblades orbiting at 44 px or shots leaving the body.
   */
  wingspan: 56,
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
  /**
   * The ultimate meter charges from KILLS ONLY (founder decision 2026-11-21).
   * Holding, flying and grazing no longer charge it. Kills made by an ultimate
   * itself never charge it, so an ultimate cannot refill itself.
   * ~7 ordinary kills per charge.
   */
  energyPerKill: 14,
  energyPerEliteKill: 50,
  /** Breaking a boss stage, and felling the boss (which fills the meter). */
  energyPerBossStage: 50,
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
   * Pressure ("threat") comes from where the player is in the board sequence
   * (see BOARD), never from player level: levelling is driven by collecting
   * shards, and tying enemy pressure to it would punish the core verb.
   */
  spawnIntervalStart: 1.45,
  spawnIntervalDecay: 0.87,
  spawnIntervalMin: 0.32,
  speedPerThreat: 0.075,
  speedMax: 2.0,
  hpPerThreat: 0.3,
  maxEnemiesStart: 6,
  maxEnemiesPerThreat: 2.0,
  maxEnemiesCap: 28,
  /** Seconds between arena sector collapses (scales down with threat). */
  collapseIntervalStart: 24,
  collapseIntervalMin: 9,
} as const;

/**
 * Boards (founder decision 2026-11-21). Each faction is one board: its three
 * enemies for a wave, then its boss, then a rest screen. Six boards make a
 * loop; after board 6 the loop starts again, harder.
 *
 * Threat = board × boardStep + loop × loopStep + (0 → inBoardRamp across the wave).
 * Loop 1 runs 0 → 2.75; loop 2 starts at 1.6 (about board 4 of loop 1, so the
 * restart is not a wall) and every loop-2 board is harder than its loop-1 twin.
 */
export const BOARD = {
  count: 6,
  waveSeconds: 60,
  /** Short intro banner before enemies start. */
  introSeconds: 2.2,
  boardStep: 0.45,
  loopStep: 1.6,
  inBoardRamp: 0.5,
  /** Boss HP multiplier: +15% per board, +60% per loop. */
  bossHpPerBoard: 0.15,
  bossHpPerLoop: 0.6,
  /** The older procedural enemies join as occasional extras from these boards of loop 1. */
  extrasFrom: { orbiter: 1, splitter: 2, mine: 3 } as Record<string, number>,
  extrasWeightMul: 0.5,
  /** Elites arrive at these seconds into a wave; the second one from board 4 or loop 2. */
  eliteAt: [25, 48],
  secondEliteFromBoard: 3,
  /** Hearts restored at the rest point (on top of the boss kill's +1). */
  restHeal: 1,
  /** Seconds of clean-up (embers fly to you) between the boss falling and the rest screen. */
  clearSeconds: 2.2,
} as const;

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
  /**
   * Hit points for each of the three stages: 35% / 35% / 30% of 168, so phase 2
   * begins below 65% and phase 3 below 30% (founder brief). Which boss appears
   * is config/bosses.ts.
   */
  stageHp: [59, 59, 50],
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
