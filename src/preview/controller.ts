// SPDX-License-Identifier: GPL-3.0-or-later
import {PreviewPregenerator} from './pregeneration.js';
import type {PreviewOptions} from '../types.js';
export type {PreviewOptions} from '../types.js';
export type PreviewRequest = {time:number;width?:number;height?:number;signal?:AbortSignal;exact?:boolean};
export type PreviewImage = {blob:Blob} | {uris:readonly string[];crop:{x:number;y:number;width:number;height:number};startByte?:number;endByte?:number};
export type PreviewMetrics = {
  providerSelectionMs:number;cacheLookupMs:number;totalMs:number;
  indexLookupMs:number|null;byteAcquisitionMs:number|null;decoderInitializationMs:number|null;
  frameDecodeMs:number|null;resizeConversionMs:number|null;decodedFrames:number|null;
  bytesRead:number|null;bytesFetched:number|null;mediaReadyMs?:number;seekMs?:number;
};
/** time is the provider's best display-time estimate; actualTime is null when the
 * decoder cannot expose a represented PTS. Spatial fidelity is independent of time. */
export type PreviewResult = {time:number;actualTime?:number|null;width:number;height:number;image:PreviewImage;path:string;
  temporalAccuracy?:'exact'|'approximate';fidelity?:'full'|'reduced';timestampKind?:'exact'|'media-time'|'interval';metrics?:Partial<PreviewMetrics>};
export type PreviewFrame = PreviewResult & {sourceId:string;actualTime:number|null;temporalAccuracy:'exact'|'approximate';fidelity:'full'|'reduced';requestedTime:number;bucketTime:number;cache:'hit'|'miss';metrics:PreviewMetrics};
export type PreviewContext = {time:number;width:number;height?:number;signal:AbortSignal;exact:boolean;sourceId:string;publish:(frame:PreviewResult)=>void;trackCleanup?:(completion:Promise<void>)=>void};
export interface PreviewProvider {
  readonly id:string;readonly priority:number;
  canHandle(request:PreviewContext):boolean|Promise<boolean>;
  getFrame(request:PreviewContext):Promise<PreviewResult|null>;
}
const aborted=()=>new DOMException('Preview superseded or cancelled','AbortError');
const now=()=>performance.now();
const emptyMetrics=():PreviewMetrics=>({providerSelectionMs:0,cacheLookupMs:0,totalMs:0,indexLookupMs:null,byteAcquisitionMs:null,decoderInitializationMs:null,frameDecodeMs:null,resizeConversionMs:null,decodedFrames:null,bytesRead:null,bytesFetched:null});
type Job={background:boolean;key:string;context:PreviewContext;controller:AbortController;timer:ReturnType<typeof setTimeout>;ready:boolean;selectionMs:number};
type Caller={job:Job;request:PreviewRequest;start:number;cacheMs:number;onUpdate?:(frame:PreviewFrame)=>void;resolve:(frame:PreviewFrame|null)=>void;reject:(error:unknown)=>void;cleanup:()=>void};
/** One active provider, one pending job and one caller. Cancelled requests attach
 * no retained promise reactions to an uncooperative provider. */
export class PreviewController {
  private providers:PreviewProvider[]=[];
  private cleanups=new Set<Promise<void>>();
  private destruction?:Promise<void>;
  private suspended=false;
  private allowed=true;
  private pregenerator?:PreviewPregenerator;
  private lastForeground=-Infinity;
  private cache=new Map<string,{result:PreviewResult;bytes:number;background:boolean}>();
  private bytes=0;private sourceId='initial';private revision=0;
  private active?:Job;private pending?:Job;private caller?:Caller;private disposed=false;
  private counters={requests:0,hits:0,failures:0,cancelled:0};
  private lastFailure?:{provider:string;kind:string};
  private readonly options:Required<Omit<PreviewOptions,'pregenerate'>>;
  constructor(providers:readonly PreviewProvider[]=[],options:PreviewOptions={}){
    const {pregenerate,...settings}=options;
    this.options={enabled:true,bucketSeconds:1,debounceMs:50,width:160,maxCacheBytes:4*1024*1024,maxEntries:48,timeoutMs:10000,...settings};
    for(const [key,value] of Object.entries(this.options))if(key!=='enabled'&&(!Number.isFinite(value)||Number(value)<0))throw new RangeError(`Invalid preview ${key}`);
    if(this.options.width<1||this.options.width>2048||!Number.isInteger(this.options.width)||this.options.timeoutMs<1||this.options.timeoutMs>2147483647||this.options.debounceMs>2147483647||!Number.isInteger(this.options.maxEntries))throw new RangeError('Invalid preview limits');
    if(typeof this.options.enabled!=='boolean')throw new TypeError('Invalid preview enabled option');
    this.allowed=this.options.enabled;this.setProviders(providers);
    if(pregenerate!==undefined){
      this.pregenerator=new PreviewPregenerator(pregenerate,this.options.bucketSeconds,async request=>{
        if(this.disposed)return 'stop';
        if(!this.allowed||this.suspended||this.active||this.pending||this.caller||now()-this.lastForeground<500)return 'wait';
        if(!this.options.maxCacheBytes||!this.options.maxEntries)return 'stop';
        try{await this.requestWork(request,true);return 'next';}catch{return this.suspended||now()-this.lastForeground<500?'wait':'next';}
      });this.pregenerator.setEnabled(this.allowed);
    }
  }
  get enabled(){return this.allowed;}
  set enabled(value:boolean){
    if(typeof value!=='boolean')throw new TypeError('Preview enabled must be boolean');
    this.allowed=value;this.pregenerator?.setEnabled(value);if(!value)this.clear();
  }
  get diagnostics(){return {...this.counters,sourceId:this.sourceId,cacheBytes:this.bytes,cacheEntries:this.cache.size,active:!!this.active,pending:!!this.pending,lastFailure:this.lastFailure?{...this.lastFailure}:undefined};}
  setSourceIdentity(id:string){this.clear();this.sourceId=id;this.pregenerator?.setDuration(null);}
  /** Finite VOD duration admits configured source-scoped background generation. */
  setDuration(duration:number|null){this.pregenerator?.setDuration(duration);}
  setProviders(providers:readonly PreviewProvider[]){this.clear();this.revision++;this.providers=[...providers].sort((a,b)=>a.priority-b.priority);}
  addProvider(provider:PreviewProvider):()=>void {this.setProviders([...this.providers,provider]);let removed=false;return ()=>{if(!removed){removed=true;this.setProviders(this.providers.filter(p=>p!==provider));}};}
  private cancelJob(job:Job){clearTimeout(job.timer);job.controller.abort();if(this.pending===job)this.pending=undefined;}
  private settle(error?:unknown,frame:PreviewFrame|null=null){const caller=this.caller;if(!caller)return;this.caller=undefined;caller.cleanup();if(error){this.counters.cancelled++;caller.reject(error);}else caller.resolve(frame);}
  private cancelWork(){this.settle(aborted());if(this.active)this.cancelJob(this.active);if(this.pending)this.cancelJob(this.pending);}
  /** Playback pressure cancels generation, but resident thumbnails remain usable. */
  setSuspended(value:boolean){this.suspended=value;if(value)this.cancelWork();}
  private trackCleanup(completion:Promise<void>){
    const settled=completion.catch(()=>{});this.cleanups.add(settled);
    void settled.then(()=>this.cleanups.delete(settled));
  }
  /** Await registered resource teardown, not arbitrary provider result promises. */
  async drain():Promise<void>{await Promise.all([...this.cleanups]);}
  clear(){this.cancelWork();this.cache.clear();this.bytes=0;this.pregenerator?.reset();}
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    this.disposed=true;this.clear();this.pregenerator?.stop();this.providers=[];return this.destruction=this.drain();
  }
  /** Explicit optional prefetch. Busy lanes decline; a hover always supersedes it. */
  async prefetch(request:PreviewRequest):Promise<void>{if(this.active||this.pending||this.caller||this.disposed)return;try{await this.requestWork(request,true);}catch{}}
  getFrame(request:PreviewRequest):Promise<PreviewFrame|null>{return this.request(request);}
  /** Optional refinement delivery; getFrame remains a single-final-result API. */
  request(request:PreviewRequest & {onUpdate?:(frame:PreviewFrame)=>void}):Promise<PreviewFrame|null>{this.lastForeground=now();return this.requestWork(request);}
  private requestWork(request:PreviewRequest & {onUpdate?:(frame:PreviewFrame)=>void},background=false):Promise<PreviewFrame|null>{
    if(this.disposed||request.signal?.aborted)return Promise.reject(aborted());
    if(!this.allowed)return Promise.resolve(null);
    const width=request.width??this.options.width,height=request.height;
    if(!Number.isFinite(request.time)||request.time<0||!Number.isInteger(width)||width<1||width>2048||(height!==undefined&&(!Number.isInteger(height)||height<1||height>2048)))return Promise.reject(new RangeError('Invalid preview request'));
    const start=now(),bucket=request.exact?0:this.options.bucketSeconds;
    const time=bucket?Math.floor(request.time/bucket)*bucket:request.time;
    if(!Number.isFinite(time))return Promise.reject(new RangeError('Invalid preview bucket'));
    const key=JSON.stringify([this.sourceId,this.revision,time,width,height??null,!!request.exact]);
    this.counters.requests++;this.settle(aborted());
    let job=this.pending?.key===key?this.pending:this.active?.key===key&&!this.active.controller.signal.aborted?this.active:undefined;
    if(job&&!background)job.background=false;
    if(this.pending&&this.pending!==job)this.cancelJob(this.pending);
    if(this.active&&this.active!==job)this.cancelJob(this.active);
    const lookup=now(),cached=this.cache.get(key),cacheMs=now()-lookup;
    if(cached){if(!background)cached.background=false;this.counters.hits++;this.cache.delete(key);this.cache.set(key,cached);const frame=this.frame(cached.result,request,time,'hit',start,cacheMs,0);this.notify(request.onUpdate,frame);return Promise.resolve(frame);}
    if(this.suspended)return Promise.resolve(null);
    if(!job){
      const controller=new AbortController();
      job={background,key,controller,ready:false,selectionMs:0,timer:undefined!,context:{time,width,height,signal:controller.signal,exact:!!request.exact,sourceId:this.sourceId,publish:result=>this.publish(job!,result),trackCleanup:completion=>this.trackCleanup(completion)}};
      this.pending=job;
      const scheduled=job;
      job.timer=setTimeout(()=>{scheduled.ready=true;this.pump();},this.options.debounceMs);
    }
    const selected=job;
    return new Promise((resolve,reject)=>{
      const cancel=()=>{if(this.caller?.job===selected){this.settle(aborted());this.cancelJob(selected);}};
      const timeout=setTimeout(cancel,this.options.timeoutMs);
      const cleanup=()=>{clearTimeout(timeout);request.signal?.removeEventListener('abort',cancel);};
      this.caller={job:selected,request,start,cacheMs,onUpdate:request.onUpdate,resolve,reject,cleanup};
      request.signal?.addEventListener('abort',cancel,{once:true});
    });
  }
  private pump(){
    if(this.active||!this.pending?.ready)return;
    const job=this.active=this.pending;this.pending=undefined;
    void this.run(job).finally(()=>{if(this.active===job)this.active=undefined;this.pump();});
  }
  private async run(job:Job){
    try{
      const scheduler=(globalThis as typeof globalThis & {scheduler?:{postTask(task:()=>void,options:{priority:'background';signal:AbortSignal}):Promise<void>}}).scheduler;
      if(scheduler)await scheduler.postTask(()=>{}, {priority:'background',signal:job.controller.signal});
      for(const provider of this.providers){
        job.context.signal.throwIfAborted();
        try{
          const start=now();let supported:boolean;
          try{supported=await provider.canHandle(job.context);}finally{job.selectionMs+=now()-start;}
          job.context.signal.throwIfAborted();if(!supported)continue;
          const raw=await provider.getFrame(job.context);job.context.signal.throwIfAborted();
          const result=this.validate(raw);if(!result||(job.context.exact&&(result.temporalAccuracy!=='exact'||result.actualTime!==job.context.time)))continue;
          this.remember(job.key,result,job.background);
          if(this.caller?.job===job){const c=this.caller,frame=this.frame(result,c.request,job.context.time,'miss',c.start,c.cacheMs,job.selectionMs);this.notify(c.onUpdate,frame);if(this.caller===c)this.settle(undefined,frame);}
          return;
        }catch(error){job.context.signal.throwIfAborted();this.counters.failures++;this.lastFailure={provider:provider.id,kind:error instanceof Error?error.name:'Error'};}
      }
      if(this.caller?.job===job)this.settle();
    }catch{if(this.caller?.job===job)this.settle(aborted());}
  }
  private validate(result:PreviewResult|null):PreviewResult|null{
    try{
      if(!result||!Number.isFinite(result.time)||result.time<0||typeof result.path!=='string'||result.path.length>256||!Number.isInteger(result.width)||result.width<1||result.width>2048||!Number.isInteger(result.height)||result.height<1||result.height>2048)return null;
      if(result.actualTime!=null&&(!Number.isFinite(result.actualTime)||result.actualTime<0))return null;
      let image:PreviewImage;
      if('blob' in result.image){
        if(!(result.image.blob instanceof Blob)||result.image.blob.size>4*1024*1024)return null;
        image=Object.freeze({blob:result.image.blob});
      }else{
        const {uris,crop,startByte,endByte}=result.image;
        if(!Array.isArray(uris)||!uris.length||uris.length>16||uris.some(uri=>typeof uri!=='string'||uri.length>16384))return null;
        const {x,y,width,height}=crop;
        if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||x+width>16384||y+height>16384)return null;
        if([startByte,endByte].some(n=>n!==undefined&&(!Number.isSafeInteger(n)||n<0))||(endByte!==undefined&&endByte<(startByte??0)))return null;
        image=Object.freeze({uris:Object.freeze([...uris]),crop:Object.freeze({x,y,width,height}),startByte,endByte});
      }
      const metrics:Partial<PreviewMetrics>={};
      for(const key of [...Object.keys(emptyMetrics()),'mediaReadyMs','seekMs'] as Array<keyof PreviewMetrics>){const value=result.metrics?.[key];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)metrics[key]=value;}
      return Object.freeze({time:result.time,actualTime:result.actualTime,width:result.width,height:result.height,path:result.path,image,
        timestampKind:['exact','interval','media-time'].includes(result.timestampKind??'')?result.timestampKind:undefined,
        temporalAccuracy:result.temporalAccuracy==='exact'?'exact':'approximate',fidelity:result.fidelity==='reduced'?'reduced':'full',metrics:Object.freeze(metrics)});
    }catch{return null;}
  }
  private publish(job:Job,raw:PreviewResult){
    if(job.controller.signal.aborted||this.caller?.job!==job)return;
    const result=this.validate(raw);if(!result)return;
    const c=this.caller;this.notify(c.onUpdate,this.frame(result,c.request,job.context.time,'miss',c.start,c.cacheMs,job.selectionMs));
  }
  private notify(callback:((frame:PreviewFrame)=>void)|undefined,frame:PreviewFrame){try{callback?.(frame);}catch{/* UI callbacks cannot fail a provider or playback. */}}
  private frame(result:PreviewResult,request:PreviewRequest,time:number,cache:'hit'|'miss',start:number,cacheMs:number,selectionMs:number):PreviewFrame{
    const actualTime=result.actualTime??(result.timestampKind==='exact'||result.timestampKind==='interval'?result.time:null);
    return {...result,sourceId:this.sourceId,actualTime,temporalAccuracy:actualTime===request.time&&result.temporalAccuracy==='exact'?'exact':'approximate',fidelity:result.fidelity??'full',requestedTime:request.time,bucketTime:time,cache,
      metrics:{...emptyMetrics(),...(cache==='miss'?result.metrics:{}),providerSelectionMs:selectionMs,cacheLookupMs:cacheMs,totalMs:now()-start}};
  }
  private remember(key:string,result:PreviewResult,background=false){
    const bytes=result.width*result.height*4+result.path.length*2+key.length*2+256+('blob' in result.image?result.image.blob.size:JSON.stringify(result.image).length*2);
    if(bytes>this.options.maxCacheBytes||!this.options.maxEntries)return;
    while(this.cache.size&&(this.bytes+bytes>this.options.maxCacheBytes||this.cache.size>=this.options.maxEntries)){const oldest=background?[...this.cache].find(([,entry])=>entry.background)?.[0]:this.cache.keys().next().value;
      if(oldest===undefined)return;this.bytes-=this.cache.get(oldest)!.bytes;this.cache.delete(oldest);}
    this.cache.set(key,{result,bytes,background});this.bytes+=bytes;
  }
}
