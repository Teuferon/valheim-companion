// Pure helpers shared by the Bestiary UI and regression tests.
(function (root) {
  'use strict';
  function raidIsHidden(raid, creatures, openBiomes) {
    return (raid.enabledBy || []).some(name => {
      const boss = Object.values(creatures).find(creature =>
        creature.name === name && ['boss', 'miniboss'].includes(creature.kind));
      return boss && boss.biomes.length && !boss.biomes.some(id => openBiomes.has(id));
    });
  }
  function encodeProfile(player) {
    const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, player }));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeProfile(encoded) {
    if (!encoded || encoded.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
      throw new Error('Invalid profile encoding');
    }
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, char => char.charCodeAt(0)),
    ));
    if (value?.version !== 1 || !value.player || typeof value.player !== 'object' || Array.isArray(value.player)
      || !value.player.skills || typeof value.player.skills !== 'object' || Array.isArray(value.player.skills)
      || !Object.values(value.player.skills).some(skill => typeof skill === 'number' && Number.isFinite(skill))) {
      throw new Error('Invalid profile payload');
    }
    return value.player;
  }
  function creatureBiome(creature, biomes, openBiomes) {
    const candidates = biomes.filter(biome => creature.biomes.includes(biome.id))
      .sort((a, b) => a.order - b.order);
    return candidates.find(biome => openBiomes.has(biome.id)) || candidates[0] || null;
  }
  root.VCExtras = { raidIsHidden, encodeProfile, decodeProfile, creatureBiome };
})(globalThis);
