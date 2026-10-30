// SPDX-License-Identifier: Apache-2.0
import {PlayerError,playerError,isPlayerError} from './errors.js';
import {snapshotPreparationSource,samePreparationSource} from './preparation-source.js';
import type {RemotePreparationSource} from './preparation-source.js';
import {routingRequirements} from './probe-requirements.js';
import type {Probe} from './selection.js';
type Result={status:string;evidence?:Probe;available?:string[];bytesRead:number;reason?:string};
function transportFailure(error:unknown):Error{
  if(isPlayerError(error))return error;
  const observed=playerError(error),code=/strong ETag or explicit immutable contract/.test(observed.message)?'UNSUPPORTED_FEATURE':observed.code;
  const failure=new PlayerError(code,'Source transport: '+observed.message);
  Object.defineProperty(failure,'cause',{value:error});return failure;
}
/** Feed the maintained complete metadata inspector through Demuxe transport.
 * This does not promote partial optional-provider A/V enumeration to absence. */
export async function inspectRemoteFastSource(source:RemotePreparationSource,base:URL,signal:AbortSignal,onProgress?:(value:{phase:string})=>void):Promise<Result>{
  const snapshot=snapshotPreparationSource(source),controller=new AbortController();
  const abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const timer=setTimeout(()=>controller.abort(new DOMException('Source transport: remote inspection deadline exceeded','TimeoutError')),10000);
  let reader:any,closed=false,failed=false,failure:unknown,queue=Promise.resolve();
  const close=()=>{if(closed)return;closed=true;reader?.close();};
  const check=()=>{controller.signal.throwIfAborted();if(closed)throw new DOMException('Remote inspection retired','AbortError');if(!samePreparationSource(source,snapshot))throw new PlayerError('SOURCE_CHANGED','Source identity policy changed during remote inspection');};
  controller.signal.addEventListener('abort',close,{once:true});
  try{
    check();
    const [{RangeReader},{inspectFastSource}]=await Promise.all([import(new URL('web/range-reader.js',base).href),import(new URL('web/fast-source-inspector.js',base).href)]);check();
    reader=new RangeReader({...snapshot,url:new URL(snapshot.url,location.href).href,blockBytes:65536,cacheBytes:262144},snapshot.refreshAuthorization);
    let opened;try{opened=await reader.open();}catch(error){throw transportFailure(error);}check();const size=Number(opened.size),etag=opened.etag;
    if(!Number.isSafeInteger(size)||size<1||size>32*1024*1024||!snapshot.immutable&&!(typeof etag==='string'&&/^"[^\r\n]*"$/.test(etag)))return {status:'incomplete',bytesRead:0,available:[],reason:'Remote fast inspection requires a finite bounded representation and strong identity'};
    const file={size,slice:(at:number,end:number)=>({arrayBuffer:(sliceSignal:AbortSignal)=>{
      const cancel=()=>close();sliceSignal.addEventListener('abort',cancel,{once:true});if(sliceSignal.aborted)cancel();
      const work=queue.then(async()=>{
        try{
          check();if(!Number.isSafeInteger(at)||!Number.isSafeInteger(end)||at<0||end<at||end>size||end-at>512*1024)throw new PlayerError('INVALID_ARGUMENT','Invalid inspection byte range');
          const result=new Uint8Array(end-at);
          for(let n=0;n<result.length;){
            check();const value:Uint8Array=await reader.read(BigInt(at+n),result.length-n);check();
            if(!(value instanceof Uint8Array)||!value.length||value.length>result.length-n)throw new PlayerError('SOURCE_CHANGED','Incomplete remote inspection range');
            result.set(value,n);n+=value.length;
          }
          return result.buffer;
        }catch(error){if(!sliceSignal.aborted&&!failed){failed=true;failure=transportFailure(error);}close();throw error;}
        finally{sliceSignal.removeEventListener('abort',cancel);}
      });queue=work.then(()=>{},()=>{});return work;
    }})};
    const result:Result=await inspectFastSource(file,{signal:controller.signal,requirements:routingRequirements,onProgress});
    controller.signal.throwIfAborted();if(failed)throw failure;
    if(result.status==='satisfied'&&result.evidence){check();return {...result,evidence:{...result.evidence,identity:{size:String(size),...(typeof etag==='string'?{etag}:{})}}};}
    return result;
  }catch(error){if(controller.signal.aborted)throw controller.signal.reason;if(failed)throw failure;throw error;}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',close);close();}
}
