(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-farm-resources';
  var listeners = [];

  // ── Station definitions ─────────────────────────────────
  var STATIONS = {
    lumberYard:  { resource: 'wood',     rate: 720000,   built: true },   // 12min
    quarry:      { resource: 'stone',    rate: 1200000,  built: true },   // 20min
    fishingPond: { resource: 'fish',     rate: 600000,   built: true },   // 10min
    chickenCoop: { resource: 'eggs',     rate: 900000,   built: false, blueprint: 'chickenCoop' },
    cowPasture:  { resource: 'milk',     rate: 1800000,  built: false, blueprint: 'cowPasture' },
    sheepPen:    { resource: 'wool',     rate: 2700000,  built: false, blueprint: 'sheepPen' },
    mine:        { resource: 'iron',     rate: 2400000,  built: false, blueprint: 'mine' },
    deepMine:    { resource: 'gold',     rate: 5400000,  built: false, blueprint: 'deepMine' },
    oldGrowth:   { resource: 'hardwood', rate: 2100000,  built: false, blueprint: 'oldGrowth' }
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
      raw: { wood: 0, stone: 0, fish: 0, eggs: 0, milk: 0, wool: 0, iron: 0, gold: 0, hardwood: 0 },
      processed: { flour: 0, planks: 0, stoneBricks: 0 },
      stations: stations,
      processing: [],
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
        return {
          raw: rawRes,
          processed: processed,
          stations: stations,
          processing: saved.processing || [],
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
      if (state.processing && state.processing.length > 0) {
        var job = state.processing[0];
        var remaining = (job.startedAt + job.duration) - Date.now();
        if (remaining > 0) {
          summary.processing = { item: job.recipe, remaining: remaining };
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
    }
  };

  save();
})();
