// Pure classic-script core: no DOM, storage, or copied recommendation logic.
(function (root) {
  'use strict';

  const bosses = data => [
    ...(Array.isArray(data.expedition) ? data.expedition : data.expedition?.bosses || [])
  ].sort((a, b) => a.order - b.order);
  const defeated = progress => progress?.defeated || {};

  function nextBoss(progress, data) {
    return bosses(data).find(b => !defeated(progress)[b.id]) || null;
  }

  function targetBoss(prep, progress, data) {
    const manual = prep?.auto === false && bosses(data).find(b => b.id === prep.boss);
    return manual || nextBoss(progress, data);
  }

  function revealed(progress, data) {
    const ordered = bosses(data);
    const done = ordered.filter(b => defeated(progress)[b.id]);
    const last = done.length ? Math.max(...done.map(b => b.order)) : 0;
    const end = ordered.find(b => b.order > last)?.order ?? ordered.at(-1)?.order ?? 1;
    return [...new Set([
      'meadows',
      ...ordered.filter(b => b.order <= end).map(b => b.biome),
      ...(end >= 4 ? ['ocean'] : []),
      ...(progress?.visited || [])
    ])];
  }

  function hidden(event, data, open) {
    const conditions = event.conditions || [];
    const locked = c => !c.biomes.some(b => open.includes(b));
    return conditions.length > 0 && (event.enabledBy.mode === 'any'
      ? conditions.every(locked)
      : conditions.some(locked));
  }

  function enabled(event, progress, open) {
    const done = defeated(progress);
    const satisfies = id => done[id] || event.conditions.some(c =>
      c.id === id && !c.boss && c.biomes.some(b => open.includes(b))
    );
    return event.enabledBy.mode === 'start' || event.enabledBy.ids.length > 0 &&
      (event.enabledBy.mode === 'any'
        ? event.enabledBy.ids.some(satisfies)
        : event.enabledBy.ids.every(satisfies));
  }

  function active(event, progress, open) {
    return !event.disabledBy.some(id => defeated(progress)[id]) &&
      enabled(event, progress, open) && event.biomes.some(b => open.includes(b));
  }

  function raidStates(progress, data, revealedBiomes = revealed(progress, data)) {
    const open = [...revealedBiomes];
    const target = nextBoss(progress, data);
    const after = {
      ...progress,
      defeated: {
        ...defeated(progress),
        ...(target ? {
          [target.id]: true
        } : {})
      }
    };
    const afterOpen = [...new Set([...open, ...revealed(after, data)])];
    const result = {
      now: [],
      ended: [],
      next: []
    };
    for (const event of data.events || []) {
      if (hidden(event, data, open)) {
        continue;
      }
      if (event.disabledBy.some(id => defeated(progress)[id])) {
        result.ended.push(event);
      } else if (active(event, progress, open)) {
        result.now.push(event);
      } else if (target && active(event, after, afterOpen)) {
        result.next.push(event);
      }
    }
    return result;
  }

  function afterDefeating(bossId, progress, data, open = revealed(progress, data)) {
    if (!bosses(data).some(b => b.id === bossId)) {
      return {
        added: [],
        removed: []
      };
    }
    const after = {
      ...progress,
      defeated: {
        ...defeated(progress),
        [bossId]: true
      }
    };
    const nextOpen = [...new Set([...open, ...revealed(after, data)])];
    const now = (data.events || []).filter(e => !hidden(e, data, open) && active(e, progress, open));
    const later = (data.events || []).filter(e => !hidden(e, data, open) && active(e, after, nextOpen));
    return {
      added: later.filter(e => !now.some(n => n.id === e.id)),
      removed: now.filter(e => !later.some(n => n.id === e.id))
    };
  }

  function incomingDamage(boss) {
    const totals = {};
    for (const attack of boss?.stars?.[0]?.attacks || []) {
      for (const [type, amount] of Object.entries(attack.damage || {})) {
        if (['chop', 'pickaxe'].includes(type) || !Number.isFinite(amount) || amount <= 0) {
          continue;
        }
        totals[type] = (totals[type] || 0) + amount;
      }
    }
    return Object.entries(totals).map(([type, amount]) => ({
      type,
      amount
    })).sort((a, b) => b.amount - a.amount || a.type.localeCompare(b.type));
  }

  function meadQuantity(mead, minutes = 30) {
    const interval = Math.max(Number(mead.duration) || 0, Number(mead.cooldown) || 0);
    return interval > 0 ? Math.ceil(minutes * 60 / interval) + 1 : 1;
  }

  function packingList(prep, ctx = {}) {
    const minutes = Number.isFinite(prep.minutes) && prep.minutes > 0 ? Math.min(240, prep.minutes) : 30;
    const lines = new Map();
    const add = (id, quantity, kind) => {
      if (id && quantity > 0) {
        const old = lines.get(id);
        lines.set(id, {
          id,
          item: id,
          quantity: (old?.quantity || 0) + quantity,
          kind
        });
      }
    };
    for (const item of (ctx.bossPrep || prep).summonItems || []) {
      add(item.id, item.count, 'summon');
    }
    const weapon = ctx.weapon?.weapon || ctx.weapon?.id || ctx.weapon;
    if (typeof weapon === 'string') {
      add(weapon, 1, 'weapon');
    }
    for (const food of ctx.foods || []) {
      add(food.id, Math.ceil(minutes * 60 / Math.max(food.duration || 1, 1)), 'food');
    }
    for (const entry of ctx.meads || []) {
      const mead = entry.mead || entry;
      add(mead.id, meadQuantity(mead, minutes), 'mead');
    }
    if (prep.portal && ctx.items?.portal?.recipe?.materials?.length) {
      add('portal', 1, 'portal');
    }
    return [...lines.values()];
  }

  const clamp = (v, min, max, fallback) => typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, Math.round(v)))
    : fallback;

  function sanitize(value, data) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      version: 1,
      auto: source.auto !== false,
      boss: bosses(data).some(b => b.id === source.boss) ? source.boss : null,
      players: clamp(source.players, 1, 5, 1),
      minutes: clamp(source.minutes, 5, 240, 30),
      portal: source.portal === true,
      checked: Array.isArray(source.checked)
        ? [...new Set(source.checked.filter(id =>
          typeof id === 'string' && /^[a-z0-9-]{1,100}$/.test(id)
        ))].slice(0, 100)
        : [],
      breakdown: source.breakdown !== false
    };
  }

  function encodePrep(value, data) {
    const bytes = new TextEncoder().encode(JSON.stringify(sanitize(value, data)));
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }

  function decodePrep(hash, data) {
    try {
      const encoded = new URLSearchParams(String(hash).replace(/^#/, '')).get('x');
      if (!encoded || encoded.length > 16000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
        return null;
      }
      const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
      const value = JSON.parse(new TextDecoder('utf-8', {
        fatal: true
      }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
      if (value?.version !== 1 || typeof value.boss !== 'string' || !Array.isArray(value.checked)) {
        return null;
      }
      return sanitize(value, data);
    } catch {
      return null;
    }
  }

  root.VCExpedition = Object.freeze({
    nextBoss,
    targetBoss,
    meadQuantity,
    raidStates,
    afterDefeating,
    incomingDamage,
    packingList,
    encodePrep,
    decodePrep,
    sanitize,
    revealed,
    hidden
  });
})(globalThis);
