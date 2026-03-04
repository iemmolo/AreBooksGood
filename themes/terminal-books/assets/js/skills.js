(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var STORAGE_KEY = window.__RPG_STORAGE_KEY || 'arebooksgood-skills';
  var PET_KEY = 'arebooksgood-pet';
  var MAX_LEVEL = 99;
  var IDLE_CAP_MS = 8 * 60 * 60 * 1000; // 8 hours
  var ACTIVE_AUTO_INTERVAL = 15000; // 15s auto-train when page open
  var STATE_VERSION = 12;
  var STACK_CAP = 999;

  // ── Mining Perks (level-gated passives) ────────
  var SKILL_PERKS = {
    mining: [
      { id: 'keenEye', name: 'Keen Eye', level: 10, desc: 'Gem chance 5% \u2192 10%' },
      { id: 'doubleStrike', name: 'Double Strike', level: 20, desc: '10% chance for 2x ore yield' },
      { id: 'prospector', name: "Prospector's Luck", level: 30, desc: '+25% XP from mining' },
      { id: 'oreSense', name: 'Ore Sense', level: 45, desc: 'Rock respawn 3s \u2192 2s' },
      { id: 'gemSpec', name: 'Gem Specialist', level: 60, desc: 'Gem bonus 5x \u2192 10x XP' },
      { id: 'veinMiner', name: 'Vein Miner', level: 75, desc: '20% chance to auto-mine adjacent rock' },
      { id: 'deepCore', name: 'Deep Core', level: 85, desc: 'Enables rare deep vein events (5x XP)' },
      { id: 'mastery', name: 'Mining Mastery', level: 99, desc: 'Permanent 2x XP from all mining' }
    ],
    fishing: [
      { id: 'quickHands', name: 'Quick Hands', level: 10, desc: 'Combo window 400ms \u2192 300ms (easier combos)' },
      { id: 'luckyBait', name: 'Lucky Bait', level: 20, desc: 'Rare catch 8% \u2192 15%' },
      { id: 'deepCast', name: 'Deep Cast', level: 30, desc: '+25% XP from fishing' },
      { id: 'bigGame', name: 'Big Game', level: 45, desc: 'Large/Huge fish more common' },
      { id: 'doubleCatch', name: 'Double Catch', level: 60, desc: '10% chance for 2x fish' },
      { id: 'patience', name: 'Patience', level: 75, desc: 'Bite wait time reduced 25%' },
      { id: 'netMaster', name: 'Net Master', level: 85, desc: 'Size bonus multipliers doubled + enables Kraken events' },
      { id: 'fishMastery', name: 'Fishing Mastery', level: 99, desc: 'Permanent 2x XP from all fishing' }
    ],
    woodcutting: [
      { id: 'sharpAxe', name: 'Sharp Axe', level: 10, desc: 'Chop cooldown 300ms \u2192 200ms' },
      { id: 'lumberjack', name: 'Lumberjack', level: 20, desc: 'Double chop window 100ms wider' },
      { id: 'forester', name: "Forester's Skill", level: 30, desc: '+25% XP from woodcutting' },
      { id: 'nestFinder', name: 'Nest Finder', level: 45, desc: 'Bird nest drop 10% \u2192 20%' },
      { id: 'doubleLog', name: 'Double Log', level: 60, desc: '10% chance for 2x logs' },
      { id: 'powerChop', name: 'Power Chop', level: 75, desc: 'Each hit counts as 2 (halves chops needed)' },
      { id: 'ancientRoots', name: 'Ancient Roots', level: 85, desc: '5% chance for 10x XP rare log' },
      { id: 'wcMastery', name: 'Woodcutting Mastery', level: 99, desc: 'Permanent 2x XP from all woodcutting' }
    ],
    smithing: [
      { id: 'steadyHand', name: 'Steady Hand', level: 10, desc: 'Smelting green zone 10% wider' },
      { id: 'quickStrike', name: 'Quick Strike', level: 20, desc: 'Forging cursor 15% slower' },
      { id: 'metalworker', name: 'Metalworker', level: 30, desc: '+25% XP from smithing' },
      { id: 'efficientSmelt', name: 'Efficient Smelt', level: 45, desc: '15% chance to not consume ores' },
      { id: 'doubleBar', name: 'Double Bar', level: 60, desc: '10% chance for 2x bars when smelting' },
      { id: 'masterForge', name: 'Master Forge', level: 75, desc: 'Forging green zone 15% wider' },
      { id: 'pyromaniac', name: 'Pyromaniac', level: 85, desc: 'Perfect smelt zone 50% larger' },
      { id: 'smithMastery', name: 'Smithing Mastery', level: 99, desc: 'Permanent 2x XP from all smithing' }
    ],
    combat: [
      { id: 'toughSkin', name: 'Tough Skin', level: 10, desc: 'Enemy damage reduced 10%' },
      { id: 'quickReflex', name: 'Quick Reflex', level: 20, desc: 'Dodge cooldown 2s \u2192 1.5s' },
      { id: 'warrior', name: "Warrior's Spirit", level: 30, desc: '+25% XP from combat' },
      { id: 'critMaster', name: 'Crit Master', level: 45, desc: 'Crit chance 15% \u2192 25%' },
      { id: 'lifesteal', name: 'Lifesteal', level: 60, desc: 'Heal 5% of damage dealt' },
      { id: 'extraPotion', name: 'Field Medic', level: 75, desc: '3 \u2192 5 potions per encounter' },
      { id: 'secondWind', name: 'Second Wind', level: 85, desc: 'Survive death once per encounter at 10% HP' },
      { id: 'combatMastery', name: 'Combat Mastery', level: 99, desc: 'Permanent 2x XP from all combat' }
    ]
  };
  var MINING_PERKS = SKILL_PERKS.mining; // backward compat for existing hasPerk calls

  // ── Rock HP (multi-hit mining) ─────────────────
  var ROCK_HP = {
    'Copper Ore': 1, 'Crimson Ore': 1,
    'Coal': 2, 'Iron Ore': 2,
    'Gold Ore': 2, 'Silver Ore': 3,
    'Astral Ore': 3, 'Shadow Ore': 3,
    'Emerald Ore': 3, 'Slate Ore': 4,
    'Mithril Ore': 4, 'Amethyst Ore': 4,
    'Cobalt Ore': 4, 'Molten Ore': 5,
    'Frost Ore': 5, 'Obsidian Ore': 5
  };
  var rockState = []; // { hp, maxHp } per rock

  // ── Tree HP (multi-hit woodcutting) ──────────────
  var TREE_HP = {
    'Pine': 1, 'Oak': 1, 'Birch': 2, 'Maple': 2,
    'Walnut': 3, 'Mahogany': 3, 'Yew': 4, 'Elder': 5
  };

  // ── Fish HP (multi-hit fishing) ──────────────────
  var FISH_HP = {
    'Anchovy': 1, 'Goldfish': 1, 'Small Shark': 1,
    'Koi': 2, 'Perch': 2, 'Clownfish': 2,
    'Piranha': 2, 'Flying Fish': 3, 'Barracuda': 3,
    'Dolphin Fish': 3, 'Betta': 3, 'Stingray': 4,
    'Eye Fish': 4, 'Spook Boy': 4, 'Kingfish': 4,
    'Crawfish': 5, 'Giant Crab': 5, 'Anglerfish': 5,
    'Hammerhead': 6, 'Shark': 6
  };

  // ── Fishing Events (random encounters) ──────────
  var FISHING_EVENTS = [
    { id: 'treasureChest', name: 'Treasure Chest', weight: 40 },
    { id: 'schoolOfFish',  name: 'School of Fish', weight: 35 },
    { id: 'sharkAttack',   name: 'Shark Attack',   weight: 25 }
  ];

  // ── Woodcutting Events (random encounters) ───────
  var WC_EVENTS = [
    { id: 'goldenTree',   name: 'Golden Tree',   weight: 40 },
    { id: 'storm',        name: 'Storm',         weight: 35 },
    { id: 'ancientGrove', name: 'Ancient Grove',  weight: 25 }
  ];

  // ── Smithing Events (random encounters) ──────────
  var SMITHING_EVENTS = [
    { id: 'blessedForge', name: 'Blessed Forge', weight: 40 },
    { id: 'oreSurge',     name: 'Ore Surge',     weight: 35 },
    { id: 'masterTouch',  name: "Master's Touch", weight: 25 }
  ];

  // ── Resource tier colors (D1) ─────────────────
  var TIER_COLORS = ['#888', '#ccc', '#4caf50', '#2196f3', '#9c27b0', '#ffd700'];

  // ── Sprite Sheet Paths & Meta (Phase 3) ──────
  var SKILL_SPRITE_PATHS = {
    rocks: '/images/skills/rocks.png',
    ores: '/images/skills/ores.png',
    gems: '/images/skills/gems.png',
    fish: '/images/skills/fish.png',
    trees: '/images/skills/trees.png',
    wood: '/images/skills/wood.png',
    anvil: '/images/skills/anvil.png',
    furnace: '/images/skills/furnace.png',
    'tools-t1': '/images/skills/tools-t1.png',
    'tools-t2': '/images/skills/tools-t2.png',
    'tools-t3': '/images/skills/tools-t3.png',
    stones: '/images/skills/stones.png',
    items_sheet: '/images/skills/items_sheet.png',
    forest_extras: '/images/skills/forest-extras.png'
  };

  var SKILL_SHEET_META = {
    rocks: { w: 176, h: 272 },
    ores: { w: 256, h: 64 },
    gems: { w: 112, h: 64 },
    fish: { w: 160, h: 240 },
    trees: { w: 384, h: 100 },
    wood: { w: 64, h: 48 },
    anvil: { w: 128, h: 96 },
    furnace: { w: 160, h: 64 },
    'tools-t1': { w: 320, h: 48 },
    'tools-t2': { w: 288, h: 48 },
    'tools-t3': { w: 288, h: 48 },
    stones: { w: 64, h: 32 },
    items_sheet: { w: 576, h: 560 }
  };

  // Mining rocks: map resource name → { x, y } on rocks.png (16×16 crystal minerals from y=32 row)
  // Row 2 crystals: grey(x16), gold(x32), silver(x48), purple(x64), red(x80), green(x96), blue(x112), dark(x128), pink(x144)
  var MINING_ROCK_SPRITES = {
    'Copper Ore':    { x: 32, y: 32 },    // gold crystal (warm copper)
    'Crimson Ore':   { x: 80, y: 32 },    // red crystal
    'Coal':          { x: 128, y: 32 },   // dark crystal
    'Iron Ore':      { x: 128, y: 32 },   // dark crystal
    'Gold Ore':      { x: 32, y: 48 },    // gold crystal alt
    'Silver Ore':    { x: 16, y: 32 },    // grey crystal
    'Astral Ore':    { x: 64, y: 32 },    // purple crystal
    'Shadow Ore':    { x: 128, y: 32 },   // dark crystal
    'Emerald Ore':   { x: 96, y: 32 },    // green crystal
    'Slate Ore':     { x: 16, y: 32 },    // grey crystal
    'Mithril Ore':   { x: 112, y: 32 },   // blue crystal (teal)
    'Amethyst Ore':  { x: 64, y: 32 },    // purple crystal
    'Cobalt Ore':    { x: 112, y: 32 },   // blue crystal
    'Molten Ore':    { x: 80, y: 32 },    // red crystal (molten)
    'Frost Ore':     { x: 48, y: 32 },    // silver crystal (icy)
    'Obsidian Ore':  { x: 128, y: 32 }    // dark crystal
  };

  // Mining event rock sprites: map event id → { sheet, x, y } on rocks.png
  var EVENT_ROCK_SPRITES = {
    gemVein:      { sheet: 'rocks', x: 32, y: 48 },   // gold crystal (alt form)
    shootingStar: { sheet: 'rocks', x: 48, y: 80 },   // purple flame (cosmic)
    caveIn:       { sheet: 'rocks', x: 16, y: 160 },  // brown boulder (debris)
    deepVein:     { sheet: 'rocks', x: 112, y: 48 }   // blue crystal (alt form)
  };

  // Ore drop particles: map resource → { sheet, x, y } on items_sheet.png (16px grid, row 16)
  var ORE_DROP_SPRITES = {
    'Copper Ore':    { sheet: 'items_sheet', x: 16, y: 256 },
    'Crimson Ore':   { sheet: 'items_sheet', x: 0, y: 256 },
    'Coal':          { sheet: 'items_sheet', x: 144, y: 256 },
    'Iron Ore':      { sheet: 'items_sheet', x: 560, y: 240 },
    'Gold Ore':      { sheet: 'items_sheet', x: 32, y: 256 },
    'Silver Ore':    { sheet: 'items_sheet', x: 528, y: 240 },
    'Astral Ore':    { sheet: 'items_sheet', x: 48, y: 256 },
    'Shadow Ore':    { sheet: 'items_sheet', x: 544, y: 240 },
    'Emerald Ore':   { sheet: 'items_sheet', x: 64, y: 256 },
    'Slate Ore':     { sheet: 'items_sheet', x: 528, y: 256 },
    'Mithril Ore':   { sheet: 'items_sheet', x: 128, y: 256 },
    'Amethyst Ore':  { sheet: 'items_sheet', x: 112, y: 256 },
    'Cobalt Ore':    { sheet: 'items_sheet', x: 80, y: 256 },
    'Molten Ore':    { sheet: 'items_sheet', x: 160, y: 256 },
    'Frost Ore':     { sheet: 'items_sheet', x: 320, y: 256 },
    'Obsidian Ore':  { sheet: 'items_sheet', x: 96, y: 256 }
  };

  // Gem drop sprites: 10 gems on items_sheet.png (16px grid, row 15)
  var GEM_SPRITES = [
    { sheet: 'items_sheet', x: 0, y: 240 },    // Peridot
    { sheet: 'items_sheet', x: 32, y: 240 },   // Emerald
    { sheet: 'items_sheet', x: 64, y: 240 },   // Aquamarine
    { sheet: 'items_sheet', x: 96, y: 240 },   // Topaz
    { sheet: 'items_sheet', x: 128, y: 240 },  // Onyx
    { sheet: 'items_sheet', x: 160, y: 240 },  // Moonstone
    { sheet: 'items_sheet', x: 176, y: 240 },  // Diamond
    { sheet: 'items_sheet', x: 224, y: 240 },  // Opal
    { sheet: 'items_sheet', x: 48, y: 240 },   // Sapphire
    { sheet: 'items_sheet', x: 112, y: 240 }   // Ruby
  ];

  // Fish sprites: map name → { sheet, x, y } on items_sheet.png (16px grid, row 29-30)
  var FISH_SPRITES = {
    'Anchovy':      { sheet: 'items_sheet', x: 544, y: 464 },
    'Goldfish':     { sheet: 'items_sheet', x: 96,  y: 464 },
    'Small Shark':  { sheet: 'items_sheet', x: 32,  y: 464 },
    'Koi':          { sheet: 'items_sheet', x: 48,  y: 464 },
    'Perch':        { sheet: 'items_sheet', x: 464, y: 464 },
    'Clownfish':    { sheet: 'items_sheet', x: 448, y: 464 },
    'Piranha':      { sheet: 'items_sheet', x: 144, y: 464 },
    'Flying Fish':  { sheet: 'items_sheet', x: 432, y: 464 },
    'Barracuda':    { sheet: 'items_sheet', x: 112, y: 464 },
    'Dolphin Fish': { sheet: 'items_sheet', x: 256, y: 464 },
    'Betta':        { sheet: 'items_sheet', x: 288, y: 464 },
    'Stingray':     { sheet: 'items_sheet', x: 240, y: 464 },
    'Eye Fish':     { sheet: 'items_sheet', x: 368, y: 464 },
    'Spook Boy':    { sheet: 'items_sheet', x: 272, y: 464 },
    'Kingfish':     { sheet: 'items_sheet', x: 528, y: 464 },
    'Crawfish':     { sheet: 'items_sheet', x: 336, y: 480 },
    'Giant Crab':   { sheet: 'items_sheet', x: 320, y: 480 },
    'Anglerfish':   { sheet: 'items_sheet', x: 0,   y: 480 },
    'Hammerhead':   { sheet: 'items_sheet', x: 48,  y: 480 },
    'Shark':        { sheet: 'items_sheet', x: 64,  y: 480 }
  };

  // Ambient fish sprites (unchosen fish for background/event decoration)
  var AMBIENT_FISH = [
    { x: 0,   y: 464 }, // Red Snapper
    { x: 16,  y: 464 }, // Piranha (red)
    { x: 80,  y: 464 }, // Swordfish
    { x: 128, y: 464 }, // Mackerel
    { x: 160, y: 464 }, // Betta (blue)
    { x: 176, y: 464 }, // Bass
    { x: 192, y: 464 }, // Tuna
    { x: 304, y: 464 }, // Flounder
    { x: 400, y: 464 }, // Shrimp
    { x: 496, y: 464 }, // Minnow
    { x: 16,  y: 480 }, // Pufferfish
    { x: 128, y: 480 }  // Blue Tang
  ];

  // Equipment/decoration sprites from items_sheet row 30
  var FISHING_EQUIP_SPRITES = {
    bobber:  { x: 464, y: 480 },  // Bobber (red)
    lure:    { x: 352, y: 480 },  // Fishing Lure
    hook:    { x: 368, y: 480 },  // Fish Hook
    shell:   { x: 560, y: 480 },  // Shell
    octopus: { x: 32,  y: 480 },  // Octopus (for Kraken)
    rod:     { x: 544, y: 480 }   // Fishing Rod
  };

  // Tree sprites: map name → { x, y, w, h } crop region on trees.png (384×100)
  // Row 0: 8 trees in 48px columns, bottom-aligned
  // Row 1 (y=50): shared stump + 6 decoration trees
  var TREE_SPRITES = {
    'Pine':     { x: 8, y: 2, w: 32, h: 48 },
    'Oak':      { x: 56, y: 1, w: 32, h: 49 },
    'Birch':    { x: 104, y: 2, w: 32, h: 48 },
    'Maple':    { x: 152, y: 2, w: 32, h: 48 },
    'Walnut':   { x: 200, y: 3, w: 32, h: 47 },
    'Mahogany': { x: 248, y: 0, w: 32, h: 50 },
    'Yew':      { x: 296, y: 1, w: 32, h: 49 },
    'Elder':    { x: 343, y: 1, w: 33, h: 49 }
  };

  // Shared stump sprite (shown after tree is chopped)
  var STUMP_SPRITE = { x: 8, y: 83, w: 32, h: 17 };

  // Decoration tree sprites (for forest background props)
  var DECO_SPRITES = {
    'Deco1': { x: 56, y: 50, w: 32, h: 50 },   // mushroom tree
    'Deco2': { x: 104, y: 51, w: 32, h: 49 },  // mine tree
    'Deco3': { x: 152, y: 67, w: 32, h: 33 },  // mine tree small
    'Deco4': { x: 200, y: 52, w: 32, h: 48 },  // cherry
    'Deco5': { x: 248, y: 52, w: 32, h: 48 },  // apple
    'Deco6': { x: 288, y: 67, w: 47, h: 33 }   // bush
  };

  // Forest extras sprite coords on forest-extras.png (2048×49)
  var FOREST_EXTRAS = {
    logs: [
      { x: 48, y: 33, w: 32, h: 16 },
      { x: 176, y: 32, w: 32, h: 17 },
      { x: 256, y: 17, w: 128, h: 32 },
      { x: 432, y: 31, w: 32, h: 18 }
    ],
    stumps: [
      { x: 544, y: 15, w: 64, h: 34 },
      { x: 672, y: 16, w: 64, h: 33 },
      { x: 800, y: 17, w: 64, h: 32 },
      { x: 944, y: 15, w: 32, h: 34 }
    ],
    vines: [
      { x: 1071, y: 32, w: 33, h: 17 },
      { x: 1200, y: 32, w: 31, h: 17 },
      { x: 1328, y: 16, w: 32, h: 33 },
      { x: 1456, y: 0, w: 32, h: 49 }
    ],
    props: [
      { x: 1584, y: 18, w: 32, h: 31 },
      { x: 1711, y: 0, w: 33, h: 49 },
      { x: 1832, y: 17, w: 48, h: 32 },
      { x: 1967, y: 16, w: 33, h: 33 }
    ]
  };

  // Anvil sprites: map recipe → { x, y } on anvil.png (128×96, 16×16 cells, 8 cols × 6 rows)
  // Rows by color: 0=blue-grey, 1=grey, 2=orange, 3=gold, 4=purple, 5=blue-grey
  // Use col 0 per row, vary row for color matching ore tier
  var ANVIL_SPRITES = {
    'Copper Bar':    { x: 0, y: 32 },   // row 2 = orange (copper)
    'Bronze Bar':    { x: 0, y: 32 },   // row 2 = orange (bronze, warm)
    'Gold Bar':      { x: 0, y: 48 },   // row 3 = gold
    'Astral Bar':    { x: 0, y: 64 },   // row 4 = purple (astral)
    'Silver Bar':    { x: 0, y: 16 },   // row 1 = grey (silver)
    'Emerald Bar':   { x: 0, y: 80 },   // row 5 = blue-grey (emerald)
    'Mithril Bar':   { x: 0, y: 0 },    // row 0 = blue-grey (mithril)
    'Amethyst Bar':  { x: 0, y: 64 },   // row 4 = purple (amethyst)
    'Cobalt Bar':    { x: 0, y: 0 },    // row 0 = blue-grey (cobalt)
    'Molten Bar':    { x: 0, y: 32 },   // row 2 = orange (molten)
    'Frost Bar':     { x: 0, y: 16 },   // row 1 = grey (frost/icy)
    'Obsidian Bar':  { x: 0, y: 0 }     // row 0 = blue-grey (obsidian)
  };

  // Bar drop particles: items_sheet.png row 15 (color-matched to row 16 ores)
  var BAR_DROP_SPRITES = {
    'Copper Bar':    { sheet: 'items_sheet', x: 384, y: 240 },
    'Bronze Bar':    { sheet: 'items_sheet', x: 368, y: 240 },
    'Gold Bar':      { sheet: 'items_sheet', x: 416, y: 240 },
    'Astral Bar':    { sheet: 'items_sheet', x: 336, y: 240 },
    'Silver Bar':    { sheet: 'items_sheet', x: 400, y: 240 },
    'Emerald Bar':   { sheet: 'items_sheet', x: 448, y: 240 },
    'Mithril Bar':   { sheet: 'items_sheet', x: 432, y: 240 },
    'Amethyst Bar':  { sheet: 'items_sheet', x: 496, y: 240 },
    'Cobalt Bar':    { sheet: 'items_sheet', x: 480, y: 240 },
    'Molten Bar':    { sheet: 'items_sheet', x: 352, y: 240 },
    'Frost Bar':     { sheet: 'items_sheet', x: 464, y: 240 },
    'Obsidian Bar':  { sheet: 'items_sheet', x: 512, y: 240 }
  };

  // Wood log drop: items_sheet.png row 27 (items 990-997), keyed by tree name
  var WOOD_DROP_SPRITES = {
    'Pine':     { sheet: 'items_sheet', x: 272, y: 432 },
    'Oak':      { sheet: 'items_sheet', x: 288, y: 432 },
    'Birch':    { sheet: 'items_sheet', x: 304, y: 432 },
    'Maple':    { sheet: 'items_sheet', x: 320, y: 432 },
    'Walnut':   { sheet: 'items_sheet', x: 336, y: 432 },
    'Mahogany': { sheet: 'items_sheet', x: 352, y: 432 },
    'Yew':      { sheet: 'items_sheet', x: 368, y: 432 },
    'Elder':    { sheet: 'items_sheet', x: 384, y: 432 }
  };

  // Skill icons for left panel: one iconic tool per skill from tools-t1
  // Positions confirmed via dungeongear.json labels matching gear-weapons.png
  var SKILL_ICON_SPRITES = {
    mining:      { sheet: 'tools-t1', x: 16, y: 0 },   // Pickaxe (row 0, col 1)
    fishing:     { sheet: 'tools-t1', x: 64, y: 16 },   // Fishing Rod (row 1, col 4)
    woodcutting: { sheet: 'tools-t1', x: 48, y: 0 },    // Axe (row 0, col 3)
    smithing:    { sheet: 'tools-t1', x: 96, y: 0 },    // Pick/Hammer (row 0, col 6)
    combat:      { sheet: 'tools-t1', x: 32, y: 0 }     // Short Sword (row 0, col 2)
  };

  // ── Item Categories & Inventory Icon Map ─────
  var ITEM_CATEGORIES = [
    { label: 'Ores', items: ['Copper Ore', 'Crimson Ore', 'Coal', 'Iron Ore', 'Gold Ore', 'Silver Ore', 'Astral Ore', 'Shadow Ore', 'Emerald Ore', 'Slate Ore', 'Mithril Ore', 'Amethyst Ore', 'Cobalt Ore', 'Molten Ore', 'Frost Ore', 'Obsidian Ore'] },
    { label: 'Gems', items: ['Peridot', 'Emerald', 'Aquamarine', 'Topaz', 'Onyx', 'Moonstone', 'Diamond', 'Opal', 'Sapphire', 'Ruby'] },
    { label: 'Logs', items: ['Pine Log', 'Oak Log', 'Birch Log', 'Maple Log', 'Walnut Log', 'Mahogany Log', 'Yew Log', 'Elder Log'] },
    { label: 'Fish', items: ['Anchovy', 'Goldfish', 'Small Shark', 'Koi', 'Perch', 'Clownfish', 'Piranha', 'Flying Fish', 'Barracuda', 'Dolphin Fish', 'Betta', 'Stingray', 'Eye Fish', 'Spook Boy', 'Kingfish', 'Crawfish', 'Giant Crab', 'Anglerfish', 'Hammerhead', 'Shark'] },
    { label: 'Bars', items: ['Copper Bar', 'Bronze Bar', 'Gold Bar', 'Astral Bar', 'Silver Bar', 'Emerald Bar', 'Mithril Bar', 'Amethyst Bar', 'Cobalt Bar', 'Molten Bar', 'Frost Bar', 'Obsidian Bar'] },
    { label: 'Equipment', items: [
      'Copper Sword', 'Bronze Sword', 'Gold Sword', 'Astral Sword',
      'Silver Sword', 'Emerald Sword', 'Mithril Sword', 'Amethyst Sword',
      'Cobalt Sword', 'Molten Sword', 'Frost Sword', 'Obsidian Trident'
    ] }
  ];

  // Unified item → sprite mapping for inventory icons (all from items_sheet.png)
  var ITEM_ICON_MAP = {
    // Ores (16 ores, rows 15-16 on items_sheet)
    'Copper Ore':    { sheet: 'items_sheet', x: 16, y: 256 },
    'Crimson Ore':   { sheet: 'items_sheet', x: 0, y: 256 },
    'Coal':          { sheet: 'items_sheet', x: 144, y: 256 },
    'Iron Ore':      { sheet: 'items_sheet', x: 560, y: 240 },
    'Gold Ore':      { sheet: 'items_sheet', x: 32, y: 256 },
    'Silver Ore':    { sheet: 'items_sheet', x: 528, y: 240 },
    'Astral Ore':    { sheet: 'items_sheet', x: 48, y: 256 },
    'Shadow Ore':    { sheet: 'items_sheet', x: 544, y: 240 },
    'Emerald Ore':   { sheet: 'items_sheet', x: 64, y: 256 },
    'Slate Ore':     { sheet: 'items_sheet', x: 528, y: 256 },
    'Mithril Ore':   { sheet: 'items_sheet', x: 128, y: 256 },
    'Amethyst Ore':  { sheet: 'items_sheet', x: 112, y: 256 },
    'Cobalt Ore':    { sheet: 'items_sheet', x: 80, y: 256 },
    'Molten Ore':    { sheet: 'items_sheet', x: 160, y: 256 },
    'Frost Ore':     { sheet: 'items_sheet', x: 320, y: 256 },
    'Obsidian Ore':  { sheet: 'items_sheet', x: 96, y: 256 },
    // Gems (row 15, items 541-558)
    'Peridot':       { sheet: 'items_sheet', x: 0, y: 240 },
    'Emerald':       { sheet: 'items_sheet', x: 32, y: 240 },
    'Aquamarine':    { sheet: 'items_sheet', x: 64, y: 240 },
    'Topaz':         { sheet: 'items_sheet', x: 96, y: 240 },
    'Onyx':          { sheet: 'items_sheet', x: 128, y: 240 },
    'Moonstone':     { sheet: 'items_sheet', x: 160, y: 240 },
    'Diamond':       { sheet: 'items_sheet', x: 176, y: 240 },
    'Opal':          { sheet: 'items_sheet', x: 224, y: 240 },
    'Sapphire':      { sheet: 'items_sheet', x: 48, y: 240 },
    'Ruby':          { sheet: 'items_sheet', x: 112, y: 240 },
    // Logs (row 27, items 990-997)
    'Pine Log':      { sheet: 'items_sheet', x: 272, y: 432 },
    'Oak Log':       { sheet: 'items_sheet', x: 288, y: 432 },
    'Birch Log':     { sheet: 'items_sheet', x: 304, y: 432 },
    'Maple Log':     { sheet: 'items_sheet', x: 320, y: 432 },
    'Walnut Log':    { sheet: 'items_sheet', x: 336, y: 432 },
    'Mahogany Log':  { sheet: 'items_sheet', x: 352, y: 432 },
    'Yew Log':       { sheet: 'items_sheet', x: 368, y: 432 },
    'Elder Log':     { sheet: 'items_sheet', x: 384, y: 432 },
    // Fish (row 29-30, 20 fish)
    'Anchovy':       { sheet: 'items_sheet', x: 544, y: 464 },
    'Goldfish':      { sheet: 'items_sheet', x: 96,  y: 464 },
    'Small Shark':   { sheet: 'items_sheet', x: 32,  y: 464 },
    'Koi':           { sheet: 'items_sheet', x: 48,  y: 464 },
    'Perch':         { sheet: 'items_sheet', x: 464, y: 464 },
    'Clownfish':     { sheet: 'items_sheet', x: 448, y: 464 },
    'Piranha':       { sheet: 'items_sheet', x: 144, y: 464 },
    'Flying Fish':   { sheet: 'items_sheet', x: 432, y: 464 },
    'Barracuda':     { sheet: 'items_sheet', x: 112, y: 464 },
    'Dolphin Fish':  { sheet: 'items_sheet', x: 256, y: 464 },
    'Betta':         { sheet: 'items_sheet', x: 288, y: 464 },
    'Stingray':      { sheet: 'items_sheet', x: 240, y: 464 },
    'Eye Fish':      { sheet: 'items_sheet', x: 368, y: 464 },
    'Spook Boy':     { sheet: 'items_sheet', x: 272, y: 464 },
    'Kingfish':      { sheet: 'items_sheet', x: 528, y: 464 },
    'Crawfish':      { sheet: 'items_sheet', x: 336, y: 480 },
    'Giant Crab':    { sheet: 'items_sheet', x: 320, y: 480 },
    'Anglerfish':    { sheet: 'items_sheet', x: 0,   y: 480 },
    'Hammerhead':    { sheet: 'items_sheet', x: 48,  y: 480 },
    'Shark':         { sheet: 'items_sheet', x: 64,  y: 480 },
    // Bars (12 bars, row 15 on items_sheet, all y=240)
    'Copper Bar':    { sheet: 'items_sheet', x: 384, y: 240 },
    'Bronze Bar':    { sheet: 'items_sheet', x: 368, y: 240 },
    'Gold Bar':      { sheet: 'items_sheet', x: 416, y: 240 },
    'Astral Bar':    { sheet: 'items_sheet', x: 336, y: 240 },
    'Silver Bar':    { sheet: 'items_sheet', x: 400, y: 240 },
    'Emerald Bar':   { sheet: 'items_sheet', x: 448, y: 240 },
    'Mithril Bar':   { sheet: 'items_sheet', x: 432, y: 240 },
    'Amethyst Bar':  { sheet: 'items_sheet', x: 496, y: 240 },
    'Cobalt Bar':    { sheet: 'items_sheet', x: 480, y: 240 },
    'Molten Bar':    { sheet: 'items_sheet', x: 352, y: 240 },
    'Frost Bar':     { sheet: 'items_sheet', x: 464, y: 240 },
    'Obsidian Bar':  { sheet: 'items_sheet', x: 512, y: 240 },
    // Equipment (v12: one sword per tier)
    'Copper Sword':        { sheet: 'items_sheet', x: 0,   y: 0 },
    'Bronze Sword':        { sheet: 'items_sheet', x: 96,  y: 0 },
    'Gold Sword':          { sheet: 'items_sheet', x: 64,  y: 0 },
    'Astral Sword':        { sheet: 'items_sheet', x: 288, y: 0 },
    'Silver Sword':        { sheet: 'items_sheet', x: 48,  y: 0 },
    'Emerald Sword':       { sheet: 'items_sheet', x: 208, y: 0 },
    'Mithril Sword':       { sheet: 'items_sheet', x: 240, y: 0 },
    'Amethyst Sword':      { sheet: 'items_sheet', x: 160, y: 0 },
    'Cobalt Sword':        { sheet: 'items_sheet', x: 224, y: 0 },
    'Molten Sword':        { sheet: 'items_sheet', x: 256, y: 0 },
    'Frost Sword':         { sheet: 'items_sheet', x: 80,  y: 0 },
    'Obsidian Trident':    { sheet: 'items_sheet', x: 512, y: 64 }
  };

  // ── Gathering → Inventory Name Maps ──────────
  var GEM_NAMES = ['Peridot', 'Emerald', 'Aquamarine', 'Topaz', 'Onyx', 'Moonstone', 'Diamond', 'Opal', 'Sapphire', 'Ruby'];

  var LOG_NAMES = {
    'Pine': 'Pine Log', 'Oak': 'Oak Log', 'Birch': 'Birch Log',
    'Maple': 'Maple Log', 'Walnut': 'Walnut Log', 'Mahogany': 'Mahogany Log',
    'Yew': 'Yew Log', 'Elder': 'Elder Log'
  };

  // ── Sprite Helper Functions ──────────────────
  function createSpriteEl(sheetKey, sx, sy, sw, sh, displayW, displayH) {
    var meta = SKILL_SHEET_META[sheetKey];
    if (!meta) return null;
    sw = sw || 16;
    sh = sh || 16;
    displayW = displayW || sw * 3;
    displayH = displayH || sh * 3;

    var el = document.createElement('div');
    el.className = 'skill-sprite';
    el.style.width = displayW + 'px';
    el.style.height = displayH + 'px';
    el.style.backgroundImage = 'url(' + SKILL_SPRITE_PATHS[sheetKey] + ')';

    var scaleX = displayW / sw;
    var scaleY = displayH / sh;
    el.style.backgroundSize = (meta.w * scaleX) + 'px ' + (meta.h * scaleY) + 'px';
    el.style.backgroundPosition = (-sx * scaleX) + 'px ' + (-sy * scaleY) + 'px';
    el.style.imageRendering = 'pixelated';
    el.style.backgroundRepeat = 'no-repeat';
    return el;
  }

  function spawnSpriteParticle(parentEl, sheetKey, sx, sy, sw, sh, displayW, displayH) {
    sw = sw || 16;
    sh = sh || 16;
    var dw = displayW || 32;
    var dh = displayH || 32;
    var el = createSpriteEl(sheetKey, sx, sy, sw, sh, dw, dh);
    if (!el) return;
    el.className = 'ore-particle sprite-particle';
    el.style.left = (Math.random() * 30 + 35) + '%';
    el.style.top = '45%';
    parentEl.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }

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
        { name: 'Copper Ore', level: 1, xp: 8, clickTime: 1200 },
        { name: 'Crimson Ore', level: 5, xp: 12, clickTime: 1165 },
        { name: 'Coal', level: 10, xp: 18, clickTime: 1130 },
        { name: 'Iron Ore', level: 18, xp: 26, clickTime: 1095 },
        { name: 'Gold Ore', level: 24, xp: 36, clickTime: 1060 },
        { name: 'Silver Ore', level: 30, xp: 48, clickTime: 1025 },
        { name: 'Astral Ore', level: 36, xp: 64, clickTime: 990 },
        { name: 'Shadow Ore', level: 42, xp: 84, clickTime: 955 },
        { name: 'Emerald Ore', level: 48, xp: 110, clickTime: 920 },
        { name: 'Slate Ore', level: 54, xp: 145, clickTime: 885 },
        { name: 'Mithril Ore', level: 60, xp: 190, clickTime: 850 },
        { name: 'Amethyst Ore', level: 66, xp: 245, clickTime: 815 },
        { name: 'Cobalt Ore', level: 72, xp: 315, clickTime: 780 },
        { name: 'Molten Ore', level: 78, xp: 400, clickTime: 745 },
        { name: 'Frost Ore', level: 85, xp: 520, clickTime: 710 },
        { name: 'Obsidian Ore', level: 92, xp: 680, clickTime: 675 }
      ]
    },
    fishing: {
      name: 'Fishing', icon: '\uD83C\uDFA3',
      resources: [
        { name: 'Anchovy',      level: 1,  xp: 8,   clickTime: 2000 },
        { name: 'Goldfish',     level: 5,  xp: 12,  clickTime: 1950 },
        { name: 'Small Shark',  level: 10, xp: 18,  clickTime: 1900 },
        { name: 'Koi',          level: 15, xp: 25,  clickTime: 1850 },
        { name: 'Perch',        level: 20, xp: 35,  clickTime: 1800 },
        { name: 'Clownfish',    level: 25, xp: 45,  clickTime: 1750 },
        { name: 'Piranha',      level: 30, xp: 60,  clickTime: 1700 },
        { name: 'Flying Fish',  level: 35, xp: 80,  clickTime: 1650 },
        { name: 'Barracuda',    level: 40, xp: 100, clickTime: 1600 },
        { name: 'Dolphin Fish', level: 45, xp: 125, clickTime: 1550 },
        { name: 'Betta',        level: 50, xp: 155, clickTime: 1500 },
        { name: 'Stingray',     level: 55, xp: 190, clickTime: 1400 },
        { name: 'Eye Fish',     level: 60, xp: 230, clickTime: 1350 },
        { name: 'Spook Boy',    level: 65, xp: 280, clickTime: 1300 },
        { name: 'Kingfish',     level: 70, xp: 340, clickTime: 1250 },
        { name: 'Crawfish',     level: 75, xp: 400, clickTime: 1200 },
        { name: 'Giant Crab',   level: 80, xp: 480, clickTime: 1150 },
        { name: 'Anglerfish',   level: 85, xp: 560, clickTime: 1100 },
        { name: 'Hammerhead',   level: 90, xp: 680, clickTime: 1050 },
        { name: 'Shark',        level: 95, xp: 800, clickTime: 1000 }
      ]
    },
    woodcutting: {
      name: 'Woodcutting', icon: '\uD83E\uDE93',
      resources: [
        { name: 'Pine', level: 1, xp: 10, clickTime: 1200 },
        { name: 'Oak', level: 10, xp: 20, clickTime: 1100 },
        { name: 'Birch', level: 20, xp: 35, clickTime: 1050 },
        { name: 'Maple', level: 35, xp: 65, clickTime: 1000 },
        { name: 'Walnut', level: 50, xp: 120, clickTime: 900 },
        { name: 'Mahogany', level: 65, xp: 220, clickTime: 800 },
        { name: 'Yew', level: 80, xp: 400, clickTime: 700 },
        { name: 'Elder', level: 92, xp: 700, clickTime: 600 }
      ]
    },
    smithing: {
      name: 'Smithing', icon: '\uD83D\uDD28',
      resources: [
        { name: 'Copper Bar', level: 1, xp: 10, clickTime: 1500 },
        { name: 'Bronze Bar', level: 8, xp: 18, clickTime: 1460 },
        { name: 'Gold Bar', level: 18, xp: 32, clickTime: 1420 },
        { name: 'Astral Bar', level: 25, xp: 50, clickTime: 1380 },
        { name: 'Silver Bar', level: 32, xp: 75, clickTime: 1340 },
        { name: 'Emerald Bar', level: 42, xp: 110, clickTime: 1280 },
        { name: 'Mithril Bar', level: 52, xp: 160, clickTime: 1220 },
        { name: 'Amethyst Bar', level: 62, xp: 225, clickTime: 1160 },
        { name: 'Cobalt Bar', level: 72, xp: 310, clickTime: 1100 },
        { name: 'Molten Bar', level: 80, xp: 420, clickTime: 1040 },
        { name: 'Frost Bar', level: 88, xp: 560, clickTime: 980 },
        { name: 'Obsidian Bar', level: 94, xp: 700, clickTime: 920 }
      ]
    },
    combat: {
      name: 'Combat', icon: '\u2694',
      resources: [
        { name: 'Training Dummy', level: 1, xp: 8, clickTime: 2000 },
        { name: 'Slime', level: 10, xp: 18, clickTime: 1800 },
        { name: 'Goblin', level: 25, xp: 40, clickTime: 1600 },
        { name: 'Skeleton', level: 40, xp: 85, clickTime: 1400 },
        { name: 'Demon', level: 55, xp: 170, clickTime: 1200 },
        { name: 'Dragon', level: 70, xp: 350, clickTime: 1000 },
        { name: 'Titan', level: 85, xp: 600, clickTime: 900 }
      ]
    }
  };

  var SKILL_KEYS = ['mining', 'fishing', 'woodcutting', 'smithing', 'combat'];

  // ── Smelting Recipes (Phase 6C) ────────────────
  var SMELTING_RECIPES = {
    'Copper Bar':    { level: 1,  inputs: [{ item: 'Copper Ore', qty: 2 }] },
    'Bronze Bar':    { level: 8,  inputs: [{ item: 'Copper Ore', qty: 1 }, { item: 'Crimson Ore', qty: 2 }] },
    'Gold Bar':      { level: 18, inputs: [{ item: 'Gold Ore', qty: 3 }] },
    'Astral Bar':    { level: 25, inputs: [{ item: 'Astral Ore', qty: 2 }, { item: 'Iron Ore', qty: 1 }] },
    'Silver Bar':    { level: 32, inputs: [{ item: 'Silver Ore', qty: 3 }, { item: 'Coal', qty: 1 }] },
    'Emerald Bar':   { level: 42, inputs: [{ item: 'Emerald Ore', qty: 4 }, { item: 'Coal', qty: 2 }] },
    'Mithril Bar':   { level: 52, inputs: [{ item: 'Mithril Ore', qty: 3 }, { item: 'Shadow Ore', qty: 2 }] },
    'Amethyst Bar':  { level: 62, inputs: [{ item: 'Amethyst Ore', qty: 4 }, { item: 'Coal', qty: 2 }] },
    'Cobalt Bar':    { level: 72, inputs: [{ item: 'Cobalt Ore', qty: 5 }, { item: 'Slate Ore', qty: 2 }] },
    'Molten Bar':    { level: 80, inputs: [{ item: 'Molten Ore', qty: 4 }, { item: 'Coal', qty: 3 }] },
    'Frost Bar':     { level: 88, inputs: [{ item: 'Frost Ore', qty: 5 }, { item: 'Coal', qty: 3 }] },
    'Obsidian Bar':  { level: 94, inputs: [{ item: 'Obsidian Ore', qty: 5 }, { item: 'Coal', qty: 5 }] }
  };
  var SMELTING_ORDER = ['Copper Bar', 'Bronze Bar', 'Gold Bar', 'Astral Bar', 'Silver Bar', 'Emerald Bar', 'Mithril Bar', 'Amethyst Bar', 'Cobalt Bar', 'Molten Bar', 'Frost Bar', 'Obsidian Bar'];

  // ── Forging Recipes (v12: one per tier) ────────
  var FORGING_RECIPES = [
    { name: 'Copper Sword',     level: 1,  xp: 15,  inputs: [{ item: 'Copper Bar',   qty: 3 }], sprite: { x: 0,   y: 0 } },
    { name: 'Bronze Sword',     level: 8,  xp: 25,  inputs: [{ item: 'Bronze Bar',   qty: 3 }], sprite: { x: 96,  y: 0 } },
    { name: 'Gold Sword',       level: 18, xp: 50,  inputs: [{ item: 'Gold Bar',     qty: 3 }], sprite: { x: 64,  y: 0 } },
    { name: 'Astral Sword',     level: 25, xp: 80,  inputs: [{ item: 'Astral Bar',   qty: 3 }], sprite: { x: 288, y: 0 } },
    { name: 'Silver Sword',     level: 32, xp: 120, inputs: [{ item: 'Silver Bar',   qty: 4 }], sprite: { x: 48,  y: 0 } },
    { name: 'Emerald Sword',    level: 42, xp: 180, inputs: [{ item: 'Emerald Bar',  qty: 4 }], sprite: { x: 208, y: 0 } },
    { name: 'Mithril Sword',    level: 52, xp: 260, inputs: [{ item: 'Mithril Bar',  qty: 4 }], sprite: { x: 240, y: 0 } },
    { name: 'Amethyst Sword',   level: 62, xp: 360, inputs: [{ item: 'Amethyst Bar', qty: 5 }], sprite: { x: 160, y: 0 } },
    { name: 'Cobalt Sword',     level: 72, xp: 480, inputs: [{ item: 'Cobalt Bar',   qty: 5 }], sprite: { x: 224, y: 0 } },
    { name: 'Molten Sword',     level: 80, xp: 620, inputs: [{ item: 'Molten Bar',   qty: 5 }], sprite: { x: 256, y: 0 } },
    { name: 'Frost Sword',      level: 88, xp: 780, inputs: [{ item: 'Frost Bar',    qty: 6 }], sprite: { x: 80,  y: 0 } },
    { name: 'Obsidian Trident', level: 94, xp: 950, inputs: [{ item: 'Obsidian Bar', qty: 6 }], sprite: { x: 512, y: 64 } }
  ];

  // ── State ─────────────────────────────────────
  var state = null;
  var activeSkill = 'mining';
  var spriteData = null;
  var catalog = null;
  var enemyData = null;
  var activeAutoTimer = null;
  var listenersAttached = false;

  // Mini-game specific state
  var miningCooldown = false;
  var miningCombo = { count: 0, lastClickTime: 0 };
  var selectedMiningOre = null; // index into SKILLS.mining.resources, null = highest
  var miningBgDataUrl = null; // cached PNG data URL for cavern background

  // Mining animation overlay state
  var miningAnimFrameId = null;
  var miningAnimCanvas = null;
  var miningAnimCtx = null;
  var miningAnimFrame = 0;
  var miningAnimLastTs = 0;
  var miningCartState = { x: 260, dir: 1 };
  var miningDripState = { y: 50, phase: 'falling', splashFrame: 0, pauseTime: 0 };
  var miningEmbers = []; // small particles floating from torches

  // Woodcutting animation overlay state
  var wcBgDataUrl = null; // cached PNG data URL for forest background
  var wcAnimFrameId = null;
  var wcAnimCanvas = null;
  var wcAnimCtx = null;
  var wcAnimFrame = 0;
  var wcAnimLastTs = 0;
  var wcLeaves = []; // falling leaf particles
  var wcTreesImg = null; // preloaded trees.png Image for canvas drawImage
  var wcExtrasImg = null; // preloaded forest-extras.png Image
  var wcFireflies = []; // firefly animation particles

  // Fishing animation overlay state
  var fishingBgDataUrl = null;
  var fishingAnimFrameId = null;
  var fishingAnimCanvas = null;
  var fishingAnimCtx = null;
  var fishingAnimFrame = 0;
  var fishingAnimLastTs = 0;
  var fishingRipples = [];
  var fishingGulls = [];
  var fishingClouds = [];
  var FISHING_W = 640, FISHING_H = 400;

  // Constants matching static BG coordinates
  var MINING_W = 640, MINING_H = 400;
  var MINING_FLOOR_Y = 310;
  var MINING_BEAM_X1 = 125, MINING_BEAM_X2 = 500, MINING_BEAM_W = 14, MINING_CROSS_Y = 60;
  var MINING_TORCH_POS = [
    { x: MINING_BEAM_X1 + MINING_BEAM_W + 3, y: MINING_CROSS_Y + 50 },
    { x: MINING_BEAM_X2 - 8, y: MINING_CROSS_Y + 50 },
    { x: 60, y: 150 },
    { x: MINING_W - 68, y: 150 }
  ];
  var MINING_LANTERN_X = (MINING_BEAM_X1 + MINING_BEAM_X2 + MINING_BEAM_W) / 2;
  var MINING_LANTERN_Y = MINING_CROSS_Y + 14;
  var MINING_PUD_X = 340, MINING_PUD_Y = MINING_H - 16;
  var MINING_CART_Y = MINING_FLOOR_Y + 12;
  var MINING_CART_W = 90, MINING_CART_H = 42;
  var MINING_RAIL_Y = MINING_CART_Y + MINING_CART_H + 6;

  // Woodcutting BG constants
  var WC_W = 640, WC_H = 400;
  var WC_HORIZON_Y = 160, WC_GROUND_Y = 185;

  // Deterministic tile hash (same as rpg.js)
  function tileHash(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return h;
  }
  var fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };
  var fishSpotState = [];              // [{ phase, hp, maxHp, biteTimer, missTimer }] per spot
  var fishingCombo = { count: 0, lastClickTime: 0 };
  var selectedFish = null;             // index into SKILLS.fishing.resources, null = highest
  var fishingEventActive = false;
  var fishingEventTimer = null;
  var fishSpotRespawnIntervals = [];
  var fishingCooldown = false;
  var wcState = { hits: 0, hitsNeeded: 0, cooldown: false, lastChopTime: 0 };
  var treeState = [];              // [{ hp, maxHp }] per tree (mirrors rockState)
  var wcCombo = { count: 0, lastClickTime: 0 };
  var selectedWcTree = null;       // index into SKILLS.woodcutting.resources, null = highest
  var wcEventActive = false;
  var wcEventTimer = null;
  var treeRespawnIntervals = [];
  var smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0, mode: 'smelting', smeltTemp: 0, smeltTimer: null, smeltHolding: false, cooldownTimer: null, blessedActive: false, oreSurgeCount: 0, masterTouchActive: false };

  // Smithing animation overlay state
  var smithingBgDataUrl = null;
  var smithingAnimFrameId = null;
  var smithingAnimCanvas = null;
  var smithingAnimCtx = null;
  var smithingAnimFrame = 0;
  var smithingAnimLastTs = 0;
  var smithingEmbers = [];
  var smithingSmokeWisps = [];
  var smithingCombo = { count: 0, lastClickTime: 0 };
  var smithingEventActive = false;
  var smithingEventTimer = null;
  var SMITHING_W = 640, SMITHING_H = 400;
  var SMITHING_FURNACE_X = 290, SMITHING_FURNACE_Y = 120;
  var combatState = {
    enemyHp: 0, enemyMaxHp: 0, enemyName: '', streak: 0, enemyTimer: null, cooldown: false,
    playerHp: 0, playerMaxHp: 0, potions: 3, dodgeCooldown: false, dead: false,
    dodgeWindow: false, dodgeWindowTimer: null, secondWindUsed: false
  };

  // Star shower state (B3)
  var starShowerActive = false;
  var starShowerTimer = null;

  // ── Load / Save ───────────────────────────────
  function defaultState() {
    var s = { skills: {}, version: STATE_VERSION, mastered: {}, activePlayTime: 0, inventory: {} };
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var skillDef = {
        level: 1,
        xp: 0,
        assignedPet: null,
        lastActiveAt: null,
        totalActions: 0
      };
      // Mining collection log (v3)
      if (SKILL_KEYS[i] === 'mining') {
        skillDef.log = { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
      }
      // Woodcutting collection log (v8)
      if (SKILL_KEYS[i] === 'woodcutting') {
        skillDef.log = { treesChopped: {}, birdNests: 0, doubleChops: 0, criticalHits: 0, totalClicks: 0, events: { goldenTree: 0, storm: 0, ancientGrove: 0, fairyRing: 0 } };
      }
      // Smithing collection log (v11)
      if (SKILL_KEYS[i] === 'smithing') {
        skillDef.log = {
          barsSmelted: {}, itemsForged: {}, perfectSmelts: 0, masterworks: 0,
          totalSmelts: 0, totalForges: 0, doubleBars: 0, noOreProcs: 0,
          totalClicks: 0, events: { blessedForge: 0, oreSurge: 0, masterTouch: 0, inferno: 0 }
        };
      }
      // Fishing collection log (v9)
      if (SKILL_KEYS[i] === 'fishing') {
        skillDef.log = {
          fishCaught: {}, totalRare: 0, goldenCatches: 0, doubleCatches: 0,
          criticalHits: 0, totalClicks: 0,
          sizes: { Tiny: 0, Small: 0, Normal: 0, Large: 0, Huge: 0 },
          events: { treasureChest: 0, schoolOfFish: 0, sharkAttack: 0, kraken: 0 }
        };
      }
      s.skills[SKILL_KEYS[i]] = skillDef;
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
          // v4/v5: inventory
          s.inventory = saved.inventory || {};
          // v5: Migrate renamed items (only for pre-v5 saves)
          if (!saved.version || saved.version < 5) {
            var invRenames = {
              'Astral Ore': 'Amethyst Ore',
              'Bronze Bar': 'Copper Bar', 'Steel Bar': 'Tin Bar',
              'Astral Bar': 'Silver Bar', 'Amethyst Bar': 'Ruby Bar',
              'Tree Log': 'Pine Log', 'Willow Log': 'Birch Log', 'Magic Log': 'Mahogany Log',
              'Dark Crab': 'Lobster'
            };
            for (var rOld in invRenames) {
              if (s.inventory[rOld]) {
                s.inventory[invRenames[rOld]] = (s.inventory[invRenames[rOld]] || 0) + s.inventory[rOld];
                delete s.inventory[rOld];
              }
            }
          }
          // v6: Rename materials (ore/bar sprites re-matched by color)
          if (!saved.version || saved.version < 6) {
            var v6Renames = {
              'Tin Ore': 'Bronze Ore', 'Tin Bar': 'Bronze Bar',
              'Tin Dagger': 'Bronze Dagger', 'Tin Helmet': 'Bronze Helmet',
              'Jade Ore': 'Emerald Ore', 'Jade Bar': 'Emerald Bar',
              'Jade Staff': 'Emerald Staff', 'Jade Chestplate': 'Emerald Chestplate', 'Jade Crown': 'Emerald Crown',
              'Amethyst Ore': 'Mithril Ore',
              'Ruby Ore': 'Amethyst Ore', 'Ruby Bar': 'Amethyst Bar',
              'Ruby Dagger': 'Amethyst Dagger', 'Ruby Bow': 'Amethyst Bow', 'Ruby Helmet': 'Amethyst Helmet',
              'Frost Ore': 'Cobalt Ore', 'Frost Bar': 'Cobalt Bar',
              'Frost Sword': 'Cobalt Sword', 'Frost Chestplate': 'Cobalt Chestplate', 'Frost Spear': 'Cobalt Spear',
              'Dragon Ore': 'Frost Ore', 'Dragon Bar': 'Frost Bar',
              'Dragon Sword': 'Frost Sword', 'Dragon Axe': 'Frost Axe', 'Dragon Chestplate': 'Frost Chestplate',
              'Star Ore': 'Obsidian Ore'
            };
            var newInv = {};
            for (var invKey in s.inventory) {
              var nk = v6Renames[invKey] || invKey;
              newInv[nk] = (newInv[nk] || 0) + s.inventory[invKey];
            }
            s.inventory = newInv;
          }
          // v7: Rename Iron Bar/equipment→Astral, Bronze Ore→Crimson Ore, add new bars
          if (!saved.version || saved.version < 7) {
            var v7Renames = {
              'Iron Bar': 'Astral Bar',
              'Iron Sword': 'Astral Sword', 'Iron Axe': 'Astral Axe', 'Iron Chestplate': 'Astral Chestplate',
              'Bronze Ore': 'Crimson Ore'
            };
            var v7Inv = {};
            for (var v7Key in s.inventory) {
              var v7nk = v7Renames[v7Key] || v7Key;
              v7Inv[v7nk] = (v7Inv[v7nk] || 0) + s.inventory[v7Key];
            }
            s.inventory = v7Inv;
          }
          for (var i = 0; i < SKILL_KEYS.length; i++) {
            var key = SKILL_KEYS[i];
            if (saved.skills[key]) {
              s.skills[key].level = saved.skills[key].level || 1;
              s.skills[key].xp = saved.skills[key].xp || 0;
              s.skills[key].assignedPet = saved.skills[key].assignedPet || null;
              s.skills[key].lastActiveAt = saved.skills[key].lastActiveAt || null;
              s.skills[key].totalActions = saved.skills[key].totalActions || 0;
              // v8: woodcutting collection log
              if (key === 'woodcutting') {
                s.skills[key].log = saved.skills[key].log || { treesChopped: {}, birdNests: 0, doubleChops: 0, criticalHits: 0, totalClicks: 0, events: { goldenTree: 0, storm: 0, ancientGrove: 0, fairyRing: 0 } };
                // Ensure all event keys exist for older saves
                if (!s.skills[key].log.events) s.skills[key].log.events = {};
                if (!s.skills[key].log.events.goldenTree) s.skills[key].log.events.goldenTree = 0;
                if (!s.skills[key].log.events.storm) s.skills[key].log.events.storm = 0;
                if (!s.skills[key].log.events.ancientGrove) s.skills[key].log.events.ancientGrove = 0;
                if (!s.skills[key].log.events.fairyRing) s.skills[key].log.events.fairyRing = 0;
                if (!s.skills[key].log.treesChopped) s.skills[key].log.treesChopped = {};
                if (typeof s.skills[key].log.criticalHits === 'undefined') s.skills[key].log.criticalHits = 0;
                if (typeof s.skills[key].log.totalClicks === 'undefined') s.skills[key].log.totalClicks = 0;
              }
              // v3: mining collection log
              if (key === 'mining') {
                s.skills[key].log = saved.skills[key].log || { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
                // Migrate renamed ores in collection log (v3 → v5)
                if (!saved.version || saved.version < 5) {
                  var oreRenames = {
                    'Mithril Ore': 'Amethyst Ore', 'Adamant Ore': 'Jade Ore', 'Runite Ore': 'Amethyst Ore',
                    'Astral Ore': 'Amethyst Ore'
                  };
                  var om = s.skills[key].log.oresMined;
                  for (var oldName in oreRenames) {
                    if (om[oldName]) { om[oreRenames[oldName]] = (om[oreRenames[oldName]] || 0) + om[oldName]; delete om[oldName]; }
                  }
                }
                // v6: rename ores in collection log
                if (!saved.version || saved.version < 6) {
                  var v6OreLog = {
                    'Tin Ore': 'Bronze Ore', 'Jade Ore': 'Emerald Ore',
                    'Amethyst Ore': 'Mithril Ore', 'Ruby Ore': 'Amethyst Ore',
                    'Frost Ore': 'Cobalt Ore', 'Dragon Ore': 'Frost Ore', 'Star Ore': 'Obsidian Ore'
                  };
                  var oldLog = s.skills[key].log.oresMined;
                  var newLog = {};
                  for (var logKey in oldLog) {
                    var nlk = v6OreLog[logKey] || logKey;
                    newLog[nlk] = (newLog[nlk] || 0) + oldLog[logKey];
                  }
                  s.skills[key].log.oresMined = newLog;
                }
                // v7: rename Bronze Ore → Crimson Ore in collection log
                if (!saved.version || saved.version < 7) {
                  var v7OreLog = { 'Bronze Ore': 'Crimson Ore' };
                  var v7oldLog = s.skills[key].log.oresMined;
                  var v7newLog = {};
                  for (var v7logKey in v7oldLog) {
                    var v7nlk = v7OreLog[v7logKey] || v7logKey;
                    v7newLog[v7nlk] = (v7newLog[v7nlk] || 0) + v7oldLog[v7logKey];
                  }
                  s.skills[key].log.oresMined = v7newLog;
                }
              }
              // v9: fishing collection log
              if (key === 'fishing') {
                var flog = saved.skills[key].log || {};
                s.skills[key].log = {
                  fishCaught: flog.fishCaught || {},
                  totalRare: flog.totalRare || 0,
                  goldenCatches: flog.goldenCatches || 0,
                  doubleCatches: flog.doubleCatches || 0,
                  criticalHits: flog.criticalHits || 0,
                  totalClicks: flog.totalClicks || 0,
                  sizes: flog.sizes || { Tiny: 0, Small: 0, Normal: 0, Large: 0, Huge: 0 },
                  events: {
                    treasureChest: (flog.events && flog.events.treasureChest) || 0,
                    schoolOfFish: (flog.events && flog.events.schoolOfFish) || 0,
                    sharkAttack: (flog.events && flog.events.sharkAttack) || 0,
                    kraken: (flog.events && flog.events.kraken) || 0
                  }
                };
              }
              // v11: smithing collection log
              if (key === 'smithing') {
                var slog = saved.skills[key].log || {};
                s.skills[key].log = {
                  barsSmelted: slog.barsSmelted || {},
                  itemsForged: slog.itemsForged || {},
                  perfectSmelts: slog.perfectSmelts || 0,
                  masterworks: slog.masterworks || 0,
                  totalSmelts: slog.totalSmelts || 0,
                  totalForges: slog.totalForges || 0,
                  doubleBars: slog.doubleBars || 0,
                  noOreProcs: slog.noOreProcs || 0,
                  totalClicks: slog.totalClicks || 0,
                  events: {
                    blessedForge: (slog.events && slog.events.blessedForge) || 0,
                    oreSurge: (slog.events && slog.events.oreSurge) || 0,
                    masterTouch: (slog.events && slog.events.masterTouch) || 0,
                    inferno: (slog.events && slog.events.inferno) || 0
                  }
                };
              }
              // v12: forging overhaul — one sword per tier, remove old equipment from inventory
              if (!saved.version || saved.version < 12) {
                var v12Old = ['Copper Shield','Bronze Dagger','Bronze Helmet','Astral Axe','Astral Chestplate','Gold Shield','Silver Spear','Silver Chestplate','Emerald Staff','Emerald Chestplate','Emerald Crown','Amethyst Dagger','Amethyst Bow','Amethyst Helmet','Cobalt Chestplate','Cobalt Spear','Frost Axe','Frost Chestplate'];
                for (var v12i = 0; v12i < v12Old.length; v12i++) {
                  if (s.inventory[v12Old[v12i]]) delete s.inventory[v12Old[v12i]];
                }
              }
              // v10: fish expansion (12→20), remove old fish from inventory
              if (key === 'fishing' && (!saved.version || saved.version < 10)) {
                var v10ValidFish = { 'Anchovy':1, 'Goldfish':1, 'Small Shark':1, 'Koi':1, 'Perch':1, 'Clownfish':1, 'Piranha':1, 'Flying Fish':1, 'Barracuda':1, 'Dolphin Fish':1, 'Betta':1, 'Stingray':1, 'Eye Fish':1, 'Spook Boy':1, 'Kingfish':1, 'Crawfish':1, 'Giant Crab':1, 'Anglerfish':1, 'Hammerhead':1, 'Shark':1 };
                var v10OldFish = ['Minnow', 'Shrimp', 'Trout', 'Bass', 'Salmon', 'Catfish', 'Swordfish', 'Lobster', 'Leviathan'];
                for (var v10i = 0; v10i < v10OldFish.length; v10i++) {
                  if (s.inventory[v10OldFish[v10i]]) delete s.inventory[v10OldFish[v10i]];
                }
              }
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

  // ── Inventory helpers ───────────────────────────
  function addItem(key, count) {
    if (!state || !key || count <= 0) return 0;
    var cur = state.inventory[key] || 0;
    var added = Math.min(count, STACK_CAP - cur);
    if (added <= 0) return 0;
    state.inventory[key] = cur + added;
    saveState();
    renderInventoryPanel();
    return added;
  }

  function removeItem(key, count) {
    if (!state || !key || count <= 0) return false;
    var cur = state.inventory[key] || 0;
    if (cur < count) return false;
    cur -= count;
    if (cur <= 0) {
      delete state.inventory[key];
    } else {
      state.inventory[key] = cur;
    }
    saveState();
    renderInventoryPanel();
    return true;
  }

  function hasItem(key, count) {
    count = count || 1;
    return (state.inventory[key] || 0) >= count;
  }

  function getItemCount(key) {
    return state.inventory[key] || 0;
  }

  // ── Smelting / Forging helpers (Phase 6C) ──────
  function canSmelt(barName) {
    var recipe = SMELTING_RECIPES[barName];
    if (!recipe) return false;
    for (var i = 0; i < recipe.inputs.length; i++) {
      if (!hasItem(recipe.inputs[i].item, recipe.inputs[i].qty)) return false;
    }
    return true;
  }

  function consumeSmeltingOres(barName) {
    var recipe = SMELTING_RECIPES[barName];
    if (!recipe) return false;
    // Pre-check all inputs before removing any (atomic)
    for (var i = 0; i < recipe.inputs.length; i++) {
      if (!hasItem(recipe.inputs[i].item, recipe.inputs[i].qty)) return false;
    }
    for (var j = 0; j < recipe.inputs.length; j++) {
      removeItem(recipe.inputs[j].item, recipe.inputs[j].qty);
    }
    return true;
  }

  function canForge(recipe) {
    for (var i = 0; i < recipe.inputs.length; i++) {
      if (!hasItem(recipe.inputs[i].item, recipe.inputs[i].qty)) return false;
    }
    return true;
  }

  function consumeForgingMats(recipe) {
    // Pre-check all inputs before removing any (atomic)
    for (var i = 0; i < recipe.inputs.length; i++) {
      if (!hasItem(recipe.inputs[i].item, recipe.inputs[i].qty)) return false;
    }
    for (var j = 0; j < recipe.inputs.length; j++) {
      removeItem(recipe.inputs[j].item, recipe.inputs[j].qty);
    }
    return true;
  }

  function renderMaterialRequirements(container, inputs) {
    container.innerHTML = '';
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var have = getItemCount(inp.item);
      var need = inp.qty;
      var sufficient = have >= need;

      var row = document.createElement('div');
      row.className = 'smithing-mat-row';

      var iconData = ITEM_ICON_MAP[inp.item];
      if (iconData) {
        var sprite = createSpriteEl(iconData.sheet, iconData.x, iconData.y, 16, 16, 24, 24);
        if (sprite) row.appendChild(sprite);
      }

      var text = document.createElement('span');
      text.className = 'smithing-mat-text';
      text.style.color = sufficient ? 'var(--accent)' : '#f44';
      text.textContent = inp.item + ': ' + have + '/' + need;
      row.appendChild(text);

      container.appendChild(row);
    }
  }

  // ── Pet state helpers ─────────────────────────
  function loadPetState() {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
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

    // Perk unlock check (all skills)
    var skillPerks = SKILL_PERKS[skill];
    if (skillPerks) {
      for (var pi = 0; pi < skillPerks.length; pi++) {
        if (skillPerks[pi].level > oldLevel && skillPerks[pi].level <= newLevel) {
          showPerkUnlockToast(skillPerks[pi]);
        }
      }
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

    // Update resource dropdown on level-up (adds newly unlocked resources without resetting game state)
    if (skill === activeSkill) {
      if (skill === 'mining') updateMiningOreDropdown();
      if (skill === 'fishing') updateFishDropdown();
      if (skill === 'woodcutting') updateWcTreeDropdown();
    }
  }

  // ── B1: Level-Up Visual Effect (OSRS Circle) ──
  function showLevelUpEffect(skill, level) {
    // Glow pulse on skill row
    var rows = document.querySelectorAll('.skill-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-skill') === skill) {
        rows[i].classList.add('level-up-glow');
        setTimeout(function (row) { return function () { row.classList.remove('level-up-glow'); }; }(rows[i]), 1500);
      }
    }

    // OSRS-style circle overlay in game area
    var area = $('skills-game-area');
    if (area) {
      var container = document.createElement('div');
      container.className = 'level-up-circle-container';

      // "LEVEL UP" banner text
      var banner = document.createElement('div');
      banner.className = 'level-up-circle-banner';
      banner.textContent = 'LEVEL UP';
      container.appendChild(banner);

      // Dark circle with gold ring
      var circle = document.createElement('div');
      circle.className = 'level-up-circle';

      // Skill icon sprite inside circle
      var iconInfo = SKILL_ICON_SPRITES[skill];
      if (iconInfo) {
        var icon = createSpriteEl(iconInfo.sheet, iconInfo.x, iconInfo.y, 16, 16, 32, 32);
        if (icon) {
          icon.className = 'level-up-circle-icon';
          circle.appendChild(icon);
        }
      }

      // Level number
      var lvNum = document.createElement('div');
      lvNum.className = 'level-up-circle-level';
      lvNum.textContent = level;
      circle.appendChild(lvNum);

      container.appendChild(circle);

      // Skill name below
      var skillName = document.createElement('div');
      skillName.className = 'level-up-circle-skill';
      skillName.textContent = SKILLS[skill].name;
      container.appendChild(skillName);

      area.appendChild(container);
      setTimeout(function () { if (container.parentNode) container.parentNode.removeChild(container); }, 2200);
    }

    // Screen flash removed — filter:brightness creates new containing block, causing layout shift
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

  // ── Perk Unlock Toast ──────────────────────────
  function showPerkUnlockToast(perk) {
    var area = $('skills-game-area');
    if (area) {
      var toast = document.createElement('div');
      toast.className = 'skills-perk-toast';
      toast.textContent = 'PERK UNLOCKED: ' + perk.name + ' — ' + perk.desc;
      area.appendChild(toast);
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
    }
    addLog('Perk unlocked: ' + perk.name + '!');
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
      banner.textContent = 'STAR SHOWER! 2x XP (30s)';
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
      addLog(SKILLS[skill].name + ' MASTERED! +5% global XP bonus.');
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

  // ── Mining Collection Log helper ─────────────
  function getMiningLog() {
    if (!state.skills.mining.log) {
      state.skills.mining.log = { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
    }
    return state.skills.mining.log;
  }

  // ── Woodcutting Collection Log helper ──────────
  function getWcLog() {
    if (!state.skills.woodcutting.log) {
      state.skills.woodcutting.log = { treesChopped: {}, birdNests: 0, doubleChops: 0, criticalHits: 0, totalClicks: 0, events: { goldenTree: 0, storm: 0, ancientGrove: 0, fairyRing: 0 } };
    }
    return state.skills.woodcutting.log;
  }

  // ── Fishing Collection Log helper ──────────
  function getFishingLog() {
    if (!state.skills.fishing.log) {
      state.skills.fishing.log = {
        fishCaught: {}, totalRare: 0, goldenCatches: 0, doubleCatches: 0,
        criticalHits: 0, totalClicks: 0,
        sizes: { Tiny: 0, Small: 0, Normal: 0, Large: 0, Huge: 0 },
        events: { treasureChest: 0, schoolOfFish: 0, sharkAttack: 0, kraken: 0 }
      };
    }
    return state.skills.fishing.log;
  }

  // ── Smithing Collection Log helper ──────────
  function getSmithingLog() {
    if (!state.skills.smithing.log) {
      state.skills.smithing.log = {
        barsSmelted: {}, itemsForged: {}, perfectSmelts: 0, masterworks: 0,
        totalSmelts: 0, totalForges: 0, doubleBars: 0, noOreProcs: 0,
        totalClicks: 0, events: { blessedForge: 0, oreSurge: 0, masterTouch: 0, inferno: 0 }
      };
    }
    return state.skills.smithing.log;
  }

  // ── Perk helpers ────────────────────────────
  function hasPerk(perkId, skill) {
    var sk = skill || 'mining';
    var perks = SKILL_PERKS[sk];
    if (!perks || !state || !state.skills[sk]) return false;
    var level = state.skills[sk].level;
    for (var i = 0; i < perks.length; i++) {
      if (perks[i].id === perkId) return level >= perks[i].level;
    }
    return false;
  }

  function renderPerksModal() {
    var content = $('skills-perks-content');
    var titleEl = document.querySelector('#skills-perks-overlay .skills-log-modal h3');
    if (!content) return;

    var perks = SKILL_PERKS[activeSkill];
    var skillName = activeSkill.charAt(0).toUpperCase() + activeSkill.slice(1);
    if (titleEl) titleEl.textContent = skillName + ' Perks';

    content.innerHTML = '';
    if (!perks) return;

    var level = state.skills[activeSkill].level;
    var unlockedCount = 0;
    for (var i = 0; i < perks.length; i++) {
      if (level >= perks[i].level) unlockedCount++;
    }

    var summary = document.createElement('div');
    summary.className = 'perks-summary';
    summary.textContent = unlockedCount + ' / ' + perks.length + ' unlocked';
    content.appendChild(summary);

    for (var i = 0; i < perks.length; i++) {
      var perk = perks[i];
      var unlocked = level >= perk.level;
      var row = document.createElement('div');
      row.className = 'perk-row ' + (unlocked ? 'perk-unlocked' : 'perk-locked');

      var name = document.createElement('div');
      name.className = 'perk-name';
      name.textContent = (unlocked ? '\u2713 ' : '') + perk.name;
      row.appendChild(name);

      var desc = document.createElement('div');
      desc.className = 'perk-desc';
      desc.textContent = perk.desc;
      row.appendChild(desc);

      if (!unlocked) {
        var req = document.createElement('div');
        req.className = 'perk-req';
        req.textContent = 'Requires Lv ' + perk.level;
        row.appendChild(req);
      }

      content.appendChild(row);
    }
  }

  function showPerksModal() {
    renderPerksModal();
    var overlay = $('skills-perks-overlay');
    if (overlay) overlay.style.display = '';
  }

  // ── Combined XP multiplier ──────────────────
  function getXpMult() {
    var mult = getStarShowerMult() * getMasteryBonus();
    // Per-skill XP perks (level 30 = +25%, level 99 = 2x)
    var xpPerks = {
      mining: { mid: 'prospector', master: 'mastery' },
      fishing: { mid: 'deepCast', master: 'fishMastery' },
      woodcutting: { mid: 'forester', master: 'wcMastery' },
      smithing: { mid: 'metalworker', master: 'smithMastery' },
      combat: { mid: 'warrior', master: 'combatMastery' }
    };
    var perkIds = xpPerks[activeSkill];
    if (perkIds) {
      if (hasPerk(perkIds.mid, activeSkill)) mult *= 1.25;
      if (hasPerk(perkIds.master, activeSkill)) mult *= 2;
    }
    return mult;
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

  function getSelectedMiningResource() {
    if (selectedMiningOre !== null) {
      var r = SKILLS.mining.resources[selectedMiningOre];
      if (r && r.level <= state.skills.mining.level) return r;
    }
    return getHighestResource('mining');
  }

  function getSelectedWcResource() {
    if (selectedWcTree !== null) {
      var r = SKILLS.woodcutting.resources[selectedWcTree];
      if (r && r.level <= state.skills.woodcutting.level) return r;
    }
    return getHighestResource('woodcutting');
  }

  function getSelectedFishResource() {
    if (selectedFish !== null) {
      var r = SKILLS.fishing.resources[selectedFish];
      if (r && r.level <= state.skills.fishing.level) return r;
    }
    return getHighestResource('fishing');
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

  function getToolCooldown(skill, baseCooldown) {
    return baseCooldown;
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
    p.style.left = (Math.random() * 30 + 35) + '%';
    p.style.top = '45%';
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
  function onAction(skill) {
    // Track total actions (B5)
    state.skills[skill].totalActions = (state.skills[skill].totalActions || 0) + 1;

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

      levelSpan.textContent = 'Lv ' + s.level;

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
    var total = getTotalLevels();
    if (totalEl) totalEl.textContent = total;
    // Update chatbox OSRS grid total (RPG mode)
    var gridTotal = $('osrs-skills-total');
    if (gridTotal) gridTotal.textContent = 'Total Level: ' + total;
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
        nameEl.textContent = c.name;
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
        var res = (activeSkill === 'mining') ? getSelectedMiningResource() : (activeSkill === 'woodcutting') ? getSelectedWcResource() : (activeSkill === 'fishing') ? getSelectedFishResource() : getHighestResource(activeSkill);
        var skillVerbs = {
          mining: 'Mining', fishing: 'Fishing for', woodcutting: 'Chopping',
          smithing: 'Smithing', combat: 'Fighting'
        };
        var verb = skillVerbs[activeSkill] || 'Training';
        var tierMult = getTierMult(petId);
        var typeBonus2 = getTypeBonus(petId, activeSkill);
        var idleXp = Math.floor(res.xp * tierMult * typeBonus2);
        activityEl.textContent = verb + ' ' + res.name + ' (' + idleXp + ' XP/action)';
      }
    } else {
      if (emptyEl) emptyEl.style.display = '';
      if (assignedEl) assignedEl.style.display = 'none';
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

    // Perks button visibility (all skills have perks now)
    var perksBtn = $('skills-perks-btn');
    if (perksBtn) perksBtn.style.display = '';

    // Collection log button visibility
    var logBtn = $('skills-log-btn');
    if (logBtn) logBtn.style.display = (activeSkill === 'mining' || activeSkill === 'woodcutting' || activeSkill === 'fishing') ? '' : 'none';

    // B5: Milestones panel
    renderMilestones();

    // 6A: Inventory panel
    renderInventoryPanel();
  }

  // ── B5: Milestones Rendering ──────────────────
  function renderMilestones() {
    var actionsEl = $('ms-total-actions');
    var highestEl = $('ms-highest-level');
    var masteredEl = $('ms-mastered-count');

    var s = state.skills[activeSkill];
    if (actionsEl) actionsEl.textContent = formatNum(s.totalActions || 0);
    if (highestEl) highestEl.textContent = getHighestLevel();
    if (masteredEl) masteredEl.textContent = getMasteredCount();
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  // ── Inventory Panel ──────────────────────────────
  var invCollapsed = false;
  var invTooltipEl = null;

  function showInvTooltip(e) {
    if (!invTooltipEl) {
      invTooltipEl = document.createElement('div');
      invTooltipEl.className = 'skills-inv-tooltip';
      document.body.appendChild(invTooltipEl);
    }
    invTooltipEl.textContent = e.currentTarget._tooltipText;
    invTooltipEl.style.display = '';
    var rect = e.currentTarget.getBoundingClientRect();
    invTooltipEl.style.left = rect.left + 'px';
    invTooltipEl.style.top = (rect.top - invTooltipEl.offsetHeight - 6) + 'px';
  }

  function hideInvTooltip() {
    if (invTooltipEl) invTooltipEl.style.display = 'none';
  }

  function renderInventoryPanel() {
    var emptyEl = $('skills-inv-empty');
    var groupsEl = $('skills-inv-groups');
    var toggleEl = $('skills-inv-toggle');
    if (!groupsEl) return;

    // Count total items
    var totalCount = 0;
    var inv = state.inventory;
    for (var k in inv) {
      if (inv.hasOwnProperty(k)) totalCount += inv[k];
    }

    if (totalCount === 0) {
      if (emptyEl) emptyEl.style.display = '';
      groupsEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    groupsEl.style.display = '';
    groupsEl.innerHTML = '';

    for (var c = 0; c < ITEM_CATEGORIES.length; c++) {
      var cat = ITEM_CATEGORIES[c];
      // Filter to items player has
      var hasAny = false;
      for (var j = 0; j < cat.items.length; j++) {
        if (inv[cat.items[j]]) { hasAny = true; break; }
      }
      if (!hasAny) continue;

      var label = document.createElement('div');
      label.className = 'skills-inv-group-label';
      label.textContent = cat.label;
      groupsEl.appendChild(label);

      var grid = document.createElement('div');
      grid.className = 'skills-inv-grid';
      groupsEl.appendChild(grid);

      for (var i = 0; i < cat.items.length; i++) {
        var itemKey = cat.items[i];
        var qty = inv[itemKey];
        if (!qty) continue;
        var iconData = ITEM_ICON_MAP[itemKey];
        if (!iconData) continue;

        var cell = document.createElement('div');
        cell.className = 'skills-inv-cell';
        cell._tooltipText = itemKey + ' \u00d7 ' + qty;
        cell.addEventListener('mouseenter', showInvTooltip);
        cell.addEventListener('mouseleave', hideInvTooltip);

        var sprite = createSpriteEl(iconData.sheet, iconData.x, iconData.y, 16, 16, 24, 24);
        if (sprite) cell.appendChild(sprite);

        var countEl = document.createElement('span');
        countEl.className = 'skills-inv-count';
        countEl.textContent = qty;
        cell.appendChild(countEl);

        grid.appendChild(cell);
      }
    }
  }

  function toggleInventoryPanel() {
    var panel = $('skills-inv-panel');
    var toggleEl = $('skills-inv-toggle');
    if (!panel) return;
    invCollapsed = !invCollapsed;
    panel.style.display = invCollapsed ? 'none' : '';
    if (toggleEl) toggleEl.textContent = invCollapsed ? '[+]' : '[\u2212]';
  }

  // ── Collection Log ─────────────────────────────
  function renderCollectionLog() {
    var content = $('skills-log-content');
    if (!content) return;
    content.innerHTML = '';

    var log = getMiningLog();

    // Ore table
    var oreSection = document.createElement('div');
    oreSection.innerHTML = '<h4 class="skills-log-section-title">Ores Mined</h4>';
    var oreTable = document.createElement('table');
    oreTable.className = 'skills-log-table';
    var resources = SKILLS.mining.resources;
    for (var i = 0; i < resources.length; i++) {
      var count = log.oresMined[resources[i].name] || 0;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + resources[i].name + '</td><td>' + formatNum(count) + '</td>';
      if (count === 0) tr.style.opacity = '0.4';
      oreTable.appendChild(tr);
    }
    oreSection.appendChild(oreTable);
    content.appendChild(oreSection);

    // Stats
    var statsSection = document.createElement('div');
    statsSection.innerHTML = '<h4 class="skills-log-section-title">Stats</h4>';
    var stats = [
      ['Total Clicks', formatNum(log.totalClicks)],
      ['Gems Found', formatNum(log.totalGems)],
      ['Critical Hits', formatNum(log.criticalHits)],
      ['Crit Rate', log.totalClicks > 0 ? (log.criticalHits / log.totalClicks * 100).toFixed(1) + '%' : '0%']
    ];
    var statsTable = document.createElement('table');
    statsTable.className = 'skills-log-table';
    for (var j = 0; j < stats.length; j++) {
      var tr2 = document.createElement('tr');
      tr2.innerHTML = '<td>' + stats[j][0] + '</td><td>' + stats[j][1] + '</td>';
      statsTable.appendChild(tr2);
    }
    statsSection.appendChild(statsTable);
    content.appendChild(statsSection);

    // Events
    var evSection = document.createElement('div');
    evSection.innerHTML = '<h4 class="skills-log-section-title">Events</h4>';
    var evTable = document.createElement('table');
    evTable.className = 'skills-log-table';
    var evNames = [
      ['Gem Vein', log.events.gemVein],
      ['Shooting Star', log.events.shootingStar],
      ['Cave-In', log.events.caveIn],
      ['Deep Vein', log.events.deepVein]
    ];
    for (var k = 0; k < evNames.length; k++) {
      var tr3 = document.createElement('tr');
      tr3.innerHTML = '<td>' + evNames[k][0] + '</td><td>' + evNames[k][1] + '</td>';
      if (evNames[k][1] === 0) tr3.style.opacity = '0.4';
      evTable.appendChild(tr3);
    }
    evSection.appendChild(evTable);
    content.appendChild(evSection);
  }

  function renderWcCollectionLog() {
    var content = $('skills-log-content');
    if (!content) return;
    content.innerHTML = '';

    var log = getWcLog();

    // Trees chopped table
    var treeSection = document.createElement('div');
    treeSection.innerHTML = '<h4 class="skills-log-section-title">Trees Chopped</h4>';
    var treeTable = document.createElement('table');
    treeTable.className = 'skills-log-table';
    var resources = SKILLS.woodcutting.resources;
    for (var i = 0; i < resources.length; i++) {
      var count = log.treesChopped[resources[i].name] || 0;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + resources[i].name + '</td><td>' + formatNum(count) + '</td>';
      if (count === 0) tr.style.opacity = '0.4';
      treeTable.appendChild(tr);
    }
    treeSection.appendChild(treeTable);
    content.appendChild(treeSection);

    // Stats
    var statsSection = document.createElement('div');
    statsSection.innerHTML = '<h4 class="skills-log-section-title">Stats</h4>';
    var stats = [
      ['Total Clicks', formatNum(log.totalClicks)],
      ['Bird Nests', formatNum(log.birdNests)],
      ['Double Chops', formatNum(log.doubleChops)],
      ['Critical Hits', formatNum(log.criticalHits)],
      ['Crit Rate', log.totalClicks > 0 ? (log.criticalHits / log.totalClicks * 100).toFixed(1) + '%' : '0%']
    ];
    var statsTable = document.createElement('table');
    statsTable.className = 'skills-log-table';
    for (var j = 0; j < stats.length; j++) {
      var tr2 = document.createElement('tr');
      tr2.innerHTML = '<td>' + stats[j][0] + '</td><td>' + stats[j][1] + '</td>';
      statsTable.appendChild(tr2);
    }
    statsSection.appendChild(statsTable);
    content.appendChild(statsSection);

    // Events
    var evSection = document.createElement('div');
    evSection.innerHTML = '<h4 class="skills-log-section-title">Events</h4>';
    var evTable = document.createElement('table');
    evTable.className = 'skills-log-table';
    var evNames = [
      ['Golden Tree', log.events.goldenTree],
      ['Storm', log.events.storm],
      ['Ancient Grove', log.events.ancientGrove],
      ['Fairy Ring', log.events.fairyRing]
    ];
    for (var k = 0; k < evNames.length; k++) {
      var tr3 = document.createElement('tr');
      tr3.innerHTML = '<td>' + evNames[k][0] + '</td><td>' + evNames[k][1] + '</td>';
      if (evNames[k][1] === 0) tr3.style.opacity = '0.4';
      evTable.appendChild(tr3);
    }
    evSection.appendChild(evTable);
    content.appendChild(evSection);
  }

  function showCollectionLog() {
    if (activeSkill === 'woodcutting') {
      renderWcCollectionLog();
    } else if (activeSkill === 'fishing') {
      renderFishingCollectionLog();
    } else if (activeSkill === 'smithing') {
      renderSmithingCollectionLog();
    } else {
      renderCollectionLog();
    }
    var overlay = $('skills-log-overlay');
    if (overlay) overlay.style.display = '';
  }

  // ── Phase 3: Replace skill icons with sprites ──
  function replaceSkillIcons() {
    var rows = document.querySelectorAll('.skill-row');
    for (var i = 0; i < rows.length; i++) {
      var key = rows[i].getAttribute('data-skill');
      var iconSpan = rows[i].querySelector('.skill-icon');
      if (!iconSpan || !SKILL_ICON_SPRITES[key]) continue;
      var info = SKILL_ICON_SPRITES[key];
      var sprite = createSpriteEl(info.sheet, info.x, info.y, 16, 16, 24, 24);
      if (sprite) {
        sprite.className = 'skill-sprite skill-icon-sprite';
        iconSpan.textContent = '';
        iconSpan.appendChild(sprite);
      }
    }
  }

  // ── Game header update (D1) ───────────────────
  function updateGameHeader() {
    var titleEl = $('skills-game-title');
    if (titleEl) titleEl.textContent = SKILLS[activeSkill].name;
    var resEl = $('skills-current-resource');
    if (resEl) {
      var res = activeSkill === 'mining' ? getSelectedMiningResource() : activeSkill === 'woodcutting' ? getSelectedWcResource() : activeSkill === 'fishing' ? getSelectedFishResource() : getHighestResource(activeSkill);
      var resources = SKILLS[activeSkill].resources;
      var tierIdx = 0;
      for (var i = 0; i < resources.length; i++) {
        if (resources[i].name === res.name) { tierIdx = i; break; }
      }
      resEl.textContent = res.name;
      resEl.className = 'tier-' + tierIdx;
    }
  }

  // ── Mining Cavern Pixel Art Background ────────
  function generateMiningCavernBg() {
    var W = 640, H = 400, T = 10;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var cols = Math.ceil(W / T), rows = Math.ceil(H / T);
    var h, i, j, x, y, px, py, grad;

    // ── Pass 1: Far back wall (varied stone tiles + grain + center blocks) ──
    var farWall = ['#24242a', '#2c2c34', '#20202a', '#34343c', '#28283a', '#303038'];
    for (var ty = 0; ty < rows; ty++) {
      for (var tx = 0; tx < cols; tx++) {
        h = tileHash(tx, ty);
        ctx.fillStyle = farWall[((h >>> 0) % farWall.length)];
        ctx.fillRect(tx * T, ty * T, T, T);
        // Sparse grain (15% of tiles, larger 6x6 patches)
        var h2 = tileHash(tx * 7 + 77, ty * 13 + 33);
        if ((h2 >>> 0) % 7 === 0) {
          ctx.fillStyle = ((h2 >>> 4) & 1) ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(tx * T + ((h2 >>> 8) % 4), ty * T + ((h2 >>> 12) % 4), 6, 6);
        }
      }
    }
    // Stone block texture in center cavity (x 140-500, y 60-310)
    var blkW = 16, blkH = 10;
    var blkPal = ['#28282e', '#2e2e36', '#262630', '#323238'];
    for (var bry = 0; bry < Math.ceil(250 / blkH); bry++) {
      var bRowOff = (bry % 2) * Math.floor(blkW / 2);
      for (var brx = 0; brx < Math.ceil(360 / blkW) + 1; brx++) {
        var bbx = 140 + brx * blkW + bRowOff;
        var bby = 60 + bry * blkH;
        if (bbx + blkW < 140 || bbx > 500 || bby > 310) continue;
        h = tileHash(bbx + 1111, bby + 1111);
        ctx.fillStyle = blkPal[((h >>> 0) % blkPal.length)];
        ctx.fillRect(bbx, bby, blkW - 1, blkH - 1);
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(bbx, bby, blkW - 1, 1);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(bbx, bby + blkH - 2, blkW - 1, 1);
      }
      // Mortar row
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(140, 60 + bry * blkH + blkH - 1, 360, 1);
    }
    // Fewer, bolder cracks (5, 2px tall, 30px+ long)
    for (i = 0; i < 5; i++) {
      h = tileHash(i + 7777, 7777);
      var crackY = 80 + ((h >>> 0) % 220);
      var crackX = 140 + ((h >>> 8) % 300);
      var crackLen = 30 + ((h >>> 16) % 40);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(crackX, crackY, crackLen, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(crackX, crackY + 2, crackLen, 1);
    }

    // ── Pass 2: Near stone walls (left/right 22%) — staggered brick ──
    var wallW = 140;
    var brickGrays = ['#484850', '#505058', '#585860', '#4a4a54'];
    var brickH = 6, brickW = 12;
    var wallZones = [{ x0: 0, x1: wallW }, { x0: W - wallW, x1: W }];
    for (i = 0; i < wallZones.length; i++) {
      var zone = wallZones[i];
      var brickRows = Math.ceil(H / brickH);
      var brickCols = Math.ceil((zone.x1 - zone.x0) / brickW) + 1;
      for (var br = 0; br < brickRows; br++) {
        var stOff = (br % 2) * Math.floor(brickW / 2);
        for (var bc = -1; bc < brickCols; bc++) {
          var bx = zone.x0 + bc * brickW + stOff;
          var by = br * brickH;
          if (bx + brickW < zone.x0 || bx > zone.x1) continue;
          h = tileHash(bx + 2000, by + 2000);
          ctx.fillStyle = brickGrays[((h >>> 0) % brickGrays.length)];
          ctx.fillRect(bx, by, brickW - 1, brickH - 1);
          // Mortar lines (1px gaps are implicit from -1 sizing)
          // Specular highlight on top edge
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(bx, by, brickW - 1, 1);
          // Dark bottom edge
          ctx.fillStyle = 'rgba(0,0,0,0.10)';
          ctx.fillRect(bx, by + brickH - 2, brickW - 1, 1);
        }
      }
      // Mortar fill in gaps
      ctx.fillStyle = '#2a2a30';
      for (var mr = 0; mr < brickRows; mr++) {
        ctx.fillRect(zone.x0, mr * brickH + brickH - 1, zone.x1 - zone.x0, 1);
      }
    }

    // ── Pass 3: Wall clumping (hash-based darker/lighter patches) ──
    for (var ty = 0; ty < rows; ty++) {
      for (var tx = 0; tx < cols; tx++) {
        h = tileHash(tx + 500, ty + 500);
        if ((h >>> 0) % 4 !== 0) continue;
        var bright = ((h >>> 4) & 1) === 0;
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        px = tx * T + ((h >>> 8) % 4);
        py = ty * T + ((h >>> 12) % 4);
        ctx.fillRect(px, py, 6, 6);
      }
    }

    // ── Pass 4: Ceiling gradient + stalactites ──
    grad = ctx.createLinearGradient(0, 0, 0, 100);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 100);

    var stalactites = [
      { x: 50, w: 10, h: 45 }, { x: 120, w: 8, h: 35 },
      { x: 200, w: 12, h: 55 }, { x: 310, w: 10, h: 40 },
      { x: 380, w: 8, h: 50 }, { x: 460, w: 12, h: 42 },
      { x: 540, w: 10, h: 38 }, { x: 590, w: 8, h: 48 },
      { x: 160, w: 6, h: 28 }, { x: 430, w: 6, h: 32 }
    ];
    for (i = 0; i < stalactites.length; i++) {
      var st = stalactites[i];
      for (var sy = 0; sy < st.h; sy++) {
        var frac = sy / st.h;
        var sw = Math.max(1, Math.round(st.w * (1 - frac)));
        var sx = st.x - Math.floor(sw / 2);
        // 3-shade: shadow left, body center, highlight right
        if (sw >= 3) {
          ctx.fillStyle = '#222228';
          ctx.fillRect(sx, sy, 1, 1);
          ctx.fillStyle = frac < 0.4 ? '#303038' : '#404048';
          ctx.fillRect(sx + 1, sy, sw - 2, 1);
          ctx.fillStyle = '#585860';
          ctx.fillRect(sx + sw - 1, sy, 1, 1);
        } else {
          ctx.fillStyle = frac < 0.5 ? '#303038' : '#404048';
          ctx.fillRect(sx, sy, sw, 1);
        }
      }
      // Drip specular at tip (enlarged bead)
      ctx.fillStyle = '#7090b0';
      ctx.fillRect(st.x - 1, st.h - 1, 2, 3);
      ctx.fillStyle = 'rgba(120,160,200,0.5)';
      ctx.fillRect(st.x, st.h, 1, 2);
      ctx.fillStyle = 'rgba(180,210,240,0.3)';
      ctx.fillRect(st.x, st.h - 1, 1, 1);
    }

    // ── Pass 5: Stone flagstone floor (replaces scatter noise) ──
    var floorY = 310;
    var floorH = H - floorY;

    // Solid floor base fill
    ctx.fillStyle = '#38342e';
    ctx.fillRect(0, floorY, W, floorH);

    // Uneven top edge
    var floorCols = Math.ceil(W / T);
    for (var fx = 0; fx < floorCols; fx++) {
      h = tileHash(fx, 888);
      var bump = ((h >>> 0) % 10);
      var edgeY = floorY - bump;
      ctx.fillStyle = '#38342e';
      ctx.fillRect(fx * T, edgeY, T, bump + 2);
      ctx.fillStyle = '#5a564e';
      ctx.fillRect(fx * T, edgeY, T, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(fx * T, edgeY, T, 1);
    }

    // Flagstone grid: 20x14px stones, staggered rows, 1px mortar
    var fsW = 20, fsH = 14;
    var fsPal = ['#342e28', '#3c3830', '#403a32', '#38342e', '#443e36', '#4a4438'];
    var mortarC = '#2a2620';
    var fsRows = Math.ceil(floorH / fsH);
    var fsCols = Math.ceil(W / fsW) + 1;
    for (var fsr = 0; fsr < fsRows; fsr++) {
      var fsOff = (fsr % 2) * 10; // stagger offset
      for (var fsc = -1; fsc < fsCols; fsc++) {
        var fsx = fsc * fsW + fsOff;
        var fsy = floorY + fsr * fsH;
        if (fsy > H) continue;
        h = tileHash(fsc + 200, fsr + 900);
        ctx.fillStyle = fsPal[((h >>> 0) % fsPal.length)];
        ctx.fillRect(fsx, fsy, fsW - 1, fsH - 1);
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(fsx, fsy, fsW - 1, 1);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(fsx, fsy + fsH - 2, fsW - 1, 1);
      }
      // Mortar row
      ctx.fillStyle = mortarC;
      ctx.fillRect(0, floorY + fsr * fsH + fsH - 1, W, 1);
    }

    // 2 floor cracks (2px tall, 15px+ long)
    for (i = 0; i < 2; i++) {
      h = tileHash(i + 3500, 3500);
      var ckX = ((h >>> 0) % (W - 60)) + 30;
      var ckY = floorY + 8 + ((h >>> 8) % (floorH - 16));
      var ckLen = 15 + ((h >>> 16) % 30);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(ckX, ckY, ckLen, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(ckX, ckY + 2, ckLen, 1);
    }

    // 3 moss patches (bigger: 10-14px each)
    var mossPal = ['#2a5a28', '#306830', '#387038', '#2e6228'];
    for (i = 0; i < 3; i++) {
      h = tileHash(i + 4000, 4000);
      var mossX = ((h >>> 0) & 1) ? ((h >>> 4) % 120) : (W - 120 + ((h >>> 4) % 120));
      var mossY = floorY - 2 + ((h >>> 8) % 8);
      var mossW = 10 + ((h >>> 12) % 5);
      ctx.fillStyle = mossPal[((h >>> 16) % mossPal.length)];
      ctx.fillRect(mossX, mossY, mossW, 4);
      ctx.fillStyle = mossPal[((h >>> 18) % mossPal.length)];
      ctx.fillRect(mossX + 2, mossY + 1, mossW - 4, 3);
    }

    // 2 boulders spread across floor (one per side)
    var boulders = [
      { x: 30, y: floorY + 30, w: 36, h: 24 },
      { x: 580, y: floorY + 45, w: 32, h: 22 }
    ];
    for (i = 0; i < boulders.length; i++) {
      var b = boulders[i];
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 4, b.y + b.h - 2, b.w - 4, 8);
      // Outer base (darkest) — rounded via clipping corners
      ctx.fillStyle = '#3a3838';
      ctx.fillRect(b.x + 2, b.y + 4, b.w - 4, b.h - 4);
      ctx.fillRect(b.x + 4, b.y + 2, b.w - 8, b.h - 2);
      // Mid layer
      ctx.fillStyle = '#4a4848';
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      // Upper face
      ctx.fillStyle = '#5a5858';
      ctx.fillRect(b.x + 6, b.y + 4, b.w - 12, b.h - 10);
      // Top highlight band
      ctx.fillStyle = '#6a6868';
      ctx.fillRect(b.x + 8, b.y + 4, b.w - 16, 4);
      // Specular spot
      ctx.fillStyle = '#808080';
      ctx.fillRect(b.x + 10, b.y + 5, 4, 2);
      ctx.fillStyle = '#989898';
      ctx.fillRect(b.x + 11, b.y + 5, 2, 1);
      // Fissure lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(b.x + Math.floor(b.w * 0.3), b.y + 6, 1, b.h - 10);
      ctx.fillRect(b.x + Math.floor(b.w * 0.6), b.y + 4, 1, b.h - 8);
    }

    // 3 stalagmites at wall-floor edge
    var stalagmites = [
      { x: 165, h: 24, w: 12 },
      { x: 450, h: 22, w: 12 },
      { x: 70, h: 26, w: 14 }
    ];
    for (i = 0; i < stalagmites.length; i++) {
      var sg = stalagmites[i];
      var sgBase = floorY + 2;
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(sg.x - Math.floor(sg.w / 2) + 2, sgBase, sg.w - 2, 4);
      for (var sgy = 0; sgy < sg.h; sgy++) {
        var sgFrac = sgy / sg.h;
        var sgw = Math.max(1, Math.round(sg.w * (1 - sgFrac)));
        var sgx = sg.x - Math.floor(sgw / 2);
        // 4-shade body
        if (sgFrac < 0.2) ctx.fillStyle = '#605850';
        else if (sgFrac < 0.5) ctx.fillStyle = '#585050';
        else if (sgFrac < 0.8) ctx.fillStyle = '#484040';
        else ctx.fillStyle = '#383030';
        ctx.fillRect(sgx, sgBase - sgy, sgw, 1);
        // Right highlight edge
        if (sgw >= 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(sgx + sgw - 1, sgBase - sgy, 1, 1);
        }
      }
      // Specular near tip
      ctx.fillStyle = '#787870';
      ctx.fillRect(sg.x, sgBase - sg.h + 1, 1, 3);
      ctx.fillStyle = '#909088';
      ctx.fillRect(sg.x, sgBase - sg.h + 1, 1, 1);
    }

    // ── Pass 6: Timber support structure ──
    var beamX1 = 125, beamX2 = 500, beamW = 14, crossY = 60;
    var beamH = H - crossY - 40;
    // Left vertical beam
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(beamX1, crossY, beamW, beamH);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(beamX1 + 2, crossY, beamW - 4, beamH);
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(beamX1 + 4, crossY, beamW - 8, beamH);
    // Highlight stripe
    ctx.fillStyle = '#8b6e3b';
    ctx.fillRect(beamX1 + 5, crossY, 2, beamH);
    // Dark grain lines
    for (j = 0; j < beamH; j += 12) {
      h = tileHash(beamX1, j + 5000);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(beamX1 + 3, crossY + j + ((h >>> 0) % 4), beamW - 6, 1);
    }

    // Right vertical beam
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(beamX2, crossY, beamW, beamH);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(beamX2 + 2, crossY, beamW - 4, beamH);
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(beamX2 + 4, crossY, beamW - 8, beamH);
    ctx.fillStyle = '#8b6e3b';
    ctx.fillRect(beamX2 + 5, crossY, 2, beamH);
    for (j = 0; j < beamH; j += 12) {
      h = tileHash(beamX2, j + 5000);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(beamX2 + 3, crossY + j + ((h >>> 0) % 4), beamW - 6, 1);
    }

    // Crossbeam
    var crossW = beamX2 - beamX1 + beamW;
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(beamX1, crossY, crossW, 10);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(beamX1, crossY + 2, crossW, 6);
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(beamX1, crossY + 3, crossW, 4);
    // Crossbeam highlight
    ctx.fillStyle = '#8b6e3b';
    ctx.fillRect(beamX1, crossY + 3, crossW, 2);
    // Dark grain on crossbeam
    for (j = beamX1; j < beamX1 + crossW; j += 16) {
      h = tileHash(j + 6000, crossY);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(j + ((h >>> 0) % 6), crossY + 4, 1, 4);
    }

    // Iron brackets at joints
    var brackets = [
      { x: beamX1 - 2, y: crossY - 2 },
      { x: beamX1 - 2, y: crossY + 8 },
      { x: beamX2 - 2, y: crossY - 2 },
      { x: beamX2 - 2, y: crossY + 8 }
    ];
    for (i = 0; i < brackets.length; i++) {
      var br2 = brackets[i];
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(br2.x, br2.y, beamW + 4, 4);
      ctx.fillStyle = '#505050';
      ctx.fillRect(br2.x + 1, br2.y + 1, beamW + 2, 2);
      // Bolt
      ctx.fillStyle = '#606060';
      ctx.fillRect(br2.x + 3, br2.y + 1, 2, 2);
      ctx.fillStyle = '#787878';
      ctx.fillRect(br2.x + 3, br2.y + 1, 1, 1);
    }

    // ── Pass 8: Torches with enhanced glow ──
    var torchPositions = [
      { x: beamX1 + beamW + 3, y: crossY + 50 },
      { x: beamX2 - 8, y: crossY + 50 },
      { x: 60, y: 150 },
      { x: W - 68, y: 150 }
    ];
    for (i = 0; i < torchPositions.length; i++) {
      var tp = torchPositions[i];
      // Ambient warm rect wash (rpg.js smithy pattern)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ff8030';
      ctx.fillRect(tp.x - 40, tp.y - 50, 90, 100);
      ctx.restore();
      // Soot mark above flame
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(tp.x + 2, tp.y - 14, 3, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(tp.x + 1, tp.y - 18, 5, 6);
      // Iron bracket
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(tp.x + 1, tp.y + 6, 5, 3);
      ctx.fillStyle = '#505050';
      ctx.fillRect(tp.x + 2, tp.y + 7, 3, 1);
      // Wooden handle
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tp.x + 2, tp.y, 3, 10);
      ctx.fillStyle = '#6b4e2b';
      ctx.fillRect(tp.x + 3, tp.y, 1, 10);
      // 4-layer flame
      ctx.fillStyle = '#cc3010';
      ctx.fillRect(tp.x + 1, tp.y - 6, 5, 6);
      ctx.fillStyle = '#ff6020';
      ctx.fillRect(tp.x + 1, tp.y - 5, 5, 4);
      ctx.fillStyle = '#ff8030';
      ctx.fillRect(tp.x + 2, tp.y - 4, 3, 3);
      ctx.fillStyle = '#ffd060';
      ctx.fillRect(tp.x + 3, tp.y - 3, 1, 2);
      // Radial warm glow (radius 60→80, peak 0.18→0.22)
      grad = ctx.createRadialGradient(tp.x + 3, tp.y - 2, 2, tp.x + 3, tp.y - 2, 80);
      grad.addColorStop(0, 'rgba(255,160,48,0.22)');
      grad.addColorStop(0.4, 'rgba(255,120,30,0.10)');
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tp.x - 80, tp.y - 84, 166, 166);
    }

    // ── Pass 9: Full-width tracks (cart drawn in animation overlay) ──
    var railY = floorY + 12 + 42 + 6; // cartY + cartH + 6

    // Full-width rail ties
    ctx.fillStyle = '#4a3a20';
    for (j = 0; j < Math.ceil(W / 18); j++) {
      ctx.fillRect(j * 18, railY + 2, 10, 4);
      ctx.fillStyle = '#5a4a30';
      ctx.fillRect(j * 18 + 1, railY + 3, 8, 2);
      ctx.fillStyle = '#4a3a20';
    }
    // Full-width iron rails (2 parallel)
    ctx.fillStyle = '#404048';
    ctx.fillRect(0, railY, W, 3);
    ctx.fillRect(0, railY + 8, W, 3);
    ctx.fillStyle = '#707078';
    ctx.fillRect(0, railY, W, 1);
    ctx.fillRect(0, railY + 8, W, 1);
    ctx.fillStyle = '#30303a';
    ctx.fillRect(0, railY + 2, W, 1);
    ctx.fillRect(0, railY + 10, W, 1);

    // Cart drawn in animation overlay (not static BG)

    // ── Pass 10: Props (barrel) ──
    // Barrel (right wall — sits on floor bottom)
    var brlx = 540, brly = H - 28 - 8;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(brlx + 3, brly + 28, 22, 5);
    // Body (larger)
    ctx.fillStyle = '#3a1a08';
    ctx.fillRect(brlx, brly, 26, 28);
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(brlx + 2, brly + 1, 22, 26);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(brlx + 4, brly + 2, 18, 24);
    ctx.fillStyle = '#6b4e2b';
    ctx.fillRect(brlx + 6, brly + 3, 14, 22);
    // Barrel bands (iron)
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(brlx + 1, brly + 5, 24, 3);
    ctx.fillRect(brlx + 1, brly + 20, 24, 3);
    ctx.fillStyle = '#505058';
    ctx.fillRect(brlx + 2, brly + 5, 22, 1);
    ctx.fillRect(brlx + 2, brly + 20, 22, 1);
    // Highlight stripe (light catching the curve)
    ctx.fillStyle = '#8b6e3b';
    ctx.fillRect(brlx + 10, brly + 3, 3, 22);
    ctx.fillStyle = '#a08848';
    ctx.fillRect(brlx + 11, brly + 4, 1, 20);
    // Plank lines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(brlx + 7, brly + 3, 1, 22);
    ctx.fillRect(brlx + 16, brly + 3, 1, 22);

    // ── Pass 11: Water drip + puddle (doubled, elliptical) ──
    var pudX = 340, pudY = H - 16;
    // Wet stone darkening around puddle
    ctx.fillStyle = 'rgba(20,30,50,0.12)';
    ctx.fillRect(pudX - 6, pudY - 2, 40, 16);
    // Puddle body (28x10px, corner-clipped for ellipse)
    ctx.fillStyle = '#222e40';
    ctx.fillRect(pudX + 2, pudY, 24, 10); // core rect
    ctx.fillRect(pudX, pudY + 2, 28, 6);  // wider middle
    // Mid blue layer
    ctx.fillStyle = '#2a3a50';
    ctx.fillRect(pudX + 3, pudY + 1, 22, 8);
    ctx.fillRect(pudX + 1, pudY + 3, 26, 4);
    // Lighter inner
    ctx.fillStyle = '#3a4a60';
    ctx.fillRect(pudX + 4, pudY + 2, 20, 6);
    // Bright surface
    ctx.fillStyle = '#4a5a70';
    ctx.fillRect(pudX + 6, pudY + 3, 16, 4);
    // Reflection streak (8x2px)
    ctx.fillStyle = '#8ab0d0';
    ctx.fillRect(pudX + 8, pudY + 4, 8, 2);
    // Specular spot
    ctx.fillStyle = '#b0d0e8';
    ctx.fillRect(pudX + 10, pudY + 4, 3, 1);
    // Vertical drip streak (2px wide)
    ctx.fillStyle = 'rgba(60,80,120,0.15)';
    ctx.fillRect(pudX + 13, 50, 2, pudY - 48);
    // Bright bead at bottom of drip (3x4px)
    ctx.fillStyle = 'rgba(80,120,170,0.3)';
    ctx.fillRect(pudX + 12, pudY - 6, 3, 4);
    ctx.fillStyle = 'rgba(120,160,210,0.4)';
    ctx.fillRect(pudX + 13, pudY - 5, 1, 2);

    // ── Pass 12: Hanging lantern overhead glow (enhanced) ──
    var hlx = (beamX1 + beamX2 + beamW) / 2;
    var hly = crossY + 14;
    // Ambient warm rect wash
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(hlx - 60, hly - 40, 120, 100);
    ctx.restore();
    // Chain
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(hlx, crossY + 8, 2, 8);
    // Soot mark above chain
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(hlx - 1, crossY + 2, 4, 8);
    // Lantern body
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(hlx - 4, hly, 10, 12);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(hlx - 3, hly + 1, 8, 10);
    // Warm glass
    ctx.fillStyle = '#c09030';
    ctx.fillRect(hlx - 2, hly + 2, 6, 8);
    ctx.fillStyle = '#e0b040';
    ctx.fillRect(hlx - 1, hly + 3, 4, 6);
    ctx.fillStyle = '#f0d060';
    ctx.fillRect(hlx, hly + 4, 2, 4);
    // Soft overhead radial glow — illuminates center play area
    grad = ctx.createRadialGradient(hlx, hly + 5, 4, hlx, hly + 5, 120);
    grad.addColorStop(0, 'rgba(240,180,60,0.15)');
    grad.addColorStop(0.5, 'rgba(240,160,40,0.06)');
    grad.addColorStop(1, 'rgba(240,140,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(hlx - 120, hly - 115, 240, 240);

    // ── Pass 13: Center depth overlay ──
    var cx = W / 2, cy = H / 2 - 20;
    grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 220);
    grad.addColorStop(0, 'rgba(0,0,0,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Pass 14: Edge vignette (proper gradients, heavier on top) ──
    // Top (heavier — cave ceiling)
    grad = ctx.createLinearGradient(0, 0, 0, 40);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 40);
    // Bottom
    grad = ctx.createLinearGradient(0, H - 30, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 30, W, 30);
    // Left
    grad = ctx.createLinearGradient(0, 0, 30, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 30, H);
    // Right
    grad = ctx.createLinearGradient(W - 30, 0, W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(W - 30, 0, 30, H);

    return c.toDataURL('image/png');
  }

  // ── Forge Interior Pixel Art Background ──────
  function generateForgeBg() {
    var W = SMITHING_W, H = SMITHING_H, T = 10;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var h, i, grad;

    // ── Pass 1: Stone brick back wall ──
    var brickGrays = ['#3a3630', '#423e38', '#4a4640', '#3e3a34'];
    var brickH = 8, brickW = 14;
    var brickRows = Math.ceil(H / brickH);
    var brickCols = Math.ceil(W / brickW) + 1;
    for (var br = 0; br < brickRows; br++) {
      var stOff = (br % 2) * Math.floor(brickW / 2);
      for (var bc = -1; bc < brickCols; bc++) {
        var bx = bc * brickW + stOff;
        var by = br * brickH;
        h = tileHash(bx + 3000, by + 3000);
        ctx.fillStyle = brickGrays[((h >>> 0) % brickGrays.length)];
        ctx.fillRect(bx, by, brickW - 1, brickH - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(bx, by, brickW - 1, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(bx, by + brickH - 2, brickW - 1, 1);
      }
      // Mortar row
      ctx.fillStyle = '#2a2620';
      ctx.fillRect(0, br * brickH + brickH - 1, W, 1);
    }

    // ── Pass 2: Furnace alcove (center, arched) ──
    var furnX = 250, furnY = 40, furnW = 140, furnH = 180;
    // Dark recess
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(furnX, furnY + 20, furnW, furnH - 20);
    // Arch top (rounded using stepped rectangles)
    for (var ay = 0; ay < 20; ay++) {
      var frac = ay / 20;
      var archW = Math.round(furnW * (0.5 + frac * 0.5));
      var archX = furnX + Math.floor((furnW - archW) / 2);
      ctx.fillStyle = '#1a1612';
      ctx.fillRect(archX, furnY + ay, archW, 1);
    }
    // Arch border bricks
    var archBrickC = ['#5a5650', '#625e58', '#6a6660'];
    for (var ab = 0; ab < 20; ab++) {
      var abFrac = ab / 20;
      var abW = Math.round(furnW * (0.5 + abFrac * 0.5));
      var abX = furnX + Math.floor((furnW - abW) / 2);
      h = tileHash(ab + 5555, 5555);
      ctx.fillStyle = archBrickC[((h >>> 0) % archBrickC.length)];
      ctx.fillRect(abX - 3, furnY + ab, 3, 1);
      ctx.fillRect(abX + abW, furnY + ab, 3, 1);
    }
    // Side columns
    ctx.fillStyle = '#504c46';
    ctx.fillRect(furnX - 6, furnY + 20, 6, furnH - 20);
    ctx.fillRect(furnX + furnW, furnY + 20, 6, furnH - 20);
    // Column highlights
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(furnX - 6, furnY + 20, 1, furnH - 20);
    ctx.fillRect(furnX + furnW + 5, furnY + 20, 1, furnH - 20);

    // Fire glow inside furnace
    var fireY = furnY + furnH - 60;
    grad = ctx.createRadialGradient(furnX + furnW / 2, fireY, 5, furnX + furnW / 2, fireY, 70);
    grad.addColorStop(0, 'rgba(255,140,30,0.6)');
    grad.addColorStop(0.4, 'rgba(255,80,20,0.3)');
    grad.addColorStop(1, 'rgba(255,40,10,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(furnX, furnY + 20, furnW, furnH - 20);

    // Fire bed (bottom of furnace)
    for (var fx = 0; fx < furnW; fx += 4) {
      h = tileHash(fx + 6666, 6666);
      var fh = 6 + ((h >>> 0) % 10);
      ctx.fillStyle = ((h >>> 4) & 1) ? '#ff6020' : '#cc3010';
      ctx.fillRect(furnX + fx, fireY + 20, 4, fh);
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(furnX + fx + 1, fireY + 20, 2, Math.floor(fh * 0.6));
    }

    // ── Pass 3: Wooden ceiling beams ──
    var beamC = ['#4a3828', '#523e2c', '#3e2e1e'];
    var beamY = 15, beamH = 10;
    ctx.fillStyle = beamC[0];
    ctx.fillRect(0, beamY, W, beamH);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, beamY, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, beamY + beamH - 1, W, 1);
    // Cross beams (3 vertical supports)
    var crossX = [160, 320, 480];
    for (i = 0; i < crossX.length; i++) {
      ctx.fillStyle = beamC[1];
      ctx.fillRect(crossX[i] - 4, beamY, 8, 210);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(crossX[i] - 4, beamY, 1, 210);
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(crossX[i] + 3, beamY, 1, 210);
    }

    // ── Pass 4: Stone flagstone floor ──
    var floorY = 280;
    ctx.fillStyle = '#38342e';
    ctx.fillRect(0, floorY, W, H - floorY);
    // Uneven top edge
    for (var ex = 0; ex < Math.ceil(W / T); ex++) {
      h = tileHash(ex, 999);
      var bump = ((h >>> 0) % 6);
      ctx.fillStyle = '#38342e';
      ctx.fillRect(ex * T, floorY - bump, T, bump + 2);
      ctx.fillStyle = '#5a564e';
      ctx.fillRect(ex * T, floorY - bump, T, 1);
    }
    // Flagstone grid
    var fsW = 20, fsH = 14;
    var fsPal = ['#342e28', '#3c3830', '#403a32', '#38342e', '#443e36'];
    var fsRows = Math.ceil((H - floorY) / fsH);
    var fsCols = Math.ceil(W / fsW) + 1;
    for (var fsr = 0; fsr < fsRows; fsr++) {
      var fsOff = (fsr % 2) * 10;
      for (var fsc = -1; fsc < fsCols; fsc++) {
        var fsx = fsc * fsW + fsOff;
        var fsy = floorY + fsr * fsH;
        h = tileHash(fsx + 4000, fsy + 4000);
        ctx.fillStyle = fsPal[((h >>> 0) % fsPal.length)];
        ctx.fillRect(fsx, fsy, fsW - 1, fsH - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(fsx, fsy, fsW - 1, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(fsx, fsy + fsH - 2, fsW - 1, 1);
      }
      ctx.fillStyle = '#2a2620';
      ctx.fillRect(0, floorY + fsr * fsH + fsH - 1, W, 1);
    }

    // ── Pass 5: Water quench trough (right side) ──
    var trX = 480, trY = 260, trW = 80, trH = 20;
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(trX, trY, trW, trH);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(trX + 3, trY + 3, trW - 6, trH - 6);
    // Water surface highlight
    ctx.fillStyle = 'rgba(100,160,220,0.3)';
    ctx.fillRect(trX + 3, trY + 3, trW - 6, 2);
    // Trough legs
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(trX + 4, trY + trH, 4, 18);
    ctx.fillRect(trX + trW - 8, trY + trH, 4, 18);

    // ── Pass 6: Tool rack silhouettes (left wall) ──
    var rackX = 60, rackY = 100;
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(rackX, rackY, 60, 4); // shelf
    // Tool silhouettes (hammer, tongs, chisel)
    ctx.fillStyle = '#2a2620';
    // Hammer
    ctx.fillRect(rackX + 8, rackY - 30, 3, 30);
    ctx.fillRect(rackX + 4, rackY - 34, 11, 6);
    // Tongs
    ctx.fillRect(rackX + 25, rackY - 40, 2, 40);
    ctx.fillRect(rackX + 23, rackY - 42, 6, 3);
    // Chisel
    ctx.fillRect(rackX + 42, rackY - 25, 2, 25);
    ctx.fillRect(rackX + 40, rackY - 28, 6, 4);

    // ── Pass 7: Anvil silhouette (center floor) ──
    var anvX = 300, anvY = 255;
    ctx.fillStyle = '#2e2a24';
    // Base
    ctx.fillRect(anvX - 12, anvY + 8, 24, 10);
    // Pillar
    ctx.fillRect(anvX - 6, anvY, 12, 10);
    // Top (horn shape)
    ctx.fillRect(anvX - 16, anvY - 6, 32, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(anvX - 16, anvY - 6, 32, 1);

    // ── Pass 8: Warm ambient lighting ──
    grad = ctx.createRadialGradient(furnX + furnW / 2, fireY, 20, furnX + furnW / 2, fireY, 300);
    grad.addColorStop(0, 'rgba(255,120,30,0.12)');
    grad.addColorStop(0.5, 'rgba(255,80,20,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ceiling shadow
    grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 60);

    // Edge vignette
    grad = ctx.createLinearGradient(0, H - 30, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 30, W, 30);
    grad = ctx.createLinearGradient(0, 0, 30, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 30, H);
    grad = ctx.createLinearGradient(W - 30, 0, W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(W - 30, 0, 30, H);

    return c.toDataURL('image/png');
  }

  // ── Forest Clearing Pixel Art Background ──────
  function generateForestClearingBg(treesImg, extrasImg) {
    var W = WC_W, H = WC_H, T = 10;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var cols = Math.ceil(W / T), rows = Math.ceil(H / T);
    var h, i, j, x, y, grad;

    // ── Pass 1: Sky gradient (top 60% — light blue fading to pale green at horizon) ──
    grad = ctx.createLinearGradient(0, 0, 0, WC_GROUND_Y);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(0.4, '#a8dce8');
    grad.addColorStop(0.7, '#b8e8c8');
    grad.addColorStop(1, '#c8eeb8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, WC_GROUND_Y);

    // ── Pass 2: Distant treeline (sprite silhouettes at horizon) ──
    // Reusable temp canvas for tinting sprites to solid color silhouettes
    var silTmp = document.createElement('canvas');
    var silTmpCtx = silTmp.getContext('2d');
    function drawSpriteSil(img, sp, dx, dy, scale, tintColor) {
      silTmp.width = sp.w; silTmp.height = sp.h;
      silTmpCtx.clearRect(0, 0, sp.w, sp.h);
      silTmpCtx.globalCompositeOperation = 'source-over';
      silTmpCtx.drawImage(img, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);
      silTmpCtx.globalCompositeOperation = 'source-in';
      silTmpCtx.fillStyle = tintColor;
      silTmpCtx.fillRect(0, 0, sp.w, sp.h);
      var dw = Math.round(sp.w * scale);
      var dh = Math.round(sp.h * scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(silTmp, 0, 0, sp.w, sp.h, Math.floor(dx - dw / 2), Math.floor(dy - dh), dw, dh);
    }

    // Solid dark base band behind treeline — guarantees no sky peeks through
    ctx.fillStyle = '#0d3012';
    ctx.fillRect(0, WC_HORIZON_Y - 10, W, 30);

    if (treesImg) {
      // All tree sprites to pick from for variety
      var tlSprites = [
        TREE_SPRITES['Pine'], TREE_SPRITES['Oak'], TREE_SPRITES['Birch'],
        TREE_SPRITES['Maple'], TREE_SPRITES['Walnut'], TREE_SPRITES['Mahogany'],
        TREE_SPRITES['Yew'], TREE_SPRITES['Elder']
      ];
      var tlBushes = [DECO_SPRITES['Deco6'], DECO_SPRITES['Deco4'], DECO_SPRITES['Deco5']];

      // Layer 1 — Far (darkest, tightly packed)
      var farTint = ['#0a2810', '#0d3012', '#082208', '#0e3414'];
      for (x = -30; x < W + 30; x += 16 + ((tileHash(x, 101) >>> 0) % 8)) {
        h = tileHash(x, 102);
        var sp = tlSprites[(h >>> 0) % tlSprites.length];
        var sc = 1.1 + ((h >>> 8) % 4) * 0.15;
        drawSpriteSil(treesImg, sp, x, WC_HORIZON_Y + 8, sc, farTint[(h >>> 16) % farTint.length]);
      }
      // Layer 2 — Mid (medium dark, overlapping)
      var midTint = ['#16421c', '#1a4a20', '#1e5228', '#1c4e24'];
      for (x = -20; x < W + 20; x += 14 + ((tileHash(x, 103) >>> 0) % 7)) {
        h = tileHash(x + 7, 104);
        var sp2 = tlSprites[(h >>> 0) % tlSprites.length];
        var sc2 = 1.3 + ((h >>> 8) % 4) * 0.15;
        drawSpriteSil(treesImg, sp2, x, WC_HORIZON_Y + 10, sc2, midTint[(h >>> 16) % midTint.length]);
      }
      // Layer 3 — Near undergrowth (bushes + small trees)
      var nearTint = ['#224e2a', '#286432', '#1e5228', '#2a5a30'];
      for (x = -10; x < W + 10; x += 12 + ((tileHash(x, 105) >>> 0) % 6)) {
        h = tileHash(x + 13, 106);
        var sp3 = tlBushes[(h >>> 0) % tlBushes.length];
        var sc3 = 1.0 + ((h >>> 8) % 4) * 0.15;
        drawSpriteSil(treesImg, sp3, x, WC_HORIZON_Y + 14, sc3, nearTint[(h >>> 16) % nearTint.length]);
      }
    } else {
      // Fallback: procedural shapes before sprites load
      var procCol = ['#0d3012', '#1a4a20', '#16421c', '#224e2a'];
      for (x = 0; x < W; x += 6) {
        h = tileHash(x, 100);
        var treeH = 20 + ((h >>> 0) % 30);
        var treeW = 8 + ((h >>> 8) % 8);
        ctx.fillStyle = procCol[((h >>> 16) % procCol.length)];
        ctx.fillRect(x, WC_HORIZON_Y - treeH, treeW, treeH + 10);
      }
    }

    // ── Pass 3: (moved after grass) ──

    // ── Pass 4: Grass floor base (varied greens from ground_y down) ──
    var grassPal = ['#3a7a30', '#408038', '#367228', '#448440', '#3c7e34', '#4a8a3e'];
    for (var ty = Math.floor(WC_GROUND_Y / T); ty < rows; ty++) {
      for (var tx = 0; tx < cols; tx++) {
        h = tileHash(tx + 300, ty + 300);
        ctx.fillStyle = grassPal[((h >>> 0) % grassPal.length)];
        ctx.fillRect(tx * T, ty * T, T, T);
      }
    }
    // Smooth transition at horizon
    grad = ctx.createLinearGradient(0, WC_GROUND_Y - 10, 0, WC_GROUND_Y + 10);
    grad.addColorStop(0, 'rgba(58,122,48,0)');
    grad.addColorStop(1, 'rgba(58,122,48,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, WC_GROUND_Y - 10, W, 20);

    // ── Pass 3b: Mid-ground trees (drawn ON TOP of grass so bases are grounded) ──
    var midTrees = [
      { x: 40, yOff: 10, scale: 1.8, sprite: 'Deco4' },   // cherry, left
      { x: 520, yOff: 5, scale: 1.6, sprite: 'Pine' },     // pine, right
      { x: 140, yOff: -5, scale: 1.5, sprite: 'Deco6' },   // bush, left-mid
      { x: 470, yOff: 15, scale: 1.7, sprite: 'Deco5' }    // apple, right-mid
    ];
    if (treesImg) {
      ctx.imageSmoothingEnabled = false;
      for (i = 0; i < midTrees.length; i++) {
        var mt = midTrees[i];
        var sp = DECO_SPRITES[mt.sprite] || TREE_SPRITES[mt.sprite];
        if (!sp) continue;
        var dw = Math.round(sp.w * mt.scale);
        var dh = Math.round(sp.h * mt.scale);
        var dx = mt.x;
        // Bottom of tree sits at WC_GROUND_Y + yOff (roots in the grass)
        var dy = WC_GROUND_Y - dh + mt.yOff;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(treesImg, sp.x, sp.y, sp.w, sp.h, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
      ctx.imageSmoothingEnabled = true;
    } else {
      var midTreeCol = ['#2a6a30', '#307038', '#286428', '#347a3c'];
      for (i = 0; i < midTrees.length; i++) {
        var mt2 = midTrees[i];
        h = tileHash(mt2.x + 200, 200);
        var mtW = 45, mtH = 70;
        var mtTop = WC_GROUND_Y - mtH + mt2.yOff;
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(mt2.x + Math.floor(mtW / 2) - 3, mtTop + mtH - 20, 6, 20);
        ctx.fillStyle = midTreeCol[((h >>> 0) % midTreeCol.length)];
        ctx.fillRect(mt2.x, mtTop + Math.floor(mtH * 0.3), mtW, Math.floor(mtH * 0.5));
        ctx.fillRect(mt2.x + 4, mtTop + Math.floor(mtH * 0.1), mtW - 8, Math.floor(mtH * 0.4));
        ctx.fillRect(mt2.x + 10, mtTop, mtW - 20, Math.floor(mtH * 0.3));
      }
    }

    // ── Pass 5: Grass detail (tufts + wildflowers) ──
    var tuftCol = ['#4a9a40', '#56a44c', '#3e8a36', '#60b058'];
    for (x = 0; x < W; x += 4) {
      h = tileHash(x + 400, 400);
      if ((h >>> 0) % 3 !== 0) continue;
      var tuftY = WC_GROUND_Y + ((h >>> 4) % (H - WC_GROUND_Y - 4));
      ctx.fillStyle = tuftCol[((h >>> 8) % tuftCol.length)];
      ctx.fillRect(x, tuftY, 2, 3 + ((h >>> 12) % 3));
      ctx.fillRect(x + 1, tuftY - 1, 1, 2);
    }
    // Wildflowers (1-2px dots, ~3% density)
    var flowerCol = ['#e8e040', '#e06080', '#f0a0c0', '#80a0f0', '#f0f0f0'];
    for (x = 0; x < W; x += 6) {
      for (y = WC_GROUND_Y + 5; y < H - 10; y += 8) {
        h = tileHash(x + 500, y + 500);
        if ((h >>> 0) % 30 !== 0) continue;
        ctx.fillStyle = flowerCol[((h >>> 4) % flowerCol.length)];
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // ── Pass 6: Dirt clearing (brown area center) ──
    var dirtPal = ['#6a5a3a', '#72624a', '#645440', '#7a6a50', '#685838'];
    var dirtX1 = 160, dirtX2 = 480, dirtY1 = 200, dirtY2 = 380;
    for (var dy = dirtY1; dy < dirtY2; dy += T) {
      for (var dx = dirtX1; dx < dirtX2; dx += T) {
        h = tileHash(dx + 600, dy + 600);
        // Rough edges: random offset at borders
        var edgeDist = Math.min(dx - dirtX1, dirtX2 - dx, dy - dirtY1, dirtY2 - dy);
        if (edgeDist < 20 && (h >>> 0) % 3 === 0) continue; // skip some border tiles
        ctx.fillStyle = dirtPal[((h >>> 0) % dirtPal.length)];
        ctx.fillRect(dx, dy, T, T);
      }
    }
    // Dirt-grass transition patches
    for (x = dirtX1; x < dirtX2; x += 6) {
      h = tileHash(x + 700, dirtY1);
      var edgeOff = ((h >>> 0) % 12) - 4;
      ctx.fillStyle = grassPal[((h >>> 4) % grassPal.length)];
      ctx.fillRect(x, dirtY1 + edgeOff, 6, 4);
    }

    // ── Pass 7+8: Stumps and logs removed ──

    // ── Pass 9: Forest props (spread evenly, no overlap) ──
    if (extrasImg) {
      ctx.imageSmoothingEnabled = false;
      // Props in corners and edges, away from center tree area
      var propPos = [
        { x: 35, y: 250, si: 0, sc: 0.8 },   // mushroom, far left
        { x: 580, y: 255, si: 3, sc: 0.8 },   // mushroom 2, far right
        { x: 105, y: 210, si: 2, sc: 0.7 },   // bush, left near horizon
        { x: 495, y: 340, si: 0, sc: 0.7 }    // mushroom, right bottom
      ];
      for (i = 0; i < propPos.length; i++) {
        var pp = propPos[i];
        var pSp = FOREST_EXTRAS.props[pp.si];
        var pDw = Math.round(pSp.w * pp.sc);
        var pDh = Math.round(pSp.h * pp.sc);
        ctx.drawImage(extrasImg, pSp.x, pSp.y, pSp.w, pSp.h, pp.x, pp.y, pDw, pDh);
      }
      // Vines at far edges only
      var vinePos = [
        { x: 25, y: 220, si: 0, sc: 0.8 },   // vine, far left
        { x: 590, y: 225, si: 1, sc: 0.8 }    // vine, far right
      ];
      for (i = 0; i < vinePos.length; i++) {
        var vp = vinePos[i];
        var vSp = FOREST_EXTRAS.vines[vp.si];
        var vDw = Math.round(vSp.w * vp.sc);
        var vDh = Math.round(vSp.h * vp.sc);
        ctx.drawImage(extrasImg, vSp.x, vSp.y, vSp.w, vSp.h, vp.x, vp.y, vDw, vDh);
      }
    } else {
      // Fallback procedural mushrooms
      var mushCaps = ['#c03020', '#b82818', '#d04030'];
      var mushPos = [{ x: 160, y: 310 }, { x: 475, y: 335 }, { x: 300, y: 375 }];
      for (i = 0; i < mushPos.length; i++) {
        var ms = mushPos[i];
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(ms.x + 2, ms.y + 3, 3, 5);
        ctx.fillStyle = mushCaps[i];
        ctx.fillRect(ms.x, ms.y, 7, 4);
      }
    }
    // Scattered stones removed — sprite props replace them
    // Moss patches
    var mossPal2 = ['#2a6a28', '#307030', '#388038'];
    for (i = 0; i < 4; i++) {
      h = tileHash(i + 900, 900);
      var mossX = ((h >>> 0) % (W - 40)) + 20;
      var mossY = WC_GROUND_Y + ((h >>> 8) % 40);
      ctx.fillStyle = mossPal2[((h >>> 16) % mossPal2.length)];
      ctx.fillRect(mossX, mossY, 8 + ((h >>> 20) % 6), 3);
    }

    // ── Pass 10: Sun dapple (warm bright patches on ground) ──
    var dapples = [
      { x: 260, y: 230, r: 30 }, { x: 380, y: 250, r: 25 },
      { x: 310, y: 300, r: 28 }, { x: 440, y: 290, r: 22 },
      { x: 220, y: 280, r: 26 }, { x: 350, y: 340, r: 20 }
    ];
    for (i = 0; i < dapples.length; i++) {
      var dp = dapples[i];
      grad = ctx.createRadialGradient(dp.x, dp.y, 2, dp.x, dp.y, dp.r);
      grad.addColorStop(0, 'rgba(255,240,180,0.12)');
      grad.addColorStop(0.5, 'rgba(255,220,140,0.06)');
      grad.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(dp.x - dp.r, dp.y - dp.r, dp.r * 2, dp.r * 2);
    }

    // ── Pass 11b: Clearing spotlight (warm bright glow where chopping tree sits) ──
    var spotCx = 320, spotCy = 240;
    grad = ctx.createRadialGradient(spotCx, spotCy, 10, spotCx, spotCy, 80);
    grad.addColorStop(0, 'rgba(255,245,200,0.18)');
    grad.addColorStop(0.4, 'rgba(255,235,170,0.10)');
    grad.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(spotCx - 80, spotCy - 80, 160, 160);

    // ── Pass 13: Atmospheric haze (green-blue radial for depth) ──
    var cx = W / 2, cy = WC_GROUND_Y;
    grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 280);
    grad.addColorStop(0, 'rgba(120,180,140,0.08)');
    grad.addColorStop(1, 'rgba(80,140,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Pass 14: Edge vignette (top heavier = canopy shadow) ──
    // Top (heavy canopy shadow)
    grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 60);
    // Bottom
    grad = ctx.createLinearGradient(0, H - 30, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 30, W, 30);
    // Left
    grad = ctx.createLinearGradient(0, 0, 40, 0);
    grad.addColorStop(0, 'rgba(0,20,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 40, H);
    // Right
    grad = ctx.createLinearGradient(W - 40, 0, W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,20,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(W - 40, 0, 40, H);

    return c.toDataURL('image/png');
  }

  // ══════════════════════════════════════════════
  // ── MINING CAVERN ANIMATION OVERLAY ───────────
  // ══════════════════════════════════════════════

  function startMiningAnim() {
    if (miningAnimFrameId) return; // already running
    miningAnimFrame = 0;
    miningAnimLastTs = 0;
    miningCartState = { x: 20, dir: 1 };
    miningDripState = { y: 50, phase: 'falling', splashFrame: 0, pauseTime: 0 };
    miningEmbers = [];
    miningAnimLoop(0);
  }

  function stopMiningAnim() {
    if (miningAnimFrameId) {
      cancelAnimationFrame(miningAnimFrameId);
      miningAnimFrameId = null;
    }
    miningAnimCanvas = null;
    miningAnimCtx = null;
    miningEmbers = [];
  }

  function miningAnimLoop(ts) {
    if (!miningAnimCtx || !miningAnimCanvas) { miningAnimFrameId = null; return; }
    miningAnimFrameId = requestAnimationFrame(miningAnimLoop);
    var dt = miningAnimLastTs ? Math.min((ts - miningAnimLastTs) / 1000, 0.1) : 0.016;
    miningAnimLastTs = ts;
    miningAnimFrame++;

    miningAnimCtx.clearRect(0, 0, MINING_W, MINING_H);
    drawTorchFlicker(miningAnimCtx, miningAnimFrame, dt);
    drawWaterDrip(miningAnimCtx, miningAnimFrame, dt);
    drawMineCart(miningAnimCtx, miningAnimFrame, dt);
  }

  function drawTorchFlicker(ctx, frame, dt) {
    var i, tp, phase, flameShift, glowAlpha, glowR, grad;

    // Draw torch flames + glow for 4 wall torches
    for (i = 0; i < MINING_TORCH_POS.length; i++) {
      tp = MINING_TORCH_POS[i];
      phase = Math.sin(frame * 0.12 + i * 2.3);
      var phase2 = Math.sin(frame * 0.08 + i * 1.7);
      flameShift = Math.round(phase * 1.5);
      glowAlpha = 0.08 + phase2 * 0.06; // 0.02 - 0.14
      glowR = 70 + phase * 10; // 60 - 80

      // Animated flame (shifts vertically)
      var fy = tp.y - 6 + flameShift;
      ctx.fillStyle = '#cc3010';
      ctx.fillRect(tp.x + 1, fy, 5, 6);
      ctx.fillStyle = phase > 0 ? '#ff6020' : '#ff5018';
      ctx.fillRect(tp.x + 1, fy + 1, 5, 4);
      ctx.fillStyle = phase > 0 ? '#ff8030' : '#ff7028';
      ctx.fillRect(tp.x + 2, fy + 1, 3, 3);
      ctx.fillStyle = '#ffd060';
      ctx.fillRect(tp.x + 3, fy + 1, 1, 2);
      // Bright tip flicker
      if (frame % 6 < 3) {
        ctx.fillStyle = '#ffe880';
        ctx.fillRect(tp.x + 3, fy, 1, 1);
      }

      // Animated glow
      grad = ctx.createRadialGradient(tp.x + 3, tp.y - 2, 2, tp.x + 3, tp.y - 2, glowR);
      grad.addColorStop(0, 'rgba(255,160,48,' + (glowAlpha + 0.06) + ')');
      grad.addColorStop(0.4, 'rgba(255,120,30,' + (glowAlpha * 0.5) + ')');
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tp.x - 80, tp.y - 84, 166, 166);

      // Ember particles (spawn 1 every ~20 frames per torch)
      if (frame % 20 === (i * 5) % 20) {
        miningEmbers.push({
          x: tp.x + 2 + Math.random() * 3,
          y: tp.y - 8,
          vx: (Math.random() - 0.5) * 8,
          vy: -(15 + Math.random() * 20),
          life: 1.0
        });
      }
    }

    // Hanging lantern flicker
    var lPhase = Math.sin(frame * 0.1 + 5.0);
    var lAlpha = 0.10 + lPhase * 0.05;
    var lR = 100 + lPhase * 20;
    // Lantern glass glow shift
    ctx.fillStyle = lPhase > 0 ? '#f0d060' : '#e0c050';
    ctx.fillRect(MINING_LANTERN_X, MINING_LANTERN_Y + 4, 2, 4);
    ctx.fillStyle = '#ffe880';
    ctx.fillRect(MINING_LANTERN_X, MINING_LANTERN_Y + 5, 1, 2);
    // Glow
    grad = ctx.createRadialGradient(MINING_LANTERN_X, MINING_LANTERN_Y + 5, 4, MINING_LANTERN_X, MINING_LANTERN_Y + 5, lR);
    grad.addColorStop(0, 'rgba(240,180,60,' + (lAlpha + 0.05) + ')');
    grad.addColorStop(0.5, 'rgba(240,160,40,' + (lAlpha * 0.4) + ')');
    grad.addColorStop(1, 'rgba(240,140,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(MINING_LANTERN_X - 120, MINING_LANTERN_Y - 115, 240, 240);

    // Update & draw embers
    for (i = miningEmbers.length - 1; i >= 0; i--) {
      var e = miningEmbers[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 5 * dt; // slight gravity
      e.life -= 1.2 * dt; // ~0.83s lifetime
      if (e.life <= 0) { miningEmbers.splice(i, 1); continue; }
      ctx.globalAlpha = e.life * 0.8;
      ctx.fillStyle = e.life > 0.5 ? '#ffa040' : '#ff6020';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawWaterDrip(ctx, frame, dt) {
    var ds = miningDripState;
    var dropSpeed = 120; // px/s
    var targetY = MINING_PUD_Y - 4;

    if (ds.phase === 'falling') {
      ds.y += dropSpeed * dt;
      if (ds.y >= targetY) {
        ds.y = targetY;
        ds.phase = 'splash';
        ds.splashFrame = 0;
      }
      // Draw falling drop bead (3x4px)
      ctx.fillStyle = 'rgba(80,120,170,0.6)';
      ctx.fillRect(MINING_PUD_X + 12, Math.round(ds.y), 3, 4);
      ctx.fillStyle = 'rgba(140,180,220,0.7)';
      ctx.fillRect(MINING_PUD_X + 13, Math.round(ds.y) + 1, 1, 2);
    } else if (ds.phase === 'splash') {
      ds.splashFrame += dt * 60; // normalize to ~60fps units
      var sf = ds.splashFrame;
      // Ripple rings expanding outward
      var r1 = sf * 0.8;
      var r2 = Math.max(0, (sf - 5) * 0.8);
      var alpha1 = Math.max(0, 1 - sf / 25);
      var alpha2 = Math.max(0, 1 - (sf - 5) / 25);
      // Ring 1
      if (alpha1 > 0) {
        ctx.fillStyle = 'rgba(100,150,200,' + (alpha1 * 0.4) + ')';
        var rw1 = Math.round(r1 * 2 + 4);
        ctx.fillRect(MINING_PUD_X + 14 - Math.round(r1), MINING_PUD_Y - 2, rw1, 1);
        ctx.fillRect(MINING_PUD_X + 14 - Math.round(r1), MINING_PUD_Y + 1, rw1, 1);
      }
      // Ring 2
      if (sf > 5 && alpha2 > 0) {
        ctx.fillStyle = 'rgba(100,150,200,' + (alpha2 * 0.3) + ')';
        var rw2 = Math.round(r2 * 2 + 6);
        ctx.fillRect(MINING_PUD_X + 14 - Math.round(r2) - 1, MINING_PUD_Y - 3, rw2, 1);
        ctx.fillRect(MINING_PUD_X + 14 - Math.round(r2) - 1, MINING_PUD_Y + 2, rw2, 1);
      }
      // Small upward splash droplets
      if (sf < 12) {
        var splAlpha = Math.max(0, 1 - sf / 12);
        ctx.fillStyle = 'rgba(120,170,220,' + (splAlpha * 0.6) + ')';
        ctx.fillRect(MINING_PUD_X + 11, MINING_PUD_Y - 4 - Math.round(sf), 1, 2);
        ctx.fillRect(MINING_PUD_X + 16, MINING_PUD_Y - 3 - Math.round(sf * 0.7), 1, 2);
        ctx.fillRect(MINING_PUD_X + 14, MINING_PUD_Y - 5 - Math.round(sf * 0.9), 1, 2);
      }
      if (sf > 30) {
        ds.phase = 'pause';
        ds.pauseTime = 0;
      }
    } else if (ds.phase === 'pause') {
      ds.pauseTime += dt;
      if (ds.pauseTime > 1.0) { // ~1 second pause
        ds.phase = 'falling';
        ds.y = 50;
      }
    }
  }

  function drawMineCart(ctx, frame, dt) {
    var cs = miningCartState;
    var speed = 12; // px/s
    cs.x += speed * cs.dir * dt;
    // Bounce between track edges
    if (cs.x > 530) { cs.x = 530; cs.dir = -1; }
    if (cs.x < 20) { cs.x = 20; cs.dir = 1; }

    var cx = Math.round(cs.x);
    var cy = MINING_CART_Y;
    var cw = 90, ch = 42;
    var j;

    // Cart body
    ctx.fillStyle = '#3a3430';
    ctx.fillRect(cx, cy + 4, cw, ch);
    ctx.fillStyle = '#4a4438';
    ctx.fillRect(cx + 3, cy + 2, cw - 6, ch - 2);
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(cx + 5, cy + 4, cw - 10, ch - 6);
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(cx + 7, cy + 6, cw - 14, ch - 10);
    // Iron rim
    ctx.fillStyle = '#505058';
    ctx.fillRect(cx, cy + 2, cw, 3);
    ctx.fillStyle = '#606870';
    ctx.fillRect(cx + 1, cy + 2, cw - 2, 1);
    // Side rivets
    ctx.fillStyle = '#606068';
    for (j = 0; j < 4; j++) {
      ctx.fillRect(cx + 10 + j * 22, cy + 8, 2, 2);
      ctx.fillStyle = '#787880';
      ctx.fillRect(cx + 10 + j * 22, cy + 8, 1, 1);
      ctx.fillStyle = '#606068';
    }
    // Wood plank lines
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(cx + 7, cy + 16, cw - 14, 1);
    ctx.fillRect(cx + 7, cy + 28, cw - 14, 1);

    // Wheels
    for (j = 0; j < 2; j++) {
      var wx = cx + 12 + j * 58;
      var wy = cy + ch - 2;
      // Axle
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(wx + 1, wy + 5, 12, 2);
      // Tire
      ctx.fillStyle = '#383840';
      ctx.fillRect(wx + 3, wy, 8, 14);
      ctx.fillRect(wx, wy + 3, 14, 8);
      // Ring
      ctx.fillStyle = '#484850';
      ctx.fillRect(wx + 4, wy + 1, 6, 12);
      ctx.fillRect(wx + 1, wy + 4, 12, 6);
      // Inner
      ctx.fillStyle = '#585860';
      ctx.fillRect(wx + 5, wy + 2, 4, 10);
      ctx.fillRect(wx + 2, wy + 5, 10, 4);
      // Hub
      ctx.fillStyle = '#686870';
      ctx.fillRect(wx + 5, wy + 5, 4, 4);
      ctx.fillStyle = '#808088';
      ctx.fillRect(wx + 6, wy + 6, 2, 2);
      // Spokes
      ctx.fillStyle = '#505058';
      ctx.fillRect(wx + 6, wy + 2, 2, 10);
      ctx.fillRect(wx + 2, wy + 6, 10, 2);
    }
  }

  // ══════════════════════════════════════════════
  // ── WOODCUTTING FOREST ANIMATION OVERLAY ──────
  // ══════════════════════════════════════════════

  function startWcAnim() {
    if (wcAnimFrameId) return;
    wcAnimFrame = 0;
    wcAnimLastTs = 0;
    wcLeaves = [];
    wcFireflies = [];
    wcAnimLoop(0);
  }

  function stopWcAnim() {
    if (wcAnimFrameId) {
      cancelAnimationFrame(wcAnimFrameId);
      wcAnimFrameId = null;
    }
    wcAnimCanvas = null;
    wcAnimCtx = null;
    wcLeaves = [];
    wcFireflies = [];
  }

  function wcAnimLoop(ts) {
    if (!wcAnimCtx || !wcAnimCanvas) { wcAnimFrameId = null; return; }
    wcAnimFrameId = requestAnimationFrame(wcAnimLoop);
    var dt = wcAnimLastTs ? Math.min((ts - wcAnimLastTs) / 1000, 0.1) : 0.016;
    wcAnimLastTs = ts;
    wcAnimFrame++;

    wcAnimCtx.clearRect(0, 0, WC_W, WC_H);
    drawFallingLeaves(wcAnimCtx, wcAnimFrame, dt);
    drawSunbeams(wcAnimCtx, wcAnimFrame, dt);
    drawFireflies(wcAnimCtx, wcAnimFrame, dt);
  }

  function drawFallingLeaves(ctx, frame, dt) {
    var leafColors = ['#c0522e', '#d4a043', '#8b6914', '#a0522d', '#6b8e23', '#c87030', '#b8442e'];
    var i, lf;

    // Spawn ~2 leaves/sec (every ~30 frames at 60fps)
    if (frame % 30 === 0 && wcLeaves.length < 20) {
      wcLeaves.push({
        x: 40 + Math.random() * (WC_W - 80),
        y: -4,
        vx: (Math.random() - 0.5) * 15,
        vy: 20 + Math.random() * 30,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 8 + Math.random() * 12,
        size: 2 + Math.random() * 2,
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        rotation: Math.random() * Math.PI
      });
    }

    // Update & draw leaves
    for (i = wcLeaves.length - 1; i >= 0; i--) {
      lf = wcLeaves[i];
      lf.y += lf.vy * dt;
      lf.x += lf.vx * dt + Math.sin(lf.wobblePhase + frame * 0.04) * lf.wobbleAmp * dt;
      lf.rotation += 1.5 * dt;

      // Remove when past bottom
      if (lf.y > WC_H + 10) { wcLeaves.splice(i, 1); continue; }

      // Draw as diamond shape (2-4px)
      var s = Math.round(lf.size);
      var lx = Math.round(lf.x);
      var ly = Math.round(lf.y);
      ctx.fillStyle = lf.color;
      // Diamond: center pixel + 4 neighbors
      ctx.fillRect(lx, ly - 1, s, 1);
      ctx.fillRect(lx - 1, ly, s + 2, s);
      ctx.fillRect(lx, ly + s, s, 1);
      // Lighter highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(lx, ly, 1, 1);
    }
  }

  function drawSunbeams(ctx, frame) {
    // 3 static beam positions from canopy gaps
    var beams = [
      { x: 180, w: 18 },
      { x: 340, w: 22 },
      { x: 500, w: 16 }
    ];
    var i, bm, alpha, grad;

    for (i = 0; i < beams.length; i++) {
      bm = beams[i];
      // Oscillating alpha
      alpha = 0.04 + Math.sin(frame * 0.03 + i * 2.1) * 0.03;

      // Vertical warm gradient stripe
      grad = ctx.createLinearGradient(0, 0, 0, WC_H);
      grad.addColorStop(0, 'rgba(255,240,180,' + (alpha * 1.5) + ')');
      grad.addColorStop(0.3, 'rgba(255,230,160,' + alpha + ')');
      grad.addColorStop(0.7, 'rgba(255,220,140,' + (alpha * 0.6) + ')');
      grad.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(bm.x, 0, bm.w, WC_H);

      // Dust motes within beam (1px bright dots)
      if (frame % 8 === i) {
        var moteY = 40 + ((tileHash(frame + i * 100, 5555) >>> 0) % (WC_H - 80));
        var moteX = bm.x + 2 + ((tileHash(frame + i * 200, 6666) >>> 0) % (bm.w - 4));
        ctx.fillStyle = 'rgba(255,255,220,0.4)';
        ctx.fillRect(moteX, moteY, 1, 1);
      }
    }
  }

  function drawFireflies(ctx, frame, dt) {
    var i, ff;

    // Spawn ~1 firefly per 60 frames, max 8
    if (frame % 60 === 0 && wcFireflies.length < 8) {
      wcFireflies.push({
        x: 60 + Math.random() * (WC_W - 120),
        y: WC_GROUND_Y + 20 + Math.random() * (WC_H - WC_GROUND_Y - 60),
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        life: 3 + Math.random() * 4, // 3-7s lifetime
        age: 0
      });
    }

    for (i = wcFireflies.length - 1; i >= 0; i--) {
      ff = wcFireflies[i];
      ff.age += dt;
      if (ff.age >= ff.life) { wcFireflies.splice(i, 1); continue; }

      // Random walk drift
      ff.vx += (Math.random() - 0.5) * 20 * dt;
      ff.vy += (Math.random() - 0.5) * 16 * dt;
      ff.vx = Math.max(-15, Math.min(15, ff.vx));
      ff.vy = Math.max(-10, Math.min(10, ff.vy));
      ff.x += ff.vx * dt;
      ff.y += ff.vy * dt;

      // Keep in bounds (ground area)
      ff.x = Math.max(40, Math.min(WC_W - 40, ff.x));
      ff.y = Math.max(WC_GROUND_Y, Math.min(WC_H - 20, ff.y));

      // Sinusoidal blink + fade out in last second
      var blinkAlpha = 0.4 + Math.sin(ff.phase + ff.age * 4) * 0.35;
      var fadeOut = ff.age > ff.life - 1 ? (ff.life - ff.age) : 1;
      var alpha = blinkAlpha * fadeOut;

      // Glow halo (5px radius)
      var gx = Math.round(ff.x), gy = Math.round(ff.y);
      ctx.fillStyle = 'rgba(180,220,100,' + (alpha * 0.15) + ')';
      ctx.fillRect(gx - 3, gy - 3, 7, 7);
      ctx.fillStyle = 'rgba(200,240,120,' + (alpha * 0.3) + ')';
      ctx.fillRect(gx - 2, gy - 2, 5, 5);
      // Bright core (1-2px)
      ctx.fillStyle = 'rgba(220,255,140,' + alpha + ')';
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
      ctx.fillStyle = 'rgba(255,255,200,' + (alpha * 0.8) + ')';
      ctx.fillRect(gx, gy, 1, 1);
    }
  }

  // ══════════════════════════════════════════════
  // ── MINING MINI-GAME (A1 enhanced) ─────────────
  // ══════════════════════════════════════════════
  function renderMining() {
    var area = $('skills-game-area');
    if (!area) return;

    // Apply cavern pixel art background (cached after first generation)
    if (!miningBgDataUrl) miningBgDataUrl = generateMiningCavernBg();
    area.style.backgroundImage = 'url(' + miningBgDataUrl + ')';
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center';

    area.innerHTML = '';
    miningCombo = { count: 0, lastClickTime: 0 };

    // Stop previous animation if re-rendering (e.g. ore dropdown change)
    stopMiningAnim();

    // Animation overlay canvas
    var animCanvas = document.createElement('canvas');
    animCanvas.width = MINING_W;
    animCanvas.height = MINING_H;
    animCanvas.className = 'mining-anim-overlay';
    area.appendChild(animCanvas);
    miningAnimCanvas = animCanvas;
    miningAnimCtx = animCanvas.getContext('2d');
    startMiningAnim();

    // Ore selector dropdown
    var level = state.skills.mining.level;
    var resources = SKILLS.mining.resources;
    var selectWrap = document.createElement('div');
    selectWrap.className = 'mining-ore-select-wrap';
    var sel = document.createElement('select');
    sel.className = 'skill-recipe-select';
    sel.id = 'mining-ore-select';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    sel.value = selectedMiningOre !== null ? selectedMiningOre : highestIdx;
    if (selectedMiningOre === null) selectedMiningOre = highestIdx;
    sel.addEventListener('change', function () {
      selectedMiningOre = parseInt(sel.value);
      renderMining();
      updateGameHeader();
    });
    selectWrap.appendChild(sel);
    area.appendChild(selectWrap);

    var res = getSelectedMiningResource();
    var maxHp = ROCK_HP[res.name] || 1;
    rockState = [];

    var div = document.createElement('div');
    div.className = 'mining-rocks';
    for (var i = 0; i < 3; i++) {
      rockState.push({ hp: maxHp, maxHp: maxHp });

      var rockWrap = document.createElement('div');
      rockWrap.className = 'mining-rock-wrap';

      var rock = document.createElement('div');
      rock.className = 'mining-rock';
      rock.setAttribute('data-idx', i);

      // Phase 3: Pixel art rock sprite
      var rockPos = MINING_ROCK_SPRITES[res.name] || { x: 16, y: 32 };
      var rockSprite = createSpriteEl('rocks', rockPos.x, rockPos.y, 16, 16, 64, 64);
      if (rockSprite) {
        rockSprite.className = 'skill-sprite mining-rock-sprite';
        rock.appendChild(rockSprite);
      } else {
        rock.textContent = '\uD83E\uDEA8';
      }

      // HP bar (hidden when maxHp === 1)
      if (maxHp > 1) {
        var hpBar = document.createElement('div');
        hpBar.className = 'rock-hp-bar';
        hpBar.id = 'rock-hp-bar-' + i;
        var hpFill = document.createElement('div');
        hpFill.className = 'rock-hp-fill';
        hpFill.style.width = '100%';
        hpBar.appendChild(hpFill);
        rock.appendChild(hpBar);
      }

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

  function updateMiningOreDropdown() {
    var sel = $('mining-ore-select');
    if (!sel) return;
    var level = state.skills.mining.level;
    var resources = SKILLS.mining.resources;
    var oldVal = parseInt(sel.value);
    var oldHighest = sel.options.length > 0 ? parseInt(sel.options[sel.options.length - 1].value) : 0;
    sel.innerHTML = '';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    // Auto-switch only when a NEW ore is unlocked (not if user chose a lower ore)
    if (highestIdx > oldHighest) {
      sel.value = highestIdx;
      selectedMiningOre = highestIdx;
      renderMining();
      updateGameHeader();
    } else {
      sel.value = oldVal;
    }
  }

  var veinMinerTriggered = false;
  var miningEventActive = false;
  var miningEventTimer = null;
  var rockRespawnIntervals = [];

  function updateRockHpBar(idx) {
    var bar = $('rock-hp-bar-' + idx);
    if (!bar) return;
    var fill = bar.querySelector('.rock-hp-fill');
    if (!fill) return;
    var rs = rockState[idx];
    fill.style.width = (rs.hp / rs.maxHp * 100) + '%';
  }

  function updateTreeHpBar(idx) {
    var bar = $('tree-hp-bar-' + idx);
    if (!bar) return;
    var fill = bar.querySelector('.tree-hp-fill');
    if (!fill) return;
    var ts = treeState[idx];
    fill.style.width = (ts.hp / ts.maxHp * 100) + '%';
  }

  function onMineClick(e) {
    if (miningCooldown) return;
    if (miningEventActive) return;
    var rock = e.currentTarget;
    if (rock.classList.contains('depleted')) return;

    var idx = parseInt(rock.getAttribute('data-idx'));
    var res = getSelectedMiningResource();
    var now = Date.now();
    var rs = rockState[idx];
    var log = getMiningLog();
    log.totalClicks++;

    // A1: Combo tracking (freeze during events)
    var timeSinceLast = now - miningCombo.lastClickTime;
    if (timeSinceLast >= 400 && timeSinceLast <= 800) {
      miningCombo.count = Math.min(miningCombo.count + 1, 10);
    } else if (timeSinceLast > 800) {
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

    // Critical hit check: min(1% + level*0.2%, 20%)
    var level = state.skills.mining.level;
    var critChance = Math.min(0.01 + level * 0.002, 0.20);
    var isCrit = Math.random() < critChance;

    miningCooldown = true;

    if (isCrit) {
      // Critical hit — instant break regardless of HP
      rs.hp = 0;
      rock.classList.add('cracking');
      var area = $('skills-game-area');
      if (area) spawnParticle(area, 'CRIT!', 'crit');
      log.criticalHits++;
      addLog('Critical hit!');
    } else {
      // Normal hit — decrement HP
      rs.hp = Math.max(rs.hp - 1, 0);
      rock.classList.add(rs.hp > 0 ? 'hit' : 'cracking');
    }
    updateRockHpBar(idx);

    setTimeout(function () {
      rock.classList.remove('shaking', 'hit', 'cracking');

      var area = $('skills-game-area');
      var xpMult = getXpMult() * comboMult;

      if (rs.hp > 0) {
        // Partial hit — award fraction of XP, keep combo, don't deplete
        var partialXp = Math.max(1, Math.floor(res.xp * xpMult / rs.maxHp));
        if (area) {
          spawnParticle(area, '+' + partialXp + ' XP', 'xp');
        }
        addXp('mining', partialXp);
        animatePetAction('pet-bounce');
        miningCooldown = false;
        renderSkillList();
        renderRightPanel();
        return;
      }

      // Rock depleted — full rewards
      log.oresMined[res.name] = (log.oresMined[res.name] || 0) + 1;
      var xpGain = Math.floor(res.xp * xpMult);

      // Perk: Double Strike — 10% chance for 2x yield
      var isDouble = hasPerk('doubleStrike') && Math.random() < 0.10;
      if (isDouble) {
        xpGain *= 2;
        if (area) spawnParticle(area, '2x!', 'xp');
      }

      // Perk: Keen Eye — gem chance 5%→10%
      var gemChance = hasPerk('keenEye') ? 0.10 : 0.05;
      var isGem = Math.random() < gemChance;
      if (isGem) {
        log.totalGems++;
        // 6B: Add random gem to inventory
        var gemIdx = Math.floor(Math.random() * GEM_NAMES.length);
        addItem(GEM_NAMES[gemIdx], 1);
        addLog('+1 ' + GEM_NAMES[gemIdx]);
        var gemMult = hasPerk('gemSpec') ? 10 : 5;
        xpGain *= gemMult;
        if (area) {
          var gem = GEM_SPRITES[Math.floor(Math.random() * GEM_SPRITES.length)];
          spawnSpriteParticle(area, gem.sheet || 'gems', gem.x, gem.y);
          spawnParticle(area, 'GEM! ' + gemMult + 'x XP!', 'gem');
        }
        addLog('Found a gem! ' + gemMult + 'x XP bonus!');
      }

      if (area) {
        spawnParticle(area, '+' + xpGain + ' XP', 'xp');
        if (!isGem) {
          var orePos = ORE_DROP_SPRITES[res.name];
          if (orePos) spawnSpriteParticle(area, orePos.sheet || 'ores', orePos.x, orePos.y);
        }
      }

      addXp('mining', xpGain);

      // 6B: Add ore to inventory
      var oreQty = isDouble ? 2 : 1;
      addItem(res.name, oreQty);
      addLog('Mined ' + oreQty + 'x ' + res.name + ' (+' + xpGain + ' XP)');

      onAction('mining');
      animatePetAction('pet-bounce');

      // Deplete + respawn
      rock.classList.add('depleted');
      var respawnTime = hasPerk('oreSense') ? 2 : 3;
      var timerEl = document.createElement('div');
      timerEl.className = 'mining-respawn-timer';
      timerEl.textContent = respawnTime + 's';
      rock.appendChild(timerEl);

      var remaining = respawnTime;
      var respawnInterval = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearInterval(respawnInterval);
          var ii = rockRespawnIntervals.indexOf(respawnInterval);
          if (ii !== -1) rockRespawnIntervals.splice(ii, 1);
          rock.classList.remove('depleted');
          if (timerEl.parentNode) timerEl.parentNode.removeChild(timerEl);
          // Reset HP
          rs.hp = rs.maxHp;
          updateRockHpBar(idx);
        } else {
          timerEl.textContent = remaining + 's';
        }
      }, 1000);
      rockRespawnIntervals.push(respawnInterval);

      // Perk: Vein Miner
      if (hasPerk('veinMiner') && !veinMinerTriggered && Math.random() < 0.20) {
        veinMinerTriggered = true;
        var allRocks = document.querySelectorAll('.mining-rock:not(.depleted)');
        if (allRocks.length > 0) {
          var target = allRocks[Math.floor(Math.random() * allRocks.length)];
          setTimeout(function () {
            if (!target.classList.contains('depleted')) {
              target.click();
            }
            veinMinerTriggered = false;
          }, 500);
          addLog('Vein Miner triggered!');
        } else {
          veinMinerTriggered = false;
        }
      }

      tryTriggerMiningEvent();

      miningCooldown = false;
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
    }, 300);
  }

  // ══════════════════════════════════════════════
  // ── Mining Events (random special encounters) ──
  // ══════════════════════════════════════════════
  var MINING_EVENTS = [
    { id: 'gemVein', name: 'Gem Vein', weight: 40 },
    { id: 'shootingStar', name: 'Shooting Star', weight: 35 },
    { id: 'caveIn', name: 'Cave-In', weight: 25 }
  ];

  function tryTriggerMiningEvent() {
    if (miningEventActive) return;
    if (Math.random() > 0.02) return; // 2% chance per depletion

    // Build weighted pool (add Deep Vein if perk unlocked)
    var pool = [];
    var totalWeight = 0;
    for (var i = 0; i < MINING_EVENTS.length; i++) {
      pool.push(MINING_EVENTS[i]);
      totalWeight += MINING_EVENTS[i].weight;
    }
    if (hasPerk('deepCore')) {
      pool.push({ id: 'deepVein', name: 'Deep Vein', weight: 20 });
      totalWeight += 20;
    }

    // Weighted random selection
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    var selected = pool[0];
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight;
      if (roll < cumulative) { selected = pool[j]; break; }
    }

    miningEventActive = true;
    addLog('EVENT: ' + selected.name + '!');

    if (selected.id === 'gemVein') triggerGemVein();
    else if (selected.id === 'shootingStar') triggerShootingStar();
    else if (selected.id === 'caveIn') triggerCaveIn();
    else if (selected.id === 'deepVein') triggerDeepVein();
  }

  function createEventRock(cssClass, label, timeLimit, eventId) {
    var area = $('skills-game-area');
    if (!area) return null;
    var rock = document.createElement('div');
    rock.className = 'mining-event-rock ' + cssClass;
    rock.innerHTML = '<div class="mining-event-label">' + label + '</div>';

    // Pixel art sprite for event rock
    var spriteInfo = EVENT_ROCK_SPRITES[eventId];
    if (spriteInfo) {
      var sprite = createSpriteEl(spriteInfo.sheet, spriteInfo.x, spriteInfo.y, 16, 16, 56, 56);
      if (sprite) {
        sprite.className = 'skill-sprite mining-event-sprite';
        rock.appendChild(sprite);
      }
    }

    // Timer bar
    var timerBar = document.createElement('div');
    timerBar.className = 'mining-event-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'mining-event-timer-fill';
    timerFill.style.width = '100%';
    timerFill.style.transition = 'width ' + (timeLimit / 1000) + 's linear';
    timerBar.appendChild(timerFill);
    rock.appendChild(timerBar);

    area.appendChild(rock);

    // Start timer animation
    setTimeout(function () { timerFill.style.width = '0%'; }, 50);

    return rock;
  }

  function cleanupEvent() {
    miningEventActive = false;
    if (miningEventTimer) { clearTimeout(miningEventTimer); miningEventTimer = null; }
    var evRocks = document.querySelectorAll('.mining-event-rock');
    for (var i = 0; i < evRocks.length; i++) {
      if (evRocks[i].parentNode) evRocks[i].parentNode.removeChild(evRocks[i]);
    }
    var caveRocks = document.querySelectorAll('.cave-in-rock');
    for (var j = 0; j < caveRocks.length; j++) {
      if (caveRocks[j].parentNode) caveRocks[j].parentNode.removeChild(caveRocks[j]);
    }
    var area = $('skills-game-area');
    if (area) area.classList.remove('cave-shake');
  }

  function triggerGemVein() {
    var rock = createEventRock('gem-vein', 'Gem Vein!', 10000, 'gemVein');
    if (!rock) { cleanupEvent(); return; }

    var veinHp = { hp: 3, maxHp: 3 };

    var hpBar = document.createElement('div');
    hpBar.className = 'rock-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'rock-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    rock.appendChild(hpBar);

    rock.addEventListener('click', function () {
      veinHp.hp--;
      hpFill.style.width = (veinHp.hp / veinHp.maxHp * 100) + '%';
      rock.classList.add('hit');
      setTimeout(function () { rock.classList.remove('hit'); }, 200);

      if (veinHp.hp <= 0) {
        var log = getMiningLog();
        log.events.gemVein++;
        log.totalGems += 3;
        var area = $('skills-game-area');
        var res = getSelectedMiningResource();
        var xpMult = getXpMult();
        var gemMult = hasPerk('gemSpec') ? 10 : 5;
        var totalXp = Math.floor(res.xp * xpMult * gemMult * 3);
        // 3 guaranteed gems
        for (var i = 0; i < 3; i++) {
          var gemIdx = Math.floor(Math.random() * GEM_NAMES.length);
          addItem(GEM_NAMES[gemIdx], 1);
          if (area) {
            var gem = GEM_SPRITES[Math.floor(Math.random() * GEM_SPRITES.length)];
            spawnSpriteParticle(area, gem.sheet || 'gems', gem.x, gem.y);
          }
        }
        addXp('mining', totalXp);
        addLog('Gem Vein! Found 3 gems! (+' + totalXp + ' XP)');
        if (area) spawnParticle(area, '3 GEMS! +' + totalXp + ' XP', 'gem');
        saveState();
        cleanupEvent();
        renderSkillList();
        renderRightPanel();
      }
    });

    miningEventTimer = setTimeout(function () {
      addLog('Gem Vein vanished...');
      cleanupEvent();
    }, 10000);
  }

  function triggerShootingStar() {
    var rock = createEventRock('shooting-star', 'Shooting Star!', 8000, 'shootingStar');
    if (!rock) { cleanupEvent(); return; }

    var starHp = { hp: 3, maxHp: 3 };

    var hpBar = document.createElement('div');
    hpBar.className = 'rock-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'rock-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    rock.appendChild(hpBar);

    rock.addEventListener('click', function () {
      starHp.hp--;
      hpFill.style.width = (starHp.hp / starHp.maxHp * 100) + '%';
      rock.classList.add('hit');
      setTimeout(function () { rock.classList.remove('hit'); }, 200);

      if (starHp.hp <= 0) {
        getMiningLog().events.shootingStar++;
        var area = $('skills-game-area');
        var res = getSelectedMiningResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 10);
        addXp('mining', xpGain);
        addItem(res.name, 2);
        addLog('Shooting Star mined! +2 ' + res.name + ', 10x XP! (+' + xpGain + ' XP)');
        if (area) {
          spawnParticle(area, '+' + xpGain + ' XP (10x!)', 'xp');
          var orePos = ORE_DROP_SPRITES[res.name];
          if (orePos) spawnSpriteParticle(area, orePos.sheet || 'ores', orePos.x, orePos.y);
        }
        saveState();
        cleanupEvent();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }
    });

    miningEventTimer = setTimeout(function () {
      addLog('Shooting Star faded away...');
      cleanupEvent();
    }, 8000);
  }

  function triggerCaveIn() {
    var area = $('skills-game-area');
    if (!area) { cleanupEvent(); return; }

    area.classList.add('cave-shake');
    addLog('CAVE-IN! Click the falling rocks!');

    var clicked = 0;
    var total = 3;

    for (var i = 0; i < total; i++) {
      var rock = document.createElement('div');
      rock.className = 'cave-in-rock';
      rock.style.left = (15 + Math.random() * 60) + '%';
      rock.style.animationDelay = (i * 0.3) + 's';
      // Pixel art boulder sprite
      var boulderInfo = EVENT_ROCK_SPRITES.caveIn;
      if (boulderInfo) {
        var bSprite = createSpriteEl(boulderInfo.sheet, boulderInfo.x, boulderInfo.y, 16, 16, 40, 40);
        if (bSprite) {
          bSprite.className = 'skill-sprite cave-in-sprite';
          rock.classList.add('has-sprite');
          rock.appendChild(bSprite);
        }
      }
      rock.addEventListener('click', (function (el) {
        return function () {
          if (el.classList.contains('clicked')) return;
          el.classList.add('clicked');
          clicked++;
          if (clicked >= total) {
            getMiningLog().events.caveIn++;
            var res = getSelectedMiningResource();
            var xpGain = Math.floor(res.xp * getXpMult() * 5);
            addXp('mining', xpGain);
            addItem(res.name, 1);
            addLog('Cave-In survived! +1 ' + res.name + ', 5x XP! (+' + xpGain + ' XP)');
            if (area) spawnParticle(area, '5x! +' + xpGain + ' XP', 'xp');
            saveState();
            cleanupEvent();
            renderSkillList();
            renderRightPanel();
          }
        };
      })(rock));
      area.appendChild(rock);
    }

    miningEventTimer = setTimeout(function () {
      if (clicked < total) {
        miningCombo.count = 0;
        var comboEl = $('mining-combo');
        if (comboEl) comboEl.style.display = 'none';
        addLog('Cave-In! Rocks crushed you. Combo lost.');
        if (area) spawnParticle(area, 'Combo Lost!', 'crit');
      }
      cleanupEvent();
    }, 5000);
  }

  function triggerDeepVein() {
    var rock = createEventRock('deep-vein', 'Deep Vein!', 15000, 'deepVein');
    if (!rock) { cleanupEvent(); return; }

    var veinHp = { hp: 5, maxHp: 5 };

    var hpBar = document.createElement('div');
    hpBar.className = 'rock-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'rock-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    rock.appendChild(hpBar);

    rock.addEventListener('click', function () {
      veinHp.hp--;
      hpFill.style.width = (veinHp.hp / veinHp.maxHp * 100) + '%';
      rock.classList.add('hit');
      setTimeout(function () { rock.classList.remove('hit'); }, 200);

      if (veinHp.hp <= 0) {
        getMiningLog().events.deepVein++;
        var area = $('skills-game-area');
        var res = getSelectedMiningResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 5);
        addXp('mining', xpGain);
        addItem(res.name, 3);
        addLog('Deep Vein mined! +3 ' + res.name + ', 5x XP! (+' + xpGain + ' XP)');
        if (area) {
          spawnParticle(area, '+' + xpGain + ' XP (5x!)', 'xp');
          var orePos = ORE_DROP_SPRITES[res.name];
          if (orePos) spawnSpriteParticle(area, orePos.sheet || 'ores', orePos.x, orePos.y);
        }
        saveState();
        cleanupEvent();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }
    });

    miningEventTimer = setTimeout(function () {
      addLog('Deep Vein collapsed...');
      cleanupEvent();
    }, 15000);
  }

  // ── FISHING MINI-GAME (A2 enhanced) ────────────
  // ══════════════════════════════════════════════
  // ══════════════════════════════════════════════
  // ── FISHING PROCEDURAL BACKGROUND ─────────────
  // ══════════════════════════════════════════════
  function generateFishingDockBg() {
    var W = FISHING_W, H = FISHING_H;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var grad, i, x, y;

    // Sky gradient
    grad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    grad.addColorStop(0, '#5ba3d9');
    grad.addColorStop(0.5, '#87ceeb');
    grad.addColorStop(1, '#b0dff0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.4);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    var cloudSeeds = [80, 220, 400, 520];
    for (i = 0; i < cloudSeeds.length; i++) {
      var cx = cloudSeeds[i] + ((tileHash(i, 200) >>> 0) % 40) - 20;
      var cy = 20 + ((tileHash(i, 201) >>> 0) % 40);
      var cw = 40 + ((tileHash(i, 202) >>> 0) % 40);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cw * 0.4, cy - 5, cw * 0.6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizon line
    var horizonY = Math.floor(H * 0.35);
    ctx.fillStyle = '#a0c8e0';
    ctx.fillRect(0, horizonY - 2, W, 4);

    // Distant boat silhouette
    var boatX = 160 + ((tileHash(42, 300) >>> 0) % 300);
    ctx.fillStyle = '#445566';
    ctx.fillRect(boatX, horizonY - 8, 20, 5);
    ctx.beginPath();
    ctx.moveTo(boatX + 10, horizonY - 8);
    ctx.lineTo(boatX + 10, horizonY - 20);
    ctx.lineTo(boatX + 18, horizonY - 10);
    ctx.closePath();
    ctx.fill();

    // Water (ocean blue)
    grad = ctx.createLinearGradient(0, horizonY, 0, H * 0.7);
    grad.addColorStop(0, '#4a90c4');
    grad.addColorStop(0.3, '#2979b9');
    grad.addColorStop(0.7, '#1565a0');
    grad.addColorStop(1, '#0d4780');
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizonY, W, H * 0.7 - horizonY);

    // Wave texture on water
    for (y = horizonY + 4; y < H * 0.7; y += 8) {
      var waveAlpha = 0.08 + ((y - horizonY) / (H * 0.35)) * 0.06;
      ctx.strokeStyle = 'rgba(255,255,255,' + waveAlpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (x = 0; x < W; x += 2) {
        var wy = y + Math.sin((x + (tileHash(Math.floor(y), 301) >>> 0) % 50) * 0.04) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Dock (wooden planks at bottom 30%)
    var dockY = Math.floor(H * 0.68);
    grad = ctx.createLinearGradient(0, dockY, 0, H);
    grad.addColorStop(0, '#6d4c2a');
    grad.addColorStop(0.3, '#5a3e22');
    grad.addColorStop(1, '#4a3018');
    ctx.fillStyle = grad;
    ctx.fillRect(0, dockY, W, H - dockY);

    // Dock plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (y = dockY + 12; y < H; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Vertical plank gaps
    for (x = 60; x < W; x += 80 + ((tileHash(x, 400) >>> 0) % 40)) {
      ctx.beginPath();
      ctx.moveTo(x, dockY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Dock edge shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, dockY, W, 4);

    // Nail details
    ctx.fillStyle = '#3a2a14';
    for (x = 40; x < W; x += 80) {
      for (y = dockY + 6; y < H; y += 28) {
        ctx.fillRect(x, y, 2, 2);
        ctx.fillRect(x + 30, y + 14, 2, 2);
      }
    }

    // Water reflection near dock
    ctx.fillStyle = 'rgba(10,50,100,0.3)';
    ctx.fillRect(0, dockY - 8, W, 8);

    // Light shimmer on water
    for (i = 0; i < 30; i++) {
      var sx = ((tileHash(i, 500) >>> 0) % W);
      var sy = horizonY + 5 + ((tileHash(i, 501) >>> 0) % Math.floor((dockY - horizonY - 10)));
      ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + Math.random() * 0.15) + ')';
      ctx.fillRect(sx, sy, 3 + ((tileHash(i, 502) >>> 0) % 6), 1);
    }

    return c.toDataURL('image/png');
  }

  // ── Fishing animation overlay ─────────────────
  function fishingAnimLoop(ts) {
    fishingAnimFrameId = requestAnimationFrame(fishingAnimLoop);
    if (!fishingAnimCtx || !fishingAnimCanvas) return;
    var dt = ts - fishingAnimLastTs;
    if (dt < 50) return;
    fishingAnimLastTs = ts;
    fishingAnimFrame++;

    var ctx = fishingAnimCtx;
    var W = fishingAnimCanvas.width, H = fishingAnimCanvas.height;
    ctx.clearRect(0, 0, W, H);

    // Water ripples
    while (fishingRipples.length < 6) {
      fishingRipples.push({
        x: Math.random() * W,
        y: H * 0.35 + Math.random() * (H * 0.33),
        r: 1 + Math.random() * 3,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        speed: 0.3 + Math.random() * 0.2
      });
    }
    for (var ri = fishingRipples.length - 1; ri >= 0; ri--) {
      var rp = fishingRipples[ri];
      rp.life++;
      rp.r += rp.speed;
      var alpha = Math.max(0, 1 - rp.life / rp.maxLife) * 0.25;
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r * 2, rp.r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (rp.life >= rp.maxLife) {
        fishingRipples.splice(ri, 1);
      }
    }

    // Seagull silhouettes
    while (fishingGulls.length < 2) {
      fishingGulls.push({
        x: -20 - Math.random() * 60,
        y: 15 + Math.random() * 50,
        speed: 0.4 + Math.random() * 0.3,
        wingPhase: Math.random() * Math.PI * 2
      });
    }
    for (var gi = fishingGulls.length - 1; gi >= 0; gi--) {
      var g = fishingGulls[gi];
      g.x += g.speed;
      g.wingPhase += 0.08;
      var wingY = Math.sin(g.wingPhase) * 3;
      ctx.strokeStyle = 'rgba(40,40,40,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x - 6, g.y + wingY);
      ctx.quadraticCurveTo(g.x, g.y - 2, g.x + 6, g.y + wingY);
      ctx.stroke();
      if (g.x > W + 30) fishingGulls.splice(gi, 1);
    }

    // Cloud wisps (slow horizontal drift)
    while (fishingClouds.length < 3) {
      fishingClouds.push({
        x: Math.random() * W,
        y: 10 + Math.random() * 30,
        w: 30 + Math.random() * 50,
        speed: 0.05 + Math.random() * 0.05
      });
    }
    for (var ci = 0; ci < fishingClouds.length; ci++) {
      var cl = fishingClouds[ci];
      cl.x += cl.speed;
      if (cl.x > W + cl.w) cl.x = -cl.w;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.ellipse(cl.x, cl.y, cl.w, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wave motion on water surface
    var waveY = Math.floor(H * 0.35);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var wx = 0; wx < W; wx += 3) {
      var wy = waveY + Math.sin((wx + fishingAnimFrame * 2) * 0.03) * 2;
      if (wx === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  function startFishingAnim() {
    if (fishingAnimFrameId) return;
    fishingAnimFrame = 0;
    fishingAnimLastTs = 0;
    fishingRipples = [];
    fishingGulls = [];
    fishingClouds = [];
    fishingAnimLoop(0);
  }

  function stopFishingAnim() {
    if (fishingAnimFrameId) {
      cancelAnimationFrame(fishingAnimFrameId);
      fishingAnimFrameId = null;
    }
    fishingAnimCanvas = null;
    fishingAnimCtx = null;
    fishingRipples = [];
    fishingGulls = [];
    fishingClouds = [];
  }

  // ── Fishing dropdown update on level-up ─────
  function updateFishDropdown() {
    var sel = $('fishing-select');
    if (!sel) return;
    var level = state.skills.fishing.level;
    var resources = SKILLS.fishing.resources;
    var oldVal = parseInt(sel.value);
    var oldHighest = sel.options.length > 0 ? parseInt(sel.options[sel.options.length - 1].value) : 0;
    sel.innerHTML = '';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    // Auto-switch only when a NEW fish is unlocked
    if (highestIdx > oldHighest) {
      sel.value = highestIdx;
      selectedFish = highestIdx;
      updateGameHeader();
      updateFishingSpotVisuals();
    } else {
      sel.value = oldVal;
    }
  }

  // Update fish sprites + labels in existing spots without resetting spot state
  function updateFishingSpotVisuals() {
    var res = getSelectedFishResource();
    if (!res) return;
    var fishPos = FISH_SPRITES[res.name];
    for (var i = 0; i < 3; i++) {
      // Update sprite
      var oldSpr = $('fish-sprite-' + i);
      if (oldSpr && fishPos) {
        var newSpr = createSpriteEl(fishPos.sheet || 'items_sheet', fishPos.x, fishPos.y, 16, 16, 48, 48);
        if (newSpr) {
          newSpr.className = oldSpr.className;
          newSpr.id = oldSpr.id;
          newSpr.style.opacity = oldSpr.style.opacity;
          oldSpr.parentNode.replaceChild(newSpr, oldSpr);
        }
      }
      // Update label
      var wrap = document.querySelectorAll('.fishing-spot-wrap')[i];
      if (wrap) {
        var label = wrap.querySelector('.fishing-spot-label');
        if (label) label.textContent = res.name;
      }
    }
  }

  // ── Fishing catch splash ────────────────────
  function spawnFishSplash(spotEl) {
    var rect = spotEl.getBoundingClientRect();
    var area = $('skills-game-area');
    if (!area) return;
    var areaRect = area.getBoundingClientRect();
    var cx = rect.left - areaRect.left + rect.width / 2;
    var cy = rect.top - areaRect.top + rect.height / 2;
    for (var i = 0; i < 8; i++) {
      var drop = document.createElement('div');
      drop.className = 'fish-splash-drop';
      var angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.4;
      var dist = 20 + Math.random() * 25;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist - 15;
      drop.style.left = cx + 'px';
      drop.style.top = cy + 'px';
      drop.style.setProperty('--dx', dx + 'px');
      drop.style.setProperty('--dy', dy + 'px');
      area.appendChild(drop);
      setTimeout(function(el) { return function() { if (el.parentNode) el.parentNode.removeChild(el); }; }(drop), 600);
    }
  }

  // ── Fishing HP bar helper ───────────────────
  function updateFishHpBar(idx) {
    var bar = $('fish-hp-bar-' + idx);
    if (!bar) return;
    var fill = bar.querySelector('.fish-hp-fill');
    if (!fill) return;
    var fs = fishSpotState[idx];
    var pct = fs.hp / fs.maxHp;
    fill.style.width = (pct * 100) + '%';
    fill.style.backgroundColor = pct > 0.5 ? '#66bb6a' : pct > 0.25 ? '#ffeb3b' : '#f44336';
  }

  // ══════════════════════════════════════════════
  // ── FISHING MINI-GAME (overhauled) ────────────
  // ══════════════════════════════════════════════
  function renderFishing() {
    var area = $('skills-game-area');
    if (!area) return;

    // Apply dock pixel art background (cached after first generation)
    if (!fishingBgDataUrl) fishingBgDataUrl = generateFishingDockBg();
    area.style.backgroundImage = 'url(' + fishingBgDataUrl + ')';
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center';

    // Clear previous timers before destroying DOM
    for (var ci = 0; ci < fishSpotState.length; ci++) {
      if (fishSpotState[ci].biteTimer) clearTimeout(fishSpotState[ci].biteTimer);
      if (fishSpotState[ci].missTimer) clearTimeout(fishSpotState[ci].missTimer);
    }
    for (var cri = 0; cri < fishSpotRespawnIntervals.length; cri++) {
      clearInterval(fishSpotRespawnIntervals[cri]);
    }
    fishSpotRespawnIntervals = [];

    // Stop previous animation before destroying DOM
    stopFishingAnim();

    area.innerHTML = '';
    fishingCombo = { count: 0, lastClickTime: 0 };

    // Animation overlay canvas
    var animCanvas = document.createElement('canvas');
    animCanvas.width = FISHING_W;
    animCanvas.height = FISHING_H;
    animCanvas.className = 'fishing-anim-overlay';
    area.appendChild(animCanvas);
    fishingAnimCanvas = animCanvas;
    fishingAnimCtx = animCanvas.getContext('2d');
    startFishingAnim();

    // Fish selector dropdown
    var level = state.skills.fishing.level;
    var resources = SKILLS.fishing.resources;
    var selectWrap = document.createElement('div');
    selectWrap.className = 'fishing-select-wrap';
    var sel = document.createElement('select');
    sel.className = 'skill-recipe-select';
    sel.id = 'fishing-select';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    sel.value = selectedFish !== null ? selectedFish : highestIdx;
    if (selectedFish === null) selectedFish = highestIdx;
    sel.addEventListener('change', function () {
      selectedFish = parseInt(sel.value);
      renderFishing();
      updateGameHeader();
    });
    selectWrap.appendChild(sel);
    area.appendChild(selectWrap);

    var res = getSelectedFishResource();
    var maxHp = FISH_HP[res.name] || 1;
    fishSpotState = [];

    var div = document.createElement('div');
    div.className = 'fishing-spots';
    for (var i = 0; i < 3; i++) {
      fishSpotState.push({ phase: 'idle', hp: maxHp, maxHp: maxHp, biteTimer: null, missTimer: null });

      var spotWrap = document.createElement('div');
      spotWrap.className = 'fishing-spot-wrap';

      var spot = document.createElement('div');
      spot.className = 'fishing-spot';
      spot.setAttribute('data-idx', i);

      // Tier-colored border
      var tierIdx = Math.min(Math.floor(res.level / 20), 5);
      spot.style.borderColor = TIER_COLORS[tierIdx];

      // Fish sprite inside spot
      var fishPos = FISH_SPRITES[res.name];
      if (fishPos) {
        var fishSprite = createSpriteEl(fishPos.sheet || 'items_sheet', fishPos.x, fishPos.y, 16, 16, 48, 48);
        if (fishSprite) {
          fishSprite.className = 'skill-sprite fishing-fish-sprite';
          fishSprite.id = 'fish-sprite-' + i;
          spot.appendChild(fishSprite);
        }
      }

      // Bobber (sprite)
      var bobber = document.createElement('div');
      bobber.className = 'fishing-bobber-el';
      bobber.id = 'fish-bobber-' + i;
      var bobberSpr = createSpriteEl('items_sheet', FISHING_EQUIP_SPRITES.bobber.x, FISHING_EQUIP_SPRITES.bobber.y, 16, 16, 32, 32);
      if (bobberSpr) { bobberSpr.className = 'skill-sprite fishing-bobber-sprite'; bobber.appendChild(bobberSpr); }
      spot.appendChild(bobber);

      // Line
      var line = document.createElement('div');
      line.className = 'fishing-line-el';
      line.id = 'fish-line-' + i;
      spot.appendChild(line);

      // Exclaim — lure sprite instead of "!" text
      var exclaim = document.createElement('div');
      exclaim.className = 'fishing-exclaim-el';
      exclaim.id = 'fish-exclaim-' + i;
      var lureSpr = createSpriteEl('items_sheet', FISHING_EQUIP_SPRITES.lure.x, FISHING_EQUIP_SPRITES.lure.y, 16, 16, 24, 24);
      if (lureSpr) { lureSpr.className = 'skill-sprite'; exclaim.appendChild(lureSpr); }
      else exclaim.textContent = '!';
      spot.appendChild(exclaim);

      // HP bar (hidden when maxHp === 1)
      if (maxHp > 1) {
        var hpBar = document.createElement('div');
        hpBar.className = 'fish-hp-bar';
        hpBar.id = 'fish-hp-bar-' + i;
        var hpFill = document.createElement('div');
        hpFill.className = 'fish-hp-fill';
        hpFill.style.width = '100%';
        hpBar.appendChild(hpFill);
        spot.appendChild(hpBar);
      }

      spot.addEventListener('click', onFishSpotClick);
      spotWrap.appendChild(spot);

      // Label
      var label = document.createElement('div');
      label.className = 'fishing-spot-label';
      label.textContent = res.name;
      spotWrap.appendChild(label);

      div.appendChild(spotWrap);
    }
    area.appendChild(div);

    // Combo counter
    var comboEl = document.createElement('div');
    comboEl.className = 'fishing-combo';
    comboEl.id = 'fishing-combo';
    comboEl.style.display = 'none';
    area.appendChild(comboEl);

    // Ambient fish swimming across the background
    startAmbientFish();

    // C1: Render pet
    renderPetInGameArea();
  }

  var ambientFishTimer = null;
  function startAmbientFish() {
    stopAmbientFish();
    spawnAmbientFish();
    ambientFishTimer = setInterval(spawnAmbientFish, 5000 + Math.random() * 4000);
  }
  function stopAmbientFish() {
    if (ambientFishTimer) { clearInterval(ambientFishTimer); ambientFishTimer = null; }
  }
  function spawnAmbientFish() {
    var area = $('skills-game-area');
    if (!area) return;
    // Max 3 ambient fish at a time
    var existing = area.querySelectorAll('.ambient-fish');
    if (existing.length >= 3) return;
    var af = AMBIENT_FISH[Math.floor(Math.random() * AMBIENT_FISH.length)];
    var spr = createSpriteEl('items_sheet', af.x, af.y, 16, 16, 24, 24);
    if (!spr) return;
    spr.className = 'skill-sprite ambient-fish';
    var fromLeft = Math.random() > 0.5;
    var topPct = 36 + Math.random() * 28; // water zone only (36%-64%), avoid sky and dock
    var dur = 6 + Math.random() * 6;
    spr.style.position = 'absolute';
    spr.style.top = topPct + '%';
    spr.style.zIndex = '0';
    spr.style.opacity = '0.35';
    spr.style.pointerEvents = 'none';
    if (fromLeft) {
      spr.style.left = '-30px';
      spr.style.transition = 'left ' + dur + 's linear, top ' + dur + 's ease-in-out';
      spr.style.transform = 'scaleX(1)';
    } else {
      spr.style.right = '-30px';
      spr.style.transition = 'right ' + dur + 's linear, top ' + dur + 's ease-in-out';
      spr.style.transform = 'scaleX(-1)';
    }
    area.appendChild(spr);
    // Trigger transition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var drift = (Math.random() - 0.5) * 20;
        spr.style.top = (topPct + drift) + '%';
        if (fromLeft) spr.style.left = 'calc(100% + 30px)';
        else spr.style.right = 'calc(100% + 30px)';
      });
    });
    // Remove after animation
    setTimeout(function () { if (spr.parentNode) spr.parentNode.removeChild(spr); }, (dur + 1) * 1000);
  }

  function cleanupFishingSpot(idx) {
    var fs = fishSpotState[idx];
    if (!fs) return;
    if (fs.biteTimer) { clearTimeout(fs.biteTimer); fs.biteTimer = null; }
    if (fs.missTimer) { clearTimeout(fs.missTimer); fs.missTimer = null; }
    var res = getSelectedFishResource();
    var maxHp = FISH_HP[res.name] || 1;
    fs.phase = 'idle';
    fs.hp = maxHp;
    fs.maxHp = maxHp;
    // Reset HP bar visual
    updateFishHpBar(idx);
    var spot = document.querySelector('.fishing-spot[data-idx="' + idx + '"]');
    if (spot) {
      spot.classList.remove('waiting', 'bite', 'reeling', 'depleted');
      var fishSpr = $('fish-sprite-' + idx);
      if (fishSpr) fishSpr.style.opacity = '';
      var bobber = $('fish-bobber-' + idx);
      var line = $('fish-line-' + idx);
      var exclaim = $('fish-exclaim-' + idx);
      if (bobber) bobber.classList.remove('visible', 'bite-anim');
      if (line) line.classList.remove('cast');
      if (exclaim) exclaim.classList.remove('visible');
    }
  }

  function onFishSpotClick(e) {
    var spot = e.currentTarget;
    if (spot.classList.contains('depleted')) return;
    if (fishingCooldown) return;
    if (fishingEventActive) return;

    var idx = parseInt(spot.getAttribute('data-idx'));
    var fs = fishSpotState[idx];
    if (!fs) return;
    var res = getSelectedFishResource();
    var level = state.skills.fishing.level;
    var log = getFishingLog();
    var now = Date.now();

    if (fs.phase === 'idle') {
      // ── Cast: idle → waiting ──
      fs.phase = 'waiting';
      spot.classList.add('waiting');
      var fishSpr = $('fish-sprite-' + idx);
      if (fishSpr) fishSpr.style.opacity = '0.3';
      var bobber = $('fish-bobber-' + idx);
      var line = $('fish-line-' + idx);
      if (bobber) bobber.classList.add('visible');
      if (line) line.classList.add('cast');

      // Wait time based on level, perk
      var baseWait = res.clickTime || 2000;
      var waitTime = baseWait * (1 - level / MAX_LEVEL * 0.5);
      if (hasPerk('patience', 'fishing')) waitTime *= 0.75;
      waitTime = Math.max(waitTime, 500);

      fs.biteTimer = setTimeout(function () {
        fs.phase = 'bite';
        spot.classList.remove('waiting');
        spot.classList.add('bite');
        var bobber2 = $('fish-bobber-' + idx);
        var exclaim2 = $('fish-exclaim-' + idx);
        if (bobber2) bobber2.classList.add('bite-anim');
        if (exclaim2) exclaim2.classList.add('visible');
        addLog('Bite on spot ' + (idx + 1) + '!');

        // Miss timer (2s)
        fs.missTimer = setTimeout(function () {
          if (fs.phase === 'bite' || fs.phase === 'reeling') {
            addLog('Fish got away!');
            cleanupFishingSpot(idx);
          }
        }, 2000);
      }, waitTime);
      return;
    }

    if (fs.phase === 'bite' || fs.phase === 'reeling') {
      // ── Reel click ──
      fishingCooldown = true;
      fs.phase = 'reeling';
      spot.classList.remove('bite');
      spot.classList.add('reeling');
      log.totalClicks++;

      // Reset miss timer on each reel click
      if (fs.missTimer) { clearTimeout(fs.missTimer); fs.missTimer = null; }
      fs.missTimer = setTimeout(function () {
        if (fs.phase === 'reeling') {
          addLog('Fish got away!');
          if (fishingCombo.count > 0) {
            var lostArea = $('skills-game-area');
            if (lostArea) spawnParticle(lostArea, 'COMBO LOST!', 'combo-lost');
          }
          fishingCombo.count = 0;
          var comboEl = $('fishing-combo');
          if (comboEl) comboEl.style.display = 'none';
          cleanupFishingSpot(idx);
        }
      }, 2000);

      // Combo tracking (Perk: Quick Hands widens window to 300-800ms)
      var comboMin = hasPerk('quickHands', 'fishing') ? 300 : 400;
      var timeSinceLast = now - fishingCombo.lastClickTime;
      if (timeSinceLast >= comboMin && timeSinceLast <= 800) {
        fishingCombo.count = Math.min(fishingCombo.count + 1, 10);
      } else if (timeSinceLast > 800) {
        if (fishingCombo.count > 0) {
          var lostArea2 = $('skills-game-area');
          if (lostArea2) spawnParticle(lostArea2, 'COMBO LOST!', 'combo-lost');
        }
        fishingCombo.count = 0;
      }
      fishingCombo.lastClickTime = now;

      var comboMult = 1 + (fishingCombo.count * 0.1);
      var comboEl = $('fishing-combo');
      if (comboEl) {
        if (fishingCombo.count > 0) {
          comboEl.textContent = 'Combo x' + fishingCombo.count + ' (' + comboMult.toFixed(1) + 'x)';
          comboEl.style.display = '';
        } else {
          comboEl.style.display = 'none';
        }
      }

      // Crit check: min(1% + level*0.2%, 20%)
      var critChance = Math.min(0.01 + level * 0.002, 0.20);
      var isCrit = Math.random() < critChance;

      if (isCrit) {
        fs.hp = 0;
        spot.classList.add('fishing-crit');
        var area = $('skills-game-area');
        if (area) spawnParticle(area, 'CRIT!', 'crit');
        log.criticalHits++;
        addLog('Critical hit!');
      } else {
        fs.hp = Math.max(fs.hp - 1, 0);
        spot.classList.add('hit', 'shaking');
      }
      updateFishHpBar(idx);

      setTimeout(function () {
        spot.classList.remove('hit', 'shaking', 'fishing-crit');
      }, 250);

      if (fs.hp > 0) {
        // Partial reel — award fraction of XP
        var partialXp = Math.max(1, Math.floor(res.xp * getXpMult() / fs.maxHp));
        var area2 = $('skills-game-area');
        if (area2) spawnParticle(area2, '+' + partialXp + ' XP', 'xp');
        addXp('fishing', partialXp);
        animatePetAction('pet-bounce');
        fishingCooldown = false;
        return;
      }

      // ── Fish caught (HP = 0) ──
      if (fs.missTimer) { clearTimeout(fs.missTimer); fs.missTimer = null; }
      if (fs.biteTimer) { clearTimeout(fs.biteTimer); fs.biteTimer = null; }

      // Size determination
      var sizeBonus = hasPerk('bigGame', 'fishing') ? 0.2 : 0;
      var sizeRoll = Math.random() + (level / MAX_LEVEL) * 0.3 + sizeBonus;
      var sizeIdx;
      if (sizeRoll < 0.15) sizeIdx = 0;
      else if (sizeRoll < 0.4) sizeIdx = 1;
      else if (sizeRoll < 0.7) sizeIdx = 2;
      else if (sizeRoll < 0.9) sizeIdx = 3;
      else sizeIdx = 4;
      var sizeMult = FISH_SIZE_MULTS[sizeIdx];
      if (hasPerk('netMaster', 'fishing') && sizeMult > 1) sizeMult *= 2;
      var sizeName = FISH_SIZES[sizeIdx];

      // Golden catch (fast combo counts as golden)
      var isGolden = fishingCombo.count >= 5;
      var goldenMult = isGolden ? 3 : 1;

      // Rare catch
      var rareChance = hasPerk('luckyBait', 'fishing') ? 0.15 : 0.08;
      var isRare = Math.random() < rareChance;
      var rareMult = isRare ? 5 : 1;

      var xpGain = Math.floor(res.xp * getXpMult() * sizeMult * goldenMult * rareMult * comboMult);
      addXp('fishing', xpGain);

      // Inventory
      var fishCount = (hasPerk('doubleCatch', 'fishing') && Math.random() < 0.10) ? 2 : 1;
      addItem(res.name, fishCount);

      // Collection log
      log.fishCaught[res.name] = (log.fishCaught[res.name] || 0) + 1;
      log.sizes[sizeName] = (log.sizes[sizeName] || 0) + 1;
      if (isGolden) log.goldenCatches++;
      if (isRare) log.totalRare++;
      if (fishCount > 1) log.doubleCatches++;

      var catchText = 'Caught ' + sizeName + ' ' + res.name + '!';
      if (isGolden) catchText = 'GOLDEN! ' + catchText;
      if (isRare) catchText = 'RARE! ' + catchText;
      addLog(catchText + ' (+' + xpGain + ' XP)');

      var area3 = $('skills-game-area');
      if (area3) {
        var fishPos = FISH_SPRITES[res.name];
        if (fishPos) {
          var sizeScales = [0.6, 0.8, 1, 1.3, 1.6];
          var sc = sizeScales[sizeIdx] || 1;
          var fishDispW = Math.round(32 * sc);
          var fishDispH = Math.round(32 * sc);
          spawnSpriteParticle(area3, fishPos.sheet || 'fish', fishPos.x, fishPos.y, 16, 16, fishDispW, fishDispH);
        }
        var sizeClass = sizeIdx >= 4 ? 'size-huge' : sizeIdx >= 3 ? 'size-large' : '';
        if (sizeClass) spawnParticle(area3, sizeName + '!', sizeClass);
        spawnParticle(area3, '+' + xpGain + ' XP', 'xp');
        // Water splash burst
        spawnFishSplash(spot);
      }

      onAction('fishing');
      animatePetAction('pet-wiggle');

      // Deplete + respawn
      spot.classList.remove('waiting', 'bite', 'reeling');
      var bobberEl = $('fish-bobber-' + idx);
      var lineEl = $('fish-line-' + idx);
      var exclaimEl = $('fish-exclaim-' + idx);
      if (bobberEl) bobberEl.classList.remove('visible', 'bite-anim');
      if (lineEl) lineEl.classList.remove('cast');
      if (exclaimEl) exclaimEl.classList.remove('visible');
      // Remove old HP bar before depletion (avoid duplicates on respawn)
      var oldHpBar = $('fish-hp-bar-' + idx);
      if (oldHpBar && oldHpBar.parentNode) oldHpBar.parentNode.removeChild(oldHpBar);
      spot.classList.add('depleted', 'respawn-ripple');

      fishingCombo.count = 0;
      if (comboEl) comboEl.style.display = 'none';

      // Respawn timer
      var respawnTime = hasPerk('patience', 'fishing') ? 2 : 3;
      var timerEl = document.createElement('div');
      timerEl.className = 'fishing-respawn-timer';
      timerEl.textContent = respawnTime + 's';
      spot.appendChild(timerEl);

      var remaining = respawnTime;
      var spotRef = spot;
      var spotIdx = idx;
      var respawnInterval = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearInterval(respawnInterval);
          var ii = fishSpotRespawnIntervals.indexOf(respawnInterval);
          if (ii !== -1) fishSpotRespawnIntervals.splice(ii, 1);
          spotRef.classList.remove('depleted', 'respawn-ripple');
          if (timerEl.parentNode) timerEl.parentNode.removeChild(timerEl);
          // Restore fish sprite
          var respawnSpr = $('fish-sprite-' + spotIdx);
          if (respawnSpr) respawnSpr.style.opacity = '';
          var curRes = getSelectedFishResource();
          var newMaxHp = FISH_HP[curRes.name] || 1;
          fishSpotState[spotIdx] = { phase: 'idle', hp: newMaxHp, maxHp: newMaxHp, biteTimer: null, missTimer: null };
          // Re-add HP bar if needed
          if (newMaxHp > 1) {
            var hpBar = document.createElement('div');
            hpBar.className = 'fish-hp-bar';
            hpBar.id = 'fish-hp-bar-' + spotIdx;
            var hpFill = document.createElement('div');
            hpFill.className = 'fish-hp-fill';
            hpFill.style.width = '100%';
            hpBar.appendChild(hpFill);
            spotRef.appendChild(hpBar);
          }
        } else {
          timerEl.textContent = remaining + 's';
        }
      }, 1000);
      fishSpotRespawnIntervals.push(respawnInterval);

      tryTriggerFishingEvent();

      fishingCooldown = false;
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
      saveState();
    }
  }

  // ── Fishing Events ──────────────────────────────
  function tryTriggerFishingEvent() {
    if (fishingEventActive) return;
    if (Math.random() > 0.02) return;

    var pool = [];
    var totalWeight = 0;
    for (var i = 0; i < FISHING_EVENTS.length; i++) {
      pool.push(FISHING_EVENTS[i]);
      totalWeight += FISHING_EVENTS[i].weight;
    }
    if (hasPerk('netMaster', 'fishing')) {
      pool.push({ id: 'kraken', name: 'Kraken', weight: 20 });
      totalWeight += 20;
    }

    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    var selected = pool[0];
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight;
      if (roll < cumulative) { selected = pool[j]; break; }
    }

    fishingEventActive = true;
    addLog('EVENT: ' + selected.name + '!');

    if (selected.id === 'treasureChest') triggerTreasureChest();
    else if (selected.id === 'schoolOfFish') triggerSchoolOfFish();
    else if (selected.id === 'sharkAttack') triggerSharkAttack();
    else if (selected.id === 'kraken') triggerKraken();
  }

  function createFishingEventSpot(cssClass, label, timeLimit) {
    var area = $('skills-game-area');
    if (!area) return null;
    var el = document.createElement('div');
    el.className = 'fishing-event-spot ' + cssClass;
    el.innerHTML = '<div class="fishing-event-label">' + label + '</div>';

    var timerBar = document.createElement('div');
    timerBar.className = 'fishing-event-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'fishing-event-timer-fill';
    timerFill.style.width = '100%';
    timerFill.style.transition = 'width ' + (timeLimit / 1000) + 's linear';
    timerBar.appendChild(timerFill);
    el.appendChild(timerBar);

    area.appendChild(el);
    setTimeout(function () { timerFill.style.width = '0%'; }, 50);
    return el;
  }

  function cleanupFishingEvent() {
    fishingEventActive = false;
    if (fishingEventTimer) { clearTimeout(fishingEventTimer); fishingEventTimer = null; }
    var evSpots = document.querySelectorAll('.fishing-event-spot');
    for (var i = 0; i < evSpots.length; i++) {
      if (evSpots[i].parentNode) evSpots[i].parentNode.removeChild(evSpots[i]);
    }
    var fins = document.querySelectorAll('.shark-fin');
    for (var j = 0; j < fins.length; j++) {
      if (fins[j].parentNode) fins[j].parentNode.removeChild(fins[j]);
    }
  }

  function triggerTreasureChest() {
    var el = createFishingEventSpot('treasure-chest', 'Treasure Chest!', 10000);
    if (!el) { cleanupFishingEvent(); return; }

    var chestIcon = document.createElement('div');
    chestIcon.className = 'fishing-event-icon';
    var chestSpr = createSpriteEl('items_sheet', FISHING_EQUIP_SPRITES.shell.x, FISHING_EQUIP_SPRITES.shell.y, 16, 16, 48, 48);
    if (chestSpr) { chestSpr.className = 'skill-sprite'; chestIcon.appendChild(chestSpr); }
    el.appendChild(chestIcon);
    var chestHp = { hp: 3, maxHp: 3 };
    var hpBar = document.createElement('div');
    hpBar.className = 'fish-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'fish-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    var done = false;
    el.addEventListener('click', function () {
      if (done) return;
      chestHp.hp--;
      hpFill.style.width = (chestHp.hp / chestHp.maxHp * 100) + '%';
      el.classList.add('hit');
      setTimeout(function () { el.classList.remove('hit'); }, 200);

      if (chestHp.hp <= 0) {
        done = true;
        var log = getFishingLog();
        log.events.treasureChest++;
        var area = $('skills-game-area');
        var res = getSelectedFishResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 5);
        addXp('fishing', xpGain);
        // Award a random gem
        var gemIdx = Math.floor(Math.random() * GEM_NAMES.length);
        addItem(GEM_NAMES[gemIdx], 1);
        addLog('Treasure Chest! Found gem + 5x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '5x! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupFishingEvent();
        renderSkillList();
        renderRightPanel();
      }
    });

    fishingEventTimer = setTimeout(function () {
      addLog('Treasure Chest sank...');
      cleanupFishingEvent();
    }, 10000);
  }

  function triggerSchoolOfFish() {
    var el = createFishingEventSpot('school-of-fish', 'School of Fish!', 8000);
    if (!el) { cleanupFishingEvent(); return; }

    var schoolIcon = document.createElement('div');
    schoolIcon.className = 'fishing-event-icon school-fish-icons';
    for (var si = 0; si < 3; si++) {
      var af = AMBIENT_FISH[Math.floor(Math.random() * AMBIENT_FISH.length)];
      var afSpr = createSpriteEl('items_sheet', af.x, af.y, 16, 16, 28, 28);
      if (afSpr) { afSpr.className = 'skill-sprite'; afSpr.style.margin = '0 1px'; schoolIcon.appendChild(afSpr); }
    }
    el.appendChild(schoolIcon);
    var schoolHp = { hp: 3, maxHp: 3 };
    var hpBar = document.createElement('div');
    hpBar.className = 'fish-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'fish-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    var done = false;
    el.addEventListener('click', function () {
      if (done) return;
      schoolHp.hp--;
      hpFill.style.width = (schoolHp.hp / schoolHp.maxHp * 100) + '%';
      el.classList.add('hit');
      setTimeout(function () { el.classList.remove('hit'); }, 200);

      if (schoolHp.hp <= 0) {
        done = true;
        var log = getFishingLog();
        log.events.schoolOfFish++;
        var area = $('skills-game-area');
        var res = getSelectedFishResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 3);
        addXp('fishing', xpGain);
        addItem(res.name, 3);
        addLog('School of Fish! +3 ' + res.name + ', 3x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '3 FISH! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupFishingEvent();
        renderSkillList();
        renderRightPanel();
      }
    });

    fishingEventTimer = setTimeout(function () {
      addLog('School of Fish swam away...');
      cleanupFishingEvent();
    }, 8000);
  }

  function triggerSharkAttack() {
    var area = $('skills-game-area');
    if (!area) { cleanupFishingEvent(); return; }

    addLog('SHARK ATTACK! Click the fins!');
    var clicked = 0;
    var total = 3;

    for (var i = 0; i < total; i++) {
      var fin = document.createElement('div');
      fin.className = 'shark-fin';
      fin.style.left = (15 + Math.random() * 60) + '%';
      fin.style.animationDelay = (i * 0.4) + 's';
      var finSpr = createSpriteEl('items_sheet', FISH_SPRITES['Shark'].x, FISH_SPRITES['Shark'].y, 16, 16, 36, 36);
      if (finSpr) { finSpr.className = 'skill-sprite'; fin.appendChild(finSpr); }
      fin.addEventListener('click', (function (el) {
        return function () {
          if (el.classList.contains('clicked')) return;
          el.classList.add('clicked');
          clicked++;
          if (clicked >= total) {
            var log = getFishingLog();
            log.events.sharkAttack++;
            var res = getSelectedFishResource();
            var xpGain = Math.floor(res.xp * getXpMult() * 5);
            addXp('fishing', xpGain);
            addLog('Shark Attack survived! 5x XP! (+' + xpGain + ' XP)');
            var area2 = $('skills-game-area');
            if (area2) spawnParticle(area2, '5x! +' + xpGain + ' XP', 'gem');
            saveState();
            cleanupFishingEvent();
            renderSkillList();
            renderRightPanel();
          }
        };
      })(fin));
      area.appendChild(fin);
    }

    fishingEventTimer = setTimeout(function () {
      addLog('Sharks got away...');
      cleanupFishingEvent();
    }, 6000);
  }

  function triggerKraken() {
    var el = createFishingEventSpot('kraken-event', 'KRAKEN!', 12000);
    if (!el) { cleanupFishingEvent(); return; }

    var krakenIcon = document.createElement('div');
    krakenIcon.className = 'fishing-event-icon';
    var krakenSpr = createSpriteEl('items_sheet', FISHING_EQUIP_SPRITES.octopus.x, FISHING_EQUIP_SPRITES.octopus.y, 16, 16, 48, 48);
    if (krakenSpr) { krakenSpr.className = 'skill-sprite'; krakenIcon.appendChild(krakenSpr); }
    el.appendChild(krakenIcon);
    var krakenHp = { hp: 5, maxHp: 5 };
    var hpBar = document.createElement('div');
    hpBar.className = 'fish-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'fish-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    var done = false;
    el.addEventListener('click', function () {
      if (done) return;
      krakenHp.hp--;
      hpFill.style.width = (krakenHp.hp / krakenHp.maxHp * 100) + '%';
      el.classList.add('hit');
      setTimeout(function () { el.classList.remove('hit'); }, 200);

      if (krakenHp.hp <= 0) {
        done = true;
        var log = getFishingLog();
        log.events.kraken++;
        var area = $('skills-game-area');
        var res = getSelectedFishResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 10);
        addXp('fishing', xpGain);
        addItem(res.name, 5);
        addLog('KRAKEN DEFEATED! +5 ' + res.name + ', 10x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, 'KRAKEN! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupFishingEvent();
        renderSkillList();
        renderRightPanel();
      }
    });

    fishingEventTimer = setTimeout(function () {
      addLog('Kraken escaped to the depths...');
      cleanupFishingEvent();
    }, 12000);
  }

  // ── Fishing Collection Log ────────────────────
  function renderFishingCollectionLog() {
    var content = $('skills-log-content');
    if (!content) return;
    content.innerHTML = '';

    var log = getFishingLog();

    // Fish caught table
    var fishSection = document.createElement('div');
    fishSection.innerHTML = '<h4 class="skills-log-section-title">Fish Caught</h4>';
    var fishTable = document.createElement('table');
    fishTable.className = 'skills-log-table';
    var resources = SKILLS.fishing.resources;
    for (var i = 0; i < resources.length; i++) {
      var count = log.fishCaught[resources[i].name] || 0;
      var tr = document.createElement('tr');
      var nameTd = document.createElement('td');
      var fsp = FISH_SPRITES[resources[i].name];
      if (fsp) {
        var fIcon = createSpriteEl('items_sheet', fsp.x, fsp.y, 16, 16, 16, 16);
        if (fIcon) { fIcon.className = 'skill-sprite'; fIcon.style.verticalAlign = 'middle'; fIcon.style.marginRight = '4px'; nameTd.appendChild(fIcon); }
      }
      nameTd.appendChild(document.createTextNode(resources[i].name));
      var countTd = document.createElement('td');
      countTd.textContent = formatNum(count);
      tr.appendChild(nameTd);
      tr.appendChild(countTd);
      if (count === 0) tr.style.opacity = '0.4';
      fishTable.appendChild(tr);
    }
    fishSection.appendChild(fishTable);
    content.appendChild(fishSection);

    // Stats
    var statsSection = document.createElement('div');
    statsSection.innerHTML = '<h4 class="skills-log-section-title">Stats</h4>';
    var stats = [
      ['Total Clicks', formatNum(log.totalClicks)],
      ['Golden Catches', formatNum(log.goldenCatches)],
      ['Rare Catches', formatNum(log.totalRare)],
      ['Double Catches', formatNum(log.doubleCatches)],
      ['Critical Hits', formatNum(log.criticalHits)],
      ['Crit Rate', log.totalClicks > 0 ? (log.criticalHits / log.totalClicks * 100).toFixed(1) + '%' : '0%']
    ];
    var statsTable = document.createElement('table');
    statsTable.className = 'skills-log-table';
    for (var j = 0; j < stats.length; j++) {
      var tr2 = document.createElement('tr');
      tr2.innerHTML = '<td>' + stats[j][0] + '</td><td>' + stats[j][1] + '</td>';
      statsTable.appendChild(tr2);
    }
    statsSection.appendChild(statsTable);
    content.appendChild(statsSection);

    // Sizes
    var sizeSection = document.createElement('div');
    sizeSection.innerHTML = '<h4 class="skills-log-section-title">Sizes</h4>';
    var sizeTable = document.createElement('table');
    sizeTable.className = 'skills-log-table';
    for (var si = 0; si < FISH_SIZES.length; si++) {
      var sc = log.sizes[FISH_SIZES[si]] || 0;
      var tr3 = document.createElement('tr');
      tr3.innerHTML = '<td>' + FISH_SIZES[si] + '</td><td>' + formatNum(sc) + '</td>';
      if (sc === 0) tr3.style.opacity = '0.4';
      sizeTable.appendChild(tr3);
    }
    sizeSection.appendChild(sizeTable);
    content.appendChild(sizeSection);

    // Events
    var evSection = document.createElement('div');
    evSection.innerHTML = '<h4 class="skills-log-section-title">Events</h4>';
    var evTable = document.createElement('table');
    evTable.className = 'skills-log-table';
    var evNames = [
      ['Treasure Chest', log.events.treasureChest],
      ['School of Fish', log.events.schoolOfFish],
      ['Shark Attack', log.events.sharkAttack],
      ['Kraken', log.events.kraken]
    ];
    for (var k = 0; k < evNames.length; k++) {
      var tr4 = document.createElement('tr');
      tr4.innerHTML = '<td>' + evNames[k][0] + '</td><td>' + evNames[k][1] + '</td>';
      if (evNames[k][1] === 0) tr4.style.opacity = '0.4';
      evTable.appendChild(tr4);
    }
    evSection.appendChild(evTable);
    content.appendChild(evSection);
  }

  function renderSmithingCollectionLog() {
    var content = $('skills-log-content');
    if (!content) return;
    content.innerHTML = '';

    var log = getSmithingLog();

    // Bars Smelted table
    var barSection = document.createElement('div');
    barSection.innerHTML = '<h4 class="skills-log-section-title">Bars Smelted</h4>';
    var barTable = document.createElement('table');
    barTable.className = 'skills-log-table';
    for (var bi = 0; bi < SMELTING_ORDER.length; bi++) {
      var barName = SMELTING_ORDER[bi];
      var bcount = log.barsSmelted[barName] || 0;
      var btr = document.createElement('tr');
      var bnameTd = document.createElement('td');
      var bsp = BAR_DROP_SPRITES[barName];
      if (bsp) {
        var bIcon = createSpriteEl(bsp.sheet || 'ores', bsp.x, bsp.y, 16, 16, 16, 16);
        if (bIcon) { bIcon.className = 'skill-sprite'; bIcon.style.verticalAlign = 'middle'; bIcon.style.marginRight = '4px'; bnameTd.appendChild(bIcon); }
      }
      bnameTd.appendChild(document.createTextNode(barName));
      var bcountTd = document.createElement('td');
      bcountTd.textContent = formatNum(bcount);
      btr.appendChild(bnameTd);
      btr.appendChild(bcountTd);
      if (bcount === 0) btr.style.opacity = '0.4';
      barTable.appendChild(btr);
    }
    barSection.appendChild(barTable);
    content.appendChild(barSection);

    // Items Forged table
    var forgeSection = document.createElement('div');
    forgeSection.innerHTML = '<h4 class="skills-log-section-title">Items Forged</h4>';
    var forgeTable = document.createElement('table');
    forgeTable.className = 'skills-log-table';
    for (var fi = 0; fi < FORGING_RECIPES.length; fi++) {
      var fname = FORGING_RECIPES[fi].name;
      var fcount = log.itemsForged[fname] || 0;
      var ftr = document.createElement('tr');
      var fnameTd = document.createElement('td');
      var fsp = FORGING_RECIPES[fi].sprite;
      if (fsp) {
        var fIcon = createSpriteEl('items_sheet', fsp.x, fsp.y, 16, 16, 16, 16);
        if (fIcon) { fIcon.className = 'skill-sprite'; fIcon.style.verticalAlign = 'middle'; fIcon.style.marginRight = '4px'; fnameTd.appendChild(fIcon); }
      }
      fnameTd.appendChild(document.createTextNode(fname));
      var fcountTd = document.createElement('td');
      fcountTd.textContent = formatNum(fcount);
      ftr.appendChild(fnameTd);
      ftr.appendChild(fcountTd);
      if (fcount === 0) ftr.style.opacity = '0.4';
      forgeTable.appendChild(ftr);
    }
    forgeSection.appendChild(forgeTable);
    content.appendChild(forgeSection);

    // Stats
    var statsSection = document.createElement('div');
    statsSection.innerHTML = '<h4 class="skills-log-section-title">Stats</h4>';
    var stats = [
      ['Total Clicks', formatNum(log.totalClicks)],
      ['Total Smelts', formatNum(log.totalSmelts)],
      ['Total Forges', formatNum(log.totalForges)],
      ['Perfect Smelts', formatNum(log.perfectSmelts)],
      ['Masterworks', formatNum(log.masterworks)],
      ['Double Bars', formatNum(log.doubleBars)],
      ['Free Smelts', formatNum(log.noOreProcs)]
    ];
    var statsTable = document.createElement('table');
    statsTable.className = 'skills-log-table';
    for (var si = 0; si < stats.length; si++) {
      var str = document.createElement('tr');
      str.innerHTML = '<td>' + stats[si][0] + '</td><td>' + stats[si][1] + '</td>';
      statsTable.appendChild(str);
    }
    statsSection.appendChild(statsTable);
    content.appendChild(statsSection);

    // Events
    var evSection = document.createElement('div');
    evSection.innerHTML = '<h4 class="skills-log-section-title">Events</h4>';
    var evTable = document.createElement('table');
    evTable.className = 'skills-log-table';
    var evNames = [
      ['Blessed Forge', log.events.blessedForge],
      ['Ore Surge', log.events.oreSurge],
      ["Master's Touch", log.events.masterTouch],
      ['Inferno', log.events.inferno]
    ];
    for (var ek = 0; ek < evNames.length; ek++) {
      var etr = document.createElement('tr');
      etr.innerHTML = '<td>' + evNames[ek][0] + '</td><td>' + evNames[ek][1] + '</td>';
      if (evNames[ek][1] === 0) etr.style.opacity = '0.4';
      evTable.appendChild(etr);
    }
    evSection.appendChild(evTable);
    content.appendChild(evSection);
  }

  // ══════════════════════════════════════════════
  // ── WOODCUTTING MINI-GAME (A3 enhanced) ────────
  // ══════════════════════════════════════════════
  function renderWoodcutting() {
    var area = $('skills-game-area');
    if (!area) return;

    // Lazy-load trees.png as canvas-drawable Image for sprite BG
    if (!wcTreesImg) {
      var img = new Image();
      img.src = SKILL_SPRITE_PATHS['trees'];
      img.onload = function () {
        wcTreesImg = img;
        wcBgDataUrl = null; // force regen with sprite image
        renderWoodcutting();
      };
    }
    // Lazy-load forest-extras.png for logs/stumps/vines
    if (!wcExtrasImg) {
      var eImg = new Image();
      eImg.src = SKILL_SPRITE_PATHS['forest_extras'];
      eImg.onload = function () {
        wcExtrasImg = eImg;
        wcBgDataUrl = null;
        renderWoodcutting();
      };
    }

    // Apply forest pixel art background (cached after first generation)
    if (!wcBgDataUrl) wcBgDataUrl = generateForestClearingBg(wcTreesImg, wcExtrasImg);
    area.style.backgroundImage = 'url(' + wcBgDataUrl + ')';
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center';

    area.innerHTML = '';
    wcCombo = { count: 0, lastClickTime: 0 };

    // Stop previous animation if re-rendering
    stopWcAnim();

    // Animation overlay canvas
    var animCanvas = document.createElement('canvas');
    animCanvas.width = WC_W;
    animCanvas.height = WC_H;
    animCanvas.className = 'wc-anim-overlay';
    area.appendChild(animCanvas);
    wcAnimCanvas = animCanvas;
    wcAnimCtx = animCanvas.getContext('2d');
    startWcAnim();

    // Tree selector dropdown (mirrors mining ore selector)
    var level = state.skills.woodcutting.level;
    var resources = SKILLS.woodcutting.resources;
    var selectWrap = document.createElement('div');
    selectWrap.className = 'wc-tree-select-wrap';
    var sel = document.createElement('select');
    sel.className = 'skill-recipe-select';
    sel.id = 'wc-tree-select';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    sel.value = selectedWcTree !== null ? selectedWcTree : highestIdx;
    if (selectedWcTree === null) selectedWcTree = highestIdx;
    sel.addEventListener('change', function () {
      selectedWcTree = parseInt(sel.value);
      renderWoodcutting();
      updateGameHeader();
    });
    selectWrap.appendChild(sel);
    area.appendChild(selectWrap);

    var res = getSelectedWcResource();
    var maxHp = TREE_HP[res.name] || 1;
    treeState = [];

    var div = document.createElement('div');
    div.className = 'wc-trees';
    for (var i = 0; i < 3; i++) {
      treeState.push({ hp: maxHp, maxHp: maxHp });

      var treeWrap = document.createElement('div');
      treeWrap.className = 'wc-tree-wrap';

      var tree = document.createElement('div');
      tree.className = 'wc-tree';
      tree.setAttribute('data-idx', i);

      // Tree sprite
      var treePos = TREE_SPRITES[res.name] || TREE_SPRITES['Pine'];
      var treeSprite = createSpriteEl('trees', treePos.x, treePos.y, treePos.w, treePos.h, treePos.w * 3, treePos.h * 3);
      if (treeSprite) {
        treeSprite.className = 'skill-sprite wc-tree-sprite';
        tree.appendChild(treeSprite);
      } else {
        tree.textContent = '\uD83C\uDF33';
      }

      // HP bar (hidden when maxHp === 1)
      if (maxHp > 1) {
        var hpBar = document.createElement('div');
        hpBar.className = 'tree-hp-bar';
        hpBar.id = 'tree-hp-bar-' + i;
        var hpFill = document.createElement('div');
        hpFill.className = 'tree-hp-fill';
        hpFill.style.width = '100%';
        hpBar.appendChild(hpFill);
        tree.appendChild(hpBar);
      }

      tree.addEventListener('click', onChopClick);
      treeWrap.appendChild(tree);

      // Tree name label
      var label = document.createElement('div');
      label.className = 'wc-tree-label';
      label.textContent = res.name;
      treeWrap.appendChild(label);

      div.appendChild(treeWrap);
    }
    area.appendChild(div);

    // Combo counter
    var comboEl = document.createElement('div');
    comboEl.className = 'wc-combo';
    comboEl.id = 'wc-combo';
    comboEl.style.display = 'none';
    area.appendChild(comboEl);

    // C1: Render pet
    renderPetInGameArea();
  }

  function updateWcTreeDropdown() {
    var sel = $('wc-tree-select');
    if (!sel) return;
    var level = state.skills.woodcutting.level;
    var resources = SKILLS.woodcutting.resources;
    var oldVal = parseInt(sel.value);
    var oldHighest = sel.options.length > 0 ? parseInt(sel.options[sel.options.length - 1].value) : 0;
    sel.innerHTML = '';
    var highestIdx = 0;
    for (var si = 0; si < resources.length; si++) {
      if (resources[si].level > level) continue;
      highestIdx = si;
      var opt = document.createElement('option');
      opt.value = si;
      opt.textContent = resources[si].name + ' (Lv ' + resources[si].level + ')';
      sel.appendChild(opt);
    }
    // Auto-switch only when a NEW tree is unlocked
    if (highestIdx > oldHighest) {
      sel.value = highestIdx;
      selectedWcTree = highestIdx;
      renderWoodcutting();
      updateGameHeader();
    } else {
      sel.value = oldVal;
    }
  }

  function onChopClick(e) {
    if (wcState.cooldown) return;
    if (wcEventActive) return;
    var tree = e.currentTarget;
    if (tree.classList.contains('depleted') || tree.classList.contains('falling')) return;

    var idx = parseInt(tree.getAttribute('data-idx'));
    var res = getSelectedWcResource();
    var now = Date.now();
    var ts = treeState[idx];
    var log = getWcLog();
    log.totalClicks++;

    // Combo tracking (400-800ms window, mirrors mining)
    var timeSinceLast = now - wcCombo.lastClickTime;
    if (timeSinceLast >= 400 && timeSinceLast <= 800) {
      wcCombo.count = Math.min(wcCombo.count + 1, 10);
    } else if (timeSinceLast > 800) {
      wcCombo.count = 0;
    }
    wcCombo.lastClickTime = now;

    var comboMult = 1 + (wcCombo.count * 0.1);
    var comboEl = $('wc-combo');
    if (comboEl) {
      if (wcCombo.count > 0) {
        comboEl.textContent = 'Combo x' + wcCombo.count + '!';
        comboEl.style.display = '';
      } else {
        comboEl.style.display = 'none';
      }
    }

    // Critical hit check: min(1% + level*0.2%, 20%)
    var level = state.skills.woodcutting.level;
    var critChance = Math.min(0.01 + level * 0.002, 0.20);
    var isCrit = Math.random() < critChance;

    wcState.cooldown = true;

    // Determine damage
    var chopDamage = 1;
    if (hasPerk('powerChop', 'woodcutting')) chopDamage = 2;

    if (isCrit) {
      ts.hp = 0;
      tree.classList.add('cracking');
      var area = $('skills-game-area');
      if (area) spawnParticle(area, 'CRIT!', 'crit');
      log.criticalHits++;
      addLog('Critical hit!');
    } else {
      ts.hp = Math.max(ts.hp - chopDamage, 0);
      tree.classList.add(ts.hp > 0 ? 'hit' : 'cracking');
    }
    updateTreeHpBar(idx);

    // Wood chip particles
    var chipArea = $('skills-game-area');
    if (chipArea && tree) {
      var chipRect = tree.getBoundingClientRect();
      var chipAreaRect = chipArea.getBoundingClientRect();
      var chipCx = chipRect.left - chipAreaRect.left + chipRect.width / 2;
      var chipCy = chipRect.top - chipAreaRect.top + chipRect.height * 0.6;
      var chipColors = ['#6a4a2a', '#8b6914', '#c8a870', '#a0522d'];
      for (var ci = 0; ci < 4; ci++) {
        var chip = document.createElement('div');
        chip.className = 'wood-chip';
        chip.style.left = chipCx + 'px';
        chip.style.top = chipCy + 'px';
        chip.style.backgroundColor = chipColors[ci];
        var dx = (Math.random() - 0.5) * 50;
        var dy = -10 - Math.random() * 30;
        chip.style.setProperty('--chip-dx', dx + 'px');
        chip.style.setProperty('--chip-dy', dy + 'px');
        chip.style.setProperty('--chip-rot', (Math.random() * 360) + 'deg');
        chipArea.appendChild(chip);
        (function (el) {
          setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
        })(chip);
      }
    }

    setTimeout(function () {
      tree.classList.remove('shaking', 'hit', 'cracking');

      var area = $('skills-game-area');
      var xpMult = getXpMult() * comboMult;

      if (ts.hp > 0) {
        // Partial hit — award fraction of XP
        var partialXp = Math.max(1, Math.floor(res.xp * xpMult / ts.maxHp));
        if (area) spawnParticle(area, '+' + partialXp + ' XP', 'xp');
        addXp('woodcutting', partialXp);
        animatePetAction('pet-bounce');
        wcState.cooldown = false;
        renderSkillList();
        renderRightPanel();
        return;
      }

      // Tree felled — full rewards
      log.treesChopped[res.name] = (log.treesChopped[res.name] || 0) + 1;
      var xpGain = Math.floor(res.xp * xpMult);

      // A3: 10% bird nest drop (Perk: Nest Finder → 20%)
      var nestChance = hasPerk('nestFinder', 'woodcutting') ? 0.20 : 0.10;
      var isNest = Math.random() < nestChance;
      if (isNest) {
        log.birdNests++;
        xpGain *= 10;
        addLog('Found a bird nest! 10x XP bonus!');
        if (area) spawnParticle(area, '\uD83E\uDD5A Nest!', 'nest');
      }

      // Perk: Ancient Roots — 5% chance for 10x XP rare log
      if (!isNest && hasPerk('ancientRoots', 'woodcutting') && Math.random() < 0.05) {
        xpGain *= 10;
        addLog('Ancient roots! 10x XP bonus!');
        if (area) spawnParticle(area, 'Ancient!', 'gem');
      }

      // Perk: Double Log = 10% chance for 2x
      var logName = LOG_NAMES[res.name] || (res.name + ' Log');
      var isDoubleLog = hasPerk('doubleLog', 'woodcutting') && Math.random() < 0.10;
      var logCount = isDoubleLog ? 2 : 1;
      if (isDoubleLog) {
        xpGain *= 2;
        log.doubleChops++;
        if (area) spawnParticle(area, '2x!', 'xp');
      }

      addXp('woodcutting', xpGain);
      addItem(logName, logCount);
      addLog('Chopped ' + res.name + ' (+' + xpGain + ' XP, +' + logCount + ' ' + logName + ')');

      if (area) {
        var woodDrop = WOOD_DROP_SPRITES[res.name] || WOOD_DROP_SPRITES['Pine'];
        var woodEl = createSpriteEl(woodDrop.sheet || 'items_sheet', woodDrop.x, woodDrop.y, 16, 16, 40, 40);
        if (woodEl) {
          woodEl.className = 'ore-particle sprite-particle';
          woodEl.style.left = (Math.random() * 20 + 40) + '%';
          woodEl.style.top = '35%';
          area.appendChild(woodEl);
          setTimeout(function () { if (woodEl.parentNode) woodEl.parentNode.removeChild(woodEl); }, 1200);
        }
        var xpGainCopy = xpGain;
        setTimeout(function () {
          var ga = $('skills-game-area');
          if (ga) {
            var xpEl = document.createElement('div');
            xpEl.className = 'ore-particle xp';
            xpEl.textContent = '+' + xpGainCopy + ' XP';
            xpEl.style.left = (Math.random() * 20 + 40) + '%';
            xpEl.style.top = '55%';
            ga.appendChild(xpEl);
            setTimeout(function () { if (xpEl.parentNode) xpEl.parentNode.removeChild(xpEl); }, 1200);
          }
        }, 200);
      }

      onAction('woodcutting');
      animatePetAction('pet-cheer');

      // Falling animation → stump + depleted + respawn
      tree.classList.add('falling');
      var treeRef = tree;
      var treeIdx = idx;
      setTimeout(function () {
        treeRef.innerHTML = '';
        treeRef.classList.remove('falling');
        treeRef.classList.add('stumped');
        var stumpEl = createSpriteEl('trees', STUMP_SPRITE.x, STUMP_SPRITE.y, STUMP_SPRITE.w, STUMP_SPRITE.h, STUMP_SPRITE.w * 3, STUMP_SPRITE.h * 3);
        if (stumpEl) {
          stumpEl.className = 'skill-sprite wc-tree-sprite';
          treeRef.appendChild(stumpEl);
        }
        treeRef.classList.add('depleted');

        // Respawn timer
        var respawnTime = 3;
        var timerEl = document.createElement('div');
        timerEl.className = 'wc-respawn-timer';
        timerEl.textContent = respawnTime + 's';
        treeRef.appendChild(timerEl);

        var remaining = respawnTime;
        var respawnInterval = setInterval(function () {
          remaining--;
          if (remaining <= 0) {
            clearInterval(respawnInterval);
            var ii = treeRespawnIntervals.indexOf(respawnInterval);
            if (ii !== -1) treeRespawnIntervals.splice(ii, 1);
            treeRef.classList.remove('depleted', 'stumped');
            if (timerEl.parentNode) timerEl.parentNode.removeChild(timerEl);
            // Re-render tree sprite with full HP
            treeRef.innerHTML = '';
            var curRes = getSelectedWcResource();
            var tp = TREE_SPRITES[curRes.name] || TREE_SPRITES['Pine'];
            var newSprite = createSpriteEl('trees', tp.x, tp.y, tp.w, tp.h, tp.w * 3, tp.h * 3);
            if (newSprite) {
              newSprite.className = 'skill-sprite wc-tree-sprite';
              treeRef.appendChild(newSprite);
            }
            var maxHp = TREE_HP[curRes.name] || 1;
            treeState[treeIdx] = { hp: maxHp, maxHp: maxHp };
            if (maxHp > 1) {
              var hpBar = document.createElement('div');
              hpBar.className = 'tree-hp-bar';
              hpBar.id = 'tree-hp-bar-' + treeIdx;
              var hpFill = document.createElement('div');
              hpFill.className = 'tree-hp-fill';
              hpFill.style.width = '100%';
              hpBar.appendChild(hpFill);
              treeRef.appendChild(hpBar);
            }
          } else {
            timerEl.textContent = remaining + 's';
          }
        }, 1000);
        treeRespawnIntervals.push(respawnInterval);
      }, 600);

      tryTriggerWcEvent();

      wcState.cooldown = false;
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
    }, 300);
  }

  // ══════════════════════════════════════════════
  // ── Woodcutting Events (random special encounters) ──
  // ══════════════════════════════════════════════
  function tryTriggerWcEvent() {
    if (wcEventActive) return;
    if (Math.random() > 0.02) return; // 2% chance per depletion

    var pool = [];
    var totalWeight = 0;
    for (var i = 0; i < WC_EVENTS.length; i++) {
      pool.push(WC_EVENTS[i]);
      totalWeight += WC_EVENTS[i].weight;
    }
    if (hasPerk('ancientRoots', 'woodcutting')) {
      pool.push({ id: 'fairyRing', name: 'Fairy Ring', weight: 20 });
      totalWeight += 20;
    }

    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    var selected = pool[0];
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight;
      if (roll < cumulative) { selected = pool[j]; break; }
    }

    wcEventActive = true;
    addLog('EVENT: ' + selected.name + '!');

    if (selected.id === 'goldenTree') triggerGoldenTree();
    else if (selected.id === 'storm') triggerStorm();
    else if (selected.id === 'ancientGrove') triggerAncientGrove();
    else if (selected.id === 'fairyRing') triggerFairyRing();
  }

  function createEventTree(cssClass, label, timeLimit) {
    var area = $('skills-game-area');
    if (!area) return null;
    var tree = document.createElement('div');
    tree.className = 'wc-event-tree ' + cssClass;
    tree.innerHTML = '<div class="wc-event-label">' + label + '</div>';

    // Use Elder tree sprite for events (scaled up)
    var treePos = TREE_SPRITES['Elder'];
    var sprite = createSpriteEl('trees', treePos.x, treePos.y, treePos.w, treePos.h, treePos.w * 3, treePos.h * 3);
    if (sprite) {
      sprite.className = 'skill-sprite wc-event-sprite';
      tree.appendChild(sprite);
    }

    // Timer bar
    var timerBar = document.createElement('div');
    timerBar.className = 'wc-event-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'wc-event-timer-fill';
    timerFill.style.width = '100%';
    timerFill.style.transition = 'width ' + (timeLimit / 1000) + 's linear';
    timerBar.appendChild(timerFill);
    tree.appendChild(timerBar);

    area.appendChild(tree);
    setTimeout(function () { timerFill.style.width = '0%'; }, 50);

    return tree;
  }

  function cleanupWcEvent() {
    wcEventActive = false;
    if (wcEventTimer) { clearTimeout(wcEventTimer); wcEventTimer = null; }
    var evTrees = document.querySelectorAll('.wc-event-tree');
    for (var i = 0; i < evTrees.length; i++) {
      if (evTrees[i].parentNode) evTrees[i].parentNode.removeChild(evTrees[i]);
    }
    var branches = document.querySelectorAll('.storm-branch');
    for (var j = 0; j < branches.length; j++) {
      if (branches[j].parentNode) branches[j].parentNode.removeChild(branches[j]);
    }
    var area = $('skills-game-area');
    if (area) area.classList.remove('storm-shake');
  }

  function triggerGoldenTree() {
    var tree = createEventTree('golden-tree', 'Golden Tree!', 10000);
    if (!tree) { cleanupWcEvent(); return; }

    var treeHp = { hp: 3, maxHp: 3 };
    var hpBar = document.createElement('div');
    hpBar.className = 'tree-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'tree-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    tree.appendChild(hpBar);

    var goldenDone = false;
    tree.addEventListener('click', function () {
      if (goldenDone) return;
      treeHp.hp--;
      hpFill.style.width = (treeHp.hp / treeHp.maxHp * 100) + '%';
      tree.classList.add('hit');
      setTimeout(function () { tree.classList.remove('hit'); }, 200);

      if (treeHp.hp <= 0) {
        goldenDone = true;
        var log = getWcLog();
        log.events.goldenTree++;
        log.birdNests++;
        var area = $('skills-game-area');
        var res = getSelectedWcResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 5);
        addXp('woodcutting', xpGain);
        var logName = LOG_NAMES[res.name] || (res.name + ' Log');
        addItem(logName, 1);
        addLog('Golden Tree! Guaranteed nest + 5x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '5x! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupWcEvent();
        renderSkillList();
        renderRightPanel();
      }
    });

    wcEventTimer = setTimeout(function () {
      addLog('Golden Tree vanished...');
      cleanupWcEvent();
    }, 10000);
  }

  function triggerStorm() {
    var area = $('skills-game-area');
    if (!area) { cleanupWcEvent(); return; }

    area.classList.add('storm-shake');
    addLog('STORM! Click the falling branches!');

    var clicked = 0;
    var total = 3;

    for (var i = 0; i < total; i++) {
      var branch = document.createElement('div');
      branch.className = 'storm-branch';
      branch.style.left = (15 + Math.random() * 60) + '%';
      branch.style.animationDelay = (i * 0.3) + 's';
      branch.textContent = '\uD83E\uDEB5';
      branch.addEventListener('click', (function (el) {
        return function () {
          if (el.classList.contains('clicked')) return;
          el.classList.add('clicked');
          clicked++;
          if (clicked >= total) {
            var log = getWcLog();
            log.events.storm++;
            var res = getSelectedWcResource();
            var xpGain = Math.floor(res.xp * getXpMult() * 5);
            addXp('woodcutting', xpGain);
            var logName = LOG_NAMES[res.name] || (res.name + ' Log');
            addItem(logName, 3);
            addLog('Storm survived! +3 ' + logName + ', 5x XP! (+' + xpGain + ' XP)');
            if (area) spawnParticle(area, '5x! +' + xpGain + ' XP', 'xp');
            saveState();
            cleanupWcEvent();
            renderSkillList();
            renderRightPanel();
          }
        };
      })(branch));
      area.appendChild(branch);
    }

    wcEventTimer = setTimeout(function () {
      if (clicked < total) {
        wcCombo.count = 0;
        var comboEl = $('wc-combo');
        if (comboEl) comboEl.style.display = 'none';
        addLog('Storm! Branches crushed you. Combo lost.');
        if (area) spawnParticle(area, 'Combo Lost!', 'crit');
      }
      cleanupWcEvent();
    }, 5000);
  }

  function triggerAncientGrove() {
    var tree = createEventTree('ancient-grove', 'Ancient Grove!', 15000);
    if (!tree) { cleanupWcEvent(); return; }

    var groveHp = { hp: 5, maxHp: 5 };
    var hpBar = document.createElement('div');
    hpBar.className = 'tree-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'tree-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    tree.appendChild(hpBar);

    var groveDone = false;
    tree.addEventListener('click', function () {
      if (groveDone) return;
      groveHp.hp--;
      hpFill.style.width = (groveHp.hp / groveHp.maxHp * 100) + '%';
      tree.classList.add('hit');
      setTimeout(function () { tree.classList.remove('hit'); }, 200);

      if (groveHp.hp <= 0) {
        groveDone = true;
        var log = getWcLog();
        log.events.ancientGrove++;
        log.birdNests++;
        var area = $('skills-game-area');
        var res = getSelectedWcResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 10);
        addXp('woodcutting', xpGain);
        var logName = LOG_NAMES[res.name] || (res.name + ' Log');
        addItem(logName, 3);
        addLog('Ancient Grove! +3 logs + nest + 10x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '10x! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupWcEvent();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }
    });

    wcEventTimer = setTimeout(function () {
      addLog('Ancient Grove withered away...');
      cleanupWcEvent();
    }, 15000);
  }

  function triggerFairyRing() {
    var tree = createEventTree('fairy-ring', 'Fairy Ring!', 12000);
    if (!tree) { cleanupWcEvent(); return; }

    var ringHp = { hp: 3, maxHp: 3 };
    var hpBar = document.createElement('div');
    hpBar.className = 'tree-hp-bar';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '2px';
    hpBar.style.left = '4px';
    hpBar.style.right = '4px';
    var hpFill = document.createElement('div');
    hpFill.className = 'tree-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    tree.appendChild(hpBar);

    var ringDone = false;
    tree.addEventListener('click', function () {
      if (ringDone) return;
      ringHp.hp--;
      hpFill.style.width = (ringHp.hp / ringHp.maxHp * 100) + '%';
      tree.classList.add('hit');
      setTimeout(function () { tree.classList.remove('hit'); }, 200);

      if (ringHp.hp <= 0) {
        ringDone = true;
        var log = getWcLog();
        log.events.fairyRing++;
        var area = $('skills-game-area');
        var res = getSelectedWcResource();
        var xpGain = Math.floor(res.xp * getXpMult() * 5);
        addXp('woodcutting', xpGain);
        var logName = LOG_NAMES[res.name] || (res.name + ' Log');
        addItem(logName, 3);
        addLog('Fairy Ring! +3 rare logs + 5x XP! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '5x! +' + xpGain + ' XP', 'gem');
        saveState();
        cleanupWcEvent();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }
    });

    wcEventTimer = setTimeout(function () {
      addLog('Fairy Ring faded away...');
      cleanupWcEvent();
    }, 12000);
  }

  // ══════════════════════════════════════════════
  // ══════════════════════════════════════════════
  // ── SMITHING FORGE ANIMATION OVERLAY ─────────
  // ══════════════════════════════════════════════

  function startSmithingAnim() {
    if (smithingAnimFrameId) return;
    smithingAnimFrame = 0;
    smithingAnimLastTs = 0;
    smithingEmbers = [];
    smithingSmokeWisps = [];
    // Init smoke wisps (4 persistent wisps)
    for (var i = 0; i < 4; i++) {
      smithingSmokeWisps.push({
        x: SMITHING_FURNACE_X + 30 + Math.random() * 20,
        y: SMITHING_FURNACE_Y - 20 - Math.random() * 40,
        r: 8 + Math.random() * 12,
        alpha: 0.02 + Math.random() * 0.03,
        drift: (Math.random() - 0.5) * 0.3,
        speed: 8 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2
      });
    }
    smithingAnimLoop(0);
  }

  function stopSmithingAnim() {
    if (smithingAnimFrameId) {
      cancelAnimationFrame(smithingAnimFrameId);
      smithingAnimFrameId = null;
    }
    smithingAnimCanvas = null;
    smithingAnimCtx = null;
    smithingEmbers = [];
    smithingSmokeWisps = [];
  }

  function smithingAnimLoop(ts) {
    if (!smithingAnimCtx || !smithingAnimCanvas) { smithingAnimFrameId = null; return; }
    smithingAnimFrameId = requestAnimationFrame(smithingAnimLoop);
    var dt = smithingAnimLastTs ? Math.min((ts - smithingAnimLastTs) / 1000, 0.1) : 0.016;
    smithingAnimLastTs = ts;
    smithingAnimFrame++;
    var ctx = smithingAnimCtx;
    ctx.clearRect(0, 0, SMITHING_W, SMITHING_H);

    // ── Fire glow pulse ──
    var glowPhase = Math.sin(smithingAnimFrame * 0.06);
    var glowAlpha = 0.08 + glowPhase * 0.04;
    var glowR = 80 + glowPhase * 15;
    var grad = ctx.createRadialGradient(
      SMITHING_FURNACE_X + 35, SMITHING_FURNACE_Y + 80, 5,
      SMITHING_FURNACE_X + 35, SMITHING_FURNACE_Y + 80, glowR
    );
    grad.addColorStop(0, 'rgba(255,140,30,' + (glowAlpha + 0.06) + ')');
    grad.addColorStop(0.5, 'rgba(255,80,20,' + (glowAlpha * 0.4) + ')');
    grad.addColorStop(1, 'rgba(255,40,10,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(SMITHING_FURNACE_X - 60, SMITHING_FURNACE_Y, 190, 180);

    // ── Embers (rising from furnace mouth) ──
    if (smithingAnimFrame % 8 === 0) {
      smithingEmbers.push({
        x: SMITHING_FURNACE_X + 15 + Math.random() * 40,
        y: SMITHING_FURNACE_Y + 60 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 10,
        vy: -(20 + Math.random() * 25),
        life: 1.0
      });
      if (smithingEmbers.length > 40) smithingEmbers.shift();
    }
    for (var ei = smithingEmbers.length - 1; ei >= 0; ei--) {
      var e = smithingEmbers[ei];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 3 * dt;
      e.life -= 1.0 * dt;
      if (e.life <= 0) { smithingEmbers.splice(ei, 1); continue; }
      ctx.globalAlpha = e.life * 0.8;
      ctx.fillStyle = e.life > 0.6 ? '#ffa040' : e.life > 0.3 ? '#ff6020' : '#8b2010';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    // ── Smoke wisps ──
    for (var si = 0; si < smithingSmokeWisps.length; si++) {
      var w = smithingSmokeWisps[si];
      w.y -= w.speed * dt;
      w.x += Math.sin(smithingAnimFrame * 0.03 + w.phase) * w.drift;
      w.r += 1.5 * dt;
      w.alpha -= 0.008 * dt;
      if (w.y < -20 || w.alpha <= 0) {
        w.x = SMITHING_FURNACE_X + 30 + Math.random() * 20;
        w.y = SMITHING_FURNACE_Y - 10;
        w.r = 8 + Math.random() * 12;
        w.alpha = 0.02 + Math.random() * 0.03;
        w.drift = (Math.random() - 0.5) * 0.3;
        w.speed = 8 + Math.random() * 6;
      }
      ctx.globalAlpha = Math.max(0, w.alpha);
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.ellipse(Math.round(w.x), Math.round(w.y), Math.round(w.r), Math.round(w.r * 0.6), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Heat shimmer (wavy lines above furnace) ──
    ctx.globalAlpha = 0.03;
    for (var hi = 0; hi < 6; hi++) {
      var hy = SMITHING_FURNACE_Y - 20 - hi * 8;
      var hx = SMITHING_FURNACE_X + Math.sin(smithingAnimFrame * 0.04 + hi * 1.5) * 8;
      ctx.fillStyle = '#ffaa44';
      ctx.fillRect(hx, hy, 60, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── SMITHING MINI-GAME (Phase 6C: Smelting + Forging) ──
  // ══════════════════════════════════════════════
  function renderSmithing() {
    var area = $('skills-game-area');
    if (!area) return;

    // Apply forge pixel art background (cached)
    if (!smithingBgDataUrl) smithingBgDataUrl = generateForgeBg();
    area.style.backgroundImage = 'url(' + smithingBgDataUrl + ')';
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center';

    area.innerHTML = '';

    // Stop previous animation if re-rendering
    stopSmithingAnim();

    // Animation overlay canvas
    var animCanvas = document.createElement('canvas');
    animCanvas.width = SMITHING_W;
    animCanvas.height = SMITHING_H;
    animCanvas.className = 'mining-anim-overlay';
    area.appendChild(animCanvas);
    smithingAnimCanvas = animCanvas;
    smithingAnimCtx = animCanvas.getContext('2d');
    startSmithingAnim();

    // Mode toggle tabs
    var tabs = document.createElement('div');
    tabs.className = 'smithing-tabs';
    var smeltTab = document.createElement('button');
    smeltTab.className = 'smithing-tab' + (smithingState.mode === 'smelting' ? ' active' : '');
    smeltTab.textContent = 'Smelting';
    smeltTab.addEventListener('click', function () {
      if (smithingState.mode === 'smelting') return;
      if (smithingState.cursorTimer) { clearInterval(smithingState.cursorTimer); smithingState.cursorTimer = null; }
      if (smithingState.smeltTimer) { clearInterval(smithingState.smeltTimer); smithingState.smeltTimer = null; }
      if (smithingState.cooldownTimer) { clearTimeout(smithingState.cooldownTimer); smithingState.cooldownTimer = null; }
      smithingState.mode = 'smelting';
      smithingState.phase = 'idle';
      smithingState.hits = 0;
      smithingState.bonusHits = 0;
      smithingCombo = { count: 0, lastClickTime: 0 };
      cleanupSmithingEvent();
      renderSmithing();
    });
    var forgeTab = document.createElement('button');
    forgeTab.className = 'smithing-tab' + (smithingState.mode === 'forging' ? ' active' : '');
    forgeTab.textContent = 'Forging';
    forgeTab.addEventListener('click', function () {
      if (smithingState.mode === 'forging') return;
      if (smithingState.cursorTimer) { clearInterval(smithingState.cursorTimer); smithingState.cursorTimer = null; }
      if (smithingState.smeltTimer) { clearInterval(smithingState.smeltTimer); smithingState.smeltTimer = null; }
      if (smithingState.cooldownTimer) { clearTimeout(smithingState.cooldownTimer); smithingState.cooldownTimer = null; }
      smithingState.mode = 'forging';
      smithingState.phase = 'idle';
      smithingState.hits = 0;
      smithingState.bonusHits = 0;
      smithingCombo = { count: 0, lastClickTime: 0 };
      cleanupSmithingEvent();
      renderSmithing();
    });
    tabs.appendChild(smeltTab);
    tabs.appendChild(forgeTab);
    area.appendChild(tabs);

    if (smithingState.mode === 'smelting') {
      renderSmeltingGame(area);
    } else {
      renderForgingGame(area);
    }

    // Combo counter — positioned absolutely inside furnace/anvil container
    var comboEl = document.createElement('div');
    comboEl.className = 'smithing-combo';
    comboEl.id = 'smithing-combo';
    comboEl.style.display = 'none';
    var furnaceOrAnvil = $('smelt-furnace') || $('forge-anvil');
    if (furnaceOrAnvil) {
      furnaceOrAnvil.appendChild(comboEl);
    } else {
      area.appendChild(comboEl);
    }

    // C1: Render pet
    renderPetInGameArea();
  }

  // ── SMELTING: Temperature gauge mini-game ─────
  function renderSmeltingGame(area) {
    var div = document.createElement('div');
    div.className = 'smithing-area smelting-area';
    var level = state.skills.smithing.level;

    // Build recipe dropdown (filtered by level + available ores)
    var options = '';
    for (var i = 0; i < SMELTING_ORDER.length; i++) {
      var barName = SMELTING_ORDER[i];
      var recipe = SMELTING_RECIPES[barName];
      if (recipe.level > level) continue;
      var available = canSmelt(barName);
      options += '<option value="' + i + '"' + (available ? '' : ' class="smithing-unavailable"') + '>' +
        barName + ' (Lv ' + recipe.level + ')' + (available ? '' : ' [need ores]') + '</option>';
    }

    div.innerHTML =
      '<select class="smithing-recipe-select" id="smelt-recipe">' + options + '</select>' +
      '<div class="smithing-mat-reqs" id="smelt-mats"></div>' +
      '<div class="smithing-furnace" id="smelt-furnace"></div>' +
      '<div class="smelting-gauge-wrap">' +
        '<div class="smelting-gauge" id="smelting-gauge">' +
          '<div class="smelting-gauge-fill" id="smelting-gauge-fill"></div>' +
          '<div class="smelting-gauge-zone" id="smelting-gauge-zone"></div>' +
        '</div>' +
      '</div>' +
      '<div class="smithing-progress" id="smelt-progress">Hold button to heat, release in the green zone</div>' +
      '<button class="smelting-heat-btn" id="smelt-heat-btn">Hold to Heat</button>' +
      '<div class="smithing-status" id="smelt-status"></div>';
    area.appendChild(div);

    // Set to highest available recipe
    var recipeEl = $('smelt-recipe');
    if (recipeEl) {
      var bestIdx = 0;
      for (var b = 0; b < SMELTING_ORDER.length; b++) {
        if (SMELTING_RECIPES[SMELTING_ORDER[b]].level <= level && canSmelt(SMELTING_ORDER[b])) bestIdx = b;
      }
      recipeEl.selectedIndex = bestIdx;
    }

    // Furnace sprite
    var furnaceEl = $('smelt-furnace');
    var furnaceSprite = createSpriteEl('furnace', 0, 32, 32, 32, 96, 96);
    if (furnaceSprite && furnaceEl) {
      furnaceSprite.className = 'skill-sprite smithing-anvil-sprite';
      furnaceEl.appendChild(furnaceSprite);
    }

    // Update material display
    updateSmeltMats();
    if (recipeEl) {
      recipeEl.addEventListener('change', updateSmeltMats);
    }

    // Set up green zone
    updateSmeltZone();

    // Temperature gauge interaction
    smithingState.smeltTemp = 0;
    smithingState.smeltHolding = false;
    smithingState.phase = 'active';
    if (smithingState.smeltTimer) { clearInterval(smithingState.smeltTimer); smithingState.smeltTimer = null; }

    var heatBtn = $('smelt-heat-btn');
    if (heatBtn) {
      var selectedBar = getSelectedSmeltBar();
      heatBtn.disabled = !canSmelt(selectedBar) || getItemCount(selectedBar) >= STACK_CAP;

      var startHeat = function (e) {
        e.preventDefault();
        if (smithingState.phase !== 'active') return;
        var bar = getSelectedSmeltBar();
        if (!canSmelt(bar) || getItemCount(bar) >= STACK_CAP) return;
        smithingState.smeltHolding = true;
        startSmeltTimer();
      };
      var stopHeat = function (e) {
        e.preventDefault();
        if (!smithingState.smeltHolding) return;
        smithingState.smeltHolding = false;
        onSmeltRelease();
      };
      heatBtn.addEventListener('mousedown', startHeat);
      heatBtn.addEventListener('touchstart', startHeat, {passive: false});
      heatBtn.addEventListener('mouseup', stopHeat);
      heatBtn.addEventListener('mouseleave', stopHeat);
      heatBtn.addEventListener('touchend', stopHeat, {passive: false});
      heatBtn.addEventListener('touchcancel', stopHeat, {passive: false});
    }
  }

  function getSelectedSmeltBar() {
    var recipeEl = $('smelt-recipe');
    if (!recipeEl) return SMELTING_ORDER[0];
    var idx = parseInt(recipeEl.value);
    return SMELTING_ORDER[idx] || SMELTING_ORDER[0];
  }

  function updateSmeltMats() {
    var matsEl = $('smelt-mats');
    var barName = getSelectedSmeltBar();
    var recipe = SMELTING_RECIPES[barName];
    if (matsEl && recipe) {
      renderMaterialRequirements(matsEl, recipe.inputs);
    }
    var heatBtn = $('smelt-heat-btn');
    if (heatBtn) heatBtn.disabled = !canSmelt(barName) || getItemCount(barName) >= STACK_CAP;
    updateSmeltZone();
  }

  function updateSmeltZone() {
    var zone = $('smelting-gauge-zone');
    if (!zone) return;
    var barName = getSelectedSmeltBar();
    var idx = SMELTING_ORDER.indexOf(barName);
    var zoneHeight = Math.max(10, 35 - (idx * 3.5));
    // Perk: Steady Hand = 10% wider green zone
    if (hasPerk('steadyHand', 'smithing')) zoneHeight *= 1.10;
    var zoneBottom = Math.floor(50 - zoneHeight / 2);
    zone.style.height = zoneHeight + '%';
    zone.style.bottom = zoneBottom + '%';
  }

  function startSmeltTimer() {
    if (smithingState.smeltTimer) clearInterval(smithingState.smeltTimer);
    smithingState.smeltTemp = 0;
    smithingState.smeltTimer = setInterval(function () {
      if (smithingState.smeltHolding) {
        smithingState.smeltTemp = Math.min(100, smithingState.smeltTemp + 1.2);
      }
      var fill = $('smelting-gauge-fill');
      if (fill) fill.style.height = smithingState.smeltTemp + '%';
    }, 20);
  }

  function onSmeltRelease() {
    if (smithingState.smeltTimer) { clearInterval(smithingState.smeltTimer); smithingState.smeltTimer = null; }
    smithingState.phase = 'done';

    var barName = getSelectedSmeltBar();
    var idx = SMELTING_ORDER.indexOf(barName);
    var recipe = SMELTING_RECIPES[barName];
    var res = SKILLS.smithing.resources[idx] || SKILLS.smithing.resources[0];

    // Check if temperature is in the green zone (Perk: Steady Hand = 10% wider)
    var zoneHeight = Math.max(10, 35 - (idx * 3.5));
    if (hasPerk('steadyHand', 'smithing')) zoneHeight *= 1.10;
    var zoneBottom = Math.floor(50 - zoneHeight / 2);
    var zoneTop = zoneBottom + zoneHeight;
    var temp = smithingState.smeltTemp;
    var inZone = temp >= zoneBottom && temp <= zoneTop;

    // Perfect = within middle 30% of zone (Perk: Pyromaniac = 50% larger perfect zone)
    var zoneMid = zoneBottom + zoneHeight / 2;
    var perfectRange = zoneHeight * 0.15;
    if (hasPerk('pyromaniac', 'smithing')) perfectRange *= 1.5;
    var isPerfect = Math.abs(temp - zoneMid) <= perfectRange;

    // Blessed Forge: wider green zone if active
    if (smithingState.blessedActive) {
      zoneHeight *= 1.30;
      zoneBottom = Math.floor(50 - zoneHeight / 2);
      zoneTop = zoneBottom + zoneHeight;
      zoneMid = zoneBottom + zoneHeight / 2;
      inZone = temp >= zoneBottom && temp <= zoneTop;
      perfectRange = zoneHeight * 0.15;
      if (hasPerk('pyromaniac', 'smithing')) perfectRange *= 1.5;
      isPerfect = Math.abs(temp - zoneMid) <= perfectRange;
    }

    var progress = $('smelt-progress');
    var status = $('smelt-status');
    var slog = getSmithingLog();
    slog.totalClicks++;

    if (!inZone) {
      if (progress) progress.textContent = 'Temperature missed! Try again...';
      if (status) status.textContent = temp < zoneBottom ? 'Too cold!' : 'Too hot!';
      // Combo lost on miss
      if (smithingCombo.count > 0) {
        smithingCombo.count = 0;
        var comboEl = $('smithing-combo');
        if (comboEl) comboEl.style.display = 'none';
        var gameArea0 = $('skills-game-area');
        if (gameArea0) spawnParticle(gameArea0, 'Combo lost!', 'combo-lost');
      }
      var cooldown = getToolCooldown('smithing', 800);
      smithingState.cooldownTimer = setTimeout(function () {
        smithingState.cooldownTimer = null;
        smithingState.phase = 'active';
        smithingState.smeltTemp = 0;
        var fill = $('smelting-gauge-fill');
        if (fill) fill.style.height = '0%';
        if (progress) progress.textContent = 'Hold button to heat, release in the green zone';
        if (status) status.textContent = '';
        var heatBtn = $('smelt-heat-btn');
        var curBar = getSelectedSmeltBar();
        if (heatBtn) heatBtn.disabled = !canSmelt(curBar) || getItemCount(curBar) >= STACK_CAP;
      }, cooldown);
      return;
    }

    // Success: consume ores and produce bar
    if (!canSmelt(barName) || getItemCount(barName) >= STACK_CAP) {
      if (progress) progress.textContent = !canSmelt(barName) ? 'Not enough ores!' : 'Bar stack is full (999)!';
      var failCd = getToolCooldown('smithing', 800);
      smithingState.cooldownTimer = setTimeout(function () {
        smithingState.cooldownTimer = null;
        smithingState.phase = 'active';
        smithingState.smeltTemp = 0;
        var fill2 = $('smelting-gauge-fill');
        if (fill2) fill2.style.height = '0%';
        if (progress) progress.textContent = 'Hold button to heat, release in the green zone';
        if (status) status.textContent = '';
        var heatBtn2 = $('smelt-heat-btn');
        var curBar2 = getSelectedSmeltBar();
        if (heatBtn2) heatBtn2.disabled = !canSmelt(curBar2) || getItemCount(curBar2) >= STACK_CAP;
      }, failCd);
      return;
    }

    // Combo tracking (3s window for smelting)
    var now = Date.now();
    var timeSince = now - smithingCombo.lastClickTime;
    if (smithingCombo.lastClickTime > 0 && timeSince <= 3000) {
      smithingCombo.count = Math.min(smithingCombo.count + 1, 10);
    } else if (timeSince > 3000) {
      smithingCombo.count = 1;
    }
    smithingCombo.lastClickTime = now;
    var comboMult = 1 + (smithingCombo.count * 0.1);
    updateSmithingComboDisplay();

    // Perk: Efficient Smelt — 15% chance to not consume ores (or Ore Surge active)
    var skipOres = smithingState.oreSurgeCount > 0;
    if (!skipOres && hasPerk('efficientSmelt', 'smithing') && Math.random() < 0.15) {
      skipOres = true;
      slog.noOreProcs++;
      addLog('Efficient smelt! Ores preserved.');
    }
    if (skipOres) {
      if (smithingState.oreSurgeCount > 0) {
        smithingState.oreSurgeCount--;
        addLog('Ore Surge! Ores preserved. (' + smithingState.oreSurgeCount + ' left)');
        if (smithingState.oreSurgeCount <= 0) {
          var furnaceEl0 = $('smelt-furnace');
          if (furnaceEl0) furnaceEl0.classList.remove('ore-surge-glow');
        }
      }
    } else {
      consumeSmeltingOres(barName);
    }
    // Perk: Double Bar — 10% chance for 2x bars
    var barCount = (hasPerk('doubleBar', 'smithing') && Math.random() < 0.10) ? 2 : 1;
    addItem(barName, barCount);
    if (barCount > 1) { addLog('Double bar! +' + barCount + ' ' + barName); slog.doubleBars++; }
    updateSmeltMats();

    // Collection log
    slog.totalSmelts++;
    slog.barsSmelted[barName] = (slog.barsSmelted[barName] || 0) + barCount;
    if (isPerfect) slog.perfectSmelts++;

    var bonusMult = isPerfect ? 5 : 1;
    var xpGain = Math.floor(res.xp * bonusMult * comboMult * getXpMult());

    addXp('smithing', xpGain);

    var logText = isPerfect
      ? 'PERFECT SMELT! ' + barName + ' (+' + xpGain + ' XP)'
      : 'Smelted ' + barName + ' (+' + xpGain + ' XP)';
    if (smithingCombo.count > 1) logText += ' [x' + smithingCombo.count + ']';
    addLog(logText);

    var gameArea = $('skills-game-area');
    if (gameArea) {
      var barPos = BAR_DROP_SPRITES[barName];
      if (barPos) spawnSpriteParticle(gameArea, barPos.sheet || 'ores', barPos.x, barPos.y);
      spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
    }

    if (isPerfect && gameArea) {
      var mw = document.createElement('div');
      mw.className = 'smithing-masterwork';
      mw.textContent = 'PERFECT!';
      mw.style.left = '50%';
      mw.style.top = '30%';
      mw.style.transform = 'translateX(-50%)';
      gameArea.appendChild(mw);
      setTimeout(function () { if (mw.parentNode) mw.parentNode.removeChild(mw); }, 1000);
    }

    if (progress) progress.textContent = isPerfect ? 'Perfect temperature! ' + barName + ' smelted!' : barName + ' smelted!';
    if (status) status.textContent = '+' + xpGain + ' XP';

    onAction('smithing');
    animatePetAction('pet-bounce');

    // Furnace glow
    var furnace = $('smelt-furnace');
    if (furnace) {
      furnace.classList.add(isPerfect ? 'smelting-glow-perfect' : 'smelting-glow');
      setTimeout(function () { furnace.classList.remove('smelting-glow', 'smelting-glow-perfect'); }, 600);
    }

    // Try trigger event (2% chance)
    tryTriggerSmithingEvent();

    var resetCooldown = getToolCooldown('smithing', 1000);
    smithingState.cooldownTimer = setTimeout(function () {
      smithingState.cooldownTimer = null;
      renderSmithing();
      renderSkillList();
      renderRightPanel();
      updateGameHeader();
    }, resetCooldown);
  }

  // ── FORGING: 5-hit timing bar mini-game ────────
  function renderForgingGame(area) {
    var div = document.createElement('div');
    div.className = 'smithing-area forging-area';
    var level = state.skills.smithing.level;

    // Build recipe dropdown (filtered by level + available bars/gems)
    var options = '';
    var firstAvailable = -1;
    for (var i = 0; i < FORGING_RECIPES.length; i++) {
      var recipe = FORGING_RECIPES[i];
      if (recipe.level > level) continue;
      var available = canForge(recipe);
      if (firstAvailable < 0 && available) firstAvailable = i;
      options += '<option value="' + i + '"' + (available ? '' : ' class="smithing-unavailable"') + '>' +
        recipe.name + ' (Lv ' + recipe.level + ')' + (available ? '' : ' [need mats]') + '</option>';
    }

    if (!options) {
      div.innerHTML = '<div class="smithing-progress">No forging recipes available at your level.</div>';
      area.appendChild(div);
      return;
    }

    // Calculate zone width based on first selected recipe
    var selIdx = firstAvailable >= 0 ? firstAvailable : 0;
    var zoneWidth = Math.max(10, 35 - (selIdx * 1.2));
    // Perk: Master Forge = forging green zone 15% wider
    if (hasPerk('masterForge', 'smithing')) zoneWidth *= 1.15;
    var zoneLeft = Math.floor(50 - zoneWidth / 2);

    div.innerHTML =
      '<select class="smithing-recipe-select" id="forge-recipe">' + options + '</select>' +
      '<div class="smithing-mat-reqs" id="forge-mats"></div>' +
      '<div class="smithing-anvil" id="forge-anvil"></div>' +
      '<div class="smithing-timing-bar" id="smithing-timing-bar">' +
        '<div class="smithing-timing-zone" id="smithing-zone" style="left:' + zoneLeft + '%;width:' + zoneWidth + '%"></div>' +
        '<div class="smithing-timing-cursor" id="smithing-cursor" style="left:0%"></div>' +
      '</div>' +
      '<div class="smithing-progress" id="forge-progress">Click anvil when cursor is in green zone (0/5 hits)</div>' +
      '<div class="smithing-status" id="forge-status"></div>';
    area.appendChild(div);

    // Set to best available recipe
    var recipeEl = $('forge-recipe');
    if (recipeEl) {
      var bestIdx = 0;
      for (var b = 0; b < FORGING_RECIPES.length; b++) {
        if (FORGING_RECIPES[b].level <= level && canForge(FORGING_RECIPES[b])) bestIdx = b;
      }
      for (var o = 0; o < recipeEl.options.length; o++) {
        if (parseInt(recipeEl.options[o].value) === bestIdx) {
          recipeEl.selectedIndex = o;
          break;
        }
      }
    }

    // Update material display
    updateForgeMats();
    if (recipeEl) {
      recipeEl.addEventListener('change', function () {
        updateForgeMats();
        updateForgeZone();
        updateForgeAnvilSprite();
        // Reset hit state when recipe changes mid-game to prevent exploit
        smithingState.hits = 0;
        smithingState.bonusHits = 0;
        var fp = $('forge-progress');
        if (fp) fp.textContent = 'Click anvil when cursor is in green zone (0/5 hits)';
        var anv = $('forge-anvil');
        if (anv) anv.classList.remove('glow-1', 'glow-2', 'glow-3', 'glow-4', 'glow-5');
      });
    }

    // Anvil sprite — show item being forged
    updateForgeAnvilSprite();
    // Sync zone width to actually selected recipe
    updateForgeZone();

    smithingState.phase = 'active';
    smithingState.hits = 0;
    smithingState.bonusHits = 0;
    smithingState.cursorPos = 0;
    smithingState.cursorDir = 1;
    startSmithingCursor();

    var anvilEl = $('forge-anvil');
    if (anvilEl) anvilEl.addEventListener('click', onForgeClick);
  }

  function getSelectedForgeRecipe() {
    var recipeEl = $('forge-recipe');
    if (!recipeEl) return FORGING_RECIPES[0];
    var idx = parseInt(recipeEl.value);
    return FORGING_RECIPES[idx] || FORGING_RECIPES[0];
  }

  function updateForgeMats() {
    var matsEl = $('forge-mats');
    var recipe = getSelectedForgeRecipe();
    if (matsEl && recipe) {
      renderMaterialRequirements(matsEl, recipe.inputs);
    }
  }

  function updateForgeZone() {
    var recipeEl = $('forge-recipe');
    var idx = recipeEl ? parseInt(recipeEl.value) : 0;
    var newZoneWidth = Math.max(10, 35 - (idx * 1.2));
    // Perk: Master Forge = forging green zone 15% wider
    if (hasPerk('masterForge', 'smithing')) newZoneWidth *= 1.15;
    var newZoneLeft = Math.floor(50 - newZoneWidth / 2);
    var zone = $('smithing-zone');
    if (zone) {
      zone.style.width = newZoneWidth + '%';
      zone.style.left = newZoneLeft + '%';
    }
  }

  function updateForgeAnvilSprite() {
    var anvilEl = $('forge-anvil');
    if (!anvilEl) return;
    anvilEl.innerHTML = '';
    var recipe = getSelectedForgeRecipe();
    // Show the item sprite on the anvil
    if (recipe && recipe.sprite) {
      var itemSprite = createSpriteEl('items_sheet', recipe.sprite.x, recipe.sprite.y, 16, 16, 64, 64);
      if (itemSprite) {
        itemSprite.className = 'skill-sprite smithing-anvil-sprite';
        anvilEl.appendChild(itemSprite);
        return;
      }
    }
    // Fallback: anvil sprite
    var anvilSprite = createSpriteEl('anvil', 0, 0, 16, 16, 64, 64);
    if (anvilSprite) {
      anvilSprite.className = 'skill-sprite smithing-anvil-sprite';
      anvilEl.appendChild(anvilSprite);
    }
  }

  function startSmithingCursor() {
    if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
    smithingState.cursorPos = 0;
    smithingState.cursorDir = 1;
    // Perk: Quick Strike = cursor 15% slower (easier to hit)
    var speed = hasPerk('quickStrike', 'smithing') ? 1.275 : 1.5;
    smithingState.cursorTimer = setInterval(function () {
      smithingState.cursorPos += smithingState.cursorDir * speed;
      if (smithingState.cursorPos >= 100) { smithingState.cursorPos = 100; smithingState.cursorDir = -1; }
      if (smithingState.cursorPos <= 0) { smithingState.cursorPos = 0; smithingState.cursorDir = 1; }
      var cursor = $('smithing-cursor');
      if (cursor) cursor.style.left = smithingState.cursorPos + '%';
    }, 20);
  }

  function onForgeClick() {
    if (smithingState.phase !== 'active') return;
    var recipe = getSelectedForgeRecipe();
    if (!canForge(recipe)) {
      var fp = $('forge-progress');
      if (fp) fp.textContent = 'Need materials! Select a recipe you can craft.';
      return;
    }
    if (getItemCount(recipe.name) >= STACK_CAP) {
      var fp2 = $('forge-progress');
      if (fp2) fp2.textContent = 'Item stack is full (999)!';
      return;
    }
    var anvil = $('forge-anvil');
    if (anvil) {
      anvil.classList.remove('hit');
      void anvil.offsetWidth;
      anvil.classList.add('hit');
    }

    // Spawn anvil sparks
    spawnAnvilSparks(anvil);

    // Get zone bounds (Blessed Forge: wider zone)
    var zone = $('smithing-zone');
    var zoneLeft = zone ? parseFloat(zone.style.left) : 35;
    var zoneWidth = zone ? parseFloat(zone.style.width) : 30;
    if (smithingState.blessedActive) {
      zoneWidth *= 1.30;
      zoneLeft = Math.floor(50 - zoneWidth / 2);
    }
    var zoneRight = zoneLeft + zoneWidth;

    // Master's Touch: auto-hit every time
    var inZone = smithingState.masterTouchActive || (smithingState.cursorPos >= zoneLeft && smithingState.cursorPos <= zoneRight);
    smithingState.hits++;
    if (inZone) smithingState.bonusHits++;

    var slog = getSmithingLog();
    slog.totalClicks++;

    // Hammer glow
    if (anvil) {
      anvil.classList.remove('glow-1', 'glow-2', 'glow-3', 'glow-4', 'glow-5');
      if (smithingState.bonusHits > 0) {
        anvil.classList.add('glow-' + Math.min(smithingState.bonusHits, 5));
      }
    }

    var progress = $('forge-progress');
    if (progress) {
      progress.textContent = (inZone ? 'Perfect! ' : 'Miss... ') + '(' + smithingState.hits + '/5 hits)';
    }

    if (smithingState.hits >= 5) {
      // Complete
      if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
      smithingState.phase = 'done';

      // Clear Master's Touch after use
      if (smithingState.masterTouchActive) {
        smithingState.masterTouchActive = false;
        if (anvil) anvil.classList.remove('master-touch-glow');
      }

      var recipe2 = getSelectedForgeRecipe();

      // Check materials and stack cap
      if (!canForge(recipe2) || getItemCount(recipe2.name) >= STACK_CAP) {
        if (progress) progress.textContent = !canForge(recipe2) ? 'Not enough materials!' : 'Item stack is full (999)!';
        var resetCd = getToolCooldown('smithing', 1000);
        smithingState.cooldownTimer = setTimeout(function () {
          smithingState.cooldownTimer = null;
          renderSmithing();
          renderSkillList();
          renderRightPanel();
          updateGameHeader();
        }, resetCd);
        return;
      }

      // Consume materials and produce item
      consumeForgingMats(recipe2);
      addItem(recipe2.name, 1);
      updateForgeMats();

      // Masterwork check (5/5 perfect)
      var isMasterwork = smithingState.bonusHits >= 5;

      // Combo tracking (5s window for forging)
      var now = Date.now();
      var timeSince = now - smithingCombo.lastClickTime;
      if (smithingCombo.lastClickTime > 0 && timeSince <= 5000) {
        smithingCombo.count = Math.min(smithingCombo.count + 1, 10);
      } else if (timeSince > 5000) {
        smithingCombo.count = 1;
      }
      smithingCombo.lastClickTime = now;
      var comboMult = 1 + (smithingCombo.count * 0.1);
      updateSmithingComboDisplay();

      // Collection log
      slog.totalForges++;
      slog.itemsForged[recipe2.name] = (slog.itemsForged[recipe2.name] || 0) + 1;
      if (isMasterwork) slog.masterworks++;

      var bonusMult = isMasterwork ? 5 : (1 + (smithingState.bonusHits * 0.25));
      var xpGain = Math.floor(recipe2.xp * bonusMult * comboMult * getXpMult());

      addXp('smithing', xpGain);

      var logText = isMasterwork
        ? 'MASTERWORK! Forged ' + recipe2.name + ' (+' + xpGain + ' XP) [5/5 perfect]'
        : 'Forged ' + recipe2.name + ' (+' + xpGain + ' XP) [' + smithingState.bonusHits + '/5 perfect]';
      if (smithingCombo.count > 1) logText += ' [x' + smithingCombo.count + ']';
      addLog(logText);

      var gameArea = $('skills-game-area');
      if (gameArea) {
        if (recipe2.sprite) {
          spawnSpriteParticle(gameArea, 'items_sheet', recipe2.sprite.x, recipe2.sprite.y);
        }
        spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
      }

      // Masterwork flash + screen flash
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

      var status = $('forge-status');
      if (status) status.textContent = isMasterwork ? 'MASTERWORK! 5/5 perfect!' : smithingState.bonusHits + '/5 perfect hits!';

      onAction('smithing');
      animatePetAction('pet-bounce');

      // Try trigger event (2% chance)
      tryTriggerSmithingEvent();

      var cooldown = getToolCooldown('smithing', 1000);
      smithingState.cooldownTimer = setTimeout(function () {
        smithingState.cooldownTimer = null;
        renderSmithing();
        renderSkillList();
        renderRightPanel();
        updateGameHeader();
      }, cooldown);
    }
  }

  // ══════════════════════════════════════════════
  // ── SMITHING COMBO & EVENTS ──────────────────
  // ══════════════════════════════════════════════

  function updateSmithingComboDisplay() {
    var el = $('smithing-combo');
    if (!el) return;
    if (smithingCombo.count > 1) {
      el.style.display = '';
      el.textContent = 'Combo x' + smithingCombo.count + ' (' + (1 + smithingCombo.count * 0.1).toFixed(1) + 'x XP)';
    } else {
      el.style.display = 'none';
    }
  }

  function spawnAnvilSparks(anvil) {
    if (!anvil) return;
    var gameArea = $('skills-game-area');
    if (!gameArea) return;
    for (var i = 0; i < 3; i++) {
      var spark = document.createElement('div');
      spark.className = 'smithing-spark';
      var dx = (Math.random() - 0.5) * 60;
      var dy = -(20 + Math.random() * 40);
      spark.style.cssText = 'left:50%;top:50%;--spark-dx:' + dx + 'px;--spark-dy:' + dy + 'px;';
      var rect = anvil.getBoundingClientRect();
      var areaRect = gameArea.getBoundingClientRect();
      spark.style.left = (rect.left - areaRect.left + rect.width / 2) + 'px';
      spark.style.top = (rect.top - areaRect.top + rect.height / 2) + 'px';
      gameArea.appendChild(spark);
      (function (s) {
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 500);
      })(spark);
    }
  }

  function tryTriggerSmithingEvent() {
    if (smithingEventActive) return;
    if (Math.random() > 0.02) return;

    var pool = [];
    var totalWeight = 0;
    for (var i = 0; i < SMITHING_EVENTS.length; i++) {
      pool.push(SMITHING_EVENTS[i]);
      totalWeight += SMITHING_EVENTS[i].weight;
    }
    // Inferno (perk-gated: Pyromaniac Lv85)
    if (hasPerk('pyromaniac', 'smithing')) {
      pool.push({ id: 'inferno', name: 'Inferno', weight: 20 });
      totalWeight += 20;
    }

    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    var selected = pool[0];
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight;
      if (roll < cumulative) { selected = pool[j]; break; }
    }

    smithingEventActive = true;
    addLog('EVENT: ' + selected.name + '!');

    if (selected.id === 'blessedForge') triggerBlessedForge();
    else if (selected.id === 'oreSurge') triggerOreSurge();
    else if (selected.id === 'masterTouch') triggerMasterTouch();
    else if (selected.id === 'inferno') triggerInferno();
  }

  function cleanupSmithingEvent() {
    smithingEventActive = false;
    smithingState.blessedActive = false;
    smithingState.oreSurgeCount = 0;
    smithingState.masterTouchActive = false;
    if (smithingEventTimer) { clearTimeout(smithingEventTimer); smithingEventTimer = null; }
    var evEls = document.querySelectorAll('.smithing-event-spot');
    for (var i = 0; i < evEls.length; i++) {
      if (evEls[i].parentNode) evEls[i].parentNode.removeChild(evEls[i]);
    }
    // Remove glow classes
    var furnace = $('smelt-furnace');
    if (furnace) furnace.classList.remove('ore-surge-glow');
    var anvil = $('forge-anvil');
    if (anvil) anvil.classList.remove('master-touch-glow');
  }

  function createSmithingEventSpot(cssClass, label, icon, timeLimit) {
    var area = $('skills-game-area');
    if (!area) return null;
    var spot = document.createElement('div');
    spot.className = 'smithing-event-spot ' + cssClass;
    spot.innerHTML =
      '<div class="smithing-event-label">' + label + '</div>' +
      '<div class="smithing-event-icon">' + icon + '</div>';
    var timerBar = document.createElement('div');
    timerBar.className = 'smithing-event-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'smithing-event-timer-fill';
    timerFill.style.width = '100%';
    timerFill.style.transition = 'width ' + (timeLimit / 1000) + 's linear';
    timerBar.appendChild(timerFill);
    spot.appendChild(timerBar);
    area.appendChild(spot);
    setTimeout(function () { timerFill.style.width = '0%'; }, 50);
    return spot;
  }

  function triggerBlessedForge() {
    var spot = createSmithingEventSpot('blessed-forge', 'Blessed Forge!', '\u2728', 10000);
    if (!spot) { cleanupSmithingEvent(); return; }
    spot.addEventListener('click', function () {
      if (spot.parentNode) spot.parentNode.removeChild(spot);
      smithingState.blessedActive = true;
      var slog = getSmithingLog();
      slog.events.blessedForge++;
      addLog('Blessed Forge activated! Green zones 30% wider for 15s.');
      var gameArea = $('skills-game-area');
      if (gameArea) spawnParticle(gameArea, '+3x XP!', 'xp');
      var xpBonus = Math.floor(50 * getXpMult() * 3);
      addXp('smithing', xpBonus);
      smithingEventTimer = setTimeout(function () {
        smithingState.blessedActive = false;
        smithingEventActive = false;
        addLog('Blessed Forge faded...');
      }, 15000);
    });
    smithingEventTimer = setTimeout(function () {
      addLog('Blessed Forge expired...');
      cleanupSmithingEvent();
    }, 10000);
  }

  function triggerOreSurge() {
    var spot = createSmithingEventSpot('ore-surge', 'Ore Surge!', '\uD83D\uDCA0', 8000);
    if (!spot) { cleanupSmithingEvent(); return; }
    spot.addEventListener('click', function () {
      if (spot.parentNode) spot.parentNode.removeChild(spot);
      smithingState.oreSurgeCount = 3;
      var slog = getSmithingLog();
      slog.events.oreSurge++;
      addLog('Ore Surge! Next 3 smelts use no ores.');
      var furnace = $('smelt-furnace');
      if (furnace) furnace.classList.add('ore-surge-glow');
      smithingEventActive = false;
    });
    smithingEventTimer = setTimeout(function () {
      addLog('Ore Surge expired...');
      cleanupSmithingEvent();
    }, 8000);
  }

  function triggerMasterTouch() {
    var spot = createSmithingEventSpot('master-touch', "Master's Touch!", '\uD83D\uDD28', 8000);
    if (!spot) { cleanupSmithingEvent(); return; }
    spot.addEventListener('click', function () {
      if (spot.parentNode) spot.parentNode.removeChild(spot);
      smithingState.masterTouchActive = true;
      var slog = getSmithingLog();
      slog.events.masterTouch++;
      addLog("Master's Touch! Next forge is automatic masterwork.");
      var anvil = $('forge-anvil');
      if (anvil) anvil.classList.add('master-touch-glow');
      smithingEventActive = false;
    });
    smithingEventTimer = setTimeout(function () {
      addLog("Master's Touch expired...");
      cleanupSmithingEvent();
    }, 8000);
  }

  function triggerInferno() {
    var spot = createSmithingEventSpot('inferno-event', 'Inferno!', '\uD83D\uDD25', 12000);
    if (!spot) { cleanupSmithingEvent(); return; }
    var infernoHp = { hp: 5, maxHp: 5 };
    var hpBar = document.createElement('div');
    hpBar.className = 'rock-hp-bar';
    hpBar.style.cssText = 'position:absolute;bottom:2px;left:4px;right:4px;';
    var hpFill = document.createElement('div');
    hpFill.className = 'rock-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);
    spot.appendChild(hpBar);

    spot.addEventListener('click', function () {
      infernoHp.hp--;
      hpFill.style.width = (infernoHp.hp / infernoHp.maxHp * 100) + '%';
      spot.classList.add('hit');
      setTimeout(function () { spot.classList.remove('hit'); }, 200);
      if (infernoHp.hp <= 0) {
        if (spot.parentNode) spot.parentNode.removeChild(spot);
        var slog = getSmithingLog();
        slog.events.inferno++;
        // Reward: 10x smelting XP + 2 of highest available bar
        var level = state.skills.smithing.level;
        var bestBar = SMELTING_ORDER[0];
        for (var bi = 0; bi < SMELTING_ORDER.length; bi++) {
          if (SMELTING_RECIPES[SMELTING_ORDER[bi]].level <= level) bestBar = SMELTING_ORDER[bi];
        }
        addItem(bestBar, 2);
        slog.barsSmelted[bestBar] = (slog.barsSmelted[bestBar] || 0) + 2;
        var xpReward = Math.floor(200 * getXpMult() * 10);
        addXp('smithing', xpReward);
        addLog('Inferno defeated! +' + xpReward + ' XP, +2 ' + bestBar);
        var gameArea = $('skills-game-area');
        if (gameArea) spawnParticle(gameArea, '+' + xpReward + ' XP', 'xp');
        smithingEventActive = false;
        if (smithingEventTimer) { clearTimeout(smithingEventTimer); smithingEventTimer = null; }
      }
    });
    smithingEventTimer = setTimeout(function () {
      addLog('Inferno burned out...');
      cleanupSmithingEvent();
    }, 12000);
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

    // A5: Initialize player HP (Perk: Field Medic = 5 potions)
    combatState.playerMaxHp = 100 + level * 3;
    combatState.playerHp = combatState.playerMaxHp;
    combatState.potions = hasPerk('extraPotion', 'combat') ? 5 : 3;
    combatState.dead = false;
    combatState.dodgeCooldown = false;
    combatState.secondWindUsed = false;

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
        'Dragon': 'sprout-slime',
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
      } else if (res.name === 'Training Dummy') {
        // Phase 3: Training dummy uses helm sprite as target placeholder (row 2, col 0)
        var dummySprite = createSpriteEl('tools-t1', 0, 32, 16, 16, 48, 48);
        if (dummySprite) {
          spriteEl.textContent = '';
          spriteEl.style.backgroundImage = '';
          spriteEl.style.fontSize = '';
          spriteEl.style.display = 'flex';
          spriteEl.style.alignItems = 'center';
          spriteEl.style.justifyContent = 'center';
          spriteEl.appendChild(dummySprite);
        }
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

        // A5: Enemy attack deals real damage (Perk: Tough Skin = 10% reduction)
        var dmg = Math.floor(5 + level * 0.5);
        if (hasPerk('toughSkin', 'combat')) dmg = Math.floor(dmg * 0.9);
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

        // A5: Player death check (Perk: Second Wind = survive once at 10% HP)
        if (combatState.playerHp <= 0) {
          if (hasPerk('secondWind', 'combat') && !combatState.secondWindUsed) {
            combatState.secondWindUsed = true;
            combatState.playerHp = Math.floor(combatState.playerMaxHp * 0.10);
            updatePlayerHP();
            addLog('Second Wind! Survived at ' + combatState.playerHp + ' HP!');
            var gameArea = $('skills-game-area');
            if (gameArea) spawnParticle(gameArea, 'Second Wind!', 'gem');
          } else {
            onPlayerDeath();
          }
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

    // Perk: Quick Reflex = dodge cooldown 2s → 1.5s
    var dodgeCd = hasPerk('quickReflex', 'combat') ? 1500 : 2000;
    setTimeout(function () {
      combatState.dodgeCooldown = false;
      if (dodgeBtn) dodgeBtn.disabled = combatState.dead;
    }, dodgeCd);
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
        combatState.potions = hasPerk('extraPotion', 'combat') ? 5 : 3;
        combatState.secondWindUsed = false;
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

    // A5: 15% crit chance (Perk: Crit Master → 25%)
    var critRate = hasPerk('critMaster', 'combat') ? 0.25 : 0.15;
    var isCrit = Math.random() < critRate;
    var critMult = isCrit ? 2 : 1;

    var dmg = Math.floor(baseDmg * typeMult * critMult * (0.8 + Math.random() * 0.4));

    combatState.enemyHp = Math.max(0, combatState.enemyHp - dmg);
    updateCombatHP();

    // Perk: Lifesteal — heal 5% of damage dealt
    if (hasPerk('lifesteal', 'combat') && combatState.playerHp < combatState.playerMaxHp) {
      var lsHeal = Math.max(1, Math.floor(dmg * 0.05));
      combatState.playerHp = Math.min(combatState.playerMaxHp, combatState.playerHp + lsHeal);
      updatePlayerHP();
    }

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
      var xpGain = Math.floor(res.xp * streakBonus * getXpMult());

      addXp('combat', xpGain);
      addLog('Defeated ' + res.name + '! (+' + xpGain + ' XP) [streak: ' + combatState.streak + ']');

      var gameArea = $('skills-game-area');
      if (gameArea) {
        spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
      }

      // Common action hook
      onAction('combat');

      // C1: Pet bounce
      animatePetAction('pet-bounce');

      // A5: Reset potions on kill (Perk: Field Medic = 5)
      combatState.potions = hasPerk('extraPotion', 'combat') ? 5 : 3;
      combatState.secondWindUsed = false;
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
    // Clear all rock respawn intervals
    for (var ri = 0; ri < rockRespawnIntervals.length; ri++) {
      clearInterval(rockRespawnIntervals[ri]);
    }
    rockRespawnIntervals = [];
    // Clean up mining event DOM + state
    cleanupEvent();
    // Stop mining animation overlay
    stopMiningAnim();
    // Woodcutting cleanup
    wcCombo = { count: 0, lastClickTime: 0 };
    treeState = [];
    for (var ti = 0; ti < treeRespawnIntervals.length; ti++) {
      clearInterval(treeRespawnIntervals[ti]);
    }
    treeRespawnIntervals = [];
    cleanupWcEvent();
    // Stop woodcutting animation overlay
    stopWcAnim();
    // Fishing cleanup
    stopAmbientFish();
    fishingCombo = { count: 0, lastClickTime: 0 };
    fishingCooldown = false;
    for (var fi = 0; fi < fishSpotState.length; fi++) {
      if (fishSpotState[fi].biteTimer) clearTimeout(fishSpotState[fi].biteTimer);
      if (fishSpotState[fi].missTimer) clearTimeout(fishSpotState[fi].missTimer);
    }
    fishSpotState = [];
    for (var fri = 0; fri < fishSpotRespawnIntervals.length; fri++) {
      clearInterval(fishSpotRespawnIntervals[fri]);
    }
    fishSpotRespawnIntervals = [];
    cleanupFishingEvent();
    stopFishingAnim();
    if (fishingState.timer) clearTimeout(fishingState.timer);
    if (fishingState.biteTimeout) clearTimeout(fishingState.biteTimeout);
    if (fishingState.castTimer) clearInterval(fishingState.castTimer);
    fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };
    wcState = { hits: 0, hitsNeeded: 0, cooldown: false, lastChopTime: 0 };
    // Smithing cleanup
    smithingCombo = { count: 0, lastClickTime: 0 };
    cleanupSmithingEvent();
    stopSmithingAnim();
    if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
    if (smithingState.smeltTimer) clearInterval(smithingState.smeltTimer);
    if (smithingState.cooldownTimer) clearTimeout(smithingState.cooldownTimer);
    var prevMode = smithingState.mode || 'smelting';
    smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0, mode: prevMode, smeltTemp: 0, smeltTimer: null, smeltHolding: false, cooldownTimer: null, blessedActive: false, oreSurgeCount: 0, masterTouchActive: false };
    if (combatState.enemyTimer) clearInterval(combatState.enemyTimer);
    if (combatState.dodgeWindowTimer) clearTimeout(combatState.dodgeWindowTimer);
    combatState = {
      enemyHp: 0, enemyMaxHp: 0, enemyName: '', streak: 0, enemyTimer: null, cooldown: false,
      playerHp: 0, playerMaxHp: 0, potions: 3, dodgeCooldown: false, dead: false,
      dodgeWindow: false, dodgeWindowTimer: null, secondWindUsed: false
    };
    // Clear mining cavern background so other skills don't inherit it
    var area = $('skills-game-area');
    if (area) {
      area.style.backgroundImage = '';
      area.style.backgroundSize = '';
      area.style.backgroundPosition = '';
    }
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
      nameDiv.textContent = c.name;
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
  // ── IDLE / OFFLINE PROGRESS ───────────────────
  // ══════════════════════════════════════════════
  function calculateIdleRewards() {
    var now = Date.now();
    var rewards = [];
    var totalXp = 0;

    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var key = SKILL_KEYS[i];
      var s = state.skills[key];
      if (!s.assignedPet || !s.lastActiveAt) continue;

      var elapsed = Math.min(now - s.lastActiveAt, IDLE_CAP_MS);
      if (elapsed < 300000) continue; // 5 min minimum before idle report

      var actionInterval = 30000 / (1 + s.level * 0.02);
      var actions = Math.floor(elapsed / actionInterval);
      if (actions <= 0) continue;

      var res = getHighestResource(key);
      var tierMult = getTierMult(s.assignedPet);
      var typeBonus = getTypeBonus(s.assignedPet, key);

      var xpPerAction = Math.floor(res.xp * tierMult * typeBonus);
      var xpTotal = actions * xpPerAction;

      addXp(key, xpTotal);

      totalXp += xpTotal;

      rewards.push({
        skill: key,
        petId: s.assignedPet,
        xp: xpTotal,
        actions: actions
      });

      // 6B: Idle materials for gathering skills (50% of actions)
      if (key === 'mining' || key === 'fishing' || key === 'woodcutting') {
        var materialActions = Math.floor(actions * 0.5);
        if (materialActions > 0) {
          var matName = key === 'woodcutting' ? (LOG_NAMES[res.name] || res.name + ' Log') : res.name;
          addItem(matName, materialActions);
          rewards[rewards.length - 1].materials = { name: matName, qty: materialActions };
        }
      }

      // 6C: Idle smelting for smithing (50% of actions → bars from available ores)
      // Uses direct inventory manipulation to avoid O(n) saveState calls
      if (key === 'smithing') {
        var smeltActions = Math.floor(actions * 0.5);
        var smeltLevel = s.level;
        var barsSmelted = [];
        for (var si = SMELTING_ORDER.length - 1; si >= 0 && smeltActions > 0; si--) {
          var smeltBar = SMELTING_ORDER[si];
          var smeltRecipe = SMELTING_RECIPES[smeltBar];
          if (smeltRecipe.level > smeltLevel) continue;
          while (smeltActions > 0 && hasItem(smeltRecipe.inputs[0].item, smeltRecipe.inputs[0].qty) &&
                 (smeltRecipe.inputs.length < 2 || hasItem(smeltRecipe.inputs[1].item, smeltRecipe.inputs[1].qty)) &&
                 (state.inventory[smeltBar] || 0) < STACK_CAP) {
            // Direct inventory manipulation (batched, single save after loop)
            for (var inp = 0; inp < smeltRecipe.inputs.length; inp++) {
              var ik = smeltRecipe.inputs[inp].item;
              state.inventory[ik] = (state.inventory[ik] || 0) - smeltRecipe.inputs[inp].qty;
              if (state.inventory[ik] <= 0) delete state.inventory[ik];
            }
            state.inventory[smeltBar] = (state.inventory[smeltBar] || 0) + 1;
            smeltActions--;
            var found = false;
            for (var bf = 0; bf < barsSmelted.length; bf++) {
              if (barsSmelted[bf].name === smeltBar) { barsSmelted[bf].qty++; found = true; break; }
            }
            if (!found) barsSmelted.push({ name: smeltBar, qty: 1 });
          }
        }
        if (barsSmelted.length > 0) {
          var smeltSummary = '';
          for (var bs = 0; bs < barsSmelted.length; bs++) {
            smeltSummary += (bs > 0 ? ', ' : '') + barsSmelted[bs].qty + ' ' + barsSmelted[bs].name;
          }
          rewards[rewards.length - 1].smelted = smeltSummary;
        }
      }

      s.lastActiveAt = now;
    }

    saveState();
    return { rewards: rewards, totalXp: totalXp };
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
      var matText = r.materials ? ' + ' + r.materials.qty + ' ' + r.materials.name : '';
      if (r.smelted) matText += ' + Smelted: ' + r.smelted;
      text.textContent = petName + ' earned ' + formatNum(r.xp) + ' ' + SKILLS[r.skill].name + ' XP' + matText;
      line.appendChild(text);

      content.appendChild(line);
    }

    var totalLine = document.createElement('div');
    totalLine.className = 'idle-total';
    totalLine.textContent = 'Total: ' + formatNum(result.totalXp) + ' XP';
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

        var res = (key === 'mining') ? getSelectedMiningResource() : (key === 'woodcutting') ? getSelectedWcResource() : getHighestResource(key);
        var tierMult = getTierMult(s.assignedPet);
        var typeBonus = getTypeBonus(s.assignedPet, key);

        var xp = Math.floor(res.xp * tierMult * typeBonus * 0.5);

        if (xp > 0) addXp(key, xp);

        if (key === activeSkill && xp > 0) {
          spawnAutoFloat('+' + xp + ' XP');
        }

        // 6B: Active auto-train materials for gathering skills
        if (key === 'mining' || key === 'fishing' || key === 'woodcutting') {
          var matName = key === 'woodcutting' ? (LOG_NAMES[res.name] || res.name + ' Log') : res.name;
          if (getItemCount(matName) < STACK_CAP) {
            addItem(matName, 1);
          }
        }

        // 6C: Active auto-train smelting for smithing (skip if player is mid-game)
        if (key === 'smithing' && !(key === activeSkill && smithingState.phase !== 'idle')) {
          var smeltLv = s.level;
          for (var asi = SMELTING_ORDER.length - 1; asi >= 0; asi--) {
            var asBar = SMELTING_ORDER[asi];
            if (SMELTING_RECIPES[asBar].level <= smeltLv && canSmelt(asBar) && getItemCount(asBar) < STACK_CAP) {
              consumeSmeltingOres(asBar);
              addItem(asBar, 1);
              break;
            }
          }
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

  // ── RPG integration: reinit + cleanup ──────
  function reinit() {
    STORAGE_KEY = window.__RPG_STORAGE_KEY || 'arebooksgood-skills';
    cleanupActiveGame();
    if (activeAutoTimer) { clearInterval(activeAutoTimer); activeAutoTimer = null; }
    state = null;
    activeSkill = 'mining';
    starShowerActive = false;
    if (starShowerTimer) { clearTimeout(starShowerTimer); starShowerTimer = null; }
    init();
  }
  window.__RPG_SKILLS_CLEANUP = function () {
    cleanupActiveGame();
    if (activeAutoTimer) { clearInterval(activeAutoTimer); activeAutoTimer = null; }
    if (starShowerTimer) { clearTimeout(starShowerTimer); starShowerTimer = null; }
  };

  // ── Skill → inventory category mapping ──────
  var SKILL_INVENTORY_CATEGORIES = {
    mining:      ['Ores', 'Gems'],
    fishing:     ['Fish'],
    woodcutting: ['Logs'],
    smithing:    ['Bars', 'Equipment'],
    combat:      []
  };

  // ── RPG Skills API (for location pane) ───────────
  window.__RPG_SKILLS_API = {
    getActiveSkill: function () { return activeSkill; },

    renderPerksInto: function (container, skill) {
      if (!container) return;
      container.innerHTML = '';
      var perks = SKILL_PERKS[skill];
      if (!perks || !state || !state.skills[skill]) {
        container.innerHTML = '<div class="rpg-loc-muted">No perks data.</div>';
        return;
      }
      var hdr = document.createElement('div');
      hdr.className = 'rpg-loc-col-header';
      hdr.textContent = 'UNLOCKS';
      container.appendChild(hdr);
      var level = state.skills[skill].level;
      var unlocked = 0;
      for (var i = 0; i < perks.length; i++) {
        if (level >= perks[i].level) unlocked++;
      }
      var sumEl = document.createElement('div');
      sumEl.className = 'rpg-loc-perk-summary';
      sumEl.textContent = unlocked + '/' + perks.length + ' unlocked';
      container.appendChild(sumEl);
      for (var i = 0; i < perks.length; i++) {
        var p = perks[i];
        var isUnlocked = level >= p.level;
        var row = document.createElement('div');
        row.className = 'rpg-loc-perk' + (isUnlocked ? ' rpg-loc-perk-unlocked' : '');
        row.title = p.desc;
        var nameSpan = document.createElement('span');
        nameSpan.className = 'rpg-loc-perk-name';
        nameSpan.textContent = (isUnlocked ? '\u2713 ' : '\u25CB ') + p.name;
        row.appendChild(nameSpan);
        var lvSpan = document.createElement('span');
        lvSpan.className = 'rpg-loc-perk-level';
        lvSpan.textContent = 'Lv ' + p.level;
        row.appendChild(lvSpan);
        container.appendChild(row);
      }
    },

    renderResourcesInto: function (container, skill) {
      if (!container) return;
      container.innerHTML = '';

      var hdr = document.createElement('div');
      hdr.className = 'rpg-loc-col-header';
      hdr.textContent = 'RESOURCES';
      container.appendChild(hdr);

      // Combat special case: show enemies defeated
      if (skill === 'combat') {
        var actions = (state && state.skills.combat) ? (state.skills.combat.totalActions || 0) : 0;
        var statRow = document.createElement('div');
        statRow.className = 'rpg-loc-resource-stat';
        statRow.textContent = 'Enemies Defeated: ' + formatNum(actions);
        container.appendChild(statRow);
        return;
      }

      var catLabels = SKILL_INVENTORY_CATEGORIES[skill];
      if (!catLabels || catLabels.length === 0) {
        container.innerHTML = '<div class="rpg-loc-muted">No resources for this skill.</div>';
        return;
      }

      var inv = (state && state.inventory) ? state.inventory : {};
      var anyItems = false;

      for (var c = 0; c < ITEM_CATEGORIES.length; c++) {
        var cat = ITEM_CATEGORIES[c];
        // Only show categories relevant to this skill
        var relevant = false;
        for (var r = 0; r < catLabels.length; r++) {
          if (catLabels[r] === cat.label) { relevant = true; break; }
        }
        if (!relevant) continue;

        // Filter to items player has
        var hasAny = false;
        for (var j = 0; j < cat.items.length; j++) {
          if (inv[cat.items[j]]) { hasAny = true; break; }
        }
        if (!hasAny) continue;
        anyItems = true;

        var label = document.createElement('div');
        label.className = 'rpg-loc-resource-label';
        label.textContent = cat.label;
        container.appendChild(label);

        var grid = document.createElement('div');
        grid.className = 'rpg-loc-resource-grid';
        container.appendChild(grid);

        for (var i = 0; i < cat.items.length; i++) {
          var itemKey = cat.items[i];
          var qty = inv[itemKey];
          if (!qty) continue;
          var iconData = ITEM_ICON_MAP[itemKey];
          if (!iconData) continue;

          var cell = document.createElement('div');
          cell.className = 'rpg-loc-resource-cell';
          cell.title = itemKey;

          var sprite = createSpriteEl(iconData.sheet, iconData.x, iconData.y, 16, 16, 24, 24);
          if (sprite) cell.appendChild(sprite);

          var countEl = document.createElement('span');
          countEl.className = 'rpg-loc-resource-count';
          countEl.textContent = formatNum(qty);
          cell.appendChild(countEl);

          grid.appendChild(cell);
        }
      }

      if (!anyItems) {
        var empty = document.createElement('div');
        empty.className = 'rpg-loc-muted';
        empty.textContent = 'No items yet. Start skilling!';
        container.appendChild(empty);
      }
    }
  };
  window.addEventListener('rpg-skills-init', reinit);

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

      // Phase 3: Replace emoji skill icons with sprites
      replaceSkillIcons();

      // Show idle report if any
      if (idleResult.rewards.length > 0) {
        showIdleReport(idleResult);
      }

      // Start active auto-train
      startActiveAutoTrain();

      // Event listeners (guard prevents duplicates when reinit is called with persistent DOM)
      if (!listenersAttached) {
        listenersAttached = true;

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

        var invToggle = $('skills-inv-toggle');
        if (invToggle) invToggle.addEventListener('click', toggleInventoryPanel);
        var invTitle = $('skills-inv-title');
        if (invTitle) invTitle.addEventListener('click', toggleInventoryPanel);

        var logBtn = $('skills-log-btn');
        if (logBtn) logBtn.addEventListener('click', showCollectionLog);

        var logClose = $('skills-log-close');
        if (logClose) logClose.addEventListener('click', function () {
          $('skills-log-overlay').style.display = 'none';
        });

        var perksBtn = $('skills-perks-btn');
        if (perksBtn) perksBtn.addEventListener('click', showPerksModal);

        var perksClose = $('skills-perks-close');
        if (perksClose) perksClose.addEventListener('click', function () {
          $('skills-perks-overlay').style.display = 'none';
        });

        var idleOk = $('skills-idle-report-ok');
        if (idleOk) idleOk.addEventListener('click', function () {
          $('skills-idle-report').style.display = 'none';
        });

        document.addEventListener('keydown', onKeyDown);
      }

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

  if (window.__RPG_STORAGE_KEY) {
    // RPG mode: wait for rpg-skills-init event, don't auto-init
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
