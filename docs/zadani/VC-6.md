🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-6: (A) chybějící pěstní zbraně a obecně zbraně z podkategorií wiki, (B) sekce **Armory** dole v Bestiary se seznamem všech zbraní.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně. Kód ANGLICKY.
Testy pouštěj `node --test 'scripts/**/*.test.mjs'`. Data přegeneruj `node scripts/wiki/fetch-weapons.mjs`, pak `node scripts/recommend.mjs` a `node scripts/build-data.mjs` (⛔ `npm run`).

PŘEČTI NEJDŘÍV: `docs/DATA-SCHEMA.md` (`weapons.json`) a `docs/ANALYZA.md` § 6 a § 9. `apps/bestiary/assets/app.js` čti jen po úsecích (`grep -n`, `sed -n`).

ROZSAH (⛔ jiné soubory neupravuj):
- `scripts/wiki/fetch-weapons.mjs`
- `data/weapons.json`, `data/materials.json`, `data/report-weapons.md`, `data/recommendations.json`, `data/raw/**`
- `apps/bestiary/img/weapons/**`, `apps/bestiary/data/data.js`
- `apps/bestiary/assets/app.js`, `apps/bestiary/assets/styles.css`, `apps/bestiary/assets/rank.js` (jen při chybě), `apps/bestiary/index.html`

ČÁST A: zbraně z podkategorií, commit
- PROČ: pěstní zbraně jsou na wiki jen v `Category:Unarmed`, což je podkategorie `Category:Weapons`. Fetcher do podkategorií nechodí, a proto chybí Flesh Rippers, Paws of the Bear, Vilebone Maulclaws a Nord, Frostfire a Thunderblood Knucklechains.
- Fetcher projde `Category:Weapons` **rekurzivně** (podkategorie `cmtype=subcat`, hloubka max 2, každou jen jednou) a sloučí to s dosavadními kategoriemi. Vylučovací pravidla ze stávajícího kódu platí dál.
- `type` hodnoty `fists` / `Fists` → `category: "fists"`, `skill: "fists"`. Backstab nech podle dat (výchozí hodnotu řeší `rank.js`).
- Síť je povolená jen pro nové stránky a obrázky přes `scripts/wiki/api.mjs` (cache, 300 ms mezi požadavky). Druhý běh musí jet jen z cache a nic nezměnit.
- `data/report-weapons.md`: nová sekce „Added in VC-6“ se seznamem nově přidaných zbraní a kategorií, ze kterých přišly.
- ZKOUŠKA:
  - `node -e "const w=require('./data/weapons.json');console.log(w.filter(x=>x.category==='fists').map(x=>x.name+' t'+x.tier))"` vypíše aspoň 7 pěstních zbraní
  - žádná z nich nemá `tier: null` ani `image: null` (nebo je to v reportu s důvodem)
- Commity:
  - `git add scripts/wiki/fetch-weapons.mjs` → `VC-6: fetch weapons from all Weapons subcategories (fists) [GL]`
  - `git add data/ apps/bestiary/img/weapons apps/bestiary/data/data.js` → `VC-6: weapon data incl. fist weapons [GL]`

ČÁST B: sekce Armory, commit
- Nová sekce **pod všemi biomy, nad patičkou**: nadpis „Armory“, podtitul „Every weapon and ammo, with your damage.“
- **Spoilery:**
  - Ve výchozím stavu sekce ukazuje jen zbraně, jejichž `biome` je mezi **otevřenými biomy** (stejný stav jako akordeon, `vc.openBiomes`).
  - Za každý zamčený biom je jeden tlumený řádek „🔒 N weapons from <Biome> — open the biome to reveal“. Jméno biomu se ukáže, protože ho ukazuje i hlavička akordeonu.
  - Přepínač „Show all weapons (spoilers)“ ukáže všechny. Je uložený v `localStorage` pod `vc.armoryAll` (v try/catch).
  - Otevření biomu v akordeonu Armory hned aktualizuje.
  - Zbraně s `biome: null` jsou v samostatné skupině „Special“ a zobrazí se jen s přepínačem.
- **Tabulka:**
  - Sloupce: ikona · Name · Category · Skill · Biome (Tier) · Damage (čipy `damageMax` podle typu, bez chop/pickaxe) · Your avg · Stamina · Backstab · Materials.
  - „Your avg“ = průměr za úder s nastavením z panelu „Your character“, bez modifikátorů jednotky. Použij stávající funkci pro sloupec „Your avg“ v tabulce zbraní biomu, ⛔ nepiš novou kopii. U šípů a šipek nejlepší dostupný luk nebo kuše ze stejného nebo nižšího tieru.
  - Backstab = hodnota z dat, nebo výchozí z `rank.js` (tlumeně s poznámkou „default“).
  - Klik na řádek otevře stávající modal zbraně.
- **Ovládání nad tabulkou:**
  - hledání podle jména
  - filtr kategorie (All, Swords, Axes, Clubs, Spears, Polearms, Knives, Fists, Pickaxes, Bows, Crossbows, Arrows, Bolts, Magic, Bombs)
  - filtr typu poškození (čipy: Fire, Frost, Lightning, Poison, Spirit, Pierce, Blunt, Slash)
  - řazení kliknutím na hlavičky Name, Biome, Your avg a Stamina; výchozí Biome a pak Name
- Přepočet „Your avg“ při změně panelu „Your character“ (stejný debounce jako karty).
- **Mobil (360 px):** tabulka se vodorovně posouvá ve svém wrapperu, ovládání se zalomí, stránka nepřetéká. Sloupec Name je `position: sticky; left: 0`.
- Bezpečnost jako dosud: `textContent` / `createElement`, ⛔ `innerHTML` s daty a ⛔ inline handlery.
- Commit: `VC-6: Armory section with spoiler-aware weapon list [GL]`

ZKOUŠKA (na konci):
- testy projdou
- `node --check apps/bestiary/assets/app.js`
- druhý běh přegenerování nic nezmění (`git status --short` prázdné)
- `grep -n "innerHTML\|fetch(\|onclick=" apps/bestiary/assets/app.js`: jen komentáře
Vizuální test udělá orchestrátor.

KDYŽ COKOLIV NESEDÍ: napiš, co jsi našel, commitni hotové kroky a skonči.
NAKONEC stručně: hashe · seznam nových zbraní (počet a jména) · `git status --short`.
