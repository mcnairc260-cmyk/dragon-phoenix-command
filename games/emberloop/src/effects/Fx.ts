import Phaser from 'phaser';
import { TEX } from './Textures';

/**
 * Shared visual-effects layer: shockwaves, sparks, smoke, screen shake,
 * chromatic flashes and slow motion.
 *
 * Everything routes through here so the "reduced motion" accessibility setting
 * has a single place to soften shake, flashes and time distortion.
 */
export class Fx {
  private readonly scene: Phaser.Scene;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chromaA?: Phaser.GameObjects.Rectangle;
  private chromaB?: Phaser.GameObjects.Rectangle;
  private flashRect?: Phaser.GameObjects.Rectangle;
  private viewW = 390;
  private viewH = 844;

  reducedMotion = false;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;

    this.sparks = scene.add
      .particles(0, 0, TEX.spark, {
        lifespan: { min: 260, max: 620 },
        speed: { min: 60, max: 340 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(depth);

    this.embers = scene.add
      .particles(0, 0, TEX.glowTight, {
        lifespan: { min: 400, max: 1000 },
        speed: { min: 10, max: 90 },
        scale: { start: 0.36, end: 0 },
        alpha: { start: 0.85, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(depth);

    this.smoke = scene.add
      .particles(0, 0, TEX.smoke, {
        lifespan: { min: 700, max: 1500 },
        speed: { min: 8, max: 60 },
        scale: { start: 0.4, end: 1.5 },
        alpha: { start: 0.3, end: 0 },
        rotate: { min: -60, max: 60 },
        emitting: false,
      })
      .setDepth(depth - 1);
  }

  /** Spark burst — the default "something got hit" punctuation. */
  burstSparks(x: number, y: number, color: number, count = 10, speed = 260): void {
    this.sparks.setParticleTint(color);
    this.sparks.speed = { min: speed * 0.25, max: speed } as unknown as Phaser.Types.GameObjects.Particles.EmitterOpOnEmitType;
    this.sparks.explode(this.reducedMotion ? Math.ceil(count * 0.5) : count, x, y);
  }

  burstEmbers(x: number, y: number, color: number, count = 8): void {
    this.embers.setParticleTint(color);
    this.embers.explode(this.reducedMotion ? Math.ceil(count * 0.5) : count, x, y);
  }

  puffSmoke(x: number, y: number, color: number, count = 4): void {
    if (this.reducedMotion) return;
    this.smoke.setParticleTint(color);
    this.smoke.explode(count, x, y);
  }

  /** Expanding ring — impact, burst, explosion, boss stage change. */
  shockwave(x: number, y: number, color: number, radius: number, duration = 420, thickness = 1): void {
    const ring = this.scene.add
      .image(x, y, TEX.ring)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setDepth(this.sparks.depth)
      .setScale(0.05 * thickness);
    this.scene.tweens.add({
      targets: ring,
      scale: (radius / 128) * thickness,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Short-lived expanding disc, used for explosion cores. */
  flashOrb(x: number, y: number, color: number, radius: number, duration = 260): void {
    const orb = this.scene.add
      .image(x, y, TEX.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setDepth(this.sparks.depth)
      .setScale((radius / 64) * 0.5);
    this.scene.tweens.add({
      targets: orb,
      scale: radius / 64,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => orb.destroy(),
    });
  }

  shake(intensity: number, duration = 220): void {
    if (this.reducedMotion) return;
    this.scene.cameras.main.shake(duration, intensity, false);
  }

  /** Keep full-screen effects sized to the current CSS-pixel viewport. */
  setViewport(width: number, height: number): void {
    this.viewW = width;
    this.viewH = height;
  }

  /** Full-screen colour wash. */
  flash(color: number, alpha = 0.25, duration = 180): void {
    if (!this.flashRect) {
      this.flashRect = this.scene.add
        .rectangle(0, 0, 10, 10, 0xffffff, 0)
        .setOrigin(0, 0)
        .setDepth(9000)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    const rect = this.flashRect;
    // Slight over-coverage so camera shake never reveals an unpainted edge.
    rect.setPosition(-this.viewW * 0.1, -this.viewH * 0.1);
    rect.setSize(this.viewW * 1.2, this.viewH * 1.2).setFillStyle(color, this.reducedMotion ? alpha * 0.4 : alpha);
    this.scene.tweens.killTweensOf(rect);
    rect.setAlpha(1);
    this.scene.tweens.add({ targets: rect, alpha: 0, duration, ease: 'Quad.easeOut' });
  }

  /**
   * Cheap chromatic-aberration flash: two additive full-screen tints pushed a
   * few pixels apart, snapping back to zero. Costs two quads, no shader.
   */
  chromaticFlash(strength = 6, duration = 150): void {
    if (this.reducedMotion) return;
    if (!this.chromaA) {
      this.chromaA = this.scene.add
        .rectangle(0, 0, 10, 10, 0xff0040, 0)
        .setOrigin(0, 0)
        .setDepth(8990)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.chromaB = this.scene.add
        .rectangle(0, 0, 10, 10, 0x00b0ff, 0)
        .setOrigin(0, 0)
        .setDepth(8991)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    const baseX = -this.viewW * 0.1;
    const baseY = -this.viewH * 0.1;
    for (const [rect, dir] of [
      [this.chromaA!, -1],
      [this.chromaB!, 1],
    ] as const) {
      rect.setSize(this.viewW * 1.2, this.viewH * 1.2).setPosition(baseX + dir * strength, baseY).setAlpha(0.16);
      this.scene.tweens.killTweensOf(rect);
      this.scene.tweens.add({ targets: rect, alpha: 0, x: baseX, duration, ease: 'Quad.easeOut' });
    }
  }

  /** Slow-motion moment. Returns the timeline back to 1.0 automatically. */
  slowMo(scale: number, duration: number): void {
    const target = this.reducedMotion ? Math.max(scale, 0.7) : scale;
    this.scene.time.timeScale = target;
    this.scene.tweens.timeScale = target;
    if (this.scene.physics?.world) this.scene.physics.world.timeScale = 1 / target;
    // Restore on a real-time delay so the slow-mo does not slow its own recovery.
    window.setTimeout(() => {
      this.scene.time.timeScale = 1;
      this.scene.tweens.timeScale = 1;
      if (this.scene.physics?.world) this.scene.physics.world.timeScale = 1;
    }, duration * 1000);
  }

  /** Rising score/label popup. */
  floatText(x: number, y: number, text: string, color: string, size = 18): void {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Rajdhani, "Trebuchet MS", sans-serif',
        fontSize: `${size}px`,
        color,
        stroke: '#0a0406',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(8000);
    this.scene.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      scale: 1.15,
      duration: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  destroy(): void {
    this.sparks.destroy();
    this.embers.destroy();
    this.smoke.destroy();
    this.chromaA?.destroy();
    this.chromaB?.destroy();
    this.flashRect?.destroy();
  }
}
