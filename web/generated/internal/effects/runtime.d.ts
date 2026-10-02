// SPDX-License-Identifier: Apache-2.0
import { type Effect, type EffectOutcome, type EffectScope } from '../machine/protocol.js';
import { ResourceRegistry } from './resources.js';
export type EffectRuntimeOptions = {
    resources: ResourceRegistry;
    isCurrent: (scope: EffectScope) => boolean;
    now: () => number;
    schedule: (work: () => void) => () => void;
    waitUntil: (deadlineMs: number, signal: AbortSignal) => Promise<void>;
    onOutcome?: (outcome: EffectOutcome) => void;
    onObserverError?: (error: unknown) => void;
    maxPending?: number;
};
/** Host interpreter for the deliberately small effect vocabulary. Not wired into
 * Player. machine/effect-runtime owns admission, execution and settlement state. */
export declare class EffectRuntime {
    private readonly options;
    private state;
    private readonly handles;
    constructor(options: EffectRuntimeOptions);
    get pendingCount(): number;
    private transition;
    submit(input: Effect): Promise<EffectOutcome>;
    /** Logical retirement settles callers even if an external operation ignores abort. */
    retireStale(): void;
    dispose(): void;
    private retiredCleanup;
    private current;
    private execute;
    private finish;
    private observerError;
    private deliver;
}
