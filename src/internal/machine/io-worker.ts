// SPDX-License-Identifier: Apache-2.0
export type IORead=Readonly<{id:number;state:number;serial:number;epoch:number}>;
export type IOWorkerState=Readonly<{phase:'idle'|'opening'|'ready'|'closed'|'failed';nativeEpoch:number|null;serial:number;read:IORead|null;pumping:boolean;refreshSerial:number;refresh:Readonly<{id:number;deadline:number}>|null}>;
export function initialIOWorker():IOWorkerState{return Object.freeze({phase:'idle',nativeEpoch:null,serial:0,read:null,pumping:false,refreshSerial:0,refresh:null});}
export const ioWorkerCurrent=(state:IOWorkerState)=>state.phase==='opening'||state.phase==='ready';
export type IOWorkerInput=Readonly<{type:'init'|'ready'|'pump'|'close'|'fail'}>|Readonly<{type:'epoch';epoch:number}>|Readonly<{type:'read';state:number;serial:number;epoch:number}>|Readonly<{type:'finish';id:number}>|Readonly<{type:'refresh';now:number}>|Readonly<{type:'refreshed';id:number;now?:number}>;
export function transitionIOWorker(state:IOWorkerState,input:IOWorkerInput){
 const result=(next=state,accepted=true,extra:Readonly<{epochChanged?:boolean;read?:IORead;refresh?:Readonly<{id:number;deadline:number}>;remaining?:number;error?:string}>={})=>Object.freeze({state:next,accepted,...extra});
 const patch=(value:Partial<IOWorkerState>)=>Object.freeze({...state,...value});
 if(input.type==='close'||input.type==='fail')return !ioWorkerCurrent(state)&&state.phase!=='idle'?result(state,false):result(patch({phase:input.type==='close'?'closed':'failed',pumping:false,refresh:null}));
 if(input.type==='finish')return state.read?.id!==input.id?result(state,false):result(patch({read:null}));
 if(input.type==='init')return state.phase!=='idle'?result(state,false,{error:'Source transport initialization unavailable'}):result(patch({phase:'opening'}));
 if(!ioWorkerCurrent(state))return result(state,false);
 if(input.type==='ready')return state.phase!=='opening'?result(state,false):result(patch({phase:'ready'}));
 if(input.type==='pump')return state.phase!=='ready'||state.pumping?result(state,false):result(patch({pumping:true}));
 if(input.type==='epoch')return state.nativeEpoch===input.epoch?result(state,false):result(patch({nativeEpoch:input.epoch}),true,{epochChanged:state.nativeEpoch!==null});
 if(input.type==='read'){
  if(state.phase!=='ready'||state.read||(input.state&7)!==1)return result(state,false);
  if(!Number.isSafeInteger(state.serial+1))return result(state,false,{error:'Source request identity exhausted'});
  const read=Object.freeze({id:state.serial+1,state:input.state,serial:input.serial,epoch:input.epoch});return result(patch({serial:read.id,read}),true,{read});
 }
 if(input.type==='refresh'){
  if(state.refresh)return result(state,false,{error:'Source authorization refresh capacity exceeded'});
  if(!Number.isSafeInteger(state.refreshSerial+1))return result(state,false,{error:'Source refresh identity exhausted'});
  const refresh=Object.freeze({id:state.refreshSerial+1,deadline:input.now+5000});return result(patch({refreshSerial:refresh.id,refresh}),true,{refresh});
 }
 if(input.type!=='refreshed')return result(state,false);
 const refresh=state.refresh;if(!refresh||refresh.id!==input.id)return result(state,false);
 if(input.now!==undefined&&input.now<refresh.deadline)return result(state,false,{remaining:refresh.deadline-input.now});
 return result(patch({refresh:null}),true,{refresh});
}
export function ioReadCurrent(state:IOWorkerState,read:IORead,facts:Readonly<{state:number;serial:number;epoch:number}>):boolean{return state.phase==='ready'&&state.read?.id===read.id&&facts.state===read.state&&(facts.state&7)===1&&facts.serial===read.serial&&facts.epoch===read.epoch;}
