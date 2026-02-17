(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var GRID_COLS = 16;
  var GRID_ROWS = 12;
  var TILE_SIZE = 40; // logical pixels per tile

  // Map 1: S-curve path (waypoints as [col, row])
  var MAP_1 = {
    path: [[0, 6], [3, 6], [3, 2], [8, 2], [8, 8], [12, 8], [12, 4], [15, 4]],
    spawn: [0, 6],
    exit: [15, 4]
  };

  var TOWER_DEFS = {
    arrow: { symbol: 'A', dmg: 5, range: 3, speed: 1.0, cost: 10, color: null }
  };

  var ENEMY_DEFS = {
    slime: { hp: 20, speed: 1.0, radius: 6, color: '#4a4' }
  };

  var START_LIVES = 20;
  var START_JB = 50;
  var SPAWN_INTERVAL = 0.8; // seconds between spawns
  var PROJECTILE_SPEED = 6; // tiles per second
  var STATS_KEY = 'arebooksgood-td-stats';

  // ── DOM refs ──────────────────────────────────────
  var canvas = document.getElementById('td-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var gameArea = document.getElementById('td-game-area');
  var canvasWrap = document.getElementById('td-canvas-wrap');

  var hudWave = document.getElementById('td-wave');
  var hudLives = document.getElementById('td-lives');
  var hudJB = document.getElementById('td-jb');
  var hudEnemies = document.getElementById('td-enemies');

  var startOverlay = document.getElementById('td-start-overlay');
  var gameoverOverlay = document.getElementById('td-gameover-overlay');
  var playBtn = document.getElementById('td-play-btn');
  var retryBtn = document.getElementById('td-retry-btn');
  var waveBtn = document.getElementById('td-wave-btn');

  var finalWave = document.getElementById('td-final-wave');
  var finalKills = document.getElementById('td-final-kills');
  var finalTowers = document.getElementById('td-final-towers');
  var finalJBEl = document.getElementById('td-final-jb');

  var startStats = document.getElementById('td-start-stats');
  var goStats = document.getElementById('td-gameover-stats');

  var towerBtns = document.querySelectorAll('.td-tower-btn');

  // ── Dynamic canvas sizing ─────────────────────────
  var CANVAS_W = GRID_COLS * TILE_SIZE; // 640
  var CANVAS_H = GRID_ROWS * TILE_SIZE; // 480
  var dpr = window.devicePixelRatio || 1;
  var scale = 1; // CSS scale factor applied to canvas

  function sizeCanvas() {
    var containerW = canvasWrap.clientWidth || 640;
    scale = containerW / CANVAS_W;

    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = containerW + 'px';
    canvas.style.height = Math.round(CANVAS_H * scale) + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  sizeCanvas();

  // ── Theme colors ──────────────────────────────────
  var colorBg = '#000';
  var colorFg = '#fff';
  var colorAccent = '#0f0';

  function resolveColors() {
    var s = getComputedStyle(document.documentElement);
    colorBg = s.getPropertyValue('--background').trim() || '#000';
    colorFg = s.getPropertyValue('--foreground').trim() || '#fff';
    colorAccent = s.getPropertyValue('--accent').trim() || '#0f0';
  }

  resolveColors();

  // ── Game state ────────────────────────────────────
  var gameState = 'idle'; // idle | building | waving | gameover
  var wave = 0;
  var lives = START_LIVES;
  var jb = START_JB;
  var jbEarned = 0; // total JB earned this game (for stats)
  var towers = [];
  var enemies = [];
  var projectiles = [];
  var particles = [];
  var selectedTower = 'arrow';
  var hoverTile = null; // {col, row}
  var spawnQueue = [];
  var spawnTimer = 0;
  var totalSpawned = 0;
  var totalKilled = 0;
  var towersBuilt = 0;
  var rafId = null;
  var lastTime = 0;

  // ── Path computation ──────────────────────────────
  var pathTiles = {}; // "col,row" → true
  var pathSegments = []; // [{x1,y1,x2,y2,len}] in pixel coords (tile centers)
  var pathTotalLen = 0;

  function computePath() {
    pathTiles = {};
    pathSegments = [];
    pathTotalLen = 0;

    var wp = MAP_1.path;

    // Mark all tiles along the path
    for (var i = 0; i < wp.length - 1; i++) {
      var c1 = wp[i][0], r1 = wp[i][1];
      var c2 = wp[i + 1][0], r2 = wp[i + 1][1];
      var dc = c2 > c1 ? 1 : (c2 < c1 ? -1 : 0);
      var dr = r2 > r1 ? 1 : (r2 < r1 ? -1 : 0);
      var c = c1, r = r1;
      while (true) {
        pathTiles[c + ',' + r] = true;
        if (c === c2 && r === r2) break;
        c += dc;
        r += dr;
      }
    }

    // Build segments in pixel coords (tile centers)
    for (var j = 0; j < wp.length - 1; j++) {
      var x1 = wp[j][0] * TILE_SIZE + TILE_SIZE / 2;
      var y1 = wp[j][1] * TILE_SIZE + TILE_SIZE / 2;
      var x2 = wp[j + 1][0] * TILE_SIZE + TILE_SIZE / 2;
      var y2 = wp[j + 1][1] * TILE_SIZE + TILE_SIZE / 2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      pathSegments.push({ x1: x1, y1: y1, x2: x2, y2: y2, len: len });
      pathTotalLen += len;
    }
  }

  function isPathTile(col, row) {
    return pathTiles[col + ',' + row] === true;
  }

  function isBuildable(col, row) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (isPathTile(col, row)) return false;
    for (var i = 0; i < towers.length; i++) {
      if (towers[i].col === col && towers[i].row === row) return false;
    }
    return true;
  }

  function tileCenter(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  function pixelToTile(px, py) {
    return { col: Math.floor(px / TILE_SIZE), row: Math.floor(py / TILE_SIZE) };
  }

  // Get position along path at distance d from start
  function getPathPos(d) {
    var acc = 0;
    for (var i = 0; i < pathSegments.length; i++) {
      var seg = pathSegments[i];
      if (acc + seg.len >= d) {
        var t = (d - acc) / seg.len;
        return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t };
      }
      acc += seg.len;
    }
    // Past end
    var last = pathSegments[pathSegments.length - 1];
    return { x: last.x2, y: last.y2 };
  }

  // ── Enemies ───────────────────────────────────────
  function spawnEnemy(type) {
    var def = ENEMY_DEFS[type];
    enemies.push({
      type: type,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      radius: def.radius,
      color: def.color,
      dist: 0, // distance traveled along path
      alive: true
    });
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) continue;

      // Move along path
      var pxPerSec = e.speed * TILE_SIZE * 1.5;
      e.dist += pxPerSec * dt;

      // Check if reached exit
      if (e.dist >= pathTotalLen) {
        e.alive = false;
        lives--;
        // Spawn leak particle
        var exitPos = getPathPos(pathTotalLen);
        spawnParticle(exitPos.x, exitPos.y, '-1 ♥', '#e55');
        if (lives <= 0) {
          lives = 0;
          gameOver();
          return;
        }
      }
    }

    // Remove dead enemies
    for (var j = enemies.length - 1; j >= 0; j--) {
      if (!enemies[j].alive) enemies.splice(j, 1);
    }
  }

  function damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    var pos = getPathPos(enemy.dist);

    // Damage number particle
    spawnParticle(pos.x + (Math.random() - 0.5) * 10, pos.y - 12, '-' + dmg, colorFg);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      totalKilled++;

      // Death burst particles
      for (var i = 0; i < 5; i++) {
        particles.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          text: null,
          color: enemy.color,
          life: 20,
          maxLife: 20
        });
      }
    }
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var pos = getPathPos(e.dist);

      // Body circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();

      // Outline
      ctx.strokeStyle = colorFg;
      ctx.lineWidth = 1;
      ctx.stroke();

      // HP bar
      if (e.hp < e.maxHp) {
        var barW = e.radius * 2.5;
        var barH = 3;
        var barX = pos.x - barW / 2;
        var barY = pos.y - e.radius - 6;
        var pct = e.hp / e.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = pct > 0.5 ? '#4a4' : (pct > 0.25 ? '#da4' : '#e44');
        ctx.fillRect(barX, barY, barW * pct, barH);
      }
    }
  }

  // ── Towers ────────────────────────────────────────
  function placeTower(col, row, type) {
    var def = TOWER_DEFS[type];
    if (jb < def.cost) return false;
    if (!isBuildable(col, row)) return false;

    jb -= def.cost;
    towersBuilt++;
    towers.push({
      col: col,
      row: row,
      type: type,
      cooldown: 0
    });
    updateHUD();
    return true;
  }

  function updateTowers(dt) {
    for (var i = 0; i < towers.length; i++) {
      var t = towers[i];
      var def = TOWER_DEFS[t.type];

      // Reduce cooldown
      if (t.cooldown > 0) {
        t.cooldown -= dt;
        continue;
      }

      // Find target
      var target = findTarget(t);
      if (target) {
        fireProjectile(t, target);
        t.cooldown = def.speed;
      }
    }
  }

  function findTarget(tower) {
    var def = TOWER_DEFS[tower.type];
    var tc = tileCenter(tower.col, tower.row);
    var rangePx = def.range * TILE_SIZE;
    var best = null;
    var bestDist = Infinity;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var pos = getPathPos(e.dist);
      var dx = pos.x - tc.x;
      var dy = pos.y - tc.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= rangePx && d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  function drawTowers() {
    for (var i = 0; i < towers.length; i++) {
      var t = towers[i];
      var def = TOWER_DEFS[t.type];
      var tc = tileCenter(t.col, t.row);

      // Tower base square
      var half = TILE_SIZE * 0.35;
      ctx.fillStyle = colorAccent;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(tc.x - half, tc.y - half, half * 2, half * 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colorAccent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);

      // Letter label
      ctx.fillStyle = colorFg;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, tc.x, tc.y);

      // Range circle on hover
      if (hoverTile && hoverTile.col === t.col && hoverTile.row === t.row) {
        var rangePx = def.range * TILE_SIZE;
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
        ctx.strokeStyle = colorAccent;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Projectiles ───────────────────────────────────
  function fireProjectile(tower, target) {
    var tc = tileCenter(tower.col, tower.row);
    projectiles.push({
      x: tc.x,
      y: tc.y,
      target: target,
      dmg: TOWER_DEFS[tower.type].dmg,
      speed: PROJECTILE_SPEED * TILE_SIZE // px/sec
    });
  }

  function updateProjectiles(dt) {
    for (var i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];

      // If target is dead, remove projectile
      if (!p.target.alive) {
        projectiles.splice(i, 1);
        continue;
      }

      var targetPos = getPathPos(p.target.dist);
      var dx = targetPos.x - p.x;
      var dy = targetPos.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        // Hit
        damageEnemy(p.target, p.dmg);
        projectiles.splice(i, 1);
      } else {
        // Move toward target
        var move = p.speed * dt;
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
      }
    }
  }

  function drawProjectiles() {
    ctx.fillStyle = colorFg;
    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Particles ─────────────────────────────────────
  function spawnParticle(x, y, text, color) {
    particles.push({
      x: x,
      y: y,
      vx: 0,
      vy: -1,
      text: text,
      color: color,
      life: 40,
      maxLife: 40
    });
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life--;
      p.x += (p.vx || 0);
      p.y += (p.vy || 0);
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      if (p.text) {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.restore();
    }
  }

  // ── Waves ─────────────────────────────────────────
  function startWave() {
    wave++;
    var count = 5 + Math.floor(wave * 1.5);
    var hpMult = 1 + wave * 0.15;
    var baseHp = ENEMY_DEFS.slime.hp;

    spawnQueue = [];
    for (var i = 0; i < count; i++) {
      spawnQueue.push({
        type: 'slime',
        hp: Math.round(baseHp * hpMult)
      });
    }
    totalSpawned = 0;
    spawnTimer = 0;
    gameState = 'waving';
    waveBtn.disabled = true;
    waveBtn.textContent = 'Wave ' + wave;
    updateHUD();
  }

  function updateSpawner(dt) {
    if (spawnQueue.length === 0) return;
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnTimer -= SPAWN_INTERVAL;
      var next = spawnQueue.shift();

      // Spawn enemy with scaled HP
      var def = ENEMY_DEFS[next.type];
      enemies.push({
        type: next.type,
        hp: next.hp,
        maxHp: next.hp,
        speed: def.speed,
        radius: def.radius,
        color: def.color,
        dist: 0,
        alive: true
      });
      totalSpawned++;
      updateHUD();
    }
  }

  function checkWaveComplete() {
    if (gameState !== 'waving') return;
    if (spawnQueue.length > 0) return;
    // All spawned — check if all dead or leaked
    var aliveCount = 0;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) aliveCount++;
    }
    if (aliveCount === 0) {
      endWave();
    }
  }

  function endWave() {
    var reward = 5 + wave * 2;
    jb += reward;
    jbEarned += reward;

    // Award real JackBucks
    if (typeof JackBucks !== 'undefined' && JackBucks.add) {
      JackBucks.add(reward);
    }

    // JB reward particle
    spawnParticle(CANVAS_W / 2, CANVAS_H / 2, '+' + reward + ' JB', '#ffd700');

    gameState = 'building';
    waveBtn.disabled = false;
    waveBtn.textContent = 'Start Wave ' + (wave + 1);
    updateTowerBtnStates();
    updateHUD();
  }

  // ── Game over ─────────────────────────────────────
  function gameOver() {
    gameState = 'gameover';
    waveBtn.disabled = true;

    // Update stats
    stats.gamesPlayed++;
    stats.totalKills += totalKilled;
    stats.totalTowersBuilt += towersBuilt;
    stats.totalJBEarned += jbEarned;
    if (wave > stats.highestWave) stats.highestWave = wave;
    saveStats();

    // Pet reaction
    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'tower-defense',
        outcome: wave >= 5 ? 'win' : 'lose',
        bet: 0,
        payout: jbEarned
      });
    }

    // Show game over overlay after short delay
    setTimeout(function () {
      if (finalWave) finalWave.textContent = wave;
      if (finalKills) finalKills.textContent = totalKilled;
      if (finalTowers) finalTowers.textContent = towersBuilt;
      if (finalJBEl) finalJBEl.textContent = jbEarned;
      renderStatsBlock(goStats);
      gameoverOverlay.classList.remove('td-hidden');
    }, 500);
  }

  // ── Stats ─────────────────────────────────────────
  var stats = loadStats();

  function defaultStats() {
    return { gamesPlayed: 0, highestWave: 0, totalKills: 0, totalTowersBuilt: 0, totalJBEarned: 0 };
  }

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        return {
          gamesPlayed: s.gamesPlayed || 0,
          highestWave: s.highestWave || 0,
          totalKills: s.totalKills || 0,
          totalTowersBuilt: s.totalTowersBuilt || 0,
          totalJBEarned: s.totalJBEarned || 0
        };
      }
    } catch (e) {}
    return defaultStats();
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function renderStatsBlock(el) {
    if (!el) return;
    el.innerHTML = 'Games: ' + stats.gamesPlayed +
      ' | Best Wave: ' + stats.highestWave +
      ' | Total Kills: ' + stats.totalKills +
      ' | Total JB: ' + stats.totalJBEarned;
  }

  // ── HUD ───────────────────────────────────────────
  function updateHUD() {
    if (hudWave) hudWave.textContent = 'Wave: ' + (wave || '—');
    if (hudLives) hudLives.textContent = '\u2665 ' + lives;
    if (hudJB) hudJB.textContent = 'JB: ' + jb;
    if (hudEnemies) {
      var alive = 0;
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) alive++;
      }
      var total = totalSpawned + spawnQueue.length;
      hudEnemies.textContent = alive + '/' + total;
    }
  }

  function updateTowerBtnStates() {
    for (var i = 0; i < towerBtns.length; i++) {
      var btn = towerBtns[i];
      var type = btn.getAttribute('data-tower');
      if (!type) continue;
      var def = TOWER_DEFS[type];
      if (def && jb < def.cost) {
        btn.classList.add('td-tower-btn-disabled');
      } else {
        btn.classList.remove('td-tower-btn-disabled');
      }
    }
  }

  // ── Drawing ───────────────────────────────────────
  function drawGrid() {
    // Grid lines
    ctx.strokeStyle = colorFg;
    ctx.globalAlpha = 0.06;
    ctx.lineWidth = 0.5;
    for (var c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE_SIZE, 0);
      ctx.lineTo(c * TILE_SIZE, CANVAS_H);
      ctx.stroke();
    }
    for (var r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(CANVAS_W, r * TILE_SIZE);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPath() {
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.12;
    for (var key in pathTiles) {
      var parts = key.split(',');
      var c = parseInt(parts[0], 10);
      var r = parseInt(parts[1], 10);
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    ctx.globalAlpha = 1;

    // Path direction arrows (subtle)
    ctx.fillStyle = colorAccent;
    ctx.globalAlpha = 0.15;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var wp = MAP_1.path;
    for (var i = 0; i < wp.length - 1; i++) {
      var c1 = wp[i][0], r1 = wp[i][1];
      var c2 = wp[i + 1][0], r2 = wp[i + 1][1];
      var dc = c2 > c1 ? 1 : (c2 < c1 ? -1 : 0);
      var dr = r2 > r1 ? 1 : (r2 < r1 ? -1 : 0);
      var arrow = dc > 0 ? '\u25B6' : dc < 0 ? '\u25C0' : dr > 0 ? '\u25BC' : '\u25B2';
      var c = c1, r = r1;
      var step = 0;
      while (true) {
        if (step % 2 === 0) {
          var tc = tileCenter(c, r);
          ctx.fillText(arrow, tc.x, tc.y);
        }
        if (c === c2 && r === r2) break;
        c += dc;
        r += dr;
        step++;
      }
    }
    ctx.globalAlpha = 1;

    // Spawn / Exit labels
    ctx.font = 'bold 10px monospace';
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = colorAccent;
    var spawnTC = tileCenter(MAP_1.spawn[0], MAP_1.spawn[1]);
    ctx.textAlign = 'right';
    ctx.fillText('IN', spawnTC.x - 4, spawnTC.y);
    var exitTC = tileCenter(MAP_1.exit[0], MAP_1.exit[1]);
    ctx.textAlign = 'left';
    ctx.fillText('OUT', exitTC.x + TILE_SIZE / 2 + 2, exitTC.y);
    ctx.globalAlpha = 1;
  }

  function drawGhostTower() {
    if (gameState === 'gameover' || gameState === 'idle') return;
    if (!hoverTile || !selectedTower) return;
    var c = hoverTile.col;
    var r = hoverTile.row;
    var buildable = isBuildable(c, r);
    var def = TOWER_DEFS[selectedTower];
    var tc = tileCenter(c, r);

    // Ghost tile highlight
    ctx.fillStyle = buildable ? colorAccent : '#e44';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1;

    if (buildable) {
      // Ghost tower
      var half = TILE_SIZE * 0.35;
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);

      // Letter
      ctx.fillStyle = colorFg;
      ctx.globalAlpha = 0.4;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, tc.x, tc.y);

      // Range circle
      var rangePx = def.range * TILE_SIZE;
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── Game loop ─────────────────────────────────────
  function update(dt) {
    if (gameState === 'waving') {
      updateSpawner(dt);
      updateEnemies(dt);
      updateTowers(dt);
      updateProjectiles(dt);
      checkWaveComplete();
    }
    updateParticles(dt);
  }

  function draw() {
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawGrid();
    drawPath();
    drawGhostTower();
    drawTowers();
    drawEnemies();
    drawProjectiles();
    drawParticles();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp dt to avoid huge jumps (e.g. when tab was hidden)
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();
    updateHUD();

    if (gameState === 'building' || gameState === 'waving') {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  // ── Input ─────────────────────────────────────────
  function canvasCoords(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }

  canvas.addEventListener('click', function (e) {
    if (gameState === 'idle' || gameState === 'gameover') return;

    var coords = canvasCoords(e);
    var tile = pixelToTile(coords.x, coords.y);

    if (selectedTower && isBuildable(tile.col, tile.row)) {
      var def = TOWER_DEFS[selectedTower];
      if (jb >= def.cost) {
        placeTower(tile.col, tile.row, selectedTower);
        updateTowerBtnStates();
      }
    }
  });

  canvas.addEventListener('mousemove', function (e) {
    var coords = canvasCoords(e);
    hoverTile = pixelToTile(coords.x, coords.y);
  });

  canvas.addEventListener('mouseleave', function () {
    hoverTile = null;
  });

  // Tower button selection
  for (var i = 0; i < towerBtns.length; i++) {
    towerBtns[i].addEventListener('click', function (e) {
      var type = this.getAttribute('data-tower');
      if (!type) return;
      selectedTower = type;
      for (var j = 0; j < towerBtns.length; j++) {
        towerBtns[j].classList.remove('td-tower-btn-selected');
      }
      this.classList.add('td-tower-btn-selected');
    });
  }

  // Wave button
  if (waveBtn) {
    waveBtn.addEventListener('click', function () {
      if (gameState === 'building') {
        startWave();
      }
    });
  }

  // Play / Retry buttons
  function startGame() {
    // Reset all state
    wave = 0;
    lives = START_LIVES;
    jb = START_JB;
    jbEarned = 0;
    towers = [];
    enemies = [];
    projectiles = [];
    particles = [];
    spawnQueue = [];
    totalSpawned = 0;
    totalKilled = 0;
    towersBuilt = 0;
    hoverTile = null;
    lastTime = 0;

    gameState = 'building';
    startOverlay.classList.add('td-hidden');
    gameoverOverlay.classList.add('td-hidden');
    waveBtn.disabled = false;
    waveBtn.textContent = 'Start Wave 1';
    updateTowerBtnStates();
    updateHUD();

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); startGame(); });
  if (retryBtn) retryBtn.addEventListener('click', function (e) { e.stopPropagation(); startGame(); });

  // ── Resize handling ─────────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      sizeCanvas();
      if (gameState === 'idle') drawIdle();
    }, 150);
  });

  // ── Theme reactivity ──────────────────────────────
  var themeObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'data-theme') {
        resolveColors();
        break;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  // ── Init ──────────────────────────────────────────
  computePath();
  renderStatsBlock(startStats);
  updateHUD();
  drawIdle();

  function drawIdle() {
    draw();
  }
})();
