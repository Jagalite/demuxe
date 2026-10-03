// SPDX-License-Identifier: Apache-2.0
// Epoch and terminal authority; shared-memory cursors and PCM copies stay in the DSP shell.
export type PCMWorkletState=Readonly<{closed:boolean;epoch:number}>;
export function initialPCMWorklet():PCMWorkletState{return Object.freeze({closed:false,epoch:-1});}
export function closePCMWorklet(state:PCMWorkletState):PCMWorkletState{return state.closed?state:Object.freeze({...state,closed:true});}
// Stable epochs return the same object: no per-quantum allocation.
export function observePCMWorkletEpoch(state:PCMWorkletState,epoch:number):PCMWorkletState{return state.closed||state.epoch===epoch?state:Object.freeze({...state,epoch});}
export function pcmWorkletFrames(read:number,write:number,quantum:number,capacity:number):number{return Math.min((write-read)>>>0,quantum,capacity);}
