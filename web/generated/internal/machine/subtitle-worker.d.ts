// SPDX-License-Identifier: Apache-2.0
export type SubtitleWorkerRequest = Readonly<{
    id: number;
    epoch: number;
    method: string;
    clientId: number | string | null;
}>;
export type SubtitleWorkerRefresh = Readonly<{
    id: string;
    epoch: number;
    deadline: number;
}>;
export type SubtitleWorkerOpenWait = Readonly<{
    id: number;
    epoch: number;
    deadline: number;
}>;
export type SubtitleWorkerState = Readonly<{
    phase: 'active' | 'closing' | 'closed';
    epoch: number;
    serial: number;
    initialized: boolean;
    failed: boolean;
    queue: readonly SubtitleWorkerRequest[];
    active: SubtitleWorkerRequest | null;
    openWait: SubtitleWorkerOpenWait | null;
    refreshSerial: number;
    refreshes: readonly SubtitleWorkerRefresh[];
}>;
export declare function initialSubtitleWorker(): SubtitleWorkerState;
export declare function subtitleWorkerAlive(state: SubtitleWorkerState, epoch: number): boolean;
export declare function subtitleWorkerCurrent(state: SubtitleWorkerState, request: SubtitleWorkerRequest): boolean;
export declare function admitSubtitleWorker(state: SubtitleWorkerState, method: string, clientId: number | string | null): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRequest;
    error?: 'capacity' | 'invalid';
}>;
export declare function startSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    error?: 'initialized';
}>;
export declare function finishSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): SubtitleWorkerState;
export declare function failSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): SubtitleWorkerState;
export declare function closeSubtitleWorker(state: SubtitleWorkerState): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    refreshes: readonly SubtitleWorkerRefresh[];
}>;
export declare function closedSubtitleWorker(state: SubtitleWorkerState): SubtitleWorkerState;
export declare function admitSubtitleRefresh(state: SubtitleWorkerState, epoch: number, now: number): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRefresh;
    error?: 'capacity';
}>;
export declare function subtitleRefreshCurrent(state: SubtitleWorkerState, request: SubtitleWorkerRefresh): boolean;
export declare function settleSubtitleRefresh(state: SubtitleWorkerState, id: string, now?: number): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRefresh;
    remaining?: number;
}>;
export declare function beginSubtitleOpenWait(state: SubtitleWorkerState, request: SubtitleWorkerRequest, now: number): SubtitleWorkerState;
export declare function settleSubtitleOpenWait(state: SubtitleWorkerState, id: number, now?: number): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    remaining?: number;
}>;
export declare function failSubtitleWorkerLifetime(state: SubtitleWorkerState, epoch: number): SubtitleWorkerState;
