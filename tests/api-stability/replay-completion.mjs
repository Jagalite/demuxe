// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {recordReplay,encodeReplay,decodeReplay,replayArtifact} from './replay-artifact.mjs';
import {schedules} from './composed-replay-harness.mjs';
import {initialMediaSessionLease,allocateMediaSessionOwner,transitionMediaSession} from '../../web/generated/internal/machine/presentation.js';
import {planAdmission} from '../../web/generated/internal/machine/playback-plans.js';
import {createCapabilities,transitionCapabilities,preferredPlanIndices} from '../../web/generated/internal/machine/routing.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
const drain=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};

test('versioned full test DTO artifact replays every finite causal completion schedule exactly',async()=>{
 const histories=schedules([
  {id:'open',after:[],action:{type:'open'}},
  {id:'play',after:['open'],action:{type:'submit',id:1,kind:'backend.play',lane:'immediate'}},
  {id:'pause',after:['play'],action:{type:'pause'}},
  {id:'result',after:['play'],action:{type:'complete',id:1,success:true}},
  {id:'release',after:['pause','result'],action:{type:'release'}},
  {id:'deadline',after:['release'],action:{type:'advance',time:40000}},
  {id:'cleanup',after:['release'],action:{type:'cleanup',success:true}},
 ]);
 assert.equal(histories.length,4);
 for(const history of histories){const artifact=await recordReplay(history),text=encodeReplay(artifact);assert.deepEqual(decodeReplay(text),artifact);assert.deepEqual(await replayArtifact(text),artifact.expected);assert.ok(artifact.expected.inputs.length>20);assert.ok(artifact.expected.inputs.some(x=>x.type==='source.accept'&&x.settings));assert.ok(artifact.expected.inputs.some(x=>x.type==='effect.event'&&x.input.type==='admit'&&x.input.effect.scope));}
});
test('test replay rejects schema, causal, payload, numeric and size corruption; detects observation mutation',async()=>{
 const artifact=await recordReplay([{type:'open'}]);
 for(const mutate of [x=>x.version=2,x=>x.url='https://private.invalid',x=>x.actions.push({type:'complete',id:2,success:true}),x=>x.actions[0].headers={authorization:'secret'},x=>x.actions.push({type:'advance',time:null})]){const bad=structuredClone(artifact);mutate(bad);assert.throws(()=>decodeReplay(JSON.stringify(bad)));}
 assert.throws(()=>decodeReplay(' '.repeat(1024*1024+1)));assert.throws(()=>encodeReplay({large:'x'.repeat(1024*1024)}));
 const changed=structuredClone(artifact);changed.expected.final.released++;await assert.rejects(replayArtifact(encodeReplay(changed)),/exact recorded/);
 assert.equal(/https?:|authorization|cookie|blob:/.test(encodeReplay(artifact)),false);
});

test('two-owner MediaSession bounded reachable graph matches independent lease oracle',()=>{
 let start=initialMediaSessionLease();for(let i=1;i<=2;i++){const r=allocateMediaSessionOwner(start);assert.equal(r.owner,i);start=r.state;}
 const queue=[start],visited=new Set(),labels=new Set(),pairs=new Set();let edges=0;
 while(queue.length){const state=queue.shift(),key=JSON.stringify(state);if(visited.has(key))continue;visited.add(key);
  for(const owner of [1,2])for(const type of ['acquire','activate','release'])for(const serial of [0,1,2,3]){
   if(type==='acquire'&&(serial!==0||state.owner===null&&state.serial>=2))continue;
   const command={type,owner,...type==='acquire'?{}:{serial}},actual=transitionMediaSession(state,command);let expected={...state},outcome;
   if(type==='acquire'){if(state.owner===null){expected.owner=owner;expected.serial++;expected.phase='installing';outcome='acquired';}else outcome=state.owner===owner?'retained':'denied';}
   else if(owner!==state.owner||serial!==state.serial)outcome='ignored';
   else if(type==='activate'){expected.phase='active';outcome='activated';}
   else{expected.owner=null;expected.phase='idle';outcome='released';}
   assert.deepEqual(actual.state,expected);assert.equal(actual.outcome,outcome);assert.ok(actual.state.owner===null||[1,2].includes(actual.state.owner));edges++;labels.add(type+':'+outcome);pairs.add(state.phase+'>'+type+':'+outcome);queue.push(actual.state);
  }
  // Fair owner completion always permits the other owner to acquire.
  if(state.owner!==null){const released=transitionMediaSession(state,{type:'release',owner:state.owner,serial:state.serial});assert.equal(released.state.phase,'idle');assert.equal(transitionMediaSession(released.state,{type:'acquire',owner:3-state.owner}).outcome,'acquired');}
 }
 assert.equal(visited.size,11);assert.ok(edges>150);assert.deepEqual([...labels].sort(),['acquire:acquired','acquire:denied','acquire:retained','activate:activated','activate:ignored','release:ignored','release:released']);
 console.log(JSON.stringify({mediaSessionExploration:{states:visited.size,edges,labels:[...labels].sort(),pairs:[...pairs].sort(),bounds:{owners:2,acquisitions:2,serials:[0,1,2,3]}}}));
});

const base={automatic:true,vf:'',af:'',gain:1,toneMapping:'off',hybridAudioFilters:false,allowLossy:false,nativeASS:false,externalFormats:[],browserTextTracks:false,audioOutput:'stereo',nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:true,mse:true,webCodecs:true,webAudio:true};
// Literal contract witnesses, independently reviewed expected routes; never computed by production helpers.
const routes=[
 ['ordinary',{},['native-direct','native-remux','hybrid','software']],
 ['gain',{gain:.5},['native-direct-gain','native-remux-gain','hybrid-gain','software-gain']],
 ['native-ass',{nativeASS:true,externalFormats:['ass']},['native-direct-ass','native-remux-ass','hybrid','software']],
 ['ass-gain',{nativeASS:true,externalFormats:['ass'],gain:.5},['native-direct-ass-gain','native-remux-ass-gain','hybrid-gain','software-gain']],
 ['qualified-filter',{af:'volume=0.5',hybridAudioFilters:true,gain:.5},['hybrid-audio-filter-gain','software-gain']],
 ['software-filter',{af:'rubberband',hybridAudioFilters:true},['software']],
 ['no-isolation-remux',{requiresRemux:true,isolated:false},[]],
 ['lossless',{automaticLossless:true,adaptationSourceQualified:true},['native-direct','native-remux','native-flac','hybrid','software']],
 ['source-excludes-native',{nativeSourceRejection:'fixture unsupported'},['hybrid','software']],
];
for(const [name,extra,expected]of routes)test(`initial route and fallback evidence history: ${name}`,()=>{
 const admitted=planAdmission({...base,...extra}),eligible=admitted.filter(x=>x.eligible).map(x=>x.id);assert.deepEqual(eligible,expected);
 let state=transitionCapabilities(createCapabilities(),{kind:'begin',sourceIdentity:'fixture',plans:admitted});
 for(let i=0;i<expected.length;i++){
  const id=expected[i];state=transitionCapabilities(state,{kind:'update',planId:id,state:'probing'});state=transitionCapabilities(state,{kind:'update',planId:id,state:i===expected.length-1?'verified':'failed',evidence:{outputVerified:i===expected.length-1}});
  assert.deepEqual(state.records.filter(x=>x.state==='failed').map(x=>x.planId),expected.slice(0,i===expected.length-1?i:i+1));assert.deepEqual(state.verified,i===expected.length-1?['fixture:'+id]:[]);
  assert.deepEqual(preferredPlanIndices(admitted,id).map(index=>admitted[index].id),expected.slice(0,i));
 }
 // Ineligible routes cannot collect evidence, even after eligible failures.
 for(const plan of admitted.filter(x=>!x.eligible))assert.equal(transitionCapabilities(state,{kind:'update',planId:plan.id,state:'verified',evidence:{outputVerified:true}}),state);
});

for(const [reserved,ownership] of [[false,'owned'],[true,'owned'],[false,'borrowed']])for(const deadline of [false,true])for(const success of [false,true])test(`runtime cleanup schedule reserved=${reserved} ownership=${ownership} deadline=${deadline} success=${success}`,async()=>{
 let expiry,resolve,reject,calls=0;const registry=new ResourceRegistry({monotonic:true,maxResources:1,cleanupTimeoutMs:10,scheduleCleanupTimeout:fn=>{expiry=fn;return()=>{};}});
 const metadata={id:'resource:1',scopeKey:'scope:1',kind:'backend'},physical=new Promise((a,b)=>{resolve=a;reject=b;});physical.catch(()=>{});
 const resource={...metadata,ownership,value:{},...ownership==='owned'?{release(){calls++;return physical;}}:{}};
 if(reserved)registry.reserve(metadata);else await registry.register(resource);
 assert.equal(registry.diagnostics.reserved,reserved?1:0);assert.equal(registry.diagnostics.active,reserved?0:1);assert.equal(registry.diagnostics.registered,1);
 const closing=registry.retireScope('scope:1');closing.catch(()=>{});await drain();assert.equal(registry.diagnostics.active,0);assert.ok(registry.handles.size<=1);assert.ok(registry.acquisitions.size<=1);
 if(deadline&&ownership==='owned'){expiry();await drain();assert.equal(registry.diagnostics.detached,1);}
 let acquisition;if(reserved){acquisition=registry.acquire(resource);acquisition.catch(()=>{});await drain();}
 assert.equal(calls,ownership==='owned'?1:0);assert.throws(()=>registry.get(metadata.id),/retired|released|missing/);
 success?resolve():reject(Error('physical failure'));await drain();await closing.catch(()=>{});await acquisition?.catch(()=>{});
 const d=registry.diagnostics;assert.equal(d.active,0);assert.equal(d.detached,0);assert.equal(registry.handles.size,0);assert.equal(registry.acquisitions.size,0);assert.equal(d.released,ownership==='borrowed'||success?1:0);assert.equal(d.failed,ownership==='owned'&&(deadline||!success)?1:0);assert.equal(d.lateReleased,ownership==='owned'&&deadline&&success?1:0);assert.equal(d.lateFailed,ownership==='owned'&&deadline&&!success?1:0);
});
