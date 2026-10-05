// SPDX-License-Identifier: Apache-2.0
import {initialFrameOrder,admitOrderedFrame,takeOrderedFrame,orderedFrameReady,orderedPacketLimit,type FrameOrder} from './video-frame-order.js';
export interface LegacyDecoderWorkerState {
 readonly initialized:boolean;readonly closed:boolean;readonly generation:number;readonly serial:number;
 readonly busy:Readonly<{id:number;ticket:number}>|null;readonly frameSerial:number;readonly frames:readonly number[];readonly ordering:FrameOrder;
 readonly needsKey:boolean;readonly shared:boolean;readonly draining:boolean;readonly flushed:boolean;
 readonly failure:string|null;readonly decoderTimeout:boolean;readonly submitted:number;readonly consumed:number;
 readonly outputWaitSince:number|null;readonly watchdog:boolean;readonly disabled:boolean;readonly faultAfter:number;
}
export const initialLegacyDecoderWorker=():LegacyDecoderWorkerState=>({initialized:false,closed:false,generation:0,serial:0,busy:null,frameSerial:0,frames:[],ordering:initialFrameOrder(null),needsKey:true,shared:true,draining:false,flushed:false,failure:null,decoderTimeout:false,submitted:0,consumed:0,outputWaitSince:null,watchdog:true,disabled:false,faultAfter:0});
export type LegacyDecoderEvent=
 |{type:'init';disabled:boolean;watchdog:boolean;faultAfter:number}|{type:'cancel'}|{type:'reset'}|{type:'configure';reorderDepth?:number|null}
 |{type:'watchdog';enabled:boolean}|{type:'shared-unsupported'}|{type:'submitted'}|{type:'delivered'}
 |{type:'drain'}|{type:'flushed';generation:number}|{type:'failed';generation:number;error:string};
export function reduceLegacyDecoderWorker(s:LegacyDecoderWorkerState,e:LegacyDecoderEvent):LegacyDecoderWorkerState{
 if(s.closed)return s;
 switch(e.type){
 case 'init':return s.initialized?s:{...s,initialized:true,disabled:e.disabled,watchdog:e.watchdog,faultAfter:Number.isFinite(e.faultAfter)?Math.max(0,e.faultAfter):0};
 case 'cancel':return {...s,closed:true,disabled:true,frames:[],ordering:initialFrameOrder(s.ordering.depth),draining:false,flushed:false,outputWaitSince:null};
 case 'reset':return s.generation>=0x7fffffff?{...s,closed:true,disabled:true,frames:[],ordering:initialFrameOrder(s.ordering.depth)}:{...s,generation:s.generation+1,frames:[],ordering:initialFrameOrder(s.ordering.depth),draining:false,flushed:false,submitted:0,consumed:0,outputWaitSince:null,failure:null,decoderTimeout:false};
 case 'configure':return {...s,ordering:initialFrameOrder(e.reorderDepth===undefined?s.ordering.depth:e.reorderDepth),frames:[],needsKey:true,outputWaitSince:null};
 case 'watchdog':return {...s,watchdog:e.enabled,outputWaitSince:null};
 case 'shared-unsupported':return {...s,shared:false};
 case 'submitted':return s.submitted>=Number.MAX_SAFE_INTEGER?{...s,failure:'Decoder packet identity exhausted'}:{...s,needsKey:false,submitted:s.submitted+1};
 case 'delivered':return {...s,consumed:Math.min(Number.MAX_SAFE_INTEGER,s.consumed+1),outputWaitSince:null};
 case 'drain':return s.draining?s:{...s,draining:true};
 case 'flushed':return e.generation===s.generation?{...s,flushed:true}:s;
 case 'failed':return e.generation===s.generation?{...s,failure:e.error}:s;
 }
}
export function admitLegacyDecoderWork(s:LegacyDecoderWorkerState,ticket:number):{state:LegacyDecoderWorkerState;id:number|null}{
 if(!s.initialized||s.closed||s.busy||s.serial>=Number.MAX_SAFE_INTEGER||(ticket&3)!==1)return {state:s,id:null};
 const id=s.serial+1;return {state:{...s,serial:id,busy:{id,ticket}},id};
}
export function finishLegacyDecoderWork(s:LegacyDecoderWorkerState,id:number):LegacyDecoderWorkerState{return s.busy?.id===id?{...s,busy:null}:s;}
export function legacyDecoderCurrent(s:LegacyDecoderWorkerState,generation:number):boolean{return !s.closed&&s.generation===generation;}
export function admitLegacyDecoderFrame(s:LegacyDecoderWorkerState,generation:number,pts:number):{state:LegacyDecoderWorkerState;id:number|null;overflow:boolean}{
 if(!legacyDecoderCurrent(s,generation))return {state:s,id:null,overflow:false};
 if(s.frames.length>=32||s.frameSerial>=Number.MAX_SAFE_INTEGER)return {state:{...s,failure:'Frame queue limit'},id:null,overflow:true};
 const id=s.frameSerial+1,ordered=admitOrderedFrame(s.ordering,id,pts);
 if(ordered.error)return {state:{...s,failure:ordered.error},id:null,overflow:true};
 return {state:{...s,frameSerial:id,ordering:ordered.state,frames:ordered.state.frames.map(f=>f.id),outputWaitSince:null},id,overflow:false};
}
export function takeLegacyDecoderFrame(s:LegacyDecoderWorkerState):{state:LegacyDecoderWorkerState;id:number|null}{const selected=takeOrderedFrame(s.ordering,s.flushed);return {state:selected.id===null?s:{...s,ordering:selected.state,frames:selected.state.frames.map(f=>f.id)},id:selected.id};}
export function legacyDecoderPacketAdmission(s:LegacyDecoderWorkerState,queued:number):boolean{return !s.closed&&s.submitted<Number.MAX_SAFE_INTEGER&&queued+s.frames.length<orderedPacketLimit(s.ordering);}
export function observeLegacyDecoderWait(s:LegacyDecoderWorkerState,queued:number,now:number):LegacyDecoderWorkerState{
 if(s.closed)return s;
 const waiting=s.watchdog&&!orderedFrameReady(s.ordering,s.flushed)&&!s.flushed&&(s.draining||queued+s.frames.length>=orderedPacketLimit(s.ordering))&&s.submitted>s.consumed;
 if(!waiting)return s.outputWaitSince===null?s:{...s,outputWaitSince:null};
 if(s.outputWaitSince===null)return {...s,outputWaitSince:now};
 return now-s.outputWaitSince>3000?{...s,decoderTimeout:true}:s;
}
