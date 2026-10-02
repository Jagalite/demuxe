// SPDX-License-Identifier: Apache-2.0
import {initialRemuxBuffer,resetRemuxBuffer,transitionRemuxBuffer} from './remux-buffer.js';
import type {RemuxBufferState,RemuxBufferCommand,RemuxBufferDecision} from './remux-buffer.js';
import {initialRemuxSchedule,resetRemuxSchedule,remuxBuffering,transitionRemuxSchedule} from './remux-scheduling.js';
import type {RemuxSchedule,RemuxScheduleCommand,RemuxBuffering} from './remux-scheduling.js';
import {initialRemuxNegotiation,resetRemuxNegotiation,retireRemuxNegotiation,transitionRemuxNegotiation} from './remux-negotiation.js';
import type {RemuxNegotiation,RemuxNegotiationCommand,RemuxNegotiationDecision} from './remux-negotiation.js';
import {initialRemuxOutput,resetRemuxOutput,transitionRemuxOutput} from './remux-output.js';
import type {RemuxOutput,RemuxOutputCommand,RemuxOutputDecision} from './remux-output.js';
type Recovery=Readonly<{id:number;sourceId:number;restartId:number}>;
export type RemuxLifecycle=Readonly<{
 buffer:RemuxBufferState;schedule:RemuxSchedule;negotiation:RemuxNegotiation;output:RemuxOutput;
 sourceId:number;restartId:number;generation:number;active:boolean;stopped:boolean;starting:boolean;
 rejected:readonly string[];packagingFailure:boolean;failedGeneration:number|undefined;
 acceptedGeneration:number|undefined;acceptedSourceId:number|undefined;targetReady:boolean;
 recoveryAttempts:number;recoverySerial:number;recovery:Recovery|null;playing:boolean;
}>;
export type RemuxLifecycleCommand=
 | Readonly<{type:'buffer';generation:number;command:RemuxBufferCommand}>
 | Readonly<{type:'schedule';generation:number;command:RemuxScheduleCommand}>
 | Readonly<{type:'buffering';policy:RemuxBuffering|undefined}>
 | Readonly<{type:'negotiation';generation:number;command:RemuxNegotiationCommand}>
 | Readonly<{type:'output';generation:number;command:RemuxOutputCommand}>
 | Readonly<{type:'open';sourceChanged?:boolean}>
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
export type RemuxLifecycleDecision=Readonly<{state:RemuxLifecycle;accepted?:boolean;error?:string;aborted?:boolean;restartId?:number;generation?:number;retry?:boolean;recoveryId?:number;report?:boolean;negotiation?:RemuxNegotiationDecision;output?:RemuxOutputDecision;buffer?:RemuxBufferDecision;schedule?:ReturnType<typeof transitionRemuxSchedule>}>;
export function initialRemuxLifecycle():RemuxLifecycle {
 return Object.freeze({buffer:initialRemuxBuffer(),schedule:initialRemuxSchedule(),negotiation:initialRemuxNegotiation(),output:initialRemuxOutput(),sourceId:0,restartId:0,generation:0,active:false,stopped:false,starting:false,rejected:Object.freeze([]),packagingFailure:false,failedGeneration:undefined,acceptedGeneration:undefined,acceptedSourceId:undefined,targetReady:false,recoveryAttempts:0,recoverySerial:0,recovery:null,playing:false});
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
 const retiredSchedule=()=>Object.freeze({...state.schedule,resume:null});
 const retired=()=>({buffer:resetRemuxBuffer(state.buffer),schedule:retiredSchedule(),negotiation:retireRemuxNegotiation(state.negotiation),output:resetRemuxOutput(state.output)});
 const result=(next:RemuxLifecycle,extra:Omit<RemuxLifecycleDecision,'state'>={})=>Object.freeze({state:next===state?state:Object.freeze({...next}),...extra});
 if(command.type==='destroy')return state.stopped?result(state):result({...state,...retired(),stopped:true,active:false,starting:false,targetReady:false,generation:state.generation+1,recovery:null},{accepted:true});
 if(state.stopped)return result(state,{error:'Remux player is destroyed'});
 if(command.type==='open')return result({...state,...retired(),negotiation:Object.freeze({...retireRemuxNegotiation(state.negotiation),duration:command.sourceChanged?undefined:state.negotiation.duration}),sourceId:state.sourceId+1,restartId:state.restartId+1,active:false,starting:false,targetReady:false,recoveryAttempts:0,recovery:null},{accepted:true});
 if(command.type==='buffering')return result({...state,schedule:remuxBuffering(state.schedule,command.policy)},{accepted:true});
 if(command.type==='intent')return result({...state,playing:command.playing},{accepted:true});
 if(command.type==='restart'){
  if(!Number.isFinite(command.target)||command.target<0||(command.duration!==undefined&&command.target>=command.duration))return result(state,{error:'Seek target out of range'});
  if(command.recoveryId!==undefined&&!remuxRecoveryCurrent(state,command.recoveryId))return result(state,{aborted:true});
  const restartId=state.restartId+1,recovery=command.recoveryId===undefined?null:Object.freeze({...state.recovery!,restartId});
  return result({...state,...retired(),schedule:Object.freeze({...retiredSchedule(),target:command.target}),restartId,starting:true,active:false,targetReady:false,rejected:Object.freeze([]),packagingFailure:false,recovery},{accepted:true,restartId});
 }
 if(command.type==='begin'){
  if(!state.starting||!remuxRestartCurrent(state,command.restartId))return result(state,{aborted:true});
  const generation=state.generation+1;
  return result({...state,buffer:resetRemuxBuffer(state.buffer,true,true),schedule:resetRemuxSchedule(state.schedule),negotiation:resetRemuxNegotiation(state.negotiation),output:resetRemuxOutput(state.output,true),generation,active:true,targetReady:false,packagingFailure:false,failedGeneration:undefined},{accepted:true,generation});
 }
 if(command.type==='settle')return remuxRestartCurrent(state,command.restartId)?result({...state,starting:false},{accepted:true}):result(state,{aborted:true});
 if(command.type==='retry'){
  if(!remuxRestartCurrent(state,command.restartId))return result(state,{aborted:true});
  if(!state.packagingFailure||!command.mime||state.rejected.includes(command.mime)||state.rejected.length>=1)return result(state,{retry:false});
  return result({...state,rejected:Object.freeze([...state.rejected,command.mime])},{retry:true});
 }
 if(command.type==='recovered')return remuxRecoveryCurrent(state,command.recoveryId)?result({...state,recovery:null},{accepted:true}):result(state,{aborted:true});
 if(command.type==='retire')return command.generation===state.generation?result({...state,...retired(),active:false,targetReady:false},{accepted:true}):result(state,{aborted:true});
 if(!remuxGenerationCurrent(state,command.generation))return result(state,{aborted:true});
 if(command.type==='negotiation'){
  const negotiation=transitionRemuxNegotiation(state.negotiation,command.command);
  return result(negotiation.state===state.negotiation?state:{...state,negotiation:negotiation.state},{accepted:negotiation.accepted,negotiation});
 }
 if(command.type==='output'){
  const output=transitionRemuxOutput(state.output,command.command);
  const buffer=output.accepted&&(command.command.type==='prime'||output.completed)?transitionRemuxBuffer(state.buffer,{type:'busy',value:!output.completed}).state:state.buffer;
  const schedule=output.completed?transitionRemuxSchedule(state.schedule,{type:'prime-finished'}).state:state.schedule;
  return result(output.state===state.output&&buffer===state.buffer&&schedule===state.schedule?state:{...state,output:output.state,buffer,schedule},{accepted:output.accepted,output});
 }
 if(command.type==='schedule'){
  const schedule=transitionRemuxSchedule(state.schedule,command.command);
  return result(schedule.state===state.schedule?state:{...state,schedule:schedule.state},{accepted:schedule.accepted,schedule});
 }
 if(command.type==='buffer'){
  const buffer=transitionRemuxBuffer(state.buffer,command.command);
  const schedule=buffer.accepted&&command.command.type==='remove'?transitionRemuxSchedule(state.schedule,{...command.command,type:'evict'}).state:state.schedule;
  return result(buffer.state===state.buffer&&schedule===state.schedule?state:{...state,buffer:buffer.state,schedule},{accepted:buffer.accepted,buffer});
 }
 if(command.type==='packaging-failure')return result({...state,packagingFailure:command.failed},{accepted:true});
 if(command.type==='accept')return result({...state,targetReady:true,acceptedGeneration:state.generation,acceptedSourceId:state.sourceId},{accepted:true});
 const failed={...state,...retired(),active:false,targetReady:false,failedGeneration:state.generation};
 if(state.starting)return result(failed,{accepted:true});
 if(state.recoveryAttempts<1&&/worker failed|MSE SourceBuffer error|QuotaExceededError/.test(command.message)){
  const id=state.recoverySerial+1,recovery=Object.freeze({id,sourceId:state.sourceId,restartId:state.restartId});
  return result({...failed,recovery,playing:command.playing,recoverySerial:id,recoveryAttempts:state.recoveryAttempts+1},{accepted:true,recoveryId:id});
 }
 return result({...failed,recovery:null},{accepted:true,report:true});
}
