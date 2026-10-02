// SPDX-License-Identifier: Apache-2.0
export type SplitMP4State = Readonly<{
    ids: readonly number[];
    defaults: readonly Readonly<{
        id: number;
        size: number;
    }>[];
}>;
export declare function initialSplitMP4(): SplitMP4State;
export declare function splitMP4(state: SplitMP4State, input: ArrayBuffer | Uint8Array): Readonly<{
    state: SplitMP4State;
    buffers: ArrayBuffer[];
}>;
export type MP4VideoTimingState = Readonly<{
    track: number | null;
    scale: number;
    shift: number;
    defaults: readonly Readonly<{
        id: number;
        duration: number;
    }>[];
}>;
export declare function initialMP4VideoTiming(): MP4VideoTimingState;
export declare function readMP4VideoTiming(state: MP4VideoTimingState, input: ArrayBuffer | Uint8Array): Readonly<{
    state: MP4VideoTimingState;
    frames: Array<[number, number]>;
}>;
