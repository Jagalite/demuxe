// SPDX-License-Identifier: Apache-2.0
import {createCapabilities,transitionCapabilities,createTierAttempts,recordTierFailure,readTierFailure,type CapabilityState,type CapabilityEvent,type TierAttemptState} from './routing.js';

/** Evidence belongs to the Player routing commit. Object-to-ID associations and
 * clock sampling remain in adapters. Monotonic versions reject observations
 * captured before retirement, including a clear followed by a new source. */
export type CapabilityOwner=Readonly<{revision:number;serial:number;identityEpoch:number;value:CapabilityState}>;
export type TierOwner=Readonly<{revision:number;serial:number;identityEpoch:number;value:TierAttemptState}>;
export type CapabilityChange=Readonly<{kind:'identity'}>|Readonly<{kind:'event';event:CapabilityEvent}>;
export type TierChange=Readonly<{kind:'identity'}>|Readonly<{kind:'clear'}>|Readonly<{kind:'failure';key:string;reason:string;now:number}>|Readonly<{kind:'read';key:string;now:number}>;
export type RouteEvidence=Readonly<{capabilities:CapabilityOwner;tiers:TierOwner}>;
export function initialCapabilityOwner():CapabilityOwner{return Object.freeze({revision:0,serial:0,identityEpoch:0,value:createCapabilities()});}
export function initialTierOwner():TierOwner{return Object.freeze({revision:0,serial:0,identityEpoch:0,value:createTierAttempts()});}
export function initialRouteEvidence():RouteEvidence{return Object.freeze({capabilities:initialCapabilityOwner(),tiers:initialTierOwner()});}
export function transitionCapabilityOwner(state:CapabilityOwner,change:CapabilityChange,revision:number):CapabilityOwner{
  if(revision!==state.revision)return state;
  if(change.kind==='identity')return Object.freeze({...state,revision:state.revision+1,serial:state.serial+1});
  const value=transitionCapabilities(state.value,change.event);
  return value===state.value?state:Object.freeze({...state,revision:state.revision+1,identityEpoch:state.identityEpoch+(change.event.kind==='clear'?1:0),value});
}
export function transitionTierOwner(state:TierOwner,change:TierChange,revision:number):TierOwner{
  if(revision!==state.revision)return state;
  if(change.kind==='identity')return Object.freeze({...state,revision:state.revision+1,serial:state.serial+1});
  const value=change.kind==='clear'?createTierAttempts():change.kind==='failure'?recordTierFailure(state.value,change.key,change.reason,change.now):readTierFailure(state.value,change.key,change.now).state;
  return value===state.value?state:Object.freeze({...state,revision:state.revision+1,identityEpoch:state.identityEpoch+(change.kind==='clear'?1:0),value});
}
export function clearRouteEvidence(state:RouteEvidence):RouteEvidence{return Object.freeze({capabilities:transitionCapabilityOwner(state.capabilities,{kind:'event',event:{kind:'clear'}},state.capabilities.revision),tiers:transitionTierOwner(state.tiers,{kind:'clear'},state.tiers.revision)});}
/** Retiring a command rejects facts currently being captured without discarding
 * previously accepted evidence or the compatibility retry budget. */
export function retireRouteEvidence(state:RouteEvidence):RouteEvidence{return Object.freeze({capabilities:Object.freeze({...state.capabilities,revision:state.capabilities.revision+1}),tiers:Object.freeze({...state.tiers,revision:state.tiers.revision+1})});}
