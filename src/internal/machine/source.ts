// SPDX-License-Identifier: Apache-2.0
import {initialSourcePreparation,claimSourcePreparation,completeSourcePreparation,sourcePreparationDone,type SourcePreparation,type SourcePreparationFacts,type SourcePreparationEffect} from './source-preparation.js';
import {initialSourceApplication,claimSourceApplication,completeSourceApplication,sourceApplicationDone,type SourceApplication,type SourceApplicationFacts,type SourceApplicationEffect,type SourceApplicationObservation} from './source-application.js';
import type {PlaybackMode} from '../../types.js';
import type {PlaybackSettings} from './settings.js';

type Phase='preparing'|'configuring'|'opening'|'applying'|'positioning'|'verifying'|'accepted';
export type SourceAttempt=Readonly<{id:number;operationEpoch:number;operation:number|null;session:number;mode:PlaybackMode;preserve:boolean;phase:Phase;planId:string;preparation:SourcePreparation|null;application:SourceApplication|null}>;
export type SourceControl=Readonly<{serial:number;attemptSerial:number;sessionSerial:number;acceptedSession:number|null;acceptedEpoch:number|null;mode:PlaybackMode;automatic:boolean;candidate:SourceAttempt|null}>;
export type SourceInput=
  |Readonly<{type:'source.configure';mode?:PlaybackMode;automatic?:boolean}>
  |Readonly<{type:'source.begin';operationEpoch:number;operation?:number|null;mode:PlaybackMode;preserve:boolean;planId:string}>
  |Readonly<{type:'source.created';attempt:number;prepare?:boolean}>
  |Readonly<{type:'source.application.begin';attempt:number;facts:SourceApplicationFacts}>
  |Readonly<{type:'source.application.next';attempt:number}>
  |Readonly<{type:'source.application.completed';attempt:number;step:number;observation?:SourceApplicationObservation}>
  |Readonly<{type:'source.preparation.next';attempt:number}>
  |Readonly<{type:'source.preparation.completed';attempt:number;step:number;facts?:SourcePreparationFacts}>
  |Readonly<{type:'source.configured'|'source.opened'|'source.applied'|'source.positioned'|'source.finished';attempt:number}>
  |Readonly<{type:'source.accept';attempt:number;operationEpoch:number;settings:Readonly<PlaybackSettings>;planMatches:boolean;timing?:Readonly<{elapsed:number;timestamps:readonly number[]}>;publicSelections?:Readonly<Partial<Record<'audio'|'sub',string>>>}>
  |Readonly<{type:'source.clear'}>;
export type SourceDecision=Readonly<{state:SourceControl;accepted:boolean;attempt?:number;preparationEffect?:SourcePreparationEffect;applicationEffect?:SourceApplicationEffect;settings?:Readonly<PlaybackSettings>;newSource?:boolean;reason?:'busy'|'retired'|'phase'|'plan'}>;
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
    return Object.freeze({state:Object.freeze({...state,attemptSerial:id,sessionSerial:session,candidate:Object.freeze({id,session,operationEpoch:input.operationEpoch,operation:input.operation??null,mode:input.mode,preserve:input.preserve,planId:input.planId,phase:'preparing' as const,preparation:null,application:null})}),accepted:true,attempt:id});
  }
  const attempt=state.candidate;if(!attempt||attempt.id!==input.attempt)return no(state,'retired');
  if(input.type==='source.finished')return ok({...state,candidate:null});
  if(input.type==='source.preparation.next'||input.type==='source.preparation.completed'){
    if(input.type==='source.preparation.next'&&attempt.preparation&&sourcePreparationDone(attempt.preparation))return Object.freeze({state,accepted:true});
    if(!attempt.preparation||!['configuring','opening'].includes(attempt.phase))return no(state,'phase');
    if(input.type==='source.preparation.next'){
      const next=claimSourcePreparation(attempt.preparation);if(!next.accepted)return no(state,'busy');
      const candidate=next.state===attempt.preparation?attempt:Object.freeze({...attempt,preparation:next.state});
      return Object.freeze({...ok(candidate===attempt?state:{...state,candidate}),preparationEffect:next.effect});
    }
    if(input.facts&&input.facts.mode!==attempt.mode)return no(state,'phase');
    const next=completeSourcePreparation(attempt.preparation,input.step,input.facts);if(!next.accepted)return no(state,'phase');
    return ok({...state,candidate:Object.freeze({...attempt,preparation:next.state,phase:next.phase??attempt.phase})});
  }
  if(input.type==='source.application.begin'){
    if(attempt.phase!=='applying'||attempt.application||attempt.mode!==input.facts.mode||attempt.preserve!==input.facts.preserve||attempt.planId!==input.facts.planId)return no(state,'phase');
    return ok({...state,candidate:Object.freeze({...attempt,application:initialSourceApplication(input.facts)})});
  }
  if(input.type==='source.application.next'||input.type==='source.application.completed'){
    if(input.type==='source.application.next'&&attempt.application&&sourceApplicationDone(attempt.application))return Object.freeze({state,accepted:true});
    if(!attempt.application||attempt.phase!=='applying')return no(state,'phase');
    if(input.type==='source.application.next'){
      const next=claimSourceApplication(attempt.application);if(!next.accepted)return no(state,'busy');
      return Object.freeze({...ok({...state,candidate:Object.freeze({...attempt,application:next.state})}),applicationEffect:next.effect});
    }
    const next=completeSourceApplication(attempt.application,input.step,input.observation);if(!next.accepted)return no(state,'phase');
    return ok({...state,candidate:Object.freeze({...attempt,application:next.state,phase:next.applied?'positioning':attempt.phase})});
  }
  if(attempt.application&&input.type==='source.applied')return no(state,'phase');
  if(attempt.preparation&&(input.type==='source.configured'||input.type==='source.opened'))return no(state,'phase');
  if(input.type==='source.accept'){
    if(attempt.operationEpoch!==input.operationEpoch)return no(state,'retired');
    if(attempt.phase!=='verifying')return no(state,'phase');
    if(!input.planMatches)return no(state,'plan');
    return Object.freeze({state:Object.freeze({...state,serial:state.serial+(attempt.preserve?0:1),acceptedSession:attempt.session,acceptedEpoch:attempt.operationEpoch,mode:attempt.mode,candidate:Object.freeze({...attempt,phase:'accepted' as const})}),accepted:true,settings:Object.freeze({...attempt.application?.settings??input.settings}),newSource:!attempt.preserve});
  }
  const phases={
    'source.created':['preparing','configuring'],
    'source.configured':['configuring','opening'],
    'source.opened':['opening','applying'],
    'source.applied':['applying','positioning'],
    'source.positioned':['positioning','verifying'],
  } as const;
  const [before,after]=phases[input.type];
  return attempt.phase===before?ok({...state,candidate:Object.freeze({...attempt,phase:after,...(input.type==='source.created'&&input.prepare?{preparation:initialSourcePreparation()}:{})})}):no(state,'phase');
}
export function sourceDesiredSettings(settings:Readonly<PlaybackSettings>,facts:Readonly<{preserve:boolean;previousPause:boolean;previousSession:boolean;previousMode:PlaybackMode;mode:PlaybackMode}>):Readonly<PlaybackSettings>{
  const reset=(!facts.preserve&&facts.previousSession)||(facts.preserve&&(facts.mode==='native')!==(facts.previousMode==='native'));
  return Object.freeze({...settings,pause:facts.preserve?facts.previousPause:true,...(reset?{aid:facts.preserve&&settings.aid==='no'?'no':'auto',sid:facts.preserve&&settings.sid==='no'?'no':'auto'}:{})});
}

export function sourcePreparationCurrent(state:SourceControl,attempt:number,step:number):boolean{return state.candidate?.id===attempt&&state.candidate.preparation?.pending===step;}

export function sourceApplicationCurrent(state:SourceControl,attempt:number,step:number):boolean{return state.candidate?.id===attempt&&state.candidate.application?.pending===step;}
