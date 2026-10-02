// SPDX-License-Identifier: Apache-2.0
export type PrivateAudioState=Readonly<{
  running:boolean;polling:boolean;controlId:number;rate:number;volume:number;gain:number;streamIndex:number|null;resumeAfterContext:boolean;contextObservation:number;contextActive:boolean;
  eof:boolean;eofTask:number|null;nextEOF:number;watchAudio:boolean;badClock:number;outside:number;inside:number;trim:boolean;rateWrites:number;errors:readonly number[];
}>;
export function createPrivateAudio():PrivateAudioState{return Object.freeze({running:false,polling:false,controlId:0,rate:1,volume:100,gain:1,streamIndex:null,resumeAfterContext:false,contextObservation:0,contextActive:false,eof:false,eofTask:null,nextEOF:1,watchAudio:true,badClock:0,outside:0,inside:0,trim:false,rateWrites:0,errors:Object.freeze([])});}
export function selectPrivateAudioStream(state:PrivateAudioState,index:number|undefined):Readonly<{state:PrivateAudioState;accepted:boolean}>{return index===undefined?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,streamIndex:index}),accepted:true});}
export function privateAudioSettings(state:PrivateAudioState,input:Readonly<{rate?:number;volume?:number;gain?:number;watchAudio?:boolean}>):PrivateAudioState{
  return Object.freeze({...state,rate:input.rate??state.rate,volume:input.volume??state.volume,gain:input.gain??state.gain,watchAudio:input.watchAudio??state.watchAudio,badClock:input.watchAudio===undefined?state.badClock:0});
}
export function beginAudioControl(state:PrivateAudioState,kind:'play'|'pause'|'seek'):Readonly<{state:PrivateAudioState;id:number|null;wasRunning:boolean}>{
  if(kind==='play'&&state.running)return Object.freeze({state,id:null,wasRunning:true});
  const id=state.controlId+1;
  return Object.freeze({state:Object.freeze({...state,controlId:id,running:kind==='play'?state.running:false,resumeAfterContext:kind==='pause'?false:state.resumeAfterContext,
    eof:kind==='seek'?false:state.eof,eofTask:kind==='seek'?null:state.eofTask}),id,wasRunning:state.running});
}
export function audioControlCurrent(state:PrivateAudioState,id:number):boolean{return state.controlId===id;}
export function finishAudioPlay(state:PrivateAudioState,id:number):Readonly<{state:PrivateAudioState;accepted:boolean}>{return state.controlId!==id?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,running:true}),accepted:true});}
export function observeAudioContext(state:PrivateAudioState,active:boolean,videoPaused:boolean):Readonly<{state:PrivateAudioState;id:number;pauseVideo:boolean}>{
  const id=state.contextObservation+1,pauseVideo=!active&&state.running&&!videoPaused;
  return Object.freeze({state:Object.freeze({...state,contextObservation:id,contextActive:active,resumeAfterContext:pauseVideo||state.resumeAfterContext}),id,pauseVideo});
}
export function acknowledgeAudioContext(state:PrivateAudioState,id:number):Readonly<{state:PrivateAudioState;playVideo:boolean}>{
  const playVideo=id===state.contextObservation&&state.contextActive&&state.resumeAfterContext&&state.running;
  return Object.freeze({state:playVideo?Object.freeze({...state,resumeAfterContext:false}):state,playVideo});
}
export function beginAudioPoll(state:PrivateAudioState,active:boolean):Readonly<{state:PrivateAudioState;accepted:boolean}>{return state.polling||!active?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,polling:true}),accepted:true});}
export function finishAudioPoll(state:PrivateAudioState):PrivateAudioState{return Object.freeze({...state,polling:false});}
export type PrivateAudioClockSample=Readonly<{active:boolean;contextRunning:boolean;videoPaused:boolean;videoSeeking:boolean;hidden:boolean;audioTime:number;videoTime:number;videoRate:number}>;
export function privateAudioObservesClock(state:PrivateAudioState,sample:Readonly<{active:boolean;contextRunning:boolean;videoPaused:boolean;videoSeeking:boolean}>):boolean{return sample.active&&state.running&&sample.contextRunning&&!sample.videoPaused&&!sample.videoSeeking;}
export function observeAudioClock(state:PrivateAudioState,sample:PrivateAudioClockSample):Readonly<{state:PrivateAudioState;failure:boolean;rate:number|null;latency:boolean}>{
  if(!privateAudioObservesClock(state,sample))return Object.freeze({state,failure:false,rate:null,latency:false});
  const error=(sample.audioTime-sample.videoTime)*1000,badClock=state.watchAudio&&!sample.hidden&&(!Number.isFinite(error)||Math.abs(error)>250)?state.badClock+1:0;
  if(badClock>=8)return Object.freeze({state:Object.freeze({...state,badClock}),failure:true,rate:null,latency:false});
  if(!Number.isFinite(error))return Object.freeze({state:Object.freeze({...state,badClock}),failure:false,rate:null,latency:true});
  const outside=Math.abs(error)>50?state.outside+1:0,inside=Math.abs(error)<30?state.inside+1:0,trim=inside>=3?false:outside>=3?true:state.trim;
  const target=state.rate*(1+(trim?Math.max(-.005,Math.min(.005,error/1000*.1)):0));
  const write=Math.abs(target-sample.videoRate)>.001||!trim&&sample.videoRate!==state.rate;
  return Object.freeze({state:Object.freeze({...state,badClock,outside,inside,trim,rateWrites:state.rateWrites+(write?1:0),errors:Object.freeze([...state.errors,Math.abs(error)].slice(-1200))}),failure:false,rate:write?target:null,latency:true});
}
export function resetAudioClock(state:PrivateAudioState,videoRate:number):Readonly<{state:PrivateAudioState;rate:number|null}>{return Object.freeze({state:Object.freeze({...state,outside:0,inside:0,trim:false}),rate:videoRate!==state.rate?state.rate:null});}
export function beginAudioEOF(state:PrivateAudioState,active:boolean):Readonly<{state:PrivateAudioState;id:number|null}>{
  if(state.eof||!active)return Object.freeze({state,id:null});
  const id=state.nextEOF;return Object.freeze({state:Object.freeze({...state,eof:true,eofTask:id,nextEOF:id+1}),id});
}
export function audioEOFCurrent(state:PrivateAudioState,id:number):boolean{return state.eofTask===id;}
export function finishAudioEOF(state:PrivateAudioState,id:number):PrivateAudioState{return state.eofTask===id?Object.freeze({...state,eofTask:null}):state;}
export function retirePrivateAudio(state:PrivateAudioState):PrivateAudioState{return Object.freeze({...state,controlId:state.controlId+1,contextObservation:state.contextObservation+1,contextActive:false,running:false,resumeAfterContext:false,eofTask:null});}
export type PrivateAudioStatus=Readonly<{time:number;eof:boolean;produced:number;consumed:number;epoch:number;ack:boolean;nativeEpoch:number;ackEpoch:number;feedbackCount:number;chains:number}>;
export type PrivateAudioWait=Readonly<{kind:'play';target:number}|{kind:'epoch';previous:number}|{kind:'verify'}|{kind:'drain'}>;
export function privateAudioDeadline(now:number,timeout:number):Readonly<{until:number}>{return Object.freeze({until:now+timeout});}
export function privateAudioDeadlineOpen(deadline:Readonly<{until:number}>,now:number):boolean{return now<deadline.until;}
export function privateAudioReady(status:PrivateAudioStatus,wait:PrivateAudioWait):boolean{
  if(wait.kind==='play')return status.eof&&status.produced===status.consumed||status.consumed>0&&Number.isFinite(status.time)&&status.time>=wait.target;
  if(wait.kind==='epoch')return status.epoch!==wait.previous&&status.ack&&status.nativeEpoch===status.ackEpoch;
  if(wait.kind==='verify')return status.consumed>0&&status.feedbackCount>0&&status.chains===1;
  return status.eof&&status.produced===status.consumed;
}
