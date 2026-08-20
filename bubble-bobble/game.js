// Bubble Bobble Mini Arcade - Complete Game Logic
(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI Elements
  const scoreDisplay = document.getElementById('score-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const stageDisplay = document.getElementById('stage-display');
  const livesDisplay = document.getElementById('lives-display');
  const overlayScreen = document.getElementById('overlay-screen');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const startBtn = document.getElementById('start-btn');
  const soundBtn = document.getElementById('sound-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const restartBtn = document.getElementById('restart-btn');

  // Game Constants
  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 480;
  const TILE_SIZE = 20; // 32 cols x 24 rows
  const COLS = 32;
  const ROWS = 24;
  const GRAVITY = 0.38;

  // Game State
  let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'STAGE_CLEAR', 'GAME_OVER', 'VICTORY'
  let score = 0;
  let highScore = parseInt(localStorage.getItem('bubble_bobble_high_score')) || 20000;
  let currentStageIndex = 0;
  let lives = 3;
  let stageTimer = 0;
  let isHurryUp = false;
  let transitionTimer = 0;

  // Input Handling
  const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false
  };

  // Keyboard Listeners
  window.addEventListener('keydown', (e) => {
    window.soundEngine.init();

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
    if (e.code === 'Space' || e.code === 'KeyZ') {
      keys.jump = true;
      if (gameState === 'PLAYING' && player.canJump && player.grounded) {
        player.vy = -player.jumpStrength;
        player.grounded = false;
        window.soundEngine.playJump();
      }
    }
    if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'Enter') {
      keys.shoot = true;
      if (gameState === 'PLAYING') {
        player.shoot();
      }
    }
    if (e.code === 'KeyP') {
      togglePause();
    }
    if (e.code === 'KeyM') {
      toggleSound();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
    if (e.code === 'Space' || e.code === 'KeyZ') keys.jump = false;
    if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'Enter') keys.shoot = false;
  });

  // Touch Controls Binding
  function bindTouch(btnId, keyName, isAction = false, actionFn = null) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const start = (e) => {
      e.preventDefault();
      window.soundEngine.init();
      keys[keyName] = true;
      if (isAction && actionFn) actionFn();
    };
    const end = (e) => {
      e.preventDefault();
      keys[keyName] = false;
    };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  }

  bindTouch('btn-left', 'left');
  bindTouch('btn-right', 'right');
  bindTouch('btn-down', 'down');
  bindTouch('btn-jump', 'jump', true, () => {
    if (gameState === 'PLAYING' && player.grounded) {
      player.vy = -player.jumpStrength;
      player.grounded = false;
      window.soundEngine.playJump();
    }
  });
  bindTouch('btn-shoot', 'shoot', true, () => {
    if (gameState === 'PLAYING') player.shoot();
  });

  // Stage Maps (1 = Solid Platform, 2 = Outer Wall, 0 = Empty)
  // Each map is 32 columns x 24 rows
  function createEmptyGrid() {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        // Outer boundaries
        if (c === 0 || c === COLS - 1) {
          grid[r][c] = 2; // Side walls
        } else if (r === 0) {
          // Top wall with middle gap for wrapping
          grid[r][c] = (c < 6 || c > 25) ? 2 : 0;
        } else if (r === ROWS - 1) {
          // Bottom floor with middle gap for wrapping
          grid[r][c] = (c < 6 || c > 25) ? 2 : 0;
        } else {
          grid[r][c] = 0;
        }
      }
    }
    return grid;
  }

  const STAGES = [
    // STAGE 1: Easy beginner stage
    {
      title: "STAGE 1",
      brickColor: "#00cc66",
      brickPattern: "classic",
      enemies: [
        { x: 200, y: 120, vx: 1.5, type: 'zenchan' },
        { x: 440, y: 120, vx: -1.5, type: 'zenchan' }
      ],
      setup: () => {
        const grid = createEmptyGrid();
        // Platforms
        for (let c = 4; c < 28; c++) grid[19][c] = 1;
        for (let c = 6; c < 26; c++) grid[14][c] = 1;
        for (let c = 8; c < 24; c++) grid[9][c] = 1;
        return grid;
      }
    },
    // STAGE 2: Shelved platforms
    {
      title: "STAGE 2",
      brickColor: "#0099ff",
      brickPattern: "cyan",
      enemies: [
        { x: 120, y: 80, vx: 1.8, type: 'zenchan' },
        { x: 500, y: 80, vx: -1.8, type: 'zenchan' },
        { x: 320, y: 200, vx: 1.8, type: 'zenchan' }
      ],
      setup: () => {
        const grid = createEmptyGrid();
        for (let c = 4; c < 14; c++) grid[19][c] = 1;
        for (let c = 18; c < 28; c++) grid[19][c] = 1;
        for (let c = 8; c < 24; c++) grid[15][c] = 1;
        for (let c = 4; c < 14; c++) grid[11][c] = 1;
        for (let c = 18; c < 28; c++) grid[11][c] = 1;
        for (let c = 10; c < 22; c++) grid[7][c] = 1;
        return grid;
      }
    },
    // STAGE 3: Central Pyramid & Columns
    {
      title: "STAGE 3",
      brickColor: "#ff9900",
      brickPattern: "orange",
      enemies: [
        { x: 140, y: 100, vx: 2.0, type: 'zenchan' },
        { x: 480, y: 100, vx: -2.0, type: 'zenchan' },
        { x: 300, y: 60, vx: 2.0, type: 'zenchan' },
        { x: 320, y: 280, vx: -2.0, type: 'zenchan' }
      ],
      setup: () => {
        const grid = createEmptyGrid();
        for (let c = 4; c < 28; c++) grid[20][c] = 1;
        for (let c = 6; c < 13; c++) grid[16][c] = 1;
        for (let c = 19; c < 26; c++) grid[16][c] = 1;
        for (let c = 12; c < 20; c++) grid[13][c] = 1;
        for (let c = 8; c < 15; c++) grid[9][c] = 1;
        for (let c = 17; c < 24; c++) grid[9][c] = 1;
        for (let c = 13; c < 19; c++) grid[6][c] = 1;
        return grid;
      }
    },
    // STAGE 4: Pocket maze with bubble chimneys
    {
      title: "STAGE 4",
      brickColor: "#ff3399",
      brickPattern: "pink",
      enemies: [
        { x: 100, y: 100, vx: 2.2, type: 'zenchan' },
        { x: 520, y: 100, vx: -2.2, type: 'zenchan' },
        { x: 200, y: 220, vx: 2.2, type: 'zenchan' },
        { x: 420, y: 220, vx: -2.2, type: 'zenchan' }
      ],
      setup: () => {
        const grid = createEmptyGrid();
        for (let c = 3; c < 29; c++) grid[20][c] = 1;
        for (let c = 6; c < 16; c++) grid[16][c] = 1;
        for (let c = 16; c < 26; c++) grid[16][c] = 1;
        for (let c = 3; c < 12; c++) grid[12][c] = 1;
        for (let c = 20; c < 29; c++) grid[12][c] = 1;
        for (let c = 10; c < 22; c++) grid[8][c] = 1;
        for (let c = 4; c < 28; c++) grid[4][c] = 1;
        return grid;
      }
    },
    // STAGE 5: Boss/Master Stage
    {
      title: "FINAL STAGE",
      brickColor: "#cc33ff",
      brickPattern: "purple",
      enemies: [
        { x: 100, y: 80, vx: 2.4, type: 'zenchan' },
        { x: 520, y: 80, vx: -2.4, type: 'zenchan' },
        { x: 200, y: 160, vx: 2.4, type: 'zenchan' },
        { x: 420, y: 160, vx: -2.4, type: 'zenchan' },
        { x: 310, y: 60, vx: 2.6, type: 'zenchan' }
      ],
      setup: () => {
        const grid = createEmptyGrid();
        for (let c = 2; c < 30; c++) grid[21][c] = 1;
        for (let c = 4; c < 12; c++) grid[17][c] = 1;
        for (let c = 20; c < 28; c++) grid[17][c] = 1;
        for (let c = 12; c < 20; c++) grid[14][c] = 1;
        for (let c = 4; c < 13; c++) grid[10][c] = 1;
        for (let c = 19; c < 28; c++) grid[10][c] = 1;
        for (let c = 10; c < 22; c++) grid[6][c] = 1;
        return grid;
      }
    }
  ];

  let currentGrid = [];
  let currentEnemies = [];
  let bubbles = [];
  let items = [];
  let particles = [];
  let popups = [];

  // Player Object (Bub)
  const player = {
    x: 80,
    y: 380,
    w: 24,
    h: 24,
    vx: 0,
    vy: 0,
    speed: 3.2,
    jumpStrength: 8.5,
    facing: 1, // 1 = right, -1 = left
    grounded: false,
    shootCooldown: 0,
    mouthTimer: 0,
    invincibleTimer: 0,
    animFrame: 0,
    animTimer: 0,

    reset(x = 80, y = 380) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.grounded = false;
      this.invincibleTimer = 180; // 3 seconds invulnerability
      this.mouthTimer = 0;
    },

    shoot() {
      if (this.shootCooldown > 0) return;
      this.shootCooldown = 16;
      this.mouthTimer = 12;

      // Spawn bubble in front
      const bx = this.facing === 1 ? this.x + this.w + 2 : this.x - 22;
      const by = this.y + 2;
      bubbles.push(new Bubble(bx, by, this.facing));
      window.soundEngine.playShoot();
    },

    update() {
      // Cooldowns
      if (this.shootCooldown > 0) this.shootCooldown--;
      if (this.mouthTimer > 0) this.mouthTimer--;
      if (this.invincibleTimer > 0) this.invincibleTimer--;

      // Horizontal movement
      if (keys.left) {
        this.vx = -this.speed;
        this.facing = -1;
      } else if (keys.right) {
        this.vx = this.speed;
        this.facing = 1;
      } else {
        this.vx = 0;
      }

      // Animation
      if (this.vx !== 0) {
        this.animTimer++;
        if (this.animTimer > 6) {
          this.animFrame = (this.animFrame + 1) % 4;
          this.animTimer = 0;
        }
      } else {
        this.animFrame = 0;
      }

      // Gravity
      this.vy += GRAVITY;
      if (this.vy > 9) this.vy = 9;

      // Move X & check wall collision
      this.x += this.vx;
      this.checkHorizontalCollisions();

      // Move Y & check platform collision
      this.y += this.vy;
      this.checkVerticalCollisions();

      // Screen wrapping (Bottom -> Top, Top -> Bottom)
      if (this.y > CANVAS_HEIGHT + 20) {
        this.y = -20;
      } else if (this.y < -30) {
        this.y = CANVAS_HEIGHT;
      }

      // Bubble Bouncing (Jumping onto bubbles)
      for (const b of bubbles) {
        if (!b.popped && this.vy > 0 && this.y + this.h >= b.y && this.y + this.h <= b.y + 14 &&
            this.x + this.w > b.x - 4 && this.x < b.x + b.r * 2 + 4) {
          // Bounce!
          this.vy = keys.jump ? -player.jumpStrength * 1.15 : -player.jumpStrength * 0.7;
          this.grounded = false;
          window.soundEngine.playJump();
          break;
        }
      }
    },

    checkHorizontalCollisions() {
      // Keep inside outer walls
      const leftCol = Math.floor(this.x / TILE_SIZE);
      const rightCol = Math.floor((this.x + this.w) / TILE_SIZE);
      const topRow = Math.floor(this.y / TILE_SIZE);
      const botRow = Math.floor((this.y + this.h - 2) / TILE_SIZE);

      for (let r = topRow; r <= botRow; r++) {
        if (r < 0 || r >= ROWS) continue;
        if (currentGrid[r] && currentGrid[r][leftCol] === 2) {
          this.x = (leftCol + 1) * TILE_SIZE;
        }
        if (currentGrid[r] && currentGrid[r][rightCol] === 2) {
          this.x = rightCol * TILE_SIZE - this.w;
        }
      }
    },

    checkVerticalCollisions() {
      this.grounded = false;
      const prevY = this.y - this.vy;

      const leftCol = Math.floor((this.x + 4) / TILE_SIZE);
      const rightCol = Math.floor((this.x + this.w - 4) / TILE_SIZE);
      const botRow = Math.floor((this.y + this.h) / TILE_SIZE);

      // Dropping through platform with Down + Jump
      const isDroppingDown = keys.down && keys.jump;

      // Platform check
      if (this.vy >= 0 && !isDroppingDown) {
        for (let c = leftCol; c <= rightCol; c++) {
          if (botRow >= 0 && botRow < ROWS && currentGrid[botRow]) {
            const tile = currentGrid[botRow][c];
            if ((tile === 1 || tile === 2) && prevY + this.h <= botRow * TILE_SIZE + 8) {
              this.y = botRow * TILE_SIZE - this.h;
              this.vy = 0;
              this.grounded = true;
              break;
            }
          }
        }
      }
    },

    draw() {
      if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 6) % 2 === 0) {
        return; // Flash effect
      }

      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      if (this.facing === -1) ctx.scale(-1, 1);

      // Draw cute Bub (Green Dinosaur)
      // Body
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.roundRect(-10, -10, 20, 20, 6);
      ctx.fill();

      // Belly (Yellow)
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.roundRect(0, -2, 8, 11, 3);
      ctx.fill();

      // Back Spines (Orange)
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-14, -5);
      ctx.lineTo(-10, -2);
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, 3);
      ctx.lineTo(-10, 6);
      ctx.fill();

      // Tail
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.moveTo(-9, 4);
      ctx.lineTo(-15, 8);
      ctx.lineTo(-9, 10);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -8, 6, 7);
      ctx.fillStyle = '#000000';
      ctx.fillRect(5, -6, 3, 4);

      // Mouth / Snout
      if (this.mouthTimer > 0) {
        // Open mouth
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(8, 2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#00c853';
        ctx.fillRect(7, -1, 4, 4);
      }

      // Feet (Animated)
      ctx.fillStyle = '#ff6d00';
      const legOffset = this.vx !== 0 ? (this.animFrame % 2 === 0 ? 2 : -2) : 0;
      ctx.fillRect(-6 + legOffset, 10, 6, 4);
      ctx.fillRect(2 - legOffset, 10, 6, 4);

      // Cheeks (Pink blush)
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(1, 1, 4, 3);

      ctx.restore();
    }
  };

  // Bubble Class
  class Bubble {
    constructor(x, y, dir) {
      this.x = x;
      this.y = y;
      this.r = 12;
      this.vx = dir * 5.5;
      this.vy = -0.3;
      this.life = 480; // 8 seconds
      this.shootPhase = 20; // Fast initial forward thrust
      this.trappedEnemy = null;
      this.popped = false;
      this.wobble = Math.random() * Math.PI * 2;
    }

    update() {
      if (this.popped) return;
      this.life--;
      this.wobble += 0.08;

      if (this.shootPhase > 0) {
        this.shootPhase--;
        this.x += this.vx;
        this.vx *= 0.92;
      } else {
        // Float upward and drift slightly towards center
        this.vy = -0.7;
        this.y += this.vy;
        this.x += Math.sin(this.wobble) * 0.6;

        // Keep inside boundaries
        if (this.x < 24) this.x = 24;
        if (this.x > CANVAS_WIDTH - 44) this.x = CANVAS_WIDTH - 44;
      }

      // Screen wrapping
      if (this.y < -20) {
        this.y = CANVAS_HEIGHT + 10;
      }

      // Check collision with untrapped enemies
      if (!this.trappedEnemy) {
        for (const e of currentEnemies) {
          if (!e.trapped && !e.dead) {
            const dist = Math.hypot((this.x + this.r) - (e.x + e.w / 2), (this.y + this.r) - (e.y + e.h / 2));
            if (dist < this.r + e.w / 2) {
              this.trappedEnemy = e;
              e.trapped = true;
              e.bubble = this;
              window.soundEngine.playTrap();
              break;
            }
          }
        }
      }

      // Check collision with Player (Pop bubble)
      const pDist = Math.hypot((this.x + this.r) - (player.x + player.w / 2), (this.y + this.r) - (player.y + player.h / 2));
      if (pDist < this.r + player.w / 2) {
        this.pop(true);
      }

      // Natural pop when expired
      if (this.life <= 0) {
        this.pop(false);
      }
    }

    pop(byPlayer = false) {
      if (this.popped) return;
      this.popped = true;
      window.soundEngine.playPop();

      // Create burst particles
      for (let i = 0; i < 8; i++) {
        particles.push(new Particle(this.x + this.r, this.y + this.r, '#80d8ff'));
      }

      if (this.trappedEnemy) {
        if (byPlayer) {
          // Defeat enemy!
          this.trappedEnemy.dead = true;
          this.trappedEnemy.trapped = false;
          addScore(500, this.x, this.y);

          // Spawn fruit item!
          items.push(new Item(this.x, this.y));
        } else {
          // Escapes enraged!
          this.trappedEnemy.trapped = false;
          this.trappedEnemy.enraged = true;
          this.trappedEnemy.speed = 2.8;
        }
      }
    }

    draw() {
      if (this.popped) return;
      ctx.save();

      const cx = this.x + this.r;
      const cy = this.y + this.r;

      // Color warning when close to popping
      let bubbleColor = 'rgba(100, 220, 255, 0.45)';
      let borderColor = '#66fcf1';
      if (this.life < 120 && Math.floor(this.life / 6) % 2 === 0) {
        bubbleColor = 'rgba(255, 80, 80, 0.55)';
        borderColor = '#ff3366';
      }

      // Bubble Body
      ctx.fillStyle = bubbleColor;
      ctx.beginPath();
      ctx.arc(cx, cy, this.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Highlight reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw trapped enemy inside
      if (this.trappedEnemy) {
        this.trappedEnemy.drawInsideBubble(cx, cy);
      }

      ctx.restore();
    }
  }

  // Enemy Class (Zen-chan)
  class Enemy {
    constructor(x, y, vx, type = 'zenchan') {
      this.x = x;
      this.y = y;
      this.w = 22;
      this.h = 22;
      this.vx = vx;
      this.vy = 0;
      this.speed = Math.abs(vx);
      this.dir = vx >= 0 ? 1 : -1;
      this.type = type;
      this.grounded = false;
      this.trapped = false;
      this.enraged = false;
      this.dead = false;
      this.jumpTimer = Math.floor(Math.random() * 60) + 40;
      this.animFrame = 0;
      this.animTimer = 0;
      this.bubble = null;
    }

    update() {
      if (this.dead) return;

      if (this.trapped) {
        if (this.bubble) {
          this.x = this.bubble.x;
          this.y = this.bubble.y;
        }
        return;
      }

      // Enraged speed boost
      const curSpeed = (this.enraged || isHurryUp) ? this.speed * 1.5 : this.speed;

      this.vx = this.dir * curSpeed;

      // Jump timer
      this.jumpTimer--;
      if (this.jumpTimer <= 0 && this.grounded) {
        this.vy = -7.5;
        this.grounded = false;
        this.jumpTimer = Math.floor(Math.random() * 90) + 60;
      }

      // Gravity
      this.vy += GRAVITY;
      if (this.vy > 8) this.vy = 8;

      // Move X
      this.x += this.vx;
      this.checkHorizontalCollisions();

      // Move Y
      this.y += this.vy;
      this.checkVerticalCollisions();

      // Screen wrapping
      if (this.y > CANVAS_HEIGHT + 20) {
        this.y = -20;
      }

      // Animation
      this.animTimer++;
      if (this.animTimer > 6) {
        this.animFrame = (this.animFrame + 1) % 2;
        this.animTimer = 0;
      }

      // Collide with player
      if (player.invincibleTimer <= 0 && !this.trapped && !this.dead) {
        const dist = Math.hypot((this.x + this.w / 2) - (player.x + player.w / 2), (this.y + this.h / 2) - (player.y + player.h / 2));
        if (dist < 18) {
          playerHit();
        }
      }
    }

    checkHorizontalCollisions() {
      const leftCol = Math.floor(this.x / TILE_SIZE);
      const rightCol = Math.floor((this.x + this.w) / TILE_SIZE);
      const midRow = Math.floor((this.y + this.h / 2) / TILE_SIZE);

      if (midRow >= 0 && midRow < ROWS && currentGrid[midRow]) {
        if (currentGrid[midRow][leftCol] === 2) {
          this.dir = 1;
          this.x = (leftCol + 1) * TILE_SIZE;
        }
        if (currentGrid[midRow][rightCol] === 2) {
          this.dir = -1;
          this.x = rightCol * TILE_SIZE - this.w;
        }
      }
    }

    checkVerticalCollisions() {
      this.grounded = false;
      const prevY = this.y - this.vy;

      const leftCol = Math.floor((this.x + 4) / TILE_SIZE);
      const rightCol = Math.floor((this.x + this.w - 4) / TILE_SIZE);
      const botRow = Math.floor((this.y + this.h) / TILE_SIZE);

      if (this.vy >= 0) {
        for (let c = leftCol; c <= rightCol; c++) {
          if (botRow >= 0 && botRow < ROWS && currentGrid[botRow]) {
            const tile = currentGrid[botRow][c];
            if ((tile === 1 || tile === 2) && prevY + this.h <= botRow * TILE_SIZE + 8) {
              this.y = botRow * TILE_SIZE - this.h;
              this.vy = 0;
              this.grounded = true;
              break;
            }
          }
        }
      }
    }

    draw() {
      if (this.dead || this.trapped) return;
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      if (this.dir === -1) ctx.scale(-1, 1);

      const isAngry = this.enraged || isHurryUp;

      // Zen-chan Body
      ctx.fillStyle = isAngry ? '#ff1744' : '#ff9100';
      ctx.beginPath();
      ctx.roundRect(-9, -9, 18, 18, 4);
      ctx.fill();

      // Face
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -7, 7, 7);
      ctx.fillStyle = '#000000';
      ctx.fillRect(isAngry ? 2 : 1, -5, 3, 5);

      // Wind-up Key on back
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-14, -4, 5, 8);
      ctx.fillRect(-12, -7, 2, 3);

      // Feet
      ctx.fillStyle = '#d50000';
      const fOffset = this.animFrame === 0 ? 1 : -1;
      ctx.fillRect(-7 + fOffset, 9, 6, 3);
      ctx.fillRect(1 - fOffset, 9, 6, 3);

      ctx.restore();
    }

    drawInsideBubble(cx, cy) {
      ctx.save();
      ctx.translate(cx, cy);
      // Small wiggling trapped Zen-chan
      ctx.fillStyle = this.enraged ? '#ff1744' : '#ff9100';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Big dizzy eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -4, 4, 4);
      ctx.fillRect(1, -4, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-3, -3, 2, 2);
      ctx.fillRect(2, -3, 2, 2);

      ctx.restore();
    }
  }

  // Fruit / Item Class
  class Item {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = 20;
      this.h = 20;
      this.vy = -3;
      this.vx = (Math.random() - 0.5) * 2;
      this.life = 600; // 10s
      this.types = ['apple', 'banana', 'orange', 'gem', 'cake'];
      this.type = this.types[Math.floor(Math.random() * this.types.length)];
      this.scoreVal = this.type === 'gem' ? 1000 : (this.type === 'cake' ? 700 : (this.type === 'banana' ? 300 : 200));
    }

    update() {
      this.life--;
      this.vy += GRAVITY * 0.8;
      this.x += this.vx;
      this.y += this.vy;

      // Platform bounce
      const leftCol = Math.floor((this.x + 4) / TILE_SIZE);
      const rightCol = Math.floor((this.x + this.w - 4) / TILE_SIZE);
      const botRow = Math.floor((this.y + this.h) / TILE_SIZE);

      if (this.vy > 0 && botRow >= 0 && botRow < ROWS && currentGrid[botRow]) {
        for (let c = leftCol; c <= rightCol; c++) {
          if (currentGrid[botRow][c] === 1 || currentGrid[botRow][c] === 2) {
            this.y = botRow * TILE_SIZE - this.h;
            this.vy = -this.vy * 0.5; // Bounce dampening
            this.vx *= 0.8;
            break;
          }
        }
      }

      // Check collision with player
      const dist = Math.hypot((this.x + 10) - (player.x + player.w / 2), (this.y + 10) - (player.y + player.h / 2));
      if (dist < 20) {
        addScore(this.scoreVal, this.x, this.y);
        window.soundEngine.playItem();
        this.life = 0; // collected
      }
    }

    draw() {
      if (this.life <= 0) return;
      if (this.life < 120 && Math.floor(this.life / 6) % 2 === 0) return;

      ctx.save();
      ctx.translate(this.x + 10, this.y + 10);

      if (this.type === 'apple') {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#76ff03';
        ctx.fillRect(-1, -10, 3, 3);
      } else if (this.type === 'banana') {
        ctx.fillStyle = '#ffd600';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0.3, Math.PI * 0.9);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ffd600';
        ctx.stroke();
      } else if (this.type === 'gem') {
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
      } else if (this.type === 'cake') {
        ctx.fillStyle = '#f50057';
        ctx.fillRect(-8, -4, 16, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -8, 16, 4);
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-2, -11, 4, 3);
      } else {
        ctx.fillStyle = '#ff9100';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Particle Class
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 6;
      this.color = color;
      this.life = 24;
      this.size = Math.random() * 4 + 2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life--;
    }

    draw() {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }

  // Floating Score Popup Class
  class ScorePopup {
    constructor(text, x, y) {
      this.text = text;
      this.x = x;
      this.y = y;
      this.life = 40;
    }

    update() {
      this.y -= 0.8;
      this.life--;
    }

    draw() {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(this.text, this.x, this.y);
    }
  }

  // Score System
  function addScore(pts, x, y) {
    score += pts;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('bubble_bobble_high_score', highScore);
    }
    updateScoreBoard();
    if (x !== undefined && y !== undefined) {
      popups.push(new ScorePopup(`+${pts}`, x, y));
    }
  }

  function updateScoreBoard() {
    scoreDisplay.innerText = String(score).padStart(6, '0');
    highScoreDisplay.innerText = String(highScore).padStart(6, '0');
    stageDisplay.innerText = `${String(currentStageIndex + 1).padStart(2, '0')} / 05`;

    let lifeHtml = '';
    for (let i = 0; i < lives; i++) {
      lifeHtml += '<span class="life-icon">🦖</span>';
    }
    livesDisplay.innerHTML = lifeHtml || '<span style="color:#666">NONE</span>';
  }

  // Player Hurt / Life Lost
  function playerHit() {
    lives--;
    updateScoreBoard();
    window.soundEngine.playHurt();

    // Death particles
    for (let i = 0; i < 16; i++) {
      particles.push(new Particle(player.x + 12, player.y + 12, '#ff1744'));
    }

    if (lives <= 0) {
      gameOver();
    } else {
      player.reset(80, 380);
    }
  }

  // Stage Management
  function loadStage(index) {
    currentStageIndex = index;
    const stage = STAGES[index];
    currentGrid = stage.setup();

    // Reset entities
    bubbles = [];
    items = [];
    particles = [];
    popups = [];
    stageTimer = 0;
    isHurryUp = false;

    // Load enemies
    currentEnemies = stage.enemies.map(e => new Enemy(e.x, e.y, e.vx, e.type));

    // Reset player position
    player.reset(80, 380);
    updateScoreBoard();
  }

  function checkStageCompletion() {
    const allDefeated = currentEnemies.every(e => e.dead);
    if (allDefeated && gameState === 'PLAYING') {
      gameState = 'STAGE_CLEAR';
      transitionTimer = 120; // 2s pause
      window.soundEngine.playStageClear();
    }
  }

  // Game Flow Controls
  function startGame() {
    score = 0;
    lives = 3;
    currentStageIndex = 0;
    loadStage(0);
    gameState = 'PLAYING';
    overlayScreen.classList.add('hidden');
    window.soundEngine.startBGM();
  }

  function nextStage() {
    if (currentStageIndex + 1 < STAGES.length) {
      loadStage(currentStageIndex + 1);
      gameState = 'PLAYING';
    } else {
      victory();
    }
  }

  function gameOver() {
    gameState = 'GAME_OVER';
    window.soundEngine.stopBGM();
    window.soundEngine.playGameOver();
    overlayTitle.innerText = 'GAME OVER';
    overlayTitle.style.color = '#ff1744';
    overlaySubtitle.innerText = `FINAL SCORE: ${score}`;
    startBtn.innerText = 'TRY AGAIN';
    overlayScreen.classList.remove('hidden');
  }

  function victory() {
    gameState = 'VICTORY';
    window.soundEngine.stopBGM();
    window.soundEngine.playStageClear();
    overlayTitle.innerText = 'ALL CLEAR!!';
    overlayTitle.style.color = '#ffd700';
    overlaySubtitle.innerText = `CONGRATULATIONS! SCORE: ${score}`;
    startBtn.innerText = 'PLAY AGAIN';
    overlayScreen.classList.remove('hidden');
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseBtn.innerText = '▶ 계속하기';
      overlayTitle.innerText = 'PAUSED';
      overlayTitle.style.color = '#ffeb3b';
      overlaySubtitle.innerText = 'GAME IS PAUSED';
      startBtn.innerText = 'RESUME';
      overlayScreen.classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      pauseBtn.innerText = '⏸ 일시정지';
      overlayScreen.classList.add('hidden');
    }
  }

  function toggleSound() {
    const isEnabled = window.soundEngine.toggleSound();
    soundBtn.innerText = isEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
  }

  // Button Listeners
  startBtn.addEventListener('click', () => {
    if (gameState === 'PAUSED') {
      togglePause();
    } else {
      startGame();
    }
  });

  soundBtn.addEventListener('click', toggleSound);
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', () => {
    startGame();
  });

  // Map Drawing
  function drawMap() {
    const stage = STAGES[currentStageIndex];
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = currentGrid[r][c];
        if (tile === 1 || tile === 2) {
          const tx = c * TILE_SIZE;
          const ty = r * TILE_SIZE;

          // Brick Body
          ctx.fillStyle = tile === 2 ? '#2a3b4c' : stage.brickColor;
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

          // Top highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(tx, ty, TILE_SIZE, 3);
          ctx.fillRect(tx, ty, 3, TILE_SIZE);

          // Bottom shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(tx, ty + TILE_SIZE - 3, TILE_SIZE, 3);
          ctx.fillRect(tx + TILE_SIZE - 3, ty, 3, TILE_SIZE);
        }
      }
    }
  }

  // Main Game Loop
  function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (gameState === 'PLAYING') {
      // Stage Timer & Hurry Up
      stageTimer++;
      if (stageTimer > 2400) { // ~40 seconds
        isHurryUp = true;
      }

      // Update entities
      player.update();
      currentEnemies.forEach(e => e.update());
      bubbles.forEach(b => b.update());
      items.forEach(item => item.update());
      particles.forEach(p => p.update());
      popups.forEach(pop => pop.update());

      // Filter out dead particles/bubbles/items
      bubbles = bubbles.filter(b => !b.popped);
      items = items.filter(i => i.life > 0);
      particles = particles.filter(p => p.life > 0);
      popups = popups.filter(p => p.life > 0);

      checkStageCompletion();
    } else if (gameState === 'STAGE_CLEAR') {
      transitionTimer--;
      particles.forEach(p => p.update());
      particles = particles.filter(p => p.life > 0);
      if (transitionTimer <= 0) {
        nextStage();
      }
    }

    // Render Everything
    drawMap();

    bubbles.forEach(b => b.draw());
    items.forEach(item => item.draw());
    currentEnemies.forEach(e => e.draw());
    player.draw();
    particles.forEach(p => p.draw());
    popups.forEach(pop => pop.draw());

    // Hurry Up Banner
    if (isHurryUp && Math.floor(Date.now() / 300) % 2 === 0) {
      ctx.fillStyle = '#ff1744';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HURRY UP!', CANVAS_WIDTH / 2, 40);
      ctx.textAlign = 'left';
    }

    // Stage Clear Overlay
    if (gameState === 'STAGE_CLEAR') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#66ff66';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE CLEAR!!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.textAlign = 'left';
    }
  }

  // Initialize
  updateScoreBoard();
  loadStage(0);
  gameLoop();
})();
