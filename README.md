# Valheim Companion

**Live: https://valheim-companion.teuferon.click**

Tools for your Valheim journey:
- **Bestiary**: Every creature and boss, grouped by biome and spoiler-free: each biome stays collapsed until you open it. Stats, weaknesses and the best weapons for your progress.
- **Damage Calculator**: Pick a target and a weapon, set the upgrade level and see the damage that actually lands — resistances applied, with DPS, time-to-kill and a biome progression slider.
- **Sign Editor (Runopis)**: Rich-text editor for Valheim signs with colors, formatting, live preview and copy to game in 13 languages.

## Project Structure

- `apps/hub/`: Main landing / hub page (`/`)
- `apps/bestiary/`: Bestiary static application (`/bestiary/`)
- `apps/damage-calculator/`: Damage calculator SPA (`/damage-calculator/`)
- `apps/signs/`: Runopis sign editor SPA (`/signs/`)
- `data/`: Extracted wiki data (biomes, creatures, weapons, recommendations)
- `scripts/`: Data fetching, calculation, build and preview scripts
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

`deploy/nginx.conf` sets strict security headers and location routing for `/`, `/bestiary/`, `/damage-calculator/` and `/signs/`.

## Data

Data comes from the [Valheim Wiki](https://valheim.weirdgloop.org) (CC BY-SA 4.0).

```sh
npm run fetch:creatures   # biomes, creatures, images  -> data/*.json, apps/bestiary/img/
npm run data              # weapons, recommendations, apps/bestiary/data/data.js
```

Manual fixes go in `data/overrides.json`.

## Docs

- `docs/ANALYZA.md`: analysis, sources, recommendation algorithm
- `docs/DATA-SCHEMA.md`: data format
- `docs/zadani/`: task specs for the worker agents
