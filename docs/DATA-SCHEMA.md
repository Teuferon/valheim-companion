# Schéma dat — Valheim Companion

Závazné pro VC-1, VC-2 a VC-3. Změnu schématu smí udělat jen orchestrátor.

Všechny JSONy jsou UTF-8, odsazené 2 mezerami, pole seřazená deterministicky (biomy podle `order`, jednotky a zbraně podle `name`).
`id` = slug z názvu stránky na wiki: malá písmena, cokoliv mimo `[a-z0-9]` → `-`, sloučené a oříznuté pomlčky.
Diakritika se nejdřív odstraní (`normalize('NFKD')` + smazat kombinující znaky).
Příklady: `Greydwarf (Deep North)` → `greydwarf-deep-north`, `Zil & Thungr` → `zil-thungr`, `Nidhögg` → `nidhogg`.

Typy poškození (`DamageType`): `blunt`, `slash`, `pierce`, `chop`, `pickaxe`, `fire`, `frost`, `lightning`, `poison`, `spirit`.
Stupně (`ModTier`): `veryweak` (2), `weak` (1.5), `slightlyweak` (1.25), `neutral` (1), `slightlyresistant` (0.75), `resistant` (0.5), `veryresistant` (0.25), `immune` (0).

## `data/biomes.json`

```json
[
  {
    "id": "meadows",
    "name": "Meadows",
    "order": 1,
    "gearTier": 1,
    "image": "img/biomes/meadows.png",
    "wiki": "https://valheim.weirdgloop.org/w/Meadows",
    "creatures": {
      "boss": ["eikthyr"],
      "miniboss": [],
      "hostile": ["boar", "greyling", "neck"],
      "passive": ["deer", "gull"],
      "fish": ["perch", "pike"]
    }
  }
]
```

`boss` vs `miniboss`: miniboss = stránka je v `Category:Minibosses`. `fish` = stránka je v `Category:Fish`. Ostatní z pole `passive` biomu jde do `passive`.

## `data/creatures.json`

```json
[
  {
    "id": "greydwarf",
    "name": "Greydwarf",
    "wiki": "https://valheim.weirdgloop.org/w/Greydwarf",
    "gameIds": ["Greydwarf"],
    "kind": "hostile",
    "biomes": ["black-forest"],
    "faction": "Forest",
    "behavior": "Aggressive",
    "tameable": false,
    "weakPoints": [],
    "stagger": "30%",
    "hasStars": true,
    "stars": [
      {
        "star": 0,
        "image": "img/creatures/greydwarf-0.png",
        "health": 40,
        "healthText": "40",
        "attacks": [
          { "name": "Attack", "damage": { "slash": 14 }, "raw": "Attack: 14 Slash" },
          { "name": "Throw", "damage": { "blunt": 10 }, "raw": "Throw: 10 Blunt" }
        ]
      }
    ],
    "abilities": ["Attack (2s)", "Throw (8s)"],
    "modifiers": { "fire": "veryweak", "poison": "resistant", "spirit": "immune" },
    "otherImmunities": [],
    "drops": ["Greydwarf Eye", "Greydwarf Trophy", "Resin", "Stone", "Wood"],
    "trophy": { "name": "Greydwarf Trophy", "image": "img/creatures/greydwarf-trophy.png" },
    "summon": null,
    "location": "Black Forest",
    "spawns": ["Anywhere in Black Forest during the daytime (limit 3)"],
    "description": "Greydwarfs are aggressive creatures found in Black Forests. …"
  }
]
```

Pravidla:
- `kind`: `boss` | `miniboss` | `hostile` | `passive` | `fish`, podle sekce biomu, ve které je jednotka poprvé (nejnižší `order`).
- `biomes`: všechny biomy, ve kterých je jednotka uvedená, seřazené podle `order`.
- `stars`: jen úrovně, které infobox skutečně uvádí (má neprázdné `health Nstar` nebo `damage Nstar`), seřazené podle `star`. Může tedy mít 1, 2 nebo 3 prvky a nemusí začínat nulou (Lord Reto má jen `star: 2`). `hasStars = stars.length > 1`. Chybí-li obrázek pro danou úroveň, použije se obrázek nejbližší nižší úrovně, jinak první dostupný.
- `health`: číslo. Čárky a mezery v tisících se ignorují (`12,500` → 12500). Fáze (`10000 + 7000 + 30000`) a části (`* Thungr: 4200 * Zil: 2400`) se sečtou a `healthText` je původní text bez wiki značek (víc řádků oddělených `\n`). Nečíselné HP → `health: null`.
- `healthByBiome`: jen když řádky HP začínají názvem biomu (`Meadows: 30`, Skeleton). Je to objekt `{ "<biomeId>": číslo }` a `health` je pak `null`. Jinak pole chybí.
- `weakPoints`: `[{ "part": "Head", "modifiers": { "pierce": "veryweak" } }]` z polí `weak point`, `wp veryweak`, `wp weak`, `wp resistant`… Žádný slabý bod → `[]`.
- `attacks[].name`: u vnořených seznamů složené z rodiče a potomka (`"Axe – Cleave"`), u fází s předponou (`"Phase 1 – Chain Slam"`). `damage` obsahuje jen typy z `DamageType`. `raw` je řádek bez wiki značek. Nejde-li řádek rozparsovat, `damage: {}` a `raw` se vyplní.
- `modifiers`: jen typy, které infobox výslovně uvádí. Výchozí hodnoty z `docs/ANALYZA.md` § 4 doplňuje až výpočet v VC-2, ⛔ ne tento soubor.
- `spawns`: řádky ze `{{spawn row|type=…|limit=…}}` převedené na čistý text. Žádná šablona → `[]`.
- `description`: první odstavec textu stránky bez wiki značek, max 400 znaků.
- Všechny texty jsou čisté: bez `[[`, `]]`, `{{`, `'''`, `<br>` a HTML entit (`&nbsp;` → mezera).
- Obrázky jsou relativní cesty v repu. Neexistující obrázek → `null`.

## `data/materials.json` (VC-2)

```json
[{ "name": "Black Metal", "biome": "plains", "tier": 5, "how": "table" }]
```
`how`: `table` (z tabulky v ANALYZA § 3) | `wiki` (dohledáno z wiki, s krátkým důvodem v `note`) | `unresolved` (`biome: null`).

## `data/weapons.json` (VC-2)

```json
[
  {
    "id": "frostner",
    "name": "Frostner",
    "wiki": "https://valheim.weirdgloop.org/w/Frostner",
    "gameId": "MaceSilver",
    "category": "club",
    "hands": "1h",
    "type": "Club 1h",
    "image": "img/weapons/frostner.png",
    "station": "Forge",
    "stationLevel": 3,
    "maxQuality": 4,
    "damage": { "blunt": 35, "frost": 40, "spirit": 20 },
    "perLevel": { "frost": 6, "blunt": 0 },
    "damageMax": { "blunt": 35, "frost": 58, "spirit": 20 },
    "stamina": 12,
    "knockback": 100,
    "materials": [{ "name": "Silver", "amount": 30 }],
    "tier": 4,
    "biome": "mountain",
    "description": "The dead fear silver. Remind them why."
  }
]
```

`category`: `sword` | `axe` | `club` | `spear` | `polearm` | `knife` | `battleaxe` | `sledge` | `fists` | `pickaxe` | `bow` | `crossbow` | `arrow` | `bolt` | `magic` | `bomb`. Zbraně, které se nedoporučují (štíty, missiles…), ⛔ do souboru nepatří.
U šípů a šipek je `damage` poškození šípu, `maxQuality: 1`, `materials` je recept na jednu dávku a `quantity` je počet kusů z receptu.

## `data/recommendations.json` (VC-2)

Klíč je `"<biomeId>:<creatureId>"`.

```json
{
  "black-forest:greydwarf": {
    "gearTier": 2,
    "modifiers": { "blunt": 1, "slash": 1, "pierce": 1, "fire": 2, "frost": 1, "lightning": 1, "poison": 0.5, "spirit": 0, "chop": 0, "pickaxe": 0 },
    "melee": [
      { "weapon": "bronze-sword", "score": 47, "raw": 47, "notes": [] }
    ],
    "bow": { "weapon": "finewood-bow", "score": 0 },
    "arrows": [
      { "weapon": "fire-arrow", "score": 103, "raw": 59, "notes": ["×2 Fire"] }
    ],
    "crossbow": null,
    "bolts": [],
    "magic": null,
    "bomb": { "weapon": "…", "score": 0, "raw": 0, "notes": [] },
    "avoid": [{ "type": "poison", "mult": 0.5 }],
    "tip": "Very weak to Fire (×2): Fire Arrow hits for 103 effective."
  }
}
```

- `score` = efektivní poškození podle ANALYZA § 5 a `raw` = součet poškození bez násobičů. Obojí se zaokrouhluje na celá čísla.
- U šípů je `score` včetně luku. `bow.score` = efektivní pierce samotného luku.
- `notes`: typy s násobičem ≠ 1, které zbraň má, ve tvaru `"×2 Fire"` nebo `"×0.5 Pierce"`, seřazené od nejvyššího násobiče.
- Prázdná kategorie → `null` (u objektu) nebo `[]` (u pole).

## `data/data.js` (VC-2)

Jediný soubor, který čte web:

```js
window.VC_DATA = {
  "generatedAt": "2026-10-05T…Z",
  "source": { "name": "Valheim Wiki", "url": "https://valheim.weirdgloop.org", "license": "CC BY-SA 4.0" },
  "damageTypes": ["blunt", "slash", "pierce", "chop", "pickaxe", "fire", "frost", "lightning", "poison", "spirit"],
  "modTiers": { "veryweak": 2, "weak": 1.5, "slightlyweak": 1.25, "neutral": 1, "slightlyresistant": 0.75, "resistant": 0.5, "veryresistant": 0.25, "immune": 0 },
  "biomes": [/* biomes.json */],
  "creatures": { "<id>": {/* creature */} },
  "weapons": { "<id>": {/* weapon */} },
  "recommendations": {/* recommendations.json */}
};
```

Generuje ho `node scripts/build-data.mjs` z JSONů. ⛔ Ručně se needituje.

## `data/overrides.json` (orchestrátor)

Ruční opravy, které parser aplikuje **jako poslední krok**:

```json
{
  "creatures": { "frost-blob": { "biomes": ["mountain"], "kind": "hostile", "reason": "…" } },
  "materials": { "Ymir Flesh": { "biome": "mountain", "tier": 4, "reason": "…" } },
  "exclude": { "creatures": ["staff-of-the-wild"], "weapons": [] }
}
```
