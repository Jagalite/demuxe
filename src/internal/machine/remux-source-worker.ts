// SPDX-License-Identifier: Apache-2.0
export type RemuxSourceRead=Readonly<{id:number;epoch:number;offset:number;count:number;clientId:number|null}>;
export type RemuxSourceRefresh=Readonly<{id:number;epoch:number;deadline:number}>;
export type RemuxSourceWorkerState=Readonly<{phase:'idle'|'opening'|'ready'|'closed'|'failed';epoch:number;mode:'port'|'mailbox'|null;size:number|null;serial:number;refreshSerial:number;read:RemuxSourceRead|null;refresh:RemuxSourceRefresh|null}>;
export function initialRemuxSourceWorker():RemuxSourceWorkerState{return Object.freeze({phase:'idle',epoch:0,mode:null,size:null,serial:0,refreshSerial:0,read:null,refresh:null});}
export function remuxSourceCurrent(state:RemuxSourceWorkerState,epoch:number):boolean{return state.epoch===epoch&&(state.phase==='opening'||state.phase==='ready');}
export function beginRemuxSource(state:RemuxSourceWorkerState,mode:'port'|'mailbox'):Readonly<{state:RemuxSourceWorkerState;accepted:boolean;epoch:number}>{return state.phase!=='idle'?Object.freeze({state,accepted:false,epoch:state.epoch}):Object.freeze({state:Object.freeze({...state,phase:'opening',epoch:state.epoch+1,mode}),accepted:true,epoch:state.epoch+1});}
export function openedRemuxSource(state:RemuxSourceWorkerState,epoch:number,size:number):Readonly<{state:RemuxSourceWorkerState;accepted:boolean}>{return !remuxSourceCurrent(state,epoch)||state.phase!=='opening'?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,phase:'ready',size}),accepted:true});}
export function beginRemuxSourceRead(state:RemuxSourceWorkerState,epoch:number,offset:number,count:number,clientId:number|null):Readonly<{state:RemuxSourceWorkerState;accepted:boolean;request:RemuxSourceRead|null;error?:string}>{
 if(!remuxSourceCurrent(state,epoch)||state.phase!=='ready')return Object.freeze({state,accepted:false,request:null});
 if(state.read||!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(count)||count<1||count>262144||state.size===null||offset+count>state.size||state.mode==='port'&&(clientId===null||!Number.isSafeInteger(clientId)))return Object.freeze({state,accepted:false,request:null,error:'Invalid private source request'});
 const request=Object.freeze({id:state.serial+1,epoch,offset,count,clientId});return Object.freeze({state:Object.freeze({...state,serial:request.id,read:request}),accepted:true,request});
}
export function remuxSourceReadCurrent(state:RemuxSourceWorkerState,request:RemuxSourceRead):boolean{return remuxSourceCurrent(state,request.epoch)&&state.read?.id===request.id;}
export function finishRemuxSourceRead(state:RemuxSourceWorkerState,request:RemuxSourceRead):Readonly<{state:RemuxSourceWorkerState;accepted:boolean}>{return !remuxSourceReadCurrent(state,request)?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,read:null}),accepted:true});}
export function beginRemuxSourceRefresh(state:RemuxSourceWorkerState,epoch:number,now:number):Readonly<{state:RemuxSourceWorkerState;accepted:boolean;request:RemuxSourceRefresh|null;error?:string}>{
 if(!remuxSourceCurrent(state,epoch))return Object.freeze({state,accepted:false,request:null});
 if(state.refresh)return Object.freeze({state,accepted:false,request:null,error:'Concurrent authorization refresh'});
 const request=Object.freeze({id:state.refreshSerial+1,epoch,deadline:now+5000});return Object.freeze({state:Object.freeze({...state,refreshSerial:request.id,refresh:request}),accepted:true,request});
}
export function remuxSourceRefreshCurrent(state:RemuxSourceWorkerState,request:RemuxSourceRefresh):boolean{return remuxSourceCurrent(state,request.epoch)&&state.refresh?.id===request.id;}
export function settleRemuxSourceRefresh(state:RemuxSourceWorkerState,id:number,epoch:number,now?:number):Readonly<{state:RemuxSourceWorkerState;accepted:boolean;request:RemuxSourceRefresh|null;remaining?:number}>{
 const request=state.refresh;if(!request||request.id!==id||request.epoch!==epoch||!remuxSourceCurrent(state,epoch))return Object.freeze({state,accepted:false,request:null});
 if(now!==undefined&&now<request.deadline)return Object.freeze({state,accepted:false,request,remaining:request.deadline-now});
 return Object.freeze({state:Object.freeze({...state,refresh:null}),accepted:true,request});
}
export function retireRemuxSourceWorker(state:RemuxSourceWorkerState,phase:'closed'|'failed'):Readonly<{state:RemuxSourceWorkerState;accepted:boolean;read:RemuxSourceRead|null;refresh:RemuxSourceRefresh|null}>{return state.phase==='closed'||state.phase==='failed'?Object.freeze({state,accepted:false,read:null,refresh:null}):Object.freeze({state:Object.freeze({...state,phase,epoch:state.epoch+1,read:null,refresh:null}),accepted:true,read:state.read,refresh:state.refresh});}
