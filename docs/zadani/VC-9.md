🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem nebo po adresářích z ROZSAHU (⛔ `git add -A`). ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně, ⛔ nic na pozadí. Kód a komentáře ANGLICKY.
Testy: `node --test 'scripts/**/*.test.mjs'`.

Úkol VC-9: metadata pro sdílení na sítích (Open Graph a Twitter), náhledové obrázky s logem, favicony a manifest na všech stránkách Valheim Companion.

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 11. Hlavičky `<head>` v `apps/hub/index.html`, `apps/bestiary/index.html`, `apps/armourer/index.html` a `apps/signs/index.html`.

ROZSAH (⛔ jiné soubory neupravuj):
- `site.config.json` (nový)
- `scripts/apply-meta.mjs`, `scripts/render-og.mjs` (nové)
- `apps/hub/og/**` (šablona a výsledné PNG), `apps/hub/icons/**`, `apps/hub/site.webmanifest`
- `<head>` v `apps/*/index.html` (jen mezi značkami meta)
- `scripts/build-site.mjs` (kopírování `og/`, `icons/` a manifestu, pokud to už nedělá)
- `apps/signs/public/` (jen pokud signs potřebuje vlastní kopii ikon)
- `README.md`

KROK 1: obrázky, commit
- `apps/hub/og/card.html`: šablona 1200×630, bez JS frameworků. Parametry přes `?section=hub|bestiary|signs|armourer` čte malý inline-free skript `card.js`.
  - Pozadí: obrázek biomu (`../../bestiary/img/biomes/<biom>.png`; hub = black-forest, bestiary = mistlands, armourer = mountain, signs = `../../signs/public/sign-scene.png` přes relativní cestu v repu) s tmavým přechodem zleva.
  - Vlevo nahoře logo: runový štít, vlastní inline SVG v jantarové `#d9a441`, stejný motiv jako `favicon.svg`.
  - Nadpis fontem Norse (`../fonts/Norse.otf`): „VALHEIM COMPANION“, u sekcí nadpis sekce a pod ním menší „Valheim Companion“.
  - Podtitul 1–2 řádky (texty jsou v KROKU 2) a dole drobně URL webu ze `site.config.json` (načte ho `card.js`; když je prázdný, nic nezobrazí).
- `scripts/render-og.mjs` vyrenderuje pro každou sekci `apps/hub/og/<section>.png` (1200×630) přes headless Chrome:
  - cesta `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, nebo env `CHROME_PATH`
  - argumenty `--headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --screenshot=<out> file://…card.html?section=…`
  - ⛔ npm balíčky
  - každý PNG ověř: existuje, > 20 kB, rozměr 1200×630 (z hlavičky PNG IHDR)
- Ikony `apps/hub/icons/`: `apple-touch-icon.png` (180×180) a `icon-192.png`, `icon-512.png`. Renderují se stejným skriptem ze šablony `apps/hub/og/icon.html` (logo na tmavém pozadí).
- `apps/hub/site.webmanifest`: name „Valheim Companion“, short_name „Valheim“, ikony, `theme_color` `#0f1216`, `background_color` `#0f1216`, `display: standalone`, `start_url: "/"`.
- Commit (PNG se commitují): `VC-9: OG card template, rendered images and icons [GM/flash]`

KROK 2: meta tagy, commit
- `site.config.json`: `{ "siteUrl": "https://valheim-companion.teuferon.click", "siteName": "Valheim Companion", "locale": "en_US" }` (bez lomítka na konci). Při prázdném `siteUrl` skript tagy vyžadující absolutní URL (`og:url`, `og:image`, `canonical`, `twitter:image`) vynechá a vypíše varování.
- `scripts/apply-meta.mjs` vloží do každého `index.html` blok mezi `<!-- meta:start -->` a `<!-- meta:end -->` (idempotentně, nahradí existující blok, jinak ho vloží za `<meta name="viewport">`):
  - `description`, `canonical`
  - `og:type=website`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width=1200`, `og:image:height=630`, `og:image:alt`
  - `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
  - `theme-color=#0f1216`
  - `<link rel="icon">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, `<link rel="manifest" href="/site.webmanifest">`
  - obrázky vždy z `/og/<section>.png` (absolutní s `siteUrl`)
- Texty:
  - **hub**:
    - title „Valheim Companion — tools for your Valheim journey“
    - desc „Spoiler-free bestiary with weaknesses and best weapons for your skills, armor shopping lists and a rich-text sign editor. Updated for Valheim 1.0 and the Deep North.“
  - **bestiary**:
    - title „Bestiary — Valheim Companion“
    - desc „Every Valheim creature and boss by biome, spoiler-free. Stats per star level, weaknesses, and the best weapons for your skills — with hits to kill.“
  - **armourer**:
    - title „Armourer — Valheim Companion“
    - desc „Every Valheim armor set by biome. Pick pieces and upgrade levels and get the full material list — and where to farm it.“
  - **signs**:
    - title „Sign Editor (Runopis) — Valheim Companion“
    - desc „Write Valheim signs with colors, sizes and rich-text tags, see a live in-game preview and copy them straight into the game. 13 languages.“
- Runopis (`apps/signs/index.html`) zpracovává Vite. Blok vlož do zdrojového `index.html`. Cesty `/og/…`, `/icons/…` a `/site.webmanifest` jsou absolutní ke kořeni webu, takže je Vite nesmí přepsat: ověř po `npm --prefix apps/signs run build` v `dist-static/index.html`. Pokud je Vite mění, dej je do `public/` a uprav cestu.
- `scripts/build-site.mjs` kopíruje `apps/hub/og/*.png` (bez šablon `*.html` a `*.js`), `icons/` a `site.webmanifest` do `dist/`.
- `Dockerfile`: hub se kopíruje celý, takže by to mělo fungovat samo. Šablony `og/*.html` a `og/*.js` v obrazu nevadí. Jinak uprav `.dockerignore`.
- `README.md`: sekce „Sharing metadata“ (jak změnit doménu: `site.config.json` → `node scripts/apply-meta.mjs` → commit; jak přegenerovat obrázky: `node scripts/render-og.mjs`).
- Commit: `VC-9: Open Graph / Twitter meta, icons and manifest on all pages [GM/flash]`

ZKOUŠKA:
- `node scripts/render-og.mjs 2>&1 | tail -6` (vypíše rozměry a velikosti)
- `node scripts/apply-meta.mjs` 2× za sebou: druhý běh nic nezmění
- `npm run build 2>&1 | tail -3`, pak `ls dist/og dist/icons` a `grep -c "og:title" dist/index.html dist/bestiary/index.html dist/armourer/index.html dist/signs/index.html`
- `git status --short` prázdné
Vizuální kontrolu PNG a validaci tagů udělá orchestrátor.

NAKONEC stručně: hashe · seznam PNG s rozměry · `git status --short`.
