# Stav projektu Valheim Companion

> **Živý dokument.** Orchestrátor ho aktualizuje po každé přejímce, merge nebo změně fronty. Nová session začíná tady.
> Poslední aktualizace: **6. 10. 2026, 13:50**

- Web: https://valheim-companion.teuferon.click (EasyPanel, deploy webhookem při každém pushi do repa)
- Repo: https://github.com/pawlig/valheim-companion (public), lokálně `~/gameroot/valheim-units`
- Jak se pouští agenti a přejímá práce: [`docs/ORCHESTRACE.md`](ORCHESTRACE.md)
- Analýza a rozhodnutí: [`docs/ANALYZA.md`](ANALYZA.md) (§ 1–15) · schéma dat: [`docs/DATA-SCHEMA.md`](DATA-SCHEMA.md)
- Návrhy dalších nástrojů: [`docs/NAVRHY-NASTROJU.md`](NAVRHY-NASTROJU.md)

## Sekce na webu

| URL | Sekce | Zdroj | Stav |
|---|---|---|---|
| `/` | Rozcestník | `apps/hub/` (statický) | ✅ OG/Twitter meta, ikony, manifest, Ko-fi v patičce |
| `/bestiary/` | Bestiary | `apps/bestiary/` (vanilla JS) + `scripts/` + `data/` | ✅ 106 jednotek, 9 biomů, panel „Your character“ (skilly, sety, obtížnost, hráči, sneak/stagger, rankBy DPS/hit), DPS a čas do zabití, Armory (153 zbraní) |
| `/smithy/` | Smithy | `apps/smithy/` (vanilla JS) | ✅ 68 setů a kusů, nákupní košík Have/Want, rozpad surovin, zdroje surovin, sekce Cosmetics a DLC & seasonal |
| `/damage-calculator/` | Damage Calculator | `apps/damage-calculator/` (React + Vite, PR #1 od Teuferona) | ✅ zdroj pravdy pro poškození po kvalitách a časování útoků, parita s Bestiary hlídaná testem |
| `/progress/` | Progress Tracker | `apps/progress/` + `shared/progress/` (panel na každé stránce) | ✅ sdílený stav `vc.progress`, odemyká spoilery ve všech nástrojích |
| `/provisions/` | Provisions | `apps/provisions/` | ✅ jídla, medoviny, feasty, loadout, nákupní seznam |
| `/signs/` | Sign Editor (Runopis) | `apps/signs/` (React + Vite, převzato subtree z `valheim-signs`) | ✅ 13 jazyků |

Pořadí biomů ve všech nástrojích je jedno (ANALYZA § 14): Meadows, Black Forest, **Ocean**, Swamp, Mountain, Plains, Mistlands, Ashlands, Deep North. Platí `tier = order`.

## Úlohy

Zadání jsou v [`docs/zadani/`](zadani/). Hotové úlohy jsou mergnuté do `main` (`Merge VC-n: …`).

| ID | Co | Agent | Stav |
|---|---|---|---|
| VC-1, 1b | data jednotek a biomů z wiki | zai | ✅ |
| VC-2, 2b | zbraně, materiály, doporučení | agy | ✅ |
| VC-3, 3b | web Bestiary | agy | ✅ |
| VC-4 | rozcestník + přesun Runopisu na `/signs/` | agy | ✅ |
| VC-5, 5b | panel „Your character“, výchozí backstab | agy + zai | ✅ |
| VC-6 | pěstní zbraně (Category:Unarmed), Armory | agy | ✅ |
| VC-7, 7b | data Armouru (brnění, suroviny, zdroje) | agy | ✅ |
| VC-8 | web Armouru | agy | ✅ |
| VC-9 | OG/Twitter meta, náhledy, ikony, manifest | agy | ✅ |
| VC-10 | DPS z vykreslených stránek | — | ⛔ zrušeno, nahrazuje VC-11 |
| VC-11, 11b | jednotná čísla s kalkulačkou, DPS v Bestiary, chop/pickaxe v kalkulačce | agy + zai | ✅ |
| VC-12 | jednotné pořadí biomů | agy | ✅ |
| VC-13 | Ko-fi, odebrán odkaz na GitHub z rozcestníku | agy | ✅ |
| VC-14 | úklid (bomby, Root, brnění po kvalitách, DLC/seasonal, MIME manifestu) | agy | ✅ |
| VC-15 | úklid (koruny bez vylepšení, `neutral` v kalkulačce, collation ve scraperu) | zai + agy | ✅ |
| VC-16 | sdílené jádro i18n (13 jazyků, `vc.language`), rozcestník přeložený, Runopis napojený | agy | ✅ |
| VC-28 | Google Analytics 4 (G-CXQVNCCJKE) s lištou souhlasu, CSP, stránka Privacy | agy | ✅ ověřeno na živém webu (bez souhlasu jen `gcs=G100` bez cookies, po Allow `_ga`) |
| VC-17 | Bestiary + Armourer v 13 jazycích, místní názvy z wiki, UX opravy Armouru | Sol | ✅ |
| VC-18 | Damage Calculator v 13 jazycích (místní názvy odebere VC-29) | Sol | ✅ |
| VC-23 | Armourer: zbraně a štíty v košíku, „Can't be teleported“, kalkulačka tavení | agy | ✅ |
| VC-29 | všechny názvy z hry vždy anglicky, překládá se jen UI | Sol | ✅ |
| VC-24 | Bestiary: trofeje, ochočování, nájezdy, sdílení profilu, deep link | Sol | ✅ |
| VC-30 | odkaz z karty Bestiary do kalkulačky (Teuferon) + názvy nástrojů anglicky | Sol | ✅ |
| VC-31 | Armourer → **Smithy** (`/smithy/`, 301 ze `/armourer/`), bez Bare Fists, mobil 360 px ve 13 jazycích (`scripts/check-mobile.mjs`) | Sol | ✅ |
| VC-25 | Damage Calculator: sdílený profil hráče (`shared/player`), přepínač „Use my Bestiary profile“, URL má přednost | Sol | ✅ |
| VC-26 | Sign Editor: 22 šablon, galerie, sdílení `#sign=` | Sol | ✅ |
| VC-27 | rozcestník: hledání napříč sekcemi (jen anglické názvy, zamčené biomy skryté) + oprava deep linku | agy | ✅ |
| VC-19 | Progress Tracker `/progress/`, sdílený stav `vc.progress`, 15 milníků, sdílení `#p=` | Sol | ✅ |
| VC-20 | Bestiary, Smithy, kalkulačka a rozcestník se řídí sdíleným postupem | Sol | ✅ |
| VC-21 | Provisions data (90 jídel, 21 medovin, 9 feastů) + sdílený košík `shared/shopping` | Sol | ✅ |
| VC-32 | Progress jako vysouvací panel na každé stránce („⛓ Progress N/9“), nástroje reagují hned | Sol | ✅ |
| VC-22 | stránka Provisions `/provisions/`: loadout, porce na hodiny hraní, nákupní seznam | Sol | ✅ |

| **VC-33** | množná čísla ve všech jazycích (`tn` + `Intl.PluralRules`) | Sol | 🔄 běží (`../valheim-units-CS`) |
| **VC-34** | Provisions: nejlepší kombinace podle činnosti, medoviny podle biomu/bosse, tipy | Sol | 🔄 běží (`../valheim-units-GL`) |

### Po frontě
Pracovníci od 6. 10.: agy je vyčerpaný (týden 4 %, obnova 8. 10.), práci dělá **Codex Sol**. Pavel 6. 10. schválil pořadí: překlady (VC-16 až VC-18), **vylepšení stávajících nástrojů** (VC-23 až VC-27), potom **Progress Tracker** a **Provisions** (VC-19 až VC-22). Další kandidáti z [`NAVRHY-NASTROJU.md`](NAVRHY-NASTROJU.md): Comfort Planner, Expedition, Trader Ledger, Fishing, Taming. Zatím nejsou schválené.

**Zásada:** každý nový nástroj a funkce je od začátku ve 13 jazycích (ANALYZA § 15 a zásada před § 16).

## Známé drobnosti (neřešené)

- Přesměrování `/armourer/` → `/smithy/` (a `/bestiary` → `/bestiary/`) vrací `Location: http://…` a teprve EasyPanel přesměruje na https (o jeden skok navíc, funkčně OK). `absolute_redirect off` v `deploy/nginx.conf` se po nasazení neprojevilo. Ověřit v EasyPanelu, jestli běží nejnovější image.


- Množná čísla: čeština „1 hráčů“, angličtina „1 bosses defeated“. Řešit plural pravidly v `shared/i18n` (`Intl.PluralRules`) při další i18n úloze.

- Ember Charge je jediná doporučovaná bomba. Ostatní bomby mají `recommendable: false`, protože wiki neuvádí plošné poškození.
- Popisy z wiki zůstanou po překladu anglicky (ANALYZA § 15).

## Google Analytics

Služba „Valheim Companion“ v účtu Pawlig, Measurement ID **G-CXQVNCCJKE**, stream „Valheim Companion web“ (16052418584). Nasazeno 6. 10. 2026 (VC-28, Consent Mode v2 + lišta, ANALYZA § 19). Data se v GA objeví do 48 h.

## Na Pavlovi

- Vypnout starou appku **valheim-signs.teuferon.click** v EasyPanelu. Repo `pawlig/valheim-signs` je smazané, lokální složka taky.
- Případně povolit Codex (CX/CS z marchboundu), pokud kvóty agy/zai nestačí.

## Kvóty (6. 10. 2026, 12:30)

| Agent | 5 h okno | Týden | Obnova týdne |
|---|---|---|---|
| agy (GM, Gemini Flash) | 12 % | 17 % | 8. 10. 14:59 |
| zai (GL, GLM-5.3, tarif lite) | 61 % | 22 % | 12. 10. 00:18 |

Kvóty jsou sdílené s ostatními projekty (hriva, marchbound). Na Macu smí běžet jen **jeden** agy/zai agent najednou napříč všemi projekty.
