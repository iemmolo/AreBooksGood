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
  var RANK_VALUES = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
    'J':10,'Q':10,'K':10,'A':11
  };
  var NUM_DECKS = 6;
  var STORAGE_KEY = 'blackjack-stats';
  var BET_STEPS = [5, 10, 25, 50, 100, 250, 500];
  var DEALER_DELAY = 400;

  // ── DOM refs ───────────────────────────────────────────
  var app = document.getElementById('blackjack-app');
  if (!app) return;

  var dom = {
    balance:      document.getElementById('bj-balance'),
    betAmount:    document.getElementById('bj-bet-amount'),
    betUp:        document.getElementById('bj-bet-up'),
    betDown:      document.getElementById('bj-bet-down'),
    dealerCards:  document.getElementById('bj-dealer-cards'),
    dealerScore:  document.getElementById('bj-dealer-score'),
    playerHands:  document.getElementById('bj-player-hands'),
    playerScore:  document.getElementById('bj-player-score'),
    status:       document.getElementById('bj-status'),
    insurance:    document.getElementById('bj-insurance'),
    insuranceYes: document.getElementById('bj-insurance-yes'),
    insuranceNo:  document.getElementById('bj-insurance-no'),
    deal:         document.getElementById('bj-deal'),
    hit:          document.getElementById('bj-hit'),
    stand:        document.getElementById('bj-stand'),
    double:       document.getElementById('bj-double'),
    split:        document.getElementById('bj-split'),
    statHands:    document.getElementById('bj-stat-hands'),
    statWins:     document.getElementById('bj-stat-wins'),
    statLosses:   document.getElementById('bj-stat-losses'),
    statPushes:   document.getElementById('bj-stat-pushes'),
    statBJ:       document.getElementById('bj-stat-blackjacks'),
    statPeak:     document.getElementById('bj-stat-peak'),
    resetStats:   document.getElementById('bj-reset-stats')
  };

  // ── State ──────────────────────────────────────────────
  var shoe = [];
  var state = {
    dealerHand: [],
    playerHands: [],    // [{cards, bet, standing, doubled, result, insuranceBet}]
    activeHandIndex: 0,
    phase: 'betting',   // betting | insurance | playing | dealer | settled
    insuranceBet: 0
  };

  var stats = defaultStats();

  function defaultStats() {
    return {
      bankroll: 1000,
      hands: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      blackjacks: 0,
      peak: 1000,
      lastBet: 25,
      history: []
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
    // Reshuffle at 25% remaining
    if (shoe.length < (NUM_DECKS * 52 * 0.25)) {
      createShoe();
    }
    return shoe.pop();
  }

  // ── Hand evaluation ────────────────────────────────────
  function handValue(cards) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < cards.length; i++) {
      total += RANK_VALUES[cards[i].rank];
      if (cards[i].rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isSoft(cards) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < cards.length; i++) {
      total += RANK_VALUES[cards[i].rank];
      if (cards[i].rank === 'A') aces++;
    }
    // Reduce aces from 11 to 1 as needed, but keep one as 11 if possible
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    // Soft means at least one ace is still counted as 11
    return aces > 0 && total <= 21;
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards) === 21;
  }

  function isBusted(cards) {
    return handValue(cards) > 21;
  }

  function canSplit(hand) {
    return hand.cards.length === 2 &&
           hand.cards[0].rank === hand.cards[1].rank &&
           !hand.doubled &&
           state.playerHands.length < 2 &&
           stats.bankroll >= hand.bet;
  }

  function canDouble(hand) {
    return hand.cards.length === 2 &&
           !hand.doubled &&
           stats.bankroll >= hand.bet;
  }

  // ── Game flow ──────────────────────────────────────────
  function deal() {
    var bet = stats.lastBet;
    if (bet > stats.bankroll) {
      bet = stats.bankroll;
      stats.lastBet = bet;
    }
    if (bet <= 0) return;

    stats.bankroll -= bet;
    state.dealerHand = [drawCard(), drawCard()];
    state.playerHands = [{
      cards: [drawCard(), drawCard()],
      bet: bet,
      standing: false,
      doubled: false,
      result: null,
      insuranceBet: 0
    }];
    state.activeHandIndex = 0;
    state.insuranceBet = 0;

    // Check if dealer shows ace for insurance
    if (state.dealerHand[0].rank === 'A') {
      state.phase = 'insurance';
      render();
      return;
    }

    afterInsurance();
  }

  function takeInsurance() {
    var amount = Math.floor(state.playerHands[0].bet / 2);
    if (amount > stats.bankroll) amount = stats.bankroll;
    state.insuranceBet = amount;
    stats.bankroll -= amount;
    afterInsurance();
  }

  function declineInsurance() {
    state.insuranceBet = 0;
    afterInsurance();
  }

  function afterInsurance() {
    // Check for dealer blackjack
    if (isBlackjack(state.dealerHand)) {
      // Pay insurance 2:1
      if (state.insuranceBet > 0) {
        stats.bankroll += state.insuranceBet * 3; // original + 2x payout
      }
      // Check player blackjack
      if (isBlackjack(state.playerHands[0].cards)) {
        // Push — return bet
        state.playerHands[0].result = 'push';
        stats.bankroll += state.playerHands[0].bet;
        stats.pushes++;
      } else {
        state.playerHands[0].result = 'lose';
        stats.losses++;
      }
      stats.hands++;
      addHistory(state.playerHands[0]);
      state.phase = 'settled';
      render();
      saveStats();
      return;
    }

    // Dealer doesn't have blackjack — insurance lost (already deducted)

    // Check player blackjack
    if (isBlackjack(state.playerHands[0].cards)) {
      state.playerHands[0].result = 'blackjack';
      // Blackjack pays 3:2
      stats.bankroll += state.playerHands[0].bet + Math.floor(state.playerHands[0].bet * 1.5);
      stats.blackjacks++;
      stats.hands++;
      updatePeak();
      addHistory(state.playerHands[0]);
      state.phase = 'settled';
      render();
      saveStats();
      return;
    }

    state.phase = 'playing';
    render();
  }

  function hit() {
    var hand = state.playerHands[state.activeHandIndex];
    hand.cards.push(drawCard());

    if (isBusted(hand.cards)) {
      hand.standing = true;
      hand.result = 'lose';
      stats.losses++;
      stats.hands++;
      addHistory(hand);
      advanceHand();
    } else if (handValue(hand.cards) === 21) {
      hand.standing = true;
      advanceHand();
    } else {
      render();
    }
  }

  function stand() {
    var hand = state.playerHands[state.activeHandIndex];
    hand.standing = true;
    advanceHand();
  }

  function doubleDown() {
    var hand = state.playerHands[state.activeHandIndex];
    stats.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(drawCard());
    hand.standing = true;

    if (isBusted(hand.cards)) {
      hand.result = 'lose';
      stats.losses++;
      stats.hands++;
      addHistory(hand);
    }

    advanceHand();
  }

  function splitHand() {
    var hand = state.playerHands[state.activeHandIndex];
    var splitCard = hand.cards.pop();

    // Deduct bet for second hand
    stats.bankroll -= hand.bet;

    var newHand = {
      cards: [splitCard, drawCard()],
      bet: hand.bet,
      standing: false,
      doubled: false,
      result: null,
      insuranceBet: 0
    };

    // Give original hand a new card
    hand.cards.push(drawCard());

    state.playerHands.push(newHand);

    // If split aces, only one card each, both stand
    if (splitCard.rank === 'A') {
      hand.standing = true;
      newHand.standing = true;
      // Move to dealer phase since both hands are done
      advanceHand();
      return;
    }

    render();
  }

  function advanceHand() {
    // Find next hand that isn't standing
    for (var i = state.activeHandIndex + 1; i < state.playerHands.length; i++) {
      if (!state.playerHands[i].standing) {
        state.activeHandIndex = i;
        render();
        return;
      }
    }

    // All hands done — check if any hand still needs resolution
    var anyAlive = false;
    for (var j = 0; j < state.playerHands.length; j++) {
      if (!state.playerHands[j].result) {
        anyAlive = true;
        break;
      }
    }

    if (anyAlive) {
      dealerPlay();
    } else {
      state.phase = 'settled';
      updatePeak();
      render();
      saveStats();
    }
  }

  function dealerPlay() {
    state.phase = 'dealer';
    render();

    function dealerStep() {
      var val = handValue(state.dealerHand);
      var soft = isSoft(state.dealerHand);

      // Dealer hits soft 17
      if (val < 17 || (val === 17 && soft)) {
        state.dealerHand.push(drawCard());
        render();
        setTimeout(dealerStep, DEALER_DELAY);
      } else {
        resolveAllHands();
      }
    }

    setTimeout(dealerStep, DEALER_DELAY);
  }

  function resolveAllHands() {
    var dealerVal = handValue(state.dealerHand);
    var dealerBust = isBusted(state.dealerHand);

    for (var i = 0; i < state.playerHands.length; i++) {
      var hand = state.playerHands[i];
      if (hand.result) continue; // Already resolved (busted)

      var playerVal = handValue(hand.cards);

      if (dealerBust || playerVal > dealerVal) {
        hand.result = 'win';
        stats.bankroll += hand.bet * 2;
        stats.wins++;
      } else if (playerVal === dealerVal) {
        hand.result = 'push';
        stats.bankroll += hand.bet;
        stats.pushes++;
      } else {
        hand.result = 'lose';
        stats.losses++;
      }

      stats.hands++;
      addHistory(hand);
    }

    updatePeak();
    state.phase = 'settled';
    render();
    saveStats();
  }

  function addHistory(hand) {
    stats.history.push({
      bet: hand.bet,
      result: hand.result,
      bankrollAfter: stats.bankroll,
      timestamp: Date.now()
    });
    if (stats.history.length > 100) {
      stats.history = stats.history.slice(-100);
    }
  }

  function updatePeak() {
    if (stats.bankroll > stats.peak) {
      stats.peak = stats.bankroll;
    }
  }

  // ── Rendering ──────────────────────────────────────────
  function renderCard(card, faceDown) {
    var el = document.createElement('div');
    el.className = 'bj-card';

    if (faceDown) {
      el.classList.add('bj-card-facedown');
      el.textContent = '?';
      return el;
    }

    var colorClass = card.suit.color === 'red' ? 'bj-card-red' : 'bj-card-black';
    el.classList.add(colorClass);

    var rankEl = document.createElement('span');
    rankEl.className = 'bj-card-rank';
    rankEl.textContent = card.rank;

    var suitEl = document.createElement('span');
    suitEl.className = 'bj-card-suit';
    suitEl.textContent = card.suit.symbol;

    el.appendChild(rankEl);
    el.appendChild(suitEl);
    return el;
  }

  function renderDealerHand() {
    dom.dealerCards.innerHTML = '';
    var hideHole = state.phase === 'playing' || state.phase === 'insurance';

    for (var i = 0; i < state.dealerHand.length; i++) {
      var faceDown = (i === 1 && hideHole);
      dom.dealerCards.appendChild(renderCard(state.dealerHand[i], faceDown));
    }

    if (hideHole) {
      dom.dealerScore.textContent = '(' + RANK_VALUES[state.dealerHand[0].rank] + ')';
    } else if (state.dealerHand.length > 0) {
      dom.dealerScore.textContent = '(' + handValue(state.dealerHand) + ')';
    } else {
      dom.dealerScore.textContent = '';
    }
  }

  function renderPlayerHands() {
    dom.playerHands.innerHTML = '';

    if (state.playerHands.length === 0) return;

    // Single hand — render directly, no container
    if (state.playerHands.length === 1) {
      var hand = state.playerHands[0];
      var cardsDiv = document.createElement('div');
      cardsDiv.className = 'bj-cards';
      for (var c = 0; c < hand.cards.length; c++) {
        cardsDiv.appendChild(renderCard(hand.cards[c], false));
      }
      dom.playerHands.appendChild(cardsDiv);

      var val = handValue(hand.cards);
      var label = '(' + val + ')';
      if (isSoft(hand.cards) && val <= 21) label = '(soft ' + val + ')';
      dom.playerScore.textContent = label;
      return;
    }

    // Multiple hands (split)
    dom.playerScore.textContent = '';
    for (var i = 0; i < state.playerHands.length; i++) {
      var h = state.playerHands[i];
      var container = document.createElement('div');
      container.className = 'bj-hand-container';
      if (i === state.activeHandIndex && state.phase === 'playing') {
        container.classList.add('bj-hand-active');
      }

      var handLabel = document.createElement('div');
      handLabel.className = 'bj-hand-label';
      var hVal = handValue(h.cards);
      var hLabel = 'Hand ' + (i + 1) + ' (' + hVal + ')';
      if (isSoft(h.cards) && hVal <= 21) hLabel = 'Hand ' + (i + 1) + ' (soft ' + hVal + ')';
      handLabel.textContent = hLabel;
      container.appendChild(handLabel);

      var cardsEl = document.createElement('div');
      cardsEl.className = 'bj-cards';
      for (var k = 0; k < h.cards.length; k++) {
        cardsEl.appendChild(renderCard(h.cards[k], false));
      }
      container.appendChild(cardsEl);

      if (h.result) {
        var resultEl = document.createElement('div');
        resultEl.className = 'bj-hand-result';
        resultEl.textContent = resultLabel(h.result);
        container.appendChild(resultEl);
      }

      dom.playerHands.appendChild(container);
    }
  }

  function resultLabel(result) {
    switch (result) {
      case 'win': return 'Win';
      case 'lose': return 'Lose';
      case 'push': return 'Push';
      case 'blackjack': return 'Blackjack!';
      default: return '';
    }
  }

  function renderBankroll() {
    dom.balance.textContent = stats.bankroll;
    dom.betAmount.textContent = '$' + stats.lastBet;
  }

  function renderStatus() {
    dom.status.className = 'bj-status';
    dom.status.textContent = '';

    if (state.phase === 'settled') {
      // Summarize result
      if (state.playerHands.length === 1) {
        var r = state.playerHands[0].result;
        dom.status.textContent = statusMessage(r);
        dom.status.classList.add(statusClass(r));
      } else {
        // Multiple hands — show combined
        var wins = 0, losses = 0, pushes = 0;
        for (var i = 0; i < state.playerHands.length; i++) {
          var res = state.playerHands[i].result;
          if (res === 'win' || res === 'blackjack') wins++;
          else if (res === 'lose') losses++;
          else pushes++;
        }
        var parts = [];
        if (wins) parts.push(wins + ' win' + (wins > 1 ? 's' : ''));
        if (losses) parts.push(losses + ' loss' + (losses > 1 ? 'es' : ''));
        if (pushes) parts.push(pushes + ' push' + (pushes > 1 ? 'es' : ''));
        dom.status.textContent = parts.join(', ');
        if (wins > losses) dom.status.classList.add('bj-status-win');
        else if (losses > wins) dom.status.classList.add('bj-status-lose');
        else dom.status.classList.add('bj-status-push');
      }

      // Auto-reset on bankruptcy
      if (stats.bankroll <= 0) {
        dom.status.textContent += ' — Bankrupt! Bankroll reset.';
        stats.bankroll = 1000;
        stats.peak = Math.max(stats.peak, 1000);
        saveStats();
        renderBankroll();
      }
    } else if (state.phase === 'insurance') {
      dom.status.textContent = 'Dealer shows Ace';
    } else if (state.phase === 'playing' && state.playerHands.length > 1) {
      dom.status.textContent = 'Playing hand ' + (state.activeHandIndex + 1);
    }
  }

  function statusMessage(result) {
    switch (result) {
      case 'win': return 'You win!';
      case 'lose': return 'Dealer wins';
      case 'push': return 'Push';
      case 'blackjack': return 'Blackjack!';
      default: return '';
    }
  }

  function statusClass(result) {
    switch (result) {
      case 'win': return 'bj-status-win';
      case 'lose': return 'bj-status-lose';
      case 'push': return 'bj-status-push';
      case 'blackjack': return 'bj-status-blackjack';
      default: return '';
    }
  }

  function renderStats() {
    dom.statHands.textContent = stats.hands;
    dom.statWins.textContent = stats.wins;
    dom.statLosses.textContent = stats.losses;
    dom.statPushes.textContent = stats.pushes;
    dom.statBJ.textContent = stats.blackjacks;
    dom.statPeak.textContent = '$' + stats.peak;
  }

  function render() {
    renderBankroll();
    renderDealerHand();
    renderPlayerHands();
    renderStatus();
    renderStats();
    updateControls();
  }

  // ── Controls ───────────────────────────────────────────
  function updateControls() {
    var isBetting = state.phase === 'betting' || state.phase === 'settled';
    var isPlaying = state.phase === 'playing';
    var isInsurance = state.phase === 'insurance';

    dom.deal.hidden = !isBetting;
    dom.deal.disabled = stats.bankroll <= 0;
    dom.hit.hidden = !isPlaying;
    dom.stand.hidden = !isPlaying;

    dom.betUp.disabled = !isBetting;
    dom.betDown.disabled = !isBetting;

    if (isPlaying) {
      var hand = state.playerHands[state.activeHandIndex];
      dom.double.hidden = !canDouble(hand);
      dom.split.hidden = !canSplit(hand);
    } else {
      dom.double.hidden = true;
      dom.split.hidden = true;
    }

    dom.insurance.hidden = !isInsurance;
  }

  // ── Bet controls ───────────────────────────────────────
  function changeBet(direction) {
    var idx = BET_STEPS.indexOf(stats.lastBet);
    if (idx === -1) {
      // Find closest
      idx = 0;
      for (var i = 0; i < BET_STEPS.length; i++) {
        if (BET_STEPS[i] <= stats.lastBet) idx = i;
      }
    }

    idx += direction;
    if (idx < 0) idx = 0;
    if (idx >= BET_STEPS.length) idx = BET_STEPS.length - 1;

    stats.lastBet = BET_STEPS[idx];
    if (stats.lastBet > stats.bankroll) {
      stats.lastBet = stats.bankroll;
    }
    renderBankroll();
    saveStats();
  }

  // ── localStorage ───────────────────────────────────────
  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        stats.bankroll = saved.bankroll || 1000;
        stats.hands = saved.hands || 0;
        stats.wins = saved.wins || 0;
        stats.losses = saved.losses || 0;
        stats.pushes = saved.pushes || 0;
        stats.blackjacks = saved.blackjacks || 0;
        stats.peak = saved.peak || 1000;
        stats.lastBet = saved.lastBet || 25;
        stats.history = saved.history || [];
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      // Ignore quota errors
    }
  }

  function resetStats() {
    if (!confirm('Reset all stats and bankroll?')) return;
    stats = defaultStats();
    state.phase = 'betting';
    state.playerHands = [];
    state.dealerHand = [];
    saveStats();
    render();
  }

  // ── Events + Init ──────────────────────────────────────
  dom.deal.addEventListener('click', function () {
    state.phase = 'betting';
    deal();
  });
  dom.hit.addEventListener('click', hit);
  dom.stand.addEventListener('click', stand);
  dom.double.addEventListener('click', doubleDown);
  dom.split.addEventListener('click', splitHand);
  dom.insuranceYes.addEventListener('click', takeInsurance);
  dom.insuranceNo.addEventListener('click', declineInsurance);
  dom.betUp.addEventListener('click', function () { changeBet(1); });
  dom.betDown.addEventListener('click', function () { changeBet(-1); });
  dom.resetStats.addEventListener('click', resetStats);

  createShoe();
  loadStats();
  render();
})();
