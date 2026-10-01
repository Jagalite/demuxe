// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createComponentOwners} from '../build/component-candidates/provider-container/src/owners.js';
const minimal=Uint8Array.of(0,97,115,109,1,0,0,0).buffer;
async function setup(source){
 const root=await mkdtemp(path.join(tmpdir(),'demuxe-owner-failure-'));
 const folder=path.join(root,'web/providers/audio/aac');await mkdir(folder,{recursive:true});
 if(source!==null)await writeFile(path.join(folder,'module.mjs'),source);
 const base=pathToFileURL(root+'/');
 const catalog={providers:[{id:'audio-aac',implementationIdentity:'test'},{id:'ts-container',implementationIdentity:'test-container'}]};
 const assets=['module.mjs','module.wasm'].map(name=>({id:name,url:new URL('web/providers/audio/aac/'+name,base).href}));
 const owners=createComponentOwners({catalog,assets,providerAssets:{'audio-aac':assets.map(a=>a.id),'ts-container':['container-js']}},base);
 return {root,owners,owner:owners.owners.find(x=>x.id==='audio-aac'),container:owners.owners.find(x=>x.id==='ts-container'),dispose:()=>rm(root,{recursive:true,force:true})};
}
function empty(owners,id,js='not-evaluated'){
 const state=owners.readiness().find(x=>x.providerId===id);
 assert.equal(state.bytes,'unknown');assert.equal(state.wasm,id==='ts-container'?'not-applicable':'not-compiled');assert.equal(state.instance,'none');assert.equal(state.javascript,js);assert.equal(owners.allocatedWasmBytes(),0);
}
test('invalid Wasm and rejected acquisition clear resident preparation state',async()=>{
 const t=await setup(null);try{
 const c=new AbortController();assert.equal((await t.owner.prepare({signal:c.signal,asset:async()=>new ArrayBuffer(1)})).state,'unavailable');empty(t.owners,'audio-aac');
 await assert.rejects(t.owner.prepare({signal:c.signal,asset:async()=>{throw Error('network');}}),/network/);empty(t.owners,'audio-aac');
 }finally{await t.dispose();}
});
test('import failure releases compiled/readiness state',async()=>{
 const t=await setup(null);try{await assert.rejects(t.owner.prepare({signal:new AbortController().signal,asset:async()=>minimal}));empty(t.owners,'audio-aac');}finally{await t.dispose();}
});
test('factory failure preserves evaluated fact while dropping compiled bytes',async()=>{
 const t=await setup('export default async()=>{throw Error("factory failed")};');try{await assert.rejects(t.owner.prepare({signal:new AbortController().signal,asset:async()=>minimal}),/factory failed/);empty(t.owners,'audio-aac','evaluated');}finally{await t.dispose();}
});
test('abort after factory resolves releases instance and allows a new preparation',async()=>{
 const t=await setup('export default async()=>{globalThis.__demuxeOwnerAbort?.();return {HEAPU8:new Uint8Array(16)}};');
 try{const c=new AbortController();globalThis.__demuxeOwnerAbort=()=>c.abort();
 await assert.rejects(t.owner.prepare({signal:c.signal,asset:async()=>minimal}),{name:'AbortError'});empty(t.owners,'audio-aac','evaluated');
 delete globalThis.__demuxeOwnerAbort;
 const ready=await t.owner.prepare({signal:new AbortController().signal,asset:async()=>minimal});assert.equal(ready.state,'ready');assert.equal(t.owners.allocatedWasmBytes(),16);ready.dispose();empty(t.owners,'audio-aac','evaluated');
 }finally{delete globalThis.__demuxeOwnerAbort;await t.dispose();}
});
test('failed container acquisition does not leave an executable scope',async()=>{
 const t=await setup(null);try{
 await assert.rejects(t.container.prepare({signal:new AbortController().signal,asset:async()=>{throw Error('container acquisition');}}),/container acquisition/);empty(t.owners,'ts-container','evaluated');
 await assert.rejects(t.owners.executeCopy(new Blob(['invalid']),new AbortController().signal),/Container owner is unavailable/);
 }finally{await t.dispose();}
});
test('failed older container preparation preserves the current scope',async()=>{
 const t=await setup(null);try{
 let rejectOld;const old=t.container.prepare({signal:new AbortController().signal,asset:()=>new Promise((_,reject)=>{rejectOld=reject;})});
 const check=assert.rejects(old,{name:'AbortError'});
 const current=await t.container.prepare({signal:new AbortController().signal,asset:async()=>minimal});
 rejectOld(Error('old acquisition'));await check;
 assert.equal(t.owners.readiness().find(x=>x.providerId==='ts-container').bytes,'verified-resident');
 current.dispose();empty(t.owners,'ts-container','evaluated');
 }finally{await t.dispose();}
});

function readyAudio(owners,bytes){
 const state=owners.readiness().find(x=>x.providerId==='audio-aac');
 assert.equal(state.bytes,'verified-resident');assert.equal(state.wasm,'compiled');assert.equal(state.javascript,'evaluated');assert.equal(state.instance,'idle-reusable');assert.equal(owners.allocatedWasmBytes(),bytes);
}
test('failed older audio acquisition preserves a newer owner with the same signal',async()=>{
 const t=await setup('export default async()=>({HEAPU8:new Uint8Array(16)});');
 try{const signal=new AbortController().signal;let rejectOld;
 const old=t.owner.prepare({signal,asset:()=>new Promise((_,reject)=>{rejectOld=reject;})}),check=assert.rejects(old,{name:'AbortError'});
 const current=await t.owner.prepare({signal,asset:async()=>minimal});readyAudio(t.owners,16);
 rejectOld(Error('older audio fetch failed'));await check;readyAudio(t.owners,16);current.dispose();empty(t.owners,'audio-aac','evaluated');
 }finally{await t.dispose();}
});
test('older ready handles cannot dispose newer audio or container generations sharing a signal',async()=>{
 const t=await setup('let calls=0;export default async()=>({HEAPU8:new Uint8Array(++calls*16)});');
 try{const signal=new AbortController().signal;
 const oldAudio=await t.owner.prepare({signal,asset:async()=>minimal}),currentAudio=await t.owner.prepare({signal,asset:async()=>minimal});readyAudio(t.owners,32);
 oldAudio.dispose();readyAudio(t.owners,32);
 const oldContainer=await t.container.prepare({signal,asset:async()=>minimal}),currentContainer=await t.container.prepare({signal,asset:async()=>minimal});
 oldContainer.dispose();assert.equal(t.owners.readiness().find(x=>x.providerId==='ts-container').bytes,'verified-resident');readyAudio(t.owners,32);
 currentContainer.dispose();currentAudio.dispose();empty(t.owners,'audio-aac','evaluated');empty(t.owners,'ts-container','evaluated');
 }finally{await t.dispose();}
});
test('late older audio factory completion cannot overwrite the newer module',async()=>{
 const t=await setup('let calls=0;export default async()=>{const call=++calls;if(call===1){globalThis.__demuxeOwnerStarted();await globalThis.__demuxeOwnerFactoryWait;}return {HEAPU8:new Uint8Array(call===1?16:32)};};');
 try{let started,finish;const reached=new Promise(resolve=>{started=resolve;});globalThis.__demuxeOwnerStarted=started;globalThis.__demuxeOwnerFactoryWait=new Promise(resolve=>{finish=resolve;});
 const signal=new AbortController().signal,old=t.owner.prepare({signal,asset:async()=>minimal}),check=assert.rejects(old,{name:'AbortError'});await reached;
 const current=await t.owner.prepare({signal,asset:async()=>minimal});readyAudio(t.owners,32);finish();await check;readyAudio(t.owners,32);
 current.dispose();empty(t.owners,'audio-aac','evaluated');
 }finally{delete globalThis.__demuxeOwnerStarted;delete globalThis.__demuxeOwnerFactoryWait;await t.dispose();}
});
test('late older audio bytes and container assets cannot commit superseded state',async()=>{
 const t=await setup('export default async()=>({HEAPU8:new Uint8Array(16)});');
 try{const signal=new AbortController().signal;const releases=[];
 const oldAudio=t.owner.prepare({signal,asset:()=>new Promise(resolve=>releases.push(resolve))}),oldContainer=t.container.prepare({signal,asset:()=>new Promise(resolve=>releases.push(resolve))});
 const checks=Promise.all([assert.rejects(oldAudio,{name:'AbortError'}),assert.rejects(oldContainer,{name:'AbortError'})]);
 const currentAudio=await t.owner.prepare({signal,asset:async()=>minimal}),currentContainer=await t.container.prepare({signal,asset:async()=>minimal});
 for(const release of releases)release(minimal);await checks;readyAudio(t.owners,16);assert.equal(t.owners.readiness().find(x=>x.providerId==='ts-container').bytes,'verified-resident');
 currentAudio.dispose();currentContainer.dispose();empty(t.owners,'audio-aac','evaluated');empty(t.owners,'ts-container','evaluated');
 }finally{await t.dispose();}
});
