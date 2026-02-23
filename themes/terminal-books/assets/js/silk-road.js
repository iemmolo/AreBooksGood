(function () {
  'use strict';

  // ── Merchant dialogue ─────────────────────────────────
  var MERCHANT_LINES = [
    "You didn't get these seeds from me.",
    "Finest produce this side of localhost.",
    "No refunds. No questions.",
    "I also accept crypto. Just kidding.",
    "These seeds fell off a truck.",
    "Back again? I like repeat customers.",
    "The feds don't know about this page.",
    "Tell your friends. Actually, don't.",
    "Dragon fruit? Straight from the dark web.",
    "Grade A, organic, totally legitimate.",
    "Golden apples... not from any orchard you'd find on a map.",
    "Crystal herbs. Handle with care. Or don't. I'm not your mother.",
    "Dragon fruit seeds. Grew these in a volcano. Don't ask which one.",
    "Strawberries. Sweet enough to make you forget your debts.",
    "Hot peppers. My last customer hasn't stopped crying.",
    "Rice paddies in a pot. Don't ask how.",
    "Sunflower seeds. They follow the money, not the sun.",
    "Grapes. Fine wine starts with shady deals.",
    "Watermelon. Heavy, juicy, totally not stolen.",
    "Melon seeds. Fell off a very expensive truck.",
    "Binary bloom? It either grows or it doesn't. Fifty-fifty.",
    "Lucky clovers. Luck sold separately.",
    "Book worm truffles. Dug up from a library basement."
  ];

  // ── Farmhouse level definitions ───────────────────────
  var FARMHOUSE_LEVELS = {
    1: { name: 'Dirt Shack',       cost: 0,    sellBonus: 1.0,  growBonus: 1.0,  autoWater: false },
    2: { name: 'Wooden Cabin',     cost: 100,  sellBonus: 1.1,  growBonus: 1.0,  autoWater: false },
    3: { name: 'Stone Farmhouse',  cost: 300,  sellBonus: 1.2,  growBonus: 0.9,  autoWater: false },
    4: { name: 'Manor',            cost: 800,  sellBonus: 1.3,  growBonus: 0.85, autoWater: true },
    5: { name: 'Golden Estate',    cost: 2000, sellBonus: 1.5,  growBonus: 0.75, autoWater: true }
  };

  // ── Cosmetic definitions ─────────────────────────────────
  var COSMETICS = {
    farmerHat:      { name: 'Farmer Hat',      cost: 300,  desc: 'Pet head accessory \u2014 straw hat pixel overlay' },
    dirtTrail:      { name: 'Dirt Trail',      cost: 500,  desc: 'Brown particle dots trail behind pet when walking' },
    overgrownTheme: { name: 'Overgrown Theme', cost: 1000, desc: '5th site color theme \u2014 earthy green palette' },
    harvestMoon:    { name: 'Harvest Moon',    cost: 800,  desc: 'Ambient warm glow in top-right, slow pulse animation' }
  };

  // ── Buy-back merchant lines ─────────────────────────────
  var BUYBACK_LINES = [
    "I'll take that off your hands... for a price.",
    "Surplus materials? I know a guy.",
    "One man's junk is another man's JackBucks.",
    "I don't ask where it came from, you don't ask where it goes.",
    "Ah, fresh stock. The warehouse thanks you.",
    "Selling to me? Smart move. Asking questions? Not smart.",
    "These materials will find a... new home.",
    "The less inventory you carry, the faster you run.",
    "Bulk discount? No. Bulk surcharge? Maybe.",
    "I give fair prices. By my definition of fair."
  ];

  // ── Buy-back price table ──────────────────────────────────
  // Pricing logic: rarer / slower to gather = more JB
  var BUYBACK_PRICES = {
    // Raw resources (gathered from stations)
    wood:     { name: 'Wood',     price: 2,  cat: 'raw', icon: '\uD83E\uDEB5' },
    stone:    { name: 'Stone',    price: 3,  cat: 'raw', icon: '\uD83E\uDEA8' },
    fish:     { name: 'Fish',     price: 3,  cat: 'raw', icon: '\uD83D\uDC1F' },
    eggs:     { name: 'Eggs',     price: 4,  cat: 'raw', icon: '\uD83E\uDD5A' },
    milk:     { name: 'Milk',     price: 6,  cat: 'raw', icon: '\uD83E\uDD5B' },
    wool:     { name: 'Wool',     price: 8,  cat: 'raw', icon: '\uD83E\uDDF6' },
    iron:     { name: 'Iron',     price: 10, cat: 'raw', icon: '\u2692' },
    hardwood: { name: 'Hardwood', price: 10, cat: 'raw', icon: '\uD83C\uDF33' },
    gold:     { name: 'Gold',     price: 15, cat: 'raw', icon: '\uD83E\uDE99' },
    // Processed resources
    flour:       { name: 'Flour',        price: 5,  cat: 'processed', icon: '\uD83C\uDF3E' },
    planks:      { name: 'Planks',       price: 6,  cat: 'processed', icon: '\uD83E\uDE9C' },
    stoneBricks: { name: 'Stone Bricks', price: 8,  cat: 'processed', icon: '\uD83E\uDDF1' },
    bread:       { name: 'Bread',        price: 10, cat: 'processed', icon: '\uD83C\uDF5E' },
    rope:        { name: 'Rope',         price: 8,  cat: 'processed', icon: '\uD83E\uDE22' },
    smokedFish:  { name: 'Smoked Fish',  price: 10, cat: 'processed', icon: '\uD83C\uDF7D' },
    ironBars:    { name: 'Iron Bars',    price: 15, cat: 'processed', icon: '\u2699' },
    crystalLens: { name: 'Crystal Lens', price: 25, cat: 'processed', icon: '\uD83D\uDD2E' }
  };

  var COIN_RATE = 5; // 1 JB worth = 5 coins
  var buybackCurrency = 'jb'; // 'jb' or 'coins'

  var balanceEl;
  var dialogueEl;
  var seedsGrid;
  var farmhouseSection;
  var toolsGrid;
  var cosmeticsGrid;
  var buybackGrid;

  // ── Helpers ───────────────────────────────────────────
  function getFarmAPI() { return window.FarmAPI || null; }
  function getJB() { return window.JackBucks || null; }

  function formatTime(ms) {
    var mins = Math.round(ms / 60000);
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    var rem = mins % 60;
    return rem > 0 ? hrs + 'h ' + rem + 'm' : hrs + 'h';
  }

  function rotateMerchant() {
    if (!dialogueEl) return;
    var line = MERCHANT_LINES[Math.floor(Math.random() * MERCHANT_LINES.length)];
    dialogueEl.textContent = '> ' + line;
  }

  function updateBalance() {
    var jb = getJB();
    if (balanceEl && jb) {
      balanceEl.textContent = jb.getBalance();
    }
  }

  function flashCard(el) {
    el.classList.remove('sr-card-flash');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('sr-card-flash');
  }

  // ── Seed catalog ──────────────────────────────────────
  function renderSeeds() {
    var farm = getFarmAPI();
    if (!farm || !seedsGrid) return;

    seedsGrid.innerHTML = '';
    var crops = farm.getCropDefs();
    var inventory = farm.getInventory();
    var jb = getJB();
    var balance = jb ? jb.getBalance() : 0;

    var keys = Object.keys(crops);
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        var crop = crops[key];
        if (crop.free) return; // Don't show free crops

        var owned = inventory[key] || 0;
        var canBuy = balance >= crop.seedCost;

        var card = document.createElement('div');
        card.className = 'sr-card';
        if (crop.rarity === 'rare') card.classList.add('sr-card-rare');

        var name = document.createElement('div');
        name.className = 'sr-card-name';
        name.textContent = crop.rarity === 'rare' ? '\u2605 ' + crop.name : crop.name;

        var effectiveGrow = farm.getEffectiveGrowTime(key);
        var effectiveSell = farm.getEffectiveSellValue(key);
        var hasGrowBonus = effectiveGrow < crop.growTime;
        var hasSellBonus = effectiveSell > crop.sell;

        var info = document.createElement('div');
        info.className = 'sr-card-info';

        if (hasGrowBonus || hasSellBonus) {
          info.innerHTML = '';
          // Grow section
          var growSpan = document.createElement('span');
          if (hasGrowBonus) {
            var oldGrow = document.createElement('span');
            oldGrow.className = 'sr-val-old';
            oldGrow.textContent = formatTime(crop.growTime);
            var newGrow = document.createElement('span');
            newGrow.className = 'sr-val-new';
            newGrow.textContent = formatTime(effectiveGrow);
            growSpan.appendChild(document.createTextNode('Grow: '));
            growSpan.appendChild(oldGrow);
            growSpan.appendChild(document.createTextNode(' '));
            growSpan.appendChild(newGrow);
          } else {
            growSpan.textContent = 'Grow: ' + formatTime(crop.growTime);
          }
          info.appendChild(growSpan);
          info.appendChild(document.createTextNode(' | '));
          // Sell section
          var sellSpan = document.createElement('span');
          if (hasSellBonus) {
            var oldSell = document.createElement('span');
            oldSell.className = 'sr-val-old';
            oldSell.textContent = crop.sell;
            var newSell = document.createElement('span');
            newSell.className = 'sr-val-new';
            newSell.textContent = effectiveSell;
            sellSpan.appendChild(document.createTextNode('Sell: '));
            sellSpan.appendChild(oldSell);
            sellSpan.appendChild(document.createTextNode(' '));
            sellSpan.appendChild(newSell);
            sellSpan.appendChild(document.createTextNode(' JB'));
          } else {
            sellSpan.textContent = 'Sell: ' + crop.sell + ' JB';
          }
          info.appendChild(sellSpan);
        } else {
          info.textContent = 'Grow: ' + formatTime(crop.growTime) + ' | Sell: ' + crop.sell + ' JB';
        }

        var price = document.createElement('div');
        price.className = 'sr-card-price';
        price.textContent = crop.seedCost + ' JB / seed';

        var ownedSpan = document.createElement('div');
        ownedSpan.className = 'sr-card-owned';
        ownedSpan.textContent = 'Owned: x' + owned;

        var btn = document.createElement('button');
        btn.className = 'sr-card-btn';
        btn.type = 'button';
        btn.textContent = 'BUY';
        btn.disabled = !canBuy;

        btn.addEventListener('click', function () {
          buySeed(key, crop.seedCost, card);
        });

        card.appendChild(name);
        card.appendChild(info);
        card.appendChild(price);
        card.appendChild(ownedSpan);
        card.appendChild(btn);
        seedsGrid.appendChild(card);
      })(keys[i]);
    }
  }

  function buySeed(key, cost, cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    if (jb.getBalance() < cost) return;
    jb.deduct(cost);
    farm.addSeeds(key, 1);

    document.dispatchEvent(new CustomEvent('silk-road-purchase'));
    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderSeeds(); // Re-render counts
  }

  // ── Farmhouse ─────────────────────────────────────────
  function renderFarmhouse() {
    var farm = getFarmAPI();
    if (!farm || !farmhouseSection) return;

    farmhouseSection.innerHTML = '';
    var jb = getJB();
    var balance = jb ? jb.getBalance() : 0;
    var level = farm.getFarmhouseLevel();
    var currentDef = FARMHOUSE_LEVELS[level];
    var nextLevel = level + 1;
    var nextDef = FARMHOUSE_LEVELS[nextLevel];

    var card = document.createElement('div');
    card.className = 'sr-farmhouse-card';

    // Current level
    var current = document.createElement('div');
    current.className = 'sr-farmhouse-current';
    current.textContent = 'Lv.' + level + ' ' + currentDef.name;
    card.appendChild(current);

    // Current bonuses
    var bonuses = document.createElement('div');
    bonuses.className = 'sr-farmhouse-bonuses';
    var lines = [];
    if (currentDef.sellBonus > 1) lines.push('+' + Math.round((currentDef.sellBonus - 1) * 100) + '% sell price');
    if (currentDef.growBonus < 1) lines.push(Math.round((1 - currentDef.growBonus) * 100) + '% faster growth');
    if (currentDef.autoWater) lines.push('Auto-water on page load');
    if (level >= 5) lines.push('Rare seed drops from pet');
    bonuses.textContent = lines.length > 0 ? lines.join(' | ') : 'No bonuses';
    card.appendChild(bonuses);

    if (nextDef) {
      // Next level info
      var next = document.createElement('div');
      next.className = 'sr-farmhouse-next';
      next.textContent = 'Next: Lv.' + nextLevel + ' ' + nextDef.name + ' — ' + nextDef.cost + ' JB';
      card.appendChild(next);

      var nextBonuses = document.createElement('div');
      nextBonuses.className = 'sr-farmhouse-next-bonuses';
      var nb = [];
      if (nextDef.sellBonus > 1) nb.push('+' + Math.round((nextDef.sellBonus - 1) * 100) + '% sell');
      if (nextDef.growBonus < 1) nb.push(Math.round((1 - nextDef.growBonus) * 100) + '% faster');
      if (nextDef.autoWater) nb.push('Auto-water');
      if (nextLevel >= 5) nb.push('Rare seed drops');
      nextBonuses.textContent = nb.join(' | ');
      card.appendChild(nextBonuses);

      var btn = document.createElement('button');
      btn.className = 'sr-card-btn';
      btn.type = 'button';
      btn.textContent = 'UPGRADE';
      btn.disabled = balance < nextDef.cost;

      btn.addEventListener('click', function () {
        upgradeFarmhouse(nextLevel, nextDef.cost, card);
      });
      card.appendChild(btn);
    } else {
      var maxed = document.createElement('div');
      maxed.className = 'sr-farmhouse-max';
      maxed.textContent = '>> FULLY UPGRADED <<';
      card.appendChild(maxed);
    }

    farmhouseSection.appendChild(card);
  }

  function upgradeFarmhouse(newLevel, cost, cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    if (jb.getBalance() < cost) return;
    jb.deduct(cost);
    farm.setFarmhouseLevel(newLevel);

    // Trigger upgrade animation on the farmhouse widget
    var widget = document.getElementById('farm-house-widget');
    if (widget) {
      widget.classList.remove('farm-house-upgrading');
      void widget.offsetWidth;
      widget.classList.add('farm-house-upgrading');
      setTimeout(function () {
        widget.classList.remove('farm-house-upgrading');
      }, 600);
    }

    // Refresh farmhouse widget sprite
    if (window.FarmhouseWidget && window.FarmhouseWidget.refresh) {
      window.FarmhouseWidget.refresh();
    }

    // Pet celebrate
    if (window.PetSystem && window.PetSystem.celebrate) {
      window.PetSystem.celebrate();
    }
    if (window.PetSystem && window.PetSystem.speak) {
      window.PetSystem.speak('farmhouse upgraded!');
    }

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderFarmhouse();
    renderSeeds(); // Sell prices may change
  }

  // ── Farm Tools ───────────────────────────────────────
  function renderTools() {
    var farm = getFarmAPI();
    if (!farm || !toolsGrid) return;

    toolsGrid.innerHTML = '';
    var jb = getJB();
    var balance = jb ? jb.getBalance() : 0;
    var upgrades = farm.getUpgrades();
    var defs = farm.getUpgradeDefs();

    var toolKeys = ['sprinkler', 'scarecrow', 'goldenTrowel', 'seedBag', 'fertilizer'];
    for (var i = 0; i < toolKeys.length; i++) {
      (function (key) {
        var def = defs[key];
        if (!def) return;

        var card = document.createElement('div');
        card.className = 'sr-card';

        var name = document.createElement('div');
        name.className = 'sr-card-name';
        name.textContent = def.name;
        card.appendChild(name);

        if (def.type === 'leveled') {
          var currentLevel = upgrades[key] || 0;

          if (currentLevel > 0) {
            card.classList.add('sr-card-owned-tool');
          }

          var info = document.createElement('div');
          info.className = 'sr-card-info';
          if (currentLevel > 0) {
            info.textContent = 'Lv.' + currentLevel + ': ' + def.effects[currentLevel - 1].desc;
          } else {
            info.textContent = 'Not owned';
          }
          card.appendChild(info);

          if (currentLevel < def.maxLevel) {
            var nextCost = def.costs[currentLevel];
            var nextEffect = def.effects[currentLevel];

            var price = document.createElement('div');
            price.className = 'sr-card-price';
            price.textContent = nextCost + ' JB \u2192 Lv.' + (currentLevel + 1);
            card.appendChild(price);

            var nextDesc = document.createElement('div');
            nextDesc.className = 'sr-card-owned';
            nextDesc.textContent = nextEffect.desc;
            card.appendChild(nextDesc);

            var btn = document.createElement('button');
            btn.className = 'sr-card-btn';
            btn.type = 'button';
            btn.textContent = currentLevel === 0 ? 'BUY' : 'UPGRADE';
            btn.disabled = balance < nextCost;
            btn.addEventListener('click', function () {
              buyTool(key, currentLevel + 1, nextCost, card);
            });
            card.appendChild(btn);
          } else {
            var maxed = document.createElement('div');
            maxed.className = 'sr-card-price sr-tool-maxed-badge';
            maxed.textContent = 'MAX LEVEL';
            card.appendChild(maxed);
          }
        } else if (def.type === 'consumable') {
          // Fertilizer
          var count = upgrades[key] || 0;
          var info = document.createElement('div');
          info.className = 'sr-card-info';
          info.textContent = def.desc;
          card.appendChild(info);

          var owned = document.createElement('div');
          owned.className = 'sr-card-owned';
          owned.textContent = 'Owned: x' + count;
          card.appendChild(owned);

          var price = document.createElement('div');
          price.className = 'sr-card-price';
          price.textContent = def.bulkCost + ' JB / x' + def.bulkAmount;
          card.appendChild(price);

          var btn = document.createElement('button');
          btn.className = 'sr-card-btn';
          btn.type = 'button';
          btn.textContent = 'BUY x' + def.bulkAmount;
          btn.disabled = balance < def.bulkCost;
          btn.addEventListener('click', function () {
            buyFertilizer(card);
          });
          card.appendChild(btn);
        }

        toolsGrid.appendChild(card);
      })(toolKeys[i]);
    }
  }

  function buyTool(key, newLevel, cost, cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    if (jb.getBalance() < cost) return;
    jb.deduct(cost);
    farm.setUpgradeLevel(key, newLevel);

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderTools();
    renderSeeds(); // Sell/grow values may change from trowel/scarecrow
  }

  function buyFertilizer(cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    var defs = farm.getUpgradeDefs();
    var def = defs.fertilizer;
    if (jb.getBalance() < def.bulkCost) return;
    jb.deduct(def.bulkCost);
    farm.addFertilizer(def.bulkAmount);

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderTools();
  }

  // ── Exclusive Cosmetics ─────────────────────────────
  function renderCosmetics() {
    var farm = getFarmAPI();
    if (!farm || !cosmeticsGrid) return;

    cosmeticsGrid.innerHTML = '';
    var jb = getJB();
    var balance = jb ? jb.getBalance() : 0;
    var owned = farm.getCosmetics();

    var keys = Object.keys(COSMETICS);
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        var cosmetic = COSMETICS[key];
        var isOwned = owned[key];

        var card = document.createElement('div');
        card.className = 'sr-card';
        if (isOwned) card.classList.add('sr-card-owned-cosmetic');

        var name = document.createElement('div');
        name.className = 'sr-card-name';
        name.textContent = cosmetic.name;
        card.appendChild(name);

        var desc = document.createElement('div');
        desc.className = 'sr-card-info';
        desc.textContent = cosmetic.desc;
        card.appendChild(desc);

        // Hero bonus for Farmer Hat
        if (key === 'farmerHat') {
          var bonus = document.createElement('div');
          bonus.className = 'sr-card-info';
          bonus.style.color = '#4cf';
          bonus.style.fontSize = '10px';
          bonus.textContent = '\u2694 TD Hero: attacks slow enemies';
          card.appendChild(bonus);
        }

        if (isOwned) {
          var badge = document.createElement('div');
          badge.className = 'sr-card-price sr-cosmetic-owned-badge';
          badge.textContent = 'OWNED';
          card.appendChild(badge);
        } else {
          var price = document.createElement('div');
          price.className = 'sr-card-price';
          price.textContent = cosmetic.cost + ' JB';
          card.appendChild(price);

          var btn = document.createElement('button');
          btn.className = 'sr-card-btn';
          btn.type = 'button';
          btn.textContent = 'BUY';
          btn.disabled = balance < cosmetic.cost;
          btn.addEventListener('click', function () {
            buyCosmetic(key, cosmetic.cost, card);
          });
          card.appendChild(btn);
        }

        cosmeticsGrid.appendChild(card);
      })(keys[i]);
    }
  }

  function buyCosmetic(key, cost, cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    if (jb.getBalance() < cost) return;
    jb.deduct(cost);
    farm.setCosmetic(key, true);

    // Apply cosmetic effects immediately
    if (key === 'harvestMoon') document.body.classList.add('harvest-moon-active');
    if (key === 'overgrownTheme') {
      var opt = document.querySelector('#theme-select option[value="overgrown"]');
      if (opt) opt.style.display = '';
    }
    if (key === 'farmerHat' && window.PetSystem && window.PetSystem.reload) {
      window.PetSystem.reload();
    }

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderCosmetics();
  }

  // ── Buy-Back ─────────────────────────────────────────
  function getResources() { return window.FarmResources || null; }

  function renderBuyback() {
    var res = getResources();
    if (!res || !buybackGrid) return;

    buybackGrid.innerHTML = '';
    var all = res.getAll();
    var keys = Object.keys(BUYBACK_PRICES);
    var isCoins = buybackCurrency === 'coins';
    var label = isCoins ? 'Coins' : 'JB';

    // Currency toggle
    var toggleRow = document.createElement('div');
    toggleRow.className = 'sr-buyback-toggle';
    var toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'Pay me in: ';
    toggleRow.appendChild(toggleLabel);

    var btnJB = document.createElement('button');
    btnJB.className = 'sr-buyback-toggle-btn' + (!isCoins ? ' sr-buyback-toggle-active' : '');
    btnJB.type = 'button';
    btnJB.textContent = 'JackBucks';
    btnJB.addEventListener('click', function () {
      buybackCurrency = 'jb';
      renderBuyback();
    });
    toggleRow.appendChild(btnJB);

    var btnCoins = document.createElement('button');
    btnCoins.className = 'sr-buyback-toggle-btn' + (isCoins ? ' sr-buyback-toggle-active' : '');
    btnCoins.type = 'button';
    btnCoins.textContent = 'Coins (x' + COIN_RATE + ')';
    btnCoins.addEventListener('click', function () {
      buybackCurrency = 'coins';
      renderBuyback();
    });
    toggleRow.appendChild(btnCoins);

    buybackGrid.appendChild(toggleRow);

    var hasAny = false;

    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        var def = BUYBACK_PRICES[key];
        var pool = def.cat === 'processed' ? all.processed : all.raw;
        var count = pool[key] || 0;
        if (count <= 0) return;
        hasAny = true;

        var unitPrice = isCoins ? def.price * COIN_RATE : def.price;

        var card = document.createElement('div');
        card.className = 'sr-card sr-buyback-card';

        var name = document.createElement('div');
        name.className = 'sr-card-name';
        name.textContent = def.icon + ' ' + def.name;
        card.appendChild(name);

        var info = document.createElement('div');
        info.className = 'sr-card-info';
        info.textContent = 'Stock: x' + count + ' \u00B7 ' + unitPrice + ' ' + label + ' each';
        card.appendChild(info);

        var btnRow = document.createElement('div');
        btnRow.className = 'sr-buyback-btns';

        // Sell x1
        var btn1 = document.createElement('button');
        btn1.className = 'sr-card-btn sr-buyback-btn';
        btn1.type = 'button';
        btn1.textContent = 'SELL 1';
        btn1.addEventListener('click', function () {
          sellMaterial(key, 1, def.cat, card);
        });
        btnRow.appendChild(btn1);

        // Sell x5
        if (count >= 5) {
          var btn5 = document.createElement('button');
          btn5.className = 'sr-card-btn sr-buyback-btn';
          btn5.type = 'button';
          btn5.textContent = 'SELL 5';
          btn5.addEventListener('click', function () {
            sellMaterial(key, 5, def.cat, card);
          });
          btnRow.appendChild(btn5);
        }

        // Sell All
        if (count > 1) {
          var btnAll = document.createElement('button');
          btnAll.className = 'sr-card-btn sr-buyback-btn sr-buyback-btn-all';
          btnAll.type = 'button';
          btnAll.textContent = 'SELL ALL (' + (count * unitPrice) + ' ' + label + ')';
          btnAll.addEventListener('click', function () {
            sellMaterial(key, count, def.cat, card);
          });
          btnRow.appendChild(btnAll);
        }

        card.appendChild(btnRow);
        buybackGrid.appendChild(card);
      })(keys[i]);
    }

    if (!hasAny) {
      var empty = document.createElement('div');
      empty.className = 'sr-buyback-empty';
      empty.textContent = '> No materials to sell. Go gather some resources first.';
      buybackGrid.appendChild(empty);
    }
  }

  function sellMaterial(key, qty, category, cardEl) {
    var jb = getJB();
    var res = getResources();
    if (!res) return;

    var def = BUYBACK_PRICES[key];
    if (!def) return;

    var actual = res.deduct(category, key, qty);
    if (actual <= 0) return;

    var baseEarned = actual * def.price;

    if (buybackCurrency === 'coins' && window.Wallet) {
      window.Wallet.add(baseEarned * COIN_RATE);
    } else if (jb) {
      jb.add(baseEarned);
    }

    // Use buy-back dialogue
    var line = BUYBACK_LINES[Math.floor(Math.random() * BUYBACK_LINES.length)];
    if (dialogueEl) dialogueEl.textContent = '> ' + line;

    updateBalance();
    flashCard(cardEl);
    renderBuyback();
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    balanceEl = document.getElementById('sr-balance');
    dialogueEl = document.getElementById('sr-dialogue');
    seedsGrid = document.getElementById('sr-seeds-grid');
    farmhouseSection = document.getElementById('sr-farmhouse');
    toolsGrid = document.getElementById('sr-tools-grid');
    cosmeticsGrid = document.getElementById('sr-cosmetics-grid');
    buybackGrid = document.getElementById('sr-buyback-grid');

    if (!seedsGrid) return; // Not on silk road page

    updateBalance();
    rotateMerchant();
    renderSeeds();
    renderFarmhouse();
    renderTools();
    renderCosmetics();
    renderBuyback();

    // Live balance updates
    var jb = getJB();
    if (jb && jb.onChange) {
      jb.onChange(function () {
        updateBalance();
      });
    }

    // Re-render buy-back when resources change (gathered while on page)
    var res = getResources();
    if (res && res.onChange) {
      res.onChange(function () {
        renderBuyback();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
