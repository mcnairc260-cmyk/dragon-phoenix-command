import Phaser from 'phaser';
import { session } from '../core/Session';
import { safeArea } from '../core/safeArea';
import { applyCamera } from '../core/viewport';
import { BRAND, BRAND_CSS } from '../config/brand';
import { Arena } from '../effects/Arena';
import { TEX } from '../effects/Textures';
import { audio } from '../systems/AudioEngine';
import { haptics } from '../systems/Haptics';
import { FONT_DISPLAY, FONT_MONO } from '../ui/fonts';
import { howToPanel, progressionPanel } from '../ui/panels';

/**
 * Animated title screen. A demo phoenix loops around the live caldera behind
 * the logo, and a tap anywhere outside the small menu row starts a run — so the
 * game is always two taps from cold start (open → tap → playing).
 */
export class TitleScene extends Phaser.Scene {
  private arena!: Arena;
  private demo!: Phaser.GameObjects.Image;
  private demoGlow!: Phaser.GameObjects.Image;
  private demoTrail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private title!: Phaser.GameObjects.Text;
  private titleGlow!: Phaser.GameObjects.Image;
  private subtitle!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private best!: Phaser.GameObjects.Text;
  private menu: Phaser.GameObjects.Text[] = [];
  private t = 0;
  private starting = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.starting = false;
    this.t = 0;
    const { w: width, h: height } = applyCamera(this);

    this.arena = new Arena(this, 0);
    this.arena.reducedMotion = session.settings.reducedMotion;
    this.arena.layout(width, height);

    const palette = session.palette;

    this.demoTrail = this.add
      .particles(0, 0, TEX.glowTight, {
        lifespan: { min: 300, max: 800 },
        speed: { min: 5, max: 40 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.7, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 22,
        tint: palette.glow,
      })
      .setDepth(9);
    this.demoGlow = this.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(palette.glow).setDepth(10);
    this.demo = this.add.image(0, 0, TEX.phoenix).setTint(palette.core).setDepth(11).setScale(0.95);

    this.titleGlow = this.add
      .image(width / 2, 0, TEX.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(BRAND.emberOrange)
      .setDepth(19)
      .setScale(3.4, 1.1)
      .setAlpha(0.5);

    // Scale the wordmark to the viewport so the tracking never clips on a
    // narrow phone (SE-class) or look lost on a wide one.
    const titleSize = Math.round(Math.min(46, width * 0.104));
    this.title = this.add
      .text(width / 2, 0, 'EMBERLOOP', {
        fontFamily: FONT_DISPLAY,
        fontSize: `${titleSize}px`,
        color: BRAND_CSS.ghostWhite,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setShadow(0, 0, BRAND_CSS.emberOrange, 22, true, true);
    this.title.setLetterSpacing(5);

    this.subtitle = this.add
      .text(width / 2, 0, 'FIRE WITHIN · POWER UNLEASHED', {
        fontFamily: FONT_MONO,
        fontSize: '11px',
        color: BRAND_CSS.rebirthGold,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.subtitle.setLetterSpacing(3);

    this.prompt = this.add
      .text(width / 2, 0, 'TAP TO RISE', {
        fontFamily: FONT_DISPLAY,
        fontSize: '20px',
        color: BRAND_CSS.ghostWhite,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.prompt.setLetterSpacing(4);

    this.best = this.add
      .text(width / 2, 0, '', { fontFamily: FONT_MONO, fontSize: '12px', color: BRAND_CSS.steel })
      .setOrigin(0.5)
      .setDepth(20);

    this.buildMenu();
    this.layout(width, height);

    // Tap anywhere (except the menu row) to start.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      this.unlockAudio();
      if (objects.length > 0) return; // a menu item handled it
      if (session.ui.panelOpen) return;
      this.startGame(pointer);
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.arena.destroy();
    });
  }

  private buildMenu(): void {
    const items: { label: string; run: () => void }[] = [
      { label: 'HOW TO PLAY', run: () => this.openHowTo() },
      { label: 'PROGRESS', run: () => this.openProgress() },
    ];

    this.menu = items.map(({ label, run }) => {
      const text = this.add
        .text(0, 0, label, { fontFamily: FONT_MONO, fontSize: '12px', color: BRAND_CSS.steel })
        .setOrigin(0.5)
        .setDepth(21)
        // Padded hit area keeps these comfortably tappable without visual bulk.
        .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-30, -20, 160, 48), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      text.setLetterSpacing(2);
      text.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.unlockAudio();
        audio.uiTap();
        haptics.play('tap');
        run();
      });
      return text;
    });
  }

  private unlockAudio(): void {
    audio.unlock();
    session.applySettings();
    audio.startMusic();
  }

  private openHowTo(): void {
    session.ui.openPanel(howToPanel(), {
      close: () => session.ui.closePanel(),
    });
  }

  private openProgress(): void {
    const render = () => {
      session.ui.openPanel(progressionPanel(session.save), {
        close: () => session.ui.closePanel(),
        palette: (dataset) => {
          const id = dataset.id;
          if (!id || !session.save.unlockedPalettes.includes(id)) return;
          session.selectPalette(id);
          audio.uiTap();
          this.refreshPalette();
          render();
        },
      });
    };
    render();
  }

  private refreshPalette(): void {
    const palette = session.palette;
    this.demo.setTint(palette.core);
    this.demoGlow.setTint(palette.glow);
    this.demoTrail.setParticleTint(palette.glow);
  }

  private startGame(pointer: Phaser.Input.Pointer): void {
    if (this.starting) return;
    this.starting = true;
    haptics.play('tap');
    audio.uiTap();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game', { pointerX: pointer.worldX, pointerY: pointer.worldY });
    });
  }

  private onResize(): void {
    const { w, h } = applyCamera(this);
    this.arena.layout(w, h);
    this.layout(w, h);
  }

  private layout(width: number, height: number): void {
    const inset = safeArea();
    const centerY = height * 0.32;
    this.title.setPosition(width / 2, centerY);
    this.titleGlow.setPosition(width / 2, centerY);
    this.subtitle.setPosition(width / 2, centerY + 38);
    this.prompt.setPosition(width / 2, height * 0.74);
    this.best.setPosition(width / 2, height * 0.74 + 30);

    const menuY = height - inset.bottom - 34;
    this.menu.forEach((item, i) => {
      item.setPosition(width * (i === 0 ? 0.3 : 0.7), menuY);
    });

    this.best.setText(
      session.save.runs > 0
        ? `BEST ${Math.round(session.save.highScore).toLocaleString('en-US')}  ·  ${formatClock(session.save.longestSurvival)}`
        : 'DRAG TO FLY · RELEASE TO BURST',
    );
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;
    this.arena.update(dt);

    // Demo phoenix loops a lazy lissajous path around the caldera.
    const x = this.arena.cx + Math.cos(this.t * 0.7) * this.arena.rx * 0.62;
    const y = this.arena.cy + Math.sin(this.t * 1.1) * this.arena.ry * 0.5;
    const angle = Math.atan2(y - this.demo.y, x - this.demo.x);
    this.demo.setPosition(x, y).setRotation(angle);
    this.demoGlow.setPosition(x, y).setScale(1.1 + Math.sin(this.t * 5) * 0.08);
    this.demoTrail.setPosition(x, y);

    const breathe = session.settings.reducedMotion ? 1 : 1 + Math.sin(this.t * 2) * 0.02;
    this.title.setScale(breathe);
    this.titleGlow.setAlpha(0.35 + Math.sin(this.t * 1.7) * 0.12);
    this.prompt.setAlpha(session.settings.reducedMotion ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(this.t * 2.2)));
  }
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
