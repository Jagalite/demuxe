// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode} from '../../types.js';
import type {PlaybackSettings} from './settings.js';

type Phase='preparing'|'configuring'|'opening'|'applying'|'positioning'|'verifying'|'accepted';
export type SourceAttempt=Readonly<{id:number;operationEpoch:number;session:number;mode:PlaybackMode;preserve:boolean;phase:Phase;planId:string}>;
export type SourceControl=Readonly<{serial:number;attemptSerial:number;sessionSerial:number;acceptedSession:number|null;acceptedEpoch:number|null;mode:PlaybackMode;automatic:boolean;candidate:SourceAttempt|null}>;
export type SourceInput=
  |Readonly<{type:'source.configure';mode?:PlaybackMode;automatic?:boolean}>
  |Readonly<{type:'source.begin';operationEpoch:number;mode:PlaybackMode;preserve:boolean;planId:string}>
  |Readonly<{type:'source.created'|'source.configured'|'source.opened'|'source.applied'|'source.positioned'|'source.finished';attempt:number}>
  |Readonly<{type:'source.accept';attempt:number;operationEpoch:number;settings:Readonly<PlaybackSettings>;planMatches:boolean}>
  |Readonly<{type:'source.clear'}>;
export type SourceDecision=Readonly<{state:SourceControl;accepted:boolean;attempt?:number;settings?:Readonly<PlaybackSettings>;newSource?:boolean;reason?:'busy'|'retired'|'phase'|'plan'}>;
export function initialSource():SourceControl{return Object.freeze({serial:0,attemptSerial:0,sessionSerial:0,acceptedSession:null,acceptedEpoch:null,mode:'native',automatic:true,candidate:null});}
const ok=(state:SourceControl):SourceDecision=>Object.freeze({state:Object.freeze({...state}),accepted:true});
const no=(state:SourceControl,reason:SourceDecision['reason']):SourceDecision=>Object.freeze({state,accepted:false,reason});
/** Candidate and accepted identities are separate. A preserving handoff advances
 * session identity without changing the public source identity. Settings commit
 * is returned to the composed transition, never published independently. */
export function transitionSource(state:SourceControl,input:SourceInput):SourceDecision {
  if(input.type==='source.configure')return ok({...state,mode:input.mode??state.mode,automatic:input.automatic??state.automatic});
  if(input.type==='source.clear')return ok({...state,acceptedSession:null,acceptedEpoch:null,candidate:null});
  if(input.type==='source.begin'){
    if(state.candidate)return no(state,'busy');
    const id=state.attemptSerial+1,session=state.sessionSerial+1;
    return Object.freeze({state:Object.freeze({...state,attemptSerial:id,sessionSerial:session,candidate:Object.freeze({id,session,operationEpoch:input.operationEpoch,mode:input.mode,preserve:input.preserve,planId:input.planId,phase:'preparing' as const})}),accepted:true,attempt:id});
  }
  const attempt=state.candidate;if(!attempt||attempt.id!==input.attempt)return no(state,'retired');
  if(input.type==='source.finished')return ok({...state,candidate:null});
  if(input.type==='source.accept'){
    if(attempt.operationEpoch!==input.operationEpoch)return no(state,'retired');
    if(attempt.phase!=='verifying')return no(state,'phase');
    if(!input.planMatches)return no(state,'plan');
    return Object.freeze({state:Object.freeze({...state,serial:state.serial+(attempt.preserve?0:1),acceptedSession:attempt.session,acceptedEpoch:attempt.operationEpoch,mode:attempt.mode,candidate:Object.freeze({...attempt,phase:'accepted' as const})}),accepted:true,settings:Object.freeze({...input.settings}),newSource:!attempt.preserve});
  }
  const phases={
    'source.created':['preparing','configuring'],
    'source.configured':['configuring','opening'],
    'source.opened':['opening','applying'],
    'source.applied':['applying','positioning'],
    'source.positioned':['positioning','verifying'],
  } as const;
  const [before,after]=phases[input.type];
  return attempt.phase===before?ok({...state,candidate:Object.freeze({...attempt,phase:after})}):no(state,'phase');
}
export function sourceDesiredSettings(settings:Readonly<PlaybackSettings>,facts:Readonly<{preserve:boolean;previousPause:boolean;previousSession:boolean;previousMode:PlaybackMode;mode:PlaybackMode}>):Readonly<PlaybackSettings>{
  const reset=(!facts.preserve&&facts.previousSession)||(facts.preserve&&(facts.mode==='native')!==(facts.previousMode==='native'));
  return Object.freeze({...settings,pause:facts.preserve?facts.previousPause:true,...(reset?{aid:facts.preserve&&settings.aid==='no'?'no':'auto',sid:facts.preserve&&settings.sid==='no'?'no':'auto'}:{})});
}
