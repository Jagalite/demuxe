// SPDX-License-Identifier: Apache-2.0
export function initialProviderUpdates() { return Object.freeze({ received: 0, consumed: 0 }); }
export function providerUpdatesPending(state) { return state.received > state.consumed; }
export function transitionProviderUpdates(state, change) {
    return change.kind === 'notify' ? Object.freeze({ ...state, received: state.received + 1 })
        : Object.freeze({ ...state, consumed: Math.max(state.consumed, Math.min(state.received, change.through)) });
}
