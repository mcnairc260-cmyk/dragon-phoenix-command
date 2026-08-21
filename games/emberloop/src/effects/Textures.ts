import Phaser from 'phaser';

/**
 * All artwork is generated at boot — no image files ship with the game.
 *
 * Textures are drawn in white/greyscale and tinted at runtime, so a single
 * texture serves the player, enemies, pickups and every palette variant.
 */

export const TEX = {
  glow: 'tex-glow',
  glowTight: 'tex-glow-tight',
  spark: 'tex-spark',
  smoke: 'tex-smoke',
  ring: 'tex-ring',
  phoenix: 'tex-phoenix',
  phoenixAscended: 'tex-phoenix-ascended',
  shard: 'tex-shard',
  bullet: 'tex-bullet',
  blade: 'tex-blade',
  cinder: 'tex-cinder',
  dart: 'tex-dart',
  spitter: 'tex-spitter',
  orbiter: 'tex-orbiter',
  splitter: 'tex-splitter',
  mine: 'tex-mine',
  boss: 'tex-boss',
  crown: 'tex-crown',
  arrow: 'tex-arrow',
} as const;

/** Radial gradient sprite — the workhorse behind every bloom/glow in the game. */
function makeRadialGlow(
  scene: Phaser.Scene,
  key: string,
  size: number,
  stops: [number, string][],
): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

/** Soft ring used for shockwaves and impact rings. */
function makeRing(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const half = size / 2;
  // Peak brightness sits at 82% of the radius, feathering both inward and out.
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.9, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

type Poly = [number, number][];

function drawPolys(g: Phaser.GameObjects.Graphics, polys: { points: Poly; color: number; alpha?: number }[]): void {
  for (const poly of polys) {
    g.fillStyle(poly.color, poly.alpha ?? 1);
    g.beginPath();
    g.moveTo(poly.points[0][0], poly.points[0][1]);
    for (let i = 1; i < poly.points.length; i++) g.lineTo(poly.points[i][0], poly.points[i][1]);
    g.closePath();
    g.fillPath();
  }
}

function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

/** A point on a quadratic Bezier. */
function quad(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * A tapering ribbon swept along a quadratic curve, fading from `w0` wide at the
 * root to `w1` at the tip. This is the building block of the phoenix: the Brand
 * Bible calls for the Phoenix rendered as "elemental energy (fire, light,
 * smoke) rather than cartoon creatures", and a bundle of tapered flame strokes
 * reads as fire from any angle, where a hard-edged bird silhouette does not.
 */
function flameStroke(
  g: Phaser.GameObjects.Graphics,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  w0: number,
  w1: number,
  alpha: number,
): void {
  const STEPS = 14;
  const left: Poly = [];
  const right: Poly = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = quad(p0[0], p1[0], p2[0], t);
    const y = quad(p0[1], p1[1], p2[1], t);
    // Derivative of the quadratic gives the tangent; rotate it for the normal.
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Width eases out so the tip comes to a point rather than a stub.
    const w = (w0 + (w1 - w0) * t * t) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  right.reverse();
  drawPolys(g, [{ points: [...left, ...right], color: 0xffffff, alpha }]);
}

/**
 * The phoenix: a forward-pointing bloom of fire, drawn in white so it can be
 * tinted per palette. Abstract and mythic per the Brand Bible, not a creature.
 * Ascended adds reach and a fourth pair of strokes rather than changing shape,
 * so the player never has to re-learn the silhouette mid-run.
 */
function drawPhoenix(g: Phaser.GameObjects.Graphics, size: number, ascended: boolean): void {
  const c = size / 2;
  const s = size / 64; // shapes are authored on a 64px grid
  const reach = ascended ? 1.16 : 1;
  const P = (x: number, y: number): [number, number] => [c + x * s * reach, c + y * s * reach];

  // Swept wing flames, upper then lower, curving back from just behind the nose.
  for (const dir of [-1, 1]) {
    flameStroke(g, P(9, 2 * dir), P(0, 17 * dir), P(-19, 19 * dir), 9 * s, 0, 0.5);
    flameStroke(g, P(11, 1.5 * dir), P(2, 11 * dir), P(-13, 13 * dir), 7 * s, 0, 0.78);
    if (ascended) flameStroke(g, P(6, 3 * dir), P(-6, 22 * dir), P(-24, 21 * dir), 5 * s, 0, 0.34);
  }

  // Tail tongues trailing straight back, the middle one longest and hottest.
  flameStroke(g, P(-2, -3), P(-14, -6), P(-27, -4), 6 * s, 0, 0.42);
  flameStroke(g, P(-2, 3), P(-14, 6), P(-27, 4), 6 * s, 0, 0.42);
  flameStroke(g, P(0, 0), P(-16, 0), P(-31, 0), 8 * s, 0, 0.7);

  // The body: a bright lance from the nose sweeping back into the tail.
  flameStroke(g, P(25, 0), P(6, 0), P(-14, 0), 3 * s, 11 * s, 0.95);

  // Hot core just behind the nose — the single strong light source the Brand
  // Bible's imagery direction asks for.
  g.fillStyle(0xffffff, 1);
  g.fillCircle(c + 9 * s * reach, c, 5 * s * reach);
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(c + 9 * s * reach, c, 8.5 * s * reach);
}

export function generateTextures(scene: Phaser.Scene): void {
  makeRadialGlow(scene, TEX.glow, 128, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.55)'],
    [0.55, 'rgba(255,255,255,0.18)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  makeRadialGlow(scene, TEX.glowTight, 64, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.75)'],
    [0.7, 'rgba(255,255,255,0.12)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  makeRadialGlow(scene, TEX.spark, 24, [
    [0, 'rgba(255,255,255,1)'],
    [0.45, 'rgba(255,255,255,0.6)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  makeRadialGlow(scene, TEX.smoke, 96, [
    [0, 'rgba(255,255,255,0.42)'],
    [0.5, 'rgba(255,255,255,0.16)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  makeRing(scene, TEX.ring, 256);

  bake(scene, TEX.phoenix, 64, 64, (g) => drawPhoenix(g, 64, false));
  bake(scene, TEX.phoenixAscended, 72, 72, (g) => drawPhoenix(g, 72, true));

  // Ember shard — a faceted diamond.
  bake(scene, TEX.shard, 24, 24, (g) => {
    drawPolys(g, [
      { points: [[12, 0], [22, 12], [12, 24], [2, 12]], color: 0xffffff },
      { points: [[12, 2], [12, 22], [4, 12]], color: 0xffffff, alpha: 0.55 },
    ]);
  });

  // Enemy projectile — a teardrop pointing right.
  bake(scene, TEX.bullet, 20, 20, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 10, 5);
    drawPolys(g, [{ points: [[18, 10], [6, 6], [6, 14]], color: 0xffffff, alpha: 0.85 }]);
  });

  // Orbiting blade — a curved crescent.
  bake(scene, TEX.blade, 40, 20, (g) => {
    drawPolys(g, [
      { points: [[0, 10], [22, 2], [40, 10], [22, 18]], color: 0xffffff },
      { points: [[10, 10], [24, 6], [34, 10], [24, 14]], color: 0xffffff, alpha: 0.6 },
    ]);
  });

  // Cinder — a lumpy blob (slow, dumb, relentless).
  bake(scene, TEX.cinder, 36, 36, (g) => {
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    const pts = 9;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 13 + (i % 2 === 0 ? 3.5 : -2);
      const x = 18 + Math.cos(a) * r;
      const y = 18 + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(18, 18, 5);
  });

  // Dart — an aggressive arrowhead pointing right.
  bake(scene, TEX.dart, 36, 30, (g) => {
    drawPolys(g, [
      { points: [[36, 15], [6, 1], [13, 15], [6, 29]], color: 0xffffff },
      { points: [[24, 15], [11, 8], [14, 15], [11, 22]], color: 0xffffff, alpha: 0.5 },
    ]);
  });

  // Spitter — a hexagonal turret with a muzzle.
  bake(scene, TEX.spitter, 40, 40, (g) => {
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = 20 + Math.cos(a) * 16;
      const y = 20 + Math.sin(a) * 16;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(20, 20, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(20, 20, 3.5);
  });

  // Orbiter — a broken ring with a bright nucleus.
  bake(scene, TEX.orbiter, 40, 40, (g) => {
    g.lineStyle(5, 0xffffff, 1);
    g.beginPath();
    g.arc(20, 20, 15, Math.PI * 0.15, Math.PI * 1.6);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(20, 20, 6);
  });

  // Splitter — a segmented cell, visibly ready to divide.
  bake(scene, TEX.splitter, 52, 52, (g) => {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(26, 26, 22);
    g.fillStyle(0x000000, 0.4);
    g.fillRect(24.5, 4, 3, 44);
    g.fillRect(4, 24.5, 44, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(26, 26, 6);
  });

  // Magma mine — a spiked stationary hazard.
  bake(scene, TEX.mine, 44, 44, (g) => {
    g.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      drawPolys(g, [
        {
          points: [
            [22 + Math.cos(a) * 21, 22 + Math.sin(a) * 21],
            [22 + Math.cos(a + 0.35) * 11, 22 + Math.sin(a + 0.35) * 11],
            [22 + Math.cos(a - 0.35) * 11, 22 + Math.sin(a - 0.35) * 11],
          ],
          color: 0xffffff,
          alpha: 0.85,
        },
      ]);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(22, 22, 11);
    g.fillStyle(0x000000, 0.5);
    g.fillCircle(22, 22, 5);
  });

  // Boss — a jagged crown/eye silhouette.
  bake(scene, TEX.boss, 140, 140, (g) => {
    const c = 70;
    g.fillStyle(0xffffff, 0.95);
    g.beginPath();
    const spikes = 11;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 62 : 40;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0x000000, 0.55);
    g.fillCircle(c, c, 30);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 15);
  });

  // Elite crown marker.
  bake(scene, TEX.crown, 40, 24, (g) => {
    drawPolys(g, [{ points: [[2, 22], [8, 4], [14, 14], [20, 0], [26, 14], [32, 4], [38, 22]], color: 0xffffff }]);
  });

  // Off-screen danger arrow.
  bake(scene, TEX.arrow, 26, 22, (g) => {
    drawPolys(g, [{ points: [[26, 11], [2, 1], [8, 11], [2, 21]], color: 0xffffff }]);
  });
}
