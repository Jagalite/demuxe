// SPDX-License-Identifier: Apache-2.0
import type {RemuxRuntimePolicy} from '../../types.js';
export type RemuxRuntime='pthread'|'jspi'|'asyncify';
export type RemuxSelection=Readonly<{policy:RemuxRuntimePolicy;runtime:RemuxRuntime;isolated:boolean;jspi:boolean}>;
export type RemuxDeployment=Readonly<{revision:number;selection:RemuxSelection|null}>;
export type RemuxDeploymentChange=Readonly<{kind:'configure';selection:RemuxSelection}>|Readonly<{kind:'resolved';revision:number;available:Readonly<Partial<Record<RemuxRuntime,boolean>>>}>;
export function initialRemuxDeployment(selection:RemuxSelection|null=null):RemuxDeployment{return Object.freeze({revision:0,selection:selection?Object.freeze({...selection}):null});}
/** Explicit policies are pinned and do not invoke deployment probes. */
export function remuxDeploymentCandidates(selection:RemuxSelection):readonly RemuxRuntime[]{return Object.freeze(!['auto','on'].includes(selection.policy)?[]:((selection.policy==='auto'&&selection.isolated?['pthread','jspi','asyncify']:['jspi','asyncify']) as RemuxRuntime[]).filter(runtime=>runtime!=='jspi'||selection.jspi));}
export function resolveRemuxDeployment(selection:RemuxSelection,available:Readonly<Partial<Record<RemuxRuntime,boolean>>>):RemuxSelection{
 const runtime=remuxDeploymentCandidates(selection).find(runtime=>available[runtime])??selection.runtime;
 return Object.freeze({...selection,runtime});
}
export function transitionRemuxDeployment(state:RemuxDeployment,change:RemuxDeploymentChange):RemuxDeployment{
 if(state.revision>=Number.MAX_SAFE_INTEGER)return state;
 if(change.kind==='configure')return state.selection?state:Object.freeze({revision:state.revision+1,selection:Object.freeze({...change.selection})});
 if(!state.selection||change.revision!==state.revision)return state;
 return Object.freeze({revision:state.revision+1,selection:resolveRemuxDeployment(state.selection,change.available)});
}
