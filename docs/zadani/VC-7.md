🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem nebo po adresářích z ROZSAHU (⛔ `git add -A`). ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně, ⛔ nic na pozadí. Kód a komentáře ANGLICKY.
Testy: `node --test 'scripts/**/*.test.mjs'`.

Úkol VC-7: data pro novou sekci Armourer: brnění, suroviny, odkud se berou a recepty.

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 10 a `docs/DATA-SCHEMA.md` § Armourer (závazné). Exporty `scripts/wiki/api.mjs` a `scripts/wiki/wikitext.mjs` (`grep -n "^export"`). Logiku tieru materiálů najdi v `scripts/wiki/fetch-weapons.mjs` přes `grep -n`.

ROZSAH (⛔ jiné soubory neupravuj):
- `scripts/wiki/fetch-armor.mjs` (nový), `scripts/wiki/armor.test.mjs` (nový)
- `scripts/wiki/wikitext.mjs` (jen přidat funkce, stávající ⛔ neměnit chování)
- `scripts/build-armourer-data.mjs` (nový)
- `data/armor.json`, `data/items.json`, `data/report-armor.md`, `data/raw/**`
- `apps/armourer/img/armor/**`, `apps/armourer/img/items/**`, `apps/armourer/data/data.js`
- `package.json`: jen skript `"armor": "node scripts/wiki/fetch-armor.mjs && node scripts/build-armourer-data.mjs"`
- Sdílenou logiku tieru materiálů ⛔ nekopíruj. Pokud je ve `fetch-weapons.mjs` jako nevyexportovaná funkce, vytáhni ji do `scripts/wiki/materials.mjs` a importuj ji z obou míst. `fetch-weapons.mjs` pak smí změnit jen import a výstup musí zůstat stejný. Ověř to: `node scripts/wiki/fetch-weapons.mjs` a `git status --short data/` musí vyjít beze změny.

KROK 1: parser, commit
- `parseAllInfoboxes(wikitext, name)` vrátí **všechny** bloky `{{infobox <name>` na stránce, i vnořené v `{{InfoboxTabber}}` a `<tabber>`. Použij stávající počítání hloubky závorek.
- `parseMaterialList(s)` rozparsuje oba zápisy, `* 20 [[Iron]]` i `* [[Bronze]] x2`, a vrátí `[{ name, amount, fuel }]`. Poznámka `(Fuel)` → `fuel: true`. Položka bez čísla má `amount` 1.
- `parseQualityTables(wikitext)` vrátí pro každé `=== Quality N ===` mapu `název dílu → { armor, durability, stationLevel }`:
  - `durability` je z „Durability per piece: N“
  - `armor` je první číslo za buňkou s `{{Item Link|<název>…}}`
  - `stationLevel` je předposlední číselná buňka řádku (crafting)
  - řádek „Full set“ přeskoč
- Testy nad vlepenými ukázkami dole (Iron Armor, Troll Set, Protector Armor, Fenris), aspoň 15 asercí.
- Commit: `VC-7: armor infobox, material list and quality table parsers [GM/flash]`

KROK 2: stažení a sestavení, commit
1. `Category:Armor` rekurzivně (podkategorie, hloubka 2). Přeskoč rozcestník `Armor` a `CAPE TEST` a stránky bez `{{infobox armor}}` zapiš do reportu.
2. Každou stránku převeď na záznam `armor.json`:
   - Víc bloků nebo neprázdné `set pieces` → `kind: set`.
   - Jeden blok bez setu → `single`.
   - Prázdné `materials 1` a `source` je NPC (Hildir, Haldor) → `cosmetic`.
   - Stejný díl uvedený na stránce setu i na samostatné stránce (Troll Hide Cape) se v `single` ⛔ neduplikuje, zůstane jen v setu.
3. Úrovně: `levels` podle `materials 1..4`. `armor` a `durability` pro q≥2 vezmi z `parseQualityTables`, jinak z infoboxu `+2 × (q−1)` a `armorSource: "estimate"`.
4. Suroviny: množina všech surovin ze všech úrovní. Pro každou stáhni stránku a `{{infobox item}}` (`source`, `materials`). Pak rekurzivně (hloubka 3) i suroviny z receptů (Bronze → Copper, Tin).
   - `sources`: rozdělené podle odkazů a `<br>`.
   - `kind`: `creature`, pokud slug odkazu je v `data/creatures.json` (doplň `creatureId` a `biomes`); `station` pro známé stanice (Workbench, Forge, Smelter, Blast Furnace, Spinning Wheel, Windmill, Galdr Table, Black Forge, Artisan Table, Frost Foundry, Kiln, Cauldron, Fermenter…; vynech pomocné stavby, např. Cooking station nebo Charcoal kiln, pokud nedávají smysl); `npc` pro Haldor, Hildir, Bog Witch; jinak `location` nebo `other`.
5. `biome` a `tier` surovin a setů: sdílená logika materiálů (viz ROZSAH) a `data/overrides.json` → `materials`.
6. Obrázky: díly šířka 128 → `apps/armourer/img/armor/<id>.png`, suroviny šířka 64 → `apps/armourer/img/items/<id>.png`.
7. Report `data/report-armor.md`:
   - počty setů a dílů po biomech
   - díly s `armorSource: estimate`
   - suroviny bez zdroje nebo bez biomu
   - přeskočené stránky
   - `## Open questions`
8. `scripts/build-armourer-data.mjs` → `apps/armourer/data/data.js` podle schématu (`biomes` z `data/biomes.json`).
- Síť jen přes `api.mjs` (cache, 300 ms). Druhý běh jede jen z cache a nic nezmění.
- ZKOUŠKA:
  - testy projdou
  - `node -e` výpis pro Iron Armor (3 díly, helmet q1–q4 armor 14/16/18/20, materiály q1 20 Iron + 2 Deer Hide)
  - Troll Set (4 díly, setBonus Sneaky 4 pieces)
  - Fenris Set (setBonus se Fists +15)
  - Bronze (recipe Copper ×2 + Tin ×1)
  - Leather Scraps (sources obsahují creature boar)
- Commity:
  - `git add scripts/ package.json` → `VC-7: armor and item fetcher [GM/flash]`
  - `git add data/ apps/armourer` → `VC-7: armor and item data [GM/flash]`

KDYŽ COKOLIV NESEDÍ: zapiš to do `data/report-armor.md` › `## Open questions`, commitni hotové a skonči.
NAKONEC stručně: hashe · počty setů a dílů po biomech · Open questions · `git status --short`.

---
VLEPENÉ UKÁZKY (valheim.weirdgloop.org, 5. 10. 2026, zkrácené):

Iron Armor (začátek stránky):
```
{{InfoboxTabber
|Head|{{infobox armor
| title          = Iron Helmet
| image          = Iron helmet.png
| id             = HelmetIron
| type           = Head
| source         = [[Forge]]
| weight         = 3.0
| durability     = 1000
| crafting level = 1
| armor          = 14
| materials 1    = 
* 20 [[Iron]]
* 2 [[Deer Hide]]
| materials 2    = 
* 5 [[Iron]]
| materials 3    = 
* 10 [[Iron]]
| materials 4    = 
* 20 [[Iron]]
| movement speed = 
| set pieces     = 
}}
|Chest|{{infobox armor
| title          = Iron Scale Mail
| type           = Chest
| armor          = 14
| movement speed = -5%
| materials 1    = 
* 20 [[Iron]]
* 2 [[Deer Hide]]
}}
}}
=== Quality 2 ===
Durability per piece: 1200
{|class="wikitable" style="text-align:center;"
! colspan="2" | Armor piece !! Armor !! Upgrade cost<br>(Total cost) !! Weight !! Movement<br> speed !! Forge level<br> crafting !! Forge level<br> repairing
|-
| rowspan="1" colspan="2" | {{Item Link|Iron Helmet|size=64|nolink=1}}
| 16 || 5 (25) [[Iron]]<br>(2) [[Deer Hide]] || 3 || || 2 || 1
|-
| rowspan="1" colspan="2" | '''Full set''' 
| 48 || 15 (75) [[Iron]]<br>(6) [[Deer Hide]] || 33 || -10% || 3 || 2
|}
```

Troll Set (výňatek z helmy):
```
| materials 1    = 
* 5 [[Troll Hide]]
* 3 [[Bone Fragments]]
| armor          = 6
| set pieces     = Troll Set (4 pieces)
| set effect     = [[Sneaky]]
* Sneak skill +15
```

Protector Armor (vnořený tabber, palivo):
```
{{InfoboxTabber
|Armor|
{{InfoboxTabber
|Head|{{infobox armor
| title          = Helmet of the Protector
| type           = Head
| source         = [[Frost Foundry]]
| armor          = 44
| materials 1    = 
* [[Cast Helmet of the Protector]] x1
* [[Liquid Frost]] x5 (Fuel)
| materials 2    = 
* [[Bloodgold]] x15
* [[Moose Hide]] x3
| movement speed = 0%
}}
```

Fenris (set effect):
```
| movement speed = +3%
| set pieces = Fenris Set (3 pieces)
| set effect = [[Fenris blessing]]
* [[Fists (skill)|Fists]] +15
* Resistant (0.5x) VS [[Fire]]
```

Suroviny (`{{infobox item}}`):
```
Iron:            | source = [[Smelter]]                         | materials = * [[Scrap Iron]] x1
Bronze:          | source = [[Forge]]<br/>[[Smelter]]           | materials = * [[Copper]] x2 * [[Tin]] x1
Leather Scraps:  | source = [[Boar]], [[Bat]], [[Muddy Scrap Pile]]s
Linen Thread:    | source = [[Spinning Wheel]]                  | materials = * [[Flax]] x1
Scrap Iron:      | source = [[Muddy Scrap Pile]]<br />[[Sunken Crypts]] [[Chest]]s<br />[[Oozer]]s<br />[[Ancient Sword]]
```
