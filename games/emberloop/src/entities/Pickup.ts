import Phaser from 'phaser';
import { PICKUP } from '../config/GameConfig';
import { TEX } from '../effects/Textures';

/** A collectable ember shard: score, currency and XP in one glowing diamond. */
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
  private spin = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.glow = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.body = scene.add.image(0, 0, TEX.shard).setDepth(depth + 1).setVisible(false);
  }

  spawn(x: number, y: number, color: number, accent: number, scatter = 0): void {
    this.active = true;
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * scatter;
    this.vy = Math.sin(angle) * scatter;
    this.life = PICKUP.lifetime;
    this.spin = Math.random() * Math.PI * 2;
    this.glow.setVisible(true).setTint(color).setScale(0.85).setAlpha(0.85);
    this.body.setVisible(true).setTint(accent).setScale(0.9);
  }

  deactivate(): void {
    this.active = false;
    this.glow.setVisible(false);
    this.body.setVisible(false);
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
    this.glow.setPosition(this.x, this.y).setScale(0.8 + flicker * 0.25).setAlpha(0.85 * flicker * fade);
    this.body.setPosition(this.x, this.y).setRotation(this.spin).setAlpha(fade);
    return true;
  }

  destroy(): void {
    this.glow.destroy();
    this.body.destroy();
  }
}
