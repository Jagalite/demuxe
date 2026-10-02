// SPDX-License-Identifier: Apache-2.0
/** Bounded PCM metadata only. Native memory, copied samples and ports stay in the adapters. */
export type PrivatePCMProfile='playback'|'audio';
export type PrivatePCMState=Readonly<{
  profile:PrivatePCMProfile;capacity:number;channels:number;epoch:number;posted:number;ack:boolean;running:boolean|null;
  maxOutstanding:number;feedbackCount:number;staleFeedback:number;error:string|null;pumping:boolean;
  phase:'active'|'stopping'|'stopped';stopDeadline:number|null;
}>;
export type PrivatePCMHeader=Readonly<{produced:number;consumed:number;epoch:number;nativeRunning:boolean;contextRunning:boolean;userPaused:boolean}>;
export type PrivatePCMStep=Readonly<{kind:'idle'}>|Readonly<{kind:'reset';epoch:number;capacity:number;channels:number}>|
  Readonly<{kind:'pcm';epoch:number;start:number;frames:number}>|Readonly<{kind:'state';epoch:number;running:boolean}>|Readonly<{kind:'error';message:string}>;
export type PrivatePCMFeedback=Readonly<{kind:'resetAck';epoch:number}>|Readonly<{kind:'consumed';epoch:number;frames:number}>|Readonly<{kind:'other';epoch:number}>;
export function createPrivatePCM(profile:PrivatePCMProfile,capacity=8192,channels=2):PrivatePCMState{
  if(![8192,32768].includes(capacity))throw Error('Invalid private PCM capacity');
  if(![2,6,8].includes(channels))throw Error('Invalid private PCM channel count');
  return Object.freeze({profile,capacity,channels,epoch:-1,posted:0,ack:false,running:null,maxOutstanding:0,feedbackCount:0,staleFeedback:0,error:null,pumping:false,phase:'active',stopDeadline:null});
}
export function beginPrivatePCMPump(state:PrivatePCMState):Readonly<{state:PrivatePCMState;accepted:boolean}>{
  return state.phase!=='active'||state.error!==null||state.pumping?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,pumping:true}),accepted:true});
}
export function finishPrivatePCMPump(state:PrivatePCMState):PrivatePCMState{return state.pumping?Object.freeze({...state,pumping:false}):state;}
/** One chunk per transition: commit its identity before transferring its buffer. */
export function nextPrivatePCMStep(state:PrivatePCMState,header:PrivatePCMHeader):Readonly<{state:PrivatePCMState;effect:PrivatePCMStep}>{
  const result=(next:PrivatePCMState,effect:PrivatePCMStep)=>Object.freeze({state:next,effect:Object.freeze({...effect})});
  if(state.phase!=='active'||state.error!==null||(header.epoch&1))return result(state,{kind:'idle'});
  if(header.epoch!==state.epoch)return result(Object.freeze({...state,epoch:header.epoch,posted:0,ack:false,running:null}),{kind:'reset',epoch:header.epoch,capacity:state.capacity,channels:state.channels});
  if(!state.ack)return result(state,{kind:'idle'});
  const running=header.nativeRunning&&header.contextRunning&&!header.userPaused&&(state.profile==='audio'||state.running===true||state.posted>header.consumed);
  // The selective audio service historically publishes running before samples;
  // playback starts only after queued samples and preserves starvation evidence.
  if(state.profile==='audio'&&running!==state.running)return result(Object.freeze({...state,running}),{kind:'state',epoch:state.epoch,running});
  if(header.produced<state.posted||state.posted<header.consumed||header.produced-header.consumed>state.capacity)
    return result(state,{kind:'error',message:state.profile==='audio'?'Invalid producer/consumer counters':'Invalid PCM counters'});
  if(state.posted<header.produced){
    const frames=Math.min(1024,header.produced-state.posted),posted=state.posted+frames;
    return result(Object.freeze({...state,posted,maxOutstanding:Math.max(state.maxOutstanding,posted-header.consumed)}),{kind:'pcm',epoch:state.epoch,start:state.posted,frames});
  }
  if(running!==state.running)return result(Object.freeze({...state,running}),{kind:'state',epoch:state.epoch,running});
  return result(state,{kind:'idle'});
}
export function privatePCMFeedback(state:PrivatePCMState,input:PrivatePCMFeedback,nativeEpoch:number,consumed:number):Readonly<{state:PrivatePCMState;write:Readonly<{epoch:number;consumed:number}>|null;pump:boolean;error:string|null}>{
  const result=(next:PrivatePCMState,pump=false,write:Readonly<{epoch:number;consumed:number}>|null=null,error:string|null=null)=>Object.freeze({state:next,pump,write:write?Object.freeze({...write}):null,error});
  if(state.phase!=='active'||state.error!==null)return result(state);
  if(input.epoch!==state.epoch||input.epoch!==nativeEpoch)return result(Object.freeze({...state,staleFeedback:state.staleFeedback+1}));
  if(input.kind==='resetAck')return state.ack?result(state):result(Object.freeze({...state,ack:true}),true,{epoch:state.epoch,consumed:0});
  if(input.kind==='consumed'){
    if(!Number.isInteger(input.frames)||input.frames<consumed||input.frames>state.posted)return result(state,false,null,'Invalid consumption feedback');
    return result(Object.freeze({...state,feedbackCount:state.feedbackCount+1}),true,{epoch:state.epoch,consumed:input.frames});
  }
  return result(state,state.profile==='playback');
}
export function failPrivatePCM(state:PrivatePCMState,error:string):Readonly<{state:PrivatePCMState;accepted:boolean}>{
  return state.error!==null?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,error}),accepted:true});
}
export function beginPrivatePCMStop(state:PrivatePCMState,now:number):Readonly<{state:PrivatePCMState;accepted:boolean;id:'worker-close'|'playback-close';deadline:number|null}>{
  const accepted=state.phase==='active',deadline=accepted?now+1000:state.stopDeadline;
  return Object.freeze({state:accepted?Object.freeze({...state,phase:'stopping',stopDeadline:deadline}):state,accepted,id:state.profile==='audio'?'worker-close':'playback-close',deadline});
}
export function settlePrivatePCMStop(state:PrivatePCMState,input:Readonly<{kind:'ack';id:string}|{kind:'deadline';now:number}|{kind:'send-error'}>):Readonly<{state:PrivatePCMState;outcome:'ignore'|'resolve'|'reject'}>{
  if(state.phase!=='stopping'||input.kind==='ack'&&input.id!==(state.profile==='audio'?'worker-close':'playback-close')||input.kind==='deadline'&&input.now<state.stopDeadline!)return Object.freeze({state,outcome:'ignore'});
  return Object.freeze({state:Object.freeze({...state,phase:'stopped',stopDeadline:null}),outcome:input.kind==='ack'?'resolve':'reject'});
}
