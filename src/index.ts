// src/index.ts
import Phaser from 'phaser';
import SlotScene from './scenes/SlotScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: '#222',
  scene: [SlotScene]
});
