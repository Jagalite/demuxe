// SPDX-License-Identifier: Apache-2.0
export function initialMediaQueries() { return Object.freeze({ retired: false, serial: 0, pending: Object.freeze([]) }); }
export function admitMediaQuery(state) {
    if (state.retired || state.pending.length >= 128 || !Number.isSafeInteger(state.serial + 1))
        return Object.freeze({ state, id: null });
    const id = state.serial + 1;
    return Object.freeze({ state: Object.freeze({ ...state, serial: id, pending: Object.freeze([...state.pending, id]) }), id });
}
export function mediaQueryCurrent(state, id) { return !state.retired && state.pending.includes(id); }
export function finishMediaQuery(state, id) { return state.pending.includes(id) ? Object.freeze({ ...state, pending: Object.freeze(state.pending.filter(entry => entry !== id)) }) : state; }
export function retireMediaQueries(state) { return state.retired ? state : Object.freeze({ ...state, retired: true }); }
