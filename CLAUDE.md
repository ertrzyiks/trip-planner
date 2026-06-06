# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:4321)
npm run build    # production build to dist/
npm run preview  # preview production build locally
```

No lint or test scripts are configured.

## Architecture

This is an Astro 6 static site (deployed to GitHub Pages at `https://ertrzyiks.github.io/trip-planner`) for planning a WW2 Normandy trip. It uses MapLibre GL for interactive maps.

### Place data — two parallel sources

Every place lives in **both** of:

1. **`src/data/places.json`** — coordinates, tags, and optional `markerKind`. This drives map markers and tag-based page filtering.
2. **`src/content/places/*.md`** — Astro content collection with frontmatter (`name`, `description`, `captureDate`) plus long-form historical content. Follow the schema defined in `src/content/AGENTS.md`.

`src/utils/place-descriptions.ts` bridges them at build time: it globs the markdown files eagerly, parses frontmatter and the first non-heading paragraph, and returns a `Map<normalizedKey, description>` used by every page to enrich the JSON data before it reaches the browser.

### Page pattern

Each page (`src/pages/*.astro`) follows the same structure:

1. Filter `places.json` by tags or `markerKind`.
2. Load the full content collection and render it server-side into a hidden `#place-content-cache` div.
3. Inject filtered places into `window.__TRIP_PLACES__` via `define:vars`.
4. An inline `<script is:inline>` reads the cache div and builds `window.__TRIP_PLACE_CONTENT__` (a `normalizedKey → innerHTML` map).
5. Import `../scripts/normandy-map.ts` which reads both globals to initialize the MapLibre map.

### `normandy-map.ts`

Shared map initialization. Reads `window.__TRIP_PLACES__` for markers and `window.__TRIP_PLACE_CONTENT__` for the side-panel detail view. Places with `markerKind === 'lighthouse'` get SVG custom markers instead of circle layers. All other places use a MapLibre GeoJSON source + circle layer with feature-state for selection highlight.

### Key details

- `normalizePlaceKey` (NFKD-normalize → strip non-alphanumeric → collapse spaces) appears in three places: `place-descriptions.ts`, `normandy-map.ts`, and inline in each page. Keep them in sync when changing the algorithm.
- Adding a new page requires updating the `activePage` union type in `src/layouts/MainLayout.astro` and adding a nav link.
- The `overlord.astro` page filters by the `"Operation Overlord"` tag and sorts by a hardcoded `phaseOrder` array of campaign phase names.
- The site uses `base: '/trip-planner'` in `astro.config.mjs`; always use `import.meta.env.BASE_URL` (or the pattern in `MainLayout.astro`) when constructing internal links.
- Deployment happens automatically via `.github/workflows/deploy.yml` on every push to `main`.
