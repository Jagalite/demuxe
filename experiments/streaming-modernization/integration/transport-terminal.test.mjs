import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {IncrementalTransport}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/incremental-transport.js')).href:'./files/web/incremental-transport.js');
const url='https://media.test/segment';
function setup(t){let controller;const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response(new ReadableStream({start(c){controller=c;}},{highWaterMark:0}),{headers:{'Content-Length':'32768'}});
 const transport=new IncrementalTransport({url},null,{stallMs:100,absoluteMs:1000});
 t.after(()=>{transport.close();globalThis.fetch=previous;});return {transport,get controller(){return controller;}};}
test('known-length last chunk verifies EOF without losing remaining consumer bytes',async t=>{
 const s=setup(t),h=await s.transport.open(url);s.controller.enqueue(new Uint8Array(32768));s.controller.close();
 assert.equal((await s.transport.read(h.id,0n,512)).length,512);
 assert.equal(s.transport.networkSamples.pending.length,1);
 assert.equal((await s.transport.read(h.id,512n,32768)).length,32256);
 assert.equal((await s.transport.read(h.id,32768n,1)).length,0);
 s.transport.closeHandle(h.id);assert.equal(s.transport.stats.cancellations,0);assert.equal(s.transport.reservedBytes,0);
});
for(const mode of ['error','extra','cancel'])test('declared bytes followed by '+mode+' never become a completed sample',async t=>{
 const s=setup(t),h=await s.transport.open(url),abort=new AbortController();s.controller.enqueue(new Uint8Array(32768));
 const pending=s.transport.read(h.id,0n,32768,abort.signal);const rejection=assert.rejects(pending);
 await new Promise(r=>setImmediate(r));assert.equal(s.transport.reservedBytes,4*1024*1024);
 if(mode==='error')s.controller.error(Error('truncated trailer'));else if(mode==='extra')s.controller.enqueue(Uint8Array.of(1));else abort.abort();
 await rejection;assert.equal(s.transport.networkSamples.pending.length,0);assert.equal(s.transport.reservedBytes,0);
});
