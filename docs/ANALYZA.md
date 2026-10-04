# Valheim Companion — analýza

Statický web, který ukazuje všechny jednotky Valheimu (bossy, minibossy, nepřátele, pasivní zvířata, ryby) rozdělené po biomech.
Každý biom je **zavřený** (ochrana proti spoilerům), po kliknutí se rozbalí.
U každé jednotky jsou obrázky, staty po hvězdičkách, slabiny/resisty a **doporučené zbraně a munice**, které se dají mít nejpozději v tom biomu.

- Repo: `pawlig/valheim-companion` (public). Web se otevírá dvojklikem na `index.html` (`file://`), jde ho ale hostovat i jako statickou stránku.
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
