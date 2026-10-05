// SPDX-License-Identifier: Apache-2.0
const budgets = Object.freeze({ initialization: 60000, retirement: 10000, 'io-open': 20000, 'io-close': 1500, decoder: 5000, 'private-output': 25000, 'preview-media': 1500, threads: 2000 });
export function beginWait(id, now, kind) { return Object.freeze({ id, deadline: now + budgets[kind], phase: 'waiting' }); }
export function observeWait(state, event) {
    if (event.id !== state.id || state.phase !== 'waiting')
        return state;
    if (event.kind === 'retire')
        return Object.freeze({ ...state, phase: 'retired' });
    if (event.kind === 'deadline' && event.now < state.deadline)
        return state;
    return Object.freeze({ ...state, phase: event.now >= state.deadline ? 'timeout' : event.kind === 'ready' ? 'ready' : 'failed' });
}
export function beginAttempts(count) { return Object.freeze({ count, index: 0, phase: count > 0 ? 'trying' : 'exhausted', deferred: false }); }
export function observeAttempt(state, index, outcome) {
    if (state.phase !== 'trying' || state.index !== index)
        return state;
    if (outcome === 'accept' || outcome === 'retire')
        return Object.freeze({ ...state, phase: outcome === 'accept' ? 'accepted' : 'retired' });
    const next = index + 1;
    return Object.freeze({ ...state, index: next, phase: next < state.count ? 'trying' : 'exhausted', deferred: state.deferred || outcome === 'defer' });
}
