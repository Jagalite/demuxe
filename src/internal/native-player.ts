// SPDX-License-Identifier: Apache-2.0
import type {ProviderRuntimeAssets} from './provider-runtime.js';
import {loadProviderModule} from './provider-modules.js';
import {executionRecipe} from './execution-recipes.js';
import {bufferingPolicy, resolveBuffering} from './buffering.js';
import type {BufferingPolicy} from '../types.js';
import {plainVTT, BrowserCaptionUnsupported} from './plain-vtt.js';
import {nativeLoadOpening,selectNativeLoadRoute,selectNativePreparation,type NativeLoadRequest,type NativeLoadPolicy,type NativeLoadEvent} from './machine/native-load.js';
import type {NativeEventRequest} from './machine/native-wait.js';
import {nativeCaptionAttachment,nativeCaptionMaySelect,selectNativeCaptionPresentation,nativeOverlayAdmission,nativeCaptionFidelity,type NativeCaptionEffect,type NativeCaptionRequest,type NativeCaptionKind} from './machine/native-captions.js';
import {selectNativeGain,nativeGainOutputWait,type NativeControlDomain,type NativeControlRequest,type NativeControlValue} from './machine/native-controls.js';
import {initialNativeBackend,nativeRequestCurrent,transitionNativeBackend,type NativeBackendCommand,type NativeRequest,type NativeVerificationFacts} from './machine/native-backend.js';
import {nativeMediaError,compatibilityFailure,StartupEvidenceTimeout,NativeLoadTimeout} from './runtime-capability.js';
import {PlayerError,isPlayerError} from './errors.js';
import type {CapabilityEvidence} from './runtime-capability.js';
import type {RemoteSource, TextTrackSource, TrackType, SubtitleAsset, FontAsset} from '../types.js';
import type {Backend} from './backend.js';
import {watchdogPolicy} from './watchdogs.js';
import type {WatchdogPolicy} from '../types.js';

type RemuxSource = {file?: File; options?: RemoteSource; audioTrack?: number; videoOnly?:boolean};
type RemuxTrack = {id: string; type: string; codec: string; selected: boolean};
type RemuxController = {
  waitingForMedia?:boolean; onBufferingChange?:()=>void;
  audioAdaptation?:'flac'|'opus'|'flac24'; generation?:number;
  windowed?:boolean; ranges?():[number,number][]; duration?:number; playbackPaused?:boolean; playbackEnded?:boolean;
  trackBounds?:{videoEnd:number;audioEnd:number};
  starting?: boolean; timelineBias: number; tracks?: RemuxTrack[]; onError?: (message: string) => void;
  open(source: RemuxSource, target?: number): Promise<unknown>;
  canSeekBuffered?(target:number): boolean; expectedVideoFrame?(target:number):number|undefined;
  muxedFrames?:boolean; matchesVideoFrame?(target:number,mediaTime:number):boolean|undefined;
  seek(target: number): Promise<unknown>; play(): Promise<void>; pause(): void;
  setBuffering?(policy:import('../types.js').BufferingResolution):Promise<void>|void;
  readonly bufferingDiagnostics?:Record<string,unknown>;
  destroy(): Promise<void>; snapshot(): Record<string, unknown>;
};
type AudioTrack = {id: string; label?: string; language?: string; enabled: boolean};
type VideoWithAudioTracks = HTMLVideoElement & {audioTracks?: ArrayLike<AudioTrack>};

/** Browser media ownership, including listeners, pending loads and object URLs. */
export class NativePlayer extends EventTarget implements Backend {
  readonly ready = Promise.resolve();
  readonly properties = new Map<string, unknown>();
  private native=initialNativeBackend();
  private get stopped(){return this.native.stopped;}
  private get seekPresentationRetries(){return this.native.seekPresentationRetries;}
  private get capability(){return this.native.capability;}
  private get expectedOutput(){return this.native.expected;}
  private verificationCancel?:{request:NativeRequest;cancel:(error:Error)=>void};
  private seekCancel?:{request:NativeRequest;cancel:(error:Error)=>void};
  private changeNative(command:NativeBackendCommand){const result=transitionNativeBackend(this.native,command);this.native=result.state;return result;}
  private assertNative(request:NativeRequest){if(!nativeRequestCurrent(this.native,request))throw new Error(this.stopped?'Player is destroyed':'Native operation was retired');}
  private retireNativeSource(){
    this.changeNative({type:'source'});
    const verification=this.verificationCancel,seek=this.seekCancel,controls=[...this.controlWait.values()],captions=[...this.captionWait.values()],events=[...this.eventWaits.values()];
    for(const event of events)event(new Error('Native source was retired'));
    for(const caption of captions)caption.cancel(new Error('Native source was retired'));
    for(const control of controls)control.cancel(new Error('Native source was retired'));verification?.cancel(new Error('Native verification was retired'));seek?.cancel(new Error('Native seek presentation was retired'));
    this.assertActive();
  }
  private mpvSubs?:import('./native-mpv-subtitles.js').NativeMpvSubtitles;
  private mpvAudio?:import('./native-mpv-audio.js').NativeMpvAudio|import('./native-private-mpv-audio.js').NativePrivateMpvAudio;
  private get execution(){return executionRecipe(this.requestedPlan)?.native;}
  private get selectiveAudio(){return this.execution?.selectedAudio??false;}
  private get mpvSubtitlePlan(){return this.execution?.subtitles==='embedded';}
  private subtitleSource?:File|RemoteSource;
  private textAttachmentIds=new WeakMap<TextTrack,NativeCaptionRequest>();
  private captionAssets=new Map<TextTrack,{asset:SubtitleAsset;request:NativeCaptionRequest}>();
  private browserTracks=new Map<number,{element:HTMLTrackElement;release:()=>void}>();
  private captionURLs=new Set<string>();
  private get outputDevice(){return this.native.controls.outputDevice;}
  private get buffering(){return this.native.controls.buffering;}
  private gainContext?: AudioContext;
  private gainSource?: MediaElementAudioSourceNode;
  private gainNode?: GainNode;
  private get gainValue(){return this.native.controls.gain;}
  private get requestedVolume(){return this.native.controls.volume;}
  private get requestedRate(){return this.native.controls.rate;}
  private controlWait=new Map<NativeControlDomain,{request:NativeControlRequest;interrupted:Promise<never>;cancel:(error:Error)=>void;cleanups:Set<(error:Error)=>void>;settled:Promise<void>}>();
  private assertControl(request:NativeControlRequest){this.assertNative(request);}
  private changeControl(request:NativeControlRequest,change:NativeControlValue){this.assertControl(request);return this.changeNative({type:'control.value',request,change});}
  private async awaitControl<T>(request:NativeControlRequest,value:PromiseLike<T>|T):Promise<T>{
    const observed=Promise.resolve(value);void observed.catch(()=>{});this.assertControl(request);
    const pending=this.controlWait.get(request.domain);if(pending?.request.id!==request.id)throw new Error('Native control was retired');
    const result=await Promise.race([observed,pending.interrupted]);this.assertControl(request);return result;
  }
  private withControl<T>(domain:NativeControlDomain,work:(request:NativeControlRequest)=>Promise<T>|T,paused?:boolean):Promise<T>{
    this.assertActive();const previous=this.controlWait.get(domain),request=this.changeNative({type:'control.begin',domain,paused}).request as NativeControlRequest;
    let reject!:(error:Error)=>void,cancelled=false;const interrupted=new Promise<never>((_,no)=>{reject=no;});void interrupted.catch(()=>{});
    let settle!:()=>void;const settled=new Promise<void>(resolve=>{settle=resolve;});
    const cleanups=new Set<(error:Error)=>void>(),cancel=(error:Error)=>{if(cancelled)return;cancelled=true;reject(error);for(const cleanup of [...cleanups])cleanup(error);},entry={request,interrupted,cancel,cleanups,settled};this.controlWait.set(domain,entry);this.cancelers.add(cancel);
    const finish=()=>{this.changeNative({type:'control.finish',request});this.cancelers.delete(cancel);if(this.controlWait.get(domain)===entry)this.controlWait.delete(domain);settle();};
    try{previous?.cancel(new Error('Native control was retired'));this.assertControl(request);return this.awaitControl(request,work(request)).finally(finish);}catch(error){finish();return Promise.reject(error);}
  }
  async gain(value:number) {
    this.assertActive();const validation=selectNativeGain(value,{selective:false,graph:false,paused:true,outputDevice:''});if(validation.error)throw new Error(validation.error);
    return this.withControl('gain',async request=>{
      const audio=this.mpvAudio,decision=selectNativeGain(value,{selective:this.selectiveAudio,graph:!!this.gainNode,paused:this.video.paused,outputDevice:this.outputDevice});this.assertControl(request);
      if(decision.error)throw new Error(decision.error);
      if(decision.selective){if(audio){const apply=audio.gainValue;this.assertControl(request);await this.awaitControl(request,apply.call(audio,value));}this.changeControl(request,{type:'gain',value});return;}
      if(decision.createGraph){
        let context=this.gainContext;
        if(!context){const acquired=new AudioContext();if(!nativeRequestCurrent(this.native,request)){try{void Promise.resolve(acquired.close()).catch(()=>{});}catch{}this.assertControl(request);}this.gainContext=context=acquired;}
        if(decision.resume)await this.resumeGain(request);this.assertControl(request);
        for(;;){const id=nativeGainOutputWait(this.native.controls,request);if(id===undefined)break;const output=this.controlWait.get('output');if(output?.request.id!==id)throw new Error('Native output control was retired');await this.awaitControl(request,output.settled);}
        if(this.outputDevice)await this.awaitControl(request,this.applyAudioOutput(this.outputDevice,request));this.assertControl(request);
        let source=this.gainSource;
        if(!source){const create=context.createMediaElementSource;this.assertControl(request);const acquired=create.call(context,this.video);if(!nativeRequestCurrent(this.native,request)){try{acquired.disconnect();}finally{this.assertControl(request);}}this.gainSource=source=acquired;}
        const create=context.createGain;this.assertControl(request);const gain=create.call(context);let installed=false;
        try{
          this.assertControl(request);gain.gain.setValueAtTime(value,context.currentTime);this.assertControl(request);
          source.connect(gain);this.assertControl(request);gain.connect(context.destination);this.assertControl(request);
          this.gainNode=gain;installed=true;
        }finally{if(!installed){try{source.disconnect(gain);}catch{}try{gain.disconnect();}catch{}}}
      }
      const gain=this.gainNode,context=this.gainContext;
      if(gain&&context){const parameter=gain.gain,apply=parameter.setValueAtTime,now=context.currentTime;this.assertControl(request);apply.call(parameter,value,now);this.assertControl(request);}
      this.changeControl(request,{type:'gain',value});
    });
  }
  private resumeGain(request:NativeControlRequest):Promise<void>|undefined {
    const context=this.gainContext,state=context?.state;this.assertControl(request);if(!context||state!=='suspended')return;
    const owner=this.controlWait.get(request.domain)!;
    return this.awaitControl(request,new Promise<void>((resolve,reject)=>{
      let settled=false,timer:ReturnType<typeof setTimeout>|undefined;
      const finish=(error?:unknown)=>{if(settled)return;settled=true;const timeout=timer;timer=undefined;this.cancelers.delete(cancel);owner.cleanups.delete(cancel);try{clearTimeout(timeout);}catch(cleanup){error??=cleanup;}error!==undefined?reject(error):resolve();};
      const cancel=(error:Error)=>finish(error);
      this.cancelers.add(cancel);owner.cleanups.add(cancel);
      const expired=()=>{try{const decision=this.changeNative({type:'control.deadline',request,now:performance.now()});if(!decision.accepted){finish(new Error('Native control was retired'));return;}if(decision.remaining!==undefined){const acquired=setTimeout(expired,decision.remaining);if(settled||!nativeRequestCurrent(this.native,request)){clearTimeout(acquired);if(!settled)finish(new Error('Native control was retired'));return;}timer=acquired;return;}finish(new DOMException('Audio activation timed out','NotAllowedError'));}catch(error){finish(error);}};
      try{
        const now=performance.now();this.assertControl(request);this.changeNative({type:'control.activation',request,now});const acquired=setTimeout(expired,10000);
        if(settled||!nativeRequestCurrent(this.native,request)){clearTimeout(acquired);this.assertControl(request);return;}timer=acquired;
        const resume=context.resume;this.assertControl(request);Promise.resolve(resume.call(context)).then(()=>finish(),finish);
      }catch(error){finish(error);}
    }));
  }
  private destruction?:Promise<void>;
  private get opening(){return nativeLoadOpening(this.native.load);}
  private remux?: RemuxController;
  private remuxEnginePath?:string;
  private projection?: {tracks:RemuxTrack[];diagnostics:Record<string,unknown>};
  private get adapted(){return this.native.load.adapted;}
  private remuxSource?: RemuxSource;
  private get directFailure(){return this.native.load.directFailure;}
  private remoteSource?:RemoteSource;
  private shiftedCues = new WeakSet<TextTrackCue>();
  private sourceTime() {return Math.max(0,this.video.currentTime-(this.remux?.timelineBias??0));}
  private sourceDuration() {if(this.remux?.windowed)return this.remux.duration??0;return Number.isFinite(this.video.duration)?Math.max(0,this.video.duration-(this.remux?.timelineBias??0)):0;}
  private objectURL?: string;
  private ownedObjectURLs=new Map<string,number>();
  private sourceCleanup:Promise<void>=Promise.resolve();
  private get selectedSub(){return this.native.captions.selected;}
  private get subsVisible(){return this.native.captions.visible;}
  private cancelers = new Set<(error: Error) => void>();
  private listeners: Array<() => void> = [];
  private watchdogs=watchdogPolicy();
  setWatchdogs(policy:WatchdogPolicy){this.watchdogs=policy;this.mpvAudio?.setWatchdogs(policy);}
  nativeProgressSample(){
    const video=this.video,time=this.sourceTime(),duration=this.sourceDuration(),rate=video.playbackRate;
    if(this.stopped||this.opening||this.capability.outputVerified!==true||video.paused||video.seeking||video.ended||video.error||video.readyState<3||rate<=0||duration>0&&time>=duration-.25)return {eligible:false,time,rate};
    // buffered is a browser snapshot getter. Read it once, not per range bound.
    const buffered=video.buffered,mediaTime=video.currentTime;
    let ahead=0;
    for(let i=0;i<buffered.length;i++)if(mediaTime>=buffered.start(i)&&mediaTime<=buffered.end(i)){ahead=buffered.end(i)-mediaTime;break;}
    if(ahead<.5*rate)return {eligible:false,time,rate};
    const quality=video.getVideoPlaybackQuality?.();
    return {eligible:true,
      time,rate,frames:quality&&video.videoWidth>0?quality.totalVideoFrames-quality.droppedVideoFrames:undefined,videoEnd:this.remux?.trackBounds?.videoEnd};
  }

  constructor(private video: HTMLVideoElement, private remuxPolicy: 'auto' | 'never' | 'always' = 'auto', private assetBase = new URL('../../../',import.meta.url), private bufferedSeeks=false, private audioAdaptation?:'flac'|'opus'|'flac24', private initialAudioTrack?:number, private nativeASS=false, private fonts:FontAsset[]=[], private requestedPlan?:string, buffering:BufferingPolicy=bufferingPolicy(), private loadTimeoutMs=25000, private defaultSubtitleStreamIndex?:number, private remuxRuntime:'pthread'|'jspi'|'asyncify'='pthread',private providerRuntime?:ProviderRuntimeAssets) {
    super();this.native=initialNativeBackend(buffering);
    video.playsInline = true;
    video.preload = this.buffering.preload;
    for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'volumechange', 'ratechange', 'ended', 'waiting', 'playing', 'progress', 'seeking', 'seeked', 'resize']) {
      const listener = () => {
        const epoch=this.native.epoch;if(this.stopped)return;this.refresh();
        if(this.stopped||this.native.epoch!==epoch)return;this.emit('activity', event);
        if(this.stopped||this.native.epoch!==epoch)return;
        if (event === 'ended'&&(!this.remux?.windowed||this.remux.playbackEnded)) this.emit('mpv', {event: 'end-file', reason: 'eof'});
      };
      video.addEventListener(event, listener);
      this.listeners.push(() => video.removeEventListener(event, listener));
    }
    const failed = () => {
      if(this.opening||this.remux?.starting||this.stopped)return;
      const epoch=this.native.epoch;void this.classifyDirectFailure(nativeMediaError(video.error)).then(error=>{if(!this.stopped&&this.native.epoch===epoch)this.emit('error',error);},error=>{if(!this.stopped&&this.native.epoch===epoch)this.emit('error',error);});
    };
    video.addEventListener('error', failed);
    this.listeners.push(() => video.removeEventListener('error', failed));
    const tracks = () => this.refresh();
    video.textTracks.addEventListener('change', tracks);
    video.textTracks.addEventListener('addtrack', tracks);
    this.listeners.push(() => {video.textTracks.removeEventListener('change', tracks);video.textTracks.removeEventListener('addtrack', tracks);});
    this.refresh();
  }
  private emit(type: string, detail: unknown) {this.dispatchEvent(new CustomEvent(type, {detail}));}
  private assertActive() {if (this.stopped) throw new Error('Player is destroyed');}
  private eventWaits=new Map<number,(error:Error)=>void>();
  private wait(event:string,start:()=>void,signal?:AbortSignal):Promise<void>{
    this.assertActive();signal?.throwIfAborted();const now=performance.now();this.assertActive();
    const request=this.changeNative({type:'event.begin',event,now,loadBudget:this.loadTimeoutMs}).request as NativeEventRequest,video=this.video;
    return new Promise((resolve,reject)=>{
      let settled=false,timer:{handle?:ReturnType<typeof setTimeout>}|undefined;
      const finish=(error?:unknown)=>{
        if(settled)return;settled=true;this.changeNative({type:'event.finish',request});
        const pending=timer;timer=undefined;this.cancelers.delete(cancel);this.eventWaits.delete(request.id);
        for(const clean of [()=>clearTimeout(pending?.handle),()=>video.removeEventListener(event,done),()=>video.removeEventListener('error',failed),()=>signal?.removeEventListener('abort',aborted)])try{clean();}catch(cleanup){error??=cleanup;}
        error!==undefined?reject(error):resolve();
      };
      const done=()=>{try{this.assertNative(request);finish();}catch(error){finish(error);}},failed=()=>{try{this.assertNative(request);const error=nativeMediaError(video.error);this.assertNative(request);finish(error);}catch(error){finish(error);}},cancel=(error:Error)=>finish(error),aborted=()=>finish(signal?.reason??new DOMException('Native wait cancelled','AbortError'));
      const arm=(delay:number)=>{
        const registration:{handle?:ReturnType<typeof setTimeout>}={};timer=registration;
        const acquired=setTimeout(()=>{if(timer!==registration)return;timer=undefined;try{const now=performance.now(),decision=this.changeNative({type:'event.deadline',request,now});if(!decision.accepted){finish(new Error('Native wait was retired'));return;}if(decision.remaining!==undefined){arm(decision.remaining);return;}const timeout=decision.eventTimeout!;finish((timeout.event==='loadeddata'||timeout.event==='loadedmetadata')?new NativeLoadTimeout(timeout.event,timeout.budget):new Error(`Native ${timeout.event} timed out`));}catch(error){finish(error);}},delay);
        registration.handle=acquired;if(settled||timer!==registration||!nativeRequestCurrent(this.native,request)){clearTimeout(acquired);this.assertNative(request);}
      };
      this.cancelers.add(cancel);this.eventWaits.set(request.id,cancel);
      try{
        signal?.addEventListener('abort',aborted,{once:true});if(settled||!nativeRequestCurrent(this.native,request)){signal?.removeEventListener('abort',aborted);this.assertNative(request);return;}
        const deadline=this.changeNative({type:'event.deadline',request,now});arm(deadline.remaining??0);if(settled)return;
        for(const [name,listener] of [[event,done],['error',failed]] as const){video.addEventListener(name,listener,{once:true});if(settled||!nativeRequestCurrent(this.native,request)){video.removeEventListener(name,listener);this.assertNative(request);return;}}
        signal?.throwIfAborted();this.assertNative(request);start();
      }catch(error){finish(error);}
    });
  }
  // File captions have their own ID range; DOM insertion order must not reassign
  // IDs of URL-backed browser tracks when a session replays both kinds.
  private textTrackId(track:TextTrack):string {
    const caption=this.captionAssets.get(track);
    return caption?(nativeCaptionAttachment(this.native.captions,caption.request.id)?.publicId??''):String(Array.from(this.video.textTracks).filter(t=>!this.captionAssets.has(t)).indexOf(track)+1);
  }
  private refresh(request?:NativeLoadRequest) {
    const epoch=this.native.epoch,current=()=>!this.stopped&&epoch===this.native.epoch&&(!request||nativeRequestCurrent(this.native,request));if(!current())return;
    const tracks: object[] = Array.from(this.video.textTracks, t => ({id: this.textTrackId(t), type: 'sub', title: t.label, lang: t.language, selected: t.mode === 'showing',...(this.textAttachmentIds.has(t)?{external:true,'attachment-id':nativeCaptionAttachment(this.native.captions,this.textAttachmentIds.get(t)!.id)?.attachmentId}:{}),...(this.captionAssets.has(t)?{external:true,'attachment-id':this.captionAssets.get(t)!.asset.attachmentId,'external-index':nativeCaptionAttachment(this.native.captions,this.captionAssets.get(t)!.request.id)?.index,codec:'webvtt'}:{})}));
    if(this.mpvSubs)tracks.push(...this.mpvSubs.tracks);
    const audio = (this.video as VideoWithAudioTracks).audioTracks;
    if(this.projection)tracks.push(...this.projection.tracks.filter(t=>t.type==='audio').map(t=>({...t,selected:t.selected&&!this.video.muted})));
    else if(this.remux?.tracks)tracks.push(...this.remux.tracks.filter(t=>t.type==='audio').map(t=>({...t,selected:this.mpvAudio?this.mpvAudio.selectedStreamIndex===Number(t.id)-1:t.selected&&!this.video.muted})));
    else if (audio) tracks.push(...Array.from(audio, (t, i) => ({id: String(i + 1), type: 'audio', title: t.label, lang: t.language, selected: t.enabled})));
    const timeRanges=(r:TimeRanges)=>Array.from({length:r.length},(_,i)=>({start:Math.max(0,r.start(i)-(this.remux?.timelineBias??0)),end:Math.max(0,r.end(i)-(this.remux?.timelineBias??0))}));
    const values: Record<string, unknown> = {'native-waiting':!!this.remux?.waitingForMedia, 'time-pos': this.sourceTime(), duration: Number.isFinite(this.video.duration)?this.sourceDuration():null, 'native-buffered':this.remux?.windowed?(this.remux.ranges?.()??[]).map(([start,end])=>({start,end})):timeRanges(this.video.buffered),'native-seekable':this.remux?.windowed?[{start:0,end:this.sourceDuration()}]:timeRanges(this.video.seekable),'native-live':this.video.duration===Infinity, pause: this.remux?.playbackPaused??this.video.paused, 'eof-reached': this.remux?.playbackEnded??this.video.ended, volume: this.selectiveAudio?this.requestedVolume:this.video.volume * 100, speed: this.video.playbackRate, 'track-list': tracks};
    for (const [name, data] of Object.entries(values)) {
      if(!current())return;
      if (name !== 'track-list' && this.properties.get(name) === data) continue;
      this.properties.set(name, data);this.emit('mpv', {event: 'property-change', name, data});
    }
  }
  get planId(){return this.mpvSubtitlePlan&&this.mpvSubs&&this.adapted&&this.audioAdaptation==='flac24'?'native-transcode-mpv':this.mpvAudio?this.requestedPlan:this.mpvSubtitlePlan&&this.mpvSubs?(this.remux?'remux-mpv':'direct-mpv'):this.projection?(this.adapted?'adapted-flac24':'remux'):this.remux?(this.adapted?`adapted-${this.audioAdaptation}`:'remux'):'direct';}
  get bufferingUpdateSupported(){return !this.remux||!!this.remux.setBuffering;}
  async setBuffering(policy:BufferingPolicy){
    return this.withControl('buffering',async request=>{
      const remux=this.remux,apply=remux?.setBuffering;this.assertControl(request);
      if(remux){if(!apply)throw new PlayerError('UNSUPPORTED_FEATURE','This remux provider cannot update buffering at runtime');await this.awaitControl(request,apply.call(remux,resolveBuffering(policy,'remux')));}
      this.assertControl(request);this.video.preload=policy.preload;this.assertControl(request);this.changeControl(request,{type:'buffering',value:policy});
    });
  }
  get bufferingDiagnostics(){
    return {...resolveBuffering(this.buffering,this.remux?'remux':'browser'),settings:this.remux?.bufferingDiagnostics??{elementPreload:this.video.preload}};
  }
  get diagnostics() {const q = this.video.getVideoPlaybackQuality(),remux=this.remux?.snapshot();return {buffering:{...resolveBuffering(this.buffering,this.remux?'remux':'browser'),settings:remux?.buffering as Record<string,unknown>??{elementPreload:this.video.preload}},capability:{...this.capability,...(remux?.capability as CapabilityEvidence??{})},path: 'native', projection:this.projection?.diagnostics,mpvAudio:this.mpvAudio?.diagnostics,mpvSubtitles:this.mpvSubs?{route:this.mpvAudio?'native-video + mpv-audio + mpv-subtitles':this.remux?'native-remux + mpv-subtitles':'native-direct + mpv-subtitles',...this.mpvSubs.stats,...this.mpvSubs.service}:undefined,plan:this.planId, subtitleOverlay:this.mpvSubs?.tracks.some(t=>t.external)?{component:'mpv-subtitle-service',scope:'external',destination:'container-only',...this.mpvSubs.stats}:undefined, audioProcessing:this.mpvAudio?{component:'mpv-pcm-worklet',gain:this.gainValue}: {component:this.gainContext?'web-audio-gain':'media-element',gain:this.gainValue,contextState:this.gainContext?.state,baseLatency:this.gainContext?.baseLatency}, directFailure:this.directFailure, remux, seekPresentation:{bufferedRetries:this.seekPresentationRetries}, position: this.sourceTime(), rendered: q.totalVideoFrames, dropped: q.droppedVideoFrames, readyState: this.video.readyState};}
  private async load(url:string,request?:NativeLoadRequest){
    const epoch=this.native.epoch,current=()=>{this.assertActive();if(this.native.epoch!==epoch)throw new Error('Native load was retired');if(request)this.assertLoad(request);};
    current();if(this.buffering.preload==='none')this.video.preload='metadata';current();
    try{await this.wait(this.buffering.preload==='auto'?'loadeddata':'loadedmetadata',()=>{current();this.video.src=url;current();this.video.load();},request?this.loadSignal(request):undefined);}
    finally{if(!this.stopped&&this.native.epoch===epoch&&(!request||nativeRequestCurrent(this.native,request)))this.video.preload=this.buffering.preload;}
    current();this.changeNative({type:'metadata',epoch});this.refresh(request);current();this.emit('mpv',{event:'file-loaded'});
  }
  /** A paused candidate may prepare current data without presenting it. Only
   * verifyOutput can promote this evidence to executed playback. */
  async verifyStartup(expected?:{video:boolean;audio:boolean}, output=false,signal?:AbortSignal,outputBudgetMs=10000) {
    signal?.throwIfAborted();this.assertActive();
    const request=this.changeNative({type:'verify.begin',output,budget:outputBudgetMs,expected}).request!,previous=this.verificationCancel;
    const v=this.video as HTMLVideoElement & {webkitAudioDecodedByteCount?:number;mozDecodedFrames?:number;mozHasAudio?:boolean};
    const subtitles=this.mpvSubs;
    return new Promise<void>((resolve,reject)=>{
      // These slots own physical registrations and promise settlement. Logical
      // readiness, classification and request authority live in native state.
      let settled=false,timer:ReturnType<typeof setTimeout>|undefined,poll:ReturnType<typeof setInterval>|undefined,frame:{id:number}|undefined;
      const cleanBrowser=()=>{
        const timeout=timer,interval=poll,callback=frame;timer=undefined;poll=undefined;frame=undefined;
        let failure:unknown;
        for(const clean of [()=>clearTimeout(timeout),()=>clearInterval(interval),()=>{if(callback?.id)v.cancelVideoFrameCallback(callback.id);}])try{clean();}catch(error){failure??=error;}
        if(failure)throw failure;
      };
      const finish=(error?:unknown)=>{
        if(settled)return;settled=true;
        this.changeNative({type:'verify.finish',request,failed:error!==undefined});
        this.cancelers.delete(cancel);if(this.verificationCancel?.request.id===request.id)this.verificationCancel=undefined;
        try{signal?.removeEventListener('abort',aborted);}catch(cleanup){error??=cleanup;}
        try{cleanBrowser();}catch(cleanup){error??=cleanup;}
        error!==undefined?reject(error):resolve();
      };
      const assertCurrent=()=>{signal?.throwIfAborted();this.assertNative(request);if(this.mpvSubs!==subtitles)throw new Error('Native verification was retired');};
      const cancel=(error:Error)=>finish(error),aborted=()=>finish(signal?.reason??new DOMException('Verification cancelled','AbortError'));
      const failure=(kind:string)=>kind==='missing-audio'?new PlayerError('DECODE_FAILED','Native selected audio track produced no output'):kind==='missing-output'?new PlayerError('DECODE_FAILED','Native selected track produced no decoded output'):new StartupEvidenceTimeout(output?'output':'preparation');
      const armTimer=(delay:number)=>{
        const acquired=setTimeout(expired,delay);
        if(settled||!nativeRequestCurrent(this.native,request))clearTimeout(acquired);else timer=acquired;
      };
      const expired=()=>{
        timer=undefined;if(settled)return;
        try{
          assertCurrent();const facts={readyState:v.readyState,videoWidth:v.videoWidth,audioBytes:v.webkitAudioDecodedByteCount,hasAudio:v.mozHasAudio,now:performance.now()};assertCurrent();
          const result=this.changeNative({type:'verify.deadline',request,...facts});
          if(result.remaining!==undefined)armTimer(result.remaining);else if(result.failure)finish(failure(result.failure));
        }catch(error){finish(error);}
      };
      let audio:typeof this.mpvAudio;
      const check=()=>{
        if(settled)return;
        try{
          assertCurrent();if(this.native.verification?.phase!=='sampling')return;
          const mediaError=v.error;assertCurrent();
          if(mediaError){
            if(!this.changeNative({type:'verify.classify',request}).accepted)return;
            const interval=poll;poll=undefined;clearInterval(interval);
            Promise.resolve(this.classifyDirectFailure(nativeMediaError(mediaError))).then(error=>finish(error instanceof Error?error:new Error(String(error))),finish);return;
          }
          const tracks=(v as VideoWithAudioTracks).audioTracks;
          const facts:NativeVerificationFacts={now:performance.now(),readyState:v.readyState,videoWidth:v.videoWidth,time:v.currentTime,frames:v.getVideoPlaybackQuality().totalVideoFrames,decodedFrames:v.mozDecodedFrames,seeking:v.seeking,paused:v.paused,ended:v.ended,audio:{decodedBytes:v.webkitAudioDecodedByteCount,present:v.mozHasAudio,tracksPresent:!!tracks,enabledTrack:tracks?Array.from(tracks).some(track=>track.enabled):false}};
          assertCurrent();if(this.mpvAudio!==audio)throw new Error('Native verification was retired');
          const result=this.changeNative({type:'verify.sample',request,facts});
          if(result.failure){finish(failure(result.failure));return;}
          if(!result.completed)return;
          cleanBrowser();assertCurrent();
          if(output&&audio){
            const selected=audio;
            Promise.resolve(selected.verifyOutput(signal)).then(()=>{
              try{assertCurrent();if(this.mpvAudio!==selected)throw new Error('Native verification was retired');if(this.changeNative({type:'verify.audio',request}).accepted)finish();}
              catch(error){finish(error);}
            },error=>{
              try{assertCurrent();finish(new PlayerError('DECODE_FAILED','Selective audio runtime output was not verified: '+String(error)));}catch(retired){finish(retired);}
            });
          }else finish();
        }catch(error){finish(error);}
      };
      this.verificationCancel={request,cancel};this.cancelers.add(cancel);
      signal?.addEventListener('abort',aborted,{once:true});
      previous?.cancel(new Error('Native verification was retired'));
      void (async()=>{
        assertCurrent();await subtitles?.verify(signal);assertCurrent();
        audio=this.mpvAudio;
        const initialAudioBytes=v.webkitAudioDecodedByteCount,time=v.currentTime,frames=v.getVideoPlaybackQuality().totalVideoFrames,bounds=this.remux?.trackBounds;
        const facts={now:performance.now(),time,frames,audioBytes:initialAudioBytes,videoWidth:v.videoWidth,selectiveAudio:!!audio,metadataPreparation:!this.remux&&this.buffering.preload!=='auto',videoEnd:bounds?.videoEnd,audioEnd:bounds?.audioEnd,timelineBias:this.remux?.timelineBias??0};assertCurrent();
        if(!this.changeNative({type:'verify.start',request,...facts}).accepted)throw new Error('Native verification was retired');
        armTimer(output?outputBudgetMs:10000);assertCurrent();if(settled)return;
        const interval=setInterval(check,25);if(settled||!nativeRequestCurrent(this.native,request)){clearInterval(interval);return;}poll=interval;
        if(output&&typeof v.requestVideoFrameCallback==='function'){
          const registration={id:0};frame=registration;
          const acquired=v.requestVideoFrameCallback(()=>{if(frame!==registration||settled)return;frame=undefined;if(this.changeNative({type:'verify.presented',request}).accepted)check();});registration.id=acquired;
          if(frame!==registration||settled||!nativeRequestCurrent(this.native,request))v.cancelVideoFrameCallback(acquired);
        }
        assertCurrent();check();
      })().catch(finish);
    });
  }
  async verifyOutput(signal?:AbortSignal,outputBudgetMs=10000){await this.verifyStartup(this.expectedOutput,true,signal,outputBudgetMs);}
  private preparationError(error:unknown):unknown {
    // These are explicit media/profile rejections from the selected audio engine.
    // Source transport, asset failures and cancellations keep their original type.
    if(this.audioAdaptation==='flac24'&&/^(?:Error: )*FFmpeg error -1094995529:/.test(String(error)))return new PlayerError('DECODE_FAILED',String(error));
    return error;
  }
  private loadWait?:{request:NativeLoadRequest;controller:AbortController;interrupted:Promise<never>;cancel:(error:Error)=>void};
  private loadPolicy(requiresRemux=false):NativeLoadPolicy{return {requested:!!this.requestedPlan,original:this.execution?.transport==='original',remux:this.remuxPolicy,requiresRemux,adaptation:this.audioAdaptation};}
  private changeLoad(request:NativeLoadRequest,event:NativeLoadEvent){return this.changeNative({type:'load.event',request,event});}
  private assertLoad(request:NativeLoadRequest){this.assertNative(request);}
  private async awaitLoad<T>(request:NativeLoadRequest,value:PromiseLike<T>|T):Promise<T>{
    const observed=Promise.resolve(value);void observed.catch(()=>{});this.assertLoad(request);
    const pending=this.loadWait;if(pending?.request.id!==request.id)throw new Error('Native load was retired');
    const result=await Promise.race([observed,pending.interrupted]);this.assertLoad(request);return result;
  }
  private withLoad<T>(kind:'source'|'audio-track',policy:NativeLoadPolicy,position:number,paused:boolean,work:(request:NativeLoadRequest)=>Promise<T>):Promise<T>{
    this.assertActive();const previous=this.loadWait,verification=this.verificationCancel,seek=this.seekCancel,obsolete=kind==='source'?[...this.cancelers]:[];
    const request=this.changeNative({type:'load.begin',kind,policy,position,paused}).request as NativeLoadRequest;
    let controller:AbortController|undefined;
    try{controller=new AbortController();this.assertLoad(request);}catch(error){this.changeLoad(request,{type:'finish'});try{controller?.abort(error);}catch{}return Promise.reject(error);}
    const acquired=controller;let reject!:(error:Error)=>void,cancelled=false;const interrupted=new Promise<never>((_,no)=>{reject=no;});void interrupted.catch(()=>{});
    const cancel=(error:Error)=>{if(cancelled)return;cancelled=true;reject(error);if(!acquired.signal.aborted)acquired.abort(error);};
    const entry={request,controller:acquired,interrupted,cancel};this.loadWait=entry;this.cancelers.add(cancel);
    const finish=()=>{this.changeLoad(request,{type:'finish'});this.cancelers.delete(cancel);if(this.loadWait===entry)this.loadWait=undefined;};
    try{
      const errors:unknown[]=[];
      for(const retire of [()=>previous?.cancel(new Error('Native load was retired')),()=>verification?.cancel(new Error('Native verification was retired')),()=>seek?.cancel(new Error('Native seek presentation was retired')),...obsolete.map(cancel=>()=>cancel(new Error('Native source was retired')))])try{retire();}catch(error){errors.push(error);}
      this.assertLoad(request);if(errors.length)throw errors.length===1?errors[0]:new AggregateError(errors,'Native load retirement failed');
      return this.awaitLoad(request,work(request)).finally(finish);
    }catch(error){finish();return Promise.reject(error);}
  }
  private loadSignal(request:NativeLoadRequest):AbortSignal{this.assertLoad(request);return this.loadWait!.controller.signal;}
  private queueSourceCleanup(work:()=>Promise<void>):Promise<void>{
    const prior=this.sourceCleanup;
    const pending=prior.then(work,async previous=>{try{await work();}catch(error){throw new AggregateError([previous,error],'Native source cleanup failed');}throw previous;});
    this.sourceCleanup=pending;void pending.catch(()=>{});return pending;
  }
  private async awaitSourceCleanup(request:NativeLoadRequest){
    for(;;){const cleanup=this.sourceCleanup;await this.awaitLoad(request,cleanup);if(this.sourceCleanup===cleanup)return;}
  }
  private async drainSourceCleanup(){
    for(;;){const cleanup=this.sourceCleanup;let failure:unknown;try{await cleanup;}catch(error){failure=error;}if(this.sourceCleanup===cleanup){if(failure!==undefined)throw failure;return;}}
  }
  private async cleanupSourceHandles(remux:RemuxController|undefined,audio:typeof this.mpvAudio,subtitles:typeof this.mpvSubs,urls:readonly string[],tracks:readonly (()=>void)[]=[]){
    const errors:unknown[]=[];
    for(const clean of [()=>audio?.destroy(),()=>subtitles?.destroy(),()=>remux?.destroy(),...tracks,...urls.map(url=>()=>URL.revokeObjectURL(url))])try{await clean();}catch(error){errors.push(error);}
    if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Native source cleanup failed');
  }
  private async retireRemux(request:NativeLoadRequest){
    this.assertLoad(request);const remux=this.remux;this.remux=undefined;this.remuxEnginePath=undefined;
    if(remux)this.queueSourceCleanup(()=>this.cleanupSourceHandles(remux,undefined,undefined,[]));
    await this.awaitSourceCleanup(request);
  }
  private async retireSourceResources(request:NativeLoadRequest){
    this.assertLoad(request);const remux=this.remux,audio=this.mpvAudio,subtitles=this.mpvSubs,urls=[...this.ownedObjectURLs.keys(),...this.captionURLs],tracks=[...this.browserTracks.values()];
    this.remux=undefined;this.remuxEnginePath=undefined;this.mpvAudio=undefined;this.mpvSubs=undefined;this.projection=undefined;this.remuxSource=undefined;this.subtitleSource=undefined;this.remoteSource=undefined;this.objectURL=undefined;
    this.ownedObjectURLs.clear();this.captionURLs.clear();this.captionAssets.clear();this.browserTracks.clear();this.textAttachmentIds=new WeakMap();this.shiftedCues=new WeakSet();
    if(remux||audio||subtitles||urls.length||tracks.length)this.queueSourceCleanup(()=>this.cleanupSourceHandles(remux,audio,subtitles,urls,tracks.map(track=>track.release)));
    await this.awaitSourceCleanup(request);
  }
  private acquireObjectURL(file:Blob,request:NativeLoadRequest):string{
    this.assertLoad(request);const url=URL.createObjectURL(file);
    if(!nativeRequestCurrent(this.native,request)){URL.revokeObjectURL(url);this.assertLoad(request);}
    this.ownedObjectURLs.set(url,request.id);return url;
  }
  private installObjectURL(url:string,request:NativeLoadRequest){
    this.assertLoad(request);const old=this.objectURL;this.objectURL=url;
    if(old&&old!==url){const owner=this.ownedObjectURLs.get(old);if(owner!==undefined)this.releaseObjectURL(old,owner);}
    this.assertLoad(request);
  }
  private releaseObjectURL(url:string,owner:number){
    if(this.ownedObjectURLs.get(url)!==owner)return;
    this.ownedObjectURLs.delete(url);if(this.objectURL===url)this.objectURL=undefined;URL.revokeObjectURL(url);
  }
  private async startRemux(source:RemuxSource,target:number,request:NativeLoadRequest){
    this.assertLoad(request);
    const codecEngine=source.file&&this.audioAdaptation==='flac24'&&this.requestedPlan==='native-transcode'?this.providerRuntime?.preparation?.(source.file,this.remuxRuntime,source.audioTrack):undefined;
    this.assertLoad(request);
    const preparation=selectNativePreparation({codecEngine:!!codecEngine,file:!!source.file,adaptation:this.audioAdaptation,selectiveAudio:this.selectiveAudio,embeddedSubtitles:this.mpvSubtitlePlan,externalSubtitles:this.execution?.subtitles==='external',prepareAudio:!!this.providerRuntime?.prepareAudio});
    if(preparation.audio){
      const prepared=await this.awaitLoad(request,this.providerRuntime!.prepareAudio!(source.file!,this.loadSignal(request)));
      if(prepared){
        await this.retireRemux(request);const url=this.acquireObjectURL(prepared.file,request);let installed=false;
        try{
          await this.load(url,request);await this.awaitLoad(request,this.verifyStartup({video:true,audio:true}));
          if(target>0)await this.awaitLoad(request,this.wait('seeked',()=>{this.assertLoad(request);this.video.currentTime=target;},this.loadSignal(request)));
          this.installObjectURL(url,request);installed=true;this.projection=prepared;this.changeLoad(request,{type:'attempt',adapted:true});this.remuxSource=source;
          this.refresh(request);this.assertLoad(request);this.emit('source',{plan:'adapted-flac24',tracks:prepared.tracks});this.assertLoad(request);this.emit('mpv',{event:'file-loaded'});this.assertLoad(request);return;
        }catch(error){if(!installed)this.releaseObjectURL(url,request.id);throw error;}
      }
    }
    if(preparation.mp4){
      const {selectedMP4View}=await this.awaitLoad(request,import(new URL('web/selected-mp4-view.js',this.assetBase).href));
      const view=await this.awaitLoad(request,selectedMP4View(source.file,source.audioTrack,this.loadSignal(request)));
      if(view){
        await this.retireRemux(request);const url=this.acquireObjectURL(view.file,request);let installed=false;
        try{
          await this.load(url,request);await this.awaitLoad(request,this.verifyStartup({video:true,audio:true}));
          if(target>0)await this.awaitLoad(request,this.wait('seeked',()=>{this.assertLoad(request);this.video.currentTime=target;},this.loadSignal(request)));
          this.installObjectURL(url,request);installed=true;this.projection=view;this.remuxSource=source;
          this.refresh(request);this.assertLoad(request);this.emit('source',{plan:'remux',tracks:view.tracks});this.assertLoad(request);return;
        }catch(error){if(!installed)this.releaseObjectURL(url,request.id);this.assertLoad(request);this.changeLoad(request,{type:'projection-failed',reason:String(error)});}
      }
    }
    this.assertLoad(request);this.projection=undefined;
    if(typeof MediaSource==='undefined')throw Error('Native remux requires MediaSource');
    if(source.options?.format&&source.options.format!=='file')throw Error('Native remux currently requires a random-access file source; use Hybrid for this manifest');
    const moduleURL=new URL(codecEngine?codecEngine.folder+'native-remux-player.js':'web/native-remux-player.js',this.assetBase).href;
    const {RemuxPlayer}=await this.awaitLoad(request,import(moduleURL));
    const {refreshAuthorization,...options}=source.options??{};
    const transport={...source,...(codecEngine?{audioTrack:codecEngine.audioIndex,videoTrack:codecEngine.videoIndex}:{}),...(source.options?{options:options as RemoteSource}:{}),refreshAuthorization};
    this.assertLoad(request);
    const attempt=async(adapted:boolean)=>{
      this.assertLoad(request);this.changeLoad(request,{type:'attempt',adapted});
      const enginePath=codecEngine?.wasmPath??`web/engine-${adapted?'adaptation':'remux'}${this.remuxRuntime==='pthread'?'':'-'+this.remuxRuntime}/remux.wasm`;
      const replace=this.remux&&(this.remuxEnginePath!==enginePath||this.remux.audioAdaptation!==(adapted?this.audioAdaptation:undefined));this.assertLoad(request);
      if(replace)await this.retireRemux(request);
      const compiledWasm=this.providerRuntime?await this.awaitLoad(request,this.providerRuntime.module(enginePath)):undefined;this.assertLoad(request);
      let remux=this.remux;
      if(!remux){
        const acquired=new RemuxPlayer(this.video,{compiledWasm,buffering:{...resolveBuffering(this.buffering,'remux'),preload:this.buffering.preload},bufferedSeeks:this.bufferedSeeks,runtime:this.remuxRuntime,audioAdaptation:adapted?this.audioAdaptation:undefined,mseOwner:this.execution?.mseOwner??'auto'}) as RemuxController;
        if(!nativeRequestCurrent(this.native,request)){await this.queueSourceCleanup(()=>this.cleanupSourceHandles(acquired,undefined,undefined,[]));this.assertLoad(request);}
        this.remux=remux=acquired;
      }
      this.remuxEnginePath=enginePath;
      const owner=remux;
      owner.onBufferingChange=()=>{if(!this.stopped&&this.native.epoch===request.epoch&&this.remux===owner)this.refresh();};this.assertLoad(request);
      owner.audioAdaptation=adapted?this.audioAdaptation:undefined;this.assertLoad(request);
      owner.onError=message=>{if(!this.opening&&!this.stopped&&this.native.epoch===request.epoch&&this.remux===owner)this.emit('error',this.preparationError(message));};
      this.assertLoad(request);await this.awaitLoad(request,owner.open(transport,target));
    };
    try{await attempt(!!this.requestedPlan&&!!this.audioAdaptation);}
    catch(error){this.assertLoad(request);if(!this.changeLoad(request,{type:'attempt-failed',reason:String(error)}).fallback)throw this.preparationError(error);await attempt(true);}
    this.assertLoad(request);this.remuxSource=source;
    if(this.video.seeking)await this.awaitLoad(request,this.wait('seeked',()=>{},this.loadSignal(request)));
    this.assertLoad(request);const tracks=this.remux!.tracks;this.assertLoad(request);
    this.refresh(request);this.assertLoad(request);this.emit('source',{plan:this.adapted?`adapted-${this.audioAdaptation}`:'remux',tracks});this.assertLoad(request);this.emit('mpv',{event:'file-loaded'});this.assertLoad(request);
  }
  private async loadPlan(source: RemuxSource, direct: ()=>Promise<void>, requiresRemux=false, request:NativeLoadRequest) {
    this.assertLoad(request);const policy=this.native.load.work!.policy,decision=selectNativeLoadRoute({...policy,requiresRemux});
    if(decision.error)throw Error(decision.error);
    if(decision.route==='direct'){
      try{await this.awaitLoad(request,direct());return;}
      catch(error){
        this.assertLoad(request);const code=this.video.error?.code;this.assertLoad(request);
        if(!this.changeLoad(request,{type:'direct-failed',code,reason:String(error)}).fallback)throw error;
      }
    }
    await this.startRemux(source,0,request);this.assertLoad(request);
  }
  private async openServices(source:File|RemoteSource,request:NativeLoadRequest) {
    this.assertLoad(request);this.subtitleSource=source;
    if(this.selectiveAudio){
      this.video.muted=true;this.assertLoad(request);
      let audio:NonNullable<typeof this.mpvAudio>;
      if(this.remuxRuntime==='pthread'){
        const {NativeMpvAudio}=await this.awaitLoad(request,loadProviderModule('mpv-audio',this.assetBase));
        const prepared=this.providerRuntime?{module:await this.awaitLoad(request,this.providerRuntime.module('web/engine-selective/player.wasm')),font:await this.awaitLoad(request,this.providerRuntime.bytes('fixtures/DejaVuSans.ttf'))}:undefined;
        this.assertLoad(request);audio=new NativeMpvAudio(this.video,()=>this.sourceTime(),this.assetBase,error=>{if(!this.stopped&&this.native.epoch===request.epoch&&this.mpvAudio!==undefined&&this.mpvAudio===audio)this.emit('error',error);},prepared);
      }else{
        const {NativePrivateMpvAudio}=await this.awaitLoad(request,loadProviderModule('mpv-private-audio',this.assetBase));
        audio=new NativePrivateMpvAudio(this.video,()=>this.sourceTime(),this.assetBase,this.remuxRuntime,error=>{if(!this.stopped&&this.native.epoch===request.epoch&&this.mpvAudio!==undefined&&this.mpvAudio===audio)this.emit('error',error);});
      }
      if(!nativeRequestCurrent(this.native,request)){await this.queueSourceCleanup(()=>this.cleanupSourceHandles(undefined,audio,undefined,[]));this.assertLoad(request);}
      this.mpvAudio=audio;audio.setWatchdogs(this.watchdogs);this.assertLoad(request);
      await this.awaitLoad(request,audio.open(source,this.initialAudioTrack));
      await this.awaitLoad(request,audio.volume(this.requestedVolume));await this.awaitLoad(request,audio.gainValue(this.gainValue));
      if(this.requestedRate!==1)await this.awaitLoad(request,audio.rate(this.requestedRate));
      this.assertLoad(request);this.refresh(request);
    }
    if(this.mpvSubtitlePlan){
      const {NativeMpvSubtitles}=await this.awaitLoad(request,loadProviderModule('mpv-subtitles',this.assetBase));
      let subtitles:import('./native-mpv-subtitles.js').NativeMpvSubtitles|undefined;subtitles=new NativeMpvSubtitles(this.video,()=>this.sourceTime(),this.assetBase,this.fonts,source,error=>{if(!this.stopped&&this.native.epoch===request.epoch&&this.mpvSubs!==undefined&&this.mpvSubs===subtitles)this.emit('error',error);},this.defaultSubtitleStreamIndex,this.remuxRuntime);
      if(!nativeRequestCurrent(this.native,request)){await this.queueSourceCleanup(()=>this.cleanupSourceHandles(undefined,undefined,subtitles,[]));this.assertLoad(request);}
      this.mpvSubs=subtitles;
      await this.awaitLoad(request,subtitles.ready);await this.awaitLoad(request,subtitles.select('auto'));subtitles.visible(false);this.assertLoad(request);this.refresh(request);
    }
  }
  async open(file: File | ArrayBuffer) {
    this.assertActive();
    return this.withLoad('source',this.loadPolicy(),0,true,async request=>{
      await this.retireSourceResources(request);
      const local=file instanceof File?file:new File([file],'media');this.assertLoad(request);
      const url=this.acquireObjectURL(local,request);
      try{
        this.installObjectURL(url,request);
        await this.loadPlan({file:local,audioTrack:this.initialAudioTrack,videoOnly:this.selectiveAudio},()=>this.load(url,request),false,request);
        this.assertLoad(request);this.changeLoad(request,{type:'services'});await this.openServices(local,request);this.assertLoad(request);
      }catch(error){
        this.releaseObjectURL(url,request.id);
        if(this.selectiveAudio&&!isPlayerError(error)&&!(error instanceof DOMException&&['AbortError','NotAllowedError'].includes(error.name)))throw new PlayerError('DECODE_FAILED','Selective video preparation failed: '+String(error));
        throw error;
      }
    });
  }
  async openRemote(source: RemoteSource) {
    this.assertActive();const url=new URL(source.url,location.href);
    if(!['http:','https:'].includes(url.protocol))throw Error('Remote sources require HTTP or HTTPS');
    const requiresRemux=!!(source.headers||source.refreshAuthorization||source.allowedOrigins||source.immutable!==undefined||source.credentials==='omit'||this.mpvSubtitlePlan);
    return this.withLoad('source',this.loadPolicy(requiresRemux),0,true,async request=>{
      await this.retireSourceResources(request);this.assertLoad(request);
      this.video.crossOrigin=source.credentials==='include'?'use-credentials':'anonymous';this.assertLoad(request);
      await this.loadPlan({options:{...source,url:url.href},audioTrack:this.initialAudioTrack,videoOnly:this.selectiveAudio},async()=>{
        this.assertLoad(request);
        if(source.format&&source.format!=='file'){
          const mime=source.format==='hls'?'application/vnd.apple.mpegurl':'application/dash+xml',value=`canPlayType(${mime})=${this.video.canPlayType(mime)||'unknown'}`;this.assertLoad(request);this.changeNative({type:'api-hint',epoch:request.epoch,value});
        }
        this.remoteSource={...source,url:url.href};
        try{
          await this.load(url.href,request);this.assertLoad(request);
          if(source.format&&source.format!=='file'&&!Number.isFinite(this.video.duration))throw new PlayerError('SOURCE_PERMISSION','Native manifest has no finite VOD duration; live playback requires explicit Shaka live permission');
        }catch(error){this.assertLoad(request);throw await this.awaitLoad(request,this.classifyDirectFailure(error));}
      },requiresRemux,request);
      this.assertLoad(request);this.changeLoad(request,{type:'services'});await this.openServices({...source,url:url.href},request);this.assertLoad(request);
    });
  }
  private async classifyDirectFailure(error:unknown):Promise<unknown> {
    const source=this.remoteSource;
    if(this.stopped||this.remux||!source||!compatibilityFailure(error))return error;
    if(source.format&&source.format!=='file'){
      // Manifest endpoints need not implement random access or immutable file
      // identity. Check transport without parsing or scheduling the stream;
      // Shaka remains responsible for the next compatibility trial.
      const controller=new AbortController(),cancel=()=>controller.abort();
      const timer=setTimeout(cancel,10000);this.cancelers.add(cancel);
      let response:Response|undefined;
      try{
        response=await fetch(source.url,{credentials:source.credentials??'same-origin',redirect:'error',signal:controller.signal});
        this.assertActive();
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        return error;
      }catch(transport){return new Error(`Source transport: ${String(transport)}`);}
      finally{clearTimeout(timer);this.cancelers.delete(cancel);await response?.body?.cancel().catch(()=>{});}
    }
    // MEDIA_ERR_SRC_NOT_SUPPORTED can mask HTTP failures. Only a still-valid
    // inspected representation permits compatibility fallback, including errors
    // reported after acceptance. All validation reads belong to this candidate.
    const {RangeReader}=await import(new URL('web/range-reader.js',this.assetBase).href);
    this.assertActive();
    const reader=new RangeReader({...source,credentials:source.credentials??'same-origin',blockBytes:1024,cacheBytes:1024});
    const cancel=()=>reader.close();this.cancelers.add(cancel);
    try{await reader.open();this.assertActive();return error;}
    catch(transport){return new Error(`Source transport: ${String(transport)}`);}
    finally{this.cancelers.delete(cancel);reader.close();}
  }
  async play() {
    return this.withControl('playback',async request=>{
      const audio=this.mpvAudio,remux=this.remux,video=this.video;
      const start=()=>{const target=remux??video,play=target.play;this.assertControl(request);return play.call(target);};
      if(audio){const play=audio.play;this.assertControl(request);await this.awaitControl(request,play.call(audio,start));}
      else{const activation=this.resumeGain(request);if(activation)await activation;this.assertControl(request);await this.awaitControl(request,start());}
      this.assertControl(request);this.refresh();
    },false);
  }
  async pause() {
    return this.withControl('playback',async request=>{
      const audio=this.mpvAudio,remux=this.remux,video=this.video;
      const stop=()=>{const target=remux??video,pause=target.pause;this.assertControl(request);pause.call(target);};
      if(audio){const pause=audio.pause;this.assertControl(request);await this.awaitControl(request,pause.call(audio,stop));}else stop();
      this.assertControl(request);this.refresh();
    },true);
  }
  async seek(seconds:number){
    this.assertActive();const epoch=this.native.epoch,subtitles=this.mpvSubs,audio=this.mpvAudio;
    const current=()=>{this.assertActive();if(this.native.epoch!==epoch||this.mpvSubs!==subtitles||this.mpvAudio!==audio)throw new Error('Native seek was retired');};
    subtitles?.suspend(true);
    try{
      current();
      if(audio)await audio.seek(seconds,async()=>{current();this.remux?.pause();current();await this.seekVideo(seconds);});else await this.seekVideo(seconds);
      current();await subtitles?.seek(seconds);current();
    }catch(error){throw this.preparationError(error);}
    finally{if(!this.stopped&&this.native.epoch===epoch&&this.mpvSubs===subtitles)subtitles?.suspend(false);}
  }
  private async seekVideo(seconds: number) {
    this.assertActive();const epoch=this.native.epoch,remux=this.remux;
    const current=()=>{this.assertActive();if(this.native.epoch!==epoch||this.remux!==remux)throw new Error('Native seek was retired');};
    if(remux){
      const paused=remux.playbackPaused??this.video.paused;
      // Even a sub-millisecond movement can cross a source-frame boundary.
      const frameChanged=remux.expectedVideoFrame?.(seconds)!==remux.expectedVideoFrame?.(this.sourceTime());
      const presented=remux.canSeekBuffered?.(seconds)&&this.video.videoWidth&&(frameChanged||Math.abs(this.sourceTime()-seconds)>.001);current();
      if(presented){
        // Preserve the captured intent while validating the target source frame.
        remux.pause();current();await this.seekPresented(seconds,()=>remux.seek(seconds));
      }else await remux.seek(seconds);
      current();if(this.video.seeking)await this.wait('seeked',()=>{});
      current();if(!paused)await remux.play();current();this.refresh();return;
    }
    if (Math.abs(this.video.currentTime - seconds) < .001 && !this.video.seeking) return;
    current();await this.wait('seeked', () => {current();this.video.currentTime = seconds;});current();this.refresh();
  }
  private seekPresented(target:number, action:()=>Promise<unknown>):Promise<void> {
    this.assertActive();
    const presentation=this.remux,generation=presentation?.generation,mediaTarget=target+(presentation?.timelineBias??0),expected=presentation?.expectedVideoFrame?.(target),correlated=!!presentation?.muxedFrames||expected!==undefined;
    this.assertActive();
    const request=this.changeNative({type:'seek.begin',target,mediaTarget,correlated,now:performance.now()}).request!,previous=this.seekCancel;
    return new Promise((resolve,reject)=>{
      let settled=false,frame:{id:number}|undefined,timer:ReturnType<typeof setTimeout>|undefined,retryTimer:ReturnType<typeof setTimeout>|undefined;
      const retired=()=>!nativeRequestCurrent(this.native,request)||this.remux!==presentation||presentation?.generation!==generation||!nativeRequestCurrent(this.native,request)||this.remux!==presentation;
      const assertCurrent=()=>{if(retired())throw new Error('Native seek presentation was retired');};
      const finish=(error?:unknown)=>{
        if(settled)return;settled=true;this.changeNative({type:'seek.finish',request});
        const timeout=timer,retry=retryTimer,callback=frame;timer=undefined;retryTimer=undefined;frame=undefined;
        this.cancelers.delete(cancel);if(this.seekCancel?.request.id===request.id)this.seekCancel=undefined;
        for(const clean of [()=>clearTimeout(timeout),()=>clearTimeout(retry),()=>{if(callback?.id)this.video.cancelVideoFrameCallback(callback.id);},()=>this.video.removeEventListener('seeked',seeked),()=>this.video.removeEventListener('error',failed)])try{clean();}catch(cleanup){error??=cleanup;}
        error!==undefined?reject(error):resolve();
      };
      const cancel=(error:Error)=>finish(error),failed=()=>{try{assertCurrent();const error=nativeMediaError(this.video.error);assertCurrent();finish(error);}catch(error){finish(error);}};
      const facts=()=>{const result={position:this.video.currentTime,seeking:this.video.seeking};assertCurrent();return result;};
      const armFrame=()=>{
        assertCurrent();const registration={id:0};frame=registration;
        const acquired=this.video.requestVideoFrameCallback((_,metadata)=>{if(frame!==registration||settled)return;frame=undefined;next(metadata);});registration.id=acquired;
        if(frame!==registration||settled||retired())this.video.cancelVideoFrameCallback(acquired);
      };
      const armDeadline=(delay:number)=>{
        const acquired=setTimeout(expired,delay);if(settled||retired())clearTimeout(acquired);else timer=acquired;
      };
      const expired=()=>{
        timer=undefined;if(settled)return;
        try{assertCurrent();const result=this.changeNative({type:'seek.deadline',request,now:performance.now()});if(result.remaining!==undefined)armDeadline(result.remaining);else if(result.failure)finish(new Error('Native seek did not present the target'));}catch(error){finish(error);}
      };
      const armRetry=(delay:number)=>{
        const acquired=setTimeout(retry,delay);if(settled||retired())clearTimeout(acquired);else retryTimer=acquired;
      };
      const retry=()=>{
        retryTimer=undefined;if(settled)return;
        try{
          assertCurrent();const sample=facts(),paused=this.video.paused,buffered=!!presentation?.canSeekBuffered?.(target);assertCurrent();
          const result=this.changeNative({type:'seek.retry',request,facts:sample,now:performance.now(),paused,buffered});
          if(result.remaining!==undefined){armRetry(result.remaining);return;}
          if(!result.retry)return;
          const callback=frame;frame=undefined;if(callback?.id)this.video.cancelVideoFrameCallback(callback.id);
          assertCurrent();armFrame();assertCurrent();this.video.currentTime=mediaTarget;assertCurrent();
        }catch(error){finish(error);}
      };
      const seeked=()=>{
        if(settled)return;
        try{assertCurrent();const result=this.changeNative({type:'seek.seeked',request,facts:facts(),now:performance.now()});if(result.completed)finish();else if(result.remaining!==undefined)armRetry(result.remaining);}catch(error){finish(error);}
      };
      const next=(metadata:VideoFrameCallbackMetadata)=>{
        if(settled)return;
        try{
          assertCurrent();
          const matches=presentation?.matchesVideoFrame?.(target,metadata.mediaTime)??(expected!==undefined&&metadata.mediaTime>=expected+(presentation?.timelineBias??0)-.001&&metadata.mediaTime<=mediaTarget+.001),sample=facts();assertCurrent();
          const result=this.changeNative({type:'seek.frame',request,facts:sample,mediaTime:metadata.mediaTime,matches});
          if(result.completed)finish();else if(result.armFrame)armFrame();
        }catch(error){finish(error);}
      };
      this.seekCancel={request,cancel};this.cancelers.add(cancel);
      previous?.cancel(new Error('Native seek presentation was retired'));
      try{
        assertCurrent();armDeadline(10000);assertCurrent();this.video.addEventListener('seeked',seeked);assertCurrent();this.video.addEventListener('error',failed);assertCurrent();
        // The compositor may deliver a frame before queued seeking/seeked events.
        armFrame();assertCurrent();
        Promise.resolve().then(()=>{assertCurrent();return action();}).then(()=>{try{assertCurrent();if(this.changeNative({type:'seek.completed',request}).completed)finish();}catch(error){finish(error);}},finish);
      }catch(error){finish(error);}
    });
  }
  async rate(value:number){
    return this.withControl('rate',async request=>{
      const audio=this.mpvAudio;if(this.selectiveAudio){this.changeControl(request,{type:'rate',value});if(audio){const apply=audio.rate;this.assertControl(request);await this.awaitControl(request,apply.call(audio,value));}}
      else{this.video.defaultPlaybackRate=value;this.assertControl(request);this.video.playbackRate=value;this.assertControl(request);}
      this.refresh();
    });
  }
  async volume(value:number){
    return this.withControl('volume',async request=>{
      const audio=this.mpvAudio;if(this.selectiveAudio){this.changeControl(request,{type:'volume',value});if(audio){const apply=audio.volume;this.assertControl(request);await this.awaitControl(request,apply.call(audio,value));}}
      else{this.video.volume=value/100;this.assertControl(request);}
      this.refresh();
    });
  }
  async selectTrack(type: TrackType, id: string) {
    this.assertActive();
    if (type === 'audio') {
      if(this.mpvAudio){if(id!=='auto'&&Number(id)-1!==this.mpvAudio.selectedStreamIndex)throw new PlayerError('UNSUPPORTED_FEATURE',`Selective audio track switching requires route replacement (${id}; selected stream ${this.mpvAudio.selectedStreamIndex}; initial ${this.initialAudioTrack})`);return;}
      const audio = (this.video as VideoWithAudioTracks).audioTracks;
      if (id === 'auto') {this.video.muted = false;return;}
      if (id === 'no') {this.video.muted = true;return;}
      if((this.remux||this.projection)&&this.remuxSource){
        const track=(this.projection?.tracks??this.remux?.tracks)?.find(t=>t.type==='audio'&&t.id===id);
        if(!track)throw Error('Unknown remux audio track');
        if(!track.selected){
          const epoch=this.native.epoch,previous=this.remuxSource,position=this.sourceTime(),paused=this.video.paused;
          this.assertActive();if(this.native.epoch!==epoch||this.remuxSource!==previous)throw new Error('Native track selection was retired');
          await this.withLoad('audio-track',this.loadPolicy(true),position,paused,async request=>{
            await this.awaitSourceCleanup(request);
            try{await this.startRemux({...previous,audioTrack:Number(id)-1},position,request);}
            catch(error){
              this.assertLoad(request);
              if(this.changeLoad(request,{type:'track-failed'}).rollback){
                try{await this.startRemux(previous,position,request);}
                catch(recovery){this.assertLoad(request);this.emit('error',String(recovery));this.assertLoad(request);}
              }
              throw error;
            }finally{
              const completion=this.changeLoad(request,{type:'track-settled'});
              if(completion.accepted&&completion.resume){this.assertLoad(request);await this.awaitLoad(request,this.video.play());}
            }
            this.assertLoad(request);this.video.muted=false;this.assertLoad(request);this.refresh(request);this.assertLoad(request);
          });
          return;
        }
        this.video.muted=false;this.refresh();return;
      }
      if (!audio || !audio[Number(id) - 1]) throw new Error('Native audio track selection is not supported for this source/browser');
      this.video.muted = false;Array.from(audio).forEach((t, i) => {t.enabled = i === Number(id) - 1;});
    } else {
      await this.withControl('subtitles',async request=>{
        const subtitles=this.mpvSubs,tracks=subtitles?.tracks;this.assertControl(request);
        if(subtitles&&(id==='no'||id==='auto'||tracks!.some(track=>track.id===id))){const select=subtitles.select;this.assertControl(request);await this.captionEffect(request,()=>{this.assertControl(request);return select.call(subtitles,id);});}
        else{
          const browser=Array.from(this.video.textTracks);this.assertControl(request);
          if(!['auto','no'].includes(id)&&!browser.some(track=>this.textTrackId(track)===id))throw new Error('Unknown native subtitle track');
          if(subtitles){const select=subtitles.select;this.assertControl(request);await this.captionEffect(request,()=>{this.assertControl(request);return select.call(subtitles,'no');});}
        }
        this.assertControl(request);this.changeNative({type:'caption.selection',request,selected:id});this.applySubtitles();this.assertControl(request);this.refresh();
      });return;
    }
    this.refresh();
  }
  private applySubtitles() {
    const epoch=this.native.epoch,revision=this.native.captions.revision,subtitles=this.mpvSubs,current=()=>!this.stopped&&this.native.epoch===epoch&&this.native.captions.revision===revision&&this.mpvSubs===subtitles;
    const overlaySelected=!!subtitles?.tracks.some(t=>t.selected),preferred=this.video.querySelector<HTMLTrackElement>('track[default]')?.track,tracks=Array.from(this.video.textTracks);
    const plan=selectNativeCaptionPresentation(this.native.captions,{overlaySelected,preferredIndex:preferred?tracks.indexOf(preferred):null,tracks:tracks.map(track=>({id:this.textTrackId(track),caption:this.captionAssets.has(track)}))});if(!current())return;
    subtitles?.visible(plan.overlay);if(!current())return;
    for(let index=0;index<tracks.length;index++){tracks[index].mode=plan.modes[index];if(!current())return;}
  }
  private sinkWait=new Map<number,{request:NativeControlRequest;run:()=>Promise<void>;resolve:()=>void;reject:(error:unknown)=>void;cancel:(error:Error)=>void}>();
  private startSink(request:NativeControlRequest){
    const entry=this.sinkWait.get(request.id);if(!entry)return;
    const finish=(success:boolean,error?:unknown)=>{
      const decision=this.changeNative({type:'control.sink.finished',request});this.sinkWait.delete(request.id);this.controlWait.get(request.domain)?.cleanups.delete(entry.cancel);
      success?entry.resolve():entry.reject(error);if(decision.sinkStart)this.startSink(decision.sinkStart);
    };
    try{this.assertControl(request);Promise.resolve(entry.run()).then(()=>finish(true),error=>finish(false,error));}catch(error){finish(false,error);}
  }
  private applyAudioOutput(id:string,request:NativeControlRequest):Promise<void>{
    this.assertControl(request);const audio=this.mpvAudio,output=(audio??this.gainContext??this.video) as (NonNullable<typeof audio>|AudioContext|HTMLVideoElement)&{setSinkId?:(id:string)=>Promise<void>};
    const apply=audio?audio.setAudioOutputDevice:output.setSinkId;this.assertControl(request);
    if(!apply)return Promise.reject(new PlayerError('UNSUPPORTED_FEATURE','Output device selection is unavailable'));
    const decision=this.changeNative({type:'control.sink.begin',request});if(!decision.accepted)return Promise.reject(new Error('Native output control was retired'));
    const owner=this.controlWait.get(request.domain)!;
    const pending=new Promise<void>((resolve,reject)=>{
      const cancel=(error:Error)=>{reject(error);if(this.native.controls.sink.active?.id!==request.id)this.sinkWait.delete(request.id);owner.cleanups.delete(cancel);};
      this.sinkWait.set(request.id,{request,run:()=>{this.assertControl(request);return apply.call(output,audio?id:id==='default'?'':id);},resolve,reject,cancel});owner.cleanups.add(cancel);
      if(decision.sinkStart)this.startSink(decision.sinkStart);
    });
    return this.awaitControl(request,pending);
  }
  async setAudioOutputDevice(id:string){return this.withControl('output',async request=>{await this.applyAudioOutput(id,request);this.changeControl(request,{type:'output',value:id});});}
  async subtitleVisible(visible:boolean){return this.withControl('subtitle-visibility',request=>{this.changeNative({type:'caption.selection',request,visible});this.applySubtitles();this.assertControl(request);this.refresh();});}
  private captionEffects=new Map<number,{request:NativeCaptionEffect;run:()=>Promise<unknown>;resolve:(value:unknown)=>void;reject:(error:unknown)=>void;cancel:(error:Error)=>void}>();
  private startCaptionEffect(request:NativeCaptionEffect){
    const entry=this.captionEffects.get(request.id);if(!entry)return;
    const finish=(success:boolean,value:unknown)=>{const decision=this.changeNative({type:'caption.effect.finished',request});this.captionEffects.delete(request.id);const owner=request.kind==='caption'?this.captionWait.get(request.id):this.controlWait.get(request.domain);owner?.cleanups.delete(entry.cancel);success?entry.resolve(value):entry.reject(value);if(decision.captionStart)this.startCaptionEffect(decision.captionStart);};
    try{this.assertNative(request);Promise.resolve(entry.run()).then(value=>finish(true,value),error=>finish(false,error));}catch(error){finish(false,error);}
  }
  private captionEffect<T>(request:NativeCaptionEffect,run:()=>Promise<T>):Promise<T>{
    this.assertNative(request);const decision=this.changeNative({type:'caption.effect.begin',request});if(!decision.accepted)return Promise.reject(new Error('Native caption effect was retired'));
    const owner=request.kind==='caption'?this.captionWait.get(request.id)!:this.controlWait.get(request.domain)!;
    const work=new Promise<T>((resolve,reject)=>{const cancel=(error:Error)=>{reject(error);if(this.native.captions.effect?.id!==request.id)this.captionEffects.delete(request.id);owner.cleanups.delete(cancel);};this.captionEffects.set(request.id,{request,run,resolve:value=>resolve(value as T),reject,cancel});owner.cleanups.add(cancel);if(decision.captionStart)this.startCaptionEffect(decision.captionStart);});
    return request.kind==='caption'?this.awaitCaption(request,work):this.awaitControl(request,work);
  }
  private captionWait=new Map<number,{request:NativeCaptionRequest;interrupted:Promise<never>;cancel:(error:Error)=>void;cleanups:Set<(error:Error)=>void>}>();
  private assertCaption(request:NativeCaptionRequest){this.assertNative(request);}
  private async awaitCaption<T>(request:NativeCaptionRequest,value:PromiseLike<T>|T):Promise<T>{
    const observed=Promise.resolve(value);void observed.catch(()=>{});this.assertCaption(request);const pending=this.captionWait.get(request.id);if(!pending)throw new Error('Native caption was retired');
    const result=await Promise.race([observed,pending.interrupted]);this.assertCaption(request);return result;
  }
  private withCaption<T>(kind:NativeCaptionKind,attachmentId:string|undefined,work:(request:NativeCaptionRequest)=>Promise<T>):Promise<T>{
    this.assertActive();const now=performance.now();this.assertActive();const request=this.changeNative({type:'caption.begin',kind,attachmentId,now}).request as NativeCaptionRequest;
    let reject!:(error:Error)=>void,cancelled=false;const interrupted=new Promise<never>((_,no)=>{reject=no;});void interrupted.catch(()=>{});const cleanups=new Set<(error:Error)=>void>();
    const cancel=(error:Error)=>{if(cancelled)return;cancelled=true;reject(error);for(const cleanup of [...cleanups])cleanup(error);},entry={request,interrupted,cancel,cleanups};this.captionWait.set(request.id,entry);this.cancelers.add(cancel);
    const finish=()=>{this.changeNative({type:'caption.finish',request});this.captionWait.delete(request.id);this.cancelers.delete(cancel);};
    try{return this.awaitCaption(request,work(request)).catch(error=>{this.changeNative({type:'caption.remove',request});throw error;}).finally(finish);}catch(error){this.changeNative({type:'caption.remove',request});finish();return Promise.reject(error);}
  }
  private releaseBrowserTrack(request:NativeCaptionRequest){const owned=this.browserTracks.get(request.id);if(!owned)return;this.browserTracks.delete(request.id);this.captionAssets.delete(owned.element.track);this.textAttachmentIds.delete(owned.element.track);owned.release();}
  private async captionCleanup(request:NativeCaptionRequest){for(;;){const cleanup=this.sourceCleanup;await this.awaitCaption(request,cleanup);if(this.sourceCleanup===cleanup)return;}}
  async addSubtitle(asset:SubtitleAsset) {
    this.assertActive();const cues=plainVTT(asset);
    if(cues)return this.withCaption('browser-file',asset.attachmentId,async request=>{
      let url:string|undefined;
      try{
        url=URL.createObjectURL(new Blob([asset.bytes],{type:'text/vtt'}));if(!nativeRequestCurrent(this.native,request)){URL.revokeObjectURL(url);url=undefined;this.assertCaption(request);}this.captionURLs.add(url!);
        const track=await this.loadTextTrack({src:url!,label:asset.label,language:asset.language,default:false},request,true);
        track.track.mode='hidden';this.assertCaption(request);
        const loaded=Array.from(track.track.cues??[]) as VTTCue[],bias=this.remux?.timelineBias??0,facts=loaded.map(cue=>({start:cue.startTime,end:cue.endTime,text:cue.text}));this.assertCaption(request);
        if(!nativeCaptionFidelity(cues,facts,bias))throw new BrowserCaptionUnsupported('Browser WebVTT cue fidelity verification failed');
        this.changeNative({type:'caption.accept',request,publicId:null,select:!!asset.select});this.captionAssets.set(track.track,{asset,request});
        if(asset.select&&nativeCaptionMaySelect(this.native.captions,request)){const old=Array.from(this.video.querySelectorAll('track'));this.assertCaption(request);for(const value of old){value.default=false;this.assertCaption(request);}track.default=true;this.assertCaption(request);}
        this.applySubtitles();this.assertCaption(request);this.refresh();
      }catch(error){this.changeNative({type:'caption.remove',request});try{this.releaseBrowserTrack(request);}finally{if(url&&this.captionURLs.delete(url))URL.revokeObjectURL(url);}throw error;}
    });
    const rejection=nativeOverlayAdmission({adapted:this.adapted,adaptation:this.audioAdaptation,enabled:this.nativeASS,format:asset.format});if(rejection)throw new Error(rejection);
    return this.withCaption('overlay',asset.attachmentId,request=>this.captionEffect(request,async()=>{
      await this.captionCleanup(request);let subtitles=this.mpvSubs,created=false;
      if(!subtitles){
        const source=this.subtitleSource;if(!source)throw new Error('Missing subtitle media source');
        const {NativeMpvSubtitles}=await this.awaitCaption(request,loadProviderModule('mpv-subtitles',this.assetBase));
        let acquired:import('./native-mpv-subtitles.js').NativeMpvSubtitles|undefined;acquired=new NativeMpvSubtitles(this.video,()=>this.sourceTime(),this.assetBase,this.fonts,source,error=>{if(!this.stopped&&this.native.epoch===request.epoch&&this.mpvSubs===acquired)this.emit('error',error);},undefined,this.remuxRuntime);
        if(!nativeRequestCurrent(this.native,request)){await this.queueSourceCleanup(()=>this.cleanupSourceHandles(undefined,undefined,acquired,[]));this.assertCaption(request);}this.mpvSubs=subtitles=acquired;created=true;
      }
      const selected=subtitles;
      try{
        await this.awaitCaption(request,selected.ready);if(created)selected.tracks=[];this.assertCaption(request);
        const id=await selected.add({...asset,select:!!asset.select&&nativeCaptionMaySelect(this.native.captions,request)});this.assertCaption(request);this.changeNative({type:'caption.accept',request,publicId:id,select:!!asset.select});
        this.applySubtitles();this.assertCaption(request);this.refresh();
      }catch(error){if(created&&this.mpvSubs===selected){this.mpvSubs=undefined;await this.queueSourceCleanup(()=>this.cleanupSourceHandles(undefined,undefined,selected,[]));}throw error;}
    }));
  }
  async addTextTrack(source:TextTrackSource,attachmentId?:string){return this.withCaption('browser-url',attachmentId,async request=>{try{const track=await this.loadTextTrack(source,request,false);this.assertCaption(request);this.changeNative({type:'caption.accept',request,publicId:this.textTrackId(track.track),select:false});this.applySubtitles();this.assertCaption(request);this.refresh();}catch(error){this.changeNative({type:'caption.remove',request});this.releaseBrowserTrack(request);throw error;}});}
  private async loadTextTrack(source:TextTrackSource,request:NativeCaptionRequest,ownedCaption:boolean){
    this.assertCaption(request);const url=new URL(source.src,location.href);if(!['http:','https:','blob:'].includes(url.protocol))throw new Error('Text tracks require HTTP, HTTPS or a blob URL');
    const track=document.createElement('track');if(!nativeRequestCurrent(this.native,request)){track.remove();this.assertCaption(request);}
    const shift=()=>{if(nativeRequestCurrent(this.native,request))this.shiftTextTrack(track,request);};
    let released=false;const release=()=>{if(released)return;released=true;let error:unknown;try{track.removeEventListener('load',shift);}catch(failure){error=failure;}try{track.remove();}catch(failure){error??=failure;}if(error!==undefined)throw error;};
    this.browserTracks.set(request.id,{element:track,release});const textTrack=track.track;this.assertCaption(request);if(nativeCaptionAttachment(this.native.captions,request.id)?.attachmentId)this.textAttachmentIds.set(textTrack,request);
    track.kind='subtitles';this.assertCaption(request);track.label=source.label;this.assertCaption(request);track.srclang=source.language||'';this.assertCaption(request);track.default=!!source.default;this.assertCaption(request);track.src=url.href;this.assertCaption(request);
    await this.awaitCaption(request,new Promise<void>((resolve,reject)=>{
      let settled=false,timer:{handle?:ReturnType<typeof setTimeout>}|undefined;const owner=this.captionWait.get(request.id)!;
      const finish=(error?:unknown)=>{if(settled)return;settled=true;const timeout=timer;timer=undefined;owner.cleanups.delete(cancel);for(const cleanup of [()=>clearTimeout(timeout?.handle),()=>track.removeEventListener('load',loaded),()=>track.removeEventListener('error',failed)])try{cleanup();}catch(failure){error??=failure;}error===undefined?resolve():reject(error);};
      const loaded=()=>{try{this.assertCaption(request);shift();this.assertCaption(request);finish();}catch(error){finish(error);}},failed=()=>finish(ownedCaption?new BrowserCaptionUnsupported('Browser cannot load the owned WebVTT caption'):new Error('Native text track failed to load')),cancel=(error:Error)=>finish(error);
      const arm=(delay:number)=>{const registration:{handle?:ReturnType<typeof setTimeout>}={};timer=registration;const acquired=setTimeout(()=>{if(timer!==registration)return;timer=undefined;expired();},delay);registration.handle=acquired;if(settled||timer!==registration||!nativeRequestCurrent(this.native,request)){clearTimeout(acquired);this.assertCaption(request);}};
      const expired=()=>{try{const decision=this.changeNative({type:'caption.deadline',request,now:performance.now()});if(!decision.accepted){finish(new Error('Native caption was retired'));return;}if(decision.remaining!==undefined){arm(decision.remaining);return;}finish(new Error('Native text track load timed out'));}catch(error){finish(error);}};
      owner.cleanups.add(cancel);
      try{
        const now=performance.now();this.assertCaption(request);const deadline=this.changeNative({type:'caption.deadline',request,now});arm(deadline.remaining??0);this.assertCaption(request);if(settled)return;
        for(const [name,listener] of [['load',loaded],['error',failed],['load',shift]] as const){track.addEventListener(name,listener);if(settled||!nativeRequestCurrent(this.native,request)){track.removeEventListener(name,listener);this.assertCaption(request);return;}}
        this.video.append(track);this.assertCaption(request);track.track.mode='hidden';this.assertCaption(request);
      }catch(error){finish(error);}
    }));
    this.assertCaption(request);return track;
  }
  private shiftTextTrack(track:HTMLTrackElement,request:NativeCaptionRequest){
    this.assertCaption(request);const remux=this.remux;if(!remux)return;const bias=remux.timelineBias,cues=Array.from(track.track.cues??[]);this.assertCaption(request);
    for(const cue of cues)if(!this.shiftedCues.has(cue)){cue.startTime+=bias;this.assertCaption(request);cue.endTime+=bias;this.assertCaption(request);this.shiftedCues.add(cue);}
  }
  resize(width: number, height: number) {this.assertActive();this.video.width = width;this.video.height = height;}
  audioDiagnostics() {return this.mpvAudio?.diagnostics??{state: this.stopped ? 'closed' : this.video.paused ? 'paused' : 'running', source: 'native', decodedSampleCountersAvailable: false};}
  destroy():Promise<void> {
    if(this.destruction)return this.destruction;
    let resolve!:()=>void,reject!:(error:unknown)=>void;
    const destruction=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});this.destruction=destruction;
    void this.dispose().then(resolve,reject);return destruction;
  }
  private async dispose() {
    this.changeNative({type:'stop'});
    const remux=this.remux,audio=this.mpvAudio,subtitles=this.mpvSubs,urls=[...new Set([...this.ownedObjectURLs.keys(),...this.captionURLs])],tracks=[...this.browserTracks.values()];
    const gainSource=this.gainSource,gainNode=this.gainNode,gainContext=this.gainContext,listeners=this.listeners;
    const load=this.loadWait,verification=this.verificationCancel,seek=this.seekCancel,cancelers=[...this.cancelers];
    this.remux=undefined;this.remuxEnginePath=undefined;this.mpvAudio=undefined;this.mpvSubs=undefined;this.projection=undefined;this.remuxSource=undefined;this.subtitleSource=undefined;this.remoteSource=undefined;this.objectURL=undefined;
    this.gainSource=undefined;this.gainNode=undefined;this.gainContext=undefined;this.listeners=[];this.loadWait=undefined;this.verificationCancel=undefined;this.seekCancel=undefined;
    this.ownedObjectURLs.clear();this.captionURLs.clear();this.captionAssets.clear();this.browserTracks.clear();this.cancelers.clear();
    const errors:unknown[]=[],destroyed=new Error('Player is destroyed');
    for(const cancel of [()=>load?.cancel(destroyed),()=>verification?.cancel(destroyed),()=>seek?.cancel(destroyed),...cancelers.map(cancel=>()=>cancel(destroyed))])try{cancel();}catch(error){errors.push(error);}
    this.queueSourceCleanup(()=>this.cleanupSourceHandles(remux,audio,subtitles,urls,tracks.map(track=>track.release)));
    for(const clean of [()=>this.drainSourceCleanup(),()=>gainSource?.disconnect(),()=>gainNode?.disconnect(),()=>gainContext?.close(),...listeners,()=>this.video.pause(),()=>this.video.removeAttribute('src'),()=>this.video.replaceChildren(),()=>this.video.load()])try{await clean();}catch(error){errors.push(error);}
    if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Native player cleanup failed');
  }
}
