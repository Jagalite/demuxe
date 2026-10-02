// SPDX-License-Identifier: Apache-2.0
export function initialRemuxPortReader(size) { if (!Number.isSafeInteger(size) || size <= 0)
    throw Error('Invalid private remux source'); return Object.freeze({ size, sequence: 0, closed: false, pending: null }); }
export function remuxPortReadCurrent(state, id) { return !state.closed && state.pending?.id === id; }
export function beginRemuxPortRead(state, offset, count, aborted) {
    const error = state.closed || aborted ? 'cancelled' : state.pending ? 'concurrent' : !Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(count) || count < 1 || count > 262144 || offset + count > state.size ? 'range' : undefined;
    if (error)
        return Object.freeze({ state, accepted: false, request: null, error });
    const request = Object.freeze({ id: state.sequence + 1, offset, count });
    return Object.freeze({ state: Object.freeze({ ...state, sequence: request.id, pending: request }), accepted: true, request });
}
export function closeRemuxPortReader(state) { return state.closed ? Object.freeze({ state, accepted: false, request: null }) : Object.freeze({ state: Object.freeze({ ...state, closed: true, pending: null }), accepted: true, request: state.pending }); }
export function remuxPortResponseCurrent(state, expected) { return !state.closed && (state.pending?.id ?? null) === expected; }
export function replyRemuxPortRead(state, facts, expected = state.pending?.id ?? null) {
    if (!remuxPortResponseCurrent(state, expected))
        return Object.freeze({ state, accepted: false, request: null });
    const error = !facts.object || !state.pending || facts.id !== state.pending.id ? 'unexpected' : facts.error ? 'transport' : !facts.buffer || facts.bytes < 1 || facts.bytes > state.pending.count ? 'bytes' : undefined;
    if (error) {
        const decision = closeRemuxPortReader(state);
        return Object.freeze({ ...decision, error });
    }
    return Object.freeze({ state: Object.freeze({ ...state, pending: null }), accepted: true, request: state.pending });
}
