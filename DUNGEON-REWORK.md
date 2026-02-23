Dungeon Rework — RSL-Inspired Expansion (7 Phases)
====================================================

Current state: 20 dungeons, 5 modes (Dungeons/Daily/Spire/Titan/Faction Wars),
4 difficulties (Normal/Hard/Brutal/Nightmare), 42 enemies, gear system with
5 rarities, set bonuses, alt skins, TitanAnimator, save/resume.

---

## Asset Inventory

| Pack | Location | Key Sprites | Frame Size | Use |
|------|----------|-------------|------------|-----|
| Demon Slime Boss | `boss_demon_slime_FREE_v1.0/` | 1 demon boss — idle(6f), walk, cleave, hit(5f), death(7f) | 288x160 spritesheet | Animated Titan + D16 boss |
| Fantasy Enemy Pack | `Free Fantasy Enemy Pack 1/No Outlines/` | CursedSpirit, Pumpkin, CloudMonster | Large sheets | Animated Titans + D14/16/17 bosses |
| Samurai | `FREE_Samurai 2D Pixel Art v1.2/Sprites/` | IDLE(960x96, 10f) | 96x96 per frame | Ronin Samurai enemy (D18/19/20 boss) |
| Frogger | `Frogger/` | idle(640x128, 5f), heal, spit, hurt | 128x128 per frame | Dungeon boss + future creature |
| Monsters_Creatures_Fantasy | `Monsters_Creatures_Fantasy/` | Flying Eye, Goblin, Mushroom, Skeleton | 150x150 per frame | D13-20 enemies |
| Golems_Free_Version | `Golems_Free_Version/` | Blue Golem, Orange Golem | 90x64 per frame | D15-17 enemies |
| DarkFantasyEnemies_FREE | `DarkFantasyEnemies_FREE/` | Bat | 64x64 per frame | D13/17-20 enemy |
| FlyingForestEnemies_FREE | `FlyingForestEnemies_FREE/` | Forest Flyer | 64x64 per frame | D14/19/20 enemy |

---

## localStorage Keys (New)

| Key | Phase | Description |
|-----|-------|-------------|
| `arebooksgood-daily` | 4 | Daily Challenge: date, streak, completion |
| `arebooksgood-spire` | 4 | Spire: best floor, current run |
| `arebooksgood-titan` | 4 | Titan: attempts/day, damage, kills |
| `arebooksgood-faction` | 4 | Faction Wars: marks, weekly rotation, completions |
| `arebooksgood-fragments` | 5 | Fragment collection: `{ creatureId: count }` |
| `arebooksgood-arena` | 6 | Arena state: Elo rating, season, fight log |
| `arebooksgood-challenges` | 6 | Challenge mission progress |
| `arebooksgood-doom` | 7 | Doom Tower state: current floor, monthly reset, HP carry |
| `arebooksgood-runes` | 7 | Rune inventory + equipped runes per gear piece |

---

## Phase 1: New Dungeons 9-12 + Frogger Boss — COMPLETE

**Goal**: Extend dungeon campaign from 8 to 12, add Frogger as a boss enemy.

### Asset Work
- [x] Copy Frogger sprites to `static/images/pets/enemies/frogger-*.png`
- [x] Create dungeon background images bg-9 through bg-12

### Data
- [x] Add Frogger boss, Iron Golem, Void Mimic to dungeon-enemies.json
- [x] Add boss loot, skin rewards D9-12, Marsh Dweller set to dungeongear.json

### Code: battle.js
- [x] Add Dungeons 9-12 to DUNGEONS array + DUNGEON_BG

---

## Phase 2: Animated Titan Visual Upgrade — COMPLETE (data/CSS intact, JS restored in P4)

**Goal**: Animated spritesheets for titan bosses.

### Data/Assets
- [x] Titan sprites deployed to `static/images/pets/titans/`
- [x] `titanSprites` config in dungeongear.json (4 titans with full anim configs)

### Code: battle.js (restored in Phase 4)
- [x] TitanAnimator: init/setAnim/update/draw/phaseTransition/drawPhaseText
- [x] Hook into drawEnemySprite (isTitan check)
- [x] Hook into lunge/shake/faint animation cases
- [x] Phase transition VFX (canvas shake + text overlay)
- [x] Titan anim ticked in startEnemyAnimLoop

### Code: battle.css
- [x] `.bt-phase-shake` keyframe, titan styling

---

## Phase 3: Nightmare Difficulty + Faction Wars — COMPLETE (data/CSS intact, JS restored in P4)

### Nightmare Difficulty
- [x] Data: nightmare config in dungeongear.json (3x HP, 2.2x ATK, 4x rewards)
- [x] Code: isDifficultyUnlocked nightmare gate (requires brutal clear)
- [x] Code: markDungeonCleared + isDungeonClearedAny nightmare tracking
- [x] Code: renderDifficultyPicker with 4 diffs
- [x] Code: Enrage mechanic (+5% ATK per wave) in doNextWave
- [x] CSS: `.bt-diff-nightmare` badge styling

### Faction Wars
- [x] Code: FACTION_CHALLENGES (6 type-restricted challenges)
- [x] Code: getFactionWeekKey + getActiveFactions (seeded 3/6 weekly rotation)
- [x] Code: loadFactionState/saveFactionState
- [x] Code: showFactionScreen, startFactionChallenge
- [x] Code: Faction Marks in endDungeon (10/20/40/80 by difficulty)
- [x] Code: Mode tab + results return to faction screen
- [x] HTML: bt-faction-screen container
- [x] CSS: Faction screen styling

---

## Phase 4: Restore + New Enemies + Dungeons 13-20 — COMPLETE

**Goal**: Restore all lost JS from P1-3 (accidentally reverted), deploy 13 new enemies from 4 asset packs, add 8 new dungeons (13-20), bringing total to 20.

### 4A: Restore Lost JS — COMPLETE
- [x] Game mode infrastructure: gameMode variable, renderModeTabs, hideAllScreens
- [x] showScreen updated for daily/spire/titan/faction screens
- [x] Daily Challenge: modifiers, seed, streak, showDailyScreen, startDailyChallenge
- [x] Daily modifier hooks: glass-cannon (calcDamage), no-heal (executeAction)
- [x] Daily completion + streak rewards in endDungeon
- [x] Spire: loadSpireState/saveSpireState, showSpireScreen, startSpireRun
- [x] Spire: spireNextFloor with scaling enemies, endSpire
- [x] Spire: hook in runAutoBattle (floor advance instead of wave transition)
- [x] Titan: loadTitanState/saveTitanState, showTitanScreen, createTitanFighter
- [x] Titan: startTitanMode, checkTitanPhaseTransition, endTitanAttempt
- [x] Titan: enemy override in startDungeon, titanAnimInit
- [x] TitanAnimator: titanAnim state, init/setAnim/update/draw/phaseTransition/drawPhaseText
- [x] TitanAnimator hooks: drawEnemySprite isTitan check, lunge/shake/faint cases
- [x] TitanAnimator: ticked in startEnemyAnimLoop, phase text drawn in renderBattle
- [x] Nightmare: isDifficultyUnlocked, isDungeonClearedAny, markDungeonCleared
- [x] Nightmare: renderDifficultyPicker + dungeon card badges with 4 diffs
- [x] Nightmare: enrage mechanic in doNextWave
- [x] Faction Wars: FACTION_CHALLENGES, getFactionWeekKey, getActiveFactions
- [x] Faction Wars: loadFactionState/saveFactionState, showFactionScreen, startFactionChallenge
- [x] Faction Wars: marks awarded in endDungeon, results return to faction screen
- [x] Results continue button: mode-aware return (faction/daily/spire/titan/dungeon)

### 4B: Deploy New Enemy Sprites — COMPLETE
- [x] Flying Eye → `static/images/pets/enemies/flying-eye.png`
- [x] Goblin → `static/images/pets/enemies/fantasy-goblin.png`
- [x] Mushroom → `static/images/pets/enemies/mushroom-warrior.png`
- [x] Skeleton → `static/images/pets/enemies/skeleton-knight.png`
- [x] Blue Golem → `static/images/pets/enemies/golem-blue.png`
- [x] Orange Golem → `static/images/pets/enemies/golem-orange.png`
- [x] Dark Bat → `static/images/pets/enemies/dark-bat.png`
- [x] Forest Flyer → `static/images/pets/enemies/forest-flyer.png`
- [x] Samurai → `static/images/pets/enemies/samurai-boss.png` (moved from champion/)
- [x] Background tiles bg-13 through bg-20 created

### 4C: New Enemies in dungeon-enemies.json — COMPLETE
- [x] 9 new sprite-based enemies (flying-eye, fantasy-goblin, mushroom-warrior, skeleton-knight, golem-blue, golem-orange, dark-bat, forest-flyer, samurai-boss)
- [x] 4 titan-reuse enemies (demon-slime-boss, cursed-spirit-boss, pumpkin-boss, cloud-boss)

### 4D: Dungeons 13-20 — COMPLETE
- [x] D13 Bone Yard (shadow, 5 waves, 3*)
- [x] D14 Fungal Depths (nature, 6 waves, 4*)
- [x] D15 Golem Forge (any, 6 waves, 4*)
- [x] D16 Inferno Pit (fire, 6 waves, 4*)
- [x] D17 Storm Peaks (aqua, 7 waves, 4*)
- [x] D18 Ronin's Keep (mystic, 7 waves, 5*)
- [x] D19 Cursed Cathedral (any, 8 waves, 5*)
- [x] D20 The Abyss (any, 10 waves, 5*)
- [x] DUNGEON_BG entries 9-20

### 4E: Boss Loot + Skin Rewards — COMPLETE
- [x] 7 boss loot entries (Bone Blade, Eye Amulet, Ronin Katana, Demon Core, Spirit Flame, Vine Crown, Storm Orb)
- [x] Skin rewards D13-20
- [x] 2 new gear sets: Bone Collector, Elemental Fury

### 4F: Verification — COMPLETE
- [x] Hugo builds clean
- [x] All JSON valid
- [x] All 41 enemy IDs in dungeon waves exist in dungeon-enemies.json
- [x] JS syntax valid (node --check)
- [x] Mode tabs render for all 5 modes
- [x] 20 dungeons in grid

---

## Backlog: Dungeon UI Polish

- [ ] Visual indicator when all difficulties of a dungeon are cleared (gold border, checkmark, or crown on card)
- [ ] Per-difficulty completion badges on dungeon cards — show which difficulties (Normal/Hard/Brutal/Nightmare) have been beaten

---

## Phase 5: Frogger Creature + Fragment/Shard System

**Goal**: Add Frogger as a collectible creature and introduce fragment-based creature acquisition.

- [ ] Extract Frogger evolution strip (144x48) + alt skin
- [ ] Add to petsprites.json (both copies) + petcatalog.json
- [ ] Fragment system: FRAGMENT_CONFIG, load/save, drops in endDungeon
- [ ] Fragment panel in shop.js
- [ ] Frogger unique moveset (Bubble, Spit Venom, Heal Wave, Tongue Lash)

**Estimated scope**: ~310 lines JS, ~15 lines JSON

---

## Phase 6: Arena (PvP Sim) + Challenge Missions

**Goal**: Add competitive PvP simulation and achievement-style missions.

- [ ] Arena: procedural opponents, Elo rating, weekly seasons, bracket rewards
- [ ] 20+ challenge missions across 4 tiers (Bronze/Silver/Gold/Platinum)
- [ ] Mission progress checked after dungeon/arena/spire results
- [ ] New screens in single.html, new CSS

**Estimated scope**: ~385 lines JS, ~115 lines CSS

---

## Phase 7: Doom Tower + Rune System

**Goal**: Add a monthly challenge tower and a gear augmentation system.

- [ ] 30-floor monthly tower, 1 attempt/day, HP carries between floors
- [ ] Boss floors every 5 floors with curated encounters
- [ ] Rune drops from boss floors (6 types, 3 levels)
- [ ] Rune slots on gear (1 per piece), rune upgrade with coins

**Estimated scope**: ~360 lines JS, ~90 lines CSS, ~30 lines JSON

---

## Implementation Order & Dependencies

```
Phase 1-4 (Complete)
  └─→ Phase 5 (Frogger Creature + Fragments)
        └─→ Phase 6 (Arena + Challenges)
              └─→ Phase 7 (Doom Tower + Runes)
```
