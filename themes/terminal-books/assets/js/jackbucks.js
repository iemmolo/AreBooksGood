(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-jackbucks';

  var listeners = [];
  var jb = load();

  function defaultJB() {
    return {
      bucks: 0,
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
          bucks: saved.bucks || 0,
          totalEarned: saved.totalEarned || 0,
          totalSpent: saved.totalSpent || 0,
          lastUpdated: saved.lastUpdated || Date.now()
        };
      }
    } catch (e) {}
    return defaultJB();
  }

  function save() {
    jb.lastUpdated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jb));
    } catch (e) {}
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](jb.bucks); } catch (e) {}
    }
  }

  save();

  window.JackBucks = {
    getBalance: function () {
      return jb.bucks;
    },

    add: function (n) {
      if (n <= 0) return 0;
      jb.bucks += n;
      jb.totalEarned += n;
      save();
      notify();
      return n;
    },

    deduct: function (n) {
      if (n <= 0) return 0;
      var actual = Math.min(n, jb.bucks);
      jb.bucks -= actual;
      jb.totalSpent += actual;
      save();
      notify();
      return actual;
    },

    onChange: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
      }
    },

    getStats: function () {
      return {
        bucks: jb.bucks,
        totalEarned: jb.totalEarned,
        totalSpent: jb.totalSpent,
        lastUpdated: jb.lastUpdated
      };
    }
  };

  // Update header widget
  var balanceEl = document.getElementById('jackbucks-balance');
  if (balanceEl) {
    balanceEl.textContent = jb.bucks;
    window.JackBucks.onChange(function (bucks) {
      balanceEl.textContent = bucks;
    });

    // Click JB balance → navigate to Silk Road
    balanceEl.style.cursor = 'pointer';
    balanceEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = '/casino/silk-road/';
    });
  }
})();
