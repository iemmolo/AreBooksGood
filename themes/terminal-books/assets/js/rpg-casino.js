/* ══════════════════════════════════════════════════
   RPG CASINO INTERIOR
   Canvas-based casino floor with game tables.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────
  var CW = 1060, CH = 660; // same as MAP_W/MAP_H
  var WALL = 30;
  var PLAYER_SPEED = 180;
  var ENTER_RADIUS = 45;

  // Casino table/station hotspots
  var TABLES = {
    holdem:    { x: 200,  y: 210, w: 160, h: 100, name: 'No Limit Hold\'em', desc: 'Cash game. Blinds scale with your level.' },
    sitandgo:  { x: 480,  y: 210, w: 160, h: 100, name: 'Sit & Go',         desc: 'Tournament. 6 players. Winner takes all.' },
    blackjack: { x: 780,  y: 220, w: 160, h: 90,  name: 'Blackjack Table',   desc: '6-deck shoe. Dealer hits soft 17.' },
    slots:     { x: 900,  y: 420, w: 80,  h: 140, name: 'Slot Machines',     desc: 'Pull the lever. Try your luck.' },
    wars:      { x: 200,  y: 430, w: 130, h: 90,  name: 'Casino Wars',       desc: 'Simple. Fast. Winner takes all.' },
    bar:       { x: 530,  y: 540, w: 200, h: 60,  name: 'The Bar',           desc: null }
  };
  var TABLE_ORDER = ['holdem', 'sitandgo', 'blackjack', 'slots', 'wars', 'bar'];

  var BAR_LINES = [
    'The bartender slides you a drink. "On the house... this time."',
    'You lean against the bar. The brass rail is warm.',
    '"Another round?" The bartender polishes a glass.',
    'Ice clinks. Smooth jazz drifts from somewhere.',
    '"Winners drink free. Losers... drink more."'
  ];

  // ── NPC Definitions ─────────────────────────────
  var DEALERS = [
    { table: 'holdem',    vest: '#8a2020', hat: '#222',    skin: '#d4a574', seed: 10 },
    { table: 'sitandgo',  vest: '#4a2060', hat: '#c0a040', skin: '#c68642', seed: 20 },
    { table: 'blackjack', vest: '#333',    shirt: '#d0d0d0', hat: '#222', skin: '#f1c27d', seed: 30 },
    { table: 'wars',      vest: '#6a1830', hat: '#c0a040', skin: '#8d5524', seed: 40, buttons: '#c0a040' }
  ];

  var PATRONS = [
    { table: 'holdem',    chairIdx: 2, body: '#4a6080', hair: '#8a4020', skin: '#d4a574', seed: 100 },
    { table: 'holdem',    chairIdx: 4, body: '#806040', hair: '#2a2a2a', skin: '#f1c27d', seed: 101 },
    { table: 'sitandgo',  chairIdx: 1, body: '#804060', hair: '#ffd700', skin: '#c68642', seed: 102 },
    { table: 'sitandgo',  chairIdx: 5, body: '#406060', hair: '#6a3a20', skin: '#d4a574', seed: 103 },
    { table: 'blackjack', chairIdx: 2, body: '#603060', hair: '#aaa',    skin: '#8d5524', seed: 104 },
    { table: 'wars',      chairIdx: 0, body: '#406080', hair: '#4a2a10', skin: '#f1c27d', seed: 105 },
    { table: 'bar',       stoolIdx: 0, body: '#604040', hair: '#222',    skin: '#c68642', seed: 106 },
    { table: 'bar',       stoolIdx: 2, body: '#405060', hair: '#8a5a30', skin: '#d4a574', seed: 107 }
  ];

  // Label icons (tiny text icons per table)
  var LABEL_ICONS = {
    holdem: '\u2660',    // spade
    sitandgo: '\u2655',  // trophy-ish (chess queen)
    blackjack: '21',
    slots: '\u2740',     // cherry-ish (flower)
    wars: '\u2694',      // swords
    bar: '\u266B'        // mug-ish (music note, closest ASCII)
  };

  // Neon sign definitions
  var NEON_SIGNS = [
    { text: 'POKER',      x: 200, y: WALL + 16, color: '#44ff44', seed: 1 },
    { text: 'TOURNAMENT', x: 480, y: WALL + 16, color: '#4488ff', seed: 2 },
    { text: '21',         x: 780, y: WALL + 16, color: '#ff4444', seed: 3 },
    { text: 'SLOTS',      x: 920, y: WALL + 16, color: '#aa44ff', seed: 4 },
    { text: 'WAR',        x: 130, y: 390,       color: '#ffd700', seed: 5 }
  ];

  // Floor lamp positions (between table areas)
  var FLOOR_LAMPS = [
    { x: 340, y: 300 },
    { x: 630, y: 300 }
  ];

  // ── State ─────────────────────────────────────────
  var canvas, ctx;
  var bridge = null; // rpg.js bridge API
  var animId = null;
  var lastTimestamp = 0;
  var frameCount = 0;
  var staticBuffer = null, staticCtx = null;
  var lightPoolBuffer = null;

  var playerPos = { x: 530, y: 600 };
  var playerTarget = null;
  var playerDir = 'up';
  var playerFrame = 0;
  var playerAnimTimer = 0;
  var playerAtTable = null;
  var enterPromptVisible = false;

  // Gold dust particles (25 with varied shapes)
  var dustParticles = [];
  for (var i = 0; i < 25; i++) {
    var shapeRoll = Math.random();
    dustParticles.push({
      x: 60 + Math.random() * (CW - 120),
      y: Math.random() * CH,
      speed: 8 + Math.random() * 12,
      alpha: 0.15 + Math.random() * 0.2,
      size: 1 + Math.random(),
      shape: shapeRoll < 0.7 ? 'square' : (shapeRoll < 0.9 ? 'bar' : 'circle'),
      seed: Math.random() * 1000
    });
  }

  // Smoke haze clouds
  var hazeClouds = [
    { x: 200, y: CH * 0.4, w: 180, h: 60, speed: 0.2 },
    { x: 600, y: CH * 0.55, w: 220, h: 50, speed: -0.15 },
    { x: 900, y: CH * 0.3, w: 160, h: 55, speed: 0.18 }
  ];

  // ── Helpers ───────────────────────────────────────
  function hash(x, y) {
    var h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
    h = ((h >> 13) ^ h) * 1274126177;
    return ((h >> 16) ^ h) >>> 0;
  }

  function msg(text, type) {
    if (bridge && bridge.addMessage) bridge.addMessage(text, type || 'system');
  }

  // NPC chair/stool position helpers
  function getPokerChairPos(tableKey, chairIdx) {
    var t = TABLES[tableKey];
    var angle = (chairIdx / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: t.x + Math.cos(angle) * 92, y: t.y + Math.sin(angle) * 58 };
  }

  function getBlackjackChairPos(chairIdx) {
    var t = TABLES.blackjack;
    return {
      x: t.x - 80 + chairIdx * 40,
      y: t.y + 55 + Math.sin(((chairIdx + 0.5) / 5) * Math.PI) * 10
    };
  }

  function getWarsChairPos(chairIdx) {
    var t = TABLES.wars;
    return { x: t.x - 24 + chairIdx * 48, y: t.y + 48 };
  }

  function getBarStoolPos(stoolIdx) {
    var t = TABLES.bar;
    return { x: t.x - 60 + stoolIdx * 60, y: t.y + 32 };
  }

  // ── Static Buffer (drawn once) ────────────────────
  function renderStaticBuffer() {
    if (!staticBuffer) {
      staticBuffer = document.createElement('canvas');
      staticBuffer.width = CW;
      staticBuffer.height = CH;
      staticCtx = staticBuffer.getContext('2d');
    }
    var c = staticCtx;

    drawFloor(c);
    drawWalls(c);
    drawBar(c);
    drawHoldemTable(c);
    drawSitAndGoTable(c);
    drawBlackjackTable(c);
    drawSlotMachines(c);
    drawWarsTable(c);
    drawDecorations(c);
    drawLabels(c);

    renderLightPoolBuffer();
  }

  // ── Light Pool Buffer (pre-rendered, blit once per frame) ──
  function renderLightPoolBuffer() {
    lightPoolBuffer = document.createElement('canvas');
    lightPoolBuffer.width = CW;
    lightPoolBuffer.height = CH;
    var lc = lightPoolBuffer.getContext('2d');

    // 2 large pools under chandeliers
    var chandX = [CW * 0.33, CW * 0.67];
    for (var ci = 0; ci < 2; ci++) {
      var grad = lc.createRadialGradient(chandX[ci], 250, 0, chandX[ci], 250, 120);
      grad.addColorStop(0, 'rgba(255,220,140,0.12)');
      grad.addColorStop(0.5, 'rgba(255,200,100,0.06)');
      grad.addColorStop(1, 'rgba(255,180,80,0)');
      lc.fillStyle = grad;
      lc.fillRect(chandX[ci] - 120, 130, 240, 240);
    }

    // 6 smaller pools under sconces
    for (var si = 0; si < 6; si++) {
      var sx = WALL + 80 + si * 160;
      if (sx > CW - WALL - 40) break;
      var sg = lc.createRadialGradient(sx, WALL + 30, 0, sx, WALL + 30, 40);
      sg.addColorStop(0, 'rgba(255,160,60,0.08)');
      sg.addColorStop(1, 'rgba(255,160,60,0)');
      lc.fillStyle = sg;
      lc.fillRect(sx - 40, WALL - 10, 80, 80);
    }

    // 2 floor lamp pools
    for (var li = 0; li < FLOOR_LAMPS.length; li++) {
      var lamp = FLOOR_LAMPS[li];
      var lg = lc.createRadialGradient(lamp.x, lamp.y - 10, 0, lamp.x, lamp.y - 10, 25);
      lg.addColorStop(0, 'rgba(255,230,180,0.06)');
      lg.addColorStop(1, 'rgba(255,230,180,0)');
      lc.fillStyle = lg;
      lc.fillRect(lamp.x - 25, lamp.y - 35, 50, 50);
    }
  }

  // ── Floor ─────────────────────────────────────────
  function drawFloor(c) {
    // Base carpet — deep crimson
    var grad = c.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#2a0a14');
    grad.addColorStop(0.5, '#321018');
    grad.addColorStop(1, '#280810');
    c.fillStyle = grad;
    c.fillRect(0, 0, CW, CH);

    // Diamond carpet pattern — halved spacing for density
    c.strokeStyle = 'rgba(180,120,60,0.06)';
    c.lineWidth = 1;
    var spacing = 20;
    for (var dx = -CH; dx < CW + CH; dx += spacing) {
      c.beginPath(); c.moveTo(dx, 0); c.lineTo(dx + CH, CH); c.stroke();
      c.beginPath(); c.moveTo(dx + CH, 0); c.lineTo(dx, CH); c.stroke();
    }
    // Second offset pass for quatrefoil effect
    c.strokeStyle = 'rgba(180,120,60,0.03)';
    for (var dx2 = -CH + spacing / 2; dx2 < CW + CH; dx2 += spacing) {
      c.beginPath(); c.moveTo(dx2, 0); c.lineTo(dx2 + CH, CH); c.stroke();
      c.beginPath(); c.moveTo(dx2 + CH, 0); c.lineTo(dx2, CH); c.stroke();
    }

    // Carpet border stripe
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.strokeRect(WALL + 8, WALL + 8, CW - WALL * 2 - 16, CH - WALL * 2 - 16);
    c.strokeStyle = 'rgba(192,160,64,0.3)';
    c.lineWidth = 1;
    c.strokeRect(WALL + 12, WALL + 12, CW - WALL * 2 - 24, CH - WALL * 2 - 24);

    // Carpet runner paths — lighter 4px strips connecting entrance → each table area
    c.strokeStyle = 'rgba(180,120,60,0.04)';
    c.lineWidth = 4;
    var runnerTargets = [
      [TABLES.holdem.x, TABLES.holdem.y + 50],
      [TABLES.sitandgo.x, TABLES.sitandgo.y + 50],
      [TABLES.blackjack.x, TABLES.blackjack.y + 50],
      [TABLES.slots.x - 20, TABLES.slots.y],
      [TABLES.wars.x, TABLES.wars.y + 40],
      [TABLES.bar.x, TABLES.bar.y + 40]
    ];
    // Entrance to center
    c.beginPath(); c.moveTo(CW / 2, CH - WALL); c.lineTo(CW / 2, CH / 2); c.stroke();
    for (var ri = 0; ri < runnerTargets.length; ri++) {
      c.beginPath(); c.moveTo(CW / 2, CH / 2); c.lineTo(runnerTargets[ri][0], runnerTargets[ri][1]); c.stroke();
    }

    // Denser texture noise — 400 hash rects, varied 1-4px sizes
    for (var ti = 0; ti < 400; ti++) {
      var h = hash(ti, 777);
      var sz = 1 + (h % 4);
      c.fillStyle = 'rgba(0,0,0,' + (0.03 + (h % 5) / 100) + ')';
      c.fillRect(WALL + (h % (CW - WALL * 2)), WALL + (hash(ti, 778) % (CH - WALL * 2)), sz, Math.max(1, sz - 1));
    }

    // Central carpet medallion — concentric ellipses with gold filigree ring
    var medX = CW / 2, medY = CH / 2;
    // Outer ring
    c.strokeStyle = 'rgba(192,160,64,0.12)';
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(medX, medY, 80, 60, 0, 0, Math.PI * 2); c.stroke();
    // Gold filigree ring
    c.strokeStyle = 'rgba(192,160,64,0.08)';
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(medX, medY, 74, 54, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(medX, medY, 68, 48, 0, 0, Math.PI * 2); c.stroke();
    // Inner fill
    c.fillStyle = 'rgba(180,120,60,0.03)';
    c.beginPath(); c.ellipse(medX, medY, 66, 46, 0, 0, Math.PI * 2); c.fill();
    // Filigree dots (8 around the ring)
    for (var fi = 0; fi < 8; fi++) {
      var fa = (fi / 8) * Math.PI * 2;
      c.fillStyle = 'rgba(192,160,64,0.1)';
      c.beginPath(); c.arc(medX + Math.cos(fa) * 71, medY + Math.sin(fa) * 51, 2, 0, Math.PI * 2); c.fill();
    }
    // Card suit symbols inside medallion
    c.font = '28px serif';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(192,160,64,0.08)';
    c.fillText('\u2660', medX - 30, medY + 8);
    c.fillText('\u2665', medX - 10, medY + 8);
    c.fillText('\u2666', medX + 10, medY + 8);
    c.fillText('\u2663', medX + 30, medY + 8);
    c.textAlign = 'left';
  }

  // ── Walls ─────────────────────────────────────────
  function drawWalls(c) {
    // Dark wood paneling
    var wallGrad = c.createLinearGradient(0, 0, 0, WALL);
    wallGrad.addColorStop(0, '#1a1208');
    wallGrad.addColorStop(1, '#2a1e14');

    // Top wall
    c.fillStyle = wallGrad;
    c.fillRect(0, 0, CW, WALL);
    // Bottom wall
    c.fillStyle = '#2a1e14';
    c.fillRect(0, CH - WALL, CW, WALL);
    // Left wall
    c.fillStyle = '#241a10';
    c.fillRect(0, 0, WALL, CH);
    // Right wall
    c.fillStyle = '#241a10';
    c.fillRect(CW - WALL, 0, WALL, CH);

    // Wood grain — faint horizontal sine-wave lines on top wall
    c.strokeStyle = 'rgba(0,0,0,0.04)';
    c.lineWidth = 1;
    for (var gi = 0; gi < 10; gi++) {
      c.beginPath();
      var gy = 3 + gi * 2.8;
      for (var gx = WALL; gx < CW - WALL; gx += 4) {
        var gwy = gy + Math.sin(gx * 0.02 + gi * 1.5) * 0.8;
        if (gx === WALL) c.moveTo(gx, gwy);
        else c.lineTo(gx, gwy);
      }
      c.stroke();
    }

    // Ceiling beam lines (across top wall)
    c.strokeStyle = 'rgba(0,0,0,0.1)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(WALL, 10); c.lineTo(CW - WALL, 10); c.stroke();
    c.beginPath(); c.moveTo(WALL, 20); c.lineTo(CW - WALL, 20); c.stroke();

    // Enhanced crown molding — 3-line treatment
    c.fillStyle = '#1a1208'; // shadow
    c.fillRect(WALL - 2, WALL - 3, CW - WALL * 2 + 4, 1);
    c.fillStyle = '#c0a040'; // gold
    c.fillRect(WALL - 2, WALL - 2, CW - WALL * 2 + 4, 2);
    c.fillStyle = '#e0c060'; // highlight
    c.fillRect(WALL - 1, WALL, CW - WALL * 2 + 2, 1);

    // Wainscoting (lower panel detail on walls)
    c.fillStyle = '#1e1408';
    c.fillRect(WALL, WALL + 2, CW - WALL * 2, 4);
    c.fillStyle = '#3a2e1e';
    c.fillRect(WALL, WALL + 6, CW - WALL * 2, 2);

    // Baseboard — dark strip at wall-floor junction + gold accent
    c.fillStyle = '#1a1208';
    c.fillRect(WALL, WALL + 8, CW - WALL * 2, 2);
    c.fillStyle = '#c0a040';
    c.fillRect(WALL, WALL + 10, CW - WALL * 2, 1);

    // Wall panels (vertical dividers)
    c.strokeStyle = 'rgba(192,160,64,0.12)';
    c.lineWidth = 1;
    for (var px = WALL + 80; px < CW - WALL; px += 120) {
      c.beginPath(); c.moveTo(px, 0); c.lineTo(px, WALL); c.stroke();
    }

    // Picture frames on top wall between sconces
    var frames = [
      { x: WALL + 150, y: 6 }, { x: WALL + 380, y: 8 },
      { x: WALL + 580, y: 6 }, { x: WALL + 750, y: 7 }
    ];
    for (var fpi = 0; fpi < frames.length; fpi++) {
      var fp = frames[fpi];
      c.strokeStyle = '#c0a040';
      c.lineWidth = 1;
      c.strokeRect(fp.x, fp.y, 12, 8);
      // Dark landscape interior
      c.fillStyle = '#1a2a1a';
      c.fillRect(fp.x + 1, fp.y + 1, 10, 6);
      c.fillStyle = '#2a3a2a';
      c.fillRect(fp.x + 1, fp.y + 4, 10, 3);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(fp.x + 2, fp.y + 2, 3, 1);
    }

    // Entrance archway (bottom center)
    var archX = CW / 2 - 30, archW = 60;
    c.fillStyle = '#2a0a14'; // floor color — opening
    c.fillRect(archX, CH - WALL, archW, WALL);
    // Arch border
    c.fillStyle = '#c0a040';
    c.fillRect(archX - 2, CH - WALL, 2, WALL);
    c.fillRect(archX + archW, CH - WALL, 2, WALL);
    c.fillRect(archX - 2, CH - WALL - 2, archW + 4, 2);

    // "JACKTOWN CASINO" sign above entrance (inside, on back wall top)
    c.font = 'bold 16px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#ffd700';
    c.fillText('JACKTOWN CASINO', CW / 2, 22);
    c.textAlign = 'left';

    // Wall sconces (6 along top wall)
    for (var si = 0; si < 6; si++) {
      var sx = WALL + 80 + si * 160;
      if (sx > CW - WALL - 40) break;
      // Bracket
      c.fillStyle = '#8a7030';
      c.fillRect(sx - 3, WALL + 6, 6, 8);
      // Flame base (static — animated flame drawn in anim loop)
      c.fillStyle = '#4a3018';
      c.fillRect(sx - 2, WALL + 2, 4, 6);
    }
  }

  // ── Shared Poker Table Renderer ──────────────────
  function drawPokerTableBase(c, cx, cy, feltColor, feltDark, rimColor) {
    // Table shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(cx + 3, cy + 5, 78, 48, 0, 0, Math.PI * 2);
    c.fill();

    // Mahogany rim
    c.fillStyle = rimColor || '#4a2a18';
    c.beginPath();
    c.ellipse(cx, cy, 80, 50, 0, 0, Math.PI * 2);
    c.fill();

    // Inner rim highlight
    c.strokeStyle = '#6a4a30';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(cx, cy, 78, 48, 0, 0, Math.PI * 2);
    c.stroke();

    // Felt
    c.fillStyle = feltColor;
    c.beginPath();
    c.ellipse(cx, cy, 72, 44, 0, 0, Math.PI * 2);
    c.fill();

    // Felt inner shadow
    c.fillStyle = feltDark || 'rgba(0,0,0,0.08)';
    c.beginPath();
    c.ellipse(cx, cy, 60, 36, 0, 0, Math.PI * 2);
    c.fill();

    // Betting line (oval)
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.ellipse(cx, cy, 50, 30, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // Chair positions (6 around table)
    for (var chi = 0; chi < 6; chi++) {
      var chairAngle = (chi / 6) * Math.PI * 2 - Math.PI / 2;
      var chairX = cx + Math.cos(chairAngle) * 92;
      var chairY = cy + Math.sin(chairAngle) * 58;
      c.fillStyle = '#5a2020';
      c.beginPath();
      c.arc(chairX, chairY, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3a1010';
      c.lineWidth = 1;
      c.stroke();
    }
  }

  // ── No Limit Hold'em (cash game) ───────────────
  function drawHoldemTable(c) {
    var t = TABLES.holdem;
    var cx = t.x, cy = t.y;
    drawPokerTableBase(c, cx, cy, '#1a5a2a', 'rgba(0,0,0,0.08)');

    // Center card fan
    var cardColors = ['#cc2222', '#222222', '#cc2222', '#222222', '#cc2222'];
    for (var ci = 0; ci < 5; ci++) {
      var angle = (ci - 2) * 0.22;
      c.save();
      c.translate(cx, cy);
      c.rotate(angle);
      c.fillStyle = '#fff';
      c.fillRect(-4, -8, 8, 12);
      c.fillStyle = cardColors[ci];
      c.fillRect(-2, -5, 4, 4);
      c.restore();
    }

    // Chip stacks (3 piles around center)
    var chipColors = [['#cc2222', '#ffffff'], ['#2244aa', '#ffffff'], ['#228822', '#ffffff']];
    var chipPositions = [[-30, -15], [25, -20], [0, 22]];
    for (var csi = 0; csi < 3; csi++) {
      var cpx = cx + chipPositions[csi][0];
      var cpy = cy + chipPositions[csi][1];
      for (var sc = 0; sc < 3; sc++) {
        c.fillStyle = chipColors[csi][0];
        c.beginPath();
        c.ellipse(cpx, cpy - sc * 2, 5, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = chipColors[csi][1];
        c.fillRect(cpx - 1, cpy - sc * 2 - 1, 2, 1);
      }
    }

    // Dealer button (small white disc)
    c.fillStyle = '#eee';
    c.beginPath();
    c.arc(cx + 38, cy - 8, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    c.fillText('D', cx + 38, cy - 6);
    c.textAlign = 'left';
  }

  // ── Sit & Go Tournament Table ──────────────────
  function drawSitAndGoTable(c) {
    var t = TABLES.sitandgo;
    var cx = t.x, cy = t.y;
    // Deep blue felt + darker rim for tournament prestige
    drawPokerTableBase(c, cx, cy, '#1a2a5a', 'rgba(0,0,0,0.1)', '#2a1a38');

    // Trophy icon in center
    c.fillStyle = '#c0a040';
    // Cup body
    c.fillRect(cx - 6, cy - 8, 12, 10);
    // Cup rim
    c.fillStyle = '#ffd700';
    c.fillRect(cx - 7, cy - 9, 14, 2);
    // Handles
    c.strokeStyle = '#c0a040';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(cx - 8, cy - 3, 4, Math.PI * 0.5, Math.PI * 1.5);
    c.stroke();
    c.beginPath();
    c.arc(cx + 8, cy - 3, 4, -Math.PI * 0.5, Math.PI * 0.5);
    c.stroke();
    // Base
    c.fillStyle = '#c0a040';
    c.fillRect(cx - 4, cy + 2, 8, 2);
    c.fillRect(cx - 6, cy + 4, 12, 2);

    // Placement cards (1st, 2nd, 3rd markers around table)
    var placeColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    var placeLabels = ['1st', '2nd', '3rd'];
    var placePos = [[-30, -22], [30, -22], [0, 24]];
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    for (var pi = 0; pi < 3; pi++) {
      var ppx = cx + placePos[pi][0];
      var ppy = cy + placePos[pi][1];
      // Small card
      c.fillStyle = '#fff';
      c.fillRect(ppx - 6, ppy - 5, 12, 10);
      c.fillStyle = placeColors[pi];
      c.fillRect(ppx - 5, ppy - 4, 10, 8);
      c.fillStyle = '#000';
      c.fillText(placeLabels[pi], ppx, ppy + 3);
    }
    c.textAlign = 'left';

    // Fewer but larger chip stacks (tournament buy-in feel)
    var tChipColors = [['#ffd700', '#fff'], ['#aa22aa', '#fff']];
    var tChipPos = [[-22, 8], [22, 8]];
    for (var ti = 0; ti < 2; ti++) {
      var tcx = cx + tChipPos[ti][0];
      var tcy = cy + tChipPos[ti][1];
      for (var ts = 0; ts < 4; ts++) {
        c.fillStyle = tChipColors[ti][0];
        c.beginPath();
        c.ellipse(tcx, tcy - ts * 2, 5, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = tChipColors[ti][1];
        c.fillRect(tcx - 1, tcy - ts * 2 - 1, 2, 1);
      }
    }

    // "TOURNAMENT" banner stripe across top of table
    c.fillStyle = 'rgba(192,160,64,0.25)';
    c.fillRect(cx - 50, cy - 44, 100, 8);
    c.fillStyle = '#ffd700';
    c.font = 'bold 5px monospace';
    c.textAlign = 'center';
    c.fillText('TOURNAMENT', cx, cy - 38);
    c.textAlign = 'left';
  }

  // ── Blackjack Table ───────────────────────────────
  function drawBlackjackTable(c) {
    var t = TABLES.blackjack;
    var cx = t.x, cy = t.y;

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(cx + 3, cy + 8, 82, 44, 0, 0, Math.PI);
    c.fill();
    c.fillRect(cx - 79, cy + 5, 164, 48);

    // Table base (flat back edge)
    c.fillStyle = '#4a2a18';
    c.fillRect(cx - 80, cy, 160, 50);
    // Curved front
    c.beginPath();
    c.ellipse(cx, cy, 80, 44, 0, 0, Math.PI);
    c.fill();

    // Inner rim
    c.strokeStyle = '#6a4a30';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(cx, cy, 78, 42, 0, 0, Math.PI);
    c.moveTo(cx - 78, cy);
    c.lineTo(cx - 78, cy - 4);
    c.moveTo(cx + 78, cy);
    c.lineTo(cx + 78, cy - 4);
    c.stroke();

    // Green felt
    c.fillStyle = '#186030';
    c.fillRect(cx - 74, cy - 2, 148, 44);
    c.beginPath();
    c.ellipse(cx, cy, 74, 38, 0, 0, Math.PI);
    c.fill();

    // Chip rail — thin darker green strip with gold trim separating dealer/player
    c.fillStyle = 'rgba(0,40,10,0.4)';
    c.fillRect(cx - 70, cy + 8, 140, 4);
    c.fillStyle = '#c0a040';
    c.fillRect(cx - 70, cy + 8, 140, 1);
    c.fillRect(cx - 70, cy + 11, 140, 1);

    // Insurance line — dashed arc at 2/3 radius
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 1;
    c.setLineDash([3, 3]);
    c.beginPath();
    c.ellipse(cx, cy, 48, 25, 0, 0.1, Math.PI - 0.1);
    c.stroke();
    c.setLineDash([]);
    // "INSURANCE" label
    c.font = '5px monospace';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillText('INSURANCE', cx, cy + 28);

    // Dealer's straight edge
    c.fillStyle = '#4a2a18';
    c.fillRect(cx - 80, cy - 6, 160, 8);
    c.fillStyle = '#c0a040';
    c.fillRect(cx - 78, cy - 4, 156, 1); // gold trim

    // Card position ghosts — 5 small rounded rect outlines at player spots
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    for (var gi = 0; gi < 5; gi++) {
      var gx = cx - 55 + gi * 27.5;
      var gy = cy + 16;
      c.strokeRect(gx - 4, gy - 6, 8, 12);
    }

    // Player spot arcs (5 positions)
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth = 1;
    for (var pi = 0; pi < 5; pi++) {
      var spotX = cx - 55 + (pi * 27.5);
      var spotY = cy + 10 + Math.sin((pi / 4) * Math.PI) * 20;
      c.beginPath();
      c.arc(spotX, spotY, 10, 0, Math.PI * 2);
      c.stroke();
    }

    // Card shoe (right side of dealer edge)
    c.fillStyle = '#2a1a10';
    c.fillRect(cx + 56, cy - 10, 16, 10);
    c.fillStyle = '#fff';
    c.fillRect(cx + 58, cy - 8, 12, 1);

    // Chairs
    for (var bci = 0; bci < 5; bci++) {
      var bAngle = ((bci + 0.5) / 5) * Math.PI;
      var bcx = cx - 80 + (bci * 40);
      var bcy = cy + 55 + Math.sin(bAngle) * 10;
      c.fillStyle = '#5a2020';
      c.beginPath();
      c.arc(bcx, bcy, 6, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3a1010';
      c.lineWidth = 1;
      c.stroke();
    }
  }

  // ── Slot Machines ─────────────────────────────────
  function drawSlotMachines(c) {
    var t = TABLES.slots;
    var baseX = t.x - 10;
    var baseY = t.y - 50;

    for (var si = 0; si < 4; si++) {
      var mx = baseX;
      var my = baseY + si * 36;

      // Machine body shadow
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(mx + 3, my + 3, 32, 30);

      // Machine body
      c.fillStyle = '#4a4a5a';
      c.fillRect(mx, my, 32, 30);

      // 3D frame — highlight left, shadow right
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(mx, my, 1, 30);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(mx + 31, my, 1, 30);

      // Top cap
      c.fillStyle = '#5a5a6a';
      c.fillRect(mx - 1, my - 2, 34, 4);

      // "777" header — gold rect above cap with red text
      c.fillStyle = '#c0a040';
      c.fillRect(mx + 6, my - 8, 20, 6);
      c.fillStyle = '#cc2222';
      c.font = 'bold 5px monospace';
      c.textAlign = 'center';
      c.fillText('777', mx + 16, my - 3);
      c.textAlign = 'left';

      // Front panel
      c.fillStyle = '#3a3a4a';
      c.fillRect(mx + 2, my + 4, 28, 18);

      // Screen area (3 reels — animated colors drawn in anim loop)
      c.fillStyle = '#1a1a2a';
      c.fillRect(mx + 4, my + 6, 24, 12);
      // Reel dividers
      c.fillStyle = '#4a4a5a';
      c.fillRect(mx + 12, my + 6, 1, 12);
      c.fillRect(mx + 20, my + 6, 1, 12);

      // Coin slot — dark circle/slit on left of lever
      c.fillStyle = '#1a1a2a';
      c.fillRect(mx + 30, my + 12, 2, 4);

      // Lever (right side)
      c.fillStyle = '#8a7030';
      c.fillRect(mx + 33, my + 6, 3, 14);
      c.fillStyle = '#cc2222';
      c.beginPath();
      c.arc(mx + 34, my + 5, 3, 0, Math.PI * 2);
      c.fill();

      // Payout display — tiny rect below reels with gold text
      c.fillStyle = '#1a1a2a';
      c.fillRect(mx + 8, my + 20, 16, 4);
      c.fillStyle = '#ffd700';
      c.font = '3px monospace';
      c.textAlign = 'center';
      c.fillText('100', mx + 16, my + 23);
      c.textAlign = 'left';

      // Coin tray
      c.fillStyle = '#3a3a3a';
      c.fillRect(mx + 4, my + 24, 24, 4);
      c.fillStyle = '#ffd700';
      c.fillRect(mx + 8, my + 25, 2, 2);
      c.fillRect(mx + 14, my + 25, 2, 2);
      c.fillRect(mx + 20, my + 25, 2, 2);

      // Stool in front
      c.fillStyle = '#5a2020';
      c.beginPath();
      c.arc(mx + 16, my + 38, 6, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Casino Wars Table ─────────────────────────────
  function drawWarsTable(c) {
    var t = TABLES.wars;
    var cx = t.x, cy = t.y;

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(cx - 52, cy - 32, 108, 68);

    // Rectangular table
    c.fillStyle = '#4a2a18';
    c.fillRect(cx - 55, cy - 35, 110, 70);
    // Inner rim
    c.strokeStyle = '#6a4a30';
    c.lineWidth = 2;
    c.strokeRect(cx - 53, cy - 33, 106, 66);

    // Green felt
    c.fillStyle = '#1a5a2a';
    c.fillRect(cx - 48, cy - 28, 96, 56);

    // Dividing line
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, cy - 28);
    c.lineTo(cx, cy + 28);
    c.stroke();

    // "WAR" text in red at center dividing line
    c.font = 'bold 8px monospace';
    c.textAlign = 'center';
    c.fillStyle = '#8a2040';
    c.fillText('WAR', cx, cy - 20);

    // Labels
    c.font = 'bold 7px monospace';
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillText('PLAYER', cx - 24, cy + 2);
    c.fillText('DEALER', cx + 24, cy + 2);
    c.textAlign = 'left';

    // Better card silhouettes with rounded corners + suit symbol
    c.fillStyle = 'rgba(255,255,255,0.08)';
    // Player card
    c.beginPath();
    var pcx = cx - 32, pcy = cy - 12, pcw = 14, pch = 18, pcr = 2;
    c.moveTo(pcx + pcr, pcy);
    c.lineTo(pcx + pcw - pcr, pcy);
    c.quadraticCurveTo(pcx + pcw, pcy, pcx + pcw, pcy + pcr);
    c.lineTo(pcx + pcw, pcy + pch - pcr);
    c.quadraticCurveTo(pcx + pcw, pcy + pch, pcx + pcw - pcr, pcy + pch);
    c.lineTo(pcx + pcr, pcy + pch);
    c.quadraticCurveTo(pcx, pcy + pch, pcx, pcy + pch - pcr);
    c.lineTo(pcx, pcy + pcr);
    c.quadraticCurveTo(pcx, pcy, pcx + pcr, pcy);
    c.fill();
    // Suit on player card
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.font = '8px serif';
    c.textAlign = 'center';
    c.fillText('\u2665', cx - 25, cy + 2);

    // Dealer card
    c.fillStyle = 'rgba(255,255,255,0.08)';
    var dcx = cx + 18;
    c.beginPath();
    c.moveTo(dcx + pcr, pcy);
    c.lineTo(dcx + pcw - pcr, pcy);
    c.quadraticCurveTo(dcx + pcw, pcy, dcx + pcw, pcy + pcr);
    c.lineTo(dcx + pcw, pcy + pch - pcr);
    c.quadraticCurveTo(dcx + pcw, pcy + pch, dcx + pcw - pcr, pcy + pch);
    c.lineTo(dcx + pcr, pcy + pch);
    c.quadraticCurveTo(dcx, pcy + pch, dcx, pcy + pch - pcr);
    c.lineTo(dcx, pcy + pcr);
    c.quadraticCurveTo(dcx, pcy, dcx + pcr, pcy);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillText('\u2660', cx + 25, cy + 2);
    c.textAlign = 'left';

    // Velvet rope posts with pennant flags
    var ropePostX = [cx - 70, cx + 70];
    for (var ri = 0; ri < 2; ri++) {
      c.fillStyle = '#c0a040';
      c.fillRect(ropePostX[ri] - 2, cy - 20, 4, 40);
      c.fillStyle = '#ffd700';
      c.beginPath();
      c.arc(ropePostX[ri], cy - 22, 4, 0, Math.PI * 2);
      c.fill();
      // Pennant flag
      c.fillStyle = '#8a2040';
      c.beginPath();
      c.moveTo(ropePostX[ri] + 3, cy - 20);
      c.lineTo(ropePostX[ri] + 12, cy - 16);
      c.lineTo(ropePostX[ri] + 3, cy - 12);
      c.fill();
    }
    // Rope between posts
    c.strokeStyle = '#8a2040';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ropePostX[0], cy - 10);
    c.quadraticCurveTo(cx, cy - 2, ropePostX[1], cy - 10);
    c.stroke();

    // Chairs
    var wChairs = [[cx - 24, cy + 48], [cx + 24, cy + 48]];
    for (var wci = 0; wci < 2; wci++) {
      c.fillStyle = '#5a2020';
      c.beginPath();
      c.arc(wChairs[wci][0], wChairs[wci][1], 6, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Bar Counter ───────────────────────────────────
  function drawBar(c) {
    var t = TABLES.bar;
    var cx = t.x, cy = t.y;

    // Back shelf (against wall — slightly above bar)
    var shelfY = cy - 50;
    // Shelf backing
    c.fillStyle = '#2a1e14';
    c.fillRect(cx - 100, shelfY, 200, 40);

    // Mirror behind bottles — light blue-gray tinted rect with gold frame
    c.fillStyle = 'rgba(180,200,220,0.15)';
    c.fillRect(cx - 90, shelfY + 1, 180, 37);
    c.strokeStyle = '#c0a040';
    c.lineWidth = 1;
    c.strokeRect(cx - 90, shelfY + 1, 180, 37);
    // Glass reflections on mirror
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(cx - 80, shelfY + 4, 20, 2);
    c.fillRect(cx - 40, shelfY + 8, 15, 2);
    c.fillRect(cx + 30, shelfY + 5, 18, 2);

    // Shelf board
    c.fillStyle = '#4a3a28';
    c.fillRect(cx - 100, shelfY + 18, 200, 3);
    c.fillRect(cx - 100, shelfY + 36, 200, 3);

    // Bottles on shelves (colored rects)
    var bottleColors = ['#44aa44', '#cc3333', '#ddaa22', '#4466cc', '#aa44aa', '#cc6622', '#33cccc', '#cc4488'];
    for (var bi = 0; bi < bottleColors.length; bi++) {
      var bx = cx - 88 + bi * 24;
      var by = shelfY + 6;
      c.fillStyle = bottleColors[bi];
      c.fillRect(bx, by, 6, 10);
      c.fillRect(bx + 1, by - 3, 4, 4);
      c.fillStyle = '#ddd';
      c.fillRect(bx + 1, by - 4, 4, 2);
    }

    // Second row
    var bottleColors2 = ['#885522', '#cc8844', '#336644', '#884488', '#aa6622', '#cccc44'];
    for (var b2i = 0; b2i < bottleColors2.length; b2i++) {
      var b2x = cx - 80 + b2i * 28;
      var b2y = shelfY + 24;
      c.fillStyle = bottleColors2[b2i];
      c.fillRect(b2x, b2y, 6, 10);
      c.fillRect(b2x + 1, b2y - 3, 4, 4);
      c.fillStyle = '#ddd';
      c.fillRect(b2x + 1, b2y - 4, 4, 2);
    }

    // Hanging wine glasses — inverted triangles + stems below upper shelf
    for (var wgi = 0; wgi < 5; wgi++) {
      var wgx = cx - 70 + wgi * 35;
      var wgy = shelfY + 15;
      c.fillStyle = 'rgba(200,220,240,0.2)';
      // Inverted triangle (glass bowl)
      c.beginPath();
      c.moveTo(wgx - 3, wgy);
      c.lineTo(wgx + 3, wgy);
      c.lineTo(wgx, wgy + 5);
      c.fill();
      // Stem
      c.fillRect(wgx, wgy + 5, 1, 3);
    }

    // Menu board — dark rect with lighter frame + chalk lines to right of bottles
    c.fillStyle = '#1a1a1a';
    c.fillRect(cx + 70, shelfY + 4, 20, 14);
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1;
    c.strokeRect(cx + 70, shelfY + 4, 20, 14);
    // Chalk lines
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(cx + 73, shelfY + 7, 14, 1);
    c.fillRect(cx + 73, shelfY + 10, 10, 1);
    c.fillRect(cx + 73, shelfY + 13, 12, 1);

    // Main counter
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(cx - 98, cy + 3, 200, 18);

    c.fillStyle = '#3a2418';
    c.fillRect(cx - 100, cy, 200, 18);
    // Counter top
    c.fillStyle = '#5a4030';
    c.fillRect(cx - 100, cy - 2, 200, 4);
    // Gold trim on front edge
    c.fillStyle = '#b89040';
    c.fillRect(cx - 100, cy + 16, 200, 2);

    // Napkin holder — small metal rect + white triangle beside first stool
    c.fillStyle = '#888';
    c.fillRect(cx - 78, cy + 1, 6, 4);
    c.fillStyle = '#eee';
    c.beginPath();
    c.moveTo(cx - 77, cy + 1);
    c.lineTo(cx - 74, cy - 2);
    c.lineTo(cx - 73, cy + 1);
    c.fill();

    // Brass foot rail
    c.fillStyle = '#b89040';
    c.fillRect(cx - 90, cy + 24, 180, 2);

    // Bar stools (3)
    for (var bsi = 0; bsi < 3; bsi++) {
      var stoolX = cx - 60 + bsi * 60;
      c.fillStyle = '#5a2020';
      c.beginPath();
      c.arc(stoolX, cy + 32, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3a1010';
      c.lineWidth = 1;
      c.stroke();
      // Stool leg
      c.fillStyle = '#8a7030';
      c.fillRect(stoolX - 1, cy + 26, 2, 6);
    }

    // Beer taps (on counter)
    for (var tpi = 0; tpi < 2; tpi++) {
      var tapX = cx - 30 + tpi * 60;
      c.fillStyle = '#c0a040';
      c.fillRect(tapX - 2, cy - 10, 4, 10);
      c.fillStyle = '#ffd700';
      c.beginPath();
      c.arc(tapX, cy - 12, 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Decorations ───────────────────────────────────
  function drawDecorations(c) {
    // Potted palms (corners)
    var palmPositions = [[WALL + 20, WALL + 30], [CW - WALL - 20, WALL + 30],
                         [WALL + 20, CH - WALL - 30], [CW - WALL - 20, CH - WALL - 30]];
    for (var pi = 0; pi < palmPositions.length; pi++) {
      var px = palmPositions[pi][0], py = palmPositions[pi][1];
      // Pot
      c.fillStyle = '#6a4a30';
      c.fillRect(px - 6, py, 12, 10);
      c.fillStyle = '#5a3a20';
      c.fillRect(px - 7, py - 1, 14, 3);
      // Leaves
      c.fillStyle = '#2a7a2a';
      c.beginPath();
      c.moveTo(px, py - 2);
      c.lineTo(px - 14, py - 16);
      c.lineTo(px - 4, py - 6);
      c.fill();
      c.beginPath();
      c.moveTo(px, py - 2);
      c.lineTo(px + 14, py - 16);
      c.lineTo(px + 4, py - 6);
      c.fill();
      c.beginPath();
      c.moveTo(px, py - 2);
      c.lineTo(px, py - 20);
      c.lineTo(px + 3, py - 8);
      c.fill();
    }

    // Fern-style plants at mid-wall positions (curved line leaves)
    var fernPositions = [[WALL + 15, CH / 2], [CW - WALL - 15, CH / 2]];
    for (var fni = 0; fni < fernPositions.length; fni++) {
      var fnx = fernPositions[fni][0], fny = fernPositions[fni][1];
      // Pot
      c.fillStyle = '#5a4030';
      c.fillRect(fnx - 4, fny, 8, 8);
      c.fillStyle = '#4a3020';
      c.fillRect(fnx - 5, fny - 1, 10, 2);
      // Curved fern leaves
      c.strokeStyle = '#2a8a2a';
      c.lineWidth = 1.5;
      var leafAngles = [-0.8, -0.4, 0, 0.4, 0.8];
      for (var lai = 0; lai < leafAngles.length; lai++) {
        var la = leafAngles[lai];
        c.beginPath();
        c.moveTo(fnx, fny - 2);
        c.quadraticCurveTo(fnx + la * 14, fny - 14, fnx + la * 18, fny - 20);
        c.stroke();
        // Leaf tip
        c.fillStyle = '#2a8a2a';
        c.beginPath();
        c.arc(fnx + la * 18, fny - 20, 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Floor lamps between table areas
    for (var fli = 0; fli < FLOOR_LAMPS.length; fli++) {
      var fl = FLOOR_LAMPS[fli];
      // Brass pole
      c.fillStyle = '#b89040';
      c.fillRect(fl.x - 1, fl.y - 10, 2, 20);
      // Base
      c.fillStyle = '#8a7030';
      c.fillRect(fl.x - 4, fl.y + 10, 8, 2);
      // Shade (cream trapezoid)
      c.fillStyle = '#e8dcc0';
      c.beginPath();
      c.moveTo(fl.x - 5, fl.y - 10);
      c.lineTo(fl.x + 5, fl.y - 10);
      c.lineTo(fl.x + 4, fl.y - 14);
      c.lineTo(fl.x - 4, fl.y - 14);
      c.fill();
      c.fillStyle = '#d8cca0';
      c.fillRect(fl.x - 5, fl.y - 10, 10, 1);
    }

    // VIP rope section between blackjack and bar
    var vipPosts = [{ x: 650, y: 340 }, { x: 650, y: 440 }];
    for (var vpi = 0; vpi < vipPosts.length; vpi++) {
      var vp = vipPosts[vpi];
      c.fillStyle = '#c0a040';
      c.fillRect(vp.x - 2, vp.y - 10, 4, 20);
      c.fillStyle = '#ffd700';
      c.beginPath();
      c.arc(vp.x, vp.y - 12, 3, 0, Math.PI * 2);
      c.fill();
    }
    // Draped rope bezier between VIP posts
    c.strokeStyle = '#8a2040';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(vipPosts[0].x, vipPosts[0].y);
    c.quadraticCurveTo(vipPosts[0].x + 15, (vipPosts[0].y + vipPosts[1].y) / 2, vipPosts[1].x, vipPosts[1].y);
    c.stroke();

    // Chandelier hardware (2 chandeliers — glow is animated)
    var chandX = [CW * 0.33, CW * 0.67];
    for (var ci = 0; ci < 2; ci++) {
      var chx = chandX[ci], chy = 55;
      // Chain
      c.fillStyle = '#8a7030';
      c.fillRect(chx - 1, WALL, 2, chy - WALL - 4);
      // Body
      c.fillStyle = '#c0a040';
      c.fillRect(chx - 12, chy - 4, 24, 4);
      c.fillStyle = '#a08830';
      c.fillRect(chx - 8, chy, 16, 3);
      // Arms
      c.fillRect(chx - 16, chy - 2, 4, 2);
      c.fillRect(chx + 12, chy - 2, 4, 2);
      c.fillRect(chx - 20, chy - 4, 4, 2);
      c.fillRect(chx + 16, chy - 4, 4, 2);
    }

    // Velvet rope entrance markers
    c.fillStyle = '#c0a040';
    c.fillRect(CW / 2 - 40, CH - WALL - 15, 4, 15);
    c.fillRect(CW / 2 + 36, CH - WALL - 15, 4, 15);
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.arc(CW / 2 - 38, CH - WALL - 17, 3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(CW / 2 + 38, CH - WALL - 17, 3, 0, Math.PI * 2);
    c.fill();
  }

  // ── Labels (gold-bordered nameplates with icons) ──
  function drawLabels(c) {
    c.font = 'bold 11px monospace';
    c.textAlign = 'center';

    for (var i = 0; i < TABLE_ORDER.length; i++) {
      var id = TABLE_ORDER[i];
      var t = TABLES[id];
      var labelY = t.y + (t.h / 2) + 24;
      if (id === 'bar') labelY = t.y + 52;
      if (id === 'slots') labelY = t.y + 100;

      var icon = LABEL_ICONS[id] || '';
      var displayName = icon ? icon + ' ' + t.name : t.name;
      c.font = 'bold 11px monospace';
      var nameW = c.measureText(displayName).width;
      var bgW = nameW + 14, bgH = 16;
      var bgX = t.x - bgW / 2, bgY = labelY - 11;

      // Outer gold border
      c.strokeStyle = '#c0a040';
      c.lineWidth = 2;
      c.strokeRect(bgX - 1, bgY - 1, bgW + 2, bgH + 2);
      // Dark fill
      c.fillStyle = 'rgba(0,0,0,0.85)';
      c.fillRect(bgX, bgY, bgW, bgH);
      // Inner gold border
      c.strokeStyle = '#e0c060';
      c.lineWidth = 1;
      c.strokeRect(bgX + 2, bgY + 2, bgW - 4, bgH - 4);

      // Text shadow + text
      c.fillStyle = '#000';
      c.fillText(displayName, t.x + 1, labelY + 1);
      c.fillStyle = '#fff';
      c.fillText(displayName, t.x, labelY);
    }
    c.textAlign = 'left';
  }

  // ── NPC Drawing Helpers ───────────────────────────

  // Draw a simple pixel-art dealer figure
  function drawDealer(c, dealer, fc) {
    var t = TABLES[dealer.table];
    var dx, dy;
    if (dealer.table === 'blackjack') {
      dx = t.x; dy = t.y - 12;
    } else if (dealer.table === 'wars') {
      dx = t.x + 24; dy = t.y - 42;
    } else {
      dx = t.x; dy = t.y - 55;
    }

    // Idle bob — barely perceptible breathing
    var bob = Math.sin(fc * 0.03 + dealer.seed) * 1;
    dy += bob;

    // Body (vest over shirt)
    if (dealer.shirt) {
      c.fillStyle = dealer.shirt;
      c.fillRect(dx - 3, dy, 6, 10);
    }
    c.fillStyle = dealer.vest;
    c.fillRect(dx - 3, dy, 6, 10);
    if (dealer.shirt) {
      // Shirt showing under vest
      c.fillStyle = dealer.shirt;
      c.fillRect(dx - 1, dy, 2, 8);
    }
    // Gold buttons on wars dealer
    if (dealer.buttons) {
      c.fillStyle = dealer.buttons;
      c.fillRect(dx, dy + 2, 1, 1);
      c.fillRect(dx, dy + 5, 1, 1);
    }

    // Head
    c.fillStyle = dealer.skin;
    c.beginPath();
    c.arc(dx, dy - 3, 4, 0, Math.PI * 2);
    c.fill();

    // Hat/visor
    c.fillStyle = dealer.hat;
    c.fillRect(dx - 5, dy - 8, 10, 3);

    // Arms (resting on table)
    c.strokeStyle = dealer.skin;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(dx - 3, dy + 3);
    c.lineTo(dx - 7, dy + 8);
    c.stroke();
    c.beginPath();
    c.moveTo(dx + 3, dy + 3);
    c.lineTo(dx + 7, dy + 8);
    c.stroke();
  }

  // Draw a seated patron (simpler than dealer)
  function drawPatron(c, patron) {
    var pos;
    if (patron.table === 'bar') {
      pos = getBarStoolPos(patron.stoolIdx);
      pos.y -= 12; // sitting on stool, body above
    } else if (patron.table === 'blackjack') {
      pos = getBlackjackChairPos(patron.chairIdx);
      pos.y -= 8;
    } else if (patron.table === 'wars') {
      pos = getWarsChairPos(patron.chairIdx);
      pos.y -= 8;
    } else {
      pos = getPokerChairPos(patron.table, patron.chairIdx);
      pos.y -= 8;
    }

    // Body (colored oval)
    c.fillStyle = patron.body;
    c.beginPath();
    c.ellipse(pos.x, pos.y, 5, 7, 0, 0, Math.PI * 2);
    c.fill();

    // Head
    c.fillStyle = patron.skin;
    c.beginPath();
    c.arc(pos.x, pos.y - 8, 3, 0, Math.PI * 2);
    c.fill();

    // Hair
    c.fillStyle = patron.hair;
    c.fillRect(pos.x - 3, pos.y - 12, 6, 3);
  }

  // Draw bartender (special NPC behind bar counter)
  function drawBartender(c, fc) {
    var t = TABLES.bar;
    var bx = t.x, by = t.y - 8;

    // Polishing animation — slight arm shift every ~60 frames
    var polishFrame = Math.floor(fc / 60) % 2;
    var armOffset = polishFrame === 0 ? -1 : 1;

    // Body (taller figure)
    c.fillStyle = '#2a2a2a'; // dark clothes
    c.fillRect(bx - 4, by - 4, 8, 12);

    // White apron overlay
    c.fillStyle = '#ddd';
    c.fillRect(bx - 3, by, 6, 8);

    // Head
    c.fillStyle = '#c68642';
    c.beginPath();
    c.arc(bx, by - 7, 4, 0, Math.PI * 2);
    c.fill();

    // Hair/hat
    c.fillStyle = '#222';
    c.fillRect(bx - 4, by - 12, 8, 3);

    // Arms (polishing motion)
    c.strokeStyle = '#c68642';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(bx - 4, by);
    c.lineTo(bx - 8 + armOffset, by + 4);
    c.stroke();
    c.beginPath();
    c.moveTo(bx + 4, by);
    c.lineTo(bx + 8 - armOffset, by + 4);
    c.stroke();

    // Glass being polished (in hand)
    c.fillStyle = 'rgba(200,220,240,0.3)';
    c.fillRect(bx + 6 - armOffset, by + 2, 3, 4);
  }

  // ── Animated Elements (every frame) ───────────────
  function drawAnimated(c) {
    // ── Ambient light pools (single blit) ──
    if (lightPoolBuffer) {
      var lpAlpha = 0.6 + Math.sin(frameCount * 0.01) * 0.2;
      c.globalAlpha = lpAlpha;
      c.drawImage(lightPoolBuffer, 0, 0);
      c.globalAlpha = 1;
    }

    // ── Chandelier glow + candle flames + crystal sparkles ──
    var chandX = [CW * 0.33, CW * 0.67];
    for (var ci = 0; ci < 2; ci++) {
      var chx = chandX[ci], chy = 55;
      var glowAlpha = 0.08 + Math.sin(frameCount * 0.02 + ci) * 0.04;
      var glowR = 80 + Math.sin(frameCount * 0.015 + ci * 2) * 10;
      var glow = c.createRadialGradient(chx, chy + 4, 0, chx, chy + 4, glowR);
      glow.addColorStop(0, 'rgba(255,220,140,' + (glowAlpha + 0.06) + ')');
      glow.addColorStop(0.5, 'rgba(255,200,100,' + glowAlpha + ')');
      glow.addColorStop(1, 'rgba(255,180,80,0)');
      c.fillStyle = glow;
      c.fillRect(chx - glowR, chy - glowR + 4, glowR * 2, glowR * 2);

      // Candle flames on arms
      var flamePositions = [chx - 18, chx - 10, chx + 10, chx + 18];
      for (var fi = 0; fi < flamePositions.length; fi++) {
        var fx = flamePositions[fi] + (Math.sin(frameCount * 0.08 + fi * 3 + ci * 7) * 0.5);
        var fy = chy - 6;
        c.fillStyle = '#ffaa22';
        c.fillRect(fx - 1, fy - 3, 2, 3);
        c.fillStyle = '#ffdd44';
        c.fillRect(fx, fy - 4, 1, 2);
      }

      // Crystal sparkles (5-6 dots per chandelier)
      for (var cri = 0; cri < 6; cri++) {
        if ((frameCount + hash(cri, ci * 100 + 500)) % 30 < 3) {
          var crAngle = (cri / 6) * Math.PI * 2;
          var crx = chx + Math.cos(crAngle) * 14;
          var cry = chy + Math.sin(crAngle) * 4 + 2;
          c.fillStyle = 'rgba(255,255,255,' + (0.6 + Math.random() * 0.3) + ')';
          c.fillRect(crx, cry, 1, 1);
        }
      }
    }

    // ── Wall sconce flames ──
    for (var si = 0; si < 6; si++) {
      var sx = WALL + 80 + si * 160;
      if (sx > CW - WALL - 40) break;
      var jitter = Math.sin(frameCount * 0.1 + si * 5) * 0.5;
      c.fillStyle = '#ff8822';
      c.fillRect(sx - 1 + jitter, WALL + 1, 3, 3);
      c.fillStyle = '#ffcc44';
      c.fillRect(sx + jitter, WALL, 1, 2);
      // Glow pool
      var scAlpha = 0.04 + Math.sin(frameCount * 0.03 + si * 4) * 0.02;
      c.fillStyle = 'rgba(255,160,60,' + scAlpha + ')';
      c.beginPath();
      c.arc(sx, WALL + 20, 25, 0, Math.PI * 2);
      c.fill();
    }

    // ── Neon wall signs (pulsing colored text) ──
    c.save();
    for (var ni = 0; ni < NEON_SIGNS.length; ni++) {
      var ns = NEON_SIGNS[ni];
      var nAlpha = 0.3 + Math.sin(frameCount * 0.025 + ns.seed * 7) * 0.2;
      c.globalAlpha = nAlpha;
      c.font = 'bold 9px monospace';
      c.textAlign = 'center';
      c.shadowColor = ns.color;
      c.shadowBlur = 8;
      c.fillStyle = ns.color;
      c.fillText(ns.text, ns.x, ns.y);
      c.fillText(ns.text, ns.x, ns.y); // double pass for stronger glow
    }
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    c.textAlign = 'left';
    c.restore();

    // ── Slot machine symbol reels ──
    var slotBase = TABLES.slots;
    var slotBX = slotBase.x - 10;
    var slotBY = slotBase.y - 50;
    for (var smi = 0; smi < 4; smi++) {
      var smx = slotBX + 4;
      var smy = slotBY + smi * 36 + 7;
      for (var reel = 0; reel < 3; reel++) {
        var symIdx = Math.floor(frameCount * 0.05 + smi * 2 + reel * 3) % 4;
        var rx = smx + reel * 8 + 1;
        var ry = smy + 1;
        switch (symIdx) {
          case 0: // Cherry — red circle + green stem
            c.fillStyle = '#cc2222';
            c.beginPath(); c.arc(rx + 3, ry + 6, 3, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#22aa22';
            c.fillRect(rx + 3, ry + 1, 1, 4);
            break;
          case 1: // 7 — gold text
            c.fillStyle = '#ffd700';
            c.font = 'bold 7px monospace';
            c.textAlign = 'center';
            c.fillText('7', rx + 3, ry + 8);
            c.textAlign = 'left';
            break;
          case 2: // Bar — gold rect with tiny text
            c.fillStyle = '#c0a040';
            c.fillRect(rx, ry + 3, 6, 4);
            c.fillStyle = '#1a1a2a';
            c.font = '3px monospace';
            c.textAlign = 'center';
            c.fillText('BAR', rx + 3, ry + 7);
            c.textAlign = 'left';
            break;
          case 3: // Diamond — 4-point gold path
            c.fillStyle = '#ffd700';
            c.beginPath();
            c.moveTo(rx + 3, ry + 1);
            c.lineTo(rx + 6, ry + 5);
            c.lineTo(rx + 3, ry + 9);
            c.lineTo(rx, ry + 5);
            c.fill();
            break;
        }
      }
      // Jackpot flash — every ~300 frames, one random machine
      if (frameCount % 300 < 3 && (hash(frameCount, 888) % 4) === smi) {
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.fillRect(smx, smy, 24, 10);
      }
    }

    // ── NPC Dealers (4, with idle bob) ──
    for (var di = 0; di < DEALERS.length; di++) {
      drawDealer(c, DEALERS[di], frameCount);
    }

    // ── NPC Patrons (8, static) ──
    for (var pai = 0; pai < PATRONS.length; pai++) {
      drawPatron(c, PATRONS[pai]);
    }

    // ── Bartender (with polishing animation) ──
    drawBartender(c, frameCount);

    // ── Floor lamp glow (animated pulse) ──
    for (var fli = 0; fli < FLOOR_LAMPS.length; fli++) {
      var lamp = FLOOR_LAMPS[fli];
      var flAlpha = 0.03 + Math.sin(frameCount * 0.02 + fli * 5) * 0.01;
      var flGrad = c.createRadialGradient(lamp.x, lamp.y - 12, 0, lamp.x, lamp.y - 12, 20);
      flGrad.addColorStop(0, 'rgba(255,230,180,' + flAlpha * 3 + ')');
      flGrad.addColorStop(1, 'rgba(255,230,180,0)');
      c.fillStyle = flGrad;
      c.fillRect(lamp.x - 20, lamp.y - 32, 40, 40);
    }

    // ── Gold dust particles (improved with shapes + drift) ──
    for (var dpi = 0; dpi < dustParticles.length; dpi++) {
      var p = dustParticles[dpi];
      p.y -= p.speed * 0.016; // ~60fps
      p.x += Math.sin(frameCount * 0.01 + p.seed) * 0.3; // horizontal drift
      if (p.y < -5) {
        p.y = CH + 5;
        p.x = 60 + Math.random() * (CW - 120);
      }
      if (p.x < 30) p.x = CW - 60;
      if (p.x > CW - 30) p.x = 60;

      c.fillStyle = 'rgba(255,215,0,' + p.alpha + ')';
      if (p.shape === 'square') {
        c.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.shape === 'bar') {
        c.fillRect(p.x, p.y, p.size * 2, 1);
      } else {
        c.beginPath();
        c.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Occasional coin particle — every ~120 frames
    if (frameCount % 120 < 1) {
      var coinX = 100 + hash(frameCount, 321) % (CW - 200);
      c.fillStyle = 'rgba(255,215,0,0.4)';
      c.beginPath(); c.arc(coinX, 50 + hash(frameCount, 322) % (CH - 100), 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.beginPath(); c.arc(coinX, 50 + hash(frameCount, 322) % (CH - 100), 1, 0, Math.PI * 2); c.fill();
    }

    // ── Bar bottle sparkle ──
    if (frameCount % 40 < 2) {
      var sparkIdx = hash(frameCount, 999) % 8;
      var sparkX = TABLES.bar.x - 88 + sparkIdx * 24 + 3;
      var sparkY = TABLES.bar.y - 50 + 8;
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(sparkX, sparkY, 1, 1);
    }

    // ── Phase 4: Felt shimmer under chandeliers ──
    for (var fsi = 0; fsi < 2; fsi++) {
      var fsTable = fsi === 0 ? TABLES.holdem : TABLES.sitandgo;
      var fsAlpha = 0.01 + Math.sin(frameCount * 0.015 + fsi * 3) * 0.01;
      c.fillStyle = 'rgba(255,255,255,' + Math.max(0, fsAlpha) + ')';
      c.beginPath();
      c.ellipse(fsTable.x + Math.sin(frameCount * 0.005) * 3, fsTable.y, 20, 12, 0, 0, Math.PI * 2);
      c.fill();
    }

    // ── Card shoe sparkle at blackjack (every ~60 frames) ──
    if (frameCount % 60 < 2) {
      var bjt = TABLES.blackjack;
      c.fillStyle = 'rgba(255,215,0,0.5)';
      c.fillRect(bjt.x + 60 + (hash(frameCount, 444) % 8), bjt.y - 8, 1, 1);
    }

    // ── Chip glint on poker tables (every ~80 frames) ──
    if (frameCount % 80 < 1) {
      var glintTable = (hash(frameCount, 555) % 2) === 0 ? TABLES.holdem : TABLES.sitandgo;
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillRect(glintTable.x + (hash(frameCount, 556) % 30) - 15, glintTable.y + (hash(frameCount, 557) % 20) - 10, 1, 1);
    }

    // ── Smoke/haze layer (drawn LAST, on top of everything) ──
    for (var hi = 0; hi < hazeClouds.length; hi++) {
      var hz = hazeClouds[hi];
      hz.x += hz.speed;
      if (hz.x > CW + hz.w) hz.x = -hz.w;
      if (hz.x < -hz.w) hz.x = CW + hz.w;
      c.fillStyle = 'rgba(180,170,160,0.015)';
      c.beginPath();
      c.ellipse(hz.x, hz.y, hz.w / 2, hz.h / 2, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Enter Prompt ──────────────────────────────────
  function drawEnterPrompt(c) {
    if (!playerAtTable) return;
    var t = TABLES[playerAtTable];
    if (!t) return;

    var label = t.desc === null ? 'Sit at ' + t.name : 'Play ' + t.name;
    c.font = 'bold 11px monospace';
    c.textAlign = 'center';
    var tw = c.measureText(label).width;
    var px = playerPos.x;
    var py = playerPos.y - 40;
    var bw = tw + 20, bh = 22;
    var bx = px - bw / 2, by = py - 12;

    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(bx + 2, by + 2, bw, bh);
    c.fillStyle = 'rgba(0,0,0,0.85)';
    c.fillRect(bx, by, bw, bh);
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.strokeRect(bx, by, bw, bh);
    c.strokeStyle = '#e0c060';
    c.lineWidth = 1;
    c.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

    c.fillStyle = '#ffdd44';
    c.fillText(label, px, py + 2);

    var arrow = Math.sin(frameCount * 0.08) * 2;
    c.fillStyle = '#ffdd44';
    c.fillRect(px - 2, by + bh + 2 + arrow, 4, 2);
    c.fillRect(px - 1, by + bh + 4 + arrow, 2, 2);
    c.textAlign = 'left';
  }

  // ── Return Button ─────────────────────────────────
  function drawReturnButton(c) {
    var text = '\u2190 Leave Casino';
    c.font = 'bold 12px monospace';
    c.textAlign = 'left';
    var tw = c.measureText(text).width;
    var bx = WALL + 6, by = WALL + 4;
    var bw = tw + 18, bh = 22;

    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(bx + 2, by + 2, bw, bh);
    c.fillStyle = 'rgba(0,0,0,0.85)';
    c.fillRect(bx, by, bw, bh);
    c.strokeStyle = '#c0a040';
    c.lineWidth = 2;
    c.strokeRect(bx, by, bw, bh);
    c.strokeStyle = '#e0c060';
    c.lineWidth = 1;
    c.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
    c.fillStyle = '#ffdd44';
    c.fillText(text, bx + 9, by + 15);
  }

  // ── Player Movement ───────────────────────────────
  function updatePlayer(dt) {
    if (!playerTarget) {
      playerAnimTimer += dt;
      if (playerAnimTimer > 0.3) {
        playerAnimTimer = 0;
        playerFrame = (playerFrame + 1) % 4;
      }
      return;
    }

    var dx = playerTarget.x - playerPos.x;
    var dy = playerTarget.y - playerPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      playerPos.x = playerTarget.x;
      playerPos.y = playerTarget.y;
      playerTarget = null;
      playerFrame = 0;

      // Check proximity to tables
      playerAtTable = null;
      for (var i = 0; i < TABLE_ORDER.length; i++) {
        var id = TABLE_ORDER[i];
        var t = TABLES[id];
        var tdx = playerPos.x - t.x;
        var tdy = playerPos.y - t.y;
        if (Math.sqrt(tdx * tdx + tdy * tdy) < ENTER_RADIUS) {
          playerAtTable = id;
          break;
        }
      }
      if (playerAtTable) {
        var tbl = TABLES[playerAtTable];
        if (playerAtTable === 'bar') {
          msg(BAR_LINES[hash(frameCount, 123) % BAR_LINES.length], 'system');
        } else {
          msg('You approach the ' + tbl.name + '.', 'arrival');
        }
      }
      enterPromptVisible = !!playerAtTable;
      return;
    }

    // Direction
    if (Math.abs(dx) > Math.abs(dy)) {
      playerDir = dx > 0 ? 'right' : 'left';
    } else {
      playerDir = dy > 0 ? 'down' : 'up';
    }

    var step = PLAYER_SPEED * dt;
    if (step > dist) step = dist;
    var nx = playerPos.x + (dx / dist) * step;
    var ny = playerPos.y + (dy / dist) * step;

    // Clamp to casino floor (inside walls)
    nx = Math.max(WALL + 16, Math.min(CW - WALL - 16, nx));
    ny = Math.max(WALL + 16, Math.min(CH - WALL - 16, ny));
    playerPos.x = nx;
    playerPos.y = ny;

    playerAnimTimer += dt;
    if (playerAnimTimer > 0.12) {
      playerAnimTimer = 0;
      playerFrame = (playerFrame + 1) % 6;
    }
    enterPromptVisible = false;
  }

  // ── Click Handler ─────────────────────────────────
  function onClick(e) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = CW / rect.width;
    var scaleY = CH / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;

    // Return button
    if (cx < 180 && cy < 60) {
      leaveCasino();
      return;
    }

    // Enter prompt click
    if (enterPromptVisible && playerAtTable) {
      var promptY = playerPos.y - 40;
      if (Math.abs(cx - playerPos.x) < 80 && Math.abs(cy - promptY) < 16) {
        onTableInteract(playerAtTable);
        return;
      }
    }

    // Walk to table or free walk
    var closest = null, closestDist = Infinity;
    for (var i = 0; i < TABLE_ORDER.length; i++) {
      var id = TABLE_ORDER[i];
      var t = TABLES[id];
      var tdx = cx - t.x;
      var tdy = cy - t.y;
      var d = Math.sqrt(tdx * tdx + tdy * tdy);
      if (d < 60 && d < closestDist) {
        closest = id;
        closestDist = d;
      }
    }

    if (closest) {
      if (playerAtTable === closest) {
        onTableInteract(closest);
      } else {
        // Walk toward table — offset so player stands in front
        var tbl = TABLES[closest];
        playerTarget = { x: tbl.x, y: tbl.y + 35 };
        if (closest === 'slots') playerTarget = { x: tbl.x - 25, y: tbl.y };
        if (closest === 'bar') playerTarget = { x: tbl.x, y: tbl.y + 42 };
        playerAtTable = null;
        enterPromptVisible = false;
        playerFrame = 1;
      }
    } else {
      // Free walk
      var tx = Math.max(WALL + 16, Math.min(CW - WALL - 16, cx));
      var ty = Math.max(WALL + 16, Math.min(CH - WALL - 16, cy));
      playerTarget = { x: tx, y: ty };
      playerAtTable = null;
      enterPromptVisible = false;
      playerFrame = 1;
    }
  }

  // ── Table Interaction ─────────────────────────────
  function onTableInteract(tableId) {
    if (tableId === 'bar') {
      msg(BAR_LINES[hash(Date.now(), 456) % BAR_LINES.length], 'system');
      return;
    }
    // Show coming soon modal
    showTableModal(tableId);
  }

  function showTableModal(tableId) {
    var t = TABLES[tableId];
    if (!t) return;

    // Remove existing
    var existing = document.getElementById('rpg-casino-table-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'rpg-casino-table-modal';
    overlay.className = 'rpg-modal-overlay';
    overlay.style.display = 'flex';

    var html = '<div class="rpg-modal rpg-casino-modal">';
    html += '<div class="rpg-modal-header"><h3>' + t.name + '</h3>';
    html += '<button class="rpg-modal-close" id="rpg-casino-modal-close">&times;</button></div>';
    html += '<div class="rpg-casino-modal-body">';

    // Mini canvas preview of the table
    html += '<canvas class="rpg-casino-table-art" id="rpg-casino-preview" width="200" height="120"></canvas>';

    html += '<div class="rpg-casino-game-desc">' + t.desc + '</div>';
    html += '<div class="rpg-casino-coming-soon">Coming Soon</div>';
    html += '</div></div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Draw table preview
    setTimeout(function () {
      var prev = document.getElementById('rpg-casino-preview');
      if (prev) {
        var pc = prev.getContext('2d');
        // Dark bg
        pc.fillStyle = '#2a0a14';
        pc.fillRect(0, 0, 200, 120);
        // Draw the specific table centered
        pc.save();
        pc.translate(100 - t.x, 60 - t.y);
        if (tableId === 'holdem') drawHoldemTable(pc);
        else if (tableId === 'sitandgo') drawSitAndGoTable(pc);
        else if (tableId === 'blackjack') drawBlackjackTable(pc);
        else if (tableId === 'wars') drawWarsTable(pc);
        else if (tableId === 'slots') {
          pc.translate(t.x - 100 + 16, t.y - 60 + 30);
          drawSlotMachines(pc);
        }
        pc.restore();
      }
    }, 10);

    // Close handlers
    document.getElementById('rpg-casino-modal-close').addEventListener('click', closeTableModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeTableModal();
    });
  }

  function closeTableModal() {
    var m = document.getElementById('rpg-casino-table-modal');
    if (m) m.remove();
  }

  // ── Main Draw ─────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2); // retina: canvas is 2x logical size

    if (!staticBuffer) renderStaticBuffer();
    ctx.drawImage(staticBuffer, 0, 0);
    drawAnimated(ctx);

    // Draw follower (via bridge)
    if (bridge && bridge.drawFollower) {
      bridge.updateFollower(playerPos, playerDir);
      bridge.drawFollower(ctx);
    }

    // Draw player (via bridge)
    if (bridge && bridge.drawPlayer) {
      var animType = playerTarget ? 'walk' : 'idle';
      bridge.drawPlayer(ctx, playerPos.x, playerPos.y, playerDir, playerFrame, animType);
    }

    drawReturnButton(ctx);
    if (enterPromptVisible) drawEnterPrompt(ctx);

    ctx.restore();
  }

  // ── Animation Loop ────────────────────────────────
  function loop(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    var dt = Math.min((ts - lastTimestamp) / 1000, 0.1);
    lastTimestamp = ts;
    frameCount++;
    updatePlayer(dt);
    if (bridge && bridge.updateFollower) {
      bridge.updateFollower(playerPos, playerDir, dt);
    }
    draw();
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
  function enterCasino(canvasEl, bridgeAPI) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    bridge = bridgeAPI;

    // Reset state
    playerPos = { x: CW / 2, y: CH - WALL - 30 };
    playerTarget = null;
    playerDir = 'up';
    playerFrame = 0;
    playerAnimTimer = 0;
    playerAtTable = null;
    enterPromptVisible = false;
    frameCount = 0;
    lastTimestamp = 0;
    staticBuffer = null; // force re-render
    lightPoolBuffer = null;

    canvas.addEventListener('click', onClick);
    startLoop();
    msg('You push through the velvet curtains into the casino. Smoke and gold light fill the air.', 'enter');
  }

  function leaveCasino() {
    stopLoop();
    closeTableModal();
    if (canvas) canvas.removeEventListener('click', onClick);
    if (bridge && bridge.onLeave) bridge.onLeave();
  }

  function handleEscape() {
    var modal = document.getElementById('rpg-casino-table-modal');
    if (modal) {
      closeTableModal();
      return true;
    }
    leaveCasino();
    return true;
  }

  function isActive() {
    return !!animId;
  }

  // ── Public API ────────────────────────────────────
  window.RpgCasino = {
    enter: enterCasino,
    leave: leaveCasino,
    handleEscape: handleEscape,
    isActive: isActive
  };
})();
