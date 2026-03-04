(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var META_KEY = 'rpg-meta';
  var SLOT_PREFIX = 'rpg-slot-';
  var SKILLS_SUFFIX = '-skills';
  var MAX_SLOTS = 3;

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
    town:   'The townsfolk go about their business. A merchant beckons from his stall.',
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

  function getDefaultRpgPets() {
    return {
      follower: null,
      stations: {},
      owned: {},
      pity: { common: 0, rare: 0, legendary: 0 },
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
  var CHAR_SIZE = 16; // native pixel size
  var CHAR_SCALE = 2; // render at 32x32

  // Character pixel art — 16x16, 4 directions, 2 walk frames + 1 idle
  // Colors: 0=skin, 1=hair, 2=tunic, 3=belt, 4=pants, 5=boots, 6=eye, 7=sword, 8=hilt, 9=skinHi, A=tunicShadow
  var CHAR_COLORS = ['#f0c090','#5a3010','#2d8c3c','#8b5e2b','#6b4226','#2a1a0a','#1a1a2e','#a0a0a0','#c0a060','#e0d0b0','#1d6a28'];
  var CHAR_FRAMES = {
    down: [
      // idle — bigger head (3px tall), sword at right hip
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'6'],[8,2,'0'],[9,2,'6'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[7,8,'4'],[8,8,'4'],[9,8,'4'],[10,8,'4'],
       [5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],[11,9,'7'],
       [5,10,'4'],[6,10,'4'],[9,10,'4'],[10,10,'4'],[11,10,'7'],
       [5,11,'5'],[6,11,'5'],[9,11,'5'],[10,11,'5'],[11,11,'8'],
       [5,12,'5'],[6,12,'5'],[9,12,'5'],[10,12,'5']],
      // walk1
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'6'],[8,2,'0'],[9,2,'6'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [4,8,'4'],[5,8,'4'],[6,8,'4'],[9,8,'4'],[10,8,'4'],
       [3,9,'4'],[4,9,'4'],[9,9,'4'],[10,9,'4'],[11,9,'7'],
       [3,10,'5'],[4,10,'5'],[9,10,'4'],[10,10,'4'],[11,10,'7'],
       [3,11,'5'],[4,11,'5'],[9,11,'5'],[10,11,'5'],[11,11,'8'],
       [9,12,'5'],[10,12,'5']],
      // walk2
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'6'],[8,2,'0'],[9,2,'6'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[9,8,'4'],[10,8,'4'],[11,8,'4'],
       [5,9,'4'],[6,9,'4'],[11,9,'4'],[12,9,'4'],
       [5,10,'4'],[6,10,'4'],[11,10,'5'],[12,10,'5'],
       [5,11,'5'],[6,11,'5'],[11,11,'5'],[12,11,'5'],
       [5,12,'5'],[6,12,'5']]
    ],
    up: [
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],[10,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[7,8,'4'],[8,8,'4'],[9,8,'4'],[10,8,'4'],
       [5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],
       [5,10,'4'],[6,10,'4'],[9,10,'4'],[10,10,'4'],
       [5,11,'5'],[6,11,'5'],[9,11,'5'],[10,11,'5'],
       [5,12,'5'],[6,12,'5'],[9,12,'5'],[10,12,'5']],
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],[10,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [4,8,'4'],[5,8,'4'],[6,8,'4'],[9,8,'4'],[10,8,'4'],
       [3,9,'4'],[4,9,'4'],[9,9,'4'],[10,9,'4'],
       [3,10,'5'],[4,10,'5'],[9,10,'4'],[10,10,'4'],
       [3,11,'5'],[4,11,'5'],[9,11,'5'],[10,11,'5'],
       [9,12,'5'],[10,12,'5']],
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [5,1,'1'],[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],[10,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'2'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'2'],
       [5,5,'A'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'A'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[9,8,'4'],[10,8,'4'],[11,8,'4'],
       [5,9,'4'],[6,9,'4'],[11,9,'4'],[12,9,'4'],
       [5,10,'4'],[6,10,'4'],[11,10,'5'],[12,10,'5'],
       [5,11,'5'],[6,11,'5'],[11,11,'5'],[12,11,'5'],
       [5,12,'5'],[6,12,'5']]
    ],
    left: [
      [[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [6,1,'1'],[7,1,'0'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [6,2,'6'],[7,2,'0'],[8,2,'0'],[9,2,'0'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'0'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],
       [5,5,'0'],[6,5,'A'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[7,8,'4'],[8,8,'4'],[9,8,'4'],
       [5,9,'4'],[6,9,'4'],[8,9,'4'],[9,9,'4'],
       [5,10,'4'],[6,10,'4'],[8,10,'4'],[9,10,'4'],
       [5,11,'5'],[6,11,'5'],[8,11,'5'],[9,11,'5'],
       [5,12,'5'],[6,12,'5'],[8,12,'5'],[9,12,'5']],
      [[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [6,1,'1'],[7,1,'0'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [6,2,'6'],[7,2,'0'],[8,2,'0'],[9,2,'0'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'0'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],
       [5,5,'0'],[6,5,'A'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [4,8,'4'],[5,8,'4'],[6,8,'4'],[8,8,'4'],[9,8,'4'],
       [3,9,'4'],[4,9,'4'],[8,9,'4'],[9,9,'4'],
       [3,10,'5'],[4,10,'5'],[8,10,'5'],[9,10,'5'],
       [3,11,'5'],[4,11,'5']],
      [[7,0,'1'],[8,0,'1'],[9,0,'1'],
       [6,1,'1'],[7,1,'0'],[8,1,'9'],[9,1,'0'],[10,1,'1'],
       [6,2,'6'],[7,2,'0'],[8,2,'0'],[9,2,'0'],
       [7,3,'0'],[8,3,'0'],
       [5,4,'0'],[6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],
       [5,5,'0'],[6,5,'A'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [5,8,'4'],[6,8,'4'],[8,8,'4'],[9,8,'4'],[10,8,'4'],
       [5,9,'4'],[6,9,'4'],[10,9,'4'],[11,9,'4'],
       [5,10,'5'],[6,10,'5'],[10,10,'5'],[11,10,'5'],
       [10,11,'5'],[11,11,'5']]
    ],
    right: [
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'0'],[9,1,'1'],
       [6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'6'],
       [7,3,'0'],[8,3,'0'],
       [6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'A'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [6,8,'4'],[7,8,'4'],[8,8,'4'],[9,8,'4'],[10,8,'4'],
       [6,9,'4'],[7,9,'4'],[9,9,'4'],[10,9,'4'],[4,9,'7'],
       [6,10,'4'],[7,10,'4'],[9,10,'4'],[10,10,'4'],[4,10,'7'],
       [6,11,'5'],[7,11,'5'],[9,11,'5'],[10,11,'5'],[4,11,'8'],
       [6,12,'5'],[7,12,'5'],[9,12,'5'],[10,12,'5']],
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'0'],[9,1,'1'],
       [6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'6'],
       [7,3,'0'],[8,3,'0'],
       [6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'A'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [6,8,'4'],[7,8,'4'],[8,8,'4'],[10,8,'4'],[11,8,'4'],
       [6,9,'4'],[7,9,'4'],[11,9,'4'],[12,9,'4'],
       [6,10,'5'],[7,10,'5'],[11,10,'5'],[12,10,'5'],
       [6,11,'5'],[7,11,'5']],
      [[6,0,'1'],[7,0,'1'],[8,0,'1'],
       [5,1,'1'],[6,1,'0'],[7,1,'9'],[8,1,'0'],[9,1,'1'],
       [6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'6'],
       [7,3,'0'],[8,3,'0'],
       [6,4,'2'],[7,4,'2'],[8,4,'2'],[9,4,'2'],[10,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'A'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [6,7,'3'],[7,7,'3'],[8,7,'3'],[9,7,'3'],
       [4,8,'4'],[5,8,'4'],[6,8,'4'],[7,8,'4'],[8,8,'4'],
       [3,9,'4'],[4,9,'4'],[6,9,'4'],[7,9,'4'],
       [3,10,'5'],[4,10,'5'],[6,10,'5'],[7,10,'5'],
       [3,11,'5'],[4,11,'5']]
    ]
  };

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
    [55,120,14],[85,240,14],[45,360,14],[75,450,14],[65,540,14],[95,180,14]
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
    mine:   { base: ['#4a7a3a','#507a40','#5a7a48','#4a7040'], detail: '#6a6a6a' },
    dock:   { base: ['#5a9848','#60a050','#68a858','#70b060'], detail: '#c8b478' },
    forest: { base: ['#2a6a22','#327a2a','#3a8a32','#429438'], detail: '#1e5518' },
    smithy: { base: ['#4a7a38','#4e7a3c','#527a40','#4a7038'], detail: '#5a4a30' },
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
  var BIOME_TILE = 8;

  function buildBiomeIndexMap() {
    var cols = Math.ceil(MAP_W / BIOME_TILE);
    var rows = Math.ceil(MAP_H / BIOME_TILE);
    biomeIndexMap = new Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var px = c * BIOME_TILE + 4;
        var py = r * BIOME_TILE + 4;
        biomeIndexMap[r * cols + c] = getBiomeType(px, py);
      }
    }
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
    for (var i = 0; i < 3; i++) {
      butterflies.push({
        x: 300 + i * 200 + (tileHash(i, 77) % 100),
        y: 200 + (tileHash(i, 78) % 200),
        phase: i * 2.1,
        color: ['#e84060','#4080e8','#e8a040'][i]
      });
    }
    fireflies = [];
    for (var i = 0; i < 5; i++) {
      fireflies.push({
        x: 150 + i * 180 + (tileHash(i, 88) % 80),
        y: 300 + (tileHash(i, 89) % 200),
        phase: i * 1.3
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
    dungeon:   { x: 290,  y: 520, name: 'Dungeon Gate',    type: 'placeholder', desc: 'Descend into darkness.' },
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

  // ── Town State ────────────────────────────────
  var townStaticBuffer = null, townStaticBufferCtx = null;
  var townAnimId = null;
  var insideTown = false;
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
    }
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

    if (mode === 'skill') {
      if (mapContainer) mapContainer.style.display = 'none';
      if (gameHeader) gameHeader.style.display = '';
      if (gameArea) gameArea.style.display = '';
      if (gameLog) gameLog.style.display = '';
      if (skillTopbar) skillTopbar.style.display = '';
    } else {
      if (mapContainer) mapContainer.style.display = 'block';
      if (gameHeader) gameHeader.style.display = 'none';
      if (gameArea) gameArea.style.display = 'none';
      if (gameLog) gameLog.style.display = 'none';
      if (skillTopbar) skillTopbar.style.display = 'none';
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
    $('rpg-name-input').value = '';
    $('rpg-btn-begin').disabled = true;
    showScreen('rpg-create-screen');
    $('rpg-name-input').focus();
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

  function onBeginAdventure() {
    var name = $('rpg-name-input').value.trim();
    if (!name || createTargetSlot < 0) return;

    var now = Date.now();
    meta.slots[createTargetSlot] = {
      name: name,
      created: now,
      lastPlayed: now,
      rpgPets: getDefaultRpgPets()
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

  // ── Game Entry ────────────────────────────────
  function enterGame(slot) {
    activeSlot = slot;
    meta.currentSlot = slot;
    var prevLastPlayed = meta.slots[slot].lastPlayed;
    var isFirstLogin = Math.abs(prevLastPlayed - meta.slots[slot].created) < 2000;
    meta.slots[slot].lastPlayed = Date.now();
    saveMeta();

    // Set up RPG storage key for skills.js
    window.__RPG_STORAGE_KEY = slotStorageKey(slot);

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
      addGameMessage('Welcome, ' + pName + '. This is your first time here \u2014 Jack greets you.', 'system');
    } else if (Date.now() - prevLastPlayed < 300000) {
      addGameMessage('Welcome back, ' + pName + '.', 'system');
    } else {
      addGameMessage('Welcome back, ' + pName + '. You last logged in ' + timeAgo(prevLastPlayed) + '.', 'system');
    }

    // Preload pet sprites from per-slot state
    var rpgPetsEntry = getRpgPetState();
    if (rpgPetsEntry.follower && rpgPetsEntry.owned[rpgPetsEntry.follower]) {
      loadFollowerSprite(rpgPetsEntry.follower);
    } else {
      followerSpriteSheet = null;
      followerPetId = null;
    }
    preloadAllStationedSprites();

    // Show game screen
    showScreen('rpg-game-screen');

    // Render world map in center
    renderWorldMap();

    // Check if player was inside a skill location or town on last session
    var resumeLocId = meta.slots[slot].insideLocation || null;
    var resumeTown = meta.slots[slot].insideTown || false;
    var resumeLoc = null;
    if (resumeLocId && MAP_LOCATIONS[resumeLocId] && MAP_LOCATIONS[resumeLocId].skill) {
      for (var li = 0; li < LOCATIONS.length; li++) {
        if (LOCATIONS[li].id === resumeLocId) { resumeLoc = LOCATIONS[li]; break; }
      }
    }

    if (resumeTown) {
      // Resume inside town
      showCenterContent('map');
      window.dispatchEvent(new Event('rpg-skills-init'));
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
    drawMap();

    mapAnimId = requestAnimationFrame(mapLoop);
  }

  // ── Player Movement ────────────────────────────
  function updatePlayer(dt) {
    if (!playerTarget) return;

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

    // Animate walk
    playerAnimTimer += dt;
    if (playerAnimTimer > 0.2) {
      playerAnimTimer = 0;
      playerFrame = playerFrame === 1 ? 2 : 1;
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
    drawLocationLabels(ctx);
    if (enterPromptVisible && playerAtLocation) {
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

    // Pass 1: Biome-aware base grass
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c, r);
        var biome = biomeIndexMap[r * cols + c] || 'grass';
        var pal = BIOME_PALETTES[biome] || BIOME_PALETTES.grass;
        ctx.fillStyle = pal.base[((h >>> 0) % 4)];
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }

    // Pass 2: Grass clumping (1-in-3 tiles get darker/lighter 4x4 clumps)
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 500, r + 500);
        if ((h >>> 0) % 3 !== 0) continue;
        var bright = ((h >>> 4) & 1) === 0;
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        var cx = c * TILE + ((h >>> 8) % 4);
        var cy = r * TILE + ((h >>> 12) % 4);
        ctx.fillRect(cx, cy, 4, 4);
      }
    }

    // Pass 3: Biome detail overlay
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 1000, r + 1000);
        if ((h >>> 0) % 5 !== 0) continue;
        var biome = biomeIndexMap[r * cols + c] || 'grass';
        var px = c * TILE + ((h >>> 4) % 6);
        var py = r * TILE + ((h >>> 8) % 6);
        if (biome === 'town') {
          // Cobblestone dots
          ctx.fillStyle = 'rgba(120,110,90,0.3)';
          ctx.fillRect(px, py, 3, 3);
          ctx.fillStyle = 'rgba(160,150,130,0.2)';
          ctx.fillRect(px + 1, py, 1, 1);
        } else if (biome === 'mine') {
          // Gravel
          ctx.fillStyle = 'rgba(100,100,100,0.25)';
          ctx.fillRect(px, py, 2, 2);
        } else if (biome === 'dock') {
          // Sand patches
          ctx.fillStyle = 'rgba(200,180,120,0.2)';
          ctx.fillRect(px, py, 3, 2);
        } else if (biome === 'forest') {
          // Moss
          ctx.fillStyle = 'rgba(30,80,20,0.2)';
          ctx.fillRect(px, py, 3, 3);
        } else if (biome === 'smithy') {
          // Soot
          ctx.fillStyle = 'rgba(60,50,40,0.15)';
          ctx.fillRect(px, py, 2, 2);
        } else if (biome === 'arena') {
          // Pebbles
          ctx.fillStyle = 'rgba(140,120,80,0.2)';
          ctx.fillRect(px, py, 2, 1);
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

    // Draw river from top to bottom
    for (var y = 0; y < MAP_H; y += 2) {
      var rx = getRiverX(y);

      // Sandy outer bank
      ctx.fillStyle = '#c8b478';
      ctx.fillRect(rx - riverWidth / 2 - bankWidth, y, riverWidth + bankWidth * 2, 2);

      // Pebble scatter on banks
      var h = tileHash(Math.floor(rx), y);
      if ((h >>> 0) % 8 === 0) {
        ctx.fillStyle = '#a09060';
        ctx.fillRect(rx - riverWidth / 2 - bankWidth + ((h >>> 4) % (bankWidth)), y, 2, 2);
      }
      if ((h >>> 8) % 8 === 0) {
        ctx.fillStyle = '#a09060';
        ctx.fillRect(rx + riverWidth / 2 + ((h >>> 12) % (bankWidth)), y, 2, 2);
      }

      // Deep water
      ctx.fillStyle = '#1e5080';
      ctx.fillRect(rx - riverWidth / 2, y, riverWidth, 2);

      // Mid blue
      ctx.fillStyle = '#2868a8';
      ctx.fillRect(rx - riverWidth / 2 + 6, y, riverWidth - 12, 2);

      // Light center
      ctx.fillStyle = '#3078b8';
      ctx.fillRect(rx - riverWidth / 2 + 12, y, riverWidth - 24, 2);
    }

    // Reeds along river at fixed positions
    var reedPositions = [
      { y: 50, side: 1 }, { y: 150, side: -1 }, { y: 280, side: 1 },
      { y: 380, side: -1 }, { y: 480, side: 1 }, { y: 580, side: -1 }
    ];
    for (var i = 0; i < reedPositions.length; i++) {
      var rp = reedPositions[i];
      var rx = getRiverX(rp.y) + rp.side * (riverWidth / 2 + 2);
      // 3-4 reed stalks
      var count = 3 + (tileHash(i, 200) % 2);
      for (var j = 0; j < count; j++) {
        ctx.fillStyle = '#2a5a20';
        ctx.fillRect(rx + j * 3 - 4, rp.y - 8 + j, 1, 10 - j);
        // Seed head
        ctx.fillStyle = '#5a4a30';
        ctx.fillRect(rx + j * 3 - 4, rp.y - 10 + j, 2, 3);
      }
    }

    // Lily pads
    var lilyPositions = [
      { y: 120 }, { y: 350 }, { y: 520 }
    ];
    for (var i = 0; i < lilyPositions.length; i++) {
      var lp = lilyPositions[i];
      var lx = getRiverX(lp.y) + ((tileHash(i, 300) % 10) - 5);
      // Green circle with V-notch
      ctx.fillStyle = '#3a8a30';
      ctx.beginPath();
      ctx.arc(lx, lp.y, 4, 0.3, Math.PI * 2 - 0.3);
      ctx.lineTo(lx, lp.y);
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#4aa040';
      ctx.fillRect(lx - 1, lp.y - 2, 2, 2);
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

    // Dock water ripples
    ctx.fillStyle = '#4898d0';
    var ripples = [
      [860, 220, 24], [900, 250, 20], [870, 275, 18],
      [930, 235, 22], [950, 260, 16], [880, 295, 20],
      [840, 240, 16], [920, 280, 18], [870, 310, 14], [950, 300, 20]
    ];
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var off = Math.sin(phase + i * 1.3) * 4;
      ctx.fillRect(r[0] + off, r[1], r[2], 2);
    }

    // Light reflections on dock water
    for (var i = 0; i < 5; i++) {
      var alpha = 0.08 + Math.sin(phase * 0.7 + i * 1.8) * 0.06;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      var lx = 850 + i * 35 + Math.sin(phase + i) * 8;
      var ly = 210 + (i % 3) * 30;
      ctx.fillRect(lx, ly, 6, 3);
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

    // Cobblestone near town + dirt texture along other paths
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.floor(len / 8);
      for (var j = 0; j < steps; j++) {
        var t = j / steps;
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        var h = tileHash(i * 100 + j, 9999);

        if (isNearTown(px, py)) {
          // Cobblestone — individual 3x3 stone rects
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
        } else {
          // Dirt pebbles
          var ox = ((h >>> 0) % 9) - 4;
          var oy = ((h >>> 8) % 9) - 4;
          ctx.fillStyle = '#8a6b3a';
          ctx.fillRect(px + ox, py + oy, 2, 2);
        }
      }
    }

    // Grass tufts along path edges
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.floor(len / 20);
      for (var j = 0; j < steps; j++) {
        var t = j / steps;
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        var h = tileHash(i * 200 + j, 7777);
        if ((h >>> 0) % 3 !== 0) continue;
        // Perpendicular offset
        var nx = -dy / len, ny = dx / len;
        var side = ((h >>> 4) & 1) ? 1 : -1;
        var gx = px + nx * side * 8;
        var gy = py + ny * side * 8;
        ctx.fillStyle = '#4a9442';
        ctx.fillRect(gx, gy, 1, 3);
        ctx.fillRect(gx + 1, gy - 1, 1, 3);
        ctx.fillRect(gx + 2, gy, 1, 2);
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
        // Draw bridge at this position
        var bw = 28, bh = 18;
        var bx = bpx - bw / 2, by = bpy - bh / 2;
        // Bridge planks
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
        // Plank lines
        ctx.fillStyle = '#5a3e1b';
        for (var p = 0; p < bh; p += 4) {
          ctx.fillRect(bx + 1, by + p, bw - 2, 1);
        }
        // Side rails
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillRect(bx, by + bh - 2, bw, 2);
        // Posts
        ctx.fillRect(bx, by - 3, 3, 5);
        ctx.fillRect(bx + bw - 3, by - 3, 3, 5);
        ctx.fillRect(bx, by + bh - 2, 3, 5);
        ctx.fillRect(bx + bw - 3, by + bh - 2, 3, 5);
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
        // Flower — multi-petal with color variant
        var flowerColors = ['#e84060','#e8a040','#d050d0','#40a0e8'];
        var fc = flowerColors[((h >>> 0) % 4)];
        ctx.fillStyle = fc;
        ctx.fillRect(dx, dy, 2, 2);
        ctx.fillRect(dx + 2, dy + 1, 2, 2);
        ctx.fillRect(dx, dy + 2, 2, 2);
        ctx.fillRect(dx - 1, dy + 1, 2, 2);
        ctx.fillStyle = '#f0e040';
        ctx.fillRect(dx + 1, dy + 1, 1, 1);
        ctx.fillStyle = '#2d6e28';
        ctx.fillRect(dx + 1, dy + 3, 1, 4);
        ctx.fillStyle = '#3a8030';
        ctx.fillRect(dx, dy + 5, 1, 1);
      } else if (type === 1) {
        // Rock — highlight + shadow + specular
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
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(dx + 1, dy + 7, 7, 2);
      } else if (type === 2) {
        // Bush with berry dots
        ctx.fillStyle = '#1e5e18';
        ctx.fillRect(dx, dy + 3, 10, 6);
        ctx.fillStyle = '#2d7a28';
        ctx.fillRect(dx + 1, dy + 1, 8, 6);
        ctx.fillStyle = '#3a9a34';
        ctx.fillRect(dx + 2, dy, 6, 5);
        ctx.fillStyle = '#4ab044';
        ctx.fillRect(dx + 3, dy + 1, 4, 3);
        // Berry dots
        if ((h & 1) === 0) {
          ctx.fillStyle = '#cc3030';
          ctx.fillRect(dx + 2, dy + 2, 1, 1);
          ctx.fillRect(dx + 6, dy + 3, 1, 1);
          ctx.fillRect(dx + 4, dy + 5, 1, 1);
        }
      } else if (type === 3) {
        // Tree (12x18px with trunk, crown, shadow)
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(dx - 1, dy + 16, 14, 3);
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx + 4, dy + 10, 4, 8);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx + 4, dy + 10, 2, 8);
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
      } else if (type === 4) {
        // Mushroom (4x5px)
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(dx + 1, dy + 3, 2, 3);
        ctx.fillStyle = '#d03030';
        ctx.fillRect(dx, dy + 1, 4, 2);
        ctx.fillRect(dx + 1, dy, 2, 1);
        // Spots
        ctx.fillStyle = '#f0e0c0';
        ctx.fillRect(dx + 1, dy + 1, 1, 1);
        ctx.fillRect(dx + 3, dy + 2, 1, 1);
      } else if (type === 5) {
        // Stump (6x4px)
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 2, 6, 3);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx + 1, dy, 4, 3);
        // Ring detail
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(dx + 2, dy + 1, 2, 1);
      } else if (type === 6) {
        // Signpost (4x10px)
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx + 1, dy + 3, 2, 8);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx - 1, dy, 6, 3);
        ctx.fillStyle = '#a08858';
        ctx.fillRect(dx, dy + 1, 4, 1);
      } else if (type === 7) {
        // Fence segment (12x6px)
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 1, 2, 6);
        ctx.fillRect(dx + 10, dy + 1, 2, 6);
        ctx.fillStyle = '#8b6e3b';
        ctx.fillRect(dx, dy + 2, 12, 2);
        ctx.fillRect(dx, dy + 5, 12, 1);
        ctx.fillStyle = '#a08858';
        ctx.fillRect(dx + 1, dy, 1, 2);
        ctx.fillRect(dx + 11, dy, 1, 2);
      } else if (type === 8) {
        // Tall grass — 3-4 blades with lighter tips
        var blades = 3 + ((h >>> 0) % 2);
        for (var b = 0; b < blades; b++) {
          var bx = dx + b * 3 - 2;
          var lean = ((h >>> (b * 2)) % 3) - 1;
          ctx.fillStyle = '#3a8a32';
          ctx.fillRect(bx + lean, dy, 1, 6);
          ctx.fillRect(bx, dy + 2, 1, 4);
          // Lighter tip
          ctx.fillStyle = '#5ab050';
          ctx.fillRect(bx + lean, dy, 1, 2);
        }
      } else if (type === 9) {
        // Boulder formation — 2-3 clustered rocks with 4-shade treatment
        var count = 2 + ((h >>> 0) % 2);
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
        // Lantern — post + glass housing (glow animated separately)
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(dx, dy + 4, 2, 8);
        // Post cap
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(dx - 1, dy + 2, 4, 3);
        // Glass housing
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(dx - 1, dy, 4, 3);
        ctx.fillStyle = '#f0d060';
        ctx.fillRect(dx, dy + 1, 2, 1);
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

      // Ground shadow ellipse
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(tx, ty + 32, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk with bark texture
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(tx - 3, ty + 14, 6, 18);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tx - 2, ty + 14, 4, 18);
      // Bark lines
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(tx - 2, ty + 17, 1, 3);
      ctx.fillRect(tx + 1, ty + 22, 1, 4);
      ctx.fillRect(tx - 1, ty + 26, 1, 3);

      // Large round canopy — 4 layers from dark outer to bright inner
      // Layer 4 (darkest, biggest)
      ctx.fillStyle = pal[0];
      ctx.beginPath();
      ctx.ellipse(tx, ty + 6, 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      // Layer 3
      ctx.fillStyle = pal[1];
      ctx.beginPath();
      ctx.ellipse(tx, ty + 5, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Layer 2
      ctx.fillStyle = pal[2];
      ctx.beginPath();
      ctx.ellipse(tx, ty + 4, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Layer 1 (brightest highlight)
      ctx.fillStyle = pal[3];
      ctx.beginPath();
      ctx.ellipse(tx - 2, ty + 2, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
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
      // Practice dummy (wooden T-shape)
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 14, oy + 14, 3, 16);
      ctx.fillRect(ox + 10, oy + 14, 10, 3);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 15, oy + 15, 1, 14);
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
        // Chimney smoke (8 particles)
        drawSmoke(ctx, ox + 42, oy - 12, smokeFrame, 0);
      } else if (id === 'mine') {
        // Two torches flanking cave entrance
        drawTorch(ctx, ox + 10, oy + 16, smokeFrame, 0);
        drawTorch(ctx, ox + 40, oy + 16, smokeFrame, 7);
      } else if (id === 'smithy') {
        // Chimney smoke
        drawSmoke(ctx, ox + 8, oy - 14, smokeFrame, 3);
        // Sparks from anvil
        drawSparks(ctx, ox + 55, oy + 22, smokeFrame);
      } else if (id === 'arena') {
        // Torches at gate + sconces
        drawTorch(ctx, ox + 18, oy - 2, smokeFrame, 5);
        drawTorch(ctx, ox + 35, oy - 2, smokeFrame, 9);
        drawTorch(ctx, ox + 3, oy + 14, smokeFrame, 11);
        drawTorch(ctx, ox + 51, oy + 14, smokeFrame, 13);
      }
    }
  }

  // ── Animation Helpers ───────────────────────────
  function drawSmoke(ctx, x, y, frame, seed) {
    var particles = 8;
    ctx.globalAlpha = 0.4;
    for (var i = 0; i < particles; i++) {
      var t = ((frame + seed * 17 + i * 10) % 80) / 80;
      var py = y - t * 24;
      var px = x + Math.sin(t * 4 + i) * 5;
      var a = 0.35 * (1 - t);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      // Color gradient dark→light grey
      var grey = Math.floor(100 + t * 80);
      ctx.fillStyle = 'rgb(' + grey + ',' + grey + ',' + grey + ')';
      var s = 2 + t * 3;
      ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawTorch(ctx, x, y, frame, seed) {
    // Base
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(x, y + 2, 2, 8);
    // 3-layer flame
    var flicker = ((frame + seed * 13) % 10);
    // Outer glow
    ctx.fillStyle = '#ff6020';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x - 4, y - 5, 10, 10);
    ctx.globalAlpha = 1;
    // Mid flame
    var midColors = ['#ff6020','#ffa040','#ff8030','#ffc040','#ff6020','#ff8030','#ffa040','#ff7020','#ffb050','#ff9030'];
    ctx.fillStyle = midColors[flicker];
    ctx.fillRect(x - 2, y - 3, 6, 6);
    // Bright core
    ctx.fillStyle = '#ffd060';
    ctx.fillRect(x - 1, y - 2, 4, 4);
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(x, y - 1, 2, 2);
    // Upward ember particles (2-3)
    for (var e = 0; e < 3; e++) {
      var et = ((frame + seed * 7 + e * 9) % 20) / 20;
      if (et > 0.6) continue;
      var ex = x + Math.sin(et * 5 + e) * 3;
      var ey = y - 6 - et * 10;
      ctx.globalAlpha = 0.6 * (1 - et);
      ctx.fillStyle = '#ffcc30';
      ctx.fillRect(ex, ey, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(ctx, x, y, frame) {
    var sparks = 8;
    for (var i = 0; i < sparks; i++) {
      var t = ((frame + i * 8) % 30) / 30;
      if (t > 0.8) continue;
      // Angular spread trajectories
      var angle = (i / sparks) * Math.PI + 0.3;
      var px = x + Math.cos(angle) * t * 12;
      var py = y - Math.sin(angle) * t * 16;
      ctx.globalAlpha = 0.9 * (1 - t);
      // White-hot spawn flash at start
      if (t < 0.1) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 2, 2);
      } else {
        var sparkColors = ['#ffcc30','#ffaa20','#ff8810','#ffdd50','#ffbb30','#ffcc40','#ff9920','#ffee60'];
        ctx.fillStyle = sparkColors[i];
        ctx.fillRect(px, py, 1, 1);
        // 1px trail
        ctx.globalAlpha *= 0.4;
        ctx.fillRect(px - Math.cos(angle) * 2, py + Math.sin(angle) * 2, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Animated Effects (butterflies, fireflies, forge glow, lanterns) ──
  function drawAnimatedEffects(ctx) {
    var t = smokeFrame * 0.04;

    // Butterflies (3, Lissajous flight)
    for (var i = 0; i < butterflies.length; i++) {
      var b = butterflies[i];
      var bx = b.x + Math.sin(t * 0.8 + b.phase) * 40;
      var by = b.y + Math.sin(t * 1.2 + b.phase * 1.5) * 25;
      // Wing flap
      var wingPhase = Math.sin(t * 6 + b.phase);
      var wingW = 2 + Math.abs(wingPhase) * 2;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(bx - wingW, by, wingW, 2);
      ctx.fillRect(bx + 1, by, wingW, 2);
      // Body
      ctx.fillStyle = '#1a1a1a';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(bx, by, 1, 3);
    }
    ctx.globalAlpha = 1;

    // Fireflies (5, sine-wave alpha fade)
    for (var i = 0; i < fireflies.length; i++) {
      var f = fireflies[i];
      var fx = f.x + Math.sin(t * 0.3 + f.phase) * 20;
      var fy = f.y + Math.cos(t * 0.4 + f.phase * 0.7) * 15;
      var alpha = 0.3 + Math.sin(t * 1.5 + f.phase * 2) * 0.3;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e0ff60';
      ctx.fillRect(fx, fy, 2, 2);
      // Glow
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(fx - 1, fy - 1, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Forge glow pulse (on smithy)
    var forgeAlpha = 0.1 + Math.sin(t * 1.5) * 0.1;
    ctx.fillStyle = '#ff6020';
    ctx.globalAlpha = forgeAlpha;
    var sx = MAP_LOCATIONS.smithy.x - 28;
    var sy = MAP_LOCATIONS.smithy.y - 32;
    ctx.fillRect(sx + 4, sy + 14, 16, 12);
    ctx.globalAlpha = 1;

    // Lantern flicker (per type-12 deco)
    for (var i = 0; i < MAP_DECO.length; i++) {
      var d = MAP_DECO[i];
      if (d[2] !== 12) continue;
      var la = 0.15 + Math.sin(t * 3 + i * 2.1) * 0.1;
      ctx.fillStyle = '#f0d060';
      ctx.globalAlpha = la;
      ctx.fillRect(d[0] - 3, d[1] - 2, 8, 6);
      ctx.globalAlpha = 1;
    }
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
    var frames = CHAR_FRAMES[playerDir];
    if (!frames) return;
    var frame = frames[playerFrame] || frames[0];

    var s = CHAR_SCALE;
    var ox = Math.round(playerPos.x) - 8 * s;
    var oy = Math.round(playerPos.y) - 12 * s;

    // Shadow ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(Math.round(playerPos.x), Math.round(playerPos.y) + 2 * s, 6 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    for (var i = 0; i < frame.length; i++) {
      var px = frame[i];
      var ci = parseInt(px[2], 16);
      ctx.fillStyle = CHAR_COLORS[ci];
      ctx.fillRect(ox + px[0] * s, oy + px[1] * s, s, s);
    }
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
    var py = playerPos.y - 36;
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
      var collectY = playerPos.y - 48 + 22 + 32; // must match draw: by + bh + 32
      if (Math.abs(cx - playerPos.x) < 100 && Math.abs(cy - collectY) < 14) {
        collectAtLocation(playerAtLocation);
        return;
      }
    }

    // Check enter prompt click
    if (enterPromptVisible && playerAtLocation) {
      var loc = MAP_LOCATIONS[playerAtLocation];
      var promptY = playerPos.y - 36;
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
    fadeTransition(function () {
      showCenterContent('skill');

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
        // Inject stationed pet sprite into game area after skills.js renders
        setTimeout(function () { renderStationedPetInGameArea(loc.id); }, 100);
      }, 50);
    });
  }

  function returnToMap() {
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
    });
  }

  // ── Save & Quit ───────────────────────────────
  function onSaveQuit() {
    stopMapLoop();
    stopTownMapLoop();
    closePetStoreModal();
    closePetPopup();

    // Clear pet sprite refs
    followerSpriteSheet = null;
    followerPetId = null;
    stationedSpriteSheets = {};

    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].lastPlayed = Date.now();
      meta.slots[activeSlot].insideTown = false;
    }
    insideTown = false;
    meta.currentSlot = -1;
    saveMeta();

    // Clean up skills if active
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
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
    drawTownMap();
    townAnimId = requestAnimationFrame(townMapLoop);
  }

  // ── Town Player Movement ──────────────────────
  function updateTownPlayer(dt) {
    if (!townPlayerTarget) return;

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

    // Animate
    townPlayerAnimTimer += dt;
    if (townPlayerAnimTimer > 0.2) {
      townPlayerAnimTimer = 0;
      townPlayerFrame = townPlayerFrame === 1 ? 2 : 1;
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
      var promptY = townPlayerPos.y - 36;
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

    if (loc.type === 'decorative') {
      // Fountain — just flavor text
      addGameMessage(TOWN_FLAVOR[locId] || loc.desc, 'system');
      return;
    }
    if (loc.type === 'petstore') {
      openPetStoreModal();
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
  }

  function drawTownGround(ctx) {
    // Warm dirt/cobblestone base
    var TILE = 8;
    var cols = Math.ceil(TOWN_W / TILE);
    var rows = Math.ceil(TOWN_H / TILE);
    var dirtColors = ['#c4a06a','#bfa068','#c8a870','#c0a064','#b89860','#caac72'];

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c + 1000, r + 1000);
        ctx.fillStyle = dirtColors[(h >>> 0) % dirtColors.length];
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        // Occasional detail pebble
        if ((h >>> 8) % 12 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(c * TILE + (h >>> 4) % 5, r * TILE + (h >>> 6) % 5, 2, 2);
        }
      }
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
      // Stone fill
      for (var sy = wy; sy < wy + wh; sy += 8) {
        for (var sx = wx; sx < wx + ww; sx += 12) {
          var h = tileHash(sx + 2000, sy + 2000);
          ctx.fillStyle = stoneColors[(h >>> 0) % stoneColors.length];
          ctx.fillRect(sx, sy, 12, 8);
          // Mortar lines
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(sx, sy + 7, 12, 1);
          ctx.fillRect(sx + 11, sy, 1, 8);
        }
      }
      // Darker edge
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      if (wi === 0) ctx.fillRect(wx, wy + wh - 2, ww, 2);
      if (wi === 1) ctx.fillRect(wx, wy, ww, 2);
      if (wi === 2) ctx.fillRect(wx + ww - 2, wy, 2, wh);
      if (wi === 3) ctx.fillRect(wx, wy, 2, wh);
    }

    // Crenellations on top wall
    for (var cx = W; cx < TOWN_W - W; cx += 24) {
      ctx.fillStyle = '#5a5a62';
      ctx.fillRect(cx, 0, 12, 6);
      ctx.fillStyle = '#707078';
      ctx.fillRect(cx + 1, 1, 10, 4);
    }

    // Corner towers (8 darker squares)
    var towerSize = 24;
    var corners = [[0,0],[TOWN_W - towerSize,0],[0,TOWN_H - towerSize],[TOWN_W - towerSize,TOWN_H - towerSize]];
    for (var ti = 0; ti < corners.length; ti++) {
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(corners[ti][0], corners[ti][1], towerSize, towerSize);
      ctx.fillStyle = '#5a5a62';
      ctx.fillRect(corners[ti][0] + 2, corners[ti][1] + 2, towerSize - 4, towerSize - 4);
      // Tower top
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(corners[ti][0], corners[ti][1], towerSize, 3);
      ctx.fillRect(corners[ti][0], corners[ti][1], 3, towerSize);
    }
  }

  function drawTownGate(ctx) {
    // South wall opening
    var gx = TOWN_W / 2 - 30;
    var gy = TOWN_H - TOWN_WALL;
    // Clear gate area
    ctx.fillStyle = '#c4a06a';
    ctx.fillRect(gx, gy, 60, TOWN_WALL);
    // Portcullis arch
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(gx - 4, gy, 4, TOWN_WALL);
    ctx.fillRect(gx + 60, gy, 4, TOWN_WALL);
    // Arch top
    ctx.beginPath();
    ctx.arc(gx + 30, gy + 4, 30, Math.PI, 0);
    ctx.fillStyle = '#4a4a52';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 30, gy + 4, 26, Math.PI, 0);
    ctx.fillStyle = '#c4a06a';
    ctx.fill();
    // Portcullis bars
    ctx.fillStyle = 'rgba(60,60,60,0.3)';
    for (var bi = 0; bi < 5; bi++) {
      ctx.fillRect(gx + 6 + bi * 12, gy, 1, TOWN_WALL);
    }
  }

  function drawTownPaths(ctx) {
    // Cobblestone paths connecting hotspots to center
    var pathColor = '#a89060';
    var pathDark = '#988050';
    var centerX = 530, centerY = 330;

    // Horizontal path through middle row
    ctx.fillStyle = pathColor;
    ctx.fillRect(TOWN_WALL, centerY - 12, TOWN_W - TOWN_WALL * 2, 24);
    // Vertical path from gate to center
    ctx.fillRect(centerX - 12, centerY, 24, TOWN_H - TOWN_WALL - centerY);
    // Vertical path from center to top row
    ctx.fillRect(centerX - 12, TOWN_WALL, 24, centerY - TOWN_WALL);

    // Cross paths to top-row buildings
    ctx.fillRect(TOWN_WALL, 140 - 12, TOWN_W - TOWN_WALL * 2, 24);
    // Cross path to bottom-row buildings
    ctx.fillRect(TOWN_WALL, 520 - 12, TOWN_W - TOWN_WALL * 2, 24);
    // Verticals to bottom row
    ctx.fillRect(centerX - 12, centerY, 24, 520 - centerY);

    // Cobblestone detail
    ctx.fillStyle = pathDark;
    var pathAreas = [
      [TOWN_WALL, centerY - 12, TOWN_W - TOWN_WALL * 2, 24],
      [centerX - 12, TOWN_WALL, 24, TOWN_H - TOWN_WALL * 2],
      [TOWN_WALL, 128, TOWN_W - TOWN_WALL * 2, 24],
      [TOWN_WALL, 508, TOWN_W - TOWN_WALL * 2, 24]
    ];
    for (var pi = 0; pi < pathAreas.length; pi++) {
      var pa = pathAreas[pi];
      for (var pj = 0; pj < 30; pj++) {
        var ph = tileHash(pj + 3000, pi + 3000);
        ctx.fillRect(pa[0] + (ph >>> 0) % pa[2], pa[1] + (ph >>> 8) % pa[3], 3, 2);
      }
    }
  }

  function drawTownBuilding(ctx, id, bx, by) {
    // Each building drawn as a ~60x50 pixel art sprite centered on (bx, by)
    var ox = bx - 30, oy = by - 25;

    switch (id) {
      case 'tavern':
        // Wooden walls with sign
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox, oy, 60, 50);
        ctx.fillStyle = '#7a5c30';
        ctx.fillRect(ox, oy, 60, 4); // roof
        ctx.fillStyle = '#5c3a1a';
        ctx.fillRect(ox - 4, oy - 8, 68, 12); // peaked roof
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(ox + 14, oy - 12, 32, 6); // roof peak
        // Door
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(ox + 22, oy + 32, 16, 18);
        // Windows
        ctx.fillStyle = '#ffd080';
        ctx.fillRect(ox + 6, oy + 14, 10, 10);
        ctx.fillRect(ox + 44, oy + 14, 10, 10);
        // Sign
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 48, oy + 6, 14, 10);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 50, oy + 8, 10, 6);
        // Chimney
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 50, oy - 18, 8, 12);
        // Barrel
        ctx.fillStyle = '#6b4e2b';
        ctx.fillRect(ox + 2, oy + 40, 10, 10);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 3, oy + 43, 8, 2);
        break;

      case 'store':
        // Awning and crates
        ctx.fillStyle = '#b89060';
        ctx.fillRect(ox, oy, 60, 50);
        // Striped awning
        for (var ai = 0; ai < 6; ai++) {
          ctx.fillStyle = ai % 2 === 0 ? '#cc4444' : '#ffffff';
          ctx.fillRect(ox + ai * 10, oy - 6, 10, 8);
        }
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 22, oy + 30, 16, 20);
        // Windows
        ctx.fillStyle = '#c8e0ff';
        ctx.fillRect(ox + 6, oy + 12, 12, 12);
        ctx.fillRect(ox + 42, oy + 12, 12, 12);
        // Window panes
        ctx.fillStyle = '#8a7050';
        ctx.fillRect(ox + 11, oy + 12, 2, 12);
        ctx.fillRect(ox + 47, oy + 12, 2, 12);
        // Crates
        ctx.fillStyle = '#a08050';
        ctx.fillRect(ox + 48, oy + 38, 12, 12);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 49, oy + 43, 10, 2);
        break;

      case 'bank':
        // Reinforced stone
        ctx.fillStyle = '#808088';
        ctx.fillRect(ox, oy, 60, 50);
        ctx.fillStyle = '#70707a';
        ctx.fillRect(ox, oy, 60, 6); // ledge
        // Iron door
        ctx.fillStyle = '#404048';
        ctx.fillRect(ox + 20, oy + 28, 20, 22);
        ctx.fillStyle = '#c0a040'; // gold handle
        ctx.fillRect(ox + 36, oy + 38, 3, 3);
        // Gold trim
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox, oy + 6, 60, 2);
        ctx.fillRect(ox, oy + 48, 60, 2);
        // Columns
        ctx.fillStyle = '#90909a';
        ctx.fillRect(ox + 4, oy + 8, 6, 40);
        ctx.fillRect(ox + 50, oy + 8, 6, 40);
        // $ sign
        ctx.fillStyle = '#c0a040';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$', bx, oy + 22);
        break;

      case 'casino':
        // Flashy facade
        ctx.fillStyle = '#8a2040';
        ctx.fillRect(ox, oy, 60, 50);
        ctx.fillStyle = '#b03050';
        ctx.fillRect(ox + 2, oy + 2, 56, 46);
        // Door
        ctx.fillStyle = '#4a1020';
        ctx.fillRect(ox + 20, oy + 30, 20, 20);
        // Card suits
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u2660', bx - 12, oy + 18);
        ctx.fillText('\u2665', bx, oy + 18);
        ctx.fillText('\u2666', bx + 12, oy + 18);
        // Sign border
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(ox, oy, 60, 2);
        ctx.fillRect(ox, oy + 48, 60, 2);
        break;

      case 'fountain':
        // 3-tier stone basin
        // Bottom pool
        ctx.fillStyle = '#6090c0';
        ctx.beginPath();
        ctx.ellipse(bx, by + 12, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pool rim
        ctx.fillStyle = '#909098';
        ctx.beginPath();
        ctx.ellipse(bx, by + 12, 28, 14, 0, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#909098';
        ctx.stroke();
        // Middle tier
        ctx.fillStyle = '#a0a0a8';
        ctx.fillRect(bx - 8, by - 4, 16, 16);
        // Top tier
        ctx.fillStyle = '#b0b0b8';
        ctx.fillRect(bx - 4, by - 14, 8, 12);
        // Top cap
        ctx.fillStyle = '#c0c0c8';
        ctx.fillRect(bx - 6, by - 16, 12, 4);
        break;

      case 'arcade':
        // Colorful building
        ctx.fillStyle = '#4060a0';
        ctx.fillRect(ox, oy, 60, 50);
        ctx.fillStyle = '#5070b0';
        ctx.fillRect(ox + 2, oy + 2, 56, 46);
        // GAMES sign
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(ox + 8, oy + 4, 44, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAMES', bx, oy + 14);
        // Door
        ctx.fillStyle = '#203060';
        ctx.fillRect(ox + 22, oy + 30, 16, 20);
        // Colored lights
        var arcadeColors = ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff'];
        for (var li = 0; li < 5; li++) {
          ctx.fillStyle = arcadeColors[li];
          ctx.fillRect(ox + 6 + li * 10, oy + 22, 6, 4);
        }
        break;

      case 'chapel':
        // Peaked roof with cross
        ctx.fillStyle = '#c8c0b0';
        ctx.fillRect(ox, oy + 8, 50, 42);
        // Peaked roof
        ctx.fillStyle = '#8b4040';
        ctx.fillRect(ox - 2, oy + 4, 54, 8);
        // Roof triangle
        ctx.fillStyle = '#7a3030';
        ctx.fillRect(ox + 8, oy, 34, 6);
        ctx.fillRect(ox + 14, oy - 4, 22, 6);
        // Cross
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 22, oy - 14, 6, 14);
        ctx.fillRect(ox + 18, oy - 10, 14, 4);
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 16, oy + 32, 18, 18);
        // Stained glass
        ctx.fillStyle = '#6080c0';
        ctx.fillRect(ox + 18, oy + 14, 14, 12);
        ctx.fillStyle = '#c06040';
        ctx.fillRect(ox + 22, oy + 14, 6, 12);
        // Bell tower
        ctx.fillStyle = '#b0a898';
        ctx.fillRect(ox + 40, oy - 6, 12, 20);
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 43, oy, 6, 6);
        break;

      case 'dungeon':
        // Iron portcullis with descending steps
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(ox, oy, 50, 50);
        ctx.fillStyle = '#3a3a42';
        ctx.fillRect(ox + 2, oy + 2, 46, 46);
        // Gate arch
        ctx.fillStyle = '#5a5a62';
        ctx.fillRect(ox + 10, oy + 14, 30, 36);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 14, oy + 18, 22, 32);
        // Portcullis bars
        ctx.fillStyle = '#606068';
        for (var bi = 0; bi < 4; bi++) {
          ctx.fillRect(ox + 16 + bi * 6, oy + 18, 2, 32);
        }
        // Descending steps
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(ox + 16, oy + 38, 18, 4);
        ctx.fillStyle = '#222228';
        ctx.fillRect(ox + 18, oy + 42, 14, 4);
        // Skull
        ctx.fillStyle = '#d0d0c0';
        ctx.fillRect(ox + 20, oy + 6, 10, 8);
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(ox + 22, oy + 8, 2, 2);
        ctx.fillRect(ox + 26, oy + 8, 2, 2);
        break;

      case 'library':
        // Tall arched windows
        ctx.fillStyle = '#b0a088';
        ctx.fillRect(ox, oy, 55, 50);
        ctx.fillStyle = '#a09078';
        ctx.fillRect(ox, oy, 55, 6); // top ledge
        // Arched windows
        ctx.fillStyle = '#c8e0ff';
        ctx.fillRect(ox + 6, oy + 10, 8, 20);
        ctx.fillRect(ox + 22, oy + 10, 8, 20);
        ctx.fillRect(ox + 38, oy + 10, 8, 20);
        // Window arches
        ctx.fillStyle = '#a09078';
        ctx.fillRect(ox + 6, oy + 8, 8, 3);
        ctx.fillRect(ox + 22, oy + 8, 8, 3);
        ctx.fillRect(ox + 38, oy + 8, 8, 3);
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 20, oy + 34, 14, 16);
        // Book motif on sign
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 44, oy + 10, 8, 10);
        ctx.fillStyle = '#8b6b3a';
        ctx.fillRect(ox + 46, oy + 12, 4, 6);
        break;

      case 'barracks':
        // Weapon rack and shield
        ctx.fillStyle = '#7a7a60';
        ctx.fillRect(ox, oy, 55, 50);
        ctx.fillStyle = '#6a6a50';
        ctx.fillRect(ox, oy, 55, 6); // roof
        // Door
        ctx.fillStyle = '#4a4a30';
        ctx.fillRect(ox + 18, oy + 30, 18, 20);
        // Shield emblem
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(ox + 22, oy + 8, 10, 12);
        ctx.fillStyle = '#8b2020';
        ctx.fillRect(ox + 24, oy + 10, 6, 8);
        // Weapon rack
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(ox + 44, oy + 12, 8, 30);
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(ox + 46, oy + 14, 2, 16); // sword blade
        ctx.fillRect(ox + 50, oy + 18, 2, 12); // spear shaft
        break;

      case 'petstore':
        // Egg display window, paw print sign
        ctx.fillStyle = '#c09060';
        ctx.fillRect(ox, oy, 60, 50);
        ctx.fillStyle = '#b08050';
        ctx.fillRect(ox, oy, 60, 6); // roof
        ctx.fillStyle = '#a07040';
        ctx.fillRect(ox - 2, oy - 4, 64, 8); // overhang
        // Egg display window
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(ox + 6, oy + 12, 20, 16);
        // Eggs in window
        ctx.fillStyle = '#ff9090';
        ctx.beginPath();
        ctx.ellipse(ox + 12, oy + 24, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#90c0ff';
        ctx.beginPath();
        ctx.ellipse(ox + 22, oy + 24, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Door
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 34, oy + 28, 16, 22);
        // Paw print sign
        ctx.fillStyle = '#ffd080';
        ctx.fillRect(ox + 34, oy + 8, 18, 14);
        // Paw print (simple)
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(ox + 40, oy + 14, 3, 3); // pad
        ctx.fillRect(ox + 38, oy + 11, 2, 2); // toe
        ctx.fillRect(ox + 42, oy + 11, 2, 2); // toe
        ctx.fillRect(ox + 44, oy + 13, 2, 2); // toe
        break;
    }
  }

  // ── Town Animated Parts ───────────────────────
  function drawTownAnimatedParts(ctx) {
    // Fountain water particles
    var ft = TOWN_LOCATIONS.fountain;
    var t = townSmokeFrame * 0.05;
    ctx.globalAlpha = 0.6;
    for (var i = 0; i < 12; i++) {
      var angle = (i / 12) * Math.PI * 2 + t;
      var r = 6 + Math.sin(t * 2 + i) * 2;
      var fy = ft.y - 10 - Math.abs(Math.sin(angle + t)) * 12;
      var fx = ft.x + Math.cos(angle) * r;
      var splash = Math.sin(townSmokeFrame * 0.1 + i) * 0.3 + 0.4;
      ctx.globalAlpha = splash;
      ctx.fillStyle = '#80c0ff';
      ctx.fillRect(fx, fy, 2, 2);
    }
    // Splash ring
    ctx.globalAlpha = 0.2 + Math.sin(t * 3) * 0.1;
    ctx.strokeStyle = '#80c0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ft.x, ft.y + 12, 24 + Math.sin(t * 2) * 2, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Chimney smoke on tavern
    drawSmoke(ctx, TOWN_LOCATIONS.tavern.x + 20, TOWN_LOCATIONS.tavern.y - 40, townSmokeFrame, 100);

    // Torches on dungeon gate
    drawTorch(ctx, TOWN_LOCATIONS.dungeon.x - 28, TOWN_LOCATIONS.dungeon.y - 10, townSmokeFrame, 200);
    drawTorch(ctx, TOWN_LOCATIONS.dungeon.x + 22, TOWN_LOCATIONS.dungeon.y - 10, townSmokeFrame, 201);

    // Torches on barracks
    drawTorch(ctx, TOWN_LOCATIONS.barracks.x - 24, TOWN_LOCATIONS.barracks.y, townSmokeFrame, 210);

    // Lantern flicker on casino
    var casinoLoc = TOWN_LOCATIONS.casino;
    var flicker = 0.5 + Math.sin(townSmokeFrame * 0.15) * 0.3;
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = flicker;
    ctx.fillRect(casinoLoc.x - 28, casinoLoc.y - 20, 56, 3);
    ctx.globalAlpha = 1;

    // Arcade light animation
    var arcadeLoc = TOWN_LOCATIONS.arcade;
    var aColors = ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff'];
    for (var ai = 0; ai < 5; ai++) {
      var ci = (ai + Math.floor(townSmokeFrame / 8)) % 5;
      ctx.fillStyle = aColors[ci];
      ctx.globalAlpha = 0.6 + Math.sin(townSmokeFrame * 0.2 + ai) * 0.3;
      ctx.fillRect(arcadeLoc.x - 24 + ai * 10, arcadeLoc.y - 3, 6, 4);
    }
    ctx.globalAlpha = 1;
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
    var py = townPlayerPos.y - 36;
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
    var frames = CHAR_FRAMES[townPlayerDir];
    if (!frames) return;
    var frame = frames[townPlayerFrame] || frames[0];

    var s = CHAR_SCALE;
    var ox = Math.round(townPlayerPos.x) - 8 * s;
    var oy = Math.round(townPlayerPos.y) - 12 * s;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(Math.round(townPlayerPos.x), Math.round(townPlayerPos.y) + 2 * s, 6 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    for (var i = 0; i < frame.length; i++) {
      var px = frame[i];
      var ci = parseInt(px[2], 16);
      ctx.fillStyle = CHAR_COLORS[ci];
      ctx.fillRect(ox + px[0] * s, oy + px[1] * s, s, s);
    }
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
    renderPetStoreContents();
  }

  function closePetStoreModal() {
    petStoreModalOpen = false;
    var overlay = document.getElementById('rpg-petstore-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function renderPetStoreContents() {
    var rpgPets = getRpgPetState();

    // Balance
    var balEl = document.getElementById('rpg-petstore-balance');
    if (balEl) {
      var coins = window.Wallet ? window.Wallet.getBalance() : 0;
      var jb = window.JackBucks ? window.JackBucks.getBalance() : 0;
      balEl.textContent = coins + ' Coins | ' + jb + ' JB';
    }

    // Egg cards
    var eggsEl = document.getElementById('rpg-petstore-eggs');
    if (eggsEl && petCatalog && petCatalog.eggs) {
      eggsEl.innerHTML = '';
      var tiers = [
        { key: 'common',    label: 'Common Egg',    color: '#88aa66' },
        { key: 'rare',      label: 'Rare Egg',      color: '#6688cc' }
      ];
      for (var ti = 0; ti < tiers.length; ti++) {
        var t = tiers[ti];
        var eggDef = petCatalog.eggs[t.key];
        if (!eggDef) continue;
        var card = document.createElement('div');
        card.className = 'rpg-egg-card';
        card.style.borderColor = t.color;

        var eggIcon = document.createElement('div');
        eggIcon.className = 'rpg-egg-icon';
        eggIcon.style.background = t.color;
        eggIcon.textContent = t.key === 'legendary' ? '\u2728' : t.key === 'rare' ? '\u2b50' : '\ud83e\udd5a';
        card.appendChild(eggIcon);

        var label = document.createElement('div');
        label.className = 'rpg-egg-label';
        label.textContent = t.label;
        card.appendChild(label);

        var cost = document.createElement('div');
        cost.className = 'rpg-egg-cost';
        cost.textContent = eggDef.cost + (eggDef.currency === 'jb' ? ' JB' : ' Coins');
        card.appendChild(cost);

        // Pool from RPG creatures only (excludes cat/dragon/golem)
        var pool = getRpgCreaturesByTier(t.key);
        var ownedCount = 0;
        for (var pi = 0; pi < pool.length; pi++) {
          if (rpgPets.owned[pool[pi]]) ownedCount++;
        }
        var poolInfo = document.createElement('div');
        poolInfo.className = 'rpg-egg-pool';
        poolInfo.textContent = ownedCount + '/' + pool.length + ' owned';
        card.appendChild(poolInfo);

        // Pity counter from per-slot state
        var pityCount = rpgPets.pity[t.key] || 0;
        var pityThreshold = t.key === 'legendary' ? 5 : t.key === 'rare' ? 8 : 6;
        if (pityCount > 0 && ownedCount < pool.length) {
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

        var canAfford = eggDef.currency === 'jb'
          ? (window.JackBucks && window.JackBucks.getBalance() >= eggDef.cost)
          : (window.Wallet && window.Wallet.getBalance() >= eggDef.cost);
        var hatchBtn = document.createElement('button');
        hatchBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
        hatchBtn.textContent = 'Hatch';
        hatchBtn.disabled = !canAfford;
        if (!canAfford) hatchBtn.classList.add('rpg-btn-disabled');
        hatchBtn.setAttribute('data-tier', t.key);
        hatchBtn.addEventListener('click', function () {
          var tier = this.getAttribute('data-tier');
          rpgHatchEgg(tier);
        });
        card.appendChild(hatchBtn);

        eggsEl.appendChild(card);
      }
    }

    // Collection grid
    renderPetStoreCollection(rpgPets);
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
        var preview = renderRpgPetSprite(id, level, 36);
        if (preview) cell.appendChild(preview);
      }

      var nameEl = document.createElement('div');
      nameEl.className = 'rpg-petstore-pet-name';
      nameEl.textContent = owned ? creature.name : '???';
      cell.appendChild(nameEl);

      if (owned) {
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
      }

      collEl.appendChild(cell);
    }
  }

  function rpgHatchEgg(tier) {
    if (!petCatalog) return;
    var eggDef = petCatalog.eggs[tier];
    if (!eggDef) return;

    // Check currency
    if (eggDef.currency === 'jb') {
      if (!window.JackBucks || window.JackBucks.getBalance() < eggDef.cost) return;
    } else {
      if (!window.Wallet || window.Wallet.getBalance() < eggDef.cost) return;
    }

    // Use RPG creature pool (excludes cat/dragon/golem)
    var pool = getRpgCreaturesByTier(tier);
    if (pool.length === 0) return;

    var rpgPets = getRpgPetState();

    // Pity system from per-slot state
    var pityThreshold = tier === 'legendary' ? 5 : tier === 'rare' ? 8 : 6;
    var forceNew = (rpgPets.pity[tier] || 0) >= pityThreshold;

    // Roll creature
    var rolled;
    if (forceNew) {
      var unowned = [];
      for (var i = 0; i < pool.length; i++) {
        if (!rpgPets.owned[pool[i]]) unowned.push(pool[i]);
      }
      rolled = unowned.length > 0
        ? unowned[Math.floor(Math.random() * unowned.length)]
        : pool[Math.floor(Math.random() * pool.length)];
    } else {
      rolled = pool[Math.floor(Math.random() * pool.length)];
    }

    // Deduct currency
    if (eggDef.currency === 'jb') {
      window.JackBucks.deduct(eggDef.cost);
    } else {
      window.Wallet.deduct(eggDef.cost);
    }

    var isDuplicate = !!rpgPets.owned[rolled];
    var mergeXP = eggDef.dupMergeXP || 0;

    if (isDuplicate) {
      // Duplicate: add XP to existing pet
      rpgPets.owned[rolled].xp = (rpgPets.owned[rolled].xp || 0) + mergeXP;
      // Check level up
      var needed = rpgPetXpForLevel(rpgPets.owned[rolled].level);
      if (rpgPets.owned[rolled].xp >= needed) {
        var maxLv = petCatalog.creatures[rolled] ? petCatalog.creatures[rolled].maxLevel : 3;
        if (rpgPets.owned[rolled].level < maxLv) {
          rpgPets.owned[rolled].level++;
          rpgPets.owned[rolled].xp -= needed;
        }
      }
      rpgPets.pity[tier] = (rpgPets.pity[tier] || 0) + 1;
    } else {
      rpgPets.owned[rolled] = { level: 1, xp: 0, skin: RPG_PET_DEFAULT_SKIN };
      rpgPets.pity[tier] = 0;
    }

    rpgPets.totalHatched = (rpgPets.totalHatched || 0) + 1;
    saveRpgPetState(rpgPets);

    // Show result
    var resultEl = document.getElementById('rpg-petstore-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '';

      var creature = petCatalog.creatures[rolled];
      var preview = renderRpgPetSprite(rolled, rpgPets.owned[rolled].level, 64);
      if (preview) {
        preview.className = 'rpg-petstore-result-sprite';
        resultEl.appendChild(preview);
      }

      var nameEl = document.createElement('div');
      nameEl.className = 'rpg-petstore-result-name';
      nameEl.textContent = creature ? creature.name : rolled;
      resultEl.appendChild(nameEl);

      var tagEl = document.createElement('div');
      tagEl.className = 'rpg-petstore-result-tag';
      tagEl.textContent = isDuplicate ? 'Duplicate! (+' + mergeXP + ' XP)' : 'New creature!';
      tagEl.style.color = isDuplicate ? 'color-mix(in srgb, var(--foreground) 60%, transparent)' : 'var(--accent)';
      resultEl.appendChild(tagEl);
    }

    addGameMessage(isDuplicate
      ? 'The egg hatches... another ' + (petCatalog.creatures[rolled] ? petCatalog.creatures[rolled].name : rolled) + '. (+' + mergeXP + ' merge XP)'
      : 'The egg hatches! A ' + (petCatalog.creatures[rolled] ? petCatalog.creatures[rolled].name : rolled) + ' emerges!',
      'system');

    // Re-render modal + pet tab
    renderPetStoreContents();
    renderPetTab();
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
      var fName = document.createElement('div');
      fName.className = 'rpg-pet-follower-name';
      fName.textContent = petCatalog.creatures[rpgPets.follower] ? petCatalog.creatures[rpgPets.follower].name : rpgPets.follower;
      followerSlot.appendChild(fName);
      var fSprite = renderRpgPetSprite(rpgPets.follower, rpgPets.owned[rpgPets.follower].level, 28);
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
    var maxLv = creature.maxLevel || 3;
    if (petData.level < maxLv) {
      var needed = rpgPetXpForLevel(petData.level);
      var xpInfo = document.createElement('div');
      xpInfo.style.cssText = 'font-size:0.75em;color:color-mix(in srgb,var(--foreground) 45%,transparent);margin-bottom:6px';
      xpInfo.textContent = 'XP: ' + (petData.xp || 0) + '/' + needed;
      popup.appendChild(xpInfo);
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

    // Escape: close pet popup → close pet store modal → exit town → return to map
    if (e.key === 'Escape') {
      if (activePetPopup) { closePetPopup(); return; }
      if (petStoreModalOpen) { closePetStoreModal(); return; }
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
