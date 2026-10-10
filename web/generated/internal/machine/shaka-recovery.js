// SPDX-License-Identifier: Apache-2.0
export function initialShakaRecovery() { return Object.freeze({ active: true, serial: 0, requests: Object.freeze([]), retrying: Object.freeze([]) }); }
export function transitionShakaRecovery(state, command) {
    if (!state.active)
        return state;
    if (command.type === 'retire')
        return Object.freeze({ ...state, active: false, requests: Object.freeze([]), retrying: Object.freeze([]) });
    if (command.type === 'begin')
        return Object.freeze({ ...state, serial: state.serial + 1, requests: Object.freeze([...state.requests, state.serial + 1]) });
    if (!state.requests.includes(command.id))
        return state;
    if (command.type === 'retry')
        return state.retrying.includes(command.id) ? state : Object.freeze({ ...state, retrying: Object.freeze([...state.retrying, command.id]) });
    return Object.freeze({ ...state, requests: Object.freeze(state.requests.filter(id => id !== command.id)), retrying: Object.freeze(state.retrying.filter(id => id !== command.id)) });
}
export function shakaRecoverySnapshot(state) { return Object.freeze({ status: state.retrying.length ? 'retrying' : 'idle', retryingRequests: state.retrying.length }); }
