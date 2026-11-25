import Phaser from 'phaser';
import { session } from '../core/Session';
import { VIEWPORT_EVENT, measureSafeArea } from '../core/safeArea';
import { applyCamera } from '../core/viewport';
import { BRAND_CSS } from '../config/brand';
import { audio } from '../systems/AudioEngine';
import { haptics } from '../systems/Haptics';
import { CONTROL_MODES } from '../systems/Progression';
import { MENU_ART, howToPanel, mainMenuPanel, progressionPanel, quitPanel, settingsPanel } from '../ui/panels';
import menuArt from '../assets/ui/main-menu.gif';

/**
 * Main menu (founder art, 2026-11-23): the animated EmberLoop menu image fills
 * the screen and its five drawn buttons are live — Play, How to Play,
 * Progress, Settings, Quit. The menu is a DOM panel (so the GIF animates
 * natively); this scene only drives it.
 */
export class TitleScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.starting = false;
    applyCamera(this);
    this.cameras.main.setBackgroundColor(BRAND_CSS.voidBlack);
    this.openMenu();

    // Desktop convenience: Enter or Space plays.
    this.input.keyboard?.on('keydown-ENTER', () => this.play());
    this.input.keyboard?.on('keydown-SPACE', () => this.play());

    const onResize = () => {
      applyCamera(this);
      this.fitMenuArt();
    };
    // The insets can change without a canvas resize (a Home Screen app reports
    // them late), so the menu also re-fits on every viewport check.
    const onViewport = () => this.fitMenuArt();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    window.addEventListener(VIEWPORT_EVENT, onViewport);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      window.removeEventListener(VIEWPORT_EVENT, onViewport);
    });
  }

  private bestLine(): string {
    if (session.save.runs === 0) return '';
    return `BEST ${Math.round(session.save.highScore).toLocaleString('en-US')}  ·  ${formatClock(session.save.longestSurvival)}`;
  }

  private openMenu(): void {
    session.ui.openPanel(mainMenuPanel(menuArt, this.bestLine()), {
      play: () => this.play(),
      how: () => this.tap(() => this.openHowTo()),
      progress: () => this.tap(() => this.openProgress()),
      settings: () => this.tap(() => this.openSettings()),
      quit: () => this.tap(() => this.openQuit()),
    });
    this.fitMenuArt();
  }

  /**
   * Cover the screen with the art (cropping the sides on tall phones), kept
   * below the status bar / Dynamic Island so the logo is never under it. The
   * tap areas are percentages of this box, so they stay on the drawn buttons.
   * The insets are read fresh every time: a cached value can be stale.
   */
  private fitMenuArt(): void {
    const art = document.getElementById('menu-art');
    const host = art?.parentElement;
    if (!art || !host) return;
    const w = host.clientWidth;
    const top = measureSafeArea().top;
    const h = host.clientHeight - top;
    const scale = Math.max(w / MENU_ART.width, h / MENU_ART.height);
    const width = MENU_ART.width * scale;
    const height = MENU_ART.height * scale;
    art.style.width = `${width}px`;
    art.style.height = `${height}px`;
    art.style.left = `${(w - width) / 2}px`;
    art.style.top = `${top + (h - height) / 2}px`;
  }

  /** Every menu press: wake audio (first gesture), a click and a buzz. */
  private tap(then: () => void): void {
    this.unlockAudio();
    audio.uiTap();
    haptics.play('tap');
    then();
  }

  private unlockAudio(): void {
    audio.unlock();
    session.applySettings();
    audio.startMusic();
  }

  private play(): void {
    if (this.starting) return;
    this.starting = true;
    this.unlockAudio();
    haptics.play('tap');
    audio.uiTap();
    session.ui.closePanel();
    const { width, height } = this.scale;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game', { pointerX: width / 2, pointerY: height * 0.6 });
    });
  }

  private openHowTo(): void {
    session.ui.openPanel(howToPanel(), { close: () => this.openMenu() });
  }

  private openProgress(): void {
    const render = () => {
      session.ui.openPanel(progressionPanel(session.save), {
        close: () => this.openMenu(),
        palette: (dataset) => {
          const id = dataset.id;
          if (!id || !session.save.unlockedPalettes.includes(id)) return;
          session.selectPalette(id);
          audio.uiTap();
          render();
        },
      });
    };
    render();
  }

  private openSettings(): void {
    const render = () => {
      session.ui.openPanel(settingsPanel(session.settings), {
        close: () => this.openMenu(),
        control: () => {
          const next = CONTROL_MODES[(CONTROL_MODES.indexOf(session.settings.controlMode) + 1) % CONTROL_MODES.length];
          session.setSetting('controlMode', next);
          audio.uiTap();
          render();
        },
        toggle: (dataset) => {
          const key = dataset.key as 'sound' | 'music' | 'haptics' | 'reducedMotion' | undefined;
          if (!key) return;
          session.setSetting(key, !session.settings[key]);
          audio.uiTap();
          render();
        },
      });
    };
    render();
  }

  private openQuit(): void {
    session.ui.openPanel(quitPanel(), { close: () => this.openMenu() });
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
