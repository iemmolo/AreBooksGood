(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-stardust';

  var listeners = [];
  var sd = load();

  function defaultSD() {
    return {
      dust: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastUpdated: Date.now()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        return {
          dust: saved.dust || 0,
          totalEarned: saved.totalEarned || 0,
          totalSpent: saved.totalSpent || 0,
          lastUpdated: saved.lastUpdated || Date.now()
        };
      }
    } catch (e) {}
    return defaultSD();
  }

  function save() {
    sd.lastUpdated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sd));
    } catch (e) {}
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](sd.dust); } catch (e) {}
    }
  }

  function formatDust(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function updateDisplay() {
    var el = document.getElementById('stardust-balance');
    if (!el) return;
    el.textContent = formatDust(sd.dust);
    // Show the SD widget once player has earned any
    var wrapper = document.getElementById('stardust-widget');
    if (wrapper && sd.totalEarned > 0) {
      wrapper.style.display = '';
    }
  }

  save();

  window.StarDust = {
    getBalance: function () {
      return sd.dust;
    },

    add: function (n) {
      if (n <= 0) return 0;
      sd.dust += n;
      sd.totalEarned += n;
      save();
      notify();
      updateDisplay();
      return n;
    },

    deduct: function (n) {
      if (n <= 0) return 0;
      var actual = Math.min(n, sd.dust);
      sd.dust -= actual;
      sd.totalSpent += actual;
      save();
      notify();
      updateDisplay();
      return actual;
    },

    canAfford: function (n) {
      return sd.dust >= n;
    },

    onChange: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
      }
    },

    getStats: function () {
      return {
        dust: sd.dust,
        totalEarned: sd.totalEarned,
        totalSpent: sd.totalSpent,
        lastUpdated: sd.lastUpdated
      };
    },

    formatDust: formatDust
  };

  // Init display on load
  updateDisplay();

  // Click SD balance → navigate to Skills page
  var balEl = document.getElementById('stardust-balance');
  if (balEl) {
    balEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = '/pets/skills/';
    });
  }
})();
