# AreBooksGood — Requirements

## Overview

A minimal, refined book review site. Reviews are written as markdown files, auto-deployed on commit, and shared on Instagram.

---

## 1. Content Model

- Reviews are markdown files in `content/reviews/`
- Each review has YAML front matter:
  - `title` (book title)
  - `author` (book author)
  - `rating` (1–5)
  - `categories` (list, e.g. fiction, non-fiction, philosophy)
  - `tags` (list, e.g. dystopian, memoir, sci-fi)
  - `date`
  - `summary` (short blurb for listing pages and Open Graph)
  - `cover` (optional book cover image path)
- Body is the review text in markdown

## 2. Static Site Generator

- **Hugo** as the SSG
- Custom theme built on **terminal-css**
- Taxonomies: `categories` and `tags` with auto-generated listing/index pages

## 3. Design & Theming

- Base styling: [terminal-css](https://terminalcss.xyz/)
- Monospace, minimal, refined aesthetic
- **User-selectable themes** via a dropdown in the site header/nav
  - Themes are CSS custom property oversets (colors, backgrounds)
  - At minimum: light, dark, solarized, dracula
  - Selection saved to `localStorage` so it persists across visits
  - No flash of wrong theme on load (apply before paint via inline script)
- Responsive — works well on mobile
- Clean typography for long-form reading

## 4. Pages & Navigation

- **Home** — latest reviews, short intro
- **Reviews index** — all reviews, sortable/filterable
- **Single review** — the full review page
- **Categories index** — list of all categories with counts
- **Category page** — reviews in a specific category
- **Tags index** — list of all tags with counts
- **Tag page** — reviews with a specific tag
- **About** — simple about page
- Nav bar with: Home, Reviews, Categories, Tags, About
- Theme selector dropdown in nav

## 5. Hosting & Deployment

- **GitHub Pages** (free)
- **GitHub Actions** workflow: on push to `main`, build Hugo and deploy to Pages
- Custom domain (purchased separately, pointed at GitHub Pages)
- HTTPS via GitHub Pages (automatic with custom domain)

## 6. SEO & Social / Instagram Integration

- Open Graph meta tags on every review (title, description, image)
- Twitter Card meta tags
- Structured data / JSON-LD for book reviews (schema.org/Review)
- Clean OG images so Instagram link previews look good
- Sitemap and RSS feed (Hugo built-in)

## 7. Workflow

1. Create/edit a `.md` file in `content/reviews/` (via GitHub web UI or local editor)
2. Commit & push to `main`
3. GitHub Actions builds and deploys automatically
4. Share the review URL on Instagram (link in bio / story link)

## 8. Non-Goals (keeping it simple)

- No CMS / admin panel — just markdown files
- No comments system (for now)
- No search (for now — could add later with lunr.js or pagefind)
- No JavaScript framework — vanilla JS only for theme switcher
