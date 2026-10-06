# Damage Calculator

Pick a target — a Forsaken, a miniboss or any regular creature — pick a weapon,
set the upgrade level, and see the damage that **actually lands**, with the
target's resistances applied per damage type.

The Damage Calculator is a section of **Valheim Companion** hosted under
`/damage-calculator/`. It was ported from a standalone Next.js repository and
now builds with Vite as a static SPA, like the Sign Editor.

## Building

The whole site is built from the repository root:

```sh
npm run build
```

Or built directly within `apps/damage-calculator`:

```sh
npm ci
npm run build
```

The output is written to `dist-static/`.

For local development inside `apps/damage-calculator`:

```sh
npm run dev        # Vite dev server
npm test           # Engine checks against hand-computed wiki values
npm run typecheck  # TypeScript check
npm run scrape     # Re-pull data and images from the Valheim wiki (needs network)
```

## Data

Everything is scraped once and committed as JSON in `src/data/`, so the app
needs no network at runtime. Weapon and ammo damage per quality, boss and
creature health and resistances, and the skill/backstab rules come from the
[Valheim Wiki](https://valheim.weirdgloop.org); attack timings additionally use
MaxDPS's game-derived model. Biome availability is derived from each recipe's
crafting station and materials. Item art is downloaded into `public/items/` at
scrape time.

`npm test` (the same run as `npm run verify:engine`) asserts the damage engine
against hand-computed wiki values.

## Credits

Fan-made tool. Valheim, its item art and its stats belong to Iron Gate Studio
and the Valheim wiki community. Numbers are only as current as the last scrape.
