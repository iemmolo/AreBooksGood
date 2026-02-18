# Farm Animation Overhaul — Roadmap

> Persistent tracking doc for upgrading farm page visual polish.
> Cross-reference: `_asset-pack/ASSET-REFERENCE.md` for full inventory.

---

## Phase 1: Station Sprite Swaps + Animated Benches

### 1a. Extract new sprites from asset pack

All source paths relative to `_asset-pack/Farm RPG - Tiny Asset Pack - (All in One)/`.

| Station | Source | Raw Size | Extract | Deploy (animation) | Deploy (static) |
|---------|--------|----------|---------|---------------------|-----------------|
| Loom | `Farm/Work Benches/Tear.png` | 256×32 | 8 frames of 32×32 | `animations/loom.png` (as-is) | `stations/loom.png` (frame 0) |
| Forge | `Farm/Work Benches/Anvil.png` | 128×96 | Row 0: first 4 frames of 16×16 (native) | `animations/forge.png` (64×16) | `stations/forge.png` (16×16) |
| Smokehouse | `Farm/Work Benches/Furnace.png` | 160×64 | Bottom row: 5 frames of 32×32 | `animations/smokehouse.png` | `stations/smokehouse.png` (frame 0) |
| Kitchen | `Farm/Work Benches/Kitchen pot.png` | 160×32 | 4 frames of 32×32 (frame 0 removed — no fire/food) | `animations/kitchen.png` (128×32) | `stations/kitchen.png` (original frame 0, empty pot) |
| Sawmill | `Farm/Work Benches/Workbench.png` | 32×32 | Static only (no animation frames) | — | `stations/sawmill.png` (swap) |

- [x] Extract & deploy loom sprites
- [x] Extract & deploy forge sprites (re-extracted: 4 frames native 16×16, no empty frame)
- [x] Extract & deploy smokehouse sprites
- [x] Extract & deploy kitchen sprites (removed frame 0 — empty pot with no fire/food — kept as idle static image)
- [x] Swap sawmill to Workbench.png
- [x] Deploy static fallback frames to `stations/`
- [ ] Mill blades — deferred (80×80 frames too large for grid cell, needs custom sizing)

### 1b. Animated station rendering (JS + CSS)

- [x] Add `STATION_ANIM` map in `farm-page.js` (loom, forge, smokehouse, kitchen)
- [x] Render STATION_ANIM stations as centered `<div>` (idle = frame 0, processing = CSS animation)
- [x] Kitchen exception: idle = static `<img>` (empty pot), processing = swap to animation `<div>` (cooking with fire)
- [x] `.fp-station-active` class toggles animation on/off (in-place via `updateCounts()`)
- [x] Kitchen in-place swap in `updateCounts()`: static img ↔ animation div on processing state change
- [x] Add CSS `.fp-station-anim` base + per-station `@keyframes`

### 1c. Station sizing fix

Centered fixed-size sprites (pixel-based, matching bonfire/animal pattern) instead of stretchy `object-fit: contain` `<img>`.

**Animated stations** — always use centered `<div>`:
- [x] Loom: 64×64 (2× native 32px)
- [x] Forge: 48×48 (3× native 16px)
- [x] Smokehouse: 64×64 (2× native 32px)
- [x] Kitchen: 64×64 (2× native 32px) — animation only when processing

**Static stations** — CSS override on `.fp-sprite-img` to 48×48 centered:
- [x] Mill
- [x] Mason
- [x] Sawmill
- [x] Mine
- [x] Deep Mine
- [x] Enchanter
- [x] Kitchen (64×64 to match animation size)

---

## Phase 2: New Ambient Animals

### 2a. Extract walk/swim spritesheets

| Animal | Source | Full Size | Sheet | Frame Size | Deploy |
|--------|--------|-----------|-------|------------|--------|
| Duck (walk) | `Farm Animals/Ducks/Duck Mallad.png` | 64×224 | 64×64 (rows 0-3, 4×4 @ 16px) | 16×16 | `animations/duck.png` |
| Duck (swim) | `Farm Animals/Ducks/Duck Mallad.png` | 64×224 | 64×64 (rows 8-11, 4×4 @ 16px) | 16×16 | `animations/duck-swim.png` |
| Goat | `Farm Animals/Goat/Goat Male Brown.png` | 128×288 | 128×128 (rows 0-3, 4×4 @ 32px) | 32×32 | `animations/goat.png` |
| Pig | `Farm Animals/Pig/Pig Pink.png` | 128×288 | 128×128 (rows 0-3, 4×4 @ 32px) | 32×32 | `animations/pig.png` |

- [x] Extract & deploy duck walk sheet
- [x] Extract & deploy duck swim sheet (rows 8-11)
- [x] Extract & deploy goat walk sheet
- [x] Extract & deploy pig walk sheet

### 2b. Add to ANIMAL_INFO + ANIMAL_SOUNDS (farm-page.js)

- [x] Add duck, duckSwim, goat, pig entries to `ANIMAL_INFO`
- [x] Add duck, duckSwim, goat, pig entries to `ANIMAL_SOUNDS`
- [x] Added optional `wanderRows` param to `spawnWanderingAnimal()` for wider zones

### 2c. Add CSS classes (farm-page.css)

- [x] `.fp-anim-duck` (32×32, 2× scale, 2s walk)
- [x] `.fp-anim-duck-swim` (32×32, 2× scale, 3s swim — slower for water)
- [x] `.fp-anim-goat` (64×64, 2× scale, 3s walk)
- [x] `.fp-anim-pig` (64×64, 2× scale, 2.5s walk)

### 2d. Ambient spawn logic (farm-page.js)

- [x] Lv2+: 2 ducks swimming in fishing pond (row 14, below cliff)
- [x] Lv3+: 1 goat roaming animal area (row 5-6, same zone as chicken/cow/sheep)
- [x] Lv4+: 2 pigs in crop area (rows 2-4, cols 2-5)

---

## Phase 3: Animated Trees (future)

- [ ] Inspect tree animation layout (Birch/Pine from `Farm/Tree/Common/No Shadow/`)
- [ ] Extract tree sway spritesheet
- [ ] Add animated tree to farm grid

## Phase 4: Falling Leaf Effects (future, bonus)

- [ ] Extract leaf particle sprites from `Farm/Tree/Common/Effects/`
- [ ] Implement drift system (reuse butterfly pattern)
- [ ] Gate behind Lv5 farmhouse

## Phase 5: Mill Blades (future)

- [ ] Resize blade frames (80×80 → ~32×32) or extract smaller Old Mill blades (`Old/Mill.png` 96×48, 2 frames)
- [ ] Overlay on mill body sprite when processing

---

## What Changed (Session 2026-02-18)

### Files Modified
- `themes/terminal-books/assets/js/farm-page.js` — `STATION_ANIM` map (loom, forge, smokehouse, kitchen), animated station rendering with `.fp-station-active` toggle, in-place swap in `updateCounts()`, new `ANIMAL_INFO`/`ANIMAL_SOUNDS` entries (duck/duckSwim/goat/pig), farmhouse-gated spawn calls, `wanderRows` param for wider zones
- `themes/terminal-books/assets/css/farm-page.css` — `.fp-station-anim` base (centered, pixel-based) + per-station `@keyframes` (loom/forge/smokehouse/kitchen), `.fp-station-active` animation trigger, static station sizing fix (mill/mason/sawmill/mine/deepMine/enchanter/kitchen), processing indicator hidden, `.fp-anim-duck`/`.fp-anim-duck-swim`/`.fp-anim-goat`/`.fp-anim-pig` walk/swim classes

### Sprites Deployed
| File | Dimensions | Source |
|------|-----------|--------|
| `animations/loom.png` | 256×32 (8 frames) | `Tear.png` as-is |
| `animations/forge.png` | 64×16 (4 frames) | `Anvil.png` row 0, native 16×16 |
| `animations/smokehouse.png` | 160×32 (5 frames) | `Furnace.png` bottom row |
| `animations/kitchen.png` | 128×32 (4 frames) | `Kitchen pot.png` frames 1-4 (frame 0 removed) |
| `animations/mill-blades.png` | 320×80 (4 frames) | Mill `1.png` (extracted but unused — too large) |
| `animations/duck.png` | 64×64 (4×4 walk) | `Duck Mallad.png` rows 0-3 |
| `animations/duck-swim.png` | 64×64 (4×4 swim) | `Duck Mallad.png` rows 8-11 |
| `animations/goat.png` | 128×128 (4×4 walk) | `Goat Male Brown.png` top 4 rows |
| `animations/pig.png` | 128×128 (4×4 walk) | `Pig Pink.png` top 4 rows |
| `stations/loom.png` | 32×32 | Frame 0 of loom animation |
| `stations/forge.png` | 16×16 | Frame 0 of forge (native) |
| `stations/smokehouse.png` | 32×32 | Frame 0 of smokehouse animation |
| `stations/kitchen.png` | 32×32 | Original frame 0 (empty pot, no fire/food) |
| `stations/sawmill.png` | 32×32 | `Workbench.png` (replaced old 32×16) |

### Asset Pack Audit — No Better Options Found
| Station | Pack options checked | Verdict |
|---------|---------------------|---------|
| Sawmill | `Sawmill.png` (32×16 tiny), `Workbench.png` (32×32) | Swapped to Workbench.png |
| Mill | Mill buildings (320×128 too large), Old Mill blades (96×48, only 2 frames) | Keep current, defer blades |
| Mason | `Cheese Press.png` (animated but thematically wrong), `Sharpening Station.png` (tiny) | Keep current |

---

## Gotchas & Pitfalls

- **Percentage-based `background-size`/`background-position` is broken for sprite stepping** — CSS percentage position formula doesn't step linearly through frames. Always use pixel values (matching bonfire/animal pattern).
- **Anvil.png (Forge)**: 8×6 grid of 16×16. Rows are color variants. Column 7 (frame 8) in every row is a separate sparks particle, NOT an animation frame — skip it.
- **Furnace.png (Smokehouse)**: Top row = different furnace color variants (not animation frames). Bottom row = fire animation (5 frames).
- **Mill blades**: `1.png` (320×80) has 4 frames at 80×80 each. Too large for grid cells. `Old/Mill.png` (96×48) has 2 smaller frames but only 2 rotation angles.
- **Duck spritesheet** (64×224, 14 rows): rows 0-3 = walk, rows 4-5 = eat/peck, rows 6-7 = idle sit, rows 8-11 = swim (4 dirs), rows 12-13 = more animations.
- **Animal wander zones**: `spawnWanderingAnimal` places animals *below* `baseRow+rowSpan` by default (1 row). Use `wanderRows` param for wider vertical zones. Pigs use `wanderRows=2` for crop area, ducks use `wanderRows=1` to stay below cliff.
- **All animal spritesheets**: 4 cols × N rows. Top 4 rows = walk (down/left/right/up). Crop to just those.
- **Processing detection**: `window.FarmResources.getQueue(key)` returns queue array. `queue[0].waiting` = false means actively processing.
- **Cell re-render vs in-place update**: `renderGrid()` rebuilds entire DOM (called on build/plant/harvest). `updateCounts()` runs on a timer for in-place updates. Station animation toggle uses `.fp-station-active` class add/remove in `updateCounts()` to avoid DOM churn.
- **Always render STATION_ANIM stations as the animation div** (idle = frame 0) so sizing is consistent — except kitchen, which swaps between static empty-pot img (idle) and animation div (processing).
- **Kitchen pot frame 0** has no fire/food (empty pot) — removed from animation strip, kept as static idle image. Frames 1-4 have consistent fire+food+steam.
- **Processing countdown text** (`.fp-cell-processing-indicator`) hidden via `display: none` — timer still visible in station popup.
