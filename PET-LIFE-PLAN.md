# Phase 2.5: Pet Life — Watering & Idle Interactions

## Overview

Give pets more to do between harvests. Two new behavior systems:

1. **Auto-watering** — pet walks to growing crops and waters them for a small speed boost
2. **Idle interactions** — pet wanders to page elements it "likes" and reacts to them

Both hook into the existing `pet-farm-ai.js` AI loop, sharing the walk/cancel infrastructure.

---

## 1. Auto-Watering

### How it works

- AI tick (every 20-30s) already checks for ready crops first
- **New priority**: if no ready crops, look for **growing** crops (25-90% progress)
- Pet walks to the growing plot, plays a watering animation, crop gets a small speed boost
- Each plot can only be watered **once per growth cycle** (tracked via `wateredAt` timestamp)

### Speed boost

- Watering reduces remaining grow time by **10%** of total grow time
- Stacks with dragon's global 10% multiplier
- Applied by shifting `plantedAt` forward (so it works with existing timestamp math)

### Sequence

1. Find best growing plot (highest progress first, not yet watered)
2. `PetSystem.walkTo()` to plot position
3. Add `.farm-plot-watering` class (blue-tinted glow)
4. Show water droplet particle (`💧` floats up)
5. Wait 1.2s, apply speed boost, speak line
6. `PetSystem.returnToPosition()`

### Per-pet watering speech

```
cat:    ['*splashes water*', '*paws at puddle*', 'wet paws!', '*shakes off water*']
dragon: ['*steam hiss*', 'gentle warmth~', '*breathes mist*', 'grow, little one']
robot:  ['H2O DISPENSED', 'irrigation: active', 'moisture: +10%', 'watering protocol']
```

### Farm state change

Add `wateredAt` field to plot objects:
```js
{ crop: 'carrot', plantedAt: 1234567890, wateredAt: 1234568000 }
```

`wateredAt` is cleared when the crop is harvested or the plot is replanted.

---

## 2. Idle Interactions (Favorite Items)

### Concept

When the pet has nothing farm-related to do (no ready crops, no unwatered growing crops), it has a **15% chance per tick** to wander to a random page element and interact with it. Each pet type has different "favorite" targets and reactions.

### Interaction targets

| Target | Selector | All pets? | Notes |
|--------|----------|-----------|-------|
| Wallet widget | `#wallet-widget` | Yes | Pet checks coin balance |
| Theme selector | `#theme-select` | Yes | Pet inspects the theme switcher |
| Site title | `.site-title` | Yes | Pet visits the logo |
| Nav links | `.nav-links a` | Yes | Random nav link — pet "reads" it |
| Farm plot (empty) | `.farm-plot-empty` | Yes | Pet stares at empty dirt |
| Pet dock | `.pet-dock` | Yes | Pet visits its bed but doesn't dock |
| Footer | `.footer-inner` | Cat only | Cat explores the bottom of the page |
| Review content | `article, .review-content` | Robot only | Robot "scans" the page content |

### Interaction sequence

1. Pick a random valid target from the list (element must be visible in viewport)
2. `PetSystem.walkTo()` near the element
3. `setAnimState('idle')` — pet "looks at" it for 1.5s
4. Speak a reaction line
5. `PetSystem.returnToPosition()`

### Per-pet interaction speech

**Wallet widget:**
```
cat:    ['my coins!', '*counts fish*', 'need more treats', '*taps wallet*']
dragon: ['my hoard!', 'not enough gold', '*guards coins*', 'MINE']
robot:  ['balance: checked', 'funds: noted', 'calculating ROI', 'portfolio: stable']
```

**Theme selector:**
```
cat:    ['ooh colors', '*bats at switch*', 'dark mode plz', '*curious paw*']
dragon: ['matrix looks cool', '*smoke changes color*', 'pretty lights', 'fire theme when?']
robot:  ['UI PREFERENCE: noted', 'theme: optimal', 'display calibrated', 'contrast: good']
```

**Site title / logo:**
```
cat:    ['are books good?', 'yes.', '*rubs against logo*', 'I prefer fish books']
dragon: ['nice site name', '*perches on title*', 'books have gold?', 'good domain']
robot:  ['SITE: identified', 'brand: recognized', 'title: verified', 'name: approved']
```

**Nav links:**
```
cat:    ['where does this go?', '*curious sniff*', 'adventure!', '*paws at link*']
dragon: ['treasure map!', '*follows the link*', 'new territory', 'explore!']
robot:  ['LINK: scanning', 'href: analyzed', 'navigation: logged', 'route: mapped']
```

**Empty farm plot:**
```
cat:    ['*digs in dirt*', 'plant something!', '*buries toy*', 'empty...']
dragon: ['needs seeds', '*pokes dirt*', 'barren land', 'plant fire flowers!']
robot:  ['PLOT: vacant', 'soil: idle', 'suggestion: plant crop', 'utilization: 0%']
```

**Pet dock (visiting bed):**
```
cat:    ['*sniffs bed*', 'nap later', 'comfy spot', '*circles bed*']
dragon: ['my nest!', '*fluffs bedding*', 'guard post', 'home base']
robot:  ['DOCK: operational', 'recharge station', 'home coordinates', 'standby mode: later']
```

---

## 3. Implementation Plan

### Files to change

**`pet-farm-ai.js`** — main changes:
- Add watering logic to `aiTick()` (new priority between harvest and idle)
- Add `findWaterablePlot()` function
- Add `waterSequence(plot)` function
- Add `idleInteraction()` function with target selection + walk
- Add all new speech line objects
- Track watered state

**`farm.js`** — small additions to `FarmAPI`:
- `water(plotIndex)` — applies speed boost by adjusting `plantedAt`
- `getPlots()` — include `wateredAt` in returned data

**`farm.css`** — new styles:
- `.farm-plot-watering` — blue-tinted glow during watering
- `.farm-water-particle` — water droplet float-up animation

### AI tick priority order (updated)

```
1. Pet busy? → skip
2. Ready crop exists? → harvest sequence (existing)
3. Unwatered growing crop (25-90%)? → water sequence (NEW)
4. 15% chance → idle interaction with page element (NEW)
5. 10% chance → speak a random farm line (existing)
6. Reschedule tick
```

### No new files needed

Everything fits into the existing `pet-farm-ai.js` module with small additions to `farm.js`.

---

## 4. Edge Cases

- **Element not visible / off-screen**: Skip targets that aren't in the viewport (`getBoundingClientRect` check)
- **Mobile**: Same behavior, `walkTo` uses CSS transition so works on touch
- **No pet active**: `getState()` returns null, tick reschedules
- **User grabs pet mid-interaction**: Existing cancel callback handles it
- **Multiple waterings**: `wateredAt` prevents double-watering same growth cycle
- **Watering a crop that becomes ready during walk**: Check stage again before applying boost

---

## 5. Verification

1. Plant a crop, wait until ~30% grown, verify pet walks to it and waters it
2. Check that watered plot has blue glow during interaction
3. Verify watered crop grows ~10% faster (check progress bar)
4. Verify same crop doesn't get watered twice
5. With no crops planted, verify pet occasionally walks to wallet/nav/title
6. Verify each pet type has unique speech for each target
7. Drag pet mid-interaction — verify clean cancel
8. Test on mobile viewport
