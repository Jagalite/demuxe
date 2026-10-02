// SPDX-License-Identifier: Apache-2.0
import {copyData} from './data.js';
import type {SelectionAttempt} from './source-policy.js';
import type {RoutePlan} from './route-admission.js';
import type {DecodingEvidence} from './media-facts.js';
export type RoutingState=Readonly<{plans:readonly RoutePlan[];attempts:readonly SelectionAttempt[];context:Readonly<{nativeReason?:string;automatic:boolean}>}>;
export function initialRouting():RoutingState{return Object.freeze({plans:Object.freeze([]),attempts:Object.freeze([]),context:Object.freeze({automatic:false})});}
export type RoutingInput=
  |Readonly<{type:'routing.plans';plans:readonly RoutePlan[]}>
  |Readonly<{type:'routing.context';context:RoutingState['context']}>
  |Readonly<{type:'routing.attempts';attempts:readonly SelectionAttempt[]}>
  |Readonly<{type:'routing.attempt';attempt:SelectionAttempt}>
  |Readonly<{type:'routing.reject';id:string;code:NonNullable<RoutePlan['code']>;reason:string}>
  |Readonly<{type:'routing.decoding';epoch:number;session:number|null;answers:readonly Readonly<{id:string;evidence:DecodingEvidence|undefined}>[]}>;
export function transitionRouting(state:RoutingState,input:RoutingInput):RoutingState{
  if(input.type==='routing.plans')return Object.freeze({...state,plans:copyData(input.plans)});
  if(input.type==='routing.context')return Object.freeze({...state,context:copyData(input.context)});
  if(input.type==='routing.attempts')return Object.freeze({...state,attempts:copyData(input.attempts.slice(-32))});
  if(input.type==='routing.attempt')return Object.freeze({...state,attempts:copyData([...state.attempts.slice(-31),input.attempt])});
  if(input.type==='routing.reject')return Object.freeze({...state,plans:Object.freeze(state.plans.map(plan=>plan.id===input.id?copyData({...plan,eligible:false,code:input.code,reason:input.reason}):plan))});
  return Object.freeze({...state,plans:Object.freeze(state.plans.map(plan=>{const answer=input.answers.find(answer=>answer.id===plan.id);return answer&&plan.browserCapability?copyData({...plan,browserCapability:{...plan.browserCapability,decodingInfo:answer.evidence}}):plan;}))});
}
