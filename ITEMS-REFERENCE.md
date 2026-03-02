# Items Sheet Reference Guide

**Sheet**: `static/images/skills/items_sheet.png`
**Source**: `items_sheet (1).png`
**Grid**: 36 columns x 35 rows, 16x16px per cell, ~1244 items
**Item numbering**: Left-to-right, top-to-bottom. Item N is at `col = (N-1) % 36`, `row = floor((N-1) / 36)`, pixel position `x = col * 16`, `y = row * 16`.

---

## Category Map

| Rows | Items | Category | Count | Skill Relevance |
|------|-------|----------|-------|-----------------|
| 0-1 | 1-72 | Swords, Daggers, Axes | 72 | Crafting (weapons) |
| 2-3 | 73-144 | Staves, Wands, Scepters | 72 | Crafting (magic weapons) |
| 4 | 145-180 | Bows, Boomerangs, Medals | 36 | Crafting (ranged) |
| 5 | 181-216 | Spears, Shields, Helmets | 36 | Crafting (armor) |
| 6 | 217-252 | Chest Armor | 36 | Crafting (armor) |
| 7 | 253-288 | Leg Armor, Boots, Gloves | 36 | Crafting (armor) |
| 8 | 289-324 | Hats, Crowns, Headgear | 36 | Crafting (armor) |
| 9-11 | 325-432 | Raw & Cooked Food | 108 | Cooking ingredients + output |
| 12 | 433-468 | Shells, Seafood | 36 | Fishing byproducts |
| 13 | 469-504 | More Food, Herbs, Utensils | 36 | Cooking ingredients |
| 14 | 505-540 | Prepared Dishes, Scrolls | 36 | Cooking output, misc |
| 15a | 541-558 | Gems & Crystals | 18 | Mining gem drops |
| 15b | 559-576 | Bars & Ingots | 18 | Smithing output |
| 16a | 577-600 | Ore Chunks & Minerals | 24 | Mining (alt ore sprites) |
| 16b | 601-612 | Gift Boxes, Stars | 12 | Event rewards |
| 17 | 613-648 | Sushi, Plates, Utensils | 36 | Cooking output |
| 18 | 649-684 | Books, Scrolls, Maps, Keys | 36 | Misc/quest items |
| 19 | 685-720 | Hearts, Potions, Misc | 36 | Combat consumables |
| 20 | 721-756 | Tools (Hammers, Pickaxes) | 36 | Skill tool upgrades |
| 21 | 757-792 | Quills, Compasses, Bones | 36 | Misc |
| 22 | 793-828 | Rings, Pendants, Mirrors | 36 | Accessories/dungeon gear |
| 23 | 829-864 | Instruments, Feathers, Masks | 36 | Cosmetics |
| 24 | 865-900 | Rings, Capes, Wands | 36 | Equipment |
| 25-26 | 901-972 | Bottles, Lanterns, Bags | 72 | Misc tools |
| 27 | 973-1008 | Seeds, Wood Logs, Leaves | 36 | Woodcutting + Farming |
| 28 | 1009-1044 | Flowers, Herbs, Seeds | 36 | Farming/Cooking |
| 29 | 1045-1080 | Fish | 36 | Fishing catches |
| 30 | 1081-1116 | Shells, Starfish, Coral | 36 | Fishing byproducts |
| 31a | 1117-1136 | Ore Chunks | 20 | Mining ores |
| 31b | 1137-1152 | Refined Ore / Containers | 16 | Misc |
| 32 | 1153-1188 | Rings, Orbs, Skulls, Bones | 36 | Dungeon loot |
| 33-34 | 1189-1244 | Misc Organic, Final Items | 56 | Misc |

---

## Material Pairing System (v7)

16 ores (Row 15-16) and 12 bars (Row 15) with alloy smelting recipes.

### 12 Smelting Recipes (Ore → Bar)

| Tier | Smithing Lv | Bar | Inputs | Type | Bar x,y |
|------|-------------|-----|--------|------|---------|
| 1 | 1 | Copper Bar | 2x Copper Ore | Simple | 384,240 |
| 2 | 8 | Bronze Bar | 1x Copper + 2x Crimson | Alloy | 368,240 |
| 3 | 18 | Gold Bar | 3x Gold Ore | Simple | 416,240 |
| 4 | 25 | Astral Bar | 2x Astral + 1x Iron | Alloy | 336,240 |
| 5 | 32 | Silver Bar | 3x Silver + 1x Coal | Coal | 400,240 |
| 6 | 42 | Emerald Bar | 4x Emerald + 2x Coal | Coal | 448,240 |
| 7 | 52 | Mithril Bar | 3x Mithril + 2x Shadow | Alloy | 432,240 |
| 8 | 62 | Amethyst Bar | 4x Amethyst + 2x Coal | Coal | 496,240 |
| 9 | 72 | Cobalt Bar | 5x Cobalt + 2x Slate | Alloy | 480,240 |
| 10 | 80 | Molten Bar | 4x Molten + 3x Coal | Coal | 352,240 |
| 11 | 88 | Frost Bar | 5x Frost + 3x Coal | Coal | 464,240 |
| 12 | 94 | Obsidian Bar | 5x Obsidian + 5x Coal | Coal | 512,240 |

### 16 Mining Ores

| # | Name | Mining Lv | Ore x,y | Has Bar? | Notes |
|---|------|-----------|---------|----------|-------|
| 1 | Copper Ore | 1 | 16,256 | Copper Bar | |
| 2 | Crimson Ore | 5 | 0,256 | Bronze Bar (alloy) | |
| 3 | Coal | 10 | 144,256 | — | Smelting fuel |
| 4 | Iron Ore | 18 | 560,240 | Astral Bar (alloy) | |
| 5 | Gold Ore | 24 | 32,256 | Gold Bar | |
| 6 | Silver Ore | 30 | 528,240 | Silver Bar | |
| 7 | Astral Ore | 36 | 48,256 | Astral Bar | |
| 8 | Shadow Ore | 42 | 544,240 | Mithril Bar (alloy) | |
| 9 | Emerald Ore | 48 | 64,256 | Emerald Bar | |
| 10 | Slate Ore | 54 | 528,256 | Cobalt Bar (alloy) | |
| 11 | Mithril Ore | 60 | 128,256 | Mithril Bar | |
| 12 | Amethyst Ore | 66 | 112,256 | Amethyst Bar | |
| 13 | Cobalt Ore | 72 | 80,256 | Cobalt Bar | |
| 14 | Molten Ore | 78 | 160,256 | Molten Bar | |
| 15 | Frost Ore | 85 | 320,256 | Frost Bar | |
| 16 | Obsidian Ore | 92 | 96,256 | Obsidian Bar | |

4 ores are alloy-only (no own bar): Coal (fuel), Iron, Shadow, Slate.

### v6 → v7 Rename Map

| Old Name | New Name | Reason |
|----------|----------|--------|
| Iron Bar | Astral Bar | Sprite is grey-purple, not iron |
| Iron Sword/Axe/Chestplate | Astral Sword/Axe/Chestplate | Matches Astral Bar rename |
| Bronze Ore | Crimson Ore | Freed for Bronze Bar = Copper+Crimson alloy |

### Previous Rename Maps

**v5 → v6**: Tin→Bronze, Jade→Emerald, Amethyst→Mithril, Ruby→Amethyst, Frost→Cobalt, Dragon→Frost, Star→Obsidian

---

## Named Item Assignments

### Mining Ores (16 ores, Rows 15-16)

| Item # | x,y (px) | Name | Tier | Level |
|--------|----------|------|------|-------|
| #578 | 16,256 | Copper Ore | 1 | 1 |
| #577 | 0,256 | Crimson Ore | 2 | 5 |
| #586 | 144,256 | Coal | 3 | 10 |
| #576 | 560,240 | Iron Ore | 4 | 18 |
| #579 | 32,256 | Gold Ore | 5 | 24 |
| #574 | 528,240 | Silver Ore | 6 | 30 |
| #580 | 48,256 | Astral Ore | 7 | 36 |
| #575 | 544,240 | Shadow Ore | 8 | 42 |
| #581 | 64,256 | Emerald Ore | 9 | 48 |
| #610 | 528,256 | Slate Ore | 10 | 54 |
| #585 | 128,256 | Mithril Ore | 11 | 60 |
| #584 | 112,256 | Amethyst Ore | 12 | 66 |
| #582 | 80,256 | Cobalt Ore | 13 | 72 |
| #587 | 160,256 | Molten Ore | 14 | 78 |
| #597 | 320,256 | Frost Ore | 15 | 85 |
| #583 | 96,256 | Obsidian Ore | 16 | 92 |

### Gems (Row 15: items 541-558)

10 gem types, random drops from mining.

| Item # | Col,Row | x,y (px) | Name |
|--------|---------|----------|------|
| 541 | 0,15 | 0,240 | Peridot |
| 543 | 2,15 | 32,240 | Emerald |
| 545 | 4,15 | 64,240 | Aquamarine |
| 547 | 6,15 | 96,240 | Topaz |
| 549 | 8,15 | 128,240 | Onyx |
| 551 | 10,15 | 160,240 | Moonstone |
| 552 | 11,15 | 176,240 | Diamond |
| 555 | 14,15 | 224,240 | Opal |
| 544 | 3,15 | 48,240 | Sapphire |
| 548 | 7,15 | 112,240 | Ruby |

### Bars / Ingots (Row 15: 12 bars, all y=240)

| Item # | x,y (px) | Name | Smelted From |
|--------|----------|------|--------------|
| #565 | 384,240 | Copper Bar | 2 Copper Ore |
| #564 | 368,240 | Bronze Bar | 1 Copper + 2 Crimson |
| #567 | 416,240 | Gold Bar | 3 Gold Ore |
| #562 | 336,240 | Astral Bar | 2 Astral + 1 Iron |
| #566 | 400,240 | Silver Bar | 3 Silver + 1 Coal |
| #569 | 448,240 | Emerald Bar | 4 Emerald + 2 Coal |
| #568 | 432,240 | Mithril Bar | 3 Mithril + 2 Shadow |
| #572 | 496,240 | Amethyst Bar | 4 Amethyst + 2 Coal |
| #571 | 480,240 | Cobalt Bar | 5 Cobalt + 2 Slate |
| #563 | 352,240 | Molten Bar | 4 Molten + 3 Coal |
| #570 | 464,240 | Frost Bar | 5 Frost + 3 Coal |
| #573 | 512,240 | Obsidian Bar | 5 Obsidian + 5 Coal |

### Fish (Row 29: items 1045-1080)

12 tiers of fish, unlocking as fishing level increases.

| Item # | Col,Row | x,y (px) | Name | Tier | Level |
|--------|---------|----------|------|------|-------|
| 1045 | 0,29 | 0,464 | Minnow | 1 | 1 |
| 1047 | 2,29 | 32,464 | Shrimp | 2 | 5 |
| 1049 | 4,29 | 64,464 | Perch | 3 | 10 |
| 1051 | 6,29 | 96,464 | Trout | 4 | 20 |
| 1053 | 8,29 | 128,464 | Bass | 5 | 30 |
| 1055 | 10,29 | 160,464 | Salmon | 6 | 40 |
| 1058 | 13,29 | 208,464 | Catfish | 7 | 50 |
| 1063 | 0,30 | 0,480 | Swordfish | 8 | 60 |
| 1066 | 3,30 | 48,480 | Lobster | 9 | 65 |
| 1070 | 7,30 | 112,480 | Shark | 10 | 75 |
| 1074 | 11,30 | 176,480 | Anglerfish | 11 | 85 |
| 1078 | 15,30 | 240,480 | Leviathan | 12 | 95 |

### Wood / Logs (Row 27: items 990-997)

8 tiers of wood, unlocking as woodcutting level increases.

| Item # | Col,Row | x,y (px) | Name | Tier | Level |
|--------|---------|----------|------|------|-------|
| 990 | 17,27 | 272,432 | Pine Log | 1 | 1 |
| 991 | 18,27 | 288,432 | Oak Log | 2 | 10 |
| 992 | 19,27 | 304,432 | Birch Log | 3 | 20 |
| 993 | 20,27 | 320,432 | Maple Log | 4 | 35 |
| 994 | 21,27 | 336,432 | Walnut Log | 5 | 50 |
| 995 | 22,27 | 352,432 | Mahogany Log | 6 | 65 |
| 996 | 23,27 | 368,432 | Yew Log | 7 | 80 |
| 997 | 24,27 | 384,432 | Elder Log | 8 | 92 |

### Cooking Ingredients (Rows 9-14, 17) — Future

| Item # | Category | Example Name |
|--------|----------|-------------|
| 325 | Raw Food | Mushroom |
| 329 | Raw Food | Grapes |
| 332 | Raw Food | Watermelon |
| 337 | Raw Food | Bread |
| 345 | Raw Food | Egg |
| 613-620 | Prepared | Sushi, Sandwich, etc. |

### Tools — Pickaxes, Axes, Rods (Row 20)

| Item # | x,y (px) | Tool Type |
|--------|----------|-----------|
| 731-735 | various | Pickaxes (5 color tiers) |
| 737-741 | various | Shovels (5 tiers) |
| 745-749 | various | Keys (misc) |

---

## Coordinate Formula

For any item number N (1-indexed):
```
col = (N - 1) % 36
row = Math.floor((N - 1) / 36)
x = col * 16
y = row * 16
```

## Usage in Code

```js
// In SKILL_SPRITE_PATHS:
'items_sheet': '/images/skills/items_sheet.png'

// In SKILL_SHEET_META:
'items_sheet': { w: 576, h: 560 }

// In ITEM_ICON_MAP (v7 — 16 ores, 12 bars):
'Copper Ore': { sheet: 'items_sheet', x: 16, y: 256 }   // item #578
'Copper Bar':  { sheet: 'items_sheet', x: 384, y: 240 }  // item #565
```

---

## New Skills (Planned)

### Cooking (Skill 6)
- **Input**: Fish (from fishing) + raw food ingredients (rows 9-14)
- **Output**: Prepared meals that heal HP in combat (rows 9-14, 17)
- **Sprites**: 100+ food sprites available

### Crafting (Skill 7)
- **Input**: Bars (from smithing) + gems (from mining)
- **Output**: Weapons and armor for dungeon gear system (rows 0-8)
- **Sprites**: 200+ weapon/armor sprites available

### Magic / Alchemy (Skill 8)
- **Input**: Consume any produced items (ores, bars, fish, logs, food)
- **Output**: Enchanted items, potions, magical upgrades (row 19, rows 22-24)
- **Sprites**: Potions, rings, orbs, accessories
