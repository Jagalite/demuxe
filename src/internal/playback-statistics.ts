// SPDX-License-Identifier: Apache-2.0
import type {PlaybackStats,PlayerState} from '../types.js';
import {createPlaybackStatistics,playbackStatisticsClockReads,selectPlaybackStatistics,transitionPlaybackStatistics,type PlaybackStatisticsCommand} from './machine/telemetry.js';
/** Bounded, source-scoped observations; no backend counter inference. */
export class PlaybackStatistics {
  private state=createPlaybackStatistics();
  constructor(private now=()=>performance.now()){}
  private timestamps(command:PlaybackStatisticsCommand|{kind:'snapshot'}):number[]{
    return Array.from({length:playbackStatisticsClockReads(this.state,command)},()=>this.now());
  }
  private apply(command:PlaybackStatisticsCommand):void {
    this.state=transitionPlaybackStatistics(this.state,{...command,timestamps:this.timestamps(command)});
  }
  clear(){this.apply({kind:'clear'});}
  accept(sourceId:number,preserve:boolean,elapsed:number){this.apply({kind:'accept',sourceId,preserve,elapsed});}
  seek(milliseconds:number){this.apply({kind:'seek',milliseconds});}
  observe(state:PlayerState){this.apply({kind:'observe',observation:{sourceId:state.sourceId,status:state.status,playbackIntent:state.playbackIntent,operationPending:!!state.pendingOperation}});}
  snapshot():PlaybackStats{return selectPlaybackStatistics(this.state,this.timestamps({kind:'snapshot'})[0]);}
}
