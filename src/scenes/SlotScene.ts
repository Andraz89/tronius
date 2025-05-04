// src/scenes/SlotScene.ts
import Phaser from 'phaser';
import { SymbolKey, ALL_SYMBOLS } from '../types/symbols';
import UIButton from '../ui/Button';
import Animations from './Animations';

export default class SlotScene extends Phaser.Scene {
  private reels: Phaser.GameObjects.Container[] = [];
  private isSpinning = false;
  private checkingResult: string[] = [];
  // Sounds
  private spinLoopSfx!: Phaser.Sound.BaseSound;
  private ufoLoopSfx!: Phaser.Sound.BaseSound;
  private thunderSfx!: Phaser.Sound.BaseSound;
  private backgroundMusic!: Phaser.Sound.BaseSound;
  private coinsSuccess!: Phaser.Sound.BaseSound;
  // Backgrounds
  private bg!: Phaser.GameObjects.Image;
  private bgNight!: Phaser.GameObjects.Image;
  // UFOs
  private ufoDown!: Phaser.GameObjects.Image;
  private ufoDownLeft!: Phaser.GameObjects.Image;
  private ufoDownRight!: Phaser.GameObjects.Image;
  // Lose beams
  private loseBeams: Phaser.GameObjects.Graphics[] = []; // Added for lose beams
  // Strike timers
  private strikeTimers: Phaser.Time.TimerEvent[] = []; // Added for lightning strike timers
  // Intro text
  private introText!: Phaser.GameObjects.Text;
  private introPanelVisible = true;
  // Reel backgrounds
  private reelBackgrounds: Phaser.GameObjects.Graphics[] = []; // To hold background references
  private winLineIndicators: Phaser.GameObjects.Graphics[] = []; // To hold win line indicators
  // Lives
  private lives = 3;
  private livesText!: Phaser.GameObjects.Text;
  // Animations
  private animations!: Animations;
  
  constructor() { super({ key: 'SlotScene' }); }

  preload() {
    this.lives = 5;
    this.isSpinning = false;
    this.introPanelVisible = true;
    this.load.audio('spinLoop', 'assets/audio/slot-machine-reels-sound.mp3');
    this.load.audio('ufoLoop', 'assets/audio/ufo-sound-effect.mp3');
    this.load.audio('thunder', 'assets/audio/thunder.mp3');
    this.load.audio('backgroundMusic', 'assets/audio/desert-echoes.mp3');
    this.load.audio('coinsSuccess', 'assets/audio/coins-success.mp3');
    // Load your 5 symbol images
    ALL_SYMBOLS.forEach(key => {
      this.load.image(key, `assets/symbols/${key}.png`);
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
    // Lives
    this.lives = 5;
    this.isSpinning = false;
    
    // Initialize animations FIRST - before anything tries to use it
    this.animations = new Animations(this);
    
    // Sounds
    this.spinLoopSfx  = this.sound.add('spinLoop',  { loop: true, volume: 0.5 });
    this.ufoLoopSfx = this.sound.add('ufoLoop', { loop: false, volume: 0.5 });
    this.thunderSfx = this.sound.add('thunder', { loop: false, volume: 0.5 });
    this.backgroundMusic = this.sound.add('backgroundMusic', { loop: true, volume: 0.5 });
    this.coinsSuccess = this.sound.add('coinsSuccess', { loop: false, volume: 0.5 });
    this.backgroundMusic.addMarker({
      name: 'backgroundClip',
      start: 7.0,      
    });
    this.backgroundMusic.stop();
    this.backgroundMusic.play('backgroundClip');

    this.thunderSfx.addMarker({
      name: 'thunderCut',
      start: 1.0,     
      duration: 5.0, 
    });
    // Backgrounds
    const { width, height } = this.scale;
    this.bg = this.add
      .image(width/2, height/2, 'bg_day')
      .setDepth(-2);
    this.bgNight = this.add
      .image(width/2, height/2, 'bg_night')
      .setAlpha(0)
      .setDepth(-1);

    // UFOs
    this.ufoDown = this.add
      .image(width/2, 0, 'ufo-down')
      .setAlpha(0)
      .setDepth(0);
    // UFOs
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
    this.spinLoopSfx.addMarker({
      name: 'fastPart',
      start: 3.0,     
      duration: 6.0, 
    });


    // --- Create Intro Panel ---
    const introMessage = `Welcome to Pharaoh's Final Riddle, brave adventurer!

Deep beneath the blazing desert sun, the ancient Pyramid stands…
But tonight, its secrets are threatened by otherworldly invaders.

You have 5 spins to repel the alien force and claim the Pharaoh's lost treasure.`;

    this.introText = this.add.text(width / 2, height / 2 - 50, introMessage, {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 20, y: 10 },
        align: 'center',
        wordWrap: { width: width * 0.7 }
    }).setOrigin(0.5).setDepth(10); // Ensure it's above reels initially

    // --- End Intro Panel ---

    // --- Add Lives Display ---
    this.livesText = this.add.text(width - 10, 10, `Spins: ${this.lives}`, {
        fontSize: '20px',
        color: '#FFD700', // Gold color
        align: 'right',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 5, y: 2 },
    }).setOrigin(1, 0).setDepth(15).setVisible(false); // Set initial visibility to false
    // --- End Lives Display ---

    this.createReels(); 
    this.createWinLines(); 

    // Create the spin button FIRST
    UIButton.create(this, 240, 580, 'spinBtn', 'Spin', () => this.spin());
    
    // THEN find it after it's been created
    const spinButton = this.children.list.find(
      child => child instanceof Phaser.GameObjects.Image && 
               child.texture.key === 'spinBtn'
    ) as Phaser.GameObjects.Image;
    
    // THEN add the pulse animation if the button was found
    if (spinButton) {
      this.animations.addButtonPulse(spinButton);
    } else {
      console.error("Spin button not found! Check UIButton.create implementation.");
    }
  }

  private createReels() {
    // --- Clear reel backgrounds array ---
    this.reelBackgrounds = [];
    // --- End clear ---
    // Create 3 reels
    const startX = 80;
    const symbolHeight = 128;
    const spacing = symbolHeight + 31;
    const reelViewHeight = symbolHeight * 3; // Height of the visible reel area (3 symbols)
    // Create 3 reels
    for (let col = 0; col < 3; col++) {
        const reelX = startX + col * spacing;
        const reelY = 200;
        const reel = this.add.container(reelX, reelY);
        reel.setVisible(false); // <<< HIDE REEL INITIALLY

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
        backgroundRect.setVisible(false); // <<< HIDE BACKGROUND INITIALLY
        this.reelBackgrounds.push(backgroundRect); // <<< STORE BACKGROUND REFERENCE

        // --- Mask Graphics ---
        const maskGraphics = this.add.graphics();
        // Use updated symbolHeight and reelViewHeight
        maskGraphics.fillRect(-symbolHeight / 2, -symbolHeight / 2, symbolHeight, reelViewHeight);
        // Position the mask graphics at the same world coordinates as the reel container
        maskGraphics.x = reelX;
        maskGraphics.y = reelY;
        // Make the mask graphics object itself invisible
        maskGraphics.setVisible(false); // Mask graphics itself is always invisible

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

  private createWinLines() {
    // Clear any existing win lines first
    this.winLineIndicators.forEach(line => line.destroy());
    this.winLineIndicators = [];
    
    const symbolHeight = 128;
    const startX = 80;
    const spacing = symbolHeight + 31;
    const reelY = 266; // Same as in createReels()
    
    // Create a single horizontal line across all reels at the middle row
    const highlightLineTop = this.add.graphics();
    highlightLineTop.lineStyle(3, 0xffd700, 1); // Gold color, 3px thick line
    
    // Calculate start and end points of the line
    const leftX = startX - symbolHeight / 2; // Left edge of first reel
    const rightX = startX + (spacing * 2) + symbolHeight / 2; // Right edge of last reel
    const middleY = reelY; // Center Y position - this is where the middle symbols appear
    
    // Draw a single horizontal line through the middle of all reels
    highlightLineTop.beginPath();
    highlightLineTop.moveTo(leftX, middleY);
    highlightLineTop.lineTo(rightX, middleY);
    highlightLineTop.strokePath();
    
    // Store reference
    highlightLineTop.setVisible(false); // Initially hidden
    this.winLineIndicators.push(highlightLineTop);
    
    // Add a subtle pulse animation

    const highlightLineBottom = this.add.graphics();
    highlightLineBottom.lineStyle(3, 0xffd700, 1); // Gold color, 3px thick line
    highlightLineBottom.beginPath();
    highlightLineBottom.moveTo(leftX, middleY + symbolHeight);
    highlightLineBottom.lineTo(rightX, middleY + symbolHeight);
    highlightLineBottom.strokePath();
    highlightLineBottom.setVisible(false); // Initially hidden
    this.winLineIndicators.push(highlightLineBottom);
    
    // Create the pulsing animation for the win lines
    this.animations.createWinLineAnimation(this.winLineIndicators);
  }

  private spin() {
    // --- Prevent spin if game over or already spinning ---
    if (this.isSpinning || this.lives <= 0) return;
    // --- End check ---

    // --- Handle First Spin ---
    if (this.introPanelVisible) {
        this.introText.setVisible(false); // Hide intro text
        this.reels.forEach(reel => reel.setVisible(true)); // Show reels
        this.reelBackgrounds.forEach(bg => bg.setVisible(true)); // Show reel backgrounds
        this.livesText.setVisible(true); // SHOW THE LIVES TEXT when first spinning
        this.winLineIndicators.forEach(line => line.setVisible(true)); // Show win line indicators
        this.introPanelVisible = false; // Mark intro as dismissed
    }
    // --- End Handle First Spin ---

    this.isSpinning = true; // Set spinning true *after* checks
    //this.backgroundMusic.stop();
    // Ensure checkingResult is reset correctly for the new spin
    this.checkingResult = new Array(this.reels.length).fill(undefined); 

    this.spinLoopSfx.play('fastPart');
    this.ufoLoopSfx.play();
    
    // Animate background change
    this.animations.animateBackgroundChange(this.bg, this.bgNight);
    
    // Animate UFOs
    this.animations.animateUfoEntrance(this.ufoDown, this.ufoDownLeft, this.ufoDownRight);

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
      const resultsReceived = this.checkingResult.filter(r => r !== undefined).length;

      if (resultsReceived === this.reels.length) {
          if (!this.isSpinning) return; // Should already be spinning, but safety check

          // Stop spin sound regardless of outcome here
          this.spinLoopSfx.stop();

          const hasError = this.checkingResult.some(r => typeof r === 'string' && r.startsWith('error'));

          if (hasError) {
              console.error("Spin completed with errors in reels:", this.checkingResult);
              this.lives = 0; // Treat error as game over
              this.livesText.setText('Spins: 0');
               // Directly show lose screen on error
              this.showEndScreenOverlay(false);
          } else {
              const allSame = this.checkingResult.every(k => k === this.checkingResult[0]);
              console.log(this.checkingResult); // Log results for debugging

              if (allSame) {
                  console.log('Win!');
                  // Win scenario: Animate win, then show win screen
                  const ufoTargets = [this.ufoDown, this.ufoDownLeft, this.ufoDownRight];
                  this.animations.animateWinScenario(
                    this.bgNight, 
                    this.bg, 
                    ufoTargets, 
                    () => this.showEndScreenOverlay(true),
                    this.coinsSuccess
                  );
              } else {
                  console.log('No win:', this.checkingResult);
                  this.lives--;
                  this.livesText.setText(`Spins: ${this.lives}`);

                  // Lose scenario: Animate loss (lightning)
                  const ufoTargets = [this.ufoDown, this.ufoDownLeft, this.ufoDownRight];
                  const newTimers = this.animations.animateLoseScenario(
                    ufoTargets,
                    this.thunderSfx,
                    this.loseBeams,
                    this.strikeTimers,
                    () => {
                      if (this.lives <= 0) {
                          // Game over after animation
                          this.showEndScreenOverlay(false);
                      } else {
                          // Show chances animation AFTER the lightning animation completes
                          this.animations.showChancesAnimation(this.lives, true);
                          // Life lost, but game continues
                          this.isSpinning = false; // Allow spinning again
                      }
                    },
                    (beam) => this.loseBeams.push(beam) // Track beams
                  );
                  
                  // Update timers with the new ones
                  this.strikeTimers = newTimers || [];
              }
          }
      }
  }

  private showEndScreenOverlay(win: boolean) {
    // --- Ensure spinning stops completely before showing overlay ---
    this.isSpinning = false;
    
    // Stop UFO hover effects
    const ufoTargets = [this.ufoDown, this.ufoDownLeft, this.ufoDownRight];
    this.animations.stopUfoHoverAnimations(ufoTargets);
    
    const { width, height } = this.scale;

    // Define Restart Logic first (used by overlay click)
    const restartGame = () => {
        console.log('Restarting the game...');
        
        // IMPORTANT: Stop all sounds in the sound manager
        this.sound.stopAll();
        
        // Remove timers explicitly
        this.strikeTimers.forEach(timer => timer.remove());
        this.strikeTimers = [];

        // Restart the current scene
        this.scene.restart();
    };

    // 1) Create a Rectangle instead of a Graphics object
    const overlay = this.add.rectangle(
        width / 2,   // x position (center)
        height / 2,  // y position (center)
        width,      // width to cover screen
        height,     // height to cover screen
        0x000000,   // color (black)
        0.7         // alpha (70% opaque)
    ).setDepth(20)
     .setOrigin(0.5); // Center origin
      
    // Explicitly enable input for both the overlay and the scene
    this.input.enabled = true;
    
    // 2) Determine message
    const msg = win ? 'You Have Uncovered the Pharaoh\'s Treasure!' : 'GAME OVER';

    const label = this.add.text(width/2, height/2 - 30, msg, { // Adjusted Y position slightly
      fontSize: '36px', // Larger font
      color: win ? '#FFD700' : '#FF4444', // Gold for win, Red for lose
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 25, y: 15 },
      align: 'center',
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5).setDepth(21); // Ensure text is above overlay

    // 3) Add "Click anywhere" text
    const instructionText = this.add.text(width / 2, height / 2 + 80, 'Click anywhere or press SPACE to play again', { 
        fontSize: '16px',
        color: '#ffffff',
        align: 'center'
    }).setOrigin(0.5).setDepth(21);

    // 4) Add multiple ways to restart the game
    
    // a) Make Rectangle interactive with a larger hit area
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    ).on('pointerdown', () => {
      console.log('Overlay clicked!');
      restartGame();
    });
    
    // b) Make SPACE key also restart the game
    this.input.keyboard?.on('keydown-SPACE', restartGame);
    
    // c) Make any mouse click restart (as a fallback)
    this.input.on('pointerdown', () => {
      console.log('Scene clicked!');
      restartGame();
    });
    
    // d) Make instruction text also interactive, for good measure
    instructionText.setInteractive().on('pointerdown', restartGame);
    
    // e) As an absolute last resort, add a DOM event listener
    if (typeof window !== 'undefined') {
      const domClickHandler = () => {
        console.log('DOM clicked!');
        restartGame();
        // Remove this listener after first use
        window.removeEventListener('click', domClickHandler);
      };
      window.addEventListener('click', domClickHandler);
      
      // Clean up DOM listener if scene is destroyed
      this.events.once('destroy', () => {
        window.removeEventListener('click', domClickHandler);
      });
    }

    console.log('End screen displayed - waiting for input to restart');
  } // End of showEndScreenOverlay
}
