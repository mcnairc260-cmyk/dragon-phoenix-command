import { DEBUG_FLAG } from '../config/GameConfig';
import { audio } from '../systems/AudioEngine';
import { getPalette, type Palette } from '../systems/Cosmetics';
import { haptics } from '../systems/Haptics';
import { browserStorage, loadSave, saveSave, type SaveData, type Settings } from '../systems/Progression';
import type { Ui } from '../ui/Ui';

/**
 * Cross-scene singleton: the persisted save, the settings that follow from it,
 * and the DOM overlay handle. Scenes are recreated constantly; this is not.
 */
class Session {
  save: SaveData = loadSave(browserStorage());
  ui!: Ui;
  debug = false;

  init(ui: Ui): void {
    this.ui = ui;
    const params = new URLSearchParams(window.location.search);
    this.debug = params.get(DEBUG_FLAG) === '1' || import.meta.env.DEV;
    this.applySettings();
  }

  get settings(): Settings {
    return this.save.settings;
  }

  get palette(): Palette {
    return getPalette(this.save.selectedPalette);
  }

  /** Push the current settings into every subsystem that cares. */
  applySettings(): void {
    const s = this.settings;
    audio.setSoundEnabled(s.sound);
    audio.setMusicEnabled(s.music);
    haptics.enabled = s.haptics;
    this.ui?.setReducedMotion(s.reducedMotion);
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.save.settings[key] = value;
    this.applySettings();
    this.persist();
  }

  selectPalette(id: string): void {
    if (!this.save.unlockedPalettes.includes(id)) return;
    this.save.selectedPalette = id;
    this.persist();
  }

  markTutorialSeen(): void {
    if (this.save.tutorialSeen) return;
    this.save.tutorialSeen = true;
    this.persist();
  }

  persist(): void {
    saveSave(browserStorage(), this.save);
  }

  reload(): void {
    this.save = loadSave(browserStorage());
    this.applySettings();
  }
}

export const session = new Session();
