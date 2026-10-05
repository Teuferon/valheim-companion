🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-3b: čtyři opravy webu po přejímce VC-3 (test v čistém Chromu). Kód je tvůj z VC-3.
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`).
⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně.

ROZSAH (⛔ jiné soubory neupravuj): `assets/app.js`, `assets/styles.css`, `index.html`.
ROZPOČET ČTENÍ: jen úseky, které měníš (`grep -n` a `sed -n od,dop`), ⛔ celé soubory necatuj.

OPRAVY:
1. **Spoilery přes Ctrl+F a čtečky.** Obsah zavřeného biomu je teď v DOM a prohlížeč v něm najde text. Oprav to takto:
   - Obsah biomu (sekce, karty, tabulka zbraní) se vyrenderuje až **při prvním otevření** daného biomu. Do té doby je wrapper prázdný.
   - Když biom zavřeš, wrapper dostane atribut `inert`. Při otevření se `inert` odebere.
   - Biomy otevřené z `localStorage` se vyrenderují hned při načtení.
   - Hledání a filtr dál pracují jen v otevřených (tedy vyrenderovaných) biomech.
   - ZKOUŠKA: při čerstvém načtení bez localStorage `document.querySelectorAll('.creature-card').length === 0`.
2. **Mobil (360 px): útoky přetékají kartu** (Kall Fimbulbringer, Krigen). Oprav:
   - `.attack-row` pod 520 px: jméno nahoře, čipy pod ním přes celou šířku s `flex-wrap: wrap`
   - všem flex/grid potomkům karty `min-width: 0`
   - dlouhá slova `overflow-wrap: anywhere`
   - `.creatures-grid` nesmí mít sloupec širší než kontejner (`minmax(min(100%, 320px), 1fr)`)
   - ⛔ neřeš to přes `overflow-x: hidden` na body nebo kartě (to chybu jen schová)
   - Tabulka zbraní biomu smí scrollovat vodorovně uvnitř svého wrapperu (`overflow-x: auto`), to je v pořádku.
3. **Poškození staveb nezahlcovat.** `chop` a `pickaxe` jsou poškození stromů, kamenů a staveb:
   - V **útocích** jednotky čipy `chop` a `pickaxe` vůbec nezobrazuj. Útok, kterému po odfiltrování nic nezbude, ukáže `raw`.
   - Ve **Weaknesses & resistances** ukazuj `chop` a `pickaxe` jen při násobiči > 0 (Stone Golem: Pickaxe ×2).
   - `spirit ×0` ukazuj jen tehdy, když je spirit výslovně v `creature.modifiers`. Výchozí nulu z `recommendations[...].modifiers` neukazuj.
   - Stejné filtrování platí pro `notes` u doporučených zbraní: `×0 Chop` a `×0 Pickaxe` se nezobrazují.
4. **Ikona zbraně bez obrázku**: placeholder s iniciálou nesmí vypadat jako ikona. Použij tlumený kruh s první písmenem v barvě `--text-muted`.

ZKOUŠKA:
- `node --check assets/app.js`
- `grep -n "innerHTML\|fetch(\|type=\"module\"\|onclick=" index.html assets/app.js`: žádný výskyt kromě komentářů
- Vizuálně ověří orchestrátor.

COMMITY:
- `VC-3b: render biomes on first open, inert when collapsed [GM/flash]`
- `VC-3b: mobile overflow fixes [GM/flash]`
- `VC-3b: hide structure damage, icon placeholder [GM/flash]`

NAKONEC stručně: hashe · co je hotové z bodů 1–4 · `git status --short` (prázdné).
