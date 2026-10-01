// SPDX-License-Identifier: Apache-2.0
import type {Backend} from './backend.js';
import type {RemoteSource, MediaInputOptions, TrackType, ResourceLimits} from '../types.js';
import {runtimeWorker} from './runtime-worker.js';
import {PlayerError, playerError} from './errors.js';

/** Experimental finite Software Backend. Public admission has its own gates. */
export class PrivateSoftwarePlayer extends EventTarget implements Backend {
  readonly properties = new Map<string, unknown>();
  readonly ready:Promise<void>;
  readonly planId = 'software-private';
  diagnostics?:Record<string, any>;
  private worker:Worker;
  private context:AudioContext;
  private node?:AudioWorkletNode;
  private gainNode?:GainNode;
  private analyser?:AnalyserNode;
  private loading = new AbortController();
  private pending = new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private nextId = 1;
  private generation = 0;
  private closing = false;
  private destruction?:Promise<void>;
  private failed?:Error;
  private refresh?:RemoteSource['refreshAuthorization'];
  private userPaused = true;
  private gainValue = 1;
  private outputVerified = false;
  constructor(canvas:HTMLCanvasElement, private options:{runtime:'jspi'|'asyncify';assetBase:URL;duration?:number;resourceLimits?:ResourceLimits}) {
    super();
    if(typeof AudioContext==='undefined'||typeof OffscreenCanvas==='undefined')throw new PlayerError('UNSUPPORTED_FEATURE','Private Software requires Web Audio and OffscreenCanvas');
    this.context = new AudioContext({sampleRate:48000,latencyHint:'interactive'});
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
    await this.context.audioWorklet.addModule(new URL('web/private-mpv/audio-worklet.js',this.options.assetBase).href);
    if(this.closing)throw new PlayerError('ABORTED','Private Software closed during initialization');
    this.node = new AudioWorkletNode(this.context,'demuxe-private-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    this.gainNode = this.context.createGain();this.analyser = this.context.createAnalyser();
    this.node.connect(this.gainNode);this.gainNode.connect(this.context.destination);this.gainNode.connect(this.analyser);
    this.node.port.onmessage = ({data}) => {if(data.type==='error')this.fail(new Error(data.error));};
    const channel = new MessageChannel();this.node.port.postMessage({type:'connect',port:channel.port1},[channel.port1]);
    const offscreen = canvas.transferControlToOffscreen();
    const response = await fetch(new URL('fixtures/DejaVuSans.ttf',this.options.assetBase),{signal:this.loading.signal});
    if(!response.ok)throw new PlayerError('ASSET_LOAD_FAILED','Private Software font HTTP '+response.status);
    const font = await response.arrayBuffer();if(font.byteLength>8*1024*1024)throw new PlayerError('ASSET_LOAD_FAILED','Private Software font byte limit');
    await this.request('init',{runtime:this.options.runtime,canvas:offscreen,port:channel.port2,font,width:canvas.width,height:canvas.height,
      contextRunning:this.context.state==='running',latencyUs:this.latency(),...this.options.resourceLimits},[offscreen,channel.port2,font]);
  }
  private latency(){return Math.round((this.context.baseLatency+(this.context.outputLatency||0))*1e6);}
  private request(op:string,data:Record<string,unknown>={},transfer:Transferable[]=[]):Promise<any>{
    if(this.closing&&op!=='close')return Promise.reject(new PlayerError('ABORTED','Private Software closed'));
    if(this.failed&&op!=='close')return Promise.reject(this.failed);
    if(this.pending.size>=128&&op!=='close')return Promise.reject(new PlayerError('ABORTED','Private Software command queue limit'));
    const id = this.nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Private Software '+op+' deadline'));},op==='init'?60000:op==='close'?2000:25000);
      this.pending.set(id,{resolve,reject,timer});
      try {this.worker.postMessage({id,op,...data},transfer);}
      catch(error){clearTimeout(timer);this.pending.delete(id);reject(playerError(error));}
    });
  }
  private receive(data:any){
    if(data.id!==undefined){const pending=this.pending.get(data.id);if(pending){clearTimeout(pending.timer);this.pending.delete(data.id);data.error?pending.reject(playerError(new Error(data.error))):pending.resolve(data.result);}return;}
    if(data.type==='fatal'){this.diagnostics={...this.diagnostics,cleanup:data.cleanup,cleanupError:data.cleanupError};this.fail(playerError(new Error(data.error)));return;}
    if(data.type==='refresh'){
      if(data.generation!==this.generation){this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,error:'Authorization source replaced'});return;}
      const refresh=this.refresh;
      void Promise.resolve().then(()=>{if(!refresh)throw Error('Authorization refresh unavailable');return refresh(data.resource);}).then(update=>{
        if(!this.closing)this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,update});
      },error=>{if(!this.closing)this.worker.postMessage({op:'refreshed',refreshId:data.refreshId,error:String(error)});});return;
    }
    if(this.closing||data.generation!==this.generation)return;
    if(data.type==='diagnostics'){this.diagnostics=data.data;this.emit('diagnostics',data.data);}
    if(data.type==='output'){this.emit('output',data);}
    if(data.type==='event'){
      const event=data.event;
      if(event.event==='property-change')this.properties.set(event.name,event.data);
      if(event.event==='log-message')this.emit('log',event.prefix+': '+event.text);
      this.emit('mpv',event);
    }
  }
  private fail(error:Error){
    if(this.failed||this.closing)return;this.failed=error;
    for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.pending.clear();
    this.emit('error',error);void this.destroy().catch(()=>{});
  }
  private async waitUntil(predicate:()=>boolean,signal?:AbortSignal){
    const start=performance.now();
    while(performance.now()-start<25000){
      if(this.closing)throw this.failed??new PlayerError('ABORTED','Private Software closed');
      signal?.throwIfAborted();if(this.failed)throw this.failed;if(predicate())return;
      await new Promise(resolve=>setTimeout(resolve,15));
    }
    throw new PlayerError('PLAYBACK_STALLED','Private Software output deadline');
  }
  async open(file:File|ArrayBuffer,input?:MediaInputOptions){
    if(input?.demuxer)throw new PlayerError('UNSUPPORTED_FEATURE','Private Software requires finite files');
    const blob=file instanceof ArrayBuffer?new File([file],'source'):file;
    if(blob.size<=0||blob.size>64*1024*1024)throw new PlayerError('INVALID_ARGUMENT','Private Software source byte limit');
    await this.load({file:blob});
  }
  async openRemote(source:RemoteSource){
    if(source.demuxer||source.format&&source.format!=='file')throw new PlayerError('UNSUPPORTED_FEATURE','Private Software requires finite HTTP ranges');
    const {refreshAuthorization,...options}=source;
    await this.load({options,canRefresh:!!refreshAuthorization},refreshAuthorization);
  }
  private async load(data:Record<string,unknown>,refresh?:RemoteSource['refreshAuthorization']){
    await this.ready;this.generation++;this.properties.clear();this.diagnostics=undefined;this.outputVerified=false;
    const generation=this.generation;this.refresh=refresh;
    await this.request('load',{...data,generation,duration:this.options.duration});
    await this.waitUntil(()=>{
      if(generation!==this.generation)throw new PlayerError('ABORTED','Source load replaced');
      const tracks=this.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined;
      return !!tracks?.some(track=>track.type==='video'&&track.selected)&&!!this.diagnostics?.rendered&&!this.diagnostics.seeking;
    });
  }
  private async syncContext(){
    await this.request('context',{value:this.context.state==='running',latencyUs:this.latency()});
    if(this.context.state!=='running'&&!this.userPaused)this.emit('activity','waiting');
  }
  async play(){await this.ready;this.userPaused=false;await this.context.resume();await this.syncContext();await this.request('pause',{value:false});this.emit('activity','play');}
  async pause(){await this.ready;this.userPaused=true;await this.request('pause',{value:true});this.emit('activity','pause');}
  async seek(seconds:number){
    if(!Number.isFinite(seconds)||seconds<0)throw new PlayerError('INVALID_ARGUMENT','Invalid seek time');
    await this.ready;await this.request('seek',{seconds});
    await this.waitUntil(()=>!!this.diagnostics?.rendered&&!this.diagnostics?.seeking&&Math.abs(Number(this.diagnostics?.presentedPosition)-seconds)<0.15);
  }
  async confirmSeek(target:number){const value=String(await this.command('expand-text','${=time-pos}|${seeking}'));const [time,seeking]=value.split('|');return seeking==='no'&&Math.abs(Number(time)-target)<0.15;}
  rate(value:number){if(!Number.isFinite(value)||value<0.5||value>2)throw new PlayerError('INVALID_ARGUMENT','Playback rate must be 0.5 to 2');return this.command('set','speed',String(value));}
  volume(value:number){if(!Number.isFinite(value)||value<0||value>100)throw new PlayerError('INVALID_ARGUMENT','Volume must be 0 to 100');return this.command('set','volume',String(value));}
  async gain(value:number){if(!Number.isFinite(value)||value<0||value>1)throw new PlayerError('INVALID_ARGUMENT','Gain must be 0 to 1');await this.ready;this.gainValue=value;this.gainNode!.gain.setValueAtTime(value,this.context.currentTime);}
  selectTrack(type:TrackType,id:string){if(!['audio','sub'].includes(type)||!/^(?:[1-9][0-9]*|auto|no)$/.test(id))throw new PlayerError('INVALID_ARGUMENT','Invalid track selection');return this.command('set',type==='audio'?'aid':'sid',id);}
  subtitleVisible(visible:boolean){return this.command('set','sub-visibility',visible?'yes':'no');}
  resize(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1920||height>1080)throw new PlayerError('INVALID_ARGUMENT','Invalid dimensions');void this.ready.then(()=>this.request('resize',{width,height})).catch(error=>{if(!this.closing)this.fail(error);});}
  async command(...args:string[]){await this.ready;if(args[0]==='set'&&args[1]==='pause')return args[2]==='yes'?this.pause():this.play();return this.request('command',{args});}
  startupEvidence(){const h=this.diagnostics?.audio?.header??[];return {metadata:!!this.properties.get('track-list'),audioDecoderConfigured:!!this.properties.get('audio-codec-name'),audioDecoded:h[0]>0,audioProgress:h[1]>0,videoPresented:!!this.diagnostics?.rendered,decoderOutput:!!this.diagnostics?.rendered||h[0]>0};}
  async verifyOutput(signal?:AbortSignal){await this.waitUntil(()=>{const evidence=this.startupEvidence();return evidence.videoPresented&&(!this.properties.get('audio-codec-name')||evidence.audioDecoded);},signal);this.outputVerified=true;}
  async setAudioOutputDevice(id:string){await this.ready;const context=this.context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};if(!context.setSinkId)throw new PlayerError('UNSUPPORTED_FEATURE','AudioContext output selection unavailable');await context.setSinkId(id==='default'?'':id);}
  audioDiagnostics(){const samples=new Float32Array(this.analyser?.fftSize??2048);this.analyser?.getFloatTimeDomainData(samples);return {state:this.context.state,sampleRate:this.context.sampleRate,outputChannels:2,gain:this.gainValue,rms:Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length),mediaFrames:this.diagnostics?.audio?.header?.[1]??0,transport:this.diagnostics?.audio,outputVerified:this.outputVerified};}
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;this.closing=true;this.loading.abort();
    return this.destruction=(async()=>{
      try {const cleanup=await this.request('close');this.diagnostics={...this.diagnostics,cleanup};}
      finally {
        this.worker.terminate();for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new PlayerError('ABORTED','Private Software closed'));}this.pending.clear();
        this.node?.disconnect();this.node?.port.close();this.gainNode?.disconnect();this.analyser?.disconnect();this.context.onstatechange=null;if(this.context.state!=='closed')await this.context.close();
      }
    })();
  }
}
