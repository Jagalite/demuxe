// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode} from '../../types.js';
export type RouteRequirements=Readonly<{nativeRemux?:'auto'|'never'|'always'}>;
export type RecoveryState=Readonly<{serial:number;attemptedSession:number|null;pending:Readonly<{id:number;epoch:number;session:number;phase:'classifying'|'queued'|'pausing'|'selecting'|'failed'|'selected'|'terminal'}>|null;failedStreaming:Readonly<{source:number;plans:readonly string[]}>|null}>;
export type RecoveryChange=
  |Readonly<{kind:'begin';epoch:number;session:number}>
  |Readonly<{kind:'classified';id:number;compatible:boolean}>
  |Readonly<{kind:'start';id:number;current:boolean;automatic:boolean}>
  |Readonly<{kind:'paused';id:number}>
  |Readonly<{kind:'outcome';id:number;selected:boolean}>
  |Readonly<{kind:'finished';id:number}>
  |Readonly<{kind:'streaming.failed';source:number;session:number;plan:string}>;
export function initialRecovery():RecoveryState{return Object.freeze({serial:0,attemptedSession:null,pending:null,failedStreaming:null});}
export function transitionRecovery(state:RecoveryState,change:RecoveryChange):RecoveryState{
  if(change.kind==='begin'){
    if(state.pending||state.attemptedSession===change.session)return state;
    return Object.freeze({...state,serial:state.serial+1,attemptedSession:change.session,pending:Object.freeze({id:state.serial+1,epoch:change.epoch,session:change.session,phase:'classifying' as const})});
  }
  if(change.kind==='finished')return state.pending?.id===change.id?Object.freeze({...state,pending:null}):state;
  if(change.kind!=='streaming.failed'){
    const pending=state.pending;if(!pending||pending.id!==change.id)return state;
    let phase= pending.phase;
    if(change.kind==='classified'&&phase==='classifying')phase=change.compatible?'queued':'terminal';
    else if(change.kind==='start'&&phase==='queued') {if(!change.current||!change.automatic)return Object.freeze({...state,pending:null});phase='pausing';}
    else if(change.kind==='paused'&&phase==='pausing')phase='selecting';
    else if(change.kind==='outcome'&&(phase==='selecting'||!change.selected&&(phase==='pausing'||phase==='queued')))phase=change.selected?'selected':'failed';
    else return state;
    return Object.freeze({...state,pending:Object.freeze({...pending,phase})});
  }
  const plans=state.failedStreaming?.source===change.source?state.failedStreaming.plans:[];
  return plans.includes(change.plan)?Object.freeze({...state}):Object.freeze({...state,failedStreaming:Object.freeze({source:change.source,plans:Object.freeze([...plans,change.plan].slice(-128))})});
}
export function retireRecovery(state:RecoveryState):RecoveryState{return state.pending?Object.freeze({...state,pending:null}):state;}
export function clearRecovery(state:RecoveryState):RecoveryState{return Object.freeze({...state,attemptedSession:null,pending:null,failedStreaming:null});}
export function recoveryRoute(facts:Readonly<{providerOrdered?:boolean;mode:PlaybackMode;backendPlan:string|undefined;nativeRemux:'auto'|'never'|'always';streaming:boolean;trigger:'runtime'|'play'}>):Readonly<{start:number;requirements:RouteRequirements}>{
  const remux=!facts.streaming&&facts.mode==='native'&&(facts.backendPlan==='direct'||facts.trigger==='play'&&facts.backendPlan==='direct-mpv')&&facts.nativeRemux!=='never';
  return Object.freeze({start:facts.streaming||remux||facts.mode==='native'?0:facts.providerOrdered?1:facts.mode==='hybrid'?2:3,requirements:Object.freeze(remux?{nativeRemux:'always' as const}:{})});
}

/** Pure response policy. Adapter facts describe the observed fault; no physical
 * error objects, handles or callbacks are retained by this decision. */
export function playbackFaultResponse(facts:Readonly<{providerOrdered?:boolean;origin:'watchdog'|'backend'|'track-policy';current:boolean;accepted:boolean;busy:boolean;destroyed:boolean;automatic:boolean;mode:PlaybackMode;fault:boolean;endFileError?:boolean}>):'ignore'|'recover'|'pause-error'|'error'|'forward'{
  if(!facts.current||!facts.accepted||facts.destroyed||facts.origin!=='watchdog'&&facts.busy)return 'ignore';
  if(facts.origin==='track-policy')return facts.fault?'pause-error':'forward';
  if(!facts.fault)return 'forward';
  if(facts.automatic&&(facts.origin==='watchdog'||facts.mode!=='software'||facts.providerOrdered))return 'recover';
  return facts.origin==='watchdog'?'pause-error':facts.endFileError?'error':'forward';
}
