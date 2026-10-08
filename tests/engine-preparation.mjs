// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EnginePreparation,preparationComponents} from '../web/generated/internal/engine-preparation.js';
import {preparedEngine} from '../web/prepared-engine.js';
globalThis.crossOriginIsolated=true;
const wasm=new Uint8Array([0,97,115,109,1,0,0,0]),base=new URL('https://assets.example/');
test('selected components, shared font and concurrent requests are bounded and deduplicated',async t=>{
 const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return new Response(wasm);});
 const assets=new EnginePreparation(base);
 const [first,second]=await Promise.all([assets.warm(['inspector']),assets.warm(['inspector','software','software'])]);
 assert.deepEqual(first.assets.map(a=>a.name),['inspector']);assert.ok(second.assets.every(a=>a.status==='ready'));
 assert.equal(requests.length,3);assert.ok(!requests.some(u=>u.includes('hybrid')));
 assert.ok(assets.module('engine-remux') instanceof WebAssembly.Module);
 const font=assets.fontCopy();new Uint8Array(font)[0]=99;assert.equal(new Uint8Array(assets.fontCopy())[0],0);
 await assets.warm('all');assert.equal(requests.length,4);
 assets.destroy();assert.equal(assets.module('engine-remux'),undefined);assert.equal(assets.fontCopy(),undefined);
});
test('none and invalid choices do not issue requests',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('unexpected fetch');});
 assert.deepEqual((await new EnginePreparation(base).warm([])).assets,[]);
 assert.throws(()=>preparationComponents(['unknown']),/prepare must/);
 assert.throws(()=>preparationComponents('software'),/prepare must/);
});
test('failed preparation is reported without retaining unusable assets',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('unavailable',{status:503}));
 const assets=new EnginePreparation(base);const report=await assets.warm(['software']);
 assert.ok(report.assets.every(a=>a.status==='failed'));assert.equal(assets.module('engine-software-full'),undefined);assert.equal(assets.fontCopy(),undefined);assets.destroy();
});
test('destroy during preparation aborts and does not publish late assets',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 t.mock.method(globalThis,'fetch',async()=>{await gate;return new Response(wasm);});
 const assets=new EnginePreparation(base),pending=assets.warm(['software']);assets.destroy();release();
 assert.ok((await pending).assets.every(a=>a.status==='aborted'));assert.equal(assets.module('engine-software-full'),undefined);assert.equal(assets.fontCopy(),undefined);
});
test('compiled modules instantiate with independent state using the engine hook',async()=>{
 const module=await WebAssembly.compile(wasm);let received;
 const options=preparedEngine(module);options.instantiateWasm({},(instance,compiled)=>{received=instance;assert.equal(compiled,module);});
 assert.ok(received instanceof WebAssembly.Instance);assert.deepEqual(preparedEngine(undefined),{});
});
test('playback shares in-flight preparation without requesting unrelated components',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),requests=[];
 t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));await gate;return new Response(wasm);});
 const assets=new EnginePreparation(base),warm=assets.warm(['software']);
 const prepared=assets.readyEngine('engine-software-full');
 assert.equal(await assets.readyModule('engine-remux'),undefined);assert.equal(requests.length,2);
 release();await warm;const result=await prepared;
 assert.ok(result.module instanceof WebAssembly.Module);assert.equal(result.font.byteLength,8);assert.equal(requests.length,2);assets.destroy();
});

test('non-isolated preparation reports unavailable without fetching assets',async t=>{
 globalThis.crossOriginIsolated=false;
 try{
  t.mock.method(globalThis,'fetch',()=>{throw Error('unexpected fetch');});
  const assets=new EnginePreparation(base),report=await assets.warm('all');
  assert.ok(report.assets.every(a=>a.status==='failed'&&a.error.includes('cross-origin isolation')));
  assert.equal(await assets.readyModule('engine-remux'),undefined);assets.destroy();
 }finally{globalThis.crossOriginIsolated=true;}
});

test('oversized declared or streamed assets fail without retained modules',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response(wasm,{headers:{'content-length':String(33*1024*1024)}}):new Response(new Uint8Array(9*1024*1024)));
 const assets=new EnginePreparation(base);const report=await assets.warm(['software']);
 assert.ok(report.assets.every(a=>a.status==='failed'&&a.error.includes('byte budget')));assert.equal(assets.fontCopy(),undefined);assert.equal(assets.module('engine-software-full'),undefined);assets.destroy();
});

test('private inspectors preload without isolation and resolve the generic inspector module',async t=>{
 globalThis.crossOriginIsolated=false;
 try{
  const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return new Response(wasm);});
  for(const runtime of ['jspi','asyncify']){
   const assets=new EnginePreparation(base,undefined,undefined,runtime);
   assert.equal((await assets.warm(['inspector'])).assets[0].status,'ready');
   assert.equal(await assets.readyModule('engine-remux'),assets.module('engine-remux-'+runtime));
   assert.ok(await assets.readyModule('engine-remux') instanceof WebAssembly.Module);
   assert.ok((await assets.warm(['hybrid'])).assets.every(a=>a.status==='ready'));
   assert.ok(assets.module('engine-mpv-playback-'+runtime) instanceof WebAssembly.Module);
   assets.destroy();
  }
  assert.deepEqual(requests,['https://assets.example/web/engine-remux-jspi/remux.wasm','https://assets.example/web/engine-mpv-playback-jspi/player.wasm','https://assets.example/fixtures/DejaVuSans.ttf','https://assets.example/web/engine-remux-asyncify/remux.wasm','https://assets.example/web/engine-mpv-playback-asyncify/player.wasm','https://assets.example/fixtures/DejaVuSans.ttf']);
 }finally{globalThis.crossOriginIsolated=true;}
});

test('modular deployments keep atomic pthread playback when only their inspector uses a private runtime',async()=>{
 const paths=[],provider={has:()=>false,bytes:async path=>{paths.push(path);return wasm.buffer.slice(0);},module:async()=>WebAssembly.compile(wasm)};
 const assets=new EnginePreparation(base,undefined,undefined,'asyncify',provider);
 assert.ok((await assets.warm('all')).assets.every(a=>a.status==='ready'));
 assert.deepEqual(paths,['web/engine-remux-asyncify/remux.wasm','web/engine-hybrid/player.wasm','web/engine-software-full/player.wasm','fixtures/DejaVuSans.ttf']);
 assert.ok((await assets.readyEngine('engine-hybrid')).module instanceof WebAssembly.Module);assets.destroy();
});

test('progress callbacks can synchronously warm the same roles without duplicate fetches',async t=>{
 const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return new Response(wasm);});
 let nested,entered=false;const assets=new EnginePreparation(base,undefined,()=>{if(!entered){entered=true;nested=assets.warm(['software','hybrid']);}});
 const first=await assets.warm(['software','hybrid']);const second=await nested;assert.ok(first.assets.every(asset=>asset.status==='ready'));assert.ok(second.assets.every(asset=>asset.status==='ready'));
 assert.equal(requests.length,3);assets.destroy();
});
test('destroyed preparation rejects new physical work with aborted reports',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(wasm);});const assets=new EnginePreparation(base);assets.destroy();
 assert.ok((await assets.warm('all')).assets.every(asset=>asset.status==='aborted'));assert.equal(calls,0);
});

test('destroy from ready notification retires its report and clears published assets',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(wasm));const assets=new EnginePreparation(base,undefined,()=>{if(assets.progress.some(item=>item.status==='ready'))assets.destroy();});
 const report=await assets.warm(['inspector']);assert.equal(report.assets[0].status,'aborted');assert.equal(assets.module('engine-remux'),undefined);
});

test('readyEngine after destroy does not wait for retired physical fetch cleanup',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve);t.mock.method(globalThis,'fetch',async()=>{await gate;return new Response(wasm);});
 const assets=new EnginePreparation(base),warming=assets.warm(['software']);assets.destroy();let ready=false;
 const reading=assets.readyEngine('engine-software-full').then(value=>{ready=true;assert.deepEqual(value,{module:undefined,font:undefined});});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(ready,true);release();await reading;await warming;
});
