(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-farm-resources';
  var listeners = [];

  // ── Station definitions ─────────────────────────────────
  var STATIONS = {
    lumberYard:  { resource: 'wood',     rate: 720000,   built: true },   // 12min
    quarry:      { resource: 'stone',    rate: 1200000,  built: true },   // 20min
    fishingPond: { resource: 'fish',     rate: 600000,   built: true },   // 10min
    chickenCoop: { resource: 'eggs',     rate: 900000,   built: false },
    cowPasture:  { resource: 'milk',     rate: 1800000,  built: false },
    sheepPen:    { resource: 'wool',     rate: 2700000,  built: false },
    mine:        { resource: 'iron',     rate: 2400000,  built: false },
    deepMine:    { resource: 'gold',     rate: 3600000,  built: false },
    oldGrowth:   { resource: 'hardwood', rate: 2100000,  built: false },
    // Processing stations (no resource — build state only)
    forge:       { resource: null, rate: 0, built: false },
    loom:        { resource: null, rate: 0, built: false },
    smokehouse:  { resource: null, rate: 0, built: false },
    enchanter:   { resource: null, rate: 0, built: false }
  };

  // ── Default state ───────────────────────────────────────
  function defaultState() {
    var stations = {};
    var keys = Object.keys(STATIONS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      stations[k] = {
        level: STATIONS[k].built ? 1 : 0,
        lastCollect: STATIONS[k].built ? Date.now() : 0,
        built: STATIONS[k].built
      };
    }
    return {
      raw: {
        wood: 0, stone: 0, fish: 0, eggs: 0, milk: 0, wool: 0, iron: 0, gold: 0, hardwood: 0,
        carrot: 0, potato: 0, wheat: 0, tomato: 0, corn: 0, pumpkin: 0,
        golden_apple: 0, crystal_herb: 0, dragon_fruit: 0
      },
      processed: { flour: 0, planks: 0, stoneBricks: 0, bread: 0, ironBars: 0, rope: 0, smokedFish: 0, crystalLens: 0 },
      stations: stations,
      processing: {},
      lastUpdated: Date.now()
    };
  }

  // ── Load / Save ─────────────────────────────────────────
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var def = defaultState();
        // Merge stations — keep saved values, fill missing with defaults
        var stations = {};
        var keys = Object.keys(STATIONS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (saved.stations && saved.stations[k]) {
            stations[k] = saved.stations[k];
          } else {
            stations[k] = def.stations[k];
          }
        }
        // Merge raw resources — keep saved values, fill missing with 0
        var rawRes = {};
        var rawKeys = Object.keys(def.raw);
        for (var j = 0; j < rawKeys.length; j++) {
          rawRes[rawKeys[j]] = (saved.raw && saved.raw[rawKeys[j]]) || 0;
        }
        // Merge processed resources
        var processed = {};
        var procKeys = Object.keys(def.processed);
        for (var p = 0; p < procKeys.length; p++) {
          processed[procKeys[p]] = (saved.processed && saved.processed[procKeys[p]]) || 0;
        }
        // Migrate processing: old format was array, new format is per-station object
        var processing = saved.processing || {};
        if (Array.isArray(processing)) {
          processing = {};
        }

        return {
          raw: rawRes,
          processed: processed,
          stations: stations,
          processing: processing,
          lastUpdated: saved.lastUpdated || Date.now()
        };
      }
    } catch (e) {}
    return defaultState();
  }

  var state = load();

  function save() {
    state.lastUpdated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) {}
    }
  }

  // ── Recipe definitions ─────────────────────────────────
  var RECIPES = {
    mill: [
      { id: 'flour', name: 'Flour', inputs: { raw: { wheat: 3 } }, output: { type: 'processed', key: 'flour', qty: 1 }, duration: 300000 }
    ],
    sawmill: [
      { id: 'planks', name: 'Planks', inputs: { raw: { wood: 3 } }, output: { type: 'processed', key: 'planks', qty: 1 }, duration: 480000 }
    ],
    mason: [
      { id: 'stoneBricks', name: 'Stone Bricks', inputs: { raw: { stone: 4 } }, output: { type: 'processed', key: 'stoneBricks', qty: 1 }, duration: 600000 }
    ],
    kitchen: [
      { id: 'bread', name: 'Bread', inputs: { processed: { flour: 2 }, raw: { eggs: 1 } }, output: { type: 'processed', key: 'bread', qty: 1 }, duration: 600000 }
    ],
    forge: [
      { id: 'ironBars', name: 'Iron Bars', inputs: { raw: { iron: 3, wood: 2 } }, output: { type: 'processed', key: 'ironBars', qty: 1 }, duration: 900000 }
    ],
    loom: [
      { id: 'rope', name: 'Rope', inputs: { raw: { wool: 2 } }, output: { type: 'processed', key: 'rope', qty: 1 }, duration: 360000 }
    ],
    smokehouse: [
      { id: 'smokedFish', name: 'Smoked Fish', inputs: { raw: { fish: 2, wood: 1 } }, output: { type: 'processed', key: 'smokedFish', qty: 1 }, duration: 480000 }
    ],
    enchanter: [
      { id: 'crystalLens', name: 'Crystal Lens', inputs: { raw: { crystal_herb: 2, gold: 1 } }, output: { type: 'processed', key: 'crystalLens', qty: 1 }, duration: 1800000 }
    ]
  };

  var MAX_QUEUE = 5;

  // ── Recipe helpers ────────────────────────────────────
  function findRecipe(stationKey, recipeId) {
    var recipes = RECIPES[stationKey];
    if (!recipes) return null;
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i].id === recipeId) return recipes[i];
    }
    return null;
  }

  function canAffordRecipe(recipe) {
    if (!recipe || !recipe.inputs) return false;
    if (recipe.inputs.raw) {
      var rKeys = Object.keys(recipe.inputs.raw);
      for (var i = 0; i < rKeys.length; i++) {
        if ((state.raw[rKeys[i]] || 0) < recipe.inputs.raw[rKeys[i]]) return false;
      }
    }
    if (recipe.inputs.processed) {
      var pKeys = Object.keys(recipe.inputs.processed);
      for (var j = 0; j < pKeys.length; j++) {
        if ((state.processed[pKeys[j]] || 0) < recipe.inputs.processed[pKeys[j]]) return false;
      }
    }
    return true;
  }

  function deductInputs(recipe) {
    if (recipe.inputs.raw) {
      var rKeys = Object.keys(recipe.inputs.raw);
      for (var i = 0; i < rKeys.length; i++) {
        state.raw[rKeys[i]] = (state.raw[rKeys[i]] || 0) - recipe.inputs.raw[rKeys[i]];
      }
    }
    if (recipe.inputs.processed) {
      var pKeys = Object.keys(recipe.inputs.processed);
      for (var j = 0; j < pKeys.length; j++) {
        state.processed[pKeys[j]] = (state.processed[pKeys[j]] || 0) - recipe.inputs.processed[pKeys[j]];
      }
    }
  }

  function processQueues() {
    var now = Date.now();
    var changed = false;
    var stationKeys = Object.keys(RECIPES);
    for (var i = 0; i < stationKeys.length; i++) {
      var sk = stationKeys[i];
      var queue = state.processing[sk];
      if (!queue || queue.length === 0) continue;

      // Complete finished jobs and chain-start waiting ones
      var lastEndTime = 0;
      while (queue.length > 0) {
        var job = queue[0];
        // Start waiting jobs using previous job's end time (offline chaining)
        if (job.startedAt === 0) {
          job.startedAt = lastEndTime || now;
          changed = true;
        }
        var endTime = job.startedAt + job.duration;
        if (now >= endTime) {
          // Deliver output
          var recipe = findRecipe(sk, job.recipeId);
          if (recipe) {
            var pool = recipe.output.type === 'raw' ? state.raw : state.processed;
            pool[recipe.output.key] = (pool[recipe.output.key] || 0) + recipe.output.qty;
            lastEndTime = endTime;
          }
          queue.shift();
          changed = true;
        } else {
          break;
        }
      }
    }
    if (changed) {
      save();
      notify();
    }
  }

  // ── Idle accumulation ───────────────────────────────────
  function collectPending() {
    var now = Date.now();
    var changed = false;
    var keys = Object.keys(STATIONS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var station = state.stations[k];
      if (!station || !station.built || station.level < 1) continue;
      var def = STATIONS[k];
      if (!def.resource) continue;
      var elapsed = now - station.lastCollect;
      var count = Math.floor(elapsed / def.rate);
      if (count > 0) {
        state.raw[def.resource] = (state.raw[def.resource] || 0) + count;
        station.lastCollect += count * def.rate;
        changed = true;
      }
    }
    if (changed) {
      save();
      notify();
    }
    // Process recipe queues (offline-safe)
    processQueues();
  }

  // Collect on page load
  collectPending();

  // ── Public API ──────────────────────────────────────────
  window.FarmResources = {
    getAll: function () {
      return { raw: state.raw, processed: state.processed };
    },

    getRaw: function (type) {
      return state.raw[type] || 0;
    },

    getProcessed: function (type) {
      return state.processed[type] || 0;
    },

    add: function (category, type, n) {
      if (n <= 0) return;
      if (category === 'raw') {
        state.raw[type] = (state.raw[type] || 0) + n;
      } else if (category === 'processed') {
        state.processed[type] = (state.processed[type] || 0) + n;
      }
      save();
      notify();
    },

    deduct: function (category, type, n) {
      if (n <= 0) return 0;
      var pool = category === 'raw' ? state.raw : state.processed;
      var actual = Math.min(n, pool[type] || 0);
      pool[type] = (pool[type] || 0) - actual;
      save();
      notify();
      return actual;
    },

    collectPending: collectPending,

    getSummary: function () {
      var summary = { processing: null };
      var keys = Object.keys(state.raw);
      for (var i = 0; i < keys.length; i++) {
        summary[keys[i]] = state.raw[keys[i]];
      }
      // Find first active processing job across all stations
      var sKeys = Object.keys(state.processing);
      for (var s = 0; s < sKeys.length; s++) {
        var queue = state.processing[sKeys[s]];
        if (queue && queue.length > 0 && queue[0].startedAt > 0) {
          var job = queue[0];
          var remaining = (job.startedAt + job.duration) - Date.now();
          if (remaining > 0) {
            summary.processing = { item: job.recipeId, remaining: remaining, station: sKeys[s] };
            break;
          }
        }
      }
      return summary;
    },

    getStations: function () {
      var result = {};
      var keys = Object.keys(STATIONS);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        result[k] = {
          level: state.stations[k].level,
          built: state.stations[k].built,
          lastCollect: state.stations[k].lastCollect,
          resource: STATIONS[k].resource,
          rate: STATIONS[k].rate,
          blueprint: STATIONS[k].blueprint || null
        };
      }
      return result;
    },

    onChange: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
      }
    },

    buildStation: function (key) {
      if (!STATIONS[key]) return false;
      if (state.stations[key].built) return false;
      state.stations[key].built = true;
      state.stations[key].level = 1;
      state.stations[key].lastCollect = Date.now();
      save();
      notify();
      return true;
    },

    isStationBuilt: function (key) {
      return state.stations[key] ? state.stations[key].built : false;
    },

    getStationDefs: function () {
      return STATIONS;
    },

    getRecipes: function (stationKey) {
      return RECIPES[stationKey] || [];
    },

    getAllRecipes: function () {
      return RECIPES;
    },

    canAfford: function (stationKey, recipeId) {
      var recipe = findRecipe(stationKey, recipeId);
      return recipe ? canAffordRecipe(recipe) : false;
    },

    queueRecipe: function (stationKey, recipeId) {
      var recipe = findRecipe(stationKey, recipeId);
      if (!recipe) return false;
      if (!canAffordRecipe(recipe)) return false;

      if (!state.processing[stationKey]) {
        state.processing[stationKey] = [];
      }
      var queue = state.processing[stationKey];
      if (queue.length >= MAX_QUEUE) return false;

      deductInputs(recipe);

      var startNow = queue.length === 0;
      queue.push({
        recipeId: recipeId,
        startedAt: startNow ? Date.now() : 0,
        duration: recipe.duration
      });

      save();
      notify();
      return true;
    },

    getQueue: function (stationKey) {
      var queue = state.processing[stationKey];
      if (!queue || queue.length === 0) return [];

      var now = Date.now();
      var result = [];
      for (var i = 0; i < queue.length; i++) {
        var job = queue[i];
        var recipe = findRecipe(stationKey, job.recipeId);
        var entry = {
          recipeId: job.recipeId,
          name: recipe ? recipe.name : job.recipeId,
          waiting: job.startedAt === 0
        };
        if (job.startedAt > 0) {
          var elapsed = now - job.startedAt;
          var remaining = Math.max(0, job.duration - elapsed);
          entry.progress = Math.min(1, elapsed / job.duration);
          entry.remaining = remaining;
        }
        result.push(entry);
      }
      return result;
    },

    getActiveProcessing: function () {
      var now = Date.now();
      var active = [];
      var sKeys = Object.keys(state.processing);
      for (var i = 0; i < sKeys.length; i++) {
        var queue = state.processing[sKeys[i]];
        if (queue && queue.length > 0 && queue[0].startedAt > 0) {
          var job = queue[0];
          var recipe = findRecipe(sKeys[i], job.recipeId);
          var remaining = Math.max(0, (job.startedAt + job.duration) - now);
          active.push({
            station: sKeys[i],
            recipeId: job.recipeId,
            name: recipe ? recipe.name : job.recipeId,
            remaining: remaining,
            progress: Math.min(1, (now - job.startedAt) / job.duration)
          });
        }
      }
      return active;
    }
  };

  save();
})();
