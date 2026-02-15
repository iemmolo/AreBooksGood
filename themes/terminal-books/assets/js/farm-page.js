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
  var stationPopupEl = null;

  // ── Grid layout constant ─────────────────────────────────
  var GRID_LAYOUT = [
    { key: 'farmhouse', name: 'Farmhouse', row: 0, col: 0, rowSpan: 2, colSpan: 2, type: 'special' },
    { key: 'crop0', name: 'Crops', row: 0, col: 2, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop1', name: 'Crops', row: 0, col: 3, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop2', name: 'Crops', row: 0, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop3', name: 'Crops', row: 1, col: 2, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop4', name: 'Crops', row: 1, col: 3, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'crop5', name: 'Crops', row: 1, col: 4, rowSpan: 1, colSpan: 1, type: 'crop' },
    { key: 'mill', name: 'Mill', row: 0, col: 6, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'sawmill', name: 'Sawmill', row: 0, col: 7, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'mason', name: 'Mason', row: 1, col: 6, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'kitchen', name: 'Kitchen', row: 1, col: 7, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'basic' },
    { key: 'forge', name: 'Forge', row: 2, col: 6, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'loom', name: 'Loom', row: 2, col: 7, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'smokehouse', name: 'Smokehouse', row: 2, col: 8, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'advanced' },
    { key: 'enchanter', name: 'Enchanter', row: 2, col: 9, rowSpan: 1, colSpan: 1, type: 'processing', tier: 'elite' },
    { key: 'chickenCoop', name: 'Chicken Coop', row: 3, col: 0, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'cowPasture', name: 'Cow Pasture', row: 3, col: 1, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'sheepPen', name: 'Sheep Pen', row: 3, col: 2, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'lumberYard', name: 'Lumber Yard', row: 4, col: 4, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'quarry', name: 'Quarry', row: 4, col: 5, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'mine', name: 'Mine', row: 4, col: 6, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'deepMine', name: 'Deep Mine', row: 4, col: 7, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'oldGrowth', name: 'Old Growth', row: 4, col: 8, rowSpan: 1, colSpan: 1, type: 'gathering' },
    { key: 'fishingPond', name: 'Fishing Pond', row: 6, col: 0, rowSpan: 2, colSpan: 4, type: 'gathering' }
  ];

  // ── Icons for each cell type ──────────────────────────────
  var ICONS = {
    farmhouse: '\uD83C\uDFE0', // house
    crop0: '\uD83C\uDF3E', crop1: '\uD83C\uDF3E', crop2: '\uD83C\uDF3E',
    crop3: '\uD83C\uDF3E', crop4: '\uD83C\uDF3E', crop5: '\uD83C\uDF3E',
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
  function buildOccupiedMap() {
    var map = {};
    for (var i = 0; i < GRID_LAYOUT.length; i++) {
      var item = GRID_LAYOUT[i];
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

  var occupiedMap = buildOccupiedMap();

  // ── Determine if a station/building is built ──────────────
  function isCellBuilt(item) {
    if (item.type === 'special') return true; // farmhouse always built
    if (item.type === 'crop') return true;    // crop plots always available

    // Processing stations: all unlocked for testing
    if (item.type === 'processing') {
      return true;
    }

    // Gathering stations: check FarmResources
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
    var rendered = {};

    // Render defined layout items
    for (var i = 0; i < GRID_LAYOUT.length; i++) {
      var item = GRID_LAYOUT[i];
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
      if (item.type === 'special') {
        cell.classList.add('fp-cell-farmhouse');
      } else if (item.key === 'fishingPond') {
        cell.classList.add('fp-cell-pond');
      } else if (item.type === 'crop') {
        cell.classList.add('fp-cell-crop');
      } else if (item.type === 'processing') {
        cell.classList.add('fp-cell-processing');
      }

      if (built) {
        cell.classList.add('fp-cell-built');
      } else {
        cell.classList.add('fp-cell-locked');
      }

      // Icon
      var iconEl = document.createElement('div');
      iconEl.className = 'fp-cell-icon';
      if (!built) {
        iconEl.textContent = '\uD83D\uDD12'; // lock
      } else {
        iconEl.textContent = ICONS[item.key] || '';
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

      // Crop progress
      if (item.type === 'crop') {
        var plotIdx = parseInt(item.key.replace('crop', ''), 10);
        var cropInfo = getCropInfo(plotIdx);
        if (cropInfo && cropInfo.crop) {
          iconEl.textContent = ICONS[item.key];
          var bar = document.createElement('div');
          bar.className = 'fp-crop-bar';
          bar.id = 'fp-bar-' + item.key;
          bar.style.width = Math.min(100, Math.round(cropInfo.growthPct * 100)) + '%';
          cell.appendChild(bar);
        }
      }

      // Farmhouse level
      if (item.type === 'special' && window.FarmAPI) {
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
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 12; c++) {
        var posKey = r + ',' + c;
        if (occupiedMap[posKey]) continue;
        var empty = document.createElement('div');
        empty.className = 'fp-cell fp-cell-empty';
        empty.style.gridRow = (r + 1) + '';
        empty.style.gridColumn = (c + 1) + '';
        gridEl.appendChild(empty);
      }
    }

    // Re-append farm pet after grid rebuild
    if (fpPetEl) {
      gridEl.appendChild(fpPetEl);
      movePetToCell('farmhouse', true);
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
      for (var pi = 0; pi < GRID_LAYOUT.length; pi++) {
        var pItem = GRID_LAYOUT[pi];
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

    // Update crop progress bars — reconcile DOM with state
    if (window.FarmAPI) {
      var plots = window.FarmAPI.getPlots();
      var cropsDirty = false;
      for (var p = 0; p < 6; p++) {
        var bar = document.getElementById('fp-bar-crop' + p);
        var hasCrop = plots[p] && plots[p].crop;
        if ((bar && !hasCrop) || (!bar && hasCrop)) {
          cropsDirty = true;
          break;
        }
        if (bar && hasCrop) {
          bar.style.width = Math.min(100, Math.round(plots[p].growthPct * 100)) + '%';
        }
      }
      if (cropsDirty) {
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
    } else if (item.type === 'special') {
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

  var FP_PET_LINES = {
    cat: [
      'Nice farm~', 'Meow!', '*stretches*', 'Any fish?',
      'So many crops...', '*purrs*', 'I like it here', 'Cozy spot'
    ],
    dragon: [
      'Need fire?', '*snorts*', 'Big farm!', 'More gold!',
      'I guard this', '*flaps wings*', 'Impressive', 'Warm here'
    ],
    robot: [
      'Scanning...', 'Optimal!', 'Efficiency++', 'Processing...',
      'All systems go', 'Data logged', 'Calibrating', 'Farm online'
    ]
  };

  function getRandomFarmPetLine() {
    var petType = 'cat';
    if (window.PetSystem && window.PetSystem.getState) {
      var ps = window.PetSystem.getState();
      if (ps && ps.activePet) petType = ps.activePet;
    }
    var lines = FP_PET_LINES[petType] || FP_PET_LINES.cat;
    return lines[Math.floor(Math.random() * lines.length)];
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

  function schedulePetWalk() {
    if (fpPetTimer) clearTimeout(fpPetTimer);
    var delay = 20000 + Math.floor(Math.random() * 15000); // 20-35s
    fpPetTimer = setTimeout(doPetWalk, delay);
  }

  function doPetWalk() {
    if (fpPetBusy || !fpPetEl) {
      schedulePetWalk();
      return;
    }

    // Pick a random built station
    var builtCells = [];
    for (var i = 0; i < GRID_LAYOUT.length; i++) {
      var item = GRID_LAYOUT[i];
      if (item.key !== 'farmhouse' && isCellBuilt(item)) {
        builtCells.push(item.key);
      }
    }
    if (builtCells.length === 0) {
      schedulePetWalk();
      return;
    }

    var target = builtCells[Math.floor(Math.random() * builtCells.length)];
    fpPetBusy = true;

    // Walk to target
    movePetToCell(target, false);

    // Speak after arriving
    setTimeout(function () {
      fpPetSpeak(getRandomFarmPetLine());

      // Wait then walk home
      setTimeout(function () {
        movePetToCell('farmhouse', false);

        setTimeout(function () {
          fpPetBusy = false;
          schedulePetWalk();
        }, 900);
      }, 2500);
    }, 900);
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

    // Begin idle walk cycle
    schedulePetWalk();
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
