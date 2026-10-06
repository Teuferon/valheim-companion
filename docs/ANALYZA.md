# Valheim Companion — analýza

Statický web, který ukazuje všechny jednotky Valheimu (bossy, minibossy, nepřátele, pasivní zvířata, ryby) rozdělené po biomech.
Každý biom je **zavřený** (ochrana proti spoilerům), po kliknutí se rozbalí.
U každé jednotky jsou obrázky, staty po hvězdičkách, slabiny/resisty a **doporučené zbraně a munice**, které se dají mít nejpozději v tom biomu.

- Repo: `pawlig/valheim-companion` (public). Web: https://valheim-companion.teuferon.click (EasyPanel, Docker, deploy webhookem při pushi).
- Jazyk webu: **vše anglicky**. Dokumentace a zadání pro agenty česky.
- Stav hry: Valheim 1.0 včetně **Deep North**.

## 1. Zdroj dat

**Primární: nová oficiální wiki <https://valheim.weirdgloop.org>** (MediaWiki API `https://valheim.weirdgloop.org/api.php`).
⛔ Stará `valheim.fandom.com` je zastaralá (Deep North tam chybí). Smí se použít jen jako záloha pro obrázek, který na nové wiki chybí, a takový případ se zapíše do reportu.

Ověřeno 5. 10. 2026:

| Co | Jak se to získá |
|---|---|
| Přiřazení jednotek k biomům | `{{infobox biome}}` na stránkách biomů, pole `passive`, `hostile`, `boss` (odkazy `[[...]]`). Je to **zdroj pravdy**. |
| Staty jednotky | `{{infobox creature}}`: `health 0star/1star/2star`, `damage 0star/1star/2star`, `abilities`, `veryweak`, `weak`, `resistant`, `veryresistant`, `immune`, `neutral`, `stagger`, `faction`, `tameable`, `behavior`, `type`, `location`, `drops`, `summon`, `trophy`, `id`, `image 0star/1star/2star` |
| Zbraně | `{{infobox weapon}}`: `type`, `source`, `crafting level`, damage pole (`slash`, `blunt`, `pierce`, `fire`, `frost`, `lightning`, `poison`, `spirit`, `chop`, `pickaxe`), `<typ> per level`, `materials 1..N` (N = max kvalita), `stamina`, `knockback`, `backstab`, `block armor` |
| Obrázky | `action=query&prop=imageinfo&iiprop=url&iiurlwidth=<px>&titles=File:...` vrací rovnou zmenšený náhled (`thumburl`) |
| Kategorie | `Category:Creatures` (97), `Bosses` (10), `Minibosses` (4), `Passive creatures`, `Fish`, `Weapons` (223), `Arrows` (14), `Bolts` (6) |

Obsah biomů podle infoboxů (5. 10. 2026):

| Biom | Pasivní | Nepřátelé | Boss / miniboss |
|---|---|---|---|
| Meadows | Deer, Gull, Perch, Pike | Boar, Greyling, Neck | Eikthyr |
| Black Forest | Crow, Deer, Gull, Perch, Pike, Trollfish | Bear, Ghost, Greydwarf, Greydwarf Brute, Greydwarf Shaman, Rancid Remains, Skeleton, Troll | The Elder, *Brenna* |
| Swamp | Giant Herring | Blob, Oozer, Draugr, Draugr Elite, Leech, Skeleton, Surtling, Wraith, Writhan, Abomination | Bonemass |
| Ocean | Leviathan, Tuna, Coral Cod, Pufferfish, Gull | Serpent | — |
| Mountain | Tetra | Wolf, Drake, Stone Golem, Fenring, Draugr, Skeleton, Bat, Ulv, Cultist | Moder, *Geirrhafa* |
| Plains | Gull, Grouper | Deathsquito, Fuling, Fuling Berserker, Fuling Shaman, Growth, Lox, Vile | Yagluth, *Zil & Thungr* |
| Mistlands | Hare, Anglerfish, Pufferfish, Dvergr Rogue, Dvergr Mage | Tick, Seeker, Seeker Soldier, Gjall | The Queen |
| Ashlands | Ash Crow, Ashlands Dvergr, Magmafish | Asksvin, Bonemaw Serpent, Charred ×4, Fallen Valkyrie, Lava Blob, Morgen, Volture, Skugg | Fader, *Lord Reto* |
| Deep North | Seal, Northern Salmon, Shadow | Greydwarf (DN), Greydwarf Shaman (DN), Skeleton, Moose, Barka, Elaking, Eyeless One, Fallen Warrior, Gammeltroll, Hexen, Krigen, Captive Fuling, Imprisoned Dvergr, Hexahedric/Shapeless/Tiny Pulp | Kall Fimbulbringer |

V `Category:Creatures` jsou i jednotky, které v žádném biomu nejsou (např. Frost Blob, Seeker Brood, Kvastur, Frysling, Ulf, Astrid, Gudrun, Harald). Ty se přiřadí přes `location`, nebo skončí v reportu a rozhodne orchestrátor (`data/overrides.json`).

Pozor na formáty infoboxů, liší se stránka od stránky:
- `{{infobox creature}}` i `{{Infobox creature}}`, pole s mezerami i bez nich, hodnoty přes víc řádků.
- `health 0star = 10000 + 7000 + 30000` (fáze bosse), `image 0star = {{InfoboxGallery|A.png|Phase 1\nB.png|Phase 2}}`.
- `damage` jako vnořený seznam (`* Axe` → `** Cleave: 150 Slash, 60 Chop`) nebo s nadpisy fází (`'''Phase 1'''`).
- Stejná stránka může mít více `id` oddělených `<br>`.

## 2. Biomy, pořadí a tier výbavy

| order | id | name | gearTier |
|---|---|---|---|
| 1 | `meadows` | Meadows | 1 |
| 2 | `black-forest` | Black Forest | 2 |
| 3 | `swamp` | Swamp | 3 |
| 4 | `ocean` | Ocean | 3 |
| 5 | `mountain` | Mountain | 4 |
| 6 | `plains` | Plains | 5 |
| 7 | `mistlands` | Mistlands | 6 |
| 8 | `ashlands` | Ashlands | 7 |
| 9 | `deep-north` | Deep North | 8 |

`gearTier` = nejvyšší tier zbraní, které se v tom biomu smí doporučit (spoilery). Oceán je za Swampem, protože na Serpenta se chodí s výbavou ze Swampu. Bonemaw Serpent patří do Ashlands, ne do Oceánu.

Jednotka, která je ve víc biomech (Skeleton, Draugr, Deer, Gull…), se ukáže **v každém** z nich. Doporučení se počítá **pro každý pár (biom, jednotka)** zvlášť, podle `gearTier` toho biomu.

## 3. Tier zbraní

Tier zbraně = nejvyšší tier ze všech jejích materiálů (`materials 1`). `biome` zbraně = biom toho materiálu.
Výchozí tabulka materiálů (zbytek dohledá agent z wiki a zapíše do `data/materials.json`):

| tier | biom | materiály |
|---|---|---|
| 1 | meadows | Wood, Stone, Flint, Leather Scraps, Deer Hide, Resin, Feathers, Hard Antler, Raspberries, Honey |
| 2 | black-forest | Copper, Tin, Bronze, Bronze Nails, Core Wood, Fine Wood, Bone Fragments, Troll Hide, Greydwarf Eye, Surtling Core, Ancient Seed |
| 3 | swamp | Iron, Iron Nails, Ancient Bark, Elder Bark, Guck, Ooze, Entrails, Bloodbag, Wishbone, Root, Withered Bone |
| 3 | ocean | Chitin, Serpent Scale, Serpent Meat |
| 4 | mountain | Silver, Obsidian, Wolf Fang, Wolf Pelt, Wolf Claw, Freeze Gland, Dragon Tear, Crystal, Fenris Hair, Fenris Claw, Ymir Flesh?, Drake Trophy |
| 5 | plains | Black Metal, Linen Thread, Flax, Needle, Lox Pelt, Barley, Tar, Torn Spirit, Yagluth Thing |
| 6 | mistlands | Carapace, Eitr, Refined Eitr, Black Core, Yggdrasil Wood, Mandible, Bilebag, Black Marble, Jade, Sap, Royal Jelly, Iolite, Dvergr Extractor, Scale Hide, Feasting? |
| 7 | ashlands | Flametal, Flametal Ore, Charred Bone, Grausten, Ashwood, Asksvin Hide, Morgen Sinew, Morgen Heart, Bonemaw Tooth, Celestial Feather, Proustite, Sulfur Stone, Molten Core, Fader Drop, Charred Cogwheel, Bell Fragment, Ceramic Plate |
| 8 | deep-north | Frostcore, Timberwood, Moose Hide, Moose Sinew, Petrified Tissue, Luminous Larva, Ice + vše, co wiki u materiálu vede v Deep North |

Položky s `?` agent ověří na wiki: Ymir Flesh se kupuje u Haldora, tier podle reálného výskytu. Materiál, který z wiki nejde jednoznačně určit, dostane `biome: null` a jde do reportu.

## 4. Násobiče poškození

Podle wiki stránky *Damage*: Very Weak ×2, Weak ×1.5, Neutral ×1, Resistant ×0.5, Very Resistant ×0.25, Immune ×0.
Pokud se na nové wiki objeví i stupně „Slightly weak/resistant“, použijí se ×1.25 a ×0.75. Neznámé pole infoboxu se zapíše do reportu.

Výchozí hodnoty pro typ, který infobox neuvádí:
- `blunt`, `slash`, `pierce`, `fire`, `frost`, `lightning`, `poison`: **×1**
- `spirit`: **×0**, pokud není uveden (spirit bere jen nemrtvým, wiki ho uvádí výslovně)
- `chop`, `pickaxe`: **×0**, pokud není uveden (výjimky typu Stone Golem wiki uvádí)

Hodnoty v `immune` / `veryresistant` …, které nejsou typ poškození (`Stagger`, `Knockback`, `Freezing`…), jdou do `otherImmunities`.

## 5. Doporučení zbraní (deterministický výpočet, žádné LLM)

Pro každý pár (biom B, jednotka C):

1. **Kandidáti** = zbraně s `tier ≤ gearTier(B)` a `tier != null`.
   Vynechané: štíty, missiles/payloady (katapult), cheat zbraně, torch, lucerny, snowball, snow shovel, magie bez přímého poškození (Dead Raiser, Spirit Caller, Voidcaller, Staff of Protection, Staff of the Wild…) a cokoliv se součtem poškození 0.
   Krumpáče jen tehdy, když má C `pickaxe` násobič > 0.
2. **Poškození zbraně** = poškození na **max kvalitě**: `base + perLevel × (maxQuality − 1)`, `maxQuality` = počet polí `materials N`.
3. **Skóre** = Σ přes typy `dmg[typ] × násobič(C, typ)`. DoT (fire, poison) se počítá nominální hodnotou, je to zjednodušení a web ho uvádí v legendě.
4. **Luk + šíp**: skóre = `(bowPierce + arrowPierce) × mod(pierce) + Σ elementy šípu × mod`. Vezme se nejlepší luk ≤ tier a nejlepší šíp ≤ tier; doporučí se top 3 šípy s tím lukem. Stejně kuše + šipky (top 2).
5. **Výstup na pár**:
   - `melee`: top 3, každý z jiné kategorie (sword / axe / club / spear / polearm / knife / battleaxe / sledge / fists / pickaxe)
   - `bow` + `arrows[3]`, `crossbow` + `bolts[2]` (když existují)
   - `magic`: top 1 hůl (když existuje)
   - `bomb`: top 1 (když existuje)
   - `avoid`: typy s násobičem ≤ 0.5, které nějaký kandidát skutečně má
   - `tip`: jedna věta ze šablony, např. `Very weak to Fire (×2): Fire Arrows hit for 66 effective.`

Bossové a minibossové se počítají stejně. Pasivní zvířata a ryby se počítají taky, web u nich ale ukáže jen střelnou zbraň.

## 6. Web (frontend)

- Čistě statický: `index.html` + `assets/app.js` + `assets/styles.css` + `data/data.js` + `img/`. **Bez build kroku, bez frameworku, bez CDN.**
- Data se načítají přes `<script src="data/data.js">` (`window.VC_DATA = …`), protože `fetch()` ani ES moduly na `file://` nefungují.
- Biomy jsou akordeon, výchozí stav **zavřeno**. Hlavička biomu ukazuje jen název, obrázek biomu a počet jednotek, ne jména.
  Otevřené biomy si web pamatuje v `localStorage` (v try/catch). Tlačítka „Collapse all“ a „Reset spoiler progress“.
- V otevřeném biomu: Boss → Miniboss → Hostile → Passive → Fish (ryby jako kompaktní dlaždice) a nakonec sbalitelná sekce „Weapons & ammo from this biome“.
- Karta jednotky:
  - obrázek; přepínač 0★/1★/2★ jen u jednotek, které hvězdičky mají (mění obrázek, HP i poškození)
  - název, štítky (Boss, Miniboss, Passive, Tameable, Weak points)
  - HP, útoky s poškozením
  - čipy slabin a resistů s barvou podle stupně a násobičem
  - doporučení: ikona + název + efektivní poškození + důvod (např. „×2 Fire“)
  - „Details“ (rozbalovací): schopnosti a cooldowny, dropy, trofej, frakce, stagger, chování, kde a kdy se spawnuje, `id`, odkaz na wiki
  - „Also found in“ ukazuje **jen dřívější biomy**, aby se nic nespoilovalo
- Hledání a filtr jen uvnitř otevřených biomů.
- Patička: zdroj dat a licence (CC BY-SA, Valheim Wiki na weirdgloop.org) a datum stažení dat.
- Vzhled: tmavé seveřanské téma, čitelné na mobilu (šířka 360 px) i na desktopu, `prefers-color-scheme` stačí jen tmavý.

## 7. Rozdělení práce

| ID | Kdo | Co | Výstup |
|---|---|---|---|
| VC-1 | GL (zai / GLM) | stažení a parsování wiki: biomy, jednotky, obrázky | `scripts/wiki/*.mjs`, `data/raw/`, `data/biomes.json`, `data/creatures.json`, `img/creatures/`, `img/biomes/`, `data/report.md` |
| VC-2 | GM (agy / Flash), původně GL — došla kvóta Z.ai | zbraně, materiály, výpočet doporučení, balík dat | `data/weapons.json`, `data/materials.json`, `data/recommendations.json`, `data/data.js`, `img/weapons/` |
| VC-3 | GM (agy / Flash) | web nad hotovými daty | `index.html`, `assets/app.js`, `assets/styles.css` |
| — | orchestrátor (Opus) | zadání, přejímka, `data/overrides.json`, test v prohlížeči, merge, push | |

Úlohy jdou **za sebou** (na Macu smí běžet jen jeden GM/GL). VC-3 potřebuje hotové `data/data.js` z VC-2.
Schéma dat, které sdílí všechny tři úlohy, je v `docs/DATA-SCHEMA.md`.

## 8. Rozcestník a sekce (od 5. 10. 2026)

Valheim Companion je rozcestník a nástroje jsou pod ním jako sekce:

| URL | Sekce | Zdroj v repu |
|---|---|---|
| `/` | rozcestník (anglicky) | `apps/hub/` |
| `/bestiary/` | **Bestiary**: jednotky, slabiny, doporučené zbraně | `apps/bestiary/` (statický web) + `scripts/` + `data/` |
| `/damage-calculator/` | **Damage Calculator**: poškození zbraní proti jednotkám, resisty, DPS a čas na zabití | `apps/damage-calculator/` (React 19 + Vite, převzato z `Teuferon/valheim-weapon-boss-damage`) |
| `/signs/` | **Sign Editor (Runopis)**: editor cedulí, 13 jazyků | `apps/signs/` (React 19 + Vite, převzato z `pawlig/valheim-signs` přes `git subtree` i s historií) |

- Další nástroje přibydou jako `apps/<nazev>/` a `/<nazev>/` a dostanou kartu v rozcestníku.
- Každá sekce má nahoře odkaz zpět na rozcestník („Valheim Companion“).
- Runopis se staví s `base: '/signs/'`. Varianta pro Cloudflare / vinext / OpenAI Sites se ruší, zůstává jen statický Vite build.
- Docker: v první fázi Node postaví Runopis, nginx pak servíruje `apps/hub` → `/`, `apps/bestiary` → `/bestiary/` a build Runopisu → `/signs/`.
  Lokálně: `npm run build` složí stejné rozložení do `dist/` a `npm run preview` ho servíruje i s CSP.
- Stará appka `valheim-signs.teuferon.click` se vypne a repo `pawlig/valheim-signs` se smaže (rozhodnutí Pavla). Obojí udělá orchestrátor nebo Pavel až po ověření nové verze.

## 9. Postava hráče: skilly a další faktory (VC-5)

Ověřeno na wiki 5. 10. 2026 (*Damage mechanics*, *Skills*, *World Modifiers*, *Creature level*, *Status effects*).

**Vzorec poškození:** `damage = listed × skillFactor × multipliers × difficulty`.
- `skillFactor` je náhodný v rozsahu `min = 0.25 + 0.006·L`, `max = min(0.55 + 0.006·L, 1.0)`, kde L = skill 0–100.
  Průměr: 0.40 na L0, 0.85 na L75, 0.925 na L100. Web počítá s průměrem a rozsah ukazuje v tooltipu.
- Luk a šíp: `(luk + šíp) × skillFactor(Bows)`. Kuše a šipka: skill Crossbows.
- Skill podle kategorie zbraně:
  - sword → Swords
  - axe, battleaxe → Axes
  - club, sledge → Clubs
  - spear → Spears
  - polearm → Polearms
  - knife → Knives
  - fists → Fists
  - pickaxe → Pickaxes
  - bow, arrow → Bows
  - crossbow, bolt → Crossbows
  - magic → Elemental magic, nebo Blood magic, když to říká `type` v infoboxu
  - bomb → bez skillu (faktor 1)
- **Obtížnost světa** (World modifier *Combat*), poškození hráče: Very easy 125 %, Easy 110 %, Normal 100 %, Hard 85 %, Very hard 70 %.
- **Víc hráčů:** každý další hráč do 100 m přidá nepříteli +30 % efektivního HP, maximálně 5 hráčů (tedy +120 %).
- **Hvězdy:** +100 % HP a +50 % poškození za úroveň. HP už jsou v datech po hvězdách.
- **Situační násobiče:**
  - stagger (po parry nebo nahromaděném staggeru) ×2
  - backstab na nic netušícího nepřítele: násobič zbraně z infoboxu (`backstab`, 2×–6×)
  - třetí úder komba ×2 a sekundární útoky 0.5×–3× web nepočítá; skóre je **za úder primárním útokem**, ne DPS
  - zásah víc cílů najednou dává penalizaci, web ji nepočítá
- **Bonusy ze setů** (přičítají se ke skillu, strop 100):
  - Root set: Bows +15
  - Lox fur set: Bows +15
  - Fenris set: Fists +15
- **Bonusy ze setů k poškození:**
  - Bear set (Berserk): +10 % Slash a Chop
  - Vanguard set: +10 % Pierce
- Nezapočítává se (zmínit v legendě):
  - dočasný buff od Dvergr Mage (+20 %)
  - Thunderblood / Bloodgold bonus za chybějící HP
  - otrava a hoření jako DoT (počítají se nominální hodnotou)
  - zbroj nepřítele (nepřátelé zbroj nemají)

## 10. Armourer (VC-7, VC-8)

Nová sekce `/armourer/` (`apps/armourer/`, statický web jako Bestiary). Ukazuje přehled všech brnění, kolik surovin stojí výroba a vylepšení na zvolenou úroveň a kde se ty suroviny berou.

**Zdroj (ověřeno 5. 10. 2026):**
- `Category:Armor` (81 stránek, podkategorie `Head`, `Body`, `Legs`, `Capes`). Set je jedna stránka (`Iron Armor`, `Troll Set`, `Protector Armor`…) a v ní je `{{InfoboxTabber}}` s blokem `{{infobox armor}}` pro každý díl. Tabbery můžou být vnořené (`Protector Armor`). Samostatné pláště a čepice mají vlastní stránku s jedním blokem.
- Pole `{{infobox armor}}`:
  - `title`, `image`, `id`, `type` (Head/Chest/Legs/Cape/Body)
  - `source` (stanice), `crafting level`, `repair level`
  - `armor`, `durability`, `weight`
  - `movement speed`, `resistance`
  - `set pieces` („Troll Set (4 pieces)“) a `set effect` (název efektu + odrážky)
  - `materials 1..4`: cena výroby (1) a cena každého vylepšení (2–4)
- Zápis materiálů se liší: `* 20 [[Iron]]` i `* [[Bronze]] x2`, někdy s poznámkou `(Fuel)`.
- Brnění na vyšších úrovních: infobox ho nemá. Je v tabulkách `=== Quality N ===` na stránce setu (první číslo v řádku dílu, „Durability per piece: N“ v hlavičce). Když tabulka chybí, `armor per level` = 2 a v reportu se to označí jako odhad.
- **Suroviny** (`{{infobox item}}` na stránce suroviny):
  - `source`: odkud se bere (jednotky, stanice, místa), např. `[[Boar]], [[Bat]], [[Muddy Scrap Pile]]s`
  - `materials`: recept, když se vyrábí (Bronze = 2× Copper + 1× Tin na Forge/Smelter, Iron = Scrap Iron na Smelter, Linen Thread = Flax na Spinning Wheel)
- Kosmetika od Hildir (`source = [[Hildir]]`, bez receptu) a testovací stránky (`CAPE TEST`) se vyřadí, nebo se ukážou jako „Cosmetic“ bez nákupního seznamu. Rozhodne report.

**Funkce:**
- Sety seskupené po biomech podle tieru (stejné pravidlo jako u zbraní: max tier surovin z `materials 1`).
- Spoilery: biomy, které hráč v Bestiary ještě neotevřel (`vc.openBiomes`, stejný origin), jsou zamčené a jde je odemknout.
- Detail setu:
  - díly s brněním na úrovni 1–4, váha, rychlost pohybu, odolnosti, set bonus
  - stanice a její potřebná úroveň pro výrobu a pro každé vylepšení
- **Nákupní seznam (košík):**
  - Přidá se celý set nebo jednotlivé díly a jde to kombinovat napříč sety.
  - U každé položky se nastaví „mám úroveň“ (žádná / 1–3) a „chci úroveň“ (1–4). Platí to i hromadně pro celý set.
  - Suroviny se sečtou: ikona, název, počet, kde se berou (a biom jednotky, pokud je zdrojem jednotka z Bestiary).
  - Přepínač „Break down crafted materials“ rozloží vyráběné suroviny až na základní (hloubka 3) a ukáže, na jaké stanici se vyrábí.
  - Košík se ukládá v `localStorage` (`va.cart`).

## 11. Sdílení na sítích (VC-9)

- Na každé stránce (rozcestník, Bestiary, Sign Editor, Armourer):
  - `<title>`, `description`, `canonical`
  - Open Graph: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (+ `width`, `height`, `alt`)
  - Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
  - `theme-color`, `apple-touch-icon` (PNG 180×180) a `site.webmanifest`
- Obrázky 1200×630 PNG: jedna šablona (`apps/hub/og/card.html`) s logem (runový štít), nadpisem fontem Norse a pozadím biomu. Pro každou sekci vlastní varianta. Renderuje se headless Chromem skriptem `scripts/render-og.mjs` a výsledné PNG se commitují.
- Web běží na **https://valheim-companion.teuferon.click** (EasyPanel, deploy webhookem při každém pushi). Absolutní adresa webu je v jednom místě, `site.config.json` → `{ "siteUrl": "https://…" }`. Meta tagy se do HTML vkládají skriptem `scripts/apply-meta.mjs` (idempotentně, mezi komentáře `<!-- meta:start -->` a `<!-- meta:end -->`), aby šla doména změnit na jednom místě.

## 12. Rychlost útoku a DPS (VC-10)

Ověřeno 6. 10. 2026. Infobox zbraně rychlost útoku nemá. Je ve **vykreslené stránce** (`action=parse&prop=text`), kterou dopočítává šablona podle typu zbraně. Bloky:
- `Primary attack | <typ> | <dmg> … | Backstab | 3x | … | Stamina | 16 | … | Attack speed | 2.46 s (0.86 + 0.70 + 0.90) | Chain last hit | 2x damage, +20% knockback | Hitbox | …, no multitarget penalty`
- `Secondary attack | <typ> | <dmg (už vynásobené)> | … | Stamina | 32 | … | Attack speed | 1.84 s`
- Luk: `Stamina | 8 / s | … | Attack speed | 0.8 s + 2.5 s draw time`
- Kuše (`Arbalest`) ani hole čas útoku nemají.

**Model:**
- Primární útok: komba se počítají jako n úderů s časem T (součet segmentů). Poslední úder ×`chainLast` (2). Poškození komba = `perHit × (n − 1 + chainLast)` a `DPS = to / T`. Útok bez komba (sledge: `1.7 s`) má n = 1.
- Sekundární útok: `secMult = sekundární dmg / primární dmg` (na q1, součet typů). `DPS = perHit × secMult / Tsec`.
- Luk: `T = shot + draw × (1 − 0.8 × L/100)` (skill Bows až −80 % natažení). `DPS = perHit / T`.
- Kuše: jen pokud se najde čas přebití (stránka *Crossbows*), `T = shot + reload × (1 − 0.5 × L/100)`. Jinak DPS `null` a řadí se podle poškození za zásah.
- Stamina za sekundu: `stamina × n / T × (1 − 0.33 × L/100)`, u luku `X / s` × stejný koeficient.
- Backstab: hodnota z vykreslené stránky má přednost před infoboxem i výchozí hodnotou.
- Řazení: nové nastavení hráče `rankBy: 'dps' | 'hit'`, výchozí `'dps'`. Každá zbraň má lepší z primárního a sekundárního DPS (`bestMode`). Zbraň bez DPS se při `'dps'` řadí na konec své skupiny.

## 13. Damage Calculator a jednotná čísla (PR #1, VC-11)

- 6. 10. 2026 je mergnutý PR #1 od Teuferona: `apps/damage-calculator/` (React + Vite) na `/damage-calculator/`. Data bere ze stejné wiki (valheim.weirdgloop.org, staženo 5. 10.) vlastním scraperem `apps/damage-calculator/scripts/scrape.ts`. Testy enginu jsou v `npm test` (156 kontrol).
- **Porovnání s Bestiary** (orchestrátor, 6. 10.):
  - Vzorec skillu je stejný (0.25–0.55 + 0.006·L).
  - Odolnosti a HP 78 společných jednotek se shodují. Rozdíl je jen u Chop a Pickaxe: kalkulačka je proti jednotkám ignoruje, Bestiary počítá slabiny z wiki (Stone Golem Pickaxe ×2, Gammeltroll, Kvastur).
  - **Chyba v Bestiary:** poškození na úrovních 2–4 se bralo jen z polí `<typ> per level` v infoboxu a ta u mnoha zbraní chybí. Kalkulačka bere tabulku „Upgrade information“ (Battleaxe 70/76/82/88, Bestiary 70). Bestiary tak u 216 hodnot podhodnocuje vyšší kvalitu.
  - Backstab: kalkulačka ho dává jen na první úder (pak má nepřítel na 5 minut imunitu), Bestiary na všechny. Správně je model kalkulačky.
  - Rychlosti útoku: kalkulačka má kurátorované profily (`src/data/attack-profiles.ts`) z tabulek typů zbraní na wiki a herního modelu MaxDPS, s označenou spolehlivostí. Původně plánované VC-10 (parsování vykreslených stránek) se **ruší**. Bestiary převezme profily kalkulačky, aby oba nástroje dávaly stejná čísla.
- **Jeden zdroj pravdy:** časování útoků a poškození po kvalitách se exportují z kalkulačky do `data/attack-profiles.json` a `data/weapon-quality.json`. Bestiary je čte a test parity hlídá, že `rank.js` a engine kalkulačky dávají stejná čísla.

## 14. Jednotné pořadí biomů (VC-12, 6. 10. 2026)

- Podle wiki (*Biomes*: Early game = Meadows, Black Forest, Ocean; Mid game od Swampu) a stejně jako v Damage Calculatoru:
  **1 Meadows · 2 Black Forest · 3 Ocean · 4 Swamp · 5 Mountain · 6 Plains · 7 Mistlands · 8 Ashlands · 9 Deep North.**
- `tier` = `order`. Rozlišení na `gearTier` se ruší a pro biom platí jedno číslo. Tier materiálu, zbraně i brnění je pořadí biomu, ze kterého pochází.
- Jediný zdroj pořadí v Bestiary a Armouru je `scripts/wiki/biomes.mjs`. Test hlídá, že pořadí sedí s `apps/damage-calculator/src/data/biomes.ts`.
- Důsledek: v Oceánu (Serpent) se doporučuje jen výbava do Oceánu (Black Forest + Chitin), ne železo ze Swampu. Stejně to dělá kalkulačka.
- § 2 výše (původní tabulka s Oceánem za Swampem) tímto neplatí.

## 15. Jazyky v celém Companionu (VC-16 až VC-19, 6. 10. 2026)

- **Princip převzatý z Runopisu** (`apps/signs/lib/i18n.ts`, `hooks/use-language.ts`):
  - 13 jazyků: en, cs, de, es, fr, pt, zh, hi, ar, bn, ru, ja, id
  - volba „auto“ podle `navigator.languages` (základ kódu, fallback en)
  - katalog zpráv `messages.json` = `{ "<anglický text>": { "<locale>": "<překlad>" } }`, chybějící překlad → angličtina, placeholdery `{name}`
  - arabština `dir="rtl"`
- **Jedna volba pro všechny sekce:** sdílený klíč `localStorage` **`vc.language`** (hodnota kód jazyka nebo `auto`). Při prvním čtení se převezme stará hodnota `runopis.language`. Změna v jedné záložce se projeví v ostatních (událost `storage`).
- **Sdílený kód:** `shared/i18n/`
  - `languages.json`: seznam jazyků
  - `core.js`: klasický skript bez importů pro statické sekce, `globalThis.VCI18n`
  - `core.ts`: pro React sekce, čte stejný `languages.json`
  - React sekce (signs, damage-calculator) ho importují relativně. Vite musí mít povolený přístup ke složce `shared` (`server.fs.allow`) a Docker stage musí kopírovat i `shared/`.
- **Přepínač jazyka:** stejný `<select>` vpravo nahoře v každé sekci i v rozcestníku: „Auto (browser)“ + 13 jazyků v jejich vlastním názvu.
- **Co se překládá:**
  - celé UI (nadpisy, tlačítka, popisky, legenda, tooltipy, patička včetně Ko-fi textu), včetně názvů biomů a typů poškození jako termínů hry
  - meta `description` a `og:` zůstávají anglicky (crawlery jazyk nevolí)
- **Názvy z hry** (jednotky, zbraně, suroviny, brnění, biomy):
  - z jazykových odkazů wiki (`action=parse&prop=langlinks`); ty dávají místní názvy z jazykových verzí wiki
  - pokrytí je dobré pro cs, de, fr, ru, částečné pro pt (`pt-br`) a zh (`zh-tw`)
  - pro ostatní jazyky zůstane anglický název
  - ukládá se jako `names: { "<locale>": "…" }` u záznamu
  - ⛔ názvy z hry se strojově nepřekládají
- Popisy z wiki (odstavce o jednotkách a zbraních) zůstávají anglicky a UI to nikde neskrývá.
- **Překlady UI** dělá agent. Termíny hry (Slash, Pierce, Blunt…, Meadows…) má překládat tak, jak je používá hra a jazykové wiki. Kde wiki má název, má přednost.

> **Zásada (Pavel, 6. 10. 2026): každý nový nástroj a každá nová funkce je od začátku ve 13 jazycích** přes sdílené jádro `shared/i18n/` (§ 15). Platí to i pro názvy z hry (`names` z jazykových odkazů wiki). Žádné zadání bez katalogu `locales/messages.json` a přepínače jazyka.

## 16. Progress Tracker (VC-19, VC-20)

- Nová sekce `/progress/` (`apps/progress/`, statická jako Bestiary). Hráč si odškrtává, kam se ve hře dostal. Ostatní nástroje se podle toho samy odemknou, takže nebude potřeba odemykat biomy v každém zvlášť.
- **Sdílený stav** `vc.progress` (localStorage, JSON) obsluhuje klasický skript `shared/progress/core.js` (`globalThis.VCProgress`):
  ```json
  { "version": 1,
    "defeated": { "eikthyr": true, "the-elder": true },
    "visited": ["meadows", "black-forest", "ocean"],
    "milestones": { "forge": true } }
  ```
  - `revealedBiomes()` = sjednocení `visited`, ručně otevřených biomů (`vc.openBiomes`) a **biomu následujícího po posledním poraženém bossovi** (porazím Eikthyra → odemkne se Black Forest).
  - `onChange(cb)` reaguje i na událost `storage` z jiné záložky.
  - `exportToUrl()` / `importFromUrl()`: stav jako base64url v `#p=…`, pro přenos mezi zařízeními.
- **Checklist po biomech** (data z `data/biomes.json` a `data/creatures.json`):
  - boss a jeho vyvolání (`summon` z infoboxu, např. „Malicious Blood x3“)
  - minibossové
  - „byl jsem tam“
  - klíčové milníky: suroviny nebo předměty z dropu bosse, které otevírají další biom (Hard Antler → měď a cín, Swamp Key, Wishbone, Dragon Tear, Torn Spirit, Queen Drop, Fader Drop…). Bere se `drops` bosse z dat, ⛔ nevymýšlí se.
- Spoilery: checklist neukazuje jména bossů ani předmětů z biomů, které nejsou odemčené. Místo nich je „🔒 Biome N“ a tlačítko „Reveal“.
- **Integrace (VC-20):** Bestiary, Armourer a Damage Calculator berou odemčené biomy z `VCProgress.revealedBiomes()`. Damage Calculator nastaví výchozí pozici posuvníku progrese podle posledního odemčeného biomu, pokud uživatel nemá vlastní volbu v URL. Rozcestník ukáže v záhlaví souhrn postupu („5 / 9 biomes · 4 bosses defeated“) a kartu Progress.

## 17. Provisions: jídlo a medovina (VC-21, VC-22)

- Nová sekce `/provisions/` (`apps/provisions/`, statická). Hráč skládá 3 jídla a medoviny na výpravu a dostane součet statů a nákupní seznam surovin.
- **Data** (ověřeno 6. 10. 2026):
  - `Category:Food` (~102), `{{infobox item}}` s `type = Food`: `health`, `stamina`, `eitr`, `duration` (s), `healing` („4 hp/tick“), `materials`, `source` („[[Cauldron]] (level 2)“, Cooking Station, Oven…), `quantity`
  - Medovina: stránky `type = Mead` (~21): `effect`, `duration`, `cooldown` a recept na mead base (tabber), fermentace ve Fermenteru
  - Feasty: tabulka na stránce *Feast*
  - Úrovně kotle a jejich vylepšení: stránka *Cauldron*
- **Funkce:**
  - jídla a medoviny seskupené po biomech (tier podle surovin), zamčené podle `VCProgress`
  - filtr podle zaměření (HP / Stamina / Eitr / vyvážené)
  - 3 sloty na jídlo + sloty na medovinu
  - souhrn: HP, stamina, eitr, léčení a nejkratší doba trvání
  - „na kolik hodin hraní“ → počet porcí
  - nákupní seznam s rozpadem na základní suroviny, stanicemi a jejich potřebnou úrovní a zdroji (jednotky v Bestiary, místa)
  - uložení `vp.loadout`, sdílení v URL
- **Sdílený košík:** výpočet nákupního seznamu a rozpadu z Armouru se vytáhne do `shared/shopping/core.js` a používá ho Armourer i Provisions. Bez kopie logiky.

## 18. Vylepšení stávajících nástrojů (VC-23 až VC-27, Pavel 6. 10. 2026: před Progress a Provisions)

Vychází z `docs/NAVRHY-NASTROJU.md` § „Menší vylepšení“. Platí zásada 13 jazyků.
- **Armourer (VC-23):**
  - Do košíku jde přidat i zbraně, štíty a nástroje, se všemi úrovněmi a cenami vylepšení. Štíty dosud z dat vypadávaly, teď se stahují jako kategorie `shield` s `recommendable: false`.
  - Suroviny z `Category:Can't be Teleported` mají štítek „Can't be teleported“ a košík varuje.
  - **Kalkulačka tavení:** z wiki *Smelter* (1 Coal / 15 s, 30 s na ingot, tedy 2 uhlí na ingot), *Blast Furnace*, *Charcoal Kiln* (dřevo → uhlí) se pro tavené suroviny v rozpadu spočítá uhlí, dřevo do pece a čas na N tavicích pecí (volitelný počet). Hodnoty se ⛔ neopisují ručně, berou se z wiki stránek stanic.
  - Deep link `#set=<id>` otevře set.
- **Bestiary (VC-24):**
  - **Trofeje:** šance na drop a použití z tabulky *Trophies* (`Trophy | Drop chance | Usage | …`).
  - **Ochočování:** u ochočitelných jednotek krmení a dosah z tabulky *Taming* („Creature Feeding Habits“) a doba ochočení, pokud je na stránce.
  - **Nájezdy:** „Appears in raids: …“ z tabulky *Events* (Event name, creatures, biome, enabled by). Spoilery se respektují: nájezd, který spouští boss ze zamčeného biomu, se ukáže jen jako „a later raid“.
  - Sdílení profilu skillů v URL (`#player=…`, base64url, s potvrzením importu).
  - Deep link `#c=<creatureId>` otevře biom a odscrolluje na kartu (spoilery: zamčený biom nabídne „Reveal“).
- **Damage Calculator (VC-25):**
  - Sdílený profil hráče: když URL nemá vlastní skill, výchozí skill = skill hráče z `vc.player` pro třídu zbraně. Výchozí kvalita podle `vc.player.quality`. Přepínač „Use my Bestiary profile“.
  - Z karty jednotky v Bestiary vede odkaz „Open in Damage Calculator“ s předvyplněným cílem a doporučenou zbraní (URL formát kalkulačky `view-url.ts`).
- **Sign Editor (VC-26):**
  - Galerie šablon: štítky truhel (suroviny podle biomů), portálové tagy, značky cest, uvítací cedule. Šablony jsou v datech, přeložené do 13 jazyků, kromě jmen z hry.
  - Sdílení cedule v URL (`#sign=…`).
- **Rozcestník (VC-27):** společné hledání napříč sekcemi (jednotky, zbraně, brnění, suroviny) s místními názvy. Výsledek vede přes deep link do příslušné sekce. Index se generuje při buildu (`apps/hub/data/search.js`). Souhrn postupu v záhlaví řeší VC-20.

## 19. Návštěvnost: Google Analytics 4 se souhlasem (VC-28, 6. 10. 2026)

- **GA4:** služba „Valheim Companion“ v účtu Pawlig, webový stream „Valheim Companion web“ (stream ID 16052418584), **Measurement ID `G-CXQVNCCJKE`**, časové pásmo Česko.
- **Souhlas (Pavel zvolil nenápadnou lištu, GDPR):**
  - **Consent Mode v2:** výchozí stav `denied` pro `analytics_storage`, `ad_storage`, `ad_user_data` a `ad_personalization`. Bez souhlasu se nenastaví žádné cookies a Google dostává jen anonymní pingy.
  - Po „Allow analytics“ se nastaví `analytics_storage: granted`. Reklamní signály zůstávají vždy `denied`.
  - Lišta je malá, dole, ve 13 jazycích: „We use Google Analytics to see which tools help players. Allow analytics?“ s tlačítky [Allow] [Decline] a odkazem na Privacy.
  - Volba platí pro celý Companion: `localStorage` `vc.consent` = `{ "analytics": "granted"|"denied", "at": ISO }`.
  - V patičce každé sekce je odkaz „Cookie settings“, který lištu znovu otevře.
- **Kód:** `shared/analytics/consent.js` je klasický skript, ⛔ inline. Nastaví `dataLayer`/`gtag`, výchozí souhlas a dynamicky načte `https://www.googletagmanager.com/gtag/js?id=…`. Spustí se jen na produkční doméně (`site.config.json` → `siteUrl` a `gaMeasurementId`), ne na localhostu ani v náhledu.
- **CSP:** rozšíří se jen o to, co GA potřebuje:
  - `script-src 'self' https://www.googletagmanager.com`
  - `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
  - `img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com`
- **Stránka Privacy** `/privacy/` (rozcestník, 13 jazyků): co se měří, proč, jak odvolat souhlas, žádné reklamy a žádný prodej dat, kontakt.

> **Zásada (Pavel, 6. 10. 2026): názvy z hry se nepřekládají.** Jednotky, bossové, zbraně, munice, brnění, suroviny, jídla, stanice i biomy zůstávají **anglicky ve všech jazycích** a ve všech nástrojích, stejně jako je hráč zná ze hry. Překládá se jen rozhraní: popisky, tlačítka, nápovědy, legenda a věty kolem názvů. Data `names` z jazykových odkazů wiki (VC-17) mohou zůstat v datech, UI je ale ⛔ nepoužívá. Tato zásada ruší body § 15 o místních názvech.
