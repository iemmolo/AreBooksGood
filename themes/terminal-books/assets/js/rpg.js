(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var META_KEY = 'rpg-meta';
  var SLOT_PREFIX = 'rpg-slot-';
  var SKILLS_SUFFIX = '-skills';
  var MAX_SLOTS = 3;

  var KINGDOM_NAME = 'JackTown';
  var SKILL_KEYS = ['mining', 'fishing', 'woodcutting', 'smithing', 'combat'];
  var LOCATIONS = [
    { id: 'town', name: 'Town Hub', desc: 'Home, shop, and tavern', skill: null },
    { id: 'mine', name: 'Mining Camp', desc: 'Mine ores and gems', skill: 'mining' },
    { id: 'dock', name: 'Fishing Dock', desc: 'Cast your line', skill: 'fishing' },
    { id: 'forest', name: 'Lumber Forest', desc: 'Chop trees for wood', skill: 'woodcutting' },
    { id: 'smithy', name: 'Smithy', desc: 'Smelt and forge', skill: 'smithing' },
    { id: 'arena', name: 'Training Arena', desc: 'Fight monsters', skill: 'combat' }
  ];

  // ── Location Icons (from items_sheet.png) ────
  var ITEMS_SHEET_PATH = '/images/skills/items_sheet.png';
  var LOCATION_ICONS = {
    town:   { x: 0, y: 288 },    // Quest
    mine:   { x: 80, y: 320 },   // Mine Cart
    dock:   { x: 32, y: 464 },   // Little Shark (#1047)
    forest: { x: 256, y: 432 },  // Log (#989)
    smithy: { x: 416, y: 320 },  // Smithy (#747)
    arena:  { x: 0, y: 0 }       // Sword (placeholder — rework later)
  };

  // ── Location Flavor Text ─────────────────────
  var LOCATION_FLAVOR = {
    town:   'The townsfolk of ' + KINGDOM_NAME + ' go about their business. A merchant beckons from his stall.',
    mine:   'The clang of pickaxes echoes through the cavern. Ore veins glisten in the torchlight.',
    dock:   'Gulls cry overhead. The salt air carries the promise of a good catch.',
    forest: 'Sunlight filters through the canopy. Ancient oaks creak in the breeze.',
    smithy: 'Heat rolls from the forge in waves. The anvil stands ready.',
    arena:  'The roar of the crowd fills the air. Blades clash in the distance.'
  };

  // ── Pet Data ─────────────────────────────────
  var PET_KEY = 'arebooksgood-pet';
  var petSpriteData = null;
  var petCatalog = null;

  // ── RPG Pet System (per-slot, isolated from main site pets) ──
  var RPG_EXCLUDED_PETS = ['cat', 'dragon', 'golem'];
  var RPG_PET_DEFAULT_SKIN = 'alt';
  var RPG_PET_BASE_STATS = {
    common:    { hp: 80,  atk: 12, def: 8,  spd: 10, cri: 5 },
    rare:      { hp: 100, atk: 15, def: 10, spd: 12, cri: 7 },
    legendary: { hp: 130, atk: 20, def: 14, spd: 15, cri: 10 }
  };
  var RPG_TYPE_LEANINGS = {
    fire:   'atk', aqua:  'def', nature: 'hp',
    tech:   'spd', shadow:'cri', mystic: null
  };
  var RPG_STATION_SKILL_MAP = {
    mine: 'mining', dock: 'fishing', forest: 'woodcutting',
    smithy: 'smithing', arena: 'combat'
  };
  var RPG_SKILL_TYPE_BONUS = {
    fire: 'smithing', aqua: 'fishing', nature: 'woodcutting',
    tech: 'mining', shadow: 'combat', mystic: null
  };

  // Follower state
  var followerSpriteSheet = null;
  var followerFrameIdx = 0;
  var followerPos = { x: 0, y: 0 };
  var followerDir = 'down';
  var followerPetId = null;
  var FOLLOWER_SIZE = 32;
  var FOLLOWER_TRAIL = 30;

  // Stationed sprite cache: locationId → { img, frameIdx }
  var stationedSpriteSheets = {};

  // ── Stationed pet speech bubble (canvas-rendered) ──
  var petSpeechBubble = { text: '', locationId: null, startTime: 0, duration: 0 };

  var PET_COLLECT_SPEECH = {
    fire: {
      happy: ['love it here!', '*warms the cave*', 'so cozy by the fire~', 'toasty!', 'more work? bring it!'],
      missing: ['getting lonely here...', 'you coming back soon?', 'miss our adventures', 'save me some coins?'],
      begging: ['PLEASE take me with you!!', '*dramatically collapses*', 'i\'m WITHERING', 'my flames are dimming...', '*sets fire to the sign-out sheet*', 'you forgot about me didn\'t you']
    },
    aqua: {
      happy: ['making waves!', '*splashes happily*', 'the water is perfect~', 'so peaceful here', 'swimming in XP!'],
      missing: ['the tide is pulling me to you...', 'send help? or snacks?', 'miss the surface world', 'come visit?'],
      begging: ['I\'M DRYING OUT HERE', '*flops dramatically*', 'mayday!! mayday!!', 'i need emotional support', 'please... the fish don\'t talk back', 'FREEDOM']
    },
    nature: {
      happy: ['*purrs contentedly*', 'nice and green here~', 'found a sunny spot!', 'growing stronger!', 'this is purrfect'],
      missing: ['*sad leaf falls*', 'the trees miss you too...', 'it\'s too quiet here', 'when are you visiting?'],
      begging: ['i\'ve been talking to a rock', 'PLEASE i\'m going feral', 'i named all the trees. ALL of them', 'the moss is my only friend now', 'take. me. WITH YOU.']
    },
    tech: {
      happy: ['systems optimal!', 'efficiency: 100%', 'processing... happy.exe', 'BEEP BOOP (that means content)'],
      missing: ['running lonely.exe...', 'social battery: 12%', 'missing companion... you', 'idle cycles increasing'],
      begging: ['ERROR: ABANDONMENT DETECTED', 'initiating PLEASE protocol', 'loneliness.overflow()', 'BOOP... beep? ...anyone?', 'TAKE ME WITH YOU OR I REBOOT']
    },
    shadow: {
      happy: ['*lurks happily*', 'the shadows are nice here', 'darkness is comforting~', 'thriving in the dark'],
      missing: ['even shadows get lonely...', 'the void echoes your name', 'come back to the shadows?'],
      begging: ['THE VOID IS TOO VOID', 'i\'ve been monologuing to bats', 'PLEASE the shadows are judging me', 'even my shadow left me', 'i promise to be less spooky']
    },
    mystic: {
      happy: ['*sparkles contentedly*', 'the stars are beautiful here~', 'cosmic vibes!', 'enchanted~'],
      missing: ['the stars spell your name...', 'my aura needs company', 'the cosmos feels empty', 'stargazing alone...'],
      begging: ['I FORESEE YOU TAKING ME WITH YOU', '*levitates aggressively*', 'the prophecy says LET ME OUT', 'the stars aligned to spell HELP', 'astral projecting to follow you anyway']
    }
  };

  function getCollectSpeech(petId, locationId) {
    var creature = petCatalog.creatures[petId];
    if (!creature) return 'thanks!';
    var type = creature.type;
    var lines = PET_COLLECT_SPEECH[type];
    if (!lines) return 'missed you!';

    // Use collectCount from rpgPets station
    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[locationId];
    var count = (station && station.collectCount) || 0;

    var mood;
    if (count <= 2) mood = 'happy';
    else if (count <= 5) mood = 'missing';
    else mood = 'begging';

    var pool = lines[mood];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showPetSpeechBubble(locationId, text) {
    petSpeechBubble.text = text;
    petSpeechBubble.locationId = locationId;
    petSpeechBubble.startTime = Date.now();
    petSpeechBubble.duration = 2500 + text.length * 40;
  }

  function drawPetSpeechBubble(ctx) {
    if (!petSpeechBubble.text || !petSpeechBubble.locationId) return;
    var elapsed = Date.now() - petSpeechBubble.startTime;
    if (elapsed > petSpeechBubble.duration) {
      petSpeechBubble.text = '';
      return;
    }

    var mapLoc = MAP_LOCATIONS[petSpeechBubble.locationId];
    if (!mapLoc) return;

    // Typewriter effect
    var charsVisible = Math.min(Math.floor(elapsed / 35), petSpeechBubble.text.length);
    var visibleText = petSpeechBubble.text.substring(0, charsVisible);
    if (!visibleText) return;

    // Fade out in last 400ms
    var fadeStart = petSpeechBubble.duration - 400;
    var alpha = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 400 : 1;

    var px = mapLoc.x + 28;
    var py = mapLoc.y + 22 - 24; // above the pet sprite

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    var tw = ctx.measureText(visibleText).width;
    var bw = tw + 10, bh = 14;
    var bx = px - bw / 2, by = py - bh / 2;

    // Bubble background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Tail
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.moveTo(px - 3, by + bh);
    ctx.lineTo(px, by + bh + 4);
    ctx.lineTo(px + 3, by + bh);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.fillText(visibleText, px, py + 2);
    ctx.restore();
  }

  function getRpgCreatures() {
    if (!petCatalog || !petCatalog.creatures) return [];
    var result = [];
    for (var id in petCatalog.creatures) {
      if (!petCatalog.creatures.hasOwnProperty(id)) continue;
      if (RPG_EXCLUDED_PETS.indexOf(id) !== -1) continue;
      result.push(id);
    }
    return result;
  }

  function getRpgCreaturesByTier(tier) {
    var all = getRpgCreatures();
    var result = [];
    for (var i = 0; i < all.length; i++) {
      if (petCatalog.creatures[all[i]].tier === tier) result.push(all[i]);
    }
    return result;
  }

  // ── Per-Slot Wallet ──────────────────────────
  var RPG_WALLET_STARTING_COINS = 500;
  var originalWallet = null; // stash the global Wallet during RPG sessions

  function getDefaultRpgWallet() {
    return { coins: RPG_WALLET_STARTING_COINS, totalEarned: 0, totalSpent: 0 };
  }

  function getRpgWallet() {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return getDefaultRpgWallet();
    var s = meta.slots[activeSlot];
    if (!s.wallet) s.wallet = getDefaultRpgWallet();
    return s.wallet;
  }

  function saveRpgWallet() {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return;
    saveMeta();
  }

  function installRpgWallet() {
    originalWallet = window.Wallet;
    var w = getRpgWallet();
    window.Wallet = {
      getBalance: function () { return getRpgWallet().coins; },
      add: function (n) {
        if (n <= 0) return 0;
        var w = getRpgWallet();
        w.coins += n;
        w.totalEarned += n;
        saveRpgWallet();
        return n;
      },
      deduct: function (n) {
        if (n <= 0) return 0;
        var w = getRpgWallet();
        var actual = Math.min(n, w.coins);
        w.coins -= actual;
        w.totalSpent += actual;
        saveRpgWallet();
        return actual;
      },
      isBroke: function () { return getRpgWallet().coins <= 0; },
      onChange: function () {},
      beg: function () { return null; },
      getStats: function () {
        var w = getRpgWallet();
        return { coins: w.coins, totalEarned: w.totalEarned, totalSpent: w.totalSpent };
      }
    };
  }

  function uninstallRpgWallet() {
    if (originalWallet) {
      window.Wallet = originalWallet;
      originalWallet = null;
    }
  }

  // ── Per-Slot Pets ──────────────────────────────
  function getDefaultRpgPets() {
    return {
      follower: null,
      stations: {},
      owned: {},
      pity: { overall: 0 },
      totalHatched: 0
    };
  }

  function getRpgPetState() {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return getDefaultRpgPets();
    var s = meta.slots[activeSlot];
    if (!s.rpgPets) s.rpgPets = getDefaultRpgPets();
    return s.rpgPets;
  }

  function saveRpgPetState(rpgPets) {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return;
    meta.slots[activeSlot].rpgPets = rpgPets;
    saveMeta();
  }

  // Evolution tiers (must match rpg-combat.js EVOLUTION_TIERS)
  var PET_EVO_TIERS = {
    common:    [30, 50],
    rare:      [25, 50, 75],
    legendary: [50, 75]
  };

  function migratePetLevelCaps(rpgPets) {
    if (!petCatalog || !rpgPets || !rpgPets.owned) return;
    var dirty = false;
    var ids = Object.keys(rpgPets.owned);
    for (var i = 0; i < ids.length; i++) {
      var pet = rpgPets.owned[ids[i]];
      if (!pet || pet.levelCap) continue; // already has explicit cap, skip
      var catalog = petCatalog.creatures[ids[i]];
      if (!catalog) continue;
      var tiers = PET_EVO_TIERS[catalog.tier] || PET_EVO_TIERS.common;
      var startCap = tiers[0];
      if (pet.level > startCap) {
        // Pet leveled past starting cap — find smallest cap >= current level
        pet.levelCap = tiers[tiers.length - 1]; // fallback to max
        for (var t = 0; t < tiers.length; t++) {
          if (pet.level <= tiers[t]) {
            pet.levelCap = tiers[t];
            break;
          }
        }
        dirty = true;
      }
    }
    if (dirty) saveRpgPetState(rpgPets);
  }

  function getPetStatus(petId) {
    var rp = getRpgPetState();
    if (rp.follower === petId) return 'following';
    for (var loc in rp.stations) {
      if (rp.stations[loc] && rp.stations[loc].petId === petId) return 'stationed:' + loc;
    }
    return 'unassigned';
  }

  function getRpgPetStats(petId, level) {
    if (!petCatalog || !petCatalog.creatures[petId]) return { hp: 0, atk: 0, def: 0, spd: 0, cri: 0 };
    var c = petCatalog.creatures[petId];
    var base = RPG_PET_BASE_STATS[c.tier] || RPG_PET_BASE_STATS.common;
    var leaning = RPG_TYPE_LEANINGS[c.type];
    var stats = {};
    var keys = ['hp', 'atk', 'def', 'spd', 'cri'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = base[k] * (1 + (level - 1) * 0.08);
      if (leaning === k) val *= 1.15;
      stats[k] = Math.floor(val);
    }
    return stats;
  }

  function rpgPetXpForLevel(lvl) {
    return Math.floor(50 * Math.pow(1.08, lvl - 1));
  }

  /**
   * Build a pet sprite element with correct scaling at any display size.
   * Does NOT use PetSprites.renderPreview (which breaks when resized).
   * @param {string} petId - creature key from petcatalog
   * @param {number} level - pet level (determines frame)
   * @param {number} [displaySize=48] - rendered CSS pixel size
   * @returns {HTMLElement|null}
   */
  function renderRpgPetSprite(petId, level, displaySize) {
    if (!petSpriteData || !petCatalog || !petCatalog.creatures[petId]) return null;
    var spriteId = petCatalog.creatures[petId].spriteId;
    var info = petSpriteData[spriteId];
    if (!info) return null;

    var ds = displaySize || 48;
    var fw = info.frameWidth || 48;
    var fh = info.frameHeight || 48;
    var frames = info.frames || 3;
    var sheetUrl = info.altSheet || info.sheet;
    var frameOffset = info.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + (level || 1) - 1, frames - 1);

    // Scale factor: ds / fw (e.g. 64/48 = 1.333)
    var scale = ds / fw;
    var bgW = Math.round(fw * frames * scale);
    var bgH = Math.round(fh * scale);
    var bgX = Math.round(frameIdx * fw * scale);

    var el = document.createElement('div');
    el.style.width = ds + 'px';
    el.style.height = ds + 'px';
    el.style.backgroundImage = 'url(' + sheetUrl + ')';
    el.style.backgroundSize = bgW + 'px ' + bgH + 'px';
    el.style.backgroundPosition = '-' + bgX + 'px 0';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.imageRendering = 'pixelated';
    return el;
  }

  // ── Map Constants ────────────────────────────
  var MAP_W = 1060, MAP_H = 660;
  var MAP_LOCATIONS = {
    town:   { x: 530, y: 98,  name: 'Town Hub',        skill: null },
    mine:   { x: 166, y: 255, name: 'Mining Camp',      skill: 'mining' },
    dock:   { x: 894, y: 255, name: 'Fishing Dock',     skill: 'fishing' },
    forest: { x: 166, y: 450, name: 'Lumber Forest',    skill: 'woodcutting' },
    smithy: { x: 894, y: 450, name: 'Smithy',           skill: 'smithing' },
    arena:  { x: 530, y: 555, name: 'Training Arena',   skill: 'combat' }
  };
  var MAP_LOC_ORDER = ['town', 'mine', 'dock', 'forest', 'smithy', 'arena'];
  var PATH_SEGMENTS = [
    ['town', 'mine'], ['town', 'dock'],
    ['town', 'forest'], ['town', 'smithy'],
    ['town', 'arena'],
    ['mine', 'forest'], ['dock', 'smithy'],
    ['forest', 'arena'], ['smithy', 'arena']
  ];
  var PLAYER_SPEED = 180; // px/sec (scaled for larger map)
  var HIT_RADIUS = 55;
  // ── Character Sprite System ──────────────────────
  var CHAR_SPRITE_FRAME = 32; // native frame size in px
  var CHAR_DRAW_SCALE = 1.5;  // render at 48x48
  var CHAR_DRAW_SIZE = CHAR_SPRITE_FRAME * CHAR_DRAW_SCALE;

  // Pre-made character options (sprite sheets in /images/rpg/characters/)
  var CHAR_APPEARANCE_IDS = ['alex', 'josh', 'lyria', 'manu', 'tori'];
  var CHAR_APPEARANCE_NAMES = { alex: 'Alex', josh: 'Josh', lyria: 'Lyria', manu: 'Manu', tori: 'Tori' };
  var CHAR_SPRITES = {}; // charId → { idle: Image, walk: Image }

  // Shared overlay layers (equipment visualization)
  var charClothesIdle = null, charClothesWalk = null;
  var charAccHelmIdle = null, charAccHelmWalk = null;
  // Tinted overlay caches (regenerated when equipment changes)
  var tintedClothes = { idle: null, walk: null };
  var tintedAccHelm = { idle: null, walk: null };
  var charTintsDirty = true;

  // Animation frame counts per direction for each animation type
  var CHAR_ANIM_DATA = {
    idle: { framesPerDir: 4, cols: 4 }, // 128px wide, 3 rows
    walk: { framesPerDir: 6, cols: 6 }  // 192px wide, 3 rows
  };

  // Pre-made sheets: 3 rows — row 0=down, row 1=up, row 2=right; left=flip right
  var DIR_ROW = { down: 0, up: 1, right: 2, left: 2 };
  var DIR_FLIP = { down: false, up: false, right: false, left: true };

  // Layer strips: single row, sequential groups of N frames
  // down=group0, up=group1, right=group2, left=group3
  var DIR_GROUP = { down: 0, up: 1, right: 2, left: 3 };

  // Equipment tier → HSL tint for clothing/accessory recoloring
  var TIER_TINTS = {
    copper:   { h: 25,  s: 0.55, l: 0.48 },
    bronze:   { h: 30,  s: 0.50, l: 0.50 },
    gold:     { h: 48,  s: 0.90, l: 0.55 },
    astral:   { h: 240, s: 0.35, l: 0.60 },
    silver:   { h: 0,   s: 0.00, l: 0.70 },
    emerald:  { h: 150, s: 0.55, l: 0.50 },
    mithril:  { h: 210, s: 0.40, l: 0.58 },
    amethyst: { h: 275, s: 0.45, l: 0.55 },
    cobalt:   { h: 220, s: 0.70, l: 0.40 },
    molten:   { h: 12,  s: 0.85, l: 0.50 },
    frost:    { h: 200, s: 0.60, l: 0.70 },
    obsidian: { h: 280, s: 0.50, l: 0.18 }
  };

  // Current character appearance (set from save slot)
  var currentCharId = 'alex';

  function getCharAppearance() {
    if (activeSlot >= 0 && meta && meta.slots[activeSlot] && meta.slots[activeSlot].appearance) {
      return meta.slots[activeSlot].appearance;
    }
    return 'alex';
  }

  // ── Sprite Loading ──────────────────────────────
  var charSpritesLoaded = false;

  function loadCharSprites(callback) {
    var basePath = '/images/rpg/characters/';
    var toLoad = 0, loaded = 0;
    function onLoad() {
      loaded++;
      if (loaded >= toLoad) { charSpritesLoaded = true; if (callback) callback(); }
    }
    function onError() { loaded++; if (loaded >= toLoad && callback) callback(); }

    // Load each pre-made character's idle + walk sheets
    for (var i = 0; i < CHAR_APPEARANCE_IDS.length; i++) {
      var cid = CHAR_APPEARANCE_IDS[i];
      CHAR_SPRITES[cid] = { idle: new Image(), walk: new Image() };
      toLoad += 2;
      CHAR_SPRITES[cid].idle.onload = onLoad; CHAR_SPRITES[cid].idle.onerror = onError;
      CHAR_SPRITES[cid].idle.src = basePath + cid + '-idle.png';
      CHAR_SPRITES[cid].walk.onload = onLoad; CHAR_SPRITES[cid].walk.onerror = onError;
      CHAR_SPRITES[cid].walk.src = basePath + cid + '-walk.png';
    }

    // Clothing overlay layers
    toLoad += 2;
    charClothesIdle = new Image(); charClothesIdle.onload = onLoad; charClothesIdle.onerror = onError;
    charClothesIdle.src = basePath + 'clothes-idle.png';
    charClothesWalk = new Image(); charClothesWalk.onload = onLoad; charClothesWalk.onerror = onError;
    charClothesWalk.src = basePath + 'clothes-walk.png';

    // Accessory/helm overlay layers
    toLoad += 2;
    charAccHelmIdle = new Image(); charAccHelmIdle.onload = onLoad; charAccHelmIdle.onerror = onError;
    charAccHelmIdle.src = basePath + 'acc-helm-idle.png';
    charAccHelmWalk = new Image(); charAccHelmWalk.onload = onLoad; charAccHelmWalk.onerror = onError;
    charAccHelmWalk.src = basePath + 'acc-helm-walk.png';
  }

  // ── HSL <-> RGB helpers ─────────────────────────
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s, l];
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }

  // Recolor a sprite sheet by shifting hue/saturation, preserving luminance
  function recolorSpriteSheet(img, targetH, targetS, targetL) {
    if (!img || !img.complete || !img.naturalWidth) return null;
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, c.width, c.height);
    var d = data.data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      hsl[0] = targetH;
      hsl[1] = targetS;
      // Preserve relative lightness but blend toward target
      hsl[2] = hsl[2] * 0.6 + targetL * 0.4;
      var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
    }
    ctx.putImageData(data, 0, 0);
    return c;
  }

  // Rebuild tinted overlays when equipment changes
  function updateCharTints() {
    if (!charTintsDirty) return;
    charTintsDirty = false;
    tintedClothes.idle = null; tintedClothes.walk = null;
    tintedAccHelm.idle = null; tintedAccHelm.walk = null;

    var equip = getEquipment();
    if (!equip) return;
    var api = window.__RPG_SKILLS_API;
    if (!api) return;

    // Chest armor → clothing tint
    if (equip.chest) {
      var chestData = api.getEquipmentData(equip.chest);
      if (chestData && TIER_TINTS[chestData.tier]) {
        var ct = TIER_TINTS[chestData.tier];
        tintedClothes.idle = recolorSpriteSheet(charClothesIdle, ct.h, ct.s, ct.l);
        tintedClothes.walk = recolorSpriteSheet(charClothesWalk, ct.h, ct.s, ct.l);
      }
    }

    // Helm → accessory tint
    if (equip.helm) {
      var helmData = api.getEquipmentData(equip.helm);
      if (helmData && TIER_TINTS[helmData.tier]) {
        var ht = TIER_TINTS[helmData.tier];
        tintedAccHelm.idle = recolorSpriteSheet(charAccHelmIdle, ht.h, ht.s, ht.l);
        tintedAccHelm.walk = recolorSpriteSheet(charAccHelmWalk, ht.h, ht.s, ht.l);
      }
    }
  }

  // ── Unified Character Drawing ───────────────────
  // Draws a character sprite with optional equipment overlays
  function drawCharSprite(ctx, x, y, dir, animFrame, animType, charId) {
    charId = charId || currentCharId;
    var sprites = CHAR_SPRITES[charId];
    if (!sprites) return;
    var anim = CHAR_ANIM_DATA[animType] || CHAR_ANIM_DATA.idle;
    var sheet = animType === 'walk' ? sprites.walk : sprites.idle;
    if (!sheet || !sheet.complete) return;

    var frame = animFrame % anim.framesPerDir;
    var flip = DIR_FLIP[dir];
    var row = DIR_ROW[dir];
    var sx = frame * CHAR_SPRITE_FRAME;
    var sy = row * CHAR_SPRITE_FRAME;

    var size = CHAR_DRAW_SIZE;
    var dx = Math.round(x) - size / 2;
    var dy = Math.round(y) - size + 10; // feet at y position

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y) + 2, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw base character (flip for left direction)
    if (flip) {
      ctx.save();
      ctx.translate(dx + size, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, sx, sy, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, 0, 0, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(sheet, sx, sy, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, dx, dy, size, size);
    }

    // Equipment overlays (layer strips use all 4 directions, no flip needed)
    updateCharTints();
    var clothesSrc = animType === 'walk' ? tintedClothes.walk : tintedClothes.idle;
    var accSrc = animType === 'walk' ? tintedAccHelm.walk : tintedAccHelm.idle;
    var dirGroup = DIR_GROUP[dir];
    var layerX = (dirGroup * anim.framesPerDir + frame) * CHAR_SPRITE_FRAME;

    if (clothesSrc) {
      ctx.drawImage(clothesSrc, layerX, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, dx, dy, size, size);
    }
    if (accSrc) {
      ctx.drawImage(accSrc, layerX, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, dx, dy, size, size);
    }
  }

  // Draw character preview (for equipment panel, etc.)
  function drawCharPreview(canvas, charId) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    charId = charId || currentCharId;
    var sprites = CHAR_SPRITES[charId];
    if (!sprites || !sprites.idle || !sprites.idle.complete) return;

    // Draw front-facing idle frame 0, centered in canvas
    var scale = Math.min(w, h) / CHAR_SPRITE_FRAME;
    var drawW = CHAR_SPRITE_FRAME * scale;
    var drawH = CHAR_SPRITE_FRAME * scale;
    var ox = (w - drawW) / 2;
    var oy = (h - drawH) / 2;
    ctx.drawImage(sprites.idle, 0, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, ox, oy, drawW, drawH);

    // Clothing overlay
    updateCharTints();
    if (tintedClothes.idle) {
      ctx.drawImage(tintedClothes.idle, 0, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, ox, oy, drawW, drawH);
    }
    if (tintedAccHelm.idle) {
      ctx.drawImage(tintedAccHelm.idle, 0, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, ox, oy, drawW, drawH);
    }
  }

  // ── Equipment System ───────────────────────────
  var EQUIP_SLOTS = ['weapon', 'helm', 'chest', 'legs', 'boots', 'gloves'];
  var EQUIP_SLOT_LABELS = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', legs: 'Legs', boots: 'Boots', gloves: 'Gloves' };

  function getEquipment() {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return null;
    var slot = meta.slots[activeSlot];
    if (!slot.equipment) {
      slot.equipment = { weapon: null, helm: null, chest: null, legs: null, boots: null, gloves: null };
    }
    return slot.equipment;
  }

  function setEquipment(equip) {
    if (activeSlot < 0 || !meta || !meta.slots[activeSlot]) return;
    meta.slots[activeSlot].equipment = equip;
    charTintsDirty = true;
    saveMeta();
  }

  function getEquipStats() {
    var totals = { atk: 0, def: 0 };
    var equip = getEquipment();
    if (!equip) return totals;
    var api = window.__RPG_SKILLS_API;
    if (!api) return totals;
    for (var s = 0; s < EQUIP_SLOTS.length; s++) {
      var itemName = equip[EQUIP_SLOTS[s]];
      if (!itemName) continue;
      var data = api.getEquipmentData(itemName);
      if (!data) continue;
      totals.atk += data.atk;
      totals.def += data.def;
    }
    return totals;
  }


  // Decoration positions — [x, y, type]
  // type: 0=flower, 1=rock, 2=bush, 3=tree, 4=mushroom, 5=stump, 6=signpost, 7=fence
  // NEW: 8=tall grass, 9=boulder, 10=fallen log, 11=wildflower patch, 12=lantern, 13=hay bale, 14=reed cluster, 15=lily pad
  var MAP_DECO = [
    // Flowers (scattered)
    [700,135,0],[455,375,0],[730,255,0],[940,600,0],
    [320,500,0],[800,120,0],[610,490,0],[380,210,0],
    [550,300,0],[660,420,0],[410,480,0],[770,380,0],
    [300,140,0],[850,530,0],[480,250,0],
    // Rocks (near mine, scattered)
    [230,220,1],[760,345,1],[950,520,1],[350,580,1],[640,130,1],
    [200,300,1],[290,270,1],[130,340,1],
    // Bushes (scattered, some along paths)
    [270,120,2],[800,135,2],[530,380,2],[250,510,2],[680,570,2],
    [430,80,2],[960,350,2],[400,300,2],[720,480,2],[560,140,2],
    // Trees (clustered near forest, some scattered)
    [200,500,3],[240,420,3],[320,580,3],[900,100,3],[700,580,3],[980,480,3],
    [220,530,3],[280,440,3],[340,510,3],
    // Mushrooms (near forest/damp areas)
    [190,460,4],[280,470,4],[350,540,4],[240,490,4],[300,550,4],
    // Stumps (near forest)
    [220,440,5],[300,490,5],[260,520,5],
    // Signposts (at path intersections)
    [430,180,6],[630,180,6],[350,340,6],[710,340,6],
    // Fences (near arena/town)
    [460,520,7],[600,520,7],[470,105,7],[590,105,7],
    [440,560,7],[620,560,7],
    // Tall grass (scattered in lush areas)
    [300,160,8],[580,280,8],[440,420,8],[660,350,8],[800,480,8],
    [380,550,8],[520,430,8],[750,150,8],[480,160,8],[680,510,8],
    [340,400,8],[560,580,8],[420,110,8],[700,100,8],[860,400,8],
    [920,160,8],[280,350,8],[500,500,8],[640,240,8],[780,560,8],
    // Boulder formations (near mine/corners)
    [140,210,9],[250,200,9],[200,280,9],[950,580,9],[920,120,9],[350,600,9],
    // Fallen logs (near forest)
    [180,540,10],[310,460,10],[260,560,10],[340,530,10],
    // Wildflower patches (in lush areas)
    [400,350,11],[550,420,11],[660,300,11],[480,520,11],[350,250,11],
    [720,440,11],[580,160,11],[850,350,11],[440,600,11],[300,430,11],
    // Lanterns (along paths)
    [460,160,12],[600,160,12],[350,300,12],[710,300,12],
    [350,480,12],[710,480,12],[480,540,12],[580,540,12],
    // Hay bales (near town)
    [470,140,13],[590,140,13],[450,70,13],[610,70,13],
    // Reed clusters (along river)
    [55,120,14],[85,240,14],[45,360,14],[75,450,14],[65,540,14],[95,180,14],
    // Extra flowers
    [240,160,0],[880,420,0],[520,110,0],[670,550,0],[360,320,0],[150,480,0],
    // Extra tall grass
    [250,280,8],[450,350,8],[710,200,8],[830,450,8],[380,600,8],[600,120,8],
    [170,400,8],[980,300,8],
    // Extra wildflower patches
    [200,370,11],[620,540,11],[760,160,11],[430,450,11],
    // Extra reeds (along river)
    [70,80,14],[55,300,14],[80,420,14],[60,500,14],[90,600,14],[50,200,14],
    // Extra hay bales
    [430,120,13],[620,120,13],
    // Puddles (near dock/river)
    [840,160,15],[870,340,15],[900,290,15],[110,350,15],[130,500,15],
    // Cart tracks (near town/smithy paths)
    [480,130,16],[560,130,16],[880,400,16],[860,480,16],
    // Fallen leaves (near forest)
    [180,470,17],[260,510,17],[310,480,17],[340,560,17],
    [220,560,17],[290,430,17],[350,490,17],[270,540,17],
    // Stone scatter (near mine/arena/paths)
    [200,240,18],[250,220,18],[180,300,18],[280,260,18],[160,250,18],
    [500,580,18],[540,560,18],[620,580,18],[460,600,18],[570,600,18],
    // Extra stones near arena/mine
    [520,540,18],[600,560,18],[480,570,18],[220,280,18],[170,220,18],
    // Extra puddles on paths + low areas
    [500,200,15],[650,300,15],[400,400,15],[560,450,15],[720,350,15],
    // Extra cart tracks on busy paths
    [520,160,16],[600,400,16],[440,300,16],[500,480,16],
    // Extra fallen leaves near forest
    [200,520,17],[330,500,17],[270,480,17],[250,550,17],
    // Extra wildflower patches (sparse midfield)
    [500,350,11],[700,300,11],[400,200,11],[650,150,11],
    // Extra bushes in empty midfield
    [450,250,2],[600,350,2],[350,400,2],
    // Extra rocks scattered
    [500,100,1],[700,500,1],[400,550,1]
  ];

  // ── Biome Zones & Palettes ─────────────────────
  var BIOME_ZONES = [
    { cx: 530, cy: 98,  r: 140, type: 'town' },
    { cx: 166, cy: 255, r: 130, type: 'mine' },
    { cx: 894, cy: 255, r: 130, type: 'dock' },
    { cx: 166, cy: 450, r: 130, type: 'forest' },
    { cx: 894, cy: 450, r: 130, type: 'smithy' },
    { cx: 530, cy: 555, r: 130, type: 'arena' }
  ];
  var BIOME_PALETTES = {
    grass:  { base: ['#3a7a32','#428a3a','#4a9442','#509e48'], detail: '#2d6628' },
    town:   { base: ['#4a8a40','#509044','#5a9a4c','#60a050'], detail: '#8a7a5a' },
    mine:   { base: ['#3a6a2a','#4a7a3a','#5a8a4a','#4a7540'], detail: '#6a6a6a' },
    dock:   { base: ['#5a9848','#60a050','#68a858','#70b060'], detail: '#c8b478' },
    forest: { base: ['#2a6a22','#327a2a','#3a8a32','#429438'], detail: '#1e5518' },
    smithy: { base: ['#3a6a28','#4a7a38','#5a8a48','#4a7538'], detail: '#5a4a30' },
    arena:  { base: ['#5a8a42','#608840','#6a8a48','#5a8040'], detail: '#8a7a4a' }
  };

  // River control points — winding from top to bottom on the left side
  var RIVER_POINTS = [
    { x: 80, y: -10 },
    { x: 100, y: 80 },
    { x: 60, y: 160 },
    { x: 90, y: 260 },
    { x: 50, y: 340 },
    { x: 80, y: 420 },
    { x: 60, y: 520 },
    { x: 90, y: 600 },
    { x: 70, y: 670 }
  ];

  // Precomputed biome index map (filled once)
  var biomeIndexMap = null;
  var biomeWeightMap = null;
  var BIOME_TILE = 8;

  function buildBiomeIndexMap() {
    var cols = Math.ceil(MAP_W / BIOME_TILE);
    var rows = Math.ceil(MAP_H / BIOME_TILE);
    biomeIndexMap = new Array(cols * rows);
    biomeWeightMap = new Float32Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var px = c * BIOME_TILE + 4;
        var py = r * BIOME_TILE + 4;
        var result = getBiomeTypeWeighted(px, py);
        biomeIndexMap[r * cols + c] = result.type;
        biomeWeightMap[r * cols + c] = result.weight;
      }
    }
  }

  function getBiomeTypeWeighted(x, y) {
    var bestType = 'grass';
    var bestWeight = 0;
    for (var i = 0; i < BIOME_ZONES.length; i++) {
      var z = BIOME_ZONES[i];
      var dx = x - z.cx, dy = y - z.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < z.r) {
        var w = 1 - dist / z.r;
        if (w > bestWeight) { bestWeight = w; bestType = z.type; }
      }
    }
    return { type: bestType, weight: bestWeight };
  }

  function getBiomeType(x, y) {
    var bestType = 'grass';
    var bestWeight = 0;
    for (var i = 0; i < BIOME_ZONES.length; i++) {
      var z = BIOME_ZONES[i];
      var dx = x - z.cx, dy = y - z.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < z.r) {
        var w = 1 - dist / z.r;
        if (w > bestWeight) { bestWeight = w; bestType = z.type; }
      }
    }
    return bestType;
  }

  // River path helper — interpolate catmull-rom through RIVER_POINTS
  function getRiverX(y) {
    var pts = RIVER_POINTS;
    // Find segment
    var i = 0;
    for (; i < pts.length - 1; i++) {
      if (y <= pts[i + 1].y) break;
    }
    if (i >= pts.length - 1) return pts[pts.length - 1].x;
    var t = (y - pts[i].y) / (pts[i + 1].y - pts[i].y);
    return pts[i].x + (pts[i + 1].x - pts[i].x) * t;
  }

  function isOnRiver(x, y, halfWidth) {
    var hw = halfWidth || 22;
    var rx = getRiverX(y);
    return Math.abs(x - rx) < hw;
  }

  // Forest border tree positions — generated once
  var forestBorderTrees = null;
  function generateForestBorder() {
    if (forestBorderTrees) return forestBorderTrees;
    forestBorderTrees = [];
    var spacing = 36;
    var margin = 20;
    var locAvoidRadius = 90;
    var riverAvoidX = 120;

    function tooCloseToLocation(tx, ty) {
      for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
        var loc = MAP_LOCATIONS[MAP_LOC_ORDER[i]];
        var dx = tx - loc.x, dy = ty - loc.y;
        if (Math.sqrt(dx * dx + dy * dy) < locAvoidRadius) return true;
      }
      return false;
    }
    function tooCloseToRiver(tx) { return tx < riverAvoidX; }

    // Top edge
    for (var tx = margin; tx < MAP_W - margin; tx += spacing + (tileHash(tx, 1) % 12)) {
      var ty = margin + (tileHash(tx, 2) % 16);
      if (!tooCloseToLocation(tx, ty) && !tooCloseToRiver(tx))
        forestBorderTrees.push({ x: tx, y: ty, variant: (tileHash(tx, 3) >>> 0) % 4 });
    }
    // Bottom edge
    for (var tx = margin; tx < MAP_W - margin; tx += spacing + (tileHash(tx, 11) % 12)) {
      var ty = MAP_H - margin - 30 + (tileHash(tx, 12) % 16);
      if (!tooCloseToLocation(tx, ty) && !tooCloseToRiver(tx))
        forestBorderTrees.push({ x: tx, y: ty, variant: (tileHash(tx, 13) >>> 0) % 4 });
    }
    // Left edge (below river)
    for (var ty = margin + 40; ty < MAP_H - margin - 30; ty += spacing + (tileHash(1, ty) % 12)) {
      var tx = riverAvoidX + 10 + (tileHash(2, ty) % 16);
      if (!tooCloseToLocation(tx, ty))
        forestBorderTrees.push({ x: tx, y: ty, variant: (tileHash(3, ty) >>> 0) % 4 });
    }
    // Right edge
    for (var ty = margin; ty < MAP_H - margin - 30; ty += spacing + (tileHash(21, ty) % 12)) {
      var tx = MAP_W - margin - 10 - (tileHash(22, ty) % 16);
      if (!tooCloseToLocation(tx, ty))
        forestBorderTrees.push({ x: tx, y: ty, variant: (tileHash(23, ty) >>> 0) % 4 });
    }

    // Sort by Y for depth ordering
    forestBorderTrees.sort(function (a, b) { return a.y - b.y; });
    return forestBorderTrees;
  }

  // Animated effects state
  var butterflies = [];
  var fireflies = [];
  function initAnimatedEffects() {
    butterflies = [];
    var bColors = ['#e84060','#4080e8','#e8a040','#50c0a0','#d050d0','#80c040'];
    for (var i = 0; i < 6; i++) {
      butterflies.push({
        x: 200 + i * 140 + (tileHash(i, 77) % 100),
        y: 150 + (tileHash(i, 78) % 300),
        phase: i * 1.7,
        color: bColors[i]
      });
    }
    fireflies = [];
    for (var i = 0; i < 10; i++) {
      fireflies.push({
        x: 100 + i * 95 + (tileHash(i, 88) % 60),
        y: 200 + (tileHash(i, 89) % 300),
        phase: i * 0.9 + (tileHash(i, 90) % 10) * 0.3
      });
    }
  }

  // ── Map State ──────────────────────────────────
  var mapCanvas = null, mapCtx = null, mapAnimId = null;
  var staticBuffer = null, staticBufferCtx = null, staticDirty = true;
  var smokeFrame = 0;
  var playerPos = { x: 530, y: 98 };
  var playerTarget = null;
  var playerDir = 'down';
  var playerFrame = 0;
  var playerAnimTimer = 0;
  var playerAtLocation = 'town';
  var lastTimestamp = 0;
  var enterPromptVisible = false;

  // ── State ─────────────────────────────────────
  var meta = null;
  var activeSlot = -1;
  var currentScreen = 'rpg-menu-screen';
  var createTargetSlot = -1;
  var osrsPanelSetUp = false;
  var programmaticSkillClick = false;
  var centerMode = 'map';

  // ── Town Hub Constants ────────────────────────
  var TOWN_W = MAP_W, TOWN_H = MAP_H;
  var TOWN_WALL = 40;
  var TOWN_LOCATIONS = {
    tavern:    { x: 200,  y: 140, name: 'Tavern',          type: 'placeholder', desc: 'Ale and quests await.' },
    store:     { x: 530,  y: 140, name: 'General Store',   type: 'placeholder', desc: 'Buy and sell goods.' },
    bank:      { x: 860,  y: 140, name: 'Bank',            type: 'placeholder', desc: 'Keep your gold safe.' },
    casino:    { x: 200,  y: 330, name: 'Casino',          type: 'placeholder', desc: 'Try your luck.' },
    fountain:  { x: 530,  y: 330, name: 'Fountain',        type: 'decorative',  desc: 'A tranquil fountain.' },
    arcade:    { x: 860,  y: 330, name: 'Arcade',          type: 'placeholder', desc: 'Play mini-games.' },
    chapel:    { x: 120,  y: 520, name: 'Chapel',          type: 'placeholder', desc: 'A place of prayer.' },
    dungeon:   { x: 290,  y: 520, name: 'Dungeon Gate',    type: 'dungeon',     desc: 'Descend into darkness.' },
    library:   { x: 480,  y: 520, name: 'Library',         type: 'placeholder', desc: 'Knowledge is power.' },
    barracks:  { x: 670,  y: 520, name: 'Guard Barracks',  type: 'placeholder', desc: 'The town guard rests here.' },
    petstore:  { x: 870,  y: 520, name: 'Pet Store',       type: 'petstore',    desc: 'Hatch new companions!' }
  };
  var TOWN_LOC_ORDER = ['tavern','store','bank','casino','fountain','arcade','chapel','dungeon','library','barracks','petstore'];
  var TOWN_FLAVOR = {
    tavern:   'The smell of roast meat and spilled ale fills the air.',
    store:    'Shelves lined with provisions and curiosities.',
    bank:     'Vaults of iron and gold. Your assets are secure.',
    casino:   'The clink of coins and shuffle of cards beckon.',
    fountain: 'Crystal water cascades down three stone tiers. Coins glint from the basin.',
    arcade:   'Colorful signs flash. Excited shouts echo from within.',
    chapel:   'Candlelight flickers through stained glass.',
    dungeon:  'Cold air rises from the depths. Something stirs below.',
    library:  'Dusty tomes line every wall. A scholar peers over spectacles.',
    barracks: 'Weapons hang in orderly rows. Guards train in the yard.',
    petstore: 'Mysterious eggs sit in warm nests. A shopkeeper grins.'
  };

  // ── General Store Data ──────────────────────────
  var STORE_BUY_CATALOG = [
    { key: 'Health Potion',  price: 50,   category: 'Consumables', desc: 'Heal 30% of max HP in combat' },
    { key: 'Antidote',       price: 40,   category: 'Consumables', desc: 'Cure poison, burn, bleed' },
    { key: 'Revive Potion',  price: 150,  category: 'Consumables', desc: 'Revive fainted ally at 20% HP' },
    { key: 'Bomb',           price: 200,  category: 'Consumables', desc: 'AoE damage to all enemies' },
    { key: 'Fire Stone',     price: 1500, category: 'Evolution Stones', stoneType: 'fire' },
    { key: 'Aqua Stone',     price: 1500, category: 'Evolution Stones', stoneType: 'aqua' },
    { key: 'Nature Stone',   price: 1500, category: 'Evolution Stones', stoneType: 'nature' },
    { key: 'Tech Stone',     price: 1500, category: 'Evolution Stones', stoneType: 'tech' },
    { key: 'Shadow Stone',   price: 1500, category: 'Evolution Stones', stoneType: 'shadow' },
    { key: 'Mystic Stone',   price: 1500, category: 'Evolution Stones', stoneType: 'mystic' }
  ];

  var STORE_SELL_PRICES = {
    'Copper Ore': 2, 'Crimson Ore': 3, 'Coal': 5, 'Iron Ore': 4, 'Gold Ore': 8, 'Silver Ore': 10,
    'Astral Ore': 12, 'Shadow Ore': 8, 'Emerald Ore': 15, 'Slate Ore': 10, 'Mithril Ore': 20,
    'Amethyst Ore': 25, 'Cobalt Ore': 30, 'Molten Ore': 40, 'Frost Ore': 55, 'Obsidian Ore': 75,
    'Peridot': 10, 'Emerald': 15, 'Aquamarine': 20, 'Topaz': 25, 'Onyx': 35,
    'Moonstone': 50, 'Diamond': 100, 'Opal': 60, 'Sapphire': 40, 'Ruby': 75,
    'Pine Log': 2, 'Oak Log': 3, 'Birch Log': 5, 'Maple Log': 8, 'Walnut Log': 12,
    'Mahogany Log': 18, 'Yew Log': 30, 'Elder Log': 50,
    'Anchovy': 2, 'Goldfish': 3, 'Small Shark': 4, 'Koi': 5, 'Perch': 6, 'Clownfish': 7,
    'Piranha': 8, 'Flying Fish': 10, 'Barracuda': 12, 'Dolphin Fish': 15, 'Betta': 18,
    'Stingray': 22, 'Eye Fish': 25, 'Spook Boy': 30, 'Kingfish': 40, 'Crawfish': 35,
    'Giant Crab': 45, 'Anglerfish': 55, 'Hammerhead': 70, 'Shark': 90,
    'Copper Bar': 8, 'Bronze Bar': 15, 'Gold Bar': 30, 'Astral Bar': 45, 'Silver Bar': 55,
    'Emerald Bar': 75, 'Mithril Bar': 100, 'Amethyst Bar': 130, 'Cobalt Bar': 170,
    'Molten Bar': 220, 'Frost Bar': 280, 'Obsidian Bar': 360,
    'Health Potion': 25, 'Antidote': 20, 'Revive Potion': 75, 'Bomb': 100
  };

  // Equipment sell: ~40% of crafting value derived from tier position
  var EQUIP_SELL_TIERS = {
    'Copper': 15, 'Bronze': 30, 'Gold': 60, 'Astral': 100, 'Silver': 160, 'Emerald': 240,
    'Mithril': 340, 'Amethyst': 470, 'Cobalt': 620, 'Molten': 800, 'Frost': 1100, 'Obsidian': 1500
  };

  var STORE_KEEPER_LINES = [
    'Everything is priced fairly. No haggling.',
    'You break it, you bought it.',
    'Business is business.',
    'I sell. You buy. Simple.',
    'The finest goods in all of ' + KINGDOM_NAME + '.'
  ];

  // ── Town State ────────────────────────────────
  var townStaticBuffer = null, townStaticBufferCtx = null;
  var townAnimId = null;
  var insideTown = false;
  var insideCasino = false;
  var townPlayerPos = { x: 530, y: 580 };
  var townPlayerTarget = null;
  var townPlayerAtLocation = null;
  var townEnterPromptVisible = false;
  var townSmokeFrame = 0;
  var townLastTimestamp = 0;
  var townPlayerDir = 'up';
  var townPlayerFrame = 0;
  var townPlayerAnimTimer = 0;
  var petStoreModalOpen = false;
  var generalStoreOpen = false;
  var tavernOpen = false;

  // ── Town Light & NPC State ──────────────────────
  var townLightPoolBuffer = null, townLightPoolBufferCtx = null;
  var townNpcStates = [];
  var townActiveBubbles = []; // max 3
  var townDustParticles = [];
  var townHazeClouds = [
    { x: 250, y: 220, w: 200, h: 50, speed: 0.03 },
    { x: 700, y: 440, w: 180, h: 45, speed: -0.025 }
  ];

  // ── Town Path Network ───────────────────────────
  var TOWN_PATH_NODES = {
    'top-left':    { x: 200, y: 170 },
    'top-center':  { x: 530, y: 170 },
    'top-right':   { x: 860, y: 170 },
    'mid-left':    { x: 200, y: 360 },
    'mid-center':  { x: 530, y: 360 },
    'mid-right':   { x: 860, y: 360 },
    'bot-chapel':  { x: 120, y: 550 },
    'bot-dungeon': { x: 290, y: 550 },
    'bot-library': { x: 480, y: 550 },
    'bot-barracks':{ x: 670, y: 550 },
    'bot-petstore':{ x: 870, y: 550 },
    'gate':        { x: 530, y: 600 }
  };
  var TOWN_PATH_EDGES = [
    ['top-left','top-center'],['top-center','top-right'],
    ['mid-left','mid-center'],['mid-center','mid-right'],
    ['bot-chapel','bot-dungeon'],['bot-dungeon','bot-library'],
    ['bot-library','bot-barracks'],['bot-barracks','bot-petstore'],
    ['top-left','mid-left'],['top-right','mid-right'],
    ['top-center','mid-center'],['mid-center','bot-library'],
    ['mid-center','gate'],['mid-left','bot-dungeon'],['mid-right','bot-barracks']
  ];
  var BUILDING_NODE = {
    tavern:'top-left', store:'top-center', bank:'top-right',
    casino:'mid-left', fountain:'mid-center', arcade:'mid-right',
    chapel:'bot-chapel', dungeon:'bot-dungeon', library:'bot-library',
    barracks:'bot-barracks', petstore:'bot-petstore'
  };

  // ── Town NPC Definitions ────────────────────────
  var TOWN_NPCS = [
    { id:'grog', name:'Grog', body:'#6b4e2b', skin:'#d4a574', hair:'#5a3a1a', hat:null, accessory:null,
      scale:1, alpha:1, speed:18, wobble:true, route:['tavern','fountain'],
      dwellMin:12000, dwellMax:25000, idleAnim:'sway', special:'stumble', specialChance:0.05,
      lines:['*hic* The ale is... medicinal.','I swear the fountain moved.','Who put stairs in the floor?','Is it raining or is that me?'],
      playerLines:['Hey... you\'re my best friend.','Buy me a drink and I\'ll tell you a secret...','Which one of you three is the real one?','I used to be an adventurer. Now I\'m just thirsty.'] },
    { id:'maeve', name:'Maeve', body:'#804060', skin:'#f1c27d', hair:'#cc4422', hat:null, accessory:null,
      scale:1, alpha:1, speed:22, wobble:false, route:['store','library','petstore'],
      dwellMin:10000, dwellMax:20000, idleAnim:null, special:null, specialChance:0,
      lines:['Father says we\'re out of pickled herring.','Returning a book I definitely didn\'t read.','I\'m NOT buying another egg. ...okay maybe one.','The librarian judged me again.'],
      playerLines:['Did you hear about the dungeon?','New in town? Everyone\'s talking about you.','Don\'t trust the banker. He counts weird.','I saw the Chapel ghost again last night!'] },
    { id:'aldric', name:'Br. Aldric', body:'#4a3a2a', skin:'#c68642', hair:null, hat:'#c8c0b0',accessory:null,
      scale:1, alpha:1, speed:14, wobble:false, route:['chapel','fountain','library'],
      dwellMin:15000, dwellMax:28000, idleAnim:null, special:null, specialChance:0,
      lines:['May the light guide you. Or the torchlight.','I see wisdom in these waters. And coins.','Borrowing the sacred texts. Again.','Patience is a virtue. 47 years and counting.'],
      playerLines:['Blessings upon you, traveler.','The chapel is open to all. Even you.','Have you considered quiet contemplation? No? I can tell.','I pray for this town. Someone has to.'] },
    { id:'hilda', name:'Cpt. Hilda', body:'#4a4a30', skin:'#8d5524', hair:'#2a2a2a', hat:'#606068',accessory:null,
      scale:1, alpha:1, speed:25, wobble:false, route:['barracks','dungeon','casino','gate'],
      dwellMin:10000, dwellMax:18000, idleAnim:null, special:null, specialChance:0,
      lines:['Shift change in... never.','All clear down there. Mostly.','Nobody\'s cheating. I checked. Lost 40 GP checking.','No monsters today. Just merchants and drunks.'],
      playerLines:['Keep your weapons sheathed in town.','I\'ve got my eye on you. Both of them.','Move along, citizen.','Report any suspicious activity. Not including Grog.'] },
    { id:'pocket', name:'Pocket', body:'#c07830', skin:null, hair:null, hat:null, accessory:'cat',
      scale:0.5, alpha:1, speed:35, wobble:false, route:['random'],
      dwellMin:8000, dwellMax:18000, idleAnim:'tailflick', special:'flee', specialChance:1,
      lines:['...','*mrrow*','*stares judgmentally*','*knocks coin off ledge*'],
      playerLines:[] },
    { id:'barnaby', name:'Barnaby', body:'#5a4a30', skin:'#d4a574', hair:'#aaaaaa', hat:null,accessory:null,
      scale:1, alpha:1, speed:20, wobble:false, route:['library','chapel','barracks'],
      dwellMin:12000, dwellMax:22000, idleAnim:null, special:'sprint', specialChance:0.08,
      lines:['They MOVED the books again!','The fountain is WATCHING US.','The guards know something. They ALL know.','I\'ve been tracking that cat. It reports to someone.'],
      playerLines:['The General Store? Front for the Illuminati.','That fountain isn\'t what it seems. It\'s a PORTAL.','You seem trustworthy. The Bank moves 3px every full moon.','The bartender waters down ale with MIND CONTROL SERUM.'] },
    { id:'pip', name:'Pip', body:'#6080a0', skin:'#f1c27d', hair:'#8a4020', hat:null,accessory:'stick',
      scale:0.75, alpha:1, speed:24, wobble:false, route:['dungeon','barracks','store'],
      dwellMin:10000, dwellMax:18000, idleAnim:'bounce', special:'airfight', specialChance:0.04,
      lines:['One day I\'ll go down there. Probably.','Can I join? No? Same time tomorrow?','My sword is just resting. *holds stick*'],
      playerLines:['Are you a REAL adventurer?!','Can I come with you? I can carry stuff!','I\'ve been training! Watch! *trips*','When I grow up I want to be you. Or a dragon.'] },
    { id:'vault', name:'Mr. Vault', body:'#2a2a2a', skin:'#c68642', hair:null, hat:null,accessory:'tophat',
      scale:1, alpha:1, speed:16, wobble:false, route:['bank','store'],
      dwellMin:18000, dwellMax:30000, idleAnim:null, special:'coindrop', specialChance:0.03,
      lines:['Counting... counting... still counting...','These prices are... optimistic.','Interest accrues daily. At a rate I decide.'],
      playerLines:['Your account balance is... adequate.','Gold doesn\'t grow on trees. It grows in banks.','I\'ve seen your spending habits. We need to talk.'] },
    { id:'briar', name:'Briar', body:'#603060', skin:'#f1c27d', hair:'#6a3a20', hat:null,accessory:null,
      scale:1, alpha:1, speed:20, wobble:false, route:['petstore','fountain','arcade'],
      dwellMin:12000, dwellMax:22000, idleAnim:null, special:null, specialChance:0,
      lines:['Hello, my darlings! Mama\'s here!','Has anyone adopted the fire one? NO? GOOD.','This is where I reflect on which egg to buy next.'],
      playerLines:['How many pets do you have? Not enough.','I can SMELL a legendary egg. Smells like destiny.','If you ever hurt a pet I will END you. :)'] },
    { id:'marcus', name:'Marcus', body:'#405060', skin:'#d4a574', hair:'#2a2a2a', hat:null,accessory:null,
      scale:1, alpha:1, speed:22, wobble:false, route:['arcade','casino','tavern'],
      dwellMin:14000, dwellMax:25000, idleAnim:null, special:null, specialChance:0,
      lines:['New high score. Again. Yawn.','Slots are just arcades for old people.','One meat pie. For the grind.'],
      playerLines:['GG.','Nice build. I\'d rate it a 6.','No-life energy. I respect it.','What\'s your APM? Jk, I can tell.'] },
    { id:'ghost', name:'???', body:'#808088', skin:'#c0c0c8', hair:null, hat:null,accessory:null,
      scale:1, alpha:0.35, speed:12, wobble:false, route:['chapel','fountain'],
      dwellMin:18000, dwellMax:30000, idleAnim:'float', special:'fade', specialChance:1,
      lines:['...still haunting. Day 4,382.','I liked this fountain when it was new. 800 years ago.','I filed a haunting complaint 200 years ago. Still pending.'],
      playerLines:['Boo. ...sorry, force of habit.','I\'m not scary. I\'m just dead. There\'s a difference.','You can see me? Most people walk right through me.','The chapel used to be bigger. I built it.'] }
  ];

  var PAIRED_DIALOGUES = {
    'grog+aldric': [
      { a: '*hic* Brother! Bless this ale.', b: 'The gods don\'t bless ale, Grog.' },
      { a: 'Pray for me, Brother.', b: 'I already do. Twice daily.' }
    ],
    'grog+hilda': [
      { a: 'I\'m not drunk, I\'m calibrating.', b: 'Calibrating what? Your blood alcohol?' },
      { a: 'This IS my home.', b: 'Go home, Grog.' }
    ],
    'maeve+barnaby': [
      { a: 'Any new theories today?', b: 'The BAKER is in on it now.' }
    ],
    'maeve+briar': [
      { a: 'How many pets this week?', b: 'We don\'t talk about this week.' }
    ],
    'hilda+barnaby': [
      { a: 'The walls are LISTENING!', b: 'Barnaby. The walls are stone.' }
    ],
    'hilda+pip': [
      { a: 'Can I hold your sword?', b: 'No.' }
    ],
    'marcus+pip': [
      { a: 'Wanna play swords?', b: 'I only play ranked.' }
    ],
    'vault+maeve': [
      { a: 'Your father\'s account is overdue.', b: 'Tell him, not me. I just shop here.' }
    ],
    'marcus+grog': [
      { a: 'You\'re literally an NPC.', b: '...what\'s an NPC?' }
    ],
    'aldric+briar': [
      { a: 'Do animals have souls, Brother?', b: 'The cat certainly doesn\'t.' }
    ]
  };

  var NPC_UNLOCK = {
    grog: null, maeve: null, aldric: null, hilda: null, pocket: null, barnaby: null,
    pip: function() { return window.QuestSystem && window.QuestSystem.getCompletedCount && window.QuestSystem.getCompletedCount() >= 3; },
    vault: function() { return meta.slots[activeSlot] && meta.slots[activeSlot].visitedBank; },
    briar: function() { var p = getRpgPetState(); return p && Object.keys(p.owned).length >= 1; },
    marcus: null,
    ghost: function() { return meta.slots[activeSlot] && meta.slots[activeSlot].visitedChapel; }
  };

  // ── NPC Conversation Groups (static clusters) ──
  var TOWN_NPC_GROUPS = [
    {
      id: 'casino-smokers',
      pos: { x: 170, y: 385 }, // outside casino, to the right
      npcs: [
        { id: 'vex', name: 'Vex', body: '#5a5040', skin: '#d4a574', hair: '#4a3a20', hat: null, accessory: null, scale: 1, offset: { x: -12, y: 0 }, facing: 'right' },
        { id: 'doyle', name: 'Doyle', body: '#3a4a3a', skin: '#c68642', hair: '#2a2a2a', hat: null, accessory: null, scale: 1.05, offset: { x: 12, y: 0 }, facing: 'left' }
      ],
      exchanges: [
        { a: "I'm telling you, give me one spoon and I'd clear the first three floors of that dungeon.", b: "You lost 200 gold to a card game last night. Against yourself." },
        { a: "That's CARDS. Spoon combat is completely different. It's about instinct.", b: "You don't have instincts. You have debts." },
        { a: "Alright, smartarse \u2014 what would YOU do with a spoon in the dungeon?", b: "Eat soup. I'd bring soup." },
        { a: "You can't bring soup! The hypothetical clearly states one spoon, nothing else.", b: "Then I'm not going into the dungeon." },
        { a: "That's not how hypotheticals WORK, Doyle.", b: "Sure it is. I hypothetically decline." },
        { a: "Fine. Floor one, I'd sharpen the spoon on the wall. Fashion a blade.", b: "You once cut yourself opening a letter." },
        { a: "The LETTER was the dangerous part. Monsters are predictable.", b: "Name one monster." },
        { a: "...the big ones. The slimy ones. You know what I mean.", b: "You've never been in the dungeon, have you?" },
        { a: "I've been NEAR the dungeon. That's recon. That's phase one.", b: "Phase one of what? Dying?" },
        { a: "I have a twelve-phase plan, Doyle. On a napkin. You wouldn't understand it.", b: "I saw that napkin. It says 'Get spoon' and then it's just gravy stains." },
        { a: "That's TACTICAL NOTATION. The gravy is coded.", b: "The gravy is from Tuesday's meat pie." },
        { a: "When I clear that dungeon with a spoon, I'm not sharing the loot.", b: "Bold of a man who owes the bartender six tabs to talk about sharing." }
      ]
    },
    {
      id: 'fountain-watchers',
      pos: { x: 575, y: 345 }, // on the bench by the fountain
      npcs: [
        { id: 'thatch', name: 'Thatch', body: '#6a5a3a', skin: '#d4a574', hair: '#808080', hat: null, accessory: null, scale: 1, offset: { x: -10, y: 0 }, facing: 'right' },
        { id: 'oona', name: 'Oona', body: '#3a5a4a', skin: '#f1c27d', hair: '#5a7a5a', hat: null, accessory: null, scale: 0.95, offset: { x: 10, y: 0 }, facing: 'left' }
      ],
      exchanges: [
        { a: "You ever notice how the fountain water goes up and then comes back down?", b: "That's just gravity, Thatch." },
        { a: "Yeah, but WHY though. What if one day it just... doesn't come back down?", b: "Then we'd have bigger problems than your question." },
        { a: "I counted the coins in that fountain once. 847. Someone threw in a button.", b: "Every wish costs something. Some people are just cheap about it." },
        { a: "What did YOU wish for?", b: "Quiet. Hasn't worked yet." },
        { a: "See that adventurer? Walking around like they own the place.", b: "Everyone walks like that when they're new. Give it a week." },
        { a: "I used to walk like that. Chest out. Purpose. Direction.", b: "Now you sit on a bench and watch water fall." },
        { a: "I'm OBSERVING. There's a difference between sitting and observing.", b: "What's the difference?" },
        { a: "...intent.", b: "Mmhm." },
        { a: "You think the ghost knows it's a ghost?", b: "I think the ghost has been dead long enough to stop caring about categories." },
        { a: "Deep. That's deep, Oona.", b: "I was just thinking about lunch, but sure." },
        { a: "What's the point of a fountain in a town this small? Who's it for?", b: "Us, apparently." },
        { a: "Best seat in town. Free water sounds. No cover charge.", b: "The bench is free. The quiet costs me every time you open your mouth." }
      ]
    },
    {
      id: 'gate-gossips',
      pos: { x: 440, y: 590 }, // near the southern gate
      npcs: [
        { id: 'marge', name: 'Marge', body: '#6a4040', skin: '#d4a574', hair: '#c0c0c0', hat: null, accessory: null, scale: 1, offset: { x: -12, y: 0 }, facing: 'right' },
        { id: 'dotty', name: 'Dotty', body: '#4a4060', skin: '#f1c27d', hair: '#c8c8c8', hat: null, accessory: null, scale: 0.95, offset: { x: 12, y: 0 }, facing: 'left' }
      ],
      exchanges: [
        { a: "Another adventurer just walked in. Shiny armor. Brand new boots.", b: "Give it a day. The dungeon'll sort that out." },
        { a: "Did you see what Briar was carrying yesterday? ANOTHER egg.", b: "That woman's got more pets than sense. And she started with very little sense." },
        { a: "The banker walked by without saying hello. TWICE.", b: "He's always counting. I don't trust a man who counts that much." },
        { a: "Grog's heading to the tavern early today.", b: "Early? That implies he left." },
        { a: "Brother Aldric blessed my bread yesterday. It still went stale.", b: "The gods have priorities, Marge. Your sourdough isn't one of them." },
        { a: "That conspiracy fellow was running again. Full sprint. Middle of the day.", b: "He told me the fountain is a portal. I told him to drink less." },
        { a: "Young Pip asked to borrow my rolling pin. Said it was a 'mace.'", b: "At least he's got ambition. More than I can say for his father." },
        { a: "Captain Hilda confiscated someone's sword at the gate last week. The man cried.", b: "Good. If you cry about a sword, you shouldn't have one." },
        { a: "I heard someone lost 500 gold at the casino in one sitting.", b: "Only 500? Amateur. My cousin lost his HOUSE." },
        { a: "You ever think about going into the dungeon yourself, Dotty?", b: "I'm 63. The scariest thing in that dungeon would be ME." },
        { a: "That cat stole a fish right off Marcus's plate yesterday.", b: "That cat answers to no one. I respect it. Only honest creature in this town." },
        { a: "Another quiet day at the gate.", b: "Give it time. Something stupid always happens." }
      ]
    }
  ];

  var townGroupStates = [];

  // ── Tavern Constants ──────────────────────────
  var BARTENDER_GREETINGS = [
    'Welcome to The Rusty Tankard. Try not to break anything.',
    'Oh look, another adventurer. How original.',
    'Ale\'s warm, food\'s questionable, and the board\'s over there.',
    'You look like you could use a drink. Or a quest. Or both.',
    'Don\'t touch the tankard on the wall. It\'s load-bearing.',
    'Back again? The board\'s refreshed. Your liver hasn\'t.',
    'Sit down, shut up, and check the quest board.',
    'The Rusty Tankard: where dreams come to get a paycheck.',
    'Another day, another adventurer who thinks they\'re special.',
    'I\'ve seen tougher-looking bar stools. Quest board\'s to your left.'
  ];
  var BARTENDER_ACCEPT = [
    'Bold choice. Try not to die.',
    'Alright, it\'s yours. Don\'t come crying to me.',
    'Noted. I\'ll pour one out if you don\'t come back.',
    'Good luck. You\'ll need it. Probably.',
    'Quest accepted. The tab is non-refundable.'
  ];

  // ── Helpers ───────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.slots) return parsed;
      }
    } catch (e) {}
    return { currentSlot: -1, slots: [null, null, null] };
  }

  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  function slotStorageKey(idx) {
    return SLOT_PREFIX + idx + SKILLS_SUFFIX;
  }

  function getSlotSkillsState(idx) {
    try {
      var raw = localStorage.getItem(slotStorageKey(idx));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function getTotalLevel(idx) {
    var ss = getSlotSkillsState(idx);
    if (!ss || !ss.skills) return 5;
    var total = 0;
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var sk = ss.skills[SKILL_KEYS[i]];
      total += (sk && sk.level) ? sk.level : 1;
    }
    return total;
  }

  function getSkillLevel(idx, skill) {
    var ss = getSlotSkillsState(idx);
    if (!ss || !ss.skills || !ss.skills[skill]) return 1;
    return ss.skills[skill].level || 1;
  }

  function formatDate(ts) {
    if (!ts) return 'Never';
    var d = new Date(ts);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + (mins === 1 ? ' minute' : ' minutes') + ' ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour' : ' hours') + ' ago';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + (days === 1 ? ' day' : ' days') + ' ago';
    var months = Math.floor(days / 30);
    return months + (months === 1 ? ' month' : ' months') + ' ago';
  }

  // ── Location Icon Helper ─────────────────────
  function createLocationIcon(locId) {
    var data = LOCATION_ICONS[locId];
    if (!data) return null;
    var scale = 2; // 16px native → 32px display
    var el = document.createElement('div');
    el.className = 'rpg-location-icon';
    el.style.backgroundImage = 'url(' + ITEMS_SHEET_PATH + ')';
    el.style.backgroundSize = (576 * scale) + 'px ' + (560 * scale) + 'px';
    el.style.backgroundPosition = '-' + (data.x * scale) + 'px -' + (data.y * scale) + 'px';
    return el;
  }

  // ── Pet Helpers ──────────────────────────────
  function getAssignedPet(slotIdx, skill) {
    var ss = getSlotSkillsState(slotIdx);
    if (!ss || !ss.skills || !ss.skills[skill]) return null;
    return ss.skills[skill].assignedPet || null;
  }

  function createPetSpriteEl(petId) {
    if (!petSpriteData || !petCatalog) return null;
    var creature = petCatalog.creatures ? petCatalog.creatures[petId] : null;
    if (!creature) return null;
    var sid = creature.spriteId || petId;
    // Check for alt skin
    var ps = null;
    try { var raw = localStorage.getItem(PET_KEY); if (raw) ps = JSON.parse(raw); } catch (e) {}
    var petSkin = (ps && ps.pets && ps.pets[petId] && ps.pets[petId].skin === 'alt') ? 'alt' : 'default';
    var sheetKey = petSkin === 'alt' ? sid + '-alt' : sid;
    var data = petSpriteData[sheetKey] || petSpriteData[sid];
    if (!data) return null;

    var petLevel = (ps && ps.pets && ps.pets[petId]) ? (ps.pets[petId].level || 1) : 1;
    var frameOffset = data.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + petLevel - 1, (data.frames || 3) - 1);

    // Scale factor: display 32px from native 48px = 2/3
    var scale = 32 / 48;
    var el = document.createElement('div');
    el.className = 'rpg-tile-pet';
    el.style.backgroundImage = 'url(' + data.sheet + ')';
    el.style.backgroundSize = ((data.frames || 3) * 48 * scale) + 'px ' + (48 * scale) + 'px';
    el.style.backgroundPosition = '-' + Math.round(frameIdx * 48 * scale) + 'px 0';
    el.title = creature.name;
    return el;
  }

  // ── Screen Manager ────────────────────────────
  function showScreen(id) {
    var screens = document.querySelectorAll('.rpg-screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].style.display = 'none';
    }
    var target = $(id);
    if (target) target.style.display = 'block';
    currentScreen = id;
  }

  // ── Unread Badge Helper ──────────────────────
  function markTabUnread(tabId) {
    var btn = document.querySelector('[data-chat-tab="' + tabId + '"]');
    if (btn && !btn.classList.contains('active')) {
      btn.classList.add('has-unread');
    }
  }

  function clearTabUnread(tabId) {
    var btn = document.querySelector('[data-chat-tab="' + tabId + '"]');
    if (btn) btn.classList.remove('has-unread');
  }

  // Expose for quest.js
  window.__RPG_MARK_TAB_UNREAD = markTabUnread;

  // ── Game Message Log ─────────────────────────
  function addGameMessage(text, type) {
    var pane = $('osrs-chat-game');
    if (!pane) return;
    var msg = document.createElement('div');
    msg.className = 'osrs-game-msg osrs-game-msg--' + (type || 'system');
    msg.textContent = text;
    pane.appendChild(msg);
    // Cap at 50 messages (skip non-msg children like #skills-game-log)
    var msgs = pane.querySelectorAll('.osrs-game-msg');
    while (msgs.length > 50) {
      msgs[0].parentNode.removeChild(msgs[0]);
      msgs = pane.querySelectorAll('.osrs-game-msg');
    }
    // Auto-scroll chatbox body
    var body = $('osrs-chatbox-body');
    if (body) body.scrollTop = body.scrollHeight;
    // Auto-switch to Game tab when on the map or in town
    if (centerMode === 'map' || insideTown) {
      switchChatTab('game');
    } else {
      // Mark game tab as unread if not currently active
      markTabUnread('game');
    }
  }

  function addChatMessage(text, type) {
    var pane = $('osrs-chat-chat');
    if (!pane) return;
    var msg = document.createElement('div');
    msg.className = 'osrs-game-msg osrs-game-msg--' + (type || 'npc');
    msg.textContent = text;
    pane.appendChild(msg);
    var msgs = pane.querySelectorAll('.osrs-game-msg');
    while (msgs.length > 80) {
      msgs[0].parentNode.removeChild(msgs[0]);
      msgs = pane.querySelectorAll('.osrs-game-msg');
    }
    var body = $('osrs-chatbox-body');
    if (body) body.scrollTop = body.scrollHeight;
    // Mark chat tab unread if not active
    markTabUnread('chat');
  }

  // ── Fade Transition Helper ───────────────────
  function fadeTransition(callback) {
    var panel = document.querySelector('.rpg-page .skills-game-panel');
    if (!panel) { callback(); return; }
    panel.classList.add('rpg-fade-out');
    setTimeout(function () {
      callback();
      panel.classList.remove('rpg-fade-out');
    }, 300);
  }

  // ── Center Panel Toggle ───────────────────────
  function showCenterContent(mode) {
    centerMode = mode;
    var mapContainer = $('rpg-world-map-container');
    var gameHeader = $('skills-game-header');
    var gameArea = $('skills-game-area');
    var gameLog = $('skills-game-log');
    var skillTopbar = $('rpg-skill-topbar');
    var combatContainer = $('rpg-combat-container');

    if (mode === 'skill') {
      if (mapContainer) mapContainer.style.display = 'none';
      if (gameHeader) gameHeader.style.display = '';
      if (gameArea) gameArea.style.display = '';
      if (gameLog) gameLog.style.display = '';
      if (skillTopbar) skillTopbar.style.display = '';
      if (combatContainer) combatContainer.style.display = 'none';
    } else if (mode === 'combat') {
      if (mapContainer) mapContainer.style.display = 'none';
      if (gameHeader) gameHeader.style.display = 'none';
      if (gameArea) gameArea.style.display = 'none';
      if (gameLog) gameLog.style.display = 'none';
      if (skillTopbar) skillTopbar.style.display = 'none';
      if (combatContainer) combatContainer.style.display = '';
    } else {
      // map mode
      if (mapContainer) mapContainer.style.display = 'block';
      if (gameHeader) gameHeader.style.display = 'none';
      if (gameArea) gameArea.style.display = 'none';
      if (gameLog) gameLog.style.display = 'none';
      if (skillTopbar) skillTopbar.style.display = 'none';
      if (combatContainer) combatContainer.style.display = 'none';
    }
  }

  // ── Menu Screen ───────────────────────────────
  function renderMenuScreen() {
    var slotsPanel = $('rpg-save-slots');
    slotsPanel.style.display = 'none';

    var hasSaves = false;
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (meta.slots[i]) { hasSaves = true; break; }
    }
    var continueBtn = $('rpg-btn-continue');
    continueBtn.disabled = !hasSaves;
    if (!hasSaves) {
      continueBtn.classList.add('rpg-btn-disabled');
    } else {
      continueBtn.classList.remove('rpg-btn-disabled');
    }
  }

  function renderSaveSlots(mode) {
    var grid = $('rpg-slots-grid');
    grid.innerHTML = '';

    for (var i = 0; i < MAX_SLOTS; i++) {
      var slot = meta.slots[i];
      var card = document.createElement('div');
      card.className = 'rpg-slot-card' + (slot ? '' : ' rpg-slot-empty');
      card.setAttribute('data-slot', i);

      if (slot) {
        var info = document.createElement('div');
        info.className = 'rpg-slot-info';
        info.innerHTML = '<div class="rpg-slot-name">' + escapeHtml(slot.name) + '</div>' +
          '<div class="rpg-slot-level">Total Lv: ' + getTotalLevel(i) + '</div>' +
          '<div class="rpg-slot-date">Last: ' + formatDate(slot.lastPlayed) + '</div>';

        var actions = document.createElement('div');
        actions.className = 'rpg-slot-actions';

        if (mode === 'continue') {
          var playBtn = document.createElement('button');
          playBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
          playBtn.textContent = 'Play';
          playBtn.setAttribute('data-slot', i);
          playBtn.addEventListener('click', onSlotPlay);
          actions.appendChild(playBtn);
        }

        var delBtn = document.createElement('button');
        delBtn.className = 'rpg-btn rpg-btn-small rpg-btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.setAttribute('data-slot', i);
        delBtn.addEventListener('click', onSlotDelete);
        actions.appendChild(delBtn);

        card.appendChild(info);
        card.appendChild(actions);
      } else {
        var emptyLabel = document.createElement('div');
        emptyLabel.className = 'rpg-slot-empty-label';
        emptyLabel.textContent = '[ Empty Slot ' + (i + 1) + ' ]';

        if (mode === 'new') {
          var createBtn = document.createElement('button');
          createBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
          createBtn.textContent = 'Create';
          createBtn.setAttribute('data-slot', i);
          createBtn.addEventListener('click', onSlotCreate);
          card.appendChild(emptyLabel);
          card.appendChild(createBtn);
        } else {
          card.appendChild(emptyLabel);
        }
      }

      grid.appendChild(card);
    }
  }

  // ── Menu Event Handlers ───────────────────────
  function onNewGame() {
    var hasEmpty = false;
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (!meta.slots[i]) { hasEmpty = true; break; }
    }
    if (!hasEmpty) {
      alert('All save slots are full. Delete a save to create a new character.');
      return;
    }
    renderSaveSlots('new');
    $('rpg-save-slots').style.display = 'block';
  }

  function onContinue() {
    renderSaveSlots('continue');
    $('rpg-save-slots').style.display = 'block';
  }

  function onSlotsBack() {
    $('rpg-save-slots').style.display = 'none';
  }

  function onSlotCreate(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    createTargetSlot = slot;
    createSelectedChar = 'alex';
    $('rpg-name-input').value = '';
    $('rpg-btn-begin').disabled = true;
    showScreen('rpg-create-screen');
    renderCharPicker();
    $('rpg-name-input').focus();
  }

  function renderCharPicker() {
    var container = $('rpg-char-picker');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < CHAR_APPEARANCE_IDS.length; i++) {
      var cid = CHAR_APPEARANCE_IDS[i];
      var option = document.createElement('div');
      option.className = 'rpg-char-option' + (cid === createSelectedChar ? ' selected' : '');
      option.setAttribute('data-char', cid);

      var canvas = document.createElement('canvas');
      canvas.width = 48; canvas.height = 48;
      canvas.className = 'rpg-char-option-canvas';
      canvas.style.imageRendering = 'pixelated';
      option.appendChild(canvas);

      var label = document.createElement('div');
      label.className = 'rpg-char-option-label';
      label.textContent = CHAR_APPEARANCE_NAMES[cid];
      option.appendChild(label);

      option.addEventListener('click', onCharPickerClick);
      container.appendChild(option);

      // Draw preview
      var sprites = CHAR_SPRITES[cid];
      if (sprites && sprites.idle && sprites.idle.complete) {
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprites.idle, 0, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, 0, 0, 48, 48);
      } else if (sprites && sprites.idle) {
        // Wait for load then draw
        (function (cv, sp) {
          sp.idle.addEventListener('load', function () {
            var c = cv.getContext('2d');
            c.imageSmoothingEnabled = false;
            c.drawImage(sp.idle, 0, 0, CHAR_SPRITE_FRAME, CHAR_SPRITE_FRAME, 0, 0, 48, 48);
          });
        })(canvas, sprites);
      }
    }
  }

  function onCharPickerClick(e) {
    var option = e.currentTarget;
    var cid = option.getAttribute('data-char');
    if (!cid) return;
    createSelectedChar = cid;
    var container = $('rpg-char-picker');
    var options = container.querySelectorAll('.rpg-char-option');
    for (var i = 0; i < options.length; i++) {
      options[i].classList.toggle('selected', options[i].getAttribute('data-char') === cid);
    }
  }

  function onSlotPlay(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    enterGame(slot);
  }

  function onSlotDelete(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    var slotData = meta.slots[slot];
    if (!slotData) return;
    if (!confirm('Delete save "' + slotData.name + '"? This cannot be undone.')) return;

    meta.slots[slot] = null;
    localStorage.removeItem(slotStorageKey(slot));
    saveMeta();
    var slotsPanel = $('rpg-save-slots');
    if (slotsPanel.style.display !== 'none') {
      var hasPlay = slotsPanel.querySelector('.rpg-btn-primary[data-slot]');
      var mode = (hasPlay && hasPlay.textContent === 'Play') ? 'continue' : 'new';
      renderSaveSlots(mode);
    }
    renderMenuScreen();
  }

  // ── Character Creation ────────────────────────
  function onNameInput() {
    var name = $('rpg-name-input').value.trim();
    $('rpg-btn-begin').disabled = !name;
  }

  var createSelectedChar = 'alex'; // default character for creation screen

  function onBeginAdventure() {
    var name = $('rpg-name-input').value.trim();
    if (!name || createTargetSlot < 0) return;

    var now = Date.now();
    meta.slots[createTargetSlot] = {
      name: name,
      appearance: createSelectedChar,
      created: now,
      lastPlayed: now,
      wallet: getDefaultRpgWallet(),
      rpgPets: getDefaultRpgPets(),
      equipment: { weapon: null, helm: null, chest: null, legs: null, boots: null, gloves: null }
    };
    meta.currentSlot = createTargetSlot;
    saveMeta();

    enterGame(createTargetSlot);
  }

  function onCreateBack() {
    showScreen('rpg-menu-screen');
    renderMenuScreen();
  }

  // ── OSRS Bottom Bar (chatbox) + Side Panel (icon tabs) ─
  function setupOsrsPanel() {
    var chatbox = $('osrs-chatbox');
    var sidePanel = $('osrs-side-panel');
    if (!chatbox || !sidePanel) return;

    if (osrsPanelSetUp) {
      chatbox.style.display = '';
      sidePanel.style.display = '';
      return;
    }

    // Move DOM nodes from hidden panels into side panel panes
    var skillsPane = $('osrs-side-skills');
    var invPane = $('osrs-side-inventory');
    var petsPane = $('osrs-side-pets');
    var milestonesPane = $('osrs-side-milestones');

    // Skills pane: skill list as OSRS-style grid (display-only in RPG mode)
    var skillsList = $('skills-list');
    if (skillsList && skillsPane) {
      skillsPane.appendChild(skillsList);
      var selectedRows = skillsList.querySelectorAll('.skill-row.selected');
      for (var i = 0; i < selectedRows.length; i++) {
        selectedRows[i].classList.remove('selected');
      }
      // Add total level footer inside the grid
      if (!$('osrs-skills-total')) {
        var totalEl = document.createElement('div');
        totalEl.className = 'osrs-skills-total';
        totalEl.id = 'osrs-skills-total';
        totalEl.textContent = 'Total Level: 5';
        skillsList.appendChild(totalEl);
      }
    }

    // Inventory pane
    var invPanel = $('skills-inv-panel');
    if (invPanel && invPane) invPane.appendChild(invPanel);

    // Pets pane: dynamically populated by renderPetTab()
    // Move char info + pet assignment + idle status into skills pane footer instead
    var charInfo = $('rpg-char-info');
    if (charInfo && skillsPane) skillsPane.appendChild(charInfo);
    var petSlot = $('skills-pet-slot');
    if (petSlot && skillsPane) skillsPane.appendChild(petSlot);
    var idleStatus = $('skills-idle-status');
    if (idleStatus && skillsPane) skillsPane.appendChild(idleStatus);

    // Milestones pane
    var milestones = $('skills-milestones');
    if (milestones && milestonesPane) milestonesPane.appendChild(milestones);

    // Game pane: move game log
    var gamePane = $('osrs-chat-game');
    var gameLog = $('skills-game-log');
    if (gamePane && gameLog) gamePane.appendChild(gameLog);

    // Move side panel + chatbox into skills-game-panel so they match the play area width
    var gamePanel = $('skills-game-panel');
    if (gamePanel && sidePanel) gamePanel.appendChild(sidePanel);
    if (gamePanel && chatbox) gamePanel.appendChild(chatbox);

    // Create skill topbar at top of center game panel
    var mapContainer = $('rpg-world-map-container');
    if (gamePanel && !$('rpg-skill-topbar')) {
      var topbar = document.createElement('div');
      topbar.className = 'rpg-skill-topbar';
      topbar.id = 'rpg-skill-topbar';
      topbar.style.display = 'none';

      // Hide original perks/log buttons (replaced by Location tab)
      var perksBtn = $('skills-perks-btn');
      if (perksBtn) perksBtn.style.display = 'none';
      var logBtn = $('skills-log-btn');
      if (logBtn) logBtn.style.display = 'none';

      // World Map button in topbar
      var mapBtn = document.createElement('button');
      mapBtn.className = 'rpg-btn rpg-btn-small rpg-skill-topbar-map';
      mapBtn.innerHTML = '&larr; World Map';
      mapBtn.addEventListener('click', returnToMap);
      topbar.appendChild(mapBtn);

      // Insert before the map container (so it appears above game content)
      if (mapContainer) {
        gamePanel.insertBefore(topbar, mapContainer);
      } else {
        gamePanel.insertBefore(topbar, gamePanel.firstChild);
      }
    }

    // Show both panels, default tabs
    chatbox.style.display = '';
    sidePanel.style.display = '';
    switchChatTab('game');
    switchSideTab('skills');
    // Start side panel collapsed so world map / pet store are visible
    sidePanel.classList.add('collapsed');
    var spToggle = $('osrs-side-panel-toggle');
    if (spToggle) spToggle.innerHTML = '&#9650;';
    updateLocationTab(null);
    osrsPanelSetUp = true;
  }

  function switchChatTab(tabId) {
    var chatbox = $('osrs-chatbox');
    if (!chatbox) return;
    // Update text tab buttons only (icon tabs moved to side panel)
    var allTabs = chatbox.querySelectorAll('[data-chat-tab]');
    for (var i = 0; i < allTabs.length; i++) {
      if (allTabs[i].getAttribute('data-chat-tab') === tabId) {
        allTabs[i].classList.add('active');
      } else {
        allTabs[i].classList.remove('active');
      }
    }
    var panes = chatbox.querySelectorAll('.osrs-chat-pane');
    for (var i = 0; i < panes.length; i++) {
      panes[i].style.display = (panes[i].id === 'osrs-chat-' + tabId) ? '' : 'none';
    }
    // Clear unread badge on the active tab
    clearTabUnread(tabId);
    // Auto-expand if collapsed
    chatbox.classList.remove('collapsed');
    var toggle = $('osrs-chatbox-toggle');
    if (toggle) toggle.innerHTML = '&#9660;';
  }

  function onChatTabClick(e) {
    var btn = e.target.closest('[data-chat-tab]');
    if (!btn) return;
    var tabId = btn.getAttribute('data-chat-tab');
    if (tabId) switchChatTab(tabId);
    // Re-render location pane for fresh data when switching to it
    if (tabId === 'location' && currentLocationId) {
      renderLocationPane(currentLocationId, currentLocationSkill);
    }
  }

  function toggleChatbox() {
    var chatbox = $('osrs-chatbox');
    var toggle = $('osrs-chatbox-toggle');
    if (!chatbox) return;
    chatbox.classList.toggle('collapsed');
    if (toggle) {
      toggle.innerHTML = chatbox.classList.contains('collapsed') ? '&#9650;' : '&#9660;';
    }
  }

  // ── Side Panel (icon tabs) ──────────────────────
  function switchSideTab(tabId) {
    var panel = $('osrs-side-panel');
    if (!panel) return;
    var allTabs = panel.querySelectorAll('[data-side-tab]');
    for (var i = 0; i < allTabs.length; i++) {
      if (allTabs[i].getAttribute('data-side-tab') === tabId) {
        allTabs[i].classList.add('active');
      } else {
        allTabs[i].classList.remove('active');
      }
    }
    var panes = panel.querySelectorAll('.osrs-side-pane');
    for (var i = 0; i < panes.length; i++) {
      panes[i].style.display = (panes[i].id === 'osrs-side-' + tabId) ? '' : 'none';
    }
    // Auto-expand if collapsed
    panel.classList.remove('collapsed');
    var toggle = $('osrs-side-panel-toggle');
    if (toggle) toggle.innerHTML = '&#9660;';
    // Render pet tab contents when switching to it
    if (tabId === 'pets') renderPetTab();
    else pendingStationLocationId = null; // clear dock-assign mode if switching away
    // Refresh equipment preview when switching to skills tab
    if (tabId === 'skills') renderEquipPanel();
  }

  function onSideTabClick(e) {
    var btn = e.target.closest('[data-side-tab]');
    if (!btn) return;
    var tabId = btn.getAttribute('data-side-tab');
    if (tabId) switchSideTab(tabId);
  }

  function toggleSidePanel() {
    var panel = $('osrs-side-panel');
    var toggle = $('osrs-side-panel-toggle');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    if (toggle) {
      toggle.innerHTML = panel.classList.contains('collapsed') ? '&#9650;' : '&#9660;';
    }
  }

  // ── Tutorial ─────────────────────────────────
  var TUTORIAL_STEPS = [
    '<strong>Welcome to JackTown!</strong><br><br>Click the world map to walk between locations. Click a location marker to enter it.',
    '<strong>Chatbox &amp; Tabs</strong><br><br>The bottom bar shows game events. Switch tabs for <strong>Quest</strong> progress and <strong>Location</strong> details.',
    '<strong>Side Panel</strong><br><br>Open the icons on the right to manage <strong>Skills</strong>, <strong>Inventory</strong>, <strong>Pets</strong>, and <strong>Milestones</strong>.'
  ];

  function showTutorial() {
    var overlay = $('rpg-tutorial-overlay');
    if (!overlay) return;
    var stepEl = $('rpg-tutorial-step');
    var dotsEl = $('rpg-tutorial-dots');
    var nextBtn = $('rpg-tutorial-next');
    var currentStep = 0;

    function render() {
      stepEl.innerHTML = TUTORIAL_STEPS[currentStep];
      var dots = '';
      for (var i = 0; i < TUTORIAL_STEPS.length; i++) {
        dots += '<span class="rpg-tutorial-dot' + (i === currentStep ? ' active' : '') + '"></span>';
      }
      dotsEl.innerHTML = dots;
      nextBtn.textContent = currentStep === TUTORIAL_STEPS.length - 1 ? "Let's go!" : 'Next';
    }

    overlay.style.display = '';
    render();

    nextBtn.onclick = function () {
      currentStep++;
      if (currentStep >= TUTORIAL_STEPS.length) {
        overlay.style.display = 'none';
        nextBtn.onclick = null;
        // Mark tutorial as seen
        if (activeSlot >= 0 && meta.slots[activeSlot]) {
          meta.slots[activeSlot].tutorialSeen = true;
          saveMeta();
        }
        // Trigger NPC intro after tutorial completes (not on a timer)
        if (activeSlot >= 0 && meta.slots[activeSlot] && !meta.slots[activeSlot].introSeen && centerMode === 'map') {
          setTimeout(startNpcIntro, 500);
        }
      } else {
        render();
      }
    };
  }

  // ── NPC Intro ("The Gatekeeper") ─────────────
  // NPC_COLORS removed — NPCs now use pre-made character sprites
  var npcIntro = null; // { active, phase, pos, dir, frame, timer, speechTimer, done }

  function startNpcIntro() {
    var townLoc = MAP_LOCATIONS.town;
    npcIntro = {
      active: true,
      phase: 'walk-in',  // walk-in → speak → walk-out → done
      pos: { x: townLoc.x + 120, y: townLoc.y + 50 },
      target: { x: townLoc.x + 50, y: townLoc.y + 50 },
      dir: 'left',
      frame: 0,
      animTimer: 0,
      speechTimer: 0,
      speechText: '',
      speechChars: 0,
      done: false
    };
  }

  function updateNpcIntro(dt) {
    if (!npcIntro || !npcIntro.active) return;
    var n = npcIntro;

    if (n.phase === 'walk-in') {
      var dx = n.target.x - n.pos.x;
      var dy = n.target.y - n.pos.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        n.pos.x = n.target.x;
        n.pos.y = n.target.y;
        n.phase = 'speak';
        n.frame = 0;
        n.speechTimer = 0;
        n.speechText = "Oh God, not another one. Welcome to " + KINGDOM_NAME + ", if this is your first time please make your way to the pet store for your complimentary pets.";
        n.speechChars = 0;
        addGameMessage('[The Gatekeeper] ' + n.speechText, 'system');
        return;
      }
      var step = 80 * dt;
      if (step > dist) step = dist;
      n.pos.x += (dx / dist) * step;
      n.pos.y += (dy / dist) * step;
      n.dir = dx > 0 ? 'right' : 'left';
      n.animTimer += dt;
      if (n.animTimer > 0.12) { n.animTimer = 0; n.frame = (n.frame + 1) % CHAR_ANIM_DATA.walk.framesPerDir; }

    } else if (n.phase === 'speak') {
      n.speechTimer += dt;
      n.speechChars = Math.min(Math.floor(n.speechTimer * 30), n.speechText.length);
      // Wait for text + 2s pause
      if (n.speechTimer > n.speechText.length / 30 + 5) {
        n.phase = 'walk-out';
        n.target = { x: MAP_LOCATIONS.town.x + 130, y: MAP_LOCATIONS.town.y + 50 };
        n.speechText = '';
        n.frame = 0;
      }

    } else if (n.phase === 'walk-out') {
      var dx = n.target.x - n.pos.x;
      var dy = n.target.y - n.pos.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        n.active = false;
        npcIntro = null;
        // Start the first quest — only mark introSeen if quest system is ready
        if (window.QuestSystem && window.QuestSystem.canStart('intro-001')) {
          if (activeSlot >= 0 && meta.slots[activeSlot]) {
            meta.slots[activeSlot].introSeen = true;
            saveMeta();
          }
          setTimeout(function () {
            if (window.QuestSystem) window.QuestSystem.startQuest('intro-001');
          }, 500);
        } else if (!window.QuestSystem) {
          // QuestSystem not loaded — mark seen anyway to avoid infinite replays
          if (activeSlot >= 0 && meta.slots[activeSlot]) {
            meta.slots[activeSlot].introSeen = true;
            saveMeta();
          }
        }
        // else: QuestSystem loaded but quest already started/completed — don't re-mark
        return;
      }
      var step = 100 * dt;
      if (step > dist) step = dist;
      n.pos.x += (dx / dist) * step;
      n.pos.y += (dy / dist) * step;
      n.dir = dx > 0 ? 'right' : 'left';
      n.animTimer += dt;
      if (n.animTimer > 0.12) { n.animTimer = 0; n.frame = (n.frame + 1) % CHAR_ANIM_DATA.walk.framesPerDir; }
    }
  }

  function drawNpcIntro(ctx) {
    if (!npcIntro || !npcIntro.active) return;
    var n = npcIntro;
    var npcCharId = n.charId || 'manu'; // NPCs use different pre-made character
    var npcAnimType = (n.phase === 'walk-in' || n.phase === 'walk-out') ? 'walk' : 'idle';
    drawCharSprite(ctx, n.pos.x, n.pos.y, n.dir, n.frame, npcAnimType, npcCharId);

    // Speech bubble
    if (n.phase === 'speak' && n.speechText) {
      var visible = n.speechText.substring(0, n.speechChars);
      if (visible.length > 0) {
        // Word-wrap into lines of ~30 chars
        var words = visible.split(' ');
        var lines = [];
        var line = '';
        for (var w = 0; w < words.length; w++) {
          var test = line ? line + ' ' + words[w] : words[w];
          if (test.length > 30 && line) {
            lines.push(line);
            line = words[w];
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);

        var fontSize = 13;
        var lineHeight = 16;
        ctx.font = fontSize + 'px monospace';
        ctx.textAlign = 'center';
        var maxW = 0;
        for (var li = 0; li < lines.length; li++) {
          var lw = ctx.measureText(lines[li]).width;
          if (lw > maxW) maxW = lw;
        }
        var bw = maxW + 20, bh = lines.length * lineHeight + 14;
        var bx = n.pos.x - bw / 2, by = n.pos.y - CHAR_DRAW_SIZE - bh;

        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#c0a040';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Tail
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.beginPath();
        ctx.moveTo(n.pos.x - 5, by + bh);
        ctx.lineTo(n.pos.x, by + bh + 8);
        ctx.lineTo(n.pos.x + 5, by + bh);
        ctx.fill();

        ctx.fillStyle = '#e0d0a0';
        for (var li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], n.pos.x, by + 16 + li * lineHeight);
        }
      }
    }
  }

  // ── Game Entry ────────────────────────────────
  function enterGame(slot) {
    activeSlot = slot;
    meta.currentSlot = slot;
    currentCharId = getCharAppearance();
    charTintsDirty = true;
    var prevLastPlayed = meta.slots[slot].lastPlayed;
    var isFirstLogin = Math.abs(prevLastPlayed - meta.slots[slot].created) < 2000;
    meta.slots[slot].lastPlayed = Date.now();
    saveMeta();

    // Set up RPG storage key for skills.js
    window.__RPG_STORAGE_KEY = slotStorageKey(slot);

    // Set combat storage key for rpg-combat.js
    setCombatStorageKey();

    // Install per-slot wallet (overrides global Wallet)
    installRpgWallet();

    // Hide the skills-topbar (we use our own topbar)
    var skillsTopbar = document.querySelector('.skills-topbar');
    if (skillsTopbar) skillsTopbar.style.display = 'none';

    // Reveal RPG-mode elements
    var mapBtn = $('rpg-map-nav-btn');
    if (mapBtn) mapBtn.style.display = '';
    var charInfo = $('rpg-char-info');
    if (charInfo) charInfo.style.display = '';

    // Update topbar
    updateTopbar();

    // Update character info in right panel
    updateCharInfo();

    // Set up OSRS floating panel (moves DOM nodes on first call)
    setupOsrsPanel();

    // Clear old game messages (preserve #skills-game-log)
    var gamePane = $('osrs-chat-game');
    if (gamePane) {
      var oldMsgs = gamePane.querySelectorAll('.osrs-game-msg');
      for (var m = 0; m < oldMsgs.length; m++) oldMsgs[m].parentNode.removeChild(oldMsgs[m]);
    }

    // Welcome message as first log entry
    var pName = meta.slots[slot].name;
    if (isFirstLogin) {
      addGameMessage('Welcome to ' + KINGDOM_NAME + ', ' + pName + '. Your adventure begins.', 'system');
    } else if (Date.now() - prevLastPlayed < 300000) {
      addGameMessage('Welcome back to ' + KINGDOM_NAME + ', ' + pName + '.', 'system');
    } else {
      addGameMessage('Welcome back to ' + KINGDOM_NAME + ', ' + pName + '. You last logged in ' + timeAgo(prevLastPlayed) + '.', 'system');
    }

    // Preload pet sprites from per-slot state
    var rpgPetsEntry = getRpgPetState();

    // State migration: ensure pets above starting cap have correct levelCap
    migratePetLevelCaps(rpgPetsEntry);

    if (rpgPetsEntry.follower && rpgPetsEntry.owned[rpgPetsEntry.follower]) {
      loadFollowerSprite(rpgPetsEntry.follower);
    } else {
      followerSpriteSheet = null;
      followerPetId = null;
    }
    preloadAllStationedSprites();

    // Show game screen
    showScreen('rpg-game-screen');

    // Init quest system
    if (window.QuestSystem) {
      window.QuestSystem.init(slot);
    }

    // Render world map in center
    renderWorldMap();

    // Check if player was inside a skill location or town on last session
    var resumeLocId = meta.slots[slot].insideLocation || null;
    var resumeTown = meta.slots[slot].insideTown || false;
    var resumeCasino = meta.slots[slot].insideCasino || false;
    var resumeLoc = null;
    if (resumeLocId && MAP_LOCATIONS[resumeLocId] && MAP_LOCATIONS[resumeLocId].skill) {
      for (var li = 0; li < LOCATIONS.length; li++) {
        if (LOCATIONS[li].id === resumeLocId) { resumeLoc = LOCATIONS[li]; break; }
      }
    }

    if (resumeCasino || resumeTown) {
      // Resume inside town (casino resumes to town — player re-enters casino from there)
      showCenterContent('map');
      window.dispatchEvent(new Event('rpg-skills-init'));
      if (resumeCasino) {
        meta.slots[slot].insideCasino = false;
        saveMeta();
      }
      enterTown(true); // true = skip fade (already loading)
    } else if (resumeLoc) {
      // Go straight into skill view — no map flash, no fade
      showCenterContent('skill');
      window.dispatchEvent(new Event('rpg-skills-init'));
      setTimeout(function () {
        var skillRow = document.querySelector('.skill-row[data-skill="' + resumeLoc.skill + '"]');
        if (skillRow) {
          programmaticSkillClick = true;
          skillRow.click();
          programmaticSkillClick = false;
        }
        renderLocationPane(resumeLoc.id, resumeLoc.skill);
        stopMapLoop();
        setTimeout(function () { renderStationedPetInGameArea(resumeLoc.id); }, 100);
      }, 50);
    } else {
      showCenterContent('map');
      window.dispatchEvent(new Event('rpg-skills-init'));
    }

    // Show tutorial for first-time players (NPC intro triggers after tutorial completes)
    if (isFirstLogin && !meta.slots[slot].tutorialSeen) {
      setTimeout(showTutorial, 600);
    } else if (isFirstLogin && !meta.slots[slot].introSeen) {
      // Tutorial already seen (e.g. page refresh after tutorial) — start NPC intro directly
      setTimeout(function () {
        if (centerMode === 'map') startNpcIntro();
      }, 800);
    } else if (!meta.slots[slot].introSeen) {
      // Fallback: NPC intro was missed (e.g. page refresh during cutscene).
      // Start the quest directly so the player isn't stuck without guidance.
      meta.slots[slot].introSeen = true;
      saveMeta();
      setTimeout(function () {
        if (window.QuestSystem && window.QuestSystem.canStart && window.QuestSystem.canStart('intro-001')) {
          window.QuestSystem.startQuest('intro-001');
        }
      }, 1000);
    }
  }

  // ── Topbar ────────────────────────────────────
  function updateTopbar() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    var slot = meta.slots[activeSlot];
    var nameEl = $('rpg-game-topbar-name');
    var lvlEl = $('rpg-game-topbar-level');
    if (nameEl) nameEl.textContent = slot.name;
    var total = getTotalLevel(activeSlot);
    if (lvlEl) lvlEl.textContent = 'Total Lv: ' + total;
    // Update chatbox skills grid total
    var gridTotal = $('osrs-skills-total');
    if (gridTotal) gridTotal.textContent = 'Total Level: ' + total;
  }

  function updateCharInfo() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    var slot = meta.slots[activeSlot];
    var nameEl = $('rpg-char-name');
    var totalEl = $('rpg-char-total');
    if (nameEl) nameEl.textContent = slot.name;
    if (totalEl) totalEl.textContent = 'Total Lv: ' + getTotalLevel(activeSlot);
    renderEquipPanel();
  }

  // ── Equipment Panel ─────────────────────────
  function renderEquipPanel() {
    // Draw preview canvas
    var canvas = $('rpg-char-preview-canvas');
    if (canvas) {
      drawCharPreview(canvas, currentCharId);
    }

    // Update stats
    var statsEl = $('rpg-equip-stats');
    if (statsEl) {
      var stats = getEquipStats();
      statsEl.textContent = 'ATK: ' + stats.atk + ' \u00B7 DEF: ' + stats.def;
    }

    // Render slot grid
    var grid = $('rpg-equip-grid');
    if (!grid) return;
    var equip = getEquipment();
    var api = window.__RPG_SKILLS_API;
    var slots = grid.querySelectorAll('.rpg-equip-slot');
    for (var i = 0; i < slots.length; i++) {
      var slotEl = slots[i];
      var slotName = slotEl.getAttribute('data-slot');
      var itemName = equip ? equip[slotName] : null;
      slotEl.innerHTML = '';
      slotEl.classList.remove('rpg-equip-filled');

      if (itemName && api) {
        slotEl.classList.add('rpg-equip-filled');
        var iconData = api.getItemIcon(itemName);
        if (iconData) {
          var sprite = api.createSpriteEl(iconData.sheet, iconData.x, iconData.y, 16, 16, 28, 28);
          if (sprite) slotEl.appendChild(sprite);
        }
        slotEl.title = itemName + ' (click to unequip)';
      } else {
        var label = document.createElement('span');
        label.className = 'rpg-equip-empty-label';
        label.textContent = EQUIP_SLOT_LABELS[slotName] || slotName;
        slotEl.appendChild(label);
        slotEl.title = EQUIP_SLOT_LABELS[slotName] || slotName;
      }
    }
  }

  function onEquipSlotClick(e) {
    var slotEl = e.target.closest('.rpg-equip-slot');
    if (!slotEl) return;
    var slotName = slotEl.getAttribute('data-slot');
    var equip = getEquipment();
    if (!equip || !equip[slotName]) return;

    // Unequip: return item to inventory
    var itemName = equip[slotName];
    var api = window.__RPG_SKILLS_API;
    if (api) api.unequipItem(itemName);
    equip[slotName] = null;
    setEquipment(equip);
    renderEquipPanel();
  }

  function onEquipRequest(e) {
    var itemName = e.detail && e.detail.item;
    if (!itemName) return;
    var api = window.__RPG_SKILLS_API;
    if (!api) return;
    var data = api.getEquipmentData(itemName);
    if (!data) return;

    var equip = getEquipment();
    if (!equip) return;

    // If slot already occupied, return old item to inventory first
    if (equip[data.slot]) {
      api.unequipItem(equip[data.slot]);
    }

    // Remove new item from inventory and equip it
    if (!api.equipItem(itemName)) return;
    equip[data.slot] = itemName;
    setEquipment(equip);
    renderEquipPanel();
  }

  // ── Canvas World Map ─────────────────────────
  function initMapCanvas() {
    var container = $('rpg-world-map-container');
    if (!container) return;
    // Hide old grid
    var oldGrid = $('rpg-locations-grid');
    if (oldGrid) oldGrid.style.display = 'none';

    // Create canvas if needed
    if (!mapCanvas) {
      mapCanvas = document.createElement('canvas');
      mapCanvas.id = 'rpg-map-canvas';
      mapCanvas.width = MAP_W * 2;
      mapCanvas.height = MAP_H * 2;
      container.appendChild(mapCanvas);
      mapCtx = mapCanvas.getContext('2d');
      mapCtx.imageSmoothingEnabled = false;
      mapCanvas.addEventListener('click', onMapCanvasClick);
    }

    // Set player at saved location or town
    var savedLoc = getSavedPlayerLocation();
    if (savedLoc && MAP_LOCATIONS[savedLoc]) {
      playerPos.x = MAP_LOCATIONS[savedLoc].x;
      playerPos.y = MAP_LOCATIONS[savedLoc].y;
      playerAtLocation = savedLoc;
    } else {
      playerPos.x = MAP_LOCATIONS.town.x;
      playerPos.y = MAP_LOCATIONS.town.y;
      playerAtLocation = 'town';
    }
    playerTarget = null;
    playerDir = 'down';
    playerFrame = 0;
    enterPromptVisible = true;
    lastTimestamp = 0;
    staticDirty = true;
    smokeFrame = 0;
    initAnimatedEffects();

    // Init follower position near player
    followerPos.x = playerPos.x;
    followerPos.y = playerPos.y + FOLLOWER_TRAIL;

    startMapLoop();
  }

  function startMapLoop() {
    if (mapAnimId) return;
    lastTimestamp = 0;
    mapAnimId = requestAnimationFrame(mapLoop);
  }

  function stopMapLoop() {
    if (mapAnimId) {
      cancelAnimationFrame(mapAnimId);
      mapAnimId = null;
    }
  }

  function mapLoop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;

    smokeFrame++;
    updatePlayer(dt);
    updateFollowerPosition(dt);
    updateNpcIntro(dt);
    drawMap();

    mapAnimId = requestAnimationFrame(mapLoop);
  }

  // ── Player Movement ────────────────────────────
  function updatePlayer(dt) {
    // Idle animation when not moving
    if (!playerTarget) {
      playerAnimTimer += dt;
      if (playerAnimTimer > 0.3) {
        playerAnimTimer = 0;
        playerFrame = (playerFrame + 1) % CHAR_ANIM_DATA.idle.framesPerDir;
      }
      return;
    }

    var dx = playerTarget.x - playerPos.x;
    var dy = playerTarget.y - playerPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      // Arrived
      playerPos.x = playerTarget.x;
      playerPos.y = playerTarget.y;
      playerTarget = null;
      playerFrame = 0;

      // Check which location we're at
      playerAtLocation = null;
      for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
        var loc = MAP_LOCATIONS[MAP_LOC_ORDER[i]];
        var ldx = playerPos.x - loc.x;
        var ldy = playerPos.y - loc.y;
        if (Math.sqrt(ldx * ldx + ldy * ldy) < 10) {
          playerAtLocation = MAP_LOC_ORDER[i];
          break;
        }
      }
      if (playerAtLocation) {
        var arrivalName = MAP_LOCATIONS[playerAtLocation].name;
        var flavor = LOCATION_FLAVOR[playerAtLocation] || '';
        addGameMessage('You arrive at ' + arrivalName + '. ' + flavor, 'arrival');
      }
      enterPromptVisible = !!playerAtLocation;
      savePlayerLocation();
      return;
    }

    // Determine direction
    if (Math.abs(dx) > Math.abs(dy)) {
      playerDir = dx > 0 ? 'right' : 'left';
    } else {
      playerDir = dy > 0 ? 'down' : 'up';
    }

    // Move
    var step = PLAYER_SPEED * dt;
    if (step > dist) step = dist;
    playerPos.x += (dx / dist) * step;
    playerPos.y += (dy / dist) * step;

    // Animate walk (6 frames per direction)
    playerAnimTimer += dt;
    if (playerAnimTimer > 0.12) {
      playerAnimTimer = 0;
      playerFrame = (playerFrame + 1) % CHAR_ANIM_DATA.walk.framesPerDir;
    }

    enterPromptVisible = false;
  }

  // ── Terrain Hash ─────────────────────────────────
  function tileHash(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return h;
  }

  // ── Pre-render Static Buffer ───────────────────
  function renderStaticBuffer() {
    if (!staticBuffer) {
      staticBuffer = document.createElement('canvas');
      staticBuffer.width = MAP_W;
      staticBuffer.height = MAP_H;
      staticBufferCtx = staticBuffer.getContext('2d');
    }
    var ctx = staticBufferCtx;
    drawTerrain(ctx);
    drawRiver(ctx);
    drawPaths(ctx);
    drawForestBorder(ctx);
    drawDecorations(ctx);
    drawStaticLocationParts(ctx);
    drawMapBorder(ctx);
    staticDirty = false;
  }

  // ── Drawing ─────────────────────────────────────
  function drawMap() {
    var ctx = mapCtx;
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);

    // Blit static buffer
    if (staticDirty) renderStaticBuffer();
    ctx.drawImage(staticBuffer, 0, 0);

    // Animated elements on top
    drawAnimatedWater(ctx);
    drawAnimatedEffects(ctx);
    drawAnimatedLocationParts(ctx);
    drawStationedPets(ctx);
    drawFollower(ctx);
    drawPlayer(ctx);
    drawNpcIntro(ctx);
    drawLocationLabels(ctx);
    if (enterPromptVisible && playerAtLocation && !npcIntro) {
      drawEnterPrompt(ctx);
    }
    drawPetSpeechBubble(ctx);
    // Redraw border on top of everything
    drawMapBorder(ctx);

    ctx.restore();
  }

  // ── Terrain ─────────────────────────────────────
  function drawTerrain(ctx) {
    var TILE = BIOME_TILE;
    var cols = Math.ceil(MAP_W / TILE);
    var rows = Math.ceil(MAP_H / TILE);

    // Build biome index map if needed
    if (!biomeIndexMap) buildBiomeIndexMap();

    // Pass 1: Biome-aware base grass + sub-tile texture
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c, r);
        var biome = biomeIndexMap[r * cols + c] || 'grass';
        var pal = BIOME_PALETTES[biome] || BIOME_PALETTES.grass;
        ctx.fillStyle = pal.base[((h >>> 0) % 4)];
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        // Sub-tile texture
        var tx = c * TILE, ty = r * TILE;
        var h2 = tileHash(c + 200, r + 200);
        // Grass blade shadow (1x2px)
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(tx + ((h >>> 4) % 6), ty + ((h >>> 8) % 5), 1, 2);
        if ((h2 >>> 0) % 3 === 0) {
          ctx.fillRect(tx + ((h2 >>> 4) % 6) + 1, ty + ((h2 >>> 8) % 5), 1, 2);
        }
        // Dew highlight (1x1px)
        if ((h >>> 16) % 4 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tx + ((h >>> 12) % 7), ty + ((h >>> 14) % 6), 1, 1);
        }
        // Clover patch (2x1px)
        if ((h2 >>> 12) % 5 === 0) {
          ctx.fillStyle = 'rgba(20,60,15,0.12)';
          ctx.fillRect(tx + ((h2 >>> 16) % 5), ty + ((h2 >>> 18) % 6), 2, 1);
        }
      }
    }

    // Pass 1.5: Smooth biome transitions — feather edges where weight is low
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var w = biomeWeightMap[r * cols + c];
        if (w > 0 && w < 0.4) {
          var grassPal = BIOME_PALETTES.grass;
          ctx.fillStyle = grassPal.base[((tileHash(c + 300, r + 300) >>> 0) % 4)];
          ctx.globalAlpha = 0.3 * (1 - w / 0.4);
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Pass 2: Grass clumping (1-in-2 tiles, denser alpha + secondary accent dots)
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 500, r + 500);
        if ((h >>> 0) % 2 !== 0) continue;
        var bright = ((h >>> 4) & 1) === 0;
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
        var cx = c * TILE + ((h >>> 8) % 4);
        var cy = r * TILE + ((h >>> 12) % 4);
        ctx.fillRect(cx, cy, 4, 4);
        // Secondary 2x2 accent dot
        if ((h >>> 16) % 3 === 0) {
          ctx.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(cx + 3, cy + 3, 2, 2);
        }
      }
    }

    // Pass 3: Biome detail overlay (1-in-3, expanded patterns)
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 1000, r + 1000);
        if ((h >>> 0) % 3 !== 0) continue;
        var biome = biomeIndexMap[r * cols + c] || 'grass';
        var px = c * TILE + ((h >>> 4) % 6);
        var py = r * TILE + ((h >>> 8) % 6);
        if (biome === 'town') {
          // Cobblestone dots + mortar lines
          ctx.fillStyle = 'rgba(120,110,90,0.3)';
          ctx.fillRect(px, py, 3, 3);
          ctx.fillStyle = 'rgba(160,150,130,0.2)';
          ctx.fillRect(px + 1, py, 1, 1);
          if ((h >>> 12) % 2 === 0) {
            ctx.fillStyle = 'rgba(80,70,50,0.15)';
            ctx.fillRect(px, py + 3, 4, 1);
          }
        } else if (biome === 'mine') {
          // Gravel + specular highlight
          ctx.fillStyle = 'rgba(100,100,100,0.25)';
          ctx.fillRect(px, py, 2, 2);
          if ((h >>> 12) % 3 === 0) {
            ctx.fillStyle = 'rgba(180,180,180,0.15)';
            ctx.fillRect(px, py, 1, 1);
          }
        } else if (biome === 'dock') {
          // Sand patches + wave ripple
          ctx.fillStyle = 'rgba(200,180,120,0.2)';
          ctx.fillRect(px, py, 3, 2);
          if ((h >>> 12) % 3 === 0) {
            ctx.fillStyle = 'rgba(160,200,220,0.1)';
            ctx.fillRect(px, py + 2, 4, 1);
          }
        } else if (biome === 'forest') {
          // Moss + needle texture
          ctx.fillStyle = 'rgba(30,80,20,0.2)';
          ctx.fillRect(px, py, 3, 3);
          if ((h >>> 12) % 2 === 0) {
            ctx.fillStyle = 'rgba(20,50,10,0.15)';
            ctx.fillRect(px + 1, py, 1, 2);
            ctx.fillRect(px + 3, py + 1, 1, 2);
          }
        } else if (biome === 'smithy') {
          // Soot + ember specks
          ctx.fillStyle = 'rgba(60,50,40,0.15)';
          ctx.fillRect(px, py, 2, 2);
          if ((h >>> 12) % 4 === 0) {
            ctx.fillStyle = 'rgba(200,80,20,0.12)';
            ctx.fillRect(px + 1, py, 1, 1);
          }
        } else if (biome === 'arena') {
          // Pebbles + drag marks
          ctx.fillStyle = 'rgba(140,120,80,0.2)';
          ctx.fillRect(px, py, 2, 1);
          if ((h >>> 12) % 3 === 0) {
            ctx.fillStyle = 'rgba(100,80,50,0.1)';
            ctx.fillRect(px, py, 4, 1);
          }
        }
      }
    }

    // Pass 3.5: Light direction — subtle top-left highlight, bottom-right shadow
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if ((tileHash(c + 1500, r + 1500) >>> 0) % 6 !== 0) continue;
        var tx = c * TILE, ty = r * TILE;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(tx, ty, TILE, 1);
        ctx.fillRect(tx, ty, 1, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(tx, ty + TILE - 1, TILE, 1);
        ctx.fillRect(tx + TILE - 1, ty, 1, TILE);
      }
    }

    // Pass 3.7: Micro-vegetation — tiny dark green dots simulating individual grass tufts
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 2000, r + 2000);
        if ((h >>> 0) % 4 !== 0) continue;
        var biome = biomeIndexMap[r * cols + c] || 'grass';
        if (biome !== 'grass' && biome !== 'forest' && biome !== 'dock') continue;
        var tx = c * TILE, ty = r * TILE;
        ctx.fillStyle = biome === 'forest' ? 'rgba(15,50,10,0.12)' : 'rgba(25,55,15,0.1)';
        ctx.fillRect(tx + ((h >>> 4) % 6), ty + ((h >>> 8) % 6), 1, 2);
        // Second tuft on some tiles
        if ((h >>> 12) % 3 === 0) {
          ctx.fillRect(tx + ((h >>> 14) % 5) + 2, ty + ((h >>> 16) % 5), 1, 1);
        }
      }
    }

    // Pass 4: Soft edge vignette
    var grad;
    // Top
    grad = ctx.createLinearGradient(0, 0, 0, 18);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_W, 18);
    // Bottom
    grad = ctx.createLinearGradient(0, MAP_H - 18, 0, MAP_H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, MAP_H - 18, MAP_W, 18);
    // Left
    grad = ctx.createLinearGradient(0, 0, 18, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 18, MAP_H);
    // Right
    grad = ctx.createLinearGradient(MAP_W - 18, 0, MAP_W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(MAP_W - 18, 0, 18, MAP_H);

    // Corner darkening — corners slightly darker than edges for natural framing
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI / 2);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(MAP_W, 0, 40, Math.PI / 2, Math.PI);
    ctx.lineTo(MAP_W, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, MAP_H, 40, -Math.PI / 2, 0);
    ctx.lineTo(0, MAP_H);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(MAP_W, MAP_H, 40, Math.PI, Math.PI * 1.5);
    ctx.lineTo(MAP_W, MAP_H);
    ctx.fill();

    // Water body near Fishing Dock — deep outer
    ctx.fillStyle = '#1e5888';
    ctx.fillRect(820, 180, 220, 150);
    // Sand beach border
    ctx.fillStyle = '#c8b478';
    ctx.fillRect(816, 176, 228, 4);
    ctx.fillRect(816, 330, 228, 4);
    ctx.fillRect(816, 176, 4, 158);
    ctx.fillRect(1040, 176, 4, 158);
    // Main water
    ctx.fillStyle = '#2868a8';
    ctx.fillRect(824, 184, 212, 142);
    // Lighter center
    ctx.fillStyle = '#3078b8';
    ctx.fillRect(840, 200, 180, 110);
  }

  // ── River (static layer) ────────────────────────
  function drawRiver(ctx) {
    var riverWidth = 40;
    var bankWidth = 6;

    // Draw river from top to bottom with irregular banks + 5-band water
    for (var y = 0; y < MAP_H; y += 2) {
      var rx = getRiverX(y);
      var h = tileHash(Math.floor(rx), y);
      // Bank jitter ±2px per scanline
      var jitterL = ((h >>> 0) % 5) - 2;
      var jitterR = ((h >>> 4) % 5) - 2;

      // Grass overhang at outer edge (1-in-3 chance)
      if ((h >>> 20) % 3 === 0) {
        ctx.fillStyle = '#3a7a32';
        ctx.fillRect(rx - riverWidth / 2 - bankWidth + jitterL - 2, y, 2, 2);
      }
      if ((h >>> 22) % 3 === 0) {
        ctx.fillStyle = '#3a7a32';
        ctx.fillRect(rx + riverWidth / 2 + bankWidth + jitterR, y, 2, 2);
      }

      // Sandy outer bank
      ctx.fillStyle = '#c8b478';
      ctx.fillRect(rx - riverWidth / 2 - bankWidth + jitterL, y, riverWidth + bankWidth * 2 - jitterL + jitterR, 2);

      // Erosion mud line at water edge
      ctx.fillStyle = '#7a6840';
      ctx.fillRect(rx - riverWidth / 2 + jitterL, y, 2, 2);
      ctx.fillRect(rx + riverWidth / 2 + jitterR - 2, y, 2, 2);

      // Pebble scatter on banks
      if ((h >>> 8) % 6 === 0) {
        ctx.fillStyle = '#a09060';
        ctx.fillRect(rx - riverWidth / 2 - bankWidth + jitterL + ((h >>> 12) % bankWidth), y, 2, 2);
      }
      if ((h >>> 14) % 6 === 0) {
        ctx.fillStyle = '#a09060';
        ctx.fillRect(rx + riverWidth / 2 + jitterR + ((h >>> 16) % bankWidth), y, 2, 2);
      }

      // 5-band water gradient (deep outer → light center)
      var hw = riverWidth / 2;
      ctx.fillStyle = '#1a4870';
      ctx.fillRect(rx - hw, y, riverWidth, 2);
      ctx.fillStyle = '#1e5888';
      ctx.fillRect(rx - hw + 4, y, riverWidth - 8, 2);
      ctx.fillStyle = '#2868a8';
      ctx.fillRect(rx - hw + 8, y, riverWidth - 16, 2);
      ctx.fillStyle = '#3078b8';
      ctx.fillRect(rx - hw + 13, y, riverWidth - 26, 2);
      ctx.fillStyle = '#3888c8';
      ctx.fillRect(rx - hw + 17, y, riverWidth - 34, 2);

      // Surface ripple texture every ~4th scanline
      if (y % 8 === 0) {
        ctx.fillStyle = 'rgba(96,176,224,0.15)';
        var ripOff = ((h >>> 18) % 10) - 5;
        ctx.fillRect(rx + ripOff - 4, y, 8, 1);
      }

      // River bottom stones — visible through lighter water bands
      if (y % 10 === 0 && (h >>> 24) % 3 === 0) {
        ctx.fillStyle = 'rgba(100,90,70,0.08)';
        var stoneOff = ((h >>> 20) % 16) - 8;
        ctx.fillRect(rx + stoneOff, y, 2, 2);
      }

      // Current direction markers — faint angled dashes suggesting flow
      if (y % 16 === 0) {
        ctx.fillStyle = 'rgba(30,60,100,0.04)';
        ctx.fillRect(rx - 4, y, 3, 1);
        ctx.fillRect(rx - 3, y + 1, 3, 1);
      }
    }

    // Reeds along river — 12 positions covering full river
    var reedPositions = [
      { y: 30, side: 1 }, { y: 90, side: -1 }, { y: 150, side: 1 },
      { y: 210, side: -1 }, { y: 280, side: 1 }, { y: 340, side: -1 },
      { y: 400, side: 1 }, { y: 440, side: -1 }, { y: 480, side: 1 },
      { y: 520, side: -1 }, { y: 560, side: 1 }, { y: 610, side: -1 }
    ];
    for (var i = 0; i < reedPositions.length; i++) {
      var rp = reedPositions[i];
      var rrx = getRiverX(rp.y) + rp.side * (riverWidth / 2 + 2);
      var count = 3 + (tileHash(i, 200) % 3);
      for (var j = 0; j < count; j++) {
        var rh = 8 + ((tileHash(i, j + 201) >>> 0) % 6) - 3;
        var lean = ((tileHash(i + 10, j + 202) >>> 0) % 3) - 1;
        // Stalk
        ctx.fillStyle = '#2a5a20';
        ctx.fillRect(rrx + j * 3 - 4 + lean, rp.y - rh, 1, rh);
        // Lighter inner
        ctx.fillStyle = '#3a7a30';
        ctx.fillRect(rrx + j * 3 - 4 + lean, rp.y - rh + 2, 1, rh - 4);
        // Seed head
        ctx.fillStyle = '#5a4a30';
        ctx.fillRect(rrx + j * 3 - 5 + lean, rp.y - rh - 2, 2, 3);
        // Leaf protrusion on some
        if (j % 2 === 0) {
          ctx.fillStyle = '#2a5a20';
          ctx.fillRect(rrx + j * 3 - 3 + lean, rp.y - rh + 3, 2, 1);
        }
      }
    }

    // Lily pads — 6 with vein lines, water shadows, occasional flowers
    var lilyPositions = [
      { y: 80 }, { y: 180 }, { y: 300 }, { y: 400 }, { y: 480 }, { y: 570 }
    ];
    for (var i = 0; i < lilyPositions.length; i++) {
      var lp = lilyPositions[i];
      var lx = getRiverX(lp.y) + ((tileHash(i, 300) % 14) - 7);
      var lh = tileHash(i, 301);
      // Water shadow underneath
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(lx, lp.y + 1, 5, 0, Math.PI * 2);
      ctx.fill();
      // Green pad with V-notch
      ctx.fillStyle = '#2e7a26';
      ctx.beginPath();
      ctx.arc(lx, lp.y, 4, 0.3, Math.PI * 2 - 0.3);
      ctx.lineTo(lx, lp.y);
      ctx.fill();
      // Lighter center
      ctx.fillStyle = '#3a8a30';
      ctx.beginPath();
      ctx.arc(lx, lp.y, 3, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(lx, lp.y);
      ctx.fill();
      // Vein lines
      ctx.fillStyle = '#246a1e';
      ctx.fillRect(lx - 3, lp.y, 3, 1);
      ctx.fillRect(lx, lp.y - 2, 1, 2);
      // Highlight
      ctx.fillStyle = '#4aa040';
      ctx.fillRect(lx - 1, lp.y - 2, 2, 1);
      // Tiny flower on ~30%
      if ((lh >>> 0) % 3 === 0) {
        ctx.fillStyle = '#e050a0';
        ctx.fillRect(lx, lp.y - 3, 2, 2);
        ctx.fillStyle = '#f0e040';
        ctx.fillRect(lx, lp.y - 2, 1, 1);
      }
    }
  }

  // ── Animated Water Ripples ──────────────────────
  function drawAnimatedWater(ctx) {
    var phase = smokeFrame * 0.03;

    // River shimmer — highlights drifting downstream
    for (var i = 0; i < 12; i++) {
      var sy = ((smokeFrame * 0.8 + i * 55) % MAP_H);
      var rx = getRiverX(sy);
      var off = Math.sin(phase + i * 1.7) * 4;
      ctx.globalAlpha = 0.2 + Math.sin(phase + i * 0.9) * 0.1;
      ctx.fillStyle = '#60b0e0';
      ctx.fillRect(rx + off - 6, sy, 12 + (i % 3) * 4, 2);
    }
    ctx.globalAlpha = 1;

    // Dock water ripples (expanded to 15 with wave groups)
    ctx.fillStyle = '#4898d0';
    var ripples = [
      [860, 220, 24], [900, 250, 20], [870, 275, 18],
      [930, 235, 22], [950, 260, 16], [880, 295, 20],
      [840, 240, 16], [920, 280, 18], [870, 310, 14], [950, 300, 20],
      [825, 195, 20], [960, 225, 14], [845, 265, 22], [910, 310, 16], [935, 285, 18]
    ];
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var off = Math.sin(phase + i * 1.3) * 4;
      // Every 3rd ripple slightly larger (wave groups)
      var w = (i % 3 === 0) ? r[2] + 4 : r[2];
      ctx.fillRect(r[0] + off, r[1], w, 2);
    }

    // Light reflections on dock water (expanded to 8)
    for (var i = 0; i < 8; i++) {
      var alpha = 0.08 + Math.sin(phase * 0.7 + i * 1.4) * 0.06;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      var lx = 830 + i * 28 + Math.sin(phase + i * 0.8) * 8;
      var ly = 195 + (i % 4) * 28;
      ctx.fillRect(lx, ly, 5 + (i % 2), 2);
    }
    ctx.globalAlpha = 1;
  }

  // ── Paths ───────────────────────────────────────
  function isNearTown(x, y) {
    var dx = x - MAP_LOCATIONS.town.x, dy = y - MAP_LOCATIONS.town.y;
    return Math.sqrt(dx * dx + dy * dy) < 120;
  }

  function drawPaths(ctx) {
    ctx.lineCap = 'round';

    // Layer 1: dark border
    ctx.strokeStyle = '#6b5030';
    ctx.lineWidth = 16;
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Layer 2: main dirt
    ctx.strokeStyle = '#9b7b4a';
    ctx.lineWidth = 12;
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Layer 3: lighter center
    ctx.strokeStyle = '#b89b6a';
    ctx.lineWidth = 6;
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Cobblestone near town + dirt texture along other paths (doubled density)
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.floor(len / 4);
      for (var j = 0; j < steps; j++) {
        var t = j / steps;
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        var h = tileHash(i * 100 + j, 9999);

        if (isNearTown(px, py)) {
          // Cobblestone — individual stones with mortar gaps
          var stoneGrays = ['#7a7060','#8a8070','#9a9080','#6a6050'];
          var ox = ((h >>> 0) % 7) - 3;
          var oy = ((h >>> 4) % 7) - 3;
          ctx.fillStyle = stoneGrays[((h >>> 8) % 4)];
          ctx.fillRect(px + ox, py + oy, 3, 3);
          // 1px highlight
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(px + ox, py + oy, 3, 1);
          // 1px shadow
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(px + ox, py + oy + 2, 3, 1);
          // Mortar gap lines between stones
          ctx.fillStyle = '#4a4038';
          if ((h >>> 16) % 2 === 0) {
            ctx.fillRect(px + ox + 3, py + oy, 1, 3);
          }
          if ((h >>> 18) % 2 === 0) {
            ctx.fillRect(px + ox, py + oy + 3, 3, 1);
          }
        } else {
          // Dirt pebbles — 2-3 per step with highlight specks
          var ox = ((h >>> 0) % 9) - 4;
          var oy = ((h >>> 8) % 9) - 4;
          ctx.fillStyle = '#8a6b3a';
          ctx.fillRect(px + ox, py + oy, 2, 2);
          // Highlight speck
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(px + ox, py + oy, 1, 1);
          // Second pebble
          if ((h >>> 16) % 2 === 0) {
            var ox2 = ((h >>> 12) % 7) - 3;
            var oy2 = ((h >>> 14) % 7) - 3;
            ctx.fillStyle = '#7a5b2a';
            ctx.fillRect(px + ox2, py + oy2, 2, 1);
          }
        }
      }
    }

    // Wheel ruts — intermittent parallel dark dots along longer segments
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 100) continue;
      var nx = -dy / len, ny = dx / len;
      var steps = Math.floor(len / 6);
      for (var j = 0; j < steps; j++) {
        var h = tileHash(i * 300 + j, 6666);
        if ((h >>> 0) % 3 === 0) continue; // gaps for worn look
        var t = j / steps;
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        ctx.fillStyle = 'rgba(80,60,30,0.15)';
        ctx.fillRect(px + nx * 3, py + ny * 3, 1, 1);
        ctx.fillRect(px - nx * 3, py - ny * 3, 1, 1);
      }
    }

    // Grass tufts along path edges (denser, 5-6 blades with seed heads)
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.floor(len / 12);
      for (var j = 0; j < steps; j++) {
        var t = j / steps;
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        var h = tileHash(i * 200 + j, 7777);
        if ((h >>> 0) % 2 !== 0) continue;
        // Perpendicular offset
        var nx = -dy / len, ny = dx / len;
        var side = ((h >>> 4) & 1) ? 1 : -1;
        var gx = px + nx * side * 8;
        var gy = py + ny * side * 8;
        // 5-6 grass blades
        var bladeCount = 5 + ((h >>> 6) % 2);
        for (var bl = 0; bl < bladeCount; bl++) {
          var blx = gx + bl * 2 - bladeCount;
          var blh = 3 + ((h >>> (bl + 8)) % 3);
          var lean = ((h >>> (bl * 2 + 10)) % 3) - 1;
          ctx.fillStyle = '#3a8a32';
          ctx.fillRect(blx + lean, gy - blh, 1, blh);
          // Lighter tip
          ctx.fillStyle = '#5ab050';
          ctx.fillRect(blx + lean, gy - blh, 1, 1);
          // Seed head on taller blades
          if (blh >= 5) {
            ctx.fillStyle = '#8a7a40';
            ctx.fillRect(blx + lean, gy - blh - 1, 1, 1);
          }
        }
      }
    }

    // Wooden bridge where mine→forest path crosses river
    var mLoc = MAP_LOCATIONS.mine, fLoc = MAP_LOCATIONS.forest;
    var bDx = fLoc.x - mLoc.x, bDy = fLoc.y - mLoc.y;
    var bLen = Math.sqrt(bDx * bDx + bDy * bDy);
    // Find where this path crosses the river
    for (var t = 0; t < 1; t += 0.02) {
      var bpx = mLoc.x + bDx * t;
      var bpy = mLoc.y + bDy * t;
      if (isOnRiver(bpx, bpy, 20)) {
        // Wider bridge with wood grain detail
        var bw = 32, bh = 20;
        var bx = bpx - bw / 2, by = bpy - bh / 2;
        // Shadow on water below bridge
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(bx + 2, by + bh, bw - 4, 3);
        // Bridge planks
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
        // Plank lines with alternating wood grain
        for (var p = 0; p < bh; p += 4) {
          ctx.fillStyle = '#5a3e1b';
          ctx.fillRect(bx + 1, by + p, bw - 2, 1);
          // Wood grain — alternating 1px lines within plank
          ctx.fillStyle = (p % 8 < 4) ? '#7b5e2b' : '#8b6e3b';
          ctx.fillRect(bx + 2, by + p + 1, bw - 4, 2);
          // Grain detail
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(bx + 4 + (p % 3), by + p + 1, bw - 8, 1);
        }
        // Side rails
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillRect(bx, by + bh - 2, bw, 2);
        // Rail highlight
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(bx + 1, by + 1, bw - 2, 1);
        // Posts
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(bx, by - 4, 3, 6);
        ctx.fillRect(bx + bw - 3, by - 4, 3, 6);
        ctx.fillRect(bx, by + bh - 2, 3, 6);
        ctx.fillRect(bx + bw - 3, by + bh - 2, 3, 6);
        // Nail heads
        ctx.fillStyle = '#555555';
        ctx.fillRect(bx + 1, by + 4, 1, 1);
        ctx.fillRect(bx + bw - 2, by + 4, 1, 1);
        ctx.fillRect(bx + 1, by + bh - 5, 1, 1);
        ctx.fillRect(bx + bw - 2, by + bh - 5, 1, 1);
        break;
      }
    }
  }

  // ── Decorations ─────────────────────────────────
  function drawDecorations(ctx) {
    for (var i = 0; i < MAP_DECO.length; i++) {
      var d = MAP_DECO[i];
      var dx = d[0], dy = d[1], type = d[2];
      var h = tileHash(dx, dy);

      if (type === 0) {
        // Flower — multi-petal with color variant, leaf, petal shading, shadow
        var flowerColors = ['#e84060','#e8a040','#d050d0','#40a0e8'];
        var fc = flowerColors[((h >>> 0) % 4)];
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(dx - 1, dy + 6, 4, 2);
        // Stem
        ctx.fillStyle = '#2d6e28';
        ctx.fillRect(dx + 1, dy + 3, 1, 4);
        // Leaf on stem
        ctx.fillStyle = '#3a8030';
        ctx.fillRect(dx - 1, dy + 4, 2, 1);
        ctx.fillRect(dx + 2, dy + 5, 2, 1);
        // Petals
        ctx.fillStyle = fc;
        ctx.fillRect(dx, dy, 2, 2);
        ctx.fillRect(dx + 2, dy + 1, 2, 2);
        ctx.fillRect(dx, dy + 2, 2, 2);
        ctx.fillRect(dx - 1, dy + 1, 2, 2);
        // Petal shading (darker on bottom petals)
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(dx, dy + 2, 2, 1);
        ctx.fillRect(dx + 2, dy + 2, 1, 1);
        // Center
        ctx.fillStyle = '#f0e040';
        ctx.fillRect(dx + 1, dy + 1, 1, 1);
      } else if (type === 1) {
        // Rock — highlight + shadow + specular + lichen/cracks
        ctx.fillStyle = '#606060';
        ctx.fillRect(dx, dy + 3, 8, 5);
        ctx.fillStyle = '#808080';
        ctx.fillRect(dx + 1, dy + 2, 6, 4);
        ctx.fillStyle = '#999999';
        ctx.fillRect(dx + 2, dy + 1, 4, 3);
        ctx.fillStyle = '#b0b0b0';
        ctx.fillRect(dx + 3, dy, 2, 2);
        // Specular highlight
        ctx.fillStyle = '#d0d0d0';
        ctx.fillRect(dx + 3, dy + 1, 1, 1);
        // Directional shadow (right + bottom)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(dx + 1, dy + 7, 7, 2);
        ctx.fillRect(dx + 7, dy + 3, 2, 4);
        // Crack lines ~30%
        if ((h >>> 4) % 3 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(dx + 2, dy + 3, 1, 3);
          ctx.fillRect(dx + 3, dy + 5, 2, 1);
        }
        // Lichen patches ~40%
        if ((h >>> 6) % 5 < 2) {
          ctx.fillStyle = 'rgba(120,140,60,0.3)';
          ctx.fillRect(dx + 4, dy + 2, 2, 2);
        }
      } else if (type === 2) {
        // Bush with berry dots, more highlights, occasional flower
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(dx - 1, dy + 8, 12, 2);
        ctx.fillStyle = '#1e5e18';
        ctx.fillRect(dx, dy + 3, 10, 6);
        ctx.fillStyle = '#2d7a28';
        ctx.fillRect(dx + 1, dy + 1, 8, 6);
        ctx.fillStyle = '#3a9a34';
        ctx.fillRect(dx + 2, dy, 6, 5);
        ctx.fillStyle = '#4ab044';
        ctx.fillRect(dx + 3, dy + 1, 4, 3);
        // Extra leaf highlights
        ctx.fillStyle = '#58c050';
        ctx.fillRect(dx + 4, dy + 1, 2, 1);
        ctx.fillRect(dx + 2, dy + 3, 1, 1);
        ctx.fillRect(dx + 7, dy + 2, 1, 1);
        // Berry dots
        if ((h & 1) === 0) {
          ctx.fillStyle = '#cc3030';
          ctx.fillRect(dx + 2, dy + 2, 1, 1);
          ctx.fillRect(dx + 6, dy + 3, 1, 1);
          ctx.fillRect(dx + 4, dy + 5, 1, 1);
        }
        // Occasional flower on canopy ~25%
        if ((h >>> 8) % 4 === 0) {
          ctx.fillStyle = '#e8a040';
          ctx.fillRect(dx + 5, dy - 1, 2, 2);
          ctx.fillStyle = '#f0e040';
          ctx.fillRect(dx + 5, dy, 1, 1);
        }
      } else if (type === 3) {
        // Tree (12x18px with trunk, crown, shadow, bark texture, root, fruit)
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(dx - 1, dy + 16, 14, 3);
        // Root protrusions
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx + 2, dy + 16, 2, 2);
        ctx.fillRect(dx + 8, dy + 16, 2, 2);
        // Trunk with bark texture
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx + 4, dy + 10, 4, 8);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx + 4, dy + 10, 2, 8);
        // Bark lines
        ctx.fillStyle = '#3a1a08';
        ctx.fillRect(dx + 5, dy + 12, 1, 2);
        ctx.fillRect(dx + 6, dy + 15, 1, 2);
        // Crown layers
        ctx.fillStyle = '#1e5e18';
        ctx.fillRect(dx, dy + 3, 12, 9);
        ctx.fillStyle = '#2d7a28';
        ctx.fillRect(dx + 1, dy + 1, 10, 8);
        ctx.fillStyle = '#3a9a34';
        ctx.fillRect(dx + 2, dy, 8, 6);
        ctx.fillStyle = '#4ab044';
        ctx.fillRect(dx + 3, dy + 1, 6, 4);
        // Highlight
        ctx.fillStyle = '#58c050';
        ctx.fillRect(dx + 4, dy + 2, 3, 2);
        // Irregular crown bumps
        ctx.fillStyle = '#2d7a28';
        ctx.fillRect(dx - 1, dy + 4, 2, 3);
        ctx.fillRect(dx + 11, dy + 5, 2, 3);
        ctx.fillRect(dx + 4, dy - 1, 3, 2);
        // Fruit dots ~20%
        if ((h >>> 4) % 5 === 0) {
          ctx.fillStyle = '#cc3030';
          ctx.fillRect(dx + 2, dy + 4, 1, 1);
          ctx.fillRect(dx + 8, dy + 6, 1, 1);
          ctx.fillRect(dx + 5, dy + 8, 1, 1);
        }
      } else if (type === 4) {
        // Mushroom — size variation, more spots, grass at base
        var mScale = ((h >>> 4) % 3 === 0) ? 1.5 : 1;
        var mw = Math.round(4 * mScale), mh = Math.round(5 * mScale);
        // Grass at base
        ctx.fillStyle = '#3a8a32';
        ctx.fillRect(dx - 1, dy + mh - 1, 1, 2);
        ctx.fillRect(dx + mw, dy + mh - 1, 1, 2);
        // Stem
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(dx + Math.round(mScale), dy + Math.round(3 * mScale), Math.round(2 * mScale), Math.round(3 * mScale));
        // Stem highlight
        ctx.fillStyle = '#d8b888';
        ctx.fillRect(dx + Math.round(mScale), dy + Math.round(3 * mScale), 1, Math.round(2 * mScale));
        // Cap
        ctx.fillStyle = '#d03030';
        ctx.fillRect(dx, dy + Math.round(mScale), mw, Math.round(2 * mScale));
        ctx.fillRect(dx + Math.round(mScale), dy, Math.round(2 * mScale), Math.round(mScale));
        // More spots
        ctx.fillStyle = '#f0e0c0';
        ctx.fillRect(dx + Math.round(mScale), dy + Math.round(mScale), 1, 1);
        ctx.fillRect(dx + Math.round(3 * mScale) - 1, dy + Math.round(2 * mScale) - 1, 1, 1);
        if (mScale > 1) {
          ctx.fillRect(dx + 1, dy + 2, 1, 1);
        }
      } else if (type === 5) {
        // Stump (6x4px) with shadow + moss
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(dx - 1, dy + 5, 8, 1);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 2, 6, 3);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx + 1, dy, 4, 3);
        // Ring detail
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(dx + 2, dy + 1, 2, 1);
        // Moss growth ~40%
        if ((h >>> 4) % 5 < 2) {
          ctx.fillStyle = 'rgba(50,120,40,0.25)';
          ctx.fillRect(dx, dy + 1, 2, 2);
        }
      } else if (type === 6) {
        // Signpost (4x10px) with shadow + weathering
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(dx - 1, dy + 11, 5, 1);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx + 1, dy + 3, 2, 8);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx - 1, dy, 6, 3);
        ctx.fillStyle = '#a08858';
        ctx.fillRect(dx, dy + 1, 4, 1);
        // Weathering ~20%
        if ((h >>> 4) % 5 === 0) {
          ctx.fillStyle = 'rgba(40,25,10,0.2)';
          ctx.fillRect(dx + 2, dy + 5, 1, 3);
        }
      } else if (type === 7) {
        // Fence segment (12x6px) with weathering
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 1, 2, 6);
        ctx.fillRect(dx + 10, dy + 1, 2, 6);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx, dy + 2, 12, 2);
        ctx.fillRect(dx, dy + 5, 12, 1);
        ctx.fillStyle = '#a08858';
        ctx.fillRect(dx + 1, dy, 1, 2);
        ctx.fillRect(dx + 11, dy, 1, 2);
        // Weathering cracks ~20%
        if ((h >>> 4) % 5 === 0) {
          ctx.fillStyle = 'rgba(30,15,5,0.2)';
          ctx.fillRect(dx + 5, dy + 2, 1, 2);
        }
        // Moss at base ~30%
        if ((h >>> 8) % 3 === 0) {
          ctx.fillStyle = 'rgba(50,100,40,0.2)';
          ctx.fillRect(dx, dy + 6, 3, 1);
        }
      } else if (type === 8) {
        // Tall grass — 5-6 blades, variable heights 4-8px, seed heads, curved tips
        var blades = 5 + ((h >>> 0) % 2);
        for (var b = 0; b < blades; b++) {
          var bx = dx + b * 2 - 3;
          var bladeH = 4 + ((h >>> (b * 3)) % 5);
          var lean = ((h >>> (b * 2 + 8)) % 3) - 1;
          // Main blade
          ctx.fillStyle = '#3a8a32';
          ctx.fillRect(bx + lean, dy + 8 - bladeH, 1, bladeH);
          // Curved tip (shifted 1px at top)
          ctx.fillStyle = '#5ab050';
          ctx.fillRect(bx + lean + ((b % 2) ? 1 : -1), dy + 8 - bladeH, 1, 1);
          ctx.fillRect(bx + lean, dy + 8 - bladeH, 1, 2);
          // Seed head on tallest blades
          if (bladeH >= 7) {
            ctx.fillStyle = '#8a7a40';
            ctx.fillRect(bx + lean, dy + 8 - bladeH - 1, 1, 1);
          }
        }
      } else if (type === 9) {
        // Boulder formation — 2-3 clustered rocks with crack detail, lichen, pebble scatter
        var count = 2 + ((h >>> 0) % 2);
        // Ground pebble scatter
        ctx.fillStyle = '#707070';
        ctx.fillRect(dx - 2, dy + 12, 2, 1);
        ctx.fillRect(dx + count * 7 + 2, dy + 10, 1, 1);
        ctx.fillRect(dx + 4, dy + 14, 1, 1);
        for (var b = 0; b < count; b++) {
          var bx = dx + b * 7;
          var by = dy + ((h >>> (b * 4)) % 4);
          var sz = 6 + ((h >>> (b * 2 + 8)) % 4);
          ctx.fillStyle = '#505050';
          ctx.fillRect(bx, by + 2, sz, sz - 2);
          ctx.fillStyle = '#686868';
          ctx.fillRect(bx + 1, by + 1, sz - 2, sz - 2);
          ctx.fillStyle = '#808080';
          ctx.fillRect(bx + 2, by, sz - 4, sz - 3);
          // Highlight
          ctx.fillStyle = '#a0a0a0';
          ctx.fillRect(bx + 2, by, 2, 2);
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(bx + 1, by + sz - 1, sz - 1, 2);
          ctx.fillRect(bx + sz - 1, by + 2, 2, sz - 3);
          // Crack detail
          if ((h >>> (b + 14)) % 3 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(bx + 3, by + 2, 1, sz - 4);
          }
          // Lichen
          if ((h >>> (b + 18)) % 3 === 0) {
            ctx.fillStyle = 'rgba(120,140,60,0.25)';
            ctx.fillRect(bx + 1, by + 1, 2, 2);
          }
        }
      } else if (type === 10) {
        // Fallen log — horizontal cylinder with ring detail
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx, dy + 2, 18, 5);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx + 1, dy + 1, 16, 5);
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(dx + 2, dy + 2, 14, 3);
        // Ring detail at ends
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(dx, dy + 2, 2, 4);
        ctx.fillRect(dx + 1, dy + 3, 1, 2);
        // Moss patches
        ctx.fillStyle = '#3a8a30';
        ctx.fillRect(dx + 6, dy + 1, 3, 2);
        ctx.fillRect(dx + 12, dy, 2, 2);
      } else if (type === 11) {
        // Wildflower patch — cluster of 5-8 tiny multi-color flowers
        var fCount = 5 + ((h >>> 0) % 4);
        var fColors = ['#e84060','#e8a040','#d050d0','#40a0e8','#f0e040','#e06080','#50c0a0'];
        for (var f = 0; f < fCount; f++) {
          var fx = dx + ((h >>> (f * 3)) % 12) - 2;
          var fy = dy + ((h >>> (f * 3 + 1)) % 8) - 2;
          ctx.fillStyle = fColors[((h >>> (f + 4)) % fColors.length)];
          ctx.fillRect(fx, fy, 2, 2);
          // Tiny green stem
          ctx.fillStyle = '#3a8030';
          ctx.fillRect(fx, fy + 2, 1, 2);
        }
      } else if (type === 12) {
        // Lantern — iron bracket, post, glass pane detail, ground shadow
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(dx - 2, dy + 12, 6, 2);
        // Post
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 4, 2, 8);
        // Iron bracket
        ctx.fillStyle = '#555555';
        ctx.fillRect(dx - 2, dy + 2, 6, 1);
        ctx.fillRect(dx - 2, dy + 2, 1, 3);
        ctx.fillRect(dx + 3, dy + 2, 1, 3);
        // Post cap
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx - 1, dy + 3, 4, 2);
        // Glass housing with pane detail
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(dx - 1, dy - 1, 4, 4);
        ctx.fillStyle = '#f0d060';
        ctx.fillRect(dx, dy, 2, 2);
        // Glass pane cross
        ctx.fillStyle = '#a08030';
        ctx.fillRect(dx - 1, dy + 1, 4, 1);
        ctx.fillRect(dx, dy - 1, 1, 4);
      } else if (type === 13) {
        // Hay bale — golden cylinder with straw texture
        ctx.fillStyle = '#b89840';
        ctx.fillRect(dx, dy + 2, 10, 6);
        ctx.fillStyle = '#c8a850';
        ctx.fillRect(dx + 1, dy + 1, 8, 6);
        ctx.fillStyle = '#d8b860';
        ctx.fillRect(dx + 2, dy + 2, 6, 4);
        // Straw lines
        ctx.fillStyle = '#a08830';
        ctx.fillRect(dx + 3, dy + 1, 1, 6);
        ctx.fillRect(dx + 6, dy + 1, 1, 6);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(dx + 1, dy + 7, 9, 2);
      } else if (type === 14) {
        // Reed cluster — 4-5 dark green verticals with seed heads
        var rCount = 4 + ((h >>> 0) % 2);
        for (var r = 0; r < rCount; r++) {
          var rx = dx + r * 3;
          var rh = 8 + ((h >>> (r * 2)) % 4);
          ctx.fillStyle = '#2a5a20';
          ctx.fillRect(rx, dy + 12 - rh, 1, rh);
          // Seed head
          ctx.fillStyle = '#5a4a30';
          ctx.fillRect(rx - 1, dy + 12 - rh - 2, 2, 3);
        }
      } else if (type === 15) {
        // Puddle — 6x3px reflective water
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(dx - 1, dy + 3, 8, 1);
        ctx.fillStyle = '#3888c8';
        ctx.fillRect(dx, dy, 6, 3);
        ctx.fillStyle = '#4898d8';
        ctx.fillRect(dx + 1, dy + 1, 4, 1);
        // Reflection highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(dx + 2, dy, 2, 1);
      } else if (type === 16) {
        // Cart tracks — parallel rut lines
        ctx.fillStyle = 'rgba(80,60,30,0.2)';
        ctx.fillRect(dx, dy, 12, 1);
        ctx.fillRect(dx, dy + 3, 12, 1);
        // Disturbed earth between ruts
        ctx.fillStyle = 'rgba(100,80,40,0.1)';
        ctx.fillRect(dx + 2, dy + 1, 8, 2);
      } else if (type === 17) {
        // Fallen leaves — 4-6 autumn-color 1x1px dots
        var leafColors = ['#c06030','#d08040','#b05020','#d0a050','#a04020','#c07030'];
        var leafCount = 4 + ((h >>> 0) % 3);
        for (var fl = 0; fl < leafCount; fl++) {
          var flx = dx + ((h >>> (fl * 3 + 2)) % 8);
          var fly = dy + ((h >>> (fl * 3 + 4)) % 6);
          ctx.fillStyle = leafColors[((h >>> (fl + 8)) % leafColors.length)];
          ctx.fillRect(flx, fly, 1, 1);
          // Occasional 2x1 leaf
          if (fl % 3 === 0) ctx.fillRect(flx + 1, fly, 1, 1);
        }
      } else if (type === 18) {
        // Stone scatter — 3-5 grey dots
        var stoneCount = 3 + ((h >>> 0) % 3);
        var stoneShades = ['#707070','#808080','#686868','#909090','#606060'];
        for (var st = 0; st < stoneCount; st++) {
          var stx = dx + ((h >>> (st * 3 + 2)) % 10);
          var sty = dy + ((h >>> (st * 3 + 4)) % 6);
          ctx.fillStyle = stoneShades[((h >>> (st + 12)) % stoneShades.length)];
          ctx.fillRect(stx, sty, 2, 1);
          // Highlight on top
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(stx, sty, 1, 1);
        }
      }
    }
  }

  // ── Forest Border ──────────────────────────────
  function drawForestBorder(ctx) {
    var trees = generateForestBorder();
    var canopyGreens = [
      ['#1a5a14','#246e1e','#2e8228','#389632'],
      ['#1e5e18','#287228','#328632','#3c9a3c'],
      ['#165212','#206a1c','#2a7e26','#349230'],
      ['#1a5816','#247020','#2e842a','#389834']
    ];

    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      var pal = canopyGreens[t.variant];
      var tx = t.x, ty = t.y;
      var h = tileHash(tx, ty);
      // Depth variation scale (0.8 - 1.2)
      var scale = 0.8 + ((h >>> 0) % 5) * 0.1;

      // Ground shadow ellipse
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(tx, ty + 32 * scale, 18 * scale, 5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thicker trunk with bark texture + knot holes (8-10px wide)
      var trunkW = Math.round((8 + ((h >>> 4) % 3)) * scale);
      var trunkH = Math.round(18 * scale);
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(tx - trunkW / 2, ty + 14 * scale, trunkW, trunkH);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tx - trunkW / 2 + 1, ty + 14 * scale, trunkW - 2, trunkH);
      // 4-5 bark texture lines
      ctx.fillStyle = '#3a1a08';
      var barkLines = 4 + ((h >>> 8) % 2);
      for (var bl = 0; bl < barkLines; bl++) {
        var blY = ty + (15 + bl * 4) * scale;
        var blX = tx - trunkW / 2 + 1 + ((h >>> (bl * 2 + 10)) % (trunkW - 2));
        ctx.fillRect(blX, blY, 1, 2 + ((h >>> (bl + 16)) % 2));
      }
      // Knot hole on ~30% of trees
      if ((h >>> 20) % 3 === 0) {
        ctx.fillStyle = '#2a1008';
        ctx.fillRect(tx - 1, ty + 22 * scale, 2, 2);
      }

      // Root protrusions at trunk base
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(tx - trunkW / 2 - 2, ty + (14 + trunkH - 2) * scale, 2, 2);
      ctx.fillRect(tx + trunkW / 2, ty + (14 + trunkH - 2) * scale, 2, 2);

      // Large round canopy — 4 layers
      var cxr = [20, 16, 12, 7];
      var cyr = [16, 13, 10, 6];
      var cyOff = [6, 5, 4, 2];
      var cxOff = [0, 0, 0, -2];
      for (var layer = 0; layer < 4; layer++) {
        ctx.fillStyle = pal[layer];
        ctx.beginPath();
        ctx.ellipse(tx + cxOff[layer] * scale, ty + cyOff[layer] * scale, cxr[layer] * scale, cyr[layer] * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Irregular canopy bumps (6-10 random rects around perimeter)
      var bumpCount = 6 + ((h >>> 22) % 5);
      for (var b = 0; b < bumpCount; b++) {
        var angle = (b / bumpCount) * Math.PI * 2;
        var bumpR = (18 + ((h >>> (b + 5)) % 4)) * scale;
        var bx = tx + Math.cos(angle) * bumpR;
        var by = ty + 6 * scale + Math.sin(angle) * bumpR * 0.8;
        var bsz = Math.round((3 + ((h >>> (b * 2)) % 3)) * scale);
        ctx.fillStyle = pal[((h >>> (b + 12)) % 2)];
        ctx.fillRect(bx - bsz / 2, by - bsz / 2, bsz, bsz);
      }

      // Branch protrusions (1-2 per tree)
      var branchCount = 1 + ((h >>> 24) % 2);
      for (var br = 0; br < branchCount; br++) {
        var brSide = (br === 0) ? -1 : 1;
        var brY = ty + (8 + br * 6) * scale;
        var brLen = Math.round((6 + ((h >>> (br + 26)) % 4)) * scale);
        // Branch stub
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(tx + brSide * 16 * scale, brY, brLen * brSide, Math.round(2 * scale));
        // Leaf cluster at end
        ctx.fillStyle = pal[1];
        var leafX = tx + brSide * (16 + brLen) * scale;
        ctx.fillRect(leafX - 2 * scale, brY - 2 * scale, 4 * scale, 4 * scale);
        ctx.fillStyle = pal[2];
        ctx.fillRect(leafX - 1 * scale, brY - 1 * scale, 2 * scale, 2 * scale);
      }
    }
  }

  // ── Location Markers (static parts) ─────────────
  function drawStaticLocationParts(ctx) {
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      drawLocationMarkerStatic(ctx, id, loc.x, loc.y);
    }
  }

  function drawLocationMarkerStatic(ctx, id, x, y) {
    var ox = x - 28, oy = y - 32;
    if (id === 'town') {
      // ── Town Hub — Thatched-roof cottage (~56x48) ───
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox - 2, oy + 44, 60, 6);
      // Cobblestone apron
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(ox + 4, oy + 42, 48, 6);
      ctx.fillStyle = '#9a8a6a';
      var stoneY = oy + 42;
      for (var si = 0; si < 8; si++) {
        ctx.fillRect(ox + 6 + si * 6, stoneY + (si % 2), 4, 3);
      }
      // Stone foundation
      ctx.fillStyle = '#686058';
      ctx.fillRect(ox + 4, oy + 36, 48, 8);
      ctx.fillStyle = '#787068';
      for (var si = 0; si < 6; si++) {
        ctx.fillRect(ox + 6 + si * 8, oy + 37, 6, 3);
        ctx.fillRect(ox + 10 + si * 8, oy + 40, 6, 3);
      }
      // Timber-frame walls
      ctx.fillStyle = '#c8b890';
      ctx.fillRect(ox + 6, oy + 16, 44, 22);
      // Timber frame lines
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 4, oy + 16, 48, 2);
      ctx.fillRect(ox + 4, oy + 35, 48, 2);
      ctx.fillRect(ox + 4, oy + 16, 2, 22);
      ctx.fillRect(ox + 50, oy + 16, 2, 22);
      ctx.fillRect(ox + 26, oy + 16, 2, 22);
      // Wall fill
      ctx.fillStyle = '#d8c8a0';
      ctx.fillRect(ox + 8, oy + 18, 18, 16);
      ctx.fillRect(ox + 28, oy + 18, 22, 16);
      // Thatched roof (5 stepped layers)
      ctx.fillStyle = '#a08030';
      ctx.fillRect(ox - 2, oy + 10, 60, 8);
      ctx.fillStyle = '#b09040';
      ctx.fillRect(ox + 2, oy + 7, 52, 6);
      ctx.fillStyle = '#c0a050';
      ctx.fillRect(ox + 6, oy + 4, 44, 5);
      ctx.fillStyle = '#d0b060';
      ctx.fillRect(ox + 10, oy + 2, 36, 4);
      ctx.fillStyle = '#e0c070';
      ctx.fillRect(ox + 16, oy, 24, 3);
      // Thatch texture
      ctx.fillStyle = '#907020';
      for (var ti = 0; ti < 10; ti++) {
        ctx.fillRect(ox + 4 + ti * 5, oy + 8 + (ti % 2), 3, 1);
      }
      // Arched oak door with iron hinges
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 32, oy + 24, 12, 14);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 33, oy + 25, 10, 12);
      // Door arch
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 34, oy + 23, 8, 2);
      ctx.fillRect(ox + 35, oy + 22, 6, 2);
      // Iron hinges
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 32, oy + 27, 3, 1);
      ctx.fillRect(ox + 32, oy + 33, 3, 1);
      // Door knob
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 41, oy + 31, 2, 2);
      // Shuttered windows (wooden frames + blue glass)
      // Left window
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 10, oy + 22, 12, 8);
      ctx.fillStyle = '#3060a0';
      ctx.fillRect(ox + 11, oy + 23, 10, 6);
      ctx.fillStyle = '#4080c0';
      ctx.fillRect(ox + 12, oy + 24, 4, 2);
      // Window cross
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 16, oy + 23, 1, 6);
      ctx.fillRect(ox + 11, oy + 26, 10, 1);
      // Shutters
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 8, oy + 22, 3, 8);
      ctx.fillRect(ox + 21, oy + 22, 3, 8);
      // Chimney
      ctx.fillStyle = '#686058';
      ctx.fillRect(ox + 40, oy - 8, 7, 12);
      ctx.fillStyle = '#787068';
      ctx.fillRect(ox + 41, oy - 9, 5, 2);
      // Flag pole
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox, oy - 6, 2, 18);
      ctx.fillStyle = '#c04040';
      ctx.fillRect(ox + 2, oy - 6, 8, 5);
      ctx.fillStyle = '#d05050';
      ctx.fillRect(ox + 2, oy - 5, 7, 3);
      // Barrel prop
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 50, oy + 34, 5, 6);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 51, oy + 35, 3, 4);
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 50, oy + 36, 5, 1);
      // Potted plant
      ctx.fillStyle = '#8b5e2b';
      ctx.fillRect(ox + 3, oy + 36, 4, 4);
      ctx.fillStyle = '#3a8a30';
      ctx.fillRect(ox + 3, oy + 33, 4, 4);
      ctx.fillStyle = '#4aa040';
      ctx.fillRect(ox + 4, oy + 34, 2, 2);
      // Flower box under left window
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 9, oy + 30, 14, 3);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 9, oy + 30, 14, 1);
      // Flowers in box
      ctx.fillStyle = '#e84060';
      ctx.fillRect(ox + 10, oy + 28, 2, 2);
      ctx.fillStyle = '#e8a040';
      ctx.fillRect(ox + 14, oy + 28, 2, 2);
      ctx.fillStyle = '#d050d0';
      ctx.fillRect(ox + 18, oy + 28, 2, 2);
      // Green stems
      ctx.fillStyle = '#3a8030';
      ctx.fillRect(ox + 11, oy + 30, 1, 1);
      ctx.fillRect(ox + 15, oy + 30, 1, 1);
      ctx.fillRect(ox + 19, oy + 30, 1, 1);
      // Stepping stones at door
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(ox + 34, oy + 44, 5, 3);
      ctx.fillRect(ox + 36, oy + 47, 4, 2);
      // Wood grain on wall (subtle lines)
      ctx.fillStyle = 'rgba(90,60,20,0.08)';
      ctx.fillRect(ox + 8, oy + 20, 18, 1);
      ctx.fillRect(ox + 8, oy + 24, 18, 1);
      ctx.fillRect(ox + 28, oy + 22, 22, 1);
      ctx.fillRect(ox + 28, oy + 26, 22, 1);
      // Door frame shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(ox + 33, oy + 25, 1, 12);
      ctx.fillRect(ox + 43, oy + 25, 1, 12);
      // Window sill shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(ox + 11, oy + 29, 10, 1);
      // Roof eave shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(ox - 2, oy + 16, 60, 1);
    } else if (id === 'mine') {
      // ── Mining Camp — Mountain with rock strata (~52x44) ───
      // Gravel ground scatter
      ctx.fillStyle = '#6a6a6a';
      ctx.fillRect(ox, oy + 40, 52, 6);
      ctx.fillStyle = '#7a7a7a';
      for (var gi = 0; gi < 10; gi++) {
        ctx.fillRect(ox + 2 + gi * 5, oy + 41 + (gi % 2), 3, 2);
      }
      // Mountain with alternating grey bands (strata)
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 2, oy + 10, 48, 32);
      ctx.fillStyle = '#585858';
      ctx.fillRect(ox + 4, oy + 6, 44, 8);
      ctx.fillStyle = '#686868';
      ctx.fillRect(ox + 8, oy + 2, 36, 8);
      ctx.fillStyle = '#787878';
      ctx.fillRect(ox + 12, oy - 2, 28, 6);
      ctx.fillStyle = '#888888';
      ctx.fillRect(ox + 18, oy - 6, 16, 6);
      // Snow cap
      ctx.fillStyle = '#e0e8f0';
      ctx.fillRect(ox + 20, oy - 8, 12, 4);
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(ox + 22, oy - 9, 8, 3);
      // Rock strata lines
      ctx.fillStyle = '#606060';
      ctx.fillRect(ox + 4, oy + 14, 44, 1);
      ctx.fillRect(ox + 6, oy + 22, 40, 1);
      ctx.fillRect(ox + 4, oy + 30, 44, 1);
      // Arched cave entrance
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(ox + 14, oy + 18, 24, 24);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 12, oy + 24, 28, 18);
      // Cave arch top
      ctx.fillStyle = '#484848';
      ctx.fillRect(ox + 12, oy + 16, 28, 4);
      ctx.fillRect(ox + 14, oy + 14, 24, 4);
      ctx.fillRect(ox + 18, oy + 12, 16, 4);
      // Timber frame
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 12, oy + 18, 3, 24);
      ctx.fillRect(ox + 37, oy + 18, 3, 24);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 14, oy + 16, 24, 3);
      // Hanging lantern
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 25, oy + 17, 1, 3);
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 24, oy + 19, 3, 2);
      // Mine cart on rails
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(ox + 16, oy + 38, 20, 2); // rails
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(ox + 20, oy + 34, 12, 5);
      ctx.fillStyle = '#6a6a6a';
      ctx.fillRect(ox + 21, oy + 33, 10, 4);
      // Ore chunks in cart
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(ox + 22, oy + 32, 3, 2);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 26, oy + 32, 3, 2);
      // Ore pile outside
      ctx.fillStyle = '#7a6a4a';
      ctx.fillRect(ox + 42, oy + 34, 8, 6);
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(ox + 43, oy + 33, 6, 4);
      // Pickaxe
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 6, oy + 16, 2, 14);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 4, oy + 14, 6, 3);
      ctx.fillStyle = '#b8b8b8';
      ctx.fillRect(ox + 5, oy + 14, 4, 2);
      // Stalactites in cave
      ctx.fillStyle = '#484848';
      ctx.fillRect(ox + 16, oy + 16, 2, 4);
      ctx.fillRect(ox + 22, oy + 16, 1, 3);
      ctx.fillRect(ox + 28, oy + 16, 2, 5);
      ctx.fillRect(ox + 33, oy + 16, 1, 3);
      // Depth shadow gradient inside cave
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(ox + 15, oy + 20, 22, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox + 15, oy + 24, 22, 4);
      // Crystal glint inside cave
      ctx.fillStyle = '#60d0f0';
      ctx.fillRect(ox + 18, oy + 28, 1, 1);
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(ox + 32, oy + 30, 1, 1);
      // Scattered rocks outside
      ctx.fillStyle = '#707070';
      ctx.fillRect(ox - 2, oy + 42, 3, 2);
      ctx.fillRect(ox + 48, oy + 40, 2, 2);
      ctx.fillStyle = '#808080';
      ctx.fillRect(ox + 4, oy + 44, 2, 1);
    } else if (id === 'dock') {
      // ── Fishing Dock — Wide plank dock (~52x40) ───
      // Wide planks with alternating shade + gap lines
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 6, oy + 10, 52, 28);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox - 4, oy + 12, 48, 24);
      // Alternating plank shading
      for (var pi = 0; pi < 6; pi++) {
        ctx.fillStyle = (pi % 2 === 0) ? '#7b5e2b' : '#8b6e3b';
        ctx.fillRect(ox - 4, oy + 12 + pi * 4, 48, 4);
        // Gap lines
        ctx.fillStyle = '#4a3010';
        ctx.fillRect(ox - 4, oy + 12 + pi * 4, 48, 1);
      }
      // 4 rope-wrapped posts
      var postXs = [ox - 2, ox + 12, ox + 28, ox + 42];
      for (var pi = 0; pi < 4; pi++) {
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(postXs[pi], oy + 4, 4, 34);
        // Post tops
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(postXs[pi] - 1, oy + 2, 6, 4);
        // Rope wrapping
        ctx.fillStyle = '#c8b478';
        ctx.fillRect(postXs[pi], oy + 10, 4, 1);
        ctx.fillRect(postXs[pi], oy + 14, 4, 1);
      }
      // Fishing hut
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 2, oy + 12, 14, 12);
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 3, oy + 13, 12, 10);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox, oy + 8, 18, 5);
      ctx.fillRect(ox + 2, oy + 6, 14, 4);
      // Hut window
      ctx.fillStyle = '#3868a0';
      ctx.fillRect(ox + 6, oy + 15, 5, 4);
      ctx.fillStyle = '#4888c8';
      ctx.fillRect(ox + 7, oy + 16, 3, 2);
      // Barrel stack with iron bands
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 18, oy + 16, 7, 8);
      ctx.fillRect(ox + 20, oy + 12, 7, 8);
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 18, oy + 18, 7, 1);
      ctx.fillRect(ox + 20, oy + 14, 7, 1);
      // Fishing net draped
      ctx.fillStyle = '#a09878';
      ctx.fillRect(ox + 30, oy + 12, 8, 1);
      ctx.fillRect(ox + 31, oy + 14, 6, 1);
      ctx.fillRect(ox + 32, oy + 16, 4, 1);
      ctx.fillRect(ox + 30, oy + 13, 1, 6);
      ctx.fillRect(ox + 34, oy + 13, 1, 6);
      ctx.fillRect(ox + 38, oy + 13, 1, 4);
      // Improved rowboat with oars
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox - 10, oy + 30, 16, 7);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox - 8, oy + 31, 12, 5);
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 6, oy + 32, 8, 3);
      // Oars
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox - 12, oy + 28, 1, 6);
      ctx.fillRect(ox + 6, oy + 28, 1, 6);
      // Crab trap
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 38, oy + 28, 6, 5);
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 38, oy + 30, 6, 1);
      // Rope coil
      ctx.fillStyle = '#c8b478';
      ctx.fillRect(ox + 36, oy + 24, 5, 3);
      ctx.fillStyle = '#a89458';
      ctx.fillRect(ox + 37, oy + 25, 3, 1);
      // Wood grain on planks (subtle lines)
      ctx.fillStyle = 'rgba(60,30,10,0.1)';
      for (var wg = 0; wg < 5; wg++) {
        ctx.fillRect(ox - 3 + wg * 10, oy + 14 + (wg % 2), 8, 1);
        ctx.fillRect(ox - 2 + wg * 10, oy + 22 + (wg % 2), 6, 1);
      }
      // Seaweed on posts
      ctx.fillStyle = '#1a5a20';
      ctx.fillRect(postXs[0] + 1, oy + 30, 1, 4);
      ctx.fillRect(postXs[0] + 2, oy + 32, 1, 3);
      ctx.fillRect(postXs[3] + 1, oy + 28, 1, 5);
      ctx.fillRect(postXs[3] + 2, oy + 30, 1, 4);
      // Hanging fish
      ctx.fillStyle = '#8090a0';
      ctx.fillRect(ox + 32, oy + 20, 3, 1);
      ctx.fillRect(ox + 33, oy + 21, 2, 1);
      ctx.fillStyle = '#a0b0c0';
      ctx.fillRect(ox + 33, oy + 19, 1, 1);
    } else if (id === 'forest') {
      // ── Lumber Forest — Two full canopy trees (~56x48) ───
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(ox - 4, oy + 42, 64, 6);
      // Left tree — bark-textured trunk
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 2, oy + 16, 7, 26);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 3, oy + 16, 5, 26);
      // Bark texture (alternating dark/light stripes)
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 3, oy + 18, 1, 4);
      ctx.fillRect(ox + 6, oy + 22, 1, 5);
      ctx.fillRect(ox + 4, oy + 28, 1, 4);
      // Knothole
      ctx.fillStyle = '#2a1008';
      ctx.fillRect(ox + 5, oy + 25, 2, 2);
      // Left tree — large crown (4-layer)
      ctx.fillStyle = '#1e5e18';
      ctx.beginPath();
      ctx.ellipse(ox + 5, oy + 10, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d7a28';
      ctx.beginPath();
      ctx.ellipse(ox + 5, oy + 9, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a9a34';
      ctx.beginPath();
      ctx.ellipse(ox + 4, oy + 8, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ab044';
      ctx.beginPath();
      ctx.ellipse(ox + 3, oy + 6, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Right tree — bark-textured trunk
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 36, oy + 14, 7, 28);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 37, oy + 14, 5, 28);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 38, oy + 18, 1, 3);
      ctx.fillRect(ox + 40, oy + 24, 1, 4);
      // Right tree — crown
      ctx.fillStyle = '#1e5e18';
      ctx.beginPath();
      ctx.ellipse(ox + 39, oy + 8, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d7a28';
      ctx.beginPath();
      ctx.ellipse(ox + 39, oy + 7, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a9a34';
      ctx.beginPath();
      ctx.ellipse(ox + 38, oy + 6, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ab044';
      ctx.beginPath();
      ctx.ellipse(ox + 37, oy + 4, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stump with growth rings
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 18, oy + 36, 9, 8);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 19, oy + 34, 7, 4);
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(ox + 20, oy + 35, 5, 2);
      ctx.fillStyle = '#a88858';
      ctx.fillRect(ox + 22, oy + 35, 1, 1);
      // Organized log stack (5-6 logs)
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 14, oy + 42, 14, 4);
      ctx.fillRect(ox + 15, oy + 40, 14, 4);
      ctx.fillRect(ox + 16, oy + 38, 12, 4);
      // Log end rings
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(ox + 15, oy + 43, 2, 2);
      ctx.fillRect(ox + 20, oy + 43, 2, 2);
      ctx.fillRect(ox + 25, oy + 43, 2, 2);
      ctx.fillRect(ox + 16, oy + 41, 2, 2);
      ctx.fillRect(ox + 22, oy + 41, 2, 2);
      ctx.fillRect(ox + 18, oy + 39, 2, 2);
      // Sawbuck
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 32, oy + 36, 2, 10);
      ctx.fillRect(ox + 38, oy + 36, 2, 10);
      ctx.fillRect(ox + 32, oy + 40, 8, 2);
      // Axe leaning on stump
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 28, oy + 30, 2, 12);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 29, oy + 28, 4, 4);
      ctx.fillStyle = '#b8b8b8';
      ctx.fillRect(ox + 30, oy + 29, 2, 2);
      // Wood chip scatter
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 12, oy + 46, 2, 1);
      ctx.fillRect(ox + 30, oy + 44, 2, 1);
      ctx.fillRect(ox + 24, oy + 46, 1, 1);
      // Moss patches
      ctx.fillStyle = '#3a8a30';
      ctx.fillRect(ox + 2, oy + 40, 3, 2);
      ctx.fillRect(ox + 42, oy + 38, 3, 2);
    } else if (id === 'smithy') {
      // ── Smithy — Stone building with forge (~52x44) ───
      // Warm glow aura
      ctx.fillStyle = '#ff8030';
      ctx.globalAlpha = 0.12;
      ctx.fillRect(ox - 6, oy - 6, 64, 56);
      ctx.globalAlpha = 1;
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox - 2, oy + 42, 60, 6);
      // Stone walls — individual blocks in brick pattern
      ctx.fillStyle = '#585858';
      ctx.fillRect(ox + 2, oy + 12, 48, 32);
      var stoneGrays = ['#505050','#585858','#606060'];
      for (var row = 0; row < 8; row++) {
        var stOff = (row % 2) * 4;
        for (var col = 0; col < 6; col++) {
          var gi = (row * 6 + col) % 3;
          ctx.fillStyle = stoneGrays[gi];
          ctx.fillRect(ox + 4 + stOff + col * 8, oy + 14 + row * 4, 6, 3);
          // 1px highlight top
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(ox + 4 + stOff + col * 8, oy + 14 + row * 4, 6, 1);
        }
      }
      // Slate-tile roof (overlapping rows)
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(ox - 2, oy + 6, 56, 8);
      ctx.fillStyle = '#404040';
      ctx.fillRect(ox + 2, oy + 4, 48, 5);
      ctx.fillStyle = '#484848';
      ctx.fillRect(ox + 6, oy + 2, 40, 4);
      // Tile texture
      ctx.fillStyle = '#353535';
      for (var ti = 0; ti < 7; ti++) {
        ctx.fillRect(ox + 2 + ti * 7, oy + 7, 5, 1);
        ctx.fillRect(ox + 5 + ti * 7, oy + 5, 5, 1);
      }
      // Chimney
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 6, oy - 10, 8, 14);
      ctx.fillStyle = '#606060';
      ctx.fillRect(ox + 7, oy - 11, 6, 2);
      // Forge window (glowing)
      ctx.fillStyle = '#ff6020';
      ctx.fillRect(ox + 6, oy + 16, 12, 8);
      ctx.fillStyle = '#ff8040';
      ctx.fillRect(ox + 7, oy + 17, 10, 6);
      ctx.fillStyle = '#ffa060';
      ctx.fillRect(ox + 9, oy + 19, 6, 3);
      // Anvil silhouette inside forge
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(ox + 10, oy + 21, 6, 2);
      ctx.fillRect(ox + 9, oy + 20, 8, 1);
      // Door
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 30, oy + 28, 10, 16);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 31, oy + 29, 8, 14);
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 37, oy + 35, 2, 2);
      // Outdoor anvil (proper shape)
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(ox + 52, oy + 30, 3, 8); // left leg
      ctx.fillRect(ox + 58, oy + 30, 3, 8); // right leg
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 50, oy + 26, 12, 5);
      ctx.fillStyle = '#606060';
      ctx.fillRect(ox + 52, oy + 24, 8, 3);
      ctx.fillStyle = '#707070';
      ctx.fillRect(ox + 53, oy + 24, 6, 2);
      // Weapon rack (3 hanging tools)
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 42, oy + 14, 10, 2);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 43, oy + 16, 1, 8);
      ctx.fillRect(ox + 47, oy + 16, 1, 10);
      ctx.fillRect(ox + 50, oy + 16, 1, 7);
      // Water trough
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox - 4, oy + 34, 8, 5);
      ctx.fillStyle = '#2868a8';
      ctx.fillRect(ox - 3, oy + 35, 6, 3);
      // Coal pile
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 20, oy + 38, 8, 4);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(ox + 21, oy + 37, 6, 3);
      // Bellows
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 18, oy + 16, 6, 4);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 19, oy + 17, 4, 2);
      // Better mortar lines between stones
      ctx.fillStyle = 'rgba(40,36,30,0.15)';
      for (var mr = 0; mr < 8; mr++) {
        ctx.fillRect(ox + 4, oy + 14 + mr * 4 + 3, 48, 1);
      }
      // Hammer resting on outdoor anvil
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 54, oy + 22, 2, 6);
      ctx.fillStyle = '#808080';
      ctx.fillRect(ox + 52, oy + 22, 6, 3);
      ctx.fillStyle = '#909090';
      ctx.fillRect(ox + 53, oy + 22, 4, 2);
      // Heat shimmer lines above forge
      ctx.fillStyle = 'rgba(255,128,32,0.06)';
      ctx.fillRect(ox + 7, oy + 12, 10, 1);
      ctx.fillRect(ox + 9, oy + 10, 8, 1);
      ctx.fillRect(ox + 8, oy + 8, 6, 1);
    } else if (id === 'arena') {
      // ── Training Arena — Fenced ring (~52x44) ───
      // Worn dirt floor with drag marks
      ctx.fillStyle = '#9b7b4a';
      ctx.fillRect(ox + 4, oy + 8, 48, 38);
      ctx.fillStyle = '#b89b6a';
      ctx.fillRect(ox + 6, oy + 10, 44, 34);
      // Drag marks
      ctx.fillStyle = '#8a6b3a';
      ctx.fillRect(ox + 12, oy + 24, 20, 1);
      ctx.fillRect(ox + 18, oy + 30, 16, 1);
      ctx.fillRect(ox + 10, oy + 18, 14, 1);
      // Fence with rail caps
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 2, oy + 6, 52, 3);
      ctx.fillRect(ox + 2, oy + 43, 52, 3);
      ctx.fillRect(ox + 2, oy + 6, 3, 40);
      ctx.fillRect(ox + 51, oy + 6, 3, 40);
      // Fence highlights
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 3, oy + 7, 50, 1);
      ctx.fillRect(ox + 3, oy + 44, 50, 1);
      // Rail caps
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 2, oy + 5, 3, 2);
      ctx.fillRect(ox + 51, oy + 5, 3, 2);
      ctx.fillRect(ox + 2, oy + 45, 3, 2);
      ctx.fillRect(ox + 51, oy + 45, 3, 2);
      // Corner posts with caps
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox, oy + 3, 5, 7);
      ctx.fillRect(ox + 51, oy + 3, 5, 7);
      ctx.fillRect(ox, oy + 42, 5, 6);
      ctx.fillRect(ox + 51, oy + 42, 5, 6);
      // Gate (wider, wooden doors)
      ctx.fillStyle = '#b89b6a';
      ctx.fillRect(ox + 20, oy + 6, 16, 3);
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 18, oy, 3, 10);
      ctx.fillRect(ox + 35, oy, 3, 10);
      // Gate door panels
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 20, oy + 2, 7, 5);
      ctx.fillRect(ox + 29, oy + 2, 7, 5);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 21, oy + 3, 5, 3);
      ctx.fillRect(ox + 30, oy + 3, 5, 3);
      // Shield emblem above gate
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 23, oy - 5, 10, 7);
      ctx.fillStyle = '#a08858';
      ctx.fillRect(ox + 24, oy - 4, 8, 5);
      // Crossed swords on shield
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ox + 25, oy - 6, 1, 8);
      ctx.fillRect(ox + 30, oy - 6, 1, 8);
      ctx.fillStyle = '#e0c060';
      ctx.fillRect(ox + 27, oy - 3, 2, 2);
      // Taller banner poles
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 4, oy - 10, 2, 20);
      ctx.fillRect(ox + 58, oy - 10, 2, 20);
      // Red banners with detail
      ctx.fillStyle = '#c04040';
      ctx.fillRect(ox - 6, oy - 10, 5, 10);
      ctx.fillRect(ox + 57, oy - 10, 5, 10);
      ctx.fillStyle = '#d05050';
      ctx.fillRect(ox - 5, oy - 9, 3, 8);
      ctx.fillRect(ox + 58, oy - 9, 3, 8);
      // Banner pennant tail
      ctx.fillStyle = '#c04040';
      ctx.fillRect(ox - 5, oy, 1, 3);
      ctx.fillRect(ox - 3, oy, 1, 2);
      ctx.fillRect(ox + 59, oy, 1, 3);
      ctx.fillRect(ox + 61, oy, 1, 2);
      // Practice dummy (wooden T-shape with armor + arrow)
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 14, oy + 14, 3, 16);
      ctx.fillRect(ox + 10, oy + 14, 10, 3);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 15, oy + 15, 1, 14);
      // Armor on dummy (breastplate)
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(ox + 13, oy + 17, 5, 6);
      ctx.fillStyle = '#9a9a9a';
      ctx.fillRect(ox + 14, oy + 18, 3, 4);
      // Arrow stuck in dummy
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 19, oy + 19, 6, 1);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 19, oy + 19, 2, 1);
      // Scattered equipment on floor
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 30, oy + 34, 4, 1);
      ctx.fillStyle = '#c0a040';
      ctx.fillRect(ox + 30, oy + 33, 1, 1);
      ctx.fillStyle = '#808080';
      ctx.fillRect(ox + 22, oy + 38, 3, 2);
      // Weapon stand
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 38, oy + 16, 8, 2);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 39, oy + 18, 1, 8);
      ctx.fillRect(ox + 42, oy + 18, 1, 10);
      ctx.fillRect(ox + 44, oy + 18, 1, 7);
      // Torch sconces on fence
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 3, oy + 16, 2, 4);
      ctx.fillRect(ox + 51, oy + 16, 2, 4);
      // Spectator bleachers (2 rows)
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 8, oy + 38, 20, 3);
      ctx.fillRect(ox + 10, oy + 35, 16, 3);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 9, oy + 39, 18, 1);
      ctx.fillRect(ox + 11, oy + 36, 14, 1);
    }
  }

  // ── Animated Location Parts ─────────────────────
  function drawAnimatedLocationParts(ctx) {
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      var ox = loc.x - 28, oy = loc.y - 32;

      if (id === 'town') {
        // Chimney smoke
        drawSmoke(ctx, ox + 42, oy - 12, smokeFrame, 0);
      } else if (id === 'mine') {
        // Torch glow auras
        drawTorchGlow(ctx, ox + 10, oy + 16);
        drawTorchGlow(ctx, ox + 40, oy + 16);
        // Two torches flanking cave entrance
        drawTorch(ctx, ox + 10, oy + 16, smokeFrame, 0);
        drawTorch(ctx, ox + 40, oy + 16, smokeFrame, 7);
        // Ore crystal glints inside cave
        var gt = smokeFrame * 0.04;
        var ga = 0.2 + Math.sin(gt * 2.5) * 0.15;
        ctx.globalAlpha = ga;
        ctx.fillStyle = '#60d0f0';
        ctx.fillRect(ox + 20, oy + 26, 1, 1);
        ctx.fillStyle = '#f0c040';
        ctx.fillRect(ox + 30, oy + 28, 1, 1);
        ctx.fillStyle = '#60d0f0';
        ctx.fillRect(ox + 25, oy + 32, 1, 1);
        ctx.globalAlpha = 1;
      } else if (id === 'smithy') {
        // Chimney smoke
        drawSmoke(ctx, ox + 8, oy - 14, smokeFrame, 3);
        // Sparks from anvil
        drawSparks(ctx, ox + 55, oy + 22, smokeFrame);
        // Forge glow — warm pulse
        var ft = smokeFrame * 0.04;
        var fa1 = 0.06 + Math.sin(ft * 1.5) * 0.06;
        ctx.fillStyle = '#ff6020';
        ctx.globalAlpha = fa1;
        ctx.fillRect(ox + 2, oy + 12, 20, 14);
        ctx.globalAlpha = fa1 * 0.4;
        ctx.fillRect(ox - 2, oy + 8, 28, 20);
        // Rare bright flash (sparks)
        if (Math.sin(ft * 7.3 + 0.5) > 0.95) {
          ctx.globalAlpha = 0.18;
          ctx.fillRect(ox + 4, oy + 14, 16, 10);
        }
        ctx.globalAlpha = 1;
      } else if (id === 'arena') {
        // Torch glow auras
        drawTorchGlow(ctx, ox + 18, oy - 2);
        drawTorchGlow(ctx, ox + 35, oy - 2);
        drawTorchGlow(ctx, ox + 3, oy + 14);
        drawTorchGlow(ctx, ox + 51, oy + 14);
        // Torches at gate + sconces
        drawTorch(ctx, ox + 18, oy - 2, smokeFrame, 5);
        drawTorch(ctx, ox + 35, oy - 2, smokeFrame, 9);
        drawTorch(ctx, ox + 3, oy + 14, smokeFrame, 11);
        drawTorch(ctx, ox + 51, oy + 14, smokeFrame, 13);
      }
    }
  }

  // ── Animation Helpers ───────────────────────────
  function drawTorchGlow(ctx, x, y) {
    // 3-layer expanding glow circle around torch
    ctx.fillStyle = '#ff8030';
    ctx.globalAlpha = 0.04;
    ctx.beginPath();
    ctx.arc(x + 1, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    ctx.arc(x + 1, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(x + 1, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSmoke(ctx, x, y, frame, seed) {
    var particles = 14;
    for (var i = 0; i < particles; i++) {
      var t = ((frame + seed * 17 + i * 7) % 80) / 80;
      var py = y - t * 28;
      // Rightward wind drift
      var px = x + Math.sin(t * 4 + i) * 5 + t * 6;
      var a = 0.3 * (1 - t);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      // Color gradient dark→light grey
      var grey = Math.floor(100 + t * 80);
      ctx.fillStyle = 'rgb(' + grey + ',' + grey + ',' + grey + ')';
      // Size variation
      var s = (2 + t * 4) * (0.7 + ((i % 3) * 0.3));
      ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawTorch(ctx, x, y, frame, seed) {
    // Base
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(x, y + 2, 2, 8);
    // Tapered flame shape (wide bottom, narrow jagged top)
    var flicker = ((frame + seed * 13) % 10);
    // Outer glow
    ctx.fillStyle = '#ff6020';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x - 4, y - 6, 10, 10);
    ctx.globalAlpha = 1;
    // Wide bottom flame
    var midColors = ['#ff6020','#ffa040','#ff8030','#ffc040','#ff6020','#ff8030','#ffa040','#ff7020','#ffb050','#ff9030'];
    ctx.fillStyle = midColors[flicker];
    ctx.fillRect(x - 2, y - 1, 6, 4);
    // Mid flame (narrower)
    ctx.fillStyle = midColors[(flicker + 3) % 10];
    ctx.fillRect(x - 1, y - 4, 4, 4);
    // Narrow top (jagged)
    ctx.fillStyle = '#ffc040';
    ctx.fillRect(x, y - 6, 2, 3);
    var jagX = (flicker % 3) - 1;
    ctx.fillRect(x + jagX, y - 7, 1, 2);
    // Bright core
    ctx.fillStyle = '#ffd060';
    ctx.fillRect(x - 1, y - 2, 4, 3);
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(x, y - 1, 2, 2);
    // 5 upward ember particles
    for (var e = 0; e < 5; e++) {
      var et = ((frame + seed * 7 + e * 7) % 25) / 25;
      if (et > 0.7) continue;
      var ex = x + Math.sin(et * 5 + e) * 4 + et * 2;
      var ey = y - 8 - et * 12;
      ctx.globalAlpha = 0.6 * (1 - et);
      ctx.fillStyle = et < 0.2 ? '#ffe060' : '#ffcc30';
      ctx.fillRect(ex, ey, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(ctx, x, y, frame) {
    var sparks = 14;
    for (var i = 0; i < sparks; i++) {
      var t = ((frame + i * 6) % 30) / 30;
      if (t > 0.85) continue;
      // Angular spread trajectories
      var angle = (i / sparks) * Math.PI + 0.3;
      var px = x + Math.cos(angle) * t * 14;
      // Gravity arc — parabolic fall
      var py = y - Math.sin(angle) * t * 18 + t * t * 10;
      ctx.globalAlpha = 0.9 * (1 - t);
      // Color temperature gradient: white→yellow→orange
      if (t < 0.1) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 2, 2);
      } else if (t < 0.35) {
        ctx.fillStyle = '#ffee60';
        ctx.fillRect(px, py, 1, 1);
      } else {
        ctx.fillStyle = '#ff8810';
        ctx.fillRect(px, py, 1, 1);
      }
      // 1px trail
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(px - Math.cos(angle) * 2, py + Math.sin(angle) * 2, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Animated Effects (butterflies, fireflies, forge glow, lanterns, clouds, glint, wind) ──
  function drawAnimatedEffects(ctx) {
    var t = smokeFrame * 0.04;

    // Cloud shadows — 4 large dark ellipses drifting slowly across map
    for (var ci = 0; ci < 4; ci++) {
      var cx = ((smokeFrame * 0.15 + ci * 280) % (MAP_W + 200)) - 100;
      var cy = 100 + ci * 150 + Math.sin(t * 0.1 + ci * 1.5) * 30;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60 + ci * 10, 30 + ci * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Butterflies (6, Lissajous flight with wing detail)
    for (var i = 0; i < butterflies.length; i++) {
      var b = butterflies[i];
      var bx = b.x + Math.sin(t * 0.8 + b.phase) * 40;
      var by = b.y + Math.sin(t * 1.2 + b.phase * 1.5) * 25;
      // Occasional landing/resting
      var restPhase = Math.sin(t * 0.15 + b.phase * 3);
      if (restPhase > 0.9) { by = b.y + 20; } // resting on ground
      // Wing flap
      var wingPhase = Math.sin(t * 6 + b.phase);
      var wingW = 2 + Math.abs(wingPhase) * 2;
      // Outer wing
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(bx - wingW, by, wingW, 2);
      ctx.fillRect(bx + 1, by, wingW, 2);
      // Inner wing detail (lighter color)
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.2;
      ctx.fillRect(bx - Math.floor(wingW / 2), by, Math.ceil(wingW / 2), 1);
      ctx.fillRect(bx + 1, by, Math.ceil(wingW / 2), 1);
      // Body
      ctx.fillStyle = '#1a1a1a';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(bx, by, 1, 3);
    }
    ctx.globalAlpha = 1;

    // Fireflies (10, independent blink timing, larger glow radius)
    for (var i = 0; i < fireflies.length; i++) {
      var f = fireflies[i];
      var fx = f.x + Math.sin(t * 0.3 + f.phase) * 20;
      var fy = f.y + Math.cos(t * 0.4 + f.phase * 0.7) * 15;
      // Independent blink timing per firefly
      var blinkSpeed = 1.2 + (f.phase % 1) * 1.6;
      var alpha = 0.3 + Math.sin(t * blinkSpeed + f.phase * 2.7) * 0.35;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e0ff60';
      ctx.fillRect(fx, fy, 2, 2);
      // Larger glow radius
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillRect(fx - 2, fy - 2, 6, 6);
      ctx.globalAlpha = alpha * 0.08;
      ctx.fillRect(fx - 4, fy - 4, 10, 10);
    }
    ctx.globalAlpha = 1;

    // Lantern flicker (per type-12 deco, per-lantern phase offset, occasional bright flash)
    for (var i = 0; i < MAP_DECO.length; i++) {
      var d = MAP_DECO[i];
      if (d[2] !== 12) continue;
      var lPhase = i * 2.1 + (i % 3) * 0.7; // desync
      var la = 0.15 + Math.sin(t * 3 + lPhase) * 0.1;
      // Occasional bright flash
      if (Math.sin(t * 0.5 + i * 4.3) > 0.95) la = 0.4;
      ctx.fillStyle = '#f0d060';
      ctx.globalAlpha = la;
      ctx.fillRect(d[0] - 4, d[1] - 3, 10, 8);
      ctx.globalAlpha = 1;
    }

    // Water sun glint — 4 white cross-shaped sparkles on river + dock water
    for (var gi = 0; gi < 4; gi++) {
      var glintPhase = Math.sin(t * 0.8 + gi * 2.5);
      if (glintPhase < 0.6) continue;
      var alpha = (glintPhase - 0.6) * 2;
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#ffffff';
      var gx, gy;
      if (gi < 2) {
        // River glints
        gy = 100 + gi * 250;
        gx = getRiverX(gy) + ((tileHash(gi, 444) % 14) - 7);
      } else {
        // Dock water glints
        gx = 860 + (gi - 2) * 50;
        gy = 220 + (gi - 2) * 40;
      }
      // Cross shape
      ctx.fillRect(gx, gy - 1, 1, 3);
      ctx.fillRect(gx - 1, gy, 3, 1);
    }
    ctx.globalAlpha = 1;

    // Wind on tall grass + reeds — sine-based sway overlay
    for (var i = 0; i < MAP_DECO.length; i++) {
      var d = MAP_DECO[i];
      if (d[2] !== 8 && d[2] !== 14) continue;
      var swayX = Math.sin(t * 1.2 + d[0] * 0.01 + d[1] * 0.02) * 2;
      ctx.fillStyle = d[2] === 8 ? '#5ab050' : '#3a7a30';
      ctx.globalAlpha = 0.4;
      // Sway tip markers
      ctx.fillRect(d[0] + swayX, d[1] - 2, 1, 2);
      ctx.fillRect(d[0] + 3 + swayX * 0.8, d[1] - 1, 1, 2);
    }
    ctx.globalAlpha = 1;

    // Dust/pollen particles — slow-drifting beige specks near ground
    for (var di = 0; di < 6; di++) {
      var dx = ((smokeFrame * 0.3 + di * 180) % (MAP_W + 40)) - 20;
      var dy = 200 + di * 70 + Math.sin(t * 0.4 + di * 1.8) * 15;
      ctx.fillStyle = '#d8c898';
      ctx.globalAlpha = 0.06 + Math.sin(t * 0.6 + di * 2.3) * 0.03;
      if (ctx.globalAlpha > 0) ctx.fillRect(dx, dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Location Labels ─────────────────────────────
  function drawLocationLabels(ctx) {
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';

    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      var labelY = loc.y + 36;

      // Measure text for background
      var nameWidth = ctx.measureText(loc.name).width;
      var bgW = nameWidth + 12;
      var bgH = loc.skill ? 26 : 16;
      var bgX = loc.x - bgW / 2;
      var bgY = labelY - 12;

      // Semi-transparent black background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bgX, bgY, bgW, bgH);
      // 1px border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bgX, bgY, bgW, bgH);

      // Drop shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(loc.name, loc.x + 1, labelY + 1);
      // Name text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(loc.name, loc.x, labelY);

      if (loc.skill && activeSlot >= 0) {
        var lvl = getSkillLevel(activeSlot, loc.skill);
        ctx.fillStyle = '#000000';
        ctx.fillText('Lv ' + lvl, loc.x + 1, labelY + 13);
        ctx.fillStyle = '#ffdd44';
        ctx.fillText('Lv ' + lvl, loc.x, labelY + 12);
      }
    }
  }

  // ── Map Border Frame ────────────────────────────
  function drawMapBorder(ctx) {
    // Parchment edge (warm beige with noise)
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(0, 0, MAP_W, 12);
    ctx.fillRect(0, MAP_H - 12, MAP_W, 12);
    ctx.fillRect(0, 0, 12, MAP_H);
    ctx.fillRect(MAP_W - 12, 0, 12, MAP_H);
    // Parchment noise
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (var bi = 0; bi < 60; bi++) {
      var bh = tileHash(bi, 5555);
      var side = bi % 4;
      if (side === 0) ctx.fillRect((bh >>> 0) % MAP_W, (bh >>> 8) % 12, 3, 2);
      else if (side === 1) ctx.fillRect((bh >>> 0) % MAP_W, MAP_H - 12 + (bh >>> 8) % 12, 3, 2);
      else if (side === 2) ctx.fillRect((bh >>> 8) % 12, (bh >>> 0) % MAP_H, 2, 3);
      else ctx.fillRect(MAP_W - 12 + (bh >>> 8) % 12, (bh >>> 0) % MAP_H, 2, 3);
    }
    // Dark wood outer frame
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, MAP_W - 4, MAP_H - 4);
    // Gold decorative line
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, MAP_W - 12, MAP_H - 12);
    // Inner gold trim
    ctx.strokeStyle = '#e0c060';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, MAP_W - 20, MAP_H - 20);
    // Corner filigree (diamond motif, 12x12)
    var corners = [[3, 3], [MAP_W - 15, 3], [3, MAP_H - 15], [MAP_W - 15, MAP_H - 15]];
    ctx.fillStyle = '#c0a040';
    for (var ci = 0; ci < corners.length; ci++) {
      var cx = corners[ci][0], cy = corners[ci][1];
      // Diamond shape
      ctx.fillRect(cx + 4, cy, 4, 2);
      ctx.fillRect(cx + 2, cy + 2, 8, 2);
      ctx.fillRect(cx, cy + 4, 12, 4);
      ctx.fillRect(cx + 2, cy + 8, 8, 2);
      ctx.fillRect(cx + 4, cy + 10, 4, 2);
      // Center gem
      ctx.fillStyle = '#e0c060';
      ctx.fillRect(cx + 4, cy + 4, 4, 4);
      ctx.fillStyle = '#c0a040';
    }
    // Compass rose (bottom-right corner, 20x20)
    var crx = MAP_W - 36, cry = MAP_H - 36;
    // Circle background
    ctx.fillStyle = 'rgba(216,200,160,0.9)';
    ctx.beginPath();
    ctx.arc(crx + 10, cry + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(crx + 10, cry + 10, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Directional points
    ctx.fillStyle = '#8a6a30';
    // N
    ctx.fillRect(crx + 9, cry + 1, 2, 6);
    // S
    ctx.fillRect(crx + 9, cry + 13, 2, 6);
    // E
    ctx.fillRect(crx + 13, cry + 9, 6, 2);
    // W
    ctx.fillRect(crx + 1, cry + 9, 6, 2);
    // N letter
    ctx.fillStyle = '#6a4a20';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', crx + 10, cry + 5);
  }

  // ── Player Drawing ──────────────────────────────
  function drawPlayer(ctx) {
    var animType = playerTarget ? 'walk' : 'idle';
    drawCharSprite(ctx, playerPos.x, playerPos.y, playerDir, playerFrame, animType, currentCharId);
  }

  // ── Enter Prompt (OSRS style) ───────────────────
  function drawEnterPrompt(ctx) {
    if (!playerAtLocation) return;
    var loc = MAP_LOCATIONS[playerAtLocation];
    if (!loc) return;

    var text = 'Enter ' + loc.name;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    var tw = ctx.measureText(text).width;
    var px = playerPos.x;
    var py = playerPos.y - CHAR_DRAW_SIZE + 4; // above character sprite
    var bw = tw + 20, bh = 22;
    var bx = px - bw / 2, by = py - 12;

    // Dark background with drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx + 2, by + 2, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e0c060';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

    ctx.fillStyle = '#ffdd44';
    ctx.fillText(text, px, py + 2);

    var arrowPhase = Math.sin(smokeFrame * 0.08) * 2;
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(px - 2, by + bh + 2 + arrowPhase, 4, 2);
    ctx.fillRect(px - 1, by + bh + 4 + arrowPhase, 2, 2);

    // Small collect badge further below enter prompt
    if (hasUncollectedRewards(playerAtLocation)) {
      var rpgPets = getRpgPetState();
      var station = rpgPets.stations[playerAtLocation];
      if (station && station.petId && petCatalog.creatures[station.petId]) {
        var petName = petCatalog.creatures[station.petId].name;
        var elapsed = Date.now() - (station.lastCollected || station.stationedAt);
        var collectText = petName + ' — ' + formatDuration(elapsed);
        ctx.font = '9px monospace';
        var ctw = ctx.measureText(collectText).width;
        var cpy = by + bh + 32;
        var cbw = ctw + 14, cbh = 16;
        var cbx = px - cbw / 2, cby = cpy - 9;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cbx, cby, cbw, cbh);
        ctx.strokeStyle = 'rgba(100,170,68,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cbx, cby, cbw, cbh);

        ctx.fillStyle = 'rgba(136,204,102,0.8)';
        ctx.fillText(collectText, px, cpy + 1);
      }
    }
  }

  // ── Map Click Handling ──────────────────────────
  function onMapCanvasClick(e) {
    if (!mapCanvas) return;
    if (insideCasino) return; // casino handles its own clicks
    if (insideTown) { onTownMapCanvasClick(e); return; }
    var rect = mapCanvas.getBoundingClientRect();
    var scaleX = MAP_W / rect.width;
    var scaleY = MAP_H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;

    // Check stationed pet sprite click (collect on tap)
    if (playerAtLocation && hasUncollectedRewards(playerAtLocation)) {
      var mapLoc = MAP_LOCATIONS[playerAtLocation];
      if (mapLoc) {
        var petSprX = mapLoc.x + 28;
        var petSprY = mapLoc.y + 22;
        if (Math.abs(cx - petSprX) < 20 && Math.abs(cy - petSprY) < 20) {
          collectAtLocation(playerAtLocation);
          return;
        }
      }
    }

    // Check collect badge click (below enter prompt)
    if (enterPromptVisible && playerAtLocation && hasUncollectedRewards(playerAtLocation)) {
      var collectY = playerPos.y - CHAR_DRAW_SIZE + 4 - 12 + 22 + 32; // must match draw: by + bh + 32
      if (Math.abs(cx - playerPos.x) < 100 && Math.abs(cy - collectY) < 14) {
        collectAtLocation(playerAtLocation);
        return;
      }
    }

    // Check enter prompt click (blocked during NPC intro)
    if (enterPromptVisible && playerAtLocation && !npcIntro) {
      var loc = MAP_LOCATIONS[playerAtLocation];
      var promptY = playerPos.y - CHAR_DRAW_SIZE + 4;
      if (Math.abs(cx - playerPos.x) < 80 && Math.abs(cy - promptY) < 16) {
        onEnterLocation(playerAtLocation);
        return;
      }
    }

    // Check if clicking near a location
    var closest = null, closestDist = Infinity;
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      var dx = cx - loc.x;
      var dy = cy - loc.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < HIT_RADIUS && d < closestDist) {
        closest = id;
        closestDist = d;
      }
    }

    if (closest) {
      if (playerAtLocation === closest) {
        // Block entry during NPC intro (Gatekeeper must finish speaking first)
        if (npcIntro) return;
        // Already here — enter it
        onEnterLocation(closest);
      } else {
        // Walk there
        playerTarget = { x: MAP_LOCATIONS[closest].x, y: MAP_LOCATIONS[closest].y };
        playerAtLocation = null;
        enterPromptVisible = false;
        playerFrame = 1;
        playerAnimTimer = 0;
        addGameMessage('You set off towards ' + MAP_LOCATIONS[closest].name + '...', 'travel');
      }
    }
  }

  function onEnterLocation(locId) {
    var loc = MAP_LOCATIONS[locId];
    if (!loc) return;

    // Town Hub → enter town sub-map
    if (!loc.skill) {
      enterTown();
      return;
    }

    // Find matching LOCATIONS entry
    var locData = null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === locId) { locData = LOCATIONS[i]; break; }
    }
    if (!locData) return;

    addGameMessage('You enter ' + loc.name + '.', 'enter');
    stopMapLoop();

    // Persist that we're inside this location so refresh restores it
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideLocation = locId;
      saveMeta();
    }

    enterSkillLocation(locData);
  }

  // ── Save/Restore Player Location ────────────────
  function getSavedPlayerLocation() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return null;
    return meta.slots[activeSlot].mapLocation || null;
  }

  function savePlayerLocation() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    meta.slots[activeSlot].mapLocation = playerAtLocation || 'town';
    saveMeta();
  }

  // ── World Map ─────────────────────────────────
  function renderWorldMap() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    initMapCanvas();
  }

  // ── Location Pane ────────────────────────────────
  var currentLocationId = null;
  var currentLocationSkill = null;

  function updateLocationTab(locId) {
    var tab = document.querySelector('[data-chat-tab="location"]');
    if (!tab) return;
    if (locId && MAP_LOCATIONS[locId]) {
      tab.textContent = MAP_LOCATIONS[locId].name;
      tab.style.display = '';
    } else {
      tab.textContent = 'Location';
      tab.style.display = 'none';
    }
  }

  function renderLocationPane(locId, skill) {
    currentLocationId = locId;
    currentLocationSkill = skill;
    updateLocationTab(locId);
    var perksC = $('rpg-loc-perks');
    var resC = $('rpg-loc-resources');
    if (!perksC) return;

    // Arena: show stats + re-entry button instead of skills API
    if (locId === 'arena') {
      renderArenaLocationPane(perksC, resC);
      return;
    }

    // Delegate to skills API
    var api = window.__RPG_SKILLS_API;
    if (!api || !skill) {
      if (perksC) perksC.innerHTML = '';
      if (resC) resC.innerHTML = '<div class="rpg-loc-muted">No skill at this location.</div>';
      return;
    }
    api.renderPerksInto(perksC, skill);
    api.renderResourcesInto(resC, skill);
  }

  function renderArenaLocationPane(perksC, resC) {
    var stats = { fights: 0, wins: 0, bestStreak: 0, currentStreak: 0 };
    if (window.RpgCombat && window.RpgCombat.loadCombatState) {
      var cs = window.RpgCombat.loadCombatState();
      if (cs && cs.arenaStats) stats = cs.arenaStats;
    }
    var losses = (stats.fights || 0) - (stats.wins || 0);
    var winRate = stats.fights > 0 ? Math.round((stats.wins / stats.fights) * 100) : 0;

    perksC.innerHTML =
      '<div class="rpg-loc-col-header">Arena Record</div>' +
      '<div class="rpg-arena-stat-row"><span>Fights</span><span>' + (stats.fights || 0) + '</span></div>' +
      '<div class="rpg-arena-stat-row"><span>Wins</span><span class="rpg-arena-wins">' + (stats.wins || 0) + '</span></div>' +
      '<div class="rpg-arena-stat-row"><span>Losses</span><span>' + losses + '</span></div>' +
      '<div class="rpg-arena-stat-row"><span>Win Rate</span><span>' + winRate + '%</span></div>' +
      '<div class="rpg-arena-stat-row rpg-arena-stat-streak"><span>Streak</span><span>' + (stats.currentStreak || 0) + '</span></div>' +
      '<div class="rpg-arena-stat-row rpg-arena-stat-best"><span>Best Streak</span><span>' + (stats.bestStreak || 0) + '</span></div>';

    var nextMilestone = '';
    var cs2 = stats.currentStreak || 0;
    if (cs2 < 5) nextMilestone = '5 streak = +100 GP';
    else if (cs2 < 10) nextMilestone = '10 streak = +250 GP';
    else if (cs2 < 25) nextMilestone = '25 streak = +500 GP';
    else if (cs2 < 50) nextMilestone = '50 streak = +1000 GP';
    else nextMilestone = 'Every 50 = +1000 GP';

    resC.innerHTML =
      '<div class="rpg-loc-col-header">Streak Rewards</div>' +
      '<div class="rpg-arena-milestone">' + nextMilestone + '</div>' +
      '<div style="margin-top:12px">' +
      '<button class="rpg-btn" id="rpg-arena-enter-btn">Enter Arena</button>' +
      '</div>';

    var enterBtn = $('rpg-arena-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', function () {
        var rpgPetsState = getRpgPetState();
        var ownedIds = Object.keys(rpgPetsState.owned);
        if (ownedIds.length === 0) {
          addGameMessage('You need at least one pet to enter the arena! Visit the Pet Store first.', 'system');
          return;
        }
        if (window.RpgCombat) window.RpgCombat.showArenaSelect(rpgPetsState);
      });
    }
  }

  function clearLocationPane() {
    // If location tab is active, switch to game tab before hiding it
    var tab = document.querySelector('[data-chat-tab="location"]');
    if (tab && tab.classList.contains('active')) {
      switchChatTab('game');
    }
    currentLocationId = null;
    currentLocationSkill = null;
    updateLocationTab(null);
    var perksC = $('rpg-loc-perks');
    var resC = $('rpg-loc-resources');
    if (perksC) perksC.innerHTML = '';
    if (resC) resC.innerHTML = '';
  }

  // ── Skill Location Entry ──────────────────────
  function enterSkillLocation(loc) {
    // Arena intercept — launch 1v1 combat modal instead of skill mini-game
    if (loc.id === 'arena' && window.RpgCombat) {
      renderLocationPane('arena', null);
      switchChatTab('location');
      var rpgPetsState = getRpgPetState();
      var ownedIds = Object.keys(rpgPetsState.owned);
      if (ownedIds.length === 0) {
        addGameMessage('You need at least one pet to enter the arena! Visit the Pet Store first.', 'system');
        return;
      }
      window.RpgCombat.showArenaSelect(rpgPetsState);
      return;
    }

    fadeTransition(function () {
      showCenterContent('skill');

      // Set location ID early so canAutoMode() can check stationed pets
      currentLocationId = loc.id;
      currentLocationSkill = loc.skill;

      // Click the matching skill row to switch skills.js to this skill
      setTimeout(function () {
        var skillRow = document.querySelector('.skill-row[data-skill="' + loc.skill + '"]');
        if (skillRow) {
          programmaticSkillClick = true;
          skillRow.click();
          programmaticSkillClick = false;
        }
        // Populate location pane after skill switch
        renderLocationPane(loc.id, loc.skill);
        switchChatTab('location');
        // Inject stationed pet sprite into game area after skills.js renders
        setTimeout(function () {
          renderStationedPetInGameArea(loc.id);
          if (window.__SKILLS_UPDATE_AUTO_BTN) window.__SKILLS_UPDATE_AUTO_BTN();
        }, 100);
      }, 50);
    });
  }

  function returnToMap(onAfterFade) {
    // Cleanup the active game in skills.js
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    // Clear persisted inside-location flag
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideLocation = null;
      saveMeta();
    }

    fadeTransition(function () {
      clearLocationPane();
      addGameMessage('You return to the world map.', 'return');
      showCenterContent('map');
      enterPromptVisible = !!playerAtLocation;
      startMapLoop();
      updateTopbar();
      updateCharInfo();
      if (typeof onAfterFade === 'function') onAfterFade();
    });
  }

  // ── Save & Quit ───────────────────────────────
  function onSaveQuit() {
    stopMapLoop();
    stopTownMapLoop();
    closePetStoreModal();
    closePetPopup();
    closeTavern();

    // Clear pet sprite refs
    followerSpriteSheet = null;
    followerPetId = null;
    stationedSpriteSheets = {};

    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].lastPlayed = Date.now();
      meta.slots[activeSlot].insideTown = false;
      meta.slots[activeSlot].insideCasino = false;
    }
    insideTown = false;
    insideCasino = false;
    meta.currentSlot = -1;
    saveMeta();

    // Restore global wallet
    uninstallRpgWallet();

    // Clean up skills if active
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    // Clean up quest system
    if (window.QuestSystem) {
      window.QuestSystem.cleanup();
    }

    // Hide chatbox + side panel
    var osrsChatbox = $('osrs-chatbox');
    if (osrsChatbox) osrsChatbox.style.display = 'none';
    var osrsSidePanel = $('osrs-side-panel');
    if (osrsSidePanel) osrsSidePanel.style.display = 'none';

    // Hide RPG-mode elements
    var mapBtn = $('rpg-map-nav-btn');
    if (mapBtn) mapBtn.style.display = 'none';
    var charInfo = $('rpg-char-info');
    if (charInfo) charInfo.style.display = 'none';

    // Restore skills-topbar visibility
    var skillsTopbar = document.querySelector('.skills-topbar');
    if (skillsTopbar) skillsTopbar.style.display = '';

    activeSlot = -1;
    window.__RPG_STORAGE_KEY = '__rpg_pending__';
    showScreen('rpg-menu-screen');
    renderMenuScreen();
  }

  // ── Skill Row Click Interceptor ───────────────
  // Block manual clicks on skill rows in OSRS panel; allow programmatic clicks from enterSkillLocation
  function onSkillListCapture(e) {
    var row = e.target.closest('.skill-row');
    if (!row) return;
    if (programmaticSkillClick) return; // let it through
    e.stopPropagation();
  }

  // ══════════════════════════════════════════════
  // ══  TOWN HUB INTERIOR SUB-MAP               ══
  // ══════════════════════════════════════════════

  function enterTown(skipFade) {
    stopMapLoop();
    insideTown = true;

    // Persist to save slot
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideTown = true;
      saveMeta();
    }

    // Reset town player state — enter from south gate
    townPlayerPos = { x: 530, y: 580 };
    townPlayerTarget = null;
    townPlayerAtLocation = null;
    townEnterPromptVisible = false;
    townPlayerDir = 'up';
    townPlayerFrame = 0;
    townPlayerAnimTimer = 0;
    townSmokeFrame = 0;
    townLastTimestamp = 0;
    townStaticBuffer = null; // force re-render
    townLightPoolBuffer = null;

    // Init NPCs and atmosphere
    initTownNpcs();
    initTownDustParticles();

    // Init follower position in town
    followerPos.x = 530;
    followerPos.y = 580 + FOLLOWER_TRAIL;

    addGameMessage('You enter the Town Hub.', 'enter');

    if (skipFade) {
      showCenterContent('map');
      startTownMapLoop();
    } else {
      fadeTransition(function () {
        showCenterContent('map');
        startTownMapLoop();
      });
    }
  }

  function returnToWorldMap() {
    stopTownMapLoop();
    closePetStoreModal();
    cleanupTownNpcs();
    insideTown = false;

    // Clear town from save
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideTown = false;
      saveMeta();
    }

    // Restore player to town coords on world map
    playerPos.x = MAP_LOCATIONS.town.x;
    playerPos.y = MAP_LOCATIONS.town.y;
    playerAtLocation = 'town';
    enterPromptVisible = true;
    staticDirty = true;

    // Reset follower position
    followerPos.x = MAP_LOCATIONS.town.x;
    followerPos.y = MAP_LOCATIONS.town.y + FOLLOWER_TRAIL;

    fadeTransition(function () {
      addGameMessage('You return to the world map.', 'return');
      showCenterContent('map');
      startMapLoop();
    });
  }

  // ── Casino Entry / Exit ──────────────────────────
  function enterCasino() {
    if (!window.RpgCasino) {
      addGameMessage('The casino is not available yet.', 'system');
      return;
    }
    stopTownMapLoop();
    insideCasino = true;

    // Persist to save slot
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideCasino = true;
      saveMeta();
    }

    var bridgeAPI = {
      drawPlayer: function (ctx, x, y, dir, frame, animType) {
        drawCharSprite(ctx, x, y, dir, frame, animType);
      },
      drawFollower: function (ctx) {
        drawFollower(ctx);
      },
      updateFollower: function (pos, dir, dt) {
        // Mirror town follower logic but using casino player pos
        if (!followerSpriteSheet || !followerPetId) return;
        var tx = pos.x, ty = pos.y;
        switch (dir) {
          case 'up':    ty += FOLLOWER_TRAIL; break;
          case 'down':  ty -= FOLLOWER_TRAIL; break;
          case 'left':  tx += FOLLOWER_TRAIL; break;
          case 'right': tx -= FOLLOWER_TRAIL; break;
          default:      ty += FOLLOWER_TRAIL; break;
        }
        var lerpSpeed = 3.0 * (dt || 1 / 60);
        followerPos.x += (tx - followerPos.x) * lerpSpeed;
        followerPos.y += (ty - followerPos.y) * lerpSpeed;
        // Update follower facing direction
        var fdx = pos.x - followerPos.x;
        if (Math.abs(fdx) > 2) {
          followerDir = fdx > 0 ? 'right' : 'left';
        }
      },
      addMessage: function (text, type) {
        addGameMessage(text, type);
      },
      addChatMessage: function (text, type) {
        addChatMessage(text, type);
      },
      onLeave: function () {
        returnFromCasino();
      }
    };

    fadeTransition(function () {
      window.RpgCasino.enter(mapCanvas, bridgeAPI);
    });
  }

  function returnFromCasino() {
    insideCasino = false;

    // Clear casino from save
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideCasino = false;
      saveMeta();
    }

    // Re-enter town (player stays where casino hotspot is)
    var casinoLoc = TOWN_LOCATIONS.casino;
    if (casinoLoc) {
      townPlayerPos.x = casinoLoc.x;
      townPlayerPos.y = casinoLoc.y + 20;
      followerPos.x = casinoLoc.x;
      followerPos.y = casinoLoc.y + 20 + FOLLOWER_TRAIL;
    }
    townPlayerTarget = null;
    townEnterPromptVisible = false;
    townPlayerAtLocation = null;
    townStaticBuffer = null; // force re-render

    fadeTransition(function () {
      addGameMessage('You step back into the town.', 'return');
      showCenterContent('map');
      startTownMapLoop();
    });
  }

  // ── Town Map Loop ─────────────────────────────
  function startTownMapLoop() {
    if (townAnimId) return;
    townLastTimestamp = 0;
    townAnimId = requestAnimationFrame(townMapLoop);
  }

  function stopTownMapLoop() {
    if (townAnimId) {
      cancelAnimationFrame(townAnimId);
      townAnimId = null;
    }
  }

  function townMapLoop(ts) {
    if (!townLastTimestamp) townLastTimestamp = ts;
    var dt = Math.min((ts - townLastTimestamp) / 1000, 0.1);
    townLastTimestamp = ts;
    townSmokeFrame++;
    updateTownPlayer(dt);
    updateTownFollowerPosition(dt);
    updateTownNpcs(dt);
    drawTownMap();
    townAnimId = requestAnimationFrame(townMapLoop);
  }

  // ── Town Player Movement ──────────────────────
  function updateTownPlayer(dt) {
    // Idle animation when not moving
    if (!townPlayerTarget) {
      townPlayerAnimTimer += dt;
      if (townPlayerAnimTimer > 0.3) {
        townPlayerAnimTimer = 0;
        townPlayerFrame = (townPlayerFrame + 1) % CHAR_ANIM_DATA.idle.framesPerDir;
      }
      return;
    }

    var dx = townPlayerTarget.x - townPlayerPos.x;
    var dy = townPlayerTarget.y - townPlayerPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      townPlayerPos.x = townPlayerTarget.x;
      townPlayerPos.y = townPlayerTarget.y;
      townPlayerTarget = null;
      townPlayerFrame = 0;

      // Check which town hotspot we're at
      townPlayerAtLocation = null;
      for (var i = 0; i < TOWN_LOC_ORDER.length; i++) {
        var id = TOWN_LOC_ORDER[i];
        var loc = TOWN_LOCATIONS[id];
        var ldx = townPlayerPos.x - loc.x;
        var ldy = townPlayerPos.y - loc.y;
        if (Math.sqrt(ldx * ldx + ldy * ldy) < 40) {
          townPlayerAtLocation = id;
          break;
        }
      }
      if (townPlayerAtLocation) {
        var arr = TOWN_LOCATIONS[townPlayerAtLocation];
        var flavor = TOWN_FLAVOR[townPlayerAtLocation] || '';
        if (arr.type === 'decorative') {
          addGameMessage(flavor, 'arrival');
        } else {
          addGameMessage('You approach the ' + arr.name + '. ' + flavor, 'arrival');
        }
      }
      townEnterPromptVisible = !!townPlayerAtLocation && TOWN_LOCATIONS[townPlayerAtLocation].type !== 'decorative';
      return;
    }

    // Direction
    if (Math.abs(dx) > Math.abs(dy)) {
      townPlayerDir = dx > 0 ? 'right' : 'left';
    } else {
      townPlayerDir = dy > 0 ? 'down' : 'up';
    }

    // Move (enforce wall collision)
    var step = PLAYER_SPEED * dt;
    if (step > dist) step = dist;
    var nx = townPlayerPos.x + (dx / dist) * step;
    var ny = townPlayerPos.y + (dy / dist) * step;
    // Clamp to inside walls
    nx = Math.max(TOWN_WALL + 16, Math.min(TOWN_W - TOWN_WALL - 16, nx));
    ny = Math.max(TOWN_WALL + 16, Math.min(TOWN_H - TOWN_WALL - 16, ny));
    townPlayerPos.x = nx;
    townPlayerPos.y = ny;

    // Animate walk (6 frames per direction)
    townPlayerAnimTimer += dt;
    if (townPlayerAnimTimer > 0.12) {
      townPlayerAnimTimer = 0;
      townPlayerFrame = (townPlayerFrame + 1) % CHAR_ANIM_DATA.walk.framesPerDir;
    }
    townEnterPromptVisible = false;
  }

  // ── Town Click Handling ───────────────────────
  function onTownMapCanvasClick(e) {
    var rect = mapCanvas.getBoundingClientRect();
    var scaleX = TOWN_W / rect.width;
    var scaleY = TOWN_H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;

    // Check return button click (top-left)
    if (cx < 150 && cy < 40) {
      returnToWorldMap();
      return;
    }

    // Check enter prompt click
    if (townEnterPromptVisible && townPlayerAtLocation) {
      var promptY = townPlayerPos.y - CHAR_DRAW_SIZE + 4;
      if (Math.abs(cx - townPlayerPos.x) < 80 && Math.abs(cy - promptY) < 16) {
        onEnterTownHotspot(townPlayerAtLocation);
        return;
      }
    }

    // Check if clicking near a hotspot
    var closest = null, closestDist = Infinity;
    for (var i = 0; i < TOWN_LOC_ORDER.length; i++) {
      var id = TOWN_LOC_ORDER[i];
      var loc = TOWN_LOCATIONS[id];
      var dx = cx - loc.x;
      var dy = cy - loc.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 50 && d < closestDist) {
        closest = id;
        closestDist = d;
      }
    }

    if (closest) {
      if (townPlayerAtLocation === closest) {
        onEnterTownHotspot(closest);
      } else {
        // Walk to hotspot
        var tx = TOWN_LOCATIONS[closest].x;
        var ty = TOWN_LOCATIONS[closest].y + 30; // stand in front of building
        townPlayerTarget = { x: tx, y: ty };
        townPlayerAtLocation = null;
        townEnterPromptVisible = false;
        townPlayerFrame = 1;
        townPlayerAnimTimer = 0;
      }
    } else {
      // Free walk — clamp target to inside walls
      var tx2 = Math.max(TOWN_WALL + 16, Math.min(TOWN_W - TOWN_WALL - 16, cx));
      var ty2 = Math.max(TOWN_WALL + 16, Math.min(TOWN_H - TOWN_WALL - 16, cy));
      townPlayerTarget = { x: tx2, y: ty2 };
      townPlayerAtLocation = null;
      townEnterPromptVisible = false;
      townPlayerFrame = 1;
      townPlayerAnimTimer = 0;
    }
  }

  // ── Hotspot Entry Logic ───────────────────────
  function onEnterTownHotspot(locId) {
    var loc = TOWN_LOCATIONS[locId];
    if (!loc) return;

    // Quest hook: location visited
    if (window.QuestSystem) {
      window.QuestSystem.updateObjective('visit_location', { location: locId });
    }

    if (loc.type === 'decorative') {
      // Fountain — just flavor text
      addGameMessage(TOWN_FLAVOR[locId] || loc.desc, 'system');
      return;
    }
    if (loc.type === 'petstore') {
      openPetStoreModal();
      return;
    }
    if (locId === 'dungeon') {
      openDungeonGate();
      return;
    }
    if (locId === 'store') {
      openGeneralStore();
      return;
    }
    if (locId === 'library') {
      if (window.RpgCombat && window.RpgCombat.showBestiary) {
        window.RpgCombat.showBestiary();
      }
      return;
    }
    if (locId === 'barracks') {
      if (window.RpgCombat && window.RpgCombat.showTypeChart) {
        window.RpgCombat.showTypeChart();
      }
      return;
    }
    if (locId === 'casino') {
      enterCasino();
      return;
    }
    if (locId === 'tavern') {
      openTavern();
      return;
    }
    // placeholder
    addGameMessage(loc.name + ' is not yet open. Coming soon!', 'system');
  }

  // ── Town Static Buffer Rendering ──────────────
  function renderTownStaticBuffer() {
    if (!townStaticBuffer) {
      townStaticBuffer = document.createElement('canvas');
      townStaticBuffer.width = TOWN_W;
      townStaticBuffer.height = TOWN_H;
      townStaticBufferCtx = townStaticBuffer.getContext('2d');
    }
    var ctx = townStaticBufferCtx;

    drawTownGround(ctx);
    drawTownWalls(ctx);
    drawTownGate(ctx);
    drawTownPaths(ctx);

    // Draw buildings
    for (var i = 0; i < TOWN_LOC_ORDER.length; i++) {
      var id = TOWN_LOC_ORDER[i];
      var loc = TOWN_LOCATIONS[id];
      drawTownBuilding(ctx, id, loc.x, loc.y);
    }

    // Render light pool buffer
    renderTownLightPoolBuffer();
  }

  function drawTownGround(ctx) {
    // Flagstone courtyard floor
    var FS_W = 16, FS_H = 12;
    var cols = Math.ceil(TOWN_W / FS_W) + 1;
    var rows = Math.ceil(TOWN_H / FS_H);
    var stoneColors = ['#b89868','#c4a472','#a89060','#d0b080','#a0946c','#b8a878'];
    // Mortar fill
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(0, 0, TOWN_W, TOWN_H);
    for (var r = 0; r < rows; r++) {
      var rowOff = (r % 2) * (FS_W / 2);
      for (var c = -1; c < cols; c++) {
        var sx = c * FS_W + rowOff;
        var sy = r * FS_H;
        var h = tileHash(c + 500, r + 500);
        ctx.fillStyle = stoneColors[(h >>> 0) % stoneColors.length];
        ctx.fillRect(sx + 1, sy + 1, FS_W - 2, FS_H - 2);
        // Top-left highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx + 1, sy + 1, FS_W - 2, 1);
        ctx.fillRect(sx + 1, sy + 1, 1, FS_H - 2);
        // Bottom-right shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(sx + 1, sy + FS_H - 2, FS_W - 2, 1);
        ctx.fillRect(sx + FS_W - 2, sy + 1, 1, FS_H - 2);
        // Grass tufts (20%, not under walls)
        if ((h >>> 8) % 5 === 0 && sx > TOWN_WALL + 8 && sx < TOWN_W - TOWN_WALL - 8 &&
            sy > TOWN_WALL + 8 && sy < TOWN_H - TOWN_WALL - 8) {
          var gc = ['#4a7a3a','#5a8a4a','#3a6a2a'];
          for (var gi = 0; gi < 3; gi++) {
            ctx.fillStyle = gc[gi];
            ctx.fillRect(sx + 3 + (h >>> (12 + gi)) % 8, sy + FS_H - 4 - gi, 1, 3);
          }
        }
        // Scattered debris (8%)
        if ((h >>> 16) % 12 === 0) {
          ctx.fillStyle = 'rgba(80,50,20,0.2)';
          ctx.fillRect(sx + (h >>> 4) % (FS_W - 4) + 2, sy + (h >>> 6) % (FS_H - 3) + 1, 2, 1);
        }
      }
    }
    // Pre-placed puddles
    var puddles = [{x:350,y:200},{x:700,y:450},{x:180,y:400}];
    for (var pi = 0; pi < puddles.length; pi++) {
      ctx.fillStyle = 'rgba(100,140,180,0.12)';
      ctx.beginPath();
      ctx.ellipse(puddles[pi].x, puddles[pi].y, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140,180,220,0.06)';
      ctx.beginPath();
      ctx.ellipse(puddles[pi].x - 3, puddles[pi].y - 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTownWalls(ctx) {
    var W = TOWN_WALL;
    var stoneColors = ['#6a6a70','#606068','#707078','#5a5a62','#68686e'];
    // Draw all 4 walls
    var walls = [
      [0, 0, TOWN_W, W],          // top
      [0, TOWN_H - W, TOWN_W, W], // bottom
      [0, 0, W, TOWN_H],          // left
      [TOWN_W - W, 0, W, TOWN_H]  // right
    ];
    for (var wi = 0; wi < walls.length; wi++) {
      var wx = walls[wi][0], wy = walls[wi][1], ww = walls[wi][2], wh = walls[wi][3];
      for (var sy = wy; sy < wy + wh; sy += 8) {
        var rowOff = ((sy / 8) % 2) * 6; // running bond
        for (var sx = wx - rowOff; sx < wx + ww; sx += 12) {
          var drawX = Math.max(wx, sx), drawW = Math.min(sx + 12, wx + ww) - drawX;
          if (drawW <= 0) continue;
          var h = tileHash(sx + 2000, sy + 2000);
          ctx.fillStyle = stoneColors[(h >>> 0) % stoneColors.length];
          ctx.fillRect(drawX, sy, drawW, 8);
          // Mortar
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(drawX, sy + 7, drawW, 1);
          if (sx + 11 >= wx && sx + 11 < wx + ww) ctx.fillRect(sx + 11, sy, 1, 8);
          // Top highlight per brick
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(drawX, sy, drawW, 1);
          // Moss (15% of bricks)
          if ((h >>> 8) % 7 === 0) {
            ctx.fillStyle = 'rgba(60,100,40,0.25)';
            ctx.fillRect(drawX + (h >>> 4) % 6, sy + (h >>> 12) % 4, 4, 3);
          }
        }
      }
      // Inner edge shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      if (wi === 0) ctx.fillRect(wx, wy + wh - 2, ww, 2);
      if (wi === 1) ctx.fillRect(wx, wy, ww, 2);
      if (wi === 2) ctx.fillRect(wx + ww - 2, wy, 2, wh);
      if (wi === 3) ctx.fillRect(wx, wy, 2, wh);
    }
    // Inward shadow gradients
    var shadTop = ctx.createLinearGradient(0, W, 0, W + 30);
    shadTop.addColorStop(0, 'rgba(0,0,0,0.2)');
    shadTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadTop;
    ctx.fillRect(W, W, TOWN_W - W * 2, 30);
    var shadLeft = ctx.createLinearGradient(W, 0, W + 20, 0);
    shadLeft.addColorStop(0, 'rgba(0,0,0,0.15)');
    shadLeft.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadLeft;
    ctx.fillRect(W, W, 20, TOWN_H - W * 2);
    var shadRight = ctx.createLinearGradient(TOWN_W - W, 0, TOWN_W - W - 20, 0);
    shadRight.addColorStop(0, 'rgba(0,0,0,0.15)');
    shadRight.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadRight;
    ctx.fillRect(TOWN_W - W - 20, W, 20, TOWN_H - W * 2);
    // Crenellations on top wall
    for (var cx = W; cx < TOWN_W - W; cx += 24) {
      ctx.fillStyle = '#5a5a62';
      ctx.fillRect(cx, 0, 12, 8);
      ctx.fillStyle = '#707078';
      ctx.fillRect(cx + 1, 1, 10, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(cx + 1, 1, 10, 1);
    }
    // Corner towers (28px, with flags on top two)
    var towerSize = 28;
    var corners = [[0,0],[TOWN_W - towerSize,0],[0,TOWN_H - towerSize],[TOWN_W - towerSize,TOWN_H - towerSize]];
    for (var ti = 0; ti < corners.length; ti++) {
      var tx = corners[ti][0], ty = corners[ti][1];
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(tx, ty, towerSize, towerSize);
      ctx.fillStyle = '#5a5a62';
      ctx.fillRect(tx + 2, ty + 2, towerSize - 4, towerSize - 4);
      // Tower crenellations
      for (var m = 0; m < 3; m++) {
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(tx + 2 + m * 10, ty, 6, 4);
        ctx.fillStyle = '#5e5e66';
        ctx.fillRect(tx + 3 + m * 10, ty + 1, 4, 2);
      }
      // Window hole
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(tx + 11, ty + 12, 6, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(tx + 12, ty + 13, 4, 4);
      // Flags on top two towers
      if (ti < 2) {
        var fx = tx + towerSize - 4, fy = ty - 10;
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(fx, fy, 2, 14);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(fx + 2, fy + 1, 8, 5);
        ctx.fillRect(fx + 2, fy + 3, 6, 3);
        ctx.fillRect(fx + 2, fy + 5, 4, 2);
        ctx.fillStyle = '#e04040';
        ctx.fillRect(fx + 3, fy + 2, 4, 3);
      }
    }
    // Wall torch sconce brackets (static part — flames drawn in animated pass)
    var wallTorchPositions = [
      {x: 200, y: W - 4}, {x: 400, y: W - 4}, {x: 660, y: W - 4}, {x: 860, y: W - 4},
      {x: W - 4, y: 250}, {x: W - 4, y: 420},
      {x: TOWN_W - W, y: 250}, {x: TOWN_W - W, y: 420}
    ];
    for (var wti = 0; wti < wallTorchPositions.length; wti++) {
      var wt = wallTorchPositions[wti];
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(wt.x - 2, wt.y, 6, 4);
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(wt.x - 1, wt.y + 1, 4, 2);
    }
  }

  function drawTownGate(ctx) {
    var gx = TOWN_W / 2 - 35;
    var gy = TOWN_H - TOWN_WALL;
    var gw = 70;
    // Clear gate area with ground color
    ctx.fillStyle = '#b89868';
    ctx.fillRect(gx, gy, gw, TOWN_WALL);
    // Stone pillars flanking gate
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(gx - 6, gy, 8, TOWN_WALL);
    ctx.fillRect(gx + gw - 2, gy, 8, TOWN_WALL);
    ctx.fillStyle = '#5a5a62';
    ctx.fillRect(gx - 5, gy + 1, 6, TOWN_WALL - 2);
    ctx.fillRect(gx + gw - 1, gy + 1, 6, TOWN_WALL - 2);
    // Arch top
    ctx.beginPath();
    ctx.arc(gx + gw / 2, gy + 4, gw / 2, Math.PI, 0);
    ctx.fillStyle = '#4a4a52';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + gw / 2, gy + 4, gw / 2 - 4, Math.PI, 0);
    ctx.fillStyle = '#b89868';
    ctx.fill();
    // Keystone at arch apex
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(gx + gw / 2 - 4, gy - 2, 8, 6);
    ctx.fillStyle = '#d4b050';
    ctx.fillRect(gx + gw / 2 - 3, gy - 1, 6, 4);
    // Iron portcullis bars (partly raised)
    ctx.fillStyle = 'rgba(60,60,60,0.35)';
    for (var bi = 0; bi < 5; bi++) {
      ctx.fillRect(gx + 8 + bi * 13, gy, 2, TOWN_WALL);
    }
    // Horizontal bar across top
    ctx.fillStyle = 'rgba(60,60,60,0.3)';
    ctx.fillRect(gx + 4, gy + 6, gw - 8, 2);
    // Iron studs on pillars
    ctx.fillStyle = '#606068';
    ctx.fillRect(gx - 3, gy + 8, 2, 2);
    ctx.fillRect(gx - 3, gy + 22, 2, 2);
    ctx.fillRect(gx + gw + 1, gy + 8, 2, 2);
    ctx.fillRect(gx + gw + 1, gy + 22, 2, 2);
    // Steps leading in (3 ascending)
    ctx.fillStyle = '#a89060';
    ctx.fillRect(gx + 4, gy + TOWN_WALL - 6, gw - 8, 2);
    ctx.fillStyle = '#b8a070';
    ctx.fillRect(gx + 8, gy + TOWN_WALL - 4, gw - 16, 2);
    ctx.fillStyle = '#c4a878';
    ctx.fillRect(gx + 12, gy + TOWN_WALL - 2, gw - 24, 2);
    // Torch brackets on each side (flames drawn in animated pass)
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(gx - 10, gy + 8, 5, 4);
    ctx.fillRect(gx + gw + 5, gy + 8, 5, 4);
  }

  function drawTownPaths(ctx) {
    var centerX = 530, centerY = 330;
    var CS_W = 7, CS_H = 5;
    var stoneColors = ['#a89060','#b09868','#a08858','#b8a070','#a8986a'];
    var borderColor = '#8a7048';
    // Define path rectangles
    var pathRects = [
      [TOWN_WALL, centerY - 14, TOWN_W - TOWN_WALL * 2, 28],
      [TOWN_WALL, 126, TOWN_W - TOWN_WALL * 2, 28],
      [TOWN_WALL, 506, TOWN_W - TOWN_WALL * 2, 28],
      [centerX - 14, TOWN_WALL, 28, TOWN_H - TOWN_WALL * 2]
    ];
    for (var pi = 0; pi < pathRects.length; pi++) {
      var pr = pathRects[pi];
      var px = pr[0], py = pr[1], pw = pr[2], ph = pr[3];
      // Dark border
      ctx.fillStyle = borderColor;
      ctx.fillRect(px, py, pw, ph);
      // Cobblestones
      var pCols = Math.ceil(pw / CS_W) + 1;
      var pRows = Math.ceil(ph / CS_H) + 1;
      for (var pr2 = 0; pr2 < pRows; pr2++) {
        var rowOff = (pr2 % 2) * 3;
        for (var pc = 0; pc < pCols; pc++) {
          var csx = px + pc * CS_W + rowOff;
          var csy = py + pr2 * CS_H;
          if (csx >= px + pw || csy >= py + ph) continue;
          var cw = Math.min(CS_W - 1, px + pw - csx - 1);
          var ch2 = Math.min(CS_H - 1, py + ph - csy - 1);
          if (cw < 1 || ch2 < 1) continue;
          var h = tileHash(csx + 3000, csy + 3000);
          // Worn center (lighter where people walk most)
          var distFromCenter;
          if (pw > ph) {
            distFromCenter = Math.abs((csy + CS_H / 2) - (py + ph / 2));
          } else {
            distFromCenter = Math.abs((csx + CS_W / 2) - (px + pw / 2));
          }
          ctx.fillStyle = distFromCenter < 6 ? '#c0a870' : stoneColors[(h >>> 0) % stoneColors.length];
          ctx.fillRect(csx, csy, cw, ch2);
          // Top highlight
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(csx, csy, cw, 1);
        }
      }
      // Edge highlights
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      if (pw > ph) {
        ctx.fillRect(px, py, pw, 1);
      } else {
        ctx.fillRect(px, py, 1, ph);
      }
    }
  }

  function drawTownBuilding(ctx, id, bx, by) {
    var ox = bx - 35, oy = by - 30;
    // Ground shadow for every building
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 28, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (id) {
      case 'tavern':
        // Wooden tavern with timber frame detail
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox, oy, 70, 55);
        // Timber beams
        ctx.fillStyle = '#5c3a1a';
        ctx.fillRect(ox, oy + 18, 70, 2);
        ctx.fillRect(ox, oy + 36, 70, 2);
        ctx.fillRect(ox + 34, oy, 2, 55);
        // Roof
        ctx.fillStyle = '#5c3a1a';
        ctx.fillRect(ox - 4, oy - 8, 78, 12);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(ox + 10, oy - 12, 50, 6);
        ctx.fillRect(ox + 20, oy - 15, 30, 5);
        // Roof highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox - 4, oy - 8, 78, 1);
        // Chimney
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 55, oy - 22, 10, 14);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(ox + 55, oy - 22, 10, 2);
        // Door
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(ox + 28, oy + 34, 14, 21);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 39, oy + 44, 2, 2);
        // Doorstep
        ctx.fillStyle = '#9b7b4a';
        ctx.fillRect(ox + 26, oy + 53, 18, 2);
        // Windows with warm glow
        ctx.fillStyle = '#ffd080';
        ctx.fillRect(ox + 6, oy + 10, 12, 10);
        ctx.fillRect(ox + 52, oy + 10, 12, 10);
        // Window panes
        ctx.fillStyle = '#5c3a1a';
        ctx.fillRect(ox + 11, oy + 10, 2, 10);
        ctx.fillRect(ox + 6, oy + 14, 12, 2);
        ctx.fillRect(ox + 57, oy + 10, 2, 10);
        ctx.fillRect(ox + 52, oy + 14, 12, 2);
        // Hanging sign (chain + board)
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(ox + 63, oy - 2, 1, 6);
        ctx.fillRect(ox + 71, oy - 2, 1, 6);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 62, oy + 4, 12, 8);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 64, oy + 6, 8, 4);
        // Barrels (2)
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 2, oy + 42, 10, 12);
        ctx.fillRect(ox + 13, oy + 44, 8, 10);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 3, oy + 46, 8, 2);
        ctx.fillRect(ox + 14, oy + 48, 6, 2);
        // Top-left highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox, oy, 1, 55);
        break;

      case 'store':
        ctx.fillStyle = '#b89060';
        ctx.fillRect(ox, oy, 70, 55);
        // Striped awning with scalloped edge
        for (var ai = 0; ai < 7; ai++) {
          ctx.fillStyle = ai % 2 === 0 ? '#cc4444' : '#eeeeee';
          ctx.fillRect(ox + ai * 10, oy - 8, 10, 10);
        }
        // Scalloped edge
        for (var si = 0; si < 14; si++) {
          ctx.fillStyle = si % 2 === 0 ? '#cc4444' : '#eeeeee';
          ctx.fillRect(ox + si * 5, oy + 2, 5, 2);
        }
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 27, oy + 32, 16, 23);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 40, oy + 44, 2, 2);
        // Windows with display items
        ctx.fillStyle = '#c8e0ff';
        ctx.fillRect(ox + 6, oy + 12, 14, 14);
        ctx.fillRect(ox + 50, oy + 12, 14, 14);
        ctx.fillStyle = '#8a7050';
        ctx.fillRect(ox + 12, oy + 12, 2, 14);
        ctx.fillRect(ox + 56, oy + 12, 2, 14);
        ctx.fillRect(ox + 6, oy + 18, 14, 2);
        ctx.fillRect(ox + 50, oy + 18, 14, 2);
        // Display items in left window (potions)
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(ox + 8, oy + 21, 3, 4);
        ctx.fillStyle = '#3366cc';
        ctx.fillRect(ox + 14, oy + 21, 3, 4);
        // Crate stacks
        ctx.fillStyle = '#a08050';
        ctx.fillRect(ox + 55, oy + 40, 12, 12);
        ctx.fillStyle = '#907040';
        ctx.fillRect(ox + 57, oy + 36, 10, 10);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 55, oy + 45, 12, 1);
        ctx.fillRect(ox + 60, oy + 40, 1, 12);
        // OPEN sign on door
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(ox + 29, oy + 34, 12, 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = '5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OPEN', ox + 35, oy + 39);
        // Potted plant
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 2, oy + 48, 6, 6);
        ctx.fillStyle = '#4a7a3a';
        ctx.fillRect(ox + 1, oy + 44, 8, 5);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox, oy, 1, 55);
        break;

      case 'bank':
        ctx.fillStyle = '#808088';
        ctx.fillRect(ox, oy, 70, 55);
        ctx.fillStyle = '#70707a';
        ctx.fillRect(ox, oy, 70, 6);
        // Columns
        ctx.fillStyle = '#90909a';
        ctx.fillRect(ox + 4, oy + 6, 8, 49);
        ctx.fillRect(ox + 58, oy + 6, 8, 49);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox + 4, oy + 6, 2, 49);
        ctx.fillRect(ox + 58, oy + 6, 2, 49);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(ox + 10, oy + 6, 2, 49);
        ctx.fillRect(ox + 64, oy + 6, 2, 49);
        // Column capitals
        ctx.fillStyle = '#a0a0a8';
        ctx.fillRect(ox + 2, oy + 6, 12, 3);
        ctx.fillRect(ox + 56, oy + 6, 12, 3);
        // Iron vault door
        ctx.fillStyle = '#404048';
        ctx.fillRect(ox + 22, oy + 24, 26, 31);
        // Door rivets
        ctx.fillStyle = '#606068';
        ctx.fillRect(ox + 25, oy + 28, 2, 2);
        ctx.fillRect(ox + 43, oy + 28, 2, 2);
        ctx.fillRect(ox + 25, oy + 48, 2, 2);
        ctx.fillRect(ox + 43, oy + 48, 2, 2);
        // Gold handle
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 44, oy + 38, 3, 4);
        // Gold trim
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox, oy + 6, 70, 2);
        ctx.fillRect(ox, oy + 53, 70, 2);
        // Coin emblem above door
        ctx.fillStyle = '#c0a040';
        ctx.beginPath();
        ctx.arc(bx, oy + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4b050';
        ctx.beginPath();
        ctx.arc(bx, oy + 16, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a08030';
        ctx.fillRect(bx - 1, oy + 14, 2, 4);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox, oy, 1, 55);
        break;

      case 'casino':
        ctx.fillStyle = '#8a2040';
        ctx.fillRect(ox, oy, 70, 55);
        ctx.fillStyle = '#b03050';
        ctx.fillRect(ox + 2, oy + 2, 66, 51);
        // Gold border
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(ox, oy, 70, 2);
        ctx.fillRect(ox, oy + 53, 70, 2);
        ctx.fillRect(ox, oy, 2, 55);
        ctx.fillRect(ox + 68, oy, 2, 55);
        // Door (open archway)
        ctx.fillStyle = '#4a1020';
        ctx.fillRect(ox + 24, oy + 30, 22, 25);
        // Red carpet to door
        ctx.fillStyle = '#8a2040';
        ctx.fillRect(ox + 28, oy + 52, 14, 6);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 28, oy + 52, 1, 6);
        ctx.fillRect(ox + 41, oy + 52, 1, 6);
        // Card suit emblems
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u2660', bx - 16, oy + 18);
        ctx.fillText('\u2665', bx - 4, oy + 18);
        ctx.fillText('\u2666', bx + 8, oy + 18);
        ctx.fillText('\u2663', bx + 20, oy + 18);
        // Marquee light dots (static; animated will redraw)
        var mColors = ['#ff4444','#ffd700','#44ff44','#ffd700','#ff4444','#ffd700','#44ff44','#ffd700'];
        for (var mi = 0; mi < 8; mi++) {
          ctx.fillStyle = mColors[mi];
          ctx.fillRect(ox + 5 + mi * 8, oy + 22, 4, 3);
        }
        // Velvet rope pillars
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 18, oy + 48, 3, 8);
        ctx.fillRect(ox + 49, oy + 48, 3, 8);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox + 2, oy + 2, 66, 1);
        break;

      case 'fountain':
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(bx, by + 18, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Bottom pool
        ctx.fillStyle = '#5080a8';
        ctx.beginPath();
        ctx.ellipse(bx, by + 14, 34, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pool rim
        ctx.strokeStyle = '#808090';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(bx, by + 14, 34, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bx, by + 13, 33, 17, 0, Math.PI * 0.8, Math.PI * 1.8);
        ctx.stroke();
        // 4 decorative posts around pool
        var postAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
        for (var poi = 0; poi < 4; poi++) {
          var ppx = bx + Math.cos(postAngles[poi]) * 30;
          var ppy = by + 14 + Math.sin(postAngles[poi]) * 14;
          ctx.fillStyle = '#808090';
          ctx.fillRect(ppx - 2, ppy - 8, 4, 8);
          ctx.fillStyle = '#90909a';
          ctx.fillRect(ppx - 2, ppy - 8, 4, 2);
        }
        // Middle column
        ctx.fillStyle = '#a0a0a8';
        ctx.fillRect(bx - 6, by - 2, 12, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(bx - 6, by - 2, 2, 16);
        // Upper bowl
        ctx.fillStyle = '#5888b0';
        ctx.beginPath();
        ctx.ellipse(bx, by + 2, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#90909a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bx, by + 2, 10, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Top spire
        ctx.fillStyle = '#b0b0b8';
        ctx.fillRect(bx - 3, by - 14, 6, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(bx - 3, by - 14, 1, 14);
        // Top cap
        ctx.fillStyle = '#c0c0c8';
        ctx.fillRect(bx - 5, by - 16, 10, 3);
        // Gold orb
        ctx.fillStyle = '#c0a040';
        ctx.beginPath();
        ctx.arc(bx, by - 18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0c060';
        ctx.fillRect(bx - 1, by - 19, 1, 1);
        // Bench nearby
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(bx + 42, by + 8, 18, 4);
        ctx.fillRect(bx + 44, by + 12, 2, 4);
        ctx.fillRect(bx + 56, by + 12, 2, 4);
        break;

      case 'arcade':
        ctx.fillStyle = '#4060a0';
        ctx.fillRect(ox, oy, 70, 55);
        ctx.fillStyle = '#5070b0';
        ctx.fillRect(ox + 2, oy + 2, 66, 51);
        // GAMES sign with border
        ctx.fillStyle = '#222244';
        ctx.fillRect(ox + 6, oy + 2, 58, 16);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(ox + 8, oy + 4, 54, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAMES', bx, oy + 13);
        // PLAY sub-sign
        ctx.fillStyle = '#44ff44';
        ctx.font = '6px monospace';
        ctx.fillText('PLAY', bx, oy + 23);
        // Door
        ctx.fillStyle = '#203060';
        ctx.fillRect(ox + 27, oy + 32, 16, 23);
        // Game screen in door
        ctx.fillStyle = '#114422';
        ctx.fillRect(ox + 29, oy + 34, 12, 10);
        // Colored lights
        var arcadeColors2 = ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff'];
        for (var li2 = 0; li2 < 5; li2++) {
          ctx.fillStyle = arcadeColors2[li2];
          ctx.fillRect(ox + 8 + li2 * 12, oy + 26, 6, 4);
        }
        // Coin slot detail
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 46, oy + 44, 3, 5);
        ctx.fillStyle = '#303050';
        ctx.fillRect(ox + 47, oy + 45, 1, 3);
        // Joystick icon on facade
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(ox + 10, oy + 36, 2, 6);
        ctx.fillRect(ox + 9, oy + 34, 4, 2);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox + 2, oy + 2, 66, 1);
        break;

      case 'chapel':
        // Main body
        ctx.fillStyle = '#c8c0b0';
        ctx.fillRect(ox, oy + 8, 55, 47);
        // Peaked roof
        ctx.fillStyle = '#8b4040';
        ctx.fillRect(ox - 2, oy + 4, 59, 8);
        ctx.fillStyle = '#7a3030';
        ctx.fillRect(ox + 6, oy, 42, 6);
        ctx.fillRect(ox + 12, oy - 4, 30, 6);
        ctx.fillRect(ox + 18, oy - 7, 18, 5);
        // Roof highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox - 2, oy + 4, 59, 1);
        // Cross
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 24, oy - 17, 6, 14);
        ctx.fillRect(ox + 20, oy - 13, 14, 4);
        ctx.fillStyle = '#d4b050';
        ctx.fillRect(ox + 25, oy - 16, 4, 12);
        ctx.fillRect(ox + 21, oy - 12, 12, 2);
        // Door (arched)
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 17, oy + 34, 20, 21);
        ctx.fillStyle = '#c8c0b0';
        ctx.beginPath();
        ctx.arc(ox + 27, oy + 34, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath();
        ctx.arc(ox + 27, oy + 34, 8, Math.PI, 0);
        ctx.fill();
        // Stained glass (4 panes)
        ctx.fillStyle = '#6080c0';
        ctx.fillRect(ox + 18, oy + 14, 7, 14);
        ctx.fillStyle = '#c06040';
        ctx.fillRect(ox + 25, oy + 14, 7, 14);
        ctx.fillStyle = '#40a060';
        ctx.fillRect(ox + 18, oy + 21, 7, 7);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 25, oy + 21, 7, 7);
        // Window frame
        ctx.fillStyle = '#8a7a68';
        ctx.fillRect(ox + 24, oy + 14, 2, 14);
        ctx.fillRect(ox + 18, oy + 20, 14, 2);
        // Bell tower
        ctx.fillStyle = '#b0a898';
        ctx.fillRect(ox + 44, oy - 8, 14, 22);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 47, oy - 2, 8, 6);
        ctx.fillStyle = '#d4b050';
        ctx.fillRect(ox + 49, oy, 4, 3);
        // Mini graveyard (3 tombstones right of building)
        ctx.fillStyle = '#707078';
        ctx.fillRect(ox + 58, oy + 44, 4, 6);
        ctx.fillRect(ox + 64, oy + 46, 3, 5);
        ctx.fillRect(ox + 70, oy + 45, 4, 5);
        ctx.fillStyle = '#808088';
        ctx.fillRect(ox + 58, oy + 44, 4, 1);
        ctx.fillRect(ox + 64, oy + 46, 3, 1);
        ctx.fillRect(ox + 70, oy + 45, 4, 1);
        // Rose bush
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(ox - 6, oy + 46, 8, 5);
        ctx.fillStyle = '#cc3030';
        ctx.fillRect(ox - 4, oy + 46, 2, 2);
        ctx.fillRect(ox - 1, oy + 48, 2, 2);
        break;

      case 'dungeon':
        // Heavy stone gatehouse
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(ox, oy, 55, 55);
        ctx.fillStyle = '#3a3a42';
        ctx.fillRect(ox + 2, oy + 2, 51, 51);
        // Gate arch
        ctx.fillStyle = '#5a5a62';
        ctx.fillRect(ox + 10, oy + 12, 35, 43);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 14, oy + 16, 27, 39);
        // Portcullis bars
        ctx.fillStyle = '#606068';
        for (var dbi = 0; dbi < 5; dbi++) {
          ctx.fillRect(ox + 16 + dbi * 6, oy + 16, 2, 39);
        }
        ctx.fillRect(ox + 14, oy + 22, 27, 2);
        ctx.fillRect(ox + 14, oy + 32, 27, 2);
        // Descending stairs
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(ox + 16, oy + 40, 23, 4);
        ctx.fillStyle = '#222228';
        ctx.fillRect(ox + 18, oy + 44, 19, 4);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 20, oy + 48, 15, 4);
        // Green glow from below (static part)
        ctx.fillStyle = 'rgba(80,255,80,0.04)';
        ctx.fillRect(ox + 14, oy + 30, 27, 25);
        // Skulls on pillars
        ctx.fillStyle = '#d0d0c0';
        ctx.fillRect(ox + 2, oy + 4, 8, 6);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 3, oy + 5, 2, 2);
        ctx.fillRect(ox + 7, oy + 5, 2, 2);
        ctx.fillStyle = '#d0d0c0';
        ctx.fillRect(ox + 45, oy + 4, 8, 6);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 46, oy + 5, 2, 2);
        ctx.fillRect(ox + 50, oy + 5, 2, 2);
        // Chain detail
        ctx.fillStyle = '#606068';
        for (var ci = 0; ci < 5; ci++) {
          ctx.fillRect(ox + 6, oy + 14 + ci * 6, 2, 3);
          ctx.fillRect(ox + 47, oy + 14 + ci * 6, 2, 3);
        }
        // Wanted poster
        ctx.fillStyle = '#d8c8a0';
        ctx.fillRect(ox + 40, oy + 14, 8, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(ox + 42, oy + 16, 4, 1);
        ctx.fillRect(ox + 41, oy + 19, 6, 1);
        ctx.fillRect(ox + 42, oy + 21, 3, 1);
        break;

      case 'library':
        ctx.fillStyle = '#b0a088';
        ctx.fillRect(ox, oy, 65, 55);
        ctx.fillStyle = '#a09078';
        ctx.fillRect(ox, oy, 65, 6);
        // Arched windows with book spines visible
        var winXs = [ox + 6, ox + 24, ox + 42];
        for (var wi = 0; wi < 3; wi++) {
          // Window
          ctx.fillStyle = '#c8e0ff';
          ctx.fillRect(winXs[wi], oy + 10, 10, 22);
          // Arch top
          ctx.fillStyle = '#a09078';
          ctx.fillRect(winXs[wi], oy + 8, 10, 3);
          ctx.fillRect(winXs[wi] + 1, oy + 7, 8, 2);
          // Book spines visible through glass
          var bookColors = ['#8a3030','#3030a0','#308030','#6b4e2b'];
          for (var bi2 = 0; bi2 < 4; bi2++) {
            ctx.fillStyle = bookColors[(wi + bi2) % 4];
            ctx.fillRect(winXs[wi] + 1 + bi2 * 2, oy + 22, 2, 8);
          }
        }
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 24, oy + 36, 16, 19);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 37, oy + 46, 2, 2);
        // Scroll motif
        ctx.fillStyle = '#d8c8a0';
        ctx.fillRect(ox + 54, oy + 10, 8, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(ox + 56, oy + 13, 4, 1);
        ctx.fillRect(ox + 55, oy + 16, 6, 1);
        ctx.fillRect(ox + 56, oy + 19, 3, 1);
        // Lantern by door
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 20, oy + 36, 3, 5);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox, oy, 1, 55);
        break;

      case 'barracks':
        ctx.fillStyle = '#7a7a60';
        ctx.fillRect(ox, oy, 65, 55);
        ctx.fillStyle = '#6a6a50';
        ctx.fillRect(ox, oy, 65, 6);
        // Door (iron-banded)
        ctx.fillStyle = '#4a4a30';
        ctx.fillRect(ox + 22, oy + 30, 20, 25);
        ctx.fillStyle = '#404048';
        ctx.fillRect(ox + 22, oy + 34, 20, 2);
        ctx.fillRect(ox + 22, oy + 44, 20, 2);
        // Shield emblem (centered, larger)
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 26, oy + 8, 12, 16);
        ctx.fillStyle = '#8b2020';
        ctx.fillRect(ox + 28, oy + 10, 8, 12);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 31, oy + 12, 2, 8);
        ctx.fillRect(ox + 28, oy + 15, 8, 2);
        // Weapon rack (enhanced)
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(ox + 50, oy + 10, 10, 38);
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(ox + 52, oy + 12, 2, 18); // sword
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 56, oy + 14, 2, 20); // spear shaft
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(ox + 55, oy + 14, 4, 3); // spear tip
        // Axe shape
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(ox + 52, oy + 32, 4, 3);
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 53, oy + 35, 2, 8);
        // Banner/flag
        ctx.fillStyle = '#8b2020';
        ctx.fillRect(ox + 4, oy + 8, 8, 18);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 4, oy + 8, 8, 2);
        ctx.fillRect(ox + 6, oy + 14, 4, 4);
        // Training dummy in front
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 10, oy + 38, 2, 16);
        ctx.fillRect(ox + 6, oy + 42, 10, 2);
        ctx.fillStyle = '#8b6b3a';
        ctx.beginPath();
        ctx.arc(ox + 11, oy + 36, 3, 0, Math.PI * 2);
        ctx.fill();
        // Arrow target
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox + 60, oy + 52, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc3030';
        ctx.beginPath();
        ctx.arc(ox + 60, oy + 52, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + 59, oy + 51, 2, 2);
        break;

      case 'petstore':
        ctx.fillStyle = '#c09060';
        ctx.fillRect(ox, oy, 70, 55);
        ctx.fillStyle = '#b08050';
        ctx.fillRect(ox, oy, 70, 6);
        ctx.fillStyle = '#a07040';
        ctx.fillRect(ox - 2, oy - 4, 74, 8);
        // Roof highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox - 2, oy - 4, 74, 1);
        // Egg display window (3 eggs in nests)
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(ox + 4, oy + 12, 30, 18);
        // Nests
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 5, oy + 24, 8, 4);
        ctx.fillRect(ox + 15, oy + 24, 8, 4);
        ctx.fillRect(ox + 25, oy + 24, 8, 4);
        // Eggs
        ctx.fillStyle = '#ff9090';
        ctx.beginPath();
        ctx.ellipse(ox + 9, oy + 22, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#90c0ff';
        ctx.beginPath();
        ctx.ellipse(ox + 19, oy + 22, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c090ff';
        ctx.beginPath();
        ctx.ellipse(ox + 29, oy + 22, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 40, oy + 28, 18, 27);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 55, oy + 42, 2, 2);
        // Paw print sign
        ctx.fillStyle = '#ffd080';
        ctx.fillRect(ox + 40, oy + 8, 22, 16);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 48, oy + 16, 4, 4);
        ctx.fillRect(ox + 46, oy + 13, 2, 2);
        ctx.fillRect(ox + 50, oy + 13, 2, 2);
        ctx.fillRect(ox + 53, oy + 15, 2, 2);
        // ADOPT banner
        ctx.fillStyle = '#ff6060';
        ctx.fillRect(ox + 4, oy + 34, 28, 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ADOPT!', ox + 18, oy + 40);
        // Food bowl by door
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 62, oy + 50, 6, 3);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 63, oy + 49, 4, 2);
        // Hay on floor
        ctx.fillStyle = '#c8b060';
        ctx.fillRect(ox + 36, oy + 50, 3, 1);
        ctx.fillRect(ox + 40, oy + 52, 2, 1);
        ctx.fillRect(ox + 34, oy + 53, 2, 1);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox, oy, 1, 55);
        break;
    }
  }

  // ── Town Animated Parts ───────────────────────
  // ── Town Light Pool Buffer ──────────────────────
  function renderTownLightPoolBuffer() {
    if (!townLightPoolBuffer) {
      townLightPoolBuffer = document.createElement('canvas');
      townLightPoolBuffer.width = TOWN_W;
      townLightPoolBuffer.height = TOWN_H;
      townLightPoolBufferCtx = townLightPoolBuffer.getContext('2d');
    }
    var lc = townLightPoolBufferCtx;
    lc.clearRect(0, 0, TOWN_W, TOWN_H);
    // Wall torch glow pools
    var torchPositions = [
      {x:200,y:TOWN_WALL+10},{x:400,y:TOWN_WALL+10},{x:660,y:TOWN_WALL+10},{x:860,y:TOWN_WALL+10},
      {x:TOWN_WALL+10,y:250},{x:TOWN_WALL+10,y:420},
      {x:TOWN_W-TOWN_WALL-10,y:250},{x:TOWN_W-TOWN_WALL-10,y:420}
    ];
    for (var ti = 0; ti < torchPositions.length; ti++) {
      var tp = torchPositions[ti];
      var tg = lc.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, 50);
      tg.addColorStop(0, 'rgba(255,160,60,0.10)');
      tg.addColorStop(1, 'rgba(255,160,60,0)');
      lc.fillStyle = tg;
      lc.fillRect(tp.x - 50, tp.y - 50, 100, 100);
    }
    // Fountain ambient glow
    var fg = lc.createRadialGradient(530, 330, 0, 530, 330, 80);
    fg.addColorStop(0, 'rgba(100,160,220,0.06)');
    fg.addColorStop(1, 'rgba(100,160,220,0)');
    lc.fillStyle = fg;
    lc.fillRect(450, 250, 160, 160);
    // Gate torch glow
    var gg = lc.createRadialGradient(530, TOWN_H - TOWN_WALL, 0, 530, TOWN_H - TOWN_WALL, 60);
    gg.addColorStop(0, 'rgba(255,140,40,0.08)');
    gg.addColorStop(1, 'rgba(255,140,40,0)');
    lc.fillStyle = gg;
    lc.fillRect(470, TOWN_H - TOWN_WALL - 60, 120, 120);
  }

  // ── Town Dust / Pollen ─────────────────────────
  function initTownDustParticles() {
    townDustParticles = [];
    for (var i = 0; i < 18; i++) {
      townDustParticles.push({
        x: TOWN_WALL + 20 + Math.random() * (TOWN_W - TOWN_WALL * 2 - 40),
        y: Math.random() * TOWN_H,
        speed: 1.5 + Math.random() * 3,
        alpha: 0.08 + Math.random() * 0.15,
        size: 1 + Math.random(),
        seed: Math.random() * 1000
      });
    }
  }

  // ── NPC Pathfinding (BFS) ──────────────────────
  function buildPathAdjacency() {
    var adj = {};
    var nodeIds = Object.keys(TOWN_PATH_NODES);
    for (var i = 0; i < nodeIds.length; i++) adj[nodeIds[i]] = [];
    for (var e = 0; e < TOWN_PATH_EDGES.length; e++) {
      var a = TOWN_PATH_EDGES[e][0], b = TOWN_PATH_EDGES[e][1];
      if (adj[a].indexOf(b) === -1) adj[a].push(b);
      if (adj[b].indexOf(a) === -1) adj[b].push(a);
    }
    return adj;
  }
  var townPathAdj = buildPathAdjacency();

  function findNpcPath(fromNode, toNode) {
    if (fromNode === toNode) return [];
    var queue = [[fromNode]], visited = {};
    visited[fromNode] = true;
    while (queue.length > 0) {
      var path = queue.shift();
      var current = path[path.length - 1];
      var neighbors = townPathAdj[current] || [];
      for (var i = 0; i < neighbors.length; i++) {
        var n = neighbors[i];
        if (visited[n]) continue;
        var newPath = path.concat(n);
        if (n === toNode) {
          var waypoints = [];
          for (var j = 1; j < newPath.length; j++) waypoints.push(TOWN_PATH_NODES[newPath[j]]);
          return waypoints;
        }
        visited[n] = true;
        queue.push(newPath);
      }
    }
    return [TOWN_PATH_NODES[toNode]]; // fallback direct
  }

  // ── NPC Init / Cleanup ─────────────────────────
  function initTownNpcs() {
    townNpcStates = [];
    townActiveBubbles = [];
    for (var i = 0; i < TOWN_NPCS.length; i++) {
      var npc = TOWN_NPCS[i];
      var unlock = NPC_UNLOCK[npc.id];
      if (unlock && !unlock()) continue;
      var startBuilding = npc.route[0] === 'random' ? TOWN_LOC_ORDER[Math.floor(Math.random() * TOWN_LOC_ORDER.length)] : npc.route[0];
      var startNode = BUILDING_NODE[startBuilding] || 'mid-center';
      var startPos = TOWN_PATH_NODES[startNode] || {x: 530, y: 360};
      townNpcStates.push({
        npcIdx: i,
        active: true,
        pos: { x: startPos.x, y: startPos.y + 20 },
        dir: 'down',
        routeIdx: 0,
        phase: 'dwell',
        dwellTimer: 1000 + Math.random() * 3000,
        waypoints: [],
        waypointIdx: 0,
        animFrame: 0,
        animTimer: 0,
        speechBubble: null,
        playerCooldown: 5000 + Math.random() * 5000,
        interactCooldown: 0,
        ghostAlpha: npc.alpha,
        ghostFadeTimer: Math.random() * 200
      });
    }
    initTownGroups();
  }
  function cleanupTownNpcs() { townNpcStates = []; townActiveBubbles = []; cleanupTownGroups(); }

  // ── NPC Update ─────────────────────────────────
  function updateTownNpcs(dt) {
    var dtMs = dt * 1000;
    for (var si = 0; si < townNpcStates.length; si++) {
      var s = townNpcStates[si];
      var npc = TOWN_NPCS[s.npcIdx];
      if (!s.active) continue;

      // Cooldowns
      if (s.playerCooldown > 0) s.playerCooldown -= dtMs;
      if (s.interactCooldown > 0) s.interactCooldown -= dtMs;

      // Ghost fade cycle
      if (npc.special === 'fade') {
        s.ghostFadeTimer += dt;
        var fadePhase = (s.ghostFadeTimer % 30);
        if (fadePhase < 2) s.ghostAlpha = Math.min(npc.alpha, fadePhase / 2 * npc.alpha);
        else if (fadePhase > 22) s.ghostAlpha = Math.max(0, (30 - fadePhase) / 8 * npc.alpha);
        else s.ghostAlpha = npc.alpha;
      }

      // Speech bubble timer
      if (s.speechBubble) {
        s.speechBubble.timer -= dtMs;
        if (s.speechBubble.timer <= 0) s.speechBubble = null;
      }

      if (s.phase === 'dwell') {
        s.dwellTimer -= dtMs;
        // Idle speech (random chance during dwell)
        if (!s.speechBubble && npc.lines.length > 0 && Math.random() < 0.001) {
          s.speechBubble = { text: npc.lines[Math.floor(Math.random() * npc.lines.length)], timer: 3500 };
        }
        if (s.dwellTimer <= 0) {
          // Pick next destination
          var nextBuilding;
          if (npc.route[0] === 'random') {
            nextBuilding = TOWN_LOC_ORDER[Math.floor(Math.random() * TOWN_LOC_ORDER.length)];
          } else {
            s.routeIdx = (s.routeIdx + 1) % npc.route.length;
            nextBuilding = npc.route[s.routeIdx];
          }
          var destNode;
          if (nextBuilding === 'gate') {
            destNode = 'gate';
          } else {
            destNode = BUILDING_NODE[nextBuilding];
          }
          // Find current closest node
          var closestNode = null, closestDist = Infinity;
          var nodeIds = Object.keys(TOWN_PATH_NODES);
          for (var ni = 0; ni < nodeIds.length; ni++) {
            var nd = TOWN_PATH_NODES[nodeIds[ni]];
            var dd = Math.abs(s.pos.x - nd.x) + Math.abs(s.pos.y - nd.y);
            if (dd < closestDist) { closestDist = dd; closestNode = nodeIds[ni]; }
          }
          s.waypoints = findNpcPath(closestNode, destNode);
          s.waypointIdx = 0;
          s.phase = 'walk';
          // Special behavior check
          if (npc.special === 'stumble' && Math.random() < npc.specialChance) {
            s.phase = 'special';
            s.specialTimer = 2500;
            s.speechBubble = { text: '*trips and falls flat*', timer: 2500 };
          } else if (npc.special === 'sprint' && Math.random() < npc.specialChance) {
            // Barnaby sprint — just increase speed temporarily handled in walk
            s.sprinting = true;
            s.speechBubble = { text: 'They almost saw me!', timer: 2000 };
          }
        }
      } else if (s.phase === 'walk') {
        if (s.waypoints.length === 0 || s.waypointIdx >= s.waypoints.length) {
          s.phase = 'dwell';
          s.dwellTimer = npc.dwellMin + Math.random() * (npc.dwellMax - npc.dwellMin);
          s.sprinting = false;
          // Show arrival speech
          if (npc.lines.length > 0 && Math.random() < 0.4) {
            s.speechBubble = { text: npc.lines[Math.floor(Math.random() * npc.lines.length)], timer: 3500 };
          }
          continue;
        }
        var wp = s.waypoints[s.waypointIdx];
        var dx = wp.x - s.pos.x;
        var dy = wp.y - s.pos.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
          s.pos.x = wp.x;
          s.pos.y = wp.y;
          s.waypointIdx++;
          continue;
        }
        var spd = s.sprinting ? npc.speed * 3 : npc.speed;
        var step = spd * dt;
        if (step > dist) step = dist;
        var wobbleOff = npc.wobble ? Math.sin(townSmokeFrame * 0.03 + si * 7) * 1.5 : 0;
        var moveX = (dx / dist) * step + (Math.abs(dy) > Math.abs(dx) ? wobbleOff * dt * 4 : 0);
        var moveY = (dy / dist) * step;
        // Fountain collision avoidance (center 530,330, radius ~42)
        var nextX = s.pos.x + moveX;
        var nextY = s.pos.y + moveY;
        var fountDx = nextX - 530, fountDy = nextY - 330;
        var fountDist = Math.sqrt(fountDx * fountDx + fountDy * fountDy);
        if (fountDist < 42) {
          // Push away from fountain center
          var pushAngle = Math.atan2(fountDy, fountDx);
          nextX = 530 + Math.cos(pushAngle) * 43;
          nextY = 330 + Math.sin(pushAngle) * 43;
        }
        s.pos.x = nextX;
        s.pos.y = nextY;
        // Clamp
        s.pos.x = Math.max(TOWN_WALL + 10, Math.min(TOWN_W - TOWN_WALL - 10, s.pos.x));
        s.pos.y = Math.max(TOWN_WALL + 10, Math.min(TOWN_H - TOWN_WALL - 10, s.pos.y));
        // Direction
        if (Math.abs(dx) > Math.abs(dy)) s.dir = dx > 0 ? 'right' : 'left';
        else s.dir = dy > 0 ? 'down' : 'up';
        // Walk anim
        s.animTimer += dt;
        if (s.animTimer > 0.3) { s.animTimer = 0; s.animFrame = (s.animFrame + 1) % 4; }
      } else if (s.phase === 'interact') {
        s.interactTimer -= dtMs;
        if (s.interactTimer <= 0) {
          s.phase = 'dwell';
          s.dwellTimer = 1000;
          s.interactCooldown = 30000;
        }
      } else if (s.phase === 'special') {
        s.specialTimer -= dtMs;
        if (s.specialTimer <= 0) {
          s.phase = 'dwell';
          s.dwellTimer = 2000;
        }
      }

      // Player proximity speech
      if (s.playerCooldown <= 0 && npc.playerLines.length > 0 && s.phase !== 'interact') {
        var pdx = townPlayerPos.x - s.pos.x;
        var pdy = townPlayerPos.y - s.pos.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 45) {
          s.speechBubble = { text: npc.playerLines[Math.floor(Math.random() * npc.playerLines.length)], timer: 4500 };
          s.playerCooldown = 12000;
        }
      }
    }
    // NPC-NPC proximity interactions
    checkNpcNpcProximity();
    // Update conversation groups
    updateTownGroups(dt);
  }

  function checkNpcNpcProximity() {
    for (var i = 0; i < townNpcStates.length; i++) {
      var sa = townNpcStates[i];
      var na = TOWN_NPCS[sa.npcIdx];
      if (sa.phase === 'interact' || sa.interactCooldown > 0) continue;
      for (var j = i + 1; j < townNpcStates.length; j++) {
        var sb = townNpcStates[j];
        var nb = TOWN_NPCS[sb.npcIdx];
        if (sb.phase === 'interact' || sb.interactCooldown > 0) continue;
        var dx = sa.pos.x - sb.pos.x, dy = sa.pos.y - sb.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 25) continue;
        // Check for paired dialogue
        var key1 = na.id + '+' + nb.id, key2 = nb.id + '+' + na.id;
        var dialogue = PAIRED_DIALOGUES[key1] || PAIRED_DIALOGUES[key2];
        if (!dialogue || Math.random() > 0.3) continue;
        var pair = dialogue[Math.floor(Math.random() * dialogue.length)];
        var isReversed = !!PAIRED_DIALOGUES[key2] && !PAIRED_DIALOGUES[key1];
        sa.phase = 'interact'; sa.interactTimer = 5000; sa.interactCooldown = 30000;
        sb.phase = 'interact'; sb.interactTimer = 5000; sb.interactCooldown = 30000;
        sa.speechBubble = { text: isReversed ? pair.b : pair.a, timer: 4500 };
        setTimeout(function(sbb, txt) { return function() { sbb.speechBubble = { text: txt, timer: 4000 }; }; }(sb, isReversed ? pair.a : pair.b), 1500);
        break;
      }
    }
  }

  // ── NPC Drawing ────────────────────────────────
  function drawTownNpcs(ctx) {
    for (var i = 0; i < townNpcStates.length; i++) {
      var s = townNpcStates[i];
      var npc = TOWN_NPCS[s.npcIdx];
      if (!s.active) continue;
      var alpha = npc.special === 'fade' ? s.ghostAlpha : npc.alpha;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      drawSingleTownNpc(ctx, npc, s);
      ctx.globalAlpha = 1;
    }
  }

  function drawSingleTownNpc(ctx, npc, state) {
    var x = Math.round(state.pos.x);
    var y = Math.round(state.pos.y);
    var sc = npc.scale;

    // Idle animation offset
    var idleOff = 0;
    if (state.phase !== 'walk') {
      if (npc.idleAnim === 'sway') idleOff = Math.sin(townSmokeFrame * 0.025 + state.npcIdx) * 1.5;
      else if (npc.idleAnim === 'bounce') idleOff = -Math.abs(Math.sin(townSmokeFrame * 0.04 + state.npcIdx)) * 1.5;
      else if (npc.idleAnim === 'float') idleOff = Math.sin(townSmokeFrame * 0.018 + state.npcIdx) * 2.5;
    }

    // Special: cat
    if (npc.accessory === 'cat') {
      drawTownCat(ctx, x, y + idleOff, state);
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 8 * sc, 5 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stumble special (lying down)
    if (state.phase === 'special' && npc.special === 'stumble') {
      ctx.fillStyle = npc.body;
      ctx.fillRect(x - 7, y + 2, 14, 5);
      ctx.fillStyle = npc.skin;
      ctx.beginPath();
      ctx.arc(x - 9, y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Walk bob
    var walkBob = state.phase === 'walk' ? Math.sin(state.animFrame * Math.PI / 2) * 1.5 : 0;

    // Body
    ctx.fillStyle = npc.body;
    ctx.beginPath();
    ctx.ellipse(x, y + idleOff - walkBob, 5 * sc, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = npc.skin;
    ctx.beginPath();
    ctx.arc(x, y - 8 * sc + idleOff - walkBob, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    if (npc.hair) {
      ctx.fillStyle = npc.hair;
      ctx.fillRect(x - 3.5 * sc, y - 12 * sc + idleOff - walkBob, 7 * sc, 3 * sc);
    }

    // Hat (helmet for Hilda, bald cap for Aldric)
    if (npc.hat) {
      ctx.fillStyle = npc.hat;
      ctx.fillRect(x - 4 * sc, y - 13 * sc + idleOff - walkBob, 8 * sc, 3.5 * sc);
    }

    // Top hat (Mr. Vault)
    if (npc.accessory === 'tophat') {
      ctx.fillStyle = '#222222';
      ctx.fillRect(x - 3 * sc, y - 20 * sc + idleOff - walkBob, 6 * sc, 9 * sc);
      ctx.fillRect(x - 4.5 * sc, y - 12 * sc + idleOff - walkBob, 9 * sc, 2 * sc);
    }

    // Stick (Pip)
    if (npc.accessory === 'stick') {
      ctx.fillStyle = '#6b4e2b';
      ctx.save();
      ctx.translate(x + 4 * sc, y + idleOff - walkBob);
      var stickAngle = state.phase === 'special' ? Math.sin(townSmokeFrame * 0.12) * 0.8 : 0.3;
      ctx.rotate(stickAngle);
      ctx.fillRect(0, -8 * sc, 1.5, 10 * sc);
      ctx.restore();
    }

    // Coin drop (Mr. Vault special)
    if (npc.special === 'coindrop' && state.phase === 'walk' && townSmokeFrame % 90 < 2) {
      ctx.fillStyle = 'rgba(255,215,0,0.5)';
      ctx.beginPath();
      ctx.arc(x - 2, y + 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTownCat(ctx, x, y, state) {
    // 8x6 pixel cat with tail
    ctx.fillStyle = '#c07830';
    // Body
    ctx.fillRect(x - 3, y, 6, 4);
    // Head
    ctx.fillRect(x + 3, y - 2, 4, 4);
    // Ears
    ctx.fillRect(x + 3, y - 3, 2, 2);
    ctx.fillRect(x + 5, y - 3, 2, 2);
    // Eyes
    ctx.fillStyle = '#40cc40';
    ctx.fillRect(x + 4, y - 1, 1, 1);
    ctx.fillRect(x + 6, y - 1, 1, 1);
    // Tail (flicks)
    ctx.fillStyle = '#c07830';
    var tailDir = (townSmokeFrame % 180 < 90) ? -1 : 1;
    if (state.phase === 'dwell') {
      ctx.fillRect(x - 4, y + 1, 1, 3);
      ctx.fillRect(x - 5, y + tailDir, 1, 2);
    } else {
      ctx.fillRect(x - 4, y, 1, 2);
    }
    // Legs (only when walking)
    ctx.fillStyle = '#a06020';
    if (state.phase === 'walk') {
      var legFrame = state.animFrame % 2;
      ctx.fillRect(x - 2, y + 4, 1, 2 + legFrame);
      ctx.fillRect(x + 1, y + 4, 1, 2 + (1 - legFrame));
    } else {
      ctx.fillRect(x - 2, y + 4, 1, 2);
      ctx.fillRect(x + 1, y + 4, 1, 2);
    }
  }

  // ── NPC Speech Bubbles ─────────────────────────
  function drawTownNpcBubbles(ctx) {
    for (var i = 0; i < townNpcStates.length; i++) {
      var s = townNpcStates[i];
      if (!s.speechBubble || !s.active) continue;
      var npc = TOWN_NPCS[s.npcIdx];
      var alpha = npc.special === 'fade' ? s.ghostAlpha : npc.alpha;
      if (alpha <= 0.05) continue;
      ctx.globalAlpha = Math.min(1, alpha + 0.3);
      drawNpcBubble(ctx, s.pos.x, s.pos.y - 18 * npc.scale, s.speechBubble.text, npc.name);
      ctx.globalAlpha = 1;
    }
  }

  function drawNpcBubble(ctx, x, y, text, name) {
    // Word wrap at 22 chars
    var words = text.split(' ');
    var lines = [], line = '';
    for (var w = 0; w < words.length; w++) {
      var test = line ? line + ' ' + words[w] : words[w];
      if (test.length > 22 && line) { lines.push(line); line = words[w]; }
      else line = test;
    }
    if (line) lines.push(line);
    var lineH = 12;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    var maxW = 0;
    for (var i = 0; i < lines.length; i++) {
      var lw = ctx.measureText(lines[i]).width;
      if (lw > maxW) maxW = lw;
    }
    var nameW = ctx.measureText(name).width;
    if (nameW > maxW) maxW = nameW;
    var bw = maxW + 14, bh = lines.length * lineH + 18;
    var bx = Math.max(5, Math.min(TOWN_W - bw - 5, x - bw / 2));
    var by = y - 16 - bh;
    // Bg
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    // Pointer triangle
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.beginPath();
    ctx.moveTo(x - 3, by + bh);
    ctx.lineTo(x, by + bh + 5);
    ctx.lineTo(x + 3, by + bh);
    ctx.fill();
    // Name
    ctx.fillStyle = '#c0a040';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(name, bx + bw / 2, by + 10);
    // Text
    ctx.fillStyle = '#e0d0a0';
    ctx.font = '9px monospace';
    for (var i2 = 0; i2 < lines.length; i2++) {
      ctx.fillText(lines[i2], bx + bw / 2, by + 22 + i2 * lineH);
    }
  }

  // ── NPC Conversation Groups ──────────────────────
  function initTownGroups() {
    townGroupStates = [];
    for (var gi = 0; gi < TOWN_NPC_GROUPS.length; gi++) {
      var grp = TOWN_NPC_GROUPS[gi];
      townGroupStates.push({
        groupIdx: gi,
        exchangeIdx: Math.floor(Math.random() * grp.exchanges.length),
        timer: 8000 + gi * 15000 + Math.random() * 10000, // stagger groups heavily
        phase: 'idle', // idle → showA → showB → pause → idle
        bubbleA: null,
        bubbleB: null,
        idleAnimTimer: Math.random() * 1000
      });
    }
  }

  function cleanupTownGroups() { townGroupStates = []; }

  function updateTownGroups(dt) {
    var dtMs = dt * 1000;
    for (var gi = 0; gi < townGroupStates.length; gi++) {
      var gs = townGroupStates[gi];
      var grp = TOWN_NPC_GROUPS[gs.groupIdx];

      gs.idleAnimTimer += dt;

      // Bubble timers
      if (gs.bubbleA) { gs.bubbleA.timer -= dtMs; if (gs.bubbleA.timer <= 0) gs.bubbleA = null; }
      if (gs.bubbleB) { gs.bubbleB.timer -= dtMs; if (gs.bubbleB.timer <= 0) gs.bubbleB = null; }

      gs.timer -= dtMs;
      if (gs.timer <= 0) {
        if (gs.phase === 'idle') {
          // Show speaker A
          var ex = grp.exchanges[gs.exchangeIdx];
          gs.bubbleA = { text: ex.a, timer: 5000 };
          gs.bubbleB = null;
          gs.phase = 'showA';
          gs.timer = 4000; // delay before B responds
        } else if (gs.phase === 'showA') {
          // Show speaker B
          var ex2 = grp.exchanges[gs.exchangeIdx];
          gs.bubbleB = { text: ex2.b, timer: 5000 };
          gs.phase = 'showB';
          gs.timer = 6000; // both visible, then pause
        } else if (gs.phase === 'showB') {
          // Pause between exchanges
          gs.bubbleA = null;
          gs.bubbleB = null;
          gs.phase = 'idle';
          gs.exchangeIdx = (gs.exchangeIdx + 1) % grp.exchanges.length;
          gs.timer = 20000 + Math.random() * 15000; // 20-35s gap between exchanges
        }
      }
    }
  }

  function drawTownGroups(ctx) {
    for (var gi = 0; gi < townGroupStates.length; gi++) {
      var gs = townGroupStates[gi];
      var grp = TOWN_NPC_GROUPS[gs.groupIdx];
      for (var ni = 0; ni < grp.npcs.length; ni++) {
        var nDef = grp.npcs[ni];
        var x = Math.round(grp.pos.x + nDef.offset.x);
        var y = Math.round(grp.pos.y + nDef.offset.y);
        var sc = nDef.scale;
        // Gentle idle sway
        var idleOff = Math.sin(gs.idleAnimTimer * 0.8 + ni * 3.5) * 1;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8 * sc, 5 * sc, 2 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = nDef.body;
        ctx.beginPath();
        ctx.ellipse(x, y + idleOff, 5 * sc, 7 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = nDef.skin;
        ctx.beginPath();
        ctx.arc(x, y - 8 * sc + idleOff, 3.5 * sc, 0, Math.PI * 2);
        ctx.fill();
        // Hair
        if (nDef.hair) {
          ctx.fillStyle = nDef.hair;
          ctx.fillRect(x - 3.5 * sc, y - 12 * sc + idleOff, 7 * sc, 3 * sc);
        }
      }
    }
  }

  function drawTownGroupBubbles(ctx) {
    for (var gi = 0; gi < townGroupStates.length; gi++) {
      var gs = townGroupStates[gi];
      var grp = TOWN_NPC_GROUPS[gs.groupIdx];
      // Speaker A bubble
      if (gs.bubbleA) {
        var nA = grp.npcs[0];
        var ax = grp.pos.x + nA.offset.x;
        var ay = grp.pos.y + nA.offset.y - 18 * nA.scale;
        drawNpcBubble(ctx, ax, ay, gs.bubbleA.text, nA.name);
      }
      // Speaker B bubble
      if (gs.bubbleB) {
        var nB = grp.npcs[1];
        var bx2 = grp.pos.x + nB.offset.x;
        var by2 = grp.pos.y + nB.offset.y - 18 * nB.scale;
        // Offset B bubble higher if A is also showing to avoid overlap
        var bOff = gs.bubbleA ? -40 : 0;
        drawNpcBubble(ctx, bx2, by2 + bOff, gs.bubbleB.text, nB.name);
      }
    }
  }

  // ── Town Animated Parts (Enhanced) ─────────────
  function drawTownAnimatedParts(ctx) {
    // Light pool buffer blit with pulsing alpha
    if (townLightPoolBuffer) {
      ctx.globalAlpha = 0.5 + Math.sin(townSmokeFrame * 0.01) * 0.15;
      ctx.drawImage(townLightPoolBuffer, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Fountain water particles (enhanced — 16 particles)
    var ft = TOWN_LOCATIONS.fountain;
    var t = townSmokeFrame * 0.05;
    for (var fi = 0; fi < 16; fi++) {
      var angle = (fi / 16) * Math.PI * 2 + t;
      var r = 6 + Math.sin(t * 2 + fi) * 2;
      var fy = ft.y - 10 - Math.abs(Math.sin(angle + t)) * 14;
      var fx = ft.x + Math.cos(angle) * r;
      ctx.globalAlpha = Math.sin(townSmokeFrame * 0.1 + fi) * 0.3 + 0.4;
      ctx.fillStyle = '#80c0ff';
      ctx.fillRect(fx, fy, 2, 2);
    }
    // Cascade streams
    for (var ci = 0; ci < 4; ci++) {
      var ca = (ci / 4) * Math.PI * 2 + t * 0.5;
      var cfx = ft.x + Math.cos(ca) * 4;
      var cfy = ft.y + 2 + Math.sin(townSmokeFrame * 0.15 + ci) * 2;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#80c0ff';
      ctx.fillRect(cfx, cfy, 1, 4);
    }
    // Splash rings (2 concentric)
    ctx.globalAlpha = 0.2 + Math.sin(t * 3) * 0.1;
    ctx.strokeStyle = '#80c0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ft.x, ft.y + 14, 30 + Math.sin(t * 2) * 2, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1 + Math.sin(t * 3 + 1) * 0.05;
    ctx.beginPath();
    ctx.ellipse(ft.x, ft.y + 14, 22 + Math.sin(t * 2 + 2) * 2, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Coin glints in pool
    ctx.globalAlpha = 0.3 + Math.sin(townSmokeFrame * 0.08) * 0.2;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ft.x - 8 + Math.sin(t * 0.7) * 3, ft.y + 10, 2, 1);
    ctx.fillRect(ft.x + 12, ft.y + 16 + Math.sin(t * 0.5) * 2, 1, 1);
    ctx.fillRect(ft.x - 16, ft.y + 12, 1, 1);
    ctx.globalAlpha = 1;

    // Chimney smoke on tavern
    drawSmoke(ctx, TOWN_LOCATIONS.tavern.x + 22, TOWN_LOCATIONS.tavern.y - 45, townSmokeFrame, 100);

    // Wall torches (6 on top wall, 2 on sides)
    var wallTorches = [
      {x:200, y:TOWN_WALL}, {x:400, y:TOWN_WALL}, {x:660, y:TOWN_WALL}, {x:860, y:TOWN_WALL},
      {x:TOWN_WALL, y:250}, {x:TOWN_WALL, y:420},
      {x:TOWN_W - TOWN_WALL - 2, y:250}, {x:TOWN_W - TOWN_WALL - 2, y:420}
    ];
    for (var wti = 0; wti < wallTorches.length; wti++) {
      drawTorch(ctx, wallTorches[wti].x - 1, wallTorches[wti].y - 8, townSmokeFrame, 300 + wti);
    }

    // Dungeon torches
    drawTorch(ctx, TOWN_LOCATIONS.dungeon.x - 30, TOWN_LOCATIONS.dungeon.y - 12, townSmokeFrame, 200);
    drawTorch(ctx, TOWN_LOCATIONS.dungeon.x + 24, TOWN_LOCATIONS.dungeon.y - 12, townSmokeFrame, 201);

    // Gate torches
    drawTorch(ctx, TOWN_W / 2 - 42, TOWN_H - TOWN_WALL - 4, townSmokeFrame, 220);
    drawTorch(ctx, TOWN_W / 2 + 40, TOWN_H - TOWN_WALL - 4, townSmokeFrame, 221);

    // Casino marquee lights (cycling)
    var casinoLoc = TOWN_LOCATIONS.casino;
    var mColors2 = ['#ff4444','#ffd700','#44ff44','#ffd700','#ff4444','#ffd700','#44ff44','#ffd700'];
    for (var mi2 = 0; mi2 < 8; mi2++) {
      var mci = (mi2 + Math.floor(townSmokeFrame / 6)) % 8;
      ctx.fillStyle = mColors2[mci];
      ctx.globalAlpha = 0.5 + Math.sin(townSmokeFrame * 0.2 + mi2) * 0.4;
      ctx.fillRect(casinoLoc.x - 30 + mi2 * 8, casinoLoc.y - 3, 4, 3);
    }
    ctx.globalAlpha = 1;

    // Arcade lights (cycling colors)
    var arcadeLoc = TOWN_LOCATIONS.arcade;
    var aColors2 = ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff'];
    for (var ai2 = 0; ai2 < 5; ai2++) {
      var aci = (ai2 + Math.floor(townSmokeFrame / 8)) % 5;
      ctx.fillStyle = aColors2[aci];
      ctx.globalAlpha = 0.6 + Math.sin(townSmokeFrame * 0.2 + ai2) * 0.3;
      ctx.fillRect(arcadeLoc.x - 27 + ai2 * 12, arcadeLoc.y - 3, 6, 4);
    }
    // Arcade game screen flicker
    ctx.fillStyle = aColors2[Math.floor(townSmokeFrame / 4) % 5];
    ctx.globalAlpha = 0.3;
    ctx.fillRect(arcadeLoc.x - 6, arcadeLoc.y + 4, 12, 8);
    ctx.globalAlpha = 1;

    // Chapel window candle flicker
    var chapelLoc = TOWN_LOCATIONS.chapel;
    var candleAlpha = 0.4 + Math.sin(townSmokeFrame * 0.12) * 0.2;
    ctx.fillStyle = '#ffd060';
    ctx.globalAlpha = candleAlpha;
    ctx.fillRect(chapelLoc.x - 12, chapelLoc.y - 14, 2, 2);
    ctx.fillRect(chapelLoc.x - 4, chapelLoc.y - 14, 2, 2);
    ctx.globalAlpha = 1;

    // Tavern window glow pulse
    var tavernLoc = TOWN_LOCATIONS.tavern;
    ctx.fillStyle = '#ffd080';
    ctx.globalAlpha = 0.15 + Math.sin(townSmokeFrame * 0.04) * 0.08;
    ctx.fillRect(tavernLoc.x - 29, tavernLoc.y - 20, 12, 10);
    ctx.fillRect(tavernLoc.x + 17, tavernLoc.y - 20, 12, 10);
    ctx.globalAlpha = 1;

    // Pet store egg sparkle
    if (townSmokeFrame % 40 < 3) {
      var petLoc = TOWN_LOCATIONS.petstore;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(petLoc.x - 26 + (tileHash(townSmokeFrame, 77) % 20), petLoc.y - 8, 1, 1);
      ctx.globalAlpha = 1;
    }

    // Puddle shimmer
    var puddles = [{x:350,y:200},{x:700,y:450},{x:180,y:400}];
    for (var psi = 0; psi < puddles.length; psi++) {
      ctx.fillStyle = 'rgba(180,210,240,0.08)';
      ctx.globalAlpha = 0.3 + Math.sin(townSmokeFrame * 0.03 + psi * 2) * 0.15;
      ctx.beginPath();
      ctx.ellipse(puddles[psi].x + Math.sin(t * 0.5 + psi) * 2, puddles[psi].y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Dust / pollen particles
    for (var di = 0; di < townDustParticles.length; di++) {
      var dp = townDustParticles[di];
      dp.y -= dp.speed * 0.016;
      dp.x += Math.sin(townSmokeFrame * 0.008 + dp.seed) * 0.3;
      if (dp.y < -5) {
        dp.y = TOWN_H + 5;
        dp.x = TOWN_WALL + 20 + Math.random() * (TOWN_W - TOWN_WALL * 2 - 40);
      }
      ctx.fillStyle = 'rgba(200,180,120,' + dp.alpha + ')';
      ctx.fillRect(dp.x, dp.y, dp.size, dp.size);
    }

    // Smoke haze clouds
    for (var hi = 0; hi < townHazeClouds.length; hi++) {
      var hc = townHazeClouds[hi];
      hc.x += hc.speed;
      if (hc.x > TOWN_W + 50) hc.x = -hc.w;
      if (hc.x < -hc.w - 50) hc.x = TOWN_W;
      ctx.fillStyle = 'rgba(180,170,150,0.015)';
      ctx.beginPath();
      ctx.ellipse(hc.x, hc.y, hc.w / 2, hc.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Town Labels ───────────────────────────────
  function drawTownLabels(ctx) {
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';

    for (var i = 0; i < TOWN_LOC_ORDER.length; i++) {
      var id = TOWN_LOC_ORDER[i];
      var loc = TOWN_LOCATIONS[id];
      var labelY = loc.y + 36;

      var nameWidth = ctx.measureText(loc.name).width;
      var bgW = nameWidth + 10;
      var bgH = 14;
      var bgX = loc.x - bgW / 2;
      var bgY = labelY - 10;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bgX, bgY, bgW, bgH);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bgX, bgY, bgW, bgH);

      ctx.fillStyle = '#000000';
      ctx.fillText(loc.name, loc.x + 1, labelY + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(loc.name, loc.x, labelY);
    }
  }

  // ── Town Return Button ────────────────────────
  function drawTownReturnButton(ctx) {
    var text = '\u2190 Leave Town';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    var tw = ctx.measureText(text).width;
    var bx = TOWN_WALL + 6, by = TOWN_WALL + 4;
    var bw = tw + 18, bh = 22;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx + 2, by + 2, bw, bh);
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    // Gold border (double)
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e0c060';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
    // Text
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(text, bx + 9, by + 15);
  }

  // ── Town Enter Prompt ─────────────────────────
  function drawTownEnterPrompt(ctx) {
    if (!townPlayerAtLocation) return;
    var loc = TOWN_LOCATIONS[townPlayerAtLocation];
    if (!loc) return;

    var text = 'Enter ' + loc.name;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    var tw = ctx.measureText(text).width;
    var px = townPlayerPos.x;
    var py = townPlayerPos.y - CHAR_DRAW_SIZE + 4;
    var bw = tw + 20, bh = 22;
    var bx = px - bw / 2, by = py - 12;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx + 2, by + 2, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e0c060';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

    ctx.fillStyle = '#ffdd44';
    ctx.fillText(text, px, py + 2);

    var arrowPhase = Math.sin(townSmokeFrame * 0.08) * 2;
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(px - 2, by + bh + 2 + arrowPhase, 4, 2);
    ctx.fillRect(px - 1, by + bh + 4 + arrowPhase, 2, 2);
  }

  // ── Town Player Drawing ───────────────────────
  function drawTownPlayer(ctx) {
    var animType = townPlayerTarget ? 'walk' : 'idle';
    drawCharSprite(ctx, townPlayerPos.x, townPlayerPos.y, townPlayerDir, townPlayerFrame, animType, currentCharId);
  }

  // ── Town Map Orchestrator ─────────────────────
  function drawTownMap() {
    var ctx = mapCtx;
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);

    // Blit static buffer
    if (!townStaticBuffer) renderTownStaticBuffer();
    ctx.drawImage(townStaticBuffer, 0, 0);

    // Animated parts
    drawTownAnimatedParts(ctx);
    drawTownNpcs(ctx);
    drawTownGroups(ctx);
    drawTownNpcBubbles(ctx);
    drawTownGroupBubbles(ctx);
    drawTownFollower(ctx);
    drawTownPlayer(ctx);
    drawTownLabels(ctx);
    if (townEnterPromptVisible && townPlayerAtLocation) {
      drawTownEnterPrompt(ctx);
    }
    drawTownReturnButton(ctx);

    ctx.restore();
  }

  // ══════════════════════════════════════════════
  // ══  DUNGEON GATE / COMBAT INTEGRATION       ══
  // ══════════════════════════════════════════════

  function openDungeonGate() {
    var rpgPets = getRpgPetState();
    var ownedIds = Object.keys(rpgPets.owned);
    if (ownedIds.length === 0) {
      addGameMessage('You need at least one pet to enter the dungeon! Visit the Pet Store first.', 'system');
      return;
    }
    // Calculate total skill level for dungeon requirements
    var totalLevel = 5; // default
    if (window.__RPG_SKILLS_API && window.__RPG_SKILLS_API.getLevel) {
      totalLevel = 0;
      var skillKeys = ['mining', 'fishing', 'woodcutting', 'smithing', 'combat'];
      for (var i = 0; i < skillKeys.length; i++) {
        totalLevel += window.__RPG_SKILLS_API.getLevel(skillKeys[i]);
      }
    }
    if (window.RpgCombat) {
      window.RpgCombat.showDungeonSelect(rpgPets, totalLevel);
    } else {
      addGameMessage('Combat system not loaded.', 'system');
    }
  }

  // Called by rpg-combat.js team builder when player clicks "Enter Dungeon"
  window.__RPG_START_COMBAT = function (config) {
    // Init combat canvas
    var canvasEl = $('rpg-combat-canvas');
    var containerEl = $('rpg-combat-container');
    if (!canvasEl || !containerEl) return;

    if (window.RpgCombat) {
      window.RpgCombat.init(canvasEl, containerEl);
      window.RpgCombat.onComplete = function (result) {
        if (config.mode === 'arena') {
          // Arena: return to map, post message, then re-open arena select
          returnToMap(function () {
            renderLocationPane('arena', null);
            if (result.victory) {
              addGameMessage('Arena victory! Earned ' + result.gp + ' GP and ' + result.petXp + ' pet XP.', 'reward');
            } else {
              addGameMessage('Arena defeat. Better luck next time!', 'combat');
            }
            // Re-open arena select with fresh pet state
            var freshPets = getRpgPetState();
            if (freshPets && window.RpgCombat) {
              window.RpgCombat.showArenaSelect(freshPets);
            }
          });
        } else {
          // Dungeon: full return-to-map cleanup
          returnToMap(function () {
            if (result.victory) {
              addGameMessage('Dungeon cleared! Earned ' + result.gp + ' GP and ' + result.petXp + ' pet XP.', 'reward');
            } else {
              addGameMessage('Your team was defeated. ' + result.wavesCleared + ' waves cleared.', 'combat');
            }
          });
        }
      };
      showCenterContent('combat');
      // Setup auto/run buttons
      setupCombatActionButtons();
      window.RpgCombat.startBattle(config);
    }
  };

  function setupCombatActionButtons() {
    var autoBtn = $('rpg-combat-auto');
    var runBtn = $('rpg-combat-run');
    var actionsBar = $('rpg-combat-actions');
    if (actionsBar) actionsBar.style.display = '';

    if (autoBtn) {
      // Remove old listeners by cloning
      var newAutoBtn = autoBtn.cloneNode(true);
      autoBtn.parentNode.replaceChild(newAutoBtn, autoBtn);
      newAutoBtn.textContent = 'Auto All';
      newAutoBtn.addEventListener('click', function () {
        if (window.RpgCombat && window.RpgCombat.isActive()) {
          newAutoBtn.classList.toggle('active');
          var isAuto = newAutoBtn.classList.contains('active');
          newAutoBtn.textContent = isAuto ? 'Auto All: ON' : 'Auto All';
          window.RpgCombat.toggleAuto(isAuto);
        }
      });
    }

    if (runBtn) {
      var newRunBtn = runBtn.cloneNode(true);
      runBtn.parentNode.replaceChild(newRunBtn, runBtn);
      newRunBtn.addEventListener('click', function () {
        if (window.RpgCombat && window.RpgCombat.isActive()) {
          if (confirm('Flee the battle? You\'ll receive reduced rewards.')) {
            window.RpgCombat.runFromBattle();
          }
        }
      });
    }
  }

  // Expose rpg.js APIs for rpg-combat.js to use
  window.__RPG_GET_PET_STATE = function () { return getRpgPetState(); };
  window.__RPG_SAVE_PET_STATE = function (state) { saveRpgPetState(state); };
  window.__RPG_ADD_GAME_MESSAGE = function (text, type) { addGameMessage(text, type); };
  window.__RPG_GET_EQUIP_STATS = getEquipStats;
  window.__RPG_RETURN_TO_MAP = function () { returnToMap(); };
  // Re-inject stationed pet dock into game area (called after skills.js re-renders)
  window.__RPG_REINJECT_DOCK = function () {
    if (currentLocationId) renderStationedPetInGameArea(currentLocationId);
  };
  // Check if a pet is stationed at the current skill location (for auto mode)
  window.__RPG_HAS_STATIONED_PET = function (skill) {
    if (!currentLocationId) return false;
    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[currentLocationId];
    var locSkill = RPG_STATION_SKILL_MAP[currentLocationId];
    if (locSkill !== skill) return false;
    return !!(station && station.petId && rpgPets.owned[station.petId]);
  };

  // Set combat storage key when slot is opened
  function setCombatStorageKey() {
    if (activeSlot >= 0) {
      window.__RPG_COMBAT_SLOT_KEY = SLOT_PREFIX + activeSlot + '-combat';
    }
  }

  // ══════════════════════════════════════════════
  // ══  PET STORE MODAL                         ══
  // ══════════════════════════════════════════════

  // PET_KEY already defined at top of file — legacy, kept for reference
  // RPG pet store now uses per-slot rpgPets state (no global reads/writes)

  function openPetStoreModal() {
    if (petStoreModalOpen) return;
    petStoreModalOpen = true;

    var overlay = document.createElement('div');
    overlay.className = 'rpg-modal-overlay';
    overlay.id = 'rpg-petstore-overlay';

    var modal = document.createElement('div');
    modal.className = 'rpg-petstore-modal';

    // Header
    var header = document.createElement('div');
    header.className = 'rpg-petstore-header';
    header.innerHTML = '<span class="rpg-petstore-title">Pet Store</span>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rpg-petstore-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closePetStoreModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Balance bar
    var balance = document.createElement('div');
    balance.className = 'rpg-petstore-balance';
    balance.id = 'rpg-petstore-balance';
    modal.appendChild(balance);

    // Egg cards container
    var eggsRow = document.createElement('div');
    eggsRow.className = 'rpg-petstore-eggs';
    eggsRow.id = 'rpg-petstore-eggs';
    modal.appendChild(eggsRow);

    // Hatch result area
    var result = document.createElement('div');
    result.className = 'rpg-petstore-result';
    result.id = 'rpg-petstore-result';
    result.style.display = 'none';
    modal.appendChild(result);

    // Collection
    var collLabel = document.createElement('div');
    collLabel.className = 'rpg-petstore-section-label';
    collLabel.id = 'rpg-petstore-coll-label';
    collLabel.textContent = 'Your Collection';
    modal.appendChild(collLabel);

    var collection = document.createElement('div');
    collection.className = 'rpg-petstore-collection';
    collection.id = 'rpg-petstore-collection';
    modal.appendChild(collection);

    overlay.appendChild(modal);

    // Click overlay background to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePetStoreModal();
    });

    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    renderPetStoreContents();
  }

  function closePetStoreModal() {
    petStoreModalOpen = false;
    hatchAnimating = false;
    for (var ti = 0; ti < hatchTimeouts.length; ti++) {
      clearTimeout(hatchTimeouts[ti]);
    }
    hatchTimeouts = [];
    var overlay = document.getElementById('rpg-petstore-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // ── General Store ────────────────────────────
  function openGeneralStore() {
    if (generalStoreOpen) return;
    generalStoreOpen = true;

    addGameMessage(STORE_KEEPER_LINES[Math.floor(Math.random() * STORE_KEEPER_LINES.length)], 'npc');

    var overlay = document.createElement('div');
    overlay.className = 'rpg-modal-overlay';
    overlay.id = 'rpg-store-overlay';

    var modal = document.createElement('div');
    modal.className = 'rpg-modal rpg-store-modal';

    // Header
    var header = document.createElement('div');
    header.className = 'rpg-modal-header';
    header.innerHTML = '<h3>General Store</h3>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rpg-modal-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closeGeneralStore);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Balance bar
    var balBar = document.createElement('div');
    balBar.className = 'rpg-store-balance';
    balBar.id = 'rpg-store-balance';
    modal.appendChild(balBar);

    // Tab bar
    var tabs = document.createElement('div');
    tabs.className = 'rpg-store-tabs';
    var buyTab = document.createElement('button');
    buyTab.className = 'rpg-store-tab active';
    buyTab.textContent = 'Buy';
    buyTab.id = 'rpg-store-tab-buy';
    var sellTab = document.createElement('button');
    sellTab.className = 'rpg-store-tab';
    sellTab.textContent = 'Sell';
    sellTab.id = 'rpg-store-tab-sell';
    tabs.appendChild(buyTab);
    tabs.appendChild(sellTab);
    modal.appendChild(tabs);

    // Body
    var body = document.createElement('div');
    body.className = 'rpg-store-body';
    body.id = 'rpg-store-body';
    modal.appendChild(body);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeGeneralStore();
    });
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';

    buyTab.addEventListener('click', function () {
      buyTab.classList.add('active');
      sellTab.classList.remove('active');
      renderStoreBuyTab();
    });
    sellTab.addEventListener('click', function () {
      sellTab.classList.add('active');
      buyTab.classList.remove('active');
      renderStoreSellTab();
    });

    updateStoreBalance();
    renderStoreBuyTab();
  }

  function closeGeneralStore() {
    generalStoreOpen = false;
    var overlay = document.getElementById('rpg-store-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  // ── Tavern: The Rusty Tankard ──────────────────

  function getDailyDateString() {
    var d = new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function simpleHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  }

  function seededShuffle(arr, seed) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      var j = seed % (i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function generateDailyBoard() {
    var QS = window.QuestSystem;
    if (!QS) return { date: '', quests: [] };
    var defs = QS.getDefs();
    if (!defs) return { date: '', quests: [] };

    var today = getDailyDateString();
    var board = QS.getBoardState();
    if (board && board.date === today && board.quests && board.quests.length > 0) return board;

    // Collect board pool quests
    var fetchPool = [];
    var combatPool = [];
    var hardPool = [];
    for (var qid in defs) {
      if (!defs.hasOwnProperty(qid)) continue;
      var def = defs[qid];
      if (!def.boardPool) continue;
      // Check prerequisites
      if (def.requirements && def.requirements.quests) {
        var allMet = true;
        for (var r = 0; r < def.requirements.quests.length; r++) {
          if (!QS.isCompleted(def.requirements.quests[r])) { allMet = false; break; }
        }
        if (!allMet) continue;
      }

      if (def.difficulty === 'hard' || def.difficulty === 'ultra_nightmare') {
        hardPool.push(qid);
      } else {
        // Sort by objective type
        var isCombat = false;
        for (var o = 0; o < def.objectives.length; o++) {
          var t = def.objectives[o].type;
          if (t === 'kill_enemies' || t === 'arena_wins' || t === 'arena_streak' || t === 'defeat_boss' || t === 'clear_dungeon') {
            isCombat = true; break;
          }
        }
        if (isCombat) combatPool.push(qid);
        else fetchPool.push(qid);
      }
    }

    var seed = simpleHash(today + '-tavern-board');
    fetchPool = seededShuffle(fetchPool, seed);
    combatPool = seededShuffle(combatPool, seed + 1);
    hardPool = seededShuffle(hardPool, seed + 2);

    var picked = [];
    // Pick 3 fetch
    var fc = 0;
    for (var i = 0; i < fetchPool.length && fc < 3; i++) {
      picked.push(fetchPool[i]); fc++;
    }
    // Pick 2 combat
    var cc = 0;
    for (var i = 0; i < combatPool.length && cc < 2; i++) {
      picked.push(combatPool[i]); cc++;
    }
    // Fill remaining from hard pool if slots available
    if (fc < 3 || cc < 2) {
      var remaining = (3 - fc) + (2 - cc);
      for (var i = 0; i < hardPool.length && remaining > 0; i++) {
        picked.push(hardPool[i]); remaining--;
      }
    }
    // Always try to include at least one hard/ultra if we have room
    if (hardPool.length > 0 && picked.length >= 5) {
      // Swap last easy/medium with a hard quest
      var alreadyHasHard = false;
      for (var i = 0; i < picked.length; i++) {
        var d = defs[picked[i]].difficulty;
        if (d === 'hard' || d === 'ultra_nightmare') { alreadyHasHard = true; break; }
      }
      if (!alreadyHasHard) {
        picked[picked.length - 1] = hardPool[0];
      }
    }

    board = { date: today, quests: picked };
    QS.setBoardState(board);
    return board;
  }

  function openTavern() {
    if (tavernOpen) return;
    tavernOpen = true;

    addGameMessage(BARTENDER_GREETINGS[Math.floor(Math.random() * BARTENDER_GREETINGS.length)], 'npc');

    var overlay = document.createElement('div');
    overlay.className = 'rpg-modal-overlay';
    overlay.id = 'rpg-tavern-overlay';

    var modal = document.createElement('div');
    modal.className = 'rpg-modal rpg-tavern-modal';

    // Header
    var header = document.createElement('div');
    header.className = 'rpg-modal-header';
    header.innerHTML = '<h3>The Rusty Tankard</h3>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'rpg-modal-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closeTavern);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Balance bar
    var balBar = document.createElement('div');
    balBar.className = 'rpg-store-balance';
    balBar.id = 'rpg-tavern-balance';
    balBar.textContent = (window.Wallet ? window.Wallet.getBalance() : 0) + ' GP';
    modal.appendChild(balBar);

    // Tabs
    var tabs = document.createElement('div');
    tabs.className = 'rpg-store-tabs';
    var boardTab = document.createElement('button');
    boardTab.className = 'rpg-store-tab active';
    boardTab.textContent = 'Quest Board';
    boardTab.id = 'rpg-tavern-tab-board';
    var chatTab = document.createElement('button');
    chatTab.className = 'rpg-store-tab';
    chatTab.textContent = 'Chat';
    chatTab.id = 'rpg-tavern-tab-chat';
    tabs.appendChild(boardTab);
    tabs.appendChild(chatTab);
    modal.appendChild(tabs);

    // Date header
    var dateEl = document.createElement('div');
    dateEl.className = 'rpg-tavern-date';
    dateEl.textContent = 'Daily Board — ' + getDailyDateString();
    modal.appendChild(dateEl);

    // Body
    var body = document.createElement('div');
    body.className = 'rpg-store-body';
    body.id = 'rpg-tavern-body';
    modal.appendChild(body);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeTavern();
    });
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';

    boardTab.addEventListener('click', function () {
      boardTab.classList.add('active');
      chatTab.classList.remove('active');
      dateEl.style.display = '';
      renderTavernBoard();
    });
    chatTab.addEventListener('click', function () {
      chatTab.classList.add('active');
      boardTab.classList.remove('active');
      dateEl.style.display = 'none';
      renderTavernChat();
    });

    renderTavernBoard();
  }

  function closeTavern() {
    tavernOpen = false;
    var overlay = document.getElementById('rpg-tavern-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function renderTavernBoard() {
    var body = document.getElementById('rpg-tavern-body');
    if (!body) return;
    var QS = window.QuestSystem;
    if (!QS) { body.innerHTML = '<div class="rpg-tavern-empty">Quest system unavailable.</div>'; return; }
    var defs = QS.getDefs();
    if (!defs) { body.innerHTML = '<div class="rpg-tavern-empty">Loading...</div>'; return; }

    var board = generateDailyBoard();
    if (!board.quests || board.quests.length === 0) {
      body.innerHTML = '<div class="rpg-tavern-empty">No quests available today. Check back tomorrow.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < board.quests.length; i++) {
      var qid = board.quests[i];
      var def = defs[qid];
      if (!def) continue;

      var isActive = QS.isActive(qid);
      var isCompleted = QS.isCompleted(qid);
      var cardClass = 'rpg-tavern-quest-card';
      if (isCompleted) cardClass += ' rpg-tavern-quest--completed';

      html += '<div class="' + cardClass + '">';
      html += '<div class="rpg-tavern-quest-header">';
      html += '<span class="rpg-tavern-quest-name">' + def.name + '</span>';
      html += '<span class="quest-badge quest-badge--' + def.difficulty + '">' + (def.difficulty === 'ultra_nightmare' ? 'ULTRA' : def.difficulty) + '</span>';
      html += '</div>';
      html += '<div class="rpg-tavern-quest-desc">' + def.description + '</div>';

      // Objectives
      html += '<div class="rpg-tavern-quest-objectives">';
      for (var j = 0; j < def.objectives.length; j++) {
        html += '<div>' + def.objectives[j].description + '</div>';
      }
      html += '</div>';

      // Rewards
      var rParts = [];
      if (def.rewards.gp) rParts.push(def.rewards.gp + ' GP');
      if (def.rewards.renown) rParts.push(def.rewards.renown + ' Renown');
      html += '<div class="rpg-tavern-quest-rewards">' + rParts.join(' · ') + '</div>';

      // Button
      if (isCompleted) {
        html += '<button class="rpg-tavern-quest-btn rpg-tavern-quest-btn--done" disabled>Completed</button>';
      } else if (isActive) {
        html += '<button class="rpg-tavern-quest-btn rpg-tavern-quest-btn--active" disabled>In Progress</button>';
      } else {
        html += '<button class="rpg-tavern-quest-btn rpg-tavern-quest-btn--accept" data-qid="' + qid + '">Accept</button>';
      }

      html += '</div>';
    }

    body.innerHTML = html;

    // Bind accept buttons
    var btns = body.querySelectorAll('.rpg-tavern-quest-btn--accept');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () {
        var qid = this.getAttribute('data-qid');
        acceptBoardQuest(qid);
      });
    }
  }

  function acceptBoardQuest(questId) {
    var QS = window.QuestSystem;
    if (!QS) return;
    var started = QS.startQuest(questId);
    if (started) {
      addGameMessage(BARTENDER_ACCEPT[Math.floor(Math.random() * BARTENDER_ACCEPT.length)], 'npc');
      renderTavernBoard();
      // Update balance display
      var bal = document.getElementById('rpg-tavern-balance');
      if (bal) bal.textContent = (window.Wallet ? window.Wallet.getBalance() : 0) + ' GP';
    }
  }

  function renderTavernChat() {
    var body = document.getElementById('rpg-tavern-body');
    if (!body) return;

    var quote = BARTENDER_GREETINGS[Math.floor(Math.random() * BARTENDER_GREETINGS.length)];

    var html = '<div class="rpg-tavern-chat-bubble">';
    html += '<div class="rpg-tavern-chat-label">Bartender</div>';
    html += '<div class="rpg-tavern-chat-text">"' + quote + '"</div>';
    html += '</div>';
    html += '<button class="rpg-tavern-ale-btn" id="rpg-tavern-ale-btn">Buy Ale (10 GP)</button>';

    body.innerHTML = html;

    document.getElementById('rpg-tavern-ale-btn').addEventListener('click', function () {
      if (window.Wallet && window.Wallet.getBalance() >= 10) {
        window.Wallet.deduct(10);
        addGameMessage('You bought an ale. It tastes like regret and copper.', 'system');
        var bal = document.getElementById('rpg-tavern-balance');
        if (bal) bal.textContent = window.Wallet.getBalance() + ' GP';
        this.textContent = 'Cheers!';
        this.disabled = true;
        var btn = this;
        setTimeout(function () { btn.textContent = 'Buy Ale (10 GP)'; btn.disabled = false; }, 2000);
      } else {
        addGameMessage('You can\'t afford ale. The bartender gives you a pitying look.', 'system');
      }
    });
  }

  function updateStoreBalance() {
    var el = document.getElementById('rpg-store-balance');
    if (el) el.textContent = (window.Wallet ? window.Wallet.getBalance() : 0) + ' GP';
  }

  function makeStoreSprite(iconData, size) {
    if (!iconData) return null;
    size = size || 32;
    var el = document.createElement('div');
    el.className = 'rpg-store-item-icon';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundImage = 'url(' + ITEMS_SHEET_PATH + ')';
    var scale = size / 16;
    el.style.backgroundSize = (576 * scale) + 'px ' + (560 * scale) + 'px';
    el.style.backgroundPosition = '-' + (iconData.x * scale) + 'px -' + (iconData.y * scale) + 'px';
    el.style.imageRendering = 'pixelated';
    return el;
  }

  function renderStoreBuyTab() {
    var body = document.getElementById('rpg-store-body');
    if (!body) return;
    body.innerHTML = '';

    var api = window.__RPG_SKILLS_API;
    var stones = (window.RpgCombat && window.RpgCombat.getStones) ? window.RpgCombat.getStones() : {};
    var balance = window.Wallet ? window.Wallet.getBalance() : 0;

    var categories = {};
    for (var i = 0; i < STORE_BUY_CATALOG.length; i++) {
      var item = STORE_BUY_CATALOG[i];
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    }

    var catOrder = Object.keys(categories);
    for (var ci = 0; ci < catOrder.length; ci++) {
      var catName = catOrder[ci];
      var catItems = categories[catName];

      var catHeader = document.createElement('div');
      catHeader.className = 'rpg-store-category';
      catHeader.textContent = catName;
      body.appendChild(catHeader);

      var stoneIconMap = { fire: { x: 160, y: 240 }, aqua: { x: 128, y: 240 }, nature: { x: 176, y: 240 },
        tech: { x: 192, y: 240 }, shadow: { x: 208, y: 240 }, mystic: { x: 224, y: 240 } };
      for (var ii = 0; ii < catItems.length; ii++) {
        var def = catItems[ii];
        var row = document.createElement('div');
        row.className = 'rpg-store-item';

        // Stone type accent
        if (def.stoneType) row.classList.add('rpg-store-stone-' + def.stoneType);

        // Sprite icon
        var iconData = api ? api.getItemIcon(def.key) : null;
        // Stones don't have inventory icons — use gem proxies
        if (!iconData && def.stoneType) {
          iconData = stoneIconMap[def.stoneType] ? { sheet: 'items_sheet', x: stoneIconMap[def.stoneType].x, y: stoneIconMap[def.stoneType].y } : null;
        }
        var sprite = makeStoreSprite(iconData, 32);
        if (sprite) row.appendChild(sprite);

        // Info
        var info = document.createElement('div');
        info.className = 'rpg-store-item-info';
        info.innerHTML = '<div class="rpg-store-item-name">' + def.key + '</div>' +
          (def.desc ? '<div class="rpg-store-item-desc">' + def.desc + '</div>' : '');

        // Owned count
        var owned = 0;
        if (def.stoneType) {
          owned = stones[def.stoneType] || 0;
        } else if (api) {
          owned = api.getItemCount(def.key);
        }
        info.innerHTML += '<div class="rpg-store-owned">Owned: ' + owned + '</div>';
        row.appendChild(info);

        // Price
        var priceEl = document.createElement('div');
        priceEl.className = 'rpg-store-item-price';
        priceEl.textContent = def.price + ' GP';
        row.appendChild(priceEl);

        // Buy button
        var btn = document.createElement('button');
        btn.className = 'rpg-store-buy-btn';
        btn.textContent = 'Buy';
        var canBuy = balance >= def.price;
        // Stack cap check for non-stone items
        if (!def.stoneType && api && api.getItemCount(def.key) >= 999) canBuy = false;
        btn.disabled = !canBuy;
        btn.addEventListener('click', (function (d) {
          return function () { buyStoreItem(d); };
        })(def));
        row.appendChild(btn);

        body.appendChild(row);
      }
    }
  }

  function buyStoreItem(def) {
    if (!window.Wallet || window.Wallet.getBalance() < def.price) return;

    window.Wallet.deduct(def.price);

    if (def.stoneType && window.RpgCombat && window.RpgCombat.addStone) {
      window.RpgCombat.addStone(def.stoneType);
    } else if (window.__RPG_SKILLS_API) {
      window.__RPG_SKILLS_API.addItem(def.key, 1);
    }

    addGameMessage('Purchased ' + def.key + ' for ' + def.price + ' GP.', 'reward');
    updateStoreBalance();
    renderStoreBuyTab();
  }

  function renderStoreSellTab() {
    var body = document.getElementById('rpg-store-body');
    if (!body) return;
    body.innerHTML = '';

    var api = window.__RPG_SKILLS_API;
    if (!api) { body.innerHTML = '<div class="rpg-store-empty">Inventory unavailable.</div>'; return; }

    var categories = api.getCategories ? api.getCategories() : [];
    var hasAnything = false;

    for (var ci = 0; ci < categories.length; ci++) {
      var cat = categories[ci];
      // Skip Equipment for now — derive sell prices differently
      var ownedItems = [];
      for (var ii = 0; ii < cat.items.length; ii++) {
        var key = cat.items[ii];
        var qty = api.getItemCount(key);
        if (qty <= 0) continue;
        var price = getItemSellPrice(key, cat.label);
        if (price <= 0) continue;
        ownedItems.push({ key: key, qty: qty, price: price });
      }
      if (ownedItems.length === 0) continue;
      hasAnything = true;

      var catHeader = document.createElement('div');
      catHeader.className = 'rpg-store-category';
      catHeader.textContent = cat.label;
      body.appendChild(catHeader);

      for (var oi = 0; oi < ownedItems.length; oi++) {
        var item = ownedItems[oi];
        var row = document.createElement('div');
        row.className = 'rpg-store-item';

        var iconData = api.getItemIcon(item.key);
        var sprite = makeStoreSprite(iconData, 32);
        if (sprite) row.appendChild(sprite);

        var info = document.createElement('div');
        info.className = 'rpg-store-item-info';
        info.innerHTML = '<div class="rpg-store-item-name">' + item.key + '</div>' +
          '<div class="rpg-store-owned">x' + item.qty + ' | ' + item.price + ' GP each</div>';
        row.appendChild(info);

        var priceEl = document.createElement('div');
        priceEl.className = 'rpg-store-item-price';
        priceEl.textContent = (item.price * item.qty) + ' GP';
        row.appendChild(priceEl);

        // Sell x1
        var sellBtn = document.createElement('button');
        sellBtn.className = 'rpg-store-sell-btn';
        sellBtn.textContent = 'Sell';
        sellBtn.addEventListener('click', (function (k, p) {
          return function () { sellStoreItem(k, 1, p); };
        })(item.key, item.price));
        row.appendChild(sellBtn);

        // Sell All
        if (item.qty > 1) {
          var sellAllBtn = document.createElement('button');
          sellAllBtn.className = 'rpg-store-sell-btn rpg-store-sell-all';
          sellAllBtn.textContent = 'All';
          sellAllBtn.addEventListener('click', (function (k, q, p) {
            return function () { sellStoreItem(k, q, p); };
          })(item.key, item.qty, item.price));
          row.appendChild(sellAllBtn);
        }

        body.appendChild(row);
      }
    }

    if (!hasAnything) {
      body.innerHTML = '<div class="rpg-store-empty">You have nothing to sell. Go gather some resources!</div>';
    }
  }

  function getItemSellPrice(key, catLabel) {
    if (STORE_SELL_PRICES[key]) return STORE_SELL_PRICES[key];
    // Equipment: derive from tier name
    if (catLabel === 'Equipment') {
      var tierKeys = Object.keys(EQUIP_SELL_TIERS);
      for (var ti = 0; ti < tierKeys.length; ti++) {
        if (key.indexOf(tierKeys[ti]) === 0) return EQUIP_SELL_TIERS[tierKeys[ti]];
      }
    }
    return 0;
  }

  function sellStoreItem(key, quantity, priceEach) {
    var api = window.__RPG_SKILLS_API;
    if (!api) return;
    var actual = Math.min(quantity, api.getItemCount(key));
    if (actual <= 0) return;

    api.removeItem(key, actual);

    var totalGp = priceEach * actual;
    if (window.Wallet) window.Wallet.add(totalGp);
    addGameMessage('Sold ' + actual + 'x ' + key + ' for ' + totalGp + ' GP.', 'reward');
    updateStoreBalance();
    renderStoreSellTab();
  }

  function renderPetStoreContents() {
    var rpgPets = getRpgPetState();

    // Balance
    var balEl = document.getElementById('rpg-petstore-balance');
    if (balEl) {
      var coins = window.Wallet ? window.Wallet.getBalance() : 0;
      balEl.textContent = coins + ' GP';
    }

    // Single egg card with rarity roll
    var eggsEl = document.getElementById('rpg-petstore-eggs');
    if (eggsEl && petCatalog) {
      eggsEl.innerHTML = '';
      var freeLeft = Math.max(0, FREE_PULLS - (rpgPets.totalHatched || 0));
      var isFree = freeLeft > 0;

      var card = document.createElement('div');
      card.className = 'rpg-egg-card';
      card.style.borderColor = '#c0a040';

      var eggIcon = document.createElement('div');
      eggIcon.className = 'rpg-egg-icon';
      eggIcon.style.background = 'linear-gradient(135deg, #88aa66, #6688cc, #cc9933)';
      eggIcon.textContent = '\ud83e\udd5a';
      card.appendChild(eggIcon);

      var label = document.createElement('div');
      label.className = 'rpg-egg-label';
      label.textContent = 'Mystery Egg';
      card.appendChild(label);

      var cost = document.createElement('div');
      cost.className = 'rpg-egg-cost';
      cost.textContent = isFree ? 'FREE (' + freeLeft + ' left)' : EGG_COST + ' GP';
      card.appendChild(cost);

      // Rarity rates display
      var rates = document.createElement('div');
      rates.className = 'rpg-egg-pool';
      rates.textContent = '80% Common \u00b7 18% Rare \u00b7 2% Legendary';
      card.appendChild(rates);

      // Total owned
      var allCreatures = getRpgCreatures();
      var totalOwned = 0;
      for (var pi = 0; pi < allCreatures.length; pi++) {
        if (rpgPets.owned[allCreatures[pi]]) totalOwned++;
      }
      var poolInfo = document.createElement('div');
      poolInfo.className = 'rpg-egg-pool';
      poolInfo.textContent = totalOwned + '/' + allCreatures.length + ' creatures owned';
      card.appendChild(poolInfo);

      // Pity counter (use overall pity, not per-tier)
      var pityCount = rpgPets.pity.overall || 0;
      var pityThreshold = 8;
      if (pityCount > 0 && totalOwned < allCreatures.length) {
        var pityEl = document.createElement('div');
        pityEl.className = 'rpg-egg-pity';
        if (pityCount >= pityThreshold - 1) {
          pityEl.textContent = 'Next: guaranteed new!';
          pityEl.style.color = 'var(--accent)';
        } else {
          pityEl.textContent = 'Pity: ' + pityCount + '/' + pityThreshold;
        }
        card.appendChild(pityEl);
      }

      var canAfford = isFree || (window.Wallet && window.Wallet.getBalance() >= EGG_COST);
      var hatchBtn = document.createElement('button');
      hatchBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
      hatchBtn.textContent = isFree ? 'Hatch (FREE!)' : 'Hatch';
      hatchBtn.disabled = !canAfford || hatchAnimating;
      if (!canAfford || hatchAnimating) hatchBtn.classList.add('rpg-btn-disabled');
      hatchBtn.addEventListener('click', function () {
        rpgHatchEgg();
      });
      card.appendChild(hatchBtn);

      eggsEl.appendChild(card);
    }

    // Collection grid
    renderPetStoreCollection(rpgPets);

    // Update collection counter in header
    var collLabel = document.getElementById('rpg-petstore-coll-label');
    if (collLabel) {
      var allC = getRpgCreatures();
      var ownedCount = 0;
      for (var ci = 0; ci < allC.length; ci++) {
        if (rpgPets.owned[allC[ci]]) ownedCount++;
      }
      collLabel.textContent = 'Your Collection (' + ownedCount + '/' + allC.length + ')';
    }
  }

  function renderPetStoreCollection(rpgPets) {
    var collEl = document.getElementById('rpg-petstore-collection');
    if (!collEl || !petCatalog) return;
    collEl.innerHTML = '';

    var rpgIds = getRpgCreatures();
    for (var ri = 0; ri < rpgIds.length; ri++) {
      var id = rpgIds[ri];
      var creature = petCatalog.creatures[id];
      var owned = rpgPets.owned[id];

      var cell = document.createElement('div');
      cell.className = 'rpg-petstore-pet-cell' + (owned ? ' rpg-petstore-pet-owned' : '');

      if (owned) {
        var level = owned.level || 1;
        var cTier = creature ? creature.tier : 'common';
        cell.style.borderColor = TIER_COLORS[cTier] || TIER_COLORS.common;

        // Sprite (48px)
        var preview = renderRpgPetSprite(id, level, 48);
        if (preview) cell.appendChild(preview);

        // Type badge
        var cType = creature ? creature.type : null;
        if (cType && TYPE_COLORS[cType]) {
          var badge = document.createElement('div');
          badge.className = 'rpg-petcell-type-badge';
          badge.style.background = TYPE_COLORS[cType];
          cell.appendChild(badge);
        }

        // Name
        var nameEl = document.createElement('div');
        nameEl.className = 'rpg-petstore-pet-name';
        nameEl.textContent = creature ? creature.name : id;
        cell.appendChild(nameEl);

        // Level
        var lvEl = document.createElement('div');
        lvEl.className = 'rpg-petcell-level';
        lvEl.textContent = 'Lv ' + level;
        cell.appendChild(lvEl);

        // XP bar (skip for max-level pets)
        var maxLv = creature ? creature.maxLevel : 3;
        if (level < maxLv) {
          var xpNeeded = rpgPetXpForLevel(level);
          var xpPct = Math.min(((owned.xp || 0) / xpNeeded) * 100, 100);
          var xpBar = document.createElement('div');
          xpBar.className = 'rpg-petcell-xp-bar';
          var xpFill = document.createElement('div');
          xpFill.className = 'rpg-petcell-xp-fill';
          xpFill.style.width = xpPct + '%';
          xpBar.appendChild(xpFill);
          cell.appendChild(xpBar);
        }

        // Status tag
        var status = getPetStatus(id);
        if (status === 'following') {
          var tag = document.createElement('div');
          tag.className = 'rpg-petstore-active-tag';
          tag.textContent = 'Following';
          cell.appendChild(tag);
        } else if (status.indexOf('stationed') === 0) {
          var tag = document.createElement('div');
          tag.className = 'rpg-petstore-active-tag';
          tag.style.color = '#6688cc';
          tag.textContent = 'Stationed';
          cell.appendChild(tag);
        }

        // Click to open pet detail
        if (window.RpgCombat && window.RpgCombat.showPetDetail) {
          cell.style.cursor = 'pointer';
          cell.setAttribute('data-pet-id', id);
          cell.addEventListener('click', (function (pid) {
            return function () {
              var freshPets = getRpgPetState();
              window.RpgCombat.showPetDetail(pid, freshPets, function () {
                renderPetStoreCollection(getRpgPetState());
              });
            };
          })(id));
        }
      } else {
        // Unknown cell — hint tier via faint border color
        var uTier = creature ? creature.tier : 'common';
        cell.style.borderColor = 'color-mix(in srgb, ' + (TIER_COLORS[uTier] || TIER_COLORS.common) + ' 25%, transparent)';

        var unkEl = document.createElement('div');
        unkEl.className = 'rpg-petcell-unknown';
        unkEl.textContent = '?';
        cell.appendChild(unkEl);

        var nameEl = document.createElement('div');
        nameEl.className = 'rpg-petstore-pet-name';
        nameEl.textContent = '???';
        cell.appendChild(nameEl);
      }

      collEl.appendChild(cell);
    }
  }

  // Rarity weights: 80% common, 18% rare, 2% legendary
  var EGG_COST = 500;
  var RARITY_WEIGHTS = [
    { tier: 'common',    weight: 80 },
    { tier: 'rare',      weight: 18 },
    { tier: 'legendary', weight: 2 }
  ];
  var MERGE_XP = { common: 25, rare: 50, legendary: 100 };
  var PITY_THRESHOLD = 8; // guaranteed new creature after 8 consecutive dupes
  var hatchAnimating = false;
  var hatchTimeouts = [];

  var TIER_COLORS = { common: '#88aa66', rare: '#6688cc', legendary: '#cc9933' };
  var TIER_LABELS = { common: 'Common', rare: 'Rare!', legendary: 'LEGENDARY!' };
  var TYPE_COLORS = {
    fire: '#cc6644', aqua: '#4488bb', nature: '#66aa55',
    tech: '#888899', shadow: '#775599', mystic: '#bb88cc'
  };

  function rollRarity() {
    var roll = Math.random() * 100;
    var cumulative = 0;
    for (var i = 0; i < RARITY_WEIGHTS.length; i++) {
      cumulative += RARITY_WEIGHTS[i].weight;
      if (roll < cumulative) return RARITY_WEIGHTS[i].tier;
    }
    return 'common';
  }

  var FREE_PULLS = 4;

  function hatchTimeout(fn, delay) {
    var id = setTimeout(fn, delay);
    hatchTimeouts.push(id);
    return id;
  }

  function playHatchAnimation(resultEl, petId, tier, isDuplicate, mergeXP, oldXp, oldLevel, callback) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = '';

    var tierColor = TIER_COLORS[tier] || '#88aa66';

    // Stage 1: Egg appears
    var egg = document.createElement('div');
    egg.className = 'rpg-hatch-egg';
    resultEl.appendChild(egg);

    // Stage 2: Wobbles
    hatchTimeout(function () { egg.className = 'rpg-hatch-egg rpg-egg-wobble-1'; }, 400);
    hatchTimeout(function () { egg.className = 'rpg-hatch-egg rpg-egg-wobble-2'; }, 800);
    hatchTimeout(function () { egg.className = 'rpg-hatch-egg rpg-egg-wobble-3'; }, 1100);

    // Stage 3: Cracks
    hatchTimeout(function () { egg.classList.add('rpg-egg-cracked'); }, 1400);

    // Stage 4: Fade egg, then split + burst
    hatchTimeout(function () {
      egg.style.opacity = '0';
      hatchTimeout(function () {
        egg.style.display = 'none';
        var halfL = document.createElement('div');
        halfL.className = 'rpg-egg-half-left';
        var halfR = document.createElement('div');
        halfR.className = 'rpg-egg-half-right';
        var wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.height = '64px';
        wrapper.style.margin = '0 auto';
        wrapper.style.width = '50px';
        wrapper.appendChild(halfL);
        wrapper.appendChild(halfR);
        resultEl.insertBefore(wrapper, egg);

        var burst = document.createElement('div');
        burst.className = 'rpg-hatch-burst';
        burst.style.background = 'radial-gradient(circle, ' + tierColor + ' 0%, transparent 70%)';
        resultEl.appendChild(burst);
      }, 100);
    }, 1700);

    // Stage 5: Pet sprite reveals
    hatchTimeout(function () {
      resultEl.innerHTML = '';

      var creature = petCatalog.creatures[petId];
      var rpgPets = getRpgPetState();
      var currentLevel = rpgPets.owned[petId] ? rpgPets.owned[petId].level : 1;

      // Rarity banner
      var rarityEl = document.createElement('div');
      rarityEl.className = 'rpg-petstore-result-rarity rpg-rarity-slide';
      rarityEl.textContent = TIER_LABELS[tier] || tier;
      rarityEl.style.color = tierColor;
      resultEl.appendChild(rarityEl);

      // Sprite
      var preview = renderRpgPetSprite(petId, currentLevel, 64);
      if (preview) {
        preview.className = 'rpg-petstore-result-sprite rpg-hatch-reveal';
        resultEl.appendChild(preview);
      }

      // Name + tag fade in at t=2400
      hatchTimeout(function () {
        var nameEl = document.createElement('div');
        nameEl.className = 'rpg-petstore-result-name rpg-hatch-name-fade';
        nameEl.textContent = creature ? creature.name : petId;
        resultEl.appendChild(nameEl);

        if (isDuplicate) {
          renderDupeResult(resultEl, petId, mergeXP, oldXp, oldLevel);
        } else {
          var tagEl = document.createElement('div');
          tagEl.className = 'rpg-petstore-result-tag rpg-hatch-name-fade';
          tagEl.textContent = 'New creature!';
          tagEl.style.color = 'var(--accent)';
          resultEl.appendChild(tagEl);
        }

        hatchAnimating = false;
        if (callback) callback();
      }, 400);
    }, 2000);
  }

  function renderDupeResult(resultEl, petId, mergeXP, oldXp, oldLevel) {
    var rpgPets = getRpgPetState();
    var owned = rpgPets.owned[petId];
    var creature = petCatalog.creatures[petId];
    var maxLv = creature ? creature.maxLevel : 3;
    var newLevel = owned ? owned.level : oldLevel;
    var newXp = owned ? owned.xp : 0;
    var didLevelUp = newLevel > oldLevel;

    // "Duplicate!" tag
    var tagEl = document.createElement('div');
    tagEl.className = 'rpg-petstore-result-tag rpg-hatch-name-fade';
    tagEl.textContent = 'Duplicate!';
    tagEl.style.color = 'color-mix(in srgb, var(--foreground) 60%, transparent)';
    resultEl.appendChild(tagEl);

    // Max-level dupe: show badge instead of XP bar
    if (oldLevel >= maxLv) {
      var maxBadge = document.createElement('div');
      maxBadge.className = 'rpg-dupe-xp-gain';
      maxBadge.textContent = 'MAX LEVEL';
      maxBadge.style.color = '#cc9933';
      resultEl.appendChild(maxBadge);
      var storedNote = document.createElement('div');
      storedNote.className = 'rpg-dupe-level-text';
      storedNote.textContent = '+' + mergeXP + ' Evo XP (stored)';
      resultEl.appendChild(storedNote);
      return;
    }

    // +XP text
    var xpGain = document.createElement('div');
    xpGain.className = 'rpg-dupe-xp-gain';
    xpGain.textContent = '+' + mergeXP + ' Evo XP';
    resultEl.appendChild(xpGain);

    // XP bar
    var xpNeeded = rpgPetXpForLevel(oldLevel);
    var startPct = Math.min((oldXp / xpNeeded) * 100, 100);

    var track = document.createElement('div');
    track.className = 'rpg-dupe-xp-track';
    var fill = document.createElement('div');
    fill.className = 'rpg-dupe-xp-fill';
    fill.style.width = startPct + '%';
    track.appendChild(fill);
    resultEl.appendChild(track);

    // Level label
    var lvText = document.createElement('div');
    lvText.className = 'rpg-dupe-level-text';
    lvText.textContent = 'Lv ' + oldLevel;
    resultEl.appendChild(lvText);

    // Animate fill after paint
    hatchTimeout(function () {
      if (didLevelUp) {
        // Fill to 100% first
        fill.style.width = '100%';
        hatchTimeout(function () {
          // Flash
          var flash = document.createElement('div');
          flash.className = 'rpg-dupe-levelup-flash';
          resultEl.appendChild(flash);

          // Reset bar to new level progress
          var newNeeded = rpgPetXpForLevel(newLevel);
          var newPct = newLevel >= maxLv ? 100 : Math.min((newXp / newNeeded) * 100, 100);
          fill.style.transition = 'none';
          fill.style.width = '0%';
          hatchTimeout(function () {
            fill.style.transition = 'width 0.5s ease-out';
            fill.style.width = newPct + '%';
          }, 50);

          // Level up text
          var luText = document.createElement('div');
          luText.className = 'rpg-dupe-levelup-text';
          luText.textContent = 'LEVEL UP!';
          resultEl.appendChild(luText);

          lvText.textContent = 'Lv ' + newLevel;

          // Swap sprite to new evolution
          var oldSprite = resultEl.querySelector('.rpg-petstore-result-sprite');
          var newSprite = renderRpgPetSprite(petId, newLevel, 64);
          if (oldSprite && newSprite) {
            newSprite.className = 'rpg-petstore-result-sprite rpg-hatch-reveal';
            oldSprite.parentNode.replaceChild(newSprite, oldSprite);
          }
        }, 500);
      } else {
        // No level up — just fill to new position
        var endPct = newLevel >= maxLv ? 100 : Math.min(((oldXp + mergeXP) / xpNeeded) * 100, 100);
        fill.style.width = endPct + '%';
      }
    }, 200);
  }

  function rpgHatchEgg() {
    if (!petCatalog || hatchAnimating) return;

    var rpgPets = getRpgPetState();
    var freeLeft = Math.max(0, FREE_PULLS - (rpgPets.totalHatched || 0));
    var isFree = freeLeft > 0;

    // Check currency
    if (!isFree) {
      if (!window.Wallet || window.Wallet.getBalance() < EGG_COST) return;
    }

    // Roll rarity tier, then pick creature from that pool
    var tier = rollRarity();
    var pool = getRpgCreaturesByTier(tier);
    if (pool.length === 0) pool = getRpgCreaturesByTier('common');

    // Free pulls: always guarantee a new creature (no dupes)
    // Paid pulls: pity system forces new after N consecutive dupes
    var forceNew = isFree || (rpgPets.pity.overall || 0) >= PITY_THRESHOLD;

    var rolled;
    if (forceNew) {
      // Pick from unowned creatures (prefer the rolled tier, fallback to any)
      var unowned = [];
      for (var i = 0; i < pool.length; i++) {
        if (!rpgPets.owned[pool[i]]) unowned.push(pool[i]);
      }
      if (unowned.length === 0) {
        // No unowned in this tier — try any unowned creature
        var allCreatures = getRpgCreatures();
        for (var j = 0; j < allCreatures.length; j++) {
          if (!rpgPets.owned[allCreatures[j]]) unowned.push(allCreatures[j]);
        }
      }
      rolled = unowned.length > 0
        ? unowned[Math.floor(Math.random() * unowned.length)]
        : pool[Math.floor(Math.random() * pool.length)];
      // Look up actual tier of the rolled creature
      if (petCatalog.creatures[rolled]) tier = petCatalog.creatures[rolled].tier;
    } else {
      rolled = pool[Math.floor(Math.random() * pool.length)];
    }

    // Deduct currency (skip if free)
    if (!isFree) {
      window.Wallet.deduct(EGG_COST);
    }

    // Capture old state BEFORE mutation (needed for dupe XP animation)
    var isDuplicate = !!rpgPets.owned[rolled];
    var mergeXP = MERGE_XP[tier] || 25;
    var oldXp = isDuplicate ? (rpgPets.owned[rolled].xp || 0) : 0;
    var oldLevel = isDuplicate ? (rpgPets.owned[rolled].level || 1) : 1;

    // Mutate state
    if (isDuplicate) {
      rpgPets.owned[rolled].xp = (rpgPets.owned[rolled].xp || 0) + mergeXP;
      var needed = rpgPetXpForLevel(rpgPets.owned[rolled].level);
      if (rpgPets.owned[rolled].xp >= needed) {
        var maxLv = petCatalog.creatures[rolled] ? petCatalog.creatures[rolled].maxLevel : 3;
        if (rpgPets.owned[rolled].level < maxLv) {
          rpgPets.owned[rolled].level++;
          rpgPets.owned[rolled].xp -= needed;
        }
      }
      rpgPets.pity.overall = (rpgPets.pity.overall || 0) + 1;
    } else {
      rpgPets.owned[rolled] = { level: 1, xp: 0, skin: RPG_PET_DEFAULT_SKIN };
      rpgPets.pity.overall = 0;
    }

    rpgPets.totalHatched = (rpgPets.totalHatched || 0) + 1;
    saveRpgPetState(rpgPets);

    // Quest hook: pet hatched
    if (window.QuestSystem) {
      window.QuestSystem.updateObjective('hatch_pets', { count: 1 });
    }

    // Chat message
    var creatureName = petCatalog.creatures[rolled] ? petCatalog.creatures[rolled].name : rolled;
    addGameMessage(isDuplicate
      ? 'The egg hatches... another ' + creatureName + '. (+' + mergeXP + ' Evo XP)'
      : 'The egg hatches! A ' + creatureName + ' emerges! (' + (TIER_LABELS[tier] || tier) + ')',
      tier === 'legendary' ? 'reward' : 'system');

    // Immediately update balance display and disable button
    hatchAnimating = true;
    var balDisp = document.getElementById('rpg-petstore-balance');
    if (balDisp) balDisp.textContent = (window.Wallet ? window.Wallet.getBalance() : 0) + ' GP';
    var eggsContainer = document.getElementById('rpg-petstore-eggs');
    if (eggsContainer) {
      var hBtn = eggsContainer.querySelector('.rpg-btn-primary');
      if (hBtn) { hBtn.disabled = true; hBtn.classList.add('rpg-btn-disabled'); }
    }

    var resultEl = document.getElementById('rpg-petstore-result');
    if (resultEl) {
      playHatchAnimation(resultEl, rolled, tier, isDuplicate, mergeXP, oldXp, oldLevel, function () {
        renderPetStoreContents();
        renderPetTab();
      });
    } else {
      hatchAnimating = false;
      renderPetStoreContents();
      renderPetTab();
    }
  }

  // ══════════════════════════════════════════════
  // ══  PET TAB UI                               ══
  // ══════════════════════════════════════════════

  var activePetPopup = null; // currently open popup petId
  var pendingStationLocationId = null; // set when empty dock clicked, cleared on assign/cancel

  function renderPetTab() {
    var pane = $('osrs-side-pets');
    if (!pane) return;
    pane.innerHTML = '';

    var rpgPets = getRpgPetState();
    var ownedIds = Object.keys(rpgPets.owned);

    // Station-assign mode banner
    if (pendingStationLocationId) {
      var banner = document.createElement('div');
      banner.style.cssText = 'padding:6px 8px;margin-bottom:6px;font-size:0.7em;text-align:center;background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);border-radius:3px;color:var(--accent)';
      var locName = MAP_LOCATIONS[pendingStationLocationId] ? MAP_LOCATIONS[pendingStationLocationId].name : pendingStationLocationId;
      banner.textContent = 'Select a pet to station at ' + locName;
      pane.appendChild(banner);
    }

    if (ownedIds.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'rpg-pet-empty';
      empty.textContent = 'Visit the Pet Store in Town to hatch your first pet!';
      pane.appendChild(empty);
      return;
    }

    // Follower slot header
    var followerSlot = document.createElement('div');
    followerSlot.className = 'rpg-pet-follower-slot';
    var fLabel = document.createElement('div');
    fLabel.className = 'rpg-pet-follower-label';
    fLabel.textContent = 'Follower';
    followerSlot.appendChild(fLabel);
    if (rpgPets.follower && rpgPets.owned[rpgPets.follower]) {
      var fPet = rpgPets.owned[rpgPets.follower];
      var fCreature = petCatalog.creatures[rpgPets.follower];
      var fName = document.createElement('div');
      fName.className = 'rpg-pet-follower-name';
      fName.textContent = (fCreature ? fCreature.name : rpgPets.follower) + ' Lv' + fPet.level;
      followerSlot.appendChild(fName);
      // Follower XP bar
      var fCap = fPet.levelCap || (fCreature ? fCreature.levelCap : 30) || 30;
      if (fPet.level < fCap) {
        var fNeeded = rpgPetXpForLevel(fPet.level);
        var fPct = Math.min(100, Math.floor(((fPet.xp || 0) / fNeeded) * 100));
        var fXpBar = document.createElement('div');
        fXpBar.className = 'rpg-follower-xp-bar';
        var fXpFill = document.createElement('div');
        fXpFill.className = 'rpg-follower-xp-fill';
        fXpFill.style.width = fPct + '%';
        fXpBar.appendChild(fXpFill);
        followerSlot.appendChild(fXpBar);
      }
      var fSprite = renderRpgPetSprite(rpgPets.follower, fPet.level, 28);
      if (fSprite) {
        fSprite.style.marginLeft = 'auto';
        followerSlot.appendChild(fSprite);
      }
    } else {
      var fNone = document.createElement('div');
      fNone.className = 'rpg-pet-follower-name';
      fNone.style.color = 'color-mix(in srgb, var(--foreground) 35%, transparent)';
      fNone.textContent = 'None';
      followerSlot.appendChild(fNone);
    }
    pane.appendChild(followerSlot);

    // Pet grid
    var grid = document.createElement('div');
    grid.className = 'rpg-pet-grid';

    for (var oi = 0; oi < ownedIds.length; oi++) {
      var pid = ownedIds[oi];
      var petData = rpgPets.owned[pid];
      var status = getPetStatus(pid);

      var cell = document.createElement('div');
      cell.className = 'rpg-pet-cell';
      if (status === 'following') cell.classList.add('rpg-pet-following');
      if (status.indexOf('stationed') === 0) cell.classList.add('rpg-pet-stationed');

      var sprite = renderRpgPetSprite(pid, petData.level, 36);
      if (sprite) cell.appendChild(sprite);

      // XP bar at bottom of cell
      var cellCreature = petCatalog.creatures[pid];
      var cellCap = petData.levelCap || (cellCreature ? cellCreature.levelCap : 30) || 30;
      if (petData.level < cellCap) {
        var cellNeeded = rpgPetXpForLevel(petData.level);
        var cellPct = Math.min(100, Math.floor(((petData.xp || 0) / cellNeeded) * 100));
        var cellXpBar = document.createElement('div');
        cellXpBar.className = 'rpg-petcell-xp-bar';
        var cellXpFill = document.createElement('div');
        cellXpFill.className = 'rpg-petcell-xp-fill';
        cellXpFill.style.width = cellPct + '%';
        cellXpBar.appendChild(cellXpFill);
        cell.appendChild(cellXpBar);
      }

      // Status badge
      if (status === 'following') {
        var badge = document.createElement('div');
        badge.className = 'rpg-pet-status rpg-pet-status-follow';
        cell.appendChild(badge);
      } else if (status.indexOf('stationed') === 0) {
        var badge = document.createElement('div');
        badge.className = 'rpg-pet-status rpg-pet-status-station';
        cell.appendChild(badge);
        // Location tag
        var locId = status.split(':')[1];
        var locName = MAP_LOCATIONS[locId] ? MAP_LOCATIONS[locId].name : locId;
        var locTag = document.createElement('div');
        locTag.className = 'rpg-pet-loc-tag';
        locTag.textContent = locName.substring(0, 6);
        cell.appendChild(locTag);
      }

      cell.setAttribute('data-pet-id', pid);
      cell.addEventListener('click', (function (petId) {
        return function (e) { onPetCellClick(petId, e); };
      })(pid));

      grid.appendChild(cell);
    }

    pane.appendChild(grid);
  }

  function onPetCellClick(petId, e) {
    // Close existing popup
    closePetPopup();

    var rpgPets = getRpgPetState();
    var petData = rpgPets.owned[petId];
    if (!petData) return;

    var creature = petCatalog.creatures[petId];
    if (!creature) return;

    var status = getPetStatus(petId);

    // If dock requested a station assignment, do it immediately
    if (pendingStationLocationId && status === 'unassigned') {
      var locId = pendingStationLocationId;
      pendingStationLocationId = null;
      stationPet(petId, locId);
      renderPetTab();
      renderStationedPetInGameArea(locId);
      if (window.__SKILLS_UPDATE_AUTO_BTN) window.__SKILLS_UPDATE_AUTO_BTN();
      return;
    }
    pendingStationLocationId = null; // clear if they picked an assigned pet
    var stats = getRpgPetStats(petId, petData.level);

    activePetPopup = petId;

    var popup = document.createElement('div');
    popup.className = 'rpg-pet-popup';
    popup.id = 'rpg-pet-popup';

    // Name
    var nameEl = document.createElement('div');
    nameEl.className = 'rpg-pet-popup-name';
    nameEl.textContent = creature.name;
    popup.appendChild(nameEl);

    // Info line
    var info = document.createElement('div');
    info.className = 'rpg-pet-popup-info';
    var tierColors = { common: '#88aa66', rare: '#6688cc', legendary: '#cc8844' };
    info.innerHTML = '<span style="color:' + (tierColors[creature.tier] || 'inherit') + '">' +
      creature.tier.charAt(0).toUpperCase() + creature.tier.slice(1) + '</span> ' +
      creature.type + ' &middot; Lv ' + petData.level;
    popup.appendChild(info);

    // XP bar
    var petLevelCap = petData.levelCap || creature.levelCap || 30;
    if (petData.level < petLevelCap) {
      var needed = rpgPetXpForLevel(petData.level);
      var xpPct = Math.min(100, Math.floor(((petData.xp || 0) / needed) * 100));
      var xpWrap = document.createElement('div');
      xpWrap.className = 'rpg-popup-xp-wrap';
      xpWrap.innerHTML = '<div class="rpg-popup-xp-bar"><div class="rpg-popup-xp-fill" style="width:' + xpPct + '%"></div></div>' +
        '<span class="rpg-popup-xp-text">' + (petData.xp || 0) + '/' + needed + '</span>';
      popup.appendChild(xpWrap);
    } else {
      var capEl = document.createElement('div');
      capEl.style.cssText = 'font-size:0.7em;color:var(--accent);margin-bottom:4px';
      capEl.textContent = 'MAX (Cap: ' + petLevelCap + ')';
      popup.appendChild(capEl);
    }

    // Stats grid
    var statsGrid = document.createElement('div');
    statsGrid.className = 'rpg-pet-stats';
    var statKeys = ['hp', 'atk', 'def', 'spd', 'cri'];
    for (var si = 0; si < statKeys.length; si++) {
      var lbl = document.createElement('div');
      lbl.className = 'rpg-pet-stat-label';
      lbl.textContent = statKeys[si].toUpperCase();
      statsGrid.appendChild(lbl);
    }
    for (var si = 0; si < statKeys.length; si++) {
      var val = document.createElement('div');
      val.className = 'rpg-pet-stat-val';
      val.textContent = stats[statKeys[si]];
      statsGrid.appendChild(val);
    }
    popup.appendChild(statsGrid);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'rpg-pet-popup-actions';

    // Moves / Detail button (opens combat pet detail modal)
    if (window.RpgCombat && window.RpgCombat.showPetDetail) {
      var movesBtn = document.createElement('button');
      movesBtn.className = 'rpg-btn rpg-btn-small';
      movesBtn.textContent = 'Moves & Stats';
      movesBtn.addEventListener('click', function () {
        closePetPopup();
        window.RpgCombat.showPetDetail(petId, rpgPets, function () {
          renderPetTab();
        });
      });
      actions.appendChild(movesBtn);
    }

    if (status === 'unassigned') {
      // Set Follower
      var followBtn = document.createElement('button');
      followBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
      followBtn.textContent = 'Set Follower';
      followBtn.addEventListener('click', function () {
        setFollower(petId);
        closePetPopup();
        renderPetTab();
      });
      actions.appendChild(followBtn);

      // Station Here — only if at a skill location on world map
      if (playerAtLocation && RPG_STATION_SKILL_MAP[playerAtLocation]) {
        var stationBtn = document.createElement('button');
        stationBtn.className = 'rpg-btn rpg-btn-small';
        stationBtn.textContent = 'Station at ' + MAP_LOCATIONS[playerAtLocation].name;
        stationBtn.addEventListener('click', function () {
          stationPet(petId, playerAtLocation);
          closePetPopup();
          renderPetTab();
        });
        actions.appendChild(stationBtn);
      }
    } else {
      // Unassign
      var unassignBtn = document.createElement('button');
      unassignBtn.className = 'rpg-btn rpg-btn-small rpg-btn-danger';
      unassignBtn.textContent = 'Unassign';
      unassignBtn.addEventListener('click', function () {
        if (status === 'following') {
          clearFollower();
        } else {
          unstationPet(petId);
        }
        closePetPopup();
        renderPetTab();
      });
      actions.appendChild(unassignBtn);
    }

    popup.appendChild(actions);

    // Status indicator
    if (status !== 'unassigned') {
      var statusEl = document.createElement('div');
      statusEl.className = 'rpg-pet-popup-status';
      if (status === 'following') {
        statusEl.textContent = 'Currently following you';
      } else {
        var sLocId = status.split(':')[1];
        var sLocName = MAP_LOCATIONS[sLocId] ? MAP_LOCATIONS[sLocId].name : sLocId;
        statusEl.textContent = 'Stationed at ' + sLocName;
      }
      popup.appendChild(statusEl);
    }

    // Close on outside click
    popup.addEventListener('click', function (e) { e.stopPropagation(); });

    // Position in pane
    var pane = $('osrs-side-pets');
    if (pane) {
      pane.appendChild(popup);
    }

    // Close on any click outside popup
    setTimeout(function () {
      document.addEventListener('click', closePetPopupOnOutside);
    }, 0);
  }

  function closePetPopup() {
    activePetPopup = null;
    var popup = document.getElementById('rpg-pet-popup');
    if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    document.removeEventListener('click', closePetPopupOnOutside);
  }

  function closePetPopupOnOutside(e) {
    var popup = document.getElementById('rpg-pet-popup');
    if (popup && !popup.contains(e.target)) {
      closePetPopup();
    }
  }

  // ══════════════════════════════════════════════
  // ══  STATION / COLLECT LOGIC                  ══
  // ══════════════════════════════════════════════

  function stationPet(petId, locationId) {
    if (!RPG_STATION_SKILL_MAP[locationId]) return;
    var rpgPets = getRpgPetState();
    if (!rpgPets.owned[petId]) return;

    // Unassign from any current role
    if (rpgPets.follower === petId) rpgPets.follower = null;
    for (var loc in rpgPets.stations) {
      if (rpgPets.stations[loc] && rpgPets.stations[loc].petId === petId) {
        rpgPets.stations[loc] = null;
      }
    }

    var now = Date.now();
    rpgPets.stations[locationId] = {
      petId: petId,
      stationedAt: now,
      lastCollected: now,
      collectCount: 0
    };

    saveRpgPetState(rpgPets);
    preloadStationedSprite(petId, locationId);
    addGameMessage(petCatalog.creatures[petId].name + ' stationed at ' + MAP_LOCATIONS[locationId].name + '.', 'system');
  }

  function unstationPet(petId) {
    var rpgPets = getRpgPetState();
    for (var loc in rpgPets.stations) {
      if (rpgPets.stations[loc] && rpgPets.stations[loc].petId === petId) {
        rpgPets.stations[loc] = null;
        delete stationedSpriteSheets[loc];
      }
    }
    saveRpgPetState(rpgPets);
    addGameMessage((petCatalog.creatures[petId] ? petCatalog.creatures[petId].name : petId) + ' unassigned.', 'system');
  }

  function setFollower(petId) {
    var rpgPets = getRpgPetState();
    if (!rpgPets.owned[petId]) return;

    // Unassign from station if needed
    for (var loc in rpgPets.stations) {
      if (rpgPets.stations[loc] && rpgPets.stations[loc].petId === petId) {
        rpgPets.stations[loc] = null;
        delete stationedSpriteSheets[loc];
      }
    }

    rpgPets.follower = petId;
    saveRpgPetState(rpgPets);
    loadFollowerSprite(petId);
    addGameMessage((petCatalog.creatures[petId] ? petCatalog.creatures[petId].name : petId) + ' is now following you!', 'system');
  }

  function clearFollower() {
    var rpgPets = getRpgPetState();
    var oldFollower = rpgPets.follower;
    rpgPets.follower = null;
    saveRpgPetState(rpgPets);
    followerSpriteSheet = null;
    followerPetId = null;
    if (oldFollower && petCatalog.creatures[oldFollower]) {
      addGameMessage(petCatalog.creatures[oldFollower].name + ' dismissed.', 'system');
    }
  }

  // ── Passive Gain Formula ──────────────────────
  function calculateStationRewards(locationId) {
    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[locationId];
    if (!station || !station.petId) return null;

    var petId = station.petId;
    var petData = rpgPets.owned[petId];
    if (!petData) return null;

    var creature = petCatalog.creatures[petId];
    if (!creature) return null;

    var now = Date.now();
    var elapsed = now - (station.lastCollected || station.stationedAt);
    var elapsedSec = elapsed / 1000;
    var maxSec = 8 * 3600; // 8 hour cap
    if (elapsedSec > maxSec) elapsedSec = maxSec;

    var actions = Math.floor(elapsedSec / 60); // 1 action per minute
    if (actions < 1) return { xpGain: 0, resourceCount: 0, petXpGain: 0, elapsed: elapsed, actions: 0 };

    // Skill level from per-slot skills state
    var skill = RPG_STATION_SKILL_MAP[locationId];
    var skillLevel = 1;
    var ss = getSlotSkillsState(activeSlot);
    if (ss && ss.skills && ss.skills[skill]) {
      skillLevel = ss.skills[skill].level || 1;
    }

    // Type bonus
    var typeBonus = 1;
    if (RPG_SKILL_TYPE_BONUS[creature.type] === skill) typeBonus = 2;
    else if (creature.type === 'mystic') typeBonus = 1.5;

    // Tier bonus
    var tierBonus = creature.tier === 'legendary' ? 2 : creature.tier === 'rare' ? 1.5 : 1;

    var xpPerAction = (5 + Math.floor(skillLevel * 0.5)) * typeBonus * tierBonus;
    var xpGain = Math.floor(xpPerAction * actions);

    // Resources: 30% chance per action
    var resourceCount = 0;
    for (var a = 0; a < actions; a++) {
      if (Math.random() < 0.3) resourceCount++;
    }

    var petXpGain = Math.floor(actions * 0.5);

    return {
      xpGain: xpGain,
      resourceCount: resourceCount,
      petXpGain: petXpGain,
      elapsed: elapsed,
      actions: actions,
      skill: skill,
      petId: petId
    };
  }

  function hasUncollectedRewards(locationId) {
    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[locationId];
    if (!station || !station.petId) return false;
    var elapsed = Date.now() - (station.lastCollected || station.stationedAt);
    return elapsed > 5 * 60 * 1000; // > 5 minutes
  }

  function collectAtLocation(locationId) {
    var rewards = calculateStationRewards(locationId);
    if (!rewards || rewards.actions < 1) return;

    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[locationId];
    if (!station) return;

    // Apply skill XP via skills.js API (addXp may not exist yet — future integration)
    var api = window.__RPG_SKILLS_API;
    if (api && api.addXp && rewards.skill && rewards.xpGain > 0) {
      api.addXp(rewards.skill, rewards.xpGain);
    }

    // Add pet XP
    var petData = rpgPets.owned[station.petId];
    if (petData && rewards.petXpGain > 0) {
      petData.xp = (petData.xp || 0) + rewards.petXpGain;
      var maxLv = petCatalog.creatures[station.petId] ? petCatalog.creatures[station.petId].maxLevel : 3;
      var needed = rpgPetXpForLevel(petData.level);
      while (petData.xp >= needed && petData.level < maxLv) {
        petData.level++;
        petData.xp -= needed;
        needed = rpgPetXpForLevel(petData.level);
        addGameMessage(petCatalog.creatures[station.petId].name + ' leveled up to Lv ' + petData.level + '!', 'system');
      }
    }

    // Pet speech bubble (before incrementing count so mood reflects current state)
    var speechLine = getCollectSpeech(station.petId, locationId);
    showPetSpeechBubble(locationId, speechLine);

    // Increment collect count and reset timer
    station.collectCount = (station.collectCount || 0) + 1;
    station.lastCollected = Date.now();
    saveRpgPetState(rpgPets);

    // Show collection overlay
    showCollectOverlay(station.petId, rewards);

    // Log
    var petName = petCatalog.creatures[station.petId] ? petCatalog.creatures[station.petId].name : station.petId;
    addGameMessage('Collected from ' + petName + ': +' + rewards.xpGain + ' ' + rewards.skill + ' XP, +' + rewards.petXpGain + ' pet XP.', 'system');

    // Re-render pet tab if open
    renderPetTab();
  }

  function showCollectOverlay(petId, rewards) {
    // Remove existing overlay
    var old = document.querySelector('.rpg-collect-overlay');
    if (old) old.parentNode.removeChild(old);

    var gamePanel = $('skills-game-panel');
    if (!gamePanel) return;

    var overlay = document.createElement('div');
    overlay.className = 'rpg-collect-overlay';

    var title = document.createElement('div');
    title.className = 'rpg-collect-overlay-title';
    title.textContent = 'Collection from ' + (petCatalog.creatures[petId] ? petCatalog.creatures[petId].name : petId);
    overlay.appendChild(title);

    // Pet sprite
    var sprite = renderRpgPetSprite(petId, getRpgPetState().owned[petId] ? getRpgPetState().owned[petId].level : 1, 48);
    if (sprite) {
      sprite.style.margin = '0 auto 8px';
      overlay.appendChild(sprite);
    }

    var timeEl = document.createElement('div');
    timeEl.className = 'rpg-collect-overlay-time';
    timeEl.textContent = 'Stationed for ' + formatDuration(rewards.elapsed);
    overlay.appendChild(timeEl);

    var rewardsEl = document.createElement('div');
    rewardsEl.className = 'rpg-collect-overlay-rewards';
    rewardsEl.innerHTML =
      '<span>+' + rewards.xpGain + '</span> ' + (rewards.skill || '') + ' XP<br>' +
      '<span>+' + rewards.petXpGain + '</span> Pet XP';
    overlay.appendChild(rewardsEl);

    overlay.addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    gamePanel.appendChild(overlay);

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 5000);
  }

  function formatDuration(ms) {
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  // ══════════════════════════════════════════════
  // ══  FOLLOWER PET ON CANVAS                   ══
  // ══════════════════════════════════════════════

  function loadFollowerSprite(petId) {
    if (!petSpriteData || !petId) { followerSpriteSheet = null; followerPetId = null; return; }
    var spriteId = petCatalog.creatures[petId] ? petCatalog.creatures[petId].spriteId : petId;
    var data = petSpriteData[spriteId];
    if (!data) { followerSpriteSheet = null; followerPetId = null; return; }

    var sheetPath = data.altSheet || data.sheet;
    var img = new Image();
    img.src = sheetPath;
    followerSpriteSheet = img;
    followerPetId = petId;

    // Calculate frame index from level (respect frameOffset)
    var rpgPets = getRpgPetState();
    var petData = rpgPets.owned[petId];
    var level = petData ? petData.level : 1;
    var frameOffset = data.frameOffset || 0;
    followerFrameIdx = Math.min(frameOffset + level - 1, (data.frames || 3) - 1);

    // Init position near player
    followerPos.x = playerPos.x;
    followerPos.y = playerPos.y + FOLLOWER_TRAIL;
    followerDir = 'down';
  }

  function updateFollowerPosition(dt) {
    if (!followerSpriteSheet || !followerPetId) return;

    // Target position: behind the player based on direction
    var tx = playerPos.x;
    var ty = playerPos.y;
    switch (playerDir) {
      case 'up':    ty += FOLLOWER_TRAIL; break;
      case 'down':  ty -= FOLLOWER_TRAIL; break;
      case 'left':  tx += FOLLOWER_TRAIL; break;
      case 'right': tx -= FOLLOWER_TRAIL; break;
      default:      ty += FOLLOWER_TRAIL; break;
    }

    // Lerp
    var lerpSpeed = 3.0 * dt;
    followerPos.x += (tx - followerPos.x) * lerpSpeed;
    followerPos.y += (ty - followerPos.y) * lerpSpeed;

    // Determine facing direction
    var dx = tx - followerPos.x;
    var dy = ty - followerPos.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      if (Math.abs(dx) > Math.abs(dy)) {
        followerDir = dx > 0 ? 'right' : 'left';
      } else {
        followerDir = dy > 0 ? 'down' : 'up';
      }
    }
  }

  function drawFollower(ctx) {
    if (!followerPetId) return;

    var x = Math.round(followerPos.x);
    var y = Math.round(followerPos.y);
    var bob = Math.sin((typeof townSmokeFrame !== 'undefined' ? townSmokeFrame : smokeFrame) * 0.1) * 1.5;
    var half = FOLLOWER_SIZE / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + half + 2, half * 0.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // If sprite not loaded yet, draw a colored placeholder circle
    if (!followerSpriteSheet || !followerSpriteSheet.complete || !followerSpriteSheet.naturalWidth) {
      ctx.fillStyle = '#88cc66';
      ctx.beginPath();
      ctx.arc(x, y + bob, half * 0.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Draw sprite frame
    var fw = 48, fh = 48;
    var sx = followerFrameIdx * fw;
    var flip = (followerDir === 'left');

    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.scale(-1, 1);
      ctx.drawImage(followerSpriteSheet, sx, 0, fw, fh, -half, -half, FOLLOWER_SIZE, FOLLOWER_SIZE);
      ctx.restore();
    } else {
      ctx.drawImage(followerSpriteSheet, sx, 0, fw, fh, x - half, y - half + bob, FOLLOWER_SIZE, FOLLOWER_SIZE);
    }
  }

  function updateTownFollowerPosition(dt) {
    if (!followerSpriteSheet || !followerPetId) return;

    var tx = townPlayerPos.x;
    var ty = townPlayerPos.y;
    switch (townPlayerDir) {
      case 'up':    ty += FOLLOWER_TRAIL; break;
      case 'down':  ty -= FOLLOWER_TRAIL; break;
      case 'left':  tx += FOLLOWER_TRAIL; break;
      case 'right': tx -= FOLLOWER_TRAIL; break;
      default:      ty += FOLLOWER_TRAIL; break;
    }

    var lerpSpeed = 3.0 * dt;
    followerPos.x += (tx - followerPos.x) * lerpSpeed;
    followerPos.y += (ty - followerPos.y) * lerpSpeed;

    var dx = tx - followerPos.x;
    var dy = ty - followerPos.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      if (Math.abs(dx) > Math.abs(dy)) {
        followerDir = dx > 0 ? 'right' : 'left';
      } else {
        followerDir = dy > 0 ? 'down' : 'up';
      }
    }
  }

  function drawTownFollower(ctx) {
    // Reuse drawFollower — same logic, positions are shared
    drawFollower(ctx);
  }

  // ══════════════════════════════════════════════
  // ══  STATIONED PET SPRITES ON WORLD MAP       ══
  // ══════════════════════════════════════════════

  function preloadStationedSprite(petId, locationId) {
    if (!petSpriteData || !petCatalog || !petCatalog.creatures[petId]) return;
    var spriteId = petCatalog.creatures[petId].spriteId;
    var data = petSpriteData[spriteId];
    if (!data) return;

    var sheetPath = data.altSheet || data.sheet;
    var img = new Image();
    img.src = sheetPath;

    var rpgPets = getRpgPetState();
    var petData = rpgPets.owned[petId];
    var level = petData ? petData.level : 1;
    var frameOffset = data.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + level - 1, (data.frames || 3) - 1);

    stationedSpriteSheets[locationId] = { img: img, frameIdx: frameIdx };
  }

  function preloadAllStationedSprites() {
    stationedSpriteSheets = {};
    var rpgPets = getRpgPetState();
    for (var loc in rpgPets.stations) {
      if (rpgPets.stations[loc] && rpgPets.stations[loc].petId) {
        preloadStationedSprite(rpgPets.stations[loc].petId, loc);
      }
    }
  }

  function drawStationedPets(ctx) {
    var rpgPets = getRpgPetState();
    for (var loc in rpgPets.stations) {
      var station = rpgPets.stations[loc];
      if (!station || !station.petId) continue;
      var mapLoc = MAP_LOCATIONS[loc];
      if (!mapLoc) continue;

      var px = mapLoc.x + 28;
      var py = mapLoc.y + 22;
      var size = 28;

      // Background circle to make pet stand out
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(px, py, size / 2 + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,136,204,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, size / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();

      var spriteData = stationedSpriteSheets[loc];
      if (spriteData && spriteData.img && spriteData.img.complete && spriteData.img.naturalWidth) {
        var fw = 48, fh = 48;
        var sx = spriteData.frameIdx * fw;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteData.img, sx, 0, fw, fh, px - size / 2, py - size / 2, size, size);
      } else {
        // Placeholder dot
        ctx.fillStyle = '#6688cc';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Uncollected rewards indicator — pulsing yellow "!"
      if (hasUncollectedRewards(loc)) {
        var pulse = Math.sin(smokeFrame * 0.12) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        // Yellow circle background
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(px + size / 2 + 2, py - size / 2 - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        // "!" text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', px + size / 2 + 2, py - size / 2 + 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ══════════════════════════════════════════════
  // ══  STATIONED PET IN SKILL GAME AREA         ══
  // ══════════════════════════════════════════════

  function renderStationedPetInGameArea(locationId) {
    // Remove any existing dock
    var existing = document.querySelector('.rpg-station-dock');
    if (existing) existing.parentNode.removeChild(existing);

    if (!locationId || !RPG_STATION_SKILL_MAP[locationId]) return;

    var area = document.getElementById('skills-game-area');
    if (!area) return;

    var rpgPets = getRpgPetState();
    var station = rpgPets.stations[locationId];
    var hasPet = station && station.petId && rpgPets.owned[station.petId];

    // Dock container (always present)
    var dock = document.createElement('div');
    dock.className = 'rpg-station-dock' + (hasPet ? ' occupied' : '');

    if (hasPet) {
      var petId = station.petId;
      var petData = rpgPets.owned[petId];
      var creature = petCatalog ? petCatalog.creatures[petId] : null;

      // Pet sprite above pad
      var sprite = renderRpgPetSprite(petId, petData.level, 48);
      if (sprite) {
        sprite.className = 'rpg-station-dock-pet';
        sprite.style.imageRendering = 'pixelated';
        dock.appendChild(sprite);
      }

      // Hex pad
      var pad = document.createElement('div');
      pad.className = 'rpg-station-dock-pad';
      var dot = document.createElement('div');
      dot.className = 'rpg-station-dock-pad-dot';
      pad.appendChild(dot);
      dock.appendChild(pad);

      // Name
      if (creature) {
        var label = document.createElement('div');
        label.className = 'rpg-station-dock-label';
        label.textContent = creature.name;
        dock.appendChild(label);
      }

      // Time working
      var elapsed = Date.now() - (station.lastCollected || station.stationedAt);
      if (elapsed > 5 * 60 * 1000) {
        var statusEl = document.createElement('div');
        statusEl.className = 'rpg-station-dock-status';
        statusEl.textContent = formatDuration(elapsed) + ' working';
        dock.appendChild(statusEl);
      }

      // Action buttons (hidden until click)
      var actions = document.createElement('div');
      actions.className = 'rpg-station-dock-actions';

      if (elapsed > 5 * 60 * 1000) {
        var collectBtn = document.createElement('button');
        collectBtn.className = 'rpg-station-dock-btn collect';
        collectBtn.textContent = 'Collect';
        collectBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          collectAtLocation(locationId);
          renderStationedPetInGameArea(locationId);
        });
        actions.appendChild(collectBtn);
      }

      var unassignBtn = document.createElement('button');
      unassignBtn.className = 'rpg-station-dock-btn unassign';
      unassignBtn.textContent = 'Unassign';
      unassignBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        unstationPet(petId);
        renderStationedPetInGameArea(locationId);
        if (window.__SKILLS_UPDATE_AUTO_BTN) window.__SKILLS_UPDATE_AUTO_BTN();
      });
      actions.appendChild(unassignBtn);
      dock.appendChild(actions);

      // Toggle expanded
      dock.addEventListener('click', function () {
        dock.classList.toggle('expanded');
      });

    } else {
      // Empty dock — "+" invite, pulsing pad
      var plus = document.createElement('div');
      plus.className = 'rpg-station-dock-empty';
      plus.textContent = '+';
      dock.appendChild(plus);

      var pad = document.createElement('div');
      pad.className = 'rpg-station-dock-pad';
      var dot = document.createElement('div');
      dot.className = 'rpg-station-dock-pad-dot';
      pad.appendChild(dot);
      dock.appendChild(pad);

      var hint = document.createElement('div');
      hint.className = 'rpg-station-dock-label';
      hint.textContent = 'Station';
      dock.appendChild(hint);

      // Click opens pet tab — next pet click auto-stations here
      dock.addEventListener('click', function () {
        pendingStationLocationId = locationId;
        var panel = document.getElementById('osrs-side-panel');
        var body = document.getElementById('osrs-side-panel-body');
        if (panel) panel.style.display = '';
        if (body) body.style.display = '';
        switchSideTab('pets');
      });
    }

    area.appendChild(dock);
  }

  // ── Keyboard Interceptor ────────────────────────
  // Block 1-5 keys from triggering skills.js skill switch in RPG mode
  function onRpgKeyDown(e) {
    if (currentScreen !== 'rpg-game-screen') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    // Escape: close pet popup → close store → close pet store → exit casino → exit town → return to map
    if (e.key === 'Escape') {
      if (activePetPopup) { closePetPopup(); return; }
      if (tavernOpen) { closeTavern(); return; }
      if (generalStoreOpen) { closeGeneralStore(); return; }
      if (petStoreModalOpen) { closePetStoreModal(); return; }
      if (insideCasino && window.RpgCasino) { window.RpgCasino.handleEscape(); return; }
      if (insideTown) { returnToWorldMap(); return; }
    }

    var num = parseInt(e.key);
    if (num >= 1 && num <= 5) {
      e.stopPropagation();
    }
  }

  // ── Init ──────────────────────────────────────
  function init() {
    if (!$('rpg-page')) return;

    meta = loadMeta();

    // Load pet sprite data for world map tiles
    try {
      var xhr1 = new XMLHttpRequest();
      xhr1.open('GET', '/data/petsprites.json', false); // sync — small file
      xhr1.send();
      if (xhr1.status === 200) petSpriteData = JSON.parse(xhr1.responseText);
    } catch (e) {}
    try {
      var xhr2 = new XMLHttpRequest();
      xhr2.open('GET', '/data/petcatalog.json', false);
      xhr2.send();
      if (xhr2.status === 200) petCatalog = JSON.parse(xhr2.responseText);
    } catch (e) {}

    // Preload pet sprite sheets (fire-and-forget so they're cached for world map)
    if (petCatalog && petCatalog.creatures) {
      var preloadedSheets = {};
      for (var pid in petCatalog.creatures) {
        if (!petCatalog.creatures.hasOwnProperty(pid)) continue;
        var sheet = '/images/pets/' + pid + '-alt.png';
        if (!preloadedSheets[sheet]) {
          preloadedSheets[sheet] = true;
          var pImg = new Image();
          pImg.src = sheet;
        }
      }
    }

    // Load character sprite sheets (async — renders once loaded)
    loadCharSprites();

    // Set RPG mode flag so skills.js knows not to auto-init
    window.__RPG_STORAGE_KEY = '__rpg_pending__';

    // Wire up menu buttons
    $('rpg-btn-new').addEventListener('click', onNewGame);
    $('rpg-btn-continue').addEventListener('click', onContinue);
    $('rpg-slots-back').addEventListener('click', onSlotsBack);
    $('rpg-create-back').addEventListener('click', onCreateBack);
    $('rpg-btn-begin').addEventListener('click', onBeginAdventure);
    $('rpg-name-input').addEventListener('input', onNameInput);
    $('rpg-btn-save-quit').addEventListener('click', onSaveQuit);

    // World Map buttons (panel + topbar)
    var mapBtn = $('rpg-map-nav-btn');
    if (mapBtn) mapBtn.addEventListener('click', returnToMap);
    var mapBtnTopbar = $('rpg-btn-map');
    if (mapBtnTopbar) mapBtnTopbar.addEventListener('click', returnToMap);

    // Skill row click interceptor (capture phase)
    var skillsList = $('skills-list');
    if (skillsList) {
      skillsList.addEventListener('click', onSkillListCapture, true);
    }

    // Keyboard interceptor: switch to skill view when pressing 1-5 on map
    document.addEventListener('keydown', onRpgKeyDown);

    // Chatbox toggle + text tabs
    var chatToggle = $('osrs-chatbox-toggle');
    if (chatToggle) chatToggle.addEventListener('click', toggleChatbox);
    var chatTabs = document.querySelector('.osrs-chatbox-tabs');
    if (chatTabs) chatTabs.addEventListener('click', onChatTabClick);

    // Side panel toggle + icon tabs
    var sidePanelToggle = $('osrs-side-panel-toggle');
    if (sidePanelToggle) sidePanelToggle.addEventListener('click', toggleSidePanel);
    var sideIcons = document.querySelector('.osrs-side-panel-icons');
    if (sideIcons) sideIcons.addEventListener('click', onSideTabClick);

    // Equipment: click slots to unequip, listen for equip requests from inventory
    var equipGrid = $('rpg-equip-grid');
    if (equipGrid) equipGrid.addEventListener('click', onEquipSlotClick);
    window.addEventListener('rpg-equip-request', onEquipRequest);

    // Enter key submits character creation
    $('rpg-name-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !$('rpg-btn-begin').disabled) {
        onBeginAdventure();
      }
    });

    // Auto-resume last active slot on page refresh
    if (meta.currentSlot >= 0 && meta.slots[meta.currentSlot]) {
      enterGame(meta.currentSlot);
    } else {
      renderMenuScreen();
      showScreen('rpg-menu-screen');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
