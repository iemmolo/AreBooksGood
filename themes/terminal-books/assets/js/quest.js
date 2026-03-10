(function () {
  'use strict';

  // ── Constants ─────────────────────────────────
  var QUEST_SLOT_PREFIX = 'rpg-slot-';
  var QUEST_SUFFIX = '-quests';
  var STATE_VERSION = 1;

  // ── State ─────────────────────────────────────
  var questDefs = null;   // loaded from quests.json
  var questState = null;  // per-slot quest state
  var slotIdx = -1;
  var initialized = false;

  // ── Load Quest Definitions ────────────────────
  function loadQuestDefs(callback) {
    if (questDefs) { callback(); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/data/quests.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { questDefs = JSON.parse(xhr.responseText); } catch (e) { questDefs = {}; }
      } else {
        questDefs = {};
      }
      callback();
    };
    xhr.onerror = function () { questDefs = {}; callback(); };
    xhr.send();
  }

  // ── Storage ───────────────────────────────────
  function storageKey() {
    return QUEST_SLOT_PREFIX + slotIdx + QUEST_SUFFIX;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.version === STATE_VERSION) return s;
      }
    } catch (e) {}
    return { version: STATE_VERSION, active: {}, completed: [], renown: 0 };
  }

  function saveState() {
    if (slotIdx < 0) return;
    try {
      localStorage.setItem(storageKey(), JSON.stringify(questState));
    } catch (e) {}
  }

  // ── Core API ──────────────────────────────────
  function canStart(questId) {
    var def = questDefs[questId];
    if (!def) return false;
    if (questState.active[questId]) return false;
    if (questState.completed.indexOf(questId) !== -1) return false;
    // Check prerequisite quests
    if (def.requirements && def.requirements.quests) {
      for (var i = 0; i < def.requirements.quests.length; i++) {
        if (questState.completed.indexOf(def.requirements.quests[i]) === -1) return false;
      }
    }
    return true;
  }

  function startQuest(questId) {
    if (!canStart(questId)) return false;
    var def = questDefs[questId];
    var objectives = [];
    for (var i = 0; i < def.objectives.length; i++) {
      objectives.push({ current: 0, target: def.objectives[i].count || 1 });
    }
    questState.active[questId] = {
      status: 'in_progress',
      objectives: objectives,
      startedAt: Date.now()
    };
    saveState();

    // Notify UI
    showQuestToast('New Quest: ' + def.name);
    addQuestMessage(def.dialogue.start, 'quest');
    renderQuestTab();
    return true;
  }

  function updateObjective(type, data) {
    if (!questState || !questDefs) return;
    var changed = false;

    for (var qid in questState.active) {
      if (!questState.active.hasOwnProperty(qid)) continue;
      var entry = questState.active[qid];
      if (entry.status !== 'in_progress') continue;
      var def = questDefs[qid];
      if (!def) continue;

      for (var i = 0; i < def.objectives.length; i++) {
        var obj = def.objectives[i];
        if (obj.type !== type) continue;
        if (entry.objectives[i].current >= entry.objectives[i].target) continue;

        var match = false;
        if (type === 'hatch_pets') {
          match = true;
        } else if (type === 'visit_location') {
          match = data && data.location === obj.target;
        } else if (type === 'gather_resource') {
          // Match generic resource categories or specific names
          if (obj.resource === 'ore' && data && data.category === 'ore') match = true;
          else if (obj.resource === 'fish' && data && data.category === 'fish') match = true;
          else if (obj.resource === 'log' && data && data.category === 'log') match = true;
          else if (data && data.item === obj.resource) match = true;
        } else if (type === 'reach_level') {
          match = data && data.skill === obj.skill && data.level >= obj.count;
          if (match) entry.objectives[i].current = data.level;
        } else if (type === 'craft_item') {
          if (obj.resource === 'bar' && data && data.category === 'bar') match = true;
          else if (data && data.item === obj.resource) match = true;
        } else if (type === 'clear_dungeon') {
          match = data && data.dungeonId === obj.target;
        } else if (type === 'kill_enemies') {
          match = true;
        } else if (type === 'arena_wins') {
          match = true;
        } else if (type === 'arena_streak') {
          match = data && data.streak >= obj.count;
          if (match) entry.objectives[i].current = data.streak;
        } else if (type === 'defeat_boss') {
          match = true;
        }

        if (match && type !== 'reach_level' && type !== 'arena_streak') {
          entry.objectives[i].current += (data && data.count) || 1;
          changed = true;
        } else if (match) {
          changed = true;
        }

        // Check if objective is complete
        if (entry.objectives[i].current >= entry.objectives[i].target) {
          entry.objectives[i].current = entry.objectives[i].target;
        }
      }

      // Check if all objectives complete
      var allDone = true;
      for (var j = 0; j < entry.objectives.length; j++) {
        if (entry.objectives[j].current < entry.objectives[j].target) { allDone = false; break; }
      }
      if (allDone && entry.status === 'in_progress') {
        entry.status = 'ready_to_turn_in';
        changed = true;
        // Auto-complete quests (no NPC turn-in needed yet)
        completeQuest(qid);
      }
    }

    if (changed) {
      saveState();
      renderQuestTab();
    }
  }

  function completeQuest(questId) {
    var entry = questState.active[questId];
    var def = questDefs[questId];
    if (!entry || !def) return;

    // Move to completed
    delete questState.active[questId];
    if (questState.completed.indexOf(questId) === -1) {
      questState.completed.push(questId);
    }

    // Award rewards
    var rewards = def.rewards || {};
    if (rewards.renown) {
      questState.renown = (questState.renown || 0) + rewards.renown;
    }

    // GP reward via wallet
    if (rewards.gp && window.Wallet) {
      window.Wallet.add(rewards.gp);
    }

    // XP rewards via skills API
    if (rewards.xp && window.__RPG_SKILLS_API) {
      for (var skill in rewards.xp) {
        if (rewards.xp.hasOwnProperty(skill)) {
          window.__RPG_SKILLS_API.addXp(skill, rewards.xp[skill]);
        }
      }
    }

    saveState();

    // Notify
    var rewardText = [];
    if (rewards.gp) rewardText.push(rewards.gp + ' GP');
    if (rewards.renown) rewardText.push(rewards.renown + ' Renown');
    if (rewards.xp) {
      for (var s in rewards.xp) {
        if (rewards.xp.hasOwnProperty(s)) rewardText.push(rewards.xp[s] + ' ' + s + ' XP');
      }
    }

    showQuestCompleteBanner(def.name, rewardText);
    addQuestMessage('Quest complete! ' + def.name + ' — Rewards: ' + rewardText.join(', '), 'reward');
    if (def.dialogue.complete) {
      addQuestMessage(def.dialogue.complete, 'quest');
    }

    renderQuestTab();

    // Chain quest (guard against cleanup between now and setTimeout)
    if (def.chain && questDefs[def.chain]) {
      var nextDef = questDefs[def.chain];
      if (nextDef.autoStart && canStart(def.chain)) {
        var chainId = def.chain;
        setTimeout(function () {
          if (!initialized || !questState) return;
          startQuest(chainId);
        }, 1500);
      }
    }
  }

  // ── UI: Quest Tab ─────────────────────────────
  function renderQuestTab() {
    var pane = document.getElementById('osrs-chat-quest');
    if (!pane) return;

    var html = '';
    var activeCount = 0;

    // Active quests
    for (var qid in questState.active) {
      if (!questState.active.hasOwnProperty(qid)) continue;
      var entry = questState.active[qid];
      var def = questDefs[qid];
      if (!def) continue;
      activeCount++;

      html += '<div class="quest-entry quest-entry--active">';
      html += '<div class="quest-entry-header">';
      html += '<span class="quest-name">' + def.name + '</span>';
      html += '<span class="quest-badge quest-badge--' + def.difficulty + '">' + def.difficulty + '</span>';
      html += '</div>';

      for (var i = 0; i < def.objectives.length; i++) {
        var obj = def.objectives[i];
        var prog = entry.objectives[i];
        var pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
        html += '<div class="quest-objective">';
        html += '<span class="quest-objective-text">' + obj.description + '</span>';
        html += '<div class="quest-progress-bar"><div class="quest-progress-fill" style="width:' + pct + '%"></div></div>';
        html += '<span class="quest-progress-text">' + prog.current + '/' + prog.target + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Completed summary
    if (questState.completed.length > 0) {
      html += '<div class="quest-completed-summary">';
      html += '<span class="quest-completed-count">' + questState.completed.length + ' quest' + (questState.completed.length !== 1 ? 's' : '') + ' completed</span>';
      html += '<span class="quest-renown">Renown: ' + (questState.renown || 0) + '</span>';
      html += '</div>';
    }

    if (activeCount === 0 && questState.completed.length === 0) {
      html = '<div class="osrs-chatbox-empty">No active quests. Explore JackTown to find your first quest.</div>';
    }

    pane.innerHTML = html;

    // Mark quest tab as unread if not active
    if (typeof window.__RPG_MARK_TAB_UNREAD === 'function') {
      window.__RPG_MARK_TAB_UNREAD('quest');
    }
  }

  // ── UI: Toast Notification ────────────────────
  function showQuestToast(text) {
    var existing = document.querySelector('.quest-toast');
    if (existing) existing.parentNode.removeChild(existing);

    var toast = document.createElement('div');
    toast.className = 'quest-toast';
    toast.textContent = text;
    var gameScreen = document.getElementById('rpg-game-screen');
    if (gameScreen) {
      gameScreen.appendChild(toast);
      setTimeout(function () { toast.classList.add('quest-toast--visible'); }, 50);
      setTimeout(function () {
        toast.classList.remove('quest-toast--visible');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
      }, 3000);
    }
  }

  function showQuestCompleteBanner(questName, rewardTexts) {
    var existing = document.querySelector('.quest-complete-banner');
    if (existing) existing.parentNode.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.className = 'quest-complete-banner';

    var inner = document.createElement('div');
    inner.className = 'quest-complete-banner-inner';

    var title = document.createElement('div');
    title.className = 'quest-complete-banner-title';
    title.textContent = 'QUEST COMPLETE';
    inner.appendChild(title);

    var name = document.createElement('div');
    name.className = 'quest-complete-banner-name';
    name.textContent = questName;
    inner.appendChild(name);

    if (rewardTexts && rewardTexts.length > 0) {
      var rewards = document.createElement('div');
      rewards.className = 'quest-complete-banner-rewards';
      rewards.textContent = rewardTexts.join('  ·  ');
      inner.appendChild(rewards);
    }

    overlay.appendChild(inner);

    var gameScreen = document.getElementById('rpg-game-screen');
    if (gameScreen) {
      gameScreen.appendChild(overlay);
      setTimeout(function () { overlay.classList.add('quest-complete-banner--visible'); }, 50);
      setTimeout(function () {
        overlay.classList.add('quest-complete-banner--fade');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 600);
      }, 4000);
    }
  }

  // ── UI: Chat Message ──────────────────────────
  function addQuestMessage(text, type) {
    // Use rpg.js addGameMessage if available
    var pane = document.getElementById('osrs-chat-game');
    if (!pane) return;
    var msg = document.createElement('div');
    msg.className = 'osrs-game-msg osrs-game-msg--' + (type || 'quest');
    msg.textContent = text;
    pane.appendChild(msg);
    var body = document.getElementById('osrs-chatbox-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  // ── Public API ────────────────────────────────
  window.QuestSystem = {
    init: function (slot) {
      slotIdx = slot;
      loadQuestDefs(function () {
        questState = loadState();
        initialized = true;
        renderQuestTab();
      });
    },

    startQuest: function (questId) {
      if (!initialized) return false;
      return startQuest(questId);
    },

    updateObjective: function (type, data) {
      if (!initialized) return;
      updateObjective(type, data);
    },

    completeQuest: function (questId) {
      if (!initialized) return;
      completeQuest(questId);
    },

    canStart: function (questId) {
      if (!initialized || !questDefs) return false;
      return canStart(questId);
    },

    isCompleted: function (questId) {
      if (!questState) return false;
      return questState.completed.indexOf(questId) !== -1;
    },

    isActive: function (questId) {
      if (!questState) return false;
      return !!questState.active[questId];
    },

    getState: function () { return questState; },
    getDefs: function () { return questDefs; },

    cleanup: function () {
      questState = null;
      slotIdx = -1;
      initialized = false;
    },

    renderQuestTab: renderQuestTab
  };

})();
