// SPDX-License-Identifier: Apache-2.0
type Recovery=Readonly<{id:number;sourceId:number;restartId:number}>;
export type RemuxLifecycle=Readonly<{
 sourceId:number;restartId:number;generation:number;active:boolean;stopped:boolean;starting:boolean;
 rejected:readonly string[];packagingFailure:boolean;failedGeneration:number|undefined;
 acceptedGeneration:number|undefined;acceptedSourceId:number|undefined;targetReady:boolean;
 recoveryAttempts:number;recoverySerial:number;recovery:Recovery|null;playing:boolean;
}>;
export type RemuxLifecycleCommand=
 | Readonly<{type:'open'}>
 | Readonly<{type:'restart';target:number;duration:number|undefined;recoveryId?:number}>
 | Readonly<{type:'begin';restartId:number}>
 | Readonly<{type:'packaging-failure';generation:number;failed:boolean}>
 | Readonly<{type:'retry';restartId:number;mime:string|undefined}>
 | Readonly<{type:'settle';restartId:number}>
 | Readonly<{type:'accept';generation:number}>
 | Readonly<{type:'retire';generation:number}>
 | Readonly<{type:'failure';generation:number;message:string;playing:boolean}>
 | Readonly<{type:'recovered';recoveryId:number}>
 | Readonly<{type:'intent';playing:boolean}>
 | Readonly<{type:'destroy'}>;
export type RemuxLifecycleDecision=Readonly<{state:RemuxLifecycle;accepted?:boolean;error?:string;aborted?:boolean;restartId?:number;generation?:number;retry?:boolean;recoveryId?:number;report?:boolean}>;
export function initialRemuxLifecycle():RemuxLifecycle {
 return Object.freeze({sourceId:0,restartId:0,generation:0,active:false,stopped:false,starting:false,rejected:Object.freeze([]),packagingFailure:false,failedGeneration:undefined,acceptedGeneration:undefined,acceptedSourceId:undefined,targetReady:false,recoveryAttempts:0,recoverySerial:0,recovery:null,playing:false});
}
export function remuxGenerationCurrent(state:RemuxLifecycle,generation:number):boolean {
 return !state.stopped&&state.active&&state.generation===generation&&state.failedGeneration!==generation;
}
export function remuxRestartCurrent(state:RemuxLifecycle,restartId:number):boolean {
 return !state.stopped&&state.restartId===restartId;
}
export function remuxRecoveryCurrent(state:RemuxLifecycle,recoveryId:number):boolean {
 const recovery=state.recovery;
 return !state.stopped&&recovery?.id===recoveryId&&recovery.sourceId===state.sourceId&&recovery.restartId===state.restartId;
}
export function remuxAcceptedGeneration(state:RemuxLifecycle):boolean {
 return remuxGenerationCurrent(state,state.generation)&&state.targetReady&&state.acceptedGeneration===state.generation&&state.acceptedSourceId===state.sourceId;
}
export function transitionRemuxLifecycle(state:RemuxLifecycle,command:RemuxLifecycleCommand):RemuxLifecycleDecision {
 const result=(next:RemuxLifecycle,extra:Omit<RemuxLifecycleDecision,'state'>={})=>Object.freeze({state:next===state?state:Object.freeze({...next}),...extra});
 if(command.type==='destroy')return state.stopped?result(state):result({...state,stopped:true,active:false,starting:false,targetReady:false,generation:state.generation+1,recovery:null},{accepted:true});
 if(state.stopped)return result(state,{error:'Remux player is destroyed'});
 if(command.type==='open')return result({...state,sourceId:state.sourceId+1,restartId:state.restartId+1,active:false,starting:false,targetReady:false,recoveryAttempts:0,recovery:null},{accepted:true});
 if(command.type==='intent')return result({...state,playing:command.playing},{accepted:true});
 if(command.type==='restart'){
  if(!Number.isFinite(command.target)||command.target<0||(command.duration!==undefined&&command.target>=command.duration))return result(state,{error:'Seek target out of range'});
  if(command.recoveryId!==undefined&&!remuxRecoveryCurrent(state,command.recoveryId))return result(state,{aborted:true});
  const restartId=state.restartId+1,recovery=command.recoveryId===undefined?null:Object.freeze({...state.recovery!,restartId});
  return result({...state,restartId,starting:true,active:false,targetReady:false,rejected:Object.freeze([]),packagingFailure:false,recovery},{accepted:true,restartId});
 }
 if(command.type==='begin'){
  if(!state.starting||!remuxRestartCurrent(state,command.restartId))return result(state,{aborted:true});
  const generation=state.generation+1;
  return result({...state,generation,active:true,targetReady:false,packagingFailure:false,failedGeneration:undefined},{accepted:true,generation});
 }
 if(command.type==='settle')return remuxRestartCurrent(state,command.restartId)?result({...state,starting:false},{accepted:true}):result(state,{aborted:true});
 if(command.type==='retry'){
  if(!remuxRestartCurrent(state,command.restartId))return result(state,{aborted:true});
  if(!state.packagingFailure||!command.mime||state.rejected.includes(command.mime)||state.rejected.length>=1)return result(state,{retry:false});
  return result({...state,rejected:Object.freeze([...state.rejected,command.mime])},{retry:true});
 }
 if(command.type==='recovered')return remuxRecoveryCurrent(state,command.recoveryId)?result({...state,recovery:null},{accepted:true}):result(state,{aborted:true});
 if(command.type==='retire')return command.generation===state.generation?result({...state,active:false,targetReady:false},{accepted:true}):result(state,{aborted:true});
 if(!remuxGenerationCurrent(state,command.generation))return result(state,{aborted:true});
 if(command.type==='packaging-failure')return result({...state,packagingFailure:command.failed},{accepted:true});
 if(command.type==='accept')return result({...state,targetReady:true,acceptedGeneration:state.generation,acceptedSourceId:state.sourceId},{accepted:true});
 const failed={...state,active:false,targetReady:false,failedGeneration:state.generation};
 if(state.starting)return result(failed,{accepted:true});
 if(state.recoveryAttempts<1&&/worker failed|MSE SourceBuffer error|QuotaExceededError/.test(command.message)){
  const id=state.recoverySerial+1,recovery=Object.freeze({id,sourceId:state.sourceId,restartId:state.restartId});
  return result({...failed,recovery,playing:command.playing,recoverySerial:id,recoveryAttempts:state.recoveryAttempts+1},{accepted:true,recoveryId:id});
 }
 return result({...failed,recovery:null},{accepted:true,report:true});
}
