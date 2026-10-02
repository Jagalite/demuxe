// SPDX-License-Identifier: Apache-2.0
export type RemuxData = null | undefined | boolean | number | string | bigint | readonly RemuxData[] | Readonly<{
    [key: string]: RemuxData;
}>;
export type RemuxOwnerObservation = Readonly<{
    duration?: number;
    generation?: number;
    eof?: boolean;
    muxedFrames?: boolean;
    waitingForMedia?: boolean;
    frames?: readonly (readonly [number, number])[];
    snapshot?: Readonly<{
        [key: string]: RemuxData;
    }>;
}>;
type Owner = Readonly<{
    id: number;
    kind: 'worker' | 'local';
    phase: 'booting' | 'ready';
}>;
type Operation = Readonly<{
    id: number;
    kind: 'open' | 'seek';
    sourceKey: string | null;
}>;
export type RemuxOwnerRequest = Readonly<{
    id: number;
    owner: number;
    method: string;
    deadline: number;
}>;
export type RemuxController = Readonly<{
    destroyed: boolean;
    cleanupFailures: number;
    ownerSerial: number;
    owner: Owner | null;
    operationSerial: number;
    operation: Operation | null;
    sourceSerial: number;
    sourceKey: string | null;
    requestSerial: number;
    requests: readonly RemuxOwnerRequest[];
    intent: boolean | null;
    observation: RemuxOwnerObservation;
    observationSerial: number;
    tracksToken: number | null;
    buffering: RemuxData;
    configuration: Readonly<{
        [key: string]: RemuxData;
    }>;
}>;
export type RemuxControllerCommand = Readonly<{
    type: 'boot';
}> | Readonly<{
    type: 'booted';
    owner: number;
}> | Readonly<{
    type: 'begin';
    kind: 'open' | 'seek';
}> | Readonly<{
    type: 'finish';
    id: number;
}> | Readonly<{
    type: 'local';
    operation: number;
    reason: 'boot' | 'source';
    message: string;
}> | Readonly<{
    type: 'release';
    owner: number;
}> | Readonly<{
    type: 'request';
    owner: number;
    method: string;
    now: number;
}> | Readonly<{
    type: 'reply';
    owner: number;
    id: number;
}> | Readonly<{
    type: 'deadline';
    owner: number;
    id: number;
    now: number;
}> | Readonly<{
    type: 'observe';
    owner: number;
    observation: RemuxOwnerObservation;
    tracks: boolean;
}> | Readonly<{
    type: 'buffering';
    owner: number;
    value: RemuxData;
}> | Readonly<{
    type: 'intent';
    playing: boolean;
}> | Readonly<{
    type: 'destroy';
}> | Readonly<{
    type: 'cleanup-failed';
}>;
export type RemuxControllerDecision = Readonly<{
    state: RemuxController;
    accepted?: boolean;
    error?: string;
    owner?: number;
    operation?: number;
    sourceKey?: string | null;
    request?: RemuxOwnerRequest;
    retire?: readonly RemuxOwnerRequest[];
    wait?: number;
}>;
export declare function initialRemuxController(buffering?: RemuxData, configuration?: Readonly<{
    [key: string]: RemuxData;
}>): RemuxController;
export declare function remuxOwnerCurrent(state: RemuxController, id: number): boolean;
export declare function remuxOperationCurrent(state: RemuxController, id: number): boolean;
export declare function remuxFallbackAllowed(state: RemuxController, operation: number, reason: 'boot' | 'source', message: string): boolean;
export declare function remuxReleaseCurrent(state: RemuxController, owner: number, operationSerial: number): boolean;
export declare function transitionRemuxController(state: RemuxController, command: RemuxControllerCommand): RemuxControllerDecision;
export {};
