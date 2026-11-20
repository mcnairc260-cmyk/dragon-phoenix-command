import Phaser from 'phaser';
import { ARENA, HAZARD } from '../config/GameConfig';
import { BRAND } from '../config/brand';
import { TAU } from '../core/math';
import { TEX } from './Textures';
import boardUrl from '../assets/board.jpg';

export interface ArenaPoint {
  x: number;
  y: number;
}

export type SectorState = 'telegraph' | 'active' | 'fading';

export interface CollapsingSector {
  /** Centre angle in radians. */
  angle: number;
  halfWidth: number;
  state: SectorState;
  timer: number;
}

export const BOARD_TEX = 'arena-board';

export function loadArenaTextures(scene: Phaser.Scene): void {
  scene.load.image(BOARD_TEX, boardUrl);
}

/**
 * Founder-supplied board art (art/board-source.png, 941 x 1672), measured in
 * source pixels. The board is stretched to any phone height without distorting
 * it: the top scenery, the emblem band and the bottom scenery are drawn as is,
 * and plain tile rows are repeated between them.
 */
const BOARD = {
  width: 941,
  top: { y: 0, h: 336 },
  row: { y: 419, h: 84 }, // one clean tile row, line to line
  centre: { y: 588, h: 419 }, // the phoenix emblem and the side diamonds
  bottom: { y: 1343, h: 329 },
  // Inner edge of the glowing frame = the gameplay wall.
  inner: { left: 23, right: 917, top: 163, bottomInBottomSlice: 1533 - 1343 },
  minRows: 2,
} as const;

/** Superellipse exponent: 2 is an ellipse, higher is a rounded rectangle like the board frame. */
const WALL_POWER = 8;
/**
 * Darkening over the board so enemies, shots and HUD text stay readable (and
 * the screen stays dark-first): an even dim, plus deeper scrims at the top and
 * bottom where the HUD and menus sit.
 */
const BOARD_DIM = 0.38;
const EDGE_SCRIM = 0.62;
/** Keep the phoenix's centre this far inside the frame line (CSS px). */
const WALL_INSET = 10;

/** Superellipse length of a direction: 1 for unit vectors on the wall shape. */
function shapeLength(dx: number, dy: number): number {
  return Math.pow(Math.pow(Math.abs(dx), WALL_POWER) + Math.pow(Math.abs(dy), WALL_POWER), 1 / WALL_POWER);
}

/**
 * The arena: the founder's board, with a rounded-rectangle wall on its frame.
 *
 * Gameplay maths uses a normalised radius (`norm()` is 1.0 exactly on the wall),
 * so spawns, wedges and orbits do not care about the shape or screen size.
 */
export class Arena {
  cx = 0;
  cy = 0;
  rx = 100;
  ry = 100;

  private readonly scene: Phaser.Scene;
  private readonly baseDepth: number;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly boardParts: Phaser.GameObjects.Image[] = [];
  private readonly scrim: Phaser.GameObjects.Graphics;
  private readonly hazardLayer: Phaser.GameObjects.Graphics;
  private readonly haze: Phaser.GameObjects.Image[] = [];
  private time = 0;

  readonly sectors: CollapsingSector[] = [];
  reducedMotion = false;

  constructor(scene: Phaser.Scene, baseDepth: number) {
    this.scene = scene;
    this.baseDepth = baseDepth;
    this.bg = scene.add.graphics().setDepth(baseDepth);
    this.scrim = scene.add.graphics().setDepth(baseDepth + 1);
    this.hazardLayer = scene.add.graphics().setDepth(baseDepth + 2).setBlendMode(Phaser.BlendModes.ADD);
    this.defineBoardFrames();

    // Three slow-drifting additive blobs stand in for real heat distortion at a
    // fraction of the cost of a shader.
    for (let i = 0; i < 3; i++) {
      const img = scene.add
        .image(0, 0, TEX.smoke)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(BRAND.emberOrange)
        .setAlpha(0.07)
        .setDepth(baseDepth + 2);
      this.haze.push(img);
    }
  }

  private defineBoardFrames(): void {
    const tex = this.scene.textures.get(BOARD_TEX);
    if (tex.has('top')) return;
    for (const name of ['top', 'row', 'centre', 'bottom'] as const) {
      const part = BOARD[name];
      tex.add(name, 0, 0, part.y, BOARD.width, part.h);
    }
  }

  /** Recompute geometry for the current viewport. */
  layout(width: number, height: number): void {
    const fixed = BOARD.top.h + BOARD.centre.h + BOARD.bottom.h;
    // Fit the board's width to the screen; if the screen is too short for the
    // minimum rows, shrink it instead and centre it.
    let scale = width / BOARD.width;
    let rows = Math.round((height - fixed * scale) / (BOARD.row.h * scale));
    if (rows < BOARD.minRows) {
      rows = BOARD.minRows;
      scale = height / (fixed + rows * BOARD.row.h);
    }
    const boardW = BOARD.width * scale;
    const left = (width - boardW) / 2;
    // Rows absorb any leftover height (a few percent at most).
    const rowH = (height - fixed * scale) / rows;
    const above = Math.floor(rows / 2);

    for (const part of this.boardParts) part.destroy();
    this.boardParts.length = 0;
    let y = 0;
    const place = (frame: string, h: number) => {
      const img = this.scene.add
        .image(left, y, BOARD_TEX, frame)
        .setOrigin(0, 0)
        .setDisplaySize(boardW, h)
        .setDepth(this.baseDepth + 0.5);
      this.boardParts.push(img);
      y += h;
    };
    place('top', BOARD.top.h * scale);
    for (let i = 0; i < above; i++) place('row', rowH);
    place('centre', BOARD.centre.h * scale);
    for (let i = above; i < rows; i++) place('row', rowH);
    const bottomY = y;
    place('bottom', BOARD.bottom.h * scale);

    const wallLeft = left + BOARD.inner.left * scale + WALL_INSET;
    const wallRight = left + BOARD.inner.right * scale - WALL_INSET;
    const wallTop = BOARD.inner.top * scale + WALL_INSET;
    const wallBottom = bottomY + BOARD.inner.bottomInBottomSlice * scale - WALL_INSET;
    this.cx = (wallLeft + wallRight) / 2;
    this.cy = (wallTop + wallBottom) / 2;
    this.rx = (wallRight - wallLeft) / 2;
    this.ry = (wallBottom - wallTop) / 2;

    this.bg.clear();
    this.bg.fillStyle(BRAND.voidBlack, 1);
    this.bg.fillRect(0, 0, width, height);

    const s = this.scrim;
    const k = BRAND.voidBlack;
    s.clear();
    s.fillStyle(k, BOARD_DIM);
    s.fillRect(0, 0, width, height);
    const topBand = wallTop + 70;
    s.fillGradientStyle(k, k, k, k, EDGE_SCRIM, EDGE_SCRIM, 0, 0);
    s.fillRect(0, 0, width, topBand);
    const bottomBand = height - (wallBottom - 50);
    s.fillGradientStyle(k, k, k, k, 0, 0, EDGE_SCRIM, EDGE_SCRIM);
    s.fillRect(0, height - bottomBand, width, bottomBand);
  }

  /** Normalised radius: 1.0 sits exactly on the arena wall. */
  norm(x: number, y: number): number {
    return shapeLength((x - this.cx) / this.rx, (y - this.cy) / this.ry);
  }

  /** Outward unit normal of the wall at the point's direction (for bounces). */
  wallNormal(x: number, y: number): ArenaPoint {
    const dx = (x - this.cx) / this.rx;
    const dy = (y - this.cy) / this.ry;
    const gx = (Math.sign(dx) * Math.pow(Math.abs(dx), WALL_POWER - 1)) / this.rx;
    const gy = (Math.sign(dy) * Math.pow(Math.abs(dy), WALL_POWER - 1)) / this.ry;
    const len = Math.hypot(gx, gy) || 1;
    return { x: gx / len, y: gy / len };
  }

  /** Distance to the wall along a normalised-space angle, as a unit-circle multiplier. */
  private edge(angle: number): number {
    return 1 / shapeLength(Math.cos(angle), Math.sin(angle));
  }

  angleOf(x: number, y: number): number {
    // Angle is measured in normalised space so wedges look symmetric on screen.
    return Math.atan2((y - this.cy) / this.ry, (x - this.cx) / this.rx);
  }

  /** Convert (angle, normalised radius) into screen coordinates. */
  pointAt(angle: number, radius: number): ArenaPoint {
    const r = radius * this.edge(angle);
    return {
      x: this.cx + Math.cos(angle) * this.rx * r,
      y: this.cy + Math.sin(angle) * this.ry * r,
    };
  }

  /** Push a point back inside the wall. Returns true when it was outside. */
  clamp(point: ArenaPoint, maxNorm = 1): boolean {
    const n = this.norm(point.x, point.y);
    if (n <= maxNorm || n === 0) return false;
    const scale = maxNorm / n;
    point.x = this.cx + (point.x - this.cx) * scale;
    point.y = this.cy + (point.y - this.cy) * scale;
    return true;
  }

  randomEdgePoint(rng: () => number = Math.random): ArenaPoint & { angle: number } {
    const angle = rng() * TAU;
    const p = this.pointAt(angle, ARENA.spawnRadius);
    return { ...p, angle };
  }

  randomInsidePoint(rng: () => number = Math.random, maxNorm = 0.85): ArenaPoint {
    const angle = rng() * TAU;
    // sqrt keeps the distribution uniform by area rather than clustered at the centre.
    const radius = Math.sqrt(rng()) * maxNorm;
    return this.pointAt(angle, radius);
  }

  // ── Collapsing sectors ────────────────────────────────────────────────────
  spawnSector(rng: () => number = Math.random): void {
    this.sectors.push({
      angle: rng() * TAU,
      halfWidth: Phaser.Math.DegToRad(HAZARD.sectorWidth) / 2,
      state: 'telegraph',
      timer: HAZARD.telegraphTime,
    });
  }

  /** True when the point sits inside an *active* (damaging) collapsed sector. */
  sectorDamageAt(x: number, y: number): boolean {
    const n = this.norm(x, y);
    if (n < HAZARD.innerRadius || n > 1.02) return false;
    const a = this.angleOf(x, y);
    for (const sector of this.sectors) {
      if (sector.state !== 'active') continue;
      const delta = Math.abs(Phaser.Math.Angle.Wrap(a - sector.angle));
      if (delta <= sector.halfWidth) return true;
    }
    return false;
  }

  update(dt: number): void {
    this.time += dt;

    for (let i = this.sectors.length - 1; i >= 0; i--) {
      const sector = this.sectors[i];
      sector.timer -= dt;
      if (sector.timer > 0) continue;
      if (sector.state === 'telegraph') {
        sector.state = 'active';
        sector.timer = HAZARD.activeTime;
      } else if (sector.state === 'active') {
        sector.state = 'fading';
        sector.timer = 0.7;
      } else {
        this.sectors.splice(i, 1);
      }
    }

    this.drawHazards();
    this.updateHaze();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  private drawHazards(): void {
    const g = this.hazardLayer;
    g.clear();
    if (this.sectors.length === 0) return;
    g.setPosition(this.cx, this.cy);
    g.setScale(this.rx / ARENA.drawRadius, this.ry / ARENA.drawRadius);

    const R = ARENA.drawRadius;
    for (const sector of this.sectors) {
      const from = sector.angle - sector.halfWidth;
      const to = sector.angle + sector.halfWidth;
      let color: number = BRAND.emberOrange;
      let alpha: number;
      if (sector.state === 'telegraph') {
        // Fast strobe while the ground is cracking — unmistakable warning.
        const t = 1 - sector.timer / HAZARD.telegraphTime;
        alpha = 0.1 + 0.22 * Math.abs(Math.sin(t * Math.PI * 6));
        color = BRAND.rebirthGold;
      } else if (sector.state === 'active') {
        alpha = 0.42 + 0.12 * Math.sin(this.time * 9);
      } else {
        alpha = 0.3 * (sector.timer / 0.7);
      }

      g.fillStyle(color, alpha);
      g.beginPath();
      // Follow the wall shape so the wedge reaches into the board's corners.
      const inner = R * HAZARD.innerRadius;
      g.moveTo(Math.cos(from) * inner * this.edge(from), Math.sin(from) * inner * this.edge(from));
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        g.lineTo(Math.cos(a) * R * this.edge(a), Math.sin(a) * R * this.edge(a));
      }
      for (let i = steps; i >= 0; i--) {
        const a = from + ((to - from) * i) / steps;
        g.lineTo(Math.cos(a) * inner * this.edge(a), Math.sin(a) * inner * this.edge(a));
      }
      g.closePath();
      g.fillPath();

      if (sector.state !== 'telegraph') {
        g.lineStyle(6, BRAND.rebirthGold, alpha * 0.8);
        g.strokePath();
      }
    }
  }

  private updateHaze(): void {
    if (this.reducedMotion) {
      for (const h of this.haze) h.setVisible(false);
      return;
    }
    for (let i = 0; i < this.haze.length; i++) {
      const h = this.haze[i];
      const t = this.time * (0.12 + i * 0.05) + i * 2.1;
      h.setVisible(true);
      h.setPosition(
        this.cx + Math.cos(t) * this.rx * 0.45,
        this.cy + Math.sin(t * 1.3) * this.ry * 0.4,
      );
      h.setScale(4 + Math.sin(t * 0.7) * 1.2);
      h.setAlpha(0.05 + 0.03 * Math.sin(t * 1.7));
    }
  }

  reset(): void {
    this.sectors.length = 0;
    this.hazardLayer.clear();
  }

  destroy(): void {
    this.bg.destroy();
    for (const part of this.boardParts) part.destroy();
    this.scrim.destroy();
    this.hazardLayer.destroy();
    for (const h of this.haze) h.destroy();
  }
}
