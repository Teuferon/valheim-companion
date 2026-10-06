# Stav projektu Valheim Companion

> **Živý dokument.** Orchestrátor ho aktualizuje po každé přejímce, merge nebo změně fronty. Nová session začíná tady.
> Poslední aktualizace: **6. 10. 2026, 13:00**

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
| `/armourer/` | Armourer | `apps/armourer/` (vanilla JS) | ✅ 68 setů a kusů, nákupní košík Have/Want, rozpad surovin, zdroje surovin, sekce Cosmetics a DLC & seasonal |
| `/damage-calculator/` | Damage Calculator | `apps/damage-calculator/` (React + Vite, PR #1 od Teuferona) | ✅ zdroj pravdy pro poškození po kvalitách a časování útoků, parita s Bestiary hlídaná testem |
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
| **VC-15** | úklid (koruny bez vylepšení, `neutral` v kalkulačce, collation ve scraperu) | zai | 🔄 **běží** (worktree `../valheim-units-GL`, větev `prace/VC-15`) |
| **VC-16** | sdílené jádro i18n (13 jazyků, `vc.language`), rozcestník přeložený, Runopis napojený | — | ⏳ fronta 1 |
| **VC-17** | Bestiary + Armourer v 13 jazycích, místní názvy z jazykových odkazů wiki | — | ⏳ fronta 2 |
| **VC-18** | Damage Calculator v 13 jazycích + místní názvy | — | ⏳ fronta 3 |

### Po frontě (rozhodne Pavel)
Návrhy z [`NAVRHY-NASTROJU.md`](NAVRHY-NASTROJU.md). Doporučené pořadí orchestrátora: **Progress Tracker** (S, infrastruktura pro spoilery) → **Provisions** (Food & Mead, M) → Comfort Planner → Expedition. Zatím nejsou zadané.

## Známé drobnosti (neřešené)

- Barka „Chop: neutral“: řeší VC-15.
- Crown of Roots / Crown of Valheim: odhad brnění; řeší VC-15.
- Damage Calculator: pořadí v JSON závisí na locale stroje; řeší VC-15.
- Ember Charge je jediná doporučovaná bomba. Ostatní bomby mají `recommendable: false`, protože wiki neuvádí plošné poškození.
- Popisy z wiki zůstanou po překladu anglicky (ANALYZA § 15).

## Na Pavlovi

- Vypnout starou appku **valheim-signs.teuferon.click** v EasyPanelu. Repo `pawlig/valheim-signs` je smazané, lokální složka taky.
- Rozhodnout, které nové nástroje dělat a v jakém pořadí.
- Případně povolit Codex (CX/CS z marchboundu), pokud kvóty agy/zai nestačí.

## Kvóty (6. 10. 2026, 12:30)

| Agent | 5 h okno | Týden | Obnova týdne |
|---|---|---|---|
| agy (GM, Gemini Flash) | 12 % | 17 % | 8. 10. 14:59 |
| zai (GL, GLM-5.3, tarif lite) | 61 % | 22 % | 12. 10. 00:18 |

Kvóty jsou sdílené s ostatními projekty (hriva, marchbound). Na Macu smí běžet jen **jeden** agy/zai agent najednou napříč všemi projekty.
