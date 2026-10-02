// SPDX-License-Identifier: Apache-2.0
export function initialOperations() { return Object.freeze({ serial: 0, epoch: 0, terminal: false, entries: Object.freeze([]), active: null }); }
const accepted = (state, id) => Object.freeze({ state: Object.freeze({ ...state }), accepted: true, id });
const rejected = (state, reason, id) => Object.freeze({ state, accepted: false, reason, id });
export function activeOperation(state) { return state.entries.find(entry => entry.id === state.active); }
export function pendingOperation(state) { const active = activeOperation(state); return active?.kind ? Object.freeze({ id: active.id, kind: active.kind }) : null; }
/** Admission and logical retirement are synchronous. Queue bookkeeping release
 * is deliberately separate from completion to retain public promise timing. */
export function transitionOperations(state, input) {
    if (input.type === 'operation.admit') {
        const id = state.serial + 1, next = Object.freeze({ ...state, serial: id });
        if (state.terminal)
            return rejected(next, 'destroyed', id);
        if (state.entries.length >= 32 && input.kind !== 'closing')
            return rejected(next, 'full', id);
        const entry = Object.freeze({ id, epoch: state.epoch, kind: input.kind, cancelled: false, phase: 'queued' });
        return accepted({ ...next, entries: Object.freeze([...state.entries, entry]) }, id);
    }
    if (input.type === 'operation.retire')
        return accepted({ ...state, epoch: state.epoch + 1, terminal: state.terminal || input.terminal });
    const entry = state.entries.find(entry => entry.id === input.id);
    if (!entry)
        return rejected(state, 'retired', input.id);
    if (input.type === 'operation.release')
        return accepted({ ...state, entries: Object.freeze(state.entries.filter(entry => entry.id !== input.id)), active: state.active === input.id ? null : state.active }, input.id);
    if (input.type === 'operation.start') {
        if (state.terminal || entry.cancelled || entry.epoch !== state.epoch)
            return rejected(state, state.terminal ? 'destroyed' : 'retired', input.id);
        if (state.active !== null || entry.phase !== 'queued' || state.entries.some(other => other.id < entry.id && other.phase !== 'finished'))
            return rejected(state, 'order', input.id);
    }
    if (input.type === 'operation.name' && (state.active !== input.id || entry.phase !== 'active'))
        return rejected(state, 'retired', input.id);
    if (input.type === 'operation.finish' && entry.phase === 'finished')
        return rejected(state, 'retired', input.id);
    const next = Object.freeze({ ...entry,
        ...(input.type === 'operation.cancel' ? { cancelled: true } : input.type === 'operation.start' ? { phase: 'active' } : input.type === 'operation.finish' ? { phase: 'finished' } : input.type === 'operation.name' ? { kind: input.kind } : {}) });
    return accepted({ ...state, entries: Object.freeze(state.entries.map(other => other.id === input.id ? next : other)), active: input.type === 'operation.start' ? input.id : input.type === 'operation.finish' && state.active === input.id ? null : state.active }, input.id);
}
