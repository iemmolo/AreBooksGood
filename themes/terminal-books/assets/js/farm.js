(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-farm';
  var UPDATE_INTERVAL = 10000; // 10s refresh
  var growTimeMultiplier = 1;
  var farmhouseGrowMultiplier = 1;
  var sellMultiplier = 1;

  // ── Free crops (infinite seeds) ───────────────────────
  var FREE_CROPS = { carrot: true, potato: true, wheat: true };

  // ── Dashboard tiles (strip resource summary) ─────────
  var DASHBOARD_TILES = [
    { key: 'crops', icon: '\uD83C\uDF3E', label: 'Crops' },
    { key: 'lumberYard', icon: '\uD83E\uDEB5', resource: 'wood' },
    { key: 'quarry', icon: '\u26CF\uFE0F', resource: 'stone' },
    { key: 'fishingPond', icon: '\uD83D\uDC1F', resource: 'fish' },
    { key: 'chickenCoop', icon: '\uD83E\uDD5A', resource: 'eggs' },
    { key: 'cowPasture', icon: '\uD83E\uDD5B', resource: 'milk' },
    { key: 'sheepPen', icon: '\uD83E\uDDF6', resource: 'wool' },
    { key: 'mine', icon: '\u2699\uFE0F', resource: 'iron' },
    { key: 'deepMine', icon: '\uD83D\uDC8E', resource: 'gold' },
    { key: 'oldGrowth', icon: '\uD83C\uDF33', resource: 'hardwood' },
    { key: 'farmLink', icon: '\u2192', label: 'Farm' }
  ];

  // ── Crop definitions ────────────────────────────────────
  var CROPS = {
    carrot:       { name: 'Carrot',       growTime: 5 * 60 * 1000,    sell: 2,   seedCost: 0,  icon: 'C', rarity: 'common' },
    potato:       { name: 'Potato',       growTime: 15 * 60 * 1000,   sell: 5,   seedCost: 0,  icon: 'P', rarity: 'common' },
    wheat:        { name: 'Wheat',        growTime: 30 * 60 * 1000,   sell: 8,   seedCost: 0,  icon: 'W', rarity: 'common' },
    tomato:       { name: 'Tomato',       growTime: 60 * 60 * 1000,   sell: 15,  seedCost: 5,  icon: 'T', rarity: 'common' },
    corn:         { name: 'Corn',         growTime: 120 * 60 * 1000,  sell: 25,  seedCost: 8,  icon: 'K', rarity: 'common' },
    pumpkin:      { name: 'Pumpkin',      growTime: 240 * 60 * 1000,  sell: 45,  seedCost: 12, icon: 'Q', rarity: 'common' },
    golden_apple: { name: 'Golden Apple', growTime: 480 * 60 * 1000,  sell: 90,  seedCost: 25, icon: 'A', rarity: 'rare' },
    crystal_herb: { name: 'Crystal Herb', growTime: 720 * 60 * 1000,  sell: 150, seedCost: 40, icon: 'H', rarity: 'rare' },
    dragon_fruit: { name: 'Dragon Fruit', growTime: 1440 * 60 * 1000, sell: 300, seedCost: 75, icon: 'D', rarity: 'rare' }
  };

  // Growth stages: 0-25% planted, 25-50% sprouting, 50-75% growing, 75-100% flowering, 100% ready
  var STAGES = ['planted', 'sprouting', 'growing', 'flowering', 'ready'];

  // ── 8x8 Crop sprites (box-shadow pixel art) ────────────
  var PIXEL = 3;
  var HOUSE_PIXEL = 8; // 16x16 farmhouse grid at 8px/pixel = 128x128px

  var SPRITES = {
    carrot: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [2,1,'#228B22'],[5,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#228B22'],[4,2,'#228B22'],[5,2,'#2EA043'],
        [3,3,'#2EA043'],[4,3,'#2EA043'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#FF8C00'],[4,5,'#FF8C00'],
        [3,6,'#FF6600'],[4,6,'#FF6600'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [1,0,'#228B22'],[6,0,'#228B22'],
        [2,1,'#2EA043'],[3,1,'#228B22'],[4,1,'#228B22'],[5,1,'#2EA043'],
        [2,2,'#2EA043'],[3,2,'#33CC33'],[4,2,'#33CC33'],[5,2,'#2EA043'],
        [3,3,'#2EA043'],[4,3,'#2EA043'],
        [3,4,'#FF8C00'],[4,4,'#FF8C00'],
        [3,5,'#FF6600'],[4,5,'#FF6600'],
        [3,6,'#FF4500'],[4,6,'#FF4500'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [1,0,'#33CC33'],[6,0,'#33CC33'],
        [2,1,'#2EA043'],[3,1,'#33CC33'],[4,1,'#33CC33'],[5,1,'#2EA043'],
        [2,2,'#228B22'],[3,2,'#33CC33'],[4,2,'#33CC33'],[5,2,'#228B22'],
        [3,3,'#2EA043'],[4,3,'#2EA043'],
        [3,4,'#FF8C00'],[4,4,'#FF8C00'],
        [2,5,'#FF6600'],[3,5,'#FF6600'],[4,5,'#FF6600'],[5,5,'#FF6600'],
        [2,6,'#FF4500'],[3,6,'#FF4500'],[4,6,'#FF4500'],[5,6,'#FF4500'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    potato: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [2,1,'#228B22'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#33CC33'],[4,2,'#33CC33'],[5,2,'#2EA043'],
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#8B4513'],[4,4,'#8B4513'],
        [2,5,'#8B7355'],[3,5,'#A0875A'],[4,5,'#A0875A'],[5,5,'#8B7355'],
        [2,6,'#8B7355'],[3,6,'#A0875A'],[4,6,'#A0875A'],[5,6,'#8B7355'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [2,0,'#228B22'],[5,0,'#228B22'],
        [1,1,'#2EA043'],[2,1,'#33CC33'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#33CC33'],[6,1,'#2EA043'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [3,3,'#228B22'],[4,3,'#228B22'],
        [2,4,'#8B7355'],[3,4,'#A0875A'],[4,4,'#A0875A'],[5,4,'#8B7355'],
        [1,5,'#8B7355'],[2,5,'#C4A96A'],[3,5,'#C4A96A'],[4,5,'#C4A96A'],[5,5,'#C4A96A'],[6,5,'#8B7355'],
        [2,6,'#8B7355'],[3,6,'#A0875A'],[4,6,'#A0875A'],[5,6,'#8B7355'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [2,0,'#33CC33'],[5,0,'#33CC33'],
        [1,1,'#2EA043'],[2,1,'#33CC33'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#33CC33'],[6,1,'#2EA043'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [3,3,'#228B22'],[4,3,'#228B22'],
        [1,4,'#C4A96A'],[2,4,'#D4B87A'],[3,4,'#D4B87A'],[4,4,'#D4B87A'],[5,4,'#D4B87A'],[6,4,'#C4A96A'],
        [1,5,'#C4A96A'],[2,5,'#DCC48A'],[3,5,'#DCC48A'],[4,5,'#DCC48A'],[5,5,'#DCC48A'],[6,5,'#C4A96A'],
        [2,6,'#C4A96A'],[3,6,'#D4B87A'],[4,6,'#D4B87A'],[5,6,'#C4A96A'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    wheat: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],
        [4,3,'#228B22'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [2,1,'#228B22'],[5,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#228B22'],[4,2,'#228B22'],[5,2,'#2EA043'],
        [2,3,'#2EA043'],[3,3,'#228B22'],[4,3,'#228B22'],[5,3,'#2EA043'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B7355'],[4,5,'#8B7355'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [1,0,'#DAA520'],[2,0,'#DAA520'],[5,0,'#DAA520'],[6,0,'#DAA520'],
        [1,1,'#228B22'],[2,1,'#2EA043'],[5,1,'#2EA043'],[6,1,'#228B22'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [2,3,'#2EA043'],[3,3,'#228B22'],[4,3,'#228B22'],[5,3,'#2EA043'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B7355'],[4,5,'#8B7355'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [0,0,'#FFD700'],[1,0,'#FFD700'],[2,0,'#DAA520'],[5,0,'#DAA520'],[6,0,'#FFD700'],[7,0,'#FFD700'],
        [1,1,'#DAA520'],[2,1,'#FFD700'],[5,1,'#FFD700'],[6,1,'#DAA520'],
        [1,2,'#228B22'],[2,2,'#2EA043'],[5,2,'#2EA043'],[6,2,'#228B22'],
        [2,3,'#228B22'],[3,3,'#2EA043'],[4,3,'#2EA043'],[5,3,'#228B22'],
        [2,4,'#2EA043'],[3,4,'#228B22'],[4,4,'#228B22'],[5,4,'#2EA043'],
        [3,5,'#8B7355'],[4,5,'#8B7355'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    tomato: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,1,'#228B22'],[4,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#228B22'],[4,2,'#228B22'],[5,2,'#2EA043'],
        [3,3,'#2EA043'],[4,3,'#2EA043'],
        [2,4,'#CC3333'],[3,4,'#FF4444'],[4,4,'#FF4444'],[5,4,'#CC3333'],
        [2,5,'#CC3333'],[3,5,'#FF4444'],[4,5,'#FF4444'],[5,5,'#CC3333'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [3,0,'#33CC33'],[4,0,'#33CC33'],
        [2,1,'#228B22'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#228B22'],
        [3,2,'#228B22'],[4,2,'#228B22'],
        [2,3,'#DD2222'],[3,3,'#FF3333'],[4,3,'#FF3333'],[5,3,'#DD2222'],
        [1,4,'#DD2222'],[2,4,'#FF4444'],[3,4,'#FF6666'],[4,4,'#FF6666'],[5,4,'#FF4444'],[6,4,'#DD2222'],
        [2,5,'#DD2222'],[3,5,'#FF4444'],[4,5,'#FF4444'],[5,5,'#DD2222'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [3,0,'#33CC33'],[4,0,'#228B22'],
        [2,1,'#228B22'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#228B22'],
        [3,2,'#228B22'],[4,2,'#228B22'],
        [1,3,'#CC0000'],[2,3,'#FF2222'],[3,3,'#FF4444'],[4,3,'#FF4444'],[5,3,'#FF2222'],[6,3,'#CC0000'],
        [1,4,'#FF2222'],[2,4,'#FF4444'],[3,4,'#FF6666'],[4,4,'#FF6666'],[5,4,'#FF4444'],[6,4,'#FF2222'],
        [1,5,'#CC0000'],[2,5,'#FF2222'],[3,5,'#FF4444'],[4,5,'#FF4444'],[5,5,'#FF2222'],[6,5,'#CC0000'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    corn: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,0,'#228B22'],[4,0,'#228B22'],
        [2,1,'#228B22'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#228B22'],
        [3,2,'#2EA043'],[4,2,'#2EA043'],
        [3,3,'#DAA520'],[4,3,'#DAA520'],
        [3,4,'#FFD700'],[4,4,'#FFD700'],
        [3,5,'#DAA520'],[4,5,'#DAA520'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [3,0,'#DAA520'],[4,0,'#C4962A'],
        [2,0,'#228B22'],[5,0,'#228B22'],
        [1,1,'#228B22'],[2,1,'#2EA043'],[5,1,'#2EA043'],[6,1,'#228B22'],
        [3,2,'#228B22'],[4,2,'#228B22'],
        [2,3,'#DAA520'],[3,3,'#FFD700'],[4,3,'#FFD700'],[5,3,'#DAA520'],
        [2,4,'#FFD700'],[3,4,'#FFED4A'],[4,4,'#FFED4A'],[5,4,'#FFD700'],
        [2,5,'#DAA520'],[3,5,'#FFD700'],[4,5,'#FFD700'],[5,5,'#DAA520'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [3,0,'#C4962A'],[4,0,'#B8860B'],
        [2,0,'#33CC33'],[5,0,'#33CC33'],
        [1,1,'#228B22'],[2,1,'#33CC33'],[5,1,'#33CC33'],[6,1,'#228B22'],
        [3,2,'#228B22'],[4,2,'#228B22'],
        [2,3,'#FFD700'],[3,3,'#FFED4A'],[4,3,'#FFED4A'],[5,3,'#FFD700'],
        [1,4,'#DAA520'],[2,4,'#FFED4A'],[3,4,'#FFFF66'],[4,4,'#FFFF66'],[5,4,'#FFED4A'],[6,4,'#DAA520'],
        [2,5,'#FFD700'],[3,5,'#FFED4A'],[4,5,'#FFED4A'],[5,5,'#FFD700'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    pumpkin: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#2EA043'],[4,4,'#2EA043'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,1,'#228B22'],[4,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#228B22'],[4,2,'#228B22'],[5,2,'#2EA043'],
        [3,3,'#CC6600'],[4,3,'#CC6600'],
        [2,4,'#CC6600'],[3,4,'#FF8800'],[4,4,'#FF8800'],[5,4,'#CC6600'],
        [2,5,'#CC6600'],[3,5,'#FF8800'],[4,5,'#FF8800'],[5,5,'#CC6600'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [3,0,'#228B22'],[4,0,'#33CC33'],
        [2,1,'#2EA043'],[3,1,'#228B22'],[4,1,'#228B22'],[5,1,'#2EA043'],
        [2,2,'#CC6600'],[3,2,'#E07700'],[4,2,'#E07700'],[5,2,'#CC6600'],
        [1,3,'#CC6600'],[2,3,'#FF8800'],[3,3,'#FF9922'],[4,3,'#FF9922'],[5,3,'#FF8800'],[6,3,'#CC6600'],
        [1,4,'#CC6600'],[2,4,'#FF8800'],[3,4,'#FF9922'],[4,4,'#FF9922'],[5,4,'#FF8800'],[6,4,'#CC6600'],
        [2,5,'#CC6600'],[3,5,'#FF8800'],[4,5,'#FF8800'],[5,5,'#CC6600'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [3,0,'#228B22'],[4,0,'#33CC33'],
        [2,1,'#2EA043'],[3,1,'#228B22'],[4,1,'#228B22'],[5,1,'#2EA043'],
        [1,2,'#CC6600'],[2,2,'#E07700'],[3,2,'#FF8800'],[4,2,'#FF8800'],[5,2,'#E07700'],[6,2,'#CC6600'],
        [1,3,'#FF8800'],[2,3,'#FF9922'],[3,3,'#FFAA44'],[4,3,'#FFAA44'],[5,3,'#FF9922'],[6,3,'#FF8800'],
        [0,4,'#CC6600'],[1,4,'#FF8800'],[2,4,'#FF9922'],[3,4,'#FFAA44'],[4,4,'#FFAA44'],[5,4,'#FF9922'],[6,4,'#FF8800'],[7,4,'#CC6600'],
        [1,5,'#CC6600'],[2,5,'#FF8800'],[3,5,'#FF9922'],[4,5,'#FF9922'],[5,5,'#FF8800'],[6,5,'#CC6600'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    golden_apple: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#6B4513'],[4,3,'#6B4513'],
        [3,4,'#8B4513'],[4,4,'#8B4513'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,0,'#228B22'],[4,0,'#228B22'],
        [2,1,'#228B22'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#228B22'],
        [2,2,'#2EA043'],[3,2,'#33CC33'],[4,2,'#33CC33'],[5,2,'#2EA043'],
        [3,3,'#228B22'],[4,3,'#228B22'],
        [3,4,'#8B4513'],[4,4,'#8B4513'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [2,0,'#228B22'],[3,0,'#2EA043'],[4,0,'#2EA043'],[5,0,'#228B22'],
        [1,1,'#228B22'],[2,1,'#33CC33'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#33CC33'],[6,1,'#228B22'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [3,3,'#8B4513'],[4,3,'#8B4513'],
        [3,4,'#DAA520'],[4,4,'#DAA520'],
        [2,5,'#DAA520'],[3,5,'#FFD700'],[4,5,'#FFD700'],[5,5,'#DAA520'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [2,0,'#33CC33'],[3,0,'#2EA043'],[4,0,'#2EA043'],[5,0,'#33CC33'],
        [1,1,'#228B22'],[2,1,'#33CC33'],[3,1,'#2EA043'],[4,1,'#2EA043'],[5,1,'#33CC33'],[6,1,'#228B22'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [3,3,'#8B4513'],[4,3,'#8B4513'],
        [2,4,'#FFD700'],[3,4,'#FFED4A'],[4,4,'#FFED4A'],[5,4,'#FFD700'],
        [1,5,'#DAA520'],[2,5,'#FFD700'],[3,5,'#FFED4A'],[4,5,'#FFED4A'],[5,5,'#FFD700'],[6,5,'#DAA520'],
        [2,6,'#DAA520'],[3,6,'#FFD700'],[4,6,'#FFD700'],[5,6,'#DAA520'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    crystal_herb: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,4,'#6A5ACD'],[4,4,'#7B68EE'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,2,'#6A5ACD'],[4,2,'#7B68EE'],
        [2,3,'#7B68EE'],[3,3,'#9370DB'],[4,3,'#9370DB'],[5,3,'#7B68EE'],
        [3,4,'#6A5ACD'],[4,4,'#7B68EE'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [3,0,'#7B68EE'],[4,0,'#9370DB'],
        [2,1,'#6A5ACD'],[3,1,'#9370DB'],[4,1,'#9370DB'],[5,1,'#6A5ACD'],
        [2,2,'#7B68EE'],[3,2,'#B0A0E8'],[4,2,'#B0A0E8'],[5,2,'#7B68EE'],
        [3,3,'#6A5ACD'],[4,3,'#7B68EE'],
        [3,4,'#6A5ACD'],[4,4,'#6A5ACD'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [2,0,'#00CED1'],[3,0,'#B0A0E8'],[4,0,'#B0A0E8'],[5,0,'#00CED1'],
        [1,1,'#7B68EE'],[2,1,'#9370DB'],[3,1,'#B0A0E8'],[4,1,'#B0A0E8'],[5,1,'#9370DB'],[6,1,'#7B68EE'],
        [1,2,'#6A5ACD'],[2,2,'#9370DB'],[3,2,'#00CED1'],[4,2,'#00CED1'],[5,2,'#9370DB'],[6,2,'#6A5ACD'],
        [2,3,'#7B68EE'],[3,3,'#9370DB'],[4,3,'#9370DB'],[5,3,'#7B68EE'],
        [3,4,'#6A5ACD'],[4,4,'#7B68EE'],
        [3,5,'#6A5ACD'],[4,5,'#6A5ACD'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    },
    dragon_fruit: {
      planted: [
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      sprouting: [
        [3,3,'#228B22'],[4,3,'#2EA043'],
        [3,4,'#228B22'],[4,4,'#228B22'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      growing: [
        [3,1,'#228B22'],[4,1,'#2EA043'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [2,3,'#2EA043'],[3,3,'#33CC33'],[4,3,'#33CC33'],[5,3,'#2EA043'],
        [3,4,'#228B22'],[4,4,'#228B22'],
        [3,5,'#8B4513'],[4,5,'#8B4513'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      flowering: [
        [3,0,'#228B22'],[4,0,'#2EA043'],
        [2,1,'#2EA043'],[3,1,'#33CC33'],[4,1,'#33CC33'],[5,1,'#2EA043'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [3,3,'#CC3366'],[4,3,'#CC3366'],
        [2,4,'#CC3366'],[3,4,'#FF69B4'],[4,4,'#FF69B4'],[5,4,'#CC3366'],
        [2,5,'#CC3366'],[3,5,'#FF69B4'],[4,5,'#FF69B4'],[5,5,'#CC3366'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ],
      ready: [
        [3,0,'#33CC33'],[4,0,'#2EA043'],
        [2,1,'#228B22'],[3,1,'#33CC33'],[4,1,'#33CC33'],[5,1,'#228B22'],
        [2,2,'#228B22'],[3,2,'#2EA043'],[4,2,'#2EA043'],[5,2,'#228B22'],
        [1,3,'#FF1493'],[2,3,'#FF69B4'],[3,3,'#FF69B4'],[4,3,'#FF69B4'],[5,3,'#FF69B4'],[6,3,'#FF1493'],
        [1,4,'#CC3366'],[2,4,'#FF1493'],[3,4,'#FF69B4'],[4,4,'#FF69B4'],[5,4,'#FF1493'],[6,4,'#CC3366'],
        [2,5,'#CC3366'],[3,5,'#FF1493'],[4,5,'#FF1493'],[5,5,'#CC3366'],
        [3,6,'#8B4513'],[4,6,'#8B4513'],
        [3,7,'#6B3410'],[4,7,'#6B3410']
      ]
    }
  };

  // ── Farmhouse sprites (16x16 grid, 3px scale = 48x48px) ──
  var FARMHOUSE_SPRITES = {
    1: [ // Dirt Shack — tiny brown hut
      [6,11,'#8B6914'],[7,11,'#8B6914'],[8,11,'#8B6914'],[9,11,'#8B6914'],
      [5,12,'#8B6914'],[6,12,'#6B4513'],[7,12,'#6B4513'],[8,12,'#6B4513'],[9,12,'#6B4513'],[10,12,'#8B6914'],
      [5,13,'#6B4513'],[6,13,'#8B6914'],[7,13,'#3B2506'],[8,13,'#8B6914'],[9,13,'#8B6914'],[10,13,'#6B4513'],
      [5,14,'#6B4513'],[6,14,'#8B6914'],[7,14,'#3B2506'],[8,14,'#8B6914'],[9,14,'#8B6914'],[10,14,'#6B4513'],
      [4,15,'#6B3410'],[5,15,'#6B3410'],[6,15,'#6B3410'],[7,15,'#6B3410'],[8,15,'#6B3410'],[9,15,'#6B3410'],[10,15,'#6B3410'],[11,15,'#6B3410']
    ],
    2: [ // Wooden Cabin — peaked roof
      [7,8,'#8B4513'],
      [6,9,'#8B4513'],[7,9,'#A0522D'],[8,9,'#8B4513'],
      [5,10,'#8B4513'],[6,10,'#A0522D'],[7,10,'#A0522D'],[8,10,'#A0522D'],[9,10,'#8B4513'],
      [4,11,'#8B4513'],[5,11,'#A0522D'],[6,11,'#A0522D'],[7,11,'#A0522D'],[8,11,'#A0522D'],[9,11,'#A0522D'],[10,11,'#8B4513'],
      [4,12,'#CD853F'],[5,12,'#DEB887'],[6,12,'#CD853F'],[7,12,'#CD853F'],[8,12,'#CD853F'],[9,12,'#DEB887'],[10,12,'#CD853F'],
      [4,13,'#CD853F'],[5,13,'#DEB887'],[6,13,'#87CEEB'],[7,13,'#CD853F'],[8,13,'#87CEEB'],[9,13,'#DEB887'],[10,13,'#CD853F'],
      [4,14,'#CD853F'],[5,14,'#DEB887'],[6,14,'#CD853F'],[7,14,'#3B2506'],[8,14,'#CD853F'],[9,14,'#DEB887'],[10,14,'#CD853F'],
      [3,15,'#6B3410'],[4,15,'#6B3410'],[5,15,'#6B3410'],[6,15,'#6B3410'],[7,15,'#6B3410'],[8,15,'#6B3410'],[9,15,'#6B3410'],[10,15,'#6B3410'],[11,15,'#6B3410']
    ],
    3: [ // Stone Farmhouse — chimney + stone
      [10,6,'#696969'],[11,6,'#696969'],
      [10,7,'#808080'],[11,7,'#808080'],
      [7,7,'#8B4513'],
      [6,8,'#8B4513'],[7,8,'#A0522D'],[8,8,'#8B4513'],
      [5,9,'#8B4513'],[6,9,'#A0522D'],[7,9,'#A0522D'],[8,9,'#A0522D'],[9,9,'#8B4513'],
      [4,10,'#8B4513'],[5,10,'#A0522D'],[6,10,'#A0522D'],[7,10,'#A0522D'],[8,10,'#A0522D'],[9,10,'#A0522D'],[10,10,'#A0522D'],[11,10,'#8B4513'],
      [4,11,'#A9A9A9'],[5,11,'#C0C0C0'],[6,11,'#A9A9A9'],[7,11,'#C0C0C0'],[8,11,'#A9A9A9'],[9,11,'#C0C0C0'],[10,11,'#A9A9A9'],[11,11,'#C0C0C0'],
      [4,12,'#C0C0C0'],[5,12,'#A9A9A9'],[6,12,'#87CEEB'],[7,12,'#A9A9A9'],[8,12,'#A9A9A9'],[9,12,'#87CEEB'],[10,12,'#A9A9A9'],[11,12,'#C0C0C0'],
      [4,13,'#A9A9A9'],[5,13,'#C0C0C0'],[6,13,'#87CEEB'],[7,13,'#A9A9A9'],[8,13,'#C0C0C0'],[9,13,'#87CEEB'],[10,13,'#C0C0C0'],[11,13,'#A9A9A9'],
      [4,14,'#C0C0C0'],[5,14,'#A9A9A9'],[6,14,'#C0C0C0'],[7,14,'#3B2506'],[8,14,'#3B2506'],[9,14,'#A9A9A9'],[10,14,'#C0C0C0'],[11,14,'#A9A9A9'],
      [3,15,'#6B3410'],[4,15,'#6B3410'],[5,15,'#6B3410'],[6,15,'#6B3410'],[7,15,'#6B3410'],[8,15,'#6B3410'],[9,15,'#6B3410'],[10,15,'#6B3410'],[11,15,'#6B3410'],[12,15,'#6B3410']
    ],
    4: [ // Manor — big house, windows, fence
      [10,4,'#696969'],[11,4,'#696969'],
      [10,5,'#808080'],[11,5,'#808080'],
      [7,5,'#8B4513'],[8,5,'#8B4513'],
      [6,6,'#8B4513'],[7,6,'#A0522D'],[8,6,'#A0522D'],[9,6,'#8B4513'],
      [5,7,'#8B4513'],[6,7,'#A0522D'],[7,7,'#A0522D'],[8,7,'#A0522D'],[9,7,'#A0522D'],[10,7,'#8B4513'],
      [4,8,'#8B4513'],[5,8,'#A0522D'],[6,8,'#A0522D'],[7,8,'#A0522D'],[8,8,'#A0522D'],[9,8,'#A0522D'],[10,8,'#A0522D'],[11,8,'#8B4513'],
      [3,9,'#B8860B'],[4,9,'#C0C0C0'],[5,9,'#B8860B'],[6,9,'#C0C0C0'],[7,9,'#B8860B'],[8,9,'#C0C0C0'],[9,9,'#B8860B'],[10,9,'#C0C0C0'],[11,9,'#B8860B'],[12,9,'#C0C0C0'],
      [3,10,'#C0C0C0'],[4,10,'#A9A9A9'],[5,10,'#FFFF66'],[6,10,'#A9A9A9'],[7,10,'#C0C0C0'],[8,10,'#A9A9A9'],[9,10,'#FFFF66'],[10,10,'#A9A9A9'],[11,10,'#C0C0C0'],[12,10,'#A9A9A9'],
      [3,11,'#A9A9A9'],[4,11,'#C0C0C0'],[5,11,'#FFFF66'],[6,11,'#C0C0C0'],[7,11,'#A9A9A9'],[8,11,'#C0C0C0'],[9,11,'#FFFF66'],[10,11,'#C0C0C0'],[11,11,'#A9A9A9'],[12,11,'#C0C0C0'],
      [3,12,'#C0C0C0'],[4,12,'#A9A9A9'],[5,12,'#C0C0C0'],[6,12,'#A9A9A9'],[7,12,'#3B2506'],[8,12,'#3B2506'],[9,12,'#A9A9A9'],[10,12,'#C0C0C0'],[11,12,'#C0C0C0'],[12,12,'#A9A9A9'],
      [3,13,'#A9A9A9'],[4,13,'#C0C0C0'],[5,13,'#A9A9A9'],[6,13,'#C0C0C0'],[7,13,'#3B2506'],[8,13,'#3B2506'],[9,13,'#C0C0C0'],[10,13,'#A9A9A9'],[11,13,'#A9A9A9'],[12,13,'#C0C0C0'],
      [2,14,'#6B3410'],[3,14,'#6B3410'],[4,14,'#6B3410'],[5,14,'#6B3410'],[6,14,'#6B3410'],[7,14,'#6B3410'],[8,14,'#6B3410'],[9,14,'#6B3410'],[10,14,'#6B3410'],[11,14,'#6B3410'],[12,14,'#6B3410'],[13,14,'#6B3410'],
      [1,15,'#8B4513'],[3,15,'#8B4513'],[5,15,'#8B4513'],[10,15,'#8B4513'],[12,15,'#8B4513'],[14,15,'#8B4513']
    ],
    5: [ // Golden Estate — grand building, gold trim, flag
      [12,1,'#FF0000'],[13,1,'#FF0000'],
      [12,2,'#FF0000'],
      [12,3,'#696969'],[13,3,'#696969'],
      [12,4,'#808080'],[13,4,'#808080'],
      [7,4,'#FFD700'],[8,4,'#FFD700'],
      [6,5,'#FFD700'],[7,5,'#DAA520'],[8,5,'#DAA520'],[9,5,'#FFD700'],
      [5,6,'#FFD700'],[6,6,'#DAA520'],[7,6,'#DAA520'],[8,6,'#DAA520'],[9,6,'#DAA520'],[10,6,'#FFD700'],
      [4,7,'#FFD700'],[5,7,'#DAA520'],[6,7,'#DAA520'],[7,7,'#DAA520'],[8,7,'#DAA520'],[9,7,'#DAA520'],[10,7,'#DAA520'],[11,7,'#DAA520'],[12,7,'#FFD700'],
      [3,8,'#FFD700'],[4,8,'#E8E8E8'],[5,8,'#FFD700'],[6,8,'#E8E8E8'],[7,8,'#FFD700'],[8,8,'#E8E8E8'],[9,8,'#FFD700'],[10,8,'#E8E8E8'],[11,8,'#FFD700'],[12,8,'#E8E8E8'],[13,8,'#FFD700'],
      [3,9,'#E8E8E8'],[4,9,'#FFFFFF'],[5,9,'#FFFF66'],[6,9,'#FFFFFF'],[7,9,'#E8E8E8'],[8,9,'#FFFFFF'],[9,9,'#FFFF66'],[10,9,'#FFFFFF'],[11,9,'#E8E8E8'],[12,9,'#FFFFFF'],[13,9,'#E8E8E8'],
      [3,10,'#FFFFFF'],[4,10,'#E8E8E8'],[5,10,'#FFFF66'],[6,10,'#E8E8E8'],[7,10,'#FFFFFF'],[8,10,'#E8E8E8'],[9,10,'#FFFF66'],[10,10,'#E8E8E8'],[11,10,'#FFFFFF'],[12,10,'#E8E8E8'],[13,10,'#FFFFFF'],
      [3,11,'#E8E8E8'],[4,11,'#FFFFFF'],[5,11,'#E8E8E8'],[6,11,'#FFFFFF'],[7,11,'#FFD700'],[8,11,'#3B2506'],[9,11,'#3B2506'],[10,11,'#FFFFFF'],[11,11,'#E8E8E8'],[12,11,'#FFFFFF'],[13,11,'#E8E8E8'],
      [3,12,'#FFFFFF'],[4,12,'#E8E8E8'],[5,12,'#FFFFFF'],[6,12,'#E8E8E8'],[7,12,'#FFD700'],[8,12,'#3B2506'],[9,12,'#3B2506'],[10,12,'#E8E8E8'],[11,12,'#FFFFFF'],[12,12,'#E8E8E8'],[13,12,'#FFFFFF'],
      [2,13,'#FFD700'],[3,13,'#FFD700'],[4,13,'#FFD700'],[5,13,'#FFD700'],[6,13,'#FFD700'],[7,13,'#FFD700'],[8,13,'#FFD700'],[9,13,'#FFD700'],[10,13,'#FFD700'],[11,13,'#FFD700'],[12,13,'#FFD700'],[13,13,'#FFD700'],[14,13,'#FFD700'],
      [2,14,'#6B3410'],[3,14,'#6B3410'],[4,14,'#6B3410'],[5,14,'#6B3410'],[6,14,'#6B3410'],[7,14,'#6B3410'],[8,14,'#6B3410'],[9,14,'#6B3410'],[10,14,'#6B3410'],[11,14,'#6B3410'],[12,14,'#6B3410'],[13,14,'#6B3410'],[14,14,'#6B3410'],
      [1,15,'#FFD700'],[3,15,'#FFD700'],[5,15,'#FFD700'],[11,15,'#FFD700'],[13,15,'#FFD700'],[15,15,'#FFD700']
    ]
  };

  var TREE_PIXEL = 6;
  var TREE_SPRITE = [
    // Canopy
    [6,5,'#228B22'],[7,5,'#2EA043'],[8,5,'#2EA043'],[9,5,'#228B22'],
    [5,6,'#1A6B1A'],[6,6,'#228B22'],[7,6,'#2EA043'],[8,6,'#33CC33'],[9,6,'#2EA043'],[10,6,'#1A6B1A'],
    [4,7,'#1A6B1A'],[5,7,'#228B22'],[6,7,'#2EA043'],[7,7,'#33CC33'],[8,7,'#33CC33'],[9,7,'#2EA043'],[10,7,'#228B22'],[11,7,'#1A6B1A'],
    [4,8,'#1A6B1A'],[5,8,'#228B22'],[6,8,'#33CC33'],[7,8,'#2EA043'],[8,8,'#33CC33'],[9,8,'#228B22'],[10,8,'#2EA043'],[11,8,'#1A6B1A'],
    [4,9,'#1A6B1A'],[5,9,'#228B22'],[6,9,'#2EA043'],[7,9,'#228B22'],[8,9,'#228B22'],[9,9,'#2EA043'],[10,9,'#228B22'],[11,9,'#1A6B1A'],
    [5,10,'#228B22'],[6,10,'#1A6B1A'],[7,10,'#228B22'],[8,10,'#228B22'],[9,10,'#1A6B1A'],[10,10,'#228B22'],
    [6,11,'#228B22'],[7,11,'#1A6B1A'],[8,11,'#1A6B1A'],[9,11,'#228B22'],
    // Trunk
    [7,12,'#8B4513'],[8,12,'#A0522D'],
    [7,13,'#6B3410'],[8,13,'#8B4513'],
    [7,14,'#6B3410'],[8,14,'#6B3410'],
    // Soil
    [6,15,'#5A2D0C'],[7,15,'#6B3410'],[8,15,'#6B3410'],[9,15,'#5A2D0C']
  ];

  // ── Upgrade sprites (rendered with renderSprite like tree/house) ──
  var UPGRADE_PIXEL = 3;

  // 8×16 sprinkler: grey base, blue pipe, water drops
  var SPRINKLER_SPRITE = [
    // Base plate
    [2,15,'#6B6B6B'],[3,15,'#808080'],[4,15,'#808080'],[5,15,'#6B6B6B'],
    [3,14,'#808080'],[4,14,'#808080'],
    // Vertical pipe
    [3,13,'#5A5A5A'],[4,13,'#7A7A7A'],
    [3,12,'#5A5A5A'],[4,12,'#7A7A7A'],
    [3,11,'#5A5A5A'],[4,11,'#7A7A7A'],
    [3,10,'#5A5A5A'],[4,10,'#7A7A7A'],
    [3,9,'#5A5A5A'],[4,9,'#7A7A7A'],
    [3,8,'#5A5A5A'],[4,8,'#7A7A7A'],
    // Sprinkler head / nozzle
    [2,7,'#4A4A4A'],[3,7,'#5A5A5A'],[4,7,'#7A7A7A'],[5,7,'#4A4A4A'],
    [1,6,'#4A4A4A'],[2,6,'#5A5A5A'],[3,6,'#6A6A6A'],[4,6,'#6A6A6A'],[5,6,'#5A5A5A'],[6,6,'#4A4A4A'],
    // Water spray — left arc
    [0,5,'#4A9EFF'],[1,4,'#6DB3FF'],[0,3,'#8AD4FF'],
    // Water spray — right arc
    [7,5,'#4A9EFF'],[6,4,'#6DB3FF'],[7,3,'#8AD4FF'],
    // Water drops — centre
    [3,4,'#4A9EFF'],[4,4,'#4A9EFF'],
    [2,3,'#6DB3FF'],[5,3,'#6DB3FF'],
    [3,2,'#8AD4FF'],[4,2,'#8AD4FF'],
    [1,1,'#B0E0FF'],[6,1,'#B0E0FF'],
    [3,0,'#B0E0FF'],[4,0,'#B0E0FF']
  ];

  // 12×16 scarecrow: post, crossbar with shirt, head with hat
  var SCARECROW_SPRITE = [
    // Ground / base
    [5,15,'#5A2D0C'],[6,15,'#6B3410'],[7,15,'#5A2D0C'],
    // Vertical post
    [6,14,'#8B4513'],[6,13,'#8B4513'],[6,12,'#A0522D'],
    [6,11,'#8B4513'],[6,10,'#A0522D'],[6,9,'#8B4513'],
    // Crossbar (arms)
    [2,8,'#8B4513'],[3,8,'#A0522D'],[4,8,'#8B4513'],[5,8,'#A0522D'],
    [6,8,'#8B4513'],
    [7,8,'#A0522D'],[8,8,'#8B4513'],[9,8,'#A0522D'],[10,8,'#8B4513'],
    // Shirt / fabric on crossbar
    [3,9,'#8B2252'],[4,9,'#8B2252'],[5,9,'#A0294F'],
    [7,9,'#A0294F'],[8,9,'#8B2252'],[9,9,'#8B2252'],
    [4,10,'#8B2252'],[5,10,'#A0294F'],
    [7,10,'#A0294F'],[8,10,'#8B2252'],
    // Hands
    [1,8,'#DAA520'],[11,8,'#DAA520'],
    // Head
    [5,7,'#DAA520'],[6,7,'#F0C040'],[7,7,'#DAA520'],
    [5,6,'#F0C040'],[6,6,'#DAA520'],[7,6,'#F0C040'],
    [5,5,'#DAA520'],[6,5,'#F0C040'],[7,5,'#DAA520'],
    // Eyes
    [5,6,'#2C2C2C'],[7,6,'#2C2C2C'],
    // Hat brim
    [3,4,'#5A2D0C'],[4,4,'#6B3410'],[5,4,'#6B3410'],[6,4,'#6B3410'],[7,4,'#6B3410'],[8,4,'#6B3410'],[9,4,'#5A2D0C'],
    // Hat top
    [4,3,'#5A2D0C'],[5,3,'#6B3410'],[6,3,'#8B4513'],[7,3,'#6B3410'],[8,3,'#5A2D0C'],
    [5,2,'#5A2D0C'],[6,2,'#6B3410'],[7,2,'#5A2D0C']
  ];

  // ── Farm upgrade definitions ─────────────────────────────
  var FARM_UPGRADES = {
    sprinkler: {
      name: 'Sprinkler',
      type: 'leveled',
      maxLevel: 3,
      costs: [100, 250, 500],
      effects: [
        { interval: 120000, desc: 'Auto-water every 2min' },
        { interval: 60000,  desc: 'Auto-water every 1min' },
        { interval: 30000,  desc: 'Auto-water every 30s' }
      ]
    },
    fertilizer: {
      name: 'Fertilizer',
      type: 'consumable',
      cost: 25,
      bulkAmount: 5,
      bulkCost: 125,
      desc: 'Halves remaining grow time on target plot'
    },
    scarecrow: {
      name: 'Scarecrow',
      type: 'leveled',
      maxLevel: 3,
      costs: [75, 200, 400],
      effects: [
        { bonus: 0.05, desc: '+5% bonus JB on harvest' },
        { bonus: 0.10, desc: '+10% bonus JB on harvest' },
        { bonus: 0.15, desc: '+15% bonus JB on harvest' }
      ]
    },
    goldenTrowel: {
      name: 'Golden Trowel',
      type: 'leveled',
      maxLevel: 3,
      costs: [200, 500, 1000],
      effects: [
        { bonus: 1.25, desc: '+25% sell price' },
        { bonus: 1.40, desc: '+40% sell price' },
        { bonus: 1.60, desc: '+60% sell price' }
      ]
    },
    seedBag: {
      name: 'Seed Bag',
      type: 'leveled',
      maxLevel: 3,
      costs: [150, 350, 700],
      effects: [
        { chance: 0.15, desc: '15% free seed on harvest' },
        { chance: 0.25, desc: '25% free seed on harvest' },
        { chance: 0.35, desc: '35% free seed on harvest' }
      ]
    }
  };

  // ── Farmhouse level definitions ──────────────────────────
  var FARMHOUSE_LEVELS = {
    1: { name: 'Dirt Shack',       cost: 0,    sellBonus: 1.0,  growBonus: 1.0,  autoWater: false },
    2: { name: 'Wooden Cabin',     cost: 100,  sellBonus: 1.1,  growBonus: 1.0,  autoWater: false },
    3: { name: 'Stone Farmhouse',  cost: 300,  sellBonus: 1.2,  growBonus: 0.9,  autoWater: false },
    4: { name: 'Manor',            cost: 800,  sellBonus: 1.3,  growBonus: 0.85, autoWater: true },
    5: { name: 'Golden Estate',    cost: 2000, sellBonus: 1.5,  growBonus: 0.75, autoWater: true }
  };

  // ── State ───────────────────────────────────────────────
  var farmState = loadState();
  var farmBarEl;
  var farmSceneEl;
  var updateTimer;
  var farmhouseEl;
  var farmhousePanelEl;
  var sprinklerTimer = null;
  var upgradeInfoEl = null;

  function defaultState() {
    return {
      plots: [{ crop: null }, { crop: null }],
      unlockedPlots: 2,
      inventory: {},
      farmhouse: { level: 1 },
      upgrades: { sprinkler: 0, fertilizer: 0, scarecrow: 0, goldenTrowel: 0, seedBag: 0 },
      cosmetics: { farmerHat: false, dirtTrail: false, overgrownTheme: false, harvestMoon: false }
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.plots) {
          // Backward-compatible migration
          if (!saved.inventory) saved.inventory = {};
          if (!saved.farmhouse) saved.farmhouse = { level: 1 };
          if (!saved.unlockedPlots) saved.unlockedPlots = saved.plots.length;
          if (!saved.upgrades) saved.upgrades = { sprinkler: 0, fertilizer: 0, scarecrow: 0, goldenTrowel: 0, seedBag: 0 };
          if (!saved.cosmetics) saved.cosmetics = { farmerHat: false, dirtTrail: false, overgrownTheme: false, harvestMoon: false };
          return saved;
        }
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(farmState));
    } catch (e) {}
  }

  // ── Farmhouse bonuses ─────────────────────────────────────
  function applyFarmhouseBonuses() {
    var level = farmState.farmhouse ? farmState.farmhouse.level : 1;
    var def = FARMHOUSE_LEVELS[level] || FARMHOUSE_LEVELS[1];
    var farmhouseSellBonus = def.sellBonus;
    farmhouseGrowMultiplier = def.growBonus;

    // Golden trowel multiplier (stacks multiplicatively)
    var trowelLevel = farmState.upgrades ? farmState.upgrades.goldenTrowel : 0;
    var trowelBonus = trowelLevel > 0 ? FARM_UPGRADES.goldenTrowel.effects[trowelLevel - 1].bonus : 1;
    sellMultiplier = farmhouseSellBonus * trowelBonus;

    // Auto-water at level 4+
    if (def.autoWater) {
      autoWaterAllPlots();
    }
  }

  function autoWaterAllPlots() {
    var changed = false;
    for (var i = 0; i < farmState.plots.length; i++) {
      var plot = farmState.plots[i];
      if (!plot || !plot.crop) continue;
      var stage = getPlotStage(plot);
      if (stage === 'ready' || stage === 'planted') continue;
      if (plot.wateredAt) continue;

      var crop = CROPS[plot.crop];
      if (!crop) continue;

      var boost = Math.floor(crop.growTime * 0.10);
      plot.plantedAt -= boost;
      plot.wateredAt = Date.now();
      changed = true;
    }
    if (changed) {
      saveState();
    }
  }

  // ── Growth engine ───────────────────────────────────────
  function getEffectiveGrowTime(crop) {
    return crop.growTime * growTimeMultiplier * farmhouseGrowMultiplier;
  }

  function getPlotStage(plot) {
    if (!plot || !plot.crop) return null;
    var crop = CROPS[plot.crop];
    if (!crop) return null;
    var elapsed = Date.now() - plot.plantedAt;
    var effectiveTime = getEffectiveGrowTime(crop);
    var pct = elapsed / effectiveTime;
    if (pct >= 1) return 'ready';
    if (pct >= 0.75) return 'flowering';
    if (pct >= 0.50) return 'growing';
    if (pct >= 0.25) return 'sprouting';
    return 'planted';
  }

  function getGrowthPct(plot) {
    if (!plot || !plot.crop) return 0;
    var crop = CROPS[plot.crop];
    if (!crop) return 0;
    var elapsed = Date.now() - plot.plantedAt;
    var effectiveTime = getEffectiveGrowTime(crop);
    return Math.min(1, elapsed / effectiveTime);
  }

  // ── Sprite rendering (box-shadow pixel art) ─────────────
  function renderSprite(container, pixels, scale) {
    container.innerHTML = '';
    if (!pixels || !pixels.length) return;

    var px = scale || PIXEL;
    var canvas = document.createElement('div');
    canvas.className = 'farm-crop-canvas';
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';

    var shadows = [];
    for (var i = 0; i < pixels.length; i++) {
      var p = pixels[i];
      shadows.push((p[0] * px) + 'px ' + (p[1] * px) + 'px 0 0 ' + p[2]);
    }
    canvas.style.boxShadow = shadows.join(',');
    container.appendChild(canvas);
  }

  // ── DOM creation ────────────────────────────────────────
  function createFarmScene() {
    farmSceneEl = document.createElement('div');
    farmSceneEl.className = 'farm-scene';
    farmSceneEl.id = 'farm-scene';
    document.body.appendChild(farmSceneEl);
  }

  function createFarmBar() {
    farmBarEl = document.createElement('div');
    farmBarEl.className = 'farm-bar';
    farmBarEl.id = 'farm-bar';

    createDashboardTiles();

    farmSceneEl.appendChild(farmBarEl);

    // Sync visibility with pet
    syncVisibility();
  }

  // ── Dashboard tile creation ──────────────────────────
  function createDashboardTiles() {
    while (farmBarEl.firstChild) farmBarEl.removeChild(farmBarEl.firstChild);

    for (var i = 0; i < DASHBOARD_TILES.length; i++) {
      var conf = DASHBOARD_TILES[i];

      // Skip unbuilt resource stations
      if (conf.resource && window.FarmResources && !window.FarmResources.isStationBuilt(conf.key)) {
        continue;
      }

      farmBarEl.appendChild(createDashTile(conf));
    }
  }

  function createDashTile(conf) {
    var tile = document.createElement('div');
    tile.className = 'farm-dash-tile';
    tile.setAttribute('data-tile', conf.key);

    if (conf.key === 'farmLink') {
      tile.classList.add('farm-dash-link');
    }

    // Icon
    var icon = document.createElement('div');
    icon.className = 'farm-dash-icon';
    icon.textContent = conf.icon;
    tile.appendChild(icon);

    // Count badge
    var count = document.createElement('div');
    count.className = 'farm-dash-count';
    count.id = 'farm-dash-count-' + conf.key;
    tile.appendChild(count);

    // Label for farm link tile
    if (conf.label) {
      var label = document.createElement('div');
      label.className = 'farm-dash-label';
      label.textContent = conf.label;
      tile.appendChild(label);
    }

    // Click → navigate to farm page
    tile.addEventListener('click', function () {
      window.location.href = '/games/farm/';
    });

    updateDashTile(tile, conf);
    return tile;
  }

  function getDashTileCount(conf) {
    if (conf.key === 'crops') {
      var readyCount = 0;
      for (var i = 0; i < farmState.plots.length; i++) {
        var plot = farmState.plots[i];
        if (plot && plot.crop && getPlotStage(plot) === 'ready') {
          readyCount++;
        }
      }
      return readyCount;
    }
    if (conf.resource && window.FarmResources) {
      return window.FarmResources.getRaw(conf.resource);
    }
    return 0;
  }

  function updateDashTile(tile, conf) {
    if (conf.key === 'farmLink') return;

    var countEl = tile.querySelector('.farm-dash-count');
    var count = getDashTileCount(conf);

    if (countEl) {
      countEl.textContent = count > 0 ? count : '';
    }

    // Pulse animation when count > 0
    if (count > 0) {
      tile.classList.add('farm-dash-has-count');
    } else {
      tile.classList.remove('farm-dash-has-count');
    }
  }

  // ── Update all dashboard tiles ──────────────────────────
  function updatePlots() {
    if (!farmBarEl) return;
    var tiles = farmBarEl.querySelectorAll('.farm-dash-tile');
    for (var i = 0; i < tiles.length; i++) {
      var key = tiles[i].getAttribute('data-tile');
      for (var j = 0; j < DASHBOARD_TILES.length; j++) {
        if (DASHBOARD_TILES[j].key === key) {
          updateDashTile(tiles[i], DASHBOARD_TILES[j]);
          break;
        }
      }
    }
  }


  // ── Upgrade info popup ────────────────────────────────────
  function openUpgradeInfo(key, targetEl) {
    closeUpgradeInfo();
    var upgrades = farmState.upgrades || {};
    var level = upgrades[key] || 0;
    if (level <= 0 || !FARM_UPGRADES[key]) return;

    var upgrade = FARM_UPGRADES[key];
    var effect = upgrade.effects[level - 1];

    upgradeInfoEl = document.createElement('div');
    upgradeInfoEl.className = 'farm-upgrade-info';

    var nameRow = document.createElement('div');
    nameRow.className = 'farm-plot-info-name';
    nameRow.textContent = upgrade.name + ' Lv.' + level;
    upgradeInfoEl.appendChild(nameRow);

    var descRow = document.createElement('div');
    descRow.className = 'farm-plot-info-stage';
    descRow.textContent = effect.desc;
    upgradeInfoEl.appendChild(descRow);

    var rect = targetEl.getBoundingClientRect();
    upgradeInfoEl.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 150)) + 'px';
    upgradeInfoEl.style.bottom = (window.innerHeight - rect.top + 4) + 'px';

    document.body.appendChild(upgradeInfoEl);

    setTimeout(function () {
      document.addEventListener('click', outsideUpgradeInfoClick);
    }, 0);
  }

  function outsideUpgradeInfoClick(e) {
    if (upgradeInfoEl && !upgradeInfoEl.contains(e.target)) {
      closeUpgradeInfo();
    }
  }

  function closeUpgradeInfo() {
    if (upgradeInfoEl && upgradeInfoEl.parentNode) {
      upgradeInfoEl.parentNode.removeChild(upgradeInfoEl);
    }
    upgradeInfoEl = null;
    document.removeEventListener('click', outsideUpgradeInfoClick);
  }


  // ── Plant seed ──────────────────────────────────────────
  function plantSeed(plotIndex, cropKey) {
    // Check inventory for non-free crops
    if (!FREE_CROPS[cropKey]) {
      var count = farmState.inventory[cropKey] || 0;
      if (count <= 0) return;
      farmState.inventory[cropKey] = count - 1;
    }

    farmState.plots[plotIndex] = {
      crop: cropKey,
      plantedAt: Date.now()
    };
    saveState();
    updatePlots();
  }

  // ── JB float particle ──────────────────────────────────
  function showJBFloat(plotIndex, amount) {
    var el = farmBarEl ? farmBarEl.querySelector('[data-tile="crops"]') : null;
    if (!el) return;

    var rect = el.getBoundingClientRect();
    var float = document.createElement('div');
    float.className = 'farm-jb-float';
    float.textContent = '+' + amount + ' JB';
    float.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    float.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(float);

    setTimeout(function () {
      if (float.parentNode) float.parentNode.removeChild(float);
    }, 1000);
  }

  // ── Seed drop float particle ───────────────────────────
  function showSeedFloat(plotIndex, cropKey) {
    var el = farmBarEl ? farmBarEl.querySelector('[data-tile="crops"]') : null;
    if (!el) return;
    var crop = CROPS[cropKey];
    if (!crop) return;

    var rect = el.getBoundingClientRect();
    var float = document.createElement('div');
    float.className = 'farm-seed-float';
    float.textContent = '+1 ' + crop.name + ' seed';
    float.style.left = (rect.left + rect.width / 2 - 30) + 'px';
    float.style.top = (rect.top - 25) + 'px';
    document.body.appendChild(float);

    setTimeout(function () {
      if (float.parentNode) float.parentNode.removeChild(float);
    }, 1200);
  }

  // ── Sprinkler timer ────────────────────────────────────
  function startSprinklerTimer() {
    if (sprinklerTimer) clearInterval(sprinklerTimer);
    var level = farmState.upgrades ? farmState.upgrades.sprinkler : 0;
    if (level <= 0) return;

    var interval = FARM_UPGRADES.sprinkler.effects[level - 1].interval;
    sprinklerTimer = setInterval(function () {
      autoWaterAllPlots();
      updatePlots();
    }, interval);
  }

  // ── Fertilizer ─────────────────────────────────────────
  function useFertilizer(plotIndex) {
    if (!farmState.upgrades || farmState.upgrades.fertilizer <= 0) return false;
    var plot = farmState.plots[plotIndex];
    if (!plot || !plot.crop) return false;
    var stage = getPlotStage(plot);
    if (stage === 'ready') return false;

    var crop = CROPS[plot.crop];
    if (!crop) return false;

    var effectiveTime = getEffectiveGrowTime(crop);
    var elapsed = Date.now() - plot.plantedAt;
    var remaining = effectiveTime - elapsed;
    if (remaining <= 0) return false;

    // Shift plantedAt backward by half the remaining time
    plot.plantedAt -= Math.floor(remaining / 2);
    farmState.upgrades.fertilizer--;
    saveState();
    updatePlots();
    return true;
  }

  // ── Time formatting ─────────────────────────────────────
  function formatTime(ms) {
    var mins = Math.round(ms / 60000);
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    var rem = mins % 60;
    return rem > 0 ? hrs + 'h ' + rem + 'm' : hrs + 'h';
  }

  function formatTimeRemaining(plot) {
    if (!plot || !plot.crop) return '';
    var crop = CROPS[plot.crop];
    if (!crop) return '';
    var elapsed = Date.now() - plot.plantedAt;
    var effectiveTime = getEffectiveGrowTime(crop);
    var remaining = Math.max(0, effectiveTime - elapsed);
    if (remaining <= 0) return 'Ready!';
    return formatTime(remaining);
  }

  // ── Visibility sync with pet ────────────────────────────
  function syncVisibility() {
    var hidden = false;
    try {
      var petRaw = localStorage.getItem('arebooksgood-pet');
      if (petRaw) {
        var petData = JSON.parse(petRaw);
        if (petData && petData.visible === false) {
          hidden = true;
        }
      }
    } catch (e) {}

    if (farmSceneEl) farmSceneEl.style.display = hidden ? 'none' : '';
  }

  // Hook into pet toggle
  function watchPetToggle() {
    var origToggle = window.PetSystem && window.PetSystem.toggle;
    if (origToggle) {
      window.PetSystem.toggle = function () {
        origToggle();
        syncVisibility();
      };
    }
  }

  // ── Farmhouse Widget ──────────────────────────────────────
  function createFarmhouseWidget() {
    farmhouseEl = document.createElement('div');
    farmhouseEl.className = 'farm-house-widget';
    farmhouseEl.id = 'farm-house-widget';
    farmhouseEl.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFarmhousePanel();
    });

    renderFarmhouseSprite();
    farmSceneEl.appendChild(farmhouseEl);
  }

  var farmhousePetEl = null;
  var farmPetSpeechEl = null;
  var miniPetBusy = false;
  var miniPetHomeLeft = 0;
  var miniSpeechTimer = null;
  var miniTypewriterTimer = null;
  var miniCelebrateTimeout = null;
  var miniSadTimeout = null;

  function renderFarmhouseSprite() {
    if (!farmhouseEl) return;
    var level = farmState.farmhouse ? farmState.farmhouse.level : 1;
    var pixels = FARMHOUSE_SPRITES[level] || FARMHOUSE_SPRITES[1];
    farmhouseEl.innerHTML = '';
    var spriteContainer = document.createElement('div');
    spriteContainer.className = 'farm-house-sprite';
    renderSprite(spriteContainer, pixels, HOUSE_PIXEL);
    farmhouseEl.appendChild(spriteContainer);

    // Render pet at farmhouse
    renderFarmhousePet();
  }

  function renderFarmhousePet() {
    // Remove existing
    if (farmhousePetEl && farmhousePetEl.parentNode) farmhousePetEl.parentNode.removeChild(farmhousePetEl);
    farmhousePetEl = null;
    farmPetSpeechEl = null;

    if (!window.PetSystem || !window.PetSystem.renderMiniSprite) return;
    if (!farmSceneEl) return;
    var ps = window.PetSystem.getState && window.PetSystem.getState();
    if (!ps) return;

    farmhousePetEl = document.createElement('div');
    farmhousePetEl.className = 'farm-house-pet';
    window.PetSystem.renderMiniSprite(farmhousePetEl, 2);
    // renderMiniSprite sets position:relative — override back to absolute
    farmhousePetEl.style.position = 'absolute';

    // Create speech bubble
    farmPetSpeechEl = document.createElement('div');
    farmPetSpeechEl.className = 'farm-pet-speech';
    farmhousePetEl.appendChild(farmPetSpeechEl);

    // Append to farm scene (not farmhouse) for scene-level walking
    farmSceneEl.appendChild(farmhousePetEl);

    // Set home position at farmhouse center
    updateMiniPetHomePos();

    // Click to beam pet back to page
    farmhousePetEl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.PetSystem && window.PetSystem.beamToPage) {
        window.PetSystem.beamToPage();
      }
    });

    // Only show if pet is beamed to farm
    if (window.PetSystem.isBeamed && window.PetSystem.isBeamed()) {
      farmhousePetEl.style.display = 'block';
    }
  }

  function updateMiniPetHomePos() {
    if (!farmhousePetEl || !farmhouseEl) return;
    var houseRect = farmhouseEl.getBoundingClientRect();
    var petWidth = farmhousePetEl.offsetWidth || 32;
    miniPetHomeLeft = houseRect.left + houseRect.width / 2 - petWidth / 2;
    farmhousePetEl.style.left = miniPetHomeLeft + 'px';
  }

  // ── Mini pet walking ──────────────────────────────────
  function walkMiniPetToPlot(plotIndex, callback) {
    if (!farmhousePetEl) { if (callback) callback(); return; }
    // Walk to crops dashboard tile
    var tileEl = farmBarEl ? farmBarEl.querySelector('[data-tile="crops"]') : null;
    if (!tileEl) { if (callback) callback(); return; }

    var tileRect = tileEl.getBoundingClientRect();
    var petWidth = farmhousePetEl.offsetWidth || 32;
    var targetLeft = tileRect.left + tileRect.width / 2 - petWidth / 2;

    farmhousePetEl.style.left = targetLeft + 'px';

    setTimeout(function () {
      if (callback) callback();
    }, 850);
  }

  function returnMiniPetHome(callback) {
    if (!farmhousePetEl) { if (callback) callback(); return; }
    updateMiniPetHomePos();
    // Home pos already set by updateMiniPetHomePos, just animate there
    // (left is already set, transition handles it)

    setTimeout(function () {
      if (callback) callback();
    }, 850);
  }

  // ── Mini pet speech ───────────────────────────────────
  function miniPetSpeak(message) {
    if (!farmPetSpeechEl || !farmhousePetEl) return;
    if (farmhousePetEl.style.display === 'none') return;

    if (miniTypewriterTimer) clearTimeout(miniTypewriterTimer);
    if (miniSpeechTimer) clearTimeout(miniSpeechTimer);

    farmPetSpeechEl.textContent = '';
    farmPetSpeechEl.style.display = 'block';

    var i = 0;
    function typeNext() {
      if (i < message.length) {
        farmPetSpeechEl.textContent += message[i];
        i++;
        miniTypewriterTimer = setTimeout(typeNext, 30);
      } else {
        miniTypewriterTimer = null;
        miniSpeechTimer = setTimeout(function () {
          farmPetSpeechEl.style.display = 'none';
        }, 2500);
      }
    }
    typeNext();
  }

  // ── Mini pet celebrate ────────────────────────────────
  function miniPetCelebrate() {
    if (!farmhousePetEl) return;
    if (miniCelebrateTimeout) clearTimeout(miniCelebrateTimeout);
    farmhousePetEl.classList.remove('farm-pet-sad');
    farmhousePetEl.classList.add('farm-pet-celebrating');
    miniCelebrateTimeout = setTimeout(function () {
      if (farmhousePetEl) farmhousePetEl.classList.remove('farm-pet-celebrating');
    }, 2000);
  }

  // ── Mini pet sad ──────────────────────────────────────
  function miniPetSad() {
    if (!farmhousePetEl) return;
    if (miniSadTimeout) clearTimeout(miniSadTimeout);
    farmhousePetEl.classList.remove('farm-pet-celebrating');
    farmhousePetEl.classList.add('farm-pet-sad');
    miniSadTimeout = setTimeout(function () {
      if (farmhousePetEl) farmhousePetEl.classList.remove('farm-pet-sad');
    }, 3000);
  }

  // ── Beam arrived (pet.js calls this after beam-up) ────
  function beamArrived() {
    renderFarmhousePet();
    if (farmhousePetEl) {
      updateMiniPetHomePos();
      farmhousePetEl.style.display = 'block';
      farmhousePetEl.classList.add('farm-pet-beaming-down');
      setTimeout(function () {
        if (farmhousePetEl) farmhousePetEl.classList.remove('farm-pet-beaming-down');
      }, 800);
    }

    // Pet speaks a farm arrival line via mini pet speech
    var lines = {
      cat: '*teleports* ...where are the treats?',
      dragon: '*materializes* my farm!',
      robot: 'LOCATION: FARM. STATUS: OPERATIONAL'
    };
    var ps = window.PetSystem && window.PetSystem.getState && window.PetSystem.getState();
    var petId = ps ? ps.petId : 'cat';
    setTimeout(function () {
      miniPetSpeak(lines[petId] || 'arrived!');
    }, 850);
  }

  // ── Beam departing (pet.js calls this before beam-down) ──
  function beamDeparting(callback) {
    miniPetBusy = false;
    if (!farmhousePetEl) {
      if (callback) callback();
      return;
    }
    // Return home first if walking
    updateMiniPetHomePos();
    farmhousePetEl.classList.add('farm-pet-beaming-up');
    setTimeout(function () {
      if (farmhousePetEl) {
        farmhousePetEl.style.display = 'none';
        farmhousePetEl.classList.remove('farm-pet-beaming-up');
      }
      if (callback) callback();
    }, 800);
  }

  function toggleFarmhousePanel() {
    if (farmhousePanelEl) {
      closeFarmhousePanel();
      return;
    }
    openFarmhousePanel();
  }

  function getPetBonusText() {
    if (!window.PetSystem || !window.PetSystem.getState) return null;
    var ps = window.PetSystem.getState();
    if (!ps) return null;
    var id = ps.petId;
    var lv = ps.level;
    if (id === 'cat') {
      return 'Cat: Green Paw (15% auto-replant)';
    }
    if (id === 'dragon') {
      var pct = lv === 1 ? 10 : lv === 2 ? 15 : 20;
      return 'Dragon: ' + pct + '% win bonus';
    }
    if (id === 'robot') {
      var every = lv === 1 ? 10 : lv === 2 ? 8 : 5;
      var pct = lv === 1 ? 30 : lv === 2 ? 40 : 50;
      return 'Robot: ' + pct + '% every ' + every + ' games';
    }
    return null;
  }

  function openFarmhousePanel() {
    closeFarmhousePanel();

    var level = farmState.farmhouse ? farmState.farmhouse.level : 1;
    var def = FARMHOUSE_LEVELS[level];

    farmhousePanelEl = document.createElement('div');
    farmhousePanelEl.className = 'farm-house-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'farm-house-panel-header';
    header.textContent = def.name + ' (Lv.' + level + ')';
    farmhousePanelEl.appendChild(header);

    // Bonuses summary
    var bonuses = document.createElement('div');
    bonuses.className = 'farm-house-panel-bonuses';
    var bonusLines = [];
    if (def.sellBonus > 1) bonusLines.push('+' + Math.round((def.sellBonus - 1) * 100) + '% sell price');
    if (def.growBonus < 1) bonusLines.push(Math.round((1 - def.growBonus) * 100) + '% faster growth');
    if (def.autoWater) bonusLines.push('Auto-water');
    if (level >= 5) bonusLines.push('Rare seed drops');
    // Pet bonus
    var petBonus = getPetBonusText();
    if (petBonus) bonusLines.push(petBonus);

    // Tool bonuses
    var upgrades = farmState.upgrades || {};
    if (upgrades.sprinkler > 0) {
      var sprInterval = FARM_UPGRADES.sprinkler.effects[upgrades.sprinkler - 1].interval;
      bonusLines.push('Sprinkler Lv.' + upgrades.sprinkler + ' (' + (sprInterval / 1000) + 's)');
    }
    if (upgrades.scarecrow > 0) {
      var scBonus = FARM_UPGRADES.scarecrow.effects[upgrades.scarecrow - 1].bonus;
      bonusLines.push('+' + Math.round(scBonus * 100) + '% harvest bonus');
    }
    if (upgrades.goldenTrowel > 0) {
      var gtBonus = FARM_UPGRADES.goldenTrowel.effects[upgrades.goldenTrowel - 1].bonus;
      bonusLines.push(gtBonus.toFixed(2) + 'x sell multiplier');
    }
    if (upgrades.seedBag > 0) {
      var sbChance = FARM_UPGRADES.seedBag.effects[upgrades.seedBag - 1].chance;
      bonusLines.push(Math.round(sbChance * 100) + '% free seed chance');
    }
    if (upgrades.fertilizer > 0) {
      bonusLines.push('Fertilizer x' + upgrades.fertilizer);
    }

    if (bonusLines.length > 0) {
      for (var b = 0; b < bonusLines.length; b++) {
        var bonusLine = document.createElement('div');
        bonusLine.className = 'farm-house-panel-bonus-line';
        bonusLine.textContent = bonusLines[b];
        bonuses.appendChild(bonusLine);
      }
    } else {
      bonuses.textContent = 'No bonuses yet';
    }
    farmhousePanelEl.appendChild(bonuses);

    // Crop timers
    var timers = document.createElement('div');
    timers.className = 'farm-house-panel-timers';
    var hasTimer = false;
    for (var i = 0; i < farmState.plots.length; i++) {
      var plot = farmState.plots[i];
      if (plot && plot.crop) {
        var crop = CROPS[plot.crop];
        if (crop) {
          var row = document.createElement('div');
          row.className = 'farm-house-timer-row';
          row.textContent = crop.name + ': ' + formatTimeRemaining(plot);
          timers.appendChild(row);
          hasTimer = true;
        }
      }
    }
    if (!hasTimer) {
      var empty = document.createElement('div');
      empty.className = 'farm-house-timer-row';
      empty.textContent = 'No crops growing';
      timers.appendChild(empty);
    }
    farmhousePanelEl.appendChild(timers);

    // Quick-sell button (sell all ready crops)
    var readyCount = 0;
    var readyValue = 0;
    for (var j = 0; j < farmState.plots.length; j++) {
      var p = farmState.plots[j];
      if (p && p.crop && getPlotStage(p) === 'ready') {
        var c = CROPS[p.crop];
        if (c) {
          readyCount++;
          readyValue += Math.round(c.sell * sellMultiplier);
        }
      }
    }
    if (readyCount > 0) {
      var sellBtn = document.createElement('button');
      sellBtn.className = 'farm-house-panel-sell';
      sellBtn.type = 'button';
      sellBtn.textContent = 'Sell all (' + readyCount + ') +' + readyValue + ' JB';
      sellBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        quickSellAll();
        closeFarmhousePanel();
      });
      farmhousePanelEl.appendChild(sellBtn);
    }

    // Lifetime JB stat
    if (window.JackBucks && window.JackBucks.getStats) {
      var stats = window.JackBucks.getStats();
      var lifetime = document.createElement('div');
      lifetime.className = 'farm-house-panel-stat';
      lifetime.textContent = 'Lifetime earned: ' + stats.totalEarned + ' JB';
      farmhousePanelEl.appendChild(lifetime);
    }

    farmhouseEl.appendChild(farmhousePanelEl);

    // Close on outside click
    setTimeout(function () {
      document.addEventListener('click', outsideFarmhousePanelClick);
    }, 0);
  }

  function outsideFarmhousePanelClick(e) {
    if (farmhousePanelEl && !farmhousePanelEl.contains(e.target) &&
        farmhouseEl && !farmhouseEl.contains(e.target)) {
      closeFarmhousePanel();
    }
  }

  function closeFarmhousePanel() {
    if (farmhousePanelEl && farmhousePanelEl.parentNode) {
      farmhousePanelEl.parentNode.removeChild(farmhousePanelEl);
    }
    farmhousePanelEl = null;
    document.removeEventListener('click', outsideFarmhousePanelClick);
  }

  function quickSellAll() {
    var totalSold = 0;
    for (var i = 0; i < farmState.plots.length; i++) {
      var plot = farmState.plots[i];
      if (plot && plot.crop && getPlotStage(plot) === 'ready') {
        var crop = CROPS[plot.crop];
        if (crop) {
          var val = Math.round(crop.sell * sellMultiplier);
          totalSold += val;
          farmState.plots[i] = { crop: null };
        }
      }
    }
    if (totalSold > 0 && window.JackBucks) {
      window.JackBucks.add(totalSold);
    }
    saveState();
    updatePlots();
  }

  // ── FarmhouseWidget global API ────────────────────────────
  window.FarmhouseWidget = {
    refresh: function () {
      applyFarmhouseBonuses();
      renderFarmhouseSprite();
      updatePlots();
    }
  };

  // ── Rebuild farm bar when plots change ────────────────────
  function rebuildFarmBar() {
    if (!farmBarEl) return;
    createDashboardTiles();
    createUpgradeDecorations();
  }

  // ── FarmAPI — exposed for pet-farm-ai.js & silk-road.js ──
  window.FarmAPI = {
    getPlots: function () {
      if (!farmState) return [];
      var result = [];
      for (var i = 0; i < farmState.plots.length; i++) {
        var plot = farmState.plots[i];
        result.push({
          index: i,
          crop: plot.crop || null,
          stage: getPlotStage(plot),
          growthPct: getGrowthPct(plot),
          wateredAt: plot.wateredAt || null,
          timeRemaining: formatTimeRemaining(plot)
        });
      }
      return result;
    },

    harvest: function (plotIndex) {
      var plot = farmState.plots[plotIndex];
      if (!plot || !plot.crop) return null;
      if (getPlotStage(plot) !== 'ready') return null;

      var crop = CROPS[plot.crop];
      if (!crop) return null;

      var cropKey = plot.crop;
      var sellValue = Math.round(crop.sell * sellMultiplier);

      // Scarecrow bonus
      var scarecrowLevel = farmState.upgrades ? farmState.upgrades.scarecrow : 0;
      if (scarecrowLevel > 0) {
        var scarecrowBonus = FARM_UPGRADES.scarecrow.effects[scarecrowLevel - 1].bonus;
        sellValue = Math.round(sellValue * (1 + scarecrowBonus));
      }

      if (window.JackBucks) {
        window.JackBucks.add(sellValue);
      }

      // Seed bag chance
      var seedBagLevel = farmState.upgrades ? farmState.upgrades.seedBag : 0;
      if (seedBagLevel > 0) {
        var seedDropChance = FARM_UPGRADES.seedBag.effects[seedBagLevel - 1].chance;
        if (Math.random() < seedDropChance) {
          farmState.inventory[cropKey] = (farmState.inventory[cropKey] || 0) + 1;
          showSeedFloat(plotIndex, cropKey);
        }
      }

      farmState.plots[plotIndex] = { crop: null };
      saveState();
      updatePlots();
      showJBFloat(plotIndex, sellValue);

      return { crop: cropKey, amount: sellValue };
    },

    plant: function (plotIndex, cropKey) {
      if (!CROPS[cropKey]) return false;
      if (plotIndex < 0 || plotIndex >= farmState.plots.length) return false;
      var plot = farmState.plots[plotIndex];
      if (plot && plot.crop) return false; // already planted

      plantSeed(plotIndex, cropKey);
      return true;
    },

    getPlotElement: function (plotIndex) {
      if (!farmBarEl) return null;
      // Return crops dashboard tile (pet walks here for farming)
      return farmBarEl.querySelector('[data-tile="crops"]') || null;
    },

    setGrowTimeMultiplier: function (m) {
      growTimeMultiplier = m;
      updatePlots();
    },

    water: function (plotIndex) {
      var plot = farmState.plots[plotIndex];
      if (!plot || !plot.crop) return false;
      var stage = getPlotStage(plot);
      if (stage === 'ready' || stage === 'planted') return false;
      if (plot.wateredAt) return false; // already watered this cycle

      var crop = CROPS[plot.crop];
      if (!crop) return false;

      // Shift plantedAt forward by 10% of total grow time (speeds up growth)
      var boost = Math.floor(crop.growTime * 0.10);
      plot.plantedAt -= boost;
      plot.wateredAt = Date.now();
      saveState();
      updatePlots();
      return true;
    },

    showWaterParticle: function (plotIndex) {
      var plotEl = this.getPlotElement(plotIndex);
      if (!plotEl) return;

      var rect = plotEl.getBoundingClientRect();
      var particle = document.createElement('div');
      particle.className = 'farm-water-particle';
      particle.textContent = '\uD83D\uDCA7';
      particle.style.left = (rect.left + rect.width / 2 - 8) + 'px';
      particle.style.top = (rect.top - 5) + 'px';
      document.body.appendChild(particle);

      setTimeout(function () {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, 1200);
    },

    showHarvestParticle: function (plotIndex, cropKey) {
      var plotEl = this.getPlotElement(plotIndex);
      if (!plotEl) return;
      var crop = CROPS[cropKey];
      if (!crop) return;

      var rect = plotEl.getBoundingClientRect();
      var particle = document.createElement('div');
      particle.className = 'farm-harvest-particle';
      particle.textContent = crop.icon;
      particle.style.left = (rect.left + rect.width / 2 - 8) + 'px';
      particle.style.top = (rect.top - 5) + 'px';
      document.body.appendChild(particle);

      setTimeout(function () {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, 1200);
    },

    // ── New API methods for Silk Road ──────────────────────
    getInventory: function () {
      return farmState ? JSON.parse(JSON.stringify(farmState.inventory)) : {};
    },

    addSeeds: function (key, n) {
      if (!farmState || !CROPS[key] || n <= 0) return;
      farmState.inventory[key] = (farmState.inventory[key] || 0) + n;
      saveState();
    },

    getUnlockedPlots: function () {
      return farmState ? farmState.unlockedPlots : 2;
    },

    unlockPlot: function () {
      if (!farmState) return false;
      if (farmState.unlockedPlots >= 6) return false;
      farmState.unlockedPlots++;
      farmState.plots.push({ crop: null });
      saveState();
      rebuildFarmBar();
      return true;
    },

    getFarmhouseLevel: function () {
      return farmState && farmState.farmhouse ? farmState.farmhouse.level : 1;
    },

    setFarmhouseLevel: function (n) {
      if (!farmState) return;
      if (n < 1 || n > 5) return;
      farmState.farmhouse.level = n;
      saveState();
      applyFarmhouseBonuses();
      renderFarmhouseSprite();
      updatePlots();
    },

    setSellMultiplier: function (m) {
      sellMultiplier = m;
    },

    setFarmhouseGrowMultiplier: function (m) {
      farmhouseGrowMultiplier = m;
      updatePlots();
    },

    dim: function () {
      if (farmSceneEl && !farmSceneEl.classList.contains('farm-dimmed')) toggleDim();
    },

    undim: function () {
      if (farmSceneEl && farmSceneEl.classList.contains('farm-dimmed')) toggleDim();
    },

    isDimmed: function () {
      return farmSceneEl ? farmSceneEl.classList.contains('farm-dimmed') : false;
    },

    getCropDefs: function () {
      var defs = {};
      var keys = Object.keys(CROPS);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        defs[k] = {
          name: CROPS[k].name,
          growTime: CROPS[k].growTime,
          sell: CROPS[k].sell,
          seedCost: CROPS[k].seedCost,
          icon: CROPS[k].icon,
          rarity: CROPS[k].rarity || 'common',
          free: !!FREE_CROPS[k]
        };
      }
      return defs;
    },

    // ── Upgrade API ──────────────────────────────────────────
    getUpgrades: function () {
      if (!farmState || !farmState.upgrades) return { sprinkler: 0, fertilizer: 0, scarecrow: 0, goldenTrowel: 0, seedBag: 0 };
      return JSON.parse(JSON.stringify(farmState.upgrades));
    },

    setUpgradeLevel: function (key, level) {
      if (!farmState || !farmState.upgrades) return;
      if (!FARM_UPGRADES[key] || FARM_UPGRADES[key].type !== 'leveled') return;
      if (level < 0 || level > FARM_UPGRADES[key].maxLevel) return;
      farmState.upgrades[key] = level;
      saveState();
      applyFarmhouseBonuses();
      if (key === 'sprinkler') startSprinklerTimer();
      createUpgradeDecorations();
      updatePlots();
    },

    addFertilizer: function (n) {
      if (!farmState || !farmState.upgrades || n <= 0) return;
      farmState.upgrades.fertilizer += n;
      saveState();
    },

    useFertilizer: function (plotIndex) {
      return useFertilizer(plotIndex);
    },

    getUpgradeDefs: function () {
      return FARM_UPGRADES;
    },

    // ── Cosmetics API ────────────────────────────────────────
    getCosmetics: function () {
      if (!farmState || !farmState.cosmetics) return { farmerHat: false, dirtTrail: false, overgrownTheme: false, harvestMoon: false };
      return JSON.parse(JSON.stringify(farmState.cosmetics));
    },

    setCosmetic: function (key, bool) {
      if (!farmState || !farmState.cosmetics) return;
      if (!(key in farmState.cosmetics)) return;
      farmState.cosmetics[key] = !!bool;
      saveState();
    },

    beamArrived: beamArrived,
    beamDeparting: beamDeparting,

    // ── Mini pet methods (for pet-farm-ai.js when beamed) ──
    walkMiniPetToPlot: walkMiniPetToPlot,
    returnMiniPetHome: returnMiniPetHome,
    miniPetSpeak: miniPetSpeak,
    miniPetCelebrate: miniPetCelebrate,
    miniPetSad: miniPetSad,
    isMiniPetBusy: function () { return miniPetBusy; },
    setMiniPetBusy: function (b) { miniPetBusy = b; }
  };

  // ── Decorations (trees, path, grass) ────────────────────
  function createDecorations() {
    if (!farmSceneEl || !farmhouseEl || !farmBarEl) return;

    // Ground strip
    var ground = document.createElement('div');
    ground.className = 'farm-ground';
    farmSceneEl.appendChild(ground);

    // Tree behind farmhouse (peeks out above/right)
    var tree = createTree();
    farmhouseEl.appendChild(tree);
  }

  function createTree() {
    var el = document.createElement('div');
    el.className = 'farm-tree';
    var sprite = document.createElement('div');
    sprite.style.position = 'relative';
    sprite.style.width = (16 * TREE_PIXEL) + 'px';
    sprite.style.height = (16 * TREE_PIXEL) + 'px';
    sprite.style.imageRendering = 'pixelated';
    renderSprite(sprite, TREE_SPRITE, TREE_PIXEL);
    el.appendChild(sprite);
    return el;
  }

  // ── Dim toggle ─────────────────────────────────────────
  var dimToggleEl;
  var DIM_STORAGE_KEY = 'arebooksgood-farm-dimmed';

  function createDimToggle() {
    dimToggleEl = document.createElement('button');
    dimToggleEl.className = 'farm-dim-toggle';
    dimToggleEl.type = 'button';
    dimToggleEl.title = 'Toggle farm visibility';
    dimToggleEl.textContent = '\uD83D\uDCA1'; // light bulb
    dimToggleEl.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDim();
    });
    farmSceneEl.appendChild(dimToggleEl);

    // Restore saved dim state
    try {
      if (localStorage.getItem(DIM_STORAGE_KEY) === '1') {
        farmSceneEl.classList.add('farm-dimmed');
        document.body.classList.add('farm-dimmed-mode');
        dimToggleEl.classList.add('farm-dim-active');
      }
    } catch (e) {}
  }

  function toggleDim() {
    var dimmed = farmSceneEl.classList.toggle('farm-dimmed');
    document.body.classList.toggle('farm-dimmed-mode', dimmed);
    if (dimToggleEl) dimToggleEl.classList.toggle('farm-dim-active', dimmed);
    try {
      if (dimmed) {
        localStorage.setItem(DIM_STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(DIM_STORAGE_KEY);
      }
    } catch (e) {}
  }

  // ── Init ────────────────────────────────────────────────
  // ── Upgrade decorations in farm scene ───────────────────
  function createUpgradeDecorations() {
    if (!farmSceneEl || !farmState.upgrades) return;

    // Remove any existing upgrade icons
    var existing = farmSceneEl.querySelectorAll('.farm-upgrade-icon');
    for (var i = 0; i < existing.length; i++) {
      existing[i].parentNode.removeChild(existing[i]);
    }

    // Sprinkler icon — appended to farm-scene (not farm-bar)
    if (farmState.upgrades.sprinkler > 0) {
      var sprinklerIcon = document.createElement('div');
      sprinklerIcon.className = 'farm-upgrade-icon farm-sprinkler-icon';
      sprinklerIcon.style.width = (8 * UPGRADE_PIXEL) + 'px';
      sprinklerIcon.style.height = (16 * UPGRADE_PIXEL) + 'px';
      renderSprite(sprinklerIcon, SPRINKLER_SPRITE, UPGRADE_PIXEL);
      sprinklerIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        openUpgradeInfo('sprinkler', sprinklerIcon);
      });
      farmSceneEl.appendChild(sprinklerIcon);
    }

    // Scarecrow icon — appended to farm-scene (not farm-bar)
    if (farmState.upgrades.scarecrow > 0) {
      var scarecrowIcon = document.createElement('div');
      scarecrowIcon.className = 'farm-upgrade-icon farm-scarecrow-icon';
      scarecrowIcon.style.width = (12 * UPGRADE_PIXEL) + 'px';
      scarecrowIcon.style.height = (16 * UPGRADE_PIXEL) + 'px';
      renderSprite(scarecrowIcon, SCARECROW_SPRITE, UPGRADE_PIXEL);
      scarecrowIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        openUpgradeInfo('scarecrow', scarecrowIcon);
      });
      farmSceneEl.appendChild(scarecrowIcon);
    }
  }

  // ── Harvest moon cosmetic ─────────────────────────────
  function applyHarvestMoon() {
    if (farmState.cosmetics && farmState.cosmetics.harvestMoon) {
      document.body.classList.add('harvest-moon-active');
    }
  }

  // ── Overgrown theme cosmetic ──────────────────────────
  function applyOvergrownTheme() {
    if (farmState.cosmetics && farmState.cosmetics.overgrownTheme) {
      var opt = document.querySelector('#theme-select option[value="overgrown"]');
      if (opt) opt.style.display = '';
    }
  }

  function init() {
    applyFarmhouseBonuses();
    createFarmScene();
    createFarmhouseWidget();
    createFarmBar();
    createDecorations();
    createUpgradeDecorations();
    updatePlots(); // Immediate catch-up for offline growth
    updateTimer = setInterval(updatePlots, UPDATE_INTERVAL);
    watchPetToggle();
    syncVisibility();
    startSprinklerTimer();
    applyHarvestMoon();
    applyOvergrownTheme();

    // Retry farmhouse pet render after PetSystem loads sprites
    var petRetries = 0;
    function retryPetRender() {
      petRetries++;
      if (window.PetSystem && window.PetSystem.renderMiniSprite && window.PetSystem.getState) {
        var ps = window.PetSystem.getState();
        if (ps) {
          renderFarmhousePet();
          // If pet was already beamed (page reload), show farmhouse pet
          if (window.PetSystem.isBeamed && window.PetSystem.isBeamed()) {
            if (farmhousePetEl) farmhousePetEl.style.display = 'block';
          }
          return;
        }
      }
      if (petRetries < 20) setTimeout(retryPetRender, 500);
    }
    setTimeout(retryPetRender, 500);

    createDimToggle();

    // Keep mini pet home position synced on resize
    window.addEventListener('resize', function () {
      if (farmhousePetEl && farmhousePetEl.style.display !== 'none' && !miniPetBusy) {
        updateMiniPetHomePos();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
