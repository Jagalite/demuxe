// SPDX-License-Identifier: Apache-2.0
export function createByteReader(input) {
    return Object.freeze({ id: input.id, size: input.size, maxReads: input.maxReads, maxBytes: input.maxBytes, ownedClose: input.ownedClose, reads: 0, bytes: 0, nextRequest: 0, nextChunk: 0, active: null, retired: false, closeIssued: false, failure: null });
}
function fault(code, message) { return Object.freeze({ code, message }); }
function transition(state, effect, copyAt = null) {
    return Object.freeze({ state, effect: Object.freeze({ ...effect }), copyAt });
}
function reject(state, error, fatal = false) {
    const failure = fatal ? state.failure ?? Object.freeze({ ...error }) : state.failure;
    const next = Object.freeze({ ...state, active: null, retired: state.retired || fatal, failure });
    return transition(next, { kind: 'reject', fault: fatal ? failure : error, abort: fatal });
}
/** Validation happens before shell queueing, including after retirement. */
export function validateByteRange(state, offset, length) {
    return !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > state.size || length > 1024 * 1024
        ? fault('INVALID_ARGUMENT', 'Invalid byte range') : null;
}
function changed(state, identity) { return identity.id !== state.id || identity.size !== state.size; }
function advance(state, copyAt = null) {
    const active = state.active;
    if (active.received === active.length)
        return transition(Object.freeze({ ...state, active: null }), { kind: 'complete', request: active.id }, copyAt);
    if (state.reads >= state.maxReads) {
        const result = reject(state, fault('INVALID_ARGUMENT', 'Source read budget exceeded'));
        return Object.freeze({ ...result, copyAt });
    }
    const chunk = state.nextChunk + 1, length = Math.min(active.length - active.received, 262144);
    const next = Object.freeze({ ...state, reads: state.reads + 1, nextChunk: chunk, active: Object.freeze({ ...active, chunk, chunkSize: length }) });
    return transition(next, { kind: 'read', request: active.id, chunk, offset: active.offset + active.received, length }, copyAt);
}
/** Shell serialization calls this when an admitted range reaches the queue head.
 * Identity and byte budgets are evaluated then, not when it was enqueued. */
export function beginByteRead(state, identity, offset, length) {
    const invalid = validateByteRange(state, offset, length);
    if (invalid)
        return transition(state, { kind: 'reject', fault: invalid, abort: false });
    if (state.retired)
        return reject(state, fault('ABORTED', 'Source closed'));
    if (changed(state, identity))
        return reject(state, fault('SOURCE_CHANGED', 'Source identity or size changed'), true);
    if (state.bytes + length > state.maxBytes)
        return reject(state, fault('INVALID_ARGUMENT', 'Inspection byte budget exceeded'));
    if (state.active)
        throw new RangeError('Byte reader shell started concurrent requests');
    const id = state.nextRequest + 1;
    return advance(Object.freeze({ ...state, nextRequest: id, active: Object.freeze({ id, offset, length, received: 0, chunk: 0, chunkSize: 0 }) }));
}
/** Completions contain observations only. Provider buffers stay in the shell;
 * copyAt authorizes copying those bytes before committing this transition. */
export function completeByteRead(state, input) {
    const active = state.active;
    if (!active || active.id !== input.request || active.chunk !== input.chunk)
        return transition(state, { kind: 'ignore' });
    if (state.retired)
        return reject(state, fault('ABORTED', 'Source closed'));
    if (changed(state, input.identity))
        return reject(state, fault('SOURCE_CHANGED', 'Source identity or size changed'), true);
    if (!input.validBuffer || !Number.isSafeInteger(input.length) || input.length <= 0 || input.length > active.chunkSize)
        return reject(state, fault('SOURCE_CHANGED', 'Invalid short read or premature EOF'), true);
    return advance(Object.freeze({ ...state, bytes: state.bytes + input.length, active: Object.freeze({ ...active, received: active.received + input.length }) }), active.received);
}
/** The first provider failure remains authoritative; later queued calls observe
 * retirement. Retiring during an in-flight deadline does not hide that failure. */
export function failByteRead(state, request, chunk, error) {
    const active = state.active;
    return !active || active.id !== request || active.chunk !== chunk ? transition(state, { kind: 'ignore' }) : reject(state, error, true);
}
export function retireByteReader(state) {
    return state.retired ? state : Object.freeze({ ...state, retired: true });
}
export function closeByteReader(state) {
    return Object.freeze({ state: state.retired && state.closeIssued ? state : Object.freeze({ ...state, retired: true, closeIssued: true }), closeProvider: state.ownedClose && !state.closeIssued });
}
