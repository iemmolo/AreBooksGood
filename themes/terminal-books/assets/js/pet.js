(function () {
  'use strict';

  var PET_STORAGE_KEY = 'arebooksgood-pet';
  var SPRITE_SIZE = 16;
  var PIXEL_SCALE = 3;
  var MOBILE_PIXEL_SCALE = 3;
  var MOBILE_BREAK = 768;
  var IDLE_TIMEOUT = 30000;     // 30s no mouse → sleep
  var ANIMATION_FPS = 4;        // sprite frame rate
  var FOLLOW_OFFSET_X = 10;
  var FOLLOW_OFFSET_Y = 10;

  // ── State ───────────────────────────────────────────
  var petState = null;
  var container = null;
  var spriteEl = null;
  var speechEl = null;
  var zzzEl = null;
  var currentAnim = 'idle';
  var currentFrame = 0;
  var animTimer = null;
  var idleTimer = null;
  var speechTimer = null;
  var targetX = 0;
  var targetY = 0;
  var currentX = 0;
  var currentY = 0;
  var mouseX = 0;
  var mouseY = 0;
  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var isMobile = false;
  var spriteData = null;
  var isVisible = true;
  var celebrateTimeout = null;
  var sadTimeout = null;
  var isDocked = false;
  var dockEl = null;
  var tapWalkTimer = null;

  // ── Fling state ─────────────────────────────────────
  var isFlung = false;
  var flingVX = 0;
  var flingVY = 0;
  var flingX = 0;
  var flingY = 0;
  var flingTimer = null;
  var lastDragX = 0;
  var lastDragY = 0;
  var lastDragTime = 0;
  var walkSettleTimer = null;

  // ── Load sprite data ───────────────────────────────
  function loadSpriteData(callback) {
    // Try to fetch from Hugo's data directory
    var script = document.querySelector('script[src*="pet.js"], script[src*="pet.min.js"]');
    var base = '';
    if (script) {
      var src = script.getAttribute('src');
      base = src.substring(0, src.lastIndexOf('/js/'));
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/data/petsprites.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          spriteData = JSON.parse(xhr.responseText);
          callback();
        } catch (e) {
          // Fallback: inline minimal data
          spriteData = null;
          callback();
        }
      } else {
        spriteData = null;
        callback();
      }
    };
    xhr.onerror = function () {
      spriteData = null;
      callback();
    };
    xhr.send();
  }

  // ── Pet State Management ────────────────────────────
  function defaultPetState() {
    return {
      activePet: null,
      pets: {},
      accessories: { owned: [], equipped: { head: null, body: null } },
      position: { x: null, y: null, docked: false },
      visible: true,
      milestones: {
        totalGamesPlayed: 0, biggestSingleWin: 0,
        currentWinStreak: 0, bestWinStreak: 0,
        currentLoseStreak: 0, worstLoseStreak: 0
      }
    };
  }

  function loadPetState() {
    try {
      var raw = localStorage.getItem(PET_STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var state = defaultPetState();
        state.activePet = saved.activePet || null;
        state.pets = saved.pets || {};
        if (saved.accessories) {
          state.accessories.owned = saved.accessories.owned || [];
          if (saved.accessories.equipped) {
            state.accessories.equipped.head = saved.accessories.equipped.head || null;
            state.accessories.equipped.body = saved.accessories.equipped.body || null;
          }
        }
        if (saved.position) {
          state.position = saved.position;
          if (typeof state.position.docked === 'undefined') state.position.docked = false;
        }
        if (typeof saved.visible === 'boolean') state.visible = saved.visible;
        if (saved.milestones) {
          for (var k in state.milestones) {
            if (saved.milestones.hasOwnProperty(k)) {
              state.milestones[k] = saved.milestones[k];
            }
          }
        }
        return state;
      }
    } catch (e) {}
    return defaultPetState();
  }

  function savePetState() {
    if (!petState) return;
    try {
      localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(petState));
    } catch (e) {}
  }

  // ── Sprite Rendering (CSS box-shadow) ───────────────
  function getScale() {
    return isMobile ? MOBILE_PIXEL_SCALE : PIXEL_SCALE;
  }

  function resolveFrames(petId, level, anim) {
    if (!spriteData) return null;
    var petData = spriteData[petId];
    if (!petData) return null;

    var levelData = petData[String(level)];
    if (!levelData) return null;

    var frames = levelData[anim];

    // Handle string references (e.g. "1" means use level 1, "cat.1" means use cat level 1)
    if (typeof frames === 'string') {
      if (frames.indexOf('.') !== -1) {
        var parts = frames.split('.');
        return resolveFrames(parts[0], parseInt(parts[1], 10), anim);
      } else {
        return resolveFrames(petId, parseInt(frames, 10), anim);
      }
    }

    return frames;
  }

  function renderSpriteFrame(pixelGrid) {
    if (!pixelGrid) return '';

    var scale = getScale();
    var shadows = [];

    for (var i = 0; i < pixelGrid.length; i++) {
      if (pixelGrid[i] === 0) continue;

      var px = i % SPRITE_SIZE;
      var py = Math.floor(i / SPRITE_SIZE);
      var x = px * scale;
      var y = py * scale;
      var color = pixelGrid[i] === 1 ? 'var(--foreground)' : pixelGrid[i] === 3 ? 'var(--pet-accessory)' : 'var(--accent)';
      shadows.push(x + 'px ' + y + 'px 0 0.5px ' + color);
    }

    return shadows.join(',');
  }

  function updateSprite() {
    if (!spriteEl || !petState || !petState.activePet) return;

    var pet = petState.pets[petState.activePet];
    if (!pet) return;

    var frames = resolveFrames(petState.activePet, pet.level, currentAnim);
    if (!frames || frames.length === 0) {
      // Fallback to idle
      frames = resolveFrames(petState.activePet, pet.level, 'idle');
      if (!frames || frames.length === 0) return;
    }

    var frameIdx = currentFrame % frames.length;
    var shadow = renderSpriteFrame(frames[frameIdx]);

    var scale = getScale();
    // The box-shadow pixel element
    var canvas = spriteEl.querySelector('.pet-pixel-canvas');
    if (!canvas) {
      canvas = document.createElement('div');
      canvas.className = 'pet-pixel-canvas';
      spriteEl.appendChild(canvas);
    }
    canvas.style.width = scale + 'px';
    canvas.style.height = scale + 'px';
    canvas.style.boxShadow = shadow;

    // Render accessory overlay
    renderAccessoryOverlay();
  }

  function renderAccessoryOverlay() {
    // Remove existing overlay
    var existing = spriteEl.querySelector('.pet-accessory-canvas');
    if (existing) existing.remove();

    if (!petState || !spriteData || !spriteData.accessories) return;

    var equipped = petState.accessories.equipped;
    var overlayPixels = [];

    var slots = ['head', 'body'];
    for (var s = 0; s < slots.length; s++) {
      var slot = slots[s];
      var accId = equipped[slot];
      if (!accId || !spriteData.accessories[accId]) continue;
      var accData = spriteData.accessories[accId];
      for (var i = 0; i < accData.length; i++) {
        if (accData[i] !== 0) {
          overlayPixels.push({ index: i, value: accData[i] });
        }
      }
    }

    if (overlayPixels.length === 0) return;

    var scale = getScale();
    var shadows = [];
    for (var p = 0; p < overlayPixels.length; p++) {
      var px = overlayPixels[p].index % SPRITE_SIZE;
      var py = Math.floor(overlayPixels[p].index / SPRITE_SIZE);
      var x = px * scale;
      var y = py * scale;
      var color = overlayPixels[p].value === 1 ? 'var(--foreground)' : overlayPixels[p].value === 3 ? 'var(--pet-accessory)' : 'var(--accent)';
      shadows.push(x + 'px ' + y + 'px 0 0.5px ' + color);
    }

    var overlay = document.createElement('div');
    overlay.className = 'pet-pixel-canvas pet-accessory-canvas';
    overlay.style.width = scale + 'px';
    overlay.style.height = scale + 'px';
    overlay.style.boxShadow = shadows.join(',');
    overlay.style.zIndex = '1';
    spriteEl.appendChild(overlay);
  }

  // ── Animation Loop ──────────────────────────────────
  function startAnimation() {
    stopAnimation();
    animTimer = setInterval(function () {
      currentFrame++;
      updateSprite();
    }, 1000 / ANIMATION_FPS);
  }

  function stopAnimation() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }

  function setAnimState(state) {
    if (currentAnim === state) return;
    currentAnim = state;
    currentFrame = 0;

    if (!container) return;
    // Remove all state classes
    container.className = container.className.replace(/pet-state-\S+/g, '').trim();
    container.classList.add('pet-state-' + state);

    // Show/hide zzz
    if (zzzEl) {
      zzzEl.style.display = state === 'sleeping' ? '' : 'none';
    }

    updateSprite();
  }

  // ── Idle / Sleep Timer ──────────────────────────────
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (currentAnim === 'sleeping') {
      setAnimState('idle');
    }
    idleTimer = setTimeout(function () {
      if (!isDragging && !isFlung && currentAnim !== 'celebrating' && currentAnim !== 'sad') {
        setAnimState('sleeping');
      }
    }, IDLE_TIMEOUT);
  }

  // ── Positioning ─────────────────────────────────────
  function getSpriteSize() {
    var scale = getScale();
    return SPRITE_SIZE * scale;
  }

  function moveTo(x, y) {
    if (!container) return;
    var size = getSpriteSize();
    var maxX = window.innerWidth - size;
    var maxY = window.innerHeight - size;
    x = Math.round(Math.max(0, Math.min(x, maxX)));
    y = Math.round(Math.max(0, Math.min(y, maxY)));
    currentX = x;
    currentY = y;
    container.style.left = x + 'px';
    container.style.top = y + 'px';
  }

  function followCursor() {
    if (isDragging || isFlung || isMobile || isDocked) return;
    targetX = mouseX + FOLLOW_OFFSET_X;
    targetY = mouseY + FOLLOW_OFFSET_Y;

    var dx = targetX - currentX;
    var dy = targetY - currentY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 40) {
      if (walkSettleTimer) { clearTimeout(walkSettleTimer); walkSettleTimer = null; }
      if (currentAnim !== 'celebrating' && currentAnim !== 'sad') {
        setAnimState('walk');
      }
      container.classList.add('pet-following');
    } else {
      container.classList.remove('pet-following');
      if (currentAnim === 'walk' && !walkSettleTimer) {
        walkSettleTimer = setTimeout(function () {
          walkSettleTimer = null;
          if (currentAnim === 'walk') setAnimState('idle');
        }, 500);
      }
    }

    moveTo(targetX, targetY);
  }

  // ── Mouse/Touch Handlers ────────────────────────────
  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    resetIdleTimer();
    if (!isDragging) {
      followCursor();
    }
  }

  function onPointerDown(e) {
    if (!container) return;
    e.preventDefault();
    if (isDocked) undockPet();

    isDragging = true;
    isFlung = false;
    if (flingTimer) cancelAnimationFrame(flingTimer);

    container.classList.add('pet-dragging');
    container.classList.remove('pet-following');

    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragOffsetX = clientX - currentX;
    dragOffsetY = clientY - currentY;
    lastDragX = clientX;
    lastDragY = clientY;
    lastDragTime = Date.now();

    setAnimState('idle');
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    var now = Date.now();
    var dt = now - lastDragTime;
    if (dt > 0) {
      lastDragX = clientX;
      lastDragY = clientY;
      lastDragTime = now;
    }

    moveTo(clientX - dragOffsetX, clientY - dragOffsetY);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    container.classList.remove('pet-dragging');

    var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    var now = Date.now();
    var dt = now - lastDragTime;
    if (dt < 1) dt = 1;

    // Check dock collision (padded hitbox for easier docking)
    if (dockEl) {
      var size = getSpriteSize();
      var petCenterX = currentX + size / 2;
      var petCenterY = currentY + size / 2;
      var dockRect = dockEl.getBoundingClientRect();
      var dockPad = 20;
      if (petCenterX >= dockRect.left - dockPad && petCenterX <= dockRect.right + dockPad &&
          petCenterY >= dockRect.top - dockPad && petCenterY <= dockRect.bottom + dockPad) {
        dockPet();
        return;
      }
    }

    var vx = (clientX - lastDragX) / dt * 16;
    var vy = (clientY - lastDragY) / dt * 16;
    var speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 3) {
      startFling(vx, vy);
    } else {
      // Save position after drag (mobile and desktop)
      petState.position.x = currentX;
      petState.position.y = currentY;
      savePetState();
    }
  }

  // ── Tap-to-walk (mobile) ────────────────────────
  function onDocumentTap(e) {
    if (isDragging || isFlung || isDocked) return;

    var target = e.target;
    if (container && container.contains(target)) return;
    if (dockEl && dockEl.contains(target)) return;
    if (target.closest && target.closest('a, button, input, textarea, select')) return;

    var touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    var size = getSpriteSize();
    var tapX = touch.clientX - size / 2;
    var tapY = touch.clientY - size / 2;

    setAnimState('walk');
    container.classList.add('pet-following');
    moveTo(tapX, tapY);

    if (tapWalkTimer) clearTimeout(tapWalkTimer);
    tapWalkTimer = setTimeout(function () {
      tapWalkTimer = null;
      setAnimState('idle');
      container.classList.remove('pet-following');
      petState.position.x = currentX;
      petState.position.y = currentY;
      savePetState();
    }, 500);
  }

  // ── Dock ───────────────────────────────────────
  function createDock() {
    if (dockEl) dockEl.remove();

    dockEl = document.createElement('div');
    dockEl.className = 'pet-dock';
    dockEl.addEventListener('click', onDockClick);
    document.body.appendChild(dockEl);
  }

  function onDockClick(e) {
    e.stopPropagation();
    if (isDocked) undockPet();
    else dockPet();
  }

  function dockPet(silent) {
    if (!dockEl || !container) return;
    isDocked = true;
    petState.position.docked = true;

    var dockRect = dockEl.getBoundingClientRect();
    var size = getSpriteSize();
    var dockCenterX = dockRect.left + dockRect.width / 2 - size / 2;
    var dockCenterY = dockRect.top + dockRect.height / 2 - size / 2;

    moveTo(dockCenterX, dockCenterY);
    dockEl.classList.add('pet-dock-occupied');
    if (!silent) speak('*settles in*');
    setAnimState('idle');
    savePetState();
  }

  function undockPet() {
    isDocked = false;
    petState.position.docked = false;
    if (dockEl) dockEl.classList.remove('pet-dock-occupied');
    savePetState();
  }

  // ── Fling Physics ───────────────────────────────────
  function startFling(vx, vy) {
    isFlung = true;
    flingVX = vx;
    flingVY = vy;
    flingX = currentX;
    flingY = currentY;

    setAnimState('flung');

    // Track flings
    if (petState && petState.activePet && petState.pets[petState.activePet]) {
      petState.pets[petState.activePet].flingCount++;
      savePetState();
    }

    flingLoop();
  }

  function flingLoop() {
    if (!isFlung) return;

    var GRAVITY = 0.5;
    var FRICTION = 0.98;
    var BOUNCE = 0.6;
    var size = getSpriteSize();
    var maxX = window.innerWidth - size;
    var maxY = window.innerHeight - size;

    flingVY += GRAVITY;
    flingVX *= FRICTION;
    flingVY *= FRICTION;

    flingX += flingVX;
    flingY += flingVY;

    // Bounce off edges
    var bounced = false;
    if (flingX <= 0) { flingX = 0; flingVX = -flingVX * BOUNCE; bounced = true; }
    if (flingX >= maxX) { flingX = maxX; flingVX = -flingVX * BOUNCE; bounced = true; }
    if (flingY <= 0) { flingY = 0; flingVY = -flingVY * BOUNCE; bounced = true; }
    if (flingY >= maxY) { flingY = maxY; flingVY = -flingVY * BOUNCE; bounced = true; }

    // Hard fling coin drop
    if (bounced && Math.abs(flingVX) + Math.abs(flingVY) > 4) {
      if (Math.random() < 0.3) {
        dropCoin(flingX + size / 2, flingY);
      }
    }

    moveTo(flingX, flingY);

    var speed = Math.sqrt(flingVX * flingVX + flingVY * flingVY);
    if (speed < 0.5 && flingY >= maxY - 2) {
      isFlung = false;
      setAnimState('idle');
      resetIdleTimer();

      if (isMobile) {
        petState.position.x = currentX;
        petState.position.y = currentY;
        savePetState();
      }
      return;
    }

    flingTimer = requestAnimationFrame(flingLoop);
  }

  function dropCoin(x, y) {
    var amount = Math.floor(Math.random() * 11) + 5;
    Wallet.add(amount);

    var el = document.createElement('span');
    el.className = 'pet-coin-particle';
    el.textContent = '+' + amount;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 800);
  }

  // ── Speech Bubbles ──────────────────────────────────
  var IDLE_MESSAGES = {
    cat: [
      '*purrs*', '*stretches*', 'meow?', '*knocks things off table*',
      '*stares at nothing*', 'feed me.', '*grooming*', '*tail swish*',
      'I own this site.', '*yawn*'
    ],
    dragon: [
      '*smoke puff*', 'hoard... coins...', '*flaps tiny wings*',
      '*breathes small flame*', 'treasure?', '*scales shimmer*',
      'rawr!', '*guards wallet*', 'more gold!', '*naps on coins*'
    ],
    robot: [
      'BEEP BOOP', 'calculating...', 'odds: favorable',
      'processing...', '01101000 01101001', 'system nominal',
      'probability updated', '*whirrs*', 'data collected',
      'efficiency: optimal'
    ]
  };

  var WIN_MESSAGES = {
    cat: ['*happy purr*', 'lucky paws!', '*kneading*', 'more treats!'],
    dragon: ['*victory roar*', 'to the hoard!', '*fire breath*', 'GOLD!'],
    robot: ['WIN DETECTED', 'positive outcome', 'as calculated', '+1 to records']
  };

  var LOSE_MESSAGES = {
    cat: ['*hisses*', '*sad meow*', '*knocks glass off table*', 'unfair.'],
    dragon: ['*sad smoke*', 'my hoard...', '*whimper*', 'revenge...'],
    robot: ['ERROR: loss', 'recalculating...', 'variance detected', 'suboptimal']
  };

  var CONTEXT_MESSAGES = {
    review: ['good book?', 'I prefer fish stories', 'read to me', '*sits on book*'],
    casino: ['feeling lucky?', 'bet big!', 'all in!', 'the house always loses'],
    chess: ['knight to fish 4', 'checkmate!', '*pushes pieces off board*', 'en passant!']
  };

  function speak(message) {
    if (!speechEl || !container || !isVisible) return;

    speechEl.textContent = '';
    speechEl.style.display = 'block';

    // Typewriter effect
    var i = 0;
    function typeNext() {
      if (i < message.length) {
        speechEl.textContent += message[i];
        i++;
        setTimeout(typeNext, 40);
      } else {
        if (speechTimer) clearTimeout(speechTimer);
        speechTimer = setTimeout(function () {
          speechEl.style.display = 'none';
        }, 3000);
      }
    }
    typeNext();
  }

  function randomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  var idleSpeechTimer = null;

  function startIdleSpeech() {
    if (idleSpeechTimer) clearInterval(idleSpeechTimer);
    idleSpeechTimer = setInterval(function () {
      if (!petState || !petState.activePet || currentAnim !== 'idle') return;
      if (Math.random() > 0.3) return; // 30% chance each tick

      var petId = petState.activePet;
      var messages = IDLE_MESSAGES[petId] || IDLE_MESSAGES.cat;

      // Context-aware messages
      var path = window.location.pathname;
      if (path.indexOf('/reviews/') !== -1 || path === '/reviews/') {
        if (Math.random() < 0.4) messages = CONTEXT_MESSAGES.review;
      } else if (path.indexOf('/casino/') !== -1) {
        if (Math.random() < 0.4) messages = CONTEXT_MESSAGES.casino;
      } else if (path.indexOf('/chess/') !== -1) {
        if (Math.random() < 0.4) messages = CONTEXT_MESSAGES.chess;
      }

      speak(randomMessage(messages));
    }, 15000);
  }

  // ── Game Event Integration ──────────────────────────
  function handleGameResult(data) {
    if (!petState || !petState.activePet) return null;

    var pet = petState.pets[petState.activePet];
    if (!pet) return null;

    pet.gamesWatched++;
    petState.milestones.totalGamesPlayed++;

    var bonus = null;
    var outcome = data.outcome; // 'win', 'lose', 'push'

    if (outcome === 'win') {
      pet.totalWins++;
      petState.milestones.currentWinStreak++;
      petState.milestones.currentLoseStreak = 0;
      if (petState.milestones.currentWinStreak > petState.milestones.bestWinStreak) {
        petState.milestones.bestWinStreak = petState.milestones.currentWinStreak;
      }
      if (data.payout > petState.milestones.biggestSingleWin) {
        petState.milestones.biggestSingleWin = data.payout;
      }

      // Celebrate
      celebrate();

      // Speech
      var winMsgs = WIN_MESSAGES[petState.activePet] || WIN_MESSAGES.cat;
      speak(randomMessage(winMsgs));

      // Apply passive
      bonus = applyWinPassive(data);
    } else if (outcome === 'lose') {
      pet.totalLosses++;
      petState.milestones.currentLoseStreak++;
      petState.milestones.currentWinStreak = 0;
      if (petState.milestones.currentLoseStreak > petState.milestones.worstLoseStreak) {
        petState.milestones.worstLoseStreak = petState.milestones.currentLoseStreak;
      }

      // Sad
      showSad();

      // Speech
      var loseMsgs = LOSE_MESSAGES[petState.activePet] || LOSE_MESSAGES.cat;
      speak(randomMessage(loseMsgs));

      // Apply passive
      bonus = applyLosePassive(data);
    }

    savePetState();
    return bonus;
  }

  function celebrate() {
    setAnimState('celebrating');
    if (celebrateTimeout) clearTimeout(celebrateTimeout);
    celebrateTimeout = setTimeout(function () {
      if (currentAnim === 'celebrating') setAnimState('idle');
    }, 2000);
  }

  function showSad() {
    setAnimState('sad');
    if (sadTimeout) clearTimeout(sadTimeout);
    sadTimeout = setTimeout(function () {
      if (currentAnim === 'sad') setAnimState('idle');
    }, 3000);
  }

  // ── Passive Abilities ───────────────────────────────
  function applyWinPassive(data) {
    if (!petState || !petState.activePet) return null;

    var petId = petState.activePet;
    var pet = petState.pets[petId];
    var level = pet.level;

    // Dragon's Hoard: bonus coins on wins
    if (petId === 'dragon') {
      var chance = level === 1 ? 0.05 : level === 2 ? 0.10 : 0.15;
      var pct = level === 1 ? 0.10 : level === 2 ? 0.15 : 0.20;
      if (Math.random() < chance) {
        var bonus = Math.max(1, Math.floor(data.bet * pct));
        Wallet.add(bonus);
        speak("Dragon's Hoard! +" + bonus);
        return { type: 'dragon_hoard', amount: bonus };
      }
    }

    // Robot: Probability Core - recovery per N hands
    if (petId === 'robot') {
      var interval = level === 1 ? 10 : level === 2 ? 8 : 5;
      var recoveryPct = level === 1 ? 0.30 : level === 2 ? 0.40 : 0.50;
      if (pet.gamesWatched % interval === 0) {
        var recovery = Math.max(1, Math.floor(data.bet * recoveryPct));
        Wallet.add(recovery);
        speak('Insurance: +' + recovery);
        return { type: 'probability_core', amount: recovery };
      }
    }

    return null;
  }

  function applyLosePassive(data) {
    if (!petState || !petState.activePet) return null;

    var petId = petState.activePet;
    var pet = petState.pets[petId];
    var level = pet.level;
    var streak = petState.milestones.currentLoseStreak;

    // Cat's Lucky Paws: refund after losing streak
    if (petId === 'cat') {
      var threshold = level === 3 ? 2 : 3;
      var refundPct = level === 1 ? 0.25 : level === 2 ? 0.40 : 0.50;
      if (streak >= threshold) {
        var refund = Math.max(1, Math.floor(data.bet * refundPct));
        Wallet.add(refund);
        speak('Lucky Paws! +' + refund);
        return { type: 'lucky_paws', amount: refund };
      }
    }

    // Robot: Probability Core also triggers on losses
    if (petId === 'robot') {
      var interval = level === 1 ? 10 : level === 2 ? 8 : 5;
      var recoveryPct = level === 1 ? 0.30 : level === 2 ? 0.40 : 0.50;
      if (pet.gamesWatched % interval === 0) {
        var recovery = Math.max(1, Math.floor(data.bet * recoveryPct));
        Wallet.add(recovery);
        speak('Insurance: +' + recovery);
        return { type: 'probability_core', amount: recovery };
      }
    }

    return null;
  }

  // ── DOM Creation ────────────────────────────────────
  function createPetDOM() {
    if (container) container.remove();

    container = document.createElement('div');
    container.className = 'pet-container pet-state-idle';

    spriteEl = document.createElement('div');
    spriteEl.className = 'pet-sprite';
    container.appendChild(spriteEl);

    zzzEl = document.createElement('span');
    zzzEl.className = 'pet-zzz';
    zzzEl.textContent = 'z';
    zzzEl.style.display = 'none';
    container.appendChild(zzzEl);

    speechEl = document.createElement('div');
    speechEl.className = 'pet-speech';
    speechEl.style.display = 'none';
    container.appendChild(speechEl);

    document.body.appendChild(container);

    // Create dock
    createDock();

    // Position
    isMobile = window.innerWidth <= MOBILE_BREAK;

    if (isMobile && petState.position.x !== null) {
      moveTo(petState.position.x, petState.position.y);
    } else if (isMobile) {
      moveTo(window.innerWidth - getSpriteSize() - 10, window.innerHeight - getSpriteSize() - 10);
    } else {
      moveTo(window.innerWidth / 2, window.innerHeight - getSpriteSize() - 20);
    }

    // Restore docked state
    if (petState.position.docked) {
      dockPet(true);
    }

    // Events
    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('touchstart', onPointerDown, { passive: false });

    if (!isMobile) {
      document.addEventListener('mousemove', onMouseMove);
    }
    document.addEventListener('mousemove', function (e) {
      if (isDragging) onPointerMove(e);
    });
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);

    if (isMobile) {
      document.addEventListener('touchend', onDocumentTap);
    }

    // Start animation
    startAnimation();
    resetIdleTimer();
    updateSprite();
    startIdleSpeech();
  }

  // ── Toggle Visibility ───────────────────────────────
  function toggleVisibility() {
    isVisible = !isVisible;
    petState.visible = isVisible;
    savePetState();

    if (container) {
      container.style.display = isVisible ? '' : 'none';
    }
    if (dockEl) {
      dockEl.style.display = isVisible ? '' : 'none';
    }
  }

  // ── Init ────────────────────────────────────────────
  function init() {
    petState = loadPetState();

    if (!petState.activePet || !petState.pets[petState.activePet]) {
      // No pet yet — expose API but don't render
      exposeAPI();
      return;
    }

    isVisible = petState.visible;

    loadSpriteData(function () {
      createPetDOM();
      if (!isVisible && container) {
        container.style.display = 'none';
      }
      exposeAPI();
    });
  }

  function exposeAPI() {
    // Global API for game integration
    window.PetEvents = {
      onGameResult: handleGameResult
    };

    // API for shop to trigger reload
    window.PetSystem = {
      reload: function () {
        petState = loadPetState();
        if (petState.activePet && petState.pets[petState.activePet]) {
          if (!container) {
            loadSpriteData(function () {
              createPetDOM();
            });
          } else {
            currentFrame = 0;
            updateSprite();
          }
        } else if (container) {
          container.remove();
          container = null;
          if (dockEl) { dockEl.remove(); dockEl = null; }
          isDocked = false;
        }
      },
      toggle: toggleVisibility,
      celebrate: celebrate,
      showSad: showSad,
      speak: speak
    };
  }

  init();
})();
