// SPDX-License-Identifier: Apache-2.0
/** One worker per remux generation. Configure is an acquisition handshake;
 * subsequent messages use the existing presentation owner's producer protocol. */
export function installStreamWorker(createProducer,host=globalThis){
  const controller=new AbortController();
  let phase='new',producer,serial=0;
  const pending=new Map();
  const protocolError=message=>Object.assign(new Error(message),{code:'ASSET_LOAD_FAILED'});
  const retire=()=>{if(phase==='closed')return;phase='closed';controller.abort(new DOMException('Streaming generation retired','AbortError'));for(const request of pending.values())request.reject(controller.signal.reason);pending.clear();producer?.terminate();producer=undefined;};
  const fail=error=>{
    if(phase==='closed')return;
    host.postMessage({type:'error',message:error?.message??String(error),code:error?.code,name:error?.name??'Error'});retire();
  };
  host.onmessage=async({data})=>{
    if(phase==='closed')return;
    if(data?.type==='close'){retire();return;}
    try{
      if(data?.type==='read-result'){
        const request=pending.get(data.id);
        if(!request)throw protocolError('Unexpected streaming read response');
        pending.delete(data.id);
        if(!(data.bytes instanceof Uint8Array)||data.bytes.byteLength!==request.length)request.reject(protocolError('Incomplete streaming read response'));
        else request.resolve(data.bytes);
        return;
      }
      if(phase==='new'&&data?.type==='configure'){
        phase='acquiring';
        let file=data.file;
        if(data.source){
          const size=data.source.size;
          if(!Number.isSafeInteger(size)||size<1||size>32*1024*1024)throw protocolError('Invalid streaming source size');
          file={kind:'bytes',size,read:(offset,length)=>new Promise((resolve,reject)=>{
            if(controller.signal.aborted){reject(controller.signal.reason);return;}
            if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||length>size-offset||pending.size>=8){reject(protocolError('Invalid streaming source read'));return;}
            if(!length){resolve(new Uint8Array());return;}
            const id=++serial;pending.set(id,{resolve,reject,length});
            try{host.postMessage({type:'read',id,offset,length});}catch(error){pending.delete(id);reject(error);}
          })};
        }
        const acquired=await createProducer(file,{sourceTracks:data.sourceTracks,target:data.target,signal:controller.signal});
        if(controller.signal.aborted){acquired.terminate();return;}
        producer=acquired;
        producer.onmessage=({data:message})=>{
          if(phase==='closed')return;
          host.postMessage(message,message.buffer instanceof ArrayBuffer?[message.buffer]:[]);
          if(message.type==='error')retire();
        };
        phase='ready';host.postMessage({type:'producer-ready',size:file.size});return;
      }
      if(phase!=='ready'||!data||!['init','select-container','next'].includes(data.type))throw Object.assign(new Error('Invalid streaming worker command'),{code:'ASSET_LOAD_FAILED'});
      producer.postMessage(data);
    }catch(error){fail(error);}
  };
}
