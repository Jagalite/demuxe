// SPDX-License-Identifier: Apache-2.0
export type PrivateRangeHandle = Readonly<{
    id: number;
    generation: number;
    size: number;
    cancelled: boolean;
}>;
export type PrivateRangeRequest = Readonly<{
    id: number;
    handle: number;
    generation: number;
    ptr: number;
    count: number;
    offset: number;
    deadline: number;
    phase: 'reading' | 'ready';
    cancelled: boolean;
}>;
export type PrivateRangeStats = Readonly<{
    reads: number;
    bytes: number;
    copies: number;
    cancelled: number;
    timeouts: number;
    errors: number;
    lateCompletions: number;
    staleCommitsRejected: number;
    maxPending: number;
    abandonedRequests: number;
}>;
export type PrivateRangeState = Readonly<{
    closed: boolean;
    generation: number;
    nextHandle: number;
    nextRequest: number;
    timeoutMs: number;
    maxPending: number;
    maxChunk: number;
    source: Readonly<{
        generation: number;
        size: number;
        cancelled: boolean;
    }> | null;
    handles: readonly PrivateRangeHandle[];
    requests: readonly PrivateRangeRequest[];
    stats: PrivateRangeStats;
}>;
export declare function createPrivateRangeState(timeoutMs?: number, maxPending?: number, maxChunk?: number): PrivateRangeState;
export declare function privateRangeHandle(state: PrivateRangeState, id: number): PrivateRangeHandle | undefined;
export declare function validPrivateRangeHandle(state: PrivateRangeState, id: number): boolean;
export declare function installPrivateRangeSource(state: PrivateRangeState, size: number): Readonly<{
    state: PrivateRangeState;
    generation: number | null;
    cancel: readonly number[];
}>;
export declare function openPrivateRangeHandle(state: PrivateRangeState): Readonly<{
    state: PrivateRangeState;
    id: number;
}>;
export declare function validPrivateRangeRead(state: PrivateRangeState, input: Readonly<{
    handle: number;
    ptr: number;
    count: number;
    offset: number;
}>): boolean;
export declare function admitPrivateRangeRead(state: PrivateRangeState, input: Readonly<{
    handle: number;
    ptr: number;
    count: number;
    offset: number;
    memoryBytes: number;
    now: number;
}>): Readonly<{
    state: PrivateRangeState;
    request: PrivateRangeRequest | null;
    result: number;
}>;
export declare function settlePrivateRangeRead(state: PrivateRangeState, id: number, outcome: 'valid' | 'invalid' | 'failure' | 'reader-error'): Readonly<{
    state: PrivateRangeState;
    accepted: boolean;
}>;
export declare function cancelPrivateRangeRead(state: PrivateRangeState, id: number, now?: number): Readonly<{
    state: PrivateRangeState;
    accepted: boolean;
    timedOut: boolean;
    remaining: number;
}>;
export declare function retirePrivateRangeHandle(state: PrivateRangeState, id: number, close?: boolean): Readonly<{
    state: PrivateRangeState;
    cancel: readonly number[];
}>;
export declare function retirePrivateRangeSource(state: PrivateRangeState, mode: 'cancel' | 'close' | 'abandon'): Readonly<{
    state: PrivateRangeState;
    cancel: readonly number[];
}>;
export declare function planPrivateRangeCommit(state: PrivateRangeState, id: number, length: number | null, memoryBytes: number): Readonly<{
    value: number;
    reason: 'missing' | 'stale' | 'invalid' | 'failure' | 'copy';
}>;
export declare function finishPrivateRangeCommit(state: PrivateRangeState, id: number, result: Readonly<{
    reason: 'missing' | 'stale' | 'invalid' | 'failure' | 'copy';
    value: number;
}>): PrivateRangeState;
export declare function observePrivateRangeError(state: PrivateRangeState): PrivateRangeState;
