// SPDX-License-Identifier: Apache-2.0
export function initialRemuxWorker() { return Object.freeze({ phase: 'idle', epoch: 0, sourceKey: null, serial: 0, operations: Object.freeze([]), requests: Object.freeze([]) }); }
export function remuxWorkerLive(state) { return state.phase !== 'closing' && state.phase !== 'closed'; }
export function remuxWorkerOperationCurrent(state, operation) { return remuxWorkerLive(state) && (operation.method === 'setBuffering' || operation.epoch === state.epoch) && state.operations.some(value => value.id === operation.id && value.epoch === operation.epoch); }
export function transitionRemuxWorker(state, command) {
    const result = (next, extra = {}) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), ...extra });
    if (command.type === 'shutdown')
        return !remuxWorkerLive(state) ? result(state) : result({ ...state, phase: 'closing', epoch: Math.min(Number.MAX_SAFE_INTEGER, state.epoch + 1), operations: Object.freeze([]), requests: Object.freeze([]) }, { accepted: true, retire: state.requests });
    if (command.type === 'closed')
        return state.phase === 'closing' ? result({ ...state, phase: 'closed' }, { accepted: true }) : result(state);
    if (!remuxWorkerLive(state))
        return result(state, { error: 'Destroyed' });
    if (command.type === 'call') {
        if (!Number.isSafeInteger(command.id) || command.id <= 0 || state.operations.length >= 128)
            return result(state, { error: 'MSE operation capacity exhausted' });
        if (!['boot', 'open', 'seek', 'setBuffering'].includes(command.method))
            return result(state, { error: 'Unknown MSE owner operation' });
        if (state.operations.some(operation => operation.id === command.id))
            return result(state, { error: 'Duplicate MSE owner operation' });
        if (command.method === 'boot' && state.phase !== 'idle')
            return result(state, { error: 'MSE owner already initialized' });
        if (command.method !== 'boot' && state.phase !== 'ready')
            return result(state, { error: 'MSE owner is not ready' });
        const replaces = command.method === 'open' || command.method === 'seek', epoch = command.method === 'boot' || replaces ? state.epoch + 1 : state.epoch;
        if (!Number.isSafeInteger(epoch))
            return result(state, { error: 'MSE epoch exhausted' });
        const operation = Object.freeze({ id: command.id, method: command.method, epoch });
        return result({ ...state, epoch, phase: command.method === 'boot' ? 'booting' : state.phase, sourceKey: command.method === 'open' ? command.sourceKey ?? null : state.sourceKey, operations: Object.freeze([...state.operations, operation]), requests: replaces ? Object.freeze([]) : state.requests }, { accepted: true, operation, retire: replaces ? state.requests : Object.freeze([]) });
    }
    if (command.type === 'finish') {
        const operation = state.operations.find(value => value.id === command.id);
        if (!operation)
            return result(state);
        const current = remuxWorkerOperationCurrent(state, operation);
        return result({ ...state, operations: Object.freeze(state.operations.filter(value => value.id !== command.id)), phase: current && operation.method === 'boot' ? (command.success ? 'ready' : 'idle') : state.phase }, { accepted: true, current, operation });
    }
    if (command.type === 'request') {
        if (state.requests.length >= 128 || !Number.isSafeInteger(state.serial + 1))
            return result(state, { error: 'MSE request capacity exhausted' });
        if (state.phase !== 'ready' || command.kind === 'refresh' && command.sourceKey !== state.sourceKey)
            return result(state, { error: 'Superseded' });
        const request = Object.freeze({ id: state.serial + 1, kind: command.kind, epoch: state.epoch, deadline: command.now + (command.kind === 'element' ? 10000 : 5000) });
        return result({ ...state, serial: request.id, requests: Object.freeze([...state.requests, request]) }, { accepted: true, request });
    }
    const request = state.requests.find(value => value.id === command.id && value.kind === command.kind);
    if (!request)
        return result(state);
    if (command.type === 'deadline' && command.now < request.deadline)
        return result(state, { wait: request.deadline - command.now });
    return result({ ...state, requests: Object.freeze(state.requests.filter(value => value !== request)) }, { accepted: true, current: request.epoch === state.epoch, request });
}
export function initialRemuxElement() { return Object.freeze({ currentTime: 0, paused: true, playbackRate: 1, readyState: 0, ranges: Object.freeze([]) }); }
export function observeRemuxElement(state) { return Object.freeze({ ...state, quality: state.quality ? Object.freeze({ ...state.quality }) : undefined, ranges: Object.freeze(state.ranges.map(range => Object.freeze([range[0], range[1]]))) }); }
export function seekRemuxElement(state, currentTime) { return Object.freeze({ ...state, currentTime }); }
export function pauseRemuxElement(state) { return Object.freeze({ ...state, paused: true }); }
