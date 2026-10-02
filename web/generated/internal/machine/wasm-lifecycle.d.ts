// SPDX-License-Identifier: Apache-2.0
import type { WasmSeekState, WasmSeekObservation } from './wasm-seek.js';
/** Logical ownership only. Workers, promises, errors and timers remain in the shell. */
export type WasmPhase = 'initializing' | 'ready' | 'failed' | 'retiring' | 'closed';
export type WasmDeadline = Readonly<{
    id: number;
    deadline: number;
}>;
export type WasmLifecycle = Readonly<{
    phase: WasmPhase;
    initSent: boolean;
    workerFailed: boolean;
    nextRequest: number;
    nextWaiter: number;
    nextOpen: number;
    requests: readonly WasmDeadline[];
    waiters: readonly WasmDeadline[];
    open: number | null;
    hasFile: boolean;
    seek: WasmSeekState;
}>;
export declare function createWasmLifecycle(): WasmLifecycle;
export declare function wasmAlive(state: WasmLifecycle): boolean;
export declare function markWasmInitialized(state: WasmLifecycle): WasmLifecycle;
export declare function settleWasmInitialization(state: WasmLifecycle, success: boolean): WasmLifecycle;
export declare function claimWasmWorkerFailure(state: WasmLifecycle): Readonly<{
    state: WasmLifecycle;
    accepted: boolean;
}>;
export declare function admitWasmRequest(state: WasmLifecycle, now: number): Readonly<{
    state: WasmLifecycle;
    request: WasmDeadline | null;
    reason: 'unavailable' | 'capacity' | null;
}>;
export declare function settleWasmRequest(state: WasmLifecycle, id: number, now?: number): Readonly<{
    state: WasmLifecycle;
    accepted: boolean;
}>;
export declare function rejectWasmRequests(state: WasmLifecycle, id?: number): Readonly<{
    state: WasmLifecycle;
    ids: readonly number[];
}>;
export declare function admitWasmWaiter(state: WasmLifecycle, now: number): Readonly<{
    state: WasmLifecycle;
    waiter: WasmDeadline | null;
}>;
export declare function settleWasmWaiter(state: WasmLifecycle, id: number, now?: number): Readonly<{
    state: WasmLifecycle;
    accepted: boolean;
}>;
export declare function beginWasmOpen(state: WasmLifecycle): Readonly<{
    state: WasmLifecycle;
    id: number | null;
    reason: 'unavailable' | 'busy' | null;
}>;
export declare function ownsWasmOpen(state: WasmLifecycle, id: number): boolean;
export declare function finishWasmOpen(state: WasmLifecycle, id: number): WasmLifecycle;
export declare function observeWasmFile(state: WasmLifecycle, present: boolean): WasmLifecycle;
export declare function beginWasmPlayerSeek(state: WasmLifecycle, target: number): Readonly<{
    state: WasmLifecycle;
    reason: 'invalid' | 'unavailable' | null;
}>;
export declare function observeWasmPlayerSeek(state: WasmLifecycle, event: WasmSeekObservation): WasmLifecycle;
export declare function confirmWasmPlayerSeek(state: WasmLifecycle, id: number, target: number, position: number, settled: boolean): Readonly<{
    state: WasmLifecycle;
    confirmed: boolean;
}>;
export declare function retireWasmLifecycle(state: WasmLifecycle): Readonly<{
    state: WasmLifecycle;
    accepted: boolean;
    requests: readonly number[];
    waiters: readonly number[];
}>;
export declare function finishWasmRetirement(state: WasmLifecycle): WasmLifecycle;
