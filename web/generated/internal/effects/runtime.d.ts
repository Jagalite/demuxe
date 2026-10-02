// SPDX-License-Identifier: Apache-2.0
import { type Effect, type EffectOutcome, type EffectScope } from '../machine/protocol.js';
import { type EffectRuntimeState, type EffectRuntimeInput, type EffectRuntimeDecision } from '../machine/effect-runtime.js';
import { ResourceRegistry } from './resources.js';
export type EffectRuntimeOptions = {
    store?: Readonly<{
        read: () => EffectRuntimeState;
        dispatch: (input: EffectRuntimeInput) => EffectRuntimeDecision;
    }>;
    scopeKey?: (scope: EffectScope) => string;
    resources: ResourceRegistry;
    isCurrent: (scope: EffectScope) => boolean;
    now: () => number;
    schedule: (work: () => void) => () => void;
    waitUntil: (deadlineMs: number, signal: AbortSignal) => Promise<void>;
    onOutcome?: (outcome: EffectOutcome, physicalError?: unknown) => void;
    onObserverError?: (error: unknown) => void;
    maxPending?: number;
};
/** Host interpreter for typed effects. The enclosing Player can compose the
 * pure execution owner through the store port; physical handles remain here. */
export declare class EffectRuntime {
    private readonly options;
    private localState?;
    private get state();
    private readonly handles;
    constructor(options: EffectRuntimeOptions);
    get pendingCount(): number;
    private transition;
    submit(input: Effect, options?: Readonly<{
        rethrowImmediate?: boolean;
    }>): Promise<EffectOutcome>;
    /** Logical retirement settles callers even if an external operation ignores abort. */
    retireStale(): void;
    dispose(): void;
    private scopeKey;
    /** Deliver outcomes already committed by an enclosing composed owner. */
    deliverOutcomes(outcomes: readonly EffectOutcome[]): void;
    private retiredCleanup;
    private current;
    private execute;
    private finish;
    private observerError;
    private deliver;
}
