// SPDX-License-Identifier: Apache-2.0
export type RemuxSourceRead = Readonly<{
    id: number;
    epoch: number;
    offset: number;
    count: number;
    clientId: number | null;
}>;
export type RemuxSourceRefresh = Readonly<{
    id: number;
    epoch: number;
    deadline: number;
}>;
export type RemuxSourceWorkerState = Readonly<{
    phase: 'idle' | 'opening' | 'ready' | 'closed' | 'failed';
    epoch: number;
    mode: 'port' | 'mailbox' | null;
    size: number | null;
    serial: number;
    refreshSerial: number;
    read: RemuxSourceRead | null;
    refresh: RemuxSourceRefresh | null;
}>;
export declare function initialRemuxSourceWorker(): RemuxSourceWorkerState;
export declare function remuxSourceCurrent(state: RemuxSourceWorkerState, epoch: number): boolean;
export declare function beginRemuxSource(state: RemuxSourceWorkerState, mode: 'port' | 'mailbox'): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
    epoch: number;
}>;
export declare function openedRemuxSource(state: RemuxSourceWorkerState, epoch: number, size: number): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
}>;
export declare function beginRemuxSourceRead(state: RemuxSourceWorkerState, epoch: number, offset: number, count: number, clientId: number | null): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
    request: RemuxSourceRead | null;
    error?: string;
}>;
export declare function remuxSourceReadCurrent(state: RemuxSourceWorkerState, request: RemuxSourceRead): boolean;
export declare function finishRemuxSourceRead(state: RemuxSourceWorkerState, request: RemuxSourceRead): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
}>;
export declare function beginRemuxSourceRefresh(state: RemuxSourceWorkerState, epoch: number, now: number): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
    request: RemuxSourceRefresh | null;
    error?: string;
}>;
export declare function remuxSourceRefreshCurrent(state: RemuxSourceWorkerState, request: RemuxSourceRefresh): boolean;
export declare function settleRemuxSourceRefresh(state: RemuxSourceWorkerState, id: number, epoch: number, now?: number): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
    request: RemuxSourceRefresh | null;
    remaining?: number;
}>;
export declare function retireRemuxSourceWorker(state: RemuxSourceWorkerState, phase: 'closed' | 'failed'): Readonly<{
    state: RemuxSourceWorkerState;
    accepted: boolean;
    read: RemuxSourceRead | null;
    refresh: RemuxSourceRefresh | null;
}>;
