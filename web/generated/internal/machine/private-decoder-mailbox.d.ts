// SPDX-License-Identifier: Apache-2.0
export type DecoderMailboxRequest = Readonly<{
    id: number;
    generation: number;
    due: number;
    phase: 'executing' | 'ready' | 'committing' | 'done';
    cancelled: null | 'cancel' | 'timeout';
    result: number;
}>;
export type DecoderMailboxState = Readonly<{
    closed: boolean;
    generation: number;
    serial: number;
    pending: DecoderMailboxRequest | null;
    failure: null | 'timeout' | 'boundary' | 'presentation';
    stats: Readonly<{
        requests: number;
        committed: number;
        cancelled: number;
        timeouts: number;
        errors: number;
        lateResults: number;
    }>;
}>;
export declare function initialDecoderMailbox(): DecoderMailboxState;
export declare function validDecoderRequest(ptr: number, operation: number, memoryBytes: number): boolean;
export declare function validDecoderPacket(ptr: number, operation: number, memoryBytes: number, size: number): boolean;
export declare function beginDecoderRequest(state: DecoderMailboxState, now: number, timeout: number): Readonly<{
    state: DecoderMailboxState;
    id: number | null;
}>;
export declare function canSettleDecoderRequest(state: DecoderMailboxState, id: number): boolean;
export declare function settleDecoderRequest(state: DecoderMailboxState, id: number, result: number, valid?: boolean): Readonly<{
    state: DecoderMailboxState;
    accepted: boolean;
}>;
export declare function cancelDecoderRequest(state: DecoderMailboxState, id: number, timeout?: boolean, now?: number): Readonly<{
    state: DecoderMailboxState;
    accepted: boolean;
    wake: boolean;
    remaining: number | null;
}>;
export declare function retireDecoderMailbox(state: DecoderMailboxState, close?: boolean): Readonly<{
    state: DecoderMailboxState;
    id: number | null;
    wake: boolean;
}>;
export declare function decoderCommitCurrent(state: DecoderMailboxState, id: number): boolean;
export declare function decoderRequestResult(state: DecoderMailboxState, id: number): number;
export declare function beginDecoderCommit(state: DecoderMailboxState, id: number): Readonly<{
    state: DecoderMailboxState;
    accepted: boolean;
    result: number;
}>;
export declare function failDecoderCommit(state: DecoderMailboxState, id: number, failure: 'boundary' | 'presentation'): DecoderMailboxState;
export declare function failDecoderRelease(state: DecoderMailboxState): DecoderMailboxState;
export declare function validDecoderFrameIdentity(generation: number, id: number): boolean;
export declare function finishDecoderCommit(state: DecoderMailboxState, id: number, committed: boolean): DecoderMailboxState;
export type DecoderResponseFacts = Readonly<{
    result: number;
    fields?: readonly number[];
    timestamp?: number;
    duration?: number;
    pixels: 'none' | 'bytes' | 'invalid';
    pixelBytes: number;
}>;
export declare function validDecoderResponse(value: DecoderResponseFacts): boolean;
