(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var STORAGE_KEY = 'arebooksgood-skills';
  var PET_KEY = 'arebooksgood-pet';
  var MAX_LEVEL = 99;
  var IDLE_CAP_MS = 8 * 60 * 60 * 1000; // 8 hours
  var ACTIVE_AUTO_INTERVAL = 15000; // 15s auto-train when page open
  var STATE_VERSION = 5;
  var STACK_CAP = 999;

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

  // ── Mining Perks (level-gated passives) ────────
  var MINING_PERKS = [
    { id: 'keenEye', name: 'Keen Eye', level: 10, desc: 'Gem chance 5% \u2192 10%' },
    { id: 'doubleStrike', name: 'Double Strike', level: 20, desc: '10% chance for 2x ore yield' },
    { id: 'prospector', name: "Prospector's Luck", level: 30, desc: '+25% dust from mining' },
    { id: 'oreSense', name: 'Ore Sense', level: 45, desc: 'Rock respawn 3s \u2192 2s' },
    { id: 'gemSpec', name: 'Gem Specialist', level: 60, desc: 'Gem bonus 5x \u2192 10x dust' },
    { id: 'veinMiner', name: 'Vein Miner', level: 75, desc: '20% chance to auto-mine adjacent rock' },
    { id: 'deepCore', name: 'Deep Core', level: 85, desc: 'Enables rare deep vein events (5x XP)' },
    { id: 'mastery', name: 'Mining Mastery', level: 99, desc: 'Permanent 2x SD from all mining' }
  ];

  // ── Rock HP (multi-hit mining) ─────────────────
  var ROCK_HP = {
    'Copper Ore': 1, 'Tin Ore': 1,
    'Iron Ore': 2, 'Coal': 2,
    'Gold Ore': 3, 'Silver Ore': 3,
    'Jade Ore': 4, 'Amethyst Ore': 4,
    'Ruby Ore': 4, 'Frost Ore': 5,
    'Dragon Ore': 5, 'Star Ore': 5
  };
  var rockState = []; // { hp, maxHp } per rock

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
    items_sheet: '/images/skills/items_sheet.png'
  };

  var SKILL_SHEET_META = {
    rocks: { w: 176, h: 272 },
    ores: { w: 256, h: 64 },
    gems: { w: 112, h: 64 },
    fish: { w: 160, h: 240 },
    trees: { w: 288, h: 192 },
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
    'Copper Ore':    { x: 32, y: 32 },    // gold crystal (copper-ish)
    'Tin Ore':       { x: 48, y: 32 },    // silver crystal
    'Iron Ore':      { x: 128, y: 32 },   // dark crystal
    'Coal':          { x: 128, y: 32 },   // dark crystal
    'Gold Ore':      { x: 32, y: 48 },    // gold crystal alt
    'Silver Ore':    { x: 16, y: 32 },    // grey crystal
    'Jade Ore':      { x: 96, y: 32 },    // green crystal
    'Amethyst Ore':  { x: 64, y: 32 },    // purple crystal
    'Ruby Ore':      { x: 80, y: 32 },    // red crystal
    'Frost Ore':     { x: 112, y: 32 },   // blue crystal
    'Dragon Ore':    { x: 80, y: 48 },    // red crystal alt
    'Star Ore':      { x: 144, y: 32 }    // pink crystal
  };

  // Ore drop particles: map resource → { sheet, x, y } on items_sheet.png (16px grid, row 31)
  var ORE_DROP_SPRITES = {
    'Copper Ore':    { sheet: 'items_sheet', x: 32, y: 496 },
    'Tin Ore':       { sheet: 'items_sheet', x: 144, y: 496 },
    'Iron Ore':      { sheet: 'items_sheet', x: 16, y: 496 },
    'Coal':          { sheet: 'items_sheet', x: 128, y: 496 },
    'Gold Ore':      { sheet: 'items_sheet', x: 48, y: 496 },
    'Silver Ore':    { sheet: 'items_sheet', x: 0, y: 496 },
    'Jade Ore':      { sheet: 'items_sheet', x: 64, y: 496 },
    'Amethyst Ore':  { sheet: 'items_sheet', x: 240, y: 496 },
    'Ruby Ore':      { sheet: 'items_sheet', x: 80, y: 496 },
    'Frost Ore':     { sheet: 'items_sheet', x: 160, y: 496 },
    'Dragon Ore':    { sheet: 'items_sheet', x: 288, y: 496 },
    'Star Ore':      { sheet: 'items_sheet', x: 304, y: 496 }
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
    'Minnow':     { sheet: 'items_sheet', x: 0, y: 464 },
    'Shrimp':     { sheet: 'items_sheet', x: 32, y: 464 },
    'Perch':      { sheet: 'items_sheet', x: 64, y: 464 },
    'Trout':      { sheet: 'items_sheet', x: 96, y: 464 },
    'Bass':       { sheet: 'items_sheet', x: 128, y: 464 },
    'Salmon':     { sheet: 'items_sheet', x: 160, y: 464 },
    'Catfish':    { sheet: 'items_sheet', x: 208, y: 464 },
    'Swordfish':  { sheet: 'items_sheet', x: 0, y: 480 },
    'Lobster':    { sheet: 'items_sheet', x: 48, y: 480 },
    'Shark':      { sheet: 'items_sheet', x: 112, y: 480 },
    'Anglerfish': { sheet: 'items_sheet', x: 176, y: 480 },
    'Leviathan':  { sheet: 'items_sheet', x: 240, y: 480 }
  };

  // Tree sprites: map name → { x, y, w, h } crop region on trees.png (288×192)
  // Full trees at y=36, 32×60 (trimmed 4px from top to exclude floating birds/decorations)
  // Base reference: extract-farm-sprites.py uses y=32..96, we trim top 4px
  var TREE_SPRITES = {
    'Pine':     { x: 0, y: 36, w: 32, h: 60 },     // green basic tree
    'Oak':      { x: 32, y: 36, w: 32, h: 60 },    // green variant
    'Birch':    { x: 64, y: 36, w: 32, h: 60 },    // orange/autumn tree
    'Maple':    { x: 96, y: 36, w: 32, h: 60 },    // white/winter tree
    'Walnut':   { x: 128, y: 36, w: 32, h: 60 },   // mid-green tree
    'Mahogany': { x: 160, y: 36, w: 32, h: 60 },   // green with blue cap
    'Yew':      { x: 192, y: 36, w: 32, h: 60 },   // green with base item
    'Elder':    { x: 224, y: 36, w: 32, h: 60 }     // green with golden fruit
  };

  // Anvil sprites: map recipe → { x, y } on anvil.png (128×96, 16×16 cells, 8 cols × 6 rows)
  // Rows by color: 0=blue-grey, 1=grey, 2=orange, 3=gold, 4=purple, 5=blue-grey
  // Use col 0 per row, vary row for color matching ore tier
  var ANVIL_SPRITES = {
    'Copper Bar':  { x: 0, y: 32 },   // row 2 = orange (copper)
    'Tin Bar':     { x: 0, y: 16 },   // row 1 = grey (tin)
    'Iron Bar':    { x: 0, y: 0 },    // row 0 = blue-grey (iron)
    'Gold Bar':    { x: 0, y: 48 },   // row 3 = gold
    'Silver Bar':  { x: 0, y: 16 },   // row 1 = grey (silver)
    'Jade Bar':    { x: 0, y: 80 },   // row 5 = blue-grey (jade)
    'Ruby Bar':    { x: 0, y: 64 },   // row 4 = purple (ruby)
    'Frost Bar':   { x: 0, y: 0 },    // row 0 = blue-grey (frost)
    'Dragon Bar':  { x: 0, y: 32 }    // row 2 = orange (dragon)
  };

  // Bar drop particles: items_sheet.png row 15 (y=240), items 562-570
  var BAR_DROP_SPRITES = {
    'Copper Bar':  { sheet: 'items_sheet', x: 336, y: 240 },
    'Tin Bar':     { sheet: 'items_sheet', x: 352, y: 240 },
    'Iron Bar':    { sheet: 'items_sheet', x: 368, y: 240 },
    'Gold Bar':    { sheet: 'items_sheet', x: 416, y: 240 },
    'Silver Bar':  { sheet: 'items_sheet', x: 400, y: 240 },
    'Jade Bar':    { sheet: 'items_sheet', x: 432, y: 240 },
    'Ruby Bar':    { sheet: 'items_sheet', x: 384, y: 240 },
    'Frost Bar':   { sheet: 'items_sheet', x: 448, y: 240 },
    'Dragon Bar':  { sheet: 'items_sheet', x: 464, y: 240 }
  };

  // Wood log drop: items_sheet.png row 27 (items 990-997)
  var WOOD_DROP_SPRITES = [
    { sheet: 'items_sheet', x: 272, y: 432 },  // Pine Log
    { sheet: 'items_sheet', x: 288, y: 432 },  // Oak Log
    { sheet: 'items_sheet', x: 304, y: 432 },  // Birch Log
    { sheet: 'items_sheet', x: 320, y: 432 },  // Maple Log
    { sheet: 'items_sheet', x: 336, y: 432 },  // Walnut Log
    { sheet: 'items_sheet', x: 352, y: 432 },  // Mahogany Log
    { sheet: 'items_sheet', x: 368, y: 432 },  // Yew Log
    { sheet: 'items_sheet', x: 384, y: 432 }   // Elder Log
  ];

  // Tool sprites: map { skill, tier } → { sheet, x, y } on tools-t1/t2/t3 (16px grid)
  // Confirmed via dungeongear.json (gear-weapons.png = tools-t1.png, identical MD5):
  //   Row 0: col0=WateringCan, col1=Pickaxe, col2=Sword, col3=Axe, col4=Bow, col5=Arrow, col6=Pick/Hammer, col7=Spear, col8=Sickle
  //   Row 1: col4=FishingRod, col14=EnchantedRod
  // Tier layout: t1-firstHalf=Basic, t1-secondHalf(+10)=Iron, t2-firstHalf=Steel, t2-secondHalf(+9)=Mithril, t3-firstHalf=Dragon
  var TOOL_SPRITES = {
    mining:      [{ sheet: 'tools-t1', x: 16, y: 0 },  { sheet: 'tools-t1', x: 176, y: 0 }, { sheet: 'tools-t2', x: 16, y: 0 },  { sheet: 'tools-t2', x: 160, y: 0 }, { sheet: 'tools-t3', x: 16, y: 0 }],
    fishing:     [{ sheet: 'tools-t1', x: 64, y: 16 }, { sheet: 'tools-t1', x: 224, y: 16 }, { sheet: 'tools-t2', x: 64, y: 16 }, { sheet: 'tools-t2', x: 208, y: 16 }, { sheet: 'tools-t3', x: 64, y: 16 }],
    woodcutting: [{ sheet: 'tools-t1', x: 48, y: 0 },  { sheet: 'tools-t1', x: 208, y: 0 }, { sheet: 'tools-t2', x: 48, y: 0 },  { sheet: 'tools-t2', x: 192, y: 0 }, { sheet: 'tools-t3', x: 48, y: 0 }],
    smithing:    [{ sheet: 'tools-t1', x: 96, y: 0 },  { sheet: 'tools-t1', x: 256, y: 0 }, { sheet: 'tools-t2', x: 96, y: 0 },  { sheet: 'tools-t2', x: 240, y: 0 }, { sheet: 'tools-t3', x: 96, y: 0 }],
    combat:      [{ sheet: 'tools-t1', x: 32, y: 0 },  { sheet: 'tools-t1', x: 192, y: 0 }, { sheet: 'tools-t2', x: 32, y: 0 },  { sheet: 'tools-t2', x: 176, y: 0 }, { sheet: 'tools-t3', x: 32, y: 0 }]
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
    { label: 'Ores', items: ['Copper Ore', 'Tin Ore', 'Iron Ore', 'Coal', 'Gold Ore', 'Silver Ore', 'Jade Ore', 'Amethyst Ore', 'Ruby Ore', 'Frost Ore', 'Dragon Ore', 'Star Ore'] },
    { label: 'Gems', items: ['Peridot', 'Emerald', 'Aquamarine', 'Topaz', 'Onyx', 'Moonstone', 'Diamond', 'Opal', 'Sapphire', 'Ruby'] },
    { label: 'Logs', items: ['Pine Log', 'Oak Log', 'Birch Log', 'Maple Log', 'Walnut Log', 'Mahogany Log', 'Yew Log', 'Elder Log'] },
    { label: 'Fish', items: ['Minnow', 'Shrimp', 'Perch', 'Trout', 'Bass', 'Salmon', 'Catfish', 'Swordfish', 'Lobster', 'Shark', 'Anglerfish', 'Leviathan'] },
    { label: 'Bars', items: ['Copper Bar', 'Tin Bar', 'Iron Bar', 'Gold Bar', 'Silver Bar', 'Jade Bar', 'Ruby Bar', 'Frost Bar', 'Dragon Bar'] },
    { label: 'Equipment', items: [
      'Copper Sword', 'Copper Shield', 'Tin Dagger', 'Tin Helmet',
      'Iron Sword', 'Iron Axe', 'Iron Chestplate',
      'Gold Sword', 'Gold Shield',
      'Silver Spear', 'Silver Chestplate',
      'Jade Staff', 'Jade Chestplate', 'Jade Crown',
      'Ruby Dagger', 'Ruby Bow', 'Ruby Helmet',
      'Frost Sword', 'Frost Chestplate', 'Frost Spear',
      'Dragon Sword', 'Dragon Axe', 'Dragon Chestplate'
    ] }
  ];

  // Unified item → sprite mapping for inventory icons (all from items_sheet.png)
  var ITEM_ICON_MAP = {
    // Ores (row 31, items 1117-1136)
    'Copper Ore':    { sheet: 'items_sheet', x: 32, y: 496 },
    'Tin Ore':       { sheet: 'items_sheet', x: 144, y: 496 },
    'Iron Ore':      { sheet: 'items_sheet', x: 16, y: 496 },
    'Coal':          { sheet: 'items_sheet', x: 128, y: 496 },
    'Gold Ore':      { sheet: 'items_sheet', x: 48, y: 496 },
    'Silver Ore':    { sheet: 'items_sheet', x: 0, y: 496 },
    'Jade Ore':      { sheet: 'items_sheet', x: 64, y: 496 },
    'Amethyst Ore':  { sheet: 'items_sheet', x: 240, y: 496 },
    'Ruby Ore':      { sheet: 'items_sheet', x: 80, y: 496 },
    'Frost Ore':     { sheet: 'items_sheet', x: 160, y: 496 },
    'Dragon Ore':    { sheet: 'items_sheet', x: 288, y: 496 },
    'Star Ore':      { sheet: 'items_sheet', x: 304, y: 496 },
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
    // Fish (row 29-30, items 1045-1078)
    'Minnow':        { sheet: 'items_sheet', x: 0, y: 464 },
    'Shrimp':        { sheet: 'items_sheet', x: 32, y: 464 },
    'Perch':         { sheet: 'items_sheet', x: 64, y: 464 },
    'Trout':         { sheet: 'items_sheet', x: 96, y: 464 },
    'Bass':          { sheet: 'items_sheet', x: 128, y: 464 },
    'Salmon':        { sheet: 'items_sheet', x: 160, y: 464 },
    'Catfish':       { sheet: 'items_sheet', x: 208, y: 464 },
    'Swordfish':     { sheet: 'items_sheet', x: 0, y: 480 },
    'Lobster':       { sheet: 'items_sheet', x: 48, y: 480 },
    'Shark':         { sheet: 'items_sheet', x: 112, y: 480 },
    'Anglerfish':    { sheet: 'items_sheet', x: 176, y: 480 },
    'Leviathan':     { sheet: 'items_sheet', x: 240, y: 480 },
    // Bars (row 15, items 562-570)
    'Copper Bar':    { sheet: 'items_sheet', x: 336, y: 240 },
    'Tin Bar':       { sheet: 'items_sheet', x: 352, y: 240 },
    'Iron Bar':      { sheet: 'items_sheet', x: 368, y: 240 },
    'Gold Bar':      { sheet: 'items_sheet', x: 416, y: 240 },
    'Silver Bar':    { sheet: 'items_sheet', x: 400, y: 240 },
    'Jade Bar':      { sheet: 'items_sheet', x: 432, y: 240 },
    'Ruby Bar':      { sheet: 'items_sheet', x: 384, y: 240 },
    'Frost Bar':     { sheet: 'items_sheet', x: 448, y: 240 },
    'Dragon Bar':    { sheet: 'items_sheet', x: 464, y: 240 },
    // Equipment (Phase 6C forging output)
    'Copper Sword':      { sheet: 'items_sheet', x: 0, y: 0 },
    'Copper Shield':     { sheet: 'items_sheet', x: 0, y: 80 },
    'Tin Dagger':        { sheet: 'items_sheet', x: 32, y: 0 },
    'Tin Helmet':        { sheet: 'items_sheet', x: 128, y: 80 },
    'Iron Sword':        { sheet: 'items_sheet', x: 288, y: 0 },
    'Iron Axe':          { sheet: 'items_sheet', x: 384, y: 0 },
    'Iron Chestplate':   { sheet: 'items_sheet', x: 0, y: 96 },
    'Gold Sword':        { sheet: 'items_sheet', x: 64, y: 16 },
    'Gold Shield':       { sheet: 'items_sheet', x: 256, y: 80 },
    'Silver Spear':      { sheet: 'items_sheet', x: 352, y: 80 },
    'Silver Chestplate': { sheet: 'items_sheet', x: 288, y: 96 },
    'Jade Staff':        { sheet: 'items_sheet', x: 0, y: 32 },
    'Jade Chestplate':   { sheet: 'items_sheet', x: 416, y: 96 },
    'Jade Crown':        { sheet: 'items_sheet', x: 0, y: 128 },
    'Ruby Dagger':       { sheet: 'items_sheet', x: 448, y: 0 },
    'Ruby Bow':          { sheet: 'items_sheet', x: 0, y: 64 },
    'Ruby Helmet':       { sheet: 'items_sheet', x: 416, y: 80 },
    'Frost Sword':       { sheet: 'items_sheet', x: 144, y: 0 },
    'Frost Chestplate':  { sheet: 'items_sheet', x: 80, y: 96 },
    'Frost Spear':       { sheet: 'items_sheet', x: 192, y: 80 },
    'Dragon Sword':      { sheet: 'items_sheet', x: 272, y: 0 },
    'Dragon Axe':        { sheet: 'items_sheet', x: 560, y: 16 },
    'Dragon Chestplate': { sheet: 'items_sheet', x: 560, y: 96 }
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

  function spawnSpriteParticle(parentEl, sheetKey, sx, sy, sw, sh) {
    sw = sw || 16;
    sh = sh || 16;
    var el = createSpriteEl(sheetKey, sx, sy, sw, sh, 32, 32);
    if (!el) return;
    el.className = 'ore-particle sprite-particle';
    el.style.left = (Math.random() * 60 + 20) + '%';
    el.style.top = '40%';
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
        { name: 'Copper Ore', level: 1, xp: 8, dust: 2, clickTime: 1200 },
        { name: 'Tin Ore', level: 1, xp: 10, dust: 2, clickTime: 1200 },
        { name: 'Iron Ore', level: 10, xp: 18, dust: 4, clickTime: 1100 },
        { name: 'Coal', level: 15, xp: 25, dust: 6, clickTime: 1050 },
        { name: 'Gold Ore', level: 25, xp: 40, dust: 10, clickTime: 1000 },
        { name: 'Silver Ore', level: 30, xp: 55, dust: 14, clickTime: 950 },
        { name: 'Jade Ore', level: 40, xp: 80, dust: 20, clickTime: 900 },
        { name: 'Amethyst Ore', level: 50, xp: 130, dust: 35, clickTime: 850 },
        { name: 'Ruby Ore', level: 60, xp: 200, dust: 55, clickTime: 800 },
        { name: 'Frost Ore', level: 70, xp: 320, dust: 90, clickTime: 750 },
        { name: 'Dragon Ore', level: 80, xp: 500, dust: 150, clickTime: 700 },
        { name: 'Star Ore', level: 90, xp: 800, dust: 250, clickTime: 650 }
      ]
    },
    fishing: {
      name: 'Fishing', icon: '\uD83C\uDFA3',
      resources: [
        { name: 'Minnow', level: 1, xp: 8, dust: 2, clickTime: 2000 },
        { name: 'Shrimp', level: 5, xp: 12, dust: 3, clickTime: 1900 },
        { name: 'Perch', level: 10, xp: 18, dust: 4, clickTime: 1800 },
        { name: 'Trout', level: 20, xp: 30, dust: 7, clickTime: 1700 },
        { name: 'Bass', level: 30, xp: 50, dust: 12, clickTime: 1600 },
        { name: 'Salmon', level: 40, xp: 80, dust: 20, clickTime: 1500 },
        { name: 'Catfish', level: 50, xp: 120, dust: 32, clickTime: 1400 },
        { name: 'Swordfish', level: 60, xp: 180, dust: 48, clickTime: 1300 },
        { name: 'Lobster', level: 65, xp: 220, dust: 60, clickTime: 1250 },
        { name: 'Shark', level: 75, xp: 320, dust: 90, clickTime: 1150 },
        { name: 'Anglerfish', level: 85, xp: 500, dust: 150, clickTime: 1050 },
        { name: 'Leviathan', level: 95, xp: 800, dust: 250, clickTime: 1000 }
      ]
    },
    woodcutting: {
      name: 'Woodcutting', icon: '\uD83E\uDE93',
      resources: [
        { name: 'Pine', level: 1, xp: 10, dust: 2, clickTime: 1200 },
        { name: 'Oak', level: 10, xp: 20, dust: 5, clickTime: 1100 },
        { name: 'Birch', level: 20, xp: 35, dust: 8, clickTime: 1050 },
        { name: 'Maple', level: 35, xp: 65, dust: 16, clickTime: 1000 },
        { name: 'Walnut', level: 50, xp: 120, dust: 30, clickTime: 900 },
        { name: 'Mahogany', level: 65, xp: 220, dust: 60, clickTime: 800 },
        { name: 'Yew', level: 80, xp: 400, dust: 110, clickTime: 700 },
        { name: 'Elder', level: 92, xp: 700, dust: 220, clickTime: 600 }
      ]
    },
    smithing: {
      name: 'Smithing', icon: '\uD83D\uDD28',
      resources: [
        { name: 'Copper Bar', level: 1, xp: 10, dust: 3, clickTime: 1500 },
        { name: 'Tin Bar', level: 5, xp: 16, dust: 4, clickTime: 1450 },
        { name: 'Iron Bar', level: 15, xp: 30, dust: 8, clickTime: 1400 },
        { name: 'Gold Bar', level: 25, xp: 55, dust: 14, clickTime: 1350 },
        { name: 'Silver Bar', level: 35, xp: 90, dust: 22, clickTime: 1300 },
        { name: 'Jade Bar', level: 45, xp: 140, dust: 36, clickTime: 1200 },
        { name: 'Ruby Bar', level: 60, xp: 220, dust: 58, clickTime: 1100 },
        { name: 'Frost Bar', level: 75, xp: 380, dust: 100, clickTime: 1000 },
        { name: 'Dragon Bar', level: 85, xp: 600, dust: 180, clickTime: 900 }
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

  // ── Smelting Recipes (Phase 6C) ────────────────
  var SMELTING_RECIPES = {
    'Copper Bar':  { level: 1,  inputs: [{ item: 'Copper Ore', qty: 2 }] },
    'Tin Bar':     { level: 5,  inputs: [{ item: 'Tin Ore', qty: 2 }] },
    'Iron Bar':    { level: 15, inputs: [{ item: 'Iron Ore', qty: 2 }, { item: 'Coal', qty: 1 }] },
    'Gold Bar':    { level: 25, inputs: [{ item: 'Gold Ore', qty: 3 }] },
    'Silver Bar':  { level: 35, inputs: [{ item: 'Silver Ore', qty: 3 }] },
    'Jade Bar':    { level: 45, inputs: [{ item: 'Jade Ore', qty: 4 }, { item: 'Coal', qty: 2 }] },
    'Ruby Bar':    { level: 60, inputs: [{ item: 'Ruby Ore', qty: 4 }, { item: 'Coal', qty: 2 }] },
    'Frost Bar':   { level: 75, inputs: [{ item: 'Frost Ore', qty: 5 }, { item: 'Coal', qty: 3 }] },
    'Dragon Bar':  { level: 85, inputs: [{ item: 'Dragon Ore', qty: 5 }, { item: 'Coal', qty: 5 }] }
  };
  var SMELTING_ORDER = ['Copper Bar', 'Tin Bar', 'Iron Bar', 'Gold Bar', 'Silver Bar', 'Jade Bar', 'Ruby Bar', 'Frost Bar', 'Dragon Bar'];

  // ── Forging Recipes (Phase 6C) ─────────────────
  var FORGING_RECIPES = [
    // Copper Tier
    { name: 'Copper Sword',      level: 1,  xp: 15,  dust: 4,   inputs: [{ item: 'Copper Bar', qty: 3 }],                              sprite: { x: 0, y: 0 } },
    { name: 'Copper Shield',     level: 1,  xp: 12,  dust: 3,   inputs: [{ item: 'Copper Bar', qty: 2 }],                              sprite: { x: 0, y: 80 } },
    // Tin Tier
    { name: 'Tin Dagger',        level: 8,  xp: 22,  dust: 6,   inputs: [{ item: 'Tin Bar', qty: 2 }],                                 sprite: { x: 32, y: 0 } },
    { name: 'Tin Helmet',        level: 8,  xp: 25,  dust: 7,   inputs: [{ item: 'Tin Bar', qty: 3 }],                                 sprite: { x: 128, y: 80 } },
    // Iron Tier
    { name: 'Iron Sword',        level: 18, xp: 40,  dust: 10,  inputs: [{ item: 'Iron Bar', qty: 3 }],                                sprite: { x: 288, y: 0 } },
    { name: 'Iron Axe',          level: 18, xp: 45,  dust: 12,  inputs: [{ item: 'Iron Bar', qty: 4 }],                                sprite: { x: 384, y: 0 } },
    { name: 'Iron Chestplate',   level: 20, xp: 55,  dust: 14,  inputs: [{ item: 'Iron Bar', qty: 5 }],                                sprite: { x: 0, y: 96 } },
    // Gold Tier
    { name: 'Gold Sword',        level: 28, xp: 70,  dust: 18,  inputs: [{ item: 'Gold Bar', qty: 3 }, { item: 'Topaz', qty: 1 }],     sprite: { x: 64, y: 16 } },
    { name: 'Gold Shield',       level: 28, xp: 65,  dust: 16,  inputs: [{ item: 'Gold Bar', qty: 3 }],                                sprite: { x: 256, y: 80 } },
    // Silver Tier
    { name: 'Silver Spear',      level: 38, xp: 110, dust: 28,  inputs: [{ item: 'Silver Bar', qty: 4 }, { item: 'Sapphire', qty: 1 }], sprite: { x: 352, y: 80 } },
    { name: 'Silver Chestplate', level: 38, xp: 120, dust: 30,  inputs: [{ item: 'Silver Bar', qty: 5 }],                              sprite: { x: 288, y: 96 } },
    // Jade Tier
    { name: 'Jade Staff',        level: 48, xp: 170, dust: 44,  inputs: [{ item: 'Jade Bar', qty: 4 }, { item: 'Emerald', qty: 1 }],   sprite: { x: 0, y: 32 } },
    { name: 'Jade Chestplate',   level: 50, xp: 180, dust: 46,  inputs: [{ item: 'Jade Bar', qty: 5 }],                                sprite: { x: 416, y: 96 } },
    { name: 'Jade Crown',        level: 50, xp: 160, dust: 40,  inputs: [{ item: 'Jade Bar', qty: 3 }, { item: 'Moonstone', qty: 1 }], sprite: { x: 0, y: 128 } },
    // Ruby Tier
    { name: 'Ruby Dagger',       level: 62, xp: 260, dust: 66,  inputs: [{ item: 'Ruby Bar', qty: 4 }, { item: 'Ruby', qty: 1 }],      sprite: { x: 448, y: 0 } },
    { name: 'Ruby Bow',          level: 62, xp: 270, dust: 68,  inputs: [{ item: 'Ruby Bar', qty: 5 }],                                sprite: { x: 0, y: 64 } },
    { name: 'Ruby Helmet',       level: 65, xp: 250, dust: 64,  inputs: [{ item: 'Ruby Bar', qty: 4 }, { item: 'Onyx', qty: 1 }],      sprite: { x: 416, y: 80 } },
    // Frost Tier
    { name: 'Frost Sword',       level: 78, xp: 430, dust: 110, inputs: [{ item: 'Frost Bar', qty: 5 }, { item: 'Aquamarine', qty: 1 }], sprite: { x: 144, y: 0 } },
    { name: 'Frost Chestplate',  level: 78, xp: 450, dust: 116, inputs: [{ item: 'Frost Bar', qty: 6 }],                               sprite: { x: 80, y: 96 } },
    { name: 'Frost Spear',       level: 80, xp: 460, dust: 118, inputs: [{ item: 'Frost Bar', qty: 5 }, { item: 'Diamond', qty: 1 }],  sprite: { x: 192, y: 80 } },
    // Dragon Tier
    { name: 'Dragon Sword',      level: 88, xp: 700, dust: 180, inputs: [{ item: 'Dragon Bar', qty: 5 }, { item: 'Diamond', qty: 2 }], sprite: { x: 272, y: 0 } },
    { name: 'Dragon Axe',        level: 88, xp: 720, dust: 184, inputs: [{ item: 'Dragon Bar', qty: 6 }, { item: 'Opal', qty: 1 }],    sprite: { x: 560, y: 16 } },
    { name: 'Dragon Chestplate', level: 90, xp: 800, dust: 200, inputs: [{ item: 'Dragon Bar', qty: 7 }, { item: 'Ruby', qty: 2 }],    sprite: { x: 560, y: 96 } }
  ];

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
  var smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0, mode: 'smelting', smeltTemp: 0, smeltTimer: null, smeltHolding: false, cooldownTimer: null };
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
    var s = { skills: {}, version: STATE_VERSION, mastered: {}, activePlayTime: 0, totalDustEarned: 0, inventory: {} };
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var skillDef = {
        level: 1,
        xp: 0,
        toolTier: 0,
        assignedPet: null,
        lastActiveAt: null,
        totalActions: 0
      };
      // Mining collection log (v3)
      if (SKILL_KEYS[i] === 'mining') {
        skillDef.log = { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
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
          s.totalDustEarned = saved.totalDustEarned || 0;
          // v4/v5: inventory
          s.inventory = saved.inventory || {};
          // v5: Migrate renamed items in inventory
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
          for (var i = 0; i < SKILL_KEYS.length; i++) {
            var key = SKILL_KEYS[i];
            if (saved.skills[key]) {
              s.skills[key].level = saved.skills[key].level || 1;
              s.skills[key].xp = saved.skills[key].xp || 0;
              s.skills[key].toolTier = saved.skills[key].toolTier || 0;
              s.skills[key].assignedPet = saved.skills[key].assignedPet || null;
              s.skills[key].lastActiveAt = saved.skills[key].lastActiveAt || null;
              s.skills[key].totalActions = saved.skills[key].totalActions || 0;
              // v3: mining collection log
              if (key === 'mining') {
                s.skills[key].log = saved.skills[key].log || { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
                // Migrate renamed ores in collection log (v3 + v5)
                var oreRenames = {
                  'Mithril Ore': 'Amethyst Ore', 'Adamant Ore': 'Jade Ore', 'Runite Ore': 'Amethyst Ore',
                  'Astral Ore': 'Amethyst Ore'
                };
                var om = s.skills[key].log.oresMined;
                for (var oldName in oreRenames) {
                  if (om[oldName]) { om[oreRenames[oldName]] = (om[oreRenames[oldName]] || 0) + om[oldName]; delete om[oldName]; }
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

    // Mining perk unlock check
    if (skill === 'mining') {
      for (var pi = 0; pi < MINING_PERKS.length; pi++) {
        if (MINING_PERKS[pi].level > oldLevel && MINING_PERKS[pi].level <= newLevel) {
          showPerkUnlockToast(MINING_PERKS[pi]);
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

  // ── Mining Collection Log helper ─────────────
  function getMiningLog() {
    if (!state.skills.mining.log) {
      state.skills.mining.log = { oresMined: {}, totalGems: 0, events: { gemVein: 0, shootingStar: 0, caveIn: 0, deepVein: 0 }, criticalHits: 0, totalClicks: 0 };
    }
    return state.skills.mining.log;
  }

  // ── Mining Perk helpers ──────────────────────
  function hasPerk(perkId) {
    var level = state.skills.mining.level;
    for (var i = 0; i < MINING_PERKS.length; i++) {
      if (MINING_PERKS[i].id === perkId) return level >= MINING_PERKS[i].level;
    }
    return false;
  }

  function renderMiningPerks() {
    var panel = $('skills-perks-panel');
    var title = $('skills-perks-title');
    if (!panel || !title) return;

    if (activeSkill !== 'mining') {
      panel.style.display = 'none';
      title.style.display = 'none';
      return;
    }

    panel.style.display = '';
    title.style.display = '';
    panel.innerHTML = '';

    var level = state.skills.mining.level;
    for (var i = 0; i < MINING_PERKS.length; i++) {
      var perk = MINING_PERKS[i];
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

      panel.appendChild(row);
    }
  }

  // ── Combined dust multiplier ──────────────────
  function getDustMult() {
    var mult = getStarShowerMult() * getMasteryBonus();
    if (activeSkill === 'mining') {
      if (hasPerk('prospector')) mult *= 1.25;
      if (hasPerk('mastery')) mult *= 2;
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
        var res = getHighestResource(activeSkill);
        var skillVerbs = {
          mining: 'Mining', fishing: 'Fishing for', woodcutting: 'Chopping',
          smithing: 'Smithing', combat: 'Fighting'
        };
        var verb = skillVerbs[activeSkill] || 'Training';
        var tierMult = getTierMult(petId);
        var typeBonus2 = getTypeBonus(petId, activeSkill);
        var idleDust = Math.floor(res.dust * tierMult * typeBonus2);
        var idleXp = Math.floor(res.xp * tierMult * typeBonus2);
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

    // Phase 3: Tool sprite preview
    updateToolSprite();

    // Mining perks panel
    renderMiningPerks();

    // Collection log button visibility
    var logBtn = $('skills-log-btn');
    if (logBtn) logBtn.style.display = activeSkill === 'mining' ? '' : 'none';

    // B5: Milestones panel
    renderMilestones();

    // 6A: Inventory panel
    renderInventoryPanel();
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

  // ── Inventory Panel ──────────────────────────────
  var invCollapsed = false;

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
        cell.title = itemKey + ' \u00d7 ' + qty;

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

  function showCollectionLog() {
    renderCollectionLog();
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

  // ── Phase 3: Update tool sprite in right panel ──
  function updateToolSprite() {
    var container = $('skills-tool-sprite');
    if (!container) return;
    container.innerHTML = '';
    var tier = state.skills[activeSkill].toolTier || 0;
    var toolMap = TOOL_SPRITES[activeSkill];
    if (!toolMap || !toolMap[tier]) return;
    var info = toolMap[tier];
    var sprite = createSpriteEl(info.sheet, info.x, info.y, 16, 16, 48, 48);
    if (sprite) {
      sprite.className = 'skill-sprite';
      container.appendChild(sprite);
    }
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

  var veinMinerTriggered = false;
  var miningEventActive = false;
  var miningEventTimer = null;

  function updateRockHpBar(idx) {
    var bar = $('rock-hp-bar-' + idx);
    if (!bar) return;
    var fill = bar.querySelector('.rock-hp-fill');
    if (!fill) return;
    var rs = rockState[idx];
    fill.style.width = (rs.hp / rs.maxHp * 100) + '%';
  }

  function onMineClick(e) {
    if (miningCooldown) return;
    if (miningEventActive) return;
    var rock = e.currentTarget;
    if (rock.classList.contains('depleted')) return;

    var idx = parseInt(rock.getAttribute('data-idx'));
    var res = getHighestResource('mining');
    var now = Date.now();
    var rs = rockState[idx];
    var log = getMiningLog();
    log.totalClicks++;

    // A1: Combo tracking (freeze during events)
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
      var dustMult = getDustMult() * comboMult;

      if (rs.hp > 0) {
        // Partial hit — award fraction of XP/dust, keep combo, don't deplete
        var partialXp = Math.max(1, Math.floor(res.xp * getStarShowerMult() / rs.maxHp));
        var partialDust = Math.max(1, Math.floor(res.dust * dustMult / rs.maxHp));
        if (area) {
          spawnParticle(area, '+' + partialXp + ' XP', 'xp');
          setTimeout(function () { spawnParticle(area, '+' + partialDust + ' SD', 'dust'); }, 150);
        }
        addXp('mining', partialXp);
        if (window.StarDust) window.StarDust.add(partialDust);
        animatePetAction('pet-bounce');
        miningCooldown = false;
        renderSkillList();
        renderRightPanel();
        return;
      }

      // Rock depleted — full rewards
      log.oresMined[res.name] = (log.oresMined[res.name] || 0) + 1;
      var xpGain = Math.floor(res.xp * getStarShowerMult());
      var dustGain = Math.floor(res.dust * dustMult);

      // Perk: Double Strike — 10% chance for 2x yield
      var isDouble = hasPerk('doubleStrike') && Math.random() < 0.10;
      if (isDouble) {
        xpGain *= 2;
        dustGain *= 2;
        if (area) spawnParticle(area, '2x!', 'dust');
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
        dustGain *= gemMult;
        if (area) {
          var gem = GEM_SPRITES[Math.floor(Math.random() * GEM_SPRITES.length)];
          spawnSpriteParticle(area, gem.sheet || 'gems', gem.x, gem.y);
          spawnParticle(area, 'GEM! +' + dustGain + ' SD', 'gem');
        }
        addLog('Found a gem! ' + gemMult + 'x dust bonus!');
      }

      if (area) {
        spawnParticle(area, '+' + xpGain + ' XP', 'xp');
        if (!isGem) {
          var orePos = ORE_DROP_SPRITES[res.name];
          if (orePos) spawnSpriteParticle(area, orePos.sheet || 'ores', orePos.x, orePos.y);
          setTimeout(function () {
            spawnParticle(area, '+' + dustGain + ' SD', 'dust');
          }, 200);
        }
      }

      addXp('mining', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);
      addLog('Mined ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)');

      // 6B: Add ore to inventory
      var oreQty = isDouble ? 2 : 1;
      addItem(res.name, oreQty);
      addLog('+' + oreQty + ' ' + res.name);

      onAction('mining', dustGain);
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
          rock.classList.remove('depleted');
          if (timerEl.parentNode) timerEl.parentNode.removeChild(timerEl);
          // Reset HP
          rs.hp = rs.maxHp;
          updateRockHpBar(idx);
        } else {
          timerEl.textContent = remaining + 's';
        }
      }, 1000);

      // Perk: Vein Miner
      if (hasPerk('veinMiner') && !veinMinerTriggered && Math.random() < 0.20) {
        veinMinerTriggered = true;
        var allRocks = document.querySelectorAll('.mining-rock:not(.depleted)');
        if (allRocks.length > 0) {
          var target = allRocks[Math.floor(Math.random() * allRocks.length)];
          setTimeout(function () {
            target.click();
            veinMinerTriggered = false;
          }, 400);
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

  function createEventRock(cssClass, label, timeLimit) {
    var area = $('skills-game-area');
    if (!area) return null;
    var rock = document.createElement('div');
    rock.className = 'mining-event-rock ' + cssClass;
    rock.innerHTML = '<div class="mining-event-label">' + label + '</div>';

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
    var rock = createEventRock('gem-vein', 'Gem Vein!', 10000);
    if (!rock) { cleanupEvent(); return; }

    rock.addEventListener('click', function () {
      getMiningLog().events.gemVein++;
      getMiningLog().totalGems += 3;
      var area = $('skills-game-area');
      var res = getHighestResource('mining');
      var dustMult = getDustMult();
      // 3 guaranteed gems
      for (var i = 0; i < 3; i++) {
        var gemMult = hasPerk('gemSpec') ? 10 : 5;
        var dustGain = Math.floor(res.dust * dustMult * gemMult);
        if (window.StarDust) window.StarDust.add(dustGain);
        // 6B: Add random gem to inventory
        var gemIdx = Math.floor(Math.random() * GEM_NAMES.length);
        addItem(GEM_NAMES[gemIdx], 1);
        if (area) {
          var gem = GEM_SPRITES[Math.floor(Math.random() * GEM_SPRITES.length)];
          spawnSpriteParticle(area, gem.sheet || 'gems', gem.x, gem.y);
        }
      }
      var totalDust = Math.floor(res.dust * dustMult * (hasPerk('gemSpec') ? 10 : 5) * 3);
      addLog('Gem Vein! Found 3 gems! (+' + totalDust + ' SD)');
      if (area) spawnParticle(area, '3 GEMS! +' + totalDust + ' SD', 'gem');
      cleanupEvent();
      renderRightPanel();
    });

    miningEventTimer = setTimeout(function () {
      addLog('Gem Vein vanished...');
      cleanupEvent();
    }, 10000);
  }

  function triggerShootingStar() {
    var rock = createEventRock('shooting-star', 'Shooting Star!', 8000);
    if (!rock) { cleanupEvent(); return; }

    var starHp = { hp: 3, maxHp: 3 };

    // Add HP bar
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
        var res = getHighestResource('mining');
        var xpGain = Math.floor(res.xp * getStarShowerMult() * 10);
        addXp('mining', xpGain);
        addLog('Shooting Star mined! 10x XP bonus! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '+' + xpGain + ' XP (10x!)', 'xp');
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
      rock.addEventListener('click', (function (el) {
        return function () {
          if (el.classList.contains('clicked')) return;
          el.classList.add('clicked');
          clicked++;
          if (clicked >= total) {
            getMiningLog().events.caveIn++;
            var res = getHighestResource('mining');
            var dustGain = Math.floor(res.dust * getDustMult() * 5);
            if (window.StarDust) window.StarDust.add(dustGain);
            // 6B: Add ore to inventory
            addItem(res.name, 1);
            addLog('Cave-In survived! 5x dust bonus! (+' + dustGain + ' SD)');
            if (area) spawnParticle(area, '5x! +' + dustGain + ' SD', 'dust');
            cleanupEvent();
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
      }
      cleanupEvent();
    }, 5000);
  }

  function triggerDeepVein() {
    var rock = createEventRock('deep-vein', 'Deep Vein!', 15000);
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
        var res = getHighestResource('mining');
        var xpGain = Math.floor(res.xp * getStarShowerMult() * 5);
        addXp('mining', xpGain);
        addLog('Deep Vein mined! 5x XP bonus! (+' + xpGain + ' XP)');
        if (area) spawnParticle(area, '+' + xpGain + ' XP (5x!)', 'xp');
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
  function renderFishing() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'fishing-area';
    div.innerHTML =
      '<div class="fishing-water">' +
        '<div class="fishing-line" id="fishing-line"></div>' +
        '<div class="fishing-bobber" id="fishing-bobber"><span class="fishing-bobber-emoji">\uD83C\uDFA3</span></div>' +
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

    // 6B: Add fish to inventory
    addItem(res.name, 1);
    addLog('+1 ' + res.name);

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
      // Phase 3: Fish sprite particle
      var fishPos = FISH_SPRITES[res.name];
      if (fishPos) spawnSpriteParticle(gameArea, fishPos.sheet || 'fish', fishPos.x, fishPos.y);
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
      '<div class="wc-tree" id="wc-tree"></div>' +
      '<div class="wc-hits-bar"><div class="wc-hits-fill" id="wc-hits-fill" style="width:0%"></div></div>' +
      '<div class="wc-hit-count" id="wc-hit-count">0 / ' + hitsNeeded + ' chops</div>';
    area.appendChild(div);

    // Phase 3: Tree sprite
    var treeEl = $('wc-tree');
    var treePos = TREE_SPRITES[res.name] || { x: 0, y: 36, w: 32, h: 60 };
    var treeSprite = createSpriteEl('trees', treePos.x, treePos.y, treePos.w, treePos.h, 72, 135);
    if (treeSprite) {
      treeSprite.className = 'skill-sprite wc-tree-sprite';
      treeEl.appendChild(treeSprite);
    } else {
      treeEl.textContent = '\uD83C\uDF33';
    }
    treeEl.addEventListener('click', onChopClick);

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

      // 6B: Add log to inventory
      var logName = LOG_NAMES[res.name] || (res.name + ' Log');
      addItem(logName, 1);
      addLog('+1 ' + logName);

      addLog('Chopped ' + res.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)');

      var gameArea2 = $('skills-game-area');
      if (gameArea2) {
        // Phase 3: Wood log sprite particle
        var woodDrop = WOOD_DROP_SPRITES[Math.floor(Math.random() * WOOD_DROP_SPRITES.length)];
        spawnSpriteParticle(gameArea2, woodDrop.sheet || 'wood', woodDrop.x, woodDrop.y);
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
  // ── SMITHING MINI-GAME (Phase 6C: Smelting + Forging) ──
  // ══════════════════════════════════════════════
  function renderSmithing() {
    var area = $('skills-game-area');
    if (!area) return;
    area.innerHTML = '';

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
    var furnaceSprite = createSpriteEl('furnace', 0, 0, 16, 16, 64, 64);
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

    // Check if temperature is in the green zone
    var zoneHeight = Math.max(10, 35 - (idx * 3.5));
    var zoneBottom = Math.floor(50 - zoneHeight / 2);
    var zoneTop = zoneBottom + zoneHeight;
    var temp = smithingState.smeltTemp;
    var inZone = temp >= zoneBottom && temp <= zoneTop;

    // Perfect = within middle 30% of zone
    var zoneMid = zoneBottom + zoneHeight / 2;
    var perfectRange = zoneHeight * 0.15;
    var isPerfect = Math.abs(temp - zoneMid) <= perfectRange;

    var progress = $('smelt-progress');
    var status = $('smelt-status');

    if (!inZone) {
      if (progress) progress.textContent = 'Temperature missed! Try again...';
      if (status) status.textContent = temp < zoneBottom ? 'Too cold!' : 'Too hot!';
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

    consumeSmeltingOres(barName);
    addItem(barName, 1);
    updateSmeltMats();

    var bonusMult = isPerfect ? 5 : 1;
    var xpGain = Math.floor(res.xp * bonusMult * getStarShowerMult());
    var dustGain = Math.floor(res.dust * bonusMult * getDustMult());

    addXp('smithing', xpGain);
    if (window.StarDust) window.StarDust.add(dustGain);

    var logText = isPerfect
      ? 'PERFECT SMELT! ' + barName + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)'
      : 'Smelted ' + barName + ' (+' + xpGain + ' XP, +' + dustGain + ' SD)';
    addLog(logText);

    var gameArea = $('skills-game-area');
    if (gameArea) {
      var barPos = BAR_DROP_SPRITES[barName];
      if (barPos) spawnSpriteParticle(gameArea, barPos.sheet || 'ores', barPos.x, barPos.y);
      spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
      setTimeout(function () { spawnParticle(gameArea, '+' + dustGain + ' SD', 'dust'); }, 200);
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
    if (status) status.textContent = '+' + xpGain + ' XP, +' + dustGain + ' SD';

    onAction('smithing', dustGain);
    animatePetAction('pet-bounce');

    // Furnace glow
    var furnace = $('smelt-furnace');
    if (furnace) {
      furnace.classList.add('smelting-glow');
      setTimeout(function () { furnace.classList.remove('smelting-glow'); }, 600);
    }

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
    var speed = 1.5;
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

    // Get zone bounds
    var zone = $('smithing-zone');
    var zoneLeft = zone ? parseFloat(zone.style.left) : 35;
    var zoneWidth = zone ? parseFloat(zone.style.width) : 30;
    var zoneRight = zoneLeft + zoneWidth;

    var inZone = smithingState.cursorPos >= zoneLeft && smithingState.cursorPos <= zoneRight;
    smithingState.hits++;
    if (inZone) smithingState.bonusHits++;

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

      var recipe = getSelectedForgeRecipe();

      // Check materials and stack cap
      if (!canForge(recipe) || getItemCount(recipe.name) >= STACK_CAP) {
        if (progress) progress.textContent = !canForge(recipe) ? 'Not enough materials!' : 'Item stack is full (999)!';
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
      consumeForgingMats(recipe);
      addItem(recipe.name, 1);
      updateForgeMats();

      // Masterwork check (5/5 perfect)
      var isMasterwork = smithingState.bonusHits >= 5;
      var bonusMult = isMasterwork ? 5 : (1 + (smithingState.bonusHits * 0.25));
      var xpGain = Math.floor(recipe.xp * bonusMult * getStarShowerMult());
      var dustGain = Math.floor(recipe.dust * bonusMult * getDustMult());

      addXp('smithing', xpGain);
      if (window.StarDust) window.StarDust.add(dustGain);

      var logText = isMasterwork
        ? 'MASTERWORK! Forged ' + recipe.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD) [5/5 perfect]'
        : 'Forged ' + recipe.name + ' (+' + xpGain + ' XP, +' + dustGain + ' SD) [' + smithingState.bonusHits + '/5 perfect]';
      addLog(logText);

      var gameArea = $('skills-game-area');
      if (gameArea) {
        // Item sprite particle
        if (recipe.sprite) {
          spawnSpriteParticle(gameArea, 'items_sheet', recipe.sprite.x, recipe.sprite.y);
        }
        spawnParticle(gameArea, '+' + xpGain + ' XP', 'xp');
        setTimeout(function () { spawnParticle(gameArea, '+' + dustGain + ' SD', 'dust'); }, 200);
      }

      // Masterwork flash
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

      onAction('smithing', dustGain);
      animatePetAction('pet-bounce');

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
    miningEventActive = false;
    if (miningEventTimer) { clearTimeout(miningEventTimer); miningEventTimer = null; }
    if (fishingState.timer) clearTimeout(fishingState.timer);
    if (fishingState.biteTimeout) clearTimeout(fishingState.biteTimeout);
    if (fishingState.castTimer) clearInterval(fishingState.castTimer);
    fishingState = { phase: 'idle', timer: null, biteTimeout: null, biteStartTime: 0, castStartTime: 0, castTimer: null };
    wcState = { hits: 0, hitsNeeded: 0, cooldown: false, lastChopTime: 0 };
    if (smithingState.cursorTimer) clearInterval(smithingState.cursorTimer);
    if (smithingState.smeltTimer) clearInterval(smithingState.smeltTimer);
    if (smithingState.cooldownTimer) clearTimeout(smithingState.cooldownTimer);
    var prevMode = smithingState.mode || 'smelting';
    smithingState = { phase: 'idle', hits: 0, cursorPos: 0, cursorDir: 1, cursorTimer: null, bonusHits: 0, mode: prevMode, smeltTemp: 0, smeltTimer: null, smeltHolding: false, cooldownTimer: null };
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
      if (elapsed < 300000) continue; // 5 min minimum before idle report

      var actionInterval = 30000 / (1 + s.level * 0.02);
      var actions = Math.floor(elapsed / actionInterval);
      if (actions <= 0) continue;

      var res = getHighestResource(key);
      var tierMult = getTierMult(s.assignedPet);
      var typeBonus = getTypeBonus(s.assignedPet, key);

      var xpPerAction = Math.floor(res.xp * tierMult * typeBonus);
      var dustPerAction = Math.floor(res.dust * tierMult * typeBonus);

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
      var matText = r.materials ? ' + ' + r.materials.qty + ' ' + r.materials.name : '';
      if (r.smelted) matText += ' + Smelted: ' + r.smelted;
      text.textContent = petName + ' earned ' + formatNum(r.xp) + ' ' + SKILLS[r.skill].name + ' XP + ' + formatNum(r.dust) + ' SD' + matText;
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

        var xp = Math.floor(res.xp * tierMult * typeBonus * 0.5);
        var dust = Math.floor(res.dust * tierMult * typeBonus * 0.5);

        if (xp > 0) addXp(key, xp);
        if (dust > 0 && window.StarDust) window.StarDust.add(dust);

        if (key === activeSkill && (xp > 0 || dust > 0)) {
          spawnAutoFloat('+' + xp + ' XP +' + dust + ' SD');
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
