// SPDX-License-Identifier: Apache-2.0
import {createCooperativeEngine} from './private-mpv/engine.js';
import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';
import {privateRuntimeError,privateManifestError,privateMpvAbiError,privateAudioCapacityValid,initialPrivateSourceLifetime,beginPrivateSourceOpen,privateSourceCurrent,acceptPrivateSourceOpen,closePrivateSourceLifetime} from './generated/internal/machine/private-engine-admission.js';

const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
/** The scheduler owns every mpv call; source IO stays asynchronous and bounded. */
export async function privateMpv(runtime,profile,{signal,decoderService,onFrame,onReleaseFrame,canReceiveFrame,maxDecodePixels,assets}={}) {
 const runtimeError=privateRuntimeError(runtime,typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function',profile??'');if(runtimeError)throw Error(runtimeError);
 const base=new URL(`./engine-mpv-${profile}-${runtime}/`,import.meta.url);
 const get=async name=>{
  signal?.throwIfAborted();
  if(assets){if(!(assets[name] instanceof ArrayBuffer))throw Error('Missing verified private mpv asset: '+name);return new Response(assets[name]);}
  const r=await fetch(new URL(name,base),{signal});if(!r.ok)throw Error('Private mpv asset HTTP '+r.status);return r;};
 const manifest=await(await get('manifest.json')).json();
 const manifestError=privateManifestError(runtime,profile,{schema:manifest.schema,backend:manifest.backend,profile:manifest.profile});if(manifestError)throw Error(manifestError);
 const stem=profile==='playback'?'player':'service';
 const bytes=await(await get(stem+'.wasm')).arrayBuffer();
 if(await digest(bytes)!==manifest.files[stem+'.wasm'])throw Error('Private mpv Wasm hash mismatch');
 const compiled=await WebAssembly.compile(bytes),names=new Set(WebAssembly.Module.exports(compiled).map(e=>e.name));
 const retained=WebAssembly.Module.imports(compiled).some(item=>item.module==='demuxe_decoder');
 const abiError=privateMpvAbiError(runtime,profile,[...names],retained,manifest.retainedDecoder);if(abiError)throw Error(abiError);
 const glue=await(await get(stem+'.mjs')).arrayBuffer();
 if(await digest(glue)!==manifest.files[stem+'.mjs'])throw Error('Private mpv module hash mismatch');
 let create;
 if(assets){
  const url=URL.createObjectURL(new Blob([glue],{type:'text/javascript'}));
  try{({default:create}=await import(url));}finally{URL.revokeObjectURL(url);}
 }else({default:create}=await import(new URL(stem+'.mjs',base)));
 signal?.throwIfAborted();
 const host=await createCooperativeEngine(create,bytes,runtime,{print:()=>{},printErr:()=>{}},{service:decoderService,onFrame,onReleaseFrame,canReceiveFrame,maxDecodePixels});
 try{
 signal?.throwIfAborted();
 if(!(host.raw.memory.buffer instanceof ArrayBuffer))throw Error('Private mpv memory mismatch');
 if(profile==='playback'){
  const capacity=host.raw.web_audio_capacity?await host.call('web_audio_capacity'):8192;
  if(!privateAudioCapacityValid(capacity,manifest.audioCapacity))throw Error('Private playback PCM ABI mismatch');
  host.audioCapacity=capacity;
 }
 host.asset=base.href;host.runtime=runtime;host.profile=profile;
 host.facts=()=>({runtime,profile,asset:base.href,memory:host.raw.memory.buffer.constructor.name,heapBytes:host.raw.memory.buffer.byteLength,crossOriginIsolated:globalThis.crossOriginIsolated,sharedArrayBuffer:typeof SharedArrayBuffer,jspiSuspending:typeof WebAssembly.Suspending,jspiPromising:typeof WebAssembly.promising,scheduler:host.scheduler.snapshot(),source:host.source.snapshot()});
 signal?.throwIfAborted();return host;
 }catch(error){try{host.dispose();}catch{}throw error;}
}

/** Use the same identity, authorization and read contract as production remux. */
export function privateMpvSource(data,refresh){
 const reader=data.file?new LocalFileReader(data.file,{cacheBytes:4*1024*1024}):new RangeReader({...data.options,cacheBytes:4*1024*1024,readDeadlineMs:45000},refresh);
 let state=initialPrivateSourceLifetime();const retired=()=>new DOMException('Source closed','AbortError');
 return {reader,async open(host){
  const begin=beginPrivateSourceOpen(state);state=begin.state;if(begin.id===null)throw retired();const id=begin.id;
  const open=reader.open;if(!privateSourceCurrent(state,id))throw retired();const info=await open.call(reader);if(!privateSourceCurrent(state,id))throw retired();
  const size=Number(info.size),accepted=acceptPrivateSourceOpen(state,id,size);state=accepted.state;if(accepted.invalid)throw Error('Private mpv requires a finite source');if(!accepted.accepted)throw retired();
  const source=host.source,setSource=source.setSource;if(!privateSourceCurrent(state,id))throw retired();
  setSource.call(source,{size,read:async(offset,count,signal)=>{
   signal.throwIfAborted();if(!privateSourceCurrent(state,id))throw retired();const cancel=()=>reader.beginEpoch();
   try{signal.addEventListener('abort',cancel,{once:true});signal.throwIfAborted();if(!privateSourceCurrent(state,id))throw retired();const read=reader.read;if(!privateSourceCurrent(state,id))throw retired();signal.throwIfAborted();const bytes=await read.call(reader,BigInt(offset),count);signal.throwIfAborted();if(!privateSourceCurrent(state,id))throw retired();return bytes;}
   finally{signal.removeEventListener('abort',cancel);}
  }});if(!privateSourceCurrent(state,id))throw retired();return info;
 },close(){const next=closePrivateSourceLifetime(state);if(next===state)return;state=next;reader.close();}};
}
