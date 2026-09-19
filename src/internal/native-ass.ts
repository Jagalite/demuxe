// SPDX-License-Identifier: GPL-3.0-or-later
import type {FontAsset,SubtitleAsset} from '../types.js';
type Tile={x:number;y:number;w:number;h:number;color:number;bytes:Uint8Array};
/** External ASS rendering on the accepted media timeline. One bounded RPC at a time. */
export class NativeASS {
  readonly canvas=document.createElement('canvas');
  private worker:Worker;
  private pending=new Map<number,{resolve:(value:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private sequence=0;
  private revision=0;
  private stopped=false;
  private enabled=false;
  private busy=false;
  private changingTrack=false;
  private frame=0;
  private last='';
  private lastRevision=-1;
  private loading=new AbortController();
  private observer?:ResizeObserver;
  private handlers:Array<()=>void>=[];
  readonly ready:Promise<void>;
  readonly stats={renders:0,bitmapUpdates:0,bytes:0,peakBytes:0,discarded:0};
  constructor(private video:HTMLVideoElement,private time:()=>number,base:URL,fonts:FontAsset[],private failed:(e:Error)=>void){
    if(!crossOriginIsolated)throw Error('Native ASS requires cross-origin isolation');
    this.canvas.className='demuxe-native-ass';this.canvas.style.cssText='position:absolute;pointer-events:none;display:none';
    if(!video.parentElement)throw Error('Missing Native presentation container');
    // Worker construction can synchronously fail (CSP, URL or allocation).
    // Do not attach a canvas until its owner exists.
    this.worker=new Worker(new URL('web/native-ass-worker.js',base),{type:'module'});
    const parent=video.parentElement,prior={position:parent.style.position,fit:video.style.objectFit,pip:video.disablePictureInPicture,remote:video.disableRemotePlayback};
    try {
    parent.style.position='relative';parent.append(this.canvas);
    video.style.objectFit='contain';
    video.disablePictureInPicture=true;video.disableRemotePlayback=true;
    this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data);};
    this.worker.onerror=e=>{e.preventDefault();this.fail(Error(e.message||'Subtitle worker failed'));};
    this.worker.onmessageerror=()=>this.fail(Error('Subtitle worker message failure'));
    this.observer=new ResizeObserver(()=>this.invalidate());this.observer.observe(video);
    for(const event of ['seeked','seeking','pause','play','ratechange','loadedmetadata']){
      const listener=()=>this.invalidate();video.addEventListener(event,listener);this.handlers.push(()=>video.removeEventListener(event,listener));
    }
    const fullscreen=()=>{if(document.fullscreenElement===video)this.fail(Error('Native ASS requires fullscreen on the player container, not the video element'));else this.invalidate();};
    document.addEventListener('fullscreenchange',fullscreen);this.handlers.push(()=>document.removeEventListener('fullscreenchange',fullscreen));
    this.ready=(async()=>{
      const deadline=setTimeout(()=>this.loading.abort(),10000);
      try {
      const response=await fetch(new URL('fixtures/DejaVuSans.ttf',base),{signal:this.loading.signal});
      if(!response.ok)throw Error('Subtitle default font unavailable');
      const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw Error('Subtitle font budget exceeded');
      if(this.stopped)throw Error('Subtitle renderer destroyed');
      await this.request('init',{fonts:[{name:'DejaVuSans.ttf',bytes},...fonts]});
      } finally {clearTimeout(deadline);}
    })();
    this.ready.catch(()=>{});
    } catch(error) {
      this.destroy();parent.style.position=prior.position;video.style.objectFit=prior.fit;
      video.disablePictureInPicture=prior.pip;video.disableRemotePlayback=prior.remote;
      throw error;
    }
  }
  private request(type:string,data:Record<string,unknown>={}) {
    if(this.stopped)return Promise.reject(Error('Subtitle renderer destroyed'));
    const id=++this.sequence;
    return new Promise<any>((resolve,reject)=>{
      const timer=setTimeout(()=>this.fail(Error('Subtitle worker deadline exceeded')),10000);
      this.pending.set(id,{resolve,reject,timer});
      try{this.worker.postMessage({id,type,...data});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
    });
  }
  private fail(error:Error){if(this.stopped)return;this.destroy();this.failed(error);}
  async load(asset:SubtitleAsset){
    await this.ready;
    // Keep the accepted bitmap visible until parsing succeeds. Prevent render
    // requests from racing the track transaction; rejected parses retain the old
    // native track and force a fresh render on the same presentation timeline.
    this.changingTrack=true;this.revision++;
    try {await this.request('load',{bytes:asset.bytes});}
    finally {this.changingTrack=false;this.invalidate();}
  }
  visible(value:boolean){this.enabled=value;this.canvas.style.display=value?'block':'none';this.invalidate();}
  private invalidate(){this.revision++;this.last='';if(!this.stopped&&!this.frame)this.frame=requestAnimationFrame(()=>this.tick());}
  private tick(){
    this.frame=0;if(this.stopped||!this.enabled||this.changingTrack)return;
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
      this.request('render',{seconds,width:w,height:h,sourceWidth,sourceHeight,force:this.lastRevision!==revision}).then(({tiles,size,unchanged}:{tiles:Tile[];size:number;unchanged?:boolean})=>{
        if(this.stopped||!this.enabled||revision!==this.revision){this.stats.discarded++;return;}
        this.lastRevision=revision;
        if(unchanged){this.stats.renders++;this.last=key;return;}
        // Resize only when a complete accepted replacement bitmap is ready. A
        // paused resize must redraw active cues even if libass reports unchanged.
        this.canvas.width=w;this.canvas.height=h;const context=this.canvas.getContext('2d')!;
        for(const t of tiles){
          const pixels=new ImageData(t.w,t.h);
          for(let i=0;i<t.bytes.length;i++){pixels.data[i*4]=t.color>>>24;pixels.data[i*4+1]=(t.color>>>16)&255;pixels.data[i*4+2]=(t.color>>>8)&255;pixels.data[i*4+3]=Math.round(t.bytes[i]*(255-(t.color&255))/255);}
          const tile=new OffscreenCanvas(t.w,t.h);tile.getContext('2d')!.putImageData(pixels,0,0);context.drawImage(tile,t.x,t.y);
        }
        this.stats.renders++;this.stats.bitmapUpdates++;this.stats.bytes+=size;this.stats.peakBytes=Math.max(this.stats.peakBytes,size);this.last=key;
      },error=>this.fail(error)).finally(()=>{this.busy=false;});
    }
    if(!this.video.paused||this.busy||this.last!==key)this.frame=requestAnimationFrame(()=>this.tick());
  }
  destroy(){
    if(this.stopped)return;this.stopped=true;this.revision++;this.loading.abort();cancelAnimationFrame(this.frame);
    this.observer?.disconnect();this.handlers.forEach(f=>f());this.worker.terminate();
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Subtitle renderer destroyed'));}this.pending.clear();
    this.canvas.remove();
  }
}
