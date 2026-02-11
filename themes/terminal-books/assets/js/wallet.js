(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-wallet';
  var MIGRATED_KEY = 'wallet-migrated';
  var STARTING_BALANCE = 1000;

  var listeners = [];
  var wallet = load();

  var BEG_MESSAGES = [
    { amount: 100, message: 'The house takes pity on you. Here\'s 100 coins.' },
    { amount: 100, message: 'Fine... here\'s another 100. Try not to lose it all immediately.' },
    { amount: 75,  message: 'You again? Here\'s 75. This is getting embarrassing.' },
    { amount: 50,  message: '...50 coins. The pit boss is watching.' },
    { amount: 50,  message: 'Security considered escorting you out. 50 coins.' },
    { amount: 25,  message: 'The dealer sighs audibly. 25 coins.' },
    { amount: 25,  message: 'Even the cards feel sorry for you. 25 coins.' },
    { amount: 10,  message: 'A coin rolls out from under the table. 10 coins.' },
    { amount: 10,  message: 'You find some coins in the couch cushions. 10 coins.' },
    { amount: 10,  message: 'A stranger whispers "quit while you\'re behind" and hands you 10 coins.' }
  ];

  function defaultWallet() {
    return {
      coins: STARTING_BALANCE,
      totalEarned: 0,
      totalSpent: 0,
      begCount: 0,
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
          begCount: saved.begCount || 0,
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

    beg: function () {
      if (wallet.coins > 0) return null;
      var idx = Math.min(wallet.begCount, BEG_MESSAGES.length - 1);
      var entry = BEG_MESSAGES[idx];
      wallet.coins += entry.amount;
      wallet.totalEarned += entry.amount;
      wallet.begCount++;
      save();
      notify();
      return { amount: entry.amount, message: entry.message };
    },

    getStats: function () {
      return {
        coins: wallet.coins,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        begCount: wallet.begCount,
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

  // Hidden cheat: type "rich" to add 50,000 coins
  var cheatBuf = '';
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    cheatBuf += e.key.toLowerCase();
    if (cheatBuf.length > 4) cheatBuf = cheatBuf.slice(-4);
    if (cheatBuf === 'rich') {
      cheatBuf = '';
      window.Wallet.add(50000);
    }
  });
})();
