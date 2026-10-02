// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode} from '../../types.js';
export type RouteRequirements=Readonly<{nativeRemux?:'auto'|'never'|'always'}>;
export type RecoveryState=Readonly<{serial:number;attemptedSession:number|null;pending:Readonly<{id:number;epoch:number;session:number}>|null;failedStreaming:Readonly<{source:number;plans:readonly string[]}>|null}>;
export type RecoveryChange=
  |Readonly<{kind:'begin';epoch:number;session:number}>
  |Readonly<{kind:'finished';id:number}>
  |Readonly<{kind:'streaming.failed';source:number;session:number;plan:string}>;
export function initialRecovery():RecoveryState{return Object.freeze({serial:0,attemptedSession:null,pending:null,failedStreaming:null});}
export function transitionRecovery(state:RecoveryState,change:RecoveryChange):RecoveryState{
  if(change.kind==='begin'){
    if(state.pending||state.attemptedSession===change.session)return state;
    return Object.freeze({...state,serial:state.serial+1,attemptedSession:change.session,pending:Object.freeze({id:state.serial+1,epoch:change.epoch,session:change.session})});
  }
  if(change.kind==='finished')return state.pending?.id===change.id?Object.freeze({...state,pending:null}):state;
  const plans=state.failedStreaming?.source===change.source?state.failedStreaming.plans:[];
  return plans.includes(change.plan)?Object.freeze({...state}):Object.freeze({...state,failedStreaming:Object.freeze({source:change.source,plans:Object.freeze([...plans,change.plan].slice(-128))})});
}
export function retireRecovery(state:RecoveryState):RecoveryState{return state.pending?Object.freeze({...state,pending:null}):state;}
export function clearRecovery(state:RecoveryState):RecoveryState{return Object.freeze({...state,attemptedSession:null,pending:null,failedStreaming:null});}
export function recoveryRoute(facts:Readonly<{mode:PlaybackMode;backendPlan:string|undefined;nativeRemux:'auto'|'never'|'always';streaming:boolean;trigger:'runtime'|'play'}>):Readonly<{start:number;requirements:RouteRequirements}>{
  const remux=!facts.streaming&&facts.mode==='native'&&(facts.backendPlan==='direct'||facts.trigger==='play'&&facts.backendPlan==='direct-mpv')&&facts.nativeRemux!=='never';
  return Object.freeze({start:facts.streaming||remux||facts.mode==='native'?0:facts.mode==='hybrid'?2:3,requirements:Object.freeze(remux?{nativeRemux:'always' as const}:{})});
}
