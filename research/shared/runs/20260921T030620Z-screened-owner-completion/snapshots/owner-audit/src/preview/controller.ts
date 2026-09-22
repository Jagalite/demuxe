// SPDX-License-Identifier: GPL-3.0-or-later
export type PreviewRequest = {time:number; width?:number; height?:number; signal?:AbortSignal};
/** Immutable encoded image, or an authored image reference (possibly a sprite/byte range).
 * Consumers own their object URLs; the controller never invalidates a returned Blob. */
export type PreviewImage = {blob:Blob} | {uris:readonly string[]; crop:{x:number;y:number;width:number;height:number}; startByte?:number; endByte?:number};
export type PreviewResult = {time:number; width:number; height:number; image:PreviewImage; path:string; timestampKind?:'exact'|'media-time'|'interval'};
export type PreviewFrame = PreviewResult & {requestedTime:number; bucketTime:number; cache:'hit'|'miss'};
export type PreviewContext = {time:number;width:number;height?:number;signal:AbortSignal};
/** Providers own only preview resources. Null declines; errors fall through.
 * Implementations must honor cancellation and bound their transient allocations. */
export interface PreviewProvider {
  readonly id:string;
  readonly priority:number;
  canHandle(request:PreviewContext):boolean|Promise<boolean>;
  getFrame(request:PreviewContext):Promise<PreviewResult|null>;
}
import type {PreviewOptions} from '../types.js';
export type {PreviewOptions} from '../types.js';
const abortError=()=>new DOMException('Preview superseded or cancelled','AbortError');
export function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  if(signal.aborted)return Promise.reject(abortError());
  return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(abortError());};const cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});
}
export class PreviewController {
  private providers:PreviewProvider[]=[];
  private cache=new Map<string,{result:PreviewResult;bytes:number}>();
  private bytes=0;
  private caller?:AbortController;
  private job?:{key:string;controller:AbortController;promise:Promise<PreviewResult|null>};
  private running:Promise<unknown>=Promise.resolve();
  private disposed=false;
  private readonly options:Required<PreviewOptions>;
  constructor(providers:readonly PreviewProvider[]=[],options:PreviewOptions={}){
    this.options={bucketSeconds:1,debounceMs:50,width:160,maxCacheBytes:4*1024*1024,maxEntries:48,timeoutMs:10000,...options};
    for(const [key,value] of Object.entries(this.options))if(!Number.isFinite(value)||value<0)throw new RangeError(`Invalid preview ${key}`);
    if(this.options.width<1||this.options.width>2048||!Number.isInteger(this.options.width)||this.options.timeoutMs<1||!Number.isInteger(this.options.maxEntries))throw new RangeError('Invalid preview limits');
    this.setProviders(providers);
  }
  addProvider(provider:PreviewProvider):()=>void {
    this.setProviders([...this.providers,provider]);
    return ()=>this.setProviders(this.providers.filter(item=>item!==provider));
  }
  get diagnostics(){return {cacheBytes:this.bytes,cacheEntries:this.cache.size};}
  /** Replacing providers also invalidates their results; experimental providers are optional. */
  setProviders(providers:readonly PreviewProvider[]){this.clear();this.providers=[...providers].sort((a,b)=>a.priority-b.priority);}
  clear(){this.caller?.abort();this.job?.controller.abort();this.job=undefined;this.cache.clear();this.bytes=0;}
  destroy(){this.disposed=true;this.clear();this.providers=[];}
  async getFrame(request:PreviewRequest):Promise<PreviewFrame|null>{
    if(this.disposed||request.signal?.aborted)throw abortError();
    const width=request.width??this.options.width,height=request.height;
    if(!Number.isFinite(request.time)||request.time<0||!Number.isInteger(width)||width<1||width>2048||(height!==undefined&&(!Number.isInteger(height)||height<1||height>2048)))throw new RangeError('Invalid preview request');
    this.caller?.abort();const caller=this.caller=new AbortController();
    const cancel=()=>{caller.abort();if(this.caller===caller)this.job?.controller.abort();};
    request.signal?.addEventListener('abort',cancel,{once:true});
    const time=this.options.bucketSeconds?Math.floor(request.time/this.options.bucketSeconds)*this.options.bucketSeconds:request.time;
    const key=`${time}/${width}/${height??'auto'}`;
    try{
      if(this.job?.key!==key){this.job?.controller.abort();this.job=undefined;}
      const cached=this.cache.get(key);
      if(cached){this.cache.delete(key);this.cache.set(key,cached);return {...cached.result,requestedTime:request.time,bucketTime:time,cache:'hit'};}
      if(!this.job||this.job.controller.signal.aborted){
        const controller=new AbortController(),signal=controller.signal;
        const previous=this.running;
        const promise=(async()=>{
          await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(abortError());};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},this.options.debounceMs);signal.addEventListener('abort',abort,{once:true});});
          await abortable(previous,signal);signal.throwIfAborted();
          const scheduler=(globalThis as typeof globalThis & {scheduler?:{postTask(task:()=>void,options:{priority:'background';signal:AbortSignal}):Promise<void>}}).scheduler;
          if(scheduler)await scheduler.postTask(()=>{}, {priority:'background',signal});
          signal.throwIfAborted();
          const work=this.resolve({time,width,height,signal});
          this.running=work.catch(()=>{});
          const result=await work;signal.throwIfAborted();
          if(result)this.remember(key,result);
          return result;
        })();
        this.job={key,controller,promise};
        const timer=setTimeout(()=>controller.abort(),this.options.timeoutMs);
        void promise.finally(()=>{clearTimeout(timer);if(this.job?.promise===promise)this.job=undefined;}).catch(()=>{});
      }
      const job=this.job;
      const result=await abortable(abortable(job.promise,job.controller.signal),caller.signal);
      return result?{...result,requestedTime:request.time,bucketTime:time,cache:'miss'}:null;
    }finally{request.signal?.removeEventListener('abort',cancel);}
  }
  private async resolve(request:PreviewContext){
    for(const provider of this.providers){
      request.signal.throwIfAborted();
      try{
        if(!await provider.canHandle(request))continue;
        request.signal.throwIfAborted();
        const result=await provider.getFrame(request);
        request.signal.throwIfAborted();
        if(!result||typeof result.path!=='string'||!Number.isFinite(result.time)||result.time<0||
          !Number.isInteger(result.width)||result.width<1||result.width>2048||
          !Number.isInteger(result.height)||result.height<1||result.height>2048)continue;
        const image='blob' in result.image
          ? Object.freeze({blob:result.image.blob})
          : Object.freeze({...result.image,uris:Object.freeze([...result.image.uris]),crop:Object.freeze({...result.image.crop})});
        return Object.freeze({...result,image});
      }catch{request.signal.throwIfAborted();}
    }
    return null;
  }
  private remember(key:string,result:PreviewResult){
    const bytes=result.width*result.height*4+result.path.length*2+('blob' in result.image?result.image.blob.size:JSON.stringify(result.image).length*2);
    if(bytes>this.options.maxCacheBytes||!this.options.maxEntries)return;
    while(this.cache.size&&(this.bytes+bytes>this.options.maxCacheBytes||this.cache.size>=this.options.maxEntries)){const oldest=this.cache.keys().next().value!;this.bytes-=this.cache.get(oldest)!.bytes;this.cache.delete(oldest);}
    this.cache.set(key,{result,bytes});this.bytes+=bytes;
  }
}
