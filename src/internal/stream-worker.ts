// SPDX-License-Identifier: Apache-2.0
import {PlayerError} from './errors.js';
export type StreamWorker={
  onmessage:((event:MessageEvent)=>void)|null;
  onerror:((event:ErrorEvent)=>void)|null;
  onmessageerror:((event:MessageEvent)=>void)|null;
  postMessage(message:unknown,transfer?:Transferable[]):void;
  terminate():void;
};
/** Hide byte RPC from the existing presentation protocol. Transport policy and
 * original failures stay in this main-thread lease, never in the SDK worker. */
export function bridgeStreamWorker(raw:Worker,{size,read,check,close,readTimeoutMs=30000}:{size:number;read:(at:number,length:number)=>Promise<Uint8Array>;check:()=>void;close:()=>void;readTimeoutMs?:number}):StreamWorker{
  let retired=false,pending=0,lastId=0,reads=0,bytes=0;
  let observer:StreamWorker['onmessage']=null,failure:MessageEvent|undefined,delivered=false,scheduled=false,cancelled=false;
  const deliver=()=>{
    if(!failure||!observer||delivered||scheduled||cancelled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      if(cancelled||!failure||!observer||delivered)return;
      delivered=true;observer(failure);
    });
  };
  const timers=new Set<ReturnType<typeof setTimeout>>();
  const retire=()=>{if(retired)return;retired=true;for(const timer of timers)clearTimeout(timer);timers.clear();raw.onmessage=raw.onerror=raw.onmessageerror=null;try{close();}finally{raw.terminate();}};
  const fail=(error:unknown)=>{
    if(retired)return;
    try{retire();}catch{/* Cleanup cannot replace the primary source failure. */}
    // Original main-thread failures need no lossy worker serialization.
    failure=new MessageEvent('message',{data:{type:'error',message:error instanceof Error?error.message:String(error),code:(error as {code?:string})?.code,error}});deliver();
  };
  const worker:StreamWorker={get onmessage(){return observer;},set onmessage(value){observer=value;deliver();},onerror:null,onmessageerror:null,
    postMessage(message,transfer){if(retired)return;try{check();raw.postMessage(message,transfer??[]);}catch(error){fail(error);}},
    terminate(){cancelled=true;failure=undefined;retire();},
  };
  raw.onmessage=event=>{
    if(retired)return;
    try{check();}catch(error){fail(error);return;}
    const data=event.data;
    if(data?.type!=='read'){worker.onmessage?.(event);return;}
    if(!Number.isSafeInteger(data.id)||data.id<=lastId||!Number.isSafeInteger(data.offset)||!Number.isSafeInteger(data.length)||data.offset<0||data.length<1||data.length>size-data.offset||pending>=8||reads>=4096||data.length>64*1024*1024-bytes){fail(new PlayerError('ASSET_LOAD_FAILED','Invalid streaming worker read request'));return;}
    lastId=data.id;pending++;reads++;bytes+=data.length;
    const timer=setTimeout(()=>{timers.delete(timer);fail(new PlayerError('NETWORK_TIMEOUT','Streaming source read deadline exceeded'));},readTimeoutMs);timers.add(timer);
    void Promise.resolve().then(()=>{if(retired)throw new DOMException('Streaming retired','AbortError');check();return read(data.offset,data.length);}).then(value=>{
      if(retired)return;check();
      if(!(value instanceof Uint8Array)||value.byteLength!==data.length)throw new PlayerError('SOURCE_CHANGED','Incomplete streaming source range');
      const owned=value.slice();raw.postMessage({type:'read-result',id:data.id,bytes:owned},[owned.buffer]);
    }).catch(fail).finally(()=>{clearTimeout(timer);timers.delete(timer);pending--;});
  };
  raw.onerror=event=>{if(retired)return;worker.onerror?.(event);};
  raw.onmessageerror=event=>{if(retired)return;worker.onmessageerror?.(event);};
  return worker;
}
