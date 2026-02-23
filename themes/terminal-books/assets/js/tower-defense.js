(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var GRID_COLS = 16;
  var GRID_ROWS = 12;
  var TILE_SIZE = 40;

  var MAPS = {
    map1: {
      name: 'Valley',
      desc: 'Classic zigzag through the valley',
      path: [[0,6],[3,6],[3,2],[8,2],[8,8],[12,8],[12,4],[15,4]],
      spawn: [0,6], exit: [15,4]
    },
    map2: {
      name: 'Switchback',
      desc: 'Tight switchbacks from the north',
      path: [[15,1],[12,1],[12,5],[4,5],[4,8],[10,8],[10,11],[0,11]],
      spawn: [15,1], exit: [0,11]
    },
    map3: {
      name: 'Spiral',
      desc: 'Long spiral toward the center',
      path: [[0,1],[14,1],[14,10],[2,10],[2,5],[8,5],[8,8],[13,8]],
      spawn: [0,1], exit: [13,8]
    }
  };

  var currentMapId = 'map1';

  var DIFFICULTIES = {
    easy:   { label: 'Easy',   livesBonus: 10, hpMult: 0.7,  rewardMult: 0.8, speedMult: 0.9 },
    normal: { label: 'Normal', livesBonus: 0,  hpMult: 1.0,  rewardMult: 1.0, speedMult: 1.0 },
    hard:   { label: 'Hard',   livesBonus: -5, hpMult: 1.5,  rewardMult: 1.3, speedMult: 1.15 }
  };

  var currentDifficulty = 'normal';

  var TOWER_DEFS = {
    arrow:      { symbol: 'A',  name: 'Arrow',      dmg: 5,  range: 3, speed: 1.0, cost: 10, color: null,     blueprint: false, ability: { name: 'Volley',    desc: 'Fire 5 arrows at random enemies in range', cooldown: 15 } },
    cannon:     { symbol: 'C',  name: 'Cannon',     dmg: 15, range: 2, speed: 2.5, cost: 25, color: '#a86',   blueprint: false, ability: { name: 'Mega Blast', desc: 'Next shot 3x damage, 2x splash radius', cooldown: 20 } },
    frost:      { symbol: 'Fr', name: 'Frost',      dmg: 3,  range: 3, speed: 1.5, cost: 20, color: '#4cf',   blueprint: false, ability: { name: 'Blizzard',  desc: 'Freeze all enemies in range for 3s', cooldown: 25 } },
    watchtower: { symbol: 'Wt', name: 'Watchtower',  dmg: 0,  range: 3, speed: 0,   cost: 15, color: '#aaa',   blueprint: true, unlockCost: { processed: { stoneBricks: 1 } }, waveReq: 10, ability: { name: 'Rally', desc: 'Double range buff (+20%) for 10s', cooldown: 30 } },
    fire:       { symbol: 'Fi', name: 'Fire',        dmg: 10, range: 2, speed: 1.2, cost: 30, color: '#f84',   blueprint: true, unlockCost: { raw: { hardwood: 2 } }, waveReq: 15, ability: { name: 'Inferno', desc: 'Apply DOT to all enemies on map', cooldown: 25 } },
    sniper:     { symbol: 'S',  name: 'Sniper',      dmg: 25, range: 5, speed: 3.0, cost: 50, color: '#8cf',   blueprint: true, unlockCost: { processed: { ironBars: 2 } }, waveReq: 20, ability: { name: 'Headshot', desc: '200 damage to highest-HP enemy in range', cooldown: 20 } },
    goldmine:   { symbol: 'G',  name: 'Gold Mine',   dmg: 0,  range: 0, speed: 0,   cost: 40, color: '#ffd700',blueprint: true, unlockCost: { raw: { gold: 1 } }, waveReq: 25, ability: { name: 'Payday', desc: '+15 SB instantly', cooldown: 30 } },
    lightning:  { symbol: 'L',  name: 'Lightning',   dmg: 15, range: 3, speed: 2.5, cost: 60, color: '#ff0',   blueprint: true, unlockCost: { processed: { crystalLens: 1 } }, waveReq: 30, ability: { name: 'Storm', desc: 'Hit every enemy on screen', cooldown: 30 } }
  };

  var ENEMY_DEFS = {
    slime:    { hp: 20,  speed: 1.0, radius: 6,  color: '#4a4', shape: 'circle',   special: null },
    skeleton: { hp: 40,  speed: 1.2, radius: 6,  color: '#ddd', shape: 'triangle', special: null },
    goblin:   { hp: 30,  speed: 1.8, radius: 5,  color: '#ac4', shape: 'circle',   special: 'fast' },
    healer:   { hp: 45,  speed: 0.9, radius: 6,  color: '#4f8', shape: 'diamond',  special: 'healer' },
    orc:      { hp: 80,  speed: 0.7, radius: 8,  color: '#484', shape: 'square',   special: 'tanky' },
    splitter: { hp: 60,  speed: 1.0, radius: 7,  color: '#c6f', shape: 'hexagon',  special: 'split' },
    ghost:    { hp: 25,  speed: 1.0, radius: 6,  color: '#999', shape: 'circle',   special: 'dodge' },
    shielder: { hp: 50,  speed: 0.8, radius: 7,  color: '#6cf', shape: 'pentagon', special: 'shield' },
    boss:     { hp: 500, speed: 0.4, radius: 12, color: '#e44', shape: 'boss',     special: 'boss' }
  };

  var START_LIVES = 20;
  var START_SB = 50;
  var SPAWN_INTERVAL = 0.8;
  var PROJECTILE_SPEED = 6;
  var STATS_KEY = 'arebooksgood-td-stats';
  var CRATE_KEY = 'arebooksgood-td-crate';
  var SAVE_KEY = 'arebooksgood-td-save';

  // ── Tower Synergies ─────────────────────────────
  var SYNERGY_DEFS = [
    { id: 'crossfire',     towers: ['arrow', 'arrow'],     name: 'Crossfire',     desc: '+15% attack speed',             color: '#0f0' },
    { id: 'scorched',      towers: ['cannon', 'fire'],     name: 'Scorched Earth', desc: 'Cannon splash applies fire DOT', color: '#f84' },
    { id: 'superconductor',towers: ['frost', 'lightning'],  name: 'Superconductor', desc: '+30% dmg to slowed enemies',    color: '#4cf' },
    { id: 'spotter',       towers: ['sniper', 'watchtower'],name: 'Spotter',       desc: '+20% sniper damage',            color: '#8cf' },
    { id: 'firestorm',     towers: ['fire', 'fire'],       name: 'Firestorm',     desc: '+50% DOT duration',             color: '#f84' },
    { id: 'icearrows',     towers: ['arrow', 'frost'],     name: 'Ice Arrows',    desc: '25% chance to apply mild slow',  color: '#4cf' }
  ];

  // ── Hero Definitions ─────────────────────────────
  var HERO_DEFS = {
    fire:   { dmg: 7,  speed: 1.0, range: 2.5, color: '#f84', symbol: 'F',
              q: { name: 'Fire Breath', cooldown: 18, desc: 'Damage + fire DOT to all in range' },
              w: { name: 'Dragon Rage', cooldown: 28, desc: '2x attack speed + fire DOT for 8s' } },
    nature: { dmg: 8,  speed: 0.8, range: 2.5, color: '#f9c', symbol: 'N',
              q: { name: 'Pounce',     cooldown: 12, desc: 'Instant 3x damage to closest enemy' },
              w: { name: 'Nine Lives',  cooldown: 25, desc: 'Next 5 attacks crit for 2x damage' } },
    tech:   { dmg: 6,  speed: 1.2, range: 2.5, color: '#4cf', symbol: 'T',
              q: { name: 'EMP Blast',   cooldown: 20, desc: 'Stun all enemies in range for 2s' },
              w: { name: 'Overclock',   cooldown: 30, desc: '+30% attack speed to towers in range for 8s' } },
    aqua:   { dmg: 6,  speed: 1.0, range: 3.0, color: '#4af', symbol: 'A',
              q: { name: 'Tidal Wave',  cooldown: 16, desc: 'Knockback + slow all enemies in range' },
              w: { name: 'Whirlpool',   cooldown: 26, desc: 'Slow zone for 6s at hero position' } },
    shadow: { dmg: 9,  speed: 0.7, range: 2.0, color: '#a6f', symbol: 'S',
              q: { name: 'Backstab',    cooldown: 10, desc: 'Instant 4x damage to weakest enemy' },
              w: { name: 'Cloak',       cooldown: 30, desc: 'Invisible for 5s, next hit crits 3x' } },
    mystic: { dmg: 5,  speed: 1.1, range: 3.0, color: '#f6a', symbol: 'M',
              q: { name: 'Arcane Bolt', cooldown: 14, desc: 'Chain lightning hits 3 enemies' },
              w: { name: 'Enchant',     cooldown: 28, desc: 'Towers in range get +25% damage for 8s' } }
  };

  var HERO_ACCENT_COLORS = { fire: '#f84', nature: '#f9c', tech: '#4cf', aqua: '#4af', shadow: '#a6f', mystic: '#f6a' };

  var ACCESSORY_HERO_BONUSES = {
    partyhat:  { desc: '+5% hero attack speed',     stat: 'atkSpeed',   value: 0.05 },
    tophat:    { desc: '+10% SB from hero kills',    stat: 'killSB',    value: 0.1 },
    monocle:   { desc: '+20% hero range',            stat: 'range',     value: 0.2 },
    crown:     { desc: '+15% hero damage',           stat: 'damage',    value: 0.15 },
    farmerhat: { desc: 'Hero attacks slow enemies',  stat: 'slow',      value: 0.5 },
    bowtie:    { desc: '-10% ability cooldowns',     stat: 'cdReduce',  value: 0.1 },
    cape:      { desc: '+15% ability damage',        stat: 'abilityDmg',value: 0.15 }
  };

  // ── Gear stat → TD effect scaling ────────────────
  var GEAR_ATK_SCALE = 0.3;
  var GEAR_SPD_SCALE = 0.015;
  var GEAR_CRI_SCALE = 0.02;
  var GEAR_CRI_MULT = 1.5;
  var GEAR_DEF_CD_SCALE = 0.005;

  // Hero sprite rendering (sprite sheet)
  var heroSpriteData = null;
  var heroPetCatalog = null;
  var heroSpriteSheet = null;
  var heroSpriteFrameCount = 0;
  var heroSpriteMaxLevel = 3;
  var heroSpriteFrameOffset = 0;
  var heroAnimTimer = 0;
  var heroAnimFrame = 0;
  var HERO_DRAW_SIZE = 32; // display size on canvas

  function loadHeroSprites() {
    // Load catalog first to resolve spriteId, then load sprites
    var catXhr = new XMLHttpRequest();
    catXhr.open('GET', '/data/petcatalog.json', true);
    catXhr.onload = function () {
      if (catXhr.status === 200) {
        try { heroPetCatalog = JSON.parse(catXhr.responseText); } catch (e) {}
      }
      loadSprites();
    };
    catXhr.onerror = function () { loadSprites(); };
    catXhr.send();

    function loadSprites() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/data/petsprites.json', true);
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            heroSpriteData = JSON.parse(xhr.responseText);
            if (heroPetId) loadHeroSheet(heroPetId);
          } catch (e) {}
        }
      };
      xhr.send();
    }
  }

  function loadHeroSheet(petId) {
    heroSpriteSheet = null;
    heroSpriteFrameCount = 0;
    heroSpriteMaxLevel = 3;
    heroSpriteFrameOffset = 0;
    if (!heroSpriteData || !petId) return;
    // Resolve spriteId via catalog (e.g. golem → robot)
    var lookupId = petId;
    if (heroPetCatalog) {
      var legacy = heroPetCatalog.legacyMap && heroPetCatalog.legacyMap[petId];
      var cid = legacy || petId;
      if (heroPetCatalog.creatures && heroPetCatalog.creatures[cid] && heroPetCatalog.creatures[cid].spriteId) {
        lookupId = heroPetCatalog.creatures[cid].spriteId;
      }
    }
    var pd = heroSpriteData[lookupId];
    if (!pd || !pd.sheet) return;
    heroSpriteFrameCount = pd.frames || 3;
    heroSpriteMaxLevel = pd.maxLevel || 3;
    heroSpriteFrameOffset = pd.frameOffset || 0;
    var img = new Image();
    img.onload = function () { heroSpriteSheet = img; };
    img.src = (heroPetSkin === 'alt' && pd.altSheet) ? pd.altSheet : pd.sheet;
  }

  function drawHeroSprite(cx, cy, frameIdx) {
    if (!heroSpriteSheet) return;
    var half = HERO_DRAW_SIZE / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(heroSpriteSheet,
      frameIdx * 48, 0, 48, 48,
      cx - half, cy - half, HERO_DRAW_SIZE, HERO_DRAW_SIZE);
  }

  var synergyCache = {};

  function rebuildSynergyCache() {
    synergyCache = {};
    for (var i = 0; i < towers.length; i++) {
      var key = towers[i].col + ',' + towers[i].row;
      synergyCache[key] = computeSynergiesForTower(towers[i]);
    }
  }

  function computeSynergiesForTower(tower) {
    var synergies = [];
    var neighbors = [];
    for (var i = 0; i < towers.length; i++) {
      var other = towers[i];
      if (other === tower) continue;
      if (Math.abs(other.col - tower.col) <= 1 && Math.abs(other.row - tower.row) <= 1) {
        neighbors.push(other);
      }
    }
    for (var si = 0; si < SYNERGY_DEFS.length; si++) {
      var sd = SYNERGY_DEFS[si];
      var pair = sd.towers;
      // Same-type pair (e.g. arrow+arrow, fire+fire)
      if (pair[0] === pair[1]) {
        if (tower.type !== pair[0]) continue;
        var count = 0;
        for (var ni = 0; ni < neighbors.length; ni++) {
          if (neighbors[ni].type === pair[0]) count++;
        }
        if (count > 0) {
          synergies.push({ id: sd.id, stacks: count, partners: neighbors.filter(function (n) { return n.type === pair[0]; }) });
        }
      } else {
        // Mixed pair — tower must be one of the two types
        var myIdx = pair.indexOf(tower.type);
        if (myIdx === -1) continue;
        var partnerType = pair[1 - myIdx];
        var partners = [];
        for (var ni = 0; ni < neighbors.length; ni++) {
          if (neighbors[ni].type === partnerType) partners.push(neighbors[ni]);
        }
        if (partners.length > 0) {
          synergies.push({ id: sd.id, stacks: partners.length, partners: partners });
        }
      }
    }
    return synergies;
  }

  function hasSynergy(tower, id) {
    var key = tower.col + ',' + tower.row;
    var list = synergyCache[key];
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function getSynergyMultiplier(stacks) {
    // Diminishing returns: 1st=100%, 2nd=50%, 3rd=33%...
    var total = 0;
    for (var i = 1; i <= stacks; i++) {
      total += 1 / i;
    }
    return total;
  }

  function getTowerSynergies(tower) {
    var key = tower.col + ',' + tower.row;
    return synergyCache[key] || [];
  }

  // ── Farm integration guard ────────────────────────
  var hasFarmResources = typeof window.FarmResources !== 'undefined';

  // ── Armory ────────────────────────────────────────
  var ARMORY_KEY = 'arebooksgood-td-armory';
  var ARMORY_DEFS = {
    reinforcedWalls:   { name: 'Reinforced Walls',   desc: '+2 starting lives/tier',    maxTier: 3, baseCost: { processed: { stoneBricks: 5 } } },
    sharpenedArrows:   { name: 'Sharpened Arrows',   desc: '+10% arrow damage/tier',    maxTier: 3, baseCost: { processed: { planks: 3, ironBars: 1 } } },
    sturdyFoundations: { name: 'Sturdy Foundations',  desc: '-10% tower build cost/tier', maxTier: 3, baseCost: { processed: { planks: 4, stoneBricks: 3 } } },
    supplyLines:       { name: 'Supply Lines',        desc: '+5 starting SB/tier',       maxTier: 3, baseCost: { processed: { bread: 3, rope: 2 } } },
    crystalOptics:     { name: 'Crystal Optics',      desc: '+15% tower range/tier',     maxTier: 3, baseCost: { processed: { crystalLens: 2 } } },
    goldenTreasury:    { name: 'Golden Treasury',     desc: '+20% wave SB rewards/tier', maxTier: 3, baseCost: { raw: { gold: 2 } } },
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
      startSB: getArmoryTier('supplyLines') * 5,
      rangeMult: 1 + getArmoryTier('crystalOptics') * 0.15,
      rewardMult: 1 + getArmoryTier('goldenTreasury') * 0.2,
      towerLv4: getArmoryTier('hardenedSteel') >= 1,
      specialAbilities: getArmoryTier('arcaneMastery') >= 1
    };
  }

  var mods = computeModifiers();

  // ── Wave Milestones ─────────────────────────────
  var WAVE_MILESTONES = [
    { wave: 5, bonus: 5, material: { type: 'processed', key: 'planks', qty: 2 } },
    { wave: 10, bonus: 10, material: { type: 'processed', key: 'stoneBricks', qty: 2 } },
    { wave: 15, bonus: 15, material: { type: 'processed', key: 'ironBars', qty: 1 } },
    { wave: 20, bonus: 20, material: { type: 'processed', key: 'bread', qty: 2 } },
    { wave: 30, bonus: 30, material: { type: 'processed', key: 'crystalLens', qty: 1 } },
    { wave: 40, bonus: 40 },
    { wave: 50, bonus: 50 }
  ];

  // ── TD wave → farm building unlocks ─────────────
  var FARM_BLUEPRINTS = [
    { wave: 5,  buildings: ['chickenCoop'],           names: ['Chicken Coop'] },
    { wave: 10, buildings: ['cowPasture'],             names: ['Cow Pasture'] },
    { wave: 15, buildings: ['smokehouse'],             names: ['Smokehouse'] },
    { wave: 20, buildings: ['smithy'],                   names: ['Smithy'] },
    { wave: 25, buildings: ['sheepPen', 'loom'],       names: ['Sheep Pen', 'Loom'] },
    { wave: 30, buildings: ['deepMine', 'oldGrowth'],  names: ['Deep Mine', 'Old Growth'] },
    { wave: 40, buildings: ['enchanter'],              names: ['Enchanter'] }
  ];

  var MAX_INVEST_SB = 200;
  var INVEST_RATE = 3; // 3 JB per 1 SB

  function getFarmhouseBonus() {
    if (typeof window.FarmAPI !== 'undefined' && window.FarmAPI.getFarmhouseLevel) {
      var lvl = window.FarmAPI.getFarmhouseLevel();
      // Lv1=0, Lv2=10, Lv3=20, Lv4=30, Lv5=40
      return lvl > 1 ? (lvl - 1) * 10 : 0;
    }
    return 0;
  }

  function getMilestoneBonus() {
    var total = 0;
    for (var i = 0; i < WAVE_MILESTONES.length; i++) {
      if (stats.highestWave >= WAVE_MILESTONES[i].wave) {
        total += WAVE_MILESTONES[i].bonus;
      }
    }
    return total;
  }

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
      var maxLives = START_LIVES + mods.startLives + DIFFICULTIES[currentDifficulty].livesBonus;
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
      if (hero) { hero.cooldown = 0; hero.qCooldown = 0; hero.wCooldown = 0; }
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
  var hudSB = document.getElementById('td-sb');
  var hudEnemies = document.getElementById('td-enemies');

  var startOverlay = document.getElementById('td-start-overlay');
  var startButtonsEl = document.getElementById('td-start-buttons');
  var gameoverOverlay = document.getElementById('td-gameover-overlay');
  var playBtn = document.getElementById('td-play-btn');
  var retryBtn = document.getElementById('td-retry-btn');

  var finalWave = document.getElementById('td-final-wave');
  var finalKills = document.getElementById('td-final-kills');
  var finalTowers = document.getElementById('td-final-towers');
  var finalSBEl = document.getElementById('td-final-sb');

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
  var sb = START_SB;
  var sbEarned = 0;
  var investedSB = 0;
  var towers = [];
  var enemies = [];
  var projectiles = [];
  var particles = [];
  var lightningEffects = [];
  var splashEffects = [];
  var inspectedTower = null;
  var selectedTower = 'arrow';
  var hoverTile = null;
  var isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  var spawnQueue = [];
  var spawnTimer = 0;
  var totalSpawned = 0;
  var totalKilled = 0;
  var towersBuilt = 0;
  var rafId = null;
  var lastTime = 0;
  var gameSpeed = 1;
  var autoWave = false;

  // Hero state
  var hero = null;
  var heroPlacing = false;
  var heroMoving = false;
  var heroPetId = null;
  var heroPetType = null;
  var heroPetLevel = 1;
  var heroPetSkin = 'default';
  var heroAccessoryBonuses = {};

  // ── Path computation ──────────────────────────────
  var pathTiles = {};
  var pathSegments = [];
  var pathTotalLen = 0;

  function computePath() {
    pathTiles = {};
    pathSegments = [];
    pathTotalLen = 0;

    var wp = MAPS[currentMapId].path;
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
    if (hero && hero.col === col && hero.row === row) return false;
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
      shape: def.shape,
      special: def.special,
      dist: 0,
      alive: true,
      dot: null,
      slow: null,
      caltropsHit: {},
      healTimer: 0,
      isMinion: false
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
      if (e.slow && e.slow.remaining > 0) {
        pxPerSec *= e.slow.factor;
        e.slow.remaining -= dt;
      }
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

  function updateHealers(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive || e.special !== 'healer') continue;
      e.healTimer += dt;
      if (e.healTimer < 2.5) continue;
      e.healTimer -= 2.5;

      var healerPos = getPathPos(e.dist);
      for (var j = 0; j < enemies.length; j++) {
        var target = enemies[j];
        if (!target.alive || target === e) continue;
        if (target.hp >= target.maxHp) continue;
        var tp = getPathPos(target.dist);
        var dx = tp.x - healerPos.x;
        var dy = tp.y - healerPos.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 2 * TILE_SIZE) {
          var heal = Math.round(target.maxHp * 0.05);
          target.hp = Math.min(target.maxHp, target.hp + heal);
          spawnParticle(tp.x + (Math.random() - 0.5) * 8, tp.y - 10, '+heal', '#4f8');
        }
      }
    }
  }

  // Update shielded flag for visual indicator
  function updateShieldFlags() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      e.shielded = false;
      if (e.special === 'shield') continue;
      var ep = getPathPos(e.dist);
      for (var j = 0; j < enemies.length; j++) {
        var s = enemies[j];
        if (!s.alive || s.special !== 'shield') continue;
        var sp = getPathPos(s.dist);
        var dx = sp.x - ep.x;
        var dy = sp.y - ep.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 2 * TILE_SIZE) {
          e.shielded = true;
          break;
        }
      }
    }
  }

  function getShieldReduction(enemy) {
    // Check if any shielder is within 2 tiles — 40% damage reduction
    // Does NOT protect the shielder itself, does NOT stack
    if (enemy.special === 'shield') return 0;
    for (var i = 0; i < enemies.length; i++) {
      var s = enemies[i];
      if (!s.alive || s.special !== 'shield') continue;
      var sp = getPathPos(s.dist);
      var ep = getPathPos(enemy.dist);
      var dx = sp.x - ep.x;
      var dy = sp.y - ep.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 2 * TILE_SIZE) return 0.4;
    }
    return 0;
  }

  function damageEnemy(enemy, dmg, sourceTower, bypassShield) {
    // Ghost dodge: 50% evasion (DOT bypasses since it modifies hp directly)
    if (enemy.special === 'dodge' && Math.random() < 0.5) {
      var dodgePos = getPathPos(enemy.dist);
      spawnParticle(dodgePos.x + (Math.random() - 0.5) * 10, dodgePos.y - 12, 'DODGE', '#999');
      return;
    }
    // Shield bearer damage reduction (DOT bypasses shield)
    if (!bypassShield) {
      var shieldRed = getShieldReduction(enemy);
      if (shieldRed > 0) {
        dmg = Math.round(dmg * (1 - shieldRed));
      }
    }
    enemy.hp -= dmg;
    var pos = getPathPos(enemy.dist);
    spawnParticle(pos.x + (Math.random() - 0.5) * 10, pos.y - 12, '-' + dmg, colorFg);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      totalKilled++;
      if (sourceTower && typeof sourceTower.kills === 'number') sourceTower.kills++;

      // Hero kill SB bonus (Top Hat) — for ability kills
      if (sourceTower && sourceTower.type === 'hero' && heroAccessoryBonuses.killSB) {
        var killBonus = Math.max(1, Math.round(2 * heroAccessoryBonuses.killSB / 0.1));
        sb += killBonus;
        sbEarned += killBonus;
      }

      // Boss material drop
      if (enemy.special === 'boss' && typeof window.FarmResources !== 'undefined') {
        var dropMats = ['stone', 'iron', 'wood', 'hardwood', 'gold'];
        var dropMat = dropMats[Math.floor(Math.random() * dropMats.length)];
        var dropQty = Math.max(1, Math.floor(wave / 10));
        window.FarmResources.add('raw', dropMat, dropQty);
        spawnParticle(pos.x, pos.y - 20, '+' + dropQty + ' ' + formatResourceName(dropMat), '#ffd700');
      }

      // Splitter: spawn 2 mini versions on death
      if (enemy.special === 'split' && !enemy.isMinion) {
        var miniHp = Math.round(enemy.maxHp * 0.35);
        var miniSpeed = enemy.speed * 0.8;
        var miniRadius = Math.round(enemy.radius * 0.65);
        spawnParticle(pos.x, pos.y, 'SPLIT!', '#c6f');
        for (var mi = 0; mi < 2; mi++) {
          enemies.push({
            type: 'splitter',
            hp: miniHp,
            maxHp: miniHp,
            speed: miniSpeed,
            radius: miniRadius,
            color: '#d8f',
            shape: 'hexagon',
            special: 'split',
            dist: enemy.dist + (mi === 0 ? -5 : 5),
            alive: true,
            dot: null,
            slow: null,
            caltropsHit: {},
            healTimer: 0,
            isMinion: true
          });
        }
      }

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

  function drawEnemyShape(pos, e) {
    var r = e.radius;
    // Ghost: draw at 50% alpha
    if (e.special === 'dodge') ctx.globalAlpha = 0.5;

    ctx.fillStyle = e.color;
    ctx.strokeStyle = colorFg;
    ctx.lineWidth = 1;

    if (e.shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - r);
      ctx.lineTo(pos.x - r, pos.y + r * 0.7);
      ctx.lineTo(pos.x + r, pos.y + r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.shape === 'square') {
      ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
      ctx.strokeRect(pos.x - r, pos.y - r, r * 2, r * 2);
    } else if (e.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - r);
      ctx.lineTo(pos.x + r, pos.y);
      ctx.lineTo(pos.x, pos.y + r);
      ctx.lineTo(pos.x - r, pos.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // White cross inside
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      var cr = r * 0.4;
      ctx.beginPath();
      ctx.moveTo(pos.x - cr, pos.y);
      ctx.lineTo(pos.x + cr, pos.y);
      ctx.moveTo(pos.x, pos.y - cr);
      ctx.lineTo(pos.x, pos.y + cr);
      ctx.stroke();
    } else if (e.shape === 'hexagon') {
      ctx.beginPath();
      for (var hi = 0; hi < 6; hi++) {
        var angle = Math.PI / 3 * hi - Math.PI / 6;
        var hx = pos.x + r * Math.cos(angle);
        var hy = pos.y + r * Math.sin(angle);
        if (hi === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.shape === 'pentagon') {
      ctx.beginPath();
      for (var pi = 0; pi < 5; pi++) {
        var angle = Math.PI * 2 / 5 * pi - Math.PI / 2;
        var px = pos.x + r * Math.cos(angle);
        var py = pos.y + r * Math.sin(angle);
        if (pi === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.shape === 'boss') {
      // Large square body
      ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
      ctx.strokeRect(pos.x - r, pos.y - r, r * 2, r * 2);
      // Gold star marker
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold ' + Math.round(r) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2605', pos.x, pos.y);
    } else {
      // circle (default) — slime, goblin, ghost
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (e.special === 'dodge') ctx.globalAlpha = 1;
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var pos = getPathPos(e.dist);

      drawEnemyShape(pos, e);

      // DOT indicator (orange ring)
      if (e.dot && e.dot.remaining > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, e.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#f84';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Frost slow indicator (blue ring)
      if (e.slow && e.slow.remaining > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, e.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#4cf';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Healer aura — pulsing green dashed ring
      if (e.special === 'healer') {
        var healPulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.004);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2 * TILE_SIZE, 0, Math.PI * 2);
        ctx.strokeStyle = '#4f8';
        ctx.globalAlpha = healPulse;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Shield bearer aura — solid cyan ring
      if (e.special === 'shield') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2 * TILE_SIZE, 0, Math.PI * 2);
        ctx.strokeStyle = '#6cf';
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Shield reduction indicator (cyan tint on shielded enemies)
      if (e.shielded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, e.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#6cf';
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
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
        bonus += other.rallyTimer > 0 ? 0.2 : 0.1;
      }
    }
    return bonus;
  }

  // ── Towers ────────────────────────────────────────
  function getEffectiveCost(def) {
    return Math.max(1, Math.round(def.cost * mods.costMult));
  }

  function getEffectiveDmg(tower) {
    var def = TOWER_DEFS[tower.type];
    var lvlMult = tower.level >= 4 ? 2.3 : (tower.level === 3 ? 1.8 : (tower.level === 2 ? 1.4 : 1));
    var dmg = def.dmg * mods.dmgMult * lvlMult;
    // Spotter synergy: +20% sniper damage per stack
    if (tower.type === 'sniper') {
      var spotter = hasSynergy(tower, 'spotter');
      if (spotter) dmg *= 1 + 0.2 * getSynergyMultiplier(spotter.stacks);
    }
    return Math.round(dmg);
  }

  function getEffectiveRangePx(tower) {
    var def = TOWER_DEFS[tower.type];
    var wtBonus = getWatchtowerBonus(tower);
    var lvlMult = tower.level >= 4 ? 1.3 : (tower.level === 3 ? 1.2 : (tower.level === 2 ? 1.1 : 1));
    return def.range * TILE_SIZE * mods.rangeMult * lvlMult * (1 + wtBonus);
  }

  function getMaxTowerLevel() {
    return mods.towerLv4 ? 4 : 3;
  }

  function getUpgradeCostForTower(tower) {
    var def = TOWER_DEFS[tower.type];
    var baseCost = getEffectiveCost(def);
    if (tower.level === 1) return Math.round(baseCost * 1.5);
    if (tower.level === 2) return Math.round(baseCost * 2.5);
    if (tower.level === 3 && mods.towerLv4) return Math.round(baseCost * 4);
    return null; // max level
  }

  function getTotalInvestment(tower) {
    var def = TOWER_DEFS[tower.type];
    var baseCost = getEffectiveCost(def);
    var total = baseCost;
    if (tower.level >= 2) total += Math.round(baseCost * 1.5);
    if (tower.level >= 3) total += Math.round(baseCost * 2.5);
    if (tower.level >= 4) total += Math.round(baseCost * 4);
    return total;
  }

  function upgradeTower(tower) {
    if (tower.type === 'hero') return false;
    if (tower.level >= getMaxTowerLevel()) return false;
    var cost = getUpgradeCostForTower(tower);
    if (cost === null || sb < cost) return false;
    sb -= cost;
    tower.level++;
    var tc = tileCenter(tower.col, tower.row);
    spawnParticle(tc.x, tc.y, 'Lv' + tower.level + '!', '#ffd700');
    updateHUD();
    renderInspectPanel();
    return true;
  }

  function sellTower(tower) {
    if (tower.type === 'hero') return;
    var refund = Math.floor(getTotalInvestment(tower) * 0.5);
    var tc = tileCenter(tower.col, tower.row);
    spawnParticle(tc.x, tc.y, '+' + refund + ' SB', '#ffd700');
    sb += refund;
    for (var i = 0; i < towers.length; i++) {
      if (towers[i] === tower) {
        towers.splice(i, 1);
        break;
      }
    }
    rebuildSynergyCache();
    inspectedTower = null;
    hideInspectPanel();
    updateHUD();
    updateTowerBtnStates();
  }

  function activateAbility(tower) {
    if (!mods.specialAbilities) return;
    if (tower.abilityCooldown > 0) return;
    var def = TOWER_DEFS[tower.type];
    var tc = tileCenter(tower.col, tower.row);
    var rangePx = getEffectiveRangePx(tower);

    switch (tower.type) {
      case 'arrow': // Volley — fire 5 arrows at random enemies in range
        var targets = [];
        for (var i = 0; i < enemies.length; i++) {
          if (!enemies[i].alive) continue;
          var ep = getPathPos(enemies[i].dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) targets.push(enemies[i]);
        }
        for (var v = 0; v < 5 && targets.length > 0; v++) {
          var pick = targets[Math.floor(Math.random() * targets.length)];
          fireProjectile(tower, pick);
        }
        spawnParticle(tc.x, tc.y, 'VOLLEY!', def.color || colorAccent);
        break;

      case 'cannon': // Mega Blast — next shot 3x dmg, 2x splash
        tower.megaBlast = true;
        spawnParticle(tc.x, tc.y, 'MEGA BLAST!', '#a86');
        break;

      case 'frost': // Blizzard — freeze all enemies in range 3s
        for (var i = 0; i < enemies.length; i++) {
          if (!enemies[i].alive) continue;
          var ep = getPathPos(enemies[i].dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            enemies[i].slow = { remaining: 3, factor: 0 };
          }
        }
        spawnParticle(tc.x, tc.y, 'BLIZZARD!', '#4cf');
        break;

      case 'watchtower': // Rally — double range buff for 10s
        tower.rallyTimer = 10;
        spawnParticle(tc.x, tc.y, 'RALLY!', '#aaa');
        break;

      case 'fire': // Inferno — DOT to all enemies on map
        for (var i = 0; i < enemies.length; i++) {
          if (!enemies[i].alive) continue;
          enemies[i].dot = { dmg: 5, remaining: 4, tickTimer: 0 };
        }
        spawnParticle(tc.x, tc.y, 'INFERNO!', '#f84');
        break;

      case 'sniper': // Headshot — 200 dmg to highest-HP enemy in range
        var best = null;
        for (var i = 0; i < enemies.length; i++) {
          if (!enemies[i].alive) continue;
          var ep = getPathPos(enemies[i].dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            if (!best || enemies[i].hp > best.hp) best = enemies[i];
          }
        }
        if (best) {
          damageEnemy(best, 200, tower);
          spawnParticle(tc.x, tc.y, 'HEADSHOT!', '#8cf');
        } else {
          spawnParticle(tc.x, tc.y, 'No target!', '#e55');
          return; // Don't consume cooldown
        }
        break;

      case 'goldmine': // Payday — +15 SB instantly
        sb += 15;
        sbEarned += 15;
        updateHUD();
        spawnParticle(tc.x, tc.y, '+15 SB!', '#ffd700');
        break;

      case 'lightning': // Storm — hit every enemy on screen
        var stormDmg = getEffectiveDmg(tower);
        for (var i = 0; i < enemies.length; i++) {
          if (!enemies[i].alive) continue;
          damageEnemy(enemies[i], stormDmg, tower);
          var ep = getPathPos(enemies[i].dist);
          lightningEffects.push({ points: [{ x: tc.x, y: tc.y }, { x: ep.x, y: ep.y }], life: 0.3 });
        }
        spawnParticle(tc.x, tc.y, 'STORM!', '#ff0');
        break;
    }

    tower.abilityCooldown = def.ability.cooldown;
    renderInspectPanel();
  }

  function getTowerAt(col, row) {
    if (hero && hero.col === col && hero.row === row) return hero;
    for (var i = 0; i < towers.length; i++) {
      if (towers[i].col === col && towers[i].row === row) return towers[i];
    }
    return null;
  }

  // ── Hero functions ───────────────────────────────
  function getHeroPetInfo() {
    heroPetId = null;
    heroPetType = null;
    heroPetLevel = 1;
    if (typeof window.PetSystem !== 'undefined' && window.PetSystem.getState) {
      var state = window.PetSystem.getState();
      if (state && state.petId) {
        heroPetId = state.petId;
        heroPetType = (window.PetSystem.getCreatureType) ? window.PetSystem.getCreatureType(heroPetId) : null;
        heroPetLevel = state.level || 1;
      }
    }
    // Fallback + skin: read localStorage (PetSystem loads async, may not be ready)
    var petParsed = null;
    try {
      var petRaw = localStorage.getItem('arebooksgood-pet');
      if (petRaw) petParsed = JSON.parse(petRaw);
    } catch (e) {}
    if (!heroPetId && petParsed) {
      if (petParsed.activePet && petParsed.pets && petParsed.pets[petParsed.activePet]) {
        heroPetId = petParsed.activePet;
        heroPetLevel = petParsed.pets[petParsed.activePet].level || 1;
      }
    }
    if (!heroPetType && heroPetId) {
      // Try catalog first (covers all creatures), then legacy fallback
      var typeCat = heroPetCatalog || window.PetCatalog || null;
      if (typeCat && typeCat.creatures) {
        var lookupId = heroPetId;
        if (typeCat.legacyMap && typeCat.legacyMap[heroPetId]) lookupId = typeCat.legacyMap[heroPetId];
        if (typeCat.creatures[lookupId]) heroPetType = typeCat.creatures[lookupId].type;
      }
      if (!heroPetType) {
        var legacyTypes = { cat: 'nature', dragon: 'fire', robot: 'tech' };
        heroPetType = legacyTypes[heroPetId] || 'nature';
      }
    }
    // Read skin (getState doesn't include it)
    if (heroPetId && petParsed && petParsed.pets && petParsed.pets[heroPetId]) {
      heroPetSkin = petParsed.pets[heroPetId].skin || 'default';
    }
    if (heroPetId && heroSpriteData) loadHeroSheet(heroPetId);
  }

  function getHeroAccessoryBonuses() {
    heroAccessoryBonuses = {};
    try {
      var raw = localStorage.getItem('arebooksgood-pet');
      if (!raw) return;
      var ps = JSON.parse(raw);
      if (!ps || !ps.accessories || !ps.accessories.equipped) return;
      var equipped = ps.accessories.equipped;
      var slots = ['head', 'body'];
      for (var si = 0; si < slots.length; si++) {
        var id = equipped[slots[si]];
        if (id && ACCESSORY_HERO_BONUSES[id]) {
          var bonus = ACCESSORY_HERO_BONUSES[id];
          heroAccessoryBonuses[bonus.stat] = bonus.value;
        }
      }
    } catch (e) {}
  }

  var heroGearStats = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };

  function loadHeroGearStats() {
    heroGearStats = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    if (!heroPetId) return;
    try {
      var eqRaw = localStorage.getItem('arebooksgood-dungeon-equip');
      var invRaw = localStorage.getItem('arebooksgood-dungeon-inventory');
      if (!eqRaw || !invRaw) return;
      var equipMap = JSON.parse(eqRaw);
      var inventory = JSON.parse(invRaw);
      var eq = equipMap[heroPetId];
      if (!eq) return;
      var slots = ['weapon', 'armor', 'accessory'];
      var secPerLvl = { hp: 3, cri: 1 };
      for (var s = 0; s < slots.length; s++) {
        var gearId = eq[slots[s]];
        if (gearId == null) continue;
        var gear = null;
        for (var i = 0; i < inventory.length; i++) {
          if (inventory[i].id === gearId) { gear = inventory[i]; break; }
        }
        if (!gear) continue;
        if (gear.mainStat) heroGearStats[gear.mainStat] += (gear.mainValue || 0) + (gear.upgradeLevel || 0);
        if (gear.secondaryStat) {
          var secBonus = (secPerLvl[gear.secondaryStat] || 0) * (gear.upgradeLevel || 0);
          heroGearStats[gear.secondaryStat] += (gear.secondaryValue || 0) + secBonus;
        }
        if (gear.subStats) {
          for (var j = 0; j < gear.subStats.length; j++) {
            heroGearStats[gear.subStats[j].stat] += gear.subStats[j].value;
          }
        }
      }
    } catch (e) {}
  }

  function placeHero(col, row) {
    if (!heroPetType || !HERO_DEFS[heroPetType]) return false;
    if (!isBuildable(col, row)) return false;
    var def = HERO_DEFS[heroPetType];
    hero = {
      col: col, row: row, type: 'hero', petId: heroPetId,
      cooldown: 0, qCooldown: 0, wCooldown: 0,
      targetMode: 'closest', kills: 0, attackFlash: 0,
      critHitsRemaining: 0, rageTimer: 0, overclockTimer: 0
    };
    var tc = tileCenter(col, row);
    spawnParticle(tc.x, tc.y, 'Hero placed!', def.color);
    heroPlacing = false;
    return true;
  }

  function moveHero(col, row) {
    if (!hero) return false;
    if (hero.col === col && hero.row === row) return false;
    if (!isBuildable(col, row)) return false;
    hero.col = col;
    hero.row = row;
    var tc = tileCenter(col, row);
    spawnParticle(tc.x, tc.y, 'Hero moved!', HERO_DEFS[heroPetType] ? HERO_DEFS[heroPetType].color : colorAccent);
    heroMoving = false;
    return true;
  }

  function getHeroEvolutionScale() {
    if (heroPetLevel >= 3) return { dmg: 1.5, cd: 0.75 };
    if (heroPetLevel >= 2) return { dmg: 1.25, cd: 0.85 };
    return { dmg: 1, cd: 1 };
  }

  function getHeroDmg() {
    if (!hero || !heroPetType) return 0;
    var def = HERO_DEFS[heroPetType];
    var evo = getHeroEvolutionScale();
    var dmg = (def.dmg + heroGearStats.atk * GEAR_ATK_SCALE) * evo.dmg;
    if (heroAccessoryBonuses.damage) dmg *= 1 + heroAccessoryBonuses.damage;
    if (hero.critHitsRemaining > 0) dmg *= 2;
    return Math.round(dmg);
  }

  function getHeroRangePx() {
    if (!hero || !heroPetType) return 0;
    var def = HERO_DEFS[heroPetType];
    var range = def.range * TILE_SIZE;
    if (heroAccessoryBonuses.range) range *= 1 + heroAccessoryBonuses.range;
    return range;
  }

  function getHeroAbilityCooldown(baseCd) {
    var evo = getHeroEvolutionScale();
    var cd = baseCd * evo.cd;
    if (heroGearStats.def > 0) cd *= 1 - Math.min(heroGearStats.def * GEAR_DEF_CD_SCALE, 0.15);
    if (heroAccessoryBonuses.cdReduce) cd *= 1 - heroAccessoryBonuses.cdReduce;
    return cd;
  }

  function findHeroTarget() {
    if (!hero) return null;
    var tc = tileCenter(hero.col, hero.row);
    var rangePx = getHeroRangePx();
    var mode = hero.targetMode || 'closest';
    var best = null;
    var bestVal = null;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var pos = getPathPos(e.dist);
      var dx = pos.x - tc.x;
      var dy = pos.y - tc.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > rangePx) continue;

      var val;
      if (mode === 'closest') val = d;
      else if (mode === 'first') val = e.dist;
      else if (mode === 'last') val = e.dist;
      else if (mode === 'weakest') val = e.hp;
      else val = e.hp;

      var isBetter = bestVal === null ||
        (mode === 'closest' && val < bestVal) ||
        (mode === 'first' && val > bestVal) ||
        (mode === 'last' && val < bestVal) ||
        (mode === 'weakest' && val < bestVal) ||
        (mode === 'strongest' && val > bestVal);

      if (isBetter) { bestVal = val; best = e; }
    }
    return best;
  }

  function updateHero(dt) {
    if (!hero || !heroPetType) return;
    var def = HERO_DEFS[heroPetType];

    // Tick ability cooldowns
    if (hero.qCooldown > 0) hero.qCooldown = Math.max(0, hero.qCooldown - dt);
    if (hero.wCooldown > 0) hero.wCooldown = Math.max(0, hero.wCooldown - dt);
    if (hero.attackFlash > 0) hero.attackFlash -= dt;

    // Tick buff timers
    if (hero.rageTimer > 0) hero.rageTimer = Math.max(0, hero.rageTimer - dt);
    if (hero.overclockTimer > 0) {
      hero.overclockTimer = Math.max(0, hero.overclockTimer - dt);
    }

    // Robot Overclock: buff towers in hero range
    if (heroPetType === 'tech' && hero.overclockTimer > 0) {
      // Applied in updateTowers via overclockActive check
    }

    // Sprite animation
    heroAnimTimer += dt;
    if (heroAnimTimer >= 0.5) {
      heroAnimTimer -= 0.5;
      heroAnimFrame = (heroAnimFrame + 1) % 2;
    }

    // Auto-attack
    if (hero.cooldown > 0) {
      var cdRate = 1;
      if (heroGearStats.spd > 0) cdRate *= 1 + heroGearStats.spd * GEAR_SPD_SCALE;
      if (heroAccessoryBonuses.atkSpeed) cdRate *= 1 + heroAccessoryBonuses.atkSpeed;
      if (atkSpeedActive) cdRate *= 1.3;
      if (hero.rageTimer > 0) cdRate *= 2;
      hero.cooldown -= dt * cdRate;
      return;
    }

    var target = findHeroTarget();
    if (target) {
      var tc = tileCenter(hero.col, hero.row);
      var dmg = getHeroDmg();
      var isGearCrit = false;
      // Gear-based crit (only when Nine Lives is NOT active)
      if (hero.critHitsRemaining <= 0 && heroGearStats.cri > 0 && Math.random() < heroGearStats.cri * GEAR_CRI_SCALE) {
        dmg = Math.round(dmg * GEAR_CRI_MULT);
        isGearCrit = true;
      }
      projectiles.push({
        x: tc.x, y: tc.y, target: target, dmg: dmg,
        speed: PROJECTILE_SPEED * TILE_SIZE,
        towerType: 'hero', megaBlast: false, sourceTower: hero,
        heroPetId: heroPetId, heroPetType: heroPetType,
        gearCrit: isGearCrit
      });
      hero.cooldown = def.speed;
      hero.attackFlash = 0.15;

      // Crit tracking
      if (hero.critHitsRemaining > 0) hero.critHitsRemaining--;
    }
  }

  function activateHeroQ() {
    if (!hero || !heroPetType) return;
    if (hero.qCooldown > 0) return;
    var def = HERO_DEFS[heroPetType];
    var tc = tileCenter(hero.col, hero.row);
    var rangePx = getHeroRangePx();
    var evo = getHeroEvolutionScale();

    switch (heroPetType) {
      case 'nature': // Pounce — 3x damage to closest enemy
        var target = findHeroTarget();
        if (!target) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        var dmg = Math.round(getHeroDmg() * 3);
        if (heroAccessoryBonuses.abilityDmg) dmg = Math.round(dmg * (1 + heroAccessoryBonuses.abilityDmg));
        damageEnemy(target, dmg, hero);
        if (heroPetLevel >= 3 && target.alive) {
          target.slow = { remaining: 0.5, factor: 0 }; // stun = speed 0
        }
        spawnParticle(tc.x, tc.y - 10, 'POUNCE!', '#f9c');
        break;

      case 'fire': // Fire Breath — damage + DOT to all in range
        var hitCount = 0;
        var breathDmg = Math.round(getHeroDmg() * 1.5);
        if (heroAccessoryBonuses.abilityDmg) breathDmg = Math.round(breathDmg * (1 + heroAccessoryBonuses.abilityDmg));
        var dotDur = heroPetLevel >= 3 ? 5 : 3;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!e.alive) continue;
          var ep = getPathPos(e.dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            damageEnemy(e, breathDmg, hero);
            if (e.alive) e.dot = { dmg: 3, remaining: dotDur, tickTimer: 0 };
            hitCount++;
          }
        }
        if (hitCount === 0) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        spawnParticle(tc.x, tc.y - 10, 'FIRE BREATH!', '#f84');
        break;

      case 'tech': // EMP Blast — stun all in range
        var hitCount = 0;
        var stunDur = heroPetLevel >= 3 ? 3 : 2;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!e.alive) continue;
          var ep = getPathPos(e.dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            e.slow = { remaining: stunDur, factor: 0 };
            hitCount++;
          }
        }
        if (hitCount === 0) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        // Splash ring effect
        splashEffects.push({ x: tc.x, y: tc.y, radius: 0, maxRadius: rangePx, life: 0.4, color: '#4cf' });
        spawnParticle(tc.x, tc.y - 10, 'EMP BLAST!', '#4cf');
        break;

      case 'aqua': // Tidal Wave — knockback + slow all in range
        var hitCount = 0;
        var waveDmg = Math.round(getHeroDmg() * 1.2);
        if (heroAccessoryBonuses.abilityDmg) waveDmg = Math.round(waveDmg * (1 + heroAccessoryBonuses.abilityDmg));
        var slowDur = heroPetLevel >= 3 ? 4 : 2.5;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!e.alive) continue;
          var ep = getPathPos(e.dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            damageEnemy(e, waveDmg, hero);
            if (e.alive) {
              e.slow = { remaining: slowDur, factor: 0.4 };
              e.dist = Math.max(0, e.dist - 15);
            }
            hitCount++;
          }
        }
        if (hitCount === 0) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        splashEffects.push({ x: tc.x, y: tc.y, radius: 0, maxRadius: rangePx, life: 0.4, color: '#4af' });
        spawnParticle(tc.x, tc.y - 10, 'TIDAL WAVE!', '#4af');
        break;

      case 'shadow': // Backstab — 4x damage to weakest enemy
        var weakest = null;
        var weakHp = Infinity;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!e.alive) continue;
          var ep = getPathPos(e.dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx && e.hp < weakHp) {
            weakest = e;
            weakHp = e.hp;
          }
        }
        if (!weakest) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        var stabDmg = Math.round(getHeroDmg() * 4);
        if (heroAccessoryBonuses.abilityDmg) stabDmg = Math.round(stabDmg * (1 + heroAccessoryBonuses.abilityDmg));
        damageEnemy(weakest, stabDmg, hero);
        spawnParticle(tc.x, tc.y - 10, 'BACKSTAB!', '#a6f');
        break;

      case 'mystic': // Arcane Bolt — chain lightning hits 3 enemies
        var chainTargets = [];
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (!e.alive) continue;
          var ep = getPathPos(e.dist);
          var dx = ep.x - tc.x, dy = ep.y - tc.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) chainTargets.push(e);
        }
        if (chainTargets.length === 0) { spawnParticle(tc.x, tc.y, 'No targets!', '#e55'); return; }
        var chainCount = heroPetLevel >= 3 ? 5 : 3;
        var boltDmg = Math.round(getHeroDmg() * 2);
        if (heroAccessoryBonuses.abilityDmg) boltDmg = Math.round(boltDmg * (1 + heroAccessoryBonuses.abilityDmg));
        for (var i = 0; i < Math.min(chainCount, chainTargets.length); i++) {
          damageEnemy(chainTargets[i], boltDmg, hero);
        }
        spawnParticle(tc.x, tc.y - 10, 'ARCANE BOLT!', '#f6a');
        break;
    }

    hero.qCooldown = getHeroAbilityCooldown(def.q.cooldown);
    renderHeroAbilities();
  }

  function activateHeroW() {
    if (!hero || !heroPetType) return;
    if (hero.wCooldown > 0) return;
    var def = HERO_DEFS[heroPetType];
    var tc = tileCenter(hero.col, hero.row);

    switch (heroPetType) {
      case 'nature': // Nine Lives — next N attacks crit
        hero.critHitsRemaining = heroPetLevel >= 3 ? 8 : 5;
        spawnParticle(tc.x, tc.y - 10, 'NINE LIVES!', '#ffd700');
        break;

      case 'fire': // Dragon Rage — 2x speed + DOT on hits
        hero.rageTimer = heroPetLevel >= 3 ? 10 : 8;
        spawnParticle(tc.x, tc.y - 10, 'DRAGON RAGE!', '#f84');
        break;

      case 'tech': // Overclock — buff towers in range
        hero.overclockTimer = heroPetLevel >= 3 ? 12 : 8;
        spawnParticle(tc.x, tc.y - 10, 'OVERCLOCK!', '#4cf');
        break;

      case 'aqua': // Whirlpool — slow zone at hero position
        hero.whirlpoolTimer = heroPetLevel >= 3 ? 8 : 6;
        spawnParticle(tc.x, tc.y - 10, 'WHIRLPOOL!', '#4af');
        break;

      case 'shadow': // Cloak — invisible, next hit crits 3x
        hero.cloakTimer = heroPetLevel >= 3 ? 7 : 5;
        hero.cloakCrit = true;
        spawnParticle(tc.x, tc.y - 10, 'CLOAK!', '#a6f');
        break;

      case 'mystic': // Enchant — buff towers in range
        hero.enchantTimer = heroPetLevel >= 3 ? 12 : 8;
        spawnParticle(tc.x, tc.y - 10, 'ENCHANT!', '#f6a');
        break;
    }

    hero.wCooldown = getHeroAbilityCooldown(def.w.cooldown);
    renderHeroAbilities();
  }

  function placeTower(col, row, type) {
    var def = TOWER_DEFS[type];
    var cost = getEffectiveCost(def);
    if (sb < cost) return false;
    if (!isBuildable(col, row)) return false;

    sb -= cost;
    towersBuilt++;
    towers.push({
      col: col,
      row: row,
      type: type,
      level: 1,
      cooldown: 0,
      abilityCooldown: 0,
      megaBlast: false,
      rallyTimer: 0,
      targetMode: 'closest',
      kills: 0
    });
    rebuildSynergyCache();
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

      // Tick ability cooldowns
      if (t.abilityCooldown > 0) t.abilityCooldown = Math.max(0, t.abilityCooldown - dt);
      if (t.rallyTimer > 0) t.rallyTimer = Math.max(0, t.rallyTimer - dt);

      // Auto-cast abilities for Lv3+ towers
      if (mods.specialAbilities && t.level >= 3 && t.abilityCooldown <= 0 && enemies.length > 0) {
        activateAbility(t);
      }

      // Skip non-attacking towers
      if (t.type === 'watchtower' || t.type === 'goldmine') continue;

      if (t.cooldown > 0) {
        var cdRate = atkSpeedActive ? 1.3 : 1;
        // Crossfire synergy: +15% attack speed per stack
        var crossfire = hasSynergy(t, 'crossfire');
        if (crossfire) cdRate *= 1 + 0.15 * getSynergyMultiplier(crossfire.stacks);
        // Robot Overclock: +30% attack speed to towers in hero range
        if (hero && heroPetType === 'tech' && hero.overclockTimer > 0) {
          var htc = tileCenter(hero.col, hero.row);
          var ttc = tileCenter(t.col, t.row);
          var hdx = ttc.x - htc.x, hdy = ttc.y - htc.y;
          if (Math.sqrt(hdx * hdx + hdy * hdy) <= getHeroRangePx()) cdRate *= 1.3;
        }
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

  var TARGET_MODES = ['closest', 'first', 'last', 'weakest', 'strongest'];
  var TARGET_MODE_LABELS = { closest: 'Closest', first: 'First', last: 'Last', weakest: 'Weakest', strongest: 'Strongest' };

  function findTarget(tower) {
    var def = TOWER_DEFS[tower.type];
    if (def.range === 0) return null;
    var tc = tileCenter(tower.col, tower.row);
    var rangePx = getEffectiveRangePx(tower);
    var mode = tower.targetMode || 'closest';
    var best = null;
    var bestVal = null;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var pos = getPathPos(e.dist);
      var dx = pos.x - tc.x;
      var dy = pos.y - tc.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > rangePx) continue;

      var val;
      if (mode === 'closest') {
        val = d;
      } else if (mode === 'first') {
        val = e.dist;
      } else if (mode === 'last') {
        val = e.dist;
      } else if (mode === 'weakest') {
        val = e.hp;
      } else { // strongest
        val = e.hp;
      }

      var isBetter = bestVal === null ||
        (mode === 'closest' && val < bestVal) ||
        (mode === 'first' && val > bestVal) ||
        (mode === 'last' && val < bestVal) ||
        (mode === 'weakest' && val < bestVal) ||
        (mode === 'strongest' && val > bestVal);

      if (isBetter) {
        bestVal = val;
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
      var isInspected = inspectedTower === t;

      var half = TILE_SIZE * 0.35;
      var towerColor = def.color || colorAccent;
      ctx.fillStyle = towerColor;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(tc.x - half, tc.y - half, half * 2, half * 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isInspected ? '#fff' : towerColor;
      ctx.lineWidth = isInspected ? 2.5 : 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);

      // Tower symbol with level
      var label = def.symbol;
      if (t.level > 1) label = def.symbol + t.level;
      ctx.fillStyle = colorFg;
      ctx.font = 'bold ' + (t.level > 1 ? '12' : '14') + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tc.x, tc.y);

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

      // Range circle: permanent for inspected tower, on hover otherwise
      var showRange = isInspected || (hoverTile && hoverTile.col === t.col && hoverTile.row === t.row);
      if (showRange && def.range > 0) {
        var rangePx = getEffectiveRangePx(t);
        ctx.beginPath();
        ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
        ctx.strokeStyle = towerColor;
        ctx.globalAlpha = isInspected ? 0.35 : 0.2;
        ctx.lineWidth = isInspected ? 1.5 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Synergy gold pulsing dot
      var tSynergies = getTowerSynergies(t);
      if (tSynergies.length > 0) {
        var pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.beginPath();
        ctx.arc(tc.x + half - 2, tc.y - half + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Synergy lines when inspected
      if (isInspected && tSynergies.length > 0) {
        for (var si = 0; si < tSynergies.length; si++) {
          var syn = tSynergies[si];
          var synDef = null;
          for (var sdi = 0; sdi < SYNERGY_DEFS.length; sdi++) {
            if (SYNERGY_DEFS[sdi].id === syn.id) { synDef = SYNERGY_DEFS[sdi]; break; }
          }
          if (!synDef) continue;
          ctx.save();
          ctx.strokeStyle = synDef.color;
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          for (var pi = 0; pi < syn.partners.length; pi++) {
            var partner = syn.partners[pi];
            var pc = tileCenter(partner.col, partner.row);
            ctx.beginPath();
            ctx.moveTo(tc.x, tc.y);
            ctx.lineTo(pc.x, pc.y);
            ctx.stroke();
            // Dot at midpoint
            var mx = (tc.x + pc.x) / 2;
            var my = (tc.y + pc.y) / 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(mx, my, 3, 0, Math.PI * 2);
            ctx.fillStyle = synDef.color;
            ctx.fill();
            ctx.setLineDash([4, 4]);
          }
          ctx.restore();
        }
      }
    }
  }

  // ── Lightning chain ───────────────────────────────
  function fireLightningChain(tower, firstTarget, maxHits) {
    var tc = tileCenter(tower.col, tower.row);
    var dmg = getEffectiveDmg(tower);
    // Superconductor synergy: +30% damage to slowed enemies
    var supercon = hasSynergy(tower, 'superconductor');
    var hit = [firstTarget];
    var hitSet = {};
    hitSet[enemies.indexOf(firstTarget)] = true;

    var firstDmg = dmg;
    if (supercon && firstTarget.slow && firstTarget.slow.remaining > 0) {
      firstDmg = Math.round(dmg * (1 + 0.3 * getSynergyMultiplier(supercon.stacks)));
    }
    damageEnemy(firstTarget, firstDmg, tower);

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
      var chainDmg = dmg;
      if (supercon && best.slow && best.slow.remaining > 0) {
        chainDmg = Math.round(dmg * (1 + 0.3 * getSynergyMultiplier(supercon.stacks)));
      }
      damageEnemy(best, chainDmg, tower);
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
    var dmg = getEffectiveDmg(tower);
    var isMega = tower.megaBlast;
    if (isMega) {
      dmg *= 3;
      tower.megaBlast = false;
    }
    projectiles.push({
      x: tc.x,
      y: tc.y,
      target: target,
      dmg: dmg,
      speed: PROJECTILE_SPEED * TILE_SIZE,
      towerType: tower.type,
      megaBlast: isMega,
      sourceTower: tower
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
        damageEnemy(p.target, p.dmg, p.sourceTower);
        // Fire tower DOT
        if (p.towerType === 'fire' && p.target.alive) {
          var dotDur = 3;
          // Firestorm synergy: +50% DOT duration per stack
          if (p.sourceTower) {
            var firestorm = hasSynergy(p.sourceTower, 'firestorm');
            if (firestorm) dotDur *= 1 + 0.5 * getSynergyMultiplier(firestorm.stacks);
          }
          p.target.dot = { dmg: 3, remaining: dotDur, tickTimer: 0 };
        }
        // Frost tower slow
        if (p.towerType === 'frost' && p.target.alive) {
          p.target.slow = { remaining: 2, factor: 0.5 };
        }
        // Ice Arrows synergy: 25% chance to apply mild slow on arrow hit
        if (p.towerType === 'arrow' && p.target.alive && p.sourceTower) {
          var iceArrows = hasSynergy(p.sourceTower, 'icearrows');
          if (iceArrows && Math.random() < 0.25) {
            p.target.slow = { remaining: 1.5, factor: 0.7 };
          }
        }
        // Cannon tower splash
        if (p.towerType === 'cannon') {
          var splashRadius = p.megaBlast ? 2 * TILE_SIZE : TILE_SIZE;
          var splashDmg = Math.round(p.dmg * 0.5);
          // Scorched Earth synergy: cannon splash applies fire DOT
          var scorched = p.sourceTower ? hasSynergy(p.sourceTower, 'scorched') : null;
          for (var si = 0; si < enemies.length; si++) {
            var se = enemies[si];
            if (!se.alive || se === p.target) continue;
            var sp = getPathPos(se.dist);
            var sdx = sp.x - p.x;
            var sdy = sp.y - p.y;
            if (Math.sqrt(sdx * sdx + sdy * sdy) <= splashRadius) {
              damageEnemy(se, splashDmg, p.sourceTower);
              if (scorched && se.alive) {
                se.dot = { dmg: 3, remaining: 2, tickTimer: 0 };
              }
            }
          }
          splashEffects.push({ x: p.x, y: p.y, radius: 0, maxRadius: splashRadius, life: 0.3 });
        }
        // Hero projectile effects
        if (p.towerType === 'hero' && p.target.alive) {
          // Dragon Rage: attacks apply fire DOT
          if (p.heroPetType === 'fire' && hero && hero.rageTimer > 0) {
            p.target.dot = { dmg: 3, remaining: 3, tickTimer: 0 };
          }
          // Farmer Hat: attacks slow enemies
          if (heroAccessoryBonuses.slow) {
            p.target.slow = { remaining: heroAccessoryBonuses.slow, factor: 0.5 };
          }
        }
        // Gear crit particle (outside alive check — show even on killing blow)
        if (p.towerType === 'hero' && p.gearCrit) {
          var hitPos = getPathPos(p.target.dist);
          spawnParticle(hitPos.x, hitPos.y - 18, 'CRIT!', '#ffd700');
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
      var r = 3;
      if (p.towerType === 'hero') { col = HERO_ACCENT_COLORS[p.heroPetType] || colorAccent; r = 3; }
      else if (p.towerType === 'fire') col = '#f84';
      else if (p.towerType === 'sniper') { col = '#8cf'; r = 4; }
      else if (p.towerType === 'frost') col = '#4cf';
      else if (p.towerType === 'cannon') { col = '#a86'; r = 5; }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Splash effects (cannon) ──────────────────────
  function updateSplash(dt) {
    for (var i = splashEffects.length - 1; i >= 0; i--) {
      var s = splashEffects[i];
      if (!s.maxLife) s.maxLife = s.life;
      s.life -= dt;
      s.radius = s.maxRadius * (1 - s.life / s.maxLife);
      if (s.life <= 0) splashEffects.splice(i, 1);
    }
  }

  function drawSplash() {
    for (var i = 0; i < splashEffects.length; i++) {
      var s = splashEffects[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life / 0.3)) * 0.4;
      ctx.strokeStyle = s.color || '#a86';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
  function getAvailableEnemyTypes(w) {
    var pool = ['slime'];
    if (w >= 6) pool.push('skeleton');
    if (w >= 11) pool.push('goblin');
    if (w >= 14) pool.push('healer');
    if (w >= 16) pool.push('orc');
    if (w >= 18) pool.push('splitter');
    if (w >= 21) pool.push('ghost');
    if (w >= 24) pool.push('shielder');
    return pool;
  }

  function startWave() {
    wave++;
    var diff = DIFFICULTIES[currentDifficulty];

    // Enemy count: cap at 35 to prevent lag
    var count = Math.min(35, 5 + Math.floor(wave * 1.5));

    // HP scaling: linear up to 30, then exponential ramp
    var hpMult;
    if (wave <= 30) {
      hpMult = 1 + wave * 0.15;
    } else {
      var base30 = 1 + 30 * 0.15; // 5.5
      hpMult = base30 * Math.pow(1.08, wave - 30);
    }
    hpMult *= diff.hpMult;

    var speedMult = diff.speedMult;
    var pool = getAvailableEnemyTypes(wave);

    spawnQueue = [];
    for (var i = 0; i < count; i++) {
      var type = pool[Math.floor(Math.random() * pool.length)];
      var baseHp = ENEMY_DEFS[type].hp;
      spawnQueue.push({ type: type, hp: Math.round(baseHp * hpMult), speedMult: speedMult });
    }

    // Boss wave: every 10, or every 5 past wave 30
    var isBossWave = (wave % 10 === 0) || (wave > 30 && wave % 5 === 0);
    if (isBossWave) {
      var bossNum = Math.floor(wave / 10) || 1;
      var bossHp = Math.round(500 * (1 + bossNum * 0.5) * diff.hpMult);
      if (wave > 30) {
        bossHp = Math.round(bossHp * Math.pow(1.08, wave - 30));
      }
      spawnQueue.push({ type: 'boss', hp: bossHp, speedMult: speedMult });
      spawnParticle(CANVAS_W / 2, CANVAS_H / 2, 'BOSS WAVE!', '#e44');
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
        speed: def.speed * (next.speedMult || 1),
        radius: def.radius,
        color: def.color,
        shape: def.shape,
        special: def.special,
        dist: 0,
        alive: true,
        dot: null,
        slow: null,
        caltropsHit: {},
        healTimer: 0,
        isMinion: false
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
    // Bonus scaling past wave 45
    if (wave > 45) {
      baseReward = Math.round(baseReward * (1 + (wave - 45) * 0.05));
    }

    // Boss wave bonus
    var isBoss = (wave % 10 === 0) || (wave > 30 && wave % 5 === 0);
    if (isBoss) {
      var bossNum = Math.floor(wave / 10) || 1;
      var bossBonus = 50 * bossNum;
      baseReward += bossBonus;
    }

    // Gold mine bonus
    var goldMineCount = 0;
    for (var g = 0; g < towers.length; g++) {
      if (towers[g].type === 'goldmine') goldMineCount++;
    }
    var mineBonus = goldMineCount * 2;

    var reward = Math.round((baseReward + mineBonus) * mods.rewardMult * DIFFICULTIES[currentDifficulty].rewardMult);
    sb += reward;
    sbEarned += reward;

    var rewardText = '+' + reward + ' SB';
    if (mineBonus > 0) rewardText += ' (+' + mineBonus + ' mines)';
    spawnParticle(CANVAS_W / 2, CANVAS_H / 2, rewardText, '#ffd700');

    // Reset rope trap at end of wave
    ropeTrapActive = false;

    // Check wave milestone for blueprint unlocks
    checkWaveMilestones();

    gameState = 'building';
    renderTowerBar();
    updateTowerBtnStates();
    updateHUD();
    saveRun();

    // Auto-start next wave
    if (autoWave) {
      startWave();
    }
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
    clearSave();
    var heroAbilBar = document.getElementById('td-hero-abilities');
    if (heroAbilBar) heroAbilBar.classList.add('td-hidden');

    stats.gamesPlayed++;
    stats.totalKills += totalKilled;
    stats.totalTowersBuilt += towersBuilt;
    stats.totalJBEarned += sbEarned;

    // Award one-time milestone material rewards for newly crossed milestones
    var milestoneMats = [];
    if (typeof window.FarmResources !== 'undefined') {
      for (var mi = 0; mi < WAVE_MILESTONES.length; mi++) {
        var ms = WAVE_MILESTONES[mi];
        if (ms.material && wave >= ms.wave && stats.highestWave < ms.wave) {
          window.FarmResources.add(ms.material.type, ms.material.key, ms.material.qty);
          milestoneMats.push('+' + ms.material.qty + ' ' + formatResourceName(ms.material.key));
        }
      }
    }

    // Detect newly unlocked farm blueprints (before updating highestWave)
    var farmUnlockNames = [];
    for (var fi = 0; fi < FARM_BLUEPRINTS.length; fi++) {
      var fbp = FARM_BLUEPRINTS[fi];
      if (wave >= fbp.wave && stats.highestWave < fbp.wave) {
        for (var fn = 0; fn < fbp.names.length; fn++) {
          farmUnlockNames.push(fbp.names[fn]);
        }
      }
    }

    if (wave > stats.highestWave) stats.highestWave = wave;

    // Per-map-difficulty record
    var recordKey = currentMapId + '-' + currentDifficulty;
    if (!stats.records) stats.records = {};
    var prev = stats.records[recordKey] || 0;
    if (wave > prev) stats.records[recordKey] = wave;

    saveStats();

    // Lump-sum cash-out: deposit earned SB as JB with soft cap
    // First 100 SB at 1:1, then sqrt scaling for diminishing returns
    var jbCashout = 0;
    if (sbEarned > 0) {
      if (sbEarned <= 100) {
        jbCashout = sbEarned;
      } else {
        jbCashout = 100 + Math.round(Math.sqrt((sbEarned - 100) * 50));
      }
      if (typeof JackBucks !== 'undefined' && JackBucks.add) {
        JackBucks.add(jbCashout);
      }
    }

    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'tower-defense',
        outcome: wave >= 5 ? 'win' : 'lose',
        bet: 0,
        payout: sbEarned
      });
    }

    setTimeout(function () {
      if (finalWave) finalWave.textContent = wave;
      if (finalKills) finalKills.textContent = totalKilled;
      if (finalTowers) finalTowers.textContent = towersBuilt;
      if (finalSBEl) finalSBEl.textContent = sbEarned;
      var cashoutLine = document.getElementById('td-cashout-line');
      if (cashoutLine) {
        if (sbEarned > 0) {
          cashoutLine.textContent = sbEarned + ' SB \u2192 +' + jbCashout + ' JB deposited';
        } else {
          cashoutLine.textContent = 'No SB earned this run';
          cashoutLine.style.opacity = '0.5';
        }
      }
      // Show milestone material rewards
      var matLine = document.getElementById('td-milestone-mats');
      if (matLine) {
        if (milestoneMats.length > 0) {
          matLine.textContent = 'Milestone rewards: ' + milestoneMats.join(', ');
          matLine.style.display = '';
        } else {
          matLine.style.display = 'none';
        }
      }

      // Show farm building unlocks
      var farmLine = document.getElementById('td-farm-unlocks');
      if (farmLine) {
        if (farmUnlockNames.length > 0) {
          farmLine.textContent = 'Farm unlocks: ' + farmUnlockNames.join(', ');
          farmLine.style.display = '';
        } else {
          farmLine.style.display = 'none';
        }
      }

      renderStatsBlock(goStats);
      gameoverOverlay.classList.remove('td-hidden');
    }, 500);
  }

  // ── Stats ─────────────────────────────────────────
  var stats = loadStats();

  function defaultStats() {
    return { gamesPlayed: 0, highestWave: 0, totalKills: 0, totalTowersBuilt: 0, totalJBEarned: 0, unlockedTowers: [], records: {} };
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
          unlockedTowers: s.unlockedTowers || [],
          records: s.records || {}
        };
      }
    } catch (e) {}
    return defaultStats();
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  // ── Run save / resume ────────────────────────────
  function saveRun() {
    try {
      var data = {
        wave: wave,
        sb: sb,
        sbEarned: sbEarned,
        lives: lives,
        towers: towers.map(function (t) {
          return { col: t.col, row: t.row, type: t.type, level: t.level, abilityCooldown: t.abilityCooldown || 0, targetMode: t.targetMode || 'closest', kills: t.kills || 0 };
        }),
        totalKilled: totalKilled,
        towersBuilt: towersBuilt,
        crate: crate,
        crateUsed: crateUsed,
        shieldCharges: shieldCharges,
        caltropZones: caltropZones,
        mapId: currentMapId,
        difficulty: currentDifficulty,
        hero: hero ? { col: hero.col, row: hero.row, kills: hero.kills || 0, targetMode: hero.targetMode || 'closest', qCooldown: hero.qCooldown || 0, wCooldown: hero.wCooldown || 0 } : null,
        heroPetId: heroPetId,
        heroPetType: heroPetType,
        heroPetLevel: heroPetLevel
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function resumeGame(save) {
    gameSpeed = 1;
    autoWave = false;
    // Restore map and difficulty from save
    currentMapId = save.mapId || 'map1';
    currentDifficulty = save.difficulty || 'normal';
    computePath();

    wave = save.wave || 0;
    sb = save.sb || START_SB;
    sbEarned = save.sbEarned || 0;
    lives = save.lives || START_LIVES;
    totalKilled = save.totalKilled || 0;
    towersBuilt = save.towersBuilt || 0;

    towers = [];
    for (var i = 0; i < (save.towers || []).length; i++) {
      var t = save.towers[i];
      towers.push({ col: t.col, row: t.row, type: t.type, level: t.level || 1, cooldown: 0, abilityCooldown: t.abilityCooldown || 0, megaBlast: false, rallyTimer: 0, targetMode: t.targetMode || 'closest', kills: t.kills || 0 });
    }

    enemies = [];
    projectiles = [];
    particles = [];
    lightningEffects = [];
    splashEffects = [];
    spawnQueue = [];
    totalSpawned = 0;
    hoverTile = null;
    inspectedTower = null;
    hideInspectPanel();
    lastTime = 0;

    crate = save.crate || [];
    crateUsed = save.crateUsed || {};
    shieldCharges = save.shieldCharges || 0;
    atkSpeedActive = false;
    atkSpeedTimer = 0;
    ropeTrapActive = false;
    caltropZones = save.caltropZones || [];
    placingCaltrops = false;

    // Restore hero
    heroPlacing = false;
    heroMoving = false;
    heroPetId = save.heroPetId || null;
    heroPetType = save.heroPetType || null;
    heroPetLevel = save.heroPetLevel || 1;
    getHeroAccessoryBonuses();
    loadHeroGearStats();
    if (save.hero && heroPetId) {
      hero = {
        col: save.hero.col, row: save.hero.row, type: 'hero', petId: heroPetId,
        cooldown: 0, qCooldown: save.hero.qCooldown || 0, wCooldown: save.hero.wCooldown || 0,
        targetMode: save.hero.targetMode || 'closest', kills: save.hero.kills || 0,
        attackFlash: 0, critHitsRemaining: 0, rageTimer: 0, overclockTimer: 0
      };
    } else {
      hero = null;
    }

    rebuildSynergyCache();
    gameState = 'building';
    startOverlay.classList.add('td-hidden');
    startButtonsEl.classList.add('td-hidden');
    gameoverOverlay.classList.add('td-hidden');
    towerBarEl.classList.remove('td-hidden');

    renderTowerBar();
    renderCrateBar();
    renderHeroAbilities();
    updateTowerBtnStates();
    updateHUD();

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function renderStatsBlock(el) {
    if (!el) return;
    el.innerHTML = 'Games: ' + stats.gamesPlayed +
      ' | Best Wave: ' + stats.highestWave +
      ' | Total Kills: ' + stats.totalKills +
      ' | Total JB Deposited: ' + stats.totalJBEarned;
  }

  // ── Start screen: SB breakdown + Investment UI ───
  function renderStartBreakdown() {
    var el = document.getElementById('td-start-breakdown');
    if (!el) return;

    var base = START_SB;
    var armory = mods.startSB;
    var milestone = getMilestoneBonus();
    var farmhouse = getFarmhouseBonus();
    var invest = investedSB;
    var total = base + armory + milestone + farmhouse + invest;

    var html = '<div class="td-start-breakdown-title">Starting SamBucks</div>';

    html += '<div class="td-start-breakdown-row"><span>Base</span><span>' + base + ' SB</span></div>';
    if (armory > 0) {
      html += '<div class="td-start-breakdown-row"><span>Supply Lines</span><span>+' + armory + ' SB</span></div>';
    }
    if (milestone > 0) {
      html += '<div class="td-start-breakdown-row"><span>Wave Milestones</span><span>+' + milestone + ' SB</span></div>';
    }
    if (farmhouse > 0) {
      html += '<div class="td-start-breakdown-row"><span>Farmhouse</span><span>+' + farmhouse + ' SB</span></div>';
    }
    if (invest > 0) {
      html += '<div class="td-start-breakdown-row"><span>JB Investment</span><span>+' + invest + ' SB</span></div>';
    }
    html += '<div class="td-start-breakdown-row td-start-breakdown-total"><span>Total</span><span>' + total + ' SB</span></div>';

    // Next milestone hint
    var nextMilestone = null;
    for (var i = 0; i < WAVE_MILESTONES.length; i++) {
      if (stats.highestWave < WAVE_MILESTONES[i].wave) {
        nextMilestone = WAVE_MILESTONES[i];
        break;
      }
    }
    if (nextMilestone) {
      html += '<div style="font-size:11px;opacity:0.5;margin-top:4px">Next milestone: Wave ' + nextMilestone.wave + ' (+' + nextMilestone.bonus + ' SB)</div>';
    }

    // Next farm building unlock hint
    var nextFarmBP = null;
    for (var fb = 0; fb < FARM_BLUEPRINTS.length; fb++) {
      if (stats.highestWave < FARM_BLUEPRINTS[fb].wave) {
        nextFarmBP = FARM_BLUEPRINTS[fb];
        break;
      }
    }
    if (nextFarmBP) {
      html += '<div style="font-size:11px;opacity:0.5;margin-top:2px;color:#4caf50">Next farm unlock: Wave ' + nextFarmBP.wave + ' \u2192 ' + nextFarmBP.names.join(', ') + '</div>';
    }

    el.innerHTML = html;
  }

  function renderInvestSection() {
    var el = document.getElementById('td-invest-section');
    if (!el) return;

    var hasJB = typeof JackBucks !== 'undefined' && JackBucks.getBalance;
    if (!hasJB) {
      el.style.display = 'none';
      return;
    }

    var jbBalance = JackBucks.getBalance();
    var maxAffordSB = Math.min(MAX_INVEST_SB, Math.floor(jbBalance / INVEST_RATE));

    var html = '<div class="td-invest-title">Invest JackBucks</div>';
    html += '<div style="opacity:0.6;margin-bottom:6px">Convert JB \u2192 SB at ' + INVEST_RATE + ':1 rate (max ' + MAX_INVEST_SB + ' SB)</div>';

    html += '<div class="td-invest-row">';
    html += '<button class="td-invest-btn" id="td-invest-minus"' + (investedSB <= 0 ? ' disabled' : '') + '>\u2212</button>';
    html += '<span class="td-invest-amount">' + investedSB + ' SB</span>';
    html += '<button class="td-invest-btn" id="td-invest-plus"' + (investedSB >= maxAffordSB ? ' disabled' : '') + '>+</button>';
    html += '</div>';

    var cost = investedSB * INVEST_RATE;
    html += '<div class="td-invest-info">Cost: ' + cost + ' JB | Balance: ' + jbBalance + ' JB</div>';

    el.style.display = '';
    el.innerHTML = html;

    // Bind buttons
    var minusBtn = document.getElementById('td-invest-minus');
    var plusBtn = document.getElementById('td-invest-plus');
    if (minusBtn) {
      minusBtn.addEventListener('click', function () {
        if (investedSB > 0) {
          investedSB -= 5;
          if (investedSB < 0) investedSB = 0;
          renderInvestSection();
          renderStartBreakdown();
        }
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', function () {
        var curBalance = JackBucks.getBalance();
        var maxNow = Math.min(MAX_INVEST_SB, Math.floor(curBalance / INVEST_RATE));
        if (investedSB < maxNow) {
          investedSB += 5;
          if (investedSB > maxNow) investedSB = maxNow;
          renderInvestSection();
          renderStartBreakdown();
        }
      });
    }
  }

  // ── HUD ───────────────────────────────────────────
  var waveBtn = null; // set during renderTowerBar

  function updateHUD() {
    if (hudWave) {
      var waveText = 'Wave: ' + (wave || '\u2014');
      if (wave > 30) waveText += ' \u221E';
      hudWave.textContent = waveText;
    }
    if (hudLives) hudLives.textContent = '\u2665 ' + lives;
    if (hudSB) hudSB.textContent = 'SB: ' + (gameState === 'idle' ? '\u2014' : sb);
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
      } else if (sb < cost) {
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

    // Hero button (first in bar)
    if (heroPetType && HERO_DEFS[heroPetType]) {
      var heroDef = HERO_DEFS[heroPetType];
      var hBtn = document.createElement('button');
      hBtn.className = 'td-tower-btn td-hero-btn';
      if (heroPlacing || heroMoving) hBtn.className += ' td-tower-btn-selected';
      hBtn.setAttribute('data-tower', 'hero');
      hBtn.style.borderColor = heroDef.color;

      var hIcon = document.createElement('span');
      hIcon.className = 'td-tower-icon';
      hIcon.style.color = heroDef.color;
      hIcon.textContent = hero ? '\u2714' : heroDef.symbol;
      hBtn.appendChild(hIcon);

      var hName = document.createElement('span');
      hName.className = 'td-tower-name';
      hName.textContent = hero ? 'Move' : 'Hero';
      hBtn.appendChild(hName);

      var hCost = document.createElement('span');
      hCost.className = 'td-tower-cost';
      hCost.style.color = heroDef.color;
      hCost.textContent = 'FREE';
      hBtn.appendChild(hCost);

      hBtn.addEventListener('click', function () {
        placingCaltrops = false;
        selectedTower = null;
        var all = towerBarEl.querySelectorAll('.td-tower-btn');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('td-tower-btn-selected');

        if (hero) {
          if (gameState !== 'building') return;
          if (heroMoving) {
            heroMoving = false;
          } else {
            heroMoving = true;
            heroPlacing = false;
            hBtn.classList.add('td-tower-btn-selected');
          }
        } else {
          if (heroPlacing) {
            heroPlacing = false;
          } else {
            heroPlacing = true;
            heroMoving = false;
            hBtn.classList.add('td-tower-btn-selected');
          }
        }
      });

      towerBarEl.appendChild(hBtn);
    }

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
      cost.textContent = unlocked ? getEffectiveCost(def) + ' SB' : '\uD83D\uDD12';
      btn.appendChild(cost);

      btn.addEventListener('click', (function (k) {
        return function () {
          if (!isTowerUnlocked(k)) return;
          var def = TOWER_DEFS[k];
          // Allow deselect even if can't afford, but block selecting new tower
          if (selectedTower !== k && def && sb < getEffectiveCost(def)) return;
          placingCaltrops = false;
          heroPlacing = false;
          heroMoving = false;
          var all = towerBarEl.querySelectorAll('.td-tower-btn');
          // Toggle: clicking selected tower deselects it
          if (selectedTower === k) {
            selectedTower = null;
            for (var j = 0; j < all.length; j++) {
              all[j].classList.remove('td-tower-btn-selected');
            }
          } else {
            selectedTower = k;
            for (var j = 0; j < all.length; j++) {
              all[j].classList.remove('td-tower-btn-selected');
            }
            this.classList.add('td-tower-btn-selected');
          }
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

    // Wave preview (building phase only)
    if (gameState === 'building') {
      var nextWave = wave + 1;
      var pool = getAvailableEnemyTypes(nextWave);
      var count = Math.min(35, 5 + Math.floor(nextWave * 1.5));
      var isBoss = (nextWave % 10 === 0) || (nextWave > 30 && nextWave % 5 === 0);
      var preview = document.createElement('div');
      preview.className = 'td-wave-preview';
      var parts = [];
      for (var pi = 0; pi < pool.length; pi++) {
        var ed = ENEMY_DEFS[pool[pi]];
        parts.push('<span style="color:' + ed.color + '">' + pool[pi] + '</span>');
      }
      preview.innerHTML = count + 'x [' + parts.join(', ') + ']' + (isBoss ? ' + <span style="color:#e44">BOSS</span>' : '');
      towerBarEl.appendChild(preview);
    }

    // Speed toggle button
    var spd = document.createElement('button');
    spd.className = 'td-speed-btn' + (gameSpeed === 2 ? ' td-speed-btn-active' : '');
    spd.textContent = gameSpeed === 2 ? 'x2' : 'x1';
    spd.addEventListener('click', function () {
      gameSpeed = gameSpeed === 2 ? 1 : 2;
      renderTowerBar();
      updateTowerBtnStates();
    });
    towerBarEl.appendChild(spd);

    // Auto-wave toggle button
    var aw = document.createElement('button');
    aw.className = 'td-speed-btn' + (autoWave ? ' td-speed-btn-active' : '');
    aw.textContent = autoWave ? 'Auto' : 'Auto';
    aw.title = 'Auto-start next wave';
    aw.addEventListener('click', function () {
      autoWave = !autoWave;
      renderTowerBar();
      updateTowerBtnStates();
      if (autoWave && gameState === 'building' && wave > 0) startWave();
    });
    towerBarEl.appendChild(aw);

    // Menu button (only during gameplay)
    if (gameState === 'building' || gameState === 'waving') {
      var mb = document.createElement('button');
      mb.className = 'td-menu-btn';
      mb.textContent = 'Quit';
      mb.addEventListener('click', function () {
        quitToMenu();
      });
      towerBarEl.appendChild(mb);
    }
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

    var wp = MAPS[currentMapId].path;
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
    var curMap = MAPS[currentMapId];
    var spawnTC = tileCenter(curMap.spawn[0], curMap.spawn[1]);
    ctx.textAlign = 'right';
    ctx.fillText('IN', spawnTC.x - 4, spawnTC.y);
    var exitTC = tileCenter(curMap.exit[0], curMap.exit[1]);
    ctx.textAlign = 'left';
    ctx.fillText('OUT', exitTC.x + TILE_SIZE / 2 + 2, exitTC.y);
    ctx.globalAlpha = 1;
  }

  // ── Hero drawing ─────────────────────────────────
  function drawHero() {
    if (!hero || !heroPetType) return;
    var def = HERO_DEFS[heroPetType];
    var tc = tileCenter(hero.col, hero.row);
    var isInspected = inspectedTower === hero;

    // Tile tint
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(hero.col * TILE_SIZE, hero.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1;

    // Attack flash
    if (hero.attackFlash > 0) {
      ctx.fillStyle = def.color;
      ctx.globalAlpha = hero.attackFlash / 0.15 * 0.3;
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, TILE_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sprite or fallback
    if (heroSpriteSheet && heroSpriteFrameCount > 0) {
      var heroFrame = Math.min(heroSpriteFrameOffset + (heroPetLevel || 1) - 1, heroSpriteFrameCount - 1);
      drawHeroSprite(tc.x, tc.y, heroFrame);
    } else {
      // Fallback: colored square with symbol
      var half = TILE_SIZE * 0.35;
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(tc.x - half, tc.y - half, half * 2, half * 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isInspected ? '#fff' : def.color;
      ctx.lineWidth = isInspected ? 2.5 : 1.5;
      ctx.strokeRect(tc.x - half, tc.y - half, half * 2, half * 2);
      ctx.fillStyle = colorFg;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, tc.x, tc.y);
    }

    // Inspected border
    if (isInspected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(hero.col * TILE_SIZE + 2, hero.row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }

    // Ability auras
    if (hero.critHitsRemaining > 0) {
      // Cat crit: gold sparkle dots
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
      for (var di = 0; di < 4; di++) {
        var angle = Date.now() * 0.003 + di * Math.PI / 2;
        ctx.fillRect(tc.x + Math.cos(angle) * 14 - 1, tc.y + Math.sin(angle) * 14 - 1, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    if (hero.rageTimer > 0) {
      // Dragon rage: orange pulsing ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, TILE_SIZE * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = '#f84';
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() * 0.006);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (hero.overclockTimer > 0) {
      // Robot overclock: cyan dashed ring at hero range
      ctx.save();
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, getHeroRangePx(), 0, Math.PI * 2);
      ctx.strokeStyle = '#4cf';
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(Date.now() * 0.005);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Range circle when inspected or hovered
    var showRange = isInspected || (hoverTile && hoverTile.col === hero.col && hoverTile.row === hero.row);
    if (showRange) {
      var rangePx = getHeroRangePx();
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, rangePx, 0, Math.PI * 2);
      ctx.strokeStyle = def.color;
      ctx.globalAlpha = isInspected ? 0.35 : 0.2;
      ctx.lineWidth = isInspected ? 1.5 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawGhostTower() {
    if (gameState === 'gameover' || gameState === 'idle') return;
    if (!hoverTile) return;

    // Hero placement/movement ghost
    if (heroPlacing || heroMoving) {
      var hc = hoverTile.col;
      var hr = hoverTile.row;
      var hBuildable = isBuildable(hc, hr);
      var hDef = heroPetType ? HERO_DEFS[heroPetType] : null;
      var hColor = hDef ? hDef.color : colorAccent;
      var htc = tileCenter(hc, hr);

      ctx.fillStyle = hBuildable ? hColor : '#e44';
      ctx.globalAlpha = 0.15;
      ctx.fillRect(hc * TILE_SIZE, hr * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1;

      if (hBuildable && hDef) {
        ctx.fillStyle = colorFg;
        ctx.globalAlpha = 0.4;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hDef.symbol, htc.x, htc.y);

        var hRange = hDef.range * TILE_SIZE;
        if (heroAccessoryBonuses.range) hRange *= 1 + heroAccessoryBonuses.range;
        ctx.beginPath();
        ctx.arc(htc.x, htc.y, hRange, 0, Math.PI * 2);
        ctx.strokeStyle = hColor;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      return;
    }

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
      updateHealers(dt);
      updateShieldFlags();
      updateTowers(dt);
      if (hero) updateHero(dt);
      updateProjectiles(dt);
      updateSplash(dt);
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
    drawHero();
    drawEnemies();
    drawProjectiles();
    drawSplash();
    drawLightning();
    drawParticles();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;
    dt *= gameSpeed;

    update(dt);
    draw();
    updateHUD();

    // Update smoked fish timer on crate bar
    if (atkSpeedActive && crateBarEl && !crateBarEl.classList.contains('td-hidden')) {
      renderCrateBar();
    }

    // Auto-refresh inspect panel for ability cooldown countdown
    if (inspectedTower && inspectedTower.abilityCooldown > 0 && mods.specialAbilities) {
      renderInspectPanel();
    }

    // Auto-refresh hero ability bar when cooldowns ticking
    if (hero && (hero.qCooldown > 0 || hero.wCooldown > 0)) {
      renderHeroAbilities();
    }
    // Auto-refresh hero inspect for buff timers
    if (inspectedTower && inspectedTower.type === 'hero') {
      renderInspectPanel();
    }

    if (gameState === 'building' || gameState === 'waving') {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  // ── Tower Inspection ─────────────────────────────
  // ── Hero ability bar rendering ───────────────────
  function renderHeroAbilities() {
    var bar = document.getElementById('td-hero-abilities');
    if (!bar) return;
    if (!hero || !heroPetType) {
      bar.classList.add('td-hidden');
      return;
    }
    var def = HERO_DEFS[heroPetType];
    var petColor = HERO_ACCENT_COLORS[heroPetType];
    bar.classList.remove('td-hidden');
    bar.innerHTML = '';

    function makeAbilBtn(key, abil, cooldown, activateFn) {
      var btn = document.createElement('button');
      btn.className = 'td-hero-ability-btn';
      var onCd = cooldown > 0;
      btn.disabled = onCd;
      btn.style.borderColor = petColor;
      if (!onCd) btn.style.color = petColor;

      // Build inner HTML with name + description + cooldown overlay
      var html = '<span class="td-ability-key">' + key + '</span>';
      html += '<span class="td-ability-name">' + abil.name + '</span>';
      html += '<span class="td-ability-desc">' + abil.desc + '</span>';
      if (onCd) {
        var totalCd = getHeroAbilityCooldown(abil.cooldown);
        var pct = Math.min(100, (cooldown / totalCd) * 100);
        html += '<span class="td-ability-cd">' + Math.ceil(cooldown) + 's</span>';
        html += '<span class="td-ability-cd-fill" style="width:' + pct + '%;background:' + petColor + '"></span>';
      } else {
        html += '<span class="td-ability-ready">READY</span>';
      }
      btn.innerHTML = html;
      btn.addEventListener('click', function () { activateFn(); });
      return btn;
    }

    bar.appendChild(makeAbilBtn('Q', def.q, hero.qCooldown, activateHeroQ));
    bar.appendChild(makeAbilBtn('W', def.w, hero.wCooldown, activateHeroW));
  }

  function renderHeroInspectPanel(panel, t) {
    var def = HERO_DEFS[heroPetType];
    var towerColor = def.color;
    var dmg = getHeroDmg();
    var rangeTiles = (getHeroRangePx() / TILE_SIZE).toFixed(1);
    var petName = heroPetType.charAt(0).toUpperCase() + heroPetType.slice(1);

    var html = '<div class="td-inspect-header" style="border-color:' + towerColor + '">';
    html += '<span class="td-inspect-name" style="color:' + towerColor + '">' + petName + ' Hero Lv' + heroPetLevel + '</span>';
    html += '<button class="td-inspect-close" id="td-inspect-close-btn">&times;</button>';
    html += '</div>';

    var criPct = Math.round(heroGearStats.cri * GEAR_CRI_SCALE * 100);
    html += '<div class="td-inspect-stats">';
    html += '<span>DMG: ' + dmg + '</span>';
    html += '<span>Range: ' + rangeTiles + '</span>';
    html += '<span>Speed: ' + def.speed.toFixed(1) + 's</span>';
    if (criPct > 0) html += '<span>CRI: ' + criPct + '%</span>';
    html += '<span class="td-inspect-kills">\uD83D\uDC80 ' + (t.kills || 0) + '</span>';
    html += '</div>';

    // Targeting mode
    html += '<div class="td-inspect-target">';
    html += '<button class="td-inspect-btn td-inspect-target-btn" id="td-inspect-target-btn">\u25CE ' + TARGET_MODE_LABELS[t.targetMode || 'closest'] + '</button>';
    html += '</div>';

    // Abilities info
    html += '<div class="td-inspect-ability">';
    html += '<div style="font-size:10px;opacity:0.7;margin-bottom:2px">Q: ' + def.q.name + ' \u2014 ' + def.q.desc + '</div>';
    html += '<div style="font-size:10px;opacity:0.7">W: ' + def.w.name + ' \u2014 ' + def.w.desc + '</div>';
    html += '</div>';

    // Active buffs
    var buffs = [];
    if (t.critHitsRemaining > 0) buffs.push('Crit x' + t.critHitsRemaining);
    if (t.rageTimer > 0) buffs.push('Rage ' + Math.ceil(t.rageTimer) + 's');
    if (t.overclockTimer > 0) buffs.push('Overclock ' + Math.ceil(t.overclockTimer) + 's');
    if (buffs.length > 0) {
      html += '<div style="padding:3px 8px;font-size:10px;color:' + towerColor + '">' + buffs.join(' | ') + '</div>';
    }

    // Accessory bonuses
    var bonusLines = [];
    var bonusKeys = Object.keys(heroAccessoryBonuses);
    for (var bi = 0; bi < bonusKeys.length; bi++) {
      var bk = bonusKeys[bi];
      // Find the accessory desc for this stat
      var accKeys = Object.keys(ACCESSORY_HERO_BONUSES);
      for (var ai = 0; ai < accKeys.length; ai++) {
        if (ACCESSORY_HERO_BONUSES[accKeys[ai]].stat === bk) {
          bonusLines.push(ACCESSORY_HERO_BONUSES[accKeys[ai]].desc);
          break;
        }
      }
    }
    if (bonusLines.length > 0) {
      html += '<div style="padding:3px 8px;font-size:9px;color:#ffd700">';
      for (var li = 0; li < bonusLines.length; li++) {
        html += '\u2605 ' + bonusLines[li] + '<br>';
      }
      html += '</div>';
    }

    // Gear bonuses
    var gearLines = [];
    if (heroGearStats.atk > 0) gearLines.push('+' + (heroGearStats.atk * GEAR_ATK_SCALE).toFixed(1) + ' base DMG');
    if (heroGearStats.spd > 0) gearLines.push('+' + Math.round(heroGearStats.spd * GEAR_SPD_SCALE * 100) + '% ATK speed');
    if (heroGearStats.cri > 0) gearLines.push(criPct + '% crit chance');
    if (heroGearStats.def > 0) gearLines.push('-' + Math.round(Math.min(heroGearStats.def * GEAR_DEF_CD_SCALE, 0.15) * 100) + '% ability CD');
    if (gearLines.length > 0) {
      html += '<div style="padding:3px 8px;font-size:9px;color:#ffd700">';
      for (var gi = 0; gi < gearLines.length; gi++) {
        html += '\u2694 ' + gearLines[gi] + '<br>';
      }
      html += '</div>';
    }

    // Move button (building phase only)
    if (gameState === 'building') {
      html += '<div class="td-inspect-actions">';
      html += '<button class="td-inspect-btn" id="td-hero-move-btn" style="border-color:' + towerColor + ';color:' + towerColor + '">Move Hero</button>';
      html += '</div>';
    }

    html += '<div class="td-inspect-hint">' + (isMobile ? 'Tap Q/W below' : 'Press Q/W or click below') + '</div>';

    panel.innerHTML = html;
    panel.classList.remove('td-hidden');

    // Position panel near hero
    var heroScreenX = t.col * TILE_SIZE * scale;
    var heroScreenY = t.row * TILE_SIZE * scale;
    var panelW = isMobile ? 160 : 180;
    var wrapW = canvasWrap.clientWidth;
    var wrapH = canvasWrap.clientHeight;

    var left = Math.min(Math.max(4, heroScreenX - panelW / 2 + TILE_SIZE * scale / 2), wrapW - panelW - 4);
    panel.style.left = left + 'px';
    panel.style.width = panelW + 'px';

    if (heroScreenY > wrapH / 2) {
      panel.style.bottom = (wrapH - heroScreenY + 4) + 'px';
      panel.style.top = 'auto';
    } else {
      panel.style.top = (heroScreenY + TILE_SIZE * scale + 4) + 'px';
      panel.style.bottom = 'auto';
    }

    // Bind buttons
    var closeBtn = document.getElementById('td-inspect-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function (ev) { ev.stopPropagation(); closeInspect(); });

    var targetBtn = document.getElementById('td-inspect-target-btn');
    if (targetBtn) targetBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!hero) return;
      var cur = hero.targetMode || 'closest';
      var idx = TARGET_MODES.indexOf(cur);
      hero.targetMode = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
      renderInspectPanel();
    });

    var moveBtn = document.getElementById('td-hero-move-btn');
    if (moveBtn) moveBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      closeInspect();
      heroMoving = true;
      heroPlacing = false;
      selectedTower = null;
      renderTowerBar();
    });
  }

  function renderInspectPanel() {
    var panel = document.getElementById('td-inspect-panel');
    if (!panel || !inspectedTower) return;

    var t = inspectedTower;

    // Hero inspect panel
    if (t.type === 'hero' && heroPetType) {
      renderHeroInspectPanel(panel, t);
      return;
    }

    var def = TOWER_DEFS[t.type];
    var towerColor = def.color || colorAccent;
    var dmg = getEffectiveDmg(t);
    var rangeTiles = (getEffectiveRangePx(t) / TILE_SIZE).toFixed(1);
    var upgradeCost = getUpgradeCostForTower(t);

    var html = '<div class="td-inspect-header" style="border-color:' + towerColor + '">';
    html += '<span class="td-inspect-name" style="color:' + towerColor + '">' + def.name + ' Lv' + t.level + '</span>';
    html += '<button class="td-inspect-close" id="td-inspect-close-btn">&times;</button>';
    html += '</div>';

    html += '<div class="td-inspect-stats">';
    if (def.dmg > 0) html += '<span>DMG: ' + dmg + '</span>';
    if (def.range > 0) html += '<span>Range: ' + rangeTiles + '</span>';
    if (def.speed > 0) html += '<span>Speed: ' + def.speed.toFixed(1) + 's</span>';
    html += '<span class="td-inspect-kills">\uD83D\uDC80 ' + (t.kills || 0) + '</span>';
    html += '</div>';

    // Targeting mode (only for attacking towers)
    if (def.range > 0 && (def.dmg > 0 || def.speed > 0)) {
      html += '<div class="td-inspect-target">';
      html += '<button class="td-inspect-btn td-inspect-target-btn" id="td-inspect-target-btn">\u25CE ' + TARGET_MODE_LABELS[t.targetMode || 'closest'] + '</button>';
      html += '</div>';
    }

    // Synergy section
    var tSynergies = getTowerSynergies(t);
    if (tSynergies.length > 0) {
      html += '<div class="td-inspect-synergies">';
      for (var si = 0; si < tSynergies.length; si++) {
        var syn = tSynergies[si];
        var synDef = null;
        for (var sdi = 0; sdi < SYNERGY_DEFS.length; sdi++) {
          if (SYNERGY_DEFS[sdi].id === syn.id) { synDef = SYNERGY_DEFS[sdi]; break; }
        }
        if (!synDef) continue;
        html += '<div class="td-synergy-line" style="color:' + synDef.color + '">';
        html += '\u26A1 ' + synDef.name + ': ' + synDef.desc;
        if (syn.stacks > 1) html += ' (x' + syn.stacks + ')';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '<div class="td-inspect-actions">';
    if (t.level < getMaxTowerLevel() && upgradeCost !== null) {
      var canUpgrade = sb >= upgradeCost;
      html += '<button class="td-inspect-btn td-inspect-upgrade" id="td-inspect-upgrade-btn"' +
        (canUpgrade ? '' : ' disabled') + '>Upgrade Lv' + (t.level + 1) + ' (' + upgradeCost + ' SB)</button>';
    } else {
      html += '<span class="td-inspect-maxed">MAX LEVEL</span>';
    }
    var refund = Math.floor(getTotalInvestment(t) * 0.5);
    html += '<button class="td-inspect-btn td-inspect-sell" id="td-inspect-sell-btn">Sell (+' + refund + ' SB)</button>';
    html += '</div>';

    // Ability section (Arcane Mastery)
    if (mods.specialAbilities && def.ability) {
      html += '<div class="td-inspect-ability">';
      var onCd = t.abilityCooldown > 0;
      html += '<button class="td-inspect-btn td-inspect-ability-btn" id="td-inspect-ability-btn"' +
        (onCd ? ' disabled' : '') + '>' +
        def.ability.name + (onCd ? ' (' + Math.ceil(t.abilityCooldown) + 's)' : '') +
        '</button>';
      html += '<div class="td-inspect-ability-desc">' + def.ability.desc + '</div>';
      html += '</div>';
    }

    html += '<div class="td-inspect-hint">' + (isMobile ? '' : 'ESC to close') + '</div>';

    panel.innerHTML = html;
    panel.classList.remove('td-hidden');

    // Position panel near tower
    var towerScreenX = t.col * TILE_SIZE * scale;
    var towerScreenY = t.row * TILE_SIZE * scale;
    var panelW = isMobile ? 160 : 180;
    var wrapW = canvasWrap.clientWidth;
    var wrapH = canvasWrap.clientHeight;

    var left = Math.min(Math.max(4, towerScreenX - panelW / 2 + TILE_SIZE * scale / 2), wrapW - panelW - 4);
    panel.style.left = left + 'px';
    panel.style.width = panelW + 'px';

    if (towerScreenY > wrapH / 2) {
      panel.style.bottom = (wrapH - towerScreenY + 4) + 'px';
      panel.style.top = 'auto';
    } else {
      panel.style.top = (towerScreenY + TILE_SIZE * scale + 4) + 'px';
      panel.style.bottom = 'auto';
    }

    // Bind buttons
    var closeBtn = document.getElementById('td-inspect-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function (ev) { ev.stopPropagation(); closeInspect(); });

    var targetBtn = document.getElementById('td-inspect-target-btn');
    if (targetBtn) targetBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!inspectedTower) return;
      var cur = inspectedTower.targetMode || 'closest';
      var idx = TARGET_MODES.indexOf(cur);
      inspectedTower.targetMode = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
      renderInspectPanel();
    });

    var upgradeBtn = document.getElementById('td-inspect-upgrade-btn');
    if (upgradeBtn) upgradeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (inspectedTower) upgradeTower(inspectedTower);
    });

    var sellBtn = document.getElementById('td-inspect-sell-btn');
    if (sellBtn) sellBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (inspectedTower) sellTower(inspectedTower);
    });

    var abilityBtn = document.getElementById('td-inspect-ability-btn');
    if (abilityBtn) abilityBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (inspectedTower) {
        activateAbility(inspectedTower);
        closeInspect();
      }
    });
  }

  function hideInspectPanel() {
    var panel = document.getElementById('td-inspect-panel');
    if (panel) {
      panel.classList.add('td-hidden');
      panel.innerHTML = '';
    }
  }

  function closeInspect() {
    inspectedTower = null;
    hideInspectPanel();
  }

  var towerHotkeys = Object.keys(TOWER_DEFS);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (heroPlacing || heroMoving) {
        heroPlacing = false;
        heroMoving = false;
        renderTowerBar();
      } else if (inspectedTower) {
        closeInspect();
      } else if (selectedTower) {
        selectedTower = null;
        placingCaltrops = false;
        var all = towerBarEl.querySelectorAll('.td-tower-btn');
        for (var i = 0; i < all.length; i++) {
          all[i].classList.remove('td-tower-btn-selected');
        }
      }
    }

    // Hero ability hotkeys
    if (gameState === 'waving' && hero) {
      if (e.key === 'q' || e.key === 'Q') { activateHeroQ(); return; }
      if (e.key === 'w' || e.key === 'W') { activateHeroW(); return; }
    }

    // Tower hotkeys: 1-8
    if (gameState !== 'building' && gameState !== 'waving') return;
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= towerHotkeys.length) {
      var key = towerHotkeys[num - 1];
      if (!isTowerUnlocked(key)) return;
      var def = TOWER_DEFS[key];
      if (selectedTower === key) {
        selectedTower = null;
      } else if (sb >= getEffectiveCost(def)) {
        selectedTower = key;
      } else {
        return;
      }
      placingCaltrops = false;
      var all = towerBarEl.querySelectorAll('.td-tower-btn');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('td-tower-btn-selected');
        if (selectedTower && all[i].getAttribute('data-tower') === selectedTower) {
          all[i].classList.add('td-tower-btn-selected');
        }
      }
    }
  });

  // ── Input ─────────────────────────────────────────
  function canvasCoords(e) {
    var touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null;
    var clientX = touch ? touch.clientX : e.clientX;
    var clientY = touch ? touch.clientY : e.clientY;
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  var touchMoved = false;
  var lastTouchTime = 0;

  canvas.addEventListener('touchstart', function (e) {
    touchMoved = false;
    if (e.touches.length === 1) {
      var coords = canvasCoords(e.touches[0]);
      hoverTile = pixelToTile(coords.x, coords.y);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    touchMoved = true;
    if (e.touches.length === 1) {
      var coords = canvasCoords(e.touches[0]);
      hoverTile = pixelToTile(coords.x, coords.y);
    }
  }, { passive: true });

  function onCanvasTap(e) {
    if (gameState === 'idle' || gameState === 'gameover') return;
    if (e.type === 'touchend' && touchMoved) return;
    if (e.type === 'click' && Date.now() - lastTouchTime < 500) return;
    if (e.type === 'touchend') {
      lastTouchTime = Date.now();
      e.preventDefault();
    }

    var coords = canvasCoords(e);
    var tile = pixelToTile(coords.x, coords.y);

    // Hero placement
    if (heroPlacing && isBuildable(tile.col, tile.row)) {
      placeHero(tile.col, tile.row);
      renderTowerBar();
      renderHeroAbilities();
      updateTowerBtnStates();
      return;
    }

    // Hero movement (building phase only)
    if (heroMoving && gameState === 'building' && isBuildable(tile.col, tile.row)) {
      moveHero(tile.col, tile.row);
      renderTowerBar();
      updateTowerBtnStates();
      return;
    }

    // Caltrop placement
    if (placingCaltrops && isPathTile(tile.col, tile.row)) {
      caltropZones.push({ col: tile.col, row: tile.row });
      placingCaltrops = false;
      renderCrateBar();
      return;
    }

    // Check for existing tower/hero -> inspect
    var existingTower = getTowerAt(tile.col, tile.row);
    if (existingTower) {
      // Cancel hero/tower placement mode on inspect
      heroPlacing = false;
      heroMoving = false;
      if (inspectedTower === existingTower) {
        closeInspect();
      } else {
        inspectedTower = existingTower;
        renderInspectPanel();
      }
      return;
    }

    // Close inspection if clicking elsewhere
    if (inspectedTower) {
      closeInspect();
    }

    if (selectedTower && isTowerUnlocked(selectedTower) && isBuildable(tile.col, tile.row)) {
      var def = TOWER_DEFS[selectedTower];
      if (sb >= getEffectiveCost(def)) {
        placeTower(tile.col, tile.row, selectedTower);
        updateTowerBtnStates();
      }
    }
  }

  canvas.addEventListener('click', onCanvasTap);
  canvas.addEventListener('touchend', function (e) {
    onCanvasTap(e);
    hoverTile = null;
  }, { passive: false });

  canvas.addEventListener('mousemove', function (e) {
    var coords = canvasCoords(e);
    hoverTile = pixelToTile(coords.x, coords.y);
  });

  canvas.addEventListener('mouseleave', function () {
    hoverTile = null;
  });

  // ── Click outside game area → deselect ───────────
  document.addEventListener('click', function (e) {
    if (gameState !== 'building' && gameState !== 'waving') return;
    var heroAbilBar = document.getElementById('td-hero-abilities');
    if (canvas.contains(e.target) || towerBarEl.contains(e.target) || (crateBarEl && crateBarEl.contains(e.target)) || (heroAbilBar && heroAbilBar.contains(e.target))) return;
    var panel = document.getElementById('td-inspect-panel');
    if (panel && panel.contains(e.target)) return;
    if (inspectedTower) closeInspect();
    if (selectedTower) {
      selectedTower = null;
      placingCaltrops = false;
      var all = towerBarEl.querySelectorAll('.td-tower-btn');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('td-tower-btn-selected');
      }
    }
  });

  // ── Play / Retry ──────────────────────────────────
  function startGame() {
    gameSpeed = 1;
    autoWave = false;
    // Deduct JB investment before starting
    var investCost = investedSB * INVEST_RATE;
    if (investedSB > 0 && typeof JackBucks !== 'undefined' && JackBucks.deduct) {
      JackBucks.deduct(investCost);
    }

    // Map + difficulty already set from UI selection
    computePath();

    wave = 0;
    lives = START_LIVES + mods.startLives + DIFFICULTIES[currentDifficulty].livesBonus;
    sb = START_SB + mods.startSB + getMilestoneBonus() + getFarmhouseBonus() + investedSB;
    sbEarned = 0;
    towers = [];
    enemies = [];
    projectiles = [];
    particles = [];
    lightningEffects = [];
    splashEffects = [];
    spawnQueue = [];
    totalSpawned = 0;
    totalKilled = 0;
    towersBuilt = 0;
    hoverTile = null;
    inspectedTower = null;
    hideInspectPanel();
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

    // Reset hero state
    hero = null;
    heroPlacing = false;
    heroMoving = false;
    getHeroPetInfo();
    getHeroAccessoryBonuses();
    loadHeroGearStats();

    rebuildSynergyCache();
    gameState = 'building';
    startOverlay.classList.add('td-hidden');
    startButtonsEl.classList.add('td-hidden');
    gameoverOverlay.classList.add('td-hidden');
    towerBarEl.classList.remove('td-hidden');

    renderTowerBar();
    renderCrateBar();
    renderHeroAbilities();
    updateTowerBtnStates();
    updateHUD();

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  if (playBtn) playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearSave();
    startGame();
  });

  var resumeBtn = document.getElementById('td-resume-btn');
  if (resumeBtn) resumeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var save = loadSave();
    if (save) {
      resumeGame(save);
    }
  });

  if (retryBtn) retryBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    crate = [];
    crateUsed = {};
    saveCrate();
    showStartScreen();
  });

  function quitToMenu() {
    // Save current run if between waves
    if (gameState === 'building') {
      saveRun();
    }
    // Stop game loop
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    showStartScreen();
  }

  function showStartScreen() {
    gameSpeed = 1;
    autoWave = false;
    gameState = 'idle';
    startOverlay.classList.remove('td-hidden');
    startButtonsEl.classList.remove('td-hidden');
    towerBarEl.classList.add('td-hidden');
    gameoverOverlay.classList.add('td-hidden');
    var heroAbilBar = document.getElementById('td-hero-abilities');
    if (heroAbilBar) heroAbilBar.classList.add('td-hidden');
    investedSB = 0;
    selectedTower = 'arrow';
    hero = null;
    heroPlacing = false;
    heroMoving = false;

    // Check for saved run
    var save = loadSave();
    var hasSave = save && save.wave > 0;
    var resumeBtn = document.getElementById('td-resume-btn');
    if (hasSave) {
      // Auto-select saved map + difficulty
      currentMapId = save.mapId || 'map1';
      currentDifficulty = save.difficulty || 'normal';
      if (resumeBtn) {
        resumeBtn.classList.remove('td-hidden');
        var saveMap = MAPS[save.mapId || 'map1'];
        resumeBtn.textContent = 'Resume (Wave ' + save.wave + ' \u2014 ' + saveMap.name + ')';
      }
      if (playBtn) playBtn.textContent = 'New Game';
    } else {
      if (resumeBtn) resumeBtn.classList.add('td-hidden');
      if (playBtn) playBtn.textContent = 'Start Game';
    }

    computePath();
    renderMapSelector(hasSave);
    renderDifficultySelector(hasSave);
    renderRecordDisplay();
    renderStatsBlock(startStats);
    renderStartBreakdown();
    renderInvestSection();
    renderTowerBar();
    refreshAllPanels();
    renderHeroInfo();
    drawIdle();
    // Re-check scroll fade after content is populated
    setTimeout(function () {
      var panels = document.querySelectorAll('.td-tab-panel');
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (p.scrollHeight <= p.clientHeight) {
          p.classList.add('td-scrolled-bottom');
        } else {
          p.classList.remove('td-scrolled-bottom');
        }
      }
    }, 50);
  }

  function renderHeroInfo() {
    var el = document.getElementById('td-hero-info');
    if (!el) return;
    getHeroPetInfo();
    loadHeroGearStats();
    if (!heroPetType || !HERO_DEFS[heroPetType]) {
      el.classList.add('td-hidden');
      return;
    }
    var def = HERO_DEFS[heroPetType];
    var petName = heroPetType.charAt(0).toUpperCase() + heroPetType.slice(1);
    var color = HERO_ACCENT_COLORS[heroPetType];
    var evo = getHeroEvolutionScale();

    // Effective DMG includes gear ATK bonus
    var effectiveDmg = Math.round((def.dmg + heroGearStats.atk * GEAR_ATK_SCALE) * evo.dmg);
    var criPct = Math.round(heroGearStats.cri * GEAR_CRI_SCALE * 100);

    var html = '<div class="td-hero-info-header" style="color:' + color + '">';
    html += petName + ' Hero';
    if (heroPetLevel > 1) html += ' <span style="opacity:0.7">Lv' + heroPetLevel + '</span>';
    html += '</div>';
    html += '<div class="td-hero-info-stats">';
    html += '<span>DMG ' + effectiveDmg + '</span>';
    html += '<span>SPD ' + (def.speed * evo.cd).toFixed(1) + 's</span>';
    html += '<span>RNG ' + def.range.toFixed(1) + '</span>';
    if (criPct > 0) html += '<span>CRI ' + criPct + '%</span>';
    html += '</div>';
    html += '<div class="td-hero-info-abilities">';
    html += '<span style="color:' + color + '">Q: ' + def.q.name + '</span> ' + def.q.desc;
    html += '<br><span style="color:' + color + '">W: ' + def.w.name + '</span> ' + def.w.desc;
    html += '</div>';

    // Gear bonus row
    var hasGear = heroGearStats.atk > 0 || heroGearStats.spd > 0 || heroGearStats.cri > 0 || heroGearStats.def > 0;
    if (hasGear) {
      var gearParts = [];
      if (heroGearStats.atk > 0) gearParts.push('+' + (heroGearStats.atk * GEAR_ATK_SCALE).toFixed(1) + ' base DMG');
      if (heroGearStats.spd > 0) gearParts.push('+' + Math.round(heroGearStats.spd * GEAR_SPD_SCALE * 100) + '% ATK speed');
      if (heroGearStats.cri > 0) gearParts.push(criPct + '% crit');
      if (heroGearStats.def > 0) gearParts.push('-' + Math.round(Math.min(heroGearStats.def * GEAR_DEF_CD_SCALE, 0.15) * 100) + '% ability CD');
      html += '<div class="td-hero-info-gear" style="color:#ffd700;font-size:10px">';
      html += '\u2694 Gear: ' + gearParts.join(', ');
      html += '</div>';
    }

    el.innerHTML = html;
    el.classList.remove('td-hidden');
    el.style.borderColor = color;
  }

  // ── Map selector ─────────────────────────────────
  function renderMapSelector(locked) {
    var el = document.getElementById('td-map-select');
    if (!el) return;
    el.innerHTML = '';

    var mapKeys = Object.keys(MAPS);
    for (var i = 0; i < mapKeys.length; i++) {
      var key = mapKeys[i];
      var map = MAPS[key];
      var btn = document.createElement('button');
      btn.className = 'td-select-btn';
      if (key === currentMapId) btn.className += ' td-select-btn-active';
      if (locked) btn.className += ' td-select-btn-locked';
      btn.textContent = map.name;
      btn.title = map.desc;
      if (locked) btn.disabled = true;

      btn.addEventListener('click', (function (k) {
        return function () {
          currentMapId = k;
          computePath();
          renderMapSelector(false);
          renderRecordDisplay();
          renderStartBreakdown();
          drawIdle();
        };
      })(key));

      el.appendChild(btn);
    }
  }

  // ── Difficulty selector ──────────────────────────
  function renderDifficultySelector(locked) {
    var el = document.getElementById('td-difficulty-select');
    if (!el) return;
    el.innerHTML = '';

    var diffKeys = Object.keys(DIFFICULTIES);
    for (var i = 0; i < diffKeys.length; i++) {
      var key = diffKeys[i];
      var diff = DIFFICULTIES[key];
      var btn = document.createElement('button');
      btn.className = 'td-select-btn';
      if (key === currentDifficulty) btn.className += ' td-select-btn-active';
      if (locked) btn.className += ' td-select-btn-locked';
      btn.textContent = diff.label;
      if (locked) btn.disabled = true;

      btn.addEventListener('click', (function (k) {
        return function () {
          currentDifficulty = k;
          renderDifficultySelector(false);
          renderRecordDisplay();
          renderStartBreakdown();
        };
      })(key));

      el.appendChild(btn);
    }
  }

  // ── Record display ───────────────────────────────
  function renderRecordDisplay() {
    var el = document.getElementById('td-record-display');
    if (!el) return;

    var recordKey = currentMapId + '-' + currentDifficulty;
    var best = (stats.records && stats.records[recordKey]) || 0;
    if (best > 0) {
      el.textContent = 'Your Record: Wave ' + best;
    } else {
      el.textContent = 'Your Record: \u2014';
    }
  }

  // ── Tab system ────────────────────────────────────
  function initTabs() {
    var tabs = document.querySelectorAll('.td-tab');
    var panels = {
      overview: document.getElementById('td-tab-overview'),
      armory: document.getElementById('td-tab-armory'),
      crate: document.getElementById('td-tab-crate'),
      synergies: document.getElementById('td-tab-synergies'),
      blueprints: document.getElementById('td-tab-blueprints'),
      gear: document.getElementById('td-tab-gear')
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

    // Scroll fade: remove bottom fade when scrolled to end, add when not
    var pKeys = Object.keys(panels);
    for (var p = 0; p < pKeys.length; p++) {
      (function (panel) {
        if (!panel) return;
        function checkScroll() {
          if (panel.scrollHeight <= panel.clientHeight) {
            panel.classList.add('td-scrolled-bottom');
          } else if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4) {
            panel.classList.add('td-scrolled-bottom');
          } else {
            panel.classList.remove('td-scrolled-bottom');
          }
        }
        panel.addEventListener('scroll', checkScroll);
        // Initial check after a tick (content may not be rendered yet)
        setTimeout(checkScroll, 100);
      })(panels[pKeys[p]]);
    }

    // Tab bar horizontal scroll fade
    var tabBar = document.querySelector('.td-tab-bar');
    if (tabBar) {
      function checkTabBarScroll() {
        if (tabBar.scrollWidth <= tabBar.clientWidth) {
          tabBar.classList.add('td-scrolled-end');
        } else if (tabBar.scrollLeft + tabBar.clientWidth >= tabBar.scrollWidth - 4) {
          tabBar.classList.add('td-scrolled-end');
        } else {
          tabBar.classList.remove('td-scrolled-end');
        }
      }
      tabBar.addEventListener('scroll', checkTabBarScroll);
      setTimeout(checkTabBarScroll, 100);
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
      html += 'Cost: ' + def.cost + ' SB';
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

  // ── Synergies panel ─────────────────────────────
  function renderSynergiesPanel() {
    var panel = document.getElementById('td-tab-synergies');
    if (!panel) return;

    var html = '<p style="opacity:0.6;font-size:12px;margin:0 0 8px">Place towers adjacent (including diagonal) to activate bonuses. Stacks with diminishing returns.</p>';
    html += '<div class="td-synergy-grid">';

    for (var i = 0; i < SYNERGY_DEFS.length; i++) {
      var s = SYNERGY_DEFS[i];
      var t1 = TOWER_DEFS[s.towers[0]];
      var t2 = TOWER_DEFS[s.towers[1]];
      var pairLabel = s.towers[0] === s.towers[1]
        ? t1.name + ' + ' + t1.name
        : t1.name + ' + ' + t2.name;

      html += '<div class="td-synergy-card">';
      html += '<div class="td-synergy-card-name" style="color:' + s.color + '">' + s.name + '</div>';
      html += '<div class="td-synergy-card-pair">' + pairLabel + '</div>';
      html += '<div class="td-synergy-card-desc">' + s.desc + '</div>';
      html += '</div>';
    }

    html += '</div>';
    panel.innerHTML = html;
  }

  // ── Gear panel (read-only) ────────────────────────
  function renderGearPanel() {
    var panel = document.getElementById('td-tab-gear');
    if (!panel) return;

    getHeroPetInfo();
    loadHeroGearStats();

    if (!heroPetId) {
      panel.innerHTML = '<p class="td-panel-empty">No creature selected</p>';
      return;
    }

    // Resolve legacy ID for catalog/equip lookups (e.g. robot → golem)
    var gearCat = heroPetCatalog || window.PetCatalog || null;
    if (!gearCat) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/data/petcatalog.json', false);
        xhr.send();
        if (xhr.status === 200) gearCat = JSON.parse(xhr.responseText);
      } catch (e) {}
    }
    var gearCatId = heroPetId;
    if (gearCat && gearCat.legacyMap && gearCat.legacyMap[heroPetId]) {
      gearCatId = gearCat.legacyMap[heroPetId];
    }
    // Hardcoded fallback for legacy ID mapping if catalog unavailable
    if (!gearCat && heroPetId === 'robot') {
      gearCatId = 'golem';
    }

    // Resolve display name from catalog, fall back to capitalized ID
    var petDisplayName = heroPetId.charAt(0).toUpperCase() + heroPetId.slice(1);
    if (gearCat && gearCat.creatures && gearCat.creatures[gearCatId]) {
      petDisplayName = gearCat.creatures[gearCatId].name || petDisplayName;
    }

    var RARITY_COLORS = { common: '#888', uncommon: '#4caf50', rare: '#ffd54f', epic: '#ab47bc', legendary: '#ff6b35' };
    var SLOT_NAMES = ['weapon', 'armor', 'accessory'];
    var equipped = {};
    var inventory = [];
    try {
      var eqRaw = localStorage.getItem('arebooksgood-dungeon-equip');
      var invRaw = localStorage.getItem('arebooksgood-dungeon-inventory');
      if (eqRaw) {
        var fullEquipMap = JSON.parse(eqRaw);
        equipped = fullEquipMap[heroPetId] || fullEquipMap[gearCatId] || {};
      }
      if (invRaw) inventory = JSON.parse(invRaw);
    } catch (e) {}

    var html = '<div class="td-gear-pet-name">' + petDisplayName + '</div>';
    html += '<div class="td-gear-grid">';
    for (var s = 0; s < SLOT_NAMES.length; s++) {
      var slot = SLOT_NAMES[s];
      var gearId = equipped[slot];
      var gear = null;
      if (gearId != null) {
        for (var i = 0; i < inventory.length; i++) {
          if (inventory[i].id === gearId) { gear = inventory[i]; break; }
        }
      }

      if (!gear) {
        html += '<div class="td-gear-card td-gear-card-empty">';
        html += '<div class="td-gear-slot-label">' + slot + '</div>';
        html += '<div style="opacity:0.4">Empty</div>';
        html += '</div>';
        continue;
      }

      var rarity = gear.rarity || 'common';
      var rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
      html += '<div class="td-gear-card" style="border-color:' + rarityColor + '">';
      html += '<div class="td-gear-slot-label">' + slot + '</div>';
      html += '<div class="td-gear-name" style="color:' + rarityColor + '">' + (gear.name || rarity + ' ' + slot);
      if (gear.upgradeLevel > 0) html += ' <span style="color:#ffd700;font-size:9px">+' + gear.upgradeLevel + '</span>';
      html += '</div>';
      html += '<div class="td-gear-stats">';
      if (gear.mainStat) html += gear.mainStat.toUpperCase() + ' +' + ((gear.mainValue || 0) + (gear.upgradeLevel || 0)) + '<br>';
      if (gear.secondaryStat) {
        var secPerLvl = { hp: 3, cri: 1 };
        var secBonus = (secPerLvl[gear.secondaryStat] || 0) * (gear.upgradeLevel || 0);
        html += gear.secondaryStat.toUpperCase() + ' +' + ((gear.secondaryValue || 0) + secBonus) + '<br>';
      }
      if (gear.subStats) {
        for (var j = 0; j < gear.subStats.length; j++) {
          html += gear.subStats[j].stat.toUpperCase() + ' +' + gear.subStats[j].value + '<br>';
        }
      }
      html += '</div></div>';
    }
    html += '</div>';

    // Auto-gear button
    if (inventory.length > 0) {
      html += '<div style="margin-bottom:6px"><button class="td-gear-auto-btn" id="td-auto-gear-btn">Auto-Gear</button></div>';
    }

    // TD effects summary
    var criPct = Math.round(heroGearStats.cri * GEAR_CRI_SCALE * 100);
    var hasGear = heroGearStats.atk > 0 || heroGearStats.spd > 0 || heroGearStats.cri > 0 || heroGearStats.def > 0;
    if (hasGear) {
      var parts = [];
      if (heroGearStats.atk > 0) parts.push('\u2694 +' + (heroGearStats.atk * GEAR_ATK_SCALE).toFixed(1) + ' base DMG');
      if (heroGearStats.spd > 0) parts.push('+' + Math.round(heroGearStats.spd * GEAR_SPD_SCALE * 100) + '% ATK speed');
      if (heroGearStats.cri > 0) parts.push(criPct + '% crit chance');
      if (heroGearStats.def > 0) parts.push('-' + Math.round(Math.min(heroGearStats.def * GEAR_DEF_CD_SCALE, 0.15) * 100) + '% ability CD');
      html += '<div class="td-gear-effects">TD Effects: ' + parts.join(', ') + '</div>';
    }

    html += '<div class="td-gear-link"><a href="/battle/">Earn gear in Dungeons \u2192</a></div>';
    panel.innerHTML = html;

    // Wire auto-gear button
    var autoBtn = document.getElementById('td-auto-gear-btn');
    if (autoBtn) {
      autoBtn.addEventListener('click', function () {
        tdAutoGear();
      });
    }
  }

  function tdAutoGear() {
    getHeroPetInfo();
    if (!heroPetId) return;
    var TIER_REQ = { '1': 1, '2': 2, '3': 3 };
    var slots = ['weapon', 'armor', 'accessory'];

    // Resolve effective level (legendary creatures = 3)
    var creatureTier = 'common';
    var cat = heroPetCatalog || window.PetCatalog || null;
    if (!cat) {
      // Sync fallback — catalog should be cached by now
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/data/petcatalog.json', false);
        xhr.send();
        if (xhr.status === 200) cat = JSON.parse(xhr.responseText);
      } catch (e) {}
    }
    var catalogId = heroPetId;
    if (cat && cat.legacyMap && cat.legacyMap[heroPetId]) {
      catalogId = cat.legacyMap[heroPetId];
    }
    if (cat && cat.creatures && cat.creatures[catalogId]) {
      creatureTier = cat.creatures[catalogId].tier || 'common';
    }
    // Hardcoded fallback for original pets if catalog unavailable
    if (creatureTier === 'common' && !cat) {
      var knownTiers = { dragon: 'legendary', cat: 'common', golem: 'rare', robot: 'rare' };
      creatureTier = knownTiers[heroPetId] || knownTiers[catalogId] || 'common';
    }
    var effLevel = creatureTier === 'legendary' ? 3 : (heroPetLevel || 1);

    // Read inventory + equip map
    var inventory = [];
    var equipMap = {};
    try {
      var invRaw = localStorage.getItem('arebooksgood-dungeon-inventory');
      var eqRaw = localStorage.getItem('arebooksgood-dungeon-equip');
      if (invRaw) inventory = JSON.parse(invRaw);
      if (eqRaw) equipMap = JSON.parse(eqRaw);
    } catch (e) { return; }
    if (!inventory.length) return;

    if (!equipMap[heroPetId]) equipMap[heroPetId] = {};
    var eq = equipMap[heroPetId];

    for (var s = 0; s < slots.length; s++) {
      var slotKey = slots[s];
      var bestGear = null;
      var bestVal = -1;

      for (var i = 0; i < inventory.length; i++) {
        var g = inventory[i];
        if (g.slot !== slotKey) continue;
        // Check tier level requirement
        var reqLevel = TIER_REQ[g.tier] || 1;
        if (effLevel < reqLevel) continue;
        var val = (g.mainValue || 0) + (g.upgradeLevel || 0);
        if (val > bestVal) {
          bestVal = val;
          bestGear = g;
        }
      }

      // Unequip current item in this slot
      var oldId = eq[slotKey];
      if (oldId != null) {
        for (var j = 0; j < inventory.length; j++) {
          if (inventory[j].id === oldId) { inventory[j].equippedBy = null; break; }
        }
        eq[slotKey] = null;
      }

      // Equip best — unequip from previous owner if needed
      if (bestGear) {
        if (bestGear.equippedBy && bestGear.equippedBy !== heroPetId) {
          var prevEq = equipMap[bestGear.equippedBy];
          if (prevEq) {
            for (var ps = 0; ps < slots.length; ps++) {
              if (prevEq[slots[ps]] === bestGear.id) { prevEq[slots[ps]] = null; break; }
            }
          }
        }
        eq[slotKey] = bestGear.id;
        bestGear.equippedBy = heroPetId;
      }
    }

    // Save back
    try {
      localStorage.setItem('arebooksgood-dungeon-equip', JSON.stringify(equipMap));
      localStorage.setItem('arebooksgood-dungeon-inventory', JSON.stringify(inventory));
    } catch (e) {}

    // Re-render gear panel + hero info
    renderGearPanel();
    renderHeroInfo();
  }

  // ── Refresh all panels ────────────────────────────
  function refreshAllPanels() {
    renderArmoryPanel();
    renderCratePanel();
    renderBlueprintsPanel();
    renderSynergiesPanel();
    renderGearPanel();
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
  loadHeroSprites();
  computePath();
  renderTowerBar();
  initTabs();
  refreshAllPanels();
  updateHUD();

  // Show start screen (handles save detection + resume button)
  showStartScreen();

  function drawIdle() {
    draw();
  }
})();
