// SPDX-License-Identifier: Apache-2.0
export function createEffectRuntimeState(limit = 32) {
    if (!Number.isSafeInteger(limit) || limit < 1)
        throw new Error('Invalid pending effect limit');
    return Object.freeze({ highWatermark: 0, disposed: false, limit, pending: Object.freeze([]) });
}
export function effectRuntimeWork(state, id) { return state.pending.find(work => work.effect.id === id); }
function copyEffect(input) {
    const scope = Object.freeze({ owner: input.scope.owner, lifetime: input.scope.lifetime, sourceId: input.scope.sourceId, sessionId: input.scope.sessionId, operationId: input.scope.operationId, ...input.scope.playId !== undefined ? { playId: input.scope.playId } : {} });
    const identity = { id: input.id, scope, lane: input.lane };
    return input.kind === 'timer.wait' ? Object.freeze({ ...identity, kind: input.kind, deadlineMs: input.deadlineMs }) : Object.freeze({ ...identity, kind: input.kind, resourceId: input.resourceId });
}
function outcome(effect, kind, scheduling = false) {
    const identity = { id: effect.id, scope: effect.scope };
    return kind === 'failed' ? Object.freeze({ ...identity, kind, error: Object.freeze({ code: 'EFFECT_FAILED', message: scheduling ? 'Effect scheduling failed' : 'Effect execution failed' }) }) : Object.freeze({ ...identity, kind });
}
function unchanged(state) { return Object.freeze({ state, accepted: false, outcomes: Object.freeze([]) }); }
function complete(state, work, kind, scheduling = false) {
    return Object.freeze({ state: Object.freeze({ ...state, pending: Object.freeze(state.pending.filter(item => item !== work)) }), accepted: true, outcomes: Object.freeze([outcome(work.effect, kind, scheduling)]) });
}
/** Data-only lifecycle authority. The shell samples current scope and registry
 * retirement before dispatch; this reducer commits before any physical callback. */
export function transitionEffectRuntime(state, input) {
    if (input.type === 'admit') {
        if (!Number.isSafeInteger(input.effect.id) || input.effect.id <= state.highWatermark)
            return Object.freeze({ ...unchanged(state), reason: 'identity' });
        const next = Object.freeze({ ...state, highWatermark: input.effect.id });
        // Rejected capacity/disposal admissions still consume monotonically issued IDs.
        if (state.disposed || state.pending.length >= state.limit)
            return Object.freeze({ ...unchanged(next), reason: state.disposed ? 'disposed' : 'capacity' });
        return Object.freeze({ state: Object.freeze({ ...next, pending: Object.freeze([...state.pending, Object.freeze({ effect: copyEffect(input.effect), phase: 'queued' })]) }), accepted: true, outcomes: Object.freeze([]) });
    }
    if (input.type === 'dispose') {
        if (state.disposed)
            return unchanged(state);
        return Object.freeze({ state: Object.freeze({ ...state, disposed: true, pending: Object.freeze([]) }), accepted: true, outcomes: Object.freeze(state.pending.map(work => outcome(work.effect, 'retired'))) });
    }
    const work = effectRuntimeWork(state, input.id);
    if (!work)
        return unchanged(state);
    if (input.type === 'start') {
        if (work.phase !== 'queued')
            return unchanged(state);
        if (!input.current && !(work.effect.kind === 'resource.release' && input.retiredCleanup))
            return complete(state, work, 'retired');
        const started = Object.freeze({ ...work, phase: 'started' });
        return Object.freeze({ state: Object.freeze({ ...state, pending: Object.freeze(state.pending.map(item => item === work ? started : item)) }), accepted: true, execute: work.effect, outcomes: Object.freeze([]) });
    }
    if (input.type === 'retire')
        return !input.current && !(work.effect.kind === 'resource.release' && input.retiredCleanup) ? complete(state, work, 'retired') : unchanged(state);
    if (input.type === 'schedule-failed')
        return work.phase === 'queued' ? complete(state, work, 'failed', true) : unchanged(state);
    return work.phase === 'started' ? complete(state, work, !input.current ? 'retired' : input.success ? 'completed' : 'failed') : unchanged(state);
}
