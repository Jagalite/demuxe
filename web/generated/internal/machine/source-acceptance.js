// SPDX-License-Identifier: Apache-2.0
export function initialSourceAcceptance(predecessor) { return Object.freeze({ phase: 'caller.detach', serial: 0, pending: null, failed: false, cleanup: predecessor ? 'pending' : 'done' }); }
export function claimSourceAcceptance(state) {
    if (state.failed || state.pending !== null)
        return Object.freeze({ state, accepted: false });
    if (state.phase === 'done')
        return Object.freeze({ state, accepted: true });
    const step = state.serial + 1;
    return Object.freeze({ state: Object.freeze({ ...state, serial: step, pending: step }), accepted: true, effect: Object.freeze({ kind: state.phase, step }) });
}
const next = Object.freeze({ 'caller.detach': 'decoding', decoding: 'admission', admission: 'evidence', evidence: 'preview.identity', 'preview.identity': 'preview.source', 'preview.source': 'publish', publish: 'surface.show', 'surface.show': 'surface.hide', 'surface.hide': 'watchdogs', watchdogs: 'cleanup', cleanup: 'property.next', 'property.emit': 'property.next', 'file.loaded': 'mode.ready', 'mode.ready': 'done' });
export function completeSourceAcceptance(state, step, hasProperty) {
    if (state.pending !== step || state.failed || state.phase === 'done' || state.phase === 'cleanup' && state.cleanup !== 'done' || state.phase === 'property.next' && typeof hasProperty !== 'boolean')
        return Object.freeze({ state, accepted: false });
    const phase = state.phase === 'property.next' ? (hasProperty ? 'property.emit' : 'file.loaded') : next[state.phase];
    return Object.freeze({ state: Object.freeze({ ...state, phase, pending: null }), accepted: true });
}
export function failSourceAcceptance(state) { return state.failed ? state : Object.freeze({ ...state, failed: true, pending: null }); }
export function claimSourceAcceptanceCleanup(state) { return state.cleanup === 'pending' ? Object.freeze({ state: Object.freeze({ ...state, cleanup: 'running' }), accepted: true }) : Object.freeze({ state, accepted: false }); }
export function completeSourceAcceptanceCleanup(state) { return state.cleanup === 'running' ? Object.freeze({ state: Object.freeze({ ...state, cleanup: 'done' }), accepted: true }) : Object.freeze({ state, accepted: false }); }
