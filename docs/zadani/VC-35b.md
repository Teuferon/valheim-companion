🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód ANGLICKY.
⚠️ Zásady Pavla (konec `docs/ANALYZA.md`): názvy z hry i názvy nástrojů zůstávají anglicky („Comfort Planner“ se nepřekládá), UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`).
🌍 Texty s číslem jdou přes `tn` (množná čísla, ANALYZA § 22, test `scripts/plural-rendering.test.mjs`, všechny CLDR tvary s `{count}`).
Kontrola mobilu: `node scripts/preview.mjs <port>` na pozadí, `node scripts/check-mobile.mjs <port>` (0 přetečení), pak preview ukonči.
Síť: wiki jen přes `scripts/wiki/api.mjs` (cache `data/raw/`). Druhý běh pipeline jede z cache a nic nezmění.


🔁 NAVAZUJEŠ na VC-35 ve stejném stromu a větvi. Hotové jsou kroky 1–3 (`5b153ed`, `62c6af6`, `d05eaf2`). Rozpracovaný krok 4 leží necommitnutý ve stromu, ⛔ nezahazuj ho. Zadání: `docs/zadani/VC-35.md`, závazné ANALYZA § 24.

ROZŠÍŘENÍ ROZSAHU (schválil orchestrátor):
- `scripts/search.test.mjs`: povol typ `comfort` a URL `/comfort/`. Ostatní aserce ponech.
- `scripts/build-armourer-data.mjs` a `scripts/build-provisions-data.mjs`: jen filtr, aby nové položky v `items.json` nezměnily bundly. Po přegenerování musí `git diff main -- apps/smithy/data/data.js` být prázdné. V `apps/provisions/data/` se smí změnit jen odkaz v tipu o Rested/comfort.

DOKONČI:
1. Krok 4 podle zadání a commit `VC-35: hub card, search, Provisions link, build and meta [CS/sol]`.
2. Celá ZKOUŠKA z VC-35: všechny testy zelené, pipeline 2× bez změny (comfort, Smithy, Provisions), `npm run build`, `ls dist/comfort`, check-mobile 0, chybějící překlady 0.
3. Nový soubor `data/raw/*.json` commitni s daty (cache). `apps/hub/og/comfort.png` patří do kroku 4.
NAKONEC: hashe · výsledky zkoušky · `git status --short` (musí být prázdný).
