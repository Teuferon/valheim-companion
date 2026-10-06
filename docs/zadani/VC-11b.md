🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz synchronně, ⛔ nic na pozadí. Kód ANGLICKY.

Úkol VC-11b: dokončení KROKU 2 z `docs/zadani/VC-11.md`, který nestihl předchozí běh. Damage Calculator má počítat s výslovnými slabinami na Chop a Pickaxe (Stone Golem pickaxe ×2, Gammeltroll pickaxe weak, Kvastur chop weak), stejně jako Bestiary.

PŘEČTI: `docs/zadani/VC-11.md` KROK 2 a § 13 v `docs/ANALYZA.md`. V kalkulačce `grep -n "chop\|pickaxe\|terrain" apps/damage-calculator/scripts/scrape.ts apps/damage-calculator/src/lib/damage.ts apps/damage-calculator/src/lib/types.ts` a čti jen tyto úseky.

ROZSAH: `apps/damage-calculator/scripts/scrape.ts`, `apps/damage-calculator/src/lib/damage.ts`, `apps/damage-calculator/src/lib/types.ts` (jen pokud je potřeba), `apps/damage-calculator/src/data/enemies.json` a `bosses.json` (jen přegenerováním scraperem, ⛔ ručně), `apps/damage-calculator/scripts/verify-engine.ts`, `apps/damage-calculator/scripts/export-shared.ts` (fixtures: přidej Iron Pickaxe a Stone Golem), `data/parity-fixtures.json`.

POSTUP:
1. Scraper zachová u cílů modifikátory `chop` a `pickaxe` jen tehdy, když jsou na wiki výslovně uvedené. Ostatní odolnosti zůstanou stejné.
2. `damage.ts`: chop a pickaxe zbraně se proti cíli počítají jen při výslovném modifikátoru > 0, jinak se dál ignorují (dnešní chování).
3. Přegeneruj data: `npm --prefix apps/damage-calculator run scrape` (síť povolená, jen wiki). Pak ověř `git diff --stat apps/damage-calculator/src/data`: mění se jen modifikátory chop a pickaxe u několika cílů a `meta.json`.
   - Jiné změny v datech (wiki se mezitím mohla změnit) nevracej. Vypiš je v závěru.
4. `verify-engine.ts`, 3 nové kontroly: Stone Golem s Iron Pickaxe počítá pickaxe ×2; Troll s Iron Axe chop nepočítá; Kvastur s Iron Axe chop weak.
5. `npm --prefix apps/damage-calculator run export:shared` přegeneruje `data/parity-fixtures.json` (s novou kombinací Iron Pickaxe × Stone Golem).
6. Test parity (`node --test scripts/parity.test.mjs`) musí projít. Bestiary už pickaxe počítá, takže se čísla musí shodovat i u golema.

ZKOUŠKA: `npm --prefix apps/damage-calculator test` · `npm --prefix apps/damage-calculator run typecheck` · `node --test 'scripts/**/*.test.mjs'` · `npm run build 2>&1 | tail -2`.
COMMITY: `VC-11b: calculator honours explicit chop/pickaxe weaknesses [GM/flash]` (kód + testy), `VC-11b: re-scraped calculator data and parity fixtures [GM/flash]` (data).
NAKONEC: hashe · výpis změn v datech · výsledky testů · `git status --short`.
