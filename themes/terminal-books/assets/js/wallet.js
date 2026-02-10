(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-wallet';
  var MIGRATED_KEY = 'wallet-migrated';
  var STARTING_BALANCE = 1000;

  var listeners = [];
  var wallet = load();

  function defaultWallet() {
    return {
      coins: STARTING_BALANCE,
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
          coins: saved.coins || 0,
          totalEarned: saved.totalEarned || 0,
          totalSpent: saved.totalSpent || 0,
          lastUpdated: saved.lastUpdated || Date.now()
        };
      }
    } catch (e) {}
    return defaultWallet();
  }

  function save() {
    wallet.lastUpdated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    } catch (e) {}
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](wallet.coins); } catch (e) {}
    }
  }

  // One-time migration: sum bankrolls from existing games
  function migrate() {
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;

      var total = 0;
      var found = false;
      var keys = ['poker-stats', 'blackjack-stats', 'casino-wars-stats'];
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(keys[i]);
        if (raw) {
          var data = JSON.parse(raw);
          if (data && typeof data.bankroll === 'number' && data.bankroll > 0) {
            total += data.bankroll;
            found = true;
          }
        }
      }

      if (found) {
        wallet.coins = total;
        save();
      }

      localStorage.setItem(MIGRATED_KEY, '1');
    } catch (e) {}
  }

  migrate();
  save();

  window.Wallet = {
    getBalance: function () {
      return wallet.coins;
    },

    add: function (n) {
      if (n <= 0) return 0;
      wallet.coins += n;
      wallet.totalEarned += n;
      save();
      notify();
      return n;
    },

    deduct: function (n) {
      if (n <= 0) return 0;
      var actual = Math.min(n, wallet.coins);
      wallet.coins -= actual;
      wallet.totalSpent += actual;
      save();
      notify();
      return actual;
    },

    isBroke: function () {
      return wallet.coins <= 0;
    },

    onChange: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
      }
    },

    getStats: function () {
      return {
        coins: wallet.coins,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        lastUpdated: wallet.lastUpdated
      };
    }
  };

  // Update header widget
  var balanceEl = document.getElementById('wallet-balance');
  if (balanceEl) {
    balanceEl.textContent = wallet.coins;
    window.Wallet.onChange(function (coins) {
      balanceEl.textContent = coins;
    });
  }
})();
