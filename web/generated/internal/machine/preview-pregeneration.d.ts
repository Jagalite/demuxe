// SPDX-License-Identifier: Apache-2.0
import type { PreviewPregeneration } from '../../types.js';
export type PregenerationRequest = Readonly<{
    time: number;
    width: number;
    height: number;
}>;
export type CustomPregeneration = {
    strategy: 'custom';
    intervalMs?: number;
};
export type AdaptivePregeneration = {
    strategy: 'adaptive';
    samples: number;
    every: number;
    radius: number;
};
export type PregenerationOutcome = 'next' | 'wait' | 'stop';
type Configuration = Readonly<{
    custom?: boolean;
    intervalMs: number;
    bucket: number;
    width: number;
    height: number;
    limit: number;
    step: number;
    samples?: number;
    sampleOrder?: readonly number[];
    times?: readonly number[];
    adaptive?: Readonly<{
        every: number;
        radius: number;
    }>;
}>;
type Run = Readonly<{
    id: number;
    epoch: number;
    broad: boolean;
    request: PregenerationRequest;
}>;
export type PregenerationState = Readonly<{
    config: Configuration;
    epoch: number;
    index: number;
    duration: number | null;
    enabled: boolean;
    finished: boolean;
    focus: number;
    visited: readonly number[];
    ticks: number;
    attempts: readonly Readonly<{
        key: number;
        retryAfter: number;
    }>[];
    serial: number;
    timer: number | null;
    running: Run | null;
}>;
export type PregenerationEvent = {
    kind: 'duration';
    duration: number | null;
} | {
    kind: 'enabled';
    enabled: boolean;
} | {
    kind: 'focus';
    time: number;
    resident?: readonly number[];
} | {
    kind: 'reset';
} | {
    kind: 'stop';
} | {
    kind: 'timer';
    id: number;
    candidates?: readonly number[];
} | {
    kind: 'completed';
    id: number;
    outcome: PregenerationOutcome;
};
export type PregenerationEffect = Readonly<{
    kind: 'schedule';
    id: number;
    delayMs: number;
}> | Readonly<{
    kind: 'cancel-timer';
    id: number;
}> | Readonly<{
    kind: 'run';
    id: number;
    request: PregenerationRequest;
}>;
export type PregenerationTransition = Readonly<{
    state: PregenerationState;
    effects: readonly PregenerationEffect[];
}>;
/** Config and scheduling are data; timers and provider promises remain in the shell. */
export declare function createPregeneration(config: PreviewPregeneration | AdaptivePregeneration | CustomPregeneration, bucket: number): PregenerationState;
export declare function transitionPregeneration(previous: PregenerationState, event: PregenerationEvent): PregenerationTransition;
export {};
