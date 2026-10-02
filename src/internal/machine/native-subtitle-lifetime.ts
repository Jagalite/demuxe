// SPDX-License-Identifier: Apache-2.0
import {createBackendRequests,admitBackendRequest,settleBackendRequest,failBackendRequests,beginBackendClose,finishBackendClose,type BackendRequests,type BackendRequestAdmission} from './backend-requests.js';
export type NativeSubtitleLifetime=Readonly<{epoch:number;requests:BackendRequests;initialization:number|null;closeDeadline:number|null;acknowledged:boolean}>;
export function initialNativeSubtitleLifetime():NativeSubtitleLifetime{return Object.freeze({epoch:1,requests:createBackendRequests('subtitles'),initialization:null,closeDeadline:null,acknowledged:false});}
export function nativeSubtitleCurrent(state:NativeSubtitleLifetime,epoch:number):boolean{return state.epoch===epoch&&state.requests.phase==='active'&&!state.requests.failed;}
export function startNativeSubtitleInitialization(state:NativeSubtitleLifetime,now:number):NativeSubtitleLifetime{return nativeSubtitleCurrent(state,state.epoch)?Object.freeze({...state,initialization:now+25000}):state;}
export function finishNativeSubtitleInitialization(state:NativeSubtitleLifetime,epoch:number):NativeSubtitleLifetime{return nativeSubtitleCurrent(state,epoch)?Object.freeze({...state,initialization:null}):state;}
export function nativeSubtitleInitializationRemaining(state:NativeSubtitleLifetime,epoch:number,now:number):number|undefined{return nativeSubtitleCurrent(state,epoch)&&state.initialization!==null?Math.max(0,state.initialization-now):undefined;}
export function admitNativeSubtitleRequest(state:NativeSubtitleLifetime,op:string,now:number):Readonly<{state:NativeSubtitleLifetime;effect:BackendRequestAdmission['effect']}>{if(!nativeSubtitleCurrent(state,state.epoch))return Object.freeze({state,effect:Object.freeze({kind:'reject',reason:'closed'})});const result=admitBackendRequest(state.requests,op,now);return Object.freeze({state:result.state===state.requests?state:Object.freeze({...state,requests:result.state}),effect:result.effect});}
export function settleNativeSubtitleRequest(state:NativeSubtitleLifetime,id:number):Readonly<{state:NativeSubtitleLifetime;accepted:boolean}>{const result=settleBackendRequest(state.requests,id,{kind:'reply'});return Object.freeze({state:result.state===state.requests?state:Object.freeze({...state,requests:result.state}),accepted:result.effect.kind==='settle'});}
export function nativeSubtitleRequestRemaining(state:NativeSubtitleLifetime,id:number,now:number):number|undefined{const request=state.requests.pending.find(item=>item.id===id);return request?Math.max(0,request.deadline-now):undefined;}
export function closeNativeSubtitleLifetime(state:NativeSubtitleLifetime,now:number,failed=false):Readonly<{state:NativeSubtitleLifetime;reject:readonly number[];notify:boolean}>{
 if(state.requests.phase!=='active')return Object.freeze({state,reject:Object.freeze([]),notify:false});
 const failure=failed?failBackendRequests(state.requests):undefined,requests=beginBackendClose(failure?.state??state.requests),reject=failure?.reject??Object.freeze(requests.pending.map(item=>item.id));
 return Object.freeze({state:Object.freeze({...state,epoch:state.epoch+1,requests:Object.freeze({...requests,pending:Object.freeze([])}),initialization:null,closeDeadline:now+5000,acknowledged:false}),reject,notify:failed});
}
export function nativeSubtitleCloseRemaining(state:NativeSubtitleLifetime,now:number):number|undefined{return state.requests.phase==='closing'&&state.closeDeadline!==null?Math.max(0,state.closeDeadline-now):undefined;}
export function finishNativeSubtitleClose(state:NativeSubtitleLifetime):NativeSubtitleLifetime{return state.requests.phase==='closed'?state:Object.freeze({...state,requests:finishBackendClose(state.requests).state,initialization:null,closeDeadline:null});}

export function acknowledgeNativeSubtitleClose(state:NativeSubtitleLifetime):NativeSubtitleLifetime{return state.requests.phase==='closing'&&!state.acknowledged?Object.freeze({...state,acknowledged:true}):state;}
