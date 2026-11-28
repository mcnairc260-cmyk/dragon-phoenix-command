import Phaser from 'phaser';
import { PICKUP } from '../config/GameConfig';
import { TEX } from '../effects/Textures';
import { BRAND } from '../config/brand';

/**
 * A collectable ember shard: score, currency and XP in one glowing crystal.
 *
 * Founder feedback 2026-11-22: on the orange Volcanic board the gold shards
 * blended with enemies and their fireballs. Shards are now Signal Cyan crystals
 * (the same blue as the XP bar they fill), upright and bobbing with a twinkle —
 * never spinning like a blade, never dark-ringed like an enemy bullet.
 */
export class Pickup {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  radius = PICKUP.emberRadius;

  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly twinkle: Phaser.GameObjects.Image;
  private spin = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.glow = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.shard).setDepth(depth + 1).setVisible(false);
    this.twinkle = scene.add.image(0, 0, TEX.spark).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2).setVisible(false);
  }

  spawn(x: number, y: number, scatter = 0): void {
    this.active = true;
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * scatter;
    this.vy = Math.sin(angle) * scatter;
    this.life = PICKUP.lifetime;
    this.spin = Math.random() * Math.PI * 2;
    this.glow.setVisible(true).setTint(BRAND.signalCyan).setScale(0.9).setAlpha(0.85);
    this.body.setVisible(true).setTint(BRAND.signalCyan, BRAND.signalCyan, BRAND.ghostWhite, BRAND.ghostWhite).setScale(1).setRotation(0);
    this.twinkle.setVisible(true).setTint(BRAND.ghostWhite).setAlpha(0);
  }

  deactivate(): void {
    this.active = false;
    this.glow.setVisible(false);
    this.body.setVisible(false);
    this.twinkle.setVisible(false);
  }

  /** Returns false once the shard has expired. */
  update(dt: number, playerX: number, playerY: number, magnetRadius: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < magnetRadius) {
      // Acceleration rises as the shard closes in, so collection feels snappy.
      const pull = PICKUP.magnetSpeed * (1 - dist / magnetRadius) * 1.6;
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    } else {
      this.vx *= Math.pow(0.02, dt);
      this.vy *= Math.pow(0.02, dt);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 2.4;

    const flicker = 0.75 + 0.25 * Math.sin(this.spin * 3);
    // Fade out over the final second so vanishing never feels like a bug.
    const fade = this.life < 1 ? this.life : 1;
    // Upright crystal that bobs and tilts a little: loot, not a spinning weapon.
    const bob = Math.sin(this.spin * 1.6) * 2;
    this.glow.setPosition(this.x, this.y + bob).setScale(0.85 + flicker * 0.25).setAlpha(0.85 * flicker * fade);
    this.body.setPosition(this.x, this.y + bob).setRotation(Math.sin(this.spin) * 0.18).setAlpha(fade);
    // A brief star-glint every couple of seconds.
    const glint = Math.max(0, Math.sin(this.spin * 1.3 + this.x * 0.05)) ** 12;
    this.twinkle.setPosition(this.x + 4, this.y + bob - 5).setScale(0.3 + glint * 0.5).setAlpha(glint * fade);
    return true;
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
    this.twinkle.destroy();
  }
}
