(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var META_KEY = 'rpg-meta';
  var SLOT_PREFIX = 'rpg-slot-';
  var SKILLS_SUFFIX = '-skills';
  var MAX_SLOTS = 3;

  var SKILL_KEYS = ['mining', 'fishing', 'woodcutting', 'smithing', 'combat'];
  var SKILL_ICONS = {
    mining: '\u26CF',
    fishing: '\uD83C\uDFA3',
    woodcutting: '\uD83E\uDE93',
    smithing: '\uD83D\uDD28',
    combat: '\u2694'
  };

  var LOCATIONS = [
    { id: 'town', name: 'Town Hub', icon: '\uD83C\uDFE0', desc: 'Home, shop, and tavern', skill: null },
    { id: 'mine', name: 'Mining Camp', icon: '\u26CF\uFE0F', desc: 'Mine ores and gems', skill: 'mining' },
    { id: 'dock', name: 'Fishing Dock', icon: '\uD83C\uDFA3', desc: 'Cast your line', skill: 'fishing' },
    { id: 'forest', name: 'Lumber Forest', icon: '\uD83C\uDF32', desc: 'Chop trees for wood', skill: 'woodcutting' },
    { id: 'smithy', name: 'Smithy', icon: '\uD83D\uDD25', desc: 'Smelt and forge', skill: 'smithing' },
    { id: 'arena', name: 'Training Arena', icon: '\u2694\uFE0F', desc: 'Fight monsters', skill: 'combat' }
  ];

  // ── State ─────────────────────────────────────
  var meta = null;
  var activeSlot = -1;
  var currentScreen = 'rpg-menu-screen';
  var createTargetSlot = -1;

  // ── Helpers ───────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.slots) return parsed;
      }
    } catch (e) {}
    return { currentSlot: -1, slots: [null, null, null] };
  }

  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  function slotStorageKey(idx) {
    return SLOT_PREFIX + idx + SKILLS_SUFFIX;
  }

  function getSlotSkillsState(idx) {
    try {
      var raw = localStorage.getItem(slotStorageKey(idx));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function getTotalLevel(idx) {
    var ss = getSlotSkillsState(idx);
    if (!ss || !ss.skills) return 5; // default 5 (each skill starts at 1)
    var total = 0;
    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var sk = ss.skills[SKILL_KEYS[i]];
      total += (sk && sk.level) ? sk.level : 1;
    }
    return total;
  }

  function getSkillLevel(idx, skill) {
    var ss = getSlotSkillsState(idx);
    if (!ss || !ss.skills || !ss.skills[skill]) return 1;
    return ss.skills[skill].level || 1;
  }

  function formatDate(ts) {
    if (!ts) return 'Never';
    var d = new Date(ts);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ── Screen Manager ────────────────────────────
  function showScreen(id) {
    var screens = document.querySelectorAll('.rpg-screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].style.display = 'none';
    }
    var target = $(id);
    if (target) target.style.display = 'block';
    currentScreen = id;
  }

  // ── Menu Screen ───────────────────────────────
  function renderMenuScreen() {
    var slotsPanel = $('rpg-save-slots');
    slotsPanel.style.display = 'none';

    // Check if any saves exist for Continue button state
    var hasSaves = false;
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (meta.slots[i]) { hasSaves = true; break; }
    }
    var continueBtn = $('rpg-btn-continue');
    continueBtn.disabled = !hasSaves;
    if (!hasSaves) {
      continueBtn.classList.add('rpg-btn-disabled');
    } else {
      continueBtn.classList.remove('rpg-btn-disabled');
    }
  }

  function renderSaveSlots(mode) {
    var grid = $('rpg-slots-grid');
    grid.innerHTML = '';

    for (var i = 0; i < MAX_SLOTS; i++) {
      var slot = meta.slots[i];
      var card = document.createElement('div');
      card.className = 'rpg-slot-card' + (slot ? '' : ' rpg-slot-empty');
      card.setAttribute('data-slot', i);

      if (slot) {
        var info = document.createElement('div');
        info.className = 'rpg-slot-info';
        info.innerHTML = '<div class="rpg-slot-name">' + escapeHtml(slot.name) + '</div>' +
          '<div class="rpg-slot-level">Total Lv: ' + getTotalLevel(i) + '</div>' +
          '<div class="rpg-slot-date">Last: ' + formatDate(slot.lastPlayed) + '</div>';

        var actions = document.createElement('div');
        actions.className = 'rpg-slot-actions';

        if (mode === 'continue') {
          var playBtn = document.createElement('button');
          playBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
          playBtn.textContent = 'Play';
          playBtn.setAttribute('data-slot', i);
          playBtn.addEventListener('click', onSlotPlay);
          actions.appendChild(playBtn);
        }

        var delBtn = document.createElement('button');
        delBtn.className = 'rpg-btn rpg-btn-small rpg-btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.setAttribute('data-slot', i);
        delBtn.addEventListener('click', onSlotDelete);
        actions.appendChild(delBtn);

        card.appendChild(info);
        card.appendChild(actions);
      } else {
        var emptyLabel = document.createElement('div');
        emptyLabel.className = 'rpg-slot-empty-label';
        emptyLabel.textContent = '[ Empty Slot ' + (i + 1) + ' ]';

        if (mode === 'new') {
          var createBtn = document.createElement('button');
          createBtn.className = 'rpg-btn rpg-btn-small rpg-btn-primary';
          createBtn.textContent = 'Create';
          createBtn.setAttribute('data-slot', i);
          createBtn.addEventListener('click', onSlotCreate);
          card.appendChild(emptyLabel);
          card.appendChild(createBtn);
        } else {
          card.appendChild(emptyLabel);
        }
      }

      grid.appendChild(card);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Menu Event Handlers ───────────────────────
  function onNewGame() {
    // Check if any empty slot exists
    var hasEmpty = false;
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (!meta.slots[i]) { hasEmpty = true; break; }
    }
    if (!hasEmpty) {
      alert('All save slots are full. Delete a save to create a new character.');
      return;
    }
    renderSaveSlots('new');
    $('rpg-save-slots').style.display = 'block';
  }

  function onContinue() {
    renderSaveSlots('continue');
    $('rpg-save-slots').style.display = 'block';
  }

  function onSlotsBack() {
    $('rpg-save-slots').style.display = 'none';
  }

  function onSlotCreate(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    createTargetSlot = slot;
    $('rpg-name-input').value = '';
    $('rpg-btn-begin').disabled = true;
    showScreen('rpg-create-screen');
    $('rpg-name-input').focus();
  }

  function onSlotPlay(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    enterGame(slot);
  }

  function onSlotDelete(e) {
    var slot = parseInt(e.target.getAttribute('data-slot'), 10);
    var slotData = meta.slots[slot];
    if (!slotData) return;
    if (!confirm('Delete save "' + slotData.name + '"? This cannot be undone.')) return;

    meta.slots[slot] = null;
    localStorage.removeItem(slotStorageKey(slot));
    saveMeta();
    // Re-render whichever mode we're in
    var slotsPanel = $('rpg-save-slots');
    if (slotsPanel.style.display !== 'none') {
      // Determine mode from context
      var hasPlay = slotsPanel.querySelector('.rpg-btn-primary[data-slot]');
      var mode = (hasPlay && hasPlay.textContent === 'Play') ? 'continue' : 'new';
      renderSaveSlots(mode);
    }
    renderMenuScreen();
  }

  // ── Character Creation ────────────────────────
  function onNameInput() {
    var name = $('rpg-name-input').value.trim();
    $('rpg-btn-begin').disabled = !name;
  }

  function onBeginAdventure() {
    var name = $('rpg-name-input').value.trim();
    if (!name || createTargetSlot < 0) return;

    var now = Date.now();
    meta.slots[createTargetSlot] = {
      name: name,
      created: now,
      lastPlayed: now
    };
    meta.currentSlot = createTargetSlot;
    saveMeta();

    enterGame(createTargetSlot);
  }

  function onCreateBack() {
    showScreen('rpg-menu-screen');
    renderMenuScreen();
  }

  // ── Game Entry ────────────────────────────────
  function enterGame(slot) {
    activeSlot = slot;
    meta.currentSlot = slot;
    meta.slots[slot].lastPlayed = Date.now();
    saveMeta();

    // Set up RPG storage key for skills.js
    window.__RPG_STORAGE_KEY = slotStorageKey(slot);

    renderWorldMap();
    showScreen('rpg-world-screen');
  }

  // ── World Map ─────────────────────────────────
  function renderWorldMap() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    var slot = meta.slots[activeSlot];

    // Header
    $('rpg-world-name').textContent = slot.name;
    $('rpg-world-total').textContent = 'Total Lv: ' + getTotalLevel(activeSlot);

    // Location tiles
    var grid = $('rpg-locations-grid');
    grid.innerHTML = '';

    for (var i = 0; i < LOCATIONS.length; i++) {
      var loc = LOCATIONS[i];
      var tile = document.createElement('div');
      tile.className = 'rpg-location-tile';
      tile.setAttribute('data-location', loc.id);

      var icon = document.createElement('div');
      icon.className = 'rpg-location-icon';
      icon.textContent = loc.icon;

      var name = document.createElement('div');
      name.className = 'rpg-location-name';
      name.textContent = loc.name;

      var desc = document.createElement('div');
      desc.className = 'rpg-location-desc';
      desc.textContent = loc.desc;

      tile.appendChild(icon);
      tile.appendChild(name);
      tile.appendChild(desc);

      // Show skill level on skill locations
      if (loc.skill) {
        var lvl = getSkillLevel(activeSlot, loc.skill);
        var lvlEl = document.createElement('div');
        lvlEl.className = 'rpg-location-level';
        lvlEl.textContent = 'Lv ' + lvl;
        tile.appendChild(lvlEl);
      }

      tile.addEventListener('click', onLocationClick);
      grid.appendChild(tile);
    }
  }

  function onLocationClick(e) {
    var tile = e.target.closest('.rpg-location-tile');
    if (!tile) return;
    var locId = tile.getAttribute('data-location');

    if (locId === 'town') {
      enterHome();
      return;
    }

    // Find location
    var loc = null;
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === locId) { loc = LOCATIONS[i]; break; }
    }
    if (!loc || !loc.skill) return;

    enterSkillLocation(loc);
  }

  // ── Skill Location Entry ──────────────────────
  function enterSkillLocation(loc) {
    $('rpg-location-title').textContent = loc.name;

    // Move skills panel into location content area
    var container = $('rpg-skills-container');
    var content = $('rpg-location-content');
    var skillsPage = container.querySelector('#skills-page');

    if (skillsPage) {
      content.innerHTML = '';
      content.appendChild(skillsPage);
    }

    showScreen('rpg-location-screen');

    // Set the storage key and trigger skills.js reinit
    window.__RPG_STORAGE_KEY = slotStorageKey(activeSlot);
    window.dispatchEvent(new Event('rpg-skills-init'));

    // Auto-select the correct skill after a brief delay for DOM to settle
    setTimeout(function () {
      var skillRow = document.querySelector('.skill-row[data-skill="' + loc.skill + '"]');
      if (skillRow) skillRow.click();
    }, 100);
  }

  function exitSkillLocation() {
    // Cleanup skills.js state
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    // Move skills panel back to hidden container
    var container = $('rpg-skills-container');
    var content = $('rpg-location-content');
    var skillsPage = content.querySelector('#skills-page');

    if (skillsPage) {
      container.appendChild(skillsPage);
    }
    content.innerHTML = '';

    renderWorldMap();
    showScreen('rpg-world-screen');
  }

  // ── Home / Character Sheet ────────────────────
  function enterHome() {
    if (activeSlot < 0 || !meta.slots[activeSlot]) return;
    var slot = meta.slots[activeSlot];

    $('rpg-home-name').textContent = slot.name;

    // Render skill levels
    var skillsDiv = $('rpg-home-skills');
    skillsDiv.innerHTML = '<h3 class="rpg-home-section-title">Skills</h3>';

    var skillsGrid = document.createElement('div');
    skillsGrid.className = 'rpg-home-skills-grid';

    for (var i = 0; i < SKILL_KEYS.length; i++) {
      var sk = SKILL_KEYS[i];
      var lvl = getSkillLevel(activeSlot, sk);
      var ss = getSlotSkillsState(activeSlot);
      var xp = 0;
      var xpNeeded = 50;
      if (ss && ss.skills && ss.skills[sk]) {
        xp = ss.skills[sk].xp || 0;
        // XP formula from skills.js: floor(50 * 1.08^(level-1))
        xpNeeded = Math.floor(50 * Math.pow(1.08, lvl - 1));
      }
      var pct = Math.min(100, Math.round((xp / xpNeeded) * 100));

      var row = document.createElement('div');
      row.className = 'rpg-home-skill-row';
      if (lvl >= 99) row.classList.add('rpg-home-skill-mastered');

      row.innerHTML = '<span class="rpg-home-skill-icon">' + (SKILL_ICONS[sk] || '') + '</span>' +
        '<span class="rpg-home-skill-name">' + sk.charAt(0).toUpperCase() + sk.slice(1) + '</span>' +
        '<span class="rpg-home-skill-level">Lv ' + lvl + '</span>' +
        '<div class="rpg-home-skill-xp-bar"><div class="rpg-home-skill-xp-fill" style="width:' + pct + '%"></div></div>';

      skillsGrid.appendChild(row);
    }
    skillsDiv.appendChild(skillsGrid);

    // Render inventory summary
    var invDiv = $('rpg-home-inventory');
    invDiv.innerHTML = '<h3 class="rpg-home-section-title">Inventory</h3>';

    var ss = getSlotSkillsState(activeSlot);
    if (ss && ss.inventory) {
      var keys = [];
      for (var k in ss.inventory) {
        if (ss.inventory.hasOwnProperty(k) && ss.inventory[k] > 0) {
          keys.push(k);
        }
      }
      if (keys.length > 0) {
        var invGrid = document.createElement('div');
        invGrid.className = 'rpg-home-inv-grid';
        keys.sort();
        for (var j = 0; j < keys.length; j++) {
          var item = document.createElement('div');
          item.className = 'rpg-home-inv-item';
          item.textContent = keys[j] + ' x' + ss.inventory[keys[j]];
          invGrid.appendChild(item);
        }
        invDiv.appendChild(invGrid);
      } else {
        invDiv.innerHTML += '<div class="rpg-home-empty">No items yet. Visit skill locations to gather resources!</div>';
      }
    } else {
      invDiv.innerHTML += '<div class="rpg-home-empty">No items yet. Visit skill locations to gather resources!</div>';
    }

    showScreen('rpg-home-screen');
  }

  // ── Save & Quit ───────────────────────────────
  function onSaveQuit() {
    if (activeSlot >= 0 && meta.slots[activeSlot]) {
      meta.slots[activeSlot].lastPlayed = Date.now();
      saveMeta();
    }

    // Clean up skills if active
    if (typeof window.__RPG_SKILLS_CLEANUP === 'function') {
      window.__RPG_SKILLS_CLEANUP();
    }

    // Move skills panel back if it was moved
    var container = $('rpg-skills-container');
    var content = $('rpg-location-content');
    if (content) {
      var skillsPage = content.querySelector('#skills-page');
      if (skillsPage) {
        container.appendChild(skillsPage);
      }
      content.innerHTML = '';
    }

    activeSlot = -1;
    window.__RPG_STORAGE_KEY = null;
    showScreen('rpg-menu-screen');
    renderMenuScreen();
  }

  // ── Init ──────────────────────────────────────
  function init() {
    if (!$('rpg-page')) return;

    meta = loadMeta();

    // Set RPG mode flag so skills.js knows not to auto-init
    window.__RPG_STORAGE_KEY = '__rpg_pending__';

    // Wire up menu buttons
    $('rpg-btn-new').addEventListener('click', onNewGame);
    $('rpg-btn-continue').addEventListener('click', onContinue);
    $('rpg-slots-back').addEventListener('click', onSlotsBack);
    $('rpg-create-back').addEventListener('click', onCreateBack);
    $('rpg-btn-begin').addEventListener('click', onBeginAdventure);
    $('rpg-name-input').addEventListener('input', onNameInput);
    $('rpg-btn-save-quit').addEventListener('click', onSaveQuit);
    $('rpg-btn-back-map').addEventListener('click', exitSkillLocation);
    $('rpg-btn-back-world').addEventListener('click', function () {
      renderWorldMap();
      showScreen('rpg-world-screen');
    });

    // Enter key submits character creation
    $('rpg-name-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !$('rpg-btn-begin').disabled) {
        onBeginAdventure();
      }
    });

    renderMenuScreen();
    showScreen('rpg-menu-screen');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
