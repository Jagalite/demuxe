// SPDX-License-Identifier: Apache-2.0
import type {PlayerControlState} from './state.js';
import type {TrackType} from '../../types.js';
export type TrackConfirmationState=Readonly<{serial:number;pending:Readonly<{id:number;epoch:number;operation:number;session:number;track:TrackType;value:string;deadline:number;phase:'waiting'|'confirmed'|'failed'}>|null}>;
export type TrackConfirmationInput=
 |Readonly<{type:'trackConfirmation.begin';session:number;track:TrackType;value:string;now:number}>
 |Readonly<{type:'trackConfirmation.sample';id:number;now:number;tracks:readonly Readonly<{id:string;type:string;selected:boolean}>[]}>
 |Readonly<{type:'trackConfirmation.timeout';id:number;now:number}>
 |Readonly<{type:'trackConfirmation.finished';id:number}>;
export function initialTrackConfirmation():TrackConfirmationState{return Object.freeze({serial:0,pending:null});}
export function retireTrackConfirmation(state:TrackConfirmationState):TrackConfirmationState{return state.pending?Object.freeze({...state,pending:null}):state;}
export function trackConfirmationAuthority(state:PlayerControlState,id:number):boolean{
 const p=state.trackConfirmation.pending;
 return !!p&&p.id===id&&!state.operations.terminal&&p.epoch===state.operations.epoch&&p.operation===state.operations.active&&state.operations.entries.some(o=>o.id===p.operation&&!o.cancelled&&o.phase==='active')&&(state.source.acceptedSession===p.session&&state.source.acceptedEpoch===p.epoch||state.source.candidate?.session===p.session&&state.source.candidate?.operationEpoch===p.epoch);
}
export function transitionTrackConfirmation(state:PlayerControlState,input:TrackConfirmationInput){
 const no=(reason='retired')=>({state,accepted:false,reason,retire:Object.freeze([]) as readonly number[]});
 const set=(trackConfirmation:TrackConfirmationState)=>({state:Object.freeze({...state,revision:state.revision+1,trackConfirmation}),accepted:true,id:trackConfirmation.pending?.id,retire:Object.freeze([]) as readonly number[]});
 const p=state.trackConfirmation.pending;
 if(input.type==='trackConfirmation.finished')return p?.id===input.id?set(retireTrackConfirmation(state.trackConfirmation)):no();
 if(input.type==='trackConfirmation.begin'){
  const op=state.operations.entries.find(o=>o.id===state.operations.active);
  if(p||!op||op.cancelled||op.phase!=='active'||state.operations.terminal||!Number.isFinite(input.now)||!Number.isSafeInteger(state.trackConfirmation.serial+1))return no();
  const id=state.trackConfirmation.serial+1,next:TrackConfirmationState=Object.freeze({serial:id,pending:Object.freeze({id,epoch:state.operations.epoch,operation:op.id,session:input.session,track:input.track,value:input.value,deadline:input.now+5000,phase:'waiting'})});
  return trackConfirmationAuthority({...state,trackConfirmation:next},id)?set(next):no();
 }
 if(!Number.isFinite(input.now)||!p||p.phase!=='waiting'||!trackConfirmationAuthority(state,input.id))return no();
 if(input.type==='trackConfirmation.timeout')return input.now>=p.deadline?set(Object.freeze({...state.trackConfirmation,pending:Object.freeze({...p,phase:'failed'})})):no('early');
 const tracks=input.tracks.filter(t=>t.type===p.track),matched=p.value==='auto'||(p.value==='no'?!tracks.some(t=>t.selected):tracks.some(t=>t.id===p.value&&t.selected));
 // Match observed at the deadline remains successful, as in the existing adapter.
 const phase=matched?'confirmed':input.now>=p.deadline?'failed':'waiting';
 return set(Object.freeze({...state.trackConfirmation,pending:Object.freeze({...p,phase})}));
}
