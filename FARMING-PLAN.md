# Pet Farm & Silk Road Plan

## Vision

An idle farming game layered on top of every page. Pets autonomously tend
small crop plots anchored to the bottom of the screen — planting, watering,
and harvesting in real time while the user browses. Harvested crops sell for
**Jack Bucks**, a second currency spent at the **Silk Road** — a shady
terminal-style black market for farming upgrades, rare seeds, and exclusive
cosmetics not available in the regular shop.

---

## 1. Jack Bucks (Currency)

### Storage

```
localStorage key: 'arebooksgood-jackbucks'

{
  bucks: 0,
  totalEarned: 0,
  totalSpent: 0
}
```

### Earning

- Selling harvested crops (only source)
- No starting balance — you earn your first bucks from free starter seeds

### Wallet UI

- Add a second balance to the header widget: `[ 1,250 coins | 40 JB ]`
- Jack Bucks abbreviated as **JB** with a subtle different color (accent)
- Clicking JB opens Silk Road

---

## 2. Farm Plots

### Layout

Plots sit in a fixed-position bar along the bottom of the screen, left of
the pet dock. Each plot is a small square (48x48px desktop, 42x42px mobile).

```
┌──────────────────────────────────────────────────────┐
│                    page content                      │
│                                                      │
│                                                      │
│  [plot1] [plot2] [plot3] [plot4]            [dock]   │
└──────────────────────────────────────────────────────┘
```

- Start with **2 plots**, expandable to **6** via Silk Road
- Plots have a dashed border (like the dock) and a subtle dirt-colored fill
- Empty plots show a "+" icon; clicking plants a seed from inventory
- Plots are hidden when pet is hidden (same toggle)

### Plot States

| State      | Visual                          | Duration        |
|------------|---------------------------------|-----------------|
| empty      | Dashed border, "+" icon         | —               |
| planted    | Seed sprite, dirt mound         | Instant         |
| sprouting  | Small green sprout              | 25% of grow time|
| growing    | Medium plant                    | 50% of grow time|
| flowering  | Full plant with color           | 75% of grow time|
| ready      | Glowing/bouncing, harvest icon  | Until harvested |
| withered   | Brown/wilted sprite             | See Withering   |

### Growth System

Growth is **timestamp-based** — crops grow in real time, even when the
site is closed.

```
localStorage key: 'arebooksgood-farm'

{
  plots: [
    { crop: 'carrot', plantedAt: 1707600000000, watered: true },
    { crop: null },
    null,  // locked plot
    null
  ],
  inventory: {
    seeds: { carrot: 3, potato: 1 },
    harvest: { carrot: 0, potato: 0 }
  },
  unlockedPlots: 2
}
```

On page load:
1. Calculate `elapsed = Date.now() - plantedAt`
2. Compare against crop's `growTime` to determine stage
3. Render correct sprite
4. If elapsed > growTime → mark as ready

### Withering (Optional, Phase 2)

If a crop sits unharvested for 2x its grow time, it withers and is lost.
Creates urgency without being punishing (generous window). Withered plots
can be cleared for free.

---

## 3. Crops

### Starter Crops (Free Seeds)

| Crop       | Grow Time | Sell (JB) | Sprite Idea          |
|------------|-----------|-----------|----------------------|
| Carrot     | 5 min     | 2 JB      | Orange pixel root    |
| Potato     | 15 min    | 5 JB      | Brown lump           |
| Wheat      | 30 min    | 8 JB      | Golden stalks        |

### Common Crops (Silk Road)

| Crop       | Seed Cost | Grow Time | Sell (JB) | Sprite Idea         |
|------------|-----------|-----------|-----------|---------------------|
| Tomato     | 5 JB      | 1 hr      | 20 JB     | Red circle on vine  |
| Corn       | 8 JB      | 2 hr      | 40 JB     | Yellow cob          |
| Pumpkin    | 12 JB     | 4 hr      | 75 JB     | Orange round        |

### Rare Crops (Silk Road, unlocked at milestones)

| Crop         | Seed Cost | Grow Time | Sell (JB) | Sprite Idea        |
|--------------|-----------|-----------|-----------|---------------------|
| Golden Apple | 25 JB     | 8 hr      | 150 JB    | Glowing gold apple  |
| Crystal Herb | 40 JB     | 12 hr     | 200 JB    | Shimmering cyan     |
| Dragon Fruit | 75 JB     | 24 hr     | 500 JB    | Magenta spiky fruit |

### Exotic / Secret Crops (Phase 3+)

- **Binary Bloom**: Only grows while on the chess page. 6hr, 500 JB.
- **Lucky Clover**: Only grows while on casino pages. 4hr, 200 JB.
  Plus a small casino coin bonus on harvest.
- **Book Worm Truffle**: Only grows while reading reviews. 3hr, 150 JB.

---

## 4. Pet Farming AI

### Autonomous Behavior

When idle (not being dragged/flung, not sleeping), the pet can auto-tend
plots on a timer:

```
Every 20-30s (randomized):
  1. Find a plot that needs attention (ready > unwatered > nothing)
  2. Walk to that plot (using pet-following transition)
  3. Play interaction animation (1-2s)
  4. Apply effect (harvest, water, etc.)
  5. Walk back to idle position or dock
```

### Pet Farming Bonuses

| Pet    | Passive Bonus                                          |
|--------|--------------------------------------------------------|
| Cat    | **Green Paw**: 15% chance to auto-replant after harvest|
| Dragon | **Warm Soil**: 10% growth speed bonus on all crops     |
| Robot  | **Auto-Harvest**: Harvests ready crops automatically   |

Bonuses scale with pet level:
- Level 1: Base bonus
- Level 2: Bonus + occasionally finds bonus seeds
- Level 3: Bonus + rare chance of double harvest

### Interaction Animations

- **Harvesting**: Pet walks to plot → celebrate animation → crop particle
  floats up → harvest added to inventory
- **Watering**: Pet walks to plot → idle near it for 1s → small droplet
  particles → crop gets watered buff
- **Planting**: When auto-replanting (cat), pet walks to plot → dig
  animation → seed placed

### Speech Lines

```js
FARM_MESSAGES = {
  cat: ['*digs in dirt*', 'fresh catnip?', '*paws at sprout*', 'harvest time!'],
  dragon: ['*warms the soil*', 'grow faster!', '*smoke fertilizer*', 'FIRE HARVEST'],
  robot: ['CROP STATUS: READY', 'harvesting...', 'yield: optimal', 'soil pH: 6.5']
};
```

---

## 5. The Silk Road (Store)

### Theme & UI

Terminal black-market aesthetic:
- Dark background override, green-tinted text
- ASCII art merchant character at top
- Merchant dialogue rotates: shady, humorous lines
- Items displayed in a terminal-style list or grid

```
╔══════════════════════════════════════════╗
║  THE SILK ROAD        balance: 142 JB   ║
╠══════════════════════════════════════════╣
║                                          ║
║  > You didn't hear about this from me.   ║
║                                          ║
║  ┌─ SEEDS ─────────────────────────────┐ ║
║  │ [tomato]  5 JB   ░░░░░ [BUY]       │ ║
║  │ [corn]    8 JB   ░░░░░ [BUY]       │ ║
║  │ [pumpkin] 12 JB  ░░░░░ [BUY]       │ ║
║  └─────────────────────────────────────┘ ║
║                                          ║
║  ┌─ UPGRADES ─────────────────────────┐  ║
║  │ [+1 plot]   50 JB  ░░░░░ [BUY]    │  ║
║  │ [sprinkler] 100 JB ░░░░░ [BUY]    │  ║
║  └────────────────────────────────────┘  ║
╚══════════════════════════════════════════╝
```

### Inventory: Seeds

Seeds purchased from the Silk Road go into inventory. When clicking an
empty plot, a seed picker appears showing available seeds with quantities.

### Inventory: Upgrades

| Upgrade         | Cost    | Effect                                     |
|-----------------|---------|--------------------------------------------|
| Extra Plot      | 50 JB   | Unlock 1 additional plot (max 6 total)     |
| Sprinkler       | 100 JB  | Auto-waters all plots (no wither risk)     |
| Fertilizer x5   | 25 JB   | Apply to a crop: halves remaining grow time|
| Scarecrow       | 75 JB   | Prevents withering on all plots            |
| Golden Trowel   | 200 JB  | +25% sell price on all harvests            |
| Seed Bag        | 150 JB  | Harvesting has 20% chance to drop a seed   |

### Exclusive Cosmetics (Jack Bucks only)

These are NOT in the regular coin shop — Silk Road exclusives:

| Item              | Cost    | Effect                                    |
|-------------------|---------|-------------------------------------------|
| Farmer Hat        | 300 JB  | Pet accessory — straw hat sprite overlay  |
| Dirt Trail        | 500 JB  | Pet leaves tiny dirt particles when walking|
| Overgrown Theme   | 1000 JB | Vine/leaf CSS border decorations site-wide|
| Harvest Moon      | 800 JB  | Subtle warm glow background effect        |

### Merchant Dialogue

Rotates on each visit or purchase:

```js
MERCHANT_LINES = [
  "You didn't get these seeds from me.",
  "Finest produce this side of localhost.",
  "No refunds. No questions.",
  "I also accept crypto. Just kidding.",
  "These seeds fell off a truck.",
  "Back again? I like repeat customers.",
  "The feds don't know about this page.",
  "Tell your friends. Actually, don't.",
  "Dragon fruit? Straight from the dark web.",
  "Grade A, organic, totally legitimate."
];
```

---

## 6. Farmhouse

### Concept

A pixel-art farmhouse anchored on screen (right side, above the dock) that
serves as the pet's home base for farming. It starts as a tiny shack and
upgrades visually as you invest Jack Bucks — giving the player a satisfying
sense of progression every time they visit the site.

### Layout

```
┌──────────────────────────────────────────────────────┐
│                    page content                      │
│                                                      │
│                                          [farmhouse] │
│  [plot1] [plot2] [plot3] [plot4]            [dock]   │
└──────────────────────────────────────────────────────┘
```

- Fixed position, bottom-right, sits above the dock
- Rendered with box-shadow pixel art (same system as pet sprites)
- Clicking it opens a status panel (crop timers, pet bonus info, quick sell)

### Upgrade Levels

| Level | Name           | Cost   | Visual                          | Bonus                          |
|-------|----------------|--------|---------------------------------|--------------------------------|
| 1     | Dirt Shack     | Free   | Tiny brown hut, no roof         | Base — unlocks farming         |
| 2     | Wooden Cabin   | 100 JB | Small cabin with peaked roof    | +10% crop sell price           |
| 3     | Stone Farmhouse| 300 JB | Larger stone house, chimney     | +20% sell price, crops grow 10% faster |
| 4     | Manor          | 800 JB | Big house, windows, fence       | +30% sell price, 15% faster, auto-water |
| 5     | Golden Estate  | 2000 JB| Grand building, gold trim, flag | +50% sell price, 25% faster, auto-water, rare seed drops |

### Visual Progression

Each level is a distinct pixel-art sprite (16x16 grid scaled up, like the
pets). The upgrade is animated — flash/pulse effect, construction particles,
pet celebrates. The farmhouse should feel like the centerpiece of the farm.

- Level 1: 4-5 pixels tall, brown/grey, barely a structure
- Level 2: Recognizable house shape, wooden color
- Level 3: Taller, stone texture, smoke from chimney (animated)
- Level 4: Multi-story, lit windows (glow animation), small fence
- Level 5: Gold accent color, flag on top (waves), particle sparkles

### Farmhouse Panel (Click to Open)

A small popup/tooltip showing:
- Current farmhouse level + upgrade button (if affordable)
- Active crop timers: "Carrot: 2m left, Corn: 1h 15m left"
- Pet farming bonus summary
- Quick-sell button: sell all harvested crops at once
- Total JB earned from farming (lifetime stat)

### Storage

```
Added to 'arebooksgood-farm' localStorage:

{
  farmhouse: { level: 1 },
  plots: [...],
  inventory: {...},
  ...
}
```

### Implementation Phase

Farmhouse slots into **Phase 3** alongside the Silk Road — it's purchased
and upgraded there. Phase 1-2 work without it (plots + pet AI are
standalone). The Level 1 shack appears for free once farming is unlocked.

---

## 7. File Structure

```
content/
  casino/
    silk-road/
      index.md              <- Silk Road store page (layout: silk-road)

layouts/
  casino/
    silk-road.html          <- Silk Road store layout

themes/terminal-books/
  assets/
    js/
      farm.js               <- Farm system (plots, crops, growth, pet AI)
      silk-road.js           <- Silk Road store UI
      jackbucks.js           <- Jack Bucks wallet module
    css/
      farm.css              <- Plot styling, crop sprites, farm bar
      silk-road.css          <- Silk Road store page styling
    data/
      crops.json            <- Crop definitions (grow times, sprites, prices)

  layouts/_partials/
    header.html             <- Modified: add JB balance display
    head.html               <- Modified: load farm.js globally
    baseof.html             <- Modified: load farm.css globally
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Farm MVP) ✅ DONE
1. ~~Create `jackbucks.js` — JB wallet read/write API~~
2. ~~Create `farm.js` — plot system, crop growth, localStorage state~~
3. ~~Create `farm.css` — plot bar layout, empty/planted/ready states~~
4. ~~Create `crops.json` — starter crop definitions (carrot, potato, wheat)~~
5. ~~Add farm bar DOM to page (fixed bottom strip, left of dock)~~
6. ~~Implement click-to-plant with starter seeds (infinite free seeds)~~
7. ~~Implement real-time growth with timestamp math~~
8. ~~Implement click-to-harvest → adds JB~~
9. ~~Add JB to header wallet widget~~
10. ~~Wire up pet visibility toggle to also hide/show farm bar~~

### Phase 2: Pet Farming AI ✅ DONE
1. ~~Add autonomous walk-to-plot behavior on idle timer~~
2. ~~Add pet harvesting interaction (walk → celebrate → collect)~~
3. ~~Add per-pet farming bonuses (cat/dragon/robot)~~
4. ~~Add farm-specific speech lines~~
5. ~~Add harvest particle effects (crop icon floats up)~~

### Phase 3: Silk Road Store & Farmhouse ✅ DONE
1. ~~Create Silk Road page layout with terminal aesthetic~~
2. ~~Implement seed purchasing → inventory system~~
3. ~~Implement seed picker UI when clicking empty plot~~
4. ~~Add common crops (tomato, corn, pumpkin)~~
5. ~~Add plot expansion upgrade~~
6. ~~Add merchant dialogue system~~
7. ~~Add link in nav + header JB click target~~
8. ~~Add Level 1 farmhouse (appears on screen, clickable status panel)~~
9. ~~Add farmhouse upgrades to Silk Road store~~
10. ~~Create pixel-art sprites for each farmhouse level~~
11. ~~Implement farmhouse bonuses (sell price, grow speed, auto-water)~~

### Phase 4: Full Silk Road ✅ DONE
1. ~~Add all upgrades (sprinkler, fertilizer, scarecrow, golden trowel, seed bag)~~
2. ~~Add rare crops (golden apple, crystal herb, dragon fruit)~~
3. ~~Add exclusive cosmetics (farmer hat, dirt trail, overgrown theme, harvest moon)~~
4. ~~Add milestone unlocks for rare seed availability~~
5. Withering system — not implemented (decided against it)

### Phase 5: Secret Crops & Polish (Not Started)
1. Add page-specific exotic crops (binary bloom, lucky clover, book worm truffle)
2. Add crop collection / compendium tracker
3. Add farming achievements
4. Sound effects (subtle harvest chime, plant pop)
5. Tutorial/onboarding for first-time farmers

---

## 8. Technical Considerations

### Performance
- `farm.js` must be lightweight (<3KB). Growth calculations are pure math,
  no timers needed — just check timestamps on page load and periodically
- Crop sprites reuse the box-shadow pixel art system from pet.js
- Farm bar uses same CSS variable theming as everything else
- Pet AI loop piggybacks on existing idle timer, no extra intervals

### Offline Growth
- Growth is timestamp-based, so crops grow while the site is closed
- On page load: `elapsed = Date.now() - plantedAt`, determine stage
- Multiple crops can complete while offline — all harvested on return
- Pet auto-harvest (robot) processes ready crops immediately on load

### Mobile
- Farm bar uses `position: fixed; bottom` (same pattern as dock)
- Plots slightly smaller on mobile (42x42px)
- Seed picker is a bottom sheet / modal
- Touch-friendly: tap plot to plant/harvest, long-press for info

### Interaction with Existing Systems
- Pet dock sits at far right; farm plots fill leftward from it
- When pet is docked, it can still auto-tend (walks out, tends, returns)
- Casino coins and Jack Bucks are fully independent economies
- Farm state saves to its own localStorage key (no conflicts)
- Farm bar hidden on Silk Road page itself (you're already in the store)

---

## 9. Economy Balancing

### Early Game (Day 1)
- 2 plots, free carrot/potato/wheat seeds
- Carrots every 5min = ~24 JB/hr if actively replanting
- First upgrade (extra plot) at 50 JB = ~2hrs casual play

### Mid Game (Week 1)
- 4 plots, common crops unlocked
- Corn (2hr, 40 JB) in 4 plots = 80 JB/hr passive
- Saving for rare seeds and tool upgrades

### Late Game (Week 2+)
- 6 plots, rare crops, all upgrades
- Dragon fruit (24hr, 500 JB) in 6 plots = 3,000 JB/day passive
- Exclusive cosmetics as long-term goals (1,000+ JB)

### Key Principle
Growth should feel rewarding at every stage. Short crops for active
players, long crops for "check once a day" players. No forced engagement.
