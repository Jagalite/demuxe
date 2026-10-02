// SPDX-License-Identifier: Apache-2.0
import type {BufferingPolicy} from '../../types.js';
export type NativeControlDomain='playback'|'gain'|'volume'|'rate'|'output'|'buffering'|'subtitles'|'subtitle-visibility';
export type NativeControlRequest=Readonly<{id:number;epoch:number;kind:'control';domain:NativeControlDomain}>;
export type NativeControls=Readonly<{pending:Readonly<Partial<Record<NativeControlDomain,NativeControlRequest>>>;activation:Readonly<Partial<Record<NativeControlDomain,Readonly<{id:number;deadline:number}>>>>;sink:Readonly<{active:NativeControlRequest|null;queued:readonly NativeControlRequest[]}>;paused:boolean;playbackSerial:number;gain:number;volume:number;rate:number;outputDevice:string;buffering:BufferingPolicy}>;
export type NativeControlValue=Readonly<{type:'gain'|'volume'|'rate';value:number}>|Readonly<{type:'output';value:string}>|Readonly<{type:'buffering';value:BufferingPolicy}>;
export function initialNativeControls(buffering:BufferingPolicy={preload:'auto',profile:'balanced'}):NativeControls{return Object.freeze({pending:Object.freeze({}),activation:Object.freeze({}),sink:Object.freeze({active:null,queued:Object.freeze([])}),paused:true,playbackSerial:0,gain:1,volume:100,rate:1,outputDevice:'',buffering:Object.freeze({...buffering})});}
export function nativeControlCurrent(state:NativeControls,request:NativeControlRequest):boolean{return state.pending[request.domain]?.id===request.id&&state.pending[request.domain]?.epoch===request.epoch;}
export function beginNativeControl(state:NativeControls,request:NativeControlRequest,paused?:boolean):NativeControls{return Object.freeze({...state,pending:Object.freeze({...state.pending,[request.domain]:Object.freeze({...request})}),activation:Object.freeze(Object.fromEntries(Object.entries(state.activation).filter(([domain])=>domain!==request.domain))),...request.domain==='playback'?{paused:paused??state.paused,playbackSerial:request.id}:{}});}
export function retireNativeControls(state:NativeControls):NativeControls{return Object.keys(state.pending).length?Object.freeze({...state,pending:Object.freeze({}),activation:Object.freeze({}),sink:Object.freeze({...state.sink,queued:Object.freeze([])})}):state;}
export function finishNativeControl(state:NativeControls,request:NativeControlRequest):NativeControls{if(!nativeControlCurrent(state,request))return state;return Object.freeze({...state,pending:Object.freeze(Object.fromEntries(Object.entries(state.pending).filter(([domain])=>domain!==request.domain))),activation:Object.freeze(Object.fromEntries(Object.entries(state.activation).filter(([domain])=>domain!==request.domain))),sink:Object.freeze({...state.sink,queued:Object.freeze(state.sink.queued.filter(value=>value.id!==request.id))})});}
export function acceptNativeControl(state:NativeControls,request:NativeControlRequest,change:NativeControlValue):NativeControls{
 if(!nativeControlCurrent(state,request)||request.domain!==change.type)return state;
 switch(change.type){
  case 'gain':return Object.freeze({...state,gain:change.value});
  case 'volume':return Object.freeze({...state,volume:change.value});
  case 'rate':return Object.freeze({...state,rate:change.value});
  case 'output':return Object.freeze({...state,outputDevice:change.value});
  case 'buffering':return Object.freeze({...state,buffering:Object.freeze({...change.value})});
 }
}
export function selectNativeGain(value:number,facts:Readonly<{selective:boolean;graph:boolean;paused:boolean;outputDevice:string}>):Readonly<{error?:string;selective:boolean;createGraph:boolean;resume:boolean;selectOutput:boolean}>{
 const createGraph=!facts.selective&&!facts.graph&&value!==1;
 return Object.freeze({...!Number.isFinite(value)||value<0||value>1?{error:'Gain must be between 0 and 1'}:{},selective:facts.selective,createGraph,resume:createGraph&&!facts.paused,selectOutput:createGraph&&!!facts.outputDevice});
}

export function beginNativeActivation(state:NativeControls,request:NativeControlRequest,now:number):NativeControls{return nativeControlCurrent(state,request)?Object.freeze({...state,activation:Object.freeze({...state.activation,[request.domain]:Object.freeze({id:request.id,deadline:now+10000})})}):state;}
export function nativeActivationRemaining(state:NativeControls,request:NativeControlRequest,now:number):number|undefined{const activation=state.activation[request.domain];return nativeControlCurrent(state,request)&&activation?.id===request.id?Math.max(0,activation.deadline-now):undefined;}

export function nativeGainOutputWait(state:NativeControls,request:NativeControlRequest):number|undefined{return nativeControlCurrent(state,request)&&request.domain==='gain'?state.pending.output?.id:undefined;}

export function queueNativeSink(state:NativeControls,request:NativeControlRequest):Readonly<{state:NativeControls;accepted:boolean;start?:NativeControlRequest}>{
 if(!nativeControlCurrent(state,request)||!['gain','output'].includes(request.domain))return Object.freeze({state,accepted:false});
 if(state.sink.active?.id===request.id||state.sink.queued.some(value=>value.id===request.id))return Object.freeze({state,accepted:false});
 if(!state.sink.active)return Object.freeze({state:Object.freeze({...state,sink:Object.freeze({active:Object.freeze({...request}),queued:state.sink.queued})}),accepted:true,start:Object.freeze({...request})});
 return Object.freeze({state:Object.freeze({...state,sink:Object.freeze({...state.sink,queued:Object.freeze([...state.sink.queued.filter(value=>value.domain!==request.domain&&nativeControlCurrent(state,value)),Object.freeze({...request})])})}),accepted:true});
}
export function finishNativeSink(state:NativeControls,request:NativeControlRequest):Readonly<{state:NativeControls;accepted:boolean;start?:NativeControlRequest}>{
 if(state.sink.active?.id!==request.id||state.sink.active.epoch!==request.epoch)return Object.freeze({state,accepted:false});
 const queued=state.sink.queued.filter(value=>nativeControlCurrent(state,value)),start=queued[0];
 return Object.freeze({state:Object.freeze({...state,sink:Object.freeze({active:start??null,queued:Object.freeze(queued.slice(1))})}),accepted:true,...start?{start}:{}});
}
