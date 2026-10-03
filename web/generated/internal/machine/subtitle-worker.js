// SPDX-License-Identifier: Apache-2.0
export function initialSubtitleWorker() { return Object.freeze({ phase: 'active', epoch: 1, serial: 0, initialized: false, failed: false, queue: Object.freeze([]), active: null, openWait: null, refreshSerial: 0, refreshes: Object.freeze([]) }); }
export function subtitleWorkerAlive(state, epoch) { return state.phase === 'active' && state.epoch === epoch; }
export function subtitleWorkerCurrent(state, request) { return subtitleWorkerAlive(state, request.epoch) && state.active?.id === request.id; }
export function admitSubtitleWorker(state, method, clientId) {
    if (state.phase !== 'active')
        return Object.freeze({ state });
    if (typeof method !== 'string' || method.length > 64 || !(clientId === null || typeof clientId === 'string' && clientId.length <= 256 || typeof clientId === 'number' && Number.isSafeInteger(clientId)))
        return Object.freeze({ state, error: 'invalid' });
    if (state.queue.length + (state.active ? 1 : 0) >= 128)
        return Object.freeze({ state, error: 'capacity' });
    const request = Object.freeze({ id: state.serial + 1, epoch: state.epoch, method, clientId });
    return Object.freeze({ state: Object.freeze({ ...state, serial: request.id, queue: Object.freeze([...state.queue, request]) }), request });
}
export function startSubtitleWorker(state, request) {
    if (!subtitleWorkerAlive(state, request.epoch) || state.active || state.queue[0]?.id !== request.id)
        return Object.freeze({ state, accepted: false });
    const duplicate = request.method === 'init' && state.initialized;
    return Object.freeze({ state: Object.freeze({ ...state, initialized: state.initialized || request.method === 'init', active: request, queue: Object.freeze(state.queue.slice(1)) }), accepted: true, ...duplicate ? { error: 'initialized' } : {} });
}
export function finishSubtitleWorker(state, request) { return subtitleWorkerCurrent(state, request) ? Object.freeze({ ...state, active: null }) : state; }
export function failSubtitleWorker(state, request) { return subtitleWorkerCurrent(state, request) && !state.failed ? Object.freeze({ ...state, failed: true }) : state; }
export function closeSubtitleWorker(state) { return state.phase !== 'active' ? Object.freeze({ state, accepted: false, refreshes: Object.freeze([]) }) : Object.freeze({ state: Object.freeze({ ...state, phase: 'closing', epoch: state.epoch + 1, active: null, openWait: null, queue: Object.freeze([]), refreshes: Object.freeze([]) }), accepted: true, refreshes: state.refreshes }); }
export function closedSubtitleWorker(state) { return state.phase === 'closing' ? Object.freeze({ ...state, phase: 'closed' }) : state; }
export function admitSubtitleRefresh(state, epoch, now) {
    if (!subtitleWorkerAlive(state, epoch))
        return Object.freeze({ state });
    if (state.refreshes.length >= 128)
        return Object.freeze({ state, error: 'capacity' });
    const serial = state.refreshSerial + 1, request = Object.freeze({ id: `subtitle:${epoch}:${serial}`, epoch, deadline: now + 5000 });
    return Object.freeze({ state: Object.freeze({ ...state, refreshSerial: serial, refreshes: Object.freeze([...state.refreshes, request]) }), request });
}
export function subtitleRefreshCurrent(state, request) { return subtitleWorkerAlive(state, request.epoch) && state.refreshes.some(entry => entry.id === request.id); }
export function settleSubtitleRefresh(state, id, now) {
    const request = state.refreshes.find(entry => entry.id === id);
    if (!request || !subtitleRefreshCurrent(state, request))
        return Object.freeze({ state });
    if (now !== undefined && now < request.deadline)
        return Object.freeze({ state, remaining: request.deadline - now });
    return Object.freeze({ state: Object.freeze({ ...state, refreshes: Object.freeze(state.refreshes.filter(entry => entry.id !== id)) }), request });
}
export function beginSubtitleOpenWait(state, request, now) { return subtitleWorkerCurrent(state, request) && !state.openWait ? Object.freeze({ ...state, openWait: Object.freeze({ id: request.id, epoch: request.epoch, deadline: now + 20000 }) }) : state; }
export function settleSubtitleOpenWait(state, id, now) { const wait = state.openWait; if (!wait || wait.id !== id || !subtitleWorkerAlive(state, wait.epoch))
    return Object.freeze({ state, accepted: false }); if (now !== undefined && now < wait.deadline)
    return Object.freeze({ state, accepted: false, remaining: wait.deadline - now }); return Object.freeze({ state: Object.freeze({ ...state, openWait: null }), accepted: true }); }
export function failSubtitleWorkerLifetime(state, epoch) { return subtitleWorkerAlive(state, epoch) && !state.failed ? Object.freeze({ ...state, failed: true }) : state; }
