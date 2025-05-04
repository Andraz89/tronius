// src/scenes/SlotScene.ts
import Phaser from 'phaser';
import { SymbolKey, ALL_SYMBOLS } from '../types/symbols';
import UIButton from '../ui/Button';

export default class SlotScene extends Phaser.Scene {
  private reels: Phaser.GameObjects.Container[] = [];
  private isSpinning = false;
  private checkingResult: string[] = [];
  private spinLoopSfx!: Phaser.Sound.BaseSound;
  private ufoLoopSfx!: Phaser.Sound.BaseSound;
  private thunderSfx!: Phaser.Sound.BaseSound;
  private bg!: Phaser.GameObjects.Image;
  private bgNight!: Phaser.GameObjects.Image;
  private ufoDown!: Phaser.GameObjects.Image;
  private ufoDownLeft!: Phaser.GameObjects.Image;
  private ufoDownRight!: Phaser.GameObjects.Image;
  private loseBeams: Phaser.GameObjects.Graphics[] = []; // Added for lose beams
  private strikeTimers: Phaser.Time.TimerEvent[] = []; // Added for lightning strike timers
  constructor() { super({ key: 'SlotScene' }); }

  preload() {
    this.load.audio('spinLoop', 'assets/audio/slot-machine-reels-sound.mp3');
    this.load.audio('ufoLoop', 'assets/audio/ufo-sound-effect.mp3');
    this.load.audio('thunder', 'assets/audio/thunder.mp3');
    // Load your 5 symbol images
    ALL_SYMBOLS.forEach(key => {
      this.load.image(key, `assets/${key}.png`);
    });
    // Load button image(s)
    this.load.image('spinBtn', 'assets/spin.png');
    this.load.image('bg_day', 'assets/bg_day.jpeg');
    this.load.image('bg_night', 'assets/bg_spin.png');
    this.load.image('ufo-down', 'assets/ufo-down.png');

  }

  create() {
    // --- Explicitly clear the reels array at the start of create ---
    this.reels = []; 
    // --- End explicit clear ---

    this.spinLoopSfx  = this.sound.add('spinLoop',  { loop: true, volume: 0.5 });
    this.ufoLoopSfx = this.sound.add('ufoLoop', { loop: false, volume: 0.5 });
    this.thunderSfx = this.sound.add('thunder', { loop: false, volume: 0.5 });
    const { width, height } = this.scale;
    this.bg = this.add
      .image(width/2, height/2, 'bg_day')
      .setDepth(-2);
    this.bgNight = this.add
      .image(width/2, height/2, 'bg_night')
      .setAlpha(0)
      .setDepth(-1);
    this.ufoDown = this.add
      .image(width/2, 0, 'ufo-down')
      .setAlpha(0)
      .setDepth(0);

      this.ufoDownLeft = this.add
      .image(width / 6, 0, 'ufo-down')
      .setAlpha(0)
      .setDepth(0);

      this.ufoDownRight = this.add
      .image(width - 50, 0, 'ufo-down')
      .setAlpha(0)
      .setDepth(0);


    this.ufoDown.setScale(0.15);
    this.ufoDownLeft.setScale(0.1);
    this.ufoDownRight.setScale(0.05);
    /*this.ufoDownLeft.setRotation(Math.PI / 1);  
    this.ufoDownRight.setRotation(-Math.PI / 1);*/
    /*this.ufoDownLeft.setOrigin(0, 0);
    this.ufoDownRight.setOrigin(0, 0);*/
    this.spinLoopSfx.addMarker({
      name: 'fastPart',
      start: 3.0,     
      duration: 6.0, 
    });
    this.createReels();
    UIButton.create(this, 240, 580, 'spinBtn', 'Spin', () => this.spin());
  }

  private createReels() {
    // Create 3 reels
    const startX = 80;
    const symbolHeight = 128;
    const spacing = symbolHeight + 20;
    const reelViewHeight = symbolHeight * 3; // Height of the visible reel area (3 symbols)
    
    // Create 3 reels
    for (let col = 0; col < 3; col++) {
        const reelX = startX + col * spacing;
        const reelY = 200;
        const reel = this.add.container(reelX, reelY);

        // --- Background Rectangle ---
        const backgroundRect = this.add.graphics();
        backgroundRect.fillStyle(0x333333, 0.5); // Dark gray, full opacity
        // Use updated symbolHeight and reelViewHeight
        backgroundRect.fillRect(-symbolHeight / 2, -symbolHeight / 2, symbolHeight, reelViewHeight);
        // Position the background rectangle at the same world coordinates as the reel container
        backgroundRect.x = reelX;
        backgroundRect.y = reelY;
        // Optional: Add to scene behind the reel container using depth
        backgroundRect.setDepth(-1); // Ensure it's behind symbols (if symbols have default depth 0)

        // --- Mask Graphics ---
        const maskGraphics = this.add.graphics();
        // Use updated symbolHeight and reelViewHeight
        maskGraphics.fillRect(-symbolHeight / 2, -symbolHeight / 2, symbolHeight, reelViewHeight);
        // Position the mask graphics at the same world coordinates as the reel container
        maskGraphics.x = reelX;
        maskGraphics.y = reelY;
        // Make the mask graphics object itself invisible
        maskGraphics.setVisible(false); // This graphics object should not be rendered

        // --- Symbols ---
        // Create 5 symbols per reel and add them to the container
        for (let row = 0; row < 5; row++) {
            // Use updated symbolHeight
            const symbolY = row * symbolHeight - symbolHeight;
            const symbol = this.add.image(0, symbolY, Phaser.Utils.Array.GetRandom(ALL_SYMBOLS));
            symbol.setOrigin(0.5);
            // CHECK if scale 0.125 is correct for 128px height symbols
            symbol.setScale(0.125);
            // Symbols added to the container will be positioned relative to (reelX, reelY)
            reel.add(symbol); 
        }

        // --- Apply Mask ---
        // Apply the mask (defined by maskGraphics) to the reel container
        reel.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics));
        
        this.reels.push(reel);
    }
  }

  private spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    // Ensure checkingResult is reset correctly for the new spin
    this.checkingResult = new Array(this.reels.length).fill(undefined); 

    this.spinLoopSfx.play('fastPart');
    this.ufoLoopSfx.play();
    const { width, height } = this.scale;
    const bgNightOffset = { x: 0, y: 0 }; // Customize final position offset for bg_night
    // Fade out day background
    this.tweens.add({
      targets: this.bg,
      alpha: 0,
      duration: 1000
    });
    // Fade in night background with shake
    this.tweens.add({
      targets: this.bgNight,
      alpha: 1,
      x: width/2 + bgNightOffset.x,
      y: height/2 + bgNightOffset.y,
      duration: 1000,
      ease: 'Cubic.easeInOut',
      onStart: () => {
        this.cameras.main.shake(700, 0.007);
      }
    });
    this.tweens.add({
      targets: this.ufoDown,
      alpha: 1,
      y: 80,
      duration: 2000,
      ease: 'Linear'
    });
    this.tweens.add({
      targets: this.ufoDownLeft,
      alpha: 0.6,
      y:40,
      duration: 2000,
      ease: 'Linear'
    });
    this.tweens.add({
      targets: this.ufoDownRight,
      alpha: 0.5,
      y: 60,
      duration: 2000,
      ease: 'Linear'
    });
    

    this.reels.forEach((reel, reelIndex) => {
      const spinCount = Phaser.Math.Between(2, 10) + reelIndex;
      const symbolHeight = 128; // Consistent height
      const offset = Phaser.Math.Between(0, 4);
      const randomOffset = offset * symbolHeight;
      const totalDistance = spinCount * symbolHeight * 5 + randomOffset;
      const duration = 2000 + reelIndex * 700;

      // --- Target ONLY the Image objects ---
      const tweenTargetSymbols = reel.list.filter(item => item instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[];
      
      if (tweenTargetSymbols.length < 5) {
          console.error(`Reel ${reelIndex} has ${tweenTargetSymbols.length} symbols before tween. Skipping.`);
          // Mark as error immediately so completion check works
          this.checkingResult[reelIndex] = 'error_pre_tween'; 
          this.checkSpinCompletion(); // Check if this was the last one failing
          return; 
      }
      // --- End Target Filtering ---

      this.tweens.add({
        targets: tweenTargetSymbols, // Use the filtered list
        y: `+=${totalDistance}`,
        duration: duration,
        ease: 'Cubic.out',
        onComplete: () => {
           // --- Get LIVE state inside callback ---
           const currentSymbols = reel.list.filter(item => item instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[];

           if (!currentSymbols || currentSymbols.length < 5) {
             console.error(`Reel ${reelIndex} symbols invalid length (${currentSymbols?.length ?? 0}) in onComplete.`);
             this.checkingResult[reelIndex] = 'error_on_complete'; 
           } else {
               // Wrap symbols
               currentSymbols.forEach(symbol => { 
                 const wrapBoundary = symbolHeight * 4;
                 const totalReelHeight = symbolHeight * 5;
                 while (symbol.y >= wrapBoundary) { // Top boundary
                   symbol.y -= totalReelHeight;
                 }
                 while (symbol.y < -symbolHeight) { // Bottom boundary
                    symbol.y += totalReelHeight;
                 }
               });

               // Sort and get result
               const sorted = currentSymbols.slice().sort((a,b) => a.y - b.y);
               if (sorted.length < 3) { 
                   console.error(`Reel ${reelIndex} sorted symbols invalid length (${sorted.length}) in onComplete.`);
                   this.checkingResult[reelIndex] = 'error_sorting';
               } else {
                   const middleSymbol = sorted[2]; 
                   // Ensure middleSymbol is valid before getting texture key
                   if (middleSymbol && middleSymbol.texture && middleSymbol.texture.key) {
                       this.checkingResult[reelIndex] = middleSymbol.texture.key;
                   } else {
                       console.error(`Reel ${reelIndex} middle symbol invalid in onComplete.`);
                       this.checkingResult[reelIndex] = 'error_middle_symbol';
                   }
               }
           }
           
           // Check if all reels are done
           this.checkSpinCompletion();

        }, // End onComplete
        onUpdate: (tween, target: Phaser.GameObjects.Image) => { 
            // It's generally better to wrap *all* symbols in the container,
            // not just the 'target' of the update frame.
            const updateSymbols = reel.list.filter(item => item instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[];
            if (!updateSymbols) return; 
             
            const wrapBoundary = symbolHeight * 4;
            const totalReelHeight = symbolHeight * 5;
            updateSymbols.forEach(symbol => {
              while (symbol.y >= wrapBoundary) {
                symbol.y -= totalReelHeight;
              }
               while (symbol.y < -symbolHeight) { 
                  symbol.y += totalReelHeight;
              }
            });
        } // End onUpdate
      }); // End tweens.add
    }); // End forEach reel
  }

  // --- Helper method to check spin completion ---
  private checkSpinCompletion() {
      // Check if all elements in checkingResult have been assigned a value (string key or error string)
      const resultsReceived = this.checkingResult.filter(r => r !== undefined).length;
      
      if (resultsReceived === this.reels.length) {
          // Only proceed if spinning was actually true
          if (!this.isSpinning) return; 

          this.isSpinning = false; // Set spinning to false *here*
          this.spinLoopSfx.stop();

          // Check if any reel ended in error (check for string 'error')
          const hasError = this.checkingResult.some(r => typeof r === 'string' && r.startsWith('error'));

          if (hasError) {
              console.error("Spin completed with errors in reels:", this.checkingResult);
              this.showEndScreen(false); // Error -> Lose
          } else {
              // Determine win/loss based on valid results (all should be texture keys now)
              const allSame = this.checkingResult.every(k => k === this.checkingResult[0]);
              console.log(allSame ? 'Win!' : 'No win:', this.checkingResult);
              this.showEndScreen(allSame);
          }
      }
  }

  /**
   * Animates the win scenario (UFOs fly away, background changes).
   * Calls the provided callback when all animations are finished.
   */
  private animateWinScenario(onCompleteCallback: () => void) {
    const { width, height } = this.scale;
    const baseDuration = 1500; // Use a base duration for coordination

    // Fade out night, fade in day (these can run concurrently)
    this.tweens.add({ targets: this.bgNight, alpha: 0, duration: baseDuration });
    this.tweens.add({ targets: this.bg, alpha: 1, duration: baseDuration });

    // UFOs fly away - find the one with the longest duration + delay
    const ufoDurations = [1200, 1300, 1400];
    const ufoDelays = [0, 100, 200];
    const ufoTargets = [this.ufoDown, this.ufoDownLeft, this.ufoDownRight];
    let maxEndTime = 0;
    let lastTween: Phaser.Tweens.Tween | null = null;

    ufoTargets.forEach((ufo, index) => {
        const duration = ufoDurations[index];
        const delay = ufoDelays[index];
        const tween = this.tweens.add({ 
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

    // Add the completion callback to the tween that finishes last
    if (lastTween) {
        // Explicitly assert the type to resolve the 'never' issue
        (lastTween as Phaser.Tweens.Tween).on('complete', onCompleteCallback);
    } else {
         // Fallback if no UFOs somehow (or instantly trigger if duration is 0)
        this.time.delayedCall(baseDuration, onCompleteCallback, [], this);
    }
  }

  /**
   * Creates a single jagged lightning beam graphic.
   */
  private createLightningBeam(startX: number, startY: number, length: number): Phaser.GameObjects.Graphics {
    const beamColor = 0xffff00; // Yellow/White for lightning
    const beamThickness = Phaser.Math.Between(2, 5); // Random thickness
    const segments = 10; // Number of jagged segments
    const maxOffset = 15; // Max horizontal deviation
    this.thunderSfx.play();
    const beam = this.add.graphics({ x: startX, y: startY });
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
    beam.setDepth(5); 
    this.loseBeams.push(beam); // Add to array for later cleanup
    return beam;
  }

  /**
   * Animates the lose scenario (lightning strikes).
   * Calls the provided callback when all animations are finished.
   */
  private animateLoseScenario(onCompleteCallback: () => void) {
    // Clear previous beams and timers immediately
    this.loseBeams.forEach(beam => beam.destroy());
    this.loseBeams = [];
    this.strikeTimers.forEach(timer => timer.remove());
    this.strikeTimers = [];

    const numberOfStrikes = 5; 
    const delayBetweenStrikes = 150; 
    const flashDuration = 100; 
    const beamLength = this.scale.height * 0.8; 
    const ufoTargets = [this.ufoDown, this.ufoDownLeft, this.ufoDownRight];
    const staggerOffset = 50; // Stagger start times slightly per UFO

    let maxOverallEndTime = 0; // Track when the very last flash disappears

    ufoTargets.forEach((ufo, index) => {
      if (ufo.alpha <= 0) return;

      const startX = ufo.x;
      const startY = ufo.y + (ufo.displayHeight * ufo.scaleY * 0.5);
      const currentUfoStartTime = index * staggerOffset;

      // Calculate when the last flash for *this* UFO will disappear
      const lastStrikeStartTime = currentUfoStartTime + (numberOfStrikes - 1) * delayBetweenStrikes;
      const lastStrikeEndTime = lastStrikeStartTime + flashDuration;
      maxOverallEndTime = Math.max(maxOverallEndTime, lastStrikeEndTime);

      // Create the timed event for strikes (logic remains the same)
      const timer = this.time.addEvent({
          delay: delayBetweenStrikes,
          callback: () => {
              const beam = this.createLightningBeam(startX, startY, beamLength);
              this.time.delayedCall(flashDuration, () => {
                  if (beam && beam.active) {
                      beam.destroy();
                  }
              }, [], this);
          },
          repeat: numberOfStrikes - 1, 
          startAt: currentUfoStartTime, // Use calculated start time
          callbackScope: this
      });
      this.strikeTimers.push(timer);
    });

    // Schedule the final callback after the last flash should have disappeared
    if (maxOverallEndTime > 0) {
        this.time.delayedCall(maxOverallEndTime + 100, onCompleteCallback, [], this); // Add small buffer
    } else {
        // If no UFOs were visible, call back immediately
        onCompleteCallback();
    }
  }

  private showEndScreen(win: boolean) {
    const { width, height } = this.scale;

    const createEndScreenElements = () => {
      // 1) dark overlay
      const overlay = this.add.graphics()
        .fillStyle(0x000000, 0.6)
        .fillRect(0, 0, width, height)
        .setDepth(20); 

      // 2) Determine message
      const msg = win ? 'You Have Uncovered the Pharaoh\'s Treasure!' : '😞 YOU LOSE 😞';

      const label = this.add.text(width/2, height/2, msg, {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width * 0.8 } 
      }).setOrigin(0.5).setDepth(21); 

      // 3) click to RESTART the scene
      this.input.once('pointerdown', () => {
        // Stop any ongoing sounds that might persist across restarts
        this.spinLoopSfx?.stop(); 
        
        // Remove timers explicitly (good practice even with restart)
        this.strikeTimers.forEach(timer => timer.remove());
        this.strikeTimers = [];
        
        // Restart the current scene
        this.scene.restart(); 
      });
    };

    // Trigger the appropriate animation and pass the function as the callback
    if (win) {
      this.loseBeams.forEach(beam => beam.destroy());
      this.loseBeams = [];
      this.strikeTimers.forEach(timer => timer.remove());
      this.strikeTimers = [];
      this.animateWinScenario(createEndScreenElements);
    } else {
      this.animateLoseScenario(createEndScreenElements);
    }
  } // End of showEndScreen

} // End of class
