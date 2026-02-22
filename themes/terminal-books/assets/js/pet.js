(function () {
  'use strict';

  var PET_STORAGE_KEY = 'arebooksgood-pet';
  var SPRITE_DISPLAY_SIZE = 48;  // native sprite size (48x48)
  var MOBILE_BREAK = 768;
  var IDLE_TIMEOUT = 30000;     // 30s no mouse → sleep
  var ANIMATION_FPS = 4;        // sprite frame rate
  var FOLLOW_OFFSET_X = 10;
  var FOLLOW_OFFSET_Y = 10;

  // ── Catalog (loaded async) ─────────────────────────
  var catalog = null;

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
  var typewriterTimer = null;
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
  var isBeamed = false;
  var isBeaming = false;
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

  // ── Farming state ─────────────────────────────────
  var isFarming = false;
  var farmingCancelCb = null;

  // ── Load sprite data ───────────────────────────────
  function loadSpriteData(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/data/petsprites.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          spriteData = JSON.parse(xhr.responseText);
          callback();
        } catch (e) {
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

  // ── Load catalog ──────────────────────────────────
  function loadCatalog(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/data/petcatalog.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          catalog = JSON.parse(xhr.responseText);
        } catch (e) {
          catalog = null;
        }
      }
      callback();
    };
    xhr.onerror = function () { callback(); };
    xhr.send();
  }

  // ── Get creature type from catalog ────────────────
  function getCreatureType(petId) {
    if (!catalog || !catalog.creatures) return null;
    // Resolve legacy IDs
    var id = petId;
    if (catalog.legacyMap && catalog.legacyMap[petId]) {
      id = catalog.legacyMap[petId];
    }
    var creature = catalog.creatures[id];
    return creature ? creature.type : null;
  }

  function getCreatureInfo(petId) {
    if (!catalog || !catalog.creatures) return null;
    var id = petId;
    if (catalog.legacyMap && catalog.legacyMap[petId]) {
      id = catalog.legacyMap[petId];
    }
    return catalog.creatures[id] || null;
  }

  // ── Migrate pet state (legacy IDs + mergeXP) ─────
  function migratePetState(state) {
    if (!catalog) return state;
    if (state._migrated) return state;

    var legacyMap = catalog.legacyMap || {};
    var newPets = {};
    var newActive = state.activePet;

    for (var oldId in state.pets) {
      if (!state.pets.hasOwnProperty(oldId)) continue;
      var pet = state.pets[oldId];
      var newId = legacyMap[oldId] || oldId;

      // Add mergeXP field if missing
      if (typeof pet.mergeXP === 'undefined') {
        pet.mergeXP = 0;
      }

      // Cap level to creature's maxLevel
      var creature = catalog.creatures[newId];
      if (creature && pet.level > creature.maxLevel) {
        pet.level = creature.maxLevel;
      }

      newPets[newId] = pet;

      // Update active pet reference
      if (state.activePet === oldId) {
        newActive = newId;
      }
    }

    state.pets = newPets;
    state.activePet = newActive;
    state._migrated = true;
    return state;
  }

  // ── Pet State Management ────────────────────────────
  function defaultPetState() {
    return {
      activePet: null,
      pets: {},
      accessories: { owned: [], equipped: { head: null, body: null } },
      position: { x: null, y: null, docked: false, beamed: false },
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
          if (typeof state.position.beamed === 'undefined') state.position.beamed = false;
          // Migrate: old docked state → beamed
          if (state.position.docked) {
            state.position.beamed = false;
            state.position.docked = false;
          }
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

  // ── Sprite Rendering (sprite sheet) ─────────────────
  function getSpriteInfo(petId) {
    if (!spriteData || !petId) return null;
    // Resolve spriteId from catalog if available
    var spriteId = petId;
    if (catalog && catalog.creatures && catalog.creatures[petId]) {
      spriteId = catalog.creatures[petId].spriteId || petId;
    }
    var petData = spriteData[spriteId];
    if (!petData || !petData.sheet) return null;
    return petData;
  }

  function getFrameCount(petId) {
    var info = getSpriteInfo(petId);
    return info ? info.frames : 1;
  }

  function updateSprite() {
    if (!spriteEl || !petState || !petState.activePet) return;

    var pet = petState.pets[petState.activePet];
    if (!pet) return;

    var info = getSpriteInfo(petState.activePet);
    if (!info) return;

    var frameCount = info.frames || 1;
    var fw = info.frameWidth || 48;

    // Each frame in the strip is an evolution level, not an animation frame
    // Clamp to maxLevel from sprite data (prevents blank frames on 2EVO/Uniques)
    var maxLevel = info.maxLevel || frameCount;
    var frameOffset = info.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + (pet.level || 1) - 1, frameCount - 1);

    // Create or reuse sprite image div
    var imgEl = spriteEl.querySelector('.pet-sprite-img');
    if (!imgEl) {
      // Remove any old box-shadow canvas
      var oldCanvas = spriteEl.querySelector('.pet-pixel-canvas');
      if (oldCanvas) oldCanvas.remove();

      imgEl = document.createElement('div');
      imgEl.className = 'pet-sprite-img';
      imgEl.style.width = SPRITE_DISPLAY_SIZE + 'px';
      imgEl.style.height = SPRITE_DISPLAY_SIZE + 'px';
      imgEl.style.backgroundImage = 'url(' + info.sheet + ')';
      imgEl.style.backgroundSize = (fw * frameCount) + 'px ' + info.frameHeight + 'px';
      imgEl.style.imageRendering = 'pixelated';
      spriteEl.appendChild(imgEl);
    }

    // Update background-image if pet changed
    if (imgEl.getAttribute('data-pet') !== petState.activePet) {
      imgEl.style.backgroundImage = 'url(' + info.sheet + ')';
      imgEl.style.backgroundSize = (fw * frameCount) + 'px ' + info.frameHeight + 'px';
      imgEl.setAttribute('data-pet', petState.activePet);
    }

    imgEl.style.backgroundPosition = '-' + (frameIdx * fw) + 'px 0';
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
    return SPRITE_DISPLAY_SIZE;
  }

  function moveTo(x, y) {
    if (!container) return;

    // Dirt trail cosmetic: spawn particles at previous position
    if (window.FarmAPI && window.FarmAPI.getCosmetics) {
      var cos = window.FarmAPI.getCosmetics();
      if (cos.dirtTrail && Math.abs(x - currentX) + Math.abs(y - currentY) > 5) {
        spawnDirtParticle(currentX, currentY);
      }
    }

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

  function spawnDirtParticle(px, py) {
    for (var i = 0; i < 2; i++) {
      var dot = document.createElement('div');
      dot.className = 'pet-dirt-particle';
      dot.style.left = (px + 20 + Math.random() * 10) + 'px';
      dot.style.top = (py + 40 + Math.random() * 6) + 'px';
      document.body.appendChild(dot);
      (function (el) {
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 800);
      })(dot);
    }
  }

  function followCursor() {
    if (isDragging || isFlung || isMobile || isBeamed) return;
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

    // Cancel farming sequence if active
    if (isFarming && farmingCancelCb) {
      farmingCancelCb();
      isFarming = false;
      farmingCancelCb = null;
    }

    // If beamed to farm, ignore clicks (pet is hidden)
    if (isBeamed) return;

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

    // Check teleporter collision (padded hitbox)
    if (dockEl && !isBeamed && !isBeaming) {
      var size = getSpriteSize();
      var petCenterX = currentX + size / 2;
      var petCenterY = currentY + size / 2;
      var dockRect = dockEl.getBoundingClientRect();
      var dockPad = 20;
      if (petCenterX >= dockRect.left - dockPad && petCenterX <= dockRect.right + dockPad &&
          petCenterY >= dockRect.top - dockPad && petCenterY <= dockRect.bottom + dockPad) {
        beamIn();
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
    if (isDragging || isFlung || isBeamed) return;

    var target = e.target;
    if (container && container.contains(target)) return;
    if (dockEl && dockEl.contains(target)) return;
    if (target.closest && target.closest('a, button, input, textarea, select, .fp-cell-built, .fp-popup, .td-game-area')) return;

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

  // ── Teleporter ─────────────────────────────────────────
  function createTeleporter() {
    if (dockEl) dockEl.remove();

    dockEl = document.createElement('div');
    dockEl.className = 'pet-teleporter';
    var pad = document.createElement('div');
    pad.className = 'pet-teleporter-pad';
    dockEl.appendChild(pad);
    dockEl.addEventListener('click', onTeleporterClick);
    document.body.appendChild(dockEl);
  }

  function onTeleporterClick(e) {
    e.stopPropagation();
    if (isBeaming) return;
    if (isBeamed) {
      beamOut();
    } else if (!isDragging) {
      beamIn();
    }
  }

  // ── Beam In (page → farm) ──────────────────────────────
  function beamIn() {
    if (isBeaming || isBeamed || !container || !dockEl) return;
    isBeaming = true;

    // Cancel all interactions
    if (isFarming && farmingCancelCb) {
      farmingCancelCb();
      isFarming = false;
      farmingCancelCb = null;
    }
    isDragging = false;
    isFlung = false;
    if (flingTimer) cancelAnimationFrame(flingTimer);
    if (celebrateTimeout) { clearTimeout(celebrateTimeout); celebrateTimeout = null; }
    if (sadTimeout) { clearTimeout(sadTimeout); sadTimeout = null; }
    if (tapWalkTimer) { clearTimeout(tapWalkTimer); tapWalkTimer = null; }
    container.classList.remove('pet-dragging', 'pet-following', 'pet-farming-walk');
    setAnimState('idle');

    playBeamUp(currentX, currentY, function () {
      container.style.display = 'none';
      isBeamed = true;
      petState.position.beamed = true;
      savePetState();

      dockEl.classList.add('pet-teleporter-away');

      // Notify farm after short delay
      setTimeout(function () {
        if (window.FarmAPI && window.FarmAPI.beamArrived) {
          window.FarmAPI.beamArrived();
        }
        isBeaming = false;
      }, 200);
    });
  }

  // ── Beam Out (farm → page) ─────────────────────────────
  function beamOut() {
    if (isBeaming || !isBeamed || !container || !dockEl) return;
    isBeaming = true;

    var farmDeparting = window.FarmAPI && window.FarmAPI.beamDeparting;
    if (farmDeparting) {
      farmDeparting(function () {
        setTimeout(finishBeamOut, 200);
      });
    } else {
      finishBeamOut();
    }
  }

  function finishBeamOut() {
    // Calculate teleporter center for landing position
    var dockRect = dockEl.getBoundingClientRect();
    var size = getSpriteSize();
    var landX = Math.round(dockRect.left + (dockRect.width - size) / 2);
    var landY = Math.round(dockRect.top + (dockRect.height - size) / 2);

    playBeamDown(landX, landY, function () {
      moveTo(landX, landY);
      setAnimState('idle');
      isBeamed = false;
      petState.position.beamed = false;
      dockEl.classList.remove('pet-teleporter-away');

      petState.position.x = currentX;
      petState.position.y = currentY;
      savePetState();
      resetIdleTimer();
      isBeaming = false;
    });
  }

  // ── Beam-up effect ─────────────────────────────────────
  function playBeamUp(x, y, callback) {
    var size = getSpriteSize();
    var centerX = x + size / 2;

    // Create beam column
    var col = document.createElement('div');
    col.className = 'pet-beam-column';
    col.style.left = (centerX - 20) + 'px';
    col.style.top = (y - 80) + 'px';
    col.style.height = '120px';
    document.body.appendChild(col);

    // Beam-up animation on container
    container.classList.add('pet-beaming-up');

    // Spawn sparkles streaming upward
    for (var i = 0; i < 8; i++) {
      (function (delay) {
        setTimeout(function () {
          spawnBeamSparkle(centerX + (Math.random() - 0.5) * 20, y + size / 2, 'up');
        }, delay);
      })(i * 80);
    }

    setTimeout(function () {
      if (col.parentNode) col.parentNode.removeChild(col);
      container.classList.remove('pet-beaming-up');
      if (callback) callback();
    }, 1000);
  }

  // ── Beam-down effect ───────────────────────────────────
  function playBeamDown(x, y, callback) {
    var size = getSpriteSize();
    var centerX = x + size / 2;

    // Position container (still hidden)
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    currentX = x;
    currentY = y;

    // Show and animate
    container.style.display = '';
    container.classList.add('pet-beaming-down');

    // Create beam column
    var col = document.createElement('div');
    col.className = 'pet-beam-column';
    col.style.left = (centerX - 20) + 'px';
    col.style.top = (y - 80) + 'px';
    col.style.height = '120px';
    document.body.appendChild(col);

    // Burst sparkles radially at 400ms
    setTimeout(function () {
      for (var i = 0; i < 12; i++) {
        spawnBeamSparkle(centerX, y + size / 2, 'burst', i, 12);
      }
    }, 400);

    setTimeout(function () {
      if (col.parentNode) col.parentNode.removeChild(col);
      container.classList.remove('pet-beaming-down');
      if (callback) callback();
    }, 1000);
  }

  // ── Sparkle helper ─────────────────────────────────────
  function spawnBeamSparkle(x, y, type, index, total) {
    var sparkle = document.createElement('div');
    sparkle.className = 'pet-beam-sparkle';
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';

    if (type === 'up') {
      sparkle.style.setProperty('--beam-dx', Math.round((Math.random() - 0.5) * 20) + 'px');
      sparkle.style.setProperty('--beam-dy', Math.round(-40 - Math.random() * 20) + 'px');
    } else {
      // burst: radial
      var angle = ((index || 0) / (total || 12)) * Math.PI * 2;
      var dist = 25 + Math.random() * 20;
      sparkle.style.setProperty('--beam-dx', Math.round(Math.cos(angle) * dist) + 'px');
      sparkle.style.setProperty('--beam-dy', Math.round(Math.sin(angle) * dist) + 'px');
    }

    document.body.appendChild(sparkle);
    setTimeout(function () {
      if (sparkle.parentNode) sparkle.parentNode.removeChild(sparkle);
    }, 800);
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

  // ── Speech Bubbles (type-based) ─────────────────────
  var IDLE_MESSAGES = {
    fire: [
      '*smoke puff*', 'hoard... coins...', '*flaps tiny wings*',
      '*breathes small flame*', 'treasure?', '*scales shimmer*',
      'rawr!', '*guards wallet*', 'more gold!', '*naps on coins*'
    ],
    nature: [
      '*purrs*', '*stretches*', 'meow?', '*knocks things off table*',
      '*stares at nothing*', 'feed me.', '*grooming*', '*tail swish*',
      'I own this site.', '*yawn*'
    ],
    tech: [
      'BEEP BOOP', 'calculating...', 'odds: favorable',
      'processing...', '01101000 01101001', 'system nominal',
      'probability updated', '*whirrs*', 'data collected',
      'efficiency: optimal'
    ],
    aqua: [
      '*splish splash*', 'tides are turning', '*bubble*',
      'deep thoughts...', 'go with the flow', '*waves*',
      'water you doing?', '*drifts*', 'current: calm', 'salty air~'
    ],
    shadow: [
      '*lurks*', 'the shadows whisper', '*vanishes briefly*',
      'darkness falls...', 'boo.', '*creeps*',
      'fear the void', '*glowing eyes*', 'unseen...', 'from the dark'
    ],
    mystic: [
      '*sparkles*', 'the stars align', '*glows softly*',
      'magic in the air', 'foresight...', '*floats*',
      'enchanting~', '*crystal hum*', 'fate is kind', 'cosmic vibes'
    ]
  };

  var WIN_MESSAGES = {
    fire:   ['*victory roar*', 'to the hoard!', '*fire breath*', 'GOLD!'],
    nature: ['*happy purr*', 'lucky paws!', '*kneading*', 'more treats!'],
    tech:   ['WIN DETECTED', 'positive outcome', 'as calculated', '+1 to records'],
    aqua:   ['*happy splash*', 'tidal win!', 'the current favors us', 'washed in luck!'],
    shadow: ['*dark laugh*', 'from the shadows!', 'a shadowy gain', 'the void provides'],
    mystic: ['*radiant glow*', 'the stars aligned!', 'fortune smiles', 'magic!']
  };

  var LOSE_MESSAGES = {
    fire:   ['*sad smoke*', 'my hoard...', '*whimper*', 'revenge...'],
    nature: ['*hisses*', '*sad meow*', '*knocks glass off table*', 'unfair.'],
    tech:   ['ERROR: loss', 'recalculating...', 'variance detected', 'suboptimal'],
    aqua:   ['*drip*', 'washed away...', 'low tide...', 'all dried up'],
    shadow: ['*fades*', 'the darkness stings', 'shadow of doubt', 'cursed luck'],
    mystic: ['*dims*', 'stars misaligned', 'the fates are cruel', 'entropy...']
  };

  var CONTEXT_MESSAGES = {
    review: ['good book?', 'I prefer fish stories', 'read to me', '*sits on book*'],
    casino: ['feeling lucky?', 'bet big!', 'all in!', 'the house always loses'],
    chess: ['knight to fish 4', 'checkmate!', '*pushes pieces off board*', 'en passant!']
  };

  function speak(message) {
    // Delegate to mini pet when beamed to farm
    if (isBeamed && window.FarmAPI && window.FarmAPI.miniPetSpeak) {
      window.FarmAPI.miniPetSpeak(message);
      return;
    }
    if (!speechEl || !container || !isVisible) return;

    // Cancel any in-progress typewriter animation
    if (typewriterTimer) clearTimeout(typewriterTimer);
    if (speechTimer) clearTimeout(speechTimer);

    speechEl.textContent = '';
    speechEl.style.display = 'block';

    // Typewriter effect
    var i = 0;
    function typeNext() {
      if (i < message.length) {
        speechEl.textContent += message[i];
        i++;
        typewriterTimer = setTimeout(typeNext, 40);
      } else {
        typewriterTimer = null;
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
      var type = getCreatureType(petId) || 'nature';
      var messages = IDLE_MESSAGES[type] || IDLE_MESSAGES.nature;

      // Context-aware messages
      var path = window.location.pathname;
      if (path.indexOf('/reviews/') !== -1 || path === '/reviews/') {
        if (Math.random() < 0.4) messages = CONTEXT_MESSAGES.review;
      } else if (path.indexOf('/games/') !== -1) {
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
      var winType = getCreatureType(petState.activePet) || 'nature';
      var winMsgs = WIN_MESSAGES[winType] || WIN_MESSAGES.nature;
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
      var loseType = getCreatureType(petState.activePet) || 'nature';
      var loseMsgs = LOSE_MESSAGES[loseType] || LOSE_MESSAGES.nature;
      speak(randomMessage(loseMsgs));

      // Apply passive
      bonus = applyLosePassive(data);
    }

    savePetState();
    return bonus;
  }

  function celebrate() {
    // Delegate to mini pet when beamed to farm
    if (isBeamed && window.FarmAPI && window.FarmAPI.miniPetCelebrate) {
      window.FarmAPI.miniPetCelebrate();
      return;
    }
    setAnimState('celebrating');
    if (celebrateTimeout) clearTimeout(celebrateTimeout);
    celebrateTimeout = setTimeout(function () {
      if (currentAnim === 'celebrating') setAnimState('idle');
    }, 2000);
  }

  function showSad() {
    // Delegate to mini pet when beamed to farm
    if (isBeamed && window.FarmAPI && window.FarmAPI.miniPetSad) {
      window.FarmAPI.miniPetSad();
      return;
    }
    setAnimState('sad');
    if (sadTimeout) clearTimeout(sadTimeout);
    sadTimeout = setTimeout(function () {
      if (currentAnim === 'sad') setAnimState('idle');
    }, 3000);
  }

  // ── Passive Abilities (type-based) ──────────────────
  function applyWinPassive(data) {
    if (!petState || !petState.activePet) return null;

    var petId = petState.activePet;
    var pet = petState.pets[petId];
    var level = pet.level;
    var type = getCreatureType(petId);

    switch (type) {
      case 'fire': // Bonus coins on wins
        var chance = level === 1 ? 0.05 : level === 2 ? 0.10 : 0.15;
        var pct = level === 1 ? 0.10 : level === 2 ? 0.15 : 0.20;
        if (Math.random() < chance) {
          var bonus = Math.max(1, Math.floor(data.bet * pct));
          Wallet.add(bonus);
          speak("Dragon's Hoard! +" + bonus);
          return { type: 'fire_hoard', amount: bonus };
        }
        break;

      case 'tech': // Periodic recovery per N hands
        var interval = level === 1 ? 10 : level === 2 ? 8 : 5;
        var recoveryPct = level === 1 ? 0.30 : level === 2 ? 0.40 : 0.50;
        if (pet.gamesWatched % interval === 0) {
          var recovery = Math.max(1, Math.floor(data.bet * recoveryPct));
          Wallet.add(recovery);
          speak('Insurance: +' + recovery);
          return { type: 'tech_core', amount: recovery };
        }
        break;

      case 'shadow': // Bonus fling coins (win context: small bonus)
        if (Math.random() < 0.10 * level) {
          var shadowBonus = Math.max(1, Math.floor(data.bet * 0.05 * level));
          Wallet.add(shadowBonus);
          speak('Shadow Stash! +' + shadowBonus);
          return { type: 'shadow_stash', amount: shadowBonus };
        }
        break;

      case 'mystic': // Random bonus roll
        if (Math.random() < 0.08 * level) {
          var mysticBonus = Math.max(1, Math.floor(data.bet * (0.05 + Math.random() * 0.20)));
          Wallet.add(mysticBonus);
          speak('Arcane Luck! +' + mysticBonus);
          return { type: 'mystic_luck', amount: mysticBonus };
        }
        break;
    }

    return null;
  }

  function applyLosePassive(data) {
    if (!petState || !petState.activePet) return null;

    var petId = petState.activePet;
    var pet = petState.pets[petId];
    var level = pet.level;
    var streak = petState.milestones.currentLoseStreak;
    var type = getCreatureType(petId);

    switch (type) {
      case 'nature': // Refund on loss streaks
        var threshold = level >= 3 ? 2 : 3;
        var refundPct = level === 1 ? 0.25 : level === 2 ? 0.40 : 0.50;
        if (streak >= threshold) {
          var refund = Math.max(1, Math.floor(data.bet * refundPct));
          Wallet.add(refund);
          speak('Lucky Paws! +' + refund);
          return { type: 'nature_paws', amount: refund };
        }
        break;

      case 'aqua': // Refund on loss streaks (variant: smaller threshold, smaller refund)
        var aquaThreshold = level >= 2 ? 2 : 3;
        var aquaPct = level === 1 ? 0.20 : level === 2 ? 0.30 : 0.40;
        if (streak >= aquaThreshold) {
          var aquaRefund = Math.max(1, Math.floor(data.bet * aquaPct));
          Wallet.add(aquaRefund);
          speak('Tidal Grace! +' + aquaRefund);
          return { type: 'aqua_grace', amount: aquaRefund };
        }
        break;

      case 'tech': // Probability Core also triggers on losses
        var interval = level === 1 ? 10 : level === 2 ? 8 : 5;
        var recoveryPct = level === 1 ? 0.30 : level === 2 ? 0.40 : 0.50;
        if (pet.gamesWatched % interval === 0) {
          var recovery = Math.max(1, Math.floor(data.bet * recoveryPct));
          Wallet.add(recovery);
          speak('Insurance: +' + recovery);
          return { type: 'tech_core', amount: recovery };
        }
        break;

      case 'mystic': // Random bonus roll on loss
        if (Math.random() < 0.06 * level) {
          var mysticRefund = Math.max(1, Math.floor(data.bet * (0.10 + Math.random() * 0.15)));
          Wallet.add(mysticRefund);
          speak('Arcane Luck! +' + mysticRefund);
          return { type: 'mystic_luck', amount: mysticRefund };
        }
        break;
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

    // Create teleporter
    createTeleporter();

    // Position
    isMobile = window.innerWidth <= MOBILE_BREAK;

    if (isMobile && petState.position.x !== null) {
      moveTo(petState.position.x, petState.position.y);
    } else if (isMobile) {
      moveTo(window.innerWidth - getSpriteSize() - 10, window.innerHeight - getSpriteSize() - 10);
    } else {
      moveTo(window.innerWidth / 2, window.innerHeight - getSpriteSize() - 20);
    }

    // Restore beamed state
    if (petState.position.beamed) {
      container.style.display = 'none';
      isBeamed = true;
      dockEl.classList.add('pet-teleporter-away');
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
      container.style.display = isVisible && !isBeamed ? '' : 'none';
    }
    if (dockEl) {
      dockEl.style.display = isVisible ? '' : 'none';
    }
  }

  // ── Init ────────────────────────────────────────────
  function init() {
    petState = loadPetState();

    // Load catalog first, then sprites
    loadCatalog(function () {
      // Migrate legacy pet IDs
      if (catalog) {
        petState = migratePetState(petState);
        savePetState();
      }

      // Always load sprite data (needed for shop previews even without a pet)
      loadSpriteData(function () {
        if (!petState.activePet || !petState.pets[petState.activePet]) {
          // No pet yet — expose API but don't render
          exposeAPI();
          return;
        }

        isVisible = petState.visible;
        createPetDOM();
        if (!isVisible && container) {
          container.style.display = 'none';
        }
        exposeAPI();
      });
    });
  }

  function exposeAPI() {
    // Expose catalog globally
    window.PetCatalog = catalog;

    // Global API for game integration
    window.PetEvents = {
      onGameResult: handleGameResult
    };

    // API for shop sprite previews
    window.PetSprites = {
      renderPreview: function (petId, level) {
        var info = getSpriteInfo(petId);
        if (!info) return null;
        var fw = info.frameWidth || 48;
        // Clamp level to maxLevel from spriteData
        var frameOffset = info.frameOffset || 0;
        var frameIdx = Math.min(frameOffset + (level || 1) - 1, (info.frames || 3) - 1);
        var el = document.createElement('div');
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.backgroundImage = 'url(' + info.sheet + ')';
        el.style.backgroundSize = (fw * info.frames) + 'px ' + info.frameHeight + 'px';
        el.style.backgroundPosition = '-' + (frameIdx * fw) + 'px 0';
        el.style.imageRendering = 'pixelated';
        return el;
      }
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
          // Re-render farm mini pet if beamed so accessories update there too
          if (isBeamed && window.FarmAPI && window.FarmAPI.beamArrived) {
            window.FarmAPI.beamArrived();
          }
        } else if (container) {
          container.remove();
          container = null;
          if (dockEl) { dockEl.remove(); dockEl = null; }
          isBeamed = false;
          isBeaming = false;
        }
      },
      spawnNew: function () {
        petState = loadPetState();
        if (!petState.activePet || !petState.pets[petState.activePet]) return;

        // If old pet was beamed to farm, remove it from there
        if (isBeamed || petState.position.beamed) {
          isBeamed = false;
          isBeaming = false;
          if (window.FarmAPI && window.FarmAPI.beamDeparting) {
            window.FarmAPI.beamDeparting();
          }
        }

        // Force center-screen position for dramatic entrance
        petState.position.x = null;
        petState.position.y = null;
        petState.position.docked = false;
        petState.position.beamed = false;

        loadSpriteData(function () {
          createPetDOM();

          // Override position to center of viewport
          var size = getSpriteSize();
          var cx = Math.round(window.innerWidth / 2 - size / 2);
          var cy = Math.round(window.innerHeight / 2 - size / 2);
          moveTo(cx, cy);

          // Add spawn animation class
          container.classList.add('pet-spawning');

          // Glow ring
          var glow = document.createElement('div');
          glow.className = 'pet-spawn-glow';
          container.appendChild(glow);

          // Burst sparkle particles
          for (var i = 0; i < 12; i++) {
            var angle = (i / 12) * Math.PI * 2;
            var dist = 30 + Math.random() * 40;
            var sparkle = document.createElement('div');
            sparkle.className = 'pet-spawn-sparkle';
            sparkle.style.left = (cx + size / 2) + 'px';
            sparkle.style.top = (cy + size / 2) + 'px';
            sparkle.style.setProperty('--sx', Math.round(Math.cos(angle) * dist) + 'px');
            sparkle.style.setProperty('--sy', Math.round(Math.sin(angle) * dist) + 'px');
            sparkle.style.animationDelay = (Math.random() * 0.2) + 's';
            document.body.appendChild(sparkle);
            (function (el) {
              setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
              }, 1000);
            })(sparkle);
          }

          // Clean up after animation
          setTimeout(function () {
            if (container) {
              container.classList.remove('pet-spawning');
              var g = container.querySelector('.pet-spawn-glow');
              if (g) g.remove();
            }

            // Greeting speech (type-based)
            var greetings = {
              fire: '*materializes* RAWR!',
              nature: '*appears* ...meow?',
              tech: 'BOOT SEQUENCE COMPLETE',
              aqua: '*bubbles up* ...splash!',
              shadow: '*emerges from darkness*',
              mystic: '*sparkles into existence*'
            };
            var spawnType = getCreatureType(petState.activePet) || 'nature';
            speak(greetings[spawnType] || 'hello!');
          }, 900);
        });
      },

      toggle: toggleVisibility,
      celebrate: celebrate,
      showSad: showSad,
      speak: speak,
      getCreatureType: getCreatureType,
      getCreatureInfo: getCreatureInfo,

      getState: function () {
        if (!petState || !petState.activePet) return null;
        var pet = petState.pets[petState.activePet];
        if (!pet) return null;
        return {
          petId: petState.activePet,
          level: pet.level,
          anim: currentAnim,
          isBeamed: isBeamed,
          isDragging: isDragging,
          isFlung: isFlung,
          isVisible: isVisible,
          x: currentX,
          y: currentY
        };
      },

      walkTo: function (x, y, callback) {
        if (!container || isDragging || isFlung || !isVisible || isBeamed) return false;
        if (currentAnim === 'celebrating' || currentAnim === 'sad') return false;

        setAnimState('walk');
        container.classList.add('pet-farming-walk');
        moveTo(x, y);

        setTimeout(function () {
          container.classList.remove('pet-farming-walk');
          setAnimState('idle');
          if (callback) callback(false);
        }, 850);

        return true;
      },

      returnToPosition: function () {
        if (!container) return;
        setAnimState('idle');
        container.classList.remove('pet-farming-walk');
        resetIdleTimer();
      },

      isBusy: function () {
        return isDragging || isFlung || !isVisible || isBeamed ||
               currentAnim === 'celebrating' || currentAnim === 'sad';
      },

      setFarming: function (active, cancelCb) {
        isFarming = active;
        farmingCancelCb = active ? cancelCb : null;
      },

      resetIdleTimer: resetIdleTimer,

      beamToFarm: function () { if (!isBeamed && !isBeaming) beamIn(); },
      beamToPage: function () { if (isBeamed && !isBeaming) beamOut(); },
      isBeamed: function () { return isBeamed; },

      renderMiniSprite: function (containerEl, scale) {
        if (!containerEl || !spriteData || !petState || !petState.activePet) return;
        var pet = petState.pets[petState.activePet];
        if (!pet) return;

        var info = getSpriteInfo(petState.activePet);
        if (!info) return;

        containerEl.innerHTML = '';
        var fw = info.frameWidth || 48;
        var fh = info.frameHeight || 48;
        var frames = info.frames || 3;
        // scale param: 2 = 32px display, 3 = 48px (1:1). Ratio from old 16px * scale.
        var displaySize = 16 * (scale || 2);
        var ratio = displaySize / fw;

        var imgEl = document.createElement('div');
        imgEl.className = 'pet-sprite-img';
        imgEl.style.width = displaySize + 'px';
        imgEl.style.height = displaySize + 'px';
        imgEl.style.backgroundImage = 'url(' + info.sheet + ')';
        imgEl.style.backgroundSize = (fw * frames * ratio) + 'px ' + (fh * ratio) + 'px';
        var frameOffset = info.frameOffset || 0;
        var frameIdx = Math.min(frameOffset + (pet.level || 1) - 1, frames - 1);
        imgEl.style.backgroundPosition = '-' + (frameIdx * displaySize) + 'px 0';
        imgEl.style.imageRendering = 'pixelated';
        imgEl.style.position = 'absolute';
        imgEl.style.top = '0';
        imgEl.style.left = '0';

        containerEl.style.width = displaySize + 'px';
        containerEl.style.height = displaySize + 'px';
        containerEl.style.position = 'relative';
        containerEl.appendChild(imgEl);
      }
    };
  }

  init();
})();
