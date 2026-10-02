// SPDX-License-Identifier: Apache-2.0
export type RemuxPortRead=Readonly<{id:number;offset:number;count:number}>;
export type RemuxPortReaderState=Readonly<{size:number;sequence:number;closed:boolean;pending:RemuxPortRead|null}>;
export type RemuxPortReaderFailure='cancelled'|'concurrent'|'range'|'unexpected'|'transport'|'bytes';
export type RemuxPortReaderDecision=Readonly<{state:RemuxPortReaderState;accepted:boolean;request:RemuxPortRead|null;error?:RemuxPortReaderFailure}>;
export function initialRemuxPortReader(size:number):RemuxPortReaderState{if(!Number.isSafeInteger(size)||size<=0)throw Error('Invalid private remux source');return Object.freeze({size,sequence:0,closed:false,pending:null});}
export function remuxPortReadCurrent(state:RemuxPortReaderState,id:number):boolean{return !state.closed&&state.pending?.id===id;}
export function beginRemuxPortRead(state:RemuxPortReaderState,offset:number,count:number,aborted:boolean):RemuxPortReaderDecision{
 const error:RemuxPortReaderFailure|undefined=state.closed||aborted?'cancelled':state.pending?'concurrent':!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(count)||count<1||count>262144||offset+count>state.size?'range':undefined;
 if(error)return Object.freeze({state,accepted:false,request:null,error});
 const request=Object.freeze({id:state.sequence+1,offset,count});return Object.freeze({state:Object.freeze({...state,sequence:request.id,pending:request}),accepted:true,request});
}
export function closeRemuxPortReader(state:RemuxPortReaderState):RemuxPortReaderDecision{return state.closed?Object.freeze({state,accepted:false,request:null}):Object.freeze({state:Object.freeze({...state,closed:true,pending:null}),accepted:true,request:state.pending});}
export function remuxPortResponseCurrent(state:RemuxPortReaderState,expected:number|null):boolean{return !state.closed&&(state.pending?.id??null)===expected;}
export function replyRemuxPortRead(state:RemuxPortReaderState,facts:Readonly<{object:boolean;id:number|null;error:boolean;buffer:boolean;bytes:number}>,expected:number|null=state.pending?.id??null):RemuxPortReaderDecision{
 if(!remuxPortResponseCurrent(state,expected))return Object.freeze({state,accepted:false,request:null});
 const error:RemuxPortReaderFailure|undefined=!facts.object||!state.pending||facts.id!==state.pending.id?'unexpected':facts.error?'transport':!facts.buffer||facts.bytes<1||facts.bytes>state.pending.count?'bytes':undefined;
 if(error){const decision=closeRemuxPortReader(state);return Object.freeze({...decision,error});}
 return Object.freeze({state:Object.freeze({...state,pending:null}),accepted:true,request:state.pending});
}
