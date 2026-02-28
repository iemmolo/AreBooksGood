(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var PET_KEY = 'arebooksgood-pet';
  var DUNGEON_KEY = 'arebooksgood-dungeon';
  var STATS_KEY = 'arebooksgood-dungeon-stats';
  // Inventory & equip keys now managed by GearSystem
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
    // Daily glass-cannon modifier: double all damage
    if (isDailyModActive('glass-cannon')) dmg = dmg * 2;
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
      enemies: [['slime-green','slime-blue','slime-pink'],['myconid-red','goblin-spear','spike'],['slime-black','myconid-purple','goblin-bomb'],['goblin-archer','myconid-green','slime-golden'],['myconid-pink','slime-purple','spike'],['slime-golden-big','goblin-bomb','goblin-archer'],['slime-black-big','venom-bloom','myconid-purple'],['slime-pink-big','mimic','slime-blue-big']] },
    { id: 9, name: 'Poison Marsh',  typeLock: 'nature', waves: 5, stars: 3,
      enemies: [['sprout-blue','myconid-green','sprout-pink'],['myconid-green','sprout-purple','sprout-blue'],['sprout-pink','myconid-green','myconid-green'],['venom-bloom','sprout-blue','myconid-green'],['frogger-boss','myconid-green','sprout-purple']] },
    { id: 10, name: 'Iron Forge',   typeLock: 'tech',   waves: 6, stars: 4,
      enemies: [['goblin-spear','slime-golden','goblin-archer'],['goblin-bomb','goblin-spear','slime-golden'],['slime-golden','goblin-archer','goblin-bomb'],['goblin-spear','goblin-bomb','goblin-archer'],['slime-golden-big','goblin-bomb','goblin-spear'],['iron-golem','goblin-archer','goblin-bomb']] },
    { id: 11, name: 'Void Sanctum', typeLock: 'mystic', waves: 6, stars: 4,
      enemies: [['myconid-pink','slime-purple','myconid-pink'],['slime-purple','myconid-pink','slime-purple'],['myconid-pink','myconid-blue','slime-purple'],['mimic','myconid-pink','slime-purple'],['slime-purple','mimic','myconid-pink'],['void-mimic','myconid-pink','slime-purple']] },
    { id: 12, name: 'The Gauntlet', typeLock: null,     waves: 8, stars: 5,
      enemies: [['slime-green','slime-blue','slime-pink'],['myconid-red','goblin-spear','spike'],['slime-black','myconid-purple','goblin-bomb'],['goblin-archer','myconid-green','slime-golden'],['venom-bloom','myconid-pink','spike'],['frogger-boss','goblin-bomb','myconid-purple'],['iron-golem','mimic','slime-golden-big'],['void-mimic','frogger-boss','iron-golem']] },
    { id: 13, name: 'Bone Yard',    typeLock: 'shadow', waves: 5, stars: 3,
      enemies: [['dark-bat','dark-bat','sprout-purple'],['dark-bat','spike','sprout-purple'],['spike','dark-bat','dark-bat'],['dark-bat','spike','spike'],['skeleton-knight','dark-bat','spike']] },
    { id: 14, name: 'Fungal Depths', typeLock: 'nature', waves: 6, stars: 4,
      enemies: [['forest-flyer','myconid-green','sprout-blue'],['mushroom-warrior','forest-flyer','myconid-green'],['forest-flyer','forest-flyer','mushroom-warrior'],['mushroom-warrior','myconid-green','forest-flyer'],['forest-flyer','mushroom-warrior','forest-flyer'],['pumpkin-boss','mushroom-warrior','forest-flyer']] },
    { id: 15, name: 'Golem Forge',  typeLock: null,     waves: 6, stars: 4,
      enemies: [['golem-blue','golem-orange','fantasy-goblin'],['fantasy-goblin','golem-blue','golem-orange'],['golem-orange','golem-orange','fantasy-goblin'],['fantasy-goblin','golem-blue','golem-blue'],['golem-orange','fantasy-goblin','golem-blue'],['flying-eye','golem-orange','golem-blue']] },
    { id: 16, name: 'Inferno Pit',  typeLock: 'fire',   waves: 6, stars: 4,
      enemies: [['golem-orange','slime-pink','myconid-red'],['myconid-red','golem-orange','slime-pink'],['golem-orange','golem-orange','myconid-red'],['slime-pink','golem-orange','myconid-red'],['cursed-spirit-boss','golem-orange','slime-pink'],['demon-slime-boss','golem-orange','myconid-red']] },
    { id: 17, name: 'Storm Peaks',  typeLock: 'aqua',   waves: 7, stars: 4,
      enemies: [['golem-blue','slime-blue','slime-light-blue'],['golem-blue','myconid-blue','slime-blue'],['dark-bat','golem-blue','slime-blue'],['golem-blue','golem-blue','dark-bat'],['dark-bat','golem-blue','myconid-blue'],['golem-blue','dark-bat','golem-blue'],['cloud-boss','golem-blue','dark-bat']] },
    { id: 18, name: "Ronin's Keep", typeLock: 'mystic', waves: 7, stars: 5,
      enemies: [['myconid-pink','slime-purple','dark-bat'],['fantasy-goblin','myconid-pink','dark-bat'],['mushroom-warrior','slime-purple','myconid-pink'],['dark-bat','fantasy-goblin','myconid-pink'],['skeleton-knight','myconid-pink','dark-bat'],['flying-eye','fantasy-goblin','slime-purple'],['samurai-boss','skeleton-knight','flying-eye']] },
    { id: 19, name: 'Cursed Cathedral', typeLock: null,  waves: 8, stars: 5,
      enemies: [['dark-bat','forest-flyer','golem-blue'],['fantasy-goblin','golem-orange','dark-bat'],['mushroom-warrior','forest-flyer','fantasy-goblin'],['golem-blue','golem-orange','dark-bat'],['skeleton-knight','fantasy-goblin','mushroom-warrior'],['flying-eye','dark-bat','forest-flyer'],['pumpkin-boss','skeleton-knight','golem-orange'],['samurai-boss','demon-slime-boss','flying-eye']] },
    { id: 20, name: 'The Abyss',    typeLock: null,     waves: 10, stars: 5,
      enemies: [['slime-green','slime-blue','slime-pink'],['dark-bat','forest-flyer','golem-blue'],['fantasy-goblin','mushroom-warrior','golem-orange'],['skeleton-knight','dark-bat','dark-bat'],['flying-eye','fantasy-goblin','mushroom-warrior'],['cursed-spirit-boss','golem-orange','golem-blue'],['pumpkin-boss','forest-flyer','dark-bat'],['cloud-boss','skeleton-knight','fantasy-goblin'],['demon-slime-boss','mushroom-warrior','flying-eye'],['samurai-boss','skeleton-knight','demon-slime-boss']] }
  ];

  // ── Dungeon backgrounds ─────────────────────────────
  var DUNGEON_BG = {
    1: '/images/pets/backgrounds/bg-1.png',
    2: '/images/pets/backgrounds/bg-2.png',
    3: '/images/pets/backgrounds/bg-3.png',
    4: '/images/pets/backgrounds/bg-4.png',
    5: '/images/pets/backgrounds/bg-5.png',
    6: '/images/pets/backgrounds/bg-6.png',
    7: '/images/pets/backgrounds/bg-7.png',
    8: '/images/pets/backgrounds/bg-8.png',
    9: '/images/pets/backgrounds/bg-9.png',
    10: '/images/pets/backgrounds/bg-10.png',
    11: '/images/pets/backgrounds/bg-11.png',
    12: '/images/pets/backgrounds/bg-12.png',
    13: '/images/pets/backgrounds/bg-13.png',
    14: '/images/pets/backgrounds/bg-14.png',
    15: '/images/pets/backgrounds/bg-15.png',
    16: '/images/pets/backgrounds/bg-16.png',
    17: '/images/pets/backgrounds/bg-17.png',
    18: '/images/pets/backgrounds/bg-18.png',
    19: '/images/pets/backgrounds/bg-19.png',
    20: '/images/pets/backgrounds/bg-20.png'
  };
  var bgPattern = null;
  var bgImage = null;

  // ── DOM refs ──────────────────────────────────────
  var canvas = document.getElementById('bt-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var dungeonSelectScreen = document.getElementById('bt-dungeon-select');
  var teamScreen = document.getElementById('bt-team-screen');
  var battleScreen = document.getElementById('bt-battle-screen');
  var resultsOverlay = document.getElementById('bt-results-overlay');
  var dailyScreen = document.getElementById('bt-daily-screen');
  var spireScreen = document.getElementById('bt-spire-screen');
  var titanScreen = document.getElementById('bt-titan-screen');
  var factionScreen = document.getElementById('bt-faction-screen');
  var modeTabsEl = document.getElementById('bt-mode-tabs');

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

  // ── State ─────────────────────────────────────────
  var currentScreen = 'dungeon-select';
  var gameMode = 'dungeon'; // 'dungeon', 'daily', 'spire', 'titan', 'faction'
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
  var currentTurnOrder = null; // sorted fighters for current round
  var currentTurnIdx = 0;
  var creatureFilter = 'all'; // 'all', 'fire', 'nature', etc.
  var creatureLevelFilter = 'all'; // 'all', 'max', 'leveling'
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

  // ── Save / Resume Mid-Run ─────────────────────────
  var RUN_KEY = 'arebooksgood-dungeon-run';

  function saveRun() {
    try {
      if (!selectedDungeon || gameMode !== 'dungeon') return;
      var teamSnap = [];
      for (var i = 0; i < team.length; i++) {
        var f = team[i];
        var s = f.stats || {};
        teamSnap.push({
          id: f.id, spriteId: f.spriteId, spriteKey: f.spriteKey,
          name: f.name, level: f.level, type: f.type,
          stats: { hp: s.hp, atk: s.atk, def: s.def, spd: s.spd, cri: s.cri },
          gearStats: f.gearStats || { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 },
          hp: f.hp, maxHp: f.maxHp, isPlayer: true
        });
      }
      var run = {
        dungeonId: selectedDungeon.id,
        difficulty: selectedDifficulty,
        wave: currentWave,
        totalWaves: totalWaves,
        wavesCleared: wavesCleared,
        team: teamSnap,
        teamSlots: teamSlots.slice(),
        ts: Date.now()
      };
      localStorage.setItem(RUN_KEY, JSON.stringify(run));
    } catch (e) {}
  }

  function loadSavedRun() {
    try {
      var raw = localStorage.getItem(RUN_KEY);
      if (!raw) return null;
      var run = JSON.parse(raw);
      // Expire after 24 hours
      if (Date.now() - run.ts > 86400000) { clearSavedRun(); return null; }
      // Verify dungeon still exists
      var found = false;
      for (var i = 0; i < DUNGEONS.length; i++) {
        if (DUNGEONS[i].id === run.dungeonId) { found = true; break; }
      }
      if (!found) { clearSavedRun(); return null; }
      return run;
    } catch (e) { return null; }
  }

  function clearSavedRun() {
    try { localStorage.removeItem(RUN_KEY); } catch (e) {}
    var bar = document.getElementById('bt-resume-bar');
    if (bar) { bar.innerHTML = ''; bar.classList.add('bt-hidden'); }
  }

  function renderResumeBar() {
    var bar = document.getElementById('bt-resume-bar');
    if (!bar) return;
    var run = loadSavedRun();
    if (!run) { bar.innerHTML = ''; bar.classList.add('bt-hidden'); return; }
    var dungeon = null;
    for (var i = 0; i < DUNGEONS.length; i++) {
      if (DUNGEONS[i].id === run.dungeonId) { dungeon = DUNGEONS[i]; break; }
    }
    if (!dungeon) { clearSavedRun(); return; }
    bar.classList.remove('bt-hidden');
    bar.innerHTML = '';
    var btn = document.createElement('button');
    btn.className = 'bt-resume-btn';
    var alive = 0;
    for (var t = 0; t < run.team.length; t++) { if (run.team[t].hp > 0) alive++; }
    btn.innerHTML = '<span class="bt-resume-pulse"></span>' +
      '<span class="bt-resume-info">' +
      '<span class="bt-resume-title">Resume: ' + dungeon.name + '</span><br>' +
      '<span class="bt-resume-meta">' +
      run.difficulty.charAt(0).toUpperCase() + run.difficulty.slice(1) +
      ' · Wave ' + run.wave + '/' + run.totalWaves +
      ' · ' + alive + '/' + run.team.length + ' alive</span></span>';
    btn.addEventListener('click', function () { resumeRun(run); });
    bar.appendChild(btn);

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'bt-resume-abandon';
    dismissBtn.textContent = 'Abandon';
    dismissBtn.addEventListener('click', function () { clearSavedRun(); });
    bar.appendChild(dismissBtn);
  }

  function resumeRun(run) {
    var dungeon = null;
    for (var i = 0; i < DUNGEONS.length; i++) {
      if (DUNGEONS[i].id === run.dungeonId) { dungeon = DUNGEONS[i]; break; }
    }
    if (!dungeon) return;
    selectedDungeon = dungeon;
    selectedDifficulty = run.difficulty;
    gameMode = 'dungeon';
    teamSlots = run.teamSlots || [];
    currentWave = run.wave;
    totalWaves = run.totalWaves;
    wavesCleared = run.wavesCleared;
    battleRunning = true;
    battleSpeed = 1;
    skipWave = false;
    floatingTexts = [];
    activeVFX = [];
    animQueue = [];
    currentTurnOrder = null;
    currentTurnIdx = 0;
    bannerText = null;
    bannerTimer = 0;
    countdownText = null;

    // Restore team fighters
    team = [];
    for (var t = 0; t < run.team.length; t++) {
      var snap = run.team[t];
      var f = createPlayerFighter(snap.id, snap.level);
      if (f) {
        f.hp = snap.hp;
        f.displayHp = snap.hp;
        f.maxHp = snap.maxHp || f.maxHp;
        f.spriteKey = snap.spriteKey || f.spriteKey;
        if (snap.hp <= 0) { f.hp = 0; f.displayHp = 0; f.fainted = true; }
        team.push(f);
      }
    }
    if (team.length === 0) { clearSavedRun(); return; }

    // Preload sprites then enter battle
    var spritesToLoad = [];
    for (var s = 0; s < team.length; s++) {
      spritesToLoad.push(team[s].spriteKey || team[s].spriteId);
    }
    var loaded = 0;
    function onLoad() {
      loaded++;
      if (loaded >= spritesToLoad.length) afterLoad();
    }
    for (var sl = 0; sl < spritesToLoad.length; sl++) {
      preloadSprite(spritesToLoad[sl], onLoad);
    }
    if (spritesToLoad.length === 0) afterLoad();

    function afterLoad() {
      var bgSrc = DUNGEON_BG[selectedDungeon.id];
      if (bgSrc) {
        var bgImg = new Image();
        bgImg.onload = function () {
          bgImage = bgImg;
          bgPattern = ctx.createPattern(bgImg, 'repeat');
          renderBattle();
        };
        bgImg.src = bgSrc;
      } else { bgImage = null; bgPattern = null; }
      preloadVFX(function () {
        showScreen('battle');
        sizeCanvas();
        clearLog();
        updateWaveHUD();
        updateSpeedBtn();
        logMessage('--- Resuming ' + selectedDungeon.name + ' ---', 'bt-log-wave');
        logMessage('--- Wave ' + currentWave + '/' + totalWaves + ' ---', 'bt-log-wave');
        generateWaveEnemies(currentWave - 1, function () {
          startEnemyAnimLoop();
          renderBattle();
          countdownText = 'RESUME';
          renderBattle();
          autoTimer = setTimeout(function () {
            countdownText = null;
            renderBattle();
            autoTimer = setTimeout(runAutoBattle, 200);
          }, 800);
        });
      });
    }
  }

  function isDungeonCleared(dungeonId, difficulty) {
    var d = dungeonProgress.difficulties[dungeonId];
    if (!d) return false;
    return !!d[difficulty];
  }

  function isDungeonClearedAny(dungeonId) {
    var d = dungeonProgress.difficulties[dungeonId];
    if (!d) return false;
    return d.normal || d.hard || d.brutal || d.nightmare;
  }

  function isDifficultyUnlocked(dungeonId, difficulty) {
    if (difficulty === 'normal') return true;
    if (difficulty === 'hard') return isDungeonCleared(dungeonId, 'normal');
    if (difficulty === 'brutal') return isDungeonCleared(dungeonId, 'hard');
    if (difficulty === 'nightmare') return isDungeonCleared(dungeonId, 'brutal');
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
      dungeonProgress.difficulties[dungeonId] = { normal: false, hard: false, brutal: false, nightmare: false };
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

  // Dark overlay box for banner/countdown text
  function drawDialogBox(x, y, w, h) {
    var s = uiScale();
    var r = Math.round(6 * s);
    // Dark fill
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath(); roundRect(x, y, w, h, r); ctx.fill();
    // Subtle border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.round(2 * s);
    ctx.beginPath(); roundRect(x, y, w, h, r); ctx.stroke();
  }

  // ── Gear stat aggregation (delegated to GearSystem) ──

  // ── Create fighter objects ────────────────────────
  function createPlayerFighter(creatureId, level) {
    if (!catalog || !catalog.creatures[creatureId]) return null;
    var c = catalog.creatures[creatureId];
    var tier = c.tier || 'common';
    var type = c.type || 'fire';
    var stats = calcCreatureStats(tier, type, level);
    var gearStats = GearSystem.calcEquippedStats(creatureId);
    var setBonuses = GearSystem.calcSetBonuses(creatureId);
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
      status: { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 },
      battleStats: { damageDealt: 0, damageTaken: 0, kills: 0 }
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
      status: { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 },
      battleStats: { damageDealt: 0, damageTaken: 0, kills: 0 }
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
    // Titan check: use TitanAnimator for animated titan sprites
    if (fighter.isTitan && titanAnim.config) {
      titanAnimDraw(fighter, x, y, size);
      return;
    }
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

  function drawTypeBadge(text, cx, y) {
    var s = uiScale();
    var color = TYPE_COLORS[text] || themeColors.fg;
    ctx.font = 'bold ' + Math.round(7 * s) + 'px monospace';
    var tw = ctx.measureText(text.toUpperCase()).width + Math.round(6 * s);
    var badgeH = Math.round(12 * s);
    var bx = cx - tw / 2;
    // Badge background
    ctx.fillStyle = color + '30';
    ctx.beginPath(); roundRect(bx, y, tw, badgeH, Math.round(2 * s)); ctx.fill();
    // Badge border
    ctx.strokeStyle = color + '50';
    ctx.lineWidth = 1;
    ctx.beginPath(); roundRect(bx, y, tw, badgeH, Math.round(2 * s)); ctx.stroke();
    // Type text with dark outline
    ctx.textAlign = 'center';
    var ty = y + Math.round(9 * s);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = Math.round(2 * s);
    ctx.strokeText(text.toUpperCase(), cx, ty);
    ctx.fillStyle = color;
    ctx.fillText(text.toUpperCase(), cx, ty);
  }

  function drawStatusIcons(fighter, cx, y) {
    var s = uiScale();
    var icons = [];
    if (fighter.status.burn > 0) icons.push({ label: 'BRN', color: '#ff6b35' });
    if (fighter.status.curse > 0) icons.push({ label: 'CRS', color: '#ab47bc' });
    if (fighter.status.stun) icons.push({ label: 'STN', color: '#ffd54f' });
    if (fighter.status.slow > 0) icons.push({ label: 'SLW', color: '#29b6f6' });
    if (fighter.status.dodge) icons.push({ label: 'EVD', color: '#4caf50' });
    if (fighter.status.atkUp > 0) icons.push({ label: 'ATK+', color: '#f44336' });
    if (icons.length === 0) return;
    ctx.font = 'bold ' + Math.round(6 * s) + 'px monospace';
    var iconW = Math.round(26 * s);
    var iconBoxW = Math.round(24 * s);
    var iconH = Math.round(10 * s);
    var totalW = icons.length * iconW - (iconW - iconBoxW);
    var startX = cx - totalW / 2;
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var ix = startX + i * iconW;
      ctx.fillStyle = icon.color + '30';
      ctx.beginPath(); roundRect(ix, y, iconBoxW, iconH, Math.round(2 * s)); ctx.fill();
      ctx.fillStyle = icon.color;
      ctx.textAlign = 'center';
      ctx.fillText(icon.label, ix + iconBoxW / 2, y + Math.round(8 * s));
    }
  }

  // ── Floating text particles ───────────────────────
  var floatingTexts = [];

  // Floating text style categories
  var FT_STYLE_DAMAGE = 'damage';
  var FT_STYLE_HEAL = 'heal';
  var FT_STYLE_STATUS = 'status';
  var FT_STYLE_EFFECTIVE = 'effective';
  var FT_STYLE_CRIT = 'crit';

  function classifyFloatStyle(text) {
    if (text === 'CRIT!') return FT_STYLE_CRIT;
    if (text === 'DODGE!' || text.charAt(0) === '+') return FT_STYLE_HEAL;
    if (text === 'Super effective!' || text === 'Not very effective...') return FT_STYLE_EFFECTIVE;
    if (text === 'BRN' || text === 'CRS' || text === 'STN' || text === 'SLW') return FT_STYLE_STATUS;
    if (text.charAt(0) === '-') return FT_STYLE_DAMAGE;
    return FT_STYLE_DAMAGE;
  }

  function addFloatingText(text, x, y, color, scale) {
    // Push above any nearby existing texts to prevent overlap
    var s = uiScale();
    var textH = Math.round(16 * s * (scale || 1));
    for (var j = 0; j < floatingTexts.length; j++) {
      var other = floatingTexts[j];
      if (Math.abs(other.x - x) < 60 * s && other.y - y < textH && other.y - y > -textH) {
        y = other.y - textH;
      }
    }
    var style = classifyFloatStyle(text);
    floatingTexts.push({ text: text, x: x, y: y, color: color || themeColors.fg, life: 45, maxLife: 45, scale: scale || 1, style: style });
  }

  function updateFloatingTexts() {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.y -= 0.7;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function drawFloatPill(cx, cy, text, fontSize, color, alpha, padX, padY, radius) {
    var tw = ctx.measureText(text).width;
    var pw = tw + padX * 2;
    var ph = fontSize + padY * 2;
    var px = cx - pw / 2;
    var py = cy - fontSize * 0.75 - padY;
    // Shadow
    ctx.save();
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath(); roundRect(px + 1, py + 2, pw, ph, radius); ctx.fill();
    ctx.restore();
    // Background
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = color + '30';
    ctx.beginPath(); roundRect(px, py, pw, ph, radius); ctx.fill();
    // Border
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 1;
    ctx.beginPath(); roundRect(px, py, pw, ph, radius); ctx.stroke();
    ctx.restore();
  }

  function drawFloatingTexts() {
    var s = uiScale();
    for (var i = 0; i < floatingTexts.length; i++) {
      var ft = floatingTexts[i];
      var alpha = Math.min(1, ft.life / 12);
      var entryPop = ft.life > ft.maxLife - 5 ? 1 + (ft.maxLife - ft.life) * 0.02 : 1;
      var fontSize = Math.round(12 * s * (ft.scale || 1) * entryPop);
      ctx.font = 'bold ' + fontSize + 'px monospace';
      ctx.textAlign = 'center';

      if (ft.style === FT_STYLE_DAMAGE) {
        // Damage: bold number with dark pill
        ctx.globalAlpha = alpha;
        drawFloatPill(ft.x, ft.y, ft.text, fontSize, ft.color, alpha, Math.round(6 * s), Math.round(3 * s), Math.round(4 * s));
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = Math.round(3 * s);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

      } else if (ft.style === FT_STYLE_CRIT) {
        // CRIT: gold glow + larger pill
        ctx.globalAlpha = alpha;
        drawFloatPill(ft.x, ft.y, ft.text, fontSize, '#ffd54f', alpha, Math.round(10 * s), Math.round(4 * s), Math.round(5 * s));
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = Math.round(8 * s);
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = Math.round(3 * s);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = '#ffd54f';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;

      } else if (ft.style === FT_STYLE_HEAL) {
        // Heal / Dodge: green pill
        ctx.globalAlpha = alpha;
        drawFloatPill(ft.x, ft.y, ft.text, fontSize, ft.color, alpha, Math.round(6 * s), Math.round(3 * s), Math.round(4 * s));
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = Math.round(2 * s);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

      } else if (ft.style === FT_STYLE_STATUS) {
        // Status (BRN, STN, CRS, SLW): compact colored pill badge
        ctx.globalAlpha = alpha;
        drawFloatPill(ft.x, ft.y, ft.text, fontSize, ft.color, alpha, Math.round(8 * s), Math.round(3 * s), Math.round(3 * s));
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + fontSize + 'px monospace';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = Math.round(2 * s);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

      } else if (ft.style === FT_STYLE_EFFECTIVE) {
        // Super effective / Not very effective: wide pill banner
        var isSuper = ft.text.indexOf('Super') === 0;
        ctx.globalAlpha = alpha;
        drawFloatPill(ft.x, ft.y, ft.text, fontSize, ft.color, alpha, Math.round(10 * s), Math.round(4 * s), Math.round(5 * s));
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + fontSize + 'px monospace';
        if (isSuper) {
          ctx.shadowColor = ft.color;
          ctx.shadowBlur = Math.round(4 * s);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = Math.round(2 * s);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;

      } else {
        // Fallback
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3 * s;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Shake & flash effects ─────────────────────────
  // ── Canvas banner (wave clear / countdown) ──────
  var bannerText = null;
  var bannerTimer = 0;
  var bannerMaxTimer = 0;

  // ── Countdown state ─────────────────────────────
  var countdownText = null;

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
      // Update titan animator if active
      if (titanAnim.config) titanAnimUpdate(200);
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
    var startY = CANVAS_H * 0.10;
    var spacingY = CANVAS_H * 0.29;

    // Player positions — centered at 25% of canvas width
    for (var i = 0; i < 3; i++) {
      positions.push({
        side: 'player', idx: i,
        x: CANVAS_W * 0.25 - spriteSize / 2,
        y: startY + i * spacingY,
        size: spriteSize
      });
    }
    // Enemy positions — centered at 75% of canvas width
    var isTitanFight = gameMode === 'titan' && enemies.length === 1 && enemies[0] && enemies[0].isTitan;
    for (var j = 0; j < 3; j++) {
      var eSize = (enemies[j] && enemies[j].isBoss) ? bossSize : spriteSize;
      var ex = CANVAS_W * 0.75 - eSize / 2;
      var ey = startY + j * spacingY;
      if (isTitanFight && j === 0) {
        var titanScale = (titanAnim.config && titanAnim.config.scale) || 3.0;
        eSize = Math.round(bossSize * titanScale);
        ex = CANVAS_W * 0.75 - eSize / 2;
        ey = CANVAS_H * 0.5 - eSize / 2;
      }
      positions.push({
        side: 'enemy', idx: j,
        x: ex, y: ey,
        size: eSize
      });
    }
    return positions;
  }

  function renderBattle() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Tiled dungeon background texture
    if (bgPattern) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = bgPattern;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    // Gradient overlay for depth
    var bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
    bgGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = bgGrad;
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

    // Identify active turn fighter for highlight
    var activeFighter = (currentTurnOrder && currentTurnIdx >= 0 && currentTurnIdx < currentTurnOrder.length && battleRunning)
      ? currentTurnOrder[currentTurnIdx] : null;

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
      // Active turn highlight ring
      if (fighter === activeFighter && fighter.hp > 0) {
        ctx.save();
        ctx.strokeStyle = themeColors.accent;
        ctx.lineWidth = Math.round(2 * s);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(px + pos.size / 2, py + pos.size / 2, pos.size / 2 + Math.round(4 * s), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Platform shadow
      ctx.save();
      ctx.globalAlpha = 0.25 * (fighter.opacity || 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(px + pos.size / 2, py + pos.size + Math.round(2 * s), pos.size * 0.45, pos.size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawPlayerSprite(fighter, px, py, pos.size);
      // Name
      ctx.fillStyle = themeColors.fg;
      ctx.font = 'bold ' + Math.round(9 * s) + 'px monospace';
      ctx.textAlign = 'center';
      var nameX = px + pos.size / 2;
      ctx.fillText(fighter.name, nameX, py - Math.round(2 * s));
      // HP bar (centered under sprite)
      var hpBarW = pos.size + Math.round(8 * s);
      drawHPBar(px + pos.size / 2 - hpBarW / 2, py + pos.size + Math.round(3 * s), hpBarW, fighter.hp, fighter.maxHp, fighter.displayHp);
      // Type badge (centered under sprite)
      drawTypeBadge(fighter.type, px + pos.size / 2, py + pos.size + Math.round(14 * s));
      // Status icons (centered under sprite)
      drawStatusIcons(fighter, px + pos.size / 2, py + pos.size + Math.round(27 * s));
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
      // Active turn highlight ring
      if (enemy === activeFighter && enemy.hp > 0) {
        ctx.save();
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = Math.round(2 * s);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(ex + epos.size / 2, ey + epos.size / 2, epos.size / 2 + Math.round(4 * s), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Platform shadow
      ctx.save();
      ctx.globalAlpha = 0.25 * (enemy.opacity || 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(ex + epos.size / 2, ey + epos.size + Math.round(2 * s), epos.size * 0.45, epos.size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawEnemySprite(enemy, ex, ey, epos.size, enemyAnimFrame);
      // Name
      ctx.fillStyle = themeColors.fg;
      ctx.font = 'bold ' + Math.round(9 * s) + 'px monospace';
      ctx.textAlign = 'center';
      var enameX = ex + epos.size / 2;
      ctx.fillText(enemy.name, enameX, ey - Math.round(2 * s));
      // HP bar (centered under sprite)
      var eHpBarW = epos.size + Math.round(8 * s);
      drawHPBar(ex + epos.size / 2 - eHpBarW / 2, ey + epos.size + Math.round(3 * s), eHpBarW, enemy.hp, enemy.maxHp, enemy.displayHp);
      // Type badge (centered under sprite)
      drawTypeBadge(enemy.type, ex + epos.size / 2, ey + epos.size + Math.round(14 * s));
      // Status icons (centered under sprite)
      drawStatusIcons(enemy, ex + epos.size / 2, ey + epos.size + Math.round(27 * s));
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

    // Titan phase transition text overlay
    titanAnimDrawPhaseText();

    // Turn order pips
    if (currentTurnOrder && currentTurnOrder.length > 0 && battleRunning) {
      var pipS = uiScale();
      var pipR = Math.round(5 * pipS);
      var pipGap = Math.round(4 * pipS);
      var totalPipW = currentTurnOrder.length * (pipR * 2 + pipGap) - pipGap;
      var pipStartX = (CANVAS_W - totalPipW) / 2;
      var pipY = CANVAS_H - Math.round(30 * pipS);
      for (var pi = 0; pi < currentTurnOrder.length; pi++) {
        var pf = currentTurnOrder[pi];
        var pipX = pipStartX + pi * (pipR * 2 + pipGap) + pipR;
        ctx.beginPath();
        ctx.arc(pipX, pipY, pipR, 0, Math.PI * 2);
        ctx.globalAlpha = pf.hp <= 0 ? 0.25 : (pi === currentTurnIdx ? 1 : 0.6);
        ctx.fillStyle = pf.isPlayer ? themeColors.accent : '#f44336';
        ctx.fill();
        if (pi === currentTurnIdx) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = Math.round(2 * pipS);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    // Canvas banner (WAVE CLEAR / countdown) — dialog box overlay
    if (bannerText && bannerTimer > 0) {
      var bAlpha = Math.min(1, bannerTimer / (bannerMaxTimer * 0.3));
      var bS = uiScale();
      ctx.globalAlpha = bAlpha;
      // Dark scrim
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Dialog box frame
      var bFontSize = Math.round(28 * bS);
      ctx.font = 'bold ' + bFontSize + 'px monospace';
      var bannerTW = ctx.measureText(bannerText).width;
      var bBoxW = bannerTW + Math.round(60 * bS);
      var bBoxH = Math.round(56 * bS);
      var bBoxX = (CANVAS_W - bBoxW) / 2;
      var bBoxY = (CANVAS_H - bBoxH) / 2;
      drawDialogBox(bBoxX, bBoxY, bBoxW, bBoxH);
      // Text centered inside box
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(bannerText, CANVAS_W / 2, bBoxY + bBoxH / 2 + bFontSize * 0.35);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    if (countdownText) {
      var cS = uiScale();
      // Dark scrim
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Dialog box frame
      var cFontSize = Math.round(36 * cS);
      ctx.font = 'bold ' + cFontSize + 'px monospace';
      var cdTW = ctx.measureText(countdownText).width;
      var cdBoxW = Math.max(cdTW + Math.round(60 * cS), Math.round(80 * cS));
      var cdBoxH = Math.round(64 * cS);
      var cdBoxX = (CANVAS_W - cdBoxW) / 2;
      var cdBoxY = (CANVAS_H - cdBoxH) / 2;
      drawDialogBox(cdBoxX, cdBoxY, cdBoxW, cdBoxH);
      // Text centered inside box
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(countdownText, CANVAS_W / 2, cdBoxY + cdBoxH / 2 + cFontSize * 0.35);
      ctx.shadowBlur = 0;
    }
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
    if (fighter.hp > 0 && fighter.status.curse > 0) {
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
    // Show move name above attacker
    var movePos = getFighterPos(fighter);
    var moveColor = TYPE_COLORS[move.type] || themeColors.accent;
    animQueue.push({ type: 'floatText', text: move.name, x: movePos.x, y: movePos.y - 30, color: moveColor, scale: 0.85 });
    animQueue.push({ type: 'delay', ms: 150 });

    // Status moves
    if (move.effect === 'dodge' && move.power === 0) {
      fighter.status.dodge = true;
      animQueue.push({ type: 'log', text: fighter.name + ' braces to dodge!' });
      return;
    }
    if (move.effect === 'heal' && move.power === 0) {
      // Daily no-heal modifier blocks healing
      if (isDailyModActive('no-heal')) {
        animQueue.push({ type: 'log', text: fighter.name + ' tried to heal but it was blocked!' });
        return;
      }
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
      // Attacker or target died before this attack resolved — abort
      if (fighter.hp <= 0 || target.hp <= 0) {
        animQueue.push({ type: 'lunge-back', fighter: fighter });
        return;
      }
      if (target.status.dodge) {
        target.status.dodge = false;
        if (Math.random() < 0.75) {
          // Sidestep animation: target moves perpendicular
          animQueue.push({ type: 'lunge', fighter: target, dx: 0, dy: -15 });
          animQueue.push({ type: 'lunge-back', fighter: target });
          var tpos = getFighterPos(target);
          animQueue.push({ type: 'floatText', text: 'DODGE!', x: tpos.x, y: tpos.y - 20, color: '#4caf50', scale: 1.2 });
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

      animQueue.push({ type: 'check', callback: function () {
        target.hp = Math.max(0, target.hp - dmg);
        if (fighter.battleStats) fighter.battleStats.damageDealt += dmg;
        if (target.battleStats) target.battleStats.damageTaken += dmg;
        if (target.hp <= 0 && fighter.battleStats) fighter.battleStats.kills++;
        // Titan phase transition check
        if (target.isTitan && target.hp > 0) checkTitanPhaseTransition(target);
      } });

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
      var dmgScale = isCrit ? 1.4 : (typeMult > 1 ? 1.2 : (typeMult < 1 ? 0.85 : 1));
      animQueue.push({ type: 'floatText', text: '-' + dmg, x: tpos2.x, y: tpos2.y - 20, color: isCrit ? '#ffd54f' : '#f44336', scale: dmgScale });
      if (isCrit) {
        animQueue.push({ type: 'floatText', text: 'CRIT!', x: tpos2.x, y: tpos2.y - 35, color: '#ffd54f', scale: 1.4 });
        animQueue.push({ type: 'log', text: 'Critical hit!', cls: 'bt-log-crit' });
      }

      if (typeMult > 1) {
        animQueue.push({ type: 'floatText', text: 'Super effective!', x: tpos2.x, y: tpos2.y - (isCrit ? 50 : 35), color: '#4caf50', scale: 1.2 });
        animQueue.push({ type: 'log', text: 'Super effective!', cls: 'bt-log-effective' });
      } else if (typeMult < 1) {
        animQueue.push({ type: 'floatText', text: 'Not very effective...', x: tpos2.x, y: tpos2.y - 35, color: '#ff9800', scale: 0.85 });
        animQueue.push({ type: 'log', text: 'Not very effective...', cls: 'bt-log-weak' });
      }

      // Secondary effects
      if (move.effect && move.effectChance && target.hp > 0) {
        if (Math.random() < move.effectChance) {
          var statusTpos = getFighterPos(target);
          var statusShakeIdx = target.isEnemy ? 100 + enemies.indexOf(target) : team.indexOf(target);
          switch (move.effect) {
            case 'burn':
              if (target.status.burn <= 0) {
                target.status.burn = 3;
                animQueue.push({ type: 'shake', targetIdx: statusShakeIdx, ticks: 5 });
                animQueue.push({ type: 'floatText', text: 'BRN', x: statusTpos.x, y: statusTpos.y - 20, color: '#ff6b35', scale: 1.1 });
                animQueue.push({ type: 'log', text: target.name + ' was burned!', cls: 'bt-log-crit' });
              }
              break;
            case 'curse':
              if (target.status.curse <= 0) {
                target.status.curse = 3;
                animQueue.push({ type: 'shake', targetIdx: statusShakeIdx, ticks: 5 });
                animQueue.push({ type: 'floatText', text: 'CRS', x: statusTpos.x, y: statusTpos.y - 20, color: '#ab47bc', scale: 1.1 });
                animQueue.push({ type: 'log', text: target.name + ' was cursed!', cls: 'bt-log-crit' });
              }
              break;
            case 'stun':
              target.status.stun = true;
              animQueue.push({ type: 'shake', targetIdx: statusShakeIdx, ticks: 5 });
              animQueue.push({ type: 'floatText', text: 'STN', x: statusTpos.x, y: statusTpos.y - 20, color: '#ffd54f', scale: 1.1 });
              animQueue.push({ type: 'log', text: target.name + ' was stunned!', cls: 'bt-log-crit' });
              break;
            case 'slow':
              if (target.status.slow <= 0) {
                target.status.slow = 3;
                animQueue.push({ type: 'shake', targetIdx: statusShakeIdx, ticks: 5 });
                animQueue.push({ type: 'floatText', text: 'SLW', x: statusTpos.x, y: statusTpos.y - 20, color: '#29b6f6', scale: 1.1 });
                animQueue.push({ type: 'log', text: target.name + ' was slowed!', cls: 'bt-log-crit' });
              }
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
          // If a titan is being hit, play hit anim
          if (item.targetIdx >= 100) {
            var shakeEnemy = enemies[item.targetIdx - 100];
            if (shakeEnemy && shakeEnemy.isTitan && titanAnim.config) titanAnimSetAnim('hit');
          }
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
          addFloatingText(item.text, item.x, item.y, item.color, item.scale);
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
          if (item.fighter && item.fighter.isTitan && titanAnim.config) {
            if (titanAnim.config.anims.walk) {
              titanAnim.chainAttack = true;
              titanAnimSetAnim('walk');
            } else {
              titanAnimSetAnim('attack');
            }
          }
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
            renderBattle();
            animTimer = setTimeout(next, 30 * speedMult);
          } else {
            // Nothing was enqueued (dead fighter skip, no target, etc.) — proceed instantly
            next();
          }
          break;
        case 'faint':
          var f = item.fighter;
          if (f && f.isTitan && titanAnim.config) titanAnimSetAnim('death');
          if (f && !skipWave) {
            // Brief red flash before fade
            var faintShakeIdx = f.isEnemy ? 100 + enemies.indexOf(f) : team.indexOf(f);
            shakeTargetIdx = faintShakeIdx;
            shakeTicks = 4;
            flashColor = '#f44336';
            flashTicks = 3;
            renderBattle();
            animTimer = setTimeout(function () {
              if (!battleRunning) return;
              shakeTargetIdx = -1;
              shakeTicks = 0;
              // Slower faint: 16 steps with ease-out + downward drop
              var faintSteps = 16;
              var faintStep = 0;
              var faintIv = setInterval(function () {
                faintStep++;
                var progress = faintStep / faintSteps;
                // Ease-out opacity: fast at start, slow at end
                f.opacity = Math.pow(1 - progress, 2);
                // Slight downward drift
                f.offsetY = progress * 10;
                renderBattle();
                if (faintStep >= faintSteps) {
                  f.opacity = 0;
                  f.offsetY = 0;
                  clearInterval(faintIv);
                  var fIdx = activeIntervals.indexOf(faintIv);
                  if (fIdx !== -1) activeIntervals.splice(fIdx, 1);
                  animTimer = setTimeout(next, 150 * speedMult);
                }
              }, 30);
              activeIntervals.push(faintIv);
            }, 120);
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
      // Titan mode: save damage before ending
      if (gameMode === 'titan' && activeTitan) {
        endTitanAttempt(activeTitan);
      }
      // Spire mode: end run
      if (gameMode === 'spire') {
        endSpire();
      }
      endDungeon(false);
      return;
    }
    if (livingEnemies.length === 0) {
      // Wave cleared
      wavesCleared = currentWave;
      // Spire mode: advance floor instead of ending
      if (gameMode === 'spire') {
        spireNextFloor();
        return;
      }
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

    // Store turn order for pip display
    currentTurnOrder = allLiving.slice();
    currentTurnIdx = 0;

    // Execute each turn
    for (var t = 0; t < allLiving.length; t++) {
      (function (fighter, turnIdx) {
        animQueue.push({ type: 'check', callback: function () {
          currentTurnIdx = turnIdx;
          if (fighter.hp <= 0) return;
          var target = pickTarget(fighter);
          if (!target) return;
          var targetList = fighter.isPlayer ? enemies : team;
          var moveId = pickAIMove(fighter, targetList);
          executeAction(fighter, target, moveId);
        }});
      })(allLiving[t], t);
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
      var deadFighters = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].hp <= 0 && all[i].opacity > 0) {
          deadFighters.push(all[i]);
        }
      }
      if (deadFighters.length === 0) return;

      // Check if the wave is ending (entire side wiped)
      var anyPlayerAlive = false;
      var anyEnemyAlive = false;
      for (var p = 0; p < team.length; p++) { if (team[p].hp > 0) { anyPlayerAlive = true; break; } }
      for (var e = 0; e < enemies.length; e++) { if (enemies[e].hp > 0) { anyEnemyAlive = true; break; } }
      var waveEnding = !anyPlayerAlive || !anyEnemyAlive;

      if (waveEnding) {
        // Quick batch death — skip elaborate sequential faint animations
        for (var d = 0; d < deadFighters.length; d++) {
          deadFighters[d].opacity = 0;
        }
        animQueue.push({ type: 'delay', ms: 250 });
      } else {
        // Mid-wave deaths: play individual faint animations
        for (var d2 = 0; d2 < deadFighters.length; d2++) {
          animQueue.push({ type: 'faint', fighter: deadFighters[d2] });
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
    // Show WAVE CLEAR banner
    if (!skipWave) {
      bannerText = 'WAVE CLEAR!';
      bannerTimer = 30;
      bannerMaxTimer = 30;
      if (skipWaveBtn) skipWaveBtn.classList.remove('bt-skip-active');
      var bannerIv = setInterval(function () {
        if (!battleRunning) { clearInterval(bannerIv); bannerText = null; return; }
        bannerTimer--;
        renderBattle();
        if (bannerTimer <= 0) {
          clearInterval(bannerIv);
          var bIdx = activeIntervals.indexOf(bannerIv);
          if (bIdx !== -1) activeIntervals.splice(bIdx, 1);
          bannerText = null;
          doNextWave();
        }
      }, 30);
      activeIntervals.push(bannerIv);
    } else {
      doNextWave();
    }

    function doNextWave() {
      currentWave++;
      logMessage('--- Wave ' + currentWave + '/' + totalWaves + ' ---', 'bt-log-wave');
      updateWaveHUD();
      saveRun();

      // Clear status effects on player creatures between waves
      for (var i = 0; i < team.length; i++) {
        team[i].status = { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 };
      }

      // Generate new enemies
      generateWaveEnemies(currentWave - 1, function () {
        // Nightmare enrage: +5% ATK per wave
        if (selectedDifficulty === 'nightmare') {
          var enrageMult = 1 + 0.05 * (currentWave - 1);
          for (var ei = 0; ei < enemies.length; ei++) {
            enemies[ei].stats.atk = Math.floor(enemies[ei].stats.atk * enrageMult);
          }
          if (currentWave > 1) logMessage('Enemies enraged! (+' + Math.round((enrageMult - 1) * 100) + '% ATK)', 'bt-log-status');
        }
        renderBattle();
        var wasSkipping = skipWave;
        var delay = battleSpeed === 2 ? 400 : 800;
        if (skipWave) delay = 30;
        skipWave = false; // reset skip for new wave
        if (skipWaveBtn) skipWaveBtn.classList.remove('bt-skip-active');

        // Boss wave announcement on final wave
        if (currentWave === totalWaves && !wasSkipping) {
          showBossBanner(function () {
            autoTimer = setTimeout(runAutoBattle, delay);
          });
        } else {
          autoTimer = setTimeout(runAutoBattle, delay);
        }
      });
    }
  }

  function showBossBanner(callback) {
    var banner = document.createElement('div');
    banner.className = 'bt-boss-banner';
    banner.textContent = 'BOSS WAVE';
    var wrap = document.querySelector('.bt-canvas-wrap');
    if (wrap) {
      wrap.appendChild(banner);
      setTimeout(function () {
        banner.classList.add('bt-boss-banner-out');
        setTimeout(function () {
          if (banner.parentNode) banner.parentNode.removeChild(banner);
          if (callback) callback();
        }, 400);
      }, 1200);
    } else {
      if (callback) callback();
    }
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

  // ── Gear Drop Generation (delegated to GearSystem) ──

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
    clearSavedRun();
    battleRunning = false;
    currentTurnOrder = null;
    currentTurnIdx = 0;
    bannerText = null;
    countdownText = null;
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
    var xpBarAnimations = [];

    for (var i = 0; i < team.length; i++) {
      var creature = team[i];
      var alive = creature.hp > 0;
      var xp = Math.floor(xpPer * (alive ? 1 : 0.5));
      if (isFirstClear) xp = Math.floor(xp * 3);
      totalXPawarded += xp;

      var oldMergeXP = 0;
      try {
        var freshRaw = localStorage.getItem(PET_KEY);
        if (freshRaw) {
          var freshState = JSON.parse(freshRaw);
          if (freshState.pets && freshState.pets[creature.id]) {
            oldMergeXP = freshState.pets[creature.id].mergeXP || 0;
            freshState.pets[creature.id].mergeXP = oldMergeXP + xp;
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

      // XP progress bar
      var creatureMaxLevel = 1;
      if (catalog && catalog.creatures && catalog.creatures[creature.id]) {
        creatureMaxLevel = catalog.creatures[creature.id].maxLevel || 1;
      }
      var isMaxed = (creature.level || 1) >= creatureMaxLevel;

      if (isMaxed) {
        var maxLabel = document.createElement('div');
        maxLabel.className = 'bt-creature-xp-label';
        maxLabel.textContent = 'MAX';
        item.appendChild(maxLabel);
      } else {
        var nextReq = catalog && catalog.evolution && catalog.evolution[String((creature.level || 1) + 1)]
          ? catalog.evolution[String((creature.level || 1) + 1)].xpRequired : 100;
        var newMergeXP = oldMergeXP + xp;
        var oldPct = Math.min(oldMergeXP / nextReq * 100, 100);
        var newPct = Math.min(newMergeXP / nextReq * 100, 100);

        var barContainer = document.createElement('div');
        barContainer.className = 'bt-creature-xp-bar';
        var barFill = document.createElement('div');
        barFill.className = 'bt-creature-xp-fill';
        barFill.style.width = oldPct + '%';
        barContainer.appendChild(barFill);
        item.appendChild(barContainer);

        var barLabel = document.createElement('div');
        barLabel.className = 'bt-creature-xp-label';
        barLabel.textContent = Math.min(newMergeXP, nextReq) + '/' + nextReq;
        item.appendChild(barLabel);

        xpBarAnimations.push({ fill: barFill, pct: newPct });
      }

      creatureXPList.appendChild(item);
    }

    // Animate XP bars ~1s after the results overlay opens
    setTimeout(function() {
      for (var a = 0; a < xpBarAnimations.length; a++) {
        xpBarAnimations[a].fill.style.width = xpBarAnimations[a].pct + '%';
      }
    }, 1000);

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
      gearDrops = GearSystem.generateDrop(selectedDifficulty, stars, isFirstClear, dungeon);
      if (gearDrops.length > 0) {
        gearDropsAdded = GearSystem.addToInventory(gearDrops);
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

    // Daily challenge completion
    if (victory && gameMode === 'daily' && !dailyState.completed) {
      dailyState.completed = true;
      dailyState.streak++;
      dailyState.totalCompleted++;
      var streakReward = getDailyStreakReward(dailyState.streak);
      if (streakReward.coins > 0 && typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(streakReward.coins);
      if (streakReward.jb > 0 && typeof JackBucks !== 'undefined' && JackBucks.add) JackBucks.add(streakReward.jb);
      saveDailyState();
    }

    // Faction Wars marks
    if (victory && gameMode === 'faction' && selectedDungeon && selectedDungeon.factionId) {
      var factionMarks = { normal: 10, hard: 20, brutal: 40, nightmare: 80 };
      var marksEarned = factionMarks[selectedDifficulty] || 10;
      loadFactionState();
      factionState.marks += marksEarned;
      if (!factionState.completed[selectedDungeon.factionId]) {
        factionState.completed[selectedDungeon.factionId] = {};
      }
      factionState.completed[selectedDungeon.factionId][selectedDifficulty] = true;
      saveFactionState();
    }

    // Titan mode end
    if (victory && gameMode === 'titan' && activeTitan) {
      endTitanAttempt(activeTitan);
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

    // Per-creature battle stats + MVP
    var statsContainer = document.getElementById('bt-creature-battle-stats');
    if (!statsContainer) {
      statsContainer = document.createElement('div');
      statsContainer.id = 'bt-creature-battle-stats';
      creatureXPList.parentNode.insertBefore(statsContainer, creatureXPList.nextSibling);
    }
    statsContainer.innerHTML = '';
    if (team.length > 0) {
      var mvpIdx = 0;
      var mvpDmg = 0;
      for (var si = 0; si < team.length; si++) {
        var bs = team[si].battleStats || { damageDealt: 0, damageTaken: 0, kills: 0 };
        if (bs.damageDealt > mvpDmg) { mvpDmg = bs.damageDealt; mvpIdx = si; }
      }
      var statsRow = document.createElement('div');
      statsRow.className = 'bt-battle-stats-row';
      for (var si2 = 0; si2 < team.length; si2++) {
        var bs2 = team[si2].battleStats || { damageDealt: 0, damageTaken: 0, kills: 0 };
        var statCard = document.createElement('div');
        statCard.className = 'bt-battle-stat-card';
        if (si2 === mvpIdx && mvpDmg > 0) {
          var mvpBadge = document.createElement('div');
          mvpBadge.className = 'bt-mvp-badge';
          mvpBadge.textContent = 'MVP';
          statCard.appendChild(mvpBadge);
        }
        var scName = document.createElement('div');
        scName.className = 'bt-battle-stat-name';
        scName.textContent = team[si2].name;
        statCard.appendChild(scName);
        var scGrid = document.createElement('div');
        scGrid.className = 'bt-battle-stat-grid';
        scGrid.innerHTML = '<span class="bt-bsg-label">DMG</span><span class="bt-bsg-value">' + bs2.damageDealt +
          '</span><span class="bt-bsg-label">Taken</span><span class="bt-bsg-value">' + bs2.damageTaken +
          '</span><span class="bt-bsg-label">Kills</span><span class="bt-bsg-value">' + bs2.kills + '</span>';
        statCard.appendChild(scGrid);
        statsRow.appendChild(statCard);
      }
      statsContainer.appendChild(statsRow);
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

    // Scroll hint — only show if content overflows
    var panel = resultsOverlay.querySelector('.bt-results-panel');
    if (panel) {
      var oldHint = resultsOverlay.querySelector('.bt-scroll-hint');
      if (oldHint) oldHint.parentNode.removeChild(oldHint);
      setTimeout(function () {
        if (panel.scrollHeight <= panel.clientHeight + 5) return;
        var hint = document.createElement('div');
        hint.className = 'bt-scroll-hint';
        hint.innerHTML = '<span class="bt-scroll-hint-arrow">&#9660; scroll &#9660;</span>';
        // Append to overlay (not panel) so hint doesn't inflate scrollHeight
        var rect = panel.getBoundingClientRect();
        hint.style.left = rect.left + 'px';
        hint.style.width = rect.width + 'px';
        hint.style.bottom = (window.innerHeight - rect.bottom) + 'px';
        resultsOverlay.appendChild(hint);
        var checkScroll = function () {
          var atBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 50;
          hint.classList.toggle('bt-scrolled-bottom', atBottom);
        };
        panel.addEventListener('scroll', checkScroll);
        setTimeout(checkScroll, 50);
      }, 100);
    }

    renderStats();

    // Enhanced first clear celebration
    if (isFirstClear) {
      triggerFirstClearCelebration();
    }
  }

  function cleanupCelebration() {
    if (!resultsOverlay) return;
    var oldText = resultsOverlay.querySelector('.bt-first-clear-text');
    if (oldText) oldText.parentNode.removeChild(oldText);
    var oldFlash = resultsOverlay.querySelector('.bt-first-clear-flash');
    if (oldFlash) oldFlash.parentNode.removeChild(oldFlash);
    var bits = resultsOverlay.querySelectorAll('.bt-confetti');
    for (var i = 0; i < bits.length; i++) {
      if (bits[i].parentNode) bits[i].parentNode.removeChild(bits[i]);
    }
  }

  function triggerFirstClearCelebration() {
    var overlay = resultsOverlay;
    if (!overlay) return;
    var inner = overlay.querySelector('.bt-overlay-inner');
    if (!inner) return;

    // Clean up any previous celebration elements
    cleanupCelebration();

    // Screen flash
    var flash = document.createElement('div');
    flash.className = 'bt-first-clear-flash';
    overlay.appendChild(flash);
    setTimeout(function () { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);

    // "FIRST CLEAR!" text with scale animation
    var fcText = document.createElement('div');
    fcText.className = 'bt-first-clear-text';
    fcText.textContent = 'FIRST CLEAR!';
    inner.insertBefore(fcText, inner.firstChild);

    // Confetti particles
    var colors = ['#ffd54f', '#ff6b35', '#4caf50', '#29b6f6', '#ab47bc', '#f44336'];
    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      p.className = 'bt-confetti';
      p.style.left = (Math.random() * 100) + '%';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.animationDuration = (1.5 + Math.random() * 1) + 's';
      var size = 4 + Math.floor(Math.random() * 4);
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      overlay.appendChild(p);
    }
    // Cleanup confetti after animation
    setTimeout(function () {
      var bits = overlay.querySelectorAll('.bt-confetti');
      for (var j = 0; j < bits.length; j++) {
        if (bits[j].parentNode) bits[j].parentNode.removeChild(bits[j]);
      }
    }, 3000);
  }

  function renderGearDropCard(gear) {
    var card = document.createElement('div');
    card.className = 'bt-gear-drop-card bt-rarity-' + gear.rarity;
    // Sprite icon
    var iconEl = document.createElement('div');
    iconEl.className = 'bt-gear-icon';
    GearSystem.renderGearIcon(iconEl, gear);
    card.appendChild(iconEl);
    // Name
    var nameEl = document.createElement('div');
    nameEl.className = 'bt-gear-drop-name';
    nameEl.textContent = GearSystem.getDisplayName(gear);
    card.appendChild(nameEl);
    // Rarity + slot
    var rarityEl = document.createElement('div');
    rarityEl.className = 'bt-gear-drop-rarity bt-rarity-text-' + gear.rarity;
    rarityEl.textContent = gear.rarity.charAt(0).toUpperCase() + gear.rarity.slice(1) + ' ' + gear.slot;
    card.appendChild(rarityEl);
    // Main stat
    var statEl = document.createElement('div');
    statEl.className = 'bt-gear-drop-stat';
    var statText = '+' + GearSystem.getEffectiveMain(gear) + ' ' + (gear.mainStat || '').toUpperCase();
    if (gear.secondaryStat) {
      statText += '  +' + GearSystem.getEffectiveSecondary(gear) + ' ' + gear.secondaryStat.toUpperCase();
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

  // renderGearIcon → GearSystem.renderGearIcon

  // ── Screen transitions ────────────────────────────
  function hideAllScreens() {
    dungeonSelectScreen.classList.add('bt-hidden');
    teamScreen.classList.add('bt-hidden');
    battleScreen.classList.add('bt-hidden');
    resultsOverlay.classList.add('bt-hidden');
    if (dailyScreen) dailyScreen.classList.add('bt-hidden');
    if (spireScreen) spireScreen.classList.add('bt-hidden');
    if (titanScreen) titanScreen.classList.add('bt-hidden');
    if (factionScreen) factionScreen.classList.add('bt-hidden');
  }

  function showScreen(screen) {
    currentScreen = screen;
    hideAllScreens();
    closeInventory();
    closeGearModal();

    switch (screen) {
      case 'dungeon-select':
        dungeonSelectScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.remove('bt-hidden');
        renderModeTabs();
        renderResumeBar();
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
      case 'daily-screen':
        if (dailyScreen) dailyScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        renderModeTabs();
        showDailyScreen();
        break;
      case 'spire-screen':
        if (spireScreen) spireScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        renderModeTabs();
        showSpireScreen();
        break;
      case 'titan-screen':
        if (titanScreen) titanScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        renderModeTabs();
        showTitanScreen();
        break;
      case 'faction-screen':
        if (factionScreen) factionScreen.classList.remove('bt-hidden');
        dungeonStatsEl.classList.add('bt-hidden');
        renderModeTabs();
        showFactionScreen();
        break;
    }
  }

  // ── Mode Tabs ──────────────────────────────────────
  function renderModeTabs() {
    if (!modeTabsEl) return;
    modeTabsEl.innerHTML = '';
    var tabs = [
      { id: 'dungeon', label: 'Dungeons', screen: 'dungeon-select' },
      { id: 'daily', label: 'Daily', screen: 'daily-screen' },
      { id: 'spire', label: 'Spire', screen: 'spire-screen' },
      { id: 'titan', label: 'Titan', screen: 'titan-screen' },
      { id: 'faction', label: 'Faction', screen: 'faction-screen' }
    ];
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        var btn = document.createElement('button');
        btn.className = 'bt-mode-tab';
        if (gameMode === tab.id) btn.classList.add('bt-mode-active');
        btn.textContent = tab.label;
        btn.addEventListener('click', function () {
          gameMode = tab.id;
          try { localStorage.setItem('arebooksgood-dungeon-tab', tab.id); } catch (e) {}
          showScreen(tab.screen);
        });
        modeTabsEl.appendChild(btn);
      })(tabs[i]);
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

        var allCleared = isDungeonCleared(dungeon.id, 'normal') && isDungeonCleared(dungeon.id, 'hard') && isDungeonCleared(dungeon.id, 'brutal') && isDungeonCleared(dungeon.id, 'nightmare');

        if (!isUnlocked) card.classList.add('bt-dungeon-locked');
        if (isCleared) card.classList.add('bt-dungeon-cleared');
        if (allCleared) card.classList.add('bt-dungeon-all-cleared');

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
          var diffs = ['normal', 'hard', 'brutal', 'nightmare'];
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

        // Enemy element type preview
        if (isUnlocked && enemyData) {
          var seenTypes = {};
          for (var wi = 0; wi < dungeon.enemies.length; wi++) {
            var wave = dungeon.enemies[wi];
            for (var ei = 0; ei < wave.length; ei++) {
              var ed = enemyData[wave[ei]];
              if (ed && ed.type) seenTypes[ed.type] = true;
            }
          }
          var typeKeys2 = Object.keys(seenTypes);
          if (typeKeys2.length > 0) {
            var typeBadges = document.createElement('div');
            typeBadges.className = 'bt-dungeon-type-badges';
            var typeOrder2 = ['fire', 'nature', 'tech', 'aqua', 'shadow', 'mystic'];
            for (var ti = 0; ti < typeOrder2.length; ti++) {
              if (seenTypes[typeOrder2[ti]]) {
                var pill = document.createElement('span');
                pill.className = 'bt-type-pill bt-type-' + typeOrder2[ti];
                pill.textContent = typeOrder2[ti].charAt(0).toUpperCase() + typeOrder2[ti].slice(1, 3);
                pill.title = typeOrder2[ti];
                typeBadges.appendChild(pill);
              }
            }
            card.appendChild(typeBadges);
          }
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
            creatureFilter = 'all';
            creatureLevelFilter = 'all';
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

  function isTitanDiffCleared(titanId, diff) {
    var b = titanState.bosses[titanId];
    return b && b.diffs && !!b.diffs[diff];
  }

  function isTitanDiffUnlocked(titanId, diff) {
    if (diff === 'normal') return true;
    if (diff === 'hard') return isTitanDiffCleared(titanId, 'normal');
    if (diff === 'brutal') return isTitanDiffCleared(titanId, 'hard');
    if (diff === 'nightmare') return isTitanDiffCleared(titanId, 'brutal');
    return false;
  }

  function renderDifficultyPicker() {
    var container = document.getElementById('bt-difficulty-picker');
    if (!container) return;
    container.innerHTML = '';
    var diffs = ['normal', 'hard', 'brutal', 'nightmare'];
    var labels = { normal: 'Normal', hard: 'Hard', brutal: 'Brutal', nightmare: 'Nightmare' };
    var dungeonId = selectedDungeon ? selectedDungeon.id : 0;
    var isTitan = gameMode === 'titan' && activeTitan;
    var titanId = isTitan ? activeTitan.titanId : null;
    for (var i = 0; i < diffs.length; i++) {
      (function (diff) {
        var btn = document.createElement('button');
        btn.className = 'bt-diff-btn bt-diff-' + diff;
        if (diff === selectedDifficulty) btn.classList.add('bt-diff-active');
        var unlocked = isTitan ? isTitanDiffUnlocked(titanId, diff) : isDifficultyUnlocked(dungeonId, diff);
        if (!unlocked) btn.classList.add('bt-diff-locked');
        btn.disabled = !unlocked;
        var labelSpan = document.createElement('span');
        labelSpan.textContent = labels[diff];
        btn.appendChild(labelSpan);
        var cleared = isTitan ? isTitanDiffCleared(titanId, diff) : isDungeonCleared(dungeonId, diff);
        if (cleared) {
          var check = document.createElement('span');
          check.className = 'bt-diff-check';
          check.textContent = ' *';
          btn.appendChild(check);
        }
        if (gearData && gearData.difficulty && gearData.difficulty[diff]) {
          var dd = gearData.difficulty[diff];
          var subtitle = document.createElement('span');
          subtitle.className = 'bt-diff-subtitle';
          subtitle.textContent = 'x' + (dd.hpMult || 1) + ' HP / x' + (dd.atkMult || 1) + ' ATK';
          btn.appendChild(subtitle);
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
          var scale = 64 / fw;
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
            var eqM = GearSystem.getEquipMap()[creatureId];
            var gearId = eqM ? eqM[slotKey] : null;
            var gear = gearId != null ? GearSystem.findById(gearId) : null;
            if (gear) {
              GearSystem.renderGearIcon(gSlot, gear, 20);
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

  function renderCreatureFilters() {
    var bar = document.getElementById('bt-creature-filters');
    if (!bar) return;
    bar.innerHTML = '';
    if (!petState || !petState.pets) return;

    var petIds = Object.keys(petState.pets);
    if (petIds.length < 2) return;

    // ── Type filter row ──
    var ownedTypes = {};
    var hasMaxLv = false;
    var hasLeveling = false;
    for (var i = 0; i < petIds.length; i++) {
      var c = catalog ? catalog.creatures[petIds[i]] : null;
      if (!c) continue;
      ownedTypes[c.type] = true;
      var pet = petState.pets[petIds[i]];
      var lvl = pet ? pet.level || 1 : 1;
      if (lvl >= (c.maxLevel || 1)) hasMaxLv = true;
      else hasLeveling = true;
    }
    var typeKeys = Object.keys(ownedTypes);

    // Type filter (only if 2+ types owned)
    if (typeKeys.length > 1) {
      var typeRow = document.createElement('div');
      typeRow.className = 'bt-filter-row';
      var filters = [{ key: 'all', label: 'All' }];
      var typeOrder = ['fire', 'nature', 'tech', 'aqua', 'shadow', 'mystic'];
      for (var t = 0; t < typeOrder.length; t++) {
        if (ownedTypes[typeOrder[t]]) {
          filters.push({ key: typeOrder[t], label: typeOrder[t].charAt(0).toUpperCase() + typeOrder[t].slice(1) });
        }
      }
      for (var fi = 0; fi < filters.length; fi++) {
        (function (f) {
          var btn = document.createElement('button');
          btn.className = 'bt-inv-filter-btn';
          if (creatureFilter === f.key) btn.classList.add('bt-inv-filter-active');
          if (f.key !== 'all') btn.classList.add('bt-type-' + f.key);
          btn.textContent = f.label;
          btn.addEventListener('click', function () {
            creatureFilter = f.key;
            renderCreaturePicker();
          });
          typeRow.appendChild(btn);
        })(filters[fi]);
      }
      bar.appendChild(typeRow);
    }

    // ── Level filter row (only if both max-level and leveling creatures exist) ──
    if (hasMaxLv && hasLeveling) {
      var lvlRow = document.createElement('div');
      lvlRow.className = 'bt-filter-row';
      var lvlFilters = [
        { key: 'all', label: 'Any Lv' },
        { key: 'max', label: 'Max Lv' },
        { key: 'leveling', label: 'Needs XP' }
      ];
      for (var li = 0; li < lvlFilters.length; li++) {
        (function (f) {
          var btn = document.createElement('button');
          btn.className = 'bt-inv-filter-btn';
          if (creatureLevelFilter === f.key) btn.classList.add('bt-inv-filter-active');
          btn.textContent = f.label;
          btn.addEventListener('click', function () {
            creatureLevelFilter = f.key;
            renderCreaturePicker();
          });
          lvlRow.appendChild(btn);
        })(lvlFilters[li]);
      }
      bar.appendChild(lvlRow);
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
    renderCreatureFilters();

    var petIds = Object.keys(petState.pets);
    // Sort: eligible creatures first (matching type lock), then by type order, then alphabetically
    var typeOrder = { fire: 0, nature: 1, tech: 2, aqua: 3, shadow: 4, mystic: 5 };
    var typeLock = selectedDungeon ? selectedDungeon.typeLock : null;
    petIds.sort(function (a, b) {
      var ca = catalog ? catalog.creatures[a] : null;
      var cb = catalog ? catalog.creatures[b] : null;
      if (!ca || !cb) return 0;
      // Eligible (matching type lock) creatures sort first
      if (typeLock) {
        var aOk = ca.type === typeLock ? 0 : 1;
        var bOk = cb.type === typeLock ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
      }
      var ta = typeOrder[ca.type] !== undefined ? typeOrder[ca.type] : 99;
      var tb = typeOrder[cb.type] !== undefined ? typeOrder[cb.type] : 99;
      if (ta !== tb) return ta - tb;
      return ca.name.localeCompare(cb.name);
    });
    for (var i = 0; i < petIds.length; i++) {
      (function (petId) {
        var pet = petState.pets[petId];
        var creature = catalog ? catalog.creatures[petId] : null;
        if (!creature) return;

        // Apply creature type filter
        if (creatureFilter !== 'all' && creature.type !== creatureFilter) return;

        // Apply creature level filter
        if (creatureLevelFilter !== 'all') {
          var petLvl = pet.level || 1;
          var maxLvl = creature.maxLevel || 1;
          if (creatureLevelFilter === 'max' && petLvl < maxLvl) return;
          if (creatureLevelFilter === 'leveling' && petLvl >= maxLvl) return;
        }

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
    currentTurnOrder = null;
    currentTurnIdx = 0;
    bannerText = null;
    bannerTimer = 0;
    countdownText = null;

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
      // Preload dungeon background tile
      var bgSrc = DUNGEON_BG[selectedDungeon.id];
      if (bgSrc) {
        var bgImg = new Image();
        bgImg.onload = function () {
          bgImage = bgImg;
          bgPattern = ctx.createPattern(bgImg, 'repeat');
          renderBattle();
        };
        bgImg.src = bgSrc;
      } else {
        bgImage = null;
        bgPattern = null;
      }
      // Fire-and-forget: preload UI assets in parallel
      preloadVFX(function () {
        showScreen('battle');
        sizeCanvas();
        clearLog();
        updateWaveHUD();
        updateSpeedBtn();

        logMessage('--- Entering ' + selectedDungeon.name + ' ---', 'bt-log-wave');
        logMessage('--- Wave 1/' + totalWaves + ' ---', 'bt-log-wave');

        // Titan mode: apply difficulty scaling and override enemies
        if (gameMode === 'titan' && activeTitan) {
          var diffCfg = gearData && gearData.difficulty ? gearData.difficulty[selectedDifficulty] : null;
          if (diffCfg) {
            var baseHp = 10000;
            var baseAtk = 35;
            activeTitan.maxHp = Math.floor(baseHp * (diffCfg.hpMult || 1));
            activeTitan.hp = activeTitan.maxHp;
            activeTitan.displayHp = activeTitan.maxHp;
            activeTitan.stats.hp = activeTitan.maxHp;
            activeTitan.stats.atk = Math.floor(baseAtk * (diffCfg.atkMult || 1));
          }
          titanAnimInit(activeTitan.titanId);
        }
        generateWaveEnemies(0, function () {
          // In titan mode, replace generated enemies with the titan
          if (gameMode === 'titan' && activeTitan) {
            enemies = [activeTitan];
          }
          startEnemyAnimLoop();
          renderBattle();
          // Countdown: 3... 2... 1... FIGHT!
          countdownText = '3';
          renderBattle();
          autoTimer = setTimeout(function () {
            if (!battleRunning) return;
            countdownText = '2';
            renderBattle();
            autoTimer = setTimeout(function () {
              if (!battleRunning) return;
              countdownText = '1';
              renderBattle();
              autoTimer = setTimeout(function () {
                if (!battleRunning) return;
                countdownText = 'FIGHT!';
                renderBattle();
                autoTimer = setTimeout(function () {
                  if (!battleRunning) return;
                  countdownText = null;
                  renderBattle();
                  saveRun();
                  autoTimer = setTimeout(runAutoBattle, 200);
                }, 500);
              }, 500);
            }, 500);
          }, 500);
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

    var inv = GearSystem.getInventory();
    var maxInv = gearData ? gearData.maxInventory || 50 : 50;
    if (countEl) countEl.textContent = inv.length + '/' + maxInv;
    if (titleEl) {
      titleEl.textContent = asEquipPicker ? 'Equip ' + (equipPickerSlot || '') : 'Inventory';
    }

    renderInventoryFilters();
    renderBulkSellBar(!asEquipPicker);

    var filtered = inv.filter(function (g) {
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

    var rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    filtered.sort(function (a, b) {
      var eqA = a.equippedBy ? 1 : 0;
      var eqB = b.equippedBy ? 1 : 0;
      if (eqA !== eqB) return eqA - eqB;
      return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
    });

    var currentEquipped = null;
    if (asEquipPicker && equipPickerCreature && equipPickerSlot) {
      var eqMap = GearSystem.getEquipMap()[equipPickerCreature];
      var curId = eqMap ? eqMap[equipPickerSlot] : null;
      if (curId != null) currentEquipped = GearSystem.findById(curId);
    }

    for (var i = 0; i < filtered.length; i++) {
      (function (gear) {
        var card = document.createElement('div');
        card.className = 'bt-gear-card bt-rarity-' + gear.rarity;
        if (gear.equippedBy) card.classList.add('bt-gear-equipped');
        var isCurrentEquipped = asEquipPicker && currentEquipped && gear.id === currentEquipped.id;
        if (isCurrentEquipped) card.classList.add('bt-gear-current');

        var iconEl = document.createElement('div');
        iconEl.className = 'bt-gear-icon';
        GearSystem.renderGearIcon(iconEl, gear);
        card.appendChild(iconEl);

        var nameEl = document.createElement('div');
        nameEl.className = 'bt-gear-card-name';
        nameEl.textContent = GearSystem.getDisplayName(gear);
        card.appendChild(nameEl);

        var statEl = document.createElement('div');
        statEl.className = 'bt-gear-card-stat';
        statEl.textContent = '+' + GearSystem.getEffectiveMain(gear) + ' ' + (gear.mainStat || '').toUpperCase();
        card.appendChild(statEl);

        if (asEquipPicker && !isCurrentEquipped) {
          var diff = GearSystem.calcDiff(gear, currentEquipped);
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

  function renderBulkSellBar(show) {
    var existing = document.getElementById('bt-bulk-sell-bar');
    if (existing) existing.remove();
    var inv = GearSystem.getInventory();
    if (!show || inv.length === 0) return;

    var filtersEl = document.getElementById('bt-inventory-filters');
    if (!filtersEl) return;

    var bar = document.createElement('div');
    bar.id = 'bt-bulk-sell-bar';
    bar.className = 'bt-bulk-sell-bar';

    var rarities = ['common', 'uncommon', 'rare', 'epic'];
    for (var r = 0; r < rarities.length; r++) {
      (function (rarity) {
        var items = inv.filter(function (g) { return g.rarity === rarity && !g.equippedBy && !(g.upgradeLevel > 0); });
        if (items.length === 0) return;
        var price = gearData ? gearData.sellPrices[rarity] || 5 : 5;
        var total = items.length * price;
        var label = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        var btn = document.createElement('button');
        btn.className = 'bt-btn bt-btn-small bt-btn-danger';
        btn.textContent = 'Sell ' + label + ' (' + items.length + ') +' + total + 'c';
        btn.addEventListener('click', function () {
          if (!confirm('Sell ' + items.length + ' ' + label + ' gear for ' + total + ' coins?')) return;
          GearSystem.bulkSell(function (g) { return g.rarity === rarity && !g.equippedBy && !(g.upgradeLevel > 0); });
          renderInventoryPanel(false);
        });
        bar.appendChild(btn);
      })(rarities[r]);
    }

    var unequipped = inv.filter(function (g) { return !g.equippedBy; });
    if (unequipped.length > 1) {
      var uTotal = 0;
      for (var i = 0; i < unequipped.length; i++) {
        uTotal += gearData ? gearData.sellPrices[unequipped[i].rarity] || 5 : 5;
      }
      var uBtn = document.createElement('button');
      uBtn.className = 'bt-btn bt-btn-small bt-btn-danger';
      uBtn.textContent = 'Sell Unequipped (' + unequipped.length + ') +' + uTotal + 'c';
      uBtn.addEventListener('click', function () {
        if (!confirm('Sell ALL ' + unequipped.length + ' unequipped gear for ' + uTotal + ' coins?')) return;
        GearSystem.bulkSell(function (g) { return !g.equippedBy; });
        renderInventoryPanel(false);
      });
      bar.appendChild(uBtn);
    }

    if (bar.children.length > 0) {
      filtersEl.parentNode.insertBefore(bar, filtersEl.nextSibling);
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

    var rollEl = document.getElementById('bt-gm-roll');
    if (rollEl) rollEl.classList.add('bt-hidden');

    var iconEl = document.getElementById('bt-gm-icon');
    if (iconEl) { iconEl.innerHTML = ''; GearSystem.renderGearIcon(iconEl, gear, 48); }

    var nameEl = document.getElementById('bt-gm-name');
    if (nameEl) {
      nameEl.textContent = GearSystem.getDisplayName(gear);
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
      var effectiveMain = GearSystem.getEffectiveMain(gear);
      var mainText = '+' + effectiveMain + ' ' + (gear.mainStat || '').toUpperCase();
      if (gear.upgradeBonusMain) mainText += ' (+' + gear.upgradeBonusMain + ' from upgrades)';
      if (gear.secondaryStat) {
        var effectiveSec = GearSystem.getEffectiveSecondary(gear);
        mainText += '  +' + effectiveSec + ' ' + gear.secondaryStat.toUpperCase();
        if (gear.upgradeBonusSec) mainText += ' (+' + gear.upgradeBonusSec + ')';
      }
      mainEl.textContent = mainText;
    }

    // Upgrade level display
    var tierLine = '';
    if (gear.upgradeLevel > 0) {
      var maxLvl = GearSystem.getMaxLevel(gear);
      tierLine = 'Lv ' + gear.upgradeLevel + '/' + maxLvl;
    }
    if (tierEl && tierLine) {
      tierEl.textContent += '  ' + tierLine;
    }

    var subsEl = document.getElementById('bt-gm-subs');
    if (subsEl) {
      subsEl.innerHTML = '';
      subsEl.style.opacity = '';
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
        var eMap = GearSystem.getEquipMap();
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
            var equippedCount = 0;
            if (gear.equippedBy) {
              var eq = eMap[gear.equippedBy];
              if (eq) {
                var slotArr = ['weapon', 'armor', 'accessory'];
                for (var sk = 0; sk < slotArr.length; sk++) {
                  var eqGear = eq[slotArr[sk]] != null ? GearSystem.findById(eq[slotArr[sk]]) : null;
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
      var maxLvlU = GearSystem.getMaxLevel(gear);
      var curLvl = gear.upgradeLevel || 0;
      if (curLvl >= maxLvlU) {
        upgradeBtn.textContent = 'MAX +' + curLvl;
        upgradeBtn.disabled = true;
        upgradeBtn.classList.remove('bt-hidden');
      } else {
        var cost = GearSystem.getUpgradeCost(gear);
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
    GearSystem.sellGear(gear);
    closeGearModal();
    if (inventoryOpen) renderInventoryPanel(!!equipPickerSlot);
  }

  // ── Equip / Unequip ────────────────────────────
  function tryEquipGear(gear, creatureId, slotKey) {
    if (!gear || !creatureId || !slotKey) return;
    var ok = GearSystem.tryEquip(gear, creatureId, slotKey, petState, catalog, getEffectiveLevel);
    if (!ok) {
      var reqLevel = gearData ? gearData.gearTierLevelReq[gear.tier] || 1 : 1;
      alert('This creature needs level ' + reqLevel + '+ to equip Tier ' + gear.tier + ' gear.');
      return;
    }
    closeInventory();
    renderTeamSlots();
  }

  function unequipGear(gear) {
    GearSystem.unequip(gear);
  }

  function upgradeGear(gear) {
    if (!gear) return;
    var result = GearSystem.upgrade(gear);
    if (!result) {
      if (!GearSystem.canUpgrade(gear)) {
        var maxLvl = GearSystem.getMaxLevel(gear);
        if ((gear.upgradeLevel || 0) >= maxLvl) return;
        alert('Not enough coins! Need ' + GearSystem.getUpgradeCost(gear) + '.');
      }
      return;
    }
    // Refresh modal then show roll result
    openGearModal(gear);
    showUpgradeRoll(gear, result);
    if (inventoryOpen) renderInventoryPanel(!!equipPickerSlot);
    renderTeamSlots();
  }

  function showUpgradeRoll(gear, result) {
    var rollEl = document.getElementById('bt-gm-roll');
    if (!rollEl) return;
    rollEl.classList.remove('bt-hidden');
    var cfg = gearData && gearData.upgrade;
    var mainMax = 1;
    if (cfg && cfg.mainStatBoostRange && cfg.mainStatBoostRange[gear.rarity]) {
      mainMax = cfg.mainStatBoostRange[gear.rarity][1];
    }
    var isHigh = result.mainRoll >= mainMax;
    var text = '+' + result.mainRoll + ' ' + (gear.mainStat || '').toUpperCase();
    if (result.secRoll > 0) {
      text += ', +' + result.secRoll + ' ' + (gear.secondaryStat || '').toUpperCase();
    }
    rollEl.textContent = text;
    rollEl.className = 'bt-gm-roll ' + (isHigh ? 'bt-roll-high' : 'bt-roll-low');
  }

  // ── Auto Gear ────────────────────────────────────
  function autoGear() {
    GearSystem.autoGear(teamSlots, petState, catalog, getEffectiveLevel);
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
      bgPattern = null;
      bgImage = null;
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
      skipWaveBtn.classList.add('bt-skip-active');
    });
  }

  if (retreatBtn) {
    retreatBtn.addEventListener('click', function () {
      if (!battleRunning) return;
      // Guard against stacking dialogs
      if (document.querySelector('.bt-retreat-overlay')) return;
      // Show confirmation overlay
      var overlay = document.createElement('div');
      overlay.className = 'bt-overlay bt-retreat-overlay';
      var inner = document.createElement('div');
      inner.className = 'bt-overlay-inner';
      var title = document.createElement('h3');
      title.className = 'bt-overlay-title bt-defeat-title';
      title.textContent = 'Retreat?';
      inner.appendChild(title);
      var desc = document.createElement('p');
      desc.style.marginBottom = '16px';
      desc.style.fontSize = '0.9em';
      desc.textContent = 'You will lose remaining wave progress.';
      inner.appendChild(desc);
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'bt-btn bt-btn-danger bt-btn-small';
      confirmBtn.textContent = 'Retreat';
      confirmBtn.addEventListener('click', function () {
        overlay.remove();
        wavesCleared = currentWave - 1;
        endDungeon(false);
      });
      inner.appendChild(confirmBtn);
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'bt-btn bt-btn-secondary bt-btn-small';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', function () { overlay.remove(); });
      inner.appendChild(cancelBtn);
      overlay.appendChild(inner);
      document.body.appendChild(overlay);
    });
  }

  if (resultsContinueBtn) {
    resultsContinueBtn.addEventListener('click', function () {
      cleanupCelebration();
      resultsOverlay.classList.add('bt-hidden');
      bgPattern = null;
      bgImage = null;
      // Return to the appropriate mode screen
      if (gameMode === 'faction') { showScreen('faction-screen'); }
      else if (gameMode === 'daily') { showScreen('daily-screen'); }
      else if (gameMode === 'spire') { showScreen('spire-screen'); }
      else if (gameMode === 'titan') { showScreen('titan-screen'); }
      else { showScreen('dungeon-select'); }
    });
  }

  // Rematch button (added dynamically next to Continue)
  var rematchBtn = document.createElement('button');
  rematchBtn.className = 'bt-btn bt-btn-secondary bt-rematch-btn';
  rematchBtn.textContent = 'Rematch';
  rematchBtn.addEventListener('click', function () {
    if (!selectedDungeon) return;
    cleanupCelebration();
    resultsOverlay.classList.add('bt-hidden');
    bgPattern = null;
    bgImage = null;
    showScreen('team-builder');
    renderTeamBuilder();
  });
  var resultsActions = resultsContinueBtn ? resultsContinueBtn.parentNode : null;
  if (resultsActions) resultsActions.appendChild(rematchBtn);

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

  // ── Daily Challenge Mode ──────────────────────────
  var DAILY_MODIFIERS = [
    { id: 'glass-cannon', name: 'Glass Cannon', desc: 'All damage dealt x2 (both sides)', apply: function (dmg) { return dmg * 2; } },
    { id: 'no-heal', name: 'No Healing', desc: 'Healing moves have no effect', blockHeal: true },
    { id: 'type-shuffle', name: 'Type Shuffle', desc: 'Enemy types are randomized', shuffleTypes: true },
    { id: 'speed-demon', name: 'Speed Demon', desc: 'All SPD doubled', spdMult: 2 },
    { id: 'armor-break', name: 'Armor Break', desc: 'All DEF halved', defMult: 0.5 },
    { id: 'crit-frenzy', name: 'Crit Frenzy', desc: 'Crit chance +25% for everyone', criBonus: 25 }
  ];

  var dailyState = { lastDate: null, completed: false, streak: 0, totalCompleted: 0 };

  function getDailyDate() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getDailySeed(dateStr) {
    var hash = 0;
    for (var i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  function loadDailyState() {
    try {
      var raw = localStorage.getItem('arebooksgood-daily');
      if (raw) {
        var s = JSON.parse(raw);
        dailyState.lastDate = s.lastDate || null;
        dailyState.completed = s.completed || false;
        dailyState.streak = s.streak || 0;
        dailyState.totalCompleted = s.totalCompleted || 0;
      }
    } catch (e) {}
    // Reset if new day
    var today = getDailyDate();
    if (dailyState.lastDate !== today) {
      // Check if yesterday was completed for streak
      if (dailyState.completed) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
        if (dailyState.lastDate !== yStr) dailyState.streak = 0;
      } else {
        dailyState.streak = 0;
      }
      dailyState.completed = false;
      dailyState.lastDate = today;
      saveDailyState();
    }
  }

  function saveDailyState() {
    try { localStorage.setItem('arebooksgood-daily', JSON.stringify(dailyState)); } catch (e) {}
  }

  function isDailyModActive(modId) {
    if (gameMode !== 'daily') return false;
    var today = getDailyDate();
    var seed = getDailySeed(today);
    var modIdx = seed % DAILY_MODIFIERS.length;
    return DAILY_MODIFIERS[modIdx].id === modId;
  }

  function getDailyStreakReward(streak) {
    if (streak >= 30) return { coins: 500, jb: 20 };
    if (streak >= 14) return { coins: 200, jb: 10 };
    if (streak >= 7) return { coins: 100, jb: 5 };
    if (streak >= 3) return { coins: 50, jb: 2 };
    return { coins: 0, jb: 0 };
  }

  function showDailyScreen() {
    if (!dailyScreen) return;
    loadDailyState();
    var today = getDailyDate();
    var seed = getDailySeed(today);
    var modIdx = seed % DAILY_MODIFIERS.length;
    var mod = DAILY_MODIFIERS[modIdx];
    var dungeonIdx = seed % DUNGEONS.length;
    var dungeon = DUNGEONS[dungeonIdx];

    dailyScreen.innerHTML = '<h2 class="bt-section-title">> daily challenge</h2>' +
      '<div class="bt-daily-card">' +
      '<div class="bt-daily-dungeon">' + dungeon.name + '</div>' +
      '<div class="bt-daily-modifier">' +
      '<strong>' + mod.name + '</strong><br><span style="opacity:0.7">' + mod.desc + '</span>' +
      '</div>' +
      '<div class="bt-daily-streak">Streak: ' + dailyState.streak + ' days</div>' +
      (dailyState.completed ?
        '<div class="bt-daily-done">Completed today!</div>' :
        '<button id="bt-daily-start" class="bt-btn">Start Challenge</button>') +
      '</div>';

    var startBtn = document.getElementById('bt-daily-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startDailyChallenge(dungeon);
      });
    }
  }

  function startDailyChallenge(dungeon) {
    gameMode = 'daily';
    selectedDungeon = dungeon;
    selectedDifficulty = 'hard';
    teamSlots = [null, null, null];
    creatureFilter = 'all';
    creatureLevelFilter = 'all';
    showScreen('team-builder');
  }

  // ── Spire / Endless Tower Mode ───────────────────
  var spireState = { bestFloor: 0, currentFloor: 0, inRun: false };

  function loadSpireState() {
    try {
      var raw = localStorage.getItem('arebooksgood-spire');
      if (raw) {
        var s = JSON.parse(raw);
        spireState.bestFloor = s.bestFloor || 0;
        spireState.currentFloor = s.currentFloor || 0;
        spireState.inRun = s.inRun || false;
      }
    } catch (e) {}
  }

  function saveSpireState() {
    try { localStorage.setItem('arebooksgood-spire', JSON.stringify(spireState)); } catch (e) {}
  }

  function showSpireScreen() {
    if (!spireScreen) return;
    loadSpireState();
    spireScreen.innerHTML = '<h2 class="bt-section-title">> the spire</h2>' +
      '<div class="bt-spire-info">' +
      '<div class="bt-spire-best">Best Floor: ' + spireState.bestFloor + '</div>' +
      '<p style="opacity:0.7;margin:8px 0">Climb an endless tower of increasingly powerful enemies. HP carries between floors — no healing between fights.</p>' +
      '<button id="bt-spire-start" class="bt-btn">Start Run</button>' +
      '</div>';

    var startBtn = document.getElementById('bt-spire-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startSpireRun();
      });
    }
  }

  function startSpireRun() {
    gameMode = 'spire';
    spireState.currentFloor = 0;
    spireState.inRun = true;
    saveSpireState();
    // Use first dungeon as template, will generate enemies dynamically
    selectedDungeon = { id: 0, name: 'The Spire', typeLock: null, waves: 1, stars: 1,
      enemies: [['slime-green', 'slime-green', 'slime-blue']] };
    selectedDifficulty = 'normal';
    teamSlots = [null, null, null];
    creatureFilter = 'all';
    creatureLevelFilter = 'all';
    showScreen('team-builder');
  }

  function spireNextFloor() {
    spireState.currentFloor++;
    if (spireState.currentFloor > spireState.bestFloor) {
      spireState.bestFloor = spireState.currentFloor;
    }
    saveSpireState();

    var floor = spireState.currentFloor;
    var scaleMult = 1 + 0.1 * floor;

    // Pick 3 random enemies, scaling with floor
    var allEnemyIds = enemyData ? Object.keys(enemyData) : ['slime-green'];
    var regularEnemies = allEnemyIds.filter(function (eid) {
      return enemyData[eid] && !enemyData[eid].isBoss;
    });
    var bossEnemies = allEnemyIds.filter(function (eid) {
      return enemyData[eid] && enemyData[eid].isBoss;
    });

    enemies = [];
    var isBossFloor = floor % 5 === 0;
    var pool = isBossFloor ? bossEnemies : regularEnemies;
    if (pool.length === 0) pool = regularEnemies.length > 0 ? regularEnemies : allEnemyIds;

    var loaded = 0;
    var needed = 3;
    for (var i = 0; i < 3; i++) {
      var eid = pool[Math.floor(Math.random() * pool.length)];
      var fighter = createEnemyFighter(eid, Math.min(5, 1 + Math.floor(floor / 5)), 'normal');
      if (fighter) {
        fighter.stats.hp = Math.floor(fighter.stats.hp * scaleMult);
        fighter.hp = fighter.stats.hp;
        fighter.maxHp = fighter.stats.hp;
        fighter.displayHp = fighter.stats.hp;
        fighter.stats.atk = Math.floor(fighter.stats.atk * scaleMult);
        fighter.stats.def = Math.floor(fighter.stats.def * scaleMult);
        enemies.push(fighter);
      }
      preloadEnemySprite(eid, function () {
        loaded++;
        if (loaded >= needed) {
          currentWave = 1;
          totalWaves = 1;
          wavesCleared = 0;
          logMessage('--- Spire Floor ' + floor + ' ---', 'bt-log-wave');
          updateWaveHUD();
          if (waveLabel) waveLabel.textContent = 'Floor ' + floor;
          renderBattle();
          autoTimer = setTimeout(runAutoBattle, 500);
        }
      });
    }
  }

  function endSpire() {
    spireState.inRun = false;
    saveSpireState();
    var xpReward = spireState.currentFloor * 5;
    var coinReward = spireState.currentFloor * 10;
    if (coinReward > 0 && typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(coinReward);
  }

  // ── World Boss / Titan Mode ──────────────────────
  var titanState = { bosses: {} };
  var activeTitan = null;

  function loadTitanState() {
    try {
      var raw = localStorage.getItem('arebooksgood-titan');
      if (raw) {
        var s = JSON.parse(raw);
        titanState.bosses = s.bosses || {};
        // Migrate old flat format
        if (!s.bosses && (s.totalDamage || s.kills)) {
          titanState.bosses._legacy = { damage: s.totalDamage || 0, kills: s.kills || 0 };
        }
      }
    } catch (e) {}
  }

  function getTitanBossStats(titanId) {
    return titanState.bosses[titanId] || { damage: 0, kills: 0 };
  }

  function saveTitanState() {
    try { localStorage.setItem('arebooksgood-titan', JSON.stringify(titanState)); } catch (e) {}
  }

  function showTitanScreen() {
    if (!titanScreen) return;
    loadTitanState();
    var titanIds = gearData && gearData.titanSprites ? Object.keys(gearData.titanSprites) : [];

    var html = '<h2 class="bt-section-title">> world boss</h2>' +
      '<div class="bt-titan-grid">';

    for (var i = 0; i < titanIds.length; i++) {
      var tid = titanIds[i];
      var tCfg = gearData.titanSprites[tid];
      var tName = (tCfg && tCfg.name) || tid.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var bStats = getTitanBossStats(tid);
      html += '<div class="bt-titan-card" data-titan="' + tid + '">' +
        '<div class="bt-titan-card-name">' + tName + '</div>' +
        '<div class="bt-titan-card-stats">Kills: ' + bStats.kills + ' &nbsp; Dmg: ' + bStats.damage + '</div>' +
        '<button class="bt-btn bt-titan-go" data-titan="' + tid + '">Challenge</button>' +
        '</div>';
    }

    html += '</div>';
    titanScreen.innerHTML = html;

    var btns = titanScreen.querySelectorAll('.bt-titan-go');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        startTitanMode(this.getAttribute('data-titan'));
      });
    }
  }

  function createTitanFighter(titanId) {
    var titanCfg = gearData && gearData.titanSprites ? gearData.titanSprites[titanId] : null;
    var titanName = (titanCfg && titanCfg.name) || titanId.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var types = ['fire', 'nature', 'aqua', 'shadow', 'mystic', 'tech'];
    var titanType = types[Math.abs(titanId.length) % types.length];
    return {
      id: 'titan-' + titanId, name: titanName, type: titanType, tier: 'legendary',
      level: 10,
      hp: 10000, maxHp: 10000, displayHp: 10000,
      stats: { hp: 10000, atk: 35, def: 20, spd: 6, cri: 8 },
      gearStats: { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 },
      moveset: getMovesetForEnemy(titanType), opacity: 1, offsetX: 0, offsetY: 0,
      enemyId: 'titan-' + titanId, isBoss: true, isTitan: true,
      titanId: titanId, titanPhase: 0,
      isPlayer: false, isEnemy: true,
      status: { burn: 0, curse: 0, stun: false, slow: 0, dodge: false, atkUp: 0 },
      battleStats: { damageDealt: 0, damageTaken: 0, kills: 0 }
    };
  }

  function startTitanMode(titanId) {
    gameMode = 'titan';
    loadTitanState();

    activeTitan = createTitanFighter(titanId);
    selectedDungeon = { id: 0, name: activeTitan.name, typeLock: null, waves: 1, stars: 5,
      enemies: [['slime-green']] }; // placeholder, titan replaces enemies
    selectedDifficulty = 'normal';
    teamSlots = [null, null, null];
    creatureFilter = 'all';
    creatureLevelFilter = 'all';
    showScreen('team-builder');
  }

  function checkTitanPhaseTransition(titan) {
    if (!titan || !titan.isTitan) return;
    var pct = titan.hp / titan.maxHp;
    var newPhase = 0;
    if (pct <= 0.25) newPhase = 3;
    else if (pct <= 0.50) newPhase = 2;
    else if (pct <= 0.75) newPhase = 1;

    if (newPhase > titan.titanPhase) {
      titan.titanPhase = newPhase;
      // Buff titan stats on phase transition
      titan.stats.atk = Math.floor(titan.stats.atk * 1.15);
      var phaseNames = ['', 'Enraged!', 'Furious!', 'Berserk!'];
      logMessage(titan.name + ' enters phase: ' + phaseNames[newPhase], 'bt-log-status');
      titanAnimPhaseTransition(phaseNames[newPhase]);
    }
  }

  function endTitanAttempt(titan) {
    if (!titan) return;
    var tid = titan.titanId;
    if (!titanState.bosses[tid]) titanState.bosses[tid] = { damage: 0, kills: 0, diffs: {} };
    if (!titanState.bosses[tid].diffs) titanState.bosses[tid].diffs = {};
    var damageDealt = titan.maxHp - Math.max(0, titan.hp);
    titanState.bosses[tid].damage += damageDealt;
    if (titan.hp <= 0) {
      titanState.bosses[tid].kills++;
      titanState.bosses[tid].diffs[selectedDifficulty] = true;
    }
    saveTitanState();
    activeTitan = null;
  }

  // ── TitanAnimator ────────────────────────────────
  var titanAnim = {
    titanId: null, sheet: null, config: null,
    currentAnim: 'idle', frame: 0, timer: 0, loop: true,
    chainAttack: false, phaseText: null, phaseTimer: 0
  };
  var titanSheetImg = null;

  function titanAnimInit(titanId) {
    titanAnim.titanId = titanId;
    titanAnim.frame = 0;
    titanAnim.timer = 0;
    titanAnim.currentAnim = 'idle';
    titanAnim.loop = true;
    titanAnim.chainAttack = false;
    titanAnim.phaseText = null;
    titanAnim.phaseTimer = 0;
    var cfg = gearData && gearData.titanSprites ? gearData.titanSprites[titanId] : null;
    titanAnim.config = cfg;
    if (cfg && cfg.sheet) {
      titanAnim.sheet = cfg.sheet;
      var img = new Image();
      img.onload = function () { titanSheetImg = img; };
      img.src = cfg.sheet;
    }
  }

  function titanAnimSetAnim(name) {
    if (!titanAnim.config || !titanAnim.config.anims[name]) return;
    titanAnim.currentAnim = name;
    titanAnim.frame = 0;
    titanAnim.timer = 0;
    titanAnim.loop = (name === 'idle' || name === 'walk');
  }

  function titanAnimUpdate(dt) {
    if (!titanAnim.config) return;
    var anim = titanAnim.config.anims[titanAnim.currentAnim];
    if (!anim) return;
    titanAnim.timer += dt;
    var speed = anim.speed || 150;
    if (titanAnim.timer >= speed) {
      titanAnim.timer -= speed;
      titanAnim.frame++;
      if (titanAnim.frame >= anim.frames) {
        if (titanAnim.currentAnim === 'walk' && titanAnim.chainAttack) {
          // Walk finished during lunge — chain into attack
          titanAnim.chainAttack = false;
          titanAnimSetAnim('attack');
        } else if (titanAnim.loop) {
          titanAnim.frame = 0;
        } else {
          titanAnim.frame = anim.frames - 1;
          if (titanAnim.currentAnim !== 'death') titanAnimSetAnim('idle');
        }
      }
    }
    if (titanAnim.phaseTimer > 0) titanAnim.phaseTimer--;
  }

  function titanAnimDraw(fighter, x, y, size) {
    if (!titanSheetImg || !titanAnim.config) {
      drawFallbackCircle(fighter, x, y, size);
      return;
    }
    var cfg = titanAnim.config;
    var anim = cfg.anims[titanAnim.currentAnim];
    if (!anim) { drawFallbackCircle(fighter, x, y, size); return; }
    var fw = cfg.frameWidth;
    var fh = cfg.frameHeight;
    var row = anim.row || 0;
    var frame = titanAnim.frame;
    // Calculate columns from sheet or config
    var cols = cfg.cols || Math.floor(titanSheetImg.width / fw);
    var sx = (frame % cols) * fw;
    var sy = (row + Math.floor(frame / cols)) * fh;
    var aspect = fw / fh;
    var drawW = size * Math.min(2.0, aspect);
    var drawH = drawW / aspect;
    var drawX = x + (size - drawW) / 2;
    var drawY = y + (size - drawH);
    ctx.save();
    ctx.globalAlpha = fighter.opacity;
    ctx.imageSmoothingEnabled = false;
    if (cfg.flip) {
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(titanSheetImg, sx, sy, fw, fh, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(titanSheetImg, sx, sy, fw, fh, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }

  function titanAnimPhaseTransition(phaseDesc) {
    titanAnim.phaseText = phaseDesc;
    titanAnim.phaseTimer = 60;
    // Trigger CSS shake
    var wrap = document.querySelector('.bt-canvas-wrap');
    if (wrap) {
      wrap.classList.add('bt-phase-shake');
      setTimeout(function () { wrap.classList.remove('bt-phase-shake'); }, 500);
    }
  }

  function titanAnimDrawPhaseText() {
    if (!titanAnim.phaseText || titanAnim.phaseTimer <= 0) return;
    var s = uiScale();
    var alpha = Math.min(1, titanAnim.phaseTimer / 15);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + Math.round(24 * s) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = Math.round(4 * s);
    ctx.strokeText(titanAnim.phaseText, CANVAS_W / 2, CANVAS_H / 2);
    ctx.fillStyle = '#ff4444';
    ctx.fillText(titanAnim.phaseText, CANVAS_W / 2, CANVAS_H / 2);
    ctx.restore();
  }

  // ── Faction Wars Mode ────────────────────────────
  var FACTION_CHALLENGES = [
    { id: 'fire-trial', name: 'Trial of Flame', type: 'fire', desc: 'Fire-type creatures only',
      enemies: [['slime-pink','myconid-red','slime-pink'],['myconid-red','slime-pink','myconid-red'],['golem-orange','myconid-red','slime-pink'],['slime-pink-big','golem-orange','myconid-red']] },
    { id: 'nature-trial', name: 'Trial of Growth', type: 'nature', desc: 'Nature-type creatures only',
      enemies: [['myconid-green','sprout-blue','sprout-pink'],['mushroom-warrior','forest-flyer','myconid-green'],['forest-flyer','mushroom-warrior','myconid-green'],['venom-bloom','mushroom-warrior','forest-flyer']] },
    { id: 'aqua-trial', name: 'Trial of Tides', type: 'aqua', desc: 'Aqua-type creatures only',
      enemies: [['slime-blue','slime-light-blue','myconid-blue'],['golem-blue','slime-blue','myconid-blue'],['golem-blue','golem-blue','myconid-blue'],['frogger-boss','golem-blue','slime-blue']] },
    { id: 'shadow-trial', name: 'Trial of Shadows', type: 'shadow', desc: 'Shadow-type creatures only',
      enemies: [['slime-black','sprout-purple','myconid-purple'],['dark-bat','spike','slime-black'],['dark-bat','spike','myconid-purple'],['skeleton-knight','dark-bat','spike']] },
    { id: 'tech-trial', name: 'Trial of Steel', type: 'tech', desc: 'Tech-type creatures only',
      enemies: [['slime-golden','goblin-spear','goblin-archer'],['goblin-bomb','goblin-spear','slime-golden'],['fantasy-goblin','goblin-bomb','goblin-archer'],['iron-golem','fantasy-goblin','goblin-bomb']] },
    { id: 'mystic-trial', name: 'Trial of Stars', type: 'mystic', desc: 'Mystic-type creatures only',
      enemies: [['myconid-pink','slime-purple','myconid-pink'],['slime-purple','myconid-pink','slime-purple'],['mimic','myconid-pink','slime-purple'],['samurai-boss','mimic','myconid-pink']] }
  ];

  var factionState = { marks: 0, completed: {}, weekKey: null };

  function getFactionWeekKey() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    var weekNum = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return now.getFullYear() + '-W' + weekNum;
  }

  function getActiveFactions() {
    var weekKey = getFactionWeekKey();
    var seed = getDailySeed(weekKey);
    var indices = [];
    var available = [];
    for (var i = 0; i < FACTION_CHALLENGES.length; i++) available.push(i);
    // Pick 3 from 6
    for (var j = 0; j < 3 && available.length > 0; j++) {
      var pick = (seed + j * 17) % available.length;
      indices.push(available[pick]);
      available.splice(pick, 1);
    }
    return indices;
  }

  function loadFactionState() {
    try {
      var raw = localStorage.getItem('arebooksgood-faction');
      if (raw) {
        var s = JSON.parse(raw);
        factionState.marks = s.marks || 0;
        factionState.completed = s.completed || {};
        factionState.weekKey = s.weekKey || null;
      }
    } catch (e) {}
    // Reset if new week
    var currentWeek = getFactionWeekKey();
    if (factionState.weekKey !== currentWeek) {
      factionState.completed = {};
      factionState.weekKey = currentWeek;
      saveFactionState();
    }
  }

  function saveFactionState() {
    try { localStorage.setItem('arebooksgood-faction', JSON.stringify(factionState)); } catch (e) {}
  }

  function showFactionScreen() {
    if (!factionScreen) return;
    loadFactionState();
    var activeIndices = getActiveFactions();

    var html = '<h2 class="bt-section-title">> faction wars</h2>' +
      '<div class="bt-faction-marks">Marks: ' + factionState.marks + '</div>' +
      '<div class="bt-faction-grid">';

    for (var i = 0; i < FACTION_CHALLENGES.length; i++) {
      var fc = FACTION_CHALLENGES[i];
      var isActive = activeIndices.indexOf(i) !== -1;
      var diffs = ['normal', 'hard', 'brutal', 'nightmare'];
      var completedDiffs = factionState.completed[fc.id] || {};

      html += '<div class="bt-faction-card' + (isActive ? '' : ' bt-faction-locked') + ' bt-type-border-' + fc.type + '">' +
        '<div class="bt-faction-card-name">' + fc.name + '</div>' +
        '<div class="bt-faction-card-desc">' + fc.desc + '</div>';

      if (isActive) {
        html += '<div class="bt-diff-badges">';
        for (var di = 0; di < diffs.length; di++) {
          var cleared = completedDiffs[diffs[di]];
          html += '<span class="bt-diff-badge bt-diff-' + diffs[di] + (cleared ? ' bt-diff-cleared' : '') + '">' +
            diffs[di].charAt(0).toUpperCase() + '</span>';
        }
        html += '</div>';
        html += '<button class="bt-btn bt-btn-small bt-faction-start" data-idx="' + i + '">Fight</button>';
      } else {
        html += '<div class="bt-faction-locked-label">Not active this week</div>';
      }

      html += '</div>';
    }

    html += '</div>';
    factionScreen.innerHTML = html;

    // Bind fight buttons
    var fightBtns = factionScreen.querySelectorAll('.bt-faction-start');
    for (var b = 0; b < fightBtns.length; b++) {
      fightBtns[b].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        startFactionChallenge(idx);
      });
    }
  }

  function startFactionChallenge(challengeIdx) {
    var fc = FACTION_CHALLENGES[challengeIdx];
    if (!fc) return;
    gameMode = 'faction';
    selectedDungeon = {
      id: 0, name: fc.name, typeLock: fc.type,
      waves: fc.enemies.length, stars: 3,
      enemies: fc.enemies,
      factionId: fc.id
    };
    selectedDifficulty = 'normal';
    teamSlots = [null, null, null];
    creatureFilter = 'all';
    creatureLevelFilter = 'all';
    showScreen('team-builder');
  }

  // ── Init ──────────────────────────────────────────
  loadStats();
  loadDungeonProgress();
  loadDailyState();
  loadSpireState();
  loadTitanState();
  loadFactionState();
  GearSystem.loadInventory();
  GearSystem.loadEquipMap();
  renderStats();

  loadData(function () {
    GearSystem.init(gearData);
    loadPetState();
    preloadGearSheets(function () {
      var savedTab = null;
      try { savedTab = localStorage.getItem('arebooksgood-dungeon-tab'); } catch (e) {}
      var tabScreenMap = { dungeon: 'dungeon-select', daily: 'daily-screen', spire: 'spire-screen', titan: 'titan-screen', faction: 'faction-screen' };
      if (savedTab && tabScreenMap[savedTab]) {
        gameMode = savedTab;
        showScreen(tabScreenMap[savedTab]);
      } else {
        showScreen('dungeon-select');
      }
    });
  });


})();
