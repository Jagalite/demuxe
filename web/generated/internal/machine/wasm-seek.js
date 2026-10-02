// SPDX-License-Identifier: Apache-2.0
export function createWasmSeek() { return Object.freeze({ nextId: 1, seek: null }); }
export function beginWasmSeek(state, target) {
    if (!Number.isFinite(target) || target < 0)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ nextId: state.nextId + 1, seek: Object.freeze({ id: state.nextId, target, restarted: false, eof: false }) }), accepted: true });
}
export function clearWasmSeek(state) { return state.seek ? Object.freeze({ ...state, seek: null }) : state; }
export function observeWasmSeek(state, event) {
    const seek = state.seek;
    if (!seek)
        return state;
    if (event.kind === 'restart')
        return Object.freeze({ ...state, seek: Object.freeze({ ...seek, restarted: true, eof: event.eof }) });
    if (event.kind === 'cache')
        return seek.restarted ? Object.freeze({ ...state, seek: Object.freeze({ ...seek, eof: event.eof }) }) : state;
    if (event.kind === 'position' && seek.restarted && seek.eof && event.position < seek.target - .15)
        return Object.freeze({ ...state, seek: Object.freeze({ ...seek, clamped: event.position }) });
    return state;
}
/** A stable seek ID survives immutable observation updates, but never a replacement seek. */
export function confirmWasmSeek(state, id, target, position, settled) {
    const seek = state.seek;
    if (!seek || seek.id !== id || seek.target !== target || !Number.isFinite(position) || !settled)
        return Object.freeze({ state, confirmed: false });
    const next = seek.restarted && seek.eof && position < target - .15 ? Object.freeze({ ...state, seek: Object.freeze({ ...seek, clamped: position }) }) : state;
    return Object.freeze({ state: next, confirmed: Math.abs(position - target) < .15 });
}
export function wasmSeekBoundary(state, target) {
    const seek = state.seek;
    return seek?.target === target && seek.restarted && seek.eof ? seek.clamped : undefined;
}
