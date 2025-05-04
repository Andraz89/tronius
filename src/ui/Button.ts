// src/ui/Button.ts
import Phaser from 'phaser';

export default class UIButton {
  static create(
    scene: Phaser.Scene,
    x: number, y: number,
    texture: string,
    label: string,
    callback: () => void
  ) {
    const btn = scene.add.image(x, y, texture)
      .setInteractive()
      .setScale(0.15);
    btn.on('pointerdown', callback);

    // Optional: add text on top
  }
}
