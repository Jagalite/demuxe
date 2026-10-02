// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const plans=[{id:'native-direct',eligible:true},{id:'hybrid-private',eligible:true}];
function model(){let state=initialPlayerControl();return {get state(){return state;},send(input){const before=state,encoded=JSON.stringify(before),decision=transitionPlayer(state,input);state=decision.state;assert.equal(JSON.stringify(before),encoded);return decision;},cap(change){return this.send({type:'routing.capabilities',revision:state.routing.evidence.capabilities.revision,change});},tier(change){return this.send({type:'routing.tiers',revision:state.routing.evidence.tiers.revision,change});}};}
const begin=sourceIdentity=>({kind:'event',event:{kind:'begin',sourceIdentity,plans}});
const verified={kind:'event',event:{kind:'update',planId:'native-direct',state:'verified',evidence:{outputVerified:true}}};

test('source clear atomically retires both evidence domains and preserves monotonic source IDs',()=>{
 const m=model();m.cap({kind:'identity'});m.cap(begin('source-1'));m.cap(verified);m.tier({kind:'identity'});m.tier({kind:'failure',key:'1:config:native-direct',reason:'unsupported',now:0});
 const before=m.state,evidence=before.routing.evidence;
 m.send({type:'source.clear'});
 assert.deepEqual(m.state.routing.evidence.capabilities.value,{records:[],verified:[]});assert.deepEqual(m.state.routing.evidence.tiers.value,{failures:[]});
 for(const domain of ['capabilities','tiers']){assert.equal(m.state.routing.evidence[domain].serial,1);assert.equal(m.state.routing.evidence[domain].identityEpoch,1);assert.ok(m.state.routing.evidence[domain].revision>evidence[domain].revision);}
 assert.equal(m.state.revision,before.revision+1);
 assert.equal(m.send({type:'routing.capabilities',revision:evidence.capabilities.revision,change:verified}).accepted,false);
 m.cap({kind:'identity'});m.tier({kind:'identity'});assert.equal(m.state.routing.evidence.capabilities.serial,2);assert.equal(m.state.routing.evidence.tiers.serial,2);
});
test('operation retirement rejects captured facts while keeping accepted capability and retry evidence',()=>{
 for(const retirement of ['operation.retire','operation.cancel','operation.finish','operation.release']){
  const m=model(),id=m.send({type:'operation.admit',kind:'opening'}).id;m.send({type:'operation.start',id});m.cap(begin('source-1'));m.cap(verified);m.tier({kind:'failure',key:'x',reason:'unsupported',now:3});
  const old=m.state.routing.evidence;
  m.send(retirement==='operation.retire'?{type:retirement,terminal:false}:{type:retirement,id});
  assert.equal(m.state.routing.evidence.capabilities.value,old.capabilities.value);assert.equal(m.state.routing.evidence.tiers.value,old.tiers.value);
  assert.equal(m.send({type:'routing.capabilities',revision:old.capabilities.revision,change:verified}).accepted,false);
  assert.equal(m.send({type:'routing.tiers',revision:old.tiers.revision,change:{kind:'failure',key:'late',reason:'late',now:5}}).accepted,false);
 }
});
test('terminal Player cannot allocate IDs or repopulate evidence with current versions',()=>{
 const m=model();m.send({type:'operation.retire',terminal:true});
 assert.equal(m.cap({kind:'identity'}).accepted,false);assert.equal(m.cap(begin('late')).accepted,false);assert.equal(m.tier({kind:'identity'}).accepted,false);assert.equal(m.tier({kind:'failure',key:'late',reason:'late',now:0}).accepted,false);
 assert.equal(m.state.routing.evidence.capabilities.serial,0);assert.equal(m.state.routing.evidence.tiers.serial,0);
});
test('real Player adapters publish only through their composed evidence owner',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const source={};
 p.runtimeCapabilities.begin(source,plans);p.runtimeCapabilities.update('native-direct','verified',{outputVerified:true});p.tierAttempts.failure(source,'configuration','native-direct','unsupported',10);
 assert.equal(p.control.routing.evidence.capabilities.value.records[0].state,'verified');assert.equal(p.runtimeCapabilities.snapshot()[0].evidence.outputVerified,true);
 assert.equal(p.control.routing.evidence.tiers.value.failures[0].reason,'unsupported');assert.equal(p.tierAttempts.reason(source,'configuration','native-direct',60009),'unsupported');
 assert.equal(p.tierAttempts.reason(source,'configuration','native-direct',60010),undefined);assert.equal(p.control.routing.evidence.tiers.value.failures.length,0);
 const id=p.runtimeCapabilities.snapshot()[0].sourceIdentity,key=p.tierAttempts.key(source,'configuration','native-direct');
 p.dispatchControl({type:'source.clear'});assert.deepEqual(p.runtimeCapabilities.snapshot(),[]);assert.equal(p.tierAttempts.reason(source,'configuration','native-direct',10),undefined);
 p.runtimeCapabilities.begin(source,plans);assert.notEqual(p.runtimeCapabilities.snapshot()[0].sourceIdentity,id);assert.notEqual(p.tierAttempts.key(source,'configuration','native-direct'),key);
});
test('reentrant evidence getter cannot publish after source clear or command retirement',async t=>{
 for(const action of ['clear','retire','replace']){
  const p=unitPlayer();t.after(()=>p.destroy());const a={},b={};p.runtimeCapabilities.begin(a,plans);
  p.runtimeCapabilities.update('native-direct','verified',{get outputVerified(){if(action==='clear')p.dispatchControl({type:'source.clear'});else if(action==='retire')p.dispatchControl({type:'operation.retire',terminal:false});else p.runtimeCapabilities.begin(b,plans);return true;}});
  assert.equal(p.runtimeCapabilities.snapshot().some(record=>record.evidence?.outputVerified),false);
  assert.equal(p.control.routing.evidence.capabilities.value.verified.length,0);
 }
});
test('reentrant plan getters cannot overwrite newer admission or a cleared source',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const source={};p.runtimeCapabilities.begin(source,plans);
 p.runtimeCapabilities.admission([{id:'native-direct',get eligible(){p.dispatchControl({type:'source.clear'});return false;}}]);assert.deepEqual(p.runtimeCapabilities.snapshot(),[]);
 p.runtimeCapabilities.begin(source,[{get id(){p.runtimeCapabilities.begin({},plans);return 'stale';},eligible:true}]);
 assert.deepEqual(p.runtimeCapabilities.snapshot().map(record=>record.planId),plans.map(plan=>plan.id));
});
test('replay mixes evidence expiry, source clear, stale completions and operation cancellation within bounds',()=>{
 const run=seed=>{const m=model();for(let i=0;i<200;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const old=m.state.routing.evidence;
  switch(seed%5){
   case 0:m.cap(begin(`source-${seed%40}`));m.cap(verified);break;
   case 1:m.tier({kind:'failure',key:`key-${seed%80}`,reason:'unsupported',now:i*1000});break;
   case 2:m.tier({kind:'read',key:`key-${seed%80}`,now:i*1000+60000});break;
   case 3:m.send({type:'source.clear'});break;
   case 4:m.send({type:'operation.retire',terminal:false});break;
  }
  if(seed%5>=3){assert.equal(m.send({type:'routing.capabilities',revision:old.capabilities.revision,change:verified}).accepted,false);assert.equal(m.send({type:'routing.tiers',revision:old.tiers.revision,change:{kind:'failure',key:'late',reason:'late',now:0}}).accepted,false);}
  assert.ok(m.state.routing.evidence.capabilities.value.verified.length<=32);assert.ok(m.state.routing.evidence.tiers.value.failures.length<=64);
 }return m.state;};
 for(const seed of [1,24301,32220,47,99,120])assert.deepEqual(run(seed),run(seed));
});

test('backend evidence method cannot bind captured facts to a newer evidence revision',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const source={},session={backend:{},surface:{remove(){}}};p.current=session;p.runtimeCapabilities.begin(source,plans);
 p.evidence=()=>{p.runtimeCapabilities.begin({},plans);return {outputVerified:true};};p.updateEvidence('native-direct','prepared',session);
 assert.equal(p.runtimeCapabilities.snapshot()[0].state,'untested');assert.equal(p.runtimeCapabilities.snapshot()[0].evidence,undefined);
 p.acceptEvidence('native-direct',session);assert.equal(p.runtimeCapabilities.snapshot()[0].state,'untested');p.current=undefined;
});
