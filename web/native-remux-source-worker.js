// SPDX-License-Identifier: Apache-2.0
import {LocalFileReader} from './file-reader.js';
import {RangeReader} from './range-reader.js';
import {initialRemuxSourceWorker,beginRemuxSource,openedRemuxSource,remuxSourceCurrent,beginRemuxSourceRead,remuxSourceReadCurrent,finishRemuxSourceRead,beginRemuxSourceRefresh,remuxSourceRefreshCurrent,settleRemuxSourceRefresh,retireRemuxSourceWorker} from './generated/internal/machine/remux-source-worker.js';
let control=initialRemuxSourceWorker(),owner;
const refreshes=new Map(),timers=new Set();
let cleanupFailure;
const aborted=()=>new DOMException('Closed','AbortError');
const current=resource=>owner===resource&&remuxSourceCurrent(control,resource.epoch);
const attempt=work=>{try{work();}catch(error){cleanupFailure??={error};}};
const describe=error=>{try{return String(error);}catch{return 'Private source failure';}};
function clearRegistration(registration){
 if(!registration||registration.handle===undefined||registration.attempted||registration.fired)return;
 registration.attempted=true;timers.delete(registration);
 try{clearTimeout(registration.handle);}catch(error){cleanupFailure??={error};if(!registration.fired)timers.add(registration);}
}
function settlePhysical(record,error,update,success=false){
 if(!record)return;refreshes.delete(record.request.id);const registration=record.registration;record.registration=null;clearRegistration(registration);success?record.resolve(update):record.reject(error);
}
function release(resource,failed=false){
 if(!resource)return;
 const reader=resource.reader,port=resource.port,h=resource.h;resource.reader=resource.port=null;
 if(reader)attempt(()=>reader.close());if(port)attempt(()=>port.close());
 if(h){if(failed)attempt(()=>Atomics.store(h,3,-1));else attempt(()=>Atomics.store(h,4,1));attempt(()=>Atomics.store(h,0,3));attempt(()=>Atomics.notify(h,0));}
}
function retire(phase,error,request){
 const decision=retireRemuxSourceWorker(control,phase);control=decision.state;if(!decision.accepted)return;
 const resource=owner;owner=null;const pending=[...refreshes.values()];refreshes.clear();
 for(const record of pending)settlePhysical(record,error);
 // A terminal read response is sent through the captured port before closing it.
 if(phase==='failed'&&request&&resource?.port)attempt(()=>resource.port.postMessage({id:request.clientId,error:describe(error)}));
 release(resource,phase==='failed');
 for(const registration of [...timers])clearRegistration(registration);
 if(phase==='failed')attempt(()=>postMessage({type:'error',message:describe(error)}));
}
function refresh(resource,value){
 const now=performance.now(),decision=beginRemuxSourceRefresh(control,resource.epoch,now);control=decision.state;
 if(!decision.accepted)return Promise.reject(decision.error?Error(decision.error):aborted());
 const request=decision.request;
 return new Promise((resolve,reject)=>{
  const record={request,resolve,reject,registration:null};refreshes.set(request.id,record);
  const finish=error=>{const result=settleRemuxSourceRefresh(control,request.id,request.epoch);control=result.state;if(result.accepted)settlePhysical(record,error);};
  const arm=()=>{
   if(!current(resource)||!remuxSourceRefreshCurrent(control,request))return;
   const delay=Math.max(1,request.deadline-performance.now());
   if(!current(resource)||!remuxSourceRefreshCurrent(control,request))return;
   const registration={handle:undefined,attempted:false,fired:false};record.registration=registration;
   const acquired=setTimeout(()=>{
    if(registration.fired)return;registration.fired=true;timers.delete(registration);if(record.registration!==registration)return;record.registration=null;
    if(!current(resource)||!remuxSourceRefreshCurrent(control,request))return;
    try{
     const now=performance.now(),result=settleRemuxSourceRefresh(control,request.id,request.epoch,now);control=result.state;
     if(result.remaining!==undefined){arm();return;}
     if(result.accepted)settlePhysical(record,Error('Authorization refresh timeout'));
    }catch(error){finish(error);}
   },delay);registration.handle=acquired;
   if(!registration.fired&&record.registration===registration&&current(resource)&&remuxSourceRefreshCurrent(control,request))timers.add(registration);else clearRegistration(registration);
  };
  try{arm();if(current(resource)&&remuxSourceRefreshCurrent(control,request))postMessage({type:'refresh',id:request.id,resource:value});}catch(error){finish(error);}
 });
}
function refreshed(data){
 const request=control.refresh;if(!request)return;let id,error,update;
 try{id=data.id;error=data.error?Error(String(data.error)):null;update=data.update;}catch(error){const result=settleRemuxSourceRefresh(control,request.id,request.epoch);control=result.state;if(result.accepted)settlePhysical(refreshes.get(request.id),error);return;}
 if(id!==request.id)return;
 const decision=settleRemuxSourceRefresh(control,request.id,request.epoch);control=decision.state;
 if(decision.accepted)settlePhysical(refreshes.get(request.id),error,update,!error);
}
async function read(resource,offset,count,clientId){
 const decision=beginRemuxSourceRead(control,resource.epoch,offset,count,clientId);control=decision.state;
 if(!decision.accepted){if(decision.error)retire('failed',Error(decision.error));return;}
 const request=decision.request,deliveryCurrent=()=>current(resource)&&control.serial===request.id;
 try{
  const read=resource.reader.read;if(!current(resource)||!remuxSourceReadCurrent(control,request))return;
  const bytes=await read.call(resource.reader,BigInt(request.offset),request.count);
  if(!current(resource)||!remuxSourceReadCurrent(control,request))return;
  // Cached reader subviews must never be transferred or retained by the native caller.
  const owned=Uint8Array.prototype.slice.call(bytes);if(!current(resource)||!remuxSourceReadCurrent(control,request))return;
  const result=finishRemuxSourceRead(control,request);control=result.state;if(!result.accepted)return;
  if(resource.port){const buffer=owned.buffer,port=resource.port,post=port.postMessage;if(!deliveryCurrent())return;post.call(port,{id:request.clientId,buffer},[buffer]);}
  else{resource.buffer.set(owned);Atomics.store(resource.h,3,owned.length);Atomics.store(resource.h,0,2);Atomics.notify(resource.h,0);}
  if(!deliveryCurrent())return;const stats=resource.reader.stats;if(deliveryCurrent())postMessage({type:'stats',stats});
 }catch(error){if(deliveryCurrent())retire('failed',error,request);}
}
async function initialize(data){
 let resource;
 try{
  const port=data.port,decision=beginRemuxSource(control,port?'port':'mailbox');control=decision.state;
  if(!decision.accepted){if(port&&port!==owner?.port)attempt(()=>port.close());return;}
  resource={epoch:decision.epoch,reader:null,port:port??null,h:null,view:null,buffer:null};owner=resource;
  const mailbox=data.mailbox;if(!current(resource))return;
  if(mailbox){resource.h=new Int32Array(mailbox,0,16);resource.view=new DataView(mailbox);resource.buffer=new Uint8Array(mailbox,64);}
  const file=data.file;if(!current(resource))return;
  let options;if(!file){const provided=data.options,identity=data.identity;options={...provided,...(identity?{identity}:{}),cacheBytes:2*1024*1024,blockBytes:65536,readDeadlineMs:45000};if(!current(resource))return;}
  const reader=file?new LocalFileReader(file):new RangeReader(options,value=>refresh(resource,value));
  if(!current(resource)){attempt(()=>reader.close());return;}resource.reader=reader;
  const open=reader.open;if(!current(resource))return;const identity=await open.call(reader);if(!current(resource))return;
  const size=Number(identity.size);if(!current(resource))return;const opened=openedRemuxSource(control,resource.epoch,size);control=opened.state;if(!opened.accepted)return;
  if(resource.port){
   const port=resource.port;
   port.onmessage=({data:request})=>{
    if(!current(resource))return;
    const serial=control.serial;let offset,count,id,valid;
    try{valid=!!request&&typeof request==='object'&&request.type==='read';offset=request?.offset;count=request?.count;id=request?.id;}catch(error){if(current(resource)&&control.serial===serial)retire('failed',error);return;}
    if(!current(resource)||control.serial!==serial)return;if(!valid){retire('failed',Error('Invalid private source request'));return;}
    return read(resource,offset,count,id);
   };
   if(!current(resource))return;port.onmessageerror=()=>{if(current(resource))retire('failed',Error('Private source message error'));};if(!current(resource))return;
   postMessage({type:'ready',size,identity:file?undefined:identity});return;
  }
  postMessage({type:'ready',size,identity:file?undefined:identity});
  while(current(resource)){
   const status=Atomics.load(resource.h,0);
   if(status!==1){if(Atomics.waitAsync)await Atomics.waitAsync(resource.h,0,status,100).value;else await new Promise(resolve=>setTimeout(resolve,4));continue;}
   const offset=resource.view.getFloat64(32,true),count=Atomics.load(resource.h,2);await read(resource,offset,count,null);
  }
 }catch(error){if(!resource||current(resource))retire('failed',error);}
}
self.onmessage=({data})=>{
 if(data.type==='refreshed'){refreshed(data);return;}
 if(data.type==='close'){retire('closed',aborted());return;}
 if(data.type==='init')return initialize(data);
};
