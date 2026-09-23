// SPDX-License-Identifier: Apache-2.0
import type {PreviewController,PreviewFrame} from '../preview/controller.js';
import {previewImageBlob} from '../preview/images.js';
import {formatTime} from './interaction.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export class ScrubberPreview {
  private controller?:AbortController;
  private presentation?:AbortController;
  private presentingImage?:PreviewFrame['image'];
  private pending?:{api:PreviewController;time:number};
  private displayedImage?:PreviewFrame['image'];
  private serial=0;private url?:string;
  private readonly move=(event:PointerEvent)=>{
    if(event.pointerType==='touch'||this.timeline.disabled){this.hide();return;}
    const api=this.api();if(!api)return;
    const rect=this.timeline.getBoundingClientRect(),min=Number(this.timeline.min),max=Number(this.timeline.max);
    if(!rect.width||max<=min)return;
    const fraction=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),time=min+fraction*(max-min);
    const parent=this.panel.parentElement!.getBoundingClientRect();
    const half=Math.min(120,parent.width/2);this.panel.style.left=`${Math.max(half,Math.min(parent.width-half,event.clientX-parent.left))}px`;
    // Sample continuous motion without repeatedly cancelling the decoder before
    // it can produce an image. Only the latest waiting position is retained.
    this.pending={api,time};void this.next();
  };
  constructor(private timeline:HTMLInputElement,private panel:HTMLElement,private image:HTMLImageElement,private label:HTMLElement,private api:()=>PreviewController|undefined){
    timeline.addEventListener('pointermove',this.move);timeline.addEventListener('pointerleave',this.hide);timeline.addEventListener('pointercancel',this.hide);
  }
  private async next(){
    if(this.controller||!this.pending)return;
    const {api,time}=this.pending;this.pending=undefined;
    const controller=this.controller=new AbortController(),serial=++this.serial;
    try{
      const frame=await api.getFrame({time,width:240,height:135,signal:controller.signal});
      if(controller.signal.aborted||serial!==this.serial)return;
      // Image downloads must not hold the generation lane: the next result can
      // supersede a stalled authored image, including an immediate cache hit.
      if(frame)void this.show(frame);else this.clearImage();
    }catch{if(serial===this.serial)this.clearImage();}
    finally{if(this.controller===controller){this.controller=undefined;void this.next();}}
  }
  private async show(frame:PreviewFrame){
    // Repeated cache hits within one bucket share an in-flight image download.
    if(this.presentation&&this.presentingImage===frame.image)return;
    this.presentation?.abort();const controller=this.presentation=new AbortController();
    this.presentingImage=frame.image;
    try{
      if(frame.image!==this.displayedImage){
        const blob=await previewImageBlob(frame.image,controller.signal);
        if(controller.signal.aborted)return;
        const url=URL.createObjectURL(blob),image=this.image.ownerDocument.createElement('img');image.src=url;
        const cancel=()=>{image.removeAttribute('src');URL.revokeObjectURL(url);};
        controller.signal.addEventListener('abort',cancel,{once:true});
        try{
          // Keep the previous image painted until its replacement is decoded.
          await image.decode();if(controller.signal.aborted)return;
          const previous=this.url;this.url=url;this.image.src=url;this.displayedImage=frame.image;
          if(previous)URL.revokeObjectURL(previous);
        }finally{controller.signal.removeEventListener('abort',cancel);image.removeAttribute('src');if(this.url!==url)URL.revokeObjectURL(url);}
      }
      if(controller.signal.aborted)return;
      this.label.textContent=`${frame.temporalAccuracy==='approximate'?'≈ ':''}${formatTime(frame.actualTime??frame.time)}`;
      this.panel.hidden=false;
    }catch{if(!controller.signal.aborted)this.clearImage();}
    finally{if(this.presentation===controller){this.presentation=undefined;this.presentingImage=undefined;}}
  }
  private clearImage(){this.presentation?.abort();this.presentation=undefined;this.presentingImage=undefined;this.panel.hidden=true;this.image.removeAttribute('src');if(this.url)URL.revokeObjectURL(this.url);this.url=undefined;this.displayedImage=undefined;}
  readonly hide=()=>{this.serial++;this.pending=undefined;this.controller?.abort();this.controller=undefined;this.clearImage();};
  destroy(){this.hide();this.timeline.removeEventListener('pointermove',this.move);this.timeline.removeEventListener('pointerleave',this.hide);this.timeline.removeEventListener('pointercancel',this.hide);}
}
