// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {startupEscalationPolicy,StartupModules} from '../web/generated/internal/startup-escalation.js';
import {NativePlayer} from '../web/generated/internal/native-player.js';
import {initialNativeBackend} from '../web/generated/internal/machine/native-backend.js';
import {NativeLoadTimeout} from '../web/generated/internal/runtime-capability.js';
const wasm=Uint8Array.of(0,97,115,109,1,0,0,0);
test('public thresholds validate defaults, overrides and disabling',()=>{
 assert.deepEqual(startupEscalationPolicy(),{prefetchAfterMs:400,switchAfterMs:500});
 assert.deepEqual(startupEscalationPolicy({switchAfterMs:900}),{prefetchAfterMs:400,switchAfterMs:900});
 assert.equal(startupEscalationPolicy(false),undefined);
 for(const input of [null,true,[],{prefetchAfterMs:-1},{prefetchAfterMs:500},{switchAfterMs:0},{switchAfterMs:NaN},{switchAfterMs:Infinity},{switchAfterMs:25000}])assert.throws(()=>startupEscalationPolicy(input),e=>e.code==='INVALID_ARGUMENT');
});
function waiting(t,policy={prefetchAfterMs:400,switchAfterMs:500}){
 let now=0,started=0;t.mock.timers.enable({apis:['setTimeout']});t.mock.method(performance,'now',()=>now);
 const video=new EventTarget(),p=Object.assign(Object.create(NativePlayer.prototype),{native:initialNativeBackend(),cancelers:new Set(),eventWaits:new Map(),video,loadTimeoutMs:policy.switchAfterMs,startup:{prefetchAfterMs:policy.prefetchAfterMs,prefetch:()=>started++}});
 return {p,video,get started(){return started;},advance(ms){now+=ms;t.mock.timers.tick(ms);}};
}
test('400ms starts preparation and 500ms rejects the direct load',async t=>{
 const h=waiting(t),wait=h.p.wait('loadeddata',()=>{}),failed=assert.rejects(wait,e=>e instanceof NativeLoadTimeout&&e.budgetMs===500);
 h.advance(399);assert.equal(h.started,0);h.advance(1);assert.equal(h.started,1);h.advance(100);await failed;assert.equal(h.p.cancelers.size,0);assert.equal(h.p.eventWaits.size,0);
});
test('fast readiness cancels speculation; readiness between deadlines cancels escalation',async t=>{
 const h=waiting(t);let wait=h.p.wait('loadeddata',()=>{});h.advance(200);h.video.dispatchEvent(new Event('loadeddata'));await wait;h.advance(500);assert.equal(h.started,0);
 wait=h.p.wait('loadeddata',()=>{});h.advance(400);assert.equal(h.started,1);h.advance(50);h.video.dispatchEvent(new Event('loadeddata'));await wait;h.advance(100);assert.equal(h.p.eventWaits.size,0);
});
test('abort cancels pending prefetch and custom deadlines use configured values',async t=>{
 const h=waiting(t,{prefetchAfterMs:20,switchAfterMs:30}),c=new AbortController();
 const wait=h.p.wait('loadeddata',()=>{},c.signal),failed=assert.rejects(wait,{name:'AbortError'});h.advance(10);c.abort();await failed;h.advance(30);assert.equal(h.started,0);
 const next=h.p.wait('loadedmetadata',()=>{}),timed=assert.rejects(next,NativeLoadTimeout);h.advance(20);assert.equal(h.started,1);h.advance(10);await timed;
});
test('prefetch exceptions cannot fail direct playback',async t=>{
 const h=waiting(t);h.p.startup.prefetch=()=>{throw Error('prefetch failed');};const wait=h.p.wait('loadeddata',()=>{});h.advance(400);h.video.dispatchEvent(new Event('loadeddata'));await wait;
});
test('prefetched Wasm is reused even with no-store responses and failures can retry',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(wasm,{headers:{'Cache-Control':'no-store'}});});
 const assets=new StartupModules(new URL('https://example.test/'));const first=assets.warm('web/engine-remux/remux.wasm'),second=assets.warm('web/engine-remux/remux.wasm');assert.equal(first,second);
 assert.ok(await first instanceof WebAssembly.Module);assert.equal(await assets.ready('web/engine-remux/remux.wasm'),await first);assert.equal(calls,1);assets.destroy();assert.equal(assets.ready('web/engine-remux/remux.wasm'),undefined);
});
test('failed speculation is observed and does not poison subsequent acquisition',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('',{status:503}):new Response(wasm));const assets=new StartupModules(new URL('https://example.test/'));
 await assert.rejects(assets.warm('x.wasm'));assert.equal(assets.ready('x.wasm'),undefined);assert.ok(await assets.warm('x.wasm') instanceof WebAssembly.Module);assets.destroy();
});
test('destroy aborts in-flight downloads and prevents late publication',async t=>{
 let signal;t.mock.method(globalThis,'fetch',async(_url,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));});
 const assets=new StartupModules(new URL('https://example.test/')),work=assets.warm('x.wasm');await Promise.resolve();assets.destroy();assert.equal(signal.aborted,true);await assert.rejects(work);assert.equal(await assets.bytes('x.wasm'),undefined);
});
