(function () {
  'use strict';

  var STORAGE_KEY = 'arebooksgood-compendium';
  var TOTAL_CROPS = 19;

  // ── Achievement definitions ─────────────────────────────
  var ACHIEVEMENTS = {
    first_harvest:    { name: 'First Harvest',     desc: 'Harvest your first crop',         tier: 'bronze' },
    harvest_10:       { name: 'Green Thumb',        desc: 'Harvest 10 crops',                tier: 'bronze' },
    harvest_50:       { name: 'Seasoned Farmer',    desc: 'Harvest 50 crops',                tier: 'silver' },
    harvest_100:      { name: 'Master Grower',      desc: 'Harvest 100 crops',               tier: 'gold' },
    harvest_500:      { name: 'Harvest Legend',      desc: 'Harvest 500 crops',               tier: 'diamond' },
    earn_100:         { name: 'Pocket Change',      desc: 'Earn 100 JB total',               tier: 'bronze' },
    earn_1000:        { name: 'Stacking Bucks',     desc: 'Earn 1,000 JB total',             tier: 'silver' },
    earn_10000:       { name: 'JB Tycoon',          desc: 'Earn 10,000 JB total',            tier: 'gold' },
    grow_all_starter: { name: 'Humble Beginnings',  desc: 'Grow all 3 starter crops',        tier: 'bronze' },
    grow_all_common:  { name: 'Diverse Fields',     desc: 'Grow all common crops',           tier: 'silver' },
    grow_all_rare:    { name: 'Rare Collector',     desc: 'Grow all rare crops',             tier: 'gold' },
    grow_all_exotic:  { name: 'Secret Gardener',    desc: 'Grow all 3 exotic crops',         tier: 'gold' },
    grow_all:         { name: 'Completionist',      desc: 'Discover every crop',             tier: 'diamond' },
    farmhouse_3:      { name: 'Moving Up',          desc: 'Upgrade to Stone Farmhouse',      tier: 'silver' },
    farmhouse_5:      { name: 'Golden Estate',      desc: 'Max out the farmhouse',           tier: 'gold' },
    silk_road_first:  { name: 'First Deal',         desc: 'Buy seeds from the Silk Road',    tier: 'bronze' },
    silk_road_10:     { name: 'Regular Customer',   desc: 'Make 10 Silk Road purchases',     tier: 'silver' },
    full_plots:       { name: 'Full House',         desc: 'All plots growing at once',       tier: 'silver' },
    speed_harvest:    { name: 'Quick Fingers',      desc: 'Harvest 5 crops within 10 seconds', tier: 'silver' },
    dragon_fruit:     { name: 'Dragon Tamer',       desc: 'Harvest a Dragon Fruit',          tier: 'gold' }
  };

  var TIER_COLORS = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    diamond: '#B9F2FF'
  };

  var TIER_ICONS = {
    bronze: '\u2605',
    silver: '\u2605\u2605',
    gold: '\u2605\u2605\u2605',
    diamond: '\u2666'
  };

  // ── State ───────────────────────────────────────────────
  var state;
  var backdropEl = null;
  var modalEl = null;

  function defaultState() {
    var s = {
      discovered: {},
      stats: {},
      totalHarvests: 0,
      totalEarned: 0,
      achievements: {},
      silkRoadPurchases: 0,
      lastHarvestTimes: []
    };
    var keys = Object.keys(ACHIEVEMENTS);
    for (var i = 0; i < keys.length; i++) {
      s.achievements[keys[i]] = null;
    }
    return s;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        var def = defaultState();
        // Merge missing fields
        if (!parsed.discovered) parsed.discovered = {};
        if (!parsed.stats) parsed.stats = {};
        if (typeof parsed.totalHarvests !== 'number') parsed.totalHarvests = 0;
        if (typeof parsed.totalEarned !== 'number') parsed.totalEarned = 0;
        if (!parsed.achievements) parsed.achievements = {};
        if (typeof parsed.silkRoadPurchases !== 'number') parsed.silkRoadPurchases = 0;
        if (!parsed.lastHarvestTimes) parsed.lastHarvestTimes = [];
        // Ensure all achievement keys exist
        var aKeys = Object.keys(def.achievements);
        for (var i = 0; i < aKeys.length; i++) {
          if (!(aKeys[i] in parsed.achievements)) parsed.achievements[aKeys[i]] = null;
        }
        return parsed;
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // ── Migration ───────────────────────────────────────────
  function migrate() {
    try {
      var farmRaw = localStorage.getItem('arebooksgood-farm');
      if (!farmRaw) return;
      var farmData = JSON.parse(farmRaw);
      var changed = false;

      // Backfill discoveries from current plots
      if (farmData.plots) {
        for (var i = 0; i < farmData.plots.length; i++) {
          var plot = farmData.plots[i];
          if (plot && plot.crop && !state.discovered[plot.crop]) {
            state.discovered[plot.crop] = true;
            changed = true;
          }
        }
      }

      // Backfill discoveries from inventory (if they bought seeds, they've seen the crop)
      if (farmData.inventory) {
        var invKeys = Object.keys(farmData.inventory);
        for (var j = 0; j < invKeys.length; j++) {
          if (farmData.inventory[invKeys[j]] > 0 && !state.discovered[invKeys[j]]) {
            state.discovered[invKeys[j]] = true;
            changed = true;
          }
        }
      }

      if (changed) saveState();
    } catch (e) {}
  }

  // ── Discovery ───────────────────────────────────────────
  function discoverCrop(cropKey) {
    if (state.discovered[cropKey]) return;
    state.discovered[cropKey] = true;
    saveState();
    updateDashBadge();
  }

  function getDiscoveredCount() {
    var count = 0;
    var keys = Object.keys(state.discovered);
    for (var i = 0; i < keys.length; i++) {
      if (state.discovered[keys[i]]) count++;
    }
    return count;
  }

  // ── Stats tracking ─────────────────────────────────────
  function trackHarvest(cropKey, amount) {
    if (!state.stats[cropKey]) state.stats[cropKey] = { harvested: 0, earned: 0 };
    state.stats[cropKey].harvested++;
    state.stats[cropKey].earned += amount;
    state.totalHarvests++;
    state.totalEarned += amount;

    // Track last harvest times for speed_harvest
    var now = Date.now();
    state.lastHarvestTimes.push(now);
    if (state.lastHarvestTimes.length > 10) {
      state.lastHarvestTimes = state.lastHarvestTimes.slice(-10);
    }

    saveState();
  }

  // ── Achievement checking ────────────────────────────────
  function checkAchievements() {
    var farm = window.FarmAPI;
    var categories = farm ? farm.getCropCategories() : null;
    var unlocked = [];

    function tryUnlock(key) {
      if (state.achievements[key]) return;
      state.achievements[key] = Date.now();
      unlocked.push(key);
    }

    // Harvest milestones
    if (state.totalHarvests >= 1) tryUnlock('first_harvest');
    if (state.totalHarvests >= 10) tryUnlock('harvest_10');
    if (state.totalHarvests >= 50) tryUnlock('harvest_50');
    if (state.totalHarvests >= 100) tryUnlock('harvest_100');
    if (state.totalHarvests >= 500) tryUnlock('harvest_500');

    // Earnings milestones
    if (state.totalEarned >= 100) tryUnlock('earn_100');
    if (state.totalEarned >= 1000) tryUnlock('earn_1000');
    if (state.totalEarned >= 10000) tryUnlock('earn_10000');

    // Category discoveries
    if (categories) {
      if (allDiscovered(categories.starter)) tryUnlock('grow_all_starter');
      if (allDiscovered(categories.common)) tryUnlock('grow_all_common');
      if (allDiscovered(categories.rare)) tryUnlock('grow_all_rare');
      if (allDiscovered(categories.exotic)) tryUnlock('grow_all_exotic');
    }

    // All crops discovered
    if (getDiscoveredCount() >= TOTAL_CROPS) tryUnlock('grow_all');

    // Dragon fruit harvest
    if (state.stats.dragon_fruit && state.stats.dragon_fruit.harvested > 0) tryUnlock('dragon_fruit');

    // Silk Road purchases
    if (state.silkRoadPurchases >= 1) tryUnlock('silk_road_first');
    if (state.silkRoadPurchases >= 10) tryUnlock('silk_road_10');

    // Farmhouse level
    if (farm) {
      var fhLevel = farm.getFarmhouseLevel();
      if (fhLevel >= 3) tryUnlock('farmhouse_3');
      if (fhLevel >= 5) tryUnlock('farmhouse_5');
    }

    // Full plots
    if (farm) {
      var plots = farm.getPlots();
      if (plots.length > 0) {
        var allGrowing = true;
        for (var i = 0; i < plots.length; i++) {
          if (!plots[i].crop) { allGrowing = false; break; }
        }
        if (allGrowing) tryUnlock('full_plots');
      }
    }

    // Speed harvest (5 within 10 seconds)
    if (state.lastHarvestTimes.length >= 5) {
      var times = state.lastHarvestTimes;
      for (var j = times.length - 1; j >= 4; j--) {
        if (times[j] - times[j - 4] <= 10000) {
          tryUnlock('speed_harvest');
          break;
        }
      }
    }

    if (unlocked.length > 0) {
      saveState();
      for (var u = 0; u < unlocked.length; u++) {
        showAchievementToast(unlocked[u]);
      }
    }
  }

  function allDiscovered(cropKeys) {
    for (var i = 0; i < cropKeys.length; i++) {
      if (!state.discovered[cropKeys[i]]) return false;
    }
    return true;
  }

  function getAchievementProgress(key) {
    switch (key) {
      case 'harvest_10': return { current: Math.min(state.totalHarvests, 10), total: 10 };
      case 'harvest_50': return { current: Math.min(state.totalHarvests, 50), total: 50 };
      case 'harvest_100': return { current: Math.min(state.totalHarvests, 100), total: 100 };
      case 'harvest_500': return { current: Math.min(state.totalHarvests, 500), total: 500 };
      case 'earn_100': return { current: Math.min(state.totalEarned, 100), total: 100 };
      case 'earn_1000': return { current: Math.min(state.totalEarned, 1000), total: 1000 };
      case 'earn_10000': return { current: Math.min(state.totalEarned, 10000), total: 10000 };
      case 'silk_road_10': return { current: Math.min(state.silkRoadPurchases, 10), total: 10 };
      case 'grow_all': return { current: getDiscoveredCount(), total: TOTAL_CROPS };
      default: return null;
    }
  }

  // ── Toast notifications ─────────────────────────────────
  var TOAST_GAP = 8;
  var TOAST_TOP = 12;

  function repositionToasts() {
    var toasts = document.querySelectorAll('.comp-toast');
    var y = TOAST_TOP;
    for (var i = 0; i < toasts.length; i++) {
      toasts[i].style.top = y + 'px';
      y += toasts[i].offsetHeight + TOAST_GAP;
    }
  }

  function showAchievementToast(achievementKey) {
    var ach = ACHIEVEMENTS[achievementKey];
    if (!ach) return;

    var toast = document.createElement('div');
    toast.className = 'comp-toast';

    var tierColor = TIER_COLORS[ach.tier] || '#fff';
    toast.style.borderColor = tierColor;

    var icon = document.createElement('span');
    icon.className = 'comp-toast-icon';
    icon.textContent = TIER_ICONS[ach.tier] || '\u2605';
    icon.style.color = tierColor;
    toast.appendChild(icon);

    var text = document.createElement('div');
    text.className = 'comp-toast-text';

    var title = document.createElement('div');
    title.className = 'comp-toast-title';
    title.textContent = 'Achievement Unlocked!';
    text.appendChild(title);

    var name = document.createElement('div');
    name.className = 'comp-toast-name';
    name.textContent = ach.name;
    name.style.color = tierColor;
    text.appendChild(name);

    var desc = document.createElement('div');
    desc.className = 'comp-toast-desc';
    desc.textContent = ach.desc;
    text.appendChild(desc);

    toast.appendChild(text);

    document.body.appendChild(toast);

    // Position based on existing toasts then animate in
    repositionToasts();
    void toast.offsetWidth;
    toast.classList.add('comp-toast-show');

    setTimeout(function () {
      toast.classList.remove('comp-toast-show');
      toast.classList.add('comp-toast-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        repositionToasts();
      }, 400);
    }, 3500);
  }

  // ── Dashboard badge update ──────────────────────────────
  function updateDashBadge() {
    var badge = document.getElementById('farm-dash-count-compendium');
    if (badge) {
      badge.textContent = getDiscoveredCount() + '/' + TOTAL_CROPS;
    }
  }

  // ── Summary stats section ──────────────────────────────
  function createStatsSection() {
    var statsEl = document.createElement('div');
    statsEl.className = 'comp-stats';

    // Total harvests
    var h = document.createElement('div');
    h.className = 'comp-stat-item';
    h.innerHTML = '<span class="comp-stat-icon">\uD83C\uDF3E</span> <span class="comp-stat-value">' + state.totalHarvests + '</span> harvested';
    statsEl.appendChild(h);

    // Total JB earned
    var e = document.createElement('div');
    e.className = 'comp-stat-item';
    e.innerHTML = '<span class="comp-stat-icon">\uD83D\uDCB0</span> <span class="comp-stat-value">' + state.totalEarned.toLocaleString() + '</span> JB earned';
    statsEl.appendChild(e);

    // Discovery progress
    var d = document.createElement('div');
    d.className = 'comp-stat-item';
    d.innerHTML = '<span class="comp-stat-icon">\uD83C\uDFC6</span> <span class="comp-stat-value">' + getDiscoveredCount() + '/' + TOTAL_CROPS + '</span> crops';
    statsEl.appendChild(d);

    // Favorite crop
    var favName = '—';
    var maxH = 0;
    var farm = window.FarmAPI;
    var cropDefs = farm ? farm.getCropDefs() : {};
    var sKeys = Object.keys(state.stats);
    for (var i = 0; i < sKeys.length; i++) {
      if (state.stats[sKeys[i]].harvested > maxH) {
        maxH = state.stats[sKeys[i]].harvested;
        favName = (cropDefs[sKeys[i]] && cropDefs[sKeys[i]].name) || sKeys[i];
      }
    }
    var f = document.createElement('div');
    f.className = 'comp-stat-item';
    f.innerHTML = '<span class="comp-stat-icon">\u2B50</span> <span class="comp-stat-value">' + favName + '</span>';
    statsEl.appendChild(f);

    return statsEl;
  }

  // ── Compendium modal ──────────────────────────────────
  function openCompendium() {
    if (backdropEl) return;

    var farm = window.FarmAPI;
    if (!farm) return;
    var crops = farm.getCropDefs();
    var categories = farm.getCropCategories();

    // Backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = 'comp-backdrop';
    backdropEl.addEventListener('click', function (ev) {
      if (ev.target === backdropEl) closeCompendium();
    });

    // Modal
    modalEl = document.createElement('div');
    modalEl.className = 'comp-modal';

    // Header
    var header = document.createElement('div');
    header.className = 'comp-header';

    var titleRow = document.createElement('div');
    titleRow.className = 'comp-title-row';

    var titleEl = document.createElement('div');
    titleEl.className = 'comp-title';
    titleEl.textContent = 'CROP COMPENDIUM';
    titleRow.appendChild(titleEl);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'comp-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', closeCompendium);
    titleRow.appendChild(closeBtn);

    header.appendChild(titleRow);
    modalEl.appendChild(header);

    // Stats
    modalEl.appendChild(createStatsSection());

    // Tabs
    var tabBar = document.createElement('div');
    tabBar.className = 'comp-tabs';

    var tabNames = [
      { key: 'starter', label: 'Starter' },
      { key: 'common', label: 'Common' },
      { key: 'rare', label: 'Rare' },
      { key: 'exotic', label: 'Exotic' },
      { key: 'achievements', label: 'Achievements' }
    ];

    var contentArea = document.createElement('div');
    contentArea.className = 'comp-content';

    for (var t = 0; t < tabNames.length; t++) {
      (function (tab, idx) {
        var tabBtn = document.createElement('button');
        tabBtn.className = 'comp-tab';
        tabBtn.type = 'button';
        tabBtn.textContent = tab.label;
        tabBtn.setAttribute('data-tab', tab.key);
        if (idx === 0) tabBtn.classList.add('comp-tab-active');
        tabBtn.addEventListener('click', function () {
          var allTabs = tabBar.querySelectorAll('.comp-tab');
          for (var a = 0; a < allTabs.length; a++) allTabs[a].classList.remove('comp-tab-active');
          tabBtn.classList.add('comp-tab-active');
          renderTab(tab.key, contentArea, crops, categories);
        });
        tabBar.appendChild(tabBtn);
      })(tabNames[t], t);
    }

    modalEl.appendChild(tabBar);
    modalEl.appendChild(contentArea);

    document.body.appendChild(backdropEl);
    document.body.appendChild(modalEl);

    // Render first tab
    renderTab('starter', contentArea, crops, categories);

    // Force reflow then animate in
    void backdropEl.offsetWidth;
    backdropEl.classList.add('comp-visible');
    modalEl.classList.add('comp-visible');

    // Close on Escape
    document.addEventListener('keydown', escapeClose);
  }

  function closeCompendium() {
    if (!backdropEl) return;

    backdropEl.classList.remove('comp-visible');
    modalEl.classList.remove('comp-visible');

    var bd = backdropEl;
    var md = modalEl;
    backdropEl = null;
    modalEl = null;

    setTimeout(function () {
      if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      if (md && md.parentNode) md.parentNode.removeChild(md);
    }, 250);

    document.removeEventListener('keydown', escapeClose);
  }

  function escapeClose(e) {
    if (e.key === 'Escape') closeCompendium();
  }

  // ── Tab rendering ───────────────────────────────────────
  function renderTab(tabKey, container, crops, categories) {
    container.innerHTML = '';

    if (tabKey === 'achievements') {
      renderAchievementsTab(container);
      return;
    }

    var cropKeys = categories[tabKey] || [];
    for (var i = 0; i < cropKeys.length; i++) {
      var key = cropKeys[i];
      var crop = crops[key];
      if (!crop) continue;
      container.appendChild(createCropCard(key, crop));
    }
  }

  function createCropCard(key, crop) {
    var discovered = !!state.discovered[key];
    var stats = state.stats[key] || { harvested: 0, earned: 0 };

    var card = document.createElement('div');
    card.className = 'comp-crop-card';
    if (!discovered) card.classList.add('comp-crop-locked');
    if (crop.rarity === 'rare') card.classList.add('comp-crop-rare');

    // Sprite or silhouette
    var spriteWrap = document.createElement('div');
    spriteWrap.className = 'comp-crop-sprite';

    if (discovered && window.FarmAPI && window.FarmAPI.getCropSprite) {
      var spriteData = window.FarmAPI.getCropSprite(key, 'ready');
      if (spriteData) {
        var spriteEl = document.createElement('div');
        spriteEl.style.position = 'relative';
        spriteEl.style.width = '24px';
        spriteEl.style.height = '24px';
        spriteEl.style.imageRendering = 'pixelated';
        window.FarmAPI.renderSprite(spriteEl, spriteData, 3);
        spriteWrap.appendChild(spriteEl);
      } else {
        spriteWrap.textContent = crop.icon;
        spriteWrap.classList.add('comp-crop-icon-text');
      }
    } else if (!discovered) {
      spriteWrap.textContent = '?';
      spriteWrap.classList.add('comp-crop-icon-text');
    }

    card.appendChild(spriteWrap);

    // Info
    var info = document.createElement('div');
    info.className = 'comp-crop-info';

    var nameRow = document.createElement('div');
    nameRow.className = 'comp-crop-name';

    if (discovered) {
      nameRow.textContent = crop.name;
      if (crop.rarity === 'rare') nameRow.textContent = '\u2605 ' + crop.name;
    } else {
      nameRow.textContent = '???';
    }
    info.appendChild(nameRow);

    if (discovered) {
      var statsRow = document.createElement('div');
      statsRow.className = 'comp-crop-stats';
      statsRow.textContent = formatTime(crop.growTime) + ' grow | ' + crop.sell + ' JB sell';
      info.appendChild(statsRow);

      var harvestRow = document.createElement('div');
      harvestRow.className = 'comp-crop-harvested';
      harvestRow.textContent = 'Harvested: ' + stats.harvested + ' | ' + stats.earned + ' JB earned';
      info.appendChild(harvestRow);
    } else {
      var hintRow = document.createElement('div');
      hintRow.className = 'comp-crop-hint';
      hintRow.textContent = '"' + (crop.hint || 'A mysterious crop...') + '"';
      info.appendChild(hintRow);
    }

    card.appendChild(info);

    // Status icon
    var statusIcon = document.createElement('div');
    statusIcon.className = 'comp-crop-status';
    statusIcon.textContent = discovered ? '\u2713' : '\uD83D\uDD12';
    card.appendChild(statusIcon);

    return card;
  }

  function formatTime(ms) {
    var mins = Math.round(ms / 60000);
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    var rem = mins % 60;
    return rem > 0 ? hrs + 'h ' + rem + 'm' : hrs + 'h';
  }

  // ── Achievements tab ────────────────────────────────────
  function renderAchievementsTab(container) {
    var keys = Object.keys(ACHIEVEMENTS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var ach = ACHIEVEMENTS[key];
      var unlocked = !!state.achievements[key];

      var card = document.createElement('div');
      card.className = 'comp-ach-card';
      if (!unlocked) card.classList.add('comp-ach-locked');

      var tierColor = TIER_COLORS[ach.tier];
      if (unlocked) card.style.borderLeftColor = tierColor;

      // Icon
      var icon = document.createElement('div');
      icon.className = 'comp-ach-icon';
      icon.textContent = TIER_ICONS[ach.tier] || '\u2605';
      icon.style.color = unlocked ? tierColor : 'color-mix(in srgb, var(--foreground) 30%, transparent)';
      card.appendChild(icon);

      // Info
      var info = document.createElement('div');
      info.className = 'comp-ach-info';

      var name = document.createElement('div');
      name.className = 'comp-ach-name';
      name.textContent = ach.name;
      if (unlocked) name.style.color = tierColor;
      info.appendChild(name);

      var desc = document.createElement('div');
      desc.className = 'comp-ach-desc';
      desc.textContent = ach.desc;
      info.appendChild(desc);

      if (unlocked) {
        var date = document.createElement('div');
        date.className = 'comp-ach-date';
        var d = new Date(state.achievements[key]);
        date.textContent = 'Unlocked: ' + d.toLocaleDateString();
        info.appendChild(date);
      } else {
        // Progress bar if applicable
        var progress = getAchievementProgress(key);
        if (progress) {
          var bar = document.createElement('div');
          bar.className = 'comp-ach-bar';

          var fill = document.createElement('div');
          fill.className = 'comp-ach-bar-fill';
          var pct = Math.min(100, Math.round(progress.current / progress.total * 100));
          fill.style.width = pct + '%';
          bar.appendChild(fill);

          var barLabel = document.createElement('div');
          barLabel.className = 'comp-ach-bar-label';
          barLabel.textContent = progress.current + '/' + progress.total;
          bar.appendChild(barLabel);

          info.appendChild(bar);
        }
      }

      card.appendChild(info);

      // Tier badge
      var badge = document.createElement('div');
      badge.className = 'comp-ach-tier';
      badge.textContent = ach.tier;
      badge.style.color = tierColor;
      card.appendChild(badge);

      container.appendChild(card);
    }
  }

  // ── Event listeners ─────────────────────────────────────
  function setupListeners() {
    document.addEventListener('farm-harvest', function (e) {
      var detail = e.detail || {};
      if (detail.crop) {
        discoverCrop(detail.crop);
        trackHarvest(detail.crop, detail.amount || 0);
        checkAchievements();
      }
    });

    document.addEventListener('farm-plant', function (e) {
      var detail = e.detail || {};
      if (detail.crop) {
        discoverCrop(detail.crop);
        checkAchievements();
      }
    });

    document.addEventListener('silk-road-purchase', function () {
      state.silkRoadPurchases++;
      saveState();
      checkAchievements();
    });

    document.addEventListener('farm-farmhouse-upgrade', function (e) {
      checkAchievements();
    });
  }

  // ── Global API ──────────────────────────────────────────
  window.CompendiumAPI = {
    open: openCompendium,
    close: closeCompendium,
    getDiscoveredCount: getDiscoveredCount,
    getTotalCrops: function () { return TOTAL_CROPS; },
    updateBadge: updateDashBadge
  };

  // ── Init ────────────────────────────────────────────────
  function init() {
    state = loadState();
    migrate();
    setupListeners();

    // Initial achievement check (for farmhouse/full_plots backfill)
    setTimeout(function () {
      checkAchievements();
      updateDashBadge();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
