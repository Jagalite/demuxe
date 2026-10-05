// SPDX-License-Identifier: Apache-2.0
/** Scalar async policies. Physical settlement and release remain separate facts. */
export type WaitKind='initialization'|'retirement'|'io-open'|'io-close'|'decoder'|'private-output'|'preview-media'|'threads';
const budgets:Readonly<Record<WaitKind,number>>=Object.freeze({initialization:60000,retirement:10000,'io-open':20000,'io-close':1500,decoder:5000,'private-output':25000,'preview-media':1500,threads:2000});
export type WaitState=Readonly<{id:number;deadline:number;phase:'waiting'|'ready'|'failed'|'timeout'|'retired'}>;
export function beginWait(id:number,now:number,kind:WaitKind):WaitState{return Object.freeze({id,deadline:now+budgets[kind],phase:'waiting'});}
export function observeWait(state:WaitState,event:Readonly<{id:number;kind:'ready'|'failed'|'retire'|'deadline';now:number}>):WaitState{
 if(event.id!==state.id||state.phase!=='waiting')return state;
 if(event.kind==='retire')return Object.freeze({...state,phase:'retired'});
 if(event.kind==='deadline'&&event.now<state.deadline)return state;
 return Object.freeze({...state,phase:event.now>=state.deadline?'timeout':event.kind==='ready'?'ready':'failed'});
}
export type AttemptState=Readonly<{count:number;index:number;phase:'trying'|'accepted'|'exhausted'|'retired';deferred:boolean}>;
export function beginAttempts(count:number):AttemptState{return Object.freeze({count,index:0,phase:count>0?'trying':'exhausted',deferred:false});}
export function observeAttempt(state:AttemptState,index:number,outcome:'accept'|'retry'|'defer'|'retire'):AttemptState{
 if(state.phase!=='trying'||state.index!==index)return state;
 if(outcome==='accept'||outcome==='retire')return Object.freeze({...state,phase:outcome==='accept'?'accepted':'retired'});
 const next=index+1;return Object.freeze({...state,index:next,phase:next<state.count?'trying':'exhausted',deferred:state.deferred||outcome==='defer'});
}
