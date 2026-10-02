// SPDX-License-Identifier: Apache-2.0
export type PlaybackControl=Readonly<{
  serial:number;plays:readonly number[];seeks:readonly number[];latestSeek:number|null;
  observedPlaying:boolean;observedWaiting:boolean;sampleSession:number|null;sampleSequence:number;
}>;
export type PlaybackInput=
  |Readonly<{type:'play.request'}>|Readonly<{type:'play.retire'}>
  |Readonly<{type:'play.settled';id:number}>|Readonly<{type:'seek.settled';id:number}>
  |Readonly<{type:'seek.request';latest:boolean}>
  |Readonly<{type:'playback.observed';playing?:boolean;waiting?:boolean}>;
export function initialPlayback():PlaybackControl{return Object.freeze({serial:0,plays:Object.freeze([]),seeks:Object.freeze([]),latestSeek:null,observedPlaying:false,observedWaiting:false,sampleSession:null,sampleSequence:0});}
/** Logical play verification and latest-seek lifetimes are distinct from FIFO
 * operation lifetime. The shell resolves IDs to physical abort controllers. */
export function transitionPlayback(state:PlaybackControl,input:PlaybackInput){
  switch(input.type){
    case 'play.request':{const id=state.serial+1;return Object.freeze({state:Object.freeze({...state,serial:id,plays:Object.freeze([...state.plays,id])}),id,retire:Object.freeze([])});}
    case 'play.retire':return Object.freeze({state:Object.freeze({...state,plays:Object.freeze([])}),retire:state.plays});
    case 'play.settled':return Object.freeze({state:Object.freeze({...state,plays:Object.freeze(state.plays.filter(id=>id!==input.id))}),retire:Object.freeze([])});
    case 'seek.request':{const id=state.serial+1;return Object.freeze({state:Object.freeze({...state,serial:id,seeks:Object.freeze([...state.seeks,id]),latestSeek:input.latest?id:state.latestSeek}),id,retire:Object.freeze(input.latest&&state.latestSeek!==null?[state.latestSeek]:[])});}
    case 'seek.settled':return Object.freeze({state:Object.freeze({...state,seeks:Object.freeze(state.seeks.filter(id=>id!==input.id)),latestSeek:state.latestSeek===input.id?null:state.latestSeek}),retire:Object.freeze([])});
    case 'playback.observed':return Object.freeze({state:Object.freeze({...state,observedPlaying:input.playing??state.observedPlaying,observedWaiting:input.waiting??state.observedWaiting}),retire:Object.freeze([])});
  }
}
