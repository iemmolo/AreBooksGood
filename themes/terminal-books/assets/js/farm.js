(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-farm';
  var UPDATE_INTERVAL = 10000; // 10s refresh

  // ── Crop definitions ────────────────────────────────────
  var CROPS = {
    carrot: { name: 'Carrot', growTime: 5 * 60 * 1000, sell: 2, icon: 'C' },
    potato: { name: 'Potato', growTime: 15 * 60 * 1000, sell: 5, icon: 'P' },
    wheat:  { name: 'Wheat',  growTime: 30 * 60 * 1000, sell: 8, icon: 'W' }
  };

  // Growth stages: 0-25% planted, 25-50% sprouting, 50-75% growing, 75-100% flowering, 100% ready
  var STAGES = ['planted', 'sprouting', 'growing', 'flowering', 'ready'];

  // ── 8x8 Crop sprites (box-shadow pixel art) ────────────
  // Each sprite is an array of [x, y, color] for non-empty pixels
  // Rendered at 3px per pixel = 24x24px final size
  var PIXEL = 3;

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
    }
  };

  // ── State ───────────────────────────────────────────────
  var farmState;
  var farmBarEl;
  var pickerEl;
  var activePlotIndex = -1;
  var updateTimer;

  function defaultState() {
    return {
      plots: [{ crop: null }, { crop: null }],
      unlockedPlots: 2
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.plots) return saved;
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(farmState));
    } catch (e) {}
  }

  // ── Growth engine ───────────────────────────────────────
  function getPlotStage(plot) {
    if (!plot || !plot.crop) return null;
    var crop = CROPS[plot.crop];
    if (!crop) return null;
    var elapsed = Date.now() - plot.plantedAt;
    var pct = elapsed / crop.growTime;
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
    return Math.min(1, elapsed / crop.growTime);
  }

  // ── Sprite rendering (box-shadow pixel art) ─────────────
  function renderSprite(container, pixels) {
    container.innerHTML = '';
    if (!pixels || !pixels.length) return;

    var canvas = document.createElement('div');
    canvas.className = 'farm-crop-canvas';
    canvas.style.width = PIXEL + 'px';
    canvas.style.height = PIXEL + 'px';

    var shadows = [];
    for (var i = 0; i < pixels.length; i++) {
      var p = pixels[i];
      shadows.push((p[0] * PIXEL) + 'px ' + (p[1] * PIXEL) + 'px 0 0 ' + p[2]);
    }
    canvas.style.boxShadow = shadows.join(',');
    container.appendChild(canvas);
  }

  // ── DOM creation ────────────────────────────────────────
  function createFarmBar() {
    farmBarEl = document.createElement('div');
    farmBarEl.className = 'farm-bar';
    farmBarEl.id = 'farm-bar';

    for (var i = 0; i < farmState.plots.length; i++) {
      farmBarEl.appendChild(createPlotEl(i));
    }

    document.body.appendChild(farmBarEl);

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

      // Progress bar
      var progress = document.createElement('div');
      progress.className = 'farm-plot-progress';
      progress.style.width = (getGrowthPct(plot) * 100) + '%';
      el.appendChild(progress);
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
        var btn = document.createElement('button');
        btn.className = 'farm-seed-option';
        btn.type = 'button';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'farm-seed-name';
        nameSpan.textContent = crop.name;

        var timeSpan = document.createElement('span');
        timeSpan.className = 'farm-seed-time';
        timeSpan.textContent = formatTime(crop.growTime);

        btn.appendChild(nameSpan);
        btn.appendChild(timeSpan);

        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          plantSeed(activePlotIndex, key);
          closeSeedPicker();
        });

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

    var sellValue = crop.sell;

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

  // ── Visibility sync with pet ────────────────────────────
  function syncVisibility() {
    if (!farmBarEl) return;
    try {
      var petRaw = localStorage.getItem('arebooksgood-pet');
      if (petRaw) {
        var petData = JSON.parse(petRaw);
        if (petData && petData.visible === false) {
          farmBarEl.style.display = 'none';
        }
      }
    } catch (e) {}
  }

  // Hook into pet toggle by watching for pet container visibility changes
  function watchPetToggle() {
    var origToggle = window.PetSystem && window.PetSystem.toggle;
    if (origToggle) {
      window.PetSystem.toggle = function () {
        origToggle();
        // After toggle, sync farm visibility
        if (farmBarEl) {
          try {
            var petRaw = localStorage.getItem('arebooksgood-pet');
            if (petRaw) {
              var petData = JSON.parse(petRaw);
              farmBarEl.style.display = (petData && petData.visible === false) ? 'none' : '';
            }
          } catch (e) {}
        }
      };
    }
  }

  // ── Init ────────────────────────────────────────────────
  function init() {
    farmState = loadState();
    createFarmBar();
    updatePlots(); // Immediate catch-up for offline growth
    updateTimer = setInterval(updatePlots, UPDATE_INTERVAL);
    watchPetToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
