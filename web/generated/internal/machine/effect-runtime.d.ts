// SPDX-License-Identifier: Apache-2.0
import type { Effect, EffectOutcome } from './protocol.js';
export type EffectRuntimeWork = Readonly<{
    effect: Effect;
    phase: 'queued' | 'started';
}>;
export type EffectRuntimeState = Readonly<{
    highWatermark: number;
    disposed: boolean;
    limit: number;
    pending: readonly EffectRuntimeWork[];
}>;
export type EffectRuntimeInput = Readonly<{
    type: 'admit';
    effect: Effect;
}> | Readonly<{
    type: 'start';
    id: number;
    current: boolean;
    retiredCleanup: boolean;
}> | Readonly<{
    type: 'physical-result';
    id: number;
    success: boolean;
    current: boolean;
}> | Readonly<{
    type: 'schedule-failed';
    id: number;
}> | Readonly<{
    type: 'retire';
    id: number;
    current: boolean;
    retiredCleanup: boolean;
}> | Readonly<{
    type: 'dispose';
}>;
export type EffectRuntimeDecision = Readonly<{
    state: EffectRuntimeState;
    accepted: boolean;
    reason?: 'identity' | 'disposed' | 'capacity';
    execute?: Effect;
    outcomes: readonly EffectOutcome[];
}>;
export declare function createEffectRuntimeState(limit?: number): EffectRuntimeState;
export declare function effectRuntimeWork(state: EffectRuntimeState, id: number): EffectRuntimeWork | undefined;
/** Data-only lifecycle authority. The shell samples current scope and registry
 * retirement before dispatch; this reducer commits before any physical callback. */
export declare function transitionEffectRuntime(state: EffectRuntimeState, input: EffectRuntimeInput): EffectRuntimeDecision;
