import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {IncrementalTransport}=await import(process.env.TRANSPORT_WEB
  ? pathToFileURL(resolve(process.env.TRANSPORT_WEB,'incremental-transport.js')).href
  : './files/web/incremental-transport.js');
const url='https://media.example/segment';
function setup(t,limits={}){
  const controllers=new Map(),original=globalThis.fetch;
  globalThis.fetch=async value=>new Response(new ReadableStream({start(c){controllers.set(value,c);}},{highWaterMark:0}));
  const transport=new IncrementalTransport({url},undefined,{stallMs:2000,absoluteMs:5000,...limits});
  t.after(()=>{transport.close();globalThis.fetch=original;});
  return {transport,controllers};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('candidate cancellation does not abort active resource reads',async t=>{
  const {transport,controllers}=setup(t),active=await transport.open(url+'/active'),candidate=await transport.open(url+'/candidate');
  const cancel=new AbortController();
  const pending=transport.read(candidate.id,0n,20,cancel.signal);const rejected=assert.rejects(pending,e=>e.kind==='cancelled');
  const playing=transport.read(active.id,0n,20);cancel.abort();
  controllers.get(url+'/active').enqueue(Uint8Array.of(1,2,3));
  assert.deepEqual(await playing,Uint8Array.of(1,2,3));await rejected;
  assert.ok(transport.handles.has(active.id));assert.ok(!transport.handles.has(candidate.id));
  assert.equal(transport.reservedBytes,0);
});
test('concurrent pending pulls reserve the combined allocation ceiling',async t=>{
  const {transport,controllers}=setup(t,{retained:4*1024*1024});
  const handles=await Promise.all([1,2,3].map(i=>transport.open(url+'/'+i)));
  const first=transport.read(handles[0].id,0n,1),second=transport.read(handles[1].id,0n,1);
  await turn();assert.equal(transport.reservedBytes,4*1024*1024);
  await assert.rejects(transport.read(handles[2].id,0n,1),e=>e.kind==='budget');
  controllers.get(url+'/1').enqueue(Uint8Array.of(1));controllers.get(url+'/2').enqueue(Uint8Array.of(2));
  await Promise.all([first,second]);assert.equal(transport.reservedBytes,0);
});
test('cancelled header request retires without cancelling another open',async t=>{
  const original=globalThis.fetch;
  globalThis.fetch=async value=>value.endsWith('/stalled')?new Promise(()=>{}):new Response(Uint8Array.of(7));
  const transport=new IncrementalTransport({url},undefined,{stallMs:2000,absoluteMs:5000});
  t.after(()=>{transport.close();globalThis.fetch=original;});
  const abort=new AbortController(),pending=transport.open(url+'/stalled',{signal:abort.signal});
  const rejected=assert.rejects(pending,e=>e.kind==='cancelled');abort.abort();
  const active=await transport.open(url+'/active');await rejected;
  assert.equal((await transport.read(active.id,0n,1))[0],7);assert.equal(transport.opening,0);
});
