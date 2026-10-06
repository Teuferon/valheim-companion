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

export const GUIDE_NOTES: Record<BiomeId, string[]> = {
  meadows: [
    "Build the Workbench, then craft flint weapons: flint is free along the shoreline and repairs without metal.",
    "Hunt deer for hides, and keep two deer trophies for the Eikthyr offering.",
    "Fire arrows are the earliest fire damage you can craft — a stack makes any early fight shorter.",
  ],
  "black-forest": [
    "Build the Forge, a Smelter and a Charcoal Kiln; bronze takes 2 copper + 1 tin per bar.",
    "Finewood comes from birch and oak — it unlocks the first bow and the first boats.",
    "Clear Burial Chambers for Surtling Cores; the Smelter and portals both need them.",
  ],
  ocean: [
    "No Forsaken here — the barrier is a seaworthy boat: a Karve needs Finewood and Bronze Nails.",
    "Leviathans surface as floating islands; chitin from their backs makes the abyssal knife.",
    "There is nothing to conquer offshore, only gear worth having before the next shore.",
  ],
  swamp: [
    "Iron comes from Sunken Crypts — bring the Swamp Key from The Elder to open them.",
    "Bonemass is weak to blunt and frost: an upgraded iron mace is the classic answer.",
    "Blobs, oozers and leeches all poison; keep poison resistance to hand.",
  ],
  mountain: [
    "Silver hides under the ground and only the Wishbone pings it — sweep the slopes with it equipped.",
    "Moder is immune to frost, so frost arrows and Frostner lose their bite for that fight.",
    "Wolf pelts and fangs are the local bottleneck; freeze glands make frost resistance mead for the nights.",
  ],
  plains: [
    "Yagluth resists pierce and fire: black metal swords and blunt weapons are the safe picks.",
    "Flax and barley only grow here — plant flax for the linen thread every black metal recipe wants.",
    "Fuling camps supply black metal scrap and the deathsquito needles Porcupine needs.",
  ],
  mistlands: [
    "Carapace weapons need the Black Forge; staves need the Galdr Table and refined eitr.",
    "The Queen resists pierce and is immune to spirit — slash and blunt carry the fight.",
    "Keep wisps coming: they light the mist and feed every eitr recipe.",
  ],
  ashlands: [
    "Fader is immune to fire and resists pierce; flametal blades and blunt weapons do the work.",
    "Flametal ore falls as meteors and needs the Black Forge to work.",
    "Charred bone, asksvin hide and bloodstone are the local bottlenecks — stockpile them.",
  ],
  "deep-north": [
    "Build the Frost Foundry: bloodgold and frostcore are the gate to every weapon here.",
    "The final boss resists pierce, fire, frost and lightning — slash, blunt and the bloodgold blades are the safe picks.",
    "Bloodgold and frostfire weapons are re-forged from Nord weapons; keep one of each type you use.",
  ],
};
