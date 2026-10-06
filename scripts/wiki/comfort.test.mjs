import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseComfort, parseStructure, maximumByBiome } from './fetch-comfort.mjs';

const excerpt = `{| class="wikitable"
!Category
!width="40%" | Items
!Comfort
!Notes
|-
| rowspan="2" | Base Comfort
| When sitting near a fireplace.
|1
| rowspan="2" | Does not stack
|-
| While in a [[Shelter Effect|shelter]] near a fireplace.
|2
|-
| rowspan="2" | Fire
| {{item link|Campfire}}<br/>{{item link|Standing Brazier}}
|1
| rowspan="2" | Only when lit
|-
|{{item link|Hearth}}
|2
|-
|
|{{item link|Maypole}}
|1
|Summer only
|-
|
|{{item link|Yule Tree}}
|1
|Yule only
|}
{| class="wikitable"
!Biome
!Max comfort level
!Requirements
|-
|[[Black Forest]]
|13
|[[Campfire]]
|}`;
test('source table, continuations and empty categories', () => {
  const d = parseComfort(excerpt);
  assert.equal(d.categories.length, 1);
  assert.equal(d.categories[0].id, 'fire');
  assert.equal(d.categories[0].notes, 'Only when lit');
  assert.equal(d.pieces.length, 5);
  assert.equal(d.pieces[0].comfort, 1);
  assert.equal(d.pieces[2].comfort, 2);
  assert.equal(d.pieces[2].category, 'fire');
  assert.equal(d.pieces[3].category, null);
  assert.equal(d.pieces[4].category, null);
  assert.ok(!d.pieces.some(p => p.name === 'Base Comfort'));
  assert.equal(d.wikiMaxByBiome.ocean, 13);
});
test('Dragon Bed structure excerpt', () => {
  const p = parseStructure('Dragon Bed', `{{infobox structure
|title=Dragon bed
|image=Dragon bed.png
|id=piece_bed02
|source=[[Workbench]]
|materials=
* [[Finewood]] x40
* [[Deer Hide]] x7
* [[Wolf Pelt]] x4
* [[Feathers]] x10
* [[Iron Nails]] x15
|comfort=Bed 2
}}`);
  assert.equal(p.infoboxComfort, 2);
  assert.equal(p.station, 'workbench');
  assert.equal(p.gameId, 'piece_bed02');
  assert.equal(p.materials.length, 5);
  assert.deepEqual(p.materials[0], { item: 'finewood', amount: 40 });
  assert.deepEqual(p.materials[4], { item: 'iron-nails', amount: 15 });
});
test('group tables, malformed tabbers and size-dependent pots', () => {
  const table = `{|\n!Chair!!Materials!!Size!!Internal id!!Comfort\n|-\n|{{Item link|Chair}}||\n* [[Finewood]] x4\n||1x1\n||piece_chair02\n||2\n|}`;
  const p = parseStructure('Chair', table);
  assert.deepEqual(p.materials, [{ item: 'finewood', amount: 4 }]);
  assert.equal(p.gameId, 'piece_chair02');
  assert.equal(p.infoboxComfort, 2);
  const malformed = '{{infobox structure|title=Item stand (vertical)|image=vertical.png|materials=* [[Finewood]] x4\n|-|\n{{infobox structure|title=Item stand (horizontal)|image=horizontal.png|materials=* [[Finewood]] x4';
  assert.equal(parseStructure('Item Stand (horizontal)', malformed).imageFile, 'horizontal.png');
  const pots = '{{infobox structure|materials=* {{item link|Pot Shard}} x3, x4, x5\n* {{item link|Charcoal Resin}} x1\n|id=piece_pot3 (small)<br>piece_pot1 (medium)<br>piece_pot2 (large)}}';
  assert.equal(parseStructure('Medium green pot', pots).materials[0].amount, 4);
  assert.equal(parseStructure('Large green pot', pots).gameId, 'piece_pot2');
});
test('mandatory sheltered non-seasonal maximum for every biome', () => {
  const data = JSON.parse(readFileSync('data/comfort.json', 'utf8'));
  const expected = { meadows: 5, 'black-forest': 13, ocean: 13, swamp: 15, mountain: 17, plains: 19, mistlands: 20, ashlands: 22, 'deep-north': 22 };
  assert.deepEqual(data.wikiMaxByBiome, { meadows: 5, 'black-forest': 13, swamp: 15, mountain: 17, plains: 19, mistlands: 20, ashlands: 22, 'deep-north': 22, ocean: 13 });
  assert.deepEqual(maximumByBiome(data), expected);
  assert.equal(new Set(data.pieces.map(p => p.id)).size, data.pieces.length);
  assert.equal(data.pieces.filter(p => p.seasonal).length, 6);
  assert.equal(data.pieces.find(p => p.id === 'barber-station').tier, 2);
});
