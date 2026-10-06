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
  root.VCExtras = { raidIsHidden };
})(globalThis);
