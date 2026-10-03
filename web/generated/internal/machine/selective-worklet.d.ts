// SPDX-License-Identifier: Apache-2.0
export type SelectiveWorkletState = Readonly<{
    phase: 'active' | 'closed' | 'failed';
    generation: number;
    epoch: number;
}>;
export declare function initialSelectiveWorklet(): SelectiveWorkletState;
export declare function retireSelectiveWorklet(state: SelectiveWorkletState, failed?: boolean): SelectiveWorkletState;
export declare function observeSelectiveWorklet(state: SelectiveWorkletState, generation: number, epoch: number): SelectiveWorkletState;
export declare function selectiveWorkletCurrent(state: SelectiveWorkletState, generation: number, epoch: number): boolean;
export declare function selectiveTimelineDue(frame: number, next: number): boolean;
export declare function selectiveNextTimeline(frame: number): number;
export declare function selectivePulseDue(frame: number, last: number, rate: number): boolean;
export declare function selectiveWorkletFrames(read: number, write: number, quantum: number, capacity: number): number;
export declare function selectiveWorkletCanConsume(gate: number, running: number, outputChannels: number, epoch: number, permittedEpoch: number): boolean;
export declare function selectiveWorkletScanFrames(read: number, write: number, capacity: number): number;
export declare function selectiveWorkletScanOffset(read: number, scanned: number, available: number): number;
export declare function selectiveWorkletLayoutSupported(channels: number): boolean;
