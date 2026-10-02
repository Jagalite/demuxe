// SPDX-License-Identifier: Apache-2.0
import type { RemuxBufferState, RemuxBufferCommand, RemuxBufferDecision } from './remux-buffer.js';
import { transitionRemuxSchedule } from './remux-scheduling.js';
import type { RemuxSchedule, RemuxScheduleCommand, RemuxBuffering } from './remux-scheduling.js';
import type { RemuxNegotiation, RemuxNegotiationCommand, RemuxNegotiationDecision } from './remux-negotiation.js';
import type { RemuxOutput, RemuxOutputCommand, RemuxOutputDecision } from './remux-output.js';
type Recovery = Readonly<{
    id: number;
    sourceId: number;
    restartId: number;
}>;
export type RemuxLifecycle = Readonly<{
    buffer: RemuxBufferState;
    schedule: RemuxSchedule;
    negotiation: RemuxNegotiation;
    output: RemuxOutput;
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
    type: 'buffer';
    generation: number;
    command: RemuxBufferCommand;
}> | Readonly<{
    type: 'schedule';
    generation: number;
    command: RemuxScheduleCommand;
}> | Readonly<{
    type: 'buffering';
    policy: RemuxBuffering | undefined;
}> | Readonly<{
    type: 'negotiation';
    generation: number;
    command: RemuxNegotiationCommand;
}> | Readonly<{
    type: 'output';
    generation: number;
    command: RemuxOutputCommand;
}> | Readonly<{
    type: 'open';
    sourceChanged?: boolean;
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
    negotiation?: RemuxNegotiationDecision;
    output?: RemuxOutputDecision;
    buffer?: RemuxBufferDecision;
    schedule?: ReturnType<typeof transitionRemuxSchedule>;
}>;
export declare function initialRemuxLifecycle(): RemuxLifecycle;
export declare function remuxGenerationCurrent(state: RemuxLifecycle, generation: number): boolean;
export declare function remuxRestartCurrent(state: RemuxLifecycle, restartId: number): boolean;
export declare function remuxRecoveryCurrent(state: RemuxLifecycle, recoveryId: number): boolean;
export declare function remuxAcceptedGeneration(state: RemuxLifecycle): boolean;
export declare function transitionRemuxLifecycle(state: RemuxLifecycle, command: RemuxLifecycleCommand): RemuxLifecycleDecision;
export {};
