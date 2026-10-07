import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEvents, parseBoss, parseItemSources } from './fetch-expedition.mjs';
import { eventRows, enrichCreatures } from './creature-extras.mjs';
const load = name => JSON.parse(readFileSync(new URL('../../data/' + name + '.json', import.meta.url)));
const creatures = load('creatures');
const sample = `=== World-based event requirements ===
{| class="wikitable"
!Event Name
!Start message
!End message
!Creatures
! data-sort-type="number" | Enabled by
! data-sort-type="number" | Disabled by
! data-sort-type="number" | Biome(s)
!Duration (Seconds)
|-
|army_eikthyr
|"Eikthyr rallies the creatures of the forest."
|"The creatures are calming down."
|[[Boar]]s and [[Neck]]s
| data-sort-value="0" | Start of the world
| data-sort-value="1" | [[Eikthyr]]
| [[Meadows]] or [[Black Forest]]
|90
|-
|army_moder
|"A cold wind blows from the mountains."
|"The cold wind is gone."
|[[Drake]]s
(Also applies [[Freezing Effect|Freezing]] on the area)
| data-sort-value="3" | [[Bonemass]]
| data-sort-value="4" | [[Moder]]
| [[Meadows]], [[Black Forest]], [[Swamp]], [[Mountain]], or [[Plains]]
|150
|-
|army_charredspawners
|"The dead have been summoned."
|"The dead lie still once more."
|[[Monument of Torment|Monument of Torments]] (won't despawn even after the raid is over)
|[[The Queen]]
|[[Fader]]
| [[Black Forest]], [[Plains]], [[Mistlands]], [[Ashlands]], or [[Deep North]]
|90
|-
|army_jotuns
|"The Jotun have found you."
|"The Jotun withdraw."
|[[Krigen|Krigens]] and [[Elaking|Elakings]]
|[[Krigen]] or [[Hexen]]
|[[Kall Fimbulbringer]]
|[[Meadows]], [[Black Forest]], [[Swamp]], [[Mountain]], [[Plains]], [[Mistlands]] or [[Deep North]]
|90
|-
|foresttrolls
|"The ground is shaking."
|"The shakes starts to fade."
|[[Troll]]s
| data-sort-value="2.1" | [[Troll]] and [[The Elder]]
| data-sort-value="1.0E+17" |
| [[Meadows]], [[Black Forest]], [[Swamp]], or [[Plains]]
|80
|}
=== Player-based requirements ===
{| class="wikitable"
!Event Name !! Required defeat
|-
|not-a-world-event || [[Troll]]
|}`;
test('pasted Events sample preserves modes, notes and references', () => {
  const {events,unmatched} = parseEvents(sample,creatures);
  const by = id => events.find(e=>e.id===id);
  assert.equal(events.length,5);
  assert.deepEqual(by('army_eikthyr').enabledBy,{mode:'start',ids:[]});
  assert.deepEqual(by('army_eikthyr').disabledBy,['eikthyr']);
  assert.deepEqual(by('army_eikthyr').creatures,['boar','neck']);
  assert.equal(by('army_eikthyr').durationSeconds,90);
  assert.deepEqual(by('foresttrolls').enabledBy,{mode:'all',ids:['troll','the-elder']});
  assert.deepEqual(by('foresttrolls').disabledBy,[]);
  assert.deepEqual(by('army_jotuns').enabledBy,{mode:'any',ids:['krigen','hexen']});
  assert.deepEqual(by('army_jotuns').creatures,['krigen','elaking']);
  assert.ok(by('army_moder').notes.some(n=>n.includes('Freezing')));
  assert.deepEqual(by('army_moder').creatures,['drake']);
  assert.ok(by('army_charredspawners').notes.some(n=>n.includes('Monument of Torment')));
  assert.deepEqual(unmatched,['army_charredspawners: Monument of Torment']);
  assert.equal(eventRows(sample,true).length,5);
});
test('Bestiary keeps its legacy raid shape through the shared reader', () => {
  const copy=structuredClone(creatures); enrichCreatures(copy,{Events:sample});
  assert.deepEqual(copy.find(c=>c.id==='troll').raids[0],{event:'foresttrolls',name:'The ground is shaking.',enabledBy:['Troll','The Elder'],disabledBy:[],biomes:['Meadows','Black Forest','Swamp','Plains']});
});
test('after Eikthyr and The Elder exactly three raids can happen', () => {
  const events=load('events'), defeated=new Set(['eikthyr','the-elder']), open=new Set(['meadows','black-forest','ocean','swamp']);
  const condition = (e,id) => defeated.has(id) || e.conditions.some(c=>c.id===id&&!c.boss&&c.biomes.some(b=>open.has(b)));
  const now=events.filter(e=>!e.disabledBy.some(id=>defeated.has(id)) && e.biomes.some(b=>open.has(b)) && (e.enabledBy.mode==='start'||e.enabledBy.ids.length&&(e.enabledBy.mode==='all'?e.enabledBy.ids.every(id=>condition(e,id)):e.enabledBy.ids.some(id=>condition(e,id)))));
  // Troll's biome is open. Brenna's Black Forest chest event is the only
  // boss-independent event whose prerequisite biome is open at this stage.
  // Geirrhafa needs Mountain; Zil & Thungr and northern enemies remain locked.
  assert.deepEqual(now.map(e=>e.id).sort(),['army_bonemass','foresttrolls','hildirboss1']);
});
test('missing wiki fields stay null; Queen needs the verified key', () => {
  assert.equal(parseBoss(creatures.find(c=>c.id==='eikthyr'),'','').altar,null);
  assert.equal(parseBoss(creatures.find(c=>c.id==='eikthyr'),'','').forsakenPower,null);
  assert.deepEqual(load('expedition').find(b=>b.id==='the-queen').summonItems,[{id:'sealbreaker',count:1}]);
  assert.equal(load('expedition').find(b=>b.id==='kall-fimbulbringer').forsakenPower,null);
});

test('item source parsing removes wiki bullets before classifying sources',()=>{
  const creatures=new Map([['greydwarf-brute',{id:'greydwarf-brute',name:'Greydwarf Brute',biomes:['black-forest']}]]);
  const sources=parseItemSources('*[[Greydwarf Brute]]<br/>* [[Greydwarf Nest]]',creatures);
  assert.equal(sources[0].text,'Greydwarf Brute');
  assert.equal(sources[0].kind,'creature');
  assert.equal(sources[0].creatureId,'greydwarf-brute');
  assert.equal(sources[1].text,'Greydwarf Nest');
  assert.ok(sources.every(s=>!s.text.startsWith('*')));
});
