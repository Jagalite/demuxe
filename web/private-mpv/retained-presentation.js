// SPDX-License-Identifier: MIT
import {drawRetainedVideo} from '../retained-video.js';
import {SubtitleOverlay} from '../subtitle-overlay.js';
import {createPrivateRetainedPresentation,clearRetainedPresentation,admitRetainedFrame,canReceiveRetainedFrame,releaseRetainedNativeFrame,returnRetainedFrame,retainedFrameCurrent,selectRetainedFrame,armRetainedDraw,beginRetainedDraw,finishRetainedDraw} from '../generated/internal/machine/private-retained-presentation.js';
export class PrivateRetainedPresentation {
  constructor({now=()=>performance.now(),onCapacity=()=>{}}={}){this.machine=createPrivateRetainedPresentation();this.owned=new Map();this.overlay=new SubtitleOverlay();this.now=now;this.onCapacity=onCapacity;this.selected=null;}
  get generation(){return this.machine.generation;}get serial(){return this.machine.serial;}get awaiting(){return this.machine.awaiting;}get epoch(){return this.machine.epoch;}
  get seekTarget(){return this.machine.seekTarget??undefined;}get seekGeneration(){return this.machine.seekGeneration??undefined;}
  get held(){return this.machine.held?this.owned.get(this.machine.held.id):null;}
  get frames(){return new Map(this.machine.frames.map(frame=>[frame.timestamp,this.owned.get(frame.id)]));}
  get pending(){return this.machine.pending?{...this.machine.pending,frame:this.owned.get(this.machine.pending.frame),overlay:this.selected?.overlay,track:this.selected?.track}:this.machine.epoch===0?undefined:null;}
  release(ids){const errors=[];for(const id of ids){const frame=this.owned.get(id);this.owned.delete(id);try{frame?.close();}catch(error){errors.push(error);}}if(ids.length)this.onCapacity();if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Retained frame cleanup failed');}
  canReceive(frame,generation){return canReceiveRetainedFrame(this.machine,frame.timestamp,generation);}
  releaseNative(generation,id){const decision=releaseRetainedNativeFrame(this.machine,generation,id);this.machine=decision.state;this.release(decision.close);}
  enqueue(frame,generation,nativeId=null){
    const admission=admitRetainedFrame(this.machine,frame.timestamp,generation,nativeId);this.machine=admission.state;
    // Metadata reserves the identity before cleanup callbacks. Physical input
    // ownership transfers only once prior-generation retirement succeeds: on a
    // thrown enqueue the decoder mailbox still owns and closes the input.
    try{
      if(admission.clearOverlay){this.selected=null;this.overlay.clear();}
      this.release(admission.close);
    }catch(error){if(admission.id!==null)this.machine=returnRetainedFrame(this.machine,admission.id);throw error;}
    if(admission.id!==null){
      if(retainedFrameCurrent(this.machine,admission.id))this.owned.set(admission.id,frame);
      else frame.close(); // A cleanup callback already retired the reservation.
    }
    if(admission.closeInput)frame.close();
    if(admission.error)throw Error(admission.error);
  }
  async select(engine,properties){
    const epoch=this.machine.epoch,ptr=await engine.call('web_selected_snapshot');if(epoch!==this.machine.epoch)return;
    const memory=engine.raw.memory.buffer,view=new DataView(memory,ptr,32);
    const pts=view.getFloat64(0,true),delay=view.getFloat64(8,true),serial=view.getInt32(16,true),subtitle=view.getUint32(24,true),composites=view.getInt32(28,true);
    const selection=selectRetainedFrame(this.machine,{epoch,pts,delay,serial});this.machine=selection.state;const selectionId=selection.state.preparing?.id;this.release(selection.close);
    if(selection.error)throw Error(selection.error);if(selection.frame===null||this.machine.epoch!==epoch)return;
    const overlay=this.overlay.read({_web_subtitle_overlay_version:()=>2,_web_subtitle_ptr:()=>subtitle,_web_subtitle_composite_count:()=>composites,HEAPU8:new Uint8Array(memory)});
    if(this.machine.epoch!==epoch)return;
    const armed=armRetainedDraw(this.machine,selectionId,this.now());this.machine=armed.state;if(!armed.accepted)return;
    this.selected={epoch,frame:selection.frame,serial,overlay,track:properties['video-params']};
  }
  present(context,canvas){
    const selected=this.selected,epoch=this.machine.epoch,decision=beginRetainedDraw(this.machine,this.now());this.machine=decision.state;
    if(!decision.pending)return false;
    const frame=this.owned.get(decision.pending.frame);
    if(!frame||!selected||selected.epoch!==epoch||selected.frame!==decision.pending.frame||selected.serial!==decision.pending.serial)throw Error('Retained presentation ownership mismatch');
    drawRetainedVideo(context,frame,canvas,selected.track);
    if(this.machine.epoch!==epoch)return false;
    this.overlay.draw(context,selected.overlay);if(this.machine.epoch!==epoch)return false;
    this.machine=finishRetainedDraw(this.machine,epoch);return true;
  }
  clear(seekTarget,seekGeneration=this.machine.generation){
    const decision=clearRetainedPresentation(this.machine,seekTarget??null,seekGeneration);this.machine=decision.state;this.selected=null;this.overlay.clear();this.release(decision.close);
  }
  snapshot(){const s=this.machine;return {received:s.received,presented:s.presented,closed:s.closed,dropped:s.dropped,nativeReleased:s.nativeReleased,peakFrames:s.peakFrames,queued:s.frames.length,held:+!!s.held,pending:+!!s.pending,generation:s.generation};}
}
