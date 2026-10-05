🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, soubory výčtem. ⛔ push, merge, rebase. Každý příkaz synchronně. Kód ANGLICKY. Testy: `node --test 'scripts/**/*.test.mjs'`.

Úkol VC-7b: opravy dat Armouru po přejímce VC-7. Malý úkol.

ROZSAH: `scripts/wiki/fetch-armor.mjs`, `scripts/build-armourer-data.mjs`, `scripts/wiki/armor.test.mjs`, `data/armor.json`, `data/items.json`, `data/report-armor.md`, `apps/armourer/data/data.js`, `apps/armourer/img/**`, `data/raw/**`.
ROZPOČET ČTENÍ: jen úseky souborů výše (`grep -n`, `sed -n`).

OPRAVY (každá s testem nebo s ověřením přes `node -e`):
1. **Deterministický `generatedAt`** v `build-armourer-data.mjs`: stejný postup jako `scripts/build-data.mjs` (najdi ho přes `grep -n generatedAt scripts/build-data.mjs`), ⛔ `new Date()`. Druhý běh `fetch-armor` a `build-armourer-data` nesmí změnit žádný soubor.
2. **Trofeje bez zdroje** (Bear, Moose, Cultist, Vile, Drake, Wolf Trophy…): když surovina nemá `sources` a jmenuje se `<X> Trophy` a `<X>` je jednotka v `data/creatures.json` (podle slugu nebo jména), přidej `{ text: X, kind: "creature", creatureId, biomes }`.
3. **Díl bez jména** (Pointy Hat): `name` vezmi z `title` infoboxu, jinak z názvu stránky. Žádný díl nesmí mít prázdné `name`.
4. **`Root` vs `Roots`**: sjednoť podle přesměrování na wiki (`getWikitext` vrací cílový titul). Id suroviny = slug cílové stránky. Jedna surovina, jeden záznam.
5. **Liquid Frost bez biomu**: projdi suroviny s `biome: null`. Když jejich `recipe` vede na suroviny se známým biomem, vezmi max tier receptu. Jinak je nech v reportu.

ZKOUŠKA: testy · 2× za sebou `node scripts/wiki/fetch-armor.mjs` a `node scripts/build-armourer-data.mjs`, pak `git status --short` prázdné · `node -e` výpis: počet surovin bez `sources`, díly bez `name` (0), `root`/`roots`, `liquid-frost.biome`.
COMMIT: `VC-7b: armourer data fixes (deterministic build, trophy sources, names, redirects) [GM/flash]`
NAKONEC: hash · výpis ze ZKOUŠKY · `git status --short`.
