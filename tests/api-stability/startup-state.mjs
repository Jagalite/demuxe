// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStartup,transitionStartup,STARTUP_BYTE_LIMIT,STARTUP_ENTRY_LIMIT,startupFallbackPlan,startupLoadBudget,startupPrefetchCurrent,startupPreparation} from '../../web/generated/internal/machine/startup.js';
import {initialNativeBackend,transitionNativeBackend} from '../../web/generated/internal/machine/native-backend.js';
import {StartupModules} from '../../web/generated/internal/startup-escalation.js';

test('startup timeout retains physical capacity until failure settlement and allows ordinary retry',()=>{
 let state=initialStartup();const send=event=>{const before=structuredClone(state),old=state,result=transitionStartup(state,event);assert.deepEqual(old,before);state=result.state;return result;};
 const first=send({type:'admit',path:'a',now:0});assert.equal(send({type:'admit',path:'a',now:1}).id,first.id);
 assert.equal(send({type:'deadline',id:first.id,now:14999}).remaining,1);
 send({type:'deadline',id:first.id,now:15000});assert.equal(send({type:'complete',id:first.id}).accepted,false);
 for(let i=1;i<STARTUP_ENTRY_LIMIT;i++)assert.equal(send({type:'admit',path:String(i),now:15000}).accepted,true);
 assert.equal(send({type:'admit',path:'overflow',now:15000}).accepted,false);
 send({type:'failed',id:first.id});assert.equal(send({type:'admit',path:'a',now:16000}).accepted,true);
 send({type:'destroy'});assert.equal(state.entries.length,STARTUP_ENTRY_LIMIT);assert.equal(send({type:'admit',path:'a',now:17000}).accepted,false);
 for(const entry of [...state.entries])send({type:'failed',id:entry.id});assert.equal(state.entries.length,0);
});
test('startup byte admission prevents oversized cache publication',()=>{
 const admitted=transitionStartup(initialStartup(),{type:'admit',path:'a',now:0});
 const full=transitionStartup(admitted.state,{type:'chunk',id:admitted.id,bytes:STARTUP_BYTE_LIMIT});assert.equal(full.accepted,true);
 assert.equal(transitionStartup(full.state,{type:'chunk',id:admitted.id,bytes:1}).accepted,false);
});
test('native soft deadline is early-safe, once-only and retired by completion or replacement',()=>{
 for(const retirement of ['event.finish','source','stop']){
  let state=initialNativeBackend();const send=event=>{const result=transitionNativeBackend(state,event);state=result.state;return result;};
  const request=send({type:'event.begin',event:'loadeddata',now:0,loadBudget:500,prefetchAfterMs:400}).request;
  assert.equal(send({type:'event.prefetch',request,now:399}).remaining,1);
  send(retirement==='event.finish'?{type:retirement,request}:{type:retirement});assert.equal(send({type:'event.prefetch',request,now:400}).accepted,false);
 }
 let result=transitionNativeBackend(initialNativeBackend(),{type:'event.begin',event:'loadeddata',now:0,loadBudget:500,prefetchAfterMs:400});const request=result.request;
 result=transitionNativeBackend(result.state,{type:'event.prefetch',request,now:400});assert.equal(result.prefetch,true);
 assert.equal(transitionNativeBackend(result.state,{type:'event.prefetch',request,now:450}).accepted,false);
});
test('startup fallback honors plan inclusion and failures while explicit budgets win',()=>{
 const plan=(id,changes={})=>({id,eligible:true,included:true,fallback:true,rejected:false,...changes});
 const plans=[plan('direct',{fallback:false}),plan('remux',{included:false}),plan('hybrid',{rejected:true}),plan('software')];
 assert.equal(startupFallbackPlan(true,'direct','remux',plans),'software');assert.equal(startupFallbackPlan(false,'direct',undefined,plans),undefined);
 assert.equal(startupLoadBudget(25000,500,'software'),25000);assert.equal(startupLoadBudget(undefined,500,'software'),500);
 assert.equal(startupPrefetchCurrent(false,2,1,4,4),false);assert.equal(startupPrefetchCurrent(false,1,1,5,4),false);
});
test('real module owner deduplicates warm work and refuses late compile publication after destroy',async t=>{
 let fetches=0,finish;const compiled=new Promise(resolve=>{finish=resolve;});
 t.mock.method(globalThis,'fetch',async()=>{fetches++;let read=false;return {ok:true,headers:{get(){return '8';}},body:{getReader(){return {async read(){if(read)return {done:true};read=true;return {done:false,value:new Uint8Array([0,97,115,109,1,0,0,0])};},releaseLock(){}};}}};});
 t.mock.method(WebAssembly,'compile',()=>compiled);
 const owner=new StartupModules(new URL('https://example.test/'));const first=owner.warm('a'),second=owner.warm('a');assert.equal(first,second);
 while(!owner.state.entries[0]?.bytes)await new Promise(resolve=>setImmediate(resolve));
 // Allow load to enter compilation before destroy: compilation ignores abort.
 await new Promise(resolve=>setImmediate(resolve));owner.destroy();assert.equal(owner.state.entries.length,1);
 finish({});await assert.rejects(first);assert.equal(await owner.bytes('a'),undefined);assert.equal(owner.state.entries.length,0);assert.equal(fetches,1);
 await assert.rejects(owner.warm('a'));assert.equal(fetches,1);
});

test('startup preparation uses normalized recipe facts for each code warming owner',()=>{
 assert.deepEqual(startupPreparation('hybrid','pthread',false,{backend:'WasmPlayer'}),{kind:'engine',mode:'hybrid',path:'web/engine-hybrid/player.wasm'});
 assert.deepEqual(startupPreparation('software','pthread',true,{backend:'WasmPlayer'}),{kind:'engine',mode:'software',path:'web/engine-software-full/player.wasm'});
 assert.deepEqual(startupPreparation('software-private','asyncify',false,{backend:'PrivateSoftwarePlayer'}),{kind:'private',path:'web/engine-mpv-playback-asyncify/player.wasm'});
 assert.deepEqual(startupPreparation('native-transcode','jspi',false,{backend:'NativePlayer',adaptation:'flac24'}),{kind:'remux',adapted:true,codecPreparation:true,path:'web/engine-adaptation-jspi/remux.wasm'});
});

test('destroy before queued startup acquisition never starts a fetch',async t=>{
 let fetches=0;t.mock.method(globalThis,'fetch',async()=>{fetches++;throw Error('unexpected fetch');});
 const owner=new StartupModules(new URL('https://example.test/')),work=owner.warm('a');owner.destroy();
 await assert.rejects(work);assert.equal(fetches,0);assert.equal(owner.state.entries.length,0);
});
test('late ignored-abort fetch cancels its body without starting an unbounded read',async t=>{
 let finish,cancelled=0,reads=0;const response=new Promise(resolve=>{finish=resolve;});
 t.mock.method(globalThis,'fetch',()=>response);
 const owner=new StartupModules(new URL('https://example.test/')),work=owner.warm('a');await Promise.resolve();owner.destroy();
 assert.equal(owner.state.entries.length,1);
 finish({body:{async cancel(){cancelled++;},getReader(){reads++;return {read(){return new Promise(()=>{});}};}}});
 await assert.rejects(work);assert.equal(cancelled,1);assert.equal(reads,0);assert.equal(owner.state.entries.length,0);
});
test('actual native soft timer acquired during cancellation is released and cannot prefetch',async t=>{
 const {NativePlayer}=await import('../../web/generated/internal/native-player.js');
 const player=Object.create(NativePlayer.prototype),controller=new AbortController(),video=new EventTarget();let prefetches=0,starts=0,serial=0;const timers=new Map(),cleared=[];
 Object.assign(player,{native:initialNativeBackend(),loadTimeoutMs:500,cancelers:new Set(),eventWaits:new Map(),video,startup:{prefetchAfterMs:400,prefetch(){prefetches++;}}});
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const id=++serial;timers.set(id,callback);if(delay===400)controller.abort(new Error('retired'));return id;});
 t.mock.method(globalThis,'clearTimeout',id=>{cleared.push(id);timers.delete(id);});
 const work=player.wait('loadeddata',()=>starts++,controller.signal);await assert.rejects(work,/retired/);
 assert.equal(starts,0);assert.equal(prefetches,0);assert.equal(timers.size,0);assert.ok(cleared.includes(2));
});
test('failure acquiring a speculative timer does not fail native load',async t=>{
 const {NativePlayer}=await import('../../web/generated/internal/native-player.js');const player=Object.create(NativePlayer.prototype),video=new EventTarget();let starts=0;
 Object.assign(player,{native:initialNativeBackend(),loadTimeoutMs:500,cancelers:new Set(),eventWaits:new Map(),video,startup:{prefetchAfterMs:400,prefetch(){throw Error('unexpected prefetch');}}});
 t.mock.method(globalThis,'setTimeout',(_,delay)=>{if(delay===400)throw Error('timer unavailable');return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});
 await player.wait('loadeddata',()=>{starts++;video.dispatchEvent(new Event('loadeddata'));});assert.equal(starts,1);assert.equal(player.native.waits.length,0);
});
