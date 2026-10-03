// SPDX-License-Identifier: Apache-2.0
export function validatePlaybackRange(range, facts) {
    if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start)
        return Object.freeze({ reason: 'invalid', message: 'Invalid playback range' });
    if (!facts.hasBackend || !facts.seekable.some(window => range.start >= window.start && range.end <= window.end))
        return Object.freeze({ reason: 'unsupported', message: 'Range must fit in an observed seekable interval' });
}
export function rangeRequirement(kind, value, range, loop, facts) {
    if (kind === 'range') {
        if (value) {
            const rejection = validatePlaybackRange(value, facts);
            if (rejection)
                return Object.freeze({ rejection });
        }
        const next = value;
        if (next && typeof loop === 'object' && (loop.start < next.start || loop.end > next.end))
            return Object.freeze({ rejection: Object.freeze({ reason: 'invalid', message: 'Loop must fit in the playback range' }) });
    }
    else {
        if (typeof value === 'object') {
            const rejection = validatePlaybackRange(value, facts);
            if (rejection)
                return Object.freeze({ rejection });
            if (range && value && (value.start < range.start || value.end > range.end))
                return Object.freeze({ rejection: Object.freeze({ reason: 'invalid', message: 'Loop must fit in playback range' }) });
        }
        else if (typeof value !== 'boolean')
            return Object.freeze({ rejection: Object.freeze({ reason: 'invalid', message: 'Invalid loop policy' }) });
        if (value === true && !range) {
            if (facts.duration === null)
                return Object.freeze({ rejection: Object.freeze({ reason: 'unsupported', message: 'Whole-source looping requires finite duration' }) });
            const rejection = validatePlaybackRange({ start: 0, end: facts.duration }, facts);
            if (rejection)
                return Object.freeze({ rejection });
        }
    }
    const requested = typeof value === 'object' && value ? value : null;
    return Object.freeze(requested && (facts.time < requested.start || facts.time >= requested.end) ? { seek: requested.start } : {});
}
export function initialBoundary() { return Object.freeze({ serial: 0, pending: null }); }
export function boundaryAuthority(state, id) {
    const pending = state.boundary.pending;
    return !!pending && pending.id === id && !state.operations.terminal && pending.epoch === state.operations.epoch && pending.session === state.source.acceptedSession &&
        (pending.operation === null || state.operations.active === pending.operation && !state.operations.entries.some(entry => entry.id === pending.operation && entry.cancelled));
}
export function playbackBoundaryReached(state, time, duration, ended) {
    if (state.settings.pause || !state.preferences.loopPolicy && !state.preferences.playbackRange)
        return;
    const range = typeof state.preferences.loopPolicy === 'object' ? state.preferences.loopPolicy : state.preferences.playbackRange ?? { start: 0, end: duration ?? Infinity };
    if (ended || time >= range.end)
        return range;
}
/** Automatic boundary work shares the Player's operation/session authority.
 * Each completed physical step re-enters this transition before the next runs.
 * Finished work retains its lease until queue publication has completed. */
export function transitionBoundary(state, input) {
    const empty = Object.freeze([]);
    const result = (next, accepted, effects = empty, id) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next, revision: state.revision + 1 }), accepted, effects, id, retire: Object.freeze([]) });
    const set = (pending, effects = empty, paused = false) => result({ ...state, boundary: Object.freeze({ ...state.boundary, pending }), settings: paused ? Object.freeze({ ...state.settings, pause: true }) : state.settings }, true, Object.freeze([...effects]), pending?.id);
    if (input.type === 'boundary.sample') {
        if (state.operations.terminal || state.operations.active !== null || state.boundary.pending || state.source.acceptedSession === null || state.source.acceptedEpoch !== state.operations.epoch || !playbackBoundaryReached(state, input.time, input.duration, input.ended))
            return result(state, false);
        const id = state.boundary.serial + 1;
        return result({ ...state, boundary: Object.freeze({ serial: id, pending: Object.freeze({ id, epoch: state.operations.epoch, session: state.source.acceptedSession, operation: null, phase: 'queued', loop: false, position: 0 }) }) }, true, empty, id);
    }
    if (input.type === 'boundary.settled')
        return state.boundary.pending?.id === input.id ? set(null) : result(state, false);
    if (!boundaryAuthority(state, input.id))
        return result(state, false);
    const pending = state.boundary.pending;
    if (input.type === 'boundary.start') {
        if (pending.phase !== 'queued')
            return result(state, false);
        const range = playbackBoundaryReached(state, input.time, input.duration, input.ended);
        if (!range || state.operations.active === null)
            return set(Object.freeze({ ...pending, phase: 'finished' }));
        const loop = !!state.preferences.loopPolicy;
        return set(Object.freeze({ ...pending, phase: 'pausing', operation: state.operations.active, loop, position: loop ? range.start : range.end }), [{ kind: 'pause' }]);
    }
    if (input.type === 'boundary.failed')
        return set(null, [{ kind: 'pause' }], true);
    if (input.phase !== pending.phase)
        return result(state, false);
    switch (pending.phase) {
        case 'pausing': return set(Object.freeze({ ...pending, phase: 'seeking' }), [{ kind: 'seek', value: pending.position }], !pending.loop);
        case 'seeking': return set(Object.freeze({ ...pending, phase: 'verifying' }), [{ kind: 'seek.verify', value: pending.position }]);
        case 'verifying': return pending.loop ? set(Object.freeze({ ...pending, phase: 'resuming' }), [{ kind: 'play' }]) : set(Object.freeze({ ...pending, phase: 'finished' }));
        case 'resuming': return set(Object.freeze({ ...pending, phase: 'finished' }));
        case 'queued':
        case 'finished': return result(state, false);
    }
}
