/**
 * Gear Vault page — full gear management UI
 * Uses GearSystem for all data operations
 */
(function () {
  'use strict';

  var PET_KEY = 'arebooksgood-pet';
  var catalog = null;
  var spriteData = null;
  var gearData = null;
  var petState = null;

  var filterSlot = 'all';
  var modalGear = null;
  var equipGear = null; // gear waiting for creature pick

  // ── Effective level (legendaries = 3) ─────────────
  function getEffectiveLevel(tier, level) {
    if (tier === 'legendary') return 3;
    return level;
  }

  // ── Data loading ─────────────────────────────────
  function loadAllData(callback) {
    var loaded = 0;
    var needed = 3;
    function check() { loaded++; if (loaded >= needed) callback(); }

    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', '/data/petcatalog.json', true);
    xhr1.onload = function () {
      if (xhr1.status === 200) try { catalog = JSON.parse(xhr1.responseText); } catch (e) {}
      check();
    };
    xhr1.onerror = check;
    xhr1.send();

    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/data/petsprites.json', true);
    xhr2.onload = function () {
      if (xhr2.status === 200) try { spriteData = JSON.parse(xhr2.responseText); } catch (e) {}
      check();
    };
    xhr2.onerror = check;
    xhr2.send();

    var xhr3 = new XMLHttpRequest();
    xhr3.open('GET', '/data/dungeongear.json', true);
    xhr3.onload = function () {
      if (xhr3.status === 200) try { gearData = JSON.parse(xhr3.responseText); } catch (e) {}
      check();
    };
    xhr3.onerror = check;
    xhr3.send();
  }

  function loadPetState() {
    try {
      var raw = localStorage.getItem(PET_KEY);
      if (raw) petState = JSON.parse(raw);
    } catch (e) {}
  }

  // ── Creature sprite rendering ─────────────────────
  function renderCreatureSprite(el, creatureId, size) {
    if (!catalog || !spriteData) return;
    var c = catalog.creatures[creatureId];
    if (!c) return;
    var sid = c.spriteId || creatureId;
    var sd = spriteData[sid];
    if (!sd || !sd.sheet) return;
    var pet = petState && petState.pets ? petState.pets[creatureId] : null;
    var level = pet ? pet.level || 1 : 1;
    var petSkin = pet ? pet.skin : 'default';
    var sheetUrl = (petSkin === 'alt' && sd.altSheet) ? sd.altSheet : sd.sheet;
    var fw = sd.frameWidth || 48;
    var fh = sd.frameHeight || 48;
    var frames = sd.frames || 3;
    var frameOffset = sd.frameOffset || 0;
    var frameIdx = Math.min(frameOffset + level - 1, frames - 1);
    var scale = (size || 48) / fw;
    el.style.backgroundImage = 'url(' + sheetUrl + ')';
    el.style.backgroundSize = (fw * frames * scale) + 'px ' + (fh * scale) + 'px';
    el.style.backgroundPosition = '-' + (frameIdx * fw * scale) + 'px 0';
    el.style.imageRendering = 'pixelated';
    el.style.width = (size || 48) + 'px';
    el.style.height = (size || 48) + 'px';
  }

  // ── Get owned creatures ───────────────────────────
  function getOwnedCreatures() {
    var creatures = [];
    if (!petState || !petState.pets || !catalog) return creatures;
    var ids = Object.keys(petState.pets);
    for (var i = 0; i < ids.length; i++) {
      var pet = petState.pets[ids[i]];
      var c = catalog.creatures[ids[i]];
      if (c) creatures.push({ id: ids[i], pet: pet, creature: c });
    }
    return creatures;
  }

  // ── Render creature equip cards ────────────────────
  function renderCreatureCards() {
    var container = document.getElementById('gv-creature-cards');
    if (!container) return;
    container.innerHTML = '';

    var owned = getOwnedCreatures();
    var equipMap = GearSystem.getEquipMap();
    var slotKeys = ['weapon', 'armor', 'accessory'];

    if (owned.length === 0) {
      container.innerHTML = '<div class="gv-inv-empty">No creatures owned. Visit the <a href="/pets/hatchery/">Hatchery</a>!</div>';
      return;
    }

    for (var i = 0; i < owned.length; i++) {
      (function (data) {
        var card = document.createElement('div');
        card.className = 'gv-creature-card';

        // Header
        var header = document.createElement('div');
        header.className = 'gv-creature-header';

        var sprite = document.createElement('div');
        sprite.className = 'gv-creature-sprite';
        renderCreatureSprite(sprite, data.id, 48);
        header.appendChild(sprite);

        var info = document.createElement('div');
        info.className = 'gv-creature-info';
        var nameEl = document.createElement('div');
        nameEl.className = 'gv-creature-name';
        nameEl.textContent = data.creature.name;
        info.appendChild(nameEl);
        var metaEl = document.createElement('div');
        metaEl.className = 'gv-creature-meta';
        metaEl.textContent = 'Lv.' + (data.pet.level || 1) + ' ' + (data.creature.type || '');
        info.appendChild(metaEl);
        header.appendChild(info);
        card.appendChild(header);

        // Gear slots
        var gearRow = document.createElement('div');
        gearRow.className = 'gv-creature-gear';
        var eq = equipMap[data.id] || {};

        for (var s = 0; s < slotKeys.length; s++) {
          (function (slotKey) {
            var slot = document.createElement('div');
            slot.className = 'gv-gear-slot';

            var label = document.createElement('div');
            label.className = 'gv-gear-slot-label';
            label.textContent = slotKey;
            slot.appendChild(label);

            var gearId = eq[slotKey];
            var gear = gearId != null ? GearSystem.findById(gearId) : null;

            if (gear) {
              var iconEl = document.createElement('div');
              iconEl.className = 'gv-gear-icon';
              GearSystem.renderGearIcon(iconEl, gear, 24);
              slot.appendChild(iconEl);
              slot.classList.add('gv-rarity-' + gear.rarity);

              var nameSpan = document.createElement('div');
              nameSpan.className = 'gv-gear-slot-name';
              nameSpan.textContent = GearSystem.getDisplayName(gear);
              slot.appendChild(nameSpan);

              var statSpan = document.createElement('div');
              statSpan.className = 'gv-gear-slot-stat';
              statSpan.textContent = '+' + GearSystem.getEffectiveMain(gear) + ' ' + gear.mainStat.toUpperCase();
              slot.appendChild(statSpan);

              slot.addEventListener('click', function () {
                openModal(gear);
              });
            } else {
              var emptyText = document.createElement('div');
              emptyText.className = 'gv-gear-slot-empty';
              emptyText.textContent = '--';
              slot.appendChild(emptyText);
            }

            gearRow.appendChild(slot);
          })(slotKeys[s]);
        }

        card.appendChild(gearRow);
        container.appendChild(card);
      })(owned[i]);
    }
  }

  // ── Render inventory grid ──────────────────────────
  function renderInventory() {
    var grid = document.getElementById('gv-inv-grid');
    var countEl = document.getElementById('gv-inv-count');
    if (!grid) return;
    grid.innerHTML = '';

    var inv = GearSystem.getInventory();
    var maxInv = gearData ? gearData.maxInventory || 50 : 50;
    if (countEl) countEl.textContent = inv.length + '/' + maxInv;

    renderFilters();
    renderBulkSell();

    var filtered = inv.filter(function (g) {
      if (filterSlot === 'all') return true;
      return g.slot === filterSlot;
    });

    if (filtered.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'gv-inv-empty';
      emptyEl.textContent = 'No gear yet. Clear dungeons to find loot!';
      grid.appendChild(emptyEl);
      return;
    }

    var rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    filtered.sort(function (a, b) {
      var eqA = a.equippedBy ? 1 : 0;
      var eqB = b.equippedBy ? 1 : 0;
      if (eqA !== eqB) return eqA - eqB;
      return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
    });

    for (var i = 0; i < filtered.length; i++) {
      (function (gear) {
        var card = document.createElement('div');
        card.className = 'gv-gear-card gv-rarity-' + gear.rarity;
        if (gear.equippedBy) card.classList.add('gv-equipped');

        var iconEl = document.createElement('div');
        iconEl.className = 'gv-gear-icon';
        GearSystem.renderGearIcon(iconEl, gear);
        card.appendChild(iconEl);

        var nameEl = document.createElement('div');
        nameEl.className = 'gv-gear-card-name';
        nameEl.textContent = GearSystem.getDisplayName(gear);
        card.appendChild(nameEl);

        var statEl = document.createElement('div');
        statEl.className = 'gv-gear-card-stat';
        statEl.textContent = '+' + GearSystem.getEffectiveMain(gear) + ' ' + (gear.mainStat || '').toUpperCase();
        card.appendChild(statEl);

        if (gear.equippedBy) {
          var eqTag = document.createElement('div');
          eqTag.className = 'gv-gear-eq-tag';
          eqTag.textContent = 'E';
          card.appendChild(eqTag);
        }

        card.addEventListener('click', function () { openModal(gear); });
        grid.appendChild(card);
      })(filtered[i]);
    }
  }

  // ── Filters ───────────────────────────────────────
  function renderFilters() {
    var bar = document.getElementById('gv-inv-filters');
    if (!bar) return;
    bar.innerHTML = '';
    var filters = [
      { key: 'all', label: 'All' },
      { key: 'weapon', label: 'Weapons' },
      { key: 'armor', label: 'Armor' },
      { key: 'accessory', label: 'Acc.' }
    ];
    for (var i = 0; i < filters.length; i++) {
      (function (f) {
        var btn = document.createElement('button');
        btn.className = 'gv-filter-btn';
        if (filterSlot === f.key) btn.classList.add('gv-filter-active');
        btn.textContent = f.label;
        btn.addEventListener('click', function () {
          filterSlot = f.key;
          renderInventory();
        });
        bar.appendChild(btn);
      })(filters[i]);
    }
  }

  // ── Bulk Sell ─────────────────────────────────────
  function renderBulkSell() {
    var bar = document.getElementById('gv-bulk-sell');
    if (!bar) return;
    bar.innerHTML = '';
    var inv = GearSystem.getInventory();
    if (inv.length === 0) return;

    var rarities = ['common', 'uncommon', 'rare', 'epic'];
    for (var r = 0; r < rarities.length; r++) {
      (function (rarity) {
        var items = inv.filter(function (g) { return g.rarity === rarity && !g.equippedBy && !(g.upgradeLevel > 0); });
        if (items.length === 0) return;
        var price = gearData ? gearData.sellPrices[rarity] || 5 : 5;
        var total = items.length * price;
        var label = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        var btn = document.createElement('button');
        btn.className = 'gv-btn gv-btn-danger';
        btn.style.fontSize = '0.72em';
        btn.textContent = 'Sell ' + label + ' (' + items.length + ') +' + total + 'c';
        btn.addEventListener('click', function () {
          if (!confirm('Sell ' + items.length + ' ' + label + ' gear for ' + total + ' coins?')) return;
          GearSystem.bulkSell(function (g) { return g.rarity === rarity && !g.equippedBy && !(g.upgradeLevel > 0); });
          refreshAll();
        });
        bar.appendChild(btn);
      })(rarities[r]);
    }

    var unequipped = inv.filter(function (g) { return !g.equippedBy; });
    if (unequipped.length > 1) {
      var uTotal = 0;
      for (var i = 0; i < unequipped.length; i++) {
        uTotal += gearData ? gearData.sellPrices[unequipped[i].rarity] || 5 : 5;
      }
      var uBtn = document.createElement('button');
      uBtn.className = 'gv-btn gv-btn-danger';
      uBtn.style.fontSize = '0.72em';
      uBtn.textContent = 'Sell Unequipped (' + unequipped.length + ') +' + uTotal + 'c';
      uBtn.addEventListener('click', function () {
        if (!confirm('Sell ALL ' + unequipped.length + ' unequipped gear for ' + uTotal + ' coins?')) return;
        GearSystem.bulkSell(function (g) { return !g.equippedBy; });
        refreshAll();
      });
      bar.appendChild(uBtn);
    }
  }

  // ── Gear Detail Modal ─────────────────────────────
  function openModal(gear) {
    modalGear = gear;
    var modal = document.getElementById('gv-modal');
    if (!modal) return;
    modal.classList.remove('gv-hidden');

    var iconEl = document.getElementById('gv-modal-icon');
    if (iconEl) { iconEl.innerHTML = ''; GearSystem.renderGearIcon(iconEl, gear, 48); }

    var nameEl = document.getElementById('gv-modal-name');
    if (nameEl) {
      nameEl.textContent = GearSystem.getDisplayName(gear);
      nameEl.className = 'gv-modal-name gv-rarity-text-' + gear.rarity;
    }

    var rarityEl = document.getElementById('gv-modal-rarity');
    if (rarityEl) {
      rarityEl.textContent = gear.rarity.charAt(0).toUpperCase() + gear.rarity.slice(1) + ' ' + gear.slot;
      rarityEl.className = 'gv-modal-rarity gv-rarity-text-' + gear.rarity;
    }

    var tierEl = document.getElementById('gv-modal-tier');
    if (tierEl) {
      var tierText = 'Tier ' + gear.tier;
      if (gear.tier > 1) tierText += ' (Lv.' + (gearData ? gearData.gearTierLevelReq[gear.tier] : gear.tier) + '+)';
      tierEl.textContent = tierText;
    }

    var mainEl = document.getElementById('gv-modal-main');
    if (mainEl) {
      var mainText = '+' + GearSystem.getEffectiveMain(gear) + ' ' + (gear.mainStat || '').toUpperCase();
      if (gear.upgradeBonusMain) mainText += ' (+' + gear.upgradeBonusMain + ' from upgrades)';
      if (gear.secondaryStat) {
        mainText += '  +' + GearSystem.getEffectiveSecondary(gear) + ' ' + gear.secondaryStat.toUpperCase();
        if (gear.upgradeBonusSec) mainText += ' (+' + gear.upgradeBonusSec + ')';
      }
      mainEl.textContent = mainText;
    }

    var subsEl = document.getElementById('gv-modal-subs');
    if (subsEl) {
      subsEl.innerHTML = '';
      subsEl.style.opacity = '';
      if (gear.subStats && gear.subStats.length > 0) {
        for (var s = 0; s < gear.subStats.length; s++) {
          var subLine = document.createElement('div');
          subLine.textContent = '+' + gear.subStats[s].value + ' ' + gear.subStats[s].stat.toUpperCase();
          subsEl.appendChild(subLine);
        }
      } else {
        subsEl.textContent = 'No sub-stats';
        subsEl.style.opacity = '0.5';
      }
    }

    // Special
    var specialEl = document.getElementById('gv-modal-special');
    if (specialEl) {
      if (gear.special) { specialEl.textContent = gear.special; specialEl.classList.remove('gv-hidden'); }
      else { specialEl.classList.add('gv-hidden'); }
    }

    // Set bonus
    var setEl = document.getElementById('gv-modal-set');
    if (setEl) {
      setEl.classList.add('gv-hidden');
      if (gearData && gearData.sets && gear.rarity === 'legendary') {
        var eMap = GearSystem.getEquipMap();
        var setNames = Object.keys(gearData.sets);
        for (var si = 0; si < setNames.length; si++) {
          var setDef = gearData.sets[setNames[si]];
          if (setDef.pieces.indexOf(gear.name) !== -1) {
            setEl.innerHTML = '';
            setEl.classList.remove('gv-hidden');
            var setNameEl = document.createElement('div');
            setNameEl.className = 'gv-set-name';
            setNameEl.textContent = setNames[si];
            setEl.appendChild(setNameEl);

            var equippedCount = 0;
            if (gear.equippedBy) {
              var eq = eMap[gear.equippedBy];
              if (eq) {
                var sa = ['weapon', 'armor', 'accessory'];
                for (var sk = 0; sk < sa.length; sk++) {
                  var eqG = eq[sa[sk]] != null ? GearSystem.findById(eq[sa[sk]]) : null;
                  if (eqG && setDef.pieces.indexOf(eqG.name) !== -1) equippedCount++;
                }
              }
            }
            var bKeys = ['2', '3'];
            for (var bk = 0; bk < bKeys.length; bk++) {
              var b = setDef.bonuses[bKeys[bk]];
              if (!b) continue;
              var bl = document.createElement('div');
              bl.className = 'gv-set-bonus';
              if (equippedCount >= parseInt(bKeys[bk])) bl.classList.add('gv-set-active');
              var bt = '(' + bKeys[bk] + 'pc) ';
              var bs = Object.keys(b);
              for (var bi = 0; bi < bs.length; bi++) {
                if (bi > 0) bt += ' ';
                bt += '+' + b[bs[bi]] + ' ' + bs[bi].toUpperCase();
              }
              bl.textContent = bt;
              setEl.appendChild(bl);
            }
            for (var pi = 0; pi < setDef.pieces.length; pi++) {
              var pe = document.createElement('div');
              pe.className = 'gv-set-bonus';
              pe.textContent = '  - ' + setDef.pieces[pi];
              setEl.appendChild(pe);
            }
            break;
          }
        }
      }
    }

    // Upgrade bar
    var maxLvl = GearSystem.getMaxLevel(gear);
    var curLvl = gear.upgradeLevel || 0;
    var fill = document.getElementById('gv-upgrade-fill');
    var label = document.getElementById('gv-upgrade-label');
    if (fill) fill.style.width = (maxLvl > 0 ? (curLvl / maxLvl * 100) : 0) + '%';
    if (label) label.textContent = 'Lv ' + curLvl + '/' + maxLvl;

    // Clear roll display
    var rollEl = document.getElementById('gv-modal-roll');
    if (rollEl) rollEl.classList.add('gv-hidden');

    // Upgrade button
    var upgradeBtn = document.getElementById('gv-btn-upgrade');
    if (upgradeBtn) {
      if (curLvl >= maxLvl) {
        upgradeBtn.textContent = 'MAX +' + curLvl;
        upgradeBtn.disabled = true;
      } else {
        var cost = GearSystem.getUpgradeCost(gear);
        upgradeBtn.textContent = 'Upgrade (' + cost + ' coins)';
        upgradeBtn.disabled = false;
      }
    }

    // Sell button
    var sellBtn = document.getElementById('gv-btn-sell');
    if (sellBtn) {
      var price = gearData ? gearData.sellPrices[gear.rarity] || 5 : 5;
      sellBtn.textContent = 'Sell (' + price + 'c)';
      sellBtn.disabled = !!gear.equippedBy;
    }

    // Equip button
    var equipBtn = document.getElementById('gv-btn-equip');
    if (equipBtn) {
      equipBtn.textContent = gear.equippedBy ? 'Unequip' : 'Equip';
    }
  }

  function closeModal() {
    modalGear = null;
    var modal = document.getElementById('gv-modal');
    if (modal) modal.classList.add('gv-hidden');
  }

  // ── Equip Picker ──────────────────────────────────
  function openEquipPicker(gear) {
    equipGear = gear;
    var modal = document.getElementById('gv-equip-picker');
    if (!modal) return;
    modal.classList.remove('gv-hidden');

    var titleEl = document.getElementById('gv-picker-title');
    if (titleEl) titleEl.textContent = 'Equip ' + GearSystem.getDisplayName(gear) + ' to...';

    var container = document.getElementById('gv-picker-creatures');
    if (!container) return;
    container.innerHTML = '';

    var owned = getOwnedCreatures();
    for (var i = 0; i < owned.length; i++) {
      (function (data) {
        var row = document.createElement('div');
        row.className = 'gv-picker-row';

        var sprite = document.createElement('div');
        sprite.className = 'gv-picker-sprite';
        renderCreatureSprite(sprite, data.id, 32);
        row.appendChild(sprite);

        var nameSpan = document.createElement('div');
        nameSpan.className = 'gv-picker-name';
        nameSpan.textContent = data.creature.name + ' (Lv.' + (data.pet.level || 1) + ')';
        row.appendChild(nameSpan);

        // Check level requirement
        var effLevel = getEffectiveLevel(data.creature.tier || 'common', data.pet.level || 1);
        var reqLevel = gearData ? gearData.gearTierLevelReq[gear.tier] || 1 : 1;
        if (effLevel < reqLevel) {
          row.classList.add('gv-picker-disabled');
          var req = document.createElement('div');
          req.className = 'gv-picker-req';
          req.textContent = 'Lv.' + reqLevel + '+';
          row.appendChild(req);
        } else {
          row.addEventListener('click', function () {
            var ok = GearSystem.tryEquip(gear, data.id, gear.slot, petState, catalog, getEffectiveLevel);
            if (ok) {
              closeEquipPicker();
              closeModal();
              refreshAll();
            }
          });
        }

        container.appendChild(row);
      })(owned[i]);
    }
  }

  function closeEquipPicker() {
    equipGear = null;
    var modal = document.getElementById('gv-equip-picker');
    if (modal) modal.classList.add('gv-hidden');
  }

  // ── Refresh all views ─────────────────────────────
  function refreshAll() {
    renderCreatureCards();
    renderInventory();
  }

  // ── Event Listeners ───────────────────────────────
  function bindEvents() {
    // Close modal
    var closeBtn = document.getElementById('gv-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var backdrop = document.querySelector('#gv-modal .gv-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // Sell
    var sellBtn = document.getElementById('gv-btn-sell');
    if (sellBtn) {
      sellBtn.addEventListener('click', function () {
        if (!modalGear || modalGear.equippedBy) return;
        GearSystem.sellGear(modalGear);
        closeModal();
        refreshAll();
      });
    }

    // Upgrade
    var upgradeBtn = document.getElementById('gv-btn-upgrade');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', function () {
        if (!modalGear) return;
        var result = GearSystem.upgrade(modalGear);
        if (!result) {
          if (!GearSystem.canUpgrade(modalGear)) {
            var maxLvl = GearSystem.getMaxLevel(modalGear);
            if ((modalGear.upgradeLevel || 0) >= maxLvl) return;
            alert('Not enough coins! Need ' + GearSystem.getUpgradeCost(modalGear) + '.');
          }
          return;
        }

        // Show roll result
        var rollEl = document.getElementById('gv-modal-roll');
        if (rollEl) {
          rollEl.classList.remove('gv-hidden');
          var mainRange = gearData.upgrade.mainStatBoostRange[modalGear.rarity];
          var maxRoll = mainRange ? mainRange[1] : 1;
          var isHigh = result.mainRoll >= maxRoll;
          rollEl.className = 'gv-modal-roll ' + (isHigh ? 'gv-roll-high' : 'gv-roll-low');
          var rollText = '+' + result.mainRoll + ' ' + (modalGear.mainStat || '').toUpperCase();
          if (result.secRoll > 0) rollText += ', +' + result.secRoll + ' ' + (modalGear.secondaryStat || '').toUpperCase();
          rollEl.textContent = rollText;
        }

        openModal(modalGear);
        refreshAll();
      });
    }

    // Equip/Unequip
    var equipBtn = document.getElementById('gv-btn-equip');
    if (equipBtn) {
      equipBtn.addEventListener('click', function () {
        if (!modalGear) return;
        if (modalGear.equippedBy) {
          GearSystem.unequip(modalGear);
          closeModal();
          refreshAll();
        } else {
          openEquipPicker(modalGear);
        }
      });
    }

    // Equip picker close
    var pickerClose = document.getElementById('gv-picker-close');
    if (pickerClose) pickerClose.addEventListener('click', closeEquipPicker);

    var pickerBackdrop = document.querySelector('#gv-equip-picker .gv-modal-backdrop');
    if (pickerBackdrop) pickerBackdrop.addEventListener('click', closeEquipPicker);
  }

  // ── Init ──────────────────────────────────────────
  if (!document.getElementById('gear-vault-app')) return;

  GearSystem.loadInventory();
  GearSystem.loadEquipMap();

  loadAllData(function () {
    GearSystem.init(gearData);
    loadPetState();
    bindEvents();
    refreshAll();
  });

})();
