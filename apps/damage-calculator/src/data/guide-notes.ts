/**
 * Curated advice for the progression guide.
 *
 * The picks, qualities and costs next to these notes are derived from the
 * committed recipe data; the notes cover what the data does not model — the
 * boat on the Ocean step, the dungeons iron comes from, which weakness the
 * local boss has. They follow the same spoiler rule as the slider: a step may
 * only talk about itself and the biomes behind it, never ahead.
 */

import type { BiomeId } from "./biomes";
import { gameText, type GameText } from "../lib/game-text";

export const GUIDE_NOTES: Record<BiomeId, GameText[]> = {
  meadows: [
    gameText("Build {stations}.", { stations: "Workbench" }),
    gameText("Find {items} along the shoreline; repairs need no metal.", { items: "Flint" }),
    gameText("Hunt {creature} for {items}.", { creature: "Deer", items: "Deer Hide" }),
    gameText("Keep {items} to summon {boss}.", { items: "2× Deer Trophy", boss: "Eikthyr" }),
    gameText("Craft {item} for early {type} damage.", { item: "Fire Arrow", type: "Fire" }),
  ],
  "black-forest": [
    gameText("Build {stations}.", { stations: "Forge, Smelter, Charcoal Kiln" }),
    gameText("Craft {item} with {materials}.", { item: "Bronze", materials: "2× Copper + 1× Tin" }),
    gameText("Find {items} in {sources}.", { items: "Finewood", sources: "Birch, Oak" }),
    gameText("{material} unlocks the first bows and boats.", { material: "Finewood" }),
    gameText("Find {items} in {sources}.", { items: "Surtling Core", sources: "Burial Chambers" }),
    gameText("{items} are needed for {structures}.", { items: "Surtling Core", structures: "Smelter, Portal" }),
  ],
  ocean: [
    gameText("Craft {item} with {materials}.", { item: "Karve", materials: "Finewood, Bronze Nails" }),
    gameText("Find {items} in {sources}.", { items: "Chitin", sources: "Leviathan" }),
    gameText("Craft {item} with {materials}.", { item: "Abyssal Razor", materials: "Chitin" }),
  ],
  swamp: [
    gameText("Find {items} in {sources}.", { items: "Iron", sources: "Sunken Crypts" }),
    gameText("Open {location} with {item} from {boss}.", { location: "Sunken Crypts", item: "Swamp Key", boss: "The Elder" }),
    gameText("{target} is weak to {types}. Use {weapons}.", { target: "Bonemass", types: "Blunt, Frost", weapons: "Iron Mace" }),
    gameText("{creatures} deal {type} damage; keep resistance ready.", { creatures: "Blob, Oozer, Leech", type: "Poison" }),
  ],
  mountain: [
    gameText("Find underground {item} with {tool}.", { item: "Silver", tool: "Wishbone" }),
    gameText("{target} is immune to {types}. Avoid {weapons}.", { target: "Moder", types: "Frost", weapons: "Frost Arrow, Frostner" }),
    gameText("Stockpile {items}.", { items: "Wolf Pelt, Wolf Fang" }),
    gameText("Craft {item} with {materials}.", { item: "Frost Resistance Mead", materials: "Freeze Gland" }),
  ],
  plains: [
    gameText("{target} resists {types}. Use {weapons}.", { target: "Yagluth", types: "Pierce, Fire", weapons: "Black Metal Sword, Blunt" }),
    gameText("Resources: {items}.", { items: "Flax, Barley" }),
    gameText("{items} only grow here; plant them for {material}.", { items: "Flax", material: "Linen Thread" }),
    gameText("Find {items} in {sources}.", { items: "Black Metal Scrap", sources: "Fuling" }),
    gameText("Craft {item} with {materials}.", { item: "Porcupine", materials: "Needle (Deathsquito)" }),
  ],
  mistlands: [
    gameText("Craft weapons at {station} using {materials}.", { materials: "Carapace", station: "Black Forge" }),
    gameText("Craft weapons at {station} using {materials}.", { materials: "Refined Eitr", station: "Galdr Table" }),
    gameText("Stockpile {items}.", { items: "Refined Eitr, Wisp" }),
    gameText("{target} is immune to {immune} and resists {resistant}. Use {weapons}.", { target: "The Queen", immune: "Spirit", resistant: "Pierce", weapons: "Slash, Blunt" }),
  ],
  ashlands: [
    gameText("{target} is immune to {immune} and resists {resistant}. Use {weapons}.", { target: "Fader", immune: "Fire", resistant: "Pierce", weapons: "Flametal, Blunt" }),
    gameText("Find {items} in falling meteors; process them at {station}.", { items: "Flametal Ore", station: "Black Forge" }),
    gameText("Stockpile {items}.", { items: "Charred Bone, Asksvin Hide, Bloodstone" }),
  ],
  "deep-north": [
    gameText("Build {stations}.", { stations: "Frost Foundry" }),
    gameText("Stockpile {items}.", { items: "Bloodgold, Frostcore" }),
    gameText("{target} resists {types}. Use {weapons}.", { target: "Kall Fimbulbringer", types: "Pierce, Fire, Frost, Lightning", weapons: "Slash, Blunt, Bloodgold" }),
    gameText("Re-forge {items} from {weapons}; keep one of each type you use.", { items: "Bloodgold, Frostfire", weapons: "Nord" }),
  ],
};
