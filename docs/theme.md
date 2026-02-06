# AreBooksGood — Theme & Design

## Base: terminal-css

[terminal-css](https://terminalcss.xyz/) provides:
- Clean monospace typography
- Sensible defaults for HTML elements
- Minimal footprint (~3KB)
- No JavaScript dependency

## Color Themes

Users select a theme from a dropdown in the nav bar. Each theme is a set of CSS custom properties defined in `themes/terminal-books/assets/css/themes.css`.

Selection is saved to `localStorage`. An inline script in `<head>` applies the theme before paint to prevent flash.

### Theme Definitions

#### Pistachio (default)
- Background: `#f4f1e6` (warm cream)
- Text: `#2d3319` (dark olive)
- Primary: `#6b8f3c` (pistachio green)
- Secondary: `#8a9a5b` (muted sage)
- Code bg: `#e8e5d4`

#### Matrix
- Background: `#0a0a0a` (black)
- Text: `#00ff41` (phosphor green)
- Primary: `#00cc33`
- Secondary: `#008f11`
- Code bg: `#0d1a0d`

#### Light
- Background: `#ffffff`
- Text: `#1a1a1a`
- Primary: `#0060df`
- Secondary: `#6b7280`
- Code bg: `#f3f4f6`

#### Dark
- Background: `#1a1a2e` (deep charcoal)
- Text: `#e5e7eb`
- Primary: `#60a5fa`
- Secondary: `#9ca3af`
- Code bg: `#232340`

## Layout

- Max content width: `720px`, centered
- Nav: flex row with site title (left), nav links + theme dropdown (right)
- Footer: minimal, copyright + RSS link
- Review cards: title, author, star rating, date, tags as inline labels, summary excerpt
- Single review: full width reading layout with metadata header

## Rating Display

- Unicode stars: `★★★★☆` (filled/empty)
- Generated via Hugo partial from `rating` front matter param (1-5)

## Responsive

- Single column on mobile
- Nav stacks vertically on small screens
- Theme dropdown remains accessible on all sizes
