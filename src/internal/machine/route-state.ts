// SPDX-License-Identifier: Apache-2.0
import {initialRemuxDeployment,transitionRemuxDeployment,type RemuxDeployment,type RemuxDeploymentChange} from './remux-deployment.js';
import {initialRecovery,transitionRecovery,type RecoveryState,type RecoveryChange} from './route-recovery.js';
import {initialPromotion,transitionPromotion,type PromotionState,type PromotionChange} from './route-promotion.js';
import {initialRouteEvidence,transitionCapabilityOwner,transitionTierOwner,type RouteEvidence,type CapabilityChange,type TierChange} from './route-evidence.js';
import {copyData} from './data.js';
import {initialDiscovery,transitionDiscovery,type DiscoveryState,type DiscoveryChange} from './route-discovery.js';
import {initialInspection,transitionInspection,type InspectionState,type InspectionChange} from './route-inspection.js';
import type {SelectionAttempt} from './source-policy.js';
import type {RoutePlan} from './route-admission.js';
import type {DecodingEvidence} from './media-facts.js';
export type RoutingState=Readonly<{deployment:RemuxDeployment;recovery:RecoveryState;promotion:PromotionState;evidence:RouteEvidence;discovery:DiscoveryState;inspection:InspectionState;plans:readonly RoutePlan[];attempts:readonly SelectionAttempt[];context:Readonly<{nativeReason?:string;automatic:boolean}>}>;
export function initialRouting():RoutingState{return Object.freeze({deployment:initialRemuxDeployment(),recovery:initialRecovery(),promotion:initialPromotion(),evidence:initialRouteEvidence(),discovery:initialDiscovery(),inspection:initialInspection(),plans:Object.freeze([]),attempts:Object.freeze([]),context:Object.freeze({automatic:false})});}
export type RoutingInput=
  |Readonly<{type:'routing.deployment';epoch:number;operation:number|null;change:RemuxDeploymentChange}>
  |Readonly<{type:'routing.recovery';change:RecoveryChange}>
  |Readonly<{type:'routing.promotion';change:PromotionChange}>
  |Readonly<{type:'routing.capabilities';revision:number;change:CapabilityChange}>
  |Readonly<{type:'routing.tiers';revision:number;change:TierChange}>
  |Readonly<{type:'routing.discovery';epoch:number;operation:number|null;change:DiscoveryChange}>
  |Readonly<{type:'routing.inspection';epoch:number;operation:number|null;change:InspectionChange}>
  |Readonly<{type:'routing.plans';plans:readonly RoutePlan[]}>
  |Readonly<{type:'routing.context';context:RoutingState['context']}>
  |Readonly<{type:'routing.attempts';attempts:readonly SelectionAttempt[]}>
  |Readonly<{type:'routing.attempt';attempt:SelectionAttempt}>
  |Readonly<{type:'routing.reject';id:string;code:NonNullable<RoutePlan['code']>;reason:string}>
  |Readonly<{type:'routing.decoding';epoch:number;session:number|null;answers:readonly Readonly<{id:string;evidence:DecodingEvidence|undefined}>[]}>;
export function transitionRouting(state:RoutingState,input:RoutingInput):RoutingState{
  if(input.type==='routing.deployment'){const deployment=transitionRemuxDeployment(state.deployment,input.change);return deployment===state.deployment?state:Object.freeze({...state,deployment});}
  if(input.type==='routing.recovery'){const recovery=transitionRecovery(state.recovery,input.change);return recovery===state.recovery?state:Object.freeze({...state,recovery});}
  if(input.type==='routing.promotion'){const promotion=transitionPromotion(state.promotion,input.change);return promotion===state.promotion?state:Object.freeze({...state,promotion});}
  if(input.type==='routing.capabilities'){const capabilities=transitionCapabilityOwner(state.evidence.capabilities,input.change,input.revision);return capabilities===state.evidence.capabilities?state:Object.freeze({...state,evidence:Object.freeze({...state.evidence,capabilities})});}
  if(input.type==='routing.tiers'){const tiers=transitionTierOwner(state.evidence.tiers,input.change,input.revision);return tiers===state.evidence.tiers?state:Object.freeze({...state,evidence:Object.freeze({...state.evidence,tiers})});}
  if(input.type==='routing.discovery'){const discovery=transitionDiscovery(state.discovery,input.change);return discovery===state.discovery?state:Object.freeze({...state,discovery,...(input.change.kind==='reinspected'?{context:Object.freeze({nativeReason:discovery.current?.nativeReason,automatic:discovery.current?.automatic??state.context.automatic})}:{})});}
  if(input.type==='routing.inspection'){const inspection=transitionInspection(state.inspection,input.change);return inspection===state.inspection?state:Object.freeze({...state,inspection});}
  if(input.type==='routing.plans')return Object.freeze({...state,plans:copyData(input.plans)});
  if(input.type==='routing.context')return Object.freeze({...state,context:copyData(input.context)});
  if(input.type==='routing.attempts')return Object.freeze({...state,attempts:copyData(input.attempts.slice(-32))});
  if(input.type==='routing.attempt')return Object.freeze({...state,attempts:copyData([...state.attempts.slice(-31),input.attempt])});
  if(input.type==='routing.reject')return Object.freeze({...state,plans:Object.freeze(state.plans.map(plan=>plan.id===input.id?copyData({...plan,eligible:false,code:input.code,reason:input.reason}):plan))});
  return Object.freeze({...state,plans:Object.freeze(state.plans.map(plan=>{const answer=input.answers.find(answer=>answer.id===plan.id);return answer&&plan.browserCapability?copyData({...plan,browserCapability:{...plan.browserCapability,decodingInfo:answer.evidence}}):plan;}))});
}
