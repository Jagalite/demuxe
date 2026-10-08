// SPDX-License-Identifier: Apache-2.0
/** A viewport expansion owns document-wide inert and overflow effects. Reserve
 * before touching the DOM and release only after restoration finishes. */
export type ViewportLease=Readonly<{serial:number;owner:number|null}>;
export function initialViewportLease():ViewportLease{return Object.freeze({serial:0,owner:null});}
export function acquireViewportLease(state:ViewportLease){
  if(state.owner!==null||state.serial>=Number.MAX_SAFE_INTEGER)return Object.freeze({state,id:null});
  const id=state.serial+1;return Object.freeze({state:Object.freeze({serial:id,owner:id}),id});
}
export function viewportLeaseCurrent(state:ViewportLease,id:number):boolean{return state.owner===id;}
export function releaseViewportLease(state:ViewportLease,id:number):ViewportLease{return viewportLeaseCurrent(state,id)?Object.freeze({...state,owner:null}):state;}
