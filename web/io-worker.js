// SPDX-License-Identifier: Apache-2.0
import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';
import {initialIOWorker,transitionIOWorker,ioWorkerCurrent,ioReadCurrent} from './generated/internal/machine/io-worker.js';
let control=initialIOWorker();
const change=input=>{const result=transitionIOWorker(control,input);control=result.state;return result;};
let reader,resources,header,bytes,view,extra,urlBytes,timer;
const refreshes=new Map();
const facts=()=>({state:Atomics.load(header,0),serial:Atomics.load(header,1),epoch:Atomics.load(header,3)});
function synchronizeEpoch(){if(!header||!ioWorkerCurrent(control))return;const epoch=Atomics.load(header,3),decision=change({type:'epoch',epoch});if(decision.epochChanged){reader?.beginEpoch();resources?.beginEpoch();}}
function cleanup(){
 const read=reader,loader=resources,interval=timer,requests=[...refreshes.values()];reader=undefined;resources=undefined;timer=undefined;refreshes.clear();
 let failure;for(const action of [()=>{if(header)Atomics.notify(header,0);},()=>read?.close(),()=>loader?.close(),()=>clearInterval(interval),...requests.map(request=>()=>{try{clearTimeout(request.timer);}finally{request.reject(Error('Closed'));}})])try{action();}catch(error){failure??=error;}
 if(failure)throw failure;
}
function refresh(resource){
 const now=performance.now(),admission=change({type:'refresh',now});if(!admission.accepted)return Promise.reject(Error(admission.error??'Source transport closed'));
 const request=admission.refresh;
 return new Promise((resolve,reject)=>{
  const entry={resolve,reject,timer:undefined};refreshes.set(request.id,entry);
  const arm=delay=>{
   const handle=setTimeout(()=>{try{const now=performance.now(),done=change({type:'refreshed',id:request.id,now});if(done.remaining!==undefined){arm(done.remaining);return;}if(!done.accepted)return;refreshes.delete(request.id);reject(Error('Authorization refresh timed out'));}catch(error){change({type:'refreshed',id:request.id});refreshes.delete(request.id);reject(error);}},delay);entry.timer=handle;
   if(refreshes.get(request.id)!==entry||control.refresh?.id!==request.id)clearTimeout(handle);
  };
  try{arm(5000);if(refreshes.get(request.id)===entry&&control.refresh?.id===request.id)postMessage({type:'refresh',id:request.id,resource});}
  catch(error){change({type:'refreshed',id:request.id});refreshes.delete(request.id);try{clearTimeout(entry.timer);}catch{}reject(error);}
 });
}
self.onmessage=async({data})=>{
 let initializing=false;try{
  if(data.type==='init'){
   const init=change({type:'init'});if(!init.accepted)throw Error(init.error);initializing=true;
   header=new Int32Array(data.memory,data.pointer,16);bytes=new Uint8Array(data.memory,data.pointer+64,262144);view=new DataView(data.memory,data.pointer,64);
   const authorize=data.canRefresh?refresh:undefined;
   let source,info;
   if(!data.file&&data.options.format&&data.options.format!=='file'){
    if(!['hls','dash'].includes(data.options.format))throw Error('Unknown remote source format');
    const {ResourceLoader}=await import('./resource-loader.js');if(!ioWorkerCurrent(control))return;
    source=new ResourceLoader(data.options,authorize);if(!ioWorkerCurrent(control)){source.close();return;}resources=source;
    extra=new DataView(data.memory,data.pointer+64+262144,24);urlBytes=new Uint8Array(data.memory,data.pointer+64+262144+24,4096);
    info=await source.open(data.options.url,{manifest:true});if(!ioWorkerCurrent(control))return;info={...info,resource:info.id};
   }else{
    source=data.file?new LocalFileReader(data.file,{cacheBytes:data.subtitleCacheBytes??0,maxRequests:data.subtitleMaxRequests??0}):new RangeReader({...data.options,...data.subtitleCacheBytes?{cacheBytes:data.subtitleCacheBytes}:{},readDeadlineMs:45000},authorize);
    if(!ioWorkerCurrent(control)){source.close();return;}reader=source;info=await source.open();if(!ioWorkerCurrent(control))return;
   }
   if(change({type:'ready'}).accepted){postMessage({type:'ready',info});startPump();}
  }else if(data.type==='epoch')synchronizeEpoch();
  else if(data.type==='close'){const closed=change({type:'close'});if(closed.accepted)cleanup();postMessage({type:'closed'});}
  else if(data.type==='refreshed'){
   const done=change({type:'refreshed',id:data.id});if(!done.accepted)return;const entry=refreshes.get(data.id);refreshes.delete(data.id);if(entry){try{clearTimeout(entry.timer);}finally{data.error?entry.reject(Error('Authorization refresh failed')):entry.resolve(data.update);}}
  }
 }catch(error){if(initializing&&ioWorkerCurrent(control)){change({type:'fail'});try{cleanup();}catch{}}if(control.phase!=='closed')postMessage({type:'error',message:'Source transport: '+error.message});}
};
async function pump(){
 if(control.phase!=='ready'||control.read)return;
 synchronizeEpoch();const sampled=facts(),admission=change({type:'read',...sampled});if(!admission.accepted){if(admission.error)throw Error(admission.error);return;}
 const request=admission.read,source=reader,loader=resources;
 try{
  let output=new Uint8Array(),result=0,opened;
  if(loader){
   const operation=Atomics.load(header,15),id=extra.getInt32(0,true);
   if(operation===1){const zero=urlBytes.indexOf(0);if(zero<0)throw Error('Resource URL exceeds mailbox capacity');const url=new TextDecoder('utf-8',{fatal:true}).decode(urlBytes.slice(0,zero));const start=extra.getBigInt64(8,true),end=extra.getBigInt64(16,true);opened=await loader.open(url,start<0?{}:{start,end});result=opened.id;}
   else if(operation===2){output=loader.read(id,view.getBigUint64(32,true),Atomics.load(header,4));result=output.length;}
   else if(operation===3)loader.closeHandle(id);else throw Error('Invalid resource operation');
  }else{output=await source.read(view.getBigUint64(32,true),Atomics.load(header,4));result=output.length;}
  if(!ioReadCurrent(control,request,facts())){if(opened)loader.closeHandle(opened.id);return;}
  if(opened)view.setBigInt64(40,BigInt(opened.size),true);
  bytes.set(output);Atomics.store(header,5,result);if(Atomics.compareExchange(header,0,request.state,request.state+1)===request.state)Atomics.notify(header,0);
 }catch(error){
  if(ioReadCurrent(control,request,facts())){Atomics.store(header,5,-1);if(Atomics.compareExchange(header,0,request.state,request.state+2)===request.state)Atomics.notify(header,0);if(error.name!=='AbortError')postMessage({type:'error',message:'Source transport: '+error.message});}
 }finally{
  const publish=ioReadCurrent(control,request,{...facts(),state:request.state});change({type:'finish',id:request.id});
  if(publish)postMessage({type:'stats',stats:{...(loader??source).stats,size:String(source?.total??0),reads:Atomics.load(header,12),seeks:Atomics.load(header,13),interruptions:Atomics.load(header,14)}});
 }
}
function failPump(error){if(control.phase!=='ready')return;change({type:'fail'});try{cleanup();}catch{}try{postMessage({type:'error',message:'Source transport: '+error.message});}catch{}}
function startPump(){
 if(!change({type:'pump'}).accepted)return;synchronizeEpoch();
 if(typeof Atomics.waitAsync!=='function'){const handle=setInterval(()=>{void pump().catch(failPump);},2);if(control.phase!=='ready')clearInterval(handle);else timer=handle;return;}
 void(async()=>{while(control.phase==='ready'){await pump();if(control.phase!=='ready')break;const state=Atomics.load(header,0);if((state&7)===1)continue;await Atomics.waitAsync(header,0,state,1000).value;}})().catch(failPump);
}
