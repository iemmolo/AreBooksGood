(function () {
  'use strict';

  var gridEl = document.getElementById('fp-grid');
  if (!gridEl) return;

  var resourcesEl = document.getElementById('fp-resources');
  var compactEl = document.getElementById('fp-resources-compact');
  var sidebarEl = document.getElementById('fp-sidebar');
  var toggleBtn = document.getElementById('fp-toggle');
  var UPDATE_INTERVAL = 10000; // 10s
  var COLLAPSE_KEY = 'arebooksgood-farm-page-collapsed';
  var DOG_UNLOCK_KEY = 'arebooksgood-farm-dogs';
  var DOG_BREEDS = ['Labrador', 'Beagle', 'Husky', 'Dalmatian', 'Corgi', 'Poodle', 'Bulldog', 'Shiba Inu', 'Retriever'];
  var prevCounts = {};
  var prevStages = {};
  var stationPopupEl = null;

  // ── Grid layout constant (6 cols × 15 rows, portrait) ────
  var GRID_LAYOUT = [
    { key: 'farmhouse',   name: 'Farmhouse',    row: 0, col: 0, rowSpan: 2, colSpan: 4, type: 'special' },
    { key: 'crop8',       name: 'Crops',         row: 0, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop9',       name: 'Crops',         row: 0, col: 5, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop10',      name: 'Crops',         row: 1, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop11',      name: 'Crops',         row: 1, col: 5, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop0',       name: 'Crops',         row: 2, col: 3, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop1',       name: 'Crops',         row: 2, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop2',       name: 'Crops',         row: 2, col: 5, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop12',      name: 'Crops',         row: 3, col: 2, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop13',      name: 'Crops',         row: 3, col: 3, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop4',       name: 'Crops',         row: 4, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop5',       name: 'Crops',         row: 4, col: 5, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop14',      name: 'Crops',         row: 4, col: 2, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop15',      name: 'Crops',         row: 4, col: 3, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop6',       name: 'Crops',         row: 3, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop7',       name: 'Crops',         row: 3, col: 5, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'dogHouse',   name: 'Dog House',   row: 3, col: 1, rowSpan: 1, colSpan: 1, type: 'special' },
    { key: 'chickenCoop', name: 'Chicken Coop',  row: 5, col: 0, rowSpan: 2, colSpan: 2, type: 'gathering' },
    { key: 'cowPasture',  name: 'Cow Pasture',   row: 5, col: 2, rowSpan: 2, colSpan: 2, type: 'gathering' },
    { key: 'sheepPen',    name: 'Sheep Pen',     row: 5, col: 4, rowSpan: 2, colSpan: 2, type: 'gathering' },
    // Row 7: empty gap
    // Combo buildings (gathering + processing merged, 2×2)
    { key: 'lumberMill',  name: 'Lumber Mill',   row: 9,  col: 4, rowSpan: 1, colSpan: 2, type: 'combo' },
    { key: 'stoneworks',  name: 'Stoneworks',    row: 9,  col: 0, rowSpan: 2, colSpan: 2, type: 'combo' },
    { key: 'smithy',      name: 'Smithy',        row: 12, col: 0, rowSpan: 2, colSpan: 3, type: 'combo' },
    // Standalone gathering
    { key: 'deepMine',    name: 'Deep Mine',     row: 14, col: 3, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'oldGrowth',   name: 'Old Growth',    row: 14, col: 4, rowSpan: 1, colSpan: 1, type: 'gathering' },
    // Standalone processing
    { key: 'kitchen',     name: 'Kitchen',       row: 13, col: 3, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'loom',        name: 'Loom',          row: 13, col: 4, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'mill',        name: 'Mill',          row: 9,  col: 2, rowSpan: 2, colSpan: 2, type: 'processing', tier: 'basic' },
    { key: 'smokehouse',  name: 'Smokehouse',    row: 14, col: 2, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'enchanter',   name: 'Enchanter',     row: 12, col: 5, rowSpan: 3, colSpan: 1, type: 'processing', tier: 'elite' },
    { key: 'fishingPond', name: 'Fishing Pond',  row: 14, col: 0, rowSpan: 2, colSpan: 2, type: 'gathering' }
  ];

  // ── Building requirements (JB cost + farmhouse level gate) ──
  var BUILDING_REQS = {
    // Starter crops (free, farmhouse Lv1) — top-right 2×2 next to farmhouse
    crop8:       { cost: 0,   minFH: 1 },
    crop9:       { cost: 0,   minFH: 1 },
    crop10:      { cost: 0,   minFH: 1 },
    crop11:      { cost: 0,   minFH: 1 },
    // Tier 2 crops (farmhouse Lv2, 25 JB each) — row below, 3 plots
    crop0:       { cost: 25,  minFH: 2 },
    crop1:       { cost: 25,  minFH: 2 },
    crop2:       { cost: 25,  minFH: 2 },
    // Tier 3 crops (farmhouse Lv3, 50 JB each) — row 3, 4 plots
    crop12:      { cost: 50,  minFH: 3 },
    crop13:      { cost: 50,  minFH: 3 },
    crop6:       { cost: 50,  minFH: 3 },
    crop7:       { cost: 50,  minFH: 3 },
    // Tier 4 crops (farmhouse Lv4, 75 JB each) — row 4 left
    crop14:      { cost: 75,  minFH: 4 },
    crop15:      { cost: 75,  minFH: 4 },
    // Tier 5 crops (farmhouse Lv5, 100 JB each) — row 4 right
    crop4:       { cost: 100, minFH: 5 },
    crop5:       { cost: 100, minFH: 5 },
    // Starter buildings (free, farmhouse Lv1)
    lumberMill:  { cost: 0,   minFH: 1 },
    stoneworks:  { cost: 0,   minFH: 1 },
    fishingPond: { cost: 0,   minFH: 1 },
    mill:        { cost: 0,   minFH: 1 },
    kitchen:     { cost: 0,   minFH: 1 },
    // Tier 2 buildings (farmhouse Lv2)
    chickenCoop: { cost: 50,  minFH: 2 },
    cowPasture:  { cost: 75,  minFH: 2 },
    sheepPen:    { cost: 75,  minFH: 2 },
    // Tier 3 buildings (farmhouse Lv3)
    smithy:      { cost: 150, minFH: 3 },
    smokehouse:  { cost: 100, minFH: 3 },
    loom:        { cost: 100, minFH: 3 },
    // Tier 4 buildings (farmhouse Lv4)
    deepMine:    { cost: 200, minFH: 4 },
    oldGrowth:   { cost: 150, minFH: 4 },
    // Tier 2 special buildings
    dogHouse:    { cost: 100, minFH: 2 },
    // Tier 5 buildings (farmhouse Lv5)
    enchanter:   { cost: 300, minFH: 5 }
  };

  // ── Layout helpers ──────────────────────────────────────────
  function getActiveLayout() {
    return GRID_LAYOUT;
  }

  // ── PNG sprite paths (farm page grid only) ──────────────────
  var FARM_IMG = '/images/farm';
  var STATION_IMG = {
    mill: FARM_IMG + '/stations/mill.png',
    kitchen: FARM_IMG + '/stations/kitchen.png',
    loom: FARM_IMG + '/stations/loom.png',
    smokehouse: FARM_IMG + '/stations/smokehouse.png',
    enchanter: FARM_IMG + '/stations/enchanter.png',
    chickenCoop: FARM_IMG + '/stations/chickenCoop.png',
    cowPasture: FARM_IMG + '/stations/cowPasture.png',
    sheepPen: FARM_IMG + '/stations/sheepPen.png',
    lumberMill: FARM_IMG + '/stations/lumberMill.png',
    stoneworks: FARM_IMG + '/stations/stoneworks.png',
    smithy: FARM_IMG + '/stations/smithy.png',
    deepMine: FARM_IMG + '/stations/deepMine.png',
    oldGrowth: FARM_IMG + '/stations/oldGrowth.png',
    dogHouse: FARM_IMG + '/stations/dogHouse.png',
    fishingPond: null  // background-painted
  };

  // ── Animated station sprites (processing state) ──────────────
  var STATION_ANIM = {
    loom:       { src: FARM_IMG + '/animations/loom.png', frames: 8, frameW: 32, frameH: 32, totalW: 256 },
    smokehouse: { src: FARM_IMG + '/animations/smokehouse.png', frames: 5, frameW: 32, frameH: 32, totalW: 160 },
    kitchen:    { src: FARM_IMG + '/animations/kitchen.png', frames: 4, frameW: 32, frameH: 32, totalW: 128 },
    deepMine:   { src: FARM_IMG + '/animations/deepMine.png', frames: 4, frameW: 16, frameH: 16, totalW: 64 },
    oldGrowth:  { src: FARM_IMG + '/animations/oldGrowth.png', frames: 2, frameW: 47, frameH: 48, totalW: 94 }
  };

  var STAGE_NUM = { planted: 1, sprouting: 2, growing: 3, flowering: 4, ready: 5 };

  function createFarmImg(src, alt) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = 'fp-sprite-img';
    img.draggable = false;
    return img;
  }

  // ── Icons for each cell type ──────────────────────────────
  var ICONS = {
    farmhouse: '\uD83C\uDFE0', // house
    crop0: '\uD83C\uDF3E', crop1: '\uD83C\uDF3E', crop2: '\uD83C\uDF3E',
    crop4: '\uD83C\uDF3E', crop5: '\uD83C\uDF3E',
    crop6: '\uD83C\uDF3E', crop7: '\uD83C\uDF3E',
    crop8: '\uD83C\uDF3E', crop9: '\uD83C\uDF3E',
    crop10: '\uD83C\uDF3E', crop11: '\uD83C\uDF3E',
    crop12: '\uD83C\uDF3E', crop13: '\uD83C\uDF3E',
    crop14: '\uD83C\uDF3E', crop15: '\uD83C\uDF3E',
    mill: '\u2699',        // gear
    kitchen: '\uD83C\uDF73',   // cooking
    loom: '\uD83E\uDDF5',      // thread
    smokehouse: '\uD83C\uDF56', // meat
    enchanter: '\u2728',   // sparkles
    chickenCoop: '\uD83D\uDC14', // chicken
    cowPasture: '\uD83D\uDC04',  // cow
    sheepPen: '\uD83D\uDC11',   // sheep
    lumberMill: '\uD83E\uDEB5', // wood
    stoneworks: '\u26CF',  // pick
    smithy: '\uD83D\uDD25',     // fire
    deepMine: '\uD83D\uDC8E',   // gem
    oldGrowth: '\uD83C\uDF33',  // tree
    dogHouse: '\uD83D\uDC15',    // dog
    fishingPond: '\uD83C\uDFA3' // fishing
  };

  // ── Resource display config ───────────────────────────────
  var RESOURCE_GROUPS = [
    {
      label: 'Gathering',
      items: [
        { key: 'wood', name: 'Wood', icon: '\uD83E\uDEB5' },
        { key: 'stone', name: 'Stone', icon: '\u26CF' },
        { key: 'fish', name: 'Fish', icon: '\uD83D\uDC1F' },
        { key: 'hardwood', name: 'Hardwood', icon: '\uD83C\uDF33' },
        { key: 'iron', name: 'Iron', icon: '\uD83E\uDEA8' },
        { key: 'gold', name: 'Gold', icon: '\uD83D\uDC8E' }
      ]
    },
    {
      label: 'Animals',
      items: [
        { key: 'eggs', name: 'Eggs', icon: '\uD83E\uDD5A' },
        { key: 'milk', name: 'Milk', icon: '\uD83E\uDD5B' },
        { key: 'wool', name: 'Wool', icon: '\uD83E\uDDF6' }
      ]
    },
    {
      label: 'Crops',
      items: [
        { key: 'wheat', name: 'Wheat', icon: '\uD83C\uDF3E' },
        { key: 'carrot', name: 'Carrot', icon: '\uD83E\uDD55' },
        { key: 'potato', name: 'Potato', icon: '\uD83E\uDD54' },
        { key: 'tomato', name: 'Tomato', icon: '\uD83C\uDF45' },
        { key: 'corn', name: 'Corn', icon: '\uD83C\uDF3D' },
        { key: 'pumpkin', name: 'Pumpkin', icon: '\uD83C\uDF83' },
        { key: 'golden_apple', name: 'Golden Apple', icon: '\uD83C\uDF4E' },
        { key: 'crystal_herb', name: 'Crystal Herb', icon: '\uD83D\uDD2E' },
        { key: 'dragon_fruit', name: 'Dragon Fruit', icon: '\uD83D\uDC09' }
      ]
    },
    {
      label: 'Processed',
      items: [
        { key: 'flour', name: 'Flour', icon: '\uD83C\uDF5E' },
        { key: 'planks', name: 'Planks', icon: '\uD83E\uDE93' },
        { key: 'stoneBricks', name: 'Stone Bricks', icon: '\uD83E\uDDF1' },
        { key: 'bread', name: 'Bread', icon: '\uD83E\uDD56' },
        { key: 'ironBars', name: 'Iron Bars', icon: '\uD83D\uDD17' },
        { key: 'rope', name: 'Rope', icon: '\uD83E\uDDF5' },
        { key: 'smokedFish', name: 'Smoked Fish', icon: '\uD83C\uDF56' },
        { key: 'crystalLens', name: 'Crystal Lens', icon: '\uD83D\uDD2E' }
      ]
    }
  ];

  // ── Track which cells are occupied by multi-span buildings ─
  function buildOccupiedMap(layout) {
    var map = {};
    for (var i = 0; i < layout.length; i++) {
      var item = layout[i];
      var rs = item.rowSpan || 1;
      var cs = item.colSpan || 1;
      for (var r = item.row; r < item.row + rs; r++) {
        for (var c = item.col; c < item.col + cs; c++) {
          map[r + ',' + c] = item.key;
        }
      }
    }
    return map;
  }

  // Build set of valid crop plot indices from the grid layout
  var CROP_INDICES = [];
  for (var ci = 0; ci < GRID_LAYOUT.length; ci++) {
    if (GRID_LAYOUT[ci].type === 'crop') {
      CROP_INDICES.push(parseInt(GRID_LAYOUT[ci].key.replace('crop', ''), 10));
    }
  }

  var occupiedMap = buildOccupiedMap(getActiveLayout());

  // ── Helper: current farmhouse level ─────────────────────────
  function getCurrentFHLevel() {
    return (window.FarmAPI && window.FarmAPI.getFarmhouseLevel) ? window.FarmAPI.getFarmhouseLevel() : 1;
  }

  // ── Determine if a station/building is built ──────────────
  function isCellBuilt(item) {
    if (item.key === 'farmhouse' || item.key.indexOf('forest') === 0) return true;
    var req = BUILDING_REQS[item.key];
    // Farmhouse level gate — not high enough = locked regardless
    if (req && getCurrentFHLevel() < req.minFH) return false;
    // Crop plots: free ones auto-unlock, paid ones need JB purchase
    if (item.type === 'crop') {
      if (req && req.cost === 0) return true;
      return window.FarmAPI && window.FarmAPI.isCropPlotUnlocked && window.FarmAPI.isCropPlotUnlocked(item.key);
    }
    // Starter buildings (cost 0) are always built
    if (req && req.cost === 0) return true;
    // TD blueprint earned + FH met → auto-build
    if (window.FarmResources && window.FarmResources.hasFarmBlueprint && window.FarmResources.hasFarmBlueprint(item.key)) {
      if (!window.FarmResources.isStationBuilt(item.key)) {
        window.FarmResources.buildStation(item.key);
      }
      return true;
    }
    // Non-starter stations: check FarmResources built flag
    if (window.FarmResources && window.FarmResources.isStationBuilt) {
      return window.FarmResources.isStationBuilt(item.key);
    }
    return false;
  }

  // ── Dog unlock state (localStorage) ──────────────────────
  function getUnlockedDogs() {
    try {
      var raw = localStorage.getItem(DOG_UNLOCK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function setUnlockedDogs(arr) {
    try { localStorage.setItem(DOG_UNLOCK_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  // ── Get resource count for a station ──────────────────────
  function getStationCount(item) {
    if (!window.FarmResources) return 0;
    var stations = window.FarmResources.getStations();
    var station = stations[item.key];
    if (!station) return 0;
    return window.FarmResources.getRaw(station.resource);
  }

  // ── Get crop info for a plot ──────────────────────────────
  function getCropInfo(plotIndex) {
    if (!window.FarmAPI) return null;
    var plots = window.FarmAPI.getPlots();
    if (plotIndex >= plots.length) return null;
    return plots[plotIndex];
  }

  // ── Render the grid ───────────────────────────────────────
  function renderGrid() {
    // Detach farm pet before clearing grid so it survives re-render
    if (fpPetEl && fpPetEl.parentNode === gridEl) {
      gridEl.removeChild(fpPetEl);
    }
    gridEl.innerHTML = '';

    // Background as <img> so image-rendering: pixelated works reliably
    var bgImg = document.createElement('img');
    bgImg.src = '/images/farm/ground/grass.png';
    bgImg.className = 'fp-grid-bg';
    bgImg.alt = '';
    bgImg.draggable = false;
    gridEl.appendChild(bgImg);

    var rendered = {};

    var activeLayout = getActiveLayout();
    occupiedMap = buildOccupiedMap(activeLayout);

    // Render defined layout items
    for (var i = 0; i < activeLayout.length; i++) {
      var item = activeLayout[i];
      if (rendered[item.key]) continue;
      rendered[item.key] = true;

      var cell = document.createElement('div');
      cell.className = 'fp-cell';
      cell.setAttribute('data-key', item.key);

      // Grid positioning
      cell.style.gridRow = (item.row + 1) + ' / span ' + (item.rowSpan || 1);
      cell.style.gridColumn = (item.col + 1) + ' / span ' + (item.colSpan || 1);

      var built = isCellBuilt(item);

      // Type-specific classes
      if (item.key === 'farmhouse') {
        cell.classList.add('fp-cell-farmhouse');
      } else if (item.key.indexOf('forest') === 0) {
        cell.classList.add('fp-cell-forest');
      } else if (item.key === 'fishingPond') {
        cell.classList.add('fp-cell-pond');
      } else if (item.type === 'crop') {
        cell.classList.add('fp-cell-crop');
      } else if (item.type === 'processing') {
        cell.classList.add('fp-cell-processing');
      } else if (item.type === 'combo') {
        cell.classList.add('fp-cell-combo');
      } else if (item.type === 'gathering') {
        cell.classList.add('fp-cell-gathering');
      }

      if (built && item.type !== 'crop') {
        cell.classList.add('fp-cell-built');
      } else if (!built) {
        cell.classList.add('fp-cell-locked');
        // Mark cells that meet the farmhouse level gate as unlockable
        var bReq = BUILDING_REQS[item.key];
        if (bReq && getCurrentFHLevel() >= bReq.minFH) {
          cell.classList.add('fp-cell-unlockable');
        }
      }

      // Icon
      var iconEl = document.createElement('div');
      iconEl.className = 'fp-cell-icon';
      if (!built) {
        iconEl.textContent = '';
        var lockImg = createFarmImg(FARM_IMG + '/ui/lock.png', 'Locked');
        lockImg.className = 'fp-lock-img';
        cell.appendChild(lockImg);
      } else {
        iconEl.textContent = ICONS[item.key] || '';

        // Background-painted cells — no sprite or icon
        if (item.key === 'fishingPond' || item.key.indexOf('forest') === 0) {
          iconEl.textContent = '';
        }

        // Render PNG sprites for built stations/farmhouse
        if (item.key === 'farmhouse') {
          var fhLevel = (window.FarmAPI && window.FarmAPI.getFarmhouseLevel) ? window.FarmAPI.getFarmhouseLevel() : 1;
          iconEl.textContent = '';
          cell.appendChild(createFarmImg(FARM_IMG + '/houses/farmhouse-' + fhLevel + '.png', 'Farmhouse'));
        } else if (item.type !== 'crop' && STATION_IMG[item.key]) {
          iconEl.textContent = '';
          // Check if station is actively processing and has animation
          var isProcessing = false;
          if (item.type === 'processing' && window.FarmResources) {
            var q = window.FarmResources.getQueue(item.key);
            isProcessing = q.length > 0 && !q[0].waiting;
          }
          if (STATION_ANIM[item.key] && (isProcessing || item.key !== 'kitchen')) {
            // Use animation div (always for most stations, only when processing for kitchen)
            var animDiv = document.createElement('div');
            animDiv.className = 'fp-station-anim fp-station-anim-' + item.key;
            if (isProcessing || item.type === 'gathering') animDiv.classList.add('fp-station-active');
            cell.appendChild(animDiv);
          } else {
            cell.appendChild(createFarmImg(STATION_IMG[item.key], item.name));
          }
        }
      }
      cell.appendChild(iconEl);

      // Label (skip for locked cells — lock icon is sufficient)
      if (built) {
        var labelEl = document.createElement('div');
        labelEl.className = 'fp-cell-label';
        labelEl.textContent = item.name;
        cell.appendChild(labelEl);
      }

      // Processing indicator
      if (built && (item.type === 'processing' || item.type === 'combo') && window.FarmResources) {
        var pQueue = window.FarmResources.getQueue(item.key);
        if (pQueue.length > 0 && !pQueue[0].waiting) {
          cell.classList.add('fp-cell-processing-active');
          var indEl = document.createElement('div');
          indEl.className = 'fp-cell-processing-indicator';
          indEl.id = 'fp-proc-' + item.key;
          indEl.textContent = formatMsToMinSec(pQueue[0].remaining || 0);
          cell.appendChild(indEl);
        }
      }

      // Crop progress + pixel art sprites (only when unlocked)
      if (item.type === 'crop' && built) {
        var plotIdx = parseInt(item.key.replace('crop', ''), 10);
        var cropInfo = getCropInfo(plotIdx);
        if (cropInfo && cropInfo.crop) {
          cell.classList.add('fp-cell-built');
          // Render PNG crop sprite
          var stageNum = STAGE_NUM[cropInfo.stage] || 1;
          iconEl.textContent = '';
          cell.appendChild(createFarmImg(FARM_IMG + '/crops/' + cropInfo.crop + '-' + stageNum + '.png', cropInfo.crop));
          // Track stage for dirty checking
          prevStages[plotIdx] = cropInfo.stage;
          // Glow ramp class for current stage
          cell.classList.add('fp-cell-crop-' + cropInfo.stage);
          // Watered indicator
          if (cropInfo.wateredAt) {
            cell.classList.add('fp-cell-watered');
            var droplet = document.createElement('div');
            droplet.className = 'fp-watered-icon';
            droplet.textContent = '\uD83D\uDCA7';
            cell.appendChild(droplet);
          }
        } else {
          // Empty plot styling — show soil tile
          cell.classList.add('fp-cell-crop-empty');
          iconEl.textContent = '';
          var soilImg = createFarmImg(FARM_IMG + '/ground/soil.png', 'Empty plot');
          soilImg.className = 'fp-soil-img';
          cell.appendChild(soilImg);
          prevStages[plotIdx] = null;
        }
      }

      // Farmhouse level (used internally, no visible label)


      // Click handler for built cells + locked cells
      if (built) {
        (function (itm, cel) {
          cel.style.cursor = 'pointer';
          cel.addEventListener('click', function (e) {
            e.stopPropagation();
            openStationPopup(itm, cel);
          });
        })(item, cell);
      } else if (BUILDING_REQS[item.key]) {
        (function (itm, cel) {
          cel.style.cursor = 'pointer';
          cel.addEventListener('click', function (e) {
            e.stopPropagation();
            openLockedPopup(itm, cel);
          });
        })(item, cell);
      }

      gridEl.appendChild(cell);
    }

    // Fill empty cells
    var gridRows = 15;
    var gridCols = 6;
    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        var posKey = r + ',' + c;
        if (occupiedMap[posKey]) continue;
        var empty = document.createElement('div');
        empty.className = 'fp-cell fp-cell-empty';
        empty.style.gridRow = (r + 1) + '';
        empty.style.gridColumn = (c + 1) + '';
        gridEl.appendChild(empty);
      }
    }

    // Add animated decorations based on farmhouse level
    addFarmAnimations();

    // Re-append farm pet after grid rebuild
    if (fpPetEl) {
      gridEl.appendChild(fpPetEl);
      movePetToCell('farmhouse', true);
    }
  }

  // ── Animated farm decorations (unlocked by farmhouse level) ──

  function scheduleSmokeLoop(el) {
    var delay = 3000 + Math.floor(Math.random() * 5000); // 3-8s between puffs
    setTimeout(function () {
      if (!el.parentNode) return; // element removed by re-render
      el.classList.add('fp-anim-puff');
      setTimeout(function () {
        el.classList.remove('fp-anim-puff');
        void el.offsetWidth; // reflow so next puff re-triggers animation
        scheduleSmokeLoop(el);
      }, 2400); // matches animation duration
    }, delay);
  }

  function spawnButterflies(count) {
    for (var i = 0; i < count; i++) {
      var div = document.createElement('div');
      div.className = 'fp-anim fp-anim-butterfly';
      div.style.left = (5 + Math.random() * 90) + '%';
      div.style.top = (2 + Math.random() * 40) + '%';
      div.style.opacity = '0';
      gridEl.appendChild(div);
      // Stagger first appearance over a wide window
      driftButterfly(div, 2000 + Math.floor(Math.random() * 8000));
    }
  }

  function driftButterfly(el, initialDelay) {
    setTimeout(function step() {
      if (!el.parentNode) return;
      // Fade in, drift to new spot
      el.style.opacity = '1';
      el.style.left = (5 + Math.random() * 90) + '%';
      el.style.top = (2 + Math.random() * 40) + '%';
      // After drifting, fade out and rest for a while
      setTimeout(function () {
        if (!el.parentNode) return;
        el.style.opacity = '0';
        var rest = 8000 + Math.floor(Math.random() * 12000); // 8-20s hidden
        setTimeout(step, rest);
      }, 5000 + Math.floor(Math.random() * 3000)); // visible for 5-8s
    }, initialDelay);
  }

  function addFarmAnimations() {
    var fhLevel = (window.FarmAPI && window.FarmAPI.getFarmhouseLevel)
      ? window.FarmAPI.getFarmhouseLevel() : 1;

    var cellW = 100 / 6;   // ~16.67% per column
    var cellH = 100 / 15;  // ~6.67% per row

    function addAnim(className, row, col, rowSpan, colSpan, w, h, extra) {
      var div = document.createElement('div');
      div.className = 'fp-anim ' + className;
      var cx = col * cellW + (colSpan || 1) * cellW / 2;
      var cy = row * cellH + (rowSpan || 1) * cellH / 2;
      div.style.left = cx + '%';
      div.style.top = cy + '%';
      div.style.marginLeft = (-w / 2) + 'px';
      div.style.marginTop = (-h / 2) + 'px';
      if (extra) {
        for (var k in extra) {
          if (extra.hasOwnProperty(k)) div.style[k] = extra[k];
        }
      }
      gridEl.appendChild(div);
      return div;
    }

    // ── Scatter grass tufts on empty green cells ──
    var TUFT_SPRITES = [
      '/images/farm/decorations/grass-tuft-small-1.png',
      '/images/farm/decorations/grass-tuft-small-2.png',
      '/images/farm/decorations/grass-tuft-small-3.png',
      '/images/farm/decorations/grass-tuft-large-1.png',
      '/images/farm/decorations/grass-tuft-large-2.png'
    ];
    // Seeded RNG so tufts stay consistent across re-renders
    var tuftSeed = 42;
    function tuftRng() {
      tuftSeed = (tuftSeed * 16807 + 0) % 2147483647;
      return tuftSeed / 2147483647;
    }
    // Pure-green cells: value = max tufts to place in that cell
    var tuftAllowed = {
      '6,2':1, '6,4':1,
      '7,1':1, '7,3':1, '7,4':1,
      '9,2':2, '9,3':2,
      '10,2':2, '10,3':2,
      '11,2':1, '11,3':1, '12,1':1, '12,2':1, '12,3':1
    };
    for (var gk in tuftAllowed) {
      if (!tuftAllowed.hasOwnProperty(gk)) continue;
      if (occupiedMap[gk]) continue;
      var maxTufts = tuftAllowed[gk];
      var parts = gk.split(',');
      var gr = parseInt(parts[0], 10);
      var gc = parseInt(parts[1], 10);
      for (var ti = 0; ti < maxTufts; ti++) {
        // ~70% chance per slot
        if (tuftRng() > 0.7) continue;
        var isLarge = tuftRng() < 0.25;
        var spriteIdx = isLarge
          ? (3 + Math.floor(tuftRng() * 2))
          : Math.floor(tuftRng() * 3);
        var tuftImg = document.createElement('img');
        tuftImg.src = TUFT_SPRITES[spriteIdx];
        tuftImg.className = 'fp-grass-tuft';
        // Inset position within cell to avoid bleeding into neighbors
        var pad = 0.15;
        var padBot = (gr === 8) ? 0.55 : (gr === 10) ? 0.45 : pad; // row 8: fence; row 10: cliff below
        var tx = gc * cellW + (pad + tuftRng() * (1 - 2 * pad)) * cellW;
        var ty = gr * cellH + (pad + tuftRng() * (1 - pad - padBot)) * cellH;
        tuftImg.style.left = tx + '%';
        tuftImg.style.top = ty + '%';
        if (isLarge) {
          tuftImg.style.width = '32px';
          tuftImg.style.height = '32px';
        }
        if (tuftRng() < 0.5) tuftImg.style.transform = 'scaleX(-1)';
        gridEl.appendChild(tuftImg);
      }
    }


    // ── Forest decorations (rows 10-11, cols 4-5) ──
    // Ground layer — rendered first, behind trees
    var FOREST_GROUND = [
      { src: '/images/farm/decorations/mushroom-1.png', w: 18, h: 28, row: 11, col: 4, ox: 0.3, oy: 0.75 },
      { src: '/images/farm/decorations/mushroom-2.png', w: 16, h: 14, row: 11, col: 5, ox: 0.45, oy: 0.9 },
      { src: '/images/farm/decorations/stones-1.png', w: 34, h: 16, row: 10, col: 4, ox: 0.5, oy: 0.85 }
    ];
    for (var di = 0; di < FOREST_GROUND.length; di++) {
      var d = FOREST_GROUND[di];
      var dImg = document.createElement('img');
      dImg.src = d.src;
      dImg.className = 'fp-forest-decor fp-forest-ground';
      dImg.draggable = false;
      dImg.style.width = d.w + 'px';
      dImg.style.height = d.h + 'px';
      dImg.style.left = (d.col * cellW + d.ox * cellW) + '%';
      dImg.style.top = (d.row * cellH + d.oy * cellH) + '%';
      gridEl.appendChild(dImg);
    }

    // Animated rabbit — at base of trunk, behind trees
    var rabbitEl = document.createElement('div');
    rabbitEl.className = 'fp-anim fp-anim-rabbit';
    rabbitEl.style.left = (5 * cellW + 0.2 * cellW) + '%';
    rabbitEl.style.top = (11 * cellH + 0.7 * cellH) + '%';
    gridEl.appendChild(rabbitEl);

    // Tree layer — rendered on top of ground elements
    var FOREST_TREES = [
      { src: '/images/farm/stations/forest0.png', w: 80, h: 112, row: 10, col: 4, ox: 0.3, oy: -0.4 },
      { src: '/images/farm/stations/forest1.png', w: 80, h: 112, row: 10, col: 5, ox: 0.0, oy: -0.3 },
      { src: '/images/farm/stations/forest2.png', w: 80, h: 112, row: 11, col: 4, ox: 0.3, oy: -0.3 },
      { src: '/images/farm/stations/forest3.png', w: 80, h: 112, row: 11, col: 5, ox: 0.0, oy: -0.4 }
    ];
    for (var ti = 0; ti < FOREST_TREES.length; ti++) {
      var t = FOREST_TREES[ti];
      var tImg = document.createElement('img');
      tImg.src = t.src;
      tImg.className = 'fp-forest-decor fp-forest-tree';
      tImg.draggable = false;
      tImg.style.width = t.w + 'px';
      tImg.style.height = t.h + 'px';
      tImg.style.left = (t.col * cellW + t.ox * cellW) + '%';
      tImg.style.top = (t.row * cellH + t.oy * cellH) + '%';
      gridEl.appendChild(tImg);
    }

    // Lv2: Bonfire + smoke rising above it
    if (fhLevel >= 2) {
      addAnim('fp-anim-bonfire', 2, 0, 1, 1, 48, 96);
      var smokeEl = addAnim('fp-anim-smoke', 1, 0, 1, 1, 64, 128);
      scheduleSmokeLoop(smokeEl);
    }

    // Lv3: Bubbles in the fishing pond
    if (fhLevel >= 3) {
      addAnim('fp-anim-bubbles', 14, 0, 1, 1, 32, 32);
      addAnim('fp-anim-bubbles', 14, 1, 1, 1, 32, 32, { animationDelay: '0.3s' });
    }

    // Lv4: Occasional butterflies drifting across the farm
    if (fhLevel >= 4) {
      spawnButterflies(3);
    }

    // Lv5: Water fountain in gap row
    if (fhLevel >= 5) {
      addAnim('fp-anim-fountain', 11, 2, 1, 2, 96, 128);
    }

    // Mill windmill blades — always spinning, centered on roof hub
    addAnim('fp-anim-mill-blades', 9, 2, 2, 2, 160, 160, { marginTop: '-123px' });


    // ── Farm animals that wander near their buildings ─────

    var ANIMAL_STORAGE_KEY = 'arebooksgood-farm-animals';
    function loadAnimalPositions() {
      try { return JSON.parse(localStorage.getItem(ANIMAL_STORAGE_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveAnimalPositions(data) {
      try { localStorage.setItem(ANIMAL_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* quota */ }
    }

    // Animal speech bubbles — random sounds during idle
    var ANIMAL_SOUNDS = {
      chicken: ['cluck!', 'bawk bawk!', 'cluck cluck~', 'bawk!', 'bok bok!', 'cluck?'],
      cow: ['moo~', 'mooo!', 'moo moo!', 'moooo~', '*chewing*', 'moo?'],
      sheep: ['baa~', 'baaa!', 'baa baa!', 'baaah~', '*munching*', 'baa?'],
      duck: ['quack!', 'quack quack!', 'quaaack~', '*splashing*', 'quack?'],
      duckSwim: ['quack!', 'quack quack!', '*splash*', '*paddling*', 'quaaack~'],
      goat: ['meh~', 'baaah!', 'meh meh!', '*nibbling*', 'meeeh?'],
      pig: ['oink!', 'oink oink!', '*snort*', '*snuffling*', 'oink~'],
      dog: ['woof!', 'woof woof!', 'arf!', '*panting*', 'bark!', 'ruff!', '*tail wagging*']
    };

    function showAnimalSpeech(el, animalType) {
      // Don't stack bubbles
      var existing = el.querySelector('.fp-animal-speech');
      if (existing) return;
      var sounds = ANIMAL_SOUNDS[animalType] || ANIMAL_SOUNDS[animalType.replace(/\d+$/, '')];
      if (!sounds) return;
      var bubble = document.createElement('div');
      bubble.className = 'fp-animal-speech';
      bubble.textContent = sounds[Math.floor(Math.random() * sounds.length)];
      el.appendChild(bubble);
      setTimeout(function () {
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      }, 2000);
    }

    // Direction row Y offsets (spritesheet rows: 0=down, 1=left, 2=right, 3=up)
    // Chicken 2x: 32px per row. Cow/Sheep 2x: 64px per row.
    var ANIMAL_INFO = {
      chicken: {
        frameW: 32,
        dirY: { down: 0, left: -32, right: -64, up: -96 },
        frameMs: 150, walkMs: 2000
      },
      cow: {
        frameW: 64,
        dirY: { down: 0, left: -64, right: -128, up: -192 },
        frameMs: 200, walkMs: 3000
      },
      sheep: {
        frameW: 64,
        dirY: { down: 0, left: -64, right: -128, up: -192 },
        frameMs: 200, walkMs: 3000
      },
      duck: {
        frameW: 32,
        dirY: { down: 0, left: -32, right: -64, up: -96 },
        frameMs: 150, walkMs: 2000
      },
      duckSwim: {
        frameW: 32,
        dirY: { down: 0, left: -32, right: -64, up: -96 },
        frameMs: 250, walkMs: 3000
      },
      goat: {
        frameW: 64,
        dirY: { down: 0, left: -64, right: -128, up: -192 },
        frameMs: 200, walkMs: 3000
      },
      pig: {
        frameW: 64,
        dirY: { down: 0, left: -64, right: -128, up: -192 },
        frameMs: 180, walkMs: 2500
      },
      dog: {
        frameW: 64,
        dirY: { down: 0, left: -64, right: -128, up: -192 },
        frameMs: 180, walkMs: 2500
      }
    };

    // Start walk frame cycling via setInterval (sets full background-position
    // shorthand so CSS animation cannot override the Y direction offset).
    function getAnimalInfo(animalType) {
      return ANIMAL_INFO[animalType] || ANIMAL_INFO[animalType.replace(/\d+$/, '')];
    }

    function startWalk(el, animalType, dir) {
      var info = getAnimalInfo(animalType);
      var yOff = info.dirY[dir];
      // Set direction immediately (don't wait for first interval tick)
      el.style.backgroundPosition = '0px ' + yOff + 'px';
      var frame = 1;
      var iv = setInterval(function () {
        if (!el.parentNode) { clearInterval(iv); return; }
        el.style.backgroundPosition = -(frame * info.frameW) + 'px ' + yOff + 'px';
        frame = (frame + 1) % 4;
      }, info.frameMs);
      return { iv: iv, yOff: yOff };
    }

    // Stop walk and show idle frame (frame 0, preserving last direction)
    function stopWalk(el, walkData) {
      clearInterval(walkData.iv);
      el.style.backgroundPosition = '0px ' + walkData.yOff + 'px';
    }

    function spawnWanderingAnimal(className, animalType, baseRow, baseCol, rowSpan, colSpan, w, h, count, wanderRows) {
      // Wander zone: area around and below the building (in % of grid)
      var zoneLeft  = baseCol * cellW;
      var zoneRight = (baseCol + (colSpan || 1)) * cellW;
      var zoneTop   = (baseRow + (rowSpan || 1)) * cellH;
      var zoneBot   = (baseRow + (rowSpan || 1) + (wanderRows || 1.0)) * cellH;

      var saved = loadAnimalPositions();
      var savedList = saved[animalType] || [];

      for (var a = 0; a < count; a++) {
        var el = document.createElement('div');
        el.className = 'fp-anim ' + className;
        // Restore saved position or pick random within zone
        var s = savedList[a];
        var startX = (s && s.x >= zoneLeft && s.x <= zoneRight) ? s.x : zoneLeft + Math.random() * (zoneRight - zoneLeft);
        var startY = (s && s.y >= zoneTop && s.y <= zoneBot) ? s.y : zoneTop + Math.random() * (zoneBot - zoneTop);
        var startDir = (s && s.dir) || 'down';
        el.style.left = startX + '%';
        el.style.top = startY + '%';
        el.style.marginLeft = (-w / 2) + 'px';
        el.style.marginTop = (-h / 2) + 'px';
        // Face saved direction (or down on first visit)
        var info = getAnimalInfo(animalType);
        var yOff = info.dirY[startDir] || 0;
        el.style.backgroundPosition = '0px ' + yOff + 'px';
        gridEl.appendChild(el);

        // Start wander loop
        scheduleWander(el, animalType, a, zoneLeft, zoneRight, zoneTop, zoneBot, w, h);
      }
    }

    function scheduleWander(el, animalType, idx, zLeft, zRight, zTop, zBot, w, h) {
      var idleTime = 2000 + Math.floor(Math.random() * 4000); // 2-6s idle
      setTimeout(function doWander() {
        if (!el.parentNode) return; // removed by re-render

        // Pick a random target within the wander zone, avoid overlapping others
        var targetX, targetY;
        var minDist = 4; // minimum % distance between animals
        var attempts = 6;
        for (var att = 0; att < attempts; att++) {
          targetX = zLeft + Math.random() * (zRight - zLeft);
          targetY = zTop + Math.random() * (zBot - zTop);
          if (att === attempts - 1) break; // last attempt, just use it
          var others = gridEl.querySelectorAll('.fp-anim');
          var tooClose = false;
          for (var oi = 0; oi < others.length; oi++) {
            if (others[oi] === el) continue;
            var ox = parseFloat(others[oi].style.left) || 0;
            var oy = parseFloat(others[oi].style.top) || 0;
            if (Math.abs(targetX - ox) < minDist && Math.abs(targetY - oy) < minDist) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) break;
        }

        // Determine direction from current position
        var curX = parseFloat(el.style.left) || 0;
        var curY = parseFloat(el.style.top) || 0;
        var dx = targetX - curX;
        var dy = targetY - curY;

        // Pick direction based on dominant axis
        var dir;
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? 'right' : 'left';
        } else {
          dir = dy > 0 ? 'down' : 'up';
        }

        // Start walk animation (JS-driven frame cycling)
        var walkData = startWalk(el, animalType, dir);

        // Move to target
        el.style.left = targetX + '%';
        el.style.top = targetY + '%';

        // After transition completes, go idle and schedule next wander
        var walkDuration = getAnimalInfo(animalType).walkMs;
        setTimeout(function () {
          if (!el.parentNode) return;
          stopWalk(el, walkData);

          // Persist position so animals stay put across page loads
          var all = loadAnimalPositions();
          if (!all[animalType]) all[animalType] = [];
          all[animalType][idx] = { x: targetX, y: targetY, dir: dir };
          saveAnimalPositions(all);

          // Random chance to speak during idle (~30%)
          if (Math.random() < 0.3) {
            setTimeout(function () { showAnimalSpeech(el, animalType); }, 500);
          }

          var nextIdle = 3000 + Math.floor(Math.random() * 5000); // 3-8s idle
          setTimeout(function () { doWander(); }, nextIdle);
        }, walkDuration);
      }, idleTime);
    }

    // Chicken Coop: row 5, col 0, 2×2
    if (isCellBuilt({ key: 'chickenCoop', type: 'gathering' })) {
      spawnWanderingAnimal('fp-anim-chicken', 'chicken', 5, 0, 2, 2, 32, 32, 3);
    }

    // Cow Pasture: row 5, col 2, 2×2
    if (isCellBuilt({ key: 'cowPasture', type: 'gathering' })) {
      spawnWanderingAnimal('fp-anim-cow', 'cow', 5, 2, 2, 2, 64, 64, 2);
    }

    // Sheep Pen: row 5, col 4, 2×2
    if (isCellBuilt({ key: 'sheepPen', type: 'gathering' })) {
      spawnWanderingAnimal('fp-anim-sheep', 'sheep', 5, 4, 2, 2, 64, 64, 2);
    }

    // ── Ambient wildlife (farmhouse-level gated) ─────
    // Ducks swimming in background pond (water-only zone: tile cols 1-2, row 28)
    if (fhLevel >= 2) {
      spawnWanderingAnimal('fp-anim-duck-swim', 'duckSwim', 13, 0.5, 1, 1, 32, 32, 2, 0.5);
    }
    // Goat roaming animal area (row 5-6, col 0-5 — same zone as chicken/cow/sheep)
    if (fhLevel >= 3) {
      spawnWanderingAnimal('fp-anim-goat', 'goat', 5, 0, 2, 6, 64, 64, 1);
    }
    // Pigs in the crop area (rows 2-4, cols 2-5)
    if (fhLevel >= 4) {
      spawnWanderingAnimal('fp-anim-pig', 'pig', 1, 2, 1, 4, 64, 64, 2, 2);
    }
    // Dogs — requires Dog House built + individually adopted
    if (fhLevel >= 2 && isCellBuilt({ key: 'dogHouse', type: 'special' })) {
      var unlockedDogs = getUnlockedDogs();
      for (var di = 1; di <= 9; di++) {
        if (unlockedDogs.indexOf(di) !== -1) {
          spawnWanderingAnimal('fp-anim-dog fp-anim-dog' + di, 'dog' + di, 1, 2, 1, 4, 64, 64, 1, 2);
        }
      }
    }
  }

  // ── Procedural farm animal sounds (Web Audio) ──────────────

  var farmAudioCtx = null;
  var farmSoundsActive = false;

  function initFarmAudio() {
    if (farmAudioCtx) return;
    try {
      farmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* no audio support */ }
  }

  function playCluck() {
    if (!farmAudioCtx) return;
    var osc = farmAudioCtx.createOscillator();
    var gain = farmAudioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, farmAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, farmAudioCtx.currentTime + 0.04);
    osc.frequency.exponentialRampToValueAtTime(600, farmAudioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.05, farmAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, farmAudioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(farmAudioCtx.destination);
    osc.start(farmAudioCtx.currentTime);
    osc.stop(farmAudioCtx.currentTime + 0.08);
  }

  function playMoo() {
    if (!farmAudioCtx) return;
    var osc = farmAudioCtx.createOscillator();
    var gain = farmAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, farmAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, farmAudioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.05, farmAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, farmAudioCtx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, farmAudioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(farmAudioCtx.destination);
    osc.start(farmAudioCtx.currentTime);
    osc.stop(farmAudioCtx.currentTime + 0.4);
  }

  function playBaa() {
    if (!farmAudioCtx) return;
    var osc = farmAudioCtx.createOscillator();
    var gain = farmAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, farmAudioCtx.currentTime);
    // Vibrato via rapid frequency modulation
    var lfo = farmAudioCtx.createOscillator();
    var lfoGain = farmAudioCtx.createGain();
    lfo.frequency.value = 12;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(farmAudioCtx.currentTime);
    lfo.stop(farmAudioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.05, farmAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, farmAudioCtx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, farmAudioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(farmAudioCtx.destination);
    osc.start(farmAudioCtx.currentTime);
    osc.stop(farmAudioCtx.currentTime + 0.3);
  }

  function scheduleFarmSounds() {
    if (farmSoundsActive) return;
    farmSoundsActive = true;

    function tick() {
      if (!farmAudioCtx) { farmSoundsActive = false; return; }

      // Pick a random sound from built buildings
      var sounds = [];
      if (isCellBuilt({ key: 'chickenCoop', type: 'gathering' })) sounds.push(playCluck);
      if (isCellBuilt({ key: 'cowPasture', type: 'gathering' }))  sounds.push(playMoo);
      if (isCellBuilt({ key: 'sheepPen', type: 'gathering' }))    sounds.push(playBaa);

      if (sounds.length > 0) {
        sounds[Math.floor(Math.random() * sounds.length)]();
      }

      var delay = 15000 + Math.floor(Math.random() * 25000); // 15-40s
      setTimeout(tick, delay);
    }

    // First sound after a short delay
    setTimeout(tick, 5000 + Math.floor(Math.random() * 10000));
  }

  // Init audio on first user interaction
  document.addEventListener('click', function onFirstClick() {
    initFarmAudio();
    scheduleFarmSounds();
    document.removeEventListener('click', onFirstClick);
  }, { once: true });

  document.addEventListener('touchend', function onFirstTouch() {
    initFarmAudio();
    scheduleFarmSounds();
    document.removeEventListener('touchend', onFirstTouch);
  }, { once: true });

  // ── Render sidebar resources ──────────────────────────────
  function renderSidebar() {
    if (!resourcesEl) return;
    resourcesEl.innerHTML = '';

    var all = window.FarmResources ? window.FarmResources.getAll() : { raw: {}, processed: {} };

    for (var g = 0; g < RESOURCE_GROUPS.length; g++) {
      var group = RESOURCE_GROUPS[g];

      var catEl = document.createElement('div');
      catEl.className = 'fp-resource-category';
      catEl.textContent = group.label;
      resourcesEl.appendChild(catEl);

      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var row = document.createElement('div');
        row.className = 'fp-resource-row';

        var nameEl = document.createElement('span');
        nameEl.className = 'fp-resource-name';
        nameEl.textContent = item.icon + ' ' + item.name;
        row.appendChild(nameEl);

        var countEl = document.createElement('span');
        countEl.className = 'fp-resource-count';
        countEl.id = 'fp-res-' + item.key;
        var val = group.label === 'Processed'
          ? (all.processed[item.key] || 0)
          : (all.raw[item.key] || 0);
        countEl.textContent = val;
        row.appendChild(countEl);

        resourcesEl.appendChild(row);
      }
    }
  }

  // ── Float particle on resource accumulation ─────────────
  function showResourceFloat(key, icon, amount) {
    var cellEl = gridEl.querySelector('[data-key="' + key + '"]');
    if (!cellEl) return;
    var rect = cellEl.getBoundingClientRect();

    var floatEl = document.createElement('div');
    floatEl.className = 'fp-resource-float';
    floatEl.textContent = '+' + amount + ' ' + icon;
    floatEl.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    floatEl.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(floatEl);

    setTimeout(function () {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 1000);
  }

  // ── Trigger counter tick animation ─────────────────────
  function triggerCountTick(el) {
    el.classList.remove('fp-count-tick');
    void el.offsetWidth;
    el.classList.add('fp-count-tick');
  }

  // ── Update counts without full re-render ──────────────────
  function updateCounts() {
    if (!window.FarmResources) return;

    // Collect pending idle resources
    window.FarmResources.collectPending();

    var all = window.FarmResources.getAll();
    var stations = window.FarmResources.getStations();

    // Update station counts on grid + pulse + particles
    var keys = Object.keys(stations);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var station = stations[k];
      var newVal = all.raw[station.resource] || 0;

      var el = document.getElementById('fp-count-' + k);
      if (el) {
        el.textContent = newVal;
      }

      // Pulse class for cells with resources
      var cellEl = gridEl.querySelector('[data-key="' + k + '"]');
      if (cellEl && station.built) {
        if (newVal > 0) {
          cellEl.classList.add('fp-cell-has-resources');
        } else {
          cellEl.classList.remove('fp-cell-has-resources');
        }
      }

      // Float particle when resource increases (skip initial load)
      var prevVal = prevCounts[k];
      if (typeof prevVal === 'number' && prevVal > 0 && newVal > prevVal) {
        var diff = newVal - prevVal;
        var icon = '';
        for (var gi = 0; gi < RESOURCE_GROUPS.length; gi++) {
          for (var ri = 0; ri < RESOURCE_GROUPS[gi].items.length; ri++) {
            if (RESOURCE_GROUPS[gi].items[ri].key === station.resource) {
              icon = RESOURCE_GROUPS[gi].items[ri].icon;
            }
          }
        }
        showResourceFloat(k, icon, diff);
        if (el) triggerCountTick(el);
      }
      prevCounts[k] = newVal;
    }

    // Update sidebar counts with tick animation
    for (var g = 0; g < RESOURCE_GROUPS.length; g++) {
      var group = RESOURCE_GROUPS[g];
      for (var j = 0; j < group.items.length; j++) {
        var item = group.items[j];
        var resEl = document.getElementById('fp-res-' + item.key);
        if (resEl) {
          var val = group.label === 'Processed'
            ? (all.processed[item.key] || 0)
            : (all.raw[item.key] || 0);
          var oldVal = parseInt(resEl.textContent, 10) || 0;
          if (val !== oldVal) {
            resEl.textContent = val;
            triggerCountTick(resEl);
          }
        }
      }
    }

    // Update compact view
    updateCompact();

    // Update processing indicators on grid cells
    if (window.FarmResources) {
      var curLayout = getActiveLayout();
      for (var pi = 0; pi < curLayout.length; pi++) {
        var pItem = curLayout[pi];
        if (pItem.type !== 'processing' && pItem.type !== 'combo') continue;
        var procEl = document.getElementById('fp-proc-' + pItem.key);
        var pCellEl = gridEl.querySelector('[data-key="' + pItem.key + '"]');
        var pq = window.FarmResources.getQueue(pItem.key);
        var hasActive = pq.length > 0 && !pq[0].waiting;

        if (hasActive) {
          if (pCellEl) pCellEl.classList.add('fp-cell-processing-active');
          if (procEl) {
            procEl.textContent = formatMsToMinSec(pq[0].remaining || 0);
          } else if (pCellEl) {
            // Job started since last render — need to add indicator
            var newInd = document.createElement('div');
            newInd.className = 'fp-cell-processing-indicator';
            newInd.id = 'fp-proc-' + pItem.key;
            newInd.textContent = formatMsToMinSec(pq[0].remaining || 0);
            pCellEl.appendChild(newInd);
          }
          // Toggle animation on the station div
          if (pCellEl && STATION_ANIM[pItem.key]) {
            var sAnimEl = pCellEl.querySelector('.fp-station-anim');
            if (sAnimEl) {
              sAnimEl.classList.add('fp-station-active');
            } else if (pItem.key === 'kitchen') {
              // Kitchen: swap static img → animation div
              var oldImg = pCellEl.querySelector('.fp-sprite-img');
              if (oldImg) oldImg.parentNode.removeChild(oldImg);
              var newAnim = document.createElement('div');
              newAnim.className = 'fp-station-anim fp-station-anim-kitchen fp-station-active';
              pCellEl.appendChild(newAnim);
            }
          }
        } else {
          if (pCellEl) pCellEl.classList.remove('fp-cell-processing-active');
          if (procEl && procEl.parentNode) procEl.parentNode.removeChild(procEl);
          // Stop animation, keep static frame
          if (pCellEl && STATION_ANIM[pItem.key]) {
            var sAnimEl2 = pCellEl.querySelector('.fp-station-anim');
            if (pItem.key === 'kitchen' && sAnimEl2) {
              // Kitchen: swap animation div → static img
              sAnimEl2.parentNode.removeChild(sAnimEl2);
              if (!pCellEl.querySelector('.fp-sprite-img')) {
                pCellEl.appendChild(createFarmImg(STATION_IMG[pItem.key], pItem.name));
              }
            } else if (sAnimEl2) {
              sAnimEl2.classList.remove('fp-station-active');
            }
          }
        }
      }
    }

    // Update crop glow ramp — reconcile DOM with state (in-place)
    if (window.FarmAPI) {
      var plots = window.FarmAPI.getPlots();
      var needFullRender = false;
      var stages = ['planted', 'sprouting', 'growing', 'flowering', 'ready'];
      for (var ci = 0; ci < CROP_INDICES.length; ci++) {
        var p = CROP_INDICES[ci];
        var hasCrop = plots[p] && plots[p].crop;
        var cellKey = 'crop' + p;
        var cellEl = gridEl.querySelector('[data-key="' + cellKey + '"]');

        // Skip locked crop cells (not yet unlocked)
        var isLocked = cellEl && cellEl.classList.contains('fp-cell-locked');
        if (isLocked) continue;

        // Structural change (planted/harvested) — needs full rebuild
        var isEmpty = cellEl && cellEl.classList.contains('fp-cell-crop-empty');
        if ((isEmpty && hasCrop) || (!isEmpty && !hasCrop)) {
          needFullRender = true;
          break;
        }

        // Stage changed — update sprite and glow class in-place
        if (hasCrop && prevStages[p] !== plots[p].stage) {
          var newStageNum = STAGE_NUM[plots[p].stage] || 1;
          var newSrc = FARM_IMG + '/crops/' + plots[p].crop + '-' + newStageNum + '.png';
          if (cellEl) {
            var img = cellEl.querySelector('.fp-sprite-img');
            if (img) {
              img.src = newSrc;
            }
            // Swap stage class
            for (var si = 0; si < stages.length; si++) {
              cellEl.classList.remove('fp-cell-crop-' + stages[si]);
            }
            cellEl.classList.add('fp-cell-crop-' + plots[p].stage);
          }
          prevStages[p] = plots[p].stage;
        }
      }
      if (needFullRender) {
        renderGrid();
      }
    }
  }

  // ── Compact resource summary ─────────────────────────────
  function renderCompact() {
    if (!compactEl) return;
    compactEl.innerHTML = '';

    var all = window.FarmResources ? window.FarmResources.getAll() : { raw: {}, processed: {} };

    for (var g = 0; g < RESOURCE_GROUPS.length; g++) {
      var group = RESOURCE_GROUPS[g];
      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var val = group.label === 'Processed'
          ? (all.processed[item.key] || 0)
          : (all.raw[item.key] || 0);
        if (val === 0) continue;

        var span = document.createElement('span');
        span.className = 'fp-compact-item';
        span.innerHTML = item.icon + ' <span class="fp-resource-count" id="fp-cmp-' + item.key + '">' + val + '</span>';
        compactEl.appendChild(span);
      }
    }

    if (!compactEl.children.length) {
      compactEl.innerHTML = '<span style="color:color-mix(in srgb, var(--foreground) 50%, transparent); font-size:0.7rem">No resources yet</span>';
    }
  }

  function updateCompact() {
    if (!compactEl) return;
    var all = window.FarmResources ? window.FarmResources.getAll() : { raw: {}, processed: {} };
    var hasAny = false;

    for (var g = 0; g < RESOURCE_GROUPS.length; g++) {
      var group = RESOURCE_GROUPS[g];
      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var val = group.label === 'Processed'
          ? (all.processed[item.key] || 0)
          : (all.raw[item.key] || 0);
        var el = document.getElementById('fp-cmp-' + item.key);
        if (el) {
          el.textContent = val;
          if (val > 0) hasAny = true;
        } else if (val > 0) {
          // New non-zero resource appeared — re-render compact
          renderCompact();
          return;
        }
      }
    }
  }

  // ── Station click popups ────────────────────────────────

  // Convert resource keys like "crystal_herb" or "ironBars" to "Crystal Herb" / "Iron Bars"
  function prettyName(key) {
    // snake_case → words
    var s = key.replace(/_/g, ' ');
    // camelCase → words
    s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Title case
    return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function formatMsToMinSec(ms) {
    if (ms <= 0) return '0s';
    var totalSec = Math.ceil(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function closeStationPopup() {
    if (stationPopupEl && stationPopupEl.parentNode) {
      stationPopupEl.parentNode.removeChild(stationPopupEl);
    }
    stationPopupEl = null;
    document.removeEventListener('click', outsideStationPopupClick);
    window.removeEventListener('scroll', onScrollClosePopup, true);
  }

  function onScrollClosePopup() {
    closeStationPopup();
  }

  function outsideStationPopupClick(e) {
    if (stationPopupEl && !stationPopupEl.contains(e.target)) {
      closeStationPopup();
    }
  }

  function openStationPopup(item, cellEl) {
    closeStationPopup();

    stationPopupEl = document.createElement('div');
    stationPopupEl.className = 'fp-station-popup';

    if (item.type === 'combo') {
      renderComboPopup(item, stationPopupEl);
    } else if (item.type === 'gathering') {
      renderGatheringPopup(item, stationPopupEl);
    } else if (item.type === 'crop') {
      renderCropPopup(item, stationPopupEl);
    } else if (item.type === 'processing') {
      renderProcessingPopup(item, stationPopupEl);
    } else if (item.key === 'farmhouse') {
      renderFarmhousePopup(item, stationPopupEl);
    } else if (item.key === 'dogHouse') {
      renderDogHousePopup(item, stationPopupEl);
    }

    // Processing/combo popups and dog house need more width
    if (item.type === 'processing' || item.type === 'combo' || item.key === 'dogHouse') {
      stationPopupEl.classList.add('fp-popup-wide');
    }

    // Position via getBoundingClientRect
    var rect = cellEl.getBoundingClientRect();
    var popupWidth = (item.type === 'processing' || item.type === 'combo' || item.key === 'dogHouse') ? 240 : 170;
    var popupLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 8));
    stationPopupEl.style.left = popupLeft + 'px';

    // Append off-screen first to measure height
    stationPopupEl.style.visibility = 'hidden';
    stationPopupEl.style.top = '0';
    document.body.appendChild(stationPopupEl);
    var popupHeight = stationPopupEl.offsetHeight;

    // Place above if it fits, otherwise below
    var spaceAbove = rect.top - 6;
    var spaceBelow = window.innerHeight - rect.bottom - 6;

    stationPopupEl.style.top = '';
    stationPopupEl.style.bottom = '';

    if (spaceAbove >= popupHeight) {
      stationPopupEl.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    } else if (spaceBelow >= popupHeight) {
      stationPopupEl.style.top = (rect.bottom + 6) + 'px';
    } else {
      // Neither side fits perfectly — pick whichever has more room
      if (spaceAbove > spaceBelow) {
        stationPopupEl.style.top = '8px';
      } else {
        stationPopupEl.style.top = (rect.bottom + 6) + 'px';
      }
    }

    stationPopupEl.style.visibility = '';

    setTimeout(function () {
      document.addEventListener('click', outsideStationPopupClick);
      window.addEventListener('scroll', onScrollClosePopup, true);
    }, 0);
  }

  function openLockedPopup(item, cellEl) {
    closeStationPopup();

    var req = BUILDING_REQS[item.key];
    if (!req) return;

    stationPopupEl = document.createElement('div');
    stationPopupEl.className = 'fp-station-popup';

    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    stationPopupEl.appendChild(header);

    var fhLevel = getCurrentFHLevel();
    var meetsLevel = fhLevel >= req.minFH;
    var jbBalance = (window.JackBucks && window.JackBucks.getBalance) ? window.JackBucks.getBalance() : 0;
    var canAfford = jbBalance >= req.cost;
    var isCrop = item.type === 'crop';

    // Farmhouse level requirement
    var levelRow = document.createElement('div');
    levelRow.className = 'fp-popup-row';
    if (meetsLevel) {
      levelRow.innerHTML = 'Farmhouse: <span class="fp-popup-count">Lv.' + fhLevel + '</span> \u2714';
    } else {
      levelRow.innerHTML = '<span style="color:#e57373">Requires Farmhouse Lv.' + req.minFH + '</span>';
      levelRow.innerHTML += '<br><span class="fp-popup-rate">Current: Lv.' + fhLevel + '</span>';
    }
    stationPopupEl.appendChild(levelRow);

    // Blueprint info (TD wave unlock hint)
    var bpWave = (window.FarmResources && window.FarmResources.getFarmBlueprintWave) ? window.FarmResources.getFarmBlueprintWave(item.key) : 0;
    var hasBP = (window.FarmResources && window.FarmResources.hasFarmBlueprint) ? window.FarmResources.hasFarmBlueprint(item.key) : false;
    if (bpWave > 0 && !isCrop) {
      var bpRow = document.createElement('div');
      bpRow.className = 'fp-popup-row fp-popup-blueprint';
      if (hasBP && !meetsLevel) {
        bpRow.innerHTML = '<span class="fp-popup-blueprint-earned">TD Blueprint: Wave ' + bpWave + ' \u2714 FREE!</span>';
      } else if (hasBP && meetsLevel) {
        // Shouldn't happen (auto-built), but safety
        bpRow.innerHTML = '<span class="fp-popup-blueprint-earned">TD Blueprint earned \u2714</span>';
      } else {
        var tdBest = 0;
        try { var ts = localStorage.getItem('arebooksgood-td-stats'); if (ts) tdBest = JSON.parse(ts).highestWave || 0; } catch (e) {}
        bpRow.innerHTML = '<span class="fp-popup-blueprint-hint">TD Wave ' + bpWave + ' \u2192 free unlock' + (tdBest > 0 ? ' (best: ' + tdBest + ')' : '') + '</span>';
      }
      stationPopupEl.appendChild(bpRow);
    }

    // JB cost (only for non-free buildings) — skip if blueprint earned
    if (req.cost > 0 && !hasBP) {
      var costRow = document.createElement('div');
      costRow.className = 'fp-popup-row';
      var costClass = canAfford ? 'fp-has-enough' : 'fp-not-enough';
      costRow.innerHTML = 'Cost: <span class="' + costClass + '">' + req.cost + ' JB</span>';
      costRow.innerHTML += ' <span class="fp-popup-rate">(you have ' + jbBalance + ')</span>';
      stationPopupEl.appendChild(costRow);
    }

    // Build / Unlock button
    if (isCrop) {
      if (!meetsLevel) {
        // Farmhouse level not met — show upgrade hint
        var hint = document.createElement('div');
        hint.className = 'fp-popup-row fp-popup-rate';
        hint.textContent = 'Upgrade your farmhouse to unlock this plot.';
        stationPopupEl.appendChild(hint);
      } else if (req && req.cost > 0) {
        // Farmhouse level met but needs JB purchase
        var cropCanBuy = meetsLevel && canAfford;
        var cropBtn = document.createElement('button');
        cropBtn.className = 'fp-popup-btn';
        cropBtn.type = 'button';
        cropBtn.textContent = 'Unlock (' + req.cost + ' JB)';
        if (!cropCanBuy) {
          cropBtn.classList.add('fp-recipe-disabled');
          cropBtn.disabled = true;
        }
        cropBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!cropCanBuy) return;
          if (window.JackBucks) window.JackBucks.deduct(req.cost);
          if (window.FarmAPI && window.FarmAPI.unlockCropPlot) window.FarmAPI.unlockCropPlot(item.key);
          closeStationPopup();
          renderGrid();
        });
        stationPopupEl.appendChild(cropBtn);
      }
    } else {
      // Blueprint earned + FH met = free build button
      var canBuild = hasBP ? meetsLevel : (meetsLevel && canAfford);
      var btn = document.createElement('button');
      btn.className = 'fp-popup-btn';
      btn.type = 'button';
      if (hasBP && meetsLevel) {
        btn.textContent = 'Build (Free!)';
      } else if (req.cost === 0) {
        btn.textContent = 'Unlock';
      } else {
        btn.textContent = 'Build (' + req.cost + ' JB)';
      }
      if (!canBuild) {
        btn.classList.add('fp-recipe-disabled');
        btn.disabled = true;
      }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!canBuild) return;
        if (!hasBP && req.cost > 0 && window.JackBucks) {
          window.JackBucks.deduct(req.cost);
        }
        if (window.FarmResources && window.FarmResources.buildStation) {
          window.FarmResources.buildStation(item.key);
        }
        closeStationPopup();
        renderGrid();
      });
      stationPopupEl.appendChild(btn);
    }

    // Position popup (reuse same logic)
    var rect = cellEl.getBoundingClientRect();
    var popupWidth = 170;
    var popupLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 8));
    stationPopupEl.style.left = popupLeft + 'px';

    stationPopupEl.style.visibility = 'hidden';
    stationPopupEl.style.top = '0';
    document.body.appendChild(stationPopupEl);
    var popupHeight = stationPopupEl.offsetHeight;

    var spaceAbove = rect.top - 6;
    var spaceBelow = window.innerHeight - rect.bottom - 6;

    stationPopupEl.style.top = '';
    stationPopupEl.style.bottom = '';

    if (spaceAbove >= popupHeight) {
      stationPopupEl.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    } else if (spaceBelow >= popupHeight) {
      stationPopupEl.style.top = (rect.bottom + 6) + 'px';
    } else {
      if (spaceAbove > spaceBelow) {
        stationPopupEl.style.top = '8px';
      } else {
        stationPopupEl.style.top = (rect.bottom + 6) + 'px';
      }
    }

    stationPopupEl.style.visibility = '';

    setTimeout(function () {
      document.addEventListener('click', outsideStationPopupClick);
      window.addEventListener('scroll', onScrollClosePopup, true);
    }, 0);
  }

  function renderGatheringPopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    if (!window.FarmResources) return;
    var stations = window.FarmResources.getStations();
    var station = stations[item.key];
    if (!station) return;

    var count = window.FarmResources.getRaw(station.resource);
    var row1 = document.createElement('div');
    row1.className = 'fp-popup-row';
    row1.innerHTML = 'Stored: <span class="fp-popup-count">' + count + '</span>';
    popup.appendChild(row1);

    var rateMin = Math.round(station.rate / 60000);
    var row2 = document.createElement('div');
    row2.className = 'fp-popup-row fp-popup-rate';
    row2.textContent = '+1 every ' + rateMin + 'min';
    popup.appendChild(row2);

    var now = Date.now();
    var elapsed = now - station.lastCollect;
    var remaining = station.rate - elapsed;
    if (remaining < 0) remaining = 0;
    var row3 = document.createElement('div');
    row3.className = 'fp-popup-row fp-popup-next';
    row3.textContent = 'Next in: ' + formatMsToMinSec(remaining);
    popup.appendChild(row3);
  }

  function renderCropPopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    var plotIdx = parseInt(item.key.replace('crop', ''), 10);
    var cropInfo = getCropInfo(plotIdx);

    if (!cropInfo || !cropInfo.crop) {
      var empty = document.createElement('div');
      empty.className = 'fp-popup-row';
      empty.textContent = 'Empty plot';
      popup.appendChild(empty);

      // Seed buttons — split into plantable vs unavailable
      if (window.FarmAPI && window.FarmAPI.getCropDefs && window.FarmAPI.getInventory) {
        var defs = window.FarmAPI.getCropDefs();
        var inv = window.FarmAPI.getInventory();
        var seedContainer = document.createElement('div');
        seedContainer.className = 'fp-popup-seeds';

        var cropKeys = Object.keys(defs);
        var unavailable = [];

        for (var s = 0; s < cropKeys.length; s++) {
          (function (key) {
            var crop = defs[key];
            var isFree = crop.free;
            var count = isFree ? -1 : (inv[key] || 0);
            var disabled = !isFree && count <= 0;

            if (disabled) {
              unavailable.push({ key: key, crop: crop });
              return;
            }

            var btn = document.createElement('button');
            btn.className = 'fp-popup-seed-btn';
            btn.type = 'button';
            if (crop.rarity === 'rare') btn.classList.add('fp-popup-seed-rare');

            var nameSpan = document.createElement('span');
            nameSpan.className = 'fp-popup-seed-name';
            nameSpan.textContent = crop.name;
            btn.appendChild(nameSpan);

            if (window.FarmAPI.getEffectiveGrowTime && window.FarmAPI.formatTime) {
              var timeSpan = document.createElement('span');
              timeSpan.className = 'fp-popup-seed-time';
              timeSpan.textContent = window.FarmAPI.formatTime(window.FarmAPI.getEffectiveGrowTime(key));
              btn.appendChild(timeSpan);
            }

            var infoSpan = document.createElement('span');
            infoSpan.className = 'fp-popup-seed-info';
            infoSpan.textContent = isFree ? 'free' : ('x' + count);
            btn.appendChild(infoSpan);

            btn.addEventListener('click', function (ev) {
              ev.stopPropagation();
              window.FarmAPI.plant(plotIdx, key);
              closeStationPopup();
              renderGrid();
            });

            seedContainer.appendChild(btn);
          })(cropKeys[s]);
        }

        // Collapsible section for unavailable seeds
        if (unavailable.length > 0) {
          var toggle = document.createElement('button');
          toggle.className = 'fp-popup-seed-toggle';
          toggle.type = 'button';
          toggle.textContent = unavailable.length + ' more (no seeds)';

          var moreList = document.createElement('div');
          moreList.className = 'fp-popup-seeds-hidden';

          for (var u = 0; u < unavailable.length; u++) {
            var entry = unavailable[u];
            var btn = document.createElement('div');
            btn.className = 'fp-popup-seed-btn fp-popup-seed-disabled';
            if (entry.crop.rarity === 'rare') btn.classList.add('fp-popup-seed-rare');

            var nameSpan = document.createElement('span');
            nameSpan.className = 'fp-popup-seed-name';
            nameSpan.textContent = entry.crop.name;
            btn.appendChild(nameSpan);

            if (window.FarmAPI.getEffectiveGrowTime && window.FarmAPI.formatTime) {
              var timeSpan = document.createElement('span');
              timeSpan.className = 'fp-popup-seed-time';
              timeSpan.textContent = window.FarmAPI.formatTime(window.FarmAPI.getEffectiveGrowTime(entry.key));
              btn.appendChild(timeSpan);
            }

            var infoSpan = document.createElement('span');
            infoSpan.className = 'fp-popup-seed-info';
            infoSpan.textContent = 'x0';
            btn.appendChild(infoSpan);

            moreList.appendChild(btn);
          }

          toggle.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var open = moreList.classList.toggle('fp-popup-seeds-show');
            toggle.textContent = open
              ? 'hide unavailable'
              : unavailable.length + ' more (no seeds)';
          });

          seedContainer.appendChild(toggle);
          seedContainer.appendChild(moreList);
        }

        popup.appendChild(seedContainer);
      }
      return;
    }

    // Get crop name from defs
    var cropName = cropInfo.crop;
    if (window.FarmAPI && window.FarmAPI.getCropDefs) {
      var defs2 = window.FarmAPI.getCropDefs();
      if (defs2[cropInfo.crop]) {
        cropName = defs2[cropInfo.crop].name;
      }
    }

    var nameRow = document.createElement('div');
    nameRow.className = 'fp-popup-row';
    nameRow.innerHTML = 'Crop: <span class="fp-popup-count">' + cropName + '</span>';
    popup.appendChild(nameRow);

    var stageNames = { planted: 'Planted', sprouting: 'Sprouting', growing: 'Growing', flowering: 'Flowering', ready: 'Ready' };
    var stageRow = document.createElement('div');
    stageRow.className = 'fp-popup-row';
    stageRow.textContent = 'Stage: ' + (stageNames[cropInfo.stage] || cropInfo.stage);
    popup.appendChild(stageRow);

    // Progress bar
    var pct = Math.min(100, Math.round(cropInfo.growthPct * 100));
    var barOuter = document.createElement('div');
    barOuter.className = 'fp-popup-bar';
    var barInner = document.createElement('div');
    barInner.className = 'fp-popup-bar-fill';
    barInner.style.width = pct + '%';
    barOuter.appendChild(barInner);
    popup.appendChild(barOuter);

    var pctRow = document.createElement('div');
    pctRow.className = 'fp-popup-row fp-popup-rate';
    var pctText = pct + '% grown';
    if (cropInfo.timeRemaining && cropInfo.stage !== 'ready') {
      pctText += ' \u00B7 ' + cropInfo.timeRemaining;
    }
    pctRow.textContent = pctText;
    popup.appendChild(pctRow);

    // Fertilize button when growing (once per crop)
    if (cropInfo.stage !== 'ready' && !cropInfo.fertilized && window.FarmAPI && window.FarmAPI.useFertilizer) {
      var upgrades = window.FarmAPI.getUpgrades();
      if (upgrades.fertilizer > 0) {
        var fertBtn = document.createElement('button');
        fertBtn.className = 'fp-popup-btn';
        fertBtn.type = 'button';
        fertBtn.textContent = 'Fertilize (' + upgrades.fertilizer + ')';
        fertBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var used = window.FarmAPI.useFertilizer(plotIdx);
          if (used) {
            var cellEl = gridEl.querySelector('[data-key="' + item.key + '"]');
            showFpFertilizerFloat(cellEl);
          }
          closeStationPopup();
          renderGrid();
        });
        popup.appendChild(fertBtn);
      }
    }

    // Harvest button when ready
    if (cropInfo.stage === 'ready' && window.FarmAPI && window.FarmAPI.harvest) {
      var harvestBtn = document.createElement('button');
      harvestBtn.className = 'fp-popup-btn';
      harvestBtn.type = 'button';
      harvestBtn.textContent = 'Harvest';
      harvestBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var cellEl = gridEl.querySelector('[data-key="' + item.key + '"]');
        var result = window.FarmAPI.harvest(plotIdx);
        if (result) {
          showFpJBFloat(cellEl, result.amount);
        }
        closeStationPopup();
        renderGrid();
      });
      popup.appendChild(harvestBtn);
    }
  }

  // ── JB float particle for farm page ─────────────────
  function showFpJBFloat(cellEl, amount) {
    if (!cellEl) return;
    var rect = cellEl.getBoundingClientRect();
    var floatEl = document.createElement('div');
    floatEl.className = 'fp-jb-float';
    floatEl.textContent = '+' + amount + ' JB';
    floatEl.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    floatEl.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(floatEl);
    setTimeout(function () {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 1000);
  }

  function showFpFertilizerFloat(cellEl) {
    if (!cellEl) return;
    var rect = cellEl.getBoundingClientRect();
    var floatEl = document.createElement('div');
    floatEl.className = 'fp-resource-float';
    floatEl.textContent = '\uD83C\uDF3F';
    floatEl.style.left = (rect.left + rect.width / 2 - 10) + 'px';
    floatEl.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(floatEl);
    setTimeout(function () {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 1000);
  }

  // ── Shared processing section (used by both processing and combo popups) ──
  function renderProcessingSection(stationKey, popup, reRenderFn) {
    if (!window.FarmResources) return;

    var queue = window.FarmResources.getQueue(stationKey);

    // Active job with progress bar
    if (queue.length > 0 && !queue[0].waiting) {
      var active = queue[0];
      var activeRow = document.createElement('div');
      activeRow.className = 'fp-queue-item';

      var activeName = document.createElement('span');
      activeName.className = 'fp-queue-name';
      activeName.textContent = '\u2699 ' + active.name;
      activeRow.appendChild(activeName);

      var barOuter = document.createElement('div');
      barOuter.className = 'fp-popup-bar';
      var barInner = document.createElement('div');
      barInner.className = 'fp-popup-bar-fill';
      barInner.style.width = Math.round((active.progress || 0) * 100) + '%';
      barOuter.appendChild(barInner);
      activeRow.appendChild(barOuter);

      var timeRow = document.createElement('div');
      timeRow.className = 'fp-popup-row fp-popup-rate';
      timeRow.textContent = formatMsToMinSec(active.remaining || 0) + ' remaining';
      activeRow.appendChild(timeRow);

      popup.appendChild(activeRow);
    }

    // Waiting queue items
    for (var q = 0; q < queue.length; q++) {
      if (q === 0 && !queue[q].waiting) continue;
      var waitRow = document.createElement('div');
      waitRow.className = 'fp-queue-item fp-queue-waiting';
      waitRow.textContent = (q + 1) + '. ' + queue[q].name + ' (waiting)';
      popup.appendChild(waitRow);
    }

    // Queue status
    var statusRow = document.createElement('div');
    statusRow.className = 'fp-popup-row fp-popup-rate';
    statusRow.textContent = 'Queue: ' + queue.length + '/5';
    popup.appendChild(statusRow);

    // Separator
    var sep = document.createElement('div');
    sep.className = 'fp-popup-separator';
    popup.appendChild(sep);

    // Recipe buttons
    var recipes = window.FarmResources.getRecipes(stationKey);
    for (var r = 0; r < recipes.length; r++) {
      (function (recipe) {
        var affordable = window.FarmResources.canAfford(stationKey, recipe.id);
        var queueFull = queue.length >= 5;
        var disabled = !affordable || queueFull;

        var btn = document.createElement('button');
        btn.className = 'fp-recipe-btn' + (disabled ? ' fp-recipe-disabled' : '');
        btn.type = 'button';

        var inputParts = [];
        if (recipe.inputs.raw) {
          var rk = Object.keys(recipe.inputs.raw);
          for (var i = 0; i < rk.length; i++) {
            var have = window.FarmResources.getRaw(rk[i]);
            var need = recipe.inputs.raw[rk[i]];
            var cls = have >= need ? 'fp-has-enough' : 'fp-not-enough';
            inputParts.push('<span class="' + cls + '">' + need + ' ' + prettyName(rk[i]) + ' [' + have + ']</span>');
          }
        }
        if (recipe.inputs.processed) {
          var pk = Object.keys(recipe.inputs.processed);
          for (var j = 0; j < pk.length; j++) {
            var haveP = window.FarmResources.getProcessed(pk[j]);
            var needP = recipe.inputs.processed[pk[j]];
            var clsP = haveP >= needP ? 'fp-has-enough' : 'fp-not-enough';
            inputParts.push('<span class="' + clsP + '">' + needP + ' ' + prettyName(pk[j]) + ' [' + haveP + ']</span>');
          }
        }

        var inputStr = inputParts.join(' + ');
        var durMin = Math.round(recipe.duration / 60000);

        btn.innerHTML = inputStr + ' \u2192 ' + recipe.output.qty + ' ' + recipe.name +
          ' <span class="fp-recipe-time">(' + durMin + 'm)</span>';

        if (!disabled) {
          btn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            window.FarmResources.queueRecipe(stationKey, recipe.id);
            reRenderFn();
          });
        }

        popup.appendChild(btn);
      })(recipes[r]);
    }
  }

  function renderProcessingPopup(item, popup) {
    if (!window.FarmResources) return;

    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    renderProcessingSection(item.key, popup, function () {
      popup.innerHTML = '';
      renderProcessingPopup(item, popup);
    });
  }

  // ── Combo building popup (gathering + processing in one) ──
  function renderComboPopup(item, popup) {
    if (!window.FarmResources) return;

    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    // ── Gathering section ──
    var stations = window.FarmResources.getStations();
    var station = stations[item.key];
    if (station && station.resource) {
      var count = window.FarmResources.getRaw(station.resource);
      var row1 = document.createElement('div');
      row1.className = 'fp-popup-row';
      row1.innerHTML = prettyName(station.resource) + ': <span class="fp-popup-count">' + count + '</span>';
      popup.appendChild(row1);

      var rateMin = Math.round(station.rate / 60000);
      var row2 = document.createElement('div');
      row2.className = 'fp-popup-row fp-popup-rate';
      row2.textContent = '+1 every ' + rateMin + 'min';
      popup.appendChild(row2);

      var now = Date.now();
      var elapsed = now - station.lastCollect;
      var remaining = station.rate - elapsed;
      if (remaining < 0) remaining = 0;
      var row3 = document.createElement('div');
      row3.className = 'fp-popup-row fp-popup-next';
      row3.textContent = 'Next in: ' + formatMsToMinSec(remaining);
      popup.appendChild(row3);
    }

    // ── Processing separator ──
    var procLabel = document.createElement('div');
    procLabel.className = 'fp-popup-separator';
    popup.appendChild(procLabel);

    var procHeader = document.createElement('div');
    procHeader.className = 'fp-popup-row fp-popup-rate';
    procHeader.textContent = '\u2500\u2500 Processing \u2500\u2500';
    popup.appendChild(procHeader);

    // ── Processing section (reuses shared helper) ──
    renderProcessingSection(item.key, popup, function () {
      popup.innerHTML = '';
      renderComboPopup(item, popup);
    });
  }

  // ── Dog House popup ─────────────────────────────────────
  function renderDogHousePopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = '\uD83D\uDC15 Dog House';
    popup.appendChild(header);

    var unlocked = getUnlockedDogs();

    var grid = document.createElement('div');
    grid.className = 'fp-dog-grid';

    for (var i = 1; i <= 9; i++) {
      (function (breed) {
        var isAdopted = unlocked.indexOf(breed) !== -1;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fp-dog-btn' + (isAdopted ? ' fp-dog-btn-adopted' : '');

        // Dog sprite preview (frame 0 of walk sheet — 32×32 native, show at 32×32)
        var preview = document.createElement('div');
        preview.className = 'fp-dog-preview';
        preview.style.backgroundImage = 'url(/images/farm/animations/dog' + breed + '.png)';
        btn.appendChild(preview);

        // Breed name
        var name = document.createElement('div');
        name.className = 'fp-dog-name';
        name.textContent = DOG_BREEDS[breed - 1] || ('Dog ' + breed);
        btn.appendChild(name);

        // Status / action
        var status = document.createElement('div');
        status.className = 'fp-dog-status';
        if (isAdopted) {
          status.textContent = 'Remove';
          status.style.color = '#e57373';
          status.style.cursor = 'pointer';
        } else {
          status.textContent = 'Adopt';
          status.style.color = 'var(--accent)';
          status.style.cursor = 'pointer';
        }
        btn.appendChild(status);

        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var dogs = getUnlockedDogs();
          var idx = dogs.indexOf(breed);
          if (idx === -1) {
            dogs.push(breed);
          } else {
            dogs.splice(idx, 1);
          }
          setUnlockedDogs(dogs);
          renderGrid();
          while (popup.firstChild) popup.removeChild(popup.firstChild);
          renderDogHousePopup(item, popup);
        });

        grid.appendChild(btn);
      })(i);
    }

    popup.appendChild(grid);

    // Adopt All button (only if some are not yet adopted)
    if (unlocked.length < 9) {
      var adoptAll = document.createElement('button');
      adoptAll.type = 'button';
      adoptAll.className = 'fp-popup-btn';
      adoptAll.textContent = 'Adopt All (' + (9 - unlocked.length) + ' remaining)';
      adoptAll.addEventListener('click', function (e) {
        e.stopPropagation();
        var all = [];
        for (var j = 1; j <= 9; j++) all.push(j);
        setUnlockedDogs(all);
        renderGrid();
        while (popup.firstChild) popup.removeChild(popup.firstChild);
        renderDogHousePopup(item, popup);
      });
      popup.appendChild(adoptAll);
    } else {
      var allDone = document.createElement('div');
      allDone.className = 'fp-popup-row';
      allDone.style.textAlign = 'center';
      allDone.style.color = '#4caf50';
      allDone.style.marginTop = '0.3rem';
      allDone.textContent = '\u2714 All dogs adopted!';
      popup.appendChild(allDone);
    }
  }

  function renderFarmhousePopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' Farmhouse';
    popup.appendChild(header);

    var level = getCurrentFHLevel();
    var curDef = (window.FarmAPI && window.FarmAPI.getFarmhouseLevelDef) ? window.FarmAPI.getFarmhouseLevelDef(level) : null;
    var curName = curDef ? curDef.name : 'Farmhouse';

    var row = document.createElement('div');
    row.className = 'fp-popup-row';
    row.innerHTML = '<span class="fp-popup-count">' + curName + '</span> (Lv.' + level + ')';
    popup.appendChild(row);

    // Bonuses
    if (curDef) {
      var bonuses = [];
      if (curDef.sellBonus > 1) bonuses.push('+' + Math.round((curDef.sellBonus - 1) * 100) + '% sell price');
      if (curDef.growBonus < 1) bonuses.push(Math.round((1 - curDef.growBonus) * 100) + '% faster growth');
      if (curDef.autoWater) bonuses.push('Auto-water');
      if (bonuses.length > 0) {
        var bonusRow = document.createElement('div');
        bonusRow.className = 'fp-popup-row fp-popup-rate';
        bonusRow.textContent = bonuses.join(' \u2022 ');
        popup.appendChild(bonusRow);
      }
    }

    // Upgrade section
    if (level < 5 && window.FarmAPI && window.FarmAPI.getFarmhouseLevelDef) {
      var nextDef = window.FarmAPI.getFarmhouseLevelDef(level + 1);
      if (nextDef) {
        var sep = document.createElement('div');
        sep.className = 'fp-popup-separator';
        popup.appendChild(sep);

        var nextRow = document.createElement('div');
        nextRow.className = 'fp-popup-row';
        nextRow.innerHTML = 'Next: <span class="fp-popup-count">' + nextDef.name + '</span> (Lv.' + (level + 1) + ')';
        popup.appendChild(nextRow);

        // Next level bonuses
        var nextBonuses = [];
        if (nextDef.sellBonus > 1) nextBonuses.push('+' + Math.round((nextDef.sellBonus - 1) * 100) + '% sell');
        if (nextDef.growBonus < 1) nextBonuses.push(Math.round((1 - nextDef.growBonus) * 100) + '% faster');
        if (nextDef.autoWater) nextBonuses.push('Auto-water');
        if (nextBonuses.length > 0) {
          var nextBonusRow = document.createElement('div');
          nextBonusRow.className = 'fp-popup-row fp-popup-rate';
          nextBonusRow.textContent = nextBonuses.join(' \u2022 ');
          popup.appendChild(nextBonusRow);
        }

        var jbBalance = (window.JackBucks && window.JackBucks.getBalance) ? window.JackBucks.getBalance() : 0;
        var canAfford = jbBalance >= nextDef.cost;

        var btn = document.createElement('button');
        btn.className = 'fp-popup-btn';
        btn.type = 'button';
        btn.textContent = 'Upgrade (' + nextDef.cost + ' JB)';
        if (!canAfford) {
          btn.classList.add('fp-recipe-disabled');
          btn.disabled = true;
        }
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!canAfford) return;
          window.JackBucks.deduct(nextDef.cost);
          window.FarmAPI.setFarmhouseLevel(level + 1);
          closeStationPopup();
          renderGrid();
        });
        popup.appendChild(btn);

        if (!canAfford) {
          var costHint = document.createElement('div');
          costHint.className = 'fp-popup-row fp-popup-rate';
          costHint.innerHTML = 'You have <span class="fp-not-enough">' + jbBalance + ' JB</span>';
          popup.appendChild(costHint);
        }
      }
    } else if (level >= 5) {
      var maxRow = document.createElement('div');
      maxRow.className = 'fp-popup-row fp-popup-rate';
      maxRow.textContent = 'Max level reached!';
      popup.appendChild(maxRow);
    }
  }

  // ── Toggle collapsed/expanded ───────────────────────────
  var collapsed = false;
  try { collapsed = localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (e) {}

  function applyCollapsed() {
    if (!sidebarEl || !toggleBtn) return;
    if (collapsed) {
      sidebarEl.classList.add('fp-collapsed');
      toggleBtn.innerHTML = '&#9650;';
    } else {
      sidebarEl.classList.remove('fp-collapsed');
      toggleBtn.innerHTML = '&#9660;';
    }
  }

  var headerEl = toggleBtn ? toggleBtn.parentElement : null;
  if (headerEl) {
    headerEl.addEventListener('click', function () {
      collapsed = !collapsed;
      try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch (e) {}
      applyCollapsed();
    });
  }

  // ── Initialize ────────────────────────────────────────────
  renderGrid();
  renderSidebar();
  renderCompact();
  applyCollapsed();

  // Listen for resource changes
  if (window.FarmResources) {
    window.FarmResources.onChange(function () {
      updateCounts();
    });
  }

  // Listen for external plot changes (e.g. quick sell all from farmhouse panel)
  document.addEventListener('farm-plots-changed', function () {
    renderGrid();
  });

  // Periodic update for idle accumulation + crop progress
  setInterval(function () {
    updateCounts();
  }, UPDATE_INTERVAL);

  // ── Farm grid pet ──────────────────────────────────────

  var fpPetEl = null;
  var fpPetSpeechEl = null;
  var fpPetBusy = false;
  var fpPetTimer = null;
  var fpPetTypewriterTimer = null;
  var fpPetSpeechTimer = null;

  var FP_PET_SPEECH = {
    cropEmpty: {
      cat: ['*digs in dirt*', 'plant something!', '*buries toy*', 'empty plot~'],
      dragon: ['needs seeds!', '*pokes dirt*', 'plant fire flowers!', 'barren land'],
      robot: ['PLOT: vacant', 'soil: idle', 'suggestion: plant', 'utilization: 0%']
    },
    cropGrowing: {
      cat: ['*watches sprout*', 'growing nicely~', '*pats soil*', 'patience...'],
      dragon: ['*warms soil*', 'grow faster!', '*breathes warmth*', 'almost there'],
      robot: ['GROWTH: in progress', 'monitoring crop', 'nutrients: adequate', 'ETA: calculating']
    },
    cropReady: {
      cat: ['harvest time!', '*excited purr*', 'pick it pick it!', 'ripe and ready~'],
      dragon: ['FIRE HARVEST!', '*snorts eagerly*', 'the bounty!', 'time to reap!'],
      robot: ['CROP: ready', 'harvesting...', 'yield: optimal', 'initiating harvest']
    },
    chickenCoop: {
      cat: ['*eyes chickens*', 'so many birds...', '*tail twitches*', 'cluck cluck~'],
      dragon: ['*scares chickens*', 'roasted eggs?', '*sniffs feathers*', 'tiny dragons!'],
      robot: ['POULTRY: counted', 'egg output: nominal', 'coop: inspected', 'chickens: 12']
    },
    cowPasture: {
      cat: ['*naps near cow*', 'warm milk please', '*rubs on cow*', 'big kitties!'],
      dragon: ['*intimidates cows*', 'mooo?', '*lands on fence*', 'leather armor?'],
      robot: ['BOVINE: scanned', 'milk output: stable', 'pasture: grade A', 'cows: content']
    },
    sheepPen: {
      cat: ['*kneads wool*', 'so fluffy!', '*purrs in wool*', 'cloud animals~'],
      dragon: ['*singes wool*', 'warm fuzz', '*nests in fleece*', 'fire-proof wool?'],
      robot: ['WOOL: quality check', 'sheep: accounted', 'fleece: optimal', 'shearing: due']
    },
    lumberMill: {
      cat: ['*scratches log*', 'wood & planks!', '*sharpens claws*', 'timber!', '*watches blade*', 'scary spinny!'],
      dragon: ['*chars a log*', 'firewood!', '*fire-cuts logs*', 'I do it better', 'need bigger trees'],
      robot: ['WOOD: catalogued', 'lumber: stacked', 'SAWMILL: active', 'planks: queued', 'efficiency: 94%']
    },
    stoneworks: {
      cat: ['*bats pebble*', 'shiny rocks!', '*bats chisel*', 'clinkity clink', 'rocky nap spot'],
      dragon: ['*cracks boulder*', 'gem hunting!', '*melts stone*', 'fire masonry!', 'brick by brick'],
      robot: ['QUARRY: surveyed', 'stone: grade B+', 'MASON: chiseling', 'brick quality: A', 'wall: straight']
    },
    smithy: {
      cat: ['*backs away*', 'too hot!', '*cautious sniff*', 'echo echo~', '*singed whiskers*'],
      dragon: ['MY element!', '*breathes into forge*', 'hotter! MORE!', '*fire torch*', '*happy rumble*'],
      robot: ['FORGE: 1200C', 'iron detected', 'hammering: precise', 'alloy: forming', 'MINE: operational']
    },
    deepMine: {
      cat: ['*shivers*', 'too deep for me!', '*wide eyes*', 'hear something?'],
      dragon: ['*dives in*', 'GEMS! GOLD!', '*hoards crystals*', 'the deep calls!'],
      robot: ['DEEP SCAN: active', 'rare minerals found', 'depth: 200m', 'caution: advised']
    },
    oldGrowth: {
      cat: ['*climbs tree*', 'ancient forest~', '*naps on branch*', 'birds up here!'],
      dragon: ['*perches high*', 'old magic here', '*respectful bow*', 'sacred grove'],
      robot: ['FLORA: ancient', 'age: 500+ years', 'ecosystem: thriving', 'hardwood: premium']
    },
    fishingPond: {
      cat: ['*stares at fish*', 'FISH!', '*paw in water*', 'sushi time~'],
      dragon: ['*steam-cooks fish*', 'easy fishing!', '*dips tail in*', 'pond too small'],
      robot: ['FISH: counted', 'pond pH: 7.2', 'stock: healthy', 'fishing: permitted']
    },
    mill: {
      cat: ['*watches wheel*', 'spinny thing!', '*chases grain*', 'flour dust!'],
      dragon: ['*blows the wheel*', 'grind faster!', '*sneezes flour*', 'ACHOO'],
      robot: ['MILL: grinding', 'flour output: steady', 'gears: lubricated', 'RPM: optimal']
    },
    kitchen: {
      cat: ['*sniffs food*', 'something yummy!', '*begs for scraps*', 'chef cat!'],
      dragon: ['*flame grills*', 'I AM the oven', '*seasons with ash*', 'extra crispy!'],
      robot: ['KITCHEN: active', 'recipe: loaded', 'temp: 180C', 'timer: set']
    },
    loom: {
      cat: ['*tangles in yarn*', 'YARN!', '*bats shuttle*', 'string heaven~'],
      dragon: ['*carefully threads*', 'delicate work...', '*tiny flame dries*', 'silk scarves!'],
      robot: ['LOOM: weaving', 'thread count: 400', 'pattern: loaded', 'fabric: forming']
    },
    smokehouse: {
      cat: ['*follows smoke*', 'smoky fish?', '*sniffs deeply*', 'mmm bacon~'],
      dragon: ['amateur smoke', '*shows real smoke*', 'I smoke better', '*jealous puff*'],
      robot: ['SMOKEHOUSE: curing', 'temp: 85C', 'smoke: hickory', 'hours left: 4']
    },
    enchanter: {
      cat: ['*chases sparkles*', 'magic tingles!', '*paws at runes*', 'ooh shiny~'],
      dragon: ['ancient magic!', '*channels power*', 'feels familiar', '*eyes glow*'],
      robot: ['ENCHANT: calibrating', 'mana flow: stable', 'runes: aligned', 'magic: illogical']
    },
    farmhouse: {
      cat: ['home sweet home~', '*curls up*', 'nap time!', '*purrs softly*'],
      dragon: ['*guards the door*', 'my castle!', '*rests by hearth*', 'cozy lair'],
      robot: ['HOME BASE: secure', 'systems: standby', 'patrol: complete', 'status: nominal']
    },
    forest: {
      cat: ['*explores woods*', 'rustling leaves~', '*chases butterfly*', 'adventure!'],
      dragon: ['*flies between trees*', 'wild territory', '*marks tree*', 'my forest now'],
      robot: ['FOREST: mapped', 'trees: 847', 'wildlife: detected', 'path: plotted']
    },
    water: {
      cat: ['*splashes water*', 'wet paws!', '*shakes off*', 'drink up plant!'],
      dragon: ['*breathes mist*', 'gentle rain~', '*steam watering*', 'grow, little one'],
      robot: ['H2O: dispensed', 'irrigation: active', 'moisture: +15%', 'watering protocol']
    }
  };

  function getFpPetType() {
    if (window.PetSystem && window.PetSystem.getState) {
      var ps = window.PetSystem.getState();
      if (ps) return ps.activePet || ps.petId || 'cat';
    }
    return 'cat';
  }

  function getFpPetLevel() {
    if (window.PetSystem && window.PetSystem.getState) {
      var ps = window.PetSystem.getState();
      if (ps) return ps.level || 1;
    }
    return 1;
  }

  function randomLine(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fpPetSpeak(msg) {
    if (!fpPetSpeechEl || !fpPetEl) return;

    if (fpPetTypewriterTimer) clearTimeout(fpPetTypewriterTimer);
    if (fpPetSpeechTimer) clearTimeout(fpPetSpeechTimer);

    fpPetSpeechEl.textContent = '';
    fpPetSpeechEl.style.display = 'block';

    var i = 0;
    function typeNext() {
      if (i < msg.length) {
        fpPetSpeechEl.textContent += msg[i];
        i++;
        fpPetTypewriterTimer = setTimeout(typeNext, 30);
      } else {
        fpPetTypewriterTimer = null;
        fpPetSpeechTimer = setTimeout(function () {
          fpPetSpeechEl.style.display = 'none';
        }, 2500);
      }
    }
    typeNext();
  }

  function movePetToCell(key, instant) {
    if (!fpPetEl) return;
    var cellEl = gridEl.querySelector('[data-key="' + key + '"]');
    if (!cellEl) return;

    var gridRect = gridEl.getBoundingClientRect();
    var cellRect = cellEl.getBoundingClientRect();

    var targetLeft = cellRect.left - gridRect.left + cellRect.width / 2 - (fpPetEl.offsetWidth || 32) / 2;
    var targetTop = cellRect.top - gridRect.top + cellRect.height / 2 - (fpPetEl.offsetHeight || 32) / 2;

    if (instant) {
      fpPetEl.style.transition = 'none';
    } else {
      fpPetEl.style.transition = 'left 0.8s ease-in-out, top 0.8s ease-in-out';
    }

    fpPetEl.style.left = targetLeft + 'px';
    fpPetEl.style.top = targetTop + 'px';

    if (instant) {
      void fpPetEl.offsetWidth;
      fpPetEl.style.transition = 'left 0.8s ease-in-out, top 0.8s ease-in-out';
    }
  }

  // ── Crop scan functions ────────────────────────────────

  function findFpReadyPlot() {
    if (!window.FarmAPI) return null;
    var plots = window.FarmAPI.getPlots();
    for (var i = 0; i < CROP_INDICES.length; i++) {
      var p = CROP_INDICES[i];
      if (plots[p] && plots[p].stage === 'ready') {
        return { cellKey: 'crop' + p, plotIndex: p };
      }
    }
    return null;
  }

  function findFpWaterablePlot() {
    if (!window.FarmAPI) return null;
    var plots = window.FarmAPI.getPlots();
    var best = null;
    for (var i = 0; i < CROP_INDICES.length; i++) {
      var p = CROP_INDICES[i];
      var plot = plots[p];
      if (!plot || !plot.crop) continue;
      if (plot.wateredAt) continue;
      if (plot.growthPct < 0.25 || plot.growthPct > 0.90) continue;
      if (plot.stage === 'ready') continue;
      if (!best || plot.growthPct > best.growthPct) {
        best = { cellKey: 'crop' + p, plotIndex: p };
      }
    }
    return best;
  }

  // ── Speech key mapping ─────────────────────────────────

  function getSpeechKey(item) {
    if (item.type === 'crop') {
      var plotIdx = parseInt(item.key.replace('crop', ''), 10);
      var cropInfo = getCropInfo(plotIdx);
      if (!cropInfo || !cropInfo.crop) return 'cropEmpty';
      if (cropInfo.stage === 'ready') return 'cropReady';
      return 'cropGrowing';
    }
    if (item.key.indexOf('forest') === 0) return 'forest';
    if (FP_PET_SPEECH[item.key]) return item.key;
    return 'farmhouse';
  }

  // ── AI tick scheduling ─────────────────────────────────

  function scheduleFpAiTick() {
    if (fpPetTimer) clearTimeout(fpPetTimer);
    var delay = 15000 + Math.floor(Math.random() * 10000); // 15-25s
    fpPetTimer = setTimeout(fpAiTick, delay);
  }

  function fpAiTick() {
    if (fpPetBusy || !fpPetEl) {
      scheduleFpAiTick();
      return;
    }

    var petType = getFpPetType();
    var petLevel = getFpPetLevel();

    // Priority 1: Harvest ready crops
    var ready = findFpReadyPlot();
    if (ready) {
      fpHarvestSequence(ready.cellKey, ready.plotIndex, petType, petLevel);
      return;
    }

    // Priority 2: Water growing crops
    var waterable = findFpWaterablePlot();
    if (waterable) {
      fpWaterSequence(waterable.cellKey, waterable.plotIndex, petType);
      return;
    }

    // Priority 3: Idle visit (60% chance)
    if (Math.random() < 0.60) {
      fpIdleVisit(petType);
      return;
    }

    // Priority 4: Farmhouse speech (30% of remaining)
    if (Math.random() < 0.30) {
      var lines = FP_PET_SPEECH.farmhouse[petType] || FP_PET_SPEECH.farmhouse.cat;
      fpPetSpeak(randomLine(lines));
    }

    scheduleFpAiTick();
  }

  // ── Harvest sequence ───────────────────────────────────

  function fpHarvestSequence(cellKey, plotIndex, petType, petLevel) {
    fpPetBusy = true;

    var lines = FP_PET_SPEECH.cropReady[petType] || FP_PET_SPEECH.cropReady.cat;
    fpPetSpeak(randomLine(lines));

    movePetToCell(cellKey, false);

    setTimeout(function () {
      var cellEl = gridEl.querySelector('[data-key="' + cellKey + '"]');
      if (cellEl) cellEl.classList.add('fp-cell-pet-tending');

      setTimeout(function () {
        if (cellEl) cellEl.classList.remove('fp-cell-pet-tending');

        var result = null;
        if (window.FarmAPI && window.FarmAPI.harvest) {
          result = window.FarmAPI.harvest(plotIndex);
        }

        renderGrid();

        if (result) {
          var freshCellEl = gridEl.querySelector('[data-key="' + cellKey + '"]');
          showFpJBFloat(freshCellEl, result.amount);
          fpApplyBonuses(petType, petLevel, plotIndex, result);
        }

        setTimeout(function () {
          movePetToCell('farmhouse', false);
          setTimeout(function () {
            fpPetBusy = false;
            scheduleFpAiTick();
          }, 900);
        }, 500);
      }, 1500);
    }, 800);
  }

  // ── Water sequence ─────────────────────────────────────

  function fpWaterSequence(cellKey, plotIndex, petType) {
    fpPetBusy = true;

    var lines = FP_PET_SPEECH.water[petType] || FP_PET_SPEECH.water.cat;
    fpPetSpeak(randomLine(lines));

    movePetToCell(cellKey, false);

    setTimeout(function () {
      var cellEl = gridEl.querySelector('[data-key="' + cellKey + '"]');
      if (cellEl) cellEl.classList.add('fp-cell-pet-watering');

      setTimeout(function () {
        if (cellEl) cellEl.classList.remove('fp-cell-pet-watering');

        if (window.FarmAPI && window.FarmAPI.water) {
          window.FarmAPI.water(plotIndex);
        }

        var freshCellEl = gridEl.querySelector('[data-key="' + cellKey + '"]');
        showFpWaterFloat(freshCellEl || cellEl);

        setTimeout(function () {
          movePetToCell('farmhouse', false);
          setTimeout(function () {
            fpPetBusy = false;
            scheduleFpAiTick();
          }, 900);
        }, 500);
      }, 1200);
    }, 800);
  }

  // ── Idle visit ─────────────────────────────────────────

  function fpIdleVisit(petType) {
    var builtCells = [];
    var walkLayout = getActiveLayout();
    for (var i = 0; i < walkLayout.length; i++) {
      var item = walkLayout[i];
      if (item.key !== 'farmhouse' && isCellBuilt(item)) {
        builtCells.push(item);
      }
    }

    if (builtCells.length === 0) {
      scheduleFpAiTick();
      return;
    }

    var target = builtCells[Math.floor(Math.random() * builtCells.length)];
    var speechKey = getSpeechKey(target);
    var speechSet = FP_PET_SPEECH[speechKey];
    var lines = (speechSet && speechSet[petType]) || FP_PET_SPEECH.farmhouse[petType] || FP_PET_SPEECH.farmhouse.cat;

    fpPetBusy = true;

    movePetToCell(target.key, false);

    setTimeout(function () {
      fpPetSpeak(randomLine(lines));

      setTimeout(function () {
        movePetToCell('farmhouse', false);
        setTimeout(function () {
          fpPetBusy = false;
          scheduleFpAiTick();
        }, 900);
      }, 2500);
    }, 900);
  }

  // ── Pet bonuses ────────────────────────────────────────

  function fpApplyBonuses(petType, petLevel, plotIndex, harvestResult) {
    // Level 3+: 8% double harvest
    if (petLevel >= 3 && Math.random() < 0.08) {
      var extra = harvestResult.amount;
      if (window.JackBucks) {
        window.JackBucks.add(extra);
      }
      var dblSpeech = { cat: 'double harvest! *purrs*', dragon: 'DOUBLE FIRE HARVEST!', robot: 'BONUS YIELD DETECTED' };
      setTimeout(function () {
        fpPetSpeak(dblSpeech[petType] || 'double harvest!');
      }, 600);
    }

    // Cat: 15% auto-replant (free crops only to avoid consuming expensive seeds)
    if (petType === 'cat' && Math.random() < 0.15) {
      setTimeout(function () {
        if (window.FarmAPI && window.FarmAPI.plant && window.FarmAPI.isFreeCrop && window.FarmAPI.isFreeCrop(harvestResult.crop)) {
          var planted = window.FarmAPI.plant(plotIndex, harvestResult.crop);
          if (planted) {
            fpPetSpeak('*plants another*');
            renderGrid();
          }
        }
      }, 400);
    }

    // Farmhouse level 5: 5% random seed drop
    if (window.FarmAPI && window.FarmAPI.getFarmhouseLevel && window.FarmAPI.getFarmhouseLevel() >= 5 && Math.random() < 0.05) {
      var seedOptions = ['tomato', 'corn', 'pumpkin', 'golden_apple', 'crystal_herb', 'dragon_fruit'];
      var dropped = seedOptions[Math.floor(Math.random() * seedOptions.length)];
      if (window.FarmAPI.addSeeds) {
        window.FarmAPI.addSeeds(dropped, 1);
        setTimeout(function () {
          fpPetSpeak('found a ' + dropped + ' seed!');
        }, 800);
      }
    }
  }

  // ── Water float particle ───────────────────────────────

  function showFpWaterFloat(cellEl) {
    if (!cellEl) return;
    var rect = cellEl.getBoundingClientRect();
    var floatEl = document.createElement('div');
    floatEl.className = 'fp-resource-float';
    floatEl.textContent = '\uD83D\uDCA7';
    floatEl.style.left = (rect.left + rect.width / 2 - 10) + 'px';
    floatEl.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(floatEl);
    setTimeout(function () {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 1000);
  }

  function initFarmPet() {
    if (!window.PetSystem || !window.PetSystem.renderMiniSprite) return;
    var ps = window.PetSystem.getState && window.PetSystem.getState();
    if (!ps) return;

    // Set grid area as positioning context
    gridEl.style.position = 'relative';

    fpPetEl = document.createElement('div');
    fpPetEl.className = 'fp-grid-pet';
    window.PetSystem.renderMiniSprite(fpPetEl, 2);
    fpPetEl.style.position = 'absolute';

    // Speech bubble
    fpPetSpeechEl = document.createElement('div');
    fpPetSpeechEl.className = 'fp-pet-speech';
    fpPetEl.appendChild(fpPetSpeechEl);

    gridEl.appendChild(fpPetEl);

    // Start at farmhouse
    movePetToCell('farmhouse', true);

    // Begin AI tick cycle
    scheduleFpAiTick();
  }

  // Retry loop waiting for PetSystem
  var fpPetRetries = 0;
  function retryFarmPetInit() {
    fpPetRetries++;
    if (window.PetSystem && window.PetSystem.renderMiniSprite && window.PetSystem.getState) {
      var ps = window.PetSystem.getState();
      if (ps) {
        initFarmPet();
        return;
      }
    }
    if (fpPetRetries < 20) {
      setTimeout(retryFarmPetInit, 500);
    }
  }
  retryFarmPetInit();

})();
