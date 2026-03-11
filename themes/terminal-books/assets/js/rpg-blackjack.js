/* ══════════════════════════════════════════════════
   RPG BLACKJACK — Canvas-based blackjack table.
   6-deck shoe, hit/stand/double/split, insurance.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var Cards = window.RpgCards;
  var CW = 1060, CH = 660;

  // ── Constants ─────────────────────────────────────
  var SHOE_DECKS = 6;
  var RESHUFFLE_THRESHOLD = 0.25;
  var BET_STEPS = [5, 10, 25, 50, 100, 250, 500];
  var DEAL_DELAY = 300;   // ms between dealt cards
  var DEALER_DELAY = 400; // ms between dealer hits
  var CARD_SCALE = 1.2;
  var CARD_W = Cards.CARD_W * CARD_SCALE;
  var CARD_H = Cards.CARD_H * CARD_SCALE;
  var CARD_GAP = 14;

  // Layout positions
  var DEALER_Y = 110;
  var PLAYER_Y = 340;
  var STATUS_Y = 510;
  var BUTTONS_Y = 560;
  var HUD_Y = 42;

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null;
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;

  var shoe = [];
  var dealerHand = [];
  var dealerHoleRevealed = false;
  var playerHands = [];   // [{ cards, bet, standing, doubled, result }]
  var activeHandIndex = 0;
  var insuranceBet = 0;
  var phase = 'betting';  // betting | dealing | insurance | playing | dealer | settled
  var statusText = '';
  var currentBet = 25;
  var betStepIndex = 2;

  // Animation queue: sequential timed actions
  var actionQueue = [];
  var actionTimer = 0;

  // Stats (persisted per RPG slot)
  var stats = { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0 };
  var STATS_KEY = 'arebooksgood-casino-bj-stats';

  // ── Shoe Management ───────────────────────────────
  function initShoe() {
    shoe = Cards.createDeck(SHOE_DECKS);
    Cards.shuffle(shoe);
  }

  function needsReshuffle() {
    return shoe.length < (52 * SHOE_DECKS * RESHUFFLE_THRESHOLD);
  }

  function draw1() {
    if (shoe.length === 0) initShoe();
    return Cards.drawCard(shoe);
  }

  // ── Helpers ───────────────────────────────────────
  function handValue(cards) {
    return Cards.bjValue(cards).value;
  }

  function isSoft(cards) {
    return Cards.bjValue(cards).soft;
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards) === 21;
  }

  function isBusted(cards) {
    return handValue(cards) > 21;
  }

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

  // ── Stats Persistence ─────────────────────────────
  function loadStats() {
    try {
      var saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        stats.hands = parsed.hands || 0;
        stats.wins = parsed.wins || 0;
        stats.losses = parsed.losses || 0;
        stats.pushes = parsed.pushes || 0;
        stats.blackjacks = parsed.blackjacks || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) { /* ignore */ }
  }

  // ── Action Queue (sequential animations) ──────────
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

  // ── Game Logic ────────────────────────────────────
  function startDeal() {
    if (getBalance() < currentBet) {
      statusText = 'Not enough GP!';
      return;
    }

    if (needsReshuffle()) {
      initShoe();
      msg('Dealer reshuffles the shoe.', 'system');
    }

    // Deduct bet
    walletDeduct(currentBet);

    // Reset hands
    dealerHand = [];
    dealerHoleRevealed = false;
    playerHands = [{ cards: [], bet: currentBet, standing: false, doubled: false, result: null }];
    activeHandIndex = 0;
    insuranceBet = 0;
    phase = 'dealing';
    statusText = 'Dealing...';

    // Queue 4 cards: P, D, P, D(hole)
    queueAction(function () {
      playerHands[0].cards.push(draw1());
    }, DEAL_DELAY);
    queueAction(function () {
      dealerHand.push(draw1());
    }, DEAL_DELAY);
    queueAction(function () {
      playerHands[0].cards.push(draw1());
    }, DEAL_DELAY);
    queueAction(function () {
      dealerHand.push(draw1());
    }, DEAL_DELAY);
    queueAction(function () {
      afterDeal();
    }, DEAL_DELAY);
  }

  function afterDeal() {
    var dealerShowing = dealerHand[0];

    // Check dealer ace → insurance
    if (dealerShowing.rank === 'A') {
      phase = 'insurance';
      statusText = 'Insurance?';
      return;
    }

    afterInsurance();
  }

  function afterInsurance() {
    // Check for dealer blackjack
    if (isBlackjack(dealerHand)) {
      dealerHoleRevealed = true;

      // Resolve insurance
      if (insuranceBet > 0) {
        walletAdd(insuranceBet * 3);
        msg('Dealer blackjack! Insurance pays ' + (insuranceBet * 2) + ' GP.', 'reward');
      }

      // Check player blackjack → push
      stats.hands++;
      if (isBlackjack(playerHands[0].cards)) {
        playerHands[0].result = 'push';
        walletAdd(playerHands[0].bet);
        statusText = 'Both blackjack — Push!';
        stats.pushes++;
      } else {
        playerHands[0].result = 'lose';
        statusText = 'Dealer has blackjack!';
        stats.losses++;
      }
      phase = 'settled';
      saveStats();
      return;
    }

    // Insurance lost (if taken)
    if (insuranceBet > 0) {
      msg('No dealer blackjack. Insurance lost.', 'system');
    }

    // Check player blackjack
    if (isBlackjack(playerHands[0].cards)) {
      dealerHoleRevealed = true;
      var payout = playerHands[0].bet + Math.floor(playerHands[0].bet * 1.5);
      walletAdd(payout);
      playerHands[0].result = 'blackjack';
      statusText = 'Blackjack! +' + payout + ' GP';
      stats.hands++;
      stats.blackjacks++;
      stats.wins++;
      phase = 'settled';
      msg('Blackjack! Won ' + payout + ' GP.', 'reward');
      saveStats();
      return;
    }

    // Normal play
    phase = 'playing';
    statusText = 'Your turn';
  }

  function takeInsurance() {
    var maxInsurance = Math.floor(playerHands[0].bet / 2);
    var canAfford = Math.min(maxInsurance, getBalance());
    if (canAfford <= 0) {
      declineInsurance();
      return;
    }
    insuranceBet = canAfford;
    walletDeduct(insuranceBet);
    msg('Insurance bet: ' + insuranceBet + ' GP.', 'system');
    afterInsurance();
  }

  function declineInsurance() {
    insuranceBet = 0;
    afterInsurance();
  }

  function playerHit() {
    if (phase !== 'playing') return;
    var hand = playerHands[activeHandIndex];
    if (hand.standing || hand.result) return;

    hand.cards.push(draw1());

    if (handValue(hand.cards) === 21) {
      hand.standing = true;
      advanceHand();
    } else if (isBusted(hand.cards)) {
      hand.result = 'lose';
      stats.losses++;
      advanceHand();
    }
  }

  function playerStand() {
    if (phase !== 'playing') return;
    var hand = playerHands[activeHandIndex];
    if (hand.standing || hand.result) return;
    hand.standing = true;
    advanceHand();
  }

  function playerDouble() {
    if (phase !== 'playing') return;
    var hand = playerHands[activeHandIndex];
    if (hand.cards.length !== 2 || hand.doubled || hand.standing || hand.result) return;
    if (getBalance() < hand.bet) {
      statusText = 'Not enough GP to double!';
      return;
    }

    walletDeduct(hand.bet);
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw1());
    hand.standing = true;

    if (isBusted(hand.cards)) {
      hand.result = 'lose';
      stats.losses++;
    }
    advanceHand();
  }

  function playerSplit() {
    if (phase !== 'playing') return;
    var hand = playerHands[activeHandIndex];
    if (hand.cards.length !== 2 || hand.doubled || hand.standing || hand.result) return;
    // Allow splitting any two cards of equal value (e.g. K-Q, J-10)
    if (Cards.bjValue([hand.cards[0]]).value !== Cards.bjValue([hand.cards[1]]).value) return;
    if (playerHands.length >= 2) return; // max 2 hands
    if (getBalance() < hand.bet) {
      statusText = 'Not enough GP to split!';
      return;
    }

    walletDeduct(hand.bet);
    var card2 = hand.cards.pop();
    var newHand = { cards: [card2], bet: hand.bet, standing: false, doubled: false, result: null };

    // Deal one card to each hand
    hand.cards.push(draw1());
    newHand.cards.push(draw1());
    playerHands.push(newHand);

    // If aces were split, both auto-stand
    if (hand.cards[0].rank === 'A') {
      hand.standing = true;
      newHand.standing = true;
      // Check if both are done
      advanceHand();
      return;
    }

    statusText = 'Playing Hand 1';
  }

  function advanceHand() {
    // Find next playable hand
    for (var i = activeHandIndex; i < playerHands.length; i++) {
      if (!playerHands[i].standing && !playerHands[i].result) {
        activeHandIndex = i;
        if (playerHands.length > 1) {
          statusText = 'Playing Hand ' + (i + 1);
        }
        return;
      }
    }
    // All hands done → dealer's turn
    startDealerPlay();
  }

  function startDealerPlay() {
    dealerHoleRevealed = true;
    phase = 'dealer';
    statusText = 'Dealer\'s turn';

    // Check if all player hands are busted
    var allBusted = true;
    for (var i = 0; i < playerHands.length; i++) {
      if (playerHands[i].result !== 'lose') { allBusted = false; break; }
    }
    if (allBusted) {
      settleHands();
      return;
    }

    dealerDraw();
  }

  function dealerDraw() {
    var val = handValue(dealerHand);
    var soft = isSoft(dealerHand);

    // Dealer hits on < 17 or soft 17
    if (val < 17 || (val === 17 && soft)) {
      queueAction(function () {
        dealerHand.push(draw1());
        dealerDraw(); // recurse
      }, DEALER_DELAY);
    } else {
      queueAction(function () {
        settleHands();
      }, DEALER_DELAY);
    }
  }

  function settleHands() {
    stats.hands++;
    var dealerVal = handValue(dealerHand);
    var dealerBust = isBusted(dealerHand);
    var totalWin = 0;
    var totalLoss = 0;

    for (var i = 0; i < playerHands.length; i++) {
      var hand = playerHands[i];
      if (hand.result) continue; // already resolved (busted)

      var playerVal = handValue(hand.cards);

      if (dealerBust || playerVal > dealerVal) {
        hand.result = 'win';
        var payout = hand.bet * 2;
        walletAdd(payout);
        totalWin += hand.bet;
        stats.wins++;
      } else if (playerVal === dealerVal) {
        hand.result = 'push';
        walletAdd(hand.bet);
        stats.pushes++;
      } else {
        hand.result = 'lose';
        totalLoss += hand.bet;
        stats.losses++;
      }
    }

    // Build status message
    if (playerHands.length === 1) {
      var r = playerHands[0].result;
      if (r === 'win') statusText = 'You win! +' + (playerHands[0].bet * 2) + ' GP';
      else if (r === 'push') statusText = 'Push — bet returned';
      else if (r === 'lose') statusText = dealerBust ? 'Dealer busts! You win!' : 'Dealer wins';
      // Fix: if dealer busted, the result is already 'win', status set above
      if (r === 'win' && dealerBust) statusText = 'Dealer busts! +' + (playerHands[0].bet * 2) + ' GP';
    } else {
      var w = 0, l = 0, p = 0;
      for (var j = 0; j < playerHands.length; j++) {
        if (playerHands[j].result === 'win') w++;
        else if (playerHands[j].result === 'lose') l++;
        else p++;
      }
      statusText = w + ' win, ' + l + ' loss, ' + p + ' push';
    }

    phase = 'settled';
    if (totalWin > 0) msg('Won ' + totalWin + ' GP at blackjack.', 'reward');
    else if (totalLoss > 0) msg('Lost ' + totalLoss + ' GP at blackjack.', 'combat');
    else msg('Push at blackjack.', 'system');
    saveStats();
  }

  function newHand() {
    phase = 'betting';
    statusText = '';
    queueClear();
  }

  // ── Button Definitions ────────────────────────────
  // Returns array of { x, y, w, h, label, action, disabled } for current phase
  function getButtons() {
    var btns = [];
    var btnW = 100, btnH = 30;
    var cx = CW / 2;
    var y = BUTTONS_Y;
    var gap = 12;

    if (phase === 'betting') {
      var totalW = btnW * 4 + gap * 3;
      var startX = cx - totalW / 2;
      var canBet = getBalance() >= BET_STEPS[0];

      btns.push({ x: startX, y: y, w: btnW, h: btnH, label: '- Bet', action: 'bet-down', disabled: !canBet });
      btns.push({ x: startX + btnW + gap, y: y, w: btnW, h: btnH, label: currentBet + ' GP', action: null, disabled: true });
      btns.push({ x: startX + (btnW + gap) * 2, y: y, w: btnW, h: btnH, label: '+ Bet', action: 'bet-up', disabled: !canBet });
      btns.push({ x: startX + (btnW + gap) * 3, y: y, w: btnW, h: btnH, label: 'DEAL', action: 'deal', disabled: !canBet || getBalance() < currentBet });

    } else if (phase === 'insurance') {
      var totalW2 = btnW * 2 + gap;
      var startX2 = cx - totalW2 / 2;
      btns.push({ x: startX2, y: y, w: btnW, h: btnH, label: 'Yes', action: 'insurance-yes', disabled: false });
      btns.push({ x: startX2 + btnW + gap, y: y, w: btnW, h: btnH, label: 'No', action: 'insurance-no', disabled: false });

    } else if (phase === 'playing') {
      var hand = playerHands[activeHandIndex];
      var canDouble = hand && hand.cards.length === 2 && !hand.doubled && getBalance() >= hand.bet;
      var canSplit = hand && hand.cards.length === 2 && !hand.doubled && playerHands.length < 2
        && Cards.bjValue([hand.cards[0]]).value === Cards.bjValue([hand.cards[1]]).value && getBalance() >= hand.bet;

      var numBtns = 2 + (canDouble ? 1 : 0) + (canSplit ? 1 : 0);
      var totalW3 = btnW * numBtns + gap * (numBtns - 1);
      var startX3 = cx - totalW3 / 2;
      var idx = 0;

      btns.push({ x: startX3 + (btnW + gap) * idx++, y: y, w: btnW, h: btnH, label: 'HIT', action: 'hit', disabled: false });
      btns.push({ x: startX3 + (btnW + gap) * idx++, y: y, w: btnW, h: btnH, label: 'STAND', action: 'stand', disabled: false });
      if (canDouble) btns.push({ x: startX3 + (btnW + gap) * idx++, y: y, w: btnW, h: btnH, label: 'DOUBLE', action: 'double', disabled: false });
      if (canSplit) btns.push({ x: startX3 + (btnW + gap) * idx++, y: y, w: btnW, h: btnH, label: 'SPLIT', action: 'split', disabled: false });

    } else if (phase === 'settled') {
      btns.push({ x: cx - btnW / 2, y: y, w: btnW, h: btnH, label: 'NEW HAND', action: 'new-hand', disabled: false });
    }

    return btns;
  }

  // ── Rendering ─────────────────────────────────────

  function drawBackground(c) {
    // Dark casino felt
    c.fillStyle = '#1a3a1a';
    c.fillRect(0, 0, CW, CH);

    // Darker border
    c.fillStyle = '#0a1a0a';
    c.fillRect(0, 0, CW, 24);
    c.fillRect(0, CH - 24, CW, 24);
    c.fillRect(0, 0, 24, CH);
    c.fillRect(CW - 24, 0, 24, CH);

    // Gold trim
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.strokeRect(24, 24, CW - 48, CH - 48);

    // Inner felt gradient (subtle)
    var grad = c.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, 400);
    grad.addColorStop(0, 'rgba(40,80,40,0.3)');
    grad.addColorStop(1, 'rgba(20,50,20,0)');
    c.fillStyle = grad;
    c.fillRect(24, 24, CW - 48, CH - 48);

    // Dealer area semicircle outline
    c.strokeStyle = 'rgba(192,160,64,0.15)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(CW / 2, DEALER_Y - 20, 180, 0, Math.PI);
    c.stroke();

    // Divider line
    c.strokeStyle = 'rgba(192,160,64,0.2)';
    c.lineWidth = 1;
    c.setLineDash([6, 4]);
    c.beginPath();
    c.moveTo(80, (DEALER_Y + PLAYER_Y) / 2 + 30);
    c.lineTo(CW - 80, (DEALER_Y + PLAYER_Y) / 2 + 30);
    c.stroke();
    c.setLineDash([]);

    // "BLACKJACK PAYS 3 TO 2" text
    c.font = '10px monospace';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(192,160,64,0.15)';
    c.fillText('BLACKJACK PAYS 3 TO 2', CW / 2, (DEALER_Y + PLAYER_Y) / 2 + 34);

    // "INSURANCE PAYS 2 TO 1" text
    c.fillText('INSURANCE PAYS 2 TO 1', CW / 2, (DEALER_Y + PLAYER_Y) / 2 + 48);
    c.textAlign = 'left';
  }

  function drawHUD(c) {
    // Title
    c.font = 'bold 18px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('BLACKJACK', CW / 2, HUD_Y);

    // Balance (top right)
    c.font = 'bold 14px monospace';
    c.textAlign = 'right';
    c.fillStyle = '#e0c860';
    c.fillText(getBalance() + ' GP', CW - 40, HUD_Y);

    // Stats (top right, smaller)
    c.font = '10px monospace';
    c.fillStyle = '#8a7a5a';
    c.fillText('W:' + stats.wins + ' L:' + stats.losses + ' P:' + stats.pushes, CW - 40, HUD_Y + 16);
    c.textAlign = 'left';
  }

  function drawCards(c, cards, x, y, faceUpAll, hideSecond) {
    var totalW = cards.length * CARD_W + (cards.length - 1) * CARD_GAP;
    var startX = x - totalW / 2;

    for (var i = 0; i < cards.length; i++) {
      var cx = startX + i * (CARD_W + CARD_GAP);
      var faceUp = faceUpAll;
      if (hideSecond && i === 1) faceUp = false;
      Cards.renderCard(c, cx, y, cards[i], faceUp, CARD_SCALE);
    }
  }

  function drawHandValue(c, cards, x, y, hideSecond) {
    if (cards.length === 0) return;
    c.font = 'bold 14px monospace';
    c.textAlign = 'center';

    var val, text;
    if (hideSecond) {
      // Show only first card value
      val = Cards.bjValue([cards[0]]);
      text = '(' + val.value + ')';
      c.fillStyle = '#c0b080';
    } else {
      val = Cards.bjValue(cards);
      if (val.value > 21) {
        text = val.value + ' BUST';
        c.fillStyle = '#cc4444';
      } else if (val.value === 21 && cards.length === 2) {
        text = 'BLACKJACK';
        c.fillStyle = '#ffd700';
      } else {
        text = (val.soft ? 'Soft ' : '') + val.value;
        c.fillStyle = '#e0d0a0';
      }
    }
    c.fillText(text, x, y);
    c.textAlign = 'left';
  }

  function drawDealerArea(c) {
    // Label
    c.font = '12px monospace';
    c.fillStyle = '#8a7a5a';
    c.textAlign = 'center';
    c.fillText('DEALER', CW / 2, DEALER_Y - 50);
    c.textAlign = 'left';

    if (dealerHand.length === 0) return;

    var hideHole = !dealerHoleRevealed;
    drawCards(c, dealerHand, CW / 2, DEALER_Y, true, hideHole);
    drawHandValue(c, dealerHand, CW / 2, DEALER_Y + CARD_H + 18, hideHole);
  }

  function drawPlayerArea(c) {
    if (playerHands.length === 0) {
      // Empty slots
      c.font = '12px monospace';
      c.fillStyle = '#8a7a5a';
      c.textAlign = 'center';
      c.fillText('YOUR HAND', CW / 2, PLAYER_Y - 10);
      Cards.renderCardSlot(c, CW / 2 - CARD_W / 2, PLAYER_Y, CARD_SCALE);
      c.textAlign = 'left';
      return;
    }

    if (playerHands.length === 1) {
      // Single hand, centered
      var hand = playerHands[0];
      var labelText = 'YOUR HAND';
      if (hand.doubled) labelText += ' (DOUBLED)';
      c.font = '12px monospace';
      c.fillStyle = activeHandIndex === 0 && phase === 'playing' ? '#e0c860' : '#8a7a5a';
      c.textAlign = 'center';
      c.fillText(labelText, CW / 2, PLAYER_Y - 10);
      c.textAlign = 'left';

      drawCards(c, hand.cards, CW / 2, PLAYER_Y, true, false);
      drawHandValue(c, hand.cards, CW / 2, PLAYER_Y + CARD_H + 18, false);

      // Bet amount
      c.font = '11px monospace';
      c.fillStyle = '#c0a040';
      c.textAlign = 'center';
      c.fillText('Bet: ' + hand.bet + ' GP', CW / 2, PLAYER_Y + CARD_H + 34);
      c.textAlign = 'left';

      // Result
      if (hand.result) drawResultBadge(c, hand.result, CW / 2, PLAYER_Y + CARD_H + 52);

    } else {
      // Split hands — side by side
      var positions = [CW / 2 - 140, CW / 2 + 140];

      for (var hi = 0; hi < playerHands.length; hi++) {
        var h = playerHands[hi];
        var hx = positions[hi];
        var isActive = hi === activeHandIndex && phase === 'playing';

        // Active hand highlight
        if (isActive) {
          c.fillStyle = 'rgba(192,160,64,0.08)';
          c.fillRect(hx - 80, PLAYER_Y - 18, 160, CARD_H + 75);
        }

        // Label
        c.font = '11px monospace';
        c.fillStyle = isActive ? '#e0c860' : '#8a7a5a';
        c.textAlign = 'center';
        c.fillText('Hand ' + (hi + 1) + (h.doubled ? ' (2x)' : ''), hx, PLAYER_Y - 6);
        c.textAlign = 'left';

        drawCards(c, h.cards, hx, PLAYER_Y, true, false);
        drawHandValue(c, h.cards, hx, PLAYER_Y + CARD_H + 18, false);

        c.font = '10px monospace';
        c.fillStyle = '#c0a040';
        c.textAlign = 'center';
        c.fillText('Bet: ' + h.bet, hx, PLAYER_Y + CARD_H + 32);
        c.textAlign = 'left';

        if (h.result) drawResultBadge(c, h.result, hx, PLAYER_Y + CARD_H + 48);
      }
    }
  }

  function drawResultBadge(c, result, x, y) {
    var text, color;
    if (result === 'win') { text = 'WIN'; color = '#44cc44'; }
    else if (result === 'blackjack') { text = 'BLACKJACK!'; color = '#ffd700'; }
    else if (result === 'push') { text = 'PUSH'; color = '#c0a040'; }
    else { text = 'LOSE'; color = '#cc4444'; }

    c.font = 'bold 13px monospace';
    c.textAlign = 'center';
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.textAlign = 'left';
  }

  function drawStatusText(c) {
    if (!statusText) return;
    c.font = 'bold 14px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#e0d0a0';
    c.fillText(statusText, CW / 2, STATUS_Y);
    c.textAlign = 'left';
  }

  function drawActionButtons(c) {
    var btns = getButtons();
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      Cards.renderButton(c, b.x, b.y, b.w, b.h, b.label, { disabled: b.disabled });
    }
  }

  function render() {
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);

    drawBackground(ctx);
    drawHUD(ctx);
    drawDealerArea(ctx);
    drawPlayerArea(ctx);
    drawStatusText(ctx);
    drawActionButtons(ctx);

    // Back button
    Cards.renderBackButton(ctx, 'Leave Table');

    ctx.restore();
  }

  // ── Click Handler ─────────────────────────────────
  function onClick(e) {
    if (!canvas) return;
    if (actionQueue.length > 0) return; // no clicks during animation

    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (CW / rect.width);
    var cy = (e.clientY - rect.top) * (CH / rect.height);

    // Back button (top-left region)
    if (cx < 200 && cy < 70) {
      leave();
      return;
    }

    // Check action buttons
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
    switch (action) {
      case 'bet-up':
        betStepIndex = Math.min(betStepIndex + 1, BET_STEPS.length - 1);
        // Clamp to balance but keep step index in sync
        while (betStepIndex > 0 && BET_STEPS[betStepIndex] > getBalance()) betStepIndex--;
        currentBet = BET_STEPS[betStepIndex];
        break;
      case 'bet-down':
        betStepIndex = Math.max(betStepIndex - 1, 0);
        currentBet = BET_STEPS[betStepIndex];
        break;
      case 'deal':
        startDeal();
        break;
      case 'hit':
        playerHit();
        break;
      case 'stand':
        playerStand();
        break;
      case 'double':
        playerDouble();
        break;
      case 'split':
        playerSplit();
        break;
      case 'insurance-yes':
        takeInsurance();
        break;
      case 'insurance-no':
        declineInsurance();
        break;
      case 'new-hand':
        newHand();
        break;
    }
  }

  // ── Animation Loop ────────────────────────────────
  function loop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;
    frameCount++;

    processQueue(dt);
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

    // Reset game state
    phase = 'betting';
    dealerHand = [];
    dealerHoleRevealed = false;
    playerHands = [];
    activeHandIndex = 0;
    insuranceBet = 0;
    statusText = '';
    queueClear();
    frameCount = 0;
    lastTimestamp = 0;

    if (shoe.length === 0) initShoe();
    loadStats();

    // Cap bet to balance
    if (currentBet > getBalance() && getBalance() > 0) {
      currentBet = BET_STEPS[0];
      betStepIndex = 0;
    }

    canvas.addEventListener('click', onClick);
    startLoop();
  }

  function leave() {
    queueClear();
    stopLoop();
    if (canvas) canvas.removeEventListener('click', onClick);
    // Forfeit any in-progress hand (bet already deducted)
    if (phase !== 'betting' && phase !== 'settled') {
      msg('Left the table — hand forfeited.', 'system');
    }
    if (bridge && bridge.onLeave) bridge.onLeave();
  }

  function handleEscape() {
    leave();
    return true;
  }

  function isActive() {
    return !!animId;
  }

  // ── Public API ────────────────────────────────────
  window.RpgBlackjack = {
    enter: enter,
    leave: leave,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
