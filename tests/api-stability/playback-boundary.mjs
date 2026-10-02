// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity,publishControlSnapshot} from '../helpers/player-control.mjs';
const facts={hasBackend:true,time:7,duration:10,seekable:[{start:0,end:10}]};
function core(){let state=initialPlayerControl();const send=input=>{const before=state,text=JSON.stringify(state),result=transitionPlayer(state,input);assert.equal(JSON.stringify(before),text);state=result.state;return result;};const start=()=>{const id=send({type:'operation.admit',kind:'seeking'}).id;send({type:'operation.start',id});return id;};return{get state(){return state;},send,start};}
function source(r,preserve=false){const attempt=r.send({type:'source.begin',operationEpoch:r.state.operations.epoch,mode:'native',preserve,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])r.send({type,attempt});r.send({type:'source.accept',attempt,operationEpoch:r.state.operations.epoch,settings:r.state.settings,planMatches:true});r.send({type:'source.finished',attempt});}
function boundary(loop=true){const r=core();source(r);r.send({type:'settings.change',value:{pause:false}});r.send({type:'preferences.change',value:{playbackRange:{start:1,end:5},loopPolicy:loop}});const id=r.send({type:'boundary.sample',time:5,duration:10,ended:false}).id;const operation=r.start();return{r,id,operation};}
for(const kind of ['range','loop'])test(`${kind} positions before acceptance and compensates before reporting failure`,()=>{
  for(const finish of ['accept','restored','retire']){
    const r=core();r.start();const key=kind==='range'?'playbackRange':'loopPolicy',before=r.state.preferences[key],value={start:1,end:5};
    const begin=r.send({type:'setting.begin',command:{kind,value,facts},hasBackend:true});value.end=99;
    assert.deepEqual(begin.effects,[{kind:'seek',value:1},{kind:'seek.verify',value:1}]);assert.equal(r.state.preferences[key],before);
    if(finish==='accept'){r.send({type:'setting.accept',id:begin.id});assert.deepEqual(r.state.preferences[key],{start:1,end:5});}
    else if(finish==='restored'){assert.deepEqual(r.send({type:'setting.failed',id:begin.id}).effects,[{kind:'seek',value:7},{kind:'seek.verify',value:7}]);r.send({type:'setting.restored',id:begin.id});assert.equal(r.state.preferences[key],before);}
    else {r.send({type:'operation.retire',terminal:false});assert.equal(r.send({type:'setting.accept',id:begin.id}).accepted,false);assert.equal(r.state.preferences[key],before);}
  }
});
for(const [name,command,reason] of [
  ['invalid order',{kind:'range',value:{start:5,end:1},facts},'invalid'],
  ['seekable gaps',{kind:'range',value:{start:1,end:5},facts:{...facts,seekable:[{start:0,end:2},{start:4,end:10}]}},'unsupported'],
  ['no finite duration',{kind:'loop',value:true,facts:{...facts,duration:null}},'unsupported'],
  ['null loop',{kind:'loop',value:null,facts},'invalid'],
  ['whole source unavailable',{kind:'loop',value:true,facts:{...facts,seekable:[{start:1,end:10}]}},'unsupported'],
])test(`range validation: ${name}`,()=>{const r=core();r.start();const before=r.state,result=r.send({type:'setting.begin',command,hasBackend:true});assert.equal(result.accepted,false);assert.equal(result.reason,reason);assert.equal(r.state,before);assert.deepEqual(result.effects,[]);});
test('range and explicit loop containment use accepted policy; clearing a range retains the loop',()=>{
  const r=core();r.start();r.send({type:'preferences.change',value:{playbackRange:{start:0,end:8},loopPolicy:{start:1,end:5}}});
  for(const [kind,value] of [['range',{start:2,end:8}],['loop',{start:0,end:9}]])assert.equal(r.send({type:'setting.begin',command:{kind,value,facts},hasBackend:true}).reason,'invalid');
  const request=r.send({type:'setting.begin',command:{kind:'range',value:null,facts},hasBackend:true});assert.deepEqual(request.effects,[]);r.send({type:'setting.accept',id:request.id});assert.equal(r.state.preferences.playbackRange,null);assert.deepEqual(r.state.preferences.loopPolicy,{start:1,end:5});
});
for(const loop of [false,true])test(`automatic boundary ${loop?'loops':'stops'} in verified order`,()=>{
  const {r,id}=boundary(loop);assert.equal(r.send({type:'boundary.sample',time:8,duration:10,ended:false}).accepted,false);
  assert.deepEqual(r.send({type:'boundary.start',id,time:5,duration:10,ended:false}).effects,[{kind:'pause'}]);
  assert.equal(r.send({type:'boundary.complete',id,phase:'seeking'}).accepted,false,'out-of-order completion');
  assert.deepEqual(r.send({type:'boundary.complete',id,phase:'pausing'}).effects,[{kind:'seek',value:loop?1:5}]);assert.equal(r.state.settings.pause,!loop);
  assert.equal(r.send({type:'boundary.complete',id,phase:'pausing'}).accepted,false,'duplicate completion');
  assert.deepEqual(r.send({type:'boundary.complete',id,phase:'seeking'}).effects,[{kind:'seek.verify',value:loop?1:5}]);
  assert.deepEqual(r.send({type:'boundary.complete',id,phase:'verifying'}).effects,loop?[{kind:'play'}]:[]);
  if(loop)r.send({type:'boundary.complete',id,phase:'resuming'});assert.equal(r.state.boundary.pending.phase,'finished');
  r.send({type:'operation.finish',id:r.state.operations.active});assert.equal(r.send({type:'boundary.sample',time:5,duration:10,ended:false}).accepted,false,'completion still owns publication lease');
  r.send({type:'boundary.settled',id});assert.equal(r.state.boundary.pending,null);
});
for(const phase of ['queued','pausing','seeking','verifying','resuming'])for(const retire of ['close','destroy','source'])test(`${retire} during ${phase} retires all boundary completions`,()=>{
  const {r,id}=boundary();if(phase!=='queued')r.send({type:'boundary.start',id,time:5,duration:10,ended:false});
  for(const step of ['pausing','seeking','verifying']){if(phase===step||phase==='queued')break;r.send({type:'boundary.complete',id,phase:step});}
  if(retire==='source')source(r,true);else r.send({type:'operation.retire',terminal:retire==='destroy'});
  const before=r.state;for(const input of [{type:'boundary.start',id,time:5,duration:10,ended:false},{type:'boundary.complete',id,phase},{type:'boundary.failed',id},{type:'boundary.settled',id}]){assert.equal(r.send(input).accepted,false);assert.equal(r.state,before);}
});
test('queued controls revalidate range and time before physical pause',()=>{
  for(const change of ['range','time','pause']){const {r,id}=boundary();if(change==='range')r.send({type:'preferences.change',value:{playbackRange:null,loopPolicy:false}});if(change==='pause')r.send({type:'settings.change',value:{pause:true}});assert.deepEqual(r.send({type:'boundary.start',id,time:change==='time'?2:5,duration:10,ended:false}).effects,[]);assert.equal(r.state.boundary.pending.phase,'finished');r.send({type:'boundary.settled',id});assert.equal(r.state.boundary.pending,null);}
});
function adapter(t){const p=unitPlayer(),backend=new EventTarget(),calls=[];Object.assign(backend,{properties:new Map(),diagnostics:{plan:'direct'},destroy:async()=>{},pause:async()=>{calls.push('pause');},seek:async n=>{calls.push(['seek',n]);},play:async()=>{calls.push('play');}});p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);publishControlSnapshot(p,{currentTime:7,duration:10,seekable:[{start:0,end:10}],status:'playing'});p.settled=async(_s,_m,n)=>{calls.push(['verified',n]);};t.after(()=>p.destroy());return{p,backend,calls};}
test('actual range seek failure restores position and retains previously accepted range',async t=>{const {p,backend,calls}=adapter(t);p.playbackRange={start:0,end:10};backend.seek=async n=>{calls.push(['seek',n]);if(n===1)throw Error('partial positioning');};await assert.rejects(p.setPlaybackRange({start:1,end:5}),/partial positioning/);assert.deepEqual(calls,[['seek',1],['seek',7],['verified',7]]);assert.deepEqual(p.getPlaybackRange(),{start:0,end:10});});
test('actual loop completion after close cannot resume the retired backend',async t=>{const {p,backend,calls}=adapter(t);p.updateSettings({pause:false});p.playbackRange={start:1,end:5};p.loopPolicy=true;let ready,release;const started=new Promise(resolve=>ready=resolve);backend.seek=()=>{ready();return new Promise(resolve=>release=resolve);};p.enforceBoundary();await started;const closing=p.close();release();await closing;await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['pause']);assert.equal(p.control.boundary.pending,null);});
test('actual boundary failure publishes committed pause before best-effort physical cleanup',async t=>{const {p,backend,calls}=adapter(t);p.updateSettings({pause:false});p.playbackRange={start:1,end:5};p.loopPolicy=true;let pauses=0;const cleanupObservations=[];backend.pause=async()=>{calls.push('pause');if(++pauses===2){cleanupObservations.push([p.settings.pause,p.control.boundary.pending]);p.enforceBoundary();}};backend.seek=async()=>{throw Error('seek failure');};p.enforceBoundary();await p.queue;await new Promise(resolve=>setImmediate(resolve));assert.equal(p.settings.pause,true);assert.deepEqual(cleanupObservations,[[true,null]],'cleanup must observe committed pause and retired boundary');assert.deepEqual(calls,['pause','pause']);assert.equal(p.control.boundary.pending,null);});
test('boundary publication cannot enqueue another loop before the completed operation releases its lease',async t=>{
  const {p,calls}=adapter(t);p.updateSettings({pause:false});p.playbackRange={start:1,end:5};p.loopPolicy=true;let finishedPublications=0;
  p.publish=()=>{if(p.control.boundary.pending?.phase==='finished')finishedPublications++;if(calls.length<12)p.enforceBoundary();};
  p.enforceBoundary();await p.queue;await new Promise(resolve=>setImmediate(resolve));
  assert.ok(finishedPublications>0);assert.deepEqual(calls,['pause',['seek',1],['verified',1],'play']);assert.equal(p.control.boundary.pending,null);
});
test('failed range positioning and compensation retain the accepted range and report degradation',async t=>{
  const {p,backend}=adapter(t);p.playbackRange={start:0,end:10};backend.seek=async()=>{throw Error('position rejected');};
  await assert.rejects(p.setPlaybackRange({start:1,end:5}),{code:'DECODE_FAILED'});assert.deepEqual(p.getPlaybackRange(),{start:0,end:10});assert.equal(p.sessionError.code,'DECODE_FAILED');assert.ok(p.control.settingsTransactions.degraded);
});
