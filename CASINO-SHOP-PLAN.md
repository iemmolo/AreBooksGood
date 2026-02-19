# Casino Hub & Site-Wide Currency Plan

## Vision

Unify all games under a shared virtual currency. Players earn coins by playing
games, then spend them in a **Shop** on CSS cosmetic effects that apply across
the entire site while browsing. The casino section gets a landing page hub
(like the chess section) with tile links to each game.

---

## 1. Shared Currency ("Coins")

### Storage

```
localStorage key: 'arebooksgood-wallet'

{
  coins: 1000,          // current balance
  totalEarned: 0,       // lifetime earnings (never decreases)
  totalSpent: 0,        // lifetime shop spending
  lastUpdated: <iso>    // timestamp
}
```

### Starting Balance

- New visitors start with **1,000 coins**
- Migration: on first load, detect existing per-game stats
  (`poker-stats`, `blackjack-stats`, `casino-wars-stats`) and sum their
  bankrolls into the shared wallet. Zero out the individual bankrolls so
  games read/write from the shared wallet going forward.

### Earning Coins

Each game's net winnings/losses flow directly into the shared wallet:
- **Poker**: pot winnings minus blinds/bets
- **Blackjack**: payouts minus bets
- **Casino Wars**: payouts minus bets
- **Sudoku**: small completion bonus (e.g. 50/100/200/500 coins by difficulty)
- **Chess puzzles**: small bonus per solve (e.g. 25 coins)

### Going Broke

If coins hit 0:
- Games show a "You're broke!" state
- **Phase 1**: simple "Claim daily allowance" button gives 500 coins (once per
  24h, tracked via timestamp in wallet)
- **Phase 2 (future)**: unlock a "rescue game" - a simple minigame specifically
  designed to earn back coins (see Future Ideas below)

### Wallet UI (Global)

A small persistent widget in the site header/nav showing current coin balance:

```
[ 1,250 coins ]
```

- Visible on every page (added to `header.html` partial)
- Clicking it goes to `/casino/` hub or `/casino/shop/`
- Animate on coin gain/loss with a brief count-up/down effect
- Uses the site's existing CSS variable theming

---

## 2. Casino Hub Landing Page

**URL**: `/casino/`
**Layout**: `layouts/casino/section.html` (mirrors chess section pattern)

### Structure

```
/casino/
  _index.md          <- hub landing page
  shop/
    index.md         <- shop page
  poker/             <- (move from /poker/)
  blackjack/         <- (move from /blackjack/)
  casino-wars/       <- (move from /casino-wars/)
```

### Tile Grid

Same pattern as the chess section - 2x2 grid on desktop, single column mobile.
Each tile shows:
- A **mini visual preview** (e.g. mini card fan for poker, hand for blackjack,
  crossed swords for casino wars, shopping bag for shop)
- Terminal-style label: `> poker`, `> blackjack`, `> casino wars`, `> shop`
- Subtle stat line: "Won 3,200 coins" or "12 hands played"

### Sub-Navigation

Like the chess sub-nav, add a casino sub-nav when browsing `/casino/*`:

```
Poker | Blackjack | Casino Wars | Shop
```

### Main Menu Update

Replace individual game entries in `hugo.toml` menu with a single **Casino**
entry pointing to `/casino/`. Keep Chess and Sudoku as separate menu items
(Sudoku could optionally move under casino later).

```toml
[[menu.main]]
  name = "Casino"
  url = "/casino/"
  weight = 3
```

---

## 3. The Shop

**URL**: `/casino/shop/`
**Layout**: `layouts/casino/shop.html` (custom layout)

### Concept

Spend coins on CSS cosmetic effects that apply **site-wide** while browsing.
Effects persist in localStorage and are applied via a global JS module.

### Effect Categories

#### Text Effects
| Effect          | Cost  | Description                                     |
|-----------------|-------|-------------------------------------------------|
| Typewriter      | 500   | Text appears with typing animation on page load |
| Glitch Text     | 750   | Occasional glitch/flicker on headings           |
| Rainbow Headers | 1,000 | H1/H2 cycle through colors                     |
| Neon Glow       | 1,500 | Text has neon glow matching accent color        |

#### Background Effects
| Effect             | Cost  | Description                                  |
|--------------------|-------|----------------------------------------------|
| Scanlines          | 500   | CRT scanline overlay                         |
| Matrix Rain        | 1,000 | Falling green characters behind content      |
| Starfield          | 1,500 | Subtle animated stars in background          |
| Subtle Grid        | 300   | Faint grid pattern behind content            |

#### Cursor & Interaction
| Effect           | Cost | Description                                   |
|------------------|------|-----------------------------------------------|
| Custom Cursor    | 400  | Terminal-style block cursor                   |
| Click Sparkles   | 600  | Particle burst on mouse click                 |
| Hover Trail      | 800  | Faint trail following mouse movement          |
| Link Underline   | 300  | Animated underline style on link hover        |

#### Page Transitions
| Effect          | Cost  | Description                                    |
|-----------------|-------|------------------------------------------------|
| Fade In         | 200   | Pages fade in on load                          |
| Slide Up        | 400   | Content slides up on load                      |
| Terminal Boot   | 1,000 | Page loads with fake terminal boot sequence    |

#### Special / Rare
| Effect           | Cost   | Description                                  |
|------------------|--------|----------------------------------------------|
| CRT Mode         | 3,000  | Full CRT monitor effect (curvature + glow)   |
| Hacker Mode      | 5,000  | Green-on-black override + scan + glitch combo|
| Retro Pixelate   | 2,500  | Pixelated font + retro styling               |

### Shop UI

- Grid of cards, each showing:
  - Effect name + icon/emoji
  - Preview thumbnail or live mini-demo
  - Price in coins
  - "Buy" button (or "Owned" / "Active" badge)
- Filter by category tabs
- "My Effects" section at top showing owned effects with toggle on/off
- Active effects stack (multiple can be active simultaneously)

### Effect System (Technical)

```
localStorage key: 'arebooksgood-effects'

{
  owned: ['scanlines', 'neon-glow', 'fade-in'],
  active: ['scanlines', 'fade-in']
}
```

**Global loader** (`assets/js/effects.js`):
- Loaded on EVERY page (small footprint, lazy-loads heavy effects)
- On page load: reads active effects from localStorage
- Injects CSS classes on `<body>`: `effect-scanlines`, `effect-fade-in`, etc.
- Each effect is a self-contained CSS file or CSS block
- Heavy effects (matrix rain, starfield) load JS only when active

**Effect CSS** (`assets/css/effects/`):
- One CSS file per effect, or a single bundled `effects.css`
- All effects use existing CSS variables so they adapt to the active color theme
- Effects should be subtle enough to not impair readability

---

## 4. File Structure (New/Modified)

```
content/
  casino/
    _index.md                    <- hub page
    shop/
      index.md                   <- shop page (layout: casino-shop)
    poker/
      index.md                   <- moved from content/poker/
    blackjack/
      index.md                   <- moved from content/blackjack/
    casino-wars/
      index.md                   <- moved from content/casino-wars/

layouts/
  casino/
    section.html                 <- hub tile grid
    single.html                  <- default single for casino pages
    shop.html                    <- shop page layout (or use layout front matter)

themes/terminal-books/
  assets/
    js/
      wallet.js                  <- shared currency module (read/write/migrate)
      effects.js                 <- global effect loader
      shop.js                    <- shop UI logic (buy, toggle, preview)
      poker.js                   <- modified: use wallet.js
      blackjack.js               <- modified: use wallet.js
      casino-wars.js             <- modified: use wallet.js
    css/
      casino-hub.css             <- hub tile grid styles
      shop.css                   <- shop page styles
      effects/
        scanlines.css
        neon-glow.css
        matrix-rain.css
        ... (one per effect)

  layouts/_partials/
    header.html                  <- modified: add wallet widget
    head.html                    <- modified: load wallet.js + effects.js globally
```

---

## 5. Implementation Phases

### Phase 1: Foundation ✅ DONE
1. ~~Create `wallet.js` - shared currency read/write/migrate API~~
2. ~~Add wallet widget to header partial~~
3. ~~Create `/casino/` hub with tile grid layout~~
4. ~~Update `hugo.toml` menu~~
5. ~~Move game content under `/casino/` (set up aliases for old URLs)~~

### Phase 2: Game Integration ✅ DONE
1. ~~Refactor poker.js to use shared wallet~~
2. ~~Refactor blackjack.js to use shared wallet~~
3. ~~Refactor casino-wars.js to use shared wallet~~
4. ~~Add coin rewards to sudoku completions~~
5. ~~Add coin rewards to chess puzzle solves~~
6. ~~Add casino sub-navigation~~

Also shipped: Slot machine, Flappy Bird, Doodle Jump games

### Phase 3: Shop (MVP) — Not Started
1. Build shop page layout and UI
2. Implement effect purchase/ownership system
3. Build `effects.js` global loader
4. Create first batch of effects (start with ~5 simple CSS-only ones):
   - Scanlines, Fade In, Subtle Grid, Neon Glow, Link Underline
5. Wire up buy/toggle/preview in shop UI

### Phase 4: Shop (Full) — Not Started
1. Add remaining effects from the table above
2. Add JS-powered effects (matrix rain, starfield, click sparkles)
3. Add "My Effects" management panel
4. Add preview-before-buy functionality
5. Polish animations and transitions

### Phase 5: Going Broke & Future Games — Not Started
1. "Daily allowance" claim system for broke players
2. Rescue minigame (simple, guaranteed small payout)
3. Idle incrementer game (long-term)
4. Possibly: achievements system that grants bonus coins

---

## 6. Technical Considerations

### Performance
- `wallet.js` and `effects.js` must be tiny (<2KB each before effects)
- Heavy effects (matrix rain, particles) lazy-load their JS only when active
- CSS-only effects are preferred where possible
- Effects should not block page rendering

### Theme Compatibility
- All effects MUST use CSS variables (`--background`, `--foreground`, `--accent`)
- Effects adapt automatically when user switches color theme
- Test every effect against all 4 themes (pistachio, matrix, light, dark)

### URL Migration
- When moving games under `/casino/`, add Hugo aliases so old URLs redirect:
  ```yaml
  aliases: ["/poker/"]
  ```

### Wallet Security
- This is localStorage fun-money, not real currency - no need for server validation
- But prevent obvious exploits: validate coin values are numbers, clamp negatives
- Don't expose wallet manipulation in global scope (use module pattern or IIFE)

---

## 7. Future Ideas (Parked)

- **Rescue Game**: a simple reaction-time or memory game that guarantees a small
  payout, available only when broke. Gives players a path back without free money.
- **Idle Incrementer**: cookie-clicker style game where you earn coins passively.
  Could tie into the theme - "printing books" or "reviewing manuscripts" for coins.
- **Achievements**: milestone-based bonuses (e.g. "Win 10 poker hands" = 500 coins).
  Could also unlock exclusive shop effects not available for purchase.
- **Seasonal Effects**: limited-time shop items (holiday themes, special events).
- **Leaderboard**: if the site ever gets user accounts, track lifetime earnings.
- **Effect Trading**: if multiplayer is ever added, trade effects between users.
- **Prestige System**: reset all coins for a permanent multiplier + exclusive effects.
