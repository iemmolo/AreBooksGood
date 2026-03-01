(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var STORAGE_KEY = 'arebooksgood-skills';
  var PET_KEY = 'arebooksgood-pet';
  var MAX_LEVEL = 99;
  var IDLE_CAP_MS = 8 * 60 * 60 * 1000; // 8 hours
  var ACTIVE_AUTO_INTERVAL = 15000; // 15s auto-train when page open
  var STATE_VERSION = 2;

  // ── Star prestige costs ───────────────────────
  var STAR_COSTS = [1000, 10000, 100000, 1000000, 10000000];

  // ── Tool tiers ────────────────────────────────
  var TOOL_COSTS = [500, 2000, 8000, 30000, 100000];
  var TOOL_LEVEL_REQS = [1, 20, 40, 60, 80];
  var TOOL_SPEED_MULT = 0.85; // each tier multiplies cooldown by this (15% faster)
  var TOOL_NAMES = {
    mining: ['Basic Pickaxe', 'Iron Pickaxe', 'Steel Pickaxe', 'Mithril Pickaxe', 'Dragon Pickaxe'],
    fishing: ['Basic Rod', 'Iron Rod', 'Steel Rod', 'Mithril Rod', 'Dragon Rod'],
    woodcutting: ['Basic Axe', 'Iron Axe', 'Steel Axe', 'Mithril Axe', 'Dragon Axe'],
    smithing: ['Basic Hammer', 'Iron Hammer', 'Steel Hammer', 'Mithril Hammer', 'Dragon Hammer'],
    combat: ['Basic Sword', 'Iron Sword', 'Steel Sword', 'Mithril Sword', 'Dragon Sword']
  };

  // ── Resource tier colors (D1) ─────────────────
  var TIER_COLORS = ['#888', '#ccc', '#4caf50', '#2196f3', '#9c27b0', '#ffd700'];

  // ── Milestone levels (B1) ─────────────────────
  var MILESTONE_LEVELS = [10, 25, 50, 75, 99];

  // ── Star Shower (B3) ──────────────────────────
  var STAR_SHOWER_TRIGGER = 600000; // 10 min active play
  var STAR_SHOWER_DURATION = 30000; // 30s

  // ── Fish sizes (A2) ───────────────────────────
  var FISH_SIZES = ['Tiny', 'Small', 'Normal', 'Large', 'Huge'];
  var FISH_SIZE_MULTS = [0.5, 0.75, 1, 1.5, 2.5];

  // ── Pet skill speech (C2) ─────────────────────
  var PET_SKILL_SPEECH = {
    fire: {
      mining: ['*heats the rock*', 'too easy!', 'melting through!'],
      fishing: ['*boils the water*', 'fish fry?', 'steamy!'],
      woodcutting: ['*chars the trunk*', 'timber!', 'burn baby burn!'],
      smithing: ['*breathes on the forge*', 'i AM the furnace', 'perfect heat!'],
      combat: ['*engulfed in flames*', 'feel the burn!', 'fire punch!']
    },
    aqua: {
      mining: ['*splashes the rock*', 'water erosion!', 'drip drip...'],
      fishing: ['*dives in*', 'i speak fish!', 'my element!'],
      woodcutting: ['*waters the stump*', 'soggy lumber...', 'splash!'],
      smithing: ['*quenches the blade*', 'cooling it down!', 'steam!'],
      combat: ['*water cannon!*', 'tidal wave!', 'hydro pump!']
    },
    nature: {
      mining: ['*grows moss*', 'rocky garden...', 'earth friend!'],
      fishing: ['*talks to fish*', 'swim free!', 'nature finds a way'],
      woodcutting: ['*talks to the tree*', 'sorry friend...', 'i\'ll plant two more!'],
      smithing: ['*vine wraps the bar*', 'organic metal?', 'nature forged!'],
      combat: ['*vine whip!*', 'leaf blade!', 'thorny defense!']
    },
    tech: {
      mining: ['*scans ore quality*', 'efficiency optimal!', 'mining protocol active'],
      fishing: ['*sonar ping*', 'fish located!', 'calculating trajectory...'],
      woodcutting: ['*chainsaw mode*', 'automated logging!', 'processing lumber...'],
      smithing: ['*precision welding*', 'specs look good!', 'alloy analysis complete'],
      combat: ['*laser targeting*', 'pew pew!', 'combat subroutine engaged']
    },
    shadow: {
      mining: ['*cracks from within*', 'darkness consumes...', 'void mining!'],
      fishing: ['*shadow lure*', 'from the depths...', 'dark waters...'],
      woodcutting: ['*withers the tree*', 'shadows creep...', 'corrupted timber!'],
      smithing: ['*dark tempering*', 'shadow-forged!', 'void infusion!'],
      combat: ['*shadow strike!*', 'from the void!', 'embrace darkness!']
    },
    mystic: {
      mining: ['*levitates ore*', 'arcane extraction!', 'magic mining!'],
      fishing: ['*enchants the line*', 'mystical catch!', 'enchanted waters!'],
      woodcutting: ['*telekinetic chop*', 'magic axe!', 'arcane lumber!'],
      smithing: ['*enchants the metal*', 'mystic forge!', 'arcane smithing!'],
      combat: ['*arcane bolt!*', 'mystic blast!', 'spell strike!']
    }
  };

  var PET_LEVELUP_SPEECH = [
    'you did it!', 'amazing!', 'keep going!', 'woohoo!', 'level up!',
    'so proud!', 'unstoppable!', 'legendary!', 'nice one!', 'incredible!'
  ];

  var PET_IDLE_SPEECH = ['missed you!', 'been busy!', 'was training hard!', 'back already?'];

  // ── XP table ──────────────────────────────────
  function xpForLevel(n) {
    if (n <= 1) return 0;
    return Math.floor(50 * Math.pow(1.08, n - 1));
  }

  // ── Pet type → skill bonus mapping ────────────
  var TYPE_SKILL_BONUS = {
    fire: 'smithing',
    aqua: 'fishing',
    nature: 'woodcutting',
    tech: 'mining',
    shadow: 'combat',
    mystic: 'all'
  };

  // ── Skill Definitions ─────────────────────────
  var SKILLS = {
    mining: {
      name: 'Mining', icon: '\u26CF',
      resources: [
        { name: 'Copper Ore', level: 1, xp: 10, dust: 2, clickTime: 1200 },
        { name: 'Tin Ore', level: 10, xp: 18, dust: 4, clickTime: 1100 },
        { name: 'Iron Ore', level: 20, xp: 30, dust: 7, clickTime: 1000 },
        { name: 'Coal', level: 30, xp: 50, dust: 12, clickTime: 900 },
        { name: 'Gold Ore', level: 40, xp: 80, dust: 20, clickTime: 850 },
        { name: 'Mithril Ore', level: 50, xp: 130, dust: 35, clickTime: 800 },
        { name: 'Adamant Ore', level: 60, xp: 200, dust: 55, clickTime: 750 },
        { name: 'Runite Ore', level: 70, xp: 320, dust: 90, clickTime: 700 },
        { name: 'Dragon Ore', level: 80, xp: 500, dust: 150, clickTime: 650 },
        { name: 'Star Ore', level: 90, xp: 800, dust: 250, clickTime: 600 }
      ]
    },
    fishing: {
      name: 'Fishing', icon: '\uD83C\uDFA3',
      resources: [
        { name: 'Shrimp', level: 1, xp: 10, dust: 2, clickTime: 2000 },
        { name: 'Trout', level: 15, xp: 25, dust: 6, clickTime: 1800 },
        { name: 'Lobster', level: 30, xp: 55, dust: 14, clickTime: 1600 },
        { name: 'Swordfish', level: 50, xp: 120, dust: 32, clickTime: 1400 },
        { name: 'Shark', level: 70, xp: 280, dust: 80, clickTime: 1200 },
        { name: 'Dark Crab', level: 85, xp: 550, dust: 170, clickTime: 1000 }
      ]
    },
    woodcutting: {
      name: 'Woodcutting', icon: '\uD83E\uDE93',
      resources: [
        { name: 'Tree', level: 1, xp: 10, dust: 2, clickTime: 1200 },
        { name: 'Oak', level: 15, xp: 22, dust: 5, clickTime: 1100 },
        { name: 'Willow', level: 30, xp: 50, dust: 12, clickTime: 1000 },
        { name: 'Maple', level: 45, xp: 100, dust: 25, clickTime: 900 },
        { name: 'Yew', level: 60, xp: 190, dust: 50, clickTime: 800 },
        { name: 'Magic', level: 75, xp: 360, dust: 100, clickTime: 700 },
        { name: 'Elder', level: 90, xp: 700, dust: 220, clickTime: 600 }
      ]
    },
    smithing: {
      name: 'Smithing', icon: '\uD83D\uDD28',
      resources: [
        { name: 'Bronze Bar', level: 1, xp: 12, dust: 3, clickTime: 1500 },
        { name: 'Iron Bar', level: 20, xp: 35, dust: 8, clickTime: 1400 },
        { name: 'Steel Bar', level: 30, xp: 60, dust: 15, clickTime: 1300 },
        { name: 'Gold Bar', level: 40, xp: 100, dust: 25, clickTime: 1200 },
        { name: 'Mithril Bar', level: 50, xp: 160, dust: 42, clickTime: 1100 },
        { name: 'Adamant Bar', level: 60, xp: 250, dust: 65, clickTime: 1000 },
        { name: 'Rune Bar', level: 70, xp: 400, dust: 110, clickTime: 900 },
        { name: 'Dragon Bar', level: 80, xp: 650, dust: 200, clickTime: 800 }
      ]
    },
    combat: {
      name: 'Combat', icon: '\u2694',
      resources: [
        { name: 'Training Dummy', level: 1, xp: 8, dust: 2, clickTime: 2000 },
        { name: 'Slime', level: 10, xp: 18, dust: 5, clickTime: 1800 },
        { name: 'Goblin', level: 25, xp: 40, dust: 10, clickTime: 1600 },
        { name: 'Skeleton', level: 40, xp: 85, dust: 22, clickTime: 1400 },
        { name: 'Demon', level: 55, xp: 170, dust: 45, clickTime: 1200 },
        { name: 'Dragon', level: 70, xp: 350, dust: 100, clickTime: 1000 },
        { name: 'Titan', level: 85, xp: 600, dust: 190, clickTime: 900 }
      ]
    }
  };

  var SKILL_KEYS = ['mining', 'fishing', 'woodcutting', 'smithing', 'combat'];

  // ── State ─────────────────────────────────────
  var state = null;
  var activeSkill = 'mining';
  var spriteData = null;
  var catalog = null;
  var enemyData = null;
  var activeAutoTimer = null;

  // Mini-game specific state
  var miningCooldown = false;
  var miningCombo = { count: 0, lastClickTime: 0 };
  var fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };
  var wcState = { hits: 0, hitsNeeded: 0, cooldown: false, lastChopTime: 0 };
  var smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0 };
  var combatState = {
    enemyHp: 0, enemyMaxHp: 0, enemyName: '', streak: 0, enemyTimer: null, cooldown: false,
    playerHp: 0, playerMaxHp: 0, potions: 3, dodgeCooldown: false, dead: false,
    dodgeWindow: false, dodgeWindowTimer: null
  };

  // Star shower state (B3)
  var starShowerActive = false;
  var starShowerTimer = null;

  // ── Load / Save ───────────────────────────────
  function defaultState() {
    var s = { skills: {}, version: STATE_VERSION, mastered: {}, activePlayTime: 0, totalDustEarned: 0 };
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      s.skills[SKILL_KEYS[i]] = {
        level: 1,
        xp: 0,
        toolTier: 0,
        assignedPet: null,
        lastActiveAt: null,
        totalActions: 0
      };
    }
    return s;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.skills) {
          var s = defaultState();
          // Migrate v1 → v2
          s.mastered = saved.mastered || {};
          s.activePlayTime = saved.activePlayTime || 0;
          s.totalDustEarned = saved.totalDustEarned || 0;
          for (var i = 0; i < SKILL_KEYS.length; i++) {
            var key = SKILL_KEYS[i];
            if (saved.skills[key]) {
              s.skills[key].level = saved.skills[key].level || 1;
              s.skills[key].xp = saved.skills[key].xp || 0;
              s.skills[key].toolTier = saved.skills[key].toolTier || 0;
              s.skills[key].assignedPet = saved.skills[key].assignedPet || null;
              s.skills[key].lastActiveAt = saved.skills[key].lastActiveAt || null;
              s.skills[key].totalActions = saved.skills[key].totalActions || 0;
            }
          }
          s.version = STATE_VERSION;
          return s;
        }
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // ── Pet state helpers ─────────────────────────
  function loadPetState() {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function savePetStars(petId, stars) {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (!raw) return;
      var ps = JSON.parse(raw);
      if (ps.pets && ps.pets[petId]) {
        ps.pets[petId].stars = stars;
        localStorage.setItem(PET_KEY, JSON.stringify(ps));
      }
    } catch (e) {}
  }

  function getPetStars(petId) {
    var ps = loadPetState();
    if (ps && ps.pets && ps.pets[petId]) {
      return ps.pets[petId].stars || 0;
    }
    return 0;
  }

  function getPetType(petId) {
    if (!catalog || !catalog.creatures || !catalog.creatures[petId]) return null;
    return catalog.creatures[petId].type || null;
  }

  function getPetTier(petId) {
    if (!catalog || !catalog.creatures || !catalog.creatures[petId]) return 'common';
    return catalog.creatures[petId].tier || 'common';
  }

  function getTypeBonus(petId, skillKey) {
    var type = getPetType(petId);
    if (!type) return 1;
    var bonusSkill = TYPE_SKILL_BONUS[type];
    if (bonusSkill === 'all') return 1.5;
    if (bonusSkill === skillKey) return 2;
    return 1;
  }

  function getTierMult(petId) {
    var tier = getPetTier(petId);
    if (tier === 'legendary') return 2;
    if (tier === 'rare') return 1.5;
    return 1;
  }

  // ── XP / Level helpers ────────────────────────
  function getXpToNext(level) {
    if (level >= MAX_LEVEL) return Infinity;
    return xpForLevel(level + 1);
  }

  function getXpProgress(skill) {
    var s = state.skills[skill];
    if (s.level >= MAX_LEVEL) return 1;
    var needed = getXpToNext(s.level);
    return Math.min(s.xp / needed, 1);
  }

  function addXp(skill, amount) {
    var s = state.skills[skill];
    if (s.level >= MAX_LEVEL) return false;
    var oldLevel = s.level;
    s.xp += amount;
    var leveled = false;
    while (s.level < MAX_LEVEL && s.xp >= getXpToNext(s.level)) {
      s.xp -= getXpToNext(s.level);
      s.level++;
      leveled = true;
      addLog(SKILLS[skill].name + ' level ' + s.level + '!');
    }
    if (s.level >= MAX_LEVEL) s.xp = 0;
    saveState();

    // Level-up hooks (B1, B2, C3, B4)
    if (leveled && skill === activeSkill) {
      onLevelUp(skill, oldLevel, s.level);
    }

    return leveled;
  }

  // ── Level-Up Hook (B1, B2, C3, B4) ────────────
  function onLevelUp(skill, oldLevel, newLevel) {
    // B1: Visual effects
    showLevelUpEffect(skill, newLevel);

    // B1: Milestone check
    for (var i = 0; i < MILESTONE_LEVELS.length; i++) {
      if (oldLevel < MILESTONE_LEVELS[i] && newLevel >= MILESTONE_LEVELS[i]) {
        showMilestoneBanner(skill, MILESTONE_LEVELS[i]);
        break;
      }
    }

    // B2: Resource unlock toast
    showResourceUnlockToast(skill, oldLevel, newLevel);

    // C3: Pet congratulations
    var petId = state.skills[skill].assignedPet;
    if (petId) {
      if (window.PetSystem && window.PetSystem.celebrate) window.PetSystem.celebrate();
      var line = PET_LEVELUP_SPEECH[Math.floor(Math.random() * PET_LEVELUP_SPEECH.length)];
      if (window.PetSystem && window.PetSystem.speak) window.PetSystem.speak(line);
      addLog('Pet: "' + line + '"');
    }

    // B4: Mastery check
    if (newLevel >= MAX_LEVEL) {
      checkMastery(skill);
    }

    // D2: XP bar flash
    var rows = document.querySelectorAll('.skill-row');
    for (var r = 0; r < rows.length; r++) {
      if (rows[r].getAttribute('data-skill') === skill) {
        var bar = rows[r].querySelector('.skill-xp-bar');
        if (bar) {
          bar.classList.add('xp-bar-flash');
          setTimeout(function (b) { return function () { b.classList.remove('xp-bar-flash'); }; }(bar), 500);
        }
      }
    }
  }

  // ── B1: Level-Up Visual Effect ────────────────
  function showLevelUpEffect(skill, level) {
    // Glow pulse on skill row
    var rows = document.querySelectorAll('.skill-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-skill') === skill) {
        rows[i].classList.add('level-up-glow');
        setTimeout(function (row) { return function () { row.classList.remove('level-up-glow'); }; }(rows[i]), 1500);
      }
    }

    // Big "+1" text in game area
    var area = $('skills-game-area');
    if (area) {
      var bigText = document.createElement('div');
      bigText.className = 'level-up-big-text';
      bigText.textContent = '+1  Lv ' + level;
      area.appendChild(bigText);
      setTimeout(function () { if (bigText.parentNode) bigText.parentNode.removeChild(bigText); }, 1200);
    }

    // Screen flash
    var page = $('skills-page');
    if (page) {
      page.classList.add('screen-flash');
      setTimeout(function () { page.classList.remove('screen-flash'); }, 200);
    }
  }

  // ── B1: Milestone Banner ──────────────────────
  function showMilestoneBanner(skill, level) {
    var banner = document.createElement('div');
    banner.className = 'skills-milestone-banner';
    if (level >= 99) {
      banner.classList.add('mastered');
      banner.textContent = 'MASTERED! ' + SKILLS[skill].name + ' Lv 99!';
    } else {
      banner.textContent = SKILLS[skill].name + ' Milestone: Level ' + level + '!';
    }
    document.body.appendChild(banner);
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 3000);
  }

  // ── B2: Resource Unlock Toast ─────────────────
  function showResourceUnlockToast(skill, oldLevel, newLevel) {
    var resources = SKILLS[skill].resources;
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].level > oldLevel && resources[i].level <= newLevel) {
        var area = $('skills-game-area');
        if (area) {
          var toast = document.createElement('div');
          toast.className = 'skills-unlock-toast';
          toast.textContent = 'NEW: ' + resources[i].name + ' unlocked!';
          area.appendChild(toast);
          setTimeout(function (t) { return function () { if (t.parentNode) t.parentNode.removeChild(t); }; }(toast), 3000);
        }
      }
    }
  }

  // ── B3: Star Shower ───────────────────────────
  function trackActivePlay() {
    if (!state) return;
    state.activePlayTime = (state.activePlayTime || 0) + 1000; // approximate per action
    if (!starShowerActive && state.activePlayTime >= STAR_SHOWER_TRIGGER) {
      startStarShower();
    }
  }

  function startStarShower() {
    starShowerActive = true;
    state.activePlayTime = 0;
    saveState();

    var panel = $('skills-game-panel');
    if (panel) panel.classList.add('star-shower');

    var area = $('skills-game-area');
    if (area) {
      var banner = document.createElement('div');
      banner.className = 'star-shower-banner';
      banner.id = 'star-shower-banner';
      banner.textContent = 'STAR SHOWER! 2x XP+SD (30s)';
      area.appendChild(banner);
    }

    addLog('STAR SHOWER! 2x rewards for 30 seconds!');

    starShowerTimer = setTimeout(function () {
      endStarShower();
    }, STAR_SHOWER_DURATION);
  }

  function endStarShower() {
    starShowerActive = false;
    var panel = $('skills-game-panel');
    if (panel) panel.classList.remove('star-shower');
    var banner = $('star-shower-banner');
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    addLog('Star Shower ended.');
  }

  function getStarShowerMult() {
    return starShowerActive ? 2 : 1;
  }

  // ── B4: Mastery System ────────────────────────
  function checkMastery(skill) {
    if (!state.mastered) state.mastered = {};
    if (!state.mastered[skill]) {
      state.mastered[skill] = true;
      saveState();
      addLog(SKILLS[skill].name + ' MASTERED! +5% global dust bonus.');
    }
  }

  function getMasteryBonus() {
    if (!state || !state.mastered) return 1;
    var count = 0;
    var keys = Object.keys(state.mastered);
    for (var i = 0; i < keys.length; i++) {
      if (state.mastered[keys[i]]) count++;
    }
    return Math.pow(1.05, count); // 5% multiplicative per mastered skill
  }

  function getMasteredCount() {
    if (!state || !state.mastered) return 0;
    var count = 0;
    var keys = Object.keys(state.mastered);
    for (var i = 0; i < keys.length; i++) {
      if (state.mastered[keys[i]]) count++;
    }
    return count;
  }

  // ── Combined dust multiplier ──────────────────
  function getDustMult() {
    return getStarShowerMult() * getMasteryBonus();
  }

  function getHighestResource(skill) {
    var s = state.skills[skill];
    var resources = SKILLS[skill].resources;
    var best = resources[0];
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].level <= s.level) best = resources[i];
    }
    return best;
  }

  // ── D1: Resource tier index ───────────────────
  function getResourceTierIndex(skill) {
    var s = state.skills[skill];
    var resources = SKILLS[skill].resources;
    var idx = 0;
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].level <= s.level) idx = i;
    }
    // Map resource index to tier (0-5 range)
    return Math.min(Math.floor(idx * 6 / resources.length), 5);
  }

  function getTotalLevels() {
    var total = 0;
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      total += state.skills[SKILL_KEYS[i]].level;
    }
    return total;
  }

  function getHighestLevel() {
    var highest = 1;
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      if (state.skills[SKILL_KEYS[i]].level > highest) highest = state.skills[SKILL_KEYS[i]].level;
    }
    return highest;
  }

  // ── Tool helpers ──────────────────────────────
  function getToolSpeedMult(skill) {
    var tier = state.skills[skill].toolTier || 0;
    return Math.pow(TOOL_SPEED_MULT, tier);
  }

  function getToolCooldown(skill, baseCooldown) {
    return Math.floor(baseCooldown * getToolSpeedMult(skill));
  }

  // ── Star auto-production multiplier ───────────
  function getStarAutoMult(petId) {
    var stars = getPetStars(petId);
    if (stars <= 0) return 1;
    return Math.pow(2, stars);
  }

  // ── UI helpers ────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function addLog(text) {
    var log = $('skills-game-log');
    if (!log) return;
    var d = document.createElement('div');
    d.textContent = '> ' + text;
    log.insertBefore(d, log.firstChild);
    while (log.children.length > 20) {
      log.removeChild(log.lastChild);
    }
  }

  function spawnParticle(parentEl, text, cssClass) {
    var p = document.createElement('div');
    p.className = 'ore-particle ' + cssClass;
    p.textContent = text;
    p.style.left = (Math.random() * 60 + 20) + '%';
    p.style.top = '40%';
    parentEl.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1200);
  }

  function spawnAutoFloat(text) {
    var area = $('skills-game-area');
    if (!area) return;
    var el = document.createElement('div');
    el.className = 'skills-auto-float';
    el.textContent = text;
    el.style.left = (Math.random() * 60 + 20) + '%';
    el.style.bottom = (Math.random() * 40 + 30) + '%';
    area.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
  }

  // ── C1: Pet in Game Area ──────────────────────
  function renderPetInGameArea() {
    // Remove existing pet sprite in game area
    var existing = document.querySelector('.skills-game-pet');
    if (existing) existing.parentNode.removeChild(existing);

    var petId = state.skills[activeSkill].assignedPet;
    if (!petId || !catalog || !catalog.creatures || !catalog.creatures[petId]) return;

    var area = $('skills-game-area');
    if (!area) return;

    var c = catalog.creatures[petId];
    var sid = c.spriteId || petId;
    var ps = loadPetState();
    var petSkin = (ps && ps.pets && ps.pets[petId] && ps.pets[petId].skin === 'alt') ? 'alt' : 'default';
    var sheetKey = petSkin === 'alt' ? sid + '-alt' : sid;
    var data = spriteData ? (spriteData[sheetKey] || spriteData[sid]) : null;
    if (!data) return;

    var petLevel = (ps && ps.pets && ps.pets[petId]) ? (ps.pets[petId].level || 1) : 1;
    var frameOffset = data.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + petLevel - 1, (data.frames || 3) - 1);

    var sprite = document.createElement('div');
    sprite.className = 'skills-game-pet';
    sprite.style.backgroundImage = 'url(' + data.sheet + ')';
    sprite.style.backgroundPosition = '-' + (frameIdx * 48) + 'px 0';
    area.appendChild(sprite);
  }

  function animatePetAction(animClass) {
    var pet = document.querySelector('.skills-game-pet');
    if (!pet) return;
    pet.classList.remove('pet-bounce', 'pet-wiggle', 'pet-cheer');
    void pet.offsetWidth;
    pet.classList.add(animClass);
    setTimeout(function () { pet.classList.remove(animClass); }, 500);
  }

  // ── C2: Pet Skill Speech ──────────────────────
  function triggerPetSpeech(skill) {
    if (Math.random() > 0.2) return; // 20% chance
    var petId = state.skills[skill].assignedPet;
    if (!petId) return;
    var type = getPetType(petId);
    if (!type || !PET_SKILL_SPEECH[type] || !PET_SKILL_SPEECH[type][skill]) return;
    var lines = PET_SKILL_SPEECH[type][skill];
    var line = lines[Math.floor(Math.random() * lines.length)];
    if (window.PetSystem && window.PetSystem.speak) window.PetSystem.speak(line);
    addLog('Pet: "' + line + '"');
  }

  // ── C4: Pet Type Visual Particles ─────────────
  function spawnTypeParticle(skill) {
    var petId = state.skills[skill].assignedPet;
    if (!petId) return;
    var type = getPetType(petId);
    if (!type) return;

    // Check if type matches skill bonus
    var bonusSkill = TYPE_SKILL_BONUS[type];
    if (bonusSkill !== skill && bonusSkill !== 'all') return;

    var area = $('skills-game-area');
    if (!area) return;

    var emojis = {
      fire: '\uD83D\uDD25',
      aqua: '\uD83D\uDCA7',
      nature: '\uD83C\uDF43',
      tech: '\u26A1',
      shadow: '\uD83C\uDF11',
      mystic: '\u2728'
    };
    var classes = {
      fire: 'fire-particle',
      aqua: 'aqua-particle',
      nature: 'nature-particle',
      tech: 'tech-particle',
      shadow: 'shadow-particle',
      mystic: 'fire-particle'
    };

    var p = document.createElement('div');
    p.className = 'type-particle ' + (classes[type] || 'fire-particle');
    p.textContent = emojis[type] || '\u2728';
    p.style.left = (Math.random() * 50 + 25) + '%';
    p.style.bottom = (Math.random() * 30 + 20) + '%';
    if (type === 'aqua') {
      p.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
      p.style.setProperty('--dy', (-Math.random() * 40 - 10) + 'px');
    }
    area.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1200);
  }

  // ── Common action hook ────────────────────────
  function onAction(skill, dustAmount) {
    // Track total actions (B5)
    state.skills[skill].totalActions = (state.skills[skill].totalActions || 0) + 1;

    // Track total dust earned (B5)
    state.totalDustEarned = (state.totalDustEarned || 0) + dustAmount;

    // Track active play time (B3)
    trackActivePlay();

    // Pet speech (C2)
    triggerPetSpeech(skill);

    // Pet type particles (C4)
    spawnTypeParticle(skill);
  }

  // ── Render skill list (enhanced D5, B4) ───────
  function renderSkillList() {
    var rows = document.querySelectorAll('.skill-row');
    for (var i = 0; i < rows.length; i++) {
      var key = rows[i].getAttribute('data-skill');
      var s = state.skills[key];
      var levelSpan = rows[i].querySelector('.skill-level');
      var pct = (getXpProgress(key) * 100).toFixed(1);
      rows[i].querySelector('.skill-xp-fill').style.width = pct + '%';

      // D2: XP near level glow
      var xpBar = rows[i].querySelector('.skill-xp-bar');
      if (xpBar) {
        if (getXpProgress(key) > 0.9 && s.level < MAX_LEVEL) {
          xpBar.classList.add('xp-near-level');
        } else {
          xpBar.classList.remove('xp-near-level');
        }
      }

      // D5: Star indicators
      var starText = '';
      var petId = s.assignedPet;
      if (petId) {
        var stars = getPetStars(petId);
        if (stars > 0) {
          starText = ' ';
          for (var si = 0; si < stars; si++) starText += '\u2605';
        }
      }
      levelSpan.textContent = 'Lv ' + s.level;
      if (starText) {
        var indicator = document.createElement('span');
        indicator.className = 'skill-star-indicator';
        indicator.textContent = starText;
        levelSpan.appendChild(indicator);
      }

      // B4: Mastery styling
      if (state.mastered && state.mastered[key]) {
        rows[i].classList.add('mastered');
      } else {
        rows[i].classList.remove('mastered');
      }

      if (key === activeSkill) {
        rows[i].classList.add('selected');
      } else {
        rows[i].classList.remove('selected');
      }
    }
    var totalEl = $('skills-total-levels');
    if (totalEl) totalEl.textContent = getTotalLevels();
  }

  // ── Render right panel ────────────────────────
  function renderRightPanel() {
    var s = state.skills[activeSkill];
    var petId = s.assignedPet;

    // Pet assignment
    var emptyEl = $('skills-pet-empty');
    var assignedEl = $('skills-pet-assigned');
    if (petId && catalog && catalog.creatures && catalog.creatures[petId]) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (assignedEl) assignedEl.style.display = '';
      var c = catalog.creatures[petId];
      var nameEl = $('skills-pet-name');
      if (nameEl) {
        var starsStr = '';
        var petStars = getPetStars(petId);
        for (var si = 0; si < 5; si++) starsStr += si < petStars ? '\u2605' : '\u2606';
        nameEl.textContent = c.name + ' ' + starsStr;
      }
      var bonusEl = $('skills-pet-type-bonus');
      if (bonusEl) {
        var bonus = getTypeBonus(petId, activeSkill);
        bonusEl.textContent = bonus > 1 ? bonus + 'x (' + c.type + ' \u2192 ' + SKILLS[activeSkill].name + ')' : c.type;
      }
      // Render pet sprite
      var spriteEl = $('skills-pet-sprite');
      if (spriteEl && spriteData) {
        var sid = c.spriteId || petId;
        var ps = loadPetState();
        var petSkin = (ps && ps.pets && ps.pets[petId] && ps.pets[petId].skin === 'alt') ? 'alt' : 'default';
        var sheetKey = petSkin === 'alt' ? sid + '-alt' : sid;
        var data = spriteData[sheetKey] || spriteData[sid];
        if (data) {
          var petLevel = (ps && ps.pets && ps.pets[petId]) ? (ps.pets[petId].level || 1) : 1;
          var frameOffset = data.frameOffset || 0;
          var frameIdx = Math.min(frameOffset + petLevel - 1, (data.frames || 3) - 1);
          spriteEl.style.backgroundImage = 'url(' + data.sheet + ')';
          spriteEl.style.backgroundPosition = '-' + (frameIdx * 48) + 'px 0';
        }
      }
      // Pet activity description
      var activityEl = $('skills-pet-activity');
      if (activityEl) {
        var res = getHighestResource(activeSkill);
        var skillVerbs = {
          mining: 'Mining', fishing: 'Fishing for', woodcutting: 'Chopping',
          smithing: 'Smithing', combat: 'Fighting'
        };
        var verb = skillVerbs[activeSkill] || 'Training';
        var tierMult = getTierMult(petId);
        var typeBonus2 = getTypeBonus(petId, activeSkill);
        var starMult = getStarAutoMult(petId);
        var idleDust = Math.floor(res.dust * tierMult * typeBonus2 * starMult);
        var idleXp = Math.floor(res.xp * tierMult * typeBonus2 * starMult);
        activityEl.textContent = verb + ' ' + res.name + ' (' + idleXp + ' XP + ' + idleDust + ' SD/action)';
      }
    } else {
      if (emptyEl) emptyEl.style.display = '';
      if (assignedEl) assignedEl.style.display = 'none';
    }

    // Tool info
    var toolNameEl = $('skills-tool-name');
    var toolTierEl = $('skills-tool-tier');
    var toolBtn = $('skills-upgrade-tool-btn');
    var toolHint = $('skills-tool-hint');
    var tier = s.toolTier || 0;
    if (toolNameEl) toolNameEl.textContent = TOOL_NAMES[activeSkill][tier];
    if (toolTierEl) toolTierEl.textContent = 'Tier ' + (tier + 1) + '/5';
    if (toolBtn) {
      if (tier >= 5) {
        toolBtn.textContent = 'Max Tier';
        toolBtn.disabled = true;
      } else {
        var cost = TOOL_COSTS[tier];
        toolBtn.textContent = 'Upgrade (' + formatNum(cost) + ' SD)';
        toolBtn.disabled = !window.StarDust || !window.StarDust.canAfford(cost) || s.level < TOOL_LEVEL_REQS[tier];
      }
    }
    // Tool upgrade hint
    if (toolHint) {
      if (tier >= 5) {
        toolHint.textContent = 'Max tier reached — 15% speed per tier stacked!';
      } else {
        var nextName = TOOL_NAMES[activeSkill][tier + 1] || '';
        var totalSpeedBonus = Math.round((1 - Math.pow(TOOL_SPEED_MULT, tier + 1)) * 100);
        var hintText = 'Next: <span class="tool-next-name">' + nextName + '</span> — ' + totalSpeedBonus + '% faster';
        if (s.level < TOOL_LEVEL_REQS[tier]) {
          hintText += '<br>Requires Lv ' + TOOL_LEVEL_REQS[tier];
        }
        toolHint.innerHTML = hintText;
      }
    }

    // Star prestige
    var stars = petId ? getPetStars(petId) : 0;
    var starsEl = $('skills-stars-display');
    if (starsEl) {
      var starStr = '';
      for (var i = 0; i < 5; i++) starStr += i < stars ? '\u2605' : '\u2606';
      starsEl.textContent = starStr;
      starsEl.className = 'skills-stars-display';
      if (stars > 0) starsEl.classList.add('glow-' + stars);
    }
    var costEl = $('skills-star-cost');
    var starBtn = $('skills-starup-btn');
    if (costEl) {
      if (!petId) {
        costEl.textContent = 'Assign a pet first';
      } else if (stars >= 5) {
        costEl.textContent = 'Max Stars!';
      } else {
        costEl.textContent = 'Next: ' + formatNum(STAR_COSTS[stars]) + ' SD';
      }
    }
    if (starBtn) {
      starBtn.disabled = !petId || stars >= 5 || !window.StarDust || !window.StarDust.canAfford(STAR_COSTS[stars] || Infinity);
    }

    // Idle status
    var idleEl = $('skills-idle-status');
    if (idleEl) {
      var label = idleEl.querySelector('.skills-idle-label');
      if (label) {
        if (petId) {
          label.textContent = 'Auto-training: Active';
          label.style.color = 'var(--accent)';
        } else {
          label.textContent = 'Auto-training: Off';
          label.style.color = '';
        }
      }
    }

    // Dust display
    var dustEl = $('skills-dust-display');
    if (dustEl && window.StarDust) {
      dustEl.textContent = window.StarDust.formatDust(window.StarDust.getBalance());
    }

    // B5: Milestones panel
    renderMilestones();
  }

  // ── B5: Milestones Rendering ──────────────────
  function renderMilestones() {
    var actionsEl = $('ms-total-actions');
    var dustEl = $('ms-total-dust');
    var highestEl = $('ms-highest-level');
    var masteredEl = $('ms-mastered-count');

    var s = state.skills[activeSkill];
    if (actionsEl) actionsEl.textContent = formatNum(s.totalActions || 0);
    if (dustEl) dustEl.textContent = formatNum(state.totalDustEarned || 0);
    if (highestEl) highestEl.textContent = getHighestLevel();
    if (masteredEl) masteredEl.textContent = getMasteredCount();
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  // ── Game header update (D1) ───────────────────
  function updateGameHeader() {
    var titleEl = $('skills-game-title');
    if (titleEl) titleEl.textContent = SKILLS[activeSkill].name;
    var resEl = $('skills-current-resource');
    if (resEl) {
      var res = getHighestResource(activeSkill);
      var tierIdx = getResourceTierIndex(activeSkill);
      resEl.textContent = res.name;
      resEl.className = 'tier-' + tierIdx;
    }
  }

  // ══════════════════════════════════════════════
  // ── MINING MINI-GAME (A1 enhanced) ─────────────
  // ══════════════════════════════════════════════
  function renderMining() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    miningCombo = { count: 0, lastClickTime: 0 };
    var res = getHighestResource('mining');

    var div = document.createElement('div');
    div.className = 'mining-rocks';
    for (var i = 0; i < 3; i++) {
      var rockWrap = document.createElement('div');
      rockWrap.style.position = 'relative';
      rockWrap.style.display = 'inline-block';

      var rock = document.createElement('div');
      rock.className = 'mining-rock';
      rock.textContent = '\uD83E\uDEA8';
      rock.setAttribute('data-idx', i);
      rock.addEventListener('click', onMineClick);
      rockWrap.appendChild(rock);

      // A1: Ore name label
      var label = document.createElement('div');
      label.className = 'mining-rock-label';
      label.textContent = res.name;
      rockWrap.appendChild(label);

      div.appendChild(rockWrap);
    }
    area.appendChild(div);

    // A1: Combo counter
    var comboEl = document.createElement('div');
    comboEl.className = 'mining-combo';
    comboEl.id = 'mining-combo';
    comboEl.style.display = 'none';
    area.appendChild(comboEl);

    // C1: Render pet
    renderPetInGameArea();
  }

  function onMineClick(e) {
    if (miningCooldown) return;
    var rock = e.currentTarget;
    if (rock.classList.contains('depleted')) return;

    var res = getHighestResource('mining');
    var cooldown = getToolCooldown('mining', res.clickTime);
    var now = Date.now();

    // A1: Combo tracking
    var timeSinceLast = now - miningCombo.lastClickTime;
    if (timeSinceLast >= 500 && timeSinceLast <= 700) {
      miningCombo.count = Math.min(miningCombo.count + 1, 10);
    } else if (timeSinceLast > 700) {
      miningCombo.count = 0;
    }
    miningCombo.lastClickTime = now;

    var comboMult = 1 + (miningCombo.count * 0.1); // max 10 = 2x
    var comboEl = $('mining-combo');
    if (comboEl) {
      if (miningCombo.count > 0) {
        comboEl.textContent = 'Combo x' + miningCombo.count + '!';
        comboEl.style.display = '';
      } else {
        comboEl.style.display = 'none';
      }
    }

    miningCooldown = true;
    rock.classList.add('shaking');

    setTimeout(function () {
      rock.classList.remove('shaking');
      rock.classList.add('cracking');

      var area = $('skills-game-area');
      var dustMult = getDustMult() * comboMult;
      var xpGain = Math.floor(res.xp * getStarShowerMult());
      var dustGain = Math.floor(res.dust * dustMult);

      // A1: 5% gem drop
      var isGem = Math.random() < 0.05;
      if (isGem) {
        dustGain *= 5;
        if (area) spawnParticle(area, 'GEM! +' + dustGain + ' SD', 'gem');
        addLog('Found a gem! 5x dust bonus!');
      }

      if (area) {
        spawnParticle(area, '+' + xpGain + ' XP', 'xp');
        if (!isGem) {
          setTimeout(function () {
            spawnParticle(area, '+' + dustGain + ' SD', 'dust');
          }, 200);
        }
      }

      addXp('mining', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);
      addLog('Mined ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)');

      // Common action hook
      onAction('mining', dustGain);

      // C1: Pet bounce
      animatePetAction('pet-bounce');

      // A1: Rock depleted + respawn
      rock.classList.remove('cracking');
      rock.classList.add('depleted');

      // Show respawn timer inside the rock itself (position: relative)
      var timerEl = document.createElement('div');
      timerEl.className = 'mining-respawn-timer';
      timerEl.textContent = '3s';
      rock.appendChild(timerEl);

      var remaining = 3;
      var respawnInterval = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearInterval(respawnInterval);
          rock.classList.remove('depleted');
          if (timerEl.parentNode) timerEl.parentNode.removeChild(timerEl);
        } else {
          timerEl.textContent = remaining + 's';
        }
      }, 1000);

      miningCooldown = false;
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
    }, 300);
  }

  // ══════════════════════════════════════════════
  // ── FISHING MINI-GAME (A2 enhanced) ────────────
  // ══════════════════════════════════════════════
  function renderFishing() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'fishing-area';
    div.innerHTML =
      '<div class="fishing-water">' +
        '<div class="fishing-line" id="fishing-line"></div>' +
        '<div class="fishing-bobber" id="fishing-bobber">\uD83C\uDFA3</div>' +
        '<div class="fishing-exclaim" id="fishing-exclaim">!</div>' +
      '</div>' +
      '<div class="fishing-power-bar" id="fishing-power-bar" style="display:none">' +
        '<div class="fishing-power-fill" id="fishing-power-fill"></div>' +
      '</div>' +
      '<button class="fishing-btn" id="fishing-btn">Hold to Cast</button>' +
      '<div class="fishing-status" id="fishing-status"></div>' +
      '<div class="fishing-size" id="fishing-size"></div>';
    area.appendChild(div);

    var btn = $('fishing-btn');
    btn.addEventListener('mousedown', onFishCastStart);
    btn.addEventListener('touchstart', onFishCastStart);
    btn.addEventListener('mouseup', onFishCastRelease);
    btn.addEventListener('touchend', onFishCastRelease);
    btn.addEventListener('click', onFishAction);
    fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };

    // C1: Render pet
    renderPetInGameArea();
  }

  function onFishCastStart(e) {
    if (fishingState.phase !== 'idle') return;
    e.preventDefault();
    fishingState.castStartTime = Date.now();
    var powerBar = $('fishing-power-bar');
    if (powerBar) powerBar.style.display = '';

    fishingState.castTimer = setInterval(function () {
      var elapsed = Date.now() - fishingState.castStartTime;
      var pct = Math.min(elapsed / 2000, 1) * 100; // 2s to full charge
      var fill = $('fishing-power-fill');
      if (fill) fill.style.width = pct + '%';
    }, 50);
  }

  function onFishCastRelease(e) {
    if (fishingState.phase !== 'idle' || !fishingState.castStartTime) return;
    e.preventDefault();
    if (fishingState.castTimer) clearInterval(fishingState.castTimer);

    var castPower = Math.min((Date.now() - fishingState.castStartTime) / 2000, 1);
    fishingState.castStartTime = 0;

    var powerBar = $('fishing-power-bar');
    if (powerBar) powerBar.style.display = 'none';
    var fill = $('fishing-power-fill');
    if (fill) fill.style.width = '0%';

    // Cast with power
    fishingState.phase = 'waiting';
    var btn = $('fishing-btn');
    var status = $('fishing-status');
    var line = $('fishing-line');
    var bobber = $('fishing-bobber');
    var exclaim = $('fishing-exclaim');

    if (btn) { btn.disabled = true; btn.textContent = 'Waiting...'; }
    if (status) status.textContent = 'Waiting for a bite...';
    if (line) line.classList.add('cast');
    if (bobber) { bobber.classList.add('visible'); bobber.classList.remove('bite'); }
    if (exclaim) exclaim.classList.remove('visible');

    // A2: Power affects wait time (full power = 1s, no power = 4s)
    var waitTime = 1000 + (1 - castPower) * 3000;
    fishingState.biteTimeout = setTimeout(function () {
      fishingState.phase = 'bite';
      fishingState.biteStartTime = Date.now();
      if (bobber) bobber.classList.add('bite');
      if (exclaim) exclaim.classList.add('visible');
      if (status) status.textContent = 'BITE! Click to reel!';
      if (btn) { btn.textContent = 'Reel In!'; btn.disabled = false; }

      // Miss window
      fishingState.timer = setTimeout(function () {
        if (fishingState.phase === 'bite') {
          fishingState.phase = 'idle';
          if (status) status.textContent = 'Too slow! Fish got away.';
          resetFishingVisuals();
          if (btn) { btn.textContent = 'Hold to Cast'; btn.disabled = false; }
        }
      }, 1500);
    }, waitTime);
  }

  function onFishAction() {
    if (fishingState.phase !== 'bite') return;

    // Reel in - success!
    clearTimeout(fishingState.timer);
    var reactionTime = Date.now() - fishingState.biteStartTime;
    fishingState.phase = 'idle';

    var btn = $('fishing-btn');
    var status = $('fishing-status');
    var sizeEl = $('fishing-size');
    var res = getHighestResource('fishing');
    var level = state.skills.fishing.level;

    // A2: Fish size (level-weighted)
    var sizeRoll = Math.random() + (level / MAX_LEVEL) * 0.3;
    var sizeIdx;
    if (sizeRoll < 0.15) sizeIdx = 0;
    else if (sizeRoll < 0.4) sizeIdx = 1;
    else if (sizeRoll < 0.7) sizeIdx = 2;
    else if (sizeRoll < 0.9) sizeIdx = 3;
    else sizeIdx = 4;
    var sizeMult = FISH_SIZE_MULTS[sizeIdx];
    var sizeName = FISH_SIZES[sizeIdx];

    // A2: Golden catch (< 300ms reaction)
    var isGolden = reactionTime < 300;
    var goldenMult = isGolden ? 3 : 1;

    // A2: Rare catch (8%)
    var isRare = Math.random() < 0.08;
    var rareMult = isRare ? 5 : 1;

    var dustMult = getDustMult() * sizeMult * goldenMult * rareMult;
    var xpGain = Math.floor(res.xp * getStarShowerMult() * sizeMult * goldenMult);
    var dustGain = Math.floor(res.dust * dustMult);

    addXp('fishing', xpGain);
    if (window.StarDust) window.StarDust.add(dustGain);

    var catchText = 'Caught ' + sizeName + ' ' + res.name + '!';
    if (isGolden) catchText = 'GOLDEN catch! ' + catchText;
    if (isRare) catchText = 'RARE! ' + catchText;
    addLog(catchText + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)');

    if (status) {
      status.textContent = catchText;
      status.className = 'fishing-status';
      if (isGolden) status.classList.add('fishing-golden');
      else if (isRare) status.classList.add('fishing-rare');
    }
    if (sizeEl) sizeEl.textContent = sizeName + ' (' + reactionTime + 'ms)';

    var gameArea = $('skills-game-area');
    if (gameArea) {
      spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
      setTimeout(function () { spawnParticle(gameArea, '+' + dustGain + ' SD', 'dust'); }, 200);
    }

    // Common action hook
    onAction('fishing', dustGain);

    // C1: Pet wiggle
    animatePetAction('pet-wiggle');

    resetFishingVisuals();
    if (btn) btn.textContent = 'Hold to Cast';

    var cooldown = getToolCooldown('fishing', 800);
    if (btn) btn.disabled = true;
    setTimeout(function () {
      if (btn) btn.disabled = false;
      if (status) { status.className = 'fishing-status'; }
      if (sizeEl) sizeEl.textContent = '';
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
    }, cooldown);
  }

  function resetFishingVisuals() {
    var line = $('fishing-line');
    var bobber = $('fishing-bobber');
    var exclaim = $('fishing-exclaim');
    if (line) line.classList.remove('cast');
    if (bobber) { bobber.classList.remove('visible'); bobber.classList.remove('bite'); }
    if (exclaim) exclaim.classList.remove('visible');
  }

  // ══════════════════════════════════════════════
  // ── WOODCUTTING MINI-GAME (A3 enhanced) ────────
  // ══════════════════════════════════════════════
  function renderWoodcutting() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    var res = getHighestResource('woodcutting');
    var div = document.createElement('div');
    div.className = 'woodcutting-area';
    var hitsNeeded = 3 + Math.floor(state.skills.woodcutting.level / 20);
    wcState = { hits: 0, hitsNeeded: hitsNeeded, cooldown: false, lastChopTime: 0 };

    // A3: Tree tier label
    div.innerHTML =
      '<div class="wc-tree-label" id="wc-tree-label">' + res.name + '</div>' +
      '<div class="wc-tree" id="wc-tree">\uD83C\uDF33</div>' +
      '<div class="wc-hits-bar"><div class="wc-hits-fill" id="wc-hits-fill" style="width:0%"></div></div>' +
      '<div class="wc-hit-count" id="wc-hit-count">0 / ' + hitsNeeded + ' chops</div>';
    area.appendChild(div);
    $('wc-tree').addEventListener('click', onChopClick);

    // C1: Render pet
    renderPetInGameArea();
  }

  function onChopClick() {
    if (wcState.cooldown) return;
    var tree = $('wc-tree');
    if (!tree) return;
    var now = Date.now();

    // A3: Rhythm check (350-450ms = Double Chop!)
    var timeSinceLast = now - wcState.lastChopTime;
    var isDoubleChop = wcState.lastChopTime > 0 && timeSinceLast >= 350 && timeSinceLast <= 450;
    wcState.lastChopTime = now;

    wcState.cooldown = true;
    var chopCount = isDoubleChop ? 2 : 1;
    wcState.hits += chopCount;

    tree.classList.remove('chopping');
    void tree.offsetWidth;
    tree.classList.add('chopping');

    // A3: Double chop flash
    if (isDoubleChop) {
      var area = $('skills-game-area');
      if (area) {
        var flash = document.createElement('div');
        flash.className = 'wc-double-chop';
        flash.textContent = 'Double Chop!';
        flash.style.left = '50%';
        flash.style.top = '30%';
        flash.style.transform = 'translateX(-50%)';
        area.appendChild(flash);
        setTimeout(function () { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);
      }
    }

    var fill = $('wc-hits-fill');
    var count = $('wc-hit-count');
    if (fill) fill.style.width = (Math.min(wcState.hits / wcState.hitsNeeded, 1) * 100) + '%';
    if (count) count.textContent = Math.min(wcState.hits, wcState.hitsNeeded) + ' / ' + wcState.hitsNeeded + ' chops';

    if (wcState.hits >= wcState.hitsNeeded) {
      // Tree falls!
      tree.classList.remove('chopping');
      tree.classList.add('falling');
      var res = getHighestResource('woodcutting');
      var xpGain = Math.floor(res.xp * getStarShowerMult());
      var dustGain = Math.floor(res.dust * getDustMult());

      // A3: 10% bird nest drop
      var isNest = Math.random() < 0.1;
      if (isNest) {
        dustGain *= 10;
        addLog('Found a bird nest! 10x dust bonus!');
        var gameArea = $('skills-game-area');
        if (gameArea) spawnParticle(gameArea, '\uD83E\uDD5A Nest!', 'nest');
      }

      addXp('woodcutting', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);
      addLog('Chopped ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)');

      var gameArea2 = $('skills-game-area');
      if (gameArea2) {
        spawnParticle(gameArea2, '+' + xpGain + ' XP', 'xp');
        if (!isNest) {
          setTimeout(function () { spawnParticle(gameArea2, '+' + dustGain + ' SD', 'dust'); }, 200);
        }
      }

      // Common action hook
      onAction('woodcutting', dustGain);

      // C1: Pet cheer
      animatePetAction('pet-cheer');

      var cooldown = getToolCooldown('woodcutting', 800);
      setTimeout(function () {
        renderWoodcutting();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }, cooldown);
    } else {
      var chopCooldown = getToolCooldown('woodcutting', 300);
      setTimeout(function () {
        wcState.cooldown = false;
      }, chopCooldown);
    }
  }

  // ══════════════════════════════════════════════
  // ── SMITHING MINI-GAME (A4 enhanced) ──────────
  // ══════════════════════════════════════════════
  function renderSmithing() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'smithing-area';

    // Build recipe select
    var resources = SKILLS.smithing.resources;
    var level = state.skills.smithing.level;
    var options = '';
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].level <= level) {
        options += '<option value="' + i + '">' + resources[i].name + ' (Lv ' + resources[i].level + ')</option>';
      }
    }

    // A4: Calculate green zone width based on selected recipe
    var highestIdx = 0;
    for (var h = 0; h < resources.length; h++) {
      if (resources[h].level <= level) highestIdx = h;
    }
    var zoneWidth = Math.max(10, 35 - (highestIdx * 3.5)); // 35% → ~10% for high recipes
    var zoneLeft = Math.floor(50 - zoneWidth / 2);

    div.innerHTML =
      '<select class="smithing-recipe-select" id="smithing-recipe">' + options + '</select>' +
      '<div class="smithing-anvil" id="smithing-anvil">\uD83D\uDD28</div>' +
      '<div class="smithing-timing-bar" id="smithing-timing-bar">' +
        '<div class="smithing-timing-zone" id="smithing-zone" style="left:' + zoneLeft + '%;width:' + zoneWidth + '%"></div>' +
        '<div class="smithing-timing-cursor" id="smithing-cursor" style="left:0%"></div>' +
      '</div>' +
      '<div class="smithing-progress" id="smithing-progress">Click anvil when cursor is in green zone (0/5 hits)</div>' +
      '<div class="smithing-status" id="smithing-status"></div>';
    area.appendChild(div);

    // Set recipe to highest available
    var recipeEl = $('smithing-recipe');
    if (recipeEl && recipeEl.options.length > 0) {
      recipeEl.selectedIndex = recipeEl.options.length - 1;
    }

    // A4: Update zone when recipe changes
    if (recipeEl) {
      recipeEl.addEventListener('change', function () {
        var idx = parseInt(recipeEl.value);
        var newZoneWidth = Math.max(10, 35 - (idx * 3.5));
        var newZoneLeft = Math.floor(50 - newZoneWidth / 2);
        var zone = $('smithing-zone');
        if (zone) {
          zone.style.width = newZoneWidth + '%';
          zone.style.left = newZoneLeft + '%';
        }
      });
    }

    smithingState = { phase: 'active', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0 };
    startSmithingCursor();
    $('smithing-anvil').addEventListener('click', onSmithClick);

    // C1: Render pet
    renderPetInGameArea();
  }

  function startSmithingCursor() {
    if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
    smithingState.cursorPos = 0;
    smithingState.cursorDir = 1;
    var speed = 1.5;
    smithingState.cursorTimer = setInterval(function () {
      smithingState.cursorPos += smithingState.cursorDir * speed;
      if (smithingState.cursorPos >= 100) { smithingState.cursorPos = 100; smithingState.cursorDir = -1; }
      if (smithingState.cursorPos <= 0) { smithingState.cursorPos = 0; smithingState.cursorDir = 1; }
      var cursor = $('smithing-cursor');
      if (cursor) cursor.style.left = smithingState.cursorPos + '%';
    }, 20);
  }

  function onSmithClick() {
    if (smithingState.phase !== 'active') return;
    var anvil = $('smithing-anvil');
    if (anvil) {
      anvil.classList.remove('hit');
      void anvil.offsetWidth;
      anvil.classList.add('hit');
    }

    // Get zone bounds
    var zone = $('smithing-zone');
    var zoneLeft = zone ? parseFloat(zone.style.left) : 35;
    var zoneWidth = zone ? parseFloat(zone.style.width) : 30;
    var zoneRight = zoneLeft + zoneWidth;

    var inZone = smithingState.cursorPos >= zoneLeft && smithingState.cursorPos <= zoneRight;
    smithingState.hits++;
    if (inZone) smithingState.bonusHits++;

    // A4: Hammer glow
    if (anvil) {
      anvil.classList.remove('glow-1', 'glow-2', 'glow-3', 'glow-4', 'glow-5');
      if (smithingState.bonusHits > 0) {
        anvil.classList.add('glow-' + Math.min(smithingState.bonusHits, 5));
      }
    }

    var progress = $('smithing-progress');
    if (progress) {
      progress.textContent = (inZone ? 'Perfect! ' : 'Miss... ') + '(' + smithingState.hits + '/5 hits)';
    }

    if (smithingState.hits >= 5) {
      // Complete
      if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
      smithingState.phase = 'done';

      var recipeEl = $('smithing-recipe');
      var idx = recipeEl ? parseInt(recipeEl.value) : 0;
      var res = SKILLS.smithing.resources[idx] || SKILLS.smithing.resources[0];

      // A4: Masterwork check (5/5 perfect)
      var isMasterwork = smithingState.bonusHits >= 5;
      var bonusMult = isMasterwork ? 5 : (1 + (smithingState.bonusHits * 0.25));
      var xpGain = Math.floor(res.xp * bonusMult * getStarShowerMult());
      var dustGain = Math.floor(res.dust * bonusMult * getDustMult());

      addXp('smithing', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);

      var logText = isMasterwork
        ? 'MASTERWORK! ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD) [5/5 perfect]'
        : 'Smithed ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD) [' + smithingState.bonusHits + '/5 perfect]';
      addLog(logText);

      var gameArea = $('skills-game-area');
      if (gameArea) {
        spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
        setTimeout(function () { spawnParticle(gameArea, '+' + dustGain + ' SD', 'dust'); }, 200);
      }

      // A4: Masterwork flash
      if (isMasterwork && gameArea) {
        var mw = document.createElement('div');
        mw.className = 'smithing-masterwork';
        mw.textContent = 'MASTERWORK!';
        mw.style.left = '50%';
        mw.style.top = '30%';
        mw.style.transform = 'translateX(-50%)';
        gameArea.appendChild(mw);
        setTimeout(function () { if (mw.parentNode) mw.parentNode.removeChild(mw); }, 1000);
      }

      var status = $('smithing-status');
      if (status) status.textContent = isMasterwork ? 'MASTERWORK! 5/5 perfect!' : smithingState.bonusHits + '/5 perfect hits!';

      // Common action hook
      onAction('smithing', dustGain);

      // C1: Pet bounce
      animatePetAction('pet-bounce');

      var cooldown = getToolCooldown('smithing', 1000);
      setTimeout(function () {
        renderSmithing();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }, cooldown);
    }
  }

  // ══════════════════════════════════════════════
  // ── COMBAT MINI-GAME (A5 overhauled) ──────────
  // ══════════════════════════════════════════════
  function renderCombat() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    var level = state.skills.combat.level;
    var div = document.createElement('div');
    div.className = 'combat-area';
    div.innerHTML =
      '<div class="combat-enemy-name" id="combat-enemy-name"></div>' +
      '<div class="combat-enemy" id="combat-enemy">' +
        '<div class="combat-enemy-sprite" id="combat-enemy-sprite"></div>' +
      '</div>' +
      '<div class="combat-hp-bar"><div class="combat-hp-fill" id="combat-hp-fill" style="width:100%"></div></div>' +
      '<div class="combat-hp-text" id="combat-hp-text"></div>' +
      // A5: Player section
      '<div class="combat-player-section">' +
        '<span class="combat-player-hp-text">You:</span>' +
        '<div class="combat-player-hp-bar"><div class="combat-player-hp-fill" id="combat-player-hp-fill" style="width:100%"></div></div>' +
        '<span class="combat-player-hp-text" id="combat-player-hp-text"></span>' +
      '</div>' +
      '<div class="combat-actions">' +
        '<button class="combat-btn" id="combat-btn">Attack</button>' +
        '<button class="combat-dodge-btn" id="combat-dodge-btn">Dodge</button>' +
        '<button class="combat-potion-btn" id="combat-potion-btn">Potion (3)</button>' +
      '</div>' +
      '<div class="combat-streak" id="combat-streak"></div>';
    area.appendChild(div);

    // A5: Initialize player HP
    combatState.playerMaxHp = 100 + level * 3;
    combatState.playerHp = combatState.playerMaxHp;
    combatState.potions = 3;
    combatState.dead = false;
    combatState.dodgeCooldown = false;

    $('combat-btn').addEventListener('click', onCombatAttack);
    $('combat-dodge-btn').addEventListener('click', onCombatDodge);
    $('combat-potion-btn').addEventListener('click', onCombatPotion);
    updatePlayerHP();
    spawnCombatEnemy();

    // C1: Render pet
    renderPetInGameArea();
  }

  function spawnCombatEnemy() {
    var level = state.skills.combat.level;
    var res = getHighestResource('combat');
    var hpBase = 20 + level * 5;
    combatState.enemyHp = hpBase;
    combatState.enemyMaxHp = hpBase;
    combatState.enemyName = res.name;
    combatState.cooldown = false;
    combatState.dodgeWindow = false;

    var nameEl = $('combat-enemy-name');
    if (nameEl) nameEl.textContent = res.name + ' (Lv ' + level + ')';

    // Try to render an enemy sprite
    var spriteEl = $('combat-enemy-sprite');
    if (spriteEl) {
      var enemySprites = {
        'Training Dummy': null,
        'Slime': 'green-slime',
        'Goblin': 'goblin-basic',
        'Skeleton': 'goblin-dagger',
        'Demon': 'red-slime',
        'Dragon': 'blue-slime',
        'Titan': 'myconid-brown'
      };
      var eid = enemySprites[res.name];
      if (eid && enemyData && enemyData[eid]) {
        var e = enemyData[eid];
        spriteEl.style.backgroundImage = 'url(' + (e.sprite || '') + ')';
        spriteEl.style.backgroundPosition = '0 0';
        spriteEl.style.fontSize = '';
        spriteEl.style.display = '';
        spriteEl.textContent = '';
      } else {
        spriteEl.style.backgroundImage = '';
        spriteEl.textContent = '\u2694';
        spriteEl.style.fontSize = '2rem';
        spriteEl.style.display = 'flex';
        spriteEl.style.alignItems = 'center';
        spriteEl.style.justifyContent = 'center';
      }
    }

    updateCombatHP();
    updatePotionBtn();

    // Enemy auto-attacks — now deal real damage
    if (combatState.enemyTimer) clearInterval(combatState.enemyTimer);
    combatState.enemyTimer = setInterval(function () {
      if (combatState.enemyHp <= 0 || combatState.dead) return;

      // A5: Open dodge window briefly before attack hits
      combatState.dodgeWindow = true;
      if (combatState.dodgeWindowTimer) clearTimeout(combatState.dodgeWindowTimer);
      combatState.dodgeWindowTimer = setTimeout(function () {
        if (!combatState.dodgeWindow) return; // already dodged
        combatState.dodgeWindow = false;

        // A5: Enemy attack deals real damage
        var dmg = Math.floor(5 + level * 0.5);
        combatState.playerHp = Math.max(0, combatState.playerHp - dmg);
        addLog(combatState.enemyName + ' attacks! (-' + dmg + ' HP)');

        var enemy = $('combat-enemy');
        if (enemy) {
          var floater = document.createElement('div');
          floater.className = 'combat-dmg-float enemy-dmg';
          floater.textContent = '-' + dmg;
          floater.style.left = '30%';
          floater.style.top = '20%';
          enemy.appendChild(floater);
          setTimeout(function () { if (floater.parentNode) floater.parentNode.removeChild(floater); }, 800);
        }

        updatePlayerHP();

        // A5: Player death check
        if (combatState.playerHp <= 0) {
          onPlayerDeath();
        }
      }, 500); // 500ms dodge window
    }, 2000);

    var streakEl = $('combat-streak');
    if (streakEl) streakEl.textContent = combatState.streak > 0 ? 'Kill streak: ' + combatState.streak : '';
  }

  function updateCombatHP() {
    var fill = $('combat-hp-fill');
    var text = $('combat-hp-text');
    if (fill) fill.style.width = ((combatState.enemyHp / combatState.enemyMaxHp) * 100) + '%';
    if (text) text.textContent = combatState.enemyHp + ' / ' + combatState.enemyMaxHp + ' HP';
  }

  function updatePlayerHP() {
    var fill = $('combat-player-hp-fill');
    var text = $('combat-player-hp-text');
    if (fill) fill.style.width = ((combatState.playerHp / combatState.playerMaxHp) * 100) + '%';
    if (text) text.textContent = combatState.playerHp + ' / ' + combatState.playerMaxHp;
  }

  function updatePotionBtn() {
    var btn = $('combat-potion-btn');
    if (btn) {
      btn.textContent = 'Potion (' + combatState.potions + ')';
      btn.disabled = combatState.potions <= 0 || combatState.playerHp >= combatState.playerMaxHp || combatState.dead;
    }
  }

  // A5: Dodge mechanic
  function onCombatDodge() {
    if (combatState.dodgeCooldown || combatState.dead) return;
    if (!combatState.dodgeWindow) return; // nothing to dodge

    combatState.dodgeWindow = false;
    if (combatState.dodgeWindowTimer) clearTimeout(combatState.dodgeWindowTimer);
    combatState.dodgeCooldown = true;

    addLog('Dodged!');
    var enemy = $('combat-enemy');
    if (enemy) {
      var floater = document.createElement('div');
      floater.className = 'combat-dmg-float dodge-text';
      floater.textContent = 'Dodged!';
      floater.style.left = '50%';
      floater.style.top = '30%';
      enemy.appendChild(floater);
      setTimeout(function () { if (floater.parentNode) floater.parentNode.removeChild(floater); }, 800);
    }

    var dodgeBtn = $('combat-dodge-btn');
    if (dodgeBtn) dodgeBtn.disabled = true;

    setTimeout(function () {
      combatState.dodgeCooldown = false;
      if (dodgeBtn) dodgeBtn.disabled = combatState.dead;
    }, 2000);
  }

  // A5: Potion mechanic
  function onCombatPotion() {
    if (combatState.potions <= 0 || combatState.dead) return;
    if (combatState.playerHp >= combatState.playerMaxHp) return;
    combatState.potions--;
    var heal = Math.floor(combatState.playerMaxHp * 0.3);
    combatState.playerHp = Math.min(combatState.playerMaxHp, combatState.playerHp + heal);
    updatePlayerHP();
    updatePotionBtn();
    addLog('Used potion! Healed ' + heal + ' HP.');
  }

  // A5: Player death
  function onPlayerDeath() {
    combatState.dead = true;
    combatState.streak = 0;
    if (combatState.enemyTimer) clearInterval(combatState.enemyTimer);

    var area = $('skills-game-area');
    if (!area) return;

    var overlay = document.createElement('div');
    overlay.className = 'combat-death-overlay';
    overlay.innerHTML =
      '<div class="combat-death-text">YOU DIED</div>' +
      '<div class="combat-death-countdown" id="combat-death-countdown">Respawning in 3...</div>';
    area.appendChild(overlay);

    var remaining = 3;
    var deathTimer = setInterval(function () {
      remaining--;
      var cdEl = $('combat-death-countdown');
      if (remaining <= 0) {
        clearInterval(deathTimer);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        combatState.dead = false;
        combatState.playerHp = combatState.playerMaxHp;
        combatState.potions = 3;
        updatePlayerHP();
        updatePotionBtn();
        spawnCombatEnemy();
        var streakEl = $('combat-streak');
        if (streakEl) streakEl.textContent = '';
      } else if (cdEl) {
        cdEl.textContent = 'Respawning in ' + remaining + '...';
      }
    }, 1000);
  }

  function onCombatAttack() {
    if (combatState.cooldown || combatState.dead) return;
    combatState.cooldown = true;

    var level = state.skills.combat.level;
    var baseDmg = 10 + level * 2;
    var petId = state.skills.combat.assignedPet;
    var typeMult = 1;
    if (petId) typeMult = getTypeBonus(petId, 'combat');

    // A5: 15% crit chance
    var isCrit = Math.random() < 0.15;
    var critMult = isCrit ? 2 : 1;

    var dmg = Math.floor(baseDmg * typeMult * critMult * (0.8 + Math.random() * 0.4));

    combatState.enemyHp = Math.max(0, combatState.enemyHp - dmg);
    updateCombatHP();

    // Float damage
    var enemy = $('combat-enemy');
    if (enemy) {
      var floater = document.createElement('div');
      floater.className = 'combat-dmg-float player-dmg';
      if (isCrit) floater.classList.add('crit');
      floater.textContent = isCrit ? 'CRIT! -' + dmg : '-' + dmg;
      floater.style.left = '60%';
      floater.style.top = '10%';
      enemy.appendChild(floater);
      setTimeout(function () { if (floater.parentNode) floater.parentNode.removeChild(floater); }, 800);
    }

    if (isCrit) addLog('CRITICAL HIT! -' + dmg + ' damage!');

    if (combatState.enemyHp <= 0) {
      // Kill!
      if (combatState.enemyTimer) clearInterval(combatState.enemyTimer);
      combatState.streak++;
      var res = getHighestResource('combat');
      var streakBonus = 1 + Math.min(combatState.streak * 0.05, 0.5);
      var xpGain = Math.floor(res.xp * streakBonus * getStarShowerMult());
      var dustGain = Math.floor(res.dust * streakBonus * getDustMult());

      addXp('combat', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);
      addLog('Defeated ' + res.name + '! (+' + xpGain + ' XP, +' + dustGain + ' SD) [streak: ' + combatState.streak + ']');

      var gameArea = $('skills-game-area');
      if (gameArea) {
        spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
        setTimeout(function () { spawnParticle(gameArea, '+' + dustGain + ' SD', 'dust'); }, 200);
      }

      // Common action hook
      onAction('combat', dustGain);

      // C1: Pet bounce
      animatePetAction('pet-bounce');

      // A5: Reset potions on kill
      combatState.potions = 3;
      updatePotionBtn();

      var cooldown = getToolCooldown('combat', 800);
      setTimeout(function () {
        spawnCombatEnemy();
        combatState.cooldown = false;
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }, cooldown);
    } else {
      var atkCooldown = getToolCooldown('combat', 500);
      setTimeout(function () { combatState.cooldown = false; }, atkCooldown);
    }
  }

  // ══════════════════════════════════════════════
  // ── SKILL SWITCHING ───────────────────────────
  // ══════════════════════════════════════════════
  var SKILL_RENDERERS = {
    mining: renderMining,
    fishing: renderFishing,
    woodcutting: renderWoodcutting,
    smithing: renderSmithing,
    combat: renderCombat
  };

  function switchSkill(key) {
    // Cleanup previous
    cleanupActiveGame();
    activeSkill = key;

    // D4: Set data-skill attribute for themed background
    var area = $('skills-game-area');
    if (area) area.setAttribute('data-skill', key);

    updateGameHeader();
    renderSkillList();
    renderRightPanel();
    var renderer = SKILL_RENDERERS[key];
    if (renderer) renderer();
    // Clear log
    var log = $('skills-game-log');
    if (log) log.innerHTML = '';
    // Update lastActiveAt for idle calculation
    state.skills[key].lastActiveAt = Date.now();
    saveState();
  }

  function cleanupActiveGame() {
    miningCooldown = false;
    miningCombo = { count: 0, lastClickTime: 0 };
    if (fishingState.timer) clearTimeout(fishingState.timer);
    if (fishingState.biteTimeout) clearTimeout(fishingState.biteTimeout);
    if (fishingState.castTimer) clearInterval(fishingState.castTimer);
    fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };
    wcState = { hits: 0, hitsNeeded: 0, cooldown: false, lastChopTime: 0 };
    if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
    smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0 };
    if (combatState.enemyTimer) clearInterval(combatState.enemyTimer);
    if (combatState.dodgeWindowTimer) clearTimeout(combatState.dodgeWindowTimer);
    combatState = {
      enemyHp: 0, enemyMaxHp: 0, enemyName: '', streak: 0, enemyTimer: null, cooldown: false,
      playerHp: 0, playerMaxHp: 0, potions: 3, dodgeCooldown: false, dead: false,
      dodgeWindow: false, dodgeWindowTimer: null
    };
  }

  // ══════════════════════════════════════════════
  // ── PET ASSIGNMENT ────────────────────────────
  // ══════════════════════════════════════════════
  function openPetPicker() {
    var ps = loadPetState();
    if (!ps || !ps.pets) { addLog('No pets owned!'); return; }
    var grid = $('skills-pet-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Collect assigned pets across all skills
    var assigned = {};
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var pid = state.skills[SKILL_KEYS[i]].assignedPet;
      if (pid && SKILL_KEYS[i] !== activeSkill) assigned[pid] = SKILL_KEYS[i];
    }

    var petIds = Object.keys(ps.pets);
    if (petIds.length === 0) { addLog('No pets owned!'); return; }

    for (var j = 0; j < petIds.length; j++) {
      var id = petIds[j];
      var c = catalog && catalog.creatures ? catalog.creatures[id] : null;
      if (!c) continue;

      var card = document.createElement('div');
      card.className = 'skills-pet-pick-card';
      if (assigned[id]) card.classList.add('assigned-elsewhere');
      card.setAttribute('data-pet', id);

      var sprite = document.createElement('div');
      sprite.className = 'skills-pet-pick-sprite';
      if (spriteData) {
        var sid = c.spriteId || id;
        var petSkin = ps.pets[id].skin === 'alt' ? 'alt' : 'default';
        var sheetKey = petSkin === 'alt' ? sid + '-alt' : sid;
        var data = spriteData[sheetKey] || spriteData[sid];
        if (data) {
          var petLevel = ps.pets[id].level || 1;
          var frameOffset = data.frameOffset || 0;
          var frameIdx = Math.min(frameOffset + petLevel - 1, (data.frames || 3) - 1);
          sprite.style.backgroundImage = 'url(' + data.sheet + ')';
          sprite.style.backgroundPosition = '-' + (frameIdx * 48) + 'px 0';
        }
      }
      card.appendChild(sprite);

      var nameDiv = document.createElement('div');
      nameDiv.className = 'skills-pet-pick-name';
      var stars = getPetStars(id);
      var starStr = '';
      for (var s = 0; s < stars; s++) starStr += '\u2605';
      nameDiv.textContent = c.name + (starStr ? ' ' + starStr : '');
      card.appendChild(nameDiv);

      var typeDiv = document.createElement('div');
      typeDiv.className = 'skills-pet-pick-type';
      var bonus = getTypeBonus(id, activeSkill);
      typeDiv.textContent = c.type + (bonus > 1 ? ' (' + bonus + 'x)' : '');
      card.appendChild(typeDiv);

      if (assigned[id]) {
        var usedDiv = document.createElement('div');
        usedDiv.className = 'skills-pet-pick-type';
        usedDiv.textContent = '(' + SKILLS[assigned[id]].name + ')';
        card.appendChild(usedDiv);
      }

      card.addEventListener('click', (function (petId) {
        return function () { assignPet(petId); };
      })(id));

      grid.appendChild(card);
    }

    $('skills-pet-picker').style.display = '';
  }

  function assignPet(petId) {
    state.skills[activeSkill].assignedPet = petId;
    state.skills[activeSkill].lastActiveAt = Date.now();
    saveState();
    $('skills-pet-picker').style.display = 'none';
    renderRightPanel();
    renderPetInGameArea(); // C1: Update pet in game area
    addLog('Assigned ' + (catalog.creatures[petId] ? catalog.creatures[petId].name : petId) + ' to ' + SKILLS[activeSkill].name);
  }

  function unassignPet() {
    state.skills[activeSkill].assignedPet = null;
    saveState();
    renderRightPanel();
    // C1: Remove pet from game area
    var existing = document.querySelector('.skills-game-pet');
    if (existing) existing.parentNode.removeChild(existing);
    addLog('Pet unassigned from ' + SKILLS[activeSkill].name);
  }

  // ══════════════════════════════════════════════
  // ── TOOL UPGRADES ─────────────────────────────
  // ══════════════════════════════════════════════
  function upgradeTool() {
    var s = state.skills[activeSkill];
    var tier = s.toolTier || 0;
    if (tier >= 5) return;
    var cost = TOOL_COSTS[tier];
    if (!window.StarDust || !window.StarDust.canAfford(cost)) return;
    if (s.level < TOOL_LEVEL_REQS[tier]) return;
    window.StarDust.deduct(cost);
    s.toolTier = tier + 1;
    saveState();
    renderRightPanel();
    addLog('Upgraded to ' + TOOL_NAMES[activeSkill][s.toolTier] + '!');
  }

  // ══════════════════════════════════════════════
  // ── STAR PRESTIGE (D3 enhanced) ───────────────
  // ══════════════════════════════════════════════
  function initiateStarUp() {
    var s = state.skills[activeSkill];
    var petId = s.assignedPet;
    if (!petId) return;
    var stars = getPetStars(petId);
    if (stars >= 5) return;
    var cost = STAR_COSTS[stars];
    if (!window.StarDust || !window.StarDust.canAfford(cost)) return;

    var petName = (catalog && catalog.creatures[petId]) ? catalog.creatures[petId].name : petId;
    var text = petName + ' will gain Star ' + (stars + 1) + '.\n\n' +
      'Cost: ' + formatNum(cost) + ' Star Dust\n' +
      'Bonus: ' + (stars + 1) + '0% all battle stats, x' + Math.pow(2, stars + 1) + ' auto-production\n\n' +
      'WARNING: ' + SKILLS[activeSkill].name + ' resets to Level 1!';

    var textEl = $('skills-confirm-text');
    if (textEl) textEl.textContent = text;
    $('skills-confirm-overlay').style.display = '';
  }

  function confirmStarUp() {
    var s = state.skills[activeSkill];
    var petId = s.assignedPet;
    if (!petId) return;
    var stars = getPetStars(petId);
    if (stars >= 5) return;
    var cost = STAR_COSTS[stars];

    window.StarDust.deduct(cost);
    savePetStars(petId, stars + 1);

    // Soft reset: skill back to level 1
    s.level = 1;
    s.xp = 0;
    saveState();

    $('skills-confirm-overlay').style.display = 'none';

    // D3: Golden burst overlay
    var burst = document.createElement('div');
    burst.className = 'star-up-burst';
    document.body.appendChild(burst);
    setTimeout(function () { if (burst.parentNode) burst.parentNode.removeChild(burst); }, 800);

    // D3: Star display shake
    var starsEl = $('skills-stars-display');
    if (starsEl) {
      starsEl.classList.add('star-shake');
      setTimeout(function () { starsEl.classList.remove('star-shake'); }, 500);
    }

    // D3: Pet celebrate
    if (window.PetSystem && window.PetSystem.celebrate) window.PetSystem.celebrate();

    var petName = (catalog && catalog.creatures[petId]) ? catalog.creatures[petId].name : petId;
    addLog(petName + ' is now ' + (stars + 1) + '-star! ' + SKILLS[activeSkill].name + ' reset to Lv 1.');

    renderSkillList();
    renderRightPanel();
    updateGameHeader();
    var renderer = SKILL_RENDERERS[activeSkill];
    if (renderer) renderer();
  }

  // ══════════════════════════════════════════════
  // ── IDLE / OFFLINE PROGRESS ───────────────────
  // ══════════════════════════════════════════════
  function calculateIdleRewards() {
    var now = Date.now();
    var rewards = [];
    var totalXp = 0;
    var totalDust = 0;

    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var key = SKILL_KEYS[i];
      var s = state.skills[key];
      if (!s.assignedPet || !s.lastActiveAt) continue;

      var elapsed = Math.min(now - s.lastActiveAt, IDLE_CAP_MS);
      if (elapsed < 30000) continue;

      var actionInterval = 30000 / (1 + s.level * 0.02);
      var actions = Math.floor(elapsed / actionInterval);
      if (actions <= 0) continue;

      var res = getHighestResource(key);
      var tierMult = getTierMult(s.assignedPet);
      var typeBonus = getTypeBonus(s.assignedPet, key);
      var starMult = getStarAutoMult(s.assignedPet);

      var xpPerAction = Math.floor(res.xp * tierMult * typeBonus * starMult);
      var dustPerAction = Math.floor(res.dust * tierMult * typeBonus * starMult);

      var xpTotal = actions * xpPerAction;
      var dustTotal = actions * dustPerAction;

      addXp(key, xpTotal);
      if (window.StarDust) window.StarDust.add(dustTotal);

      totalXp += xpTotal;
      totalDust += dustTotal;

      rewards.push({
        skill: key,
        petId: s.assignedPet,
        xp: xpTotal,
        dust: dustTotal,
        actions: actions
      });

      s.lastActiveAt = now;
    }

    saveState();
    return { rewards: rewards, totalXp: totalXp, totalDust: totalDust };
  }

  function showIdleReport(result) {
    if (result.rewards.length === 0) return;
    var content = $('skills-idle-report-content');
    if (!content) return;
    content.innerHTML = '';

    // C3: Pet speaks "missed you!" on idle report
    var idleLine = PET_IDLE_SPEECH[Math.floor(Math.random() * PET_IDLE_SPEECH.length)];
    if (window.PetSystem && window.PetSystem.speak) window.PetSystem.speak(idleLine);

    for (var i = 0; i < result.rewards.length; i++) {
      var r = result.rewards[i];
      var c = (catalog && catalog.creatures) ? catalog.creatures[r.petId] : null;
      var petName = c ? c.name : r.petId;

      var line = document.createElement('div');
      line.className = 'idle-pet-line';

      var sprite = document.createElement('div');
      sprite.className = 'idle-pet-sprite';
      if (c && spriteData) {
        var sid = c.spriteId || r.petId;
        var data = spriteData[sid];
        if (data) {
          sprite.style.backgroundImage = 'url(' + data.sheet + ')';
          sprite.style.backgroundPosition = '0 0';
        }
      }
      line.appendChild(sprite);

      var text = document.createElement('span');
      text.textContent = petName + ' earned ' + formatNum(r.xp) + ' ' + SKILLS[r.skill].name + ' XP + ' + formatNum(r.dust) + ' SD';
      line.appendChild(text);

      content.appendChild(line);
    }

    var totalLine = document.createElement('div');
    totalLine.className = 'idle-total';
    totalLine.textContent = 'Total: ' + formatNum(result.totalXp) + ' XP, ' + formatNum(result.totalDust) + ' Star Dust';
    content.appendChild(totalLine);

    $('skills-idle-report').style.display = '';
  }

  // ── Active page auto-train ────────────────────
  function startActiveAutoTrain() {
    if (activeAutoTimer) clearInterval(activeAutoTimer);
    activeAutoTimer = setInterval(function () {
      for (var i = 0; i < SKILL_KEYS.length; i++) {
        var key = SKILL_KEYS[i];
        var s = state.skills[key];
        if (!s.assignedPet) continue;

        var res = getHighestResource(key);
        var tierMult = getTierMult(s.assignedPet);
        var typeBonus = getTypeBonus(s.assignedPet, key);
        var starMult = getStarAutoMult(s.assignedPet);

        var xp = Math.floor(res.xp * tierMult * typeBonus * starMult * 0.5);
        var dust = Math.floor(res.dust * tierMult * typeBonus * starMult * 0.5);

        if (xp > 0) addXp(key, xp);
        if (dust > 0 && window.StarDust) window.StarDust.add(dust);

        if (key === activeSkill && (xp > 0 || dust > 0)) {
          spawnAutoFloat('+' + xp + ' XP +' + dust + ' SD');
        }
      }
      renderSkillList();
      renderRightPanel();
    }, ACTIVE_AUTO_INTERVAL);
  }

  // ══════════════════════════════════════════════
  // ── KEYBOARD SHORTCUTS ────────────────────────
  // ══════════════════════════════════════════════
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    var num = parseInt(e.key);
    if (num >= 1 && num <= 5) {
      switchSkill(SKILL_KEYS[num - 1]);
    }
  }

  // ══════════════════════════════════════════════
  // ── INITIALIZATION ────────────────────────────
  // ══════════════════════════════════════════════
  function loadRemoteData(callback) {
    var loaded = 0;
    var total = 3;

    function check() {
      loaded++;
      if (loaded >= total) callback();
    }

    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', '/data/petsprites.json', true);
    xhr1.onload = function () {
      if (xhr1.status === 200) {
        try { spriteData = JSON.parse(xhr1.responseText); } catch (e) {}
      }
      check();
    };
    xhr1.onerror = check;
    xhr1.send();

    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/data/petcatalog.json', true);
    xhr2.onload = function () {
      if (xhr2.status === 200) {
        try { catalog = JSON.parse(xhr2.responseText); } catch (e) {}
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
  }

  function init() {
    if (!$('skills-page')) return;

    state = loadState();

    loadRemoteData(function () {
      // Calculate idle rewards first
      var idleResult = calculateIdleRewards();

      // D4: Set initial data-skill attribute
      var area = $('skills-game-area');
      if (area) area.setAttribute('data-skill', activeSkill);

      // Render UI
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
      renderMining();

      // Show idle report if any
      if (idleResult.rewards.length > 0) {
        showIdleReport(idleResult);
      }

      // Start active auto-train
      startActiveAutoTrain();

      // Event listeners
      var skillRows = document.querySelectorAll('.skill-row');
      for (var i = 0; i < skillRows.length; i++) {
        skillRows[i].addEventListener('click', (function (key) {
          return function () { switchSkill(key); };
        })(skillRows[i].getAttribute('data-skill')));
      }

      var assignBtn = $('skills-assign-btn');
      if (assignBtn) assignBtn.addEventListener('click', openPetPicker);

      var unassignBtn = $('skills-unassign-btn');
      if (unassignBtn) unassignBtn.addEventListener('click', unassignPet);

      var pickerClose = $('skills-picker-close');
      if (pickerClose) pickerClose.addEventListener('click', function () {
        $('skills-pet-picker').style.display = 'none';
      });

      var toolBtn = $('skills-upgrade-tool-btn');
      if (toolBtn) toolBtn.addEventListener('click', upgradeTool);

      var starBtn = $('skills-starup-btn');
      if (starBtn) starBtn.addEventListener('click', initiateStarUp);

      var confirmYes = $('skills-confirm-yes');
      if (confirmYes) confirmYes.addEventListener('click', confirmStarUp);

      var confirmNo = $('skills-confirm-no');
      if (confirmNo) confirmNo.addEventListener('click', function () {
        $('skills-confirm-overlay').style.display = 'none';
      });

      var idleOk = $('skills-idle-report-ok');
      if (idleOk) idleOk.addEventListener('click', function () {
        $('skills-idle-report').style.display = 'none';
      });

      document.addEventListener('keydown', onKeyDown);

      // Update lastActiveAt for all skills with pets on page load
      var now = Date.now();
      for (var j = 0; j < SKILL_KEYS.length; j++) {
        if (state.skills[SKILL_KEYS[j]].assignedPet) {
          state.skills[SKILL_KEYS[j]].lastActiveAt = now;
        }
      }
      saveState();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
