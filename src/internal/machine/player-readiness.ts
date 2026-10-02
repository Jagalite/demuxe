// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode} from '../../types.js';
import type {PlayerControlState} from './state.js';
import type {PlayerControlDecision} from './transition.js';
type Phase='native'|'sampling'|'confirming'|'waiting'|'finished';
export type PlayerReadinessState=Readonly<{serial:number;pending:Readonly<{id:number;epoch:number;operation:number;session:number;mode:PlaybackMode;phase:Phase;target:number;deadline:number|null}>|null}>;
export type ReadinessFacts=Readonly<{trackCount:number;hasVideo:boolean;selectedAudio:boolean;audioConfigured:boolean;unsupportedVideo:boolean;rendered:boolean;decoderCompatible:boolean;seeking:boolean;position:number|null}>;
export type PlayerReadinessInput=
 |Readonly<{type:'readiness.begin';epoch:number;operation:number|null;session:number|null;mode:PlaybackMode;target:number;now?:number;expected?:Readonly<{video:boolean;audio:boolean}>}>
 |Readonly<{type:'readiness.sample';id:number;now:number;failed:boolean;boundary?:number;facts?:ReadinessFacts}>
 |Readonly<{type:'readiness.completed';id:number;phase:Phase;confirmed?:boolean}>
 |Readonly<{type:'readiness.finished';id:number}>;
export type PlayerReadinessEffect=
 |Readonly<{kind:'readiness.native';expected?:Readonly<{video:boolean;audio:boolean}>}>
 |Readonly<{kind:'readiness.sample';deadline:number}>
 |Readonly<{kind:'readiness.confirm';target:number}>
 |Readonly<{kind:'readiness.wait';milliseconds:25}>;
export function initialPlayerReadiness():PlayerReadinessState{return Object.freeze({serial:0,pending:null});}
export function retirePlayerReadiness(state:PlayerReadinessState):PlayerReadinessState{return state.pending?Object.freeze({...state,pending:null}):state;}
function sessionCurrent(state:PlayerControlState,session:number):boolean{return state.source.acceptedSession===session&&state.source.acceptedEpoch===state.operations.epoch||state.source.candidate?.session===session&&state.source.candidate.operationEpoch===state.operations.epoch;}
export function playerReadinessAuthority(state:PlayerControlState,id:number):boolean{
 const pending=state.readiness.pending;
 return !!pending&&pending.id===id&&!state.operations.terminal&&pending.epoch===state.operations.epoch&&pending.operation===state.operations.active&&sessionCurrent(state,pending.session)&&state.operations.entries.some(entry=>entry.id===pending.operation&&entry.epoch===pending.epoch&&!entry.cancelled);
}
export function transitionPlayerReadiness(state:PlayerControlState,input:PlayerReadinessInput):PlayerControlDecision{
 const no=(reason='retired',message?:string):PlayerControlDecision=>Object.freeze({state,accepted:false,reason,message,retire:Object.freeze([])});
 const set=(readiness:PlayerReadinessState,effects:readonly PlayerReadinessEffect[]=[]):PlayerControlDecision=>Object.freeze({state:Object.freeze({...state,revision:state.revision+1,readiness}),accepted:true,id:readiness.pending?.id,retire:Object.freeze([]),readinessEffects:Object.freeze(effects.map(effect=>Object.freeze({...effect})))});
 const pending=state.readiness.pending;
 if(input.type==='readiness.finished')return pending?.id===input.id?set(retirePlayerReadiness(state.readiness)):no();
 if(input.type==='readiness.begin'){
  if(state.operations.terminal||input.epoch!==state.operations.epoch||input.operation===null||input.operation!==state.operations.active||input.session===null||!sessionCurrent(state,input.session)||!state.operations.entries.some(entry=>entry.id===input.operation&&entry.epoch===input.epoch&&!entry.cancelled))return no();
  if(pending)return no('busy','Presentation verification is already active');
  if(input.mode!=='native'&&(input.now===undefined||!Number.isFinite(input.now)))return no('invalid','Presentation verification requires a clock observation');
  const id=state.readiness.serial+1,deadline=input.mode==='native'?null:input.now!+25000;
  return set(Object.freeze({serial:id,pending:Object.freeze({id,epoch:input.epoch,operation:input.operation,session:input.session,mode:input.mode,phase:input.mode==='native'?'native':'sampling',target:input.target,deadline})}),[input.mode==='native'?{kind:'readiness.native',...(input.expected?{expected:Object.freeze({...input.expected})}:{})}:{kind:'readiness.sample',deadline:deadline!}]);
 }
 if(!pending||!playerReadinessAuthority(state,input.id))return no();
 const advance=(phase:Phase,effects:readonly PlayerReadinessEffect[]=[])=>set(Object.freeze({...state.readiness,pending:Object.freeze({...pending,phase})}),effects);
 const wait=()=>advance('waiting',[{kind:'readiness.wait',milliseconds:25}]);
 if(input.type==='readiness.sample'){
  if(pending.phase!=='sampling'||pending.deadline===null)return no();
  if(input.now>=pending.deadline)return no('timeout',`${pending.mode} mode did not present the requested position`);
  if(input.failed)return no('session-error');
  if(input.boundary!==undefined)return no('boundary');
  const facts=input.facts;if(!facts)return no('invalid','Missing presentation observations');
  if(!facts.hasVideo&&facts.trackCount>0&&(!facts.selectedAudio||facts.audioConfigured))return advance('finished');
  if(pending.mode==='hybrid'&&facts.unsupportedVideo)return no('unsupported','Hybrid mode has no external decoder for this video codec. Choose software mode for this source.');
  if(facts.rendered&&(pending.mode!=='hybrid'||facts.decoderCompatible)&&!facts.seeking&&facts.position!==null&&Math.abs(facts.position-pending.target)<.15)return advance('confirming',[{kind:'readiness.confirm',target:pending.target}]);
  return wait();
 }
 if(input.phase!==pending.phase)return no();
 switch(pending.phase){
  case 'native':return advance('finished');
  case 'confirming':return input.confirmed===false?wait():advance('finished');
  case 'waiting':return advance('sampling',[{kind:'readiness.sample',deadline:pending.deadline!}]);
  case 'sampling':case 'finished':return no();
 }
}
