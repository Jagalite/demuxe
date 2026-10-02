// SPDX-License-Identifier: Apache-2.0
type Recovery = Readonly<{
    id: number;
    sourceId: number;
    restartId: number;
}>;
export type RemuxLifecycle = Readonly<{
    sourceId: number;
    restartId: number;
    generation: number;
    active: boolean;
    stopped: boolean;
    starting: boolean;
    rejected: readonly string[];
    packagingFailure: boolean;
    failedGeneration: number | undefined;
    acceptedGeneration: number | undefined;
    acceptedSourceId: number | undefined;
    targetReady: boolean;
    recoveryAttempts: number;
    recoverySerial: number;
    recovery: Recovery | null;
    playing: boolean;
}>;
export type RemuxLifecycleCommand = Readonly<{
    type: 'open';
}> | Readonly<{
    type: 'restart';
    target: number;
    duration: number | undefined;
    recoveryId?: number;
}> | Readonly<{
    type: 'begin';
    restartId: number;
}> | Readonly<{
    type: 'packaging-failure';
    generation: number;
    failed: boolean;
}> | Readonly<{
    type: 'retry';
    restartId: number;
    mime: string | undefined;
}> | Readonly<{
    type: 'settle';
    restartId: number;
}> | Readonly<{
    type: 'accept';
    generation: number;
}> | Readonly<{
    type: 'retire';
    generation: number;
}> | Readonly<{
    type: 'failure';
    generation: number;
    message: string;
    playing: boolean;
}> | Readonly<{
    type: 'recovered';
    recoveryId: number;
}> | Readonly<{
    type: 'intent';
    playing: boolean;
}> | Readonly<{
    type: 'destroy';
}>;
export type RemuxLifecycleDecision = Readonly<{
    state: RemuxLifecycle;
    accepted?: boolean;
    error?: string;
    aborted?: boolean;
    restartId?: number;
    generation?: number;
    retry?: boolean;
    recoveryId?: number;
    report?: boolean;
}>;
export declare function initialRemuxLifecycle(): RemuxLifecycle;
export declare function remuxGenerationCurrent(state: RemuxLifecycle, generation: number): boolean;
export declare function remuxRestartCurrent(state: RemuxLifecycle, restartId: number): boolean;
export declare function remuxRecoveryCurrent(state: RemuxLifecycle, recoveryId: number): boolean;
export declare function remuxAcceptedGeneration(state: RemuxLifecycle): boolean;
export declare function transitionRemuxLifecycle(state: RemuxLifecycle, command: RemuxLifecycleCommand): RemuxLifecycleDecision;
export {};
