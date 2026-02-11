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
    "Grade A, organic, totally legitimate."
  ];

  // ── Farmhouse level definitions ───────────────────────
  var FARMHOUSE_LEVELS = {
    1: { name: 'Dirt Shack',       cost: 0,    sellBonus: 1.0,  growBonus: 1.0,  autoWater: false },
    2: { name: 'Wooden Cabin',     cost: 100,  sellBonus: 1.1,  growBonus: 1.0,  autoWater: false },
    3: { name: 'Stone Farmhouse',  cost: 300,  sellBonus: 1.2,  growBonus: 0.9,  autoWater: false },
    4: { name: 'Manor',            cost: 800,  sellBonus: 1.3,  growBonus: 0.85, autoWater: true },
    5: { name: 'Golden Estate',    cost: 2000, sellBonus: 1.5,  growBonus: 0.75, autoWater: true }
  };

  var PLOT_COST = 50;
  var MAX_PLOTS = 6;

  var balanceEl;
  var dialogueEl;
  var seedsGrid;
  var upgradesGrid;
  var farmhouseSection;

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

        var name = document.createElement('div');
        name.className = 'sr-card-name';
        name.textContent = crop.name;

        var info = document.createElement('div');
        info.className = 'sr-card-info';
        info.textContent = 'Grow: ' + formatTime(crop.growTime) + ' | Sell: ' + crop.sell + ' JB';

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

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderSeeds(); // Re-render counts
  }

  // ── Upgrades (plot unlock) ────────────────────────────
  function renderUpgrades() {
    var farm = getFarmAPI();
    if (!farm || !upgradesGrid) return;

    upgradesGrid.innerHTML = '';
    var jb = getJB();
    var balance = jb ? jb.getBalance() : 0;
    var unlocked = farm.getUnlockedPlots();
    var canBuyPlot = unlocked < MAX_PLOTS && balance >= PLOT_COST;

    var card = document.createElement('div');
    card.className = 'sr-card';

    var name = document.createElement('div');
    name.className = 'sr-card-name';
    name.textContent = '+1 Farm Plot';

    var info = document.createElement('div');
    info.className = 'sr-card-info';
    info.textContent = 'Current: ' + unlocked + '/' + MAX_PLOTS + ' plots';

    var price = document.createElement('div');
    price.className = 'sr-card-price';
    price.textContent = unlocked >= MAX_PLOTS ? 'MAXED' : PLOT_COST + ' JB';

    var btn = document.createElement('button');
    btn.className = 'sr-card-btn';
    btn.type = 'button';
    btn.textContent = unlocked >= MAX_PLOTS ? 'MAXED' : 'BUY';
    btn.disabled = !canBuyPlot;

    btn.addEventListener('click', function () {
      buyPlot(card);
    });

    card.appendChild(name);
    card.appendChild(info);
    card.appendChild(price);
    card.appendChild(btn);
    upgradesGrid.appendChild(card);
  }

  function buyPlot(cardEl) {
    var jb = getJB();
    var farm = getFarmAPI();
    if (!jb || !farm) return;

    if (jb.getBalance() < PLOT_COST) return;
    if (farm.getUnlockedPlots() >= MAX_PLOTS) return;

    jb.deduct(PLOT_COST);
    farm.unlockPlot();

    rotateMerchant();
    updateBalance();
    flashCard(cardEl);
    renderUpgrades();
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

  // ── Init ──────────────────────────────────────────────
  function init() {
    balanceEl = document.getElementById('sr-balance');
    dialogueEl = document.getElementById('sr-dialogue');
    seedsGrid = document.getElementById('sr-seeds-grid');
    upgradesGrid = document.getElementById('sr-upgrades-grid');
    farmhouseSection = document.getElementById('sr-farmhouse');

    if (!seedsGrid) return; // Not on silk road page

    updateBalance();
    rotateMerchant();
    renderSeeds();
    renderUpgrades();
    renderFarmhouse();

    // Live balance updates
    var jb = getJB();
    if (jb && jb.onChange) {
      jb.onChange(function () {
        updateBalance();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
