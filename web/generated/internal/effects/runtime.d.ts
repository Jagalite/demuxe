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
/** Shell interpreter for the first, deliberately small effect vocabulary.
 * Not wired into Player. No routing/selection decisions belong in this class.
 */
export declare class EffectRuntime {
    private readonly options;
    private highWatermark;
    private pending;
    private disposed;
    private readonly limit;
    constructor(options: EffectRuntimeOptions);
    get pendingCount(): number;
    submit(input: Effect): Promise<EffectOutcome>;
    /** Logical retirement settles callers even if an external operation ignores abort. */
    retireStale(): void;
    dispose(): void;
    private retiredCleanup;
    private current;
    private execute;
    private finish;
}
