# AreBooksGood — Architecture

## Project Structure

```
AreBooksGood/
├── docs/                    # Project documentation
│   ├── requirements.md
│   ├── architecture.md
│   └── theme.md
├── content/
│   ├── reviews/             # Book reviews (markdown)
│   │   └── the-road.md
│   ├── about/
│   │   └── index.md
│   └── _index.md            # Home page content
├── themes/
│   └── terminal-books/      # Custom theme
│       ├── assets/
│       │   ├── css/
│       │   │   ├── terminal.css    # terminal-css base
│       │   │   ├── themes.css      # theme color overrides
│       │   │   └── custom.css      # site-specific styles
│       │   └── js/
│       │       └── theme-switcher.js
│       ├── layouts/
│       │   ├── _default/
│       │   │   ├── baseof.html     # Base template
│       │   │   ├── list.html       # List pages (index, taxonomy)
│       │   │   └── single.html     # Single review page
│       │   ├── partials/
│       │   │   ├── head.html       # <head> with OG tags
│       │   │   ├── nav.html        # Navigation + theme dropdown
│       │   │   ├── footer.html
│       │   │   ├── review-card.html  # Review summary card
│       │   │   └── rating.html     # Star/number rating display
│       │   ├── reviews/
│       │   │   ├── list.html       # Reviews listing
│       │   │   └── single.html     # Single review
│       │   ├── taxonomy/
│       │   │   └── list.html       # Category/tag listing
│       │   └── index.html          # Home page
│       └── theme.toml
├── static/
│   ├── images/
│   │   └── covers/          # Book cover images
│   └── favicon.ico
├── hugo.toml                # Hugo config
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions deploy
└── progress.txt             # Build progress for continuity
```

## Hugo Configuration

- `hugo.toml` defines:
  - Site metadata (title, baseURL, description)
  - Taxonomies: `categories`, `tags`
  - Menu items
  - Params for OG defaults, site description, etc.

## Theme Architecture

### CSS Layers

1. **terminal.css** — base reset + monospace typography
2. **themes.css** — CSS custom properties for each color theme
3. **custom.css** — site-specific layout, review cards, rating display

### Theme Switcher

- Inline `<script>` in `<head>` reads `localStorage` and applies theme class to `<html>` before paint (prevents flash)
- Dropdown in nav triggers JS that swaps the class and saves to `localStorage`
- Themes defined as `[data-theme="dark"]`, `[data-theme="solarized"]`, etc. in `themes.css`

### Taxonomy Pages

Hugo auto-generates:
- `/categories/` — list of all categories
- `/categories/fiction/` — all reviews in "fiction"
- `/tags/` — list of all tags
- `/tags/dystopian/` — all reviews tagged "dystopian"

Custom `taxonomy/list.html` template renders these with review counts and links.

## Deployment Pipeline

```
push to main → GitHub Actions → hugo build → deploy to gh-pages branch → GitHub Pages serves site
```

The workflow:
1. Checkout repo
2. Setup Hugo (extended edition for asset pipeline)
3. `hugo --minify`
4. Deploy `public/` to `gh-pages` branch
5. GitHub Pages serves from `gh-pages`
