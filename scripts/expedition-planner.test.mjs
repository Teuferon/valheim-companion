import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildExpeditionData} from './build-expedition-data.mjs';
import '../apps/expedition/assets/planner.js';
import '../apps/bestiary/assets/rank.js';
const load=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const data={events:load('events'),expedition:load('expedition')}, core=globalThis.VCExpedition;
const creatures=load('creatures'), boss=id=>creatures.find(c=>c.id===id);
test('world progression and spoiler filtering',()=>{
  assert.equal(core.nextBoss({},data).id,'eikthyr');
  assert.deepEqual(core.raidStates({},data).now.map(e=>e.id),['army_eikthyr']);
  const one={defeated:{eikthyr:true}};
  assert.ok(core.raidStates(one,data).ended.some(e=>e.id==='army_eikthyr'));
  assert.ok(core.raidStates(one,data).now.some(e=>e.id==='army_theelder'));
  const two={defeated:{eikthyr:true,'the-elder':true}};
  assert.deepEqual(core.raidStates(two,data).now.map(e=>e.id).sort(),['army_bonemass','foresttrolls','hildirboss1']);
  const changes=core.afterDefeating('bonemass',two,data);
  for(const id of ['blobs','ghosts','skeletons']) assert.ok(changes.added.some(e=>e.id===id));
  assert.ok(changes.removed.some(e=>e.id==='army_bonemass'));
  assert.ok(!Object.values(core.raidStates(two,data,['meadows'])).flat().some(e=>e.id==='army_moder'));
  const late={defeated:Object.fromEntries(data.expedition.slice(0,6).map(b=>[b.id,true]))};
  assert.ok(!core.raidStates(late,data).next.some(e=>e.id==='army_jotuns'));
  assert.ok(core.hidden(data.events.find(e=>e.id==='army_jotuns'),data,['meadows','ashlands']));
  assert.equal(core.nextBoss({defeated:Object.fromEntries(data.expedition.map(b=>[b.id,true]))},data),null);
});
test('incoming damage and existing multiplayer HP calculations',()=>{
  assert.deepEqual(core.incomingDamage(boss('bonemass')),[{type:'poison',amount:180},{type:'blunt',amount:80}]);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:1}),5000);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:3}),8000);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:7}),11000);
});
test('packing food servings, resistance meads, portal and summon costs',()=>{
  const ctx={bossPrep:data.expedition.find(b=>b.id==='bonemass'),weapon:'bronze-mace',foods:[{id:'food',duration:1200}],meads:[{id:'mead',duration:600}],items:{portal:{recipe:{materials:[{item:'finewood',amount:20}]}}}};
  const list=minutes=>Object.fromEntries(core.packingList({minutes,portal:true},ctx).map(l=>[l.id,l.quantity]));
  assert.equal(list(30).food,2);assert.equal(list(60).food,3);
  assert.equal(list(30).mead,4);assert.equal(list(60).mead,7);
  assert.equal(list(30)['withered-bone'],10);assert.equal(list(30)['bronze-mace'],1);assert.equal(list(30).portal,1);
});
test('prep round trip and hostile hashes',()=>{
  const state=core.sanitize({boss:'bonemass',players:3,minutes:60,portal:true,checked:['food']},data);
  assert.deepEqual(core.decodePrep('#x='+core.encodePrep(state,data),data),state);
  for(const hash of ['#x=???','#x=abc','#x='+btoa('{}'),'#x='+btoa('null'),'#x='+ 'a'.repeat(17000),'#boss=bonemass']) assert.equal(core.decodePrep(hash,data),null);
  assert.equal(core.sanitize({players:Infinity,minutes:-5,checked:['__proto__',null]},data).players,1);
});
test('browser bundle supplements only new materials and preserves the three data groups',()=>{
  const bundle=buildExpeditionData();
  assert.deepEqual(Object.keys(bundle).sort(),['events','expedition','tips']);
  assert.equal(bundle.expedition.bosses.length,8);
  assert.equal(Object.keys(bundle.expedition.items).length,10);
  assert.ok(Object.values(bundle.expedition.items).every(i=>i.expedition===true));
  assert.ok(!bundle.expedition.items.wood);
  assert.ok(bundle.expedition.items.portal.recipe.materials.length);
  assert.ok(bundle.expedition.stations.some(s=>s.id==='galdr-table'));
  assert.equal(core.nextBoss({},bundle).id,'eikthyr');
});
test('Expedition search keeps dedicated destinations and prerequisite biome metadata',()=>{
  const context={};vm.runInNewContext(readFileSync(new URL('../apps/hub/data/search.js',import.meta.url),'utf8'),context);
  const index=context.VC_EXPEDITION_SEARCH_INDEX;
  assert.equal(index.filter(i=>i.url.startsWith('/expedition/#boss=')).length,8);
  assert.equal(index.filter(i=>i.url==='/expedition/#raids').length,21);
  assert.ok(index.find(i=>i.name==='The ground is shaking.').requiredBiomes.includes('black-forest'));
  assert.deepEqual([...index.find(i=>i.name==='The Jotun have found you.').requiredBiomes],['deep-north']);
  assert.ok(!context.VC_SEARCH_INDEX.some(i=>i.type==='expedition'));
});
