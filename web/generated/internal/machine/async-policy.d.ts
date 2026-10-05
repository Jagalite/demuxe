// SPDX-License-Identifier: Apache-2.0
/** Scalar async policies. Physical settlement and release remain separate facts. */
export type WaitKind = 'initialization' | 'retirement' | 'io-open' | 'io-close' | 'decoder' | 'private-output' | 'preview-media' | 'threads';
export type WaitState = Readonly<{
    id: number;
    deadline: number;
    phase: 'waiting' | 'ready' | 'failed' | 'timeout' | 'retired';
}>;
export declare function beginWait(id: number, now: number, kind: WaitKind): WaitState;
export declare function observeWait(state: WaitState, event: Readonly<{
    id: number;
    kind: 'ready' | 'failed' | 'retire' | 'deadline';
    now: number;
}>): WaitState;
export type AttemptState = Readonly<{
    count: number;
    index: number;
    phase: 'trying' | 'accepted' | 'exhausted' | 'retired';
    deferred: boolean;
}>;
export declare function beginAttempts(count: number): AttemptState;
export declare function observeAttempt(state: AttemptState, index: number, outcome: 'accept' | 'retry' | 'defer' | 'retire'): AttemptState;
