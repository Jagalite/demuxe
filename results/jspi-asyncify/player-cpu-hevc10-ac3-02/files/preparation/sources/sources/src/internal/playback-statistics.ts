// SPDX-License-Identifier: Apache-2.0
import type {PlaybackStats,PlayerState} from '../types.js';
/** Bounded, source-scoped observations; no backend counter inference. */
export class PlaybackStatistics {
  private data:PlaybackStats=this.empty();
  private waitingAt:number|null=null;
  constructor(private now=()=>performance.now()){}
  private empty():PlaybackStats{return {sourceId:null,sessionEpoch:0,acceptedAtMs:null,openToAcceptanceMs:null,firstPlayingMs:null,lastSeekMs:null,seekCount:0,rebufferCount:0,rebufferMs:0,decodedFrames:null,presentedFrames:null,droppedFrames:null,throughputBitsPerSecond:null};}
  clear(){this.data=this.empty();this.waitingAt=null;}
  accept(sourceId:number,preserve:boolean,elapsed:number){
    this.finishWaiting();
    if(!preserve)this.data={...this.empty(),sourceId,acceptedAtMs:this.now(),openToAcceptanceMs:elapsed};
    this.data={...this.data,sessionEpoch:this.data.sessionEpoch+1};
  }
  seek(milliseconds:number){if(this.data.sourceId===null)return;this.data={...this.data,lastSeekMs:milliseconds,seekCount:this.data.seekCount+1};}
  private finishWaiting(){if(this.waitingAt!==null){this.data={...this.data,rebufferMs:this.data.rebufferMs+this.now()-this.waitingAt};this.waitingAt=null;}}
  observe(state:PlayerState){
    if(state.sourceId===null)return;
    if(state.status==='playing'&&this.data.firstPlayingMs===null&&this.data.acceptedAtMs!==null)this.data={...this.data,firstPlayingMs:this.now()-this.data.acceptedAtMs};
    const waiting=state.status==='buffering'&&state.playbackIntent==='play'&&!state.pendingOperation&&this.data.firstPlayingMs!==null;
    if(waiting&&this.waitingAt===null){this.waitingAt=this.now();this.data={...this.data,rebufferCount:this.data.rebufferCount+1};}
    if(!waiting)this.finishWaiting();
  }
  snapshot():PlaybackStats{return Object.freeze({...this.data,rebufferMs:this.data.rebufferMs+(this.waitingAt===null?0:this.now()-this.waitingAt)});}
}
