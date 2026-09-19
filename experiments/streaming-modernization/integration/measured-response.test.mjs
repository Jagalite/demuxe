// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {IncrementalTransport}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/incremental-transport.js')).href:'./files/web/incremental-transport.js');
const url='https://media.test/segment';
const turn=()=>new Promise(r=>setImmediate(r));
function setup(t,size=100000){let controller;const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(new ReadableStream({start(c){controller=c;}},{highWaterMark:0}),{headers:{'Content-Length':String(size)}});
 const transport=new IncrementalTransport({url,streaming:{qualityPolicy:{mode:'auto'}}},null,{stallMs:100,absoluteMs:1000});
 t.after(()=>{transport.close();globalThis.fetch=old;});return {transport,get controller(){return controller;}};}
test('consumer starts before completion and a bounded small response measures without further demand',async t=>{
 const s=setup(t),h=await s.transport.open(url);s.controller.enqueue(new Uint8Array(1000));
 assert.equal((await s.transport.read(h.id,0n,512)).length,512);assert.equal(s.transport.networkSamples.pending.length,0);
 s.controller.enqueue(new Uint8Array(99000));s.controller.close();await turn();
 assert.equal(s.transport.networkSamples.pending.length,1);assert.equal(s.transport.stats.fetchedBytes,100000);
 let at=512n;while(at<100000n)at+=BigInt((await s.transport.read(h.id,at,65536)).length);
 assert.equal(at,100000n);assert.equal(s.transport.networkSamples.pending.length,1);
 s.transport.closeHandle(h.id);await turn();assert.equal(s.transport.stats.retainedBytes,0);assert.equal(s.transport.reservedBytes,0);
});
for(const mode of ['error','extra','cancel'])test('measured response '+mode+' retires and does not produce success',async t=>{
 const s=setup(t),h=await s.transport.open(url);s.controller.enqueue(new Uint8Array(1000));await turn();
 if(mode==='error')s.controller.error(Error('transport'));else if(mode==='extra')s.controller.enqueue(new Uint8Array(100000));else s.transport.closeHandle(h.id);
 await turn();assert.equal(s.transport.networkSamples.pending.length,0);s.transport.closeHandle(h.id);await turn();assert.equal(s.transport.stats.retainedBytes,0);
});
test('large segments stay progressive and demand driven',async t=>{
 const s=setup(t,12*1024*1024),h=await s.transport.open(url);assert.equal(s.transport.handles.get(h.id).measured,undefined);
 s.controller.enqueue(new Uint8Array(1000));assert.equal((await s.transport.read(h.id,0n,1000)).length,1000);
 assert.equal(s.transport.stats.retainedBytes,0);
});
test('closing after read-ahead accounts for every fetched but unconsumed byte',async t=>{
 const s=setup(t),h=await s.transport.open(url);s.controller.enqueue(new Uint8Array(100000));s.controller.close();await turn();
 assert.equal((await s.transport.read(h.id,0n,512)).length,512);
 s.transport.closeHandle(h.id);await turn();
 assert.equal(s.transport.stats.fetchedBytes,100000);assert.equal(s.transport.stats.consumedBytes,512);
 assert.equal(s.transport.stats.discardedBytes,99488);assert.equal(s.transport.stats.retainedBytes,0);
});
