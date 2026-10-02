// SPDX-License-Identifier: Apache-2.0
export type ResourceRegistration<T> = Readonly<{
  id: string;
  scopeKey: string;
  kind: string;
  value: T;
}> & (
  | Readonly<{ownership: 'owned'; release: (value: T) => void | Promise<void>}>
  | Readonly<{ownership: 'borrowed'; release?: never}>
);

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
type ResourceRecord = {
  id: string;
  scopeKey: string;
  kind: string;
  ownership: 'owned' | 'borrowed';
  state: ResourceState;
  value?: unknown;
  release?: (value: unknown) => void | Promise<void>;
  completion?: Promise<void>;
};
type Scope = {retired: boolean; completion?: Promise<void>};
type CleanupFailure = Readonly<{
  id: string;
  scopeKey: string;
  kind: string;
  name: string;
  message: string;
}>;

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {resolve = yes; reject = no;});
  // Cleanup remains observable through the returned promise and diagnostics even
  // when a caller observes a later retirement promise instead of this operation.
  void promise.catch(() => {});
  return {promise, resolve, reject};
}

function identifier(value: string, label: string) {
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
  private readonly resources = new Map<string, ResourceRecord>();
  private readonly scopes = new Map<string, Scope>();
  private readonly failures: CleanupFailure[] = [];
  private readonly maxResources: number;
  private readonly maxScopes: number;
  private readonly failureLimit: number;
  private readonly cleanupTimeoutMs: number;
  private readonly scheduleCleanupTimeout: (work: () => void, delayMs: number) => () => void;
  private failureCount = 0;
  private timeoutCount = 0;
  private lateReleased = 0;
  private lateFailed = 0;
  private disposed = false;
  private disposal?: Promise<void>;

  constructor(options: ResourceRegistryOptions = {}) {
    this.maxResources = options.maxResources ?? 1024;
    this.maxScopes = options.maxScopes ?? 256;
    this.failureLimit = options.failureLimit ?? 32;
    this.cleanupTimeoutMs = options.cleanupTimeoutMs ?? 5000;
    if (!Number.isFinite(this.cleanupTimeoutMs) || this.cleanupTimeoutMs < 1 || this.cleanupTimeoutMs > 60000) throw new RangeError('Invalid resource registry cleanup deadline');
    this.scheduleCleanupTimeout = options.scheduleCleanupTimeout ?? ((work, delayMs) => {
      const timer = setTimeout(work, delayMs); return () => clearTimeout(timer);
    });
    for (const [name, value] of Object.entries({maxResources: this.maxResources, maxScopes: this.maxScopes, failureLimit: this.failureLimit})) {
      if (!Number.isSafeInteger(value) || value < (name === 'failureLimit' ? 0 : 1)) throw new RangeError(`Invalid resource registry ${name}`);
    }
  }

  /** Acceptance is synchronous; only cleanup of a late registration is async.
   * A thrown validation/admission error has not transferred ownership. */
  register<T>(registration: ResourceRegistration<T>): Promise<void> {
    identifier(registration.id, 'Resource ID');
    identifier(registration.scopeKey, 'Scope key');
    identifier(registration.kind, 'Resource kind');
    if (registration.ownership !== 'owned' && registration.ownership !== 'borrowed') throw new TypeError('Invalid resource ownership');
    if (registration.ownership === 'owned' && typeof registration.release !== 'function') throw new TypeError('Owned resources require a release callback');
    if (registration.ownership === 'borrowed' && registration.release !== undefined) throw new TypeError('Borrowed resources cannot have a release callback');
    if (this.resources.has(registration.id)) throw new Error('Resource ID was already registered');
    if (this.resources.size >= this.maxResources) throw new RangeError('Resource registry lifetime resource capacity exceeded');
    const scope = this.scope(registration.scopeKey);
    const entry: ResourceRecord = {
      id: registration.id, scopeKey: registration.scopeKey, kind: registration.kind,
      ownership: registration.ownership, state: 'active', value: registration.value,
      release: registration.ownership === 'owned' ? registration.release as (value: unknown) => void | Promise<void> : undefined,
    };
    this.resources.set(entry.id, entry);
    return scope.retired || this.disposed ? this.release(entry.id) : Promise.resolve();
  }

  /** Lookups fail closed; an optional scope check prevents cross-owner access. */
  get<T = unknown>(id: string, expectedScopeKey?: string): T {
    const entry = this.resources.get(id);
    if (!entry || expectedScopeKey !== undefined && entry.scopeKey !== expectedScopeKey) throw new Error('Resource is missing or belongs to another scope');
    if (entry.state !== 'active' || this.disposed || this.scopes.get(entry.scopeKey)?.retired) throw new Error('Resource is retired or released');
    return entry.value as T;
  }

  /** Observational only: querying an unknown scope never reserves capacity. */
  isScopeRetired(scopeKey: string): boolean {
    return this.disposed || this.scopes.get(scopeKey)?.retired === true;
  }

  /** Releases owned values once; borrowed values are only forgotten. */
  release(id: string, expectedScopeKey?: string): Promise<void> {
    const entry = this.resources.get(id);
    if (!entry || expectedScopeKey !== undefined && entry.scopeKey !== expectedScopeKey) return Promise.reject(new Error('Resource is missing or belongs to another scope'));
    if (entry.completion) return entry.completion;
    const completion = deferred();
    entry.completion = completion.promise;
    entry.state = 'releasing';
    const value = entry.value, release = entry.release;
    delete entry.value;
    delete entry.release;
    if (entry.ownership === 'borrowed') {entry.state = 'released'; completion.resolve();}
    else {
      let settled = false, physicalSettled = false, cancelDeadline: (() => void) | undefined;
      const cancel = () => {try {cancelDeadline?.();} catch {/* Cancellation cannot change retirement. */} cancelDeadline = undefined;};
      const detach = () => {
        if (settled) return;
        settled = true; entry.state = 'detached'; this.timeoutCount++;
        cancel(); this.recordFailure(entry, true);
        const error = new Error('Resource cleanup exceeded its deadline'); error.name = 'CleanupTimeoutError';
        completion.reject(error);
      };
      const finish = (success: boolean, error?: unknown) => {
        if (physicalSettled) return; physicalSettled = true; cancel();
        if (settled) {
          // A late physical result is observed, but cannot replace the timeout
          // promise or cause the release callback to execute a second time.
          if (success) {entry.state = 'released'; this.lateReleased++;}
          else {entry.state = 'failed'; this.lateFailed++;}
          return;
        }
        settled = true; entry.state = success ? 'released' : 'failed';
        if (success) completion.resolve();
        else {this.recordFailure(entry); completion.reject(error);}
      };
      try {
        const cancellation = this.scheduleCleanupTimeout(detach, this.cleanupTimeoutMs);
        if (typeof cancellation !== 'function') throw new Error('Invalid cleanup scheduler');
        cancelDeadline = cancellation; if (settled) cancel();
      } catch {detach();}
      try {Promise.resolve(release!(value)).then(() => finish(true), error => finish(false, error));}
      catch (error) {finish(false, error);}
    }
    return completion.promise;
  }

  /** Invalidate the entire scope before the first callback, then unwind in
   * reverse acquisition order. One failure does not skip remaining cleanup. */
  retireScope(scopeKey: string): Promise<void> {
    identifier(scopeKey, 'Scope key');
    const scope = this.scope(scopeKey);
    if (scope.completion) return scope.completion;
    scope.retired = true;
    const completion = deferred();
    scope.completion = completion.promise;
    const entries = [...this.resources.values()].filter(entry => entry.scopeKey === scopeKey).reverse();
    void this.releaseEntries(entries).then(completion.resolve, completion.reject);
    return completion.promise;
  }

  /** Retire all scopes synchronously before starting teardown. Later accepted
   * registrations still release immediately, within the lifetime capacity. */
  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.disposed = true;
    for (const scope of this.scopes.values()) scope.retired = true;
    const completion = deferred();
    this.disposal = completion.promise;
    const scopes = [...this.scopes.keys()].reverse();
    void (async () => {
      const failures: unknown[] = [];
      for (const scope of scopes) {
        try {await this.retireScope(scope);}
        catch (error) {failures.push(error);}
      }
      if (failures.length) throw new AggregateError(failures, 'Resource registry cleanup failed');
    })().then(completion.resolve, completion.reject);
    return completion.promise;
  }

  /** Metadata only: no values, callback functions or original error objects. */
  get diagnostics() {
    const entries = [...this.resources.values()].map(({id, scopeKey, kind, ownership, state}) => Object.freeze({id, scopeKey, kind, ownership, state}));
    return Object.freeze({
      disposed: this.disposed,
      registered: entries.length,
      active: entries.filter(entry => entry.state === 'active' && !this.disposed && !this.scopes.get(entry.scopeKey)?.retired).length,
      retiring: entries.filter(entry => entry.state === 'active' && (this.disposed || this.scopes.get(entry.scopeKey)?.retired)).length,
      releasing: entries.filter(entry => entry.state === 'releasing').length,
      released: entries.filter(entry => entry.state === 'released').length,
      detached: entries.filter(entry => entry.state === 'detached').length,
      timedOut: this.timeoutCount,
      lateReleased: this.lateReleased,
      lateFailed: this.lateFailed,
      failed: this.failureCount,
      scopes: this.scopes.size,
      retiredScopes: [...this.scopes.values()].filter(scope => scope.retired).length,
      limits: Object.freeze({maxResources: this.maxResources, maxScopes: this.maxScopes, failureLimit: this.failureLimit, cleanupTimeoutMs: this.cleanupTimeoutMs}),
      resources: Object.freeze(entries),
      failures: Object.freeze([...this.failures]),
    });
  }

  private scope(key: string): Scope {
    const existing = this.scopes.get(key);
    if (existing) return existing;
    if (this.scopes.size >= this.maxScopes) throw new RangeError('Resource registry lifetime scope capacity exceeded');
    const scope: Scope = {retired: this.disposed};
    this.scopes.set(key, scope);
    return scope;
  }

  private async releaseEntries(entries: readonly ResourceRecord[]) {
    const failures: unknown[] = [];
    for (const entry of entries) {
      try {await this.release(entry.id);}
      catch (error) {failures.push(error);}
    }
    if (failures.length) throw new AggregateError(failures, 'Resource scope cleanup failed');
  }

  private recordFailure(entry: ResourceRecord, timedOut = false) {
    this.failureCount++;
    if (!this.failureLimit) return;
    // Host errors can contain credentials, private URLs or throwing accessors.
    // Preserve raw failures only in the rejected cleanup promise, never here.
    this.failures.push(Object.freeze({
      id: entry.id, scopeKey: entry.scopeKey, kind: entry.kind,
      name: timedOut ? 'CleanupTimeoutError' : 'CleanupError', message: timedOut ? 'Resource cleanup exceeded its deadline' : 'Resource cleanup failed',
    }));
    if (this.failures.length > this.failureLimit) this.failures.shift();
  }
}
