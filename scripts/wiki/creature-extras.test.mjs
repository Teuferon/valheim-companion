import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichCreatures } from './creature-extras.mjs';

test('extras match creature link targets and retain raid requirements', () => {
  const creatures = [
    { id: 'troll', trophy: { image: 'troll.png' } },
    { id: 'wolf', tameable: true },
    { id: 'hen', tameable: false },
    { id: 'fuling' },
  ];
  const unmatched = enrichCreatures(creatures, {
    Trophies: '{|\n! Trophy !! Drop chance !! Usage\n|-\n| [[Troll]]<br>[[File:Troll Trophy.png|48px]] || 50% || {{Item link|Trollstav}}<br>[[Mossy Fishing Bait]]\n|}',
    Taming: '{|\n! Creature !! Required Food !! Eating Range\n|-\n| [[Wolf|Wolves]] || [[Boar Meat]], [[Deer Meat]] || 1.4 meters\n|-\n| [[Hen]] || [[Barley]] || ? meters\n|}\nTaming always requires 600 successful ticks (30 minutes).',
    Events: '{|\n! Event Name !! Start message !! Creatures !! Enabled by !! Disabled by !! Biome(s)\n|-\n| army_goblin || "The horde is attacking!" || [[Fuling|Fulings]] and [[Missing]] || [[Moder]] || [[Yagluth]] || [[Plains]]\n|}',
  });
  assert.deepEqual(creatures[0].trophy, { name: 'Troll Trophy', image: 'troll.png', dropChance: 50, usage: ['Trollstav', 'Mossy Fishing Bait'] });
  assert.deepEqual(creatures[1].taming, { foods: ['Boar Meat', 'Deer Meat'], eatingRange: 1.4, tameTime: 30 });
  assert.deepEqual(creatures[2].taming, { foods: ['Barley'], eatingRange: null });
  assert.deepEqual(creatures[3].raids, [{ event: 'army_goblin', name: 'The horde is attacking!', enabledBy: ['Moder'], disabledBy: ['Yagluth'], biomes: ['Plains'] }]);
  assert.deepEqual(unmatched, ['Events/army_goblin: [[Missing]]']);
});
