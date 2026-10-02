// SPDX-License-Identifier: Apache-2.0
export type NativeEventRequest=Readonly<{id:number;epoch:number;kind:'event'}>;
export type NativeEventWait=Readonly<{request:NativeEventRequest;event:string;loading:boolean;budget:number;deadline:number}>;
export function beginNativeEventWait(request:NativeEventRequest,event:string,now:number,loadBudget:number):NativeEventWait{
 const loading=event==='loadeddata'||event==='loadedmetadata',budget=loading?loadBudget:25000;
 return Object.freeze({request:Object.freeze({...request}),event,loading,budget,deadline:now+budget});
}
export function nativeEventWaitCurrent(waits:readonly NativeEventWait[],request:NativeEventRequest):boolean{return waits.some(wait=>wait.request.id===request.id&&wait.request.epoch===request.epoch);}
export function nativeEventWaitDeadline(waits:readonly NativeEventWait[],request:NativeEventRequest,now:number):Readonly<{remaining?:number;event?:string;loading?:boolean;budget?:number}>|undefined{
 const wait=waits.find(wait=>wait.request.id===request.id&&wait.request.epoch===request.epoch);if(!wait)return;
 return now<wait.deadline?Object.freeze({remaining:wait.deadline-now}):Object.freeze({event:wait.event,loading:wait.loading,budget:wait.budget});
}
