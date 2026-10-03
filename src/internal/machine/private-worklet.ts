// SPDX-License-Identifier: Apache-2.0
// Message-time authority. DSP cursors and sample buffers are physical shell state.
export type PrivateWorkletState=Readonly<{phase:'active'|'stopped'|'failed';connected:boolean;epoch:number;capacity:number;channels:number;running:boolean;recording:boolean;error:string|null;stale:number;maxQueued:number}>;
export type PrivateWorkletMessage=Readonly<{object:boolean;type:string|null;epoch:number;capacity:number|null;channels:number|null;running:boolean|null;buffer:boolean;bytes:number;finite:boolean;start:number}>;
export type PrivateWorkletEffect='none'|'error'|'stop'|'reset'|'append';
export type PrivateWorkletDecision=Readonly<{state:PrivateWorkletState;effect:PrivateWorkletEffect;frames?:number}>;
export const privateWorkletCaptureLimit=2000000;
export function initialPrivateWorklet():PrivateWorkletState{return Object.freeze({phase:'active',connected:false,epoch:-1,capacity:8192,channels:2,running:false,recording:false,error:null,stale:0,maxQueued:0});}
export function failPrivateWorklet(state:PrivateWorkletState,error:string):PrivateWorkletDecision{return state.phase==='failed'?Object.freeze({state,effect:'none'}):Object.freeze({state:Object.freeze({...state,phase:'failed',running:false,error}),effect:'error'});}
export function connectPrivateWorklet(state:PrivateWorkletState):Readonly<{state:PrivateWorkletState;accepted:boolean;error?:string}>{return state.connected||state.phase!=='active'?Object.freeze({state,accepted:false,error:'Transport already connected or stopped'}):Object.freeze({state:Object.freeze({...state,connected:true}),accepted:true});}
export function recordPrivateWorklet(state:PrivateWorkletState):PrivateWorkletState{return state.recording?state:Object.freeze({...state,recording:true});}
export function stopPrivateWorkletRecording(state:PrivateWorkletState):PrivateWorkletState{return !state.recording?state:Object.freeze({...state,recording:false});}
function bufferValid(state:PrivateWorkletState,input:PrivateWorkletMessage):boolean{return input.buffer&&input.bytes%(state.channels*4)===0&&input.bytes>=state.channels*4&&input.bytes<=1024*state.channels*4;}
// This allocation-free admission check avoids scanning malformed/stale payloads.
export function inspectPrivateWorkletPCM(state:PrivateWorkletState,input:PrivateWorkletMessage):boolean{return state.phase==='active'&&input.object&&input.type==='pcm'&&input.epoch===state.epoch&&bufferValid(state,input);}
export function receivePrivateWorklet(state:PrivateWorkletState,input:PrivateWorkletMessage,read:number,written:number):PrivateWorkletDecision{
 const result=(next:PrivateWorkletState,effect:PrivateWorkletEffect='none',frames?:number):PrivateWorkletDecision=>Object.freeze({state:next,effect,...frames===undefined?{}:{frames}});
 if(input.type==='stop')return result(state.phase==='stopped'&&!state.running?state:Object.freeze({...state,phase:state.phase==='failed'?'failed':'stopped',running:false}),'stop');
 if(state.phase!=='active')return result(state);
 if(!input.object)return failPrivateWorklet(state,'Invalid PCM transport message');
 if(input.type==='reset'){
  if(!Number.isInteger(input.epoch)||input.epoch<0||input.epoch>0xffffffff||(input.epoch&1)||input.epoch<=state.epoch)return result(Object.freeze({...state,stale:state.stale+1}));
  const capacity=input.capacity??8192,channels=input.channels??2;
  if(capacity!==8192&&capacity!==32768)return failPrivateWorklet(state,'Invalid PCM capacity');
  if(channels!==2&&channels!==6&&channels!==8)return failPrivateWorklet(state,'Invalid PCM channel count');
  return result(Object.freeze({...state,epoch:input.epoch,capacity,channels,running:false}),'reset');
 }
 if(input.epoch!==state.epoch)return result(Object.freeze({...state,stale:state.stale+1}));
 if(input.type==='state')return input.running===null?failPrivateWorklet(state,'Invalid PCM running state'):result(input.running===state.running?state:Object.freeze({...state,running:input.running}));
 if(input.type==='pcm'){
  if(!bufferValid(state,input))return failPrivateWorklet(state,'Invalid PCM buffer');
  if(!input.finite)return failPrivateWorklet(state,'Non-finite PCM sample');
  const frames=input.bytes/(state.channels*4);
  if(!Number.isInteger(frames)||frames<1||frames>1024||input.start!==written||written-read+frames>state.capacity)return failPrivateWorklet(state,'Invalid PCM transport bounds');
  const queued=written-read+frames;return result(queued<=state.maxQueued?state:Object.freeze({...state,maxQueued:queued}),'append',frames);
 }
 return result(state);
}
// Primitive results preserve the realtime process loop's allocation behavior.
export function privateWorkletFrames(state:PrivateWorkletState,read:number,written:number,quantum:number,channels:number):number{return channels!==state.channels?-1:state.running?Math.min(quantum,written-read):0;}
export function privateWorkletUnderrun(state:PrivateWorkletState,frames:number,quantum:number):boolean{return state.running&&frames<quantum;}
export function privateWorkletCaptureFits(state:PrivateWorkletState,captured:number,frames:number,limit=privateWorkletCaptureLimit):boolean{return captured+frames*state.channels<=limit;}
