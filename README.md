# Valheim Companion

**Live: https://valheim-companion.teuferon.click**

Tools for your Valheim journey:
- **Bestiary**: Every creature and boss, grouped by biome and spoiler-free: each biome stays collapsed until you open it. Stats, weaknesses and the best weapons for your progress.
- **Smithy**: Armor, weapons and shields by biome. Pick pieces and upgrade levels — get the full shopping list, smelting plan and where to farm it.
- **Damage Calculator**: Pick a target and a weapon, set the upgrade level and see the damage that actually lands — resistances applied, with DPS, time-to-kill and a biome progression slider.
- **Progress Tracker**: Track visited biomes, defeated bosses and non-trophy boss drops. Locked biomes hide spoilers; share your checklist between devices with a URL. Available in 13 languages.
- **Sign Editor (Runopis)**: Rich-text editor for Valheim signs with colors, formatting, live preview and copy to game in 13 languages.

## Project Structure

- `apps/hub/`: Main landing / hub page (`/`) and Privacy policy (`/privacy/`)
- `apps/bestiary/`: Bestiary static application (`/bestiary/`)
- `apps/smithy/`: Smithy static application (`/smithy/`)
- `apps/damage-calculator/`: Damage calculator SPA (`/damage-calculator/`)
- `apps/progress/`: Progress Tracker static application (`/progress/`)
- `shared/progress/`: Classic-script progress API (`VCProgress`), versioned state in `vc.progress`
- `apps/signs/`: Runopis sign editor SPA (`/signs/`)
- `shared/analytics/`: Google Analytics 4 Consent Mode v2 banner and manager
- `shared/i18n/`: 13-language internationalization core and language catalogs
- `data/`: Extracted wiki data (biomes, creatures, weapons, recommendations)
- `scripts/`: Data fetching, calculation, build, test, and preview scripts
- `deploy/`: nginx configuration and security headers

## Building & Preview

Build the entire site into `dist/`:

```sh
npm run build
```

Preview locally with nginx-like routing and CSP:

```sh
npm run preview     # http://localhost:8080
```

Run tests:

```sh
npm test
```

## Docker / EasyPanel

Multi-stage build compiles `apps/signs` and `apps/damage-calculator`, then `nginx:stable-alpine` serves the hub and all sections.

EasyPanel (App service):

1. **Source**: this GitHub repository, branch `main`.
2. **Build**: Dockerfile, path `Dockerfile`, build path `/`.
3. **Domains**: target port **80**, protocol HTTP, enable HTTPS.
4. **Deploy**. No environment variables, volumes or database. Health check: `/healthz`.

Locally:

```sh
docker compose up --build -d   # http://localhost:8080
```

`deploy/nginx.conf` sets strict security headers and location routing for `/`, `/bestiary/`, `/damage-calculator/`, `/smithy/`, `/progress/` and `/signs/`.

## Data

Data comes from the [Valheim Wiki](https://valheim.weirdgloop.org) (CC BY-SA 4.0).

```sh
npm run fetch:creatures   # biomes, creatures, images  -> data/*.json, apps/bestiary/img/
npm run data              # weapons, recommendations, apps/bestiary/data/data.js
```

Progress data is generated during the site build, or separately with `node scripts/build-progress-data.mjs`. It reads `data/biomes.json` and `data/creatures.json`; the complete non-trophy boss-drop checklist is documented in `data/report-progress.md`. Images reuse Bestiary and Smithy assets.

Manual fixes go in `data/overrides.json`.

## Progress state

Load `/shared/progress/core.js` as a classic script. `VCProgress` exposes `get()`, `set(patch)`, `defeat(id, bool)`, `visit(biomeId, bool)`, `milestone(id, bool)`, `revealedBiomes(biomes)`, `onChange(cb)`, `exportToUrl()`, `importFromUrl(hash)` and `reset()`. Changes are saved locally and notified across tabs.

Meadows starts revealed. The last defeated main boss reveals all earlier biomes and every following biome through the next biome with a boss. Visits and `vc.openBiomes` add independent reveals. Minibosses do not unlock progression. Reset clears both the checklist and manual reveals. URL import requires confirmation on the page. Other tools will consume this shared state in VC-20.

## Sharing Metadata

Open Graph preview cards, Twitter cards, PWA icons and web manifests are configured across all sections.

- **Change domain or site URL**:
  1. Update `siteUrl` in `site.config.json` (without a trailing slash).
  2. Run `node scripts/apply-meta.mjs` to update all `index.html` meta tags.
  3. Commit the changes.
- **Regenerate preview cards and icons**:
  Run `node scripts/render-og.mjs` (renders 1200×630 cards and icons with headless Chrome).

## Analytics & Privacy

- **Google Analytics 4** (`G-CXQVNCCJKE`) operates with **Consent Mode v2**:
  - Default state: all storage is denied (`analytics_storage: denied`, `ad_storage: denied`, etc.). Only cookieless anonymous pings are sent.
  - Analytics cookies are enabled only when the user explicitly grants consent in the banner.
  - Scripts load only on the production domain (`siteUrl` in `site.config.json`). Never on localhost or preview.
- **Privacy Policy**: Dedicated page at `/privacy/` with interactive cookie and analytics controls.
- **Languages**: Consent banner, footer links and `/privacy/` support all 13 languages.

## Docs

- `docs/STAV.md`: current status, task queue, what is running (start here)
- `docs/ORCHESTRACE.md`: how worker agents are launched, reviewed and merged
- `docs/ANALYZA.md`: analysis and decisions (data sources, formulas, biome order, i18n)
- `docs/DATA-SCHEMA.md`: data format
- `docs/NAVRHY-NASTROJU.md`: proposals for further tools
- `docs/zadani/`: task specs for the worker agents (VC-1 …)
