// SPDX-License-Identifier: Apache-2.0
import type {RemoteSource} from '../types.js';
import {PlayerError} from './errors.js';

export type RemotePreparationSource=RemoteSource&{identity?:{size:string;etag?:string}};
export function remotePreparationSize(source:RemotePreparationSource):number|undefined{
  const identity=source.identity;
  if(source.demuxer||source.streaming||source.format&&source.format!=='file'||!identity||!/^\d+$/.test(identity.size)||!(source.immutable||identity.etag&&/^"[^\r\n]*"$/.test(identity.etag)))return;
  const size=Number(identity.size);
  return Number.isSafeInteger(size)&&size>0&&size<=32*1024*1024?size:undefined;
}
export function snapshotPreparationSource(source:RemotePreparationSource):RemotePreparationSource{
  return {...source,identity:source.identity?{...source.identity}:undefined,headers:source.headers?{...source.headers}:undefined,allowedOrigins:source.allowedOrigins?.slice()};
}
export function samePreparationSource(a:RemotePreparationSource,b:RemotePreparationSource):boolean{
  const key=(source:RemotePreparationSource)=>JSON.stringify([source.url,source.format??'file',source.demuxer,source.streaming,source.credentials??'omit',source.immutable??false,[source.identity?.size,source.identity?.etag],Object.entries(source.headers??{}).sort(([a],[b])=>a.localeCompare(b)),source.allowedOrigins?.slice().sort()]);
  return a.refreshAuthorization===b.refreshAuthorization&&key(a)===key(b);
}
/** Borrow the established transport policy; retain exact read ownership here.
 * Serializing reads protects RangeReader's one playback lane across A/V pumps. */
export async function openPreparationSource(source:RemotePreparationSource,base:URL,signal:AbortSignal,{maxBytes=32*1024*1024,validate}:{maxBytes?:number;validate?:()=>void}={}){
  const size=remotePreparationSize(source);
  if(size===undefined)throw new PlayerError('UNSUPPORTED_FEATURE','Remote preparation requires a bounded inspected file identity');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64*1024*1024)throw new PlayerError('INVALID_ARGUMENT','Invalid remote preparation read budget');
  signal.throwIfAborted();
  const {RangeReader}=await import(new URL('web/range-reader.js',base).href);
  signal.throwIfAborted();
  const reader=new RangeReader({...source,url:new URL(source.url,location.href).href,blockBytes:65536,cacheBytes:262144},source.refreshAuthorization);
  let closed=false,reads=0,bytes=0,queue=Promise.resolve();
  const close=()=>{if(!closed){closed=true;reader.close();}};
  signal.addEventListener('abort',close,{once:true});
  const check=()=>{signal.throwIfAborted();if(closed)throw new DOMException('Remote preparation closed','AbortError');validate?.();};
  try{
    if(signal.aborted)close();check();
    const opened=await reader.open();check();
    if(Number(opened.size)!==size)throw new PlayerError('SOURCE_CHANGED','Remote preparation source changed length');
  }catch(error){close();signal.removeEventListener('abort',close);if(signal.aborted)throw signal.reason;throw error;}
  return {
    size,
    read(at:number,length:number):Promise<Uint8Array>{
      try{
        check();
        if(!Number.isSafeInteger(at)||!Number.isSafeInteger(length)||at<0||length<0||length>size-at)throw new PlayerError('INVALID_ARGUMENT','Invalid preparation byte range');
        if(reads>=4096||length>maxBytes-bytes)throw new PlayerError('UNSUPPORTED_FEATURE','Remote preparation read budget exceeded');
        reads++;bytes+=length;
      }catch(error){return Promise.reject(error);}
      const work=queue.then(async()=>{
        try{
        check();const result=new Uint8Array(length);
        for(let n=0;n<length;){
          check();const value:Uint8Array=await reader.read(BigInt(at+n),length-n);check();
          if(!(value instanceof Uint8Array)||!value.length||value.length>length-n)throw new PlayerError('SOURCE_CHANGED','Incomplete remote preparation range');
          result.set(value,n);n+=value.length;
        }
        return result;
        }catch(error){close();if(signal.aborted)throw signal.reason;throw error;}
      });
      queue=work.then(()=>{},()=>{});return work;
    },
    close(){close();signal.removeEventListener('abort',close);},
  };
}
