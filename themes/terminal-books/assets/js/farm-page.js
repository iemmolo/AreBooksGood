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
      label: 'Processed',
      items: [
        { key: 'flour', name: 'Flour', icon: '\uD83C\uDF5E' },
        { key: 'planks', name: 'Planks', icon: '\uD83E\uDE93' },
        { key: 'stoneBricks', name: 'Stone Bricks', icon: '\uD83E\uDDF1' }
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

    // Processing stations: basic tier always built, advanced/elite locked
    if (item.type === 'processing') {
      if (item.tier === 'basic') return true;
      return false; // advanced/elite need TD blueprints
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

    // Update crop progress bars
    if (window.FarmAPI) {
      var plots = window.FarmAPI.getPlots();
      for (var p = 0; p < 6; p++) {
        var bar = document.getElementById('fp-bar-crop' + p);
        if (bar && plots[p] && plots[p].crop) {
          bar.style.width = Math.min(100, Math.round(plots[p].growthPct * 100)) + '%';
        }
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

    // Position via getBoundingClientRect
    var rect = cellEl.getBoundingClientRect();
    var popupWidth = 170;
    var popupLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 8));
    stationPopupEl.style.left = popupLeft + 'px';

    // Try placing above the cell; if too close to top, place below
    if (rect.top > 140) {
      stationPopupEl.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    } else {
      stationPopupEl.style.top = (rect.bottom + 6) + 'px';
    }

    document.body.appendChild(stationPopupEl);

    setTimeout(function () {
      document.addEventListener('click', outsideStationPopupClick);
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
      return;
    }

    // Get crop name from defs
    var cropName = cropInfo.crop;
    if (window.FarmAPI && window.FarmAPI.getCropDefs) {
      var defs = window.FarmAPI.getCropDefs();
      if (defs[cropInfo.crop]) {
        cropName = defs[cropInfo.crop].name;
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
    pctRow.textContent = pct + '% grown';
    popup.appendChild(pctRow);
  }

  function renderProcessingPopup(item, popup) {
    var header = document.createElement('div');
    header.className = 'fp-popup-header';
    header.textContent = (ICONS[item.key] || '') + ' ' + item.name;
    popup.appendChild(header);

    var row = document.createElement('div');
    row.className = 'fp-popup-row fp-popup-rate';
    if (item.tier === 'basic') {
      row.textContent = 'Coming soon';
    } else {
      row.textContent = 'Locked';
    }
    popup.appendChild(row);
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
