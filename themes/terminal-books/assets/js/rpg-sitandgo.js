/* ══════════════════════════════════════════════════
   RPG SIT & GO — Canvas-based 6-player tournament.
   Escalating blinds, last player standing wins.
   Top 2 paid: 1st = 70%, 2nd = 30%.
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
  var AI_THINK_MIN = 350;
  var AI_THINK_MAX = 1000;
  var COMMUNITY_DEAL_DELAY = 250;
  var STARTING_CHIPS = 1500;
  var HANDS_PER_LEVEL = 6; // blinds increase every N hands

  // Buy-in options (entry fee → prize pool)
  var BUY_INS = [50, 100, 250, 500, 1000, 2500];

  // Blind levels: [smallBlind, bigBlind]
  var BLIND_LEVELS = [
    [10,   20],
    [15,   30],
    [25,   50],
    [50,  100],
    [75,  150],
    [100, 200],
    [150, 300],
    [200, 400],
    [300, 600],
    [500, 1000]
  ];

  // Prize structure: top 2 of 6 paid
  var PRIZES = [0.70, 0.30]; // 1st, 2nd

  // Seat positions (same oval as Hold'em)
  var SEAT_POS = [
    { x: 530, y: 535 },
    { x: 170, y: 430 },
    { x: 140, y: 200 },
    { x: 530, y: 115 },
    { x: 920, y: 200 },
    { x: 890, y: 430 }
  ];

  // AI profiles — different names from cash game
  var AI_PROFILES = [
    { name: 'Duke',    pfr: 0.15, agg: 0.35 },
    { name: 'Pearl',   pfr: 0.38, agg: 0.65 },
    { name: 'Stone',   pfr: 0.20, agg: 0.55 },
    { name: 'Bess',    pfr: 0.32, agg: 0.25 },
    { name: 'Viper',   pfr: 0.45, agg: 0.75 }
  ];

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null;
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;

  var actionQueue = [];
  var actionTimer = 0;

  // Tournament state
  var deck = [];
  var community = [];
  var pot = 0;
  var dealerSeat = 0;
  var buyInAmount = 0;
  var prizePool = 0;
  var blindLevel = 0;
  var handsAtLevel = 0;
  var handNumber = 0;
  var elimOrder = [];    // seats eliminated in order (first eliminated = last entry)
  var finished = false;  // tournament complete
  var playerFinish = 0;  // player's finishing position (1-6), 0 if still playing
  var playerPrize = 0;

  // Seat data: { active, eliminated, folded, allIn, chips, hole, bet, name, ai, profile, lastAction }
  var seats = [];

  // Betting round
  // phase: buy-in | dealing | preflop | flop-deal | flop | turn-deal | turn | river-deal | river | showdown | between-hands | finished
  var phase = 'buy-in';
  var actingSeat = -1;
  var currentBet = 0;
  var minRaise = 0;
  var statusText = '';
  var roundName = '';

  var raiseAmount = 0;

  // Showdown
  var showdownResults = [];
  var winnerSeats = [];
  var showdownTimer = 0;

  // Stats
  var stats = { tournaments: 0, wins: 0, cashes: 0, bestFinish: 0 };
  var STATS_KEY = 'arebooksgood-casino-sng-stats';

  // ── Helpers ───────────────────────────────────────
  function getBalance() { return window.Wallet ? window.Wallet.getBalance() : 0; }
  function walletAdd(n) { if (window.Wallet) window.Wallet.add(n); }
  function walletDeduct(n) { if (window.Wallet) window.Wallet.deduct(n); }
  function msg(text, type) { if (bridge && bridge.addMessage) bridge.addMessage(text, type || 'system'); }
  function chatMsg(text, type) {
    if (bridge && bridge.addChatMessage) bridge.addChatMessage(text, type || 'npc');
    else msg(text, type);
  }

  // ── Action Queue ──────────────────────────────────
  function queueAction(fn, delay) { actionQueue.push({ fn: fn, delay: delay || 0 }); }
  function processQueue(dt) {
    if (actionQueue.length === 0) return;
    actionTimer += dt * 1000;
    if (actionTimer >= actionQueue[0].delay) {
      var action = actionQueue.shift();
      actionTimer = 0;
      action.fn();
    }
  }
  function queueClear() { actionQueue = []; actionTimer = 0; }

  // ── Stats ─────────────────────────────────────────
  function loadStats() {
    try {
      var saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        var p = JSON.parse(saved);
        stats.tournaments = p.tournaments || 0;
        stats.wins = p.wins || 0;
        stats.cashes = p.cashes || 0;
        stats.bestFinish = p.bestFinish || 0;
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

  // ── Seat Helpers ──────────────────────────────────
  function alivePlayers() {
    var c = 0;
    for (var i = 0; i < NUM_SEATS; i++) if (seats[i].active && !seats[i].eliminated) c++;
    return c;
  }

  function activePlayers() {
    var c = 0;
    for (var i = 0; i < NUM_SEATS; i++) if (seats[i].active && !seats[i].eliminated && !seats[i].folded) c++;
    return c;
  }

  function activeNonAllIn() {
    var c = 0;
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated && !seats[i].folded && !seats[i].allIn) c++;
    }
    return c;
  }

  function nextActiveSeat(from) {
    for (var i = 1; i <= NUM_SEATS; i++) {
      var s = (from + i) % NUM_SEATS;
      if (seats[s].active && !seats[s].eliminated && !seats[s].folded && !seats[s].allIn) return s;
    }
    return -1;
  }

  function nextAliveSeat(from) {
    for (var i = 1; i <= NUM_SEATS; i++) {
      var s = (from + i) % NUM_SEATS;
      if (seats[s].active && !seats[s].eliminated) return s;
    }
    return -1;
  }

  // ── Tournament Setup ──────────────────────────────
  function initSeats() {
    seats = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (i === PLAYER_SEAT) {
        seats.push({
          active: true, eliminated: false, folded: false, allIn: false,
          chips: STARTING_CHIPS, hole: [], bet: 0,
          name: 'You', ai: false, profile: null, lastAction: ''
        });
      } else {
        var prof = AI_PROFILES[i - 1];
        seats.push({
          active: true, eliminated: false, folded: false, allIn: false,
          chips: STARTING_CHIPS, hole: [], bet: 0,
          name: prof.name, ai: true, profile: prof, lastAction: ''
        });
      }
    }
  }

  function getBlinds() {
    var lvl = Math.min(blindLevel, BLIND_LEVELS.length - 1);
    return BLIND_LEVELS[lvl];
  }

  // ── Hand Start ────────────────────────────────────
  function startHand() {
    freshDeck();
    community = [];
    pot = 0;
    currentBet = 0;
    showdownResults = [];
    winnerSeats = [];
    showdownTimer = 0;
    handNumber++;
    handsAtLevel++;

    // Blind escalation
    if (handsAtLevel > HANDS_PER_LEVEL) {
      blindLevel++;
      handsAtLevel = 1;
      var bl = getBlinds();
      msg('Blinds increase to ' + bl[0] + '/' + bl[1] + '!', 'system');
    }

    var blinds = getBlinds();
    minRaise = blinds[1];

    // Reset seats
    for (var i = 0; i < NUM_SEATS; i++) {
      seats[i].folded = false;
      seats[i].allIn = false;
      seats[i].hole = [];
      seats[i].bet = 0;
      seats[i].lastAction = '';
    }

    // Check eliminations from previous hand
    for (var ei = 0; ei < NUM_SEATS; ei++) {
      if (seats[ei].active && !seats[ei].eliminated && seats[ei].chips <= 0) {
        eliminatePlayer(ei);
      }
    }

    // Tournament over?
    if (alivePlayers() <= 1) {
      finishTournament();
      return;
    }

    // Player eliminated?
    if (seats[PLAYER_SEAT].eliminated) {
      // Auto-play remaining hands until tournament ends
      autoFinish();
      return;
    }

    // Advance dealer to next alive seat
    dealerSeat = nextAliveSeat(dealerSeat);
    if (dealerSeat === -1) dealerSeat = 0;

    phase = 'dealing';
    statusText = 'Hand #' + handNumber;
    roundName = '';

    // Post blinds (heads-up: dealer posts SB)
    var sb, bb;
    if (alivePlayers() === 2) {
      sb = dealerSeat;
      bb = nextAliveSeat(dealerSeat);
    } else {
      sb = nextAliveSeat(dealerSeat);
      bb = nextAliveSeat(sb);
    }
    postBlind(sb, blinds[0]);
    postBlind(bb, blinds[1]);
    currentBet = blinds[1];
    minRaise = blinds[1];

    // Deal hole cards
    for (var round = 0; round < 2; round++) {
      for (var si = 0; si < NUM_SEATS; si++) {
        var seat = (bb + 1 + si) % NUM_SEATS;
        if (!seats[seat].active || seats[seat].eliminated) continue;
        (function (s) {
          queueAction(function () { seats[s].hole.push(draw1()); }, DEAL_DELAY);
        })(seat);
      }
    }

    var bbSeat = bb;
    queueAction(function () {
      phase = 'preflop';
      roundName = 'Pre-flop';
      for (var ci = 0; ci < NUM_SEATS; ci++) seats[ci].lastAction = '';
      actingSeat = nextActiveSeat(bbSeat);
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
    var blinds = getBlinds();
    s.lastAction = actual < amount ? 'All-in' : (amount === blinds[0] ? 'SB' : 'BB');
  }

  function eliminatePlayer(seat) {
    seats[seat].eliminated = true;
    seats[seat].chips = 0;
    elimOrder.push(seat);
    var position = NUM_SEATS - elimOrder.length + 1; // e.g., first eliminated in 6-player = 6th place
    if (seat === PLAYER_SEAT) {
      playerFinish = position;
      msg('You finished in ' + ordinal(position) + ' place.', 'system');
    } else {
      chatMsg(seats[seat].name + ' is eliminated (' + ordinal(position) + ').', 'npc');
    }
  }

  function ordinal(n) {
    var s = ['th','st','nd','rd'];
    var v = n % 100;
    return n + (s[(v-20)%10]||s[v]||s[0]);
  }

  // ── Betting Logic (same as Hold'em) ───────────────
  function isRoundComplete() {
    for (var i = 0; i < NUM_SEATS; i++) {
      var s = seats[i];
      if (!s.active || s.eliminated || s.folded || s.allIn) continue;
      if (!s.lastAction) return false;
      if (s.bet < currentBet) return false;
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

    var s = seats[actingSeat];
    if (!s.active || s.eliminated || s.folded || s.allIn) {
      var next = nextActiveSeat(actingSeat);
      if (next === -1 || isRoundComplete()) {
        endBettingRound();
        return;
      }
      actingSeat = next;
      checkActingSeat();
      return;
    }

    if (isRoundComplete()) {
      endBettingRound();
      return;
    }

    if (s.ai) {
      var thinkTime = AI_THINK_MIN + Math.random() * (AI_THINK_MAX - AI_THINK_MIN);
      queueAction(function () { aiAct(actingSeat); }, thinkTime);
    } else {
      raiseAmount = Math.max(currentBet + minRaise, currentBet * 2);
      if (raiseAmount > s.chips + s.bet) raiseAmount = s.chips + s.bet;
      statusText = 'Your turn';
    }
  }

  function playerFold() {
    if (actingSeat !== PLAYER_SEAT) return;
    if (phase !== 'preflop' && phase !== 'flop' && phase !== 'turn' && phase !== 'river') return;
    seats[PLAYER_SEAT].folded = true;
    seats[PLAYER_SEAT].lastAction = 'Fold';
    msg('You fold.', 'system');
    advanceAction();
  }

  function playerCheck() {
    if (actingSeat !== PLAYER_SEAT) return;
    if (seats[PLAYER_SEAT].bet < currentBet) return;
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
    msg('You call ' + actual + '.', 'system');
    advanceAction();
  }

  function playerRaise(amount) {
    if (actingSeat !== PLAYER_SEAT) return;
    var s = seats[PLAYER_SEAT];
    var totalBet = amount;
    var toAdd = totalBet - s.bet;
    if (toAdd <= 0) return;
    if (toAdd > s.chips) toAdd = s.chips;
    totalBet = s.bet + toAdd;

    var raiseBy = totalBet - currentBet;
    if (raiseBy > 0 && raiseBy < minRaise && toAdd < s.chips) return;

    s.chips -= toAdd;
    s.bet = totalBet;
    pot += toAdd;
    if (raiseBy > minRaise) minRaise = raiseBy;
    currentBet = totalBet;
    if (s.chips === 0) s.allIn = true;
    s.lastAction = s.allIn ? 'All-in' : 'Raise ' + totalBet;
    msg('You raise to ' + totalBet + '.', 'system');
    advanceAction();
  }

  function playerAllIn() {
    if (actingSeat !== PLAYER_SEAT) return;
    var s = seats[PLAYER_SEAT];
    playerRaise(s.bet + s.chips);
  }

  function advanceAction() {
    var next = nextActiveSeat(actingSeat);
    actingSeat = next;
    statusText = '';
    checkActingSeat();
  }

  // ── AI ────────────────────────────────────────────
  function aiAct(seat) {
    var s = seats[seat];
    var prof = s.profile;
    var toCall = currentBet - s.bet;
    var strength = getHandStrength(seat);

    // Tournament pressure: tighten up with short stack, loosen with big stack
    var avgStack = 0;
    var aliveCount = alivePlayers();
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated) avgStack += seats[i].chips;
    }
    avgStack = aliveCount > 0 ? avgStack / aliveCount : STARTING_CHIPS;
    var stackRatio = s.chips / Math.max(1, avgStack);
    var pressureAdj = stackRatio < 0.5 ? 0.1 : (stackRatio > 2 ? -0.08 : 0);

    var foldThresh = prof.pfr + pressureAdj;
    var raiseThresh = 1 - prof.agg;
    var potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

    // Near bubble (3 players left), tighten significantly unless big stack
    if (aliveCount <= 3 && stackRatio < 1.5) {
      foldThresh += 0.12;
    }

    var action;
    if (toCall === 0) {
      if (strength > raiseThresh && Math.random() < prof.agg) action = 'raise';
      else action = 'check';
    } else {
      if (strength < foldThresh && strength < potOdds) action = 'fold';
      else if (strength > raiseThresh && Math.random() < prof.agg) action = 'raise';
      else if (strength > potOdds * 0.7 || strength > 0.3) action = 'call';
      else action = 'fold';
    }

    // Short stack shove: if stack < 5x BB and decent hand, just shove
    var blinds = getBlinds();
    if (s.chips <= blinds[1] * 5 && strength > 0.35 && toCall > 0) {
      action = 'allin';
    }

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
    } else if (action === 'raise' || action === 'allin') {
      var raiseSize;
      if (action === 'allin') {
        raiseSize = s.bet + s.chips;
      } else {
        var mult = 2 + Math.random() * (prof.agg * 2);
        raiseSize = Math.max(currentBet + minRaise, Math.floor(currentBet * mult));
        raiseSize = Math.min(raiseSize, s.bet + s.chips);
      }
      var toAdd = raiseSize - s.bet;
      if (toAdd > s.chips) toAdd = s.chips;
      raiseSize = s.bet + toAdd;

      s.chips -= toAdd;
      s.bet = raiseSize;
      pot += toAdd;
      if (raiseSize - currentBet > minRaise) minRaise = raiseSize - currentBet;
      currentBet = raiseSize;
      if (s.chips === 0) s.allIn = true;
      s.lastAction = s.allIn ? 'All-in' : 'Raise ' + raiseSize;
      chatMsg(s.name + (s.allIn ? ' goes all-in!' : ' raises to ' + raiseSize + '.'), 'npc');
    }

    advanceAction();
  }

  function getHandStrength(seat) {
    var hole = seats[seat].hole;
    if (hole.length < 2) return 0.5;

    if (community.length === 0) return preflopStrength(hole);

    var allCards = hole.concat(community);
    var hand = Cards.evaluateHand(allCards);
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
      str = 0.5 + (hi / 14) * 0.5;
    } else {
      str = (hi + lo) / 28;
      if (suited) str += 0.06;
      if (gap <= 1) str += 0.04;
      if (gap >= 4) str -= 0.05;
    }
    return Math.max(0, Math.min(1, str + (Math.random() * 0.08 - 0.04)));
  }

  // ── Betting Round Transition ──────────────────────
  function endBettingRound() {
    for (var i = 0; i < NUM_SEATS; i++) {
      seats[i].bet = 0;
      if (!seats[i].folded && !seats[i].allIn) seats[i].lastAction = '';
    }
    currentBet = 0;
    minRaise = getBlinds()[1];

    if (activePlayers() <= 1) {
      awardPotToLastStanding();
      return;
    }

    if (phase === 'preflop') dealCommunity(3, 'flop');
    else if (phase === 'flop') dealCommunity(1, 'turn');
    else if (phase === 'turn') dealCommunity(1, 'river');
    else if (phase === 'river') beginShowdown();
  }

  function dealCommunity(count, nextPhase) {
    phase = nextPhase + '-deal';
    roundName = '';
    statusText = 'Dealing ' + nextPhase + '...';

    for (var i = 0; i < count; i++) {
      queueAction(function () { community.push(draw1()); }, COMMUNITY_DEAL_DELAY);
    }

    queueAction(function () {
      phase = nextPhase;
      roundName = nextPhase.charAt(0).toUpperCase() + nextPhase.slice(1);
      statusText = '';

      if (activeNonAllIn() < 2) {
        endBettingRound();
        return;
      }

      actingSeat = nextActiveSeat(dealerSeat);
      checkActingSeat();
    }, 300);
  }

  // ── Pot Award ─────────────────────────────────────
  function awardPotToLastStanding() {
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated && !seats[i].folded) {
        seats[i].chips += pot;
        if (i === PLAYER_SEAT) {
          msg('Everyone folds — you win ' + pot + '!', 'reward');
        } else {
          chatMsg(seats[i].name + ' wins ' + pot + ' (everyone folded).', 'npc');
        }
        winnerSeats = [i];
        break;
      }
    }
    pot = 0;
    phase = 'between-hands';
    queueAction(function () { startHand(); }, 1500);
  }

  function beginShowdown() {
    phase = 'showdown';
    statusText = 'Showdown!';
    showdownTimer = 0;
    showdownResults = [];
    winnerSeats = [];

    var contenders = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (!seats[i].active || seats[i].eliminated || seats[i].folded) continue;
      var allCards = seats[i].hole.concat(community);
      var hand = Cards.evaluateHand(allCards);
      showdownResults.push({ seat: i, hand: hand, handName: hand.name });
      contenders.push({ seat: i, hand: hand });
    }

    if (contenders.length === 0) {
      phase = 'between-hands';
      queueAction(function () { startHand(); }, 1500);
      return;
    }

    contenders.sort(function (a, b) { return Cards.compareHands(b.hand, a.hand); });
    winnerSeats = [contenders[0].seat];
    for (var t = 1; t < contenders.length; t++) {
      if (Cards.compareHands(contenders[t].hand, contenders[0].hand) === 0) {
        winnerSeats.push(contenders[t].seat);
      } else break;
    }

    var share = Math.floor(pot / winnerSeats.length);
    var remainder = pot - share * winnerSeats.length;
    for (var w = 0; w < winnerSeats.length; w++) {
      seats[winnerSeats[w]].chips += share;
      if (w === 0) seats[winnerSeats[w]].chips += remainder;
    }

    for (var m = 0; m < winnerSeats.length; m++) {
      var ws = winnerSeats[m];
      var handName = '';
      for (var r = 0; r < showdownResults.length; r++) {
        if (showdownResults[r].seat === ws) { handName = showdownResults[r].handName; break; }
      }
      if (ws === PLAYER_SEAT) {
        msg('You win ' + share + ' with ' + handName + '!', 'reward');
      } else {
        chatMsg(seats[ws].name + ' wins ' + share + ' with ' + handName + '.', 'npc');
      }
    }

    pot = 0;
    phase = 'between-hands';
    queueAction(function () { startHand(); }, 2500);
  }

  // ── Auto-finish (player eliminated, sim remaining) ─
  function autoFinish() {
    // Simulate remaining hands quickly
    statusText = 'Simulating...';

    var safety = 0;
    while (alivePlayers() > 1 && safety < 500) {
      safety++;
      simOneHand();
    }

    // Safety cap hit — force-eliminate remaining players by chip count (lowest first)
    while (alivePlayers() > 1) {
      var shortest = -1;
      for (var i = 0; i < NUM_SEATS; i++) {
        if (seats[i].active && !seats[i].eliminated) {
          if (shortest === -1 || seats[i].chips < seats[shortest].chips) shortest = i;
        }
      }
      if (shortest === -1) break;
      seats[shortest].chips = 0;
      eliminatePlayer(shortest);
    }

    finishTournament();
  }

  function simOneHand() {
    // Quick sim: random elimination of weakest stack with some randomness
    var alive = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated) alive.push(i);
    }
    if (alive.length <= 1) return;

    var blinds = getBlinds();
    handsAtLevel++;
    if (handsAtLevel > HANDS_PER_LEVEL) { blindLevel++; handsAtLevel = 1; }

    // Simulate: each player loses or gains some chips
    for (var ai = 0; ai < alive.length; ai++) {
      var s = seats[alive[ai]];
      var change = Math.floor((Math.random() - 0.45) * blinds[1] * 3);
      s.chips = Math.max(0, s.chips + change);
    }

    // Eliminate anyone at 0
    for (var ei = 0; ei < alive.length; ei++) {
      if (seats[alive[ei]].chips <= 0) {
        eliminatePlayer(alive[ei]);
      }
    }

    // Force elimination if nobody busted (give all chips to random winner eventually)
    if (alivePlayers() === alive.length && alive.length > 1) {
      // Find shortest stack
      var shortest = alive[0];
      for (var si = 1; si < alive.length; si++) {
        if (seats[alive[si]].chips < seats[shortest].chips) shortest = alive[si];
      }
      // 30% chance of busting the short stack each hand
      if (Math.random() < 0.3) {
        seats[shortest].chips = 0;
        eliminatePlayer(shortest);
      }
    }
  }

  // ── Tournament Finish ─────────────────────────────
  function finishTournament() {
    if (finished) return; // idempotency guard — prevent double prize award
    finished = true;
    phase = 'finished';

    // Determine final standings
    var winner = -1;
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated) { winner = i; break; }
    }

    // If player wasn't eliminated, they're the last standing
    if (!seats[PLAYER_SEAT].eliminated) {
      playerFinish = 1;
    }

    // If player wasn't set yet (edge case)
    if (playerFinish === 0) {
      // Find position from elimOrder
      for (var e = 0; e < elimOrder.length; e++) {
        if (elimOrder[e] === PLAYER_SEAT) {
          playerFinish = NUM_SEATS - e;
          break;
        }
      }
      if (playerFinish === 0) playerFinish = 1; // last one standing
    }

    // Award prizes
    playerPrize = 0;
    if (playerFinish <= PRIZES.length) {
      playerPrize = Math.floor(prizePool * PRIZES[playerFinish - 1]);
      walletAdd(playerPrize);
      stats.cashes++;
    }

    if (playerFinish === 1) stats.wins++;
    stats.tournaments++;
    if (stats.bestFinish === 0 || playerFinish < stats.bestFinish) stats.bestFinish = playerFinish;
    saveStats();

    if (playerPrize > 0) {
      msg('Finished ' + ordinal(playerFinish) + '! Won ' + playerPrize + ' GP.', 'reward');
    } else {
      msg('Finished ' + ordinal(playerFinish) + '. Better luck next time.', 'system');
    }

    statusText = '';
  }

  // ── Button Definitions ────────────────────────────
  function getButtons() {
    var btns = [];
    var btnW = 95, btnH = 30;
    var cx = CW / 2;
    var y = 610;
    var gap = 10;

    if (phase === 'buy-in') {
      var tierBtnW = 110;
      var tierGap = 8;
      var perRow = 3;
      var tierStartY = 370;

      for (var ti = 0; ti < BUY_INS.length; ti++) {
        var col = ti % perRow;
        var row = Math.floor(ti / perRow);
        var bx = cx - (perRow * tierBtnW + (perRow - 1) * tierGap) / 2 + col * (tierBtnW + tierGap);
        var by = tierStartY + row * (btnH + tierGap);
        var canAfford = getBalance() >= BUY_INS[ti];
        btns.push({
          x: bx, y: by, w: tierBtnW, h: btnH,
          label: BUY_INS[ti] + ' GP',
          action: 'buy-' + ti,
          disabled: !canAfford
        });
      }
      return btns;
    }

    if (phase === 'finished') {
      btns.push({ x: cx - 60, y: y, w: 120, h: btnH, label: 'LEAVE TABLE', action: 'leave-table', disabled: false });
      return btns;
    }

    // Player action buttons during betting
    if (actingSeat !== PLAYER_SEAT) return btns;
    if (phase !== 'preflop' && phase !== 'flop' && phase !== 'turn' && phase !== 'river') return btns;

    var s = seats[PLAYER_SEAT];
    var toCall = currentBet - s.bet;

    btns.push({ x: cx - 250, y: y, w: btnW, h: btnH, label: 'FOLD', action: 'fold', disabled: false });

    if (toCall <= 0) {
      btns.push({ x: cx - 145, y: y, w: btnW, h: btnH, label: 'CHECK', action: 'check', disabled: false });
    } else {
      var callAmt = Math.min(toCall, s.chips);
      btns.push({ x: cx - 145, y: y, w: btnW, h: btnH, label: 'CALL ' + callAmt, action: 'call', disabled: false });
    }

    var minRaiseTotal = currentBet + minRaise;
    if (s.chips + s.bet > currentBet && s.chips > toCall) {
      btns.push({ x: cx - 40, y: y, w: 60, h: btnH, label: '-', action: 'raise-down', disabled: raiseAmount <= minRaiseTotal });
      btns.push({ x: cx + 25, y: y, w: btnW, h: btnH, label: 'RAISE ' + raiseAmount, action: 'raise', disabled: false });
      btns.push({ x: cx + 125, y: y, w: 60, h: btnH, label: '+', action: 'raise-up', disabled: raiseAmount >= s.chips + s.bet });
    }

    if (s.chips > 0) {
      btns.push({ x: cx + 195, y: y, w: btnW, h: btnH, label: 'ALL IN', action: 'all-in', disabled: false });
    }

    return btns;
  }

  // ── Rendering ─────────────────────────────────────

  function drawBackground(c) {
    c.fillStyle = '#0c0c1e';
    c.fillRect(0, 0, CW, CH);

    // Table felt (oval) — deeper blue-green for tournament
    c.save();
    c.beginPath();
    c.ellipse(CW / 2, CH / 2 - 10, 400, 230, 0, 0, Math.PI * 2);
    c.fillStyle = '#14304a';
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

    // Felt glow
    var grad = c.createRadialGradient(CW / 2, CH / 2 - 10, 0, CW / 2, CH / 2 - 10, 400);
    grad.addColorStop(0, 'rgba(30,60,100,0.2)');
    grad.addColorStop(1, 'rgba(10,20,40,0)');
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

      var isActing = (actingSeat === i && phase !== 'between-hands' && phase !== 'finished' && phase !== 'buy-in' && phase !== 'showdown');
      var isWinner = winnerSeats.indexOf(i) >= 0 && (phase === 'showdown' || phase === 'between-hands');
      var isElim = s.eliminated;

      c.save();
      roundRect(c, pos.x - 55, pos.y - 18, 110, 52, 6);
      if (isElim) {
        c.fillStyle = 'rgba(20,10,10,0.5)';
      } else if (isWinner) {
        c.fillStyle = 'rgba(40,60,20,0.9)';
      } else if (isActing) {
        c.fillStyle = 'rgba(60,40,10,0.9)';
      } else if (s.folded) {
        c.fillStyle = 'rgba(30,20,20,0.7)';
      } else {
        c.fillStyle = 'rgba(0,0,0,0.7)';
      }
      c.fill();

      c.strokeStyle = isActing ? '#ffd700' : (isWinner ? '#44cc44' : (isElim ? '#3a2020' : '#6a5a3a'));
      c.lineWidth = isActing ? 2 : 1;
      roundRect(c, pos.x - 55, pos.y - 18, 110, 52, 6);
      c.stroke();
      c.restore();

      if (isElim) {
        c.font = '10px monospace';
        c.fillStyle = '#5a3030';
        c.textAlign = 'center';
        c.fillText(s.name + ' (out)', pos.x, pos.y + 8);
        c.textAlign = 'left';
        continue;
      }

      // Name
      c.font = 'bold 11px monospace';
      c.textAlign = 'center';
      c.fillStyle = i === PLAYER_SEAT ? '#e0c860' : (s.folded ? '#6a5a3a' : '#d0c0a0');
      c.fillText(s.name, pos.x, pos.y - 4);

      // Chips
      c.font = '10px monospace';
      c.fillStyle = s.folded ? '#5a4a3a' : '#c0a040';
      c.fillText(s.chips + '', pos.x, pos.y + 10);

      // Last action
      if (s.lastAction) {
        c.font = '9px monospace';
        c.fillStyle = s.lastAction === 'Fold' ? '#cc4444' : (s.lastAction.indexOf('Raise') >= 0 || s.lastAction === 'All-in' ? '#44cc44' : '#aaa');
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
        c.textAlign = 'center';
        c.fillText('D', pos.x + 50, pos.y - 9);
      }

      c.textAlign = 'left';
    }
  }

  function drawHoleCards(c) {
    for (var i = 0; i < NUM_SEATS; i++) {
      var s = seats[i];
      if (!s || s.eliminated || s.hole.length === 0) continue;
      var pos = SEAT_POS[i];

      var cardY = pos.y - 83;
      if (i === 0) cardY = pos.y - 93;
      if (i === 3) cardY = pos.y + 40;
      var cardX = pos.x - CARD_W - 2;

      var showCards = (i === PLAYER_SEAT) || (phase === 'showdown' && !s.folded);
      for (var ci = 0; ci < s.hole.length; ci++) {
        Cards.renderCard(c, cardX + ci * (CARD_W + 4), cardY, s.hole[ci], showCards, CARD_SCALE);
      }
    }
  }

  function drawCommunity(c) {
    if (community.length === 0 && phase !== 'buy-in' && phase !== 'finished') {
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
    if (pot <= 0 && (phase === 'buy-in' || phase === 'finished')) return;
    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('Pot: ' + pot, CW / 2, CH / 2 - CARD_H / 2 - 30);
    c.textAlign = 'left';
  }

  function drawHUD(c) {
    c.font = 'bold 18px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('SIT & GO', CW / 2, 28);

    // Balance
    c.font = 'bold 14px monospace';
    c.textAlign = 'right';
    c.fillStyle = '#e0c860';
    c.fillText(getBalance() + ' GP (wallet)', CW - 40, 28);

    if (phase !== 'buy-in') {
      var blinds = getBlinds();
      // Tournament info line
      c.font = '10px monospace';
      c.fillStyle = '#8a7a5a';
      var info = 'Blinds: ' + blinds[0] + '/' + blinds[1];
      info += '  Lvl:' + (blindLevel + 1);
      info += '  Hand:' + handNumber;
      info += '  Left:' + alivePlayers() + '/6';
      c.fillText(info, CW - 40, 44);

      // Prize pool
      c.fillStyle = '#c0a040';
      c.fillText('Prize: ' + prizePool + ' GP', CW - 40, 58);

      // Round name
      if (roundName) {
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillStyle = '#c0a040';
        c.fillText(roundName, CW / 2, 50);
      }
    }

    c.textAlign = 'left';
  }

  function drawBuyInScreen(c) {
    if (phase !== 'buy-in') return;

    c.font = 'bold 22px serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('Sit & Go Tournament', CW / 2, 260);

    c.font = '13px monospace';
    c.fillStyle = '#c0a040';
    c.fillText('6 players \u2022 Top 2 paid (70/30)', CW / 2, 290);
    c.fillText('Everyone starts with ' + STARTING_CHIPS + ' chips', CW / 2, 310);
    c.fillText('Blinds increase every ' + HANDS_PER_LEVEL + ' hands', CW / 2, 330);

    c.font = '11px monospace';
    c.fillStyle = '#8a7a5a';
    c.fillText('Choose buy-in (all goes to prize pool):', CW / 2, 355);
    c.textAlign = 'left';
  }

  function drawFinishedScreen(c) {
    if (phase !== 'finished') return;

    // Results overlay
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(CW / 2 - 200, 180, 400, 300);
    roundRect(c, CW / 2 - 200, 180, 400, 300, 10);
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.stroke();

    c.font = 'bold 20px serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('Tournament Complete', CW / 2, 220);

    c.font = 'bold 16px monospace';
    c.fillStyle = playerFinish <= 2 ? '#44cc44' : '#cc4444';
    c.fillText('You finished ' + ordinal(playerFinish), CW / 2, 260);

    if (playerPrize > 0) {
      c.font = 'bold 18px monospace';
      c.fillStyle = '#ffd700';
      c.fillText('Won ' + playerPrize + ' GP!', CW / 2, 295);
    } else {
      c.font = '14px monospace';
      c.fillStyle = '#8a7a5a';
      c.fillText('No prize this time', CW / 2, 295);
    }

    // Standings
    c.font = '11px monospace';
    var standY = 330;
    // Build standings from elimOrder (reversed = first out is last place)
    var standings = [];
    for (var i = 0; i < NUM_SEATS; i++) {
      if (seats[i].active && !seats[i].eliminated) standings.push({ seat: i, pos: 1 });
    }
    for (var e = elimOrder.length - 1; e >= 0; e--) {
      standings.push({ seat: elimOrder[e], pos: standings.length + 1 });
    }

    for (var si = 0; si < Math.min(standings.length, 6); si++) {
      var st = standings[si];
      var s = seats[st.seat];
      var prize = (si < PRIZES.length) ? Math.floor(prizePool * PRIZES[si]) : 0;
      c.fillStyle = st.seat === PLAYER_SEAT ? '#e0c860' : '#d0c0a0';
      var line = ordinal(si + 1) + '  ' + s.name;
      if (prize > 0) line += '  +' + prize + ' GP';
      c.fillText(line, CW / 2 - 120, standY + si * 18);
    }

    // Stats
    c.font = '9px monospace';
    c.fillStyle = '#6a5a3a';
    c.fillText('Tournaments: ' + stats.tournaments + '  Wins: ' + stats.wins + '  Cashes: ' + stats.cashes, CW / 2 - 120, standY + 120);

    c.textAlign = 'left';
  }

  function drawShowdownInfo(c) {
    if (phase !== 'showdown' && phase !== 'between-hands') return;
    if (showdownResults.length === 0) return;
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
    drawFinishedScreen(ctx);
    drawStatusText(ctx);
    drawActionButtons(ctx);
    Cards.renderBackButton(ctx, phase === 'buy-in' ? 'Leave Table' : (phase === 'finished' ? 'Leave' : 'Forfeit'));

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
      handleLeave();
      return;
    }

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
      var idx = parseInt(action.substring(4), 10);
      buyIn(idx);
      return;
    }

    switch (action) {
      case 'fold': playerFold(); break;
      case 'check': playerCheck(); break;
      case 'call': playerCall(); break;
      case 'raise': playerRaise(raiseAmount); break;
      case 'all-in': playerAllIn(); break;
      case 'raise-up':
        var blinds = getBlinds();
        raiseAmount = Math.min(raiseAmount + blinds[1], seats[PLAYER_SEAT].chips + seats[PLAYER_SEAT].bet);
        break;
      case 'raise-down':
        var blinds2 = getBlinds();
        raiseAmount = Math.max(raiseAmount - blinds2[1], currentBet + minRaise);
        break;
      case 'leave-table': leave(); break;
    }
  }

  // ── Buy-In / Leave ────────────────────────────────
  function buyIn(idx) {
    buyInAmount = BUY_INS[idx];
    prizePool = buyInAmount * NUM_SEATS;
    if (getBalance() < buyInAmount) {
      statusText = 'Not enough GP!';
      return;
    }

    walletDeduct(buyInAmount);
    msg('Entered Sit & Go for ' + buyInAmount + ' GP. Prize pool: ' + prizePool + ' GP.', 'system');

    blindLevel = 0;
    handsAtLevel = 0;
    handNumber = 0;
    elimOrder = [];
    finished = false;
    playerFinish = 0;
    playerPrize = 0;

    initSeats();
    dealerSeat = Math.floor(Math.random() * NUM_SEATS);
    startHand();
  }

  function handleLeave() {
    if (phase === 'buy-in' || phase === 'finished') {
      leave();
      return;
    }
    // Mid-tournament forfeit — player loses buy-in
    stats.tournaments++;
    saveStats();
    msg('Forfeited Sit & Go. Buy-in lost.', 'system');
    leave();
  }

  // ── Animation Loop ────────────────────────────────
  function loop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;
    frameCount++;

    processQueue(dt);
    if (phase === 'showdown') showdownTimer += dt;
    render();
    animId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (animId) return;
    lastTimestamp = 0;
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
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
    finished = false;

    loadStats();

    canvas.removeEventListener('click', onClick);
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
    handleLeave();
    return true;
  }

  function isActive() { return !!animId; }

  // ── Public API ────────────────────────────────────
  window.RpgSitAndGo = {
    enter: enter,
    leave: leave,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
