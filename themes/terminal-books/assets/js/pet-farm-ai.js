(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────
  var AI_TICK_MIN = 20000;  // 20s
  var AI_TICK_MAX = 30000;  // 30s
  var IDLE_LOOK_DELAY = 1500; // time pet looks at an element
  var RETURN_DELAY = 500;

  // ── Type helper ────────────────────────────────────
  function getPetType(petId) {
    if (window.PetSystem && window.PetSystem.getCreatureType) {
      return window.PetSystem.getCreatureType(petId) || 'nature';
    }
    // Fallback for legacy
    var legacyTypes = { cat: 'nature', dragon: 'fire', robot: 'tech' };
    return legacyTypes[petId] || 'nature';
  }

  // ── Farm speech lines per type ────────────────────
  var FARM_SPEECH = {
    fire:   ['*warms the soil*', 'grow faster!', '*smoke fertilizer*', 'FIRE HARVEST'],
    nature: ['*digs in dirt*', 'fresh catnip?', '*paws at sprout*', 'harvest time!'],
    tech:   ['CROP STATUS: READY', 'harvesting...', 'yield: optimal', 'soil pH: 6.5'],
    aqua:   ['*waters crops*', 'rain dance!', '*sprinkles*', 'hydration time'],
    shadow: ['*lurks in field*', 'dark harvest...', '*shadow grows*', 'night yields'],
    mystic: ['*enchants soil*', 'grow, little one', '*sparkle dust*', 'magic harvest']
  };

  // ── Idle interaction speech per target ───────────────
  var IDLE_SPEECH = {
    wallet: {
      fire:   ['my hoard!', 'not enough gold', '*guards coins*', 'MINE'],
      nature: ['my coins!', '*counts fish*', 'need more treats', '*taps wallet*'],
      tech:   ['balance: checked', 'funds: noted', 'calculating ROI', 'portfolio: stable'],
      aqua:   ['coins flow in~', '*splashes wallet*', 'liquid assets!', 'cashflow!'],
      shadow: ['*steals a peek*', 'hidden fortune', '*hoards in dark*', 'secret stash'],
      mystic: ['*conjures coins*', 'enchanted gold~', 'fortune foretold', '*mystical glow*']
    },
    theme: {
      fire:   ['matrix looks cool', '*smoke changes color*', 'pretty lights', 'fire theme when?'],
      nature: ['ooh colors', '*bats at switch*', 'dark mode plz', '*curious paw*'],
      tech:   ['UI PREFERENCE: noted', 'theme: optimal', 'display calibrated', 'contrast: good'],
      aqua:   ['ocean blue plz', '*ripple effect*', 'cool tones~', 'water theme!'],
      shadow: ['darker...', '*dims the lights*', 'void mode', 'embrace the dark'],
      mystic: ['*prismatic shift*', 'aurora colors!', 'enchanted palette', '*sparkles*']
    },
    title: {
      fire:   ['nice site name', '*perches on title*', 'books have gold?', 'good domain'],
      nature: ['are books good?', 'yes.', '*rubs against logo*', 'I prefer fish books'],
      tech:   ['SITE: identified', 'brand: recognized', 'title: verified', 'name: approved'],
      aqua:   ['*splashes title*', 'diving into books!', 'a sea of words~', 'deep reading'],
      shadow: ['*hides behind logo*', 'dark tales...', 'forbidden books', '*lurks at title*'],
      mystic: ['*enchants the title*', 'magical words~', 'spellbound!', '*glowing runes*']
    },
    nav: {
      fire:   ['treasure map!', '*follows the link*', 'new territory', 'explore!'],
      nature: ['where does this go?', '*curious sniff*', 'adventure!', '*paws at link*'],
      tech:   ['LINK: scanning', 'href: analyzed', 'navigation: logged', 'route: mapped'],
      aqua:   ['*rides the current*', 'go with the flow!', 'downstream~', '*surfs links*'],
      shadow: ['*sneaks through link*', 'hidden path...', 'secret passage', '*slips away*'],
      mystic: ['*opens portal*', 'magic doorway~', 'where does it lead?', '*arcane gateway*']
    },
    emptyPlot: {
      fire:   ['needs seeds', '*pokes dirt*', 'barren land', 'plant fire flowers!'],
      nature: ['*digs in dirt*', 'plant something!', '*buries toy*', 'empty...'],
      tech:   ['PLOT: vacant', 'soil: idle', 'suggestion: plant crop', 'utilization: 0%'],
      aqua:   ['needs water first', '*puddles form*', 'irrigate this!', 'dry soil...'],
      shadow: ['*buries something*', 'dark seeds...', 'nightshade plot', '*digs in shadow*'],
      mystic: ['*blesses the soil*', 'enchant & plant~', 'magic seeds!', '*ritual circle*']
    },
    teleporter: {
      fire:   ['*sniffs portal*', 'farm awaits!', 'warp pad!', 'beam energy!'],
      nature: ['*sniffs pad*', 'beam me up?', 'ooh glowy', '*paws at light*'],
      tech:   ['TELEPORTER: online', 'coordinates locked', 'quantum link: stable', 'transport ready'],
      aqua:   ['*rides the beam*', 'whirlpool warp!', 'tidal transport~', '*splashes in*'],
      shadow: ['*shadow steps*', 'void travel...', 'dark warp', '*phases through*'],
      mystic: ['*casts teleport*', 'arcane gateway~', 'blink!', '*mystical beam*']
    }
  };

  // ── Beamed idle speech (mini pet at farm) ───────────
  var BEAMED_IDLE_SPEECH = {
    fire:   ['*basks in sun*', 'good land', '*sniffs crops*', 'my domain', '*curls up by house*'],
    nature: ['*stretches on grass*', 'nice farm~', '*rolls in dirt*', 'comfy here', '*purrs at farmhouse*'],
    tech:   ['PERIMETER: secure', 'farm status: good', 'idle mode: active', 'all systems nominal', 'scanning crops...'],
    aqua:   ['*splashes in puddle*', 'well watered~', '*listens to rain*', 'fresh and cool', '*drips contentedly*'],
    shadow: ['*hides in shade*', 'quiet fields...', '*watches from dark*', 'night shift', '*lurks by fence*'],
    mystic: ['*meditates on grass*', 'enchanted land~', '*glows softly*', 'magic in the soil', '*hums a spell*']
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
    var ps = getPetSystem();
    if (ps) ps.setFarming(false, null);
  }

  // ── Beamed idle interaction ───────────────────────
  function beamedIdleInteraction(petId) {
    var farm = getFarmAPI();
    if (!farm) { busy = false; return; }

    var petType = getPetType(petId);
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
        var lines = IDLE_SPEECH.emptyPlot[petType] || IDLE_SPEECH.emptyPlot.nature;
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
    var idleLines = BEAMED_IDLE_SPEECH[petType] || BEAMED_IDLE_SPEECH.nature;
    farm.miniPetSpeak(randomMessage(idleLines));
  }

  // ── Idle interaction with page elements ─────────────
  function idleInteraction(petId) {
    var ps = getPetSystem();
    if (!ps) { busy = false; return; }

    var petType = getPetType(petId);

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
          var lines = speechSet[petType] || speechSet.nature;
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

  // ── Type-based soil bonus ──────────────────────────
  function applyTypeBonus() {
    var ps = getPetSystem();
    var farm = getFarmAPI();
    if (!ps || !farm) return;

    var state = ps.getState();
    if (!state) { farm.setGrowTimeMultiplier(1); return; }

    var petType = getPetType(state.petId);
    if (petType === 'fire') {
      farm.setGrowTimeMultiplier(0.9);
    } else if (petType === 'aqua') {
      farm.setGrowTimeMultiplier(0.95);
    } else {
      farm.setGrowTimeMultiplier(1);
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
    var petType = getPetType(petId);
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
        var bLines = FARM_SPEECH[petType] || FARM_SPEECH.nature;
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
      var lines = FARM_SPEECH[petType] || FARM_SPEECH.nature;
      ps.speak(randomMessage(lines));
    }

    scheduleTick();
  }

  function scheduleTick() {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(aiTick, randomBetween(AI_TICK_MIN, AI_TICK_MAX));
  }

  // ── Wrap PetSystem.reload for type bonus refresh ────
  function wrapReload() {
    var ps = getPetSystem();
    if (!ps || !ps.reload) return;

    var origReload = ps.reload;
    ps.reload = function () {
      origReload();
      // Re-apply type bonus after pet switch
      setTimeout(applyTypeBonus, 100);
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

    // Apply type bonus on load
    applyTypeBonus();

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
