// SPDX-License-Identifier: GPL-3.0-or-later
import type Shaka from 'shaka-player';
import type {Backend} from './backend.js';
import type {RemoteSource,TextTrackSource,SubtitleAsset,TrackType} from '../types.js';
import {NativePlayer} from './native-player.js';
import {ShakaNetworkPolicy} from './shaka-network.js';
import {PlayerError} from './errors.js';
import {plainVTT} from './plain-vtt.js';

type RuntimeLoad = {promise:Promise<typeof Shaka>; pending:boolean; users:number; cancel:()=>void};
const runtimes=new Map<string,RuntimeLoad>();
function runtimeAt(base:URL,signal:AbortSignal):Promise<typeof Shaka> {
  const aborted=()=>new PlayerError('ABORTED','Shaka runtime loading cancelled');
  if(signal.aborted)return Promise.reject(aborted());
  const url=new URL('web/vendor/shaka-player.js',base);
  if(url.origin!==location.origin)return Promise.reject(new PlayerError('ASSET_LOAD_FAILED','Shaka runtime must be same-origin'));
  let shared=runtimes.get(url.href);
  if(!shared){
    const controller=new AbortController();
    const entry:RuntimeLoad={promise:undefined!,pending:true,users:0,cancel:()=>{}};
    entry.promise=new Promise((resolve,reject)=>{
      let script:HTMLScriptElement|undefined,blob:string|undefined;
      const finish=(error?:Error)=>{
        if(!entry.pending)return;
        entry.pending=false;clearTimeout(timer);
        if(script){script.onload=null;script.onerror=null;script.remove();}
        if(blob)URL.revokeObjectURL(blob);
        if(error){controller.abort();if(runtimes.get(url.href)===entry)runtimes.delete(url.href);reject(error);}
        else resolve((globalThis as unknown as {shaka:typeof Shaka}).shaka);
      };
      entry.cancel=()=>finish(aborted());
      const timer=setTimeout(()=>finish(new PlayerError('ASSET_LOAD_FAILED','Shaka runtime loading timed out')),15000);
      // Removing a network script element does not reliably abort its download
      // or execution. Fetch is cancellable; the blob executes only while owned.
      void (async()=>{
        const response=await fetch(url.href,{signal:controller.signal,credentials:'same-origin',redirect:'error'});
        if(!response.ok)throw new Error('Shaka asset response failed');
        const code=await response.text();
        if(!entry.pending)return;
        blob=URL.createObjectURL(new Blob(['if(document.currentScript?.isConnected){\n',code,'\n}'],{type:'text/javascript'}));
        script=document.createElement('script');script.src=blob;script.async=true;
        script.onload=()=>{const runtime=(globalThis as unknown as {shaka?:typeof Shaka}).shaka;finish(runtime?.Player?undefined:new PlayerError('ASSET_LOAD_FAILED','Shaka runtime is unavailable'));};
        script.onerror=()=>finish(new PlayerError('ASSET_LOAD_FAILED','Shaka runtime execution failed'));
        document.head.append(script);
      })().catch(()=>finish(new PlayerError('ASSET_LOAD_FAILED','Shaka runtime loading failed')));
    });
    runtimes.set(url.href,entry);shared=entry;
  }
  const entry=shared;entry.users++;
  return new Promise((resolve,reject)=>{
    let done=false;
    const release=()=>{done=true;signal.removeEventListener('abort',cancel);if(--entry.users===0&&entry.pending)entry.cancel();};
    const cancel=()=>{if(done)return;release();reject(aborted());};
    signal.addEventListener('abort',cancel,{once:true});
    entry.promise.then(runtime=>{if(!done){release();resolve(runtime);}},error=>{if(!done){release();reject(error);}});
  });
}
/** Shaka exclusively owns adaptive manifests, scheduling, ABR and MediaSource.
 * NativePlayer supplies only media-element controls, output verification and gain. */
export class ShakaBackend extends EventTarget implements Backend {
  readonly ready=Promise.resolve();
  readonly properties=new Map<string,unknown>();
  private native:NativePlayer;
  private player?:Shaka.Player;
  private policy?:ShakaNetworkPolicy;
  private runtime?:typeof Shaka;
  private stopped=false;
  private runtimeLoad=new AbortController();
  private opening=false;
  private failure?:Error;
  private disposal?:Promise<void>;
  private listeners:Array<()=>void>=[];
  private blobs=new Set<string>();
  private external=new Map<number,number>();
  private visible=true;
  private selectedSub='auto';
  private audioDisabled=false;
  private source?:RemoteSource;
  constructor(private video:HTMLVideoElement,private assetBase=new URL('../../../',import.meta.url)) {
    super();this.native=new NativePlayer(video,'never',assetBase);
    for(const type of ['mpv','activity','error','log']) {
      const listener=(event:Event)=>{
        if(this.stopped)return;this.refresh();const detail=(event as CustomEvent).detail;
        if(type==='mpv'&&detail.event==='property-change'&&['track-list','native-live','native-seekable','duration'].includes(detail.name))detail.data=this.properties.get(detail.name);
        if(type==='error'&&this.opening)return;
        this.emit(type,detail);
      };
      this.native.addEventListener(type,listener);this.listeners.push(()=>this.native.removeEventListener(type,listener));
    }
    this.refresh();
  }
  private emit(type:string,detail:unknown){this.dispatchEvent(new CustomEvent(type,{detail}));}
  private active(){if(this.stopped)throw new PlayerError('ABORTED','Player is destroyed');}
  private loaded(){this.active();if(!this.player)throw new PlayerError('INVALID_ARGUMENT','No streaming source');return this.player;}
  private mapped(error:unknown):Error {
    if(this.policy?.terminalError)return this.policy.terminalError;
    if(error instanceof PlayerError)return error;
    const e=error as {category?:number;code?:number};
    if(this.stopped)return new PlayerError('ABORTED','Player is destroyed');
    if(e.category===1)return new Error(`Source transport: Shaka network failure (${e.code})`);
    if(e.category===6)return new PlayerError('UNSUPPORTED_FEATURE',`Shaka DRM is not configured (${e.code})`);
    if([2,3,4,5].includes(e.category??0))return new PlayerError('UNSUPPORTED_MEDIA',`Shaka cannot execute this stream (${e.code})`);
    return error instanceof Error?error:new Error(`Shaka operation failed (${e.code??'unknown'})`);
  }
  async open(_file:File|ArrayBuffer){throw new PlayerError('UNSUPPORTED_FEATURE','Shaka requires a remote HLS or DASH source');}
  async openRemote(source:RemoteSource) {
    this.active();if(this.player||this.opening)throw new PlayerError('INVALID_ARGUMENT','Shaka backend opens only one source');
    if(!['hls','dash'].includes(source.format??''))throw new PlayerError('INVALID_ARGUMENT','Shaka requires HLS or DASH format');
    if(source.streaming?.maxBandwidth!==undefined&&(!Number.isFinite(source.streaming.maxBandwidth)||source.streaming.maxBandwidth<=0))throw new PlayerError('INVALID_ARGUMENT','maxBandwidth must be positive');
    this.source=source;this.opening=true;
    try{
      const runtime=this.runtime=await runtimeAt(this.assetBase,this.runtimeLoad.signal);this.active();runtime.polyfill.installAll();
      if(!runtime.Player.isBrowserSupported())throw new PlayerError('UNSUPPORTED_MEDIA','Shaka MSE is unsupported by this browser');
      const player=this.player=new runtime.Player();
      this.policy=new ShakaNetworkPolicy(source,runtime);
      const network=player.getNetworkingEngine();if(!network)throw new PlayerError('ASSET_LOAD_FAILED','Shaka networking engine is unavailable');
      network.registerRequestFilter(this.policy.filter);
      const changed=()=>{if(!this.stopped){this.refresh();this.emit('mpv',{event:'property-change',name:'track-list',data:this.properties.get('track-list')});}};
      for(const name of ['trackschanged','adaptation','variantchanged','textchanged','texttrackvisibility','streaming','loaded','buffering']){player.addEventListener(name,changed);this.listeners.push(()=>player.removeEventListener(name,changed));}
      const failed=(event:Event)=>{const detail=(event as Event&{detail:{severity?:number}}).detail;if(detail.severity!==runtime.util.Error.Severity.CRITICAL)return;const error=this.failure=this.mapped(detail);if(!this.opening&&!this.stopped)this.emit('error',error);};
      player.addEventListener('error',failed);this.listeners.push(()=>player.removeEventListener('error',failed));
      player.configure({streaming:{preferNativeHls:false,preferNativeDash:false,useNativeHlsForFairPlay:false},abr:{enabled:!source.streaming?.representation},restrictions:{maxBandwidth:source.streaming?.maxBandwidth??Infinity}});
      await player.attach(this.video);this.active();
      await player.load(source.url,undefined,source.format==='hls'?'application/x-mpegurl':'application/dash+xml');this.active();
      if(this.failure)throw this.failure;
      if(player.getLoadMode()!==runtime.Player.LoadMode.MEDIA_SOURCE)throw new PlayerError('UNSUPPORTED_MEDIA','Shaka did not create an MSE presentation');
      if(player.isDynamic()&&source.streaming?.live!==true)throw new PlayerError('SOURCE_PERMISSION','Live streaming requires explicit live permission');
      const representation=source.streaming?.representation;
      if(representation){
        const variants=player.getVariantTracks(),active=variants.find(t=>t.active);
        const audioKey=(t:Shaka.extern.Track)=>JSON.stringify([t.audioLanguage??t.language,t.originalLanguage,t.label,t.audioRoles,t.channelsCount,t.audioCodec,t.spatialAudio,t.accessibilityPurpose]);
        const token=/^variant:(\d+)$/.exec(representation);
        const matches=variants.filter(t=>token?String(t.id)===token[1]:t.originalVideoId===representation||(!t.videoCodec&&t.originalAudioId===representation)).filter(t=>!active||audioKey(t)===audioKey(active));
        if(matches.length!==1)throw new PlayerError('UNSUPPORTED_FEATURE','Cannot preserve requested streaming representation and selected audio unambiguously');
        player.selectVariantTrack(matches[0],true);
      }
      this.applyText();this.refresh();this.emit('mpv',{event:'file-loaded'});
    }catch(error){throw this.mapped(error);}finally{this.opening=false;}
  }
  private refresh(){
    for(const [key,value] of this.native.properties)this.properties.set(key,value);
    const player=this.player;if(!player||this.stopped)return;
    const variants=player.getVariantTracks(), current=variants.find(t=>t.active),texts=player.getTextTracks(),audio=this.audioTracks();
    const tracks:Array<Record<string,unknown>>=audio.map(({track:t,id})=>({id,type:'audio',codec:t.codecs,title:t.label,lang:t.language,selected:t.active&&!this.audioDisabled}));
    tracks.push(...texts.map(t=>({id:`shaka-sub-${t.id}`,type:'sub',codec:t.codecs||t.mimeType,title:t.label,lang:t.language,selected:t.active&&this.visible&&this.selectedSub!=='no',external:this.external.has(t.id),...(this.external.has(t.id)?{'external-index':this.external.get(t.id)}:{})})));
    if(current?.videoCodec)tracks.push({id:`shaka-video-${current.videoId}`,type:'video',codec:current.videoCodec,selected:true,'demux-w':current.width,'demux-h':current.height});
    this.properties.set('track-list',tracks);this.properties.set('native-live',player.isDynamic());
    const range=player.seekRange();this.properties.set('native-seekable',range.end>range.start?[{start:range.start,end:range.end}]:[]);
    if(player.isDynamic())this.properties.set('duration',null);
  }
  private audioTracks(){
    const tracks=this.player?.getAudioTracks()??[];
    // Channels, rate and codecs can be discovered only after selection. They
    // are descriptive metadata, never a stable public track identity.
    const key=(t:Shaka.extern.AudioTrack)=>`shaka-audio-${encodeURIComponent(JSON.stringify([t.language,t.originalLanguage,t.label,t.roles,t.spatialAudio,t.accessibilityPurpose]))}`;
    return tracks.map((track,index)=>{const base=key(track),ambiguous=tracks.filter(t=>key(t)===base).length>1;return {track,id:ambiguous?`${base}:ambiguous:${index}`:base,ambiguous};});
  }
  private expected(){const selected=this.player?.getVariantTracks().find(t=>t.active);return {video:!!selected?.videoCodec,audio:!!selected?.audioCodec&&!this.audioDisabled};}
  async verifyStartup(_expected?:{video:boolean;audio:boolean},output=false){this.active();if(this.failure)throw this.failure;await this.native.verifyStartup(this.expected(),output);this.active();if(this.failure)throw this.failure;}
  verifyOutput(){return this.verifyStartup(undefined,true);}
  startupEvidence(){return {...this.native.diagnostics.capability,sourceBufferCreated:!!this.player&&this.player.getLoadMode()===this.runtime?.Player.LoadMode.MEDIA_SOURCE};}
  async play(){this.active();await this.native.play();}
  async pause(){this.active();await this.native.pause();}
  async seek(seconds:number){const range=this.loaded().seekRange();if(!Number.isFinite(seconds)||seconds<range.start-.01||seconds>range.end+.01)throw new PlayerError('INVALID_ARGUMENT','Seek target is outside the streaming seekable window');await this.native.seek(Math.max(range.start,Math.min(range.end,seconds)));}
  async rate(value:number){this.active();await this.native.rate(value);}
  async volume(value:number){this.active();await this.native.volume(value);}
  async gain(value:number){this.active();await this.native.gain(value);}
  async selectTrack(type:TrackType,id:string){
    const player=this.loaded();
    if(type==='audio'){
      if(id==='no'){this.audioDisabled=true;this.video.muted=true;}
      else{const audio=this.audioTracks();const candidates=id==='auto'?audio.filter(t=>t.track.active):audio.filter(t=>t.id===id);if(!audio.length&&id==='auto'){this.refresh();return;}if(candidates.length!==1||(id!=='auto'&&candidates[0].ambiguous))throw new PlayerError('UNSUPPORTED_FEATURE','Cannot preserve requested audio track');const requested=candidates[0].track,representation=this.source?.streaming?.representation;
        if(representation){
          const token=/^variant:(\d+)$/.exec(representation);
          const key=(language:string|null|undefined,originalLanguage:string|null|undefined,label:string|null|undefined,roles:string[]|null|undefined,spatial:boolean|null|undefined,purpose:unknown)=>JSON.stringify([language??'',originalLanguage??'',label??'',roles??[],!!spatial,purpose??null]);
          const expected=key(requested.language,requested.originalLanguage,requested.label,requested.roles,requested.spatialAudio,requested.accessibilityPurpose);
          const matches=player.getVariantTracks().filter(t=>(token?String(t.id)===token[1]:t.originalVideoId===representation||(!t.videoCodec&&t.originalAudioId===representation))&&t.bandwidth<=(this.source?.streaming?.maxBandwidth??Infinity)).filter(t=>
            key(t.audioLanguage??t.language,t.originalLanguage,t.label,t.audioRoles,t.spatialAudio,t.accessibilityPurpose)===expected&&
            (!t.channelsCount||!requested.channelsCount||t.channelsCount===requested.channelsCount)&&(!t.audioCodec||!requested.codecs||t.audioCodec===requested.codecs));
          if(matches.length!==1)throw new PlayerError('UNSUPPORTED_FEATURE','Cannot preserve pinned streaming representation and bandwidth with requested audio track');
          player.selectVariantTrack(matches[0],true);
          if(player.getVariantTracks().find(t=>t.active)?.id!==matches[0].id)throw new PlayerError('UNSUPPORTED_FEATURE','Shaka did not apply the pinned audio/video variant');
        }else player.selectAudioTrack(requested);
        this.audioDisabled=false;this.video.muted=false;}
    }else{
      if(id==='no'){this.selectedSub=id;this.applyText();}
      else{const texts=player.getTextTracks();const track=id==='auto'?texts.find(t=>t.active)??texts[0]:texts.find(t=>`shaka-sub-${t.id}`===id);if(!track&&id!=='auto')throw new PlayerError('UNSUPPORTED_FEATURE','Cannot preserve requested subtitle track');if(track)player.selectTextTrack(track);this.selectedSub=id;this.applyText();}
    }
    this.refresh();this.emit('mpv',{event:'property-change',name:'track-list',data:this.properties.get('track-list')});
  }
  private applyText(){const player=this.player;if(!player)return;if(!this.visible||this.selectedSub==='no'){player.selectTextTrack(null);return;}const texts=player.getTextTracks();const selected=this.selectedSub==='auto'?texts.find(t=>t.active)??texts[0]:texts.find(t=>`shaka-sub-${t.id}`===this.selectedSub);if(selected)player.selectTextTrack(selected);}
  async subtitleVisible(visible:boolean){this.active();this.visible=visible;this.applyText();this.refresh();}
  async addTextTrack(track:TextTrackSource){const player=this.loaded();this.policy!.authorize(track.src);const added=await player.addTextTrackAsync(track.src,track.language??'und','subtitle','text/vtt',undefined,track.label);this.active();this.external.set(added.id,this.external.size+1);if(track.default){player.selectTextTrack(added);this.selectedSub=`shaka-sub-${added.id}`;}this.applyText();this.refresh();}
  async addSubtitle(asset:SubtitleAsset){
    if(!plainVTT(asset))throw new PlayerError('UNSUPPORTED_FEATURE','Shaka external subtitles require plain WebVTT');
    const url=URL.createObjectURL(new Blob([asset.bytes],{type:'text/vtt'}));this.blobs.add(url);this.policy?.ownBlob(url);
    await this.addTextTrack({src:url,label:asset.label,language:asset.language,default:asset.select});
  }
  resize(width:number,height:number){this.native.resize(width,height);}
  audioDiagnostics(){return {...this.native.audioDiagnostics(),source:'shaka-mse'};}
  get diagnostics():Record<string,unknown>{const native=this.native.diagnostics;return {...native,path:'shaka-mse',plan:'shaka-mse',packaging:'shaka',streaming:{engine:'shaka',version:this.runtime?.Player.version,format:this.source?.format,live:this.player?.isDynamic()??false,seekRange:this.player?.seekRange(),abr:!this.source?.streaming?.representation,maxBandwidth:this.source?.streaming?.maxBandwidth,variants:this.player?.getVariantTracks().map(t=>({id:`variant:${t.id}`,representation:t.originalVideoId??t.originalAudioId,active:t.active,bandwidth:t.bandwidth,width:t.width,height:t.height,audioCodec:t.audioCodec,videoCodec:t.videoCodec})),network:this.policy?.diagnostics},capability:this.startupEvidence()};}
  destroy(){return this.disposal??(this.disposal=this.dispose());}
  private async dispose(){this.stopped=true;this.runtimeLoad.abort();this.listeners.splice(0).forEach(remove=>remove());this.policy?.destroy();try{await this.player?.destroy();}finally{this.player=undefined;await this.native.destroy();for(const url of this.blobs)URL.revokeObjectURL(url);this.blobs.clear();this.external.clear();this.source=undefined;}}
}
