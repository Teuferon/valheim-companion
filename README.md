# Valheim Companion

Every Valheim creature and boss, grouped by biome and spoiler-free: each biome stays collapsed until you open it.
Each creature shows images per star level, stats, weaknesses and resistances, and the best weapons and ammo you can have by that biome.

## Usage

Open `index.html` in a browser (double-click). No server or build step is needed.

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
