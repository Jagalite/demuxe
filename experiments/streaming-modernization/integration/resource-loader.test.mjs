// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=process.env.INTEGRATION_ROOT;
if(!root)throw Error('Set INTEGRATION_ROOT to a prepared integrated snapshot');
const {ResourceLoader}=await import(pathToFileURL(resolve(root,'web/resource-loader.js')));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function loader(t,fetch){
  const previous=globalThis.fetch;globalThis.fetch=fetch;
  const value=new ResourceLoader({url:'https://media.example/master.m3u8',immutable:true,streaming:{integrated:true}});
  t.after(()=>{value.close();globalThis.fetch=previous;});return value;
}
test('full manifests remain owned by FFmpeg without fixed-selection rewriting',async t=>{
  const manifest='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100000\nlow.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=900000\nhigh.m3u8\n';
  const requested=[];const l=loader(t,async url=>{requested.push(url);return new Response(manifest);});
  const info=await l.open('https://media.example/master.m3u8',{manifest:true});
  assert.equal(new TextDecoder().decode(await l.read(info.id,0n,1024)),manifest);
  assert.deepEqual(requested,['https://media.example/master.m3u8']);assert.equal(l.adapter.virtual.size,0);
});
test('slow candidate headers do not block opening the next active segment',async t=>{
  let resolveCandidate;const l=loader(t,async url=>url.endsWith('candidate')?new Promise(r=>resolveCandidate=r):new Response(new Uint8Array(1024).fill(7)));
  const abort=new AbortController();const pending=l.open('https://media.example/candidate',{signal:abort.signal});
  const rejected=assert.rejects(pending,e=>e.kind==='cancelled');await turn();
  const active=await l.open('https://media.example/active');
  assert.equal((await l.read(active.id,0n,512))[0],7);
  abort.abort();resolveCandidate(new Response(new Uint8Array(1024)));
  await rejected;assert.equal(l.busy,0);assert.equal(l.handles.size,1);
  assert.equal((await l.read(active.id,512n,512)).length,512);
});
test('parallel manifests retain independent cancellation and shared byte accounting',async t=>{
  const pending=new Map();const l=loader(t,async url=>new Response(new ReadableStream({start(c){pending.set(url,c)}})));
  const a=new AbortController();const first=l.open('https://media.example/a.m3u8',{manifest:true,signal:a.signal});
  const rejected=assert.rejects(first,e=>e.kind==='cancelled');
  const second=l.open('https://media.example/b.m3u8',{manifest:true});await turn();
  a.abort();pending.get('https://media.example/b.m3u8').enqueue(new TextEncoder().encode('#EXTM3U\n#EXT-X-ENDLIST\n'));pending.get('https://media.example/b.m3u8').close();
  const info=await second;await rejected;
  assert.match(new TextDecoder().decode(await l.read(info.id,0n,1024)),/ENDLIST/);
  assert.equal(l.scratchReservedBytes,0);assert.equal(l.busy,0);assert.ok(l.stats.peakBudgetedBytes<=16*1024*1024);
});
