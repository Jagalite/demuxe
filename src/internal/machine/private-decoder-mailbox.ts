// SPDX-License-Identifier: Apache-2.0
export type DecoderMailboxRequest=Readonly<{id:number;generation:number;due:number;phase:'executing'|'ready'|'committing'|'done';cancelled:null|'cancel'|'timeout';result:number}>;
export type DecoderMailboxState=Readonly<{closed:boolean;generation:number;serial:number;pending:DecoderMailboxRequest|null;failure:null|'timeout'|'boundary'|'presentation';stats:Readonly<{requests:number;committed:number;cancelled:number;timeouts:number;errors:number;lateResults:number}>}>;
export function initialDecoderMailbox():DecoderMailboxState{return Object.freeze({closed:false,generation:0,serial:0,pending:null,failure:null,stats:Object.freeze({requests:0,committed:0,cancelled:0,timeouts:0,errors:0,lateResults:0})});}
export function validDecoderRequest(ptr:number,operation:number,memoryBytes:number):boolean{return Number.isInteger(operation)&&operation>=1&&operation<=6&&ptr%8===0&&ptr<=memoryBytes-80;}
export function validDecoderPacket(ptr:number,operation:number,memoryBytes:number,size:number):boolean{return size>=0&&size<=(operation===1?65536:8*1024*1024)&&ptr+80<=memoryBytes-size;}
export function beginDecoderRequest(state:DecoderMailboxState,now:number,timeout:number):Readonly<{state:DecoderMailboxState;id:number|null}>{
 if(state.closed||state.pending&&state.pending.phase!=='done')return Object.freeze({state,id:null});const id=state.serial+1;
 return Object.freeze({state:Object.freeze({...state,serial:id,pending:Object.freeze({id,generation:state.generation,due:now+timeout,phase:'executing',cancelled:null,result:-29}),stats:Object.freeze({...state.stats,requests:state.stats.requests+1})}),id});
}
export function canSettleDecoderRequest(state:DecoderMailboxState,id:number):boolean{return !state.closed&&state.pending?.id===id&&state.pending.phase==='executing'&&state.pending.cancelled===null;}
export function settleDecoderRequest(state:DecoderMailboxState,id:number,result:number,valid=true):Readonly<{state:DecoderMailboxState;accepted:boolean}>{
 if(!canSettleDecoderRequest(state,id))return Object.freeze({state:Object.freeze({...state,stats:Object.freeze({...state.stats,lateResults:state.stats.lateResults+1})}),accepted:false});
 return Object.freeze({state:Object.freeze({...state,pending:Object.freeze({...state.pending!,phase:'ready',result:valid?result:-29}),stats:valid?state.stats:Object.freeze({...state.stats,errors:state.stats.errors+1})}),accepted:true});
}
export function cancelDecoderRequest(state:DecoderMailboxState,id:number,timeout=false,now=Infinity):Readonly<{state:DecoderMailboxState;accepted:boolean;wake:boolean;remaining:number|null}>{
 const request=state.pending;if(!request||request.id!==id||request.phase==='done'||request.cancelled!==null)return Object.freeze({state,accepted:false,wake:false,remaining:null});
 if(timeout&&now<request.due)return Object.freeze({state,accepted:false,wake:false,remaining:request.due-now});
 return Object.freeze({state:Object.freeze({...state,pending:Object.freeze({...request,phase:request.phase==='executing'?'ready':request.phase,cancelled:timeout?'timeout':'cancel',result:timeout?-73:-29}),failure:timeout?'timeout':state.failure,stats:Object.freeze({...state.stats,cancelled:state.stats.cancelled+1,timeouts:state.stats.timeouts+Number(timeout)})}),accepted:true,wake:request.phase==='executing',remaining:null});
}
export function retireDecoderMailbox(state:DecoderMailboxState,close=false):Readonly<{state:DecoderMailboxState;id:number|null;wake:boolean}>{
 const pending=state.pending,decision=pending?cancelDecoderRequest(state,pending.id):{state,wake:false};
 return Object.freeze({state:Object.freeze({...decision.state,closed:state.closed||close,generation:state.generation+1,pending:close&&decision.state.pending?Object.freeze({...decision.state.pending,phase:'done'}):decision.state.pending}),id:pending?.id??null,wake:decision.wake});
}
export function decoderCommitCurrent(state:DecoderMailboxState,id:number):boolean{const request=state.pending;return !state.closed&&request?.id===id&&request.phase==='committing'&&request.generation===state.generation&&request.cancelled===null;}
export function decoderRequestResult(state:DecoderMailboxState,id:number):number{return state.pending?.id===id&&state.pending.cancelled==='timeout'?-73:-29;}
export function beginDecoderCommit(state:DecoderMailboxState,id:number):Readonly<{state:DecoderMailboxState;accepted:boolean;result:number}>{
 const request=state.pending;if(request?.id!==id||request.phase!=='ready')return Object.freeze({state,accepted:false,result:decoderRequestResult(state,id)});
 return Object.freeze({state:Object.freeze({...state,pending:Object.freeze({...request,phase:'committing'})}),accepted:true,result:request.cancelled==='timeout'?-73:request.result});
}
export function failDecoderCommit(state:DecoderMailboxState,id:number,failure:'boundary'|'presentation'):DecoderMailboxState{return state.pending?.id===id?Object.freeze({...state,failure,stats:Object.freeze({...state.stats,errors:state.stats.errors+1})}):state;}
export function finishDecoderCommit(state:DecoderMailboxState,id:number,committed:boolean):DecoderMailboxState{
 if(state.pending?.id!==id)return state;return Object.freeze({...state,pending:null,stats:committed&&decoderCommitCurrent(state,id)?Object.freeze({...state.stats,committed:state.stats.committed+1}):state.stats});
}
export type DecoderResponseFacts=Readonly<{result:number;fields?:readonly number[];timestamp?:number;duration?:number;pixels:'none'|'bytes'|'invalid';pixelBytes:number}>;
export function validDecoderResponse(value:DecoderResponseFacts):boolean{return Number.isInteger(value.result)&&value.result>=-2147483648&&value.result<=2147483647&&(!value.fields||value.fields.length===8&&value.fields.every(item=>Number.isInteger(item)&&item>=-2147483648&&item<=2147483647))&&(value.timestamp===undefined||Number.isSafeInteger(value.timestamp))&&(value.duration===undefined||Number.isSafeInteger(value.duration)&&value.duration>=0)&&value.pixels!=='invalid'&&(value.pixels!=='bytes'||value.pixelBytes<=1920*1080*3/2);}
