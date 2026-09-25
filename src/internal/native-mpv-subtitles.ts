// SPDX-License-Identifier: Apache-2.0
import type {FontAsset} from '../types.js';
import {PlayerError} from './errors.js';
/** mpv embedded subtitle rendering on the accepted media timeline. One bounded RPC at a time. */
export class NativeMpvSubtitles {
  readonly canvas=document.createElement('canvas');
  private worker:Worker;
  private closed?:()=>void;
  private destruction?:Promise<void>;
  private pending=new Map<number,{resolve:(value:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private sequence=0;
  private revision=0;
  private timingEpoch=0;
  private deadlineEpoch=-1;
  private schedulerMode:'deadline'|'animated'|'fallback'='fallback';
  private pumpTimer?:ReturnType<typeof setInterval>;
  private pumpBusy=false;
  private stopped=false;
  private enabled=false;
  private busy=false;
  private changingTrack=false;
  private frame=0;
  private last='';
  private lastRevision=-1;
  private verifiedTrack?:number;
  private loading=new AbortController();
  private observer?:ResizeObserver;
  private handlers:Array<()=>void>=[];
  readonly ready:Promise<void>;
  tracks:Array<{id:string;mpvId:number;'ff-index':number;type:string;selected?:boolean;default?:boolean}>=[];
  service:Record<string,unknown>={};
  readonly stats={position:-1,renders:0,bitmapUpdates:0,bytes:0,peakBytes:0,discarded:0,stateUpdates:0,scheduler:'frame'};
  constructor(private video:HTMLVideoElement,private time:()=>number,base:URL,fonts:FontAsset[],private file:File,private failed:(e:Error)=>void,private defaultStreamIndex?:number){
    if(!crossOriginIsolated)throw Error('Native mpv subtitles requires cross-origin isolation');
    this.canvas.className='demuxe-native-ass';this.canvas.style.cssText='position:absolute;pointer-events:none;display:none';
    if(!video.parentElement)throw Error('Missing Native presentation container');
    // Worker construction can synchronously fail (CSP, URL or allocation).
    // Do not attach a canvas until its owner exists.
    this.worker=new Worker(new URL('web/mpv-subtitle-worker.js',base),{type:'module'});
    const parent=video.parentElement,prior={position:parent.style.position,fit:video.style.objectFit,pip:video.disablePictureInPicture,remote:video.disableRemotePlayback};
    try {
    parent.style.position='relative';parent.append(this.canvas);
    video.style.objectFit='contain';
    video.disablePictureInPicture=true;video.disableRemotePlayback=true;
    this.worker.onmessage=({data})=>{if(data.type==='closed'){this.closed?.();return;}if(data.type==='subtitleTimingChanged'){this.timingEpoch=data.epoch>>>0;if(this.schedulerMode!=='fallback')void this.pump();return;}if(data.type==='subtitleDeadline'){if(this.schedulerMode==='deadline'&&data.epoch===this.deadlineEpoch&&!this.video.paused&&!document.hidden){if(this.time()+.004>=data.target)this.invalidate();else void this.pump();}return;}const p=this.pending.get(data.id);if(!p){data.bitmap?.close();return;}clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.reject(/^Error: Subtitle (?:decoder unavailable|decode failed|packet deadline exceeded|source load failed|selection failed|seek failed)/.test(data.error)?new PlayerError('UNSUPPORTED_FEATURE',data.error):Error(data.error)):p.resolve(data);};
    this.worker.onerror=e=>{e.preventDefault();this.fail(Error(e.message||'Subtitle worker failed'));};
    this.worker.onmessageerror=()=>this.fail(Error('Subtitle worker message failure'));
    this.observer=new ResizeObserver(()=>this.invalidate());this.observer.observe(video);
    for(const event of ['seeked','seeking','pause','play','ratechange','loadedmetadata','ended']){
      const listener=()=>{this.syncPump();this.invalidate();};video.addEventListener(event,listener);this.handlers.push(()=>video.removeEventListener(event,listener));
    }
    const visibility=()=>{this.syncPump();this.invalidate();};
    document.addEventListener('visibilitychange',visibility);this.handlers.push(()=>document.removeEventListener('visibilitychange',visibility));
    const fullscreen=()=>{if(document.fullscreenElement===video)this.fail(Error('Native mpv subtitles requires fullscreen on the player container, not the video element'));else this.invalidate();};
    document.addEventListener('fullscreenchange',fullscreen);this.handlers.push(()=>document.removeEventListener('fullscreenchange',fullscreen));
    this.ready=(async()=>{
      const deadline=setTimeout(()=>this.loading.abort(),25000);
      try {
      const response=await fetch(new URL('fixtures/DejaVuSans.ttf',base),{signal:this.loading.signal});
      if(!response.ok)throw Error('Subtitle default font unavailable');
      const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw Error('Subtitle font budget exceeded');
      if(this.stopped)throw Error('Subtitle renderer destroyed');
      const result=await this.request('init',{file:this.file,fonts:[{name:'DejaVuSans.ttf',bytes},...fonts]});this.tracks=result.tracks;
      for(const track of this.tracks)track.default=track['ff-index']===this.defaultStreamIndex;
      } finally {clearTimeout(deadline);}
    })();
    this.ready.catch(()=>{});
    } catch(error) {
      this.destroy();parent.style.position=prior.position;video.style.objectFit=prior.fit;
      video.disablePictureInPicture=prior.pip;video.disableRemotePlayback=prior.remote;
      throw error;
    }
  }
  private request(type:string,data:Record<string,unknown>={},signal?:AbortSignal) {
    if(signal?.aborted)return Promise.reject(signal.reason);
    if(this.stopped)return Promise.reject(Error('Subtitle renderer destroyed'));
    const id=++this.sequence;
    return new Promise<any>((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);this.pending.delete(id);signal?.removeEventListener('abort',abort);};
      const abort=()=>{cleanup();reject(signal!.reason);};
      const timer=setTimeout(()=>this.fail(Error('Subtitle worker deadline exceeded')),25000);
      this.pending.set(id,{resolve:value=>{cleanup();resolve(value);},reject:error=>{cleanup();reject(error);},timer});
      signal?.addEventListener('abort',abort,{once:true});
      try{this.worker.postMessage({id,type,...data});}catch(error){cleanup();reject(error);}
    });
  }
  private fail(error:Error){if(this.stopped)return;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.destroy();this.failed(error);}
  private applyMode(mode:unknown){
    const next=mode==='deadline'||mode==='animated'?mode:'fallback';
    if(this.schedulerMode===next)return;
    this.schedulerMode=next;this.stats.scheduler=next==='fallback'?'frame':next;
    this.syncPump();this.invalidate();
  }
  private syncPump(){
    const running=this.schedulerMode!=='fallback'&&this.enabled&&!this.changingTrack&&!this.video.paused&&!this.video.ended&&!document.hidden;
    if(running){if(!this.pumpTimer){this.pumpTimer=setInterval(()=>{void this.pump();},100);void this.pump();}}
    else {if(this.pumpTimer){clearInterval(this.pumpTimer);this.pumpTimer=undefined;}this.deadlineEpoch=-1;if(this.schedulerMode==='deadline'&&!this.stopped)void this.request('cancelDeadline').catch(error=>this.fail(error));}
  }
  private async pump(){
    if(this.pumpBusy||this.stopped||this.schedulerMode==='fallback'||!this.enabled||this.changingTrack||this.video.paused||this.video.ended||document.hidden)return;
    this.pumpBusy=true;
    try{
      const result=await this.request('pump',{seconds:this.time(),rate:this.video.playbackRate,running:true});
      if(this.stopped)return;
      this.service=result.service??this.service;
      this.applyMode(result.mode);
      this.stats.stateUpdates++;
      this.deadlineEpoch=result.schedule?.epoch??-1;
      if(result.timingChanged)this.invalidate();
    }catch(error){this.fail(error as Error);}
    finally{this.pumpBusy=false;}
  }
  async select(id:string){
    await this.ready;
    const track=id==='no'?undefined:id==='auto'?(this.tracks.find(t=>t.default)??this.tracks[0]):this.tracks.find(t=>t.id===id);
    if(track?.selected)return;
    if(!track&&id!=='no')throw new PlayerError('UNSUPPORTED_FEATURE','Requested subtitle track was not enumerated by mpv');
    const previous=this.tracks.find(t=>t.selected);
    this.changingTrack=true;this.applyMode('fallback');this.syncPump();this.revision++;
    try{
      await this.request('select',{trackId:track?.mpvId??-2});this.tracks.forEach(t=>t.selected=t===track);this.verifiedTrack=undefined;
      if(track){await this.verify();const profile=await this.request('profile');this.applyMode(profile.mode);}
    }catch(error){
      if(!this.stopped){await this.request('select',{trackId:previous?.mpvId??-2});this.tracks.forEach(t=>t.selected=t===previous);this.verifiedTrack=undefined;}
      throw error;
    }
    finally{this.changingTrack=false;this.syncPump();this.invalidate();}
  }
  async verify(signal?:AbortSignal){
    signal?.throwIfAborted();
    const selected=this.tracks.find(t=>t.selected);
    if(!selected||this.verifiedTrack===selected.mpvId)return;
    const width=Math.min(1920,this.video.videoWidth||this.video.width),height=Math.min(1080,this.video.videoHeight||this.video.height);
    const now=this.time(),duration=this.video.duration;
    const samples=[now,0,1,2,5,10,20,30].filter((time,index,list)=>time>=0&&(!Number.isFinite(duration)||time<duration)&&list.indexOf(time)===index);
    let visible=false;
    try{
      for(const seconds of samples){
        const result=await this.request('render',{seconds,width,height,force:true},signal);result.bitmap?.close();signal?.throwIfAborted();this.service=result.service;
        if(result.hasOverlay){visible=true;break;}
      }
    }finally{
      // Verification samples must not leave mpv ahead of the browser A/V clock.
      if(!signal?.aborted){const result=await this.request('render',{seconds:this.time(),width,height,force:true},signal);result.bitmap?.close();signal?.throwIfAborted();this.service=result.service;}
      else this.invalidate();
    }
    if(!visible)throw new PlayerError('UNSUPPORTED_FEATURE','Selected subtitle track produced no output in the bounded startup window');
    this.verifiedTrack=selected.mpvId;
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
    const newerNotification=this.timingEpoch!==result.epoch&&((this.timingEpoch-result.epoch)>>>0)<0x80000000;
    return {...result,revision,stale:result.unstable||this.stopped||revision!==this.revision||newerNotification};
  }
  suspend(value:boolean){this.changingTrack=value;this.revision++;this.syncPump();if(!value)this.invalidate();}
  async seek(seconds:number){this.changingTrack=true;this.revision++;this.syncPump();this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);try{await this.request('seek',{seconds});}finally{this.changingTrack=false;this.syncPump();this.invalidate();}}
  visible(value:boolean){this.enabled=value;this.canvas.style.display=value?'block':'none';this.syncPump();this.invalidate();}
  private invalidate(){this.revision++;this.last='';if(!this.stopped&&!this.frame)this.frame=requestAnimationFrame(()=>this.tick());}
  private tick(){
    this.frame=0;if(this.stopped||!this.enabled||this.changingTrack||this.schedulerMode==='deadline'&&document.hidden)return;
    const rect=this.video.getBoundingClientRect(),parent=this.video.parentElement!.getBoundingClientRect();
    const ratio=this.video.videoWidth/this.video.videoHeight;
    let width=rect.width,height=rect.height;
    if(Number.isFinite(ratio)){if(width/height>ratio)width=height*ratio;else height=width/ratio;}
    if(width<1||height<1){this.frame=requestAnimationFrame(()=>this.tick());return;}
    this.canvas.style.left=`${rect.left-parent.left+(rect.width-width)/2}px`;this.canvas.style.top=`${rect.top-parent.top+(rect.height-height)/2}px`;
    this.canvas.style.width=`${width}px`;this.canvas.style.height=`${height}px`;
    const scale=Math.min(1,1920/width,1080/height),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const sourceWidth=this.video.videoWidth,sourceHeight=this.video.videoHeight;
    const seconds=this.time(),key=`${w}:${h}:${sourceWidth}:${sourceHeight}:${seconds}`,revision=this.revision;
    if(!this.busy&&key!==this.last){
      this.busy=true;
      this.request('render',{seconds,width:w,height:h,sourceWidth,sourceHeight,force:this.lastRevision!==revision,rate:this.video.playbackRate,running:!this.video.paused&&!this.video.ended&&!document.hidden}).then(({bitmap,size,unchanged,service,mode,schedule}:{bitmap?:ImageBitmap;size:number;unchanged?:boolean;service:Record<string,unknown>;mode?:string;schedule?:{epoch:number}})=>{
        this.service=service;
        this.applyMode(mode);if(this.schedulerMode==='deadline')this.deadlineEpoch=schedule?.epoch??-1;
        if(this.stopped||!this.enabled||revision!==this.revision){bitmap?.close();this.stats.discarded++;return;}
        this.lastRevision=revision;this.stats.position=seconds;
        if(unchanged){this.stats.renders++;this.last=key;return;}
        // Resize only when a complete accepted replacement bitmap is ready. A
        // paused resize must redraw active cues even if libass reports unchanged.
        this.canvas.width=w;this.canvas.height=h;const context=this.canvas.getContext('2d')!;
        if(bitmap){context.drawImage(bitmap,0,0);bitmap.close();}
        this.stats.renders++;this.stats.bitmapUpdates++;this.stats.bytes+=size;this.stats.peakBytes=Math.max(this.stats.peakBytes,size);this.last=key;
      },error=>this.fail(error)).finally(()=>{
        this.busy=false;
        // A static invalidation can arrive while this render is in flight.
        // The old response is discarded above, so schedule its replacement.
        if(this.schedulerMode==='deadline'&&!this.stopped&&this.enabled&&revision!==this.revision)this.invalidate();
      });
    }
    if(this.schedulerMode!=='deadline'&&(!this.video.paused||this.busy||this.last!==key))this.frame=requestAnimationFrame(()=>this.tick());
  }
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    this.destruction=new Promise(resolve=>{const timer=setTimeout(()=>{this.worker.terminate();resolve();},5000);this.closed=()=>{clearTimeout(timer);this.worker.terminate();resolve();};});this.stopped=true;this.revision++;this.loading.abort();cancelAnimationFrame(this.frame);
    if(this.pumpTimer)clearInterval(this.pumpTimer);this.pumpTimer=undefined;this.observer?.disconnect();this.handlers.forEach(f=>f());this.worker.postMessage({type:'close'});
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Subtitle renderer destroyed'));}this.pending.clear();
    this.canvas.remove();return this.destruction;
  }
}
