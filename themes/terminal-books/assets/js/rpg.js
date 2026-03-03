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
  var MAP_DECO = [
    // Flowers (scattered)
    [60,75,0],[700,135,0],[455,375,0],[730,255,0],[940,600,0],
    [320,500,0],[800,120,0],[120,570,0],[610,490,0],[380,210,0],
    // Rocks (near mine, scattered)
    [100,310,1],[85,200,1],[230,220,1],[75,375,1],[760,345,1],
    [950,520,1],[350,580,1],[640,130,1],
    // Bushes (scattered, some along paths)
    [270,120,2],[800,135,2],[530,380,2],[250,510,2],[680,570,2],
    [430,80,2],[960,350,2],[100,450,2],
    // Trees (clustered near forest, some scattered)
    [80,420,3],[120,480,3],[200,500,3],[240,420,3],[60,520,3],
    [320,580,3],[900,100,3],[700,580,3],[50,150,3],[980,480,3],
    // Mushrooms (near forest/damp areas)
    [190,460,4],[150,510,4],[280,470,4],[350,540,4],
    // Stumps (near forest)
    [220,440,5],[300,490,5],
    // Signposts (at path intersections)
    [430,180,6],[630,180,6],
    // Fences (near arena/town)
    [460,520,7],[600,520,7],[470,105,7],[590,105,7]
  ];

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
    // Auto-switch to Game tab only when on the map
    if (centerMode === 'map') {
      switchChatTab('game');
    }
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
      lastPlayed: now
    };
    meta.currentSlot = createTargetSlot;
    saveMeta();

    enterGame(createTargetSlot);
  }

  function onCreateBack() {
    showScreen('rpg-menu-screen');
    renderMenuScreen();
  }

  // ── OSRS Bottom Bar (chatbox with panel tabs) ─
  function setupOsrsPanel() {
    var chatbox = $('osrs-chatbox');
    if (!chatbox) return;

    if (osrsPanelSetUp) {
      chatbox.style.display = '';
      return;
    }

    // Move DOM nodes from hidden panels into chatbox panes
    var skillsPane = $('osrs-chat-skills');
    var invPane = $('osrs-chat-inventory');
    var charPane = $('osrs-chat-character');
    var milestonesPane = $('osrs-chat-milestones');

    // Skills pane: skill list (display-only in RPG mode)
    var skillsList = $('skills-list');
    if (skillsList && skillsPane) {
      skillsPane.appendChild(skillsList);
      var selectedRows = skillsList.querySelectorAll('.skill-row.selected');
      for (var i = 0; i < selectedRows.length; i++) {
        selectedRows[i].classList.remove('selected');
      }
    }

    // Inventory pane
    var invPanel = $('skills-inv-panel');
    if (invPanel && invPane) invPane.appendChild(invPanel);

    // Character pane: char info, pet assignment, idle status
    var charInfo = $('rpg-char-info');
    if (charInfo && charPane) charPane.appendChild(charInfo);
    var petSlot = $('skills-pet-slot');
    if (petSlot && charPane) charPane.appendChild(petSlot);
    var idleStatus = $('skills-idle-status');
    if (idleStatus && charPane) charPane.appendChild(idleStatus);

    // Milestones pane
    var milestones = $('skills-milestones');
    if (milestones && milestonesPane) milestonesPane.appendChild(milestones);

    // Game pane: move game log
    var gamePane = $('osrs-chat-game');
    var gameLog = $('skills-game-log');
    if (gamePane && gameLog) gamePane.appendChild(gameLog);

    // Move chatbox into skills-game-panel so it matches the play area width
    var gamePanel = $('skills-game-panel');
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

    // Show chatbox, default to game tab
    chatbox.style.display = '';
    switchChatTab('game');
    osrsPanelSetUp = true;
  }

  function switchChatTab(tabId) {
    var chatbox = $('osrs-chatbox');
    if (!chatbox) return;
    // Update all tab buttons (text tabs + icon tabs)
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

    // Show game screen
    showScreen('rpg-game-screen');

    // Render world map in center
    renderWorldMap();
    showCenterContent('map');

    // (Re-)initialize skills.js with the new slot's storage key
    window.dispatchEvent(new Event('rpg-skills-init'));
  }

  // ── Topbar ────────────────────────────────────
  function updateTopbar() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    var slot = meta.slots[activeSlot];
    var nameEl = $('rpg-game-topbar-name');
    var lvlEl = $('rpg-game-topbar-level');
    if (nameEl) nameEl.textContent = slot.name;
    if (lvlEl) lvlEl.textContent = 'Total Lv: ' + getTotalLevel(activeSlot);
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
    drawPaths(ctx);
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
    drawAnimatedLocationParts(ctx);
    drawPlayer(ctx);
    drawLocationLabels(ctx);
    if (enterPromptVisible && playerAtLocation) {
      drawEnterPrompt(ctx);
    }
    // Redraw border on top of everything
    drawMapBorder(ctx);

    ctx.restore();
  }

  // ── Terrain ─────────────────────────────────────
  function drawTerrain(ctx) {
    var TILE = 8;
    var greens = ['#3a7a32', '#428a3a', '#4a9442', '#509e48'];
    var cols = Math.ceil(MAP_W / TILE);
    var rows = Math.ceil(MAP_H / TILE);

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var h = tileHash(c, r);
        ctx.fillStyle = greens[((h >>> 0) % 4)];
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }

    // Checkerboard dither overlay
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if ((c + r) % 2 === 0) {
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
    }

    // Edge darkening (cliff border feel)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, MAP_W, 6);
    ctx.fillRect(0, MAP_H - 6, MAP_W, 6);
    ctx.fillRect(0, 0, 6, MAP_H);
    ctx.fillRect(MAP_W - 6, 0, 6, MAP_H);

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

  // ── Animated Water Ripples ──────────────────────
  function drawAnimatedWater(ctx) {
    var phase = smokeFrame * 0.03;
    ctx.fillStyle = '#4898d0';
    var ripples = [
      [860, 220, 24], [900, 250, 20], [870, 275, 18],
      [930, 235, 22], [950, 260, 16], [880, 295, 20]
    ];
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var off = Math.sin(phase + i * 1.3) * 4;
      ctx.fillRect(r[0] + off, r[1], r[2], 2);
    }
  }

  // ── Paths ───────────────────────────────────────
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
    // Dirt texture dots along paths
    ctx.fillStyle = '#8a6b3a';
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]], b = MAP_LOCATIONS[seg[1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.floor(len / 12);
      for (var j = 0; j < steps; j++) {
        var t = j / steps;
        var h = tileHash(i * 100 + j, 9999);
        var ox = ((h >>> 0) % 9) - 4;
        var oy = ((h >>> 8) % 9) - 4;
        ctx.fillRect(a.x + dx * t + ox, a.y + dy * t + oy, 2, 2);
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
    var ox = x - 16, oy = y - 24;
    if (id === 'town') {
      // ── Town Hub — Multi-story building ───
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox - 2, oy + 36, 38, 4);
      // Walls
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox, oy + 12, 32, 24);
      ctx.fillStyle = '#a08858';
      ctx.fillRect(ox + 2, oy + 14, 28, 20);
      // Roof with ridge
      ctx.fillStyle = '#b03020';
      ctx.fillRect(ox - 3, oy + 6, 38, 8);
      ctx.fillStyle = '#c44030';
      ctx.fillRect(ox - 1, oy + 4, 34, 6);
      ctx.fillStyle = '#d04838';
      ctx.fillRect(ox + 2, oy + 2, 28, 4);
      ctx.fillStyle = '#e05848';
      ctx.fillRect(ox + 6, oy, 20, 3);
      // Ridge line
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 8, oy, 16, 1);
      // Upper windows (two with panes)
      ctx.fillStyle = '#3868a0';
      ctx.fillRect(ox + 5, oy + 16, 8, 6);
      ctx.fillRect(ox + 19, oy + 16, 8, 6);
      ctx.fillStyle = '#4888c8';
      ctx.fillRect(ox + 6, oy + 17, 3, 2);
      ctx.fillRect(ox + 20, oy + 17, 3, 2);
      // Window pane cross
      ctx.fillStyle = '#6b5030';
      ctx.fillRect(ox + 9, oy + 16, 1, 6);
      ctx.fillRect(ox + 5, oy + 19, 8, 1);
      ctx.fillRect(ox + 23, oy + 16, 1, 6);
      ctx.fillRect(ox + 19, oy + 19, 8, 1);
      // Lower window
      ctx.fillStyle = '#3868a0';
      ctx.fillRect(ox + 5, oy + 26, 8, 5);
      ctx.fillStyle = '#6b5030';
      ctx.fillRect(ox + 9, oy + 26, 1, 5);
      ctx.fillRect(ox + 5, oy + 28, 8, 1);
      // Door
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 19, oy + 26, 8, 10);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 20, oy + 27, 6, 8);
      // Door knob
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 24, oy + 31, 1, 1);
      // Chimney
      ctx.fillStyle = '#706050';
      ctx.fillRect(ox + 24, oy - 6, 5, 8);
      ctx.fillStyle = '#887868';
      ctx.fillRect(ox + 25, oy - 7, 3, 2);
      // Flag pole
      ctx.fillStyle = '#a08858';
      ctx.fillRect(ox - 1, oy - 4, 2, 14);
      ctx.fillStyle = '#c04040';
      ctx.fillRect(ox + 1, oy - 4, 6, 4);
      ctx.fillStyle = '#d05050';
      ctx.fillRect(ox + 1, oy - 3, 5, 2);
    } else if (id === 'mine') {
      // ── Mining Camp — Rocky mountain + cave ───
      // Mountain backdrop
      ctx.fillStyle = '#585858';
      ctx.fillRect(ox, oy + 8, 32, 28);
      ctx.fillStyle = '#686868';
      ctx.fillRect(ox + 2, oy + 4, 28, 8);
      ctx.fillStyle = '#787878';
      ctx.fillRect(ox + 4, oy + 2, 24, 6);
      ctx.fillStyle = '#888888';
      ctx.fillRect(ox + 8, oy, 16, 4);
      ctx.fillStyle = '#989898';
      ctx.fillRect(ox + 10, oy - 2, 12, 4);
      // Mountain highlight
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 12, oy - 2, 4, 2);
      // Cave entrance (dark)
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(ox + 8, oy + 14, 16, 22);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 6, oy + 18, 20, 18);
      // Cave arch
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 6, oy + 12, 20, 4);
      ctx.fillRect(ox + 8, oy + 10, 16, 4);
      // Wooden support beams
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 7, oy + 14, 3, 22);
      ctx.fillRect(ox + 22, oy + 14, 3, 22);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 8, oy + 13, 16, 2);
      // Cart tracks
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(ox + 10, oy + 34, 12, 2);
      ctx.fillRect(ox + 12, oy + 32, 8, 2);
      // Pickaxe leaning
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 28, oy + 10, 2, 14);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 26, oy + 8, 6, 3);
      ctx.fillStyle = '#b8b8b8';
      ctx.fillRect(ox + 27, oy + 8, 4, 2);
    } else if (id === 'dock') {
      // ── Fishing Dock — Pier with posts, barrel, boat ───
      // Pier planks
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 4, oy + 10, 40, 20);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox - 2, oy + 12, 36, 16);
      // Plank lines
      ctx.fillStyle = '#5a3e1b';
      ctx.fillRect(ox - 2, oy + 16, 36, 1);
      ctx.fillRect(ox - 2, oy + 21, 36, 1);
      ctx.fillRect(ox - 2, oy + 26, 36, 1);
      // 3 vertical posts
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox, oy + 6, 4, 30);
      ctx.fillRect(ox + 14, oy + 6, 4, 30);
      ctx.fillRect(ox + 28, oy + 6, 4, 30);
      // Post tops
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 1, oy + 4, 6, 3);
      ctx.fillRect(ox + 13, oy + 4, 6, 3);
      ctx.fillRect(ox + 27, oy + 4, 6, 3);
      // Barrel
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 5, oy + 12, 6, 7);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 6, oy + 13, 4, 5);
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 5, oy + 14, 6, 1);
      ctx.fillRect(ox + 5, oy + 17, 6, 1);
      // Rope coil
      ctx.fillStyle = '#c8b478';
      ctx.fillRect(ox + 20, oy + 14, 4, 3);
      ctx.fillStyle = '#a89458';
      ctx.fillRect(ox + 21, oy + 15, 2, 1);
      // Fishing rod
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 30, oy - 4, 2, 18);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 30, oy - 5, 2, 2);
      // Line
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(ox + 32, oy - 4, 1, 1);
      ctx.fillRect(ox + 33, oy - 3, 1, 4);
      ctx.fillRect(ox + 34, oy + 1, 1, 6);
      // Rowboat alongside
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox - 8, oy + 28, 14, 6);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox - 6, oy + 29, 10, 4);
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 4, oy + 30, 6, 2);
    } else if (id === 'forest') {
      // ── Lumber Forest — Two large trees, axe, stump, log pile ───
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(ox - 4, oy + 34, 42, 4);
      // Left tree — trunk
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 2, oy + 16, 5, 20);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 3, oy + 16, 3, 20);
      // Left tree — crown
      ctx.fillStyle = '#1e5e18';
      ctx.fillRect(ox - 4, oy + 4, 16, 14);
      ctx.fillStyle = '#2d7a28';
      ctx.fillRect(ox - 2, oy + 2, 12, 12);
      ctx.fillStyle = '#3a9a34';
      ctx.fillRect(ox, oy, 8, 8);
      ctx.fillStyle = '#4ab044';
      ctx.fillRect(ox + 1, oy + 1, 6, 5);
      ctx.fillStyle = '#58c050';
      ctx.fillRect(ox + 2, oy + 2, 4, 3);
      // Right tree — trunk
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 24, oy + 14, 5, 22);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 25, oy + 14, 3, 22);
      // Right tree — crown
      ctx.fillStyle = '#1e5e18';
      ctx.fillRect(ox + 18, oy + 2, 16, 14);
      ctx.fillStyle = '#2d7a28';
      ctx.fillRect(ox + 20, oy, 12, 12);
      ctx.fillStyle = '#3a9a34';
      ctx.fillRect(ox + 22, oy - 2, 8, 8);
      ctx.fillStyle = '#4ab044';
      ctx.fillRect(ox + 23, oy - 1, 6, 5);
      // Axe embedded in right tree
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 29, oy + 18, 2, 8);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 30, oy + 16, 4, 4);
      ctx.fillStyle = '#b8b8b8';
      ctx.fillRect(ox + 31, oy + 17, 2, 2);
      // Stump
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 12, oy + 30, 7, 6);
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 13, oy + 28, 5, 4);
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(ox + 14, oy + 29, 3, 2);
      // Log pile with visible rings
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 10, oy + 36, 10, 4);
      ctx.fillRect(ox + 12, oy + 34, 8, 4);
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(ox + 11, oy + 37, 2, 2);
      ctx.fillRect(ox + 16, oy + 37, 2, 2);
      ctx.fillRect(ox + 13, oy + 35, 2, 2);
    } else if (id === 'smithy') {
      // ── Smithy — Stone building, forge, anvil ───
      // Warm glow aura
      ctx.fillStyle = '#ff8030';
      ctx.globalAlpha = 0.15;
      ctx.fillRect(ox - 6, oy - 6, 44, 48);
      ctx.globalAlpha = 1;
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox - 2, oy + 34, 38, 4);
      // Stone walls
      ctx.fillStyle = '#585858';
      ctx.fillRect(ox, oy + 10, 32, 26);
      ctx.fillStyle = '#686868';
      ctx.fillRect(ox + 2, oy + 12, 28, 22);
      // Stone texture
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 4, oy + 14, 8, 4);
      ctx.fillRect(ox + 16, oy + 20, 10, 4);
      ctx.fillRect(ox + 4, oy + 26, 10, 4);
      // Dark roof
      ctx.fillStyle = '#404040';
      ctx.fillRect(ox - 2, oy + 6, 36, 6);
      ctx.fillStyle = '#484848';
      ctx.fillRect(ox, oy + 4, 32, 4);
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 4, oy + 2, 24, 4);
      // Chimney
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 4, oy - 8, 6, 12);
      ctx.fillStyle = '#606060';
      ctx.fillRect(ox + 5, oy - 9, 4, 2);
      // Glowing forge window
      ctx.fillStyle = '#ff6020';
      ctx.fillRect(ox + 5, oy + 14, 8, 6);
      ctx.fillStyle = '#ff8040';
      ctx.fillRect(ox + 6, oy + 15, 6, 4);
      ctx.fillStyle = '#ffa060';
      ctx.fillRect(ox + 7, oy + 16, 4, 2);
      // Door
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 20, oy + 24, 8, 12);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ox + 21, oy + 25, 6, 10);
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(ox + 25, oy + 29, 1, 1);
      // Outdoor anvil
      ctx.fillStyle = '#404040';
      ctx.fillRect(ox + 34, oy + 26, 8, 6);
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 32, oy + 24, 12, 3);
      ctx.fillStyle = '#606060';
      ctx.fillRect(ox + 35, oy + 22, 6, 3);
      ctx.fillStyle = '#505050';
      ctx.fillRect(ox + 36, oy + 32, 3, 4);
      ctx.fillRect(ox + 40, oy + 32, 3, 4);
    } else if (id === 'arena') {
      // ── Training Arena — Fenced ring, gate, banners ───
      // Dirt floor
      ctx.fillStyle = '#9b7b4a';
      ctx.fillRect(ox + 2, oy + 6, 28, 28);
      ctx.fillStyle = '#b89b6a';
      ctx.fillRect(ox + 4, oy + 8, 24, 24);
      // Fence
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox, oy + 4, 32, 3);
      ctx.fillRect(ox, oy + 31, 32, 3);
      ctx.fillRect(ox, oy + 4, 3, 30);
      ctx.fillRect(ox + 29, oy + 4, 3, 30);
      // Fence highlights
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 1, oy + 5, 30, 1);
      ctx.fillRect(ox + 1, oy + 32, 30, 1);
      // Corner posts
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox - 1, oy + 2, 4, 5);
      ctx.fillRect(ox + 29, oy + 2, 4, 5);
      ctx.fillRect(ox - 1, oy + 30, 4, 5);
      ctx.fillRect(ox + 29, oy + 30, 4, 5);
      // Gate opening (top center)
      ctx.fillStyle = '#b89b6a';
      ctx.fillRect(ox + 12, oy + 4, 8, 3);
      // Gate posts
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 10, oy, 3, 8);
      ctx.fillRect(ox + 19, oy, 3, 8);
      // Shield above gate (crossed swords)
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox + 13, oy - 4, 6, 5);
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ox + 14, oy - 6, 1, 8);
      ctx.fillRect(ox + 17, oy - 6, 1, 8);
      // Banner poles
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox - 3, oy - 6, 2, 14);
      ctx.fillRect(ox + 33, oy - 6, 2, 14);
      // Red banners
      ctx.fillStyle = '#c04040';
      ctx.fillRect(ox - 5, oy - 6, 4, 8);
      ctx.fillRect(ox + 33, oy - 6, 4, 8);
      ctx.fillStyle = '#d05050';
      ctx.fillRect(ox - 4, oy - 5, 2, 6);
      ctx.fillRect(ox + 34, oy - 5, 2, 6);
    }
  }

  // ── Animated Location Parts ─────────────────────
  function drawAnimatedLocationParts(ctx) {
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      var ox = loc.x - 16, oy = loc.y - 24;

      if (id === 'town') {
        // Chimney smoke
        drawSmoke(ctx, ox + 25, oy - 10, smokeFrame, 0);
      } else if (id === 'mine') {
        // Two torches flanking cave entrance
        drawTorch(ctx, ox + 4, oy + 12, smokeFrame, 0);
        drawTorch(ctx, ox + 26, oy + 12, smokeFrame, 7);
      } else if (id === 'smithy') {
        // Chimney smoke
        drawSmoke(ctx, ox + 6, oy - 12, smokeFrame, 3);
        // Sparks from anvil
        drawSparks(ctx, ox + 37, oy + 20, smokeFrame);
      } else if (id === 'arena') {
        // Two torches at gate
        drawTorch(ctx, ox + 10, oy - 2, smokeFrame, 5);
        drawTorch(ctx, ox + 20, oy - 2, smokeFrame, 9);
      }
    }
  }

  // ── Animation Helpers ───────────────────────────
  function drawSmoke(ctx, x, y, frame, seed) {
    var particles = 4;
    ctx.globalAlpha = 0.4;
    for (var i = 0; i < particles; i++) {
      var t = ((frame + seed * 17 + i * 12) % 60) / 60;
      var py = y - t * 18;
      var px = x + Math.sin(t * 4 + i) * 3;
      var a = 0.4 * (1 - t);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#888888';
      var s = 2 + t * 3;
      ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawTorch(ctx, x, y, frame, seed) {
    // Base
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(x, y + 2, 2, 6);
    // Flame (flickers)
    var flicker = ((frame + seed * 13) % 6);
    var colors = ['#ff6020','#ffa040','#ff8030','#ffc040','#ff6020','#ff8030'];
    ctx.fillStyle = colors[flicker];
    ctx.fillRect(x - 1, y - 2, 4, 4);
    ctx.fillStyle = '#ffd060';
    ctx.fillRect(x, y - 1, 2, 2);
    // Glow
    ctx.fillStyle = '#ff8030';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x - 3, y - 4, 8, 8);
    ctx.globalAlpha = 1;
  }

  function drawSparks(ctx, x, y, frame) {
    var sparks = 5;
    for (var i = 0; i < sparks; i++) {
      var t = ((frame + i * 11) % 30) / 30;
      if (t > 0.8) continue;
      var px = x + Math.sin(t * 6 + i * 2) * 6;
      var py = y - t * 14;
      ctx.globalAlpha = 0.8 * (1 - t);
      var sparkColors = ['#ffcc30','#ffaa20','#ff8810','#ffdd50','#ffbb30'];
      ctx.fillStyle = sparkColors[i];
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Location Labels ─────────────────────────────
  function drawLocationLabels(ctx) {
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(loc.name, loc.x, loc.y + 30);
      ctx.fillText(loc.name, loc.x, loc.y + 30);

      if (loc.skill && activeSlot >= 0) {
        var lvl = getSkillLevel(activeSlot, loc.skill);
        ctx.fillStyle = '#ffdd44';
        ctx.strokeText('Lv ' + lvl, loc.x, loc.y + 42);
        ctx.fillText('Lv ' + lvl, loc.x, loc.y + 42);
      }
    }
  }

  // ── Map Border Frame ────────────────────────────
  function drawMapBorder(ctx) {
    // Dark outer border
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, MAP_W - 4, MAP_H - 4);
    // Gold inner border
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, MAP_W - 10, MAP_H - 10);
    // Corner ornament squares
    ctx.fillStyle = '#c0a040';
    var cs = 5;
    ctx.fillRect(3, 3, cs, cs);
    ctx.fillRect(MAP_W - 3 - cs, 3, cs, cs);
    ctx.fillRect(3, MAP_H - 3 - cs, cs, cs);
    ctx.fillRect(MAP_W - 3 - cs, MAP_H - 3 - cs, cs, cs);
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
    // Outer gold border
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    // Inner gold border
    ctx.strokeStyle = '#e0c060';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

    // Text
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(text, px, py + 2);

    // Click arrow indicator
    var arrowPhase = Math.sin(smokeFrame * 0.08) * 2;
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(px - 2, by + bh + 2 + arrowPhase, 4, 2);
    ctx.fillRect(px - 1, by + bh + 4 + arrowPhase, 2, 2);
  }

  // ── Map Click Handling ──────────────────────────
  function onMapCanvasClick(e) {
    if (!mapCanvas) return;
    var rect = mapCanvas.getBoundingClientRect();
    var scaleX = MAP_W / rect.width;
    var scaleY = MAP_H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;

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
    if (!loc.skill) return; // Town hub — no action yet

    // Find matching LOCATIONS entry
    var locData = null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === locId) { locData = LOCATIONS[i]; break; }
    }
    if (!locData) return;

    addGameMessage('You enter ' + loc.name + '.', 'enter');
    stopMapLoop();
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

  function renderLocationPane(locId, skill) {
    currentLocationId = locId;
    currentLocationSkill = skill;
    var header = $('rpg-loc-header');
    var statsC = $('rpg-loc-stats');
    var perksC = $('rpg-loc-perks');
    var logC = $('rpg-loc-log');
    if (!header) return;

    // Header: name + flavor
    var loc = null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === locId) { loc = LOCATIONS[i]; break; }
    }
    var name = loc ? escapeHtml(loc.name) : escapeHtml(locId);
    var flavor = LOCATION_FLAVOR[locId] || '';
    header.innerHTML = '<span class="rpg-loc-name">' + name + '</span>' +
      (flavor ? '<span class="rpg-loc-flavor">' + escapeHtml(flavor) + '</span>' : '');

    // Delegate to skills API
    var api = window.__RPG_SKILLS_API;
    if (!api || !skill) {
      if (statsC) statsC.innerHTML = '';
      if (perksC) perksC.innerHTML = '';
      if (logC) logC.innerHTML = '<div class="rpg-loc-muted">No skill at this location.</div>';
      return;
    }
    api.renderSkillStatsInto(statsC, skill);
    api.renderPerksInto(perksC, skill);
    api.renderCollectionLogInto(logC);
  }

  function clearLocationPane() {
    currentLocationId = null;
    currentLocationSkill = null;
    var header = $('rpg-loc-header');
    var statsC = $('rpg-loc-stats');
    var perksC = $('rpg-loc-perks');
    var logC = $('rpg-loc-log');
    if (header) header.innerHTML = '';
    if (statsC) statsC.innerHTML = '';
    if (perksC) perksC.innerHTML = '';
    if (logC) logC.innerHTML = '';
  }

  // ── Skill Location Entry ──────────────────────
  function enterSkillLocation(loc) {
    showCenterContent('skill');
    switchChatTab('skills');

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
    }, 50);
  }

  function returnToMap() {
    // Cleanup the active game in skills.js
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    clearLocationPane();
    addGameMessage('You return to the world map.', 'return');
    showCenterContent('map');
    enterPromptVisible = !!playerAtLocation;
    startMapLoop();
    updateTopbar();
    updateCharInfo();
  }

  // ── Save & Quit ───────────────────────────────
  function onSaveQuit() {
    stopMapLoop();

    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].lastPlayed = Date.now();
    }
    meta.currentSlot = -1;
    saveMeta();

    // Clean up skills if active
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    // Hide chatbox
    var osrsChatbox = $('osrs-chatbox');
    if (osrsChatbox) osrsChatbox.style.display = 'none';

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

  // ── Keyboard Interceptor ────────────────────────
  // Block 1-5 keys from triggering skills.js skill switch in RPG mode
  function onRpgKeyDown(e) {
    if (currentScreen !== 'rpg-game-screen') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
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

    // Chatbox toggle + all tabs (text tabs + icon tabs)
    var chatToggle = $('osrs-chatbox-toggle');
    if (chatToggle) chatToggle.addEventListener('click', toggleChatbox);
    var chatTabs = document.querySelector('.osrs-chatbox-tabs');
    if (chatTabs) chatTabs.addEventListener('click', onChatTabClick);
    var iconTabs = document.querySelector('.osrs-chatbox-icons');
    if (iconTabs) iconTabs.addEventListener('click', onChatTabClick);

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
