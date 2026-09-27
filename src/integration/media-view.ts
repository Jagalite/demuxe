// SPDX-License-Identifier: Apache-2.0
import {bindPlayer,type PlaybackBinding} from './index.js';
import type {PlaybackRuntime} from '../contracts.js';
import type {PlayerState,TimeRange} from '../types.js';
/** Unknown coverage remains null on state; native-shaped ranges are a lossy view. */
export function timeRanges(ranges:readonly TimeRange[]|null):TimeRanges {
  const copy=ranges?.map(r=>({...r}))??[];
  const at=(i:number)=>{if(!Number.isInteger(i)||i<0||i>=copy.length)throw new DOMException('Range index is out of bounds','IndexSizeError');return copy[i];};
  return Object.freeze({length:copy.length,start:(i:number)=>at(i).start,end:(i:number)=>at(i).end});
}
export const MEDIA_VIEW_EVENTS=['play','playing','pause','waiting','ended','timeupdate','durationchange','volumechange','ratechange','seeking','seeked','loadedmetadata','emptied','operationerror','error'] as const;
/** One snapshot projection, no surface listeners, timers, source requests or readiness guesses. */
export class MediaView extends EventTarget {
  readonly binding:PlaybackBinding;
  private previous?:PlayerState;
  private stops:(()=>void)[]=[];
  constructor(private runtime:PlaybackRuntime){
    super();this.binding=bindPlayer(runtime,{onOperationError:error=>this.emit('operationerror',error)});
    this.stops.push(this.binding.subscribe(state=>{
      const before=this.previous;this.previous=state;if(!before)return;
      // Event handlers may synchronously replace state or dispose this view.
      const emit=(type:string,detail?:unknown)=>{if(this.runtime.state===state)this.emit(type,detail);};
      const duration=(s:PlayerState)=>s.streamType==='live'?Infinity:s.duration??NaN;
      const changed=before.sourceId!==state.sourceId;
      if(changed)emit(state.sourceId===null?'emptied':'loadedmetadata');
      for(const [event,a,b] of [['durationchange',duration(before),duration(state)],['timeupdate',before.currentTime,state.currentTime],['volumechange',`${before.volume}:${before.muted}`,`${state.volume}:${state.muted}`],['ratechange',before.playbackRate,state.playbackRate]] as const)if(!Object.is(a,b))emit(event);
      if(before.playbackIntent!==state.playbackIntent)emit(state.playbackIntent==='play'?'play':'pause');
      if(before.status!==state.status&&['playing','buffering','ended'].includes(state.status)&&!(state.status==='ended'&&state.loop))emit(state.status==='buffering'?'waiting':state.status);
      if(state.error?.scope==='session'&&before.error!==state.error)emit('error',state.error);
    }));
    // Only the core knows whether a seek actually settled; no timeupdate-based completion.
    for(const name of ['seeking','seeked']){const listener=()=>{if(!this.binding.disposed)this.emit(name);};runtime.addEventListener(name,listener);this.stops.push(()=>runtime.removeEventListener(name,listener));}
  }
  /** Initialize an existing control consumer from an already accepted snapshot. */
  synchronize(){
    const state=this.state;
    const events=[state.sourceId===null?'emptied':'loadedmetadata','durationchange','timeupdate','volumechange','ratechange',this.paused?'pause':'play'];
    for(const event of events){if(this.state!==state||this.binding.disposed)return;this.emit(event,{initial:true,sourceId:state.sourceId});}
  }
  private emit(type:string,detail?:unknown){if(!this.binding?.disposed)this.dispatchEvent(new CustomEvent(type,{detail}));}
  get state(){return this.runtime.state;}
  get paused(){return this.state.playbackIntent==='pause';}
  get ended(){return this.state.status==='ended';}
  get currentTime(){return this.state.currentTime;}
  set currentTime(value:number){void this.binding.seek(value).catch(()=>{});}
  get duration(){return this.state.streamType==='live'?Infinity:this.state.duration??NaN;}
  get volume(){return this.state.volume;}
  set volume(value:number){void this.binding.setVolume(value).catch(()=>{});}
  get muted(){return this.state.muted;}
  set muted(value:boolean){void this.binding.setMuted(value).catch(()=>{});}
  get playbackRate(){return this.state.playbackRate;}
  set playbackRate(value:number){void this.binding.setPlaybackRate(value).catch(()=>{});}
  get seeking(){return this.state.pendingOperation?.kind==='seeking';}
  get buffered(){return timeRanges(this.state.buffered);}
  get seekable(){return timeRanges(this.state.seekable);}
  get error(){return this.state.error?.scope==='session'?this.state.error:null;}
  play(){return this.binding.play();}
  pause(){void this.binding.pause().catch(()=>{});}
  dispose(){for(const stop of this.stops.splice(0))stop();return this.binding.dispose();}
}
