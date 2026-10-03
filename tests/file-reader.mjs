// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {LocalFileReader} from '../web/file-reader.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as subtitleWorkerCore from '../web/generated/internal/machine/subtitle-worker.js';

test('subtitle playback can exceed 8192 uncached reads with bounded memory',async()=>{
 // Exercise the production subtitle init configuration, then its local reader.
 // Stub the native engine: this regression concerns transport lifetime limits.
 let init;
 const messages=[];
 const engine={HEAPU8:new Uint8Array(64),FS:{mkdir(){},writeFile(){}},
  _subtitle_service_create:()=>0,_malloc:()=>16,_web_io_ptr:()=>0,
  _web_io_configure(){},_subtitle_service_open:()=>0,
  _subtitle_service_loaded:()=>1,_subtitle_service_track_count:()=>0,
  _subtitle_service_block(){}};
 const context=vm.createContext({...subtitleWorkerCore,performance:performance,create:async()=>engine,SubtitleOverlay:class {},URL,AbortController,
  setTimeout,clearTimeout,postMessage:message=>messages.push(message),
  Worker:class {postMessage(message){init=message;this.onmessage({data:{type:'ready',info:{size:String(message.file.size)}}});}}});
 const source=await readFile(new URL('../web/mpv-subtitle-worker.js',import.meta.url),'utf8');
 vm.runInContext(source.replace(/^import .*;\n/gm,'').replace("const {default:create}=await import('./engine-subtitles/service.mjs');",'').replaceAll('runtimeWorker(','new Worker(').replaceAll('import.meta.url',JSON.stringify(import.meta.url)),context);
 const file={size:16384,slice:(a,b)=>new Blob([new Uint8Array(b-a)])};
 context.onmessage({data:{id:1,type:'init',file,fonts:[]}});
 await vm.runInContext('chain',context);
 assert.equal(messages[0]?.error,undefined);assert.equal(messages[0]?.id,1);
 const reader=new LocalFileReader(file,{cacheBytes:init.subtitleCacheBytes,maxRequests:init.subtitleMaxRequests});
 try{
  for(let i=0;i<8193;i++){
   if(i===4096)reader.beginEpoch(); // Seeking must not end the session's allowance.
   assert.equal((await reader.read(BigInt(i),1024)).length,1024);
  }
  assert.equal(reader.stats.requests,8193);
  assert.equal(reader.stats.cacheHits,0);
  assert.equal(reader.stats.peakCacheBytes,4*1024*1024);
  assert.equal(reader.stats.peakActiveBytes,1024);
 }finally{reader.close();}
 assert.equal(reader.stats.cacheBytes,0);
});
test('64-bit local slices stay bounded and never materialize the complete file',async()=>{
 const calls=[],size=2**32+1000;
 const file={size,arrayBuffer(){throw Error('Whole file read');},slice(a,b){calls.push([a,b]);return new Blob([Uint8Array.from({length:b-a},(_,i)=>(a+i)%251)]);}};
 const r=new LocalFileReader(file);assert.equal((await r.open()).size,String(size));
 const offset=2**32+101;const bytes=await r.read(BigInt(offset),100);
 assert.equal(bytes[0],offset%251);assert.deepEqual(calls,[[offset,offset+100]]);
 assert.equal((await r.read(BigInt(size-10),100)).length,10);assert.equal((await r.read(BigInt(size),1)).length,0);
 assert.equal(r.stats.peakActiveBytes,100);assert.equal(r.stats.cacheBytes,0);
 r.close();await assert.rejects(()=>r.read(0n,1),/closed/);
});
test('epoch cancellation releases a blocked read and permits the next bounded read',async()=>{
 let started;const seen=new Promise(r=>started=r);let first=true,canceled=0;
 const file={size:1000,slice(a,b){if(!first)return new Blob([new Uint8Array(b-a)]);first=false;return {stream:()=>new ReadableStream({pull(){started();},cancel(){canceled++;}})};}};
 const r=new LocalFileReader(file),pending=r.read(0n,100);await seen;
 await assert.rejects(()=>r.read(0n,1),/Concurrent/);r.beginEpoch();await assert.rejects(pending,{name:'AbortError'});
 assert.equal(canceled,1);assert.equal((await r.read(10n,100)).length,100);assert.equal(r.stats.activeBytes,0);r.close();
});
test('destroy cancels reads; truncated and oversized sources fail explicitly',async()=>{
 let start;const seen=new Promise(r=>start=r);
 const r=new LocalFileReader({size:5,slice(){return {stream:()=>new ReadableStream({pull(){start();}})};}});
 const work=r.read(0n,5);await seen;r.close();await assert.rejects(work,{name:'AbortError'});
 for(const bytes of [4,6]){const q=new LocalFileReader({size:5,slice:()=>new Blob([new Uint8Array(bytes)])});await assert.rejects(()=>q.read(0n,5),/truncated|exceeds/);q.close();}
});
test('an epoch change during asynchronous reader cleanup cannot publish old bytes',async()=>{
 let cleanup,done;const entered=new Promise(r=>cleanup=r),finish=new Promise(r=>done=r);let reads=0;
 const reader={read:async()=>++reads===1?{value:new Uint8Array(5),done:false}:{done:true},cancel:()=>{cleanup();return finish;},releaseLock(){}};
 const r=new LocalFileReader({size:5,slice:()=>({stream:()=>({getReader:()=>reader})})});
 const pending=r.read(0n,5);await entered;r.beginEpoch();done();await assert.rejects(pending,{name:'AbortError'});assert.equal(r.stats.discardedBytes,5);r.close();
});
test('subtitle slice cache stays within budget and is cleared on close',async()=>{
 let slices=0;const file={size:20,slice(a,b){slices++;return new Blob([Uint8Array.from({length:b-a},(_,i)=>a+i)]);}};
 const r=new LocalFileReader(file,{cacheBytes:8});
 assert.deepEqual([...await r.read(0n,4)],[0,1,2,3]);
 assert.deepEqual([...await r.read(0n,4)],[0,1,2,3]);
 assert.equal(slices,1);assert.equal(r.stats.cacheHits,1);
 await r.read(4n,4);await r.read(8n,4);
 assert.equal(r.stats.cacheBytes,8);assert.equal(r.stats.peakCacheBytes,8);
 await r.read(0n,4);assert.equal(slices,4);
 r.close();assert.equal(r.stats.cacheBytes,0);
});
test('local subtitle source request budget rejects excess uncached reads',async()=>{
 const r=new LocalFileReader(new Blob([new Uint8Array(12)]),{maxRequests:1});
 await r.read(0n,4);
 await assert.rejects(()=>r.read(4n,4),/request budget exceeded/);
 assert.equal(r.stats.requests,1);r.close();
});

test('local reads keep the stream default even when FileReader is available',async()=>{
 const previous=globalThis.FileReader;let streams=0;
 globalThis.FileReader=class {constructor(){throw Error('Experimental FileReader selected by default');}};
 try{
  const bytes=Uint8Array.from({length:32},(_,i)=>i),blob=new Blob([bytes]);
  const file={size:blob.size,slice(a,b){const slice=blob.slice(a,b),stream=slice.stream.bind(slice);slice.stream=()=>{streams++;return stream();};return slice;}};
  for(const options of [undefined,{experimentalFileReader:false}]){
   const reader=new LocalFileReader(file,options);
   try{assert.deepEqual(await reader.read(0n,32),bytes);}finally{reader.close();}
  }
  assert.equal(streams,2);
 }finally{if(previous===undefined)delete globalThis.FileReader;else globalThis.FileReader=previous;}
});

test('FileReader slices preserve exact bytes, cache bounds and EOF without streams',async()=>{
 const previous=globalThis.FileReader;let reads=0,maxSlice=0;
 globalThis.FileReader=class {
  readyState=0;
  readAsArrayBuffer(blob){this.readyState=1;reads++;maxSlice=Math.max(maxSlice,blob.size);blob.arrayBuffer().then(bytes=>{if(this.readyState!==1)return;this.result=bytes;this.readyState=2;this.onload();});}
  abort(){this.readyState=2;this.onabort();}
 };
 try{
  const bytes=Uint8Array.from({length:524301},(_,i)=>i%251),blob=new Blob([bytes]);
  const file={size:bytes.length,slice(a,b){const slice=blob.slice(a,b);slice.stream=()=>{throw Error('Stream path used');};return slice;}};
  const reader=new LocalFileReader(file,{cacheBytes:262144,experimentalFileReader:true});
  assert.deepEqual(await reader.read(17n,262144),bytes.slice(17,17+262144));
  await reader.read(17n,262144);assert.equal(reads,1);assert.equal(reader.stats.cacheHits,1);
  assert.deepEqual(await reader.read(524290n,262144),bytes.slice(524290));
  assert.equal((await reader.read(BigInt(bytes.length),1)).length,0);
  assert.equal(maxSlice,262144);assert.ok(reader.stats.peakOwnedBytes<=524288);assert.ok(reader.stats.peakCacheBytes<=262144);
  reader.close();assert.equal(reader.stats.cacheBytes,0);
  for(const length of [4,6]){const bad=new LocalFileReader({size:5,slice:()=>new Blob([new Uint8Array(length)])},{experimentalFileReader:true});await assert.rejects(()=>bad.read(0n,5),/truncated|exceeds/);}
 }finally{if(previous===undefined)delete globalThis.FileReader;else globalThis.FileReader=previous;}
});

test('FileReader epoch/close cancellation aborts in-flight work and permits a new epoch',async()=>{
 const previous=globalThis.FileReader;let active,aborts=0;
 globalThis.FileReader=class {
  readyState=0;
  readAsArrayBuffer(blob){this.readyState=1;active=this;this.blob=blob;}
  abort(){aborts++;this.readyState=2;this.onabort();}
 };
 try{
  const reader=new LocalFileReader(new Blob([new Uint8Array(32)]),{experimentalFileReader:true});
  const first=reader.read(0n,16);await assert.rejects(()=>reader.read(0n,1),/Concurrent/);
  reader.beginEpoch();await assert.rejects(first,{name:'AbortError'});assert.equal(aborts,1);assert.equal(reader.stats.activeBytes,0);
  const second=reader.read(16n,16);active.result=await active.blob.arrayBuffer();active.readyState=2;active.onload();assert.equal((await second).length,16);
  const third=reader.read(0n,8);reader.close();await assert.rejects(third,{name:'AbortError'});assert.equal(aborts,2);assert.equal(reader.stats.cacheBytes,0);
 }finally{if(previous===undefined)delete globalThis.FileReader;else globalThis.FileReader=previous;}
});

test('FileReader errors settle without caching failed reads',async()=>{
 const previous=globalThis.FileReader,error=new DOMException('unreadable','NotReadableError');
 globalThis.FileReader=class {readyState=0;readAsArrayBuffer(){this.readyState=2;this.error=error;queueMicrotask(()=>this.onerror());}};
 try{const reader=new LocalFileReader(new Blob([new Uint8Array(8)]),{cacheBytes:8,experimentalFileReader:true});await assert.rejects(()=>reader.read(0n,8),e=>e===error);assert.equal(reader.stats.activeBytes,0);assert.equal(reader.stats.cacheBytes,0);reader.close();}
 finally{if(previous===undefined)delete globalThis.FileReader;else globalThis.FileReader=previous;}
});
