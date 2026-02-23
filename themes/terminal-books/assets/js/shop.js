(function () {
  'use strict';

  var PET_STORAGE_KEY = 'arebooksgood-pet';
  var SHOP_STORAGE_KEY = 'arebooksgood-shop';
  var PITY_KEY = 'arebooksgood-pity';

  // ── Catalog (loaded async) ─────────────────────────
  var catalog = null;
  var spriteData = null;

  // ── DOM refs (only grab elements that exist on current page) ──
  var dom = {
    balance: document.getElementById('shop-balance'),
    pets: document.getElementById('shop-pets'),
    activePetSection: document.getElementById('shop-active-pet'),
    activePetInfo: document.getElementById('shop-active-pet-info'),
    evolutionSection: document.getElementById('shop-evolution-section'),
    evolution: document.getElementById('shop-evolution'),
    accessoriesSection: document.getElementById('shop-accessories-section'),
    accessories: document.getElementById('shop-accessories'),
    collectionSection: document.getElementById('shop-collection-section'),
    collection: document.getElementById('shop-collection')
  };

  // Bail if no shop elements exist on this page
  if (!dom.pets && !dom.evolution && !dom.collection) return;

  // ── Pet State ───────────────────────────────────────
  function defaultPetState() {
    return {
      activePet: null,
      pets: {},
      accessories: { owned: [], equipped: { head: null, body: null } },
      position: { x: null, y: null },
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
        if (saved.position) state.position = saved.position;
        if (typeof saved.visible === 'boolean') state.visible = saved.visible;
        if (saved.milestones) {
          for (var k in state.milestones) {
            if (saved.milestones.hasOwnProperty(k)) {
              state.milestones[k] = saved.milestones[k];
            }
          }
        }
        if (saved._migrated) state._migrated = true;
        if (saved.unlockedSkins) state.unlockedSkins = saved.unlockedSkins;
        return state;
      }
    } catch (e) {}
    return defaultPetState();
  }

  function savePetState(state) {
    try {
      localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // ── Shop State ──────────────────────────────────────
  function defaultShopState() {
    return { purchases: [], totalShopSpent: 0 };
  }

  function loadShopState() {
    try {
      var raw = localStorage.getItem(SHOP_STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        return {
          purchases: saved.purchases || [],
          totalShopSpent: saved.totalShopSpent || 0
        };
      }
    } catch (e) {}
    return defaultShopState();
  }

  function saveShopState(shop) {
    try {
      localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(shop));
    } catch (e) {}
  }

  // ── Pity State ──────────────────────────────────────
  function loadPityState() {
    try {
      var raw = localStorage.getItem(PITY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { common: 0, rare: 0, legendary: 0 };
  }

  function savePityState(pity) {
    try {
      localStorage.setItem(PITY_KEY, JSON.stringify(pity));
    } catch (e) {}
  }

  // ── State ───────────────────────────────────────────
  var petState = loadPetState();
  var shopState = loadShopState();
  var pityState = loadPityState();

  // ── Accessories catalog (kept inline) ───────────────
  var ACCESSORIES = {
    tophat:   { name: 'Top Hat',    slot: 'head', cost: 200 },
    crown:    { name: 'Crown',      slot: 'head', cost: 500 },
    monocle:  { name: 'Monocle',    slot: 'head', cost: 300 },
    bowtie:   { name: 'Bow Tie',    slot: 'body', cost: 150 },
    cape:     { name: 'Cape',       slot: 'body', cost: 400 },
    partyhat:  { name: 'Party Hat',  slot: 'head', cost: 100 },
    farmerhat: { name: 'Farmer Hat', slot: 'head', cost: 0, silkRoadOnly: true }
  };

  // ── Helpers ─────────────────────────────────────────
  function ownsPet(id) {
    return petState.pets.hasOwnProperty(id);
  }

  function ownsAccessory(id) {
    return petState.accessories.owned.indexOf(id) !== -1;
  }

  function hasAnyPet() {
    for (var k in petState.pets) {
      if (petState.pets.hasOwnProperty(k)) return true;
    }
    return false;
  }

  function getCreaturesByTier(tier) {
    if (!catalog || !catalog.creatures) return [];
    var result = [];
    for (var id in catalog.creatures) {
      if (catalog.creatures.hasOwnProperty(id) && catalog.creatures[id].tier === tier) {
        result.push(id);
      }
    }
    return result;
  }

  function countOwnedInTier(tier) {
    var creatures = getCreaturesByTier(tier);
    var count = 0;
    for (var i = 0; i < creatures.length; i++) {
      if (ownsPet(creatures[i])) count++;
    }
    return count;
  }

  function getSpriteInfo(petId) {
    if (!spriteData) return null;
    // Resolve spriteId from catalog
    var spriteId = petId;
    if (catalog && catalog.creatures && catalog.creatures[petId]) {
      spriteId = catalog.creatures[petId].spriteId || petId;
    }
    return spriteData[spriteId] || null;
  }

  function renderSpritePreview(petId, level, skin) {
    var info = getSpriteInfo(petId);
    if (!info) return null;
    var fw = info.frameWidth || 48;
    var frameOffset = info.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + (level || 1) - 1, (info.frames || 1) - 1);
    var sheetUrl = (skin === 'alt' && info.altSheet) ? info.altSheet : info.sheet;
    var el = document.createElement('div');
    el.style.width = '48px';
    el.style.height = '48px';
    el.style.backgroundImage = 'url(' + sheetUrl + ')';
    el.style.backgroundSize = (fw * info.frames) + 'px ' + info.frameHeight + 'px';
    el.style.backgroundPosition = '-' + (frameIdx * fw) + 'px 0';
    el.style.imageRendering = 'pixelated';
    return el;
  }

  // ── Purchase Actions ────────────────────────────────
  function activatePet(id) {
    if (!ownsPet(id)) return;
    petState.activePet = id;
    savePetState(petState);
    renderAll();

    if (window.PetSystem && window.PetSystem.spawnNew) {
      window.PetSystem.spawnNew();
    } else if (window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }
  }

  function buyAccessory(id) {
    var info = ACCESSORIES[id];
    if (!info || ownsAccessory(id)) return;
    if (Wallet.getBalance() < info.cost) return;

    Wallet.deduct(info.cost);
    petState.accessories.owned.push(id);
    savePetState(petState);

    shopState.purchases.push({ id: id, type: 'accessory', cost: info.cost, timestamp: Date.now() });
    shopState.totalShopSpent += info.cost;
    saveShopState(shopState);

    renderAll();
  }

  function equipAccessory(id) {
    var info = ACCESSORIES[id];
    if (!info || !ownsAccessory(id)) return;
    var slot = info.slot;
    if (petState.accessories.equipped[slot] === id) {
      petState.accessories.equipped[slot] = null;
    } else {
      petState.accessories.equipped[slot] = id;
    }
    savePetState(petState);
    renderAll();

    if (window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }
  }

  function evolvePet(id) {
    if (!ownsPet(id) || !catalog) return;
    var pet = petState.pets[id];
    var creature = catalog.creatures[id];
    if (!creature) return;

    var oldLevel = pet.level;
    var nextLevel = pet.level + 1;
    if (nextLevel > creature.maxLevel) return;

    var req = catalog.evolution[String(nextLevel)];
    if (!req) return;
    if (Wallet.getBalance() < req.coinCost) return;
    if ((pet.mergeXP || 0) < req.xpRequired) return;

    Wallet.deduct(req.coinCost);
    pet.level = nextLevel;
    savePetState(petState);

    shopState.purchases.push({ id: id + '-lvl' + nextLevel, type: 'evolution', cost: req.coinCost, timestamp: Date.now() });
    shopState.totalShopSpent += req.coinCost;
    saveShopState(shopState);

    playEvolveAnimation(id, oldLevel, nextLevel, function () {
      renderAll();
      if (window.PetSystem && window.PetSystem.reload) {
        window.PetSystem.reload();
      }
    });
  }

  // ── Evolution Animation ─────────────────────────────
  function playEvolveAnimation(id, oldLevel, newLevel, callback) {
    var creature = catalog.creatures[id];
    if (!creature) { if (callback) callback(); return; }

    var pet = petState.pets[id];
    var skin = pet ? (pet.skin || 'default') : 'default';
    var isMaxLevel = newLevel >= creature.maxLevel;

    var overlay = document.createElement('div');
    overlay.className = 'evo-overlay' + (isMaxLevel ? ' evo-overlay-gold' : '');

    var stage = document.createElement('div');
    stage.className = 'evo-stage';

    // Old-form sprite at 2x
    var oldWrap = document.createElement('div');
    oldWrap.className = 'evo-creature-old';
    var oldSpr = renderSpritePreview(id, oldLevel, skin);
    if (oldSpr) {
      oldSpr.style.transform = 'scale(2)';
      oldSpr.style.transformOrigin = 'center';
      oldWrap.appendChild(oldSpr);
    }
    stage.appendChild(oldWrap);

    // Gather particles (fly inward toward center)
    var gatherCount = 16;
    for (var i = 0; i < gatherCount; i++) {
      var gp = document.createElement('div');
      gp.className = 'evo-particle evo-particle-gather';
      var angle = (i / gatherCount) * Math.PI * 2;
      var dist = 60 + Math.random() * 40;
      gp.style.setProperty('--hx', Math.round(Math.cos(angle) * dist) + 'px');
      gp.style.setProperty('--hy', Math.round(Math.sin(angle) * dist) + 'px');
      gp.style.left = '50%';
      gp.style.top = '50%';
      gp.style.animationDelay = (0.3 + Math.random() * 0.5) + 's';
      stage.appendChild(gp);
    }

    // Flash element
    var flashEl = document.createElement('div');
    flashEl.className = 'evo-flash-el';
    flashEl.style.animationDelay = '1.4s';
    flashEl.style.opacity = '0';
    stage.appendChild(flashEl);

    // VFX burst (reuse battle_vfx.png)
    var vfx = document.createElement('div');
    vfx.className = 'evo-vfx';
    vfx.style.animationDelay = '1.4s';
    stage.appendChild(vfx);

    // New-form sprite at 2x (emerges after flash)
    var newWrap = document.createElement('div');
    newWrap.className = 'evo-creature-new';
    var newSpr = renderSpritePreview(id, newLevel, skin);
    if (newSpr) {
      newSpr.style.transform = 'scale(2)';
      newSpr.style.transformOrigin = 'center';
      newWrap.appendChild(newSpr);
    }
    // Sparkle overlay for max-level
    if (isMaxLevel) {
      var sparkle = document.createElement('div');
      sparkle.className = 'evo-sparkle';
      newWrap.appendChild(sparkle);
    }
    stage.appendChild(newWrap);

    // Burst particles (fly outward after new form)
    var burstCount = isMaxLevel ? 24 : 14;
    for (var j = 0; j < burstCount; j++) {
      var bp = document.createElement('div');
      bp.className = 'evo-particle evo-particle-burst';
      if (isMaxLevel) {
        bp.style.background = '#ffd700';
        bp.style.boxShadow = '0 0 4px #ffd700';
      }
      var bAngle = (j / burstCount) * Math.PI * 2;
      var bDist = 50 + Math.random() * 40;
      bp.style.setProperty('--hx', Math.round(Math.cos(bAngle) * bDist) + 'px');
      bp.style.setProperty('--hy', Math.round(Math.sin(bAngle) * bDist) + 'px');
      bp.style.left = '50%';
      bp.style.top = '50%';
      bp.style.animationDelay = (1.7 + Math.random() * 0.3) + 's';
      stage.appendChild(bp);
    }

    // Level label
    var label = document.createElement('div');
    label.className = 'evo-label' + (isMaxLevel ? ' evo-label-gold' : '');
    label.textContent = 'Level ' + newLevel + (isMaxLevel ? ' MAX!' : '!');
    stage.appendChild(label);

    // Creature name
    var nameEl = document.createElement('div');
    nameEl.className = 'evo-name';
    nameEl.textContent = creature.name;
    stage.appendChild(nameEl);

    overlay.appendChild(stage);

    // Dismiss text
    var dismiss = document.createElement('div');
    dismiss.className = 'evo-dismiss';
    dismiss.textContent = '[click to continue]';
    overlay.appendChild(dismiss);

    document.body.appendChild(overlay);

    // Allow dismiss after reveal completes
    var dismissed = false;
    function onDismiss() {
      if (dismissed) return;
      dismissed = true;
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (callback) callback();
      }, 300);
    }

    setTimeout(function () {
      overlay.addEventListener('click', onDismiss);
    }, 2400);
  }

  // ── Gacha Egg System ───────────────────────────────
  function hatchEgg(tier) {
    if (!catalog) return;
    var eggDef = catalog.eggs[tier];
    if (!eggDef) return;

    // Check currency
    if (eggDef.currency === 'jb') {
      if (!window.JackBucks || window.JackBucks.getBalance() < eggDef.cost) return;
    } else {
      if (Wallet.getBalance() < eggDef.cost) return;
    }

    // Get pool
    var pool = getCreaturesByTier(tier === 'common' ? 'common' : tier === 'rare' ? 'rare' : 'legendary');
    if (pool.length === 0) return;

    // Pity system: guarantee new creature after N pulls without one
    var pityThreshold = tier === 'legendary' ? 5 : tier === 'rare' ? 8 : 6;
    var forceNew = pityState[tier] >= pityThreshold;

    // Roll creature
    var rolled;
    if (forceNew) {
      // Pick from unowned only
      var unowned = [];
      for (var i = 0; i < pool.length; i++) {
        if (!ownsPet(pool[i])) unowned.push(pool[i]);
      }
      if (unowned.length > 0) {
        rolled = unowned[Math.floor(Math.random() * unowned.length)];
      } else {
        rolled = pool[Math.floor(Math.random() * pool.length)];
      }
    } else {
      rolled = pool[Math.floor(Math.random() * pool.length)];
    }

    // Deduct currency
    if (eggDef.currency === 'jb') {
      window.JackBucks.deduct(eggDef.cost);
    } else {
      Wallet.deduct(eggDef.cost);
    }

    var isDuplicate = ownsPet(rolled);
    var mergeXP = eggDef.dupMergeXP || 0;

    if (isDuplicate) {
      // Duplicate: add merge XP
      petState.pets[rolled].mergeXP = (petState.pets[rolled].mergeXP || 0) + mergeXP;
      // Legendary dupe refund at max level
      if (tier === 'legendary' && petState.pets[rolled].level >= (catalog.creatures[rolled].maxLevel || 1)) {
        var refund = eggDef.dupRefund || 0;
        if (refund > 0) Wallet.add(refund);
      }
      pityState[tier]++;
    } else {
      // New creature
      petState.pets[rolled] = {
        level: 1, mood: 'happy', totalWins: 0, totalLosses: 0,
        gamesWatched: 0, flingCount: 0, acquired: Date.now(), mergeXP: 0
      };
      if (!petState.activePet) {
        petState.activePet = rolled;
      }
      pityState[tier] = 0; // Reset pity counter
    }

    savePetState(petState);
    savePityState(pityState);

    shopState.purchases.push({ id: rolled, type: 'egg-' + tier, cost: eggDef.cost, timestamp: Date.now() });
    shopState.totalShopSpent += (eggDef.currency === 'coins' ? eggDef.cost : 0);
    saveShopState(shopState);

    // Play hatching animation
    var dupTargetId = isDuplicate ? rolled : null;
    playHatchAnimation(rolled, isDuplicate, mergeXP, tier, function () {
      renderAll();
      // Flash the owned card on duplicate
      if (dupTargetId) {
        var dupCard = document.querySelector('.shop-owned-card[data-pet-id="' + dupTargetId + '"]');
        if (dupCard) {
          dupCard.classList.add('shop-owned-flash');
          setTimeout(function () { dupCard.classList.remove('shop-owned-flash'); }, 1200);
        }
      }
      // Spawn pet if first one or new
      if (!isDuplicate && petState.activePet === rolled) {
        if (window.PetSystem && window.PetSystem.spawnNew) {
          window.PetSystem.spawnNew();
        } else if (window.PetSystem && window.PetSystem.reload) {
          window.PetSystem.reload();
        }
      }
    });
  }

  // ── Hatching Animation ─────────────────────────────
  function playHatchAnimation(creatureId, isDuplicate, mergeXP, tier, callback) {
    var creature = catalog.creatures[creatureId];
    if (!creature) { if (callback) callback(); return; }

    var overlay = document.createElement('div');
    overlay.className = 'hatch-overlay hatch-overlay-' + tier;

    var stage = document.createElement('div');
    stage.className = 'hatch-stage';

    // Focal area — fixed size container where egg/creature/VFX overlap at center
    var focal = document.createElement('div');
    focal.className = 'hatch-focal';

    // Egg sprite with colour cycle animation
    var eggEl = document.createElement('div');
    eggEl.className = 'hatch-egg-sprite hatch-egg-sprite-' + tier;
    focal.appendChild(eggEl);

    // VFX burst effect on crack
    var crack = document.createElement('div');
    crack.className = 'hatch-vfx hatch-vfx-' + tier;
    focal.appendChild(crack);

    // Particles (tier-dependent count)
    var particleCount = tier === 'legendary' ? 24 : tier === 'rare' ? 18 : 12;
    for (var i = 0; i < particleCount; i++) {
      var p = document.createElement('div');
      p.className = 'hatch-particle';
      if (tier === 'legendary') {
        p.style.background = '#ffd700';
        p.style.boxShadow = '0 0 4px #ffd700';
      } else if (tier === 'rare') {
        p.style.boxShadow = '0 0 4px var(--accent)';
      }
      var angle = (i / particleCount) * Math.PI * 2;
      var dist = 40 + Math.random() * 30;
      p.style.setProperty('--hx', Math.round(Math.cos(angle) * dist) + 'px');
      p.style.setProperty('--hy', Math.round(Math.sin(angle) * dist) + 'px');
      p.style.left = '50%';
      p.style.top = '50%';
      p.style.animationDelay = (1.5 + Math.random() * 0.3) + 's';
      focal.appendChild(p);
    }

    // Rare: expanding ring waves from crack point
    if (tier === 'rare') {
      for (var ri = 0; ri < 3; ri++) {
        var ring = document.createElement('div');
        ring.className = 'hatch-rare-ring';
        ring.style.animationDelay = (1.4 + ri * 0.25) + 's';
        focal.appendChild(ring);
      }
    }

    // Creature sprite — emerges from the crack
    var creatureWrap = document.createElement('div');
    creatureWrap.className = 'hatch-creature';
    var spritePreview = renderSpritePreview(creatureId, 1);
    if (spritePreview) {
      spritePreview.style.transform = 'scale(2)';
      spritePreview.style.transformOrigin = 'center';
      creatureWrap.appendChild(spritePreview);
    }
    focal.appendChild(creatureWrap);

    // Sparkle overlay for legendary
    if (tier === 'legendary') {
      var sparkle = document.createElement('div');
      sparkle.className = 'hatch-sparkle';
      creatureWrap.appendChild(sparkle);
    }

    // Shimmer overlay for rare
    if (tier === 'rare') {
      var shimmer = document.createElement('div');
      shimmer.className = 'hatch-rare-shimmer';
      creatureWrap.appendChild(shimmer);
    }

    stage.appendChild(focal);

    // Info panel (name, badge, label) — fades in after creature
    var reveal = document.createElement('div');
    reveal.className = 'hatch-reveal';

    var nameEl = document.createElement('div');
    nameEl.className = 'hatch-name';
    nameEl.textContent = creature.name;
    reveal.appendChild(nameEl);

    var badge = document.createElement('div');
    badge.className = 'hatch-badge hatch-badge-' + creature.type;
    badge.textContent = creature.type;
    reveal.appendChild(badge);

    var tierEl = document.createElement('div');
    tierEl.className = 'hatch-tier hatch-tier-' + tier;
    tierEl.textContent = tier;
    reveal.appendChild(tierEl);

    var label = document.createElement('div');
    if (isDuplicate) {
      label.className = 'hatch-label hatch-label-dup';
      label.textContent = 'DUPLICATE +' + mergeXP + ' XP';
    } else {
      label.className = 'hatch-label hatch-label-new';
      label.textContent = 'NEW!';
    }
    reveal.appendChild(label);

    stage.appendChild(reveal);
    overlay.appendChild(stage);

    // Dismiss
    var dismiss = document.createElement('div');
    dismiss.className = 'hatch-dismiss';
    dismiss.textContent = '[click to continue]';
    overlay.appendChild(dismiss);

    document.body.appendChild(overlay);

    // Hide egg after animation, creature emerges via CSS
    var eggHideDelay = tier === 'legendary' ? 2000 : tier === 'rare' ? 1800 : 1600;
    setTimeout(function () {
      eggEl.style.display = 'none';
    }, eggHideDelay);

    // Allow dismiss after reveal
    var dismissed = false;
    function onDismiss() {
      if (dismissed) return;
      dismissed = true;
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (callback) callback();
      }, 300);
    }

    var dismissDelay = tier === 'legendary' ? 3000 : tier === 'rare' ? 2600 : 2200;
    setTimeout(function () {
      overlay.addEventListener('click', onDismiss);
    }, dismissDelay);
  }

  // ── Rendering ───────────────────────────────────────
  function renderBalance() {
    if (!dom.balance) return;
    var text = Wallet.getBalance() + ' coins';
    if (window.JackBucks && window.JackBucks.getBalance) {
      text += ' | ' + window.JackBucks.getBalance() + ' JB';
    }
    dom.balance.textContent = text;
  }

  function renderEggs() {
    if (!dom.pets) return;
    dom.pets.innerHTML = '';
    if (!catalog) return;

    var tiers = [
      { key: 'common',    label: 'Common Egg',    emoji: '🥚', tierKey: 'common' },
      { key: 'rare',      label: 'Rare Egg',      emoji: '🔮', tierKey: 'rare' },
      { key: 'legendary', label: 'Legendary Egg',  emoji: '⭐', tierKey: 'legendary' }
    ];

    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      var eggDef = catalog.eggs[t.key];
      if (!eggDef) continue;

      var pool = getCreaturesByTier(t.tierKey);
      var owned = countOwnedInTier(t.tierKey);

      var card = document.createElement('div');
      card.className = 'shop-card shop-egg-card';

      // Egg visual (sprite from items.png)
      var vis = document.createElement('div');
      vis.className = 'shop-card-preview shop-egg-preview';
      var sprEl = document.createElement('div');
      sprEl.className = 'egg-sprite egg-sprite-' + t.key;
      vis.appendChild(sprEl);
      card.appendChild(vis);

      // Name
      var name = document.createElement('div');
      name.className = 'shop-card-name';
      name.textContent = t.label;
      card.appendChild(name);

      // Pool info
      var desc = document.createElement('div');
      desc.className = 'shop-card-desc';
      var maxLvText = t.key === 'common' ? 'Max Lv 2' : t.key === 'rare' ? 'Max Lv 3' : 'Max Lv 1';
      desc.textContent = pool.length + ' creatures | ' + maxLvText;
      card.appendChild(desc);

      // Collection progress
      var progress = document.createElement('div');
      progress.className = 'shop-card-passive';
      progress.textContent = owned + '/' + pool.length + ' collected';
      if (owned === pool.length) progress.style.color = '#ffd700';
      card.appendChild(progress);

      // Hatch stats counter
      var hatchCount = 0;
      for (var hi = 0; hi < shopState.purchases.length; hi++) {
        if (shopState.purchases[hi].type === 'egg-' + t.key) hatchCount++;
      }
      if (hatchCount > 0) {
        var hatchEl = document.createElement('div');
        hatchEl.className = 'shop-card-desc';
        hatchEl.textContent = hatchCount + ' egg' + (hatchCount !== 1 ? 's' : '') + ' hatched';
        card.appendChild(hatchEl);
      }

      // Pity counter (show when > 0 and not all collected)
      var pityCount = pityState[t.key] || 0;
      var pityThreshold = t.key === 'legendary' ? 5 : t.key === 'rare' ? 8 : 6;
      if (pityCount > 0 && owned < pool.length) {
        var pityEl = document.createElement('div');
        pityEl.className = 'shop-card-desc';
        if (pityCount >= pityThreshold - 1) {
          pityEl.textContent = 'Next hatch guaranteed new!';
          pityEl.style.color = 'var(--accent)';
          pityEl.style.fontWeight = '600';
        } else {
          pityEl.textContent = 'Pity: ' + pityCount + '/' + pityThreshold + ' dupes';
        }
        card.appendChild(pityEl);
      }

      // Cost
      var costEl = document.createElement('div');
      costEl.className = 'shop-card-cost';
      costEl.textContent = eggDef.cost + (eggDef.currency === 'jb' ? ' JB' : ' coins');
      card.appendChild(costEl);

      // Buy button
      var allCollected = owned === pool.length;
      var canBuy = eggDef.currency === 'jb'
        ? (window.JackBucks && window.JackBucks.getBalance() >= eggDef.cost)
        : (Wallet.getBalance() >= eggDef.cost);

      var btn = document.createElement('button');
      btn.className = 'shop-btn';
      if (allCollected && t.key === 'legendary') {
        btn.textContent = 'Hatch (refund)';
        btn.disabled = !canBuy;
      } else if (allCollected) {
        btn.textContent = 'All Collected!';
        btn.disabled = true;
      } else {
        btn.textContent = 'Hatch';
        btn.disabled = !canBuy;
      }
      btn.addEventListener('click', (function (tier) {
        return function () { hatchEgg(tier); };
      })(t.key));
      card.appendChild(btn);

      dom.pets.appendChild(card);
    }

    // ── Owned Pets Grid ─────────────────────────────
    var ownedKeys = [];
    for (var id in petState.pets) {
      if (petState.pets.hasOwnProperty(id)) ownedKeys.push(id);
    }

    // Sort by tier: legendary first, then rare, then common, then alphabetically
    var tierOrder = { legendary: 0, rare: 1, common: 2 };
    ownedKeys.sort(function (a, b) {
      var ca = catalog.creatures[a];
      var cb = catalog.creatures[b];
      if (!ca || !cb) return 0;
      var ta = tierOrder[ca.tier] !== undefined ? tierOrder[ca.tier] : 3;
      var tb = tierOrder[cb.tier] !== undefined ? tierOrder[cb.tier] : 3;
      if (ta !== tb) return ta - tb;
      return ca.name.localeCompare(cb.name);
    });

    if (ownedKeys.length > 0) {
      var ownedHeader = document.createElement('h3');
      ownedHeader.className = 'shop-section-title';
      ownedHeader.style.marginTop = '24px';
      ownedHeader.style.gridColumn = '1 / -1';
      ownedHeader.textContent = '> your creatures (' + ownedKeys.length + ')';
      dom.pets.appendChild(ownedHeader);

      // Owned grid type filter
      var ownedActiveFilter = 'all';
      var ownedFilterBar = document.createElement('div');
      ownedFilterBar.className = 'collection-filters';
      ownedFilterBar.style.gridColumn = '1 / -1';

      var ownedTypes = ['all', 'fire', 'nature', 'tech', 'aqua', 'shadow', 'mystic'];

      function buildOwnedFilter() {
        ownedFilterBar.innerHTML = '';
        for (var fi = 0; fi < ownedTypes.length; fi++) {
          var fb = document.createElement('button');
          fb.className = 'collection-filter-btn' + (ownedActiveFilter === ownedTypes[fi] ? ' collection-filter-active' : '');
          if (ownedTypes[fi] !== 'all') fb.classList.add('hatch-badge-' + ownedTypes[fi]);
          fb.textContent = ownedTypes[fi];
          fb.addEventListener('click', (function (t) {
            return function () {
              ownedActiveFilter = t;
              buildOwnedFilter();
              buildOwnedGrid();
            };
          })(ownedTypes[fi]));
          ownedFilterBar.appendChild(fb);
        }
      }

      function buildOwnedGrid() {
        var oldGrid = dom.pets.querySelector('.shop-owned-grid');
        if (oldGrid) oldGrid.remove();

        var ownedGrid = document.createElement('div');
        ownedGrid.className = 'shop-owned-grid';
        ownedGrid.style.gridColumn = '1 / -1';

        for (var j = 0; j < ownedKeys.length; j++) {
          var cId = ownedKeys[j];
          var cData = catalog.creatures[cId];
          var pet = petState.pets[cId];
          if (!cData) continue;
          if (ownedActiveFilter !== 'all' && cData.type !== ownedActiveFilter) continue;

          var isActive = petState.activePet === cId;
          var ownedCard = document.createElement('div');
          ownedCard.className = 'shop-owned-card' + (isActive ? ' shop-owned-active' : '');
          ownedCard.setAttribute('data-pet-id', cId);
          if (cData.tier === 'legendary') ownedCard.classList.add('shop-owned-legendary');

          // Sprite (use alt skin if active)
          var petSkin = pet.skin || 'default';
          var hasSkinUnlocked = pet.skinUnlocked || (petState.unlockedSkins && petState.unlockedSkins[cId]);
          if (hasSkinUnlocked) {
            var skinPicker = document.createElement('div');
            skinPicker.className = 'shop-skin-picker';
            var skins = ['default', 'alt'];
            for (var si = 0; si < skins.length; si++) {
              var skinKey = skins[si];
              var opt = document.createElement('div');
              opt.className = 'shop-skin-option' + (petSkin === skinKey ? ' shop-skin-selected' : '');
              var sprEl = renderSpritePreview(cId, pet.level, skinKey);
              if (sprEl) opt.appendChild(sprEl);
              var lbl = document.createElement('div');
              lbl.className = 'shop-skin-option-label';
              lbl.textContent = skinKey === 'default' ? 'Default' : 'Alt';
              opt.appendChild(lbl);
              opt.addEventListener('click', (function (pid, sk) {
                return function () {
                  var p = petState.pets[pid];
                  if (!p) return;
                  p.skin = sk;
                  savePetState(petState);
                  if (window.PetSystem && window.PetSystem.reload) window.PetSystem.reload();
                  renderAll();
                };
              })(cId, skinKey));
              skinPicker.appendChild(opt);
            }
            ownedCard.appendChild(skinPicker);
          } else {
            var sprPrev = renderSpritePreview(cId, pet.level, petSkin);
            if (sprPrev) {
              sprPrev.style.margin = '0 auto 4px';
              ownedCard.appendChild(sprPrev);
            }
          }

          // Tier label
          var tierLabel = document.createElement('div');
          tierLabel.className = 'shop-owned-tier shop-tier-' + cData.tier;
          tierLabel.textContent = cData.tier;
          ownedCard.appendChild(tierLabel);

          // Name + level
          var cName = document.createElement('div');
          cName.className = 'shop-owned-name';
          cName.textContent = cData.name;
          ownedCard.appendChild(cName);

          var cLevel = document.createElement('div');
          cLevel.className = 'shop-owned-level';
          cLevel.textContent = 'Lv.' + pet.level;
          if (pet.level >= cData.maxLevel) {
            cLevel.textContent += ' MAX';
            cLevel.classList.add('shop-owned-level-max');
          }
          ownedCard.appendChild(cLevel);

          // Type badge
          var cBadge = document.createElement('span');
          cBadge.className = 'shop-owned-type hatch-badge-' + cData.type;
          cBadge.textContent = cData.type;
          ownedCard.appendChild(cBadge);

          // Merge XP progress bar
          if (pet.level < cData.maxLevel) {
            var xpReqData = catalog.evolution[String(pet.level + 1)];
            var xpNeeded = xpReqData ? xpReqData.xpRequired : 0;
            var xpCurrent = pet.mergeXP || 0;
            if (xpNeeded > 0) {
              var xpWrap = document.createElement('div');
              xpWrap.style.width = '100%';
              var xpBar = document.createElement('div');
              xpBar.className = 'shop-owned-xp-bar';
              var xpFill = document.createElement('div');
              xpFill.className = 'shop-owned-xp-fill';
              xpFill.style.width = Math.min(100, Math.floor((xpCurrent / xpNeeded) * 100)) + '%';
              xpBar.appendChild(xpFill);
              xpWrap.appendChild(xpBar);
              var xpText = document.createElement('div');
              xpText.className = 'shop-owned-xp';
              xpText.textContent = 'XP: ' + xpCurrent + '/' + xpNeeded;
              xpWrap.appendChild(xpText);
              ownedCard.appendChild(xpWrap);
            }
          }

          // Passive tooltip
          var ownedTypeInfo = catalog.types[cData.type];
          if (ownedTypeInfo) {
            var tipLines = [];
            if (ownedTypeInfo.passiveName && ownedTypeInfo.casinoPassive) {
              tipLines.push(ownedTypeInfo.passiveName + ': ' + ownedTypeInfo.casinoPassive);
            }
            if (ownedTypeInfo.farmBonusName && ownedTypeInfo.farmBonus) {
              tipLines.push(ownedTypeInfo.farmBonusName + ': ' + ownedTypeInfo.farmBonus);
            }
            if (tipLines.length > 0) ownedCard.title = tipLines.join('\n');
          }

          if (isActive) {
            var actLabel = document.createElement('div');
            actLabel.className = 'shop-owned-active-label';
            actLabel.textContent = 'ACTIVE';
            ownedCard.appendChild(actLabel);
          } else {
            var actBtn = document.createElement('button');
            actBtn.className = 'shop-btn shop-owned-btn';
            actBtn.textContent = 'Activate';
            actBtn.addEventListener('click', (function (pid) {
              return function () { activatePet(pid); };
            })(cId));
            ownedCard.appendChild(actBtn);
          }

          ownedGrid.appendChild(ownedCard);
        }

        dom.pets.appendChild(ownedGrid);
      }

      dom.pets.appendChild(ownedFilterBar);
      buildOwnedFilter();
      buildOwnedGrid();
    }
  }

  function renderActivePet() {
    if (!dom.activePetSection) return;
    if (!petState.activePet || !ownsPet(petState.activePet) || !catalog) {
      dom.activePetSection.style.display = 'none';
      return;
    }
    dom.activePetSection.style.display = '';

    var id = petState.activePet;
    var creature = catalog.creatures[id];
    var pet = petState.pets[id];
    if (!creature) { dom.activePetSection.style.display = 'none'; return; }

    dom.activePetInfo.innerHTML = '';

    var activeSpr = renderSpritePreview(id, pet.level, pet.skin || 'default');
    if (activeSpr) {
      activeSpr.style.flexShrink = '0';
      dom.activePetInfo.appendChild(activeSpr);
    }

    var details = document.createElement('div');
    details.className = 'shop-active-details';

    var topRow = document.createElement('div');
    topRow.className = 'shop-active-top';
    var nameEl = document.createElement('span');
    nameEl.className = 'shop-active-name';
    nameEl.textContent = creature.name;
    topRow.appendChild(nameEl);
    var levelEl = document.createElement('span');
    levelEl.className = 'shop-active-level';
    levelEl.textContent = ' Lv.' + pet.level;
    if (pet.level >= creature.maxLevel) {
      levelEl.textContent += ' MAX';
      levelEl.classList.add('shop-active-level-max');
    }
    topRow.appendChild(levelEl);
    details.appendChild(topRow);

    var typeInfo = catalog.types[creature.type];
    var passiveEl = document.createElement('span');
    passiveEl.className = 'shop-active-passive';
    passiveEl.textContent = typeInfo ? typeInfo.passiveName : creature.type;
    details.appendChild(passiveEl);

    if (typeInfo) {
      if (typeInfo.casinoPassive) {
        var casinoDesc = document.createElement('span');
        casinoDesc.className = 'shop-active-passive-desc';
        casinoDesc.textContent = typeInfo.casinoPassive;
        details.appendChild(casinoDesc);
      }
      if (typeInfo.farmBonusName && typeInfo.farmBonus) {
        var farmDesc = document.createElement('span');
        farmDesc.className = 'shop-active-passive-desc shop-active-farm-desc';
        farmDesc.textContent = typeInfo.farmBonusName + ': ' + typeInfo.farmBonus;
        details.appendChild(farmDesc);
      }
    }

    dom.activePetInfo.appendChild(details);
  }

  // Track active evolution filter
  var evoActiveFilter = 'hide-max';

  function applyEvoFilter(filter) {
    evoActiveFilter = filter;
    var cards = dom.evolution.querySelectorAll('.shop-evo-card');
    for (var i = 0; i < cards.length; i++) {
      var status = cards[i].getAttribute('data-evo-status');
      if (filter === 'all') {
        cards[i].style.display = '';
      } else if (filter === 'ready') {
        cards[i].style.display = status === 'ready' ? '' : 'none';
      } else if (filter === 'hide-max') {
        cards[i].style.display = status === 'max' ? 'none' : '';
      }
    }

    // Update filter button active states
    var filterBar = document.getElementById('evo-filters');
    if (filterBar) {
      var btns = filterBar.querySelectorAll('.evo-filter-btn');
      for (var j = 0; j < btns.length; j++) {
        if (btns[j].getAttribute('data-filter') === filter) {
          btns[j].classList.add('evo-filter-active');
        } else {
          btns[j].classList.remove('evo-filter-active');
        }
      }
    }
  }

  function initEvoFilters() {
    var filterBar = document.getElementById('evo-filters');
    if (!filterBar) return;
    var btns = filterBar.querySelectorAll('.evo-filter-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', (function (btn) {
        return function () {
          applyEvoFilter(btn.getAttribute('data-filter'));
        };
      })(btns[i]));
    }
  }

  var evoFiltersInited = false;

  function renderEvolution() {
    if (!dom.evolutionSection || !dom.evolution) return;
    if (!hasAnyPet() || !catalog) {
      dom.evolutionSection.style.display = 'none';
      var fb = document.getElementById('evo-filters');
      if (fb) fb.style.display = 'none';
      return;
    }
    dom.evolutionSection.style.display = '';
    dom.evolution.innerHTML = '';

    // Show filter bar
    var filterBar = document.getElementById('evo-filters');
    if (filterBar) filterBar.style.display = '';

    // Init filter click handlers once
    if (!evoFiltersInited) {
      initEvoFilters();
      evoFiltersInited = true;
    }

    // Collect all evo entries with status
    var entries = [];
    for (var id in petState.pets) {
      if (!petState.pets.hasOwnProperty(id)) continue;
      var pet = petState.pets[id];
      var creature = catalog.creatures[id];
      if (!creature) continue;

      var isMax = pet.level >= creature.maxLevel;
      var status;
      if (isMax) {
        status = 'max';
      } else {
        var nextLevel = pet.level + 1;
        var req = catalog.evolution[String(nextLevel)];
        if (!req) continue;
        var canEvolve = Wallet.getBalance() >= req.coinCost &&
                        (pet.mergeXP || 0) >= req.xpRequired;
        status = canEvolve ? 'ready' : 'progress';
      }
      entries.push({ id: id, pet: pet, creature: creature, status: status });
    }

    // Sort: ready first, then progress, then max
    var statusOrder = { ready: 0, progress: 1, max: 2 };
    entries.sort(function (a, b) {
      var sa = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
      var sb = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
      if (sa !== sb) return sa - sb;
      return a.creature.name.localeCompare(b.creature.name);
    });

    for (var ei = 0; ei < entries.length; ei++) {
      var entry = entries[ei];
      var ePet = entry.pet;
      var eCreature = entry.creature;
      var eId = entry.id;

      if (entry.status === 'max') {
        // Fully evolved card
        var maxCard = document.createElement('div');
        maxCard.className = 'shop-evo-card shop-evo-card-max';
        maxCard.setAttribute('data-evo-status', 'max');

        var maxSpr = renderSpritePreview(eId, ePet.level, ePet.skin || 'default');
        if (maxSpr) {
          maxSpr.style.margin = '0 auto 8px';
          maxCard.appendChild(maxSpr);
        }

        var maxTitle = document.createElement('div');
        maxTitle.className = 'shop-evo-title';
        maxTitle.textContent = eCreature.name;
        maxCard.appendChild(maxTitle);

        var maxLabel = document.createElement('div');
        maxLabel.className = 'shop-evo-max-label';
        maxLabel.textContent = 'MAX LEVEL';
        maxCard.appendChild(maxLabel);

        var maxDesc = document.createElement('div');
        maxDesc.className = 'shop-evo-req shop-evo-req-met';
        maxDesc.textContent = 'Fully evolved! Lv.' + ePet.level + '/' + eCreature.maxLevel;
        maxCard.appendChild(maxDesc);

        dom.evolution.appendChild(maxCard);
        continue;
      }

      var eNextLevel = ePet.level + 1;
      var eReq = catalog.evolution[String(eNextLevel)];
      if (!eReq) continue;

      var card = document.createElement('div');
      card.className = 'shop-evo-card';
      card.setAttribute('data-evo-status', entry.status);

      // Before/after sprite comparison
      var evoSprites = document.createElement('div');
      evoSprites.className = 'shop-evo-sprites';
      var evoSkin = ePet.skin || 'default';
      var evoSprBefore = renderSpritePreview(eId, ePet.level, evoSkin);
      if (evoSprBefore) evoSprites.appendChild(evoSprBefore);
      var evoArrow = document.createElement('span');
      evoArrow.className = 'shop-evo-arrow';
      evoArrow.textContent = '\u2192';
      evoSprites.appendChild(evoArrow);
      var evoSprAfter = renderSpritePreview(eId, eNextLevel, evoSkin);
      if (evoSprAfter) evoSprites.appendChild(evoSprAfter);
      card.appendChild(evoSprites);

      var title = document.createElement('div');
      title.className = 'shop-evo-title';
      title.textContent = eCreature.name + ' \u2192 Level ' + eNextLevel;
      card.appendChild(title);

      // Cost requirement
      var costReq = document.createElement('div');
      costReq.className = 'shop-evo-req';
      if (Wallet.getBalance() >= eReq.coinCost) costReq.classList.add('shop-evo-req-met');
      costReq.textContent = 'Cost: ' + eReq.coinCost + ' coins';
      card.appendChild(costReq);

      // Merge XP requirement
      var xpReq = document.createElement('div');
      xpReq.className = 'shop-evo-req';
      if ((ePet.mergeXP || 0) >= eReq.xpRequired) xpReq.classList.add('shop-evo-req-met');
      xpReq.textContent = 'Merge XP: ' + (ePet.mergeXP || 0) + ' / ' + eReq.xpRequired;
      card.appendChild(xpReq);

      // Progress bar (merge XP)
      var bar = document.createElement('div');
      bar.className = 'shop-evo-bar';
      var fill = document.createElement('div');
      fill.className = 'shop-evo-bar-fill';
      var pct = eReq.xpRequired > 0 ? Math.min(100, Math.floor(((ePet.mergeXP || 0) / eReq.xpRequired) * 100)) : 100;
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      card.appendChild(bar);

      // Evolve button
      var eCanEvolve = entry.status === 'ready';
      var evoBtn = document.createElement('button');
      evoBtn.className = 'shop-btn';
      evoBtn.textContent = 'Evolve';
      evoBtn.disabled = !eCanEvolve;
      evoBtn.addEventListener('click', (function (pid) {
        return function () { evolvePet(pid); };
      })(eId));
      card.appendChild(evoBtn);

      dom.evolution.appendChild(card);
    }

    if (dom.evolution.children.length === 0) {
      dom.evolutionSection.style.display = 'none';
      if (filterBar) filterBar.style.display = 'none';
    } else {
      // Apply current filter
      applyEvoFilter(evoActiveFilter);
    }
  }

  function renderAccessories() {
    if (!dom.accessoriesSection || !dom.accessories) return;
    if (!hasAnyPet()) {
      dom.accessoriesSection.style.display = 'none';
      return;
    }
    dom.accessoriesSection.style.display = '';
    dom.accessories.innerHTML = '';

    var ids = ['partyhat', 'bowtie', 'tophat', 'monocle', 'cape', 'crown', 'farmerhat'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var info = ACCESSORIES[id];
      var owned = ownsAccessory(id);
      var equipped = petState.accessories.equipped[info.slot] === id;

      var card = document.createElement('div');
      card.className = 'shop-card';

      var slotEl = document.createElement('div');
      slotEl.className = 'shop-card-slot';
      slotEl.textContent = info.slot;
      card.appendChild(slotEl);

      var nameEl = document.createElement('div');
      nameEl.className = 'shop-card-name';
      nameEl.textContent = info.name;
      card.appendChild(nameEl);

      var heroBonuses = {
        partyhat: '+5% hero attack speed', tophat: '+10% SB from hero kills',
        monocle: '+20% hero range', crown: '+15% hero damage',
        farmerhat: 'Hero attacks slow enemies', bowtie: '-10% ability cooldowns',
        cape: '+15% ability damage'
      };
      if (heroBonuses[id]) {
        var bonusEl = document.createElement('div');
        bonusEl.className = 'shop-card-bonus';
        bonusEl.textContent = '\u2694 ' + heroBonuses[id];
        card.appendChild(bonusEl);
      }

      if (owned) {
        var equipBtn = document.createElement('button');
        equipBtn.className = 'shop-btn shop-btn-equip';
        if (equipped) {
          equipBtn.classList.add('shop-btn-active');
          equipBtn.textContent = 'Unequip';
        } else {
          equipBtn.textContent = 'Equip';
        }
        equipBtn.addEventListener('click', (function (aid) {
          return function () { equipAccessory(aid); };
        })(id));
        card.appendChild(equipBtn);
      } else {
        if (info.silkRoadOnly) {
          var farmOwned = window.FarmAPI && window.FarmAPI.getCosmetics && window.FarmAPI.getCosmetics().farmerHat;
          if (farmOwned) {
            if (petState.accessories.owned.indexOf(id) === -1) {
              petState.accessories.owned.push(id);
              savePetState(petState);
            }
            var equipBtn2 = document.createElement('button');
            equipBtn2.className = 'shop-btn shop-btn-equip';
            equipBtn2.textContent = 'Equip';
            equipBtn2.addEventListener('click', (function (aid) {
              return function () { equipAccessory(aid); };
            })(id));
            card.appendChild(equipBtn2);
          } else {
            var srNote = document.createElement('div');
            srNote.className = 'shop-card-cost';
            srNote.textContent = 'Available at Silk Road';
            srNote.style.opacity = '0.6';
            srNote.style.fontStyle = 'italic';
            card.appendChild(srNote);
          }
        } else {
          var costEl = document.createElement('div');
          costEl.className = 'shop-card-cost';
          costEl.textContent = info.cost + ' coins';
          card.appendChild(costEl);

          var buyBtn = document.createElement('button');
          buyBtn.className = 'shop-btn';
          buyBtn.textContent = 'Buy';
          buyBtn.disabled = Wallet.getBalance() < info.cost;
          buyBtn.addEventListener('click', (function (aid) {
            return function () { buyAccessory(aid); };
          })(id));
          card.appendChild(buyBtn);
        }
      }

      dom.accessories.appendChild(card);
    }
  }

  // ── Collection / Pokedex View ──────────────────────
  function renderCollection() {
    if (!dom.collectionSection || !dom.collection || !catalog) return;
    dom.collectionSection.style.display = '';
    dom.collection.innerHTML = '';

    var allCreatures = [];
    for (var id in catalog.creatures) {
      if (catalog.creatures.hasOwnProperty(id)) {
        allCreatures.push({ id: id, data: catalog.creatures[id] });
      }
    }

    // Sort by tier: common → rare → legendary
    var collTierOrder = { common: 0, rare: 1, legendary: 2 };
    allCreatures.sort(function (a, b) {
      var ta = collTierOrder[a.data.tier] !== undefined ? collTierOrder[a.data.tier] : 3;
      var tb = collTierOrder[b.data.tier] !== undefined ? collTierOrder[b.data.tier] : 3;
      if (ta !== tb) return ta - tb;
      return a.data.name.localeCompare(b.data.name);
    });

    // Stats bar with per-tier progress
    var totalOwned = 0;
    var tierCounts = { common: { owned: 0, total: 0 }, rare: { owned: 0, total: 0 }, legendary: { owned: 0, total: 0 } };
    for (var i = 0; i < allCreatures.length; i++) {
      var cr = allCreatures[i];
      if (ownsPet(cr.id)) { totalOwned++; tierCounts[cr.data.tier].owned++; }
      tierCounts[cr.data.tier].total++;
    }

    var statsBar = document.createElement('div');
    statsBar.className = 'collection-stats';
    statsBar.textContent = totalOwned + '/' + allCreatures.length + ' discovered (common: ' +
      tierCounts.common.owned + '/' + tierCounts.common.total + ' | rare: ' +
      tierCounts.rare.owned + '/' + tierCounts.rare.total + ' | legendary: ' +
      tierCounts.legendary.owned + '/' + tierCounts.legendary.total + ')';
    dom.collection.appendChild(statsBar);

    // Type filter
    var filterBar = document.createElement('div');
    filterBar.className = 'collection-filters';
    var types = ['all', 'fire', 'nature', 'tech', 'aqua', 'shadow', 'mystic'];
    var activeFilter = 'all';

    function buildFilter() {
      filterBar.innerHTML = '';
      for (var fi = 0; fi < types.length; fi++) {
        var fb = document.createElement('button');
        fb.className = 'collection-filter-btn' + (activeFilter === types[fi] ? ' collection-filter-active' : '');
        if (types[fi] !== 'all') fb.classList.add('hatch-badge-' + types[fi]);
        fb.textContent = types[fi];
        fb.addEventListener('click', (function (t) {
          return function () {
            activeFilter = t;
            buildFilter();
            buildGrid();
          };
        })(types[fi]));
        filterBar.appendChild(fb);
      }
    }

    function buildGrid() {
      // Remove old grid if exists
      var old = dom.collection.querySelector('.collection-grid');
      if (old) old.remove();

      var grid = document.createElement('div');
      grid.className = 'collection-grid';

      var lastTier = null;
      for (var ci = 0; ci < allCreatures.length; ci++) {
        var c = allCreatures[ci];
        if (activeFilter !== 'all' && c.data.type !== activeFilter) continue;

        // Insert tier section header when tier changes
        if (c.data.tier !== lastTier) {
          lastTier = c.data.tier;
          var tc = tierCounts[c.data.tier];
          var tierHeader = document.createElement('div');
          tierHeader.className = 'collection-tier-header collection-tier-header-' + c.data.tier;
          tierHeader.textContent = c.data.tier.toUpperCase() + ' (' + tc.owned + '/' + tc.total + ')';
          grid.appendChild(tierHeader);
        }

        var owned = ownsPet(c.id);
        var cell = document.createElement('div');
        cell.className = 'collection-cell' + (owned ? '' : ' collection-cell-unknown');
        if (c.data.tier === 'legendary') cell.classList.add('collection-cell-legendary');
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', (function (cid, isOwned) {
          return function () { showCreatureModal(cid, isOwned); };
        })(c.id, owned));

        // Tier label
        var collTier = document.createElement('div');
        collTier.className = 'collection-tier collection-tier-' + c.data.tier;
        collTier.textContent = c.data.tier;
        if (!owned) collTier.style.opacity = '0.4';
        cell.appendChild(collTier);

        // Sprite
        var sprBox = document.createElement('div');
        sprBox.className = 'collection-sprite';
        var collSkin = (owned && petState.pets[c.id]) ? (petState.pets[c.id].skin || 'default') : 'default';
        var spr = renderSpritePreview(c.id, owned && petState.pets[c.id] ? petState.pets[c.id].level : 1, collSkin);
        if (spr) {
          if (!owned) spr.style.filter = 'brightness(0) opacity(0.3)';
          sprBox.appendChild(spr);
        }
        cell.appendChild(sprBox);

        // Name
        var nm = document.createElement('div');
        nm.className = 'collection-name';
        nm.textContent = owned ? c.data.name : '???';
        cell.appendChild(nm);

        // Type + level
        if (owned) {
          var lvl = document.createElement('div');
          lvl.className = 'collection-level';
          lvl.textContent = 'Lv.' + petState.pets[c.id].level;
          if (petState.pets[c.id].level >= c.data.maxLevel) {
            lvl.textContent += ' MAX';
            lvl.classList.add('collection-level-max');
          }
          cell.appendChild(lvl);
        }

        var tb = document.createElement('div');
        tb.className = 'collection-type hatch-badge-' + c.data.type;
        tb.textContent = c.data.type;
        cell.appendChild(tb);

        grid.appendChild(cell);
      }

      dom.collection.appendChild(grid);
    }

    dom.collection.appendChild(filterBar);
    buildFilter();
    buildGrid();
  }

  // ── Creature Detail Modal ────────────────────────
  function showCreatureModal(creatureId, isOwned) {
    if (!catalog || !catalog.creatures[creatureId]) return;
    var creature = catalog.creatures[creatureId];
    var pet = isOwned ? petState.pets[creatureId] : null;

    var overlay = document.createElement('div');
    overlay.className = 'collection-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'collection-modal';

    // Name
    var nameEl = document.createElement('div');
    nameEl.className = 'collection-modal-name';
    nameEl.textContent = isOwned ? creature.name : '???';
    modal.appendChild(nameEl);

    // Large 2x sprite
    var sprWrap = document.createElement('div');
    sprWrap.className = 'collection-modal-sprite';
    var modalSkin = pet ? (pet.skin || 'default') : 'default';
    var spr = renderSpritePreview(creatureId, pet ? pet.level : 1, modalSkin);
    if (spr) {
      spr.style.transform = 'scale(2)';
      spr.style.transformOrigin = 'center';
      if (!isOwned) spr.style.filter = 'brightness(0) opacity(0.3)';
      sprWrap.appendChild(spr);
    }
    modal.appendChild(sprWrap);

    // Type badge + tier label
    var tierEl = document.createElement('div');
    tierEl.className = 'collection-modal-tier collection-tier-' + creature.tier;
    tierEl.textContent = creature.tier;
    modal.appendChild(tierEl);

    var typeEl = document.createElement('div');
    typeEl.className = 'collection-type hatch-badge-' + creature.type;
    typeEl.textContent = creature.type;
    modal.appendChild(typeEl);

    if (isOwned && pet) {
      // Level
      var lvlEl = document.createElement('div');
      lvlEl.className = 'collection-modal-stat';
      lvlEl.textContent = 'Level ' + pet.level + ' / ' + creature.maxLevel;
      if (pet.level >= creature.maxLevel) lvlEl.style.color = '#ffd700';
      modal.appendChild(lvlEl);

      // XP progress (if not maxed)
      if (pet.level < creature.maxLevel) {
        var xpReqData = catalog.evolution[String(pet.level + 1)];
        if (xpReqData) {
          var xpCur = pet.mergeXP || 0;
          var xpMax = xpReqData.xpRequired;
          var xpEl = document.createElement('div');
          xpEl.className = 'collection-modal-stat';
          xpEl.textContent = 'Merge XP: ' + xpCur + ' / ' + xpMax;
          modal.appendChild(xpEl);
        }
      }

      // Acquired date
      if (pet.acquired) {
        var acqDate = new Date(pet.acquired);
        var dateStr = acqDate.toLocaleDateString();
        var acqEl = document.createElement('div');
        acqEl.className = 'collection-modal-stat';
        acqEl.textContent = 'Acquired: ' + dateStr;
        modal.appendChild(acqEl);
      }

      // Stats
      var statsLines = [];
      if (typeof pet.totalWins === 'number' || typeof pet.totalLosses === 'number') {
        statsLines.push('Wins: ' + (pet.totalWins || 0) + ' | Losses: ' + (pet.totalLosses || 0));
      }
      if (typeof pet.gamesWatched === 'number' && pet.gamesWatched > 0) {
        statsLines.push('Games watched: ' + pet.gamesWatched);
      }
      if (typeof pet.flingCount === 'number' && pet.flingCount > 0) {
        statsLines.push('Fling count: ' + pet.flingCount);
      }
      for (var si = 0; si < statsLines.length; si++) {
        var statEl = document.createElement('div');
        statEl.className = 'collection-modal-stat';
        statEl.textContent = statsLines[si];
        modal.appendChild(statEl);
      }

      // Passives
      var typeInfo = catalog.types[creature.type];
      if (typeInfo) {
        if (typeInfo.passiveName && typeInfo.casinoPassive) {
          var p1 = document.createElement('div');
          p1.className = 'collection-modal-passive';
          p1.textContent = typeInfo.passiveName + ': ' + typeInfo.casinoPassive;
          modal.appendChild(p1);
        }
        if (typeInfo.farmBonusName && typeInfo.farmBonus) {
          var p2 = document.createElement('div');
          p2.className = 'collection-modal-passive';
          p2.textContent = typeInfo.farmBonusName + ': ' + typeInfo.farmBonus;
          modal.appendChild(p2);
        }
      }
    } else {
      // Unowned hint
      var hint = document.createElement('div');
      hint.className = 'collection-modal-stat';
      hint.textContent = 'Hatch ' + creature.tier + ' eggs to discover this creature.';
      modal.appendChild(hint);
    }

    // Close button
    var closeEl = document.createElement('div');
    closeEl.className = 'collection-modal-close';
    closeEl.textContent = '[close]';
    modal.appendChild(closeEl);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function dismiss() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    closeEl.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });
  }

  function renderAll() {
    renderBalance();
    renderEggs();
    renderActivePet();
    renderEvolution();
    renderAccessories();
    renderCollection();
  }

  // ── Load data and init ─────────────────────────────
  function loadData(callback) {
    var loaded = 0;
    var total = 2;
    function check() { loaded++; if (loaded >= total) callback(); }

    // Load catalog
    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', '/data/petcatalog.json', true);
    xhr1.onload = function () {
      if (xhr1.status === 200) {
        try { catalog = JSON.parse(xhr1.responseText); } catch (e) {}
      }
      check();
    };
    xhr1.onerror = check;
    xhr1.send();

    // Load sprite data
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/data/petsprites.json', true);
    xhr2.onload = function () {
      if (xhr2.status === 200) {
        try { spriteData = JSON.parse(xhr2.responseText); } catch (e) {}
      }
      check();
    };
    xhr2.onerror = check;
    xhr2.send();
  }

  loadData(function () {
    // Migrate if catalog loaded
    if (catalog && !petState._migrated) {
      var legacyMap = catalog.legacyMap || {};
      var newPets = {};
      var newActive = petState.activePet;
      for (var oldId in petState.pets) {
        if (!petState.pets.hasOwnProperty(oldId)) continue;
        var pet = petState.pets[oldId];
        var newId = legacyMap[oldId] || oldId;
        if (typeof pet.mergeXP === 'undefined') pet.mergeXP = 0;
        var creature = catalog.creatures[newId];
        if (creature && pet.level > creature.maxLevel) pet.level = creature.maxLevel;
        newPets[newId] = pet;
        if (petState.activePet === oldId) newActive = newId;
      }
      petState.pets = newPets;
      petState.activePet = newActive;
      petState._migrated = true;
      savePetState(petState);
    }

    Wallet.onChange(function () { renderAll(); });
    renderAll();
  });
})();
