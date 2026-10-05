// SPDX-License-Identifier: Apache-2.0
import {PreviewPregenerator,type AdaptivePregeneration,type CustomPregeneration} from './pregeneration.js';
import {observePreviewInteraction,snapshotPreviewInteraction} from '../internal/machine/preview-interaction.js';
import {resolvePreviewStrategy} from './strategies.js';
import {createPreviewControl,transitionPreviewControl,previewJob,previewGenerationAdmission,previewProviderDeferred,previewCanPrefetch,admitPreviewRequest,planPreviewRequest,createPreviewJob,startPreviewJob,lookupPreviewCache,rememberPreviewCache,unloadPreviewCache,type PreviewControlState,type PreviewControlEvent} from '../internal/machine/preview.js';
import type {PreviewStrategy,PreviewPregeneration} from '../types.js';
import type {PreviewOptions} from '../types.js';
export type {PreviewOptions} from '../types.js';
/** maxDistance permits nearby cached samples; cacheOnly never starts or cancels decoder work. */
export type PreviewRequest = {time:number;width?:number;height?:number;signal?:AbortSignal;exact?:boolean;maxDistance?:number;cacheOnly?:boolean};
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
  /** Creates or seeks an independent decoder; yield this work to playback. */
  readonly requiresDecoder?:boolean;
  /** Bounded independent native decoding may run alongside playback. */
  readonly allowDuringPlayback?:boolean;
  canHandle(request:PreviewContext):boolean|Promise<boolean>;
  getFrame(request:PreviewContext):Promise<PreviewResult|null>;
}
class PreviewDeferred extends Error {}
const aborted=()=>new DOMException('Preview superseded or cancelled','AbortError');
const now=()=>performance.now();
const emptyMetrics=():PreviewMetrics=>({providerSelectionMs:0,cacheLookupMs:0,totalMs:0,indexLookupMs:null,byteAcquisitionMs:null,decoderInitializationMs:null,frameDecodeMs:null,resizeConversionMs:null,decodedFrames:null,bytesRead:null,bytesFetched:null});
type Job={id:number;context:PreviewContext;controller:AbortController;timer?:ReturnType<typeof setTimeout>};
type Caller={job:Job;request:PreviewRequest;start:number;cacheMs:number;onUpdate?:(frame:PreviewFrame)=>void;resolve:(frame:PreviewFrame|null)=>void;reject:(error:unknown)=>void;cleanup:()=>void};
/** Owns provider resources, timers and caller callbacks. The immutable preview
 * authority contains only data and cannot issue playback or source effects. */
export class PreviewController {
  private providers:PreviewProvider[]=[];
  private cleanups=new Set<Promise<void>>();
  private destruction?:Promise<void>;
  private pregenerator?:PreviewPregenerator;
  private customStrategy?:Extract<PreviewStrategy,{type:'custom'}>;
  private images=new Map<string,PreviewResult>();
  private jobs=new Map<number,Job>();
  private callers=new Map<number,Caller>();
  private state:PreviewControlState;
  constructor(providers:readonly PreviewProvider[]=[],options:PreviewOptions={}){
    const {pregenerate,strategy,...settings}=options;
    if(pregenerate!==undefined&&strategy!==undefined)throw new TypeError('Choose preview strategy or pregenerate, not both');
    this.state=createPreviewControl(settings);this.setProviders(providers);
    if(strategy!==undefined)this.setStrategy(strategy);
    else if(pregenerate!==undefined){this.pregenerator=this.generator(pregenerate);this.pregenerator.setEnabled(this.state.allowed);}
    else this.dispatch({kind:'strategy',value:{type:'on-demand'}});
  }
  private dispatch(event:PreviewControlEvent){this.state=transitionPreviewControl(this.state,event);}
  private get active(){return this.state.active?this.jobs.get(this.state.active.id):undefined;}
  private get pending(){return this.state.pending?this.jobs.get(this.state.pending.id):undefined;}
  private get caller(){return this.state.caller?this.callers.get(this.state.caller.id):undefined;}
  private get options(){return this.state.options;}
  private get sourceId(){return this.state.sourceId;}
  private metadata(job:Job){return previewJob(this.state,job.id)!;}
  private generator(config:PreviewPregeneration|AdaptivePregeneration|CustomPregeneration,sample?:import('../types.js').PreviewSampler){
    return new PreviewPregenerator(config,this.options.bucketSeconds,async request=>{
      const admission=previewGenerationAdmission(this.state,now());if(admission!=='run')return admission;
      try{await this.requestWork(request,true);return 'next';}catch(error){return error instanceof PreviewDeferred||this.state.suspended||now()-this.state.lastForeground<500?'wait':'next';}
    },sample?(duration)=>{
      const at=now();
      if(previewGenerationAdmission(this.state,at)!=='run')return [];
      const {maxEntries,maxCacheBytes,bucketSeconds}=this.options;
      const largest=Math.max(1,...this.state.cache.map(entry=>entry.bytes));
      const capacity=Math.min(maxEntries,Math.floor(maxCacheBytes/largest));
      const cachedTimestamps=Object.freeze(this.state.cache.filter(entry=>{const key=JSON.parse(entry.key);return key[3]===240&&key[4]===135&&!key[5];}).map(entry=>JSON.parse(entry.key)[2] as number));
      const tracked=this.state.interaction;
      const current=tracked.source==='hover'&&at>=this.state.hoverUntil?observePreviewInteraction(tracked,'playback',this.state.playbackPosition,this.state.hoverUntil,bucketSeconds):tracked;
      const focus=current.focus,interaction=snapshotPreviewInteraction(current,at);
      const context=Object.freeze({duration,focus,interaction,bucketSeconds,cachedTimestamps,budget:Object.freeze({maxEntries:this.state.strategy?.type==='demuxe'?capacity:maxEntries,maxBytes:maxCacheBytes,usedEntries:this.state.cache.length,usedBytes:this.state.bytes,availableEntries:Math.max(0,maxEntries-this.state.cache.length),availableBytes:Math.max(0,maxCacheBytes-this.state.bytes)})});
      const times=sample(context);
      if(times&&typeof (times as unknown as PromiseLike<unknown>).then==='function'){void Promise.resolve(times).catch(()=>{});return [];}
      if(!Array.isArray(times)||times.length>256||Array.from(times).some(time=>!Number.isFinite(time)||time<0||time>=duration))return [];
      const bucket=(time:number)=>bucketSeconds?Math.floor(time/bucketSeconds)*bucketSeconds:time;
      const resident=new Set(cachedTimestamps),unique=new Map<number,number>();
      for(const time of times){const key=bucket(time);if(!unique.has(key))unique.set(key,time);}
      // Bound the working set using observed frame size as well as the entry limit.
      return [...unique].slice(0,capacity).filter(([key])=>!resident.has(key)).map(([,time])=>time);
    }:undefined);
  }
  get strategy():PreviewStrategy|null{return this.state.strategy?.type==='custom'?this.customStrategy??null:this.state.strategy;}
  /** Switch scheduling without changing playback or discarding useful cached images. */
  setStrategy(value:PreviewStrategy){
    if(this.state.disposed)throw aborted();
    const resolved=resolvePreviewStrategy(value),next=resolved.generation?this.generator(resolved.generation,resolved.sample):undefined;
    this.pregenerator?.stop();
    for(const job of [this.active,this.pending])if(job&&this.metadata(job)?.background){if(this.caller?.job===job)this.settle(aborted());this.cancelJob(job);}
    this.dispatch({kind:'strategy',value:resolved.strategy.type==='custom'?{type:'custom'}:resolved.strategy});this.customStrategy=resolved.strategy.type==='custom'?resolved.strategy:undefined;this.pregenerator=next;
    next?.setEnabled(this.state.allowed);next?.setFocus(this.state.interaction.focus);next?.setDuration(this.state.duration);
  }
  get enabled(){return this.state.allowed;}
  set enabled(value:boolean){this.dispatch({kind:'enabled',value});this.pregenerator?.setEnabled(value);if(!value)this.clear();}
  get diagnostics(){return {...this.state.counters,sourceId:this.sourceId,cacheBytes:this.state.bytes,cacheEntries:this.state.cache.length,active:!!this.state.active,pending:!!this.state.pending,lastFailure:this.state.lastFailure?{...this.state.lastFailure}:undefined};}
  setSourceIdentity(id:string){this.clear();this.dispatch({kind:'source',sourceId:id});this.setDuration(null);}
  /** Finite VOD duration admits configured source-scoped background generation. */
  setDuration(duration:number|null){this.dispatch({kind:'duration',duration});this.pregenerator?.setDuration(this.state.duration);}
  setPlaybackPosition(time:number){
    if(!Number.isFinite(time)||time<0)return;
    const at=now();this.dispatch({kind:'position',time});
    if(at>=this.state.hoverUntil){this.dispatch({kind:'focus',source:'playback',time,at});this.pregenerator?.setFocus(time,this.state.cache.map(entry=>JSON.parse(entry.key)[2] as number));}
  }
  setProviders(providers:readonly PreviewProvider[]){this.clear();this.dispatch({kind:'providers'});this.providers=[...providers].sort((a,b)=>a.priority-b.priority);}
  addProvider(provider:PreviewProvider):()=>void {this.setProviders([...this.providers,provider]);let removed=false;return ()=>{if(!removed){removed=true;this.setProviders(this.providers.filter(p=>p!==provider));}};}
  private cancelJob(job:Job){
    const active=this.state.active?.id===job.id;
    this.dispatch({kind:'cancel-job',id:job.id});if(!active)this.jobs.delete(job.id);
    try{clearTimeout(job.timer);}finally{job.controller.abort();}
  }
  private settle(error?:unknown,frame:PreviewFrame|null=null){
    const caller=this.caller,id=this.state.caller?.id;if(!caller||id===undefined)return;
    this.dispatch({kind:'settle',failed:!!error});this.callers.delete(id);
    try{caller.cleanup();}catch(failure){if(error===undefined)error=failure;}
    if(error!==undefined)caller.reject(error);else caller.resolve(frame);
  }
  private cancelWork(){
    this.dispatch({kind:'retire-work'});
    const active=this.active,pending=this.pending,errors:unknown[]=[];
    try{for(const release of [()=>this.settle(aborted()),()=>{if(active)this.cancelJob(active);},()=>{if(pending)this.cancelJob(pending);}])try{release();}catch(error){errors.push(error);}}
    finally{this.dispatch({kind:'retired-work'});}
    if(errors.length)throw errors.length===1?errors[0]:new AggregateError(errors,'Preview cancellation failed');
  }
  /** Playback pressure cancels generation, but resident thumbnails remain usable. */
  setSuspended(value:boolean){this.dispatch({kind:'suspended',value});if(value)this.cancelWork();}
  /** Suppress expensive decoder providers while allowing independent native previews. */
  setPlaybackActive(value:boolean){
    this.dispatch({kind:'playback',value});
    if(value&&this.state.active?.requiresDecoder){
      const job=this.active!;if(this.caller?.job===job)this.settle(this.state.active.background?new PreviewDeferred():aborted());
      this.cancelJob(job);
    }
  }
  private trackCleanup(completion:Promise<void>){
    const settled=completion.catch(()=>{});this.cleanups.add(settled);
    void settled.then(()=>this.cleanups.delete(settled));
  }
  /** Await registered resource teardown, not arbitrary provider result promises. */
  async drain():Promise<void>{await Promise.all([...this.cleanups]);}
  /** Current cache budgets; changing these never starts decoder work. */
  get cacheLimits(){return Object.freeze({maxEntries:this.options.maxEntries,maxCacheBytes:this.options.maxCacheBytes});}
  setCacheLimits(limits:{maxEntries?:number;maxCacheBytes?:number}){
    if(this.state.disposed)throw aborted();
    const maxEntries=limits.maxEntries??this.options.maxEntries,maxCacheBytes=limits.maxCacheBytes??this.options.maxCacheBytes;
    const wasDisabled=!this.options.maxEntries||!this.options.maxCacheBytes;
    this.dispatch({kind:'limits',maxEntries,maxCacheBytes});this.releaseEvictedImages();
    if(wasDisabled&&maxEntries&&maxCacheBytes)this.pregenerator?.reset();
  }
  /** Remove a half-open range of requested buckets, across sizes and exactness. */
  unload(range:{start:number;end:number}):number{
    if(this.state.disposed)throw aborted();
    const next=unloadPreviewCache(this.state,range.start,range.end);this.state=next.state;this.releaseEvictedImages();
    for(const id of next.jobs){const job=this.jobs.get(id);if(job){if(this.caller?.job===job)this.settle(aborted());this.cancelJob(job);}}
    return next.removed;
  }
  private releaseEvictedImages(){const retained=new Set(this.state.cache.map(entry=>entry.key));for(const key of this.images.keys())if(!retained.has(key))this.images.delete(key);}
  clear(){this.cancelWork();this.dispatch({kind:'clear-cache'});this.images.clear();this.pregenerator?.reset();}
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    let resolve!:()=>void,reject!:(error:unknown)=>void;this.destruction=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    this.dispatch({kind:'dispose'});const errors:unknown[]=[];
    for(const release of [()=>this.clear(),()=>this.pregenerator?.stop()])try{release();}catch(error){errors.push(error);}
    this.providers=[];this.pregenerator=undefined;this.customStrategy=undefined;this.images.clear();this.dispatch({kind:'clear-cache'});
    void this.drain().then(()=>{if(errors.length)reject(errors.length===1?errors[0]:new AggregateError(errors,'Preview cleanup failed'));else resolve();},reject);return this.destruction;
  }
  /** Explicit optional prefetch. Busy lanes decline; a hover always supersedes it. */
  async prefetch(request:PreviewRequest):Promise<void>{if(!previewCanPrefetch(this.state))return;try{await this.requestWork(request,true);}catch{}}
  getFrame(request:PreviewRequest):Promise<PreviewFrame|null>{return this.request(request);}
  /** Optional refinement delivery; getFrame remains a single-final-result API. */
  request(request:PreviewRequest & {onUpdate?:(frame:PreviewFrame)=>void}):Promise<PreviewFrame|null>{
    if(!request.cacheOnly)this.dispatch({kind:'foreground',at:now()});
    if(!request.signal?.aborted&&Number.isFinite(request.time)&&request.time>=0){const at=now();this.dispatch({kind:'hover',at});this.dispatch({kind:'focus',source:'hover',time:request.time,at});this.pregenerator?.setFocus(request.time,this.state.cache.map(entry=>JSON.parse(entry.key)[2] as number));}
    return this.requestWork(request);
  }
  private requestWork(request:PreviewRequest & {onUpdate?:(frame:PreviewFrame)=>void},background=false):Promise<PreviewFrame|null>{
    const entryEpoch=this.state.requestEpoch;
    const data={time:request.time,width:request.width,height:request.height,exact:request.exact,maxDistance:request.maxDistance,cacheOnly:request.cacheOnly};
    const capturedSignal=request.signal,onUpdate=request.onUpdate;
    if(entryEpoch!==this.state.requestEpoch)return Promise.reject(aborted());
    request={...data,signal:capturedSignal,onUpdate};
    const admission=admitPreviewRequest(this.state,data,!!request.signal?.aborted);
    if(admission.kind==='aborted')return Promise.reject(aborted());
    if(admission.kind==='disabled')return Promise.resolve(null);
    if(admission.kind==='invalid')return Promise.reject(new RangeError(admission.message));
    const start=now(),{time,width,height,key}=admission;
    this.dispatch({kind:'request-count',cacheOnly:!!request.cacheOnly});const requestEpoch=this.state.requestEpoch;
    if(!request.cacheOnly)this.settle(aborted());
    const plan=planPreviewRequest(this.state,key,!!request.cacheOnly,background);this.state=plan.state;
    let job=plan.jobId===null?undefined:this.jobs.get(plan.jobId);
    for(const id of plan.cancel){const previous=this.jobs.get(id);if(previous)this.cancelJob(previous);}
    // A provider's abort handler may synchronously request a newer frame or
    // retire this source. Do not replace its caller or orphan its pending job.
    if(this.state.requestEpoch!==requestEpoch||this.state.disposed)return Promise.reject(aborted());
    const lookup=now(),cached=lookupPreviewCache(this.state,data,admission,background);this.state=cached.state;
    const cacheMs=now()-lookup;
    if(cached.key!==null){const frame=this.frame(this.images.get(cached.key)!,request,JSON.parse(cached.key)[2],'hit',start,cacheMs,0);this.notify(request.onUpdate,frame);return Promise.resolve(frame);}
    if(request.cacheOnly||this.state.suspended)return Promise.resolve(null);
    if(!job){
      this.state=createPreviewJob(this.state,admission,background);const id=this.state.pending!.id;
      let controller:AbortController|undefined,created:Job|undefined;
      const current=()=>this.state.requestEpoch===requestEpoch&&!this.state.disposed&&this.state.pending?.id===id;
      try{
        controller=new AbortController();if(!current())throw aborted();
        const signal=controller.signal;if(!current())throw aborted();
        created={id,controller,context:{time,width,height,signal,exact:!!request.exact,sourceId:this.sourceId,publish:result=>this.publish(created!,result),trackCleanup:completion=>this.trackCleanup(completion)}};
        job=created;this.jobs.set(id,created);
        // Queue execution after caller publication even for a synchronous timer adapter.
        const handle=setTimeout(()=>{this.dispatch({kind:'ready',id});void Promise.resolve().then(()=>this.pump());},this.options.debounceMs);
        if(!current()){clearTimeout(handle);throw aborted();}created.timer=handle;
      }catch(error){
        this.dispatch({kind:'cancel-job',id});this.jobs.delete(id);
        try{if(created)clearTimeout(created.timer);}catch{}try{controller?.abort();}catch{}
        return Promise.reject(error);
      }
    }
    const selected=job;
    return new Promise((resolve,reject)=>{
      let timeout:ReturnType<typeof setTimeout>|undefined,attached=false;
      const signal=request.signal;
      this.dispatch({kind:'caller',jobId:selected.id});const callerId=this.state.caller?.id;
      if(callerId===undefined||this.state.caller?.jobId!==selected.id){reject(aborted());return;}
      const current=()=>this.state.caller?.id===callerId&&this.caller?.job===selected;
      const cancel=()=>{if(current()){this.settle(aborted());this.cancelJob(selected);}};
      const cleanup=()=>{
        let failed=false,failure:unknown;
        try{clearTimeout(timeout);}catch(error){failed=true;failure=error;}
        try{if(attached){attached=false;signal?.removeEventListener('abort',cancel);}}catch(error){if(!failed){failed=true;failure=error;}}
        if(failed)throw failure;
      };
      this.callers.set(callerId,{job:selected,request,start,cacheMs,onUpdate:request.onUpdate,resolve,reject,cleanup});
      try{
        if(signal?.aborted){cancel();return;}
        const acquired=setTimeout(cancel,this.options.timeoutMs);
        if(!current()){clearTimeout(acquired);return;}timeout=acquired;
        if(signal?.aborted){cancel();return;}
        if(signal){attached=true;try{signal.addEventListener('abort',cancel,{once:true});}finally{if(!current())signal.removeEventListener('abort',cancel);}}
        if(signal?.aborted)cancel();
      }catch(error){if(current()){this.settle(error);try{this.cancelJob(selected);}catch{}}}
    });
  }

  private pump(){
    const previous=this.state;this.state=startPreviewJob(this.state);if(this.state===previous)return;
    const job=this.active!;
    void this.run(job).finally(()=>{this.dispatch({kind:'finish-job',id:job.id});this.jobs.delete(job.id);this.pump();});
  }
  private async run(job:Job){
    let deferred=false;
    try{
      const scheduler=(globalThis as typeof globalThis & {scheduler?:{postTask(task:()=>void,options:{priority:'background';signal:AbortSignal}):Promise<void>}}).scheduler;
      if(scheduler)await scheduler.postTask(()=>{}, {priority:'background',signal:job.controller.signal});
      for(const provider of this.providers){
        job.context.signal.throwIfAborted();
        if(previewProviderDeferred(this.state,provider.requiresDecoder,provider.allowDuringPlayback)){deferred=true;continue;}
        this.dispatch({kind:'provider',id:job.id,requiresDecoder:provider.requiresDecoder&&!provider.allowDuringPlayback});
        try{
          const start=now();let supported:boolean;
          try{supported=await provider.canHandle(job.context);}finally{this.dispatch({kind:'selection',id:job.id,milliseconds:now()-start});}
          job.context.signal.throwIfAborted();if(!supported)continue;
          if(previewProviderDeferred(this.state,provider.requiresDecoder,provider.allowDuringPlayback)){deferred=true;continue;}
          const raw=await provider.getFrame(job.context);job.context.signal.throwIfAborted();
          const result=this.validate(raw);job.context.signal.throwIfAborted();if(!result||(job.context.exact&&(result.temporalAccuracy!=='exact'||result.actualTime!==job.context.time)))continue;
          this.remember(this.metadata(job).key,result,this.metadata(job).background);
          if(this.caller?.job===job){const c=this.caller,frame=this.frame(result,c.request,job.context.time,'miss',c.start,c.cacheMs,this.metadata(job).selectionMs);this.notify(c.onUpdate,frame);if(this.caller===c)this.settle(undefined,frame);}
          return;
        }catch(error){job.context.signal.throwIfAborted();this.dispatch({kind:'failure',provider:provider.id,errorKind:error instanceof Error?error.name:'Error'});}
      }
      if(this.caller?.job===job)this.settle(this.metadata(job).background&&deferred?new PreviewDeferred():undefined);
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
    const result=this.validate(raw);if(!result||job.controller.signal.aborted||this.caller?.job!==job)return;
    const c=this.caller;this.notify(c.onUpdate,this.frame(result,c.request,job.context.time,'miss',c.start,c.cacheMs,this.metadata(job).selectionMs));
  }
  private notify(callback:((frame:PreviewFrame)=>void)|undefined,frame:PreviewFrame){try{callback?.(frame);}catch{/* UI callbacks cannot fail a provider or playback. */}}
  private frame(result:PreviewResult,request:PreviewRequest,time:number,cache:'hit'|'miss',start:number,cacheMs:number,selectionMs:number):PreviewFrame{
    const actualTime=result.actualTime??(result.timestampKind==='exact'||result.timestampKind==='interval'?result.time:null);
    return {...result,sourceId:this.sourceId,actualTime,temporalAccuracy:actualTime===request.time&&result.temporalAccuracy==='exact'?'exact':'approximate',fidelity:result.fidelity??'full',requestedTime:request.time,bucketTime:time,cache,
      metrics:{...emptyMetrics(),...(cache==='miss'?result.metrics:{}),providerSelectionMs:selectionMs,cacheLookupMs:cacheMs,totalMs:now()-start}};
  }
  private remember(key:string,result:PreviewResult,background=false){
    const bytes=result.width*result.height*4+result.path.length*2+key.length*2+256+('blob' in result.image?result.image.blob.size:JSON.stringify(result.image).length*2);
    this.state=rememberPreviewCache(this.state,{key,time:result.time,bytes,background});
    if(this.state.cache.some(entry=>entry.key===key))this.images.set(key,result);
    this.releaseEvictedImages();
  }
}
