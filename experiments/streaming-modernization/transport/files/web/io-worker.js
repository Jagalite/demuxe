import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';
let reader,resources,header,bytes,view,extra,urlBytes,busy=false,timer,stopped=false;
const refreshes=new Map();
let nativeEpoch,activeSession,epochTimer;
let pumpLoop,epochLoop,closing;
const pumps=new Set();
function drivePump(){const task=pump();pumps.add(task);void task.then(()=>pumps.delete(task),()=>pumps.delete(task));return task;}
function closeTransport(){
  return closing??=(async()=>{
    stopped=true;
    // Wake both wait queues and let their continuations retire before the
    // parent terminates this worker or releases the shared Wasm memory.
    if(header){Atomics.notify(header,0);Atomics.notify(header,3);}
    reader?.close();resources?.close();clearInterval(timer);clearInterval(epochTimer);
    for(const r of refreshes.values()){clearTimeout(r.timeout);r.reject(Error('Closed'));}refreshes.clear();
    await Promise.allSettled([pumpLoop,epochLoop,...pumps]);
    postMessage({type:'closed'});
  })();
}
function synchronizeEpoch(){const current=Atomics.load(header,3);if(current!==nativeEpoch){nativeEpoch=current;reader?.beginEpoch();resources?.beginEpoch();}}
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      header=new Int32Array(data.memory,data.pointer,16);bytes=new Uint8Array(data.memory,data.pointer+64,262144);view=new DataView(data.memory,data.pointer,64);
      const refresh=data.canRefresh?(resource)=>new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timeout=setTimeout(()=>{refreshes.delete(id);reject(Error('Authorization refresh timed out'));},5000);refreshes.set(id,{resolve,reject,timeout});postMessage({type:'refresh',id,resource});}):undefined;
      if(!data.file&&data.options.format&&data.options.format!=='file'){
        if(!['hls','dash'].includes(data.options.format))throw Error('Unknown remote source format');
        const {ResourceLoader}=await import('./resource-loader.js');
        if(stopped)return;
        resources=new ResourceLoader(data.options,refresh);
        extra=new DataView(data.memory,data.pointer+64+262144,24);
        urlBytes=new Uint8Array(data.memory,data.pointer+64+262144+24,4096);
        const info=await resources.open(data.options.url,{manifest:true});
        postMessage({type:'ready',info:{...info,resource:info.id}});return;
      }
      reader=data.file?new LocalFileReader(data.file):new RangeReader(data.options,refresh);
      const info=await reader.open();postMessage({type:'ready',info});
    }else if(data.type==='activate'){if(!stopped&&activeSession===undefined&&data.session===Atomics.load(header,2)){activeSession=data.session;startPump();}}
    else if(data.type==='epoch'){if(activeSession!==undefined)synchronizeEpoch();}
    else if(data.type==='close'){await closeTransport();}
    else if(data.type==='refreshed'){const r=refreshes.get(data.id);if(r){clearTimeout(r.timeout);refreshes.delete(data.id);data.error?r.reject(Error('Authorization refresh failed')):r.resolve(data.update);}}
  }catch(error){if(!stopped)postMessage({type:'error',message:'Source transport: '+error.message});}
};
async function pump(){
  if(stopped||busy||activeSession!==Atomics.load(header,2)||(Atomics.load(header,0)&7)!==1)return;
  synchronizeEpoch();busy=true;const requestState=Atomics.load(header,0);const serial=Atomics.load(header,1),epoch=Atomics.load(header,3),session=Atomics.load(header,2);
  try{
    let output=new Uint8Array(),result=0,opened;
    if(resources){
      const operation=Atomics.load(header,15),id=extra.getInt32(0,true);
      if(operation===1){
        const zero=urlBytes.indexOf(0);if(zero<0)throw Error('Resource URL exceeds mailbox capacity');
        const url=new TextDecoder('utf-8',{fatal:true}).decode(urlBytes.slice(0,zero));
        const start=extra.getBigInt64(8,true),end=extra.getBigInt64(16,true);
        opened=await resources.open(url,start<0?{}:{start,end});result=opened.id;
      }else if(operation===2){output=await resources.read(id,view.getBigUint64(32,true),Atomics.load(header,4));result=output.length;}
      else if(operation===3)resources.closeHandle(id);
      else throw Error('Invalid resource operation');
    }else{output=await reader.read(view.getBigUint64(32,true),Atomics.load(header,4));result=output.length;}
    // Claim the payload before writing it. A cancelled ticket must never copy
    // bytes or metadata into the next demux request's shared buffer.
    if(stopped||Atomics.load(header,1)!==serial||Atomics.load(header,3)!==epoch||Atomics.load(header,2)!==session||
       Atomics.compareExchange(header,0,requestState,requestState+3)!==requestState){if(opened)resources.closeHandle(opened.id);return;}
    if(opened){view.setBigInt64(40,BigInt(opened.size),true);extra.setInt32(4,opened.seekable?1:0,true);}
    bytes.set(output);Atomics.store(header,5,result);
    if(Atomics.compareExchange(header,0,requestState+3,requestState+1)===requestState+3)Atomics.notify(header,0);
  }catch(error){
    if(!stopped&&Atomics.load(header,1)===serial&&Atomics.load(header,3)===epoch&&Atomics.load(header,2)===session&&
       Atomics.compareExchange(header,0,requestState,requestState+3)===requestState){
      const code=error.kind==='cancelled'||error.name==='AbortError'?-2:error.kind==='timeout'?-3:error.kind==='range'?-4:-1;
      Atomics.store(header,5,code);
      if(Atomics.compareExchange(header,0,requestState+3,requestState+2)===requestState+3)Atomics.notify(header,0);
      if(code!==-2)postMessage({type:'error',message:'Source transport: '+error.message});
    }
  }finally{busy=false;postMessage({type:'stats',stats:{...(resources??reader).stats,size:String(reader?.total??0),reads:Atomics.load(header,12),seeks:Atomics.load(header,13),interruptions:Atomics.load(header,14)}});}
}

function startPump(){
  nativeEpoch=Atomics.load(header,3);
  // Independent watcher: a pending Fetch read must not prevent observing the
  // demux thread's accepted cancellation epoch.
  if(typeof Atomics.waitAsync==='function')epochLoop=(async()=>{
    while(!stopped){const previous=Atomics.load(header,3);synchronizeEpoch();
      await Atomics.waitAsync(header,3,previous,1000).value;}
  })();
  else epochTimer=setInterval(synchronizeEpoch,10);
  if(typeof Atomics.waitAsync!=='function'){timer=setInterval(drivePump,2);return;}
  pumpLoop=(async()=>{
    while(!stopped){
      await drivePump();
      if(stopped)break;
      const state=Atomics.load(header,0);
      if((state&7)===1)continue;
      await Atomics.waitAsync(header,0,state,1000).value;
    }
  })();
}
