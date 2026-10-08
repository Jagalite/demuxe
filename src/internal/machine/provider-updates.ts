// SPDX-License-Identifier: Apache-2.0
export type ProviderUpdates=Readonly<{received:number;consumed:number}>;
export type ProviderUpdateChange=Readonly<{kind:'notify'}>|Readonly<{kind:'consume';through:number}>;
export function initialProviderUpdates():ProviderUpdates{return Object.freeze({received:0,consumed:0});}
export function providerUpdatesPending(state:ProviderUpdates):boolean{return state.received>state.consumed;}
export function transitionProviderUpdates(state:ProviderUpdates,change:ProviderUpdateChange):ProviderUpdates{
  return change.kind==='notify'?Object.freeze({...state,received:state.received+1})
    :Object.freeze({...state,consumed:Math.max(state.consumed,Math.min(state.received,change.through))});
}
