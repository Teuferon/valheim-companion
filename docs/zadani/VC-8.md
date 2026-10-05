🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem nebo po adresářích z ROZSAHU (⛔ `git add -A`). ⛔ push, merge, rebase ani checkout jiné větve. Každý příkaz pouštěj zvlášť a synchronně, ⛔ nic na pozadí. Kód a komentáře ANGLICKY.
Testy: `node --test 'scripts/**/*.test.mjs'`.

Úkol VC-8: frontend sekce **Armourer** na `/armourer/` + karta v rozcestníku + zapojení do buildu a Dockeru. Data jsou hotová z VC-7 (`apps/armourer/data/data.js`).

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 10 a `docs/DATA-SCHEMA.md` § Armourer. Strukturu dat ověř přes `node -e "global.window={};require('./apps/armourer/data/data.js');…"` (⛔ catovat data.js). Vzhled a styl převezmi z `apps/bestiary/assets/styles.css` (tokeny `:root`, karty, čipy): `grep -n` a `sed -n` jen po úsecích.

ROZSAH (⛔ jiné soubory neupravuj):
- `apps/armourer/index.html`, `apps/armourer/assets/app.js`, `apps/armourer/assets/styles.css`, `apps/armourer/assets/favicon.svg`
- `apps/hub/index.html`, `apps/hub/styles.css` (nová karta)
- `scripts/build-site.mjs`, `Dockerfile`, `.dockerignore`, `deploy/nginx.conf` (jen pokud je potřeba), `README.md`

TECHNIKA: stejná pravidla jako u Bestiary:
- čisté HTML, CSS a vanilla JS, klasické skripty
- ⛔ `innerHTML` s daty, ⛔ inline handlery, ⛔ CDN
- `localStorage` jen v try/catch
- `<title>Armourer — Valheim Companion</title>`
- nahoře odkaz `← Valheim Companion` (`../`)

CO MÁ STRÁNKA UMĚT:
1. **Hlavička** „Armourer“ a podtitul „Every armor set, what it costs and where to find the materials.“
2. **Sety po biomech** (pořadí podle `order`):
   - Každý biom je sekce s kartami setů a samostatných kusů. Karta ukazuje obrázky dílů, název, celkové brnění na q1 a na max úrovni, set bonus jako čip a tlačítko „Add set“.
   - Kosmetika je v samostatné sbalené sekci „Cosmetics“ na konci.
   - **Spoilery:** biom, který není v `vc.openBiomes` (klíč sdílený s Bestiary), je zamčený: „🔒 Biome N — open it in the Bestiary or reveal here“. Tlačítko „Reveal“ biom přidá do `vc.openBiomes` a rozbalí ho.
   - Nahoře je přepínač „Show all (spoilers)“ (`va.showAll`).
3. **Detail setu** (rozbalení karty nebo modal, vyber, co bude přehlednější a funguje na mobilu):
   - **Tabulka dílů:** obrázek, slot, název, brnění pro q1–q4 (čtyři sloupce, zvýrazněný sloupec podle přepínače „Show level“), váha, rychlost pohybu a odolnosti.
   - **Ceny po úrovních:** pro každý díl a úroveň suroviny kroku, stanice a její potřebná úroveň.
   - **Set bonus:** název, počet dílů a efekty.
   - **Tlačítka:** „Add set“ a u každého dílu „Add piece“.
4. **Nákupní seznam (košík)**: panel na desktopu vpravo (sticky), na mobilu dole jako vysouvací lišta s počtem položek.
   - Položky: díl, ze kterého setu je, „Have“ (None, 1, 2, 3) a „Want“ (1–4). Want musí být větší než Have, UI jinou kombinaci nedovolí. Tlačítko pro odebrání.
   - Celý set přidaný najednou je skupina s hromadným „Have“/„Want“ pro celý set, jednotlivé díly jdou ale dál měnit.
   - **Suroviny celkem**: součet `levels[q].materials` pro q v (Have, Want]. Každá řádka má:
     - ikonu a název
     - počet
     - **kde se surovina bere**: čipy podle `sources`; u `creature` jméno a biom (zamčený biom bez jména jednotky: „a creature in Biome 7“)
     - u `fuel` štítek „fuel“
   - Přepínač **„Break down crafted materials“** rozloží suroviny s `recipe` rekurzivně až na základní (hloubka 3, pozor na cykly). U rozložené suroviny ukáže, na jaké stanici se vyrábí. Výsledek je jeden sečtený seznam základních surovin a pod ním seznam mezikroků („Smelt 60× Iron at Smelter“).
   - Shrnutí: brnění celkem při Want úrovních, váha celkem a vybraný set bonus, pokud je kompletní.
   - Tlačítka „Copy list“ (text do schránky: řádky „60× Iron“) a „Clear“.
   - Uložení do `va.cart`.
5. Patička jako v Bestiary (zdroj dat, licence, generatedAt).
6. Na mobilu 360 px bez horizontálního scrollu, tabulky scrollují ve wrapperu.

ROZCESTNÍK: v `apps/hub/index.html` nahraď kartu „More tools coming soon…“ kartou **Armourer** → `armourer/`. Text: „Every armor set by biome. Pick pieces and levels — get the full shopping list and where to farm it.“ Obrázek: pozadí ze `bestiary/img/biomes/mountain.png`. Tlumenou kartu „More tools coming soon…“ dej za ni.

BUILD A DOCKER:
- `scripts/build-site.mjs`: `apps/armourer/{index.html,assets,data/data.js,img}` → `dist/armourer/`
- `Dockerfile`: stejné COPY jako u Bestiary
- `.dockerignore`: whitelist
- `deploy/nginx.conf`: `/armourer` → 301 `/armourer/`, cache obrázků jako u Bestiary
- `README.md`: struktura

KROKY A COMMITY:
1. `VC-8: Armourer page shell, biomes and set cards [GM/flash]`
2. `VC-8: set detail with levels and costs [GM/flash]`
3. `VC-8: shopping list with breakdown and sources [GM/flash]`
4. `VC-8: hub card, build and Docker [GM/flash]`

ZKOUŠKA:
- `node --check apps/armourer/assets/app.js`
- `grep -n "innerHTML\|fetch(\|onclick=" apps/armourer/assets/app.js`: jen komentáře
- `npm run build 2>&1 | tail -3` a `ls dist/armourer`
- Kouřový test výpočtu v Node: vytáhni výpočet košíku do čisté funkce v `app.js` a zavolej ji přes `node -e` s `VA_DATA`. Iron Armor celý set Have None → Want 4: Iron 3×(20+5+10+20)=165 a Deer Hide 6.
Vizuální test udělá orchestrátor.

NAKONEC stručně: hashe · výstup kouřového testu · `git status --short`.
