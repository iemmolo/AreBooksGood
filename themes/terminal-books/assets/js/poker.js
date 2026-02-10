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
    'J':11,'Q':12,'K':13,'A':14
  };
  var NUM_DECKS = 6;
  var STORAGE_KEY = 'poker-stats';
  var DEAL_DELAY = 300;
  var AI_DELAY = 800;
  var SHOWDOWN_DELAY = 600;
  var SMALL_BLIND = 5;
  var BIG_BLIND = 10;
  var STARTING_CHIPS = 1000;
  var RAISE_STEPS = [10, 20, 50, 100, 250, 500];

  var PLAYERS = [
    { index: 0, name: 'You',    type: 'human',  style: null },
    { index: 1, name: 'Alex',   type: 'ai',     style: 'tight-aggressive' },
    { index: 2, name: 'Sam',    type: 'ai',     style: 'loose-passive' },
    { index: 3, name: 'Jordan', type: 'ai',     style: 'balanced' }
  ];

  var HAND_NAMES = [
    'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'
  ];

  var AI_PROFILES = {
    'tight-aggressive': { foldThreshold: 0.4,  raiseFreq: 0.7,  bluffFreq: 0.08 },
    'loose-passive':    { foldThreshold: 0.15, raiseFreq: 0.15, bluffFreq: 0.03 },
    'balanced':         { foldThreshold: 0.3,  raiseFreq: 0.4,  bluffFreq: 0.12 }
  };

  // ── DOM refs ───────────────────────────────────────────
  var app = document.getElementById('poker-app');
  if (!app) return;

  var dom = {
    balance:    document.getElementById('pk-balance'),
    pot:        document.getElementById('pk-pot'),
    community:  document.getElementById('pk-community'),
    status:     document.getElementById('pk-status'),
    handRank:   document.getElementById('pk-hand-rank'),
    fold:       document.getElementById('pk-fold'),
    check:      document.getElementById('pk-check'),
    call:       document.getElementById('pk-call'),
    raiseGroup: document.getElementById('pk-raise-group'),
    raise:      document.getElementById('pk-raise'),
    raiseAmt:   document.getElementById('pk-raise-amount'),
    raiseUp:    document.getElementById('pk-raise-up'),
    raiseDown:  document.getElementById('pk-raise-down'),
    allin:      document.getElementById('pk-allin'),
    newhand:    document.getElementById('pk-newhand'),
    statHands:  document.getElementById('pk-stat-hands'),
    statWins:   document.getElementById('pk-stat-wins'),
    statBiggest:document.getElementById('pk-stat-biggest'),
    statEarnings:document.getElementById('pk-stat-earnings'),
    statPeak:   document.getElementById('pk-stat-peak'),
    resetStats: document.getElementById('pk-reset-stats'),
    seats: [], names: [], chips: [], cards: [], bets: [], badges: [], actions: []
  };

  for (var i = 0; i < 4; i++) {
    dom.seats.push(document.getElementById('pk-seat-' + i));
    dom.names.push(document.getElementById('pk-name-' + i));
    dom.chips.push(document.getElementById('pk-chips-' + i));
    dom.cards.push(document.getElementById('pk-cards-' + i));
    dom.bets.push(document.getElementById('pk-bet-' + i));
    dom.badges.push(document.getElementById('pk-badge-' + i));
    dom.actions.push(document.getElementById('pk-action-' + i));
  }

  // ── State ──────────────────────────────────────────────
  var shoe = [];
  var raiseStepIndex = 1;

  var state = {
    phase: 'waiting',         // waiting|preflop|flop|turn|river|showdown|settled
    dealerIndex: 0,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    actionIndex: -1,
    lastRaiserIndex: -1,
    players: []
  };

  var stats = defaultStats();

  var playerStartChips = 0;

  function defaultStats() {
    return {
      hands: 0,
      wins: 0,
      biggestPot: 0,
      earnings: 0,
      peak: Wallet.getBalance()
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

  // ── Hand Evaluator ─────────────────────────────────────

  function combinations(arr, k) {
    var result = [];
    function combo(start, chosen) {
      if (chosen.length === k) {
        result.push(chosen.slice());
        return;
      }
      for (var i = start; i < arr.length; i++) {
        chosen.push(arr[i]);
        combo(i + 1, chosen);
        chosen.pop();
      }
    }
    combo(0, []);
    return result;
  }

  function groupByRank(cards) {
    var groups = {};
    for (var i = 0; i < cards.length; i++) {
      var v = RANK_VALUES[cards[i].rank];
      if (!groups[v]) groups[v] = 0;
      groups[v]++;
    }
    return groups;
  }

  function checkFlush(cards) {
    var s = cards[0].suit.name;
    for (var i = 1; i < cards.length; i++) {
      if (cards[i].suit.name !== s) return false;
    }
    return true;
  }

  function checkStraight(values) {
    // values is sorted descending array of 5 unique values
    if (values[0] - values[4] === 4) return true;
    // Wheel: A-2-3-4-5
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) return true;
    return false;
  }

  function evaluate5(cards) {
    var isFlush = checkFlush(cards);
    var values = [];
    for (var i = 0; i < cards.length; i++) {
      values.push(RANK_VALUES[cards[i].rank]);
    }
    values.sort(function (a, b) { return b - a; });

    var groups = groupByRank(cards);
    var counts = [];
    for (var v in groups) {
      if (groups.hasOwnProperty(v)) {
        counts.push({ value: parseInt(v, 10), count: groups[v] });
      }
    }
    // Sort by count desc, then value desc
    counts.sort(function (a, b) {
      return b.count - a.count || b.value - a.value;
    });

    var uniqueVals = [];
    for (var c = 0; c < counts.length; c++) {
      uniqueVals.push(counts[c].value);
    }

    var isStraight = (counts.length === 5) && checkStraight(values);

    // Check for wheel straight — adjust value so A is low
    var straightHigh = values[0];
    if (isStraight && values[0] === 14 && values[1] === 5) {
      straightHigh = 5; // Wheel
    }

    // Royal Flush
    if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
      return { rank: 9, value: [14], name: 'Royal Flush' };
    }
    // Straight Flush
    if (isFlush && isStraight) {
      return { rank: 8, value: [straightHigh], name: 'Straight Flush' };
    }
    // Four of a Kind
    if (counts[0].count === 4) {
      return { rank: 7, value: [counts[0].value, counts[1].value], name: 'Four of a Kind' };
    }
    // Full House
    if (counts[0].count === 3 && counts[1].count === 2) {
      return { rank: 6, value: [counts[0].value, counts[1].value], name: 'Full House' };
    }
    // Flush
    if (isFlush) {
      return { rank: 5, value: values, name: 'Flush' };
    }
    // Straight
    if (isStraight) {
      return { rank: 4, value: [straightHigh], name: 'Straight' };
    }
    // Three of a Kind
    if (counts[0].count === 3) {
      var kickers3 = [];
      for (var k = 1; k < counts.length; k++) kickers3.push(counts[k].value);
      kickers3.sort(function (a, b) { return b - a; });
      return { rank: 3, value: [counts[0].value].concat(kickers3), name: 'Three of a Kind' };
    }
    // Two Pair
    if (counts[0].count === 2 && counts[1].count === 2) {
      var pairHigh = Math.max(counts[0].value, counts[1].value);
      var pairLow = Math.min(counts[0].value, counts[1].value);
      return { rank: 2, value: [pairHigh, pairLow, counts[2].value], name: 'Two Pair' };
    }
    // Pair
    if (counts[0].count === 2) {
      var kickersP = [];
      for (var p = 1; p < counts.length; p++) kickersP.push(counts[p].value);
      kickersP.sort(function (a, b) { return b - a; });
      return { rank: 1, value: [counts[0].value].concat(kickersP), name: 'Pair' };
    }
    // High Card
    return { rank: 0, value: values, name: 'High Card' };
  }

  function evaluateHand(sevenCards) {
    var combos = combinations(sevenCards, 5);
    var best = null;
    for (var i = 0; i < combos.length; i++) {
      var result = evaluate5(combos[i]);
      if (!best || compareHands(result, best) > 0) {
        best = result;
      }
    }
    return best;
  }

  function compareHands(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (var i = 0; i < a.value.length && i < b.value.length; i++) {
      if (a.value[i] !== b.value[i]) return a.value[i] - b.value[i];
    }
    return 0;
  }

  // ── Game Flow ──────────────────────────────────────────

  function initPlayers() {
    state.players = [];
    for (var i = 0; i < PLAYERS.length; i++) {
      var chips = (i === 0) ? Wallet.getBalance() : STARTING_CHIPS;
      state.players.push({
        index: i,
        chips: chips,
        holeCards: [],
        bet: 0,
        totalBet: 0,
        folded: false,
        allIn: false,
        acted: false
      });
    }
  }

  function startHand() {
    // Rotate dealer
    state.dealerIndex = (state.dealerIndex + 1) % 4;

    // Reset state
    state.communityCards = [];
    state.pot = 0;
    state.currentBet = 0;
    state.minRaise = BIG_BLIND;
    state.lastRaiserIndex = -1;
    raiseStepIndex = 1;

    // Init / reset players
    for (var i = 0; i < 4; i++) {
      var p = state.players[i];
      p.holeCards = [];
      p.bet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
      p.acted = false;
    }

    // Sync player chips from wallet and snapshot
    state.players[0].chips = Wallet.getBalance();
    playerStartChips = Wallet.getBalance();

    // Auto-rebuy busted AI players
    for (var r = 1; r < 4; r++) {
      if (state.players[r].chips <= 0) {
        state.players[r].chips = STARTING_CHIPS;
      }
    }

    // Check if player is broke
    if (state.players[0].chips <= 0) {
      showBegPrompt();
      showNewHandButton();
      return;
    }

    // Clear UI
    clearTable();

    // Post blinds
    var sbIndex = (state.dealerIndex + 1) % 4;
    var bbIndex = (state.dealerIndex + 2) % 4;
    postBlind(sbIndex, SMALL_BLIND);
    postBlind(bbIndex, BIG_BLIND);
    state.currentBet = BIG_BLIND;

    renderBlinds();
    renderAllSeats();
    renderPot();

    // Deal hole cards with staggered animation
    state.phase = 'preflop';
    dealHoleCards(function () {
      // Action starts UTG (after big blind)
      state.actionIndex = (bbIndex + 1) % 4;
      state.lastRaiserIndex = bbIndex;
      promptAction();
    });
  }

  function postBlind(playerIndex, amount) {
    var p = state.players[playerIndex];
    var actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.bet = actual;
    p.totalBet = actual;
    state.pot += actual;
    if (p.chips === 0) p.allIn = true;
  }

  function dealHoleCards(callback) {
    var order = [];
    for (var round = 0; round < 2; round++) {
      for (var i = 1; i <= 4; i++) {
        order.push((state.dealerIndex + i) % 4);
      }
    }

    var idx = 0;
    function dealNext() {
      if (idx >= order.length) {
        callback();
        return;
      }
      var pi = order[idx];
      var card = drawCard();
      state.players[pi].holeCards.push(card);

      // Show card immediately for player, facedown for AI
      var faceDown = (pi !== 0);
      appendCardToSeat(pi, card, faceDown);

      idx++;
      setTimeout(dealNext, DEAL_DELAY);
    }
    dealNext();
  }

  function promptAction() {
    // Skip folded/allin players
    var attempts = 0;
    while (attempts < 4) {
      var p = state.players[state.actionIndex];
      if (!p.folded && !p.allIn) break;
      // Mark acted so we don't loop forever
      p.acted = true;
      state.actionIndex = (state.actionIndex + 1) % 4;
      attempts++;
    }

    if (attempts >= 4 || isBettingRoundOver()) {
      endBettingRound();
      return;
    }

    // Check if only one non-folded player
    if (countActivePlayers() === 1) {
      awardPotToLastStanding();
      return;
    }

    renderActivePlayer();

    var p = state.players[state.actionIndex];
    if (p.index === 0) {
      showPlayerControls();
    } else {
      hidePlayerControls();
      setTimeout(function () { aiDecide(p); }, AI_DELAY);
    }
  }

  function executeAction(playerIndex, action, amount) {
    var p = state.players[playerIndex];
    var actionText = '';

    switch (action) {
      case 'fold':
        p.folded = true;
        actionText = 'Fold';
        break;

      case 'check':
        actionText = 'Check';
        break;

      case 'call':
        var callAmt = state.currentBet - p.bet;
        if (callAmt >= p.chips) {
          callAmt = p.chips;
          p.allIn = true;
          actionText = 'All In ($' + callAmt + ')';
        } else {
          actionText = 'Call $' + callAmt;
        }
        p.chips -= callAmt;
        p.bet += callAmt;
        p.totalBet += callAmt;
        state.pot += callAmt;
        break;

      case 'raise':
        var raiseTotal = amount;
        var needed = raiseTotal - p.bet;
        if (needed >= p.chips) {
          needed = p.chips;
          raiseTotal = p.bet + needed;
          p.allIn = true;
          actionText = 'All In ($' + needed + ')';
        } else {
          actionText = 'Raise to $' + raiseTotal;
        }
        state.minRaise = raiseTotal - state.currentBet;
        if (state.minRaise < BIG_BLIND) state.minRaise = BIG_BLIND;
        state.currentBet = raiseTotal;
        p.chips -= needed;
        p.bet += needed;
        p.totalBet += needed;
        state.pot += needed;
        state.lastRaiserIndex = playerIndex;
        // Reset acted for all other non-folded, non-allin players
        for (var i = 0; i < 4; i++) {
          if (i !== playerIndex && !state.players[i].folded && !state.players[i].allIn) {
            state.players[i].acted = false;
          }
        }
        break;

      case 'allin':
        var allInAmt = p.chips;
        var newBet = p.bet + allInAmt;
        if (newBet > state.currentBet) {
          state.minRaise = newBet - state.currentBet;
          if (state.minRaise < BIG_BLIND) state.minRaise = BIG_BLIND;
          state.currentBet = newBet;
          state.lastRaiserIndex = playerIndex;
          for (var j = 0; j < 4; j++) {
            if (j !== playerIndex && !state.players[j].folded && !state.players[j].allIn) {
              state.players[j].acted = false;
            }
          }
        }
        p.chips -= allInAmt;
        p.bet += allInAmt;
        p.totalBet += allInAmt;
        state.pot += allInAmt;
        p.allIn = true;
        actionText = 'All In ($' + allInAmt + ')';
        break;
    }

    p.acted = true;

    // Show action label for AI
    if (playerIndex !== 0 && dom.actions[playerIndex]) {
      dom.actions[playerIndex].textContent = actionText;
    }

    renderSeat(playerIndex);
    renderPot();
    renderBalance();

    // Check if only one left
    if (countActivePlayers() === 1) {
      awardPotToLastStanding();
      return;
    }

    // Advance
    advanceAction();
  }

  function advanceAction() {
    state.actionIndex = (state.actionIndex + 1) % 4;

    if (isBettingRoundOver()) {
      endBettingRound();
      return;
    }

    promptAction();
  }

  function isBettingRoundOver() {
    for (var i = 0; i < 4; i++) {
      var p = state.players[i];
      if (p.folded || p.allIn) continue;
      if (!p.acted) return false;
      if (p.bet < state.currentBet) return false;
    }
    return true;
  }

  function countActivePlayers() {
    var count = 0;
    for (var i = 0; i < 4; i++) {
      if (!state.players[i].folded) count++;
    }
    return count;
  }

  function countActiveNonAllIn() {
    var count = 0;
    for (var i = 0; i < 4; i++) {
      if (!state.players[i].folded && !state.players[i].allIn) count++;
    }
    return count;
  }

  function endBettingRound() {
    // Reset bets for next round
    for (var i = 0; i < 4; i++) {
      state.players[i].bet = 0;
      state.players[i].acted = false;
    }
    state.currentBet = 0;
    state.minRaise = BIG_BLIND;

    // Clear action labels
    for (var a = 0; a < 4; a++) {
      if (dom.actions[a]) dom.actions[a].textContent = '';
    }

    hidePlayerControls();
    clearActivePlayer();

    // If all but one are all-in or folded, deal remaining community cards
    if (countActiveNonAllIn() <= 1 && countActivePlayers() > 1) {
      // Run out the board
      dealRemainingBoard(function () {
        performShowdown();
      });
      return;
    }

    switch (state.phase) {
      case 'preflop':
        state.phase = 'flop';
        dealCommunityCards(3, function () {
          startBettingRound();
        });
        break;
      case 'flop':
        state.phase = 'turn';
        dealCommunityCards(1, function () {
          startBettingRound();
        });
        break;
      case 'turn':
        state.phase = 'river';
        dealCommunityCards(1, function () {
          startBettingRound();
        });
        break;
      case 'river':
        performShowdown();
        break;
    }
  }

  function dealRemainingBoard(callback) {
    var needed = 5 - state.communityCards.length;
    if (needed <= 0) {
      callback();
      return;
    }
    dealCommunityCards(needed, callback);
  }

  function startBettingRound() {
    // Action starts left of dealer
    state.actionIndex = (state.dealerIndex + 1) % 4;
    state.lastRaiserIndex = -1;
    updateHandRank();
    promptAction();
  }

  function dealCommunityCards(count, callback) {
    var dealt = 0;
    function dealNext() {
      if (dealt >= count) {
        updateHandRank();
        callback();
        return;
      }
      var card = drawCard();
      state.communityCards.push(card);
      appendCommunityCard(card);
      dealt++;
      setTimeout(dealNext, DEAL_DELAY);
    }
    dealNext();
  }

  // ── Showdown ───────────────────────────────────────────

  function performShowdown() {
    state.phase = 'showdown';
    hidePlayerControls();
    clearActivePlayer();

    // Reveal AI cards with stagger
    var revealOrder = [];
    for (var i = 1; i < 4; i++) {
      if (!state.players[i].folded) {
        revealOrder.push(i);
      }
    }

    var idx = 0;
    function revealNext() {
      if (idx >= revealOrder.length) {
        setTimeout(resolveShowdown, SHOWDOWN_DELAY);
        return;
      }
      var pi = revealOrder[idx];
      flipCards(pi);
      idx++;
      setTimeout(revealNext, SHOWDOWN_DELAY);
    }
    revealNext();
  }

  function resolveShowdown() {
    var activePlayers = [];
    for (var i = 0; i < 4; i++) {
      if (!state.players[i].folded) {
        var allCards = state.players[i].holeCards.concat(state.communityCards);
        var best = evaluateHand(allCards);
        activePlayers.push({ index: i, hand: best });
      }
    }

    // Sort by hand strength descending
    activePlayers.sort(function (a, b) {
      return compareHands(b.hand, a.hand);
    });

    // Find winners (could be split pot)
    var winners = [activePlayers[0]];
    for (var w = 1; w < activePlayers.length; w++) {
      if (compareHands(activePlayers[w].hand, activePlayers[0].hand) === 0) {
        winners.push(activePlayers[w]);
      } else {
        break;
      }
    }

    // Award pot
    var share = Math.floor(state.pot / winners.length);
    var remainder = state.pot - (share * winners.length);

    var winnerNames = [];
    for (var wi = 0; wi < winners.length; wi++) {
      var wp = state.players[winners[wi].index];
      var award = share + (wi === 0 ? remainder : 0);
      wp.chips += award;
      winnerNames.push(PLAYERS[winners[wi].index].name);
    }

    // Sync wallet with delta
    var delta = state.players[0].chips - playerStartChips;
    if (delta > 0) {
      Wallet.add(delta);
    } else if (delta < 0) {
      Wallet.deduct(-delta);
    }

    // Update stats
    stats.hands++;
    if (state.pot > stats.biggestPot) stats.biggestPot = state.pot;

    var playerInWinners = false;
    for (var pw = 0; pw < winners.length; pw++) {
      if (winners[pw].index === 0) {
        playerInWinners = true;
        break;
      }
    }
    if (playerInWinners) {
      stats.wins++;
      stats.earnings += (share + (winners[0].index === 0 ? remainder : 0)) - state.players[0].totalBet;
    } else {
      stats.earnings -= state.players[0].totalBet;
    }

    if (Wallet.getBalance() > stats.peak) stats.peak = Wallet.getBalance();

    // Show result
    var handName = activePlayers[0].hand.name;
    var statusText;
    if (winners.length === 1) {
      statusText = winnerNames[0] + ' wins $' + state.pot + ' with ' + handName;
    } else {
      statusText = 'Split pot! ' + winnerNames.join(' & ') + ' each win $' + share + ' with ' + handName;
    }

    state.phase = 'settled';
    dom.status.textContent = statusText;
    dom.status.className = 'pk-status';
    if (playerInWinners) {
      dom.status.classList.add('pk-status-win');
    } else {
      dom.status.classList.add('pk-status-lose');
    }

    // Celebrate
    var winnerIndices = [];
    for (var ci = 0; ci < winners.length; ci++) {
      winnerIndices.push(winners[ci].index);
    }
    celebrateWin(winnerIndices);

    renderAllSeats();
    renderBalance();
    renderStats();
    saveStats();
    showNewHandButton();
  }

  function awardPotToLastStanding() {
    var winner = null;
    for (var i = 0; i < 4; i++) {
      if (!state.players[i].folded) {
        winner = i;
        break;
      }
    }

    if (winner === null) return;

    state.players[winner].chips += state.pot;

    // Sync wallet with delta
    var delta = state.players[0].chips - playerStartChips;
    if (delta > 0) {
      Wallet.add(delta);
    } else if (delta < 0) {
      Wallet.deduct(-delta);
    }

    if (winner === 0) {
      stats.wins++;
      stats.earnings += state.pot - state.players[0].totalBet;
    } else {
      stats.earnings -= state.players[0].totalBet;
    }

    stats.hands++;
    if (state.pot > stats.biggestPot) stats.biggestPot = state.pot;
    if (Wallet.getBalance() > stats.peak) stats.peak = Wallet.getBalance();

    state.phase = 'settled';
    dom.status.textContent = PLAYERS[winner].name + ' wins $' + state.pot + ' (everyone else folded)';
    dom.status.className = 'pk-status pk-status-win';

    celebrateWin([winner]);

    hidePlayerControls();
    clearActivePlayer();
    renderAllSeats();
    renderBalance();
    renderStats();
    saveStats();
    showNewHandButton();
  }

  // ── AI Decision Making ─────────────────────────────────

  function evaluateHoleCards(cards) {
    var v1 = RANK_VALUES[cards[0].rank];
    var v2 = RANK_VALUES[cards[1].rank];
    var high = Math.max(v1, v2);
    var low = Math.min(v1, v2);
    var suited = cards[0].suit.name === cards[1].suit.name;
    var gap = high - low;

    var strength = 0;

    // Pair bonus
    if (v1 === v2) {
      strength = 0.5 + (v1 / 14) * 0.5; // AA = 1.0, 22 = 0.57
    } else {
      // High card value
      strength = (high / 14) * 0.45;
      // Second card contribution
      strength += (low / 14) * 0.15;
      // Suited bonus
      if (suited) strength += 0.08;
      // Connected bonus
      if (gap === 1) strength += 0.06;
      else if (gap === 2) strength += 0.03;
    }

    return Math.min(1.0, Math.max(0, strength));
  }

  function getHandStrength(player) {
    if (state.communityCards.length === 0) {
      return evaluateHoleCards(player.holeCards);
    }
    var allCards = player.holeCards.concat(state.communityCards);
    var result = evaluateHand(allCards);
    // Normalize: rank 0-9 to 0.0-1.0 with value tiebreakers
    var base = result.rank / 9;
    var bonus = 0;
    if (result.value.length > 0) {
      bonus = (result.value[0] / 14) * 0.1;
    }
    return Math.min(1.0, base + bonus);
  }

  function aiDecide(player) {
    var profile = AI_PROFILES[PLAYERS[player.index].style];
    var strength = getHandStrength(player);

    var toCall = state.currentBet - player.bet;
    var canCheck = (toCall === 0);

    // Bluff chance
    var bluffing = Math.random() < profile.bluffFreq;

    if (bluffing) {
      strength += 0.3;
      if (strength > 1.0) strength = 1.0;
    }

    // Pot odds consideration
    var potOdds = (state.pot > 0 && toCall > 0) ? toCall / (state.pot + toCall) : 0;

    if (canCheck) {
      // Can check — decide raise or check
      if (strength > 0.6 && Math.random() < profile.raiseFreq) {
        var raiseAmt = computeAIRaise(player, strength);
        executeAction(player.index, 'raise', raiseAmt);
      } else {
        executeAction(player.index, 'check');
      }
    } else {
      // Must call or fold
      if (strength < profile.foldThreshold && !bluffing) {
        // Consider pot odds before folding
        if (potOdds > 0 && strength > potOdds * 0.8) {
          executeAction(player.index, 'call');
        } else {
          executeAction(player.index, 'fold');
        }
      } else if (strength > 0.7 && Math.random() < profile.raiseFreq && player.chips > toCall * 2) {
        var raiseAmt2 = computeAIRaise(player, strength);
        executeAction(player.index, 'raise', raiseAmt2);
      } else if (toCall >= player.chips) {
        // Need to go all-in to call
        if (strength > 0.5 || bluffing) {
          executeAction(player.index, 'allin');
        } else {
          executeAction(player.index, 'fold');
        }
      } else {
        executeAction(player.index, 'call');
      }
    }
  }

  function computeAIRaise(player, strength) {
    // Raise between min raise and 3x pot
    var minTotal = state.currentBet + state.minRaise;
    var maxTotal = state.currentBet + Math.min(player.chips, state.pot * 3);
    if (maxTotal < minTotal) maxTotal = minTotal;

    var factor = 0.3 + strength * 0.7; // 0.3 to 1.0
    var total = Math.floor(minTotal + (maxTotal - minTotal) * factor);

    // Round to nearest 5
    total = Math.round(total / 5) * 5;
    if (total < minTotal) total = minTotal;
    if (total > player.bet + player.chips) total = player.bet + player.chips;

    return total;
  }

  // ── Celebrations ────────────────────────────────────────

  var CHIP_SYMBOLS = ['\u{1FA99}', '$', '\u2666', '\u2605'];

  function celebrateWin(winnerIndices) {
    spawnChipParticles(winnerIndices);
    highlightWinnerSeats(winnerIndices);
    sweepPot();
  }

  function spawnChipParticles(winnerIndices) {
    var table = document.querySelector('.pk-table');
    if (!table) return;
    var tableRect = table.getBoundingClientRect();
    var potEl = dom.pot;
    var potRect = potEl.getBoundingClientRect();
    var originX = potRect.left + potRect.width / 2 - tableRect.left;
    var originY = potRect.top + potRect.height / 2 - tableRect.top;

    for (var w = 0; w < winnerIndices.length; w++) {
      var seatEl = dom.seats[winnerIndices[w]];
      var seatRect = seatEl.getBoundingClientRect();
      var targetX = seatRect.left + seatRect.width / 2 - tableRect.left;
      var targetY = seatRect.top + seatRect.height / 2 - tableRect.top;

      var dx = targetX - originX;
      var dy = targetY - originY;

      for (var p = 0; p < 8; p++) {
        (function (delay, flyX, flyY) {
          setTimeout(function () {
            var chip = document.createElement('span');
            chip.className = 'pk-chip-particle';
            chip.textContent = CHIP_SYMBOLS[Math.floor(Math.random() * CHIP_SYMBOLS.length)];
            var spread = 30;
            var sx = flyX + (Math.random() - 0.5) * spread;
            var sy = flyY + (Math.random() - 0.5) * spread;
            chip.style.left = originX + 'px';
            chip.style.top = originY + 'px';
            chip.style.setProperty('--fly-x', sx + 'px');
            chip.style.setProperty('--fly-y', sy + 'px');
            table.appendChild(chip);
            setTimeout(function () {
              if (chip.parentNode) chip.parentNode.removeChild(chip);
            }, 1100);
          }, delay);
        })(p * 80, dx, dy);
      }
    }
  }

  function highlightWinnerSeats(winnerIndices) {
    for (var i = 0; i < winnerIndices.length; i++) {
      var seat = dom.seats[winnerIndices[i]];
      seat.classList.add('pk-winner');
    }
    setTimeout(function () {
      for (var j = 0; j < winnerIndices.length; j++) {
        dom.seats[winnerIndices[j]].classList.remove('pk-winner');
      }
    }, 2500);
  }

  function sweepPot() {
    dom.pot.classList.remove('pk-pot-big');
    dom.pot.classList.add('pk-pot-sweep');
  }

  // ── Rendering ──────────────────────────────────────────

  function renderCard(card, faceDown, small) {
    var el = document.createElement('div');
    el.className = 'pk-card';
    if (small) el.classList.add('pk-card-sm');

    if (faceDown) {
      el.classList.add('pk-card-facedown');
      el.textContent = '?';
      return el;
    }

    var colorClass = card.suit.color === 'red' ? 'pk-card-red' : 'pk-card-black';
    el.classList.add(colorClass);

    var rankEl = document.createElement('span');
    rankEl.className = 'pk-card-rank';
    rankEl.textContent = card.rank;

    var suitEl = document.createElement('span');
    suitEl.className = 'pk-card-suit';
    suitEl.textContent = card.suit.symbol;

    el.appendChild(rankEl);
    el.appendChild(suitEl);
    return el;
  }

  function appendCardToSeat(playerIndex, card, faceDown) {
    var small = (playerIndex !== 0);
    var cardEl = renderCard(card, faceDown, small);
    dom.cards[playerIndex].appendChild(cardEl);
  }

  function appendCommunityCard(card) {
    var cardEl = renderCard(card, false, false);
    cardEl.classList.add('pk-card-community-new');
    dom.community.appendChild(cardEl);
  }

  function flipCards(playerIndex) {
    var p = state.players[playerIndex];
    dom.cards[playerIndex].innerHTML = '';
    var small = (playerIndex !== 0);
    for (var i = 0; i < p.holeCards.length; i++) {
      var wrapper = document.createElement('div');
      wrapper.className = 'pk-card-flip-container';
      var inner = document.createElement('div');
      inner.className = 'pk-card-flip-inner';
      inner.appendChild(renderCard(p.holeCards[i], false, small));
      wrapper.appendChild(inner);
      dom.cards[playerIndex].appendChild(wrapper);
    }
  }

  function renderSeat(playerIndex) {
    var p = state.players[playerIndex];
    var seat = dom.seats[playerIndex];

    // Chips
    dom.chips[playerIndex].textContent = '$' + p.chips;

    // Bet
    dom.bets[playerIndex].textContent = p.bet > 0 ? 'Bet: $' + p.bet : '';

    // Folded state
    if (p.folded) {
      seat.classList.add('pk-folded');
    } else {
      seat.classList.remove('pk-folded');
    }
  }

  function renderAllSeats() {
    for (var i = 0; i < 4; i++) {
      renderSeat(i);
    }
  }

  function renderBlinds() {
    var sbIndex = (state.dealerIndex + 1) % 4;
    var bbIndex = (state.dealerIndex + 2) % 4;

    for (var i = 0; i < 4; i++) {
      var badge = dom.badges[i];
      badge.textContent = '';
      badge.classList.remove('pk-badge-visible');

      if (i === state.dealerIndex) {
        badge.textContent = 'D';
        badge.classList.add('pk-badge-visible');
      } else if (i === sbIndex) {
        badge.textContent = 'SB';
        badge.classList.add('pk-badge-visible');
      } else if (i === bbIndex) {
        badge.textContent = 'BB';
        badge.classList.add('pk-badge-visible');
      }
    }
  }

  function renderPot() {
    dom.pot.textContent = state.pot > 0 ? 'Pot: $' + state.pot : '';
    dom.pot.classList.remove('pk-pot-big', 'pk-pot-sweep');
    if (state.pot >= 200) {
      dom.pot.classList.add('pk-pot-big');
    }
  }

  function renderBalance() {
    dom.balance.textContent = Wallet.getBalance();
  }

  function renderActivePlayer() {
    clearActivePlayer();
    var seat = dom.seats[state.actionIndex];
    if (seat) seat.classList.add('pk-active');
  }

  function clearActivePlayer() {
    for (var i = 0; i < 4; i++) {
      dom.seats[i].classList.remove('pk-active');
    }
  }

  function updateHandRank() {
    if (state.communityCards.length < 3 || state.players[0].folded) {
      dom.handRank.textContent = '';
      return;
    }
    var allCards = state.players[0].holeCards.concat(state.communityCards);
    var result = evaluateHand(allCards);
    dom.handRank.textContent = result.name;
  }

  function clearTable() {
    dom.community.innerHTML = '';
    dom.status.textContent = '';
    dom.status.className = 'pk-status';
    dom.handRank.textContent = '';
    dom.pot.textContent = '';
    dom.pot.classList.remove('pk-pot-big', 'pk-pot-sweep');

    for (var i = 0; i < 4; i++) {
      dom.cards[i].innerHTML = '';
      dom.bets[i].textContent = '';
      dom.seats[i].classList.remove('pk-folded', 'pk-active', 'pk-winner');
      if (dom.actions[i]) dom.actions[i].textContent = '';
    }
  }

  // ── Player Controls ────────────────────────────────────

  function showPlayerControls() {
    var p = state.players[0];
    var toCall = state.currentBet - p.bet;
    var canCheck = (toCall === 0);

    dom.fold.hidden = false;
    dom.check.hidden = !canCheck;
    dom.call.hidden = canCheck;
    dom.newhand.hidden = true;

    if (!canCheck) {
      if (toCall >= p.chips) {
        dom.call.textContent = 'Call (All In $' + p.chips + ')';
        dom.raiseGroup.hidden = true;
        dom.allin.hidden = true;
      } else {
        dom.call.textContent = 'Call $' + toCall;
        dom.raiseGroup.hidden = false;
        dom.allin.hidden = false;
        updateRaiseDisplay();
      }
    } else {
      // Can check — can still raise
      if (p.chips > 0) {
        dom.raiseGroup.hidden = false;
        dom.allin.hidden = false;
        updateRaiseDisplay();
      } else {
        dom.raiseGroup.hidden = true;
        dom.allin.hidden = true;
      }
    }
  }

  function hidePlayerControls() {
    dom.fold.hidden = true;
    dom.check.hidden = true;
    dom.call.hidden = true;
    dom.raiseGroup.hidden = true;
    dom.allin.hidden = true;
    dom.newhand.hidden = true;
  }

  function showNewHandButton() {
    hidePlayerControls();
    dom.newhand.hidden = false;
  }

  function updateRaiseDisplay() {
    var minTotal = state.currentBet + state.minRaise;
    var p = state.players[0];
    var maxTotal = p.bet + p.chips;

    var raiseAmt = RAISE_STEPS[raiseStepIndex] || BIG_BLIND;
    var total = state.currentBet + raiseAmt;
    if (total < minTotal) total = minTotal;
    if (total > maxTotal) total = maxTotal;

    dom.raiseAmt.textContent = total;
  }

  function getRaiseTotal() {
    var minTotal = state.currentBet + state.minRaise;
    var p = state.players[0];
    var maxTotal = p.bet + p.chips;

    var raiseAmt = RAISE_STEPS[raiseStepIndex] || BIG_BLIND;
    var total = state.currentBet + raiseAmt;
    if (total < minTotal) total = minTotal;
    if (total > maxTotal) total = maxTotal;

    return total;
  }

  // ── Stats (localStorage) ───────────────────────────────

  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        stats.hands = saved.hands || 0;
        stats.wins = saved.wins || 0;
        stats.biggestPot = saved.biggestPot || 0;
        stats.earnings = saved.earnings || 0;
        stats.peak = saved.peak || Wallet.getBalance();
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
    if (!confirm('Reset all stats?')) return;
    stats = defaultStats();
    state.phase = 'waiting';
    initPlayers();
    clearTable();
    hidePlayerControls();
    dom.newhand.hidden = false;
    saveStats();
    renderBalance();
    renderStats();
    renderAllSeats();
  }

  function renderStats() {
    dom.statHands.textContent = stats.hands;
    dom.statWins.textContent = stats.wins;
    dom.statBiggest.textContent = '$' + stats.biggestPot;
    dom.statEarnings.textContent = (stats.earnings >= 0 ? '$' : '-$') + Math.abs(stats.earnings);
    dom.statPeak.textContent = '$' + stats.peak;
  }

  // ── Events + Init ──────────────────────────────────────

  dom.fold.addEventListener('click', function () {
    if (state.actionIndex !== 0) return;
    executeAction(0, 'fold');
  });

  dom.check.addEventListener('click', function () {
    if (state.actionIndex !== 0) return;
    executeAction(0, 'check');
  });

  dom.call.addEventListener('click', function () {
    if (state.actionIndex !== 0) return;
    var p = state.players[0];
    var toCall = state.currentBet - p.bet;
    if (toCall >= p.chips) {
      executeAction(0, 'allin');
    } else {
      executeAction(0, 'call');
    }
  });

  dom.raise.addEventListener('click', function () {
    if (state.actionIndex !== 0) return;
    var total = getRaiseTotal();
    executeAction(0, 'raise', total);
  });

  dom.raiseUp.addEventListener('click', function () {
    if (raiseStepIndex < RAISE_STEPS.length - 1) raiseStepIndex++;
    updateRaiseDisplay();
  });

  dom.raiseDown.addEventListener('click', function () {
    if (raiseStepIndex > 0) raiseStepIndex--;
    updateRaiseDisplay();
  });

  dom.allin.addEventListener('click', function () {
    if (state.actionIndex !== 0) return;
    executeAction(0, 'allin');
  });

  dom.newhand.addEventListener('click', function () {
    startHand();
  });

  dom.resetStats.addEventListener('click', resetStats);

  function showBegPrompt() {
    if (!Wallet.isBroke()) return;
    dom.status.className = 'pk-status pk-status-lose';
    dom.status.innerHTML = '';
    dom.status.appendChild(document.createTextNode('You\'re broke! '));
    var begBtn = document.createElement('button');
    begBtn.className = 'pk-btn pk-btn-small';
    begBtn.textContent = 'Beg for coins';
    begBtn.addEventListener('click', function () {
      var result = Wallet.beg();
      if (result) {
        dom.status.textContent = result.message;
        renderBalance();
      }
    });
    dom.status.appendChild(begBtn);
  }

  // Init
  createShoe();
  loadStats();
  initPlayers();
  renderBalance();
  renderStats();
  renderAllSeats();
  dom.newhand.hidden = false;
  showBegPrompt();
})();
