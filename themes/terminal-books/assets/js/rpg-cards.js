/* ══════════════════════════════════════════════════
   RPG CARDS — Shared card rendering, deck ops,
   and hand evaluation for all casino games.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Card Data ───────────────────────────────────
  var SUITS = [
    { name: 'spades',   symbol: '\u2660', color: '#222' },
    { name: 'hearts',   symbol: '\u2665', color: '#cc2222' },
    { name: 'diamonds', symbol: '\u2666', color: '#cc2222' },
    { name: 'clubs',    symbol: '\u2663', color: '#222' }
  ];

  var RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  var RANK_VALUES = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
    'J':11,'Q':12,'K':13,'A':14
  };

  // ── Deck Operations ─────────────────────────────

  function createDeck(numDecks) {
    var deck = [];
    var n = numDecks || 1;
    for (var d = 0; d < n; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) {
          deck.push({ rank: RANKS[r], suit: SUITS[s] });
        }
      }
    }
    return deck;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function drawCard(deck) {
    return deck.pop();
  }

  // ── Canvas Card Rendering ───────────────────────

  // Standard card dimensions (logical px, pre-scale)
  var CARD_W = 42;
  var CARD_H = 60;
  var CARD_RADIUS = 4;

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

  function renderCard(c, x, y, card, faceUp, scale) {
    var s = scale || 1;
    var w = CARD_W * s;
    var h = CARD_H * s;
    var r = CARD_RADIUS * s;

    c.save();

    if (!faceUp) {
      // Card back
      roundRect(c, x, y, w, h, r);
      c.fillStyle = '#1a3a6a';
      c.fill();
      c.strokeStyle = '#c0a040';
      c.lineWidth = 1;
      c.stroke();

      // Diamond pattern
      var patternStep = 6 * s;
      c.fillStyle = 'rgba(192,160,64,0.15)';
      for (var py = y + patternStep; py < y + h - patternStep / 2; py += patternStep) {
        for (var px = x + patternStep; px < x + w - patternStep / 2; px += patternStep) {
          c.beginPath();
          c.moveTo(px, py - 2 * s);
          c.lineTo(px + 2 * s, py);
          c.lineTo(px, py + 2 * s);
          c.lineTo(px - 2 * s, py);
          c.fill();
        }
      }

      // Inner border
      var inset = 3 * s;
      c.strokeStyle = 'rgba(192,160,64,0.3)';
      c.lineWidth = 1;
      roundRect(c, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(0, r - 1));
      c.stroke();

      c.restore();
      return;
    }

    // Card face
    roundRect(c, x, y, w, h, r);
    c.fillStyle = '#f5f0e0';
    c.fill();
    c.strokeStyle = '#555';
    c.lineWidth = 1.5;
    c.stroke();

    var suitColor = card.suit.color;
    var rankStr = card.rank;
    var suitStr = card.suit.symbol;

    // Top-left rank + suit
    c.fillStyle = suitColor;
    c.font = 'bold ' + Math.round(11 * s) + 'px monospace';
    c.textAlign = 'center';
    c.fillText(rankStr, x + 9 * s, y + 13 * s);
    c.font = Math.round(10 * s) + 'px serif';
    c.fillText(suitStr, x + 9 * s, y + 23 * s);

    // Center suit (large)
    c.font = Math.round(22 * s) + 'px serif';
    c.fillText(suitStr, x + w / 2, y + h / 2 + 6 * s);

    // Bottom-right rank + suit (inverted)
    c.save();
    c.translate(x + w - 9 * s, y + h - 8 * s);
    c.rotate(Math.PI);
    c.fillStyle = suitColor;
    c.font = 'bold ' + Math.round(11 * s) + 'px monospace';
    c.fillText(rankStr, 0, 5 * s);
    c.font = Math.round(10 * s) + 'px serif';
    c.fillText(suitStr, 0, 15 * s);
    c.restore();

    // Face card letter indicator
    if (rankStr === 'J' || rankStr === 'Q' || rankStr === 'K') {
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.font = 'bold ' + Math.round(28 * s) + 'px serif';
      c.textAlign = 'center';
      c.fillText(rankStr, x + w / 2, y + h / 2 + 2 * s);
    }

    c.textAlign = 'left';
    c.restore();
  }

  // Render a placeholder slot where a card would go
  function renderCardSlot(c, x, y, scale) {
    var s = scale || 1;
    var w = CARD_W * s;
    var h = CARD_H * s;
    var r = CARD_RADIUS * s;
    roundRect(c, x, y, w, h, r);
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 1;
    c.stroke();
  }

  // ── Poker Hand Evaluation ───────────────────────

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
    counts.sort(function (a, b) {
      return b.count - a.count || b.value - a.value;
    });

    var uniqueVals = [];
    for (var ci = 0; ci < counts.length; ci++) {
      uniqueVals.push(counts[ci].value);
    }

    var isStraight = (counts.length === 5) && checkStraight(values);

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

  // Best 5 out of 7 (for Hold'em)
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

  // Blackjack hand value (returns { value, soft })
  function bjValue(cards) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].rank;
      if (r === 'A') {
        aces++;
        total += 11;
      } else if (r === 'K' || r === 'Q' || r === 'J') {
        total += 10;
      } else {
        total += parseInt(r, 10);
      }
    }
    var soft = aces > 0;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    if (aces === 0) soft = false;
    return { value: total, soft: soft };
  }

  // ── Canvas UI Helpers ───────────────────────────

  // Draw a clickable button region on canvas
  function renderButton(c, x, y, w, h, label, opts) {
    opts = opts || {};
    var disabled = opts.disabled || false;
    var active = opts.active || false;
    var r = 3;

    // Shadow
    if (!disabled) {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(c, x + 2, y + 2, w, h, r);
      c.fill();
    }

    // Background
    roundRect(c, x, y, w, h, r);
    if (disabled) {
      c.fillStyle = 'rgba(40,30,20,0.6)';
    } else if (active) {
      c.fillStyle = 'rgba(80,60,20,0.9)';
    } else {
      c.fillStyle = 'rgba(0,0,0,0.85)';
    }
    c.fill();

    // Border
    c.strokeStyle = disabled ? '#6a5a40' : '#c0a040';
    c.lineWidth = disabled ? 1 : 2;
    roundRect(c, x, y, w, h, r);
    c.stroke();

    if (!disabled) {
      // Inner border
      c.strokeStyle = '#e0c060';
      c.lineWidth = 1;
      roundRect(c, x + 2, y + 2, w - 4, h - 4, Math.max(0, r - 1));
      c.stroke();
    }

    // Label
    c.fillStyle = disabled ? '#6a5a40' : '#ffdd44';
    c.font = 'bold 13px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, x + w / 2, y + h / 2);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }

  // Check if a point is inside a rect
  function hitTest(cx, cy, x, y, w, h) {
    return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
  }

  // Draw a "← Back" button (top-left, consistent across all game views)
  function renderBackButton(c, label) {
    var text = '\u2190 ' + (label || 'Leave Table');
    c.font = 'bold 15px monospace';
    c.textAlign = 'left';
    var tw = c.measureText(text).width;
    var bx = 36, by = 34;
    var bw = tw + 22, bh = 26;

    c.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(c, bx + 2, by + 2, bw, bh, 3);
    c.fill();
    roundRect(c, bx, by, bw, bh, 3);
    c.fillStyle = 'rgba(0,0,0,0.85)';
    c.fill();
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    roundRect(c, bx, by, bw, bh, 3);
    c.stroke();
    c.strokeStyle = '#e0c060';
    c.lineWidth = 1;
    roundRect(c, bx + 2, by + 2, bw - 4, bh - 4, 2);
    c.stroke();
    c.fillStyle = '#ffdd44';
    c.fillText(text, bx + 10, by + 18);

    // Return the hit region for click detection
    return { x: bx, y: by, w: bw, h: bh };
  }

  // ── Public API ──────────────────────────────────
  window.RpgCards = {
    // Data
    SUITS: SUITS,
    RANKS: RANKS,
    RANK_VALUES: RANK_VALUES,
    CARD_W: CARD_W,
    CARD_H: CARD_H,

    // Deck operations
    createDeck: createDeck,
    shuffle: shuffle,
    drawCard: drawCard,

    // Canvas rendering
    renderCard: renderCard,
    renderCardSlot: renderCardSlot,
    renderButton: renderButton,
    renderBackButton: renderBackButton,

    // Hit testing
    hitTest: hitTest,

    // Hand evaluation
    evaluateHand: evaluateHand,
    evaluate5: evaluate5,
    compareHands: compareHands,
    bjValue: bjValue
  };
})();
