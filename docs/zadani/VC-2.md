🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-2: zbraně, materiály, výpočet doporučení a balík dat pro web. Navazuje na hotové VC-1 (je v main).
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`).
⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně.
Kód i komentáře ANGLICKY. Žádné npm balíčky.

PŘEČTI NEJDŘÍV (jen tohle):
- `docs/ANALYZA.md` § 3, § 4, § 5
- `docs/DATA-SCHEMA.md` (celé, závazné)
- exporty `scripts/wiki/api.mjs` a `scripts/wiki/wikitext.mjs`: `grep -n "^export" scripts/wiki/*.mjs`, pak jen funkce, které použiješ
- ⛔ `data/creatures.json` necatuj celý (je velký). Používej `node -e` dotazy na konkrétní jednotky.

PROČ:
U každé jednotky chceme ukázat, čím ji nejlíp zabít, a jen tím, co hráč v daném biomu reálně může mít. Výpočet je deterministický (vzorec v ANALYZA § 5) a musí jít znovu pustit jedním příkazem.

ROZSAH (⛔ jiné soubory neupravuj):
- `scripts/wiki/fetch-weapons.mjs`: stažení zbraní a materiálů
- `scripts/recommend.mjs`: výpočet doporučení (exportuje čisté funkce + `main`)
- `scripts/recommend.test.mjs`
- `scripts/build-data.mjs`: složí `data/data.js`
- `data/weapons.json`, `data/materials.json`, `data/recommendations.json`, `data/data.js`, `data/report-weapons.md`
- `data/raw/**` (nová cache), `img/weapons/**`
- `package.json`: jen přidat skripty `fetch:weapons`, `recommend`, `build:data`, `data` (= všechny tři kroky po VC-1 za sebou)

KROK 1: zbraně a materiály (`scripts/wiki/fetch-weapons.mjs`), commit
- Zdroj: `Category:Weapons` + `Category:Arrows` + `Category:Bolts` + `Category:Bombs` + `Category:Magic`, jen stránky s `{{infobox weapon}}`. Rozcestníky (`Swords`, `Arrows`, …) vynech.
- Vynech (ANALYZA § 5 bod 1): štíty (type obsahuje Shield nebo Buckler), Missile, Payload, Cheat*, Torch, Lantern, Snowball, Snow Shovel, hole bez přímého poškození (součet damage = 0) a zbraně se součtem damage 0. Co vynecháš, zapiš do reportu s důvodem.
- `category` urči z `type` (`Sword` → sword, `Club 1h` / `Mace` → club, `Atgeir`/`Polearm` → polearm, `Battleaxe`/`Axe 2h` → battleaxe, `Sledge` → sledge, `Knife`/`Dagger` → knife, `Fist` → fists, `Bow` → bow, `Crossbow` → crossbow, `Arrow` → arrow, `Bolt` → bolt, `Staff`/`Magic` → magic, `Bomb` → bomb). Neznámý `type` jde do reportu a zbraň se vynechá.
- `damageMax` podle DATA-SCHEMA (`<typ> per level`, `maxQuality` = počet polí `materials N`).
- Materiály: tabulka z ANALYZA § 3 (vlož ji do kódu jako konstantu, `how: "table"`). Pro materiál mimo tabulku stáhni jeho stránku a zkus biom určit z infoboxu (pole jako `biome`, `location`, `source`, `drops from`):
  - Najdeš-li odkaz na jednotku, vezmi její první biom z `data/creatures.json`.
  - Najdeš-li odkaz na biom, vezmi ten biom.
  - Je-li materiál vyrobený z jiných materiálů (`materials 1`), vezmi max z nich (rekurze, hloubka max 3).
  - Jinak `unresolved`.
  Zapiš `how: "wiki"` a `note` s důvodem. Materiály z `data/overrides.json` sekce `materials` mají přednost před vším.
- Tier zbraně = max tier materiálů z `materials 1`. Má-li některý materiál `tier: null`, zbraň má `tier: null` a jde do reportu.
- Ikony zbraní: šířka 96 → `img/weapons/<id>.png`.
- Zkouška: `node scripts/wiki/fetch-weapons.mjs 2>&1 | tail -30`. Druhý běh bez sítě a bez změn.
- Commit: `git add scripts/wiki/fetch-weapons.mjs package.json` → `VC-2: weapon and material fetcher [GM/flash]`, pak `git add data/weapons.json data/materials.json data/report-weapons.md data/raw img/weapons` → `VC-2: weapon data [GM/flash]`

KROK 2: doporučení (`scripts/recommend.mjs`) a testy, commit
- Čisté funkce:
  - `effectiveModifiers(creature)`: `modifiers` plus výchozí hodnoty z ANALYZA § 4, výsledek jsou čísla.
  - `score(damage, mods)`
  - `rangedScore(launcher, ammo, mods)`
  - `recommendFor(creature, biome, weapons)`: vrací objekt podle DATA-SCHEMA `recommendations.json`.
- Pravidla přesně podle ANALYZA § 5:
  - kandidáti `tier ≤ biome.gearTier`
  - melee top 3 z různých kategorií
  - nejlepší luk + top 3 šípy, nejlepší kuše + top 2 šipky, top 1 magic, top 1 bomb
  - `avoid`
  - `notes`
  - `tip`
  Při shodě skóre rozhoduje nižší tier, pak název.
- Krumpáče jsou kandidáti jen při `mods.pickaxe > 0`.
- `tip` (anglicky, jedna věta):
  - Má-li jednotka `veryweak` nebo `weak` typ, `"Very weak to Fire (×2): <nejlepší zbraň s tím typem> hits for <score> effective."`
  - Jinak `"No elemental weakness — best raw option: <nejlepší melee> (<score>)."`
  - Je-li jednotka imunní na nějaký typ, přidej `" Immune to <Typ>."`
- `main`: pro každý biom a každou jednotku v `biome.creatures.*` spočítej doporučení a zapiš `data/recommendations.json`.
- Testy (`node --test 'scripts/**/*.test.mjs'`): aspoň 10 asercí na syntetických datech, např.:
  - zbraň s fire 10 proti veryweak fire → 20
  - spirit bez uvedení → 0
  - tier filtr nedoporučí zbraň vyššího tieru
  - melee top 3 mají různé kategorie
- Commit: `VC-2: deterministic weapon recommendations [GM/flash]`

KROK 3: balík (`scripts/build-data.mjs`), commit
- Složí `data/data.js` podle DATA-SCHEMA: `creatures` a `weapons` jako objekty podle `id`, `generatedAt` = čas posledního běhu stahování (vezmi ho z `data/report.md`, nebo z času změny `data/creatures.json`).
- Ověř, že každé `weapon` id v doporučeních existuje ve `weapons` a každá jednotka v biomech existuje v `creatures`. Chyba = exit 1.
- Commit: `VC-2: data bundle for the site [GM/flash]`

HOTOVO, KDYŽ:
- `node --test 'scripts/**/*.test.mjs'` projde
- `npm run data` doběhne a druhý běh nic nezmění
- `black-forest:greydwarf` → v `arrows` je Fire Arrow do top 3 a nic z tier > 2 nikde
- `mountain:stone-golem` → v `melee` je krumpáč nebo blunt zbraň na 1. místě (golem je slabý na pickaxe/blunt podle wiki; pokud wiki říká jinak, napiš to do reportu)
- `swamp:draugr` → nic z tier > 3
- `deep-north:kall-fimbulbringer` existuje a melee má 3 položky
- `data/report-weapons.md` uvádí počet zbraní po tierech a všechny `unresolved` materiály

ROZPOČET:
- Plný stahovací běh nejvýš 3×, ladění nad cache.
- Výstupy ořezávej `| tail -30`.
- ⛔ WebFetch, ⛔ čtení jiných dokumentů.

KDYŽ COKOLIV NESEDÍ: ⛔ nevymýšlej náhradu mimo rozsah. Zapiš to do `data/report-weapons.md` do `## Open questions`, commitni, co máš, a skonči.

NAKONEC stručně: hashe commitů · počet zbraní po tierech · seznam `unresolved` materiálů · výpis doporučení pro `black-forest:troll` (`node -e …`) · `git status --short` (prázdné).
