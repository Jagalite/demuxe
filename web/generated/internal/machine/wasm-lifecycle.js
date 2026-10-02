// SPDX-License-Identifier: Apache-2.0
export function createWasmLifecycle() { return Object.freeze({ phase: 'initializing', initSent: false, workerFailed: false, nextRequest: 100, nextWaiter: 1, nextOpen: 1, requests: Object.freeze([]), waiters: Object.freeze([]), open: null, hasFile: false }); }
export function wasmAlive(state) { return state.phase === 'initializing' || state.phase === 'ready'; }
export function markWasmInitialized(state) { return wasmAlive(state) ? Object.freeze({ ...state, initSent: true }) : state; }
export function settleWasmInitialization(state, success) { return state.phase === 'initializing' ? Object.freeze({ ...state, phase: success ? 'ready' : 'failed' }) : state; }
export function claimWasmWorkerFailure(state) {
    if (!wasmAlive(state) || state.workerFailed)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, workerFailed: true, phase: state.phase === 'initializing' ? 'failed' : state.phase }), accepted: true });
}
export function admitWasmRequest(state, now) {
    if (!wasmAlive(state))
        return Object.freeze({ state, request: null, reason: 'unavailable' });
    if (state.requests.length >= 128)
        return Object.freeze({ state, request: null, reason: 'capacity' });
    const request = Object.freeze({ id: state.nextRequest, deadline: now + 15000 });
    return Object.freeze({ state: Object.freeze({ ...state, nextRequest: state.nextRequest + 1, requests: Object.freeze([...state.requests, request]) }), request, reason: null });
}
export function settleWasmRequest(state, id, now) {
    const request = state.requests.find(item => item.id === id);
    if (!request || now !== undefined && now < request.deadline)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, requests: Object.freeze(state.requests.filter(item => item.id !== id)) }), accepted: true });
}
export function rejectWasmRequests(state, id) {
    const ids = Object.freeze(state.requests.filter(item => id === undefined || item.id === id).map(item => item.id));
    return Object.freeze({ state: ids.length ? Object.freeze({ ...state, requests: Object.freeze(state.requests.filter(item => !ids.includes(item.id))) }) : state, ids });
}
export function admitWasmWaiter(state, now) {
    if (!wasmAlive(state))
        return Object.freeze({ state, waiter: null });
    const waiter = Object.freeze({ id: state.nextWaiter, deadline: now + 25000 });
    return Object.freeze({ state: Object.freeze({ ...state, nextWaiter: state.nextWaiter + 1, waiters: Object.freeze([...state.waiters, waiter]) }), waiter });
}
export function settleWasmWaiter(state, id, now) {
    const waiter = state.waiters.find(item => item.id === id);
    if (!waiter || now !== undefined && now < waiter.deadline)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, waiters: Object.freeze(state.waiters.filter(item => item.id !== id)) }), accepted: true });
}
export function beginWasmOpen(state) {
    if (!wasmAlive(state))
        return Object.freeze({ state, id: null, reason: 'unavailable' });
    if (state.open !== null)
        return Object.freeze({ state, id: null, reason: 'busy' });
    return Object.freeze({ state: Object.freeze({ ...state, open: state.nextOpen, nextOpen: state.nextOpen + 1 }), id: state.nextOpen, reason: null });
}
export function ownsWasmOpen(state, id) { return wasmAlive(state) && state.open === id; }
export function finishWasmOpen(state, id) { return state.open === id ? Object.freeze({ ...state, open: null }) : state; }
export function observeWasmFile(state, present) { return wasmAlive(state) && state.hasFile !== present ? Object.freeze({ ...state, hasFile: present }) : state; }
export function retireWasmLifecycle(state) {
    if (state.phase === 'retiring' || state.phase === 'closed')
        return Object.freeze({ state, accepted: false, requests: Object.freeze([]), waiters: Object.freeze([]) });
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'retiring', open: null, hasFile: false, requests: Object.freeze([]), waiters: Object.freeze([]) }), accepted: true, requests: Object.freeze(state.requests.map(item => item.id)), waiters: Object.freeze(state.waiters.map(item => item.id)) });
}
export function finishWasmRetirement(state) { return state.phase === 'retiring' ? Object.freeze({ ...state, phase: 'closed' }) : state; }
