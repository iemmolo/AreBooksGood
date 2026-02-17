# Farm Page + Tower Defense - Final Design Plan

---

## Tower Defense Progress Checklist

### Phase 1a: Core Skeleton
- [x] Content page + layout template + CSS + JS files created
- [x] Conditional asset loading wired in head.html / baseof.html
- [x] Game tile added to games hub
- [x] Canvas rendering: responsive, DPR-aware, theme-reactive
- [x] 16x12 grid with S-curve path rendered
- [x] Arrow tower (1 type): placement, ghost preview, targeting, firing
- [x] Slime enemy (1 type): spawn, path-follow, HP bar, death
- [x] Projectile system (dots travel to target, apply damage)
- [x] Particle system (damage numbers, death burst, JB float)
- [x] Wave system: scaling HP/count, 0.8s spawn stagger, JB rewards
- [x] Lives system (20 starting, -1 per leak)
- [x] HUD (DOM): wave, lives, JB, enemy count
- [x] Start overlay + game over overlay + stats persistence
- [x] JackBucks integration (earnings → real JB balance)
- [x] Theme switching updates canvas colors immediately

### Phase 1b: Expand Core
- [ ] Cannon tower (splash damage)
- [ ] Frost tower (slow effect)
- [ ] Skeleton enemy, Goblin enemy
- [ ] Tower upgrade system (Lv1→2→3)
- [ ] Tower selection/inspection + sell
- [ ] Boss wave every 10 waves
- [ ] Wave scaling tuning

### Phase 1c: Pet Hero
- [ ] Pet sprite on canvas
- [ ] Click to reposition pet
- [ ] Auto-attack nearest enemy
- [ ] Q ability (burst damage) + W ability (heal lives)
- [ ] Ability buttons + keyboard shortcuts + cooldown timers

### Phase 2: Farm-TD Integration
- [ ] td-unlocks.js global unlock tracker
- [ ] Blueprint gating retrofit on farm buildings
- [ ] Material tower upgrades (Lv2-3 require processed resources)
- [ ] New material-gated towers (Fire, Wall, Sniper, Gold Mine, Lightning)
- [ ] Consumables (Bread, Smoked Fish)

### Phase 3: Pet Heroes (Full Differentiation)
- [ ] Cat hero (fast melee, Pounce, Nine Lives)
- [ ] Dragon hero (ranged AOE, Inferno, Flame Shield)
- [ ] Robot hero (long-range laser, EMP Blast, Shield Generator)

### Phase 4: Polish & Expansion
- [ ] Sprite assets
- [ ] More enemies + multi-phase boss
- [ ] Tower targeting options + speed controls
- [ ] Additional maps
- [ ] Mobile touch controls
- [ ] Sound effects

---

## Context

Expand the existing farming system into a dedicated interactive farm page (idle game) and add a tower defense game. The two systems feed each other: farm resources upgrade TD towers, TD wave rewards unlock farm buildings. Pets serve as hero units in TD.

## Key Decisions Made

- **Farm strip**: Becomes a **notification dashboard** (Option B). Mini tile row showing station icons that pulse/glow when resources ready. Clicking goes to farm page. Same look and feel as current strip.
- **Farm grid**: **Fixed layout** - buildings appear in pre-set positions, no placement UI needed.
- **Sprites**: **Simple shapes first** - colored rectangles/circles/text labels for MVP. Pixel art added as polish later.
- **Processing unlocks**: **Tiered** - basic stations (mill, sawmill, mason) available from start. Advanced (forge, loom, enchanter) require TD blueprint unlocks.
- **TD controls**: **Buttons + keyboard** - ability buttons below canvas with cooldown timers, plus Q/W keyboard shortcuts.
- **Farm page rendering**: **DOM** (not canvas) - matches existing box-shadow system, CSS theming works automatically.
- **TD rendering**: **Canvas** - matches existing canvas games, better for many moving entities.

---

## Farm Dashboard Strip (Replaces Current Plot Strip)

The existing bottom strip transforms from showing crop plots to a compact dashboard. Same visual style, same position, same green gradient background.

### Strip Layout
```
[ 🌾x3 | 🥚x4 | 🪵x8 | ⛏x2 | 🐟x1 | ⚙ Flour 2m | → Farm ]
```

- Row of mini station tiles (same size as current plot tiles, ~48x48px)
- Each tile shows the station icon + ready count badge
- Tiles **pulse/glow** when resources are ready to collect (reuse `farm-plot-pulse` animation)
- Tiles that have nothing ready appear dimmer
- A processing indicator shows current active job + time remaining
- Clicking any tile navigates to `/games/farm/`
- Existing crop plots become one of the tiles (shows harvestable count)
- The farmhouse widget stays as-is (it's already in the strip)
- Pet mini-sprite stays in the strip as-is

### Implementation Notes
- Modify `farm.js` to detect if `farm-resources.js` is loaded (it will be, globally)
- Replace the plot-rendering loop with a tile-rendering loop that reads from `FarmResources.getSummary()`
- `FarmResources.getSummary()` returns `{ crops: 3, eggs: 4, wood: 8, stone: 2, fish: 1, processing: { item: 'flour', remaining: 120000 } }`
- Keep the same CSS classes and animations, just swap content

---

## Part 1: Farm Page (Idle Game)

### Fixed Grid Layout (12x8)

Pre-defined building positions. Locked slots show as dim outlines until unlocked.

```
Row 0: [Farmhouse 2x2] [        ] [Crop][Crop][Crop] [        ] [Mill    ] [Sawmill ] [       ] [       ] [       ] [       ]
Row 1: [            ] [        ] [Crop][Crop][Crop] [        ] [Mason   ] [Kitchen ] [       ] [       ] [       ] [       ]
Row 2: [            ] [        ] [    ][    ][    ] [        ] [Forge   ] [Loom    ] [Smokehouse] [Enchanter] [    ] [       ]
Row 3: [Chicken Coop] [Cow Past] [Sheep Pen] [   ] [        ] [        ] [        ] [        ] [       ] [       ] [       ]
Row 4: [            ] [        ] [         ] [   ] [Lumber  ] [Quarry  ] [Mine    ] [Deep Mine] [Old Growth] [   ] [       ]
Row 5: [            ] [        ] [         ] [   ] [        ] [        ] [        ] [        ] [       ] [       ] [       ]
Row 6: [Fishing Pond ~~~~~~~~~~~~~~~~~~~~~~~~~~~] [        ] [        ] [        ] [       ] [       ] [       ]
Row 7: [~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ~~~~~~~~~~~] [        ] [        ] [        ] [       ] [       ] [       ]
```

- Farmhouse: existing 2x2 sprite, shows level and bonuses
- Crop plots: existing crop system rendered in grid (reads FarmAPI)
- Resource stations: simple colored rectangle with text label for MVP
- Processing stations: simple colored rectangle, shows queue status
- Fishing pond: spans 2x4 tiles, interactive area
- Locked buildings: dashed border outline with lock icon + "Blueprint Required" or "Build: X JB"
- Pet walks between stations using CSS transitions

### Resource Panel (Right Sidebar)
- Scrollable panel showing all raw + processed resource counts
- Grouped by category: Crops | Animals | Gathering | Processed
- Numbers animate up on collection (counter tick effect)
- Tab at bottom: "Processing Queue" shows active jobs with progress bars

### Gathering Stations

All use timestamp-based idle accumulation. On page load (any page, since `farm-resources.js` is global), `collectPending()` calculates accumulated resources.

| Station | Resource | Idle Rate | Unlock |
|---------|----------|-----------|--------|
| Crop Plots | Wheat, Carrot, etc. | 5m-24h | Existing |
| Lumber Yard | Wood | 1 per 12min | Starter |
| Quarry | Stone | 1 per 20min | Starter |
| Chicken Coop | Eggs | 1 per 15min | TD wave 5 blueprint |
| Cow Pasture | Milk | 1 per 30min | TD wave 10 blueprint |
| Sheep Pen | Wool | 1 per 45min | TD wave 25 blueprint |
| Mine | Iron Ore | 1 per 40min | TD wave 20 blueprint |
| Deep Mine | Gold Ore | 1 per 90min | TD wave 30 blueprint |
| Old Growth | Hardwood | 1 per 35min | TD wave 50 blueprint |
| Fishing Pond | Fish | 1 per 10-25min | Starter (idle), interactive for rare |

Click a station on the farm page → popup shows: resource count, production rate, "Collect" button (if resources ready), upgrade option.

### Fishing Mini-Game
- Idle mode: accumulates small fish passively (1 per 10min)
- Interactive mode: click the pond on farm page to fish
  - Fish shadow moves across pond area (CSS animation, random speed/path)
  - Click when shadow is over the hook zone
  - Timing determines catch: early/late = small fish, perfect = medium, frame-perfect = rare
  - 30-second fishing session, catch multiple fish
  - Simple DOM-based, no canvas needed

### Processing System

| Station | Tier | Example Recipe | Time | Unlock |
|---------|------|---------------|------|--------|
| Mill | Basic | 3 Wheat → Flour | 5min | Starter |
| Sawmill | Basic | 3 Wood → Planks | 8min | Starter |
| Mason | Basic | 4 Stone → Stone Bricks | 10min | Starter |
| Kitchen | Basic | 2 Flour + 1 Egg → Bread | 10min | Starter |
| Forge | Advanced | 3 Iron Ore + 2 Wood → Iron Bars | 15min | TD wave 20 blueprint |
| Loom | Advanced | 2 Wool → Rope | 6min | TD wave 25 blueprint |
| Smokehouse | Advanced | 2 Fish + 1 Wood → Smoked Fish | 8min | TD wave 15 blueprint |
| Enchanter | Elite | 2 Crystal Herb + 1 Gold Bar → Crystal Lens | 30min | TD wave 40 blueprint |

Queue-based: click station → see available recipes → click "Process" → item enters queue. Each station processes one item at a time. Queue up to 5 items. Progress persists via timestamps (works offline).

---

## Part 2: Tower Defense (Horde Mode)

### Canvas Setup
- 640x480 canvas (16x12 grid, 40x40px tiles)
- Colors read from CSS variables at init via `getComputedStyle`
- Fira Code font for all text
- Grid lines drawn in dim foreground color
- Follow exact pattern from `flappy.js`: IIFE, `requestAnimationFrame` loop, overlay divs for start/gameover

### Map
- 1 starting map. Path defined as waypoint array:
```js
var MAP_1 = {
  path: [[0,6],[3,6],[3,2],[8,2],[8,8],[12,8],[12,4],[15,4]],
  spawn: [0,6],
  exit: [15,4]
};
```
- Path tiles rendered as slightly lighter background
- Towers placeable on any non-path tile
- Additional maps unlock at wave 20 and 40

### Enemies
Simple geometric shapes for MVP. Color-coded by type.

| Enemy | HP | Speed | Shape | Color | Special | Appears |
|-------|-----|-------|-------|-------|---------|---------|
| Slime | 20 | 1.0 | Circle | Green | - | Wave 1+ |
| Skeleton | 40 | 1.2 | Triangle | White | - | Wave 6+ |
| Goblin | 30 | 1.8 | Small circle | Yellow-green | Fast | Wave 11+ |
| Orc | 80 | 0.7 | Large square | Dark green | Tanky | Wave 16+ |
| Ghost | 25 | 1.0 | Circle (50% alpha) | Grey | 50% dodge | Wave 20+ |
| Knight | 120 | 0.5 | Large square | Steel | Heavy armor | Wave 20+ |
| Mage | 35 | 1.0 | Diamond | Purple | Heals nearby | Wave 20+ |
| Boss | 500+ | 0.4 | Large 8x8 sprite | Red | Multi-phase | Every 10 waves |

Scaling: `HP * (1 + wave * 0.15)`, count: `5 + floor(wave * 1.5)`

### Towers
Simple colored squares with a letter/symbol label for MVP.

| Tower | Label | DMG | Range | Speed | Cost | Material Upgrades |
|-------|-------|-----|-------|-------|------|-------------------|
| Arrow | A | 5 | 3 | 1.0s | 10 JB | Planks, Iron Bars |
| Cannon | C | 15 | 2 | 2.5s | 25 JB | Stone Bricks, Iron Bars |
| Frost | F | 3 | 3 | 1.5s | 20 JB | Crystal Lens, Fish Oil |
| Fire | 🔥 | 8+DOT | 2.5 | 2.0s | 30 JB | Dragon Scale, Hardwood Planks |
| Gold Mine | G | 0 | 0 | - | 40 JB | Gold Bars, Golden Core |
| Wall | W | 0 | 0 | - | 5 JB | Stone Bricks, Rope |
| Sniper | S | 30 | 6 | 4.0s | 50 JB | Iron Bars, Crystal Lens (unlock wave 15) |
| Lightning | L | 12 | 3 | 1.0s | 60 JB | Gold Bars, Dragon Scale (unlock wave 25) |

3 upgrade levels. Level 1: JB only. Level 2-3: JB + processed materials.

### HUD (Above/Below Canvas)
```
Wave: 12  |  Lives: 18/20  |  JB: 1,250  |  Enemies: 8/24
[Arrow 10JB] [Cannon 25JB] [Frost 20JB] [Fire 30JB] [Wall 5JB] ...
[Pet: Cat Lv2]  [Q: Pounce (ready)] [W: Nine Lives (ready)]
```

### Projectiles
- Arrow: small dot traveling to target
- Cannon: larger dot with small "explosion" circle on hit
- Frost: blue dot, enemy gets blue tint when slowed
- Fire: orange dot, enemy gets orange outline for DOT
- Sniper: thin line flash to target (instant)
- Lightning: zigzag line to target

### Game Flow
1. Start overlay: "Tower Defense - Place towers and survive!"
2. Pre-wave phase: place/upgrade towers, no timer, "Start Wave" button
3. Wave phase: enemies spawn with staggered delays, towers auto-target nearest in range
4. Post-wave: "+15 JB" reward float, continue button
5. Boss wave every 10: special announcement, larger reward
6. Game over at 0 lives: stats screen, highest wave saved
7. 20 starting lives

---

## The Symbiotic Loop

### Farm → TD
| Material | TD Use |
|----------|--------|
| Planks | Arrow Tower upgrades |
| Hardwood Planks | Fire Tower upgrades |
| Stone Bricks | Cannon/Wall upgrades |
| Iron Bars | Arrow/Cannon/Sniper damage |
| Gold Bars | Gold Mine/Lightning Tower |
| Rope | Wall slow traps |
| Crystal Lens | Frost/Sniper upgrades |
| Dragon Scale | Fire/Lightning upgrades |
| Golden Core | Gold Mine/special abilities |
| Bread | Heals +2 lives mid-wave (consumable) |
| Smoked Fish | 30s tower attack speed buff (consumable) |
| Fish Oil | Frost Tower range |
| Cloth | Pet hero armor |

### TD → Farm (Wave Milestone Rewards)

| Wave | Unlock |
|------|--------|
| 5 | Chicken Coop blueprint |
| 10 | Cow Pasture blueprint |
| 15 | Smokehouse blueprint + Sniper Tower |
| 20 | Mine + Forge blueprints |
| 25 | Sheep Pen + Loom blueprints + Lightning Tower |
| 30 | Deep Mine blueprint |
| 40 | Enchanter blueprint |
| 50 | Old Growth blueprint |
| Every wave | JB: `5 + wave * 2` |
| Every 10 waves | Bonus JB: `50 * wave` |
| Perfect wave (no leaks) | Double JB + chance of rare seed |

Blueprints still cost JB to build on farm (double gate).

---

## Pet Hero Units (in TD)

Click to reposition on grid. Auto-attack nearest enemy in range. Two abilities triggered via **buttons below canvas + Q/W keyboard shortcuts**. Cooldown timers shown on buttons.

### Cat
- Fast melee (8 dmg, 0.6s, 2 range) | HP: 80
- Passive: 20% dodge
- **Q - Pounce**: Leap to enemy, 25 dmg + stun 1s. 8s CD
- **W - Nine Lives**: Revive once at 50% HP per run

### Dragon
- Ranged AOE fire (12 dmg, 1.2s, 3 range) | HP: 120
- Passive: Burn DOT (3 dmg/s for 2s)
- **Q - Inferno**: AOE 40 dmg in 2 tile radius. 12s CD
- **W - Flame Shield**: 3s immunity, damages nearby. 20s CD

### Robot
- Long-range laser (10 dmg, 1.0s, 4 range) | HP: 100
- Passive: Every 5th attack deals double
- **Q - EMP Blast**: Stun all in 3 tiles for 2s. 15s CD
- **W - Shield Generator**: Shield a tower, absorbs 50 dmg. 18s CD

Level scaling: L2 +30% stats, L3 +60% + enhanced abilities.

Pet sprite rendered on canvas using `fillRect` per pixel (same approach as flappy.js pet bird).

---

## Phased Build Order

### Phase 1: Farm Page MVP
1. ~~Create `farm-resources.js` (global module): resource state, idle accumulation, `window.FarmResources` API~~ **DONE (1a)**
2. ~~Create farm page layout: fixed 12x8 grid, farmhouse, crop plots (reading FarmAPI), Lumber Yard, Quarry~~ **DONE (1a)**
3. ~~Resource panel sidebar~~ **DONE (1a)**
4. ~~Collection interactions: click station → popup → collect~~ **DONE (1b)**
5. ~~Visual feedback: pulse animations, collection particles, counter ticks~~ **DONE (1b)**
6. ~~Pet walks on farm grid (reuse mini-pet from farm.js)~~ **DONE (1b)**
7. ~~Transform existing farm strip into notification dashboard (mini tile row)~~ **DONE (1c)**
8. ~~Add farm page to games section hub + nav~~ **DONE (1a)**

### Phase 2: Expanded Farm ✅ DONE
1. ~~Livestock stations (chicken, cow, sheep) - locked until blueprint~~ **DONE** (unlocked via farmhouse level instead of TD blueprints)
2. ~~Fishing pond (idle + interactive mini-game)~~ **DONE** (idle mode; interactive mini-game deferred)
3. ~~Basic processing stations (mill, sawmill, mason, kitchen)~~ **DONE**
4. ~~Processing queue UI~~ **DONE**
5. ~~Additional resource types~~ **DONE** (9 raw crops, 10 gathering resources, 8 processed resources)

### Phase 3: Tower Defense MVP
1. Canvas game: grid, path rendering, game loop
2. 3 starter towers (arrow, cannon, frost) - JB cost only
3. 3 starter enemies (slime, skeleton, goblin)
4. Wave system with spawning, targeting, projectiles
5. HUD, start/gameover overlays, stats persistence
6. JB rewards per wave

### Phase 4: Farm-TD Integration
1. Material-based tower upgrades (level 2-3 require processed materials)
2. Wave milestone unlock system (blueprints earned)
3. Blueprint construction UI on farm page
4. Remaining towers (fire, wall, gold mine, sniper, lightning)
5. Remaining enemies (orc, ghost, knight, mage, boss)
6. Consumables in TD (bread for lives, smoked fish for speed buff)
7. Advanced processing stations unlock via blueprints (forge, loom, smokehouse, enchanter)

### Phase 5: Pet Heroes
1. Pet sprite rendering on canvas (fillRect pixel art from petsprites.json)
2. Click-to-move hero control
3. Auto-attack with per-pet attack styles
4. Ability buttons below canvas + Q/W keyboard shortcuts
5. Cooldown system + visual indicators
6. Hero HP, damage, respawn

### Phase 6: Polish
1. Tower targeting options (nearest, strongest, fastest)
2. Speed controls (1x, 2x, 3x)
3. Wave preview panel
4. Additional TD maps (wave 20, 40 unlocks)
5. Enchanter recipes (Crystal Lens, Dragon Scale, Golden Core)
6. Farm page: notification badges, auto-collect toggle
7. Mobile: touch controls, responsive grid, bottom sheet panels
8. Replace simple shapes with pixel art sprites

---

## Technical Architecture

### New Files (all under `themes/terminal-books/`)
```
../../content/games/farm/index.md           (type: "farm-page")
../../content/games/tower-defense/index.md  (type: "tower-defense")
layouts/farm-page/single.html               (farm page HTML)
layouts/tower-defense/single.html           (TD page HTML)
assets/css/farm-page.css                    (prefix: fp-)
assets/css/tower-defense.css                (prefix: td-)
assets/js/farm-page.js                      (farm page UI, IIFE)
assets/js/farm-resources.js                 (global resource module)
assets/js/tower-defense.js                  (TD game logic, IIFE)
assets/js/td-unlocks.js                     (global unlock tracker)
```

### Modified Files
```
themes/terminal-books/layouts/_partials/head.html    (add CSS conditionals for farm-page, tower-defense)
themes/terminal-books/layouts/baseof.html            (add global: farm-resources.js, td-unlocks.js; conditional: farm-page.js, tower-defense.js)
themes/terminal-books/layouts/games/section.html     (add Farm + TD tiles to game grid)
themes/terminal-books/layouts/_partials/header.html  (add Farm + TD to games sub-nav)
themes/terminal-books/assets/js/farm.js              (modify strip rendering to dashboard mode)
themes/terminal-books/assets/css/farm.css            (add dashboard strip styles)
```

### localStorage Keys
```
arebooksgood-farm-resources    raw/processed counts, station levels, processing queues, lastCollect timestamps
arebooksgood-td-unlocks        highest wave, blueprints earned, tower unlocks, maps unlocked
arebooksgood-td-stats          lifetime stats (games, kills, towers built, JB earned)
arebooksgood-td-run            current run state (towers placed, wave, lives) - cleared on game over
```

### Global Module APIs

**`window.FarmResources`** (loaded on all pages):
```js
FarmResources.getAll()           // { raw: {...}, processed: {...} }
FarmResources.getRaw(type)       // count
FarmResources.getProcessed(type) // count
FarmResources.add(category, type, n)
FarmResources.deduct(category, type, n)
FarmResources.collectPending()   // idle accumulation on page load
FarmResources.getSummary()       // for dashboard strip
FarmResources.getStations()      // station levels + states
FarmResources.onChange(callback)
```

**`window.TDUnlocks`** (loaded on all pages):
```js
TDUnlocks.getHighestWave()
TDUnlocks.getBlueprints()       // ['chickenCoop', 'cowPasture', ...]
TDUnlocks.hasBlueprint(key)
TDUnlocks.getTowerUnlocks()
TDUnlocks.getMapsUnlocked()
TDUnlocks.recordWave(waveNum)   // called by TD on wave complete, handles unlocks
```

---

## Existing Code Reference

### Key files to understand before implementing:
- `themes/terminal-books/assets/js/farm.js` - Existing farm state, FarmAPI, crop definitions, box-shadow pixel art rendering
- `themes/terminal-books/assets/js/pet.js` - PetSystem API, sprite rendering, animation states
- `themes/terminal-books/assets/js/pet-farm-ai.js` - Pet autonomous behavior, farm interaction sequences
- `themes/terminal-books/assets/js/flappy.js` - Best reference for canvas game architecture (sizing, game loop, pet sprite on canvas, overlays, stats)
- `themes/terminal-books/assets/js/jackbucks.js` - Currency module pattern to follow for farm-resources.js
- `themes/terminal-books/assets/js/silk-road.js` - Shop/purchase pattern with JB integration
- `themes/terminal-books/assets/css/farm.css` - Farm visual rendering, animations, particle effects
- `themes/terminal-books/layouts/_partials/head.html` - Conditional CSS loading pattern
- `themes/terminal-books/layouts/baseof.html` - Global + conditional JS loading pattern

### Patterns to follow:
- **JS**: IIFE pattern, early-exit if DOM element not found, `window.GlobalAPI` for cross-file communication
- **CSS**: Prefix namespacing per feature (e.g., `fp-` for farm page, `td-` for tower defense)
- **localStorage**: `arebooksgood-{system}` key naming convention
- **Sprites**: Box-shadow pixel art for DOM elements, `fillRect` pixel drawing for canvas
- **Idle mechanics**: Timestamp-based (`Date.now() - lastCollect`) / gatherInterval, collect on page load
- **Theming**: All colors via CSS variables (`--foreground`, `--accent`, `--background`, `--pet-accessory`)

---

## Verification
1. `hugo server` - farm page renders at `/games/farm/`, TD at `/games/tower-defense/`
2. Farm strip shows mini tile dashboard on all pages
3. Click station on farm page → collect resources → counts update in sidebar + strip
4. Navigate away, wait, return → idle resources accumulated
5. Play TD → earn JB + blueprints → farm page shows new buildable stations
6. Build processing station → queue recipe → materials appear in inventory
7. Use materials to upgrade tower in TD → tower stats increase
8. Pet appears as hero in TD → can move, attack, use abilities
9. All works across page navigation (localStorage persistence)
10. Themes apply correctly to both farm page and TD canvas

---

## Progress Tracking

This section is updated at the end of each implementation session to track what's done, what changed from the plan, and what's next.

### Session 1 — Phase 1a: Farm Page Foundation (2026-02-15)

**Completed:**
- `farm-resources.js` — global resource module (IIFE, localStorage, idle accumulation, `window.FarmResources` API)
- `farm-page.js` — farm page UI with fixed 12x8 grid, resource sidebar, 10s update interval
- `farm-page.css` — all `fp-` prefixed styles, responsive layout, CSS variable theming
- `layouts/farm-page/single.html` — Hugo layout template
- `content/games/farm/index.md` — content page with `type: farm-page`
- Wired into Hugo: `head.html` (CSS), `baseof.html` (global + conditional JS), `header.html` (nav), `games/section.html` (tile)

**Files created:**
- `content/games/farm/index.md`
- `themes/terminal-books/layouts/farm-page/single.html`
- `themes/terminal-books/assets/js/farm-resources.js`
- `themes/terminal-books/assets/js/farm-page.js`
- `themes/terminal-books/assets/css/farm-page.css`

**Files modified:**
- `themes/terminal-books/layouts/_partials/head.html`
- `themes/terminal-books/layouts/baseof.html`
- `themes/terminal-books/layouts/_partials/header.html`
- `themes/terminal-books/layouts/games/section.html`

**What's next (Phase 1b):**
- Collection interactions: click station → popup → collect
- Visual polish: pulse animations, collection particles, counter ticks
- Pet walks on farm grid
- Dashboard strip rework (existing strip elements — farmhouse widget, tree decoration, beaming pet — remain; crop plot tiles become summary resource tiles)

### Session 2 — Phase 1b: Farm Page Interactions & Polish (2026-02-15)

**Completed:**
- Station click popups: gathering (stored count, rate, next timer), crop (name, stage, progress bar), processing (coming soon/locked), farmhouse (level)
- Visual polish: pulse glow on cells with pending resources, float particles on resource accumulation (+1 icon), counter tick animation on sidebar updates
- Pet walks on farm grid: mini pet rendered at farmhouse, idle-walks to random built stations every 20-35s, typewriter speech bubbles, per-pet-type speech lines

**Files modified:**
- `themes/terminal-books/assets/js/farm-page.js` — added `data-key` attributes, `prevCounts` tracking, popup system, visual polish functions, farm grid pet system
- `themes/terminal-books/assets/css/farm-page.css` — added popup styles, pulse/float/tick animations, grid pet and speech bubble styles

**What's next (Phase 1c):**
- Dashboard strip rework: transform existing farm strip crop tiles into resource summary tiles

### Session 3 — Phase 1c: Dashboard Strip Rework (2026-02-15)

**Completed:**
- Farm page crop interactions: harvest button on ready crops, seed picker on empty plots (reads FarmAPI.getCropDefs + getInventory)
- JB float particle on farm page harvest
- Dashboard strip rework: replaced plot tiles with resource summary tiles (crops, wood, stone, fish, eggs, milk, wool, iron, gold, hardwood + "→ Farm" link)
- Dashboard tiles show resource counts, pulse when count > 0, click navigates to `/games/farm/`
- Updated mini pet walk to target crops dashboard tile instead of individual plot elements
- Updated JB/seed float particles to anchor at crops tile
- Removed strip seed picker, plot info popup, plot click handler (all moved to farm page)

**Files modified:**
- `themes/terminal-books/assets/js/farm-page.js` — added harvest/plant buttons to crop popup, JB float function
- `themes/terminal-books/assets/css/farm-page.css` — added popup button styles, seed button styles, JB float particle
- `themes/terminal-books/assets/js/farm.js` — replaced plot tiles with dashboard tiles, removed strip interactions, updated pet walk/float targets
- `themes/terminal-books/assets/css/farm.css` — added dashboard tile styles, removed seed picker CSS, added mobile tile sizes

**Phase 1 complete. Phase 2 (Expanded Farm) is next:**
- Livestock stations (chicken, cow, sheep) - locked until blueprint
- Fishing pond (idle + interactive mini-game)
- Basic processing stations (mill, sawmill, mason, kitchen)
- Processing queue UI

### Session 4 — Bug Fixes + Phase 2: Processing System (2026-02-15)

**Bug fixes (prior commit):**
- Fixed crop timers not displaying correctly on farm page
- Fixed pet disappearing from farm grid on re-render
- Fixed seed list UX (collapsible unavailable seeds)

**Phase 2 — Processing System:**
- All 9 gathering stations unlocked for testing (removed blueprint requirement)
- All 8 processing stations unlocked for testing (removed tier-based locking)
- Added crop resources to raw pool: carrot, potato, wheat, tomato, corn, pumpkin, golden_apple, crystal_herb, dragon_fruit
- Added new processed resources: bread, ironBars, rope, smokedFish, crystalLens
- Processing system: per-station queues (max 5 per station), timestamp-based (works offline)
- 8 recipes across all processing stations (mill→flour, sawmill→planks, mason→stoneBricks, kitchen→bread, forge→ironBars, loom→rope, smokehouse→smokedFish, enchanter→crystalLens)
- Inputs deducted on queue (not on completion) to prevent over-queuing
- `processQueues()` runs inside `collectPending()` for offline processing
- Full processing popup UI: active job + progress bar, waiting queue list, queue status, recipe buttons with green/red input affordability
- Processing indicators on grid cells (timer text + pulse animation)
- Crop harvest now adds 1 raw crop resource via `FarmResources.add()`
- Dashboard strip shows processing tile with active recipe name + time remaining
- New resource groups in sidebar: "Crops" and expanded "Processed"

**Files modified:**
- `farm-resources.js` — RECIPES, queue engine (findRecipe, canAffordRecipe, deductInputs, processQueues), per-station processing state, new API (getRecipes, canAfford, queueRecipe, getQueue, getActiveProcessing, getAllRecipes), unlocked all stations
- `farm-page.js` — processing popup, resource groups (crops + expanded processed), grid processing indicators, unlocked all processing tiers
- `farm.js` — harvest adds raw crop item, dashboard processing tile
- `farm-page.css` — processing popup styles, recipe buttons, cell processing indicators

**Mobile polish:**
- Farm grid: aspect-ratio 1/1 (was 2/1.5), hidden labels, visible overflow for emoji icons, tighter gaps
- Farm bar: tiles 32px (was 42px), hidden labels, zero-count tiles hidden via CSS, crops + farm link always visible
- Popup positioning: measure actual height before placement, flip above/below if clipped by viewport
- Processing popups capped at `100vw - 16px` on mobile

### Session 5 — Phase 2.5: Farm Sprite Polish (2026-02-16)

**Completed:**
- Fixed crop stage indices in `extract-farm-sprites.py` — all 9 crops now skip blank/transparent frames
  - carrot, potato, golden_apple: `[0,2,4,6,7]` → `[0,1,3,5,7]` (frame 6 blank)
  - pumpkin: `[0,2,4,6,7]` → `[0,2,3,5,7]` (frames 1,6 blank)
  - tomato: `[0,2,5,7,9]` → `[0,2,4,6,9]` (frames 7,8 blank)
  - wheat, crystal_herb: `[0,2,5,7,9]` → `[0,2,4,5,9]` (frames 6,7,8 blank)
  - dragon_fruit: `[0,1,2,3,4]` → `[0,1,2,4,4]` (frame 3 blank)
  - corn: unchanged (no blank frames)
- Improved station sprites:
  - lumberYard: full 64x16 wood pile (was 16x16 single plank)
  - quarry: 32x32 stone boulders with minerals (was tiny 32x16 nugget)
  - deepMine: 32x32 mine props from Props Mine.png (was 16x16 nugget)
  - oldGrowth: 32x48 deep forest tree (was 16x32 mossy stump)
- Fishing pond: CSS-only water gradient (sprite hidden) — asset pack water tiles use RPG Maker autotile format not suitable for simple extraction
- Added decorative maple tree: 32x64 from Common/No Shadow/Maple Tree.png → `stations/tree.png`
- Grid ground: CSS green tint only (grass sprite tiles created visible repeating artifacts; removed)
- Crop soil: 16x16 tilled soil tile from `Tilled Soil and wet soil.png` on crop cells
- All 45 crop PNGs verified non-blank (file sizes > 100 bytes, all have visible content)

**Files modified:**
- `scripts/extract-farm-sprites.py` — fixed crop indices, updated station crop boxes, added TREE_DIR/TILESET_DIR paths, added `extract_ground_tiles()`, `extract_pond_composite()`, `extract_tree_decoration()` functions
- `themes/terminal-books/assets/css/farm-page.css` — soil background on crop cells, CSS gradient pond, removed grass sprite background

**New files:**
- `static/images/farm/ground/soil.png` — 16x16 tilled soil tile
- `static/images/farm/stations/tree.png` — 32x64 decorative maple tree

**Re-extracted:**
- `static/images/farm/crops/*.png` — 45 PNGs with corrected frame indices
- `static/images/farm/stations/{lumberYard,quarry,deepMine,oldGrowth}.png` — improved sprites

**What's next — Phase 3: Tower Defense MVP:**
- Canvas game: grid, path rendering, game loop
- 3 starter towers (arrow, cannon, frost) - JB cost only
- 3 starter enemies (slime, skeleton, goblin)
- Wave system, HUD, overlays, stats persistence



  What's set up:                                                                                                                                                            
  - static/images/farm/animations/waterfall.png — 4-frame horizontal spritesheet (640×112)                                                                                  
  - CSS animation in farm-page.css — .fp-anim-waterfall with steps(4) at 1.2s loop                                                                                          
  - JS creates the overlay in addFarmAnimations() — always visible, layered over the static background                                                                      

  Your workflow going forward:                                                                                                                                              
  1. Edit your background in Tiled as usual
  2. Copy the new PNG to static/images/farm/ground/grass.png
  3. Ask me to regenerate the waterfall spritesheet (I've saved the whole process in my memory)

### Sessions 6-10 — Phase 2 Complete: Full Farm Page (2026-02-15 to 2026-02-17)

**Completed (across multiple sessions):**
- Waterfall animation: 4-frame spritesheet extraction, CSS steps() animation, JS overlay layer
- Farm decorations: bonfire, fountain, butterflies, smoke, bubbles — unlocked by farmhouse level
- Pixel-art sprites for all 10 gathering stations (extracted from asset pack)
- Animated farm animals: chicken, cow, sheep — wander near their buildings, persist positions
- Decorative elements: wood fence row, grass tufts, maple tree
- Farmhouse-gated progression: buildings + crop plots unlock by farmhouse level, locked cells show pixel lock icon + soil sprite, green tint on unlockable cells
- JB cost to unlock crop plots
- Farm grid layout reorganization: supply chain clusters, mining near cliff, processing row
- Pet farming AI on farm grid: harvest sequences, water sequences, idle visits, speech bubbles
- Fertilizer UI: button in crop popup (once per crop), showFpFertilizerFloat(), boundary check in useFertilizer()
- Stale DOM ref fix: renderGrid() before showFpJBFloat() in harvest sequence, re-query cellEl after water call
- Bug fixes: quickSellAll bonuses, offline queue chaining, Lv3 processing unlock, notification badge styling
- Grass tuft decorations scattered across green areas

**Key design changes from original plan:**
- Building unlocks use farmhouse level progression instead of TD blueprints (TD not built yet)
- All gathering + processing stations unlocked for gameplay (no blueprint gating)
- Farm animals are decorative (wander + animate), not resource-producing stations
- Fishing pond is idle-only (interactive mini-game deferred)
- Grid layout evolved significantly from original 12x8 plan — now uses pixel-art background with positioned cells

**Files created:**
- `static/images/farm/animations/*.png` — waterfall, bonfire, fountain, butterfly, smoke, bubbles, chicken, cow, sheep
- `static/images/farm/decorations/*.png` — fence-wood, grass tufts (5 variants)
- `static/images/farm/ui/lock.png`
- `scripts/extract-farm-sprites.py`

**Deployed to production:** 2026-02-17 (merged feature/farm-td -> main, 40 commits, Cloudflare cache purged)

**What's next — Phase 3: Tower Defense MVP:**
- Canvas game: grid, path rendering, game loop
- 3 starter towers (arrow, cannon, frost) - JB cost only
- 3 starter enemies (slime, skeleton, goblin)
- Wave system, HUD, overlays, stats persistence
- Hook TD wave milestones back into farm unlocks (blueprints)