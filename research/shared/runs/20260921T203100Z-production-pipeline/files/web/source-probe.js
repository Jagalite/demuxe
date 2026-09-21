// SPDX-License-Identifier: GPL-3.0-or-later
// Packet-only metadata preflight. No decoded audio or video is produced.
export async function probeSource(source,signal,audioAdaptation){
 const jspi=!globalThis.crossOriginIsolated;
 if(jspi&&(audioAdaptation||typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function'))throw Error('Non-isolated source inspection requires JSPI');
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 const mailbox=jspi?null:new SharedArrayBuffer(64+262144),channel=jspi?new MessageChannel():null,workers=[];let abort;
 try{return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Source inspection timed out')),20000);
  const finish=(error,value)=>{clearTimeout(timer);error?reject(error):resolve(value);};
  abort=()=>finish(new DOMException('Aborted','AbortError'));signal.addEventListener('abort',abort,{once:true});
  const make=file=>{const w=new Worker(new URL(file,import.meta.url),{type:'module'});workers.push(w);w.onerror=e=>{e.preventDefault();finish(Error('Source inspection worker failed: '+e.message));};w.onmessageerror=()=>finish(Error('Source inspection message error'));return w;};
  const reader=make('./native-remux-source-worker.js');
  reader.onmessage=({data})=>{
   if(signal.aborted)return;
   if(data.type==='error')finish(Error('Source transport: '+data.message));
   if(data.type==='refresh')Promise.resolve().then(()=>{if(!source.refreshAuthorization)throw Error('Authorization refresh unavailable');return source.refreshAuthorization(data.resource);}).then(update=>{if(!signal.aborted)reader.postMessage({type:'refreshed',update});},error=>{if(!signal.aborted)reader.postMessage({type:'refreshed',error:String(error)});});
   if(data.type==='ready'){
    const probe=make('./native-remux-worker.js');probe.onmessage=({data:message})=>{
     if(message.type==='error')finish(Error(message.message));
     if(message.type==='probed')finish(null,{tracks:message.tracks,duration:message.duration,format:message.format,identity:data.identity});
    };probe.postMessage({type:'probe',size:data.size,mailbox,audioAdaptation,jspi,port:channel?.port2},channel?[channel.port2]:[]);
   }
  };
  const {refreshAuthorization,...transport}=source;reader.postMessage({type:'init',mailbox,...transport,port:channel?.port1},channel?[channel.port1]:[]);
 });}finally{
  signal.removeEventListener('abort',abort);channel?.port1.close();channel?.port2.close();if(mailbox){const h=new Int32Array(mailbox,0,16);Atomics.store(h,4,1);Atomics.store(h,0,3);Atomics.notify(h,0);}
  for(const worker of workers)worker.terminate();
 }
}
