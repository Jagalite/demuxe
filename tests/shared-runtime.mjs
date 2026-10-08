// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DemuxeRuntime} from '../web/generated/runtime.js';
import {ProviderRuntime} from '../web/generated/internal/provider-runtime.js';
import {unitPlayer} from './helpers/unit-player.mjs';

const base='https://example.test/assets/';
const wasm=Buffer.from([0,97,115,109,1,0,0,0]);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(id='ffmpeg-file-preparation',path='web/engine-remux/remux.wasm',bytes=wasm){
  const sha256=digest(bytes),identity='sha256:'+digest(JSON.stringify({['runtime/'+path]:sha256},null,2)+'\n');
  return {id,path,bytes,identity,manifest:{schema:1,providerContractVersion:1,revision:'test',assets:[{id,path,bytes:bytes.length,sha256}],providers:[{id,implementationIdentity:identity,technology:'wasm',delivery:['optional-assets'],assetIds:[id],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]}]}};
}
function runtime(fixtures,options={}){return new DemuxeRuntime({assetBase:base,qualifiedProviders:Object.fromEntries(fixtures.map(f=>[f.id,f.identity])),...options});}
function session(shared){return new ProviderRuntime(new URL(base),shared.qualifiedProviders,undefined,shared);}
const turn=()=>new Promise(setImmediate);

for(const initial of [[],['inspector']])test(`preparation adopts new providers after ${initial.length?'a failed warmup':'an empty warmup'}`,async t=>{
  const f=fixture('ffmpeg-file-preparation-asyncify','web/engine-remux-asyncify/remux.wasm');
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):new Response(wasm));
  const shared=runtime([f]),player=unitPlayer({runtime:shared,assetBase:base,remuxRuntime:'asyncify'});
  t.after(async()=>{await player.destroy();await shared.destroy();});
  const before=await player.prepare(initial);
  if(initial.length)assert.equal(before.assets[0].status,'failed');
  await shared.providers.load('extra.json');
  const report=await player.prepare(['inspector']);
  assert.equal(report.assets[0].status,'ready');
  assert.equal(report.assets[0].bytes,wasm.length);
  assert.equal(player.providerRuntime.revision,shared.snapshot.revision);
  assert.equal(player.providerUpdatePending,true,'Warming must preserve the pending route reevaluation');
});

test('Player preparation and playback share one compilation across runtime consumers',async t=>{
  const f=fixture('ffmpeg-file-preparation-asyncify','web/engine-remux-asyncify/remux.wasm'),requests=[];
  t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(f.manifest):new Response(wasm);});
  const compile=WebAssembly.compile;let compilations=0;
  t.mock.method(WebAssembly,'compile',async bytes=>{compilations++;return compile(bytes);});
  const shared=runtime([f]);await shared.providers.load('providers.json');
  const a=unitPlayer({runtime:shared,assetBase:base,remuxRuntime:'asyncify'}),b=unitPlayer({runtime:shared,assetBase:base,remuxRuntime:'asyncify'});
  t.after(async()=>{await Promise.all([a.destroy(),b.destroy()]);await shared.destroy();});
  const reports=await Promise.all([a.prepare(['inspector']),b.prepare(['inspector'])]);
  assert.ok(reports.every(report=>report.assets[0].status==='ready'));
  assert.equal(compilations,1);
  const prepared=await a.preparation.readyModule('engine-remux');
  assert.strictEqual(await b.preparation.readyModule('engine-remux'),prepared);
  assert.strictEqual(await a.providerRuntime.module(f.path),prepared);
  await a.destroy();assert.strictEqual(await b.providerRuntime.module(f.path),prepared);
  assert.equal(compilations,1);assert.equal(requests.length,2);
});

test('Player rejects mismatched asset roots and disposed runtimes before allocating its surface',async()=>{
  const shared=runtime([]);
  assert.throws(()=>unitPlayer({runtime:shared,assetBase:'https://different.test/'}),{code:'INVALID_ARGUMENT'});
  const player=unitPlayer({runtime:shared,assetBase:base});await player.destroy();assert.equal(shared.snapshot.revision,0);
  await shared.destroy();assert.throws(()=>unitPlayer({runtime:shared,assetBase:base}),{code:'ABORTED'});
});

test('concurrent players share manifest acquisition, verified bytes and compilation; copies can be transferred',async t=>{
  const f=fixture(),requests=[];
  t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(f.manifest):new Response(f.bytes);});
  const shared=runtime([f]);t.after(()=>shared.destroy());
  await Promise.all([shared.providers.load('providers.json'),shared.providers.load('providers.json')]);
  assert.equal(requests.length,1,'registration is lazy');
  const a=session(shared),b=session(shared);t.after(()=>Promise.all([a.destroy(),b.destroy()]));
  const [ma,mb]=await Promise.all([a.module(f.path),b.module(f.path)]);
  assert.strictEqual(ma,mb);assert.equal(requests.length,2);
  const first=await a.bytes(f.path);structuredClone(first,{transfer:[first]});assert.equal(first.byteLength,0);
  assert.deepEqual(Buffer.from(await b.bytes(f.path)),wasm);
  await a.destroy();assert.strictEqual(await b.module(f.path),mb);
  assert.equal(shared.cacheStats.reservedBytes,wasm.length);
});

test('destroying one player interrupts its wait without cancelling another player',async t=>{
  const f=fixture();let release,requestSignal,started;
  const began=new Promise(resolve=>started=resolve);
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(String(url).endsWith('.json'))return Response.json(f.manifest);
    requestSignal=options.signal;started();return new Promise(resolve=>release=()=>resolve(new Response(wasm)));
  });
  const shared=runtime([f]);t.after(()=>shared.destroy());await shared.providers.load('providers.json');
  const a=session(shared),b=session(shared);t.after(()=>b.destroy());
  const first=a.bytes(f.path),second=b.bytes(f.path);await began;
  const rejected=assert.rejects(first,{name:'AbortError'});await a.destroy();await rejected;
  assert.equal(requestSignal.aborted,false);release();assert.deepEqual(Buffer.from(await second),wasm);
});

test('a failed fetch is retryable and never cached as verified content',async t=>{
  const f=fixture();let reads=0;
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):new Response(++reads===1?Buffer.alloc(wasm.length):wasm));
  const shared=runtime([f]);t.after(()=>shared.destroy());await shared.providers.load('providers.json');const a=session(shared);t.after(()=>a.destroy());
  await assert.rejects(a.bytes(f.path),{code:'ASSET_LOAD_FAILED'});
  assert.equal(shared.cacheStats.entries,0);
  assert.deepEqual(Buffer.from(await a.bytes(f.path)),wasm);assert.equal(reads,2);
});

test('new providers publish atomically; players adopt at their own operation boundary',async t=>{
  const a=fixture(),b=fixture('ffmpeg-file-preparation-asyncify','web/engine-remux-asyncify/remux.wasm');
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('a.json')?Response.json(a.manifest):String(url).endsWith('b.json')?Response.json(b.manifest):new Response(wasm));
  const shared=runtime([a,b]);t.after(()=>shared.destroy());let changes=0;const unsubscribe=shared.subscribe(()=>changes++);
  await shared.providers.load('a.json');const player=session(shared);t.after(()=>player.destroy());await player.load();
  const old=await player.module(a.path);assert.equal(player.has(b.path),false);
  await shared.providers.load('b.json');assert.equal(player.has(b.path),false);
  assert.equal(player.refresh(),true);assert.equal(player.has(b.path),true);assert.strictEqual(await player.module(a.path),old);
  assert.equal(player.refresh(),false);assert.equal(changes,2);
  await shared.providers.load('b.json');assert.equal(changes,2);unsubscribe();
});

test('parallel catalog additions merge without losing updates',async t=>{
  const a=fixture(),b=fixture('ffmpeg-file-preparation-asyncify','web/engine-remux-asyncify/remux.wasm');
  t.mock.method(globalThis,'fetch',async url=>Response.json(String(url).endsWith('a.json')?a.manifest:b.manifest));
  const shared=runtime([a,b]);t.after(()=>shared.destroy());
  await Promise.all([shared.providers.load('a.json'),shared.providers.load('b.json')]);
  assert.equal(shared.providers.snapshot.revision,2);assert.deepEqual(shared.providers.snapshot.providers.map(p=>p.id).sort(),[a.id,b.id].sort());
});

test('unqualified identities, edited closures and incompatible contracts never publish',async t=>{
  for(const kind of ['unqualified','closure','contract']){
    const f=fixture(),manifest=structuredClone(f.manifest);
    if(kind==='closure')manifest.assets[0].sha256='0'.repeat(64);
    if(kind==='contract')manifest.providers[0].offers[0].version=999;
    t.mock.method(globalThis,'fetch',async()=>Response.json(manifest));
    const shared=runtime(kind==='unqualified'?[]:[f]);let changes=0;shared.subscribe(()=>changes++);
    await assert.rejects(shared.providers.load('bad.json'));assert.equal(changes,0);assert.equal(shared.providers.snapshot.revision,0);await shared.destroy();
  }
});

test('conflicting declarations cannot replace active assets or partially add providers',async t=>{
  const a=fixture(),b=fixture('additional','web/new.wasm');let manifest=a.manifest;
  t.mock.method(globalThis,'fetch',async()=>Response.json(manifest));
  const shared=runtime([a,b]);t.after(()=>shared.destroy());await shared.providers.load('a.json');
  manifest=structuredClone(b.manifest);manifest.assets.push({...a.manifest.assets[0],bytes:100});
  await assert.rejects(shared.providers.load('conflict.json'),{code:'ASSET_LOAD_FAILED'});
  assert.deepEqual(shared.providers.snapshot.providers.map(p=>p.id),[a.id]);assert.equal(shared.providers.snapshot.revision,1);
});

test('cache budget evicts completed entries and clear preserves provider registration',async t=>{
  const a=fixture(),b=fixture('additional','web/new.wasm');let reads=0;
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('a.json')?Response.json(a.manifest):String(url).endsWith('b.json')?Response.json(b.manifest):(reads++,new Response(wasm)));
  const shared=runtime([a,b],{maxCacheBytes:8});t.after(()=>shared.destroy());await shared.providers.load('a.json');await shared.providers.load('b.json');
  const player=session(shared);t.after(()=>player.destroy());
  await player.bytes(a.path);await player.bytes(b.path);assert.equal(shared.cacheStats.entries,1);
  await player.bytes(a.path);assert.equal(reads,3);
  shared.clearCache();assert.equal(shared.cacheStats.entries,0);assert.equal(shared.providers.snapshot.providers.length,2);
});

test('manifest consumer cancellation is isolated and failed manifests can be retried',async t=>{
  const f=fixture();let release,reads=0;
  t.mock.method(globalThis,'fetch',()=>{reads++;return new Promise(resolve=>release=()=>resolve(Response.json(f.manifest)));});
  const shared=runtime([f]);t.after(()=>shared.destroy());const controller=new AbortController();
  const first=shared.providers.load('a.json',{signal:controller.signal}),second=shared.providers.load('a.json');
  const rejected=assert.rejects(first,{name:'AbortError'});controller.abort();await rejected;release();await second;assert.equal(reads,1);
  let fail=true;t.mock.method(globalThis,'fetch',async()=>fail?new Response('',{status:500}):Response.json(f.manifest));
  await assert.rejects(shared.providers.load('retry.json'));fail=false;await shared.providers.load('retry.json');assert.equal(shared.providers.snapshot.revision,1);
});

test('preload uses the shared cache and runtime disposal aborts owned requests',async t=>{
  const f=fixture();let reads=0;
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):(reads++,new Response(wasm)));
  const shared=runtime([f]);await shared.providers.load('a.json',{preload:true});const player=session(shared);await player.bytes(f.path);assert.equal(reads,1);
  shared.clearCache();let started;const began=new Promise(resolve=>started=resolve);
  t.mock.method(globalThis,'fetch',async(_,options)=>{started();return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));});
  const pending=player.bytes(f.path),rejected=assert.rejects(pending);await began;await shared.destroy();await rejected;await player.destroy();
  await assert.rejects(shared.providers.load('b.json'),{code:'ABORTED'});assert.equal(shared.cacheStats.entries,0);await turn();
});

test('synchronous fetch reentry joins the reserved manifest load',async t=>{
  const f=fixture(),shared=runtime([f]);t.after(()=>shared.destroy());let calls=0,nested;
  t.mock.method(globalThis,'fetch',async()=>{calls++;if(calls===1)nested=shared.providers.load('a.json');return Response.json(f.manifest);});
  await shared.providers.load('a.json');await nested;assert.equal(calls,1);assert.equal(shared.snapshot.revision,1);
});

test('late compilation cannot restore cache ownership after runtime destruction',async t=>{
  const f=fixture(),shared=runtime([f]);let finish,started;const began=new Promise(resolve=>started=resolve);
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):new Response(wasm));
  const compiled=await WebAssembly.compile(wasm);
  t.mock.method(WebAssembly,'compile',async()=>{started();return new Promise(resolve=>finish=()=>resolve(compiled));});
  await shared.providers.load('a.json');const player=session(shared);t.after(()=>player.destroy());
  const pending=player.module(f.path),rejected=assert.rejects(pending,{code:'ABORTED'});await began;await shared.destroy();finish();await rejected;
  assert.equal(shared.cacheStats.entries,0);
});

test('manifest size, origin and caller cancellation are enforced before publication',async t=>{
  const f=fixture(),shared=runtime([f]);t.after(()=>shared.destroy());let requests=0;
  t.mock.method(globalThis,'fetch',async()=>{requests++;return new Response(' '.repeat(1024*1024+1));});
  await assert.rejects(shared.providers.load('https://other.test/providers.json'),{code:'INVALID_ARGUMENT'});
  const controller=new AbortController();controller.abort();await assert.rejects(shared.providers.load('a.json',{signal:controller.signal}),{name:'AbortError'});assert.equal(requests,0);
  await assert.rejects(shared.providers.load('a.json'),{code:'ASSET_LOAD_FAILED'});assert.equal(shared.snapshot.revision,0);
});

test('concurrent in-flight reservations cannot exceed the cache budget',async t=>{
  const a=fixture(),b=fixture('additional','web/new.wasm'),shared=runtime([a,b],{maxCacheBytes:8});t.after(()=>shared.destroy());let release,started;const began=new Promise(resolve=>started=resolve);
  t.mock.method(globalThis,'fetch',async url=>{
    if(String(url).endsWith('a.json'))return Response.json(a.manifest);if(String(url).endsWith('b.json'))return Response.json(b.manifest);
    started();return new Promise(resolve=>release=()=>resolve(new Response(wasm)));
  });
  await shared.providers.load('a.json');await shared.providers.load('b.json');const player=session(shared);t.after(()=>player.destroy());
  const pending=player.bytes(a.path);await began;await assert.rejects(player.bytes(b.path),{code:'ASSET_LOAD_FAILED'});
  assert.equal(shared.cacheStats.reservedBytes,8);release();await pending;
});

test('runtime configuration cannot be reassigned to change qualification or asset roots',async t=>{
 const f=fixture(),shared=runtime([]);t.after(()=>shared.destroy());
 assert.throws(()=>{shared.qualifiedProviders={[f.id]:f.identity};},TypeError);
 assert.throws(()=>{shared.assetBase='https://other.test/';},TypeError);
 t.mock.method(globalThis,'fetch',async()=>Response.json(f.manifest));
 await assert.rejects(shared.providers.load('unqualified.json'),{code:'DEPLOYMENT_UNAVAILABLE'});
 assert.equal(shared.assetBase,base);assert.equal(shared.snapshot.revision,0);
});

test('runtime destruction interrupts compilation consumers before compilation settles',async t=>{
 const f=fixture(),shared=runtime([f]);let finish,started;const began=new Promise(resolve=>started=resolve);
 t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):new Response(wasm));
 const compiled=await WebAssembly.compile(wasm);
 t.mock.method(WebAssembly,'compile',async()=>{started();return new Promise(resolve=>finish=()=>resolve(compiled));});
 await shared.providers.load('a.json');const player=session(shared);t.after(()=>player.destroy());
 let settled=false;const pending=player.module(f.path).finally(()=>{settled=true;}),rejected=assert.rejects(pending,{code:'ABORTED'});
 await began;await shared.destroy();await turn();
 try{assert.equal(settled,true,'A destroyed runtime must release consumers of pending compilation');}
 finally{finish();await rejected;}
 assert.equal(shared.cacheStats.entries,0);
});

test('runtime destruction retires a consumer joining a completed manifest load',async t=>{
 const f=fixture(),shared=runtime([f]);t.after(()=>shared.destroy());
 t.mock.method(globalThis,'fetch',async()=>Response.json(f.manifest));
 await shared.providers.load('a.json');
 const pending=shared.providers.load('a.json');const destroyed=shared.destroy();
 await assert.rejects(pending,{code:'ABORTED'});await destroyed;
});

test('runtime load handles retirement while reading caller options',async t=>{
 const shared=runtime([]);t.after(()=>shared.destroy());let reads=0;
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected fetch');});
 await assert.rejects(shared.providers.load('a.json',{get signal(){reads++;void shared.destroy();return undefined;}}),{code:'ABORTED'});
 assert.ok(reads>0);assert.equal(fetch.mock.callCount(),0);
});

test('runtime destruction during preload cannot publish a successful load result',async t=>{
 const f=fixture(),shared=runtime([f]);t.after(()=>shared.destroy());
 t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(f.manifest):new Response(wasm));
 const preload=shared.preload.bind(shared);
 t.mock.method(shared,'preload',async(...args)=>{await preload(...args);await shared.destroy();});
 await assert.rejects(shared.providers.load('a.json',{preload:true}),{code:'ABORTED'});
});

test('empty preload cannot succeed after caller options retire the runtime',async t=>{
 const shared=runtime([]);t.after(()=>shared.destroy());let reads=0;
 await assert.rejects(shared.providers.preload([],{get signal(){reads++;void shared.destroy();return undefined;}}),{code:'ABORTED'});
 assert.equal(reads,1);
});
