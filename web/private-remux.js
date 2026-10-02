// SPDX-License-Identifier: Apache-2.0
import {preparedEngine} from './prepared-engine.js';
import {createFFmpegBridge} from './private-ffmpeg/bridge.js';
import {initialRemuxPortReader,beginRemuxPortRead,replyRemuxPortRead,closeRemuxPortReader,remuxPortReadCurrent,remuxPortResponseCurrent} from './generated/internal/machine/remux-port-reader.js';

/** One outstanding read; source bytes cross a MessagePort, never shared memory. */
export function portReader(port,size) {
 if(!port)throw Error('Invalid private remux source');
 let state=initialRemuxPortReader(size),cleanupFailure;const requests=new Map();
 const current=id=>remuxPortReadCurrent(state,id);
 const cleanup=record=>{try{record.signal.removeEventListener('abort',record.abort);}catch(error){cleanupFailure??={error};}};
 const settle=(request,error,bytes,success=false)=>{
  const record=request&&requests.get(request.id);if(!record)return;requests.delete(request.id);cleanup(record);success?record.resolve(bytes):record.reject(error);
 };
 const closePort=()=>{try{port.close();}catch(error){cleanupFailure??={error};}};
 const fail=error=>{const decision=closeRemuxPortReader(state);state=decision.state;if(!decision.accepted)return;settle(decision.request,error);closePort();};
 const failure=reason=>reason==='cancelled'?new DOMException('Source cancelled','AbortError'):Error(reason==='concurrent'?'Concurrent private source read':reason==='range'?'Invalid private source range':reason==='unexpected'?'Unexpected private source response':'Invalid private source bytes');
 port.onmessage=({data})=>{
  if(state.closed)return;
  const expected=state.pending?.id??null;let error,errorText,buffer,facts;
  try{const object=!!data&&typeof data==='object',rawId=object?data.id:null,id=typeof rawId==='number'?rawId:null;error=object?data.error:null;errorText=error?String(error):null;buffer=object?data.buffer:null;facts={object,id,error:!!error,buffer:buffer instanceof ArrayBuffer,bytes:buffer instanceof ArrayBuffer?buffer.byteLength:0};}catch(error){if(remuxPortResponseCurrent(state,expected))fail(error);return;}
  const decision=replyRemuxPortRead(state,facts,expected);state=decision.state;
  if(!decision.accepted)return;
  if(decision.error){settle(decision.request,decision.error==='transport'?Error('Source transport: '+errorText):failure(decision.error));closePort();return;}
  let bytes;try{bytes=new Uint8Array(buffer);}catch(error){settle(decision.request,error);fail(error);return;}
  settle(decision.request,null,bytes,true);
 };
 port.onmessageerror=()=>fail(Error('Private source message error'));
 return {size,
  read(offset,count,signal){
   const aborted=signal.aborted;const decision=beginRemuxPortRead(state,offset,count,aborted);state=decision.state;
   if(!decision.accepted)return Promise.reject(failure(decision.error));
   const request=decision.request;
   return new Promise((resolve,reject)=>{
    const abort=()=>{if(current(request.id))fail(new DOMException('Source cancelled','AbortError'));};
    const record={signal,abort,resolve,reject};requests.set(request.id,record);
    try{
     signal.addEventListener('abort',abort,{once:true});
     if(!current(request.id)){cleanup(record);return;}
     if(signal.aborted){abort();return;}
     const post=port.postMessage;if(!current(request.id)){cleanup(record);return;}
     post.call(port,{type:'read',id:request.id,offset:request.offset,count:request.count});
    }catch(error){if(current(request.id))fail(error);else cleanup(record);}
   });
  },
  close(){fail(new DOMException('Source closed','AbortError'));if(cleanupFailure)throw cleanupFailure.error;},
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
