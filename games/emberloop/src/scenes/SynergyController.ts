import Phaser from 'phaser';
import { BRAND, SIGNAL } from '../config/brand';
import { TAU } from '../core/math';
import { PLAYER } from '../config/GameConfig';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Fx } from '../effects/Fx';
import type { PlayerStats, UpgradeLevels } from '../upgrades/UpgradeDefs';
import { SYN, hasSynergy, type SynergyId } from '../upgrades/Synergies';

export type ShotTag = '' | 'ice' | 'echo' | 'star';

export interface SynergyHost {
  scene: Phaser.Scene;
  fxDepth: number;
  fx: Fx;
  player: () => Player;
  stats: () => PlayerStats;
  build: () => UpgradeLevels;
  enemies: () => readonly Enemy[];
  boss: () => { x: number; y: number; radius: number } | null;
  /** Normal damage path (Ember bonus applies). canCrit=false never triggers Shadow Execution. */
  damageEnemy: (enemy: Enemy, amount: number, canCrit: boolean) => void;
  /** Direct damage that triggers nothing else (used inside a crit to avoid recursion). */
  damageEnemyRaw: (enemy: Enemy, amount: number) => void;
  damageBoss: (amount: number) => void;
  healPlayer: (hearts: number) => void;
  fireShot: (o: { angle: number; speed: number; damage: number; life: number; color: number; pierce: number; homing: boolean; tag: ShotTag; radius: number }) => void;
  /** Re-fire a graze shot (Temporal Echo). */
  echoGrazeShot: (target: Enemy | null, damageScale: number) => void;
  announce: (text: string, color: number) => void;
}

/**
 * Runs the shard synergies that are behaviours rather than stat changes
 * (Firestorm's blades and Molten Armor's armour are folded in computeStats).
 *
 * Safety rules (brief §15): every triggered effect has its own cooldown or
 * fixed interval; synergy damage goes through paths that cannot re-trigger
 * the synergy that caused it (Shadow Execution uses raw damage; echoes never
 * echo; Molten Armor only answers the player being hit); heals cap at max hearts.
 */
export class SynergyController {
  private barrageTimer = 0;
  private tempestTimer = 0;
  private starTimer = 0;
  private firestormCd = 0;
  private shadowCd = 0;
  private moltenCd = 0;
  private echoCd = 0;
  private harvestCd = 0;
  private harvestCount = 0;
  private judgmentCd = 0;
  private judgmentCharges = 0;
  private renewTimer = 0;
  private echoes: { t: number; target: Enemy | null }[] = [];

  constructor(private readonly host: SynergyHost) {}

  private on(id: SynergyId): boolean {
    return hasSynergy(this.host.build(), id);
  }

  private cd(seconds: number): number {
    return seconds * this.host.stats().cooldownMul;
  }

  private range(px: number): number {
    return px * this.host.stats().rangeMul;
  }

  update(dt: number): void {
    for (const key of ['firestormCd', 'shadowCd', 'moltenCd', 'echoCd', 'harvestCd', 'judgmentCd'] as const) {
      if (this[key] > 0) this[key] = Math.max(0, this[key] - dt);
    }

    if (this.on('frozen-barrage')) {
      this.barrageTimer -= dt;
      if (this.barrageTimer <= 0) {
        this.barrageTimer = this.cd(SYN.frozenBarrage.every);
        this.frozenBarrage();
      }
    }
    if (this.on('thunder-tempest')) {
      this.tempestTimer -= dt;
      if (this.tempestTimer <= 0) {
        this.tempestTimer = this.cd(SYN.thunderTempest.every);
        this.thunderTempest();
      }
    }
    if (this.on('celestial-barrage')) {
      this.starTimer -= dt;
      if (this.starTimer <= 0) {
        this.starTimer = this.cd(SYN.celestialBarrage.every);
        this.celestialBarrage();
      }
    }
    if (this.on('phoenix-renewal')) {
      const p = this.host.player();
      if (p.shieldActive) {
        this.renewTimer += dt;
        if (this.renewTimer >= SYN.phoenixRenewal.bloomAfter) {
          this.renewTimer = 0;
          this.bloom(p.x, p.y, SIGNAL.toxic, 'RENEWAL');
          this.host.healPlayer(1);
        }
      } else {
        this.renewTimer = 0;
      }
    }

    if (this.echoes.length > 0) {
      for (const echo of this.echoes) echo.t -= dt;
      const due = this.echoes.filter((e) => e.t <= 0);
      this.echoes = this.echoes.filter((e) => e.t > 0);
      for (const echo of due) {
        const target = echo.target && echo.target.active ? echo.target : null;
        this.host.echoGrazeShot(target, SYN.temporalEcho.damage);
      }
    }
  }

  // ── Event hooks (called by GameScene) ─────────────────────────────────────
  /** Firestorm: a blade hit chains lightning, on a cooldown. */
  onBladeHit(enemy: Enemy): void {
    if (!this.on('firestorm') || this.firestormCd > 0) return;
    this.firestormCd = this.cd(SYN.firestorm.chainEvery);
    const c = SYN.firestorm;
    this.chain(enemy, c.chainTargets, c.chainDamage, 1, c.chainRange, BRAND.rebirthGold);
  }

  /** Shadow Execution: a crit detonates a void explosion. Uses raw damage, so it cannot crit again. */
  onCrit(enemy: Enemy): void {
    if (!this.on('shadow-execution') || this.shadowCd > 0) return;
    this.shadowCd = this.cd(SYN.shadowExecution.cooldown);
    const c = SYN.shadowExecution;
    const radius = this.range(c.radius);
    const damage = c.damage * this.host.stats().damageMul;
    this.host.fx.flashOrb(enemy.x, enemy.y, SIGNAL.violet, radius, 280);
    this.host.fx.shockwave(enemy.x, enemy.y, 0x2a0b4a, radius * 2, 360, 1.2);
    for (const other of [...this.host.enemies()]) {
      if (other.active && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= radius + other.radius) this.host.damageEnemyRaw(other, damage);
    }
    const boss = this.host.boss();
    if (boss && Math.hypot(boss.x - enemy.x, boss.y - enemy.y) <= radius + boss.radius) this.host.damageBoss(c.damage);
  }

  /** The phoenix was hit (or a hit was blocked). */
  onPlayerHit(result: 'shielded' | 'armored' | 'hit' | 'revived' | 'dead'): void {
    const p = this.host.player();
    if (result === 'shielded') this.renewTimer = 0;

    // Molten Armor: scorch everything around you, once a second.
    if (this.on('molten-armor') && this.moltenCd <= 0 && result !== 'dead') {
      this.moltenCd = SYN.moltenArmor.cooldown;
      const radius = this.range(SYN.moltenArmor.radius);
      this.host.fx.shockwave(p.x, p.y, BRAND.emberOrange, radius * 2, 380, 1.2);
      this.host.fx.burstEmbers(p.x, p.y, BRAND.emberOrange, 10);
      for (const e of [...this.host.enemies()]) {
        if (e.active && Math.hypot(e.x - p.x, e.y - p.y) <= radius + e.radius) this.host.damageEnemy(e, SYN.moltenArmor.damage, false);
      }
    }

    // Titan's Judgment: hits taken or shrugged off build charges.
    if (this.on('titans-judgment') && result !== 'dead') {
      this.judgmentCharges += 1;
      if (this.judgmentCharges >= SYN.titansJudgment.charges && this.judgmentCd <= 0) {
        this.judgmentCharges = 0;
        this.judgmentCd = this.cd(SYN.titansJudgment.cooldown);
        const radius = this.range(SYN.titansJudgment.radius);
        this.bloom(p.x, p.y, BRAND.rebirthGold, 'JUDGMENT');
        this.host.fx.shockwave(p.x, p.y, BRAND.rebirthGold, radius * 2, 560, 1.6);
        this.host.fx.shake(0.012, 280);
        for (const e of [...this.host.enemies()]) {
          if (e.active && Math.hypot(e.x - p.x, e.y - p.y) <= radius + e.radius) this.host.damageEnemy(e, SYN.titansJudgment.damage, false);
        }
        const boss = this.host.boss();
        if (boss && Math.hypot(boss.x - p.x, boss.y - p.y) <= radius + boss.radius) this.host.damageBoss(SYN.titansJudgment.damage);
      }
    }
  }

  /** Temporal Echo: a graze shot repeats a moment later. Echo shots never call this. */
  onGrazeShot(target: Enemy | null): void {
    if (!this.on('temporal-echo') || this.echoCd > 0 || this.echoes.length >= 6) return;
    this.echoCd = SYN.temporalEcho.cooldown;
    this.echoes.push({ t: SYN.temporalEcho.delay, target });
  }

  /** Celestial Harvest: collecting embers occasionally heals. Never grants XP. */
  onPickup(): void {
    if (!this.on('celestial-harvest')) return;
    this.harvestCount += 1;
    if (this.harvestCount < SYN.celestialHarvest.every) return;
    this.harvestCount = 0;
    const p = this.host.player();
    if (this.harvestCd > 0 || p.health >= PLAYER.maxHealth) return;
    this.harvestCd = SYN.celestialHarvest.cooldown;
    this.bloom(p.x, p.y, SIGNAL.toxic, 'HARVEST');
    this.host.healPlayer(1);
  }

  /** Frozen Barrage shard landed. */
  onIceHit(enemy: Enemy): void {
    const c = SYN.frozenBarrage;
    enemy.chillTimer = c.chillTime;
    enemy.chillHits += 1;
    if (enemy.chillHits >= c.hitsToFreeze && enemy.active) {
      enemy.chillHits = 0;
      enemy.freeze(c.freeze);
    }
  }

  // ── Periodic effects ──────────────────────────────────────────────────────
  private nearest(count: number, maxRange = Infinity): Enemy[] {
    const p = this.host.player();
    return this.host
      .enemies()
      .filter((e) => e.active && Math.hypot(e.x - p.x, e.y - p.y) <= maxRange)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
      .slice(0, count);
  }

  private frozenBarrage(): void {
    const c = SYN.frozenBarrage;
    const [target] = this.nearest(1, 420);
    if (!target) return;
    const p = this.host.player();
    const base = Math.atan2(target.y - p.y, target.x - p.x);
    for (let i = 0; i < c.shards; i++) {
      const offset = (i - (c.shards - 1) / 2) * c.spread;
      this.host.fireShot({ angle: base + offset, speed: c.speed, damage: c.damage, life: 1.1, color: BRAND.signalCyan, pierce: 0, homing: false, tag: 'ice', radius: 5 });
    }
  }

  private thunderTempest(): void {
    const c = SYN.thunderTempest;
    const [target] = this.nearest(1, this.range(c.range));
    if (!target) return;
    const p = this.host.player();
    this.zap(p.x, p.y, target.x, target.y, BRAND.rebirthGold);
    this.host.damageEnemy(target, c.damage, false);
    this.chain(target, c.jumps, c.damage * c.falloff, c.falloff, c.jumpRange, BRAND.rebirthGold);
  }

  private celestialBarrage(): void {
    const c = SYN.celestialBarrage;
    const targets = this.nearest(c.bolts, 520);
    for (let i = 0; i < c.bolts; i++) {
      const t = targets[i % Math.max(1, targets.length)];
      const p = this.host.player();
      const angle = t ? Math.atan2(t.y - p.y, t.x - p.x) : (i / c.bolts) * TAU;
      this.host.fireShot({ angle, speed: c.speed, damage: c.damage, life: 1.6, color: SIGNAL.magenta, pierce: c.pierce, homing: true, tag: 'star', radius: 6 });
    }
  }

  /** Limited chain: `jumps` hops, each `falloff` × the previous damage. */
  private chain(from: Enemy, jumps: number, damage: number, falloff: number, range: number, color: number): void {
    const hit = new Set<Enemy>([from]);
    let source = from;
    let d = damage;
    for (let i = 0; i < jumps; i++) {
      let next: Enemy | null = null;
      let best = range;
      for (const e of this.host.enemies()) {
        if (!e.active || hit.has(e)) continue;
        const dist = Math.hypot(e.x - source.x, e.y - source.y);
        if (dist < best) {
          best = dist;
          next = e;
        }
      }
      if (!next) break;
      hit.add(next);
      this.zap(source.x, source.y, next.x, next.y, color);
      this.host.damageEnemy(next, d, false);
      d *= falloff;
      source = next;
    }
  }

  private zap(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const g = this.host.scene.add.graphics().setDepth(this.host.fxDepth).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(3, color, 0.85);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1, 0xffffff, 1);
    g.lineBetween(x1, y1, x2, y2);
    this.host.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private bloom(x: number, y: number, color: number, label: string): void {
    this.host.fx.shockwave(x, y, color, 220, 520, 1.2);
    this.host.announce(label, color);
  }
}
