import Phaser from 'phaser';
import SlotScene from './SlotScene';

export default class Animations {
  private scene: SlotScene;

  constructor(scene: SlotScene) {
    this.scene = scene;
  }

  /**
   * Adds a subtle hovering effect to UFOs
   */
  addUfoHoverEffect(ufo: Phaser.GameObjects.Image) {
    if (!ufo || ufo.alpha <= 0) return;
    
    // Store the original position to prevent skipping
    const originalX = ufo.x;
    const originalY = ufo.y;
    
    // Clear any existing tweens on this UFO with proper position reset
    this.scene.tweens.killTweensOf(ufo);
    
    // Ensure we're starting from the correct position
    ufo.x = originalX;
    ufo.y = originalY;
    
    // Random subtle movement values
    const xMovement = Phaser.Math.FloatBetween(3, 7);
    const yMovement = Phaser.Math.FloatBetween(2, 5);
    const duration = Phaser.Math.Between(2000, 3000);
    
    // Horizontal movement
    this.scene.tweens.add({
      targets: ufo,
      x: { from: originalX - xMovement/2, to: originalX + xMovement/2 },
      duration: duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Vertical movement (slightly different timing for natural look)
    this.scene.tweens.add({
      targets: ufo,
      y: { from: originalY - yMovement/2, to: originalY + yMovement/2 },
      duration: duration * 0.7, // Slightly faster vertical movement
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Animates the win scenario (UFOs fly away, background changes).
   * Calls the provided callback when all animations are finished.
   */
  animateWinScenario(
    bgNight: Phaser.GameObjects.Image,
    bg: Phaser.GameObjects.Image,
    ufoTargets: Phaser.GameObjects.Image[],
    onCompleteCallback: () => void,
    coinsSuccessSfx?: Phaser.Sound.BaseSound
  ) {
    const { width, height } = this.scene.scale;
    const baseDuration = 1500;

    // Stop UFO hover animations - store current positions to prevent jumps
    const currentPositions = ufoTargets.map(ufo => ({
      obj: ufo,
      x: ufo.x,
      y: ufo.y
    }));
    
    this.scene.tweens.killTweensOf(ufoTargets);
    
    // Restore positions after killing the tweens
    currentPositions.forEach(pos => {
      if (pos.obj && pos.obj.active) {
        pos.obj.x = pos.x;
        pos.obj.y = pos.y;
      }
    });

    // Fade out night, fade in day
    this.scene.tweens.add({ targets: bgNight, alpha: 0, duration: baseDuration });
    this.scene.tweens.add({ targets: bg, alpha: 1, duration: baseDuration });
    
    if (coinsSuccessSfx) {
      coinsSuccessSfx.play();
    }
    
    // UFOs fly away
    const ufoDurations = [1200, 1300, 1400];
    const ufoDelays = [0, 100, 200];
    let maxEndTime = 0;
    let lastTween: Phaser.Tweens.Tween | null = null;

    ufoTargets.forEach((ufo, index) => {
        if (ufo.alpha <= 0) return; // Skip invisible UFOs
        const duration = ufoDurations[Math.min(index, ufoDurations.length - 1)];
        const delay = ufoDelays[Math.min(index, ufoDelays.length - 1)];
        const tween = this.scene.tweens.add({
            targets: ufo,
            y: -100,
            alpha: 0,
            duration: duration,
            ease: 'Cubic.easeIn',
            delay: delay
        });
        if (delay + duration > maxEndTime) {
            maxEndTime = delay + duration;
            lastTween = tween;
        }
    });

    // Use the provided callback
    if (lastTween) {
        (lastTween as Phaser.Tweens.Tween).on('complete', onCompleteCallback);
    } else {
        this.scene.time.delayedCall(baseDuration, onCompleteCallback, [], this.scene);
    }
  }

  /**
   * Creates a single jagged lightning beam graphic.
   */
  createLightningBeam(startX: number, startY: number, length: number): Phaser.GameObjects.Graphics {
    const beamColor = 0xffff00; // Yellow/White for lightning
    const beamThickness = Phaser.Math.Between(2, 5); // Random thickness
    const segments = 10; // Number of jagged segments
    const maxOffset = 15; // Max horizontal deviation
    const beam = this.scene.add.graphics({ x: startX, y: startY });
    beam.lineStyle(beamThickness, beamColor, 1);
    beam.beginPath();
    beam.moveTo(0, 0);

    let currentY = 0;
    const segmentLength = length / segments;

    for (let i = 1; i <= segments; i++) {
        const randomX = Phaser.Math.FloatBetween(-maxOffset, maxOffset);
        currentY += segmentLength;
        beam.lineTo(randomX, currentY);
    }

    beam.strokePath();
    // Set depth: Needs to be above bgNight (-1) but below the overlay (20)
    beam.setDepth(-1); 
    return beam;
  }

  /**
   * Animates the lose scenario (lightning strikes).
   * Calls the provided callback when all animations are finished.
   */
  animateLoseScenario(
    ufoTargets: Phaser.GameObjects.Image[],
    thunderSfx: Phaser.Sound.BaseSound,
    existingBeams: Phaser.GameObjects.Graphics[],
    existingTimers: Phaser.Time.TimerEvent[],
    onCompleteCallback: () => void,
    onBeamCreated: (beam: Phaser.GameObjects.Graphics) => void
  ) {
    // Clear existing beams and timers
    existingBeams.forEach(beam => beam.destroy());
    existingTimers.forEach(timer => timer.remove());
    
    // Reset tracking arrays - caller must handle these
    const strikeTimers: Phaser.Time.TimerEvent[] = [];

    const numberOfStrikes = 3; // Fewer strikes per lost life?
    const delayBetweenStrikes = 120;
    const flashDuration = 80;
    const beamLength = this.scene.scale.height * 0.7;
    const staggerOffset = 40;
    let maxOverallEndTime = 0;
    let lightningPlayed = false; // Play sound only once per sequence

    ufoTargets.forEach((ufo, index) => {
      if (ufo.alpha <= 0) return;

      const startX = ufo.x;
      const startY = ufo.y + (ufo.displayHeight * ufo.scaleY * 0.5);
      const currentUfoStartTime = index * staggerOffset;

      const lastStrikeStartTime = currentUfoStartTime + (numberOfStrikes - 1) * delayBetweenStrikes;
      const lastStrikeEndTime = lastStrikeStartTime + flashDuration;
      maxOverallEndTime = Math.max(maxOverallEndTime, lastStrikeEndTime);

      if (!lightningPlayed) { // Play thunder only on the first UFO strike sequence
          thunderSfx.play('thunderCut');
          lightningPlayed = true;
      }

      const timer = this.scene.time.addEvent({
          delay: delayBetweenStrikes,
          callback: () => {
              const beam = this.createLightningBeam(startX, startY, beamLength);
              onBeamCreated(beam); // Let caller track the beam
              this.scene.time.delayedCall(flashDuration, () => {
                  if (beam && beam.active) {
                      beam.destroy();
                  }
              }, [], this.scene);
          },
          repeat: numberOfStrikes - 1,
          startAt: currentUfoStartTime,
          callbackScope: this.scene
      });
      
      strikeTimers.push(timer);
    });

    // Use the provided callback after the last flash disappears
    if (maxOverallEndTime > 0) {
        this.scene.time.delayedCall(maxOverallEndTime + 100, onCompleteCallback, [], this.scene);
    } else {
         // If no visible UFOs to strike, call back immediately
        onCompleteCallback();
    }
    
    // Return the timers so the caller can track them
    return strikeTimers;
  }

  /**
   * Shows animated text displaying the number of chances left
   */
  showChancesAnimation(chancesLeft: number, isSpins: boolean = true) {
    const { width, height } = this.scene.scale;
    
    // Create proper text based on number of chances left
    const textMessage = chancesLeft === 1 
      ? `${chancesLeft} ${isSpins ? 'SPIN' : 'CHANCE'} LEFT` 
      : `${chancesLeft} ${isSpins ? 'SPINS' : 'CHANCES'} LEFT`;
    
    // Create background for the text
    const textBackground = this.scene.add.graphics();
    textBackground.fillStyle(0x000000, 0.7);
    textBackground.lineStyle(4, 0xffd700, 0.7);
    
    // Create the text in the center of the screen
    const chancesText = this.scene.add.text(width/2, height/2, textMessage, {
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#FFD700', // Gold color
      stroke: '#000000', // Black outline
      strokeThickness: 6,
      shadow: { color: '#000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
    }).setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5)
      .setDepth(15);
    
    // Size and position background based on text dimensions
    // Add padding around the text - slightly reduced padding
    const padding = 15;
    const bgWidth = chancesText.width * 1.1 + padding * 2; // Slightly smaller multiplier
    const bgHeight = chancesText.height * 1.1 + padding * 2; // Slightly smaller multiplier
    textBackground.fillRoundedRect(
      width/2 - bgWidth/2, 
      height/2 - bgHeight/2, 
      bgWidth, 
      bgHeight,
      10 // Reduced corner radius
    );
    textBackground.strokeRoundedRect(
      width/2 - bgWidth/2, 
      height/2 - bgHeight/2, 
      bgWidth, 
      bgHeight,
      10 // Reduced corner radius
    );
    textBackground.setDepth(14) // Behind text
      .setAlpha(0);
    
    // Separate animations for text and background
    
    // Background just fades in and out - no scaling
    this.scene.tweens.add({
      targets: textBackground,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: textBackground,
            alpha: 0,
            duration: 600,
            ease: 'Sine.easeIn',
            onComplete: () => {
              textBackground.destroy();
            }
          });
        });
      }
    });
    
    // Text keeps the scaling + fade animation
    this.scene.tweens.add({
      targets: chancesText,
      alpha: 1,
      scale: 1.1,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: chancesText,
          scale: 1,
          duration: 200,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.scene.time.delayedCall(800, () => {
              this.scene.tweens.add({
                targets: chancesText,
                alpha: 0,
                scale: 1.3,
                duration: 600,
                ease: 'Sine.easeIn',
                onComplete: () => {
                  chancesText.destroy();
                }
              });
            });
          }
        });
      }
    });
  }

  /**
   * Add a subtle pulse effect to the spin button
   */
  addButtonPulse(button: Phaser.GameObjects.Image) {
    if (!button) return;
    
    // Remove any existing tweens on this button
    this.scene.tweens.killTweensOf(button);
    
    // Add a very subtle scale pulse
    this.scene.tweens.add({
      targets: button,
      scale: { from: 0.15, to: 0.155 }, // Very small scale change
      duration: 1200, // Slower animation for subtlety
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Stop hover animations for multiple UFOs and preserve positions
   */
  stopUfoHoverAnimations(ufos: Phaser.GameObjects.Image[]) {
    // Store current positions to prevent jumps
    const currentPositions = ufos.map(ufo => ({
      obj: ufo, 
      x: ufo.x, 
      y: ufo.y
    }));
    
    this.scene.tweens.killTweensOf(ufos);
    
    // Restore positions after killing the tweens
    currentPositions.forEach(pos => {
      if (pos.obj && pos.obj.active) {
        pos.obj.x = pos.x;
        pos.obj.y = pos.y;
      }
    });
  }

  /**
   * Create the animated win lines that show where the winning row is
   */
  createWinLineAnimation(winLines: Phaser.GameObjects.Graphics[]) {
    this.scene.tweens.add({
      targets: winLines,
      alpha: { from: 1, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Animate the UFOs flying in when spinning starts
   */
  animateUfoEntrance(
    ufoDown: Phaser.GameObjects.Image,
    ufoDownLeft: Phaser.GameObjects.Image,
    ufoDownRight: Phaser.GameObjects.Image
  ) {
    const { width, height } = this.scene.scale;
    
    // Main UFO animation
    this.scene.tweens.add({
      targets: ufoDown,
      alpha: 1,
      y: 80,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        this.addUfoHoverEffect(ufoDown);
      }
    });
    
    // Left UFO animation
    this.scene.tweens.add({
      targets: ufoDownLeft,
      alpha: 0.6,
      y: 40,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        this.addUfoHoverEffect(ufoDownLeft);
      }
    });
    
    // Right UFO animation
    this.scene.tweens.add({
      targets: ufoDownRight,
      alpha: 0.5,
      y: 60,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        this.addUfoHoverEffect(ufoDownRight);
      }
    });
  }

  /**
   * Animate the background change when spinning
   */
  animateBackgroundChange(
    bg: Phaser.GameObjects.Image,
    bgNight: Phaser.GameObjects.Image
  ) {
    const { width, height } = this.scene.scale;
    const bgNightOffset = { x: 0, y: 0 };
    
    // Fade out day background
    this.scene.tweens.add({
      targets: bg,
      alpha: 0,
      duration: 1000
    });
    
    // Fade in night background with shake
    this.scene.tweens.add({
      targets: bgNight,
      alpha: 1,
      x: width/2 + bgNightOffset.x,
      y: height/2 + bgNightOffset.y,
      duration: 1000,
      ease: 'Cubic.easeInOut',
      onStart: () => {
        this.scene.cameras.main.shake(700, 0.007);
      }
    });
  }
} 