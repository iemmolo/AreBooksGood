(function () {
  'use strict';

  // ══════════════════════════════════════════════════
  // ── RPG COMBAT ENGINE ─────────────────────────────
  // ══════════════════════════════════════════════════

  // ── Constants ──────────────────────────────────────
  var COMBAT_STORAGE_SUFFIX = '-combat';
  var COMBAT_VERSION = 1;
  var CANVAS_W = 700, CANVAS_H = 320;
  var TURN_TIMEOUT = 60000; // 60s auto-timeout for manual turns
  var BETWEEN_WAVE_DELAY = 2000;
  var WAVE_HEAL_PCT = 0.20;
  var ANIM_TICK = 50;

  // Type effectiveness chart
  // fire > nature > tech > aqua > fire (cycle), shadow <-> mystic (mutual)
  var TYPE_CHART = {
    fire:   { nature: 1.5, aqua: 0.75, fire: 1, tech: 1, shadow: 1, mystic: 1 },
    nature: { tech: 1.5, fire: 0.75, nature: 1, aqua: 1, shadow: 1, mystic: 1 },
    tech:   { aqua: 1.5, nature: 0.75, tech: 1, fire: 1, shadow: 1, mystic: 1 },
    aqua:   { fire: 1.5, tech: 0.75, aqua: 1, nature: 1, shadow: 1, mystic: 1 },
    shadow: { mystic: 1.5, shadow: 1, fire: 1, nature: 1, tech: 1, aqua: 1 },
    mystic: { shadow: 1.5, mystic: 1, fire: 1, nature: 1, tech: 1, aqua: 1 },
    neutral:{ fire: 1, nature: 1, tech: 1, aqua: 1, shadow: 1, mystic: 1, neutral: 1 }
  };

  var STATUS_DURATIONS = {
    burn: 3, poison: 3, bleed: 3, curse: 3, regen: 3,
    stun: 1, slow: 2, atkUp: 3, defUp: 3, atkDown: 3, defDown: 3,
    dodge: 1, taunt: 2, shield: 0, reflect: 0
  };

  // ── State ──────────────────────────────────────────
  var canvas = null;
  var ctx = null;
  var container = null;
  var moveData = null;
  var dungeonData = null;
  var enemyData = null;
  var petCatalog = null;
  var petSpriteData = null;

  var battleState = null; // active battle state or null
  var animFrame = null;
  var turnTimer = null;
  var betweenWaveTimer = null;
  var floatingTexts = [];
  var preloadedImages = {};

  // ── Helpers ────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function randFloat(lo, hi) { return lo + Math.random() * (hi - lo); }

  function randInt(lo, hi) { return Math.floor(randFloat(lo, hi + 1)); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(0, i);
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ── Data Loading ───────────────────────────────────
  function loadData() {
    if (moveData && dungeonData) return;
    try {
      var xhr1 = new XMLHttpRequest();
      xhr1.open('GET', '/data/rpg-moves.json', false);
      xhr1.send();
      if (xhr1.status === 200) moveData = JSON.parse(xhr1.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load moves', e); }
    try {
      var xhr2 = new XMLHttpRequest();
      xhr2.open('GET', '/data/rpg-dungeons.json', false);
      xhr2.send();
      if (xhr2.status === 200) dungeonData = JSON.parse(xhr2.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load dungeons', e); }
    try {
      var xhr3 = new XMLHttpRequest();
      xhr3.open('GET', '/data/dungeon-enemies.json', false);
      xhr3.send();
      if (xhr3.status === 200) enemyData = JSON.parse(xhr3.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load enemies', e); }
    try {
      var xhr4 = new XMLHttpRequest();
      xhr4.open('GET', '/data/petcatalog.json', false);
      xhr4.send();
      if (xhr4.status === 200) petCatalog = JSON.parse(xhr4.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load petcatalog', e); }
    try {
      var xhr5 = new XMLHttpRequest();
      xhr5.open('GET', '/data/petsprites.json', false);
      xhr5.send();
      if (xhr5.status === 200) petSpriteData = JSON.parse(xhr5.responseText);
    } catch (e) { console.warn('rpg-combat: failed to load petsprites', e); }
  }

  // ── Storage (per-slot) ─────────────────────────────
  function getSlotKey() {
    var slotKey = window.__RPG_COMBAT_SLOT_KEY;
    if (slotKey) return slotKey;
    // Derive from skills storage key
    var skillsKey = window.__RPG_STORAGE_KEY;
    if (skillsKey) return skillsKey.replace('-skills', COMBAT_STORAGE_SUFFIX);
    return null;
  }

  function loadCombatState() {
    var key = getSlotKey();
    if (!key) return getDefaultCombatState();
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved && saved.version === COMBAT_VERSION) return saved;
    } catch (e) {}
    return getDefaultCombatState();
  }

  function saveCombatState(state) {
    var key = getSlotKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }

  function getDefaultCombatState() {
    return {
      version: COMBAT_VERSION,
      dungeonProgress: { unlocked: ['rpg-1'], difficulties: {} },
      stats: { raids: 0, clears: 0, totalKills: 0 },
      arenaStats: { fights: 0, wins: 0, bestStreak: 0, currentStreak: 0 }
    };
  }

  // ── Stat Calculation ───────────────────────────────
  var RPG_PET_BASE_STATS = {
    common:    { hp: 80,  atk: 12, def: 8,  spd: 10, cri: 5 },
    rare:      { hp: 100, atk: 15, def: 10, spd: 12, cri: 7 },
    legendary: { hp: 130, atk: 20, def: 14, spd: 15, cri: 10 }
  };

  var RPG_TYPE_LEANINGS = {
    fire: 'atk', aqua: 'def', nature: 'hp',
    tech: 'spd', shadow: 'cri', mystic: null
  };

  function calcGrowth(level) {
    // Diminishing growth: 8% per level 1-30, 4% per level 31-60, 2% per level 61-99
    return 1 + 0.08 * Math.min(level - 1, 30)
             + 0.04 * Math.max(0, Math.min(level - 31, 30))
             + 0.02 * Math.max(0, level - 61);
  }

  function getPetCombatStats(petId, level) {
    if (!petCatalog || !petCatalog.creatures[petId]) return { hp: 1, atk: 1, def: 1, spd: 1, cri: 1 };
    var c = petCatalog.creatures[petId];
    var base = RPG_PET_BASE_STATS[c.tier] || RPG_PET_BASE_STATS.common;
    var leaning = RPG_TYPE_LEANINGS[c.type];
    var growth = calcGrowth(level);
    var stats = {};
    var keys = ['hp', 'atk', 'def', 'spd', 'cri'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = base[k] * growth;
      if (leaning === k) val *= 1.15;
      stats[k] = Math.floor(val);
    }
    return stats;
  }

  function getEnemyCombatStats(enemyId, dungeonStars) {
    if (!enemyData || !enemyData[enemyId]) return { hp: 50, atk: 10, def: 5, spd: 7, cri: 3, type: 'neutral' };
    var e = enemyData[enemyId];
    // Scale enemies by dungeon star rating (1-4)
    var mult = 1 + (dungeonStars - 1) * 0.3;
    return {
      hp:  Math.floor(e.hpBase * mult),
      atk: Math.floor(e.atkBase * mult),
      def: Math.floor(e.defBase * mult),
      spd: Math.floor(e.spdBase * mult),
      cri: Math.floor(e.criBase * mult),
      type: e.type || 'neutral'
    };
  }

  // ── Move Assignment ────────────────────────────────
  function getMovesForPet(petId, level) {
    if (!petCatalog || !moveData) return ['scratch', 'tackle'];
    var c = petCatalog.creatures[petId];
    if (!c) return ['scratch', 'tackle'];
    var petType = c.type;
    var learned = [];
    for (var mid in moveData) {
      var m = moveData[mid];
      if (m.learnLevel > level) continue;
      if (m.specRequired) continue; // skip spec-gated for now
      if (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(petType) >= 0)) {
        learned.push(mid);
      }
    }
    // Sort by power descending, then by learn level
    learned.sort(function (a, b) {
      var ma = moveData[a], mb = moveData[b];
      if ((mb.power || 0) !== (ma.power || 0)) return (mb.power || 0) - (ma.power || 0);
      return mb.learnLevel - ma.learnLevel;
    });
    // Equip top 4
    return learned.slice(0, 4);
  }

  function getEnemyMoves(enemyType) {
    if (!moveData) return ['scratch', 'tackle'];
    var moves = [];
    for (var mid in moveData) {
      var m = moveData[mid];
      if (m.specRequired) continue;
      if (m.learnTypes === null || (m.learnTypes && m.learnTypes.indexOf(enemyType) >= 0)) {
        moves.push(mid);
      }
    }
    moves.sort(function (a, b) { return (moveData[b].power || 0) - (moveData[a].power || 0); });
    return moves.slice(0, 4);
  }

  // ── Fighter Construction ───────────────────────────
  function createPlayerFighter(petId, petData) {
    var level = petData.level || 1;
    var stats = getPetCombatStats(petId, level);
    var creature = petCatalog.creatures[petId];
    var moves = petData.equippedMoves || getMovesForPet(petId, level);
    return {
      id: petId,
      name: creature ? creature.name : petId,
      type: creature ? creature.type : 'neutral',
      tier: creature ? creature.tier : 'common',
      level: level,
      isPlayer: true,
      isAuto: false,
      maxHp: stats.hp,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      cri: stats.cri,
      moves: moves,
      cooldowns: {},
      statuses: [],
      alive: true,
      spriteId: creature ? creature.spriteId : null,
      spriteImg: null
    };
  }

  function createEnemyFighter(enemyId, dungeonStars) {
    var stats = getEnemyCombatStats(enemyId, dungeonStars);
    var eData = enemyData ? enemyData[enemyId] : null;
    var name = eData ? eData.name : enemyId;
    var isBoss = eData ? eData.isBoss : false;
    var moves = getEnemyMoves(stats.type);
    return {
      id: enemyId,
      name: name,
      type: stats.type,
      tier: isBoss ? 'boss' : 'normal',
      level: dungeonStars * 10,
      isPlayer: false,
      isAuto: true,
      maxHp: stats.hp,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      cri: stats.cri,
      moves: moves,
      cooldowns: {},
      statuses: [],
      alive: true,
      spriteUrl: eData ? eData.sprite : null,
      spriteImg: null,
      frameWidth: eData ? eData.frameWidth : 32,
      frameHeight: eData ? eData.frameHeight : 32,
      frames: eData ? eData.frames : 4,
      isBoss: isBoss
    };
  }

  // ── Image Preloading ───────────────────────────────
  function preloadFighterSprites(fighters, cb) {
    var pending = 0;
    var done = function () {
      pending--;
      if (pending <= 0 && cb) cb();
    };
    for (var i = 0; i < fighters.length; i++) {
      var f = fighters[i];
      var url = null;
      if (f.isPlayer && f.spriteId && petSpriteData) {
        var info = petSpriteData[f.spriteId];
        if (info) url = info.altSheet || info.sheet;
      } else if (!f.isPlayer && f.spriteUrl) {
        url = f.spriteUrl;
      }
      if (url) {
        if (preloadedImages[url]) {
          f.spriteImg = preloadedImages[url];
        } else {
          pending++;
          (function (fighter, imgUrl) {
            var img = new Image();
            img.onload = function () {
              preloadedImages[imgUrl] = img;
              fighter.spriteImg = img;
              done();
            };
            img.onerror = done;
            img.src = imgUrl;
          })(f, url);
        }
      }
    }
    if (pending <= 0 && cb) setTimeout(cb, 0);
  }

  // ── Turn Order ─────────────────────────────────────
  function buildTurnOrder(fighters) {
    var alive = [];
    for (var i = 0; i < fighters.length; i++) {
      if (fighters[i].alive) alive.push(fighters[i]);
    }
    // Sort by effective SPD descending
    alive.sort(function (a, b) {
      var spdA = getEffectiveStat(a, 'spd');
      var spdB = getEffectiveStat(b, 'spd');
      if (spdB !== spdA) return spdB - spdA;
      return Math.random() - 0.5; // tie-break random
    });
    return alive;
  }

  function getEffectiveStat(fighter, stat) {
    var base = fighter[stat] || 0;
    var mult = 1;
    for (var i = 0; i < fighter.statuses.length; i++) {
      var s = fighter.statuses[i];
      if (stat === 'atk' && s.type === 'atkUp') mult += 0.3;
      if (stat === 'atk' && s.type === 'atkDown') mult -= 0.25;
      if (stat === 'def' && s.type === 'defUp') mult += 0.3;
      if (stat === 'def' && s.type === 'defDown') mult -= 0.25;
      if (stat === 'spd' && s.type === 'slow') mult -= 0.3;
    }
    return Math.max(1, Math.floor(base * mult));
  }

  // ── Damage Calculation ─────────────────────────────
  function calcDamage(attacker, defender, move) {
    if (!move || move.category === 'status') return 0;
    var power = move.power || 30;
    var atk = getEffectiveStat(attacker, 'atk');
    var def = getEffectiveStat(defender, 'def');
    var ratio = clamp(atk / Math.max(1, def), 0.4, 4.0);

    // STAB (Same Type Attack Bonus)
    var stab = (move.type === attacker.type) ? 1.25 : 1.0;

    // Type effectiveness
    var typeChart = TYPE_CHART[move.type] || TYPE_CHART.neutral;
    var typeMult = typeChart[defender.type] || 1.0;

    // Crit
    var criChance = Math.min((getEffectiveStat(attacker, 'cri') + (move.critBonus || 0)) / 100, 0.5);
    var isCrit = Math.random() < criChance;
    var critMult = isCrit ? 1.5 : 1.0;

    // Variance
    var variance = randFloat(0.9, 1.0);

    // Last Stand bonus: power doubles when HP < 25%
    if (move.id === 'lastStand' && attacker.hp < attacker.maxHp * 0.25) {
      power *= 2;
    }

    var damage = Math.floor(power * ratio * stab * typeMult * critMult * variance);
    return { damage: Math.max(1, damage), isCrit: isCrit, typeMult: typeMult };
  }

  // ── Status Effect Processing ───────────────────────
  function applyStatus(target, statusType, duration) {
    // Check existing
    for (var i = 0; i < target.statuses.length; i++) {
      if (target.statuses[i].type === statusType) {
        target.statuses[i].turns = duration || STATUS_DURATIONS[statusType] || 2;
        return;
      }
    }
    target.statuses.push({
      type: statusType,
      turns: duration || STATUS_DURATIONS[statusType] || 2
    });
  }

  function hasStatus(fighter, statusType) {
    for (var i = 0; i < fighter.statuses.length; i++) {
      if (fighter.statuses[i].type === statusType) return true;
    }
    return false;
  }

  function tickStatuses(fighter) {
    var dmg = 0;
    var healed = 0;
    for (var i = fighter.statuses.length - 1; i >= 0; i--) {
      var s = fighter.statuses[i];
      // Damage-over-time effects
      if (s.type === 'burn') dmg += Math.floor(fighter.maxHp * 0.06);
      if (s.type === 'poison') dmg += Math.floor(fighter.maxHp * 0.05);
      if (s.type === 'bleed') dmg += Math.floor(fighter.maxHp * 0.04);
      if (s.type === 'curse') dmg += Math.floor(fighter.maxHp * 0.08);
      // Heal over time
      if (s.type === 'regen') healed += Math.floor(fighter.maxHp * 0.08);

      s.turns--;
      if (s.turns <= 0) {
        fighter.statuses.splice(i, 1);
      }
    }
    if (dmg > 0) {
      fighter.hp = Math.max(0, fighter.hp - dmg);
      if (fighter.hp <= 0) fighter.alive = false;
    }
    if (healed > 0) {
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + healed);
    }
    return { damage: dmg, healed: healed };
  }

  // ── Move Execution ─────────────────────────────────
  function executeMove(user, target, moveId) {
    if (!moveData || !moveData[moveId]) return null;
    var move = moveData[moveId];
    var result = { moveId: moveId, moveName: move.name, userId: user.id, targetId: target.id,
                   damage: 0, healed: 0, isCrit: false, typeMult: 1, missed: false,
                   statusApplied: null, reflected: false };

    // Note: stun is handled in processNextTurn() — stunned fighters never reach executeMove

    // Dodge check
    if (!move.selfTarget && hasStatus(target, 'dodge')) {
      result.missed = true;
      // Remove dodge
      for (var i = 0; i < target.statuses.length; i++) {
        if (target.statuses[i].type === 'dodge') { target.statuses.splice(i, 1); break; }
      }
      return result;
    }

    // Reflect check
    if (!move.selfTarget && move.category !== 'status' && hasStatus(target, 'reflect')) {
      // Reflect: damage goes back to user
      var dmgResult = calcDamage(user, user, move);
      user.hp = Math.max(0, user.hp - dmgResult.damage);
      if (user.hp <= 0) user.alive = false;
      result.damage = dmgResult.damage;
      result.reflected = true;
      result.isCrit = dmgResult.isCrit;
      // Remove reflect
      for (var i = 0; i < target.statuses.length; i++) {
        if (target.statuses[i].type === 'reflect') { target.statuses.splice(i, 1); break; }
      }
      return result;
    }

    // Self-target moves (status buffs)
    if (move.selfTarget) {
      if (move.effect === 'regen') {
        applyStatus(user, 'regen');
        result.statusApplied = 'regen';
      } else if (move.effect === 'shield') {
        // Shield absorbs 30% max HP worth of damage
        user._shield = Math.floor(user.maxHp * 0.3);
        result.statusApplied = 'shield';
      } else if (move.effect) {
        if (move.aoe) {
          // Apply to all allies
          var allies = getAllies(user);
          for (var a = 0; a < allies.length; a++) {
            applyStatus(allies[a], move.effect);
          }
        } else {
          applyStatus(user, move.effect);
        }
        result.statusApplied = move.effect;
      }
      return result;
    }

    // Damage calculation
    if (move.category !== 'status') {
      var dmgResult = calcDamage(user, target, move);
      result.damage = dmgResult.damage;
      result.isCrit = dmgResult.isCrit;
      result.typeMult = dmgResult.typeMult;

      // Shield absorb
      if (target._shield && target._shield > 0) {
        var absorbed = Math.min(target._shield, result.damage);
        target._shield -= absorbed;
        result.damage -= absorbed;
        if (target._shield <= 0) delete target._shield;
      }

      target.hp = Math.max(0, target.hp - result.damage);
      if (target.hp <= 0) target.alive = false;
    }

    // Status effect application
    if (move.effect && move.effectChance > 0) {
      var targets = move.aoe ? getEnemiesOf(user) : [target];
      for (var t = 0; t < targets.length; t++) {
        if (Math.random() * 100 < move.effectChance) {
          applyStatus(targets[t], move.effect);
          result.statusApplied = move.effect;
        }
      }
    }

    // AoE damage to other targets
    if (move.aoe && move.category !== 'status') {
      var otherTargets = getEnemiesOf(user);
      for (var ot = 0; ot < otherTargets.length; ot++) {
        if (otherTargets[ot].id === target.id) continue;
        if (!otherTargets[ot].alive) continue;
        var aoeDmg = calcDamage(user, otherTargets[ot], move);
        var finalDmg = aoeDmg.damage;
        if (otherTargets[ot]._shield && otherTargets[ot]._shield > 0) {
          var abs = Math.min(otherTargets[ot]._shield, finalDmg);
          otherTargets[ot]._shield -= abs;
          finalDmg -= abs;
        }
        otherTargets[ot].hp = Math.max(0, otherTargets[ot].hp - finalDmg);
        if (otherTargets[ot].hp <= 0) otherTargets[ot].alive = false;
        spawnFloatingText(otherTargets[ot], '-' + finalDmg, aoeDmg.isCrit);
      }
    }

    // Set cooldown
    if (move.cooldown > 0) {
      user.cooldowns[moveId] = move.cooldown;
    }

    return result;
  }

  function getAllies(fighter) {
    if (!battleState) return [fighter];
    var team = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
    var allies = [];
    for (var i = 0; i < team.length; i++) {
      if (team[i].alive) allies.push(team[i]);
    }
    return allies;
  }

  function getEnemiesOf(fighter) {
    if (!battleState) return [];
    var team = fighter.isPlayer ? battleState.enemyTeam : battleState.playerTeam;
    var enemies = [];
    for (var i = 0; i < team.length; i++) {
      if (team[i].alive) enemies.push(team[i]);
    }
    return enemies;
  }

  // ── AI Move Selection ──────────────────────────────
  function aiSelectMove(fighter) {
    var enemies = getEnemiesOf(fighter);
    if (enemies.length === 0) return null;

    var bestMove = null;
    var bestTarget = null;
    var bestScore = -1;

    for (var mi = 0; mi < fighter.moves.length; mi++) {
      var moveId = fighter.moves[mi];
      if (!moveData[moveId]) continue;
      var move = moveData[moveId];
      if (fighter.cooldowns[moveId] && fighter.cooldowns[moveId] > 0) continue;

      if (move.selfTarget) {
        // Evaluate self-target moves
        var score = 0;
        if (move.effect === 'regen' && fighter.hp < fighter.maxHp * 0.5) score = 60;
        else if (move.effect === 'shield') score = 40;
        else if (move.effect === 'defUp') score = 30;
        else if (move.effect === 'atkUp') score = 35;
        else if (move.effect === 'dodge') score = 25;
        else if (move.effect === 'reflect') score = 20;
        if (score > bestScore) {
          bestScore = score;
          bestMove = moveId;
          bestTarget = fighter; // self
        }
        continue;
      }

      for (var ei = 0; ei < enemies.length; ei++) {
        var enemy = enemies[ei];
        var score = move.power || 10;
        // Type advantage bonus
        var typeChart = TYPE_CHART[move.type] || TYPE_CHART.neutral;
        var typeMult = typeChart[enemy.type] || 1;
        score *= typeMult;
        // STAB
        if (move.type === fighter.type) score *= 1.25;
        // Prefer killing blows
        if (enemy.hp < score * 0.5) score *= 1.5;
        // Prefer low HP targets
        score += (1 - enemy.hp / enemy.maxHp) * 20;

        if (score > bestScore) {
          bestScore = score;
          bestMove = moveId;
          bestTarget = enemy;
        }
      }
    }

    // Fallback: scratch
    if (!bestMove) {
      bestMove = fighter.moves[0] || 'scratch';
      bestTarget = enemies[0];
    }

    return { moveId: bestMove, target: bestTarget };
  }

  // ── Battle Flow ────────────────────────────────────
  function startBattle(config) {
    loadData();
    if (!moveData || !enemyData || !petCatalog) {
      console.error('rpg-combat: data not loaded');
      return;
    }

    battleState = {
      mode: config.mode || 'dungeon',
      dungeon: config.dungeon || null,
      currentWave: 0,
      totalWaves: 0,
      playerTeam: [],
      enemyTeam: [],
      turnOrder: [],
      currentTurnIndex: 0,
      phase: 'setup', // setup, wave-intro, player-turn, enemy-turn, animating, between-wave, results
      waitingForInput: false,
      activeFighter: null,
      selectedMove: null,
      targetHighlight: -1,
      kills: 0,
      result: null // { victory, gp, petXp, kills, wavesCleared }
    };

    // Build player team
    var party = config.party || [];
    for (var i = 0; i < party.length; i++) {
      var pf = createPlayerFighter(party[i].id, party[i]);
      battleState.playerTeam.push(pf);
    }

    if (config.mode === 'dungeon' && config.dungeon) {
      battleState.totalWaves = config.dungeon.waves.length;
      setupWave(0);
    } else if (config.mode === 'arena' && config.enemies) {
      battleState.totalWaves = 1;
      for (var ei = 0; ei < config.enemies.length; ei++) {
        battleState.enemyTeam.push(createEnemyFighter(config.enemies[ei], config.stars || 1));
      }
    }

    // Preload sprites then start
    var allFighters = battleState.playerTeam.concat(battleState.enemyTeam);
    preloadFighterSprites(allFighters, function () {
      battleState.phase = 'wave-intro';
      renderBattleUI();
      startAnimLoop();
      // Show wave intro briefly then start turns
      showWaveBanner(battleState.currentWave + 1, battleState.totalWaves, function () {
        startTurnCycle();
      });
    });
  }

  function setupWave(waveIdx) {
    if (!battleState || !battleState.dungeon) return;
    var dungeon = battleState.dungeon;
    battleState.currentWave = waveIdx;
    battleState.enemyTeam = [];

    var wave = dungeon.waves[waveIdx];
    for (var i = 0; i < wave.length; i++) {
      var ef = createEnemyFighter(wave[i], dungeon.stars);
      // Append index for unique ID
      ef.id = wave[i] + '-' + i;
      battleState.enemyTeam.push(ef);
    }

    // Preload new enemy sprites
    preloadFighterSprites(battleState.enemyTeam, function () {});
  }

  function startTurnCycle() {
    if (!battleState) return;
    // Check win/lose before building turn order
    if (checkBattleEnd()) return;

    battleState.turnOrder = buildTurnOrder(battleState.playerTeam.concat(battleState.enemyTeam));
    battleState.currentTurnIndex = 0;
    processNextTurn();
  }

  function processNextTurn() {
    if (!battleState) return;
    // Check win/lose between every turn (not just at round boundaries)
    // so combat doesn't get stuck when last enemy dies mid-round
    if (checkBattleEnd()) return;
    if (battleState.currentTurnIndex >= battleState.turnOrder.length) {
      // End of round: tick statuses, cooldowns, then new round
      endOfRound();
      return;
    }

    var fighter = battleState.turnOrder[battleState.currentTurnIndex];
    if (!fighter.alive) {
      battleState.currentTurnIndex++;
      processNextTurn();
      return;
    }

    battleState.activeFighter = fighter;

    if (hasStatus(fighter, 'stun')) {
      // Stunned: skip turn
      addBattleLog(fighter.name + ' is stunned!');
      spawnFloatingText(fighter, 'STUNNED', false);
      // Remove stun
      for (var i = 0; i < fighter.statuses.length; i++) {
        if (fighter.statuses[i].type === 'stun') { fighter.statuses.splice(i, 1); break; }
      }
      battleState.currentTurnIndex++;
      setTimeout(function () { processNextTurn(); }, 600);
      return;
    }

    if (fighter.isAuto || !fighter.isPlayer) {
      // AI turn
      battleState.phase = 'enemy-turn';
      var aiChoice = aiSelectMove(fighter);
      if (aiChoice) {
        setTimeout(function () {
          executeTurnAction(fighter, aiChoice.moveId, aiChoice.target);
        }, 500);
      } else {
        battleState.currentTurnIndex++;
        processNextTurn();
      }
    } else {
      // Manual player turn
      battleState.phase = 'player-turn';
      battleState.waitingForInput = true;
      battleState.selectedMove = null;
      battleState.targetHighlight = -1;
      renderMoveButtons(fighter);
      // Auto-timeout
      if (turnTimer) clearTimeout(turnTimer);
      turnTimer = setTimeout(function () {
        if (battleState && battleState.waitingForInput) {
          // Auto: AI takes over
          var aiChoice = aiSelectMove(fighter);
          if (aiChoice) executeTurnAction(fighter, aiChoice.moveId, aiChoice.target);
        }
      }, TURN_TIMEOUT);
    }
  }

  function executeTurnAction(fighter, moveId, target) {
    if (!battleState) return;
    battleState.waitingForInput = false;
    battleState.phase = 'animating';
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }

    var result = executeMove(fighter, target, moveId);
    if (!result) {
      battleState.currentTurnIndex++;
      processNextTurn();
      return;
    }

    // Log and visual feedback
    if (result.missed) {
      addBattleLog(fighter.name + ' used ' + result.moveName + ' - MISS!');
      spawnFloatingText(target, 'MISS', false);
    } else if (result.reflected) {
      addBattleLog(fighter.name + ' used ' + result.moveName + ' - REFLECTED for ' + result.damage + '!');
      spawnFloatingText(fighter, '-' + result.damage, result.isCrit);
    } else if (result.damage > 0) {
      var logMsg = fighter.name + ' used ' + result.moveName + ' on ' + target.name + ' for ' + result.damage;
      if (result.isCrit) logMsg += ' (CRIT!)';
      if (result.typeMult > 1) logMsg += ' Super effective!';
      else if (result.typeMult < 1) logMsg += ' Not very effective...';
      addBattleLog(logMsg);
      spawnFloatingText(target, '-' + result.damage, result.isCrit);
      if (result.typeMult > 1) spawnFloatingText(target, 'Super effective!', false);
    } else if (result.statusApplied) {
      addBattleLog(fighter.name + ' used ' + result.moveName + '! (' + result.statusApplied + ')');
      var statusTarget = moveData[moveId].selfTarget ? fighter : target;
      spawnFloatingText(statusTarget, result.statusApplied.toUpperCase(), false);
    } else {
      addBattleLog(fighter.name + ' used ' + result.moveName + '.');
    }

    // Check if target died
    if (target && !target.alive && !target.isPlayer) {
      battleState.kills++;
      addBattleLog(target.name + ' was defeated!');
    }

    // Advance turn after short delay
    setTimeout(function () {
      if (!battleState) return;
      battleState.currentTurnIndex++;
      processNextTurn();
    }, 700);
  }

  function endOfRound() {
    if (!battleState) return;

    // Tick statuses for all alive fighters
    var allFighters = battleState.playerTeam.concat(battleState.enemyTeam);
    for (var i = 0; i < allFighters.length; i++) {
      if (!allFighters[i].alive) continue;
      var result = tickStatuses(allFighters[i]);
      if (result.damage > 0) {
        spawnFloatingText(allFighters[i], '-' + result.damage + ' (dot)', false);
      }
      if (result.healed > 0) {
        spawnFloatingText(allFighters[i], '+' + result.healed, false);
      }
    }

    // Tick cooldowns
    for (var i = 0; i < allFighters.length; i++) {
      for (var cd in allFighters[i].cooldowns) {
        if (allFighters[i].cooldowns[cd] > 0) allFighters[i].cooldowns[cd]--;
      }
    }

    // Check battle end
    if (checkBattleEnd()) return;

    // Next round
    setTimeout(function () { startTurnCycle(); }, 400);
  }

  function checkBattleEnd() {
    if (!battleState) return true;

    var playerAlive = false;
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      if (battleState.playerTeam[i].alive) { playerAlive = true; break; }
    }

    var enemyAlive = false;
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      if (battleState.enemyTeam[i].alive) { enemyAlive = true; break; }
    }

    if (!playerAlive) {
      // Defeat
      battleState.phase = 'results';
      showResults(false);
      return true;
    }

    if (!enemyAlive) {
      // Wave cleared
      var nextWave = battleState.currentWave + 1;
      if (nextWave >= battleState.totalWaves) {
        // Victory!
        battleState.phase = 'results';
        showResults(true);
        return true;
      } else {
        // Between-wave heal
        battleState.phase = 'between-wave';
        betweenWaveHeal();
        showWaveBanner(nextWave + 1, battleState.totalWaves, function () {
          setupWave(nextWave);
          preloadFighterSprites(battleState.enemyTeam, function () {
            startTurnCycle();
          });
        });
        return true; // stops current cycle
      }
    }

    return false;
  }

  function betweenWaveHeal() {
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      var p = battleState.playerTeam[i];
      if (p.alive) {
        var heal = Math.floor(p.maxHp * WAVE_HEAL_PCT);
        p.hp = Math.min(p.maxHp, p.hp + heal);
      }
      // Reset cooldowns, statuses, shields
      p.cooldowns = {};
      p.statuses = [];
      delete p._shield;
    }
  }

  // ── Results ────────────────────────────────────────
  function showResults(victory) {
    if (!battleState) return;
    stopAnimLoop();

    var wavesCleared = victory ? battleState.totalWaves : battleState.currentWave;
    var completionRatio = battleState.totalWaves > 0 ? wavesCleared / battleState.totalWaves : 0;

    var gp = 0;
    var petXp = 0;
    var combatXp = 0;
    var stoneType = null;
    var gotStone = false;

    if (battleState.dungeon) {
      var rewards = battleState.dungeon.rewards;
      gp = Math.floor(rewards.gpBase * completionRatio);
      petXp = Math.floor(rewards.petXpBase * completionRatio);
      combatXp = Math.floor(50 * wavesCleared);

      if (victory && rewards.stoneChance && Math.random() < rewards.stoneChance) {
        stoneType = rewards.stoneType;
        gotStone = true;
      }
    } else if (battleState.mode === 'arena') {
      gp = victory ? 50 : 10;
      petXp = victory ? 30 : 10;
      combatXp = victory ? 30 : 10;
    }

    battleState.result = {
      victory: victory,
      gp: gp,
      petXp: petXp,
      combatXp: combatXp,
      kills: battleState.kills,
      wavesCleared: wavesCleared,
      stoneType: stoneType,
      gotStone: gotStone
    };

    // Apply rewards
    if (window.Wallet && gp > 0) {
      window.Wallet.add(gp);
    }

    // Distribute pet XP
    if (petXp > 0) {
      distributePetXp(petXp);
    }

    // Combat skill XP
    if (combatXp > 0 && window.__RPG_SKILLS_API && window.__RPG_SKILLS_API.addXp) {
      window.__RPG_SKILLS_API.addXp('combat', combatXp);
    }

    // Update combat storage
    var combatSave = loadCombatState();
    if (battleState.mode === 'dungeon') {
      combatSave.stats.raids++;
      combatSave.stats.totalKills += battleState.kills;
      if (victory && battleState.dungeon) {
        combatSave.stats.clears++;
        var did = battleState.dungeon.id;
        if (combatSave.dungeonProgress.unlocked.indexOf(did) < 0) {
          combatSave.dungeonProgress.unlocked.push(did);
        }
        // Unlock next dungeon
        if (dungeonData) {
          for (var di = 0; di < dungeonData.length; di++) {
            if (dungeonData[di].id === did && di + 1 < dungeonData.length) {
              var nextId = dungeonData[di + 1].id;
              if (combatSave.dungeonProgress.unlocked.indexOf(nextId) < 0) {
                combatSave.dungeonProgress.unlocked.push(nextId);
              }
              break;
            }
          }
        }
      }
    } else if (battleState.mode === 'arena') {
      combatSave.arenaStats.fights++;
      if (victory) {
        combatSave.arenaStats.wins++;
        combatSave.arenaStats.currentStreak++;
        if (combatSave.arenaStats.currentStreak > combatSave.arenaStats.bestStreak) {
          combatSave.arenaStats.bestStreak = combatSave.arenaStats.currentStreak;
        }
      } else {
        combatSave.arenaStats.currentStreak = 0;
      }
    }
    saveCombatState(combatSave);

    // Quest hooks
    if (window.QuestSystem) {
      if (battleState.kills > 0) {
        window.QuestSystem.updateObjective('kill_enemies', { count: battleState.kills });
      }
      if (victory && battleState.dungeon) {
        window.QuestSystem.updateObjective('clear_dungeon', { dungeonId: battleState.dungeon.id });
      }
    }

    renderResultsOverlay();
  }

  function distributePetXp(totalXp) {
    if (!battleState) return;
    // Get rpgPets state from rpg.js
    var rpgPets = null;
    if (window.__RPG_GET_PET_STATE) rpgPets = window.__RPG_GET_PET_STATE();
    if (!rpgPets) return;

    var xpPer = Math.floor(totalXp / battleState.playerTeam.length);
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      var pf = battleState.playerTeam[i];
      var petId = pf.id;
      var pet = rpgPets.owned[petId];
      if (!pet) continue;

      // Fainted pets get 50%
      var xpGain = pf.alive ? xpPer : Math.floor(xpPer * 0.5);
      pet.xp = (pet.xp || 0) + xpGain;
      if (pet.totalBattleXp === undefined) pet.totalBattleXp = 0;
      pet.totalBattleXp += xpGain;

      // Level up check
      var catalog = petCatalog.creatures[petId];
      var maxLevel = (pet.levelCap || (catalog ? catalog.maxLevel : 99));
      // For now, use current maxLevel from catalog (Phase 3 will update)
      if (maxLevel <= 3) maxLevel = 30; // common default cap
      var needed = rpgPetXpForLevel(pet.level);
      while (pet.xp >= needed && pet.level < maxLevel) {
        pet.xp -= needed;
        pet.level++;
        needed = rpgPetXpForLevel(pet.level);
        addBattleLog(pf.name + ' leveled up to ' + pet.level + '!');
      }
    }

    if (window.__RPG_SAVE_PET_STATE) window.__RPG_SAVE_PET_STATE(rpgPets);
  }

  function rpgPetXpForLevel(level) {
    return Math.floor(50 + 20 * level + 0.5 * level * level);
  }

  // ── Battle Log ─────────────────────────────────────
  function addBattleLog(text) {
    // Use rpg.js addGameMessage if available
    if (window.__RPG_ADD_GAME_MESSAGE) {
      window.__RPG_ADD_GAME_MESSAGE(text, 'combat');
    }
  }

  // ── Floating Text ──────────────────────────────────
  function spawnFloatingText(fighter, text, isCrit) {
    if (!fighter) return;
    floatingTexts.push({
      text: text,
      fighterId: fighter.id,
      isPlayer: fighter.isPlayer,
      xOffset: randFloat(-8, 8),
      age: 0,
      maxAge: 60, // frames
      isCrit: isCrit
    });
  }

  // ── Wave Banner ────────────────────────────────────
  function showWaveBanner(waveNum, totalWaves, cb) {
    battleState._waveBanner = { text: 'Wave ' + waveNum + ' / ' + totalWaves, age: 0, maxAge: 40 };
    setTimeout(function () {
      if (battleState) battleState._waveBanner = null;
      if (cb) cb();
    }, BETWEEN_WAVE_DELAY);
  }

  // ══════════════════════════════════════════════════
  // ── RENDERING ─────────────────────────────────────
  // ══════════════════════════════════════════════════

  function startAnimLoop() {
    if (animFrame) return;
    var tick = function () {
      renderFrame();
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
  }

  function stopAnimLoop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function renderFrame() {
    if (!canvas || !ctx || !battleState) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    drawBackground();

    // Turn order strip (top)
    drawTurnOrderStrip();

    // Fighters
    drawFighters();

    // Floating texts
    drawFloatingTexts();

    // Wave banner
    if (battleState._waveBanner) {
      drawWaveBanner(battleState._waveBanner);
      battleState._waveBanner.age++;
    }

    // Target highlight
    if (battleState.waitingForInput && battleState.selectedMove !== null) {
      drawTargetHighlights();
    }
  }

  function drawBackground() {
    // Simple gradient background
    var grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Ground line
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, CANVAS_H - 52, CANVAS_W, 2);
  }

  function drawTurnOrderStrip() {
    if (!battleState.turnOrder || battleState.turnOrder.length === 0) return;
    var stripH = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, stripH);

    var x = 8;
    for (var i = 0; i < battleState.turnOrder.length && i < 8; i++) {
      var f = battleState.turnOrder[i];
      if (!f.alive) continue;

      var isActive = (i === battleState.currentTurnIndex);
      var boxW = 22, boxH = 22;

      // Background
      ctx.fillStyle = isActive ? '#ffd700' : (f.isPlayer ? '#4488aa' : '#aa4444');
      ctx.fillRect(x, 3, boxW, boxH);

      // Border
      if (isActive) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, 3, boxW, boxH);
      }

      // Tiny sprite or letter
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.name.charAt(0), x + boxW / 2, 18);

      x += boxW + 4;
    }
    ctx.textAlign = 'left';
  }

  function getFighterPosition(fighter, index, team) {
    var totalInTeam = 0;
    for (var t = 0; t < team.length; t++) {
      if (team[t].alive) totalInTeam++;
    }
    var aliveIdx = 0;
    for (var t = 0; t < team.length; t++) {
      if (team[t] === fighter) break;
      if (team[t].alive) aliveIdx++;
    }

    var spacing = Math.min(120, CANVAS_W / (totalInTeam + 1) / 2);
    var isPlayer = fighter.isPlayer;
    var baseY = isPlayer ? CANVAS_H - 110 : 70;
    var baseX = isPlayer ? 80 : CANVAS_W - 80;
    var dir = isPlayer ? 1 : -1;

    return {
      x: baseX + dir * aliveIdx * spacing,
      y: baseY + aliveIdx * 15
    };
  }

  function drawFighters() {
    // Draw player team
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      drawFighter(battleState.playerTeam[i], i, battleState.playerTeam);
    }
    // Draw enemy team
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      drawFighter(battleState.enemyTeam[i], i, battleState.enemyTeam);
    }
  }

  function drawFighter(fighter, index, team) {
    if (!fighter.alive) return;
    var pos = getFighterPosition(fighter, index, team);
    var size = fighter.isBoss ? 56 : 40;

    // Sprite
    if (fighter.spriteImg) {
      if (fighter.isPlayer) {
        // Pet sprite sheet: use evolution level (from catalog maxLevel), NOT combat level
        var info = petSpriteData ? petSpriteData[fighter.spriteId] : null;
        if (info) {
          var fw = info.frameWidth || 48;
          var fh = info.frameHeight || 48;
          var frameOffset = info.frameOffset || 0;
          // maxLevel from catalog = evolution stage (1/2/3), maps to sprite frame
          var creature = petCatalog ? petCatalog.creatures[fighter.id] : null;
          var evoLevel = creature ? (creature.maxLevel || 1) : 1;
          var frameIdx = Math.min(frameOffset + evoLevel - 1, (info.frames || 3) - 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(fighter.spriteImg, frameIdx * fw, 0, fw, fh,
            pos.x - size / 2, pos.y - size / 2, size, size);
        }
      } else {
        // Enemy sprite: first frame
        var fw = fighter.frameWidth || 32;
        var fh = fighter.frameHeight || 32;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fighter.spriteImg, 0, 0, fw, fh,
          pos.x - size / 2, pos.y - size / 2, size, size);
      }
    } else {
      // Fallback: colored circle
      ctx.fillStyle = fighter.isPlayer ? '#4488cc' : '#cc4444';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fighter.name.substring(0, 4), pos.x, pos.y + 4);
    }

    // Active turn indicator
    if (battleState.activeFighter === fighter) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fighter.name, pos.x, pos.y - size / 2 - 18);

    // HP bar
    var barW = 50, barH = 5;
    var barX = pos.x - barW / 2;
    var barY = pos.y - size / 2 - 12;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    var hpPct = fighter.hp / fighter.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#44cc44' : (hpPct > 0.25 ? '#ccaa44' : '#cc4444');
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Status icons
    if (fighter.statuses.length > 0) {
      var statusX = pos.x - (fighter.statuses.length * 8) / 2;
      for (var si = 0; si < fighter.statuses.length; si++) {
        var s = fighter.statuses[si];
        ctx.fillStyle = getStatusColor(s.type);
        ctx.font = '8px monospace';
        ctx.fillText(getStatusIcon(s.type), statusX + si * 10, pos.y + size / 2 + 10);
      }
    }

    ctx.textAlign = 'left';
  }

  function getStatusColor(type) {
    var colors = {
      burn: '#ff6600', poison: '#88cc00', bleed: '#cc0000', curse: '#8800cc',
      stun: '#ffcc00', slow: '#6688cc', regen: '#00cc44',
      atkUp: '#ff4444', defUp: '#4488ff', atkDown: '#884444', defDown: '#444488',
      dodge: '#ffffff', taunt: '#ff8800', shield: '#88ccff', reflect: '#cc88ff'
    };
    return colors[type] || '#888';
  }

  function getStatusIcon(type) {
    var icons = {
      burn: 'B', poison: 'P', bleed: 'X', curse: 'C',
      stun: 'S', slow: 'W', regen: 'R',
      atkUp: 'A+', defUp: 'D+', atkDown: 'A-', defDown: 'D-',
      dodge: 'E', taunt: 'T', shield: 'H', reflect: 'M'
    };
    return icons[type] || '?';
  }

  function drawTargetHighlights() {
    // Highlight enemy team when selecting target
    for (var i = 0; i < battleState.enemyTeam.length; i++) {
      var f = battleState.enemyTeam[i];
      if (!f.alive) continue;
      var pos = getFighterPosition(f, i, battleState.enemyTeam);
      var isHighlighted = (battleState.targetHighlight === i);

      ctx.strokeStyle = isHighlighted ? '#ffd700' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isHighlighted ? 3 : 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFloatingTexts() {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.age++;
      if (ft.age > ft.maxAge) {
        floatingTexts.splice(i, 1);
        continue;
      }

      // Find fighter position, or use cached last-known position
      var posX, posY;
      var fighter = findFighterById(ft.fighterId);
      if (fighter) {
        var team = fighter.isPlayer ? battleState.playerTeam : battleState.enemyTeam;
        var idx = team.indexOf(fighter);
        var pos = getFighterPosition(fighter, idx, team);
        posX = pos.x;
        posY = pos.y;
        // Cache position for wave transitions
        ft._lastX = posX;
        ft._lastY = posY;
      } else if (ft._lastX !== undefined) {
        posX = ft._lastX;
        posY = ft._lastY;
      } else {
        floatingTexts.splice(i, 1);
        continue;
      }

      var alpha = 1 - (ft.age / ft.maxAge);
      var yOffset = -ft.age * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = ft.isCrit ? 'bold 14px monospace' : '11px monospace';
      ctx.fillStyle = ft.isCrit ? '#ffd700' : (ft.text.charAt(0) === '+' ? '#44ff44' : '#ff4444');
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, posX + ft.xOffset, posY - 30 + yOffset);
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  function drawWaveBanner(banner) {
    var alpha = 1;
    if (banner.age < 10) alpha = banner.age / 10;
    if (banner.age > 30) alpha = 1 - (banner.age - 30) / 10;
    alpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(CANVAS_W / 2 - 120, CANVAS_H / 2 - 25, 240, 50);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(CANVAS_W / 2 - 120, CANVAS_H / 2 - 25, 240, 50);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(banner.text, CANVAS_W / 2, CANVAS_H / 2 + 6);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function findFighterById(id) {
    if (!battleState) return null;
    var all = battleState.playerTeam.concat(battleState.enemyTeam);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  // ── DOM UI ─────────────────────────────────────────
  function renderBattleUI() {
    var btnsContainer = $('rpg-combat-moves');
    var actionsBar = $('rpg-combat-actions');
    if (btnsContainer) btnsContainer.innerHTML = '';
    if (actionsBar) actionsBar.style.display = '';
  }

  function renderMoveButtons(fighter) {
    var btnsContainer = $('rpg-combat-moves');
    if (!btnsContainer) return;
    btnsContainer.innerHTML = '';

    for (var mi = 0; mi < fighter.moves.length; mi++) {
      var moveId = fighter.moves[mi];
      var move = moveData ? moveData[moveId] : null;
      if (!move) continue;

      var btn = document.createElement('button');
      btn.className = 'rpg-combat-move-btn';
      var onCooldown = fighter.cooldowns[moveId] && fighter.cooldowns[moveId] > 0;

      // Type color class
      btn.setAttribute('data-type', move.type);
      btn.setAttribute('data-move-id', moveId);

      var label = move.name;
      if (move.power > 0) label += ' ' + move.power;
      if (onCooldown) label += ' (CD:' + fighter.cooldowns[moveId] + ')';
      btn.textContent = label;

      if (onCooldown) {
        btn.disabled = true;
        btn.classList.add('on-cooldown');
      }

      btn.addEventListener('click', (function (mid, m) {
        return function () {
          if (!battleState || !battleState.waitingForInput) return;
          if (m.selfTarget) {
            // Self-target: execute immediately
            executeTurnAction(battleState.activeFighter, mid, battleState.activeFighter);
          } else {
            // Need target selection
            battleState.selectedMove = mid;
            highlightTargets();
          }
        };
      })(moveId, move));

      btnsContainer.appendChild(btn);
    }
  }

  function highlightTargets() {
    if (!battleState) return;
    // Register canvas click handler for target selection
    if (canvas && !canvas._combatClickHandler) {
      canvas._combatClickHandler = function (e) {
        if (!battleState || !battleState.waitingForInput || !battleState.selectedMove) return;
        var rect = canvas.getBoundingClientRect();
        var scaleX = CANVAS_W / rect.width;
        var scaleY = CANVAS_H / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        // Check if clicked on an enemy
        for (var i = 0; i < battleState.enemyTeam.length; i++) {
          var f = battleState.enemyTeam[i];
          if (!f.alive) continue;
          var pos = getFighterPosition(f, i, battleState.enemyTeam);
          var dx = mx - pos.x, dy = my - pos.y;
          if (dx * dx + dy * dy < 900) { // ~30px radius
            executeTurnAction(battleState.activeFighter, battleState.selectedMove, f);
            return;
          }
        }
      };
      canvas.addEventListener('click', canvas._combatClickHandler);
    }

    // Also handle hover for highlight
    if (canvas && !canvas._combatMoveHandler) {
      canvas._combatMoveHandler = function (e) {
        if (!battleState || !battleState.waitingForInput || !battleState.selectedMove) {
          battleState && (battleState.targetHighlight = -1);
          return;
        }
        var rect = canvas.getBoundingClientRect();
        var scaleX = CANVAS_W / rect.width;
        var scaleY = CANVAS_H / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        battleState.targetHighlight = -1;
        for (var i = 0; i < battleState.enemyTeam.length; i++) {
          var f = battleState.enemyTeam[i];
          if (!f.alive) continue;
          var pos = getFighterPosition(f, i, battleState.enemyTeam);
          var dx = mx - pos.x, dy = my - pos.y;
          if (dx * dx + dy * dy < 900) {
            battleState.targetHighlight = i;
            break;
          }
        }
      };
      canvas.addEventListener('mousemove', canvas._combatMoveHandler);
    }
  }

  function renderResultsOverlay() {
    if (!battleState || !battleState.result) return;
    var overlay = $('rpg-combat-results');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rpg-combat-results';
      overlay.className = 'rpg-combat-results';
      if (container) container.appendChild(overlay);
    }

    var r = battleState.result;
    var html = '<div class="rpg-combat-results-inner">';
    html += '<h3 class="rpg-combat-results-title">' + (r.victory ? 'VICTORY!' : 'DEFEAT') + '</h3>';
    html += '<div class="rpg-combat-results-stats">';
    html += '<div>Waves Cleared: ' + r.wavesCleared + '/' + battleState.totalWaves + '</div>';
    html += '<div>Enemies Defeated: ' + r.kills + '</div>';
    html += '<div>GP Earned: <span class="rpg-combat-gp">+' + r.gp + '</span></div>';
    html += '<div>Pet XP: <span class="rpg-combat-xp">+' + r.petXp + '</span></div>';
    html += '<div>Combat XP: <span class="rpg-combat-xp">+' + r.combatXp + '</span></div>';
    if (r.gotStone) {
      html += '<div class="rpg-combat-stone">Evolution Stone (' + r.stoneType + ') obtained!</div>';
    }
    html += '</div>';
    html += '<button class="rpg-btn rpg-btn-primary rpg-combat-continue-btn" id="rpg-combat-continue">Continue</button>';
    html += '</div>';

    overlay.innerHTML = html;
    overlay.style.display = 'flex';

    $('rpg-combat-continue').addEventListener('click', function () {
      overlay.style.display = 'none';
      cleanup();
      if (window.RpgCombat.onComplete) {
        window.RpgCombat.onComplete(r);
      }
    });
  }

  // ── Modal Overlay Close Helper ──────────────────────
  function attachModalOverlayClose(modal) {
    if (modal._overlayCloseHandler) {
      modal.removeEventListener('click', modal._overlayCloseHandler);
    }
    modal._overlayCloseHandler = function (e) {
      if (e.target === modal) modal.style.display = 'none';
    };
    modal.addEventListener('click', modal._overlayCloseHandler);
  }

  // ── Dungeon Select Modal ───────────────────────────
  function showDungeonSelect(rpgPets, totalLevel) {
    loadData();
    if (!dungeonData) return;

    var combatSave = loadCombatState();
    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
    }

    var html = '<div class="rpg-modal rpg-dungeon-select">';
    html += '<div class="rpg-modal-header"><h3>Dungeon Gate</h3>';
    html += '<button class="rpg-modal-close" id="rpg-dungeon-close">&times;</button></div>';
    html += '<div class="rpg-dungeon-grid">';

    for (var i = 0; i < dungeonData.length; i++) {
      var d = dungeonData[i];
      var unlocked = combatSave.dungeonProgress.unlocked.indexOf(d.id) >= 0;
      var meetsLevel = totalLevel >= d.requiredTotalLevel;
      var canEnter = unlocked && meetsLevel;

      html += '<div class="rpg-dungeon-card' + (canEnter ? '' : ' locked') + '" data-dungeon-idx="' + i + '">';
      html += '<div class="rpg-dungeon-name">' + d.name + '</div>';
      html += '<div class="rpg-dungeon-stars">';
      for (var s = 0; s < d.stars; s++) html += '<span class="rpg-star">&#9733;</span>';
      html += '</div>';
      html += '<div class="rpg-dungeon-desc">' + d.desc + '</div>';
      html += '<div class="rpg-dungeon-info">' + d.waves.length + ' waves &middot; Party: ' + d.partySize + '</div>';
      if (!unlocked) html += '<div class="rpg-dungeon-lock">Locked</div>';
      else if (!meetsLevel) html += '<div class="rpg-dungeon-lock">Requires Total Lv ' + d.requiredTotalLevel + '</div>';
      html += '</div>';
    }

    html += '</div></div>';
    modal.innerHTML = html;
    modal.style.display = 'flex';

    $('rpg-dungeon-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });

    // Card clicks
    var cards = modal.querySelectorAll('.rpg-dungeon-card:not(.locked)');
    for (var ci = 0; ci < cards.length; ci++) {
      cards[ci].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-dungeon-idx'));
        var dungeon = dungeonData[idx];
        if (dungeon) {
          modal.style.display = 'none';
          showTeamBuilder(dungeon, rpgPets);
        }
      });
    }

    // Close on overlay click (use stored handler to prevent accumulation)
    attachModalOverlayClose(modal);
  }

  // ── Team Builder ───────────────────────────────────
  function showTeamBuilder(dungeon, rpgPets) {
    var modal = $('rpg-dungeon-modal');
    if (!modal) return;

    var ownedIds = Object.keys(rpgPets.owned);
    var selectedPets = [];
    var maxParty = dungeon.partySize || 3;

    function render() {
      var html = '<div class="rpg-modal rpg-team-builder">';
      html += '<div class="rpg-modal-header"><h3>Build Your Team — ' + dungeon.name + '</h3>';
      html += '<button class="rpg-modal-close" id="rpg-team-close">&times;</button></div>';
      html += '<div class="rpg-team-info">Select up to ' + maxParty + ' pets</div>';
      html += '<div class="rpg-team-grid">';

      for (var i = 0; i < ownedIds.length; i++) {
        var pid = ownedIds[i];
        var pet = rpgPets.owned[pid];
        var creature = petCatalog ? petCatalog.creatures[pid] : null;
        if (!creature) continue;
        var isSelected = selectedPets.indexOf(pid) >= 0;
        var stats = getPetCombatStats(pid, pet.level);

        html += '<div class="rpg-team-pet' + (isSelected ? ' selected' : '') + '" data-pet-id="' + pid + '">';
        html += '<div class="rpg-team-pet-name">' + creature.name + ' Lv' + pet.level + '</div>';
        html += '<div class="rpg-team-pet-type">' + creature.type + '</div>';
        html += '<div class="rpg-team-pet-stats">HP:' + stats.hp + ' ATK:' + stats.atk + ' DEF:' + stats.def + '</div>';
        if (isSelected) html += '<div class="rpg-team-pet-check">&#10003;</div>';
        html += '</div>';
      }

      html += '</div>';
      html += '<div class="rpg-team-actions">';
      html += '<button class="rpg-btn rpg-btn-primary" id="rpg-team-enter"' + (selectedPets.length === 0 ? ' disabled' : '') + '>Enter Dungeon (' + selectedPets.length + '/' + maxParty + ')</button>';
      html += '</div></div>';

      modal.innerHTML = html;
      modal.style.display = 'flex';

      // Bind events
      $('rpg-team-close').addEventListener('click', function () {
        modal.style.display = 'none';
      });

      var petCells = modal.querySelectorAll('.rpg-team-pet');
      for (var ci = 0; ci < petCells.length; ci++) {
        petCells[ci].addEventListener('click', function () {
          var pid = this.getAttribute('data-pet-id');
          var idx = selectedPets.indexOf(pid);
          if (idx >= 0) {
            selectedPets.splice(idx, 1);
          } else if (selectedPets.length < maxParty) {
            selectedPets.push(pid);
          }
          render();
        });
      }

      var enterBtn = $('rpg-team-enter');
      if (enterBtn && selectedPets.length > 0) {
        enterBtn.addEventListener('click', function () {
          modal.style.display = 'none';
          // Build party config
          var party = [];
          for (var pi = 0; pi < selectedPets.length; pi++) {
            var pid = selectedPets[pi];
            var pet = rpgPets.owned[pid];
            party.push({
              id: pid,
              level: pet.level,
              xp: pet.xp,
              equippedMoves: pet.equippedMoves || getMovesForPet(pid, pet.level)
            });
          }
          // Signal rpg.js to switch to combat
          if (window.__RPG_START_COMBAT) {
            window.__RPG_START_COMBAT({
              mode: 'dungeon',
              dungeon: dungeon,
              party: party
            });
          }
        });
      }

      attachModalOverlayClose(modal);
    }

    render();
  }

  // ── Arena (1v1) Quick Entry ────────────────────────
  function showArenaSelect(rpgPets) {
    loadData();
    if (!enemyData) return;

    var modal = $('rpg-dungeon-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rpg-dungeon-modal';
      modal.className = 'rpg-modal-overlay';
      document.body.appendChild(modal);
    }

    var ownedIds = Object.keys(rpgPets.owned);
    var selectedPet = null;

    function render() {
      var html = '<div class="rpg-modal rpg-arena-select">';
      html += '<div class="rpg-modal-header"><h3>Training Arena</h3>';
      html += '<button class="rpg-modal-close" id="rpg-arena-close">&times;</button></div>';
      html += '<div class="rpg-team-info">Choose a pet for 1v1 combat</div>';
      html += '<div class="rpg-team-grid">';

      for (var i = 0; i < ownedIds.length; i++) {
        var pid = ownedIds[i];
        var pet = rpgPets.owned[pid];
        var creature = petCatalog ? petCatalog.creatures[pid] : null;
        if (!creature) continue;
        var isSelected = (selectedPet === pid);
        var stats = getPetCombatStats(pid, pet.level);

        html += '<div class="rpg-team-pet' + (isSelected ? ' selected' : '') + '" data-pet-id="' + pid + '">';
        html += '<div class="rpg-team-pet-name">' + creature.name + ' Lv' + pet.level + '</div>';
        html += '<div class="rpg-team-pet-type">' + creature.type + '</div>';
        html += '<div class="rpg-team-pet-stats">HP:' + stats.hp + ' ATK:' + stats.atk + '</div>';
        if (isSelected) html += '<div class="rpg-team-pet-check">&#10003;</div>';
        html += '</div>';
      }

      html += '</div>';
      html += '<div class="rpg-team-actions">';
      html += '<button class="rpg-btn rpg-btn-primary" id="rpg-arena-fight"' + (!selectedPet ? ' disabled' : '') + '>Fight!</button>';
      html += '</div></div>';

      modal.innerHTML = html;
      modal.style.display = 'flex';

      $('rpg-arena-close').addEventListener('click', function () {
        modal.style.display = 'none';
      });

      var petCells = modal.querySelectorAll('.rpg-team-pet');
      for (var ci = 0; ci < petCells.length; ci++) {
        petCells[ci].addEventListener('click', function () {
          selectedPet = this.getAttribute('data-pet-id');
          render();
        });
      }

      var fightBtn = $('rpg-arena-fight');
      if (fightBtn && selectedPet) {
        fightBtn.addEventListener('click', function () {
          modal.style.display = 'none';
          var pet = rpgPets.owned[selectedPet];
          var level = pet ? pet.level : 1;

          // Pick a random enemy scaled to pet level
          var enemyIds = Object.keys(enemyData);
          var normalEnemies = [];
          for (var ei = 0; ei < enemyIds.length; ei++) {
            if (!enemyData[enemyIds[ei]].isBoss) normalEnemies.push(enemyIds[ei]);
          }
          var randomEnemy = normalEnemies[randInt(0, normalEnemies.length - 1)];

          if (window.__RPG_START_COMBAT) {
            window.__RPG_START_COMBAT({
              mode: 'arena',
              party: [{
                id: selectedPet,
                level: level,
                xp: pet ? pet.xp : 0,
                equippedMoves: (pet && pet.equippedMoves) ? pet.equippedMoves : getMovesForPet(selectedPet, level)
              }],
              enemies: [randomEnemy],
              stars: Math.max(1, Math.floor(level / 10))
            });
          }
        });
      }

      attachModalOverlayClose(modal);
    }

    render();
  }

  // ── Init / Cleanup ─────────────────────────────────
  function init(canvasEl, containerEl) {
    canvas = canvasEl;
    ctx = canvas ? canvas.getContext('2d') : null;
    container = containerEl;
    if (canvas) {
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
    }
    loadData();
  }

  function cleanup() {
    stopAnimLoop();
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
    if (betweenWaveTimer) { clearTimeout(betweenWaveTimer); betweenWaveTimer = null; }
    if (canvas) {
      if (canvas._combatClickHandler) {
        canvas.removeEventListener('click', canvas._combatClickHandler);
        canvas._combatClickHandler = null;
      }
      if (canvas._combatMoveHandler) {
        canvas.removeEventListener('mousemove', canvas._combatMoveHandler);
        canvas._combatMoveHandler = null;
      }
    }
    battleState = null;
    floatingTexts = [];
    var overlay = $('rpg-combat-results');
    if (overlay) overlay.style.display = 'none';
    var moveBtns = $('rpg-combat-moves');
    if (moveBtns) moveBtns.innerHTML = '';
  }

  function isActive() {
    return battleState !== null && battleState.phase !== 'results';
  }

  function toggleAuto(enabled) {
    if (!battleState) return;
    for (var i = 0; i < battleState.playerTeam.length; i++) {
      battleState.playerTeam[i].isAuto = enabled;
    }
    // If currently waiting for manual input, kick off AI immediately
    if (enabled && battleState.waitingForInput && battleState.activeFighter) {
      battleState.waitingForInput = false;
      if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
      var aiChoice = aiSelectMove(battleState.activeFighter);
      if (aiChoice) {
        executeTurnAction(battleState.activeFighter, aiChoice.moveId, aiChoice.target);
      }
    }
  }

  // ── Public API ─────────────────────────────────────
  window.RpgCombat = {
    init: init,
    startBattle: startBattle,
    cleanup: cleanup,
    isActive: isActive,
    onComplete: null,
    showDungeonSelect: showDungeonSelect,
    showArenaSelect: showArenaSelect,
    loadCombatState: loadCombatState,
    getMovesForPet: getMovesForPet,
    toggleAuto: toggleAuto
  };

})();
