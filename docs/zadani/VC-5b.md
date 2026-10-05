🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-5b: výchozí násobič útoku zezadu (backstab). Malý úkol.
Commituj jen do své větve {{VETEV}}, soubory výčtem. ⛔ push, merge, rebase. Testy pouštěj `node --test 'scripts/**/*.test.mjs'`. Kód ANGLICKY.

PROČ: wiki uvádí `backstab` jen u 49 ze 147 zbraní (43× „3x“, 3× „4x“, 3× „6x“, 3× „1x“). Ve hře má backstab skoro každá zbraň. S přepínačem „Sneak attack“ se teď posílí jen zbraně s vyplněnou hodnotou, takže pořadí doporučení je špatně.

ROZSAH: `apps/bestiary/assets/rank.js`, `scripts/recommend.test.mjs`, `data/recommendations.json`, `apps/bestiary/data/data.js` (přegenerovat).

ZMĚNA:
- `rank.js`: `DEFAULT_BACKSTAB = { knife: 6, magic: 1, bomb: 1 }` a ostatní kategorie 3.
- Funkce `backstabOf(weapon)` vrátí `weapon.backstab ?? DEFAULT_BACKSTAB[weapon.category] ?? 3`.
- U luku a kuše platí backstab launcheru, ne šípu.
- Výpočet `sneak` ji použije všude, kde dnes čte `weapon.backstab`.
- Do `notes` při zapnutém `sneak` přidej `"Sneak ×N"`, s hodnotou z dat nebo z výchozí.
- Testy:
  - Bronze Atgeir bez `backstab` v datech se `sneak` → ×3
  - nůž bez hodnoty → ×6
  - zbraň s `backstab: 4` → ×4
- Přegeneruj `node scripts/recommend.mjs` a `node scripts/build-data.mjs` (⛔ `npm run`).

ZKOUŠKA: testy projdou · `node --check apps/bestiary/assets/rank.js` · druhý běh přegenerování nic nezmění.
COMMIT: `VC-5b: default backstab multipliers by weapon category [GL]`
NAKONEC: hash · výstup testů · `git status --short`.
