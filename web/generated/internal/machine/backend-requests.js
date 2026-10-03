// SPDX-License-Identifier: Apache-2.0
export function createBackendRequests(profile) { return Object.freeze({ profile, phase: 'active', failed: false, nextId: 1, pending: Object.freeze([]) }); }
export function admitBackendRequest(state, op, now) {
    const reject = (reason) => Object.freeze({ state, effect: Object.freeze({ kind: 'reject', reason }) });
    if (state.phase === 'closed')
        return reject('closed');
    if (op !== 'close') {
        if (state.phase !== 'active')
            return reject('closed');
        if (state.failed)
            return reject('failed');
        if (state.pending.length >= 128 || !Number.isSafeInteger(state.nextId) || state.nextId >= Number.MAX_SAFE_INTEGER)
            return reject('capacity');
    }
    if (op === 'close' && state.pending.some(request => request.op === 'close'))
        return reject('closed');
    const id = op === 'close' && (!Number.isSafeInteger(state.nextId) || state.nextId >= Number.MAX_SAFE_INTEGER) ? 0 : state.nextId;
    const timeout = state.profile === 'subtitles' ? 25000 : state.profile === 'software' ? (op === 'init' ? 60000 : op === 'close' ? 2000 : 25000) : (op === 'close' ? 1500 : 15000);
    const request = Object.freeze({ id, op, deadline: now + timeout });
    return Object.freeze({ state: Object.freeze({ ...state, nextId: id === 0 ? state.nextId : state.nextId + 1, pending: Object.freeze([...state.pending, request]) }), effect: Object.freeze({ kind: 'send', request }) });
}
export function settleBackendRequest(state, id, event) {
    const request = state.pending.find(request => request.id === id);
    if (!request || event.kind === 'deadline' && event.now < request.deadline)
        return Object.freeze({ state, effect: Object.freeze({ kind: 'ignore' }) });
    return Object.freeze({ state: Object.freeze({ ...state, pending: Object.freeze(state.pending.filter(request => request.id !== id)) }), effect: Object.freeze({ kind: 'settle', request, fatal: event.kind === 'deadline' && state.profile !== 'software' }) });
}
export function failBackendRequests(state) {
    if (state.failed || state.phase !== 'active')
        return Object.freeze({ state, reject: Object.freeze([]), notify: false });
    return Object.freeze({ state: Object.freeze({ ...state, failed: true, pending: Object.freeze([]) }), reject: Object.freeze(state.pending.map(request => request.id)), notify: true });
}
/** Closing blocks new ordinary requests while existing replies and the cleanup
 * request retain their original settlement/deadline semantics. */
export function beginBackendClose(state) { return state.phase === 'active' ? Object.freeze({ ...state, phase: 'closing' }) : state; }
export function finishBackendClose(state) {
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'closed', pending: Object.freeze([]) }), reject: Object.freeze(state.pending.map(request => request.id)) });
}
