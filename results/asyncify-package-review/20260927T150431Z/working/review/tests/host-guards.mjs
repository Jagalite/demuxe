// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CoopScheduler} from '../../runtime/scheduler.mjs';
import {createFFmpegBridge} from '../../ffmpeg/runtime/ffmpeg-bridge.mjs';
import {SingleOwner} from '../../ffmpeg/runtime/single-owner.mjs';
const runs=[];
async function test(name,fn){try{await fn();runs.push({name,ok:true});}catch(e){runs.push({name,ok:false,error:String(e.stack??e)});}}
for (const name of ['Suspending','promising'])
  Object.defineProperty(WebAssembly,name,{get(){throw Error('JSPI getter was accessed');},configurable:true});
const wasm = fs.readFileSync(new URL('../../artifacts/mpv-coop-units.asyncify.wasm',import.meta.url));
async function makeScheduler(){
 const s=new CoopScheduler({backend:'asyncify'});
 const {instance}=await WebAssembly.instantiate(wasm,{demuxe_coop:s.imports,test:{now:()=>performance.now(),live:()=>0,fail:()=>{throw Error('test assertion')},read:()=>0}});
 return {s,e:instance.exports};
}
await test('reject-overlapping-C-stack-layout',async()=>{
 const {s,e}=await makeScheduler();
 try{assert.throws(()=>s.attach({...e,demuxe_coop_stack_base:i=>e.demuxe_coop_stack_base(0),demuxe_coop_stack_top:i=>e.demuxe_coop_stack_top(0)}),/overlap/i);}finally{s.close();}
});
await test('reject-C-stack-saved-stack-alias',async()=>{
 const {s,e}=await makeScheduler();
 try{assert.throws(()=>s.attach({...e,demuxe_coop_stack_base:i=>e.demuxe_asyncify_data(i),demuxe_coop_stack_top:i=>e.demuxe_asyncify_end(i)}),/overlap/i);}finally{s.close();}
});
await test('failed-attach-closes-scheduler',async()=>{
 const {s,e}=await makeScheduler();
 try{assert.throws(()=>s.attach({...e,asyncify_start_unwind:undefined}),/Asyncify export/);assert.equal(s.stopped,true);}finally{s.close();}
});
await test('FFmpeg-unexpected-ccall-trap-poisons-instance',async()=>{
 let entered=0;const error=new WebAssembly.RuntimeError('injected trap');
 const module={HEAPU8:new Uint8Array(1024),ccall(){entered++;if(entered===1)throw error;return 99;}};
 const b=createFFmpegBridge(module);
 try{await assert.rejects(b.call('rm_step','number',[],[]));await assert.rejects(b.call('rm_step','number',[],[]));assert.equal(entered,1);await assert.rejects(b.destroy());assert.equal(entered,1);}
 finally{b.owner.close();}
});
await test('FFmpeg-invalid-replacement-preserves-existing-source',async()=>{
 const module={HEAPU8:new Uint8Array(1024),ccall(name){return name==='rm_step'?module.nonIsolatedRead(0,4,0):0;}};
 const b=createFFmpegBridge(module);
 try{b.setSource({size:4,read:async()=>new Uint8Array([1,2,3,4])});assert.throws(()=>b.setSource({size:-1}));assert.equal(await b.call('rm_step','number',[],[]),4);assert.deepEqual([...module.HEAPU8.slice(0,4)],[1,2,3,4]);}
 finally{await b.destroy();}
});

await test('reject-unexported-JavaScript-root',async()=>{
 const {s,e}=await makeScheduler();
 try{s.attach(e);await assert.rejects(s.run(()=>9),/unadmitted/);assert.equal(s.stats.created,0);}
 finally{s.close();}
});
await test('FFmpeg-negative-C-code-is-recoverable',async()=>{
 let entered=0;
 const b=createFFmpegBridge({HEAPU8:new Uint8Array(1024),ccall(name){entered++;return name==='rm_step'?-1:0;}});
 try{assert.equal(await b.call('rm_step','number',[],[]),-1);assert.equal(await b.call('rm_step','number',[],[]),-1);assert.equal(b.requiresDiscard,false);}
 finally{await b.destroy();}
});
await test('FFmpeg-busy-rejection-does-not-poison-active-call',async()=>{
 let resolve;
 const m={HEAPU8:new Uint8Array(1024),ccall(name){return name==='rm_step'?new Promise(r=>resolve=r):0;}};
 const b=createFFmpegBridge(m);
 const pending=b.call('rm_step','number',[],[]);
 await assert.rejects(b.call('rm_step','number',[],[]),/already active/);
 assert.equal(b.requiresDiscard,false);resolve(7);assert.equal(await pending,7);await b.destroy();
});
await test('FFmpeg-duplicate-module-owner-is-rejected',async()=>{
 const m={HEAPU8:new Uint8Array(1024),ccall:()=>0};
 const b=createFFmpegBridge(m);
 try{assert.throws(()=>createFFmpegBridge(m),/already has an owner/);}finally{await b.destroy();}
});
await test('FFmpeg-shutdown-trap-is-terminal-and-idempotent',async()=>{
 let entered=0;const m={HEAPU8:new Uint8Array(1024),ccall(){entered++;return Promise.reject(new WebAssembly.RuntimeError('close trap'));}};
 const b=createFFmpegBridge(m);const closing=b.destroy();
 assert.equal(closing,b.destroy());await assert.rejects(closing,/close trap/);
 assert.equal(entered,1);assert.equal(b.requiresDiscard,true);assert.throws(()=>createFFmpegBridge(m),/requires discard/);
});
await test('FFmpeg-shutdown-deadline-requires-discard',async()=>{
 const m={HEAPU8:new Uint8Array(1024),ccall(){return new Promise(()=>{});}};
 const b=createFFmpegBridge(m,{shutdownTimeoutMs:10});await assert.rejects(b.destroy(),/deadline/);
 assert.equal(b.requiresDiscard,true);assert.equal(b.owner.stopped,true);
 assert.throws(()=>createFFmpegBridge(m),/requires discard/);
});
const record={scope:'Host/ABI guard tests using actual Wasm metadata and FFmpeg ccall doubles; no full media',tests:runs,total:runs.length,passed:runs.filter(t=>t.ok).length};
console.log(JSON.stringify(record,null,2));
if(record.passed!==record.total)process.exitCode=1;
