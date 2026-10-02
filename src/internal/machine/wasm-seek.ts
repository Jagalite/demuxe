// SPDX-License-Identifier: Apache-2.0
export type WasmSeek=Readonly<{id:number;target:number;restarted:boolean;eof:boolean;clamped?:number}>;
export type WasmSeekState=Readonly<{nextId:number;seek:WasmSeek|null}>;
export function createWasmSeek():WasmSeekState{return Object.freeze({nextId:1,seek:null});}
export function beginWasmSeek(state:WasmSeekState,target:number):Readonly<{state:WasmSeekState;accepted:boolean}>{
 if(!Number.isFinite(target)||target<0)return Object.freeze({state,accepted:false});
 return Object.freeze({state:Object.freeze({nextId:state.nextId+1,seek:Object.freeze({id:state.nextId,target,restarted:false,eof:false})}),accepted:true});
}
export function clearWasmSeek(state:WasmSeekState):WasmSeekState{return state.seek?Object.freeze({...state,seek:null}):state;}
export type WasmSeekObservation=Readonly<{kind:'restart'|'cache';eof:boolean}|{kind:'position';position:number}>;
export function observeWasmSeek(state:WasmSeekState,event:WasmSeekObservation):WasmSeekState{
 const seek=state.seek;if(!seek)return state;
 if(event.kind==='restart')return Object.freeze({...state,seek:Object.freeze({...seek,restarted:true,eof:event.eof})});
 if(event.kind==='cache')return seek.restarted?Object.freeze({...state,seek:Object.freeze({...seek,eof:event.eof})}):state;
 if(event.kind==='position'&&seek.restarted&&seek.eof&&event.position<seek.target-.15)return Object.freeze({...state,seek:Object.freeze({...seek,clamped:event.position})});
 return state;
}
/** A stable seek ID survives immutable observation updates, but never a replacement seek. */
export function confirmWasmSeek(state:WasmSeekState,id:number,target:number,position:number,settled:boolean):Readonly<{state:WasmSeekState;confirmed:boolean}>{
 const seek=state.seek;if(!seek||seek.id!==id||seek.target!==target||!Number.isFinite(position)||!settled)return Object.freeze({state,confirmed:false});
 const next=seek.restarted&&seek.eof&&position<target-.15?Object.freeze({...state,seek:Object.freeze({...seek,clamped:position})}):state;
 return Object.freeze({state:next,confirmed:Math.abs(position-target)<.15});
}
export function wasmSeekBoundary(state:WasmSeekState,target:number):number|undefined{
 const seek=state.seek;return seek?.target===target&&seek.restarted&&seek.eof?seek.clamped:undefined;
}
