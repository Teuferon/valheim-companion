import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
