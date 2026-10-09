// SPDX-License-Identifier: Apache-2.0
import {independentPreviewSession,previewBuffering,type PreviewSessionOptions,type PreviewSession} from './preview-session.js';
import type {Backend} from './backend.js';
import type {RemoteSource, MediaInputOptions, TrackType, ResourceLimits, FontAsset, SubtitleAsset, AudioOutput, BufferingPolicy} from '../types.js';
import type {ProviderRuntimeAssets} from './provider-runtime.js';
import type {DecodeQuality} from './decode-policy.js';
import {bufferingPolicy,mpvBufferingOptions,resolveBuffering} from './buffering.js';
import {runtimeWorker} from './runtime-worker.js';
import {PlayerError, playerError} from './errors.js';
import {beginPrivateOutputWait,observePrivateOutputWait,finishPrivateOutputWait,initialPrivateSoftware,privateSoftwareSourceCurrent,privateSoftwareLoadCurrent,beginPrivateSoftwareLoad,startPrivateSoftwareLoad,finishPrivateSoftwareLoad,privateSoftwareControlCurrent,beginPrivateSoftwareControl,startPrivateSoftwareControl,finishPrivateSoftwareControl,acceptPrivateSoftwarePicture,privateSoftwareEvidence,privateSoftwareReady,acceptPrivateSoftwareOutput,privateSoftwareWait,beginPrivateSoftwareAttachment,removePrivateSoftwareAttachment,acceptPrivateSoftwareSettings,retirePrivateSoftware,privateSoftwareAudioLayout,type PrivateSoftwareControl,type PrivateSoftwareFacts} from './machine/private-software.js';
import {createBackendRequests,admitBackendRequest,settleBackendRequest,failBackendRequests,beginBackendClose,finishBackendClose} from './machine/backend-requests.js';

/** Experimental finite Software Backend. Public admission has its own gates. */
export class PrivateSoftwarePlayer extends EventTarget implements Backend {
  readonly properties = new Map<string, unknown>();
  readonly ready:Promise<void>;
  readonly planId:string;
  diagnostics?:Record<string, any>;
  private worker:Worker;
  private context:AudioContext;
  private node?:AudioWorkletNode;
  private gainNode?:GainNode;
  private analyser?:AnalyserNode;
  private loading = new AbortController();
  private pending = new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void;timer?:ReturnType<typeof setTimeout>}>();
  private requests=createBackendRequests('software');
  private policy=initialPrivateSoftware();
  private get generation(){return this.policy.generation;}
  private get closing(){return this.requests.phase!=='active';}
  private destruction?:Promise<void>;
  private failure?:Error;
  private get failed(){return this.requests.failed?this.failure:undefined;}
  private refresh?:RemoteSource['refreshAuthorization'];
  private get userPaused(){return this.policy.userPaused;}
  private get gainValue(){return this.policy.gain;}
  private get outputVerified(){return this.policy.outputVerified;}
  private outputChannels:2|6|8;
  private deviceChannels:number;
  private requestedOutput:AudioOutput;
  private get attachmentIds(){return this.policy.attachments.map(item=>item.attachmentId);}
  private get presentedDraws(){return this.policy.presentedDraws;}
  private presentation?:CanvasRenderingContext2D;
  createPreviewSession(options:PreviewSessionOptions):PreviewSession {
    const canvas=options.document.createElement('canvas');canvas.width=160;canvas.height=90;
    const child=new PrivateSoftwarePlayer(canvas,{runtime:this.options.runtime,mode:this.options.mode,providerAssets:this.options.providerAssets,assetBase:this.options.assetBase,resourceLimits:this.options.resourceLimits,videoTrack:this.options.videoTrack,buffering:previewBuffering()});
    return independentPreviewSession(child,canvas,`${this.options.mode??'software'}-${this.options.runtime}`,{...options,sourceDimensions:this.options.videoTrack});
  }
  constructor(canvas:HTMLCanvasElement, private options:{prefetchedWasm?:()=>Promise<ArrayBuffer|undefined>|undefined;providerAssets?:ProviderRuntimeAssets;runtime:'jspi'|'asyncify';mode?:'software'|'hybrid';channels?:2|6|8;audioOutput?:AudioOutput;audioFallback?:'stereo'|'reject';buffering?:BufferingPolicy;decodeQuality?:DecodeQuality;adaptiveFrameDrop?:boolean;videoTrack?:{codec:string;width?:number;height?:number};assetBase:URL;duration?:number;resourceLimits?:ResourceLimits;fonts?:FontAsset[]}) {
    super();this.policy=initialPrivateSoftware(options.buffering);
    this.planId=options.mode==='hybrid'?'hybrid-private':'software-private';
    if(typeof AudioContext==='undefined'||typeof OffscreenCanvas==='undefined')throw new PlayerError('UNSUPPORTED_FEATURE','Private Software requires Web Audio and OffscreenCanvas');
    this.context = new AudioContext({sampleRate:48000,latencyHint:'interactive'});
    this.requestedOutput=options.audioOutput??(options.channels===8?'7.1':options.channels===6?'5.1':'stereo');
    this.deviceChannels=this.context.destination.maxChannelCount;
    const layout=privateSoftwareAudioLayout(this.requestedOutput,this.deviceChannels,options.audioFallback==='reject');
    if(layout.reject){void this.context.close();throw new PlayerError('UNSUPPORTED_FEATURE','Requested audio layout is unavailable on this output device');}
    this.outputChannels=layout.channels;
    // Preserve an already-correct layout: some WebKit ports reject a redundant
    // stereo assignment while reporting maxChannelCount=0.
    try{if(this.context.destination.channelCount!==this.outputChannels)this.context.destination.channelCount=this.outputChannels;this.context.destination.channelCountMode='explicit';}
    catch(error){void this.context.close();throw error;}
    try {this.worker = runtimeWorker(new URL('web/private-mpv/playback-worker.js',options.assetBase),{type:'module'},Worker,new URL('web/generated/internal/runtime-worker.js',options.assetBase));}
    catch(error){void this.context.close();throw error;}
    this.worker.onmessage = ({data}) => this.receive(data);
    this.worker.onerror = event => {event.preventDefault();this.fail(new PlayerError('ASSET_LOAD_FAILED','Private Software worker failed: '+event.message));};
    this.worker.onmessageerror = () => this.fail(new PlayerError('ASSET_LOAD_FAILED','Private Software worker message failure'));
    this.context.onstatechange = () => {if(!this.closing)void this.ready.then(()=>this.syncContext()).catch(error=>this.fail(error));};
    this.ready = this.initialize(canvas);
    void this.ready.catch(error=>{if(!this.closing)this.fail(error);});
  }
  private emit(type:string,detail:unknown){this.dispatchEvent(new CustomEvent(type,{detail}));}
  private async initialize(canvas:HTMLCanvasElement){
    const presentation=canvas.getContext('2d');
    if(!presentation)throw new PlayerError('UNSUPPORTED_FEATURE','Private Software canvas presentation unavailable');
    this.presentation=presentation;
    await this.context.audioWorklet.addModule(new URL('web/private-mpv/audio-worklet.js',this.options.assetBase).href);
    if(this.closing)throw new PlayerError('ABORTED','Private Software closed during initialization');
    this.node = new AudioWorkletNode(this.context,'demuxe-private-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[this.outputChannels],channelCount:this.outputChannels,channelCountMode:'explicit'});
    this.gainNode = this.context.createGain();this.analyser = this.context.createAnalyser();
    this.node.connect(this.gainNode);this.gainNode.connect(this.context.destination);this.gainNode.connect(this.analyser);
    this.node.port.onmessage = ({data}) => {if(data.type==='error')this.fail(new Error(data.error));};
    const provider=this.options.providerAssets;
    const assetPath=`web/engine-mpv-playback-${this.options.runtime}/`;
    const prefetchedWasm=await this.options.prefetchedWasm?.();
    let playbackAssets:Record<string,ArrayBuffer>|undefined=provider?Object.fromEntries(await Promise.all(['manifest.json','player.wasm','player.mjs'].map(async name=>[name,await provider.bytes(assetPath+name)] as const))):undefined;
    if(!provider&&prefetchedWasm){
      playbackAssets={'player.wasm':prefetchedWasm};
      for(const name of ['manifest.json','player.mjs']){
        const response=await fetch(new URL(assetPath+name,this.options.assetBase),{signal:this.loading.signal});
        if(!response.ok)throw new PlayerError('ASSET_LOAD_FAILED','Private Software asset HTTP '+response.status);
        playbackAssets[name]=await response.arrayBuffer();
      }
    }
    let font:ArrayBuffer;
    if(provider)font=await provider.bytes('fixtures/DejaVuSans.ttf');
    else{
      const response = await fetch(new URL('fixtures/DejaVuSans.ttf',this.options.assetBase),{signal:this.loading.signal});
      if(!response.ok)throw new PlayerError('ASSET_LOAD_FAILED','Private Software font HTTP '+response.status);
      font=await response.arrayBuffer();
    }
    if(font.byteLength>8*1024*1024)throw new PlayerError('ASSET_LOAD_FAILED','Private Software font byte limit');
    if(this.closing)throw new PlayerError('ABORTED','Private Software closed during asset acquisition');
    const channel = new MessageChannel();this.node.port.postMessage({type:'connect',port:channel.port1},[channel.port1]);
    const offscreen = new OffscreenCanvas(canvas.width,canvas.height);
    const fonts=(this.options.fonts??[]).map(font=>({...font,bytes:font.bytes.slice(0)}));
    await this.request('init',{runtime:this.options.runtime,mode:this.options.mode??'software',channels:this.outputChannels,playbackAssets,canvas:offscreen,port:channel.port2,font,fonts,width:canvas.width,height:canvas.height,
      contextRunning:this.context.state==='running',latencyUs:this.latency(),decodeQuality:this.options.decodeQuality,adaptiveFrameDrop:this.options.adaptiveFrameDrop,videoTrack:this.options.videoTrack,...this.options.resourceLimits},[offscreen,channel.port2,font,...fonts.map(font=>font.bytes),...Object.values(playbackAssets??{})]);
  }
  private latency(){return Math.round((this.context.baseLatency+(this.context.outputLatency||0))*1e6);}
  private request(op:string,data:Record<string,unknown>={},transfer:Transferable[]=[]):Promise<any>{
    const admission=admitBackendRequest(this.requests,op,performance.now());this.requests=admission.state;
    if(admission.effect.kind==='reject')return Promise.reject(admission.effect.reason==='failed'?this.failure!:new PlayerError('ABORTED',admission.effect.reason==='capacity'?'Private Software command queue limit':'Private Software closed'));
    const {id,deadline}=admission.effect.request;
    return new Promise((resolve,reject)=>{
      const pending:{resolve:(value:any)=>void;reject:(error:Error)=>void;timer?:ReturnType<typeof setTimeout>}={resolve,reject};this.pending.set(id,pending);
      const expire=()=>{
        const settled=settleBackendRequest(this.requests,id,{kind:'deadline',now:performance.now()});this.requests=settled.state;
        if(settled.effect.kind==='ignore'){if(this.pending.get(id)===pending)pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));return;}
        this.pending.delete(id);reject(new Error('Private Software '+op+' deadline'));
      };
      try{pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));this.worker.postMessage({id,op,...data},transfer);}
      catch(error){const settled=settleBackendRequest(this.requests,id,{kind:'transport-error'});this.requests=settled.state;if(settled.effect.kind==='settle'){clearTimeout(pending.timer);this.pending.delete(id);reject(playerError(error));}}
    });
  }
  private receive(data:any){
    if(data.type==='picture'){
      const generation=data.generation;
      try{
        const presentation=this.presentation;
        if(privateSoftwareSourceCurrent(this.policy,generation)&&presentation){
          const canvas=presentation.canvas,width=data.bitmap.width,height=data.bitmap.height;
          if(!privateSoftwareSourceCurrent(this.policy,generation))return;
          if(canvas.width!==width||canvas.height!==height){canvas.width=width;if(!privateSoftwareSourceCurrent(this.policy,generation))return;canvas.height=height;}
          if(!privateSoftwareSourceCurrent(this.policy,generation))return;
          presentation.drawImage(data.bitmap,0,0);this.policy=acceptPrivateSoftwarePicture(this.policy,generation,data.rendered);
        }
      }catch(error){if(privateSoftwareSourceCurrent(this.policy,generation))this.fail(playerError(error));}
      finally{try{data.bitmap.close();}catch(error){if(privateSoftwareSourceCurrent(this.policy,generation))this.fail(playerError(error));}if(!this.closing)this.worker.postMessage({op:'picture-presented',pictureId:data.pictureId});}
      return;
    }
    if(data.id!==undefined){const settled=settleBackendRequest(this.requests,data.id,{kind:'reply'});this.requests=settled.state;const pending=this.pending.get(data.id);if(settled.effect.kind==='settle'&&pending){clearTimeout(pending.timer);this.pending.delete(data.id);data.error?pending.reject(data.code==='ASSET_LOAD_FAILED'?new PlayerError('ASSET_LOAD_FAILED',data.error):playerError(new Error(data.error))):pending.resolve(data.result);}return;}
    if(data.type==='fatal'){this.diagnostics={...this.diagnostics,cleanup:data.cleanup,cleanupError:data.cleanupError};this.fail(playerError(new Error(data.error)));return;}
    if(data.type==='refresh'){
      if(this.closing)return;
      if(!privateSoftwareSourceCurrent(this.policy,data.generation)){this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,error:'Authorization source replaced'});return;}
      const refresh=this.refresh,generation=data.generation;
      void Promise.resolve().then(()=>{this.assertSource(generation);if(!refresh)throw Error('Authorization refresh unavailable');return refresh(data.resource);}).then(update=>{
        if(privateSoftwareSourceCurrent(this.policy,generation))this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,update});
      },error=>{if(privateSoftwareSourceCurrent(this.policy,generation))this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,error:String(error)});});return;
    }
    if(this.closing||data.generation!==this.generation)return;
    if(data.type==='diagnostics'){this.diagnostics={...data.data,buffering:resolveBuffering(this.policy.buffering??bufferingPolicy(),'mpv')};this.emit('diagnostics',this.diagnostics);}
    if(data.type==='output'){this.emit('output',data);}
    if(data.type==='event'){
      const event=data.event;
      if(event.event==='property-change'&&event.name==='track-list'&&Array.isArray(event.data)){
        let external=0;event.data=event.data.map((track:any)=>track.type==='sub'&&track.external?{...track,'attachment-id':this.attachmentIds[external++]}:track);
      }
      if(event.event==='property-change')this.properties.set(event.name,event.data);
      if(event.event==='log-message')this.emit('log',event.prefix+': '+event.text);
      if(privateSoftwareSourceCurrent(this.policy,data.generation))this.emit('mpv',event);
    }
  }
  private fail(error:Error){
    const failed=failBackendRequests(this.requests);this.requests=failed.state;if(!failed.notify)return;this.failure=error;
    for(const id of failed.reject){const pending=this.pending.get(id);if(pending){clearTimeout(pending.timer);this.pending.delete(id);pending.reject(error);}}
    this.emit('error',error);void this.destroy().catch(()=>{});
  }
  private assertSource(generation:number){if(!privateSoftwareSourceCurrent(this.policy,generation))throw this.failed??new PlayerError('ABORTED',this.closing?'Private Software closed':'Source load replaced');}
  private assertControl(control:PrivateSoftwareControl){if(!privateSoftwareControlCurrent(this.policy,control))throw this.failed??new PlayerError('ABORTED','Private Software control retired');}
  private beginControl(kind:PrivateSoftwareControl['kind']){const decision=beginPrivateSoftwareControl(this.policy,kind);this.policy=decision.state;if(!decision.control)throw new PlayerError('ABORTED','Private Software closed');return decision.control;}
  private facts():PrivateSoftwareFacts{
    const tracks=this.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined,header=this.diagnostics?.audio?.header??[];
    return {tracksKnown:!!tracks,trackCount:tracks?.length??0,video:!!tracks?.some(track=>track.type==='video'&&track.selected),audio:!!tracks?.some(track=>track.type==='audio'&&track.selected),audioCodec:!!this.properties.get('audio-codec-name'),audioWritten:header[0]??0,audioConsumed:header[1]??0,seeking:!!this.diagnostics?.seeking,rendered:Number(this.diagnostics?.rendered),position:Number(this.diagnostics?.presentedPosition)};
  }
  private async waitUntil(predicate:()=>boolean,signal?:AbortSignal,generation=this.generation){
    const admission=beginPrivateOutputWait(this.policy,generation,performance.now());this.policy=admission.state;
    if(admission.id===null)throw new PlayerError('ABORTED','Private Software wait unavailable');
    const id=admission.id;
    try{for(;;){
      this.assertSource(generation);signal?.throwIfAborted();if(this.failed)throw this.failed;
      let result=observePrivateOutputWait(this.policy,id,performance.now(),false);this.policy=result.state;
      if(result.outcome==='timeout')throw new PlayerError('PLAYBACK_STALLED','Private Software output deadline');
      if(result.outcome==='retired')throw new PlayerError('ABORTED','Private Software wait retired');
      const ready=predicate();this.assertSource(generation);signal?.throwIfAborted();
      result=observePrivateOutputWait(this.policy,id,performance.now(),ready);this.policy=result.state;
      if(result.outcome==='ready')return;
      if(result.outcome==='timeout')throw new PlayerError('PLAYBACK_STALLED','Private Software output deadline');
      if(result.outcome==='retired')throw new PlayerError('ABORTED','Private Software wait retired');
      await new Promise(resolve=>setTimeout(resolve,15));
    }}finally{this.policy=finishPrivateOutputWait(this.policy,id);}
  }

  async open(file:File|ArrayBuffer,input?:MediaInputOptions){
    const suffix=file instanceof File?file.name.split('.').at(-1)?.toLowerCase():undefined;
    const demuxer=input?.demuxer??(suffix==='sbc'||suffix==='msbc'?'sbc':'');
    if(typeof demuxer!=='string'||demuxer!==''&&!/^[a-z0-9_]{1,64}$/.test(demuxer))throw new PlayerError('INVALID_ARGUMENT','Invalid demuxer hint');
    const blob=file instanceof ArrayBuffer?new File([file],'source'):file;
    if(!Number.isSafeInteger(blob.size)||blob.size<=0)throw new PlayerError('INVALID_ARGUMENT','Private playback requires a finite nonempty file');
    if(file instanceof ArrayBuffer&&file.byteLength>32*1024*1024)throw new PlayerError('INVALID_ARGUMENT','ArrayBuffer sources are limited to 32 MiB; use File for larger sources');
    await this.load({file:blob,demuxer});
  }
  async openRemote(source:RemoteSource){
    if(source.format&&source.format!=='file')throw new PlayerError('UNSUPPORTED_FEATURE','Private Software requires finite HTTP ranges');
    if(source.demuxer!==undefined&&(typeof source.demuxer!=='string'||source.demuxer!==''&&!/^[a-z0-9_]{1,64}$/.test(source.demuxer)))throw new PlayerError('INVALID_ARGUMENT','Invalid demuxer hint');
    const {refreshAuthorization,...options}=source;
    await this.load({options,demuxer:source.demuxer??'',canRefresh:!!refreshAuthorization},refreshAuthorization);
  }
  private async load(data:Record<string,unknown>,refresh?:RemoteSource['refreshAuthorization']){
    const admission=beginPrivateSoftwareLoad(this.policy);this.policy=admission.state;
    const load=admission.load;if(!load)throw new PlayerError('ABORTED','Private Software closed');
    const current=()=>{if(!privateSoftwareLoadCurrent(this.policy,load))throw new PlayerError('ABORTED','Source load replaced');};
    await this.ready;current();await this.configureBuffering(true,current);current();
    this.policy=startPrivateSoftwareLoad(this.policy,load);this.properties.clear();this.diagnostics=undefined;this.refresh=refresh;
    const generation=load.generation;current();
    await this.request('load',{...data,generation,duration:this.options.duration});current();
    await this.waitUntil(()=>{current();return privateSoftwareReady(this.policy,this.facts(),'load');},undefined,generation);current();
    // Public timeline, loop and range controls require observed seekability.
    const seekable=await this.request('command',{args:['expand-text','${seekable}']});current();
    if(seekable==='yes'||seekable==='no')this.properties.set('seekable',seekable==='yes');
    current();this.policy=finishPrivateSoftwareLoad(this.policy,load);
  }
  private async syncContext(control?:PrivateSoftwareControl){
    const generation=this.generation,current=()=>{this.assertSource(generation);if(control)this.assertControl(control);};
    const data={value:this.context.state==='running',latencyUs:this.latency()};current();await this.request('context',data);current();
    if(this.context.state!=='running'&&!this.userPaused)this.emit('activity','waiting');
  }
  async setBuffering(policy:BufferingPolicy){
    const generation=this.generation;await this.ready;this.assertSource(generation);
    const settings={...mpvBufferingOptions(policy,this.userPaused),'cache-secs':policy.preload==='auto'||!this.userPaused?'3600000':'1'};
    for(const [key,value] of Object.entries(settings)){this.assertSource(generation);await this.request('command',{args:['set',key,value]});}
    this.assertSource(generation);this.policy=acceptPrivateSoftwareSettings(this.policy,generation,{buffering:policy});
  }
  get bufferingDiagnostics(){return resolveBuffering(this.policy.buffering??bufferingPolicy(),'mpv');}
  private async configureBuffering(preparing:boolean,current=()=>this.assertSource(this.generation)){
    for(const [key,value] of Object.entries(mpvBufferingOptions(this.policy.buffering??bufferingPolicy(),preparing))){current();await this.request('command',{args:['set',key,value]});current();}
  }
  async play(){
    const control=this.beginControl('play');
    try{await this.ready;this.assertControl(control);if(this.policy.buffering?.preload&&this.policy.buffering.preload!=='auto')await this.configureBuffering(false,()=>this.assertControl(control));
      this.assertControl(control);this.policy=startPrivateSoftwareControl(this.policy,control);
      const resume=this.context.resume;this.assertControl(control);await resume.call(this.context);this.assertControl(control);
      await this.syncContext(control);this.assertControl(control);await this.request('pause',{value:false});this.assertControl(control);this.emit('activity','play');
    }finally{this.policy=finishPrivateSoftwareControl(this.policy,control);}
  }
  async pause(){
    const control=this.beginControl('pause');
    try{await this.ready;this.assertControl(control);this.policy=startPrivateSoftwareControl(this.policy,control);await this.request('pause',{value:true});this.assertControl(control);this.emit('activity','pause');}
    finally{this.policy=finishPrivateSoftwareControl(this.policy,control);}
  }
  async seek(seconds:number){
    if(!Number.isFinite(seconds)||seconds<0)throw new PlayerError('INVALID_ARGUMENT','Invalid seek time');
    const control=this.beginControl('seek');
    try{await this.ready;this.assertControl(control);await this.request('seek',{seconds});this.assertControl(control);
      await this.waitUntil(()=>{this.assertControl(control);return privateSoftwareReady(this.policy,this.facts(),'seek',seconds);},undefined,control.generation);this.assertControl(control);
    }finally{this.policy=finishPrivateSoftwareControl(this.policy,control);}
  }
  async confirmSeek(target:number){const value=String(await this.command('expand-text','${=time-pos}|${seeking}'));const [time,seeking]=value.split('|');return seeking==='no'&&Math.abs(Number(time)-target)<0.15;}
  rate(value:number){if(!Number.isFinite(value)||value<0.5||value>2)throw new PlayerError('INVALID_ARGUMENT','Playback rate must be 0.5 to 2');return this.command('set','speed',String(value));}
  volume(value:number){if(!Number.isFinite(value)||value<0||value>100)throw new PlayerError('INVALID_ARGUMENT','Volume must be 0 to 100');return this.command('set','volume',String(value));}
  async gain(value:number){if(!Number.isFinite(value)||value<0||value>1)throw new PlayerError('INVALID_ARGUMENT','Gain must be 0 to 1');const generation=this.generation;await this.ready;this.assertSource(generation);const gain=this.gainNode!.gain,apply=gain.setValueAtTime,time=this.context.currentTime;this.assertSource(generation);this.policy=acceptPrivateSoftwareSettings(this.policy,generation,{gain:value});apply.call(gain,value,time);}
  selectTrack(type:TrackType,id:string){if(!['audio','sub'].includes(type)||!/^(?:[1-9][0-9]*|auto|no)$/.test(id))throw new PlayerError('INVALID_ARGUMENT','Invalid track selection');return this.command('set',type==='audio'?'aid':'sid',id);}
  subtitleVisible(visible:boolean){return this.command('set','sub-visibility',visible?'yes':'no');}
  resize(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1920||height>1080)throw new PlayerError('INVALID_ARGUMENT','Invalid dimensions');const generation=this.generation;void this.ready.then(()=>{this.assertSource(generation);return this.request('resize',{width,height});}).catch(error=>{if(privateSoftwareSourceCurrent(this.policy,generation))this.fail(error);});}
  async command(...args:string[]){const generation=this.generation;await this.ready;this.assertSource(generation);if(args[0]==='set'&&args[1]==='pause')return args[2]==='yes'?this.pause():this.play();const result=await this.request('command',{args});this.assertSource(generation);return result;}
  async previewSnapshot():Promise<{blob:Blob;time:number;width:number;height:number}>{const generation=this.generation;await this.ready;this.assertSource(generation);const result=await this.request('snapshot');this.assertSource(generation);return result;}
  async addSubtitle(subtitle:SubtitleAsset){
    const generation=this.generation;await this.ready;this.assertSource(generation);
    const admission=beginPrivateSoftwareAttachment(this.policy,subtitle.attachmentId);this.policy=admission.state;
    const attachment=admission.attachment;if(!attachment)throw new PlayerError('ABORTED','Private Software closed');
    try{
      const bytes=subtitle.bytes.slice(0);this.assertSource(generation);
      await this.request('subtitle',{subtitle:{...subtitle,bytes}},[bytes]);this.assertSource(generation);
      await this.waitUntil(()=>((this.properties.get('track-list')??[]) as Array<{type:string;external?:boolean}>).filter(t=>t.type==='sub'&&t.external).length>admission.previous,undefined,generation);
    }catch(error){this.policy=removePrivateSoftwareAttachment(this.policy,attachment);throw error;}
  }
  startupEvidence(){return privateSoftwareEvidence(this.policy,this.facts());}
  async verifyOutput(signal?:AbortSignal){const generation=this.generation;await this.waitUntil(()=>privateSoftwareReady(this.policy,this.facts(),'output'),signal,generation);this.assertSource(generation);this.policy=acceptPrivateSoftwareOutput(this.policy,generation);}
  async setAudioOutputDevice(id:string){const generation=this.generation;await this.ready;this.assertSource(generation);const context=this.context as AudioContext&{setSinkId?:(id:string)=>Promise<void>},select=context.setSinkId;this.assertSource(generation);if(!select)throw new PlayerError('UNSUPPORTED_FEATURE','AudioContext output selection unavailable');await select.call(context,id==='default'?'':id);this.assertSource(generation);}
  audioDiagnostics(){const samples=new Float32Array(this.analyser?.fftSize??2048);this.analyser?.getFloatTimeDomainData(samples);return {state:this.context.state,sampleRate:this.context.sampleRate,requestedOutput:this.requestedOutput,outputChannels:this.outputChannels,deviceChannels:this.deviceChannels,channelLayout:this.outputChannels===8?'7.1':this.outputChannels===6?'5.1':'stereo',gain:this.gainValue,rms:Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length),mediaFrames:this.diagnostics?.audio?.header?.[1]??0,transport:this.diagnostics?.audio,outputVerified:this.outputVerified};}
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    this.requests=beginBackendClose(this.requests);this.policy=retirePrivateSoftware(this.policy);
    // Publish the shared completion before abort listeners or transport callbacks.
    let resolve!:()=>void,reject!:(error:unknown)=>void;
    this.destruction=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    this.loading.abort();
    void (async()=>{
      try {const cleanup=await this.request('close');this.diagnostics={...this.diagnostics,cleanup};}
      finally {
        const closed=finishBackendClose(this.requests);this.requests=closed.state;
        for(const id of closed.reject){const pending=this.pending.get(id);if(pending){clearTimeout(pending.timer);this.pending.delete(id);pending.reject(new PlayerError('ABORTED','Private Software closed'));}}
        this.worker.terminate();this.node?.disconnect();this.node?.port.close();this.gainNode?.disconnect();this.analyser?.disconnect();this.context.onstatechange=null;if(this.context.state!=='closed')await this.context.close();
      }
    })().then(resolve,reject);
    return this.destruction;
  }
}
