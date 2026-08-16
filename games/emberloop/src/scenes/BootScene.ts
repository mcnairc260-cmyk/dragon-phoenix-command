import Phaser from 'phaser';
import { generateTextures } from '../effects/Textures';

/** Generates every procedural texture, then hands off to the title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    this.scene.start('Title');
  }
}
