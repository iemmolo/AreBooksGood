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

  // ── Pet Data ─────────────────────────────────
  var PET_KEY = 'arebooksgood-pet';
  var petSpriteData = null;
  var petCatalog = null;

  // ── Map Constants ────────────────────────────
  var MAP_W = 700, MAP_H = 440;
  var MAP_LOCATIONS = {
    town:   { x: 350, y: 65,  name: 'Town Hub',        skill: null },
    mine:   { x: 110, y: 170, name: 'Mining Camp',      skill: 'mining' },
    dock:   { x: 590, y: 170, name: 'Fishing Dock',     skill: 'fishing' },
    forest: { x: 110, y: 300, name: 'Lumber Forest',    skill: 'woodcutting' },
    smithy: { x: 590, y: 300, name: 'Smithy',           skill: 'smithing' },
    arena:  { x: 350, y: 370, name: 'Training Arena',   skill: 'combat' }
  };
  var MAP_LOC_ORDER = ['town', 'mine', 'dock', 'forest', 'smithy', 'arena'];
  var PATH_SEGMENTS = [
    ['town', 'mine'], ['town', 'dock'],
    ['town', 'forest'], ['town', 'smithy'],
    ['town', 'arena'],
    ['mine', 'forest'], ['dock', 'smithy'],
    ['forest', 'arena'], ['smithy', 'arena']
  ];
  var PLAYER_SPEED = 120; // px/sec
  var HIT_RADIUS = 40;
  var CHAR_SIZE = 16; // native pixel size
  var CHAR_SCALE = 2; // render at 32x32

  // Character pixel art — 16x16, 4 directions, 2 walk frames + 1 idle
  // Format: [x, y, colorIndex] — colors: 0=skin, 1=hair, 2=tunic, 3=belt, 4=pants, 5=boots, 6=eye
  var CHAR_COLORS = ['#f0c090', '#5a3010', '#2d8c3c', '#8b5e2b', '#6b4226', '#2a1a0a', '#1a1a2e'];
  var CHAR_FRAMES = {
    down: [
      // idle (facing down)
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'0'],[7,3,'6'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[7,9,'4'],[8,9,'4'],[9,9,'4'],[10,9,'4'],
       [5,10,'4'],[6,10,'4'],[9,10,'4'],[10,10,'4'],
       [5,11,'4'],[6,11,'4'],[9,11,'4'],[10,11,'4'],
       [5,12,'5'],[6,12,'5'],[9,12,'5'],[10,12,'5'],
       [5,13,'5'],[6,13,'5'],[9,13,'5'],[10,13,'5']],
      // walk1 (left leg forward)
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'0'],[7,3,'6'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [4,9,'4'],[5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],
       [3,10,'4'],[4,10,'4'],[9,10,'4'],[10,10,'4'],
       [3,11,'5'],[4,11,'5'],[9,11,'4'],[10,11,'4'],
       [3,12,'5'],[4,12,'5'],[9,12,'5'],[10,12,'5'],
       [9,13,'5'],[10,13,'5']],
      // walk2 (right leg forward)
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'0'],[7,3,'6'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],[11,9,'4'],
       [5,10,'4'],[6,10,'4'],[11,10,'4'],[12,10,'4'],
       [5,11,'4'],[6,11,'4'],[11,11,'5'],[12,11,'5'],
       [5,12,'5'],[6,12,'5'],[11,12,'5'],[12,12,'5'],
       [5,13,'5'],[6,13,'5']]
    ],
    up: [
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [6,3,'1'],[7,3,'1'],[8,3,'1'],[9,3,'1'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[7,9,'4'],[8,9,'4'],[9,9,'4'],[10,9,'4'],
       [5,10,'4'],[6,10,'4'],[9,10,'4'],[10,10,'4'],
       [5,11,'4'],[6,11,'4'],[9,11,'4'],[10,11,'4'],
       [5,12,'5'],[6,12,'5'],[9,12,'5'],[10,12,'5'],
       [5,13,'5'],[6,13,'5'],[9,13,'5'],[10,13,'5']],
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [6,3,'1'],[7,3,'1'],[8,3,'1'],[9,3,'1'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [4,9,'4'],[5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],
       [3,10,'4'],[4,10,'4'],[9,10,'4'],[10,10,'4'],
       [3,11,'5'],[4,11,'5'],[9,11,'4'],[10,11,'4'],
       [3,12,'5'],[4,12,'5'],[9,12,'5'],[10,12,'5'],
       [9,13,'5'],[10,13,'5']],
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [5,2,'1'],[6,2,'1'],[7,2,'1'],[8,2,'1'],[9,2,'1'],[10,2,'1'],
       [6,3,'1'],[7,3,'1'],[8,3,'1'],[9,3,'1'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'2'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'2'],
       [5,6,'2'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[9,9,'4'],[10,9,'4'],[11,9,'4'],
       [5,10,'4'],[6,10,'4'],[11,10,'4'],[12,10,'4'],
       [5,11,'4'],[6,11,'4'],[11,11,'5'],[12,11,'5'],
       [5,12,'5'],[6,12,'5'],[11,12,'5'],[12,12,'5'],
       [5,13,'5'],[6,13,'5']]
    ],
    left: [
      [[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [6,2,'1'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'6'],[7,3,'0'],[8,3,'0'],[9,3,'0'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'0'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'0'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[7,9,'4'],[8,9,'4'],[9,9,'4'],
       [5,10,'4'],[6,10,'4'],[8,10,'4'],[9,10,'4'],
       [5,11,'4'],[6,11,'4'],[8,11,'4'],[9,11,'4'],
       [5,12,'5'],[6,12,'5'],[8,12,'5'],[9,12,'5'],
       [5,13,'5'],[6,13,'5'],[8,13,'5'],[9,13,'5']],
      [[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [6,2,'1'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'6'],[7,3,'0'],[8,3,'0'],[9,3,'0'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'0'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'0'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [4,9,'4'],[5,9,'4'],[6,9,'4'],[8,9,'4'],[9,9,'4'],
       [3,10,'4'],[4,10,'4'],[8,10,'4'],[9,10,'4'],
       [3,11,'5'],[4,11,'5'],[8,11,'5'],[9,11,'5'],
       [3,12,'5'],[4,12,'5']],
      [[7,1,'1'],[8,1,'1'],[9,1,'1'],
       [6,2,'1'],[7,2,'0'],[8,2,'0'],[9,2,'0'],[10,2,'1'],
       [6,3,'6'],[7,3,'0'],[8,3,'0'],[9,3,'0'],
       [7,4,'0'],[8,4,'0'],
       [5,5,'0'],[6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],
       [5,6,'0'],[6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],
       [5,7,'2'],[6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [5,9,'4'],[6,9,'4'],[8,9,'4'],[9,9,'4'],[10,9,'4'],
       [5,10,'4'],[6,10,'4'],[10,10,'4'],[11,10,'4'],
       [5,11,'5'],[6,11,'5'],[10,11,'5'],[11,11,'5'],
       [10,12,'5'],[11,12,'5']]
    ],
    right: [
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'1'],
       [6,3,'0'],[7,3,'0'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'0'],
       [6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [6,9,'4'],[7,9,'4'],[8,9,'4'],[9,9,'4'],[10,9,'4'],
       [6,10,'4'],[7,10,'4'],[9,10,'4'],[10,10,'4'],
       [6,11,'4'],[7,11,'4'],[9,11,'4'],[10,11,'4'],
       [6,12,'5'],[7,12,'5'],[9,12,'5'],[10,12,'5'],
       [6,13,'5'],[7,13,'5'],[9,13,'5'],[10,13,'5']],
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'1'],
       [6,3,'0'],[7,3,'0'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'0'],
       [6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [6,9,'4'],[7,9,'4'],[8,9,'4'],[10,9,'4'],[11,9,'4'],
       [6,10,'4'],[7,10,'4'],[11,10,'4'],[12,10,'4'],
       [6,11,'5'],[7,11,'5'],[11,11,'5'],[12,11,'5'],
       [6,12,'5'],[7,12,'5']],
      [[6,1,'1'],[7,1,'1'],[8,1,'1'],
       [5,2,'1'],[6,2,'0'],[7,2,'0'],[8,2,'0'],[9,2,'1'],
       [6,3,'0'],[7,3,'0'],[8,3,'0'],[9,3,'6'],
       [7,4,'0'],[8,4,'0'],
       [6,5,'2'],[7,5,'2'],[8,5,'2'],[9,5,'2'],[10,5,'0'],
       [6,6,'2'],[7,6,'2'],[8,6,'2'],[9,6,'2'],[10,6,'0'],
       [6,7,'2'],[7,7,'2'],[8,7,'2'],[9,7,'2'],[10,7,'2'],
       [6,8,'3'],[7,8,'3'],[8,8,'3'],[9,8,'3'],
       [4,9,'4'],[5,9,'4'],[6,9,'4'],[7,9,'4'],[8,9,'4'],
       [3,10,'4'],[4,10,'4'],[6,10,'4'],[7,10,'4'],
       [3,11,'5'],[4,11,'5'],[6,11,'5'],[7,11,'5'],
       [3,12,'5'],[4,12,'5']]
    ]
  };

  // Decoration positions (flowers, rocks, bushes) — [x, y, type]
  // type: 0=flower, 1=rock, 2=bush
  var MAP_DECO = [
    [40,50,0],[180,80,2],[460,90,0],[650,50,1],[80,380,0],
    [250,200,1],[480,250,0],[620,400,2],[300,140,0],[170,420,1],
    [530,130,2],[400,300,0],[50,250,1],[660,230,0],[230,370,2],
    [500,380,1],[150,140,0],[420,50,2],[570,370,0],[80,120,1]
  ];

  // ── Map State ──────────────────────────────────
  var mapCanvas = null, mapCtx = null, mapAnimId = null;
  var playerPos = { x: 350, y: 65 };
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

  // ── Center Panel Toggle ───────────────────────
  function showCenterContent(mode) {
    var mapContainer = $('rpg-world-map-container');
    var gameHeader = $('skills-game-header');
    var gameArea = $('skills-game-area');
    var gameLog = $('skills-game-log');
    var skillTopbar = $('rpg-skill-topbar');
    var welcomeMsg = $('osrs-chatbox-welcome');

    if (mode === 'skill') {
      if (mapContainer) mapContainer.style.display = 'none';
      if (gameHeader) gameHeader.style.display = '';
      if (gameArea) gameArea.style.display = '';
      if (gameLog) gameLog.style.display = '';
      if (skillTopbar) skillTopbar.style.display = '';
      if (welcomeMsg) welcomeMsg.style.display = 'none';
    } else {
      if (mapContainer) mapContainer.style.display = 'block';
      if (gameHeader) gameHeader.style.display = 'none';
      if (gameArea) gameArea.style.display = 'none';
      if (gameLog) gameLog.style.display = 'none';
      if (skillTopbar) skillTopbar.style.display = 'none';
      if (welcomeMsg) welcomeMsg.style.display = '';
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

    // Create skill topbar at top of center game panel
    var gamePanel = $('skills-game-panel');
    var mapContainer = $('rpg-world-map-container');
    if (gamePanel && !$('rpg-skill-topbar')) {
      var topbar = document.createElement('div');
      topbar.className = 'rpg-skill-topbar';
      topbar.id = 'rpg-skill-topbar';
      topbar.style.display = 'none';

      var perksBtn = $('skills-perks-btn');
      if (perksBtn) {
        perksBtn.style.display = '';
        topbar.appendChild(perksBtn);
      }
      var logBtn = $('skills-log-btn');
      if (logBtn) topbar.appendChild(logBtn);

      // Clone the World Map button into the topbar
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

    // Update welcome message
    var welcomeEl = $('osrs-chatbox-welcome');
    if (welcomeEl) {
      var pName = escapeHtml(meta.slots[slot].name);
      if (isFirstLogin) {
        welcomeEl.innerHTML = 'Welcome, ' + pName + '. This is your first time here — Jack greets you.';
      } else if (Date.now() - prevLastPlayed < 300000) {
        welcomeEl.innerHTML = 'Welcome back, ' + pName + '.';
      } else {
        welcomeEl.innerHTML = 'Welcome back, ' + pName + '. You last logged in ' + timeAgo(prevLastPlayed) + '.';
      }
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

  // ── Drawing ─────────────────────────────────────
  function drawMap() {
    var ctx = mapCtx;
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2); // 2x for crisp pixels

    drawTerrain(ctx);
    drawPaths(ctx);
    drawDecorations(ctx);
    drawLocationMarkers(ctx);
    drawPlayer(ctx);
    if (enterPromptVisible && playerAtLocation) {
      drawEnterPrompt(ctx);
    }

    ctx.restore();
  }

  function drawTerrain(ctx) {
    // Grass base
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Grass variation patches
    ctx.fillStyle = '#3f7a35';
    var grassPatches = [[0,0,200,100],[300,200,150,80],[500,300,200,140],[100,350,180,90]];
    for (var i = 0; i < grassPatches.length; i++) {
      var p = grassPatches[i];
      ctx.fillRect(p[0], p[1], p[2], p[3]);
    }
    ctx.fillStyle = '#55a048';
    var grassLight = [[200,50,180,70],[450,100,100,60],[50,200,120,100],[350,350,150,70]];
    for (var i = 0; i < grassLight.length; i++) {
      var p = grassLight[i];
      ctx.fillRect(p[0], p[1], p[2], p[3]);
    }

    // Water near Fishing Dock
    ctx.fillStyle = '#2868a8';
    ctx.fillRect(550, 120, 150, 100);
    ctx.fillStyle = '#3078b8';
    ctx.fillRect(560, 130, 130, 80);
    // Water ripples
    ctx.fillStyle = '#4898d0';
    ctx.fillRect(570, 145, 20, 2);
    ctx.fillRect(610, 165, 25, 2);
    ctx.fillRect(580, 185, 18, 2);
    ctx.fillRect(650, 155, 15, 2);
  }

  function drawPaths(ctx) {
    ctx.strokeStyle = '#9b7b4a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]];
      var b = MAP_LOCATIONS[seg[1]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // Inner lighter path
    ctx.strokeStyle = '#b89b6a';
    ctx.lineWidth = 4;
    for (var i = 0; i < PATH_SEGMENTS.length; i++) {
      var seg = PATH_SEGMENTS[i];
      var a = MAP_LOCATIONS[seg[0]];
      var b = MAP_LOCATIONS[seg[1]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawDecorations(ctx) {
    for (var i = 0; i < MAP_DECO.length; i++) {
      var d = MAP_DECO[i];
      if (d[2] === 0) {
        // Flower
        ctx.fillStyle = '#e84060';
        ctx.fillRect(d[0], d[1], 3, 3);
        ctx.fillStyle = '#f0e040';
        ctx.fillRect(d[0] + 1, d[1] + 1, 1, 1);
        ctx.fillStyle = '#2d6e28';
        ctx.fillRect(d[0] + 1, d[1] + 3, 1, 3);
      } else if (d[2] === 1) {
        // Rock
        ctx.fillStyle = '#808080';
        ctx.fillRect(d[0], d[1] + 2, 6, 4);
        ctx.fillStyle = '#999999';
        ctx.fillRect(d[0] + 1, d[1] + 1, 4, 3);
        ctx.fillStyle = '#b0b0b0';
        ctx.fillRect(d[0] + 2, d[1], 2, 2);
      } else {
        // Bush
        ctx.fillStyle = '#2d6e28';
        ctx.fillRect(d[0], d[1] + 2, 8, 5);
        ctx.fillStyle = '#3a8a34';
        ctx.fillRect(d[0] + 1, d[1], 6, 6);
        ctx.fillStyle = '#4aa044';
        ctx.fillRect(d[0] + 2, d[1] + 1, 4, 3);
      }
    }
  }

  function drawLocationMarkers(ctx) {
    for (var i = 0; i < MAP_LOC_ORDER.length; i++) {
      var id = MAP_LOC_ORDER[i];
      var loc = MAP_LOCATIONS[id];
      drawLocationMarker(ctx, id, loc.x, loc.y);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(loc.name, loc.x, loc.y + 22);
      ctx.fillText(loc.name, loc.x, loc.y + 22);

      // Skill level
      if (loc.skill && activeSlot >= 0) {
        var lvl = getSkillLevel(activeSlot, loc.skill);
        ctx.fillStyle = '#ffdd44';
        ctx.strokeText('Lv ' + lvl, loc.x, loc.y + 32);
        ctx.fillText('Lv ' + lvl, loc.x, loc.y + 32);
      }
    }
  }

  function drawLocationMarker(ctx, id, x, y) {
    var ox = x - 10, oy = y - 14;
    if (id === 'town') {
      // House: brown walls, red roof, door
      ctx.fillStyle = '#8b5e2b';
      ctx.fillRect(ox, oy + 6, 20, 12);
      ctx.fillStyle = '#c44030';
      ctx.fillRect(ox - 2, oy + 2, 24, 6);
      ctx.fillStyle = '#a83020';
      ctx.fillRect(ox, oy, 20, 4);
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(ox + 8, oy + 10, 5, 8);
      ctx.fillStyle = '#f0e040';
      ctx.fillRect(ox + 11, oy + 13, 1, 1);
    } else if (id === 'mine') {
      // Cave entrance
      ctx.fillStyle = '#666666';
      ctx.fillRect(ox, oy + 4, 20, 14);
      ctx.fillStyle = '#888888';
      ctx.fillRect(ox + 2, oy + 2, 16, 4);
      ctx.fillStyle = '#999999';
      ctx.fillRect(ox + 4, oy, 12, 4);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 4, oy + 6, 12, 12);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(ox + 6, oy + 4, 8, 14);
      // Pickaxe
      ctx.fillStyle = '#8b5e2b';
      ctx.fillRect(ox + 16, oy + 2, 2, 10);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(ox + 14, oy, 6, 3);
    } else if (id === 'dock') {
      // Wooden planks into water
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox, oy + 8, 20, 4);
      ctx.fillRect(ox, oy + 14, 20, 4);
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(ox + 2, oy + 4, 3, 14);
      ctx.fillRect(ox + 15, oy + 4, 3, 14);
      // Fishing rod
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 18, oy, 2, 12);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(ox + 19, oy, 1, 1);
    } else if (id === 'forest') {
      // Tree cluster
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(ox + 4, oy + 10, 3, 8);
      ctx.fillRect(ox + 13, oy + 10, 3, 8);
      ctx.fillStyle = '#2d7a28';
      ctx.fillRect(ox + 1, oy + 2, 9, 10);
      ctx.fillRect(ox + 10, oy + 2, 9, 10);
      ctx.fillStyle = '#3a9a34';
      ctx.fillRect(ox + 3, oy, 5, 8);
      ctx.fillRect(ox + 12, oy, 5, 8);
      ctx.fillStyle = '#4ab044';
      ctx.fillRect(ox + 4, oy + 2, 3, 4);
      ctx.fillRect(ox + 13, oy + 2, 3, 4);
    } else if (id === 'smithy') {
      // Anvil + orange glow
      ctx.fillStyle = '#ff8030';
      ctx.globalAlpha = 0.3;
      ctx.fillRect(ox - 2, oy - 2, 24, 24);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 4, oy + 6, 12, 8);
      ctx.fillStyle = '#444444';
      ctx.fillRect(ox + 2, oy + 4, 16, 4);
      ctx.fillStyle = '#333333';
      ctx.fillRect(ox + 6, oy + 2, 8, 4);
      ctx.fillStyle = '#666666';
      ctx.fillRect(ox + 6, oy + 14, 3, 4);
      ctx.fillRect(ox + 11, oy + 14, 3, 4);
      // Sparks
      ctx.fillStyle = '#ffaa30';
      ctx.fillRect(ox + 7, oy, 1, 1);
      ctx.fillRect(ox + 12, oy + 1, 1, 1);
      ctx.fillRect(ox + 9, oy - 1, 1, 1);
    } else if (id === 'arena') {
      // Fenced ring with crossed swords
      ctx.fillStyle = '#8b6e3b';
      ctx.fillRect(ox, oy + 2, 20, 2);
      ctx.fillRect(ox, oy + 16, 20, 2);
      ctx.fillRect(ox, oy + 2, 2, 16);
      ctx.fillRect(ox + 18, oy + 2, 2, 16);
      // Fence posts
      ctx.fillRect(ox + 6, oy, 2, 4);
      ctx.fillRect(ox + 12, oy, 2, 4);
      // Crossed swords
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ox + 6, oy + 4, 2, 12);
      ctx.fillRect(ox + 12, oy + 4, 2, 12);
      ctx.fillStyle = '#8b5e2b';
      ctx.fillRect(ox + 5, oy + 12, 4, 2);
      ctx.fillRect(ox + 11, oy + 12, 4, 2);
    }
  }

  function drawPlayer(ctx) {
    var frames = CHAR_FRAMES[playerDir];
    if (!frames) return;
    var frame = frames[playerFrame] || frames[0];

    var s = CHAR_SCALE;
    var ox = Math.round(playerPos.x) - 8 * s;
    var oy = Math.round(playerPos.y) - 12 * s;

    for (var i = 0; i < frame.length; i++) {
      var px = frame[i];
      ctx.fillStyle = CHAR_COLORS[parseInt(px[2])];
      ctx.fillRect(ox + px[0] * s, oy + px[1] * s, s, s);
    }
  }

  function drawEnterPrompt(ctx) {
    if (!playerAtLocation) return;
    var loc = MAP_LOCATIONS[playerAtLocation];
    if (!loc) return;

    var text = '> Enter ' + loc.name;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    var tw = ctx.measureText(text).width;
    var px = playerPos.x;
    var py = playerPos.y - 30;

    // Box
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(px - tw / 2 - 6, py - 10, tw + 12, 16);
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - tw / 2 - 6, py - 10, tw + 12, 16);

    // Text
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(text, px, py + 2);
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
      var promptY = playerPos.y - 30;
      if (Math.abs(cx - playerPos.x) < 60 && Math.abs(cy - promptY) < 12) {
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
    }, 50);
  }

  function returnToMap() {
    // Cleanup the active game in skills.js
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

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
