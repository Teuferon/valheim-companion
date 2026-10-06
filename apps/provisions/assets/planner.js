// Pure loadout calculations; shared shopping calculations remain in VCShopping.
(function () {
  'use strict';
  function score(food, focus) {
    const values = [food.health || 0, food.stamina || 0, food.eitr || 0];
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    if (focus === 'Balanced') return Math.min(values[0], values[1]) / Math.max(values[0], values[1], 1);
    return ({ Health: food.health, Stamina: food.stamina, Eitr: food.eitr }[focus] || 0) / total;
  }
  globalThis.VPPlanner = { score };
})();
