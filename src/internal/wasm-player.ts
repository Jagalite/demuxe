// SPDX-License-Identifier: Apache-2.0
import type {ProviderRuntimeAssets} from './provider-runtime.js';
import {runtimeWorker} from './runtime-worker.js';
import {bufferingPolicy, resolveBuffering, mpvBufferingOptions} from './buffering.js';
import type {BufferingPolicy, BufferingResolution} from '../types.js';
import {PlayerError,isPlayerError} from './errors.js';
import type {AudioOutput, FontAsset, ResourceLimits, SubtitleAsset, MediaInputOptions, StreamingOptions} from '../types.js';
import {resolveDecodePolicy} from './decode-policy.js';
import {webgpuDecoderSupported} from './webgpu-codecs.js';
import {selectExternalDecoderConfiguration} from './external-decoder-selection.js';
import type {ExternalDecodeIntent} from './external-decoder-selection.js';
import type {DecodeQuality} from './decode-policy.js';
import {watchdogPolicy} from './watchdogs.js';
import type {WatchdogPolicy} from '../types.js';
import {wasmSeekBoundary} from './machine/wasm-seek.js';
import {createWasmLifecycle,wasmAlive,markWasmInitialized,settleWasmInitialization,claimWasmWorkerFailure,admitWasmRequest,settleWasmRequest,rejectWasmRequests,admitWasmWaiter,settleWasmWaiter,beginWasmOpen,ownsWasmOpen,finishWasmOpen,observeWasmFile,retireWasmLifecycle,finishWasmRetirement,beginWasmPlayerSeek,observeWasmPlayerSeek,confirmWasmPlayerSeek} from './machine/wasm-lifecycle.js';
export type PlayerEvent = {event:string; id?:number; name?:string; data?:unknown; error?:string; [key:string]:unknown};
export type RemoteSource = MediaInputOptions & {streaming?:StreamingOptions;url:string;format?:'file'|'hls'|'dash';headers?:Record<string,string>;credentials?:RequestCredentials;allowedOrigins?:string[];immutable?:boolean;refreshAuthorization?:(resource?:{url:string})=>Promise<{url?:string;headers?:Record<string,string>}>};
export type PlayerDiagnostics = {buffering?:BufferingResolution;path:'wasm';presentation?:{position?:number;pts?:number[];retained?:number;pending?:number;received?:number;closed?:number};decoder?:'software'|'webcodecs'|'webgpu';decoderBackend?:'ffmpeg'|'webcodecs'|'webgpu';webgpu?:{available:boolean;selected:boolean;codec:string|null;decodeIntent?:ExternalDecodeIntent|null;queuedPackets:number;retainedFrames:number;liveSurfaces:number;surfaceBytes:number;pooledBufferBytes:number;pipelineCount:number;submissions:number;deviceLost:boolean};decoderStats?:Record<string,number|boolean>; rendered:number; heapBytes:number; queuedFrames:number; epoch:number;io?:Record<string,number|string>;seeking?:boolean;position?:number;presentedPosition?:number;ioPending?:boolean;interruptions?:number;renderMs?:number;copyMs?:number};

/** One isolated software engine per player; bounded remote ranges and local File reads; ArrayBuffer inputs remain capped. */
export class WasmPlayer extends EventTarget {
  private loading=new AbortController();
  private worker: Worker;
  private workerOwner: HTMLIFrameElement;
  private audioContext: AudioContext;
  private audioNode?: AudioWorkletNode;
  private selectiveGain?: GainNode;
  private analyser?: AnalyserNode;
  private gainNode?: GainNode;
  private gainValue=1;
  private volumeValue=100;
  private timing?: ReturnType<typeof setInterval>;
  private lastTiming?: {latencyUs:number;running:boolean};
  private watchdogs=watchdogPolicy();
  private lifecycle=createWasmLifecycle();
  private initializationError?:Error;
  private get destroyed(){return this.lifecycle.phase==='retiring'||this.lifecycle.phase==='closed';}
  setWatchdogs(policy:WatchdogPolicy){
    this.watchdogs=policy;
    if(this.lifecycle.initSent&&!this.destroyed)this.worker.postMessage({type:'watchdogs',decoderOutput:policy.decoderOutput});
  }
  private pending = new Map<number,{resolve:(result?:any)=>void;reject:(error:Error)=>void;timer?:ReturnType<typeof setTimeout>}>();
  private destruction?: Promise<void>;
  private onDestroyed?: () => void;
  private readyTimer?: ReturnType<typeof setTimeout>;
  private rejectReady?: (error:Error)=>void;
  private eventWaiters=new Map<number,{cancel:(error:Error)=>void;finish:(error?:Error)=>unknown}>();
  private refreshAuthorization?:RemoteSource['refreshAuthorization'];
  private audioHeader: Int32Array;
  private readonly audioOnly:boolean;
  private outputChannels: number;
  private requestedOutput: AudioOutput;
  private deviceChannels: number;
  diagnostics?: PlayerDiagnostics;
  private buffering:BufferingPolicy;
  private bufferingSettings:Record<string,string>={};
  browserCodecsAbsent = false;
  properties = new Map<string, unknown>();
  readonly ready: Promise<void>;

  constructor(canvas:HTMLCanvasElement, {providerAssets,prepared,buffering=bufferingPolicy(),disableBrowserCodecs=false,measureOutput=false,mode='software',softwarePresenter='auto',audioOutput='stereo',audioFallback='stereo',resourceLimits={},fonts=[],assetBase=new URL('../../../',import.meta.url),decodeQuality='exact',adaptiveFrameDrop=false,videoTrack,webgpuDecodeIntent}: {providerAssets?:ProviderRuntimeAssets;prepared?:{module?:WebAssembly.Module;font?:ArrayBuffer};buffering?:BufferingPolicy;assetBase?:URL;audioOutput?:AudioOutput;audioFallback?:'stereo'|'reject';resourceLimits?:ResourceLimits;fonts?:FontAsset[];disableBrowserCodecs?:boolean;measureOutput?:boolean;mode?:'hybrid'|'software'|'selective-audio';softwarePresenter?:'auto'|'rgb'|'experimental-yuv';decodeQuality?:DecodeQuality;adaptiveFrameDrop?:boolean;videoTrack?:{codec:string;codecString?:string;webCodecsSupported?:boolean;width?:number;height?:number};webgpuDecodeIntent?:Partial<ExternalDecodeIntent>}={}) {
    super();this.buffering=buffering;this.audioOnly=mode==='selective-audio';
    if(!crossOriginIsolated) throw new Error('This player requires a secure, cross-origin isolated page.');
    this.audioContext = new AudioContext({latencyHint:'interactive'});
    this.requestedOutput=audioOutput;this.deviceChannels=this.audioContext.destination.maxChannelCount;
    const wanted=audioOutput==='auto'?(this.deviceChannels>=8?8:this.deviceChannels>=6?6:2):audioOutput==='7.1'?8:audioOutput==='5.1'?6:2;
    if(wanted>this.deviceChannels&&audioFallback==='reject'){void this.audioContext.close();throw Error('Requested audio layout is unavailable on this output device');}
    this.outputChannels=wanted<=this.deviceChannels?wanted:2;
    try {this.audioContext.destination.channelCount=this.outputChannels;}catch(error){void this.audioContext.close();throw error;}
    this.audioContext.destination.channelCountMode='explicit';
    // A disposable same-origin owner gives the browser a complete worker-tree
    // teardown boundary, including native pthread workers and decoder resources.
    // The presentation may be adopted into a temporary document PiP window.
    // Runtime ownership stays in the module's document across surface moves.
    this.workerOwner=document.createElement('iframe');
    this.workerOwner.hidden=true;this.workerOwner.setAttribute('aria-hidden','true');
    document.body.append(this.workerOwner);
    const owner=this.workerOwner.contentWindow as Window & typeof globalThis;
    try {this.worker = runtimeWorker(new URL(mode==='hybrid'||this.audioOnly?`web/filter-retained-engine-worker.js?mode=retained${this.audioOnly?'&audioOnly=1':''}`:'web/software-full-engine-worker.js',assetBase),{type:'module'},owner.Worker);}
    catch(error){this.workerOwner.remove();void this.audioContext.close();throw error;}
    const audio = new SharedArrayBuffer(64 + 8192 * this.outputChannels * 4 + (this.audioOnly?8192*16:0));
    this.audioHeader = new Int32Array(audio,0,16);
    this.ready = new Promise<void>((resolve,reject) => {
      this.rejectReady=reject;
      const failReady=(error:Error)=>{if(this.lifecycle.phase!=='initializing')return;this.lifecycle=settleWasmInitialization(this.lifecycle,false);this.initializationError=error;reject(error);};
      const timeout=this.readyTimer=setTimeout(()=>failReady(new Error('Player initialization timed out')),60000);
      const workerFailure=(event:ErrorEvent|MessageEvent)=>{
        const failure=claimWasmWorkerFailure(this.lifecycle);this.lifecycle=failure.state;if(!failure.accepted)return;
        event.preventDefault();clearTimeout(timeout);
        const error=new PlayerError('ASSET_LOAD_FAILED','Playback engine worker failed: '+('message' in event?event.message:event.type),null,null,'operation',true);
        if(this.lifecycle.phase==='failed')this.initializationError??=error;reject(error);this.fail(error);
      };
      this.worker.onerror=workerFailure;this.worker.onmessageerror=workerFailure;
      this.worker.onmessage = ({data}) => {
        if((this.destroyed||this.lifecycle.phase==='failed')&&data.type!=='destroyed')return;
        if(data.type==='provider-module') {
          const path=data.path;
          if(!providerAssets||!['web/engine-software-full/player.wasm','web/engine-software-yuv/player.wasm'].includes(path)) {this.worker.postMessage({type:'provider-module',error:'Unexpected provider engine request'});return;}
          void providerAssets.module(path).then(module=>{if(wasmAlive(this.lifecycle))this.worker.postMessage({type:'provider-module',module});},error=>{if(wasmAlive(this.lifecycle))this.worker.postMessage({type:'provider-module',error:String(error)});});
        }
        else if(data.type==='ready') {if(this.lifecycle.phase!=='initializing')return;this.lifecycle=settleWasmInitialization(this.lifecycle,true);clearTimeout(timeout);this.browserCodecsAbsent=data.browserCodecsAbsent;this.sendTiming(true);resolve();}
        else if(data.type==='error') {clearTimeout(timeout);const error=data.assetFailure?new PlayerError('ASSET_LOAD_FAILED',data.message):data.decoderTimeout?new PlayerError('NETWORK_TIMEOUT',data.message,null,null,'operation',true):data.decoderFailure?new PlayerError('DECODE_FAILED',data.message):new Error(data.message);failReady(isPlayerError(error)?error:new PlayerError('ASSET_LOAD_FAILED','Playback engine initialization failed: '+error.message,null,null,'operation',true));this.fail(error,data.id);}
        else if(data.type==='destroyed') {if(this.diagnostics){this.diagnostics.decoderStats=data.decoderStats;if(data.presentation)this.diagnostics.presentation=data.presentation;}const completed=this.onDestroyed;this.onDestroyed=undefined;completed?.();}
        else if(data.type==='refresh'){void this.refreshAuthorization?.(data.resource).then(update=>{if(wasmAlive(this.lifecycle))this.worker.postMessage({type:'refreshed',id:data.id,update});},()=>{if(wasmAlive(this.lifecycle))this.worker.postMessage({type:'refreshed',id:data.id,error:true});});}
        else if(data.type==='output')this.dispatchEvent(new CustomEvent('output',{detail:data.data}));
        else if(data.type==='source')this.dispatchEvent(new CustomEvent('source',{detail:data.info}));
        else if(data.type==='diagnostics') this.diagnostics={...data.data,buffering:{...resolveBuffering(this.buffering,'mpv'),settings:{...this.bufferingSettings,'demuxer-cache-state':this.properties.get('demuxer-cache-state'),'paused-for-cache':this.properties.get('paused-for-cache'),'cache-buffering-state':this.properties.get('cache-buffering-state')}}};
        else if(data.type==='log') this.dispatchEvent(new CustomEvent('log',{detail:data.message}));
        else if(data.type==='event') {
          const event=data.event as PlayerEvent;
          if(event.event==='start-file'){this.lifecycle=observeWasmFile(this.lifecycle,true);}
          this.observeSeekEvent(event);
          if(event.event==='end-file') this.lifecycle=observeWasmFile(this.lifecycle,false);
          if(event.event==='property-change' && event.name==='track-list' && Array.isArray(event.data))
            event.data=event.data.map(track=>({...track,id:String(track.id)}));
          if(event.event==='command-reply' && event.id) {
            this.settleRequest(event.id,event.error?new Error(event.error):undefined,event.result);
          }
          if(event.event==='property-change'&&event.name==='track-list'&&Array.isArray(event.data)){let external=0;event.data=event.data.map(t=>t.external?{...t,'attachment-id':this.attachmentIds[external],'external-index':++external}:t);}
          if(event.event==='property-change' && event.name) this.properties.set(event.name,event.data);
          this.dispatchEvent(new CustomEvent('mpv',{detail:event}));
        }
      };
      void (async()=>{
        const [font]=await Promise.all([
          prepared?.font?Promise.resolve(prepared.font):(async()=>{const response=await fetch(new URL('fixtures/DejaVuSans.ttf',assetBase),{signal:this.loading.signal});if(!response.ok)throw Error('Could not load the bundled subtitle font');return response.arrayBuffer();})(),
          this.audioContext.audioWorklet.addModule(new URL(this.audioOnly?'web/selective-sync-worklet.js':'web/audio-worklet.js',assetBase)),
        ]);
        if(!wasmAlive(this.lifecycle)) throw this.unavailableError();
        this.audioNode=new AudioWorkletNode(this.audioContext,'demuxe-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[this.outputChannels],channelCount:this.outputChannels,channelCountMode:'explicit',processorOptions:{buffer:audio,capacity:8192,channels:this.outputChannels,measureOutput}});
        this.audioNode.port.onmessage=({data})=>{const stamp=this.audioContext.getOutputTimestamp();const wallTime=stamp.performanceTime!==undefined&&stamp.contextTime!==undefined?performance.timeOrigin+stamp.performanceTime+(data.audioFrame/data.sampleRate-stamp.contextTime)*1000:null;this.dispatchEvent(new CustomEvent('output',{detail:{...data,wallTime,stamp}}));};
        this.analyser=this.audioContext.createAnalyser();
        this.audioNode.connect(this.analyser);this.audioNode.connect(this.audioContext.destination);
        if(!wasmAlive(this.lifecycle)) throw this.unavailableError();
        const decodePolicy=resolveDecodePolicy({codec:videoTrack?.codec,codedWidth:videoTrack?.width,codedHeight:videoTrack?.height,displayWidth:canvas.width,displayHeight:canvas.height,decodeQuality,maxDecodePixels:resourceLimits.maxDecodePixels??8294400});
        let decoder:'software'|'webcodecs'|'webgpu'=mode==='hybrid'||this.audioOnly?'webcodecs':'software';
        let selectedDecodeIntent:ExternalDecodeIntent|undefined;
        if(mode==='hybrid'&&videoTrack?.codec){
          // The production registry is empty. Once a codec is qualified, probe
          // WebCodecs first and use the device-local backend only on rejection.
          if(webgpuDecoderSupported(videoTrack.codec)){
            // Only the complete preflight configuration may reject WebCodecs.
            // Missing evidence keeps the existing Hybrid/WebCodecs trial.
            const supported=disableBrowserCodecs?false:videoTrack.webCodecsSupported;
            const selected=selectExternalDecoderConfiguration(videoTrack.codec,supported,webgpuDecodeIntent);
            decoder=selected.backend??'webcodecs';selectedDecodeIntent=selected.decodeIntent;
          }
        }
        const offscreen=canvas.transferControlToOffscreen();
        this.lifecycle=markWasmInitialized(this.lifecycle);
        this.worker.postMessage({type:'init',decoderOutputWatchdog:this.watchdogs.decoderOutput,compiledWasm:prepared?.module,verifiedProviderAssets:!!providerAssets,canvas:offscreen,audio,font,fonts,audioChannels:this.outputChannels,maxDecodePixels:resourceLimits.maxDecodePixels,maxAllocationBytes:resourceLimits.maxAllocationBytes,sampleRate:this.audioContext.sampleRate,disableBrowserCodecs,measureOutput,decoder,softwarePresenter,decoderFaultAfter:0,decodeQuality,decodePolicy,adaptiveFrameDrop,videoTrack,...(selectedDecodeIntent?{webgpuDecodeIntent:selectedDecodeIntent}:{}),displayWidth:canvas.width,displayHeight:canvas.height},[offscreen,font]);
        if(!wasmAlive(this.lifecycle))return;
        const timing=setInterval(()=>this.sendTiming(),20);
        if(wasmAlive(this.lifecycle)){this.timing=timing;this.sendTiming();}else clearInterval(timing);
      })().catch(error=>{clearTimeout(timeout);failReady(new PlayerError('ASSET_LOAD_FAILED','Playback engine initialization failed: '+String(error),null,null,'operation',true));});
    });
  }
  private sendTiming(force=false) {
    if(this.destroyed)return;
    // Fallback latency estimate, explicitly not an independent A/V sync measurement.
    const latency=(this.audioContext.baseLatency||0)+(this.audioContext.outputLatency||0);
    const latencyUs=Math.round(latency*1e6),running=this.audioContext.state==='running';
    if(!force&&this.lastTiming?.latencyUs===latencyUs&&this.lastTiming.running===running)return;
    this.lastTiming={latencyUs,running};
    this.worker.postMessage({type:'timing',latencyUs,running});
  }
  private settleRequest(id:number,error?:Error,result?:unknown,deadline?:number) {
    const settled=settleWasmRequest(this.lifecycle,id,deadline);this.lifecycle=settled.state;
    if(!settled.accepted)return;
    const pending=this.pending.get(id);this.pending.delete(id);
    if(pending){let failure=error;try{clearTimeout(pending.timer);}catch(cause){failure??=cause as Error;}failure?pending.reject(failure):pending.resolve(result);}
  }
  private unavailableError(){return this.initializationError??new Error('Player is destroyed');}
  private fail(error:Error,id?:number,report=true) {
    const rejected=rejectWasmRequests(this.lifecycle,id||undefined);this.lifecycle=rejected.state;
    const pending=rejected.ids.map(key=>this.pending.get(key));for(const key of rejected.ids)this.pending.delete(key);
    for(const entry of pending)if(entry){try{clearTimeout(entry.timer);}catch{}entry.reject(error);}
    if(report)for(const entry of [...this.eventWaiters.values()])entry.cancel(error);
    // Preserve typed terminal failures through the session listener.
    if(report&&!this.destroyed)this.dispatchEvent(new CustomEvent('error',{detail:isPlayerError(error)?error:error.message}));
  }
  private request(message:Record<string,unknown>,transfer:Transferable[]=[]):Promise<any> {
    const admitted=admitWasmRequest(this.lifecycle,performance.now());this.lifecycle=admitted.state;
    if(!admitted.request)return Promise.reject(admitted.reason==='capacity'?new Error('Command queue is full'):this.unavailableError());
    const {id,deadline}=admitted.request;
    return new Promise((resolve,reject)=>{
      const entry:{resolve:(result?:any)=>void;reject:(error:Error)=>void;timer?:ReturnType<typeof setTimeout>}={resolve,reject};
      this.pending.set(id,entry);
      try{
        const arm=()=>{
          if(this.pending.get(id)!==entry)return;
          const timer=setTimeout(()=>{
            const now=performance.now();
            if(now<deadline){try{arm();}catch(error){this.settleRequest(id,error as Error);}return;}
            this.settleRequest(id,new Error('Command timed out'),undefined,now);
          },Math.max(0,deadline-performance.now()));
          if(this.pending.get(id)===entry)entry.timer=timer;else clearTimeout(timer);
        };
        arm();if(this.pending.get(id)!==entry)return;
        this.worker.postMessage({...message,id},transfer);
      }catch(error){this.settleRequest(id,error as Error);}
    });
  }
  private startOpen():number {
    const admitted=beginWasmOpen(this.lifecycle);this.lifecycle=admitted.state;
    if(admitted.id===null)throw admitted.reason==='busy'?new Error('Another open is in progress'):this.unavailableError();
    return admitted.id;
  }
  private assertOpen(id:number){if(!ownsWasmOpen(this.lifecycle,id))throw this.unavailableError();}
  async open(file:File|ArrayBuffer, options:MediaInputOptions={}):Promise<void> {
    const id=this.startOpen();
    try {await this.openLocal(file,options,id);} finally {this.lifecycle=finishWasmOpen(this.lifecycle,id);}
  }
  async openRemote(source:RemoteSource):Promise<void>{
    const id=this.startOpen();
    try{
      await this.ready;this.assertOpen(id);
      if(this.lifecycle.hasFile)await this.withEvent(e=>e.event==='end-file',()=>this.command('stop'));
      else await this.command('stop');
      this.assertOpen(id);await this.configureBuffering(true);this.assertOpen(id);
      if(source.demuxer&&!/^[a-z0-9_]{1,64}$/.test(source.demuxer))throw Error('Invalid demuxer hint');
      await this.command('set','demuxer-lavf-format',source.demuxer??'');
      this.assertOpen(id);const {refreshAuthorization,...options}=source;this.refreshAuthorization=refreshAuthorization;
      await this.withEvent(e=>e.event==='file-loaded'||(e.event==='end-file'&&e.reason==='error'?new Error(String(e.file_error)):false),()=>this.request({type:'open-remote',options,canRefresh:!!refreshAuthorization}));this.assertOpen(id);
    }finally{this.lifecycle=finishWasmOpen(this.lifecycle,id);}
  }
  private waitForEvent(predicate:(event:PlayerEvent)=>boolean|Error,capture?:(cancel:(error:Error)=>void)=>void):Promise<void> {
    const admitted=admitWasmWaiter(this.lifecycle,performance.now());this.lifecycle=admitted.state;
    if(!admitted.waiter)return Promise.reject(this.unavailableError());
    const {id,deadline}=admitted.waiter;
    return new Promise<void>((resolve,reject)=>{
      let timeout:ReturnType<typeof setTimeout>|undefined;
      const finish=(error?:Error)=>{
        let failure:unknown;
        try{clearTimeout(timeout);}catch(error){failure=error;}
        try{this.removeEventListener('mpv',listener);}catch(error){failure??=error;}
        error||failure?reject(error??failure):resolve();return failure;
      };
      const settle=(error?:Error,now?:number)=>{const next=settleWasmWaiter(this.lifecycle,id,now);this.lifecycle=next.state;if(!next.accepted)return;this.eventWaiters.delete(id);finish(error);};
      const cancel=(error:Error)=>settle(error);
      const listener=(event:Event)=>{if(!this.eventWaiters.has(id))return;try{const result=predicate((event as CustomEvent<PlayerEvent>).detail);if(result)settle(result instanceof Error?result:undefined);}catch(error){settle(error as Error);}};
      const entry={cancel,finish};this.eventWaiters.set(id,entry);capture?.(cancel);
      try{
        this.addEventListener('mpv',listener);
        if(this.eventWaiters.get(id)!==entry)return;
        const arm=()=>{
          if(this.eventWaiters.get(id)!==entry)return;
          const timer=setTimeout(()=>{
            const now=performance.now();
            if(now<deadline){try{arm();}catch(error){settle(error as Error);}return;}
            settle(new Error('Media operation timed out'),now);
          },Math.max(0,deadline-performance.now()));
          if(this.eventWaiters.get(id)===entry)timeout=timer;else clearTimeout(timer);
        };
        arm();
      }catch(error){settle(error as Error);}
    });
  }
  private async withEvent(predicate:(event:PlayerEvent)=>boolean|Error,work:()=>Promise<unknown>):Promise<void> {
    let cancel:((error:Error)=>void)|undefined;
    const observed=this.waitForEvent(predicate,value=>{cancel=value;});void observed.catch(()=>{});
    try{if(!wasmAlive(this.lifecycle))throw this.unavailableError();await Promise.all([observed,work()]);}
    catch(error){cancel?.(error as Error);throw error;}
  }
  private async openLocal(file:File|ArrayBuffer, options:MediaInputOptions,id:number):Promise<void> {
    await this.ready;this.assertOpen(id);
    const size=file instanceof File?file.size:file.byteLength;
    if(!(file instanceof File)&&size>32*1024*1024) throw new Error('ArrayBuffer sources are limited to 32 MiB');
    if(this.lifecycle.hasFile) await this.withEvent(event=>event.event==='end-file',()=>this.command('stop'));
    else await this.command('stop');
    this.assertOpen(id);await this.configureBuffering(true);this.assertOpen(id);
    const suffix=file instanceof File?file.name.split('.').at(-1)?.toLowerCase():undefined;
    const demuxer=options.demuxer??(suffix==='sbc'||suffix==='msbc'?'sbc':'');
    if(demuxer&&!/^[a-z0-9_]{1,64}$/.test(demuxer))throw Error('Invalid demuxer hint');
    await this.command('set','demuxer-lavf-format',demuxer);
    this.assertOpen(id);
    await this.withEvent(event=>event.event==='file-loaded'||(event.event==='end-file'&&event.reason==='error'?new Error(String(event.file_error)):false),()=>{
      if(file instanceof File)return this.request({type:'open-file',file});
      const bytes=file.slice(0);return this.request({type:'open',bytes},[bytes]);
    });this.assertOpen(id);
  }
  waitForPreviewPresentation():Promise<void> {return this.waitForEvent(event=>event.event==='playback-restart'||(event.event==='end-file'?new Error('No preview video frame'):false));}
  /** Presentation and observed metadata arrive independently from the worker. */
  async waitForPreviewMetadata():Promise<void> {
    if(this.destroyed)throw new Error('Player destroyed');
    const ready=()=>{
      const tracks=this.properties.get('track-list');
      if(!Array.isArray(tracks)||!tracks.length)return false;
      if(!tracks.some(track=>track.type==='video'))return true;
      const params=this.properties.get('video-params') as {w?:number;h?:number;dw?:number;dh?:number}|undefined;
      const width=params?.dw??params?.w,height=params?.dh??params?.h;
      return typeof width==='number'&&Number.isFinite(width)&&width>0&&typeof height==='number'&&Number.isFinite(height)&&height>0;
    };
    if(ready())return;
    await this.waitForEvent(event=>event.event==='end-file'?new Error('No preview video metadata'):
      event.event==='property-change'&&(event.name==='track-list'||event.name==='video-params')&&ready());
  }
  /** Snapshot only this private software surface after a completed presentation. */
  async previewSnapshot():Promise<{blob:Blob;time:number;width:number;height:number}> {
    await this.ready;return this.request({type:'preview-snapshot'});
  }
  async inspectMetadata() {
    const expand=async(expression:string)=>String(await this.request({type:'command',args:['expand-text',expression]}));
    const metadataDeadline=performance.now()+1500;
    const countText=await expand('${chapter-list/count:}'),count=Number(countText);
    if(countText&&Number.isInteger(count)&&count>=0&&count<=256){
      const chapters=[];
      for(let i=0;i<count&&performance.now()<metadataDeadline;i++){
        const time=Number(await expand('${=chapter-list/'+i+'/time:}'));
        const title=(await expand('${chapter-list/'+i+'/title:}')).slice(0,4096);
        if(Number.isFinite(time))chapters.push({time:Math.max(0,time),title,index:i});
      }
      this.properties.set('chapter-list',chapters);this.properties.set('chapter-coverage',chapters.length===count?'complete':'partial');
    }
    const tags:Record<string,string>={};
    const tagCountText=await expand('${metadata/list/count:}'),tagCount=Number(tagCountText);
    if(tagCountText&&Number.isInteger(tagCount)&&tagCount>=0){
      let visited=0;
      for(;visited<Math.min(tagCount,128)&&performance.now()<metadataDeadline;visited++){
        const key=(await expand('${metadata/list/'+visited+'/key:}')).slice(0,256),value=(await expand('${metadata/list/'+visited+'/value:}')).slice(0,4096);if(key)tags[key]=value;
      }
      this.properties.set('metadata',tags);this.properties.set('tag-coverage',visited===tagCount?'complete':'partial');
    }

    const value=await this.request({type:'command',args:['expand-text','${seekable}']});
    if(value==='yes'||value==='no')this.properties.set('seekable',value==='yes');
    if(!Array.isArray(this.properties.get('track-list'))||!(this.properties.get('track-list') as unknown[]).length)
      await this.waitForEvent(event=>event.event==='property-change'&&event.name==='track-list'&&Array.isArray(event.data)&&event.data.length>0);
  }
  async command(...args:string[]):Promise<void> {await this.ready;return this.request({type:'command',args});}
  /** Restricted internal handoff for the Native video + mpv audio plan. */
  selectiveAudioState():{header:Int32Array;context:AudioContext;gain:GainNode} {
    if(!this.audioOnly||!this.audioNode||this.destroyed)throw Error('Selective audio service is unavailable');
    if(!this.selectiveGain){
      const gain=this.audioContext.createGain();gain.gain.value=0;
      this.audioNode.disconnect(this.audioContext.destination);
      this.audioNode.connect(gain);gain.connect(this.audioContext.destination);
      this.selectiveGain=gain;
    }
    return {header:this.audioHeader,context:this.audioContext,gain:this.selectiveGain};
  }
  private async setPause(paused:boolean) {
    if(this.properties.get('pause')===paused){await this.command('set','pause',paused?'yes':'no');return;}
    await this.withEvent(e=>e.event==='property-change'&&e.name==='pause'&&e.data===paused,()=>this.command('set','pause',paused?'yes':'no'));
  }
  async setBuffering(policy:BufferingPolicy){
    const settings={...mpvBufferingOptions(policy,this.properties.get('pause')!==false),'cache-secs':policy.preload==='auto'||this.properties.get('pause')===false?'3600000':'1'};
    for(const [key,value] of Object.entries(settings)){await this.command('set',key,value);this.bufferingSettings[key]=value;}
    this.buffering=policy;
  }
  get bufferingDiagnostics(){return {...resolveBuffering(this.buffering,'mpv'),settings:{...this.bufferingSettings,'demuxer-cache-state':this.properties.get('demuxer-cache-state'),'paused-for-cache':this.properties.get('paused-for-cache'),'cache-buffering-state':this.properties.get('cache-buffering-state')}};}
  private async configureBuffering(preparing:boolean) {
    for(const [key,value] of Object.entries(mpvBufferingOptions(this.buffering,preparing))){await this.command('set',key,value);this.bufferingSettings[key]=value;}
  }
  async play() {
    const resume=this.audioContext.resume();void resume.catch(()=>{});
    if(this.audioContext.state==='suspended' && !navigator.userActivation?.isActive) throw new DOMException('Playback needs a user gesture','NotAllowedError');
    await resume;this.sendTiming();
    if(this.buffering.preload!=='auto')await this.configureBuffering(false);
    await this.setPause(false);
  }
  pause() {return this.setPause(true);}
  seek(seconds:number) {
    const admitted=beginWasmPlayerSeek(this.lifecycle,seconds);if(admitted.reason==='invalid')throw new Error('Invalid seek time');
    if(admitted.reason)return Promise.reject(this.unavailableError());
    this.lifecycle=admitted.state;Atomics.store(this.audioHeader,2,0);return this.ready.then(()=>this.request({type:'seek',seconds}));
  }
  rate(rate:number){if(!Number.isFinite(rate)||rate<0.5||rate>2)throw new Error('Playback rate must be 0.5 to 2');return this.command('set','speed',String(rate));}
  async volume(percent:number) {
    if(!Number.isFinite(percent)||percent<0||percent>100) throw new Error('Invalid volume');
    await this.command('set','volume',String(percent));
    this.volumeValue=percent;
    // mpv may have queued PCM before acknowledging mute. Silence that output
    // at the browser graph too, without applying normal volume twice.
    this.gainNode?.gain.setValueAtTime(percent===0?0:this.gainValue,this.audioContext.currentTime);
  }
  async gain(value:number) {
    if(!Number.isFinite(value)||value<0||value>1)throw new Error('Gain must be between 0 and 1');
    await this.ready;
    if(this.destroyed)throw new Error('Player is destroyed');
    if(!this.gainNode&&value!==1){
      const gain=this.audioContext.createGain();
      gain.channelCount=this.outputChannels;gain.channelCountMode='explicit';gain.channelInterpretation='discrete';
      gain.gain.setValueAtTime(this.volumeValue===0?0:value,this.audioContext.currentTime);
      this.audioNode!.disconnect();
      this.audioNode!.connect(gain);gain.connect(this.audioContext.destination);gain.connect(this.analyser!);
      this.gainNode=gain;
    }
    this.gainNode?.gain.setValueAtTime(this.volumeValue===0?0:value,this.audioContext.currentTime);
    this.gainValue=value;
  }
  selectTrack(type:'audio'|'sub',id:string) {
    if(!['audio','sub'].includes(type)||!/^(?:[1-9][0-9]*|auto|no)$/.test(id)) throw new Error('Invalid track selection');
    return this.command('set',type==='audio'?'aid':'sid',id);
  }
  private observeSeekEvent(event:PlayerEvent){
    if(event.event==='playback-restart'){
      const cache=this.properties.get('demuxer-cache-state') as {eof?:boolean;idle?:boolean}|undefined;
      this.lifecycle=observeWasmPlayerSeek(this.lifecycle,{kind:'restart',eof:cache?.eof===true&&cache?.idle===true});
    }else if(event.event==='property-change'&&event.name==='demuxer-cache-state'){
      const cache=event.data as {eof?:boolean;idle?:boolean}|undefined;
      this.lifecycle=observeWasmPlayerSeek(this.lifecycle,{kind:'cache',eof:cache?.eof===true&&cache?.idle===true});
    }else if(event.event==='property-change'&&event.name==='time-pos'&&typeof event.data==='number')this.lifecycle=observeWasmPlayerSeek(this.lifecycle,{kind:'position',position:event.data});
  }
  async confirmSeek(target:number):Promise<boolean> {
    const seek=this.lifecycle.seek.seek;if(!seek||seek.target!==target)return true;
    // Query after presentation; observed frame delivery may precede native clamping.
    const value=String(await this.command('expand-text','${=time-pos}|${seeking}'));
    const [time,seeking]=value.split('|'),decision=confirmWasmPlayerSeek(this.lifecycle,seek.id,target,Number(time),seeking==='no');
    this.lifecycle=decision.state;return decision.confirmed;
  }
  seekBoundary(target:number):number|undefined {return wasmSeekBoundary(this.lifecycle.seek,target);}
  private attachmentIds:Array<string|undefined>=[];
  async addSubtitle(subtitle:SubtitleAsset){
    this.attachmentIds.push(subtitle.attachmentId);
    await this.ready;const bytes=subtitle.bytes.slice(0);
    const previous=((this.properties.get('track-list')??[]) as Array<{external?:boolean}>).filter(t=>t.external).length;
    // Command acceptance can precede the track-list event. Selection must wait
    // for the new source-scoped external identity to become observable.
    await this.withEvent(e=>e.event==='property-change'&&e.name==='track-list'&&Array.isArray(e.data)&&e.data.filter(t=>t.external).length>previous,()=>this.request({type:'subtitle',...subtitle,bytes},[bytes]));
  }
  async setAudioOutputDevice(id:string){
    await this.ready;const context=this.audioContext as AudioContext&{setSinkId?:(id:string)=>Promise<void>};
    if(!context.setSinkId)throw new PlayerError('UNSUPPORTED_FEATURE','AudioContext output selection is unavailable');await context.setSinkId(id==='default'?'':id);
  }
  subtitleVisible(visible:boolean) {return this.command('set','sub-visibility',visible?'yes':'no');}
  resize(width:number,height:number) {if(this.destroyed) throw new Error('Player is destroyed');if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1920||height>1080) throw new Error('Invalid output dimensions');this.worker.postMessage({type:'resize',width,height});}
  startupEvidence() {
    // Read existing producer/consumer counters; no analyser or frame readback.
    const audioDecoderConfigured=!!this.properties.get('audio-codec-name');
    const audioDecoded=(Atomics.load(this.audioHeader,0)>>>0)>0;
    const audioProgress=(Atomics.load(this.audioHeader,5)>>>0)>0;
    const tracks=this.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined;
    const videoPresented=!!tracks?.some(t=>t.type==='video'&&t.selected)&&!!this.diagnostics?.rendered&&(this.diagnostics.presentation?.position!==undefined||this.diagnostics.presentedPosition!==undefined);
    const stats=this.diagnostics?.decoderStats;
    return {metadata:!!this.properties.get('track-list'),audioDecoderConfigured,audioDecoded,audioProgress,videoPresented,
      decoderOutput:videoPresented||audioDecoded,
      ...(stats?.supportCheck?{apiHint:JSON.stringify(stats.supportCheck)}:{})};
  }
  audioDiagnostics() {
    const samples=new Float32Array(this.analyser?.fftSize||2048);
    this.analyser?.getFloatTimeDomainData(samples);
    return {gain:this.gainValue,gainStage:this.gainNode?'web-audio':'none',requestedOutput:this.requestedOutput,outputChannels:this.outputChannels,deviceChannels:this.deviceChannels,channelLayout:this.outputChannels===8?'7.1':this.outputChannels===6?'5.1':'stereo',state:this.audioContext.state,sampleRate:this.audioContext.sampleRate,mediaFrames:Atomics.load(this.audioHeader,5),underruns:Atomics.load(this.audioHeader,6),rms:Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length),latencyConfidence:'reported-latency estimate'};
  }
  destroy():Promise<void> {
    if(this.destruction)return this.destruction;
    const retirement=retireWasmLifecycle(this.lifecycle);this.lifecycle=retirement.state;
    let resolve!:()=>void,reject!:(error:unknown)=>void;
    const result=this.destruction=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    // Install retirement and its joinable promise before invoking any host cleanup.
    const error=new Error('Player destroyed'),pending=retirement.requests.map(id=>this.pending.get(id));
    for(const id of retirement.requests)this.pending.delete(id);
    const waiters=retirement.waiters.map(id=>this.eventWaiters.get(id));
    for(const id of retirement.waiters)this.eventWaiters.delete(id);
    let failure:unknown,failed=false;
    const cleanup=(work:()=>void)=>{try{work();}catch(error){if(!failed){failed=true;failure=error;}}};
    cleanup(()=>this.loading.abort());this.refreshAuthorization=undefined;
    cleanup(()=>clearTimeout(this.readyTimer));cleanup(()=>this.rejectReady?.(error));
    for(const entry of pending)if(entry){cleanup(()=>clearTimeout(entry.timer));entry.reject(error);}
    for(const entry of waiters)if(entry)cleanup(()=>{const failure=entry.finish(error);if(failure)throw failure;});
    cleanup(()=>clearInterval(this.timing));this.timing=undefined;
    cleanup(()=>Atomics.store(this.audioHeader,2,0));
    cleanup(()=>this.audioNode?.port.postMessage('close'));cleanup(()=>this.audioNode?.disconnect());
    cleanup(()=>this.audioNode?.port.close());cleanup(()=>this.analyser?.disconnect());cleanup(()=>this.gainNode?.disconnect());
    void (async()=>{
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try{
        await new Promise<void>((done,no)=>{
          this.onDestroyed=done;
          timeout=setTimeout(()=>no(new Error('Native cleanup timed out; worker containment applied')),10000);
          this.worker.postMessage({type:'destroy'});
        });
      }catch(error){if(!failed){failed=true;failure=error;}}
      finally{
        this.onDestroyed=undefined;cleanup(()=>clearTimeout(timeout));
        cleanup(()=>this.worker.terminate());cleanup(()=>this.workerOwner.remove());
        try{await this.audioContext.close();}catch(error){if(!failed){failed=true;failure=error;}}
        this.lifecycle=finishWasmRetirement(this.lifecycle);
      }
      if(failed)throw failure;
    })().then(resolve,reject);
    return result;
  }
}
