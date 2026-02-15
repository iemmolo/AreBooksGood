# Farm Page + Tower Defense - Final Design Plan

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

### Phase 2: Expanded Farm
1. Livestock stations (chicken, cow, sheep) - locked until blueprint
2. Fishing pond (idle + interactive mini-game)
3. Basic processing stations (mill, sawmill, mason, kitchen)
4. Processing queue UI
5. Additional resource types

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
