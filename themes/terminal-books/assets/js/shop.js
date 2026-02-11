(function () {
  'use strict';

  var PET_STORAGE_KEY = 'arebooksgood-pet';
  var SHOP_STORAGE_KEY = 'arebooksgood-shop';

  // ── Shop Catalog (inline from data) ─────────────────
  var CATALOG = {
    pets: {
      cat: {
        name: 'Cat', cost: 500,
        description: 'A mischievous pixel cat with lucky paws.',
        passive: 'Lucky Paws',
        passiveDesc: 'Refunds coins after losing streaks'
      },
      dragon: {
        name: 'Dragon', cost: 750,
        description: 'A fiery pixel dragon that hoards bonus coins.',
        passive: "Dragon's Hoard",
        passiveDesc: 'Chance for bonus coins on wins'
      },
      robot: {
        name: 'Robot', cost: 1000,
        description: 'A calculated pixel robot with insurance protocols.',
        passive: 'Probability Core',
        passiveDesc: 'Recovers coins periodically'
      }
    },
    accessories: {
      tophat:   { name: 'Top Hat',    slot: 'head', cost: 200 },
      crown:    { name: 'Crown',      slot: 'head', cost: 500 },
      monocle:  { name: 'Monocle',    slot: 'head', cost: 300 },
      bowtie:   { name: 'Bow Tie',    slot: 'body', cost: 150 },
      cape:     { name: 'Cape',       slot: 'body', cost: 400 },
      partyhat: { name: 'Party Hat',  slot: 'head', cost: 100 }
    },
    evolution: {
      2: { cost: 2000, gamesRequired: 50 },
      3: { cost: 10000, gamesRequired: 200 }
    }
  };

  // ── DOM refs ────────────────────────────────────────
  var shopPets = document.getElementById('shop-pets');
  if (!shopPets) return;

  var dom = {
    balance: document.getElementById('shop-balance'),
    pets: shopPets,
    activePetSection: document.getElementById('shop-active-pet'),
    activePetInfo: document.getElementById('shop-active-pet-info'),
    evolutionSection: document.getElementById('shop-evolution-section'),
    evolution: document.getElementById('shop-evolution'),
    accessoriesSection: document.getElementById('shop-accessories-section'),
    accessories: document.getElementById('shop-accessories')
  };

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

  // ── State ───────────────────────────────────────────
  var petState = loadPetState();
  var shopState = loadShopState();

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

  // ── Purchase Actions ────────────────────────────────
  function buyPet(id) {
    var info = CATALOG.pets[id];
    if (!info || ownsPet(id)) return;
    if (Wallet.getBalance() < info.cost) return;

    Wallet.deduct(info.cost);
    petState.pets[id] = {
      level: 1, mood: 'happy', totalWins: 0, totalLosses: 0,
      gamesWatched: 0, flingCount: 0, acquired: Date.now()
    };
    if (!petState.activePet) {
      petState.activePet = id;
    }
    savePetState(petState);

    shopState.purchases.push({ id: id, type: 'pet', cost: info.cost, timestamp: Date.now() });
    shopState.totalShopSpent += info.cost;
    saveShopState(shopState);

    renderAll();

    // Notify pet system if loaded
    if (window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }
  }

  function activatePet(id) {
    if (!ownsPet(id)) return;
    petState.activePet = id;
    savePetState(petState);
    renderAll();

    if (window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }
  }

  function buyAccessory(id) {
    var info = CATALOG.accessories[id];
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
    var info = CATALOG.accessories[id];
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
    if (!ownsPet(id)) return;
    var pet = petState.pets[id];
    var nextLevel = pet.level + 1;
    if (nextLevel > 3) return;

    var req = CATALOG.evolution[nextLevel];
    if (!req) return;
    if (Wallet.getBalance() < req.cost) return;
    if (pet.gamesWatched < req.gamesRequired) return;

    Wallet.deduct(req.cost);
    pet.level = nextLevel;
    savePetState(petState);

    shopState.purchases.push({ id: id + '-lvl' + nextLevel, type: 'evolution', cost: req.cost, timestamp: Date.now() });
    shopState.totalShopSpent += req.cost;
    saveShopState(shopState);

    renderAll();

    if (window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }
  }

  // ── Rendering ───────────────────────────────────────
  function renderBalance() {
    dom.balance.textContent = Wallet.getBalance();
  }

  function renderPets() {
    dom.pets.innerHTML = '';

    var ids = ['cat', 'dragon', 'robot'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var info = CATALOG.pets[id];
      var owned = ownsPet(id);
      var isActive = petState.activePet === id;

      var card = document.createElement('div');
      card.className = 'shop-card';

      var preview = document.createElement('div');
      preview.className = 'shop-card-preview';
      if (window.PetSprites && window.PetSprites.renderPreview) {
        preview.appendChild(window.PetSprites.renderPreview(id, owned ? petState.pets[id].level : 1));
      } else {
        preview.textContent = id === 'cat' ? '/\\_/\\' : id === 'dragon' ? '/\\/\\' : '[_]';
      }
      card.appendChild(preview);

      var name = document.createElement('div');
      name.className = 'shop-card-name';
      name.textContent = info.name;
      card.appendChild(name);

      var desc = document.createElement('div');
      desc.className = 'shop-card-desc';
      desc.textContent = info.description;
      card.appendChild(desc);

      var passive = document.createElement('div');
      passive.className = 'shop-card-passive';
      passive.textContent = info.passive + ': ' + info.passiveDesc;
      card.appendChild(passive);

      if (owned) {
        var level = document.createElement('div');
        level.className = 'shop-card-cost';
        level.textContent = 'Level ' + petState.pets[id].level + ' | ' + petState.pets[id].gamesWatched + ' games';
        card.appendChild(level);

        if (isActive) {
          var activeBtn = document.createElement('button');
          activeBtn.className = 'shop-btn shop-btn-active';
          activeBtn.textContent = 'Active';
          activeBtn.disabled = true;
          card.appendChild(activeBtn);
        } else {
          var activateBtn = document.createElement('button');
          activateBtn.className = 'shop-btn';
          activateBtn.textContent = 'Activate';
          activateBtn.addEventListener('click', (function (pid) {
            return function () { activatePet(pid); };
          })(id));
          card.appendChild(activateBtn);
        }
      } else {
        var cost = document.createElement('div');
        cost.className = 'shop-card-cost';
        cost.textContent = info.cost + ' coins';
        card.appendChild(cost);

        var buyBtn = document.createElement('button');
        buyBtn.className = 'shop-btn';
        buyBtn.textContent = 'Buy';
        buyBtn.disabled = Wallet.getBalance() < info.cost;
        buyBtn.addEventListener('click', (function (pid) {
          return function () { buyPet(pid); };
        })(id));
        card.appendChild(buyBtn);
      }

      dom.pets.appendChild(card);
    }
  }

  function renderActivePet() {
    if (!petState.activePet || !ownsPet(petState.activePet)) {
      dom.activePetSection.style.display = 'none';
      return;
    }
    dom.activePetSection.style.display = '';

    var id = petState.activePet;
    var info = CATALOG.pets[id];
    var pet = petState.pets[id];

    dom.activePetInfo.innerHTML = '';

    var nameEl = document.createElement('span');
    nameEl.className = 'shop-active-name';
    nameEl.textContent = info.name;
    dom.activePetInfo.appendChild(nameEl);

    var levelEl = document.createElement('span');
    levelEl.className = 'shop-active-level';
    levelEl.textContent = ' Lv.' + pet.level;
    dom.activePetInfo.appendChild(levelEl);

    var sep = document.createTextNode(' \u2014 ');
    dom.activePetInfo.appendChild(sep);

    var passiveEl = document.createElement('span');
    passiveEl.className = 'shop-active-passive';
    passiveEl.textContent = info.passive;
    dom.activePetInfo.appendChild(passiveEl);
  }

  function renderEvolution() {
    if (!hasAnyPet()) {
      dom.evolutionSection.style.display = 'none';
      return;
    }
    dom.evolutionSection.style.display = '';
    dom.evolution.innerHTML = '';

    for (var id in petState.pets) {
      if (!petState.pets.hasOwnProperty(id)) continue;
      var pet = petState.pets[id];
      var info = CATALOG.pets[id];
      if (pet.level >= 3) continue;

      var nextLevel = pet.level + 1;
      var req = CATALOG.evolution[nextLevel];
      if (!req) continue;

      var card = document.createElement('div');
      card.className = 'shop-evo-card';

      var title = document.createElement('div');
      title.className = 'shop-evo-title';
      title.textContent = info.name + ' \u2192 Level ' + nextLevel;
      card.appendChild(title);

      // Cost requirement
      var costReq = document.createElement('div');
      costReq.className = 'shop-evo-req';
      if (Wallet.getBalance() >= req.cost) costReq.classList.add('shop-evo-req-met');
      costReq.textContent = 'Cost: ' + req.cost + ' coins';
      card.appendChild(costReq);

      // Games requirement
      var gamesReq = document.createElement('div');
      gamesReq.className = 'shop-evo-req';
      if (pet.gamesWatched >= req.gamesRequired) gamesReq.classList.add('shop-evo-req-met');
      gamesReq.textContent = 'Games: ' + pet.gamesWatched + ' / ' + req.gamesRequired;
      card.appendChild(gamesReq);

      // Progress bar
      var bar = document.createElement('div');
      bar.className = 'shop-evo-bar';
      var fill = document.createElement('div');
      fill.className = 'shop-evo-bar-fill';
      var pct = Math.min(100, Math.floor((pet.gamesWatched / req.gamesRequired) * 100));
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      card.appendChild(bar);

      // Evolve button
      var canEvolve = Wallet.getBalance() >= req.cost && pet.gamesWatched >= req.gamesRequired;
      var evoBtn = document.createElement('button');
      evoBtn.className = 'shop-btn';
      evoBtn.textContent = 'Evolve';
      evoBtn.disabled = !canEvolve;
      evoBtn.addEventListener('click', (function (pid) {
        return function () { evolvePet(pid); };
      })(id));
      card.appendChild(evoBtn);

      dom.evolution.appendChild(card);
    }

    // If no evolution cards rendered (all max level)
    if (dom.evolution.children.length === 0) {
      dom.evolutionSection.style.display = 'none';
    }
  }

  function renderAccessories() {
    if (!hasAnyPet()) {
      dom.accessoriesSection.style.display = 'none';
      return;
    }
    dom.accessoriesSection.style.display = '';
    dom.accessories.innerHTML = '';

    var ids = ['partyhat', 'bowtie', 'tophat', 'monocle', 'cape', 'crown'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var info = CATALOG.accessories[id];
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

      dom.accessories.appendChild(card);
    }
  }

  function renderAll() {
    renderBalance();
    renderPets();
    renderActivePet();
    renderEvolution();
    renderAccessories();
  }

  // ── Init ────────────────────────────────────────────
  Wallet.onChange(function () { renderAll(); });
  renderAll();
})();
