(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var SPRITE_SIZE = 16;
  var PIXEL_SCALE = 3;
  var RENDER_SIZE = SPRITE_SIZE * PIXEL_SCALE; // 48
  var ANIMATION_FPS = 4;

  var GRAVITY = 0.28;
  var FLAP_VEL = -6.2;
  var MAX_FALL = 8;
  var BIRD_SIZE = 36;

  var PIPE_WIDTH = 52;
  var PIPE_LIP = 8;
  var PIPE_LIP_H = 16;
  var BASE_PIPE_SPEED = 2.0;
  var MAX_PIPE_SPEED = 4.0;
  var PIPE_SPAWN_DIST = 240;
  var BASE_GAP = 160;
  var MIN_GAP = 110;
  var GAP_MARGIN = 80;

  var GRACE_FRAMES = 120; // ~2 seconds of gentle flight before pipes appear

  var COIN_RADIUS = 8;
  var JB_RADIUS = 11;
  var COIN_VALUE = 5;

  var STATS_KEY = 'flappy-stats';
  var PET_KEY = 'arebooksgood-pet';

  // ── DOM refs ──────────────────────────────────────
  var canvas = document.getElementById('fb-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var gameArea = document.getElementById('fb-game-area');
  var canvasWrap = canvas.parentElement;

  var hudScore = document.getElementById('fb-score');
  var hudCoins = document.getElementById('fb-coins');
  var hudJB = document.getElementById('fb-jb');
  var hudBest = document.getElementById('fb-best');

  var startOverlay = document.getElementById('fb-start-overlay');
  var gameoverOverlay = document.getElementById('fb-gameover-overlay');
  var playBtn = document.getElementById('fb-play-btn');
  var retryBtn = document.getElementById('fb-retry-btn');
  var petPreview = document.getElementById('fb-pet-preview');

  var finalScore = document.getElementById('fb-final-score');
  var finalCoins = document.getElementById('fb-final-coins');
  var finalJB = document.getElementById('fb-final-jb');

  var statGames = document.getElementById('fb-stat-games');
  var statBest = document.getElementById('fb-stat-best');
  var statCoins = document.getElementById('fb-stat-coins');
  var statJB = document.getElementById('fb-stat-jb');
  var statPipes = document.getElementById('fb-stat-pipes');
  var resetStatsBtn = document.getElementById('fb-reset-stats');

  // ── Dynamic canvas sizing ─────────────────────────
  // Fill container width, maintain 3:4 portrait aspect ratio
  var CANVAS_W = 400;
  var CANVAS_H = 600;
  var BIRD_X = 80;
  var dpr = window.devicePixelRatio || 1;

  function sizeCanvas() {
    // Temporarily let game area be full width so we can measure the parent
    gameArea.style.width = '';
    var containerW = gameArea.parentElement.clientWidth || 400;

    // Available viewport height minus header/HUD/padding (~200px overhead)
    var maxH = window.innerHeight - 200;
    if (maxH < 300) maxH = 300;

    // Start from container width, compute ideal height
    var w = Math.min(containerW, 800);
    var h = Math.round(w * 1.5);

    // If too tall for viewport, shrink to fit and derive width from height
    if (h > maxH) {
      h = maxH;
      w = Math.round(h / 1.5);
    }

    CANVAS_W = w;
    CANVAS_H = h;
    BIRD_X = Math.round(w * 0.18);

    // Size the game area container so HUD + canvas match
    gameArea.style.width = w + 'px';

    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  sizeCanvas();

  // ── Game state ────────────────────────────────────
  var state = 'idle'; // idle | playing | dead
  var birdY = 0;
  var birdVel = 0;
  var score = 0;
  var coinsCollected = 0;
  var jbCollected = 0;
  var pipes = [];
  var coins = [];
  var jbCoins = [];
  var particles = [];
  var pipeSpeed = BASE_PIPE_SPEED;
  var pipeGap = BASE_GAP;
  var distSinceLastPipe = 0;
  var animFrame = 0;
  var animTick = 0;
  var rafId = null;
  var graceTimer = 0; // countdown frames of gentle flight at start

  // ── Theme colors (resolved) ───────────────────────
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

  // ── Pet sprite on canvas ──────────────────────────
  var spriteData = null;
  var petId = null;
  var petLevel = 1;
  var spriteFrames = []; // offscreen canvases

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
      var img = spriteFrames[0];
      var el = document.createElement('canvas');
      el.width = RENDER_SIZE;
      el.height = RENDER_SIZE;
      el.style.width = RENDER_SIZE + 'px';
      el.style.height = RENDER_SIZE + 'px';
      el.style.imageRendering = 'pixelated';
      el.getContext('2d').drawImage(img, 0, 0);
      petPreview.appendChild(el);
    } else {
      petPreview.textContent = '>';
      petPreview.style.fontSize = '2em';
      petPreview.style.color = colorFg;
    }
  }

  // ── Stats ─────────────────────────────────────────
  var stats = loadStats();

  function defaultStats() {
    return { games: 0, best: 0, totalCoins: 0, totalJB: 0, totalPipes: 0 };
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
          totalPipes: s.totalPipes || 0
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
    if (statPipes) statPipes.textContent = stats.totalPipes;
    if (hudBest) hudBest.textContent = stats.best;
  }

  // ── HUD helpers ───────────────────────────────────
  function updateHUD() {
    if (hudScore) hudScore.textContent = score;
    if (hudCoins) hudCoins.textContent = coinsCollected;
    if (hudJB) hudJB.textContent = jbCollected;
  }

  // ── Game logic ────────────────────────────────────
  function resetGame() {
    birdY = CANVAS_H / 2 - BIRD_SIZE / 2;
    birdVel = 0;
    score = 0;
    coinsCollected = 0;
    jbCollected = 0;
    pipes = [];
    coins = [];
    jbCoins = [];
    particles = [];
    pipeSpeed = BASE_PIPE_SPEED;
    pipeGap = BASE_GAP;
    distSinceLastPipe = 0; // no pipes until grace period ends
    graceTimer = GRACE_FRAMES;
    animFrame = 0;
    animTick = 0;
    updateHUD();
  }

  function flap() {
    if (state === 'dead') return;
    if (state === 'idle') {
      startGame();
      return;
    }
    birdVel = FLAP_VEL;
  }

  function startGame() {
    state = 'playing';
    resetGame();
    birdVel = FLAP_VEL;
    startOverlay.classList.add('fb-hidden');
    gameoverOverlay.classList.add('fb-hidden');
    if (!rafId) loop();
  }

  function die() {
    state = 'dead';

    // Bonus coins for score
    var bonus = Math.floor(score / 5);
    if (bonus > 0) {
      coinsCollected += bonus;
      if (typeof Wallet !== 'undefined') Wallet.add(bonus);
    }

    // Update stats
    stats.games++;
    stats.totalCoins += coinsCollected;
    stats.totalJB += jbCollected;
    stats.totalPipes += score;
    if (score > stats.best) stats.best = score;
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
        game: 'flappy',
        outcome: score > 0 ? 'win' : 'lose',
        bet: 0,
        payout: coinsCollected * COIN_VALUE
      });
    }

    // Show game over after short delay
    setTimeout(function () {
      gameoverOverlay.classList.remove('fb-hidden');
    }, 600);
  }

  // ── Pipe spawning ─────────────────────────────────
  function spawnPipe() {
    var minY = GAP_MARGIN;
    var maxY = CANVAS_H - GAP_MARGIN - pipeGap;
    var gapY = minY + Math.random() * (maxY - minY);

    pipes.push({
      x: CANVAS_W,
      gapY: gapY,
      gapH: pipeGap,
      scored: false
    });

    // Spawn coins (70% chance)
    if (Math.random() < 0.7) {
      var numCoins = 1 + Math.floor(Math.random() * 3);
      for (var i = 0; i < numCoins; i++) {
        coins.push({
          x: CANVAS_W + PIPE_WIDTH / 2 + (Math.random() - 0.5) * 30,
          y: gapY + pipeGap * (0.2 + Math.random() * 0.6),
          collected: false
        });
      }
    }

    // Spawn JB coin (7% chance, only if none on screen)
    var hasJB = false;
    for (var j = 0; j < jbCoins.length; j++) {
      if (!jbCoins[j].collected) { hasJB = true; break; }
    }
    if (!hasJB && Math.random() < 0.07) {
      jbCoins.push({
        x: CANVAS_W + PIPE_WIDTH / 2,
        y: gapY + pipeGap / 2,
        collected: false,
        pulse: 0
      });
    }
  }

  // ── Collision detection ───────────────────────────
  function birdRect() {
    // Slightly smaller hitbox for fairness
    var pad = 4;
    return {
      x: BIRD_X + pad,
      y: birdY + pad,
      w: BIRD_SIZE - pad * 2,
      h: BIRD_SIZE - pad * 2
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkCollisions() {
    var br = birdRect();

    // Floor (always lethal)
    if (birdY + BIRD_SIZE >= CANVAS_H) {
      die();
      return;
    }
    // Ceiling — clamp during grace, lethal after
    if (birdY <= 0) {
      if (graceTimer > 0) {
        birdY = 0;
        birdVel = 0;
      } else {
        die();
        return;
      }
    }

    // Pipes
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      // Top pipe
      var topPipe = { x: p.x, y: 0, w: PIPE_WIDTH, h: p.gapY };
      // Bottom pipe
      var botPipe = { x: p.x, y: p.gapY + p.gapH, w: PIPE_WIDTH, h: CANVAS_H - p.gapY - p.gapH };

      if (rectsOverlap(br, topPipe) || rectsOverlap(br, botPipe)) {
        die();
        return;
      }

      // Score
      if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
        p.scored = true;
        score++;
        updateHUD();

        // Increase difficulty every 10 points
        if (score % 10 === 0) {
          pipeSpeed = Math.min(pipeSpeed + 0.1, MAX_PIPE_SPEED);
          pipeGap = Math.max(pipeGap - 2, MIN_GAP);
        }
      }
    }

    // Coin collection
    var bcx = BIRD_X + BIRD_SIZE / 2;
    var bcy = birdY + BIRD_SIZE / 2;

    for (var c = 0; c < coins.length; c++) {
      if (coins[c].collected) continue;
      var dx = bcx - coins[c].x;
      var dy = bcy - coins[c].y;
      if (Math.sqrt(dx * dx + dy * dy) < BIRD_SIZE / 2 + COIN_RADIUS) {
        coins[c].collected = true;
        coinsCollected += COIN_VALUE;
        if (typeof Wallet !== 'undefined') Wallet.add(COIN_VALUE);
        updateHUD();
        particles.push({
          x: coins[c].x, y: coins[c].y,
          text: '+' + COIN_VALUE, color: colorAccent,
          life: 40, maxLife: 40
        });
      }
    }

    // JB coin collection
    for (var j = 0; j < jbCoins.length; j++) {
      if (jbCoins[j].collected) continue;
      var jdx = bcx - jbCoins[j].x;
      var jdy = bcy - jbCoins[j].y;
      if (Math.sqrt(jdx * jdx + jdy * jdy) < BIRD_SIZE / 2 + JB_RADIUS) {
        jbCoins[j].collected = true;
        jbCollected++;
        if (typeof JackBucks !== 'undefined') JackBucks.add(1);
        updateHUD();
        particles.push({
          x: jbCoins[j].x, y: jbCoins[j].y,
          text: 'JB+1', color: '#ffd700',
          life: 50, maxLife: 50
        });
        // Burst particles
        for (var b = 0; b < 8; b++) {
          var angle = (b / 8) * Math.PI * 2;
          particles.push({
            x: jbCoins[j].x, y: jbCoins[j].y,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
            text: null, color: '#ffd700',
            life: 20, maxLife: 20
          });
        }
      }
    }
  }

  // ── Update ────────────────────────────────────────
  function update() {
    if (state !== 'playing') return;

    // Grace period: softer gravity, no pipe spawning
    var inGrace = graceTimer > 0;
    if (inGrace) graceTimer--;

    var grav = inGrace ? GRAVITY * 0.5 : GRAVITY;
    birdVel = Math.min(birdVel + grav, MAX_FALL);
    birdY += birdVel;

    // Sprite animation tick
    animTick++;
    if (animTick >= 60 / ANIMATION_FPS) {
      animTick = 0;
      animFrame++;
    }

    // Move pipes (don't spawn new ones during grace)
    if (!inGrace) {
      distSinceLastPipe += pipeSpeed;
      if (distSinceLastPipe >= PIPE_SPAWN_DIST) {
        spawnPipe();
        distSinceLastPipe = 0;
      }
    }

    for (var i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipeSpeed;
      if (pipes[i].x + PIPE_WIDTH < -10) {
        pipes.splice(i, 1);
      }
    }

    // Move coins
    for (var c = coins.length - 1; c >= 0; c--) {
      coins[c].x -= pipeSpeed;
      if (coins[c].x < -20 || coins[c].collected) {
        if (coins[c].x < -20) coins.splice(c, 1);
      }
    }

    // Move JB coins
    for (var j = jbCoins.length - 1; j >= 0; j--) {
      jbCoins[j].x -= pipeSpeed;
      jbCoins[j].pulse += 0.1;
      if (jbCoins[j].x < -20 || jbCoins[j].collected) {
        if (jbCoins[j].x < -20) jbCoins.splice(j, 1);
      }
    }

    // Update particles
    for (var p = particles.length - 1; p >= 0; p--) {
      particles[p].life--;
      if (particles[p].vx !== undefined) {
        particles[p].x += particles[p].vx;
        particles[p].y += particles[p].vy;
      } else {
        particles[p].y -= 1;
      }
      if (particles[p].life <= 0) {
        particles.splice(p, 1);
      }
    }

    checkCollisions();
  }

  // ── Draw ──────────────────────────────────────────
  function draw() {
    // Clear
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Ground line
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 1);
    ctx.lineTo(CANVAS_W, CANVAS_H - 1);
    ctx.stroke();

    // Ceiling line
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(CANVAS_W, 1);
    ctx.stroke();

    // Pipes
    for (var i = 0; i < pipes.length; i++) {
      drawPipe(pipes[i]);
    }

    // Coins
    for (var c = 0; c < coins.length; c++) {
      if (!coins[c].collected) drawCoin(coins[c]);
    }

    // JB coins
    for (var j = 0; j < jbCoins.length; j++) {
      if (!jbCoins[j].collected) drawJBCoin(jbCoins[j]);
    }

    // Bird
    drawBird();

    // Particles
    for (var p = 0; p < particles.length; p++) {
      drawParticle(particles[p]);
    }

    // Score display on canvas (large, centered)
    if (state === 'playing') {
      ctx.save();
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = colorFg;
      ctx.globalAlpha = 0.15;
      ctx.fillText(String(score), CANVAS_W / 2, 70);
      ctx.restore();

      // Grace period "GET READY" indicator
      if (graceTimer > 0) {
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = colorAccent;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(graceTimer * 0.1);
        ctx.fillText('GET READY', CANVAS_W / 2, CANVAS_H / 4);
        ctx.restore();
      }
    }
  }

  function drawPipe(p) {
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.25;

    // Top pipe body
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapY);
    // Bottom pipe body
    ctx.fillRect(p.x, p.gapY + p.gapH, PIPE_WIDTH, CANVAS_H - p.gapY - p.gapH);

    ctx.globalAlpha = 1;

    // Top pipe border
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.gapY);
    // Top pipe lip
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(p.x - PIPE_LIP, p.gapY - PIPE_LIP_H, PIPE_WIDTH + PIPE_LIP * 2, PIPE_LIP_H);
    ctx.globalAlpha = 1;
    ctx.strokeRect(p.x - PIPE_LIP, p.gapY - PIPE_LIP_H, PIPE_WIDTH + PIPE_LIP * 2, PIPE_LIP_H);

    // Bottom pipe border
    ctx.strokeRect(p.x, p.gapY + p.gapH, PIPE_WIDTH, CANVAS_H - p.gapY - p.gapH);
    // Bottom pipe lip
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(p.x - PIPE_LIP, p.gapY + p.gapH, PIPE_WIDTH + PIPE_LIP * 2, PIPE_LIP_H);
    ctx.globalAlpha = 1;
    ctx.strokeRect(p.x - PIPE_LIP, p.gapY + p.gapH, PIPE_WIDTH + PIPE_LIP * 2, PIPE_LIP_H);
  }

  function drawBird() {
    ctx.save();

    var cx = BIRD_X + BIRD_SIZE / 2;
    var cy = birdY + BIRD_SIZE / 2;

    // Rotation based on velocity
    var rot = 0;
    if (state === 'playing') {
      rot = Math.max(-0.5, Math.min(birdVel / MAX_FALL * 0.8, 1.2));
    }

    ctx.translate(cx, cy);
    ctx.rotate(rot);

    if (spriteFrames.length > 0) {
      var fi = animFrame % spriteFrames.length;
      var spr = spriteFrames[fi];
      ctx.drawImage(spr, -RENDER_SIZE / 2, -RENDER_SIZE / 2, RENDER_SIZE, RENDER_SIZE);
    } else {
      // Fallback arrow shape
      ctx.fillStyle = colorFg;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>', 0, 0);
    }

    ctx.restore();
  }

  function drawCoin(c) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, COIN_RADIUS, 0, Math.PI * 2);
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
    ctx.fillText('$', c.x, c.y);
    ctx.restore();
  }

  function drawJBCoin(j) {
    ctx.save();
    var pulseR = JB_RADIUS + Math.sin(j.pulse) * 2;

    // Glow
    ctx.beginPath();
    ctx.arc(j.x, j.y, pulseR + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.15;
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(j.x, j.y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('JB', j.x, j.y);
    ctx.restore();
  }

  function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    if (p.text) {
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.restore();
  }

  // ── Game loop ─────────────────────────────────────
  function loop() {
    update();
    draw();
    if (state === 'playing') {
      rafId = requestAnimationFrame(loop);
    } else if (state === 'dead') {
      // Draw one more frame showing final state
      rafId = null;
    } else {
      rafId = null;
    }
  }

  // ── Input ─────────────────────────────────────────
  function onKeyDown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      flap();
    }
  }

  function onCanvasClick(e) {
    e.preventDefault();
    flap();
  }

  function onCanvasTouch(e) {
    e.preventDefault();
    flap();
  }

  document.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: false });

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

  // ── Resize handling ─────────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      sizeCanvas();
      if (state === 'idle') drawIdleScreen();
    }, 150);
  });

  // ── Theme reactivity ──────────────────────────────
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

  // ── Init ──────────────────────────────────────────
  loadPetInfo();
  loadSpriteData(function () {
    resolveColors();
    renderPetPreview();
    updateStatsUI();

    // Draw idle screen (bird bobbing)
    drawIdleScreen();
  });

  function drawIdleScreen() {
    birdY = CANVAS_H / 2 - BIRD_SIZE / 2;
    draw();
  }
})();
