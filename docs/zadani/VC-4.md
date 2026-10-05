🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound ani /Users/paveldvorak/gameroot/valheim-signs taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-4: z Valheim Companion udělat rozcestník. Pod ním budou dvě sekce: Bestiary (stávající web s jednotkami) a Sign Editor (Runopis, už převzatý v `apps/signs/`).
Commituj jen do své větve {{VETEV}}, po krocích, soubory přidávej výčtem nebo po adresářích z ROZSAHU (⛔ `git add -A`).
Přesuny dělej `git mv`, ať zůstane historie. ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně, ⛔ nic na pozadí (dev servery ne).
Kód a komentáře ANGLICKY.

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 6 a § 8. Ostatní čti jen podle potřeby a po úsecích (`grep -n`, `sed -n`).

ROZSAH: celé repo kromě `data/raw/`, `data/*.json`, `data/overrides.json` a `docs/`. Hodnoty v JSONech, logiku výpočtu doporučení a vzhled Bestiary ⛔ neměň. Jde jen o přesun a rozcestník.

KROK 1: Bestiary do `apps/bestiary/`, commit
- `git mv index.html assets img apps/bestiary/` a `git mv data/data.js apps/bestiary/data/data.js`. Cesty v JSONech (`img/creatures/...`) zůstanou relativní k `apps/bestiary/`, takže se nemění.
- Skripty v `scripts/` budou zapisovat obrázky do `apps/bestiary/img/...` (hodnota v JSONu se nemění) a `build-data.mjs` do `apps/bestiary/data/data.js`. Uprav i testy, které cesty používají.
- `apps/bestiary/index.html`:
  - `<title>Bestiary — Valheim Companion</title>`
  - nad nadpisem tenká lišta s odkazem `<a href="../">← Valheim Companion</a>` (CSS v `assets/styles.css`, nenápadné, jantarová barva)
  - nadpis stránky „Bestiary“
- ZKOUŠKA:
  - `node --test 'scripts/**/*.test.mjs'`
  - `node scripts/wiki/fetch-creatures.mjs 2>&1 | tail -3` a `npm run data 2>&1 | tail -3` jedou jen z cache a druhý běh nemění žádný soubor (`git status --short` je prázdné)
- Commit: `VC-4: move Bestiary to apps/bestiary [GM/flash]`

KROK 2: Runopis na `/signs/`, commit (pracuješ v `apps/signs/`)
- `npm ci` (síť je povolená, jen pro npm).
- `vite.static.config.ts`: `base: '/signs/'`. V kódu a CSS nahraď absolutní cesty k souborům z `public/` tak, aby fungovaly pod `/signs/`:
  - `src="/sign-scene.png"` v `app/page.tsx` → `` `${import.meta.env.BASE_URL}sign-scene.png` ``
  - `url('/fonts/norse/...')` v `app/globals.css` → relativní cesta, kterou Vite přepíše (ověř v buildu)
  - Další výskyty najdi přes `grep -rn "\"/\|'/\|url(/" app components lib hooks client.tsx index.html` (bez node_modules).
- Zruš variantu pro Cloudflare / vinext / OpenAI Sites:
  - smaž `vite.config.ts`, `next.config.ts`, `next-env.d.ts`, `.openai/`, `app/layout.tsx` (ověř, že ho nic neimportuje), `Dockerfile`, `compose.yaml`, `nginx.conf`, `.dockerignore`
  - z `package.json` odeber `vinext`, `react-server-dom-webpack`, `@cloudflare/*`, `@openai/sites-vite-plugin`, `@vitejs/plugin-rsc` a `wrangler`
  - skripty: `dev` = `vite --config vite.static.config.ts`, `build` = `vite build --config vite.static.config.ts`, `preview` = `vite preview --config vite.static.config.ts`; `build:docker`, `dev:docker` a `start` odeber
  - `npm install` aktualizuje `package-lock.json`
- `tsconfig.json` uprav, jen pokud po smazání souborů něco odkazuje na Next nebo vinext.
- Do hlavičky Runopisu (`app/page.tsx`) přidej nenápadný odkaz `<a href="/">← Valheim Companion</a>` ve stylu stávající hlavičky (Tailwind třídy, ⛔ nové závislosti). Text se nepřekládá, je to jméno.
- `apps/signs/README.md`: odstraň část o EasyPanelu a Cloudflare a napiš, že Runopis je sekce Valheim Companion na `/signs/` a že se staví z kořene repa.
- ZKOUŠKA (vše v `apps/signs/`):
  - `npm test 2>&1 | tail -5`
  - `npm run typecheck 2>&1 | tail -5`
  - `npm run lint 2>&1 | tail -5`
  - `npm run build 2>&1 | tail -8`
  - `grep -c "/signs/" dist-static/index.html` ≥ 1
- `dist-static/` a `node_modules/` nesmí do gitu (zkontroluj `.gitignore` v `apps/signs/`).
- Commit: `VC-4: Runopis builds under /signs/, drop Cloudflare/vinext variant [GM/flash]`

KROK 3: rozcestník `apps/hub/`, commit
- `apps/hub/index.html`, `apps/hub/styles.css`, `apps/hub/favicon.svg` (zkopíruj z `apps/bestiary/assets/favicon.svg`) a `apps/hub/fonts/` (zkopíruj `apps/signs/public/fonts/norse/Norse.otf` a `Norsebold.otf`).
- Bez JS. `<title>Valheim Companion</title>`, popis v `<meta name="description">`, `lang="en"`.
- Obsah:
  - nadpis „Valheim Companion“ fontem Norse
  - podtitul „Tools for your Valheim journey.“
  - mřížka karet:
    1. **Bestiary** → `bestiary/`. Text: „Every creature and boss, biome by biome — spoiler-free. Stats, weaknesses and the best weapons for your progress.“ Obrázek `bestiary/img/biomes/black-forest.png` jako pozadí karty s tmavým přechodem.
    2. **Sign Editor** (podtitul „Runopis“) → `signs/`. Text: „Write rich-text signs with colors and live preview, then copy them straight into the game. 13 languages.“ Obrázek `signs/sign-scene.png`.
    3. Tlumená karta bez odkazu: „More tools coming soon…“
  - patička: „Fan project, not affiliated with Iron Gate. Data: Valheim Wiki (CC BY-SA 4.0).“ a odkaz na GitHub repo `https://github.com/pawlig/valheim-companion`
- Vzhled stejný jako Bestiary:
  - tokeny: pozadí `#0f1216`, karty `#181d23`, akcent `#d9a441`, text `#e8e4da`
  - celé karty jsou klikací, hover a focus stav, `prefers-reduced-motion`
  - mobil 360 px bez horizontálního scrollu
- Commit: `VC-4: hub page [GM/flash]`

KROK 4: build, náhled a Docker, commit
- `scripts/build-site.mjs` složí do `dist/` (smaže ho na začátku):
  - `apps/hub/*` → `dist/`
  - `apps/bestiary/{index.html,assets,data/data.js,img}` → `dist/bestiary/`
  - `apps/signs/dist-static/*` → `dist/signs/`
  Když `apps/signs/dist-static` neexistuje, skončí chybou s návodem (`npm --prefix apps/signs run build`).
- `scripts/preview.mjs`: Node HTTP server bez závislostí, port z argumentu (výchozí 8080), servíruje `dist/` stejně jako nginx:
  - `/signs/*`, které neexistuje → `/signs/index.html`
  - ostatní neexistující → 404
  - na každé odpovědi hlavička `Content-Security-Policy` se stejnou hodnotou jako v `deploy/security-headers.conf` (načti ji z toho souboru)
- Kořenový `package.json`, skripty:
  - `"build": "npm --prefix apps/signs run build && node scripts/build-site.mjs"`
  - `"preview": "node scripts/preview.mjs"`
  - `"test"` spustí testy scripts/ i `npm --prefix apps/signs test`
- `.gitignore`: `dist/`.
- `Dockerfile` (multi-stage):
  ```
  FROM node:24-alpine AS signs
  WORKDIR /app
  COPY apps/signs/package.json apps/signs/package-lock.json ./
  RUN npm ci
  COPY apps/signs/ ./
  RUN npm run build

  FROM nginx:stable-alpine
  COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
  COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
  COPY apps/hub/ /usr/share/nginx/html/
  COPY apps/bestiary/index.html /usr/share/nginx/html/bestiary/
  COPY apps/bestiary/assets/ /usr/share/nginx/html/bestiary/assets/
  COPY apps/bestiary/data/data.js /usr/share/nginx/html/bestiary/data/data.js
  COPY apps/bestiary/img/ /usr/share/nginx/html/bestiary/img/
  COPY --from=signs /app/dist-static/ /usr/share/nginx/html/signs/
  (EXPOSE, HEALTHCHECK a CMD jako teď)
  ```
- `.dockerignore`: whitelist `Dockerfile`, `deploy/`, `apps/hub/`, `apps/bestiary/index.html`, `apps/bestiary/assets/`, `apps/bestiary/data/data.js`, `apps/bestiary/img/`, `apps/signs/`. Uvnitř `apps/signs` vyřaď `node_modules` a `dist-static`.
- `deploy/nginx.conf`, upravené `location` (pořadí a `^~` tak, aby vyhrálo správné pravidlo):
  - `location ^~ /signs/assets/`: `Cache-Control "public, max-age=31536000, immutable"`
  - `location /signs/`: `try_files $uri $uri/ /signs/index.html` a `no-cache` pro HTML
  - `location /bestiary/img/`: cache 7 dní
  - regex pro `html|js|css` s `no-cache` zůstává
  - `= /healthz` zůstává
  - V KAŽDÉ location `include` security-headers (jako teď)
  - `/bestiary` bez lomítka → 301 na `/bestiary/`, totéž pro `/signs`
- `README.md` (kořen): struktura repa (`apps/hub`, `apps/bestiary`, `apps/signs`), `npm run build` a `npm run preview`, sekce Docker / EasyPanel zůstává.
- ZKOUŠKA:
  - `npm run build 2>&1 | tail -5`
  - `ls dist dist/bestiary dist/signs`
  - `node scripts/preview.mjs 8090` pusť v JEDNOM příkazu s ověřením a ukončením: `node -e "…spawn preview, fetch '/', '/bestiary/', '/signs/', '/signs/neexistuje', '/bestiary/neexistuje', vypiš status kódy, kill"` → 200, 200, 200, 200, 404
- Commit: `VC-4: site build, preview server, Docker for hub + sections [GM/flash]`

HOTOVO, KDYŽ: všechny ZKOUŠKY prošly a `git status --short` je prázdné. Vizuální test udělá orchestrátor.
KDYŽ COKOLIV NESEDÍ: ⛔ nevymýšlej náhradu mimo rozsah. Napiš, co jsi našel, commitni hotové kroky a skonči.
NAKONEC stručně: hashe · výsledky ZKOUŠEK (status kódy, výstup testů) · co se z `apps/signs` smazalo · `git status --short`.
