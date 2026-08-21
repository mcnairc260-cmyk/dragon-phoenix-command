import Phaser from 'phaser';
import { BURST, PLAYER } from '../config/GameConfig';
import { clamp, damp } from '../core/math';
import { TEX } from '../effects/Textures';
import type { Arena } from '../effects/Arena';
import type { Palette } from '../systems/Cosmetics';
import type { PlayerStats } from '../upgrades/UpgradeDefs';

export interface PointerTarget {
  active: boolean;
  x: number;
  y: number;
}

/**
 * The phoenix. Drag-to-steer with momentum, three hit points, an energy meter
 * that turns into the Phoenix Burst, and a visual state that escalates with the
 * score multiplier.
 */
export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  health: number = PLAYER.maxHealth;
  invulnTimer = 0;
  /** Seconds since the last hit — feeds the "untouchable" achievement. */
  cleanTimer = 0;

  burstEnergy = 0;
  burstCharges = 0;
  burstCooldown = 0;

  shieldActive = false;
  shieldTimer = 0;
  emergencyHealsLeft = 0;

  ascended = false;
  stats!: PlayerStats;

  private readonly scene: Phaser.Scene;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly innerGlow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shieldRing: Phaser.GameObjects.Image;
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly blades: Phaser.GameObjects.Image[] = [];
  private bladeAngle = 0;
  private facing = 0;
  private pulse = 0;
  private palette!: Palette;

  reducedMotion = false;

  constructor(scene: Phaser.Scene, depth: number, palette: Palette, stats: PlayerStats) {
    this.scene = scene;

    this.trail = scene.add
      .particles(0, 0, TEX.glowTight, {
        lifespan: { min: 260, max: 620 },
        speed: { min: 5, max: 45 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.75, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 18,
        quantity: 1,
      })
      .setDepth(depth - 1);

    this.glow = scene.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setScale(1.12);
    // Layered bloom: a wide soft halo plus a tight hot core, which is how the
    // "single strong light source" of the brand's imagery direction reads.
    this.innerGlow = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1);
    this.shieldRing = scene.add
      .image(0, 0, TEX.ring)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 2)
      .setScale(0.32)
      .setVisible(false);
    this.body = scene.add.image(0, 0, TEX.phoenix).setDepth(depth + 3).setScale(1.0);

    this.setPalette(palette);
    this.applyStats(stats);
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.glow.setTint(palette.glow);
    this.innerGlow.setTint(palette.accent);
    this.body.setTint(palette.core);
    this.shieldRing.setTint(palette.accent);
    this.trail.setParticleTint(palette.glow);
    for (const blade of this.blades) blade.setTint(palette.accent);
  }

  get colors(): Palette {
    return this.palette;
  }

  /** Re-read the stat block after an upgrade is taken. */
  applyStats(stats: PlayerStats): void {
    this.stats = stats;

    // Orbiting blades: add/remove sprites so the visual always matches the build.
    while (this.blades.length < stats.orbitBlades) {
      const blade = this.scene.add
        .image(0, 0, TEX.blade)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.body.depth + 1)
        .setTint(this.palette.accent)
        .setScale(0.9);
      this.blades.push(blade);
    }
    while (this.blades.length > stats.orbitBlades) {
      this.blades.pop()?.destroy();
    }

    if (stats.shieldRecharge > 0 && this.shieldTimer === 0 && !this.shieldActive) {
      // First time the shield is taken it comes online immediately.
      this.shieldActive = true;
    }
    this.emergencyHealsLeft = Math.max(this.emergencyHealsLeft, stats.emergencyHeals);
  }

  spawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = PLAYER.maxHealth;
    this.invulnTimer = 0;
    this.cleanTimer = 0;
    this.burstEnergy = 0;
    this.burstCharges = 0;
    this.burstCooldown = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.trail.start();
  }

  get maxBurstCharges(): number {
    return this.stats.burstCharges;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get hitRadius(): number {
    return PLAYER.hitRadius;
  }

  get nearMissRadius(): number {
    return PLAYER.nearMissRadius;
  }

  get invulnerable(): boolean {
    return this.invulnTimer > 0;
  }

  update(dt: number, pointer: PointerTarget, arena: Arena): void {
    const maxSpeed = PLAYER.baseSpeed * this.stats.speedMul;

    if (pointer.active) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        // Speed ramps with pointer distance so small nudges give fine control.
        const power = clamp(dist / PLAYER.fullSpeedDistance, 0, 1);
        const targetVx = (dx / dist) * maxSpeed * power;
        const targetVy = (dy / dist) * maxSpeed * power;
        this.vx = damp(this.vx, targetVx, PLAYER.accel, dt);
        this.vy = damp(this.vy, targetVy, PLAYER.accel, dt);
      }
      // Charging happens while held; movement charges faster than hovering.
      const speedFraction = clamp(this.speed / maxSpeed, 0, 1);
      const gain = PLAYER.baseSpeed > 0
        ? BURST.energyPerSecondIdle + (BURST.energyPerSecondMoving - BURST.energyPerSecondIdle) * speedFraction
        : BURST.energyPerSecondIdle;
      this.addBurstEnergy(gain * dt);
    } else {
      // Released: glide out with momentum rather than stopping dead.
      const decay = Math.pow(PLAYER.dragPerSecond, dt);
      this.vx *= decay;
      this.vy *= decay;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce softly off the caldera wall instead of sticking to it.
    const point = { x: this.x, y: this.y };
    if (arena.clamp(point, 1)) {
      this.x = point.x;
      this.y = point.y;
      const nx = (this.x - arena.cx) / arena.rx;
      const ny = (this.y - arena.cy) / arena.ry;
      const len = Math.hypot(nx, ny) || 1;
      const dot = (this.vx * nx + this.vy * ny) / len;
      if (dot > 0) {
        this.vx -= (nx / len) * dot * 1.3;
        this.vy -= (ny / len) * dot * 1.3;
      }
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.cleanTimer += dt;
    if (this.burstCooldown > 0) this.burstCooldown = Math.max(0, this.burstCooldown - dt);

    // Shield recharge.
    if (this.stats.shieldRecharge > 0 && !this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldActive = true;
    }

    this.updateVisuals(dt);
  }

  private updateVisuals(dt: number): void {
    this.pulse += dt;

    if (this.speed > 12) {
      const target = Math.atan2(this.vy, this.vx);
      this.facing = Phaser.Math.Angle.RotateTo(this.facing, target, 12 * dt);
    }
    this.body.setRotation(this.facing);
    this.body.setPosition(this.x, this.y);
    this.body.setTexture(this.ascended ? TEX.phoenixAscended : TEX.phoenix);

    // Brand Bible motion rule: "subtle, purposeful ... never bouncy, never
    // busy." A slow breath only — the fast wing-beat read as bounce.
    const breathe = this.reducedMotion ? 1 : 1 + Math.sin(this.pulse * 4.5) * 0.035;
    const ascendBoost = this.ascended ? 1.3 : 1;
    this.glow.setPosition(this.x, this.y);
    this.glow.setScale(1.12 * breathe * ascendBoost);
    // The glow is what makes the phoenix read as fire rather than a pale
    // cut-out, so it stays bright; only the invulnerable flicker dims it.
    this.glow.setAlpha(this.invulnerable ? 0.5 + 0.35 * Math.sin(this.pulse * 30) : 0.92);
    this.innerGlow.setPosition(this.x, this.y).setRotation(this.facing);
    this.innerGlow.setScale(0.62 * breathe * ascendBoost);
    this.innerGlow.setAlpha(this.invulnerable ? 0.4 : 0.85);
    const bodyScale = this.ascended ? 1.16 : 1.0;
    this.body.setScale(bodyScale * breathe);
    this.body.setAlpha(this.invulnerable ? 0.5 + 0.4 * Math.sin(this.pulse * 30) : 1);

    // Emit behind the bird so its nose and wings remain crisp at full speed.
    this.trail.setPosition(this.x - Math.cos(this.facing) * 22, this.y - Math.sin(this.facing) * 22);
    this.trail.frequency = this.ascended ? 10 : 18;

    this.shieldRing.setVisible(this.shieldActive);
    if (this.shieldActive) {
      this.shieldRing.setPosition(this.x, this.y);
      this.shieldRing.setScale(0.3 + Math.sin(this.pulse * 3) * 0.015);
      this.shieldRing.setAlpha(0.55 + Math.sin(this.pulse * 3) * 0.15);
    }

    // Blades sweep faster and wider as the build grows.
    this.bladeAngle += dt * (2.4 + this.stats.orbitBladeDamage * 0.5);
    const radius = 44 + this.stats.orbitBladeDamage * 7;
    for (let i = 0; i < this.blades.length; i++) {
      const a = this.bladeAngle + (i / this.blades.length) * Math.PI * 2;
      const blade = this.blades[i];
      blade.setPosition(this.x + Math.cos(a) * radius, this.y + Math.sin(a) * radius);
      blade.setRotation(a + Math.PI / 2);
      blade.setAlpha(0.85);
    }
  }

  /** Positions of the live orbit blades, for collision in the game scene. */
  bladePositions(): { x: number; y: number }[] {
    return this.blades.map((b) => ({ x: b.x, y: b.y }));
  }

  setAscended(on: boolean): void {
    if (this.ascended === on) return;
    this.ascended = on;
  }

  addBurstEnergy(amount: number): boolean {
    if (this.burstCharges >= this.maxBurstCharges) {
      this.burstEnergy = BURST.maxEnergy;
      return false;
    }
    this.burstEnergy += amount;
    if (this.burstEnergy >= BURST.maxEnergy) {
      this.burstEnergy = 0;
      this.burstCharges = Math.min(this.burstCharges + 1, this.maxBurstCharges);
      return true; // newly charged — the caller plays the "ready" cue
    }
    return false;
  }

  get burstFraction(): number {
    if (this.burstCharges >= this.maxBurstCharges) return 1;
    return clamp(this.burstEnergy / BURST.maxEnergy, 0, 1);
  }

  canBurst(): boolean {
    return this.burstCharges > 0 && this.burstCooldown <= 0;
  }

  consumeBurst(): void {
    this.burstCharges = Math.max(0, this.burstCharges - 1);
    this.burstCooldown = BURST.cooldown;
  }

  get burstRadius(): number {
    return BURST.radius * this.stats.burstRadiusMul;
  }

  get burstDamage(): number {
    return BURST.damage * this.stats.burstDamageMul;
  }

  /**
   * Apply one point of damage.
   * Returns what actually happened so the caller can pick feedback.
   */
  takeDamage(): 'ignored' | 'shielded' | 'armored' | 'hit' | 'revived' | 'dead' {
    if (this.invulnerable) return 'ignored';

    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = this.stats.shieldRecharge;
      this.invulnTimer = 0.5;
      return 'shielded';
    }
    if (this.stats.armorChance > 0 && Math.random() < this.stats.armorChance) {
      this.invulnTimer = 0.35;
      return 'armored';
    }

    this.health -= 1;
    this.cleanTimer = 0;
    this.invulnTimer = PLAYER.invulnAfterHit + this.stats.invulnBonus;

    if (this.health <= 0 && this.emergencyHealsLeft > 0) {
      this.emergencyHealsLeft -= 1;
      this.health = 1;
      this.invulnTimer = Math.max(this.invulnTimer, 2.2);
      return 'revived';
    }
    return this.health <= 0 ? 'dead' : 'hit';
  }

  stopTrail(): void {
    this.trail.stop();
  }

  destroy(): void {
    this.trail.destroy();
    this.glow.destroy();
    this.innerGlow.destroy();
    this.body.destroy();
    this.shieldRing.destroy();
    for (const blade of this.blades) blade.destroy();
    this.blades.length = 0;
  }
}
