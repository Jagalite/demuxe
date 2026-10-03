// SPDX-License-Identifier: Apache-2.0
// Logical lifetime and header-identity ownership; ring cursors and DSP stay physical.
export type SelectiveWorkletState=Readonly<{phase:'active'|'closed'|'failed';generation:number;epoch:number}>;
export function initialSelectiveWorklet():SelectiveWorkletState{return Object.freeze({phase:'active',generation:-1,epoch:-1});}
export function retireSelectiveWorklet(state:SelectiveWorkletState,failed=false):SelectiveWorkletState{return state.phase!=='active'?state:Object.freeze({...state,phase:failed?'failed':'closed'});}
// Called only at identity boundaries, never allocating for stable audio quanta.
export function observeSelectiveWorklet(state:SelectiveWorkletState,generation:number,epoch:number):SelectiveWorkletState{
 if(state.phase!=='active')return state;
 if(generation!==state.generation)return Object.freeze({...state,generation});
 return epoch!==state.epoch?Object.freeze({...state,epoch}):state;
}
export function selectiveWorkletCurrent(state:SelectiveWorkletState,generation:number,epoch:number):boolean{return state.phase==='active'&&state.generation===generation&&state.epoch===epoch;}
// Cadence positions, PCM cursors and per-frame rate-scan positions are DSP progress.
export function selectiveTimelineDue(frame:number,next:number):boolean{return frame>=next;}
export function selectiveNextTimeline(frame:number):number{return frame+1024;}
export function selectivePulseDue(frame:number,last:number,rate:number):boolean{return frame-last>rate*0.5;}
export function selectiveWorkletFrames(read:number,write:number,quantum:number,capacity:number):number{return Math.min((write-read)>>>0,quantum,capacity);}
export function selectiveWorkletCanConsume(gate:number,running:number,outputChannels:number,epoch:number,permittedEpoch:number):boolean{return !!gate&&!!running&&outputChannels>0&&epoch===permittedEpoch;}
// Unsigned header cursors may wrap; scanning is bounded by the physical ring.
export function selectiveWorkletScanFrames(read:number,write:number,capacity:number):number{return Math.min((write-read)>>>0,capacity);}
export function selectiveWorkletScanOffset(read:number,scanned:number,available:number):number{const offset=(scanned-read)>>>0;return offset<=available?offset:0;}
export function selectiveWorkletLayoutSupported(channels:number):boolean{return channels===2||channels===6||channels===8;}
