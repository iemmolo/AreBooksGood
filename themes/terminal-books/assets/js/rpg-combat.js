(function () {
  'use strict';

  // ══════════════════════════════════════════════════
  // ── RPG COMBAT ENGINE ─────────────────────────────
  // ══════════════════════════════════════════════════

  // ── Constants ──────────────────────────────────────
  var COMBAT_STORAGE_SUFFIX = '-combat';
  var COMBAT_VERSION = 1;
  var CANVAS_W = 700, CANVAS_H = 320;
  var TURN_TIMEOUT = 60000; // 60s auto-timeout for manual turns
  var BETWEEN_WAVE_DELAY = 2000;
  var WAVE_HEAL_PCT = 0.20;
  var ANIM_TICK = 50;

  // Evolution tiers: array of { cap, cost } per tier. Index 0 = starting cap (no cost).
  var EVOLUTION_TIERS = {
    common:    [{ cap: 30 }, { cap: 50, stoneCost: 1, gpCost: 500 }],
    rare:      [{ cap: 25 }, { cap: 50, stoneCost: 1, gpCost: 1500 }, { cap: 75, stoneCost: 2, gpCost: 3000 }],
    legendary: [{ cap: 50 }, { cap: 75, stoneCost: 2, gpCost: 5000 }]
  };

  // Difficulty multipliers
  var DIFFICULTY_MULTS = {
    normal: { stats: 1.0, rewards: 1.0, label: 'Normal' },
    hard:   { stats: 1.5, rewards: 1.5, label: 'Hard' },
    brutal: { stats: 2.0, rewards: 2.0, label: 'Brutal' }
  };

  // Type effectiveness chart
  // fire > nature > tech > aqua > fire (cycle), shadow <-> mystic (mutual)
  var TYPE_CHART = {
    fire:   { nature: 1.5, aqua: 0.75, fire: 1, tech: 1, shadow: 1, mystic: 1 },
    nature: { tech: 1.5, fire: 0.75, nature: 1, aqua: 1, shadow: 1, mystic: 1 },
    tech:   { aqua: 1.5, nature: 0.75, tech: 1, fire: 1, shadow: 1, mystic: 1 },
    aqua:   { fire: 1.5, tech: 0.75, aqua: 1, nature: 1, shadow: 1, mystic: 1 },
    shadow: { mystic: 1.5, shadow: 1, fire: 1, nature: 1, tech: 1, aqua: 1 },
    mystic: { shadow: 1.5, mystic: 1, fire: 1, nature: 1, tech: 1, aqua: 1 },
    neutral:{ fire: 1, nature: 1, tech: 1, aqua: 1, shadow: 1, mystic: 1, neutral: 1 }
  };

  var STATUS_DURATIONS = {
    burn: 3, poison: 3, bleed: 3, curse: 3, regen: 3,
    stun: 1, slow: 2, atkUp: 3, defUp: 3, atkDown: 3, defDown: 3,
    dodge: 1, taunt: 2, shield: 0, reflect: 0
  };

  // Pet type combat passives (Phase 6-2)
  var COMBAT_PASSIVES = {
    fire:   { name: 'Ignite',       desc: '5% chance to burn a random enemy each round', chance: 0.05 },
    aqua:   { name: 'Tidal Mend',   desc: 'Heal 3% HP at round end if below 50%', threshold: 0.5, heal: 0.03 },
    nature: { name: 'Thorns',       desc: 'Attackers take 8% reflected damage', reflect: 0.08 },
    tech:   { name: 'Overclock',    desc: '10% chance to act twice', chance: 0.10 },
    shadow: { name: 'Life Steal',   desc: 'Heal 15% of damage dealt', steal: 0.15 },
    mystic: { name: 'Mystic Ward',  desc: 'First hit each wave reduced 30%', reduction: 0.30 }
  };

  // Team synergy bonuses (Phase 6-5)
  var SYNERGY_THRESHOLDS = {
    pair:     { atk: 0.10 },                          // 2 same type
    triple:   { atk: 0.15, def: 0.10 },               // 3 same type
    diverse:  { atk: 0.05, def: 0.05, spd: 0.05 }    // all different types
  };

  // Combat consumable items (Phase 7-5)
  var COMBAT_CONSUMABLES = {
    'Health Potion': { name: 'Health Potion', desc: 'Heal 30% of max HP', target: 'self', color: '#ff4444' },
    'Antidote':      { name: 'Antidote', desc: 'Cure poison, burn, bleed', target: 'self', color: '#44cc44' },
    'Revive Potion': { name: 'Revive Potion', desc: 'Revive fainted ally at 20% HP', target: 'ally', color: '#ffcc44' },
    'Bomb':          { name: 'Bomb', desc: 'Deal flat damage to all enemies', target: 'aoe', color: '#cc6644' }
  };

  // ── State ──────────────────────────────────────────
  var canvas = null;
  var ctx = null;
  var container = null;
  var moveData = null;
  var dungeonData = null;
  var enemyData = null;
  var petCatalog = null;
  var petSpriteData = null;
  var specData = null; // rpg-spec-trees.json

  var battleState = null; // active battle state or null
  var animFrame = null;
  var turnTimer = null;
  var floatingTexts = [];
  var activeVfx = [];
  var preloadedImages = {};
  var bgCache = {}; // theme -> Image
  var vfxImage = null; // battle_vfx.png sprite sheet
  var speedMult = 1; // 1x normal, 2x fast — persisted in combat save (8-5)

  // VFX sprite sheet: 7 cols x 22 rows, 48x48 cells (336x1056)
  var VFX_CELL = 48;
  var VFX_COLS = 7;
  // Maps move type → { row, frames, scale } in battle_vfx.png
  var VFX_MAP = {
    fire:    { row: 12, frames: 6, scale: 1.6 },
    aqua:    { row: 15, frames: 5, scale: 1.4 },
    nature:  { row: 11, frames: 6, scale: 1.4 },
    tech:    { row: 19, frames: 5, scale: 1.5 },
    shadow:  { row: 21, frames: 5, scale: 1.3 },
    mystic:  { row: 16, frames: 5, scale: 1.5 },
    neutral: { row: 2,  frames: 5, scale: 1.4 },
    heal:    { row: 18, frames: 5, scale: 1.3 },
    buff:    { row: 7,  frames: 6, scale: 1.3 }
  };

  // ── Helpers ────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function randFloat(lo, hi) { return lo + Math.random() * (hi - lo); }

  function randInt(lo, hi) { return Math.floor(randFloat(lo, hi + 1)); }

  function hasPriorityReady(fighter) {
    if (!moveData) return false;
    for (var i = 0; i < fighter.moves.length; i++) {
      var m = moveData[fighter.moves[i]];
      if (m && m.priority && !(fighter.cooldowns[fighter.moves[i]] > 0)) return true;
    }
    return false;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(0, i);
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ── Data Loading ───────────────────────────────────
  function loadData() {
    if (moveData && dungeonData) return;
    try {
      var xhr1 = new XMLHttpRequest();
      xhr1.open('GET', '/data/rpg-moves.json', false);
      xhr1.send();
      if (xhr1.status === 200) moveData = JSON.parse(xhr1.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load moves', e); }
    try {
      var xhr2 = new XMLHttpRequest();
      xhr2.open('GET', '/data/rpg-dungeons.json', false);
      xhr2.send();
      if (xhr2.status === 200) dungeonData = JSON.parse(xhr2.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load dungeons', e); }
    try {
      var xhr3 = new XMLHttpRequest();
      xhr3.open('GET', '/data/dungeon-enemies.json', false);
      xhr3.send();
      if (xhr3.status === 200) enemyData = JSON.parse(xhr3.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load enemies', e); }
    try {
      var xhr4 = new XMLHttpRequest();
      xhr4.open('GET', '/data/petcatalog.json', false);
      xhr4.send();
      if (xhr4.status === 200) petCatalog = JSON.parse(xhr4.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load petcatalog', e); }
    try {
      var xhr5 = new XMLHttpRequest();
      xhr5.open('GET', '/data/petsprites.json', false);
      xhr5.send();
      if (xhr5.status === 200) petSpriteData = JSON.parse(xhr5.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load petsprites', e); }
    try {
      var xhr6 = new XMLHttpRequest();
      xhr6.open('GET', '/data/rpg-spec-trees.json', false);
      xhr6.send();
      if (xhr6.status === 200) specData = JSON.parse(xhr6.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load spec trees', e); }
    // Preload VFX sprite sheet (async, non-blocking)
    if (!vfxImage) {
      vfxImage = new Image();
      vfxImage.src = '/images/pets/battle_vfx.png';
    }
  }

  // ── Storage (per-slot) ─────────────────────────────
  function getSlotKey() {
    var slotKey = window.__RPG_COMBAT_SLOT_KEY;
    if (slotKey) return slotKey;
    // Derive from skills storage key
    var skillsKey = window.__RPG_STORAGE_KEY;
    if (skillsKey) return skillsKey.replace('-skills', COMBAT_STORAGE_SUFFIX);
    return null;
  }

  function loadCombatState() {
    var key = getSlotKey();
    if (!key) return getDefaultCombatState();
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved && saved.version === COMBAT_VERSION) return saved;
    } catch (e) {}
    return getDefaultCombatState();
  }

  function saveCombatState(state) {
    var key = getSlotKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }

  function getDefaultCombatState() {
    return {
      version: COMBAT_VERSION,
      dungeonProgress: { unlocked: ['rpg-1'], difficulties: {} },
      stats: { raids: 0, clears: 0, totalKills: 0 },
      arenaStats: { fights: 0, wins: 0, bestStreak: 0, currentStreak: 0, milestones: {} },
      stones: { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 },
      bestiary: {} // enemyId -> { seen: true, defeated: N }
    };
  }

  // ── Stat Calculation ───────────────────────────────
  var RPG_PET_BASE_STATS = {
    common:    { hp: 80,  atk: 12, def: 8,  spd: 10, cri: 5 },
    rare:      { hp: 100, atk: 15, def: 10, spd: 12, cri: 7 },
    legendary: { hp: 130, atk: 20, def: 14, spd: 15, cri: 10 }
  };

  var RPG_TYPE_LEANINGS = {
    fire: 'atk', aqua: 'def', nature: 'hp',
    tech: 'spd', shadow: 'cri', mystic: null
  };

  function calcGrowth(level) {
    // Diminishing growth: 8% per level 1-30, 4% per level 31-60, 2% per level 61-99
    return 1 + 0.08 * Math.min(level - 1, 30)
             + 0.04 * Math.max(0, Math.min(level - 31, 30))
             + 0.02 * Math.max(0, level - 61);
  }

  function getSpecBonuses(petId) {
    // Returns cumulative stat multiplier bonuses from spec + sub-spec
    var bonuses = {};
    if (!specData || !specData.paths) return bonuses;
    var pet = null;
    if (window.__RPG_GET_PET_STATE) {
      var rpgPets = window.__RPG_GET_PET_STATE();
      if (rpgPets) pet = rpgPets.owned[petId];
    }
    if (!pet || !pet.spec) return bonuses;
    var path = specData.paths[pet.spec];
    if (!path) return bonuses;
    // Add path bonuses
    if (path.bonuses) {
      for (var k in path.bonuses) bonuses[k] = (bonuses[k] || 0) + path.bonuses[k];
    }
    // Add sub-spec bonuses
    if (pet.subSpec && path.subSpecs && path.subSpecs[pet.subSpec]) {
      var sub = path.subSpecs[pet.subSpec];
      if (sub.bonuses) {
        for (var k in sub.bonuses) bonuses[k] = (bonuses[k] || 0) + sub.bonuses[k];
      }
    }
    return bonuses;
  }

  function petHasSpecGate(petId, gate) {
    // Check if pet's spec or sub-spec satisfies a specRequired gate
    if (!gate) return true;
    if (!specData || !specData.paths) return false;
    var pet = null;
    if (window.__RPG_GET_PET_STATE) {
      var rpgPets = window.__RPG_GET_PET_STATE();
      if (rpgPets) pet = rpgPets.owned[petId];
    }
    if (!pet || !pet.spec) return false;
    var path = specData.paths[pet.spec];
    if (!path) return false;
    // Check path gate
    if (path.specGate === gate) return true;
    // Check sub-spec gate
    if (pet.subSpec && path.subSpecs && path.subSpecs[pet.subSpec]) {
      if (path.subSpecs[pet.subSpec].specGate === gate) return true;
    }
    return false;
  }

  function getPetCombatStats(petId, level) {
    if (!petCatalog || !petCatalog.creatures[petId]) return { hp: 1, atk: 1, def: 1, spd: 1, cri: 1 };
    var c = petCatalog.creatures[petId];
    var base = RPG_PET_BASE_STATS[c.tier] || RPG_PET_BASE_STATS.common;
    var leaning = RPG_TYPE_LEANINGS[c.type];
    var growth = calcGrowth(level);
    var specBonus = getSpecBonuses(petId);
    var stats = {};
    var keys = ['hp', 'atk', 'def', 'spd', 'cri'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = base[k] * growth;
      if (leaning === k) val *= 1.15;
      if (specBonus[k]) val *= (1 + specBonus[k]);
      stats[k] = Math.floor(val);
    }
    return stats;
  }

  function getEnemyCombatStats(enemyId, dungeonStars) {
    if (!enemyData || !enemyData[enemyId]) return { hp: 50, atk: 10, def: 5, spd: 7, cri: 3, type: 'neutral' };
    var e = enemyData[enemyId];
    // Scale enemies by dungeon star rating (1-4)
    var mult = 1 + (dungeonStars - 1) * 0.3;
    return {
      hp:  Math.floor(e.hpBase * mult),
      atk: Math.floor(e.atkBase * mult),
      def: Math.floor(e.defBase * mult),
      spd: Math.floor(e.spdBase * mult),
      cri: Math.floor(e.criBase * mult),
      type: e.type || 'neutral'
    };
  }

  // ── Move Assignment ────────────────────────────────
  function getMovesForPet(petId, level) {
    if (!petCatalog || !moveData) return ['scratch', 'tackle'];
    var c = petCatalog.creatures[petId];
    if (!c) return ['scratch', 'tackle'];
    var petType = c.type;
    var learned = [];
    for (var mid in moveData) {
      var m = moveData[mid];
      if (m.learnLevel > level) continue;
      if (m.specRequired && !petHasSpecGate(petId, m.specRequired)) continue;
      if (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(petType) >= 0)) {
        learned.push(mid);
      }
    }
    // Sort by power descending, then by learn level
    learned.sort(function (a, b) {
      var ma = moveData[a], mb = moveData[b];
      if ((mb.power || 0) !== (ma.power || 0)) return (mb.power || 0) - (ma.power || 0);
      return mb.learnLevel - ma.learnLevel;
    });
    // Equip top 4
    return learned.slice(0, 4);
  }

  // ── Persistent Move Learning ──────────────────────
  function checkNewMovesLearned(petId, oldLevel, newLevel) {
    if (!petCatalog || !moveData) return [];
    var creature = petCatalog.creatures[petId];
    if (!creature) return [];
    var petType = creature.type;

    // Get rpgPets state
    var rpgPets = null;
    if (window.__RPG_GET_PET_STATE) rpgPets = window.__RPG_GET_PET_STATE();
    if (!rpgPets || !rpgPets.owned[petId]) return [];
    var pet = rpgPets.owned[petId];

    // Initialize learnedMoves if needed — backfill all moves the pet should know
    if (!pet.learnedMoves) {
      pet.learnedMoves = [];
      for (var mid in moveData) {
        var m = moveData[mid];
        if (m.specRequired && !petHasSpecGate(petId, m.specRequired)) continue;
        if (m.learnLevel <= oldLevel && (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(petType) >= 0))) {
          pet.learnedMoves.push(mid);
        }
      }
    }
    if (!pet.equippedMoves) {
      // Auto-equip top 4 by power from learned set
      pet.equippedMoves = getMovesForPet(petId, oldLevel);
    }

    // Find newly learned moves (between oldLevel and newLevel)
    var newlyLearned = [];
    for (var mid in moveData) {
      var m = moveData[mid];
      if (m.specRequired && !petHasSpecGate(petId, m.specRequired)) continue;
      if (m.learnLevel > oldLevel && m.learnLevel <= newLevel) {
        if (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(petType) >= 0)) {
          if (pet.learnedMoves.indexOf(mid) < 0) {
            pet.learnedMoves.push(mid);
            newlyLearned.push({ id: mid, name: m.name });
            // Auto-equip if fewer than 4 equipped
            if (pet.equippedMoves.length < 4) {
              pet.equippedMoves.push(mid);
            }
          }
        }
      }
    }

    // Save state after learning moves
    if (newlyLearned.length > 0 && window.__RPG_SAVE_PET_STATE) {
      window.__RPG_SAVE_PET_STATE(rpgPets);
    }

    return newlyLearned;
  }

  // Initialize learnedMoves/equippedMoves for a pet that hasn't been initialized yet
  function initPetMoves(petId, level) {
    if (!petCatalog || !moveData) return null;
    var creature = petCatalog.creatures[petId];
    if (!creature) return null;
    var petType = creature.type;

    var rpgPets = null;
    if (window.__RPG_GET_PET_STATE) rpgPets = window.__RPG_GET_PET_STATE();
    if (!rpgPets || !rpgPets.owned[petId]) return null;
    var pet = rpgPets.owned[petId];

    if (!pet.learnedMoves) {
      pet.learnedMoves = [];
      for (var mid in moveData) {
        var m = moveData[mid];
        if (m.specRequired && !petHasSpecGate(petId, m.specRequired)) continue;
        if (m.learnLevel <= level && (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(petType) >= 0))) {
          pet.learnedMoves.push(mid);
        }
      }
    }
    if (!pet.equippedMoves) {
      pet.equippedMoves = getMovesForPet(petId, level);
    }

    if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);
    return pet.equippedMoves;
  }

  function getEnemyMoves(enemyType) {
    if (!moveData) return ['scratch', 'tackle'];
    var moves = [];
    for (var mid in moveData) {
      var m = moveData[mid];
      if (m.specRequired) continue;
      if (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(enemyType) >= 0)) {
        moves.push(mid);
      }
    }
    moves.sort(function (a, b) { return (moveData[b].power || 0) - (moveData[a].power || 0); });
    return moves.slice(0, 4);
  }

  // ── Fighter Construction ───────────────────────────
  function createPlayerFighter(petId, petData, partyIndex) {
    var level = petData.level || 1;
    var stats = getPetCombatStats(petId, level);
    var creature = petCatalog.creatures[petId];

    // Initialize learned/equipped moves from persistent state if not already set
    if (!petData.equippedMoves) {
      var initialized = initPetMoves(petId, level);
      if (initialized) {
        petData.equippedMoves = initialized;
      }
    }
    var moves = petData.equippedMoves || getMovesForPet(petId, level);

    // Determine evolution stage for sprite frame
    var evoStage = 0;
    var petSkin = 'default';
    if (window.__RPG_GET_PET_STATE) {
      var rpgPetsLocal = window.__RPG_GET_PET_STATE();
      if (rpgPetsLocal && rpgPetsLocal.owned[petId]) {
        evoStage = getEvoStage(rpgPetsLocal.owned[petId], creature);
        petSkin = rpgPetsLocal.owned[petId].skin || 'default';
      }
    }

    // Read sub-spec special from spec tree (5B-2)
    var subSpecSpecial = null;
    if (specData && petData.subSpec) {
      for (var pathKey in specData.paths) {
        var sp = specData.paths[pathKey];
        if (sp.subSpecs && sp.subSpecs[petData.subSpec]) {
          subSpecSpecial = sp.subSpecs[petData.subSpec].special || null;
          break;
        }
      }
    }

    // Apply equipment stat bonuses if available
    var equipAtk = 0;
    var equipDef = 0;
    if (typeof window.__RPG_GET_EQUIP_STATS === 'function') {
      var equipStats = window.__RPG_GET_EQUIP_STATS();
      if (equipStats) {
        var mult = (partyIndex === 0) ? 1.0 : 0.5;
        equipAtk = Math.floor((equipStats.atk || 0) * mult);
        equipDef = Math.floor((equipStats.def || 0) * mult);
      }
    }

    return {
      id: petId,
      name: creature ? creature.name : petId,
      type: creature ? creature.type : 'neutral',
      tier: creature ? creature.tier : 'common',
      level: level,
      isPlayer: true,
      isAuto: !!petData.isAuto,
      maxHp: stats.hp,
      hp: stats.hp,
      atk: stats.atk + equipAtk,
      def: stats.def + equipDef,
      spd: stats.spd,
      cri: stats.cri,
      moves: moves,
      cooldowns: {},
      statuses: [],
      alive: true,
      spriteId: creature ? creature.spriteId : null,
      spriteImg: null,
      evoStage: evoStage,
      skin: petSkin,
      subSpecSpecial: subSpecSpecial,
      _mysticWardUsed: false,
      // Combat stats (8-2)
      _stats: { dmgDealt: 0, dmgTaken: 0, kills: 0, crits: 0, statusesLanded: 0 },
      animOffsetX: 0,
      animOffsetY: 0,
      _tweens: null,
      _tweenDone: null
    };
  }

  function createEnemyFighter(enemyId, dungeonStars, diffMult) {
    var stats = getEnemyCombatStats(enemyId, dungeonStars);
    var eData = enemyData ? enemyData[enemyId] : null;
    var name = eData ? eData.name : enemyId;
    var isBoss = eData ? eData.isBoss : false;
    var moves = (eData && eData.bossMoves && eData.bossMoves.length > 0) ? eData.bossMoves : getEnemyMoves(stats.type);
    var dm = diffMult || 1;
    return {
      id: enemyId,
      name: name,
      type: stats.type,
      tier: isBoss ? 'boss' : 'normal',
      level: dungeonStars * 10,
      isPlayer: false,
      isAuto: true,
      maxHp: Math.floor(stats.hp * dm),
      hp: Math.floor(stats.hp * dm),
      atk: Math.floor(stats.atk * dm),
      def: Math.floor(stats.def * dm),
      spd: stats.spd,
      cri: stats.cri,
      moves: moves,
      cooldowns: {},
      statuses: [],
      alive: true,
      spriteUrl: eData ? eData.sprite : null,
      spriteImg: null,
      frameWidth: eData ? eData.frameWidth : 32,
      frameHeight: eData ? eData.frameHeight : 32,
      frames: eData ? eData.frames : 4,
      isBoss: isBoss,
      _enraged: false,
      animOffsetX: 0,
      animOffsetY: 0,
      _tweens: null,
      _tweenDone: null
    };
  }

  // ── Image Preloading ───────────────────────────────
  function preloadFighterSprites(fighters, cb) {
    var pending = 0;
    var done = function () {
      pending--;
      if (pending <= 0 && cb) cb();
    };
    for (var i = 0; i < fighters.length; i++) {
      var f = fighters[i];
      var url = null;
      if (f.isPlayer && f.spriteId && petSpriteData) {
        var info = petSpriteData[f.spriteId];
        if (info) url = (f.skin === 'alt' && info.altSheet) ? info.altSheet : info.sheet;
      } else if (!f.isPlayer && f.spriteUrl) {
        url = f.spriteUrl;
      }
      if (url) {
        if (preloadedImages[url]) {
          f.spriteImg = preloadedImages[url];
        } else {
          pending++;
          (function (fighter, imgUrl) {
            var img = new Image();
            img.onload = function () {
              preloadedImages[imgUrl] = img;
              fighter.spriteImg = img;
              done();
            };
            img.onerror = done;
            img.src = imgUrl;
          })(f, url);
        }
      }
    }
    if (pending <= 0 && cb) setTimeout(cb, 0);
  }

  // ── Turn Order ─────────────────────────────────────
  function buildTurnOrder(fighters) {
    var alive = [];
    for (var i = 0; i < fighters.length; i++) {
      if (fighters[i].alive) alive.push(fighters[i]);
    }
    // Sort by effective SPD descending, with priority move bonus (5B-3)
    alive.sort(function (a, b) {
      var spdA = getEffectiveStat(a, 'spd') + (hasPriorityReady(a) ? 100 : 0);
      var spdB = getEffectiveStat(b, 'spd') + (hasPriorityReady(b) ? 100 : 0);
      if (spdB !== spdA) return spdB - spdA;
      return Math.random() - 0.5; // tie-break random
    });
    return alive;
  }

  function getEffectiveStat(fighter, stat) {
    var base = fighter[stat] || 0;
    var mult = 1;
    for (var i = 0; i < fighter.statuses.length; i++) {
      var s = fighter.statuses[i];
      if (stat === 'atk' && s.type === 'atkUp') mult += 0.3;
      if (stat === 'atk' && s.type === 'atkDown') mult -= 0.25;
      if (stat === 'def' && s.type === 'defUp') mult += 0.3;
      if (stat === 'def' && s.type === 'defDown') mult -= 0.25;
      if (stat === 'spd' && s.type === 'slow') mult -= 0.3;
    }
    return Math.max(1, Math.floor(base * mult));
  }

  // ── Damage Calculation ─────────────────────────────
  function calcDamage(attacker, defender, move) {
    if (!move || move.category === 'status') return 0;
    var power = move.power || 30;
    var atk = getEffectiveStat(attacker, 'atk');
    var def = getEffectiveStat(defender, 'def');
    var ratio = clamp(atk / Math.max(1, def), 0.4, 4.0);

    // STAB (Same Type Attack Bonus)
    var stab = (move.type === attacker.type) ? 1.25 : 1.0;

    // Type effectiveness
    var typeChart = TYPE_CHART[move.type] || TYPE_CHART.neutral;
    var typeMult = typeChart[defender.type] || 1.0;

    // Crit
    var criChance = Math.min((getEffectiveStat(attacker, 'cri') + (move.critBonus || 0)) / 100, 0.5);
    var isCrit = Math.random() < criChance;
    var critMult = isCrit ? 1.5 : 1.0;

    // Variance
    var variance = randFloat(0.9, 1.0);

    // Last Stand bonus: power doubles when HP < 25%
    if (move.id === 'lastStand' && attacker.hp < attacker.maxHp * 0.25) {
      power *= 2;
    }

    // Conditional damage bonuses (6-4)
    var condMult = 1.0;
    if (move.conditional) {
      if (move.conditional === 'bonusVsStatus' && defender.statuses.length > 0) condMult = 1.5;
      if (move.conditional === 'bonusVsLowHp' && defender.hp < defender.maxHp * 0.3) condMult = 1.5;
      if (move.conditional === 'bonusVsDebuff') {
        for (var si = 0; si < defender.statuses.length; si++) {
          var st = defender.statuses[si].type;
          if (st === 'burn' || st === 'poison' || st === 'bleed' || st === 'curse' || st === 'slow' || st === 'atkDown' || st === 'defDown') {
            condMult = 1.5; break;
          }
        }
      }
    }

    var damage = Math.floor(power * ratio * stab * typeMult * critMult * variance * condMult);
    return { damage: Math.max(1, damage), isCrit: isCrit, typeMult: typeMult };
  }

  // ── Status Effect Processing ───────────────────────
  function applyStatus(target, statusType, duration, source) {
    var dur = duration || STATUS_DURATIONS[statusType] || 2;
    // Sage buffDuration special (5B-2): +1 turn on atkUp/defUp when applied by a Sage
    if (source && source.subSpecSpecial === 'buffDuration' && (statusType === 'atkUp' || statusType === 'defUp')) {
      dur += 1;
    }
    // Check existing
    for (var i = 0; i < target.statuses.length; i++) {
      if (target.statuses[i].type === statusType) {
        target.statuses[i].turns = dur;
        return;
      }
    }
    target.statuses.push({ type: statusType, turns: dur });
  }

  function hasStatus(fighter, statusType) {
    for (var i = 0; i < fighter.statuses.length; i++) {
      if (fighter.statuses[i].type === statusType) return true;
    }
    return false;
  }

  function removeStatus(fighter, statusType) {
    for (var i = fighter.statuses.length - 1; i >= 0; i--) {
      if (fighter.statuses[i].type === statusType) {
        fighter.statuses.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function tickStatuses(fighter) {
    var dmg = 0;
    var healed = 0;
    for (var i = fighter.statuses.length - 1; i >= 0; i--) {
      var s = fighter.statuses[i];
      // Damage-over-time effects
      if (s.type === 'burn') dmg += Math.floor(fighter.maxHp * 0.06);
      if (s.type === 'poison') dmg += Math.floor(fighter.maxHp * 0.05);
      if (s.type === 'bleed') dmg += Math.floor(fighter.maxHp * 0.04);
      if (s.type === 'curse') dmg += Math.floor(fighter.maxHp * 0.08);
      // Heal over time (5B-2: Paladin regenBoost / Shaman healBoost → 12%)
      if (s.type === 'regen') {
        var regenPct = (fighter.subSpecSpecial === 'regenBoost' || fighter.subSpecSpecial === 'healBoost') ? 0.12 : 0.08;
        healed += Math.floor(fighter.maxHp * regenPct);
      }

      s.turns--;
      if (s.turns <= 0) {
        fighter.statuses.splice(i, 1);
      }
    }
    if (dmg > 0) {
      fighter.hp = Math.max(0, fighter.hp - dmg);
      if (fighter.hp <= 0) fighter.alive = false;
    }
    if (healed > 0) {
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + healed);
    }
    return { damage: dmg, healed: healed };
  }

  // ── Move Execution ─────────────────────────────────
  function executeMove(user, target, moveId) {
    if (!moveData || !moveData[moveId]) return null;
    var move = moveData[moveId];
    var result = { moveId: moveId, moveName: move.name, userId: user.id, targetId: target.id,
                   damage: 0, healed: 0, isCrit: false, typeMult: 1, missed: false,
                   statusApplied: null, reflected: false };

    // Note: stun is handled in processNextTurn() — stunned fighters never reach executeMove

    // Dodge check
    if (!move.selfTarget && hasStatus(target, 'dodge')) {
      result.missed = true;
      // Remove dodge
      for (var i = 0; i < target.statuses.length; i++) {
        if (target.statuses[i].type === 'dodge') { target.statuses.splice(i, 1); break; }
      }
      return result;
    }

    // Reflect check
    if (!move.selfTarget && move.category !== 'status' && hasStatus(target, 'reflect')) {
      // Reflect: damage goes back to user
      var dmgResult = calcDamage(user, user, move);
      user.hp = Math.max(0, user.hp - dmgResult.damage);
      if (user.hp <= 0) user.alive = false;
      result.damage = dmgResult.damage;
      result.reflected = true;
      result.isCrit = dmgResult.isCrit;
      // Remove reflect
      for (var i = 0; i < target.statuses.length; i++) {
        if (target.statuses[i].type === 'reflect') { target.statuses.splice(i, 1); break; }
      }
      return result;
    }

    // Self-target moves (status buffs)
    if (move.selfTarget) {
      if (move.effect === 'regen') {
        if (move.aoe) {
          var regenAllies = getAllies(user);
          for (var ra = 0; ra < regenAllies.length; ra++) {
            applyStatus(regenAllies[ra], 'regen', undefined, user);
          }
        } else {
          applyStatus(user, 'regen', undefined, user);
        }
        result.statusApplied = 'regen';
      } else if (move.effect === 'shield') {
        // Shield absorbs 30% max HP worth of damage
        if (move.aoe) {
          var shAllies = getAllies(user);
          for (var sa = 0; sa < shAllies.length; sa++) {
            shAllies[sa]._shield = Math.floor(shAllies[sa].maxHp * 0.3);
          }
        } else {
          user._shield = Math.floor(user.maxHp * 0.3);
        }
        result.statusApplied = 'shield';
      } else if (move.effect) {
        if (move.aoe) {
          var allies = getAllies(user);
          for (var a = 0; a < allies.length; a++) {
            applyStatus(allies[a], move.effect, undefined, user);
          }
        } else {
          applyStatus(user, move.effect, undefined, user);
        }
        result.statusApplied = move.effect;
      }
      // Blood Frenzy / Sacrifice: self-damage moves
      if (move.id === 'bloodFrenzy') {
        var selfDmg = Math.floor(user.maxHp * 0.20);
        user.hp = Math.max(1, user.hp - selfDmg);
        spawnFloatingText(user, '-' + selfDmg, false);
      }
      if (move.id === 'sacrifice') {
        var sacDmg = Math.floor(user.maxHp * 0.25);
        user.hp = Math.max(1, user.hp - sacDmg);
        spawnFloatingText(user, '-' + sacDmg, false);
      }
      // Set cooldown for self-target moves
      if (move.cooldown > 0) {
        user.cooldowns[moveId] = move.cooldown;
      }
      return result;
    }

    // Mystic Ward passive (6-2): first hit each wave reduced 30%
    var mysticReduction = 1.0;
    if (target.isPlayer && target.type === 'mystic' && !target._mysticWardUsed) {
      mysticReduction = 1.0 - (COMBAT_PASSIVES.mystic.reduction || 0.30);
      target._mysticWardUsed = true;
      spawnFloatingText(target, 'Mystic Ward!', false, '#cc88ff');
    }

    // Damage calculation — multi-hit support (6-3)
    if (move.category !== 'status') {
      var totalHits = move.hits || 1;
      var totalDamage = 0;
      var anyCrit = false;
      var lastTypeMult = 1;

      for (var h = 0; h < totalHits; h++) {
        if (!target.alive) break;
        var dmgResult = calcDamage(user, target, move);
        var hitDmg = Math.floor(dmgResult.damage * mysticReduction);
        mysticReduction = 1.0; // only first hit reduced

        // Shield absorb
        if (target._shield && target._shield > 0) {
          var absorbed = Math.min(target._shield, hitDmg);
          target._shield -= absorbed;
          hitDmg -= absorbed;
          if (target._shield <= 0) delete target._shield;
        }

        target.hp = Math.max(0, target.hp - hitDmg);
        totalDamage += hitDmg;
        if (dmgResult.isCrit) anyCrit = true;
        lastTypeMult = dmgResult.typeMult;

        if (totalHits > 1) {
          spawnFloatingText(target, '-' + hitDmg, dmgResult.isCrit);
        }
        if (target.hp <= 0) { target.alive = false; break; }
      }

      result.damage = totalDamage;
      result.isCrit = anyCrit;
      result.typeMult = lastTypeMult;
      if (totalHits > 1) result.multiHit = totalHits;

      // Nature Thorns passive (6-2): attackers take reflected damage
      if (target.isPlayer && target.type === 'nature' && target.alive && result.damage > 0) {
        var thornsDmg = Math.floor(result.damage * (COMBAT_PASSIVES.nature.reflect || 0.08));
        if (thornsDmg > 0) {
          user.hp = Math.max(0, user.hp - thornsDmg);
          if (user.hp <= 0) user.alive = false;
          spawnFloatingText(user, '-' + thornsDmg + ' thorns', false, '#44aa44');
        }
      }
    }

    // Status effect application — taunt redirected to user (5B-1)
    if (move.effect && move.effectChance > 0) {
      if (move.effect === 'taunt') {
        // Taunt: apply to caster so enemies are forced to attack them
        if (Math.random() * 100 < move.effectChance) {
          applyStatus(user, 'taunt', undefined, user);
          result.statusApplied = 'taunt';
        }
      } else {
        var targets = move.aoe ? getEnemiesOf(user) : [target];
        for (var t = 0; t < targets.length; t++) {
          if (Math.random() * 100 < move.effectChance) {
            applyStatus(targets[t], move.effect, undefined, user);
            result.statusApplied = move.effect;
          }
        }
      }
    }

    // AoE damage to other targets
    if (move.aoe && move.category !== 'status') {
      var otherTargets = getEnemiesOf(user);
      for (var ot = 0; ot < otherTargets.length; ot++) {
        if (otherTargets[ot].id === target.id) continue;
        if (!otherTargets[ot].alive) continue;
        var aoeDmg = calcDamage(user, otherTargets[ot], move);
        var finalDmg = aoeDmg.damage;
        if (otherTargets[ot]._shield && otherTargets[ot]._shield > 0) {
          var abs = Math.min(otherTargets[ot]._shield, finalDmg);
          otherTargets[ot]._shield -= abs;
          finalDmg -= abs;
        }
        otherTargets[ot].hp = Math.max(0, otherTargets[ot].hp - finalDmg);
        if (otherTargets[ot].hp <= 0) otherTargets[ot].alive = false;
        // Track AoE damage in combat stats (8-2)
        if (user._stats && finalDmg > 0) user._stats.dmgDealt += finalDmg;
        if (otherTargets[ot]._stats && finalDmg > 0) otherTargets[ot]._stats.dmgTaken += finalDmg;
        spawnFloatingText(otherTargets[ot], '-' + finalDmg, aoeDmg.isCrit);
        spawnVfx(otherTargets[ot], move.type || 'neutral');
      }
    }

    // Special move effects on attacker
    if (move.id === 'recklessCharge' && result.damage > 0) {
      var recoil = Math.floor(result.damage * 0.25);
      user.hp = Math.max(1, user.hp - recoil);
      spawnFloatingText(user, '-' + recoil, false);
    }
    if (move.id === 'divineSmite' && result.damage > 0) {
      applyStatus(user, 'regen');
    }

    // Drain mechanic (5B-5): heal user by drain% of damage dealt
    if (move.drain && result.damage > 0) {
      var drainAmt = Math.floor(result.damage * move.drain);
      user.hp = Math.min(user.maxHp, user.hp + drainAmt);
      result.healed = drainAmt;
      spawnFloatingText(user, '+' + drainAmt, false, '#44ff88');
    }

    // Shadow Life Steal passive (6-2): heal 15% of damage dealt
    if (user.isPlayer && user.type === 'shadow' && result.damage > 0 && !move.drain) {
      var stealAmt = Math.floor(result.damage * (COMBAT_PASSIVES.shadow.steal || 0.15));
      if (stealAmt > 0) {
        user.hp = Math.min(user.maxHp, user.hp + stealAmt);
        spawnFloatingText(user, '+' + stealAmt + ' steal', false, '#9966cc');
      }
    }

    // Set cooldown
    if (move.cooldown > 0) {
      user.cooldowns[moveId] = move.cooldown;
    }

    return result;
  }

  function getAllies(fighter) {
    if (!battleState) return [fighter];
    var team = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
    var allies = [];
    for (var i = 0; i < team.length; i++) {
      if (team[i].alive) allies.push(team[i]);
    }
    return allies;
  }

  function getEnemiesOf(fighter) {
    if (!battleState) return [];
    var team = fighter.isPlayer ? battleState.enemyTeam : battleState.playerTeam;
    var enemies = [];
    for (var i = 0; i < team.length; i++) {
      if (team[i].alive) enemies.push(team[i]);
    }
    return enemies;
  }

  function hasUsableAttack(fighter) {
    for (var i = 0; i < fighter.moves.length; i++) {
      var m = moveData ? moveData[fighter.moves[i]] : null;
      if (m && !m.selfTarget && !(fighter.cooldowns[fighter.moves[i]] > 0)) return true;
    }
    return false;
  }

  // ── AI Move Selection ──────────────────────────────
  function aiSelectMove(fighter) {
    var enemies = getEnemiesOf(fighter);
    if (enemies.length === 0) return null;

    // Taunt enforcement (5B-1): if any enemy has taunt status, must target them
    var taunter = null;
    for (var ti = 0; ti < enemies.length; ti++) {
      if (hasStatus(enemies[ti], 'taunt')) { taunter = enemies[ti]; break; }
    }

    var bestMove = null;
    var bestTarget = null;
    var bestScore = -1;

    for (var mi = 0; mi < fighter.moves.length; mi++) {
      var moveId = fighter.moves[mi];
      if (!moveData[moveId]) continue;
      var move = moveData[moveId];
      if (fighter.cooldowns[moveId] && fighter.cooldowns[moveId] > 0) continue;

      if (move.selfTarget) {
        // Skip self-target moves when taunted, unless no attack moves are usable
        if (taunter && hasUsableAttack(fighter)) continue;
        // Evaluate self-target moves
        var score = 0;
        if (move.effect === 'regen' && fighter.hp < fighter.maxHp * 0.5) score = 60;
        else if (move.effect === 'shield') score = 40;
        else if (move.effect === 'defUp') score = 30;
        else if (move.effect === 'atkUp') score = 35;
        else if (move.effect === 'dodge') score = 25;
        else if (move.effect === 'reflect') score = 20;
        // Penalise self-damage moves at low HP
        if ((move.id === 'bloodFrenzy' || move.id === 'sacrifice') && fighter.hp < fighter.maxHp * 0.35) score = 0;
        // Bonus for AoE buffs when team is alive
        if (move.aoe && score > 0) score += 10;
        if (score > bestScore) {
          bestScore = score;
          bestMove = moveId;
          bestTarget = fighter; // self
        }
        continue;
      }

      var targetList = taunter ? [taunter] : enemies;
      for (var ei = 0; ei < targetList.length; ei++) {
        var enemy = targetList[ei];
        var score = move.power || 10;
        // Type advantage bonus
        var typeChart = TYPE_CHART[move.type] || TYPE_CHART.neutral;
        var typeMult = typeChart[enemy.type] || 1;
        score *= typeMult;
        // STAB
        if (move.type === fighter.type) score *= 1.25;
        // Prefer killing blows
        if (enemy.hp < score * 0.5) score *= 1.5;
        // Prefer low HP targets
        score += (1 - enemy.hp / enemy.maxHp) * 20;
        // AoE bonus: scale by number of alive enemies
        if (move.aoe && enemies.length > 1) score *= (1 + enemies.length * 0.25);

        if (score > bestScore) {
          bestScore = score;
          bestMove = moveId;
          bestTarget = enemy;
        }
      }
    }

    // Fallback: scratch
    if (!bestMove) {
      bestMove = fighter.moves[0] || 'scratch';
      bestTarget = enemies[0];
    }

    return { moveId: bestMove, target: bestTarget };
  }

  // ── Team Synergy (6-5) ────────────────────────────
  function applySynergyBonuses(team) {
    if (!team || team.length < 2) return;
    var typeCounts = {};
    for (var i = 0; i < team.length; i++) {
      typeCounts[team[i].type] = (typeCounts[team[i].type] || 0) + 1;
    }
    var uniqueTypes = Object.keys(typeCounts).length;
    var maxSame = 0;
    for (var t in typeCounts) { if (typeCounts[t] > maxSame) maxSame = typeCounts[t]; }

    var bonuses = null;
    var synergyLabel = '';
    if (maxSame >= 3) {
      bonuses = SYNERGY_THRESHOLDS.triple;
      synergyLabel = 'Triple Type Synergy!';
    } else if (maxSame >= 2) {
      bonuses = SYNERGY_THRESHOLDS.pair;
      synergyLabel = 'Pair Type Synergy!';
    } else if (uniqueTypes === team.length && team.length >= 3) {
      bonuses = SYNERGY_THRESHOLDS.diverse;
      synergyLabel = 'Diverse Team Synergy!';
    }

    if (bonuses) {
      for (var fi = 0; fi < team.length; fi++) {
        var f = team[fi];
        if (bonuses.atk) f.atk = Math.floor(f.atk * (1 + bonuses.atk));
        if (bonuses.def) f.def = Math.floor(f.def * (1 + bonuses.def));
        if (bonuses.spd) f.spd = Math.floor(f.spd * (1 + bonuses.spd));
      }
      addBattleLog(synergyLabel);
    }
  }

  // ── Battle Flow ────────────────────────────────────
  function startBattle(config) {
    loadData();
    if (!moveData || !enemyData || !petCatalog) {
      console.error('rpg-combat: data not loaded');
      return;
    }

    battleState = {
      mode: config.mode || 'dungeon',
      dungeon: config.dungeon || null,
      difficulty: config.difficulty || 'normal',
      diffMult: config.diffMult || 1,
      rewardMult: config.rewardMult || 1,
      currentWave: 0,
      totalWaves: 0,
      playerTeam: [],
      enemyTeam: [],
      turnOrder: [],
      currentTurnIndex: 0,
      phase: 'setup', // setup, wave-intro, player-turn, enemy-turn, animating, between-wave, results
      waitingForInput: false,
      activeFighter: null,
      selectedMove: null,
      targetHighlight: -1,
      kills: 0,
      _bossKills: 0,
      result: null // { victory, gp, petXp, kills, wavesCleared }
    };

    // Build player team
    var party = config.party || [];
    for (var i = 0; i < party.length; i++) {
      var pf = createPlayerFighter(party[i].id, party[i], i);
      battleState.playerTeam.push(pf);
    }

    // Team synergy bonuses (6-5)
    applySynergyBonuses(battleState.playerTeam);

    if (config.mode === 'dungeon' && config.dungeon) {
      battleState.totalWaves = config.dungeon.waves.length;
      setupWave(0);
    } else if (config.mode === 'arena' && config.enemies) {
      battleState.totalWaves = 1;
      for (var ei = 0; ei < config.enemies.length; ei++) {
        battleState.enemyTeam.push(createEnemyFighter(config.enemies[ei], config.stars || 1, battleState.diffMult));
      }
      // Bestiary: mark arena enemies as seen (8-3)
      trackBestiarySeen(battleState.enemyTeam);
    }

    // Tab key to toggle active pet's auto mode mid-battle
    if (!document._combatKeyHandler) {
      document._combatKeyHandler = function (e) {
        if (!battleState || !battleState.activeFighter || !battleState.activeFighter.isPlayer) return;
        if (e.key === 'Tab') {
          e.preventDefault();
          var f = battleState.activeFighter;
          var idx = battleState.playerTeam.indexOf(f);
          if (idx >= 0) {
            toggleAuto(!f.isAuto, idx);
          }
        }
      };
      document.addEventListener('keydown', document._combatKeyHandler);
    }

    // Preload sprites then start
    var allFighters = battleState.playerTeam.concat(battleState.enemyTeam);
    preloadFighterSprites(allFighters, function () {
      battleState.phase = 'wave-intro';
      renderBattleUI();
      // Pre-render move buttons for first player so they don't pop in after wave banner
      if (battleState.playerTeam.length > 0) {
        renderMoveButtons(battleState.playerTeam[0]);
      }
      startAnimLoop();
      // Show wave intro briefly then start turns
      showWaveBanner(battleState.currentWave + 1, battleState.totalWaves, function () {
        startTurnCycle();
      });
    });
  }

  function setupWave(waveIdx) {
    if (!battleState || !battleState.dungeon) return;
    var dungeon = battleState.dungeon;
    battleState.currentWave = waveIdx;
    battleState.enemyTeam = [];

    var wave = dungeon.waves[waveIdx];
    var dm = battleState.diffMult || 1;
    for (var i = 0; i < wave.length; i++) {
      var ef = createEnemyFighter(wave[i], dungeon.stars, dm);
      // Append index for unique ID
      ef.id = wave[i] + '-' + i;
      battleState.enemyTeam.push(ef);
    }

    // Preload new enemy sprites
    preloadFighterSprites(battleState.enemyTeam, function () {});

    // Bestiary: mark enemies as seen (8-3)
    trackBestiarySeen(battleState.enemyTeam);
  }

  function startTurnCycle() {
    if (!battleState) return;
    // Check win/lose before building turn order
    if (checkBattleEnd()) return;

    // Reset per-round flags (overclock can trigger once per round per fighter)
    for (var ri = 0; ri < battleState.playerTeam.length; ri++) {
      battleState.playerTeam[ri]._overclocked = false;
    }

    battleState.turnOrder = buildTurnOrder(battleState.playerTeam.concat(battleState.enemyTeam));
    battleState.currentTurnIndex = 0;
    processNextTurn();
  }

  function processNextTurn() {
    if (!battleState) return;
    // Check win/lose between every turn (not just at round boundaries)
    // so combat doesn't get stuck when last enemy dies mid-round
    if (checkBattleEnd()) return;
    if (battleState.currentTurnIndex >= battleState.turnOrder.length) {
      // End of round: tick statuses, cooldowns, then new round
      endOfRound();
      return;
    }

    var fighter = battleState.turnOrder[battleState.currentTurnIndex];
    if (!fighter.alive) {
      battleState.currentTurnIndex++;
      processNextTurn();
      return;
    }

    battleState.activeFighter = fighter;

    if (hasStatus(fighter, 'stun')) {
      // Stunned: skip turn
      addBattleLog(fighter.name + ' is stunned!');
      spawnFloatingText(fighter, 'STUNNED', false);
      // Remove stun
      for (var i = 0; i < fighter.statuses.length; i++) {
        if (fighter.statuses[i].type === 'stun') { fighter.statuses.splice(i, 1); break; }
      }
      battleState.currentTurnIndex++;
      setTimeout(function () { processNextTurn(); }, getDelay(600));
      return;
    }

    if (fighter.isAuto || !fighter.isPlayer) {
      // AI turn
      battleState.phase = 'enemy-turn';
      var aiChoice = aiSelectMove(fighter);
      if (aiChoice) {
        setTimeout(function () {
          executeTurnAction(fighter, aiChoice.moveId, aiChoice.target);
        }, getDelay(500));
      } else {
        battleState.currentTurnIndex++;
        processNextTurn();
      }
    } else {
      // Manual player turn
      battleState.phase = 'player-turn';
      battleState.waitingForInput = true;
      battleState.selectedMove = null;
      battleState.targetHighlight = -1;
      renderMoveButtons(fighter);
      // Auto-timeout
      if (turnTimer) clearTimeout(turnTimer);
      turnTimer = setTimeout(function () {
        if (battleState && battleState.waitingForInput) {
          // Auto: AI takes over
          var aiChoice = aiSelectMove(fighter);
          if (aiChoice) executeTurnAction(fighter, aiChoice.moveId, aiChoice.target);
        }
      }, TURN_TIMEOUT);
    }
  }

  function showMoveResult(fighter, target, moveId, result) {
    // Determine VFX type from move data
    var move = moveData ? moveData[moveId] : null;
    var vfxType = move ? (move.type || 'neutral') : 'neutral';

    if (result.missed) {
      addBattleLog(fighter.name + ' used ' + result.moveName + ' - MISS!');
      spawnFloatingText(target, 'MISS', false, '#aaaaaa');
    } else if (result.reflected) {
      addBattleLog(fighter.name + ' used ' + result.moveName + ' - REFLECTED for ' + result.damage + '!');
      spawnFloatingText(fighter, '-' + result.damage, result.isCrit);
      spawnVfx(fighter, vfxType);
    } else if (result.damage > 0) {
      var logMsg = fighter.name + ' used ' + result.moveName + ' on ' + target.name + ' for ' + result.damage;
      if (result.multiHit) logMsg += ' (' + result.multiHit + ' hits)';
      if (result.isCrit) logMsg += ' (CRIT!)';
      if (result.healed) logMsg += ' (drained ' + result.healed + ' HP)';
      if (result.typeMult > 1) logMsg += ' Super effective!';
      else if (result.typeMult < 1) logMsg += ' Not very effective...';
      addBattleLog(logMsg);
      // Multi-hit: per-hit floating texts already spawned in executeMove
      if (!result.multiHit) spawnFloatingText(target, '-' + result.damage, result.isCrit);
      spawnVfx(target, vfxType);
      if (result.typeMult > 1) spawnFloatingText(target, 'Super effective!', false, '#44ff88');
      else if (result.typeMult < 1) spawnFloatingText(target, 'Not very effective...', false, '#888888');
    } else if (result.statusApplied) {
      addBattleLog(fighter.name + ' used ' + result.moveName + '! (' + result.statusApplied + ')');
      var statusTarget = moveData[moveId].selfTarget ? fighter : target;
      spawnFloatingText(statusTarget, result.statusApplied.toUpperCase(), false, '#88ccff');
      spawnVfx(statusTarget, move && move.selfTarget ? 'buff' : vfxType);
    } else if (move && (move.effect === 'heal' || move.effect === 'teamHeal')) {
      addBattleLog(fighter.name + ' used ' + result.moveName + '.');
      spawnVfx(move.selfTarget ? fighter : target, 'heal');
    } else {
      addBattleLog(fighter.name + ' used ' + result.moveName + '.');
    }
  }

  function triggerDeathAnims(allFighters, prevAlive) {
    for (var a = 0; a < allFighters.length; a++) {
      if (prevAlive[allFighters[a].id] && !allFighters[a].alive && !allFighters[a]._deathStart) {
        allFighters[a]._deathStart = Date.now();
        allFighters[a]._deathDur = getDelay(500);
      }
    }
  }

  // Tech Overclock passive (6-2): 10% chance to act again
  function advanceTurn(fighter) {
    if (fighter.isPlayer && fighter.type === 'tech' && fighter.alive && !fighter._overclocked) {
      if (Math.random() < (COMBAT_PASSIVES.tech.chance || 0.10)) {
        fighter._overclocked = true; // prevent infinite chain
        spawnFloatingText(fighter, 'Overclock!', false, '#44ffff');
        addBattleLog(fighter.name + ' Overclocked — extra turn!');
        processNextTurn(); // same index, same fighter
        return;
      }
    }
    fighter._overclocked = false;
    battleState.currentTurnIndex++;
    processNextTurn();
  }

  function executeTurnAction(fighter, moveId, target) {
    if (!battleState) return;
    battleState.waitingForInput = false;
    battleState.phase = 'animating';
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }

    var move = moveData ? moveData[moveId] : null;

    // Self-target moves: no slide animation needed
    if (move && move.selfTarget) {
      var result = executeMove(fighter, target, moveId);
      if (result) showMoveResult(fighter, target, moveId, result);
      setTimeout(function () {
        if (!battleState) return;
        advanceTurn(fighter);
      }, getDelay(500));
      return;
    }

    // Snapshot who's alive before the move
    var allFighters = battleState.playerTeam.concat(battleState.enemyTeam);
    var prevAlive = {};
    for (var a = 0; a < allFighters.length; a++) {
      prevAlive[allFighters[a].id] = allFighters[a].alive;
    }

    // Get positions for slide animation
    var userTeam = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
    var targetTeam = target.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
    var userPos = getFighterPosition(fighter, userTeam.indexOf(fighter), userTeam);
    var targetPos = getFighterPosition(target, targetTeam.indexOf(target), targetTeam);
    var slideX = (targetPos.x - userPos.x) * 0.35;
    var slideY = (targetPos.y - userPos.y) * 0.35;

    // Phase 1: Slide toward target
    setFighterTween(fighter, [
      { prop: 'animOffsetX', from: 0, to: slideX },
      { prop: 'animOffsetY', from: 0, to: slideY }
    ], getDelay(180), function () {
      if (!battleState) return;

      // Phase 2: Execute move at target
      var result = executeMove(fighter, target, moveId);
      if (!result) {
        fighter.animOffsetX = 0;
        fighter.animOffsetY = 0;
        advanceTurn(fighter);
        return;
      }

      showMoveResult(fighter, target, moveId, result);

      // Track combat stats (8-2)
      if (fighter._stats) {
        if (result.damage > 0 && !result.reflected) fighter._stats.dmgDealt += result.damage;
        if (result.isCrit && !result.missed) fighter._stats.crits++;
        if (result.statusApplied) fighter._stats.statusesLanded++;
      }
      if (target._stats && result.damage > 0 && !result.reflected) {
        target._stats.dmgTaken += result.damage;
      }
      if (fighter._stats && result.reflected && result.damage > 0) {
        fighter._stats.dmgTaken += result.damage;
      }

      // Screen shake on crit
      if (result.isCrit && !result.missed) {
        battleState._shake = { frames: 8, magnitude: 4 };
      }

      // Trigger death animations for newly dead fighters
      triggerDeathAnims(allFighters, prevAlive);

      // Count all kills (including AoE and reflected kills)
      for (var k = 0; k < allFighters.length; k++) {
        if (prevAlive[allFighters[k].id] && !allFighters[k].alive && !allFighters[k].isPlayer) {
          battleState.kills++;
          if (allFighters[k].isBoss) {
            battleState._bossKills = (battleState._bossKills || 0) + 1;
          }
          if (fighter._stats) fighter._stats.kills++;
          trackBestiaryDefeat(allFighters[k]);
          addBattleLog(allFighters[k].name + ' was defeated!');
        }
      }

      // If attacker died (e.g. from reflect), reset offset and check battle end
      if (!fighter.alive) {
        fighter.animOffsetX = 0;
        fighter.animOffsetY = 0;
        if (checkBattleEnd()) return;
        battleState.currentTurnIndex++;
        processNextTurn();
        return;
      }

      // Phase 3: Slide back
      setFighterTween(fighter, [
        { prop: 'animOffsetX', from: slideX, to: 0 },
        { prop: 'animOffsetY', from: slideY, to: 0 }
      ], getDelay(150), function () {
        if (!battleState) return;
        advanceTurn(fighter);
      });
    });
  }

  function endOfRound() {
    if (!battleState) return;

    var allFighters = battleState.playerTeam.concat(battleState.enemyTeam);

    // Snapshot alive state before status ticks
    var prevAlive = {};
    for (var a = 0; a < allFighters.length; a++) {
      prevAlive[allFighters[a].id] = allFighters[a].alive;
    }

    // Tick statuses for all alive fighters
    for (var i = 0; i < allFighters.length; i++) {
      if (!allFighters[i].alive) continue;
      var result = tickStatuses(allFighters[i]);
      if (result.damage > 0) {
        spawnFloatingText(allFighters[i], '-' + result.damage + ' (dot)', false);
      }
      if (result.healed > 0) {
        spawnFloatingText(allFighters[i], '+' + result.healed, false);
      }
    }

    // Trigger death animations and count kills for fighters killed by DoT
    triggerDeathAnims(allFighters, prevAlive);
    for (var dk = 0; dk < allFighters.length; dk++) {
      if (prevAlive[allFighters[dk].id] && !allFighters[dk].alive && !allFighters[dk].isPlayer) {
        battleState.kills++;
        if (allFighters[dk].isBoss) {
          battleState._bossKills = (battleState._bossKills || 0) + 1;
        }
        trackBestiaryDefeat(allFighters[dk]);
        addBattleLog(allFighters[dk].name + ' was defeated!');
      }
    }

    // Pet passives — end of round (6-2)
    for (var pi = 0; pi < battleState.playerTeam.length; pi++) {
      var pet = battleState.playerTeam[pi];
      if (!pet.alive) continue;
      var passive = COMBAT_PASSIVES[pet.type];
      if (!passive) continue;

      // Fire: 5% chance to burn random enemy
      if (pet.type === 'fire' && Math.random() < (passive.chance || 0.05)) {
        var fireEnemies = getEnemiesOf(pet);
        if (fireEnemies.length > 0) {
          var burnTarget = fireEnemies[randInt(0, fireEnemies.length - 1)];
          applyStatus(burnTarget, 'burn');
          spawnFloatingText(burnTarget, 'Ignite!', false, '#ff6644');
          addBattleLog(pet.name + '\'s Ignite burned ' + burnTarget.name + '!');
        }
      }
      // Aqua: heal 3% HP if below 50%
      if (pet.type === 'aqua' && pet.hp < pet.maxHp * (passive.threshold || 0.5)) {
        var aquaHeal = Math.floor(pet.maxHp * (passive.heal || 0.03));
        pet.hp = Math.min(pet.maxHp, pet.hp + aquaHeal);
        spawnFloatingText(pet, '+' + aquaHeal + ' tidal', false, '#44aaff');
      }
    }

    // Boss enrage check (6-1): bosses at <30% HP get one-time atkUp
    for (var bi = 0; bi < battleState.enemyTeam.length; bi++) {
      var boss = battleState.enemyTeam[bi];
      if (!boss.alive || !boss.isBoss || boss._enraged) continue;
      if (boss.hp < boss.maxHp * 0.30) {
        boss._enraged = true;
        applyStatus(boss, 'atkUp');
        spawnFloatingText(boss, 'ENRAGED!', false, '#ff4444');
        addBattleLog(boss.name + ' is ENRAGED!');
      }
    }

    // Tick cooldowns
    for (var i = 0; i < allFighters.length; i++) {
      for (var cd in allFighters[i].cooldowns) {
        if (allFighters[i].cooldowns[cd] > 0) allFighters[i].cooldowns[cd]--;
      }
    }

    // Check battle end
    if (checkBattleEnd()) return;

    // Next round
    setTimeout(function () { startTurnCycle(); }, getDelay(400));
  }

  function checkBattleEnd() {
    if (!battleState) return true;

    var playerAlive = false;
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      if (battleState.playerTeam[i].alive) { playerAlive = true; break; }
    }

    var enemyAlive = false;
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      if (battleState.enemyTeam[i].alive) { enemyAlive = true; break; }
    }

    if (!playerAlive) {
      // Defeat
      battleState.phase = 'results';
      showResults(false);
      return true;
    }

    if (!enemyAlive) {
      // Wave cleared
      var nextWave = battleState.currentWave + 1;
      if (nextWave >= battleState.totalWaves) {
        // Victory!
        battleState.phase = 'results';
        showResults(true);
        return true;
      } else {
        // Between-wave heal
        battleState.phase = 'between-wave';
        betweenWaveHeal();
        showWaveBanner(nextWave + 1, battleState.totalWaves, function () {
          setupWave(nextWave);
          preloadFighterSprites(battleState.enemyTeam, function () {
            startTurnCycle();
          });
        });
        return true; // stops current cycle
      }
    }

    return false;
  }

  function betweenWaveHeal() {
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      var p = battleState.playerTeam[i];
      if (p.alive) {
        var heal = Math.floor(p.maxHp * WAVE_HEAL_PCT);
        p.hp = Math.min(p.maxHp, p.hp + heal);
      }
      // Reset cooldowns, statuses, shields, passive flags
      p.cooldowns = {};
      p.statuses = [];
      delete p._shield;
      p._mysticWardUsed = false;
    }
  }

  // ── Results ────────────────────────────────────────
  function showResults(victory) {
    if (!battleState) return;
    stopAnimLoop();

    var wavesCleared = victory ? battleState.totalWaves : battleState.currentWave;
    var completionRatio = battleState.totalWaves > 0 ? wavesCleared / battleState.totalWaves : 0;

    var gp = 0;
    var petXp = 0;
    var combatXp = 0;
    var stoneType = null;
    var gotStone = false;
    var streakBonus = 0;
    var nextStreak = 0;

    var rewardMult = battleState.rewardMult || 1;

    if (battleState.dungeon) {
      var rewards = battleState.dungeon.rewards;
      gp = Math.floor(rewards.gpBase * completionRatio * rewardMult);
      petXp = Math.floor(rewards.petXpBase * completionRatio * rewardMult);
      combatXp = Math.floor(50 * wavesCleared * rewardMult);

      if (victory) {
        // Brutal: guaranteed stone; otherwise: scaled chance
        if (battleState.difficulty === 'brutal') {
          stoneType = rewards.stoneType;
          gotStone = true;
        } else if (rewards.stoneChance && Math.random() < rewards.stoneChance * rewardMult) {
          stoneType = rewards.stoneType;
          gotStone = true;
        }
      }
    } else if (battleState.mode === 'arena') {
      gp = Math.floor((victory ? 50 : 10) * rewardMult);
      petXp = Math.floor((victory ? 30 : 10) * rewardMult);
      combatXp = Math.floor((victory ? 30 : 10) * rewardMult);
      // Streak bonus: check current streak (will be incremented in saveCombatResults)
      if (victory) {
        var cs = loadCombatState();
        nextStreak = (cs.arenaStats.currentStreak || 0) + 1;
        if (nextStreak === 5) streakBonus = 100;
        else if (nextStreak === 10) streakBonus = 250;
        else if (nextStreak === 25) streakBonus = 500;
        else if (nextStreak === 50) streakBonus = 1000;
        else if (nextStreak % 50 === 0) streakBonus = 1000;
        gp += streakBonus;
      }
    }

    // Roll dungeon drops
    var droppedItems = [];
    if (victory && battleState.dungeon && battleState.dungeon.rewards.drops) {
      var drops = battleState.dungeon.rewards.drops;
      var isBrutal = battleState.difficulty === 'brutal';
      for (var dri = 0; dri < drops.length; dri++) {
        var drop = drops[dri];
        var dropChance = drop.chance;
        if (isBrutal) dropChance = Math.min(1, dropChance * 1.5);
        if (Math.random() < dropChance) {
          var qty = (isBrutal && drop.brutalQty) ? drop.brutalQty : (drop.qty || 1);
          droppedItems.push({ item: drop.item, qty: qty });
        }
      }
    }

    // Count boss kills this battle
    var bossKills = battleState._bossKills || 0;

    battleState.result = {
      victory: victory,
      gp: gp,
      petXp: petXp,
      combatXp: combatXp,
      kills: battleState.kills,
      wavesCleared: wavesCleared,
      stoneType: stoneType,
      gotStone: gotStone,
      droppedItems: droppedItems,
      arenaMilestone: null,
      streakBonus: streakBonus,
      streak: nextStreak
    };

    // Apply rewards
    if (window.Wallet && gp > 0) {
      window.Wallet.add(gp);
    }

    // Distribute pet XP
    if (petXp > 0) {
      distributePetXp(petXp);
    }

    // Combat skill XP
    if (combatXp > 0 && window.__RPG_SKILLS_API && window.__RPG_SKILLS_API.addXp) {
      window.__RPG_SKILLS_API.addXp('combat', combatXp);
    }

    // Award dropped items to inventory
    if (droppedItems.length > 0 && window.__RPG_SKILLS_API && window.__RPG_SKILLS_API.addItem) {
      for (var adi = 0; adi < droppedItems.length; adi++) {
        window.__RPG_SKILLS_API.addItem(droppedItems[adi].item, droppedItems[adi].qty);
      }
    }

    // Flush batched bestiary defeat counts before saving (8-3)
    flushBestiaryUpdates();

    // Update combat storage
    var combatSave = loadCombatState();
    if (battleState.mode === 'dungeon') {
      combatSave.stats.raids++;
      combatSave.stats.totalKills += battleState.kills;
      if (victory && battleState.dungeon) {
        combatSave.stats.clears++;
        var did = battleState.dungeon.id;
        var diff = battleState.difficulty || 'normal';
        if (combatSave.dungeonProgress.unlocked.indexOf(did) < 0) {
          combatSave.dungeonProgress.unlocked.push(did);
        }
        // Track difficulty clear
        if (!combatSave.dungeonProgress.difficulties) combatSave.dungeonProgress.difficulties = {};
        if (!combatSave.dungeonProgress.difficulties[did]) {
          combatSave.dungeonProgress.difficulties[did] = { normal: false, hard: false, brutal: false };
        }
        combatSave.dungeonProgress.difficulties[did][diff] = true;
        // Unlock next dungeon
        if (dungeonData) {
          for (var di = 0; di < dungeonData.length; di++) {
            if (dungeonData[di].id === did && di + 1 < dungeonData.length) {
              var nextId = dungeonData[di + 1].id;
              if (combatSave.dungeonProgress.unlocked.indexOf(nextId) < 0) {
                combatSave.dungeonProgress.unlocked.push(nextId);
              }
              break;
            }
          }
        }
      }
    } else if (battleState.mode === 'arena') {
      combatSave.arenaStats.fights++;
      if (!combatSave.arenaStats.milestones) combatSave.arenaStats.milestones = {};
      if (victory) {
        combatSave.arenaStats.wins++;
        combatSave.arenaStats.currentStreak++;
        if (combatSave.arenaStats.currentStreak > combatSave.arenaStats.bestStreak) {
          combatSave.arenaStats.bestStreak = combatSave.arenaStats.currentStreak;
        }
        // Arena milestones
        var totalWins = combatSave.arenaStats.wins;
        var ARENA_MILESTONES = [
          { at: 10, reward: 'stone', label: 'Evolution Stone', stoneType: 'nature' },
          { at: 25, reward: 'gp', label: '2,000 GP', amount: 2000 },
          { at: 50, reward: 'stone', label: 'Evolution Stone', stoneType: 'fire' },
          { at: 100, reward: 'legendaryStone', label: 'Legendary Stone (shadow)', stoneType: 'shadow' },
          { at: 200, reward: 'gp', label: '10,000 GP', amount: 10000 },
          { at: 500, reward: 'legendaryStone', label: 'Legendary Stone (mystic)', stoneType: 'mystic' }
        ];
        for (var mi = 0; mi < ARENA_MILESTONES.length; mi++) {
          var ms = ARENA_MILESTONES[mi];
          if (totalWins >= ms.at && !combatSave.arenaStats.milestones[ms.at]) {
            combatSave.arenaStats.milestones[ms.at] = true;
            battleState.result.arenaMilestone = ms;
            if (ms.reward === 'gp' && window.Wallet) {
              window.Wallet.add(ms.amount);
            } else if ((ms.reward === 'stone' || ms.reward === 'legendaryStone') && ms.stoneType) {
              if (!combatSave.stones) combatSave.stones = { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 };
              combatSave.stones[ms.stoneType] = (combatSave.stones[ms.stoneType] || 0) + 1;
            }
          }
        }
      } else {
        combatSave.arenaStats.currentStreak = 0;
      }
    }
    // Store evolution stone drop
    if (gotStone && stoneType) {
      if (!combatSave.stones) combatSave.stones = { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 };
      combatSave.stones[stoneType] = (combatSave.stones[stoneType] || 0) + 1;
    }
    saveCombatState(combatSave);

    // Quest hooks
    if (window.QuestSystem) {
      if (battleState.kills > 0) {
        window.QuestSystem.updateObjective('kill_enemies', { count: battleState.kills });
      }
      if (victory && battleState.dungeon) {
        window.QuestSystem.updateObjective('clear_dungeon', { dungeonId: battleState.dungeon.id });
      }
      if (bossKills > 0) {
        window.QuestSystem.updateObjective('defeat_boss', { count: bossKills });
      }
      if (battleState.mode === 'arena') {
        if (victory) {
          window.QuestSystem.updateObjective('arena_wins', { count: 1 });
          window.QuestSystem.updateObjective('arena_streak', { streak: combatSave.arenaStats.currentStreak });
        }
      }
    }

    renderResultsOverlay();
  }

  function distributePetXp(totalXp) {
    if (!battleState) return;
    // Get rpgPets state from rpg.js
    var rpgPets = null;
    if (window.__RPG_GET_PET_STATE) rpgPets = window.__RPG_GET_PET_STATE();
    if (!rpgPets) return;

    // Per-pet XP details for results overlay
    var petDetails = [];

    var xpPer = Math.floor(totalXp / battleState.playerTeam.length);
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      var pf = battleState.playerTeam[i];
      var petId = pf.id;
      var pet = rpgPets.owned[petId];
      if (!pet) continue;

      // Fainted pets get 50%
      var xpGain = pf.alive ? xpPer : Math.floor(xpPer * 0.5);
      var oldLevel = pet.level;
      pet.xp = (pet.xp || 0) + xpGain;
      if (pet.totalBattleXp === undefined) pet.totalBattleXp = 0;
      pet.totalBattleXp += xpGain;

      // Level up check
      var catalog = petCatalog.creatures[petId];
      // levelCap: per-pet override > catalog levelCap > tier-based default
      var maxLevel = pet.levelCap;
      if (!maxLevel && catalog) maxLevel = catalog.levelCap;
      if (!maxLevel) {
        var tierCaps = { common: 30, rare: 25, legendary: 50 };
        maxLevel = tierCaps[catalog ? catalog.tier : 'common'] || 30;
      }
      var needed = rpgPetXpForLevel(pet.level);
      while (pet.xp >= needed && pet.level < maxLevel) {
        pet.xp -= needed;
        pet.level++;
        needed = rpgPetXpForLevel(pet.level);
        addBattleLog(pf.name + ' leveled up to ' + pet.level + '!');
      }
      // Cap XP at max level
      if (pet.level >= maxLevel) {
        pet.xp = 0;
      }
      // Check for new moves learned across all gained levels
      if (pet.level > oldLevel) {
        var newMoves = checkNewMovesLearned(petId, oldLevel, pet.level);
        for (var nm = 0; nm < newMoves.length; nm++) {
          addBattleLog(pf.name + ' learned ' + newMoves[nm].name + '!');
        }
      }

      // Check for pending spec/sub-spec choice (persisted on pet for refresh safety)
      if (specData && pet.level > oldLevel) {
        var specLv = specData.specLevel || 5;
        var subLv = specData.subSpecLevel || 30;
        if (!pet.spec && pet.level >= specLv) {
          pet.needsSpec = true;
          if (!battleState._pendingSpecs) battleState._pendingSpecs = [];
          battleState._pendingSpecs.push({ petId: petId, petName: pf.name, type: 'spec' });
        }
        // Sub-spec: only queue if spec already chosen (not just crossed threshold)
        if (pet.spec && !pet.subSpec && pet.level >= subLv) {
          pet.needsSubSpec = true;
          if (!battleState._pendingSpecs) battleState._pendingSpecs = [];
          battleState._pendingSpecs.push({ petId: petId, petName: pf.name, type: 'subSpec' });
        }
      }

      // Store per-pet details for results overlay
      var atCap = pet.level >= maxLevel;
      petDetails.push({
        name: pf.name,
        xpGain: xpGain,
        oldLevel: oldLevel,
        newLevel: pet.level,
        leveled: pet.level > oldLevel,
        xp: pet.xp,
        xpNeeded: rpgPetXpForLevel(pet.level),
        atCap: atCap,
        alive: pf.alive
      });
    }

    // Attach to battleState for renderResultsOverlay
    if (battleState.result) battleState.result.petDetails = petDetails;

    if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);
  }

  function rpgPetXpForLevel(level) {
    return Math.floor(50 + 20 * level + 0.5 * level * level);
  }

  // ── Evolution System ───────────────────────────────
  function getPetLevelCap(petId) {
    var pet = null, catalog = null;
    if (window.__RPG_GET_PET_STATE) {
      var rpgPets = window.__RPG_GET_PET_STATE();
      if (rpgPets) pet = rpgPets.owned[petId];
    }
    if (petCatalog) catalog = petCatalog.creatures[petId];
    if (pet && pet.levelCap) return pet.levelCap;
    if (catalog && catalog.levelCap) return catalog.levelCap;
    var tierCaps = { common: 30, rare: 25, legendary: 50 };
    return tierCaps[catalog ? catalog.tier : 'common'] || 30;
  }

  function getEvoStage(pet, catalog) {
    // Determine current evolution stage based on current levelCap vs tier caps
    var tier = catalog ? catalog.tier : 'common';
    var tiers = EVOLUTION_TIERS[tier] || EVOLUTION_TIERS.common;
    var currentCap = pet.levelCap || (catalog ? catalog.levelCap : tiers[0].cap);
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (currentCap >= tiers[i].cap) return i;
    }
    return 0;
  }

  function canEvolve(petId) {
    if (!petCatalog) return null;
    var catalog = petCatalog.creatures[petId];
    if (!catalog) return null;
    var rpgPets = window.__RPG_GET_PET_STATE ? window.__RPG_GET_PET_STATE() : null;
    if (!rpgPets || !rpgPets.owned[petId]) return null;
    var pet = rpgPets.owned[petId];
    var tier = catalog.tier || 'common';
    var tiers = EVOLUTION_TIERS[tier] || EVOLUTION_TIERS.common;
    var stage = getEvoStage(pet, catalog);
    if (stage + 1 >= tiers.length) return null; // max evolution reached

    var currentCap = tiers[stage].cap;
    if (pet.level < currentCap) return null; // hasn't hit cap yet

    var nextTier = tiers[stage + 1];
    var combatSave = loadCombatState();
    if (!combatSave.stones) combatSave.stones = {};
    var stoneType = catalog.type;
    var hasStones = (combatSave.stones[stoneType] || 0) >= nextTier.stoneCost;
    var hasGp = window.Wallet ? window.Wallet.getBalance() >= nextTier.gpCost : false;

    return {
      nextCap: nextTier.cap,
      stoneCost: nextTier.stoneCost,
      gpCost: nextTier.gpCost,
      stoneType: stoneType,
      hasStones: hasStones,
      hasGp: hasGp,
      canDo: hasStones && hasGp,
      stage: stage
    };
  }

  function evolvePet(petId) {
    var evoInfo = canEvolve(petId);
    if (!evoInfo || !evoInfo.canDo) return false;

    var rpgPets = window.__RPG_GET_PET_STATE ? window.__RPG_GET_PET_STATE() : null;
    if (!rpgPets || !rpgPets.owned[petId]) return false;
    var pet = rpgPets.owned[petId];
    var catalog = petCatalog.creatures[petId];

    // Deduct resources
    var combatSave = loadCombatState();
    if (!combatSave.stones) combatSave.stones = { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 };
    combatSave.stones[evoInfo.stoneType] -= evoInfo.stoneCost;
    saveCombatState(combatSave);

    if (window.Wallet) window.Wallet.deduct(evoInfo.gpCost);

    // Raise level cap, reset XP
    pet.levelCap = evoInfo.nextCap;
    pet.xp = 0;

    if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);

    addBattleLog(catalog.name + ' evolved! Level cap raised to ' + evoInfo.nextCap + '!');
    return true;
  }

  // ── Battle Log ─────────────────────────────────────
  function addBattleLog(text) {
    // Use rpg.js addGameMessage if available
    if (window.__RPG_ADD_GAME_MESSAGE) {
      window.__RPG_ADD_GAME_MESSAGE(text, 'combat');
    }
  }

  // ── Floating Text ──────────────────────────────────
  function spawnFloatingText(fighter, text, isCrit, color) {
    if (!fighter) return;
    floatingTexts.push({
      text: text,
      fighterId: fighter.id,
      isPlayer: fighter.isPlayer,
      xOffset: randFloat(-8, 8),
      age: 0,
      maxAge: 60, // frames
      isCrit: isCrit,
      color: color || null
    });
  }

  // ── Battle VFX ───────────────────────────────────
  function spawnVfx(fighter, moveType) {
    if (!vfxImage || !vfxImage.complete) return;
    var vfxDef = VFX_MAP[moveType] || VFX_MAP.neutral;
    // Find fighter position
    var team = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
    var idx = team.indexOf(fighter);
    var pos = getFighterPosition(fighter, idx, team);

    activeVfx.push({
      row: vfxDef.row,
      frames: vfxDef.frames,
      scale: vfxDef.scale || 1.4,
      x: pos.x + (fighter.animOffsetX || 0),
      y: pos.y + (fighter.animOffsetY || 0),
      startTime: Date.now(),
      duration: getDelay(400),
      alpha: 0.9
    });
  }

  function drawVfx() {
    if (!vfxImage || !vfxImage.complete || activeVfx.length === 0) return;
    var now = Date.now();
    for (var i = activeVfx.length - 1; i >= 0; i--) {
      var v = activeVfx[i];
      var elapsed = now - v.startTime;
      if (elapsed >= v.duration) {
        activeVfx.splice(i, 1);
        continue;
      }
      var progress = elapsed / v.duration;
      var frameIdx = Math.min(Math.floor(progress * v.frames), v.frames - 1);
      var sx = frameIdx * VFX_CELL;
      var sy = v.row * VFX_CELL;
      var drawSize = VFX_CELL * v.scale;
      // Fade in quickly then fade out
      var alpha = v.alpha;
      if (progress < 0.15) alpha *= progress / 0.15;
      else if (progress > 0.7) alpha *= (1 - progress) / 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(vfxImage, sx, sy, VFX_CELL, VFX_CELL,
        v.x - drawSize / 2, v.y - drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }

  // ── Animation Tweens ──────────────────────────────
  function setFighterTween(fighter, tweens, dur, onDone) {
    var now = Date.now();
    fighter._tweens = [];
    for (var i = 0; i < tweens.length; i++) {
      fighter._tweens.push({
        prop: tweens[i].prop, from: tweens[i].from, to: tweens[i].to,
        start: now, dur: dur
      });
    }
    fighter._tweenDone = onDone || null;
  }

  function tickTweens() {
    if (!battleState) return;
    var now = Date.now();
    var all = battleState.playerTeam.concat(battleState.enemyTeam);
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f._tweens) continue;
      var allDone = true;
      for (var t = 0; t < f._tweens.length; t++) {
        var tw = f._tweens[t];
        var elapsed = now - tw.start;
        var p = Math.min(1, elapsed / tw.dur);
        p = 1 - (1 - p) * (1 - p); // ease-out quad
        f[tw.prop] = tw.from + (tw.to - tw.from) * p;
        if (elapsed < tw.dur) allDone = false;
      }
      if (allDone) {
        for (var t = 0; t < f._tweens.length; t++) {
          f[f._tweens[t].prop] = f._tweens[t].to;
        }
        var done = f._tweenDone;
        f._tweens = null;
        f._tweenDone = null;
        if (done) done();
      }
    }
  }

  function getDelay(ms) {
    return Math.floor(ms / speedMult);
  }

  // ── Wave Banner ────────────────────────────────────
  function showWaveBanner(waveNum, totalWaves, cb) {
    // Check if this wave has a boss (6-1)
    var hasBoss = false;
    if (battleState && battleState.enemyTeam) {
      for (var bi = 0; bi < battleState.enemyTeam.length; bi++) {
        if (battleState.enemyTeam[bi].isBoss) { hasBoss = true; break; }
      }
    }
    var bannerText = 'Wave ' + waveNum + ' / ' + totalWaves;
    if (hasBoss) bannerText = '\u2620 BOSS WAVE \u2620  ' + waveNum + ' / ' + totalWaves;
    battleState._waveBanner = { text: bannerText, age: 0, maxAge: 40, isBoss: hasBoss };
    setTimeout(function () {
      if (battleState) battleState._waveBanner = null;
      if (cb && battleState) cb();
    }, getDelay(BETWEEN_WAVE_DELAY));
  }

  // ══════════════════════════════════════════════════
  // ── RENDERING ─────────────────────────────────────
  // ══════════════════════════════════════════════════

  function startAnimLoop() {
    if (animFrame) return;
    var tick = function () {
      renderFrame();
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
  }

  function stopAnimLoop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function renderFrame() {
    if (!canvas || !ctx || !battleState) return;

    tickTweens();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Screen shake on crits
    var shaking = battleState._shake && battleState._shake.frames > 0;
    if (shaking) {
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * battleState._shake.magnitude * 2,
        (Math.random() - 0.5) * battleState._shake.magnitude * 2
      );
      battleState._shake.frames--;
      if (battleState._shake.frames <= 0) battleState._shake = null;
    }

    // Background
    drawBackground();

    // Turn order strip (top)
    drawTurnOrderStrip();

    // Fighters
    drawFighters();

    // Battle VFX (on top of fighters, below text)
    drawVfx();

    // Floating texts
    drawFloatingTexts();

    // Wave banner
    if (battleState._waveBanner) {
      drawWaveBanner(battleState._waveBanner);
      battleState._waveBanner.age++;
    }

    // Target highlight
    if (battleState.waitingForInput && battleState.selectedMove !== null) {
      drawTargetHighlights();
    }

    if (shaking) ctx.restore();
  }

  // ── Procedural Backgrounds ──────────────────────────
  function bgHash(x, y) {
    var h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
    h = ((h >> 13) ^ h) * 1274126177;
    return ((h >> 16) ^ h) >>> 0;
  }

  function generateBattleBg(theme) {
    var W = CANVAS_W, H = CANVAS_H;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var bx = c.getContext('2d');
    var grad, i, j, h;

    var groundY = H - 50;

    switch (theme) {
      case 'nature': // Cave with stalactites, mossy ground
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0d1a0d'); grad.addColorStop(0.5, '#1a2e1a'); grad.addColorStop(1, '#0f1f0f');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Stalactites
        for (i = 0; i < 12; i++) {
          h = bgHash(i, 100);
          var sx = (h % W);
          var sl = 20 + (bgHash(i, 200) % 40);
          var sw = 4 + (bgHash(i, 300) % 6);
          bx.fillStyle = '#2a3a2a';
          bx.beginPath(); bx.moveTo(sx - sw, 0); bx.lineTo(sx + sw, 0); bx.lineTo(sx, sl); bx.fill();
        }
        // Moss dots on walls — doubled density
        for (i = 0; i < 80; i++) {
          h = bgHash(i, 500);
          bx.fillStyle = ['#3a6633', '#2d5525', '#4a7744', '#558844'][h % 4];
          bx.fillRect(h % W, (bgHash(i, 600) % (groundY - 20)), 2 + h % 3, 2);
        }
        // Small mushrooms
        for (i = 0; i < 6; i++) {
          h = bgHash(i, 550);
          var mx = h % W, my = groundY - 4;
          bx.fillStyle = ['#886644', '#aa7755', '#775533'][h % 3];
          bx.fillRect(mx, my, 2, 4); // stem
          bx.fillStyle = ['#cc5544', '#dd6655', '#bb4433'][h % 3];
          bx.fillRect(mx - 1, my - 2, 4, 3); // cap
        }
        // Ground
        bx.fillStyle = '#2a3a22'; bx.fillRect(0, groundY, W, 50);
        // Ground texture + pebbles
        for (i = 0; i < 120; i++) {
          h = bgHash(i, 700);
          bx.fillStyle = ['#354a2d', '#3d5535', '#223318'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 4, 2);
        }
        // Pebbles
        for (i = 0; i < 10; i++) {
          h = bgHash(i, 750);
          bx.fillStyle = ['#4a5a42', '#3a4a32', '#5a6a52'][h % 3];
          bx.beginPath(); bx.arc(h % W, groundY + 4 + (h % 20), 2 + h % 2, 0, Math.PI * 2); bx.fill();
        }
        bx.fillStyle = '#3a5a33'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#4a6a43'; bx.fillRect(0, groundY - 1, W, 1);
        break;

      case 'fire': // Volcanic, lava glow
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#1a0a0a'); grad.addColorStop(0.4, '#2a1010'); grad.addColorStop(1, '#1a0808');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Lava cracks
        for (i = 0; i < 8; i++) {
          h = bgHash(i, 900);
          bx.strokeStyle = 'rgba(255,' + (80 + h % 80) + ',0,0.3)';
          bx.lineWidth = 1;
          bx.beginPath();
          var cx = h % W, cy = 30 + bgHash(i, 901) % (groundY - 60);
          bx.moveTo(cx, cy);
          for (j = 0; j < 4; j++) {
            cx += (bgHash(i * 10 + j, 902) % 30) - 15;
            cy += 10 + bgHash(i * 10 + j, 903) % 15;
            bx.lineTo(cx, cy);
          }
          bx.stroke();
        }
        // Embers — brighter, doubled count
        for (i = 0; i < 40; i++) {
          h = bgHash(i, 950);
          bx.fillStyle = 'rgba(255,' + (140 + h % 80) + ',' + (20 + h % 40) + ',' + (0.3 + (h % 30) / 100) + ')';
          bx.fillRect(h % W, bgHash(i, 951) % groundY, 2, 2);
        }
        // Lava pools near ground
        for (i = 0; i < 5; i++) {
          h = bgHash(i, 960);
          var lx = h % (W - 30), lw = 12 + h % 20;
          bx.fillStyle = 'rgba(255,100,0,0.2)';
          bx.fillRect(lx, groundY + 2, lw, 4);
          bx.fillStyle = 'rgba(255,160,0,0.15)';
          bx.fillRect(lx + 2, groundY + 3, lw - 4, 2);
        }
        // Ground (dark rock with lava glow)
        bx.fillStyle = '#2a1a1a'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 90; i++) {
          h = bgHash(i, 1000);
          bx.fillStyle = ['#3a2020', '#2a1515', '#1a0a0a'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 5, 2);
        }
        bx.fillStyle = '#cc4400'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#ff6600'; bx.fillRect(0, groundY - 1, W, 1);
        bx.fillStyle = 'rgba(255,68,0,0.2)'; bx.fillRect(0, groundY + 3, W, 1);
        break;

      case 'aqua': // Underwater, bubbles
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a1a2e'); grad.addColorStop(0.5, '#0e2844'); grad.addColorStop(1, '#061420');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Light rays
        for (i = 0; i < 5; i++) {
          h = bgHash(i, 1100);
          bx.fillStyle = 'rgba(100,180,255,0.04)';
          bx.save(); bx.translate(100 + (h % 400), 0);
          bx.beginPath(); bx.moveTo(-15, 0); bx.lineTo(15, 0);
          bx.lineTo(30 + h % 20, groundY); bx.lineTo(-30 - h % 20, groundY); bx.fill();
          bx.restore();
        }
        // Bubbles — doubled
        for (i = 0; i < 50; i++) {
          h = bgHash(i, 1200);
          var br = 2 + h % 4;
          bx.strokeStyle = 'rgba(100,180,255,' + (0.15 + (h % 20) / 100) + ')';
          bx.lineWidth = 1;
          bx.beginPath(); bx.arc(h % W, bgHash(i, 1201) % groundY, br, 0, Math.PI * 2); bx.stroke();
        }
        // Sandy ground
        bx.fillStyle = '#1a2a35'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 90; i++) {
          h = bgHash(i, 1300);
          bx.fillStyle = ['#223344', '#1a2835', '#2a3a4a'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 4, 2);
        }
        bx.fillStyle = '#3a5566'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#4a6676'; bx.fillRect(0, groundY - 1, W, 1);
        break;

      case 'shadow': // Dark crypt, purple accents
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a0a14'); grad.addColorStop(0.5, '#12101e'); grad.addColorStop(1, '#08060e');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Stone bricks
        for (i = 0; i < 15; i++) {
          for (j = 0; j < 6; j++) {
            h = bgHash(i, j + 1400);
            var bw = 40 + h % 20, bh = 20;
            var bxp = i * 50 + ((j % 2) * 25) - 10;
            var byp = j * 22;
            if (byp > groundY - 10) continue;
            bx.fillStyle = ['#1a1822', '#16141e', '#1e1c28'][h % 3];
            bx.fillRect(bxp, byp, bw - 1, bh - 1);
          }
        }
        // Purple wisps — doubled
        for (i = 0; i < 24; i++) {
          h = bgHash(i, 1500);
          bx.fillStyle = 'rgba(136,68,204,' + (0.06 + (h % 10) / 100) + ')';
          bx.fillRect(h % W, bgHash(i, 1501) % groundY, 3 + h % 6, 3 + h % 4);
        }
        // Ground
        bx.fillStyle = '#1a1822'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 50; i++) {
          h = bgHash(i, 1600);
          bx.fillStyle = ['#221e2e', '#1a1624', '#16121e'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 5, 2);
        }
        bx.fillStyle = '#6633aa'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#7744bb'; bx.fillRect(0, groundY - 1, W, 1);
        bx.fillStyle = 'rgba(136,68,204,0.15)'; bx.fillRect(0, groundY + 3, W, 1);
        break;

      case 'tech': // Lab, circuit lines
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a0f14'); grad.addColorStop(0.5, '#101820'); grad.addColorStop(1, '#0a0e14');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Grid lines
        bx.strokeStyle = 'rgba(204,170,34,0.06)'; bx.lineWidth = 1;
        for (i = 0; i < W; i += 40) { bx.beginPath(); bx.moveTo(i, 0); bx.lineTo(i, groundY); bx.stroke(); }
        for (j = 0; j < groundY; j += 30) { bx.beginPath(); bx.moveTo(0, j); bx.lineTo(W, j); bx.stroke(); }
        // Circuit traces
        for (i = 0; i < 6; i++) {
          h = bgHash(i, 1700);
          bx.strokeStyle = 'rgba(204,170,34,' + (0.1 + (h % 15) / 100) + ')';
          bx.lineWidth = 1;
          bx.beginPath();
          cx = h % W; cy = 20 + bgHash(i, 1701) % (groundY - 40);
          bx.moveTo(cx, cy);
          for (j = 0; j < 5; j++) {
            if (j % 2 === 0) cx += 15 + bgHash(i * 10 + j, 1702) % 30;
            else cy += 10 + bgHash(i * 10 + j, 1703) % 20;
            bx.lineTo(cx, cy);
          }
          bx.stroke();
          // Node dots
          bx.fillStyle = 'rgba(204,170,34,0.3)';
          bx.fillRect(cx - 1, cy - 1, 3, 3);
        }
        // Metal floor
        bx.fillStyle = '#1a2028'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 70; i++) {
          h = bgHash(i, 1800);
          bx.fillStyle = ['#222a30', '#1a2228', '#2a3238'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 4 + h % 4, 2);
        }
        bx.fillStyle = '#ccaa22'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#ddbb33'; bx.fillRect(0, groundY - 1, W, 1);
        bx.fillStyle = 'rgba(204,170,34,0.15)'; bx.fillRect(0, groundY + 3, W, 1);
        break;

      case 'mystic': // Ruins, glowing runes
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#14081a'); grad.addColorStop(0.5, '#1e1028'); grad.addColorStop(1, '#0e0614');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Broken pillars
        for (i = 0; i < 4; i++) {
          h = bgHash(i, 1900);
          var px = 50 + (h % (W - 100));
          var ph = 60 + bgHash(i, 1901) % 80;
          var pw = 12 + h % 8;
          bx.fillStyle = '#2a2238';
          bx.fillRect(px, groundY - ph, pw, ph);
          bx.fillStyle = '#3a3048';
          bx.fillRect(px, groundY - ph, pw, 3); // cap
          // Broken top
          bx.fillStyle = '#1e1028';
          for (j = 0; j < pw; j += 2) {
            var chipH = bgHash(i * 20 + j, 1905) % 8;
            bx.fillRect(px + j, groundY - ph - chipH, 2, chipH);
          }
        }
        // Glowing runes — doubled
        for (i = 0; i < 16; i++) {
          h = bgHash(i, 2000);
          bx.fillStyle = 'rgba(204,68,170,' + (0.12 + (h % 15) / 100) + ')';
          var rx = h % W, ry = bgHash(i, 2001) % (groundY - 10);
          bx.fillRect(rx, ry, 2, 4);
          bx.fillRect(rx - 1, ry + 1, 4, 2);
        }
        // Stone floor
        bx.fillStyle = '#1e1628'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 50; i++) {
          h = bgHash(i, 2100);
          bx.fillStyle = ['#2a2238', '#221a30', '#1a1224'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 5, 2);
        }
        bx.fillStyle = '#cc44aa'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#dd55bb'; bx.fillRect(0, groundY - 1, W, 1);
        bx.fillStyle = 'rgba(204,68,170,0.15)'; bx.fillRect(0, groundY + 3, W, 1);
        break;

      case 'arena': // Sandy colosseum
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#2a2010'); grad.addColorStop(0.4, '#3a3018'); grad.addColorStop(1, '#1a1808');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        // Columns
        for (i = 0; i < 6; i++) {
          var colX = 30 + i * 130;
          bx.fillStyle = '#4a4030';
          bx.fillRect(colX, 20, 14, groundY - 20);
          bx.fillStyle = '#5a5040'; bx.fillRect(colX, 20, 14, 6);
          bx.fillStyle = '#5a5040'; bx.fillRect(colX - 2, groundY - 6, 18, 6);
          bx.fillStyle = 'rgba(255,255,255,0.05)'; bx.fillRect(colX, 20, 2, groundY - 20);
          // Torch sconces
          bx.fillStyle = '#6a5a40'; bx.fillRect(colX + 3, 50, 8, 4);
          bx.fillStyle = '#ff9922'; bx.fillRect(colX + 5, 46, 4, 4);
          bx.fillStyle = 'rgba(255,153,34,0.15)'; bx.beginPath(); bx.arc(colX + 7, 48, 10, 0, Math.PI * 2); bx.fill();
        }
        // Crossbeam connecting column tops
        bx.fillStyle = '#5a5040'; bx.fillRect(30, 20, (5 * 130) + 14, 3);
        // Crowd dots — larger, more varied, staggered rows
        for (i = 0; i < 60; i++) {
          h = bgHash(i, 2200);
          bx.fillStyle = ['#554830', '#665838', '#443820', '#776848', '#554028'][h % 5];
          var crowdRow = (h % 3);
          bx.fillRect(h % W, 6 + crowdRow * 10 + (h % 8), 4, 5);
        }
        // Sand dust in air
        for (i = 0; i < 20; i++) {
          h = bgHash(i, 2250);
          bx.fillStyle = 'rgba(180,160,120,' + (0.08 + (h % 10) / 100) + ')';
          bx.fillRect(h % W, 40 + bgHash(i, 2251) % (groundY - 60), 2, 1);
        }
        // Sand floor
        bx.fillStyle = '#3a3018'; bx.fillRect(0, groundY, W, 50);
        for (i = 0; i < 120; i++) {
          h = bgHash(i, 2300);
          bx.fillStyle = ['#4a4020', '#3a3018', '#504828'][h % 3];
          bx.fillRect(h % W, groundY + (h % 48), 3 + h % 4, 2);
        }
        bx.fillStyle = '#6a5a30'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#7a6a3a'; bx.fillRect(0, groundY - 1, W, 1);
        break;

      default: // Fallback
        grad = bx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(0.6, '#16213e'); grad.addColorStop(1, '#0f3460');
        bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
        bx.fillStyle = '#2a2a2a'; bx.fillRect(0, groundY, W, 50);
        bx.fillStyle = '#444'; bx.fillRect(0, groundY, W, 3);
        bx.fillStyle = '#555'; bx.fillRect(0, groundY - 1, W, 1);
        break;
    }

    // Vignette overlay — darken edges for depth
    var vig = bx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    bx.fillStyle = vig;
    bx.fillRect(0, 0, W, H);

    var img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  function getBattleBg() {
    if (!battleState) return null;
    var theme = 'default';
    if (battleState.mode === 'arena') {
      theme = 'arena';
    } else if (battleState.dungeon) {
      // Determine theme from dungeon stone type or first enemy type
      var st = battleState.dungeon.rewards ? battleState.dungeon.rewards.stoneType : null;
      if (st) theme = st;
    }
    if (!bgCache[theme]) {
      bgCache[theme] = generateBattleBg(theme);
    }
    return bgCache[theme];
  }

  function drawBackground() {
    var bg = getBattleBg();
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      // Fallback while image loads
      var grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(0.6, '#16213e'); grad.addColorStop(1, '#0f3460');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
      ctx.fillStyle = '#333'; ctx.fillRect(0, CANVAS_H - 52, CANVAS_W, 2);
    }
  }

  function drawTurnOrderStrip() {
    if (!battleState.turnOrder || battleState.turnOrder.length === 0) return;
    var stripH = 36;
    // Dark gradient bar
    var sg = ctx.createLinearGradient(0, 0, 0, stripH);
    sg.addColorStop(0, 'rgba(0,0,0,0.7)');
    sg.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, CANVAS_W, stripH);
    // Bottom separator
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.fillRect(0, stripH - 1, CANVAS_W, 1);

    var boxW = 26, boxH = 26;
    var x = 6;
    for (var i = 0; i < battleState.turnOrder.length && i < 8; i++) {
      var f = battleState.turnOrder[i];
      if (!f.alive) continue;
      var isActive = (i === battleState.currentTurnIndex);
      var bx = x, by = 3;

      // Box background with rounded look
      if (isActive) {
        // Gold glow behind active
        ctx.fillStyle = 'rgba(255,215,0,0.25)';
        ctx.fillRect(bx - 2, by - 2, boxW + 4, boxH + 4);
      }
      ctx.fillStyle = isActive ? '#ffd700' : (f.isPlayer ? 'rgba(68,136,170,0.6)' : 'rgba(170,68,68,0.6)');
      ctx.fillRect(bx, by, boxW, boxH);

      // Draw mini sprite if available
      var drewSprite = false;
      if (f.spriteImg) {
        try {
          if (f.isPlayer && petSpriteData && f.spriteId) {
            var sInfo = petSpriteData[f.spriteId];
            if (sInfo) {
              var sfw = sInfo.frameWidth || 48, sfh = sInfo.frameHeight || 48;
              var sfo = sInfo.frameOffset || 0;
              var sfi = Math.min(sfo + (f.evoStage || 0), (sInfo.frames || 3) - 1);
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(f.spriteImg, sfi * sfw, 0, sfw, sfh, bx + 1, by + 1, boxW - 2, boxH - 2);
              drewSprite = true;
            }
          } else if (!f.isPlayer) {
            var efw = f.frameWidth || 32, efh = f.frameHeight || 32;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(f.spriteImg, 0, 0, efw, efh, bx + 1, by + 1, boxW - 2, boxH - 2);
            drewSprite = true;
          }
        } catch (e) { /* fallback to letter */ }
      }
      if (!drewSprite) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.name.charAt(0), bx + boxW / 2, by + 18);
      }

      // Border
      ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(bx, by, boxW, boxH);

      // HP pip below box
      var hpRatio = f.hp / f.maxHp;
      var pipY = by + boxH + 1;
      var pipW = boxW - 4;
      var pipX = bx + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(pipX, pipY, pipW, 3);
      if (hpRatio > 0) {
        ctx.fillStyle = hpRatio > 0.5 ? '#33aa33' : (hpRatio > 0.25 ? '#aaaa22' : '#aa2222');
        ctx.fillRect(pipX, pipY, pipW * hpRatio, 3);
      }

      x += boxW + 3;
    }
    ctx.textAlign = 'left';
  }

  function getFighterPosition(fighter, index, team) {
    var totalInTeam = 0;
    for (var t = 0; t < team.length; t++) {
      if (team[t].alive) totalInTeam++;
    }
    var aliveIdx = 0;
    for (var t = 0; t < team.length; t++) {
      if (team[t] === fighter) break;
      if (team[t].alive) aliveIdx++;
    }

    var spacing = Math.min(120, CANVAS_W / (totalInTeam + 1) / 2);
    var isPlayer = fighter.isPlayer;
    var baseY = isPlayer ? CANVAS_H - 110 : 70;
    var baseX = isPlayer ? 80 : CANVAS_W - 80;
    var dir = isPlayer ? 1 : -1;

    return {
      x: baseX + dir * aliveIdx * spacing,
      y: baseY + aliveIdx * 15
    };
  }

  function drawFighters() {
    // Draw player team
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      drawFighter(battleState.playerTeam[i], i, battleState.playerTeam);
    }
    // Draw enemy team
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      drawFighter(battleState.enemyTeam[i], i, battleState.enemyTeam);
    }
  }

  function drawFighterSprite(fighter, pos, size) {
    if (fighter.spriteImg) {
      if (fighter.isPlayer) {
        var info = petSpriteData ? petSpriteData[fighter.spriteId] : null;
        if (info) {
          var fw = info.frameWidth || 48;
          var fh = info.frameHeight || 48;
          var frameOffset = info.frameOffset || 0;
          var evoStage = fighter.evoStage || 0;
          var frameIdx = Math.min(frameOffset + evoStage, (info.frames || 3) - 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(fighter.spriteImg, frameIdx * fw, 0, fw, fh,
            pos.x - size / 2, pos.y - size / 2, size, size);
        }
      } else {
        var fw = fighter.frameWidth || 32;
        var fh = fighter.frameHeight || 32;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fighter.spriteImg, 0, 0, fw, fh,
          pos.x - size / 2, pos.y - size / 2, size, size);
      }
    } else {
      ctx.fillStyle = fighter.isPlayer ? '#4488cc' : '#cc4444';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fighter.name.substring(0, 4), pos.x, pos.y + 4);
    }
  }

  function drawFighter(fighter, index, team) {
    // Death animation: draw fading fighter at cached position
    if (!fighter.alive) {
      if (fighter._deathStart) {
        var elapsed = Date.now() - fighter._deathStart;
        var dur = fighter._deathDur || 500;
        if (elapsed >= dur) { fighter._deathStart = null; return; }
        var p = elapsed / dur;
        var pos = fighter._lastPos || getFighterPosition(fighter, index, team);
        var size = fighter.isBoss ? 56 : 40;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.translate(pos.x, pos.y);
        ctx.scale(1 - p * 0.4, 1 - p * 0.4);
        ctx.translate(-pos.x, -pos.y);
        drawFighterSprite(fighter, pos, size);
        ctx.restore();
      }
      return;
    }

    var pos = getFighterPosition(fighter, index, team);
    // Cache base position for death animation (before slide offsets)
    fighter._lastPos = { x: pos.x, y: pos.y };
    // Apply animation offsets (slide animation)
    pos.x += (fighter.animOffsetX || 0);
    pos.y += (fighter.animOffsetY || 0);
    var size = fighter.isBoss ? 56 : 40;

    // Active turn: animated glow ring
    if (battleState.activeFighter === fighter) {
      var glowAlpha = 0.35 + 0.15 * Math.sin(Date.now() * 0.005);
      ctx.save();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255,215,0,' + glowAlpha + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawFighterSprite(fighter, pos, size);

    // Name plate
    var nameText = fighter.name;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    var nameW = ctx.measureText(nameText).width + 8;
    var nameX = pos.x - nameW / 2;
    var nameY = pos.y - size / 2 - 22;
    // Name plate bg
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(nameX, nameY, nameW, 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(nameText, pos.x, nameY + 10);

    // HP bar — wider, taller, gradient fill
    var barW = 56, barH = 6;
    var barX = pos.x - barW / 2;
    var barY = pos.y - size / 2 - 8;
    // Bar background with inset effect
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(barX, barY, barW, 1); // dark inset top
    var hpPct = fighter.hp / fighter.maxHp;
    // Gradient fill
    if (hpPct > 0) {
      var hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
      if (hpPct > 0.5) {
        hpGrad.addColorStop(0, '#33aa33'); hpGrad.addColorStop(1, '#55dd55');
      } else if (hpPct > 0.25) {
        hpGrad.addColorStop(0, '#aa8822'); hpGrad.addColorStop(1, '#ddcc44');
      } else {
        hpGrad.addColorStop(0, '#aa2222'); hpGrad.addColorStop(1, '#dd4444');
      }
      ctx.fillStyle = hpGrad;
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }
    // Bar border — inset style
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 1); // top dark
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX - 1, barY + barH, barW + 2, 1); // bottom light
    // HP text for player pets
    if (fighter.isPlayer) {
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(fighter.hp + '/' + fighter.maxHp, barX + barW + 1, barY + barH);
      ctx.textAlign = 'left';
    }

    // Status icons — colored dots with letter
    if (fighter.statuses.length > 0) {
      var statusY = pos.y + size / 2 + 6;
      var statusTotalW = fighter.statuses.length * 12;
      var statusStartX = pos.x - statusTotalW / 2;
      for (var si = 0; si < fighter.statuses.length; si++) {
        var s = fighter.statuses[si];
        var sc = getStatusColor(s.type);
        var sx = statusStartX + si * 12 + 5;
        // Dot background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(sx, statusY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = sc;
        ctx.beginPath(); ctx.arc(sx, statusY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(getStatusIcon(s.type).charAt(0), sx, statusY + 2);
      }
    }

    ctx.textAlign = 'left';
  }

  function getStatusColor(type) {
    var colors = {
      burn: '#ff6600', poison: '#88cc00', bleed: '#cc0000', curse: '#8800cc',
      stun: '#ffcc00', slow: '#6688cc', regen: '#00cc44',
      atkUp: '#ff4444', defUp: '#4488ff', atkDown: '#884444', defDown: '#444488',
      dodge: '#ffffff', taunt: '#ff8800', shield: '#88ccff', reflect: '#cc88ff'
    };
    return colors[type] || '#888';
  }

  function getStatusIcon(type) {
    var icons = {
      burn: 'B', poison: 'P', bleed: 'X', curse: 'C',
      stun: 'S', slow: 'W', regen: 'R',
      atkUp: 'A+', defUp: 'D+', atkDown: 'A-', defDown: 'D-',
      dodge: 'E', taunt: 'T', shield: 'H', reflect: 'M'
    };
    return icons[type] || '?';
  }

  function drawTargetHighlights() {
    // Highlight enemy team when selecting target
    var dashOffset = (Date.now() * 0.03) % 16;
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      var f = battleState.enemyTeam[i];
      if (!f.alive) continue;
      var pos = getFighterPosition(f, i, battleState.enemyTeam);
      var isHighlighted = (battleState.targetHighlight === i);

      ctx.save();
      if (isHighlighted) {
        // Gold glow + solid circle
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Pulsing dashed circle
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -dashOffset;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // "Select target" prompt
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,215,0,0.6)';
    ctx.fillText('Select Target', CANVAS_W / 2, CANVAS_H - 12);
    ctx.restore();
  }

  function drawFloatingTexts() {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.age++;
      if (ft.age > ft.maxAge) {
        floatingTexts.splice(i, 1);
        continue;
      }

      // Find fighter position, or use cached last-known position
      var posX, posY;
      var fighter = findFighterById(ft.fighterId);
      if (fighter) {
        var team = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
        var idx = team.indexOf(fighter);
        var pos = getFighterPosition(fighter, idx, team);
        posX = pos.x;
        posY = pos.y;
        // Cache position for wave transitions
        ft._lastX = posX;
        ft._lastY = posY;
      } else if (ft._lastX !== undefined) {
        posX = ft._lastX;
        posY = ft._lastY;
      } else {
        floatingTexts.splice(i, 1);
        continue;
      }

      var alpha = 1 - (ft.age / ft.maxAge);
      var yOffset = -ft.age * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = ft.isCrit ? 'bold 14px monospace' : '11px monospace';
      ctx.fillStyle = ft.color ? ft.color : (ft.isCrit ? '#ffd700' : (ft.text.charAt(0) === '+' ? '#44ff44' : '#ff4444'));
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, posX + ft.xOffset, posY - 30 + yOffset);
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  function drawWaveBanner(banner) {
    var alpha = 1;
    if (banner.age < 10) alpha = banner.age / 10;
    if (banner.age > 30) alpha = 1 - (banner.age - 30) / 10;
    alpha = clamp(alpha, 0, 1);

    var isBoss = banner.isBoss;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isBoss ? 'rgba(60,0,0,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(CANVAS_W / 2 - 140, CANVAS_H / 2 - 25, 280, 50);
    ctx.strokeStyle = isBoss ? '#ff4444' : '#ffd700';
    ctx.lineWidth = isBoss ? 3 : 2;
    ctx.strokeRect(CANVAS_W / 2 - 140, CANVAS_H / 2 - 25, 280, 50);
    ctx.fillStyle = isBoss ? '#ff6644' : '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(banner.text, CANVAS_W / 2, CANVAS_H / 2 + 6);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function findFighterById(id) {
    if (!battleState) return null;
    var all = battleState.playerTeam.concat(battleState.enemyTeam);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  // ── DOM UI ─────────────────────────────────────────
  function renderBattleUI() {
    var btnsContainer = $('rpg-combat-moves');
    var actionsBar = $('rpg-combat-actions');
    if (btnsContainer) btnsContainer.innerHTML = '';
    if (actionsBar) actionsBar.style.display = '';

    // Restore speed setting from save (8-5)
    var cs = loadCombatState();
    if (cs.speedMult === 2) speedMult = 2;

    // Wire speed toggle
    var speedBtn = $('rpg-combat-speed');
    if (speedBtn) {
      speedBtn.textContent = speedMult + 'x';
      if (speedMult === 2) speedBtn.classList.add('active');
      speedBtn.onclick = function () {
        speedMult = speedMult === 1 ? 2 : 1;
        this.textContent = speedMult + 'x';
        if (speedMult === 2) this.classList.add('active');
        else this.classList.remove('active');
        // Persist speed preference (8-5)
        var sv = loadCombatState();
        sv.speedMult = speedMult;
        saveCombatState(sv);
      };
    }
  }

  function renderMoveButtons(fighter) {
    var btnsContainer = $('rpg-combat-moves');
    if (!btnsContainer) return;
    btnsContainer.innerHTML = '';

    for (var mi = 0; mi < fighter.moves.length; mi++) {
      var moveId = fighter.moves[mi];
      var move = moveData ? moveData[moveId] : null;
      if (!move) continue;

      var btn = document.createElement('button');
      btn.className = 'rpg-combat-move-btn';
      var onCooldown = fighter.cooldowns[moveId] && fighter.cooldowns[moveId] > 0;

      // Type color class
      btn.setAttribute('data-type', move.type);
      btn.setAttribute('data-move-id', moveId);

      var label = move.name;
      if (move.power > 0) label += ' ' + move.power;
      if (move.priority) label += ' \u26A1'; // lightning bolt for priority moves
      if (onCooldown) label += ' (CD:' + fighter.cooldowns[moveId] + ')';
      btn.textContent = label;

      // Tooltip (8-1)
      var tip = move.name + ' [' + move.type + ']';
      if (move.power > 0) tip += '\nPower: ' + move.power + ' (' + (move.category || 'physical') + ')';
      if (move.hits && move.hits > 1) tip += '\nHits: ' + move.hits + 'x';
      if (move.drain) tip += '\nDrain: ' + Math.round(move.drain * 100) + '%';
      if (move.aoe) tip += '\nAoE: hits all enemies';
      if (move.selfTarget) tip += '\nSelf-target';
      if (move.cooldown) tip += '\nCooldown: ' + move.cooldown + ' turns';
      if (move.statusEffect) tip += '\nEffect: ' + move.statusEffect;
      if (move.conditional) tip += '\nBonus: ' + move.conditional;
      if (move.priority) tip += '\nPriority: acts first';
      btn.title = tip;

      if (onCooldown) {
        btn.disabled = true;
        btn.classList.add('on-cooldown');
      }

      btn.addEventListener('click', (function (mid, m) {
        return function () {
          if (!battleState || !battleState.waitingForInput) return;
          if (m.selfTarget) {
            // Self-target: execute immediately
            executeTurnAction(battleState.activeFighter, mid, battleState.activeFighter);
          } else {
            // Need target selection
            battleState.selectedMove = mid;
            highlightTargets();
          }
        };
      })(moveId, move));

      btnsContainer.appendChild(btn);
    }

    // Items button (Phase 7-5)
    if (fighter.isPlayer && window.__RPG_SKILLS_API && window.__RPG_SKILLS_API.getItemCount) {
      var hasAnyItem = false;
      for (var ck in COMBAT_CONSUMABLES) {
        if (COMBAT_CONSUMABLES.hasOwnProperty(ck) && window.__RPG_SKILLS_API.getItemCount(ck) > 0) {
          hasAnyItem = true;
          break;
        }
      }
      if (hasAnyItem) {
        var itemBtn = document.createElement('button');
        itemBtn.className = 'rpg-combat-move-btn rpg-combat-items-btn';
        itemBtn.textContent = 'Items';
        itemBtn.addEventListener('click', function () {
          showItemsPanel(fighter);
        });
        btnsContainer.appendChild(itemBtn);
      }
    }
  }

  function showItemsPanel(fighter) {
    var btnsContainer = $('rpg-combat-moves');
    if (!btnsContainer) return;
    btnsContainer.innerHTML = '';

    var api = window.__RPG_SKILLS_API;
    if (!api) return;

    for (var itemKey in COMBAT_CONSUMABLES) {
      if (!COMBAT_CONSUMABLES.hasOwnProperty(itemKey)) continue;
      var count = api.getItemCount(itemKey);
      if (count <= 0) continue;
      var info = COMBAT_CONSUMABLES[itemKey];
      var btn = document.createElement('button');
      btn.className = 'rpg-combat-move-btn rpg-combat-item-use-btn';
      btn.style.borderLeftColor = info.color;
      btn.textContent = info.name + ' x' + count;
      btn.title = info.desc;
      btn.addEventListener('click', (function (key, inf) {
        return function () {
          useCombatItem(key, inf, fighter);
        };
      })(itemKey, info));
      btnsContainer.appendChild(btn);
    }

    var backBtn = document.createElement('button');
    backBtn.className = 'rpg-combat-move-btn rpg-combat-items-back';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', function () {
      renderMoveButtons(fighter);
    });
    btnsContainer.appendChild(backBtn);
  }

  function useCombatItem(itemKey, info, fighter) {
    if (!battleState || !battleState.waitingForInput) return;
    var api = window.__RPG_SKILLS_API;
    if (!api) return;

    // Pre-check: Health Potion — skip if at full HP
    if (itemKey === 'Health Potion' && fighter.hp >= fighter.maxHp) {
      spawnFloatingText(fighter, 'Full HP!', false, '#999999');
      return;
    }

    // Pre-check: Antidote — skip if nothing to cure
    if (itemKey === 'Antidote') {
      var hasDot = hasStatus(fighter, 'burn') || hasStatus(fighter, 'poison') || hasStatus(fighter, 'bleed');
      if (!hasDot) {
        spawnFloatingText(fighter, 'No effect!', false, '#999999');
        return;
      }
    }

    // Pre-check: Revive — refund if no fainted ally
    if (itemKey === 'Revive Potion') {
      var hasFainted = false;
      for (var ri = 0; ri < battleState.playerTeam.length; ri++) {
        if (!battleState.playerTeam[ri].alive && battleState.playerTeam[ri].id !== fighter.id) {
          hasFainted = true;
          break;
        }
      }
      if (!hasFainted) {
        spawnFloatingText(fighter, 'No target!', false, '#999999');
        return;
      }
    }

    // Consume item
    if (!api.removeItem(itemKey, 1)) return;

    battleState.waitingForInput = false;
    addBattleLog(fighter.name + ' used ' + info.name + '!');

    if (itemKey === 'Health Potion') {
      var healAmt = Math.floor(fighter.maxHp * 0.30);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
      spawnFloatingText(fighter, '+' + healAmt, false, '#44ff44');
    } else if (itemKey === 'Antidote') {
      var cured = [];
      var dots = ['burn', 'poison', 'bleed'];
      for (var di = 0; di < dots.length; di++) {
        if (hasStatus(fighter, dots[di])) {
          removeStatus(fighter, dots[di]);
          cured.push(dots[di]);
        }
      }
      spawnFloatingText(fighter, 'Cured!', false, '#44cc44');
    } else if (itemKey === 'Revive Potion') {
      for (var rvi = 0; rvi < battleState.playerTeam.length; rvi++) {
        var ally = battleState.playerTeam[rvi];
        if (!ally.alive && ally.id !== fighter.id) {
          ally.alive = true;
          ally.hp = Math.floor(ally.maxHp * 0.20);
          ally._deathStart = null;
          ally._deathDur = 0;
          ally.opacity = 1;
          spawnFloatingText(ally, 'Revived!', false, '#ffcc44');
          addBattleLog(ally.name + ' was revived!');
          break;
        }
      }
    } else if (itemKey === 'Bomb') {
      var bombDmg = Math.floor(fighter.atk * 1.5 + 20);
      var bombKilled = [];
      for (var bi = 0; bi < battleState.enemyTeam.length; bi++) {
        var enemy = battleState.enemyTeam[bi];
        if (!enemy.alive) continue;
        var finalDmg = Math.max(1, bombDmg - Math.floor(enemy.def * 0.3));
        enemy.hp = Math.max(0, enemy.hp - finalDmg);
        if (fighter._stats) fighter._stats.dmgDealt += finalDmg;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          bombKilled.push(enemy);
          battleState.kills++;
          if (fighter._stats) fighter._stats.kills++;
          if (enemy.isBoss) battleState._bossKills = (battleState._bossKills || 0) + 1;
          trackBestiaryDefeat(enemy);
          addBattleLog(enemy.name + ' was defeated!');
        }
        spawnFloatingText(enemy, '-' + finalDmg, false, '#ff6644');
      }
      // Trigger death animations for bomb kills
      for (var bk = 0; bk < bombKilled.length; bk++) {
        if (!bombKilled[bk]._deathStart) {
          bombKilled[bk]._deathStart = Date.now();
          bombKilled[bk]._deathDur = getDelay(500);
        }
      }
    }

    // Item use consumes the turn
    setTimeout(function () {
      if (checkBattleEnd()) return;
      advanceTurn(fighter);
    }, getDelay(600));
  }

  function highlightTargets() {
    if (!battleState) return;

    // Taunt enforcement for player targeting (5B-1)
    var taunterIdx = -1;
    for (var ti = 0; ti < battleState.enemyTeam.length; ti++) {
      if (battleState.enemyTeam[ti].alive && hasStatus(battleState.enemyTeam[ti], 'taunt')) {
        taunterIdx = ti;
        break;
      }
    }
    // If taunter found, auto-select them immediately
    if (taunterIdx >= 0 && battleState.selectedMove) {
      executeTurnAction(battleState.activeFighter, battleState.selectedMove, battleState.enemyTeam[taunterIdx]);
      return;
    }

    // Register canvas click handler for target selection
    if (canvas && !canvas._combatClickHandler) {
      canvas._combatClickHandler = function (e) {
        if (!battleState || !battleState.waitingForInput || !battleState.selectedMove) return;
        var rect = canvas.getBoundingClientRect();
        var scaleX = CANVAS_W / rect.width;
        var scaleY = CANVAS_H / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        // Check if clicked on an enemy
        for (var i = 0; i < battleState.enemyTeam.length; i++) {
          var f = battleState.enemyTeam[i];
          if (!f.alive) continue;
          var pos = getFighterPosition(f, i, battleState.enemyTeam);
          var dx = mx - pos.x, dy = my - pos.y;
          if (dx * dx + dy * dy < 900) { // ~30px radius
            executeTurnAction(battleState.activeFighter, battleState.selectedMove, f);
            return;
          }
        }
      };
      canvas.addEventListener('click', canvas._combatClickHandler);
    }

    // Also handle hover for highlight
    if (canvas && !canvas._combatMoveHandler) {
      canvas._combatMoveHandler = function (e) {
        if (!battleState || !battleState.waitingForInput || !battleState.selectedMove) {
          battleState && (battleState.targetHighlight = -1);
          return;
        }
        var rect = canvas.getBoundingClientRect();
        var scaleX = CANVAS_W / rect.width;
        var scaleY = CANVAS_H / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        battleState.targetHighlight = -1;
        for (var i = 0; i < battleState.enemyTeam.length; i++) {
          var f = battleState.enemyTeam[i];
          if (!f.alive) continue;
          var pos = getFighterPosition(f, i, battleState.enemyTeam);
          var dx = mx - pos.x, dy = my - pos.y;
          if (dx * dx + dy * dy < 900) {
            battleState.targetHighlight = i;
            break;
          }
        }
      };
      canvas.addEventListener('mousemove', canvas._combatMoveHandler);
    }
  }

  function renderResultsOverlay() {
    if (!battleState || !battleState.result) return;
    var overlay = $('rpg-combat-results');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rpg-combat-results';
      overlay.className = 'rpg-combat-results';
      if (container) container.appendChild(overlay);
    }

    var r = battleState.result;
    var html = '<div class="rpg-combat-results-inner">';
    html += '<h3 class="rpg-combat-results-title" style="color:' + (r.victory ? '#ffd700' : '#cc4444') + ';text-shadow:0 0 10px ' + (r.victory ? 'rgba(255,215,0,0.3)' : 'rgba(204,68,68,0.3)') + '">' + (r.victory ? 'VICTORY!' : 'DEFEAT') + '</h3>';
    if (battleState.difficulty && battleState.difficulty !== 'normal') {
      var diffLabel = DIFFICULTY_MULTS[battleState.difficulty] ? DIFFICULTY_MULTS[battleState.difficulty].label : (battleState.difficulty.charAt(0).toUpperCase() + battleState.difficulty.slice(1));
      html += '<div class="rpg-combat-results-diff rpg-diff-' + battleState.difficulty + '">' + diffLabel + '</div>';
    }
    html += '<div class="rpg-combat-results-stats">';
    html += '<div>Waves Cleared: ' + r.wavesCleared + '/' + battleState.totalWaves + '</div>';
    html += '<div>Enemies Defeated: ' + r.kills + '</div>';
    html += '<div>GP Earned: <span class="rpg-combat-gp">+' + r.gp + '</span></div>';
    if (r.streakBonus > 0) {
      html += '<div class="rpg-combat-streak-bonus">' + r.streak + '-Win Streak Bonus: +' + r.streakBonus + ' GP!</div>';
    } else if (r.streak > 0 && r.victory) {
      html += '<div style="font-size:0.85em;color:color-mix(in srgb, var(--foreground) 60%, transparent)">Win Streak: ' + r.streak + '</div>';
    }
    html += '<div>Combat XP: <span class="rpg-combat-xp">+' + r.combatXp + '</span></div>';
    if (r.gotStone) {
      html += '<div class="rpg-combat-stone">Evolution Stone (' + r.stoneType + ') obtained!</div>';
    }
    // Dungeon drops
    if (r.droppedItems && r.droppedItems.length > 0) {
      html += '<div class="rpg-combat-drops"><div class="rpg-combat-drops-title">Loot</div>';
      for (var ddi = 0; ddi < r.droppedItems.length; ddi++) {
        var di = r.droppedItems[ddi];
        html += '<div class="rpg-combat-drop-item">' + di.item + ' x' + di.qty + '</div>';
      }
      html += '</div>';
    }
    // Arena milestone
    if (r.arenaMilestone) {
      html += '<div class="rpg-combat-milestone">Arena Milestone: ' + r.arenaMilestone.label + '!</div>';
    }
    html += '</div>';

    // Per-pet XP breakdown
    if (r.petDetails && r.petDetails.length > 0) {
      html += '<div class="rpg-results-pets">';
      for (var pi = 0; pi < r.petDetails.length; pi++) {
        var pd = r.petDetails[pi];
        html += '<div class="rpg-results-pet">';
        html += '<div class="rpg-results-pet-header">';
        html += '<span class="rpg-results-pet-name">' + pd.name + '</span>';
        html += '<span class="rpg-results-pet-xpgain">+' + pd.xpGain + ' XP</span>';
        html += '</div>';
        if (pd.leveled) {
          html += '<div class="rpg-results-pet-levelup">\u2B50 Level Up! Lv ' + pd.oldLevel + ' \u2192 ' + pd.newLevel + ' \u2B50</div>';
        }
        // XP bar (animate fill)
        var xpPct = pd.atCap ? 100 : Math.min(100, Math.floor((pd.xp / pd.xpNeeded) * 100));
        html += '<div class="rpg-results-pet-xpbar"><div class="rpg-results-pet-xpfill' + (pd.atCap ? ' at-cap' : '') + '" data-pct="' + xpPct + '" style="width:0"></div></div>';
        if (pd.atCap) {
          html += '<div class="rpg-results-pet-cap">MAX</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    // Post-combat stats (8-2)
    if (battleState.playerTeam && battleState.playerTeam.length > 0) {
      var anyStats = false;
      for (var si = 0; si < battleState.playerTeam.length; si++) {
        if (battleState.playerTeam[si]._stats && battleState.playerTeam[si]._stats.dmgDealt > 0) { anyStats = true; break; }
      }
      if (anyStats) {
        html += '<div class="rpg-combat-post-stats">';
        html += '<div class="rpg-combat-post-stats-title">Battle Stats</div>';
        for (var pi2 = 0; pi2 < battleState.playerTeam.length; pi2++) {
          var pf = battleState.playerTeam[pi2];
          var st = pf._stats;
          if (!st) continue;
          html += '<div class="rpg-combat-post-stat-row">';
          html += '<span class="rpg-post-stat-name">' + pf.name + '</span>';
          html += '<span class="rpg-post-stat-val">DMG:' + st.dmgDealt + '</span>';
          html += '<span class="rpg-post-stat-val">Taken:' + st.dmgTaken + '</span>';
          html += '<span class="rpg-post-stat-val">Kills:' + st.kills + '</span>';
          if (st.crits > 0) html += '<span class="rpg-post-stat-val">Crits:' + st.crits + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }
    }

    html += '<button class="rpg-btn rpg-btn-primary rpg-combat-continue-btn" id="rpg-combat-continue">Continue</button>';
    html += '</div>';

    overlay.innerHTML = html;
    overlay.style.display = 'flex';

    // Animate XP bar fills
    setTimeout(function () {
      var fills = overlay.querySelectorAll('.rpg-results-pet-xpfill[data-pct]');
      for (var fi = 0; fi < fills.length; fi++) {
        fills[fi].style.width = fills[fi].getAttribute('data-pct') + '%';
      }
    }, 100);

    $('rpg-combat-continue').addEventListener('click', function () {
      overlay.style.display = 'none';
      // Check for pending spec/sub-spec choices before completing
      if (battleState && battleState._pendingSpecs && battleState._pendingSpecs.length > 0) {
        showPendingSpecChoices(battleState._pendingSpecs, function () {
          cleanup();
          if (window.RpgCombat.onComplete) window.RpgCombat.onComplete(r);
        });
      } else {
        cleanup();
        if (window.RpgCombat.onComplete) window.RpgCombat.onComplete(r);
      }
    });
  }

  // ── Modal Overlay Close Helper ──────────────────────
  function attachModalOverlayClose(modal, onDismiss) {
    if (modal._overlayCloseHandler) {
      modal.removeEventListener('click', modal._overlayCloseHandler);
    }
    modal._overlayCloseHandler = function (e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        if (onDismiss) onDismiss();
      }
    };
    modal.addEventListener('click', modal._overlayCloseHandler);
  }

  // ── Dungeon Select Modal ───────────────────────────
  function showDungeonSelect(rpgPets, totalLevel) {
    loadData();
    if (!dungeonData) return;

    var combatSave = loadCombatState();
    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
    }

    var html = '<div class="rpg-modal rpg-dungeon-select">';
    html += '<div class="rpg-modal-header"><h3>Dungeon Gate</h3>';
    html += '<button class="rpg-modal-close" id="rpg-dungeon-close">&times;</button></div>';
    html += '<div class="rpg-dungeon-grid">';

    var diffClears = combatSave.dungeonProgress.difficulties || {};

    for (var i = 0; i < dungeonData.length; i++) {
      var d = dungeonData[i];
      var unlocked = combatSave.dungeonProgress.unlocked.indexOf(d.id) >= 0;
      var meetsLevel = totalLevel >= d.requiredTotalLevel;
      var canEnter = unlocked && meetsLevel;
      var dc = diffClears[d.id] || { normal: false, hard: false, brutal: false };

      html += '<div class="rpg-dungeon-card' + (canEnter ? '' : ' locked') + '">';
      html += '<div class="rpg-dungeon-name">' + d.name + '</div>';
      html += '<div class="rpg-dungeon-stars">';
      for (var s = 0; s < d.stars; s++) html += '<span class="rpg-star">&#9733;</span>';
      html += '</div>';
      html += '<div class="rpg-dungeon-desc">' + d.desc + '</div>';
      html += '<div class="rpg-dungeon-info">' + d.waves.length + ' waves &middot; Party: ' + d.partySize + '</div>';
      if (!unlocked) {
        html += '<div class="rpg-dungeon-lock">Locked</div>';
      } else if (!meetsLevel) {
        html += '<div class="rpg-dungeon-lock">Requires Total Lv ' + d.requiredTotalLevel + '</div>';
      } else {
        // Difficulty buttons
        var hardAvail = dc.normal;
        var brutalAvail = dc.hard;
        html += '<div class="rpg-diff-row">';
        html += '<button class="rpg-diff-btn rpg-diff-normal' + (dc.normal ? ' cleared' : '') + '" data-dungeon-idx="' + i + '" data-diff="normal">N' + (dc.normal ? ' &#10003;' : '') + '</button>';
        html += '<button class="rpg-diff-btn rpg-diff-hard' + (dc.hard ? ' cleared' : '') + (hardAvail ? '' : ' locked') + '" data-dungeon-idx="' + i + '" data-diff="hard"' + (hardAvail ? '' : ' disabled') + '>H' + (dc.hard ? ' &#10003;' : '') + '</button>';
        html += '<button class="rpg-diff-btn rpg-diff-brutal' + (dc.brutal ? ' cleared' : '') + (brutalAvail ? '' : ' locked') + '" data-dungeon-idx="' + i + '" data-diff="brutal"' + (brutalAvail ? '' : ' disabled') + '>B' + (dc.brutal ? ' &#10003;' : '') + '</button>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div></div>';
    modal.innerHTML = html;
    modal.style.display = 'flex';

    $('rpg-dungeon-close').addEventListener('click', function () {
      modal.style.display = 'none';
      if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
    });

    // Difficulty button clicks
    var diffBtns = modal.querySelectorAll('.rpg-diff-btn:not(.locked)');
    for (var ci = 0; ci < diffBtns.length; ci++) {
      diffBtns[ci].addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-dungeon-idx'));
        var diff = this.getAttribute('data-diff');
        var dungeon = dungeonData[idx];
        if (dungeon) {
          modal.style.display = 'none';
          showTeamBuilder(dungeon, rpgPets, diff);
        }
      });
    }

    // Close on overlay click (use stored handler to prevent accumulation)
    attachModalOverlayClose(modal, function () {
      if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
    });
  }

  // ── Team Builder ───────────────────────────────────
  function showTeamBuilder(dungeon, rpgPets, difficulty) {
    difficulty = difficulty || 'normal';
    var modal = $('rpg-dungeon-modal');
    if (!modal) return;

    var ownedIds = Object.keys(rpgPets.owned);
    var selectedPets = [];
    var petAutoFlags = {}; // petId -> bool (per-pet auto toggle in team builder)
    var maxParty = dungeon.partySize || 3;

    function render() {
      var html = '<div class="rpg-modal rpg-team-builder">';
      var diffInfo = DIFFICULTY_MULTS[difficulty] || DIFFICULTY_MULTS.normal;
      html += '<div class="rpg-modal-header"><h3>Build Your Team — ' + dungeon.name + ' <span class="rpg-diff-label rpg-diff-' + difficulty + '">(' + diffInfo.label + ')</span></h3>';
      html += '<button class="rpg-modal-close" id="rpg-team-close">&times;</button></div>';
      html += '<div class="rpg-team-info">Select up to ' + maxParty + ' pets</div>';
      html += '<div class="rpg-team-grid">';

      // Get equipment bonuses once for display
      var equipBonusAtk = 0;
      var equipBonusDef = 0;
      if (typeof window.__RPG_GET_EQUIP_STATS === 'function') {
        var eqStats = window.__RPG_GET_EQUIP_STATS();
        if (eqStats) {
          equipBonusAtk = eqStats.atk || 0;
          equipBonusDef = eqStats.def || 0;
        }
      }

      for (var i = 0; i < ownedIds.length; i++) {
        var pid = ownedIds[i];
        var pet = rpgPets.owned[pid];
        var creature = petCatalog ? petCatalog.creatures[pid] : null;
        if (!creature) continue;
        var isSelected = selectedPets.indexOf(pid) >= 0;
        var stats = getPetCombatStats(pid, pet.level);

        // Determine equip bonus for this pet based on party position
        var petEquipAtk = '';
        var petEquipDef = '';
        if (equipBonusAtk > 0 || equipBonusDef > 0) {
          var selectedIdx = selectedPets.indexOf(pid);
          if (selectedIdx >= 0) {
            var eMult = (selectedIdx === 0) ? 1.0 : 0.5;
            var eAtk = Math.floor(equipBonusAtk * eMult);
            var eDef = Math.floor(equipBonusDef * eMult);
            if (eAtk > 0) petEquipAtk = '(+' + eAtk + ')';
            if (eDef > 0) petEquipDef = '(+' + eDef + ')';
          }
        }

        html += '<div class="rpg-team-pet' + (isSelected ? ' selected' : '') + '" data-pet-id="' + pid + '">';
        html += '<div class="rpg-team-pet-name">' + creature.name + ' Lv' + pet.level + '</div>';
        html += '<div class="rpg-team-pet-type">' + creature.type + (creature.tier ? ' <span class="rpg-arena-rarity-badge rpg-rarity-' + creature.tier + '">' + creature.tier + '</span>' : '') + '</div>';
        html += '<div class="rpg-team-pet-stats">HP:' + stats.hp + ' ATK:' + stats.atk + petEquipAtk + ' DEF:' + stats.def + petEquipDef + '</div>';
        // XP bar
        var petLevelCap = getPetLevelCap(pid);
        var petAtCap = pet.level >= petLevelCap;
        if (!petAtCap) {
          var petXpNeeded = rpgPetXpForLevel(pet.level);
          var petXpPct = Math.min(100, Math.floor(((pet.xp || 0) / petXpNeeded) * 100));
          html += '<div class="rpg-team-pet-xpbar"><div class="rpg-team-pet-xpfill" style="width:' + petXpPct + '%"></div></div>';
        } else {
          html += '<div class="rpg-team-pet-cap">MAX</div>';
        }
        html += '<button class="rpg-team-moves-btn" data-pet-id="' + pid + '">Moves</button>';
        var isAutoOn = !!petAutoFlags[pid];
        html += '<button class="rpg-team-auto-toggle' + (isAutoOn ? ' auto-on' : '') + '" data-pet-id="' + pid + '">' + (isAutoOn ? 'Auto: ON' : 'Auto: OFF') + '</button>';
        if (isSelected) html += '<div class="rpg-team-pet-check">&#10003;</div>';
        html += '</div>';
      }

      html += '</div>';
      html += '<div class="rpg-team-actions">';
      html += '<button class="rpg-btn rpg-btn-primary" id="rpg-team-enter"' + (selectedPets.length === 0 ? ' disabled' : '') + '>Enter Dungeon (' + selectedPets.length + '/' + maxParty + ')</button>';
      html += '</div></div>';

      modal.innerHTML = html;
      modal.style.display = 'flex';

      // Bind events
      $('rpg-team-close').addEventListener('click', function () {
        modal.style.display = 'none';
        if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
      });

      // Moves buttons — open pet detail, stop propagation to avoid toggling selection
      var movesBtns = modal.querySelectorAll('.rpg-team-moves-btn');
      for (var mb = 0; mb < movesBtns.length; mb++) {
        movesBtns[mb].addEventListener('click', function (e) {
          e.stopPropagation();
          var pid = this.getAttribute('data-pet-id');
          showPetDetail(pid, rpgPets, function () {
            // Re-render team builder when pet detail closes
            render();
          });
        });
      }

      // Auto toggle buttons
      var autoBtns = modal.querySelectorAll('.rpg-team-auto-toggle');
      for (var ab = 0; ab < autoBtns.length; ab++) {
        autoBtns[ab].addEventListener('click', function (e) {
          e.stopPropagation();
          var pid = this.getAttribute('data-pet-id');
          petAutoFlags[pid] = !petAutoFlags[pid];
          render();
        });
      }

      var petCells = modal.querySelectorAll('.rpg-team-pet');
      for (var ci = 0; ci < petCells.length; ci++) {
        petCells[ci].addEventListener('click', function (e) {
          if (e.target.classList.contains('rpg-team-moves-btn')) return;
          if (e.target.classList.contains('rpg-team-auto-toggle')) return;
          var pid = this.getAttribute('data-pet-id');
          var idx = selectedPets.indexOf(pid);
          if (idx >= 0) {
            selectedPets.splice(idx, 1);
          } else if (selectedPets.length < maxParty) {
            selectedPets.push(pid);
          }
          render();
        });
      }

      var enterBtn = $('rpg-team-enter');
      if (enterBtn && selectedPets.length > 0) {
        enterBtn.addEventListener('click', function () {
          modal.style.display = 'none';
          // Build party config
          var party = [];
          for (var pi = 0; pi < selectedPets.length; pi++) {
            var pid = selectedPets[pi];
            var pet = rpgPets.owned[pid];
            party.push({
              id: pid,
              level: pet.level,
              xp: pet.xp,
              equippedMoves: pet.equippedMoves || getMovesForPet(pid, pet.level),
              isAuto: !!petAutoFlags[pid]
            });
          }
          // Signal rpg.js to switch to combat
          if (window.__RPG_START_COMBAT) {
            var dm = DIFFICULTY_MULTS[difficulty] || DIFFICULTY_MULTS.normal;
            window.__RPG_START_COMBAT({
              mode: 'dungeon',
              dungeon: dungeon,
              party: party,
              difficulty: difficulty,
              diffMult: dm.stats,
              rewardMult: dm.rewards
            });
          }
        });
      }

      attachModalOverlayClose(modal, function () {
        if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
      });
    }

    render();
  }

  // ── Arena (1v1) Quick Entry ────────────────────────
  var arenaHeaderCache = null; // cached canvas header image

  function renderArenaHeader(modalEl) {
    if (!arenaHeaderCache) {
      // Generate arena BG if not cached
      if (!bgCache['arena']) bgCache['arena'] = generateBattleBg('arena');
      var bgImg = bgCache['arena'];
      if (!bgImg) return;

      // Build header: draw into a temp canvas directly from the BG generation canvas
      var hw = 640, hh = 120;
      var headerCanvas = document.createElement('canvas');
      headerCanvas.width = hw;
      headerCanvas.height = hh;
      var hctx = headerCanvas.getContext('2d');

      // The bgImg is from toDataURL — try drawing; if not ready, use onload
      var drawHeader = function () {
        hctx.drawImage(bgImg, 0, 0, CANVAS_W, Math.floor(hh * (CANVAS_H / 320)), 0, 0, hw, hh);
        var fadeGrad = hctx.createLinearGradient(0, hh * 0.4, 0, hh);
        fadeGrad.addColorStop(0, 'rgba(26,24,8,0)');
        fadeGrad.addColorStop(1, 'rgba(26,24,8,1)');
        hctx.fillStyle = fadeGrad;
        hctx.fillRect(0, 0, hw, hh);
        arenaHeaderCache = headerCanvas.toDataURL();
        applyHeader();
      };

      var applyHeader = function () {
        var wrap = modalEl.querySelector('.rpg-arena-header-canvas');
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.className = 'rpg-arena-header-canvas';
          modalEl.insertBefore(wrap, modalEl.firstChild);
        }
        wrap.style.backgroundImage = 'url(' + arenaHeaderCache + ')';
        wrap.style.backgroundSize = '100% 100%';
      };

      if (bgImg.complete) {
        drawHeader();
      } else {
        bgImg.onload = drawHeader;
      }
    } else {
      // Already cached — just insert
      var wrap = document.createElement('div');
      wrap.className = 'rpg-arena-header-canvas';
      wrap.style.cssText = 'background-image:url(' + arenaHeaderCache + ');background-size:100% 100%';
      modalEl.insertBefore(wrap, modalEl.firstChild);
    }
  }

  function showArenaSelect(rpgPets) {
    loadData();
    if (!enemyData) return;

    var TYPE_CLR = { fire: '#ff6600', aqua: '#4488cc', nature: '#44aa44', tech: '#ccaa22', shadow: '#8844cc', mystic: '#cc44aa', neutral: '#888' };

    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
    }

    var ownedIds = Object.keys(rpgPets.owned);
    var selectedPet = null;
    var arenaOpponent = null;
    var arenaDiff = 'normal';
    var prevWins = null; // track for post-fight animation
    var prevStreak = null;
    var firstRender = true;

    var ARENA_DIFFS = {
      easy:   { stats: 0.75, rewards: 0.75, label: 'Easy', mult: '\u00d70.75' },
      normal: { stats: 1.0,  rewards: 1.0,  label: 'Normal', mult: '\u00d71' },
      hard:   { stats: 1.5,  rewards: 2.0,  label: 'Hard', mult: '\u00d72' }
    };

    function rollOpponent(petLevel) {
      var enemyIds = Object.keys(enemyData);
      var normalEnemies = [];
      for (var ei = 0; ei < enemyIds.length; ei++) {
        if (!enemyData[enemyIds[ei]].isBoss) normalEnemies.push(enemyIds[ei]);
      }
      var eid = normalEnemies[randInt(0, normalEnemies.length - 1)];
      var e = enemyData[eid];
      var stars = Math.max(1, Math.floor(petLevel / 10));
      var eStats = getEnemyCombatStats(eid, stars);
      var dm = ARENA_DIFFS[arenaDiff] ? ARENA_DIFFS[arenaDiff].stats : 1;
      eStats.hp = Math.floor(eStats.hp * dm);
      eStats.atk = Math.floor(eStats.atk * dm);
      eStats.def = Math.floor(eStats.def * dm);
      return { id: eid, name: e.name, type: e.type, stars: stars, stats: eStats, sprite: e.sprite, frameWidth: e.frameWidth, frameHeight: e.frameHeight, frames: e.frames };
    }

    var combatSave = loadCombatState();
    var arenaWins = combatSave.arenaStats.wins || 0;
    var arenaStreak = combatSave.arenaStats.currentStreak || 0;
    var arenaBest = combatSave.arenaStats.bestStreak || 0;

    // Preload all owned pet sprite sheets
    function preloadPetSheets() {
      for (var i = 0; i < ownedIds.length; i++) {
        var pid = ownedIds[i];
        var creature = petCatalog ? petCatalog.creatures[pid] : null;
        if (!creature || !creature.spriteId || !petSpriteData) continue;
        var info = petSpriteData[creature.spriteId];
        if (!info || !info.sheet) continue;
        var pet = rpgPets.owned[pid];
        var petSkin = pet.skin || 'default';
        var url = (petSkin === 'alt' && info.altSheet) ? info.altSheet : info.sheet;
        if (!preloadedImages[url]) {
          var img = new Image();
          img.src = url;
          preloadedImages[url] = img;
        }
      }
    }
    preloadPetSheets();

    function buildPetSpriteStyle(creature, pet, size) {
      if (!creature || !creature.spriteId || !petSpriteData) return '';
      var info = petSpriteData[creature.spriteId];
      if (!info) return '';
      var evoStg = getEvoStage(pet, creature);
      var fw = info.frameWidth || 48;
      var fh = info.frameHeight || 48;
      var frames = info.frames || 3;
      var frameOffset = info.frameOffset || 0;
      var frameIdx = Math.min(frameOffset + evoStg, frames - 1);
      var scale = size / fw;
      var bgW = Math.round(fw * frames * scale);
      var bgH = Math.round(fh * scale);
      var bgX = Math.round(frameIdx * fw * scale);
      var petSkin = pet.skin || 'default';
      var sheetUrl = (petSkin === 'alt' && info.altSheet) ? info.altSheet : info.sheet;
      return 'width:' + size + 'px;height:' + size + 'px;background-image:url(' + sheetUrl + ');background-size:' + bgW + 'px ' + bgH + 'px;background-position:-' + bgX + 'px 0;background-repeat:no-repeat;image-rendering:pixelated';
    }

    function buildEnemySpriteStyle(op, size) {
      if (!op.sprite) return '';
      var fw = op.frameWidth || 32;
      var fh = op.frameHeight || 32;
      var scale = size / Math.max(fw, fh);
      var w = Math.round(fw * scale);
      var h = Math.round(fh * scale);
      return 'width:' + w + 'px;height:' + h + 'px;background-image:url(' + op.sprite + ');background-size:' + w + 'px ' + h + 'px;background-position:0 0;background-repeat:no-repeat;image-rendering:pixelated';
    }

    function render() {
      // Re-read stats (may have changed after a fight)
      combatSave = loadCombatState();
      var newWins = combatSave.arenaStats.wins || 0;
      var newStreak = combatSave.arenaStats.currentStreak || 0;
      var newBest = combatSave.arenaStats.bestStreak || 0;
      var winsChanged = prevWins !== null && newWins !== prevWins;
      prevWins = newWins;
      prevStreak = newStreak;
      arenaWins = newWins;
      arenaStreak = newStreak;
      arenaBest = newBest;

      var html = '<div class="rpg-modal rpg-arena-modal' + (firstRender ? ' rpg-arena-enter' : '') + '">';

      // ── Banner ──
      html += '<div class="rpg-arena-banner">';
      html += '<div class="rpg-arena-title">Training Arena</div>';
      html += '<div class="rpg-arena-subtitle">Choose your champion</div>';

      // Stats row: Wins | Streak | Best
      html += '<div class="rpg-arena-stats-row">';
      html += '<div class="rpg-arena-stat"><span class="rpg-arena-stat-num">' + arenaWins + '</span><span class="rpg-arena-stat-label">Wins</span></div>';
      html += '<div class="rpg-arena-stat-div"></div>';
      html += '<div class="rpg-arena-stat' + (arenaStreak >= 5 ? ' rpg-arena-stat-glow' : '') + '"><span class="rpg-arena-stat-num">' + arenaStreak + '</span><span class="rpg-arena-stat-label">Streak</span></div>';
      html += '<div class="rpg-arena-stat-div"></div>';
      html += '<div class="rpg-arena-stat"><span class="rpg-arena-stat-num">' + arenaBest + '</span><span class="rpg-arena-stat-label">Best</span></div>';
      html += '</div>';

      // Milestone progress bar
      var _msDone = combatSave.arenaStats.milestones || {};
      var _msTargets = [10, 25, 50, 100, 200, 500];
      var nextMs = null;
      for (var msi = 0; msi < _msTargets.length; msi++) {
        if (!_msDone[_msTargets[msi]]) { nextMs = _msTargets[msi]; break; }
      }
      html += '<div class="rpg-arena-milestone">';
      if (nextMs) {
        var msPct = Math.min(100, Math.floor((arenaWins / nextMs) * 100));
        html += '<div class="rpg-arena-ms-track"><div class="rpg-arena-ms-fill" data-pct="' + msPct + '" style="width:' + msPct + '%"></div>';
        html += '<div class="rpg-arena-ms-label">' + arenaWins + '/' + nextMs + ' wins</div></div>';
      } else {
        html += '<div class="rpg-arena-ms-track"><div class="rpg-arena-ms-fill" data-pct="100" style="width:100%"></div>';
        html += '<div class="rpg-arena-ms-label">All milestones claimed!</div></div>';
      }
      html += '</div>';

      // Difficulty tabs
      html += '<div class="rpg-arena-diff-strip">';
      var adiffs = ['easy', 'normal', 'hard'];
      for (var ad = 0; ad < adiffs.length; ad++) {
        var adKey = adiffs[ad];
        var adInfo = ARENA_DIFFS[adKey];
        html += '<button class="rpg-arena-diff-tab rpg-arena-diff-' + adKey + (arenaDiff === adKey ? ' active' : '') + '" data-arena-diff="' + adKey + '">';
        html += '<span class="rpg-arena-diff-name">' + adInfo.label + '</span>';
        html += '<span class="rpg-arena-diff-mult">' + adInfo.mult + '</span>';
        html += '</button>';
      }
      html += '</div>';
      html += '</div>'; // end banner

      html += '<button class="rpg-modal-close" id="rpg-arena-close">&times;</button>';

      // ── Pet Cards Grid ──
      html += '<div class="rpg-arena-grid">';
      for (var i = 0; i < ownedIds.length; i++) {
        var pid = ownedIds[i];
        var pet = rpgPets.owned[pid];
        var creature = petCatalog ? petCatalog.creatures[pid] : null;
        if (!creature) continue;
        var isSelected = (selectedPet === pid);
        var stats = getPetCombatStats(pid, pet.level);
        var tc = TYPE_CLR[creature.type] || '#888';

        html += '<div class="rpg-arena-card' + (isSelected ? ' selected' : '') + '" data-pet-id="' + pid + '" data-pet-type="' + creature.type + '" style="border-bottom:3px solid ' + tc + ';background:linear-gradient(180deg,' + tc + '14 0%,transparent 40%)">';
        // Sprite
        var sprStyle = buildPetSpriteStyle(creature, pet, 48);
        if (sprStyle) {
          html += '<div class="rpg-arena-card-sprite" style="' + sprStyle + '"></div>';
        }
        html += '<div class="rpg-arena-card-name">' + creature.name + '</div>';
        html += '<span class="rpg-arena-card-level">Lv ' + pet.level + '</span>';
        html += ' <span class="rpg-type-badge rpg-type-' + creature.type + '">' + creature.type + '</span>';
        if (creature.tier) html += ' <span class="rpg-arena-rarity-badge rpg-rarity-' + creature.tier + '">' + creature.tier + '</span>';
        html += '<div class="rpg-arena-card-stats">HP:' + stats.hp + ' ATK:' + stats.atk + '</div>';
        // XP bar
        var petLevelCap = getPetLevelCap(pid);
        var petAtCap = pet.level >= petLevelCap;
        if (!petAtCap) {
          var petXpNeeded = rpgPetXpForLevel(pet.level);
          var petXpPct = Math.min(100, Math.floor(((pet.xp || 0) / petXpNeeded) * 100));
          html += '<div class="rpg-arena-card-xp"><div class="rpg-arena-card-xpfill" data-pct="' + petXpPct + '" style="width:' + petXpPct + '%"></div></div>';
        } else {
          html += '<div class="rpg-arena-card-cap">MAX</div>';
        }
        if (isSelected) html += '<div class="rpg-arena-card-check">&#10003;</div>';
        html += '</div>';
      }
      html += '</div>';

      // ── VS Opponent Preview ──
      if (selectedPet && arenaOpponent) {
        var op = arenaOpponent;
        var selPet = rpgPets.owned[selectedPet];
        var selCreature = petCatalog ? petCatalog.creatures[selectedPet] : null;
        var selStats = getPetCombatStats(selectedPet, selPet.level);

        html += '<div class="rpg-arena-vs">';
        // Player side
        html += '<div class="rpg-arena-vs-player">';
        var pSpr = selCreature ? buildPetSpriteStyle(selCreature, selPet, 48) : '';
        if (pSpr) html += '<div class="rpg-arena-vs-sprite" style="' + pSpr + '"></div>';
        html += '<div class="rpg-arena-vs-name">' + (selCreature ? selCreature.name : selectedPet) + '</div>';
        html += '<div class="rpg-arena-vs-stat-list">';
        var pStats = ['hp', 'atk', 'def', 'spd'];
        for (var ps = 0; ps < pStats.length; ps++) {
          var pk = pStats[ps];
          var pv = selStats[pk], ev = op.stats[pk];
          var cmp = pv > ev ? 'adv' : pv < ev ? 'dis' : 'neu';
          html += '<span class="rpg-arena-vs-stat rpg-arena-vs-' + cmp + '">' + pk.toUpperCase() + ':' + pv + '</span>';
        }
        html += '</div></div>';

        // Center VS
        html += '<div class="rpg-arena-vs-center"><span class="rpg-arena-vs-text">VS</span></div>';

        // Enemy side
        html += '<div class="rpg-arena-vs-enemy">';
        var eSpr = buildEnemySpriteStyle(op, 48);
        if (eSpr) html += '<div class="rpg-arena-vs-sprite" id="rpg-arena-enemy-spr" style="' + eSpr + '"></div>';
        html += '<div class="rpg-arena-vs-name">' + op.name + ' <span class="rpg-type-badge rpg-type-' + op.type + '">' + op.type + '</span></div>';
        html += '<div class="rpg-arena-vs-stat-list">';
        for (var es = 0; es < pStats.length; es++) {
          var ek = pStats[es];
          var evv = op.stats[ek], pvv = selStats[ek];
          var ecmp = evv > pvv ? 'adv' : evv < pvv ? 'dis' : 'neu';
          html += '<span class="rpg-arena-vs-stat rpg-arena-vs-' + ecmp + '">' + ek.toUpperCase() + ':' + evv + '</span>';
        }
        html += '</div></div>';
        html += '</div>';
      }

      // ── Fight Button ──
      html += '<div class="rpg-arena-fight-wrap">';
      html += '<button class="rpg-arena-fight-btn" id="rpg-arena-fight"' + (!selectedPet ? ' disabled' : '') + '>FIGHT!</button>';
      html += '</div></div>';

      modal.innerHTML = html;
      modal.style.display = 'flex';

      // Insert canvas header
      var innerModal = modal.querySelector('.rpg-arena-modal');
      if (innerModal) renderArenaHeader(innerModal);

      // Preload enemy sprite if needed
      if (arenaOpponent && arenaOpponent.sprite && !preloadedImages[arenaOpponent.sprite]) {
        var eImg = new Image();
        eImg.onload = function () {
          preloadedImages[arenaOpponent.sprite] = eImg;
          var el = $('rpg-arena-enemy-spr');
          if (el) el.style.backgroundImage = 'url(' + arenaOpponent.sprite + ')';
        };
        eImg.src = arenaOpponent.sprite;
      }

      firstRender = false;

      // Close
      $('rpg-arena-close').addEventListener('click', function () {
        modal.style.display = 'none';
        if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
      });

      // Difficulty tabs
      var arenaDiffBtns = modal.querySelectorAll('[data-arena-diff]');
      for (var db = 0; db < arenaDiffBtns.length; db++) {
        arenaDiffBtns[db].addEventListener('click', function () {
          arenaDiff = this.getAttribute('data-arena-diff');
          if (selectedPet) {
            var pet = rpgPets.owned[selectedPet];
            arenaOpponent = rollOpponent(pet ? pet.level : 1);
          }
          render();
        });
      }

      // Pet card clicks
      var petCells = modal.querySelectorAll('.rpg-arena-card');
      for (var ci = 0; ci < petCells.length; ci++) {
        petCells[ci].addEventListener('click', function () {
          selectedPet = this.getAttribute('data-pet-id');
          var pet = rpgPets.owned[selectedPet];
          arenaOpponent = rollOpponent(pet ? pet.level : 1);
          render();
        });
      }

      var fightBtn = $('rpg-arena-fight');
      if (fightBtn && selectedPet && arenaOpponent) {
        fightBtn.addEventListener('click', function () {
          modal.style.display = 'none';
          var pet = rpgPets.owned[selectedPet];
          var level = pet ? pet.level : 1;

          if (window.__RPG_START_COMBAT) {
            var adm = ARENA_DIFFS[arenaDiff] || ARENA_DIFFS.normal;
            window.__RPG_START_COMBAT({
              mode: 'arena',
              party: [{
                id: selectedPet,
                level: level,
                xp: pet ? pet.xp : 0,
                equippedMoves: (pet && pet.equippedMoves) ? pet.equippedMoves : getMovesForPet(selectedPet, level)
              }],
              enemies: [arenaOpponent.id],
              stars: arenaOpponent.stars,
              difficulty: arenaDiff,
              diffMult: adm.stats,
              rewardMult: adm.rewards
            });
          }
        });
      }

      attachModalOverlayClose(modal, function () {
        if (window.__RPG_RETURN_TO_MAP) window.__RPG_RETURN_TO_MAP();
      });
    }

    render();
  }

  // ── Init / Cleanup ─────────────────────────────────
  function init(canvasEl, containerEl) {
    canvas = canvasEl;
    ctx = canvas ? canvas.getContext('2d') : null;
    container = containerEl;
    if (canvas) {
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
    }
    loadData();
  }

  function cleanup() {
    stopAnimLoop();
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
    if (canvas) {
      if (canvas._combatClickHandler) {
        canvas.removeEventListener('click', canvas._combatClickHandler);
        canvas._combatClickHandler = null;
      }
      if (canvas._combatMoveHandler) {
        canvas.removeEventListener('mousemove', canvas._combatMoveHandler);
        canvas._combatMoveHandler = null;
      }
    }
    if (document._combatKeyHandler) {
      document.removeEventListener('keydown', document._combatKeyHandler);
      document._combatKeyHandler = null;
    }
    flushBestiaryUpdates(); // safety flush if any pending
    battleState = null;
    floatingTexts = [];
    activeVfx = [];
    // speedMult preserved across battles (8-5), restored from save in renderBattleUI
    var overlay = $('rpg-combat-results');
    if (overlay) overlay.style.display = 'none';
    var moveBtns = $('rpg-combat-moves');
    if (moveBtns) moveBtns.innerHTML = '';
  }

  // Run from battle (5B-4): reduced rewards (25%)
  function runFromBattle() {
    if (!battleState || battleState.phase === 'results') return;
    // Apply 25% reward penalty for running
    battleState.rewardMult = (battleState.rewardMult || 1) * 0.25;
    addBattleLog('You fled the battle!');
    showResults(false);
  }

  function isActive() {
    return battleState !== null && battleState.phase !== 'results';
  }

  function toggleAuto(enabled, fighterIndex) {
    if (!battleState) return;
    if (typeof fighterIndex === 'number') {
      // Per-pet toggle
      if (battleState.playerTeam[fighterIndex]) {
        battleState.playerTeam[fighterIndex].isAuto = enabled;
      }
    } else {
      // All pets
      for (var i = 0; i < battleState.playerTeam.length; i++) {
        battleState.playerTeam[i].isAuto = enabled;
      }
    }
    // If currently waiting for manual input and active pet is now auto, kick off AI
    if (enabled && battleState.waitingForInput && battleState.activeFighter && battleState.activeFighter.isAuto) {
      battleState.waitingForInput = false;
      if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
      var aiChoice = aiSelectMove(battleState.activeFighter);
      if (aiChoice) {
        executeTurnAction(battleState.activeFighter, aiChoice.moveId, aiChoice.target);
      }
    }
    renderFrame();
  }

  // ── Pet Detail + Move Management Popup ─────────────
  function showPetDetail(petId, rpgPets, onClose) {
    loadData();
    if (!petCatalog || !moveData) return;
    var creature = petCatalog.creatures[petId];
    if (!creature) return;
    var pet = rpgPets.owned[petId];
    if (!pet) return;

    // Ensure moves are initialized (may modify state via __RPG_GET/SAVE_PET_STATE)
    initPetMoves(petId, pet.level);
    // Re-read pet in case initPetMoves wrote to a different object reference
    if (window.__RPG_GET_PET_STATE) {
      var freshState = window.__RPG_GET_PET_STATE();
      if (freshState && freshState.owned[petId]) {
        pet = freshState.owned[petId];
        rpgPets = freshState;
      }
    }

    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
    }
    // Re-append to body to ensure it stacks on top of any other overlays
    document.body.appendChild(modal);

    function render() {
      var stats = getPetCombatStats(petId, pet.level);
      var equipped = pet.equippedMoves || [];
      var learned = pet.learnedMoves || [];

      // Separate unequipped learned moves
      var unequipped = [];
      for (var i = 0; i < learned.length; i++) {
        if (equipped.indexOf(learned[i]) < 0) unequipped.push(learned[i]);
      }

      var html = '<div class="rpg-modal rpg-pet-detail">';
      html += '<div class="rpg-modal-header">';
      html += '<div class="rpg-detail-header-row"><div id="rpg-detail-sprite-wrap"></div><h3>' + creature.name + '</h3></div>';
      html += '<button class="rpg-modal-close" id="rpg-detail-close">&times;</button></div>';

      // Pet info
      html += '<div class="rpg-detail-info">';
      html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Type:</span> <span class="rpg-type-badge rpg-type-' + creature.type + '">' + creature.type + '</span></div>';
      html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Level:</span> ' + pet.level + '</div>';
      html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Tier:</span> ' + creature.tier + '</div>';

      // Spec display
      if (specData && specData.paths) {
        var specLvl = specData.specLevel || 5;
        var subLvl = specData.subSpecLevel || 30;
        if (pet.spec && specData.paths[pet.spec]) {
          var sp = specData.paths[pet.spec];
          var specLabel = sp.icon + ' ' + sp.name;
          if (pet.subSpec && sp.subSpecs && sp.subSpecs[pet.subSpec]) {
            specLabel += ' / ' + sp.subSpecs[pet.subSpec].icon + ' ' + sp.subSpecs[pet.subSpec].name;
          } else if (!pet.subSpec && pet.level >= subLvl) {
            specLabel += ' <button class="rpg-btn rpg-btn-tiny rpg-btn-accent" id="rpg-choose-spec-btn">Choose Sub-Spec</button>';
          }
          html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Spec:</span> ' + specLabel;
          html += ' <button class="rpg-btn rpg-btn-tiny" id="rpg-respec-btn">Respec (' + (specData.respecCost || 1000) + ' GP)</button>';
          html += '</div>';
        } else if (pet.level >= specLvl) {
          html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Spec:</span> <button class="rpg-btn rpg-btn-tiny rpg-btn-accent" id="rpg-choose-spec-btn">Choose Spec</button></div>';
        } else {
          html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Spec:</span> <span style="opacity:0.5">Unlocks at Lv' + specLvl + '</span></div>';
        }
      }

      // XP bar — show MAX at cap
      var currentCap = getPetLevelCap(petId);
      var atCap = pet.level >= currentCap;
      var needed = rpgPetXpForLevel(pet.level);
      var xpPct = atCap ? 100 : Math.min(100, Math.floor(((pet.xp || 0) / needed) * 100));
      var xpText = atCap ? 'MAX (Cap: ' + currentCap + ')' : (pet.xp || 0) + '/' + needed + ' XP';
      html += '<div class="rpg-detail-xp"><div class="rpg-detail-xp-fill" style="width:' + xpPct + '%"></div><span class="rpg-detail-xp-text">' + xpText + '</span></div>';

      // Stats
      html += '<div class="rpg-detail-stats">';
      html += '<span>HP:' + stats.hp + '</span>';
      html += '<span>ATK:' + stats.atk + '</span>';
      html += '<span>DEF:' + stats.def + '</span>';
      html += '<span>SPD:' + stats.spd + '</span>';
      html += '<span>CRI:' + stats.cri + '</span>';
      html += '</div>';

      // Evolution section
      var evoInfo = canEvolve(petId);
      var evoStage = getEvoStage(pet, creature);
      var tierData = EVOLUTION_TIERS[creature.tier] || EVOLUTION_TIERS.common;
      html += '<div class="rpg-detail-row" style="margin-top:4px"><span class="rpg-detail-label">Cap:</span> ' + currentCap;
      if (evoStage + 1 < tierData.length) {
        html += ' → ' + tierData[evoStage + 1].cap;
      }
      html += '</div>';

      if (evoInfo) {
        html += '<div class="rpg-detail-evo">';
        var combatSave = loadCombatState();
        var stonesHeld = (combatSave.stones && combatSave.stones[evoInfo.stoneType]) || 0;
        var gpHeld = window.Wallet ? window.Wallet.getBalance() : 0;
        html += '<div class="rpg-detail-evo-cost">';
        html += '<span class="' + (evoInfo.hasStones ? 'evo-met' : 'evo-unmet') + '">' + evoInfo.stoneType + ' stone: ' + stonesHeld + '/' + evoInfo.stoneCost + '</span>';
        html += '<span class="' + (evoInfo.hasGp ? 'evo-met' : 'evo-unmet') + '">GP: ' + gpHeld + '/' + evoInfo.gpCost + '</span>';
        html += '</div>';
        html += '<button class="rpg-btn rpg-btn-primary rpg-detail-evo-btn" id="rpg-evolve-btn"' + (evoInfo.canDo ? '' : ' disabled') + '>Evolve → Cap ' + evoInfo.nextCap + '</button>';
        html += '</div>';
      } else if (evoStage + 1 >= tierData.length) {
        html += '<div class="rpg-detail-evo"><span class="evo-met" style="font-size:0.75em">Max evolution reached</span></div>';
      }

      html += '</div>';

      // Equipped moves (4 slots)
      html += '<div class="rpg-detail-section">';
      html += '<div class="rpg-detail-section-title">Equipped Moves (' + equipped.length + '/4)</div>';
      html += '<div class="rpg-detail-equipped">';
      for (var e = 0; e < 4; e++) {
        if (e < equipped.length) {
          var m = moveData[equipped[e]];
          if (m) {
            html += '<div class="rpg-detail-move equipped" data-move-id="' + equipped[e] + '" data-action="unequip">';
            html += '<div class="rpg-detail-move-header">';
            html += '<span class="rpg-detail-move-name" data-type="' + m.type + '">' + m.name + '</span>';
            html += '<span class="rpg-detail-move-power">' + (m.power > 0 ? m.power : '--') + '</span>';
            html += '</div>';
            html += '<div class="rpg-detail-move-desc">' + m.desc + '</div>';
            html += '<div class="rpg-detail-move-meta">';
            html += '<span class="rpg-type-badge rpg-type-' + m.type + '">' + m.type + '</span>';
            html += '<span>' + m.category + '</span>';
            if (m.cooldown > 0) html += '<span>CD:' + m.cooldown + '</span>';
            if (m.effect) html += '<span>' + m.effect + '</span>';
            if (m.aoe) html += '<span>AoE</span>';
            html += '</div>';
            html += '<div class="rpg-detail-move-action">click to unequip</div>';
            html += '</div>';
          }
        } else {
          html += '<div class="rpg-detail-move empty"><span class="rpg-detail-move-empty">— empty slot —</span></div>';
        }
      }
      html += '</div></div>';

      // Learned moves (not equipped)
      if (unequipped.length > 0) {
        html += '<div class="rpg-detail-section">';
        html += '<div class="rpg-detail-section-title">Available Moves (' + unequipped.length + ')</div>';
        html += '<div class="rpg-detail-available">';
        for (var u = 0; u < unequipped.length; u++) {
          var m = moveData[unequipped[u]];
          if (!m) continue;
          var canEquip = equipped.length < 4;
          html += '<div class="rpg-detail-move available' + (canEquip ? '' : ' full') + '" data-move-id="' + unequipped[u] + '" data-action="equip">';
          html += '<div class="rpg-detail-move-header">';
          html += '<span class="rpg-detail-move-name" data-type="' + m.type + '">' + m.name + '</span>';
          html += '<span class="rpg-detail-move-power">' + (m.power > 0 ? m.power : '--') + '</span>';
          html += '</div>';
          html += '<div class="rpg-detail-move-desc">' + m.desc + '</div>';
          html += '<div class="rpg-detail-move-meta">';
          html += '<span class="rpg-type-badge rpg-type-' + m.type + '">' + m.type + '</span>';
          html += '<span>' + m.category + '</span>';
          if (m.cooldown > 0) html += '<span>CD:' + m.cooldown + '</span>';
          if (m.effect) html += '<span>' + m.effect + '</span>';
          if (m.aoe) html += '<span>AoE</span>';
          html += '</div>';
          if (canEquip) html += '<div class="rpg-detail-move-action">click to equip</div>';
          html += '</div>';
        }
        html += '</div></div>';
      }

      html += '</div>';
      modal.innerHTML = html;
      modal.style.display = 'flex';

      // Insert pet sprite into header
      var spriteWrap = $('rpg-detail-sprite-wrap');
      if (spriteWrap && petSpriteData) {
        var spriteId = creature.spriteId;
        var info = petSpriteData[spriteId];
        if (info) {
          var evoStg = getEvoStage(pet, creature);
          var fw = info.frameWidth || 48;
          var fh = info.frameHeight || 48;
          var frames = info.frames || 3;
          var frameOffset = info.frameOffset || 0;
          var frameIdx = Math.min(frameOffset + evoStg, frames - 1);
          var ds = 48;
          var scale = ds / fw;
          var bgW = Math.round(fw * frames * scale);
          var bgH = Math.round(fh * scale);
          var bgX = Math.round(frameIdx * fw * scale);
          var petSkin = pet.skin || 'default';
          var sheetUrl = (petSkin === 'alt' && info.altSheet) ? info.altSheet : info.sheet;
          var spr = document.createElement('div');
          spr.id = 'rpg-detail-sprite';
          spr.style.cssText = 'width:' + ds + 'px;height:' + ds + 'px;background-image:url(' + sheetUrl + ');background-size:' + bgW + 'px ' + bgH + 'px;background-position:-' + bgX + 'px 0;background-repeat:no-repeat;image-rendering:pixelated;flex-shrink:0';
          spriteWrap.appendChild(spr);
        }
      }

      // Close button
      $('rpg-detail-close').addEventListener('click', function () {
        modal.style.display = 'none';
        if (onClose) onClose();
      });

      // Respec button
      var respecBtn = $('rpg-respec-btn');
      if (respecBtn) {
        respecBtn.addEventListener('click', function () {
          if (respecPet(petId)) {
            if (window.__RPG_GET_PET_STATE) {
              var freshState = window.__RPG_GET_PET_STATE();
              if (freshState && freshState.owned[petId]) {
                pet = freshState.owned[petId];
                rpgPets = freshState;
              }
            }
            render();
          }
        });
      }

      // Choose spec button (for pets that skipped the post-combat prompt)
      var chooseSpecBtn = $('rpg-choose-spec-btn');
      if (chooseSpecBtn) {
        chooseSpecBtn.addEventListener('click', function () {
          modal.style.display = 'none';
          var cType = (!pet.spec) ? 'spec' : 'subSpec';
          showSpecChoiceModal(petId, creature.name, cType, function () {
            // Re-read state after spec choice
            if (window.__RPG_GET_PET_STATE) {
              var freshState = window.__RPG_GET_PET_STATE();
              if (freshState && freshState.owned[petId]) {
                pet = freshState.owned[petId];
                rpgPets = freshState;
              }
            }
            modal.style.display = 'flex';
            render();
          });
        });
      }

      // Move click handlers
      var moveDivs = modal.querySelectorAll('.rpg-detail-move[data-action]');
      for (var d = 0; d < moveDivs.length; d++) {
        moveDivs[d].addEventListener('click', function () {
          var mid = this.getAttribute('data-move-id');
          var action = this.getAttribute('data-action');
          if (action === 'unequip') {
            if (pet.equippedMoves.length <= 1) return; // can't unequip last move
            var idx = pet.equippedMoves.indexOf(mid);
            if (idx >= 0) pet.equippedMoves.splice(idx, 1);
          } else if (action === 'equip') {
            if (pet.equippedMoves.length < 4 && pet.equippedMoves.indexOf(mid) < 0) {
              pet.equippedMoves.push(mid);
            }
          }
          if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);
          render();
        });
      }

      // Evolve button
      var evoBtn = $('rpg-evolve-btn');
      if (evoBtn) {
        evoBtn.addEventListener('click', function () {
          var sprEl = $('rpg-detail-sprite');
          var evoCheck = canEvolve(petId);
          if (sprEl && evoCheck && evoCheck.canDo) {
            // Disable button during animation
            evoBtn.disabled = true;
            // Phase 1: Glow (400ms)
            sprEl.classList.add('rpg-evo-glow');
            setTimeout(function () {
              // Phase 2: Shake (400ms)
              sprEl.classList.add('rpg-evo-shake');
              setTimeout(function () {
                // Phase 3: Flash
                sprEl.classList.add('rpg-evo-flash');
                // Execute evolution during flash
                if (evolvePet(petId)) {
                  if (window.__RPG_GET_PET_STATE) {
                    var freshState = window.__RPG_GET_PET_STATE();
                    if (freshState && freshState.owned[petId]) {
                      pet = freshState.owned[petId];
                      rpgPets = freshState;
                    }
                  }
                }
                setTimeout(function () {
                  render();
                }, 400);
              }, 400);
            }, 400);
          } else if (evolvePet(petId)) {
            // Fallback: no sprite element, just evolve
            if (window.__RPG_GET_PET_STATE) {
              var freshState = window.__RPG_GET_PET_STATE();
              if (freshState && freshState.owned[petId]) {
                pet = freshState.owned[petId];
                rpgPets = freshState;
              }
            }
            render();
          }
        });
      }

      // Overlay click to close (with callback)
      if (modal._overlayCloseHandler) modal.removeEventListener('click', modal._overlayCloseHandler);
      modal._overlayCloseHandler = function (e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          if (onClose) onClose();
        }
      };
      modal.addEventListener('click', modal._overlayCloseHandler);
    }

    render();
  }

  // ── Spec Choice UI ────────────────────────────────
  function showPendingSpecChoices(queue, onDone) {
    if (!queue || queue.length === 0) { if (onDone) onDone(); return; }
    var item = queue.shift();
    showSpecChoiceModal(item.petId, item.petName, item.type, function () {
      // Process next in queue
      showPendingSpecChoices(queue, onDone);
    });
  }

  function showSpecChoiceModal(petId, petName, choiceType, onDone) {
    loadData();
    if (!specData || !specData.paths) { if (onDone) onDone(); return; }

    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
    }
    document.body.appendChild(modal); // ensure on top

    var rpgPets = window.__RPG_GET_PET_STATE ? window.__RPG_GET_PET_STATE() : null;
    var pet = rpgPets ? rpgPets.owned[petId] : null;

    var options = [];
    if (choiceType === 'spec') {
      // Main spec choice: show all 3 paths
      for (var pid in specData.paths) {
        var p = specData.paths[pid];
        options.push({ key: pid, name: p.name, icon: p.icon, desc: p.desc, bonuses: p.bonuses });
      }
    } else if (choiceType === 'subSpec' && pet && pet.spec) {
      // Sub-spec choice: show sub-specs of current path
      var path = specData.paths[pet.spec];
      if (path && path.subSpecs) {
        for (var sid in path.subSpecs) {
          var s = path.subSpecs[sid];
          options.push({ key: sid, name: s.name, icon: s.icon, desc: s.desc, bonuses: s.bonuses });
        }
      }
    }

    if (options.length === 0) { if (onDone) onDone(); return; }

    var title = choiceType === 'spec'
      ? petName + ' reached Level ' + (specData.specLevel || 5) + '! Choose a Specialization:'
      : petName + ' reached Level ' + (specData.subSpecLevel || 30) + '! Choose a Sub-Specialization:';

    var html = '<div class="rpg-modal rpg-spec-modal">';
    html += '<div class="rpg-modal-header"><h3>' + title + '</h3></div>';
    html += '<div class="rpg-spec-options">';
    for (var o = 0; o < options.length; o++) {
      var opt = options[o];
      html += '<button class="rpg-spec-option" data-spec-key="' + opt.key + '">';
      html += '<div class="rpg-spec-option-name">' + (opt.icon || '') + ' ' + opt.name + '</div>';
      html += '<div class="rpg-spec-option-desc">' + opt.desc + '</div>';
      html += '<div class="rpg-spec-option-bonuses">';
      for (var bk in opt.bonuses) {
        html += '<span>+' + Math.round(opt.bonuses[bk] * 100) + '% ' + bk.toUpperCase() + '</span>';
      }
      html += '</div>';
      html += '</button>';
    }
    html += '</div>';
    html += '<div style="padding:0 16px 12px;text-align:center"><button class="rpg-btn rpg-btn-small" id="rpg-spec-defer">Decide Later</button></div>';
    html += '</div>';

    modal.innerHTML = html;
    modal.style.display = 'flex';

    // "Decide Later" button — skip without choosing
    var deferBtn = $('rpg-spec-defer');
    if (deferBtn) {
      deferBtn.addEventListener('click', function () {
        modal.style.display = 'none';
        if (onDone) onDone();
      });
    }

    var specBtns = modal.querySelectorAll('.rpg-spec-option');
    for (var b = 0; b < specBtns.length; b++) {
      specBtns[b].addEventListener('click', function () {
        var key = this.getAttribute('data-spec-key');
        // Save choice and clear pending flag
        var freshPets = window.__RPG_GET_PET_STATE ? window.__RPG_GET_PET_STATE() : null;
        if (freshPets && freshPets.owned[petId]) {
          if (choiceType === 'spec') {
            freshPets.owned[petId].spec = key;
            delete freshPets.owned[petId].needsSpec;
            // If also past sub-spec level, flag for later
            var subLv = specData.subSpecLevel || 30;
            if (freshPets.owned[petId].level >= subLv && !freshPets.owned[petId].subSpec) {
              freshPets.owned[petId].needsSubSpec = true;
            }
          } else {
            freshPets.owned[petId].subSpec = key;
            delete freshPets.owned[petId].needsSubSpec;
          }
          if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(freshPets);
        }
        var choiceName = '';
        for (var oi = 0; oi < options.length; oi++) {
          if (options[oi].key === key) choiceName = options[oi].name;
        }
        if (window.__RPG_ADD_GAME_MESSAGE) {
          window.__RPG_ADD_GAME_MESSAGE(petName + ' specialized as ' + choiceName + '!', 'reward');
        }

        // Check if new moves are now learnable with this spec
        if (freshPets && freshPets.owned[petId]) {
          var p = freshPets.owned[petId];
          var newMoves = checkNewMovesLearned(petId, p.level - 1, p.level);
          for (var nm = 0; nm < newMoves.length; nm++) {
            if (window.__RPG_ADD_GAME_MESSAGE) {
              window.__RPG_ADD_GAME_MESSAGE(petName + ' learned ' + newMoves[nm].name + '!', 'reward');
            }
          }
        }

        modal.style.display = 'none';
        if (onDone) onDone();
      });
    }
  }

  function respecPet(petId) {
    loadData();
    if (!specData) return false;
    var rpgPets = window.__RPG_GET_PET_STATE ? window.__RPG_GET_PET_STATE() : null;
    if (!rpgPets || !rpgPets.owned[petId]) return false;
    var pet = rpgPets.owned[petId];
    if (!pet.spec) return false;

    var cost = specData.respecCost || 1000;
    if (!window.Wallet || window.Wallet.getBalance() < cost) return false;

    window.Wallet.deduct(cost);

    // Remove spec-gated moves from equipped/learned
    if (pet.equippedMoves && moveData) {
      pet.equippedMoves = pet.equippedMoves.filter(function (mid) {
        var m = moveData[mid];
        return !m || !m.specRequired;
      });
    }
    if (pet.learnedMoves && moveData) {
      pet.learnedMoves = pet.learnedMoves.filter(function (mid) {
        var m = moveData[mid];
        return !m || !m.specRequired;
      });
    }

    pet.spec = null;
    pet.subSpec = null;
    pet.needsSpec = true;
    delete pet.needsSubSpec;
    if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);
    return true;
  }

  // ── Bestiary (8-3) ────────────────────────────────
  // Pending bestiary updates — batched and flushed once via flushBestiaryUpdates
  var _bestiaryPendingDefeats = {};

  function trackBestiarySeen(enemies) {
    var cs = loadCombatState();
    if (!cs.bestiary) cs.bestiary = {};
    var changed = false;
    for (var i = 0; i < enemies.length; i++) {
      var baseId = enemies[i].id.replace(/-\d+$/, ''); // strip wave index suffix
      if (!cs.bestiary[baseId]) {
        cs.bestiary[baseId] = { seen: true, defeated: 0 };
        changed = true;
      }
    }
    if (changed) saveCombatState(cs);
  }

  function trackBestiaryDefeat(fighter) {
    var baseId = fighter.id.replace(/-\d+$/, '');
    _bestiaryPendingDefeats[baseId] = (_bestiaryPendingDefeats[baseId] || 0) + 1;
  }

  function flushBestiaryUpdates() {
    var keys = Object.keys(_bestiaryPendingDefeats);
    if (keys.length === 0) return;
    var cs = loadCombatState();
    if (!cs.bestiary) cs.bestiary = {};
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      if (!cs.bestiary[id]) cs.bestiary[id] = { seen: true, defeated: 0 };
      cs.bestiary[id].defeated += _bestiaryPendingDefeats[id];
    }
    _bestiaryPendingDefeats = {};
    saveCombatState(cs);
  }

  function showBestiary() {
    loadData();
    var cs = loadCombatState();
    if (!cs.bestiary) cs.bestiary = {};
    var modal = document.getElementById('rpg-bestiary-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-bestiary-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
      attachModalOverlayClose(modal);
    }

    var allEnemies = enemyData ? Object.keys(enemyData) : [];
    var html = '<div class="rpg-modal rpg-bestiary">';
    html += '<div class="rpg-modal-header"><h3>Bestiary</h3>';
    html += '<button class="rpg-modal-close" id="rpg-bestiary-close">&times;</button></div>';

    // Count stats
    var seenCount = 0, totalCount = allEnemies.length;
    for (var sc = 0; sc < allEnemies.length; sc++) {
      if (cs.bestiary[allEnemies[sc]]) seenCount++;
    }
    html += '<div class="rpg-bestiary-summary">Discovered: ' + seenCount + ' / ' + totalCount + '</div>';

    html += '<div class="rpg-bestiary-grid">';
    for (var ei = 0; ei < allEnemies.length; ei++) {
      var eid = allEnemies[ei];
      var ed = enemyData[eid];
      var entry = cs.bestiary[eid];
      var discovered = !!entry;

      html += '<div class="rpg-bestiary-entry' + (discovered ? '' : ' undiscovered') + '" data-enemy-id="' + eid + '">';
      if (discovered) {
        html += '<div class="rpg-bestiary-sprite" data-sprite="' + (ed.sprite || '') + '" data-fw="' + (ed.frameWidth || 32) + '" data-fh="' + (ed.frameHeight || 32) + '"></div>';
        html += '<div class="rpg-bestiary-name">' + ed.name + '</div>';
        html += '<div class="rpg-bestiary-defeated">x' + (entry.defeated || 0) + '</div>';
      } else {
        html += '<div class="rpg-bestiary-sprite unknown"></div>';
        html += '<div class="rpg-bestiary-name">???</div>';
      }
      html += '</div>';
    }
    html += '</div></div>';

    modal.innerHTML = html;
    modal.style.display = 'flex';

    // Load sprites into divs (use Image to get natural dimensions for correct backgroundSize)
    var spriteDivs = modal.querySelectorAll('.rpg-bestiary-sprite[data-sprite]');
    for (var si = 0; si < spriteDivs.length; si++) {
      (function (sd) {
        var src = sd.getAttribute('data-sprite');
        var fw = parseInt(sd.getAttribute('data-fw')) || 32;
        var fh = parseInt(sd.getAttribute('data-fh')) || 32;
        if (!src) return;
        sd.style.width = fw + 'px';
        sd.style.height = fh + 'px';
        sd.style.imageRendering = 'pixelated';
        var img = new Image();
        img.onload = function () {
          sd.style.backgroundImage = 'url(' + src + ')';
          sd.style.backgroundPosition = '0 0';
          sd.style.backgroundSize = img.naturalWidth + 'px ' + img.naturalHeight + 'px';
        };
        img.src = src;
      })(spriteDivs[si]);
    }

    // Click for detail
    var entries = modal.querySelectorAll('.rpg-bestiary-entry:not(.undiscovered)');
    for (var ci = 0; ci < entries.length; ci++) {
      entries[ci].addEventListener('click', (function (eidLocal) {
        return function () { showBestiaryDetail(eidLocal); };
      })(entries[ci].getAttribute('data-enemy-id')));
    }

    document.getElementById('rpg-bestiary-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });
  }

  function showBestiaryDetail(enemyId) {
    loadData();
    var ed = enemyData ? enemyData[enemyId] : null;
    if (!ed) return;
    var cs = loadCombatState();
    if (!cs.bestiary) cs.bestiary = {};
    var entry = cs.bestiary[enemyId] || { seen: true, defeated: 0 };

    var TYPE_COLORS = { fire: '#ff6600', aqua: '#4488cc', nature: '#44aa44', tech: '#ccaa22', shadow: '#8844cc', mystic: '#cc44aa', neutral: '#888' };

    var modal = document.getElementById('rpg-bestiary-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-bestiary-detail-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
      attachModalOverlayClose(modal);
    }

    var html = '<div class="rpg-modal rpg-bestiary-detail">';
    html += '<div class="rpg-modal-header"><h3>' + ed.name + '</h3>';
    html += '<button class="rpg-modal-close" id="rpg-bestiary-detail-close">&times;</button></div>';
    if (ed.sprite) {
      html += '<div class="rpg-bestiary-detail-sprite" data-sprite="' + ed.sprite + '" data-fw="' + (ed.frameWidth || 32) + '" data-fh="' + (ed.frameHeight || 32) + '"></div>';
    }
    html += '<div class="rpg-detail-info">';
    html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Type:</span> <span class="rpg-type-badge rpg-type-' + ed.type + '">' + ed.type + '</span></div>';
    html += '<div class="rpg-detail-row"><span class="rpg-detail-label">HP:</span> ' + ed.hpBase + '</div>';
    html += '<div class="rpg-detail-row"><span class="rpg-detail-label">ATK:</span> ' + ed.atkBase + ' <span class="rpg-detail-label">DEF:</span> ' + ed.defBase + '</div>';
    html += '<div class="rpg-detail-row"><span class="rpg-detail-label">SPD:</span> ' + (ed.spdBase || '?') + ' <span class="rpg-detail-label">CRI:</span> ' + (ed.criBase || '?') + '</div>';
    if (ed.isBoss) html += '<div class="rpg-detail-row" style="color:#cc4444;font-weight:bold">BOSS</div>';
    html += '<div class="rpg-detail-row"><span class="rpg-detail-label">Defeated:</span> ' + entry.defeated + ' times</div>';
    html += '</div></div>';

    modal.innerHTML = html;
    modal.style.display = 'flex';

    // Load detail sprite
    var detailSprite = modal.querySelector('.rpg-bestiary-detail-sprite');
    if (detailSprite) {
      var dSrc = detailSprite.getAttribute('data-sprite');
      var dFw = parseInt(detailSprite.getAttribute('data-fw')) || 32;
      var dFh = parseInt(detailSprite.getAttribute('data-fh')) || 32;
      detailSprite.style.width = (dFw * 2) + 'px';
      detailSprite.style.height = (dFh * 2) + 'px';
      detailSprite.style.margin = '8px auto';
      detailSprite.style.imageRendering = 'pixelated';
      detailSprite.style.backgroundRepeat = 'no-repeat';
      var dImg = new Image();
      dImg.onload = function () {
        detailSprite.style.backgroundImage = 'url(' + dSrc + ')';
        detailSprite.style.backgroundPosition = '0 0';
        detailSprite.style.backgroundSize = (dImg.naturalWidth * 2) + 'px ' + (dImg.naturalHeight * 2) + 'px';
      };
      dImg.src = dSrc;
    }

    document.getElementById('rpg-bestiary-detail-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });
  }

  // ── Type Chart (8-4) ─────────────────────────────
  function showTypeChart() {
    var modal = document.getElementById('rpg-typechart-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-typechart-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
      attachModalOverlayClose(modal);
    }

    var types = ['fire', 'nature', 'tech', 'aqua', 'shadow', 'mystic'];
    var TYPE_COLORS = { fire: '#ff6600', nature: '#44aa44', tech: '#ccaa22', aqua: '#4488cc', shadow: '#8844cc', mystic: '#cc44aa' };

    var html = '<div class="rpg-modal rpg-typechart">';
    html += '<div class="rpg-modal-header"><h3>Type Chart</h3>';
    html += '<button class="rpg-modal-close" id="rpg-typechart-close">&times;</button></div>';
    html += '<div class="rpg-typechart-body">';
    html += '<div class="rpg-typechart-legend">';
    html += '<span class="rpg-tc-super">1.5x Super Effective</span>';
    html += '<span class="rpg-tc-neutral">1x Neutral</span>';
    html += '<span class="rpg-tc-resist">0.75x Resisted</span>';
    html += '</div>';
    html += '<table class="rpg-typechart-table"><thead><tr><th></th>';
    for (var h = 0; h < types.length; h++) {
      html += '<th style="color:' + TYPE_COLORS[types[h]] + '">' + types[h].charAt(0).toUpperCase() + types[h].slice(1) + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var r = 0; r < types.length; r++) {
      html += '<tr><td style="color:' + TYPE_COLORS[types[r]] + ';font-weight:bold">' + types[r].charAt(0).toUpperCase() + types[r].slice(1) + '</td>';
      for (var c = 0; c < types.length; c++) {
        var mult = TYPE_CHART[types[r]] ? (TYPE_CHART[types[r]][types[c]] || 1) : 1;
        var cls = mult > 1 ? 'rpg-tc-super' : (mult < 1 ? 'rpg-tc-resist' : 'rpg-tc-neutral');
        html += '<td class="' + cls + '">' + mult + 'x</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    html += '<div class="rpg-typechart-notes">Attacker type on the left, defender type on top. Neutral type has no advantages or weaknesses.</div>';
    html += '</div></div>';

    modal.innerHTML = html;
    modal.style.display = 'flex';

    document.getElementById('rpg-typechart-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });
  }

  // ── Public API ─────────────────────────────────────
  window.RpgCombat = {
    init: init,
    startBattle: startBattle,
    cleanup: cleanup,
    isActive: isActive,
    onComplete: null,
    showDungeonSelect: showDungeonSelect,
    showArenaSelect: showArenaSelect,
    loadCombatState: loadCombatState,
    getMovesForPet: getMovesForPet,
    getMoveData: function() { loadData(); return moveData; },
    initMovesForPet: function(petId, level) { loadData(); return initPetMoves(petId, level); },
    showPetDetail: showPetDetail,
    toggleAuto: toggleAuto,
    runFromBattle: runFromBattle,
    canEvolve: canEvolve,
    evolvePet: evolvePet,
    respecPet: respecPet,
    showSpecChoiceModal: showSpecChoiceModal,
    getSpecData: function () { loadData(); return specData; },
    getSpecBonuses: getSpecBonuses,
    petHasSpecGate: petHasSpecGate,
    showBestiary: showBestiary,
    showTypeChart: showTypeChart,
    addStone: function (type) {
      var cs = loadCombatState();
      if (!cs.stones) cs.stones = { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 };
      cs.stones[type] = (cs.stones[type] || 0) + 1;
      saveCombatState(cs);
    },
    getStones: function () {
      var cs = loadCombatState();
      return cs.stones || { fire: 0, aqua: 0, nature: 0, tech: 0, shadow: 0, mystic: 0 };
    }
  };

})();
