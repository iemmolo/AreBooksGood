# Tower Defense Sprite Asset Reference

Comprehensive mapping of the **tower-defense-2d-game-kit-v1.1** asset pack to the AreBooksGood tower defense game.

---

## Directory Structure

```
_asset-pack/tower-defense-2d-game-kit-v1.1/
├── monster-enemy-game-sprites/PNG/{1..10}/   ← 10 animated enemies (primary set)
├── archer-tower-game-assets/PNG/             ← Archer tower (54 sprites + composites)
├── magic-tower-game-assets/PNG/              ← Magic tower (30 sprites + composite)
├── support-tower-game-assets/PNG/            ← Support tower (17 sprites + composite)
├── stone-tower-game-assets/PNG/              ← Stone tower (61 part sprites, no composite)
├── magic-effects-game-sprite/PNG/            ← 9 effect types
├── td-tilesets/tower-defense-game-tilesets/  ← 4 map backgrounds + layers
├── td-gui/PNG/                               ← 13 GUI categories (208 files)
├── 2d-monster-sprites/PNG/                   ← Alt monster set #1
├── monster-character-2d-sprites/PNG/         ← Alt monster set #2
└── tower-defense-monster-2d-sprites/PNG/     ← Alt monster set #3
```

---

## Enemy Sprite Inventory

### Source: `monster-enemy-game-sprites/PNG/{1..10}/`

All 10 monsters share:
- **7 animations each**: idle, walk, attack, hurt, die, jump, run
- **20 frames per animation** (140 frames per monster)
- **Frame naming**: `{M}_enemies_1_{anim}_{NNN}.png` (e.g., `1_enemies_1_walk_005.png`)
- **Files are flat** in each numbered folder (no animation subdirectories)
- **We use 5 of 7 animations**: idle, walk, attack, hurt, die (skip jump, run)

| Monster | Frame Size (px) | Visual Description | Game Enemy Type |
|---------|----------------|--------------------|--------------------|
| 1 | 294 × 275 | Green slime blob | `slime` |
| 2 | 343 × 348 | Purple horned demon | `boss` |
| 3 | 349 × 291 | Armored skeleton warrior | `skeleton` |
| 4 | 254 × 205 | Small green goblin | `goblin` |
| 5 | 292 × 248 | Cloaked necromancer | `healer` |
| 6 | 316 × 269 | Heavy armored orc | `orc` |
| 7 | 380 × 332 | Giant rock golem | `shielder` |
| 8 | 339 × 285 | Winged dark bat | `ghost` |
| 9 | 309 × 257 | Tribal warrior with spear | `splitter` |
| 10 | 269 × 218 | Magic crystal elemental | *(extra/future)* |

### Enemy-to-Sprite Mapping Table

```javascript
var ENEMY_SPRITE_MAP = {
    slime:    1,   // Green slime → Monster 1 (blob)
    skeleton: 3,   // Skeleton → Monster 3 (armored skeleton)
    goblin:   4,   // Goblin → Monster 4 (small green goblin)
    healer:   5,   // Healer → Monster 5 (cloaked necromancer)
    orc:      6,   // Orc → Monster 6 (heavy armored orc)
    splitter: 9,   // Splitter → Monster 9 (tribal warrior)
    ghost:    8,   // Ghost → Monster 8 (winged dark bat)
    shielder: 7,   // Shielder → Monster 7 (giant rock golem)
    boss:     2    // Boss → Monster 2 (purple horned demon)
};
```

### Processing for Game

- **Sample every 2nd frame**: 20 → 10 frames per animation (reduce sheet size)
- **Auto-trim transparent padding**: Remove excess alpha border
- **Downscale to 48px height**: Keep aspect ratio (typically ~52×48 output)
- **Pack as horizontal strip per animation**: 5 rows (idle, walk, attack, hurt, die)
- **Output**: `static/images/td/enemies/enemy-{N}.png`

---

## Tower Sprite Inventory

### Archer Tower
- **Source**: `archer-tower-game-assets/PNG/`
- **Composite**: `All_without_a_shadow.png` (2532 × 7226)
- **Individual sprites**: 54 files (1.png–54.png), mix of full towers + parts
- **Tier mapping**: 5 visual tiers in composite → use tiers 1, 2, 3, 5 for levels 1–4
- **Game type**: `arrow`, `sniper`

### Magic Tower
- **Source**: `magic-tower-game-assets/PNG/`
- **Composite**: `without_a_shadow.png` (2602 × 7610)
- **Individual sprites**: 30 files
- **4 elemental variants**: Gold (fire), Ice/Green (frost), Blue (lightning)
- **Game types**: `fire`, `frost`, `lightning`

### Support Tower
- **Source**: `support-tower-game-assets/PNG/`
- **Composite**: `without_a_shadow.png` (2522 × 6900)
- **Individual sprites**: 17 files
- **Building tiers**: Various support structures
- **Game types**: `watchtower`, `goldmine`

### Stone Tower
- **Source**: `stone-tower-game-assets/PNG/`
- **No composite** — 61 individual part sprites
- **Parts include**: Base stones (32–38px tall), assembled catapults (163–195px tall)
- **Game type**: `cannon`

### Tower-to-Sprite Mapping Table

```javascript
var TOWER_SPRITE_MAP = {
    arrow:      { sheet: 'tower-archer',    frames: 4 },
    cannon:     { sheet: 'tower-stone',     frames: 4 },
    frost:      { sheet: 'tower-magic-ice', frames: 4 },
    fire:       { sheet: 'tower-magic-fire', frames: 4 },
    sniper:     { sheet: 'tower-archer',    frames: 4 },
    lightning:  { sheet: 'tower-magic-blue', frames: 4 },
    watchtower: { sheet: 'tower-support',   frames: 4 },
    goldmine:   { sheet: 'tower-support',   frames: 4 }
};
```

### Processing for Game

- **Crop from composites** where available (archer, magic, support)
- **Assemble from parts** for stone tower (pick best catapult views per level)
- **Downscale all to 48×48 px** (slightly larger than 40px tile for visual pop)
- **Pack as vertical strips**: 1 frame per level (4 frames = 48×192 per sheet)
- **Output**: `static/images/td/towers/tower-{type}.png`

---

## Effect Sprite Inventory

### Source: `magic-effects-game-sprite/PNG/`

| Effect | Frames | Frame Size (px) | Game Usage |
|--------|--------|-----------------|------------|
| `fire` | 19 | 909 × 2398 | Fire tower hits, Inferno ability |
| `freeze` | 16 | 909 × 2398 | Frost tower hits, Blizzard ability |
| `stone` | 18 | 909 × 2398 | Cannon splash impacts |
| `zip` | 14 | 909 × 2398 | Lightning chain hits, Storm ability |
| `damage` | 10 | 909 × 2398 | Generic damage indicator |
| `def` | 10 | 909 × 2398 | Shield/defense effects |
| `rain` | 39 | 909 × 2398 | *(unused — ambient)* |
| `time` | 14 | 909 × 2398 | *(unused — slow visual?)* |
| `icons` | 8 icons | varies | *(HUD icons)* |

### Frame Naming
- Pattern: `1_effect_{type}_{NNN}.png`
- Examples: `1_effect_fire_000.png`, `1_effect_freeze_015.png`
- Note: `rain` starts at `001` not `000`

### Processing for Game

- **6 priority effects**: fire, freeze, stone, zip, damage, def
- **Trim + downscale** to 64px height (keep aspect ratio)
- **Sample every 2nd frame** for effects > 14 frames
- **Output**: `static/images/td/effects/fx-{type}.png` (horizontal strips)

---

## Map Background Inventory

### Source: `td-tilesets/tower-defense-game-tilesets/PNG/`

| Map | File | Size | Theme | Game Map |
|-----|------|------|-------|----------|
| 1 | `game_background_1/game_background_1.png` | 1920 × 1080 | Forest/River with bridge | `map1` (Valley) |
| 2 | `game_background_2/game_background_2.png` | 1920 × 1080 | Desert/Lake terrain | `map2` (Switchback) |
| 3 | `game_background_3/game_background_3.png` | 1920 × 1080 | Mixed forest/river | `map3` (Spiral) |
| 4 | `game_background_4/game_background_4.png` | 1920 × 1080 | Mountain landscape | *(future map)* |

Each background also has **layered components** for custom composition:
- `main_bg` — sky/horizon
- `land` — ground layer
- `road_1` through `road_10` — path segments
- `river_1` through `river_6` — water segments (maps 1, 3)
- `bridge` — crossing elements (maps 1, 3)
- `decor_1` through `decor_N` — decoration props
- `stone`, `tree`, `bush`, `fence`, `dot` — detail elements

### Processing for Game

- **Scale** from 1920×1080 → 640×480
- **Output**: `static/images/td/maps/map-{N}.png`
- **Runtime**: Draw as backdrop, overlay with 30% `colorBg` for terminal feel

---

## GUI Inventory

### Source: `td-gui/PNG/`

| Category | Files | Key Assets |
|----------|-------|------------|
| `achievement` | 13 | Window, stars, unlock badges |
| `difficulty` | 10 | Easy/Normal/Hard buttons |
| `empty_table` | 6 | Background tables |
| `failed` | 8 | Game-over window + buttons |
| `interface_game` | 27 | Health bars, hearts, skulls, icons, pause/start buttons |
| `levels` | 23 | Level select, star ratings, number sprites |
| `load_bar` | 6 | Loading bar segments |
| `menu` | 16 | Logo, play/settings/social buttons |
| `registration` | 14 | Login/register form elements |
| `settings` | 19 | Volume bars, on/off toggles |
| `shop` | 24 | Crystal currencies, shop windows |
| `upgrade` | 39 | 24 upgrade icons, upgrade windows |
| `win` | 13 | Victory window, star ratings |

**Total**: 208 GUI files

> Note: We use our own terminal-themed UI, so GUI assets are reference-only.
> The `interface_game` health bars and `upgrade` icons may be useful for later polish.

---

## Alternative Monster Sets

Three additional monster sprite sets are included but **not used in primary integration**:

| Set | Path | Animations | Notes |
|-----|------|-----------|-------|
| 2d-monster-sprites | `2d-monster-sprites/PNG/{1..10}/` | 7 (lowercase) | Same format as primary |
| monster-character-2d | `monster-character-2d-sprites/PNG/{1..10}/` | 6 (UPPERCASE, no idle) | Different monsters |
| tower-defense-monster-2d | `tower-defense-monster-2d-sprites/PNG/{1..10}/` | 6 (UPPERCASE, no idle) | Yet another set |

These provide 30 additional monster designs for future enemy type expansion.

---

## Sprite Metadata File

**Output**: `static/data/td-sprites.json`

```json
{
  "enemies": {
    "1": {
      "sheet": "enemies/enemy-1.png",
      "frameW": 52, "frameH": 48,
      "animations": {
        "idle":   { "row": 0, "frames": 10, "speed": 0.08 },
        "walk":   { "row": 1, "frames": 10, "speed": 0.06 },
        "attack": { "row": 2, "frames": 10, "speed": 0.05 },
        "hurt":   { "row": 3, "frames": 10, "speed": 0.04 },
        "die":    { "row": 4, "frames": 10, "speed": 0.06 }
      }
    }
  },
  "towers": {
    "tower-archer": { "sheet": "towers/tower-archer.png", "frameW": 48, "frameH": 48, "frames": 4 },
    "tower-stone":  { "sheet": "towers/tower-stone.png",  "frameW": 48, "frameH": 48, "frames": 4 }
  },
  "effects": {
    "fire":   { "sheet": "effects/fx-fire.png",   "frameW": 64, "frameH": 64, "frames": 10, "speed": 0.04 },
    "freeze": { "sheet": "effects/fx-freeze.png", "frameW": 64, "frameH": 64, "frames": 8,  "speed": 0.05 }
  },
  "maps": {
    "1": "maps/map-1.png",
    "2": "maps/map-2.png",
    "3": "maps/map-3.png"
  }
}
```

*(Actual values populated by `scripts/pack-td-sprites.py`)*

---

## Build Pipeline

**Script**: `scripts/pack-td-sprites.py`
**Output**: `static/images/td/` + `static/data/td-sprites.json`
**Dependency**: Python 3 + Pillow (`pip install Pillow`)

```bash
python3 scripts/pack-td-sprites.py
```

---

## Estimated Output Sizes

| Category | Count | Est. Size |
|----------|-------|-----------|
| Enemy sheets | 10 | ~200 KB |
| Tower sheets | 8 | ~40 KB |
| Effect sheets | 6 | ~60 KB |
| Map backgrounds | 3 | ~450 KB |
| **Total** | **27 files** | **~750 KB** |
