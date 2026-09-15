import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';
const ABI=0x444d5802, STRIDE=266328;
let reader,resources,stopped=false,activeSession,closing,openTail=Promise.resolve();
const lanes=[],loops=[],timers=[],pumps=new Set(),refreshes=new Map();
function cancelled(){return new DOMException('Resource request cancelled','AbortError');}
function serialOpen(url,options,signal){
  // Only manifest/adapter mutation needs serialization. Existing media reads
  // remain runnable while this open waits for headers or sniff bytes.
  const predecessor=resources.options.streaming?.integrated?Promise.resolve():openTail;
  const work=predecessor.then(()=>{if(signal.aborted||stopped)throw cancelled();return resources.open(url,{...options,signal});});
  openTail=Promise.allSettled([openTail,work]);
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(cancelled());
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();
    work.then(info=>{
      signal.removeEventListener('abort',abort);
      if(signal.aborted){resources.closeHandle(info.id);reject(cancelled());}
      else resolve(info);
    },error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
}
function synchronizeEpoch(lane){
  const epoch=Atomics.load(lane.header,3);
  if(epoch===lane.epoch)return;
  lane.epoch=epoch;lane.controller?.abort();
  if(!resources)reader?.beginEpoch();
}
function drive(lane){const work=pump(lane);pumps.add(work);void work.then(()=>pumps.delete(work),()=>pumps.delete(work));return work;}
function closeTransport(){
  return closing??=(async()=>{
    stopped=true;
    for(const lane of lanes){lane.controller?.abort();Atomics.notify(lane.header,0);Atomics.notify(lane.header,3);}
    reader?.close();resources?.close();for(const timer of timers)clearInterval(timer);
    for(const entry of refreshes.values()){clearTimeout(entry.timeout);entry.reject(cancelled());}refreshes.clear();
    await Promise.allSettled([...loops,...pumps,openTail]);
    postMessage({type:'closed'});
  })();
}
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const first=new Int32Array(data.memory,data.pointer,16);
      const count=Atomics.load(first,6)===ABI?Atomics.load(first,7):1;
      if(count!==1&&count!==4)throw Error('Unsupported resource mailbox layout');
      for(let index=0;index<count;index++){
        const at=data.pointer+index*STRIDE;
        lanes.push({header:new Int32Array(data.memory,at,16),view:new DataView(data.memory,at,64),
          bytes:new Uint8Array(data.memory,at+64,262144),extra:new DataView(data.memory,at+262208,24),
          url:new Uint8Array(data.memory,at+262232,4096),busy:false,index});
      }
      const refresh=data.canRefresh?resource=>new Promise((resolve,reject)=>{
        const id=crypto.randomUUID(),timeout=setTimeout(()=>{refreshes.delete(id);reject(Error('Authorization refresh timed out'));},5000);
        refreshes.set(id,{resolve,reject,timeout});postMessage({type:'refresh',id,resource});
      }):undefined;
      if(!data.file&&data.options.format&&data.options.format!=='file'){
        if(!['hls','dash'].includes(data.options.format))throw Error('Unknown remote source format');
        const {ResourceLoader}=await import('./resource-loader.js');if(stopped)return;
        resources=new ResourceLoader(data.options,refresh);
        const info=await resources.open(data.options.url,{manifest:true});
        if(!stopped)postMessage({type:'ready',info:{...info,resource:info.id}});
      }else{
        reader=data.file?new LocalFileReader(data.file):new RangeReader(data.options,refresh);
        const info=await reader.open();if(!stopped)postMessage({type:'ready',info});
      }
    }else if(data.type==='activate'){
      if(!stopped&&activeSession===undefined&&data.session===Atomics.load(lanes[0].header,2)){
        activeSession=data.session;startLoops();
      }
    }else if(data.type==='epoch'){
      if(activeSession!==undefined)for(const lane of lanes)synchronizeEpoch(lane);
    }else if(data.type==='close')await closeTransport();
    else if(data.type==='refreshed'){
      const entry=refreshes.get(data.id);
      if(entry){clearTimeout(entry.timeout);refreshes.delete(data.id);data.error?entry.reject(Error('Authorization refresh failed')):entry.resolve(data.update);}
    }
  }catch(error){if(!stopped)postMessage({type:'error',message:'Source transport: '+error.message});}
};
async function pump(lane){
  const {header,view,extra,bytes}=lane;
  if(stopped||lane.busy||activeSession!==Atomics.load(header,2)||(Atomics.load(header,0)&7)!==1)return;
  synchronizeEpoch(lane);lane.busy=true;
  const request=Atomics.load(header,0),serial=Atomics.load(header,1),epoch=Atomics.load(header,3),session=Atomics.load(header,2);
  const controller=lane.controller=new AbortController(),signal=controller.signal;
  const current=()=>!stopped&&!signal.aborted&&Atomics.load(header,1)===serial&&Atomics.load(header,3)===epoch&&Atomics.load(header,2)===session;
  let opened;
  try{
    let output=new Uint8Array(),result=0;
    if(resources){
      const operation=Atomics.load(header,15),id=extra.getInt32(0,true);
      if(operation===1){
        const zero=lane.url.indexOf(0);if(zero<0)throw Error('Resource URL exceeds mailbox capacity');
        const url=new TextDecoder('utf-8',{fatal:true}).decode(lane.url.slice(0,zero));
        const start=extra.getBigInt64(8,true),end=extra.getBigInt64(16,true);
        opened=await serialOpen(url,start<0?{}:{start,end},signal);result=opened.id;
      }else if(operation===2){output=await resources.read(id,view.getBigUint64(32,true),Atomics.load(header,4),signal);result=output.length;}
      else if(operation===3)resources.closeHandle(id);
      else throw Error('Invalid resource operation');
    }else{
      if(lane.index!==0)throw Error('Direct source requires its dedicated lane');
      output=await reader.read(view.getBigUint64(32,true),Atomics.load(header,4));result=output.length;
    }
    if(!current()||Atomics.compareExchange(header,0,request,request+3)!==request){if(opened)resources.closeHandle(opened.id);return;}
    if(opened){view.setBigInt64(40,BigInt(opened.size),true);extra.setInt32(4,opened.seekable?1:0,true);}
    bytes.set(output);Atomics.store(header,5,result);
    if(Atomics.compareExchange(header,0,request+3,request+1)===request+3)Atomics.notify(header,0);
  }catch(error){
    if(current()&&Atomics.compareExchange(header,0,request,request+3)===request){
      const code=error.kind==='cancelled'||error.name==='AbortError'?-2:error.kind==='timeout'?-3:error.kind==='range'?-4:-1;
      Atomics.store(header,5,code);
      if(Atomics.compareExchange(header,0,request+3,request+2)===request+3)Atomics.notify(header,0);
      if(code!==-2)postMessage({type:'error',message:'Source transport: '+error.message});
    }
  }finally{
    lane.busy=false;lane.controller=undefined;
    if(!stopped){const root=lanes[0].header;postMessage({type:'stats',stats:{...(resources??reader).stats,
      size:String(reader?.total??0),reads:Atomics.load(root,12),seeks:Atomics.load(root,13),interruptions:Atomics.load(root,14),
      mailboxLanes:lanes.length,pendingRequests:lanes.filter(l=>(Atomics.load(l.header,0)&7)===1).length}});}
  }
}
function startLoops(){
  for(const lane of lanes){
    lane.epoch=Atomics.load(lane.header,3);
    if(typeof Atomics.waitAsync!=='function'){
      timers.push(setInterval(()=>synchronizeEpoch(lane),10),setInterval(()=>drive(lane),2));continue;
    }
    loops.push((async()=>{
      while(!stopped){const before=Atomics.load(lane.header,3);synchronizeEpoch(lane);
        await Atomics.waitAsync(lane.header,3,before,1000).value;}
    })());
    loops.push((async()=>{
      while(!stopped){await drive(lane);if(stopped)break;
        const state=Atomics.load(lane.header,0);if((state&7)===1)continue;
        await Atomics.waitAsync(lane.header,0,state,1000).value;}
    })());
  }
}
