// SPDX-License-Identifier: Apache-2.0
function copy(value) {
    if (Array.isArray(value))
        return Object.freeze(value.map(item => copy(item)));
    if (value && typeof value === 'object')
        return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])));
    return value;
}
export function initialRemuxController(buffering, configuration = {}) { return Object.freeze({ destroyed: false, cleanupFailures: 0, ownerSerial: 0, releasing: Object.freeze([]), owner: null, operationSerial: 0, operation: null, sourceSerial: 0, sourceKey: null, requestSerial: 0, requests: Object.freeze([]), intent: null, observation: Object.freeze({}), observationSerial: 0, tracksToken: null, buffering: copy(buffering), configuration: copy(configuration) }); }
export function remuxOwnerCurrent(state, id) { return !state.destroyed && state.owner?.id === id; }
export function remuxOperationCurrent(state, id) { return !state.destroyed && state.operation?.id === id; }
export function remuxFallbackAllowed(state, operation, reason, message) {
    if (!remuxOperationCurrent(state, operation))
        return false;
    return reason === 'boot' || !state.observation.snapshot?.capability?.sourceBufferCreated && /Unsupported MSE|MSE sourceopen/.test(message);
}
export function remuxReleaseCurrent(state, owner, operationSerial) { return !state.destroyed && !state.owner && state.ownerSerial === owner && state.operationSerial === operationSerial; }
export function transitionRemuxController(state, command) {
    const result = (next, extra = {}) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), ...extra });
    if (command.type === 'released')
        return state.releasing.includes(command.owner) ? result({ ...state, releasing: Object.freeze(state.releasing.filter(id => id !== command.owner)) }, { accepted: true }) : result(state);
    if (command.type === 'cleanup-failed')
        return result({ ...state, cleanupFailures: state.cleanupFailures + 1 }, { accepted: true });
    if (command.type === 'destroy')
        return state.destroyed ? result(state) : result({ ...state, destroyed: true, releasing: state.owner?.kind === 'worker' ? Object.freeze([...state.releasing, state.owner.id]) : state.releasing, owner: null, operation: null, sourceKey: null, requests: Object.freeze([]) }, { accepted: true, retire: state.requests });
    if (state.destroyed)
        return result(state, { error: 'Destroyed' });
    if (command.type === 'begin') {
        if (!Number.isSafeInteger(state.operationSerial + 1) || !Number.isSafeInteger(state.sourceSerial + (command.kind === 'open' ? 1 : 0)))
            return result(state, { error: 'Remux operation identity exhausted' });
        const id = state.operationSerial + 1, sourceSerial = state.sourceSerial + (command.kind === 'open' ? 1 : 0), sourceKey = command.kind === 'open' ? String(sourceSerial) : state.sourceKey, operation = Object.freeze({ id, kind: command.kind, sourceKey });
        return result({ ...state, operationSerial: id, operation, sourceSerial, sourceKey }, { accepted: true, operation: id, sourceKey });
    }
    if (command.type === 'finish')
        return remuxOperationCurrent(state, command.id) ? result({ ...state, operation: null }, { accepted: true }) : result(state);
    if (command.type === 'intent')
        return result({ ...state, intent: command.playing }, { accepted: true });
    if (command.type === 'boot') {
        if (state.owner)
            return result(state, { owner: state.owner.id });
        if (state.releasing.length >= 128 || !Number.isSafeInteger(state.ownerSerial + 1))
            return result(state, { error: 'Remux owner capacity exhausted' });
        const id = state.ownerSerial + 1;
        return result({ ...state, ownerSerial: id, owner: Object.freeze({ id, kind: 'worker', phase: 'booting' }), observation: Object.freeze({}), tracksToken: null }, { accepted: true, owner: id });
    }
    if (command.type === 'local') {
        if (!remuxOperationCurrent(state, command.operation) || state.owner)
            return result(state);
        if (!remuxFallbackAllowed(state, command.operation, command.reason, command.message))
            return result(state);
        if (state.releasing.length >= 128 || !Number.isSafeInteger(state.ownerSerial + 1))
            return result(state, { error: 'Remux owner capacity exhausted' });
        const id = state.ownerSerial + 1;
        return result({ ...state, ownerSerial: id, owner: Object.freeze({ id, kind: 'local', phase: 'ready' }), observation: Object.freeze({}), tracksToken: null }, { accepted: true, owner: id });
    }
    if (command.type === 'release') {
        if (!remuxOwnerCurrent(state, command.owner))
            return result(state);
        return result({ ...state, releasing: state.owner?.kind === 'worker' ? Object.freeze([...state.releasing, state.owner.id]) : state.releasing, owner: null, requests: Object.freeze([]) }, { accepted: true, retire: state.requests });
    }
    if (!remuxOwnerCurrent(state, command.owner))
        return result(state);
    if (command.type === 'booted')
        return state.owner?.kind === 'worker' && state.owner.phase === 'booting' ? result({ ...state, owner: Object.freeze({ ...state.owner, phase: 'ready' }) }, { accepted: true }) : result(state);
    if (command.type === 'observe') {
        if (!Number.isSafeInteger(state.observationSerial + 1))
            return result(state, { error: 'Remux observation identity exhausted' });
        const observationSerial = state.observationSerial + 1, observation = copy(command.observation);
        return result({ ...state, observation, observationSerial, tracksToken: command.tracks ? observationSerial : null }, { accepted: true });
    }
    if (command.type === 'buffering')
        return result({ ...state, buffering: copy(command.value) }, { accepted: true });
    if (command.type === 'request') {
        if (state.requests.length >= 128 || !Number.isSafeInteger(state.requestSerial + 1))
            return result(state, { error: 'Remux request capacity exhausted' });
        if (state.owner?.kind !== 'worker' || state.owner.phase !== 'ready' && command.method !== 'boot')
            return result(state, { error: 'Destroyed' });
        const request = Object.freeze({ id: state.requestSerial + 1, owner: command.owner, method: command.method, deadline: command.now + 30000 });
        return result({ ...state, requestSerial: request.id, requests: Object.freeze([...state.requests, request]) }, { accepted: true, request });
    }
    const request = state.requests.find(request => request.id === command.id && request.owner === command.owner);
    if (!request)
        return result(state);
    if (command.type === 'deadline' && command.now < request.deadline)
        return result(state, { wait: request.deadline - command.now });
    return result({ ...state, requests: Object.freeze(state.requests.filter(value => value !== request)) }, { accepted: true, request });
}
