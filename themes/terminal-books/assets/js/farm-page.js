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
    // Row 4: empty gap
    { key: 'chickenCoop', name: 'Chicken Coop',  row: 5, col: 0, rowSpan: 2, colSpan: 2, type: 'gathering' },
    { key: 'cowPasture',  name: 'Cow Pasture',   row: 5, col: 2, rowSpan: 2, colSpan: 2, type: 'gathering' },
    { key: 'sheepPen',    name: 'Sheep Pen',     row: 5, col: 4, rowSpan: 2, colSpan: 2, type: 'gathering' },
    // Row 7: empty gap
    { key: 'lumberYard',  name: 'Lumber Yard',   row: 8,  col: 0, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'quarry',      name: 'Quarry',        row: 12, col: 5, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'mine',        name: 'Mine',          row: 12, col: 4, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'deepMine',    name: 'Deep Mine',     row: 13, col: 4, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'oldGrowth',   name: 'Old Growth',    row: 8,  col: 4, rowSpan: 1, colSpan: 1, type: 'gathering' },
    // Row 9: empty gap
    { key: 'mill',        name: 'Mill',          row: 10, col: 0, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'sawmill',     name: 'Sawmill',       row: 10, col: 1, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'mason',       name: 'Mason',         row: 10, col: 2, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'kitchen',     name: 'Kitchen',       row: 10, col: 3, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'forge',       name: 'Forge',         row: 10, col: 4, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'loom',        name: 'Loom',          row: 10, col: 5, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'smokehouse',  name: 'Smokehouse',    row: 11, col: 0, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'enchanter',   name: 'Enchanter',     row: 11, col: 1, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'elite' },
    { key: 'fishingPond', name: 'Fishing Pond',  row: 13, col: 0, rowSpan: 2, colSpan: 4, type: 'gathering' }
  ];

  // ── Layout helpers ──────────────────────────────────────────
  function getActiveLayout() {
    return GRID_LAYOUT;
  }

  // ── PNG sprite paths (farm page grid only) ──────────────────
  var FARM_IMG = '/images/farm';
  var STATION_IMG = {
    mill: FARM_IMG + '/stations/mill.png',
    sawmill: FARM_IMG + '/stations/sawmill.png',
    mason: FARM_IMG + '/stations/mason.png',
    kitchen: FARM_IMG + '/stations/kitchen.png',
    forge: FARM_IMG + '/stations/forge.png',
    loom: FARM_IMG + '/stations/loom.png',
    smokehouse: FARM_IMG + '/stations/smokehouse.png',
    enchanter: FARM_IMG + '/stations/enchanter.png',
    chickenCoop: FARM_IMG + '/stations/chickenCoop.png',
    cowPasture: FARM_IMG + '/stations/cowPasture.png',
    sheepPen: FARM_IMG + '/stations/sheepPen.png',
    lumberYard: FARM_IMG + '/stations/lumberYard.png',
    quarry: FARM_IMG + '/stations/quarry.png',
    mine: FARM_IMG + '/stations/mine.png',
    deepMine: FARM_IMG + '/stations/deepMine.png',
    oldGrowth: FARM_IMG + '/stations/oldGrowth.png',
    fishingPond: null,  // background-painted
    forest0: null,      // background-painted
    forest1: null,
    forest2: null,
    forest3: null
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
    sawmill: '\uD83E\uDE93',   // axe
    mason: '\u26CF',       // pick
    kitchen: '\uD83C\uDF73',   // cooking
    forge: '\uD83D\uDD25',     // fire
    loom: '\uD83E\uDDF5',      // thread
    smokehouse: '\uD83C\uDF56', // meat
    enchanter: '\u2728',   // sparkles
    chickenCoop: '\uD83D\uDC14', // chicken
    cowPasture: '\uD83D\uDC04',  // cow
    sheepPen: '\uD83D\uDC11',   // sheep
    lumberYard: '\uD83E\uDEB5', // wood
    quarry: '\u26CF',      // pick
    mine: '\u26CF',        // pick
    deepMine: '\uD83D\uDC8E',   // gem
    oldGrowth: '\uD83C\uDF33',  // tree
    fishingPond: '\uD83C\uDFA3', // fishing
    forest0: '\uD83C\uDF33', forest1: '\uD83C\uDF33',
    forest2: '\uD83C\uDF33', forest3: '\uD83C\uDF33'
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
        { key: 'iron', name: 'Iron', icon: '\u2699' },
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
        { key: 'ironBars', name: 'Iron Bars', icon: '\u2699' },
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

  // ── Determine if a station/building is built ──────────────
  function isCellBuilt(item) {
    if (item.key === 'farmhouse' || item.key.indexOf('forest') === 0) return true; // farmhouse + forest always built
    if (item.type === 'crop') return true;    // crop plots always available

    // All stations unlocked for testing
    if (item.type === 'processing') return true;
    if (item.type === 'gathering') return true;

    // Fallback: check FarmResources
    if (window.FarmResources && window.FarmResources.isStationBuilt) {
      return window.FarmResources.isStationBuilt(item.key);
    }
    return false;
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
      } else if (item.type === 'gathering') {
        cell.classList.add('fp-cell-gathering');
      }

      if (built && item.type !== 'crop') {
        cell.classList.add('fp-cell-built');
      } else if (!built) {
        cell.classList.add('fp-cell-locked');
      }

      // Icon
      var iconEl = document.createElement('div');
      iconEl.className = 'fp-cell-icon';
      if (!built) {
        iconEl.textContent = '\uD83D\uDD12'; // lock
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
          cell.appendChild(createFarmImg(STATION_IMG[item.key], item.name));
        }
      }
      cell.appendChild(iconEl);

      // Label
      var labelEl = document.createElement('div');
      labelEl.className = 'fp-cell-label';
      labelEl.textContent = item.name;
      cell.appendChild(labelEl);

      // Count for gathering stations (if built)
      if (built && item.type === 'gathering') {
        var countEl = document.createElement('div');
        countEl.className = 'fp-cell-count';
        countEl.id = 'fp-count-' + item.key;
        countEl.textContent = getStationCount(item);
        cell.appendChild(countEl);
      }

      // Processing indicator
      if (built && item.type === 'processing' && window.FarmResources) {
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

      // Crop progress + pixel art sprites
      if (item.type === 'crop') {
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
        } else {
          // Empty plot styling
          cell.classList.add('fp-cell-crop-empty');
          iconEl.textContent = '+';
          prevStages[plotIdx] = null;
        }
      }

      // Farmhouse level
      if (item.key === 'farmhouse' && window.FarmAPI) {
        var countFH = document.createElement('div');
        countFH.className = 'fp-cell-count';
        var fhState = null;
        try {
          fhState = window.FarmAPI.getFarmhouseLevel ? window.FarmAPI.getFarmhouseLevel() : null;
        } catch (e) {}
        countFH.textContent = 'Lv ' + (fhState || 1);
        cell.appendChild(countFH);
      }

      // Click handler for built cells
      if (built) {
        (function (itm, cel) {
          cel.style.cursor = 'pointer';
          cel.addEventListener('click', function (e) {
            e.stopPropagation();
            openStationPopup(itm, cel);
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

    // Waterfall — always active (not tied to farmhouse level)
    var waterfallEl = document.createElement('div');
    waterfallEl.className = 'fp-anim-waterfall';
    gridEl.appendChild(waterfallEl);

    // Water stones at waterfall edge — always active
    addAnim('fp-anim-water-stones', 11, 2, 1, 1, 64, 64);

    // Lv2: Bonfire + smoke rising above it
    if (fhLevel >= 2) {
      addAnim('fp-anim-bonfire', 2, 0, 1, 1, 48, 96);
      var smokeEl = addAnim('fp-anim-smoke', 1, 0, 1, 1, 64, 128);
      scheduleSmokeLoop(smokeEl);
    }

    // Lv3: Bubbles in the fishing pond
    if (fhLevel >= 3) {
      addAnim('fp-anim-bubbles', 14, 2, 1, 1, 32, 32);
      addAnim('fp-anim-bubbles', 14, 3, 1, 1, 32, 32, { animationDelay: '0.3s' });
    }

    // Lv4: Occasional butterflies drifting across the farm
    if (fhLevel >= 4) {
      spawnButterflies(3);
    }

    // Lv5: Water fountain in gap row
    if (fhLevel >= 5) {
      addAnim('fp-anim-fountain', 7, 2, 1, 2, 96, 128);
    }
  }

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
        if (pItem.type !== 'processing') continue;
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
        } else {
          if (pCellEl) pCellEl.classList.remove('fp-cell-processing-active');
          if (procEl && procEl.parentNode) procEl.parentNode.removeChild(procEl);
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

    if (item.type === 'gathering') {
      renderGatheringPopup(item, stationPopupEl);
    } else if (item.type === 'crop') {
      renderCropPopup(item, stationPopupEl);
    } else if (item.type === 'processing') {
      renderProcessingPopup(item, stationPopupEl);
    } else if (item.key === 'farmhouse') {
      renderFarmhousePopup(item, stationPopupEl);
    }

    // Processing popups need more width for recipe text
    if (item.type === 'processing') {
      stationPopupEl.classList.add('fp-popup-wide');
    }

    // Position via getBoundingClientRect
    var rect = cellEl.getBoundingClientRect();
    var popupWidth = item.type === 'processing' ? 240 : 170;
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

  function renderProcessingPopup(item, popup) {
    if (!window.FarmResources) return;

    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    var queue = window.FarmResources.getQueue(item.key);

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
      if (q === 0 && !queue[q].waiting) continue; // skip active (already shown)
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
    var recipes = window.FarmResources.getRecipes(item.key);
    for (var r = 0; r < recipes.length; r++) {
      (function (recipe) {
        var affordable = window.FarmResources.canAfford(item.key, recipe.id);
        var queueFull = queue.length >= 5;
        var disabled = !affordable || queueFull;

        var btn = document.createElement('button');
        btn.className = 'fp-recipe-btn' + (disabled ? ' fp-recipe-disabled' : '');
        btn.type = 'button';

        // Input list
        var inputParts = [];
        if (recipe.inputs.raw) {
          var rk = Object.keys(recipe.inputs.raw);
          for (var i = 0; i < rk.length; i++) {
            var have = window.FarmResources.getRaw(rk[i]);
            var need = recipe.inputs.raw[rk[i]];
            var cls = have >= need ? 'fp-has-enough' : 'fp-not-enough';
            inputParts.push('<span class="' + cls + '">' + need + ' ' + rk[i] + '</span>');
          }
        }
        if (recipe.inputs.processed) {
          var pk = Object.keys(recipe.inputs.processed);
          for (var j = 0; j < pk.length; j++) {
            var haveP = window.FarmResources.getProcessed(pk[j]);
            var needP = recipe.inputs.processed[pk[j]];
            var clsP = haveP >= needP ? 'fp-has-enough' : 'fp-not-enough';
            inputParts.push('<span class="' + clsP + '">' + needP + ' ' + pk[j] + '</span>');
          }
        }

        var inputStr = inputParts.join(' + ');
        var durMin = Math.round(recipe.duration / 60000);

        btn.innerHTML = inputStr + ' \u2192 ' + recipe.output.qty + ' ' + recipe.name +
          ' <span class="fp-recipe-time">(' + durMin + 'm)</span>';

        if (!disabled) {
          btn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            window.FarmResources.queueRecipe(item.key, recipe.id);
            // Re-render popup
            popup.innerHTML = '';
            renderProcessingPopup(item, popup);
          });
        }

        popup.appendChild(btn);
      })(recipes[r]);
    }
  }

  function renderFarmhousePopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' Farmhouse';
    popup.appendChild(header);

    var level = 1;
    if (window.FarmAPI && window.FarmAPI.getFarmhouseLevel) {
      level = window.FarmAPI.getFarmhouseLevel();
    }

    var row = document.createElement('div');
    row.className = 'fp-popup-row';
    row.innerHTML = 'Level: <span class="fp-popup-count">' + level + '</span>';
    popup.appendChild(row);
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
    lumberYard: {
      cat: ['*scratches log*', 'good scratching post!', '*sharpens claws*', 'timber!'],
      dragon: ['*chars a log*', 'firewood!', '*stacks lumber*', 'need bigger trees'],
      robot: ['WOOD: catalogued', 'lumber: stacked', 'board feet: noted', 'efficiency: 94%']
    },
    quarry: {
      cat: ['*bats pebble*', 'shiny rocks!', '*digs around*', 'rocky nap spot'],
      dragon: ['*cracks boulder*', 'gem hunting!', '*hoards stones*', 'my rock pile!'],
      robot: ['QUARRY: surveyed', 'stone: grade B+', 'extraction: on track', 'mineral scan done']
    },
    mine: {
      cat: ['*peers into dark*', 'spooky tunnel!', '*cautious sniff*', 'echo echo~'],
      dragon: ['*lights up mine*', 'deep treasures!', '*fire torch*', 'gold below!'],
      robot: ['MINE: operational', 'depth: 40m', 'iron detected', 'structural: sound']
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
    sawmill: {
      cat: ['*covers ears*', 'too loud!', '*watches blade*', 'scary spinny!'],
      dragon: ['*fire-cuts logs*', 'I do it better', '*sparks fly*', 'timber!'],
      robot: ['SAWMILL: active', 'cut precision: 99%', 'blade: sharp', 'planks: queued']
    },
    mason: {
      cat: ['*bats chisel*', 'clinkity clink', '*naps on stone*', 'cold but nice'],
      dragon: ['*melts stone*', 'fire masonry!', '*shapes with heat*', 'brick by brick'],
      robot: ['MASON: chiseling', 'brick quality: A', 'mortar: mixed', 'wall: straight']
    },
    kitchen: {
      cat: ['*sniffs food*', 'something yummy!', '*begs for scraps*', 'chef cat!'],
      dragon: ['*flame grills*', 'I AM the oven', '*seasons with ash*', 'extra crispy!'],
      robot: ['KITCHEN: active', 'recipe: loaded', 'temp: 180C', 'timer: set']
    },
    forge: {
      cat: ['*backs away*', 'too hot!', '*singed whiskers*', 'fire bad!'],
      dragon: ['MY element!', '*breathes into forge*', 'hotter! MORE!', '*happy rumble*'],
      robot: ['FORGE: 1200C', 'metal: malleable', 'hammering: precise', 'alloy: forming']
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

        if (result) {
          showFpJBFloat(cellEl, result.amount);
          fpApplyBonuses(petType, petLevel, plotIndex, result);
        }

        renderGrid();

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

        showFpWaterFloat(cellEl);

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

    // Cat: 15% auto-replant
    if (petType === 'cat' && Math.random() < 0.15) {
      setTimeout(function () {
        if (window.FarmAPI && window.FarmAPI.plant) {
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
