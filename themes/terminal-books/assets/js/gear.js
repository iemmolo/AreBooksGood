/**
 * GearSystem — shared gear state & logic module
 * Consumed by battle.js (dungeon page) and gear-page.js (dedicated gear page)
 */
(function () {
  'use strict';

  var INVENTORY_KEY = 'arebooksgood-dungeon-inventory';
  var EQUIP_KEY = 'arebooksgood-dungeon-equip';

  var inventory = [];
  var equipMap = {};
  var gearData = null;
  var nextGearId = 1;
  var changeListeners = [];

  // ── Init ──────────────────────────────────────────
  function init(data) {
    gearData = data;
  }

  function getGearData() {
    return gearData;
  }

  // ── Inventory CRUD ────────────────────────────────
  function loadInventory() {
    try {
      var raw = localStorage.getItem(INVENTORY_KEY);
      if (raw) inventory = JSON.parse(raw);
      if (!Array.isArray(inventory)) inventory = [];
    } catch (e) { inventory = []; }
    // Migrate old upgrade format
    migrateOldUpgrades();
    initGearIdCounter();
  }

  function saveInventory() {
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch (e) {}
  }

  function getInventory() {
    return inventory;
  }

  // ── Equip Map CRUD ────────────────────────────────
  function loadEquipMap() {
    try {
      var raw = localStorage.getItem(EQUIP_KEY);
      if (raw) equipMap = JSON.parse(raw);
      if (typeof equipMap !== 'object' || equipMap === null) equipMap = {};
    } catch (e) { equipMap = {}; }
  }

  function saveEquipMap() {
    try { localStorage.setItem(EQUIP_KEY, JSON.stringify(equipMap)); } catch (e) {}
  }

  function getEquipMap() {
    return equipMap;
  }

  // ── ID counter ────────────────────────────────────
  function initGearIdCounter() {
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id >= nextGearId) nextGearId = inventory[i].id + 1;
    }
  }

  // ── Migration ─────────────────────────────────────
  function migrateOldUpgrades() {
    for (var i = 0; i < inventory.length; i++) {
      var gear = inventory[i];
      if (gear.upgradeLevel > 0 && gear.upgradeBonusMain == null) {
        // Old system gave +1 per level to main
        gear.upgradeBonusMain = gear.upgradeLevel;
        // Old secondary: hp got +3/lvl, cri got +1/lvl
        if (gear.secondaryStat === 'hp') gear.upgradeBonusSec = gear.upgradeLevel * 3;
        else if (gear.secondaryStat === 'cri') gear.upgradeBonusSec = gear.upgradeLevel;
        else gear.upgradeBonusSec = 0;
      }
    }
  }

  // ── Lookup ────────────────────────────────────────
  function findById(gearId) {
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === gearId) return inventory[i];
    }
    return null;
  }

  function getDisplayName(gear) {
    if (!gear) return '';
    var name = gear.name;
    if (gear.upgradeLevel && gear.upgradeLevel > 0) name += ' +' + gear.upgradeLevel;
    return name;
  }

  // ── Stat Calculations ─────────────────────────────
  function calcEquippedStats(creatureId) {
    var gs = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    var eq = equipMap[creatureId];
    if (!eq) return gs;
    var slots = ['weapon', 'armor', 'accessory'];
    for (var s = 0; s < slots.length; s++) {
      var gearId = eq[slots[s]];
      if (gearId == null) continue;
      var gear = findById(gearId);
      if (!gear) continue;
      // Main stat + cumulative upgrade bonus
      if (gear.mainStat) gs[gear.mainStat] += (gear.mainValue || 0) + (gear.upgradeBonusMain || 0);
      // Secondary stat + cumulative upgrade bonus
      if (gear.secondaryStat) {
        gs[gear.secondaryStat] += (gear.secondaryValue || 0) + (gear.upgradeBonusSec || 0);
      }
      // Sub stats
      if (gear.subStats) {
        for (var j = 0; j < gear.subStats.length; j++) {
          gs[gear.subStats[j].stat] += gear.subStats[j].value;
        }
      }
    }
    return gs;
  }

  function calcSingleStats(gear) {
    var gs = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    if (!gear) return gs;
    if (gear.mainStat) gs[gear.mainStat] += (gear.mainValue || 0) + (gear.upgradeBonusMain || 0);
    if (gear.secondaryStat) {
      gs[gear.secondaryStat] += (gear.secondaryValue || 0) + (gear.upgradeBonusSec || 0);
    }
    if (gear.subStats) {
      for (var j = 0; j < gear.subStats.length; j++) {
        gs[gear.subStats[j].stat] += gear.subStats[j].value;
      }
    }
    return gs;
  }

  function calcDiff(candidateGear, currentGear) {
    var cand = calcSingleStats(candidateGear);
    var cur = calcSingleStats(currentGear);
    var diff = {};
    var hasDiff = false;
    var statKeys = ['atk', 'def', 'hp', 'spd', 'cri'];
    for (var i = 0; i < statKeys.length; i++) {
      var d = cand[statKeys[i]] - cur[statKeys[i]];
      if (d !== 0) { diff[statKeys[i]] = d; hasDiff = true; }
    }
    return hasDiff ? diff : null;
  }

  // ── Set Bonus Calculation ─────────────────────────
  function calcSetBonuses(creatureId) {
    var bonus = { atk: 0, def: 0, hp: 0, spd: 0, cri: 0 };
    if (!gearData || !gearData.sets) return bonus;
    var eq = equipMap[creatureId];
    if (!eq) return bonus;

    var equippedNames = [];
    var slotArr = ['weapon', 'armor', 'accessory'];
    for (var i = 0; i < slotArr.length; i++) {
      var gearId = eq[slotArr[i]];
      if (gearId != null) {
        var gear = findById(gearId);
        if (gear) equippedNames.push(gear.name);
      }
    }

    var setNames = Object.keys(gearData.sets);
    for (var si = 0; si < setNames.length; si++) {
      var setDef = gearData.sets[setNames[si]];
      var count = 0;
      for (var pi = 0; pi < setDef.pieces.length; pi++) {
        if (equippedNames.indexOf(setDef.pieces[pi]) !== -1) count++;
      }
      var thresholds = ['3', '2'];
      for (var ti = 0; ti < thresholds.length; ti++) {
        if (count >= parseInt(thresholds[ti]) && setDef.bonuses[thresholds[ti]]) {
          var b = setDef.bonuses[thresholds[ti]];
          var bKeys = Object.keys(b);
          for (var bk = 0; bk < bKeys.length; bk++) {
            bonus[bKeys[bk]] += b[bKeys[bk]];
          }
          break;
        }
      }
    }
    return bonus;
  }

  // ── Effective main stat value (for display/sorting) ─
  function getEffectiveMain(gear) {
    return (gear.mainValue || 0) + (gear.upgradeBonusMain || 0);
  }

  function getEffectiveSecondary(gear) {
    return (gear.secondaryValue || 0) + (gear.upgradeBonusSec || 0);
  }

  // ── Sell ──────────────────────────────────────────
  function sellGear(gear) {
    if (!gear || gear.equippedBy) return 0;
    var price = gearData ? gearData.sellPrices[gear.rarity] || 5 : 5;
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === gear.id) {
        inventory.splice(i, 1);
        break;
      }
    }
    saveInventory();
    if (typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(price);
    notifyChange();
    return price;
  }

  function bulkSell(filterFn) {
    var toSell = [];
    var totalCoins = 0;
    for (var i = inventory.length - 1; i >= 0; i--) {
      if (filterFn(inventory[i])) {
        var price = gearData ? gearData.sellPrices[inventory[i].rarity] || 5 : 5;
        totalCoins += price;
        toSell.push(i);
      }
    }
    for (var j = 0; j < toSell.length; j++) {
      inventory.splice(toSell[j], 1);
    }
    saveInventory();
    if (totalCoins > 0 && typeof Wallet !== 'undefined' && Wallet.add) Wallet.add(totalCoins);
    notifyChange();
    return { count: toSell.length, coins: totalCoins };
  }

  // ── Equip / Unequip ──────────────────────────────
  function tryEquip(gear, creatureId, slotKey, petState, catalog, effectiveLevelFn) {
    if (!gear || !creatureId || !slotKey) return false;
    if (gear.slot !== slotKey) return false;

    var pet = petState && petState.pets ? petState.pets[creatureId] : null;
    var creature = catalog ? catalog.creatures[creatureId] : null;
    if (!pet || !creature) return false;
    var effLevel = effectiveLevelFn ? effectiveLevelFn(creature.tier || 'common', pet.level || 1) : (pet.level || 1);
    var reqLevel = gearData ? gearData.gearTierLevelReq[gear.tier] || 1 : 1;
    if (effLevel < reqLevel) return false;

    // Unequip from previous owner
    if (gear.equippedBy) {
      unequip(gear);
    }

    // Unequip current item in this slot
    var eq = equipMap[creatureId];
    if (!eq) { eq = {}; equipMap[creatureId] = eq; }
    if (eq[slotKey] != null) {
      var oldGear = findById(eq[slotKey]);
      if (oldGear) oldGear.equippedBy = null;
    }

    eq[slotKey] = gear.id;
    gear.equippedBy = creatureId;
    saveEquipMap();
    saveInventory();
    notifyChange();
    return true;
  }

  function unequip(gear) {
    if (!gear || !gear.equippedBy) return;
    var eq = equipMap[gear.equippedBy];
    if (eq) {
      var slots = ['weapon', 'armor', 'accessory'];
      for (var i = 0; i < slots.length; i++) {
        if (eq[slots[i]] === gear.id) {
          eq[slots[i]] = null;
          break;
        }
      }
    }
    gear.equippedBy = null;
    saveEquipMap();
    saveInventory();
    notifyChange();
  }

  // ── Auto Gear ─────────────────────────────────────
  function autoGear(teamSlots, petState, catalog, effectiveLevelFn) {
    if (!inventory.length) return;
    var slots = ['weapon', 'armor', 'accessory'];

    // Step 1: Unequip all gear from team creatures
    for (var t = 0; t < teamSlots.length; t++) {
      var cid = teamSlots[t];
      if (!cid) continue;
      var eq = equipMap[cid];
      if (!eq) continue;
      for (var s = 0; s < slots.length; s++) {
        var gid = eq[slots[s]];
        if (gid != null) {
          var g = findById(gid);
          if (g) g.equippedBy = null;
          eq[slots[s]] = null;
        }
      }
    }

    // Step 2: Greedily assign best gear per slot per creature
    var assigned = {};

    for (var ti = 0; ti < teamSlots.length; ti++) {
      var creatureId = teamSlots[ti];
      if (!creatureId) continue;

      var pet = petState && petState.pets ? petState.pets[creatureId] : null;
      var creature = catalog ? catalog.creatures[creatureId] : null;
      if (!pet || !creature) continue;

      var effLevel = effectiveLevelFn ? effectiveLevelFn(creature.tier || 'common', pet.level || 1) : (pet.level || 1);
      if (!equipMap[creatureId]) equipMap[creatureId] = {};
      var ceq = equipMap[creatureId];

      for (var si = 0; si < slots.length; si++) {
        var slotKey = slots[si];
        var bestGear = null;
        var bestVal = -1;

        for (var gi = 0; gi < inventory.length; gi++) {
          var ig = inventory[gi];
          if (ig.slot !== slotKey) continue;
          if (assigned[ig.id]) continue;
          var reqLevel = gearData ? gearData.gearTierLevelReq[ig.tier] || 1 : 1;
          if (effLevel < reqLevel) continue;
          var val = getEffectiveMain(ig);
          if (val > bestVal) {
            bestVal = val;
            bestGear = ig;
          }
        }

        if (bestGear) {
          if (bestGear.equippedBy) {
            var prevEq = equipMap[bestGear.equippedBy];
            if (prevEq) {
              for (var ps = 0; ps < slots.length; ps++) {
                if (prevEq[slots[ps]] === bestGear.id) {
                  prevEq[slots[ps]] = null;
                  break;
                }
              }
            }
          }
          ceq[slotKey] = bestGear.id;
          bestGear.equippedBy = creatureId;
          assigned[bestGear.id] = true;
        }
      }
    }

    saveEquipMap();
    saveInventory();
    notifyChange();
  }

  // ── Upgrade System (random roll) ──────────────────
  function getMaxLevel(gear) {
    if (!gearData || !gearData.upgrade) return 5;
    var byRarity = gearData.upgrade.maxLevelByRarity;
    if (byRarity) return byRarity[gear.rarity] || 5;
    return gearData.upgrade.maxLevel || 5;
  }

  function getUpgradeCost(gear) {
    if (!gearData || !gearData.upgrade) return 999999;
    var cfg = gearData.upgrade;
    var curLvl = gear.upgradeLevel || 0;
    var baseCost = cfg.costByRarity ? cfg.costByRarity[gear.rarity] || 10 : (cfg.baseCost ? cfg.baseCost[gear.rarity] || 10 : 10);
    var costMult = cfg.costMultPerLevel || 1.5;
    return Math.floor(baseCost * Math.pow(costMult, curLvl));
  }

  function canUpgrade(gear) {
    if (!gear || !gearData || !gearData.upgrade) return false;
    var curLvl = gear.upgradeLevel || 0;
    if (curLvl >= getMaxLevel(gear)) return false;
    var cost = getUpgradeCost(gear);
    if (typeof Wallet === 'undefined' || !Wallet.getBalance) return false;
    return Wallet.getBalance() >= cost;
  }

  function upgrade(gear) {
    if (!gear || !gearData || !gearData.upgrade) return null;
    var cfg = gearData.upgrade;
    var curLvl = gear.upgradeLevel || 0;
    var maxLvl = getMaxLevel(gear);
    if (curLvl >= maxLvl) return null;

    var cost = getUpgradeCost(gear);
    if (typeof Wallet === 'undefined' || !Wallet.getBalance || Wallet.getBalance() < cost) return null;

    Wallet.add(-cost);
    gear.upgradeLevel = curLvl + 1;

    // Roll random main stat bonus
    var mainRoll = 0;
    if (cfg.mainStatBoostRange && cfg.mainStatBoostRange[gear.rarity]) {
      var mainRange = cfg.mainStatBoostRange[gear.rarity];
      mainRoll = randInt(mainRange[0], mainRange[1]);
    } else {
      mainRoll = 1; // fallback flat +1
    }
    gear.upgradeBonusMain = (gear.upgradeBonusMain || 0) + mainRoll;

    // Roll random secondary stat bonus
    var secRoll = 0;
    if (gear.secondaryStat && cfg.secondaryStatBoostRange) {
      var secRanges = cfg.secondaryStatBoostRange[gear.secondaryStat];
      if (secRanges && secRanges[gear.rarity]) {
        var secRange = secRanges[gear.rarity];
        secRoll = randInt(secRange[0], secRange[1]);
      }
    }
    gear.upgradeBonusSec = (gear.upgradeBonusSec || 0) + secRoll;

    saveInventory();
    notifyChange();

    return { mainRoll: mainRoll, secRoll: secRoll, cost: cost, newLevel: gear.upgradeLevel };
  }

  // ── Render Gear Icon ──────────────────────────────
  function renderGearIcon(el, gear, displaySize) {
    if (!gearData || !gearData.spriteSheets[gear.rarity]) return;
    var sheet = gearData.spriteSheets[gear.rarity];
    var iconSize = sheet.iconSize || 16;
    var size = displaySize || 32;
    var scale = size / iconSize;
    var sx = gear.spriteIcon * iconSize;
    var sy = gear.spriteRow * iconSize;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundImage = 'url(' + sheet.sheet + ')';
    el.style.backgroundSize = (sheet.cols * iconSize * scale) + 'px ' + (3 * iconSize * scale) + 'px';
    el.style.backgroundPosition = '-' + (sx * scale) + 'px -' + (sy * scale) + 'px';
    el.style.imageRendering = 'pixelated';
  }

  // ── Gear Drop Generation ──────────────────────────
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightedRarityPick(weights) {
    var total = 0;
    var keys = ['common', 'uncommon', 'rare', 'epic'];
    for (var i = 0; i < keys.length; i++) total += (weights[keys[i]] || 0);
    var roll = Math.random() * total;
    var cum = 0;
    for (var j = 0; j < keys.length; j++) {
      cum += (weights[keys[j]] || 0);
      if (roll < cum) return keys[j];
    }
    return 'common';
  }

  function generateDrop(difficulty, dungeonStars, isFirstClear, dungeon) {
    if (!gearData) return [];
    var rates = gearData.dropRates[difficulty];
    if (!rates) return [];

    var numDrops = randInt(rates.minDrops, rates.maxDrops);
    if (isFirstClear && numDrops < 1) numDrops = 1;

    var drops = [];
    var tierPool = gearData.tierDropsByDifficulty[difficulty] || [1];

    for (var d = 0; d < numDrops; d++) {
      var rarity = weightedRarityPick(rates.weights);
      var slotKeys = ['weapon', 'armor', 'accessory'];
      var slotKey = slotKeys[Math.floor(Math.random() * slotKeys.length)];
      var slotDef = gearData.slots[slotKey];
      var tier = tierPool[Math.floor(Math.random() * tierPool.length)];

      var icons = slotDef.spriteIcons[rarity] || slotDef.spriteIcons;
      var iconRoll = Math.floor(Math.random() * icons.length);
      var name = slotDef.names[iconRoll % slotDef.names.length];
      var mainStatRange = gearData.mainStatRanges[slotKey][rarity];
      var mainValue = randInt(mainStatRange[0], mainStatRange[1]);

      var gear = {
        id: nextGearId++,
        name: name,
        slot: slotKey,
        rarity: rarity,
        tier: tier,
        mainStat: slotDef.mainStat,
        mainValue: mainValue,
        spriteRow: slotDef.spriteRow,
        spriteIcon: icons[iconRoll],
        subStats: [],
        upgradeLevel: 0,
        upgradeBonusMain: 0,
        upgradeBonusSec: 0,
        equippedBy: null
      };

      // Secondary stat for armor (HP) and accessory (CRI)
      if (slotKey === 'armor' && gearData.armorHPRanges[rarity]) {
        var hpRange = gearData.armorHPRanges[rarity];
        gear.secondaryStat = 'hp';
        gear.secondaryValue = randInt(hpRange[0], hpRange[1]);
      }
      if (slotKey === 'accessory' && gearData.accessoryCriRanges[rarity]) {
        var criRange = gearData.accessoryCriRanges[rarity];
        gear.secondaryStat = 'cri';
        gear.secondaryValue = randInt(criRange[0], criRange[1]);
      }

      // Sub stats
      var numSubs = gearData.raritySubStats[rarity] || 0;
      var subPool = gearData.subStatPool[slotKey] ? gearData.subStatPool[slotKey].slice() : [];
      for (var s = 0; s < numSubs && subPool.length > 0; s++) {
        var si = Math.floor(Math.random() * subPool.length);
        var stat = subPool.splice(si, 1)[0];
        var range = gearData.subStatRanges[stat];
        gear.subStats.push({ stat: stat, value: randInt(range[0], range[1]) });
      }

      drops.push(gear);
    }

    // Boss legendary drops
    if (dungeon && gearData.bossLoot && gearData.bossDropChance) {
      var lastWave = dungeon.enemies[dungeon.enemies.length - 1];
      if (lastWave) {
        for (var bi = 0; bi < lastWave.length; bi++) {
          var bossId = lastWave[bi];
          var loot = gearData.bossLoot[bossId];
          if (!loot) continue;
          var chances = gearData.bossDropChance[difficulty];
          if (!chances) continue;
          var dropPct = isFirstClear ? chances.firstClear : chances.repeat;
          if (Math.random() * 100 < dropPct) {
            var bossGear = {
              id: nextGearId++,
              name: loot.name,
              slot: loot.slot,
              rarity: 'legendary',
              tier: loot.tier || 3,
              mainStat: loot.mainStat,
              mainValue: loot.mainValue,
              spriteRow: loot.spriteRow,
              spriteIcon: loot.spriteIcon,
              subStats: loot.subStats ? loot.subStats.slice() : [],
              upgradeLevel: 0,
              upgradeBonusMain: 0,
              upgradeBonusSec: 0,
              equippedBy: null
            };
            if (loot.secondaryStat) {
              bossGear.secondaryStat = loot.secondaryStat;
              bossGear.secondaryValue = loot.secondaryValue || 0;
            }
            if (loot.special) bossGear.special = loot.special;
            if (loot.set) bossGear.set = loot.set;
            drops.push(bossGear);
          }
        }
      }
    }

    return drops;
  }

  function addToInventory(gearArr) {
    var maxInv = gearData ? gearData.maxInventory || 50 : 50;
    var added = 0;
    for (var i = 0; i < gearArr.length; i++) {
      if (inventory.length < maxInv) {
        inventory.push(gearArr[i]);
        added++;
      }
    }
    if (added > 0) {
      saveInventory();
      notifyChange();
    }
    return added;
  }

  // ── Change notification ───────────────────────────
  function onChange(cb) {
    if (typeof cb === 'function') changeListeners.push(cb);
  }

  function notifyChange() {
    for (var i = 0; i < changeListeners.length; i++) {
      try { changeListeners[i](); } catch (e) {}
    }
  }

  // ── Public API ────────────────────────────────────
  window.GearSystem = {
    init: init,
    getGearData: getGearData,
    loadInventory: loadInventory,
    saveInventory: saveInventory,
    getInventory: getInventory,
    loadEquipMap: loadEquipMap,
    saveEquipMap: saveEquipMap,
    getEquipMap: getEquipMap,
    findById: findById,
    getDisplayName: getDisplayName,
    calcEquippedStats: calcEquippedStats,
    calcSingleStats: calcSingleStats,
    calcDiff: calcDiff,
    calcSetBonuses: calcSetBonuses,
    getEffectiveMain: getEffectiveMain,
    getEffectiveSecondary: getEffectiveSecondary,
    sellGear: sellGear,
    bulkSell: bulkSell,
    tryEquip: tryEquip,
    unequip: unequip,
    autoGear: autoGear,
    upgrade: upgrade,
    getUpgradeCost: getUpgradeCost,
    getMaxLevel: getMaxLevel,
    canUpgrade: canUpgrade,
    renderGearIcon: renderGearIcon,
    generateDrop: generateDrop,
    addToInventory: addToInventory,
    onChange: onChange,
    randInt: randInt
  };

})();
