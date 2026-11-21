import Phaser from 'phaser';
import { BRAND, SIGNAL } from '../config/brand';
import { TAU } from '../core/math';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Fx } from '../effects/Fx';
import { TEX } from '../effects/Textures';
import type { PlayerStats } from '../upgrades/UpgradeDefs';
import { ULT, ULTIMATES_BY_ID, ultimatePower, type UltimateDef, type UltimateId } from '../upgrades/Ultimates';

/** What the controller needs from the game scene. Kept narrow on purpose. */
export interface UltimateHost {
  scene: Phaser.Scene;
  fxDepth: number;
  fx: Fx;
  player: () => Player;
  stats: () => PlayerStats;
  enemies: () => readonly Enemy[];
  boss: () => { x: number; y: number; radius: number } | null;
  damageEnemy: (enemy: Enemy, amount: number) => void;
  damageBoss: (amount: number) => void;
  clearHostileBullets: (x: number, y: number, radius: number) => void;
  healPlayer: (hearts: number) => void;
  fireFriendly: (o: { x: number; y: number; angle: number; speed: number; damage: number; life: number; color: number; pierce: number }) => void;
  slowMo: (scale: number, duration: number) => void;
}

interface Singularity {
  x: number;
  y: number;
  time: number;
  tick: number;
  core: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
}

/**
 * Runs the six elemental ultimates (upgrades/Ultimates.ts). The innate Phoenix
 * Burst stays in GameScene.doBurst, unchanged.
 *
 * Safety rules from the founder brief: every lasting effect has a fixed
 * duration; damage-over-time ticks on a fixed cadence (never per frame); no
 * ultimate is triggered by damage, so nothing can recurse; heals go through
 * healPlayer, which caps at max hearts; bosses resist freeze and pull.
 */
export class UltimateController {
  ultimate: UltimateId = 'burst';
  ascension = 0;

  /** Boss time scale while Absolute Zero's chill lasts. */
  bossSlowTimer = 0;

  private freezeWave: { x: number; y: number; time: number; hit: Set<Enemy> } | null = null;
  private singularity: Singularity | null = null;
  private storm: { strikes: number; timer: number; struck: Map<Enemy, number> } | null = null;
  private celestial: { time: number; timer: number } | null = null;
  private regrowTimer = 0;
  private speedTimer = 0;
  private burnTick = 0;

  constructor(private readonly host: UltimateHost) {}

  get def(): UltimateDef {
    return ULTIMATES_BY_ID.get(this.ultimate) as UltimateDef;
  }

  get power(): number {
    return ultimatePower(this.ascension);
  }

  /** True while a timed ultimate is still running. */
  get busy(): boolean {
    return this.freezeWave !== null || this.singularity !== null || this.storm !== null || this.celestial !== null;
  }

  reset(): void {
    this.ultimate = 'burst';
    this.ascension = 0;
    this.bossSlowTimer = 0;
    this.freezeWave = null;
    this.clearSingularity();
    this.storm = null;
    this.endCelestial();
    this.regrowTimer = 0;
    this.speedTimer = 0;
    this.burnTick = 0;
  }

  private range(base: number): number {
    return base * this.host.stats().rangeMul;
  }

  /** Fire the equipped elemental ultimate at the phoenix's position. */
  cast(): void {
    const p = this.host.player();
    switch (this.ultimate) {
      case 'supernova':
        return this.supernova(p.x, p.y);
      case 'absolute-zero':
        return this.absoluteZero(p.x, p.y);
      case 'void-collapse': {
        const at = this.singularityPoint(p.x, p.y);
        return this.voidCollapse(at.x, at.y);
      }
      case 'worldroot':
        return this.worldroot(p.x, p.y);
      case 'storm-apocalypse':
        return this.stormApocalypse();
      case 'celestial':
        return this.celestialAscendancy();
      default:
        return undefined;
    }
  }

  // ── Casts ─────────────────────────────────────────────────────────────────
  private supernova(x: number, y: number): void {
    const { fx } = this.host;
    const c = ULT.supernova;
    const radius = this.range(c.radius);
    const damage = c.damage * this.power;
    const player = this.host.player();
    player.invulnTimer = Math.max(player.invulnTimer, c.protect);

    fx.flashOrb(x, y, BRAND.emberOrange, radius, 520);
    fx.shockwave(x, y, BRAND.rebirthGold, radius * 2, 700);
    fx.shockwave(x, y, BRAND.emberOrange, radius * 1.4, 520, 1.4);
    fx.burstEmbers(x, y, BRAND.emberOrange, 40);
    fx.burstSparks(x, y, BRAND.rebirthGold, 60, 640);
    fx.flash(BRAND.emberOrange, 0.32, 300);
    fx.chromaticFlash(14, 260);
    fx.shake(0.022, 420);
    this.host.slowMo(0.3, 0.5);

    for (const enemy of [...this.host.enemies()]) {
      if (!enemy.active || Math.hypot(enemy.x - x, enemy.y - y) > radius + enemy.radius) continue;
      enemy.burnTimer = c.burnTime;
      enemy.burnDps = c.burnDps * this.power;
      this.host.damageEnemy(enemy, damage);
    }
    this.hitBoss(x, y, radius, damage * c.bossFactor);
    this.host.clearHostileBullets(x, y, radius);
  }

  private absoluteZero(x: number, y: number): void {
    const { fx } = this.host;
    const radius = this.range(ULT.absoluteZero.radius);
    this.freezeWave = { x, y, time: 0, hit: new Set() };
    fx.shockwave(x, y, BRAND.signalCyan, radius * 2, ULT.absoluteZero.expandTime * 1000, 1.6);
    fx.shockwave(x, y, 0xffffff, radius * 1.6, ULT.absoluteZero.expandTime * 1300, 0.6);
    fx.burstSparks(x, y, BRAND.signalCyan, 50, 520);
    fx.flash(BRAND.signalCyan, 0.25, 320);
    fx.shake(0.012, 300);
    this.host.slowMo(0.45, 0.35);
    const boss = this.host.boss();
    if (boss) this.bossSlowTimer = ULT.absoluteZero.bossSlowTime;
    this.hitBoss(x, y, radius, ULT.absoluteZero.damage * this.power);
  }

  /**
   * Where the singularity opens: the centre of nearby enemies, pushed at least
   * `minDistance` away from the phoenix. Opening it on the phoenix would drag
   * every enemy into the player (found in playtest).
   */
  private singularityPoint(px: number, py: number): { x: number; y: number } {
    const minDistance = 130;
    const near = this.host.enemies().filter((e) => e.active && Math.hypot(e.x - px, e.y - py) <= 320);
    let x: number;
    let y: number;
    if (near.length > 0) {
      x = near.reduce((sum, e) => sum + e.x, 0) / near.length;
      y = near.reduce((sum, e) => sum + e.y, 0) / near.length;
    } else {
      const p = this.host.player();
      const heading = Math.hypot(p.vx, p.vy) > 10 ? Math.atan2(p.vy, p.vx) : -Math.PI / 2;
      x = px + Math.cos(heading) * minDistance;
      y = py + Math.sin(heading) * minDistance;
    }
    const d = Math.hypot(x - px, y - py);
    if (d < minDistance) {
      // Enemies all around us: open it on the side with the nearest enemy.
      const ref = near.length > 0 ? near.reduce((a, b) => (Math.hypot(a.x - px, a.y - py) < Math.hypot(b.x - px, b.y - py) ? a : b)) : null;
      const angle = d > 1 ? Math.atan2(y - py, x - px) : ref ? Math.atan2(ref.y - py, ref.x - px) : -Math.PI / 2;
      x = px + Math.cos(angle) * minDistance;
      y = py + Math.sin(angle) * minDistance;
    }
    return { x, y };
  }

  private voidCollapse(x: number, y: number): void {
    const { scene, fx, fxDepth } = this.host;
    this.clearSingularity();
    const halo = scene.add.image(x, y, TEX.glow).setTint(SIGNAL.violet).setBlendMode(Phaser.BlendModes.ADD).setDepth(fxDepth).setScale(3.2).setAlpha(0.7);
    const core = scene.add.image(x, y, TEX.glowTight).setTint(0x2a0b4a).setDepth(fxDepth + 1).setScale(1.4);
    this.singularity = { x, y, time: 0, tick: 0, core, halo };
    fx.shockwave(x, y, SIGNAL.violet, this.range(ULT.voidCollapse.pullRadius) * 2, 500, 1.2);
    fx.flash(SIGNAL.violet, 0.2, 260);
    fx.shake(0.01, 260);
  }

  private worldroot(x: number, y: number): void {
    const { fx } = this.host;
    const c = ULT.worldroot;
    const player = this.host.player();
    this.host.healPlayer(this.ascension >= 3 ? c.heartsAtTier3 : c.hearts);
    player.shieldActive = true;
    this.regrowTimer = c.regrowAfter;

    const radius = this.range(c.rootRadius);
    fx.shockwave(x, y, SIGNAL.toxic, radius * 2, 700, 1.6);
    fx.shockwave(x, y, BRAND.rebirthGold, radius * 1.3, 520, 0.7);
    fx.burstSparks(x, y, SIGNAL.toxic, 44, 420);
    fx.flash(SIGNAL.toxic, 0.2, 320);
    for (const enemy of [...this.host.enemies()]) {
      if (enemy.active && Math.hypot(enemy.x - x, enemy.y - y) <= radius + enemy.radius) this.host.damageEnemy(enemy, c.rootDamage * this.power);
    }
    this.hitBoss(x, y, radius, c.rootDamage * this.power);
  }

  private stormApocalypse(): void {
    const c = ULT.storm;
    this.storm = { strikes: c.strikes, timer: 0, struck: new Map() };
    this.speedTimer = c.speedTime;
    this.host.player().speedBoost = c.speedBoost;
    this.host.fx.flash(BRAND.rebirthGold, 0.18, 220);
    this.host.fx.shake(0.008, 300);
  }

  private celestialAscendancy(): void {
    this.celestial = { time: this.def.duration, timer: 0 };
    this.host.player().setCelestial(true);
    const p = this.host.player();
    this.host.fx.shockwave(p.x, p.y, SIGNAL.magenta, 260, 520, 1.2);
    this.host.fx.shockwave(p.x, p.y, BRAND.rebirthGold, 200, 420, 0.8);
    this.host.fx.flash(SIGNAL.magenta, 0.2, 260);
  }

  private hitBoss(x: number, y: number, radius: number, damage: number): void {
    const boss = this.host.boss();
    if (boss && Math.hypot(boss.x - x, boss.y - y) <= radius + boss.radius) this.host.damageBoss(damage);
  }

  // ── Per-frame ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    if (this.bossSlowTimer > 0) this.bossSlowTimer = Math.max(0, this.bossSlowTimer - dt);
    this.updateBurn(dt);
    this.updateFreezeWave(dt);
    this.updateSingularity(dt);
    this.updateStorm(dt);
    this.updateCelestial(dt);

    if (this.regrowTimer > 0) {
      this.regrowTimer -= dt;
      if (this.regrowTimer <= 0) this.host.healPlayer(1);
    }
    if (this.speedTimer > 0) {
      this.speedTimer -= dt;
      if (this.speedTimer <= 0) this.host.player().speedBoost = 1;
    }
  }

  /** Supernova burn: ticks four times a second, never per frame. */
  private updateBurn(dt: number): void {
    this.burnTick -= dt;
    if (this.burnTick > 0) return;
    const tick = 0.25;
    this.burnTick = tick;
    for (const enemy of [...this.host.enemies()]) {
      if (!enemy.active || enemy.burnTimer <= 0) continue;
      enemy.burnTimer -= tick;
      this.host.fx.burstSparks(enemy.x, enemy.y, BRAND.emberOrange, 2, 60);
      this.host.damageEnemy(enemy, enemy.burnDps * tick);
    }
  }

  private updateFreezeWave(dt: number): void {
    const wave = this.freezeWave;
    if (!wave) return;
    const c = ULT.absoluteZero;
    wave.time += dt;
    const reach = this.range(c.radius) * Math.min(1, wave.time / c.expandTime);
    const freeze = c.freeze + c.freezePerTier * (Math.max(1, this.ascension) - 1);
    for (const enemy of [...this.host.enemies()]) {
      if (!enemy.active || wave.hit.has(enemy) || Math.hypot(enemy.x - wave.x, enemy.y - wave.y) > reach + enemy.radius) continue;
      wave.hit.add(enemy);
      enemy.freeze(freeze);
      this.host.damageEnemy(enemy, c.damage * this.power);
    }
    if (wave.time >= c.expandTime) this.freezeWave = null;
  }

  private updateSingularity(dt: number): void {
    const s = this.singularity;
    if (!s) return;
    const c = ULT.voidCollapse;
    s.time += dt;
    s.tick -= dt;
    const pullRadius = this.range(c.pullRadius);
    s.halo.setRotation(s.time * 2).setScale(3.2 + Math.sin(s.time * 9) * 0.25);
    s.core.setScale(1.4 + s.time * 0.25);

    const grind = s.tick <= 0;
    if (grind) s.tick = c.tick;
    for (const enemy of [...this.host.enemies()]) {
      if (!enemy.active) continue;
      const dx = s.x - enemy.x;
      const dy = s.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > pullRadius) continue;
      // Caught enemies are helpless while dragged, so the pull can never throw one into the player.
      enemy.heldTimer = Math.max(enemy.heldTimer, 0.2);
      // Pull harder near the centre; bosses are never moved (they are not in this list).
      if (dist > 6) {
        const step = Math.min(dist, c.pullSpeed * (0.5 + (1 - dist / pullRadius)) * dt);
        enemy.x += (dx / dist) * step;
        enemy.y += (dy / dist) * step;
      }
      if (grind && dist <= c.coreRadius + enemy.radius) this.host.damageEnemy(enemy, c.tickDamage * this.power);
    }

    if (s.time >= this.def.duration) {
      const radius = this.range(c.implodeRadius);
      const damage = c.implodeDamage * this.power;
      this.host.fx.flashOrb(s.x, s.y, SIGNAL.violet, radius, 360);
      this.host.fx.shockwave(s.x, s.y, SIGNAL.violet, radius * 2, 480, 1.4);
      this.host.fx.burstSparks(s.x, s.y, SIGNAL.violet, 50, 520);
      this.host.fx.shake(0.018, 320);
      for (const enemy of [...this.host.enemies()]) {
        if (enemy.active && Math.hypot(enemy.x - s.x, enemy.y - s.y) <= radius + enemy.radius) this.host.damageEnemy(enemy, damage);
      }
      this.hitBoss(s.x, s.y, radius, damage);
      this.host.clearHostileBullets(s.x, s.y, radius);
      this.clearSingularity();
    }
  }

  private clearSingularity(): void {
    if (!this.singularity) return;
    this.singularity.core.destroy();
    this.singularity.halo.destroy();
    this.singularity = null;
  }

  private updateStorm(dt: number): void {
    const storm = this.storm;
    if (!storm) return;
    const c = ULT.storm;
    storm.timer -= dt;
    if (storm.timer > 0) return;
    storm.timer = c.interval;
    storm.strikes -= 1;
    if (storm.strikes < 0) {
      this.storm = null;
      return;
    }

    const p = this.host.player();
    const damage = c.damage * this.power;
    const boss = this.host.boss();
    // Priority: boss, then elites, then the nearest enemy in range.
    if (boss && Math.hypot(boss.x - p.x, boss.y - p.y) <= c.range + boss.radius) {
      this.bolt(boss.x, boss.y);
      this.host.damageBoss(damage);
      return;
    }
    const inRange = this.host.enemies().filter((e) => e.active && Math.hypot(e.x - p.x, e.y - p.y) <= c.range);
    if (inRange.length === 0) return;
    // Elites first; then spread strikes (fewest strikes so far); then nearest.
    const struck = (e: Enemy) => storm.struck.get(e) ?? 0;
    inRange.sort(
      (a, b) =>
        Number(b.isElite) - Number(a.isElite) ||
        struck(a) - struck(b) ||
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    );
    let target = inRange[0];
    storm.struck.set(target, struck(target) + 1);
    this.bolt(target.x, target.y);
    const hit = new Set<Enemy>([target]);
    this.host.damageEnemy(target, damage);
    // Limited chain with falloff: 100% → 60% → 36%.
    let chainDamage = damage;
    for (let i = 0; i < c.chain; i++) {
      chainDamage *= c.chainFalloff;
      let next: Enemy | null = null;
      let best: number = c.chainRange;
      for (const e of this.host.enemies()) {
        if (!e.active || hit.has(e)) continue;
        const d = Math.hypot(e.x - target.x, e.y - target.y);
        if (d < best) {
          best = d;
          next = e;
        }
      }
      if (!next) break;
      this.zap(target.x, target.y, next.x, next.y, BRAND.rebirthGold);
      hit.add(next);
      this.host.damageEnemy(next, chainDamage);
      target = next;
    }
  }

  /** A strike falls from above the target. */
  private bolt(x: number, y: number): void {
    const jag = (n: number) => (Math.random() - 0.5) * n;
    const points = [
      { x: x + jag(40), y: y - 420 },
      { x: x + jag(60), y: y - 280 },
      { x: x + jag(40), y: y - 140 },
      { x, y },
    ];
    for (let i = 1; i < points.length; i++) this.zap(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, BRAND.rebirthGold);
    this.host.fx.flashOrb(x, y, BRAND.rebirthGold, 46, 180);
    this.host.fx.burstSparks(x, y, 0xffffff, 8, 220);
  }

  private zap(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const g = this.host.scene.add.graphics().setDepth(this.host.fxDepth).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(4, color, 0.85);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.5, 0xffffff, 1);
    g.lineBetween(x1, y1, x2, y2);
    this.host.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  private updateCelestial(dt: number): void {
    const cel = this.celestial;
    if (!cel) return;
    const c = ULT.celestial;
    cel.time -= dt;
    cel.timer -= dt;
    if (cel.timer <= 0) {
      cel.timer = c.interval;
      const p = this.host.player();
      const targets = this.host
        .enemies()
        .filter((e) => e.active)
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
        .slice(0, c.bolts);
      for (let i = 0; i < c.bolts; i++) {
        const t = targets[i % Math.max(1, targets.length)];
        const angle = t ? Math.atan2(t.y - p.y, t.x - p.x) : (i / c.bolts) * TAU + cel.time;
        this.host.fireFriendly({
          x: p.x,
          y: p.y,
          angle,
          speed: c.speed,
          damage: c.damage * this.power,
          life: c.life,
          color: i % 2 === 0 ? SIGNAL.magenta : BRAND.rebirthGold,
          pierce: c.pierce,
        });
      }
    }
    if (cel.time <= 0) this.endCelestial();
  }

  private endCelestial(): void {
    if (!this.celestial) return;
    this.celestial = null;
    this.host.player().setCelestial(false);
  }
}
