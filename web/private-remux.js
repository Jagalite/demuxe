// SPDX-License-Identifier: Apache-2.0
import {preparedEngine} from './prepared-engine.js';
import {createFFmpegBridge} from './private-ffmpeg/bridge.js';

/** One outstanding read; source bytes cross a MessagePort, never shared memory. */
export function portReader(port,size) {
 if(!port||!Number.isSafeInteger(size)||size<=0)throw Error('Invalid private remux source');
 let sequence=0,pending,closed=false;
 const fail=error=>{closed=true;pending?.finish(error);port.close();};
 port.onmessage=({data})=>{
  if(closed)return;
  if(!data||typeof data!=='object'||!pending||data.id!==pending.id)return fail(Error('Unexpected private source response'));
  if(data.error)return fail(Error('Source transport: '+data.error));
  if(!(data.buffer instanceof ArrayBuffer)||data.buffer.byteLength<1||data.buffer.byteLength>pending.count)return fail(Error('Invalid private source bytes'));
  pending.finish(null,new Uint8Array(data.buffer));
 };
 port.onmessageerror=()=>fail(Error('Private source message error'));
 return {size,
  read(offset,count,signal){
   if(closed||signal.aborted)return Promise.reject(new DOMException('Source cancelled','AbortError'));
   if(pending)return Promise.reject(Error('Concurrent private source read'));
   if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(count)||count<1||count>262144||offset+count>size)return Promise.reject(Error('Invalid private source range'));
   return new Promise((resolve,reject)=>{
    const id=++sequence,abort=()=>fail(new DOMException('Source cancelled','AbortError'));
    pending={id,count,finish(error,bytes){signal.removeEventListener('abort',abort);pending=null;error?reject(error):resolve(bytes);}};
    signal.addEventListener('abort',abort,{once:true});
    try{port.postMessage({type:'read',id,offset,count});}catch(error){fail(error);}
   });
  },
  close(){fail(new DOMException('Source closed','AbortError'));},
 };
}

export async function privateRemux(runtime,{port,size,audioAdaptation,printErr,compiledWasm}) {
 if(!['jspi','asyncify'].includes(runtime))throw Error('Invalid private remux runtime');
 if(runtime==='jspi'&&(typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function'))throw Error('Selected JSPI runtime is unavailable');
 const url=new URL(`./engine-${audioAdaptation?'adaptation':'remux'}-${runtime}/remux.mjs`,import.meta.url);
 let engine;
 try{
 const {default:create}=await import(url.href);
 let module=compiledWasm;
 if(!module){
  const response=await fetch(new URL('remux.wasm',url));
  if(!response.ok)throw Error('Private remux initialization: Wasm asset HTTP '+response.status);
  module=await WebAssembly.compile(await response.arrayBuffer());
 }
 const names=new Set(WebAssembly.Module.exports(module).map(e=>e.name));
 const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
 if(runtime==='asyncify'?!controls.every(n=>names.has(n)):controls.some(n=>names.has(n)))throw Error('Private remux initialization: Wasm backend asset mismatch');
 for(const name of ['rm_probe','rm_open','rm_start','rm_step','rm_close'])if(!names.has(name))throw Error('Private remux initialization: Wasm ABI mismatch');
 engine=await create({...preparedEngine(module),printErr});
 if(!(engine.HEAPU8.buffer instanceof ArrayBuffer))throw Error('Private remux initialization: asset memory mismatch');
 }catch(cause){throw new Error('Private remux initialization: '+String(cause?.message??cause),{cause});}
 const reader=portReader(port,size),bridge=createFFmpegBridge(engine,{timeoutMs:45000});
 bridge.setSource(reader);
 return {engine,bridge,reader,runtime,asset:url.href};
}
