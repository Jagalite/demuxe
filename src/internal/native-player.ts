import {nativeMediaError,compatibilityFailure} from './runtime-capability.js';
import {PlayerError} from './errors.js';
import type {CapabilityEvidence} from './runtime-capability.js';
import type {RemoteSource, TextTrackSource, TrackType, SubtitleAsset, FontAsset} from '../types.js';
import type {Backend} from './backend.js';

type RemuxSource = {file?: File; options?: RemoteSource; audioTrack?: number};
type RemuxTrack = {id: string; type: string; codec: string; selected: boolean};
type RemuxController = {
  audioAdaptation?:'flac'|'opus'; generation?:number;
  windowed?:boolean; ranges?():[number,number][]; duration?:number; playbackPaused?:boolean; playbackEnded?:boolean;
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
  private capability:CapabilityEvidence={};
  private ass?: import('./native-ass.js').NativeASS;
  private assAssets:SubtitleAsset[]=[];
  private assIndex=-1;
  private gainContext?: AudioContext;
  private gainSource?: MediaElementAudioSourceNode;
  private gainNode?: GainNode;
  private gainValue=1;
  async gain(value:number) {
    this.assertActive();
    if(!Number.isFinite(value)||value<0||value>1)throw new Error('Gain must be between 0 and 1');
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

  constructor(private video: HTMLVideoElement, private remuxPolicy: 'auto' | 'never' | 'always' = 'auto', private assetBase = new URL('../../../',import.meta.url), private bufferedSeeks=false, private audioAdaptation?:'flac'|'opus', private initialAudioTrack?:number, private nativeASS=false, private fonts:FontAsset[]=[], private requestedPlan?:string) {
    super();
    video.playsInline = true;
    video.preload = 'auto';
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
      const timer = setTimeout(() => finish(new Error(`Native ${event} timed out`)), 25000);
      this.cancelers.add(cancel);this.video.addEventListener(event, done, {once: true});this.video.addEventListener('error', failed, {once: true});
      try {start();} catch (error) {finish(error as Error);}
    });
  }
  private refresh() {
    const tracks: object[] = Array.from(this.video.textTracks, (t, i) => ({id: String(i + 1), type: 'sub', title: t.label, lang: t.language, selected: t.mode === 'showing'}));
    tracks.push(...this.assAssets.map((a,i)=>({id:String(100001+i),type:'sub',codec:a.format,title:a.label,lang:a.language,external:true,'external-index':i+1,selected:(this.selectedSub==='auto'||Number(this.selectedSub)===100001+i)&&this.assIndex===i})));
    const audio = (this.video as VideoWithAudioTracks).audioTracks;
    if(this.remux?.tracks)tracks.push(...this.remux.tracks.filter(t=>t.type==='audio').map(t=>({...t,selected:t.selected&&!this.video.muted})));
    else if (audio) tracks.push(...Array.from(audio, (t, i) => ({id: String(i + 1), type: 'audio', title: t.label, lang: t.language, selected: t.enabled})));
    const timeRanges=(r:TimeRanges)=>Array.from({length:r.length},(_,i)=>({start:Math.max(0,r.start(i)-(this.remux?.timelineBias??0)),end:Math.max(0,r.end(i)-(this.remux?.timelineBias??0))}));
    const values: Record<string, unknown> = {'time-pos': this.sourceTime(), duration: Number.isFinite(this.video.duration)?this.sourceDuration():null, 'native-buffered':this.remux?.windowed?(this.remux.ranges?.()??[]).map(([start,end])=>({start,end})):timeRanges(this.video.buffered),'native-seekable':this.remux?.windowed?[{start:0,end:this.sourceDuration()}]:timeRanges(this.video.seekable),'native-live':this.video.duration===Infinity, pause: this.remux?.playbackPaused??this.video.paused, 'eof-reached': this.remux?.playbackEnded??this.video.ended, volume: this.video.volume * 100, speed: this.video.playbackRate, 'track-list': tracks};
    for (const [name, data] of Object.entries(values)) {
      if (name !== 'track-list' && this.properties.get(name) === data) continue;
      this.properties.set(name, data);this.emit('mpv', {event: 'property-change', name, data});
    }
  }
  get diagnostics() {const q = this.video.getVideoPlaybackQuality();return {capability:{...this.capability,...(this.remux?.snapshot().capability as CapabilityEvidence??{})},path: 'native', plan:this.remux?(this.adapted?`adapted-${this.audioAdaptation}`:'remux'):'direct', subtitleOverlay:this.ass?{component:'libass',scope:'external-ass',destination:'container-only',...this.ass.stats}:undefined, audioProcessing:{component:this.gainContext?'web-audio-gain':'media-element',gain:this.gainValue,contextState:this.gainContext?.state,baseLatency:this.gainContext?.baseLatency}, directFailure:this.directFailure, remux:this.remux?.snapshot(), position: this.sourceTime(), rendered: q.totalVideoFrames, dropped: q.droppedVideoFrames, readyState: this.video.readyState};}
  private async load(url: string) {
    await this.wait('loadeddata', () => {this.video.src = url;this.video.load();});
    this.capability.metadata=true;
    this.refresh();this.emit('mpv', {event: 'file-loaded'});
  }
  /** Paused open must establish decoded current data, not merely metadata or a
   * canplay event. Presentation/audio counters are recorded only when observable. */
  async verifyStartup(expected?:{video:boolean;audio:boolean}) {
    this.assertActive();
    await new Promise<void>((resolve,reject)=>{
      let finished=false,frame=0;
      const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(poll);if(frame)this.video.cancelVideoFrameCallback(frame);this.cancelers.delete(cancel);error?reject(error):resolve();};
      const cancel=(error:Error)=>finish(error);
      const check=()=>{
        if(this.stopped){finish(new Error('Player is destroyed'));return;}
        if(this.video.error){clearInterval(poll);void this.classifyDirectFailure(nativeMediaError(this.video.error)).then(error=>finish(error instanceof Error?error:new Error(String(error))),error=>finish(error));return;}
        const v=this.video as HTMLVideoElement & {webkitAudioDecodedByteCount?:number};
        this.capability.metadata=v.readyState>=1;
        const hasVideo=expected?.video??v.videoWidth>0;
        const decoded=v.getVideoPlaybackQuality().totalVideoFrames>0;
        if(decoded)this.capability.decoderOutput=true;
        if((v.webkitAudioDecodedByteCount??0)>0)this.capability.audioProgress=true;
        // Browsers without audio counters expose readiness, not sample proof.
        const audioReady=!expected?.audio||v.webkitAudioDecodedByteCount===undefined||this.capability.audioProgress;
        if(v.readyState>=3&&!v.seeking&&(!hasVideo||(v.videoWidth>0&&decoded))&&audioReady){this.capability.playbackReady=true;finish();}
      };
      const timer=setTimeout(()=>{
        const v=this.video as HTMLVideoElement & {webkitAudioDecodedByteCount?:number};
        const missingOutput=v.readyState>=3&&((expected?.video&&!v.videoWidth)||(expected?.audio&&v.webkitAudioDecodedByteCount===0));
        finish(missingOutput?new PlayerError('DECODE_FAILED','Native selected track produced no decoded output'):new Error('Native startup evidence timed out'));
      },10000);
      const poll=setInterval(check,25);this.cancelers.add(cancel);
      if(typeof this.video.requestVideoFrameCallback==='function')frame=this.video.requestVideoFrameCallback(()=>{if(!finished&&!this.stopped){this.capability.videoPresented=true;check();}});
      check();
    });
  }
  private async startRemux(source: RemuxSource, target=0) {
    this.assertActive();
    if(!crossOriginIsolated||typeof MediaSource==='undefined')throw Error('Native remux requires MediaSource and cross-origin isolation');
    if(source.options?.format&&source.options.format!=='file')throw Error('Native remux currently requires a random-access file source; use Hybrid for this manifest');
    const moduleURL=new URL('web/native-remux-player.js',this.assetBase).href;
    const {RemuxPlayer}=await import(moduleURL);
    this.assertActive();
    const {refreshAuthorization,...options}=source.options??{};
    const transport={...source,...(source.options?{options:options as RemoteSource}:{}),refreshAuthorization};
    const attempt=async(adapted:boolean)=>{
      this.assertActive();this.adapted=adapted;
      this.remux??=new RemuxPlayer(this.video,{bufferedSeeks:this.bufferedSeeks,audioAdaptation:adapted?this.audioAdaptation:undefined}) as RemuxController;
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
    try {await this.loadPlan({file:local,audioTrack:this.initialAudioTrack},()=>this.load(this.objectURL!));}
    catch(error){URL.revokeObjectURL(this.objectURL);this.objectURL=undefined;throw error;}
  }
  async openRemote(source: RemoteSource) {
    this.assertActive();
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
      try{await this.load(url.href);}catch(error){throw await this.classifyDirectFailure(error);}
    },requiresRemux);
  }
  private async classifyDirectFailure(error:unknown):Promise<unknown> {
    const source=this.remoteSource;
    if(this.stopped||this.remux||!source||!compatibilityFailure(error))return error;
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
  async play() {this.assertActive();await this.resumeGain();this.assertActive();if(this.remux)await this.remux.play();else await this.video.play();this.refresh();}
  async pause() {this.assertActive();if(this.remux)this.remux.pause();else this.video.pause();this.refresh();}
  async seek(seconds: number) {
    this.assertActive();
    if(this.remux){
      const paused=this.remux.playbackPaused??this.video.paused;
      if(this.remux.canSeekBuffered?.(seconds)&&this.video.videoWidth&&Math.abs(this.sourceTime()-seconds)>.001){
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
      let frame=0,accepted=false,completed=false,finished=false;
      const presentation=this.remux,generation=presentation?.generation,mediaTarget=target+(presentation?.timelineBias??0),expected=presentation?.expectedVideoFrame?.(target);
      const correlated=!!presentation?.muxedFrames||expected!==undefined;let presented=false;
      const seeked=()=>{if(this.stopped||this.remux!==presentation||presentation?.generation!==generation){finish(new Error('Native seek presentation was retired'));return;}if(correlated&&presented&&!this.video.seeking&&Math.abs(this.video.currentTime-mediaTarget)<.001){accepted=true;if(completed)finish();}};
      const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);this.video.cancelVideoFrameCallback(frame);this.video.removeEventListener('seeked',seeked);this.cancelers.delete(cancel);error?reject(error):resolve();};
      const cancel=(error:Error)=>finish(error);
      const timer=setTimeout(()=>finish(new Error('Native seek did not present the target')),10000);
      const next=(_:number,metadata:VideoFrameCallbackMetadata)=>{
        if(this.stopped||this.remux!==presentation||presentation?.generation!==generation){finish(new Error('Native seek presentation was retired'));return;}
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
      this.cancelers.add(cancel);this.video.addEventListener('seeked',seeked);frame=this.video.requestVideoFrameCallback(next);
      Promise.resolve().then(action).then(()=>{completed=true;if(accepted)finish();},error=>finish(error));
    });
  }
  async rate(value: number) {this.assertActive();this.video.defaultPlaybackRate = value;this.video.playbackRate = value;this.refresh();}
  async volume(value: number) {this.assertActive();this.video.volume = value / 100;this.refresh();}
  async selectTrack(type: TrackType, id: string) {
    this.assertActive();
    if (type === 'audio') {
      const audio = (this.video as VideoWithAudioTracks).audioTracks;
      if (id === 'auto') {this.video.muted = false;return;}
      if (id === 'no') {this.video.muted = true;return;}
      if(this.remux&&this.remuxSource){
        const track=this.remux.tracks?.find(t=>t.type==='audio'&&t.id===id);
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
      if(Number(id)>=100001){const index=Number(id)-100001;if(!this.assAssets[index])throw Error('Unknown Native ASS track');await this.ass!.load(this.assAssets[index]);this.assIndex=index;}
      if (!['auto', 'no'].includes(id) && !this.assAssets[Number(id)-100001] && !this.video.textTracks[Number(id) - 1]) throw new Error('Unknown native subtitle track');
      this.selectedSub = id;this.applySubtitles();
    }
    this.refresh();
  }
  private applySubtitles() {
    this.ass?.visible(this.assIndex>=0&&this.subsVisible&&this.selectedSub!=='no'&&(this.selectedSub==='auto'||Number(this.selectedSub)>=100001));
    const preferred = this.video.querySelector<HTMLTrackElement>('track[default]')?.track;
    const autoIndex = Math.max(0, Array.from(this.video.textTracks).findIndex(t => t === preferred));
    Array.from(this.video.textTracks).forEach((t, i) => {t.mode = this.subsVisible && !(this.assIndex>=0&&this.selectedSub==='auto') && this.selectedSub !== 'no' && (this.selectedSub === 'auto' ? i === autoIndex : i === Number(this.selectedSub) - 1) ? 'showing' : 'disabled';});
  }
  async subtitleVisible(visible: boolean) {this.assertActive();this.subsVisible = visible;this.applySubtitles();this.refresh();}
  async addSubtitle(asset:SubtitleAsset) {
    this.assertActive();
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
  async addTextTrack(source: TextTrackSource) {
    this.assertActive();
    const url = new URL(source.src, location.href);
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Text tracks require HTTP, HTTPS or a blob URL');
    const track = document.createElement('track');track.kind = 'subtitles';track.label = source.label;track.srclang = source.language || '';track.default = !!source.default;track.src = url.href;
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {clearTimeout(timer);track.removeEventListener('load', loaded);track.removeEventListener('error', failed);this.cancelers.delete(cancel);if (error) {track.remove();reject(error);} else resolve();};
      const loaded = () => {this.shiftTextTrack(track);finish();};const failed = () => finish(new Error('Native text track failed to load'));const cancel = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error('Native text track load timed out')),15000);
      this.cancelers.add(cancel);track.addEventListener('load', loaded);track.addEventListener('error', failed);this.video.append(track);track.addEventListener('load',()=>this.shiftTextTrack(track));track.track.mode = 'hidden';
    });
    this.applySubtitles();this.refresh();
  }
  private shiftTextTrack(track: HTMLTrackElement) {
    if(!this.remux)return;
    for(const cue of Array.from(track.track.cues??[]))if(!this.shiftedCues.has(cue)){cue.startTime+=this.remux.timelineBias;cue.endTime+=this.remux.timelineBias;this.shiftedCues.add(cue);}
  }
  resize(width: number, height: number) {this.assertActive();this.video.width = width;this.video.height = height;}
  audioDiagnostics() {return {state: this.stopped ? 'closed' : this.video.paused ? 'paused' : 'running', source: 'native', decodedSampleCountersAvailable: false};}
  destroy():Promise<void> {
    if(this.destruction)return this.destruction;
    this.destruction=this.dispose();return this.destruction;
  }
  private async dispose() {
    this.stopped = true;this.ass?.destroy();this.ass=undefined;this.assAssets=[];for (const cancel of this.cancelers) cancel(new Error('Player is destroyed'));
    await this.remux?.destroy();
    this.gainSource?.disconnect();this.gainNode?.disconnect();if(this.gainContext)await this.gainContext.close();
    this.listeners.forEach(remove => remove());this.listeners = [];
    this.video.pause();this.video.removeAttribute('src');this.video.replaceChildren();this.video.load();
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);this.objectURL = undefined;
  }
}
