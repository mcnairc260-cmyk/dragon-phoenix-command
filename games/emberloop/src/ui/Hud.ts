import Phaser from 'phaser';
import { PLAYER } from '../config/GameConfig';
import { clamp } from '../core/math';
import { safeArea } from '../core/safeArea';
import { BRAND, BRAND_CSS } from '../config/brand';
import { TEX } from '../effects/Textures';
import { FONT_DISPLAY, FONT_MONO } from './fonts';

export interface HudState {
  score: number;
  multiplier: number;
  combo: number;
  heat: number;
  elapsed: number;
  health: number;
  level: number;
  xpProgress: number;
  burstFraction: number;
  burstCharges: number;
  maxBurstCharges: number;
  bossName?: string;
  bossHp?: number;
  bossStage?: number;
  bossStages?: number;
}

/**
 * In-canvas heads-up display.
 *
 * Lives on the canvas (not the DOM) so it can share the game's slow-motion and
 * shake, and so it never costs a layout/paint during a run.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly multText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly heatLabel: Phaser.GameObjects.Text;
  private readonly xpLabel: Phaser.GameObjects.Text;
  private readonly burstLabel: Phaser.GameObjects.Text;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly burstPips: Phaser.GameObjects.Image[] = [];
  private readonly bossLabel: Phaser.GameObjects.Text;
  private readonly pauseButton: Phaser.GameObjects.Container;
  private readonly edgeMarkers: Phaser.GameObjects.Image[] = [];

  private width = 390;
  private height = 844;
  private pulse = 0;

  constructor(scene: Phaser.Scene, depth: number, onPause: () => void) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(depth);

    this.bars = scene.add.graphics();
    this.root.add(this.bars);

    this.scoreText = scene.add
      .text(0, 0, '0', { fontFamily: FONT_MONO, fontSize: '34px', color: BRAND_CSS.ghostWhite })
      .setOrigin(0.5, 0);
    this.multText = scene.add
      .text(0, 0, '', { fontFamily: FONT_DISPLAY, fontSize: '15px', color: BRAND_CSS.rebirthGold })
      .setOrigin(0.5, 0);
    this.timeText = scene.add
      .text(0, 0, '0:00', { fontFamily: FONT_MONO, fontSize: '14px', color: BRAND_CSS.steel })
      .setOrigin(1, 0);
    this.levelText = scene.add
      .text(0, 0, 'LV 1', { fontFamily: FONT_MONO, fontSize: '12px', color: BRAND_CSS.signalCyan })
      .setOrigin(0, 0.5);
    this.xpLabel = scene.add
      .text(0, 0, 'ASCENSION', { fontFamily: FONT_MONO, fontSize: '9px', color: BRAND_CSS.signalCyan })
      .setOrigin(0, 0.5);
    this.heatLabel = scene.add
      .text(0, 0, 'HEAT', { fontFamily: FONT_MONO, fontSize: '9px', color: BRAND_CSS.emberOrange })
      .setOrigin(0, 0.5);
    this.burstLabel = scene.add
      .text(0, 0, 'PHOENIX BURST', { fontFamily: FONT_MONO, fontSize: '10px', color: BRAND_CSS.rebirthGold })
      .setOrigin(0.5, 1);
    this.bossLabel = scene.add
      .text(0, 0, '', { fontFamily: FONT_DISPLAY, fontSize: '13px', color: BRAND_CSS.emberOrange })
      .setOrigin(0.5, 0)
      .setVisible(false);

    for (let i = 0; i < PLAYER.maxHealth; i++) {
      const heart = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setScale(0.42);
      this.hearts.push(heart);
      this.root.add(heart);
    }

    // Burst charge pips sit above the thumb rest at the bottom of the screen.
    for (let i = 0; i < 3; i++) {
      const pip = scene.add.image(0, 0, TEX.glowTight).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setVisible(false);
      this.burstPips.push(pip);
      this.root.add(pip);
    }

    // Off-screen danger arrows.
    for (let i = 0; i < 10; i++) {
      const marker = scene.add.image(0, 0, TEX.arrow).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setScale(0.9);
      this.edgeMarkers.push(marker);
      this.root.add(marker);
    }

    this.pauseButton = this.createPauseButton(onPause);

    this.root.add([this.scoreText, this.multText, this.timeText, this.levelText, this.xpLabel, this.heatLabel, this.burstLabel, this.bossLabel, this.pauseButton]);
  }

  private createPauseButton(onPause: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    // A generous 52x52 hit area — comfortably past the 44pt iOS minimum.
    const hit = this.scene.add.rectangle(0, 0, 52, 52, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    const bar1 = this.scene.add.rectangle(-5, 0, 4, 16, BRAND.steel, 0.9);
    const bar2 = this.scene.add.rectangle(5, 0, 4, 16, BRAND.steel, 0.9);
    hit.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onPause();
    });
    container.add([hit, bar1, bar2]);
    return container;
  }

  layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const inset = safeArea();
    const top = inset.top + 12;

    // Vertical rhythm, all relative to `top`:
    //   0..34  score        34..49  multiplier readout
    //   58..63 XP bar       74..78  Heat bar        88+  boss
    // Labels are centred on their bar rather than stacked above it, so no row
    // can grow into its neighbour.
    this.scoreText.setPosition(width / 2, top);
    this.multText.setPosition(width / 2, top + 34);
    this.timeText.setPosition(width - inset.right - 16, top + 4);
    // Level sits beside the health pips, clear of the centred readout.
    this.levelText.setPosition(inset.left + 82, top + 14);
    this.xpLabel.setPosition(inset.left + 18, top + 60);
    this.heatLabel.setPosition(inset.left + 18, top + 76);
    this.burstLabel.setPosition(width / 2, height - inset.bottom - 40);
    this.bossLabel.setPosition(width / 2, top + 88);
    this.pauseButton.setPosition(width - inset.right - 30, top + 34);

    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setPosition(inset.left + 20 + i * 20, top + 14);
    }
  }

  update(state: HudState, dt: number): void {
    this.pulse += dt;
    const inset = safeArea();

    this.scoreText.setText(Math.round(state.score).toLocaleString('en-US'));
    this.timeText.setText(formatClock(state.elapsed));
    this.levelText.setText(`LV ${state.level}`);

    if (state.multiplier > 1 || state.combo > 0) {
      this.multText.setVisible(true).setText(`×${state.multiplier.toFixed(1)}  ·  ${state.combo} COMBO`);
      // The multiplier readout throbs harder the hotter the run gets.
      const throb = 1 + Math.sin(this.pulse * 8) * 0.03 * Math.min(state.multiplier, 6);
      this.multText.setScale(throb);
    } else {
      this.multText.setVisible(true).setText('GRAZE DANGER TO BUILD HEAT').setScale(1).setAlpha(0.5);
    }
    if (state.multiplier > 1 || state.combo > 0) this.multText.setAlpha(1);

    for (let i = 0; i < this.hearts.length; i++) {
      const alive = i < state.health;
      this.hearts[i].setTint(alive ? BRAND.emberOrange : BRAND.carbon).setAlpha(alive ? 0.95 : 0.6).setScale(alive ? 0.42 : 0.3);
    }

    const maxPips = Math.min(this.burstPips.length, state.maxBurstCharges);
    for (let i = 0; i < this.burstPips.length; i++) {
      const pip = this.burstPips[i];
      if (i >= maxPips) {
        pip.setVisible(false);
        continue;
      }
      const charged = i < state.burstCharges;
      pip
        .setVisible(true)
        .setPosition(this.width / 2 + (i - (maxPips - 1) / 2) * 26, this.height - inset.bottom - 54)
        .setTint(charged ? BRAND.rebirthGold : BRAND.carbon)
        .setScale(charged ? 0.34 + Math.sin(this.pulse * 6) * 0.03 : 0.24)
        .setAlpha(charged ? 1 : 0.6);
    }

    this.drawBars(state);
  }

  private drawBars(state: HudState): void {
    const g = this.bars;
    const inset = safeArea();
    g.clear();

    const margin = 18 + Math.max(inset.left, inset.right);
    // Reserve a left column for the mono gauge labels.
    const labelColumn = 62;
    const barX = margin + labelColumn;
    const barWidth = this.width - margin - barX;
    const top = inset.top + 12;

    // ASCENSION bar (Signal Cyan) — experience toward the next upgrade.
    const xpY = top + 58;
    g.fillStyle(BRAND.carbon, 0.95);
    g.fillRoundedRect(barX, xpY, barWidth, 5, 2.5);
    g.fillStyle(BRAND.signalCyan, 0.95);
    g.fillRoundedRect(barX, xpY, Math.max(2, barWidth * clamp(state.xpProgress, 0, 1)), 5, 2.5);

    // HEAT bar — Ember Orange, tipping to Rebirth Gold once the run is hot.
    const heatY = top + 74;
    g.fillStyle(BRAND.carbon, 0.95);
    g.fillRoundedRect(barX, heatY, barWidth, 4, 2);
    if (state.heat > 0) {
      g.fillStyle(state.multiplier >= 3 ? BRAND.rebirthGold : BRAND.emberOrange, 0.95);
      g.fillRoundedRect(barX, heatY, Math.max(2, barWidth * clamp(state.heat, 0, 1)), 4, 2);
    }

    // Phoenix Burst meter across the bottom.
    const burstY = this.height - inset.bottom - 34;
    const burstWidth = this.width - margin * 2;
    g.fillStyle(BRAND.carbon, 0.9);
    g.fillRoundedRect(margin, burstY, burstWidth, 9, 4.5);
    const full = state.burstCharges >= state.maxBurstCharges;
    g.fillStyle(full ? BRAND.rebirthGold : BRAND.emberOrange, full ? 0.95 : 0.85);
    g.fillRoundedRect(margin, burstY, Math.max(3, burstWidth * clamp(state.burstFraction, 0, 1)), 9, 4.5);
    if (state.burstCharges > 0) {
      // A pulsing outline says "you can release now".
      g.lineStyle(2, BRAND.rebirthGold, 0.5 + 0.4 * Math.sin(this.pulse * 7));
      g.strokeRoundedRect(margin - 1, burstY - 1, burstWidth + 2, 11, 5.5);
    }

    // Boss health, when one is alive.
    if (state.bossHp !== undefined && state.bossName) {
      const bossY = top + 100;
      this.bossLabel.setVisible(true).setText(`${state.bossName}   ${'◆'.repeat(state.bossStages ?? 1)}`.trim());
      const bossWidth = this.width - margin * 2;
      g.fillStyle(BRAND.carbon, 0.95);
      g.fillRoundedRect(margin, bossY, bossWidth, 8, 4);
      g.fillStyle(BRAND.emberOrange, 0.95);
      g.fillRoundedRect(margin, bossY, Math.max(2, bossWidth * clamp(state.bossHp, 0, 1)), 8, 4);
      g.lineStyle(1, BRAND.rebirthGold, 0.7);
      g.strokeRoundedRect(margin, bossY, bossWidth, 8, 4);
    } else {
      this.bossLabel.setVisible(false);
    }
  }

  /**
   * Draw edge arrows for dangerous things outside the viewport so an off-screen
   * charge is never a surprise.
   */
  updateEdgeMarkers(threats: { x: number; y: number; color: number }[]): void {
    const inset = safeArea();
    const pad = 22;
    const minX = inset.left + pad;
    const maxX = this.width - inset.right - pad;
    const minY = inset.top + 96;
    const maxY = this.height - inset.bottom - 64;

    let used = 0;
    for (const threat of threats) {
      if (used >= this.edgeMarkers.length) break;
      const onScreen = threat.x > minX && threat.x < maxX && threat.y > minY && threat.y < maxY;
      if (onScreen) continue;
      const marker = this.edgeMarkers[used++];
      const cx = this.width / 2;
      const cy = this.height / 2;
      const angle = Math.atan2(threat.y - cy, threat.x - cx);
      marker
        .setVisible(true)
        .setPosition(clamp(threat.x, minX, maxX), clamp(threat.y, minY, maxY))
        .setRotation(angle)
        .setTint(threat.color)
        .setAlpha(0.55 + 0.35 * Math.sin(this.pulse * 9));
    }
    for (let i = used; i < this.edgeMarkers.length; i++) this.edgeMarkers[i].setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
