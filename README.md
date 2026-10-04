# Valheim Companion

Every Valheim creature and boss, grouped by biome and spoiler-free: each biome stays collapsed until you open it.
Each creature shows images per star level, stats, weaknesses and resistances, and the best weapons and ammo you can have by that biome.

## Usage

Open `index.html` in a browser (double-click). No server or build step is needed.

## Docker / EasyPanel

The image is plain `nginx:stable-alpine` serving the static files. There is no build stage.

EasyPanel (App service):

1. **Source**: this GitHub repository, branch `main`.
2. **Build**: Dockerfile, path `Dockerfile`, build path `/`.
3. **Domains**: target port **80**, protocol HTTP, enable HTTPS.
4. **Deploy**. No environment variables, volumes or database. Health check: `/healthz`.

Locally:

```sh
docker compose up --build -d   # http://localhost:8080
```

Only `index.html`, `assets/`, `data/data.js` and `img/` go into the image (`.dockerignore` is a whitelist).
nginx config is in `deploy/`. It sets a strict CSP (`script-src 'self'`), so the page must not use inline scripts or `on*=` attributes.

## Data

Data comes from the [Valheim Wiki](https://valheim.weirdgloop.org) (CC BY-SA 4.0).

```sh
npm run fetch:creatures   # biomes, creatures, images  -> data/*.json, img/
npm run data              # weapons, recommendations, data/data.js
npm test
```

Manual fixes go in `data/overrides.json`.

## Docs

- `docs/ANALYZA.md`: analysis, sources, recommendation algorithm
- `docs/DATA-SCHEMA.md`: data format
- `docs/zadani/`: task specs for the worker agents (VC-1 data, VC-2 recommendations, VC-3 frontend)
