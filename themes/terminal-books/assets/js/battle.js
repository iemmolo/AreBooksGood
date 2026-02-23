(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var PET_KEY = 'arebooksgood-pet';
  var DUNGEON_KEY = 'arebooksgood-dungeon';
  var STATS_KEY = 'arebooksgood-dungeon-stats';
  var INVENTORY_KEY = 'arebooksgood-dungeon-inventory';
  var EQUIP_KEY = 'arebooksgood-dungeon-equip';
  var CANVAS_W = 400;
  var CANVAS_H = 400;
  var CANVAS_RATIO = 1; // square canvas for 3v3

  // ── Creature Base Stats ──────────────────────────
  var BASE_STATS = {
    common:    { hp: 80,  atk: 12, def: 8,  spd: 10, cri: 5 },
    rare:      { hp: 100, atk: 15, def: 10, spd: 12, cri: 7 },
    legendary: { hp: 130, atk: 20, def: 14, spd: 15, cri: 10 }
  };

  var TYPE_STAT_BONUS = {
    fire:   { atk: 2 },
    nature: { hp: 10 },
    tech:   { cri: 2 },
    aqua:   { def: 2 },
    shadow: { spd: 2 },
    mystic: { atk: 1, def: 1 }
  };

  var LEVEL_SCALE = 0.15; // 15% per level

  function calcCreatureStats(tier, type, level) {
    var base = BASE_STATS[tier] || BASE_STATS.common;
    var bonus = TYPE_STAT_BONUS[type] || {};
    var lvlMult = 1 + LEVEL_SCALE * (level - 1);
    return {
      hp:  Math.floor((base.hp + (bonus.hp || 0)) * lvlMult),
      atk: Math.floor((base.atk + (bonus.atk || 0)) * lvlMult),
      def: Math.floor((base.def + (bonus.def || 0)) * lvlMult),
      spd: Math.floor((base.spd + (bonus.spd || 0)) * lvlMult),
      cri: base.cri + (bonus.cri || 0) // flat, no level scaling
    };
  }

  // Effective level for gear equip requirements
  // Legendaries count as level 3 (can equip all tiers)
  function getEffectiveLevel(tier, level) {
    if (tier === 'legendary') return 3;
    return level;
  }

  // ── Type advantage chart ──────────────────────────
  var TYPE_CHART = {
    fire:   { strong: ['nature', 'mystic'], weak: ['aqua', 'shadow'] },
    nature: { strong: ['aqua', 'shadow'],   weak: ['fire', 'tech'] },
    tech:   { strong: ['shadow', 'nature'], weak: ['mystic', 'aqua'] },
    aqua:   { strong: ['fire', 'tech'],     weak: ['nature', 'mystic'] },
    shadow: { strong: ['mystic', 'fire'],   weak: ['tech', 'nature'] },
    mystic: { strong: ['tech', 'aqua'],     weak: ['shadow', 'fire'] }
  };

  function getTypeMultiplier(atkType, defType) {
    var chart = TYPE_CHART[atkType];
    if (!chart) return 1.0;
    if (chart.strong.indexOf(defType) !== -1) return 1.5;
    if (chart.weak.indexOf(defType) !== -1) return 0.67;
    return 1.0;
  }

  // ── Type colors (for canvas) ──────────────────────
  var TYPE_COLORS = {
    fire: '#ff6b35', nature: '#4caf50', tech: '#78909c',
    aqua: '#29b6f6', shadow: '#ab47bc', mystic: '#ffd54f'
  };

  // ── Moves database ────────────────────────────────
  var MOVES = {
    scratch:  { name: 'Scratch',    type: 'neutral', power: 30, category: 'physical', effect: null },
    tackle:   { name: 'Tackle',     type: 'neutral', power: 35, category: 'physical', effect: null },
    dodge:    { name: 'Dodge',      type: 'neutral', power: 0,  category: 'status',   effect: 'dodge', desc: 'Evade next attack (75%)' },
    heal:     { name: 'Heal',       type: 'neutral', power: 0,  category: 'status',   effect: 'heal', desc: 'Restore 25% HP' },
    ember:      { name: 'Ember',      type: 'fire', power: 40, category: 'special', effect: null },
    fireBlast:  { name: 'Fire Blast', type: 'fire', power: 60, category: 'special', effect: 'burn', effectChance: 0.3 },
    heatWave:   { name: 'Heat Wave',  type: 'fire', power: 0,  category: 'status',  effect: 'atkUp', desc: '+30% ATK for 3 turns' },
    vineWhip:    { name: 'Vine Whip',    type: 'nature', power: 40, category: 'physical', effect: null },
    thornStorm:  { name: 'Thorn Storm',  type: 'nature', power: 55, category: 'special',  effect: 'slow', effectChance: 0.35 },
    leechSeed:   { name: 'Leech Seed',   type: 'nature', power: 35, category: 'special',  effect: 'leech' },
    voltStrike:  { name: 'Volt Strike',  type: 'tech', power: 40, category: 'physical', effect: null },
    overload:    { name: 'Overload',     type: 'tech', power: 65, category: 'special',  effect: 'stun', effectChance: 0.25 },
    reboot:      { name: 'Reboot',       type: 'tech', power: 0,  category: 'status',   effect: 'heal', desc: 'Restore 25% HP' },
    splash:      { name: 'Splash',       type: 'aqua', power: 40, category: 'special', effect: null },
    tidalCrash:  { name: 'Tidal Crash',  type: 'aqua', power: 60, category: 'special', effect: 'slow', effectChance: 0.3 },
    aquaShield:  { name: 'Aqua Shield',  type: 'aqua', power: 0,  category: 'status',  effect: 'dodge', desc: 'Evade next attack (75%)' },
    shadowClaw:  { name: 'Shadow Claw',  type: 'shadow', power: 40, category: 'physical', effect: null, priority: true },
    curseStrike: { name: 'Curse Strike', type: 'shadow', power: 55, category: 'special',  effect: 'curse', effectChance: 0.35 },
    soulDrain:   { name: 'Soul Drain',   type: 'shadow', power: 35, category: 'special',  effect: 'leech' },
    arcaneOrb:   { name: 'Arcane Orb',   type: 'mystic', power: 40, category: 'special', effect: null },
    starfall:    { name: 'Starfall',     type: 'mystic', power: 60, category: 'special', effect: 'stun', effectChance: 0.2 },
    mysticAura:  { name: 'Mystic Aura',  type: 'mystic', power: 0,  category: 'status',  effect: 'atkUp', desc: '+30% ATK for 3 turns' }
  };

  var TYPE_MOVESETS = {
    fire:   ['ember', 'fireBlast', 'heatWave'],
    nature: ['vineWhip', 'thornStorm', 'leechSeed'],
    tech:   ['voltStrike', 'overload', 'reboot'],
    aqua:   ['splash', 'tidalCrash', 'aquaShield'],
    shadow: ['shadowClaw', 'curseStrike', 'soulDrain'],
    mystic: ['arcaneOrb', 'starfall', 'mysticAura']
  };

  function getMovesetForCreature(type, tier) {
    var typeMoves = TYPE_MOVESETS[type] || TYPE_MOVESETS.fire;
    if (tier === 'legendary') return [typeMoves[0], typeMoves[1], typeMoves[2], 'heal'];
    if (tier === 'rare') return ['tackle', typeMoves[0], typeMoves[1], 'heal'];
    return ['scratch', typeMoves[0], typeMoves[1], 'dodge'];
  }

  function getMovesetForEnemy(type) {
    var typeMoves = TYPE_MOVESETS[type] || TYPE_MOVESETS.fire;
    return ['tackle', typeMoves[0], typeMoves[1], 'scratch'];
  }

  // ── Damage formula ──────────────────────────────
  // New formula: power * (ATK/DEF ratio) * STAB * typeMult * atkBuff * critMult * variance
  function calcDamage(move, attacker, defender) {
    if (move.power === 0) return { damage: 0, isCrit: false };
    var power = move.power;
    var atkStat = (attacker.stats ? attacker.stats.atk : 12) + (attacker.gearStats ? attacker.gearStats.atk : 0);
    var defStat = (defender.stats ? defender.stats.def : 8) + (defender.gearStats ? defender.gearStats.def : 0);
    var ratio = Math.max(0.5, atkStat / Math.max(1, defStat));
    var stab = (move.type === attacker.type) ? 1.25 : 1.0;
    var typeMult = getTypeMultiplier(move.type, defender.type);
    var atkBuff = attacker.status.atkUp > 0 ? 1.30 : 1.0;
    var criChance = (attacker.stats ? attacker.stats.cri : 5) + (attacker.gearStats ? attacker.gearStats.cri : 0);
    var isCrit = Math.random() * 100 < criChance;
    var critMult = isCrit ? 1.5 : 1.0;
    var variance = 0.85 + Math.random() * 0.15;
    var dmg = Math.floor(power * ratio * stab * typeMult * atkBuff * critMult * variance);
    return { damage: Math.max(1, dmg), isCrit: isCrit };
  }

  // ── VFX row mapping by move type ──────────────────
  var VFX_ROWS = {
    fire: 0, nature: 2, tech: 4, aqua: 6, shadow: 8, mystic: 10, neutral: 12
  };
  var VFX_FRAME_SIZE = 48;
  var VFX_FRAMES = 6;

  // ── Dungeon definitions ───────────────────────────
  var DUNGEONS = [
    { id: 1, name: 'Grass Cavern',  typeLock: null,     waves: 3, stars: 1,
      enemies: [['slime-green','slime-green','sprout-blue'],['slime-green','myconid-green','sprout-blue'],['myconid-green','myconid-green','slime-green']] },
    { id: 2, name: 'Ember Depths',  typeLock: 'fire',   waves: 4, stars: 1,
      enemies: [['slime-pink','slime-pink','myconid-red'],['myconid-red','slime-pink','slime-pink'],['slime-pink','myconid-red','myconid-red'],['myconid-red','myconid-red','slime-pink']] },
    { id: 3, name: 'Tidal Grotto',  typeLock: 'aqua',   waves: 4, stars: 2,
      enemies: [['slime-blue','slime-blue','slime-light-blue'],['slime-light-blue','myconid-blue','slime-blue'],['myconid-blue','slime-blue','myconid-blue'],['myconid-blue','myconid-blue','slime-light-blue']] },
    { id: 4, name: 'Shadow Crypt',  typeLock: 'shadow', waves: 5, stars: 2,
      enemies: [['slime-black','slime-black','slime-purple'],['slime-black','myconid-purple','slime-purple'],['myconid-purple','spike','slime-black'],['spike','myconid-purple','slime-black'],['slime-black-big','spike','myconid-purple']] },
    { id: 5, name: 'Tech Vault',    typeLock: 'tech',   waves: 5, stars: 3,
      enemies: [['slime-golden','slime-golden','goblin-spear'],['goblin-spear','goblin-archer','slime-golden'],['goblin-archer','goblin-bomb','goblin-spear'],['goblin-bomb','goblin-archer','slime-golden'],['slime-golden-big','goblin-bomb','goblin-archer']] },
    { id: 6, name: 'Ancient Grove', typeLock: 'nature', waves: 5, stars: 3,
      enemies: [['myconid-green','sprout-pink','sprout-blue'],['myconid-green','sprout-purple','sprout-pink'],['sprout-purple','myconid-green','sprout-pink'],['myconid-green','myconid-green','sprout-purple'],['venom-bloom','sprout-purple','myconid-green']] },
    { id: 7, name: 'Mystic Spire',  typeLock: 'mystic', waves: 6, stars: 4,
      enemies: [['myconid-pink','slime-purple','myconid-blue'],['slime-purple','myconid-pink','slime-purple'],['myconid-blue','myconid-pink','slime-purple'],['myconid-pink','myconid-pink','myconid-blue'],['slime-purple','myconid-pink','myconid-pink'],['mimic','myconid-pink','slime-purple']] },
    { id: 8, name: 'Abyssal Rift',  typeLock: null,     waves: 8, stars: 5,
      enemies: [['slime-green','slime-blue','slime-pink'],['myconid-red','goblin-spear','spike'],['slime-black','myconid-purple','goblin-bomb'],['goblin-archer','myconid-green','slime-golden'],['myconid-pink','slime-purple','spike'],['slime-golden-big','goblin-bomb','goblin-archer'],['slime-black-big','venom-bloom','myconid-purple'],['slime-pink-big','mimic','slime-blue-big']] }
  ];

  // ── DOM refs ──────────────────────────────────────
  var canvas = document.getElementById('bt-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var dungeonSelectScreen = document.getElementById('bt-dungeon-select');
  var teamScreen = document.getElementById('bt-team-screen');
  var battleScreen = document.getElementById('bt-battle-screen');
  var resultsOverlay = document.getElementById('bt-results-overlay');

  var dungeonGrid = document.getElementById('bt-dungeon-grid');
  var dungeonNameEl = document.getElementById('bt-dungeon-name');
  var dungeonTypeLockEl = document.getElementById('bt-dungeon-type-lock');
  var creaturePicker = document.getElementById('bt-creature-picker');
  var noPetsMsg = document.getElementById('bt-no-pets');
  var enterDungeonBtn = document.getElementById('bt-enter-dungeon');
  var backToDungeonsBtn = document.getElementById('bt-back-to-dungeons');

  var waveLabel = document.getElementById('bt-wave-label');
  var dungeonLabel = document.getElementById('bt-dungeon-label');
  var waveBar = document.getElementById('bt-wave-bar');
  var speedBtn = document.getElementById('bt-speed-btn');
  var skipWaveBtn = document.getElementById('bt-skip-wave');
  var retreatBtn = document.getElementById('bt-retreat-btn');
  var logInner = document.getElementById('bt-log-inner');
  var logEl = document.getElementById('bt-log');

  var resultsTitle = document.getElementById('bt-results-title');
  var resultWaves = document.getElementById('bt-result-waves');
  var resultXP = document.getElementById('bt-result-xp');
  var resultCoins = document.getElementById('bt-result-coins');
  var resultJB = document.getElementById('bt-result-jb');
  var firstClearEl = document.getElementById('bt-first-clear');
  var skinUnlockEl = document.getElementById('bt-skin-unlock');
  var skinUnlockContent = document.getElementById('bt-skin-unlock-content');
  var creatureXPList = document.getElementById('bt-creature-xp-list');
  var resultsContinueBtn = document.getElementById('bt-results-continue');

  var statRaids = document.getElementById('bt-stat-raids');
  var statClears = document.getElementById('bt-stat-clears');
  var statXP = document.getElementById('bt-stat-xp');
  var statCoins = document.getElementById('bt-stat-coins');
  var resetStatsBtn = document.getElementById('bt-reset-stats');
  var dungeonStatsEl = document.getElementById('bt-dungeon-stats');

  // ── Canvas sizing ─────────────────────────────────
  var gameArea = document.getElementById('bt-game-area');
  var dpr = window.devicePixelRatio || 1;

  function sizeCanvas() {
    if (!gameArea) return;
    var containerW = gameArea.parentElement.clientWidth || 400;
    var w = containerW;
    var h = Math.round(w * CANVAS_RATIO);
    CANVAS_W = w;
    CANVAS_H = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
  }

  // ── Theme colors ──────────────────────────────────
  var themeColors = { bg: '#1a1a2e', fg: '#c8c8c8', accent: '#93c572' };

  function readThemeColors() {
    var style = getComputedStyle(document.documentElement);
    themeColors.bg = style.getPropertyValue('--background').trim() || '#1a1a2e';
    themeColors.fg = style.getPropertyValue('--foreground').trim() || '#c8c8c8';
    themeColors.accent = style.getPropertyValue('--accent').trim() || '#93c572';
  }

  readThemeColors();
  var themeObs = new MutationObserver(function () {
    readThemeColors();
    if (currentScreen === 'battle') renderBattle();
  });
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── Game data ─────────────────────────────────────
  var catalog = null;
  var spriteData = null;
  var petState = null;
  var enemyData = null;
  var gearData = null;
  var spriteImages = {};
  var enemyImages = {};
  var gearSheetImages = {};
  var vfxImage = null;

  // ── Inventory & Equip State ─────────────────────
  var inventory = []; // array of gear objects
  var equipMap = {};  // { creatureId: { weapon: gearId, armor: gearId, accessory: gearId } }

  function loadInventory() {
    try {
      var raw = localStorage.getItem(INVENTORY_KEY);
      if (raw) inventory = JSON.parse(raw);
      if (!Array.isArray(inventory)) inventory = [];
    } catch (e) { inventory = []; }
  }

  function saveInventory() {
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch (e) {}
  }

  function loadEquipMap() {
    try {
      var raw = localStorage.getItem(EQUIP_KEY);
      if (raw) equipMap = JSON.parse(raw);
      if (typeof equipMap !== 'object' || equipMap === null) equipMap = {};
    } catch (e) { equipMap = {}; }
  }

  function saveEquipMap() {
    try { localStorage.setItem(EQUIP_KEY, JSON.stringify(equipMap)); } catch (e) {}
  }

  // ── State ─────────────────────────────────────────
  var currentScreen = 'dungeon-select';
  var selectedDungeon = null;
  var selectedDifficulty = 'normal';
  var teamSlots = [null, null, null]; // creature IDs
  var team = [];       // fighter objects (player creatures)
  var enemies = [];    // fighter objects (current wave enemies)
  var currentWave = 0;
  var totalWaves = 0;
  var wavesCleared = 0;
  var battleRunning = false;
  var battleSpeed = 1; // 1 or 2
  var skipWave = false;
  var animQueue = [];
  var animTimer = null;
  var autoTimer = null;
  var activeIntervals = []; // track HP lerp / faint intervals for cleanup
  var inventoryFilterSlot = 'all';
  var inventoryOpen = false;
  var gearModalItem = null;
  var equipPickerSlot = null;
  var equipPickerCreature = null;

  // ── Dungeon progress (per-difficulty) ─────────────
  // Structure: { unlocked: [1], difficulties: { "1": { normal: true, hard: false, brutal: false }, ... } }
  var dungeonProgress = { unlocked: [1], difficulties: {} };

  function loadDungeonProgress() {
    try {
      var raw = localStorage.getItem(DUNGEON_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        // Migrate old format: { cleared: [1,2], unlocked: [1,2,3] }
        if (d.cleared && !d.difficulties) {
          dungeonProgress.unlocked = d.unlocked || [1];
          dungeonProgress.difficulties = {};
          for (var c = 0; c < d.cleared.length; c++) {
            dungeonProgress.difficulties[d.cleared[c]] = { normal: true, hard: false, brutal: false };
          }
        } else {
          dungeonProgress.unlocked = d.unlocked || [1];
          dungeonProgress.difficulties = d.difficulties || {};
        }
      }
    } catch (e) {}
    if (dungeonProgress.unlocked.indexOf(1) === -1) dungeonProgress.unlocked.push(1);
  }

  function saveDungeonProgress() {
    try { localStorage.setItem(DUNGEON_KEY, JSON.stringify(dungeonProgress)); } catch (e) {}
  }

  function isDungeonCleared(dungeonId, difficulty) {
    var d = dungeonProgress.difficulties[dungeonId];
    if (!d) return false;
    return !!d[difficulty];
  }

  function isDungeonClearedAny(dungeonId) {
    var d = dungeonProgress.difficulties[dungeonId];
    if (!d) return false;
    return d.normal || d.hard || d.brutal;
  }

  function isDifficultyUnlocked(dungeonId, difficulty) {
    if (difficulty === 'normal') return true;
    if (difficulty === 'hard') return isDungeonCleared(dungeonId, 'normal');
    if (difficulty === 'brutal') return isDungeonCleared(dungeonId, 'hard');
    return false;
  }

  function isSkinUnlocked(creatureId) {
    var rewards = gearData && gearData.skinRewards;
    if (!rewards) return false;
    var dungeonIds = Object.keys(rewards);
    for (var i = 0; i < dungeonIds.length; i++) {
      if (rewards[dungeonIds[i]].creatureId === creatureId) {
        return isDungeonCleared(dungeonIds[i], 'brutal');
      }
    }
    return false;
  }

  function getSkinRewardForDungeon(dungeonId) {
    var rewards = gearData && gearData.skinRewards;
    if (!rewards) return null;
    return rewards[dungeonId] || null;
  }

  function markDungeonCleared(dungeonId, difficulty) {
    if (!dungeonProgress.difficulties[dungeonId]) {
      dungeonProgress.difficulties[dungeonId] = { normal: false, hard: false, brutal: false };
    }
    dungeonProgress.difficulties[dungeonId][difficulty] = true;
  }

  // ── Stats ─────────────────────────────────────────
  var stats = { raids: 0, clears: 0, totalXP: 0, totalCoins: 0 };

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        stats.raids = s.raids || 0;
        stats.clears = s.clears || 0;
        stats.totalXP = s.totalXP || 0;
        stats.totalCoins = s.totalCoins || 0;
      }
    } catch (e) {}
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function renderStats() {
    if (statRaids) statRaids.textContent = stats.raids;
    if (statClears) statClears.textContent = stats.clears;
    if (statXP) statXP.textContent = stats.totalXP;
    if (statCoins) statCoins.textContent = stats.totalCoins;
  }

  // ── Data loading ──────────────────────────────────
  function loadData(callback) {
    var loaded = 0;
    var needed = 4;

    function check() {
      loaded++;
      if (loaded >= needed) callback();
    }

    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', '/data/petcatalog.json', true);
    xhr1.onload = function () {
      if (xhr1.status === 200) {
        try { catalog = JSON.parse(xhr1.responseText); } catch (e) {}
      }
      check();
    };
    xhr1.onerror = check;
    xhr1.send();

    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/data/petsprites.json', true);
    xhr2.onload = function () {
      if (xhr2.status === 200) {
        try { spriteData = JSON.parse(xhr2.responseText); } catch (e) {}
      }
      check();
    };
    xhr2.onerror = check;
    xhr2.send();

    var xhr3 = new XMLHttpRequest();
    xhr3.open('GET', '/data/dungeon-enemies.json', true);
    xhr3.onload = function () {
      if (xhr3.status === 200) {
        try { enemyData = JSON.parse(xhr3.responseText); } catch (e) {}
      }
      check();
    };
    xhr3.onerror = check;
    xhr3.send();

    var xhr4 = new XMLHttpRequest();
    xhr4.open('GET', '/data/dungeongear.json', true);
    xhr4.onload = function () {
      if (xhr4.status === 200) {
        try { gearData = JSON.parse(xhr4.responseText); } catch (e) {}
      }
      check();
    };
    xhr4.onerror = check;
    xhr4.send();
  }

  function loadPetState() {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (raw) petState = JSON.parse(raw);
    } catch (e) {}
  }

  function savePetState() {
    try {
      if (petState) localStorage.setItem(PET_KEY, JSON.stringify(petState));
    } catch (e) {}
  }

  function preloadSprite(spriteKey, callback) {
    if (spriteImages[spriteKey]) { if (callback) callback(); return; }
    // spriteKey can be "fox" or "fox-alt"
    var isAlt = spriteKey.length > 4 && spriteKey.lastIndexOf('-alt') === spriteKey.length - 4;
    var baseId = isAlt ? spriteKey.slice(0, -4) : spriteKey;
    if (!spriteData || !spriteData[baseId]) { if (callback) callback(); return; }
    var sheetUrl = isAlt && spriteData[baseId].altSheet ? spriteData[baseId].altSheet : spriteData[baseId].sheet;
    var img = new Image();
    img.onload = function () { spriteImages[spriteKey] = img; if (callback) callback(); };
    img.onerror = function () { if (callback) callback(); };
    img.src = sheetUrl;
  }

  function preloadEnemySprite(enemyId, callback) {
    if (enemyImages[enemyId]) { if (callback) callback(); return; }
    if (!enemyData || !enemyData[enemyId]) { if (callback) callback(); return; }
    var img = new Image();
    img.onload = function () { enemyImages[enemyId] = img; if (callback) callback(); };
    img.onerror = function () { if (callback) callback(); };
    img.src = enemyData[enemyId].sprite;
  }

  function preloadVFX(callback) {
    if (vfxImage) { if (callback) callback(); return; }
    var img = new Image();
    img.onload = function () { vfxImage = img; if (callback) callback(); };
    img.onerror = function () { if (callback) callback(); };
    img.src = '/images/pets/battle_vfx.png';
  }

  // ── Gear stat aggregation ─────────────────────────
  function calcEquippedGearStats(creatureId) {
    var gs = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    var eq = equipMap[creatureId];
    if (!eq) return gs;
    var slots = ['weapon', 'armor', 'accessory'];
    for (var s = 0; s < slots.length; s++) {
      var gearId = eq[slots[s]];
      if (gearId == null) continue;
      var gear = null;
      for (var i = 0; i < inventory.length; i++) {
        if (inventory[i].id === gearId) { gear = inventory[i]; break; }
      }
      if (!gear) continue;
      // Main stat + upgrade bonus
      if (gear.mainStat) gs[gear.mainStat] += (gear.mainValue || 0) + (gear.upgradeLevel || 0);
      // Secondary stat (armor HP, accessory CRI) + upgrade bonus
      if (gear.secondaryStat) {
        var secBonus = 0;
        if (gearData && gearData.upgrade && gear.upgradeLevel) {
          var secPerLvl = gearData.upgrade.secondaryStatPerLevel || {};
          secBonus = (secPerLvl[gear.secondaryStat] || 0) * gear.upgradeLevel;
        }
        gs[gear.secondaryStat] += (gear.secondaryValue || 0) + secBonus;
      }
      // Sub stats
      if (gear.subStats) {
        for (var j = 0; j < gear.subStats.length; j++) {
          gs[gear.subStats[j].stat] += gear.subStats[j].value;
        }
      }
    }
    return gs;
  }

  // ── Single gear stat aggregation (for comparison) ──
  function calcSingleGearStats(gear) {
    var gs = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    if (!gear) return gs;
    if (gear.mainStat) gs[gear.mainStat] += (gear.mainValue || 0) + (gear.upgradeLevel || 0);
    if (gear.secondaryStat) {
      var secBonus = 0;
      if (gearData && gearData.upgrade && gear.upgradeLevel) {
        var secPerLvl = gearData.upgrade.secondaryStatPerLevel || {};
        secBonus = (secPerLvl[gear.secondaryStat] || 0) * gear.upgradeLevel;
      }
      gs[gear.secondaryStat] += (gear.secondaryValue || 0) + secBonus;
    }
    if (gear.subStats) {
      for (var j = 0; j < gear.subStats.length; j++) {
        gs[gear.subStats[j].stat] += gear.subStats[j].value;
      }
    }
    return gs;
  }

  function calcGearDiff(candidateGear, currentGear) {
    var cand = calcSingleGearStats(candidateGear);
    var cur = calcSingleGearStats(currentGear);
    var diff = {};
    var hasDiff = false;
    var stats = ['atk', 'def', 'hp', 'spd', 'cri'];
    for (var i = 0; i < stats.length; i++) {
      var d = cand[stats[i]] - cur[stats[i]];
      if (d !== 0) { diff[stats[i]] = d; hasDiff = true; }
    }
    return hasDiff ? diff : null;
  }

  // ── Set Bonus Calculation ────────────────────────
  function calcSetBonuses(creatureId) {
    var bonus = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    if (!gearData || !gearData.sets) return bonus;
    var eq = equipMap[creatureId];
    if (!eq) return bonus;

    // Gather names of equipped gear
    var equippedNames = [];
    var slotArr = ['weapon', 'armor', 'accessory'];
    for (var i = 0; i < slotArr.length; i++) {
      var gearId = eq[slotArr[i]];
      if (gearId != null) {
        var gear = findGearById(gearId);
        if (gear) equippedNames.push(gear.name);
      }
    }

    var setNames = Object.keys(gearData.sets);
    for (var si = 0; si < setNames.length; si++) {
      var setDef = gearData.sets[setNames[si]];
      var count = 0;
      for (var pi = 0; pi < setDef.pieces.length; pi++) {
        if (equippedNames.indexOf(setDef.pieces[pi]) !== -1) count++;
      }
      var thresholds = ['3', '2']; // check higher first, only apply highest
      for (var ti = 0; ti < thresholds.length; ti++) {
        if (count >= parseInt(thresholds[ti]) && setDef.bonuses[thresholds[ti]]) {
          var b = setDef.bonuses[thresholds[ti]];
          var bKeys = Object.keys(b);
          for (var bk = 0; bk < bKeys.length; bk++) {
            bonus[bKeys[bk]] += b[bKeys[bk]];
          }
          break;
        }
      }
    }
    return bonus;
  }

  // ── Create fighter objects ────────────────────────
  function createPlayerFighter(creatureId, level) {
    if (!catalog || !catalog.creatures[creatureId]) return null;
    var c = catalog.creatures[creatureId];
    var tier = c.tier || 'common';
    var type = c.type || 'fire';
    var stats = calcCreatureStats(tier, type, level);
    var gearStats = calcEquippedGearStats(creatureId);
    var setBonuses = calcSetBonuses(creatureId);
    // Merge set bonuses into gearStats
    gearStats.atk += setBonuses.atk;
    gearStats.def += setBonuses.def;
    gearStats.hp += setBonuses.hp;
    gearStats.spd += setBonuses.spd;
    gearStats.cri += setBonuses.cri;
    var totalHp = stats.hp + gearStats.hp;
    var moveset = getMovesetForCreature(type, tier);
    var sid = c.spriteId || creatureId;
    var petSkin = (petState && petState.pets && petState.pets[creatureId]) ? petState.pets[creatureId].skin : 'default';
    var useAlt = petSkin === 'alt' && spriteData && spriteData[sid] && spriteData[sid].altSheet;
    return {
      id: creatureId, name: c.name, type: type, tier: tier, level: level,
      hp: totalHp, maxHp: totalHp, displayHp: totalHp,
      stats: stats, gearStats: gearStats,
      moveset: moveset, opacity: 1, offsetX: 0, offsetY: 0,
      spriteId: sid,
      spriteKey: useAlt ? sid + '-alt' : sid,
      isPlayer: true, isEnemy: false,
      status: { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 }
    };
  }

  function createEnemyFighter(enemyId, dungeonStars, difficultyKey) {
    if (!enemyData || !enemyData[enemyId]) return null;
    var e = enemyData[enemyId];
    var diff = gearData && gearData.difficulty[difficultyKey] ? gearData.difficulty[difficultyKey] : { hpMult: 1, atkMult: 1, levelBonus: 0 };
    var scaleFactor = 1 + 0.15 * (dungeonStars - 1);
    var enemyLevel = dungeonStars + diff.levelBonus;
    var hpBase = Math.floor(e.hpBase * scaleFactor * diff.hpMult);
    var atkBase = Math.floor((e.atkBase || 10) * scaleFactor * diff.atkMult);
    var type = e.type || 'nature';
    var moveset = getMovesetForEnemy(type);
    return {
      id: enemyId, name: e.name, type: type, tier: 'common',
      level: enemyLevel,
      hp: hpBase, maxHp: hpBase, displayHp: hpBase,
      stats: { hp: hpBase, atk: atkBase, def: Math.floor((e.defBase || 6) * scaleFactor), spd: Math.floor((e.spdBase || 8) * scaleFactor), cri: e.criBase || 3 },
      gearStats: { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 },
      moveset: moveset, opacity: 1, offsetX: 0, offsetY: 0,
      enemyId: enemyId, isBoss: e.isBoss || false,
      isPlayer: false, isEnemy: true,
      status: { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 }
    };
  }

  // ── Drawing helpers ───────────────────────────────
  function drawPlayerSprite(fighter, x, y, size) {
    var img = spriteImages[fighter.spriteKey || fighter.spriteId];
    var sd = spriteData ? spriteData[fighter.spriteId] : null;
    if (!img || !sd) {
      drawFallbackCircle(fighter, x, y, size);
      return;
    }
    var fw = sd.frameWidth || 48;
    var fh = sd.frameHeight || 48;
    var frames = sd.frames || 3;
    var frameOffset = sd.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + (fighter.level || 1) - 1, frames - 1);
    ctx.save();
    ctx.globalAlpha = fighter.opacity;
    ctx.drawImage(img, frameIdx * fw, 0, fw, fh, x, y, size, size);
    ctx.restore();
  }

  function drawEnemySprite(fighter, x, y, size, animFrame) {
    var img = enemyImages[fighter.enemyId];
    var ed = enemyData ? enemyData[fighter.enemyId] : null;
    if (!img || !ed) {
      drawFallbackCircle(fighter, x, y, size);
      return;
    }
    var fw = ed.frameWidth || 32;
    var fh = ed.frameHeight || 32;
    var frames = ed.frames || 1;
    var row = ed.row || 0;
    var frameIdx = frames > 1 ? (animFrame % frames) : 0;
    ctx.save();
    ctx.globalAlpha = fighter.opacity;
    ctx.drawImage(img, frameIdx * fw, row * fh, fw, fh, x, y, size, size);
    ctx.restore();
  }

  function drawFallbackCircle(fighter, x, y, size) {
    ctx.fillStyle = TYPE_COLORS[fighter.type] || '#888';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = themeColors.fg;
    ctx.font = 'bold ' + Math.round(10 * uiScale()) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fighter.name.charAt(0), x + size / 2, y + size / 2 + Math.round(4 * uiScale()));
  }

  function roundRect(rx, ry, rw, rh, r) {
    if (ctx.roundRect) { ctx.roundRect(rx, ry, rw, rh, r); return; }
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx.lineTo(rx + r, ry + rh);
    ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx.lineTo(rx, ry + r);
    ctx.arcTo(rx, ry, rx + r, ry, r);
    ctx.closePath();
  }

  // UI scale factor: all canvas text/bars scale with canvas width
  function uiScale() { return CANVAS_W / 400; }

  function drawHPBar(x, y, w, hp, maxHp, displayHp) {
    var s = uiScale();
    var pct = maxHp > 0 ? displayHp / maxHp : 0;
    var barH = Math.round(8 * s);
    var radius = Math.round(2 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); roundRect(x, y, w, barH, radius); ctx.fill();
    var color = pct > 0.5 ? '#4caf50' : (pct > 0.25 ? '#ff9800' : '#f44336');
    if (pct > 0) {
      ctx.fillStyle = color;
      ctx.beginPath(); roundRect(x, y, Math.max(2, w * pct), barH, radius); ctx.fill();
    }
    ctx.strokeStyle = themeColors.fg + '40';
    ctx.lineWidth = 1;
    ctx.beginPath(); roundRect(x, y, w, barH, radius); ctx.stroke();
    ctx.fillStyle = themeColors.fg;
    ctx.font = 'bold ' + Math.round(7 * s) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(displayHp) + '/' + maxHp, x + w / 2, y + barH - Math.round(1 * s));
  }

  function drawTypeBadge(text, x, y) {
    var s = uiScale();
    var color = TYPE_COLORS[text] || themeColors.fg;
    ctx.font = 'bold ' + Math.round(7 * s) + 'px monospace';
    var tw = ctx.measureText(text.toUpperCase()).width + Math.round(6 * s);
    var badgeH = Math.round(12 * s);
    ctx.fillStyle = color + '30';
    ctx.beginPath(); roundRect(x, y, tw, badgeH, Math.round(2 * s)); ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text.toUpperCase(), x + Math.round(3 * s), y + Math.round(9 * s));
  }

  function drawStatusIcons(fighter, x, y) {
    var s = uiScale();
    var icons = [];
    if (fighter.status.burn > 0) icons.push({ label: 'BRN', color: '#ff6b35' });
    if (fighter.status.curse > 0) icons.push({ label: 'CRS', color: '#ab47bc' });
    if (fighter.status.stun) icons.push({ label: 'STN', color: '#ffd54f' });
    if (fighter.status.slow > 0) icons.push({ label: 'SLW', color: '#29b6f6' });
    if (fighter.status.dodge) icons.push({ label: 'EVD', color: '#4caf50' });
    if (fighter.status.atkUp > 0) icons.push({ label: 'ATK+', color: '#f44336' });
    ctx.font = 'bold ' + Math.round(6 * s) + 'px monospace';
    var iconW = Math.round(26 * s);
    var iconBoxW = Math.round(24 * s);
    var iconH = Math.round(10 * s);
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var ix = x + i * iconW;
      ctx.fillStyle = icon.color + '30';
      ctx.beginPath(); roundRect(ix, y, iconBoxW, iconH, Math.round(2 * s)); ctx.fill();
      ctx.fillStyle = icon.color;
      ctx.textAlign = 'left';
      ctx.fillText(icon.label, ix + Math.round(2 * s), y + Math.round(8 * s));
    }
  }

  // ── Floating text particles ───────────────────────
  var floatingTexts = [];

  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text: text, x: x, y: y, color: color || themeColors.fg, life: 40, maxLife: 40 });
  }

  function updateFloatingTexts() {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function drawFloatingTexts() {
    for (var i = 0; i < floatingTexts.length; i++) {
      var ft = floatingTexts[i];
      var alpha = Math.min(1, ft.life / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold ' + Math.round(12 * uiScale()) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }
  }

  // ── Shake & flash effects ─────────────────────────
  var shakeTargetIdx = -1; // index into allFighters
  var shakeTicks = 0;
  var shakeIntensity = 4;
  var flashColor = null;
  var flashTicks = 0;

  function getShakeOffset() {
    if (shakeTicks <= 0) return { x: 0, y: 0 };
    shakeTicks--;
    var amt = shakeIntensity * (shakeTicks / 10);
    return { x: (Math.random() - 0.5) * amt * 2, y: (Math.random() - 0.5) * amt * 2 };
  }

  // ── VFX drawing ───────────────────────────────────
  var activeVFX = []; // { type, x, y, frame, maxFrames }

  function triggerVFX(moveType, targetX, targetY) {
    var row = VFX_ROWS[moveType];
    if (row === undefined) row = VFX_ROWS.neutral;
    activeVFX.push({ row: row, x: targetX, y: targetY, frame: 0, maxFrames: VFX_FRAMES });
  }

  function updateVFX() {
    for (var i = activeVFX.length - 1; i >= 0; i--) {
      activeVFX[i].frame++;
      if (activeVFX[i].frame >= activeVFX[i].maxFrames) activeVFX.splice(i, 1);
    }
  }

  function drawVFX() {
    if (!vfxImage) return;
    for (var i = 0; i < activeVFX.length; i++) {
      var v = activeVFX[i];
      var sx = v.frame * VFX_FRAME_SIZE;
      var sy = v.row * VFX_FRAME_SIZE;
      var vfxSize = Math.round(48 * uiScale());
      var vfxHalf = Math.round(vfxSize / 2);
      ctx.drawImage(vfxImage, sx, sy, VFX_FRAME_SIZE, VFX_FRAME_SIZE, v.x - vfxHalf, v.y - vfxHalf, vfxSize, vfxSize);
    }
  }

  // ── Enemy animation frame ─────────────────────────
  var enemyAnimFrame = 0;
  var enemyAnimTimer = null;

  function startEnemyAnimLoop() {
    if (enemyAnimTimer) clearInterval(enemyAnimTimer);
    enemyAnimTimer = setInterval(function () {
      enemyAnimFrame++;
      if (animQueue.length === 0) renderBattle();
    }, 200);
  }

  function stopEnemyAnimLoop() {
    if (enemyAnimTimer) { clearInterval(enemyAnimTimer); enemyAnimTimer = null; }
  }

  // ── 3v3 Battle rendering ──────────────────────────
  // Layout: players on left, enemies on right
  // Sprite sizes scale with canvas width

  function getSpriteSize() { return Math.round(CANVAS_W * 0.13); }
  function getBossSpriteSize() { return Math.round(CANVAS_W * 0.17); }

  function getFighterPositions() {
    var positions = [];
    var spriteSize = getSpriteSize();
    var bossSize = getBossSpriteSize();
    var leftX = CANVAS_W * 0.10;
    var rightX = CANVAS_W * 0.56;
    var startY = CANVAS_H * 0.10;
    var spacingY = CANVAS_H * 0.29;

    // Player positions (left side, top to bottom)
    for (var i = 0; i < 3; i++) {
      positions.push({
        side: 'player', idx: i,
        x: leftX, y: startY + i * spacingY,
        size: spriteSize
      });
    }
    // Enemy positions (right side, top to bottom)
    for (var j = 0; j < 3; j++) {
      var eSize = (enemies[j] && enemies[j].isBoss) ? bossSize : spriteSize;
      positions.push({
        side: 'enemy', idx: j,
        x: rightX, y: startY + j * spacingY,
        size: eSize
      });
    }
    return positions;
  }

  function renderBattle() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Divider line
    ctx.strokeStyle = themeColors.fg + '10';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W * 0.5, 10);
    ctx.lineTo(CANVAS_W * 0.5, CANVAS_H - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Side labels
    var s = uiScale();
    ctx.fillStyle = themeColors.fg + '25';
    ctx.font = 'bold ' + Math.round(10 * s) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR TEAM', CANVAS_W * 0.25, CANVAS_H - Math.round(8 * s));
    ctx.fillText('ENEMIES', CANVAS_W * 0.75, CANVAS_H - Math.round(8 * s));

    var positions = getFighterPositions();
    var shakeOff = getShakeOffset();

    // Draw player team
    for (var p = 0; p < team.length; p++) {
      var fighter = team[p];
      var pos = positions[p];
      if (!pos) continue;
      var px = pos.x + (fighter.offsetX || 0);
      var py = pos.y + (fighter.offsetY || 0);
      if (shakeTargetIdx >= 0 && !fighter.isEnemy && team.indexOf(fighter) === shakeTargetIdx) {
        px += shakeOff.x; py += shakeOff.y;
      }
      // Dead fighters: show ghosted at 20% if faint animation finished (opacity=0)
      if (fighter.hp <= 0 && fighter.opacity <= 0) fighter.opacity = 0.2;
      drawPlayerSprite(fighter, px, py, pos.size);
      // Name
      ctx.fillStyle = themeColors.fg;
      ctx.font = 'bold ' + Math.round(9 * s) + 'px monospace';
      ctx.textAlign = 'center';
      var nameX = px + pos.size / 2;
      ctx.fillText(fighter.name, nameX, py - Math.round(2 * s));
      // HP bar
      var hpBarW = pos.size + Math.round(8 * s);
      drawHPBar(px - Math.round(4 * s), py + pos.size + Math.round(3 * s), hpBarW, fighter.hp, fighter.maxHp, fighter.displayHp);
      // Type badge
      drawTypeBadge(fighter.type, px, py + pos.size + Math.round(14 * s));
      // Status icons
      drawStatusIcons(fighter, px, py + pos.size + Math.round(27 * s));
    }

    // Draw enemies
    for (var e = 0; e < enemies.length; e++) {
      var enemy = enemies[e];
      var epos = positions[3 + e];
      if (!epos) continue;
      var ex = epos.x + (enemy.offsetX || 0);
      var ey = epos.y + (enemy.offsetY || 0);
      // Shake for enemies uses a different index range
      if (shakeTargetIdx >= 0 && enemy.isEnemy && enemies.indexOf(enemy) === (shakeTargetIdx - 100)) {
        ex += shakeOff.x; ey += shakeOff.y;
      }
      // Dead enemies: show ghosted at 20% if faint animation finished (opacity=0)
      if (enemy.hp <= 0 && enemy.opacity <= 0) enemy.opacity = 0.2;
      drawEnemySprite(enemy, ex, ey, epos.size, enemyAnimFrame);
      // Name
      ctx.fillStyle = themeColors.fg;
      ctx.font = 'bold ' + Math.round(9 * s) + 'px monospace';
      ctx.textAlign = 'center';
      var enameX = ex + epos.size / 2;
      ctx.fillText(enemy.name, enameX, ey - Math.round(2 * s));
      // HP bar
      var eHpBarW = epos.size + Math.round(8 * s);
      drawHPBar(ex - Math.round(4 * s), ey + epos.size + Math.round(3 * s), eHpBarW, enemy.hp, enemy.maxHp, enemy.displayHp);
      // Type badge
      drawTypeBadge(enemy.type, ex, ey + epos.size + Math.round(14 * s));
      // Status icons
      drawStatusIcons(enemy, ex, ey + epos.size + Math.round(27 * s));
    }

    // Flash
    if (flashTicks > 0) {
      ctx.globalAlpha = flashTicks / 8;
      ctx.fillStyle = flashColor || '#fff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
      flashTicks--;
    }

    // VFX
    updateVFX();
    drawVFX();

    // Floating texts
    updateFloatingTexts();
    drawFloatingTexts();
  }

  // ── Log system ────────────────────────────────────
  function logMessage(text, className) {
    var p = document.createElement('p');
    p.className = 'bt-log-line' + (className ? ' ' + className : '');
    p.textContent = text;
    logInner.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog() {
    logInner.innerHTML = '';
  }

  // ── HP lerp animation ─────────────────────────────
  function startHPLerp(fighter, callback) {
    if (!fighter) { if (callback) callback(); return; }
    var targetHp = fighter.hp;
    var startHp = fighter.displayHp;
    if (Math.abs(startHp - targetHp) < 1) {
      fighter.displayHp = targetHp;
      renderBattle();
      if (callback) callback();
      return;
    }
    var steps = 12;
    var step = 0;
    var iv = setInterval(function () {
      step++;
      fighter.displayHp = startHp + (targetHp - startHp) * (step / steps);
      if (step >= steps) {
        fighter.displayHp = targetHp;
        clearInterval(iv);
        var idx = activeIntervals.indexOf(iv);
        if (idx !== -1) activeIntervals.splice(idx, 1);
        renderBattle();
        if (callback) callback();
        return;
      }
      renderBattle();
    }, 20);
    activeIntervals.push(iv);
  }

  // ── Status tick ───────────────────────────────────
  function tickStatus(fighter) {
    var msgs = [];
    if (fighter.status.burn > 0) {
      var burnDmg = Math.max(1, Math.floor(fighter.maxHp * 0.06));
      fighter.hp = Math.max(0, fighter.hp - burnDmg);
      fighter.status.burn--;
      msgs.push(fighter.name + ' took ' + burnDmg + ' burn damage!');
    }
    if (fighter.status.curse > 0) {
      var curseDmg = Math.max(1, Math.floor(fighter.maxHp * 0.12));
      fighter.hp = Math.max(0, fighter.hp - curseDmg);
      fighter.status.curse--;
      msgs.push(fighter.name + ' took ' + curseDmg + ' curse damage!');
    }
    if (fighter.status.slow > 0) fighter.status.slow--;
    if (fighter.status.atkUp > 0) fighter.status.atkUp--;
    return msgs;
  }

  // ── AI move selection ─────────────────────────────
  function pickAIMove(fighter, targetList) {
    var moveset = fighter.moveset;
    var bestScore = -1;
    var bestMove = moveset[0];
    // Find lowest HP target
    var lowestTarget = null;
    var lowestHP = Infinity;
    for (var t = 0; t < targetList.length; t++) {
      if (targetList[t].hp > 0 && targetList[t].hp < lowestHP) {
        lowestHP = targetList[t].hp;
        lowestTarget = targetList[t];
      }
    }
    if (!lowestTarget) return moveset[0];

    for (var i = 0; i < moveset.length; i++) {
      var move = MOVES[moveset[i]];
      if (!move) continue;
      var score = 0;
      if (move.power > 0) {
        var typeMult = getTypeMultiplier(move.type, lowestTarget.type);
        score = move.power * typeMult;
        if (move.type === fighter.type) score *= 1.25;
        if (fighter.hp < fighter.maxHp * 0.3) score *= 1.3;
      } else if (move.effect === 'heal') {
        if (fighter.hp < fighter.maxHp * 0.5) {
          score = 50 + (1 - fighter.hp / fighter.maxHp) * 30;
        } else {
          score = 5;
        }
      } else if (move.effect === 'dodge') {
        score = 15;
      } else if (move.effect === 'atkUp') {
        score = fighter.status.atkUp > 0 ? 5 : 25;
      }
      score *= (0.8 + Math.random() * 0.4);
      if (score > bestScore) { bestScore = score; bestMove = moveset[i]; }
    }
    return bestMove;
  }

  // ── Pick target (lowest HP living enemy on opposite side) ──
  function pickTarget(fighter) {
    var targetList = fighter.isPlayer ? enemies : team;
    var lowest = null;
    var lowestHP = Infinity;
    for (var i = 0; i < targetList.length; i++) {
      if (targetList[i].hp > 0 && targetList[i].hp < lowestHP) {
        lowestHP = targetList[i].hp;
        lowest = targetList[i];
      }
    }
    return lowest;
  }

  // ── Get fighter canvas position ───────────────────
  function getFighterPos(fighter) {
    var positions = getFighterPositions();
    if (fighter.isPlayer) {
      var idx = team.indexOf(fighter);
      if (idx >= 0 && positions[idx]) {
        return { x: positions[idx].x + positions[idx].size / 2, y: positions[idx].y + positions[idx].size / 2 };
      }
    } else {
      var eidx = enemies.indexOf(fighter);
      if (eidx >= 0 && positions[3 + eidx]) {
        return { x: positions[3 + eidx].x + positions[3 + eidx].size / 2, y: positions[3 + eidx].y + positions[3 + eidx].size / 2 };
      }
    }
    return { x: CANVAS_W / 2, y: CANVAS_H / 2 };
  }

  // ── Execute single action (enqueue animations) ────
  function executeAction(fighter, target, moveId) {
    var move = MOVES[moveId];
    if (!move) return;

    // Stun check
    if (fighter.status.stun) {
      animQueue.push({ type: 'log', text: fighter.name + ' is stunned!' });
      animQueue.push({ type: 'delay', ms: 200 });
      fighter.status.stun = false;
      return;
    }

    animQueue.push({ type: 'log', text: fighter.name + ' used ' + move.name + '!' });
    animQueue.push({ type: 'delay', ms: 150 });

    // Status moves
    if (move.effect === 'dodge' && move.power === 0) {
      fighter.status.dodge = true;
      animQueue.push({ type: 'log', text: fighter.name + ' braces to dodge!' });
      return;
    }
    if (move.effect === 'heal' && move.power === 0) {
      var healAmt = Math.floor(fighter.maxHp * 0.25);
      animQueue.push({ type: 'check', callback: function () {
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
      }});
      animQueue.push({ type: 'hpLerp', fighter: fighter });
      var fpos = getFighterPos(fighter);
      animQueue.push({ type: 'floatText', text: '+' + healAmt, x: fpos.x, y: fpos.y - 20, color: '#4caf50' });
      animQueue.push({ type: 'log', text: fighter.name + ' restored ' + healAmt + ' HP!' });
      return;
    }
    if (move.effect === 'atkUp' && move.power === 0) {
      fighter.status.atkUp = 3;
      animQueue.push({ type: 'flash', color: '#f44336', ticks: 4 });
      animQueue.push({ type: 'log', text: fighter.name + "'s attack rose sharply!" });
      return;
    }

    // Attack — lunge toward target then check dodge
    var lungeDir = fighter.isPlayer ? 1 : -1;
    var lungeDist = CANVAS_W * 0.12;
    animQueue.push({ type: 'lunge', fighter: fighter, dx: lungeDist * lungeDir, dy: 0 });

    animQueue.push({ type: 'check', callback: function () {
      if (target.status.dodge) {
        target.status.dodge = false;
        if (Math.random() < 0.75) {
          var tpos = getFighterPos(target);
          animQueue.push({ type: 'floatText', text: 'DODGE!', x: tpos.x, y: tpos.y - 20, color: '#4caf50' });
          animQueue.push({ type: 'log', text: target.name + ' dodged!' });
          animQueue.push({ type: 'lunge-back', fighter: fighter });
          return;
        }
      }
      if (fighter.status.slow > 0 && Math.random() < 0.15) {
        animQueue.push({ type: 'log', text: fighter.name + "'s attack missed (slowed)!" });
        animQueue.push({ type: 'lunge-back', fighter: fighter });
        return;
      }

      var dmgResult = calcDamage(move, fighter, target);
      var dmg = dmgResult.damage;
      var isCrit = dmgResult.isCrit;
      var typeMult = getTypeMultiplier(move.type, target.type);

      animQueue.push({ type: 'check', callback: function () { target.hp = Math.max(0, target.hp - dmg); } });

      // Shake + VFX
      if (target.isEnemy) {
        animQueue.push({ type: 'shake', targetIdx: 100 + enemies.indexOf(target), ticks: 8 });
      } else {
        animQueue.push({ type: 'shake', targetIdx: team.indexOf(target), ticks: 8 });
      }
      var tpos2 = getFighterPos(target);
      animQueue.push({ type: 'vfx', moveType: move.type, x: tpos2.x, y: tpos2.y });
      animQueue.push({ type: 'lunge-back', fighter: fighter });
      animQueue.push({ type: 'hpLerp', fighter: target });
      animQueue.push({ type: 'floatText', text: '-' + dmg, x: tpos2.x, y: tpos2.y - 20, color: isCrit ? '#ffd54f' : '#f44336' });
      if (isCrit) {
        animQueue.push({ type: 'floatText', text: 'CRIT!', x: tpos2.x, y: tpos2.y - 35, color: '#ffd54f' });
        animQueue.push({ type: 'log', text: 'Critical hit!', cls: 'bt-log-crit' });
      }

      if (typeMult > 1) {
        animQueue.push({ type: 'log', text: 'Super effective!', cls: 'bt-log-effective' });
      } else if (typeMult < 1) {
        animQueue.push({ type: 'log', text: 'Not very effective...', cls: 'bt-log-weak' });
      }

      // Secondary effects
      if (move.effect && move.effectChance && target.hp > 0) {
        if (Math.random() < move.effectChance) {
          switch (move.effect) {
            case 'burn':
              if (target.status.burn <= 0) { target.status.burn = 3; animQueue.push({ type: 'log', text: target.name + ' was burned!', cls: 'bt-log-crit' }); }
              break;
            case 'curse':
              if (target.status.curse <= 0) { target.status.curse = 3; animQueue.push({ type: 'log', text: target.name + ' was cursed!', cls: 'bt-log-crit' }); }
              break;
            case 'stun':
              target.status.stun = true; animQueue.push({ type: 'log', text: target.name + ' was stunned!', cls: 'bt-log-crit' });
              break;
            case 'slow':
              if (target.status.slow <= 0) { target.status.slow = 3; animQueue.push({ type: 'log', text: target.name + ' was slowed!', cls: 'bt-log-crit' }); }
              break;
          }
        }
      }
      if (move.effect === 'leech') {
        var leechAmt = Math.floor(dmg * 0.35);
        animQueue.push({ type: 'check', callback: function () {
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + leechAmt);
        }});
        animQueue.push({ type: 'hpLerp', fighter: fighter });
        var fpos2 = getFighterPos(fighter);
        animQueue.push({ type: 'floatText', text: '+' + leechAmt, x: fpos2.x, y: fpos2.y - 20, color: '#4caf50' });
      }
    }});
  }

  // ── Animation queue processor ─────────────────────
  function processAnimQueue(callback) {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    var speedMult = battleSpeed === 2 ? 0.5 : 1;

    function next() {
      if (animQueue.length === 0) { if (callback) callback(); return; }
      // Skip mode: fast forward
      if (skipWave) speedMult = 0.05;

      var item = animQueue.shift();
      switch (item.type) {
        case 'delay':
          renderBattle();
          animTimer = setTimeout(next, (item.ms || 200) * speedMult);
          break;
        case 'log':
          logMessage(item.text, item.cls);
          renderBattle();
          animTimer = setTimeout(next, 100 * speedMult);
          break;
        case 'shake':
          shakeTargetIdx = item.targetIdx;
          shakeTicks = item.ticks || 8;
          renderBattle();
          animTimer = setTimeout(function () { shakeTargetIdx = -1; shakeTicks = 0; next(); }, 150 * speedMult);
          break;
        case 'flash':
          flashColor = item.color;
          flashTicks = item.ticks || 4;
          renderBattle();
          animTimer = setTimeout(next, 100 * speedMult);
          break;
        case 'hpLerp':
          if (skipWave) {
            if (item.fighter) item.fighter.displayHp = item.fighter.hp;
            renderBattle();
            animTimer = setTimeout(next, 10);
          } else {
            startHPLerp(item.fighter, function () {
              animTimer = setTimeout(next, 100 * speedMult);
            });
          }
          break;
        case 'floatText':
          addFloatingText(item.text, item.x, item.y, item.color);
          renderBattle();
          animTimer = setTimeout(next, 50 * speedMult);
          break;
        case 'vfx':
          triggerVFX(item.moveType, item.x, item.y);
          renderBattle();
          animTimer = setTimeout(next, 80 * speedMult);
          break;
        case 'lunge':
          // Attacker slides toward target over several frames
          if (skipWave) {
            next();
          } else {
            var lf = item.fighter;
            var lungeX = item.dx || 0;
            var lungeY = item.dy || 0;
            var lungeSteps = 6;
            var lungeStep = 0;
            var lungeIv = setInterval(function () {
              lungeStep++;
              var t = lungeStep / lungeSteps;
              // Ease out: fast start, slow end
              var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              lf.offsetX = lungeX * ease;
              lf.offsetY = lungeY * ease;
              renderBattle();
              if (lungeStep >= lungeSteps) {
                clearInterval(lungeIv);
                var lIdx = activeIntervals.indexOf(lungeIv);
                if (lIdx !== -1) activeIntervals.splice(lIdx, 1);
                next();
              }
            }, 25);
            activeIntervals.push(lungeIv);
          }
          break;
        case 'lunge-back':
          // Attacker slides back to origin
          if (skipWave) {
            if (item.fighter) { item.fighter.offsetX = 0; item.fighter.offsetY = 0; }
            next();
          } else {
            var lbf = item.fighter;
            var startOX = lbf.offsetX;
            var startOY = lbf.offsetY;
            var lbSteps = 4;
            var lbStep = 0;
            var lbIv = setInterval(function () {
              lbStep++;
              var t = 1 - (lbStep / lbSteps);
              lbf.offsetX = startOX * t;
              lbf.offsetY = startOY * t;
              renderBattle();
              if (lbStep >= lbSteps) {
                lbf.offsetX = 0;
                lbf.offsetY = 0;
                clearInterval(lbIv);
                var lbIdx = activeIntervals.indexOf(lbIv);
                if (lbIdx !== -1) activeIntervals.splice(lbIdx, 1);
                next();
              }
            }, 25);
            activeIntervals.push(lbIv);
          }
          break;
        case 'check':
          var lenBefore = animQueue.length;
          if (item.callback) item.callback();
          var newCount = animQueue.length - lenBefore;
          if (newCount > 0) {
            var newItems = animQueue.splice(lenBefore, newCount);
            for (var k = newItems.length - 1; k >= 0; k--) animQueue.unshift(newItems[k]);
          }
          renderBattle();
          animTimer = setTimeout(next, 30 * speedMult);
          break;
        case 'faint':
          var f = item.fighter;
          if (f && !skipWave) {
            var faintSteps = 8;
            var faintStep = 0;
            var faintIv = setInterval(function () {
              faintStep++;
              f.opacity = 1 - (faintStep / faintSteps);
              renderBattle();
              if (faintStep >= faintSteps) {
                f.opacity = 0;
                clearInterval(faintIv);
                var fIdx = activeIntervals.indexOf(faintIv);
                if (fIdx !== -1) activeIntervals.splice(fIdx, 1);
                animTimer = setTimeout(next, 150 * speedMult);
              }
            }, 30);
            activeIntervals.push(faintIv);
          } else {
            if (f) f.opacity = 0;
            renderBattle();
            next();
          }
          break;
        default:
          next();
      }
    }
    next();
  }

  // ── Auto-battle turn loop ─────────────────────────
  function runAutoBattle() {
    if (!battleRunning) return;

    // Gather living fighters
    var livingPlayers = team.filter(function (f) { return f.hp > 0; });
    var livingEnemies = enemies.filter(function (f) { return f.hp > 0; });

    // Check end conditions
    if (livingPlayers.length === 0) {
      endDungeon(false);
      return;
    }
    if (livingEnemies.length === 0) {
      // Wave cleared
      wavesCleared = currentWave;
      if (currentWave >= totalWaves) {
        endDungeon(true);
      } else {
        transitionToNextWave();
      }
      return;
    }

    // Build turn order: all living, sorted by SPD desc (with gear), ties shuffled
    var allLiving = livingPlayers.concat(livingEnemies);
    // Fisher-Yates shuffle first for fair random tiebreaking
    for (var sh = allLiving.length - 1; sh > 0; sh--) {
      var rj = Math.floor(Math.random() * (sh + 1));
      var tmp = allLiving[sh]; allLiving[sh] = allLiving[rj]; allLiving[rj] = tmp;
    }
    // Sort by total SPD desc
    allLiving.sort(function (a, b) {
      var spdA = (a.stats ? a.stats.spd : 0) + (a.gearStats ? a.gearStats.spd : 0);
      var spdB = (b.stats ? b.stats.spd : 0) + (b.gearStats ? b.gearStats.spd : 0);
      return spdB - spdA;
    });

    animQueue = [];

    // Execute each turn
    for (var t = 0; t < allLiving.length; t++) {
      (function (fighter) {
        animQueue.push({ type: 'check', callback: function () {
          if (fighter.hp <= 0) return;
          var target = pickTarget(fighter);
          if (!target) return;
          var targetList = fighter.isPlayer ? enemies : team;
          var moveId = pickAIMove(fighter, targetList);
          executeAction(fighter, target, moveId);
        }});
      })(allLiving[t]);
    }

    // Status ticks at end of round
    animQueue.push({ type: 'check', callback: function () {
      var all = team.concat(enemies);
      for (var i = 0; i < all.length; i++) {
        if (all[i].hp > 0) {
          var msgs = tickStatus(all[i]);
          for (var m = 0; m < msgs.length; m++) {
            animQueue.push({ type: 'log', text: msgs[m] });
            animQueue.push({ type: 'hpLerp', fighter: all[i] });
          }
        }
      }
    }});

    // Check for deaths after status ticks
    animQueue.push({ type: 'check', callback: function () {
      var all = team.concat(enemies);
      for (var i = 0; i < all.length; i++) {
        if (all[i].hp <= 0 && all[i].opacity > 0) {
          animQueue.push({ type: 'faint', fighter: all[i] });
        }
      }
    }});

    processAnimQueue(function () {
      // Next round after a short delay
      if (battleRunning) {
        var delay = battleSpeed === 2 ? 300 : 600;
        if (skipWave) delay = 30;
        autoTimer = setTimeout(runAutoBattle, delay);
      }
    });
  }

  // ── Wave transition ───────────────────────────────
  function transitionToNextWave() {
    currentWave++;
    logMessage('--- Wave ' + currentWave + '/' + totalWaves + ' ---', 'bt-log-wave');
    updateWaveHUD();

    // Clear status effects on player creatures between waves
    for (var i = 0; i < team.length; i++) {
      team[i].status = { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 };
    }

    // Generate new enemies
    generateWaveEnemies(currentWave - 1, function () {
      renderBattle();
      var delay = battleSpeed === 2 ? 400 : 800;
      if (skipWave) delay = 30;
      skipWave = false; // reset skip for new wave
      autoTimer = setTimeout(runAutoBattle, delay);
    });
  }

  function generateWaveEnemies(waveIdx, callback) {
    if (!selectedDungeon) { if (callback) callback(); return; }
    var waveData = selectedDungeon.enemies[waveIdx];
    if (!waveData) { if (callback) callback(); return; }

    enemies = [];
    var loaded = 0;
    var needed = waveData.length;
    var callbackFired = false;

    for (var i = 0; i < waveData.length; i++) {
      var eid = waveData[i];
      var fighter = createEnemyFighter(eid, selectedDungeon.stars, selectedDifficulty);
      if (fighter) enemies.push(fighter);

      preloadEnemySprite(eid, function () {
        loaded++;
        if (loaded >= needed && callback && !callbackFired) {
          callbackFired = true;
          callback();
        }
      });
    }
    if (needed === 0 && callback) { callbackFired = true; callback(); }
  }

  // ── Update wave HUD ───────────────────────────────
  function updateWaveHUD() {
    if (waveLabel) waveLabel.textContent = 'Wave ' + currentWave + '/' + totalWaves;
    if (dungeonLabel) dungeonLabel.textContent = selectedDungeon ? selectedDungeon.name : '';
    if (waveBar) waveBar.style.width = (totalWaves > 0 ? (currentWave / totalWaves * 100) : 0) + '%';
  }

  // ── Gear Drop Generation ─────────────────────────
  var nextGearId = 1;

  function initGearIdCounter() {
    // Find max existing gear id
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id >= nextGearId) nextGearId = inventory[i].id + 1;
    }
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightedRarityPick(weights) {
    var total = 0;
    var keys = ['common', 'uncommon', 'rare', 'epic'];
    for (var i = 0; i < keys.length; i++) total += (weights[keys[i]] || 0);
    var roll = Math.random() * total;
    var cum = 0;
    for (var j = 0; j < keys.length; j++) {
      cum += (weights[keys[j]] || 0);
      if (roll < cum) return keys[j];
    }
    return 'common';
  }

  function generateGearDrop(difficulty, dungeonStars, isFirstClear, dungeon) {
    if (!gearData) return [];
    var rates = gearData.dropRates[difficulty];
    if (!rates) return [];

    var numDrops = randInt(rates.minDrops, rates.maxDrops);
    if (isFirstClear && numDrops < 1) numDrops = 1;

    var drops = [];
    var tierPool = gearData.tierDropsByDifficulty[difficulty] || [1];

    for (var d = 0; d < numDrops; d++) {
      var rarity = weightedRarityPick(rates.weights);
      var slotKeys = ['weapon', 'armor', 'accessory'];
      var slotKey = slotKeys[Math.floor(Math.random() * slotKeys.length)];
      var slotDef = gearData.slots[slotKey];
      var tier = tierPool[Math.floor(Math.random() * tierPool.length)];

      var icons = slotDef.spriteIcons[rarity] || slotDef.spriteIcons;
      var iconRoll = Math.floor(Math.random() * icons.length);
      var name = slotDef.names[iconRoll % slotDef.names.length];
      var mainStatRange = gearData.mainStatRanges[slotKey][rarity];
      var mainValue = randInt(mainStatRange[0], mainStatRange[1]);

      var gear = {
        id: nextGearId++,
        name: name,
        slot: slotKey,
        rarity: rarity,
        tier: tier,
        mainStat: slotDef.mainStat,
        mainValue: mainValue,
        spriteRow: slotDef.spriteRow,
        spriteIcon: icons[iconRoll],
        subStats: [],
        upgradeLevel: 0,
        equippedBy: null
      };

      // Secondary stat for armor (HP) and accessory (CRI)
      if (slotKey === 'armor' && gearData.armorHPRanges[rarity]) {
        var hpRange = gearData.armorHPRanges[rarity];
        gear.secondaryStat = 'hp';
        gear.secondaryValue = randInt(hpRange[0], hpRange[1]);
      }
      if (slotKey === 'accessory' && gearData.accessoryCriRanges[rarity]) {
        var criRange = gearData.accessoryCriRanges[rarity];
        gear.secondaryStat = 'cri';
        gear.secondaryValue = randInt(criRange[0], criRange[1]);
      }

      // Sub stats
      var numSubs = gearData.raritySubStats[rarity] || 0;
      var subPool = gearData.subStatPool[slotKey] ? gearData.subStatPool[slotKey].slice() : [];
      for (var s = 0; s < numSubs && subPool.length > 0; s++) {
        var si = Math.floor(Math.random() * subPool.length);
        var stat = subPool.splice(si, 1)[0];
        var range = gearData.subStatRanges[stat];
        gear.subStats.push({ stat: stat, value: randInt(range[0], range[1]) });
      }

      drops.push(gear);
    }

    // Boss legendary drops
    if (dungeon && gearData.bossLoot && gearData.bossDropChance) {
      var lastWave = dungeon.enemies[dungeon.enemies.length - 1];
      if (lastWave) {
        for (var bi = 0; bi < lastWave.length; bi++) {
          var bossId = lastWave[bi];
          var loot = gearData.bossLoot[bossId];
          if (!loot) continue;
          var chances = gearData.bossDropChance[difficulty];
          if (!chances) continue;
          var dropPct = isFirstClear ? chances.firstClear : chances.repeat;
          if (Math.random() * 100 < dropPct) {
            var bossGear = {
              id: nextGearId++,
              name: loot.name,
              slot: loot.slot,
              rarity: 'legendary',
              tier: loot.tier || 3,
              mainStat: loot.mainStat,
              mainValue: loot.mainValue,
              spriteRow: loot.spriteRow,
              spriteIcon: loot.spriteIcon,
              subStats: loot.subStats ? loot.subStats.slice() : [],
              upgradeLevel: 0,
              equippedBy: null
            };
            if (loot.secondaryStat) {
              bossGear.secondaryStat = loot.secondaryStat;
              bossGear.secondaryValue = loot.secondaryValue || 0;
            }
            if (loot.special) bossGear.special = loot.special;
            if (loot.set) bossGear.set = loot.set;
            drops.push(bossGear);
          }
        }
      }
    }

    return drops;
  }

  function preloadGearSheets(callback) {
    if (!gearData || !gearData.spriteSheets) { if (callback) callback(); return; }
    var keys = Object.keys(gearData.spriteSheets);
    var loaded = 0;
    if (keys.length === 0) { if (callback) callback(); return; }
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        if (gearSheetImages[key]) { loaded++; if (loaded >= keys.length && callback) callback(); return; }
        var img = new Image();
        img.onload = function () { gearSheetImages[key] = img; loaded++; if (loaded >= keys.length && callback) callback(); };
        img.onerror = function () { loaded++; if (loaded >= keys.length && callback) callback(); };
        img.src = gearData.spriteSheets[key].sheet;
      })(keys[i]);
    }
  }

  // ── End dungeon ───────────────────────────────────
  function endDungeon(victory) {
    // Guard against double-fire (e.g. retreat during wave transition)
    if (resultsOverlay && !resultsOverlay.classList.contains('bt-hidden')) return;
    battleRunning = false;
    stopEnemyAnimLoop();
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    for (var ai = 0; ai < activeIntervals.length; ai++) {
      clearInterval(activeIntervals[ai]);
    }
    activeIntervals = [];

    stats.raids++;
    var dungeon = selectedDungeon;
    var stars = dungeon ? dungeon.stars : 1;
    var diff = gearData && gearData.difficulty[selectedDifficulty] ? gearData.difficulty[selectedDifficulty] : { rewardMult: 1 };
    var rewardMult = diff.rewardMult || 1;
    var isFirstClear = victory && dungeon && !isDungeonCleared(dungeon.id, selectedDifficulty);

    // XP calculation
    var xpPer = Math.floor(10 * stars * (wavesCleared / totalWaves) * rewardMult);
    var totalXPawarded = 0;
    creatureXPList.innerHTML = '';

    for (var i = 0; i < team.length; i++) {
      var creature = team[i];
      var alive = creature.hp > 0;
      var xp = Math.floor(xpPer * (alive ? 1 : 0.5));
      if (isFirstClear) xp = Math.floor(xp * 3);
      totalXPawarded += xp;

      try {
        var freshRaw = localStorage.getItem(PET_KEY);
        if (freshRaw) {
          var freshState = JSON.parse(freshRaw);
          if (freshState.pets && freshState.pets[creature.id]) {
            freshState.pets[creature.id].mergeXP = (freshState.pets[creature.id].mergeXP || 0) + xp;
            localStorage.setItem(PET_KEY, JSON.stringify(freshState));
          }
        }
      } catch (e) {}

      var item = document.createElement('div');
      item.className = 'bt-creature-xp-item' + (alive ? '' : ' bt-creature-xp-fainted');
      var spriteEl = document.createElement('div');
      spriteEl.className = 'bt-creature-xp-sprite';
      var sid = creature.spriteId;
      var sd = spriteData ? spriteData[sid] : null;
      if (sd && sd.sheet) {
        var isAltKey = creature.spriteKey && creature.spriteKey.indexOf('-alt') === creature.spriteKey.length - 4;
        var resultSheet = (isAltKey && sd.altSheet) ? sd.altSheet : sd.sheet;
        var fw = sd.frameWidth || 48;
        var fh = sd.frameHeight || 48;
        var frames = sd.frames || 3;
        var frameOffset = sd.frameOffset || 0;
        var frameIdx = Math.min(frameOffset + (creature.level || 1) - 1, frames - 1);
        var scale = 32 / fw;
        spriteEl.style.backgroundImage = 'url(' + resultSheet + ')';
        spriteEl.style.backgroundSize = (fw * frames * scale) + 'px ' + (fh * scale) + 'px';
        spriteEl.style.backgroundPosition = '-' + (frameIdx * fw * scale) + 'px 0';
      }
      item.appendChild(spriteEl);
      var nameEl = document.createElement('div');
      nameEl.className = 'bt-creature-xp-name';
      nameEl.textContent = creature.name;
      item.appendChild(nameEl);
      var xpEl = document.createElement('div');
      xpEl.className = 'bt-creature-xp-amount';
      xpEl.textContent = '+' + xp + ' XP' + (alive ? '' : ' (fainted)');
      item.appendChild(xpEl);
      creatureXPList.appendChild(item);
    }

    // Coins with reward multiplier
    var coins = victory ? Math.floor(stars * 15 * wavesCleared * rewardMult) : 0;
    if (isFirstClear) coins *= 3;

    var jb = 0;
    if (isFirstClear) jb = 5 * stars;

    if (coins > 0 && typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(coins);
    if (jb > 0 && typeof JackBucks !== 'undefined' && JackBucks.add) JackBucks.add(jb);

    // Gear drops
    var gearDrops = [];
    var gearDropsAdded = 0;
    var gearDropsEl = document.getElementById('bt-gear-drops');
    var gearDropListEl = document.getElementById('bt-gear-drop-list');
    if (victory && gearData) {
      gearDrops = generateGearDrop(selectedDifficulty, stars, isFirstClear, dungeon);
      if (gearDrops.length > 0) {
        var maxInv = gearData.maxInventory || 50;
        for (var g = 0; g < gearDrops.length; g++) {
          if (inventory.length < maxInv) {
            inventory.push(gearDrops[g]);
            gearDropsAdded++;
          }
        }
        saveInventory();
      }
    }

    // Show gear drops in results
    if (gearDropListEl) gearDropListEl.innerHTML = '';
    if (gearDrops.length > 0 && gearDropsEl && gearDropListEl) {
      gearDropsEl.classList.remove('bt-hidden');
      for (var gd = 0; gd < gearDrops.length; gd++) {
        var dropEl = renderGearDropCard(gearDrops[gd]);
        // Mark drops that were discarded due to full inventory
        if (gd >= gearDropsAdded) {
          var fullTag = document.createElement('div');
          fullTag.style.fontSize = '0.6em';
          fullTag.style.fontWeight = '600';
          fullTag.style.color = '#f44336';
          fullTag.style.marginTop = '2px';
          fullTag.textContent = '(Inventory Full)';
          dropEl.appendChild(fullTag);
          dropEl.style.opacity = '0.5';
        }
        gearDropListEl.appendChild(dropEl);
      }
    } else if (gearDropsEl) {
      gearDropsEl.classList.add('bt-hidden');
    }

    // Update dungeon progress
    if (victory && dungeon) {
      markDungeonCleared(dungeon.id, selectedDifficulty);
      var nextId = dungeon.id + 1;
      if (nextId <= DUNGEONS.length && dungeonProgress.unlocked.indexOf(nextId) === -1) {
        dungeonProgress.unlocked.push(nextId);
      }
      saveDungeonProgress();
    }

    if (victory) stats.clears++;
    stats.totalXP += totalXPawarded;
    stats.totalCoins += coins;
    saveStats();

    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'dungeon',
        outcome: victory ? 'win' : 'lose',
        won: victory,
        bet: 0,
        payout: coins
      });
    }

    if (victory) {
      resultsTitle.textContent = 'Dungeon Cleared!';
      resultsTitle.className = 'bt-overlay-title';
    } else {
      resultsTitle.textContent = 'Dungeon Failed...';
      resultsTitle.className = 'bt-overlay-title bt-defeat-title';
    }
    resultWaves.textContent = wavesCleared + '/' + totalWaves;
    resultXP.textContent = '+' + totalXPawarded;
    resultCoins.textContent = coins > 0 ? '+' + coins : '0';
    resultJB.textContent = jb > 0 ? '+' + jb : '0';

    if (isFirstClear) {
      firstClearEl.classList.remove('bt-hidden');
    } else {
      firstClearEl.classList.add('bt-hidden');
    }

    // Skin unlock check — Brutal first clear rewards alt skin
    var skinReward = null;
    var isBrutalFirstClear = isFirstClear && selectedDifficulty === 'brutal';
    if (isBrutalFirstClear && dungeon) {
      skinReward = getSkinRewardForDungeon(dungeon.id);
    }
    if (skinReward && skinUnlockEl && skinUnlockContent) {
      skinUnlockContent.innerHTML = '';
      var cId = skinReward.creatureId;
      var sid = cId;
      if (catalog && catalog.creatures && catalog.creatures[cId]) {
        sid = catalog.creatures[cId].spriteId || cId;
      }
      var sd = spriteData ? spriteData[sid] : null;

      // Build before/after sprite preview
      if (sd) {
        var fw = sd.frameWidth || 48;
        var fh = sd.frameHeight || 48;
        var frames = sd.frames || 3;
        var frameOffset = sd.frameOffset || 0;
        var previewLevel = 1;
        // If player owns this creature, show at their level
        try {
          var freshPet = JSON.parse(localStorage.getItem(PET_KEY));
          if (freshPet && freshPet.pets && freshPet.pets[cId]) {
            previewLevel = freshPet.pets[cId].level || 1;
          }
        } catch (e) {}
        var frameIdx = Math.min(frameOffset + previewLevel - 1, frames - 1);

        // Default sprite
        var beforeSide = document.createElement('div');
        beforeSide.className = 'bt-skin-unlock-side';
        var beforeSpr = document.createElement('div');
        beforeSpr.className = 'bt-skin-unlock-sprite';
        beforeSpr.style.backgroundImage = 'url(' + sd.sheet + ')';
        beforeSpr.style.backgroundSize = (fw * frames) + 'px ' + fh + 'px';
        beforeSpr.style.backgroundPosition = '-' + (frameIdx * fw) + 'px 0';
        beforeSide.appendChild(beforeSpr);
        var beforeLabel = document.createElement('div');
        beforeLabel.className = 'bt-skin-unlock-label';
        beforeLabel.textContent = 'Default';
        beforeSide.appendChild(beforeLabel);
        skinUnlockContent.appendChild(beforeSide);

        // Arrow
        var arrow = document.createElement('div');
        arrow.className = 'bt-skin-unlock-arrow';
        arrow.textContent = '→';
        skinUnlockContent.appendChild(arrow);

        // Alt sprite
        var afterSide = document.createElement('div');
        afterSide.className = 'bt-skin-unlock-side';
        var afterSpr = document.createElement('div');
        afterSpr.className = 'bt-skin-unlock-sprite';
        var altSheet = sd.altSheet || sd.sheet;
        afterSpr.style.backgroundImage = 'url(' + altSheet + ')';
        afterSpr.style.backgroundSize = (fw * frames) + 'px ' + fh + 'px';
        afterSpr.style.backgroundPosition = '-' + (frameIdx * fw) + 'px 0';
        afterSide.appendChild(afterSpr);
        var afterLabel = document.createElement('div');
        afterLabel.className = 'bt-skin-unlock-label';
        afterLabel.textContent = 'Alt';
        afterSide.appendChild(afterLabel);
        skinUnlockContent.appendChild(afterSide);
      }

      // Reward name + desc
      var nameDesc = document.createElement('div');
      nameDesc.style.textAlign = 'center';
      nameDesc.style.marginTop = '6px';
      var nameEl2 = document.createElement('div');
      nameEl2.className = 'bt-skin-unlock-name';
      nameEl2.textContent = skinReward.name;
      nameDesc.appendChild(nameEl2);
      var descEl = document.createElement('div');
      descEl.className = 'bt-skin-unlock-desc';
      descEl.textContent = skinReward.desc;
      nameDesc.appendChild(descEl);
      skinUnlockContent.appendChild(nameDesc);

      // Auto-set the creature's skin to 'alt' and mark skinUnlocked
      try {
        var freshRaw2 = localStorage.getItem(PET_KEY);
        var freshState2 = freshRaw2 ? JSON.parse(freshRaw2) : { pets: {}, unlockedSkins: {} };
        if (freshState2.pets && freshState2.pets[cId]) {
          freshState2.pets[cId].skin = 'alt';
          freshState2.pets[cId].skinUnlocked = true;
        }
        // Even if player doesn't own the creature yet, mark globally
        if (!freshState2.unlockedSkins) freshState2.unlockedSkins = {};
        freshState2.unlockedSkins[cId] = true;
        localStorage.setItem(PET_KEY, JSON.stringify(freshState2));
      } catch (e) {}

      skinUnlockEl.classList.remove('bt-hidden');
    } else if (skinUnlockEl) {
      skinUnlockEl.classList.add('bt-hidden');
    }

    if (waveBar) waveBar.style.width = (wavesCleared / totalWaves * 100) + '%';

    resultsOverlay.classList.remove('bt-hidden');
    renderStats();
  }

  function renderGearDropCard(gear) {
    var card = document.createElement('div');
    card.className = 'bt-gear-drop-card bt-rarity-' + gear.rarity;
    // Sprite icon
    var iconEl = document.createElement('div');
    iconEl.className = 'bt-gear-icon';
    renderGearIcon(iconEl, gear);
    card.appendChild(iconEl);
    // Name
    var nameEl = document.createElement('div');
    nameEl.className = 'bt-gear-drop-name';
    nameEl.textContent = getGearDisplayName(gear);
    card.appendChild(nameEl);
    // Rarity + slot
    var rarityEl = document.createElement('div');
    rarityEl.className = 'bt-gear-drop-rarity bt-rarity-text-' + gear.rarity;
    rarityEl.textContent = gear.rarity.charAt(0).toUpperCase() + gear.rarity.slice(1) + ' ' + gear.slot;
    card.appendChild(rarityEl);
    // Main stat
    var statEl = document.createElement('div');
    statEl.className = 'bt-gear-drop-stat';
    var statText = '+' + ((gear.mainValue || 0) + (gear.upgradeLevel || 0)) + ' ' + (gear.mainStat || '').toUpperCase();
    if (gear.secondaryStat) {
      statText += '  +' + (gear.secondaryValue || 0) + ' ' + gear.secondaryStat.toUpperCase();
    }
    statEl.textContent = statText;
    card.appendChild(statEl);
    // Sub stats count
    if (gear.subStats && gear.subStats.length > 0) {
      var subsEl = document.createElement('div');
      subsEl.className = 'bt-gear-drop-subs';
      var subsText = '';
      for (var si = 0; si < gear.subStats.length; si++) {
        if (si > 0) subsText += ' ';
        subsText += '+' + gear.subStats[si].value + gear.subStats[si].stat.charAt(0).toUpperCase();
      }
      subsEl.textContent = subsText;
      card.appendChild(subsEl);
    }
    // Special text for legendaries
    if (gear.special) {
      var specEl = document.createElement('div');
      specEl.className = 'bt-gear-drop-special';
      specEl.textContent = gear.special;
      card.appendChild(specEl);
    }
    return card;
  }

  function renderGearIcon(el, gear, displaySize) {
    if (!gearData || !gearData.spriteSheets[gear.rarity]) return;
    var sheet = gearData.spriteSheets[gear.rarity];
    var iconSize = sheet.iconSize || 16;
    var size = displaySize || 32;
    var scale = size / iconSize;
    var sx = gear.spriteIcon * iconSize;
    var sy = gear.spriteRow * iconSize;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundImage = 'url(' + sheet.sheet + ')';
    el.style.backgroundSize = (sheet.cols * iconSize * scale) + 'px ' + (3 * iconSize * scale) + 'px';
    el.style.backgroundPosition = '-' + (sx * scale) + 'px -' + (sy * scale) + 'px';
    el.style.imageRendering = 'pixelated';
  }

  // ── Screen transitions ────────────────────────────
  function showScreen(screen) {
    currentScreen = screen;
    dungeonSelectScreen.classList.add('bt-hidden');
    teamScreen.classList.add('bt-hidden');
    battleScreen.classList.add('bt-hidden');
    resultsOverlay.classList.add('bt-hidden');
    closeInventory();
    closeGearModal();

    switch (screen) {
      case 'dungeon-select':
        dungeonSelectScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.remove('bt-hidden');
        renderDungeonGrid();
        break;
      case 'team-builder':
        teamScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        renderTeamBuilder();
        break;
      case 'battle':
        battleScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        break;
    }
  }

  // ── Dungeon Select screen ─────────────────────────
  function renderDungeonGrid() {
    dungeonGrid.innerHTML = '';
    for (var i = 0; i < DUNGEONS.length; i++) {
      (function (dungeon) {
        var card = document.createElement('div');
        card.className = 'bt-dungeon-card';

        var isUnlocked = dungeonProgress.unlocked.indexOf(dungeon.id) !== -1;
        var isCleared = isDungeonClearedAny(dungeon.id);

        if (!isUnlocked) card.classList.add('bt-dungeon-locked');
        if (isCleared) card.classList.add('bt-dungeon-cleared');

        // Name
        var nameEl = document.createElement('div');
        nameEl.className = 'bt-dungeon-card-name';
        nameEl.textContent = dungeon.name;
        card.appendChild(nameEl);

        // Meta: waves + stars
        var metaEl = document.createElement('div');
        metaEl.className = 'bt-dungeon-card-meta';
        metaEl.innerHTML = '<span>' + dungeon.waves + ' waves</span>';
        var starsEl = document.createElement('span');
        starsEl.className = 'bt-dungeon-card-stars';
        var starsStr = '';
        for (var s = 0; s < dungeon.stars; s++) starsStr += '*';
        starsEl.textContent = starsStr;
        metaEl.appendChild(starsEl);
        card.appendChild(metaEl);

        // Type lock
        if (dungeon.typeLock) {
          var typeEl = document.createElement('div');
          typeEl.className = 'bt-dungeon-card-type bt-type-' + dungeon.typeLock;
          typeEl.textContent = dungeon.typeLock + ' only';
          card.appendChild(typeEl);
        } else {
          var typeEl2 = document.createElement('div');
          typeEl2.className = 'bt-dungeon-card-type';
          typeEl2.style.opacity = '0.5';
          typeEl2.textContent = 'any type';
          card.appendChild(typeEl2);
        }

        // Difficulty badges
        if (isUnlocked) {
          var badgesEl = document.createElement('div');
          badgesEl.className = 'bt-diff-badges';
          var diffs = ['normal', 'hard', 'brutal'];
          for (var di = 0; di < diffs.length; di++) {
            var badge = document.createElement('span');
            badge.className = 'bt-diff-badge bt-diff-' + diffs[di];
            if (isDungeonCleared(dungeon.id, diffs[di])) badge.classList.add('bt-diff-cleared');
            badge.textContent = diffs[di].charAt(0).toUpperCase();
            badge.title = diffs[di] + (isDungeonCleared(dungeon.id, diffs[di]) ? ' (cleared)' : '');
            badgesEl.appendChild(badge);
          }
          card.appendChild(badgesEl);
        }

        // Skin reward hint
        var skinR = getSkinRewardForDungeon(dungeon.id);
        if (skinR && isUnlocked) {
          var skinHint = document.createElement('div');
          var skinEarned = isDungeonCleared(dungeon.id, 'brutal');
          skinHint.className = 'bt-dungeon-skin-hint ' + (skinEarned ? 'bt-skin-earned' : 'bt-skin-locked');
          skinHint.textContent = skinEarned ? '* ' + skinR.name : '~ ' + skinR.name;
          skinHint.title = skinEarned ? 'Alt skin unlocked!' : 'Clear on Brutal to unlock';
          card.appendChild(skinHint);
        }

        // Lock/check icon
        if (!isUnlocked) {
          var lockIcon = document.createElement('div');
          lockIcon.className = 'bt-dungeon-card-lock';
          lockIcon.textContent = 'locked';
          card.appendChild(lockIcon);
        }

        if (isUnlocked) {
          card.addEventListener('click', function () {
            selectedDungeon = dungeon;
            selectedDifficulty = 'normal';
            teamSlots = [null, null, null];
            showScreen('team-builder');
          });
        }

        dungeonGrid.appendChild(card);
      })(DUNGEONS[i]);
    }
  }

  // ── Team Builder screen ───────────────────────────
  function renderTeamBuilder() {
    if (!selectedDungeon) return;
    dungeonNameEl.textContent = selectedDungeon.name + ' (' + selectedDungeon.stars + '*)';
    if (selectedDungeon.typeLock) {
      dungeonTypeLockEl.textContent = selectedDungeon.typeLock.toUpperCase() + ' type only';
      dungeonTypeLockEl.className = 'bt-dungeon-info-lock bt-type-' + selectedDungeon.typeLock;
    } else {
      dungeonTypeLockEl.textContent = 'All types welcome';
      dungeonTypeLockEl.className = 'bt-dungeon-info-lock';
    }

    renderDifficultyPicker();
    renderTeamSlots();
    renderCreaturePicker();
    updateEnterButton();
  }

  function renderDifficultyPicker() {
    var container = document.getElementById('bt-difficulty-picker');
    if (!container) return;
    container.innerHTML = '';
    var diffs = ['normal', 'hard', 'brutal'];
    var labels = { normal: 'Normal', hard: 'Hard', brutal: 'Brutal' };
    var dungeonId = selectedDungeon ? selectedDungeon.id : 0;
    for (var i = 0; i < diffs.length; i++) {
      (function (diff) {
        var btn = document.createElement('button');
        btn.className = 'bt-diff-btn bt-diff-' + diff;
        if (diff === selectedDifficulty) btn.classList.add('bt-diff-active');
        var unlocked = isDifficultyUnlocked(dungeonId, diff);
        if (!unlocked) btn.classList.add('bt-diff-locked');
        btn.disabled = !unlocked;
        btn.textContent = labels[diff];
        if (isDungeonCleared(dungeonId, diff)) {
          var check = document.createElement('span');
          check.className = 'bt-diff-check';
          check.textContent = ' *';
          btn.appendChild(check);
        }
        btn.addEventListener('click', function () {
          if (!unlocked) return;
          selectedDifficulty = diff;
          renderDifficultyPicker();
        });
        container.appendChild(btn);
      })(diffs[i]);
    }
  }

  function renderTeamSlots() {
    var slots = document.querySelectorAll('.bt-team-slot');
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var petId = teamSlots[i];
      var spriteEl = slot.querySelector('.bt-team-slot-sprite');
      var labelEl = slot.querySelector('.bt-team-slot-label');
      // Remove old gear slots if any
      var oldGear = slot.querySelector('.bt-team-gear-slots');
      if (oldGear) oldGear.remove();

      if (petId && catalog && catalog.creatures[petId]) {
        var c = catalog.creatures[petId];
        slot.classList.add('bt-team-slot-filled');
        labelEl.textContent = c.name;

        var sid = c.spriteId || petId;
        var sd = spriteData ? spriteData[sid] : null;
        if (sd && sd.sheet) {
          var level = petState && petState.pets && petState.pets[petId] ? petState.pets[petId].level || 1 : 1;
          var petSkin = petState && petState.pets && petState.pets[petId] ? petState.pets[petId].skin : 'default';
          var sheetUrl = (petSkin === 'alt' && sd.altSheet) ? sd.altSheet : sd.sheet;
          var fw = sd.frameWidth || 48;
          var fh = sd.frameHeight || 48;
          var frames = sd.frames || 3;
          var frameOffset = sd.frameOffset || 0;
          var frameIdx = Math.min(frameOffset + level - 1, frames - 1);
          var scale = 48 / fw;
          spriteEl.style.backgroundImage = 'url(' + sheetUrl + ')';
          spriteEl.style.backgroundSize = (fw * frames * scale) + 'px ' + (fh * scale) + 'px';
          spriteEl.style.backgroundPosition = '-' + (frameIdx * fw * scale) + 'px 0';
          spriteEl.style.imageRendering = 'pixelated';
        } else {
          spriteEl.style.backgroundImage = '';
        }

        // Gear slots
        var gearRow = document.createElement('div');
        gearRow.className = 'bt-team-gear-slots';
        var gearSlotKeys = ['weapon', 'armor', 'accessory'];
        var gearLabels = { weapon: 'W', armor: 'A', accessory: 'C' };
        for (var g = 0; g < gearSlotKeys.length; g++) {
          (function (slotKey, creatureId) {
            var gSlot = document.createElement('div');
            gSlot.className = 'bt-team-gear-icon';
            gSlot.title = slotKey;
            var eq = equipMap[creatureId];
            var gearId = eq ? eq[slotKey] : null;
            var gear = null;
            if (gearId != null) {
              for (var gi = 0; gi < inventory.length; gi++) {
                if (inventory[gi].id === gearId) { gear = inventory[gi]; break; }
              }
            }
            if (gear) {
              renderGearIcon(gSlot, gear, 20);
              gSlot.classList.add('bt-rarity-' + gear.rarity);
            } else {
              gSlot.textContent = gearLabels[slotKey];
              gSlot.classList.add('bt-gear-empty');
            }
            gSlot.addEventListener('click', function (ev) {
              ev.stopPropagation();
              equipPickerCreature = creatureId;
              equipPickerSlot = slotKey;
              inventoryFilterSlot = slotKey;
              openInventory(true);
            });
            gearRow.appendChild(gSlot);
          })(gearSlotKeys[g], petId);
        }
        // Skin toggle button (if alt unlocked)
        if (isSkinUnlocked(petId)) {
          var skinBtn = document.createElement('button');
          skinBtn.className = 'bt-skin-toggle';
          skinBtn.title = 'Toggle alt skin';
          var currentSkin = (petState && petState.pets && petState.pets[petId]) ? petState.pets[petId].skin : 'default';
          skinBtn.textContent = 'S';
          if (currentSkin === 'alt') skinBtn.classList.add('bt-skin-active');
          skinBtn.addEventListener('click', (function (pid) {
            return function (ev) {
              ev.stopPropagation();
              loadPetState();
              if (petState && petState.pets && petState.pets[pid]) {
                petState.pets[pid].skin = petState.pets[pid].skin === 'alt' ? 'default' : 'alt';
                savePetState();
                if (window.PetSystem && window.PetSystem.reload) window.PetSystem.reload();
              }
              renderTeamSlots();
              renderCreaturePicker();
            };
          })(petId));
          gearRow.appendChild(skinBtn);
        }
        slot.appendChild(gearRow);
      } else {
        slot.classList.remove('bt-team-slot-filled');
        labelEl.textContent = 'Slot ' + (i + 1);
        spriteEl.style.backgroundImage = '';
      }
    }
  }

  function renderCreaturePicker() {
    creaturePicker.innerHTML = '';
    loadPetState();

    if (!petState || !petState.pets || Object.keys(petState.pets).length === 0) {
      noPetsMsg.classList.remove('bt-hidden');
      creaturePicker.classList.add('bt-hidden');
      return;
    }

    noPetsMsg.classList.add('bt-hidden');
    creaturePicker.classList.remove('bt-hidden');

    var petIds = Object.keys(petState.pets);
    for (var i = 0; i < petIds.length; i++) {
      (function (petId) {
        var pet = petState.pets[petId];
        var creature = catalog ? catalog.creatures[petId] : null;
        if (!creature) return;

        var card = document.createElement('div');
        card.className = 'bt-creature-card';

        // Check type restriction
        var typeLock = selectedDungeon ? selectedDungeon.typeLock : null;
        var isDisabled = typeLock && creature.type !== typeLock;
        var isSelected = teamSlots.indexOf(petId) !== -1;

        if (isDisabled) card.classList.add('bt-creature-disabled');
        if (isSelected) card.classList.add('bt-creature-selected');

        // Sprite
        var spriteEl = document.createElement('div');
        spriteEl.className = 'bt-creature-card-sprite';
        var sid = creature.spriteId || petId;
        var sd = spriteData ? spriteData[sid] : null;
        if (sd && sd.sheet) {
          var petSkin2 = pet.skin || 'default';
          var sheetUrl2 = (petSkin2 === 'alt' && sd.altSheet) ? sd.altSheet : sd.sheet;
          var fw = sd.frameWidth || 48;
          var fh = sd.frameHeight || 48;
          var frames = sd.frames || 3;
          var frameOffset = sd.frameOffset || 0;
          var frameIdx = Math.min(frameOffset + (pet.level || 1) - 1, frames - 1);
          var scale = 48 / fw;
          spriteEl.style.backgroundImage = 'url(' + sheetUrl2 + ')';
          spriteEl.style.backgroundSize = (fw * frames * scale) + 'px ' + (fh * scale) + 'px';
          spriteEl.style.backgroundPosition = '-' + (frameIdx * fw * scale) + 'px 0';
          spriteEl.style.imageRendering = 'pixelated';
        }
        card.appendChild(spriteEl);

        var nameEl = document.createElement('div');
        nameEl.className = 'bt-creature-card-name';
        nameEl.textContent = creature.name;
        card.appendChild(nameEl);

        var infoEl = document.createElement('div');
        infoEl.className = 'bt-creature-card-info';
        infoEl.textContent = 'Lv.' + (pet.level || 1);
        card.appendChild(infoEl);

        var typeEl = document.createElement('div');
        typeEl.className = 'bt-creature-card-type bt-type-' + creature.type;
        typeEl.textContent = creature.type;
        card.appendChild(typeEl);

        // Mini stats
        var cStats = calcCreatureStats(creature.tier || 'common', creature.type || 'fire', pet.level || 1);
        var statsEl = document.createElement('div');
        statsEl.className = 'bt-creature-card-stats';
        statsEl.innerHTML = '<span>A:' + cStats.atk + '</span> <span>D:' + cStats.def + '</span> <span>S:' + cStats.spd + '</span>';
        card.appendChild(statsEl);

        if (!isDisabled) {
          card.addEventListener('click', function () {
            if (isSelected) {
              // Remove from team
              var idx = teamSlots.indexOf(petId);
              if (idx !== -1) teamSlots[idx] = null;
            } else {
              // Add to first empty slot
              var emptyIdx = teamSlots.indexOf(null);
              if (emptyIdx !== -1) {
                teamSlots[emptyIdx] = petId;
              }
            }
            renderTeamSlots();
            renderCreaturePicker();
            updateEnterButton();
          });
        }

        creaturePicker.appendChild(card);
      })(petIds[i]);
    }
  }

  function updateEnterButton() {
    var filledCount = teamSlots.filter(function (s) { return s !== null; }).length;
    enterDungeonBtn.disabled = filledCount === 0;
  }

  // Team slot click to remove
  var teamSlotEls = document.querySelectorAll('.bt-team-slot');
  for (var si = 0; si < teamSlotEls.length; si++) {
    (function (idx) {
      teamSlotEls[idx].addEventListener('click', function () {
        if (teamSlots[idx] !== null) {
          teamSlots[idx] = null;
          renderTeamSlots();
          renderCreaturePicker();
          updateEnterButton();
        }
      });
    })(si);
  }

  // ── Start dungeon ─────────────────────────────────
  function startDungeon() {
    if (!selectedDungeon) return;

    // Build team fighters
    team = [];
    loadPetState();
    for (var i = 0; i < teamSlots.length; i++) {
      if (teamSlots[i]) {
        var level = petState && petState.pets && petState.pets[teamSlots[i]] ? petState.pets[teamSlots[i]].level || 1 : 1;
        var fighter = createPlayerFighter(teamSlots[i], level);
        if (fighter) team.push(fighter);
      }
    }
    if (team.length === 0) return;

    currentWave = 1;
    totalWaves = selectedDungeon.waves;
    wavesCleared = 0;
    battleRunning = true;
    battleSpeed = 1;
    skipWave = false;
    floatingTexts = [];
    activeVFX = [];
    animQueue = [];

    // Preload all team sprites (using spriteKey for alt skin support)
    var spritesToLoad = [];
    for (var t = 0; t < team.length; t++) {
      spritesToLoad.push(team[t].spriteKey || team[t].spriteId);
    }

    var spriteLoaded = 0;
    function onSpriteLoaded() {
      spriteLoaded++;
      if (spriteLoaded >= spritesToLoad.length) {
        afterSpritesLoaded();
      }
    }

    for (var s = 0; s < spritesToLoad.length; s++) {
      preloadSprite(spritesToLoad[s], onSpriteLoaded);
    }
    if (spritesToLoad.length === 0) afterSpritesLoaded();

    function afterSpritesLoaded() {
      preloadVFX(function () {
        showScreen('battle');
        sizeCanvas();
        clearLog();
        updateWaveHUD();
        updateSpeedBtn();

        logMessage('--- Entering ' + selectedDungeon.name + ' ---', 'bt-log-wave');
        logMessage('--- Wave 1/' + totalWaves + ' ---', 'bt-log-wave');

        generateWaveEnemies(0, function () {
          startEnemyAnimLoop();
          renderBattle();
          autoTimer = setTimeout(runAutoBattle, 1000);
        });
      });
    }
  }

  // ── Inventory Panel ──────────────────────────────
  function openInventory(asEquipPicker) {
    inventoryOpen = true;
    var panel = document.getElementById('bt-inventory-panel');
    if (panel) {
      panel.classList.remove('bt-hidden');
      renderInventoryPanel(asEquipPicker);
    }
  }

  function closeInventory() {
    inventoryOpen = false;
    equipPickerSlot = null;
    equipPickerCreature = null;
    var panel = document.getElementById('bt-inventory-panel');
    if (panel) panel.classList.add('bt-hidden');
  }

  function renderInventoryPanel(asEquipPicker) {
    var grid = document.getElementById('bt-inventory-grid');
    var countEl = document.getElementById('bt-inventory-count');
    var titleEl = document.getElementById('bt-inventory-title');
    if (!grid) return;
    grid.innerHTML = '';

    var maxInv = gearData ? gearData.maxInventory || 50 : 50;
    if (countEl) countEl.textContent = inventory.length + '/' + maxInv;
    if (titleEl) {
      titleEl.textContent = asEquipPicker ? 'Equip ' + (equipPickerSlot || '') : 'Inventory';
    }

    // Filter buttons
    renderInventoryFilters();

    var filtered = inventory.filter(function (g) {
      if (inventoryFilterSlot === 'all') return true;
      return g.slot === inventoryFilterSlot;
    });

    if (filtered.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'bt-inventory-empty';
      emptyEl.textContent = 'No gear yet. Clear dungeons to find loot!';
      grid.appendChild(emptyEl);
      return;
    }

    // Sort: legendary > epic > rare > uncommon > common
    var rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    filtered.sort(function (a, b) { return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4); });

    // Look up currently equipped gear for comparison
    var currentEquipped = null;
    if (asEquipPicker && equipPickerCreature && equipPickerSlot) {
      var eqMap = equipMap[equipPickerCreature];
      var curId = eqMap ? eqMap[equipPickerSlot] : null;
      if (curId != null) currentEquipped = findGearById(curId);
    }

    for (var i = 0; i < filtered.length; i++) {
      (function (gear) {
        var card = document.createElement('div');
        card.className = 'bt-gear-card bt-rarity-' + gear.rarity;

        // Equipped indicator
        if (gear.equippedBy) card.classList.add('bt-gear-equipped');

        // Mark currently equipped item in equip picker
        var isCurrentEquipped = asEquipPicker && currentEquipped && gear.id === currentEquipped.id;
        if (isCurrentEquipped) card.classList.add('bt-gear-current');

        var iconEl = document.createElement('div');
        iconEl.className = 'bt-gear-icon';
        renderGearIcon(iconEl, gear);
        card.appendChild(iconEl);

        var nameEl = document.createElement('div');
        nameEl.className = 'bt-gear-card-name';
        nameEl.textContent = getGearDisplayName(gear);
        card.appendChild(nameEl);

        var statEl = document.createElement('div');
        statEl.className = 'bt-gear-card-stat';
        statEl.textContent = '+' + ((gear.mainValue || 0) + (gear.upgradeLevel || 0)) + ' ' + (gear.mainStat || '').toUpperCase();
        card.appendChild(statEl);

        // Stat diff when in equip picker mode
        if (asEquipPicker && !isCurrentEquipped) {
          var diff = calcGearDiff(gear, currentEquipped);
          if (diff) {
            var diffEl = document.createElement('div');
            diffEl.className = 'bt-gear-diff';
            var abbr = { atk: 'A', def: 'D', hp: 'H', spd: 'S', cri: 'C' };
            var keys = ['atk', 'def', 'hp', 'spd', 'cri'];
            for (var di = 0; di < keys.length; di++) {
              if (diff[keys[di]]) {
                var span = document.createElement('span');
                span.className = diff[keys[di]] > 0 ? 'bt-diff-up' : 'bt-diff-down';
                span.textContent = (diff[keys[di]] > 0 ? '+' : '') + diff[keys[di]] + abbr[keys[di]];
                diffEl.appendChild(span);
              }
            }
            card.appendChild(diffEl);
          }
        }

        if (gear.equippedBy) {
          var eqTag = document.createElement('div');
          eqTag.className = 'bt-gear-eq-tag';
          eqTag.textContent = 'E';
          card.appendChild(eqTag);
        }

        card.addEventListener('click', function () {
          if (asEquipPicker && equipPickerCreature && equipPickerSlot) {
            tryEquipGear(gear, equipPickerCreature, equipPickerSlot);
          } else {
            openGearModal(gear);
          }
        });

        grid.appendChild(card);
      })(filtered[i]);
    }
  }

  function renderInventoryFilters() {
    var bar = document.getElementById('bt-inventory-filters');
    if (!bar) return;
    bar.innerHTML = '';
    var filters = [
      { key: 'all', label: 'All' },
      { key: 'weapon', label: 'Weapons' },
      { key: 'armor', label: 'Armor' },
      { key: 'accessory', label: 'Acc.' }
    ];
    for (var i = 0; i < filters.length; i++) {
      (function (f) {
        var btn = document.createElement('button');
        btn.className = 'bt-inv-filter-btn';
        if (inventoryFilterSlot === f.key) btn.classList.add('bt-inv-filter-active');
        btn.textContent = f.label;
        btn.addEventListener('click', function () {
          inventoryFilterSlot = f.key;
          renderInventoryPanel(!!equipPickerSlot);
        });
        bar.appendChild(btn);
      })(filters[i]);
    }
  }

  // ── Gear Detail Modal ──────────────────────────
  function openGearModal(gear) {
    gearModalItem = gear;
    var modal = document.getElementById('bt-gear-modal');
    if (!modal) return;
    modal.classList.remove('bt-hidden');

    var iconEl = document.getElementById('bt-gm-icon');
    if (iconEl) { iconEl.innerHTML = ''; renderGearIcon(iconEl, gear, 48); }

    var nameEl = document.getElementById('bt-gm-name');
    if (nameEl) {
      nameEl.textContent = getGearDisplayName(gear);
      nameEl.className = 'bt-gm-name bt-rarity-text-' + gear.rarity;
    }

    var rarityEl = document.getElementById('bt-gm-rarity');
    if (rarityEl) {
      rarityEl.textContent = gear.rarity.charAt(0).toUpperCase() + gear.rarity.slice(1) + ' ' + gear.slot;
      rarityEl.className = 'bt-gm-rarity bt-rarity-text-' + gear.rarity;
    }

    var tierEl = document.getElementById('bt-gm-tier');
    if (tierEl) tierEl.textContent = 'Tier ' + gear.tier + (gear.tier > 1 ? ' (Lv.' + (gearData ? gearData.gearTierLevelReq[gear.tier] : gear.tier) + '+)' : '');

    var mainEl = document.getElementById('bt-gm-main');
    if (mainEl) {
      var effectiveMain = (gear.mainValue || 0) + (gear.upgradeLevel || 0);
      var mainText = '+' + effectiveMain + ' ' + (gear.mainStat || '').toUpperCase();
      if (gear.secondaryStat) {
        var secBonus = 0;
        if (gearData && gearData.upgrade && gear.upgradeLevel) {
          var secPerLvl = gearData.upgrade.secondaryStatPerLevel || {};
          secBonus = (secPerLvl[gear.secondaryStat] || 0) * gear.upgradeLevel;
        }
        mainText += '  +' + ((gear.secondaryValue || 0) + secBonus) + ' ' + gear.secondaryStat.toUpperCase();
      }
      mainEl.textContent = mainText;
    }

    var subsEl = document.getElementById('bt-gm-subs');
    if (subsEl) {
      subsEl.innerHTML = '';
      if (gear.subStats && gear.subStats.length > 0) {
        for (var s = 0; s < gear.subStats.length; s++) {
          var subLine = document.createElement('div');
          subLine.textContent = '+' + gear.subStats[s].value + ' ' + gear.subStats[s].stat.toUpperCase();
          subsEl.appendChild(subLine);
        }
      } else {
        subsEl.textContent = 'No sub-stats';
        subsEl.style.opacity = '0.5';
      }
    }

    // Special text (legendary)
    var specialEl = document.getElementById('bt-gm-special');
    if (specialEl) {
      if (gear.special) {
        specialEl.textContent = gear.special;
        specialEl.classList.remove('bt-hidden');
      } else {
        specialEl.classList.add('bt-hidden');
      }
    }

    // Set bonus display
    var setEl = document.getElementById('bt-gm-set');
    if (setEl) {
      setEl.classList.add('bt-hidden');
      if (gearData && gearData.sets && gear.rarity === 'legendary') {
        var setNames = Object.keys(gearData.sets);
        for (var si = 0; si < setNames.length; si++) {
          var setDef = gearData.sets[setNames[si]];
          if (setDef.pieces.indexOf(gear.name) !== -1) {
            setEl.innerHTML = '';
            setEl.classList.remove('bt-hidden');
            var setNameEl = document.createElement('div');
            setNameEl.className = 'bt-gm-set-name';
            setNameEl.textContent = setNames[si];
            setEl.appendChild(setNameEl);
            // Count how many set pieces this creature has equipped
            var equippedCount = 0;
            if (gear.equippedBy) {
              var eq = equipMap[gear.equippedBy];
              if (eq) {
                var slotArr = ['weapon', 'armor', 'accessory'];
                for (var sk = 0; sk < slotArr.length; sk++) {
                  var eqGear = eq[slotArr[sk]] != null ? findGearById(eq[slotArr[sk]]) : null;
                  if (eqGear && setDef.pieces.indexOf(eqGear.name) !== -1) equippedCount++;
                }
              }
            }
            var bonusKeys = ['2', '3'];
            for (var bk = 0; bk < bonusKeys.length; bk++) {
              var bonus = setDef.bonuses[bonusKeys[bk]];
              if (!bonus) continue;
              var bonusLine = document.createElement('div');
              bonusLine.className = 'bt-gm-set-bonus';
              if (equippedCount >= parseInt(bonusKeys[bk])) bonusLine.classList.add('bt-set-active');
              var bonusText = '(' + bonusKeys[bk] + 'pc) ';
              var bStats = Object.keys(bonus);
              for (var bs = 0; bs < bStats.length; bs++) {
                if (bs > 0) bonusText += ' ';
                bonusText += '+' + bonus[bStats[bs]] + ' ' + bStats[bs].toUpperCase();
              }
              bonusLine.textContent = bonusText;
              setEl.appendChild(bonusLine);
            }
            // List pieces
            for (var pi = 0; pi < setDef.pieces.length; pi++) {
              var pieceEl = document.createElement('div');
              pieceEl.className = 'bt-gm-set-bonus';
              pieceEl.textContent = '  - ' + setDef.pieces[pi];
              setEl.appendChild(pieceEl);
            }
            break;
          }
        }
      }
    }

    // Upgrade button
    var upgradeBtn = document.getElementById('bt-gm-upgrade');
    if (upgradeBtn) {
      var maxLvl = gearData && gearData.upgrade ? gearData.upgrade.maxLevel : 5;
      var curLvl = gear.upgradeLevel || 0;
      if (curLvl >= maxLvl) {
        upgradeBtn.textContent = 'MAX +' + maxLvl;
        upgradeBtn.disabled = true;
        upgradeBtn.classList.remove('bt-hidden');
      } else {
        var baseCost = gearData && gearData.upgrade ? gearData.upgrade.baseCost[gear.rarity] || 10 : 10;
        var costMult = gearData && gearData.upgrade ? gearData.upgrade.costMultPerLevel || 1.5 : 1.5;
        var cost = Math.floor(baseCost * Math.pow(costMult, curLvl));
        upgradeBtn.textContent = 'Upgrade (' + cost + ' coins)';
        upgradeBtn.disabled = false;
        upgradeBtn.classList.remove('bt-hidden');
      }
    }

    var sellBtn = document.getElementById('bt-gm-sell');
    if (sellBtn) {
      var price = gearData ? gearData.sellPrices[gear.rarity] || 5 : 5;
      sellBtn.textContent = 'Sell (' + price + ' coins)';
      sellBtn.disabled = !!gear.equippedBy;
    }

    var equipBtn = document.getElementById('bt-gm-equip');
    if (equipBtn) {
      equipBtn.textContent = gear.equippedBy ? 'Unequip' : 'Equip...';
    }
  }

  function closeGearModal() {
    gearModalItem = null;
    var modal = document.getElementById('bt-gear-modal');
    if (modal) modal.classList.add('bt-hidden');
  }

  function sellGear(gear) {
    if (!gear || gear.equippedBy) return;
    var price = gearData ? gearData.sellPrices[gear.rarity] || 5 : 5;
    // Remove from inventory
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === gear.id) {
        inventory.splice(i, 1);
        break;
      }
    }
    saveInventory();
    if (typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(price);
    closeGearModal();
    if (inventoryOpen) renderInventoryPanel(!!equipPickerSlot);
  }

  // ── Equip / Unequip ────────────────────────────
  function tryEquipGear(gear, creatureId, slotKey) {
    if (!gear || !creatureId || !slotKey) return;
    if (gear.slot !== slotKey) return;

    // Check level requirement
    var pet = petState && petState.pets ? petState.pets[creatureId] : null;
    var creature = catalog ? catalog.creatures[creatureId] : null;
    if (!pet || !creature) return;
    var effLevel = getEffectiveLevel(creature.tier || 'common', pet.level || 1);
    var reqLevel = gearData ? gearData.gearTierLevelReq[gear.tier] || 1 : 1;
    if (effLevel < reqLevel) {
      alert('This creature needs level ' + reqLevel + '+ to equip Tier ' + gear.tier + ' gear.');
      return;
    }

    // Unequip from previous owner if any
    if (gear.equippedBy) {
      unequipGear(gear);
    }

    // Unequip current item in this slot
    var eq = equipMap[creatureId];
    if (!eq) { eq = {}; equipMap[creatureId] = eq; }
    if (eq[slotKey] != null) {
      var oldGear = findGearById(eq[slotKey]);
      if (oldGear) oldGear.equippedBy = null;
    }

    // Equip
    eq[slotKey] = gear.id;
    gear.equippedBy = creatureId;
    saveEquipMap();
    saveInventory();

    closeInventory();
    renderTeamSlots();
  }

  function unequipGear(gear) {
    if (!gear || !gear.equippedBy) return;
    var eq = equipMap[gear.equippedBy];
    if (eq) {
      var slots = ['weapon', 'armor', 'accessory'];
      for (var i = 0; i < slots.length; i++) {
        if (eq[slots[i]] === gear.id) {
          eq[slots[i]] = null;
          break;
        }
      }
    }
    gear.equippedBy = null;
    saveEquipMap();
    saveInventory();
  }

  function findGearById(gearId) {
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === gearId) return inventory[i];
    }
    return null;
  }

  function getGearDisplayName(gear) {
    if (!gear) return '';
    var name = gear.name;
    if (gear.upgradeLevel && gear.upgradeLevel > 0) name += ' +' + gear.upgradeLevel;
    return name;
  }

  function upgradeGear(gear) {
    if (!gear || !gearData || !gearData.upgrade) return;
    var cfg = gearData.upgrade;
    var curLvl = gear.upgradeLevel || 0;
    if (curLvl >= cfg.maxLevel) return;

    var baseCost = cfg.baseCost[gear.rarity] || 10;
    var costMult = cfg.costMultPerLevel || 1.5;
    var cost = Math.floor(baseCost * Math.pow(costMult, curLvl));

    // Check wallet
    if (typeof Wallet === 'undefined' || !Wallet.getBalance || Wallet.getBalance() < cost) {
      alert('Not enough coins! Need ' + cost + '.');
      return;
    }

    Wallet.add(-cost);
    gear.upgradeLevel = curLvl + 1;
    saveInventory();

    // Refresh modal
    openGearModal(gear);
    // Refresh inventory panel if open
    if (inventoryOpen) renderInventoryPanel(!!equipPickerSlot);
    // Refresh team slots
    renderTeamSlots();
  }

  // ── Auto Gear ────────────────────────────────────
  function autoGear() {
    if (!inventory.length) return;
    var slots = ['weapon', 'armor', 'accessory'];

    // Step 1: Unequip all gear from team creatures so everything is in the pool
    for (var t = 0; t < teamSlots.length; t++) {
      var cid = teamSlots[t];
      if (!cid) continue;
      var eq = equipMap[cid];
      if (!eq) continue;
      for (var s = 0; s < slots.length; s++) {
        var gid = eq[slots[s]];
        if (gid != null) {
          var g = findGearById(gid);
          if (g) g.equippedBy = null;
          eq[slots[s]] = null;
        }
      }
    }

    // Step 2: Greedily assign best gear per slot per creature
    var assigned = {};

    for (var ti = 0; ti < teamSlots.length; ti++) {
      var creatureId = teamSlots[ti];
      if (!creatureId) continue;

      var pet = petState && petState.pets ? petState.pets[creatureId] : null;
      var creature = catalog ? catalog.creatures[creatureId] : null;
      if (!pet || !creature) continue;

      var effLevel = getEffectiveLevel(creature.tier || 'common', pet.level || 1);
      if (!equipMap[creatureId]) equipMap[creatureId] = {};
      var eq = equipMap[creatureId];

      for (var si = 0; si < slots.length; si++) {
        var slotKey = slots[si];
        var bestGear = null;
        var bestVal = -1;

        for (var gi = 0; gi < inventory.length; gi++) {
          var g = inventory[gi];
          if (g.slot !== slotKey) continue;
          // Skip if already assigned in this pass
          if (assigned[g.id]) continue;
          // Check level requirement
          var reqLevel = gearData ? gearData.gearTierLevelReq[g.tier] || 1 : 1;
          if (effLevel < reqLevel) continue;
          var val = (g.mainValue || 0) + (g.upgradeLevel || 0);
          if (val > bestVal) {
            bestVal = val;
            bestGear = g;
          }
        }

        if (bestGear) {
          // Unequip from previous owner if any
          if (bestGear.equippedBy) {
            var prevEq = equipMap[bestGear.equippedBy];
            if (prevEq) {
              for (var ps = 0; ps < slots.length; ps++) {
                if (prevEq[slots[ps]] === bestGear.id) {
                  prevEq[slots[ps]] = null;
                  break;
                }
              }
            }
          }
          eq[slotKey] = bestGear.id;
          bestGear.equippedBy = creatureId;
          assigned[bestGear.id] = true;
        }
      }
    }

    saveEquipMap();
    saveInventory();
    renderTeamSlots();
  }

  // ── Speed control ─────────────────────────────────
  function updateSpeedBtn() {
    if (speedBtn) {
      speedBtn.textContent = 'x' + battleSpeed;
      if (battleSpeed === 2) {
        speedBtn.classList.add('bt-speed-active');
      } else {
        speedBtn.classList.remove('bt-speed-active');
      }
    }
  }

  // ── Event listeners ───────────────────────────────
  if (enterDungeonBtn) {
    enterDungeonBtn.addEventListener('click', startDungeon);
  }

  var autoGearBtn = document.getElementById('bt-auto-gear');
  if (autoGearBtn) autoGearBtn.addEventListener('click', autoGear);

  if (backToDungeonsBtn) {
    backToDungeonsBtn.addEventListener('click', function () {
      showScreen('dungeon-select');
    });
  }

  if (speedBtn) {
    speedBtn.addEventListener('click', function () {
      battleSpeed = battleSpeed === 1 ? 2 : 1;
      updateSpeedBtn();
    });
  }

  if (skipWaveBtn) {
    skipWaveBtn.addEventListener('click', function () {
      skipWave = true;
    });
  }

  if (retreatBtn) {
    retreatBtn.addEventListener('click', function () {
      if (!battleRunning) return;
      // Retreat = fail with waves cleared so far
      wavesCleared = currentWave - 1;
      endDungeon(false);
    });
  }

  if (resultsContinueBtn) {
    resultsContinueBtn.addEventListener('click', function () {
      resultsOverlay.classList.add('bt-hidden');
      showScreen('dungeon-select');
    });
  }

  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', function () {
      if (!confirm('Reset all dungeon stats?')) return;
      stats = { raids: 0, clears: 0, totalXP: 0, totalCoins: 0 };
      saveStats();
      renderStats();
    });
  }

  // Inventory button
  var inventoryBtn = document.getElementById('bt-inventory-btn');
  if (inventoryBtn) {
    inventoryBtn.addEventListener('click', function () {
      if (inventoryOpen) {
        closeInventory();
      } else {
        inventoryFilterSlot = 'all';
        equipPickerSlot = null;
        equipPickerCreature = null;
        openInventory(false);
      }
    });
  }

  // Inventory close button
  var invCloseBtn = document.getElementById('bt-inventory-close');
  if (invCloseBtn) {
    invCloseBtn.addEventListener('click', closeInventory);
  }

  // Gear modal close
  var gmCloseBtn = document.getElementById('bt-gm-close');
  if (gmCloseBtn) {
    gmCloseBtn.addEventListener('click', closeGearModal);
  }

  // Gear modal upgrade
  var gmUpgradeBtn = document.getElementById('bt-gm-upgrade');
  if (gmUpgradeBtn) {
    gmUpgradeBtn.addEventListener('click', function () {
      if (gearModalItem) upgradeGear(gearModalItem);
    });
  }

  // Gear modal sell
  var gmSellBtn = document.getElementById('bt-gm-sell');
  if (gmSellBtn) {
    gmSellBtn.addEventListener('click', function () {
      if (gearModalItem) sellGear(gearModalItem);
    });
  }

  // Gear modal equip/unequip
  var gmEquipBtn = document.getElementById('bt-gm-equip');
  if (gmEquipBtn) {
    gmEquipBtn.addEventListener('click', function () {
      if (!gearModalItem) return;
      if (gearModalItem.equippedBy) {
        unequipGear(gearModalItem);
        closeGearModal();
        if (inventoryOpen) renderInventoryPanel(false);
        renderTeamSlots();
      } else {
        // Close modal, open inventory as equip picker
        var gear = gearModalItem;
        closeGearModal();
        closeInventory();
        // Prompt: user needs to click a gear slot on a team creature
        alert('Click a gear slot on a team creature to equip this item.');
      }
    });
  }

  // Resize
  window.addEventListener('resize', function () {
    if (currentScreen === 'battle') {
      sizeCanvas();
      renderBattle();
    }
  });

  // ── Init ──────────────────────────────────────────
  loadStats();
  loadDungeonProgress();
  loadInventory();
  loadEquipMap();
  initGearIdCounter();
  renderStats();

  loadData(function () {
    loadPetState();
    preloadGearSheets(function () {
      showScreen('dungeon-select');
    });
  });


})();
