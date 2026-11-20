import Phaser from 'phaser';
import { generateTextures } from '../effects/Textures';
import { loadPhoenixTextures } from '../entities/PhoenixSprite';
import { loadArenaTextures } from '../effects/Arena';

/** Loads the phoenix art, generates every procedural texture, then hands off to the title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    loadPhoenixTextures(this);
    loadArenaTextures(this);
  }

  create(): void {
    generateTextures(this);
    this.scene.start('Title');
  }
}
