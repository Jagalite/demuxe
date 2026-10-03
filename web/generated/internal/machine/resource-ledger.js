// SPDX-License-Identifier: Apache-2.0
const valid = (value) => typeof value === 'string' && value.length > 0 && value.length <= 256;
const no = (state, reason) => Object.freeze({ state, accepted: false, reason });
const ok = (state, extra = {}) => Object.freeze({ state, ...extra, accepted: true });
export function createResourceLedger(options = {}) {
    const limits = Object.freeze({ maxResources: options.maxResources ?? 1024, maxScopes: options.maxScopes ?? 256, failureLimit: options.failureLimit ?? 32, cleanupTimeoutMs: options.cleanupTimeoutMs ?? 5000 });
    for (const [name, value] of Object.entries({ maxResources: limits.maxResources, maxScopes: limits.maxScopes, failureLimit: limits.failureLimit }))
        if (!Number.isSafeInteger(value) || value < (name === 'failureLimit' ? 0 : 1))
            throw new RangeError('Invalid resource registry capacity');
    if (!Number.isFinite(limits.cleanupTimeoutMs) || limits.cleanupTimeoutMs < 1 || limits.cleanupTimeoutMs > 60000)
        throw new RangeError('Invalid resource registry cleanup deadline');
    return Object.freeze({ limits, monotonic: options.monotonic === true, resourceWatermark: 0, scopeWatermark: 0, registeredTotal: 0, releasedTotal: 0, disposed: false, resources: Object.freeze([]), scopes: Object.freeze([]), failures: Object.freeze([]), failureCount: 0, timedOut: 0, deadlineErrors: 0, lateReleased: 0, lateFailed: 0 });
}
export function resourceMetadata(state, id) { return state.resources.find(entry => entry.id === id); }
export function resourceScopeRetired(state, key) { const scope = state.scopes.find(scope => scope.key === key); return state.disposed || !!scope?.retired || state.monotonic && !scope && sequence(key, 'scope') > 0 && sequence(key, 'scope') <= state.scopeWatermark; }
export function resourceAvailable(state, id) { const entry = resourceMetadata(state, id); return !!entry && entry.state === 'active' && !resourceScopeRetired(state, entry.scopeKey); }
function replace(state, entry, phase) {
    const next = Object.freeze({ ...entry, state: phase });
    return Object.freeze({ ...state, resources: Object.freeze(state.resources.map(item => item.id === entry.id ? next : item)) });
}
function failure(state, entry, reason) {
    const name = reason === 'timeout' ? 'CleanupTimeoutError' : reason === 'scheduler' ? 'CleanupSchedulerError' : 'CleanupError';
    const message = reason === 'timeout' ? 'Resource cleanup exceeded its deadline' : reason === 'scheduler' ? 'Resource cleanup deadline could not be scheduled' : 'Resource cleanup failed';
    const summary = Object.freeze({ id: entry.id, scopeKey: entry.scopeKey, kind: entry.kind, name, message });
    return Object.freeze({ ...state, failureCount: state.failureCount + 1, failures: state.limits.failureLimit ? Object.freeze([...state.failures, summary].slice(-state.limits.failureLimit)) : state.failures });
}
function sequence(value, prefix) { const token = new RegExp(`^${prefix}:([1-9][0-9]*)$`).exec(value); const id = token ? Number(token[1]) : 0; return Number.isSafeInteger(id) ? id : 0; }
/** Monotonic mode bounds live metadata, retaining non-reusable identities as
 * watermarks. Detached physical releases remain accounted until they settle. */
function compactLedger(state) {
    if (!state.monotonic)
        return state;
    const resources = state.resources.filter(entry => entry.state !== 'released' && entry.state !== 'failed');
    const scopes = state.scopes.filter(scope => !scope.retired || resources.some(entry => entry.scopeKey === scope.key));
    return resources.length === state.resources.length && scopes.length === state.scopes.length ? state : Object.freeze({ ...state, resources: Object.freeze(resources), scopes: Object.freeze(scopes) });
}
export function transitionResourceLedger(state, input) {
    const decision = reduceResourceLedger(state, input), next = compactLedger(decision.state);
    return next === decision.state ? decision : Object.freeze({ ...decision, state: next });
}
function reduceResourceLedger(state, input) {
    if (input.type === 'register' || input.type === 'reserve') {
        if (!valid(input.id) || state.monotonic && !sequence(input.id, 'resource'))
            return no(state, 'invalid-id');
        if (!valid(input.scopeKey) || state.monotonic && !sequence(input.scopeKey, 'scope'))
            return no(state, 'invalid-scope');
        if (!valid(input.kind))
            return no(state, 'invalid-kind');
        if (input.type === 'register' && input.ownership !== 'owned' && input.ownership !== 'borrowed')
            return no(state, 'invalid-ownership');
        if (resourceMetadata(state, input.id) || state.monotonic && sequence(input.id, 'resource') <= state.resourceWatermark)
            return no(state, 'duplicate');
        if (state.resources.length >= state.limits.maxResources)
            return no(state, 'resource-capacity');
        const existing = state.scopes.some(scope => scope.key === input.scopeKey), oldScope = state.monotonic && sequence(input.scopeKey, 'scope') <= state.scopeWatermark;
        if (!existing && !oldScope && state.scopes.length >= state.limits.maxScopes)
            return no(state, 'scope-capacity');
        if (input.type === 'reserve' && resourceScopeRetired(state, input.scopeKey))
            return no(state, 'retired');
        const entry = Object.freeze({ id: input.id, scopeKey: input.scopeKey, kind: input.kind, ownership: input.type === 'reserve' ? 'owned' : input.ownership, state: input.type === 'reserve' ? 'reserved' : 'active', ...(input.type === 'reserve' ? { acquired: false } : {}) });
        const scopes = existing || oldScope ? state.scopes : Object.freeze([...state.scopes, Object.freeze({ key: input.scopeKey, retired: state.disposed })]);
        return ok(Object.freeze({ ...state, scopes, registeredTotal: state.registeredTotal + 1, resourceWatermark: state.monotonic ? sequence(input.id, 'resource') : state.resourceWatermark, scopeWatermark: state.monotonic ? Math.max(state.scopeWatermark, sequence(input.scopeKey, 'scope')) : state.scopeWatermark, resources: Object.freeze([...state.resources, entry]) }));
    }
    if (input.type === 'retire-scope') {
        if (!valid(input.scopeKey) || state.monotonic && !sequence(input.scopeKey, 'scope'))
            return no(state, 'invalid-scope');
        const previous = state.scopes.find(scope => scope.key === input.scopeKey);
        if (!previous && !state.monotonic && state.scopes.length >= state.limits.maxScopes)
            return no(state, 'scope-capacity');
        const scopes = previous ? previous.retired ? state.scopes : Object.freeze(state.scopes.map(scope => scope.key === input.scopeKey ? Object.freeze({ ...scope, retired: true }) : scope)) : Object.freeze([...state.scopes, Object.freeze({ key: input.scopeKey, retired: true })]);
        return ok(scopes === state.scopes ? state : Object.freeze({ ...state, scopes, scopeWatermark: state.monotonic ? Math.max(state.scopeWatermark, sequence(input.scopeKey, 'scope')) : state.scopeWatermark }), { ids: Object.freeze(state.resources.filter(entry => entry.scopeKey === input.scopeKey).map(entry => entry.id).reverse()) });
    }
    if (input.type === 'dispose')
        return ok(state.disposed ? state : Object.freeze({ ...state, disposed: true, scopes: Object.freeze(state.scopes.map(scope => scope.retired ? scope : Object.freeze({ ...scope, retired: true }))) }), { scopeKeys: Object.freeze(state.scopes.map(scope => scope.key).reverse()) });
    const entry = resourceMetadata(state, input.id);
    if (!entry)
        return no(state, 'missing');
    if (input.type === 'acquire') {
        if (input.expectedScopeKey !== undefined && entry.scopeKey !== input.expectedScopeKey)
            return no(state, 'scope-mismatch');
        if (entry.acquired !== false)
            return no(state, 'already-acquired');
        const acquired = Object.freeze({ ...entry, acquired: true, state: entry.state === 'reserved' ? 'active' : entry.state });
        return ok(Object.freeze({ ...state, resources: Object.freeze(state.resources.map(value => value.id === entry.id ? acquired : value)) }));
    }
    if (input.type === 'release') {
        if (input.expectedScopeKey !== undefined && entry.scopeKey !== input.expectedScopeKey)
            return no(state, 'scope-mismatch');
        return entry.state === 'active' || entry.state === 'reserved' ? ok(replace(state, entry, 'releasing'), { start: true }) : ok(state, { start: false });
    }
    if (input.type === 'deadline') {
        if (entry.state !== 'releasing')
            return ok(state, { start: false });
        const next = failure(replace(state, entry, 'detached'), entry, input.reason);
        return ok(Object.freeze({ ...next, timedOut: next.timedOut + (input.reason === 'timeout' ? 1 : 0), deadlineErrors: next.deadlineErrors + (input.reason === 'scheduler' ? 1 : 0) }), { start: true });
    }
    if (entry.acquired === false || entry.state !== 'releasing' && entry.state !== 'detached')
        return ok(state, { start: false });
    const late = entry.state === 'detached';
    let next = replace(state, entry, input.success ? 'released' : 'failed');
    if (input.success)
        next = Object.freeze({ ...next, releasedTotal: next.releasedTotal + 1 });
    if (late)
        next = Object.freeze({ ...next, lateReleased: next.lateReleased + (input.success ? 1 : 0), lateFailed: next.lateFailed + (input.success ? 0 : 1) });
    else if (!input.success)
        next = failure(next, entry, 'physical');
    return ok(next, { start: true, late });
}
export function resourceLedgerDiagnostics(state) {
    return Object.freeze({ disposed: state.disposed, registered: state.registeredTotal,
        reserved: state.resources.filter(entry => entry.state === 'reserved').length,
        active: state.resources.filter(entry => resourceAvailable(state, entry.id)).length,
        retiring: state.resources.filter(entry => (entry.state === 'active' || entry.state === 'reserved') && resourceScopeRetired(state, entry.scopeKey)).length,
        releasing: state.resources.filter(entry => entry.state === 'releasing').length, released: state.releasedTotal,
        detached: state.resources.filter(entry => entry.state === 'detached').length, failed: state.failureCount, timedOut: state.timedOut, deadlineErrors: state.deadlineErrors, lateReleased: state.lateReleased, lateFailed: state.lateFailed,
        scopes: state.scopes.length, retiredScopes: state.scopes.filter(scope => scope.retired).length, limits: state.limits, resources: state.resources, failures: state.failures });
}
