// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
// FFmpeg reports Matroska and WebM as one demuxer family. Read the bounded EBML
// header so capability queries use the actual local container's MIME type.
export async function localContainerFormat(file,format){
 if(!file||!format?.split(',').includes('matroska'))return format;
 const b=new Uint8Array(await file.slice(0,4096).arrayBuffer());let at=0;
 const vint=(id=false)=>{const first=b[at++];let width=1,mask=128;while(mask&&!(first&mask)){mask>>=1;width++;}if(!mask||width>4||at+width-1>b.length)throw Error('Incomplete EBML header');let n=id?first:first&(mask-1);for(let i=1;i<width;i++)n=n*256+b[at++];return n;};
 try{
  if(vint(true)!==0x1a45dfa3)return format;
  const size=vint(),end=at+size;if(end>b.length)return format;
  while(at<end){const id=vint(true),n=vint();if(at+n>end)return format;if(id===0x4282){const type=new TextDecoder().decode(b.subarray(at,at+n));return ['webm','matroska'].includes(type)?type:format;}at+=n;}
 }catch{/* Unknown headers retain the inspector's demuxer family. */}
 return format;
}
// Packet-only metadata preflight. No decoded audio or video is produced.
export async function probeSource(source,signal,audioAdaptation,compiledWasm,runtime='pthread'){
 if(runtime==='pthread'&&!globalThis.crossOriginIsolated)throw Error('Source inspection requires cross-origin isolation');
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 const demuxer=source.demuxer??source.options?.demuxer;
 if(demuxer!==undefined&&(typeof demuxer!=='string'||demuxer!==''&&!/^[a-z0-9_]{1,64}$/.test(demuxer)))throw Error('Invalid demuxer hint');
 const mailbox=runtime==='pthread'?new SharedArrayBuffer(64+262144):null,channel=runtime==='pthread'?null:new MessageChannel(),workers=[];let abort;
 try{const result=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Source inspection timed out')),20000);
  const finish=(error,value)=>{clearTimeout(timer);error?reject(error):resolve(value);};
  abort=()=>finish(new DOMException('Aborted','AbortError'));signal.addEventListener('abort',abort,{once:true});
  const make=file=>{const w=runtimeWorker(new URL(file,import.meta.url),{type:'module'});workers.push(w);w.onerror=e=>{e.preventDefault();finish(Error('Source inspection worker failed: '+e.message));};w.onmessageerror=()=>finish(Error('Source inspection message error'));return w;};
  const reader=make('./native-remux-source-worker.js');
  reader.onmessage=({data})=>{
   if(signal.aborted)return;
   if(data.type==='error')finish(Error('Source transport: '+data.message));
   if(data.type==='refresh')Promise.resolve().then(()=>{if(!source.refreshAuthorization)throw Error('Authorization refresh unavailable');return source.refreshAuthorization(data.resource);}).then(update=>{if(!signal.aborted)reader.postMessage({type:'refreshed',update});},error=>{if(!signal.aborted)reader.postMessage({type:'refreshed',error:String(error)});});
   if(data.type==='ready'){
    const probe=make('./native-remux-worker.js');probe.onmessage=({data:message})=>{
     if(message.type==='error')finish(Error(message.message));
     if(message.type==='probed')finish(null,{tracks:message.tracks,hybridRejection:message.hybridRejection,duration:message.duration,format:message.format,identity:data.identity,runtime:message.runtime});
    };probe.postMessage({type:'probe',runtime,demuxer,port:channel?.port2,size:data.size,mailbox,audioAdaptation,compiledWasm},channel?[channel.port2]:[]);
   }
  };
  const {refreshAuthorization,...transport}=source;reader.postMessage({type:'init',port:channel?.port1,mailbox,...transport},channel?[channel.port1]:[]);
 });
 result.format=await localContainerFormat(source.file,result.format);
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 return result;
 }finally{
  signal.removeEventListener('abort',abort);if(mailbox){const h=new Int32Array(mailbox,0,16);Atomics.store(h,4,1);Atomics.store(h,0,3);Atomics.notify(h,0);}
  channel?.port1.close();channel?.port2.close();for(const worker of workers)worker.terminate();
 }
}
