(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────
  var AI_TICK_MIN = 20000;  // 20s
  var AI_TICK_MAX = 30000;  // 30s
  var INTERACT_DELAY = 1500; // time pet "tends" the plot
  var RETURN_DELAY = 500;

  // ── Farm speech lines per pet ───────────────────────
  var FARM_SPEECH = {
    cat:    ['*digs in dirt*', 'fresh catnip?', '*paws at sprout*', 'harvest time!'],
    dragon: ['*warms the soil*', 'grow faster!', '*smoke fertilizer*', 'FIRE HARVEST'],
    robot:  ['CROP STATUS: READY', 'harvesting...', 'yield: optimal', 'soil pH: 6.5']
  };

  var DOUBLE_HARVEST_SPEECH = {
    cat:    'double harvest! *purrs*',
    dragon: 'DOUBLE FIRE HARVEST!',
    robot:  'BONUS YIELD DETECTED'
  };

  var REPLANT_SPEECH = '*plants another*';

  // ── State ───────────────────────────────────────────
  var aiTimer = null;
  var busy = false;
  var cancelled = false;

  // ── Helpers ─────────────────────────────────────────
  function randomBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min));
  }

  function randomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getPetSystem() {
    return window.PetSystem || null;
  }

  function getFarmAPI() {
    return window.FarmAPI || null;
  }

  // ── Cancel callback for drag interruption ───────────
  function onCancel() {
    cancelled = true;
    busy = false;
    // Remove tending class from all plots
    var plots = document.querySelectorAll('.farm-plot-pet-tending');
    for (var i = 0; i < plots.length; i++) {
      plots[i].classList.remove('farm-plot-pet-tending');
    }
    var ps = getPetSystem();
    if (ps) ps.setFarming(false, null);
  }

  // ── Find best plot to harvest ───────────────────────
  function findReadyPlot() {
    var farm = getFarmAPI();
    if (!farm) return null;

    var plots = farm.getPlots();
    for (var i = 0; i < plots.length; i++) {
      if (plots[i].stage === 'ready') return plots[i];
    }
    return null;
  }

  // ── Walk → Interact → Harvest → Return sequence ────
  function farmSequence(plot) {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) { busy = false; return; }

    var state = ps.getState();
    if (!state) { busy = false; return; }

    cancelled = false;
    busy = true;

    // 1. Enable farming mode (drag will cancel)
    ps.setFarming(true, onCancel);

    // 2. Speak a farm line
    var petId = state.petId;
    var lines = FARM_SPEECH[petId] || FARM_SPEECH.cat;
    ps.speak(randomMessage(lines));

    // 3. Get plot DOM position
    var plotEl = farm.getPlotElement(plot.index);
    if (!plotEl) { cleanup(); return; }

    var rect = plotEl.getBoundingClientRect();
    var size = 48; // pet sprite size approx
    var plotX = rect.left + rect.width / 2 - size / 2;
    var plotY = rect.top - size;

    // 4. Walk to plot
    var walked = ps.walkTo(plotX, plotY, function (wasDocked) {
      if (cancelled) return;

      // 5. Add tending indicator
      plotEl.classList.add('farm-plot-pet-tending');

      // 6. Wait interaction time, then harvest
      setTimeout(function () {
        if (cancelled) return;

        plotEl.classList.remove('farm-plot-pet-tending');

        // Harvest
        var result = farm.harvest(plot.index);
        if (result) {
          farm.showHarvestParticle(plot.index, result.crop);
          ps.celebrate();

          // Per-pet bonuses
          applyBonuses(petId, state.level, plot.index, result);
        }

        // 7. Return after delay
        setTimeout(function () {
          if (cancelled) return;
          ps.returnToPosition(wasDocked);
          cleanup();
        }, RETURN_DELAY);

      }, INTERACT_DELAY);
    });

    if (!walked) {
      cleanup();
    }
  }

  function cleanup() {
    busy = false;
    var ps = getPetSystem();
    if (ps) ps.setFarming(false, null);
  }

  // ── Per-pet bonuses ─────────────────────────────────
  function applyBonuses(petId, level, plotIndex, harvestResult) {
    var farm = getFarmAPI();
    var ps = getPetSystem();
    if (!farm || !ps) return;

    // Level 3 bonus: 8% chance of double harvest
    if (level >= 3 && Math.random() < 0.08) {
      var extra = harvestResult.amount;
      if (window.JackBucks) {
        window.JackBucks.add(extra);
      }
      var speech = DOUBLE_HARVEST_SPEECH[petId] || 'double harvest!';
      setTimeout(function () { ps.speak(speech); }, 600);
    }

    // Cat "Green Paw": 15% chance auto-replant
    if (petId === 'cat' && Math.random() < 0.15) {
      setTimeout(function () {
        var planted = farm.plant(plotIndex, harvestResult.crop);
        if (planted) {
          ps.speak(REPLANT_SPEECH);
        }
      }, 400);
    }
  }

  // ── Dragon "Warm Soil" bonus ────────────────────────
  function applyDragonBonus() {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) return;

    var state = ps.getState();
    if (state && state.petId === 'dragon') {
      farm.setGrowTimeMultiplier(0.9);
    } else {
      farm.setGrowTimeMultiplier(1);
    }
  }

  // ── Robot "Auto-Harvest" on page load ───────────────
  function robotAutoHarvest() {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) return;

    var state = ps.getState();
    if (!state || state.petId !== 'robot') return;

    var plots = farm.getPlots();
    var harvested = 0;
    for (var i = 0; i < plots.length; i++) {
      if (plots[i].stage === 'ready') {
        var result = farm.harvest(plots[i].index);
        if (result) {
          farm.showHarvestParticle(plots[i].index, result.crop);
          harvested++;
        }
      }
    }

    if (harvested > 0) {
      ps.speak('auto-harvested ' + harvested + ' crop' + (harvested > 1 ? 's' : ''));
    }
  }

  // ── AI tick ─────────────────────────────────────────
  function aiTick() {
    var ps = getPetSystem();
    if (!ps || busy) { scheduleTick(); return; }

    var state = ps.getState();
    if (!state || ps.isBusy()) { scheduleTick(); return; }

    // Only act when idle or sleeping
    if (state.anim !== 'idle' && state.anim !== 'sleeping') {
      scheduleTick();
      return;
    }

    // Find a ready plot
    var target = findReadyPlot();
    if (!target) {
      // 10% chance to speak a farm line anyway
      if (Math.random() < 0.10) {
        var lines = FARM_SPEECH[state.petId] || FARM_SPEECH.cat;
        ps.speak(randomMessage(lines));
      }
      scheduleTick();
      return;
    }

    // Execute farming sequence
    farmSequence(target);
    scheduleTick();
  }

  function scheduleTick() {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(aiTick, randomBetween(AI_TICK_MIN, AI_TICK_MAX));
  }

  // ── Wrap PetSystem.reload for dragon bonus refresh ──
  function wrapReload() {
    var ps = getPetSystem();
    if (!ps || !ps.reload) return;

    var origReload = ps.reload;
    ps.reload = function () {
      origReload();
      // Re-apply dragon bonus after pet switch
      setTimeout(applyDragonBonus, 100);
    };
  }

  // ── Init ────────────────────────────────────────────
  function init() {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) return;

    // Apply dragon bonus on load
    applyDragonBonus();

    // Robot auto-harvest on load
    robotAutoHarvest();

    // Wrap reload for pet switches
    wrapReload();

    // Start AI loop
    scheduleTick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
