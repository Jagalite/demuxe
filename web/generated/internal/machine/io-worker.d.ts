// SPDX-License-Identifier: Apache-2.0
export type IORead = Readonly<{
    id: number;
    state: number;
    serial: number;
    epoch: number;
}>;
export type IOWorkerState = Readonly<{
    phase: 'idle' | 'opening' | 'ready' | 'closed' | 'failed';
    nativeEpoch: number | null;
    serial: number;
    read: IORead | null;
    pumping: boolean;
    refreshSerial: number;
    refresh: Readonly<{
        id: number;
        deadline: number;
    }> | null;
}>;
export declare function initialIOWorker(): IOWorkerState;
export declare const ioWorkerCurrent: (state: IOWorkerState) => boolean;
export type IOWorkerInput = Readonly<{
    type: 'init' | 'ready' | 'pump' | 'close' | 'fail';
}> | Readonly<{
    type: 'epoch';
    epoch: number;
}> | Readonly<{
    type: 'read';
    state: number;
    serial: number;
    epoch: number;
}> | Readonly<{
    type: 'finish';
    id: number;
}> | Readonly<{
    type: 'refresh';
    now: number;
}> | Readonly<{
    type: 'refreshed';
    id: number;
    now?: number;
}>;
export declare function transitionIOWorker(state: IOWorkerState, input: IOWorkerInput): Readonly<{
    epochChanged?: boolean;
    read?: IORead;
    refresh?: Readonly<{
        id: number;
        deadline: number;
    }>;
    remaining?: number;
    error?: string;
    state: Readonly<{
        phase: "idle" | "opening" | "ready" | "closed" | "failed";
        nativeEpoch: number | null;
        serial: number;
        read: IORead | null;
        pumping: boolean;
        refreshSerial: number;
        refresh: Readonly<{
            id: number;
            deadline: number;
        }> | null;
    }>;
    accepted: boolean;
}>;
export declare function ioReadCurrent(state: IOWorkerState, read: IORead, facts: Readonly<{
    state: number;
    serial: number;
    epoch: number;
}>): boolean;
