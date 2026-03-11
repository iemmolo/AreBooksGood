/* ══════════════════════════════════════════════════
   RPG CASINO WARS — Canvas-based Casino War table.
   Single-deck, high card wins. Tie triggers War.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var Cards = window.RpgCards;
  var CW = 1060, CH = 660;

  // ── Constants ─────────────────────────────────────
  var SHOE_DECKS = 6;
  var RESHUFFLE_THRESHOLD = 0.25;
  var BET_STEPS = [5, 10, 25, 50, 100, 250, 500];
  var DEAL_DELAY = 350;   // ms between card flips
  var WAR_BURN = 3;       // cards burned face-down in war
  var CARD_SCALE = 1.6;
  var CARD_W = Cards.CARD_W * CARD_SCALE;
  var CARD_H = Cards.CARD_H * CARD_SCALE;

  // War value: A is high (14), suits don't matter
  var WAR_VALUES = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
    'J':11,'Q':12,'K':13,'A':14
  };

  // Layout positions (logical, pre ctx.scale)
  var HUD_Y = 42;
  var DEALER_LABEL_Y = 95;
  var DEALER_CARD_Y = 115;
  var PLAYER_LABEL_Y = 425;
  var PLAYER_CARD_Y = 300;
  var BURN_Y = 210;        // burn pile between dealer/player during war
  var STATUS_Y = 520;
  var BUTTONS_Y = 560;

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null;
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;

  var shoe = [];
  var dealerCard = null;
  var playerCard = null;
  var dealerRevealed = false;
  var playerRevealed = false;

  // War state
  var burnCards = [];       // burned cards (face-down) during war
  var warDealerCard = null;
  var warPlayerCard = null;
  var warDealerRevealed = false;
  var warPlayerRevealed = false;
  var inWar = false;

  // Phase: betting | dealing | result | war-prompt | war-dealing | war-result | settled
  var phase = 'betting';
  var statusText = '';
  var resultText = '';
  var resultColor = '#e0d0a0';
  var currentBet = 25;
  var betStepIndex = 2;
  var lastWinAmount = 0;

  // Animation queue
  var actionQueue = [];
  var actionTimer = 0;

  // Stats
  var stats = { hands: 0, wins: 0, losses: 0, ties: 0, wars: 0, surrenders: 0 };
  var STATS_KEY = 'arebooksgood-casino-wars-stats';

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
  function cardValue(card) {
    return WAR_VALUES[card.rank];
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
        stats.ties = parsed.ties || 0;
        stats.wars = parsed.wars || 0;
        stats.surrenders = parsed.surrenders || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) { /* ignore */ }
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

    walletDeduct(currentBet);
    resetRound();
    phase = 'dealing';
    statusText = 'Dealing...';

    // Deal: player face-up, then dealer face-down, then reveal
    queueAction(function () {
      playerCard = draw1();
      playerRevealed = true;
    }, DEAL_DELAY);

    queueAction(function () {
      dealerCard = draw1();
      dealerRevealed = false;
    }, DEAL_DELAY);

    queueAction(function () {
      dealerRevealed = true;
    }, DEAL_DELAY);

    queueAction(function () {
      resolveInitial();
    }, 200);
  }

  function resetRound() {
    dealerCard = null;
    playerCard = null;
    dealerRevealed = false;
    playerRevealed = false;
    burnCards = [];
    warDealerCard = null;
    warPlayerCard = null;
    warDealerRevealed = false;
    warPlayerRevealed = false;
    inWar = false;
    resultText = '';
    resultColor = '#e0d0a0';
    lastWinAmount = 0;
  }

  function resolveInitial() {
    var pv = cardValue(playerCard);
    var dv = cardValue(dealerCard);

    if (pv > dv) {
      // Player wins — pays 1:1
      var winnings = currentBet * 2;
      walletAdd(winnings);
      lastWinAmount = currentBet;
      resultText = 'YOU WIN!';
      resultColor = '#44cc44';
      statusText = '+' + currentBet + ' GP';
      stats.hands++;
      stats.wins++;
      msg('Won ' + currentBet + ' GP at Casino Wars.', 'reward');
      phase = 'settled';
      saveStats();
    } else if (pv < dv) {
      // Dealer wins
      lastWinAmount = 0;
      resultText = 'DEALER WINS';
      resultColor = '#cc4444';
      statusText = '-' + currentBet + ' GP';
      stats.hands++;
      stats.losses++;
      msg('Lost ' + currentBet + ' GP at Casino Wars.', 'combat');
      phase = 'settled';
      saveStats();
    } else {
      // Tie — player chooses: War or Surrender
      resultText = 'TIE!';
      resultColor = '#ffd700';
      statusText = 'Go to War or Surrender?';
      stats.ties++;
      phase = 'war-prompt';
    }
  }

  function goToWar() {
    // War costs an additional bet equal to the original
    if (getBalance() < currentBet) {
      statusText = 'Not enough GP for War! Surrendering...';
      doSurrender();
      return;
    }

    walletDeduct(currentBet);
    inWar = true;
    phase = 'war-dealing';
    statusText = 'WAR!';
    stats.wars++;

    // Burn cards face-down, then deal one each
    burnCards = [];
    for (var i = 0; i < WAR_BURN; i++) {
      (function (idx) {
        queueAction(function () {
          burnCards.push(draw1());
        }, DEAL_DELAY);
      })(i);
    }

    // Player's war card
    queueAction(function () {
      warPlayerCard = draw1();
      warPlayerRevealed = true;
    }, DEAL_DELAY);

    // Dealer's war card (face down first)
    queueAction(function () {
      warDealerCard = draw1();
      warDealerRevealed = false;
    }, DEAL_DELAY);

    // Reveal dealer
    queueAction(function () {
      warDealerRevealed = true;
    }, DEAL_DELAY);

    // Resolve
    queueAction(function () {
      resolveWar();
    }, 200);
  }

  function doSurrender() {
    // Player gets half their bet back
    var refund = Math.floor(currentBet / 2);
    walletAdd(refund);
    resultText = 'SURRENDER';
    resultColor = '#c0a040';
    statusText = 'Returned ' + refund + ' GP';
    stats.hands++;
    stats.surrenders++;
    msg('Surrendered at Casino Wars. Returned ' + refund + ' GP.', 'system');
    phase = 'settled';
    saveStats();
  }

  function resolveWar() {
    var pv = cardValue(warPlayerCard);
    var dv = cardValue(warDealerCard);

    if (pv >= dv) {
      // Player wins war — gets original bet + war bet back, plus 1:1 on original
      // Standard casino war rules: win pays even money on the raise only,
      // original bet pushes. So total return = original bet + 2x war bet = 3x bet.
      var winnings = currentBet * 3;
      walletAdd(winnings);
      lastWinAmount = currentBet;
      resultText = 'YOU WIN THE WAR!';
      resultColor = '#44cc44';
      statusText = '+' + currentBet + ' GP';
      stats.hands++;
      stats.wins++;
      msg('Won the War! +' + currentBet + ' GP.', 'reward');
    } else {
      // Dealer wins war — player loses both bets
      lastWinAmount = 0;
      resultText = 'DEALER WINS THE WAR';
      resultColor = '#cc4444';
      statusText = '-' + (currentBet * 2) + ' GP';
      stats.hands++;
      stats.losses++;
      msg('Lost the War. -' + (currentBet * 2) + ' GP.', 'combat');
    }

    phase = 'settled';
    saveStats();
  }

  function newHand() {
    phase = 'betting';
    statusText = '';
    resultText = '';
    queueClear();
  }

  // ── Button Definitions ────────────────────────────
  function getButtons() {
    var btns = [];
    var btnW = 110, btnH = 30;
    var cx = CW / 2;
    var y = BUTTONS_Y;
    var gap = 14;

    if (phase === 'betting') {
      var totalW = btnW * 4 + gap * 3;
      var startX = cx - totalW / 2;
      var canBet = getBalance() >= BET_STEPS[0];

      btns.push({ x: startX, y: y, w: btnW, h: btnH, label: '- Bet', action: 'bet-down', disabled: !canBet });
      btns.push({ x: startX + btnW + gap, y: y, w: btnW, h: btnH, label: currentBet + ' GP', action: null, disabled: true });
      btns.push({ x: startX + (btnW + gap) * 2, y: y, w: btnW, h: btnH, label: '+ Bet', action: 'bet-up', disabled: !canBet });
      btns.push({ x: startX + (btnW + gap) * 3, y: y, w: btnW, h: btnH, label: 'DEAL', action: 'deal', disabled: !canBet || getBalance() < currentBet });

    } else if (phase === 'war-prompt') {
      var totalW2 = btnW * 2 + gap;
      var startX2 = cx - totalW2 / 2;
      var canWar = getBalance() >= currentBet;
      btns.push({ x: startX2, y: y, w: btnW, h: btnH, label: 'GO TO WAR', action: 'war', disabled: !canWar });
      btns.push({ x: startX2 + btnW + gap, y: y, w: btnW, h: btnH, label: 'SURRENDER', action: 'surrender', disabled: false });

    } else if (phase === 'settled') {
      btns.push({ x: cx - btnW / 2, y: y, w: btnW, h: btnH, label: 'NEW HAND', action: 'new-hand', disabled: false });
    }

    return btns;
  }

  // ── Rendering ─────────────────────────────────────

  function drawBackground(c) {
    // Deep red casino felt
    c.fillStyle = '#2a1520';
    c.fillRect(0, 0, CW, CH);

    // Darker border
    c.fillStyle = '#180c12';
    c.fillRect(0, 0, CW, 24);
    c.fillRect(0, CH - 24, CW, 24);
    c.fillRect(0, 0, 24, CH);
    c.fillRect(CW - 24, 0, 24, CH);

    // Gold trim
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.strokeRect(24, 24, CW - 48, CH - 48);

    // Radial glow
    var grad = c.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, 400);
    grad.addColorStop(0, 'rgba(80,30,50,0.3)');
    grad.addColorStop(1, 'rgba(30,12,20,0)');
    c.fillStyle = grad;
    c.fillRect(24, 24, CW - 48, CH - 48);

    // Center VS divider
    c.font = 'bold 28px serif';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(192,160,64,0.08)';
    c.fillText('VS', CW / 2, CH / 2 + 10);

    // Dashed divider
    c.strokeStyle = 'rgba(192,160,64,0.15)';
    c.lineWidth = 1;
    c.setLineDash([6, 4]);
    c.beginPath();
    c.moveTo(80, CH / 2 - 10);
    c.lineTo(CW / 2 - 50, CH / 2 - 10);
    c.stroke();
    c.beginPath();
    c.moveTo(CW / 2 + 50, CH / 2 - 10);
    c.lineTo(CW - 80, CH / 2 - 10);
    c.stroke();
    c.setLineDash([]);

    // Subtitle text
    c.font = '10px monospace';
    c.fillStyle = 'rgba(192,160,64,0.12)';
    c.fillText('HIGHEST CARD WINS', CW / 2, CH / 2 + 30);
    c.fillText('TIE GOES TO WAR', CW / 2, CH / 2 + 44);
    c.textAlign = 'left';
  }

  function drawHUD(c) {
    // Title
    c.font = 'bold 18px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('CASINO WARS', CW / 2, HUD_Y);

    // Balance
    c.font = 'bold 14px monospace';
    c.textAlign = 'right';
    c.fillStyle = '#e0c860';
    c.fillText(getBalance() + ' GP', CW - 40, HUD_Y);

    // Stats
    c.font = '10px monospace';
    c.fillStyle = '#8a7a5a';
    c.fillText('W:' + stats.wins + ' L:' + stats.losses + ' War:' + stats.wars, CW - 40, HUD_Y + 16);
    c.textAlign = 'left';
  }

  function drawDealerArea(c) {
    // Label
    c.font = '13px monospace';
    c.fillStyle = '#8a7a5a';
    c.textAlign = 'center';
    c.fillText('DEALER', CW / 2, DEALER_LABEL_Y);
    c.textAlign = 'left';

    if (!dealerCard) {
      Cards.renderCardSlot(c, CW / 2 - CARD_W / 2, DEALER_CARD_Y, CARD_SCALE);
      return;
    }

    Cards.renderCard(c, CW / 2 - CARD_W / 2, DEALER_CARD_Y, dealerCard, dealerRevealed, CARD_SCALE);

    // Value label when revealed
    if (dealerRevealed) {
      c.font = 'bold 14px monospace';
      c.textAlign = 'center';
      c.fillStyle = '#e0d0a0';
      c.fillText(dealerCard.rank + dealerCard.suit.symbol, CW / 2, DEALER_CARD_Y + CARD_H + 20);
      c.textAlign = 'left';
    }
  }

  function drawPlayerArea(c) {
    // Label
    c.font = '13px monospace';
    c.textAlign = 'center';
    c.fillStyle = phase === 'dealing' || phase === 'war-dealing' ? '#e0c860' : '#8a7a5a';
    c.fillText('YOUR CARD', CW / 2, PLAYER_LABEL_Y);
    c.textAlign = 'left';

    if (!playerCard) {
      Cards.renderCardSlot(c, CW / 2 - CARD_W / 2, PLAYER_CARD_Y, CARD_SCALE);
      return;
    }

    Cards.renderCard(c, CW / 2 - CARD_W / 2, PLAYER_CARD_Y, playerCard, playerRevealed, CARD_SCALE);

    // Value label
    if (playerRevealed) {
      c.font = 'bold 14px monospace';
      c.textAlign = 'center';
      c.fillStyle = '#e0d0a0';
      c.fillText(playerCard.rank + playerCard.suit.symbol, CW / 2, PLAYER_CARD_Y + CARD_H + 20);
      c.textAlign = 'left';
    }

    // Bet amount
    if (phase !== 'betting') {
      c.font = '11px monospace';
      c.fillStyle = '#c0a040';
      c.textAlign = 'center';
      var betLabel = 'Bet: ' + currentBet + ' GP';
      if (inWar) betLabel = 'Total Bet: ' + (currentBet * 2) + ' GP';
      c.fillText(betLabel, CW / 2, PLAYER_CARD_Y + CARD_H + 36);
      c.textAlign = 'left';
    }
  }

  function drawWarArea(c) {
    if (!inWar) return;

    // Draw burn cards (face-down, stacked with slight offset)
    var burnStartX = CW / 2 - ((WAR_BURN - 1) * 12 + CARD_W * 0.7) / 2;
    var burnScale = 0.7 * (CARD_SCALE / 1.6); // smaller scale for burns
    var bw = Cards.CARD_W * burnScale * 1.6;

    for (var i = 0; i < burnCards.length; i++) {
      var bx = burnStartX + i * 12;
      Cards.renderCard(c, bx, BURN_Y, burnCards[i], false, burnScale * 1.6);
    }

    if (burnCards.length > 0) {
      c.font = '9px monospace';
      c.fillStyle = 'rgba(192,160,64,0.4)';
      c.textAlign = 'center';
      c.fillText(burnCards.length + ' burned', CW / 2, BURN_Y - 8);
      c.textAlign = 'left';
    }

    // War cards — offset to left/right of center
    var warOffset = CARD_W + 20;

    if (warPlayerCard) {
      var wpx = CW / 2 - warOffset - CARD_W / 2;
      Cards.renderCard(c, wpx, BURN_Y + 8, warPlayerCard, warPlayerRevealed, CARD_SCALE);

      if (warPlayerRevealed) {
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillStyle = '#e0d0a0';
        c.fillText(warPlayerCard.rank + warPlayerCard.suit.symbol, wpx + CARD_W / 2, BURN_Y + CARD_H + 26);
        c.textAlign = 'left';
      }

      c.font = '10px monospace';
      c.fillStyle = '#8a7a5a';
      c.textAlign = 'center';
      c.fillText('YOU', wpx + CARD_W / 2, BURN_Y - 2);
      c.textAlign = 'left';
    }

    if (warDealerCard) {
      var wdx = CW / 2 + warOffset - CARD_W / 2;
      Cards.renderCard(c, wdx, BURN_Y + 8, warDealerCard, warDealerRevealed, CARD_SCALE);

      if (warDealerRevealed) {
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillStyle = '#e0d0a0';
        c.fillText(warDealerCard.rank + warDealerCard.suit.symbol, wdx + CARD_W / 2, BURN_Y + CARD_H + 26);
        c.textAlign = 'left';
      }

      c.font = '10px monospace';
      c.fillStyle = '#8a7a5a';
      c.textAlign = 'center';
      c.fillText('DEALER', wdx + CARD_W / 2, BURN_Y - 2);
      c.textAlign = 'left';
    }
  }

  function drawResult(c) {
    if (!resultText) return;

    c.font = 'bold 16px monospace';
    c.textAlign = 'center';
    c.fillStyle = resultColor;
    c.fillText(resultText, CW / 2, STATUS_Y - 20);
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
    drawWarArea(ctx);
    drawResult(ctx);
    drawStatusText(ctx);
    drawActionButtons(ctx);
    Cards.renderBackButton(ctx, 'Leave Table');

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
      leave();
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
    switch (action) {
      case 'bet-up':
        betStepIndex = Math.min(betStepIndex + 1, BET_STEPS.length - 1);
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
      case 'war':
        goToWar();
        break;
      case 'surrender':
        doSurrender();
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

    phase = 'betting';
    resetRound();
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
    // Forfeit in-progress round (bet already deducted)
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
  window.RpgCasinoWars = {
    enter: enter,
    leave: leave,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
