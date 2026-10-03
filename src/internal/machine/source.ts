// SPDX-License-Identifier: Apache-2.0
import {initialSourcePreparation,claimSourcePreparation,completeSourcePreparation,sourcePreparationDone,type SourcePreparation,type SourcePreparationFacts,type SourcePreparationEffect} from './source-preparation.js';
import {initialSourceApplication,claimSourceApplication,completeSourceApplication,sourceApplicationDone,type SourceApplication,type SourceApplicationFacts,type SourceApplicationEffect,type SourceApplicationObservation} from './source-application.js';
import {initialSourcePositioning,claimSourcePositioning,completeSourcePositioning,sourcePositioningDone,type SourcePositioning,type SourcePositioningEffect,type SourcePositioningObservation} from './source-positioning.js';
import {initialSourceAcceptance,claimSourceAcceptance,completeSourceAcceptance,failSourceAcceptance,claimSourceAcceptanceCleanup,completeSourceAcceptanceCleanup,type SourceAcceptance,type SourceAcceptanceEffect} from './source-acceptance.js';
import type {PlaybackMode} from '../../types.js';
import type {PlaybackSettings} from './settings.js';

type Phase='preparing'|'configuring'|'opening'|'applying'|'positioning'|'verifying'|'accepted';
export type SourceAttempt=Readonly<{id:number;operationEpoch:number;operation:number|null;session:number;fault:number|null;mode:PlaybackMode;preserve:boolean;phase:Phase;planId:string;preparation:SourcePreparation|null;application:SourceApplication|null;positioning:SourcePositioning|null;acceptance:SourceAcceptance|null}>;
export type SourceControl=Readonly<{serial:number;attemptSerial:number;sessionSerial:number;faultSerial:number;acceptedFault:number|null;acceptedSession:number|null;acceptedEpoch:number|null;mode:PlaybackMode;automatic:boolean;candidate:SourceAttempt|null}>;
export type SourceInput=
  |Readonly<{type:'source.fault';session:number}>
  |Readonly<{type:'source.acceptance.next';attempt:number}>
  |Readonly<{type:'source.acceptance.completed';attempt:number;step:number;hasProperty?:boolean}>
  |Readonly<{type:'source.acceptance.failed'|'source.acceptance.cleanup'|'source.acceptance.cleaned';attempt:number;operationEpoch:number;operation:number|null}>
  |Readonly<{type:'source.configure';mode?:PlaybackMode;automatic?:boolean}>
  |Readonly<{type:'source.begin';operationEpoch:number;operation?:number|null;mode:PlaybackMode;preserve:boolean;planId:string}>
  |Readonly<{type:'source.created';attempt:number;prepare?:boolean}>
  |Readonly<{type:'source.positioning.begin';attempt:number;target:number;overlapping:boolean}>
  |Readonly<{type:'source.positioning.next';attempt:number}>
  |Readonly<{type:'source.positioning.completed';attempt:number;step:number;observation?:SourcePositioningObservation}>
  |Readonly<{type:'source.application.begin';attempt:number;facts:SourceApplicationFacts}>
  |Readonly<{type:'source.application.next';attempt:number}>
  |Readonly<{type:'source.application.completed';attempt:number;step:number;observation?:SourceApplicationObservation}>
  |Readonly<{type:'source.preparation.next';attempt:number}>
  |Readonly<{type:'source.preparation.completed';attempt:number;step:number;facts?:SourcePreparationFacts}>
  |Readonly<{type:'source.configured'|'source.opened'|'source.applied'|'source.positioned'|'source.finished';attempt:number}>
  |Readonly<{type:'source.accept';attempt:number;operationEpoch:number;settings:Readonly<PlaybackSettings>;planMatches:boolean;publication?:Readonly<{predecessor:boolean}>;timing?:Readonly<{elapsed:number;timestamps:readonly number[]}>;publicSelections?:Readonly<Partial<Record<'audio'|'sub',string>>>}>
  |Readonly<{type:'source.clear'}>;
export type SourceDecision=Readonly<{state:SourceControl;accepted:boolean;attempt?:number;preparationEffect?:SourcePreparationEffect;applicationEffect?:SourceApplicationEffect;positioningEffect?:SourcePositioningEffect;acceptanceEffect?:SourceAcceptanceEffect;settings?:Readonly<PlaybackSettings>;newSource?:boolean;reason?:'busy'|'retired'|'phase'|'plan'|'fault-capacity'}>;
export function initialSource():SourceControl{return Object.freeze({serial:0,attemptSerial:0,sessionSerial:0,faultSerial:0,acceptedFault:null,acceptedSession:null,acceptedEpoch:null,mode:'native',automatic:true,candidate:null});}
const ok=(state:SourceControl):SourceDecision=>Object.freeze({state:Object.freeze({...state}),accepted:true});
const no=(state:SourceControl,reason:SourceDecision['reason']):SourceDecision=>Object.freeze({state,accepted:false,reason});
/** Candidate and accepted identities are separate. A preserving handoff advances
 * session identity without changing the public source identity. Settings commit
 * is returned to the composed transition, never published independently. */
export function transitionSource(state:SourceControl,input:SourceInput):SourceDecision {
  if(input.type==='source.fault'){
    const accepted=state.acceptedSession===input.session,candidate=state.candidate?.session===input.session;
    if(!accepted&&!candidate)return no(state,'retired');
    if(!Number.isSafeInteger(state.faultSerial)||state.faultSerial>=Number.MAX_SAFE_INTEGER)return no(state,'fault-capacity');
    const fault=state.faultSerial+1;
    return ok({...state,faultSerial:fault,acceptedFault:accepted?fault:state.acceptedFault,candidate:candidate?Object.freeze({...state.candidate!,fault}):state.candidate});
  }
  if(input.type==='source.configure')return ok({...state,mode:input.mode??state.mode,automatic:input.automatic??state.automatic});
  if(input.type==='source.clear')return ok({...state,acceptedSession:null,acceptedFault:null,acceptedEpoch:null,candidate:null});
  if(input.type==='source.begin'){
    if(state.candidate)return no(state,'busy');
    const id=state.attemptSerial+1,session=state.sessionSerial+1;
    return Object.freeze({state:Object.freeze({...state,attemptSerial:id,sessionSerial:session,candidate:Object.freeze({id,session,fault:null,operationEpoch:input.operationEpoch,operation:input.operation??null,mode:input.mode,preserve:input.preserve,planId:input.planId,phase:'preparing' as const,preparation:null,application:null,positioning:null,acceptance:null})}),accepted:true,attempt:id});
  }
  const attempt=state.candidate;if(!attempt||attempt.id!==input.attempt)return no(state,'retired');
  if(input.type==='source.finished')return attempt.acceptance&&attempt.acceptance.cleanup!=='done'?no(state,'busy'):ok({...state,candidate:null});
  if(input.type==='source.acceptance.next'||input.type==='source.acceptance.completed'||input.type==='source.acceptance.failed'||input.type==='source.acceptance.cleanup'||input.type==='source.acceptance.cleaned'){
    if(attempt.phase!=='accepted'||!attempt.acceptance)return no(state,'phase');
    if(input.type==='source.acceptance.next'){
      const next=claimSourceAcceptance(attempt.acceptance);if(!next.accepted)return no(state,'busy');
      return Object.freeze({...ok({...state,candidate:Object.freeze({...attempt,acceptance:next.state})}),acceptanceEffect:next.effect});
    }
    if(input.type==='source.acceptance.completed'){
      const next=completeSourceAcceptance(attempt.acceptance,input.step,input.hasProperty);return next.accepted?ok({...state,candidate:Object.freeze({...attempt,acceptance:next.state})}):no(state,'phase');
    }
    if(input.type==='source.acceptance.failed'||input.type==='source.acceptance.cleanup'||input.type==='source.acceptance.cleaned'){
      if(input.operationEpoch!==attempt.operationEpoch||input.operation!==attempt.operation)return no(state,'retired');
      const next=input.type==='source.acceptance.failed'?{state:failSourceAcceptance(attempt.acceptance),accepted:true}:input.type==='source.acceptance.cleanup'?claimSourceAcceptanceCleanup(attempt.acceptance):completeSourceAcceptanceCleanup(attempt.acceptance);
      return next.accepted?ok({...state,candidate:Object.freeze({...attempt,acceptance:next.state})}):no(state,'phase');
    }
  }
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
  if(input.type==='source.positioning.begin'){
    if(attempt.phase!=='positioning'||attempt.positioning||!attempt.application||!sourceApplicationDone(attempt.application))return no(state,'phase');
    return ok({...state,candidate:Object.freeze({...attempt,positioning:initialSourcePositioning({mode:attempt.mode,planId:attempt.planId,settings:attempt.application.settings,target:input.target,overlapping:input.overlapping})})});
  }
  if(input.type==='source.positioning.next'||input.type==='source.positioning.completed'){
    if(input.type==='source.positioning.next'&&attempt.positioning&&sourcePositioningDone(attempt.positioning))return Object.freeze({state,accepted:true});
    if(!attempt.positioning||!['positioning','verifying'].includes(attempt.phase))return no(state,'phase');
    if(input.type==='source.positioning.next'){
      const next=claimSourcePositioning(attempt.positioning);if(!next.accepted)return no(state,'busy');
      return Object.freeze({...ok({...state,candidate:Object.freeze({...attempt,positioning:next.state})}),positioningEffect:next.effect});
    }
    const next=completeSourcePositioning(attempt.positioning,input.step,input.observation);if(!next.accepted)return no(state,'phase');
    return ok({...state,candidate:Object.freeze({...attempt,positioning:next.state,phase:next.positioned?'verifying':attempt.phase})});
  }
  if((attempt.application||attempt.positioning)&&input.type==='source.positioned')return no(state,'phase');
  if((attempt.preparation||attempt.application)&&input.type==='source.applied')return no(state,'phase');
  if(attempt.preparation&&(input.type==='source.configured'||input.type==='source.opened'))return no(state,'phase');
  if(input.type==='source.accept'){
    if(attempt.operationEpoch!==input.operationEpoch)return no(state,'retired');
    if(attempt.phase!=='verifying')return no(state,'phase');
    if(attempt.positioning?!sourcePositioningDone(attempt.positioning)||!attempt.positioning.planMatches:!input.planMatches)return no(state,'plan');
    return Object.freeze({state:Object.freeze({...state,serial:state.serial+(attempt.preserve?0:1),acceptedSession:attempt.session,acceptedFault:attempt.fault,acceptedEpoch:attempt.operationEpoch,mode:attempt.mode,candidate:Object.freeze({...attempt,phase:'accepted' as const,acceptance:input.publication?initialSourceAcceptance(input.publication.predecessor):null})}),accepted:true,settings:Object.freeze({...attempt.application?.settings??input.settings}),newSource:!attempt.preserve});
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

export function sourcePositioningCurrent(state:SourceControl,attempt:number,step:number):boolean{return state.candidate?.id===attempt&&state.candidate.positioning?.pending===step;}

/** Fault identities are bounded by the candidate and accepted session owners. */
export function sourceSessionFault(state:SourceControl,session:number):number|null{return state.acceptedSession===session?state.acceptedFault:state.candidate?.session===session?state.candidate.fault:null;}
