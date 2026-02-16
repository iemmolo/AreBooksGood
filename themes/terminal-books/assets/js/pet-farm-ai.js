(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────
  var AI_TICK_MIN = 20000;  // 20s
  var AI_TICK_MAX = 30000;  // 30s
  var INTERACT_DELAY = 1500; // time pet "tends" the plot
  var WATER_DELAY = 1200;    // time pet waters
  var IDLE_LOOK_DELAY = 1500; // time pet looks at an element
  var RETURN_DELAY = 500;

  // ── Farm speech lines per pet ───────────────────────
  var FARM_SPEECH = {
    cat:    ['*digs in dirt*', 'fresh catnip?', '*paws at sprout*', 'harvest time!'],
    dragon: ['*warms the soil*', 'grow faster!', '*smoke fertilizer*', 'FIRE HARVEST'],
    robot:  ['CROP STATUS: READY', 'harvesting...', 'yield: optimal', 'soil pH: 6.5']
  };

  var WATER_SPEECH = {
    cat:    ['*splashes water*', '*paws at puddle*', 'wet paws!', '*shakes off water*'],
    dragon: ['*steam hiss*', 'gentle warmth~', '*breathes mist*', 'grow, little one'],
    robot:  ['H2O DISPENSED', 'irrigation: active', 'moisture: +10%', 'watering protocol']
  };

  var DOUBLE_HARVEST_SPEECH = {
    cat:    'double harvest! *purrs*',
    dragon: 'DOUBLE FIRE HARVEST!',
    robot:  'BONUS YIELD DETECTED'
  };

  var REPLANT_SPEECH = '*plants another*';

  // ── Idle interaction speech per target ───────────────
  var IDLE_SPEECH = {
    wallet: {
      cat:    ['my coins!', '*counts fish*', 'need more treats', '*taps wallet*'],
      dragon: ['my hoard!', 'not enough gold', '*guards coins*', 'MINE'],
      robot:  ['balance: checked', 'funds: noted', 'calculating ROI', 'portfolio: stable']
    },
    theme: {
      cat:    ['ooh colors', '*bats at switch*', 'dark mode plz', '*curious paw*'],
      dragon: ['matrix looks cool', '*smoke changes color*', 'pretty lights', 'fire theme when?'],
      robot:  ['UI PREFERENCE: noted', 'theme: optimal', 'display calibrated', 'contrast: good']
    },
    title: {
      cat:    ['are books good?', 'yes.', '*rubs against logo*', 'I prefer fish books'],
      dragon: ['nice site name', '*perches on title*', 'books have gold?', 'good domain'],
      robot:  ['SITE: identified', 'brand: recognized', 'title: verified', 'name: approved']
    },
    nav: {
      cat:    ['where does this go?', '*curious sniff*', 'adventure!', '*paws at link*'],
      dragon: ['treasure map!', '*follows the link*', 'new territory', 'explore!'],
      robot:  ['LINK: scanning', 'href: analyzed', 'navigation: logged', 'route: mapped']
    },
    emptyPlot: {
      cat:    ['*digs in dirt*', 'plant something!', '*buries toy*', 'empty...'],
      dragon: ['needs seeds', '*pokes dirt*', 'barren land', 'plant fire flowers!'],
      robot:  ['PLOT: vacant', 'soil: idle', 'suggestion: plant crop', 'utilization: 0%']
    },
    teleporter: {
      cat:    ['*sniffs pad*', 'beam me up?', 'ooh glowy', '*paws at light*'],
      dragon: ['*sniffs portal*', 'farm awaits!', 'warp pad!', 'beam energy!'],
      robot:  ['TELEPORTER: online', 'coordinates locked', 'quantum link: stable', 'transport ready']
    }
  };

  // ── Beamed idle speech (mini pet at farm) ───────────
  var BEAMED_IDLE_SPEECH = {
    cat:    ['*stretches on grass*', 'nice farm~', '*rolls in dirt*', 'comfy here', '*purrs at farmhouse*'],
    dragon: ['*basks in sun*', 'good land', '*sniffs crops*', 'my domain', '*curls up by house*'],
    robot:  ['PERIMETER: secure', 'farm status: good', 'idle mode: active', 'all systems nominal', 'scanning crops...']
  };

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

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 &&
           rect.bottom <= window.innerHeight &&
           rect.right <= window.innerWidth &&
           rect.width > 0 && rect.height > 0;
  }

  // ── Cancel callback for drag interruption ───────────
  function onCancel() {
    cancelled = true;
    busy = false;
    // Remove indicator classes from all plots
    var tending = document.querySelectorAll('.farm-plot-pet-tending, .farm-plot-watering');
    for (var i = 0; i < tending.length; i++) {
      tending[i].classList.remove('farm-plot-pet-tending');
      tending[i].classList.remove('farm-plot-watering');
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

  // ── Find best plot to water ─────────────────────────
  function findWaterablePlot() {
    var farm = getFarmAPI();
    if (!farm) return null;

    var plots = farm.getPlots();
    var best = null;
    for (var i = 0; i < plots.length; i++) {
      var p = plots[i];
      if (!p.crop || p.wateredAt) continue;
      // Only water between 25% and 90% growth
      if (p.growthPct < 0.25 || p.growthPct > 0.90) continue;
      if (p.stage === 'ready') continue;
      // Prefer highest progress
      if (!best || p.growthPct > best.growthPct) {
        best = p;
      }
    }
    return best;
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

  // ── Walk → Water → Return sequence ─────────────────
  function waterSequence(plot) {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) { busy = false; return; }

    var state = ps.getState();
    if (!state) { busy = false; return; }

    cancelled = false;
    busy = true;

    ps.setFarming(true, onCancel);

    var petId = state.petId;
    var lines = WATER_SPEECH[petId] || WATER_SPEECH.cat;
    ps.speak(randomMessage(lines));

    var plotEl = farm.getPlotElement(plot.index);
    if (!plotEl) { cleanup(); return; }

    var rect = plotEl.getBoundingClientRect();
    var size = 48;
    var plotX = rect.left + rect.width / 2 - size / 2;
    var plotY = rect.top - size;

    var walked = ps.walkTo(plotX, plotY, function (wasDocked) {
      if (cancelled) return;

      plotEl.classList.add('farm-plot-watering');

      setTimeout(function () {
        if (cancelled) return;

        plotEl.classList.remove('farm-plot-watering');

        // Apply water boost
        var watered = farm.water(plot.index);
        if (watered) {
          farm.showWaterParticle(plot.index);
        }

        setTimeout(function () {
          if (cancelled) return;
          ps.returnToPosition(wasDocked);
          cleanup();
        }, RETURN_DELAY);

      }, WATER_DELAY);
    });

    if (!walked) {
      cleanup();
    }
  }

  // ── Beamed farm sequence (mini pet walks to plot) ──
  function beamedFarmSequence(plot) {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) { busy = false; return; }

    var state = ps.getState();
    if (!state) { busy = false; return; }

    busy = true;
    farm.setMiniPetBusy(true);

    var petId = state.petId;
    var lines = FARM_SPEECH[petId] || FARM_SPEECH.cat;
    farm.miniPetSpeak(randomMessage(lines));

    // Walk to plot
    farm.walkMiniPetToPlot(plot.index, function () {
      // Add tending indicator
      var plotEl = farm.getPlotElement(plot.index);
      if (plotEl) plotEl.classList.add('farm-plot-pet-tending');

      setTimeout(function () {
        if (plotEl) plotEl.classList.remove('farm-plot-pet-tending');

        // Harvest
        var result = farm.harvest(plot.index);
        if (result) {
          farm.showHarvestParticle(plot.index, result.crop);
          farm.miniPetCelebrate();
          applyBonuses(petId, state.level, plot.index, result);
        }

        // Return home after delay
        setTimeout(function () {
          farm.returnMiniPetHome(function () {
            busy = false;
            farm.setMiniPetBusy(false);
          });
        }, RETURN_DELAY);

      }, INTERACT_DELAY);
    });
  }

  // ── Beamed water sequence (mini pet walks to plot) ─
  function beamedWaterSequence(plot) {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) { busy = false; return; }

    var state = ps.getState();
    if (!state) { busy = false; return; }

    busy = true;
    farm.setMiniPetBusy(true);

    var petId = state.petId;
    var lines = WATER_SPEECH[petId] || WATER_SPEECH.cat;
    farm.miniPetSpeak(randomMessage(lines));

    farm.walkMiniPetToPlot(plot.index, function () {
      var plotEl = farm.getPlotElement(plot.index);
      if (plotEl) plotEl.classList.add('farm-plot-watering');

      setTimeout(function () {
        if (plotEl) plotEl.classList.remove('farm-plot-watering');

        var watered = farm.water(plot.index);
        if (watered) {
          farm.showWaterParticle(plot.index);
        }

        setTimeout(function () {
          farm.returnMiniPetHome(function () {
            busy = false;
            farm.setMiniPetBusy(false);
          });
        }, RETURN_DELAY);

      }, WATER_DELAY);
    });
  }

  // ── Beamed idle interaction ───────────────────────
  function beamedIdleInteraction(petId) {
    var farm = getFarmAPI();
    if (!farm) { busy = false; return; }

    var plots = farm.getPlots();

    // 50% chance: walk to a random empty plot and comment
    var emptyPlots = [];
    for (var i = 0; i < plots.length; i++) {
      if (!plots[i].crop) emptyPlots.push(plots[i]);
    }

    if (emptyPlots.length > 0 && Math.random() < 0.5) {
      var pick = emptyPlots[Math.floor(Math.random() * emptyPlots.length)];
      busy = true;
      farm.setMiniPetBusy(true);

      farm.walkMiniPetToPlot(pick.index, function () {
        var lines = IDLE_SPEECH.emptyPlot[petId] || IDLE_SPEECH.emptyPlot.cat;
        farm.miniPetSpeak(randomMessage(lines));

        setTimeout(function () {
          farm.returnMiniPetHome(function () {
            busy = false;
            farm.setMiniPetBusy(false);
          });
        }, IDLE_LOOK_DELAY);
      });
      return;
    }

    // Otherwise speak an idle line at home
    var idleLines = BEAMED_IDLE_SPEECH[petId] || BEAMED_IDLE_SPEECH.cat;
    farm.miniPetSpeak(randomMessage(idleLines));
  }

  // ── Idle interaction with page elements ─────────────
  function idleInteraction(petId) {
    var ps = getPetSystem();
    if (!ps) { busy = false; return; }

    // Build list of valid targets
    var targets = [];

    var wallet = document.getElementById('wallet-widget');
    if (wallet && isInViewport(wallet)) targets.push({ el: wallet, key: 'wallet' });

    var themeSelect = document.getElementById('theme-select');
    if (themeSelect && isInViewport(themeSelect)) targets.push({ el: themeSelect, key: 'theme' });

    var siteTitle = document.querySelector('.site-title');
    if (siteTitle && isInViewport(siteTitle)) targets.push({ el: siteTitle, key: 'title' });

    var navLinks = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < navLinks.length; i++) {
      if (isInViewport(navLinks[i])) {
        targets.push({ el: navLinks[i], key: 'nav' });
        break; // only add one nav link
      }
    }

    var emptyPlots = document.querySelectorAll('.farm-plot-empty');
    for (var j = 0; j < emptyPlots.length; j++) {
      if (isInViewport(emptyPlots[j])) {
        targets.push({ el: emptyPlots[j], key: 'emptyPlot' });
        break;
      }
    }

    var teleporter = document.querySelector('.pet-teleporter');
    if (teleporter && isInViewport(teleporter)) targets.push({ el: teleporter, key: 'teleporter' });

    if (targets.length === 0) { busy = false; return; }

    // Pick a random target
    var target = targets[Math.floor(Math.random() * targets.length)];

    cancelled = false;
    busy = true;

    ps.setFarming(true, onCancel);

    var rect = target.el.getBoundingClientRect();
    var size = 48;
    var tx = rect.left + rect.width / 2 - size / 2;
    var ty = rect.top - size;
    // Keep pet on screen
    if (ty < 0) ty = rect.bottom + 4;

    var walked = ps.walkTo(tx, ty, function (wasDocked) {
      if (cancelled) return;

      // Pet looks at the element
      setTimeout(function () {
        if (cancelled) return;

        // Speak reaction
        var speechSet = IDLE_SPEECH[target.key];
        if (speechSet) {
          var lines = speechSet[petId] || speechSet.cat;
          ps.speak(randomMessage(lines));
        }

        setTimeout(function () {
          if (cancelled) return;
          ps.returnToPosition(wasDocked);
          cleanup();
        }, RETURN_DELAY);

      }, IDLE_LOOK_DELAY);
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

    // Farmhouse level 5 bonus: 5% chance to drop a random seed
    if (farm.getFarmhouseLevel && farm.getFarmhouseLevel() >= 5 && Math.random() < 0.05) {
      var seedOptions = ['tomato', 'corn', 'pumpkin', 'golden_apple', 'crystal_herb', 'dragon_fruit'];
      var dropped = seedOptions[Math.floor(Math.random() * seedOptions.length)];
      if (farm.addSeeds) {
        farm.addSeeds(dropped, 1);
        setTimeout(function () {
          ps.speak('found a ' + dropped + ' seed!');
        }, 800);
      }
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
    var farm = getFarmAPI();
    if (!ps || busy) { scheduleTick(); return; }

    var state = ps.getState();
    if (!state) { scheduleTick(); return; }

    var petId = state.petId;
    var beamed = ps.isBeamed && ps.isBeamed();

    // ── Beamed mode: use mini pet on farm ──────────
    if (beamed) {
      if (!farm || farm.isMiniPetBusy()) { scheduleTick(); return; }

      // Priority 1: 15% chance beamed idle interaction
      if (Math.random() < 0.15) {
        beamedIdleInteraction(petId);
        scheduleTick();
        return;
      }

      // Priority 4: 10% chance random farm speech
      if (Math.random() < 0.10) {
        var bLines = FARM_SPEECH[petId] || FARM_SPEECH.cat;
        farm.miniPetSpeak(randomMessage(bLines));
      }

      scheduleTick();
      return;
    }

    // ── Normal mode (pet on page) ─────────────────
    if (ps.isBusy()) { scheduleTick(); return; }
    // Only act when idle or sleeping
    if (state.anim !== 'idle' && state.anim !== 'sleeping') {
      scheduleTick();
      return;
    }

    // Priority 1: 15% chance idle interaction
    if (Math.random() < 0.15) {
      idleInteraction(petId);
      scheduleTick();
      return;
    }

    // Priority 4: 10% chance random farm speech
    if (Math.random() < 0.10) {
      var lines = FARM_SPEECH[petId] || FARM_SPEECH.cat;
      ps.speak(randomMessage(lines));
    }

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

  // ── Init (with retry for async PetSystem) ───────────
  var initAttempts = 0;
  var MAX_INIT_ATTEMPTS = 20; // 20 x 250ms = 5s max wait

  function init() {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !ps.getState) {
      // PetSystem not ready yet (sprite XHR still loading) — retry
      initAttempts++;
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(init, 250);
      }
      return;
    }
    if (!farm) return;

    // Apply dragon bonus on load
    applyDragonBonus();

    // Robot auto-harvest disabled (crops managed via farm page)
    // robotAutoHarvest();

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
