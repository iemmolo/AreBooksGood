(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var STATS_KEY = 'trebuchet-stats';
  var CANVAS_W = 720;
  var CANVAS_H = 340;
  var GROUND_Y = 280; // y position of ground line on canvas
  var GRAVITY = 9.8;
  var BASE_POWER = 26;
  var DT = 0.05;
  var PIXELS_PER_METER = 3; // for camera / distance rendering
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
      { name: 'Rock',            tier: 1, weight: 60, drag: 0.3, special: 'none' },
      { name: 'Pumpkin',         tier: 1, weight: 30, drag: 0.5, special: 'explode' },
      { name: 'Iron Ball',       tier: 2, weight: 80, drag: 0.2, special: 'pierce' },
      { name: 'Hay Bale',        tier: 2, weight: 20, drag: 0.7, special: 'windcatcher' },
      { name: 'Cannonball',      tier: 3, weight: 90, drag: 0.15, special: 'shockwave' },
      { name: 'Flaming Boulder', tier: 3, weight: 75, drag: 0.25, special: 'inferno' }
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
  var selectedSummary = document.getElementById('tb-selected-summary');

  // Tab state
  var activeTab = 'counterweight';
  var tabButtons = document.querySelectorAll('.tb-tab');
  var tabPanels = {
    counterweight: document.getElementById('tb-panel-counterweight'),
    arm: document.getElementById('tb-panel-arm'),
    sling: document.getElementById('tb-panel-sling'),
    projectile: document.getElementById('tb-panel-projectile')
  };

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
  var bestFlagFlash = 0; // frames remaining for best-flag flash effect

  // Wind particles
  var windParticles = [];

  // Combo system
  var comboCount = 0;
  var comboMultiplier = 1;
  var comboDisplayTimer = 0;
  var bestCombo = 0;

  // Terrain hills/valleys
  var hills = [];

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

  // Crowds
  var crowds = [];
  var crowdBonus = 0;
  var crowdsScattered = 0;

  // Trebuchet throw animation
  var trebRecoilX = 0;
  var trebRecoilY = 0;
  var cwPendulumAngle = 0;
  var postLaunchFrame = 0;

  // Slow-mo landing
  var dtMultiplier = 1;
  var landCountUp = -1;

  // Trampolines
  var trampolines = [];
  var trampolinesHit = 0;

  // JB Pickups
  var jbPickups = [];
  var jbCollected = 0;

  // ── Canvas sizing ─────────────────────────────
  function sizeCanvas() {
    var area = document.getElementById('tb-game-area');
    var w = area ? area.clientWidth : CANVAS_W;
    if (w > CANVAS_W) w = CANVAS_W;
    var ratio = w / CANVAS_W;
    // On mobile, make canvas display taller so it's more visible
    var heightMult = 1;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.width = w + 'px';
    canvas.style.height = Math.floor(CANVAS_H * ratio * heightMult) + 'px';
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
    var prevSelections = {
      counterweight: selectedParts.counterweight,
      arm: selectedParts.arm,
      sling: selectedParts.sling,
      projectile: selectedParts.projectile
    };
    for (var c = 0; c < categories.length; c++) {
      var cat = categories[c];
      // Show ALL parts, sorted best (highest stat) to worst
      var all = PARTS[cat].slice();
      all.sort(function (a, b) {
        return getPartStat(cat, b) - getPartStat(cat, a);
      });
      currentHand[cat] = all;
    }
    // Restore previous selections if the part is still available (unlocked)
    selectedParts = { counterweight: null, arm: null, sling: null, projectile: null };
    for (var r = 0; r < categories.length; r++) {
      var rCat = categories[r];
      var prev = prevSelections[rCat];
      if (!prev) continue;
      var maxTier = stats.unlockedTiers[rCat] || 1;
      if (prev.tier <= maxTier) {
        // Find matching part in current hand by name
        for (var pi = 0; pi < currentHand[rCat].length; pi++) {
          if (currentHand[rCat][pi].name === prev.name) {
            selectedParts[rCat] = currentHand[rCat][pi];
            break;
          }
        }
      }
    }
    updateSelectedSummary();
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
        var specialText = (cat === 'projectile' && part.special && part.special !== 'none')
          ? '<span class="tb-card-special">' + part.special + '</span>' : '';
        card.innerHTML = '<span class="tb-card-tier tb-tier-' + part.tier + '">T' + part.tier + '</span>' +
          '<span class="tb-card-name">' + part.name + '</span>' +
          '<span class="tb-card-stat">' + statText + '</span>' + specialText + lockIcon;

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
    updateSelectedSummary();
    drawScene();
  }

  function checkLaunchReady() {
    var ready = selectedParts.counterweight && selectedParts.arm &&
                selectedParts.sling && selectedParts.projectile;
    launchBtn.disabled = !ready;
  }

  function switchTab(tab) {
    activeTab = tab;
    var categories = ['counterweight', 'arm', 'sling', 'projectile'];
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      if (tabPanels[cat]) {
        if (cat === tab) {
          tabPanels[cat].classList.remove('tb-hidden');
        } else {
          tabPanels[cat].classList.add('tb-hidden');
        }
      }
    }
    for (var j = 0; j < tabButtons.length; j++) {
      if (tabButtons[j].getAttribute('data-tab') === tab) {
        tabButtons[j].classList.add('tb-tab-active');
      } else {
        tabButtons[j].classList.remove('tb-tab-active');
      }
    }
  }

  function updateSelectedSummary() {
    if (!selectedSummary) return;
    var parts = [];
    var labels = { counterweight: 'CW', arm: 'ARM', sling: 'SLG', projectile: 'PRJ' };
    var categories = ['counterweight', 'arm', 'sling', 'projectile'];
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var p = selectedParts[cat];
      if (p) {
        parts.push(labels[cat] + ': ' + p.name);
      }
    }
    selectedSummary.textContent = parts.length > 0 ? parts.join(' | ') : '';
  }

  // Wire up tab clicks
  for (var tbi = 0; tbi < tabButtons.length; tbi++) {
    tabButtons[tbi].addEventListener('click', function () {
      switchTab(this.getAttribute('data-tab'));
    });
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
    comboCount = 0;
    comboMultiplier = 1;
    comboDisplayTimer = 0;
    bestCombo = 0;
  }

  function stepProjectile() {
    var proj = selectedParts.projectile;
    var windMult = (proj.special === 'windcatcher') ? 2 : 1;
    var dt = DT * dtMultiplier;
    var windForce = wind.direction * wind.speed * 0.15 * (1 - proj.weight / 100) * windMult;

    projectileVel.x += windForce * dt;
    projectileVel.x *= (1 - proj.drag * dt * 0.5);
    projectileVel.y *= (1 - proj.drag * dt * 0.12);
    projectileVel.y += GRAVITY * dt * 3.5;

    projectilePos.x += projectileVel.x * dtMultiplier;
    projectilePos.y += projectileVel.y * dtMultiplier;

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

    // Wind particles (during flight)
    if (gamePhase === 'flight') {
      drawWindParticles(colors);
    }

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

    // Terrain hills/valleys
    drawHills(colors);

    // Distance markers
    drawDistanceMarkers(colors);

    // Best distance flag
    drawBestFlag(colors);

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

    // Trampolines
    drawTrampolines(colors);

    // JB Pickups
    if (gamePhase === 'flight' || gamePhase === 'landed') {
      drawJBPickups(colors);
    }

    // Castles
    drawCastles(colors);

    // Crowds
    drawCrowds(colors);

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

    // Distance count-up text during landing
    if (gamePhase === 'landed' && landCountUp >= 0) {
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.9;
      ctx.fillText(landCountUp + 'm', CANVAS_W / 2, CANVAS_H / 2 - 20);
      ctx.globalAlpha = 1;
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

    // Combo display during flight
    if (gamePhase === 'flight' && comboCount > 0) {
      var scale = comboDisplayTimer > 20 ? 1.3 : 1;
      ctx.save();
      ctx.translate(60, 25);
      ctx.scale(scale, scale);
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COMBO x' + comboMultiplier, 0, 0);
      ctx.restore();
      if (comboDisplayTimer > 0) comboDisplayTimer--;
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
    var bx = TREBUCHET_X - cameraX + trebRecoilX;
    var by = GROUND_Y - HILL_HEIGHT - trebRecoilY;

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

    // Counterweight (on short end) with pendulum swing
    var cwSize = 10;
    if (selectedParts.counterweight) {
      cwSize = 8 + selectedParts.counterweight.power * 0.06;
    }
    var cwColor = colorMix(colors.fg, 0.6, colors.bg);
    if (selectedParts.counterweight && selectedParts.counterweight.tier >= 2) cwColor = colors.accent;
    ctx.fillStyle = cwColor;
    var cwDrawX = shortX + Math.sin(cwPendulumAngle) * cwSize;
    var cwDrawY = shortY + Math.cos(cwPendulumAngle) * cwSize * 0.5;
    ctx.fillRect(cwDrawX - cwSize / 2, cwDrawY - cwSize / 2, cwSize, cwSize);

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

  // ── Terrain hills/valleys ────────────────────
  function initHills() {
    hills = [];
    var castlePositions = [];
    for (var ci = 0; ci < castles.length; ci++) {
      castlePositions.push(castles[ci].x);
    }
    var count = 8 + Math.floor(Math.random() * 5);
    for (var i = 0; i < count; i++) {
      var dist = 50 + Math.random() * 950;
      var worldX = TREBUCHET_X + dist * PIXELS_PER_METER;
      // Avoid castle positions (±30px buffer) and trebuchet hill
      var tooClose = false;
      for (var j = 0; j < castlePositions.length; j++) {
        if (Math.abs(worldX - castlePositions[j]) < 30) { tooClose = true; break; }
      }
      if (Math.abs(worldX - TREBUCHET_X) < 80) tooClose = true;
      if (tooClose) continue;
      var isValley = Math.random() < 0.35;
      hills.push({
        x: worldX,
        width: 40 + Math.random() * 60,
        height: isValley ? -(5 + Math.random() * 7) : (8 + Math.random() * 12)
      });
    }
  }

  function getGroundY(worldX) {
    for (var i = 0; i < hills.length; i++) {
      var h = hills[i];
      var left = h.x - h.width / 2;
      var right = h.x + h.width / 2;
      if (worldX >= left && worldX <= right) {
        // Parabolic interpolation: peak at center
        var t = (worldX - left) / (right - left); // 0..1
        var peak = 4 * t * (1 - t); // 0 at edges, 1 at center
        return GROUND_Y - h.height * peak;
      }
    }
    return GROUND_Y;
  }

  function drawHills(colors) {
    for (var i = 0; i < hills.length; i++) {
      var h = hills[i];
      var cx = h.x - cameraX;
      if (cx < -h.width && cx > CANVAS_W + h.width) continue;
      if (h.height > 0) {
        // Hill: raised bump
        ctx.fillStyle = colorMix(colors.fg, 0.18, colors.bg);
        ctx.beginPath();
        ctx.moveTo(cx - h.width / 2, GROUND_Y);
        ctx.quadraticCurveTo(cx, GROUND_Y - h.height * 2, cx + h.width / 2, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Valley: dip below ground
        ctx.fillStyle = colors.bg;
        ctx.beginPath();
        ctx.moveTo(cx - h.width / 2, GROUND_Y);
        ctx.quadraticCurveTo(cx, GROUND_Y - h.height * 2, cx + h.width / 2, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        // Redraw ground line segments around valley
        ctx.strokeStyle = colorMix(colors.fg, 0.3, colors.bg);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - h.width / 2, GROUND_Y);
        ctx.quadraticCurveTo(cx, GROUND_Y - h.height * 2, cx + h.width / 2, GROUND_Y);
        ctx.stroke();
      }
    }
  }

  // ── Wind particles ──────────────────────────
  function spawnWindParticles() {
    if (windParticles.length >= 40) return;
    var count = wind.speed > 15 ? 3 : wind.speed > 8 ? 2 : 1;
    for (var i = 0; i < count; i++) {
      if (windParticles.length >= 40) break;
      windParticles.push({
        x: wind.direction > 0 ? cameraX - 10 : cameraX + CANVAS_W + 10,
        y: Math.random() * GROUND_Y,
        alpha: 0.1 + Math.random() * 0.2,
        size: 4 + Math.random() * 4 * (wind.speed / 25),
        life: 30 + Math.floor(Math.random() * 20)
      });
    }
  }

  function drawWindParticles(colors) {
    for (var i = windParticles.length - 1; i >= 0; i--) {
      var wp = windParticles[i];
      wp.x += wind.direction * wind.speed * 0.3;
      wp.y += (Math.random() - 0.5) * 0.5;
      wp.life--;
      wp.alpha -= 0.005;
      if (wp.life <= 0 || wp.alpha <= 0) {
        windParticles.splice(i, 1);
        continue;
      }
      var sx = wp.x - cameraX;
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      var angle = wind.direction > 0 ? Math.PI * 0.1 : Math.PI * 0.9;
      ctx.globalAlpha = wp.alpha;
      ctx.strokeStyle = colorMix(colors.fg, wp.alpha, colors.bg);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, wp.y);
      ctx.lineTo(sx + Math.cos(angle) * wp.size, wp.y + Math.sin(angle) * wp.size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Best distance flag ───────────────────────
  function drawBestFlag(colors) {
    if (stats.bestDistance <= 0) return;
    var bfx = TREBUCHET_X + stats.bestDistance * PIXELS_PER_METER - cameraX;
    if (bfx < -20 || bfx > CANVAS_W + 20) return;

    var alpha = bestFlagFlash > 0 ? 0.7 : 0.3;
    var flagColor = colorMix(colors.accent, alpha, colors.bg);

    // Dashed vertical line
    ctx.strokeStyle = flagColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bfx, GROUND_Y);
    ctx.lineTo(bfx, GROUND_Y - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tiny pennant triangle
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(bfx, GROUND_Y - 24);
    ctx.lineTo(bfx + 8, GROUND_Y - 20);
    ctx.lineTo(bfx, GROUND_Y - 16);
    ctx.closePath();
    ctx.fill();

    // "BEST" label
    ctx.fillStyle = flagColor;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BEST', bfx, GROUND_Y - 28);

    if (bestFlagFlash > 0) bestFlagFlash--;
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

      // Burning castle (inferno)
      if (c.burning && c.burning > 0) {
        c.burning--;
        // Fire particles while burning
        if (Math.random() < 0.6) {
          particles.push({
            x: c.x + (Math.random() - 0.5) * c.width,
            y: GROUND_Y - Math.random() * c.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -1 - Math.random() * 3,
            life: 15 + Math.floor(Math.random() * 10),
            maxLife: 25,
            color: ['#ff4400', '#ff6622', '#ff8844'][Math.floor(Math.random() * 3)]
          });
        }
        if (c.burning <= 0) {
          c.destroyed = true;
        }
      }

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
        castlesDestroyed++;
        comboCount++;
        if (comboCount >= 3) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else if (comboCount >= 1) comboMultiplier = 1.5;
        comboDisplayTimer = 30;
        if (comboCount > bestCombo) bestCombo = comboCount;
        var adjustedBonus = Math.floor(c.bonus * comboMultiplier);
        castleBonus += adjustedBonus;

        // Pierce: no velocity change; otherwise speed boost
        if (proj && proj.special === 'pierce') {
          // pass through without speed penalty, castle still destroyed
          c.destroyed = true;
        } else if (proj && proj.special === 'inferno') {
          // Inferno: delay destruction, fire particles
          c.burning = 20;
          c.destroyed = false; // burns first, then destroyed
        } else {
          c.destroyed = true;
          // Speed boost — keep flying through
          projectileVel.x *= 1.3;
          projectileVel.y = -Math.abs(projectileVel.y) * 0.4 - 2;
        }

        // Crumble particles (rectangular, browns/greys)
        var crumbleColors = ['#8B7355', '#A0926B', '#6B5B45', '#999999', '#777777'];
        var particleCount = (proj && proj.special === 'inferno') ? 10 : 20;
        for (var pi = 0; pi < particleCount; pi++) {
          var angle = Math.random() * Math.PI * 2;
          var speed = 1.5 + Math.random() * 3.5;
          var pColor = (proj && proj.special === 'inferno')
            ? (['#ff4400', '#ff6622', '#ff8844', '#ffaa44'][Math.floor(Math.random() * 4)])
            : crumbleColors[Math.floor(Math.random() * crumbleColors.length)];
          particles.push({
            x: c.x + (Math.random() - 0.5) * c.width,
            y: GROUND_Y - Math.random() * c.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            life: 25 + Math.floor(Math.random() * 20),
            maxLife: 45,
            color: pColor
          });
        }

        // Sound
        playCastleHitSound();
        if (comboCount > 1) playComboSound(comboCount);

        // Screen shake
        shakeFrames = 10;
        shakeIntensity = 8;

        // Bonus text
        var comboStr = comboCount > 1 ? ' x' + comboMultiplier + ' COMBO!' : ' BONUS';
        bonusTexts.push({
          x: c.x,
          y: GROUND_Y - c.height - 15,
          text: '+' + adjustedBonus + comboStr,
          life: 60,
          maxLife: 60
        });

        break; // one castle per frame
      }
    }
  }

  // ── Peasant Crowds ──────────────────────────
  function initCrowds() {
    crowds = [];
    crowdBonus = 0;
    crowdsScattered = 0;
    var castleXs = [];
    for (var ci = 0; ci < castles.length; ci++) {
      castleXs.push(castles[ci].x);
    }
    var count = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var dist = 60 + Math.random() * 880;
      var worldX = TREBUCHET_X + dist * PIXELS_PER_METER;
      // Avoid castle positions and trebuchet
      var tooClose = false;
      for (var j = 0; j < castleXs.length; j++) {
        if (Math.abs(worldX - castleXs[j]) < 50) { tooClose = true; break; }
      }
      if (Math.abs(worldX - TREBUCHET_X) < 100) tooClose = true;
      if (tooClose) { i--; count--; if (count < 4) break; continue; }

      var peasantCount = 3 + Math.floor(Math.random() * 6);
      var peasants = [];
      for (var p = 0; p < peasantCount; p++) {
        peasants.push({
          x: (Math.random() - 0.5) * 30,
          y: 0,
          vx: 0, vy: 0,
          scattered: false,
          scatterTimer: 0,
          speechTimer: 0,
          speechText: ''
        });
      }
      crowds.push({
        x: worldX,
        peasants: peasants,
        scattered: false,
        bonusAwarded: false
      });
    }
  }

  function drawCrowds(colors) {
    var peasantColor = colorMix(colors.fg, 0.6, colors.bg);
    for (var ci = 0; ci < crowds.length; ci++) {
      var crowd = crowds[ci];
      var cx = crowd.x - cameraX;
      if (cx < -60 || cx > CANVAS_W + 60) continue;

      for (var pi = 0; pi < crowd.peasants.length; pi++) {
        var p = crowd.peasants[pi];
        var px = cx + p.x;
        var py = GROUND_Y + p.y;

        if (p.scattered) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1;
          p.scatterTimer--;
          if (p.scatterTimer <= 0) continue;
          ctx.globalAlpha = Math.max(0, p.scatterTimer / 40);
        } else {
          // Idle bob
          var bob = Math.sin(Date.now() * 0.003 + pi * 1.2) * 1.5;
          py += bob;
        }

        // Stick figure
        ctx.strokeStyle = peasantColor;
        ctx.fillStyle = peasantColor;
        ctx.lineWidth = 1;
        // Head
        ctx.beginPath();
        ctx.arc(px, py - 14, 3, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.beginPath();
        ctx.moveTo(px, py - 11);
        ctx.lineTo(px, py - 3);
        ctx.stroke();
        // Legs
        ctx.beginPath();
        ctx.moveTo(px, py - 3);
        ctx.lineTo(px - 3, py);
        ctx.moveTo(px, py - 3);
        ctx.lineTo(px + 3, py);
        ctx.stroke();
        // Arms
        if (p.scattered) {
          // Arms up
          ctx.beginPath();
          ctx.moveTo(px, py - 9);
          ctx.lineTo(px - 4, py - 14);
          ctx.moveTo(px, py - 9);
          ctx.lineTo(px + 4, py - 14);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(px, py - 9);
          ctx.lineTo(px - 4, py - 6);
          ctx.moveTo(px, py - 9);
          ctx.lineTo(px + 4, py - 6);
          ctx.stroke();
        }

        // Speech bubble
        if (p.speechTimer > 0) {
          p.speechTimer--;
          ctx.globalAlpha = Math.min(1, p.speechTimer / 10);
          ctx.fillStyle = colors.fg;
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(p.speechText, px, py - 20);
        }

        ctx.globalAlpha = 1;
      }
    }
  }

  function checkCrowdCollision() {
    for (var ci = 0; ci < crowds.length; ci++) {
      var crowd = crowds[ci];
      if (crowd.scattered) continue;
      for (var pi = 0; pi < crowd.peasants.length; pi++) {
        var p = crowd.peasants[pi];
        if (p.scattered) continue;
        var peasantWorldX = crowd.x + p.x;
        var dx = projectilePos.x - peasantWorldX;
        var dy = projectilePos.y - GROUND_Y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        // Speech trigger when projectile gets close
        if (dist < 150 && p.speechTimer === 0 && !crowd.scattered && Math.random() < 0.05) {
          p.speechTimer = 30;
          p.speechText = Math.random() < 0.5 ? '!' : 'RUN!';
        }

        if (dist < 40) {
          // Scatter the whole crowd
          crowd.scattered = true;
          var bonus = 5 + Math.floor(Math.random() * 6);

          // Combo integration
          comboCount++;
          if (comboCount >= 3) comboMultiplier = 3;
          else if (comboCount >= 2) comboMultiplier = 2;
          else if (comboCount >= 1) comboMultiplier = 1.5;
          comboDisplayTimer = 30;
          if (comboCount > bestCombo) bestCombo = comboCount;
          var adjustedBonus = Math.floor(bonus * comboMultiplier);

          crowdBonus += adjustedBonus;
          crowdsScattered++;

          playCrowdScatterSound();
          if (comboCount > 1) playComboSound(comboCount);

          // Scatter all peasants in this crowd
          for (var si = 0; si < crowd.peasants.length; si++) {
            var sp = crowd.peasants[si];
            sp.scattered = true;
            sp.scatterTimer = 40;
            var sa = Math.random() * Math.PI * 2;
            sp.vx = Math.cos(sa) * (1 + Math.random() * 2);
            sp.vy = -Math.random() * 3;
          }

          var comboStr = comboCount > 1 ? ' x' + comboMultiplier + ' COMBO!' : '';
          bonusTexts.push({
            x: crowd.x,
            y: GROUND_Y - 20,
            text: '+' + adjustedBonus + comboStr,
            life: 60,
            maxLife: 60
          });

          break;
        }
      }
    }
  }

  // ── Trampolines ────────────────────────────────
  function initTrampolines() {
    trampolines = [];
    trampolinesHit = 0;
    var count = 2 + Math.floor(Math.random() * 3); // 2-4
    var placed = [];
    for (var i = 0; i < count; i++) {
      var dist = 100 + Math.random() * 700; // 100m-800m
      var worldX = TREBUCHET_X + dist * PIXELS_PER_METER;
      // Avoid castles (40px), other trampolines (60px), trebuchet (100px)
      var ok = true;
      if (Math.abs(worldX - TREBUCHET_X) < 100) ok = false;
      for (var ci = 0; ci < castles.length; ci++) {
        if (Math.abs(worldX - castles[ci].x) < 40) { ok = false; break; }
      }
      for (var ti = 0; ti < placed.length; ti++) {
        if (Math.abs(worldX - placed[ti]) < 60) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push(worldX);
      trampolines.push({
        x: worldX,
        width: 30,
        height: 8,
        activated: false,
        bounceTimer: 0
      });
    }
  }

  function drawTrampolines(colors) {
    for (var i = 0; i < trampolines.length; i++) {
      var tr = trampolines[i];
      var tx = tr.x - cameraX;
      if (tx < -40 || tx > CANVAS_W + 40) continue;

      var groundAtTr = getGroundY(tr.x);
      var squish = 0;
      if (tr.bounceTimer > 0) {
        squish = Math.sin(tr.bounceTimer / 10 * Math.PI) * 4;
        tr.bounceTimer--;
      }

      var padY = groundAtTr - tr.height + squish;
      var halfW = tr.width / 2;

      // Spring legs (zigzag lines)
      ctx.strokeStyle = colorMix(colors.accent, 0.6, colors.bg);
      ctx.lineWidth = 1.5;
      for (var s = -1; s <= 1; s += 2) {
        var legX = tx + s * halfW * 0.5;
        ctx.beginPath();
        ctx.moveTo(legX, groundAtTr);
        var segments = 4;
        var segH = (groundAtTr - padY) / segments;
        for (var seg = 0; seg < segments; seg++) {
          var zy = groundAtTr - (seg + 1) * segH;
          var zx = legX + (seg % 2 === 0 ? 3 : -3) * s;
          ctx.lineTo(zx, zy);
        }
        ctx.stroke();
      }

      // Pad (flat accent-colored rectangle on top)
      ctx.fillStyle = colors.accent;
      ctx.fillRect(tx - halfW, padY, tr.width, 3);

      // Glow when activated
      if (tr.activated) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = colors.accent;
        ctx.fillRect(tx - halfW - 2, padY - 2, tr.width + 4, 7);
        ctx.globalAlpha = 1;
      }
    }
  }

  function checkTrampolineCollision() {
    if (projectileVel.y <= 0) return; // only when descending
    var proj = selectedParts.projectile;
    var pr = proj ? 3 + proj.weight * 0.04 : 5;
    for (var i = 0; i < trampolines.length; i++) {
      var tr = trampolines[i];
      if (tr.activated) continue;
      var groundAtTr = getGroundY(tr.x);
      var padY = groundAtTr - tr.height;
      var halfW = tr.width / 2;
      // Check overlap
      if (projectilePos.x + pr > tr.x - halfW && projectilePos.x - pr < tr.x + halfW &&
          projectilePos.y + pr > padY && projectilePos.y - pr < padY + 6) {
        // Bounce!
        tr.activated = true;
        tr.bounceTimer = 10;
        trampolinesHit++;

        // Velocity boost
        projectileVel.y = -Math.abs(projectileVel.y) * 1.3;
        projectileVel.x *= 1.1;
        // Move above pad
        projectilePos.y = padY - pr - 2;

        // Combo integration
        comboCount++;
        if (comboCount >= 3) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else if (comboCount >= 1) comboMultiplier = 1.5;
        comboDisplayTimer = 30;
        if (comboCount > bestCombo) bestCombo = comboCount;

        // Particles
        var colors = getThemeColors();
        spawnImpactParticles(tr.x, padY, colors.accent, 12);

        // Screen shake
        shakeFrames = 5;
        shakeIntensity = 4;

        // Floating text
        var comboStr = comboCount > 1 ? ' x' + comboMultiplier : '';
        bonusTexts.push({
          x: tr.x,
          y: padY - 15,
          text: 'BOUNCE!' + comboStr,
          life: 50,
          maxLife: 50
        });

        // Sound
        playTrampolineSound();
        if (comboCount > 1) playComboSound(comboCount);

        break; // one per frame
      }
    }
  }

  function playTrampolineSound() {
    playSweep(200, 800, 0.15, 'sine');
  }

  // ── JB Icon & Pickups ─────────────────────────
  function drawJBIcon(ctx, x, y, size, color) {
    var lw = size * 0.12;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vertical stem with pointed top and J-hook bottom
    ctx.beginPath();
    // Pointed serif/spike at top
    ctx.moveTo(x - size * 0.12, y - size * 0.45);
    ctx.lineTo(x, y - size * 0.55);
    ctx.lineTo(x + size * 0.12, y - size * 0.45);
    // Vertical stem down
    ctx.moveTo(x, y - size * 0.55);
    ctx.lineTo(x, y + size * 0.2);
    // J-hook curving left
    ctx.quadraticCurveTo(x, y + size * 0.45, x - size * 0.25, y + size * 0.45);
    ctx.stroke();

    // Two horizontal crossbars
    var barW = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(x - barW, y - size * 0.15);
    ctx.lineTo(x + barW, y - size * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - barW, y + size * 0.05);
    ctx.lineTo(x + barW, y + size * 0.05);
    ctx.stroke();

    ctx.restore();
  }

  function initJBPickups() {
    jbPickups = [];
    jbCollected = 0;
    var count = 5 + Math.floor(Math.random() * 4); // 5-8
    for (var i = 0; i < count; i++) {
      var dist = 80 + Math.random() * 770; // 80m-850m
      var worldX = TREBUCHET_X + dist * PIXELS_PER_METER;
      // Avoid castles (40px clearance)
      var ok = true;
      for (var ci = 0; ci < castles.length; ci++) {
        if (Math.abs(worldX - castles[ci].x) < 40) { ok = false; break; }
      }
      if (!ok) continue;
      jbPickups.push({
        x: worldX,
        y: 80 + Math.random() * 140, // 80-220 (in the air)
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
        value: 1
      });
    }
  }

  function drawJBPickups(colors) {
    for (var i = 0; i < jbPickups.length; i++) {
      var p = jbPickups[i];
      if (p.collected) continue;
      var px = p.x - cameraX;
      if (px < -30 || px > CANVAS_W + 30) continue;
      var bob = Math.sin(Date.now() * 0.003 + p.bobOffset) * 4;
      var py = p.y + bob;

      // Faint accent glow circle
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw JB icon
      drawJBIcon(ctx, px, py, 14, colors.accent);
    }
  }

  function checkJBPickupCollision() {
    for (var i = 0; i < jbPickups.length; i++) {
      var p = jbPickups[i];
      if (p.collected) continue;
      var dx = projectilePos.x - p.x;
      var dy = projectilePos.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        p.collected = true;
        jbCollected++;

        // Accent particles (8)
        var colors = getThemeColors();
        for (var pi = 0; pi < 8; pi++) {
          var angle = (pi / 8) * Math.PI * 2;
          var speed = 1.5 + Math.random() * 2;
          particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 20,
            maxLife: 20,
            color: colors.accent
          });
        }

        // Floating "+1 JB" text
        bonusTexts.push({
          x: p.x,
          y: p.y - 10,
          text: '+1 JB',
          life: 45,
          maxLife: 45
        });

        // Sound
        playJBCollectSound();
      }
    }
  }

  function playJBCollectSound() {
    if (!audioCtx || isMuted) return;
    playTone(800, 0.05, 'sine', 0.12);
    setTimeout(function () { playTone(1200, 0.05, 'sine', 0.12); }, 50);
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

  // ── Sound Effects (Web Audio API) ────────────
  var audioCtx = null;
  var isMuted = false;
  var whooshNode = null;
  var whooshGain = null;

  try { isMuted = localStorage.getItem('trebuchet-muted') === 'true'; } catch (e) {}

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }

  function playTone(freq, duration, type, volume) {
    if (!audioCtx || isMuted) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(volume || 0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playNoise(duration, volume) {
    if (!audioCtx || isMuted) return;
    try {
      var bufferSize = audioCtx.sampleRate * duration;
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      var src = audioCtx.createBufferSource();
      src.buffer = buffer;
      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(volume || 0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      src.connect(gain);
      gain.connect(audioCtx.destination);
      src.start();
    } catch (e) {}
  }

  function playSweep(startFreq, endFreq, duration, type) {
    if (!audioCtx || isMuted) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playLaunchSound() { playSweep(200, 600, 0.3, 'sine'); }

  function startWhoosh() {
    if (!audioCtx || isMuted) return;
    try {
      var bufferSize = audioCtx.sampleRate * 2;
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      whooshNode = audioCtx.createBufferSource();
      whooshNode.buffer = buffer;
      whooshNode.loop = true;
      whooshGain = audioCtx.createGain();
      whooshGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      whooshNode.connect(whooshGain);
      whooshGain.connect(audioCtx.destination);
      whooshNode.start();
    } catch (e) {}
  }

  function updateWhoosh(speed) {
    if (whooshGain) {
      var vol = Math.min(0.08, speed * 0.003);
      try { whooshGain.gain.setValueAtTime(vol, audioCtx.currentTime); } catch (e) {}
    }
  }

  function stopWhoosh() {
    try {
      if (whooshNode) { whooshNode.stop(); whooshNode = null; }
      whooshGain = null;
    } catch (e) {}
  }

  function playCastleHitSound() {
    playTone(80, 0.2, 'square', 0.15);
    playNoise(0.1, 0.12);
  }

  function playCrowdScatterSound() {
    if (!audioCtx || isMuted) return;
    for (var i = 0; i < 3; i++) {
      setTimeout(function () { playTone(800, 0.05, 'sine', 0.1); }, i * 40);
    }
  }

  function playBounceSound() { playTone(120, 0.1, 'triangle', 0.12); }

  function playLandingSound() {
    playTone(60, 0.3, 'sine', 0.15);
    playNoise(0.15, 0.1);
  }

  function playComboSound(level) {
    if (!audioCtx || isMuted) return;
    var notes = [262, 330, 392, 523]; // C4, E4, G4, C5
    var max = Math.min(level, notes.length);
    for (var i = 0; i < max; i++) {
      (function (idx) {
        setTimeout(function () { playTone(notes[idx], 0.12, 'sine', 0.12); }, idx * 80);
      })(i);
    }
  }

  function playRecordSound() {
    if (!audioCtx || isMuted) return;
    var notes = [523, 659, 784]; // C5, E5, G5
    for (var i = 0; i < notes.length; i++) {
      (function (idx) {
        setTimeout(function () { playTone(notes[idx], 0.15, 'sine', 0.15); }, idx * 120);
      })(i);
    }
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
    windParticles = [];
    flagX = 0;
    launchDistance = 0;
    bounceCount = 0;
    powerMeterValue = 0;
    powerMeterDir = 1;
    lockedPower = 0;
    angleSweepValue = 45;
    angleSweepDir = 1;
    lockedAngle = 45;
    trebRecoilX = 0;
    trebRecoilY = 0;
    cwPendulumAngle = 0;
    postLaunchFrame = 0;
    dtMultiplier = 1;
    landCountUp = -1;

    initCastles();
    initCrowds();
    initHills();
    initTrampolines();
    initJBPickups();
    generateWind();
    launchBtn.disabled = true;
    dealHand();
    renderCards();
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
    playLaunchSound();
    requestAnimationFrame(tickLaunch);
  }

  function tickLaunch() {
    if (gamePhase !== 'launching') return;
    animFrame++;

    // Arm swings from rest (0.3 rad) to upright (~1.3 rad)
    var progress = Math.min(animFrame / SWING_FRAMES, 1);
    // Spring overshoot: ease with slight wobble past target
    var ease = 1 - Math.pow(1 - progress, 3);
    var overshoot = progress > 0.7 ? Math.sin((progress - 0.7) / 0.3 * Math.PI * 2) * 0.08 * (1 - progress) : 0;
    swingAngle = 0.3 + ease * 1.0 + overshoot;

    // Recoil during launch (kicks back and up)
    if (progress > 0.3) {
      var recoilPhase = (progress - 0.3) / 0.7;
      trebRecoilX = -Math.sin(recoilPhase * Math.PI) * 4;
      trebRecoilY = Math.sin(recoilPhase * Math.PI) * 2;
    }

    // Spawn dust at trebuchet base at launch moment (progress ~0.5)
    if (animFrame === Math.floor(SWING_FRAMES * 0.5)) {
      var colors = getThemeColors();
      spawnImpactParticles(TREBUCHET_X, GROUND_Y - HILL_HEIGHT, colors.fg, 10);
    }
    // Second dust burst at arm peak (release moment)
    if (animFrame === SWING_FRAMES - 1) {
      var colors2 = getThemeColors();
      spawnImpactParticles(TREBUCHET_X, GROUND_Y - HILL_HEIGHT - 30, colors2.fg, 8);
    }

    drawScene();

    if (animFrame >= SWING_FRAMES) {
      gamePhase = 'flight';
      animFrame = 0;
      postLaunchFrame = 30;
      startWhoosh();
      requestAnimationFrame(tickFlight);
      return;
    }

    requestAnimationFrame(tickLaunch);
  }

  function tickFlight() {
    if (gamePhase !== 'flight') return;
    animFrame++;

    stepProjectile();
    var flightSpeed = Math.sqrt(projectileVel.x * projectileVel.x + projectileVel.y * projectileVel.y);
    updateWhoosh(flightSpeed);
    checkCastleCollision();
    checkCrowdCollision();
    checkTrampolineCollision();
    checkJBPickupCollision();
    spawnWindParticles();

    // Post-launch trebuchet decay animation
    if (postLaunchFrame > 0) {
      postLaunchFrame--;
      var decay = postLaunchFrame / 30;
      var t = 30 - postLaunchFrame;
      trebRecoilX = Math.sin(t * Math.PI * 3 / 30) * 3 * decay;
      trebRecoilY = Math.sin(t * Math.PI * 3 / 30) * 1.5 * decay;
      cwPendulumAngle = Math.sin(t * Math.PI * 4 / 30) * 0.3 * decay;
    } else {
      trebRecoilX = 0;
      trebRecoilY = 0;
      cwPendulumAngle = 0;
    }

    // Best flag flash detection
    if (stats.bestDistance > 0 && bestFlagFlash === 0) {
      var bestWorldX = TREBUCHET_X + stats.bestDistance * PIXELS_PER_METER;
      if (projectilePos.x >= bestWorldX && projectilePos.x < bestWorldX + Math.abs(projectileVel.x) + 5) {
        bestFlagFlash = 20;
      }
    }

    // Camera follows projectile
    targetCameraX = projectilePos.x - CANVAS_W * 0.3;
    if (targetCameraX < 0) targetCameraX = 0;
    cameraX += (targetCameraX - cameraX) * CAM_EASE;

    // Slow-mo on terminal descent
    var groundAtX = getGroundY(projectilePos.x);
    var proj = selectedParts.projectile;
    var maxBounces = (proj.special === 'shockwave') ? 4 : 3;
    if (bounceCount >= maxBounces && projectileVel.y > 0 && projectilePos.y > groundAtX - 40) {
      dtMultiplier = 0.3;
    }

    // Check if landed or bouncing
    if (projectilePos.y >= groundAtX && animFrame > 5) {
      projectilePos.y = groundAtX;
      var impactSpeed = Math.sqrt(projectileVel.x * projectileVel.x + projectileVel.y * projectileVel.y);
      var proj = selectedParts.projectile;
      var cor = 0.15 + (100 - proj.weight) / 250;

      // Hill slope deflection
      var slopeLeft = getGroundY(projectilePos.x - 2);
      var slopeRight = getGroundY(projectilePos.x + 2);
      var slopeAngle = Math.atan2(slopeLeft - slopeRight, 4);

      var maxBounces = (proj.special === 'shockwave') ? 4 : 3;
      if (impactSpeed > 3 && bounceCount < maxBounces) {
        // Bounce — adjust velocity based on hill slope
        projectileVel.y = -Math.abs(projectileVel.y) * cor;
        projectileVel.x *= 0.8;
        // Slope deflection: redirect some vertical energy into horizontal
        if (Math.abs(slopeAngle) > 0.05) {
          projectileVel.x += Math.sin(slopeAngle) * impactSpeed * 0.3;
          projectileVel.y -= Math.abs(Math.sin(slopeAngle)) * impactSpeed * 0.15;
        }
        bounceCount++;
        playBounceSound();
        var colors = getThemeColors();
        spawnImpactParticles(projectilePos.x, groundAtX, colors.accent, 8);
        var shockMult = (proj.special === 'shockwave') ? 2 : 1;
        shakeFrames = 4 * shockMult;
        shakeIntensity = (2 + impactSpeed * 0.1) * shockMult;
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

  function playTickSound() {
    playTone(600, 0.03, 'sine', 0.1);
  }

  function onLanded() {
    gamePhase = 'landed';
    stopWhoosh();
    playLandingSound();
    dtMultiplier = 1;
    var colors = getThemeColors();

    // Screen shake
    shakeFrames = 12;
    shakeIntensity = 6 + launchDistance * 0.008;
    if (shakeIntensity > 15) shakeIntensity = 15;

    // Impact particles
    spawnImpactParticles(projectilePos.x, GROUND_Y, colors.accent);

    // Explode special: ring of particles + distance bonus
    var proj = selectedParts.projectile;
    if (proj && proj.special === 'explode') {
      for (var ei = 0; ei < 16; ei++) {
        var ea = (ei / 16) * Math.PI * 2;
        particles.push({
          x: projectilePos.x,
          y: GROUND_Y,
          vx: Math.cos(ea) * 5,
          vy: Math.sin(ea) * 5 - 2,
          life: 30,
          maxLife: 30,
          color: '#ff8844'
        });
      }
      launchDistance *= 1.2;
    }

    // Zoom to center the flag
    var showCamX = Math.max(0, flagX - CANVAS_W * 0.5);
    targetCameraX = showCamX;

    // Extended landing sequence: camera ease -> count-up -> hold -> results
    var landFrames = 0;
    var finalDist = Math.floor(launchDistance);
    landCountUp = 0;

    function tickLand() {
      landFrames++;
      cameraX += (targetCameraX - cameraX) * 0.1;

      // Phase A: Camera eases to center flag (frames 1-20)
      // Phase B: Distance count-up (frames 20-70)
      if (landFrames > 20 && landFrames <= 70) {
        var countProgress = (landFrames - 20) / 50;
        // Ease-out cubic
        var eased = 1 - Math.pow(1 - countProgress, 3);
        landCountUp = Math.floor(eased * finalDist);
        // Tick sound every ~5 frames
        if ((landFrames - 20) % 5 === 0) playTickSound();
      }
      // Phase C: Hold on final number (frames 70-90)
      if (landFrames >= 70) {
        landCountUp = finalDist;
      }

      drawScene();

      // Phase D: Show results overlay (frame 90+)
      if (landFrames < 88) {
        requestAnimationFrame(tickLand);
      } else {
        landCountUp = -1;
        drawScene();
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
    var jbReward = jbCollected;
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

    // Crowd bonus
    coinReward += crowdBonus;

    // Record bonus
    if (isRecord) {
      recordBonus = 50;
      coinReward += recordBonus;
      stats.bestDistance = dist;
      playRecordSound();
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

    // Crowd results
    var crowdRow = document.getElementById('tb-result-crowds-row');
    if (crowdRow) {
      if (crowdsScattered > 0) {
        crowdRow.textContent = 'Crowds scattered: ' + crowdsScattered + ' (+' + crowdBonus + ' coins)';
        crowdRow.classList.remove('tb-hidden');
      } else {
        crowdRow.classList.add('tb-hidden');
      }
    }

    // Combo results
    var comboRow = document.getElementById('tb-result-combo-row');
    if (comboRow) {
      if (bestCombo > 1) {
        comboRow.textContent = 'Best combo: x' + comboMultiplier;
        comboRow.classList.remove('tb-hidden');
      } else {
        comboRow.classList.add('tb-hidden');
      }
    }

    // Trampoline results
    var trampolineRow = document.getElementById('tb-result-trampolines-row');
    if (trampolineRow) {
      if (trampolinesHit > 0) {
        trampolineRow.textContent = 'Trampolines: ' + trampolinesHit;
        trampolineRow.classList.remove('tb-hidden');
      } else {
        trampolineRow.classList.add('tb-hidden');
      }
    }

    // JB collected results
    var jbCollectedRow = document.getElementById('tb-result-jbcollected-row');
    if (jbCollectedRow) {
      if (jbCollected > 0) {
        jbCollectedRow.textContent = 'JB Collected: ' + jbCollected;
        jbCollectedRow.classList.remove('tb-hidden');
      } else {
        jbCollectedRow.classList.add('tb-hidden');
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
  var muteBtn = document.getElementById('tb-mute-btn');
  function updateMuteBtn() {
    if (muteBtn) muteBtn.textContent = isMuted ? '[x]' : '[\u266A]';
  }
  updateMuteBtn();
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      initAudio();
      isMuted = !isMuted;
      try { localStorage.setItem('trebuchet-muted', isMuted ? 'true' : 'false'); } catch (e) {}
      updateMuteBtn();
    });
  }

  playBtn.addEventListener('click', function () { initAudio(); startGame(); });

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
  initCrowds();
  initHills();
  initTrampolines();
  initJBPickups();
  updateHUD();
  updateStatsPanel();
  partsContainer.style.display = 'none';
  actionsContainer.style.display = 'none';
  swingAngle = 0.3;
  drawScene();

})();
