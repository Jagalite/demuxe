// SPDX-License-Identifier: Apache-2.0
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
    /** Lifetime admission limits, including released IDs and retired scopes. */
    maxResources?: number;
    maxScopes?: number;
    /** Recent cleanup summaries retained in addition to the total failure count. */
    failureLimit?: number;
    /** Logical cleanup containment; expiration never proves physical release. */
    cleanupTimeoutMs?: number;
    /** Injectable for deterministic tests. Must return a cancellation function. */
    scheduleCleanupTimeout?: (work: () => void, delayMs: number) => () => void;
}>;
type ResourceState = 'active' | 'releasing' | 'released' | 'failed' | 'detached';
/** Shell-only resource ownership. Pure transitions carry these opaque IDs.
 *
 * Use one registry per owner lifetime. Resource IDs and scope keys cannot be
 * reused; bounded tombstones prevent late completions from reviving retired
 * scopes. Admission failure leaves the value caller-owned, including duplicate
 * registration. Configure lifetime capacity before accepting work. Never rotate
 * a registry while the former owner can still produce completions.
 *
 * Release callbacks must not await their own release or enclosing retirement.
 * Retirement waits for resources present when it begins; subsequent registration
 * is immediately released and reports its cleanup through register's promise.
 */
export declare class ResourceRegistry {
    private readonly resources;
    private readonly scopes;
    private readonly failures;
    private readonly maxResources;
    private readonly maxScopes;
    private readonly failureLimit;
    private readonly cleanupTimeoutMs;
    private readonly scheduleCleanupTimeout;
    private failureCount;
    private timeoutCount;
    private lateReleased;
    private lateFailed;
    private disposed;
    private disposal?;
    constructor(options?: ResourceRegistryOptions);
    /** Acceptance is synchronous; only cleanup of a late registration is async.
     * A thrown validation/admission error has not transferred ownership. */
    register<T>(registration: ResourceRegistration<T>): Promise<void>;
    /** Lookups fail closed; an optional scope check prevents cross-owner access. */
    get<T = unknown>(id: string, expectedScopeKey?: string): T;
    /** Observational only: querying an unknown scope never reserves capacity. */
    isScopeRetired(scopeKey: string): boolean;
    /** Releases owned values once; borrowed values are only forgotten. */
    release(id: string, expectedScopeKey?: string): Promise<void>;
    /** Invalidate the entire scope before the first callback, then unwind in
     * reverse acquisition order. One failure does not skip remaining cleanup. */
    retireScope(scopeKey: string): Promise<void>;
    /** Retire all scopes synchronously before starting teardown. Later accepted
     * registrations still release immediately, within the lifetime capacity. */
    dispose(): Promise<void>;
    /** Metadata only: no values, callback functions or original error objects. */
    get diagnostics(): Readonly<{
        disposed: boolean;
        registered: number;
        active: number;
        retiring: number;
        releasing: number;
        released: number;
        detached: number;
        timedOut: number;
        lateReleased: number;
        lateFailed: number;
        failed: number;
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
            ownership: "borrowed" | "owned";
            state: ResourceState;
        }>[];
        failures: readonly Readonly<{
            id: string;
            scopeKey: string;
            kind: string;
            name: string;
            message: string;
        }>[];
    }>;
    private scope;
    private releaseEntries;
    private recordFailure;
}
export {};
