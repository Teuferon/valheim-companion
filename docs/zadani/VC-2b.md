🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-2b: tři opravy výpočtu doporučení po přejímce VC-2. Malý úkol, jen `scripts/recommend.mjs`.
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`).
⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně. Kód ANGLICKY.
Testy pouštěj `node --test 'scripts/**/*.test.mjs'` (⛔ `npm test`).

ROZSAH (⛔ jiné soubory neupravuj): `scripts/recommend.mjs`, `scripts/recommend.test.mjs`, `data/recommendations.json`, `data/data.js`.
ROZPOČET ČTENÍ: `scripts/recommend.mjs` celý (je tvůj). ⛔ nic dalšího kromě `node -e` dotazů do `data/recommendations.json`.

OPRAVY (každá = test + oprava):
1. **Nástrojové poškození.** `chop` a `pickaxe` se nezapočítávají do `raw` ani nepatří do `notes`, pokud má jednotka pro daný typ násobič 0.
   Příklad: Battleaxe proti Draugrovi nesmí mít v `notes` „×0 Chop“ a jeho `raw` nesmí obsahovat chop.
   Proti Stone Golemovi (pickaxe ×2) zůstává `"×2 Pickaxe"`.
2. **Tip a slabiny.** Tip hledá slabinu (násobič > 1) přes VŠECHNY typy včetně `pickaxe` a `chop`.
   Stone Golem → `"Very weak to Pickaxe (×2): Bronze Pickaxe hits for 87 effective. Immune to Fire, Frost, Poison, Spirit."` (číslo podle dat).
   Do části „Immune to …“ nepatří `chop` ani `pickaxe`.
3. **Neúčinná doporučení.** `magic` a `bomb` jsou `null`, když `score < 0.5 × raw` (jednotka většinu poškození odolá).
   Šípy a šipky, u kterých platí totéž, se z `arrows` / `bolts` vyřadí. Když nezbude žádný, pole je prázdné.
   Příklad: Ooze Bomb proti Draugrovi (score 5) → `bomb: null`.

ZKOUŠKA:
- `node --test 'scripts/**/*.test.mjs'` projde, nových asercí je aspoň 6
- `node scripts/recommend.mjs 2>&1 | tail -5`, pak `node scripts/build-data.mjs 2>&1 | tail -5`
- výpis `node -e` pro `swamp:draugr`, `mountain:stone-golem` a `black-forest:greydwarf`: jeden řádek s `melee`, `bomb` a `tip`

COMMIT: `git add scripts/recommend.mjs scripts/recommend.test.mjs data/recommendations.json data/data.js` → `VC-2b: tool damage, pickaxe weakness in tips, drop ineffective picks [GL]`
KDYŽ COKOLIV NESEDÍ: napiš to do závěrečné odpovědi a skonči.
NAKONEC stručně: hash · výpis ze ZKOUŠKY · `git status --short` (prázdné).

---
DOPLNĚK (po přejímce VC-3): **chybějící ikony zbraní**
4. 26 ze 147 zbraní má `image: null` (např. `bronze-atgeir`, `dundr`, všechny `frostfire-*`). Pravděpodobná příčina: infobox je uvnitř `<tabber>` nebo se soubor jmenuje jinak než `image` v infoboxu.
   Rozšiř ROZSAH o `scripts/wiki/fetch-weapons.mjs`, `data/weapons.json`, `data/report-weapons.md` a `img/weapons/**`.
   Pro každou zbraň bez obrázku zkus postupně:
   1. pole `image` z infoboxu (i uvnitř tabberu)
   2. `File:<Název>.png`
   3. `File:<Název s malými písmeny kromě prvního>.png`
   4. stejné názvy přes `https://valheim.fandom.com/api.php`
   Co nevyjde, zapiš do reportu.
   ZKOUŠKA navíc: `node -e "console.log(require('./data/weapons.json').filter(w=>!w.image).length)"` vrátí ≤ 3.
   Commit zvlášť: `VC-2b: missing weapon icons [GL]`.
