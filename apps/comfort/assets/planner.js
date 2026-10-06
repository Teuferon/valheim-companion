// Pure Comfort Planner calculations, shared by the browser and Node tests.
(function (root) {
  'use strict';
  const piecesOf = (selection, data) => {
    const entries = Array.isArray(selection) ? selection : selection?.pieces ?? [];
    const definitions = new Map((data.pieces ?? []).map(p => [p.id, p]));
    const seen = new Set();
    return entries.flatMap(entry => {
      const id = typeof entry === 'string' ? entry : entry?.id;
      if (seen.has(id) || !definitions.has(id)) return [];
      seen.add(id);
      return [{ ...definitions.get(id), settings: { ...(selection?.conditions?.[id] ?? {}), ...(typeof entry === 'object' ? entry : {}) } }];
    });
  };
  function contribution(piece) {
    if (piece.conditions?.lit && piece.settings.lit === false) return 0;
    if (piece.conditions?.heated && piece.settings.heated === false) return 0;
    if (piece.conditions?.hearthRange8m && piece.settings.hearthRange8m === false) return 1;
    return piece.comfort;
  }
  function comfortLevel(selection, data, { sheltered = true } = {}) {
    const rules = data.rules ?? { base: 1, shelter: 1, unshelteredCap: 1 };
    if (!sheltered) return { total: rules.unshelteredCap, parts: [{ id: 'base', comfort: rules.unshelteredCap }] };
    const parts = [{ id: 'base', comfort: rules.base }, { id: 'shelter', comfort: rules.shelter }];
    const categories = new Map();
    for (const piece of piecesOf(selection, data)) {
      const comfort = contribution(piece);
      if (!comfort) continue;
      const part = { id: piece.id, category: piece.category, comfort };
      if (!piece.category) parts.push(part);
      else if ((categories.get(piece.category)?.comfort ?? 0) < comfort) categories.set(piece.category, part);
    }
    parts.push(...categories.values());
    return { total: parts.reduce((sum, p) => sum + p.comfort, 0), parts };
  }
  function restedMinutes(level) { return 7 + (Number.isFinite(level) ? Math.max(0, level) : 0); }
  function cost(piece, data) {
    if (!piece.materials?.length) return Infinity;
    if (!root.VCShopping) throw new Error('Comfort Planner requires VCShopping');
    // Trader-only materials (e.g. Iron Pit from Hildir) cost coins and a trip, so they lose ties to craftable pieces.
    const traderOnly = m => data.items?.[m.item]?.sources?.length && data.items[m.item].sources.every(s => s.kind === 'npc');
    return root.VCShopping.breakdown(piece.materials, data.items ?? {}, 32).materials.reduce((sum, m) => sum + m.amount * (traderOnly(m) ? 50 : 1), 0);
  }
  function available(data, revealedBiomes, seasonal) {
    const revealed = new Set(revealedBiomes ?? []);
    return data.pieces.filter(p => p.tier != null && revealed.has(p.biome) && p.materials?.length && (seasonal || !p.seasonal));
  }
  function bestBuild(data, revealedBiomes, { seasonal = false } = {}) {
    const categories = new Map(), extras = [];
    const eligible = available(data, revealedBiomes, seasonal).map(p => ({ p, cost: cost(p, data) }))
      .sort((a, b) => b.p.comfort - a.p.comfort || a.cost - b.cost || a.p.id.localeCompare(b.p.id, 'en'));
    for (const { p } of eligible) {
      if (!p.category) extras.push(p.id);
      else if (!categories.has(p.category)) categories.set(p.category, p.id);
    }
    return [...categories.values(), ...extras];
  }
  function nextUpgrades(selection, data, revealedBiomes, { seasonal = false, limit = 5 } = {}) {
    const current = piecesOf(selection, data);
    const total = comfortLevel(selection, data).total;
    return available(data, revealedBiomes, seasonal).filter(p => !current.some(c => c.id === p.id)).map(piece => {
      const replaced = current.filter(p => piece.category && p.category === piece.category);
      const next = current.filter(p => !replaced.includes(p)).map(p => p.id).concat(piece.id);
      const gain = comfortLevel({ pieces: next, conditions: selection?.conditions }, data).total - total;
      return { id: piece.id, piece, replaces: replaced.map(p => p.id), gain, cost: cost(piece, data), selection: next };
    }).filter(p => p.gain > 0).sort((a, b) => b.gain - a.gain || a.cost - b.cost || a.id.localeCompare(b.id, 'en'))
      .slice(0, Number.isFinite(limit) ? Math.max(0, Math.min(100, Math.floor(limit))) : 5);
  }
  function sanitize(value, data) {
    const result = { version: 1, pieces: [], have: [], conditions: {}, sheltered: true, seasonal: false, breakdown: true };
    if (!value || typeof value !== 'object' || Array.isArray(value) || (value.version !== undefined && value.version !== 1)) return result;
    const known = new Set(data.pieces.map(p => p.id));
    const chosen = piecesOf(value, data);
    const categories = new Set();
    // Keep the first selection in a category, preserving predictable URL semantics.
    for (const p of chosen) {
      if (p.category && categories.has(p.category)) continue;
      if (p.category) categories.add(p.category);
      result.pieces.push(p.id);
    }
    result.have = [...new Set((Array.isArray(value.have) ? value.have : []).filter(id => known.has(id)))];
    for (const [id, settings] of Object.entries(value.conditions ?? {})) {
      if (!known.has(id) || !settings || typeof settings !== 'object') continue;
      result.conditions[id] = {};
      for (const key of ['lit', 'heated', 'hearthRange8m']) if (typeof settings[key] === 'boolean') result.conditions[id][key] = settings[key];
    }
    for (const key of ['sheltered', 'seasonal', 'breakdown']) if (typeof value[key] === 'boolean') result[key] = value[key];
    return result;
  }
  function encodeBuild(value, data) {
    const bytes = new TextEncoder().encode(JSON.stringify(sanitize(value, data)));
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
  function decodeBuild(hash, data) {
    try {
      const input = String(hash ?? '');
      const encoded = input.includes('=') || input.includes('#') ? new URLSearchParams(input.split('#').pop()).get('b') : input;
      if (!encoded || encoded.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
      const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!value || value.version !== 1 || !Array.isArray(value.pieces)) return null;
      return sanitize(value, data);
    } catch { return null; }
  }
  function shopping(selection, data, { have = selection?.have ?? [], breakdown = selection?.breakdown ?? true } = {}) {
    const wanted = piecesOf(selection, data).filter(p => !have.includes(p.id));
    const materials = root.VCShopping.sumMaterials(wanted.map(p => ({ materials: p.materials })), data.items);
    const raw = root.VCShopping.breakdown(materials, data.items, 32);
    const stations = new Map();
    function station(idOrName) {
      if (!idOrName) return;
      const definition = data.stations.find(s => s.id === idOrName || s.name === idOrName);
      const id = definition?.id ?? idOrName;
      if (stations.has(id)) return;
      stations.set(id, definition ?? { id, name: idOrName, materials: [] });
      station(definition?.unlock?.station);
    }
    wanted.forEach(p => station(p.station));
    raw.steps.forEach(s => station(s.station.split(',')[0]));
    return { wanted, materials: breakdown ? raw.materials : materials, rawMaterials: raw.materials,
      steps: breakdown ? raw.steps : [], stations: [...stations.values()],
      nonTeleportable: [...materials, ...raw.materials].filter((m, i, list) => data.items[m.item]?.teleportable === false && list.findIndex(x => x.item === m.item) === i) };
  }
  root.VCComfort = Object.freeze({ comfortLevel, restedMinutes, bestBuild, nextUpgrades, encodeBuild, decodeBuild, sanitize, cost, shopping });
})(globalThis);
