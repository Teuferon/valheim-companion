// Shared material source, conversion and recipe-biome logic.
import { cleanText, slug } from './wikitext.mjs';

const KNOWN_STATIONS = [
  'workbench',
  'forge',
  'smelter',
  'blast-furnace',
  'spinning-wheel',
  'windmill',
  'galdr-table',
  'black-forge',
  'artisan-table',
  'frost-foundry',
  'kiln',
  'cauldron',
  'fermenter',
  'stonecutter',
  'eitr-refinery',
];

const KNOWN_NPCS = ['haldor', 'hildir', 'bog-witch'];

export function parseTrophySource(itemName, creatures, creatureByName, creaturesBySlug) {
  const trophyMatch = itemName.match(/^(.+?)\s+Trophy$/i);
  if (!trophyMatch) return null;
  const creaturePart = trophyMatch[1].trim();
  const creatureSlug = slug(creaturePart);
  const c =
    creaturesBySlug?.get(creatureSlug) ??
    creatureByName?.get(creaturePart.toLowerCase()) ??
    creatures?.find((cr) => cr.name.toLowerCase() === creaturePart.toLowerCase() || cr.id === creatureSlug);
  if (!c) return null;
  return {
    text: creaturePart,
    kind: 'creature',
    creatureId: c.id,
    biomes: c.biomes,
  };
}

export function parseConversionRecipe(wt, matName, sources = []) {
  if (!wt) return null;
  const re = /\{\{Item\s+link\|([^|}]+)(?:\|(\d+))?\}\}\s*can be converted to\s*(?:(\d+)\s+)?.*?(?:at\s+(?:a\s+)?\[\[([^\]]+)\]\]|\.|$)/i;
  const match = wt.match(re);
  if (match) {
    const inputItemName = cleanText(match[1]).trim();
    const inputAmount = match[2] ? parseInt(match[2], 10) : 1;
    const yields = match[3] ? parseInt(match[3], 10) : 1;
    const station = (match[4] ? cleanText(match[4]).trim() : null) ??
      sources.find((s) => s.kind === 'station')?.text ??
      'Crafting';
    return {
      station,
      materials: [{ name: inputItemName, amount: inputAmount }],
      yields,
    };
  }
  return null;
}

export function resolveRecipeBiomes(items) {
  const itemsById = new Map(items.map((it) => [it.id, it]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const it of items) {
      if (it.biome == null && it.recipe?.materials?.length > 0) {
        let maxTier = -1;
        let maxBiome = null;
        let allKnown = true;
        for (const rm of it.recipe.materials) {
          const matItem = itemsById.get(rm.item);
          if (matItem && matItem.biome && matItem.tier != null) {
            if (matItem.tier > maxTier) {
              maxTier = matItem.tier;
              maxBiome = matItem.biome;
            }
          } else {
            allKnown = false;
          }
        }
        if (allKnown && maxTier > 0 && maxBiome) {
          it.biome = maxBiome;
          it.tier = maxTier;
          changed = true;
        }
      }
    }
  }
}

export function parseSources(sourceStr, creaturesBySlug) {
  if (!sourceStr) return [];
  const lines = String(sourceStr).replace(/<br\s*\/?>/gi, '\n').split('\n');
  const results = [];
  for (const line of lines) {
    const parts = line.split(/,\s*/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const linkMatch = trimmed.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
      const linkTarget = linkMatch ? linkMatch[1] : trimmed;
      const linkSlug = slug(linkTarget);
      const cleanedText = cleanText(trimmed).trim();

      const entry = { text: cleanedText, kind: 'other' };

      if (creaturesBySlug.has(linkSlug)) {
        const c = creaturesBySlug.get(linkSlug);
        entry.kind = 'creature';
        entry.creatureId = c.id;
        entry.biomes = c.biomes;
      } else if (KNOWN_STATIONS.some((s) => linkSlug.includes(s) || slug(cleanedText).includes(s))) {
        entry.kind = 'station';
      } else if (KNOWN_NPCS.some((n) => linkSlug.includes(n) || slug(cleanedText).includes(n))) {
        entry.kind = 'npc';
      } else if (/crypt|cave|chamber|mine|ruin|tower|fortress|chest|pile|deposit|vein|altar|tomb|village/i.test(cleanedText)) {
        entry.kind = 'location';
      }
      results.push(entry);
    }
  }
  return results;
}

