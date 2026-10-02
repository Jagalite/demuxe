// SPDX-License-Identifier: Apache-2.0
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    // Cleanup remains observable through the returned promise and diagnostics even
    // when a caller observes a later retirement promise instead of this operation.
    void promise.catch(() => { });
    return { promise, resolve, reject };
}
function identifier(value, label) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
        throw new TypeError(`${label} must be a nonempty string of at most 256 characters`);
    }
}
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
export class ResourceRegistry {
    resources = new Map();
    scopes = new Map();
    failures = [];
    maxResources;
    maxScopes;
    failureLimit;
    failureCount = 0;
    disposed = false;
    disposal;
    constructor(options = {}) {
        this.maxResources = options.maxResources ?? 1024;
        this.maxScopes = options.maxScopes ?? 256;
        this.failureLimit = options.failureLimit ?? 32;
        for (const [name, value] of Object.entries({ maxResources: this.maxResources, maxScopes: this.maxScopes, failureLimit: this.failureLimit })) {
            if (!Number.isSafeInteger(value) || value < (name === 'failureLimit' ? 0 : 1))
                throw new RangeError(`Invalid resource registry ${name}`);
        }
    }
    /** Acceptance is synchronous; only cleanup of a late registration is async.
     * A thrown validation/admission error has not transferred ownership. */
    register(registration) {
        identifier(registration.id, 'Resource ID');
        identifier(registration.scopeKey, 'Scope key');
        identifier(registration.kind, 'Resource kind');
        if (registration.ownership !== 'owned' && registration.ownership !== 'borrowed')
            throw new TypeError('Invalid resource ownership');
        if (registration.ownership === 'owned' && typeof registration.release !== 'function')
            throw new TypeError('Owned resources require a release callback');
        if (registration.ownership === 'borrowed' && registration.release !== undefined)
            throw new TypeError('Borrowed resources cannot have a release callback');
        if (this.resources.has(registration.id))
            throw new Error('Resource ID was already registered');
        if (this.resources.size >= this.maxResources)
            throw new RangeError('Resource registry lifetime resource capacity exceeded');
        const scope = this.scope(registration.scopeKey);
        const entry = {
            id: registration.id, scopeKey: registration.scopeKey, kind: registration.kind,
            ownership: registration.ownership, state: 'active', value: registration.value,
            release: registration.ownership === 'owned' ? registration.release : undefined,
        };
        this.resources.set(entry.id, entry);
        return scope.retired || this.disposed ? this.release(entry.id) : Promise.resolve();
    }
    /** Lookups fail closed; an optional scope check prevents cross-owner access. */
    get(id, expectedScopeKey) {
        const entry = this.resources.get(id);
        if (!entry || expectedScopeKey !== undefined && entry.scopeKey !== expectedScopeKey)
            throw new Error('Resource is missing or belongs to another scope');
        if (entry.state !== 'active' || this.disposed || this.scopes.get(entry.scopeKey)?.retired)
            throw new Error('Resource is retired or released');
        return entry.value;
    }
    /** Observational only: querying an unknown scope never reserves capacity. */
    isScopeRetired(scopeKey) {
        return this.disposed || this.scopes.get(scopeKey)?.retired === true;
    }
    /** Releases owned values once; borrowed values are only forgotten. */
    release(id, expectedScopeKey) {
        const entry = this.resources.get(id);
        if (!entry || expectedScopeKey !== undefined && entry.scopeKey !== expectedScopeKey)
            return Promise.reject(new Error('Resource is missing or belongs to another scope'));
        if (entry.completion)
            return entry.completion;
        const completion = deferred();
        entry.completion = completion.promise;
        entry.state = 'releasing';
        const value = entry.value, release = entry.release;
        delete entry.value;
        delete entry.release;
        const succeed = () => { entry.state = 'released'; completion.resolve(); };
        const fail = (error) => {
            entry.state = 'failed';
            this.recordFailure(entry);
            completion.reject(error);
        };
        if (entry.ownership === 'borrowed')
            succeed();
        else {
            try {
                Promise.resolve(release(value)).then(succeed, fail);
            }
            catch (error) {
                fail(error);
            }
        }
        return completion.promise;
    }
    /** Invalidate the entire scope before the first callback, then unwind in
     * reverse acquisition order. One failure does not skip remaining cleanup. */
    retireScope(scopeKey) {
        identifier(scopeKey, 'Scope key');
        const scope = this.scope(scopeKey);
        if (scope.completion)
            return scope.completion;
        scope.retired = true;
        const completion = deferred();
        scope.completion = completion.promise;
        const entries = [...this.resources.values()].filter(entry => entry.scopeKey === scopeKey).reverse();
        void this.releaseEntries(entries).then(completion.resolve, completion.reject);
        return completion.promise;
    }
    /** Retire all scopes synchronously before starting teardown. Later accepted
     * registrations still release immediately, within the lifetime capacity. */
    dispose() {
        if (this.disposal)
            return this.disposal;
        this.disposed = true;
        for (const scope of this.scopes.values())
            scope.retired = true;
        const completion = deferred();
        this.disposal = completion.promise;
        const scopes = [...this.scopes.keys()].reverse();
        void (async () => {
            const failures = [];
            for (const scope of scopes) {
                try {
                    await this.retireScope(scope);
                }
                catch (error) {
                    failures.push(error);
                }
            }
            if (failures.length)
                throw new AggregateError(failures, 'Resource registry cleanup failed');
        })().then(completion.resolve, completion.reject);
        return completion.promise;
    }
    /** Metadata only: no values, callback functions or original error objects. */
    get diagnostics() {
        const entries = [...this.resources.values()].map(({ id, scopeKey, kind, ownership, state }) => Object.freeze({ id, scopeKey, kind, ownership, state }));
        return Object.freeze({
            disposed: this.disposed,
            registered: entries.length,
            active: entries.filter(entry => entry.state === 'active' && !this.disposed && !this.scopes.get(entry.scopeKey)?.retired).length,
            retiring: entries.filter(entry => entry.state === 'active' && (this.disposed || this.scopes.get(entry.scopeKey)?.retired)).length,
            releasing: entries.filter(entry => entry.state === 'releasing').length,
            released: entries.filter(entry => entry.state === 'released').length,
            failed: this.failureCount,
            scopes: this.scopes.size,
            retiredScopes: [...this.scopes.values()].filter(scope => scope.retired).length,
            limits: Object.freeze({ maxResources: this.maxResources, maxScopes: this.maxScopes, failureLimit: this.failureLimit }),
            resources: Object.freeze(entries),
            failures: Object.freeze([...this.failures]),
        });
    }
    scope(key) {
        const existing = this.scopes.get(key);
        if (existing)
            return existing;
        if (this.scopes.size >= this.maxScopes)
            throw new RangeError('Resource registry lifetime scope capacity exceeded');
        const scope = { retired: this.disposed };
        this.scopes.set(key, scope);
        return scope;
    }
    async releaseEntries(entries) {
        const failures = [];
        for (const entry of entries) {
            try {
                await this.release(entry.id);
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (failures.length)
            throw new AggregateError(failures, 'Resource scope cleanup failed');
    }
    recordFailure(entry) {
        this.failureCount++;
        if (!this.failureLimit)
            return;
        // Host errors can contain credentials, private URLs or throwing accessors.
        // Preserve raw failures only in the rejected cleanup promise, never here.
        this.failures.push(Object.freeze({
            id: entry.id, scopeKey: entry.scopeKey, kind: entry.kind,
            name: 'CleanupError', message: 'Resource cleanup failed',
        }));
        if (this.failures.length > this.failureLimit)
            this.failures.shift();
    }
}
