// SPDX-License-Identifier: Apache-2.0
export type RetainedDecoderScope = Readonly<{
    generation: number;
    decoder: number;
}>;
export type RetainedDecoderStatistics = Readonly<{
    submitted: number;
    received: number;
    delivered: number;
    closed: number;
    peakFrames: number;
    resets: number;
    blockedReceives: number;
    maxConsecutiveBlockedReceives: number;
    capacityResumes: number;
}>;
export type RetainedDecoderState = Readonly<{
    generation: number;
    decoderSerial: number;
    decoder: number | null;
    configuration: boolean;
    pending: boolean;
    checkSerial: number;
    check: number | null;
    frameSerial: number;
    frames: readonly number[];
    needsKey: boolean;
    draining: boolean;
    flushed: boolean;
    failed: boolean;
    blockedReceiveStreak: number;
    waitSerial: number;
    wait: Readonly<{
        id: number;
        generation: number;
    }> | null;
    stats: RetainedDecoderStatistics;
}>;
export declare function initialRetainedDecoder(): RetainedDecoderState;
export declare function retainedDecoderCurrent(state: RetainedDecoderState, scope: RetainedDecoderScope): boolean;
export declare function retireRetainedDecoder(state: RetainedDecoderState, clearConfiguration?: boolean): Readonly<{
    state: RetainedDecoderState;
    close: readonly number[];
}>;
export declare function resetRetainedDecoder(state: RetainedDecoderState, generation: number): RetainedDecoderState;
export declare function pendingRetainedConfiguration(state: RetainedDecoderState, generation: number): RetainedDecoderState;
export declare function checkRetainedConfiguration(state: RetainedDecoderState, generation: number): Readonly<{
    state: RetainedDecoderState;
    id: number | null;
}>;
export declare function activateRetainedDecoder(state: RetainedDecoderState, generation: number, check?: number): Readonly<{
    state: RetainedDecoderState;
    scope: RetainedDecoderScope | null;
}>;
export declare function retainedSourcePolicy(source: Readonly<{
    width: number;
    height: number;
    kind: number;
    profile: number;
    depth: number;
    inBandHEVC: boolean;
}>, maxPixels: number): Readonly<{
    pending: boolean;
    error: string | null;
}>;
export declare function acceptRetainedDecoderFrame(state: RetainedDecoderState, scope: RetainedDecoderScope): Readonly<{
    state: RetainedDecoderState;
    id: number | null;
    overflow: boolean;
}>;
export declare function closeRetainedDecoderFrame(state: RetainedDecoderState): RetainedDecoderState;
export declare function failRetainedDecoder(state: RetainedDecoderState, scope: RetainedDecoderScope): RetainedDecoderState;
export declare function retainedPacketPolicy(state: RetainedDecoderState, input: Readonly<{
    queuedPackets: number;
    size: number;
    timestamp: number;
    duration: number;
}>): 'again' | 'submit' | 'invalid';
export declare function submittedRetainedPacket(state: RetainedDecoderState, scope: RetainedDecoderScope): RetainedDecoderState;
export declare function drainRetainedDecoder(state: RetainedDecoderState): Readonly<{
    state: RetainedDecoderState;
    scope: RetainedDecoderScope | null;
}>;
export declare function flushedRetainedDecoder(state: RetainedDecoderState, scope: RetainedDecoderScope): RetainedDecoderState;
export declare function releaseRetainedDecoderCapacity(state: RetainedDecoderState, id: number): RetainedDecoderState;
export declare function receiveRetainedDecoderFrame(state: RetainedDecoderState, queuedPackets: number, capacity: boolean): Readonly<{
    state: RetainedDecoderState;
    id: number | null;
    wait: number | null;
    resumed: boolean;
    result: number;
}>;
export declare function retainedOutputValid(input: Readonly<{
    width: number;
    height: number;
    timestamp: number;
    duration: number;
}>, maxPixels: number): boolean;
export declare function deliveredRetainedFrame(state: RetainedDecoderState, scope: RetainedDecoderScope, resumed: boolean): RetainedDecoderState;
