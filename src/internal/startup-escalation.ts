// SPDX-License-Identifier: Apache-2.0
import {PlayerError} from './errors.js';
import type {StartupEscalationOptions} from '../types.js';

export function startupEscalationPolicy(options?:StartupEscalationOptions|false){
  if(options===false)return undefined;
  if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))throw new PlayerError('INVALID_ARGUMENT','startupEscalation must be false or an options object');
  const prefetchAfterMs=options?.prefetchAfterMs??400,switchAfterMs=options?.switchAfterMs??500;
  if(!Number.isFinite(prefetchAfterMs)||!Number.isFinite(switchAfterMs)||prefetchAfterMs<0||switchAfterMs<=prefetchAfterMs||switchAfterMs>=25000)throw new PlayerError('INVALID_ARGUMENT','startupEscalation requires 0 <= prefetchAfterMs < switchAfterMs < 25000');
  return Object.freeze({prefetchAfterMs,switchAfterMs});
}

/** Immutable fallback code only. No media, worker, decoder or audio allocation. */
export class StartupModules {
  private controller=new AbortController();
  private binaries=new Map<string,ArrayBuffer>();
  private pending=new Map<string,Promise<WebAssembly.Module>>();
  constructor(private base:URL){}
  ready(path:string){return this.pending.get(path);}
  async bytes(path:string){await this.pending.get(path)?.catch(()=>{});return this.binaries.get(path)?.slice(0);}
  warm(path:string):Promise<WebAssembly.Module>{
    const previous=this.pending.get(path);if(previous)return previous;
    const work=Promise.resolve().then(()=>this.load(path));this.pending.set(path,work);
    // Speculation must neither reject playback nor prevent an ordinary retry.
    void work.catch(()=>{if(this.pending.get(path)===work)this.pending.delete(path);});return work;
  }
  private async load(path:string){
    const controller=new AbortController(),abort=()=>controller.abort();
    this.controller.signal.addEventListener('abort',abort,{once:true});if(this.controller.signal.aborted)abort();
    const timer=setTimeout(abort,15000),limit=32*1024*1024;
    try{
      const response=await fetch(new URL(path,this.base),{signal:controller.signal,priority:'low'});
      if(!response.ok)throw new PlayerError('ASSET_LOAD_FAILED',`Startup prefetch HTTP ${response.status}: ${path}`);
      if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw Error('Startup prefetch exceeds byte budget');}
      const reader=response.body?.getReader();if(!reader)throw Error('Startup prefetch has no body');
      const chunks:Uint8Array[]=[];let bytes=0;
      try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw Error('Startup prefetch exceeds byte budget');}chunks.push(value);}}finally{reader.releaseLock();}
      const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      controller.signal.throwIfAborted();const module=await WebAssembly.compile(data);controller.signal.throwIfAborted();this.binaries.set(path,data.buffer);return module;
    }finally{clearTimeout(timer);this.controller.signal.removeEventListener('abort',abort);}
  }
  destroy(){this.controller.abort();this.pending.clear();this.binaries.clear();}
}
