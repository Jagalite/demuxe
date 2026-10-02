// SPDX-License-Identifier: Apache-2.0
import {initialNativeSubtitleLifetime,changeNativeSubtitleTimeline,changeNativeSubtitlePresentation,acknowledgeNativeSubtitleClose,nativeSubtitleCurrent,startNativeSubtitleInitialization,finishNativeSubtitleInitialization,nativeSubtitleInitializationRemaining,admitNativeSubtitleRequest,settleNativeSubtitleRequest,nativeSubtitleRequestRemaining,closeNativeSubtitleLifetime,nativeSubtitleCloseRemaining,finishNativeSubtitleClose} from './machine/native-subtitle-lifetime.js';
import {subtitlePumpCurrent,subtitleTickAllowed,subtitleRenderCurrent,subtitleTimingStale,subtitleFollowFrame,subtitleRetryRender,subtitleDeadlineActive,subtitleDeadlineDue,subtitleLayout,type SubtitlePresentationChange} from './machine/native-subtitle-presentation.js';
import {subtitleTimelineCurrent,subtitleVerificationNeeded,subtitleVerificationSample,type SubtitleTimelineChange,type SubtitleTimelineKind,type NativeSubtitleTrack} from './machine/native-subtitle-timeline.js';
import {runtimeWorker} from './runtime-worker.js';
import type {FontAsset, RemoteSource, SubtitleAsset} from '../types.js';
import {PlayerError} from './errors.js';
import {BrowserCaptionUnsupported} from './plain-vtt.js';
/** One mpv owner for embedded and external subtitles on the accepted media timeline. */
export class NativeMpvSubtitles {
  private lifetime=initialNativeSubtitleLifetime();
  readonly canvas=document.createElement('canvas');
  private worker:Worker;
  private closed?:()=>void;
  private destruction?:Promise<void>;
  private pending=new Map<number,{epoch:number;resolve:(value:any)=>void;reject:(e:unknown)=>void;timer?:{handle?:ReturnType<typeof setTimeout>};detach:()=>void}>();
  private frame?:{epoch:number;id:number;handle?:ReturnType<typeof requestAnimationFrame>};
  private pumpTimer?:{epoch:number;id:number;handle?:ReturnType<typeof setInterval>};
  private get output(){return this.lifetime.presentation;}
  private change(input:SubtitlePresentationChange,epoch=this.lifetime.epoch){const result=changeNativeSubtitlePresentation(this.lifetime,epoch,input);this.lifetime=result.state;return result.accepted;}
  private get revision(){return this.output.revision;}
  private get schedulerMode(){return this.output.mode;}
  private get enabled(){return this.output.enabled;}
  private get changingTrack(){return this.output.changing;}
  private get stopped(){return this.lifetime.requests.phase!=='active';}
  private current(epoch:number){if(!nativeSubtitleCurrent(this.lifetime,epoch))throw Error('Subtitle renderer destroyed');}
  private timelineWork=new Map<number,{run:(epoch:number,id:number)=>Promise<unknown>;resolve:(value:any)=>void;reject:(error:unknown)=>void;detach?:()=>void}>();
  private get verifiedTrack(){return this.lifetime.timeline.verified??undefined;}
  private timeline(input:SubtitleTimelineChange,epoch=this.lifetime.epoch){const result=changeNativeSubtitleTimeline(this.lifetime,epoch,input);this.lifetime=result.state;return result;}
  private timelineCurrent(epoch:number,id:number){this.current(epoch);if(!subtitleTimelineCurrent(this.lifetime.timeline,id))throw Error('Subtitle timeline operation retired');}
  private loading=new AbortController();
  private cancelInitialization?:()=>void;
  private observer?:ResizeObserver;
  private handlers:Array<()=>void>=[];
  readonly ready:Promise<void>;
  get tracks(){return this.lifetime.timeline.tracks.map(track=>({...track}));}
  /** A newly created external-only overlay omits the embedded source catalog. */
  resetTracks(){const epoch=this.lifetime.epoch;this.current(epoch);if(!this.timeline({kind:'catalog.reset'},epoch).accepted)throw Error('Subtitle timeline is busy');}
  service:Record<string,unknown>={};
  get stats(){return {...this.output.stats};}
  constructor(private video:HTMLVideoElement,private time:()=>number,base:URL,fonts:FontAsset[],private source:File|RemoteSource,private failed:(e:Error)=>void,private defaultStreamIndex?:number,private runtime:'pthread'|'jspi'|'asyncify'='pthread'){
    const epoch=this.lifetime.epoch;
    if(this.runtime==='pthread'&&!crossOriginIsolated)throw Error('Native mpv subtitles requires cross-origin isolation');
    this.canvas.className='demuxe-native-ass';this.canvas.style.cssText='position:absolute;pointer-events:none;display:none';
    if(!video.parentElement)throw Error('Missing Native presentation container');
    // Worker construction can synchronously fail (CSP, URL or allocation).
    // Do not attach a canvas until its owner exists.
    this.worker=runtimeWorker(new URL('web/mpv-subtitle-worker.js',base),{type:'module'});
    const parent=video.parentElement,prior={position:parent.style.position,fit:video.style.objectFit,pip:video.disablePictureInPicture,remote:video.disableRemotePlayback};
    try {
    parent.style.position='relative';this.current(epoch);parent.append(this.canvas);this.current(epoch);
    video.style.objectFit='contain';this.current(epoch);
    video.disablePictureInPicture=true;this.current(epoch);video.disableRemotePlayback=true;this.current(epoch);
    this.current(epoch);
    this.worker.onmessage=({data})=>{
      if(data.type==='closed'){if(this.lifetime.requests.phase==='closing'){this.lifetime=acknowledgeNativeSubtitleClose(this.lifetime);this.service={...this.service,cleanup:data.cleanup,closeError:data.error};this.closed?.();}return;}
      if(!nativeSubtitleCurrent(this.lifetime,epoch)){data.bitmap?.close();return;}
      if(data.type==='refresh'){
        const source=this.source,refresh=source instanceof File?undefined:source.refreshAuthorization;
        void Promise.resolve().then(()=>{this.current(epoch);if(!refresh)throw Error('Authorization refresh unavailable');return refresh.call(source,data.resource);}).then(
          update=>{if(nativeSubtitleCurrent(this.lifetime,epoch))this.worker.postMessage({type:'refreshed',id:data.id,update});},
          error=>{if(nativeSubtitleCurrent(this.lifetime,epoch))this.worker.postMessage({type:'refreshed',id:data.id,error:String(error)});});return;
      }
      if(data.type==='subtitleTimingChanged'){this.change({kind:'timing',epoch:data.epoch},epoch);if(this.schedulerMode!=='fallback')void this.pump();return;}
      if(data.type==='subtitleDeadline'){const visibility={paused:this.video.paused,hidden:document.hidden};if(!nativeSubtitleCurrent(this.lifetime,epoch)||!subtitleDeadlineActive(this.output,data.epoch,visibility))return;const facts={...visibility,seconds:this.time(),target:data.target};if(!nativeSubtitleCurrent(this.lifetime,epoch))return;const action=subtitleDeadlineDue(this.output,data.epoch,facts);if(action==='invalidate')this.invalidate();else if(action==='pump')void this.pump();return;}
      const error=data.error?(/^Error: Subtitle (?:decoder unavailable|decode failed|packet deadline exceeded|source load failed|selection failed|seek failed)/.test(data.error)?new BrowserCaptionUnsupported(data.error):Error(data.error)):undefined;
      this.completeRequest(data.id,error===undefined,data,error);
    };
    this.current(epoch);
    this.worker.onerror=e=>{e.preventDefault();this.fail(Error(e.message||'Subtitle worker failed'));};
    this.current(epoch);
    this.worker.onmessageerror=()=>this.fail(Error('Subtitle worker message failure'));
    this.current(epoch);
    const observer=new ResizeObserver(()=>this.invalidate());if(!nativeSubtitleCurrent(this.lifetime,epoch)){observer.disconnect();this.current(epoch);}this.observer=observer;observer.observe(video);this.current(epoch);
    const listen=(target:EventTarget,type:string,listener:()=>void)=>{target.addEventListener(type,listener);if(!nativeSubtitleCurrent(this.lifetime,epoch)){target.removeEventListener(type,listener);this.current(epoch);}this.handlers.push(()=>target.removeEventListener(type,listener));};
    for(const event of ['seeked','seeking','pause','play','ratechange','loadedmetadata','ended']){
      const listener=()=>{this.syncPump();this.invalidate();};listen(video,event,listener);
    }
    const visibility=()=>{this.syncPump();this.invalidate();};
    listen(document,'visibilitychange',visibility);
    const fullscreen=()=>{if(document.fullscreenElement===video)this.fail(Error('Native mpv subtitles requires fullscreen on the player container, not the video element'));else this.invalidate();};
    listen(document,'fullscreenchange',fullscreen);
    this.ready=(async()=>{
      const cancelDeadline=this.initializationDeadline(epoch);
      try {
      const directory=this.runtime==='pthread'?'engine-subtitles':`engine-mpv-subtitles-${this.runtime}`;
      for(const name of ['service.mjs','service.wasm']){
        const asset=await fetch(new URL(`web/${directory}/${name}`,base),{method:'HEAD',signal:this.loading.signal});this.current(epoch);
        if(asset.status===404)throw new BrowserCaptionUnsupported('mpv subtitle runtime is not installed');
        if(!asset.ok)throw new PlayerError(asset.status===401||asset.status===403?'SOURCE_PERMISSION':'ASSET_LOAD_FAILED',`mpv subtitle asset check failed (${asset.status})`);
      }
      const response=await fetch(new URL('fixtures/DejaVuSans.ttf',base),{signal:this.loading.signal});this.current(epoch);
      if(!response.ok)throw Error('Subtitle default font unavailable');
      const bytes=await response.arrayBuffer();this.current(epoch);if(bytes.byteLength>8*1024*1024)throw Error('Subtitle font budget exceeded');
      if(this.stopped)throw Error('Subtitle renderer destroyed');
      const source=this.source;
      const transport=source instanceof File?{file:source}:(()=>{const {refreshAuthorization,...options}=source;return {options,canRefresh:!!refreshAuthorization};})();
      const result=await this.request('init',{...transport,runtime:this.runtime,fonts:[{name:'DejaVuSans.ttf',bytes},...fonts]});this.current(epoch);
      const tracks=(result.tracks as NativeSubtitleTrack[]).map(track=>({id:track.id,mpvId:track.mpvId,'ff-index':track['ff-index'],type:track.type,selected:track.selected,external:track.external,'attachment-id':track['attachment-id'],'external-index':track['external-index'],title:track.title,lang:track.lang,codec:track.codec}));
      const catalog=this.timeline({kind:'catalog',tracks,defaultStreamIndex:this.defaultStreamIndex},epoch);
      if(catalog.error==='default')throw new PlayerError('UNSUPPORTED_FEATURE','Inspected subtitle stream was not enumerated by mpv');this.current(epoch);
      } finally {this.lifetime=finishNativeSubtitleInitialization(this.lifetime,epoch);cancelDeadline();}
    })();
    this.ready.catch(()=>{});
    } catch(error) {
      void this.destroy().catch(()=>{});parent.style.position=prior.position;video.style.objectFit=prior.fit;
      video.disablePictureInPicture=prior.pip;video.disableRemotePlayback=prior.remote;
      throw error;
    }
  }
  private withTimeline<T>(kind:SubtitleTimelineKind,run:(epoch:number,id:number)=>Promise<T>,signal?:AbortSignal):Promise<T>{
    if(signal?.aborted)return Promise.reject(signal.reason);
    const epoch=this.lifetime.epoch,admission=this.timeline({kind:'admit',operation:kind},epoch);if(!admission.accepted)return Promise.reject(Error('Subtitle renderer destroyed'));
    const id=admission.id!;let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const done=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
    const work:{run:(epoch:number,id:number)=>Promise<unknown>;resolve:(value:any)=>void;reject:(error:unknown)=>void;detach?:()=>void}={run,resolve,reject};this.timelineWork.set(id,work);
    const cancel=()=>{if(!this.timeline({kind:'cancel',id},epoch).accepted)return;this.timelineWork.delete(id);try{work.detach?.();}catch{/* Caller cancellation keeps its original reason and releases the queue. */}reject(signal?.reason);this.drainTimeline(epoch);};
    if(signal){
      work.detach=()=>signal.removeEventListener('abort',cancel);
      try{signal.addEventListener('abort',cancel,{once:true});if(this.timelineWork.get(id)!==work){work.detach();return done;}if(signal.aborted)cancel();}
      catch(error){this.timeline({kind:'cancel',id},epoch);this.timelineWork.delete(id);try{work.detach();}catch{}reject(error);return done;}
    }
    this.drainTimeline(epoch);return done;
  }
  private drainTimeline(epoch=this.lifetime.epoch){
    const started=this.timeline({kind:'start'},epoch);if(!started.accepted)return;const id=started.id!,work=this.timelineWork.get(id);
    if(!work)return;
    void(async()=>{
      let value:unknown,failure:unknown,failed=false;
      try{this.timelineCurrent(epoch,id);value=await work.run(epoch,id);this.timelineCurrent(epoch,id);}catch(error){failed=true;failure=error;}
      this.timelineWork.delete(id);
      try{work.detach?.();}catch(error){if(!failed){failed=true;failure=error;}}
      if(this.timeline({kind:'finish',id},epoch).accepted){
        try{this.syncPump();this.invalidate();}catch(error){if(!failed){failed=true;failure=error;}}
        this.drainTimeline(epoch);
      }
      if(!nativeSubtitleCurrent(this.lifetime,epoch)&&!failed){failed=true;failure=Error('Subtitle renderer destroyed');}
      if(failed)work.reject(failure);else work.resolve(value);
    })();
  }
  async add(asset:SubtitleAsset){
    await this.ready;
    return this.withTimeline('add',async(epoch,id)=>{
      const attachmentId=asset.attachmentId,title=asset.label,language=asset.language,format=asset.format,select=asset.select;this.timelineCurrent(epoch,id);
      const result=await this.request('add',{asset});this.timelineCurrent(epoch,id);
      const addition=this.timeline({kind:'add',id,mpvId:result.mpvId,attachmentId,title,language,format},epoch),track=addition.track!;
      try{if(select)await this.selectTimeline(epoch,id,track.id);}
      catch(error){if(nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleTimelineCurrent(this.lifetime.timeline,id)){this.timeline({kind:'remove',id,track:track.mpvId},epoch);await this.request('remove',{trackId:track.mpvId});}throw error;}
      return track.id;
    });
  }
  private initializationDeadline(epoch:number):()=>void{
    const now=performance.now();this.current(epoch);this.lifetime=startNativeSubtitleInitialization(this.lifetime,now);
    let timer:{handle?:ReturnType<typeof setTimeout>}|undefined;
    const cancel=()=>{const pending=timer;timer=undefined;if(pending?.handle!==undefined)clearTimeout(pending.handle);};
    const arm=(delay:number)=>{
      const registration:{handle?:ReturnType<typeof setTimeout>}={};timer=registration;
      const acquired=setTimeout(()=>{if(timer!==registration)return;timer=undefined;try{const remaining=nativeSubtitleInitializationRemaining(this.lifetime,epoch,performance.now());if(remaining===undefined)return;if(remaining>0){arm(remaining);return;}this.loading.abort();}catch(error){try{this.loading.abort();}finally{this.fail(error as Error);}}},delay);
      registration.handle=acquired;if(timer!==registration||!nativeSubtitleCurrent(this.lifetime,epoch)){clearTimeout(acquired);this.current(epoch);}
    };
    this.cancelInitialization=cancel;try{arm(25000);}catch(error){if(this.cancelInitialization===cancel)this.cancelInitialization=undefined;cancel();throw error;}return()=>{if(this.cancelInitialization===cancel)this.cancelInitialization=undefined;cancel();};
  }
  private completeRequest(id:number,success:boolean,value?:any,error?:unknown){
    const p=this.pending.get(id),settled=settleNativeSubtitleRequest(this.lifetime,id);this.lifetime=settled.state;
    if(!p||!settled.accepted){value?.bitmap?.close();return;}
    this.pending.delete(id);const timer=p.timer;p.timer=undefined;let cleanup:unknown;
    for(const release of [()=>{if(timer?.handle!==undefined)clearTimeout(timer.handle);},p.detach])try{release();}catch(failure){cleanup??=failure;}
    if(success&&(!nativeSubtitleCurrent(this.lifetime,p.epoch)||cleanup!==undefined)){success=false;error=cleanup??Error('Subtitle renderer destroyed');}
    if(success)p.resolve(value);else{try{value?.bitmap?.close();}finally{p.reject(error);}}
  }
  private rejectRequests(ids:readonly number[],error:unknown){
    for(const id of ids){const p=this.pending.get(id);if(!p)continue;this.pending.delete(id);const timer=p.timer;p.timer=undefined;
      for(const release of [()=>{if(timer?.handle!==undefined)clearTimeout(timer.handle);},p.detach])try{release();}catch{}p.reject(error);
    }
  }
  private request(type:string,data:Record<string,unknown>={},signal?:AbortSignal){
    if(signal?.aborted)return Promise.reject(signal.reason);
    const now=performance.now(),admission=admitNativeSubtitleRequest(this.lifetime,type,now);this.lifetime=admission.state;
    if(admission.effect.kind==='reject')return Promise.reject(Error('Subtitle renderer destroyed'));
    const {id,deadline}=admission.effect.request,epoch=this.lifetime.epoch;
    return new Promise<any>((resolve,reject)=>{
      const abort=()=>this.completeRequest(id,false,undefined,signal?.reason),p={epoch,resolve,reject,timer:undefined as {handle?:ReturnType<typeof setTimeout>}|undefined,detach:()=>signal?.removeEventListener('abort',abort)};this.pending.set(id,p);
      const arm=(delay:number)=>{
        const registration:{handle?:ReturnType<typeof setTimeout>}={};p.timer=registration;
        const acquired=setTimeout(()=>{if(p.timer!==registration)return;p.timer=undefined;try{const remaining=nativeSubtitleRequestRemaining(this.lifetime,id,performance.now());if(remaining===undefined)return;if(remaining>0){arm(remaining);return;}this.fail(Error('Subtitle worker deadline exceeded'));}catch(error){this.fail(error as Error);}},delay);
        registration.handle=acquired;if(p.timer!==registration||this.pending.get(id)!==p||!nativeSubtitleCurrent(this.lifetime,epoch)){clearTimeout(acquired);this.current(epoch);}
      };
      try{
        signal?.addEventListener('abort',abort,{once:true});if(this.pending.get(id)!==p||!nativeSubtitleCurrent(this.lifetime,epoch)){p.detach();this.current(epoch);return;}
        signal?.throwIfAborted();arm(deadline-now);this.current(epoch);if(this.pending.get(id)!==p)return;
        this.worker.postMessage({id,type,...data});
      }catch(error){this.completeRequest(id,false,undefined,error);}
    });
  }
  private fail(error:Error){
    const now=performance.now(),retired=closeNativeSubtitleLifetime(this.lifetime,now,true);this.lifetime=retired.state;if(!retired.notify)return;
    this.rejectRequests(retired.reject,error);void this.destroy().catch(()=>{});this.failed(error);
  }
  private applyMode(mode:unknown){
    if(!this.change({kind:'mode',mode}))return;
    this.syncPump();this.invalidate();
  }
  private playbackFacts(){return {paused:this.video.paused,ended:this.video.ended,hidden:document.hidden};}
  private syncPump(){
    const epoch=this.lifetime.epoch,facts=this.playbackFacts();if(!nativeSubtitleCurrent(this.lifetime,epoch))return;
    this.change({kind:'interval',facts},epoch);const id=this.output.interval;
    const prior=this.pumpTimer;
    if(prior&&prior.id!==id){this.pumpTimer=undefined;if(prior.handle!==undefined)clearInterval(prior.handle);}
    if(!nativeSubtitleCurrent(this.lifetime,epoch)||this.output.interval!==id)return;
    if(id!==null&&!this.pumpTimer){
      const registration:{epoch:number;id:number;handle?:ReturnType<typeof setInterval>}={epoch,id};this.pumpTimer=registration;
      try{const acquired=setInterval(()=>{if(this.pumpTimer===registration&&nativeSubtitleCurrent(this.lifetime,epoch)&&this.output.interval===id)void this.pump();},100);registration.handle=acquired;
        if(this.pumpTimer!==registration||!nativeSubtitleCurrent(this.lifetime,epoch)||this.output.interval!==id){clearInterval(acquired);return;}void this.pump();
      }catch(error){if(this.pumpTimer===registration)this.pumpTimer=undefined;if(nativeSubtitleCurrent(this.lifetime,epoch))this.fail(error as Error);}
    }else if(id===null&&this.schedulerMode==='deadline')void this.request('cancelDeadline').catch(error=>{if(nativeSubtitleCurrent(this.lifetime,epoch))this.fail(error);});
  }
  private async pump(){
    const epoch=this.lifetime.epoch,facts=this.playbackFacts();if(!this.change({kind:'pump.begin',facts},epoch))return;
    const id=this.output.pump!.id;
    try{
      const seconds=this.time(),rate=this.video.playbackRate;if(!nativeSubtitleCurrent(this.lifetime,epoch)||!subtitlePumpCurrent(this.output,id))return;
      const result=await this.request('pump',{seconds,rate,running:true});
      if(!nativeSubtitleCurrent(this.lifetime,epoch)||!subtitlePumpCurrent(this.output,id))return;
      this.change({kind:'pump.accept',id,deadlineEpoch:result.schedule?.epoch??-1},epoch);this.service=result.service??this.service;
      this.applyMode(result.mode);
      if(!nativeSubtitleCurrent(this.lifetime,epoch)||this.output.pump?.id!==id)return;
      this.change({kind:'deadline',epoch:result.schedule?.epoch??-1},epoch);
      if(result.timingChanged)this.invalidate();
    }catch(error){if(nativeSubtitleCurrent(this.lifetime,epoch)&&subtitlePumpCurrent(this.output,id))this.fail(error as Error);}
    finally{this.change({kind:'pump.finish',id},epoch);}
  }
  async select(requested:string){await this.ready;return this.withTimeline('select',(epoch,id)=>this.selectTimeline(epoch,id,requested));}
  private async selectTimeline(epoch:number,id:number,requested:string){
    this.timelineCurrent(epoch,id);const selection=this.timeline({kind:'select.begin',id,requested},epoch);
    if(selection.skip)return;if(selection.error==='track')throw new PlayerError('UNSUPPORTED_FEATURE','Requested subtitle track was not enumerated by mpv');
    if(!selection.accepted)throw Error('Subtitle timeline operation retired');
    this.applyMode('fallback');this.syncPump();
    try{
      this.timelineCurrent(epoch,id);await this.request('select',{trackId:selection.trackId});this.timelineCurrent(epoch,id);this.timeline({kind:'select.accept',id},epoch);
      if(selection.track){await this.verifyTimeline(epoch,id);this.timelineCurrent(epoch,id);const profile=await this.request('profile');this.timelineCurrent(epoch,id);this.applyMode(profile.mode);}
    }catch(error){
      if(nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleTimelineCurrent(this.lifetime.timeline,id)){
        const previous=this.lifetime.timeline.selection?.previous??-2;await this.request('select',{trackId:previous});this.timelineCurrent(epoch,id);this.timeline({kind:'select.rollback',id},epoch);
      }
      throw error;
    }
  }
  async verify(signal?:AbortSignal){signal?.throwIfAborted();return this.withTimeline('verify',(epoch,id)=>this.verifyTimeline(epoch,id,signal),signal);}
  private async verifyTimeline(epoch:number,id:number,signal?:AbortSignal){
    signal?.throwIfAborted();this.timelineCurrent(epoch,id);if(!subtitleVerificationNeeded(this.lifetime.timeline))return;
    const width=this.video.videoWidth||this.video.width,height=this.video.videoHeight||this.video.height,seconds=this.time(),duration=this.video.duration;this.timelineCurrent(epoch,id);
    const started=this.timeline({kind:'verify.begin',id,width,height,seconds,duration},epoch);if(started.skip)return;if(!started.accepted)throw Error('Subtitle timeline operation retired');
    try{
      for(;;){
        const effect=subtitleVerificationSample(this.lifetime.timeline,id);if(effect?.kind!=='sample')break;
        const result=await this.request('render',{seconds:effect.seconds,width:effect.width,height:effect.height,force:true},signal);
        result.bitmap?.close();signal?.throwIfAborted();this.timelineCurrent(epoch,id);this.service=result.service;this.timeline({kind:'verify.sample',id,visible:!!result.hasOverlay},epoch);
      }
    }finally{
      // Restore the latest browser clock under the same admitted operation.
      if(!signal?.aborted&&nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleTimelineCurrent(this.lifetime.timeline,id)){
        this.timeline({kind:'verify.restore',id},epoch);const effect=subtitleVerificationSample(this.lifetime.timeline,id);
        if(effect?.kind==='restore'){
          const seconds=this.time();this.timelineCurrent(epoch,id);const result=await this.request('render',{seconds,width:effect.width,height:effect.height,force:true},signal);
          result.bitmap?.close();signal?.throwIfAborted();this.timelineCurrent(epoch,id);this.service=result.service;this.timeline({kind:'verify.restored',id},epoch);
        }
      }else if(signal?.aborted)this.invalidate();
    }
    this.timelineCurrent(epoch,id);const accepted=this.timeline({kind:'verify.accept',id},epoch);if(accepted.error==='output')throw new PlayerError('UNSUPPORTED_FEATURE','Selected subtitle track produced no output in the bounded startup window');
  }
  /** Internal cue oracle for tests; never exposes media text in diagnostics. */
  async currentText(){
    await this.ready;
    const width=Math.min(1920,this.video.videoWidth||this.video.width),height=Math.min(1080,this.video.videoHeight||this.video.height);
    const result=await this.request('render',{seconds:this.time(),width,height,force:false,rate:this.video.playbackRate,running:!this.video.paused&&!document.hidden});result.bitmap?.close();return String(result.text??'');
  }
  /** Internal numeric timing probe. The current frame scheduler does not use it. */
  async timingSnapshot(seconds=this.time()){
    await this.ready;
    const revision=this.revision;
    const result=await this.request('timing',{seconds});
    return {...result,revision,stale:this.stopped||subtitleTimingStale(this.output,revision,result.epoch,result.unstable)};
  }
  suspend(value:boolean){this.timeline({kind:'suspend',value});this.syncPump();if(!value)this.invalidate();}
  seek(seconds:number){return this.withTimeline('seek',async(epoch,id)=>{this.syncPump();this.timelineCurrent(epoch,id);const context=this.canvas.getContext('2d');this.timelineCurrent(epoch,id);context?.clearRect(0,0,this.canvas.width,this.canvas.height);this.timelineCurrent(epoch,id);await this.request('seek',{seconds});this.timelineCurrent(epoch,id);});}
  visible(value:boolean){const epoch=this.lifetime.epoch;if(!this.change({kind:'enabled',value},epoch))return;this.canvas.style.display=value?'block':'none';if(!nativeSubtitleCurrent(this.lifetime,epoch))return;this.syncPump();this.invalidate();}
  private invalidate(){const epoch=this.lifetime.epoch;if(!this.change({kind:'invalidate'},epoch))return;this.scheduleFrame(epoch);}
  private scheduleFrame(epoch=this.lifetime.epoch){
    if(!this.change({kind:'frame.request'},epoch))return;const id=this.output.frame!;
    const registration:{epoch:number;id:number;handle?:ReturnType<typeof requestAnimationFrame>}={epoch,id};this.frame=registration;
    try{const acquired=requestAnimationFrame(()=>{if(this.frame!==registration)return;this.frame=undefined;if(this.change({kind:'frame.take',id},epoch))this.tick();});registration.handle=acquired;
      if(this.frame!==registration||!nativeSubtitleCurrent(this.lifetime,epoch)||this.output.frame!==id)cancelAnimationFrame(acquired);
    }catch(error){if(this.frame===registration)this.frame=undefined;this.change({kind:'frame.take',id},epoch);if(nativeSubtitleCurrent(this.lifetime,epoch))this.fail(error as Error);}
  }
  private tick(){
    const epoch=this.lifetime.epoch,hidden=document.hidden;if(!nativeSubtitleCurrent(this.lifetime,epoch)||!subtitleTickAllowed(this.output,hidden))return;
    const rect=this.video.getBoundingClientRect();if(!nativeSubtitleCurrent(this.lifetime,epoch))return;const element=this.video.parentElement;if(!nativeSubtitleCurrent(this.lifetime,epoch)||!element)return;const parent=element.getBoundingClientRect();if(!nativeSubtitleCurrent(this.lifetime,epoch))return;
    const sourceWidth=this.video.videoWidth,sourceHeight=this.video.videoHeight;
    const layout=subtitleLayout({left:rect.left,top:rect.top,width:rect.width,height:rect.height,parentLeft:parent.left,parentTop:parent.top,sourceWidth,sourceHeight});
    if(!nativeSubtitleCurrent(this.lifetime,epoch))return;
    if(!layout){this.scheduleFrame(epoch);return;}
    const revision=this.revision,current=()=>nativeSubtitleCurrent(this.lifetime,epoch)&&this.revision===revision&&subtitleTickAllowed(this.output,document.hidden);
    for(const [name,value]of [['left',layout.left],['top',layout.top],['width',layout.width],['height',layout.height]] as const){if(!current())return;this.canvas.style[name]=`${value}px`;}
    if(!current())return;
    const seconds=this.time(),rate=this.video.playbackRate,facts=this.playbackFacts(),width=layout.renderWidth,height=layout.renderHeight;
    if(!current())return;
    const admitted=this.change({kind:'render.begin',seconds,width,height,sourceWidth,sourceHeight},epoch);
    const render=this.output.render,key=`${width}:${height}:${sourceWidth}:${sourceHeight}:${seconds}`;
    // Only the request admitted in this tick may start physical rendering.
    if(admitted&&render){
      void this.request('render',{seconds,width,height,sourceWidth,sourceHeight,force:render.force,rate,running:!facts.paused&&!facts.ended&&!facts.hidden}).then(result=>{
        const bitmap=result.bitmap as ImageBitmap|undefined;
        const owned=()=>nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleRenderCurrent(this.output,render.id);
        try{
          if(!owned()){this.change({kind:'render.discard',id:render.id},epoch);return;}
          this.service=result.service;this.applyMode(result.mode);
          if(this.schedulerMode==='deadline')this.change({kind:'deadline',epoch:result.schedule?.epoch??-1},epoch);
          if(!owned()){this.change({kind:'render.discard',id:render.id},epoch);return;}
          if(!result.unchanged){
            this.canvas.width=width;if(!owned())return;this.canvas.height=height;if(!owned())return;
            const context=this.canvas.getContext('2d')!;if(!owned())return;
            if(bitmap)context.drawImage(bitmap,0,0);if(!owned())return;
          }
          this.change({kind:'render.accept',id:render.id,unchanged:!!result.unchanged,size:result.size},epoch);
        }finally{bitmap?.close();}
      }).catch(error=>{if(nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleRenderCurrent(this.output,render.id))this.fail(error);}).finally(()=>{
        const retry=subtitleRetryRender(this.output,render.revision);
        if(this.change({kind:'render.finish',id:render.id},epoch)&&retry)this.invalidate();
      });
    }
    const paused=this.video.paused;if(nativeSubtitleCurrent(this.lifetime,epoch)&&subtitleFollowFrame(this.output,paused,key))this.scheduleFrame(epoch);
  }
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    const now=performance.now(),retired=closeNativeSubtitleLifetime(this.lifetime,now);this.lifetime=retired.state;
    let resolve!:()=>void,reject!:(error:unknown)=>void;const done=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});this.destruction=done;
    const timeline=[...this.timelineWork.values()];this.timelineWork.clear();
    const worker=this.worker,observer=this.observer,cancelInitialization=this.cancelInitialization,handlers=this.handlers.splice(0),frame=this.frame,pump=this.pumpTimer;this.frame=undefined;this.pumpTimer=undefined;this.observer=undefined;this.cancelInitialization=undefined;
    let timer:{handle?:ReturnType<typeof setTimeout>}|undefined,finished=false,cleanupComplete=false,finishRequested=this.lifetime.acknowledged;const errors:unknown[]=[];
    const attempt=(work:()=>void)=>{try{work();}catch(error){errors.push(error);}};
    const finish=()=>{if(finished)return;finishRequested=true;if(!cleanupComplete)return;finished=true;this.lifetime=finishNativeSubtitleClose(this.lifetime);const pending=timer;timer=undefined;this.closed=undefined;attempt(()=>{if(pending?.handle!==undefined)clearTimeout(pending.handle);});attempt(()=>worker?.terminate());errors.length?reject(errors.length===1?errors[0]:new AggregateError(errors,'Subtitle renderer cleanup failed')):resolve();};
    const arm=(delay:number)=>{const registration:{handle?:ReturnType<typeof setTimeout>}={};timer=registration;const acquired=setTimeout(()=>{if(timer!==registration)return;timer=undefined;try{const remaining=nativeSubtitleCloseRemaining(this.lifetime,performance.now());if(remaining!==undefined&&remaining>0){arm(remaining);return;}finish();}catch(error){errors.push(error);finish();}},delay);registration.handle=acquired;if(finished||timer!==registration)clearTimeout(acquired);};
    this.closed=finish;const stopped=Error('Subtitle renderer destroyed');for(const work of timeline){attempt(()=>work.detach?.());work.reject(stopped);}this.rejectRequests(retired.reject,stopped);
    for(const release of [()=>cancelInitialization?.(),()=>this.loading.abort(),()=>{if(frame?.handle!==undefined)cancelAnimationFrame(frame.handle);},()=>{if(pump?.handle!==undefined)clearInterval(pump.handle);},()=>observer?.disconnect(),...handlers,()=>this.canvas.remove()])attempt(release);
    cleanupComplete=true;if(finishRequested)finish();
    try{if(!finished)arm(nativeSubtitleCloseRemaining(this.lifetime,now)??0);if(!finished)worker?.postMessage({type:'close'});}catch(error){errors.push(error);finish();}
    return done;
  }
}
