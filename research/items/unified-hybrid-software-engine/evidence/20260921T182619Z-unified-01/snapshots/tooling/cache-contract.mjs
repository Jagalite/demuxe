// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=(await readFile('research/items/unified-hybrid-software-engine/active-run.txt','utf8')).trim();
const {EnginePreparation}=await import(pathToFileURL(path.resolve(out,'runtime/web/generated/internal/engine-preparation.js')));
const originalFetch=globalThis.fetch,originalCompile=WebAssembly.compile;
const emptyModule=new Uint8Array([0,97,115,109,1,0,0,0]);const results=[];
try{
 let fetched=[],compiled=0;
 globalThis.fetch=async url=>{fetched.push(String(url));await new Promise(r=>setTimeout(r,10));return new Response(String(url).includes('.ttf')?new Uint8Array([1,2,3]):emptyModule);};
 WebAssembly.compile=async bytes=>{if(bytes.byteLength===emptyModule.length)compiled++;return originalCompile(bytes);};
 const cache=new EnginePreparation(new URL('http://test/'));
 const [hybrid,software]=await Promise.all([cache.warm(['hybrid']),cache.warm(['software'])]);
 assert.ok([...hybrid.assets,...software.assets].every(a=>a.status==='ready'));
 assert.equal(fetched.filter(x=>x.includes('.wasm')).length,1);assert.equal(compiled,1);
 const [a,b]=await Promise.all([cache.readyEngine('engine-hybrid'),cache.readyEngine('engine-software-full')]);
 assert.ok(a.module instanceof WebAssembly.Module);assert.equal(a.module,b.module);assert.notEqual(a.font,b.font);assert.equal(compiled,1);assert.equal(fetched.length,2);
 cache.destroy();assert.equal(cache.module('engine-hybrid'),undefined);results.push({case:'concurrent modes and repeated readiness reuse one fetch and module; fonts copied; destroy clears cache',passed:true});
 fetched=[];globalThis.fetch=async url=>{fetched.push(String(url));return new Response('unavailable',{status:503});};
 const unavailable=new EnginePreparation(new URL('http://test/'));const failure=await unavailable.warm(['hybrid','software']);assert.ok(failure.assets.every(a=>a.status==='failed'));assert.equal(fetched.filter(x=>x.includes('.wasm')).length,1);unavailable.destroy();results.push({case:'one unavailable shared asset reports failure to both mode aliases without a second fetch',passed:true});
 globalThis.fetch=async (url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 const cancelled=new EnginePreparation(new URL('http://test/'));const pending=cancelled.warm(['hybrid','software']);cancelled.destroy();assert.ok((await pending).assets.every(a=>a.status==='aborted'));assert.equal(cancelled.module('engine-hybrid'),undefined);results.push({case:'destroy cancels shared fetch and all waiters',passed:true});
 let release,entered;const started=new Promise(r=>entered=r);globalThis.fetch=async url=>new Response(String(url).includes('.ttf')?new Uint8Array([1]):emptyModule);WebAssembly.compile=async bytes=>{entered();await new Promise(r=>release=r);return originalCompile(bytes);};
 const late=new EnginePreparation(new URL('http://test/'));const compiling=late.warm(['hybrid','software']);await started;late.destroy();release();const report=await compiling;assert.ok(report.assets.filter(a=>a.name!=='font').every(a=>a.status==='aborted'));assert.equal(late.module('engine-hybrid'),undefined);results.push({case:'late compile after destroy cannot repopulate shared cache',passed:true});
}finally{globalThis.fetch=originalFetch;WebAssembly.compile=originalCompile;}
await writeFile(path.join(out,'cache-contract.json'),JSON.stringify({passed:true,results,scope:'Node contract controls for cache ownership, using an actual minimal Wasm module; full engine execution is separately browser-tested.'},null,2));console.log(JSON.stringify(results));
