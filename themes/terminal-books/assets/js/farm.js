(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-farm';
  var UPDATE_INTERVAL = 10000; // 10s refresh
  var growTimeMultiplier = 1;
  var farmhouseGrowMultiplier = 1;
  var sellMultiplier = 1;

  // ── Free crops (infinite seeds) ───────────────────────
  var FREE_CROPS = { carrot: true, potato: true, wheat: true };

  // ── Crop definitions ────────────────────────────────────
  var CROPS = {
    carrot:  { name: 'Carrot',  growTime: 5 * 60 * 1000,   sell: 2,  seedCost: 0,  icon: 'C' },
    potato:  { name: 'Potato',  growTime: 15 * 60 * 1000,  sell: 5,  seedCost: 0,  icon: 'P' },
    wheat:   { name: 'Wheat',   growTime: 30 * 60 * 1000,  sell: 8,  seedCost: 0,  icon: 'W' },
    tomato:  { name: 'Tomato',  growTime: 60 * 60 * 1000,  sell: 15, seedCost: 5,  icon: 'T' },
    corn:    { name: 'Corn',    growTime: 120 * 60 * 1000, sell: 25, seedCost: 8,  icon: 'K' },
    pumpkin: { name: 'Pumpkin', growTime: 240 * 60 * 1000, sell: 45, seedCost: 12, icon: 'Q' }
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

  // ── Farmhouse level definitions ──────────────────────────
  var FARMHOUSE_LEVELS = {
    1: { name: 'Dirt Shack',       cost: 0,    sellBonus: 1.0,  growBonus: 1.0,  autoWater: false },
    2: { name: 'Wooden Cabin',     cost: 100,  sellBonus: 1.1,  growBonus: 1.0,  autoWater: false },
    3: { name: 'Stone Farmhouse',  cost: 300,  sellBonus: 1.2,  growBonus: 0.9,  autoWater: false },
    4: { name: 'Manor',            cost: 800,  sellBonus: 1.3,  growBonus: 0.85, autoWater: true },
    5: { name: 'Golden Estate',    cost: 2000, sellBonus: 1.5,  growBonus: 0.75, autoWater: true }
  };

  // ── State ───────────────────────────────────────────────
  var farmState;
  var farmBarEl;
  var farmSceneEl;
  var pickerEl;
  var activePlotIndex = -1;
  var updateTimer;
  var farmhouseEl;
  var farmhousePanelEl;

  function defaultState() {
    return {
      plots: [{ crop: null }, { crop: null }],
      unlockedPlots: 2,
      inventory: {},
      farmhouse: { level: 1 }
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
    sellMultiplier = def.sellBonus;
    farmhouseGrowMultiplier = def.growBonus;

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

    for (var i = 0; i < farmState.plots.length; i++) {
      farmBarEl.appendChild(createPlotEl(i));
    }

    farmSceneEl.appendChild(farmBarEl);

    // Sync visibility with pet
    syncVisibility();
  }

  function createPlotEl(index) {
    var el = document.createElement('div');
    el.className = 'farm-plot';
    el.setAttribute('data-plot', index);
    el.addEventListener('click', function (e) {
      onPlotClick(index, e);
    });
    updatePlotEl(el, index);
    return el;
  }

  function updatePlotEl(el, index) {
    var plot = farmState.plots[index];

    // Clear existing content except progress bar
    while (el.firstChild) el.removeChild(el.firstChild);

    // Remove state classes
    el.className = 'farm-plot';

    if (!plot || !plot.crop) {
      // Empty plot
      el.classList.add('farm-plot-empty');
      return;
    }

    var stage = getPlotStage(plot);

    if (stage === 'ready') {
      el.classList.add('farm-plot-ready');
    } else {
      el.classList.add('farm-plot-growing');

      // Progress bar — watered plots get blue tint
      var progress = document.createElement('div');
      progress.className = 'farm-plot-progress';
      if (plot.wateredAt) progress.classList.add('farm-plot-progress-watered');
      progress.style.width = (getGrowthPct(plot) * 100) + '%';
      el.appendChild(progress);
    }

    // Watered badge
    if (plot.wateredAt && stage !== 'ready') {
      el.classList.add('farm-plot-watered');
    }

    // Crop sprite
    var spriteContainer = document.createElement('div');
    spriteContainer.className = 'farm-crop-sprite';
    var spriteData = SPRITES[plot.crop] && SPRITES[plot.crop][stage];
    if (spriteData) {
      renderSprite(spriteContainer, spriteData);
    }
    el.appendChild(spriteContainer);
  }

  // ── Update all plots ────────────────────────────────────
  function updatePlots() {
    if (!farmBarEl) return;
    var plotEls = farmBarEl.querySelectorAll('.farm-plot');
    for (var i = 0; i < plotEls.length; i++) {
      updatePlotEl(plotEls[i], i);
    }
  }

  // ── Plot click handler ──────────────────────────────────
  function onPlotClick(index, e) {
    var plot = farmState.plots[index];

    if (!plot || !plot.crop) {
      // Empty — open seed picker
      openSeedPicker(index, e);
      return;
    }

    var stage = getPlotStage(plot);
    if (stage === 'ready') {
      harvest(index, e);
    }
  }

  // ── Seed picker ─────────────────────────────────────────
  function openSeedPicker(plotIndex, e) {
    closeSeedPicker();
    activePlotIndex = plotIndex;

    pickerEl = document.createElement('div');
    pickerEl.className = 'farm-seed-picker';

    var cropKeys = Object.keys(CROPS);
    for (var i = 0; i < cropKeys.length; i++) {
      (function (key) {
        var crop = CROPS[key];
        var isFree = FREE_CROPS[key];
        var count = isFree ? -1 : (farmState.inventory[key] || 0);
        var disabled = !isFree && count <= 0;

        var btn = document.createElement('button');
        btn.className = 'farm-seed-option';
        if (disabled) btn.classList.add('farm-seed-disabled');
        btn.type = 'button';
        if (disabled) btn.disabled = true;

        var nameSpan = document.createElement('span');
        nameSpan.className = 'farm-seed-name';
        nameSpan.textContent = crop.name;

        var countSpan = document.createElement('span');
        countSpan.className = 'farm-seed-count';
        countSpan.textContent = isFree ? 'free' : ('x' + count);

        var timeSpan = document.createElement('span');
        timeSpan.className = 'farm-seed-time';
        timeSpan.textContent = formatTime(crop.growTime);

        btn.appendChild(nameSpan);
        btn.appendChild(countSpan);
        btn.appendChild(timeSpan);

        if (!disabled) {
          btn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            plantSeed(activePlotIndex, key);
            closeSeedPicker();
          });
        }

        pickerEl.appendChild(btn);
      })(cropKeys[i]);
    }

    // Position above the clicked plot
    var plotEl = farmBarEl.querySelectorAll('.farm-plot')[plotIndex];
    var rect = plotEl.getBoundingClientRect();
    pickerEl.style.left = rect.left + 'px';
    pickerEl.style.bottom = (window.innerHeight - rect.top + 4) + 'px';

    document.body.appendChild(pickerEl);

    // Close on outside click (delayed to avoid immediate close)
    setTimeout(function () {
      document.addEventListener('click', outsidePickerClick);
    }, 0);
  }

  function outsidePickerClick(e) {
    if (pickerEl && !pickerEl.contains(e.target)) {
      closeSeedPicker();
    }
  }

  function closeSeedPicker() {
    if (pickerEl && pickerEl.parentNode) {
      pickerEl.parentNode.removeChild(pickerEl);
    }
    pickerEl = null;
    activePlotIndex = -1;
    document.removeEventListener('click', outsidePickerClick);
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

  // ── Harvest ─────────────────────────────────────────────
  function harvest(plotIndex, e) {
    var plot = farmState.plots[plotIndex];
    if (!plot || !plot.crop) return;

    var crop = CROPS[plot.crop];
    if (!crop) return;

    var sellValue = Math.round(crop.sell * sellMultiplier);

    // Add JB
    if (window.JackBucks) {
      window.JackBucks.add(sellValue);
    }

    // Clear plot
    farmState.plots[plotIndex] = { crop: null };
    saveState();
    updatePlots();

    // Float particle
    showJBFloat(plotIndex, sellValue);

    // Pet celebrates
    if (window.PetSystem && window.PetSystem.celebrate) {
      window.PetSystem.celebrate();
    }
  }

  // ── JB float particle ──────────────────────────────────
  function showJBFloat(plotIndex, amount) {
    var plotEl = farmBarEl.querySelectorAll('.farm-plot')[plotIndex];
    if (!plotEl) return;

    var rect = plotEl.getBoundingClientRect();
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

  function renderFarmhouseSprite() {
    if (!farmhouseEl) return;
    var level = farmState.farmhouse ? farmState.farmhouse.level : 1;
    var pixels = FARMHOUSE_SPRITES[level] || FARMHOUSE_SPRITES[1];
    farmhouseEl.innerHTML = '';
    var spriteContainer = document.createElement('div');
    spriteContainer.className = 'farm-house-sprite';
    renderSprite(spriteContainer, pixels, HOUSE_PIXEL);
    farmhouseEl.appendChild(spriteContainer);
  }

  function toggleFarmhousePanel() {
    if (farmhousePanelEl) {
      closeFarmhousePanel();
      return;
    }
    openFarmhousePanel();
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
    bonuses.textContent = bonusLines.length > 0 ? bonusLines.join(' | ') : 'No bonuses yet';
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
    // Remove all plot elements
    while (farmBarEl.firstChild) farmBarEl.removeChild(farmBarEl.firstChild);
    // Recreate
    for (var i = 0; i < farmState.plots.length; i++) {
      farmBarEl.appendChild(createPlotEl(i));
    }
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
          wateredAt: plot.wateredAt || null
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

      if (window.JackBucks) {
        window.JackBucks.add(sellValue);
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
      var els = farmBarEl.querySelectorAll('.farm-plot');
      return els[plotIndex] || null;
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
          free: !!FREE_CROPS[k]
        };
      }
      return defs;
    }
  };

  // ── Decorations (trees, path, grass) ────────────────────
  function createDecorations() {
    if (!farmSceneEl || !farmhouseEl || !farmBarEl) return;

    // Ground strip
    var ground = document.createElement('div');
    ground.className = 'farm-ground';
    farmSceneEl.appendChild(ground);

    // Tree between farmhouse and crop plots
    var tree = createTree();
    farmSceneEl.insertBefore(tree, farmBarEl);
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

  // ── Init ────────────────────────────────────────────────
  function init() {
    farmState = loadState();
    applyFarmhouseBonuses();
    createFarmScene();
    createFarmhouseWidget();
    createFarmBar();
    createDecorations();
    updatePlots(); // Immediate catch-up for offline growth
    updateTimer = setInterval(updatePlots, UPDATE_INTERVAL);
    watchPetToggle();
    syncVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
