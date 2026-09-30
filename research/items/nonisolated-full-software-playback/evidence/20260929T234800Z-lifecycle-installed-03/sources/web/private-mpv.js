// SPDX-License-Identifier: Apache-2.0
import {createCooperativeEngine} from './private-mpv/engine.js';
import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';

const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
/** The scheduler owns every mpv call; source IO stays asynchronous and bounded. */
export async function privateMpv(runtime,profile,{signal}={}) {
 if(!['jspi','asyncify'].includes(runtime)||!['subtitles','audio','playback'].includes(profile))throw Error('Invalid private mpv runtime');
 if(runtime==='jspi'&&(typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function'))throw Error('Selected JSPI runtime unavailable');
 const base=new URL(`./engine-mpv-${profile}-${runtime}/`,import.meta.url);
 const get=async name=>{const r=await fetch(new URL(name,base),{signal});if(!r.ok)throw Error('Private mpv asset HTTP '+r.status);return r;};
 const manifest=await(await get('manifest.json')).json();
 if(manifest.schema!==1||manifest.backend!==runtime||manifest.profile!==profile)throw Error('Private mpv asset identity mismatch');
 const stem=profile==='playback'?'player':'service';
 const bytes=await(await get(stem+'.wasm')).arrayBuffer();
 if(await digest(bytes)!==manifest.files[stem+'.wasm'])throw Error('Private mpv Wasm hash mismatch');
 const compiled=await WebAssembly.compile(bytes),names=new Set(WebAssembly.Module.exports(compiled).map(e=>e.name));
 const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
 if(runtime==='asyncify'?!controls.every(n=>names.has(n)):controls.some(n=>names.has(n)))throw Error('Private mpv backend mismatch');
 for(const name of ['demuxe_coop_invoke','demuxe_source_live',...(profile==='playback'?['web_create','web_render','web_event','web_command_args','web_destroy','web_audio_ptr']: [profile==='audio'?'private_audio_create':'subtitle_service_create'])])if(!names.has(name))throw Error('Private mpv ABI mismatch');
 const glue=await(await get(stem+'.mjs')).arrayBuffer();
 if(await digest(glue)!==manifest.files[stem+'.mjs'])throw Error('Private mpv module hash mismatch');
 const {default:create}=await import(new URL(stem+'.mjs',base));
 signal?.throwIfAborted();
 const host=await createCooperativeEngine(create,bytes,runtime,{print:()=>{},printErr:()=>{}});
 if(!(host.raw.memory.buffer instanceof ArrayBuffer)){host.dispose();throw Error('Private mpv memory mismatch');}
 host.asset=base.href;host.runtime=runtime;host.profile=profile;
 host.facts=()=>({runtime,profile,asset:base.href,memory:host.raw.memory.buffer.constructor.name,heapBytes:host.raw.memory.buffer.byteLength,crossOriginIsolated:globalThis.crossOriginIsolated,sharedArrayBuffer:typeof SharedArrayBuffer,jspiSuspending:typeof WebAssembly.Suspending,jspiPromising:typeof WebAssembly.promising,scheduler:host.scheduler.snapshot(),source:host.source.snapshot()});
 if(signal?.aborted){host.dispose();signal.throwIfAborted();}
 return host;
}

/** Use the same identity, authorization and read contract as production remux. */
export function privateMpvSource(data,refresh){
 const reader=data.file?new LocalFileReader(data.file,{cacheBytes:4*1024*1024}):new RangeReader({...data.options,cacheBytes:4*1024*1024,readDeadlineMs:45000},refresh);
 let closed=false;
 return {reader,async open(host){
  const info=await reader.open();if(closed)throw new DOMException('Source closed','AbortError');
  const size=Number(info.size);if(!Number.isSafeInteger(size)||size<=0)throw Error('Private mpv requires a finite source');
  host.source.setSource({size,read:async(offset,count,signal)=>{
   signal.throwIfAborted();const cancel=()=>reader.beginEpoch();signal.addEventListener('abort',cancel,{once:true});
   try{const bytes=await reader.read(BigInt(offset),count);signal.throwIfAborted();return bytes;}
   finally{signal.removeEventListener('abort',cancel);}
  }});return info;
 },close(){closed=true;reader.close();}};
}
