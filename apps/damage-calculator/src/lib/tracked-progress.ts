import { BIOMES, type BiomeId } from '../data/biomes';

interface ProgressCore {
  revealedBiomes(biomes: { id: string; order: number; bosses: string[] }[]): string[];
  onChange(callback: () => void): () => void;
}

const sharedProgress = () => (globalThis as typeof globalThis & { VCProgress?: ProgressCore }).VCProgress;
const trackerBiomes = BIOMES.map((biome, index) => ({
  id: biome.id, order: index + 1, bosses: biome.boss ? [biome.boss] : [],
}));

/** Subscribe to same-tab checklist changes and cross-tab storage updates. */
export function subscribeTrackedProgress(onChange: () => void): () => void {
  let unsubscribeCore: (() => void) | undefined;
  const subscribeCore = () => {
    const core = sharedProgress();
    if (!unsubscribeCore && core) unsubscribeCore = core.onChange(onChange);
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key === null || event.key === 'vc.progress' || event.key === 'vc.openBiomes') onChange();
  };
  // The deferred classic script may finish after React mounts.
  const script = document.querySelector('script[src*="shared/progress/core.js"]');
  const coreLoaded = () => { subscribeCore(); onChange(); };
  subscribeCore();
  script?.addEventListener('load', coreLoaded);
  window.addEventListener('storage', storageChanged);
  return () => {
    unsubscribeCore?.();
    script?.removeEventListener('load', coreLoaded);
    window.removeEventListener('storage', storageChanged);
  };
}

/** Prefer the shared in-memory state, including when storage is blocked. */
export function readTrackedBiome(storage: Pick<Storage, 'getItem'>, core = sharedProgress()): BiomeId {
  if (core) {
    const revealed = new Set(core.revealedBiomes(trackerBiomes));
    return BIOMES.filter(biome => revealed.has(biome.id)).at(-1)?.id ?? BIOMES[0].id;
  }
  // React can mount before the classic core; mirror its existing reveal ladder.

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
