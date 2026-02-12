(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────
  var STORAGE_KEY = 'slots-stats';
  var BET_STEPS = [5, 10, 25, 50, 100, 250, 500];
  var AUTO_STEPS = [0, 10, 25, 50, 100]; // 0 = OFF
  var REEL_COUNT = 3;
  var VISIBLE_ROWS = 3;
  var SPIN_DELAY_PER_REEL = 400; // stagger ms between reel stops
  var SPIN_BASE_DURATION = 600;  // base spin time for first reel

  var SYMBOLS = [
    { id: 'diamond', display: '\uD83D\uDC8E', weight: 2,  payout: 50 },
    { id: 'seven',   display: '7\uFE0F\u20E3', weight: 3,  payout: 25 },
    { id: 'bell',    display: '\uD83D\uDD14',  weight: 5,  payout: 15 },
    { id: 'star',    display: '\u2B50',         weight: 6,  payout: 10 },
    { id: 'cherry',  display: '\uD83C\uDF52',  weight: 8,  payout: 8  },
    { id: 'lemon',   display: '\uD83C\uDF4B',  weight: 8,  payout: 5  },
    { id: 'clover',  display: '\uD83C\uDF40',  weight: 10, payout: 3  }
  ];

  // Build weighted pool
  var WEIGHTED_POOL = [];
  for (var s = 0; s < SYMBOLS.length; s++) {
    for (var w = 0; w < SYMBOLS[s].weight; w++) {
      WEIGHTED_POOL.push(s);
    }
  }

  // ── DOM refs ───────────────────────────────────────────
  var app = document.getElementById('slots-app');
  if (!app) return;

  var dom = {
    balance:      document.getElementById('sl-balance'),
    betAmount:    document.getElementById('sl-bet-amount'),
    betUp:        document.getElementById('sl-bet-up'),
    betDown:      document.getElementById('sl-bet-down'),
    spin:         document.getElementById('sl-spin'),
    auto:         document.getElementById('sl-auto'),
    status:       document.getElementById('sl-status'),
    statSpins:    document.getElementById('sl-stat-spins'),
    statWins:     document.getElementById('sl-stat-wins'),
    statLosses:   document.getElementById('sl-stat-losses'),
    statJackpots: document.getElementById('sl-stat-jackpots'),
    statBiggest:  document.getElementById('sl-stat-biggest'),
    statPeak:     document.getElementById('sl-stat-peak'),
    resetStats:   document.getElementById('sl-reset-stats'),
    machine:      document.querySelector('.sl-machine'),
    payline:      document.querySelector('.sl-payline'),
    reelWindows:  [],
    reelStrips:   []
  };

  for (var r = 0; r < REEL_COUNT; r++) {
    var win = document.getElementById('sl-reel-' + r);
    dom.reelWindows.push(win);
    dom.reelStrips.push(win.querySelector('.sl-reel-strip'));
  }

  // ── State ──────────────────────────────────────────────
  var betStepIndex = 2; // default $25
  var autoStepIndex = 0;
  var autoRemaining = 0;
  var spinning = false;

  // Each reel holds an array of symbol indices for its strip
  var reelData = [[], [], []];
  // The final result symbols (middle row) after spin
  var result = [0, 0, 0];

  var stats = defaultStats();

  function defaultStats() {
    return {
      spins: 0,
      wins: 0,
      losses: 0,
      jackpots: 0,
      biggestWin: 0,
      peak: Wallet.getBalance()
    };
  }

  // ── Reel Building ──────────────────────────────────────

  // Each reel strip: 42 symbols (enough for animation distance)
  var STRIP_LENGTH = 42;

  function randomSymbolIndex() {
    return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)];
  }

  function buildReelStrip(reelIndex) {
    var strip = dom.reelStrips[reelIndex];
    strip.innerHTML = '';
    reelData[reelIndex] = [];

    for (var i = 0; i < STRIP_LENGTH; i++) {
      var symIdx = randomSymbolIndex();
      reelData[reelIndex].push(symIdx);
      var cell = document.createElement('div');
      cell.className = 'sl-symbol';
      cell.textContent = SYMBOLS[symIdx].display;
      strip.appendChild(cell);
    }

    // Position so that index 1 (second symbol) is in the middle row
    // Each symbol height matches CSS: 64px (desktop) or 52px (mobile)
    var symbolHeight = getSymbolHeight();
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(-' + symbolHeight + 'px)';
  }

  function getSymbolHeight() {
    // Read from the first symbol if possible, fallback to 64
    var firstSym = dom.reelStrips[0].querySelector('.sl-symbol');
    if (firstSym) return firstSym.offsetHeight;
    return 64;
  }

  function initReels() {
    for (var i = 0; i < REEL_COUNT; i++) {
      buildReelStrip(i);
    }
  }

  // ── Spin Logic ─────────────────────────────────────────

  function spin() {
    if (spinning) return;

    var bet = BET_STEPS[betStepIndex];
    if (Wallet.getBalance() < bet) {
      showBegPrompt();
      autoRemaining = 0;
      updateAutoButton();
      return;
    }

    spinning = true;
    dom.spin.disabled = true;
    clearWinEffects();

    // Rebuild reels with fresh random strip before animating
    initReels();

    // Deduct bet
    Wallet.deduct(bet);
    renderBalance();

    // Pick result for each reel
    for (var i = 0; i < REEL_COUNT; i++) {
      result[i] = randomSymbolIndex();
    }

    // Animate reels with stagger
    var symbolHeight = getSymbolHeight();
    var reelsFinished = 0;

    for (var r = 0; r < REEL_COUNT; r++) {
      (function (reelIdx) {
        var strip = dom.reelStrips[reelIdx];
        var data = reelData[reelIdx];

        // Inject the result into the strip at a target position
        // We'll spin to a position deep into the strip
        var targetRow = STRIP_LENGTH - 4 - reelIdx; // offset each reel slightly
        data[targetRow - 1] = randomSymbolIndex(); // row above payline
        data[targetRow] = result[reelIdx];          // payline row (middle)
        data[targetRow + 1] = randomSymbolIndex(); // row below payline

        // Update the DOM cells
        var cells = strip.children;
        cells[targetRow - 1].textContent = SYMBOLS[data[targetRow - 1]].display;
        cells[targetRow].textContent = SYMBOLS[data[targetRow]].display;
        cells[targetRow + 1].textContent = SYMBOLS[data[targetRow + 1]].display;

        // Add spinning class for blur
        dom.reelWindows[reelIdx].classList.add('sl-spinning');

        // Start fast spin
        strip.classList.remove('sl-bouncing');
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(-' + symbolHeight + 'px)';

        // Force reflow
        strip.offsetHeight;

        var spinDuration = SPIN_BASE_DURATION + (reelIdx * SPIN_DELAY_PER_REEL);

        // Spin: translate to land on target row (middle row visible)
        // Target: symbol at targetRow should be in the middle (2nd visible row)
        // So we offset by (targetRow - 1) * symbolHeight
        var finalY = (targetRow - 1) * symbolHeight;

        // Overshoot slightly then bounce back
        var overshoot = symbolHeight * 0.3;

        strip.style.transition = 'transform ' + spinDuration + 'ms cubic-bezier(0.15, 0.85, 0.35, 1.02)';
        strip.style.transform = 'translateY(-' + finalY + 'px)';

        setTimeout(function () {
          dom.reelWindows[reelIdx].classList.remove('sl-spinning');

          // Bounce effect
          strip.classList.add('sl-bouncing');
          strip.style.transform = 'translateY(-' + (finalY - overshoot) + 'px)';

          setTimeout(function () {
            strip.style.transform = 'translateY(-' + finalY + 'px)';
          }, 150);

          reelsFinished++;
          if (reelsFinished === REEL_COUNT) {
            setTimeout(function () { resolveResult(bet); }, 200);
          }
        }, spinDuration);
      })(r);
    }
  }

  function resolveResult(bet) {
    var sym0 = SYMBOLS[result[0]];
    var sym1 = SYMBOLS[result[1]];
    var sym2 = SYMBOLS[result[2]];
    var payout = 0;
    var isJackpot = false;

    // 3-match
    if (result[0] === result[1] && result[1] === result[2]) {
      payout = bet * sym0.payout;
      if (sym0.id === 'diamond') isJackpot = true;
    }
    // 2x cherry from left
    else if (sym0.id === 'cherry' && sym1.id === 'cherry') {
      payout = bet * 2;
    }
    // 1x cherry leftmost
    else if (sym0.id === 'cherry') {
      payout = bet * 1;
    }

    // Update stats
    stats.spins++;

    if (payout > 0) {
      Wallet.add(payout);
      stats.wins++;
      if (isJackpot) stats.jackpots++;
      if (payout > stats.biggestWin) stats.biggestWin = payout;

      // Show win
      showWinEffects(isJackpot);
      if (isJackpot) {
        dom.status.textContent = 'JACKPOT! You won $' + payout + '!';
        dom.status.className = 'sl-status sl-status-jackpot';
      } else {
        dom.status.textContent = 'WIN! $' + payout;
        dom.status.className = 'sl-status sl-status-win';
      }
    } else {
      stats.losses++;
      dom.status.textContent = 'No luck...';
      dom.status.className = 'sl-status sl-status-lose';
    }

    if (Wallet.getBalance() > stats.peak) stats.peak = Wallet.getBalance();

    // Pet integration
    if (window.PetEvents) {
      window.PetEvents.onGameResult({
        game: 'slots',
        outcome: payout > 0 ? 'win' : 'lose',
        bet: bet,
        payout: payout
      });
    }

    renderBalance();
    renderStats();
    saveStats();

    spinning = false;
    dom.spin.disabled = false;

    // Auto-spin
    if (autoRemaining > 0) {
      autoRemaining--;
      updateAutoButton();
      if (autoRemaining > 0 && Wallet.getBalance() >= BET_STEPS[betStepIndex]) {
        setTimeout(function () { spin(); }, 600);
      } else {
        autoRemaining = 0;
        updateAutoButton();
      }
    }
  }

  // ── Win Effects ────────────────────────────────────────

  function showWinEffects(isJackpot) {
    // Flash payline
    dom.payline.classList.add('sl-payline-flash');

    // Pulse winning symbols on middle row
    for (var r = 0; r < REEL_COUNT; r++) {
      var strip = dom.reelStrips[r];
      var cells = strip.children;
      var targetRow = STRIP_LENGTH - 4 - r;
      if (cells[targetRow]) {
        cells[targetRow].classList.add('sl-winner');
      }
    }

    // Jackpot glow
    if (isJackpot) {
      dom.machine.classList.add('sl-jackpot');
    }
  }

  function clearWinEffects() {
    dom.payline.classList.remove('sl-payline-flash');
    dom.machine.classList.remove('sl-jackpot');
    dom.status.textContent = '';
    dom.status.className = 'sl-status';

    var winners = app.querySelectorAll('.sl-winner');
    for (var i = 0; i < winners.length; i++) {
      winners[i].classList.remove('sl-winner');
    }
  }

  // ── Bet Controls ───────────────────────────────────────

  function updateBetDisplay() {
    dom.betAmount.textContent = BET_STEPS[betStepIndex];
  }

  dom.betUp.addEventListener('click', function () {
    if (spinning) return;
    if (betStepIndex < BET_STEPS.length - 1) betStepIndex++;
    updateBetDisplay();
  });

  dom.betDown.addEventListener('click', function () {
    if (spinning) return;
    if (betStepIndex > 0) betStepIndex--;
    updateBetDisplay();
  });

  // ── Auto-spin ──────────────────────────────────────────

  function updateAutoButton() {
    if (autoRemaining > 0) {
      dom.auto.textContent = 'Auto: ' + autoRemaining;
    } else {
      var val = AUTO_STEPS[autoStepIndex];
      dom.auto.textContent = 'Auto: ' + (val === 0 ? 'OFF' : val);
    }
  }

  dom.auto.addEventListener('click', function () {
    if (spinning) return;

    // If auto is currently running, stop it
    if (autoRemaining > 0) {
      autoRemaining = 0;
      updateAutoButton();
      return;
    }

    // Cycle through auto steps
    autoStepIndex = (autoStepIndex + 1) % AUTO_STEPS.length;
    var val = AUTO_STEPS[autoStepIndex];
    if (val > 0) {
      autoRemaining = val;
      updateAutoButton();
      spin();
    } else {
      autoRemaining = 0;
      updateAutoButton();
    }
  });

  // ── Spin Button + Spacebar ─────────────────────────────

  dom.spin.addEventListener('click', function () {
    if (autoRemaining > 0) {
      autoRemaining = 0;
      updateAutoButton();
      return;
    }
    spin();
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space' && !spinning) {
      e.preventDefault();
      if (autoRemaining > 0) {
        autoRemaining = 0;
        updateAutoButton();
        return;
      }
      spin();
    }
  });

  // ── Stats ──────────────────────────────────────────────

  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        stats.spins = saved.spins || 0;
        stats.wins = saved.wins || 0;
        stats.losses = saved.losses || 0;
        stats.jackpots = saved.jackpots || 0;
        stats.biggestWin = saved.biggestWin || 0;
        stats.peak = saved.peak || Wallet.getBalance();
      }
    } catch (e) {}
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function renderStats() {
    dom.statSpins.textContent = stats.spins;
    dom.statWins.textContent = stats.wins;
    dom.statLosses.textContent = stats.losses;
    dom.statJackpots.textContent = stats.jackpots;
    dom.statBiggest.textContent = '$' + stats.biggestWin;
    dom.statPeak.textContent = '$' + stats.peak;
  }

  function resetStatsHandler() {
    if (!confirm('Reset all stats?')) return;
    stats = defaultStats();
    saveStats();
    renderStats();
  }

  dom.resetStats.addEventListener('click', resetStatsHandler);

  // ── Balance + Beg ──────────────────────────────────────

  function renderBalance() {
    dom.balance.textContent = Wallet.getBalance();
  }

  function showBegPrompt() {
    if (!Wallet.isBroke()) return;
    dom.status.className = 'sl-status sl-status-lose';
    dom.status.innerHTML = '';
    dom.status.appendChild(document.createTextNode('You\'re broke! '));
    var begBtn = document.createElement('button');
    begBtn.className = 'sl-btn sl-btn-small';
    begBtn.textContent = 'Beg for coins';
    begBtn.addEventListener('click', function () {
      var res = Wallet.beg();
      if (res) {
        dom.status.textContent = res.message;
        renderBalance();
      }
    });
    dom.status.appendChild(begBtn);
  }

  // ── Init ───────────────────────────────────────────────

  loadStats();
  renderBalance();
  renderStats();
  updateBetDisplay();
  updateAutoButton();
  initReels();

  if (Wallet.isBroke()) showBegPrompt();
})();
