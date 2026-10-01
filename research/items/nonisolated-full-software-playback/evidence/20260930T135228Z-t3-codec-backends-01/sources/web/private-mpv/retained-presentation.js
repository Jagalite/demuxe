// SPDX-License-Identifier: MIT
import {drawRetainedVideo} from '../retained-video.js';
import {SubtitleOverlay} from '../subtitle-overlay.js';
export class PrivateRetainedPresentation {
  constructor(){this.frames=new Map();this.overlay=new SubtitleOverlay();this.generation=-1;this.serial=-1;this.awaiting=true;
    this.stats={received:0,presented:0,closed:0,dropped:0,peakFrames:0};}
  closeFrame(frame){frame.close();this.stats.closed++;}
  enqueue(frame,generation){
    this.stats.received++;
    if(generation<this.generation){this.closeFrame(frame);return;}
    if(generation>this.generation){this.clear();this.generation=generation;}
    const pts=frame.timestamp;
    if(!Number.isSafeInteger(pts))throw Error('Invalid retained frame timestamp');
    if(this.frames.has(pts)||this.held?.timestamp===pts)throw Error('Retained timestamp collision');
    if(this.frames.size>=64)throw Error('Retained presentation frame budget');
    this.frames.set(pts,frame);this.stats.peakFrames=Math.max(this.stats.peakFrames,this.frames.size);
  }
  async select(engine,properties){
    const ptr=await engine.call('web_selected_snapshot');
    const memory=engine.raw.memory.buffer,view=new DataView(memory,ptr,32);
    const pts=view.getFloat64(0,true),delay=view.getFloat64(8,true),serial=view.getInt32(16,true),subtitle=view.getUint32(24,true),composites=view.getInt32(28,true);
    if(!Number.isFinite(pts)||pts<0)return;
    if(!Number.isFinite(delay))throw Error('Invalid retained presentation deadline');
    const stamp=Math.round(pts*1e6);
    let frame=this.held?.timestamp===stamp?this.held:this.frames.get(stamp);
    if(!frame){
      // FFmpeg rational timestamps can round differently by one microsecond.
      frame=this.frames.get(stamp-1)??this.frames.get(stamp+1);
    }
    if(!frame){if(this.awaiting)return;throw Error('Selected retained frame is unavailable: '+stamp);}
    this.awaiting=false;
    if(frame!==this.held){
      this.frames.delete(frame.timestamp);if(this.held)this.closeFrame(this.held);this.held=frame;
    }
    for(const [timestamp,old] of this.frames)if(timestamp<stamp-1){this.frames.delete(timestamp);this.closeFrame(old);this.stats.dropped++;}
    const overlay=this.overlay.read({_web_subtitle_overlay_version:()=>2,_web_subtitle_ptr:()=>subtitle,
      _web_subtitle_composite_count:()=>composites,HEAPU8:new Uint8Array(memory)});
    if(this.pending&&this.pending.serial!==serial)this.stats.dropped++;
    this.pending={serial,frame,overlay,track:properties['video-params'],due:performance.now()+Math.max(0,delay)};
    this.serial=serial;
  }
  present(context,canvas){
    const pending=this.pending;if(!pending||performance.now()<pending.due)return false;
    drawRetainedVideo(context,pending.frame,canvas,pending.track);this.overlay.draw(context,pending.overlay);
    this.pending=null;this.stats.presented++;return true;
  }
  clear(){
    for(const frame of this.frames.values())this.closeFrame(frame);this.frames.clear();
    if(this.held)this.closeFrame(this.held);this.held=null;this.pending=null;this.serial=-1;this.awaiting=true;this.overlay.clear();
  }
  snapshot(){return {...this.stats,queued:this.frames.size,held:+!!this.held,pending:+!!this.pending,generation:this.generation};}
}
