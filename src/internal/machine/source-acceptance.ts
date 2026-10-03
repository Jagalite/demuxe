// SPDX-License-Identifier: Apache-2.0
/** Acceptance has already committed source/settings identity. Notification work
 * may retire independently; predecessor cleanup remains mandatory. */
export type SourceAcceptanceKind='caller.detach'|'decoding'|'admission'|'evidence'|'preview.identity'|'preview.source'|'publish'|'surface.show'|'surface.hide'|'watchdogs'|'cleanup'|'property.next'|'property.emit'|'file.loaded'|'mode.ready';
export type SourceAcceptance=Readonly<{phase:SourceAcceptanceKind|'done';serial:number;pending:number|null;failed:boolean;cleanup:'pending'|'running'|'done'}>;
export type SourceAcceptanceEffect=Readonly<{kind:SourceAcceptanceKind;step:number}>;
export function initialSourceAcceptance(predecessor:boolean):SourceAcceptance{return Object.freeze({phase:'caller.detach',serial:0,pending:null,failed:false,cleanup:predecessor?'pending':'done'});}
export function claimSourceAcceptance(state:SourceAcceptance):Readonly<{state:SourceAcceptance;accepted:boolean;effect?:SourceAcceptanceEffect}>{
  if(state.failed||state.pending!==null)return Object.freeze({state,accepted:false});
  if(state.phase==='done')return Object.freeze({state,accepted:true});
  const step=state.serial+1;return Object.freeze({state:Object.freeze({...state,serial:step,pending:step}),accepted:true,effect:Object.freeze({kind:state.phase,step})});
}
const next:Readonly<Partial<Record<SourceAcceptanceKind,SourceAcceptanceKind|'done'>>>=Object.freeze({'caller.detach':'decoding',decoding:'admission',admission:'evidence',evidence:'preview.identity','preview.identity':'preview.source','preview.source':'publish',publish:'surface.show','surface.show':'surface.hide','surface.hide':'watchdogs',watchdogs:'cleanup',cleanup:'property.next','property.emit':'property.next','file.loaded':'mode.ready','mode.ready':'done'});
export function completeSourceAcceptance(state:SourceAcceptance,step:number,hasProperty?:boolean):Readonly<{state:SourceAcceptance;accepted:boolean}>{
  if(state.pending!==step||state.failed||state.phase==='done'||state.phase==='cleanup'&&state.cleanup!=='done'||state.phase==='property.next'&&typeof hasProperty!=='boolean')return Object.freeze({state,accepted:false});
  const phase=state.phase==='property.next'?(hasProperty?'property.emit':'file.loaded'):next[state.phase]!;
  return Object.freeze({state:Object.freeze({...state,phase,pending:null}),accepted:true});
}
export function failSourceAcceptance(state:SourceAcceptance):SourceAcceptance{return state.failed?state:Object.freeze({...state,failed:true,pending:null});}
export function claimSourceAcceptanceCleanup(state:SourceAcceptance):Readonly<{state:SourceAcceptance;accepted:boolean}>{return state.cleanup==='pending'?Object.freeze({state:Object.freeze({...state,cleanup:'running' as const}),accepted:true}):Object.freeze({state,accepted:false});}
export function completeSourceAcceptanceCleanup(state:SourceAcceptance):Readonly<{state:SourceAcceptance;accepted:boolean}>{return state.cleanup==='running'?Object.freeze({state:Object.freeze({...state,cleanup:'done' as const}),accepted:true}):Object.freeze({state,accepted:false});}
