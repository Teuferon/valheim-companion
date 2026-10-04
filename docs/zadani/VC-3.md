🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-3: web Valheim Companion nad hotovými daty (VC-1 a VC-2 jsou v main).
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`).
⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně.
⛔ Neměň nic v `data/`, `scripts/` ani `img/`. Data jsou hotová, jen je čteš.

PŘEČTI NEJDŘÍV (jen tohle):
- `docs/ANALYZA.md` § 6 (požadavky na web)
- `docs/DATA-SCHEMA.md` (struktura `window.VC_DATA`)
- ⛔ `data/data.js` necatuj (je velký). Strukturu ověř přes:
  `node -e "global.window={};require('./data/data.js');const d=window.VC_DATA;console.log(Object.keys(d), d.biomes.length, Object.keys(d.creatures).length)"`.
  Konkrétní záznam (např. `d.creatures.greydwarf`, `d.recommendations['black-forest:greydwarf']`) vypiš stejně.

ROZSAH (⛔ jiné soubory neupravuj):
- `index.html`
- `assets/app.js`
- `assets/styles.css`
- `assets/favicon.svg` (jednoduchá runa nebo štít, vlastní SVG)

TECHNIKA (závazné):
- Web se otevírá dvojklikem na `index.html` (`file://`). Proto:
  - ⛔ `fetch()`, ⛔ `type="module"`, ⛔ import
  - data jsou v `<script src="data/data.js"></script>`, kód v `<script src="assets/app.js" defer></script>`
- ⛔ frameworky, ⛔ CDN, ⛔ externí fonty. Čistý HTML + CSS + vanilla JS (ES2022, jeden soubor, IIFE nebo `'use strict'` na začátku).
- Bezpečnost: texty z dat vkládej přes `textContent` / `createElement`, ⛔ `innerHTML` s daty.
- `localStorage` jen v try/catch. Web musí fungovat i bez něj.
- Obrázky `loading="lazy"`, `alt` = jméno. Při chybějícím obrázku (`null`) ukaž placeholder s iniciálou.

CO MÁ WEB UMĚT:
1. Hlavička: „Valheim Companion“, podtitul „Creatures, bosses, weaknesses & the best weapons — biome by biome, spoiler-free.“ Tlačítka:
   - **Collapse all**
   - **Reset spoiler progress**: vymaže zapamatované otevřené biomy a vše zavře
   - hledací pole: hledá jen v otevřených biomech, podle jména jednotky
   - filtr podle `kind` (All / Bosses / Hostile / Passive / Fish)
2. Biomy jako akordeon v pořadí `order`, výchozí stav ZAVŘENO.
   - Hlavička biomu: obrázek biomu jako pruh s tmavým přechodem, název, pořadí („Biome 3“) a počet jednotek („14 creatures“). ⛔ žádná jména jednotek ani bossů.
   - Otevřené biomy si web pamatuje v `localStorage` pod klíčem `vc.openBiomes`.
   - Otevírá se kliknutím i klávesnicí: `<button aria-expanded>` + `aria-controls`.
3. Obsah otevřeného biomu, v tomto pořadí:
   - sekce **Bosses** (+ minibossové se štítkem „Miniboss“)
   - **Hostile**
   - **Passive**
   - **Fish**: kompaktní dlaždice (obrázek, jméno, HP); karta se rozbalí po kliknutí
   - sbalitelná sekce **Weapons & ammo from this biome**: tabulka zbraní, jejichž `biome` je tento biom, seskupená podle `category`. Sloupce: ikona, jméno, damageMax (barevné čipy podle typu), stamina, materiály.
   Prázdné sekce se nezobrazují.
4. Karta jednotky (grid, na desktopu 2–3 sloupce, na mobilu 1):
   - Obrázek (poměr 1:1, `object-fit: contain`, tmavé pozadí).
   - Je-li `hasStars`, segmentový přepínač ☆ / ★ / ★★ (0/1/2). Přepíná obrázek, HP a útoky jen v té kartě.
   - Jméno a štítky: Boss, Miniboss, Passive, Tameable, Weak points.
   - HP (velké číslo; u fází `healthText` jako podtext).
   - **Attacks**: seznam `name` + čipy poškození podle typu. Při prázdném `damage` ukaž `raw`.
   - **Weaknesses & resistances**: čipy pro každý typ z `recommendations[...].modifiers` s hodnotou ≠ 1. Barva podle stupně: ×2 sytě zelená, ×1.5 zelená, ×1.25 světle zelená, ×0.75 světle oranžová, ×0.5 oranžová, ×0.25 červená, ×0 šedá přeškrtnutá. Text čipu: `Fire ×2`.
     Pod nimi drobně `otherImmunities` („Also immune: Stagger“).
   - **Best weapons** (u `passive` a `fish` jen ranged):
     - Melee: až 3 řádky (ikona, jméno, `score` velkým písmem, `notes` jako čipy)
     - Bow + arrows
     - Crossbow + bolts
     - Magic
     - Bomb
     - Avoid: čipy typů
     - `tip` jako zvýrazněný řádek nahoře v sekci
     Klik na zbraň otevře malý popover nebo `<details>` s `damageMax`, kategorií, tierem a biomem zbraně.
   - **Details** (`<details>`): abilities, drops, trophy (s obrázkem), summon, faction, behavior, stagger, spawns, description, game IDs, odkaz „Open on Valheim Wiki“.
   - **Also found in**: jen biomy s nižším `order` než aktuální biom.
5. Legenda (sbalitelná, pod hlavičkou): barvy typů poškození, význam násobičů, poznámka „Scores = per-hit damage at max upgrade quality vs. this creature; fire/poison DoT counted at face value.“
6. Patička: „Data: Valheim Wiki (valheim.weirdgloop.org), CC BY-SA 4.0 · generated <generatedAt>“ + „Fan project, not affiliated with Iron Gate.“

VZHLED:
- Tmavé severské téma. Barvy jako CSS proměnné na `:root`:
  - pozadí skoro černé s nádechem do modro-šedé (#0f1216)
  - karty (#181d23)
  - akcent jantar/zlato (#d9a441)
  - text (#e8e4da)
- Barvy typů poškození jako proměnné: blunt, slash, pierce, fire, frost, lightning, poison, spirit, chop, pickaxe.
- Systémové fonty: nadpisy serif (Georgia), text sans-serif (system-ui).
- Čitelné na šířce 360 px bez horizontálního scrollu. Boční odsazení 16 px.
- Plynulé otevírání akordeonu (CSS, krátké). `prefers-reduced-motion` animace vypne.

KROKY A COMMITY:
1. `index.html` + `assets/styles.css` (kostra, hlavička, akordeon biomů s hlavičkami) → `VC-3: page shell and biome accordion [GM]`
2. Karta jednotky (přepínač hvězdiček, útoky, modifikátory) → `VC-3: creature cards [GM]`
3. Doporučení, sekce zbraní biomu, detaily → `VC-3: weapon recommendations and biome weapons [GM]`
4. Hledání, filtr, legenda, patička, `localStorage`, favicon, ladění na mobil → `VC-3: search, filters, legend, polish [GM]`

ZKOUŠKA (po každém kroku):
- `node --check assets/app.js`
- Kouřový test bez prohlížeče: `node -e "global.window={};require('./data/data.js');console.log(Object.keys(window.VC_DATA.creatures).length)"`
- Prohlížeč pouštět nemusíš. Vizuální kontrolu udělá orchestrátor.

ROZPOČET:
- Čti jen to, co je výše. Výstupy ořezávej `| tail -30`.

KDYŽ COKOLIV NESEDÍ (data neodpovídají schématu): ⛔ data neopravuj. Napiš do závěrečné odpovědi, co chybí, a ošetři to v UI (skrýt prázdné).

NAKONEC stručně: hashe commitů · co je hotové z bodů 1–6 · co ne a proč · `git status --short` (prázdné).
