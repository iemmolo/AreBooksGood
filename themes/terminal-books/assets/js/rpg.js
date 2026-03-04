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
    var charPane = $('osrs-side-character');
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

    // Show game screen
    showScreen('rpg-game-screen');

    // Render world map in center
    renderWorldMap();

    // Check if player was inside a skill location on last session
    var resumeLocId = meta.slots[slot].insideLocation || null;
    if (resumeLocId && MAP_LOCATIONS[resumeLocId] && MAP_LOCATIONS[resumeLocId].skill) {
      showCenterContent('map'); // brief map init needed for canvas
      // (Re-)initialize skills.js first, then enter the location
      window.dispatchEvent(new Event('rpg-skills-init'));
      setTimeout(function () {
        onEnterLocation(resumeLocId);
      }, 100);
    } else {
      showCenterContent('map');
      // (Re-)initialize skills.js with the new slot's storage key
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

    // Clear persisted inside-location flag
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].insideLocation = null;
      saveMeta();
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
