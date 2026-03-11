/* ══════════════════════════════════════════════════
   RPG NO LIMIT HOLD'EM — Canvas-based cash game.
   1 player + 5 AI opponents, blinds scale with buy-in.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var Cards = window.RpgCards;
  var CW = 1060, CH = 660;

  // ── Constants ─────────────────────────────────────
  var NUM_SEATS = 6;
  var PLAYER_SEAT = 0;
  var CARD_SCALE = 1.2;
  var CARD_W = Cards.CARD_W * CARD_SCALE;
  var CARD_H = Cards.CARD_H * CARD_SCALE;
  var DEAL_DELAY = 150;
  var AI_THINK_MIN = 400;
  var AI_THINK_MAX = 1200;
  var COMMUNITY_DEAL_DELAY = 250;

  // Buy-in tiers: [buyIn, smallBlind, bigBlind]
  var TIERS = [
    [100,   1,   2],
    [500,   2,   5],
    [1000,  5,  10],
    [2500, 10,  25],
    [5000, 25,  50],
    [10000, 50, 100]
  ];

  // Seat positions (cx, cy) on canvas — oval layout
  var SEAT_POS = [
    { x: 530, y: 535 },  // 0: player (bottom center)
    { x: 170, y: 430 },  // 1: bottom-left
    { x: 140, y: 200 },  // 2: top-left
    { x: 530, y: 115 },  // 3: top-center
    { x: 920, y: 200 },  // 4: top-right
    { x: 890, y: 430 }   // 5: bottom-right
  ];

  // AI names and personalities
  var AI_PROFILES = [
    { name: 'Hank',    style: 'tight-passive',   pfr: 0.12, agg: 0.25 },
    { name: 'Ruby',    style: 'loose-aggressive', pfr: 0.40, agg: 0.70 },
    { name: 'Cliff',   style: 'tight-aggressive', pfr: 0.18, agg: 0.60 },
    { name: 'Mabel',   style: 'loose-passive',    pfr: 0.35, agg: 0.20 },
    { name: 'Ace',     style: 'maniac',           pfr: 0.50, agg: 0.80 }
  ];

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null;
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;

  // Action queue
  var actionQueue = [];
  var actionTimer = 0;

  // Table state
  var deck = [];
  var community = [];     // up to 5 community cards
  var pot = 0;
  var sidePots = [];      // [{ amount, eligible: [seatIndexes] }]
  var dealerSeat = 0;     // button position
  var currentTier = 0;

  // Seat data
  var seats = [];  // [{ active, folded, allIn, chips, hole, bet, name, ai, profile, lastAction }]

  // Betting round
  // phase: buy-in | dealing | preflop | flop-deal | flop | turn-deal | turn | river-deal | river | showdown | settled
  var phase = 'buy-in';
  var actingSeat = -1;
  var lastRaiser = -1;
  var currentBet = 0;      // highest bet this round
  var minRaise = 0;        // minimum raise amount
  var statusText = '';
  var roundName = '';

  // Player raise slider
  var raiseAmount = 0;

  // Showdown display
  var showdownResults = []; // [{ seat, hand, handName }]
  var winnerSeats = [];
  var showdownTimer = 0;

  // Session stats
  var stats = { hands: 0, wins: 0, folds: 0 };
  var STATS_KEY = 'arebooksgood-casino-holdem-stats';

  // ── Helpers ───────────────────────────────────────
  function getBalance() {
    return window.Wallet ? window.Wallet.getBalance() : 0;
  }

  function walletAdd(n) {
    if (window.Wallet) window.Wallet.add(n);
  }

  function walletDeduct(n) {
    if (window.Wallet) window.Wallet.deduct(n);
  }

  function msg(text, type) {
    if (bridge && bridge.addMessage) bridge.addMessage(text, type || 'system');
  }

  function chatMsg(text, type) {
    if (bridge && bridge.addChatMessage) bridge.addChatMessage(text, type || 'npc');
    else msg(text, type);
  }

  // ── Action Queue ──────────────────────────────────
  function queueAction(fn, delay) {
    actionQueue.push({ fn: fn, delay: delay || 0 });
  }

  function processQueue(dt) {
    if (actionQueue.length === 0) return;
    actionTimer += dt * 1000;
    if (actionTimer >= actionQueue[0].delay) {
      var action = actionQueue.shift();
      actionTimer = 0;
      action.fn();
    }
  }

  function queueClear() {
    actionQueue = [];
    actionTimer = 0;
  }

  // ── Stats ─────────────────────────────────────────
  function loadStats() {
    try {
      var saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        var p = JSON.parse(saved);
        stats.hands = p.hands || 0;
        stats.wins = p.wins || 0;
        stats.folds = p.folds || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  // ── Deck ──────────────────────────────────────────
  function freshDeck() {
    deck = Cards.createDeck(1);
    Cards.shuffle(deck);
  }

  function draw1() {
    if (deck.length === 0) freshDeck();
    return Cards.drawCard(deck);
  }

  // ── Seat Management ───────────────────────────────
  function initSeats() {
    var tier = TIERS[currentTier];
    var buyIn = tier[0];
    seats = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (i === PLAYER_SEAT) {
        seats.push({
          active: true, folded: false, allIn: false,
          chips: buyIn, hole: [], bet: 0,
          name: 'You', ai: false, profile: null, lastAction: ''
        });
      } else {
        var prof = AI_PROFILES[i - 1];
        seats.push({
          active: true, folded: false, allIn: false,
          chips: buyIn, hole: [], bet: 0,
          name: prof.name, ai: true, profile: prof, lastAction: ''
        });
      }
    }
  }

  function activePlayers() {
    var count = 0;
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].folded) count++;
    }
    return count;
  }

  function activeNonAllIn() {
    var count = 0;
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].folded && !seats[i].allIn) count++;
    }
    return count;
  }

  function nextActiveSeat(from) {
    for (var i = 1; i <= NUM_SEATS; i++) {
      var s = (from + i) % NUM_SEATS;
      if (seats[s].active && !seats[s].folded && !seats[s].allIn) return s;
    }
    return -1;
  }

  function nextActiveSeatIncludeAllIn(from) {
    for (var i = 1; i <= NUM_SEATS; i++) {
      var s = (from + i) % NUM_SEATS;
      if (seats[s].active && !seats[s].folded) return s;
    }
    return -1;
  }

  // ── Blind Posting & Deal ──────────────────────────
  function startHand() {
    var tier = TIERS[currentTier];
    freshDeck();
    community = [];
    pot = 0;
    sidePots = [];
    currentBet = 0;
    minRaise = tier[2]; // big blind
    showdownResults = [];
    winnerSeats = [];
    showdownTimer = 0;

    // Reset seats
    for (var i = 0; i < NUM_SEATS; i++) {
      seats[i].folded = false;
      seats[i].allIn = false;
      seats[i].hole = [];
      seats[i].bet = 0;
      seats[i].lastAction = '';
      // Remove busted players
      if (seats[i].chips <= 0 && i !== PLAYER_SEAT) {
        seats[i].active = false;
      }
    }

    // Player busted check
    if (seats[PLAYER_SEAT].chips <= 0) {
      statusText = 'You\'re out of chips!';
      phase = 'settled';
      return;
    }

    // Need at least 2 active players
    if (activePlayers() < 2) {
      statusText = 'You win the table!';
      msg('Dominated the Hold\'em table!', 'reward');
      phase = 'settled';
      return;
    }

    // Advance dealer
    dealerSeat = nextActiveSeatIncludeAllIn(dealerSeat);
    if (dealerSeat === -1) dealerSeat = 0;

    phase = 'dealing';
    statusText = 'Dealing...';
    roundName = '';

    // Post blinds
    var sb = nextActiveSeatIncludeAllIn(dealerSeat);
    var bb = nextActiveSeatIncludeAllIn(sb);
    postBlind(sb, tier[1]);
    postBlind(bb, tier[2]);
    currentBet = tier[2];
    minRaise = tier[2];

    // Deal hole cards (2 per active player, animated)
    for (var round = 0; round < 2; round++) {
      for (var si = 0; si < NUM_SEATS; si++) {
        var seat = (bb + 1 + si) % NUM_SEATS;
        if (!seats[seat].active) continue;
        (function (s) {
          queueAction(function () {
            seats[s].hole.push(draw1());
          }, DEAL_DELAY);
        })(seat);
      }
    }

    // Start preflop betting after dealing
    var bbSeat = bb;
    queueAction(function () {
      phase = 'preflop';
      roundName = 'Pre-flop';
      // Clear lastAction so isRoundComplete sees everyone as needing to act.
      // BB posted blind but still gets option to check/raise.
      for (var ci = 0; ci < NUM_SEATS; ci++) seats[ci].lastAction = '';
      actingSeat = nextActiveSeat(bbSeat);
      lastRaiser = -1;
      statusText = '';
      checkActingSeat();
    }, 200);
  }

  function postBlind(seat, amount) {
    var s = seats[seat];
    var actual = Math.min(amount, s.chips);
    s.chips -= actual;
    s.bet = actual;
    pot += actual;
    if (s.chips === 0) s.allIn = true;
    s.lastAction = actual < amount ? 'All-in' : (amount === TIERS[currentTier][1] ? 'SB' : 'BB');
  }

  // ── Betting Logic ─────────────────────────────────
  function isRoundComplete() {
    // Round is complete when every active, non-all-in player has acted at least once
    // AND all bets are equal (no outstanding raise to call).
    for (var i = 0; i < NUM_SEATS; i++) {
      var s = seats[i];
      if (!s.active || s.folded || s.allIn) continue;
      if (!s.lastAction) return false; // hasn't acted yet this round
      if (s.bet < currentBet) return false; // hasn't matched the current bet
    }
    return true;
  }

  function checkActingSeat() {
    if (activePlayers() <= 1) {
      awardPotToLastStanding();
      return;
    }

    if (actingSeat === -1) {
      endBettingRound();
      return;
    }

    // Skip folded/all-in
    var s = seats[actingSeat];
    if (!s.active || s.folded || s.allIn) {
      var next = nextActiveSeat(actingSeat);
      if (next === -1 || isRoundComplete()) {
        endBettingRound();
        return;
      }
      actingSeat = next;
      checkActingSeat();
      return;
    }

    // Check if round is complete (everyone acted, bets matched)
    if (isRoundComplete()) {
      endBettingRound();
      return;
    }

    if (s.ai) {
      // AI acts after a delay
      var thinkTime = AI_THINK_MIN + Math.random() * (AI_THINK_MAX - AI_THINK_MIN);
      queueAction(function () {
        aiAct(actingSeat);
      }, thinkTime);
    } else {
      // Player's turn — update raise slider default
      raiseAmount = Math.max(currentBet + minRaise, currentBet * 2);
      if (raiseAmount > s.chips + s.bet) raiseAmount = s.chips + s.bet;
      statusText = 'Your turn';
    }
  }

  function playerFold() {
    if (phase !== 'preflop' && phase !== 'flop' && phase !== 'turn' && phase !== 'river') return;
    if (actingSeat !== PLAYER_SEAT) return;

    seats[PLAYER_SEAT].folded = true;
    seats[PLAYER_SEAT].lastAction = 'Fold';
    stats.folds++;
    msg('You fold.', 'system');
    advanceAction();
  }

  function playerCheck() {
    if (actingSeat !== PLAYER_SEAT) return;
    if (seats[PLAYER_SEAT].bet < currentBet) return; // can't check, must call

    seats[PLAYER_SEAT].lastAction = 'Check';
    advanceAction();
  }

  function playerCall() {
    if (actingSeat !== PLAYER_SEAT) return;
    var s = seats[PLAYER_SEAT];
    var toCall = currentBet - s.bet;
    if (toCall <= 0) return;

    var actual = Math.min(toCall, s.chips);
    s.chips -= actual;
    s.bet += actual;
    pot += actual;
    if (s.chips === 0) s.allIn = true;
    s.lastAction = s.allIn ? 'All-in' : 'Call';
    msg('You call ' + actual + ' GP.', 'system');
    advanceAction();
  }

  function playerRaise(amount) {
    if (actingSeat !== PLAYER_SEAT) return;
    var s = seats[PLAYER_SEAT];
    var totalBet = amount; // total bet this round
    var toAdd = totalBet - s.bet;
    if (toAdd <= 0) return;
    if (toAdd > s.chips) toAdd = s.chips;
    totalBet = s.bet + toAdd;

    var raiseBy = totalBet - currentBet;
    if (raiseBy > 0 && raiseBy < minRaise && toAdd < s.chips) return; // raise too small (unless all-in)

    s.chips -= toAdd;
    s.bet = totalBet;
    pot += toAdd;
    if (raiseBy > minRaise) minRaise = raiseBy;
    currentBet = totalBet;
    lastRaiser = PLAYER_SEAT;
    if (s.chips === 0) s.allIn = true;
    s.lastAction = s.allIn ? 'All-in' : 'Raise ' + totalBet;
    msg('You raise to ' + totalBet + ' GP.', 'system');
    advanceAction();
  }

  function playerAllIn() {
    if (actingSeat !== PLAYER_SEAT) return;
    var s = seats[PLAYER_SEAT];
    var totalBet = s.bet + s.chips;
    playerRaise(totalBet);
  }

  function advanceAction() {
    var next = nextActiveSeat(actingSeat);
    actingSeat = next;
    statusText = '';
    checkActingSeat();
  }

  // ── AI Decision Making ────────────────────────────
  function aiAct(seat) {
    var s = seats[seat];
    var prof = s.profile;
    var toCall = currentBet - s.bet;

    // Calculate hand strength
    var strength = getHandStrength(seat);

    // Personality-adjusted thresholds
    var foldThresh = prof.pfr;       // Below this = fold (tight players fold more)
    var raiseThresh = 1 - prof.agg;  // Above this = raise

    // Pot odds consideration
    var potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

    var action;
    if (toCall === 0) {
      // Can check or raise
      if (strength > raiseThresh && Math.random() < prof.agg) {
        action = 'raise';
      } else {
        action = 'check';
      }
    } else {
      // Must call, raise, or fold
      if (strength < foldThresh && strength < potOdds) {
        action = 'fold';
      } else if (strength > raiseThresh && Math.random() < prof.agg) {
        action = 'raise';
      } else if (strength > potOdds * 0.7 || strength > 0.3) {
        action = 'call';
      } else {
        action = 'fold';
      }
    }

    // Execute action
    if (action === 'fold') {
      s.folded = true;
      s.lastAction = 'Fold';
      chatMsg(s.name + ' folds.', 'npc');
    } else if (action === 'check') {
      s.lastAction = 'Check';
    } else if (action === 'call') {
      var actual = Math.min(toCall, s.chips);
      s.chips -= actual;
      s.bet += actual;
      pot += actual;
      if (s.chips === 0) s.allIn = true;
      s.lastAction = s.allIn ? 'All-in' : 'Call';
      chatMsg(s.name + ' calls ' + actual + '.', 'npc');
    } else if (action === 'raise') {
      // Raise sizing: 2-3x current bet, or random portion of chips
      var raiseSize = currentBet + minRaise;
      var maxRaise = s.bet + s.chips;
      var mult = 2 + Math.random() * (prof.agg * 2);
      raiseSize = Math.max(raiseSize, Math.floor(currentBet * mult));
      raiseSize = Math.min(raiseSize, maxRaise);

      var toAdd = raiseSize - s.bet;
      if (toAdd > s.chips) toAdd = s.chips;
      raiseSize = s.bet + toAdd;

      s.chips -= toAdd;
      s.bet = raiseSize;
      pot += toAdd;
      if (raiseSize - currentBet > minRaise) minRaise = raiseSize - currentBet;
      currentBet = raiseSize;
      lastRaiser = seat;
      if (s.chips === 0) s.allIn = true;
      s.lastAction = s.allIn ? 'All-in' : 'Raise ' + raiseSize;
      chatMsg(s.name + ' raises to ' + raiseSize + '.', 'npc');
    }

    advanceAction();
  }

  function getHandStrength(seat) {
    var hole = seats[seat].hole;
    if (hole.length < 2) return 0.5;

    if (community.length === 0) {
      // Preflop: rank hole cards
      return preflopStrength(hole);
    }

    // Postflop: evaluate actual hand
    var allCards = hole.concat(community);
    var hand = Cards.evaluateHand(allCards);
    // Normalize: rank dominates (0.85 weight) so pairs always beat high cards
    var base = hand.rank / 9;
    var kicker = hand.value[0] / 14;
    return Math.min(1, base * 0.85 + kicker * 0.1 + 0.05 + (Math.random() * 0.06 - 0.03));
  }

  function preflopStrength(hole) {
    var r1 = Cards.RANK_VALUES[hole[0].rank];
    var r2 = Cards.RANK_VALUES[hole[1].rank];
    var suited = hole[0].suit.name === hole[1].suit.name;
    var hi = Math.max(r1, r2);
    var lo = Math.min(r1, r2);
    var gap = hi - lo;
    var paired = r1 === r2;

    var str = 0;
    if (paired) {
      str = 0.5 + (hi / 14) * 0.5; // Pairs: 0.5-1.0 (22=~0.57, AA=1.0)
    } else {
      str = (hi + lo) / 28; // Base from card values
      if (suited) str += 0.06;
      if (gap <= 1) str += 0.04; // Connected
      if (gap >= 4) str -= 0.05; // Gappy
    }
    return Math.max(0, Math.min(1, str + (Math.random() * 0.08 - 0.04)));
  }

  // ── Betting Round Transition ──────────────────────
  function endBettingRound() {
    // Collect bets into pot (already done incrementally)
    // Reset bets for next round
    for (var i = 0; i < NUM_SEATS; i++) {
      seats[i].bet = 0;
      // Preserve fold/all-in labels so they stay visible across streets
      if (!seats[i].folded && !seats[i].allIn) seats[i].lastAction = '';
    }
    currentBet = 0;
    minRaise = TIERS[currentTier][2];

    if (activePlayers() <= 1) {
      awardPotToLastStanding();
      return;
    }

    // Check if only all-in players remain (no more betting possible)
    var canAct = activeNonAllIn();

    if (phase === 'preflop') {
      dealCommunity(3, 'flop');
    } else if (phase === 'flop') {
      dealCommunity(1, 'turn');
    } else if (phase === 'turn') {
      dealCommunity(1, 'river');
    } else if (phase === 'river') {
      beginShowdown();
    }
  }

  function dealCommunity(count, nextPhase) {
    var dealPhase = nextPhase + '-deal';
    phase = dealPhase;
    roundName = '';
    statusText = 'Dealing ' + nextPhase + '...';

    for (var i = 0; i < count; i++) {
      queueAction(function () {
        community.push(draw1());
      }, COMMUNITY_DEAL_DELAY);
    }

    queueAction(function () {
      phase = nextPhase;
      roundName = nextPhase.charAt(0).toUpperCase() + nextPhase.slice(1);
      statusText = '';

      // If nobody can act (all all-in or only 1 non-folded), skip to next
      if (activeNonAllIn() < 2) {
        endBettingRound();
        return;
      }

      // First to act postflop: first active after dealer
      actingSeat = nextActiveSeat(dealerSeat);
      lastRaiser = -1;
      checkActingSeat();
    }, 300);
  }

  // ── Pot Award ─────────────────────────────────────
  function awardPotToLastStanding() {
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].folded) {
        seats[i].chips += pot;
        if (i === PLAYER_SEAT) {
          msg('Everyone folds — you win ' + pot + ' GP!', 'reward');
          stats.wins++;
        } else {
          chatMsg(seats[i].name + ' wins ' + pot + ' GP (everyone folded).', 'npc');
        }
        winnerSeats = [i];
        break;
      }
    }
    pot = 0;
    stats.hands++;
    saveStats();
    phase = 'settled';
    statusText = '';
  }

  function beginShowdown() {
    phase = 'showdown';
    statusText = 'Showdown!';
    showdownTimer = 0;
    showdownResults = [];
    winnerSeats = [];

    // Evaluate all non-folded hands
    var contenders = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (!seats[i].active || seats[i].folded) continue;
      var allCards = seats[i].hole.concat(community);
      var hand = Cards.evaluateHand(allCards);
      showdownResults.push({ seat: i, hand: hand, handName: hand.name });
      contenders.push({ seat: i, hand: hand });
    }

    // Find winner(s)
    if (contenders.length === 0) {
      phase = 'settled';
      return;
    }

    contenders.sort(function (a, b) { return Cards.compareHands(b.hand, a.hand); });
    winnerSeats = [contenders[0].seat];

    // Check for ties
    for (var t = 1; t < contenders.length; t++) {
      if (Cards.compareHands(contenders[t].hand, contenders[0].hand) === 0) {
        winnerSeats.push(contenders[t].seat);
      } else {
        break;
      }
    }

    // Award pot
    var share = Math.floor(pot / winnerSeats.length);
    var remainder = pot - share * winnerSeats.length;
    for (var w = 0; w < winnerSeats.length; w++) {
      seats[winnerSeats[w]].chips += share;
      if (w === 0) seats[winnerSeats[w]].chips += remainder; // first winner gets remainder
    }

    // Messages
    for (var m = 0; m < winnerSeats.length; m++) {
      var ws = winnerSeats[m];
      var handName = '';
      for (var r = 0; r < showdownResults.length; r++) {
        if (showdownResults[r].seat === ws) { handName = showdownResults[r].handName; break; }
      }
      if (ws === PLAYER_SEAT) {
        msg('You win ' + share + ' GP with ' + handName + '!', 'reward');
        stats.wins++;
      } else {
        chatMsg(seats[ws].name + ' wins ' + share + ' GP with ' + handName + '.', 'npc');
      }
    }

    pot = 0;
    stats.hands++;
    saveStats();

    // Auto-advance after delay
    queueAction(function () {
      phase = 'settled';
      statusText = '';
    }, 3000);
  }


  // ── Button Definitions ────────────────────────────
  function getButtons() {
    var btns = [];
    var btnW = 95, btnH = 30;
    var cx = CW / 2;
    var y = 610;
    var gap = 10;

    if (phase === 'buy-in') {
      // Tier selection
      var tierBtnW = 120;
      var tierGap = 8;
      var perRow = 3;
      var totalRows = Math.ceil(TIERS.length / perRow);
      var tierStartY = 360;

      for (var ti = 0; ti < TIERS.length; ti++) {
        var col = ti % perRow;
        var row = Math.floor(ti / perRow);
        var bx = cx - (perRow * tierBtnW + (perRow - 1) * tierGap) / 2 + col * (tierBtnW + tierGap);
        var by = tierStartY + row * (btnH + tierGap);
        var canAfford = getBalance() >= TIERS[ti][0];
        btns.push({
          x: bx, y: by, w: tierBtnW, h: btnH,
          label: TIERS[ti][0] + ' GP',
          action: 'buy-' + ti,
          disabled: !canAfford
        });
      }
      return btns;
    }

    if (phase === 'settled') {
      // Count players with chips (ignore folded flag from last hand)
      var withChips = 0;
      for (var sc = 0; sc < NUM_SEATS; sc++) {
        if (seats[sc] && seats[sc].active && seats[sc].chips > 0) withChips++;
      }
      var canContinue = seats[PLAYER_SEAT].chips > 0 && withChips >= 2;
      btns.push({ x: cx - 120, y: y, w: 110, h: btnH, label: 'NEXT HAND', action: 'next-hand', disabled: !canContinue });
      btns.push({ x: cx + 10, y: y, w: 110, h: btnH, label: 'CASH OUT', action: 'cash-out', disabled: false });
      return btns;
    }

    // Player action buttons during betting rounds
    if (actingSeat !== PLAYER_SEAT) return btns;
    if (phase !== 'preflop' && phase !== 'flop' && phase !== 'turn' && phase !== 'river') return btns;

    var s = seats[PLAYER_SEAT];
    var toCall = currentBet - s.bet;

    // Fold
    btns.push({ x: cx - 250, y: y, w: btnW, h: btnH, label: 'FOLD', action: 'fold', disabled: false });

    if (toCall <= 0) {
      // Check
      btns.push({ x: cx - 145, y: y, w: btnW, h: btnH, label: 'CHECK', action: 'check', disabled: false });
    } else {
      // Call
      var callAmt = Math.min(toCall, s.chips);
      btns.push({ x: cx - 145, y: y, w: btnW, h: btnH, label: 'CALL ' + callAmt, action: 'call', disabled: false });
    }

    // Raise (only if player has chips to raise)
    var minRaiseTotal = currentBet + minRaise;
    if (s.chips + s.bet > currentBet && s.chips > toCall) {
      // Raise - / + and amount
      btns.push({ x: cx - 40, y: y, w: 60, h: btnH, label: '-', action: 'raise-down', disabled: raiseAmount <= minRaiseTotal });
      btns.push({ x: cx + 25, y: y, w: btnW, h: btnH, label: 'RAISE ' + raiseAmount, action: 'raise', disabled: false });
      btns.push({ x: cx + 125, y: y, w: 60, h: btnH, label: '+', action: 'raise-up', disabled: raiseAmount >= s.chips + s.bet });
    }

    // All-in
    if (s.chips > 0) {
      btns.push({ x: cx + 195, y: y, w: btnW, h: btnH, label: 'ALL IN', action: 'all-in', disabled: false });
    }

    return btns;
  }

  // ── Rendering ─────────────────────────────────────

  function drawBackground(c) {
    // Dark room
    c.fillStyle = '#0c1a0c';
    c.fillRect(0, 0, CW, CH);

    // Table felt (oval)
    c.save();
    c.beginPath();
    c.ellipse(CW / 2, CH / 2 - 10, 400, 230, 0, 0, Math.PI * 2);
    c.fillStyle = '#1a4a2a';
    c.fill();
    c.strokeStyle = '#8b6914';
    c.lineWidth = 8;
    c.stroke();
    c.restore();

    // Inner rim
    c.save();
    c.beginPath();
    c.ellipse(CW / 2, CH / 2 - 10, 390, 220, 0, 0, Math.PI * 2);
    c.strokeStyle = '#6b4c10';
    c.lineWidth = 2;
    c.stroke();
    c.restore();

    // Felt texture (radial)
    var grad = c.createRadialGradient(CW / 2, CH / 2 - 10, 0, CW / 2, CH / 2 - 10, 400);
    grad.addColorStop(0, 'rgba(30,90,50,0.2)');
    grad.addColorStop(1, 'rgba(15,40,20,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.ellipse(CW / 2, CH / 2 - 10, 390, 220, 0, 0, Math.PI * 2);
    c.fill();
  }

  function drawSeats(c) {
    for (var i = 0; i < NUM_SEATS; i++) {
      var s = seats[i];
      if (!s) continue;
      var pos = SEAT_POS[i];

      // Seat background
      var isActing = (actingSeat === i && phase !== 'settled' && phase !== 'showdown' && phase !== 'buy-in');
      var isWinner = winnerSeats.indexOf(i) >= 0 && (phase === 'showdown' || phase === 'settled');
      var isFolded = s.folded;

      c.save();
      roundRect(c, pos.x - 55, pos.y - 18, 110, 52, 6);
      if (!s.active) {
        c.fillStyle = 'rgba(20,20,20,0.5)';
      } else if (isWinner) {
        c.fillStyle = 'rgba(40,60,20,0.9)';
      } else if (isActing) {
        c.fillStyle = 'rgba(60,40,10,0.9)';
      } else if (isFolded) {
        c.fillStyle = 'rgba(30,20,20,0.7)';
      } else {
        c.fillStyle = 'rgba(0,0,0,0.7)';
      }
      c.fill();

      // Border
      c.strokeStyle = isActing ? '#ffd700' : (isWinner ? '#44cc44' : '#6a5a3a');
      c.lineWidth = isActing ? 2 : 1;
      roundRect(c, pos.x - 55, pos.y - 18, 110, 52, 6);
      c.stroke();
      c.restore();

      if (!s.active) {
        c.font = '10px monospace';
        c.fillStyle = '#4a4a4a';
        c.textAlign = 'center';
        c.fillText('Empty', pos.x, pos.y + 8);
        c.textAlign = 'left';
        continue;
      }

      // Name
      c.font = 'bold 11px monospace';
      c.textAlign = 'center';
      c.fillStyle = i === PLAYER_SEAT ? '#e0c860' : (isFolded ? '#6a5a3a' : '#d0c0a0');
      c.fillText(s.name, pos.x, pos.y - 4);

      // Chips
      c.font = '10px monospace';
      c.fillStyle = isFolded ? '#5a4a3a' : '#c0a040';
      c.fillText(s.chips + ' GP', pos.x, pos.y + 10);

      // Last action
      if (s.lastAction) {
        c.font = '9px monospace';
        c.fillStyle = s.lastAction === 'Fold' ? '#cc4444' : (s.lastAction.indexOf('Raise') >= 0 ? '#44cc44' : '#aaa');
        c.fillText(s.lastAction, pos.x, pos.y + 24);
      }

      // Dealer button
      if (i === dealerSeat) {
        c.beginPath();
        c.arc(pos.x + 50, pos.y - 12, 8, 0, Math.PI * 2);
        c.fillStyle = '#ffd700';
        c.fill();
        c.font = 'bold 8px monospace';
        c.fillStyle = '#000';
        c.fillText('D', pos.x + 50, pos.y - 9);
      }

      c.textAlign = 'left';
    }
  }

  function drawHoleCards(c) {
    for (var i = 0; i < NUM_SEATS; i++) {
      var s = seats[i];
      if (!s || !s.active || s.hole.length === 0) continue;
      var pos = SEAT_POS[i];

      // Position hole cards relative to seat
      var cardY = pos.y - 83;
      if (i === 0) cardY = pos.y - 93; // player cards a bit higher
      if (i === 3) cardY = pos.y + 40; // top center: below seat
      var cardX = pos.x - CARD_W - 2;

      var showCards = (i === PLAYER_SEAT) || (phase === 'showdown' && !s.folded);

      for (var ci = 0; ci < s.hole.length; ci++) {
        var cx2 = cardX + ci * (CARD_W + 4);
        Cards.renderCard(c, cx2, cardY, s.hole[ci], showCards, CARD_SCALE);
      }
    }
  }

  function drawCommunity(c) {
    if (community.length === 0 && phase !== 'buy-in') {
      // Empty slots
      var slotX = CW / 2 - (5 * (CARD_W + 6)) / 2;
      for (var si = 0; si < 5; si++) {
        Cards.renderCardSlot(c, slotX + si * (CARD_W + 6), CH / 2 - CARD_H / 2 - 15, CARD_SCALE);
      }
      return;
    }

    var startX = CW / 2 - (community.length * (CARD_W + 6)) / 2;
    var cy = CH / 2 - CARD_H / 2 - 15;
    for (var i = 0; i < community.length; i++) {
      Cards.renderCard(c, startX + i * (CARD_W + 6), cy, community[i], true, CARD_SCALE);
    }
  }

  function drawPot(c) {
    if (pot <= 0 && phase === 'buy-in') return;

    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('Pot: ' + pot + ' GP', CW / 2, CH / 2 - CARD_H / 2 - 30);
    c.textAlign = 'left';
  }

  function drawHUD(c) {
    // Title
    c.font = 'bold 18px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText("NO LIMIT HOLD'EM", CW / 2, 28);

    // Balance
    c.font = 'bold 14px monospace';
    c.textAlign = 'right';
    c.fillStyle = '#e0c860';
    c.fillText(getBalance() + ' GP (wallet)', CW - 40, 28);

    // Blinds / round info
    if (phase !== 'buy-in') {
      var tier = TIERS[currentTier];
      c.font = '10px monospace';
      c.fillStyle = '#8a7a5a';
      c.fillText('Blinds: ' + tier[1] + '/' + tier[2] + '  H:' + stats.hands + ' W:' + stats.wins, CW - 40, 44);
    }

    // Round name
    if (roundName) {
      c.font = 'bold 12px monospace';
      c.textAlign = 'center';
      c.fillStyle = '#c0a040';
      c.fillText(roundName, CW / 2, 50);
    }

    c.textAlign = 'left';
  }

  function drawBuyInScreen(c) {
    if (phase !== 'buy-in') return;

    c.font = 'bold 22px serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('Choose Your Buy-In', CW / 2, 280);

    c.font = '12px monospace';
    c.fillStyle = '#c0a040';
    c.fillText('Higher buy-in = higher blinds = bigger pots', CW / 2, 305);
    c.fillText('You play against 5 AI opponents', CW / 2, 322);
    c.textAlign = 'left';
  }

  function drawShowdownInfo(c) {
    if (phase !== 'showdown' && phase !== 'settled') return;
    if (showdownResults.length === 0) return;

    // Draw hand names next to each seat
    for (var i = 0; i < showdownResults.length; i++) {
      var sr = showdownResults[i];
      var pos = SEAT_POS[sr.seat];
      var isW = winnerSeats.indexOf(sr.seat) >= 0;

      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.fillStyle = isW ? '#ffd700' : '#8a7a5a';
      c.fillText(sr.handName, pos.x, pos.y + 38);
      c.textAlign = 'left';
    }
  }

  function drawStatusText(c) {
    if (!statusText) return;
    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#e0d0a0';
    c.fillText(statusText, CW / 2, 590);
    c.textAlign = 'left';
  }

  function drawActionButtons(c) {
    var btns = getButtons();
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      Cards.renderButton(c, b.x, b.y, b.w, b.h, b.label, { disabled: b.disabled });
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function render() {
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);

    drawBackground(ctx);
    if (phase !== 'buy-in') {
      drawSeats(ctx);
      drawHoleCards(ctx);
      drawCommunity(ctx);
      drawPot(ctx);
      drawShowdownInfo(ctx);
    }
    drawHUD(ctx);
    drawBuyInScreen(ctx);
    drawStatusText(ctx);
    drawActionButtons(ctx);
    Cards.renderBackButton(ctx, phase === 'buy-in' ? 'Leave Table' : 'Cash Out');

    ctx.restore();
  }

  // ── Click Handler ─────────────────────────────────
  function onClick(e) {
    if (!canvas) return;
    if (actionQueue.length > 0) return;

    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (CW / rect.width);
    var cy = (e.clientY - rect.top) * (CH / rect.height);

    // Back button
    if (cx < 200 && cy < 70) {
      cashOut();
      return;
    }

    // Action buttons
    var btns = getButtons();
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.disabled || !b.action) continue;
      if (Cards.hitTest(cx, cy, b.x, b.y, b.w, b.h)) {
        handleAction(b.action);
        return;
      }
    }
  }

  function handleAction(action) {
    if (action.indexOf('buy-') === 0) {
      var tierIdx = parseInt(action.substring(4), 10);
      buyIn(tierIdx);
      return;
    }

    switch (action) {
      case 'fold': playerFold(); break;
      case 'check': playerCheck(); break;
      case 'call': playerCall(); break;
      case 'raise': playerRaise(raiseAmount); break;
      case 'all-in': playerAllIn(); break;
      case 'raise-up':
        var tier = TIERS[currentTier];
        raiseAmount = Math.min(raiseAmount + tier[2], seats[PLAYER_SEAT].chips + seats[PLAYER_SEAT].bet);
        break;
      case 'raise-down':
        var tier2 = TIERS[currentTier];
        raiseAmount = Math.max(raiseAmount - tier2[2], currentBet + minRaise);
        break;
      case 'next-hand': startHand(); break;
      case 'cash-out': cashOut(); break;
    }
  }

  // ── Buy-In / Cash Out ─────────────────────────────
  function buyIn(tierIdx) {
    currentTier = tierIdx;
    var tier = TIERS[tierIdx];
    if (getBalance() < tier[0]) {
      statusText = 'Not enough GP!';
      return;
    }

    walletDeduct(tier[0]);
    msg('Bought in for ' + tier[0] + ' GP. Blinds: ' + tier[1] + '/' + tier[2] + '.', 'system');
    initSeats();
    startHand();
  }

  function cashOut() {
    queueClear();
    if (phase !== 'buy-in' && seats[PLAYER_SEAT]) {
      // Return remaining chips + any bet in the current pot
      var chips = seats[PLAYER_SEAT].chips + seats[PLAYER_SEAT].bet;
      if (chips > 0) {
        walletAdd(chips);
        msg('Cashed out ' + chips + ' GP from Hold\'em.', 'reward');
      } else {
        msg('Left Hold\'em table.', 'system');
      }
    }
    leave();
  }

  // ── Animation Loop ────────────────────────────────
  function loop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;
    frameCount++;

    processQueue(dt);

    if (phase === 'showdown') {
      showdownTimer += dt;
    }

    render();
    animId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (animId) return;
    lastTimestamp = 0;
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  // ── Enter / Leave ─────────────────────────────────
  function enter(canvasEl, bridgeAPI) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    bridge = bridgeAPI;

    phase = 'buy-in';
    statusText = '';
    seats = [];
    community = [];
    pot = 0;
    queueClear();
    frameCount = 0;
    lastTimestamp = 0;
    showdownResults = [];
    winnerSeats = [];

    loadStats();

    canvas.removeEventListener('click', onClick); // prevent duplicates
    canvas.addEventListener('click', onClick);
    startLoop();
  }

  function leave() {
    queueClear();
    stopLoop();
    if (canvas) canvas.removeEventListener('click', onClick);
    if (bridge && bridge.onLeave) bridge.onLeave();
  }

  function handleEscape() {
    cashOut();
    return true;
  }

  function isActive() {
    return !!animId;
  }

  // ── Public API ────────────────────────────────────
  window.RpgHoldem = {
    enter: enter,
    leave: leave,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
