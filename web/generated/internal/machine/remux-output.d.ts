// SPDX-License-Identifier: Apache-2.0
type Frame = readonly [number, number];
type Prime = Readonly<{
    id: number;
    target: number;
    expected: number;
    deadline: number;
    presented: number | undefined;
}>;
export type RemuxOutput = Readonly<{
    frames: readonly Frame[];
    muxedFrames: boolean;
    position: number | undefined;
    progressAt: number | undefined;
    waiting: boolean;
    primeSerial: number;
    prime: Prime | null;
}>;
export declare function initialRemuxOutput(): RemuxOutput;
export declare function resetRemuxOutput(state: RemuxOutput, clearFrames?: boolean): RemuxOutput;
export declare function expectedRemuxVideoFrame(state: RemuxOutput, target: number): number | undefined;
export declare function matchesRemuxVideoFrame(state: RemuxOutput, target: number, mediaTime: number, timelineBias: number): boolean | undefined;
export type RemuxOutputCommand = Readonly<{
    type: 'frames';
    presentation?: readonly Frame[];
    frames?: readonly Frame[];
    timelineBias: number;
}> | Readonly<{
    type: 'starvation';
    active: boolean;
    position: number;
    sourceTime: number;
    pulling: boolean;
    ranges: readonly Frame[];
    rate: number;
    now: number;
}> | Readonly<{
    type: 'prime';
    enabled: boolean;
    updating: boolean;
    videoEnd: number;
    bufferEnd: number | undefined;
    audioRanges: readonly Frame[];
    timelineBias: number;
    now: number;
}> | Readonly<{
    type: 'presented';
    id: number;
    mediaTime?: number;
    position: number;
    seeking: boolean;
    timelineBias: number;
}> | Readonly<{
    type: 'prime-deadline';
    id: number;
    now: number;
}>;
export type RemuxOutputDecision = Readonly<{
    state: RemuxOutput;
    accepted: boolean;
    changed?: boolean;
    id?: number;
    target?: number;
    completed?: boolean;
    presented?: number;
    error?: string;
    remaining?: number;
}>;
export declare function transitionRemuxOutput(state: RemuxOutput, command: RemuxOutputCommand): RemuxOutputDecision;
export {};
