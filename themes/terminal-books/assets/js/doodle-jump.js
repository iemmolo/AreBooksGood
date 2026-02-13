(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var SPRITE_SIZE = 16;
  var PIXEL_SCALE = 3;
  var RENDER_SIZE = SPRITE_SIZE * PIXEL_SCALE; // 48
  var ANIMATION_FPS = 4;

  var GRAVITY = 0.35;
  var BOUNCE_VEL = -10.5;
  var SPRING_VEL = -16;
  var JETPACK_VEL = -3;
  var JETPACK_DURATION = 90; // frames (~1.5s)
  var MAX_FALL = 10;
  var PLAYER_W = 36;
  var PLAYER_H = 36;

  var MOVE_SPEED = 4.5;
  var MOVE_FRICTION = 0.82;

  var PLAT_W = 68;
  var PLAT_H = 12;
  var PLAT_GAP_MIN = 35;
  var PLAT_GAP_MAX = 80;

  // Platform types
  var PLAT_NORMAL = 0;
  var PLAT_MOVING = 1;
  var PLAT_BREAKABLE = 2;
  var PLAT_VANISHING = 3;

  var MOVING_SPEED = 1.2;

  var COIN_RADIUS = 8;
  var JB_RADIUS = 11;
  var COIN_VALUE = 5;

  var ENEMY_SIZE = 28;
  var ENEMY_SCORE_THRESHOLD = 300;

  var STATS_KEY = 'doodle-jump-stats';
  var PET_KEY = 'arebooksgood-pet';

  // ── DOM refs ──────────────────────────────────
  var canvas = document.getElementById('dj-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var gameArea = document.getElementById('dj-game-area');

  var hudScore = document.getElementById('dj-score');
  var hudCoins = document.getElementById('dj-coins');
  var hudJB = document.getElementById('dj-jb');
  var hudBest = document.getElementById('dj-best');

  var startOverlay = document.getElementById('dj-start-overlay');
  var gameoverOverlay = document.getElementById('dj-gameover-overlay');
  var playBtn = document.getElementById('dj-play-btn');
  var retryBtn = document.getElementById('dj-retry-btn');
  var petPreview = document.getElementById('dj-pet-preview');

  var finalScore = document.getElementById('dj-final-score');
  var finalCoins = document.getElementById('dj-final-coins');
  var finalJB = document.getElementById('dj-final-jb');

  var statGames = document.getElementById('dj-stat-games');
  var statBest = document.getElementById('dj-stat-best');
  var statCoins = document.getElementById('dj-stat-coins');
  var statJB = document.getElementById('dj-stat-jb');
  var statHeight = document.getElementById('dj-stat-height');
  var resetStatsBtn = document.getElementById('dj-reset-stats');

  // ── Dynamic canvas sizing ─────────────────────
  var CANVAS_W = 400;
  var CANVAS_H = 600;
  var dpr = window.devicePixelRatio || 1;

  function sizeCanvas() {
    gameArea.style.width = '';
    var containerW = gameArea.parentElement.clientWidth || 400;
    var maxH = window.innerHeight - 200;
    if (maxH < 300) maxH = 300;

    var w = Math.min(containerW, 800);
    var h = Math.round(w * 1.5);

    if (h > maxH) {
      h = maxH;
      w = Math.round(h / 1.5);
    }

    CANVAS_W = w;
    CANVAS_H = h;
    gameArea.style.width = w + 'px';

    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  sizeCanvas();

  // ── Game state ────────────────────────────────
  // World coords: Y increases downward (standard canvas).
  // Player goes UP = decreasing Y.
  // cameraY = world Y of the top edge of the visible area.
  var state = 'idle'; // idle | playing | dead
  var playerX = 0;
  var playerY = 0;
  var playerVelX = 0;
  var playerVelY = 0;
  var cameraY = 0;
  var score = 0;
  var highestWorldY = 0; // lowest (highest on screen) Y reached
  var startWorldY = 0;
  var coinsCollected = 0;
  var jbCollected = 0;
  var platforms = [];
  var coins = [];
  var jbCoins = [];
  var enemies = [];
  var particles = [];
  var springs = [];
  var jetpacks = [];
  var shields = [];
  var hasShield = false;
  var jetpackTimer = 0;
  var highestPlatY = 0; // world Y of the highest generated platform
  var animFrame = 0;
  var animTick = 0;
  var rafId = null;
  var facingRight = true;
  var breakAnimations = []; // visual-only broken platform pieces

  // Input state
  var keysDown = {};
  var touchStartX = null;
  var touchCurrentX = null;
  var tiltX = 0;
  var usingTilt = false;
  var touchZone = 0; // -1 left, 0 none, 1 right (for touch controls mode)

  // Control mode: 'tilt' or 'touch'
  var CONTROLS_KEY = 'doodle-jump-controls';
  var INVERT_KEY = 'doodle-jump-invert-tilt';
  var controlMode = 'tilt';
  var invertTilt = false;
  try {
    var savedMode = localStorage.getItem(CONTROLS_KEY);
    if (savedMode === 'touch') controlMode = 'touch';
    var savedInvert = localStorage.getItem(INVERT_KEY);
    if (savedInvert === 'true') invertTilt = true;
  } catch (e) {}

  var controlsToggles = document.querySelectorAll('.dj-controls-toggle');
  var invertToggles = document.querySelectorAll('.dj-invert-toggle');

  // ── Theme colors ──────────────────────────────
  var colorBg = '#000';
  var colorFg = '#fff';
  var colorAccent = '#0f0';
  var colorPetAccessory = '#ff0';

  function resolveColors() {
    var s = getComputedStyle(document.documentElement);
    colorBg = s.getPropertyValue('--background').trim() || '#000';
    colorFg = s.getPropertyValue('--foreground').trim() || '#fff';
    colorAccent = s.getPropertyValue('--accent').trim() || '#0f0';
    colorPetAccessory = s.getPropertyValue('--pet-accessory').trim() || '#ff0';
    buildSpriteCanvases();
  }

  // ── Pet sprite on canvas ──────────────────────
  var spriteData = null;
  var petId = null;
  var petLevel = 1;
  var spriteFrames = [];

  function loadPetInfo() {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (raw) {
        var ps = JSON.parse(raw);
        if (ps.activePet && ps.pets && ps.pets[ps.activePet]) {
          petId = ps.activePet;
          petLevel = ps.pets[ps.activePet].level || 1;
          return;
        }
      }
    } catch (e) {}
    petId = null;
    petLevel = 1;
  }

  function loadSpriteData(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/data/petsprites.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { spriteData = JSON.parse(xhr.responseText); } catch (e) { spriteData = null; }
      }
      cb();
    };
    xhr.onerror = function () { spriteData = null; cb(); };
    xhr.send();
  }

  function resolveFrames(pid, level, anim) {
    if (!spriteData) return null;
    var pd = spriteData[pid];
    if (!pd) return null;
    var ld = pd[String(level)];
    if (!ld) return null;
    var frames = ld[anim];
    if (typeof frames === 'string') {
      if (frames.indexOf('.') !== -1) {
        var parts = frames.split('.');
        return resolveFrames(parts[0], parseInt(parts[1], 10), anim);
      }
      return resolveFrames(pid, parseInt(frames, 10), anim);
    }
    return frames;
  }

  function buildSpriteCanvases() {
    spriteFrames = [];
    if (!petId || !spriteData) return;

    var frames = resolveFrames(petId, petLevel, 'idle');
    if (!frames || frames.length === 0) return;

    for (var f = 0; f < frames.length; f++) {
      var grid = frames[f];
      var oc = document.createElement('canvas');
      oc.width = RENDER_SIZE;
      oc.height = RENDER_SIZE;
      var octx = oc.getContext('2d');

      for (var i = 0; i < grid.length; i++) {
        if (grid[i] === 0) continue;
        var px = i % SPRITE_SIZE;
        var py = Math.floor(i / SPRITE_SIZE);
        var c = grid[i] === 1 ? colorFg : grid[i] === 3 ? colorPetAccessory : colorAccent;
        octx.fillStyle = c;
        octx.fillRect(px * PIXEL_SCALE, py * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
      }
      spriteFrames.push(oc);
    }
  }

  function renderPetPreview() {
    if (!petPreview) return;
    petPreview.innerHTML = '';
    if (spriteFrames.length > 0) {
      var el = document.createElement('canvas');
      el.width = RENDER_SIZE;
      el.height = RENDER_SIZE;
      el.style.width = RENDER_SIZE + 'px';
      el.style.height = RENDER_SIZE + 'px';
      el.style.imageRendering = 'pixelated';
      el.getContext('2d').drawImage(spriteFrames[0], 0, 0);
      petPreview.appendChild(el);
    } else {
      petPreview.textContent = '^';
      petPreview.style.fontSize = '2em';
      petPreview.style.color = colorFg;
    }
  }

  // ── Stats ─────────────────────────────────────
  var stats = loadStats();

  function defaultStats() {
    return { games: 0, best: 0, totalCoins: 0, totalJB: 0, maxHeight: 0 };
  }

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        return {
          games: s.games || 0,
          best: s.best || 0,
          totalCoins: s.totalCoins || 0,
          totalJB: s.totalJB || 0,
          maxHeight: s.maxHeight || 0
        };
      }
    } catch (e) {}
    return defaultStats();
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function updateStatsUI() {
    if (statGames) statGames.textContent = stats.games;
    if (statBest) statBest.textContent = stats.best;
    if (statCoins) statCoins.textContent = stats.totalCoins;
    if (statJB) statJB.textContent = stats.totalJB;
    if (statHeight) statHeight.textContent = stats.maxHeight;
    if (hudBest) hudBest.textContent = stats.best;
  }

  // ── HUD helpers ───────────────────────────────
  function updateHUD() {
    if (hudScore) hudScore.textContent = score;
    if (hudCoins) hudCoins.textContent = coinsCollected;
    if (hudJB) hudJB.textContent = jbCollected;
  }

  // ── Platform generation ───────────────────────
  function generateInitialPlatforms() {
    platforms = [];
    coins = [];
    jbCoins = [];
    enemies = [];
    springs = [];
    jetpacks = [];
    shields = [];
    breakAnimations = [];

    // Ground platform (wide, centered)
    platforms.push({
      x: CANVAS_W / 2 - PLAT_W,
      y: startWorldY + 10,
      w: PLAT_W * 2,
      type: PLAT_NORMAL,
      alive: true,
      vanishTimer: 0,
      moveDir: 0
    });

    // Generate upward from the start
    var curY = startWorldY - PLAT_GAP_MIN;
    highestPlatY = curY;

    for (var i = 0; i < 30; i++) {
      addPlatformAt(curY, 0);
      var gap = PLAT_GAP_MIN + Math.random() * (PLAT_GAP_MAX - PLAT_GAP_MIN);
      curY -= gap;
    }
    highestPlatY = curY;
  }

  function addPlatformAt(y, currentScore) {
    var x = Math.random() * (CANVAS_W - PLAT_W);
    var type = pickPlatformType(currentScore);
    var p = {
      x: x,
      y: y,
      w: PLAT_W,
      type: type,
      alive: true,
      vanishTimer: 0,
      moveDir: type === PLAT_MOVING ? (Math.random() < 0.5 ? 1 : -1) : 0,
      hits: 0
    };
    platforms.push(p);

    // Spring (10% chance on normal platforms)
    if (type === PLAT_NORMAL && Math.random() < 0.10) {
      springs.push({
        x: x + PLAT_W / 2 - 8,
        y: y - 16,
        plat: p,
        compressed: false,
        compressTimer: 0
      });
    }

    // Jetpack (3% chance, only above score 200)
    if (currentScore > 200 && Math.random() < 0.03) {
      jetpacks.push({
        x: x + Math.random() * PLAT_W,
        y: y - 30 - Math.random() * 20,
        collected: false
      });
    }

    // Shield (2% chance, only above score 400)
    if (currentScore > 400 && Math.random() < 0.02) {
      shields.push({
        x: x + Math.random() * PLAT_W,
        y: y - 25 - Math.random() * 20,
        collected: false,
        pulse: Math.random() * 6
      });
    }

    // Coin (40% chance)
    if (Math.random() < 0.4) {
      var numCoins = 1 + Math.floor(Math.random() * 3);
      for (var c = 0; c < numCoins; c++) {
        coins.push({
          x: x + Math.random() * PLAT_W,
          y: y - 20 - Math.random() * 30,
          collected: false
        });
      }
    }

    // JB coin (4% chance, max 1 on screen)
    var hasJB = false;
    for (var j = 0; j < jbCoins.length; j++) {
      if (!jbCoins[j].collected) { hasJB = true; break; }
    }
    if (!hasJB && Math.random() < 0.04) {
      jbCoins.push({
        x: x + PLAT_W / 2,
        y: y - 35,
        collected: false,
        pulse: 0
      });
    }

    // Enemy (5% chance above threshold, on a separate Y)
    if (currentScore > ENEMY_SCORE_THRESHOLD && Math.random() < 0.05) {
      enemies.push({
        x: Math.random() * (CANVAS_W - ENEMY_SIZE),
        y: y - 40 - Math.random() * 20,
        alive: true,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.8 + Math.random() * 0.8
      });
    }
  }

  function pickPlatformType(currentScore) {
    var r = Math.random();
    if (currentScore > 800) {
      // Hard: 45% normal, 25% moving, 15% breakable, 15% vanishing
      if (r < 0.45) return PLAT_NORMAL;
      if (r < 0.70) return PLAT_MOVING;
      if (r < 0.85) return PLAT_BREAKABLE;
      return PLAT_VANISHING;
    }
    if (currentScore > 400) {
      // Medium: 55% normal, 20% moving, 15% breakable, 10% vanishing
      if (r < 0.55) return PLAT_NORMAL;
      if (r < 0.75) return PLAT_MOVING;
      if (r < 0.90) return PLAT_BREAKABLE;
      return PLAT_VANISHING;
    }
    if (currentScore > 100) {
      // Easy+: 70% normal, 15% moving, 10% breakable, 5% vanishing
      if (r < 0.70) return PLAT_NORMAL;
      if (r < 0.85) return PLAT_MOVING;
      if (r < 0.95) return PLAT_BREAKABLE;
      return PLAT_VANISHING;
    }
    // Beginner: 85% normal, 10% moving, 5% breakable
    if (r < 0.85) return PLAT_NORMAL;
    if (r < 0.95) return PLAT_MOVING;
    return PLAT_BREAKABLE;
  }

  function generateMorePlatforms() {
    // Generate platforms above the current highest
    var needed = cameraY - 200;
    while (highestPlatY > needed) {
      var gap = PLAT_GAP_MIN + Math.random() * (PLAT_GAP_MAX - PLAT_GAP_MIN);
      // Increase gap slightly at higher scores
      if (score > 500) gap += 10;
      if (score > 1000) gap += 10;
      highestPlatY -= gap;
      addPlatformAt(highestPlatY, score);
    }
  }

  function cleanupOffscreen() {
    var bottom = cameraY + CANVAS_H + 200;
    var i;
    for (i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y > bottom) platforms.splice(i, 1);
    }
    for (i = coins.length - 1; i >= 0; i--) {
      if (coins[i].y > bottom || coins[i].collected) coins.splice(i, 1);
    }
    for (i = jbCoins.length - 1; i >= 0; i--) {
      if (jbCoins[i].y > bottom || jbCoins[i].collected) jbCoins.splice(i, 1);
    }
    for (i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].y > bottom) enemies.splice(i, 1);
    }
    for (i = springs.length - 1; i >= 0; i--) {
      if (springs[i].y > bottom) springs.splice(i, 1);
    }
    for (i = jetpacks.length - 1; i >= 0; i--) {
      if (jetpacks[i].y > bottom || jetpacks[i].collected) jetpacks.splice(i, 1);
    }
    for (i = shields.length - 1; i >= 0; i--) {
      if (shields[i].y > bottom || shields[i].collected) shields.splice(i, 1);
    }
    for (i = breakAnimations.length - 1; i >= 0; i--) {
      if (breakAnimations[i].life <= 0) breakAnimations.splice(i, 1);
    }
  }

  // ── Game logic ────────────────────────────────
  function resetGame() {
    startWorldY = CANVAS_H - 80;
    playerX = CANVAS_W / 2 - PLAYER_W / 2;
    playerY = startWorldY - PLAYER_H;
    playerVelX = 0;
    playerVelY = 0;
    cameraY = 0;
    score = 0;
    highestWorldY = playerY;
    coinsCollected = 0;
    jbCollected = 0;
    particles = [];
    hasShield = false;
    jetpackTimer = 0;
    animFrame = 0;
    animTick = 0;
    facingRight = true;
    breakAnimations = [];

    generateInitialPlatforms();
    updateHUD();
  }

  function startGame() {
    state = 'playing';
    resetGame();
    playerVelY = BOUNCE_VEL;
    startOverlay.classList.add('dj-hidden');
    gameoverOverlay.classList.add('dj-hidden');
    if (!rafId) loop();
  }

  function die() {
    state = 'dead';

    // Bonus coins for score
    var bonus = Math.floor(score / 50);
    if (bonus > 0) {
      coinsCollected += bonus;
      if (typeof Wallet !== 'undefined') Wallet.add(bonus);
    }

    // Update stats
    stats.games++;
    stats.totalCoins += coinsCollected;
    stats.totalJB += jbCollected;
    if (score > stats.best) stats.best = score;
    if (score > stats.maxHeight) stats.maxHeight = score;
    saveStats();

    // Update game-over UI
    if (finalScore) finalScore.textContent = score;
    if (finalCoins) finalCoins.textContent = coinsCollected;
    if (finalJB) finalJB.textContent = jbCollected;
    updateHUD();
    updateStatsUI();

    // Pet reaction
    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'doodle-jump',
        outcome: score > 0 ? 'win' : 'lose',
        bet: 0,
        payout: coinsCollected * COIN_VALUE
      });
    }

    setTimeout(function () {
      gameoverOverlay.classList.remove('dj-hidden');
    }, 600);
  }

  // ── Update ────────────────────────────────────
  function update() {
    if (state !== 'playing') return;

    // ── Input → horizontal velocity
    var inputX = 0;
    if (keysDown['ArrowLeft'] || keysDown['KeyA']) inputX = -1;
    if (keysDown['ArrowRight'] || keysDown['KeyD']) inputX = 1;

    if (controlMode === 'touch') {
      // Zone-based touch: hold left/right side of canvas
      if (touchZone !== 0) {
        inputX = touchZone;
      }
    } else {
      // Tilt mode (with drag fallback)
      if (touchStartX !== null && touchCurrentX !== null) {
        var dragDelta = touchCurrentX - touchStartX;
        if (Math.abs(dragDelta) > 30) {
          inputX = dragDelta > 0 ? 1 : -1;
        }
      } else if (usingTilt && Math.abs(tiltX) > 12) {
        var tiltStrength = (Math.abs(tiltX) - 12) / 30;
        if (tiltStrength > 1) tiltStrength = 1;
        var tiltDir = tiltX > 0 ? 1 : -1;
        inputX = invertTilt ? -tiltDir * tiltStrength : tiltDir * tiltStrength;
      }
    }

    if (inputX !== 0) {
      playerVelX += inputX * MOVE_SPEED * 0.3;
      if (Math.abs(inputX) > 0.1) facingRight = inputX > 0;
    }
    playerVelX *= MOVE_FRICTION;

    // Clamp horizontal speed
    if (playerVelX > MOVE_SPEED) playerVelX = MOVE_SPEED;
    if (playerVelX < -MOVE_SPEED) playerVelX = -MOVE_SPEED;

    // ── Jetpack
    if (jetpackTimer > 0) {
      jetpackTimer--;
      playerVelY = JETPACK_VEL;
      // Jetpack particles
      if (animTick % 3 === 0) {
        particles.push({
          x: playerX + PLAYER_W / 2 + (Math.random() - 0.5) * 10,
          y: playerY + PLAYER_H,
          vx: (Math.random() - 0.5) * 2,
          vy: 2 + Math.random() * 2,
          text: null,
          color: colorAccent,
          life: 15,
          maxLife: 15
        });
      }
    } else {
      // ── Gravity
      playerVelY = Math.min(playerVelY + GRAVITY, MAX_FALL);
    }

    // ── Move player
    playerX += playerVelX;
    playerY += playerVelY;

    // ── Screen wrapping
    if (playerX + PLAYER_W < 0) playerX = CANVAS_W;
    if (playerX > CANVAS_W) playerX = -PLAYER_W;

    // ── Sprite animation
    animTick++;
    if (animTick >= 60 / ANIMATION_FPS) {
      animTick = 0;
      animFrame++;
    }

    // ── Platform collision (only when falling)
    if (playerVelY > 0 && jetpackTimer <= 0) {
      var playerBottom = playerY + PLAYER_H;
      var playerCX = playerX + PLAYER_W / 2;

      for (var i = 0; i < platforms.length; i++) {
        var p = platforms[i];
        if (!p.alive) continue;

        // Check if player feet land on platform
        var onPlat = playerBottom >= p.y &&
                     playerBottom <= p.y + PLAT_H + Math.abs(playerVelY) &&
                     playerCX > p.x &&
                     playerCX < p.x + p.w;

        if (onPlat) {
          // Check for spring on this platform
          var hitSpring = false;
          for (var si = 0; si < springs.length; si++) {
            var sp = springs[si];
            if (sp.plat === p &&
                playerCX > sp.x && playerCX < sp.x + 16) {
              hitSpring = true;
              sp.compressed = true;
              sp.compressTimer = 10;
              playerVelY = SPRING_VEL;
              playerY = p.y - PLAYER_H;
              break;
            }
          }

          if (!hitSpring) {
            if (p.type === PLAT_BREAKABLE) {
              p.hits++;
              if (p.hits >= 2) {
                p.alive = false;
                // Spawn break animation pieces
                for (var b = 0; b < 4; b++) {
                  breakAnimations.push({
                    x: p.x + (b % 2) * (PLAT_W / 2),
                    y: p.y,
                    w: PLAT_W / 2,
                    h: PLAT_H / 2,
                    vx: (b % 2 === 0 ? -1 : 1) * (1 + Math.random()),
                    vy: -2 + Math.random() * 2,
                    life: 30,
                    maxLife: 30
                  });
                }
                // Don't bounce — player falls through
              } else {
                // First hit: bounce but crack
                playerVelY = BOUNCE_VEL;
                playerY = p.y - PLAYER_H;
              }
            } else if (p.type === PLAT_VANISHING) {
              playerVelY = BOUNCE_VEL;
              playerY = p.y - PLAYER_H;
              p.vanishTimer = 20; // starts countdown
            } else {
              // Normal or moving: bounce
              playerVelY = BOUNCE_VEL;
              playerY = p.y - PLAYER_H;
            }
          }
        }
      }
    }

    // ── Update vanishing platforms
    for (var vi = platforms.length - 1; vi >= 0; vi--) {
      var vp = platforms[vi];
      if (vp.type === PLAT_VANISHING && vp.vanishTimer > 0) {
        vp.vanishTimer--;
        if (vp.vanishTimer <= 0) {
          vp.alive = false;
        }
      }
    }

    // ── Update moving platforms
    for (var mi = 0; mi < platforms.length; mi++) {
      var mp = platforms[mi];
      if (mp.type === PLAT_MOVING && mp.alive) {
        mp.x += mp.moveDir * MOVING_SPEED;
        if (mp.x <= 0) { mp.x = 0; mp.moveDir = 1; }
        if (mp.x + mp.w >= CANVAS_W) { mp.x = CANVAS_W - mp.w; mp.moveDir = -1; }
      }
    }

    // ── Update spring animations
    for (var sj = 0; sj < springs.length; sj++) {
      if (springs[sj].compressTimer > 0) {
        springs[sj].compressTimer--;
        if (springs[sj].compressTimer <= 0) springs[sj].compressed = false;
      }
    }

    // ── Update enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      var en = enemies[ei];
      if (!en.alive) continue;
      en.x += en.dir * en.speed;
      if (en.x <= 0) { en.x = 0; en.dir = 1; }
      if (en.x + ENEMY_SIZE >= CANVAS_W) { en.x = CANVAS_W - ENEMY_SIZE; en.dir = -1; }
    }

    // ── Collectible collision
    var pcx = playerX + PLAYER_W / 2;
    var pcy = playerY + PLAYER_H / 2;

    // Coins
    for (var ci = 0; ci < coins.length; ci++) {
      if (coins[ci].collected) continue;
      var cdx = pcx - coins[ci].x;
      var cdy = pcy - coins[ci].y;
      if (Math.sqrt(cdx * cdx + cdy * cdy) < PLAYER_W / 2 + COIN_RADIUS) {
        coins[ci].collected = true;
        coinsCollected += COIN_VALUE;
        if (typeof Wallet !== 'undefined') Wallet.add(COIN_VALUE);
        updateHUD();
        particles.push({
          x: coins[ci].x, y: coins[ci].y,
          text: '+' + COIN_VALUE, color: colorAccent,
          life: 40, maxLife: 40
        });
      }
    }

    // JB coins
    for (var ji = 0; ji < jbCoins.length; ji++) {
      if (jbCoins[ji].collected) continue;
      jbCoins[ji].pulse += 0.1;
      var jdx = pcx - jbCoins[ji].x;
      var jdy = pcy - jbCoins[ji].y;
      if (Math.sqrt(jdx * jdx + jdy * jdy) < PLAYER_W / 2 + JB_RADIUS) {
        jbCoins[ji].collected = true;
        jbCollected++;
        if (typeof JackBucks !== 'undefined') JackBucks.add(1);
        updateHUD();
        particles.push({
          x: jbCoins[ji].x, y: jbCoins[ji].y,
          text: 'JB+1', color: '#ffd700',
          life: 50, maxLife: 50
        });
        for (var bk = 0; bk < 8; bk++) {
          var angle = (bk / 8) * Math.PI * 2;
          particles.push({
            x: jbCoins[ji].x, y: jbCoins[ji].y,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
            text: null, color: '#ffd700',
            life: 20, maxLife: 20
          });
        }
      }
    }

    // Jetpack pickup
    for (var jpi = 0; jpi < jetpacks.length; jpi++) {
      if (jetpacks[jpi].collected) continue;
      var jpx = pcx - jetpacks[jpi].x;
      var jpy = pcy - jetpacks[jpi].y;
      if (Math.sqrt(jpx * jpx + jpy * jpy) < PLAYER_W / 2 + 12) {
        jetpacks[jpi].collected = true;
        jetpackTimer = JETPACK_DURATION;
        particles.push({
          x: jetpacks[jpi].x, y: jetpacks[jpi].y,
          text: 'JETPACK!', color: colorAccent,
          life: 50, maxLife: 50
        });
      }
    }

    // Shield pickup
    for (var shi = 0; shi < shields.length; shi++) {
      if (shields[shi].collected) continue;
      shields[shi].pulse += 0.08;
      var shx = pcx - shields[shi].x;
      var shy = pcy - shields[shi].y;
      if (Math.sqrt(shx * shx + shy * shy) < PLAYER_W / 2 + 12) {
        shields[shi].collected = true;
        hasShield = true;
        particles.push({
          x: shields[shi].x, y: shields[shi].y,
          text: 'SHIELD!', color: '#44aaff',
          life: 50, maxLife: 50
        });
      }
    }

    // ── Enemy collision
    for (var eni = 0; eni < enemies.length; eni++) {
      var e = enemies[eni];
      if (!e.alive) continue;

      var ex = e.x + ENEMY_SIZE / 2;
      var ey = e.y + ENEMY_SIZE / 2;
      var dx = pcx - ex;
      var dy = pcy - ey;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (PLAYER_W + ENEMY_SIZE) / 2 - 4) {
        // Hit from above (stomping)
        if (playerVelY > 0 && playerY + PLAYER_H < e.y + ENEMY_SIZE / 2) {
          e.alive = false;
          playerVelY = BOUNCE_VEL;
          score += 50;
          particles.push({
            x: ex, y: ey,
            text: '+50', color: '#ff4444',
            life: 40, maxLife: 40
          });
          // Burst
          for (var ep = 0; ep < 6; ep++) {
            var ea = (ep / 6) * Math.PI * 2;
            particles.push({
              x: ex, y: ey,
              vx: Math.cos(ea) * 3, vy: Math.sin(ea) * 3,
              text: null, color: '#ff4444',
              life: 20, maxLife: 20
            });
          }
        } else {
          // Hit from side/below
          if (hasShield) {
            hasShield = false;
            e.alive = false;
            particles.push({
              x: pcx, y: pcy,
              text: 'BLOCKED!', color: '#44aaff',
              life: 40, maxLife: 40
            });
          } else {
            die();
            return;
          }
        }
      }
    }

    // ── Camera tracking
    // Camera follows player when above 35% of screen height
    var targetCamY = playerY - CANVAS_H * 0.35;
    if (targetCamY < cameraY) {
      cameraY = targetCamY;
    }

    // ── Score = how high above start
    var heightClimbed = startWorldY - playerY;
    if (heightClimbed > 0) {
      var newScore = Math.floor(heightClimbed / 5);
      if (newScore > score) {
        score = newScore;
        updateHUD();
      }
    }

    if (playerY < highestWorldY) {
      highestWorldY = playerY;
    }

    // ── Generate more platforms above
    generateMorePlatforms();

    // ── Clean up off-screen objects
    cleanupOffscreen();

    // ── Update particles
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].life--;
      if (particles[pi].vx !== undefined) {
        particles[pi].x += particles[pi].vx;
        particles[pi].y += particles[pi].vy;
      } else {
        particles[pi].y -= 1;
      }
      if (particles[pi].life <= 0) {
        particles.splice(pi, 1);
      }
    }

    // ── Update break animations
    for (var ba = breakAnimations.length - 1; ba >= 0; ba--) {
      var br = breakAnimations[ba];
      br.x += br.vx;
      br.y += br.vy;
      br.vy += 0.3; // gravity on pieces
      br.life--;
    }

    // ── Death check: fallen off bottom of screen
    if (playerY > cameraY + CANVAS_H + 50) {
      die();
    }
  }

  // ── Draw ──────────────────────────────────────
  function draw() {
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Background grid lines (subtle)
    ctx.save();
    ctx.strokeStyle = colorFg;
    ctx.globalAlpha = 0.04;
    ctx.lineWidth = 1;
    var gridSize = 40;
    var gridOffsetY = (-cameraY % gridSize + gridSize) % gridSize;
    for (var gy = gridOffsetY; gy < CANVAS_H; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CANVAS_W, gy);
      ctx.stroke();
    }
    ctx.restore();

    // ── Draw platforms
    for (var i = 0; i < platforms.length; i++) {
      drawPlatform(platforms[i]);
    }

    // ── Draw springs
    for (var si = 0; si < springs.length; si++) {
      drawSpring(springs[si]);
    }

    // ── Draw break animations
    for (var ba = 0; ba < breakAnimations.length; ba++) {
      drawBreakPiece(breakAnimations[ba]);
    }

    // ── Draw coins
    for (var ci = 0; ci < coins.length; ci++) {
      if (!coins[ci].collected) drawCoin(coins[ci]);
    }

    // ── Draw JB coins
    for (var ji = 0; ji < jbCoins.length; ji++) {
      if (!jbCoins[ji].collected) drawJBCoin(jbCoins[ji]);
    }

    // ── Draw jetpacks
    for (var jpi = 0; jpi < jetpacks.length; jpi++) {
      if (!jetpacks[jpi].collected) drawJetpack(jetpacks[jpi]);
    }

    // ── Draw shields
    for (var shi = 0; shi < shields.length; shi++) {
      if (!shields[shi].collected) drawShield(shields[shi]);
    }

    // ── Draw enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      if (enemies[ei].alive) drawEnemy(enemies[ei]);
    }

    // ── Draw player
    drawPlayer();

    // ── Draw particles
    for (var pi = 0; pi < particles.length; pi++) {
      drawParticle(particles[pi]);
    }

    // ── Touch zone hints (only in touch mode while playing)
    if (state === 'playing' && controlMode === 'touch') {
      ctx.save();
      ctx.font = 'bold 22px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colorFg;
      ctx.globalAlpha = touchZone === -1 ? 0.18 : 0.06;
      ctx.textAlign = 'left';
      ctx.fillText('<', 10, CANVAS_H / 2);
      ctx.globalAlpha = touchZone === 1 ? 0.18 : 0.06;
      ctx.textAlign = 'right';
      ctx.fillText('>', CANVAS_W - 10, CANVAS_H / 2);
      ctx.restore();
    }

    // ── Score on canvas (faint, centered)
    if (state === 'playing') {
      ctx.save();
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = colorFg;
      ctx.globalAlpha = 0.12;
      ctx.fillText(String(score), CANVAS_W / 2, 70);
      ctx.restore();

      // Shield indicator
      if (hasShield) {
        ctx.save();
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#44aaff';
        ctx.globalAlpha = 0.7;
        ctx.fillText('[ SHIELD ]', 10, CANVAS_H - 10);
        ctx.restore();
      }

      // Jetpack indicator
      if (jetpackTimer > 0) {
        ctx.save();
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = colorAccent;
        ctx.globalAlpha = 0.7;
        ctx.fillText('JETPACK ' + jetpackTimer, CANVAS_W - 10, CANVAS_H - 10);
        ctx.restore();
      }
    }
  }

  // ── World-to-screen Y helper
  function screenY(worldY) {
    return worldY - cameraY;
  }

  function drawPlatform(p) {
    if (!p.alive) return;
    var sx = p.x;
    var sy = screenY(p.y);

    // Off screen check
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();

    // Vanishing platform fading
    if (p.type === PLAT_VANISHING && p.vanishTimer > 0) {
      ctx.globalAlpha = p.vanishTimer / 20;
    }

    // Platform colors by type
    var platColor = colorAccent;
    var platAlpha = 0.3;
    if (p.type === PLAT_MOVING) {
      platColor = '#44aaff';
    } else if (p.type === PLAT_BREAKABLE) {
      platColor = '#cc8844';
    } else if (p.type === PLAT_VANISHING) {
      platColor = colorFg;
      platAlpha = 0.2;
    }

    // Fill
    ctx.fillStyle = platColor;
    ctx.globalAlpha = (ctx.globalAlpha || 1) * platAlpha;
    ctx.fillRect(sx, sy, p.w, PLAT_H);

    // Border
    ctx.globalAlpha = p.type === PLAT_VANISHING && p.vanishTimer > 0 ? p.vanishTimer / 20 : 1;
    ctx.strokeStyle = platColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, p.w, PLAT_H);

    // Terminal text on platform
    ctx.globalAlpha = (p.type === PLAT_VANISHING && p.vanishTimer > 0) ? p.vanishTimer / 20 * 0.5 : 0.5;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = platColor;
    if (p.type === PLAT_NORMAL) ctx.fillText('========', sx + p.w / 2, sy + PLAT_H - 2);
    else if (p.type === PLAT_MOVING) ctx.fillText('<======>', sx + p.w / 2, sy + PLAT_H - 2);
    else if (p.type === PLAT_BREAKABLE) ctx.fillText(p.hits > 0 ? '=X=#X=#X' : '=#=##=#=', sx + p.w / 2, sy + PLAT_H - 2);
    else if (p.type === PLAT_VANISHING) ctx.fillText('........', sx + p.w / 2, sy + PLAT_H - 2);

    ctx.restore();
  }

  function drawSpring(sp) {
    var sy = screenY(sp.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.7;

    if (sp.compressed) {
      // Compressed spring (flat)
      ctx.fillRect(sp.x, sy + 10, 16, 6);
    } else {
      // Extended spring (zigzag approximation)
      ctx.fillRect(sp.x + 4, sy, 8, 4);
      ctx.fillRect(sp.x, sy + 4, 16, 4);
      ctx.fillRect(sp.x + 4, sy + 8, 8, 4);
      ctx.fillRect(sp.x, sy + 12, 16, 4);
    }
    ctx.restore();
  }

  function drawBreakPiece(bp) {
    var sy = screenY(bp.y);
    ctx.save();
    ctx.globalAlpha = bp.life / bp.maxLife;
    ctx.fillStyle = '#cc8844';
    ctx.globalAlpha *= 0.4;
    ctx.fillRect(bp.x, sy, bp.w, bp.h);
    ctx.globalAlpha = bp.life / bp.maxLife;
    ctx.strokeStyle = '#cc8844';
    ctx.lineWidth = 1;
    ctx.strokeRect(bp.x, sy, bp.w, bp.h);
    ctx.restore();
  }

  function drawCoin(c) {
    var sy = screenY(c.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, sy, COIN_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colorAccent;
    ctx.fillText('$', c.x, sy);
    ctx.restore();
  }

  function drawJBCoin(j) {
    var sy = screenY(j.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    var pulseR = JB_RADIUS + Math.sin(j.pulse) * 2;

    ctx.beginPath();
    ctx.arc(j.x, sy, pulseR + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.15;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(j.x, sy, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('JB', j.x, sy);
    ctx.restore();
  }

  function drawJetpack(jp) {
    var sy = screenY(jp.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.8;
    ctx.fillText('J', jp.x, sy);

    // Glow
    ctx.beginPath();
    ctx.arc(jp.x, sy, 14, 0, Math.PI * 2);
    ctx.strokeStyle = colorAccent;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawShield(sh) {
    var sy = screenY(sh.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    var r = 10 + Math.sin(sh.pulse) * 2;
    ctx.beginPath();
    ctx.arc(sh.x, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#44aaff';
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#44aaff';
    ctx.fillText('S', sh.x, sy);
    ctx.restore();
  }

  function drawEnemy(en) {
    var sy = screenY(en.y);
    if (sy > CANVAS_H + 20 || sy < -20) return;

    ctx.save();
    // Enemy body
    ctx.fillStyle = '#ff4444';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(en.x, sy, ENEMY_SIZE, ENEMY_SIZE);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(en.x, sy, ENEMY_SIZE, ENEMY_SIZE);

    // Enemy face
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('X', en.x + ENEMY_SIZE / 2, sy + ENEMY_SIZE / 2);
    ctx.restore();
  }

  function drawPlayer() {
    var sx = playerX;
    var sy = screenY(playerY);

    ctx.save();

    var cx = sx + PLAYER_W / 2;
    var cy = sy + PLAYER_H / 2;

    ctx.translate(cx, cy);

    // Flip sprite based on facing direction
    if (!facingRight) {
      ctx.scale(-1, 1);
    }

    // Shield glow around player
    if (hasShield) {
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_W / 2 + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#44aaff';
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(animTick * 0.15);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (spriteFrames.length > 0) {
      var fi = animFrame % spriteFrames.length;
      ctx.drawImage(spriteFrames[fi], -RENDER_SIZE / 2, -RENDER_SIZE / 2, RENDER_SIZE, RENDER_SIZE);
    } else {
      // Fallback arrow
      ctx.fillStyle = colorFg;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('^', 0, 0);
    }

    ctx.restore();
  }

  function drawParticle(p) {
    var sy = screenY(p.y);
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    if (p.text) {
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, sy);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, sy - 2, 4, 4);
    }
    ctx.restore();
  }

  // ── Game loop ─────────────────────────────────
  function loop() {
    update();
    draw();
    if (state === 'playing') {
      rafId = requestAnimationFrame(loop);
    } else if (state === 'dead') {
      rafId = null;
    } else {
      rafId = null;
    }
  }

  // ── Input ─────────────────────────────────────
  function onKeyDown(e) {
    keysDown[e.code] = true;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (state === 'idle') startGame();
      if (state === 'dead') startGame();
    }
  }

  function onKeyUp(e) {
    keysDown[e.code] = false;
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Touch input
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state === 'idle') { startGame(); return; }
    if (state === 'dead') return;
    var t = e.touches[0];
    if (controlMode === 'touch') {
      // Zone-based: left half = left, right half = right
      var rect = canvas.getBoundingClientRect();
      var relX = t.clientX - rect.left;
      touchZone = relX < rect.width / 2 ? -1 : 1;
    } else {
      touchStartX = t.clientX;
      touchCurrentX = t.clientX;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      if (controlMode === 'touch') {
        var rect = canvas.getBoundingClientRect();
        var relX = e.touches[0].clientX - rect.left;
        touchZone = relX < rect.width / 2 ? -1 : 1;
      } else {
        touchCurrentX = e.touches[0].clientX;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    touchStartX = null;
    touchCurrentX = null;
    touchZone = 0;
  }, { passive: false });

  // Device orientation (tilt) — always listen, only used in tilt mode
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma !== null) {
        usingTilt = true;
        tiltX = e.gamma;
      }
    });
  }

  // Controls toggle button
  var controlsHint = document.getElementById('dj-controls-hint');

  function updateControlsBtn() {
    for (var i = 0; i < controlsToggles.length; i++) {
      controlsToggles[i].textContent = 'Controls: ' + (controlMode === 'tilt' ? 'Tilt' : 'Touch');
    }
    for (var j = 0; j < invertToggles.length; j++) {
      invertToggles[j].textContent = 'Tilt: ' + (invertTilt ? 'Inverted' : 'Normal');
      invertToggles[j].style.display = controlMode === 'tilt' ? '' : 'none';
    }
    if (controlsHint) {
      controlsHint.textContent = controlMode === 'touch'
        ? 'Tap left / right side to move'
        : 'Arrow keys / A D / Tilt to move';
    }
  }
  updateControlsBtn();

  for (var ci = 0; ci < controlsToggles.length; ci++) {
    controlsToggles[ci].addEventListener('click', function (e) {
      e.stopPropagation();
      controlMode = controlMode === 'tilt' ? 'touch' : 'tilt';
      try { localStorage.setItem(CONTROLS_KEY, controlMode); } catch (ex) {}
      updateControlsBtn();
    });
  }

  for (var ii = 0; ii < invertToggles.length; ii++) {
    invertToggles[ii].addEventListener('click', function (e) {
      e.stopPropagation();
      invertTilt = !invertTilt;
      try { localStorage.setItem(INVERT_KEY, invertTilt ? 'true' : 'false'); } catch (ex) {}
      updateControlsBtn();
    });
  }

  // Play / Retry buttons
  if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); startGame(); });
  if (retryBtn) retryBtn.addEventListener('click', function (e) { e.stopPropagation(); startGame(); });

  // Reset stats
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', function () {
      stats = defaultStats();
      saveStats();
      updateStatsUI();
    });
  }

  // ── Resize handling ───────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      sizeCanvas();
      if (state === 'idle') drawIdleScreen();
    }, 150);
  });

  // ── Theme reactivity ──────────────────────────
  var themeObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'data-theme') {
        resolveColors();
        renderPetPreview();
        break;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  // ── Init ──────────────────────────────────────
  loadPetInfo();
  loadSpriteData(function () {
    resolveColors();
    renderPetPreview();
    updateStatsUI();
    drawIdleScreen();
  });

  function drawIdleScreen() {
    startWorldY = CANVAS_H - 80;
    playerX = CANVAS_W / 2 - PLAYER_W / 2;
    playerY = startWorldY - PLAYER_H;
    cameraY = 0;
    highestPlatY = 0;
    platforms = [];
    coins = [];
    jbCoins = [];
    enemies = [];
    springs = [];
    jetpacks = [];
    shields = [];
    breakAnimations = [];
    particles = [];
    generateInitialPlatforms();
    draw();
  }
})();
