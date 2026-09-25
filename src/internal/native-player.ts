// SPDX-License-Identifier: Apache-2.0
import {bufferingPolicy, resolveBuffering} from './buffering.js';
import type {BufferingPolicy} from '../types.js';
import {plainVTT, BrowserCaptionUnsupported} from './plain-vtt.js';
import {observeBrowserAudio} from './browser-evidence-adapters.js';
import {nativeMediaError,compatibilityFailure,StartupEvidenceTimeout,NativeLoadTimeout} from './runtime-capability.js';
import {PlayerError} from './errors.js';
import type {CapabilityEvidence} from './runtime-capability.js';
import type {RemoteSource, TextTrackSource, TrackType, SubtitleAsset, FontAsset} from '../types.js';
import type {Backend} from './backend.js';

type RemuxSource = {file?: File; options?: RemoteSource; audioTrack?: number; videoOnly?:boolean};
type RemuxTrack = {id: string; type: string; codec: string; selected: boolean};
type RemuxController = {
  waitingForMedia?:boolean; onBufferingChange?:()=>void;
  audioAdaptation?:'flac'|'opus'; generation?:number;
  windowed?:boolean; ranges?():[number,number][]; duration?:number; playbackPaused?:boolean; playbackEnded?:boolean;
  trackBounds?:{videoEnd:number;audioEnd:number};
  starting?: boolean; timelineBias: number; tracks?: RemuxTrack[]; onError?: (message: string) => void;
  open(source: RemuxSource, target?: number): Promise<unknown>;
  canSeekBuffered?(target:number): boolean; expectedVideoFrame?(target:number):number|undefined;
  muxedFrames?:boolean; matchesVideoFrame?(target:number,mediaTime:number):boolean|undefined;
  seek(target: number): Promise<unknown>; play(): Promise<void>; pause(): void;
  destroy(): Promise<void>; snapshot(): Record<string, unknown>;
};
type AudioTrack = {id: string; label?: string; language?: string; enabled: boolean};
type VideoWithAudioTracks = HTMLVideoElement & {audioTracks?: ArrayLike<AudioTrack>};

/** Browser media ownership, including listeners, pending loads and object URLs. */
export class NativePlayer extends EventTarget implements Backend {
  readonly ready = Promise.resolve();
  readonly properties = new Map<string, unknown>();
  private stopped = false;
  private seekPresentationRetries = 0;
  private capability:CapabilityEvidence={};
  private mpvSubs?:import('./native-mpv-subtitles.js').NativeMpvSubtitles;
  private mpvAudio?:import('./native-mpv-audio.js').NativeMpvAudio;
  private get selectiveAudio(){return this.requestedPlan==='native-video-mpv-audio';}
  private ass?: import('./native-ass.js').NativeASS;
  private assAssets:SubtitleAsset[]=[];
  private assIndex=-1;
  private captionAssets=new Map<TextTrack,{asset:SubtitleAsset;index:number}>();
  private captionURLs=new Set<string>();
  private gainContext?: AudioContext;
  private gainSource?: MediaElementAudioSourceNode;
  private gainNode?: GainNode;
  private gainValue=1;
  private requestedVolume=100;
  private requestedRate=1;
  async gain(value:number) {
    this.assertActive();
    if(!Number.isFinite(value)||value<0||value>1)throw new Error('Gain must be between 0 and 1');
    if(this.selectiveAudio){if(this.mpvAudio)await this.mpvAudio.gainValue(value);this.gainValue=value;return;}
    if(!this.gainSource&&value!==1){
      const context=this.gainContext??(this.gainContext=new AudioContext());
      // Resume before redirecting an already playing element into the graph.
      // Ownership is recorded before awaiting; destroy cancels the wait.
      if(!this.video.paused)await this.resumeGain();
      this.assertActive();
      const source=context.createMediaElementSource(this.video),gain=context.createGain();
      gain.gain.setValueAtTime(value,context.currentTime);
      source.connect(gain);gain.connect(context.destination);
      this.gainSource=source;this.gainNode=gain;
    }
    if(this.gainNode)this.gainNode.gain.setValueAtTime(value,this.gainContext!.currentTime);
    this.gainValue=value;
  }
  private async resumeGain() {
    const context=this.gainContext;
    if(!context||context.state!=='suspended')return;
    await new Promise<void>((resolve,reject)=>{
      let settled=false;
      const finish=(error?:Error)=>{
        if(settled)return;settled=true;clearTimeout(timer);this.cancelers.delete(cancel);
        error?reject(error):resolve();
      };
      const cancel=(error:Error)=>finish(error);
      const timer=setTimeout(()=>finish(new DOMException('Audio activation timed out','NotAllowedError')),10000);
      this.cancelers.add(cancel);
      context.resume().then(()=>finish(),error=>finish(error));
    });
    this.assertActive();
  }
  private destruction?:Promise<void>;
  private opening = false;
  private remux?: RemuxController;
  private projection?: {tracks:RemuxTrack[];diagnostics:Record<string,unknown>};
  private adapted=false;
  private remuxSource?: RemuxSource;
  private directFailure?: string;
  private remoteSource?:RemoteSource;
  private shiftedCues = new WeakSet<TextTrackCue>();
  private sourceTime() {return Math.max(0,this.video.currentTime-(this.remux?.timelineBias??0));}
  private sourceDuration() {if(this.remux?.windowed)return this.remux.duration??0;return Number.isFinite(this.video.duration)?Math.max(0,this.video.duration-(this.remux?.timelineBias??0)):0;}
  private objectURL?: string;
  private selectedSub = 'auto';
  private subsVisible = true;
  private cancelers = new Set<(error: Error) => void>();
  private listeners: Array<() => void> = [];

  constructor(private video: HTMLVideoElement, private remuxPolicy: 'auto' | 'never' | 'always' = 'auto', private assetBase = new URL('../../../',import.meta.url), private bufferedSeeks=false, private audioAdaptation?:'flac'|'opus', private initialAudioTrack?:number, private nativeASS=false, private fonts:FontAsset[]=[], private requestedPlan?:string, private buffering:BufferingPolicy=bufferingPolicy(), private loadTimeoutMs=25000, private defaultSubtitleStreamIndex?:number) {
    super();
    video.playsInline = true;
    video.preload = this.buffering.preload;
    for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'volumechange', 'ratechange', 'ended', 'waiting', 'playing', 'progress', 'seeking', 'seeked', 'resize']) {
      const listener = () => {
        this.refresh();
        this.emit('activity', event);
        if (event === 'ended'&&(!this.remux?.windowed||this.remux.playbackEnded)) this.emit('mpv', {event: 'end-file', reason: 'eof'});
      };
      video.addEventListener(event, listener);
      this.listeners.push(() => video.removeEventListener(event, listener));
    }
    const failed = () => {
      if(this.opening||this.remux?.starting||this.stopped)return;
      void this.classifyDirectFailure(nativeMediaError(video.error)).then(error=>{if(!this.stopped)this.emit('error',error);},error=>{if(!this.stopped)this.emit('error',error);});
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
  private wait(event: string, start: () => void): Promise<void> {
    this.assertActive();
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);this.video.removeEventListener(event, done);this.video.removeEventListener('error', failed);this.cancelers.delete(cancel);
        error ? reject(error) : resolve();
      };
      const done = () => finish();
      const failed = () => finish(nativeMediaError(this.video.error));
      const cancel = (error: Error) => finish(error);
      const loading=event==='loadeddata'||event==='loadedmetadata';
      const timer = setTimeout(() => finish(loading?new NativeLoadTimeout(event,this.loadTimeoutMs):new Error(`Native ${event} timed out`)), loading?this.loadTimeoutMs:25000);
      this.cancelers.add(cancel);this.video.addEventListener(event, done, {once: true});this.video.addEventListener('error', failed, {once: true});
      try {start();} catch (error) {finish(error as Error);}
    });
  }
  // File captions have their own ID range; DOM insertion order must not reassign
  // IDs of URL-backed browser tracks when a session replays both kinds.
  private textTrackId(track:TextTrack):string {
    const caption=this.captionAssets.get(track);
    return caption?String(200000+caption.index):String(Array.from(this.video.textTracks).filter(t=>!this.captionAssets.has(t)).indexOf(track)+1);
  }
  private refresh() {
    const tracks: object[] = Array.from(this.video.textTracks, t => ({id: this.textTrackId(t), type: 'sub', title: t.label, lang: t.language, selected: t.mode === 'showing',...(this.captionAssets.has(t)?{external:true,'external-index':this.captionAssets.get(t)!.index,codec:'webvtt'}:{})}));
    tracks.push(...this.assAssets.map((a,i)=>({id:String(100001+i),type:'sub',codec:a.format,title:a.label,lang:a.language,external:true,'external-index':i+1,selected:(this.selectedSub==='auto'||Number(this.selectedSub)===100001+i)&&this.assIndex===i})));
    if(this.mpvSubs)tracks.push(...this.mpvSubs.tracks);
    const audio = (this.video as VideoWithAudioTracks).audioTracks;
    if(this.projection)tracks.push(...this.projection.tracks.filter(t=>t.type==='audio').map(t=>({...t,selected:t.selected&&!this.video.muted})));
    else if(this.remux?.tracks)tracks.push(...this.remux.tracks.filter(t=>t.type==='audio').map(t=>({...t,selected:this.mpvAudio?this.mpvAudio.selectedStreamIndex===Number(t.id)-1:t.selected&&!this.video.muted})));
    else if (audio) tracks.push(...Array.from(audio, (t, i) => ({id: String(i + 1), type: 'audio', title: t.label, lang: t.language, selected: t.enabled})));
    const timeRanges=(r:TimeRanges)=>Array.from({length:r.length},(_,i)=>({start:Math.max(0,r.start(i)-(this.remux?.timelineBias??0)),end:Math.max(0,r.end(i)-(this.remux?.timelineBias??0))}));
    const values: Record<string, unknown> = {'native-waiting':!!this.remux?.waitingForMedia, 'time-pos': this.sourceTime(), duration: Number.isFinite(this.video.duration)?this.sourceDuration():null, 'native-buffered':this.remux?.windowed?(this.remux.ranges?.()??[]).map(([start,end])=>({start,end})):timeRanges(this.video.buffered),'native-seekable':this.remux?.windowed?[{start:0,end:this.sourceDuration()}]:timeRanges(this.video.seekable),'native-live':this.video.duration===Infinity, pause: this.remux?.playbackPaused??this.video.paused, 'eof-reached': this.remux?.playbackEnded??this.video.ended, volume: this.selectiveAudio?this.requestedVolume:this.video.volume * 100, speed: this.video.playbackRate, 'track-list': tracks};
    for (const [name, data] of Object.entries(values)) {
      if (name !== 'track-list' && this.properties.get(name) === data) continue;
      this.properties.set(name, data);this.emit('mpv', {event: 'property-change', name, data});
    }
  }
  get diagnostics() {const q = this.video.getVideoPlaybackQuality(),remux=this.remux?.snapshot();return {buffering:{...resolveBuffering(this.buffering,this.remux?'remux':'browser'),settings:remux?.buffering as Record<string,unknown>??{elementPreload:this.video.preload}},capability:{...this.capability,...(remux?.capability as CapabilityEvidence??{})},path: 'native', projection:this.projection?.diagnostics,mpvAudio:this.mpvAudio?.diagnostics,mpvSubtitles:this.mpvSubs?{route:this.remux?'native-remux + mpv-subtitles':'native-direct + mpv-subtitles',...this.mpvSubs.stats,...this.mpvSubs.service}:undefined,plan:this.mpvAudio?'native-video-mpv-audio':this.mpvSubs?(this.remux?'remux-mpv':'direct-mpv'):this.projection?'remux':this.remux?(this.adapted?`adapted-${this.audioAdaptation}`:'remux'):'direct', subtitleOverlay:this.ass?{component:'libass',scope:'external-ass',destination:'container-only',...this.ass.stats}:undefined, audioProcessing:this.mpvAudio?{component:'mpv-pcm-worklet',gain:this.gainValue}: {component:this.gainContext?'web-audio-gain':'media-element',gain:this.gainValue,contextState:this.gainContext?.state,baseLatency:this.gainContext?.baseLatency}, directFailure:this.directFailure, remux, seekPresentation:{bufferedRetries:this.seekPresentationRetries}, position: this.sourceTime(), rendered: q.totalVideoFrames, dropped: q.droppedVideoFrames, readyState: this.video.readyState};}
  private async load(url: string) {
    // open promises metadata even when speculative preload was disabled.
    if(this.buffering.preload==='none')this.video.preload='metadata';
    try{await this.wait(this.buffering.preload==='auto'?'loadeddata':'loadedmetadata', () => {this.video.src = url;this.video.load();});}
    finally{this.video.preload=this.buffering.preload;}
    this.capability.metadata=true;
    this.refresh();this.emit('mpv', {event: 'file-loaded'});
  }
  private expectedOutput?:{video:boolean;audio:boolean};
  /** A paused candidate may prepare current data without presenting it. Only
   * verifyOutput can promote this evidence to executed playback. */
  async verifyStartup(expected?:{video:boolean;audio:boolean}, output=false,signal?:AbortSignal) {
    signal?.throwIfAborted();this.assertActive();await this.mpvSubs?.verify();signal?.throwIfAborted();this.expectedOutput=expected??this.expectedOutput;
    expected=this.expectedOutput;
    if(this.mpvAudio)expected={...expected,video:true,audio:false};
    const previouslyVerified=this.capability.outputVerified===true;
    if(output){this.capability.completedAtEOF=false;this.capability.outputVerified=false;this.capability.videoPresented=false;this.capability.playbackReady=false;this.capability.audioProgress=false;this.capability.audioEvidenceStrength='unknown';this.capability.audioDecoded=false;}
    const v=this.video as HTMLVideoElement & {webkitAudioDecodedByteCount?:number;mozDecodedFrames?:number;mozHasAudio?:boolean};
    const initialAudioBytes=v.webkitAudioDecodedByteCount;
    const initialTime=v.currentTime,initialFrames=v.getVideoPlaybackQuality().totalVideoFrames;
    // A verified session may continue through a shorter track's silent or
    // frozen tail. Require fresh evidence from tracks still on the timeline.
    const bounds=this.remux?.trackBounds,position=initialTime-(this.remux?.timelineBias??0);
    const active={video:(expected?.video??v.videoWidth>0)&&!(output&&previouslyVerified&&bounds&&bounds.videoEnd>=0&&position>=bounds.videoEnd-.01),
      audio:(expected?.audio??false)&&!(output&&previouslyVerified&&bounds&&bounds.audioEnd>=0&&position>=bounds.audioEnd-.01)};
    const timing=this.capability.timing??(this.capability.timing={});
    timing[output?'outputRequested':'preparationRequested']=performance.now();
    await new Promise<void>((resolve,reject)=>{
      let finished=false,classifying=false,frame=0,presented=false;
      const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(poll);if(frame)v.cancelVideoFrameCallback(frame);this.cancelers.delete(cancel);signal?.removeEventListener('abort',aborted);error?reject(error):resolve();};
      const cancel=(error:Error)=>finish(error);
      const aborted=()=>finish(signal?.reason??new DOMException('Verification cancelled','AbortError'));
      const check=()=>{
        if(this.stopped){finish(new Error('Player is destroyed'));return;}
        if(finished||classifying)return;
        if(v.error){classifying=true;clearInterval(poll);void this.classifyDirectFailure(nativeMediaError(v.error)).then(error=>finish(error instanceof Error?error:new Error(String(error))),error=>finish(error));return;}
        this.capability.metadata=v.readyState>=1;if(this.capability.metadata)timing.metadata??=performance.now();
        const hasVideo=active.video;
        const decoded=v.getVideoPlaybackQuality().totalVideoFrames>0||(v.mozDecodedFrames??0)>0;
        if(decoded)this.capability.decoderOutput=true;
        // A previously verified session can naturally finish a short remaining
        // interval without presenting another frame. This is completion, not
        // fresh frame/audio evidence; do not strand play() until its deadline.
        if(output&&previouslyVerified&&v.ended){this.capability.completedAtEOF=true;this.capability.outputVerified=true;timing.outputAccepted=performance.now();finish();return;}
        const ready=v.readyState>=(!output&&!this.remux&&this.buffering.preload!=='auto'?1:3)&&!v.seeking&&(!hasVideo||v.videoWidth>0);
        if(!ready)return;
        // A ready video can omit selected audio. Use browser runtime evidence,
        // but an instantaneous zero counter is not a decode failure. Paused
        // preparation does not claim output; play verification has a deadline.
        if(active.audio)this.capability.audioObservation={initialBytes:initialAudioBytes,decodedBytes:v.webkitAudioDecodedByteCount,delta:typeof initialAudioBytes==='number'&&typeof v.webkitAudioDecodedByteCount==='number'?v.webkitAudioDecodedByteCount-initialAudioBytes:undefined,present:v.mozHasAudio,enabledTrack:(v as VideoWithAudioTracks).audioTracks?Array.from((v as VideoWithAudioTracks).audioTracks!).some(track=>track.enabled):undefined,clockAdvanced:v.currentTime>initialTime+.02};
        if(active.audio&&v.readyState>=3&&v.mozHasAudio===false){finish(new PlayerError('DECODE_FAILED','Native selected audio track produced no output'));return;}
        this.capability.prepared=true;timing.ready??=performance.now();
        if(!output){finish();return;}
        const advancing=(!v.paused||v.ended)&&v.currentTime>initialTime+(v.ended?0:.02);
        if(presented||v.getVideoPlaybackQuality().totalVideoFrames>initialFrames){this.capability.videoPresented=true;timing.firstFrame??=performance.now();}
        const audio=observeBrowserAudio(v as typeof v & VideoWithAudioTracks,advancing);
        const audioReady=!active.audio||audio.ready;
        if(active.audio){
          this.capability.audioEvidenceStrength=audio.strength;
          this.capability.audioEvidence=audio.adapter;
          this.capability.audioDecoded=audio.strength==='decoded';
          this.capability.audioProgress=audioReady&&advancing;
        }
        if(advancing&&(!hasVideo||this.capability.videoPresented)&&audioReady){this.capability.playbackReady=true;this.capability.outputVerified=true;timing.outputAccepted=performance.now();finish();}
      };
      const timer=setTimeout(()=>{
        const missing=v.readyState>=3&&((active.video&&!v.videoWidth)||(output&&active.audio&&(v.webkitAudioDecodedByteCount===0||v.mozHasAudio===false)));
        finish(missing?new PlayerError('DECODE_FAILED','Native selected track produced no decoded output'):new StartupEvidenceTimeout(output?'output':'preparation'));
      },10000);
      const poll=setInterval(check,25);this.cancelers.add(cancel);signal?.addEventListener('abort',aborted,{once:true});
      if(signal?.aborted){aborted();return;}
      if(output&&typeof v.requestVideoFrameCallback==='function')frame=v.requestVideoFrameCallback(()=>{if(!finished&&!this.stopped){presented=true;check();}});
      check();
    });
    if(output&&this.mpvAudio){try{await this.mpvAudio.verifyOutput(signal);signal?.throwIfAborted();}catch(error){signal?.throwIfAborted();throw new PlayerError('DECODE_FAILED','Selective audio runtime output was not verified: '+String(error));}this.capability.audioProgress=true;this.capability.audioEvidence='mpv-pcm-worklet-consumption';this.capability.audioEvidenceStrength='consumed';this.capability.audioDecoded=true;}
  }
  async verifyOutput(signal?:AbortSignal){try{await this.verifyStartup(this.expectedOutput,true,signal);}catch(error){this.capability.outputVerified=false;throw error;}}
  private async startRemux(source: RemuxSource, target=0) {
    this.assertActive();
    if(source.file&&!this.audioAdaptation&&!this.selectiveAudio){
      const controller=new AbortController(),cancel=()=>controller.abort();this.cancelers.add(cancel);
      try{
        const {selectedMP4View}=await import(new URL('web/selected-mp4-view.js',this.assetBase).href);
        const view=await selectedMP4View(source.file,source.audioTrack,controller.signal);this.assertActive();
        if(view){
          await this.remux?.destroy();this.remux=undefined;
          const url=URL.createObjectURL(view.file);
          try{await this.load(url);await this.verifyStartup({video:true,audio:true});this.assertActive();if(target>0)await this.wait('seeked',()=>{this.video.currentTime=target;});
            if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.objectURL=url;this.projection=view;this.remuxSource=source;
            this.refresh();this.emit('source',{plan:'remux',tracks:view.tracks});return;
          }catch(error){URL.revokeObjectURL(url);this.assertActive();this.directFailure=String(error);}
        }
      }finally{this.cancelers.delete(cancel);}
    }
    this.projection=undefined;
    if(typeof MediaSource==='undefined')throw Error('Native remux requires MediaSource');
    if(source.options?.format&&source.options.format!=='file')throw Error('Native remux currently requires a random-access file source; use Hybrid for this manifest');
    const moduleURL=new URL('web/native-remux-player.js',this.assetBase).href;
    const {RemuxPlayer}=await import(moduleURL);
    this.assertActive();
    const {refreshAuthorization,...options}=source.options??{};
    const transport={...source,...(source.options?{options:options as RemoteSource}:{}),refreshAuthorization};
    const attempt=async(adapted:boolean)=>{
      this.assertActive();this.adapted=adapted;
      if(this.remux&&this.remux.audioAdaptation!==(adapted?this.audioAdaptation:undefined)){await this.remux.destroy();this.remux=undefined;this.assertActive();}
      this.remux??=new RemuxPlayer(this.video,{buffering:{...resolveBuffering(this.buffering,'remux'),preload:this.buffering.preload},bufferedSeeks:this.bufferedSeeks,audioAdaptation:adapted?this.audioAdaptation:undefined,mseOwner:this.requestedPlan==='native-remux-mpv'||this.selectiveAudio?'window':'auto'}) as RemuxController;
      this.remux.onBufferingChange=()=>{if(!this.stopped)this.refresh();};
      this.remux.audioAdaptation=adapted?this.audioAdaptation:undefined;
      this.remux.onError=message=>{if(!this.opening&&!this.stopped)this.emit('error',message);};
      await this.remux.open(transport,target);this.assertActive();
    };
    try{await attempt(!!this.requestedPlan&&!!this.audioAdaptation);}catch(error){
      if(this.requestedPlan||this.stopped||!this.audioAdaptation||!String(error).includes('Audio codec has no browser MP4 packet contract'))throw error;
      await attempt(true);
    }
    this.remuxSource=source;
    if(this.video.seeking)await this.wait('seeked',()=>{});
    this.refresh();this.emit('source',{plan:this.adapted?`adapted-${this.audioAdaptation}`:'remux',tracks:this.remux!.tracks});this.emit('mpv',{event:'file-loaded'});
  }
  private async loadPlan(source: RemuxSource, direct: ()=>Promise<void>, requiresRemux=false) {
    this.assertActive();this.opening=true;
    try {
      if(this.requestedPlan){
        if(this.requestedPlan.startsWith('native-direct'))await direct();else await this.startRemux(source);
        return;
      }
      if(this.remuxPolicy!=='always'&&!requiresRemux){
        try {await direct();return;}catch(error){
          if(this.stopped||this.remuxPolicy==='never'||![3,4].includes(this.video.error?.code??0))throw error;
          this.directFailure=String(error);
        }
      }else if(this.remuxPolicy==='never')throw Error('Native direct cannot enforce these source permissions; enable native remux or choose Hybrid');
      await this.startRemux(source);
    } finally {this.opening=false;}
  }
  async open(file: File | ArrayBuffer) {
    this.assertActive();
    const local=file instanceof File?file:new File([file],'media');
    this.objectURL=URL.createObjectURL(local);
    try {
      await this.loadPlan({file:local,audioTrack:this.initialAudioTrack,videoOnly:this.selectiveAudio},()=>this.load(this.objectURL!));
      if(this.selectiveAudio){
        const {NativeMpvAudio}=await import('./native-mpv-audio.js');this.assertActive();
        this.video.muted=true;
        this.mpvAudio=new NativeMpvAudio(this.video,()=>this.sourceTime(),this.assetBase,error=>this.emit('error',error));
        try{await this.mpvAudio.open(local,this.initialAudioTrack);}catch(error){throw new PlayerError('DECODE_FAILED','Selective audio startup failed: '+String(error));}
        this.assertActive();
        await this.mpvAudio.volume(this.requestedVolume);await this.mpvAudio.gainValue(this.gainValue);
        if(this.requestedRate!==1)await this.mpvAudio.rate(this.requestedRate);
        this.refresh();
      }
      if(this.requestedPlan==='native-remux-mpv'||this.requestedPlan==='native-direct-mpv'){
        const {NativeMpvSubtitles}=await import('./native-mpv-subtitles.js');this.assertActive();
        this.mpvSubs=new NativeMpvSubtitles(this.video,()=>this.sourceTime(),this.assetBase,this.fonts,local,error=>this.emit('error',error),this.defaultSubtitleStreamIndex);
        await this.mpvSubs.ready;this.assertActive();await this.mpvSubs.select('auto');this.mpvSubs.visible(false);this.refresh();
      }
    }
    catch(error){URL.revokeObjectURL(this.objectURL);this.objectURL=undefined;
      if(this.selectiveAudio&&!(error instanceof PlayerError)&&!(error instanceof DOMException&&['AbortError','NotAllowedError'].includes(error.name)))throw new PlayerError('DECODE_FAILED','Selective video preparation failed: '+String(error));
      throw error;}
  }
  async openRemote(source: RemoteSource) {
    this.assertActive();
    if(this.selectiveAudio)throw new PlayerError('UNSUPPORTED_FEATURE','Selective audio currently requires a local inspected file');
    const url=new URL(source.url,location.href);
    if(!['http:','https:'].includes(url.protocol))throw Error('Remote sources require HTTP or HTTPS');
    const requiresRemux=!!(source.headers||source.refreshAuthorization||source.allowedOrigins||source.immutable!==undefined||source.credentials==='omit');
    this.video.crossOrigin=source.credentials==='include'?'use-credentials':'anonymous';
    await this.loadPlan({options:{...source,url:url.href},audioTrack:this.initialAudioTrack},async()=>{
      if(source.format&&source.format!=='file'){
        const mime=source.format==='hls'?'application/vnd.apple.mpegurl':'application/dash+xml';
        this.capability.apiHint=`canPlayType(${mime})=${this.video.canPlayType(mime)||'unknown'}`;
      }
      this.remoteSource={...source,url:url.href};
      try{
        await this.load(url.href);
        if(source.format&&source.format!=='file'&&!Number.isFinite(this.video.duration))throw new PlayerError('SOURCE_PERMISSION','Native manifest has no finite VOD duration; live playback requires explicit Shaka live permission');
      }catch(error){throw await this.classifyDirectFailure(error);}
    },requiresRemux);
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
  async play() {this.assertActive();if(this.mpvAudio){await this.mpvAudio.play(()=>this.remux?this.remux.play():this.video.play());this.refresh();return;}await this.resumeGain();this.assertActive();if(this.remux)await this.remux.play();else await this.video.play();this.refresh();}
  async pause() {this.assertActive();if(this.mpvAudio){await this.mpvAudio.pause(()=>this.remux?this.remux.pause():this.video.pause());this.refresh();return;}if(this.remux)this.remux.pause();else this.video.pause();this.refresh();}
  async seek(seconds:number){
    this.assertActive();this.mpvSubs?.suspend(true);
    try{if(this.mpvAudio)await this.mpvAudio.seek(seconds,async()=>{this.remux?.pause();await this.seekVideo(seconds);});else await this.seekVideo(seconds);await this.mpvSubs?.seek(seconds);}
    finally{this.mpvSubs?.suspend(false);}
  }
  private async seekVideo(seconds: number) {
    this.assertActive();
    if(this.remux){
      const paused=this.remux.playbackPaused??this.video.paused;
      // Even a sub-millisecond movement can cross a source-frame boundary.
      const frameChanged=this.remux.expectedVideoFrame?.(seconds)!==this.remux.expectedVideoFrame?.(this.sourceTime());
      if(this.remux.canSeekBuffered?.(seconds)&&this.video.videoWidth&&(frameChanged||Math.abs(this.sourceTime()-seconds)>.001)){
        // Hold the presentation clock while verifying the target frame. Otherwise
        // a playing clock can advance beyond the exact target before rVFC runs.
        // Producer/session identity is retained; restore the captured intent below.
        this.remux.pause();
        await this.seekPresented(seconds,()=>this.remux!.seek(seconds));
      }else await this.remux.seek(seconds);
      this.assertActive();if(this.video.seeking)await this.wait('seeked',()=>{});
      if(!paused)await this.remux.play();this.refresh();return;
    }
    if (Math.abs(this.video.currentTime - seconds) < .001 && !this.video.seeking) return;
    await this.wait('seeked', () => {this.video.currentTime = seconds;});this.refresh();
  }
  private seekPresented(target:number, action:()=>Promise<unknown>):Promise<void> {
    return new Promise((resolve,reject)=>{
      let frame=0,accepted=false,completed=false,finished=false,retried=false;
      let retryTimer:ReturnType<typeof setTimeout>|undefined;
      const presentation=this.remux,generation=presentation?.generation,mediaTarget=target+(presentation?.timelineBias??0),expected=presentation?.expectedVideoFrame?.(target);
      const correlated=!!presentation?.muxedFrames||expected!==undefined;let presented=false;
      const retired=()=>this.stopped||this.remux!==presentation||presentation?.generation!==generation;
      const atTarget=()=>!this.video.seeking&&Math.abs(this.video.currentTime-mediaTarget)<.001;
      const seeked=()=>{
        if(retired()){finish(new Error('Native seek presentation was retired'));return;}
        if(correlated&&presented&&atTarget()){accepted=true;if(completed)finish();return;}
        // Firefox can complete a paused seek without issuing a fresh frame
        // callback (reproduced after a remux restart with Native ASS). Give the
        // compositor time to deliver it, then re-present the same buffered
        // target once. Keep the producer and source-frame verification intact;
        // seeked/currentTime alone must never establish correct output.
        if(!presented&&atTarget()&&!retried&&retryTimer===undefined){
          retryTimer=setTimeout(()=>{
            retryTimer=undefined;if(finished)return;
            if(retired()){finish(new Error('Native seek presentation was retired'));return;}
            if(presented||!atTarget()||!this.video.paused||!presentation?.canSeekBuffered?.(target))return;
            retried=true;this.seekPresentationRetries++;
            if(frame)this.video.cancelVideoFrameCallback(frame);
            frame=this.video.requestVideoFrameCallback(next);
            try{this.video.currentTime=mediaTarget;}catch(error){finish(error as Error);}
          },100);
        }
      };
      const failed=()=>finish(nativeMediaError(this.video.error));
      const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(retryTimer);if(frame)this.video.cancelVideoFrameCallback(frame);this.video.removeEventListener('seeked',seeked);this.video.removeEventListener('error',failed);this.cancelers.delete(cancel);error?reject(error):resolve();};
      const cancel=(error:Error)=>finish(error);
      const timer=setTimeout(()=>finish(new Error('Native seek did not present the target')),10000);
      const next=(_:number,metadata:VideoFrameCallbackMetadata)=>{
        if(finished)return;
        if(retired()){finish(new Error('Native seek presentation was retired'));return;}
        // A browser may report the frame's PTS or clip that timestamp to the seek
        // point (Firefox). Accept only the corresponding source-frame interval.
        // Legacy remux artifacts without packet metadata retain their prior guard.
        const matches=presentation?.matchesVideoFrame?.(target,metadata.mediaTime)??(expected!==undefined&&metadata.mediaTime>=expected+(presentation?.timelineBias??0)-.001&&metadata.mediaTime<=mediaTarget+.001);
        if(correlated&&matches&&Math.abs(this.video.currentTime-mediaTarget)<.001)presented=true;
        if(!this.video.seeking&&Math.abs(this.video.currentTime-mediaTarget)<.001&&(correlated?presented:metadata.mediaTime<=mediaTarget+.001)){accepted=true;if(completed)finish();}
        else frame=this.video.requestVideoFrameCallback(next);
      };
      // Register before currentTime changes: the compositor callback may precede
      // the queued DOM seeking/seeked events, especially for buffered media.
      this.cancelers.add(cancel);this.video.addEventListener('seeked',seeked);this.video.addEventListener('error',failed);frame=this.video.requestVideoFrameCallback(next);
      Promise.resolve().then(action).then(()=>{completed=true;if(accepted)finish();},error=>finish(error));
    });
  }
  async rate(value: number) {this.assertActive();if(this.selectiveAudio){this.requestedRate=value;if(this.mpvAudio)await this.mpvAudio.rate(value);}else {this.video.defaultPlaybackRate = value;this.video.playbackRate = value;}this.refresh();}
  async volume(value: number) {this.assertActive();if(this.selectiveAudio){this.requestedVolume=value;if(this.mpvAudio)await this.mpvAudio.volume(value);}else this.video.volume = value / 100;this.refresh();}
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
          const previous=this.remuxSource,position=this.sourceTime(),paused=this.video.paused;this.opening=true;
          try {await this.startRemux({...previous,audioTrack:Number(id)-1},position);}
          catch(error){try{await this.startRemux(previous,position);}catch(recovery){this.emit('error',String(recovery));}throw error;}
          finally{this.opening=false;if(!paused)await this.video.play();}
        }
        this.video.muted=false;this.refresh();return;
      }
      if (!audio || !audio[Number(id) - 1]) throw new Error('Native audio track selection is not supported for this source/browser');
      this.video.muted = false;Array.from(audio).forEach((t, i) => {t.enabled = i === Number(id) - 1;});
    } else {
      if(this.mpvSubs){await this.mpvSubs.select(id);this.selectedSub=id;this.applySubtitles();this.refresh();return;}
      if(Number(id)>=100001&&Number(id)<200001){const index=Number(id)-100001;if(!this.assAssets[index])throw Error('Unknown Native ASS track');await this.ass!.load(this.assAssets[index]);this.assIndex=index;}
      if (!['auto', 'no'].includes(id) && !this.assAssets[Number(id)-100001] && !Array.from(this.video.textTracks).some(t=>this.textTrackId(t)===id)) throw new Error('Unknown native subtitle track');
      this.selectedSub = id;this.applySubtitles();
    }
    this.refresh();
  }
  private applySubtitles() {
    this.mpvSubs?.visible(this.subsVisible&&this.selectedSub!=='no');
    this.ass?.visible(this.assIndex>=0&&this.subsVisible&&this.selectedSub!=='no'&&(this.selectedSub==='auto'||(Number(this.selectedSub)>=100001&&Number(this.selectedSub)<200001)));
    const preferred = this.video.querySelector<HTMLTrackElement>('track[default]')?.track;
    const autoIndex = preferred?Array.from(this.video.textTracks).indexOf(preferred):Array.from(this.video.textTracks).findIndex(t=>!this.captionAssets.has(t));
    Array.from(this.video.textTracks).forEach((t, i) => {t.mode = this.subsVisible && !(this.assIndex>=0&&this.selectedSub==='auto') && this.selectedSub !== 'no' && (this.selectedSub === 'auto' ? i === autoIndex : this.textTrackId(t) === this.selectedSub) ? 'showing' : 'disabled';});
  }
  async subtitleVisible(visible: boolean) {this.assertActive();this.subsVisible = visible;this.applySubtitles();this.refresh();}
  async addSubtitle(asset:SubtitleAsset) {
    this.assertActive();
    const cues=plainVTT(asset);
    if(cues){
      const url=URL.createObjectURL(new Blob([asset.bytes],{type:'text/vtt'}));this.captionURLs.add(url);
      try {
        const track=await this.loadTextTrack({src:url,label:asset.label,language:asset.language,default:false},true);
        // Disabled tracks hide their cue list; inspect before restoring selection.
        track.track.mode='hidden';
        const loaded=Array.from(track.track.cues??[]) as VTTCue[],bias=this.remux?.timelineBias??0;
        if(loaded.length!==cues.length||loaded.some((c,i)=>Math.abs(c.startTime-bias-cues[i].start)>1e-6||Math.abs(c.endTime-bias-cues[i].end)>1e-6||c.text!==cues[i].text)){
          track.remove();throw new BrowserCaptionUnsupported('Browser WebVTT cue fidelity verification failed');
        }
        this.captionAssets.set(track.track,{asset,index:this.captionAssets.size+1});
        if(asset.select){for(const old of Array.from(this.video.querySelectorAll('track')))old.default=false;track.default=true;}
        this.applySubtitles();this.refresh();return;
      }catch(error){URL.revokeObjectURL(url);this.captionURLs.delete(url);throw error;}
    }
    if(this.adapted&&this.audioAdaptation==='opus')throw Error('Native Opus plus ASS is not qualified');
    if(!this.nativeASS||!['ass','ssa'].includes(asset.format))throw Error('Native external ASS/SSA requires explicit experimental admission');
    if(this.assAssets.length>=16||asset.bytes.byteLength>8*1024*1024||this.assAssets.reduce((n,a)=>n+a.bytes.byteLength,0)+asset.bytes.byteLength>16*1024*1024)throw Error('Subtitle budget exceeded');
    if(!this.ass){
      const {NativeASS}=await import('./native-ass.js');this.assertActive();
      this.ass=new NativeASS(this.video,()=>this.sourceTime(),this.assetBase,this.fonts,error=>{if(!this.stopped)this.emit('error',String(error));});
    }
    if(asset.select){
      try{await this.ass.load(asset);this.assertActive();}catch(error){this.ass.destroy();this.ass=undefined;throw error;}
      this.assIndex=this.assAssets.length;
    }
    this.assAssets.push(asset);this.applySubtitles();this.refresh();
  }
  async addTextTrack(source: TextTrackSource) {await this.loadTextTrack(source);}
  private async loadTextTrack(source:TextTrackSource, ownedCaption=false) {
    this.assertActive();
    const url = new URL(source.src, location.href);
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Text tracks require HTTP, HTTPS or a blob URL');
    const track = document.createElement('track');track.kind = 'subtitles';track.label = source.label;track.srclang = source.language || '';track.default = !!source.default;track.src = url.href;
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {clearTimeout(timer);track.removeEventListener('load', loaded);track.removeEventListener('error', failed);this.cancelers.delete(cancel);if (error) {track.remove();reject(error);} else resolve();};
      const loaded = () => {this.shiftTextTrack(track);finish();};const failed = () => finish(ownedCaption?new BrowserCaptionUnsupported('Browser cannot load the owned WebVTT caption'):new Error('Native text track failed to load'));const cancel = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error('Native text track load timed out')),15000);
      this.cancelers.add(cancel);track.addEventListener('load', loaded);track.addEventListener('error', failed);this.video.append(track);track.addEventListener('load',()=>this.shiftTextTrack(track));track.track.mode = 'hidden';
    });
    this.applySubtitles();this.refresh();return track;
  }
  private shiftTextTrack(track: HTMLTrackElement) {
    if(!this.remux)return;
    for(const cue of Array.from(track.track.cues??[]))if(!this.shiftedCues.has(cue)){cue.startTime+=this.remux.timelineBias;cue.endTime+=this.remux.timelineBias;this.shiftedCues.add(cue);}
  }
  resize(width: number, height: number) {this.assertActive();this.video.width = width;this.video.height = height;}
  audioDiagnostics() {return this.mpvAudio?.diagnostics??{state: this.stopped ? 'closed' : this.video.paused ? 'paused' : 'running', source: 'native', decodedSampleCountersAvailable: false};}
  destroy():Promise<void> {
    if(this.destruction)return this.destruction;
    this.destruction=this.dispose();return this.destruction;
  }
  private async dispose() {
    this.stopped = true;await this.mpvAudio?.destroy();this.mpvAudio=undefined;await this.mpvSubs?.destroy();this.mpvSubs=undefined;this.ass?.destroy();this.ass=undefined;this.assAssets=[];for (const cancel of this.cancelers) cancel(new Error('Player is destroyed'));
    await this.remux?.destroy();
    this.gainSource?.disconnect();this.gainNode?.disconnect();if(this.gainContext)await this.gainContext.close();
    this.listeners.forEach(remove => remove());this.listeners = [];
    for(const url of this.captionURLs)URL.revokeObjectURL(url);this.captionURLs.clear();this.captionAssets.clear();
    this.video.pause();this.video.removeAttribute('src');this.video.replaceChildren();this.video.load();
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);this.objectURL = undefined;
  }
}
