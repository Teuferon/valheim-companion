🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-1b: opravy parseru jednotek po přejímce VC-1. Kód je tvůj z VC-1 (v main), schéma se rozšířilo.
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`).
⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně. Kód a komentáře ANGLICKY.
Testy pouštěj `node --test 'scripts/**/*.test.mjs'` (⛔ `npm test`, není povolené).

PŘEČTI NEJDŘÍV: `docs/DATA-SCHEMA.md` § `data/creatures.json` → odstavec „Pravidla“ (změnily se body `stars`, `health`, nové `healthByBiome` a `weakPoints`).
⛔ `data/creatures.json` necatuj celý, ptej se přes `node -e`.

ROZSAH (⛔ jiné soubory neupravuj): `scripts/wiki/wikitext.mjs`, `scripts/wiki/wikitext.test.mjs`, `scripts/wiki/fetch-creatures.mjs`, `data/biomes.json`, `data/creatures.json`, `data/report.md`, `img/creatures/**` (jen mazání sirotků).
⛔ `data/overrides.json` neměň (patří orchestrátorovi), jen ho dál aplikuj.

CO OPRAVIT (každé = test + oprava):
1. `parseHealth`: `"12,500"` → 12500, `"10,000"` → 10000 (The Queen, Yagluth).
2. Části HP `"* Thungr: 4200\n\n* Zil: 2400"` → 6600, `healthText` `"Thungr: 4200\nZil: 2400"` (Zil & Thungr).
3. HP po biomech (Skeleton): řádky `Meadows: 30\nBlack Forest: 40\nSwamp: 60\nMountain: 75\nDeep North: 100` → `healthByBiome: { meadows: 30, "black-forest": 40, swamp: 60, mountain: 75, "deep-north": 100 }`, `health: null`. Totéž pro každou hvězdu.
4. Úrovně hvězd jen ty, které infobox uvádí:
   - Bat, Ulv a Hexen mají prázdné `health 2star` → `stars` má 2 prvky
   - Lord Reto má jen pole `2star` → `stars: [{ star: 2, … }]`, `hasStars: false`
   Přesně podle DATA-SCHEMA.
5. `parseAttacks` pro řádky bez dvojtečky:
   - `"Mace 30 Blunt, 45 Poison"` → name `Mace`, damage `{ blunt: 30, poison: 45 }`
   - `"100 Frost"` → name `Attack`, damage `{ frost: 100 }`
   - Typy psané malými písmeny (`40 poison`) taky.
   - Řádky bez typu poškození (`Heal: 20 Health over 4 seconds`, `Protect: 100 Shield`, `No attacks`) zůstanou s `damage: {}`. Je to správně, ⛔ neopravuj.
6. `weakPoints` jako pole objektů: `weak point = Head` + `wp veryweak = Pierce` → `[{ part: "Head", modifiers: { pierce: "veryweak" } }]`. Seeker Soldier má `wp weak` se seznamem typů. Tato pole už ⛔ nepatří do „Unknown modifier fields“ v reportu.
7. Smaž obrázky v `img/creatures/`, na které žádný záznam v `data/creatures.json` neodkazuje (vyloučené jednotky). Report vypíše jejich počet.

ZKOUŠKA:
- `node --test 'scripts/**/*.test.mjs'` projde, nových asercí je aspoň 8
- `node scripts/wiki/fetch-creatures.mjs 2>&1 | tail -5` běží jen z cache (žádná síť); druhý běh nic nezmění
- `node -e` výpis pro the-queen, yagluth, zil-thungr, skeleton, lord-reto, bat, troll, rancid-remains: HP a `weakPoints` sedí podle bodů 1–6
- V reportu v sekci „Attacks with empty damage“ zbydou jen řádky bez typu poškození (Heal, Protect, No attacks)

COMMITY:
1. `git add scripts/wiki/` → `VC-1b: parser fixes — thousands, parts, per-biome HP, star levels, weak points [GL]`
2. `git add data/biomes.json data/creatures.json data/report.md img/creatures` → `VC-1b: regenerated creature data [GL]`

KDYŽ COKOLIV NESEDÍ: zapiš to do `data/report.md` › `## Open questions`, commitni, co máš, a skonči.
NAKONEC stručně: hashe · výpis ze ZKOUŠKY (jeden řádek na jednotku) · `git status --short` (prázdné).
