// SPDX-License-Identifier: Apache-2.0
import {initialLocalReader,transitionLocalReader} from './generated/internal/machine/local-reader.js';
// Bounded local-file adapter for the existing AVIO source contract.
// File handles are cloned to workers; complete media never enters an ArrayBuffer.
// FileReader is an opt-in experiment; production keeps the established stream path.
// Only a validated, bounded slice reaches this adapter; cancellation stays eager.
function sliceReader(blob,size,experimentalFileReader){
 if(!experimentalFileReader||typeof FileReader==='undefined'||typeof Blob==='undefined'||!(blob instanceof Blob))return blob.stream().getReader();
 if(blob.size!==size)throw Error(blob.size>size?'Local read exceeds requested slice':'Local file changed or truncated');
 const reader=new FileReader();let delivered=false;
 const pending=new Promise((resolve,reject)=>{
  reader.onload=()=>resolve(new Uint8Array(reader.result));
  reader.onerror=()=>reject(reader.error??Error('Local file read failed'));
  reader.onabort=()=>reject(new DOMException('Superseded','AbortError'));
  reader.readAsArrayBuffer(blob);
 });
 return {
  async read(){if(delivered)return {done:true};delivered=true;return {done:false,value:await pending};},
  async cancel(){if(reader.readyState===1)reader.abort();},
  releaseLock(){reader.onload=reader.onerror=reader.onabort=null;}
 };
}
export class LocalFileReader {
 constructor(file,{cacheBytes=0,maxRequests=0,experimentalFileReader=false}={}){
  if(!file||!Number.isSafeInteger(file.size)||file.size<=0||typeof file.slice!=='function')throw Error('Invalid local File source');
  this.file=file;this.control=initialLocalReader(BigInt(file.size),cacheBytes,maxRequests);
  this.experimentalFileReader=experimentalFileReader===true;this.cache=new Map();
 }
 get total(){return this.control.total;}
 get epoch(){return this.control.epoch;}
 get closed(){return this.control.closed;}
 get busy(){return this.control.active!==null;}
 get stats(){return this.control.stats;}
 transition(command){const decision=transitionLocalReader(this.control,command);this.control=decision.state;return decision;}
 check(decision){if(decision.aborted)throw new DOMException('Superseded','AbortError');if(decision.error)throw Error(decision.error);return decision;}
 async open(){if(this.closed)throw Error('File reader closed');return {size:String(this.total),kind:'file'};}
 beginEpoch(){this.transition({type:'epoch'});void this.active?.cancel().catch(()=>{});}
 close(){if(this.closed)return;this.transition({type:'close'});void this.active?.cancel().catch(()=>{});this.file=null;this.cache.clear();}
 async read(offset,capacity){
  const decision=this.check(this.transition({type:'begin',offset,capacity}));
  if(decision.empty)return new Uint8Array();
  if(decision.hit!==undefined)return this.cache.get(decision.hit);
  const request=decision.request,{size,key,id}=request;let stream,output,success=false;
  try{
   output=new Uint8Array(size);
   stream=this.active=sliceReader(this.file.slice(Number(offset),Number(offset)+size),size,this.experimentalFileReader);this.transition({type:'started',id});
   for(;;){
    const {value,done}=await stream.read(),at=this.control.active.received;
    this.check(this.transition({type:'chunk',id,bytes:value?.length??0,done}));
    if(done)break;output.set(value,at);
   }
   success=true;
  }finally{
   try{await stream?.cancel().catch(()=>{});stream?.releaseLock();}catch(error){success=false;throw error;}
   finally{
    this.active=null;
    const finished=this.check(this.transition({type:'finish',id,success}));
    for(const old of finished.evict??[])this.cache.delete(old);
    if(finished.publish&&this.control.cache.some(item=>item.key===key))this.cache.set(key,output);
   }
  }
  return output;
 }
}
