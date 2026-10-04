🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.

Úkol VC-1: stažení a parsování Valheim wiki (biomy, jednotky, obrázky).
Commituj jen do své větve {{VETEV}} a jen soubory z ROZSAHU, přidávej je výčtem (⛔ `git add -A`, ⛔ `git add .`).
⛔ push, merge, rebase ani checkout jiné větve, to dělá orchestrátor. Každý příkaz pouštěj zvlášť a synchronně.
Kód i komentáře piš ANGLICKY. Žádné npm balíčky: jen Node ≥ 22, vestavěný `fetch`, `node:fs`, `node:path`, `node:test`.

PŘEČTI NEJDŘÍV (jen tohle, celé):
- `docs/ANALYZA.md` § 1, § 2, § 4
- `docs/DATA-SCHEMA.md` (celé, závazné)

PROČ:
Statický web Valheim Companion ukazuje všechny jednotky po biomech. Ty připravuješ data, se kterými pak pracují další dvě úlohy. Musí být úplná, čistá (žádné wiki značky) a reprodukovatelná jedním příkazem.

ROZSAH (⛔ jiné soubory neupravuj):
- `scripts/wiki/api.mjs`: klient MediaWiki API s cache
- `scripts/wiki/wikitext.mjs`: parsování infoboxů a čištění textu (čisté funkce)
- `scripts/wiki/fetch-creatures.mjs`: hlavní skript této úlohy
- `scripts/wiki/wikitext.test.mjs`: testy `node --test`
- `data/raw/**`: cache odpovědí API (commituje se)
- `data/biomes.json`, `data/creatures.json`, `data/report.md`
- `img/creatures/**`, `img/biomes/**`
- `package.json` (jen `"type": "module"` a skripty `fetch:creatures` a `test`, bez závislostí)

KROK 1: API klient (`scripts/wiki/api.mjs`), commit
- Base `https://valheim.weirdgloop.org/api.php`, User-Agent `valheim-companion/1.0 (private fan project; github.com/pawlig)`.
- Vždy jen jeden požadavek najednou, mezi požadavky aspoň 300 ms. Při 429 nebo 5xx 3 pokusy s čekáním 2, 5 a 15 s.
- `getWikitext(titles[])`: dávky po 50 titulech přes `action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2`. Vrací mapu `požadovaný titul → { title, wikitext }` a respektuje přesměrování (`query.redirects`, `query.normalized`).
- `getCategory(name)`: `list=categorymembers&cmlimit=500`, pokračování přes `cmcontinue`.
- `getImageUrls(files[], width)`: `prop=imageinfo&iiprop=url&iiurlwidth=<width>`, po 50, vrací `thumburl`, jinak `url`.
- `download(url, path)`: stáhne binární soubor. Když existuje, nestahuje znovu.
- Cache: každá API odpověď se uloží do `data/raw/<sha1 dotazu>.json`. Při existující cache se síť nevolá. Přepínač `--refresh` cache ignoruje.
- Commit: `VC-1: wiki API client with cache [GL]`

KROK 2: parser (`scripts/wiki/wikitext.mjs`) a testy, commit
- `parseInfobox(wikitext, name)`: najde `{{infobox <name>` bez ohledu na velikost písmen a vrátí objekt `pole → hodnota`.
  Musí zvládnout vnořené `{{…}}` a `[[…|…]]` (počítej hloubku, nedělit podle `|` uvnitř nich), víceřádkové hodnoty a pole zapsaná na jednom řádku (`|stagger=30%|faction=Forest}}`).
- `cleanText(s)`: `[[A|B]]` → B, `[[A]]` → A, `'''`/`''` pryč, `<br>`/`<br/>` → `\n`, ostatní HTML tagy pryč, `&nbsp;` → mezera, `{{Item link|X}}` → X, ostatní šablony pryč.
- `parseLinks(s)`: seznam cílů `[[...]]`.
- `parseList(s)`: odrážky `*` / `**` → pole čistých řetězců. Hodnoty oddělené `<br>` taky.
- `parseAttacks(s)`: řádky `Name: 14 Slash, 10 Blunt` → `{ name, damage, raw }`. Vnořené `** Cleave:` dostane jméno rodiče (`Axe – Cleave`), nadpis `'''Phase 1'''` je předpona (`Phase 1 – Chain Slam`). Zápis `100 Frost (x22)` → 100.
- `parseHealth(s)`: `"40"` → 40, `"10000 + 7000 + 30000"` → 47000, jinak null.
- `parseModifiers(infobox)`: pole `veryweak`, `weak`, `slightlyweak`, `neutral`, `slightlyresistant`, `resistant`, `veryresistant`, `immune` (i s mezerami nebo podtržítky). Hodnoty dělí podle `,`, `<br>` a odrážek. Typ poškození → `modifiers`, ostatní → `otherImmunities`. Neznámá pole s „weak“ nebo „resist“ v názvu vrátí ve zvláštním poli, ať jdou do reportu.
- `parseImage(s)`: `Greydwarf.png` → `Greydwarf.png`, `{{InfoboxGallery|A.png|Phase 1\nB.png|…}}` → `A.png`, `[[File:X.png|…]]` → `X.png`.
- `slug(name)` podle DATA-SCHEMA.
- Testy v `scripts/wiki/wikitext.test.mjs` nad VLEPENÝMI ukázkami níže (Greydwarf, Eikthyr, Krigen, Kall Fimbulbringer). Aspoň 15 asercí.
- Zkouška: `node --test scripts/wiki/` projde.
- Commit: `VC-1: infobox and wikitext parser with tests [GL]`

KROK 3: stažení a sestavení dat (`scripts/wiki/fetch-creatures.mjs`), commit
1. Stránky biomů: Meadows, Black Forest, Swamp, Ocean, Mountain, Plains, Mistlands, Ashlands, Deep North. Z `{{infobox biome}}` přečti `passive`, `hostile`, `boss` (`parseLinks`) a `image`.
2. Kategorie: `Creatures`, `Bosses`, `Minibosses`, `Passive creatures`, `Fish`.
3. Množina jednotek = všechny odkazy z biomů ∪ `Category:Creatures`. Vynechej stránky bez `{{infobox creature}}`, každou zapiš do reportu.
4. Pro každou jednotku sestav záznam podle DATA-SCHEMA (`kind`, `biomes`, `stars`, `modifiers`…). Jednotku z kategorie, která v žádném biomu není, zkus přiřadit podle `location`: první odkaz, který je přímo biom. Jinak `biomes: []` a do reportu.
5. Spawny: `{{spawn row|type=…|limit=…|frequency=…}}` → `"<type> (limit N)"`. Popis = první odstavec textu po infoboxu, vyčištěný, max 400 znaků.
6. Obrázky: jednotky 0★/1★/2★ šířka 320 → `img/creatures/<id>-<star>.png`, trofej šířka 128 → `img/creatures/<id>-trophy.png`, biomy šířka 960 → `img/biomes/<id>.png`. Obrázek, který na nové wiki chybí, zkus jednou z `https://valheim.fandom.com/api.php` a zapiš to do reportu.
7. Na konci aplikuj `data/overrides.json`, pokud existuje (sekce `creatures` a `exclude.creatures`; ⛔ soubor nevytvářej ani needituj).
8. Zapiš `data/biomes.json`, `data/creatures.json` a `data/report.md`. Report obsahuje:
   - počty jednotek po biomech a podle `kind`
   - jednotky bez biomu
   - stránky bez infoboxu
   - neznámá pole modifikátorů
   - jednotky bez obrázku
   - útoky s prázdným `damage`
   - použité zálohy z fandomu
- `package.json`: `"fetch:creatures": "node scripts/wiki/fetch-creatures.mjs"`, `"test": "node --test scripts/"`.
- Zkouška: `node scripts/wiki/fetch-creatures.mjs 2>&1 | tail -30` doběhne. Druhý běh nesmí sáhnout na síť (všechno z cache) a nesmí změnit žádný soubor (ověř přes `git status --short` po commitu).
- Commit (data a obrázky zvlášť):
  - `git add scripts/ package.json` → `VC-1: creature and biome fetcher [GL]`
  - `git add data/ img/` → `VC-1: creature and biome data from valheim.weirdgloop.org [GL]`

HOTOVO, KDYŽ:
- `node --test scripts/` projde
- `data/creatures.json` má ≥ 110 jednotek a každý biom z ANALYZA § 2 má ≥ 3 jednotky
- Greydwarf: `hasStars` true, HP 40/80/120, `fire: veryweak`
- Eikthyr: `kind` boss, `hasStars` false
- Kall Fimbulbringer: `kind` boss, `health` 47000, biom `deep-north`
- Krigen: útoky mají jména typu `Axe – Cleave`
- `grep -c "\[\[\|{{\|'''" data/creatures.json` vrátí 0

ROZPOČET:
- Žádné další dokumenty nečti. Na wiki se dívej jen přes svůj skript, ⛔ WebFetch.
- Plný stahovací běh nejvýš 3×. Ladění parseru dělej nad cache.
- Ukecané výstupy ořezávej `| tail -30`.

KDYŽ COKOLIV NESEDÍ (API vrací něco jiného, schéma nejde dodržet): ⛔ nevymýšlej náhradu mimo rozsah. Zapiš to do `data/report.md` do sekce `## Open questions`, commitni, co máš, a skonči.

NAKONEC stručně: hashe commitů · počty jednotek po biomech · seznam „Open questions“ z reportu · `git status --short` (prázdné).

---
VLEPENÉ UKÁZKY WIKITEXTU (z valheim.weirdgloop.org, 5. 10. 2026, zkrácené) pro testy:

Greydwarf:
```
{{infobox creature
| title         = Greydwarf
| image 0star   = Greydwarf.png
| image 1star   = Greydwarf 1star.png
| image 2star   = Greydwarf 2star.png
| trophy        = Greydwarf trophy
| id            = Greydwarf
| location      = 
[[Black Forest]]
| drops         = 
[[Greydwarf eye]]<br/>[[Greydwarf trophy]]<br/>[[Resin]]<br/>[[Stone]]<br/>[[Wood]]
| health 0star  = 40
| damage 0star  = * Attack: 14 Slash
* Throw: 10 Blunt
| health 1star  = 80
| damage 1star  = * Attack: 21 Slash
* Throw: 15 Blunt
| health 2star  = 120
| damage 2star  = * Attack: 28 Slash
* Throw: 20 Blunt
| abilities     = * Attack (2s)
* Throw (8s)
| veryweak      = Fire
| weak          = 
| resistant     = Poison
| veryresistant = 
| immune        = Spirit
| neutral       = 
|stagger=30%|faction=Forest}}
```

Eikthyr:
```
{{infobox creature
| image 0star       = Eikthyr.png
| trophy            = Eikthyr trophy
| id                = Eikthyr
| type              = Boss
| summon            = [[Deer trophy]] x2
| behavior          = Aggressive
| tameable          = No
| location          = 
* [[Meadows]]
| health 0star      = 500
| damage 0star      = 
* Antler: 20 Pierce, 1000 Chop, 1000 Pickaxe
* Charge: 15 Lightning
* Stomp: 15 Lightning
| abilities         = 
* Antler (5s)
* Charge (25s)
* Stomp (40s)
| immune            = Stagger
| neutral           = Spirit
|faction=Boss}}
```

Krigen (výňatek):
```
{{Infobox creature
| title=Krigen
| image 0star = Krigen.png
| id= JotunWarrior (sword and greataxe)<br>JotunWarriorDualWield (dual-axe)
| faction       = Deep North
| location      = [[Mörkhalla]], [[Jotun Invasions]]
| health 0star  = 1300
| damage 0star  =
* Axe
** Cleave: 150 Slash, 60 Chop
** Slash: 170 Slash, 40 Chop
* Greataxe
** Charge: 160 Blunt, 80 Chop, 80 Pickaxe
| health 1star  = 2600
```

Kall Fimbulbringer (výňatek):
```
{{infobox creature
| title         =Kall Fimbulbringer
| image 0star   =
{{InfoboxGallery|Kall Fimbulbringer.png|Phase 1
Kall Fimbulbringer phase 2.png|Phase 2
Kall Fimbulbringer phase 3.png|Phase 3}}
| type          = Boss
| location      = [[Deep North]]
| summon        = [[Malicious Blood]] x3
| id            =FrozenKing<br>FrozenKing_p2<br>FrozenKing_p3
| health 0star  = 10000 +&nbsp;7000 +&nbsp;30000
| damage 0star  =
'''Phase 1'''
* Chain Slam (left and right, single and double): 160 Blunt, 300 Chop, 300 Pickaxe
'''Phase 2'''
* No attacks
'''Phase 3'''
* Spike Rain: 100 Blunt, 100 Frost (x22), 100 Chop, 100 Pickaxe
```
