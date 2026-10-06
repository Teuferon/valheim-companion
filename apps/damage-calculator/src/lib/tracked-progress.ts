import { BIOMES, type BiomeId } from '../data/biomes';

/** Mirror VCProgress.revealedBiomes using the calculator's existing boss ladder. */
export function readTrackedBiome(storage: Pick<Storage, 'getItem'>): BiomeId {
  const read = (key: string): unknown => {
    try { return JSON.parse(storage.getItem(key) ?? 'null'); } catch { return null; }
  };
  const raw = read('vc.progress');
  const state = raw && typeof raw === 'object' && !Array.isArray(raw)
    && (!('version' in raw) || raw.version === 1)
    ? raw as { visited?: unknown; defeated?: unknown } : {};
  const manual = read('vc.openBiomes');
  const revealed = new Set<unknown>([
    BIOMES[0].id,
    ...(Array.isArray(state.visited) ? state.visited : []),
    ...(Array.isArray(manual) ? manual : []),
  ]);
  const defeated = state.defeated && typeof state.defeated === 'object' && !Array.isArray(state.defeated)
    ? state.defeated as Record<string, unknown> : {};
  let last = -1;
  BIOMES.forEach((biome, index) => {
    if (biome.boss && defeated[biome.boss] === true) last = index;
  });
  if (last >= 0) {
    while (last + 1 < BIOMES.length) {
      last++;
      if (BIOMES[last].boss) break;
    }
    BIOMES.slice(0, last + 1).forEach(biome => revealed.add(biome.id));
  }
  return BIOMES.filter(biome => revealed.has(biome.id)).at(-1)!.id;
}
