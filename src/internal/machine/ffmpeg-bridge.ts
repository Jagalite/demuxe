// SPDX-License-Identifier: Apache-2.0
import {initialFfmpegOwner,transitionFfmpegOwner,type FfmpegOwnerState,type FfmpegOwnerInput,type FfmpegOwnerDecision} from './ffmpeg-owner.js';
export type FfmpegBridgeState=Readonly<{phase:'ready'|'closing'|'closed'|'failed';sourceSerial:number;handle:number;shutdown:Readonly<{id:number;deadline:number}>|null;execution:FfmpegOwnerState;discard:boolean}>;
export function initialFfmpegBridge():FfmpegBridgeState{return Object.freeze({phase:'ready',sourceSerial:0,handle:-1,shutdown:null,execution:initialFfmpegOwner(),discard:false});}
export function transitionFfmpegBridgeExecution(state:FfmpegBridgeState,input:FfmpegOwnerInput):Readonly<{state:FfmpegBridgeState;decision:FfmpegOwnerDecision}>{const decision=transitionFfmpegOwner(state.execution,input);return Object.freeze({state:decision.state===state.execution?state:Object.freeze({...state,execution:decision.state}),decision});}
export function beginFfmpegSource(state:FfmpegBridgeState):Readonly<{state:FfmpegBridgeState;id:number|null}>{if(state.phase!=='ready'||state.execution.active!==null||!Number.isSafeInteger(state.sourceSerial+1))return Object.freeze({state,id:null});const id=state.sourceSerial+1;return Object.freeze({state:Object.freeze({...state,sourceSerial:id}),id});}
export function ffmpegSourceCurrent(state:FfmpegBridgeState,id:number):boolean{return state.phase==='ready'&&state.sourceSerial===id;}
export function setFfmpegHandle(state:FfmpegBridgeState,id:number,handle:number):FfmpegBridgeState{return ffmpegSourceCurrent(state,id)?Object.freeze({...state,handle}):state;}
export function detachFfmpegHandle(state:FfmpegBridgeState):FfmpegBridgeState{return state.handle<0?state:Object.freeze({...state,handle:-1});}
export function beginFfmpegShutdown(state:FfmpegBridgeState,now:number,timeout:number):FfmpegBridgeState{return state.shutdown||state.phase==='closed'?state:Object.freeze({...state,phase:state.discard?'failed':'closing',shutdown:Object.freeze({id:1,deadline:now+timeout})});}
export function ffmpegShutdownRemaining(state:FfmpegBridgeState,id:number,now:number):number|null{return !state.shutdown||state.shutdown.id!==id||state.phase==='closed'?null:Math.max(0,state.shutdown.deadline-now);}
export function failFfmpegBridge(state:FfmpegBridgeState):FfmpegBridgeState{return state.discard?state:Object.freeze({...state,phase:'failed',discard:true});}
export function finishFfmpegBridge(state:FfmpegBridgeState):FfmpegBridgeState{return Object.freeze({...state,phase:state.discard?'failed':'closed',handle:-1,shutdown:null});}
