# Orchestrace: jak se tady pracuje

Pavel chce, aby orchestrátor (Claude Opus/Fable v Claude Code) dělal **analýzu, zadání, přejímku, merge a push**. Kód píšou levní agenti **agy** (Gemini Flash přes Antigravity CLI) a **zai** (GLM přes Z.ai). Orchestrátor sám kód nepíše. Výjimkou jsou drobné opravy při přejímce (1–5 řádků), a ty musí být v commitu označené „(orchestrator fix)“.

## 1. Zadání

- Soubor `docs/zadani/VC-<n>.md`, česky, kód a commity anglicky.
- Šablona: hlavička se stromem a zákazy (viz kterékoli zadání), dál PROČ, PŘEČTI NEJDŘÍV, ROZSAH (výčet souborů), KROKY s commity, ZKOUŠKA, NAKONEC.
- Placeholdery `{{STROM}}` a `{{VETEV}}` se při spuštění nahradí `sed`em do scratchpadu.
- Zadání se **commituje a pushuje před spuštěním** agenta.
- Velké úlohy rozděl na kroky s commitem po každém (agy má tvrdý limit 45 min).
- Vlepuj ukázky dat a wikitextu, ať agent nemusí hledat.

## 2. Spuštění agenta

Launchery jsou v `~/gameroot/marchbound/scripts/` a spouští se odtamtud:

```sh
# worktree (jednou; GM pro agy, GL pro zai)
git worktree add ../valheim-units-GM -b prace/VC-<n> main
# nebo na existujícím worktree: git -C ../valheim-units-GM checkout -b prace/VC-<n> main

sed -e 's#{{STROM}}#/Users/paveldvorak/gameroot/valheim-units-GM#g' \
    -e 's#{{VETEV}}#prace/VC-<n>#g' docs/zadani/VC-<n>.md > $SCRATCH/VC-<n>.zadani.md

cd ~/gameroot/marchbound
# agy (Gemini Flash), na pozadí:
node scripts/pust-gm.mjs --zadani $SCRATCH/VC-<n>.zadani.md --strom /Users/paveldvorak/gameroot/valheim-units-GM --vystup $SCRATCH/gm-VC-<n>.json --znacka VC-<n>
# zai (GLM):
node scripts/pust-gl.mjs --zadani $SCRATCH/VC-<n>.zadani.md --strom /Users/paveldvorak/gameroot/valheim-units-GL --vystup $SCRATCH/gl-VC-<n>.json --znacka VC-<n> --minut 75
```

Kvóty: `node scripts/limit-agy.mjs --ted` a `node scripts/limit-zai.mjs --ted`.

### Pravidla a pasti (všechny se už staly)

- **Jen jeden agy/zai agent na Macu najednou, napříč všemi projekty** (hriva a marchbound je používají taky). Před spuštěním: `pgrep -lf "^agy |pust-gl.mjs"`.
- ⛔ **Nikdy nečekej ve smyčce přes `pgrep -f "agy -p"`**: vzor najde i samotnou smyčku a ta pak čeká navždy (stalo se 6. 10., ztráta celé noci). Na konec agenta čekej přes `run_in_background` přímo na launcheru. Pro čekání na čas používej `until [ "$(date +%H)" -ge 12 ]; do sleep 60; done`.
- **agy** má pevný `--print-timeout 45m`. Když narazí, commitnuté kroky zůstanou a necommitnutá práce je ve worktree a v `refs/zachrana/VC-<n>`. Rozpracované věci commitni jako WIP (`… (zai/agy, interrupted)`) a pusť navazující zadání s hlavičkou „🔁 NAVAZUJEŠ…“. `pust-gm` vyžaduje čistý strom.
- **zai** smí jen `git`, `node`, `npm run build`, `npx tsc`, `ls/cat/grep/sed -n/find/mkdir/echo`. ⛔ Nesmí `npm test`, `npm ci`, `npm run <jiné>` ani WebFetch.
  - Nástroje se proto volají přes node, např. `node apps/damage-calculator/node_modules/tsx/dist/cli.mjs …`, `node apps/damage-calculator/node_modules/typescript/bin/tsc --noEmit -p apps/damage-calculator`.
  - `npm ci` pro `apps/damage-calculator` a `apps/signs` udělá orchestrátor ve worktree předem.
- **zai** se nepouští Po–Pá 8:00–12:00 (špička Z.ai, launcher skončí s kódem 11). Pod 40 % pětihodinového okna jen malé úlohy, pod 10 % nic.
- Síť: agenti stahují z wiki jen přes `scripts/wiki/api.mjs` (cache `data/raw/`, 300 ms mezi požadavky, User-Agent). Druhý běh pipeline musí jet z cache a nic nezměnit.

## 3. Přejímka (po každé úloze)

1. `git log --oneline main..HEAD`, `git status --short`, `git diff --name-only main...HEAD`: rozsah sedí se zadáním?
2. Testy:
   - kořen: `node --test 'scripts/**/*.test.mjs'` (obsahuje test parity Bestiary ↔ kalkulačka)
   - `npm --prefix apps/damage-calculator test` + `run typecheck`
   - `npm --prefix apps/signs test` + `run typecheck`
3. Idempotence dat:
   ```sh
   node scripts/wiki/fetch-creatures.mjs && node scripts/wiki/fetch-weapons.mjs && node scripts/recommend.mjs && node scripts/build-data.mjs && node scripts/wiki/fetch-armor.mjs && node scripts/build-armourer-data.mjs
   ```
   Pusť 2× a potom `git status --short` musí být prázdné.
4. Kontroly dat přes `node -e` (konkrétní jednotky a zbraně).
   ⚠️ `rank.js` čte `globalThis.VC_DATA`, takže v Node nastav `globalThis.window = globalThis` a teprve pak `eval` souboru `data.js`.
5. Build a náhled:
   ```sh
   npm run build                    # postaví signs + kalkulačku a složí dist/
   node scripts/preview.mjs 8090 &  # servíruje dist/ se stejnou CSP jako nginx
   ```
6. **Prohlížeč:** skill `browser-test` (čistý headless Chrome přes CDP). Harness `cdp.mjs` zkopíruj ze `~/.claude/skills/browser-test/` do scratchpadu. Kontroluj:
   - konzoli (0 chyb, 0 failed requests)
   - `scrollWidth` na 360 px
   - klíčové interakce
   - screenshot
7. Merge:
   ```sh
   git merge --no-ff prace/VC-<n> -m "Merge VC-<n>: … [agent]"
   git push
   ```
   Push spustí deploy. Ověř živý web přes `curl` (status, `<title>`, konkrétní řetězec).
8. Ukliď worktree a větve (`git worktree remove`, `git branch -d prace/…`) a aktualizuj **`docs/STAV.md`**.

Konflikty mezi souběžnými větvemi (rozcestník, `build-site.mjs`, `Dockerfile`, `nginx.conf`, README) řeší orchestrátor tak, že zachová obě strany.

## 4. Struktura repa

```
apps/hub/               rozcestník (/) + og/ (šablony a PNG náhledy), icons/, support/kofi.png, site.webmanifest
apps/bestiary/          Bestiary (/bestiary/): index.html, assets/{app.js,rank.js,styles.css}, data/data.js, img/
apps/armourer/          Armourer (/armourer/): index.html, assets/, data/data.js, img/
apps/damage-calculator/ React+Vite (/damage-calculator/), scripts/{scrape.ts,verify-engine.ts,export-shared.ts}
apps/signs/             Runopis React+Vite (/signs/)
scripts/                pipeline z wiki (wiki/*.mjs), recommend.mjs, build-data.mjs, build-armourer-data.mjs,
                        build-site.mjs, preview.mjs, render-og.mjs, apply-meta.mjs, testy (*.test.mjs)
data/                   mezivýsledky (JSON), raw/ (cache API), overrides.json (ruční opravy), reporty
deploy/                 nginx.conf, security-headers.conf (CSP: jen 'self')
docs/                   ANALYZA, DATA-SCHEMA, STAV, ORCHESTRACE, NAVRHY-NASTROJU, zadani/
site.config.json        siteUrl pro meta tagy
```

**Zdroje pravdy:**
- pořadí biomů: `scripts/wiki/biomes.mjs` (test hlídá shodu s `apps/damage-calculator/src/data/biomes.ts`)
- poškození po kvalitách a časování útoků: kalkulačka → `data/weapon-quality.json` a `data/attack-profiles.json`
- ruční opravy dat: `data/overrides.json`

## 5. Užitečné

- Wiki API: `https://valheim.weirdgloop.org/api.php`. Stará `valheim.fandom.com` je zastaralá.
- Vykreslená stránka (časy útoků, brnění po kvalitách): `action=parse&prop=text`.
- Místní názvy: `action=parse&prop=langlinks`.
- Doména a meta: `site.config.json` → `node scripts/apply-meta.mjs` → commit. OG obrázky: `node scripts/render-og.mjs` (headless Chrome, malé ikony přes `sips`).
- Fable (rešerše a návrhy) se pouští přes nástroj Agent s `model: fable` a nepočítá se do limitu agy/zai.
