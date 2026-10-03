// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createBackendRequests,admitBackendRequest,settleBackendRequest,failBackendRequests,beginBackendClose,finishBackendClose} from '../../web/generated/internal/machine/backend-requests.js';
import {PrivateSoftwarePlayer} from '../../web/generated/internal/private-software-player.js';
import {NativePrivateMpvAudio} from '../../web/generated/internal/native-private-mpv-audio.js';

test('profiles retain distinct deadlines, monotonic identities and timeout failure policy',()=>{
 for(const [profile,deadlines,fatal]of [['software',[60000,25000,2000],false],['audio',[15000,15000,1500],true]]){
  let state=createBackendRequests(profile);for(const [index,op]of ['init','status','close'].entries()){
   const admission=admitBackendRequest(state,op,10);state=admission.state;assert.equal(admission.effect.request.id,index+1);assert.equal(admission.effect.request.deadline,10+deadlines[index]);
   assert.equal(settleBackendRequest(state,index+1,{kind:'deadline',now:9+deadlines[index]}).effect.kind,'ignore');
   const result=settleBackendRequest(state,index+1,{kind:'deadline',now:10+deadlines[index]});state=result.state;assert.equal(result.effect.fatal,fatal);
  }
  assert.deepEqual(state.pending,[]);
 }
});
test('all backend profiles cap pending work at128 and reserve one cleanup request',()=>{
 for(const profile of ['software','audio','subtitles']){
  let state=createBackendRequests(profile);for(let i=0;i<128;i++){const next=admitBackendRequest(state,'status',0);state=next.state;assert.equal(next.effect.kind,'send');}
  assert.equal(admitBackendRequest(state,'status',0).effect.reason,'capacity');const cleanup=admitBackendRequest(state,'close',0);assert.equal(cleanup.effect.kind,'send');assert.equal(cleanup.state.pending.length,129);assert.equal(admitBackendRequest(cleanup.state,'close',0).effect.kind,'reject');
  const exhausted={...createBackendRequests(profile),nextId:Number.MAX_SAFE_INTEGER};assert.equal(admitBackendRequest(exhausted,'status',0).effect.reason,'capacity');const final=admitBackendRequest(exhausted,'close',0);assert.equal(final.effect.request.id,0);assert.equal(settleBackendRequest(final.state,0,{kind:'reply'}).effect.kind,'settle');
 }
});
test('reply, timeout and transport failure settle each request exactly once',()=>{
 for(const first of [{kind:'reply'},{kind:'transport-error'},{kind:'deadline',now:15000}]){
  const initial=admitBackendRequest(createBackendRequests('audio'),'status',0).state;
  const settled=settleBackendRequest(initial,1,first);assert.equal(settled.effect.kind,'settle');
  for(const later of [{kind:'reply'},{kind:'transport-error'},{kind:'deadline',now:16000}])assert.equal(settleBackendRequest(settled.state,1,later).effect.kind,'ignore');
  assert.equal(initial.pending.length,1);assert.equal(Object.isFrozen(initial.pending[0]),true);
 }
});
test('failure retires current promises once while closing retains cleanup and pending reply authority',()=>{
 let state=admitBackendRequest(createBackendRequests('software'),'status',0).state;
 const failed=failBackendRequests(state);assert.deepEqual(failed.reject,[1]);assert.equal(failed.notify,true);assert.equal(failBackendRequests(failed.state).notify,false);
 assert.equal(admitBackendRequest(failed.state,'status',1).effect.reason,'failed');
 state=beginBackendClose(state);assert.equal(admitBackendRequest(state,'status',1).effect.reason,'closed');assert.equal(failBackendRequests(state).notify,false);
 assert.equal(settleBackendRequest(state,1,{kind:'reply'}).effect.kind,'settle');
 const close=admitBackendRequest(state,'close',1);assert.equal(close.effect.kind,'send');assert.deepEqual(finishBackendClose(close.state).reject,[1,2]);
});
test('varied queue histories replay with bounded active entries and obsolete callback rejection',()=>{
 for(let seed=1;seed<=20;seed++){
  const run=()=>{let state=createBackendRequests('software'),value=seed;const snapshots=[];for(let step=0;step<100;step++){
   value=(Math.imul(value,1664525)+1013904223)>>>0;const action=value%6;
   if(action<3)state=admitBackendRequest(state,action===0?'close':'status',step).state;
   else if(action===3)state=settleBackendRequest(state,1+value%Math.max(1,state.nextId),{kind:'reply'}).state;
   else if(action===4)state=beginBackendClose(state);else state=finishBackendClose(state).state;snapshots.push(state);
  }return snapshots;};assert.deepEqual(run(),run());for(const state of run())assert.equal(new Set(state.pending.map(request=>request.id)).size,state.pending.length);
 }
});

function replace(t,name,value){const prior=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});t.after(()=>prior?Object.defineProperty(globalThis,name,prior):delete globalThis[name]);}
function fixture(t,profile){
 const errors=[];let worker,contexts=[];
 replace(t,'location',new URL('http://localhost/'));
 replace(t,'Worker',class{constructor(){worker=this;this.messages=[];this.terminations=0;}postMessage(data){this.messages.push(data);this.onPost?.(data);}reply(data){this.onmessage({data});}terminate(){this.terminations++;}});
 replace(t,'OffscreenCanvas',class{});
 replace(t,'AudioContext',class{constructor(){this.destination={maxChannelCount:2};this.state='suspended';this.closes=0;contexts.push(this);}close(){this.state='closed';this.closes++;return Promise.resolve();}removeEventListener(){}});
 const video=Object.assign(new EventTarget(),{paused:true,playbackRate:1});let owner;
 if(profile==='software'){t.mock.method(PrivateSoftwarePlayer.prototype,'initialize',async()=>{});owner=new PrivateSoftwarePlayer({}, {runtime:'asyncify',assetBase:new URL('http://localhost/')});}
 else {owner=new NativePrivateMpvAudio(video,()=>0,new URL('http://localhost/'),'asyncify',error=>errors.push(error));owner.context=new AudioContext();}
 const call=op=>profile==='software'?owner.request(op):owner.rpc(op);
 worker.onPost=data=>{if(data.op==='close')worker.reply({id:data.id,result:{closed:true}});};
 return {owner,worker,call,errors,contexts};
}
for(const profile of ['software','audio'])test(`${profile} real adapter publishes one destroy completion before abort and close callbacks`,async t=>{
 const {owner,worker,call,contexts}=fixture(t,profile);let fromAbort,fromTransport,late;
 const controller=profile==='software'?owner.loading:owner.eofController=new AbortController();
 controller.signal.addEventListener('abort',()=>{fromAbort=owner.destroy();late=assert.rejects(call('status'),/closed/i);},{once:true});
 worker.onPost=data=>{if(data.op==='close'){fromTransport=owner.destroy();worker.reply({id:data.id,result:{closed:true}});}};
 const closing=owner.destroy();assert.equal(fromAbort,closing);assert.equal(fromTransport,closing);assert.equal(owner.destroy(),closing);await closing;await late;
 assert.equal(worker.messages.filter(message=>message.op==='close').length,1);assert.equal(worker.terminations,1);assert.equal(contexts[0].closes,1);assert.equal(owner.requests.phase,'closed');
});
for(const profile of ['software','audio'])test(`${profile} real replies settle once and late replies cannot resolve a newer caller`,async t=>{
 const {owner,worker,call}=fixture(t,profile);const first=call('status');const id=worker.messages.at(-1).id;worker.reply({id,result:'first'});worker.reply({id,error:'duplicate'});assert.equal(await first,'first');
 let secondSettled=false;const second=call('status').then(value=>{secondSettled=true;return value;});worker.reply({id,result:'old'});await Promise.resolve();assert.equal(secondSettled,false);
 const secondId=worker.messages.at(-1).id;worker.reply({id:secondId,result:'second'});assert.equal(await second,'second');assert.equal(owner.pending.size,0);assert.equal(owner.requests.pending.length,0);await owner.destroy();
});
for(const profile of ['software','audio'])test(`${profile} real request timeout preserves owner failure semantics`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let now=0;t.mock.method(performance,'now',()=>now);
 const {owner,worker,call,errors}=fixture(t,profile),pending=assert.rejects(call('status'),/deadline/),id=worker.messages[0].id;
 now=profile==='software'?25000:15000;t.mock.timers.tick(now);await pending;worker.reply({id,result:'too late'});
 assert.equal(owner.requests.failed,profile==='audio');assert.equal(errors.length,profile==='audio'?1:0);await owner.destroy();assert.equal(owner.pending.size,0);
});
for(const profile of ['software','audio'])test(`${profile} transport send failure releases its reserved request without failing unrelated calls`,async t=>{
 const {owner,worker,call}=fixture(t,profile);const cleanup=worker.onPost;worker.onPost=()=>{throw Error('post failed');};
 await assert.rejects(call('status'));assert.equal(owner.requests.pending.length,0);assert.equal(owner.pending.size,0);assert.equal(owner.requests.failed,false);worker.onPost=cleanup;await owner.destroy();
});
test('software real queue capacity preserves cleanup admission and rejects every abandoned caller',async t=>{
 const {owner,worker,call}=fixture(t,'software');const pending=Array.from({length:128},()=>assert.rejects(call('status'),/closed/));
 await assert.rejects(call('status'),/queue limit/);assert.equal(worker.messages.length,128);await owner.destroy();await Promise.all(pending);assert.equal(owner.pending.size,0);assert.equal(owner.requests.pending.length,0);
});
for(const profile of ['software','audio'])test(`${profile} reply delivered before a throwing send callback remains the sole outcome`,async t=>{
 const {owner,worker,call}=fixture(t,profile),cleanup=worker.onPost;
 worker.onPost=data=>{worker.reply({id:data.id,result:'accepted'});throw Error('late transport exception');};
 assert.equal(await call('status'),'accepted');assert.equal(owner.pending.size,0);assert.equal(owner.requests.pending.length,0);assert.equal(owner.requests.failed,false);worker.onPost=cleanup;await owner.destroy();
});
for(const profile of ['software','audio'])test(`${profile} timer scheduling failure releases admission before any message is sent`,async t=>{
 const {owner,worker,call}=fixture(t,profile),schedule=globalThis.setTimeout;
 try{globalThis.setTimeout=()=>{throw Error('cannot schedule');};await assert.rejects(call('status'));}
 finally{globalThis.setTimeout=schedule;}
 assert.equal(worker.messages.length,0);assert.equal(owner.pending.size,0);assert.equal(owner.requests.pending.length,0);await owner.destroy();
});
