/* ══════════════════════════════════════════════════
   RPG SLOTS — Canvas-based slot machine.
   3 reels, 5 paylines, hold & nudge features.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var Cards = window.RpgCards; // for renderButton, renderBackButton, hitTest
  var CW = 1060, CH = 660;

  // ── Symbols ───────────────────────────────────────
  // Each symbol has a name, emoji/char, color, and payout multiplier (for 3 of a kind)
  var SYMBOLS = [
    { id: 'cherry',   ch: '\uD83C\uDF52', color: '#ee3333', pay3: 5,   pay2: 2 },
    { id: 'lemon',    ch: '\uD83C\uDF4B', color: '#eedd22', pay3: 8,   pay2: 3 },
    { id: 'orange',   ch: '\uD83C\uDF4A', color: '#ee8822', pay3: 10,  pay2: 3 },
    { id: 'plum',     ch: '\uD83C\uDF51', color: '#9944cc', pay3: 15,  pay2: 4 },
    { id: 'bell',     ch: '\uD83D\uDD14', color: '#ffcc00', pay3: 20,  pay2: 5 },
    { id: 'bar',      ch: 'BAR',          color: '#ffffff', pay3: 40,  pay2: 8 },
    { id: 'seven',    ch: '7',            color: '#ff2222', pay3: 77,  pay2: 10 },
    { id: 'diamond',  ch: '\u2666',       color: '#44ddff', pay3: 150, pay2: 15 }
  ];

  // Weighted reel strip (lower-value symbols more common)
  var REEL_STRIP = [];
  (function buildStrip() {
    var weights = [8, 7, 6, 5, 4, 3, 2, 1]; // cherry most common, diamond rarest
    for (var i = 0; i < SYMBOLS.length; i++) {
      for (var w = 0; w < weights[i]; w++) {
        REEL_STRIP.push(i);
      }
    }
  })();

  var REEL_LEN = REEL_STRIP.length;

  // ── Paylines (row indices for each reel: 0=top, 1=mid, 2=bottom) ──
  var PAYLINES = [
    { rows: [1, 1, 1], color: '#ff4444', name: 'Middle' },     // straight middle
    { rows: [0, 0, 0], color: '#44ff44', name: 'Top' },        // straight top
    { rows: [2, 2, 2], color: '#4444ff', name: 'Bottom' },     // straight bottom
    { rows: [0, 1, 2], color: '#ffaa00', name: 'Diagonal ↘' }, // top-left to bottom-right
    { rows: [2, 1, 0], color: '#ff44ff', name: 'Diagonal ↗' }  // bottom-left to top-right
  ];

  var BET_STEPS = [1, 2, 5, 10, 25, 50, 100];
  var NUM_REELS = 3;
  var ROWS_VISIBLE = 3;

  // ── Layout ────────────────────────────────────────
  var HUD_Y = 42;
  var MACHINE_X = CW / 2 - 200;
  var MACHINE_Y = 75;
  var MACHINE_W = 400;
  var MACHINE_H = 420;
  var REEL_W = 100;
  var REEL_H = 270;
  var REEL_GAP = 16;
  var REEL_TOP = MACHINE_Y + 80;
  var CELL_H = REEL_H / ROWS_VISIBLE;  // 90px per symbol
  var STATUS_Y = 530;
  var BUTTONS_Y = 565;

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null;
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;

  // Reel positions (fractional index into REEL_STRIP)
  var reelPos = [0, 0, 0];
  var reelSpeed = [0, 0, 0];
  var reelTarget = [-1, -1, -1]; // target stop position (-1 = not stopping)
  var reelStopped = [true, true, true];

  // Phase: betting | spinning | evaluating | showing-win | settled
  var phase = 'betting';
  var statusText = '';
  var currentBet = 5;       // bet per line
  var betStepIndex = 2;
  var linesActive = 5;       // how many paylines active (1-5)

  // Win display
  var winAmount = 0;
  var winLines = [];         // [{ lineIndex, symbolId, multiplier }]
  var winFlashTimer = 0;

  // Spin timing
  var SPIN_SPEED = 18;       // symbols per second
  var SPIN_MIN_TIME = 0.6;   // min seconds first reel spins
  var REEL_STAGGER = 0.35;   // seconds between each reel stopping
  var spinTimer = 0;


  // Stats
  var stats = { spins: 0, wins: 0, losses: 0, biggestWin: 0, totalWon: 0, totalBet: 0 };
  var STATS_KEY = 'arebooksgood-casino-slots-stats';

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

  function getReelX(reelIndex) {
    var totalW = NUM_REELS * REEL_W + (NUM_REELS - 1) * REEL_GAP;
    var startX = MACHINE_X + (MACHINE_W - totalW) / 2;
    return startX + reelIndex * (REEL_W + REEL_GAP);
  }

  // Get symbol index on a reel at a given position offset (0=top visible, 1=mid, 2=bottom)
  function getSymbolAt(reelIndex, rowOffset) {
    var basePos = Math.floor(reelPos[reelIndex]);
    var idx = (basePos + rowOffset) % REEL_LEN;
    if (idx < 0) idx += REEL_LEN;
    return REEL_STRIP[idx];
  }

  function getTotalBet() {
    return currentBet * linesActive;
  }

  // ── Stats Persistence ─────────────────────────────
  function loadStats() {
    try {
      var saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        stats.spins = parsed.spins || 0;
        stats.wins = parsed.wins || 0;
        stats.losses = parsed.losses || 0;
        stats.biggestWin = parsed.biggestWin || 0;
        stats.totalWon = parsed.totalWon || 0;
        stats.totalBet = parsed.totalBet || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) { /* ignore */ }
  }

  // ── Game Logic ────────────────────────────────────
  function startSpin() {
    var total = getTotalBet();
    if (getBalance() < total) {
      statusText = 'Not enough GP!';
      return;
    }

    walletDeduct(total);
    stats.totalBet += total;

    phase = 'spinning';
    statusText = '';
    winAmount = 0;
    winLines = [];
    winFlashTimer = 0;
    spinTimer = 0;

    // Randomize starting positions a bit
    for (var i = 0; i < NUM_REELS; i++) {
      reelPos[i] = Math.random() * REEL_LEN;
      reelSpeed[i] = SPIN_SPEED + Math.random() * 4;
      reelTarget[i] = -1;
      reelStopped[i] = false;
    }
  }

  function updateReels(dt) {
    if (phase !== 'spinning') return;

    spinTimer += dt;

    for (var i = 0; i < NUM_REELS; i++) {
      if (reelStopped[i]) continue;

      // Check if this reel should start stopping
      var stopTime = SPIN_MIN_TIME + i * REEL_STAGGER;
      if (spinTimer >= stopTime && reelTarget[i] === -1) {
        // Pick a random final position
        reelTarget[i] = Math.floor(Math.random() * REEL_LEN);
      }

      if (reelTarget[i] >= 0) {
        // Decelerate toward target
        reelSpeed[i] *= 0.92;

        // Force-snap when speed is negligible (prevents overshoot stall)
        if (reelSpeed[i] < 0.3) {
          reelPos[i] = reelTarget[i];
          reelSpeed[i] = 0;
          reelStopped[i] = true;
          continue;
        }

        // Snap when close and slow enough
        var dist = reelTarget[i] - reelPos[i];
        while (dist < 0) dist += REEL_LEN;
        dist = dist % REEL_LEN;

        if (reelSpeed[i] < 1.5 && dist < 1.5) {
          reelPos[i] = reelTarget[i];
          reelSpeed[i] = 0;
          reelStopped[i] = true;
          continue;
        }
      }

      // Advance reel position
      reelPos[i] = (reelPos[i] + reelSpeed[i] * dt) % REEL_LEN;
    }

    // All reels stopped?
    if (reelStopped[0] && reelStopped[1] && reelStopped[2]) {
      phase = 'evaluating';
      evaluateResult();
    }
  }

  function evaluateResult() {
    winLines = [];
    winAmount = 0;

    for (var li = 0; li < linesActive; li++) {
      var line = PAYLINES[li];
      var s0 = getSymbolAt(0, line.rows[0]);
      var s1 = getSymbolAt(1, line.rows[1]);
      var s2 = getSymbolAt(2, line.rows[2]);

      if (s0 === s1 && s1 === s2) {
        // 3 of a kind
        var sym = SYMBOLS[s0];
        var payout = sym.pay3 * currentBet;
        winAmount += payout;
        winLines.push({ lineIndex: li, symbolId: s0, multiplier: sym.pay3, count: 3 });
      } else if (s0 === s1 || s1 === s2) {
        // 2 of a kind (first two or last two)
        var matchSym = (s0 === s1) ? s0 : s1;
        var sym2 = SYMBOLS[matchSym];
        var payout2 = sym2.pay2 * currentBet;
        winAmount += payout2;
        winLines.push({ lineIndex: li, symbolId: matchSym, multiplier: sym2.pay2, count: 2 });
      }
    }

    if (winAmount > 0) {
      walletAdd(winAmount);
      stats.wins++;
      stats.totalWon += winAmount;
      if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;

      var lineNames = [];
      for (var w = 0; w < winLines.length; w++) {
        lineNames.push(SYMBOLS[winLines[w].symbolId].id + ' x' + winLines[w].count);
      }
      statusText = 'WIN ' + winAmount + ' GP!';
      msg('Slots win! +' + winAmount + ' GP (' + lineNames.join(', ') + ').', 'reward');
      phase = 'showing-win';
    } else {
      stats.losses++;
      statusText = 'No win';
      phase = 'settled';
    }

    stats.spins++;
    saveStats();
  }

  function updateWinDisplay(dt) {
    if (phase !== 'showing-win') return;
    winFlashTimer += dt;
    // Show win for 2 seconds, then auto-advance
    if (winFlashTimer >= 2.0) {
      phase = 'settled';
    }
  }

  // ── Button Definitions ────────────────────────────
  function getButtons() {
    var btns = [];
    var btnW = 100, btnH = 30;
    var cx = CW / 2;
    var y = BUTTONS_Y;
    var gap = 12;

    if (phase === 'betting' || phase === 'settled') {
      // Lines -/+, Bet -/+, Spin
      var smallW = 70;
      var totalW = smallW * 2 + btnW * 2 + 120 + gap * 4;
      var startX = cx - totalW / 2;
      var canSpin = getBalance() >= getTotalBet() && getTotalBet() > 0;

      btns.push({ x: startX, y: y, w: smallW, h: btnH, label: '- Line', action: 'line-down', disabled: linesActive <= 1 });
      btns.push({ x: startX + smallW + gap, y: y, w: btnW, h: btnH, label: linesActive + ' Line' + (linesActive > 1 ? 's' : ''), action: null, disabled: true });
      btns.push({ x: startX + smallW + btnW + gap * 2, y: y, w: smallW, h: btnH, label: '+ Line', action: 'line-up', disabled: linesActive >= PAYLINES.length });

      var betX = startX + smallW * 2 + btnW + gap * 3;
      btns.push({ x: betX, y: y, w: btnW, h: btnH, label: currentBet + ' GP/line', action: null, disabled: true });

      // Bet arrows (smaller, above/below the bet display)
      btns.push({ x: betX - smallW - gap, y: y, w: smallW, h: btnH, label: '- Bet', action: 'bet-down', disabled: betStepIndex <= 0 });
      btns.push({ x: betX + btnW + gap, y: y, w: smallW, h: btnH, label: '+ Bet', action: 'bet-up', disabled: betStepIndex >= BET_STEPS.length - 1 });

      // Spin button
      btns.push({ x: cx + 200, y: y - 5, w: 120, h: 40, label: 'SPIN', action: 'spin', disabled: !canSpin });

      // Total bet indicator (second row)
      btns.push({ x: cx - 60, y: y + 38, w: 120, h: 22, label: 'Total: ' + getTotalBet() + ' GP', action: null, disabled: true });
    }

    return btns;
  }

  // ── Rendering ─────────────────────────────────────

  function drawBackground(c) {
    // Dark purple/navy casino background
    c.fillStyle = '#12081e';
    c.fillRect(0, 0, CW, CH);

    // Machine body
    var grad = c.createLinearGradient(MACHINE_X, MACHINE_Y, MACHINE_X, MACHINE_Y + MACHINE_H);
    grad.addColorStop(0, '#2a1a3a');
    grad.addColorStop(0.5, '#1e1028');
    grad.addColorStop(1, '#2a1a3a');
    c.fillStyle = grad;
    Cards.renderButton; // noop, just using roundRect pattern
    roundRect(c, MACHINE_X, MACHINE_Y, MACHINE_W, MACHINE_H, 12);
    c.fillStyle = grad;
    c.fill();

    // Machine border (gold)
    c.strokeStyle = '#c0a040';
    c.lineWidth = 3;
    roundRect(c, MACHINE_X, MACHINE_Y, MACHINE_W, MACHINE_H, 12);
    c.stroke();

    // Inner gold trim
    c.strokeStyle = 'rgba(224,192,96,0.3)';
    c.lineWidth = 1;
    roundRect(c, MACHINE_X + 4, MACHINE_Y + 4, MACHINE_W - 8, MACHINE_H - 8, 10);
    c.stroke();

    // Machine title
    c.font = 'bold 20px serif';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('\u2605 LUCKY SLOTS \u2605', CW / 2, MACHINE_Y + 28);

    // Subtitle
    c.font = '10px monospace';
    c.fillStyle = 'rgba(192,160,64,0.4)';
    c.fillText('Match symbols to win!', CW / 2, MACHINE_Y + 44);
    c.textAlign = 'left';

    // Reel window background
    var totalReelW = NUM_REELS * REEL_W + (NUM_REELS - 1) * REEL_GAP;
    var reelWindowX = MACHINE_X + (MACHINE_W - totalReelW) / 2 - 10;
    roundRect(c, reelWindowX, REEL_TOP - 10, totalReelW + 20, REEL_H + 20, 6);
    c.fillStyle = '#0a0612';
    c.fill();
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    roundRect(c, reelWindowX, REEL_TOP - 10, totalReelW + 20, REEL_H + 20, 6);
    c.stroke();
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

  function drawReels(c) {
    for (var ri = 0; ri < NUM_REELS; ri++) {
      var rx = getReelX(ri);

      // Reel background
      c.fillStyle = '#0e0818';
      c.fillRect(rx, REEL_TOP, REEL_W, REEL_H);

      // Draw symbols with scrolling offset
      c.save();
      c.beginPath();
      c.rect(rx, REEL_TOP, REEL_W, REEL_H);
      c.clip();

      var pos = reelPos[ri];
      var baseIdx = Math.floor(pos);
      var frac = pos - baseIdx;
      var offsetY = -frac * CELL_H;

      // Draw 4 symbols (one extra for smooth scrolling)
      for (var row = -1; row < ROWS_VISIBLE + 1; row++) {
        var symIdx = (baseIdx + row) % REEL_LEN;
        if (symIdx < 0) symIdx += REEL_LEN;
        var sym = SYMBOLS[REEL_STRIP[symIdx]];
        var sy = REEL_TOP + row * CELL_H + offsetY;

        // Symbol
        if (sym.ch.length <= 3) {
          // Text-based symbol (BAR, 7, diamond)
          c.font = 'bold 36px serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = sym.color;
          c.fillText(sym.ch, rx + REEL_W / 2, sy + CELL_H / 2);
        } else {
          // Emoji symbol
          c.font = '40px serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(sym.ch, rx + REEL_W / 2, sy + CELL_H / 2);
        }

        // Cell divider
        c.strokeStyle = 'rgba(192,160,64,0.1)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(rx, sy + CELL_H);
        c.lineTo(rx + REEL_W, sy + CELL_H);
        c.stroke();
      }

      c.restore();

      // Reel border
      c.strokeStyle = 'rgba(192,160,64,0.3)';
      c.lineWidth = 1;
      c.strokeRect(rx, REEL_TOP, REEL_W, REEL_H);

      // Reel separator
      if (ri < NUM_REELS - 1) {
        c.fillStyle = 'rgba(192,160,64,0.15)';
        c.fillRect(rx + REEL_W + REEL_GAP / 2 - 1, REEL_TOP, 2, REEL_H);
      }
    }
  }

  function drawPaylines(c) {
    // Draw active payline indicators on the left side (evenly spaced to avoid overlap)
    var indicatorSpacing = REEL_H / (PAYLINES.length + 1);
    for (var li = 0; li < linesActive; li++) {
      var line = PAYLINES[li];
      var ly = REEL_TOP + indicatorSpacing * (li + 1);
      var indicatorX = getReelX(0) - 22;

      // Small colored circle
      c.beginPath();
      c.arc(indicatorX, ly, 6, 0, Math.PI * 2);
      c.fillStyle = line.color;
      c.globalAlpha = 0.7;
      c.fill();
      c.globalAlpha = 1;

      // Number
      c.font = 'bold 8px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#fff';
      c.fillText('' + (li + 1), indicatorX, ly);
    }

    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }

  function drawWinLines(c) {
    if (winLines.length === 0) return;
    if (phase !== 'showing-win' && phase !== 'settled') return;

    // Flash effect
    var flash = Math.sin(winFlashTimer * 8) > 0;
    if (phase === 'settled') flash = true; // solid when settled

    for (var w = 0; w < winLines.length; w++) {
      var wl = winLines[w];
      var line = PAYLINES[wl.lineIndex];

      if (!flash && phase === 'showing-win') continue;

      c.strokeStyle = line.color;
      c.lineWidth = 3;
      c.globalAlpha = 0.8;
      c.beginPath();

      for (var ri = 0; ri < NUM_REELS; ri++) {
        var rx = getReelX(ri) + REEL_W / 2;
        var ry = REEL_TOP + line.rows[ri] * CELL_H + CELL_H / 2;
        if (ri === 0) c.moveTo(rx, ry);
        else c.lineTo(rx, ry);
      }
      c.stroke();
      c.globalAlpha = 1;

      // Highlight winning cells
      for (var ri2 = 0; ri2 < NUM_REELS; ri2++) {
        var cellX = getReelX(ri2);
        var cellY = REEL_TOP + line.rows[ri2] * CELL_H;
        c.fillStyle = line.color;
        c.globalAlpha = 0.15;
        c.fillRect(cellX, cellY, REEL_W, CELL_H);
        c.globalAlpha = 1;
      }
    }
  }

  function drawHUD(c) {
    // Title
    c.font = 'bold 18px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('SLOT MACHINES', CW / 2, HUD_Y);

    // Balance
    c.font = 'bold 14px monospace';
    c.textAlign = 'right';
    c.fillStyle = '#e0c860';
    c.fillText(getBalance() + ' GP', CW - 40, HUD_Y);

    // Stats
    c.font = '10px monospace';
    c.fillStyle = '#8a7a5a';
    c.fillText('Spins:' + stats.spins + ' W:' + stats.wins + ' Best:' + stats.biggestWin, CW - 40, HUD_Y + 16);
    c.textAlign = 'left';
  }

  function drawPaytable(c) {
    // Draw paytable on the right side of the machine
    var px = MACHINE_X + MACHINE_W + 30;
    var py = MACHINE_Y + 20;

    c.font = 'bold 12px monospace';
    c.fillStyle = '#c0a040';
    c.fillText('PAYTABLE', px, py);
    py += 6;

    c.font = '10px monospace';
    for (var i = SYMBOLS.length - 1; i >= 0; i--) {
      var sym = SYMBOLS[i];
      py += 18;

      // Symbol
      if (sym.ch.length <= 3) {
        c.fillStyle = sym.color;
        c.font = 'bold 14px serif';
        c.fillText(sym.ch, px, py);
        c.font = '10px monospace';
      } else {
        c.font = '14px serif';
        c.fillText(sym.ch, px, py);
        c.font = '10px monospace';
      }

      // Payouts
      c.fillStyle = '#d0c0a0';
      c.fillText('x3=' + sym.pay3, px + 32, py);
      c.fillStyle = '#8a7a5a';
      c.fillText('x2=' + sym.pay2, px + 80, py);
    }

    // Payline legend
    py += 30;
    c.font = 'bold 11px monospace';
    c.fillStyle = '#c0a040';
    c.fillText('PAYLINES', px, py);

    for (var li = 0; li < PAYLINES.length; li++) {
      py += 16;
      c.beginPath();
      c.arc(px + 6, py - 4, 5, 0, Math.PI * 2);
      c.fillStyle = PAYLINES[li].color;
      c.globalAlpha = 0.7;
      c.fill();
      c.globalAlpha = 1;

      c.font = '9px monospace';
      c.fillStyle = '#8a7a5a';
      c.fillText(PAYLINES[li].name, px + 16, py);
    }
  }

  function drawStatusText(c) {
    if (!statusText) return;

    var isWin = phase === 'showing-win' || (phase === 'settled' && winAmount > 0);
    c.font = 'bold ' + (isWin ? '16' : '14') + 'px monospace';
    c.textAlign = 'center';
    c.fillStyle = isWin ? '#ffd700' : '#e0d0a0';
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
    drawReels(ctx);
    drawPaylines(ctx);
    drawWinLines(ctx);
    drawHUD(ctx);
    drawPaytable(ctx);
    drawStatusText(ctx);
    drawActionButtons(ctx);
    Cards.renderBackButton(ctx, 'Leave Machine');

    ctx.restore();
  }

  // ── Click Handler ─────────────────────────────────
  function onClick(e) {
    if (!canvas) return;
    if (phase === 'spinning' || phase === 'evaluating') return;

    // Auto-advance from win display
    if (phase === 'showing-win') {
      phase = 'settled';
      return;
    }

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
        while (betStepIndex > 0 && BET_STEPS[betStepIndex] * linesActive > getBalance()) betStepIndex--;
        currentBet = BET_STEPS[betStepIndex];
        break;
      case 'bet-down':
        betStepIndex = Math.max(betStepIndex - 1, 0);
        currentBet = BET_STEPS[betStepIndex];
        break;
      case 'line-up':
        linesActive = Math.min(linesActive + 1, PAYLINES.length);
        break;
      case 'line-down':
        linesActive = Math.max(linesActive - 1, 1);
        break;
      case 'spin':
        if (phase === 'settled') {
          // Reset for new spin
          winAmount = 0;
          winLines = [];
          statusText = '';
        }
        startSpin();
        break;
    }
  }

  // ── Animation Loop ────────────────────────────────
  function loop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;
    frameCount++;

    updateReels(dt);
    updateWinDisplay(dt);
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
    statusText = '';
    winAmount = 0;
    winLines = [];
    winFlashTimer = 0;
    frameCount = 0;
    lastTimestamp = 0;

    // Randomize initial reel display
    for (var i = 0; i < NUM_REELS; i++) {
      reelPos[i] = Math.floor(Math.random() * REEL_LEN);
      reelSpeed[i] = 0;
      reelTarget[i] = -1;
      reelStopped[i] = true;
    }

    loadStats();

    // Cap bet to balance
    if (getTotalBet() > getBalance() && getBalance() > 0) {
      currentBet = BET_STEPS[0];
      betStepIndex = 0;
      linesActive = 1;
    }

    canvas.addEventListener('click', onClick);
    startLoop();
  }

  function leave() {
    stopLoop();
    if (canvas) canvas.removeEventListener('click', onClick);
    if (phase === 'spinning' || phase === 'evaluating') {
      msg('Left the machine — spin forfeited.', 'system');
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
  window.RpgSlots = {
    enter: enter,
    leave: leave,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
