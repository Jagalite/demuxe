// SPDX-License-Identifier: Apache-2.0
export function initialVideojsHostLease() { return Object.freeze({ serial: 0, owner: null, phase: 'free' }); }
export function transitionVideojsHost(state, command) {
    if (command.type === 'reserve') {
        if (state.owner !== null)
            return Object.freeze({ state, accepted: false });
        const owner = state.serial + 1;
        return Object.freeze({ state: Object.freeze({ serial: owner, owner, phase: 'reserved' }), accepted: true, owner });
    }
    if (state.owner !== command.owner)
        return Object.freeze({ state, accepted: false });
    if (command.type === 'attach')
        return state.phase === 'reserved' ? Object.freeze({ state: Object.freeze({ ...state, phase: 'attached' }), accepted: true }) : Object.freeze({ state, accepted: false });
    if (command.type === 'retire')
        return state.phase === 'retiring' ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, phase: 'retiring' }), accepted: true });
    return Object.freeze({ state: Object.freeze({ ...state, owner: null, phase: 'free' }), accepted: true });
}
export function initialVideojsState() { return Object.freeze({ retired: false, controlsReady: false, reflectedSource: undefined, errorSerial: 0, errorId: null }); }
export function transitionVideojs(state, command) {
    if (state.retired)
        return Object.freeze({ state, accepted: false });
    switch (command.type) {
        case 'dispose': return Object.freeze({ state: Object.freeze({ ...state, retired: true, controlsReady: false, errorId: null }), accepted: true });
        case 'ready': return Object.freeze({ state: Object.freeze({ ...state, controlsReady: true }), accepted: true });
        case 'error': return Object.freeze({ state: Object.freeze({ ...state, errorSerial: state.errorSerial + 1, errorId: state.errorSerial + 1 }), accepted: true, errorId: state.errorSerial + 1 });
        case 'source': return state.reflectedSource === command.sourceId ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, reflectedSource: command.sourceId, errorId: command.sourceId === null ? state.errorId : null }), accepted: true, clearError: command.sourceId !== null });
    }
}
export function videojsSourceCurrent(state, sourceId) { return !state.retired && state.reflectedSource === sourceId; }
