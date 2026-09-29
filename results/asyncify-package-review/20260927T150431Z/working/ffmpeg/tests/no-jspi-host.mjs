// SPDX-License-Identifier: MIT
// HOST UNIT TEST ONLY: ccall is a test double; no FFmpeg or Asyncify Wasm runs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFFmpegBridge} from '../runtime/ffmpeg-bridge.mjs';
Object.defineProperty(WebAssembly,'Suspending',{get(){throw Error('Unexpected JSPI access');},configurable:true});
Object.defineProperty(WebAssembly,'promising',{get(){throw Error('Unexpected JSPI access');},configurable:true});
const rows=[];
const barrier=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function test(name,fn) {
  let bridge;
  try {
    const memory=new Uint8Array(2048).fill(0xcc);let calls=0;
    const Module={HEAPU8:memory,ccall(name,_rt,_types,args,options){
      assert.equal(options.async,true);calls++;
      return name==='rm_close'?0:Module.nonIsolatedRead(128,64,args[0]??0);
    }};
    bridge=createFFmpegBridge(Module,{timeoutMs:200,shutdownTimeoutMs:200});
    bridge.setSource(new Blob([new Uint8Array(512).fill(23)]));
    await fn(bridge,Module,memory,()=>calls);
    await bridge.destroy();
    const snap=bridge.source.snapshot();assert.equal(snap.pending+snap.handles+snap.timers,0);
    rows.push({name,ok:true});
  } catch(e) {bridge?.source.abandon();bridge?.owner.close();rows.push({name,ok:false,error:String(e.stack)});}
}
const call=b=>b.call('rm_probe','number',['number'],[0]);
await test('construct-and-read-with-JSPI-access-forbidden',async(b,_m,heap)=>{assert.equal(await call(b),64);assert.ok(heap.slice(128,192).every(x=>x===23));});
await test('reject-invalid-reader-count',async b=>{b.setSource({size:512,read:async()=>64});assert.equal(await call(b),-1);});
await test('reject-concurrent-Wasm-entry',async b=>{const entered=barrier(),read=barrier();b.setSource({size:512,read:()=>{entered.resolve();return read.promise;}});const first=call(b);await entered.promise;await assert.rejects(call(b),/already active/);read.resolve(new Uint8Array(64));assert.equal(await first,64);});
await test('cancel-observed-pending-read',async(b,_m,heap)=>{const entered=barrier();b.setSource({size:512,read:()=>{entered.resolve();return new Promise(()=>{});}});const p=call(b);await entered.promise;b.cancel();assert.equal(await p,-1);assert.ok(heap.slice(128,192).every(x=>x===0xcc));});
await test('late-old-result-cannot-write-replacement',async(b,_m,heap)=>{const entered=barrier(),late=barrier();b.setSource({size:512,read:()=>{entered.resolve();return late.promise;}});const p=call(b);await entered.promise;b.cancel();assert.equal(await p,-1);b.setSource(new Blob([new Uint8Array(512).fill(7)]));assert.equal(await call(b),64);late.resolve(new Uint8Array(64).fill(99));await new Promise(r=>setTimeout(r,0));assert.ok(heap.slice(128,192).every(x=>x===7));});
await test('destroy-cancels-pending-and-is-idempotent',async b=>{const entered=barrier();b.setSource({size:512,read:()=>{entered.resolve();return new Promise(()=>{});}});const p=call(b);await entered.promise;const close=b.destroy();assert.equal(close,b.destroy());assert.equal(await p,-1);await close;await assert.rejects(call(b),/closed/);});
await test('reject-unadmitted-operation-before-entry',async(b,_m,_h,count)=>{await assert.rejects(b.call('something_else',null,[],[]),/Unadmitted/);assert.equal(count(),0);});
await test('preserve-reader-error-for-host-classification',async b=>{const error=new Error('permission');b.setSource({size:512,read:async()=>{throw error;}});assert.equal(await call(b),-1);assert.equal(b.source.drainFailures()[0].cause,error);});
const result={scope:'Host tests with ccall test double and all JSPI property access forbidden; NO FFmpeg or Asyncify library execution',tests:rows,passed:rows.filter(x=>x.ok).length,total:rows.length};
fs.writeFileSync(new URL('../../results/ffmpeg-no-jspi-host.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(rows.some(x=>!x.ok))process.exitCode=1;
