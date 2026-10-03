// SPDX-License-Identifier: Apache-2.0
import {bindPlayer,type PlaybackBinding} from './index.js';
import type {PlaybackRuntime} from '../contracts.js';
import type {TimeRange} from '../types.js';
import {initialMediaViewState,transitionMediaView,initialMediaViewEvents} from '../internal/machine/bindings.js';
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
  private control=initialMediaViewState();
  private stops:(()=>void)[]=[];
  private cleanup?:Promise<void>;
  constructor(private runtime:PlaybackRuntime){
    super();this.binding=bindPlayer(runtime,{onOperationError:error=>this.emit('operationerror',error)});
    try{this.stops.push(this.binding.subscribe(state=>{
      const decision=transitionMediaView(this.control,state);this.control=decision.state;
      // Event handlers may synchronously replace state or dispose this view.
      const emit=(type:string,detail?:unknown)=>{if(this.runtime.state===state)this.emit(type,detail);};
      for(const event of decision.events)emit(event.type,event.detail);
    }));
    // Only the core knows whether a seek actually settled; no timeupdate-based completion.
    for(const name of ['seeking','seeked']){const listener=()=>{if(!this.binding.disposed)this.emit(name);};this.stops.push(()=>runtime.removeEventListener(name,listener));runtime.addEventListener(name,listener);}
    }catch(error){void this.dispose().catch(()=>{});throw error;}
  }
  /** Initialize an existing control consumer from an already accepted snapshot. */
  synchronize(){
    const state=this.state;
    const events=initialMediaViewEvents(state);
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
  dispose():Promise<void>{
    if(this.cleanup)return this.cleanup;
    let resolve!:()=>void,reject!:(error:unknown)=>void;this.cleanup=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    // Retire notification authority before callback-capable physical cleanup.
    const binding=this.binding.dispose(),errors:unknown[]=[];
    for(const stop of this.stops.splice(0))try{stop();}catch(error){errors.push(error);}
    const finish=()=>errors.length?reject(errors.length===1?errors[0]:new AggregateError(errors,'Media view cleanup failed')):resolve();
    void binding.then(finish,error=>{errors.unshift(error);finish();});return this.cleanup;
  }
}
