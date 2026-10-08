// SPDX-License-Identifier: Apache-2.0
export function initialViewportLease() { return Object.freeze({ serial: 0, owner: null }); }
export function acquireViewportLease(state) {
    if (state.owner !== null || state.serial >= Number.MAX_SAFE_INTEGER)
        return Object.freeze({ state, id: null });
    const id = state.serial + 1;
    return Object.freeze({ state: Object.freeze({ serial: id, owner: id }), id });
}
export function viewportLeaseCurrent(state, id) { return state.owner === id; }
export function releaseViewportLease(state, id) { return viewportLeaseCurrent(state, id) ? Object.freeze({ ...state, owner: null }) : state; }
