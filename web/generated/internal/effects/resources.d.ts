// SPDX-License-Identifier: Apache-2.0
import { type ResourceLedgerState, type ResourceLedgerInput, type ResourceLedgerDecision } from '../machine/resource-ledger.js';
export type ResourceRegistration<T> = Readonly<{
    id: string;
    scopeKey: string;
    kind: string;
    value: T;
}> & (Readonly<{
    ownership: 'owned';
    release: (value: T) => void | Promise<void>;
}> | Readonly<{
    ownership: 'borrowed';
    release?: never;
}>);
export type ResourceRegistryOptions = Readonly<{
    store?: Readonly<{
        read: () => ResourceLedgerState;
        dispatch: (input: ResourceLedgerInput) => ResourceLedgerDecision;
    }>;
    monotonic?: boolean;
    maxResources?: number;
    maxScopes?: number;
    failureLimit?: number;
    cleanupTimeoutMs?: number;
    scheduleCleanupTimeout?: (work: () => void, delayMs: number) => () => void;
}>;
/** Host handle interpreter. Pure resource-ledger owns admission, lifetime
 * retirement, cleanup phases, bounded tombstones and diagnostic accounting.
 * IDs and scopes cannot be reused within one owner lifetime. Rejected admission
 * leaves values caller-owned. Retirement covers resources present when it starts;
 * later registrations release immediately through their own completion promise.
 * Release callbacks must not await their own release or enclosing retirement.
 * A deadline detaches logical waiting; only a physical result proves release. */
export declare class ResourceRegistry {
    private localLedger?;
    private readonly store;
    private get ledger();
    private readonly handles;
    private readonly completions;
    private readonly scopes;
    private disposal?;
    private readonly scheduleCleanupTimeout;
    constructor(options?: ResourceRegistryOptions);
    private transition;
    register<T>(registration: ResourceRegistration<T>): Promise<void>;
    get<T = unknown>(id: string, expectedScopeKey?: string): T;
    isScopeRetired(scopeKey: string): boolean;
    release(id: string, expectedScopeKey?: string): Promise<void>;
    retireScope(scopeKey: string): Promise<void>;
    dispose(): Promise<void>;
    get diagnostics(): Readonly<{
        disposed: boolean;
        registered: number;
        active: number;
        retiring: number;
        releasing: number;
        released: number;
        detached: number;
        failed: number;
        timedOut: number;
        deadlineErrors: number;
        lateReleased: number;
        lateFailed: number;
        scopes: number;
        retiredScopes: number;
        limits: Readonly<{
            maxResources: number;
            maxScopes: number;
            failureLimit: number;
            cleanupTimeoutMs: number;
        }>;
        resources: readonly Readonly<{
            id: string;
            scopeKey: string;
            kind: string;
            ownership: "owned" | "borrowed";
            state: import("../machine/resource-ledger.js").ResourcePhase;
        }>[];
        failures: readonly Readonly<{
            id: string;
            scopeKey: string;
            kind: string;
            name: "CleanupError" | "CleanupTimeoutError" | "CleanupSchedulerError";
            message: string;
        }>[];
    }>;
    private releaseEntries;
}
