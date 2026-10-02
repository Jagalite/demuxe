// SPDX-License-Identifier: Apache-2.0
import type {PreviewFrame} from '../preview/controller.js';
import type {PlayerPreview} from '../preview/player-preview.js';
import {previewImageBlob} from '../preview/images.js';
import {initialScrubber,transitionScrubber,scrubberDistance,scrubberPointer,type ScrubberCommand,type ScrubberDecision} from '../internal/machine/scrubber.js';
import {formatTime} from './interaction.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export class ScrubberPreview {
  private control=initialScrubber();
  private generators=new Map<number,AbortController>();
  private presentations=new Map<number,AbortController>();
  private ownerIds=new WeakMap<PlayerPreview,number>();
  private imageIds=new WeakMap<PreviewFrame['image'],number>();
  private pendingApi?:PlayerPreview;
  private displayedURL?:{url:string;release:()=>void};
  private transition(command:ScrubberCommand){const result=transitionScrubber(this.control,command);this.control=result.state;return result;}
  private identity<T extends object>(map:WeakMap<T,number>,value:T){let id=map.get(value);if(id===undefined){id=this.transition({type:'allocate'}).id!;map.set(value,id);}return id;}
  private abort(map:Map<number,AbortController>,id:number|undefined){if(id===undefined)return;const controller=map.get(id);map.delete(id);controller?.abort();}
  private applyClear(decision:ScrubberDecision){
    this.abort(this.generators,decision.abortGeneration);this.abort(this.presentations,decision.abortPresentation);
    if(!decision.clear)return;
    this.panel.hidden=true;this.image.removeAttribute('src');this.displayedURL?.release();this.displayedURL=undefined;
  }
  private readonly move=(event:PointerEvent)=>{
    if(event.pointerType==='touch'||this.timeline.disabled){this.hide();return;}
    const api=this.api();if(!api)return;
    const rect=this.timeline.getBoundingClientRect(),parent=this.panel.parentElement!.getBoundingClientRect();
    const pointer=scrubberPointer({touch:false,disabled:false,left:rect.left,width:rect.width,min:Number(this.timeline.min),max:Number(this.timeline.max),x:event.clientX,parentLeft:parent.left,parentWidth:parent.width});
    if(pointer.time===undefined)return;
    this.panel.style.left=`${pointer.left}px`;
    const hover=this.transition({type:'hover'});if(hover.id===undefined)return;
    if(hover.placeholder){this.image.hidden=true;this.label.textContent=`${formatTime(pointer.time)} · …`;this.panel.hidden=false;}
    void this.sample(api,pointer.time,hover.id);
  };
  constructor(private timeline:HTMLInputElement,private panel:HTMLElement,private image:HTMLImageElement,private label:HTMLElement,private api:()=>PlayerPreview|undefined){
    timeline.addEventListener('pointermove',this.move);timeline.addEventListener('pointerleave',this.hide);timeline.addEventListener('pointercancel',this.hide);
  }
  private distance(api:PlayerPreview,generation=false){return scrubberDistance(api.strategy,Number(this.timeline.max)-Number(this.timeline.min),generation);}
  private async sample(api:PlayerPreview,time:number,hover:number){
    const owner=this.identity(this.ownerIds,api);let frame:PreviewFrame|null=null;
    try{frame=await api.getFrame({time,width:240,height:135,maxDistance:this.distance(api),cacheOnly:true});}catch{}
    const refine=!!frame&&api.strategy?.type==='adaptive'&&Math.abs(frame.time-time)>this.distance(api,true);
    const decision=this.transition({type:'cache',hover,target:{owner,time},hit:!!frame,refine});if(!decision.accepted)return;
    this.pendingApi=this.control.pending?api:undefined;
    if(decision.show&&frame)void this.show(frame);
    void this.next();
  }
  private async next(){
    const api=this.pendingApi,decision=this.transition({type:'generate'});if(!decision.generate||!api)return;
    this.pendingApi=undefined;const request=decision.generate,controller=new AbortController();this.generators.set(request.id,controller);
    try{
      const frame=await api.getFrame({time:request.time,width:240,height:135,signal:controller.signal,maxDistance:this.distance(api,true)});
      const completed=this.transition({type:'generated',id:request.id,aborted:controller.signal.aborted,hasFrame:!!frame});
      if(completed.show&&frame)void this.show(frame);else if(completed.clear)this.clearImage();
    }catch{if(this.transition({type:'generated',id:request.id,aborted:controller.signal.aborted,hasFrame:false}).accepted)this.clearImage();}
    finally{this.generators.delete(request.id);if(this.transition({type:'generation-finished',id:request.id}).accepted)void this.next();}
  }
  private async show(frame:PreviewFrame){
    const image=this.identity(this.imageIds,frame.image),decision=this.transition({type:'show',image});if(!decision.presentation)return;
    this.abort(this.presentations,decision.abortPresentation);
    const {id,needsImage}=decision.presentation,controller=new AbortController();this.presentations.set(id,controller);
    const deadline=setTimeout(()=>this.applyClear(this.transition({type:'deadline',id})),5000);
    const cancelDeadline=()=>clearTimeout(deadline);controller.signal.addEventListener('abort',cancelDeadline,{once:true});
    let acquiredURL:{url:string;release:()=>void}|undefined;
    try{
      if(needsImage){
        const blob=await previewImageBlob(frame.image,controller.signal);if(controller.signal.aborted)return;
        const url=URL.createObjectURL(blob);let released=false;
        const release=()=>{if(!released){released=true;URL.revokeObjectURL(url);}};
        const resource=acquiredURL={url,release};
        const decoded=this.image.ownerDocument.createElement('img');decoded.src=url;
        const cancel=()=>{decoded.removeAttribute('src');release();};controller.signal.addEventListener('abort',cancel,{once:true});
        try{
          await decoded.decode();if(controller.signal.aborted||!this.transition({type:'decoded',id}).accepted)return;
          const previous=this.displayedURL;this.displayedURL=resource;this.image.src=url;this.image.hidden=false;previous?.release();
        }finally{controller.signal.removeEventListener('abort',cancel);decoded.removeAttribute('src');if(this.displayedURL!==resource)release();}
      }
      if(controller.signal.aborted||!this.transition({type:'presented',id}).accepted)return;
      this.label.textContent=`${frame.temporalAccuracy==='approximate'?'≈ ':''}${formatTime(frame.actualTime??frame.time)}`;this.panel.hidden=false;
    }catch{if(!controller.signal.aborted)this.applyClear(this.transition({type:'presentation-failed',id}));}
    finally{if(acquiredURL&&this.displayedURL!==acquiredURL)acquiredURL.release();clearTimeout(deadline);controller.signal.removeEventListener('abort',cancelDeadline);this.presentations.delete(id);this.transition({type:'presentation-finished',id});}
  }
  private clearImage(){this.applyClear(this.transition({type:'clear'}));}
  readonly hide=()=>{this.pendingApi=undefined;this.applyClear(this.transition({type:'hide'}));};
  destroy(){this.pendingApi=undefined;this.applyClear(this.transition({type:'destroy'}));this.timeline.removeEventListener('pointermove',this.move);this.timeline.removeEventListener('pointerleave',this.hide);this.timeline.removeEventListener('pointercancel',this.hide);}
}
