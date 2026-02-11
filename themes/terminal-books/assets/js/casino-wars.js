(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────
  var SUITS = [
    { name: 'spades',   symbol: '\u2660', color: 'black' },
    { name: 'hearts',   symbol: '\u2665', color: 'red' },
    { name: 'diamonds', symbol: '\u2666', color: 'red' },
    { name: 'clubs',    symbol: '\u2663', color: 'black' }
  ];
  var RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  var RANK_ORDER = {};
  for (var i = 0; i < RANKS.length; i++) RANK_ORDER[RANKS[i]] = i;

  var NUM_DECKS = 6;
  var STORAGE_KEY = 'casino-wars-stats';
  var BET_STEPS = [5, 10, 25, 50, 100, 250, 500];
  var DEAL_DELAY = 350;  // ms between each card reveal

  // ── DOM refs ───────────────────────────────────────────
  var app = document.getElementById('casino-wars-app');
  if (!app) return;

  var dom = {
    balance:     document.getElementById('cw-balance'),
    betAmount:   document.getElementById('cw-bet-amount'),
    betUp:       document.getElementById('cw-bet-up'),
    betDown:     document.getElementById('cw-bet-down'),
    dealerCard:  document.getElementById('cw-dealer-card'),
    playerCard:  document.getElementById('cw-player-card'),
    status:      document.getElementById('cw-status'),
    deal:        document.getElementById('cw-deal'),
    statHands:   document.getElementById('cw-stat-hands'),
    statWins:    document.getElementById('cw-stat-wins'),
    statLosses:  document.getElementById('cw-stat-losses'),
    statWars:    document.getElementById('cw-stat-wars'),
    statPeak:    document.getElementById('cw-stat-peak'),
    resetStats:  document.getElementById('cw-reset-stats')
  };

  // ── State ──────────────────────────────────────────────
  var shoe = [];
  var state = {
    dealerCards: [],
    playerCards: [],
    bet: 0,
    phase: 'betting' // betting | war | settled
  };

  var stats = defaultStats();

  function defaultStats() {
    return {
      hands: 0,
      wins: 0,
      losses: 0,
      wars: 0,
      peak: Wallet.getBalance(),
      lastBet: 25
    };
  }

  // ── Deck ───────────────────────────────────────────────
  function createShoe() {
    shoe = [];
    for (var d = 0; d < NUM_DECKS; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) {
          shoe.push({ rank: RANKS[r], suit: SUITS[s] });
        }
      }
    }
    shuffle(shoe);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  function drawCard() {
    if (shoe.length < (NUM_DECKS * 52 * 0.25)) {
      createShoe();
    }
    return shoe.pop();
  }

  // ── Game flow ──────────────────────────────────────────
  var dealing = false;

  function deal() {
    if (dealing) return;
    var bet = stats.lastBet;
    if (bet > Wallet.getBalance()) bet = Wallet.getBalance();
    if (bet <= 0) return;

    dealing = true;
    stats.lastBet = bet;
    state.bet = bet;
    Wallet.deduct(bet);

    state.dealerCards = [drawCard()];
    state.playerCards = [drawCard()];
    state.phase = 'dealing';

    // Step 1: show face-down cards
    renderBankroll();
    renderControls();
    renderStats();
    dom.status.className = 'cw-status';
    dom.status.textContent = '';
    dom.dealerCard.innerHTML = '';
    dom.playerCard.innerHTML = '';
    dom.dealerCard.className = 'cw-card-slot';
    dom.playerCard.className = 'cw-card-slot';
    dom.dealerCard.appendChild(renderFaceDown());
    dom.playerCard.appendChild(renderFaceDown());

    // Step 2: reveal player card
    setTimeout(function () {
      dom.playerCard.innerHTML = '';
      dom.playerCard.appendChild(renderCard(state.playerCards[0]));

      // Step 3: reveal dealer card
      setTimeout(function () {
        dom.dealerCard.innerHTML = '';
        dom.dealerCard.appendChild(renderCard(state.dealerCards[0]));

        // Step 4: resolve
        setTimeout(function () {
          dealing = false;
          resolveDeal();
        }, DEAL_DELAY);
      }, DEAL_DELAY);
    }, DEAL_DELAY);
  }

  function resolveDeal() {
    var dRank = RANK_ORDER[state.dealerCards[0].rank];
    var pRank = RANK_ORDER[state.playerCards[0].rank];

    if (pRank > dRank) {
      Wallet.add(state.bet * 2);
      stats.wins++;
      stats.hands++;
      if (window.PetEvents) {
        window.PetEvents.onGameResult({ game: 'casino-wars', outcome: 'win', bet: state.bet, payout: state.bet * 2 });
      }
      state.phase = 'settled';
      updatePeak();
      renderBankroll();
      renderControls();
      renderStats();
      renderResult('win', 'You win!');
      saveStats();
    } else if (pRank < dRank) {
      stats.losses++;
      stats.hands++;
      if (window.PetEvents) {
        window.PetEvents.onGameResult({ game: 'casino-wars', outcome: 'lose', bet: state.bet, payout: 0 });
      }
      state.phase = 'settled';
      renderBankroll();
      renderControls();
      renderStats();
      renderResult('lose', 'Dealer wins');
      saveStats();
    } else {
      state.phase = 'war';
      renderControls();
      renderWarPrompt();
    }
  }

  function goToWar() {
    if (dealing) return;
    dealing = true;
    stats.wars++;
    var warBet = state.bet;
    if (warBet > Wallet.getBalance()) warBet = Wallet.getBalance();
    Wallet.deduct(warBet);
    renderBankroll();

    // Burn a card each, then deal one each
    drawCard();
    drawCard();
    state.dealerCards.push(drawCard());
    state.playerCards.push(drawCard());

    // Show face-down war cards next to originals
    dom.status.className = 'cw-status';
    dom.status.textContent = 'Going to war...';
    dom.dealerCard.classList.add('cw-war');
    dom.playerCard.classList.add('cw-war');
    dom.dealerCard.appendChild(renderFaceDown());
    dom.playerCard.appendChild(renderFaceDown());

    // Reveal player war card
    setTimeout(function () {
      dom.playerCard.lastChild.remove();
      dom.playerCard.appendChild(renderCard(state.playerCards[1]));

      // Reveal dealer war card
      setTimeout(function () {
        dom.dealerCard.lastChild.remove();
        dom.dealerCard.appendChild(renderCard(state.dealerCards[1]));

        // Resolve
        setTimeout(function () {
          dealing = false;
          var dRank = RANK_ORDER[state.dealerCards[1].rank];
          var pRank = RANK_ORDER[state.playerCards[1].rank];

          if (pRank >= dRank) {
            Wallet.add(state.bet * 2 + warBet);
            stats.wins++;
            if (window.PetEvents) {
              window.PetEvents.onGameResult({ game: 'casino-wars', outcome: 'win', bet: state.bet + warBet, payout: state.bet * 2 + warBet });
            }
          } else {
            stats.losses++;
            if (window.PetEvents) {
              window.PetEvents.onGameResult({ game: 'casino-wars', outcome: 'lose', bet: state.bet + warBet, payout: 0 });
            }
          }

          stats.hands++;
          state.phase = 'settled';
          updatePeak();
          renderBankroll();
          renderControls();
          renderStats();

          if (pRank > dRank) {
            renderResult('win', 'You win the war!');
          } else if (pRank === dRank) {
            renderResult('win', 'Tie in war — you win!');
          } else {
            renderResult('lose', 'Dealer wins the war');
          }
          saveStats();
        }, DEAL_DELAY);
      }, DEAL_DELAY);
    }, DEAL_DELAY);
  }

  function surrender() {
    // Get half bet back
    Wallet.add(Math.floor(state.bet / 2));
    stats.losses++;
    stats.hands++;
    state.phase = 'settled';
    updatePeak();
    render();
    renderResult('lose', 'Surrendered');
    saveStats();
  }

  function updatePeak() {
    if (Wallet.getBalance() > stats.peak) {
      stats.peak = Wallet.getBalance();
    }
  }

  // ── Rendering ──────────────────────────────────────────
  function renderCard(card) {
    var el = document.createElement('div');
    el.className = 'cw-card';
    var colorClass = card.suit.color === 'red' ? 'cw-card-red' : 'cw-card-black';
    el.classList.add(colorClass);

    var rankEl = document.createElement('span');
    rankEl.className = 'cw-card-rank';
    rankEl.textContent = card.rank;

    var suitEl = document.createElement('span');
    suitEl.className = 'cw-card-suit';
    suitEl.textContent = card.suit.symbol;

    el.appendChild(rankEl);
    el.appendChild(suitEl);
    return el;
  }

  function renderFaceDown() {
    var el = document.createElement('div');
    el.className = 'cw-card cw-card-facedown';
    el.textContent = '?';
    return el;
  }

  function renderBankroll() {
    dom.balance.textContent = Wallet.getBalance();
    dom.betAmount.textContent = '$' + stats.lastBet;
  }

  function renderControls() {
    var isBetting = state.phase === 'betting' || state.phase === 'settled';
    dom.deal.hidden = !isBetting;
    dom.deal.disabled = Wallet.isBroke() || dealing;
    dom.betUp.disabled = !isBetting || dealing;
    dom.betDown.disabled = !isBetting || dealing;
  }

  function renderStats() {
    dom.statHands.textContent = stats.hands;
    dom.statWins.textContent = stats.wins;
    dom.statLosses.textContent = stats.losses;
    dom.statWars.textContent = stats.wars;
    dom.statPeak.textContent = '$' + stats.peak;
  }

  function render() {
    renderBankroll();

    // Cards
    dom.dealerCard.innerHTML = '';
    dom.playerCard.innerHTML = '';
    dom.dealerCard.className = 'cw-card-slot';
    dom.playerCard.className = 'cw-card-slot';

    if (state.dealerCards.length > 0) {
      for (var d = 0; d < state.dealerCards.length; d++) {
        dom.dealerCard.appendChild(renderCard(state.dealerCards[d]));
      }
      if (state.dealerCards.length > 1) dom.dealerCard.classList.add('cw-war');
    }
    if (state.playerCards.length > 0) {
      for (var p = 0; p < state.playerCards.length; p++) {
        dom.playerCard.appendChild(renderCard(state.playerCards[p]));
      }
      if (state.playerCards.length > 1) dom.playerCard.classList.add('cw-war');
    }

    dom.status.className = 'cw-status';
    dom.status.textContent = '';

    renderControls();
    renderStats();
  }

  function renderResult(type, message) {
    dom.status.className = 'cw-status';
    if (type === 'win') dom.status.classList.add('cw-status-win');
    else if (type === 'lose') dom.status.classList.add('cw-status-lose');

    if (Wallet.isBroke()) {
      showBegPrompt();
    } else {
      dom.status.textContent = message;
    }
  }

  function renderWarPrompt() {
    dom.status.className = 'cw-status cw-status-tie';
    dom.status.innerHTML = '';

    var label = document.createTextNode('War? ');
    var warBtn = document.createElement('button');
    warBtn.className = 'cw-btn cw-btn-small';
    warBtn.textContent = 'Go to War';
    warBtn.addEventListener('click', goToWar);
    var surrenderBtn = document.createElement('button');
    surrenderBtn.className = 'cw-btn cw-btn-small';
    surrenderBtn.textContent = 'Surrender';
    surrenderBtn.addEventListener('click', surrender);

    dom.status.appendChild(label);
    dom.status.appendChild(warBtn);
    dom.status.appendChild(document.createTextNode(' '));
    dom.status.appendChild(surrenderBtn);

    // Hide deal during war prompt
    dom.deal.hidden = true;
  }

  // ── Bet controls ───────────────────────────────────────
  function changeBet(direction) {
    var idx = BET_STEPS.indexOf(stats.lastBet);
    if (idx === -1) {
      idx = 0;
      for (var i = 0; i < BET_STEPS.length; i++) {
        if (BET_STEPS[i] <= stats.lastBet) idx = i;
      }
    }
    idx += direction;
    if (idx < 0) idx = 0;
    if (idx >= BET_STEPS.length) idx = BET_STEPS.length - 1;
    stats.lastBet = BET_STEPS[idx];
    if (stats.lastBet > Wallet.getBalance()) stats.lastBet = Wallet.getBalance();
    dom.betAmount.textContent = '$' + stats.lastBet;
    saveStats();
  }

  // ── localStorage ───────────────────────────────────────
  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        stats.hands = saved.hands || 0;
        stats.wins = saved.wins || 0;
        stats.losses = saved.losses || 0;
        stats.wars = saved.wars || 0;
        stats.peak = saved.peak || Wallet.getBalance();
        stats.lastBet = saved.lastBet || 25;
      }
    } catch (e) {}
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function resetStats() {
    if (!confirm('Reset all stats and bankroll?')) return;
    stats = defaultStats();
    state.phase = 'betting';
    state.dealerCards = [];
    state.playerCards = [];
    saveStats();
    render();
  }

  // ── Events + Init ──────────────────────────────────────
  dom.deal.addEventListener('click', function () {
    state.phase = 'betting';
    deal();
  });
  dom.betUp.addEventListener('click', function () { changeBet(1); });
  dom.betDown.addEventListener('click', function () { changeBet(-1); });
  dom.resetStats.addEventListener('click', resetStats);

  function showBegPrompt() {
    if (!Wallet.isBroke()) return;
    dom.status.className = 'cw-status cw-status-lose';
    dom.status.innerHTML = '';
    dom.status.appendChild(document.createTextNode('You\'re broke! '));
    var begBtn = document.createElement('button');
    begBtn.className = 'cw-btn cw-btn-small';
    begBtn.textContent = 'Beg for coins';
    begBtn.addEventListener('click', function () {
      var result = Wallet.beg();
      if (result) {
        dom.status.textContent = result.message;
        renderBankroll();
        renderControls();
      }
    });
    dom.status.appendChild(begBtn);
  }

  createShoe();
  loadStats();
  render();
  showBegPrompt();
})();
