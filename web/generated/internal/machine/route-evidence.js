// SPDX-License-Identifier: Apache-2.0
import { createCapabilities, transitionCapabilities, createTierAttempts, recordTierFailure, readTierFailure } from './routing.js';
export function initialCapabilityOwner() { return Object.freeze({ revision: 0, serial: 0, identityEpoch: 0, value: createCapabilities() }); }
export function initialTierOwner() { return Object.freeze({ revision: 0, serial: 0, identityEpoch: 0, value: createTierAttempts() }); }
export function initialRouteEvidence() { return Object.freeze({ capabilities: initialCapabilityOwner(), tiers: initialTierOwner() }); }
export function transitionCapabilityOwner(state, change, revision) {
    if (revision !== state.revision)
        return state;
    if (change.kind === 'identity')
        return Object.freeze({ ...state, revision: state.revision + 1, serial: state.serial + 1 });
    const value = transitionCapabilities(state.value, change.event);
    return value === state.value ? state : Object.freeze({ ...state, revision: state.revision + 1, identityEpoch: state.identityEpoch + (change.event.kind === 'clear' ? 1 : 0), value });
}
export function transitionTierOwner(state, change, revision) {
    if (revision !== state.revision)
        return state;
    if (change.kind === 'identity')
        return Object.freeze({ ...state, revision: state.revision + 1, serial: state.serial + 1 });
    const value = change.kind === 'clear' ? createTierAttempts() : change.kind === 'failure' ? recordTierFailure(state.value, change.key, change.reason, change.now) : readTierFailure(state.value, change.key, change.now).state;
    return value === state.value ? state : Object.freeze({ ...state, revision: state.revision + 1, identityEpoch: state.identityEpoch + (change.kind === 'clear' ? 1 : 0), value });
}
export function clearRouteEvidence(state) { return Object.freeze({ capabilities: transitionCapabilityOwner(state.capabilities, { kind: 'event', event: { kind: 'clear' } }, state.capabilities.revision), tiers: transitionTierOwner(state.tiers, { kind: 'clear' }, state.tiers.revision) }); }
/** Retiring a command rejects facts currently being captured without discarding
 * previously accepted evidence or the compatibility retry budget. */
export function retireRouteEvidence(state) { return Object.freeze({ capabilities: Object.freeze({ ...state.capabilities, revision: state.capabilities.revision + 1 }), tiers: Object.freeze({ ...state.tiers, revision: state.tiers.revision + 1 }) }); }
