// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCapabilities,transitionCapabilities,selectCapabilities,createTierAttempts,recordTierFailure,readTierFailure,preferredPlanIndices} from '../../web/generated/internal/machine/routing.js';
import {RuntimeCapabilities} from '../../web/generated/internal/runtime-capability.js';
import {TierAttempts,preferredPlans} from '../../web/generated/internal/tier-policy.js';
const plans=[{id:'direct',eligible:true},{id:'remux',eligible:true},{id:'software',eligible:false,reason:'unavailable'}];
const begin=(state,sourceIdentity='source-a',value=plans)=>transitionCapabilities(state,{kind:'begin',sourceIdentity,plans:value});
const update=(state,planId,stage,evidence,extra={})=>transitionCapabilities(state,{kind:'update',planId,state:stage,evidence,...extra});

test('prepared and previously verified routes always restart untested',()=>{
 let s=begin(createCapabilities());s=update(s,'direct','probing');s=update(s,'direct','prepared',{prepared:true,outputVerified:false});
 assert.equal(s.records[0].state,'prepared');assert.equal(s.verified.length,0);
 s=update(s,'direct','verified',{prepared:true,outputVerified:true});assert.deepEqual(s.verified,['source-a:direct']);
 s=begin(s);assert.equal(s.records[0].state,'untested');assert.equal(s.records[0].previouslyVerified,true);assert.equal(s.records[0].evidence,undefined);
 s=begin(s,'source-b');assert.equal(s.records[0].previouslyVerified,false);assert.equal(s.records[0].sourceIdentity,'source-b');
});
test('admission changes only untested records and ineligible plans cannot collect evidence',()=>{
 let s=begin(createCapabilities());const frozen=s;
 assert.equal(update(s,'software','verified',{outputVerified:true}),s);assert.equal(update(s,'missing','failed'),s);
 s=update(s,'direct','probing');s=transitionCapabilities(s,{kind:'admission',plans:[{id:'direct',eligible:false,reason:'late'},{id:'remux',eligible:false,reason:'feature'}]});
 assert.equal(s.records[0].eligible,true);assert.equal(s.records[0].reason,undefined);assert.equal(s.records[1].eligible,false);assert.equal(s.records[1].reason,'feature');
 assert.equal(frozen.records[1].eligible,true);assert.equal(frozen.records[0].state,'untested');
});
test('failure removes verification while evidence is retained when omitted',()=>{
 let s=update(begin(createCapabilities()),'direct','verified',{videoPresented:true});
 s=update(s,'direct','failed',undefined,{reason:'decoder rejected',failureKind:'compatibility'});
 assert.deepEqual(s.verified,[]);assert.deepEqual(s.records[0].evidence,{videoPresented:true});assert.equal(s.records[0].failureKind,'compatibility');
 s=update(s,'direct','probing');assert.equal(s.records[0].reason,undefined);assert.equal(s.records[0].failureKind,undefined);
});
test('verification capacity is32 and successful updates refresh only that key',()=>{
 let s=createCapabilities();for(let i=0;i<32;i++)s=update(begin(s,`source-${i}`),'direct','verified');
 s=update(begin(s,'source-0'),'direct','verified');s=update(begin(s,'source-32'),'direct','verified');
 assert.equal(s.verified.length,32);assert.equal(s.verified.includes('source-1:direct'),false);assert.equal(s.verified.includes('source-0:direct'),true);
 const cleared=transitionCapabilities(s,{kind:'clear'});assert.deepEqual(cleared,{records:[],verified:[]});assert.equal(s.verified.length,32);
});
test('core detaches nested evidence and diagnostic copies without freezing caller graphs',()=>{
 const input={audioObservation:{clockAdvanced:true,delta:10},timing:{prepared:20},prepared:true};
 const s=update(begin(createCapabilities()),'direct','prepared',input);input.audioObservation.delta=900;input.timing.prepared=999;
 assert.equal(s.records[0].evidence.audioObservation.delta,10);assert.equal(s.records[0].evidence.timing.prepared,20);
 assert.equal(Object.isFrozen(input),false);assert.equal(Object.isFrozen(input.audioObservation),false);assert.ok(Object.isFrozen(s.records[0].evidence.audioObservation));
 const snapshot=selectCapabilities(s);snapshot[0].evidence.audioObservation.delta=222;snapshot[0].evidence.timing.prepared=444;snapshot[0].eligible=false;
 assert.equal(s.records[0].evidence.audioObservation.delta,10);assert.equal(s.records[0].eligible,true);
});
test('runtime wrapper keeps object identity local, detaches evidence, and clears remembered success',()=>{
 const c=new RuntimeCapabilities(),a={},b={},input={audioObservation:{clockAdvanced:true,delta:1},timing:{ready:2},outputVerified:true};
 c.begin(a,plans);const first=c.snapshot()[0].sourceIdentity;c.update('direct','verified',input);input.audioObservation.delta=100;
 const snapshot=c.snapshot();snapshot[0].evidence.timing.ready=100;assert.equal(c.snapshot()[0].evidence.timing.ready,2);assert.equal(c.snapshot()[0].evidence.audioObservation.delta,1);
 c.begin(b,plans);assert.notEqual(c.snapshot()[0].sourceIdentity,first);c.begin(a,plans);assert.equal(c.snapshot()[0].sourceIdentity,first);assert.equal(c.snapshot()[0].previouslyVerified,true);
 c.clear();c.begin(a,plans);assert.notEqual(c.snapshot()[0].sourceIdentity,first);assert.equal(c.snapshot()[0].previouslyVerified,false);
});
test('evidence capture excludes callbacks and stale observations from a reentrant source change',()=>{
 const c=new RuntimeCapabilities(),a={},b={};c.begin(a,plans);
 c.update('direct','verified',{outputVerified:true,unexpected:()=>{},timing:{ready:3,resource:{}},audioObservation:{clockAdvanced:true,handle:{}}});
 assert.deepEqual(c.snapshot()[0].evidence,{outputVerified:true,timing:{ready:3},audioObservation:{clockAdvanced:true}});
 c.update('direct','verified',{get prepared(){c.begin(b,plans);return true;}});
 assert.equal(c.snapshot()[0].state,'untested');assert.equal(c.snapshot()[0].evidence,undefined);assert.equal(c.snapshot()[0].previouslyVerified,false);
 c.update('software','verified',{get outputVerified(){throw Error('ineligible evidence must not be read');}});
});
test('duplicate plan IDs preserve first-match admission and update behavior',()=>{
 let s=begin(createCapabilities(),'a',[{id:'same',eligible:true},{id:'same',eligible:true}]);
 s=transitionCapabilities(s,{kind:'admission',plans:[{id:'same',eligible:false},{id:'same',eligible:true,reason:'last'}]});
 assert.equal(s.records[0].reason,'last');assert.equal(s.records[1].reason,undefined);
 s=update(s,'same','verified');assert.equal(s.records[0].state,'verified');assert.equal(s.records[1].state,'untested');
});
test('negative evidence expires exactly at60seconds without refreshing on reads',()=>{
 const initial=createTierAttempts(),s=recordTierFailure(initial,'source:config:plan','unsupported',25);
 assert.equal(readTierFailure(s,'source:config:plan',60024).reason,'unsupported');assert.equal(readTierFailure(s,'source:config:plan',60024).state,s);
 const expired=readTierFailure(s,'source:config:plan',60025);assert.equal(expired.reason,undefined);assert.deepEqual(expired.state.failures,[]);assert.equal(s.failures.length,1);
 assert.equal(readTierFailure(s,'different',100).state,s);assert.deepEqual(initial.failures,[]);
});
test('negative evidence bounds, replacement recency and inactive expired keys are preserved',()=>{
 let s=createTierAttempts();for(let i=0;i<64;i++)s=recordTierFailure(s,String(i),'unsupported',0);
 s=recordTierFailure(s,'0','changed',10);s=recordTierFailure(s,'64','new',20);assert.equal(s.failures.length,64);
 assert.equal(readTierFailure(s,'1',30).reason,undefined);assert.equal(readTierFailure(s,'0',30).reason,'changed');
 const result=readTierFailure(s,'64',60020);assert.equal(result.state.failures.length,63);assert.equal(result.state.failures.some(item=>item.key==='2'),true);
});
test('tier wrapper preserves explicit timestamps and samples its clock only when omitted',t=>{
 let reads=0;t.mock.method(performance,'now',()=>{reads++;return 50;});
 const h=new TierAttempts(),a={},b={};h.failure(a,'config','direct','bad',0);assert.equal(reads,0);assert.equal(h.reason(a,'config','direct',1),'bad');assert.equal(reads,0);
 assert.equal(h.reason(b,'config','direct'),undefined);assert.equal(reads,1);h.failure(a,'next','direct','bad');assert.equal(reads,2);
 assert.equal(h.reason(a,'next','direct',60049),'bad');assert.equal(h.reason(a,'next','direct',60050),undefined);
 const old=h.key(a,'config','direct');h.clear();assert.notEqual(h.key(a,'config','direct'),old);
});
test('promotion index policy preserves priority and shell object identity',()=>{
 const plans=[{id:'direct',eligible:false,callback:()=>{}},{id:'remux',eligible:true,resource:{}},{id:'software',eligible:true}];
 assert.deepEqual(preferredPlanIndices(plans.map(({id,eligible})=>({id,eligible})),'software'),[1]);
 const result=preferredPlans(plans,'software');assert.equal(result[0],plans[1]);assert.deepEqual(preferredPlans(plans,'missing'),[]);assert.deepEqual(preferredPlans(plans,'remux'),[]);
 const duplicate=[{id:'x',eligible:true},{id:'x',eligible:true},{id:'z',eligible:true}];assert.deepEqual(preferredPlanIndices(duplicate,'x'),[]);
});
test('routing histories replay deterministically and never exceed evidence budgets',()=>{
 const run=seed=>{let c=createCapabilities(),t=createTierAttempts();const history=[];
  for(let i=0;i<250;i++){
   seed=(Math.imul(seed,1103515245)+12345)>>>0;const source=`source-${seed%40}`,plan=plans[(seed>>>6)%2].id;
   c=begin(c,source);c=update(c,plan,(seed&1)?'verified':'failed',{outputVerified:!!(seed&1)});
   const key=`${source}:configuration-${seed%3}:${plan}`;t=recordTierFailure(t,key,'unsupported',i*1000);t=readTierFailure(t,key,i*1000+((seed&2)?60000:1)).state;
   assert.ok(c.verified.length<=32);assert.ok(t.failures.length<=64);assert.equal(new Set(c.verified).size,c.verified.length);assert.equal(new Set(t.failures.map(item=>item.key)).size,t.failures.length);
   history.push({c,t});
  }return history;};
 for(const seed of [1,24301,999])assert.deepEqual(run(seed),run(seed));
});
