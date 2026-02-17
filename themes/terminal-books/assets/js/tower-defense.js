(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var GRID_COLS = 16;
  var GRID_ROWS = 12;
  var TILE_SIZE = 40;

  var MAP_1 = {
    path: [[0, 6], [3, 6], [3, 2], [8, 2], [8, 8], [12, 8], [12, 4], [15, 4]],
    spawn: [0, 6],
    exit: [15, 4]
  };

  var TOWER_DEFS = {
    arrow:      { symbol: 'A',  name: 'Arrow',      dmg: 5,  range: 3, speed: 1.0, cost: 10, color: null,     blueprint: false },
    watchtower: { symbol: 'Wt', name: 'Watchtower',  dmg: 0,  range: 3, speed: 0,   cost: 15, color: '#aaa',   blueprint: true, unlockCost: { processed: { stoneBricks: 1 } }, waveReq: 10 },
    fire:       { symbol: 'Fi', name: 'Fire',        dmg: 10, range: 2, speed: 1.2, cost: 30, color: '#f84',   blueprint: true, unlockCost: { raw: { hardwood: 2 } }, waveReq: 15 },
    sniper:     { symbol: 'S',  name: 'Sniper',      dmg: 25, range: 5, speed: 3.0, cost: 50, color: '#8cf',   blueprint: true, unlockCost: { processed: { ironBars: 2 } }, waveReq: 20 },
    goldmine:   { symbol: 'G',  name: 'Gold Mine',   dmg: 0,  range: 0, speed: 0,   cost: 40, color: '#ffd700',blueprint: true, unlockCost: { raw: { gold: 1 } }, waveReq: 25 },
    lightning:  { symbol: 'L',  name: 'Lightning',   dmg: 15, range: 3, speed: 2.5, cost: 60, color: '#ff0',   blueprint: true, unlockCost: { processed: { crystalLens: 1 } }, waveReq: 30 }
  };

  var ENEMY_DEFS = {
    slime: { hp: 20, speed: 1.0, radius: 6, color: '#4a4' }
  };

  var START_LIVES = 20;
  var START_JB = 50;
  var SPAWN_INTERVAL = 0.8;
  var PROJECTILE_SPEED = 6;
  var STATS_KEY = 'arebooksgood-td-stats';
  var CRATE_KEY = 'arebooksgood-td-crate';

  // ── Farm integration guard ────────────────────────
  var hasFarmResources = typeof window.FarmResources !== 'undefined';

  // ── Armory ────────────────────────────────────────
  var ARMORY_KEY = 'arebooksgood-td-armory';
  var ARMORY_DEFS = {
    reinforcedWalls:   { name: 'Reinforced Walls',   desc: '+2 starting lives/tier',    maxTier: 3, baseCost: { processed: { stoneBricks: 5 } } },
    sharpenedArrows:   { name: 'Sharpened Arrows',   desc: '+10% arrow damage/tier',    maxTier: 3, baseCost: { processed: { planks: 3, ironBars: 1 } } },
    sturdyFoundations: { name: 'Sturdy Foundations',  desc: '-10% tower build cost/tier', maxTier: 3, baseCost: { processed: { planks: 4, stoneBricks: 3 } } },
    supplyLines:       { name: 'Supply Lines',        desc: '+5 starting JB/tier',       maxTier: 3, baseCost: { processed: { bread: 3, rope: 2 } } },
    crystalOptics:     { name: 'Crystal Optics',      desc: '+15% tower range/tier',     maxTier: 3, baseCost: { processed: { crystalLens: 2 } } },
    goldenTreasury:    { name: 'Golden Treasury',     desc: '+20% wave JB rewards/tier', maxTier: 3, baseCost: { raw: { gold: 2 } } },
    hardenedSteel:     { name: 'Hardened Steel',      desc: 'Unlock tower Lv4 tier',     maxTier: 1, baseCost: { processed: { ironBars: 4 }, raw: { hardwood: 2 } } },
    arcaneMastery:     { name: 'Arcane Mastery',      desc: 'Unlock special abilities',  maxTier: 1, baseCost: { processed: { crystalLens: 3 }, raw: { gold: 2 } } }
  };

  var COST_MULTIPLIERS = [1, 1.5, 2];

  function loadArmory() {
    try {
      var raw = localStorage.getItem(ARMORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function saveArmory() {
    try { localStorage.setItem(ARMORY_KEY, JSON.stringify(armory)); } catch (e) {}
  }

  var armory = loadArmory();

  function getArmoryTier(key) {
    return armory[key] || 0;
  }

  function getUpgradeCost(key) {
    var def = ARMORY_DEFS[key];
    var tier = getArmoryTier(key);
    if (tier >= def.maxTier) return null;
    var mult = COST_MULTIPLIERS[tier] || 1;
    var cost = { raw: {}, processed: {} };
    if (def.baseCost.raw) {
      var rk = Object.keys(def.baseCost.raw);
      for (var i = 0; i < rk.length; i++) {
        cost.raw[rk[i]] = Math.ceil(def.baseCost.raw[rk[i]] * mult);
      }
    }
    if (def.baseCost.processed) {
      var pk = Object.keys(def.baseCost.processed);
      for (var j = 0; j < pk.length; j++) {
        cost.processed[pk[j]] = Math.ceil(def.baseCost.processed[pk[j]] * mult);
      }
    }
    return cost;
  }

  function canAffordCost(cost) {
    if (!hasFarmResources) return false;
    var res = window.FarmResources.getAll();
    if (cost.raw) {
      var rk = Object.keys(cost.raw);
      for (var i = 0; i < rk.length; i++) {
        if ((res.raw[rk[i]] || 0) < cost.raw[rk[i]]) return false;
      }
    }
    if (cost.processed) {
      var pk = Object.keys(cost.processed);
      for (var j = 0; j < pk.length; j++) {
        if ((res.processed[pk[j]] || 0) < cost.processed[pk[j]]) return false;
      }
    }
    return true;
  }

  function deductCost(cost) {
    if (!hasFarmResources) return;
    if (cost.raw) {
      var rk = Object.keys(cost.raw);
      for (var i = 0; i < rk.length; i++) {
        window.FarmResources.deduct('raw', rk[i], cost.raw[rk[i]]);
      }
    }
    if (cost.processed) {
      var pk = Object.keys(cost.processed);
      for (var j = 0; j < pk.length; j++) {
        window.FarmResources.deduct('processed', pk[j], cost.processed[pk[j]]);
      }
    }
  }

  function refundCost(cost) {
    if (!hasFarmResources) return;
    if (cost.raw) {
      var rk = Object.keys(cost.raw);
      for (var i = 0; i < rk.length; i++) {
        window.FarmResources.add('raw', rk[i], cost.raw[rk[i]]);
      }
    }
    if (cost.processed) {
      var pk = Object.keys(cost.processed);
      for (var j = 0; j < pk.length; j++) {
        window.FarmResources.add('processed', pk[j], cost.processed[pk[j]]);
      }
    }
  }

  function canAffordUpgrade(key) {
    var cost = getUpgradeCost(key);
    if (!cost) return false;
    return canAffordCost(cost);
  }

  function purchaseUpgrade(key) {
    var cost = getUpgradeCost(key);
    if (!cost) return false;
    if (!canAffordCost(cost)) return false;
    deductCost(cost);
    armory[key] = (armory[key] || 0) + 1;
    saveArmory();
    mods = computeModifiers();
    return true;
  }

  function computeModifiers() {
    return {
      startLives: getArmoryTier('reinforcedWalls') * 2,
      dmgMult: 1 + getArmoryTier('sharpenedArrows') * 0.1,
      costMult: 1 - getArmoryTier('sturdyFoundations') * 0.1,
      startJB: getArmoryTier('supplyLines') * 5,
      rangeMult: 1 + getArmoryTier('crystalOptics') * 0.15,
      rewardMult: 1 + getArmoryTier('goldenTreasury') * 0.2,
      towerLv4: getArmoryTier('hardenedSteel') >= 1,
      specialAbilities: getArmoryTier('arcaneMastery') >= 1
    };
  }

  var mods = computeModifiers();

  // ── Supply Crate ──────────────────────────────────
  var CRATE_DEFS = {
    bread:        { name: 'Bread',         cost: { processed: { bread: 1 } },       desc: 'Heal +3 lives' },
    smokedFish:   { name: 'Smoked Fish',   cost: { processed: { smokedFish: 1 } },  desc: '+30% atk speed 30s' },
    ropeTrap:     { name: 'Rope Trap',     cost: { processed: { rope: 2 } },        desc: 'Slow enemies 50% one wave' },
    ironCaltrops: { name: 'Iron Caltrops', cost: { processed: { ironBars: 2 } },    desc: '15 dmg to crossing enemies' },
    milkFlask:    { name: 'Milk Flask',    cost: { raw: { milk: 3 } },              desc: 'Reset all tower cooldowns' },
    crystalBomb:  { name: 'Crystal Bomb',  cost: { processed: { crystalLens: 1 } }, desc: '50% HP to all enemies' },
    goldenShield: { name: 'Golden Shield', cost: { raw: { gold: 1 } },              desc: 'Block next 3 leaks' }
  };

  var BASE_CRATE_SLOTS = 3;
  var crate = [];           // loaded items (strings = keys from CRATE_DEFS)
  var crateUsed = {};       // which items used this run

  function saveCrate() {
    try { localStorage.setItem(CRATE_KEY, JSON.stringify(crate)); } catch (e) {}
  }
  function loadSavedCrate() {
    try {
      var raw = localStorage.getItem(CRATE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }
  crate = loadSavedCrate();
  var shieldCharges = 0;
  var atkSpeedActive = false;
  var atkSpeedTimer = 0;
  var ropeTrapActive = false;
  var caltropZones = [];    // [{col, row, hits: Set}]

  function loadCrate(itemKey) {
    if (crate.length >= BASE_CRATE_SLOTS) return false;
    var def = CRATE_DEFS[itemKey];
    if (!def) return false;
    if (!canAffordCost(def.cost)) return false;
    deductCost(def.cost);
    crate.push(itemKey);
    saveCrate();
    return true;
  }

  function unloadCrate(index) {
    if (index < 0 || index >= crate.length) return false;
    var itemKey = crate[index];
    var def = CRATE_DEFS[itemKey];
    if (def) refundCost(def.cost);
    crate.splice(index, 1);
    saveCrate();
    return true;
  }

  function commitCrate() {
    // Called on game start — materials already deducted, no refunds after this
    try { localStorage.removeItem(CRATE_KEY); } catch (e) {}
  }

  function useCrateItem(itemKey) {
    if (crateUsed[itemKey]) return false;
    crateUsed[itemKey] = true;

    if (itemKey === 'bread') {
      var maxLives = START_LIVES + mods.startLives;
      lives = Math.min(lives + 3, maxLives);
      spawnParticle(CANVAS_W / 2, CANVAS_H / 2, '+3 \u2665', '#4f4');
    } else if (itemKey === 'smokedFish') {
      atkSpeedActive = true;
      atkSpeedTimer = 30;
    } else if (itemKey === 'ropeTrap') {
      ropeTrapActive = true;
    } else if (itemKey === 'ironCaltrops') {
      placingCaltrops = true;
    } else if (itemKey === 'milkFlask') {
      for (var i = 0; i < towers.length; i++) {
        towers[i].cooldown = 0;
      }
      spawnParticle(CANVAS_W / 2, CANVAS_H / 2, 'Cooldowns Reset!', '#8cf');
    } else if (itemKey === 'crystalBomb') {
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.alive) {
          damageEnemy(e, Math.round(e.maxHp * 0.5));
        }
      }
      spawnParticle(CANVAS_W / 2, CANVAS_H / 2, 'CRYSTAL BOMB!', '#f4f');
    } else if (itemKey === 'goldenShield') {
      shieldCharges = 3;
      spawnParticle(CANVAS_W / 2, CANVAS_H / 2, 'Shield x3', '#ffd700');
    }

    renderCrateBar();
    updateHUD();
    return true;
  }

  var placingCaltrops = false;

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

  var finalWave = document.getElementById('td-final-wave');
  var finalKills = document.getElementById('td-final-kills');
  var finalTowers = document.getElementById('td-final-towers');
  var finalJBEl = document.getElementById('td-final-jb');

  var startStats = document.getElementById('td-start-stats');
  var goStats = document.getElementById('td-gameover-stats');
  var towerBarEl = document.getElementById('td-tower-bar');
  var crateBarEl = document.getElementById('td-crate-bar');

  // ── Dynamic canvas sizing ─────────────────────────
  var CANVAS_W = GRID_COLS * TILE_SIZE;
  var CANVAS_H = GRID_ROWS * TILE_SIZE;
  var dpr = window.devicePixelRatio || 1;
  var scale = 1;

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
  var gameState = 'idle';
  var wave = 0;
  var lives = START_LIVES;
  var jb = START_JB;
  var jbEarned = 0;
  var towers = [];
  var enemies = [];
  var projectiles = [];
  var particles = [];
  var lightningEffects = [];
  var selectedTower = 'arrow';
  var hoverTile = null;
  var spawnQueue = [];
  var spawnTimer = 0;
  var totalSpawned = 0;
  var totalKilled = 0;
  var towersBuilt = 0;
  var rafId = null;
  var lastTime = 0;

  // ── Path computation ──────────────────────────────
  var pathTiles = {};
  var pathSegments = [];
  var pathTotalLen = 0;

  function computePath() {
    pathTiles = {};
    pathSegments = [];
    pathTotalLen = 0;

    var wp = MAP_1.path;
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
      dist: 0,
      alive: true,
      dot: null,
      caltropsHit: {}
    });
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) continue;

      // DOT tick
      if (e.dot && e.dot.remaining > 0) {
        e.dot.remaining -= dt;
        e.dot.tickTimer = (e.dot.tickTimer || 0) + dt;
        if (e.dot.tickTimer >= 0.5) {
          e.dot.tickTimer -= 0.5;
          var dotDmg = Math.round(e.dot.dmg * 0.5);
          e.hp -= dotDmg;
          var dotPos = getPathPos(e.dist);
          spawnParticle(dotPos.x + (Math.random() - 0.5) * 8, dotPos.y - 10, '-' + dotDmg, '#f84');
          if (e.hp <= 0) {
            e.alive = false;
            totalKilled++;
            continue;
          }
        }
      }

      // Move along path
      var pxPerSec = e.speed * TILE_SIZE * 1.5;
      if (ropeTrapActive) pxPerSec *= 0.5;
      e.dist += pxPerSec * dt;

      // Check caltrops
      var ePos = getPathPos(e.dist);
      var eTile = pixelToTile(ePos.x, ePos.y);
      for (var ci = 0; ci < caltropZones.length; ci++) {
        var cz = caltropZones[ci];
        if (eTile.col === cz.col && eTile.row === cz.row && !e.caltropsHit[ci]) {
          e.caltropsHit[ci] = true;
          damageEnemy(e, 15);
          if (!e.alive) break;
        }
      }
      if (!e.alive) continue;

      // Check if reached exit
      if (e.dist >= pathTotalLen) {
        e.alive = false;
        if (shieldCharges > 0) {
          shieldCharges--;
          var shieldPos = getPathPos(pathTotalLen);
          spawnParticle(shieldPos.x, shieldPos.y, 'BLOCKED', '#ffd700');
        } else {
          lives--;
          var exitPos = getPathPos(pathTotalLen);
          spawnParticle(exitPos.x, exitPos.y, '-1 \u2665', '#e55');
          if (lives <= 0) {
            lives = 0;
            gameOver();
            return;
          }
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
    spawnParticle(pos.x + (Math.random() - 0.5) * 10, pos.y - 12, '-' + dmg, colorFg);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      totalKilled++;
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

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.strokeStyle = colorFg;
      ctx.lineWidth = 1;
      ctx.stroke();

      // DOT indicator
      if (e.dot && e.dot.remaining > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, e.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#f84';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

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

  // ── Watchtower range aura ─────────────────────────
  function getWatchtowerBonus(tower) {
    var bonus = 0;
    var tc = tileCenter(tower.col, tower.row);
    for (var i = 0; i < towers.length; i++) {
      var other = towers[i];
      if (other.type !== 'watchtower') continue;
      if (other === tower) continue;
      var oc = tileCenter(other.col, other.row);
      var dx = tc.x - oc.x;
      var dy = tc.y - oc.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 2 * TILE_SIZE) {
        bonus += 0.1;
      }
    }
    return bonus;
  }

  // ── Towers ────────────────────────────────────────
  function getEffectiveCost(def) {
    return Math.max(1, Math.round(def.cost * mods.costMult));
  }

  function placeTower(col, row, type) {
    var def = TOWER_DEFS[type];
    var cost = getEffectiveCost(def);
    if (jb < cost) return false;
    if (!isBuildable(col, row)) return false;

    jb -= cost;
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
    // Smoked Fish timer
    if (atkSpeedActive) {
      atkSpeedTimer -= dt;
      if (atkSpeedTimer <= 0) {
        atkSpeedActive = false;
        atkSpeedTimer = 0;
      }
    }

    for (var i = 0; i < towers.length; i++) {
      var t = towers[i];
      var def = TOWER_DEFS[t.type];

      // Skip non-attacking towers
      if (t.type === 'watchtower' || t.type === 'goldmine') continue;

      if (t.cooldown > 0) {
        var cdRate = atkSpeedActive ? 1.3 : 1;
        t.cooldown -= dt * cdRate;
        continue;
      }

      var target = findTarget(t);
      if (target) {
        if (t.type === 'lightning') {
          fireLightningChain(t, target, 3);
        } else {
          fireProjectile(t, target);
        }
        t.cooldown = def.speed;
      }
    }
  }

  function findTarget(tower) {
    var def = TOWER_DEFS[tower.type];
    if (def.range === 0) return null;
    var tc = tileCenter(tower.col, tower.row);
    var wtBonus = getWatchtowerBonus(tower);
    var rangePx = def.range * TILE_SIZE * mods.rangeMult * (1 + wtBonus);
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

      var half = TILE_SIZE * 0.35;
      var towerColor = def.color || colorAccent;
      ctx.fillStyle = towerColor;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(tc.x - half, tc.y - half, half * 2, half * 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = towerColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);

      ctx.fillStyle = colorFg;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, tc.x, tc.y);

      // Watchtower aura ring
      if (t.type === 'watchtower') {
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, 2 * TILE_SIZE, 0, Math.PI * 2);
        ctx.strokeStyle = '#aaa';
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Range circle on hover
      if (hoverTile && hoverTile.col === t.col && hoverTile.row === t.row && def.range > 0) {
        var wtBonus = getWatchtowerBonus(t);
        var rangePx = def.range * TILE_SIZE * mods.rangeMult * (1 + wtBonus);
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
        ctx.strokeStyle = towerColor;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Lightning chain ───────────────────────────────
  function fireLightningChain(tower, firstTarget, maxHits) {
    var tc = tileCenter(tower.col, tower.row);
    var dmg = Math.round(TOWER_DEFS.lightning.dmg * mods.dmgMult);
    var hit = [firstTarget];
    var hitSet = {};
    hitSet[enemies.indexOf(firstTarget)] = true;

    damageEnemy(firstTarget, dmg);

    var current = firstTarget;
    for (var n = 1; n < maxHits; n++) {
      var pos = getPathPos(current.dist);
      var best = null;
      var bestD = Infinity;
      for (var i = 0; i < enemies.length; i++) {
        if (hitSet[i]) continue;
        var e = enemies[i];
        if (!e.alive) continue;
        var ep = getPathPos(e.dist);
        var dx = ep.x - pos.x;
        var dy = ep.y - pos.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 2 * TILE_SIZE && d < bestD) {
          bestD = d;
          best = e;
          hitSet[i] = true;
        }
      }
      if (!best) break;
      damageEnemy(best, dmg);
      hit.push(best);
      current = best;
    }

    // Visual: store lightning segments for rendering
    var points = [{ x: tc.x, y: tc.y }];
    for (var h = 0; h < hit.length; h++) {
      var hp = getPathPos(hit[h].dist);
      points.push({ x: hp.x, y: hp.y });
    }
    lightningEffects.push({ points: points, life: 0.3 });
  }

  // ── Projectiles ───────────────────────────────────
  function fireProjectile(tower, target) {
    var tc = tileCenter(tower.col, tower.row);
    var def = TOWER_DEFS[tower.type];
    var dmg = Math.round(def.dmg * mods.dmgMult);
    projectiles.push({
      x: tc.x,
      y: tc.y,
      target: target,
      dmg: dmg,
      speed: PROJECTILE_SPEED * TILE_SIZE,
      towerType: tower.type
    });
  }

  function updateProjectiles(dt) {
    for (var i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];
      if (!p.target.alive) {
        projectiles.splice(i, 1);
        continue;
      }

      var targetPos = getPathPos(p.target.dist);
      var dx = targetPos.x - p.x;
      var dy = targetPos.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        damageEnemy(p.target, p.dmg);
        // Fire tower DOT
        if (p.towerType === 'fire' && p.target.alive) {
          p.target.dot = { dmg: 3, remaining: 3, tickTimer: 0 };
        }
        projectiles.splice(i, 1);
      } else {
        var move = p.speed * dt;
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
      }
    }
  }

  function drawProjectiles() {
    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      var col = colorFg;
      if (p.towerType === 'fire') col = '#f84';
      else if (p.towerType === 'sniper') col = '#8cf';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.towerType === 'sniper' ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Lightning effects ─────────────────────────────
  function updateLightning(dt) {
    for (var i = lightningEffects.length - 1; i >= 0; i--) {
      lightningEffects[i].life -= dt;
      if (lightningEffects[i].life <= 0) lightningEffects.splice(i, 1);
    }
  }

  function drawLightning() {
    for (var i = 0; i < lightningEffects.length; i++) {
      var le = lightningEffects[i];
      ctx.save();
      ctx.globalAlpha = Math.min(1, le.life / 0.15);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(le.points[0].x, le.points[0].y);
      for (var j = 1; j < le.points.length; j++) {
        ctx.lineTo(le.points[j].x, le.points[j].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Particles ─────────────────────────────────────
  function spawnParticle(x, y, text, color) {
    particles.push({
      x: x, y: y, vx: 0, vy: -1,
      text: text, color: color, life: 40, maxLife: 40
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

  // ── Caltrop drawing ───────────────────────────────
  function drawCaltrops() {
    if (caltropZones.length === 0) return;
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < caltropZones.length; i++) {
      var cz = caltropZones[i];
      var tc = tileCenter(cz.col, cz.row);
      ctx.globalAlpha = 0.6;
      ctx.fillText('\u2666\u2666', tc.x, tc.y);
    }
    ctx.globalAlpha = 1;
  }

  // ── Waves ─────────────────────────────────────────
  function startWave() {
    wave++;
    var count = 5 + Math.floor(wave * 1.5);
    var hpMult = 1 + wave * 0.15;
    var baseHp = ENEMY_DEFS.slime.hp;

    spawnQueue = [];
    for (var i = 0; i < count; i++) {
      spawnQueue.push({ type: 'slime', hp: Math.round(baseHp * hpMult) });
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
      var def = ENEMY_DEFS[next.type];
      enemies.push({
        type: next.type,
        hp: next.hp,
        maxHp: next.hp,
        speed: def.speed,
        radius: def.radius,
        color: def.color,
        dist: 0,
        alive: true,
        dot: null,
        caltropsHit: {}
      });
      totalSpawned++;
      updateHUD();
    }
  }

  function checkWaveComplete() {
    if (gameState !== 'waving') return;
    if (spawnQueue.length > 0) return;
    var aliveCount = 0;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) aliveCount++;
    }
    if (aliveCount === 0) {
      endWave();
    }
  }

  function endWave() {
    var baseReward = 5 + wave * 2;

    // Gold mine bonus
    var goldMineCount = 0;
    for (var g = 0; g < towers.length; g++) {
      if (towers[g].type === 'goldmine') goldMineCount++;
    }
    var mineBonus = goldMineCount * 2;

    var reward = Math.round((baseReward + mineBonus) * mods.rewardMult);
    jb += reward;
    jbEarned += reward;

    if (typeof JackBucks !== 'undefined' && JackBucks.add) {
      JackBucks.add(reward);
    }

    var rewardText = '+' + reward + ' JB';
    if (mineBonus > 0) rewardText += ' (+' + mineBonus + ' mines)';
    spawnParticle(CANVAS_W / 2, CANVAS_H / 2, rewardText, '#ffd700');

    // Reset rope trap at end of wave
    ropeTrapActive = false;

    // Check wave milestone for blueprint unlocks
    checkWaveMilestones();

    gameState = 'building';
    waveBtn.disabled = false;
    waveBtn.textContent = 'Start Wave ' + (wave + 1);
    updateTowerBtnStates();
    updateHUD();
  }

  function checkWaveMilestones() {
    var towerKeys = Object.keys(TOWER_DEFS);
    for (var i = 0; i < towerKeys.length; i++) {
      var key = towerKeys[i];
      var def = TOWER_DEFS[key];
      if (!def.blueprint) continue;
      if (isTowerUnlocked(key)) continue;
      if (wave >= def.waveReq) {
        // Show notification that tower is now available to unlock
        spawnParticle(CANVAS_W / 2, CANVAS_H / 3, def.name + ' blueprint available!', def.color || colorAccent);
      }
    }
  }

  // ── Blueprint unlocks ─────────────────────────────
  function isTowerUnlocked(type) {
    var def = TOWER_DEFS[type];
    if (!def) return false;
    if (!def.blueprint) return true; // arrow is always available
    return stats.unlockedTowers && stats.unlockedTowers.indexOf(type) !== -1;
  }

  function canUnlockTower(type) {
    var def = TOWER_DEFS[type];
    if (!def || !def.blueprint) return false;
    if (isTowerUnlocked(type)) return false;
    if (stats.highestWave < def.waveReq) return false;
    if (!def.unlockCost) return false;
    return canAffordCost(def.unlockCost);
  }

  function unlockTower(type) {
    var def = TOWER_DEFS[type];
    if (!def || !def.blueprint) return false;
    if (isTowerUnlocked(type)) return false;
    if (stats.highestWave < def.waveReq) return false;
    if (!canAffordCost(def.unlockCost)) return false;

    deductCost(def.unlockCost);
    if (!stats.unlockedTowers) stats.unlockedTowers = [];
    stats.unlockedTowers.push(type);
    saveStats();
    renderTowerBar();
    return true;
  }

  // ── Game over ─────────────────────────────────────
  function gameOver() {
    gameState = 'gameover';
    waveBtn.disabled = true;

    stats.gamesPlayed++;
    stats.totalKills += totalKilled;
    stats.totalTowersBuilt += towersBuilt;
    stats.totalJBEarned += jbEarned;
    if (wave > stats.highestWave) stats.highestWave = wave;
    saveStats();

    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'tower-defense',
        outcome: wave >= 5 ? 'win' : 'lose',
        bet: 0,
        payout: jbEarned
      });
    }

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
    return { gamesPlayed: 0, highestWave: 0, totalKills: 0, totalTowersBuilt: 0, totalJBEarned: 0, unlockedTowers: [] };
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
          totalJBEarned: s.totalJBEarned || 0,
          unlockedTowers: s.unlockedTowers || []
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
  var waveBtn = null; // set during renderTowerBar

  function updateHUD() {
    if (hudWave) hudWave.textContent = 'Wave: ' + (wave || '\u2014');
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
    var btns = towerBarEl.querySelectorAll('.td-tower-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var type = btn.getAttribute('data-tower');
      if (!type) continue;
      var def = TOWER_DEFS[type];
      if (!def) continue;
      var cost = getEffectiveCost(def);
      if (!isTowerUnlocked(type)) {
        btn.classList.add('td-tower-btn-locked');
        btn.classList.remove('td-tower-btn-disabled');
      } else if (jb < cost) {
        btn.classList.add('td-tower-btn-disabled');
        btn.classList.remove('td-tower-btn-locked');
      } else {
        btn.classList.remove('td-tower-btn-disabled');
        btn.classList.remove('td-tower-btn-locked');
      }
    }
  }

  // ── Tower bar rendering ───────────────────────────
  function renderTowerBar() {
    if (!towerBarEl) return;
    towerBarEl.innerHTML = '';

    var towerKeys = Object.keys(TOWER_DEFS);
    for (var i = 0; i < towerKeys.length; i++) {
      var key = towerKeys[i];
      var def = TOWER_DEFS[key];
      var unlocked = isTowerUnlocked(key);

      var btn = document.createElement('button');
      btn.className = 'td-tower-btn';
      if (key === selectedTower && unlocked) btn.className += ' td-tower-btn-selected';
      if (!unlocked) btn.className += ' td-tower-btn-locked';
      btn.setAttribute('data-tower', key);

      var icon = document.createElement('span');
      icon.className = 'td-tower-icon';
      icon.textContent = def.symbol;
      btn.appendChild(icon);

      var name = document.createElement('span');
      name.className = 'td-tower-name';
      name.textContent = unlocked ? def.name : '???';
      btn.appendChild(name);

      var cost = document.createElement('span');
      cost.className = 'td-tower-cost';
      cost.textContent = unlocked ? getEffectiveCost(def) + ' JB' : '\uD83D\uDD12';
      btn.appendChild(cost);

      btn.addEventListener('click', (function (k) {
        return function () {
          if (!isTowerUnlocked(k)) return;
          selectedTower = k;
          placingCaltrops = false;
          var all = towerBarEl.querySelectorAll('.td-tower-btn');
          for (var j = 0; j < all.length; j++) {
            all[j].classList.remove('td-tower-btn-selected');
          }
          this.classList.add('td-tower-btn-selected');
        };
      })(key));

      towerBarEl.appendChild(btn);
    }

    // Wave button
    var wb = document.createElement('button');
    wb.id = 'td-wave-btn';
    wb.className = 'td-btn td-wave-start-btn';
    wb.disabled = gameState !== 'building';
    wb.textContent = wave === 0 ? 'Start Wave 1' : 'Start Wave ' + (wave + 1);
    wb.addEventListener('click', function () {
      if (gameState === 'building') startWave();
    });
    towerBarEl.appendChild(wb);
    waveBtn = wb;
  }

  // ── Crate bar rendering (in-game) ─────────────────
  function renderCrateBar() {
    if (!crateBarEl) return;
    crateBarEl.innerHTML = '';

    if (crate.length === 0) {
      crateBarEl.classList.add('td-hidden');
      return;
    }

    crateBarEl.classList.remove('td-hidden');
    for (var i = 0; i < crate.length; i++) {
      var key = crate[i];
      var def = CRATE_DEFS[key];
      if (!def) continue;
      var used = crateUsed[key];

      var btn = document.createElement('button');
      btn.className = 'td-crate-btn';
      btn.title = def.desc;
      if (used) btn.disabled = true;

      if (key === 'smokedFish' && atkSpeedActive) {
        btn.className += ' td-crate-btn-active';
        btn.textContent = def.name + ' (' + Math.ceil(atkSpeedTimer) + 's)';
      } else {
        btn.textContent = used ? def.name + ' (used)' : def.name;
      }

      btn.addEventListener('click', (function (k) {
        return function () { useCrateItem(k); };
      })(key));

      crateBarEl.appendChild(btn);
    }
  }

  // ── Drawing ───────────────────────────────────────
  function drawGrid() {
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
      var cc = c1, rr = r1;
      var step = 0;
      while (true) {
        if (step % 2 === 0) {
          var tc = tileCenter(cc, rr);
          ctx.fillText(arrow, tc.x, tc.y);
        }
        if (cc === c2 && rr === r2) break;
        cc += dc;
        rr += dr;
        step++;
      }
    }
    ctx.globalAlpha = 1;

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
    if (!hoverTile) return;

    // Caltrop placement mode
    if (placingCaltrops) {
      var c = hoverTile.col;
      var r = hoverTile.row;
      if (isPathTile(c, r)) {
        ctx.fillStyle = '#aaa';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1;
      }
      return;
    }

    if (!selectedTower) return;
    var col = hoverTile.col;
    var row = hoverTile.row;
    var buildable = isBuildable(col, row);
    var def = TOWER_DEFS[selectedTower];
    var tc = tileCenter(col, row);

    ctx.fillStyle = buildable ? (def.color || colorAccent) : '#e44';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1;

    if (buildable) {
      var half = TILE_SIZE * 0.35;
      ctx.strokeStyle = def.color || colorAccent;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);

      ctx.fillStyle = colorFg;
      ctx.globalAlpha = 0.4;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, tc.x, tc.y);

      if (def.range > 0) {
        var rangePx = def.range * TILE_SIZE * mods.rangeMult;
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
        ctx.strokeStyle = def.color || colorAccent;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
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
      updateLightning(dt);
      checkWaveComplete();
    }
    updateParticles(dt);
  }

  function draw() {
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawGrid();
    drawPath();
    drawCaltrops();
    drawGhostTower();
    drawTowers();
    drawEnemies();
    drawProjectiles();
    drawLightning();
    drawParticles();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();
    updateHUD();

    // Update smoked fish timer on crate bar
    if (atkSpeedActive && crateBarEl && !crateBarEl.classList.contains('td-hidden')) {
      renderCrateBar();
    }

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

    // Caltrop placement
    if (placingCaltrops && isPathTile(tile.col, tile.row)) {
      caltropZones.push({ col: tile.col, row: tile.row });
      placingCaltrops = false;
      renderCrateBar();
      return;
    }

    if (selectedTower && isTowerUnlocked(selectedTower) && isBuildable(tile.col, tile.row)) {
      var def = TOWER_DEFS[selectedTower];
      if (jb >= getEffectiveCost(def)) {
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

  // ── Play / Retry ──────────────────────────────────
  function startGame() {
    wave = 0;
    lives = START_LIVES + mods.startLives;
    jb = START_JB + mods.startJB;
    jbEarned = 0;
    towers = [];
    enemies = [];
    projectiles = [];
    particles = [];
    lightningEffects = [];
    spawnQueue = [];
    totalSpawned = 0;
    totalKilled = 0;
    towersBuilt = 0;
    hoverTile = null;
    lastTime = 0;

    // Reset crate state
    crateUsed = {};
    shieldCharges = 0;
    atkSpeedActive = false;
    atkSpeedTimer = 0;
    ropeTrapActive = false;
    caltropZones = [];
    placingCaltrops = false;
    commitCrate();

    gameState = 'building';
    startOverlay.classList.add('td-hidden');
    gameoverOverlay.classList.add('td-hidden');

    renderTowerBar();
    renderCrateBar();
    updateTowerBtnStates();
    updateHUD();

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); startGame(); });
  if (retryBtn) retryBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    // Refund any remaining crate items since we're going back to start
    for (var i = crate.length - 1; i >= 0; i--) {
      var def = CRATE_DEFS[crate[i]];
      if (def && !crateUsed[crate[i]]) {
        // items already committed — no refund on retry
      }
    }
    crate = [];
    crateUsed = {};
    saveCrate();
    showStartScreen();
  });

  function showStartScreen() {
    gameState = 'idle';
    startOverlay.classList.remove('td-hidden');
    gameoverOverlay.classList.add('td-hidden');
    renderStatsBlock(startStats);
    renderTowerBar();
    refreshAllPanels();
    drawIdle();
  }

  // ── Tab system ────────────────────────────────────
  function initTabs() {
    var tabs = document.querySelectorAll('.td-tab');
    var panels = {
      overview: document.getElementById('td-tab-overview'),
      armory: document.getElementById('td-tab-armory'),
      crate: document.getElementById('td-tab-crate'),
      blueprints: document.getElementById('td-tab-blueprints')
    };

    // Hide farm-integration tabs if no FarmResources
    if (!hasFarmResources) {
      for (var t = 0; t < tabs.length; t++) {
        var tabName = tabs[t].getAttribute('data-tab');
        if (tabName === 'armory' || tabName === 'crate' || tabName === 'blueprints') {
          tabs[t].style.display = 'none';
        }
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        var target = this.getAttribute('data-tab');
        for (var j = 0; j < tabs.length; j++) {
          tabs[j].classList.remove('td-tab-active');
        }
        this.classList.add('td-tab-active');

        var pKeys = Object.keys(panels);
        for (var k = 0; k < pKeys.length; k++) {
          if (panels[pKeys[k]]) {
            if (pKeys[k] === target) {
              panels[pKeys[k]].classList.remove('td-hidden');
            } else {
              panels[pKeys[k]].classList.add('td-hidden');
            }
          }
        }
      });
    }
  }

  // ── Armory panel ──────────────────────────────────
  function renderArmoryPanel() {
    var panel = document.getElementById('td-tab-armory');
    if (!panel) return;

    if (!hasFarmResources) {
      panel.innerHTML = '<p class="td-panel-empty">Farm resources required for Armory upgrades.</p>';
      return;
    }

    var html = '<div class="td-upgrade-grid">';
    var keys = Object.keys(ARMORY_DEFS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var def = ARMORY_DEFS[key];
      var tier = getArmoryTier(key);
      var maxed = tier >= def.maxTier;
      var cost = getUpgradeCost(key);
      var afford = cost ? canAffordCost(cost) : false;

      html += '<div class="td-upgrade-card' + (maxed ? ' td-upgrade-card-maxed' : '') + '">';
      html += '<div class="td-upgrade-name">' + def.name + '</div>';
      html += '<div class="td-upgrade-desc">' + def.desc + '</div>';
      html += '<div class="td-upgrade-tier">Tier: ' + tier + '/' + def.maxTier + '</div>';

      if (!maxed && cost) {
        html += '<div class="td-upgrade-cost">';
        html += formatCost(cost);
        html += '</div>';
        html += '<button class="td-upgrade-btn" data-armory="' + key + '"' + (afford ? '' : ' disabled') + '>Upgrade</button>';
      } else {
        html += '<div class="td-upgrade-cost" style="color:var(--accent)">MAX</div>';
      }

      html += '</div>';
    }
    html += '</div>';
    panel.innerHTML = html;

    // Bind upgrade buttons
    var btns = panel.querySelectorAll('.td-upgrade-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        var k = this.getAttribute('data-armory');
        if (purchaseUpgrade(k)) {
          renderArmoryPanel();
          renderBlueprintsPanel();
        }
      });
    }
  }

  // ── Blueprints panel ──────────────────────────────
  function renderBlueprintsPanel() {
    var panel = document.getElementById('td-tab-blueprints');
    if (!panel) return;

    if (!hasFarmResources) {
      panel.innerHTML = '<p class="td-panel-empty">Farm resources required to unlock tower blueprints.</p>';
      return;
    }

    var html = '<div class="td-upgrade-grid">';
    var keys = Object.keys(TOWER_DEFS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var def = TOWER_DEFS[key];
      if (!def.blueprint) continue;

      var unlocked = isTowerUnlocked(key);
      var waveOk = stats.highestWave >= def.waveReq;
      var afford = waveOk && !unlocked && canAffordCost(def.unlockCost);

      html += '<div class="td-upgrade-card' + (unlocked ? ' td-blueprint-unlocked' : '') + '">';
      html += '<div class="td-upgrade-name">' + def.name + ' (' + def.symbol + ')</div>';
      html += '<div class="td-upgrade-desc">';
      if (def.dmg > 0) html += 'DMG: ' + def.dmg + ' | ';
      if (def.range > 0) html += 'Range: ' + def.range + ' | ';
      html += 'Cost: ' + def.cost + ' JB';
      html += '</div>';

      html += '<div class="td-upgrade-tier">';
      if (waveOk) {
        html += '<span class="td-cost-ok">Wave ' + def.waveReq + ' \u2713</span>';
      } else {
        html += '<span class="td-cost-short">Wave ' + def.waveReq + ' required (best: ' + stats.highestWave + ')</span>';
      }
      html += '</div>';

      if (!unlocked) {
        html += '<div class="td-upgrade-cost">' + formatCost(def.unlockCost) + '</div>';
        html += '<button class="td-upgrade-btn" data-blueprint="' + key + '"' + (afford ? '' : ' disabled') + '>Unlock</button>';
      }

      html += '</div>';
    }
    html += '</div>';
    panel.innerHTML = html;

    var btns = panel.querySelectorAll('.td-upgrade-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        var k = this.getAttribute('data-blueprint');
        if (unlockTower(k)) {
          renderBlueprintsPanel();
        }
      });
    }
  }

  // ── Supply Crate panel ────────────────────────────
  function renderCratePanel() {
    var panel = document.getElementById('td-tab-crate');
    if (!panel) return;

    if (!hasFarmResources) {
      panel.innerHTML = '<p class="td-panel-empty">Farm resources required for Supply Crate.</p>';
      return;
    }

    var html = '';

    // Slots display
    html += '<div class="td-crate-slots">';
    for (var s = 0; s < BASE_CRATE_SLOTS; s++) {
      if (s < crate.length) {
        var itemDef = CRATE_DEFS[crate[s]];
        html += '<div class="td-crate-slot td-crate-slot-filled">';
        html += '<span>' + (itemDef ? itemDef.name : crate[s]) + '</span>';
        html += '<button class="td-crate-slot-remove" data-crate-idx="' + s + '">\u00D7</button>';
        html += '</div>';
      } else {
        html += '<div class="td-crate-slot"><span style="opacity:0.3">Empty</span></div>';
      }
    }
    html += '</div>';

    // Available items
    html += '<div class="td-crate-items-grid">';
    var cKeys = Object.keys(CRATE_DEFS);
    for (var i = 0; i < cKeys.length; i++) {
      var key = cKeys[i];
      var def = CRATE_DEFS[key];
      var afford = canAffordCost(def.cost);
      var full = crate.length >= BASE_CRATE_SLOTS;
      var alreadyLoaded = crate.indexOf(key) !== -1;

      html += '<div class="td-crate-item">';
      html += '<div class="td-crate-item-name">' + def.name + '</div>';
      html += '<div class="td-crate-item-desc">' + def.desc + '</div>';
      html += '<div class="td-upgrade-cost">' + formatCost(def.cost) + '</div>';
      html += '<button class="td-crate-add-btn" data-crate-add="' + key + '"' +
        ((afford && !full && !alreadyLoaded) ? '' : ' disabled') + '>' +
        (alreadyLoaded ? 'Loaded' : 'Load') + '</button>';
      html += '</div>';
    }
    html += '</div>';

    panel.innerHTML = html;

    // Bind remove buttons
    var removeBtns = panel.querySelectorAll('.td-crate-slot-remove');
    for (var r = 0; r < removeBtns.length; r++) {
      removeBtns[r].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-crate-idx'), 10);
        if (unloadCrate(idx)) {
          renderCratePanel();
        }
      });
    }

    // Bind add buttons
    var addBtns = panel.querySelectorAll('.td-crate-add-btn');
    for (var a = 0; a < addBtns.length; a++) {
      addBtns[a].addEventListener('click', function () {
        var k = this.getAttribute('data-crate-add');
        if (loadCrate(k)) {
          renderCratePanel();
        }
      });
    }
  }

  // ── Cost formatting helper ────────────────────────
  function formatCost(cost) {
    var parts = [];
    var res = hasFarmResources ? window.FarmResources.getAll() : { raw: {}, processed: {} };

    if (cost.raw) {
      var rk = Object.keys(cost.raw);
      for (var i = 0; i < rk.length; i++) {
        var have = res.raw[rk[i]] || 0;
        var need = cost.raw[rk[i]];
        var cls = have >= need ? 'td-cost-ok' : 'td-cost-short';
        parts.push('<span class="' + cls + '">' + formatResourceName(rk[i]) + ': ' + have + '/' + need + '</span>');
      }
    }
    if (cost.processed) {
      var pk = Object.keys(cost.processed);
      for (var j = 0; j < pk.length; j++) {
        var haveP = res.processed[pk[j]] || 0;
        var needP = cost.processed[pk[j]];
        var clsP = haveP >= needP ? 'td-cost-ok' : 'td-cost-short';
        parts.push('<span class="' + clsP + '">' + formatResourceName(pk[j]) + ': ' + haveP + '/' + needP + '</span>');
      }
    }
    return parts.join(', ');
  }

  function formatResourceName(key) {
    // camelCase/snake_case → Title Case
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^\s+/, '')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── Refresh all panels ────────────────────────────
  function refreshAllPanels() {
    renderArmoryPanel();
    renderCratePanel();
    renderBlueprintsPanel();
  }

  // ── Resize handling ───────────────────────────────
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

  // ── Farm resource change listener ─────────────────
  if (hasFarmResources) {
    window.FarmResources.onChange(function () {
      if (gameState === 'idle') {
        refreshAllPanels();
      }
    });
  }

  // ── Init ──────────────────────────────────────────
  computePath();
  renderTowerBar();
  initTabs();
  renderStatsBlock(startStats);
  refreshAllPanels();
  updateHUD();
  drawIdle();

  function drawIdle() {
    draw();
  }
})();
