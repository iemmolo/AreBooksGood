(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var STATS_KEY = 'trebuchet-stats';
  var CANVAS_W = 720;
  var CANVAS_H = 340;
  var GROUND_Y = 280; // y position of ground line on canvas
  var GRAVITY = 9.8;
  var BASE_POWER = 35;
  var DT = 0.05;
  var PIXELS_PER_METER = 4; // for camera / distance rendering
  var TREBUCHET_X = 80; // world x position of trebuchet base
  var HILL_HEIGHT = 30;

  // Launch animation timing (frames at 60fps)
  var COUNTDOWN_FRAMES = 120; // 2 seconds (3..2..1)
  var SWING_FRAMES = 30;
  var FLIGHT_MAX_FRAMES = 3000; // safety cap

  // Camera
  var CAM_EASE = 0.08;
  var CAM_LEAD = 120;

  // ── Part definitions ──────────────────────────
  var PARTS = {
    counterweight: [
      { name: 'Sandbag',     tier: 1, power: 40 },
      { name: 'Stone Block', tier: 1, power: 60 },
      { name: 'Iron Weight', tier: 2, power: 80 },
      { name: 'Water Barrel',tier: 2, power: 70 },
      { name: 'Lead Ingot',  tier: 3, power: 95 },
      { name: 'Anvil',       tier: 3, power: 100 }
    ],
    arm: [
      { name: 'Short Oak',    tier: 1, leverage: 40 },
      { name: 'Pine Beam',    tier: 1, leverage: 55 },
      { name: 'Long Oak',     tier: 2, leverage: 75 },
      { name: 'Reinforced',   tier: 2, leverage: 70 },
      { name: 'Steel Beam',   tier: 3, leverage: 90 },
      { name: 'Carbon Fiber', tier: 3, leverage: 85 }
    ],
    sling: [
      { name: 'Rope',           tier: 1, accuracy: 50, angleMod: 0 },
      { name: 'Leather Strap',  tier: 1, accuracy: 60, angleMod: -5 },
      { name: 'Chain',          tier: 2, accuracy: 70, angleMod: 10 },
      { name: 'Silk Cord',      tier: 2, accuracy: 80, angleMod: 0 },
      { name: 'Elastic Band',   tier: 3, accuracy: 85, angleMod: 5 },
      { name: 'Titanium Chain', tier: 3, accuracy: 95, angleMod: 0 }
    ],
    projectile: [
      { name: 'Rock',            tier: 1, weight: 60, drag: 0.3 },
      { name: 'Pumpkin',         tier: 1, weight: 30, drag: 0.5 },
      { name: 'Iron Ball',       tier: 2, weight: 80, drag: 0.2 },
      { name: 'Hay Bale',        tier: 2, weight: 20, drag: 0.7 },
      { name: 'Cannonball',      tier: 3, weight: 90, drag: 0.15 },
      { name: 'Flaming Boulder', tier: 3, weight: 75, drag: 0.25 }
    ]
  };

  // ── Milestones ────────────────────────────────
  var MILESTONES = [
    { dist: 75,  unlock: 'counterweight', tier: 2, jb: 5,  label: '75m — Tier 2 Counterweights' },
    { dist: 120, unlock: 'arm',           tier: 2, jb: 5,  label: '120m — Tier 2 Arms' },
    { dist: 180, unlock: 'sling',         tier: 2, jb: 5,  label: '180m — Tier 2 Slings' },
    { dist: 250, unlock: 'projectile',    tier: 2, jb: 10, label: '250m — Tier 2 Projectiles' },
    { dist: 350, unlock: 'counterweight', tier: 3, jb: 10, label: '350m — Tier 3 Counterweights' },
    { dist: 425, unlock: 'arm',           tier: 3, jb: 10, label: '425m — Tier 3 Arms' },
    { dist: 500, unlock: 'sling',         tier: 3, jb: 15, label: '500m — Tier 3 Slings' },
    { dist: 600, unlock: 'projectile',    tier: 3, jb: 15, label: '600m — Tier 3 Projectiles' }
  ];

  // ── DOM refs ──────────────────────────────────
  var canvas = document.getElementById('tb-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var hudBest = document.getElementById('tb-best');
  var hudLaunches = document.getElementById('tb-launches');
  var hudUnlocks = document.getElementById('tb-unlocks');

  var startOverlay = document.getElementById('tb-start-overlay');
  var resultsOverlay = document.getElementById('tb-results-overlay');
  var playBtn = document.getElementById('tb-play-btn');
  var nextBtn = document.getElementById('tb-next-btn');
  var launchBtn = document.getElementById('tb-launch-btn');
  // reroll removed — all parts shown in scrollable list

  var partsContainer = document.getElementById('tb-parts');
  var actionsContainer = document.getElementById('tb-actions');
  var windArrow = document.getElementById('tb-wind-arrow');
  var windSpeed = document.getElementById('tb-wind-speed');

  var resultDistance = document.getElementById('tb-result-distance');
  var resultCoins = document.getElementById('tb-result-coins');
  var resultJB = document.getElementById('tb-result-jb');
  var resultRecord = document.getElementById('tb-result-record');
  var resultUnlock = document.getElementById('tb-result-unlock');

  var statBest = document.getElementById('tb-stat-best');
  var statLaunches = document.getElementById('tb-stat-launches');
  var statTotalDist = document.getElementById('tb-stat-total-dist');
  var statCoins = document.getElementById('tb-stat-coins');
  var statJB = document.getElementById('tb-stat-jb');
  var statUnlocks = document.getElementById('tb-stat-unlocks');
  var milestonesEl = document.getElementById('tb-milestones');
  var resetBtn = document.getElementById('tb-reset-stats');

  var cardContainers = {
    counterweight: document.getElementById('tb-counterweight-cards'),
    arm: document.getElementById('tb-arm-cards'),
    sling: document.getElementById('tb-sling-cards'),
    projectile: document.getElementById('tb-projectile-cards')
  };

  // ── State ─────────────────────────────────────
  var stats = loadStats();
  var gamePhase = 'idle'; // idle, build, countdown, launching, flight, landed
  var selectedParts = { counterweight: null, arm: null, sling: null, projectile: null };
  var currentHand = { counterweight: [], arm: [], sling: [], projectile: [] };
  var wind = { speed: 0, direction: 1 }; // direction: 1 = right, -1 = left

  // Animation state
  var animFrame = 0;
  var swingAngle = 0;
  var projectilePos = { x: 0, y: 0 };
  var projectileVel = { x: 0, y: 0 };
  var cameraX = 0;
  var targetCameraX = 0;
  var trail = [];
  var countdownNum = 3;
  var launchDistance = 0;
  var shakeFrames = 0;
  var shakeIntensity = 0;
  var flagX = 0;
  var bounceCount = 0;

  // Power meter state
  var powerMeterValue = 0;
  var powerMeterDir = 1;
  var powerMeterSpeed = 0.025;
  var lockedPower = 0;

  // Angle aimer state
  var angleSweepValue = 45;
  var angleSweepDir = 1;
  var lockedAngle = 45;

  // Parallax clouds
  var clouds = [];
  for (var ci = 0; ci < 6; ci++) {
    clouds.push({
      x: Math.random() * CANVAS_W * 3,
      y: 20 + Math.random() * 80,
      w: 40 + Math.random() * 60,
      speed: 0.2 + Math.random() * 0.3
    });
  }

  // Impact particles
  var particles = [];

  // Castles
  var castles = [];
  var castleBonus = 0;
  var castlesDestroyed = 0;
  var bonusTexts = []; // floating "+BONUS" texts

  // ── Canvas sizing ─────────────────────────────
  function sizeCanvas() {
    var area = document.getElementById('tb-game-area');
    var w = area ? area.clientWidth : CANVAS_W;
    if (w > CANVAS_W) w = CANVAS_W;
    var ratio = w / CANVAS_W;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.width = w + 'px';
    canvas.style.height = Math.floor(CANVAS_H * ratio) + 'px';
  }

  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // ── Stats persistence ─────────────────────────
  function defaultStats() {
    return {
      bestDistance: 0,
      totalLaunches: 0,
      totalDistance: 0,
      unlockedTiers: { counterweight: 1, arm: 1, sling: 1, projectile: 1 },
      milestones: [],
      coinsEarned: 0,
      jbEarned: 0
    };
  }

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        return {
          bestDistance: s.bestDistance || 0,
          totalLaunches: s.totalLaunches || 0,
          totalDistance: s.totalDistance || 0,
          unlockedTiers: s.unlockedTiers || { counterweight: 1, arm: 1, sling: 1, projectile: 1 },
          milestones: s.milestones || [],
          coinsEarned: s.coinsEarned || 0,
          jbEarned: s.jbEarned || 0
        };
      }
    } catch (e) {}
    return defaultStats();
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  // ── UI Updates ────────────────────────────────
  function updateHUD() {
    hudBest.textContent = Math.floor(stats.bestDistance);
    hudLaunches.textContent = stats.totalLaunches;
    hudUnlocks.textContent = stats.milestones.length;
  }

  function updateStatsPanel() {
    statBest.textContent = Math.floor(stats.bestDistance) + 'm';
    statLaunches.textContent = stats.totalLaunches;
    statTotalDist.textContent = Math.floor(stats.totalDistance) + 'm';
    statCoins.textContent = stats.coinsEarned;
    statJB.textContent = stats.jbEarned;
    statUnlocks.textContent = stats.milestones.length + ' / 8';
    renderMilestones();
  }

  function renderMilestones() {
    var html = '';
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      var done = stats.milestones.indexOf(m.dist) !== -1;
      html += '<div class="tb-milestone ' + (done ? 'tb-milestone-done' : 'tb-milestone-pending') + '">';
      html += '<span class="tb-milestone-check">' + (done ? 'x' : 'o') + '</span>';
      html += '<span class="tb-milestone-text">' + m.label + ' (+' + m.jb + ' JB)</span>';
      html += '</div>';
    }
    milestonesEl.innerHTML = html;
  }

  // ── Wind ──────────────────────────────────────
  function generateWind() {
    wind.speed = Math.floor(Math.random() * 25) + 1;
    wind.direction = Math.random() < 0.5 ? -1 : 1;
    var arrows = '';
    var count = wind.speed <= 8 ? 1 : wind.speed <= 16 ? 2 : 3;
    var arrow = wind.direction > 0 ? '>' : '<';
    for (var i = 0; i < count; i++) arrows += arrow;
    windArrow.textContent = arrows;
    windSpeed.textContent = wind.speed;
  }

  // ── Hand dealing ──────────────────────────────
  function getAvailableParts(category) {
    var maxTier = stats.unlockedTiers[category] || 1;
    var available = [];
    for (var i = 0; i < PARTS[category].length; i++) {
      if (PARTS[category][i].tier <= maxTier) {
        available.push(PARTS[category][i]);
      }
    }
    return available;
  }

  function getPartStat(cat, part) {
    if (cat === 'counterweight') return part.power;
    if (cat === 'arm') return part.leverage;
    if (cat === 'sling') return part.accuracy;
    return part.weight;
  }

  function dealHand() {
    var categories = ['counterweight', 'arm', 'sling', 'projectile'];
    for (var c = 0; c < categories.length; c++) {
      var cat = categories[c];
      // Show ALL parts, sorted best (highest stat) to worst
      var all = PARTS[cat].slice();
      all.sort(function (a, b) {
        return getPartStat(cat, b) - getPartStat(cat, a);
      });
      currentHand[cat] = all;
    }
    selectedParts = { counterweight: null, arm: null, sling: null, projectile: null };
  }

  // ── Card rendering ────────────────────────────
  function renderCards() {
    var categories = ['counterweight', 'arm', 'sling', 'projectile'];
    for (var c = 0; c < categories.length; c++) {
      var cat = categories[c];
      var container = cardContainers[cat];
      var maxTier = stats.unlockedTiers[cat] || 1;
      container.innerHTML = '';
      for (var i = 0; i < currentHand[cat].length; i++) {
        var part = currentHand[cat][i];
        var locked = part.tier > maxTier;
        var card = document.createElement('div');
        card.className = 'tb-card';
        if (selectedParts[cat] === part) card.className += ' tb-selected';
        if (locked) card.className += ' tb-locked';

        var statText = '';
        if (cat === 'counterweight') statText = 'PWR ' + part.power;
        else if (cat === 'arm') statText = 'LEV ' + part.leverage;
        else if (cat === 'sling') statText = 'ACC ' + part.accuracy;
        else statText = 'WGT ' + part.weight;

        var lockIcon = locked ? '<span class="tb-card-lock">LOCKED</span>' : '';
        card.innerHTML = '<span class="tb-card-tier tb-tier-' + part.tier + '">T' + part.tier + '</span>' +
          '<span class="tb-card-name">' + part.name + '</span>' +
          '<span class="tb-card-stat">' + statText + '</span>' + lockIcon;

        if (!locked) {
          card.setAttribute('data-cat', cat);
          card.setAttribute('data-idx', String(i));
          card.addEventListener('click', onCardClick);
        }
        container.appendChild(card);
      }
    }
    checkLaunchReady();
  }

  function onCardClick(e) {
    var card = e.currentTarget;
    var cat = card.getAttribute('data-cat');
    var idx = parseInt(card.getAttribute('data-idx'), 10);
    selectedParts[cat] = currentHand[cat][idx];
    renderCards();
    drawScene();
  }

  function checkLaunchReady() {
    var ready = selectedParts.counterweight && selectedParts.arm &&
                selectedParts.sling && selectedParts.projectile;
    launchBtn.disabled = !ready;
  }

  // ── Physics ───────────────────────────────────
  function calculateLaunch() {
    var cw = selectedParts.counterweight;
    var arm = selectedParts.arm;
    var sl = selectedParts.sling;
    var proj = selectedParts.projectile;

    var baseLaunchSpeed = BASE_POWER * (cw.power / 100) * (arm.leverage / 100) * 1.8;

    // Elastic band bonus
    if (sl.angleMod === 5) baseLaunchSpeed *= 1.08;

    // Apply power meter result (0.5x to 1.25x)
    var powerMultiplier = 0.5 + lockedPower * 0.75;
    var launchSpeed = baseLaunchSpeed * powerMultiplier;

    // Use locked angle with small accuracy-based jitter
    var jitter = (100 - sl.accuracy) / 20;
    var releaseAngle = lockedAngle + (Math.random() * 2 - 1) * jitter;
    var rad = releaseAngle * Math.PI / 180;

    projectilePos.x = TREBUCHET_X - 10;
    projectilePos.y = GROUND_Y - HILL_HEIGHT - 50;
    projectileVel.x = Math.cos(rad) * launchSpeed;
    projectileVel.y = -Math.sin(rad) * launchSpeed;

    trail = [];
    bounceCount = 0;
  }

  function stepProjectile() {
    var proj = selectedParts.projectile;
    var windForce = wind.direction * wind.speed * 0.15 * (1 - proj.weight / 100);

    projectileVel.x += windForce * DT;
    projectileVel.x *= (1 - proj.drag * DT * 0.5);
    projectileVel.y *= (1 - proj.drag * DT * 0.12);
    projectileVel.y += GRAVITY * DT * 3.5;

    projectilePos.x += projectileVel.x;
    projectilePos.y += projectileVel.y;

    trail.push({ x: projectilePos.x, y: projectilePos.y });
    if (trail.length > 300) trail.shift();
  }

  // ── Drawing ───────────────────────────────────
  function getThemeColors() {
    var style = getComputedStyle(document.documentElement);
    return {
      bg: style.getPropertyValue('--background').trim(),
      fg: style.getPropertyValue('--foreground').trim(),
      accent: style.getPropertyValue('--accent').trim()
    };
  }

  function drawScene() {
    var colors = getThemeColors();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Apply screen shake
    var sx = 0, sy = 0;
    if (shakeFrames > 0) {
      sx = (Math.random() - 0.5) * shakeIntensity;
      sy = (Math.random() - 0.5) * shakeIntensity;
      shakeFrames--;
      shakeIntensity *= 0.9;
    }

    ctx.save();
    ctx.translate(sx, sy);

    // Sky gradient
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Clouds (parallax)
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = colors.fg;
    for (var ci = 0; ci < clouds.length; ci++) {
      var cl = clouds[ci];
      var cx = cl.x - cameraX * cl.speed * 0.3;
      // Wrap clouds
      cx = ((cx % (CANVAS_W * 2)) + CANVAS_W * 2) % (CANVAS_W * 2) - CANVAS_W * 0.5;
      ctx.beginPath();
      ctx.ellipse(cx, cl.y, cl.w / 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = colorMix(colors.fg, 0.12, colors.bg);
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // Ground line
    ctx.strokeStyle = colorMix(colors.fg, 0.3, colors.bg);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();

    // Distance markers
    drawDistanceMarkers(colors);

    // Hill under trebuchet
    // Quadratic bezier peak at t=0.5 = (start + 2*control + end)/4
    // To make peak reach GROUND_Y - HILL_HEIGHT, control y = GROUND_Y - HILL_HEIGHT * 2
    var hillCenterX = TREBUCHET_X - cameraX;
    ctx.fillStyle = colorMix(colors.fg, 0.18, colors.bg);
    ctx.beginPath();
    ctx.moveTo(hillCenterX - 60, GROUND_Y);
    ctx.quadraticCurveTo(hillCenterX, GROUND_Y - HILL_HEIGHT * 2, hillCenterX + 60, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Castles
    drawCastles(colors);

    // Trebuchet
    drawTrebuchet(colors);

    // Trail
    if (trail.length > 1) {
      ctx.strokeStyle = colorMix(colors.accent, 0.4, colors.bg);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (var ti = 0; ti < trail.length; ti++) {
        var tp = trail[ti];
        var tsx = tp.x - cameraX;
        if (ti === 0) ctx.moveTo(tsx, tp.y);
        else ctx.lineTo(tsx, tp.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Projectile
    if (gamePhase === 'flight' || gamePhase === 'landed') {
      drawProjectile(colors);
    }

    // Impact flag
    if (gamePhase === 'landed' && flagX > 0) {
      var fx = flagX - cameraX;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, GROUND_Y);
      ctx.lineTo(fx, GROUND_Y - 30);
      ctx.stroke();
      // Flag triangle
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(fx, GROUND_Y - 30);
      ctx.lineTo(fx + 14, GROUND_Y - 24);
      ctx.lineTo(fx, GROUND_Y - 18);
      ctx.closePath();
      ctx.fill();
      // Distance text
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.floor(launchDistance) + 'm', fx, GROUND_Y - 34);
    }

    // Particles
    drawParticles(colors);

    // Countdown
    if (gamePhase === 'countdown') {
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.8;
      ctx.fillText('FIRE!', CANVAS_W / 2, CANVAS_H / 2);
      ctx.globalAlpha = 1;
    }

    // Power meter
    if (gamePhase === 'power-charge') {
      drawPowerMeter(colors);
    }

    // Angle aimer
    if (gamePhase === 'angle-aim') {
      drawAngleAimer(colors);
    }

    // Wind indicator on canvas
    if (gamePhase === 'build' || gamePhase === 'power-charge' || gamePhase === 'angle-aim' || gamePhase === 'countdown') {
      var windStr = wind.direction > 0 ? '>>>' : '<<<';
      if (wind.speed <= 8) windStr = wind.direction > 0 ? '>' : '<';
      else if (wind.speed <= 16) windStr = wind.direction > 0 ? '>>' : '<<';
      ctx.fillStyle = colorMix(colors.fg, 0.5, colors.bg);
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('WIND ' + windStr + ' ' + wind.speed + 'km/h', CANVAS_W - 10, 20);
    }

    ctx.restore();
  }

  function drawDistanceMarkers(colors) {
    ctx.fillStyle = colorMix(colors.fg, 0.25, colors.bg);
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    // Draw markers every 50m
    var startM = Math.floor(cameraX / (50 * PIXELS_PER_METER)) * 50;
    for (var m = startM; m < startM + 500; m += 50) {
      if (m <= 0) continue;
      var mx = TREBUCHET_X + m * PIXELS_PER_METER - cameraX;
      if (mx < -20 || mx > CANVAS_W + 20) continue;
      // Tick
      ctx.strokeStyle = colorMix(colors.fg, 0.15, colors.bg);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx, GROUND_Y + 8);
      ctx.stroke();
      // Label
      ctx.fillText(m + 'm', mx, GROUND_Y + 18);
    }
  }

  function drawTrebuchet(colors) {
    var bx = TREBUCHET_X - cameraX;
    var by = GROUND_Y - HILL_HEIGHT;

    // Base (A-frame)
    ctx.strokeStyle = colorMix(colors.fg, 0.7, colors.bg);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 15, by);
    ctx.lineTo(bx, by - 30);
    ctx.lineTo(bx + 15, by);
    ctx.stroke();

    // Pivot point
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(bx, by - 30, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arm
    var armLen = 50;
    var shortEnd = 18;
    if (selectedParts.arm) {
      armLen = 35 + selectedParts.arm.leverage * 0.25;
    }

    var angle = swingAngle; // radians, 0 = horizontal, positive = counterweight down
    var longX = bx - Math.cos(angle) * armLen;
    var longY = (by - 30) - Math.sin(angle) * armLen;
    var shortX = bx + Math.cos(angle) * shortEnd;
    var shortY = (by - 30) + Math.sin(angle) * shortEnd;

    // Arm color changes with tier
    var armColor = colors.fg;
    if (selectedParts.arm && selectedParts.arm.tier >= 2) armColor = colors.accent;
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shortX, shortY);
    ctx.lineTo(longX, longY);
    ctx.stroke();

    // Counterweight (on short end)
    var cwSize = 10;
    if (selectedParts.counterweight) {
      cwSize = 8 + selectedParts.counterweight.power * 0.06;
    }
    var cwColor = colorMix(colors.fg, 0.6, colors.bg);
    if (selectedParts.counterweight && selectedParts.counterweight.tier >= 2) cwColor = colors.accent;
    ctx.fillStyle = cwColor;
    ctx.fillRect(shortX - cwSize / 2, shortY - cwSize / 2, cwSize, cwSize);

    // Sling (on long end) — a dangling line + projectile
    if (gamePhase !== 'flight' && gamePhase !== 'landed') {
      var slingLen = 20;
      if (selectedParts.sling) slingLen = 15 + selectedParts.sling.accuracy * 0.1;
      var slingEndX = longX;
      var slingEndY = longY + slingLen;

      ctx.strokeStyle = colorMix(colors.fg, 0.5, colors.bg);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(longX, longY);
      ctx.lineTo(slingEndX, slingEndY);
      ctx.stroke();

      // Projectile in sling
      var projRadius = 5;
      if (selectedParts.projectile) {
        projRadius = 3 + selectedParts.projectile.weight * 0.04;
      }
      var projColor = colorMix(colors.fg, 0.8, colors.bg);
      if (selectedParts.projectile && selectedParts.projectile.name === 'Flaming Boulder') {
        projColor = '#ff6622';
      } else if (selectedParts.projectile && selectedParts.projectile.tier >= 2) {
        projColor = colors.accent;
      }
      ctx.fillStyle = projColor;
      ctx.beginPath();
      ctx.arc(slingEndX, slingEndY, projRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawProjectile(colors) {
    var px = projectilePos.x - cameraX;
    var py = projectilePos.y;
    var proj = selectedParts.projectile;

    var radius = 5;
    var projColor = colors.fg;
    if (proj) {
      radius = 3 + proj.weight * 0.04;
      if (proj.name === 'Flaming Boulder') {
        projColor = '#ff6622';
      } else if (proj.tier >= 2) {
        projColor = colors.accent;
      }
    }

    ctx.fillStyle = projColor;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // Universal flame & smoke trail during flight
    if (gamePhase === 'flight') {
      var speed = Math.sqrt(projectileVel.x * projectileVel.x + projectileVel.y * projectileVel.y);
      var isFlaming = proj && proj.name === 'Flaming Boulder';
      var flameCount = isFlaming ? 5 : 3;
      var smokeCount = isFlaming ? 3 : 2;
      var intensity = Math.min(speed / 15, 1);

      // Normalize velocity for positioning behind projectile
      var vnx = speed > 0 ? -projectileVel.x / speed : 0;
      var vny = speed > 0 ? -projectileVel.y / speed : 0;

      // Flames (orange/red behind projectile)
      for (var fi = 0; fi < flameCount; fi++) {
        var fDist = (fi + 1) * (4 + intensity * 4);
        var fr = radius * (0.3 + intensity * 0.4) * (1 - fi / (flameCount + 1));
        var fx = px + vnx * fDist + (Math.random() - 0.5) * 5;
        var fy = py + vny * fDist + (Math.random() - 0.5) * 5;
        ctx.globalAlpha = (0.35 - fi * 0.06) * intensity;
        ctx.fillStyle = isFlaming
          ? (fi < 2 ? '#ff4400' : '#ff8844')
          : (fi === 0 ? '#ff8844' : '#ffaa44');
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Smoke (grey, drifts upward)
      for (var si = 0; si < smokeCount; si++) {
        var sDist = (flameCount + si + 1) * (4 + intensity * 3);
        var sr = radius * (0.25 + intensity * 0.3);
        var smx = px + vnx * sDist + (Math.random() - 0.5) * 6;
        var smy = py + vny * sDist - (si + 1) * 3 + (Math.random() - 0.5) * 4;
        ctx.globalAlpha = (0.15 - si * 0.04) * intensity;
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(smx, smy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }

  function drawParticles(colors) {
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) {
        particles.splice(pi, 1);
        continue;
      }
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color || colors.accent;
      ctx.fillRect(p.x - cameraX - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  function spawnImpactParticles(x, y, color, count) {
    var n = count || 20;
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 4;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 20 + Math.floor(Math.random() * 20),
        maxLife: 40,
        color: color
      });
    }
  }

  // ── Castles ──────────────────────────────────
  function initCastles() {
    var distances = [100, 200, 350, 500, 700, 900];
    castles = [];
    for (var i = 0; i < distances.length; i++) {
      var d = distances[i];
      var scale = 0.6 + (i / (distances.length - 1)) * 0.6;
      castles.push({
        x: TREBUCHET_X + d * PIXELS_PER_METER,
        width: 28 + Math.floor(scale * 20),
        height: 30 + Math.floor(scale * 30),
        hp: 1,
        destroyed: false,
        dist: d,
        bonus: 10 + i * 8
      });
    }
    castleBonus = 0;
    castlesDestroyed = 0;
    bonusTexts = [];
  }

  function drawCastles(colors) {
    for (var i = 0; i < castles.length; i++) {
      var c = castles[i];
      var cx = c.x - cameraX;
      if (cx < -60 || cx > CANVAS_W + 60) continue;

      if (c.destroyed) {
        // Rubble — small rectangles on ground
        ctx.fillStyle = colorMix(colors.fg, 0.25, colors.bg);
        for (var r = 0; r < 5; r++) {
          var rx = cx - c.width / 2 + r * (c.width / 5);
          var rh = 3 + (r % 3) * 2;
          ctx.fillRect(rx, GROUND_Y - rh, c.width / 6, rh);
        }
        continue;
      }

      var bodyColor = colorMix(colors.fg, 0.5, colors.bg);
      var bx = cx - c.width / 2;
      var by = GROUND_Y - c.height;

      // Castle body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bx, by, c.width, c.height);

      // Crenellations (3 on top)
      var crenW = c.width / 5;
      var crenH = 6;
      for (var ci = 0; ci < 3; ci++) {
        var cxPos = bx + ci * (c.width / 3) + (c.width / 3 - crenW) / 2;
        ctx.fillRect(cxPos, by - crenH, crenW, crenH);
      }

      // Door arch
      var doorW = c.width * 0.3;
      var doorH = c.height * 0.35;
      ctx.fillStyle = colorMix(colors.fg, 0.15, colors.bg);
      ctx.beginPath();
      ctx.moveTo(cx - doorW / 2, GROUND_Y);
      ctx.lineTo(cx - doorW / 2, GROUND_Y - doorH + doorW / 2);
      ctx.arc(cx, GROUND_Y - doorH + doorW / 2, doorW / 2, Math.PI, 0);
      ctx.lineTo(cx + doorW / 2, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      // Flag on top
      var flagPoleX = cx;
      var flagPoleTop = by - crenH - 12;
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(flagPoleX, by - crenH);
      ctx.lineTo(flagPoleX, flagPoleTop);
      ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(flagPoleX, flagPoleTop);
      ctx.lineTo(flagPoleX + 8, flagPoleTop + 3);
      ctx.lineTo(flagPoleX, flagPoleTop + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Floating bonus texts
    for (var bi = bonusTexts.length - 1; bi >= 0; bi--) {
      var bt = bonusTexts[bi];
      bt.y -= 1;
      bt.life--;
      if (bt.life <= 0) {
        bonusTexts.splice(bi, 1);
        continue;
      }
      ctx.globalAlpha = bt.life / bt.maxLife;
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bt.text, bt.x - cameraX, bt.y);
    }
    ctx.globalAlpha = 1;
  }

  function checkCastleCollision() {
    var proj = selectedParts.projectile;
    var pr = proj ? 3 + proj.weight * 0.04 : 5;
    for (var i = 0; i < castles.length; i++) {
      var c = castles[i];
      if (c.destroyed) continue;
      var left = c.x - c.width / 2;
      var right = c.x + c.width / 2;
      var top = GROUND_Y - c.height - 6; // include crenellations
      // AABB overlap
      if (projectilePos.x + pr > left && projectilePos.x - pr < right &&
          projectilePos.y + pr > top && projectilePos.y - pr < GROUND_Y) {
        // Hit!
        c.destroyed = true;
        castlesDestroyed++;
        castleBonus += c.bonus;

        // Speed boost — keep flying through
        projectileVel.x *= 1.3;
        projectileVel.y = -Math.abs(projectileVel.y) * 0.4 - 2;

        // Crumble particles (rectangular, browns/greys)
        var crumbleColors = ['#8B7355', '#A0926B', '#6B5B45', '#999999', '#777777'];
        for (var pi = 0; pi < 20; pi++) {
          var angle = Math.random() * Math.PI * 2;
          var speed = 1.5 + Math.random() * 3.5;
          particles.push({
            x: c.x + (Math.random() - 0.5) * c.width,
            y: GROUND_Y - Math.random() * c.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            life: 25 + Math.floor(Math.random() * 20),
            maxLife: 45,
            color: crumbleColors[Math.floor(Math.random() * crumbleColors.length)]
          });
        }

        // Screen shake
        shakeFrames = 10;
        shakeIntensity = 8;

        // Bonus text
        bonusTexts.push({
          x: c.x,
          y: GROUND_Y - c.height - 15,
          text: '+' + c.bonus + ' BONUS',
          life: 60,
          maxLife: 60
        });

        break; // one castle per frame
      }
    }
  }

  // ── Power meter & angle aimer ─────────────────
  function drawPowerMeter(colors) {
    var barX = CANVAS_W - 50;
    var barY = 50;
    var barW = 24;
    var barH = 180;

    // Background
    ctx.fillStyle = colorMix(colors.fg, 0.08, colors.bg);
    ctx.fillRect(barX, barY, barW, barH);

    // Border
    ctx.strokeStyle = colorMix(colors.fg, 0.3, colors.bg);
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    // Sweet spot zone (top 20%)
    ctx.fillStyle = colorMix(colors.accent, 0.15, colors.bg);
    ctx.fillRect(barX + 2, barY + 2, barW - 4, barH * 0.2);

    // Fill (from bottom up)
    var fillH = barH * powerMeterValue;
    ctx.fillStyle = colorMix(colors.accent, 0.5, colors.bg);
    ctx.fillRect(barX + 2, barY + barH - fillH, barW - 4, fillH);

    // Indicator line
    var indicatorY = barY + barH - barH * powerMeterValue;
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(barX - 6, indicatorY);
    ctx.lineTo(barX + barW + 6, indicatorY);
    ctx.stroke();

    // Arrow indicators
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.moveTo(barX - 6, indicatorY);
    ctx.lineTo(barX - 12, indicatorY - 4);
    ctx.lineTo(barX - 12, indicatorY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(barX + barW + 6, indicatorY);
    ctx.lineTo(barX + barW + 12, indicatorY - 4);
    ctx.lineTo(barX + barW + 12, indicatorY + 4);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = colors.fg;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POWER', barX + barW / 2, barY - 12);

    // Percentage
    ctx.font = 'bold 14px monospace';
    ctx.fillText(Math.round(powerMeterValue * 100) + '%', barX + barW / 2, barY + barH + 18);

    // Instruction
    ctx.fillStyle = colorMix(colors.fg, 0.5, colors.bg);
    ctx.font = '10px monospace';
    ctx.fillText('TAP / CLICK', barX + barW / 2, barY + barH + 32);
  }

  function drawAngleAimer(colors) {
    var bx = TREBUCHET_X - cameraX;
    var by = GROUND_Y - HILL_HEIGHT - 30;
    var arcRadius = 100;

    // Arc background (dotted) — right side (launch direction)
    ctx.strokeStyle = colorMix(colors.fg, 0.2, colors.bg);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(bx, by, arcRadius, -75 * Math.PI / 180, -15 * Math.PI / 180);
    ctx.stroke();
    ctx.setLineDash([]);

    // Guide marks at 30, 45, 60
    var guides = [30, 45, 60];
    for (var gi = 0; gi < guides.length; gi++) {
      var ga = guides[gi] * Math.PI / 180;
      var gxS = bx + Math.cos(ga) * (arcRadius - 8);
      var gyS = by - Math.sin(ga) * (arcRadius - 8);
      var gxE = bx + Math.cos(ga) * (arcRadius + 8);
      var gyE = by - Math.sin(ga) * (arcRadius + 8);

      ctx.strokeStyle = colorMix(colors.fg, 0.3, colors.bg);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gxS, gyS);
      ctx.lineTo(gxE, gyE);
      ctx.stroke();

      ctx.fillStyle = colorMix(colors.fg, 0.4, colors.bg);
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      var lx = bx + Math.cos(ga) * (arcRadius + 20);
      var ly = by - Math.sin(ga) * (arcRadius + 20);
      ctx.fillText(guides[gi] + '\u00B0', lx, ly + 3);
    }

    // Sweep line — right side (launch direction)
    var sweepRad = angleSweepValue * Math.PI / 180;
    var lineEndX = bx + Math.cos(sweepRad) * arcRadius;
    var lineEndY = by - Math.sin(sweepRad) * arcRadius;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();

    // Dot at end
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(lineEndX, lineEndY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Angle text
    ctx.fillStyle = colors.fg;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANGLE: ' + Math.round(angleSweepValue) + '\u00B0', CANVAS_W / 2, 30);

    // Instruction
    ctx.fillStyle = colorMix(colors.fg, 0.5, colors.bg);
    ctx.font = '10px monospace';
    ctx.fillText('TAP / CLICK TO SET ANGLE', CANVAS_W / 2, 48);
  }

  // ── Color mix helper ──────────────────────────
  function colorMix(c1, amount, c2) {
    // Returns a CSS color-mix expression
    return 'color-mix(in srgb, ' + c1 + ' ' + Math.round(amount * 100) + '%, ' + c2 + ')';
  }

  // ── Game flow ─────────────────────────────────
  function startGame() {
    startOverlay.classList.add('tb-hidden');
    resultsOverlay.classList.add('tb-hidden');
    partsContainer.style.display = '';
    actionsContainer.style.display = '';
    startBuildPhase();
  }

  function startBuildPhase() {
    gamePhase = 'build';
    cameraX = 0;
    targetCameraX = 0;
    swingAngle = 0.3; // slight rest angle
    trail = [];
    particles = [];
    flagX = 0;
    launchDistance = 0;
    bounceCount = 0;
    powerMeterValue = 0;
    powerMeterDir = 1;
    lockedPower = 0;
    angleSweepValue = 45;
    angleSweepDir = 1;
    lockedAngle = 45;

    initCastles();
    generateWind();
    dealHand();
    renderCards();
    launchBtn.disabled = true;
    drawScene();
  }

  function startPowerCharge() {
    gamePhase = 'power-charge';
    powerMeterValue = 0;
    powerMeterDir = 1;
    partsContainer.style.display = 'none';
    actionsContainer.style.display = 'none';
    canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(tickPowerCharge);
  }

  function tickPowerCharge() {
    if (gamePhase !== 'power-charge') return;
    powerMeterValue += powerMeterDir * powerMeterSpeed;
    if (powerMeterValue >= 1) {
      powerMeterValue = 1;
      powerMeterDir = -1;
    } else if (powerMeterValue <= 0) {
      powerMeterValue = 0;
      powerMeterDir = 1;
    }
    drawScene();
    requestAnimationFrame(tickPowerCharge);
  }

  function startAngleAim() {
    gamePhase = 'angle-aim';
    angleSweepValue = 45;
    angleSweepDir = 1;
    requestAnimationFrame(tickAngleAim);
  }

  function tickAngleAim() {
    if (gamePhase !== 'angle-aim') return;
    var sl = selectedParts.sling;
    var sweepSpeed = 2.0 - (sl.accuracy / 100) * 1.2;
    angleSweepValue += angleSweepDir * sweepSpeed;
    if (angleSweepValue >= 75) {
      angleSweepValue = 75;
      angleSweepDir = -1;
    } else if (angleSweepValue <= 15) {
      angleSweepValue = 15;
      angleSweepDir = 1;
    }
    drawScene();
    requestAnimationFrame(tickAngleAim);
  }

  function startCountdown() {
    gamePhase = 'countdown';
    animFrame = 0;
    requestAnimationFrame(tickCountdown);
  }

  function tickCountdown() {
    if (gamePhase !== 'countdown') return;
    animFrame++;
    drawScene();
    if (animFrame >= 25) {
      startLaunch();
      return;
    }
    requestAnimationFrame(tickCountdown);
  }

  function startLaunch() {
    gamePhase = 'launching';
    animFrame = 0;
    swingAngle = 0.3;
    calculateLaunch();
    requestAnimationFrame(tickLaunch);
  }

  function tickLaunch() {
    if (gamePhase !== 'launching') return;
    animFrame++;

    // Arm swings from rest (0.3 rad) to upright (~1.3 rad)
    var progress = Math.min(animFrame / SWING_FRAMES, 1);
    var ease = 1 - Math.pow(1 - progress, 3); // ease out cubic
    swingAngle = 0.3 + ease * 1.0;

    drawScene();

    if (animFrame >= SWING_FRAMES) {
      gamePhase = 'flight';
      animFrame = 0;
      requestAnimationFrame(tickFlight);
      return;
    }

    requestAnimationFrame(tickLaunch);
  }

  function tickFlight() {
    if (gamePhase !== 'flight') return;
    animFrame++;

    stepProjectile();
    checkCastleCollision();

    // Camera follows projectile
    targetCameraX = projectilePos.x - CANVAS_W * 0.3;
    if (targetCameraX < 0) targetCameraX = 0;
    cameraX += (targetCameraX - cameraX) * CAM_EASE;

    // Check if landed or bouncing
    if (projectilePos.y >= GROUND_Y && animFrame > 5) {
      projectilePos.y = GROUND_Y;
      var impactSpeed = Math.sqrt(projectileVel.x * projectileVel.x + projectileVel.y * projectileVel.y);
      var proj = selectedParts.projectile;
      var cor = 0.15 + (100 - proj.weight) / 250;

      if (impactSpeed > 3 && bounceCount < 3) {
        // Bounce
        projectileVel.y = -Math.abs(projectileVel.y) * cor;
        projectileVel.x *= 0.8;
        bounceCount++;
        var colors = getThemeColors();
        spawnImpactParticles(projectilePos.x, GROUND_Y, colors.accent, 8);
        shakeFrames = 4;
        shakeIntensity = 2 + impactSpeed * 0.1;
      } else {
        // Final landing
        launchDistance = Math.max(0, (projectilePos.x - TREBUCHET_X) / PIXELS_PER_METER);
        flagX = projectilePos.x;
        onLanded();
        return;
      }
    }

    // Safety: if projectile goes way off screen or too many frames
    if (animFrame > FLIGHT_MAX_FRAMES || projectilePos.y > CANVAS_H + 100) {
      projectilePos.y = GROUND_Y;
      launchDistance = Math.max(0, (projectilePos.x - TREBUCHET_X) / PIXELS_PER_METER);
      flagX = projectilePos.x;
      onLanded();
      return;
    }

    drawScene();
    requestAnimationFrame(tickFlight);
  }

  function onLanded() {
    gamePhase = 'landed';
    var colors = getThemeColors();

    // Screen shake
    shakeFrames = 12;
    shakeIntensity = 6 + launchDistance * 0.008;
    if (shakeIntensity > 15) shakeIntensity = 15;

    // Impact particles
    spawnImpactParticles(projectilePos.x, GROUND_Y, colors.accent);

    // Zoom out to show distance
    var showCamX = Math.max(0, flagX - CANVAS_W * 0.8);
    targetCameraX = showCamX;

    // Animate landing for a moment then show results
    var landFrames = 0;
    function tickLand() {
      landFrames++;
      cameraX += (targetCameraX - cameraX) * 0.1;
      drawScene();
      if (landFrames < 40) {
        requestAnimationFrame(tickLand);
      } else {
        showResults();
      }
    }
    requestAnimationFrame(tickLand);
  }

  function showResults() {
    var dist = Math.floor(launchDistance);
    var isRecord = dist > stats.bestDistance;
    var coinReward = Math.floor(dist / 5);
    var recordBonus = 0;
    var jbReward = 0;
    var unlockText = '';

    // Pet bonuses
    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      var petState = null;
      try {
        var raw = localStorage.getItem('arebooksgood-pet');
        if (raw) petState = JSON.parse(raw);
      } catch (e) {}
      if (petState && petState.activePet) {
        var petId = petState.activePet;
        if (petId === 'dragon') {
          coinReward = Math.floor(coinReward * 1.15);
        } else if (petId === 'cat' && dist < 50) {
          coinReward = Math.max(coinReward, Math.floor(coinReward * 1.2));
        } else if (petId === 'robot') {
          coinReward = Math.max(coinReward, 10);
        }
      }
    }

    // Castle bonus
    coinReward += castleBonus;

    // Record bonus
    if (isRecord) {
      recordBonus = 50;
      coinReward += recordBonus;
      stats.bestDistance = dist;
    }

    // Milestone unlocks
    for (var mi = 0; mi < MILESTONES.length; mi++) {
      var m = MILESTONES[mi];
      if (dist >= m.dist && stats.milestones.indexOf(m.dist) === -1) {
        stats.milestones.push(m.dist);
        if (m.tier > (stats.unlockedTiers[m.unlock] || 1)) {
          stats.unlockedTiers[m.unlock] = m.tier;
        }
        jbReward += m.jb;
        unlockText += m.label + '\n';
      }
    }

    // Update stats
    stats.totalLaunches++;
    stats.totalDistance += dist;
    stats.coinsEarned += coinReward;
    stats.jbEarned += jbReward;
    saveStats();

    // Award wallet
    if (typeof Wallet !== 'undefined' && coinReward > 0) {
      Wallet.add(coinReward);
    }
    if (typeof JackBucks !== 'undefined' && jbReward > 0) {
      JackBucks.add(jbReward);
    }

    // Notify pet
    if (typeof PetEvents !== 'undefined' && PetEvents.onGameResult) {
      PetEvents.onGameResult({
        game: 'trebuchet',
        won: dist >= 100,
        coins: coinReward
      });
    }

    // Update UI
    resultDistance.textContent = dist + 'm';
    resultCoins.textContent = '+' + coinReward;
    resultJB.textContent = '+' + jbReward;

    // Castle results
    var castleRow = document.getElementById('tb-result-castles-row');
    var castleSpan = document.getElementById('tb-result-castles');
    if (castleRow && castleSpan) {
      if (castlesDestroyed > 0) {
        castleSpan.textContent = castlesDestroyed + ' (+' + castleBonus + ' coins)';
        castleRow.classList.remove('tb-hidden');
      } else {
        castleRow.classList.add('tb-hidden');
      }
    }

    if (isRecord) {
      resultRecord.classList.remove('tb-hidden');
    } else {
      resultRecord.classList.add('tb-hidden');
    }

    if (unlockText) {
      resultUnlock.textContent = unlockText.trim();
      resultUnlock.classList.remove('tb-hidden');
    } else {
      resultUnlock.classList.add('tb-hidden');
    }

    resultsOverlay.classList.remove('tb-hidden');
    updateHUD();
    updateStatsPanel();
  }

  // ── Event listeners ───────────────────────────
  playBtn.addEventListener('click', startGame);

  nextBtn.addEventListener('click', function () {
    resultsOverlay.classList.add('tb-hidden');
    partsContainer.style.display = '';
    actionsContainer.style.display = '';
    startBuildPhase();
  });

  launchBtn.addEventListener('click', function () {
    if (gamePhase !== 'build') return;
    if (!selectedParts.counterweight || !selectedParts.arm ||
        !selectedParts.sling || !selectedParts.projectile) return;
    startPowerCharge();
  });

  resetBtn.addEventListener('click', function () {
    if (confirm('Reset all trebuchet stats and unlocks?')) {
      stats = defaultStats();
      saveStats();
      updateHUD();
      updateStatsPanel();
      if (gamePhase === 'build') {
        dealHand();
        renderCards();
      }
    }
  });

  // Canvas click/touch for power and angle phases
  canvas.addEventListener('click', function () {
    if (gamePhase === 'power-charge') {
      lockedPower = powerMeterValue;
      startAngleAim();
    } else if (gamePhase === 'angle-aim') {
      lockedAngle = angleSweepValue;
      startCountdown();
    }
  });

  canvas.addEventListener('touchend', function (e) {
    if (gamePhase === 'power-charge') {
      e.preventDefault();
      lockedPower = powerMeterValue;
      startAngleAim();
    } else if (gamePhase === 'angle-aim') {
      e.preventDefault();
      lockedAngle = angleSweepValue;
      startCountdown();
    }
  });

  // ── Init ──────────────────────────────────────
  initCastles();
  updateHUD();
  updateStatsPanel();
  partsContainer.style.display = 'none';
  actionsContainer.style.display = 'none';
  swingAngle = 0.3;
  drawScene();

})();
