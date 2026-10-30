// SPDX-License-Identifier: Apache-2.0
/** One verified worker owns one attempt. URLs, authorization and transport stay
 * with Demuxe; only bounded read requests and owned buffers cross this channel. */
export function installPreparationWorker(prepareFile, host = globalThis) {
  const protocolError=message=>Object.assign(new Error(message),{code:'ASSET_LOAD_FAILED'});
  let started=false,serial=0;
  const pending=new Map();
  host.onmessage=async event=>{
    const data=event.data;
    if(data?.type==='read-result'){
      const request=pending.get(data.id);
      if(!request)return;
      pending.delete(data.id);
      if(!(data.bytes instanceof Uint8Array)||data.bytes.byteLength!==request.length)request.reject(protocolError('Invalid preparation read response'));
      else request.resolve(data.bytes);
      return;
    }
    if(started)return;
    started=true;
    try{
      let file=data.file;
      if(data.source){
        const size=data.source.size;
        if(!Number.isSafeInteger(size)||size<1||size>32*1024*1024)throw protocolError('Invalid preparation source size');
        file={kind:'bytes',size,read:(offset,length)=>new Promise((resolve,reject)=>{
          if(pending.size>=8){reject(protocolError('Preparation read queue exceeded'));return;}
          const id=++serial;pending.set(id,{resolve,reject,length});
          try{host.postMessage({type:'read',id,offset,length});}catch(error){pending.delete(id);reject(error);}
        })};
      }
      const value=await prepareFile(file,{sourceTracks:data.sourceTracks});
      host.postMessage({ok:true,value});
    }catch(error){host.postMessage({ok:false,error:{name:error?.name??'Error',message:error?.message??String(error),code:error?.code}});}
    finally{
      for(const request of pending.values())request.reject(new DOMException('Preparation retired','AbortError'));
      pending.clear();
    }
  };
}
