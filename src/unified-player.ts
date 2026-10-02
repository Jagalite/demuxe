// SPDX-License-Identifier: Apache-2.0
import {privatePlaybackRejection,readPrivatePlaybackAssets,type PrivatePlaybackAssets} from './internal/private-playback-admission.js';
import {providerDeploymentEnabled, qualifiedProviderIdentities} from './internal/provider-build.js';
import {ProviderRuntime} from './internal/provider-runtime.js';
import {loadProviderModule} from './internal/provider-modules.js';
import {routingRequirements, missingRoutingFacts} from './internal/probe-requirements.js';
import {bufferingPolicy, resolveBuffering} from './internal/buffering.js';
import {PlayerPresentation} from './presentation.js';
import {isCustomSource,materializeSource} from './sources.js';
import {playbackStatisticsClockReads,selectPlaybackStatistics} from './internal/machine/telemetry.js';
import {watchdogPolicy} from './internal/watchdogs.js';
import type {WatchdogOptions,WatchdogPolicy} from './types.js';
import type {BufferingOptions, BufferingPolicy, BufferingResolution, BufferingState} from './types.js';
import {normalizeTrackPolicy,trackAllowed,defaultTrack,assertTrackSelection,capturePolicyTrack,captureTrackPolicy} from './internal/track-policy.js';
import type {TrackPolicy} from './types.js';
import {plainVTT, BrowserCaptionUnsupported} from './internal/plain-vtt.js';
import {RuntimeCapabilities, compatibilityFailure, evidenceInterrupted, NativeLoadTimeout, StartupEvidenceTimeout} from './internal/runtime-capability.js';
import type {CapabilityEvidence} from './internal/runtime-capability.js';
import {MediaCapabilityQueries} from './internal/media-capabilities.js';
import {nativeBrowserCapabilities} from './internal/browser-media-capability.js';
import type {BrowserMediaCapability} from './internal/browser-media-capability.js';
import {featureRejection, executionPlan, qualifiedAudioFilter, planAdmission} from './internal/playback-plans.js';
import {executionRecipe} from './internal/execution-recipes.js';
import {deploymentRejectionError} from './internal/provider-deployment-errors.js';
import {EnginePreparation,preparationComponents} from './internal/engine-preparation.js';
import {recoveryRoute,type RouteRequirements} from './internal/machine/route-recovery.js';
import {promotionPlanAllowed,type PromotionFacts} from './internal/machine/route-promotion.js';
import {TierAttempts,preferredPlans} from './internal/tier-policy.js';
import {runtimeBase} from './internal/assets.js';
import {selectRemuxRuntime,deployedRemuxRuntime} from './internal/remux-runtime.js';
import {webgpuDecoderSupported,hasQualifiedWebGPUCodecs} from './internal/webgpu-codecs.js';
import {monitorSampleEligible} from './internal/machine/player-monitor.js';
import type {NativeProgressSample} from './internal/machine/telemetry.js';
import {PlayerError, playerError, redact} from './internal/errors.js';
import {freeze, tracks, trackKey, usesRemuxTracks} from './internal/state.js';
import {capturePlayerObservation} from './internal/effects/observations.js';
import {selectCapabilities,type CapabilityFacts} from './internal/machine/capabilities.js';
import {copyData} from './internal/machine/data.js';
import {initialPlayerControl} from './internal/machine/state.js';
import {transitionPlayer,sessionAuthority,type PlayerControlInput,type PlayerControlDecision} from './internal/machine/transition.js';
import {activeOperation,pendingOperation} from './internal/machine/operations.js';
import {sourceDesiredSettings} from './internal/machine/source.js';
import type {RawTrack} from './internal/state.js';
import type {PlayerState, PlayerEventMap, PlayerCapabilities, SessionError, OperationKind, PendingOperation, OpenOptions, MediaSourceInput} from './types.js';
import {PLAYBACK_MODES} from './types.js';
import {nativeRejection,nativeManifestRejection,losslessAdaptationRejection,audioTranscodeRejection,remuxRejection} from './internal/selection.js';
import type {PreparationOptions,PreparationReport} from './types.js';
import type {Probe, SelectionAttempt} from './internal/selection.js';
import type {AudioOutput, ToneMapping, FontAsset, SubtitleAsset, SubtitleOptions, ResourceLimits, MediaInputOptions, PlaybackMode, PlayerOptions, RemoteSource, TextTrackSource, Diagnostics, TrackType, PlaybackEvent} from './types.js';
import {backendPlan, type Backend, type Session} from './internal/backend.js';

import {PreviewController} from './preview/controller.js';
import {createPlayerPreview,type PlayerPreview} from './preview/player-preview.js';
import {SoftwarePreviewProvider} from './preview/software.js';
import {LocalVideoPreviewProvider,LocalRemuxPreviewProvider} from './preview/providers.js';
import {NativePlayer as PreviewNativePlayer} from './internal/native-player.js';
type Source = ({kind: 'local'; file: File | ArrayBuffer; input?: MediaInputOptions} | {kind: 'remote'; options: RemoteSource & {identity?: {size: string; etag?: string}}}) & {trackPolicy?:TrackPolicy};
class SeekPresentationBoundary extends PlayerError {
  constructor(target:number,boundary:number){super('INVALID_ARGUMENT',`Seek target ${target} is beyond the backend's audiovisual presentation end (${boundary}); subtitle-only seeking is not available on this plan`);}
}

import {discoveryPlanPolicy,discoveryOptionalProbe,localDiscoveryRemux,type DiscoveryChange,type DiscoveryFailure} from './internal/machine/route-discovery.js';
import {fastInspectionAllowed,inspectionSelection,initialInspectionPolicy,optionalInspectionFallback,type InspectionChange} from './internal/machine/route-inspection.js';
import {refineRouteAdmission,applyDeploymentRejections,attachRouteDecoding,type RoutePlan} from './internal/machine/route-admission.js';
import {attachmentAuthority,candidateAttachments,attachmentPreferences,type AttachmentInput,type AttachmentEffect,type AttachmentCommand,type AttachmentFacts} from './internal/machine/attachments.js';
import {boundaryAuthority} from './internal/machine/playback-boundary.js';
import {settingAuthority,effectiveVideoFilters,validOutputSize,type SettingCommand,type SettingEffect,type PlayerPreferences} from './internal/machine/settings.js';
import {createTrace,tracePlayerTransition,selectTrace} from './internal/machine/trace.js';
type Settings = import('./internal/machine/settings.js').PlaybackSettings;
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
  if (!validOutputSize(width,height)) throw new PlayerError('INVALID_ARGUMENT','Output dimensions must be within 1920×1080');
};

/** Three explicit playback modes. Mode/filter changes reopen transactionally. */
export class Player extends EventTarget {
  readonly #previewController:PreviewController;
  readonly #preview:PlayerPreview;
  get preview():PlayerPreview {return this.#preview;}
  private previewSource?:Blob;
  readonly ready = Promise.resolve();
  private assetBase: URL;
  private providerRuntime?: ProviderRuntime;
  private get buffering(){return this.control.preferences.buffering;}
  private set buffering(value:BufferingPolicy){this.updatePreferences({buffering:value});}
  private get stateSnapshot():PlayerState{return this.control.publication.snapshot??undefined!;}
  private subscribers = new Set<(state:PlayerState)=>void>();
  private get publicationSerial(){return this.control.publication.serial;}
  readonly presentation=new PlayerPresentation(this,()=>this.root);
  private get outputDeviceId(){return this.control.preferences.outputDeviceId;}
  private set outputDeviceId(value:string){this.updatePreferences({outputDeviceId:value});}
  private get sourceSerial(){return this.control.source.serial;}
  private seekRequests=new Map<number,AbortController>();
  private playRequests=new Map<number,AbortController>();
  private get playbackRange(){return this.control.preferences.playbackRange;}
  private set playbackRange(value:import('./types.js').PlaybackRange|null){this.updatePreferences({playbackRange:value});}
  private get loopPolicy(){return this.control.preferences.loopPolicy;}
  private set loopPolicy(value:import('./types.js').LoopPolicy){this.updatePreferences({loopPolicy:value});}
  private get qualityPolicy(){return this.control.preferences.qualityPolicy;}
  private set qualityPolicy(value:import('./types.js').QualityPolicy|null){this.updatePreferences({qualityPolicy:value});}
  private attachmentResources=new Map<string,{kind:'font';asset:FontAsset}|{kind:'subtitle';asset:SubtitleAsset}|{kind:'text';asset:TextTrackSource&{attachmentId:string}}>();
  private attachmentHandles=new WeakSet<import('./types.js').AttachmentHandle>();
  private get subtitleDelay(){return this.control.preferences.subtitleDelay;}
  private set subtitleDelay(value:number){this.updatePreferences({subtitleDelay:value});}
  private get audioDelay(){return this.control.preferences.audioDelay;}
  private set audioDelay(value:number){this.updatePreferences({audioDelay:value});}
  private get subtitleStyle(){return this.control.preferences.subtitleStyle;}
  private set subtitleStyle(value:import('./types.js').SubtitleStyle){this.updatePreferences({subtitleStyle:value});}
  private get operationStarted(){return this.control.publication.operationStart?.now??0;}
  private get publicSelections():ReadonlyMap<TrackType,string>{return new Map(Object.entries(this.candidatePreferences.publicSelections) as [TrackType,string][]);}
  private control=initialPlayerControl();
  private controlTrace=createTrace(256);
  private get transitionTrace(){return selectTrace(this.controlTrace);}
  private operationResources=new Map<number,{controller:AbortController;detachCallerAbort:()=>void}>();
  private dispatchControl(input:AttachmentInput):PlayerControlDecision<AttachmentEffect>;
  private dispatchControl(input:Exclude<PlayerControlInput,AttachmentInput>):PlayerControlDecision<SettingEffect>;
  private dispatchControl(input:PlayerControlInput):PlayerControlDecision{const before=this.control,decision=transitionPlayer(before,input);this.control=decision.state;if(before.attachments!==decision.state.attachments)this.pruneAttachments();if(before.routing.inspection!==decision.state.routing.inspection)this.pruneInspectionResources();this.controlTrace=tracePlayerTransition(this.controlTrace??createTrace(256),input,before,decision,decision.state.revision);return decision;}
  private get operationEpoch(){return this.control.operations.epoch;}
  private get activeOperation(){const entry=activeOperation(this.control.operations),resources=entry&&this.operationResources.get(entry.id);return entry&&resources?{...entry,...resources}:undefined;}
  private get pendingOperation():PendingOperation|null{return pendingOperation(this.control.operations);}
  private get sessionError(){return this.control.publication.error;}
  private set sessionError(error:SessionError|null){this.dispatchControl({type:'publication.error',epoch:this.operationEpoch,session:this.control.source.acceptedSession,error});}
  private get observedPlaying(){return this.control.playback.observedPlaying;}
  private get observedWaiting(){return this.control.playback.observedWaiting;}
  private get muted(){return this.control.preferences.muted;}
  private set muted(value:boolean){this.updatePreferences({muted:value});}
  private closing?: Promise<void>;
  private get currentMode(){return this.control.source.mode;}
  private set currentMode(mode:PlaybackMode){this.dispatchControl({type:'source.configure',mode});}
  private get automatic(){return this.control.source.automatic;}
  private set automatic(automatic:boolean){this.dispatchControl({type:'source.configure',automatic});}
  private get attempts(){return this.control.routing.attempts;}
  private set attempts(attempts:readonly SelectionAttempt[]){this.dispatchControl({type:'routing.attempts',attempts});}
  private runtimeCapabilities=new RuntimeCapabilities({read:()=>this.control.routing.evidence.capabilities,change:(change,revision)=>this.dispatchControl({type:'routing.capabilities',change,revision}).accepted});
  private tierAttempts=new TierAttempts({read:()=>this.control.routing.evidence.tiers,change:(change,revision)=>this.dispatchControl({type:'routing.tiers',change,revision}).accepted});
  private promotionTimer?:ReturnType<typeof setTimeout>;
  private get promotionRunning(){return this.control.routing.promotion.active?.phase==='trying';}
  private promotionController?:AbortController;
  private backgroundPromotion?:{maxKnownBytes:number};
  private tierConfiguration(settings=this.settings,requirements:RouteRequirements={}){return JSON.stringify([settings.aid,settings.sid,settings.subtitles,settings.vf,settings.af,settings.gain,this.candidatePreferences.toneMapping,this.audioOutput,this.audioPlayback,requirements.nativeRemux??this.nativeRemux,this.remuxRuntime,this.mpvSubtitles,this.nativeASS,this.fonts.length,this.subtitleAssets.length,[...this.publicSelections]]);}
  private promotionFacts():PromotionFacts{return {automatic:this.automatic,source:!!this.source,current:!!this.current,error:!!this.current?.error,paused:this.settings.pause,background:!!this.backgroundPromotion,waiting:this.observedWaiting,queued:this.queued};}
  private cancelPromotion(){
    const running=this.promotionRunning,controller=this.promotionController,operation=this.activeOperation?.controller,inspection=this.inspection,candidate=this.candidate;
    this.dispatchControl({type:'routing.promotion',change:{kind:'cancel'}});
    clearTimeout(this.promotionTimer);this.promotionTimer=undefined;this.promotionController=undefined;
    controller?.abort();if(running){operation?.abort();inspection?.abort();void candidate?.backend.destroy().catch(()=>{});}
  }
  private schedulePromotion(){
    clearTimeout(this.promotionTimer);this.promotionTimer=undefined;
    if(!this.dispatchControl({type:'routing.promotion',change:{kind:'schedule',now:performance.now(),facts:this.promotionFacts()}}).accepted)return;
    const timer=this.control.routing.promotion.timer;if(!timer)return;
    const wake=()=>{
      this.dispatchControl({type:'routing.promotion',change:{kind:'fired',id:timer.id,now:performance.now(),facts:this.promotionFacts()}});
      // Native timers may round down a fractional millisecond. Keep the same
      // lease and explicit deadline rather than losing a valid promotion.
      if(this.control.routing.promotion.timer?.id===timer.id){this.promotionTimer=setTimeout(wake,Math.max(1,timer.due-performance.now()));return;}
      if(this.control.routing.promotion.active?.id!==timer.id)return;
      const controller=this.promotionController=new AbortController();
      void this.enqueue(async()=>{
        try{
        this.dispatchControl({type:'routing.promotion',change:{kind:'start',id:timer.id,facts:this.promotionFacts()}});
        if(this.control.routing.promotion.active?.id!==timer.id||this.control.routing.promotion.active.phase!=='inspecting')return;
        const current=this.diagnostics.plan?.id,source=this.source!,settings={...this.settings};
        if(this.sourceInspection?.source!==source)await this.select(source,settings,true,this.nativeTracks,0,undefined,[],true);
        const inspected=this.sourceInspection;
        if(!current||!inspected||inspected.source!==source)return;
        const nativeReason=nativeRejection(inspected.probe,{...inspected.settings,subtitles:settings.subtitles,sid:settings.sid==='no'?'no':inspected.settings.sid});
        const plans=this.admissible(source,settings,this.subtitleAssets,this.nativeTracks,nativeReason,true);
        this.assertOperation();
        if(!this.dispatchControl({type:'routing.promotion',change:{kind:'trying',id:timer.id}}).accepted)return;
        this.admissionContext={nativeReason,automatic:true};
        for(const plan of preferredPlans(plans,current)){
          if(!promotionPlanAllowed(settings.pause,plan.mode,false)||this.tierAttempts.reason(source,this.tierConfiguration(settings),plan.id))continue;
          this.assertOperation();
          try{await this.replace(source,plan.mode,settings,true,this.nativeTracks,undefined,true,plan.id);return;}
          catch(error){if(compatibilityFailure(error))this.tierAttempts.failure(source,this.tierConfiguration(settings),plan.id,String(error));else return;}
        }
        }finally{this.dispatchControl({type:'routing.promotion',change:{kind:'finished',id:timer.id}});}
      // Inspection and a no-op preference check keep the accepted session paused.
      // replace() publishes switching only when an actual handoff begins.
      },null,controller.signal,true).catch(()=>{}).finally(()=>{this.dispatchControl({type:'routing.promotion',change:{kind:'finished',id:timer.id}});if(this.promotionController===controller)this.promotionController=undefined;});
    };
    this.promotionTimer=setTimeout(wake,200);
  }
  private readonly mediaCapabilityQueries=new MediaCapabilityQueries(typeof navigator==='undefined'||!navigator.mediaCapabilities?.decodingInfo?undefined:config=>navigator.mediaCapabilities.decodingInfo(config),150,()=>{
    if(this.destroyed)return;
    const inspected=this.sourceInspection;if(!inspected||inspected.source!==this.source)return;
    const epoch=this.operationEpoch,session=this.control.source.acceptedSession,answers=this.planDecisions.flatMap(plan=>plan.browserCapability?[{id:plan.id,evidence:this.mediaCapabilityQueries.cached(plan.browserCapability,inspected.probe)}]:[]);
    if(!this.dispatchControl({type:'routing.decoding',epoch,session,answers}).accepted)return;
    this.schedulePublish();if(!this.settings.pause||this.backgroundPromotion)this.schedulePromotion();
  });
  // Physical sources/errors stay outside the composed inspection metadata.
  private inspectionSourceKeys=new WeakMap<Source,number>();
  private inspectionSources=new Map<number,Source>();
  private inspectionErrors=new Map<number,PlayerError>();
  private updateInspection(change:InspectionChange){return this.dispatchControl({type:'routing.inspection',epoch:this.operationEpoch,operation:this.control.operations.active,change}).accepted;}
  private inspectionSourceKey(source:Source):number{
    this.inspectionSourceKeys??=new WeakMap();this.inspectionSources??=new Map();
    let id=this.inspectionSourceKeys.get(source);
    if(id===undefined){if(!this.updateInspection({kind:'source.allocate'}))throw new PlayerError('ABORTED','Inspection was retired');id=this.control.routing.inspection.sourceSerial;this.inspectionSourceKeys.set(source,id);}
    this.inspectionSources.set(id,source);return id;
  }
  private pruneInspectionResources(){
    const state=this.control.routing.inspection,retained=new Set([state.probe?.source,state.fastSource,state.lossless?.source]);
    for(const id of this.inspectionSources?.keys()??[])if(!retained.has(id))this.inspectionSources.delete(id);
    for(const id of this.inspectionErrors?.keys()??[])if(id!==state.playbackFailure)this.inspectionErrors.delete(id);
  }
  private captureInspection(){return {scope:{epoch:this.operationEpoch,operation:this.control.operations.active},state:this.control.routing.inspection,sources:new Map(this.inspectionSources),errors:new Map(this.inspectionErrors)};}
  private restoreInspection(snapshot:ReturnType<Player['captureInspection']>){
    for(const [id,source]of snapshot.sources)(this.inspectionSources??=new Map()).set(id,source);
    for(const [id,error]of snapshot.errors)(this.inspectionErrors??=new Map()).set(id,error);
    this.dispatchControl({type:'routing.inspection',...snapshot.scope,change:{kind:'restore',value:snapshot.state}});this.pruneInspectionResources();
  }
  private get sourceInspection(){const value=this.control.routing.inspection.probe,source=value&&this.inspectionSources?.get(value.source);return value&&source?{source,probe:value.probe,settings:value.settings}:undefined;}
  private set sourceInspection(value:{source:Source;probe:Probe;settings:{aid:string;sid:string;subtitles:boolean}}|undefined){const source=value?this.inspectionSourceKey(value.source):undefined;this.updateInspection({kind:'probe',value:value?{source:source!,probe:value.probe,settings:value.settings}:null});this.pruneInspectionResources();}
  private get fastInspectedSource(){const id=this.control.routing.inspection.fastSource;return id===null?undefined:this.inspectionSources?.get(id);}
  private set fastInspectedSource(source:Source|undefined){this.updateInspection({kind:'fast',source:source?this.inspectionSourceKey(source):null});this.pruneInspectionResources();}
  private get losslessInspection(){const value=this.control.routing.inspection.lossless,source=value&&this.inspectionSources?.get(value.source);return value&&source?{source,reason:value.reason}:undefined;}
  private set losslessInspection(value:{source:Source;reason?:string}|undefined){this.updateInspection({kind:'lossless',value:value?{source:this.inspectionSourceKey(value.source),reason:value.reason}:null});this.pruneInspectionResources();}
  private get mpvSubtitleAssetsAvailable(){return this.control.routing.inspection.subtitleAssets;}
  private set mpvSubtitleAssetsAvailable(value:boolean){this.updateInspection({kind:'assets',value:{subtitleAssets:value}});}
  private get selectiveAudioAssetsAvailable(){return this.control.routing.inspection.selectiveAssets;}
  private set selectiveAudioAssetsAvailable(value:boolean){this.updateInspection({kind:'assets',value:{selectiveAssets:value}});}
  private get selectiveAudioAssetsChecked(){return this.control.routing.inspection.selectiveChecked;}
  private set selectiveAudioAssetsChecked(value:boolean){this.updateInspection({kind:'assets',value:{selectiveChecked:value}});}
  private inspection?: AbortController;
  private get recovering(){return this.control.routing.recovery.pending!==null;}
  private lifetime = new AbortController();
  private preparation?:EnginePreparation;
  private preparationTask:Promise<PreparationReport>=Promise.resolve({milliseconds:0,assets:[]});
  private audioAdaptation?:'flac'|'opus';
  private automaticLossless=false;
  private audioPlayback:'auto'|'worklet';
  private get privatePlaybackAssetsAvailable(){return this.control.routing.inspection.playbackAvailable;}
  private set privatePlaybackAssetsAvailable(value:boolean){this.updateInspection({kind:'assets',value:{playbackAvailable:value}});}
  private get privatePlaybackAssets(){return this.control.routing.inspection.playbackAssets;}
  private set privatePlaybackAssets(value:PrivatePlaybackAssets|undefined){this.updateInspection({kind:'assets',value:{playbackAssets:value}});}
  private get privatePlaybackAssetsFailure(){const id=this.control.routing.inspection.playbackFailure;return id===null?undefined:this.inspectionErrors?.get(id);}
  private set privatePlaybackAssetsFailure(error:PlayerError|undefined){if(this.updateInspection({kind:'failure',failed:!!error})&&error)(this.inspectionErrors??=new Map()).set(this.control.routing.inspection.playbackFailure!,error);}
  private get transcodeAssetsAvailable(){return this.control.routing.inspection.transcodeAssets;}
  private set transcodeAssetsAvailable(value:boolean){this.updateInspection({kind:'assets',value:{transcodeAssets:value}});}
  private get transcodeAssetsChecked(){return this.control.routing.inspection.transcodeChecked;}
  private set transcodeAssetsChecked(value:boolean){this.updateInspection({kind:'assets',value:{transcodeChecked:value}});}
  private bufferedNativeSeeks:boolean;
  private hybridAudioFilters: boolean;
  private nativeASS:boolean;
  private mpvSubtitles:boolean;
  private allowLossy=false;
  private get planDecisions():readonly RoutePlan[]{return this.control.routing.plans;}
  private set planDecisions(plans:readonly RoutePlan[]){this.dispatchControl({type:'routing.plans',plans});}
  private get admissionContext(){return this.control.routing.context;}
  private set admissionContext(context:{nativeReason?:string;automatic:boolean}){this.dispatchControl({type:'routing.context',context});}
  private rejectPlan(id:string,reason:string){this.dispatchControl({type:'routing.reject',id,code:'FEATURE_UNSUPPORTED',reason});return this.planDecisions.find(plan=>plan.id===id)!;}
  private nativeRemux: 'auto' | 'never' | 'always';
  private remuxSelection: ReturnType<typeof selectRemuxRuntime>;
  private remuxRuntime: 'pthread' | 'jspi' | 'asyncify';
  private get privateRemux(){return this.remuxRuntime!=='pthread';}
  private selectDeployedRuntime(){
    if(!this.providerRuntime)return;
    this.remuxSelection=deployedRemuxRuntime(this.remuxSelection,runtime=>{
      const suffix=runtime==='pthread'?'':'-'+runtime;
      return this.providerRuntime!.hasOffer('ffmpeg-file-preparation'+suffix,'packet-copy')&&this.providerRuntime!.has(`web/engine-remux${suffix}/remux.wasm`)||!!this.providerRuntime!.codecInspector(runtime);
    });
    this.remuxRuntime=this.remuxSelection.runtime;
  }
  private get preparationProviderId(){return 'ffmpeg-file-preparation'+(this.privateRemux?'-'+this.remuxRuntime:'');}
  private get canInspectFFmpeg(){return (globalThis.crossOriginIsolated===true||this.privateRemux)&&(!this.providerRuntime||this.providerRuntime.hasOffer(this.preparationProviderId,'packet-copy')&&this.providerRuntime.has(`web/engine-remux${this.privateRemux?'-'+this.remuxRuntime:''}/remux.wasm`)||!!this.providerRuntime.codecInspector(this.remuxRuntime));}
  private softwarePresenter: 'auto' | 'rgb' | 'experimental-yuv';
  private decodeQuality:'exact'|'balanced'|'performance';
  private adaptiveFrameDrop:boolean;
  private get settings(){return this.control.settings;}
  private set settings(value:Readonly<Settings>){this.dispatchControl({type:'settings.accept',value});}
  private updateSettings(value:Partial<Settings>){this.dispatchControl({type:'settings.change',value});}
  private updatePreferences(value:Partial<PlayerPreferences>){this.dispatchControl({type:'preferences.change',value});}
  private get candidatePreferences(){const pending=this.control.settingsTransactions.pending;return pending?.reconfigure&&pending.phase==='applying'?pending.preferences:attachmentPreferences(this.control);}
  private configuredTrackPolicy:TrackPolicy;
  get trackPolicy():TrackPolicy{return this.source?.trackPolicy??this.configuredTrackPolicy;}
  private audioOutput: AudioOutput;
  private audioFallback: 'stereo' | 'reject';
  private get toneMapping(){return this.control.preferences.toneMapping;}
  private set toneMapping(value:ToneMapping){this.updatePreferences({toneMapping:value});}
  private resourceLimits: ResourceLimits;
  private get fonts():FontAsset[]{return candidateAttachments(this.control).flatMap(entry=>{const resource=this.attachmentResources?.get(entry.id);return resource?.kind==='font'?[resource.asset]:[];});}
  private get subtitleAssets():SubtitleAsset[]{return candidateAttachments(this.control).flatMap(entry=>{const resource=this.attachmentResources?.get(entry.id);return resource?.kind==='subtitle'?[resource.asset]:[];});}
  private root: HTMLDivElement;
  private get width(){return this.control.preferences.outputSize.width;}
  private get height(){return this.control.preferences.outputSize.height;}
  private current?: Session;
  private candidate?: Session;
  private source?: Source;
  private get nativeTracks():(TextTrackSource&{attachmentId:string})[]{return candidateAttachments(this.control).flatMap(entry=>{const resource=this.attachmentResources?.get(entry.id);return resource?.kind==='text'?[resource.asset]:[];});}
  private pruneAttachments(){if(!this.attachmentResources)return;const state=this.control.attachments,retained=new Set([...state.entries,...(state.pending?.entries??[])].map(entry=>entry.id));for(const id of this.attachmentResources.keys())if(!retained.has(id))this.attachmentResources.delete(id);}
  private queue: Promise<void> = Promise.resolve();
  private get queued(){return this.control.operations.entries.length;}
  private get destroyed(){return this.control.operations.terminal;}
  private destruction?: Promise<void>;
  private get busy(){return this.control.source.candidate!==null;}
  private empty = new Map<string, unknown>();
  private monitor?: ReturnType<typeof setInterval>;
  private get watchdogConfiguration(){return this.control.monitor.policy;}
  private set watchdogConfiguration(policy:WatchdogPolicy){this.dispatchControl({type:'monitor.policy',policy});}
  get watchdogs():WatchdogPolicy {return this.watchdogConfiguration;}
  /** Replaces the watchdog policy immediately; omitted object fields use defaults. */
  setWatchdogs(options:boolean|WatchdogOptions):void {
    if(this.destroyed)throw new PlayerError('ABORTED','Player is destroyed');
    const policy=watchdogPolicy(options);this.watchdogConfiguration=policy;
    const revision=this.control.monitor.policyRevision,session=this.current,candidate=this.candidate;
    this.stopWatchdogs();session?.backend.setWatchdogs?.(policy);
    if(revision!==this.control.monitor.policyRevision||this.destroyed)return;
    if(candidate===this.candidate)candidate?.backend.setWatchdogs?.(policy);
    if(revision===this.control.monitor.policyRevision&&!this.destroyed)this.startWatchdogs();
  }
  private startWatchdogs(){
    const session=this.current,mode=this.mode,epoch=this.operationEpoch,sessionId=this.control.source.acceptedSession;
    const error=!!session?.error,closing=!!this.closing,enabled=mode==='native'?this.watchdogConfiguration.nativeProgress:mode==='hybrid'&&this.watchdogConfiguration.hybridDecoder;
    // Preserve cheap eligibility before optional host property reads.
    const cheap=!!session&&!error&&!this.destroyed&&!closing&&enabled&&!this.settings.pause;
    const backendPaused=cheap&&session!.backend.properties.get('pause')===true;
    const backendEOF=cheap&&!backendPaused&&session!.backend.properties.get('eof-reached')===true;
    const hidden=cheap&&!backendPaused&&!backendEOF&&!!this.root.ownerDocument.hidden;
    if(session!==this.current||epoch!==this.operationEpoch)return;
    this.dispatchControl({type:'monitor.reconcile',epoch,session:sessionId,mode,present:!!session,error,closing,backendPaused,backendEOF,hidden});
    const owner=this.control.monitor.current;
    if(!owner){this.stopWatchdogs();return;}
    // The physical timer is associated with exactly one pure monitor lease.
    if(this.monitor!==undefined&&this.monitorHandleId===owner.id)return;
    const old=this.monitor;this.monitor=undefined;this.monitorHandleId=undefined;clearInterval(old);
    if(this.control.monitor.current?.id!==owner.id||this.monitor!==undefined)return;
    let timer:ReturnType<typeof setInterval>;
    try{timer=setInterval(()=>this.sampleWatchdog(session!,owner.id,owner.session),owner.mode==='native'?500:250);}
    catch(error){if(this.control.monitor.current?.id===owner.id&&this.monitor===undefined)this.dispatchControl({type:'monitor.stop'});throw error;}
    if(this.control.monitor.current?.id!==owner.id||this.monitor!==undefined){clearInterval(timer);return;}
    this.monitor=timer;this.monitorHandleId=owner.id;
  }
  private monitorHandleId?:number;
  private sampleWatchdog(session:Session,id:number,sessionId:number){
    const owner=this.control.monitor.current;if(!owner||owner.id!==id||this.current!==session)return;
    const epoch=this.operationEpoch,activity=this.control.monitor.activity;
    const facts={session:sessionId,hidden:!!this.root.ownerDocument.hidden,retired:!!session.retired,error:!!session.error};
    const eligible=monitorSampleEligible(this.control,facts);
    let native:NativeProgressSample|null=null,now:number|undefined,timing:null|{startTime:number;endTime:number;maxIntervalSeconds:number}=null,hasVideo=false,softwareDecoder=false;
    if(eligible&&owner.mode==='native'){
      const sample=session.backend.nativeProgressSample?.();
      if(sample){native={eligible:sample.eligible,time:sample.time,rate:sample.rate,frames:sample.frames,frameIntervalMs:sample.frameIntervalMs,videoEnd:sample.videoEnd};
        const metadata=this.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture)?.frameTiming;
        if(metadata)timing={startTime:metadata.startTime,endTime:metadata.endTime,maxIntervalSeconds:metadata.maxIntervalSeconds};now=performance.now();}
    }else if(eligible){
      hasVideo=!!(session.backend.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined)?.some(t=>t.type==='video'&&t.selected);
      softwareDecoder=(session.backend.diagnostics as {decoder?:string}|undefined)?.decoder==='software';
    }
    if(this.current!==session)return;
    const sampled=this.dispatchControl({type:'monitor.sample',id,epoch,session:sessionId,activity,hidden:facts.hidden,retired:facts.retired,error:facts.error,native,now,timing,hasVideo,softwareDecoder});
    const fault=this.control.monitor.fault;if(!sampled.accepted||fault?.id!==id)return;
    const error=fault.reason==='hybrid'?new PlayerError('DECODE_FAILED','Hybrid browser decoder became inactive for four consecutive checks'):new PlayerError('PLAYBACK_STALLED',`Native ${fault.reason==='clock'?'playback clock':'video frame counter'} stopped progressing despite buffered media`,null,null,'session',true);
    this.stopWatchdogs();if(this.current!==session||sessionAuthority(this.control,sessionId)!=='accepted')return;session.error=error;
    if(this.automatic)this.recover(session);
    else {this.updateSettings({pause:true});void session.backend.pause().catch(()=>{});if(this.current===session&&sessionAuthority(this.control,sessionId)==='accepted')this.emit('error',error);}
  }
  private stopWatchdogs(){const timer=this.monitor;this.monitor=undefined;this.monitorHandleId=undefined;this.dispatchControl({type:'monitor.stop'});clearInterval(timer);}

  constructor(container: HTMLElement, options: PlayerOptions = {}) {
    super();
    this.watchdogConfiguration=watchdogPolicy(options.watchdogs);
    this.configuredTrackPolicy=normalizeTrackPolicy(options.trackPolicy);
    const prepare=preparationComponents(options.prepare??[]);
    if (typeof HTMLElement==='undefined') throw new PlayerError('INVALID_ARGUMENT','Player construction requires a browser');
    this.buffering=bufferingPolicy(options.buffering);
    this.assetBase=runtimeBase(options.assetBase);
    if(providerDeploymentEnabled)this.providerRuntime=new ProviderRuntime(this.assetBase,qualifiedProviderIdentities);
    if (!(container instanceof HTMLElement) || container instanceof HTMLCanvasElement || container instanceof HTMLVideoElement) throw new PlayerError('INVALID_ARGUMENT','Pass a container element; Player owns its video/canvas surface');
    this.#previewController=new PreviewController([
      {id:'shaka',priority:20,canHandle:()=>!!this.current?.backend.previewFrame,
        getFrame:request=>this.current?.backend.previewFrame?.(request)??Promise.resolve(null)},
      new LocalVideoPreviewProvider(()=>this.busy||this.queued>0||this.previewBuffering()?undefined:this.previewSource,container.ownerDocument,options.resourceLimits?.maxDecodePixels),
      new LocalRemuxPreviewProvider(()=>{
        if(this.busy||this.queued>0||this.previewBuffering()||!['remux','remux-mpv'].includes(backendPlan(this.current?.backend)??''))return undefined;
        return this.previewSource;
      },container.ownerDocument,video=>new PreviewNativePlayer(video,'always',this.assetBase,false,undefined,undefined,false,[],'native-remux',bufferingPolicy({preload:'auto',profile:'low-latency',memoryBudget:8*1024*1024}),2500,undefined,this.remuxRuntime,this.providerRuntime),options.resourceLimits?.maxDecodePixels),
      new SoftwarePreviewProvider(()=>{
        if(this.busy||this.queued>0||this.previewBuffering())return undefined;
        if(this.previewSource)return {file:this.previewSource,input:this.source?.kind==='local'?this.source.input:undefined};
        if(this.source?.kind==='remote'&&!this.source.options.streaming?.live&&this.stateSnapshot.streamType!=='live')return {remote:this.source.options};
        return undefined;
      },container.ownerDocument,this.assetBase,options.resourceLimits),
    ],options.preview===false?{enabled:false}:options.preview);
    this.#preview=createPlayerPreview(this.#previewController);
    this.currentMode = modeValue(options.mode ?? 'native');
    this.automatic = options.automaticSelection ?? options.mode === undefined;
    if(typeof this.automatic !== 'boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid automatic selection policy');
    this.audioOutput=options.audioOutput??'stereo';this.audioFallback=options.audioFallback??'stereo';
    this.toneMapping=options.toneMapping??'off';
    if(!['stereo','5.1','7.1','auto'].includes(this.audioOutput)||!['stereo','reject'].includes(this.audioFallback))throw new PlayerError('INVALID_ARGUMENT','Invalid audio output policy');
    if(!['off','hdr-to-sdr'].includes(this.toneMapping))throw new PlayerError('INVALID_ARGUMENT','Invalid tone mapping policy');
    this.resourceLimits={maxDecodePixels:options.resourceLimits?.maxDecodePixels??8294400,maxAllocationBytes:options.resourceLimits?.maxAllocationBytes??134217728};
    if(!Number.isInteger(this.resourceLimits.maxDecodePixels)||this.resourceLimits.maxDecodePixels!<1||this.resourceLimits.maxDecodePixels!>8294400||!Number.isInteger(this.resourceLimits.maxAllocationBytes)||this.resourceLimits.maxAllocationBytes!<33554432||this.resourceLimits.maxAllocationBytes!>268435456)throw new PlayerError('INVALID_ARGUMENT','Invalid decode resource limits');
    this.audioPlayback=options.audioPlayback??'auto';
    if(!['auto','worklet'].includes(this.audioPlayback))throw new PlayerError('INVALID_ARGUMENT','audioPlayback must be auto or worklet');
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
    this.remuxSelection=selectRemuxRuntime(options);
    this.remuxRuntime=this.remuxSelection.runtime;
    this.softwarePresenter=options.softwarePresenter??'auto';
    this.decodeQuality=options.decodeQuality??'exact';
    this.adaptiveFrameDrop=options.adaptiveFrameDrop??false;
    if(!['exact','balanced','performance'].includes(this.decodeQuality)||typeof this.adaptiveFrameDrop!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid Software decode policy');
    if(!['auto','rgb','experimental-yuv'].includes(this.softwarePresenter))throw new PlayerError('INVALID_ARGUMENT','Invalid software presenter');
    if(!['auto','never','always'].includes(this.nativeRemux))throw new PlayerError('INVALID_ARGUMENT','Invalid native remux policy');
    const width=options.width??640,height=options.height??360;dimensions(width,height);this.updatePreferences({outputSize:{width,height}});
    this.settings = {pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: filterChain(options.videoFilters ?? ''), af: filterChain(options.audioFilters ?? ''), gain:options.audioGain??1};
    if(!Number.isFinite(this.settings.gain)||this.settings.gain<0||this.settings.gain>1)throw new PlayerError('INVALID_ARGUMENT','Gain must be between 0 and 1');
    if(this.automatic&&(this.settings.vf||this.settings.af||this.toneMapping!=='off'))this.currentMode=this.settings.vf||this.toneMapping!=='off'||!this.hybridAudioFilters||!qualifiedAudioFilter(this.settings.af)?'software':'hybrid';
    this.validateFilters(this.currentMode, this.settings);
    this.root = document.createElement('div');this.root.className = 'demuxe-player';container.append(this.root);
    this.root.ownerDocument.addEventListener('visibilitychange',()=>{this.dispatchControl({type:'monitor.activity'});this.startWatchdogs();},{signal:this.lifetime.signal});
    this.publish();
    if(prepare.length)void this.prepare(prepare);
  }
  /** Stable composition host; internal surfaces may change between routes. */
  get host():HTMLElement {return this.root;}
  get isDestroyed():boolean {return this.destroyed;}
  get state(): PlayerState {return this.stateSnapshot;}
  get mediaInfo() {return this.stateSnapshot.mediaInfo;}
  subscribe(listener:(state:PlayerState)=>void):()=>void {
    this.subscribers.add(listener);this.notifySubscriber(listener,this.stateSnapshot);return ()=>{this.subscribers.delete(listener);};
  }
  addEventListener<K extends keyof PlayerEventMap>(type:K, listener:((this:Player,ev:PlayerEventMap[K])=>any)|null, options?:boolean|AddEventListenerOptions):void;
  addEventListener(type:string,listener:EventListenerOrEventListenerObject|null,options?:boolean|AddEventListenerOptions):void;
  addEventListener(type:string,listener:any,options?:boolean|AddEventListenerOptions) {super.addEventListener(type,listener,options);}
  removeEventListener<K extends keyof PlayerEventMap>(type:K, listener:((this:Player,ev:PlayerEventMap[K])=>any)|null, options?:boolean|EventListenerOptions):void;
  removeEventListener(type:string,listener:EventListenerOrEventListenerObject|null,options?:boolean|EventListenerOptions):void;
  removeEventListener(type:string,listener:any,options?:boolean|EventListenerOptions){super.removeEventListener(type,listener,options);}
  private schedulePublish() {
    const queued=this.dispatchControl({type:'publication.schedule'});if(!queued.accepted)return;
    queueMicrotask(()=>{if(this.dispatchControl({type:'publication.scheduled',id:queued.id!}).accepted&&!this.busy)this.publish();});
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
  private notifySubscriber(listener:(state:PlayerState)=>void,state:PlayerState) {
    try{listener(state);}catch(error){try{globalThis.reportError?.(error);}catch{/* Reporting cannot change playback or stop other observers. */}}
  }
  private publish() {
    const serial=this.dispatchControl({type:'publication.begin'}).id!,previous=this.stateSnapshot,session=this.current,source=this.source,acceptedControl=this.control.captureRevision;
    const sourceId=this.sourceSerial,epoch=this.operationEpoch,mode=this.mode,settings={...this.settings};
    const current=()=>acceptedControl===this.control.captureRevision&&serial===this.publicationSerial&&previous===this.stateSnapshot&&session===this.current&&source===this.source&&sourceId===this.sourceSerial&&epoch===this.operationEpoch&&mode===this.mode;
    const controls={
      sourceId:session?sourceId:null,sourcePresent:!!source,requestedLive:source?.kind==='remote'&&source.options.streaming?.live===true,
      mode,automaticSelection:this.automatic,pause:settings.pause,subtitlesVisible:settings.subtitles,volumePercent:settings.volume,muted:this.muted,playbackRate:settings.speed,
      pendingOperation:this.pendingOperation,error:this.sessionError,observedPlaying:this.observedPlaying,observedWaiting:this.observedWaiting,busy:this.busy,operationActive:!!this.activeOperation,
      timing:this.getTimingSettings(),loop:this.getLoop(),playbackRange:this.getPlaybackRange(),audioOutputDevice:this.outputDeviceId,trackPolicy:this.trackPolicy,
    };
    let raw=this.sessionTracks(session,source,mode,settings);
    if(mode==='native'&&(session?.surface as HTMLVideoElement|undefined)?.videoWidth&&!raw.some(t=>t.type==='video'))raw=[...raw,{id:'1',type:'video',selected:true}];
    const list=session?tracks(raw,sourceId,mode,backendPlan(session.backend)).filter(t=>trackAllowed(t,t.type==='audio'?controls.trackPolicy.audio:t.type==='subtitle'?controls.trackPolicy.subtitles:undefined)):[];
    const input=capturePlayerObservation({...controls,tracks:list,streaming:this.captureStreamingState(session,sourceId),capabilityFacts:this.capabilityFacts(session,source),properties:session?.backend.properties??this.empty,surface:session?.surface});
    // Host reads can invoke application code. Never install a sample from a
    // retired tuple, or overwrite a publication made by that application code.
    if(!current()){this.schedulePublish();return;}
    const prepared=this.dispatchControl({type:'publication.prepare',id:serial,captureRevision:acceptedControl,input});
    if(!prepared.accepted){this.schedulePublish();return;}
    const projection=prepared.publication!,preview=projection.preview;
    for(const apply of [()=>this.#previewController.setPlaybackActive(preview.playbackActive),()=>this.#previewController.setSuspended(preview.suspended),()=>this.#previewController.setDuration(preview.duration),()=>this.#previewController.setPlaybackPosition(preview.position)]){
      apply();if(!current()){this.schedulePublish();return;}
    }
    const next=projection.state;
    const command={kind:'observe' as const,observation:{sourceId:next.sourceId,status:next.status,playbackIntent:next.playbackIntent,operationPending:!!next.pendingOperation}};
    const timestamps=Array.from({length:projection.changed?playbackStatisticsClockReads(this.control.publication.statistics,command):0},()=>performance.now());
    if(!current()){this.schedulePublish();return;}
    const committed=this.dispatchControl({type:'publication.commit',id:serial,captureRevision:acceptedControl,timestamps});
    if(!committed.accepted){this.schedulePublish();return;}
    if(!projection.changed)return;
    const stillCurrent=()=>serial===this.publicationSerial&&this.stateSnapshot===next&&this.operationEpoch===epoch;
    // A reentrant publication supersedes the rest of this batch. Every delivered
    // event carries the exact committed snapshot that selected its event name.
    for(const listener of [...this.subscribers]){if(!stillCurrent())return;this.notifySubscriber(listener,next);}
    for(const event of projection.notifications){if(!stillCurrent())return;this.dispatchEvent(new CustomEvent(event,{detail:next}));}
    if(stillCurrent()&&projection.enforceBoundary)this.enforceBoundary();
  }
  private capabilityFacts(session=this.current,source=this.source):Omit<CapabilityFacts,'mode'|'hasSession'|'automaticSelection'|'previousDuration'|'backendNativeLive'> {
    const resolution=this.bufferingResolution();
    return {
      backendPlan:backendPlan(session?.backend)??null,nativeASS:this.nativeASS,privateRemux:this.privateRemux,privateFull:this.privatePlaybackAssets?.codecProfile==='playback-full',providerRuntime:!!this.providerRuntime,
      hybridAudioFilters:this.hybridAudioFilters,nativeRemux:this.nativeRemux,canInspectFFmpeg:this.canInspectFFmpeg,remoteFormat:source?.kind==='remote'?source.options.format??null:null,
      backendMpvSubtitles:!!(session?.backend.diagnostics as {mpvSubtitles?:unknown}|undefined)?.mpvSubtitles,backendSetQuality:!!session?.backend.setQuality,backendSeekToLive:!!session?.backend.seekToLive,
      isolated:globalThis.crossOriginIsolated===true,webCodecs:typeof VideoDecoder!=='undefined',mediaSource:typeof MediaSource!=='undefined',webAudio:typeof AudioContext!=='undefined',
      bufferingBackend:resolution.backend,bufferingControl:resolution.control,
    };
  }
  private featureCapabilities(seekable:PlayerState['seekable'],audio:number,sub:number):PlayerCapabilities {
    return selectCapabilities({...this.capabilityFacts(),mode:this.mode,hasSession:!!this.current,automaticSelection:this.automatic,previousDuration:this.stateSnapshot?.duration,backendNativeLive:this.current?.backend.properties.get('native-live')===true},seekable,audio,sub);
  }
  get mode() {return this.currentMode;}
  get automaticSelection() {return this.automatic;}
  get surface() {return this.current?.surface;}
  get properties(): ReadonlyMap<string, unknown> {return this.current?.backend.properties ?? this.empty;}
  get capabilities(): PlayerCapabilities {return this.stateSnapshot?.capabilities??this.featureCapabilities(null,0,0);}
  /** Replace the buffering policy without reopening the source. Omitted fields use defaults. */
  setBuffering(options:BufferingOptions):Promise<void>{
    let next:BufferingPolicy;try{next=bufferingPolicy(options);}catch(error){return Promise.reject(error);}
    return this.enqueue(async()=>{
      const backend=this.current?.backend;
      if(backend&&(!backend.setBuffering||backend.bufferingUpdateSupported===false))throw new PlayerError('UNSUPPORTED_FEATURE','This backend cannot update buffering at runtime');
      await this.applySetting({kind:'buffering',value:next});
    });
  }
  getBuffering():BufferingState{
    const effective=this.bufferingResolution(),backend=effective.backend;
    return freeze({active:!!this.current,requested:{...this.buffering},effective:structuredClone(effective),capabilities:{runtimeUpdate:!this.current||(!!this.current.backend.setBuffering&&this.current.backend.bufferingUpdateSupported!==false),timeTargets:backend==='remux'||backend==='shaka',memoryBudget:backend==='remux'||backend==='mpv',manualRanges:false},buffered:this.stateSnapshot?.buffered?.map(range=>({...range}))??null,cached:this.stateSnapshot?.cached?.map(range=>({...range}))??null});
  }
  private bufferingResolution():BufferingResolution {
    const cheap=this.current?.backend.bufferingDiagnostics;
    if(cheap)return cheap;
    const diagnostics=this.current?.backend.diagnostics as {buffering?:BufferingResolution;plan?:string}|undefined;
    return diagnostics?.buffering??resolveBuffering(this.buffering,this.mode!=='native'?'mpv':diagnostics?.plan==='shaka-mse'?'shaka':usesRemuxTracks(diagnostics?.plan)?'remux':'browser');
  }
  get diagnostics(): Diagnostics {
    const backend=this.current?.backend.diagnostics as Record<string,unknown>|undefined;
    return redact({remuxRuntime:this.remuxSelection,watchdogs:this.watchdogConfiguration,preview:this.preview.diagnostics,buffering:this.bufferingResolution(),mode: this.mode, plan:this.current?executionPlan(this.mode,backend?.plan as string|undefined,this.settings.af,this.settings.gain,!!backend?.subtitleOverlay):undefined, planAdmission:this.planDecisions,runtimeCapabilities:this.runtimeCapabilities.snapshot(),selection:{automatic:this.automatic,attempts:this.attempts.map(a=>({...a}))}, switching: this.busy, videoFilters: this.settings.vf, audioFilters: this.settings.af, audioGain:this.settings.gain, toneMapping:this.toneMapping, resourceLimits:{...this.resourceLimits}, decodeQuality:this.decodeQuality,adaptiveFrameDrop:this.adaptiveFrameDrop, backend});
  }
  getStreamingState():import('./types.js').StreamingState|null{return this.captureStreamingState(this.current,this.sourceSerial);}
  private captureStreamingState(session:Session|undefined,sourceId:number):import('./types.js').StreamingState|null{
    const raw=session?.backend.streamingState?.();if(!raw)return null;
    const prefix=`${sourceId}:`;
    return copyData({...raw,qualities:raw.qualities.map(q=>({...q,id:prefix+q.id})),selectedId:raw.selectedId?prefix+raw.selectedId:null,presentedId:raw.presentedId?prefix+raw.presentedId:null,requested:raw.requested.mode==='manual'?{...raw.requested,id:prefix+raw.requested.id}:{...raw.requested}});
  }
  setQuality(policy:import('./types.js').QualityPolicy):Promise<void>{
    if(!policy||!['auto','manual'].includes(policy.mode)||policy.mode==='manual'&&typeof policy.id!=='string'||policy.mode==='auto'&&[policy.maxHeight,policy.maxBandwidth].some(v=>v!==undefined&&(!Number.isFinite(v)||v<=0)))throw new PlayerError('INVALID_ARGUMENT','Invalid quality policy');
    const requested={...policy};
    return this.enqueue(async()=>{
      const backend=this.current?.backend;if(!backend?.setQuality)throw new PlayerError('UNSUPPORTED_FEATURE','This route has no adaptive quality control');
      const prefix=`${this.sourceSerial}:`;
      if(requested.mode==='manual'&&!requested.id.startsWith(prefix))throw new PlayerError('INVALID_ARGUMENT','Quality belongs to a different source');
      const raw=requested.mode==='manual'?{...requested,id:requested.id.slice(prefix.length)}:requested;
      await this.applySetting({kind:'quality',value:raw,previous:backend.streamingState?.().requested??{mode:'auto'}});
    });
  }
  seekToLive():Promise<void>{return this.enqueue(async()=>{if(!this.current?.backend.seekToLive)throw new PlayerError('UNSUPPORTED_FEATURE','This route has no live navigation');await this.current.backend.seekToLive();},'seeking');}
  getAudioOutputDevice(){return this.outputDeviceId;}
  setAudioOutputDevice(id:string){
    if(typeof id!=='string'||id.length>1024)throw new PlayerError('INVALID_ARGUMENT','Invalid output device ID');
    return this.enqueue(async()=>{
      if(!this.current?.backend.setAudioOutputDevice)throw new PlayerError('UNSUPPORTED_FEATURE','Open a source with output-device support first');
      try{await this.applySetting({kind:'output',value:id});}
      catch(error){if((error as Error).name==='NotAllowedError')throw new PlayerError('SOURCE_PERMISSION','Audio output permission denied');throw error;}
    });
  }
  getStats():import('./types.js').PlaybackStats {const statistics=this.control.publication.statistics;return selectPlaybackStatistics(statistics,statistics.waitingAt===null?undefined:performance.now());}
  getPlaybackExplanation():import('./types.js').PlaybackExplanation {
    const diagnostics=this.diagnostics,plan=diagnostics.plan;
    const backend=this.current?.backend.diagnostics as {subtitleOverlay?:{component?:string};mpvSubtitles?:unknown;decodePolicy?:{effective?:unknown;shortcuts?:unknown}}|undefined;
    const observed=this.mode==='software'?backend?.decodePolicy:undefined;
    const effective=observed&&['exact','balanced','performance'].includes(String(observed.effective))?observed.effective as 'exact'|'balanced'|'performance':null;
    return freeze({sourceId:this.state.sourceId,mode:this.state.activeMode,planId:plan?.id??null,video:plan?.video??null,audio:plan?.audio??null,
      subtitle:this.state.mediaInfo.subtitle?(backend?.subtitleOverlay?.component??(backend?.mpvSubtitles?'mpv':this.mode==='native'?'browser':'mpv')):null,
      automatic:this.automatic,decodeQuality:this.decodeQuality,fidelity:{effective,observation:effective?'backend-reported':'unavailable',shortcuts:effective&&Array.isArray(observed?.shortcuts)?observed.shortcuts.filter((v):v is string=>typeof v==='string').slice(0,16):[]},
      admission:this.planDecisions.map(p=>({planId:p.id,mode:p.mode,eligible:p.eligible,code:p.code??null,reason:p.reason?redact(p.reason):null})),attempts:redact(this.attempts.slice(-64).map(a=>({...a})))});
  }
  audioDiagnostics() {return this.current?.backend.audioDiagnostics();}
  private emit(type: string, detail: unknown) {
    if(type==='error') {const error=playerError(detail,this.activeOperation?.id??null,this.activeOperation?.kind??null,'session');this.sessionError=error.toJSON();this.publish();detail=this.sessionError;}
    this.dispatchEvent(new CustomEvent(type, {detail:redact(detail)}));
  }
  private assertOperation() {if(this.destroyed||this.activeOperation?.controller.signal.aborted)throw new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted');}
  private validateFilters(mode: PlaybackMode, settings: Settings) {
    const reason=featureRejection(mode,{...settings,toneMapping:this.candidatePreferences.toneMapping,hybridAudioFilters:this.hybridAudioFilters});
    if(reason)throw new PlayerError('UNSUPPORTED_FEATURE',reason);
  }
  private enqueue(operation: () => Promise<void>, kind:OperationKind|null=null, signal?:AbortSignal, optimization=false): Promise<void> {
    if(!optimization)this.cancelPromotion();
    const admission=this.dispatchControl({type:'operation.admit',kind}),id=admission.id!;
    if(!admission.accepted)return Promise.reject(new PlayerError(admission.reason==='full'?'INVALID_ARGUMENT':'ABORTED',admission.reason==='full'?'Player operation queue is full':'Player is destroyed',id,kind));
    const controller=new AbortController();
    controller.signal.addEventListener('abort',()=>{this.dispatchControl({type:'operation.cancel',id});},{once:true});
    const cancel=()=>{controller.abort();if(this.activeOperation?.id===id){this.inspection?.abort();void this.candidate?.backend.destroy().catch(()=>{});}};
    this.operationResources.set(id,{controller,detachCallerAbort:()=>signal?.removeEventListener('abort',cancel)});
    signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
    const result=this.queue.then(async()=>{
      if(!this.dispatchControl({type:'operation.start',id}).accepted)throw new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted',id,kind);
      this.dispatchControl({type:'publication.operation-start',id,epoch:this.operationEpoch,now:performance.now()});
      this.publish();
      if(kind==='seeking')this.dispatchEvent(new CustomEvent('seeking',{detail:this.state}));
      try {await operation();this.assertOperation();if(kind==='seeking')this.dispatchControl({type:'publication.seek',id,epoch:this.operationEpoch,now:performance.now()});}
      catch(error){if(optimization)return;const structured=playerError(controller.signal.aborted?new PlayerError('ABORTED',this.destroyed?'Player is destroyed':'Operation aborted'):error,id,kind);
        if(!this.current&&kind==='opening'&&structured.code!=='ABORTED')this.sessionError={...structured.toJSON(),scope:'session'};
        this.publish();this.dispatchEvent(new CustomEvent('error',{detail:freeze(structured.toJSON())}));throw structured;
      } finally {this.dispatchControl({type:'operation.finish',id});this.startWatchdogs();this.publish();}
      if(kind==='seeking')this.dispatchEvent(new CustomEvent('seeked',{detail:this.state}));
    }).finally(()=>signal?.removeEventListener('abort',cancel));
    this.queue=result.catch(()=>{}).finally(()=>{this.dispatchControl({type:'operation.release',id});this.operationResources.delete(id);});return result;
  }
  private async interruptible<T>(work: Promise<T>): Promise<T> {
    // An effect's synchronous prefix may retire this operation before returning
    // a rejecting promise. Always observe physical completion before admission.
    const observed=Promise.resolve(work);void observed.catch(()=>{});
    const signal=this.activeOperation?.controller.signal??this.lifetime.signal;
    this.assertOperation();
    let cancel!: () => void;
    try{return await Promise.race([observed,new Promise<never>((_,reject)=>{
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
    const warm=()=>{
      if(this.destroyed)return Promise.resolve({milliseconds:0,assets:[]});
      this.selectDeployedRuntime();
      this.preparation??=new EnginePreparation(this.assetBase,this.softwarePresenter==='rgb'?'engine-software-full':'engine-software-yuv',()=>{if(!this.destroyed)this.dispatchEvent(new CustomEvent('preparationchange',{detail:freeze(this.preparationProgress)}));},this.remuxRuntime,this.providerRuntime);
      return this.preparation.warm(selected);
    };
    // EnginePreparation turns the retained deployment error into per-asset
    // failure reports, just like fetch/compile errors. Constructor-started
    // preparation must never leave a rejected promise unobserved.
    return this.preparationTask=this.providerRuntime?this.providerRuntime.load().then(warm,warm):warm();
  }
  private async create(mode: PlaybackMode, aid='auto', adaptation?:'flac'|'opus'|'flac24', forcePreparation=false, planId?:string, loadTimeoutMs?:number): Promise<Session> {
    let backend: Backend;
    const recipe=executionRecipe(planId);
    const backendKind=recipe?.backend??(mode==='native'?'NativePlayer':'WasmPlayer');
    const surface = document.createElement(mode === 'native' ? 'video' : 'canvas');
    surface.width = this.width;surface.height = this.height;
    surface.style.cssText = 'display:none;width:100%;background:#000';
    // Import before allocating workers; destroy during import cannot orphan an engine.
    const module = backendKind==='PrivateSoftwarePlayer' ? await this.interruptible(loadProviderModule('mpv-private-player',this.assetBase)) : backendKind==='ShakaBackend' ? await this.interruptible(import('./internal/shaka-backend.js')) : backendKind==='NativePlayer' ? await this.interruptible(import('./internal/native-player.js')) : await this.interruptible(loadProviderModule('mpv-player',this.assetBase));
    const engine=mode==='hybrid'?'engine-hybrid':this.softwarePresenter==='rgb'?'engine-software-full':'engine-software-yuv';
    const prepared=mode==='native'||backendKind==='PrivateSoftwarePlayer'?undefined:await this.interruptible(this.providerRuntime?Promise.all([mode==='software'?Promise.resolve(undefined):this.providerRuntime.module(`web/${engine}/player.wasm`),this.providerRuntime.bytes('fixtures/DejaVuSans.ttf')]).then(([module,font])=>({module,font})):this.preparation?.readyEngine(engine)??Promise.resolve(undefined));
    this.assertOperation();
    this.root.append(surface);
    try {
      const subtitleTracks=this.sourceInspection?.probe.tracks.filter(t=>t.type==='sub')??[];
      const defaultSubtitleStreamIndex=(subtitleTracks.find(t=>t.default)??subtitleTracks[0])?.index;
      backend = 'PrivateSoftwarePlayer' in module ? new module.PrivateSoftwarePlayer(surface as HTMLCanvasElement,{providerAssets:this.providerRuntime,mode:mode as 'software'|'hybrid',decodeQuality:this.decodeQuality,adaptiveFrameDrop:this.adaptiveFrameDrop,videoTrack:this.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture),buffering:this.buffering,audioOutput:this.audioOutput,audioFallback:this.audioFallback,runtime:this.remuxRuntime as 'jspi'|'asyncify',assetBase:this.assetBase,duration:this.sourceInspection?.probe.duration,resourceLimits:this.resourceLimits,fonts:this.fonts}) : 'ShakaBackend' in module ? new module.ShakaBackend(surface as HTMLVideoElement,this.assetBase,this.buffering) : 'NativePlayer' in module ? new module.NativePlayer(surface as HTMLVideoElement, forcePreparation?'always':this.nativeRemux,this.assetBase,this.bufferedNativeSeeks,adaptation,['auto','no'].includes(aid)?(this.privateRemux&&recipe?.native?.selectedAudio?this.sourceInspection?.probe.tracks.find(t=>t.type==='audio')?.index:undefined):Number(aid)-1,this.nativeASS,this.fonts,planId,this.buffering,loadTimeoutMs,defaultSubtitleStreamIndex,this.remuxRuntime,this.providerRuntime) : new module.WasmPlayer(surface as HTMLCanvasElement, {buffering:this.buffering,mode: mode as 'hybrid' | 'software',softwarePresenter:this.softwarePresenter,audioOutput:this.audioOutput,audioFallback:this.audioFallback,resourceLimits:this.resourceLimits,fonts:this.fonts,assetBase:this.assetBase,prepared,providerAssets:this.providerRuntime,decodeQuality:this.decodeQuality,adaptiveFrameDrop:this.adaptiveFrameDrop,videoTrack:this.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture)});
    } catch (error) {surface.remove();throw error;}
    backend.setWatchdogs?.(this.watchdogConfiguration);
    const session:Session={backend,surface};
    this.observeBackend(session,this.control.source.candidate!.session);return session;
  }
  private observeBackend(session:Session,sessionEpoch:number){
    const backend=session.backend;let observationSequence=0;
    for (const type of ['mpv', 'error', 'log', 'output', 'source', 'activity']) backend.addEventListener(type, event => {
      if(session.retired||sessionAuthority(this.control,sessionEpoch)==='retired')return;
      const detail = (event as CustomEvent).detail;
      if(this.current===session&&type==='activity'&&['seeking','seeked','play','pause','ratechange','waiting','playing','ended'].includes(detail))this.dispatchControl({type:'monitor.activity'});
      if(this.current===session&&this.promotionRunning&&((type==='activity'&&detail==='waiting')||(type==='mpv'&&detail.event==='property-change'&&detail.name==='paused-for-cache'&&detail.data===true)))this.cancelPromotion();
      if(sessionAuthority(this.control,sessionEpoch)==='retired')return;
      if (type === 'error') session.error = detail instanceof Error?detail:new Error(String(detail));
      if (type === 'mpv' && detail.event === 'end-file' && detail.reason === 'error') session.error = new Error(String(detail.file_error));
      if(this.current===session&&(session.error||type==='activity'&&['play','pause','playing','ended'].includes(detail)||type==='mpv'&&detail.event==='property-change'&&['pause','eof-reached'].includes(detail.name)))this.startWatchdogs();
      if (this.current === session && sessionAuthority(this.control,sessionEpoch)==='accepted' && !this.busy && !this.destroyed) {
        if(session.error&&(type==='error'||(type==='mpv'&&detail.event==='end-file'))&&this.automatic&&this.mode!=='software'){this.recover(session);return;}
        if(type==='mpv'&&detail.event==='end-file'&&detail.reason==='error')this.emit('error',session.error);
        if(this.current!==session||sessionAuthority(this.control,sessionEpoch)!=='accepted')return;
        if(type==='activity') {
          if(detail==='waiting')this.dispatchControl({type:'playback.sample',session:sessionEpoch,sequence:++observationSequence,observation:'waiting'});
          if(detail==='playing')this.dispatchControl({type:'playback.sample',session:sessionEpoch,sequence:++observationSequence,observation:'playing'});
          this.schedulePublish();return;
        }
        if(type==='mpv') {
          if(detail.event==='property-change'&&detail.name==='track-list'&&!this.sessionError){
            const inventory=tracks(this.sourceTracks(),this.sourceSerial,this.mode,backendPlan(session.backend));
            if(this.current!==session||sessionAuthority(this.control,sessionEpoch)!=='accepted')return;
            const forbidden=inventory.some(t=>t.selected&&!trackAllowed(t,t.type==='audio'?this.trackPolicy.audio:t.type==='subtitle'?this.trackPolicy.subtitles:undefined));
            if(forbidden){this.updateSettings({pause:true});void backend.pause().catch(()=>{});this.emit('error',new PlayerError('UNSUPPORTED_FEATURE','Backend selected a track excluded by the host policy'));return;}
          }
          if(detail.event==='property-change'&&detail.name==='time-pos')this.dispatchControl({type:'playback.sample',session:sessionEpoch,sequence:++observationSequence,observation:'time',value:Number(detail.data),publishedTime:this.state.currentTime});
          if(detail.event==='property-change'&&detail.name==='pause')this.dispatchControl({type:'playback.sample',session:sessionEpoch,sequence:++observationSequence,observation:'pause',value:detail.data===true});
          this.schedulePublish();
        }
        if(this.current===session&&sessionAuthority(this.control,sessionEpoch)==='accepted')this.emit(type,detail);
      }
    });
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
  private privateSourceDemuxer(source:Source){
    const suffix=source.kind==='local'&&source.file instanceof File?source.file.name.split('.').at(-1)?.toLowerCase():undefined;
    const hint=source.kind==='local'?source.input?.demuxer:source.options.demuxer;
    const demuxer=hint??(suffix==='sbc'||suffix==='msbc'?'sbc':undefined);
    if(demuxer!==undefined&&(typeof demuxer!=='string'||demuxer!==''&&!/^[a-z0-9_]{1,64}$/.test(demuxer)))throw new PlayerError('INVALID_ARGUMENT','Invalid demuxer hint');
    return demuxer||undefined;
  }
  private privateFiniteSource(source:Source){
    return source.kind==='local'||(!source.options.format||source.options.format==='file')&&!!source.options.identity;
  }
  private admissible(source:Source,settings:Settings,attachments:SubtitleAsset[],textTracks:(TextTrackSource & {attachmentId?:string})[],nativeSourceRejection?:string,automatic=this.automatic,requirements:RouteRequirements={}){
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
      this.privateRemux&&(audioTracks.length!==1||selectiveAudio.codec!=='pcm_s16le'||selectiveAudio.channels!==2||selectiveAudio.sampleRate!==48000)?'Private mpv audio requires one 48 kHz stereo PCM16 stream':
      !this.selectiveAudioAssetsAvailable?'Selective audio engine or worklet assets are unavailable':
      undefined;
    const basePlans=planAdmission({automatic,...settings,
      privatePlaybackFull:this.privatePlaybackAssets?.codecProfile==='playback-full',privatePlaybackAssetsAvailable:this.privatePlaybackAssetsAvailable,offscreenCanvas:typeof OffscreenCanvas!=='undefined',
      privatePlaybackSourceRejection:privatePlaybackRejection(inspected?.probe,{finite:this.privateFiniteSource(source),bytes:source.kind==='local'?source.file instanceof File?source.file.size:source.file.byteLength:Number(source.options.identity?.size)},
        {...settings,toneMapping:this.candidatePreferences.toneMapping,audioOutput:this.audioOutput,externalSubtitles:!!attachments.length||!!textTracks.length,customFonts:!!this.fonts.length,subtitleStyle:!!Object.keys(this.candidatePreferences.subtitleStyle).length},this.privatePlaybackAssets),
      privateHybridAssetsAvailable:!!this.privatePlaybackAssets?.retainedDecoder,
      privateHybridSourceRejection:privatePlaybackRejection(inspected?.probe,{finite:this.privateFiniteSource(source),bytes:source.kind==='local'?source.file instanceof File?source.file.size:source.file.byteLength:Number(source.options.identity?.size)},
        {...settings,toneMapping:this.candidatePreferences.toneMapping,audioOutput:this.audioOutput,externalSubtitles:!!attachments.length||!!textTracks.length,customFonts:!!this.fonts.length,subtitleStyle:!!Object.keys(this.candidatePreferences.subtitleStyle).length},this.privatePlaybackAssets,'hybrid'),
      audioPlayback:this.audioPlayback,transcodeAssetsAvailable:this.transcodeAssetsAvailable||!!this.providerRuntime?.codecPreparation(source,inspected?.probe,this.remuxRuntime,inspectedSettings?.aid)||!!this.providerRuntime?.audioRepairCandidate(source,inspected?.probe),
      transcodeSourceRejection:!this.fileServicesSource(source)||!inspected?'Audio transcoding requires an inspected random-access file':audioTranscodeRejection(inspected.probe,inspectedSettings!),
      selectiveAudioQualified:!selectiveAudioReason,selectiveAudioReason,
      mpvSubtitles:this.mpvSubtitles,selectedEmbeddedSubtitle:!!(settings.subtitles&&selectiveSubtitle),
      mpvSubtitleSourceQualified:this.mpvSubtitleAssetsAvailable&&this.fileServicesSource(source)&&!!inspected&&Number.isFinite(inspected.probe.duration)&&inspected.probe.duration>0&&!!selectiveSubtitle&&(!this.privateRemux||['ass','ssa','subrip','mov_text','hdmv_pgs_subtitle','dvd_subtitle'].includes(selectiveSubtitle.codec))&&settings.subtitles&&settings.sid!=='no',
      mpvSubtitleAVRejection:inspected?nativeRejection(inspected.probe,{...inspectedSettings!,subtitles:false}):'Source inspection required',
      shakaSourceRejection:remote?.demuxer?'Explicit demuxer hints require FFmpeg':undefined,
      streamingFallbackRejection:remote?.streaming?.maxBandwidth!==undefined||remote?.streaming?.representation!==undefined?'FFmpeg fallback cannot preserve an explicit adaptive quality constraint':undefined,
      remuxSourceRejection:inspected?remuxRejection(inspected.probe,inspectedSettings!):undefined,
      hybridSourceRejection:video&&!['h264','hevc','vp8','vp9','av1'].includes(video.codec)&&!webgpuDecoderSupported(video.codec)?`Demuxe has no external decoder contract for ${video.codec}`:undefined,webGPUCodecQualified:webgpuDecoderSupported(video?.codec??''),toneMapping:this.candidatePreferences.toneMapping,hybridAudioFilters:this.hybridAudioFilters,
      adaptation:this.audioAdaptation,allowLossy:this.allowLossy,nativeASS:this.nativeASS,externalFormats:attachments.map(a=>plainVTT(a)?'browser-vtt':a.format),browserTextTracks:!!textTracks.length,
      automaticLossless:this.automaticLossless,adaptationSourceRejection:source.kind!=='local'?'Automatic FLAC is qualified only for local files':this.losslessInspection?.source===source?this.losslessInspection.reason:'Automatic FLAC source has not been qualified',
      adaptationSourceQualified:source.kind==='local'&&this.losslessInspection?.source===source&&!this.losslessInspection.reason,
      audioOutput:this.audioOutput,nativeRemux:requirements.nativeRemux??this.nativeRemux,manifest:!!remote?.format&&remote.format!=='file',
      requiresRemux:!!(remote&&(remote.headers||remote.refreshAuthorization||remote.allowedOrigins||remote.immutable!==undefined||remote.credentials==='omit'||!!(settings.subtitles&&selectiveSubtitle))),
      privateRemux:this.privateRemux,atomicMpvProviders:!!this.providerRuntime,isolated:globalThis.crossOriginIsolated===true,mse:typeof MediaSource!=='undefined',webCodecs:typeof VideoDecoder!=='undefined',webAudio:typeof AudioContext!=='undefined',
      nativeSourceRejection:remote?.format&&remote.format!=='file'?nativeManifestRejection(remote,settings,!!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')):nativeSourceRejection});
    const element=inspected?document.createElement('video'):undefined;
    const capabilities=inspected?nativeBrowserCapabilities(inspected.probe,inspectedSettings!.aid,{canPlayType:mime=>element!.canPlayType(mime),isTypeSupported:typeof MediaSource==='undefined'?undefined:mime=>MediaSource.isTypeSupported(mime)}):undefined;
    const withEvidence=(capability:BrowserMediaCapability)=>({...capability,decodingInfo:this.mediaCapabilityQueries.cached(capability,inspected!.probe)});
    const defaultAudio=audioTracks.find(track=>track.default)??audioTracks[0];
    let decisions=refineRouteAdmission(basePlans,{inspected:!!inspected,hybridRejection:inspected?.probe.hybridRejection,
      capabilities:capabilities?{direct:withEvidence(capabilities.direct),remux:withEvidence(capabilities.remux),flac:withEvidence(capabilities.flac),opus:withEvidence(capabilities.opus),selective:withEvidence(selectiveVideoCapability!)}:undefined,
      audioTrackCount:audioTracks.length,audioOff:inspectedSettings?.aid==='no',selectedAudioKey:selected,defaultAudioKey:defaultAudio?`audio:stream:${defaultAudio.index}`:undefined,
      failedPlans:source===this.source&&this.control.routing.recovery.failedStreaming?.source===this.sourceSerial?this.control.routing.recovery.failedStreaming.plans:[],timingControls:this.candidatePreferences.subtitleDelay!==0||this.candidatePreferences.audioDelay!==0||!!Object.keys(this.candidatePreferences.subtitleStyle).length,
      audioContextSinkUnavailable:!!this.outputDeviceId&&(typeof AudioContext==='undefined'||!('setSinkId' in AudioContext.prototype))});
    if(this.providerRuntime){
      const rejections:Record<string,string|undefined>={};
      for(const plan of decisions)if(plan.eligible)rejections[plan.id]=this.providerRuntime.rejection(plan.id,source,JSON.stringify([this.tierConfiguration(settings,requirements),this.remuxRuntime,this.softwarePresenter,inspected?.probe.tracks]),this.remuxRuntime,inspected?.probe,inspectedSettings?.aid);
      decisions=applyDeploymentRejections(decisions,rejections);
    }
    return decisions;
  }
  private failedStreamingPlan(session:Session):boolean {
    if(this.source?.kind!=='remote'||!['hls','dash'].includes(this.source.options.format??''))return false;
    const plan=executionPlan(this.mode,backendPlan(session.backend),this.settings.af,this.settings.gain);
    const sessionId=this.control.source.acceptedSession;if(this.current!==session||sessionId===null)return false;
    return this.dispatchControl({type:'routing.recovery',change:{kind:'streaming.failed',source:this.sourceSerial,session:sessionId,plan:plan.id}}).accepted;
  }
  private async replace(source: Source, mode: PlaybackMode, settings: Settings, preserve: boolean, nativeTracks: (TextTrackSource & {attachmentId?:string})[], requestedTarget?: number, automaticAdmission=this.automatic, planId?:string, directLoadBudget?:number, requirements:RouteRequirements={}) {
    if(this.presentation.locksSurface)throw new PlayerError('UNSUPPORTED_FEATURE','Exit video Picture-in-Picture before replacing the playback surface');
    if(!planId)return this.discover(source,settings,preserve,nativeTracks,requestedTarget,automaticAdmission,mode,0,requirements);
    if(this.sourceInspection?.source!==source)this.sourceInspection=undefined;
    this.validateFilters(mode, settings);
    const attachments=preserve?this.subtitleAssets:[];
    let admitted=this.admissible(source,settings,attachments,nativeTracks,automaticAdmission?this.admissionContext.nativeReason:undefined,automaticAdmission,requirements);
    if(!automaticAdmission)this.admissionContext={automatic:false};
    if(!admitted.some(p=>p.id===planId&&p.eligible)){
      const candidates=admitted.filter(p=>p.mode===mode);
      const rejection=candidates.find(p=>p.code==='ISOLATION_REQUIRED')??admitted.find(p=>p.id===planId)??candidates.find(p=>p.code!=='PLAN_NOT_REQUESTED');
      const deployment=deploymentRejectionError(admitted.filter(p=>p.id===planId));
      if(rejection?.code!=='ISOLATION_REQUIRED'&&deployment)throw deployment;
      throw new PlayerError(rejection?.code==='ISOLATION_REQUIRED'?'ISOLATION_REQUIRED':'UNSUPPORTED_FEATURE',rejection?.reason??'No qualified complete playback plan');
    }
    let queried=admitted.find(p=>p.id===planId)?.browserCapability;
    if(queried&&this.sourceInspection?.source===source){const decodingInfo=await this.mediaCapabilityQueries.inspect(queried,this.sourceInspection.probe);this.assertOperation();queried={...queried,decodingInfo};admitted=attachRouteDecoding(admitted,planId,queried.decodingInfo);}
    if(mode==='native'&&attachments.length&&!attachments.every(a=>!!plainVTT(a))&&(!this.nativeASS||attachments.some(a=>!['ass','ssa','srt','vtt'].includes(a.format))))throw Error('External mpv subtitles require Hybrid or Software');
    if(mode==='native'&&this.audioOutput!=='stereo')throw Error('Explicit PCM output layout requires Hybrid or Software');
    if (source.kind === 'local' && source.file instanceof ArrayBuffer && source.file.byteLength > 32 * 1024 * 1024) throw new Error('ArrayBuffer sources are limited to 32 MiB');
    const old = this.current;
    const wasPaused = this.settings.pause;
    const desired={...sourceDesiredSettings(settings,{preserve,previousPause:!!wasPaused,previousSession:!!old,previousMode:this.mode,mode})};
    let target = requestedTarget ?? (preserve ? Math.max(0, Number(old?.backend.properties.get('time-pos')) || 0) : 0);
    // Public stream identities are known before Native preparation starts.
    // Select that stream at open rather than adapting the default track first.
    const publicAudio=preserve&&mode==='native'?/^audio:stream:(\d+)$/.exec(this.publicSelections.get('audio')??''):null;
    const initialAudio=!preserve&&!old&&!['auto','no'].includes(settings.aid)?this.sourceInspection?.probe.tracks.find(t=>t.type==='audio'&&t.id===settings.aid):undefined;
    const initialSubtitle=!preserve&&!old&&!['auto','no'].includes(settings.sid)?this.sourceInspection?.probe.tracks.find(t=>t.type==='sub'&&t.id===settings.sid):undefined;
    if(initialSubtitle&&(planId==='native-remux-mpv'||planId==='native-transcode-mpv'||planId==='native-direct-mpv'||planId==='native-video-mpv-audio-subtitles'))desired.sid=String(initialSubtitle.index+1);
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
    if(preserve&&this.publicSelections.has('sub')&&desired.sid!=='no')desired.sid='auto';
    if(this.activeOperation&&!this.pendingOperation)this.dispatchControl({type:'operation.name',id:this.activeOperation.id,kind:'switching'});
    const beginning=this.dispatchControl({type:'source.begin',operationEpoch:this.operationEpoch,mode,preserve,planId});
    if(!beginning.accepted)throw new PlayerError('ABORTED','Source transaction is already active');
    const attempt=beginning.id!,attemptSession=this.control.source.candidate!.session;
    const advance=(type:'source.created'|'source.configured'|'source.opened'|'source.applied'|'source.positioned')=>{if(!this.dispatchControl({type,attempt}).accepted)throw new PlayerError('ABORTED','Source transaction was retired');};
    this.publish();this.emit('modechange', {phase: 'loading', mode});
    let candidate: Session | undefined;
    const overlapping=!!(old&&!old.error&&this.promotionRunning&&this.backgroundPromotion&&!wasPaused&&mode==='native');
    // Reserve maximum explicit Wasm heaps plus configured packet queues. Browser
    // decoder/GPU allocations remain opaque and are not represented as a cap.
    const knownBytes=(session:Session)=>{const d=session.backend.diagnostics as {heapBytes?:number;remux?:{remux?:{heapBytes?:number}};mpvAudio?:{worker?:{heapBytes?:number}};mpvSubtitles?:{heapBytes?:number}};return (d.heapBytes??0)+(d.remux?.remux?.heapBytes??0)+(d.mpvAudio?Math.max(d.mpvAudio.worker?.heapBytes??0,128*1024*1024):0)+(d.mpvSubtitles?.heapBytes??0)+40*1024*1024;};
    const reserve=((planId.startsWith('software-private')||planId.startsWith('hybrid-private'))?(this.privatePlaybackAssets?.maxHeapBytes??134217728)/1048576:planId==='native-video-mpv-audio-subtitles'?384:planId==='native-remux-mpv'||planId==='native-transcode-mpv'||planId==='native-direct-mpv'||planId==='native-video-mpv-audio'?256:128)*1024*1024+40*1024*1024;
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
      const recipe=executionRecipe(planId);
      const adaptation=recipe?.native?.adaptation;
      candidate = this.candidate = await this.create(mode,desired.aid,adaptation,recipe?.native?.transport!=='original',planId,directLoadBudget);this.assertOperation();advance('source.created');const p = candidate.backend;await this.interruptible(p.ready);
      this.assertOperation();
      const vf=effectiveVideoFilters(desired,this.candidatePreferences);
      if(vf)await p.command!('set','vf',vf);
      if(mode!=='native'&&desired.af)await p.command!('set','af',desired.af);
      if(mode!=='native'){
        await p.command!('set','sub-delay',String(this.candidatePreferences.subtitleDelay));await p.command!('set','audio-delay',String(this.candidatePreferences.audioDelay));
        for(const [key,value] of Object.entries(this.candidatePreferences.subtitleStyle))await p.command!('set',({fontSize:'sub-font-size',color:'sub-color',borderSize:'sub-border-size',fontFamily:'sub-font'} as Record<string,string>)[key],String(value));
      }
      await p.gain!(desired.gain);
      await p.volume(overlapping||this.muted?0:desired.volume);await p.rate(desired.speed);
      // Native numeric track IDs only exist after metadata/text-track loading.
      if (mode !== 'native') {await p.selectTrack('audio', desired.aid);await p.selectTrack('sub', desired.sid);await p.subtitleVisible(desired.subtitles);}
      advance('source.configured');
      if (source.kind === 'local') await this.interruptible(p.open(source.file,source.input));else await this.interruptible(p.openRemote(source.options));
      advance('source.opened');
      if(!preserve&&requestedTarget!==undefined){
        const duration=p.properties.get('duration');
        if(p.properties.get('native-live')===true||!Number.isFinite(duration)||Number(duration)<=0||requestedTarget>=Number(duration))throw new PlayerError('INVALID_ARGUMENT','startTime requires a target within finite VOD duration');
      }
      if(preserve&&this.qualityPolicy){
        if(this.qualityPolicy.mode==='manual')throw new PlayerError('UNSUPPORTED_FEATURE','A manual quality pin cannot be mapped across a replacement backend');
        if(!p.setQuality)throw new PlayerError('UNSUPPORTED_FEATURE','Fallback cannot preserve runtime quality policy');
        await p.setQuality(this.qualityPolicy);
      }
      if(this.outputDeviceId){if(!p.setAudioOutputDevice)throw new PlayerError('UNSUPPORTED_FEATURE','Output device cannot be preserved');await p.setAudioOutputDevice(this.outputDeviceId);}
      if('inspectMetadata' in p)await (p as Backend & {inspectMetadata():Promise<void>}).inspectMetadata();
      this.assertOperation();
      for(const subtitle of attachments)await p.addSubtitle!(subtitle);
      if(mode!=='native'&&attachments.length&&desired.sid!=='auto')await p.selectTrack('sub',desired.sid);
      if (mode === 'native') {
        for (const track of nativeTracks) await p.addTextTrack!(track,track.attachmentId);
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
      await this.applyTrackPolicy(candidate,source,mode,desired,preserve);advance('source.applied');
      await this.settled(candidate, mode, 0);
      if(overlapping){
        this.assertOperation();await old!.backend.pause();
        target=Math.max(0,Number(old!.backend.properties.get('time-pos'))||0);
        clearInterval(resourceMonitor);
      }
      if (target > 0) {await p.seek(target);await this.settled(candidate, mode, target);}
      advance('source.positioned');
      if (candidate.error) throw candidate.error;
      const actual=executionPlan(mode,backendPlan(p),desired.af,desired.gain,!!(p.diagnostics as {subtitleOverlay?:unknown})?.subtitleOverlay);
      if(!actual||actual.id!==planId||!admitted.some(plan=>plan.id===actual.id&&plan.eligible))throw new PlayerError('UNSUPPORTED_FEATURE','The prepared components do not match an admitted complete playback plan');
      if (!desired.pause) {if(mode==='native')await this.playNativeVerified(p);else await p.play();}
      this.assertOperation();
      if(overlapping)await p.volume(this.muted?0:desired.volume);
      this.assertOperation();
      const elapsed=performance.now()-this.operationStarted;
      const timestamps=Array.from({length:playbackStatisticsClockReads(this.control.publication.statistics,{kind:'accept',sourceId:this.sourceSerial+(preserve?0:1),preserve,elapsed})},()=>performance.now());
      const acceptance=this.dispatchControl({type:'source.accept',attempt,operationEpoch:this.operationEpoch,timing:{elapsed,timestamps},settings:desired,planMatches:!!actual&&actual.id===planId&&admitted.some(plan=>plan.id===actual.id&&plan.eligible),...(!preserve?{publicSelections:{...(initialAudio?{audio:`audio:stream:${initialAudio.index}`} :{}),...(initialSubtitle?{sub:`sub:stream:${initialSubtitle.index}`}:{})}}:{})});
      if(!acceptance.accepted)throw new PlayerError('ABORTED','Source acceptance was retired');
      this.current=candidate;this.candidate=undefined;this.source=source;
      this.activeOperation?.detachCallerAbort();

      if(queried&&this.sourceInspection?.source===source){queried={...queried,decodingInfo:this.mediaCapabilityQueries.cached(queried,this.sourceInspection.probe)};admitted=attachRouteDecoding(admitted,planId,queried.decodingInfo);}
      this.planDecisions=admitted;this.runtimeCapabilities.admission(admitted);
      this.acceptEvidence(planId,candidate);
      this.#previewController.setSourceIdentity(`${this.sourceSerial}:${mode}`);
      this.previewSource=source.kind==='local'?(source.file instanceof Blob?source.file:new Blob([source.file])):undefined;
      // Physical handles and composed control state are accepted before observers.
      this.publish();
      const stillAccepted=()=>this.current===candidate&&sessionAuthority(this.control,attemptSession)==='accepted';
      if(stillAccepted()){candidate.surface.style.display='block';if(old)old.surface.style.display='none';this.startWatchdogs();}
      // The new session is committed. Cleanup failures must not pretend to roll it back.
      try {await this.dispose(old);} catch (error) {this.dispatchEvent(new CustomEvent('error',{detail:freeze(playerError(error,this.activeOperation?.id??null,this.activeOperation?.kind??null,'operation').toJSON())}));}
      for(const [name,data]of p.properties){if(!stillAccepted())return;this.emit('mpv',{event:'property-change',name,data} satisfies PlaybackEvent);}
      if(!stillAccepted())return;this.emit('mpv',{event:'file-loaded'});
      if(stillAccepted())this.emit('modechange',{phase:'ready',mode,position:target});
    } catch (error) {
      if(candidate)this.updateEvidence(planId,'probing',candidate);
      if (candidate && candidate !== this.current) await this.dispose(candidate).catch(() => {});
      this.candidate = undefined;
      if (old && !old.error && this.current === old && !wasPaused && !this.destroyed && !this.closing) await old.backend.play().catch(() => {});
      this.emit('modechange', {phase: 'failed', mode, rolledBack: this.current === old, message: String(error)});
      throw error;
    } finally {clearInterval(resourceMonitor);this.dispatchControl({type:'source.finished',attempt});this.publish();}
  }
  private record(attempt: SelectionAttempt){
    this.dispatchControl({type:'routing.attempt',attempt});
    this.emit('selectionchange',{...attempt});
  }
  private async inspectForQualifiedWebGPU(source:Source,settings:Settings):Promise<void>{
    if(!hasQualifiedWebGPUCodecs()||this.providerRuntime&&!this.canInspectFFmpeg)return;
    if(this.sourceInspection?.source===source){
      const video=this.sourceInspection.probe.tracks.find(track=>track.type==='video'&&!track.attachedPicture);
      if(!video||!webgpuDecoderSupported(video.codec)||video.webCodecsSupported!==undefined)return;
    }
    const controller=this.inspection=new AbortController();
    try{
      const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
      const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
      const compiledWasm=await this.interruptible(this.providerRuntime?this.providerRuntime.module(`web/engine-remux${this.privateRemux?'-'+this.remuxRuntime:''}/remux.wasm`):this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
      const probe:Probe=await probeSource(transport,controller.signal,undefined,compiledWasm,this.remuxRuntime);
      this.assertOperation();
      this.sourceInspection={source,probe,settings:{aid:settings.aid,sid:settings.sid,subtitles:settings.subtitles}};
    }catch(error){
      if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error)||this.providerRuntime&&['ASSET_LOAD_FAILED','DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))throw error;
      // Unknown inspection still permits the existing WebCodecs trial.
    }finally{if(this.inspection===controller)this.inspection=undefined;}
  }
  private async inspectWithFFmpeg(source:Source,controller:AbortController):Promise<Probe>{
    this.emit('inspectionchange',{phase:'inspecting'});
    const codecInspector=this.providerRuntime?.codecInspector(this.remuxRuntime);
    const {probeSource}=await this.interruptible(import(new URL(codecInspector?codecInspector.folder+'source-probe.js':'web/source-probe.js',this.assetBase).href));
    const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
    const compiledWasm=await this.interruptible(this.providerRuntime?this.providerRuntime.module(codecInspector?.wasmPath??`web/engine-remux${this.privateRemux?'-'+this.remuxRuntime:''}/remux.wasm`):this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
    this.assertOperation();
    const probe:Probe=await probeSource({...transport,...(this.privateRemux?{demuxer:this.privateSourceDemuxer(source)}:{})},controller.signal,codecInspector?'flac24':undefined,compiledWasm,this.remuxRuntime);
    this.assertOperation();
    return probe;
  }
  private async optionalAssetsAvailable(names:string[],controller:AbortController){
    if(this.providerRuntime)return names.every(name=>this.providerRuntime!.has(name));
    const assetController=new AbortController();
    const abort=()=>assetController.abort();controller.signal.addEventListener('abort',abort,{once:true});
    const deadline=setTimeout(abort,5000);
    try{const responses=await Promise.all(names.map(name=>fetch(new URL(name,this.assetBase),{method:'HEAD',signal:assetController.signal})));return responses.every(response=>response.ok);}
    catch(error){if(controller.signal.aborted)throw error;return false;}
    finally{clearTimeout(deadline);controller.signal.removeEventListener('abort',abort);}
  }
  private async checkInspectedAssets(source:Source,probe:Probe,settings:Settings,sid:string,controller:AbortController){
    this.updateInspection({kind:'reset',scope:'assets'});
    if(this.privateRemux){
      const available=await this.optionalAssetsAvailable(['manifest.json','player.mjs','player.wasm'].map(name=>`web/engine-mpv-playback-${this.remuxRuntime}/${name}`),controller);this.assertOperation();this.privatePlaybackAssetsAvailable=available;
      if(this.privatePlaybackAssetsAvailable){
        const metadataController=new AbortController(),abort=()=>metadataController.abort();
        controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted)abort();
        const deadline=setTimeout(abort,5000);
        try{
          const manifestPath=`web/engine-mpv-playback-${this.remuxRuntime}/manifest.json`;
          const response=this.providerRuntime?new Response(await this.providerRuntime.bytes(manifestPath)):await fetch(new URL(manifestPath,this.assetBase),{signal:metadataController.signal});
          if(!response.ok)throw Error('Manifest HTTP '+response.status);
          const assets=await readPrivatePlaybackAssets(response,this.remuxRuntime);this.assertOperation();this.privatePlaybackAssets=assets;
          if(!this.privatePlaybackAssets)throw Error('Invalid playback manifest');
        }catch(error){
          if(controller.signal.aborted)throw error;this.assertOperation();
          this.privatePlaybackAssetsFailure=new PlayerError('ASSET_LOAD_FAILED','Private playback manifest initialization failed: '+String(error));
        }
        finally{clearTimeout(deadline);controller.signal.removeEventListener('abort',abort);}
      }
    }
    if(this.mpvSubtitles&&this.fileServicesSource(source)&&settings.subtitles&&sid!=='no'&&probe.tracks.some(t=>t.type==='sub')){
      const available=await this.optionalAssetsAvailable(['mjs','wasm'].map(ext=>`web/engine-${this.privateRemux?'mpv-subtitles-'+this.remuxRuntime:'subtitles'}/service.${ext}`),controller);this.assertOperation();this.mpvSubtitleAssetsAvailable=available;
    }
    this.assertOperation();
  }
  private async inspectFallbackAfterFastFailure(source:Source,settings:Settings):Promise<string|undefined>{
    this.fastInspectedSource=undefined;
    if(this.sourceInspection?.source===source&&(this.providerRuntime?.codecPreparation(source,this.sourceInspection.probe,this.remuxRuntime,settings.aid)||this.providerRuntime?.audioRepairCandidate(source,this.sourceInspection.probe))){
      this.record({mode:'probe',outcome:'selected',reason:'Retained bounded local metadata for codec preparation; complete packet validation remains required'});
      return nativeRejection(this.sourceInspection.probe,{...settings},document.createElement('video'));
    }
    if(!this.canInspectFFmpeg){
      this.updateInspection({kind:'reset',scope:'fallback'});
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
      if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error)||this.providerRuntime&&['ASSET_LOAD_FAILED','DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))throw error;
      this.updateInspection({kind:'reset',scope:'fallback'});
      this.record({mode:'probe',outcome:'failed',reason:`FFmpeg reinspection after Direct failure: ${String(error)}`});
      return 'Native eligibility could not be established: '+String(error);
    }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
  }
  private async select(source: Source, settings: Settings, preserve: boolean, tracks: (TextTrackSource & {attachmentId?:string})[], start=0, target?: number, priorAttempts:SelectionAttempt[]=[],inspectOnly=false,requirements:RouteRequirements={}){
    if(this.providerRuntime){await this.interruptible(this.providerRuntime.load());this.assertOperation();this.selectDeployedRuntime();}
    const inspectionPolicy=()=>initialInspectionPolicy({automatic:this.automatic,mode:this.mode,privateRemux:this.privateRemux,provider:!!this.providerRuntime,canInspect:this.canInspectFFmpeg,quality:this.decodeQuality,adaptive:this.adaptiveFrameDrop,inspected:this.sourceInspection?.source===source,start,videoFilters:settings.vf,audioFilters:settings.af,toneMapping:this.candidatePreferences.toneMapping,...(source.kind==='local'?{localDemuxer:source.input?.demuxer}:{remoteDemuxer:source.options.demuxer,remoteFormat:source.options.format})});
    if(!this.automatic&&this.mode!=='native'){
      if(inspectionPolicy().privateForced){
        this.privatePlaybackAssetsFailure=undefined;
        const controller=this.inspection=new AbortController();
        try{
          const probe=await this.inspectWithFFmpeg(source,controller);
          if(source.kind==='remote'&&probe.identity)source.options.identity??=probe.identity;
          this.sourceInspection={source,probe,settings:{aid:settings.aid,sid:settings.sid,subtitles:settings.subtitles}};
          await this.checkInspectedAssets(source,probe,settings,settings.sid,controller);
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
      }
      if(this.mode==='hybrid')await this.inspectForQualifiedWebGPU(source,settings);
      if(inspectionPolicy().qualityForced){
        // Explicit Software skips the normal tier probe. Quality admission still
        // needs codec identity before mpv constructs its decoder.
        const controller=this.inspection=new AbortController();
        try{
          const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
          const transport=source.kind==='local'?{file:source.file instanceof File?source.file:new File([source.file],'media')}:(()=>{const {refreshAuthorization,...options}=source.options;return {options:{...options,url:new URL(options.url,location.href).href},refreshAuthorization};})();
          const compiledWasm=await this.interruptible(this.providerRuntime?this.providerRuntime.module(`web/engine-remux${this.privateRemux?'-'+this.remuxRuntime:''}/remux.wasm`):this.preparation?.readyModule('engine-remux')??Promise.resolve(undefined));
          const probe:Probe=await probeSource(transport,controller.signal,undefined,compiledWasm,this.remuxRuntime);
          this.assertOperation();
          this.sourceInspection={source,probe,settings:{aid:settings.aid,sid:settings.sid,subtitles:settings.subtitles}};
        }catch(error){
          if(this.destroyed||this.activeOperation?.controller.signal.aborted||controller.signal.aborted||terminalSourceFailure(error)||this.providerRuntime&&['ASSET_LOAD_FAILED','DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))throw error;
          // The decoder remains usable when optional codec inspection cannot
          // classify a file; the unknown-codec policy permits exact only.
        }finally{if(this.inspection===controller)this.inspection=undefined;}
      }
      return this.replace(source,this.mode,settings,preserve,tracks,target);
    }
    const componentRepairRetry=this.sourceInspection?.source===source&&!!(this.providerRuntime?.codecPreparation(source,this.sourceInspection.probe,this.remuxRuntime,settings.aid)||this.providerRuntime?.audioRepairCandidate(source,this.sourceInspection.probe));
    this.attempts=[];
    for(const attempt of priorAttempts)this.record(attempt);
    let nativeReason: string | undefined;
    if(start===0||this.sourceInspection?.source!==source){this.updateInspection({kind:'reset',scope:'initial'});}
    // A later Direct playback failure can resume discovery beyond Native.
    // Recovery beyond the initial route can need decoder configuration or track bounds.
    if(start>0&&this.fastInspectedSource===source)
      nativeReason=await this.inspectFallbackAfterFastFailure(source,settings);
    // Cooperative playback still needs inspected codec/resource facts when
    // filters already rule out Native. This also covers automatic filter changes.
    if(inspectionPolicy().normal){
      if(inspectionPolicy().manifest){
        nativeReason=source.kind==='remote'?nativeManifestRejection(source.options,settings,!!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')):'Explicit demuxer requires FFmpeg';
      }else{
        const controller=this.inspection=new AbortController();
        try{
          let probe:Probe|undefined, fastProbe=false, fastFacts:string[]=[];
          // Immutable local bytes permit bounded inspection without an engine download.
          // Remote identity/permission enforcement continues through the existing inspector.
          if(source.kind==='local'){
            const local=source.file instanceof File?source.file:new File([source.file],'media');
            // The filename only bypasses an optimization: FFmpeg still inspects
            // these known-unsupported families, whatever their actual bytes are.
            if(fastInspectionAllowed({local:true,privateDemuxer:!!(this.privateRemux&&this.privateSourceDemuxer(source)),preserve,componentRepairRetry,textTracks:tracks.length,aid:settings.aid,sid:settings.sid,filename:local.name})){
              try{
                const {inspectFastSource}=await this.interruptible(import(new URL('web/fast-source-inspector.js',this.assetBase).href));
                const fast=await inspectFastSource(local,{signal:controller.signal,requirements:routingRequirements,onProgress:(progress:{phase:string})=>{
                  if(!controller.signal.aborted&&!this.destroyed)this.emit('inspectionchange',progress);
                }});
                this.assertOperation();
                if(fast.status==='satisfied'){
                  probe=fast.evidence as Probe;fastProbe=true;fastFacts=fast.available;
                  this.record({mode:'probe',outcome:'selected',reason:`Fast local metadata: ${fast.bytesRead} bytes; routing admission pending`});
                }else this.record({mode:'probe',outcome:'skipped',reason:`Fast local metadata: ${fast.bytesRead} bytes; ${fast.reason}`});
              }catch(error){
                if(controller.signal.aborted||this.activeOperation?.controller.signal.aborted||terminalSourceFailure(error)||this.providerRuntime&&['ASSET_LOAD_FAILED','DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))throw error;
                this.record({mode:'probe',outcome:'skipped',reason:`Fast inspector unavailable: ${String(error)}`});
              }
            }
          }
          this.assertOperation();
          if(!probe&&this.canInspectFFmpeg)probe=await this.inspectWithFFmpeg(source,controller);
          if(!probe)this.record({mode:'probe',outcome:'skipped',reason:'Wasm inspection requires cross-origin isolation; browser-native routes remain available'});
          if(probe){
          for(let inspectionPass=0;inspectionPass<2;inspectionPass++){
          if(source.kind==='remote'&&probe.identity)source.options.identity??=probe.identity;
          // Cross-mode track IDs reset to auto in replace(); preflight that same selection.
          const {aid,sid}=inspectionSelection(probe,{settings,preserve,mode:this.mode,hasSource:!!this.source,textTracks:tracks.length,remuxTracks:usesRemuxTracks(backendPlan(this.current?.backend)),publicAudio:this.publicSelections.get('audio'),publicSubtitle:this.publicSelections.get('sub')});
          nativeReason=this.privateRemux&&this.privateSourceDemuxer(source)?'Explicit demuxer requires FFmpeg':nativeRejection(probe,{...settings,aid,sid},document.createElement('video'));
          this.sourceInspection={source,probe,settings:{aid,sid,subtitles:settings.subtitles}};
          await this.checkInspectedAssets(source,probe,settings,sid,controller);
          if(fastProbe){
            const candidates=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,nativeReason,this.automatic,requirements);
            const first=candidates.find(plan=>plan.eligible)?.id;
            const missing=missingRoutingFacts(candidates,fastFacts);
            if(missing.length){
              this.record({mode:'probe',outcome:'skipped',reason:`Fast metadata missing ${missing.join(', ')} for ${first??'routing'}; FFmpeg inspection required`});
              fastProbe=false;this.updateInspection({kind:'reset',scope:'fallback'});
              if(this.canInspectFFmpeg){probe=await this.inspectWithFFmpeg(source,controller);continue;}
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
          // A new optional private inspector must not remove existing browser-only
          // playback. Retry only a plain initial URL and these diagnosed failures;
          // authorization, identity, cancellation and controlled transport stay terminal.
          const optionalFacts={privateRemux:this.privateRemux,policy:this.remuxSelection.policy,preserve,inspectOnly,remote:source.kind==='remote',identity:source.kind==='remote'&&!!source.options.identity,aid:settings.aid,sid:settings.sid,provider:!!this.providerRuntime,retired:this.destroyed||!!this.activeOperation?.controller.signal.aborted||controller.signal.aborted,assetFailure:playerError(error).code==='ASSET_LOAD_FAILED',terminalSource:terminalSourceFailure(error),rangeReturnedWhole:/^Error: Source transport: Error: Expected HTTP 206; received 200$/.test(String(error)),directAdmitted:true};
          const optionalInspection=optionalInspectionFallback(optionalFacts)&&optionalInspectionFallback({...optionalFacts,directAdmitted:this.admissible(source,settings,[],tracks,undefined,this.automatic,requirements).some(plan=>plan.id==='native-direct'&&plan.eligible)});
          if(optionalInspection){
            nativeReason=undefined;
            this.record({mode:'probe',outcome:'skipped',reason:'Optional private inspection unavailable; trying browser Direct: '+String(error)});
          }else{
            if(this.destroyed||this.activeOperation?.controller.signal.aborted||['AUTOPLAY_BLOCKED','ABORTED','SOURCE_CHANGED','SOURCE_PERMISSION','NETWORK_TIMEOUT','ASSET_LOAD_FAILED'].includes(playerError(error).code)||terminalSourceFailure(error))throw error;
            nativeReason='Native eligibility could not be established: '+String(error);
            this.record({mode:'probe',outcome:'failed',reason:String(error)});
          }
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
      }
    }
    this.admissionContext={nativeReason,automatic:this.automatic};
    if(inspectOnly)return;
    return this.discover(source,settings,preserve,tracks,target,this.automatic,this.automatic?undefined:this.mode,start,requirements);
  }
  private updateEvidence(planId:string,state:'probing'|'prepared'|'failed',session:Session,reason?:string,failureKind?:'compatibility'|'terminal'){
    const epoch=this.operationEpoch,revision=this.runtimeCapabilities.revision,evidence=this.evidence(session);
    if(epoch!==this.operationEpoch||session!==this.current&&session!==this.candidate)return;
    this.runtimeCapabilities.update(planId,state,evidence,reason,failureKind,revision);
  }
  private acceptEvidence(planId:string,session=this.current){
    const epoch=this.operationEpoch,revision=this.runtimeCapabilities.revision,evidence=this.evidence(session);
    if(epoch!==this.operationEpoch||session!==this.current&&session!==this.candidate)return;
    this.runtimeCapabilities.update(planId,evidence.prepared&&!evidence.outputVerified?'prepared':'verified',evidence,
      evidence.prepared&&!evidence.outputVerified?'Paused candidate prepared; actual output is pending a permitted play request':evidence.completedAtEOF?'Previously verified source completed at natural EOF; no new frame or audio observation claimed':'Runtime output observed; physical output and opaque track internals remain unverified',undefined,revision);
  }
  private evidence(session=this.current):CapabilityEvidence {
    if(session?.backend.startupEvidence)return session.backend.startupEvidence();
    const d=session?.backend.diagnostics as {capability?:CapabilityEvidence;rendered?:number;decoder?:string;decoderStats?:{receivedFrames?:number;supportCheck?:unknown}}|undefined;
    if(d?.capability)return {...d.capability};
    return {metadata:true,decoderOutput:!!d?.rendered,videoPresented:!!d?.rendered,
      ...(d?.decoderStats?.supportCheck?{apiHint:JSON.stringify(d.decoderStats.supportCheck)}:{})};
  }
  private localRemuxRetry(source:Source,planId:string,settings:Settings,requirements:RouteRequirements={}):string|undefined {
    const inspected=this.sourceInspection?.source===source,eligible=this.planDecisions.filter(plan=>plan.eligible).map(plan=>plan.id);
    const codecRepair=planId==='native-direct'&&inspected&&!eligible.includes('native-remux')&&!!(this.providerRuntime?.codecPreparation(source,this.sourceInspection!.probe,this.remuxRuntime,settings.aid)||this.providerRuntime?.audioRepairCandidate(source,this.sourceInspection!.probe));
    const facts={local:source.kind==='local',inspected,codecRepair,eligible,rejected:[] as string[]},retry=localDiscoveryRemux(planId,facts);
    return localDiscoveryRemux(planId,{...facts,rejected:retry&&this.tierAttempts.reason(source,this.tierConfiguration(settings,requirements),retry)?[retry]:[]});
  }
  private async discover(source:Source,settings:Settings,preserve:boolean,tracks:(TextTrackSource & {attachmentId?:string})[],target:number|undefined,automatic:boolean,pinnedMode?:PlaybackMode,start=0,requirements:RouteRequirements={}):Promise<void> {
    if(this.providerRuntime){await this.interruptible(this.providerRuntime.load());this.assertOperation();this.selectDeployedRuntime();}
    const initialNativeReason=automatic?this.admissionContext.nativeReason:undefined;
    this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,initialNativeReason,automatic,requirements);
    this.runtimeCapabilities.begin(source,this.planDecisions);
    if(pinnedMode&&pinnedMode!=='native'&&this.privateRemux&&this.privatePlaybackAssetsFailure)throw this.privatePlaybackAssetsFailure;
    if(pinnedMode&&!this.planDecisions.some(p=>p.mode===pinnedMode&&p.eligible)){
      const candidates=this.planDecisions.filter(p=>p.mode===pinnedMode);
      const rejection=candidates.find(p=>p.code==='ISOLATION_REQUIRED')??(this.privateRemux?candidates.find(p=>p.id.startsWith(pinnedMode+'-private')&&p.code!=='PLAN_NOT_REQUESTED'):undefined)??candidates.find(p=>p.code!=='PLAN_NOT_REQUESTED');
      const deployment=deploymentRejectionError(candidates);
      if(rejection?.code!=='ISOLATION_REQUIRED'&&deployment)throw deployment;
      throw new PlayerError(rejection?.code==='ISOLATION_REQUIRED'?'ISOLATION_REQUIRED':'UNSUPPORTED_FEATURE',rejection?.reason??'No qualified complete playback plan');
    }
    const scope={epoch:this.operationEpoch,operation:this.control.operations.active};
    if(!this.dispatchControl({type:'routing.discovery',...scope,change:{kind:'begin',automatic,pinnedMode,start,nativeReason:initialNativeReason}}).accepted)throw new PlayerError('ABORTED','Discovery was retired');
    const id=this.control.routing.discovery.current!.id;
    const current=()=>{const value=this.control.routing.discovery.current;if(!value||value.id!==id)throw new PlayerError('ABORTED','Discovery was retired');return value;};
    const change=(input:Exclude<DiscoveryChange,{kind:'begin'}>)=>{if(!this.dispatchControl({type:'routing.discovery',...scope,change:input}).accepted)throw new PlayerError('ABORTED','Discovery was retired');return current();};
    const advance=()=>change({kind:'advance',id});
    try{
    const attempt=async(plan:{id:string;mode:PlaybackMode},budget?:number)=>{
      if(plan.mode==='hybrid')await this.inspectForQualifiedWebGPU(source,settings);
      // Only discovery owns the replacement and full-budget restoration below.
      // Other callers of replace retain the ordinary direct readiness deadline.
      const loadBudget=budget??(this.localRemuxRetry(source,plan.id,settings,requirements)&&this.sourceInspection?.probe.format?.split(',').includes('matroska')?1500:undefined);
      this.runtimeCapabilities.update(plan.id,'probing');
      await this.replace(source,plan.mode,settings,preserve,tracks,target,automatic,plan.id,loadBudget,requirements);this.assertOperation();current();
      this.acceptEvidence(plan.id);
      this.record({mode:plan.mode,outcome:'selected',reason:`${plan.id}: Playback requirements and actual startup accepted`});
      if(this.current?.error&&!this.recovering)this.recover(this.current);
    };
    // The finite registry supplies a deterministic order. No speculative engines.
    while(current().cursor<this.planDecisions.length){
      this.assertOperation();
      const index=current().cursor;let plan=this.planDecisions[index];
      const policy=discoveryPlanPolicy(current(),plan,this.sourceInspection?.source===source?this.sourceInspection.probe.hybridRejection:undefined);
      if(!policy.included){advance();continue;}
      if(policy.hybridRejection){
        plan=this.rejectPlan(plan.id,policy.hybridRejection);
        this.runtimeCapabilities.admission(this.planDecisions);
      }
      // Repackaging A/V cannot repair a failed browser caption renderer.
      if(policy.captionFailure){
        if(plan.eligible){plan=this.rejectPlan(plan.id,policy.captionFailure);this.runtimeCapabilities.admission(this.planDecisions);this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: ${policy.captionFailure}`});}
        advance();continue;
      }
      const optionalProbe=discoveryOptionalProbe(current(),plan,{flacOffer:!this.providerRuntime||this.providerRuntime.hasOffer(this.preparationProviderId,'flac-lossless'),audioPlayback:this.audioPlayback,automaticLossless:this.automaticLossless,inspected:this.sourceInspection?.source===source,pcm:!!this.sourceInspection?.probe.tracks.some(track=>track.type==='audio'&&['pcm_s16le','pcm_s24le'].includes(track.codec)),losslessInspected:!!this.losslessInspection,local:source.kind==='local',transcodeChecked:this.transcodeAssetsChecked,audioAdaptation:!!this.audioAdaptation,selectiveChecked:this.selectiveAudioAssetsChecked,fileServices:this.fileServicesSource(source),audioOutput:this.audioOutput,gain:settings.gain});
      // Optional inspection and preparation are strictly after original-copy attempts.
      // Never let adaptation bypass subtitle/transport/filter semantic rejection.
      if(optionalProbe==='lossless'&&source.kind==='local'){
        const inspected=this.sourceInspection!;
        const permitted=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,current().nativeReason,automatic,requirements).find(p=>p.id===plan.id);
        if(permitted?.code==='SOURCE_UNSUPPORTED'){
          const controller=this.inspection=new AbortController();
          try{
            const {probeSource}=await this.interruptible(import(new URL('web/source-probe.js',this.assetBase).href));
            const compiledWasm=this.providerRuntime?await this.interruptible(this.providerRuntime.module(`web/engine-adaptation${this.privateRemux?'-'+this.remuxRuntime:''}/remux.wasm`)):undefined;
            const probe:Probe=await probeSource({file:source.file instanceof File?source.file:new File([source.file],'media')},controller.signal,'flac',compiledWasm,this.remuxRuntime);
            this.assertOperation();this.losslessInspection={source,reason:losslessAdaptationRejection(probe,inspected.settings)};
          }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
          this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,current().nativeReason,automatic,requirements);
          plan=this.planDecisions[index];this.runtimeCapabilities.admission(this.planDecisions);
        }
      }
      if(optionalProbe==='transcode'){
        const controller=this.inspection=new AbortController();
        try{
          const available=await this.optionalAssetsAvailable(['mjs','wasm'].map(ext=>`web/engine-adaptation${this.privateRemux?'-'+this.remuxRuntime:''}/remux.${ext}`),controller);
          this.assertOperation();this.updateInspection({kind:'assets',value:{transcodeAssets:available,transcodeChecked:true}});
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
        this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,current().nativeReason,automatic,requirements);
        plan=this.planDecisions[index];this.runtimeCapabilities.admission(this.planDecisions);
      }
      // The common native A/V path never pays for optional mpv-audio asset
      // probes. Check once only when discovery actually reaches a split plan.
      if(optionalProbe==='selective'){
        const controller=this.inspection=new AbortController();
        try{
          const available=await this.optionalAssetsAvailable(this.privateRemux?[`web/engine-mpv-audio-${this.remuxRuntime}/service.mjs`,`web/engine-mpv-audio-${this.remuxRuntime}/service.wasm`,'web/private-mpv/audio-worklet.js']:['web/engine-selective/player.mjs','web/engine-selective/player.wasm','web/selective-sync-worklet.js'],controller);
          this.assertOperation();this.updateInspection({kind:'assets',value:{selectiveAssets:available,selectiveChecked:true}});
        }finally{controller.abort();if(this.inspection===controller)this.inspection=undefined;}
        this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,current().nativeReason,automatic,requirements);
        plan=this.planDecisions[index];this.runtimeCapabilities.admission(this.planDecisions);
      }
      if(this.privateRemux&&this.privatePlaybackAssetsFailure&&(plan.id.startsWith('software-private')||plan.id.startsWith('hybrid-private')))throw this.privatePlaybackAssetsFailure;
      if(!plan.eligible){if(plan.code!=='PLAN_NOT_REQUESTED')this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: ${plan.reason}`});advance();continue;}
      const prior=automatic?this.tierAttempts.reason(source,this.tierConfiguration(settings,requirements),plan.id):undefined;
      if(prior){this.runtimeCapabilities.update(plan.id,'failed',undefined,`Cached compatibility rejection: ${prior}`,'compatibility');this.record({mode:plan.mode,outcome:'skipped',reason:`${plan.id}: cached compatibility rejection: ${prior}`});advance();continue;}
      const lease=change({kind:'attempt',id,planId:plan.id}).pendingAttempt!.id;
      try{
        await attempt(plan);
        return;
      }catch(error){
        const compatible=compatibilityFailure(error),retryLocalLoad=error instanceof NativeLoadTimeout?this.localRemuxRetry(source,plan.id,settings,requirements):undefined;
        const inconclusiveOutput=automatic&&source.kind==='local'&&error instanceof StartupEvidenceTimeout&&error.stage==='output';
        const failure:DiscoveryFailure={id:plan.id,message:String(error),code:playerError(error).code,compatible,interrupted:evidenceInterrupted(error),nativeTimeout:error instanceof NativeLoadTimeout,budget:error instanceof NativeLoadTimeout?error.budgetMs:0,retryRemux:retryLocalLoad,inconclusiveOutput,caption:error instanceof BrowserCaptionUnsupported?error.message:undefined,fast:this.fastInspectedSource===source};
        let decision=change({kind:'failed',id,attempt:lease,failure});
        if(compatible&&!failure.interrupted)this.tierAttempts.failure(source,this.tierConfiguration(settings,requirements),plan.id,String(error));
        this.runtimeCapabilities.update(plan.id,failure.interrupted?'untested':'failed',undefined,String(error),retryLocalLoad||inconclusiveOutput?undefined:compatible?'compatibility':'terminal');
        this.record({mode:plan.mode,outcome:'failed',reason:`${plan.id}: ${String(error)}`});this.assertOperation();current();
        if(decision.phase==='restore'){
          const direct=decision.restoreId!,restoreLease=decision.pendingAttempt!.id;
          try{await attempt({id:direct,mode:'native'},25000);return;}
          catch(originalError){
            const originalCompatible=compatibilityFailure(originalError),originalInterrupted=evidenceInterrupted(originalError);
            decision=change({kind:'restore.failed',id,attempt:restoreLease,failure:{...failure,id:direct,message:String(originalError),code:playerError(originalError).code,compatible:originalCompatible,interrupted:originalInterrupted}});
            if(originalCompatible&&!originalInterrupted)this.tierAttempts.failure(source,this.tierConfiguration(settings,requirements),direct,String(originalError));
            this.runtimeCapabilities.update(direct,originalInterrupted?'untested':'failed',undefined,String(originalError),originalCompatible?'compatibility':'terminal');
            this.record({mode:'native',outcome:'failed',reason:`${direct}: full-budget retry: ${String(originalError)}`});this.assertOperation();current();
            if(decision.phase==='failed'&&decision.failure?.id===direct)throw originalError;
          }
        }
        if(decision.phase==='failed')throw error;
        if(decision.phase==='inspect'){
          const nativeReason=await this.inspectFallbackAfterFastFailure(source,settings);
          change({kind:'reinspected',id,nativeReason});
          this.planDecisions=this.admissible(source,settings,preserve?this.subtitleAssets:[],tracks,current().nativeReason,automatic,requirements);
          this.runtimeCapabilities.admission(this.planDecisions);
        }
      }
    }
    const deployment=deploymentRejectionError(this.planDecisions.filter(plan=>discoveryPlanPolicy(current(),plan).included));
    if(deployment)throw deployment;
    throw Error('No playback route satisfied the source: '+(current().errors.join('; ')||this.planDecisions.map(p=>p.reason).filter(Boolean).join('; ')));
    }finally{this.dispatchControl({type:'routing.discovery',...scope,change:{kind:'finished',id}});}
  }

  private recover(session: Session){
    const sessionId=this.control.source.acceptedSession;
    if(this.current!==session||!this.source||sessionId===null||!this.dispatchControl({type:'routing.recovery',change:{kind:'begin',session:sessionId,epoch:this.operationEpoch}}).accepted)return;
    const id=this.control.routing.recovery.pending!.id,revision=this.runtimeCapabilities.revision;
    let queued=false;
    try{
      const plan=executionPlan(this.mode,backendPlan(session.backend),this.settings.af,this.settings.gain,!!(session.backend.diagnostics as {subtitleOverlay?:unknown})?.subtitleOverlay);
      const evidence=this.evidence(session),message=String(session.error),compatible=compatibilityFailure(session.error);
      if(this.control.routing.recovery.pending?.id!==id||this.current!==session)return;
      this.runtimeCapabilities.update(plan.id,'failed',evidence,message,compatible?'compatibility':'terminal',revision);
      if(this.control.routing.recovery.pending?.id!==id||this.current!==session)return;
      if(!compatible){this.dispatchControl({type:'routing.recovery',change:{kind:'finished',id}});void session.backend.pause().catch(()=>{});if(this.current===session&&sessionAuthority(this.control,sessionId)==='accepted')this.emit('error',session.error);return;}
      if(!evidenceInterrupted(session.error))this.tierAttempts.failure(this.source!,this.tierConfiguration(this.settings),plan.id,String(session.error));
      queued=true;
      void this.enqueue(async()=>{
        if(this.control.routing.recovery.pending?.id!==id||this.current!==session||!this.automatic)return;
        await session.backend.pause().catch(()=>{});this.assertOperation();
        if(this.control.routing.recovery.pending?.id!==id||this.current!==session)return;
        const streaming=this.failedStreamingPlan(session),route=recoveryRoute({mode:this.mode,backendPlan:backendPlan(session.backend),nativeRemux:this.nativeRemux,streaming,trigger:'runtime'});
        const priorAttempts:SelectionAttempt[]=[...this.attempts.filter(attempt=>attempt.outcome!=='selected'),{mode:this.mode,outcome:'failed',reason:`${plan.id}: Runtime playback failure: ${session.error?.message??'Playback backend became unavailable'}`}];
        this.assertOperation();if(this.control.routing.recovery.pending?.id!==id||this.current!==session)return;
        await this.select(this.source!,this.settings,true,this.nativeTracks,route.start,undefined,priorAttempts,false,route.requirements);
      },'switching').catch(error=>{if(!this.destroyed&&this.control.routing.recovery.pending?.id===id)this.emit('error',error);}).finally(()=>{
        if(!this.dispatchControl({type:'routing.recovery',change:{kind:'finished',id}}).accepted)return;
        if(this.current?.error&&this.current!==session)this.recover(this.current);
      });
    }finally{if(!queued)this.dispatchControl({type:'routing.recovery',change:{kind:'finished',id}});}
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
    if(options.startTime!==undefined&&(!Number.isFinite(options.startTime)||options.startTime<0))return Promise.reject(new PlayerError('INVALID_ARGUMENT','startTime must be finite nonnegative seconds'));
    if(isCustomSource(input)){
      const provider=input;return this.enqueue(async()=>{const file=await materializeSource(provider,this.activeOperation!.controller.signal);const source:Source={kind:'local',file,input:{demuxer:options.demuxer},trackPolicy:normalizeTrackPolicy({...this.configuredTrackPolicy,...normalizeTrackPolicy(options.trackPolicy)})};const inspection=this.captureInspection();try{await this.select(source,this.settings,false,[],0,options.startTime);}catch(error){if(this.source!==source){this.restoreInspection(inspection);}throw error;}},'opening',options.signal);
    }
    let source:Source;
    try {
      if(options.startTime!==undefined&&(!Number.isFinite(options.startTime)||options.startTime<0))throw new PlayerError('INVALID_ARGUMENT','startTime must be finite nonnegative seconds');
      if(input instanceof Blob&&!(input instanceof File))input=new File([input],'media',{type:input.type});
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
      const inspection=this.captureInspection();
      try{await this.select(source,this.settings,false,[],0,options.startTime);}catch(error){if(this.source!==source){this.restoreInspection(inspection);}throw error;}
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
    return this.enqueue(()=>this.applySetting({kind:'filters',key,value:chain}),'switching');
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
        await this.applySetting({kind:'gain',value});
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
  private async executeSetting(backend:Backend,effect:SettingEffect,session?:Session):Promise<void>{
    switch(effect.kind){
      case 'seek':return backend.seek(effect.value);
      case 'seek.verify':return this.settled(session!,this.mode,effect.value);
      case 'volume':return backend.volume(effect.value);
      case 'rate':return backend.rate(effect.value);
      case 'gain':return backend.gain!(effect.value);
      case 'pause':return backend.pause();
      case 'play':return backend.play();
      case 'track':return backend.selectTrack(effect.track,effect.value);
      case 'track.verify':return this.confirmTrackSelection(session!,this.source,this.mode,effect.settings,effect.track,effect.value);
      case 'subtitles':return backend.subtitleVisible(effect.value);
      case 'buffering':return backend.setBuffering!(effect.value);
      case 'output':return backend.setAudioOutputDevice!(effect.value);
      case 'quality':return backend.setQuality!(effect.value);
      case 'filter':return backend.command!('set',effect.key,effect.value);
      case 'promotion':this.schedulePromotion();return;
      case 'source.replace':return this.replace(this.source!,effect.mode,effect.settings,true,this.nativeTracks,undefined,false);
      case 'source.reconfigure':return this.select(this.source!,effect.settings,true,this.nativeTracks);
    }
  }
  /** All decisions and accepted values live in the composed transition. This
   * adapter invokes typed effects and reports their outcome with the original ID. */
  private async applySetting(command:SettingCommand){
    const session=this.current,backend=session?.backend,begin=this.dispatchControl({type:'setting.begin',command,hasBackend:!!backend,hasSource:!!this.source,hybridAudioFilters:this.hybridAudioFilters});
    if(!begin.accepted||!begin.effects)throw new PlayerError(begin.reason==='unsupported'?'UNSUPPORTED_FEATURE':begin.reason==='invalid'?'INVALID_ARGUMENT':'ABORTED',begin.message??'Setting operation was retired');
    const id=begin.id!;
    const execute=async(effects:readonly SettingEffect[])=>{for(const effect of effects){if(!settingAuthority(this.control,id))throw new PlayerError('ABORTED','Setting operation was retired');await this.interruptible(this.executeSetting(backend!,effect,session));}};
    try{await execute(begin.effects);}
    catch(error){
      if(this.control.settingsTransactions.pending?.id===id&&this.control.settingsTransactions.pending.phase==='accepted'){this.dispatchControl({type:'setting.accept',id});throw error;}
      const failure=this.dispatchControl({type:'setting.failed',id});
      if(!failure.accepted||!failure.effects)throw new PlayerError('ABORTED','Setting operation was retired');
      try{await execute(failure.effects);}
      catch(restoreError){
        const degraded=this.dispatchControl({type:'setting.degraded',id});
        if(!degraded.accepted)throw new PlayerError('ABORTED','Setting operation was retired');
        const failure=new PlayerError('DECODE_FAILED',`Setting update and rollback failed; backend settings may be partially applied (${playerError(restoreError).message})`);
        this.emit('error',failure);throw failure;
      }
      if(!this.dispatchControl({type:'setting.restored',id}).accepted)throw new PlayerError('ABORTED','Setting operation was retired');
      throw error;
    }
    const accepted=this.dispatchControl({type:'setting.accept',id});
    if(!accepted.accepted)throw new PlayerError('ABORTED','Setting operation was retired');
    for(const effect of accepted.effects??[]){this.assertOperation();await this.executeSetting(this.current?.backend??backend!,effect,this.current);}
  }
  private async playNativeVerified(backend:Backend,playing=backend.play(),outputBudgetMs?:number,intent?:AbortSignal) {
    const controller=new AbortController();
    const signals=[intent,this.activeOperation?.controller.signal].filter((signal):signal is AbortSignal=>!!signal);
    const abort=()=>controller.abort();
    for(const signal of signals){signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}
    let verification:Promise<void>|undefined;
    try{verification=(backend as Backend & {verifyOutput(signal?:AbortSignal,outputBudgetMs?:number):Promise<void>}).verifyOutput(controller.signal,outputBudgetMs);await Promise.all([playing,verification]);}
    finally{for(const signal of signals)signal.removeEventListener('abort',abort);controller.abort();await verification?.catch(()=>{});}
  }
  play() {
    this.#previewController.setPlaybackActive(true);
    const intent=new AbortController(),intentId=this.dispatchControl({type:'play.request'}).id!;this.playRequests.set(intentId,intent);
    // An unverified trial must not consume the user's requested playback position.
    const trialSession=this.current,trialPosition=Math.max(0,Number(this.current?.backend.properties.get('time-pos'))||0);
    const trialVerified=this.evidence(this.current).outputVerified===true;
    // Initiate resume before yielding the user's activation to the operation queue.
    let immediate:Promise<void>|undefined;
    try{immediate=!this.destroyed&&this.queued===0&&this.current?this.current.backend.play():undefined;}catch(error){this.dispatchControl({type:'play.settled',id:intentId});this.playRequests.delete(intentId);throw error;}
    immediate?.catch(()=>{});
    return this.enqueue(async()=>{if(intent.signal.aborted)return;if(!this.current)throw Error('No source');const session=this.current;this.updateSettings({pause:false});
      // A local original-copy trial can yield to an already-admitted route.
      // This is a scheduling budget, not a codec rejection or a new route.
      const boundedTrial=this.automatic&&this.source?.kind==='local'&&this.nativeRemux!=='never'&&!trialVerified&&
        ['direct','direct-mpv'].includes(backendPlan(session.backend)??'')&&
        this.planDecisions?.some(plan=>plan.eligible&&!plan.id.startsWith('native-direct'));
      try{
        const playing=immediate??session.backend.play();
        if(this.mode==='native')await this.playNativeVerified(session.backend,playing,boundedTrial?1500:undefined,intent.signal);else await playing;
        this.assertOperation();if(this.current===session){const plan=this.diagnostics.plan;if(plan)this.acceptEvidence(plan.id,session);}
      }catch(error){
        // A newer Pause supersedes this Play without rejecting the accepted
        // codec or starting fallback. Its queued pause command applies next.
        if(intent.signal.aborted)return;
        const inconclusiveOutput=this.source?.kind==='local'&&error instanceof StartupEvidenceTimeout&&error.stage==='output';
        if(this.automatic&&(compatibilityFailure(error)||inconclusiveOutput)&&this.source){
          const streaming=this.failedStreamingPlan(session);
          const route=recoveryRoute({mode:this.mode,backendPlan:backendPlan(session.backend),nativeRemux:this.nativeRemux,streaming,trigger:'play'});
          const plan=this.diagnostics.plan;if(plan){
            this.updateEvidence(plan.id,inconclusiveOutput?'prepared':'failed',session,String(error),inconclusiveOutput?undefined:'compatibility');
            if(!evidenceInterrupted(error))this.tierAttempts.failure(this.source,this.tierConfiguration(this.settings),plan.id,String(error));
          }
          try{
            this.assertOperation();
            await this.select(this.source,this.settings,true,this.nativeTracks,route.start,session===trialSession&&!trialVerified?trialPosition:undefined,[],false,route.requirements);
          }catch(fallbackError){
            this.assertOperation();
            // Slow original output is not incompatibility. If replacement fails,
            // retain the accepted source and give it the ordinary full deadline.
            if(!boundedTrial||!inconclusiveOutput||this.current!==session||!(compatibilityFailure(fallbackError)||['ASSET_LOAD_FAILED','NETWORK_TIMEOUT','ISOLATION_REQUIRED'].includes(playerError(fallbackError).code)))throw fallbackError;
            if(session===trialSession&&!trialVerified){await session.backend.seek(trialPosition);this.assertOperation();}
            try{await this.playNativeVerified(session.backend,undefined,undefined,intent.signal);}
            catch(error){if(intent.signal.aborted)return;throw error;}
            this.assertOperation();if(plan)this.acceptEvidence(plan.id,session);
          }
        }
        else {const plan=this.diagnostics.plan;if(plan&&evidenceInterrupted(error))this.updateEvidence(plan.id,'prepared',session,String(error));this.updateSettings({pause:true});await session.backend.pause().catch(()=>{});throw error;}
      }}).finally(()=>{this.dispatchControl({type:'play.settled',id:intentId});this.playRequests.delete(intentId);});
  }
  pause() {for(const id of this.dispatchControl({type:'play.retire'}).retire)this.playRequests.get(id)?.abort();return this.enqueue(async()=>{await this.applySetting({kind:'pause'});this.dispatchControl({type:'playback.observed',playing:false,waiting:false});if(this.backgroundPromotion)this.schedulePromotion();});}
  seek(seconds: number, options:import('./types.js').SeekOptions={}) {return this.seekForSource(seconds,options);}
  private seekForSource(seconds:number,options:import('./types.js').SeekOptions,sourceId?:number|null) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new PlayerError('INVALID_ARGUMENT','Invalid seek time');
    if(options.policy!==undefined&&!['queue','latest'].includes(options.policy))throw new PlayerError('INVALID_ARGUMENT','Invalid seek policy');
    const controller=new AbortController(),abort=()=>controller.abort();
    options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
    const request=this.dispatchControl({type:'seek.request',latest:options.policy==='latest'}),seekId=request.id!;
    this.seekRequests.set(seekId,controller);for(const id of request.retire)this.seekRequests.get(id)?.abort();
    return this.enqueue(async () => {
      if(sourceId!==undefined&&sourceId!==this.state.sourceId)throw new PlayerError('INVALID_ARGUMENT','Chapter belongs to a retired source');
      if (!this.current) throw new Error('No source');
      if(this.playbackRange&&(seconds<this.playbackRange.start||seconds>this.playbackRange.end))throw new PlayerError('INVALID_ARGUMENT','Seek is outside the playback range');
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
    },'seeking',controller.signal).finally(()=>{options.signal?.removeEventListener('abort',abort);this.dispatchControl({type:'seek.settled',id:seekId});this.seekRequests.delete(seekId);});
  }
  seekChapter(id:string){const chapter=this.state.mediaInfo.chapters?.find(c=>c.id===id);if(!chapter)return Promise.reject(new PlayerError('INVALID_ARGUMENT','Unknown source chapter'));return this.seekForSource(chapter.start,{},this.state.sourceId);}
  getPlaybackRange(){return this.playbackRange?freeze({...this.playbackRange}):null;}
  getLoop():import('./types.js').LoopPolicy{return typeof this.loopPolicy==='object'?freeze({...this.loopPolicy}):this.loopPolicy;}
  private rangeFacts(){return {hasBackend:!!this.current,time:this.state.currentTime,duration:this.state.duration,seekable:(this.state.seekable??[]).map(window=>({...window}))};}
  setPlaybackRange(range:import('./types.js').PlaybackRange|null){
    const copy=range?{...range}:null;
    return this.enqueue(()=>this.applySetting({kind:'range',value:copy,facts:this.rangeFacts()}),'seeking');
  }
  setLoop(policy:import('./types.js').LoopPolicy){
    const copy=typeof policy==='object'&&policy?{...policy}:policy;
    return this.enqueue(()=>this.applySetting({kind:'loop',value:copy,facts:this.rangeFacts()}),typeof copy==='object'?'seeking':null);
  }
  private enforceBoundary(){
    if(!this.current)return;
    const sample=()=>({time:this.state.currentTime,duration:this.state.duration,ended:this.state.status==='ended'});
    const admitted=this.dispatchControl({type:'boundary.sample',...sample()});
    if(!admitted.accepted)return;
    const id=admitted.id!,session=this.current;
    const fail=()=>{
      const failed=this.dispatchControl({type:'boundary.failed',id});
      if(!failed.accepted)return;
      // Failed cleanup remains best effort; logical pause is already committed.
      try{void session.backend.pause().catch(()=>{});}catch{}
      this.publish();
    };
    void this.enqueue(async()=>{
      try{
        let decision=this.dispatchControl({type:'boundary.start',id,...sample()});
        while(decision.accepted&&decision.effects?.length){
          const phase=this.control.boundary.pending?.phase;
          if(!phase||!boundaryAuthority(this.control,id))return;
          for(const effect of decision.effects){
            if(!boundaryAuthority(this.control,id))return;
            await this.interruptible(this.executeSetting(session.backend,effect,session));
          }
          decision=this.dispatchControl({type:'boundary.complete',id,phase});
        }
      }catch(error){fail();throw error;}
    },'seeking').catch(fail).finally(()=>{this.dispatchControl({type:'boundary.settled',id});});
  }
  stepFrame(direction:1|-1=1){
    if(direction!==1&&direction!==-1)throw new PlayerError('INVALID_ARGUMENT','Frame direction must be 1 or -1');
    return this.enqueue(async()=>{
      if(!this.current||this.mode==='native'||!this.state.mediaInfo.video)throw new PlayerError('UNSUPPORTED_FEATURE','Frame stepping requires mpv video playback');
      const backend=this.current.backend,initial=this.state.currentTime;
      if(direction<0&&initial<=0)throw new PlayerError('INVALID_ARGUMENT','No previous frame at the start of the source');
      await backend.pause();this.updateSettings({pause:true});
      await backend.command!(direction===1?'frame-step':'frame-back-step');
      const deadline=performance.now()+25000;
      while(performance.now()<deadline){this.assertOperation();const time=Number(backend.properties.get('time-pos'));if(Number.isFinite(time)&&(direction>0?time>initial:time<initial)){await this.settled(this.current,this.mode,time);return;}await new Promise(resolve=>setTimeout(resolve,20));}
      throw new PlayerError('UNSUPPORTED_FEATURE','No adjacent frame was presented within the stepping deadline');
    },'seeking');
  }
  snapshot(options:import('./types.js').SnapshotOptions={}):Promise<import('./types.js').VideoSnapshot>{
    let result:import('./types.js').VideoSnapshot;
    return this.enqueue(async()=>{
      const surface=this.surface;if(!surface||!this.state.mediaInfo.video)throw new PlayerError('UNSUPPORTED_FEATURE','No video presentation');
      const subtitle=this.state.subtitlesVisible&&!!this.state.mediaInfo.subtitle,include=options.includeSubtitles??true;
      if(this.mode!=='native'){
        if(subtitle&&!include)throw new PlayerError('UNSUPPORTED_FEATURE','The mpv surface already contains subtitles');
        if(options.width!==undefined||options.height!==undefined)throw new PlayerError('UNSUPPORTED_FEATURE','mpv snapshots use the current presentation size');
        const backend=this.current!.backend as Backend&{previewSnapshot?:()=>Promise<{blob:Blob;width:number;height:number}>};
        if(!backend.previewSnapshot)throw new PlayerError('UNSUPPORTED_FEATURE','Snapshot readback is unavailable');
        const image=await backend.previewSnapshot();result=Object.freeze({...image,mediaTime:this.state.currentTime,actualTime:null,includesSubtitles:subtitle});return;
      }
      if(subtitle&&include)throw new PlayerError('UNSUPPORTED_FEATURE','Native subtitle composition is not qualified for snapshots');
      const video=surface as HTMLVideoElement,scale=Math.min(1,1920/video.videoWidth,1080/video.videoHeight);
      const width=options.width??Math.max(1,Math.round(video.videoWidth*scale)),height=options.height??Math.max(1,Math.round(video.videoHeight*scale));dimensions(width,height);
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      try{canvas.getContext('2d')!.drawImage(video,0,0,width,height);const blob=await new Promise<Blob>((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new PlayerError('UNSUPPORTED_FEATURE','Snapshot encoding failed')),'image/png'));result=Object.freeze({blob,width,height,mediaTime:this.state.currentTime,actualTime:null,includesSubtitles:false});}
      catch{throw new PlayerError('UNSUPPORTED_FEATURE','The browser does not permit snapshot readback for this source');}
    }).then(()=>result);
  }
  volume(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new PlayerError('INVALID_ARGUMENT','Invalid volume');
    return this.enqueue(()=>this.applySetting({kind:'volume',value}));
  }
  setVolume(value:number) {if(!Number.isFinite(value)||value<0||value>1)throw new PlayerError('INVALID_ARGUMENT','Volume must be 0 to 1');return this.volume(value*100);}
  setMuted(value:boolean) {if(typeof value!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Expected boolean mute state');return this.enqueue(()=>this.applySetting({kind:'mute',value}));}
  setPlaybackRate(value:number) {return this.rate(value);}
  selectAudioTrack(id:string|null) {return this.selectPublicTrack('audio',id);}
  selectSubtitleTrack(id:string|null) {return this.selectPublicTrack('sub',id);}
  private selectPublicTrack(type:TrackType,id:string|null) {
    return this.enqueue(async()=>{
      if(!this.current)throw Error('No source');
      const identity=this.control.source,raw=this.sourceTracks(),plan=backendPlan(this.current?.backend);
      const projected=tracks(raw,this.sourceSerial,this.mode,plan).filter(track=>track.type===(type==='audio'?'audio':'subtitle'));
      const inventory=projected.map(track=>{
        const original=raw.find(item=>item.type===type&&`${this.sourceSerial}:${trackKey(item,this.mode,plan)}`===track.id)!;
        return {...capturePolicyTrack(track),backendId:String(original.id),key:trackKey(original,this.mode,plan)};
      });
      await this.applySetting({kind:'publicTrack',track:type,id,facts:{sourceId:identity.serial,session:identity.acceptedSession,inventory,policy:captureTrackPolicy(type==='audio'?this.trackPolicy.audio:this.trackPolicy.subtitles),plan,surfaceLocked:this.presentation.locksSurface,automaticLossless:this.automaticLossless}});
    },'switching');
  }
  rate(value: number) {
    if (!Number.isFinite(value) || value < .5 || value > 2) throw new PlayerError('INVALID_ARGUMENT','Playback rate must be 0.5 to 2');
    return this.enqueue(()=>this.applySetting({kind:'rate',value}));
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
    return this.enqueue(()=>this.applySetting({kind:'track',track:type,value:id,clearPublicSelection:true}));
  }
  subtitleVisible(visible: boolean) {
    if(typeof visible!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Expected boolean subtitle visibility');
    return this.enqueue(()=>this.applySetting({kind:'visibility',value:visible,facts:{policy:captureTrackPolicy(this.trackPolicy.subtitles),hasTracks:this.sourceTracks().some(track=>track.type==='sub'),surfaceLocked:this.presentation.locksSurface,plan:backendPlan(this.current?.backend)}}));
  }
  getTimingSettings():import('./types.js').TimingSettings{return freeze({subtitleDelay:this.subtitleDelay,audioDelay:this.audioDelay,effectiveSubtitleDelay:this.current?this.subtitleDelay:null,effectiveAudioDelay:this.current?this.audioDelay:null,subtitleStyle:{...this.subtitleStyle},styleScope:'plain-text'});}
  private timingChange(key:'subtitleDelay'|'audioDelay'|'subtitleStyle',value:number|import('./types.js').SubtitleStyle){
    return this.enqueue(()=>this.applySetting(key==='subtitleStyle'?{kind:key,value:value as import('./types.js').SubtitleStyle}:{kind:key,value:value as number}),'switching');
  }
  setSubtitleDelay(seconds:number){if(!Number.isFinite(seconds)||Math.abs(seconds)>60)throw new PlayerError('INVALID_ARGUMENT','Subtitle delay must be within -60 to 60 seconds');return this.timingChange('subtitleDelay',seconds);}
  setAudioDelay(seconds:number){if(!Number.isFinite(seconds)||Math.abs(seconds)>60)throw new PlayerError('INVALID_ARGUMENT','Audio delay must be within -60 to 60 seconds');return this.timingChange('audioDelay',seconds);}
  setSubtitleStyle(style:import('./types.js').SubtitleStyle){
    if(!style||typeof style!=='object'||Object.keys(style).some(key=>!['fontSize','color','borderSize','fontFamily'].includes(key))||style.fontSize!==undefined&&(!Number.isFinite(style.fontSize)||style.fontSize<8||style.fontSize>150)||style.borderSize!==undefined&&(!Number.isFinite(style.borderSize)||style.borderSize<0||style.borderSize>10)||style.color!==undefined&&!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(style.color)||style.fontFamily!==undefined&&(typeof style.fontFamily!=='string'||style.fontFamily.length>128||/[\x00-\x1f]/.test(style.fontFamily)))throw new PlayerError('INVALID_ARGUMENT','Invalid plain-text subtitle style');
    return this.timingChange('subtitleStyle',{...style});
  }
  private attachmentFacts(title?:string,language?:string,codec?:string):AttachmentFacts {
    const identity=this.control.source,track=title===undefined?undefined:tracks([{id:'external',type:'sub',title,lang:language,codec,external:true}],identity.serial,this.mode)[0];
    return {sourceId:identity.acceptedSession===null?null:identity.serial,session:identity.acceptedSession,hasSource:!!this.source,hasBackend:!!this.current,surfaceLocked:this.presentation.locksSurface,nativeASS:this.nativeASS,plan:backendPlan(this.current?.backend),policy:captureTrackPolicy(this.trackPolicy.subtitles),track:track?capturePolicyTrack(track):undefined};
  }
  private attachmentRejection(decision:PlayerControlDecision):never {if(decision.reason==='failed')throw Error(decision.message);throw new PlayerError(decision.reason==='invalid'?'INVALID_ARGUMENT':decision.reason==='unsupported'?'UNSUPPORTED_FEATURE':'ABORTED',decision.message??'Attachment operation was retired');}
  private async applyAttachment(command:AttachmentCommand,facts:AttachmentFacts,read?:()=>Promise<ArrayBuffer>,install?:(bytes:ArrayBuffer)=>void){
    let decision=this.dispatchControl({type:'attachment.begin',command,facts});if(!decision.accepted)this.attachmentRejection(decision);
    const id=decision.id!;
    try{
      while(decision.effects?.length){
        for(const effect of decision.effects){
          if(!attachmentAuthority(this.control,id))throw new PlayerError('ABORTED','Attachment operation was retired');
          if(effect.kind==='attachment.read'){
            const bytes=await this.interruptible(read!());
            if(!attachmentAuthority(this.control,id))throw new PlayerError('ABORTED','Attachment operation was retired');
            decision=this.dispatchControl({type:'attachment.ready',id,bytes:bytes.byteLength});if(!decision.accepted)this.attachmentRejection(decision);
            install!(bytes);
          }else{
            if(effect.kind==='attachment.text'){
              const resource=this.attachmentResources.get(effect.attachmentId);if(resource?.kind!=='text')throw Error('Missing browser text attachment resource');
              await this.interruptible(this.current!.backend.addTextTrack!(resource.asset,effect.attachmentId));
            }else if(effect.kind==='attachment.select')await this.interruptible(this.select(this.source!,effect.settings,true,this.nativeTracks));
            else if(effect.kind==='attachment.replace')await this.interruptible(this.replace(this.source!,effect.mode,effect.settings,true,this.nativeTracks));
            decision={...decision,effects:[]};
          }
        }
      }
      const accepted=this.dispatchControl({type:'attachment.complete',id});if(!accepted.accepted)this.attachmentRejection(accepted);
    }catch(error){this.dispatchControl({type:'attachment.failed',id});throw error;}
    finally{this.pruneAttachments();}
  }
  addSubtitle(file:File, options:SubtitleOptions={}) {return this.attachSubtitle(file,options).then(()=>{});}
  attachSubtitle(file:File, options:SubtitleOptions={}):Promise<import('./types.js').AttachmentHandle> {
    const valid=file instanceof File,format=valid?file.name.split('.').at(-1)?.toLowerCase()??'':'',allocation=this.dispatchControl({type:'attachment.allocate',kind:'subtitle',file:{valid,format,size:valid?file.size:0}}),attachmentId=`subtitle-${allocation.id}`;let sourceId:number|null=null;
    if(!allocation.accepted)return Promise.reject(new PlayerError('INVALID_ARGUMENT',allocation.message!));
    return this.enqueue(async()=>{
      const facts=this.attachmentFacts(options.label??file.name,options.language,format);sourceId=facts.sourceId;
      await this.applyAttachment({kind:'add',entry:{id:attachmentId,kind:'subtitle',sourceId,bytes:file.size},select:options.select!==false},facts,()=>file.arrayBuffer(),bytes=>{
        const asset={attachmentId,bytes,format:format as SubtitleAsset['format'],label:options.label??file.name,language:options.language,select:options.select??true};plainVTT(asset);this.attachmentResources.set(attachmentId,{kind:'subtitle',asset});
      });
    }).then(()=>{const handle=freeze({id:attachmentId,kind:'subtitle' as const,sourceId});this.attachmentHandles.add(handle);return handle;});
  }
  addFont(file:File) {return this.attachFont(file).then(()=>{});}
  attachFont(file:File):Promise<import('./types.js').AttachmentHandle> {
    const valid=file instanceof File,format=valid&&file.name.includes('.')?file.name.split('.').at(-1)?.toLowerCase()??'':'',allocation=this.dispatchControl({type:'attachment.allocate',kind:'font',file:{valid,format,size:valid?file.size:0}}),attachmentId=`font-${allocation.id}`;
    if(!allocation.accepted)return Promise.reject(new PlayerError('INVALID_ARGUMENT',allocation.message!));
    return this.enqueue(()=>this.applyAttachment({kind:'add',entry:{id:attachmentId,kind:'font',sourceId:null,bytes:file.size},select:false},this.attachmentFacts(),()=>file.arrayBuffer(),bytes=>{this.attachmentResources.set(attachmentId,{kind:'font',asset:{attachmentId,name:attachmentId+'.'+format,bytes}});})).then(()=>{const handle=freeze({id:attachmentId,kind:'font' as const,sourceId:null});this.attachmentHandles.add(handle);return handle;});
  }
  removeAttachment(handle:import('./types.js').AttachmentHandle):Promise<void>{
    return this.enqueue(async()=>{
      const authentic=!!handle&&this.attachmentHandles.has(handle),selected=authentic&&this.state.mediaInfo.subtitle?.id===`${this.sourceSerial}:sub:attachment:${handle.id}`;
      await this.applyAttachment({kind:'remove',id:authentic?handle.id:'',handleKind:authentic?handle.kind:'',sourceId:authentic?handle.sourceId:null,authentic,selected},this.attachmentFacts());
      this.attachmentHandles.delete(handle);
    },'switching');
  }
  setToneMapping(value:ToneMapping) {
    if(!['off','hdr-to-sdr'].includes(value))throw new PlayerError('INVALID_ARGUMENT','Invalid tone mapping policy');
    return this.enqueue(()=>this.applySetting({kind:'toneMapping',value}));
  }
  addTextTrack(track: TextTrackSource):Promise<void> {return this.attachTextTrack(track).then(()=>{});}
  attachTextTrack(track:TextTrackSource):Promise<import('./types.js').AttachmentHandle> {
    const allocation=this.dispatchControl({type:'attachment.allocate',kind:'text'}),attachmentId=`text-${allocation.id}`,source={...track,attachmentId};let sourceId:number|null=null;
    return this.enqueue(async()=>{
      const facts=this.attachmentFacts(source.label,source.language,'webvtt');sourceId=facts.sourceId;
      // The physical URL record is staged before logical admission and pruned
      // on rejection before another adapter effect. Caller-owned URLs are never revoked by the Player.
      const command:AttachmentCommand={kind:'add',entry:{id:attachmentId,kind:'text',sourceId,bytes:0},select:false};
      this.attachmentResources.set(attachmentId,{kind:'text',asset:source});
      try{await this.applyAttachment(command,facts);}finally{this.pruneAttachments();}
    }).then(()=>{const handle=freeze({id:attachmentId,kind:'subtitle' as const,sourceId});this.attachmentHandles.add(handle);return handle;});
  }
  resize(width: number, height: number) {
    if(this.destroyed)throw new PlayerError('ABORTED','Player is destroyed');dimensions(width, height);
    this.updatePreferences({outputSize:{width,height}});this.current?.backend.resize(width, height);
  }
  close():Promise<void> {
    this.cancelPromotion();
    if(this.destroyed)return this.destruction!;
    if(this.closing)return this.closing;
    this.#previewController.setSourceIdentity(`closed:${this.sourceSerial}`);this.previewSource=undefined;
    this.dispatchControl({type:'operation.retire',terminal:false});this.activeOperation?.controller.abort();this.inspection?.abort();this.stopWatchdogs();
    const cleanup=Promise.all([this.#previewController.drain(),...[this.candidate,this.current].map(s=>s?.backend.destroy().catch(()=>{}))]);
    this.closing=this.enqueue(async()=>{await cleanup;await this.dispose(this.current);this.playbackRange=null;this.loopPolicy=false;this.current=undefined;this.candidate=undefined;this.source=undefined;this.dispatchControl({type:'source.clear'});this.sourceInspection=undefined;this.losslessInspection=undefined;this.sessionError=null;},'closing').finally(()=>{this.closing=undefined;});
    return this.closing;
  }
  destroy(): Promise<void> {
    this.cancelPromotion();
    if (this.destruction) return this.destruction;
    this.preparation?.destroy();
    const providerCleanup=this.providerRuntime?.destroy();
    const presentationCleanup=this.presentation.destroy();
    const previewCleanup=this.#previewController.destroy();this.previewSource=undefined;
    this.dispatchControl({type:'operation.retire',terminal:true});this.activeOperation?.controller.abort();this.lifetime.abort();this.inspection?.abort();this.stopWatchdogs();
    this.destruction = (async () => {
      await Promise.all([providerCleanup,presentationCleanup,previewCleanup,...[this.candidate, this.current].map(session => session?.backend.destroy().catch(() => {}))]);
      await this.queue;
      try {await this.dispose(this.current);} finally {this.current = undefined;this.source = undefined;this.dispatchControl({type:'source.clear'});this.sourceInspection=undefined;this.losslessInspection=undefined;this.sessionError=null;this.publish();this.subscribers.clear();this.root.remove();}
    })();return this.destruction;
  }
}
