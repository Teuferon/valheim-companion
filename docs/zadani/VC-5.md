🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-5: v Bestiary panel „Your character“. Hráč si v něm nastaví skilly a další faktory. Síla zbraní, doporučení a počet úderů na zabití se přepočítají podle něj v prohlížeči.
Navazuje na VC-4 (Bestiary je v `apps/bestiary/`).
Commituj jen do své větve {{VETEV}} po krocích, soubory přidávej výčtem (⛔ `git add -A`). ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně, nic na pozadí. Kód ANGLICKY.

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 5 a § 9 (závazné vzorce) a `docs/DATA-SCHEMA.md` (`weapons.json` → `skill` a `backstab`; `data.js` → poznámka o VC-5).
`scripts/recommend.mjs` čti celý. `apps/bestiary/assets/app.js` jen po úsecích (`grep -n`, `sed -n`), je dlouhý.

ROZSAH (⛔ jiné soubory neupravuj):
- `scripts/wiki/fetch-weapons.mjs`, `scripts/recommend.mjs`, `scripts/recommend.test.mjs`, `scripts/build-data.mjs`
- `data/weapons.json`, `data/recommendations.json`, `data/report-weapons.md`
- `apps/bestiary/assets/rank.js` (nový), `apps/bestiary/assets/app.js`, `apps/bestiary/assets/styles.css`, `apps/bestiary/index.html`, `apps/bestiary/data/data.js`

KROK 1: data zbraní, commit
- `fetch-weapons.mjs` doplní `skill` a `backstab` podle DATA-SCHEMA a ANALYZA § 9. Magie podle `type`: obsahuje „Blood“ → `blood-magic`, jinak `elemental-magic`.
- Jede jen z cache (`data/raw`), ⛔ síť. Druhý běh nic nemění.
- Commit: `VC-5: weapon skill and backstab fields [GM/flash]`

KROK 2: společné jádro výpočtu, commit
- `apps/bestiary/assets/rank.js` je klasický skript **bez `import`/`export`**. Na konci udělá `globalThis.VCRank = { … }`, aby šel načíst v prohlížeči přes `<script>` i v Node přes `await import()`.
- Obsah:
  - `SKILLS`: 12 skillů s anglickými názvy (Swords, Knives, Clubs, Polearms, Spears, Axes, Fists, Bows, Crossbows, Elemental magic, Blood magic, Pickaxes)
  - `DIFFICULTY`: `{ veryeasy: 1.25, easy: 1.1, normal: 1, hard: 0.85, veryhard: 0.7 }`
  - `SET_BONUSES`:
    - `root`: Bows +15
    - `lox`: Bows +15
    - `fenris`: Fists +15
    - `bear`: +10 % slash a chop
    - `vanguard`: +10 % pierce
  - `DEFAULT_PLAYER`:
    - všechny skilly 50
    - `difficulty: 'normal'`
    - `players: 1`
    - `quality: 'max'` (nebo číslo 1–4)
    - `sets: []`
    - `sneak: false`, `staggered: false`
  - `skillFactor(level)` → `{ min, max, avg }` přesně podle § 9 (L0: 0.25 / 0.55 / 0.40; L75: 0.70 / 1.0 / 0.85; L100: 0.85 / 1.0 / 0.925)
  - `effectiveSkill(player, skill)`: skill + bonusy ze setů, strop 100
  - `weaponDamage(weapon, quality)`: `damage + perLevel × (q − 1)`, `q = min(quality, maxQuality)`, nebo `maxQuality` při `'max'`
  - `effectiveModifiers(creature)`: přesun z `recommend.mjs`
  - `perHit(weapon, ammo|null, creature, player)` → `{ avg, min, max, raw, notes }`. Používá skill zbraně (u luku a kuše skill launcheru), obtížnost, bonusy ze setů k poškození, `sneak` (× `backstab`, pokud ho zbraň má), `staggered` (×2) a pravidla z VC-2b:
    - chop a pickaxe se počítají jen při násobiči > 0
    - `notes` bez ×0 Chop a ×0 Pickaxe
  - `creatureHp(creature, star, biomeId, player)`: `health` nebo `healthByBiome[biomeId]` pro danou hvězdu × `(1 + 0.3 × (min(players, 5) − 1))`
  - `recommend(creature, biome, weapons, player)`: struktura jako v `recommendations.json` (melee top 3 z různých kategorií, luk + šípy, kuše + šipky, magic, bomb, `avoid`, `tip`, filtr neúčinných podle VC-2b). `score` = `avg` za úder a navíc `min`, `max`. Při shodě rozhoduje nižší tier, pak název.
- `scripts/recommend.mjs` načte jádro (`await import('../apps/bestiary/assets/rank.js')`) a ⛔ nemá vlastní kopii logiky. `recommendations.json` počítá s `DEFAULT_PLAYER`.
- `scripts/build-data.mjs`: klíč `recommendations` z `data.js` odeber. Kontrola konzistence zůstává (nad `recommendations.json`).
- Testy (`node --test 'scripts/**/*.test.mjs'`), aspoň 12 nových asercí:
  - `skillFactor` na L0, L50, L75 a L100
  - Root set zvedne Bows ze 90 na 100, ne na 105
  - Very hard × 0.7
  - 3 hráči → HP × 1.6, 9 hráčů → HP × 2.2
  - `sneak` s nožem s backstab 6 → ×6
  - `staggered` ×2
  - kvalita 1 vs max
  - Greydwarf proti Fire Arrow s Bows 0 vs 100: poměr avg = 0.40 / 0.925
- Commit: `VC-5: shared ranking core with skills, difficulty, players [GM/flash]`

KROK 3: panel „Your character“, commit
- `index.html`: `<script src="assets/rank.js">` před `app.js`.
- Panel pod hlavičkou, nad legendou, `<details>`:
  - Sbalený ukazuje souhrn, např. „Your character · avg skill 50 · Normal · 1 player · Max quality“.
  - Při první návštěvě (nic v `localStorage`) je otevřený.
- Uvnitř panelu:
  - **Weapon skills**: mřížka 12 řádků, v každém název skillu, `<input type="range" min=0 max=100>` a `<input type="number">`, obojí synchronizované. Pokud set bonus mění skill, vedle čísla drobně „+15 → 65“.
  - **Set all**: jeden slider a tlačítko „Apply to all“.
  - **Armor set bonuses**: checkboxy Root set (+15 Bows), Lox fur set (+15 Bows), Fenris set (+15 Fists), Bear set (+10 % Slash/Chop), Vanguard set (+10 % Pierce).
  - **World**: select Combat difficulty (Very easy 125 % … Very hard 70 %) a „Players nearby“ 1–5 (s vysvětlivkou „+30 % enemy HP per extra player“).
  - **Weapons**: select „Upgrade level“: Max (výchozí), 1, 2, 3, 4.
  - **Situational**: checkboxy „Sneak attack (backstab)“ a „Enemy staggered (×2)“.
  - Tlačítko „Reset to defaults“.
- Ukládá se do `localStorage` pod klíčem `vc.player` (JSON, v try/catch). Neznámé nebo poškozené hodnoty se nahradí `DEFAULT_PLAYER`.
- Změna nastavení přepočítá doporučení **ve všech už vyrenderovaných kartách** (debounce 150 ms). Rozbalené detaily a vybraná hvězda karty se ⛔ nezavřou ani neresetují.
- Commit: `VC-5: Your character panel with localStorage [GM/flash]`

KROK 4: karty a zbraně biomu, commit
- Doporučení v kartě se počítají přes `VCRank.recommend(creature, biome, weapons, player)` místo `VC_DATA.recommendations`.
- Řádek zbraně:
  - průměrné poškození za úder velkým písmem, `title` „min–max per hit“
  - pod ním „≈ N hits“ = `ceil(HP / avg)` pro **aktuálně vybranou hvězdu** karty a aktuální biom, přepočítá se i po přepnutí hvězdy
  - `notes` jako dosud
- `tip` se generuje z výsledku `recommend` (šablona z VC-2b).
- Tabulka „Weapons & ammo from this biome“ dostane sloupec „Your avg“: průměrné poškození bez modifikátorů jednotky, s tvým skillem, obtížností a kvalitou.
- Legenda: nahraď poznámku o skóre textem „Damage = average per hit with your skills (primary attack). Combo finisher ×2, secondary attacks, Dvergr buff and DoT ticking are not included.“
- Commit: `VC-5: live recommendations and hits-to-kill in cards [GM/flash]`

ZKOUŠKA (na konci):
- `node --test 'scripts/**/*.test.mjs'`
- `node --check apps/bestiary/assets/app.js` a `node --check apps/bestiary/assets/rank.js`
- `npm run data 2>&1 | tail -3`, pak `git status --short` (prázdné)
- `grep -n "innerHTML\|fetch(\|type=\"module\"\|onclick=" apps/bestiary/index.html apps/bestiary/assets/*.js`: jen komentáře
- Kouřový test jádra v Node, výpis:
  - `VCRank.recommend` pro Troll v black-forest s `DEFAULT_PLAYER`
  - totéž s Bows 100 a `sets: ['root']`

HOTOVO, KDYŽ: ZKOUŠKA prošla. Vizuální test udělá orchestrátor.
KDYŽ COKOLIV NESEDÍ: napiš, co jsi našel, commitni hotové kroky a skonči.
NAKONEC stručně: hashe · výstup kouřového testu · `git status --short`.
