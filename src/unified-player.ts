// SPDX-License-Identifier: Apache-2.0
import {bufferingPolicy, resolveBuffering} from './internal/buffering.js';
import type {BufferingPolicy, BufferingResolution} from './types.js';
import {normalizeTrackPolicy,trackAllowed,defaultTrack,assertTrackSelection} from './internal/track-policy.js';
import type {TrackPolicy} from './types.js';
import {plainVTT, BrowserCaptionUnsupported} from './internal/plain-vtt.js';
import {RuntimeCapabilities, compatibilityFailure, evidenceInterrupted, NativeLoadTimeout, StartupEvidenceTimeout} from './internal/runtime-capability.js';
import type {CapabilityEvidence} from './internal/runtime-capability.js';
import {MediaCapabilityQueries} from './internal/media-capabilities.js';
import {nativeBrowserCapabilities} from './internal/browser-media-capability.js';
import type {BrowserMediaCapability} from './internal/browser-media-capability.js';
import {featureRejection, executionPlan, qualifiedAudioFilter, planAdmission} from './internal/playback-plans.js';
import {EnginePreparation,preparationComponents} from './internal/engine-preparation.js';
import {TierAttempts,preferredPlans} from './internal/tier-policy.js';
import {runtimeBase} from './internal/assets.js';
import {webgpuDecoderSupported,hasQualifiedWebGPUCodecs} from './internal/webgpu-codecs.js';
import {PlayerError, playerError, redact} from './internal/errors.js';
import {freeze, ranges, cachedRanges, tracks, trackKey, usesRemuxTracks, mediaInfo} from './internal/state.js';
import type {RawTrack} from './internal/state.js';
import type {PlayerState, PlayerEventMap, PlayerCapabilities, FeatureAvailability, SessionError, OperationKind, PendingOperation, OpenOptions, MediaSourceInput} from './types.js';
import {PLAYBACK_MODES} from './types.js';
import {nativeRejection,nativeManifestRejection,losslessAdaptationRejection,remuxRejection} from './internal/selection.js';
import type {PreparationOptions,PreparationReport} from './types.js';
import type {Probe, SelectionAttempt} from './internal/selection.js';
import type {AudioOutput, ToneMapping, FontAsset, SubtitleAsset, SubtitleOptions, ResourceLimits, MediaInputOptions, PlaybackMode, PlayerOptions, RemoteSource, TextTrackSource, Capabilities, Diagnostics, TrackType, PlaybackEvent} from './types.js';
import {backendPlan, type Backend, type Session} from './internal/backend.js';

import {PreviewController} from './preview/controller.js';
import {SoftwarePreviewProvider} from './preview/software.js';
import {LocalVideoPreviewProvider} from './preview/providers.js';
type Source = ({kind: 'local'; file: File | ArrayBuffer; input?: MediaInputOptions} | {kind: 'remote'; options: RemoteSource & {identity?: {size: string; etag?: string}}}) & {trackPolicy?:TrackPolicy};
class SeekPresentationBoundary extends PlayerError {
  constructor(target:number,boundary:number){super('INVALID_ARGUMENT',`Seek target ${target} is beyond the backend's audiovisual presentation end (${boundary}); subtitle-only seeking is not available on this plan`);}
}

type Settings = {pause: boolean; volume: number; speed: number; aid: string; sid: string; subtitles: boolean; vf: string; af: string; gain:number};
const filterChain = (value: string) => {
  if (typeof value !== 'string' || value.length > 4096 || value.includes('\0')) throw new PlayerError('INVALID_ARGUMENT','Invalid filter chain');
  return value.trim();
};
const terminalSourceFailure = (error: unknown) => /Source transport:|representation changed|changed length|origin is not allowed|integrity|source identity|Authorization refresh|HTTP (?:401|403)|received (?:401|403)/i.test(String(error));
const modeValue = (mode: PlaybackMode) => {
  if (!PLAYBACK_MODES.includes(mode)) throw new PlayerError('INVALID_ARGUMENT','Mode must be native, hybrid or software');
  return mode;
};
const dimensions = (width: number, height: number) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1920 || height > 1080) throw new PlayerError('INVALID_ARGUMENT','Output dimensions must be within 1920×1080');
};

/** Three explicit playback modes. Mode/filter changes reopen transactionally. */
export class Player extends EventTarget {
  readonly preview:PreviewController;
  private previewSource?:Blob;
  readonly ready = Promise.resolve();
  private assetBase: URL;
  private buffering: BufferingPolicy;
  private snapshot!: PlayerState;
  private subscribers = new Set<(state:PlayerState)=>void>();
  private publishQueued = false;
  private sourceSerial = 0;
  private publicSelections=new Map<TrackType,string>();
  private operationSerial = 0;
  private operationEpoch = 0;
  private activeOperation?: {id:number; kind:OperationKind|null; controller:AbortController; detachCallerAbort:()=>void};
  private pendingOperation: PendingOperation|null = null;
  private sessionError: SessionError|null = null;
  private observedPlaying = false;
  private observedWaiting = false;
  private muted = false;
  private closing?: Promise<void>;
  private currentMode: PlaybackMode;
  private automatic: boolean;
  private attempts: SelectionAttempt[] = [];
  private runtimeCapabilities=new RuntimeCapabilities();
  private tierAttempts=new TierAttempts();
  private promotionTimer?:ReturnType<typeof setTimeout>;
  private promotionEpoch=0;
  private promotionRunning=false;
  private promotionController?:AbortController;
  private backgroundPromotion?:{maxKnownBytes:number};
  private tierConfiguration(settings=this.settings){return JSON.stringify([settings.aid,settings.sid,settings.subtitles,settings.vf,settings.af,settings.gain,this.toneMapping,this.audioOutput,this.nativeRemux,this.mpvSubtitles,this.nativeASS,this.fonts.length,this.subtitleAssets.length,[...this.publicSelections]]);}
  private cancelPromotion(){clearTimeout(this.promotionTimer);this.promotionEpoch++;this.promotionController?.abort();if(this.promotionRunning){this.activeOperation?.controller.abort();this.inspection?.abort();void this.candidate?.backend.destroy().catch(()=>{});}}
  private schedulePromotion(){
    clearTimeout(this.promotionTimer);
    if(!this.automatic||!this.source||!this.current||this.current.error||this.destroyed)return;
    const epoch=this.promotionEpoch;
    this.promotionTimer=setTimeout(()=>{
      if(epoch!==this.promotionEpoch||this.queued||!this.automatic||!this.source||!this.current||this.current.error||(!this.settings.pause&&!this.backgroundPromotion)||this.observedWaiting)return;
      const controller=this.promotionController=new AbortController();
      void this.enqueue(async()=>{
        if(epoch!==this.promotionEpoch||!this.source||!this.current||!this.automatic)return;
        const current=this.diagnostics.plan?.id,source=this.source,settings={...this.settings};
        if(this.sourceInspection?.source!==source)await this.select(source,settings,true,this.nativeTracks,0,undefined,[],true);
        const inspected=this.sourceInspection;
        if(!current||!inspected||inspected.source!==source)return;
        const nativeReason=nativeRejection(inspected.probe,{...inspected.settings,subtitles:settings.subtitles,sid:settings.sid==='no'?'no':inspected.settings.sid});
        const plans=this.admissible(source,settings,this.subtitleAssets,this.nativeTracks,nativeReason,true);
        this.admissionContext={nativeReason,automatic:true};
        this.promotionRunning=true;
        try{for(const plan of preferredPlans(plans,current)){
          if(!settings.pause&&plan.mode!=='native')continue;
          if(this.tierAttempts.reason(source,this.tierConfiguration(settings),plan.id))continue;
          this.assertOperation();
          try{await this.replace(source,plan.mode,settings,true,this.nativeTracks,undefined,true,plan.id);return;}
          catch(error){if(compatibilityFailure(error))this.tierAttempts.failure(source,this.tierConfiguration(settings),plan.id,String(error));else return;}
        }}finally{this.promotionRunning=false;}
      },'switching',controller.signal,true).catch(()=>{}).finally(()=>{if(this.promotionController===controller)this.promotionController=undefined;});
    },200);
  }
  private readonly mediaCapabilityQueries=new MediaCapabilityQueries(typeof navigator==='undefined'||!navigator.mediaCapabilities?.decodingInfo?undefined:config=>navigator.mediaCapabilities.decodingInfo(config),150,()=>{
    if(this.destroyed)return;
    const inspected=this.sourceInspection;if(!inspected||inspected.source!==this.source)return;
    for(const plan of this.planDecisions)if(plan.browserCapability)plan.browserCapability.decodingInfo=this.mediaCapabilityQueries.cached(plan.browserCapability,inspected.probe);
    this.schedulePublish();this.schedulePromotion();
  });
  private sourceInspection?:{source:Source;probe:Probe;settings:{aid:string;sid:string;subtitles:boolean}};
  private fastInspectedSource?:Source;
  private mpvSubtitleAssetsAvailable=false;
  private selectiveAudioAssetsAvailable=false;
  private selectiveAudioAssetsChecked=false;
  private inspection?: AbortController;
  private recovering = false;
  private lifetime = new AbortController();
  private preparation?:EnginePreparation;
  private preparationTask:Promise<PreparationReport>=Promise.resolve({milliseconds:0,assets:[]});
  private recoveredSessions = new WeakSet<Session>();
  private failedStreamingPlans = new WeakMap<Source,Set<string>>();
  private audioAdaptation?:'flac'|'opus';
  private automaticLossless=false;
  private losslessInspection?:{source:Source;reason?:string};
  private bufferedNativeSeeks:boolean;
  private hybridAudioFilters: boolean;
  private nativeASS:boolean;
  private mpvSubtitles:boolean;
  private allowLossy=false;
  private planDecisions:Array<ReturnType<typeof planAdmission>[number]&{browserCapability?:BrowserMediaCapability}>=[];
  private admissionContext:{nativeReason?:string;automatic:boolean}={automatic:false};
  private nativeRemux: 'auto' | 'never' | 'always';
  private softwarePresenter: 'auto' | 'rgb' | 'experimental-yuv';
  private decodeQuality:'exact'|'balanced'|'performance';
  private adaptiveFrameDrop:boolean;
  private settings: Settings;
  private configuredTrackPolicy:TrackPolicy;
  get trackPolicy():TrackPolicy{return this.source?.trackPolicy??this.configuredTrackPolicy;}
  private audioOutput: AudioOutput;
  private audioFallback: 'stereo' | 'reject';
  private toneMapping: ToneMapping;
  private resourceLimits: ResourceLimits;
  private fonts: FontAsset[] = [];
  private subtitleAssets: SubtitleAsset[] = [];
  private root: HTMLDivElement;
  private width: number;
  private height: number;
  private current?: Session;
  private candidate?: Session;
  private source?: Source;
  private nativeTracks: TextTrackSource[] = [];
  private queue: Promise<void> = Promise.resolve();
  private queued = 0;
  private destroyed = false;
  private destruction?: Promise<void>;
  private busy = false;
  private empty = new Map<string, unknown>();
  private monitor?: ReturnType<typeof setInterval>;

  constructor(container: HTMLElement, options: PlayerOptions = {}) {
    super();
    this.configuredTrackPolicy=normalizeTrackPolicy(options.trackPolicy);
    const prepare=preparationComponents(options.prepare??[]);
    if (typeof HTMLElement==='undefined') throw new PlayerError('INVALID_ARGUMENT','Player construction requires a browser');
    this.buffering=bufferingPolicy(options.buffering);
    this.assetBase=runtimeBase(options.assetBase);
    if (!(container instanceof HTMLElement) || container instanceof HTMLCanvasElement || container instanceof HTMLVideoElement) throw new PlayerError('INVALID_ARGUMENT','Pass a container element; Player owns its video/canvas surface');
    this.preview=new PreviewController([
      {id:'shaka',priority:20,canHandle:()=>!!this.current?.backend.previewFrame,
        getFrame:request=>this.current?.backend.previewFrame?.(request)??Promise.resolve(null)},
      new LocalVideoPreviewProvider(()=>this.busy||this.queued>0||this.previewBuffering()?undefined:this.previewSource,container.ownerDocument,options.resourceLimits?.maxDecodePixels),
      new SoftwarePreviewProvider(()=>{
        if(this.busy||this.queued>0||this.previewBuffering())return undefined;
        if(this.previewSource)return {file:this.previewSource,input:this.source?.kind==='local'?this.source.input:undefined};
        if(this.source?.kind==='remote'&&!this.source.options.streaming?.live&&this.snapshot.streamType!=='live')return {remote:this.source.options};
        return undefined;
      },container.ownerDocument,this.assetBase,options.resourceLimits),
    ],options.preview===false?{enabled:false}:options.preview);
    this.currentMode = modeValue(options.mode ?? 'native');
    this.automatic = options.automaticSelection ?? options.mode === undefined;
    if(typeof this.automatic !== 'boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid automatic selection policy');
    this.audioOutput=options.audioOutput??'stereo';this.audioFallback=options.audioFallback??'stereo';
    this.toneMapping=options.toneMapping??'off';
    if(!['stereo','5.1','7.1','auto'].includes(this.audioOutput)||!['stereo','reject'].includes(this.audioFallback))throw new PlayerError('INVALID_ARGUMENT','Invalid audio output policy');
    if(!['off','hdr-to-sdr'].includes(this.toneMapping))throw new PlayerError('INVALID_ARGUMENT','Invalid tone mapping policy');
    this.resourceLimits={maxDecodePixels:options.resourceLimits?.maxDecodePixels??8294400,maxAllocationBytes:options.resourceLimits?.maxAllocationBytes??134217728};
    if(!Number.isInteger(this.resourceLimits.maxDecodePixels)||this.resourceLimits.maxDecodePixels!<1||this.resourceLimits.maxDecodePixels!>8294400||!Number.isInteger(this.resourceLimits.maxAllocationBytes)||this.resourceLimits.maxAllocationBytes!<33554432||this.resourceLimits.maxAllocationBytes!>268435456)throw new PlayerError('INVALID_ARGUMENT','Invalid decode resource limits');
    this.audioAdaptation=options.experimentalAudioAdaptation;
    if(options.automaticAudioAdaptation!==undefined&&options.automaticAudioAdaptation!=='lossless')throw new PlayerError('INVALID_ARGUMENT','Unsupported automatic audio adaptation policy');
    this.automaticLossless=options.automaticAudioAdaptation==='lossless';
    if(this.audioAdaptation!==undefined&&this.audioAdaptation!=='flac'&&this.audioAdaptation!=='opus')throw new PlayerError('INVALID_ARGUMENT','Unsupported audio adaptation policy');
    this.bufferedNativeSeeks=options.experimentalBufferedNativeSeeks??false;
    if(typeof this.bufferedNativeSeeks!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid buffered seek policy');
    this.hybridAudioFilters=options.experimentalHybridAudioFilters??false;
    if(typeof this.hybridAudioFilters!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid Hybrid audio filter policy');
    this.backgroundPromotion=options.experimentalBackgroundPromotion?{...options.experimentalBackgroundPromotion}:undefined;
    if(this.backgroundPromotion&&(!Number.isSafeInteger(this.backgroundPromotion.maxKnownBytes)||this.backgroundPromotion.maxKnownBytes<256*1024*1024))throw new PlayerError('INVALID_ARGUMENT','Background promotion needs at least 256 MiB of known-allocation budget');
    this.mpvSubtitles=options.experimentalMpvSubtitles??true;if(typeof this.mpvSubtitles!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid mpv subtitle policy');
    this.nativeASS=options.experimentalNativeASS??this.automatic;if(typeof this.nativeASS!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid Native ASS policy');
    this.allowLossy=options.allowLossyAudio??false;
    if(options.allowLossyAudio!==undefined&&typeof options.allowLossyAudio!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid lossy audio permission');
    if(this.audioAdaptation==='opus'&&options.allowLossyAudio!==true)throw new PlayerError('INVALID_ARGUMENT','Opus adaptation requires allowLossyAudio: true');
    this.nativeRemux=options.nativeRemux ?? 'auto';
    this.softwarePresenter=options.softwarePresenter??'auto';
    this.decodeQuality=options.decodeQuality??'exact';
    this.adaptiveFrameDrop=options.adaptiveFrameDrop??false;
    if(!['exact','balanced','performance'].includes(this.decodeQuality)||typeof this.adaptiveFrameDrop!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid Software decode policy');
    if(!['auto','rgb','experimental-yuv'].includes(this.softwarePresenter))throw new PlayerError('INVALID_ARGUMENT','Invalid software presenter');
    if(!['auto','never','always'].includes(this.nativeRemux))throw new PlayerError('INVALID_ARGUMENT','Invalid native remux policy');
    this.width = options.width ?? 640;this.height = options.height ?? 360;dimensions(this.width, this.height);
    this.settings = {pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: filterChain(options.videoFilters ?? ''), af: filterChain(options.audioFilters ?? ''), gain:options.audioGain??1};
    if(!Number.isFinite(this.settings.gain)||this.settings.gain<0||this.settings.gain>1)throw new PlayerError('INVALID_ARGUMENT','Gain must be between 0 and 1');
    if(this.automatic&&(this.settings.vf||this.settings.af||this.toneMapping!=='off'))this.currentMode=this.settings.vf||this.toneMapping!=='off'||!this.hybridAudioFilters||!qualifiedAudioFilter(this.settings.af)?'software':'hybrid';
    this.validateFilters(this.currentMode, this.settings);
    this.root = document.createElement('div');this.root.className = 'demuxe-player';container.append(this.root);
    this.publish();
    if(prepare.length)void this.prepare(prepare);
  }
  get state(): PlayerState {return this.snapshot;}
  get mediaInfo() {return this.snapshot.mediaInfo;}
  subscribe(listener:(state:PlayerState)=>void):()=>void {
    this.subscribers.add(listener);listener(this.snapshot);return ()=>{this.subscribers.delete(listener);};
  }
  addEventListener<K extends keyof PlayerEventMap>(type:K, listener:((this:Player,ev:PlayerEventMap[K])=>any)|null, options?:boolean|AddEventListenerOptions):void;
  addEventListener(type:string,listener:EventListenerOrEventListenerObject|null,options?:boolean|AddEventListenerOptions):void;
  addEventListener(type:string,listener:any,options?:boolean|AddEventListenerOptions) {super.addEventListener(type,listener,options);}
  removeEventListener<K extends keyof PlayerEventMap>(type:K, listener:((this:Player,ev:PlayerEventMap[K])=>any)|null, options?:boolean|EventListenerOptions):void;
  removeEventListener(type:string,listener:EventListenerOrEventListenerObject|null,options?:boolean|EventListenerOptions):void;
  removeEventListener(type:string,listener:any,options?:boolean|EventListenerOptions){super.removeEventListener(type,listener,options);}
  private schedulePublish() {
    if(this.publishQueued)return;this.publishQueued=true;
    queueMicrotask(()=>{this.publishQueued=false;if(!this.busy)this.publish();});
  }
  private sessionTracks(session=this.current,source=this.source,mode=this.mode,settings=this.settings):RawTrack[] {
    let raw=(session?.backend.properties.get('track-list')??[]) as RawTrack[];
    if(mode==='native'&&this.sourceInspection?.source===source&&this.sourceInspection){
      const plan=backendPlan(session?.backend);
      raw=raw.map(track=>{
        const key=trackKey(track,mode,plan),match=/^(audio|sub|video):stream:(\d+)$/.exec(key);
        const metadata=match?this.sourceInspection!.probe.tracks.find(t=>t.type===match[1]&&t.index===Number(match[2])):undefined;
        return metadata?{...metadata,...track,title:track.title||metadata.title,lang:track.lang||metadata.lang}:track;
      });
    }
    if(this.automatic&&mode==='native'&&this.sourceInspection&&this.sourceInspection.source===source){
      const embedded=this.sourceInspection!.probe.tracks.filter(t=>t.type==='sub'&&!raw.some(r=>r.type==='sub'&&r['ff-index']===t.index));
      raw=[...raw,...embedded.map(t=>({...t,id:String(t.index+1),type:'sub','ff-index':t.index,selected:false}))];
    }
    if(!this.sourceInspection||mode!=='native'||usesRemuxTracks(backendPlan(session?.backend))||this.sourceInspection?.source!==source)return raw;
    const audio=this.sourceInspection!.probe.tracks.filter(t=>t.type==='audio');
    const fallback=audio.find(t=>t.default)??audio[0];
    // Expose demux source identities even if HTMLMediaElement has no track API.
    // These are selectable requirements, not a claim of in-place browser support.
    return [...raw.filter(t=>t.type!=='audio'),...audio.map(t=>({...t,id:t.id,'ff-index':t.index,selected:settings.aid!=='no'&&t===fallback}))];
  }
  private sourceTracks():RawTrack[]{return this.sessionTracks();}
  private assertSubtitleAddition(title:string,language:string|undefined,codec:string){
    const track=tracks([{id:'external',type:'sub',title,lang:language,codec,external:true}],this.sourceSerial,this.mode)[0];
    assertTrackSelection(this.trackPolicy.subtitles,track.id,track);
  }
  private confirmTrackSelection(session:Session,source:Source|undefined,mode:PlaybackMode,settings:Settings,type:TrackType,id:string):Promise<void>{
    const matches=()=>{const raw=this.sessionTracks(session,source,mode,settings).filter(t=>t.type===type);return id==='no'?!raw.some(t=>t.selected):id==='auto'||raw.some(t=>String(t.id)===id&&t.selected);};
    if(matches())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const signal=this.activeOperation?.controller.signal;
      const finish=(error?:Error)=>{clearTimeout(timer);session.backend.removeEventListener('mpv',check);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
      const check=()=>{if(matches())finish();};
      const abort=()=>finish(new PlayerError('ABORTED','Track selection aborted'));
      const timer=setTimeout(()=>finish(new PlayerError('UNSUPPORTED_FEATURE','Backend did not apply the required track selection')),5000);
      session.backend.addEventListener('mpv',check);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();else check();
    });
  }
  private async applyTrackPolicy(session:Session,source:Source,mode:PlaybackMode,settings:Settings,preserve:boolean){
    const policy=source.trackPolicy;if(!policy)return;
    for(const type of ['audio','sub'] as const){
      const rule=type==='audio'?policy.audio:policy.subtitles;if(!rule)continue;
      const raw=this.sessionTracks(session,source,mode,settings),plan=backendPlan(session.backend);
      const inventory=tracks(raw,this.sourceSerial,mode,plan).filter(t=>t.type===(type==='audio'?'audio':'subtitle'));
      const current=inventory.find(t=>t.selected),key=type==='audio'?'aid':'sid';
      if(preserve&&(current?trackAllowed(current,rule):settings[key]==='no'&&rule.allowOff!==false))continue;
      const chosen=defaultTrack(inventory,rule);
      if(chosen&&type==='sub'&&!settings.subtitles){await session.backend.subtitleVisible(true);settings.subtitles=true;}
      if(chosen?.id===current?.id&&chosen){settings[key]=String(raw.find(t=>`${this.sourceSerial}:${trackKey(t,mode,plan)}`===chosen.id)!.id);continue;}
      const selected=chosen?raw.find(t=>`${this.sourceSerial}:${trackKey(t,mode,plan)}`===chosen.id):undefined;
      const id=selected?String(selected.id):'no';
      await session.backend.selectTrack(type,id);settings[key]=id;
      await this.confirmTrackSelection(session,source,mode,settings,type,id);
    }
  }
  private previewBuffering(){
    return !this.settings.pause&&(this.observedWaiting||this.properties.get('paused-for-cache')===true||this.properties.get('native-waiting')===true);
  }
  private publish() {
    const previous=this.snapshot,p=this.properties;
    let raw=this.sourceTracks();
    if(this.mode==='native'&&(this.surface as HTMLVideoElement|undefined)?.videoWidth&&!raw.some(t=>t.type==='video'))raw=[...raw,{id:'1',type:'video',selected:true}];
    const list=this.current?tracks(raw,this.sourceSerial,this.mode,backendPlan(this.current.backend)).filter(t=>trackAllowed(t,t.type==='audio'?this.trackPolicy.audio:t.type==='subtitle'?this.trackPolicy.subtitles:undefined)):[];
    const d=p.get('duration'),reportedDuration=typeof d==='number'&&Number.isFinite(d)&&d>=0?d:null;
    const observedLive=p.get('native-live');
    const live=typeof observedLive==='boolean'?observedLive:this.source?.kind==='remote'&&this.source.options.streaming?.live===true;
    const duration=live?null:reportedDuration;
    const streamType=!this.source?'unknown':live?'live':duration!==null?'vod':'unknown';
    const cache=p.get('demuxer-cache-state') as Record<string,unknown>|undefined;
    const seekable=!this.current?null:this.mode==='native'?ranges(p.get('native-seekable')):live?ranges(cache?.['seekable-ranges']):p.get('seekable')===false?[]:p.get('seekable')===true&&duration!==null?[{start:0,end:duration}]:null;
    const caps=this.featureCapabilities(seekable,list.filter(t=>t.type==='audio').length,list.filter(t=>t.type==='subtitle').length);
    const status=!this.current?(this.sessionError?'error':'idle'):this.sessionError?'error':p.get('eof-reached')===true?'ended':this.settings.pause||p.get('pause')===true?'paused':this.observedWaiting||p.get('paused-for-cache')===true||p.get('native-waiting')===true?'buffering':this.observedPlaying?'playing':'paused';
    const next:PlayerState={status,playbackIntent:this.settings.pause?'pause':'play',pendingOperation:this.pendingOperation,sourceId:this.current?this.sourceSerial:null,
      currentTime:Math.max(0,Number(p.get('time-pos'))||0),duration,streamType,subtitlesVisible:this.settings.subtitles,volume:this.settings.volume/100,muted:this.muted,playbackRate:this.settings.speed,
      activeMode:this.current?this.mode:null,automaticSelection:this.automatic,buffered:this.mode==='native'&&this.current?ranges(p.get('native-buffered')):null,seekable,
      cached:this.current&&this.mode!=='native'?cachedRanges(cache?.['seekable-ranges']):null,
      trackPolicy:this.trackPolicy,audioTracks:list.filter(t=>t.type==='audio'),subtitleTracks:list.filter(t=>t.type==='subtitle'),mediaInfo:mediaInfo(p,this.mode,this.surface,list),capabilities:caps,error:this.sessionError};
    // Priority can change even when the externally visible snapshot is identical.
    this.preview.setSuspended(this.busy||!!this.activeOperation||this.previewBuffering());
    this.preview.setDuration(this.current&&!this.busy&&streamType==='vod'?duration:null);
    if(previous&&JSON.stringify(previous)===JSON.stringify(next))return;
    this.snapshot=freeze(next);
    for(const fn of [...this.subscribers]) {try{fn(this.snapshot);}catch(error){globalThis.reportError?.(error);}}
    this.dispatchEvent(new CustomEvent('statechange',{detail:this.snapshot}));
    if(!previous)return;
    const changed=(a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b);
    for(const [event,a,b] of [
      ['sourcechange',previous.sourceId,next.sourceId],['durationchange',previous.duration,next.duration],
      ['trackschange',[previous.audioTracks,previous.subtitleTracks],[next.audioTracks,next.subtitleTracks]],
      ['capabilitieschange',previous.capabilities,next.capabilities],['volumechange',[previous.volume,previous.muted],[next.volume,next.muted]],
      ['ratechange',previous.playbackRate,next.playbackRate],['timeupdate',previous.currentTime,next.currentTime],
    ] as const) if(changed(a,b))this.dispatchEvent(new CustomEvent(event,{detail:this.snapshot}));
    if(previous.playbackIntent!==next.playbackIntent&&next.playbackIntent==='play')this.dispatchEvent(new CustomEvent('play',{detail:this.snapshot}));
    if(previous.status!==next.status) {const event=({playing:'playing',paused:'pause',buffering:'waiting',ended:'ended'} as Record<string,string>)[next.status];if(event)this.dispatchEvent(new CustomEvent(event,{detail:this.snapshot}));}
  }
  private featureCapabilities(seekable:PlayerState['seekable'],audio:number,sub:number):PlayerCapabilities {
    const isolated=globalThis.crossOriginIsolated===true,available:FeatureAvailability={availability:'available'};
    const unavailable=(reason:string):FeatureAvailability=>({availability:'unavailable',reason});
    const unknown:FeatureAvailability={availability:'unknown',reason:'Open a source to establish availability'};
    const nativeOverlay=(this.nativeASS||backendPlan(this.current?.backend)==='remux-mpv')&&isolated&&backendPlan(this.current?.backend)!=='adapted-opus'&&!(this.source?.kind==='remote'&&this.source.options.format&&this.source.options.format!=='file');
    const route=(mode:'hybrid'|'software'):FeatureAvailability=>!isolated?unavailable('This deployment requires cross-origin isolation'):this.mode===mode||(mode==='hybrid'&&this.mode==='software')?available:this.automatic?{availability:'switch',mode,reason:`This feature requires ${mode} playback`}:unavailable(`Select ${mode} mode first`);
    const resolution=this.bufferingResolution();
    return {...this.legacyCapabilities,buffering:{control:resolution.control,preload:true,profile:resolution.backend!=='browser',memoryBudget:['mpv','remux'].includes(resolution.backend)},deployment:{isolated,webCodecs:typeof VideoDecoder!=='undefined',mediaSource:typeof MediaSource!=='undefined'},features:{
      seek:seekable===null?{availability:'unknown',reason:'Seek window has not been established'}:seekable.length?available:unavailable('The source currently has no seekable time range'),
      audioTracks:!this.current?unknown:audio?available:unavailable('Audio track selection is not exposed by this source/browser'),
      subtitleTracks:!this.current?unknown:sub?available:unavailable('No subtitle tracks are available'),
      audioGain:this.mode==='native'?(typeof AudioContext==='undefined'?unavailable('Web Audio is unavailable'):available):route('hybrid'),
      externalSubtitles:this.mode==='native'?available:route('hybrid'),customFonts:this.mode==='native'&&nativeOverlay?available:route('hybrid'),videoFilters:route('software'),audioFilters:route(this.hybridAudioFilters?'hybrid':'software') }};
  }
  get mode() {return this.currentMode;}
  get automaticSelection() {return this.automatic;}
  get surface() {return this.current?.surface;}
  get properties(): ReadonlyMap<string, unknown> {return this.current?.backend.properties ?? this.empty;}
  get capabilities(): PlayerCapabilities {return this.snapshot?.capabilities??this.featureCapabilities(null,0,0);}
  private get legacyCapabilities(): Capabilities {
    return {videoFilters: this.automatic || this.mode === 'software', audioFilters: this.automatic || this.mode === 'software' || (this.mode === 'hybrid' && this.hybridAudioFilters), mpvSubtitles: this.mode !== 'native'||['remux-mpv','direct-mpv'].includes(backendPlan(this.current?.backend)??''), externalTextTracks: this.mode === 'native', externalSubtitles: true, customFonts: this.nativeASS || this.automatic || this.mode !== 'native', customRequestHeaders: backendPlan(this.current?.backend)==='shaka-mse' || this.mode !== 'native' || (this.nativeRemux !== 'never' && crossOriginIsolated && typeof MediaSource !== 'undefined')};
  }
  private bufferingResolution():BufferingResolution {
    const cheap=this.current?.backend.bufferingDiagnostics;
    if(cheap)return cheap;
    const diagnostics=this.current?.backend.diagnostics as {buffering?:BufferingResolution;plan?:string}|undefined;
    return diagnostics?.buffering??resolveBuffering(this.buffering,this.mode!=='native'?'mpv':diagnostics?.plan==='shaka-mse'?'shaka':usesRemuxTracks(diagnostics?.plan)?'remux':'browser');
  }
  get diagnostics(): Diagnostics {
    const backend=this.current?.backend.diagnostics as Record<string,unknown>|undefined;
    return redact({preview:this.preview.diagnostics,buffering:(backend?.buffering as BufferingResolution|undefined)??this.bufferingResolution(),mode: this.mode, plan:this.current?executionPlan(this.mode,backend?.plan as string|undefined,this.settings.af,this.settings.gain,!!backend?.subtitleOverlay):undefined, planAdmission:this.planDecisions,runtimeCapabilities:this.runtimeCapabilities.snapshot(),selection:{automatic:this.automatic,attempts:this.attempts.map(a=>({...a}))}, switching: this.busy, videoFilters: this.settings.vf, audioFilters: this.settings.af, audioGain:this.settings.gain, toneMapping:this.toneMapping, resourceLimits:{...this.resourceLimits}, decodeQuality:this.decodeQuality,adaptiveFrameDrop:this.adaptiveFrameDrop, backend});
  }
  audioDiagnostics() {return this.current?.backend.audioDiagnostics();}
  private emit(type: string, detail: unknown) {
    if(type==='error') {const error=playerError(detail,this.activeOperation?.id??null,this.activeOperation?.kind??null,'session');this.sessionError=error.toJSON();this.publish();detail=this.sessionError;}
    this.dispatchEvent(new CustomEvent(type, {detail:redact(detail)}));
  }
  private assertOperation() {if(this.destroyed||this.activeOperation?.controller.signal.aborted)throw new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted');}
  private validateFilters(mode: PlaybackMode, settings: Settings) {
    const reason=featureRejection(mode,{...settings,toneMapping:this.toneMapping,hybridAudioFilters:this.hybridAudioFilters});
    if(reason)throw new PlayerError('UNSUPPORTED_FEATURE',reason);
  }
  private enqueue(operation: () => Promise<void>, kind:OperationKind|null=null, signal?:AbortSignal, optimization=false): Promise<void> {
    if(!optimization)this.cancelPromotion();
    const id=++this.operationSerial,epoch=this.operationEpoch;
    if(this.destroyed)return Promise.reject(new PlayerError('ABORTED','Player is destroyed',id,kind));
    if(this.queued>=32&&kind!=='closing')return Promise.reject(new PlayerError('INVALID_ARGUMENT','Player operation queue is full',id,kind));
    this.queued++;
    const controller=new AbortController();
    const cancel=()=>{controller.abort();if(this.activeOperation?.id===id){this.inspection?.abort();void this.candidate?.backend.destroy().catch(()=>{});}};
    signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
    const result=this.queue.then(async()=>{
      if(epoch!==this.operationEpoch||this.destroyed||controller.signal.aborted)throw new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted',id,kind);
      this.activeOperation={id,kind,controller,detachCallerAbort:()=>signal?.removeEventListener('abort',cancel)};this.pendingOperation=kind?{id,kind}:null;this.publish();
      if(kind==='seeking')this.dispatchEvent(new CustomEvent('seeking',{detail:this.state}));
      try {await operation();this.assertOperation();}
      catch(error){if(optimization)return;const structured=playerError(controller.signal.aborted?new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted'):error,id,kind);
        if(!this.current&&kind==='opening'&&structured.code!=='ABORTED')this.sessionError={...structured.toJSON(),scope:'session'};
        this.publish();this.dispatchEvent(new CustomEvent('error',{detail:freeze(structured.toJSON())}));throw structured;
      } finally {this.activeOperation=undefined;this.pendingOperation=null;this.publish();}
      if(kind==='seeking')this.dispatchEvent(new CustomEvent('seeked',{detail:this.state}));
    }).finally(()=>signal?.removeEventListener('abort',cancel));
    this.queue=result.catch(()=>{}).finally(()=>{this.queued--;});return result;
  }
  private async interruptible<T>(work: Promise<T>): Promise<T> {
    const signal=this.activeOperation?.controller.signal??this.lifetime.signal;
    this.assertOperation();
    let cancel!: () => void;
    try{return await Promise.race([work,new Promise<never>((_,reject)=>{
      cancel=()=>reject(new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted'));signal.addEventListener('abort',cancel,{once:true});
    })]);}finally{signal.removeEventListener('abort',cancel);}
  }
  private async dispose(session?: Session) {
    if (!session) return;
    session.retired=true;
    try {await session.backend.destroy();} finally {session.surface.remove();}
  }
  /** Prepare immutable engine code and fonts without opening media or audio devices. */
  get preparationReady():Promise<PreparationReport>{return this.preparationTask;}
  get preparationProgress(){return this.preparation?.progress??[];}
  prepare(components:PreparationOptions='all'):Promise<PreparationReport>{
    const selected=preparationComponents(components);
    if(this.promotionRunning)this.cancelPromotion();
    if(this.destroyed||this.activeOperation)return this.preparationTask;
    this.preparation??=new EnginePreparation(this.assetBase,this.softwarePresenter==='rgb'?'engine-software-full':'engine-software-yuv',()=>{if(!this.destroyed)this.dispatchEvent(new CustomEvent('preparationchange',{detail:freeze(this.preparationProgress)}));});
    return this.preparationTask=this.preparation.warm(selected);
  }
  private async create(mode: PlaybackMode, aid='auto', adaptation?:'flac'|'opus', forcePreparation=false, planId?:string, loadTimeoutMs?:number): Promise<Session> {
    let backend: Backend;
    const surface = document.createElement(mode === 'native' ? 'video' : 'canvas');
    surface.width = this.width;surface.height = this.height;
    surface.style.cssText = 'display:none;width:100%;background:#000';
    // Import before allocating workers; destroy during import cannot orphan an engine.
    const module = planId?.startsWith('shaka-') ? await this.interruptible(import('./internal/shaka-backend.js')) : mode === 'native' ? await this.interruptible(import('./internal/native-player.js')) : await this.interruptible(import('./internal/wasm-player.js'));
    const prepared=mode==='native'?undefined:await this.interruptible(this.preparation?.readyEngine(mode==='hybrid'?'engine-hybrid':this.softwarePresenter==='rgb'?'engine-software-full':'engine-software-yuv')??Promise.resolve(undefined));
    this.assertOperation();
    this.root.append(surface);
    try {
      const subtitleTracks=this.sourceInspection?.probe.tracks.filter(t=>t.type==='sub')??[];
      const defaultSubtitleStreamIndex=(subtitleTracks.find(t=>t.default)??subtitleTracks[0])?.index;
      backend = 'ShakaBackend' in module ? new module.ShakaBackend(surface as HTMLVideoElement,this.assetBase,this.buffering) : 'NativePlayer' in module ? new module.NativePlayer(surface as HTMLVideoElement, forcePreparation?'always':this.nativeRemux,this.assetBase,this.bufferedNativeSeeks,adaptation,['auto','no'].includes(aid)?undefined:Number(aid)-1,this.nativeASS,this.fonts,planId,this.buffering,loadTimeoutMs,defaultSubtitleStreamIndex) : new module.WasmPlayer(surface as HTMLCanvasElement, {buffering:this.buffering,mode: mode as 'hybrid' | 'software',softwarePresenter:this.softwarePresenter,audioOutput:this.audioOutput,audioFallback:this.audioFallback,resourceLimits:this.resourceLimits,fonts:this.fonts,assetBase:this.assetBase,prepared,decodeQuality:this.decodeQuality,adaptiveFrameDrop:this.adaptiveFrameDrop,videoTrack:this.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture)});
    } catch (error) {surface.remove();throw error;}
    const session: Session = {backend, surface};
    for (const type of ['mpv', 'error', 'log', 'output', 'source', 'activity']) backend.addEventListener(type, event => {
      if(session.retired)return;
      const detail = (event as CustomEvent).detail;
      if(this.current===session&&this.promotionRunning&&((type==='activity'&&detail==='waiting')||(type==='mpv'&&detail.event==='property-change'&&detail.name==='paused-for-cache'&&detail.data===true)))this.cancelPromotion();
      if (type === 'error') session.error = detail instanceof Error?detail:new Error(String(detail));
      if (type === 'mpv' && detail.event === 'end-file' && detail.reason === 'error') session.error = new Error(String(detail.file_error));
      if (this.current === session && !this.busy && !this.destroyed) {
        if(session.error&&(type==='error'||(type==='mpv'&&detail.event==='end-file'))&&this.automatic&&this.mode!=='software'){this.recover(session);return;}
        if(type==='mpv'&&detail.event==='end-file'&&detail.reason==='error')this.emit('error',session.error);
        if(type==='activity') {
          if(detail==='waiting')this.observedWaiting=true;
          if(detail==='playing'){this.observedPlaying=true;this.observedWaiting=false;}
          this.schedulePublish();return;
        }
        if(type==='mpv') {
          if(detail.event==='property-change'&&detail.name==='track-list'&&!this.sessionError){
            const inventory=tracks(this.sourceTracks(),this.sourceSerial,this.mode,backendPlan(session.backend));
            const forbidden=inventory.some(t=>t.selected&&!trackAllowed(t,t.type==='audio'?this.trackPolicy.audio:t.type==='subtitle'?this.trackPolicy.subtitles:undefined));
            if(forbidden){this.settings.pause=true;void backend.pause().catch(()=>{});this.emit('error',new PlayerError('UNSUPPORTED_FEATURE','Backend selected a track excluded by the host policy'));return;}
          }
          if(detail.event==='property-change'&&detail.name==='time-pos'&&!this.settings.pause&&Number(detail.data)>this.state.currentTime){this.observedPlaying=true;this.observedWaiting=false;}
          if(detail.event==='property-change'&&detail.name==='pause'&&detail.data===true&&!this.activeOperation)this.settings.pause=true;
          this.schedulePublish();
        }
        this.emit(type, detail);
      }
    });
    return session;
  }
  private async settled(session: Session, mode: PlaybackMode, target: number) {
    if (mode === 'native') {
      const probe=this.sourceInspection?.probe;
      await (session.backend as Backend & {verifyStartup(expected?:{video:boolean;audio:boolean}):Promise<void>}).verifyStartup(probe?{video:probe.tracks.some(t=>t.type==='video'&&!t.attachedPicture),audio:this.sourceInspection!.settings.aid!=='no'&&probe.tracks.some(t=>t.type==='audio')}:undefined);
      return;
    }
    const deadline = performance.now() + 25000;
    while (performance.now() < deadline) {
      this.assertOperation();
      if (session.error) throw session.error;
      const boundary=(session.backend as Backend & {seekBoundary?:(target:number)=>number|undefined}).seekBoundary?.(target);
      if(boundary!==undefined)throw new SeekPresentationBoundary(target,boundary);
      const d = session.backend.diagnostics as {rendered?: number; seeking?: boolean; decoder?: string; presentation?: {position?: number}; presentedPosition?: number} | undefined;
      const tracks = session.backend.properties.get('track-list') as Array<{type: string; codec?: string; selected?: boolean}> | undefined;
      // Selection is transiently empty while mpv initializes a video track.
      const hasVideo = tracks?.some(t => t.type === 'video');
      if (hasVideo === false && tracks?.length && (!tracks.some(t=>t.type==='audio'&&t.selected)||session.backend.startupEvidence?.().audioDecoderConfigured)) return;
      if (mode === 'hybrid' && tracks?.some(t => t.type === 'video' && t.selected && !['h264','hevc','vp8','vp9','av1'].includes(t.codec ?? '')&&!webgpuDecoderSupported(t.codec??''))) throw new Error('Hybrid mode has no external decoder for this video codec. Choose software mode for this source.');
      const position = mode === 'hybrid' ? d?.presentation?.position : d?.presentedPosition;
      if (d?.rendered && (mode !== 'hybrid' || d.decoder === 'webcodecs'||d.decoder === 'webgpu') && !d.seeking && position !== undefined && Math.abs(position - target) < .15 && await (session.backend as Backend & {confirmSeek?:(target:number)=>Promise<boolean>}).confirmSeek?.(target)!==false) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`${mode} mode did not present the requested position`);
  }
  private fileServicesSource(source:Source):boolean {
    // Every URL consumer uses the inspected representation through RangeReader.
    // Manifests and explicit demuxer overrides retain their existing routes.
    return source.kind==='local'||(!source.options.demuxer&&(!source.options.format||source.options.format==='file')&&!!source.options.identity);
  }
  private admissible(source:Source,settings:Settings,attachments:SubtitleAsset[],textTracks:TextTrackSource[],nativeSourceRejection?:string,automatic=this.automatic){
    const remote=source.kind==='remote'?source.options:undefined;
    const inspected=this.sourceInspection?.source===source?this.sourceInspection:undefined;
    const video=inspected?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture);
    const subs=inspected?.probe.tracks.filter(t=>t.type==='sub')??[];
    const explicit=inspected?.probe.tracks.find(t=>t.type==='audio'&&t.id===inspected.settings.aid);
    const selected=settings.aid==='no'?undefined:(source===this.source?this.publicSelections.get('audio'):undefined)??(explicit?`audio:stream:${explicit.index}`:undefined);
    const selectedAudio=selected?.startsWith('audio:stream:')?inspected?.probe.tracks.find(t=>t.type==='audio'&&`audio:stream:${t.index}`===selected):undefined;
    const inspectedSettings=inspected?{...inspected.settings,aid:settings.aid==='no'?'no':selectedAudio?.id??(settings.aid==='auto'?'auto':inspected.settings.aid)}:undefined;
    const audioTracks=inspected?.probe.tracks.filter(t=>t.type==='audio')??[];
    const selectiveAudio=inspectedSettings?.aid==='no'?undefined:inspectedSettings?.aid==='auto'?(audioTracks.find(t=>t.default)??audioTracks[0]):audioTracks.find(t=>t.id===inspectedSettings?.aid);
    const selectiveVideo=inspected?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture);
    const selectiveSubtitle=inspected?.probe.tracks.find(t=>t.type==='sub'&&(inspectedSettings?.sid==='auto'?t.default||subs[0]===t:t.id===inspectedSettings?.sid));
    const selectiveVideoCapability=inspected?nativeBrowserCapabilities(inspected.probe,'no',{canPlayType:mime=>document.createElement('video').canPlayType(mime),isTypeSupported:typeof MediaSource==='undefined'?undefined:mime=>MediaSource.isTypeSupported(mime)}).remux:undefined;
    const selectiveAudioReason=!this.fileServicesSource(source)?'Selective audio requires an inspected random-access file':!inspected?'Source inspection required':
      !Number.isFinite(inspected.probe.duration)||inspected.probe.duration<=0?'Selective audio requires finite media':
      !selectiveVideo?'Selected video is unavailable':
      !selectiveAudio?'Selected audio is unavailable':
      !this.selectiveAudioAssetsAvailable?'Selective audio engine or worklet assets are unavailable':
      undefined;
    const decisions:typeof this.planDecisions=planAdmission({automatic,...settings,
      selectiveAudioQualified:!selectiveAudioReason,selectiveAudioReason,
      mpvSubtitles:this.mpvSubtitles,selectedEmbeddedSubtitle:!!(settings.subtitles&&selectiveSubtitle),
      mpvSubtitleSourceQualified:this.mpvSubtitleAssetsAvailable&&this.fileServicesSource(source)&&!!inspected&&Number.isFinite(inspected.probe.duration)&&inspected.probe.duration>0&&!!selectiveSubtitle&&settings.subtitles&&settings.sid!=='no',
      mpvSubtitleAVRejection:inspected?nativeRejection(inspected.probe,{...inspectedSettings!,subtitles:false}):'Source inspection required',
      shakaSourceRejection:remote?.demuxer?'Explicit demuxer hints require FFmpeg':undefined,
      streamingFallbackRejection:remote?.streaming?.maxBandwidth!==undefined||remote?.streaming?.representation!==undefined?'FFmpeg fallback cannot preserve an explicit adaptive quality constraint':undefined,
      remuxSourceRejection:inspected?remuxRejection(inspected.probe,inspectedSettings!):undefined,
      hybridSourceRejection:video&&!['h264','hevc','vp8','vp9','av1'].includes(video.codec)&&!webgpuDecoderSupported(video.codec)?`Demuxe has no external decoder contract for ${video.codec}`:undefined,webGPUCodecQualified:webgpuDecoderSupported(video?.codec??''),toneMapping:this.toneMapping,hybridAudioFilters:this.hybridAudioFilters,
      adaptation:this.audioAdaptation,allowLossy:this.allowLossy,nativeASS:this.nativeASS,externalFormats:attachments.map(a=>plainVTT(a)?'browser-vtt':a.format),browserTextTracks:!!textTracks.length,
      automaticLossless:this.automaticLossless,adaptationSourceRejection:source.kind!=='local'?'Automatic FLAC is qualified only for local files':this.losslessInspection?.source===source?this.losslessInspection.reason:'Automatic FLAC source has not been qualified',
      adaptationSourceQualified:source.kind==='local'&&this.losslessInspection?.source===source&&!this.losslessInspection.reason,
      audioOutput:this.audioOutput,nativeRemux:this.nativeRemux,manifest:!!remote?.format&&remote.format!=='file',
      requiresRemux:!!(remote&&(remote.headers||remote.refreshAuthorization||remote.allowedOrigins||remote.immutable!==undefined||remote.credentials==='omit'||!!(settings.subtitles&&selectiveSubtitle))),
      isolated:globalThis.crossOriginIsolated===true,mse:typeof MediaSource!=='undefined',webCodecs:typeof VideoDecoder!=='undefined',webAudio:typeof AudioContext!=='undefined',
      nativeSourceRejection:remote?.format&&remote.format!=='file'?nativeManifestRejection(remote,settings,!!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')):nativeSourceRejection});
    if(inspected){
      const element=document.createElement('video');
      const capabilities=nativeBrowserCapabilities(inspected.probe,inspectedSettings!.aid,{canPlayType:mime=>element.canPlayType(mime),isTypeSupported:typeof MediaSource==='undefined'?undefined:mime=>MediaSource.isTypeSupported(mime)});
      for(const plan of decisions){
        if(plan.mode==='hybrid'&&plan.eligible&&inspected.probe.hybridRejection){plan.eligible=false;plan.code='FEATURE_UNSUPPORTED';plan.reason=inspected.probe.hybridRejection;}
        if(!plan.id.startsWith('native-'))continue;
        const capability=plan.browserCapability=plan.id.startsWith('native-video-mpv-audio')?selectiveVideoCapability!:capabilities[plan.id.startsWith('native-direct')?'direct':plan.id.startsWith('native-flac')?'flac':plan.id.startsWith('native-opus')?'opus':'remux'];
        capability.decodingInfo=this.mediaCapabilityQueries.cached(capability,inspected.probe);
        if(plan.eligible&&capability.status==='unsupported'){plan.eligible=false;plan.code='FEATURE_UNSUPPORTED';plan.reason=capability.reason;}
      }
    }else{
      for(const plan of decisions)if(plan.id.startsWith('native-'))plan.browserCapability={status:'unknown',api:plan.id.startsWith('native-direct')?'canPlayType':'isTypeSupported',tracks:[],queries:[],reason:'Source track inspection is unavailable; codec support has not been established'};
    }
    if(selected?.startsWith('audio:stream:')){
      const audio=inspected?.probe.tracks.filter(t=>t.type==='audio')??[];
      const defaultTrack=audio.find(t=>t.default)??audio[0];
      if(!defaultTrack||selected!==`audio:stream:${defaultTrack.index}`)for(const plan of decisions)if(plan.id.startsWith('native-direct')&&plan.eligible){plan.eligible=false;plan.code='SOURCE_UNSUPPORTED';plan.reason='Original Native has no proven source-stream identity selection contract for the requested alternate audio';}
    }
    for(const plan of decisions)if(plan.eligible&&this.failedStreamingPlans.get(source)?.has(plan.id)){
      plan.eligible=false;plan.code='QUALIFICATION_REQUIRED';plan.reason='This execution plan already failed for the current streaming source';
    }
    return decisions;
  }
  private failedStreamingPlan(session:Session):boolean {
    if(this.source?.kind!=='remote'||!['hls','dash'].includes(this.source.options.format??''))return false;
    const plan=executionPlan(this.mode,backendPlan(session.backend),this.settings.af,this.settings.gain);
    const rejected=this.failedStreamingPlans.get(this.source)??new Set<string>();
    rejected.add(plan.id);this.failedStreamingPlans.set(this.source,rejected);return true;
  }
  private async replace(source: Source, mode: PlaybackMode, settings: Settings, preserve: boolean, nativeTracks: TextTrackSource[], requestedTarget?: number, automaticAdmission=this.automatic, planId?:string, directLoadBudget?:number) {
    if(!planId)return this.discover(source,settings,preserve,nativeTracks,requestedTarget,automaticAdmission,mode);
    if(this.sourceInspection?.source!==source)this.sourceInspection=undefined;
    this.validateFilters(mode, settings);
    const attachments=preserve?this.subtitleAssets:[];
    const admitted=this.admissible(source,settings,attachments,nativeTracks,automaticAdmission?this.admissionContext.nativeReason:undefined,automaticAdmission);
    if(!automaticAdmission)this.admissionContext={automatic:false};
    if(!admitted.some(p=>p.id===planId&&p.eligible)){
      const candidates=admitted.filter(p=>p.mode===mode);
      const rejection=candidates.find(p=>p.code==='ISOLATION_REQUIRED')??candidates.find(p=>p.code!=='PLAN_NOT_REQUESTED');
      throw new PlayerError(rejection?.code==='ISOLATION_REQUIRED'?'ISOLATION_REQUIRED':'UNSUPPORTED_FEATURE',rejection?.reason??'No qualified complete playback plan');
    }
    const queried=admitted.find(p=>p.id===planId)?.browserCapability;
    if(queried&&this.sourceInspection?.source===source){queried.decodingInfo=await this.mediaCapabilityQueries.inspect(queried,this.sourceInspection.probe);this.assertOperation();}
    if(mode==='native'&&attachments.length&&!attachments.every(a=>!!plainVTT(a))&&(!this.nativeASS||attachments.some(a=>!['ass','ssa'].includes(a.format))))throw Error('External mpv subtitles require Hybrid or Software');
    if(mode==='native'&&this.audioOutput!=='stereo')throw Error('Explicit PCM output layout requires Hybrid or Software');
    if (source.kind === 'local' && source.file instanceof ArrayBuffer && source.file.byteLength > 32 * 1024 * 1024) throw new Error('ArrayBuffer sources are limited to 32 MiB');
    const old = this.current;
    const wasPaused = this.settings.pause;
    const desired = {...settings, pause: preserve ? !!wasPaused : true};
    let target = requestedTarget ?? (preserve ? Math.max(0, Number(old?.backend.properties.get('time-pos')) || 0) : 0);
    if ((!preserve && old) || (preserve && (mode === 'native') !== (this.mode === 'native'))) {desired.aid = preserve&&settings.aid==='no'?'no':'auto';desired.sid = preserve&&settings.sid==='no'?'no':'auto';}
    // Public stream identities are known before Native preparation starts.
    // Select that stream at open rather than adapting the default track first.
    const publicAudio=preserve&&mode==='native'?/^audio:stream:(\d+)$/.exec(this.publicSelections.get('audio')??''):null;
    const initialAudio=!preserve&&!old&&!['auto','no'].includes(settings.aid)?this.sourceInspection?.probe.tracks.find(t=>t.type==='audio'&&t.id===settings.aid):undefined;
    const initialSubtitle=!preserve&&!old&&!['auto','no'].includes(settings.sid)?this.sourceInspection?.probe.tracks.find(t=>t.type==='sub'&&t.id===settings.sid):undefined;
    if(initialSubtitle&&(planId==='native-remux-mpv'||planId==='native-direct-mpv'||planId==='native-video-mpv-audio-subtitles'))desired.sid=String(initialSubtitle.index+1);
    if(publicAudio||initialAudio)desired.aid=planId.startsWith('native-direct')?'auto':String((publicAudio?Number(publicAudio[1]):initialAudio!.index)+1);
    if(mode!=='native'&&initialAudio)desired.aid=initialAudio.id;
    const crossing=preserve&&this.automatic&&(mode==='native')!==(this.mode==='native');
    const trackIndexes=new Map<TrackType,number>();
    let externalSubtitleKey:string|undefined;
    if(crossing){
      for(const type of ['audio','sub'] as const){
        if(type==='sub'&&!desired.subtitles)continue;
        if(this.publicSelections.has(type))continue;
        const id=settings[type==='audio'?'aid':'sid'];
        if(['auto','no'].includes(id))continue;
        const list=old?.backend.properties.get('track-list') as Array<{id:string|number;type:string;'ff-index'?:number}>|undefined;
        const track=list?.find(t=>t.type===type&&String(t.id)===id);
        if(type==='sub'&&(track as RawTrack)?.external){externalSubtitleKey=trackKey(track as RawTrack,this.mode);desired.sid='auto';continue;}
        const index=this.mode==='native'&&usesRemuxTracks(backendPlan(old?.backend))?Number(id)-1:track?.['ff-index'];
        if(index===undefined)throw Error('Cannot preserve selected track across playback modes');
        trackIndexes.set(type,index);
      }
    }
    if(this.activeOperation&&!this.pendingOperation){this.activeOperation.kind='switching';this.pendingOperation={id:this.activeOperation.id,kind:'switching'};}
    this.busy = true;this.publish();this.emit('modechange', {phase: 'loading', mode});
    let candidate: Session | undefined;
    const overlapping=!!(old&&!old.error&&this.promotionRunning&&this.backgroundPromotion&&!wasPaused&&mode==='native');
    // Reserve maximum explicit Wasm heaps plus configured packet queues. Browser
    // decoder/GPU allocations remain opaque and are not represented as a cap.
    const knownBytes=(session:Session)=>{const d=session.backend.diagnostics as {heapBytes?:number;remux?:{remux?:{heapBytes?:number}};mpvAudio?:{worker?:{heapBytes?:number}};mpvSubtitles?:{heapBytes?:number}};return (d.heapBytes??0)+(d.remux?.remux?.heapBytes??0)+(d.mpvAudio?Math.max(d.mpvAudio.worker?.heapBytes??0,128*1024*1024):0)+(d.mpvSubtitles?.heapBytes??0)+40*1024*1024;};
    const reserve=(planId==='native-video-mpv-audio-subtitles'?384:planId==='native-remux-mpv'||planId==='native-direct-mpv'||planId==='native-video-mpv-audio'?256:128)*1024*1024+40*1024*1024;
    let resourceMonitor:ReturnType<typeof setInterval>|undefined;
    try {
      if(overlapping&&knownBytes(old!)+reserve>this.backgroundPromotion!.maxKnownBytes)throw new PlayerError('ABORTED','Background candidate exceeds known-allocation budget');
      if (old && !old.error&&!overlapping) await old.backend.pause();
      if(overlapping){
        const drops=()=>Number((old!.backend.diagnostics as {dropped?:number}).dropped??0)+Number(old!.backend.properties.get('frame-drop-count')??0)+Number(old!.backend.properties.get('decoder-frame-drop-count')??0);
        const initialDrops=drops();
        resourceMonitor=setInterval(()=>{
          if(old!.error||this.observedWaiting||drops()>initialDrops||knownBytes(old!)+reserve>this.backgroundPromotion!.maxKnownBytes)this.cancelPromotion();
        },100);
      }
      const adaptation=planId.startsWith('native-flac')?'flac':planId.startsWith('native-opus')?'opus':undefined;
      candidate = this.candidate = await this.create(mode,desired.aid,adaptation,!planId.startsWith('native-direct'),planId,directLoadBudget);this.assertOperation();const p = candidate.backend;await this.interruptible(p.ready);
      this.assertOperation();
      const tone=this.toneMapping==='hdr-to-sdr'?'zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=mobius:desat=0,zscale=transfer=bt709:matrix=bt709:range=limited,format=yuv420p':'';
      const vf=[tone?`lavfi=[${tone}]`:'',desired.vf].filter(Boolean).join(',');
      if(vf)await p.command!('set','vf',vf);
      if(mode!=='native'&&desired.af)await p.command!('set','af',desired.af);
      await p.gain!(desired.gain);
      await p.volume(overlapping||this.muted?0:desired.volume);await p.rate(desired.speed);
      // Native numeric track IDs only exist after metadata/text-track loading.
      if (mode !== 'native') {await p.selectTrack('audio', desired.aid);await p.selectTrack('sub', desired.sid);await p.subtitleVisible(desired.subtitles);}
      if (source.kind === 'local') await this.interruptible(p.open(source.file,source.input));else await this.interruptible(p.openRemote(source.options));
      if('inspectMetadata' in p)await (p as Backend & {inspectMetadata():Promise<void>}).inspectMetadata();
      this.assertOperation();
      for(const subtitle of attachments)await p.addSubtitle!(subtitle);
      if(mode!=='native'&&attachments.length&&desired.sid!=='auto')await p.selectTrack('sub',desired.sid);
      if (mode === 'native') {
        for (const track of nativeTracks) await p.addTextTrack!(track);
        await p.selectTrack('audio', desired.aid);await p.selectTrack('sub', desired.sid);await p.subtitleVisible(desired.subtitles);
      }
      for(const [type,index] of trackIndexes){
        const list=p.properties.get('track-list') as Array<{id:string|number;type:string;'ff-index'?:number}>|undefined;
        const track=list?.find(t=>t.type===type&&(mode==='native'?usesRemuxTracks(backendPlan(p))&&Number(t.id)-1===index:t['ff-index']===index));
        if(!track)throw Error('Cannot preserve selected track across playback modes');
        const id=String(track.id);await p.selectTrack(type,id);desired[type==='audio'?'aid':'sid']=id;
      }
      if(externalSubtitleKey){const track=((p.properties.get('track-list')??[]) as RawTrack[]).find(t=>trackKey(t,mode)===externalSubtitleKey);if(!track)throw Error('Cannot preserve external subtitle identity');desired.sid=String(track.id);await p.selectTrack('sub',desired.sid);}
      if(preserve)for(const [type,key] of this.publicSelections){
        if(type==='sub'&&!desired.subtitles)continue;
        if(type==='audio'&&planId.startsWith('native-direct')){desired.aid='auto';continue;}
        const raw=(p.properties.get('track-list')??[]) as RawTrack[];
        const plan=backendPlan(p);
        const track=raw.find(t=>t.type===type&&trackKey(t,mode,plan)===key);
        if(!track)throw new PlayerError('UNSUPPORTED_FEATURE',`Cannot preserve explicit public track selection across playback modes (${key}; available ${raw.map(t=>trackKey(t,mode,plan)).join(', ')})`);
        const id=String(track.id);await p.selectTrack(type,id);desired[type==='audio'?'aid':'sid']=id;
      }
      await this.applyTrackPolicy(candidate,source,mode,desired,preserve);
      await this.settled(candidate, mode, 0);
      if(overlapping){
        this.assertOperation();await old!.backend.pause();
        target=Math.max(0,Number(old!.backend.properties.get('time-pos'))||0);
        clearInterval(resourceMonitor);
      }
      if (target > 0) {await p.seek(target);await this.settled(candidate, mode, target);}
      if (candidate.error) throw candidate.error;
      const actual=executionPlan(mode,backendPlan(p),desired.af,desired.gain,!!(p.diagnostics as {subtitleOverlay?:unknown})?.subtitleOverlay);
      if(!actual||actual.id!==planId||!admitted.some(plan=>plan.id===actual.id&&plan.eligible))throw new PlayerError('UNSUPPORTED_FEATURE','The prepared components do not match an admitted complete playback plan');
      if (!desired.pause) {if(mode==='native')await this.playNativeVerified(p);else await p.play();}
      this.assertOperation();
      if(overlapping)await p.volume(this.muted?0:desired.volume);
      if(!preserve){this.sourceSerial++;this.publicSelections.clear();if(initialAudio)this.publicSelections.set('audio',`audio:stream:${initialAudio.index}`);if(initialSubtitle)this.publicSelections.set('sub',`sub:stream:${initialSubtitle.index}`);}
      this.sessionError=null;this.observedPlaying=false;this.observedWaiting=false;
      if(queried&&this.sourceInspection?.source===source)queried.decodingInfo=this.mediaCapabilityQueries.cached(queried,this.sourceInspection.probe);
      this.planDecisions=admitted;this.runtimeCapabilities.admission(admitted);
      this.acceptEvidence(planId,candidate);
      this.preview.setSourceIdentity(`${this.sourceSerial}:${mode}`);
      this.previewSource=source.kind==='local'?(source.file instanceof Blob?source.file:new Blob([source.file])):undefined;
      this.current = candidate;this.candidate = undefined;this.source = source;this.currentMode = mode;this.settings = desired;this.nativeTracks = nativeTracks;if(!preserve)this.subtitleAssets=[];
      // Acceptance is the cancellation boundary, including synchronous observers.
      // close/destroy still abort the internal controller during old-session cleanup.
      this.activeOperation?.detachCallerAbort();
      this.publish();
      candidate.surface.style.display = 'block';if (old) old.surface.style.display = 'none';
      clearInterval(this.monitor);
      let inactiveSamples = 0;
      if (mode === 'hybrid') this.monitor = setInterval(() => {
        const d = p.diagnostics as {decoder?: string} | undefined;
        const hasVideo = (p.properties.get('track-list') as Array<{type: string; selected?: boolean}> | undefined)?.some(t => t.type === 'video' && t.selected);
        inactiveSamples = hasVideo && !this.busy && this.queued === 0 && d?.decoder === 'software' ? inactiveSamples + 1 : 0;
        if (inactiveSamples >= 4) {
          clearInterval(this.monitor);
          if(this.automatic){candidate!.error=new Error('Hybrid browser decoder became inactive for four consecutive checks');this.recover(candidate!);return;}
          this.settings.pause = true;void p.pause().catch(() => {});this.emit('error', 'Hybrid decoder stopped. Reopen in software mode.');
        }
      }, 250);
      // The new session is committed. Cleanup failures must not pretend to roll it back.
      try {await this.dispose(old);} catch (error) {this.dispatchEvent(new CustomEvent('error',{detail:freeze(playerError(error,this.activeOperation?.id??null,this.activeOperation?.kind??null,'operation').toJSON())}));}
      for (const [name, data] of p.properties) this.emit('mpv', {event: 'property-change', name, data} satisfies PlaybackEvent);
      this.emit('mpv', {event: 'file-loaded'});this.emit('modechange', {phase: 'ready', mode, position: target});
    } catch (error) {
      if(candidate)this.runtimeCapabilities.update(planId,'probing',this.evidence(candidate));
      if (candidate && candidate !== this.current) await this.dispose(candidate).catch(() => {});
      this.candidate = undefined;
      if (old && !old.error && this.current === old && !wasPaused && !this.destroyed && !this.closing) await old.backend.play().catch(() => {});
      this.emit('modechange', {phase: 'failed', mode, rolledBack: this.current === old, message: String(error)});
      throw error;
    } finally {clearInterval(resourceMonitor);this.busy = false;this.publish();}
  }
  private record(attempt: SelectionAttempt){
    this.attempts.push(attempt);if(this.attempts.length>32)this.attempts.shift();
    this.emit('selectionchange',{...attempt});
  }
  private async inspectForQualifiedWebGPU(source:Source,settings:Settings):Promise<void>{
    if(!hasQualifiedWebGPUCodecs())return;
    if(this.sourceInspection?.source===source){
      const video=this.sourceInspection.probe.tracks.find(track=>track.type==='video'&&!track.attachedPicture);
      if(!video||!webgpuDecoderSupported(video.codec)||video.webCodecsSupported!==undefined)return;
    }
    const controller=this.inspection=new AbortController();
    try{
      const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
      const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
      const compiledWasm=await this.interruptible(this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
      const probe:Probe=await probeSource(transport,controller.signal,undefined,compiledWasm);
      this.assertOperation();
      this.sourceInspection={source,probe,settings:{aid:settings.aid,sid:settings.sid,subtitles:settings.subtitles}};
    }catch(error){
      if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error))throw error;
      // Unknown inspection still permits the existing WebCodecs trial.
    }finally{if(this.inspection===controller)this.inspection=undefined;}
  }
  private async inspectWithFFmpeg(source:Source,controller:AbortController):Promise<Probe>{
    const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
    const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
    const compiledWasm=await this.interruptible(this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
    this.assertOperation();
    const probe:Probe=await probeSource(transport,controller.signal,undefined,compiledWasm);
    this.assertOperation();
    return probe;
  }
  private async optionalAssetsAvailable(names:string[],controller:AbortController){
    const assetController=new AbortController();
    const abort=()=>assetController.abort();controller.signal.addEventListener('abort',abort,{once:true});
    const deadline=setTimeout(abort,5000);
    try{const responses=await Promise.all(names.map(name=>fetch(new URL(name,this.assetBase),{method:'HEAD',signal:assetController.signal})));return responses.every(response=>response.ok);}
    catch(error){if(controller.signal.aborted)throw error;return false;}
    finally{clearTimeout(deadline);controller.signal.removeEventListener('abort',abort);}
  }
  private async checkInspectedAssets(source:Source,probe:Probe,settings:Settings,sid:string,controller:AbortController){
    this.selectiveAudioAssetsAvailable=false;this.selectiveAudioAssetsChecked=false;this.mpvSubtitleAssetsAvailable=false;
    if(this.mpvSubtitles&&this.fileServicesSource(source)&&settings.subtitles&&sid!=='no'&&probe.tracks.some(t=>t.type==='sub'))
      this.mpvSubtitleAssetsAvailable=await this.optionalAssetsAvailable(['web/engine-subtitles/service.mjs','web/engine-subtitles/service.wasm'],controller);
    this.assertOperation();
  }
  private async inspectFallbackAfterFastFailure(source:Source,settings:Settings):Promise<string|undefined>{
    this.fastInspectedSource=undefined;
    if(!globalThis.crossOriginIsolated){
      this.sourceInspection=undefined;this.mpvSubtitleAssetsAvailable=false;this.selectiveAudioAssetsAvailable=false;this.selectiveAudioAssetsChecked=false;
      return 'Wasm inspection requires cross-origin isolation';
    }
    const controller=this.inspection=new AbortController();
    try{
      const probe=await this.inspectWithFFmpeg(source,controller);
      const inspectedSettings={aid:'auto',sid:'auto',subtitles:settings.subtitles};
      this.sourceInspection={source,probe,settings:inspectedSettings};
      await this.checkInspectedAssets(source,probe,settings,'auto',controller);
      this.record({mode:'probe',outcome:'selected',reason:'FFmpeg reinspection after Fast Inspector Direct startup failure'});
      return nativeRejection(probe,inspectedSettings);
    }catch(error){
      if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error))throw error;
      this.sourceInspection=undefined;this.mpvSubtitleAssetsAvailable=false;this.selectiveAudioAssetsAvailable=false;this.selectiveAudioAssetsChecked=false;
      this.record({mode:'probe',outcome:'failed',reason:`FFmpeg reinspection after Direct failure: ${String(error)}`});
      return 'Native eligibility could not be established: '+String(error);
    }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
  }
  private async select(source: Source, settings: Settings, preserve: boolean, tracks: TextTrackSource[], start=0, target?: number, priorAttempts:SelectionAttempt[]=[],inspectOnly=false){
    if(!this.automatic&&this.mode!=='native'){
      if(this.mode==='hybrid')await this.inspectForQualifiedWebGPU(source,settings);
      if(this.mode==='software'&&(this.decodeQuality!=='exact'||this.adaptiveFrameDrop)&&this.sourceInspection?.source!==source){
        // Explicit Software skips the normal tier probe. Quality admission still
        // needs codec identity before mpv constructs its decoder.
        const controller=this.inspection=new AbortController();
        try{
          const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
          const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
          const compiledWasm=await this.interruptible(this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
          const probe:Probe=await probeSource(transport,controller.signal,undefined,compiledWasm);
          this.assertOperation();
          this.sourceInspection={source,probe,settings:{aid:settings.aid,sid:settings.sid,subtitles:settings.subtitles}};
        }catch(error){
          if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error))throw error;
          // The decoder remains usable when optional codec inspection cannot
          // classify a file; the unknown-codec policy permits exact only.
        }finally{if(this.inspection===controller)this.inspection=undefined;}
      }
      return this.replace(source,this.mode,settings,preserve,tracks,target);
    }
    this.attempts=[];
    for(const attempt of priorAttempts)this.record(attempt);
    let nativeReason: string | undefined;
    if(start===0||this.sourceInspection?.source!==source){this.losslessInspection=undefined;this.sourceInspection=undefined;this.fastInspectedSource=undefined;this.mpvSubtitleAssetsAvailable=false;this.selectiveAudioAssetsAvailable=false;this.selectiveAudioAssetsChecked=false;}
    // A later Direct playback failure can resume discovery beyond Native.
    // Fast metadata only proves Direct admission; inspect before other plans.
    if(start>0&&this.fastInspectedSource===source)
      nativeReason=await this.inspectFallbackAfterFastFailure(source,settings);
    if(start===0&&!(settings.vf||settings.af||this.toneMapping!=='off')){
      if((source.kind==='local'&&source.input?.demuxer)||(source.kind==='remote'&&(source.options.demuxer||(source.options.format&&source.options.format!=='file')))){
        nativeReason=source.kind==='remote'?nativeManifestRejection(source.options,settings,!!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')):'Explicit demuxer requires FFmpeg';
      }else{
        const controller=this.inspection=new AbortController();
        try{
          let probe:Probe|undefined, fastProbe=false;
          // Immutable local bytes permit bounded inspection without an engine download.
          // Remote identity/permission enforcement continues through the existing inspector.
          if(source.kind==='local'&&this.nativeRemux!=='always'){
            const local=source.file instanceof File?source.file:new File([source.file],'media');
            // The filename only bypasses an optimization: FFmpeg still inspects
            // these known-unsupported families, whatever their actual bytes are.
            if(!preserve&&!tracks.length&&settings.aid==='auto'&&settings.sid==='auto'&&!/\.(?:ogg|oga|opus|ts|m2ts)$/i.test(local.name)){
              try{
                const {inspectFastSource}=await this.interruptible(import(new URL('web/fast-source-inspector.js',this.assetBase).href));
                const fast=await inspectFastSource(local,{signal:controller.signal});
                this.assertOperation();
                if(fast.status==='qualified'){
                  probe=fast.evidence as Probe;fastProbe=true;
                  this.record({mode:'probe',outcome:'selected',reason:`Fast local metadata: ${fast.bytesRead} bytes; routing admission pending`});
                }else this.record({mode:'probe',outcome:'skipped',reason:`Fast local metadata: ${fast.bytesRead} bytes; ${fast.reason}`});
              }catch(error){
                if(controller.signal.aborted||this.activeOperation?.controller.signal.aborted||terminalSourceFailure(error))throw error;
                this.record({mode:'probe',outcome:'skipped',reason:`Fast inspector unavailable: ${String(error)}`});
              }
            }
          }
          this.assertOperation();
          if(!probe&&globalThis.crossOriginIsolated)probe=await this.inspectWithFFmpeg(source,controller);
          if(!probe)this.record({mode:'probe',outcome:'skipped',reason:'Wasm inspection requires cross-origin isolation; browser-native routes remain available'});
          if(probe){
          for(let inspectionPass=0;inspectionPass<2;inspectionPass++){
          if(source.kind==='remote'&&probe.identity)source.options.identity??=probe.identity;
          // Cross-mode track IDs reset to auto in replace(); preflight that same selection.
          let aid=preserve&&(this.mode==='native'||settings.aid==='no')?settings.aid:!this.source?settings.aid:'auto';
          let sid=tracks.length?'no':preserve&&(this.mode==='native'||settings.sid==='no')?settings.sid:'auto';
          if(preserve&&this.mode==='native'&&usesRemuxTracks(backendPlan(this.current?.backend))&&!['auto','no'].includes(aid))aid=probe.tracks.find(t=>t.type==='audio'&&t.index===Number(aid)-1)?.id??aid;
          const publicAudio=preserve?/^audio:stream:(\d+)$/.exec(this.publicSelections.get('audio')??''):null;
          const publicSub=preserve?/^sub:stream:(\d+)$/.exec(this.publicSelections.get('sub')??''):null;
          if(publicSub)sid=probe.tracks.find(t=>t.type==='sub'&&t.index===Number(publicSub[1]))?.id??'missing';
          if(publicAudio)aid=probe.tracks.find(t=>t.type==='audio'&&t.index===Number(publicAudio[1]))?.id??'missing';
          nativeReason=nativeRejection(probe,{...settings,aid,sid},document.createElement('video'));
          this.sourceInspection={source,probe,settings:{aid,sid,subtitles:settings.subtitles}};
          await this.checkInspectedAssets(source,probe,settings,sid,controller);
          if(fastProbe){
            const first=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,this.automatic).find(plan=>plan.eligible)?.id;
            if(first!=='native-direct'&&first!=='native-direct-mpv'){
              this.record({mode:'probe',outcome:'skipped',reason:`Fast metadata does not admit an existing Direct route (${first??'none'}); FFmpeg inspection required`});
              fastProbe=false;this.sourceInspection=undefined;this.mpvSubtitleAssetsAvailable=false;this.selectiveAudioAssetsAvailable=false;this.selectiveAudioAssetsChecked=false;
              if(globalThis.crossOriginIsolated){probe=await this.inspectWithFFmpeg(source,controller);continue;}
              probe=undefined;nativeReason=undefined;
              break;
            }
            this.fastInspectedSource=source;
            this.record({mode:'probe',outcome:'selected',reason:`Fast Inspector admitted ${first} without remux inspector Wasm`});
          }
          break;
          }
          }
        }catch(error){
          if(this.destroyed||this.activeOperation?.controller.signal.aborted||['AUTOPLAY_BLOCKED','ABORTED','SOURCE_CHANGED','SOURCE_PERMISSION','NETWORK_TIMEOUT','ASSET_LOAD_FAILED'].includes(playerError(error).code)||terminalSourceFailure(error))throw error;
          nativeReason='Native eligibility could not be established: '+String(error);
          this.record({mode:'probe',outcome:'failed',reason:String(error)});
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
      }
    }
    this.admissionContext={nativeReason,automatic:this.automatic};
    if(inspectOnly)return;
    return this.discover(source,settings,preserve,tracks,target,this.automatic,this.automatic?undefined:this.mode,start);
  }
  private acceptEvidence(planId:string,session=this.current){
    const evidence=this.evidence(session);
    this.runtimeCapabilities.update(planId,evidence.prepared&&!evidence.outputVerified?'prepared':'verified',evidence,
      evidence.prepared&&!evidence.outputVerified?'Paused candidate prepared; actual output is pending a permitted play request':evidence.completedAtEOF?'Previously verified source completed at natural EOF; no new frame or audio observation claimed':'Runtime output observed; physical output and opaque track internals remain unverified');
  }
  private evidence(session=this.current):CapabilityEvidence {
    if(session?.backend.startupEvidence)return session.backend.startupEvidence();
    const d=session?.backend.diagnostics as {capability?:CapabilityEvidence;rendered?:number;decoder?:string;decoderStats?:{receivedFrames?:number;supportCheck?:unknown}}|undefined;
    if(d?.capability)return {...d.capability};
    return {metadata:true,decoderOutput:!!d?.rendered,videoPresented:!!d?.rendered,
      ...(d?.decoderStats?.supportCheck?{apiHint:JSON.stringify(d.decoderStats.supportCheck)}:{})};
  }
  private localRemuxRetry(source:Source,planId:string,settings:Settings):string|undefined {
    // Match complete, existing plans: preserve gain and subtitle ownership.
    const remux=({'native-direct':'native-remux','native-direct-mpv':'native-remux-mpv','native-direct-gain':'native-remux-gain','native-direct-ass':'native-remux-ass','native-direct-ass-gain':'native-remux-ass-gain'} as Record<string,string>)[planId];
    if(source.kind==='local'&&this.fastInspectedSource!==source&&this.sourceInspection?.source===source&&remux&&this.planDecisions.some(p=>p.eligible&&p.id===remux)&&!this.tierAttempts.reason(source,this.tierConfiguration(settings),remux))return remux;
  }
  private async discover(source:Source,settings:Settings,preserve:boolean,tracks:TextTrackSource[],target:number|undefined,automatic:boolean,pinnedMode?:PlaybackMode,start=0):Promise<void> {
    let nativeReason=automatic?this.admissionContext.nativeReason:undefined;
    this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,automatic);
    this.runtimeCapabilities.begin(source,this.planDecisions);
    if(pinnedMode&&!this.planDecisions.some(p=>p.mode===pinnedMode&&p.eligible)){
      const candidates=this.planDecisions.filter(p=>p.mode===pinnedMode);
      const rejection=candidates.find(p=>p.code==='ISOLATION_REQUIRED')??candidates.find(p=>p.code!=='PLAN_NOT_REQUESTED');
      throw new PlayerError(rejection?.code==='ISOLATION_REQUIRED'?'ISOLATION_REQUIRED':'UNSUPPORTED_FEATURE',rejection?.reason??'No qualified complete playback plan');
    }
    const errors:string[]=[];
    let captionFailure:string|undefined;
    let interruptedDirect:{id:string;remux:string}|undefined;
    const attempt=async(plan:{id:string;mode:PlaybackMode},budget?:number)=>{
      if(plan.mode==='hybrid')await this.inspectForQualifiedWebGPU(source,settings);
      // Only discovery owns the replacement and full-budget restoration below.
      // Other callers of replace retain the ordinary direct readiness deadline.
      const loadBudget=budget??(this.localRemuxRetry(source,plan.id,settings)&&this.sourceInspection?.probe.format?.split(',').includes('matroska')?1500:undefined);
      this.runtimeCapabilities.update(plan.id,'probing');
      await this.replace(source,plan.mode,settings,preserve,tracks,target,automatic,plan.id,loadBudget);
      this.acceptEvidence(plan.id);
      this.record({mode:plan.mode,outcome:'selected',reason:`${plan.id}: Playback requirements and actual startup accepted`});
      if(this.current?.error&&!this.recovering)this.recover(this.current);
    };
    // The finite registry supplies a deterministic order. No speculative engines.
    for(let index=0;index<this.planDecisions.length;index++){
      this.assertOperation();
      let plan=this.planDecisions[index];
      if(pinnedMode?plan.mode!==pinnedMode:PLAYBACK_MODES.indexOf(plan.mode)<start)continue;
      if(automatic&&plan.eligible&&plan.mode==='hybrid'&&this.sourceInspection?.source===source&&this.sourceInspection.probe.hybridRejection){
        plan.eligible=false;plan.code='FEATURE_UNSUPPORTED';plan.reason=this.sourceInspection.probe.hybridRejection;
        this.runtimeCapabilities.admission(this.planDecisions);
      }
      // Repackaging A/V cannot repair a failed browser caption renderer.
      if(captionFailure&&plan.mode==='native'){
        if(plan.eligible){plan.eligible=false;plan.code='FEATURE_UNSUPPORTED';plan.reason=captionFailure;this.runtimeCapabilities.admission(this.planDecisions);this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: ${captionFailure}`});}
        continue;
      }
      // Optional inspection and preparation are strictly after original-copy attempts.
      // Never let adaptation bypass subtitle/transport/filter semantic rejection.
      if(automatic&&plan.id.startsWith('native-flac')&&this.automaticLossless&&!nativeReason&&this.sourceInspection?.source===source&&this.sourceInspection.probe.tracks.some(t=>t.type==='audio'&&['pcm_s16le','pcm_s24le'].includes(t.codec))&&!this.losslessInspection&&source.kind==='local'){
        const inspected=this.sourceInspection;
        const permitted=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,automatic).find(p=>p.id===plan.id);
        if(permitted?.code==='SOURCE_UNSUPPORTED'){
          const controller=this.inspection=new AbortController();
          try{
            const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
            const probe:Probe=await probeSource({file:source.file instanceof File?source.file:new File([source.file],'media')},controller.signal,'flac');
            this.assertOperation();this.losslessInspection={source,reason:losslessAdaptationRejection(probe,inspected.settings)};
          }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
          this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,automatic);
          plan=this.planDecisions[index];this.runtimeCapabilities.admission(this.planDecisions);
        }
      }
      // The common native A/V path never pays for optional mpv-audio asset
      // probes. Check once only when discovery actually reaches a split plan.
      if(automatic&&plan.id.startsWith('native-video-mpv-audio')&&!this.selectiveAudioAssetsChecked&&this.fileServicesSource(source)&&this.sourceInspection?.source===source&&this.audioOutput==='stereo'&&settings.gain===1&&plan.browserCapability?.status!=='unsupported'){
        const controller=this.inspection=new AbortController();
        try{
          this.selectiveAudioAssetsAvailable=await this.optionalAssetsAvailable(['web/engine-selective/player.mjs','web/engine-selective/player.wasm','web/selective-sync-worklet.js'],controller);
          this.assertOperation();this.selectiveAudioAssetsChecked=true;
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
        this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,automatic);
        plan=this.planDecisions[index];this.runtimeCapabilities.admission(this.planDecisions);
      }
      if(!plan.eligible){if(plan.code!=='PLAN_NOT_REQUESTED')this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: ${plan.reason}`});continue;}
      const prior=automatic?this.tierAttempts.reason(source,this.tierConfiguration(settings),plan.id):undefined;
      if(prior){this.runtimeCapabilities.update(plan.id,'failed',undefined,`Cached compatibility rejection: ${prior}`,'compatibility');this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: cached compatibility rejection: ${prior}`});continue;}
      try{
        await attempt(plan);
        return;
      }catch(error){
        const compatible=compatibilityFailure(error);
        // An inspected local File has no remote transport to retry or bypass.
        // A direct parser readiness deadline may try the already-admitted remux
        // route once, without caching a codec failure or broadening admission.
        const retryLocalLoad=error instanceof NativeLoadTimeout?this.localRemuxRetry(source,plan.id,settings):undefined;
        const inconclusiveOutput=automatic&&source.kind==='local'&&error instanceof StartupEvidenceTimeout&&error.stage==='output';
        if(retryLocalLoad&&error instanceof NativeLoadTimeout&&error.budgetMs<25000)interruptedDirect={id:plan.id,remux:retryLocalLoad};
        if(compatible&&!evidenceInterrupted(error))this.tierAttempts.failure(source,this.tierConfiguration(settings),plan.id,String(error));
        this.runtimeCapabilities.update(plan.id,evidenceInterrupted(error)?'untested':'failed',undefined,String(error),retryLocalLoad||inconclusiveOutput?undefined:compatible?'compatibility':'terminal');
        this.record({mode:plan.mode,outcome:'failed',reason:`${plan.id}: ${String(error)}`});
        // Admission does not prove remux will work. A short scheduling trial
        // must not discard a playable original when its replacement is missing
        // or fails. Restore the original once with its full readiness budget.
        // Cancellation, source permissions/identity and autoplay stay terminal.
        if(interruptedDirect?.remux===plan.id&&(compatible||['ASSET_LOAD_FAILED','NETWORK_TIMEOUT','ISOLATION_REQUIRED'].includes(playerError(error).code))){
          const direct=interruptedDirect;interruptedDirect=undefined;this.assertOperation();
          try{await attempt({id:direct.id,mode:'native'},25000);return;}
          catch(originalError){
            const originalCompatible=compatibilityFailure(originalError);
            if(originalCompatible&&!evidenceInterrupted(originalError))this.tierAttempts.failure(source,this.tierConfiguration(settings),direct.id,String(originalError));
            this.runtimeCapabilities.update(direct.id,evidenceInterrupted(originalError)?'untested':'failed',undefined,String(originalError),originalCompatible?'compatibility':'terminal');
            this.record({mode:'native',outcome:'failed',reason:`${direct.id}: full-budget retry: ${String(originalError)}`});
            this.assertOperation();if(!originalCompatible)throw originalError;
            errors.push(`${direct.id}: ${String(originalError)}`);
          }
        }
        // Explicit plans keep a precise timeline rejection. Automatic
        // selection may still try Hybrid when this Native path cannot play it.
        if(this.destroyed||this.activeOperation?.controller.signal.aborted||(!automatic&&playerError(error).code==='UNSUPPORTED_TIMELINE')||(!compatible&&!retryLocalLoad&&!inconclusiveOutput))throw error;
        if(error instanceof BrowserCaptionUnsupported)captionFailure=error.message;
        errors.push(`${plan.id}: ${String(error)}`);
        if(this.fastInspectedSource===source){
          nativeReason=await this.inspectFallbackAfterFastFailure(source,settings);
          this.admissionContext={nativeReason,automatic};
          this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,automatic);
          this.runtimeCapabilities.admission(this.planDecisions);
          index=-1;
        }
      }
    }
    throw Error('No playback route satisfied the source: '+(errors.join('; ')||this.planDecisions.map(p=>p.reason).filter(Boolean).join('; ')));
  }

  private recover(session: Session){
    if(this.recovering||this.recoveredSessions.has(session)||this.destroyed||!this.automatic||!this.source||this.mode==='software')return;
    this.recoveredSessions.add(session);
    const plan=executionPlan(this.mode,backendPlan(session.backend),this.settings.af,this.settings.gain,!!(session.backend.diagnostics as {subtitleOverlay?:unknown})?.subtitleOverlay);
    this.runtimeCapabilities.update(plan.id,'failed',this.evidence(session),String(session.error),compatibilityFailure(session.error)?'compatibility':'terminal');
    if(!compatibilityFailure(session.error)){void session.backend.pause().catch(()=>{});this.emit('error',String(session.error));return;}
    if(!evidenceInterrupted(session.error))this.tierAttempts.failure(this.source,this.tierConfiguration(this.settings),plan.id,String(session.error));
    this.recovering=true;
    void this.enqueue(async()=>{
      if(this.current!==session||!this.automatic)return;
      await session.backend.pause().catch(()=>{});
      const policy=this.nativeRemux;
      const streaming=this.failedStreamingPlan(session);
      const tryRemux=!streaming&&this.mode==='native'&&backendPlan(session.backend)==='direct'&&policy!=='never';
      const priorAttempts:SelectionAttempt[]=[...this.attempts.filter(attempt=>attempt.outcome!=='selected'),{mode:this.mode,outcome:'failed',reason:`${plan.id}: Runtime playback failure: ${session.error?.message??'Playback backend became unavailable'}`}];
      try{
        if(tryRemux)this.nativeRemux='always';
        await this.select(this.source!,this.settings,true,this.nativeTracks,streaming||tryRemux||this.mode==='native'?0:PLAYBACK_MODES.indexOf(this.mode)+1,undefined,priorAttempts);
      }finally{this.nativeRemux=policy;}
    },'switching').catch(error=>{if(!this.destroyed)this.emit('error',String(error));}).finally(()=>{this.recovering=false;if(this.current?.error&&this.current!==session)this.recover(this.current);});
  }
  setAutomaticSelection(enabled=true){
    if(typeof enabled!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid automatic selection policy');
    return this.enqueue(async()=>{
      const previous=this.automatic;this.automatic=enabled;
      try{if(enabled&&this.source)await this.select(this.source,this.settings,true,this.nativeTracks);}
      catch(error){this.automatic=previous;throw error;}
    },'switching');
  }
  open(input: MediaSourceInput, options:OpenOptions={}) {
    let source:Source;
    try {
      if(typeof input==='string'||input instanceof URL||(!(input instanceof File)&&!(input instanceof ArrayBuffer)&&input&&typeof input==='object')) {
        const value=typeof input==='string'||input instanceof URL?{url:String(input)}:input as RemoteSource;
        if(typeof value.url!=='string'||!value.url.trim())throw Error('Invalid remote URL');
        const url=new URL(value.url,location.href);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid remote URL');
        const format=value.format??(/\.m3u8$/i.test(url.pathname)?'hls':/\.mpd$/i.test(url.pathname)?'dash':'file');
        if(!['file','hls','dash'].includes(format))throw Error('Invalid source format');
        if(value.streaming?.maxBandwidth!==undefined&&(!Number.isFinite(value.streaming.maxBandwidth)||value.streaming.maxBandwidth<=0))throw Error('Invalid streaming bandwidth limit');
        if(value.streaming?.representation!==undefined&&(typeof value.streaming.representation!=='string'||!value.streaming.representation))throw Error('Invalid streaming representation');
        if(value.streaming?.live!==undefined&&typeof value.streaming.live!=='boolean')throw Error('Invalid live permission');
        source={kind:'remote',options:{...value,format,url:url.href,credentials:value.credentials??(format==='file'?undefined:'same-origin'),headers:value.headers?{...value.headers}:undefined,streaming:value.streaming?{...value.streaming}:undefined,allowedOrigins:value.allowedOrigins?.slice()}};
      } else {
        if(!(input instanceof File)&&!(input instanceof ArrayBuffer))throw Error('Expected File, ArrayBuffer or remote source');
        if(input instanceof ArrayBuffer&&input.byteLength>32*1024*1024)throw Error('ArrayBuffer sources are limited to 32 MiB; use File for larger sources');
        source={kind:'local',file:input instanceof File?input:input.slice(0),input:{demuxer:options.demuxer}};
      }
      source.trackPolicy=normalizeTrackPolicy({...this.configuredTrackPolicy,...normalizeTrackPolicy(options.trackPolicy)});
    } catch(error){return Promise.reject(playerError(error));}
    return this.enqueue(async()=>{
      const inspection=this.sourceInspection,lossless=this.losslessInspection,fastInspectedSource=this.fastInspectedSource;
      try{await this.select(source,this.settings,false,[]);}catch(error){if(this.source!==source){this.sourceInspection=inspection;this.losslessInspection=lossless;this.fastInspectedSource=fastInspectedSource;}throw error;}
    },'opening',options.signal);
  }
  openRemote(source:RemoteSource, options:OpenOptions={}) {return this.open(source,options);}
  setMode(mode: PlaybackMode) {
    modeValue(mode);
    return this.enqueue(async () => {
      this.validateFilters(mode, this.settings);
      if (mode === this.mode) {this.automatic=false;return;}
      if (this.source) await this.replace(this.source, mode, this.settings, true, this.nativeTracks,undefined,false);
      else {this.currentMode = mode;this.emit('modechange', {phase: 'ready', mode, position: 0});}
      this.automatic=false;
    },'switching');
  }
  private filters(key: 'vf' | 'af', value: string) {
    const chain = filterChain(value);
    return this.enqueue(async () => {
      if (!this.automatic) this.validateFilters(this.mode,{...this.settings,[key]:chain});
      if (chain === this.settings[key]) return;
      const settings = {...this.settings, [key]: chain};
      if(!chain&&this.automatic&&this.current&&this.mode!=='native'&&this.toneMapping==='off'){
        await this.current.backend.command!('set',key,'');this.settings=settings;this.schedulePromotion();return;
      }
      if (this.source) await this.select(this.source, settings, true, this.nativeTracks);else {this.settings=settings;if(this.automatic&&(settings.vf||settings.af))this.currentMode=featureRejection('hybrid',{...settings,toneMapping:this.toneMapping,hybridAudioFilters:this.hybridAudioFilters})?'software':'hybrid';}
    },'switching');
  }
  setVideoFilters(value: string) {return this.filters('vf', value);}
  setAudioFilters(value: string) {return this.filters('af', value);}
  setAudioGain(value:number) {
    if(!Number.isFinite(value)||value<0||value>1)throw new PlayerError('INVALID_ARGUMENT','Gain must be between 0 and 1');
    return this.enqueue(async()=>{
      if(value===this.settings.gain)return;
      const desired={...this.settings,gain:value};
      if(this.source&&backendPlan(this.current?.backend)==='remux-mpv'&&value!==1){await this.select(this.source,desired,true,this.nativeTracks);return;}
      if(this.current?.backend.gain){
        await this.current.backend.gain(value);this.assertOperation();this.settings=desired;
        if(this.source){
          this.planDecisions=this.admissible(this.source,desired,this.subtitleAssets,this.nativeTracks,this.admissionContext.nativeReason,this.admissionContext.automatic);
          // The same accepted backend now executes a different complete plan.
          // Keep prior evidence in the bounded cache, but describe current requirements.
          this.runtimeCapabilities.begin(this.source,this.planDecisions);
          const plan=executionPlan(this.mode,backendPlan(this.current.backend),desired.af,desired.gain,!!(this.current.backend.diagnostics as {subtitleOverlay?:unknown})?.subtitleOverlay);
          this.acceptEvidence(plan.id);
        }
      }else if(this.source)await this.select(this.source,desired,true,this.nativeTracks);
      else this.settings=desired;
    });
  }
  private setting(action: (p: Backend) => Promise<void>, update: () => void) {
    return this.enqueue(async () => {if (this.current) await action(this.current.backend);update();});
  }
  private async playNativeVerified(backend:Backend,playing=backend.play()) {
    const controller=new AbortController();
    const verification=(backend as Backend & {verifyOutput(signal?:AbortSignal):Promise<void>}).verifyOutput(controller.signal);
    try{await Promise.all([playing,verification]);}
    finally{controller.abort();await verification.catch(()=>{});}
  }
  play() {
    // An unverified trial must not consume the user's requested playback position.
    const trialSession=this.current,trialPosition=Math.max(0,Number(this.current?.backend.properties.get('time-pos'))||0);
    const trialVerified=this.evidence(this.current).outputVerified===true;
    // Initiate resume before yielding the user's activation to the operation queue.
    const immediate=!this.destroyed&&this.queued===0&&this.current?this.current.backend.play():undefined;
    immediate?.catch(()=>{});
    return this.enqueue(async()=>{if(!this.current)throw Error('No source');const session=this.current;this.settings.pause=false;
      try{
        const playing=immediate??session.backend.play();
        if(this.mode==='native')await this.playNativeVerified(session.backend,playing);else await playing;
        this.assertOperation();if(this.current===session){const plan=this.diagnostics.plan;if(plan)this.acceptEvidence(plan.id,session);}
      }catch(error){
        const inconclusiveOutput=this.source?.kind==='local'&&error instanceof StartupEvidenceTimeout&&error.stage==='output';
        if(this.automatic&&(compatibilityFailure(error)||inconclusiveOutput)&&this.source){
          const streaming=this.failedStreamingPlan(session);
          const policy=this.nativeRemux,tryRemux=!streaming&&this.mode==='native'&&backendPlan(session.backend)==='direct'&&policy!=='never';
          const plan=this.diagnostics.plan;if(plan){
            this.runtimeCapabilities.update(plan.id,inconclusiveOutput?'prepared':'failed',this.evidence(session),String(error),inconclusiveOutput?undefined:'compatibility');
            if(!evidenceInterrupted(error))this.tierAttempts.failure(this.source,this.tierConfiguration(this.settings),plan.id,String(error));
          }
          try{if(tryRemux)this.nativeRemux='always';await this.select(this.source,this.settings,true,this.nativeTracks,streaming||tryRemux||this.mode==='native'?0:PLAYBACK_MODES.indexOf(this.mode)+1,session===trialSession&&!trialVerified?trialPosition:undefined);}finally{this.nativeRemux=policy;}
        }
        else {const plan=this.diagnostics.plan;if(plan&&evidenceInterrupted(error))this.runtimeCapabilities.update(plan.id,'prepared',this.evidence(session),String(error));this.settings.pause=true;await session.backend.pause().catch(()=>{});throw error;}
      }});
  }
  pause() {return this.setting(p => p.pause(), () => {this.settings.pause = true;this.observedPlaying=false;this.observedWaiting=false;this.schedulePromotion();});}
  seek(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new PlayerError('INVALID_ARGUMENT','Invalid seek time');
    return this.enqueue(async () => {
      if (!this.current) throw new Error('No source');
      const window=this.state.seekable;if(window&&!window.some(r=>seconds>=r.start&&seconds<=r.end))throw new PlayerError('INVALID_ARGUMENT','Seek is outside the current seekable window');
      const accepted=this.current,previous=Number(accepted.backend.properties.get('time-pos'))||0,wasPaused=this.settings.pause;
      try{await accepted.backend.seek(seconds);await this.settled(accepted,this.mode,seconds);}
      catch(error){
        if(error instanceof SeekPresentationBoundary){
          // A demux restart can prove the requested subtitle-only interval has no
          // AV presentation. Restore the accepted position rather than leave its
          // audio held behind an impossible seek target. A failed restoration
          // means this route is broken and automatic selection may continue.
          if(this.current===accepted&&!this.destroyed&&!this.activeOperation?.controller.signal.aborted){
            try{await accepted.backend.seek(previous);await this.settled(accepted,this.mode,previous);if(!wasPaused)await accepted.backend.play();}
            catch(restoreError){
              // A route that cannot restore its last presented position has
              // failed; let automatic selection try the next admitted plan.
              if(!this.automatic||!this.source)throw restoreError;
              const attempts:SelectionAttempt[]=[...this.attempts.filter(attempt=>attempt.outcome!=='selected'),{mode:this.mode,outcome:'failed',reason:`Seek presentation failure: ${playerError(error).message}; accepted position recovery failed: ${playerError(restoreError).message}`}];
              const failedPlan=this.diagnostics.plan;if(this.mode==='native'&&failedPlan)this.tierAttempts.failure(this.source,this.tierConfiguration(this.settings),failedPlan.id,String(restoreError));
              await this.select(this.source,this.settings,true,this.nativeTracks,this.mode==='native'?0:PLAYBACK_MODES.indexOf(this.mode)+1,seconds,attempts);
              return;
            }
          }
          throw error;
        }
        if(this.activeOperation?.controller.signal.aborted||['AUTOPLAY_BLOCKED','INVALID_ARGUMENT'].includes(playerError(error).code)||!this.automatic||this.mode==='software'||terminalSourceFailure(error)||/out of range|Invalid seek/i.test(String(error)))throw error;
        const priorAttempts:SelectionAttempt[]=[...this.attempts.filter(attempt=>attempt.outcome!=='selected'),{mode:this.mode,outcome:'failed',reason:`Seek presentation failure: ${playerError(error).message}`}];
        const streaming=this.failedStreamingPlan(accepted);
        const failedPlan=this.diagnostics.plan;if(this.mode==='native'&&failedPlan)this.tierAttempts.failure(this.source!,this.tierConfiguration(this.settings),failedPlan.id,String(error));
        await this.select(this.source!,this.settings,true,this.nativeTracks,streaming||this.mode==='native'?0:PLAYBACK_MODES.indexOf(this.mode)+1,seconds,priorAttempts);
      }
    },'seeking');
  }
  volume(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new PlayerError('INVALID_ARGUMENT','Invalid volume');
    return this.setting(p => p.volume(this.muted?0:value), () => {this.settings.volume = value;});
  }
  setVolume(value:number) {if(!Number.isFinite(value)||value<0||value>1)throw new PlayerError('INVALID_ARGUMENT','Volume must be 0 to 1');return this.volume(value*100);}
  setMuted(value:boolean) {if(typeof value!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Expected boolean mute state');return this.setting(p=>p.volume(value?0:this.settings.volume),()=>{this.muted=value;});}
  setPlaybackRate(value:number) {return this.rate(value);}
  selectAudioTrack(id:string|null) {return this.selectPublicTrack('audio',id);}
  selectSubtitleTrack(id:string|null) {return this.selectPublicTrack('sub',id);}
  private selectPublicTrack(type:TrackType,id:string|null) {
    return this.enqueue(async()=>{
      if(!this.current)throw Error('No source');
      const raw=this.sourceTracks();
      const plan=backendPlan(this.current.backend);
      let track=raw.find(t=>t.type===type&&`${this.sourceSerial}:${trackKey(t,this.mode,plan)}`===id);
      if(id!==null&&id!=='auto'&&!track)throw new PlayerError('INVALID_ARGUMENT','Unknown or stale public track ID');
      const rule=type==='audio'?this.trackPolicy.audio:this.trackPolicy.subtitles;
      const inventory=tracks(raw,this.sourceSerial,this.mode,plan).filter(t=>t.type===(type==='audio'?'audio':'subtitle'));
      assertTrackSelection(rule,id,inventory.find(t=>t.id===id));
      if(id==='auto'&&rule){const chosen=defaultTrack(inventory,rule);id=chosen?.id??null;track=chosen?raw.find(t=>`${this.sourceSerial}:${trackKey(t,this.mode,plan)}`===chosen.id):undefined;}
      const backendId=id===null?'no':id==='auto'?'auto':String(track!.id);
      if(this.settings[type==='audio'?'aid':'sid']===backendId&&(!track||track.selected))return;
      if(type==='sub'&&this.mode==='native'&&this.automatic&&this.source&&this.settings.subtitles&&backendId!=='no'&&!['shaka-mse','remux-mpv','direct-mpv'].includes(plan??'')){
        const previous=this.publicSelections.get(type);
        if(track)this.publicSelections.set(type,trackKey(track,this.mode,plan));else this.publicSelections.delete(type);
        try{await this.select(this.source,{...this.settings,sid:backendId},true,this.nativeTracks);}
        catch(error){if(previous)this.publicSelections.set(type,previous);else this.publicSelections.delete(type);throw error;}
        return;
      }
      if(type==='audio'&&plan!=='shaka-mse'&&this.source&&(this.automaticLossless||this.mode==='native')&&track){
        const previous=this.publicSelections.get(type);
        if(track)this.publicSelections.set(type,trackKey(track,this.mode,plan));else this.publicSelections.delete(type);
        try{
          if(track.selected)return;
          if(this.automatic)await this.select(this.source,{...this.settings,aid:backendId},true,this.nativeTracks);
          else await this.replace(this.source,this.mode,{...this.settings,aid:backendId},true,this.nativeTracks,undefined,false);
        }
        catch(error){if(previous)this.publicSelections.set(type,previous);else this.publicSelections.delete(type);throw error;}
        return;
      }
      await this.current.backend.selectTrack(type,backendId);this.settings[type==='audio'?'aid':'sid']=backendId;
      await this.confirmTrackSelection(this.current,this.source,this.mode,this.settings,type,backendId);
      if(track)this.publicSelections.set(type,trackKey(track,this.mode,plan));else this.publicSelections.delete(type);
      this.schedulePromotion();
    },'switching');
  }
  rate(value: number) {
    if (!Number.isFinite(value) || value < .5 || value > 2) throw new PlayerError('INVALID_ARGUMENT','Playback rate must be 0.5 to 2');
    return this.setting(p => p.rate(value), () => {this.settings.speed = value;});
  }
  selectTrack(type: TrackType, id: string) {
    if(['audio','sub'].includes(type)&&backendPlan(this.current?.backend)==='shaka-mse'){
      const track=this.sourceTracks().find(t=>t.type===type&&String(t.id)===id);
      if(id!=='auto'&&id!=='no'&&!track)throw new PlayerError('INVALID_ARGUMENT','Unknown streaming track ID');
      return this.selectPublicTrack(type,id==='no'?null:id==='auto'?'auto':`${this.sourceSerial}:${trackKey(track!,this.mode,'shaka-mse')}`);
    }
    if (!['audio', 'sub'].includes(type) || !/^(?:[1-9][0-9]*|auto|no)$/.test(id)) throw new PlayerError('INVALID_ARGUMENT','Invalid track selection');
    if(this.current){
      const raw=this.sourceTracks();
      const track=raw.find(t=>t.type===type&&String(t.id)===id);
      const plan=backendPlan(this.current?.backend);
      return this.selectPublicTrack(type,id==='no'?null:id==='auto'?'auto':track?`${this.sourceSerial}:${trackKey(track,this.mode,plan)}`:'missing');
    }
    assertTrackSelection(type==='audio'?this.trackPolicy.audio:this.trackPolicy.subtitles,id==='no'?null:id);
    return this.setting(p => p.selectTrack(type, id), () => {this.settings[type === 'audio' ? 'aid' : 'sid'] = id;this.publicSelections.delete(type);this.schedulePromotion();});
  }
  subtitleVisible(visible: boolean) {
    if(typeof visible!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Expected boolean subtitle visibility');
    return this.enqueue(async()=>{
      if(visible!==this.settings.subtitles)assertTrackSelection(this.trackPolicy.subtitles,visible?'visible':null);
      if(visible===this.settings.subtitles){if(!visible)this.schedulePromotion();return;}
      const settings={...this.settings,subtitles:visible};
      if(this.automatic&&this.source&&this.mode==='native'&&!['shaka-mse','remux-mpv','direct-mpv'].includes(backendPlan(this.current?.backend)??'')&&visible&&!this.settings.subtitles)await this.select(this.source,settings,true,this.nativeTracks);
      else {if(this.current)await this.current.backend.subtitleVisible(visible);this.settings=settings;if(!visible)this.schedulePromotion();}
    });
  }
  addSubtitle(file:File, options:SubtitleOptions={}) {
    if(!(file instanceof File))return Promise.reject(new PlayerError('INVALID_ARGUMENT','Expected a subtitle File'));
    const format=file.name.split('.').at(-1)?.toLowerCase();
    if(!['ass','ssa','srt','vtt'].includes(format??'')||file.size>8*1024*1024) return Promise.reject(new PlayerError('INVALID_ARGUMENT','Expected an SRT, ASS, SSA or WebVTT file up to 8 MiB'));
    return this.enqueue(async()=>{
      if(!this.source)throw Error('Open a movie before adding subtitles');
      this.assertSubtitleAddition(options.label??file.name,options.language,format!);
      if(this.subtitleAssets.length>=16||this.subtitleAssets.reduce((n,a)=>n+a.bytes.byteLength,0)+file.size>16*1024*1024)throw Error('Subtitle budget exceeded');
      const bytes=await this.interruptible(file.arrayBuffer());
      const old=this.subtitleAssets,previousSelection=this.publicSelections.get('sub');
      if(options.select!==false)this.publicSelections.delete('sub');
      this.subtitleAssets=[...old,{bytes,format:format as SubtitleAsset['format'],label:options.label??file.name,language:options.language,select:options.select??true}];
      try {plainVTT(this.subtitleAssets.at(-1)!);await this.select(this.source,{...this.settings,sid:options.select===false?this.settings.sid:'auto'},true,this.nativeTracks);}
      catch(error){this.subtitleAssets=old;if(previousSelection!==undefined)this.publicSelections.set('sub',previousSelection);throw error;}
    });
  }
  addFont(file:File) {
    if(!(file instanceof File)||! /\.(ttf|otf)$/i.test(file.name)||file.size>8*1024*1024)return Promise.reject(new PlayerError('INVALID_ARGUMENT','Expected a TTF/OTF font up to 8 MiB'));
    return this.enqueue(async()=>{
      if(this.fonts.length>=16||this.fonts.reduce((n,a)=>n+a.bytes.byteLength,0)+file.size>32*1024*1024)throw Error('Font budget exceeded');
      const bytes=await this.interruptible(file.arrayBuffer()),old=this.fonts;
      this.fonts=[...old,{name:'user-'+old.length+'.'+file.name.split('.').at(-1)!.toLowerCase(),bytes}];
      try {if(this.source&&(this.mode!=='native'||(this.nativeASS&&this.subtitleAssets.length)||backendPlan(this.current?.backend)==='remux-mpv'))await this.replace(this.source,this.mode,this.settings,true,this.nativeTracks);}
      catch(error){this.fonts=old;throw error;}
    });
  }
  setToneMapping(value:ToneMapping) {
    if(!['off','hdr-to-sdr'].includes(value))throw new PlayerError('INVALID_ARGUMENT','Invalid tone mapping policy');
    return this.enqueue(async()=>{const old=this.toneMapping;if(old===value)return;this.toneMapping=value;try{if(value==='off'&&this.automatic&&this.current&&this.mode==='software'){await this.current.backend.command!('set','vf',this.settings.vf);this.schedulePromotion();return;}if(this.source)await this.select(this.source,this.settings,true,this.nativeTracks);else if(this.automatic&&value!=='off')this.currentMode='software';else this.validateFilters(this.mode,this.settings);}catch(error){this.toneMapping=old;throw error;}});
  }
  addTextTrack(track: TextTrackSource) {
    const source = {...track};
    return this.enqueue(async () => {
      if (this.mode !== 'native' || !this.current) throw new Error('External browser text tracks require an open native player');
      this.assertSubtitleAddition(source.label,source.language,'webvtt');
      await this.current.backend.addTextTrack!(source);this.nativeTracks.push(source);
    });
  }
  resize(width: number, height: number) {
    if(this.destroyed)throw new PlayerError('ABORTED','Player is destroyed');dimensions(width, height);
    this.width = width;this.height = height;this.current?.backend.resize(width, height);
  }
  close():Promise<void> {
    this.cancelPromotion();
    if(this.destroyed)return this.destruction!;
    if(this.closing)return this.closing;
    this.preview.setSourceIdentity(`closed:${this.sourceSerial}`);this.previewSource=undefined;
    this.operationEpoch++;this.activeOperation?.controller.abort();this.inspection?.abort();clearInterval(this.monitor);
    const cleanup=Promise.all([this.preview.drain(),...[this.candidate,this.current].map(s=>s?.backend.destroy().catch(()=>{}))]);
    this.closing=this.enqueue(async()=>{await cleanup;await this.dispose(this.current);this.current=undefined;this.candidate=undefined;this.source=undefined;this.sourceInspection=undefined;this.losslessInspection=undefined;this.runtimeCapabilities.clear();this.tierAttempts.clear();this.nativeTracks=[];this.subtitleAssets=[];this.publicSelections.clear();this.settings={...this.settings,pause:true,aid:'auto',sid:'auto'};this.sessionError=null;this.observedPlaying=false;this.observedWaiting=false;},'closing').finally(()=>{this.closing=undefined;});
    return this.closing;
  }
  destroy(): Promise<void> {
    this.cancelPromotion();
    if (this.destruction) return this.destruction;
    this.preparation?.destroy();
    const previewCleanup=this.preview.destroy();this.previewSource=undefined;
    this.destroyed = true;this.operationEpoch++;this.activeOperation?.controller.abort();this.lifetime.abort();this.inspection?.abort();clearInterval(this.monitor);
    this.destruction = (async () => {
      await Promise.all([previewCleanup,...[this.candidate, this.current].map(session => session?.backend.destroy().catch(() => {}))]);
      await this.queue;
      try {await this.dispose(this.current);} finally {this.current = undefined;this.source = undefined;this.sourceInspection=undefined;this.losslessInspection=undefined;this.runtimeCapabilities.clear();this.tierAttempts.clear();this.nativeTracks = [];this.subtitleAssets=[];this.fonts=[];this.settings.pause=true;this.sessionError=null;this.publish();this.subscribers.clear();this.root.remove();}
    })();return this.destruction;
  }
}
