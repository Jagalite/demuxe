// SPDX-License-Identifier: Apache-2.0
/** Resource metadata authority. Values, callbacks, promises and clocks never enter this state. */
export type ResourcePhase = 'active' | 'releasing' | 'released' | 'failed' | 'detached';
export type ResourceMetadata = Readonly<{
    id: string;
    scopeKey: string;
    kind: string;
    ownership: 'owned' | 'borrowed';
    state: ResourcePhase;
}>;
export type ResourceLedgerLimits = Readonly<{
    maxResources: number;
    maxScopes: number;
    failureLimit: number;
    cleanupTimeoutMs: number;
}>;
export type ResourceCleanupFailure = Readonly<{
    id: string;
    scopeKey: string;
    kind: string;
    name: 'CleanupError' | 'CleanupTimeoutError' | 'CleanupSchedulerError';
    message: string;
}>;
export type ResourceLedgerState = Readonly<{
    limits: ResourceLedgerLimits;
    monotonic: boolean;
    resourceWatermark: number;
    scopeWatermark: number;
    registeredTotal: number;
    releasedTotal: number;
    disposed: boolean;
    resources: readonly ResourceMetadata[];
    scopes: readonly Readonly<{
        key: string;
        retired: boolean;
    }>[];
    failures: readonly ResourceCleanupFailure[];
    failureCount: number;
    timedOut: number;
    deadlineErrors: number;
    lateReleased: number;
    lateFailed: number;
}>;
export type ResourceLedgerInput = Readonly<{
    type: 'register';
    id: string;
    scopeKey: string;
    kind: string;
    ownership: 'owned' | 'borrowed';
}> | Readonly<{
    type: 'release';
    id: string;
    expectedScopeKey?: string;
}> | Readonly<{
    type: 'retire-scope';
    scopeKey: string;
}> | Readonly<{
    type: 'dispose';
}> | Readonly<{
    type: 'deadline';
    id: string;
    reason: 'timeout' | 'scheduler';
}> | Readonly<{
    type: 'physical-result';
    id: string;
    success: boolean;
}>;
export type ResourceLedgerRejection = 'invalid-id' | 'invalid-scope' | 'invalid-kind' | 'invalid-ownership' | 'duplicate' | 'resource-capacity' | 'scope-capacity' | 'missing' | 'scope-mismatch';
export type ResourceLedgerDecision = Readonly<{
    state: ResourceLedgerState;
    accepted: boolean;
    reason?: ResourceLedgerRejection;
    start?: boolean;
    late?: boolean;
    ids?: readonly string[];
    scopeKeys?: readonly string[];
}>;
export declare function createResourceLedger(options?: Partial<ResourceLedgerLimits> & {
    monotonic?: boolean;
}): ResourceLedgerState;
export declare function resourceMetadata(state: ResourceLedgerState, id: string): ResourceMetadata | undefined;
export declare function resourceScopeRetired(state: ResourceLedgerState, key: string): boolean;
export declare function resourceAvailable(state: ResourceLedgerState, id: string): boolean;
export declare function transitionResourceLedger(state: ResourceLedgerState, input: ResourceLedgerInput): ResourceLedgerDecision;
export declare function resourceLedgerDiagnostics(state: ResourceLedgerState): Readonly<{
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
        state: ResourcePhase;
    }>[];
    failures: readonly Readonly<{
        id: string;
        scopeKey: string;
        kind: string;
        name: "CleanupError" | "CleanupTimeoutError" | "CleanupSchedulerError";
        message: string;
    }>[];
}>;
