// SPDX-License-Identifier: Apache-2.0
export type RemuxWorkerOperation = Readonly<{
    id: number;
    method: 'boot' | 'open' | 'seek' | 'setBuffering';
    epoch: number;
}>;
export type RemuxWorkerRequest = Readonly<{
    id: number;
    kind: 'element' | 'refresh';
    epoch: number;
    deadline: number;
}>;
export type RemuxWorkerState = Readonly<{
    phase: 'idle' | 'booting' | 'ready' | 'closing' | 'closed';
    epoch: number;
    sourceKey: string | null;
    serial: number;
    operations: readonly RemuxWorkerOperation[];
    requests: readonly RemuxWorkerRequest[];
}>;
export type RemuxWorkerCommand = Readonly<{
    type: 'call';
    id: number;
    method: string;
    sourceKey?: string;
}> | Readonly<{
    type: 'finish';
    id: number;
    success: boolean;
}> | Readonly<{
    type: 'request';
    kind: 'element' | 'refresh';
    now: number;
    sourceKey?: string;
}> | Readonly<{
    type: 'reply';
    kind: 'element' | 'refresh';
    id: number;
}> | Readonly<{
    type: 'deadline';
    kind: 'element' | 'refresh';
    id: number;
    now: number;
}> | Readonly<{
    type: 'shutdown';
}> | Readonly<{
    type: 'closed';
}>;
export type RemuxWorkerDecision = Readonly<{
    state: RemuxWorkerState;
    error?: string;
    accepted?: boolean;
    current?: boolean;
    operation?: RemuxWorkerOperation;
    request?: RemuxWorkerRequest;
    retire?: readonly RemuxWorkerRequest[];
    wait?: number;
}>;
export declare function initialRemuxWorker(): RemuxWorkerState;
export declare function remuxWorkerLive(state: RemuxWorkerState): boolean;
export declare function remuxWorkerOperationCurrent(state: RemuxWorkerState, operation: RemuxWorkerOperation): boolean;
export declare function transitionRemuxWorker(state: RemuxWorkerState, command: RemuxWorkerCommand): RemuxWorkerDecision;
export type RemuxElementState = Readonly<{
    currentTime: number;
    paused: boolean;
    playbackRate: number;
    readyState: number;
    ended?: boolean;
    seeking?: boolean;
    quality?: Readonly<{
        totalVideoFrames: number;
        droppedVideoFrames: number;
    }>;
    ranges: readonly (readonly [number, number])[];
}>;
export declare function initialRemuxElement(): RemuxElementState;
export declare function observeRemuxElement(state: RemuxElementState): RemuxElementState;
export declare function seekRemuxElement(state: RemuxElementState, currentTime: number): RemuxElementState;
export declare function pauseRemuxElement(state: RemuxElementState): RemuxElementState;
