// SPDX-License-Identifier: GPL-3.0-or-later
import type {PreviewController,PreviewFrame} from '../preview/controller.js';
import {previewImageBlob} from '../preview/images.js';
import {formatTime} from './interaction.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export class ScrubberPreview {
  private controller?:AbortController;
  private serial=0;private url?:string;
  private readonly move=(event:PointerEvent)=>{
    if(event.pointerType==='touch'||this.timeline.disabled){this.hide();return;}
    const api=this.api();if(!api)return;
    const rect=this.timeline.getBoundingClientRect(),min=Number(this.timeline.min),max=Number(this.timeline.max);
    if(!rect.width||max<=min)return;
    const fraction=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),time=min+fraction*(max-min);
    const parent=this.panel.parentElement!.getBoundingClientRect();
    const half=Math.min(120,parent.width/2);this.panel.style.left=`${Math.max(half,Math.min(parent.width-half,event.clientX-parent.left))}px`;
    // Controller owns time bucketing; every pointer request supersedes visibility.
    const serial=++this.serial;
    const previous=this.controller,controller=this.controller=new AbortController();
    this.panel.hidden=true;
    const work=api.getFrame({time,width:240,height:135,signal:controller.signal});previous?.abort();
    void work.then(frame=>{
      if(frame&&!controller.signal.aborted&&serial===this.serial)return this.show(frame,controller,serial);
    }).catch(()=>{if(serial===this.serial)this.hide();});
  };
  constructor(private timeline:HTMLInputElement,private panel:HTMLElement,private image:HTMLImageElement,private label:HTMLElement,private api:()=>PreviewController|undefined){
    timeline.addEventListener('pointermove',this.move);timeline.addEventListener('pointerleave',this.hide);timeline.addEventListener('pointercancel',this.hide);
  }
  private async show(frame:PreviewFrame,controller:AbortController,serial:number){
    const blob=await previewImageBlob(frame.image,controller.signal);
    if(controller.signal.aborted||serial!==this.serial)return;
    const url=URL.createObjectURL(blob);if(this.url)URL.revokeObjectURL(this.url);this.url=url;this.image.src=url;
    try{await this.image.decode();}catch{if(serial===this.serial)this.hide();return;}
    if(controller.signal.aborted||serial!==this.serial)return;
    this.label.textContent=`${frame.temporalAccuracy==='approximate'?'≈ ':''}${formatTime(frame.actualTime??frame.time)}`;
    this.panel.hidden=false;
  }
  readonly hide=()=>{this.serial++;this.controller?.abort();this.controller=undefined;this.panel.hidden=true;this.image.removeAttribute('src');if(this.url)URL.revokeObjectURL(this.url);this.url=undefined;};
  destroy(){this.hide();this.timeline.removeEventListener('pointermove',this.move);this.timeline.removeEventListener('pointerleave',this.hide);this.timeline.removeEventListener('pointercancel',this.hide);}
}
