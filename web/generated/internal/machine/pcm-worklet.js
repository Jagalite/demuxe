// SPDX-License-Identifier: Apache-2.0
export function initialPCMWorklet() { return Object.freeze({ closed: false, epoch: -1 }); }
export function closePCMWorklet(state) { return state.closed ? state : Object.freeze({ ...state, closed: true }); }
// Stable epochs return the same object: no per-quantum allocation.
export function observePCMWorkletEpoch(state, epoch) { return state.closed || state.epoch === epoch ? state : Object.freeze({ ...state, epoch }); }
export function pcmWorkletFrames(read, write, quantum, capacity) { return Math.min((write - read) >>> 0, quantum, capacity); }
