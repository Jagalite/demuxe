// SPDX-License-Identifier: Apache-2.0
export type PCMWorkletState = Readonly<{
    closed: boolean;
    epoch: number;
}>;
export declare function initialPCMWorklet(): PCMWorkletState;
export declare function closePCMWorklet(state: PCMWorkletState): PCMWorkletState;
export declare function observePCMWorkletEpoch(state: PCMWorkletState, epoch: number): PCMWorkletState;
export declare function pcmWorkletFrames(read: number, write: number, quantum: number, capacity: number): number;
