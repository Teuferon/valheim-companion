# Návrhy dalších nástrojů (Fable, rešerše 6. 10. 2026)

| # | Nástroj | Hodnota | Fit s daty a sekcemi | Pracnost | Poznámka |
|---|---|---|---|---|---|
| 1 | **Provisions** (Food & Mead Planner) | vysoká | vysoký (items.json, košík Armouru, zamykání biomů) | M | nejčastější téma hráčů; konkurence nemá nákupní seznam |
| 2 | **Progress Tracker** (sdílený stav postupu) | střední | velmi vysoký (jeden `vc.progress` pro všechny sekce) | S | infrastruktura pro spoilery a nájezdy |
| 3 | **Comfort Planner** | střední | vysoký (materiály → košík) | S | konkurence existuje |
| 4 | **Expedition: Boss & Raid Prep** | vysoká | vysoký (creatures, recommendations, Events) | M | staví na 1 a 2 |
| 5 | **Trader Ledger** (Haldor, Hildir, Bog Witch) | střední | střední | S | ceny a podmínky odemknutí |
| 6 | **Fishing Guide** | nižší | vysoký (ryby už jsou v Bestiary) | S | návnada × ryba × trofej |
| 7 | **Taming & Breeding** | střední | vysoký (štítek Tameable) | S–M | data jen zčásti strukturovaná |
| 8 | **Build Cost Calculator** | střední | nízký | L | data roztříštěná, konkurence silná |

## Důkazy a data (výběr)
- Otázky hráčů (14 200 z Redditu a Steamu): převládá crafting a suroviny, jídlo, bossové a Deep North. https://huggingface.co/datasets/Egrigor/ValheimQuestions
- Jídlo: hráči vybírají podle snadné výroby, ne podle maxima statů. https://steamcommunity.com/app/892970/discussions/0/4361247379742889268
- Nájezdy: kolují mýty o tom, co je spouští. https://steamcommunity.com/app/892970/discussions/0/3842178984940870440
- Příprava na Kalla (1.0): https://www.dtgre.com/2026/09/valheim-1-0-final-boss-checklist-before-kall-fimbulbringer.html
- Konkurence: https://xgamingserver.com/tools/valheim (bez zamykání spoilerů, bez nákupních seznamů), https://physgun.com/tools/valheim-comfort-calculator/
- Data na wiki:
  - jídla: 90 stránek `type = Food` (`health`, `stamina`, `eitr`, `duration`, `healing`, `materials`, `source`)
  - medovina: 21 stránek `type = Mead` (`effect`, `duration`, `cooldown`)
  - comfort: 71 stránek `infobox structure` s polem `comfort`
  - nájezdy: tabulka *Events* (spouštění a vypínání, biom, jednotky)
  - ochočení: *Taming* a `Category:Tameable creatures` (43)

## Menší vylepšení stávajících nástrojů
1. **Armourer:** zbraně, štíty a nástroje v košíku. Označit, co nejde teleportovat. Kalkulačka tavení (uhlí, smeltery, čas).
2. **Bestiary:** trofeje se šancí a použitím. Krmení ochočitelných zvířat. „Objevuje se v nájezdech…“. Sdílení profilu skillů v URL.
3. **Damage Calculator:** číst `vc.player` z Bestiary. Odkaz z karty jednotky s předvyplněným cílem. Výhledově „damage taken“ (útok nepřítele proti zbroji hráče).
4. **Sign Editor:** galerie šablon a sdílení cedule v URL.
5. **Rozcestník:** společné hledání napříč sekcemi a stav postupu v záhlaví.
