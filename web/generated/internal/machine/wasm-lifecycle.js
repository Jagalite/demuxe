// SPDX-License-Identifier: Apache-2.0
import { beginWait, observeWait } from './async-policy.js';
import { createWasmSeek, clearWasmSeek, beginWasmSeek, observeWasmSeek, confirmWasmSeek } from './wasm-seek.js';
import { createWasmSettings, updateWasmSettings } from './wasm-settings.js';
export function createWasmLifecycle(decoderOutput = true) { return Object.freeze({ initialization: null, retirement: null, releaseFailed: false, attachmentSerial: 0, attachments: Object.freeze([]), attachmentPending: null, attachmentFailed: false, phase: 'initializing', initSent: false, workerFailed: false, nextRequest: 100, nextWaiter: 1, nextOpen: 1, requests: Object.freeze([]), waiters: Object.freeze([]), open: null, hasFile: false, seek: createWasmSeek(), settings: createWasmSettings(decoderOutput) }); }
export function wasmAlive(state) { return state.phase === 'initializing' || state.phase === 'ready'; }
export function markWasmInitialized(state) { return wasmAlive(state) ? Object.freeze({ ...state, initSent: true }) : state; }
export function settleWasmInitialization(state, success) { return state.phase === 'initializing' ? Object.freeze({ ...state, phase: success ? 'ready' : 'failed' }) : state; }
export function claimWasmWorkerFailure(state) {
    if (!wasmAlive(state) || state.workerFailed)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, workerFailed: true, phase: state.phase === 'initializing' ? 'failed' : state.phase }), accepted: true });
}
export function admitWasmRequest(state, now) {
    if (!wasmAlive(state))
        return Object.freeze({ state, request: null, reason: 'unavailable' });
    if (state.requests.length >= 128 || !Number.isSafeInteger(state.nextRequest) || state.nextRequest >= Number.MAX_SAFE_INTEGER)
        return Object.freeze({ state, request: null, reason: 'capacity' });
    const request = Object.freeze({ id: state.nextRequest, deadline: now + 15000 });
    return Object.freeze({ state: Object.freeze({ ...state, nextRequest: state.nextRequest + 1, requests: Object.freeze([...state.requests, request]) }), request, reason: null });
}
export function settleWasmRequest(state, id, now) {
    const request = state.requests.find(item => item.id === id);
    if (!request || now !== undefined && now < request.deadline)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, requests: Object.freeze(state.requests.filter(item => item.id !== id)) }), accepted: true });
}
export function rejectWasmRequests(state, id) {
    const ids = Object.freeze(state.requests.filter(item => id === undefined || item.id === id).map(item => item.id));
    return Object.freeze({ state: ids.length ? Object.freeze({ ...state, requests: Object.freeze(state.requests.filter(item => !ids.includes(item.id))) }) : state, ids });
}
export function admitWasmWaiter(state, now) {
    if (!wasmAlive(state) || state.waiters.length >= 128 || !Number.isSafeInteger(state.nextWaiter) || state.nextWaiter >= Number.MAX_SAFE_INTEGER)
        return Object.freeze({ state, waiter: null });
    const waiter = Object.freeze({ id: state.nextWaiter, deadline: now + 25000 });
    return Object.freeze({ state: Object.freeze({ ...state, nextWaiter: state.nextWaiter + 1, waiters: Object.freeze([...state.waiters, waiter]) }), waiter });
}
export function settleWasmWaiter(state, id, now) {
    const waiter = state.waiters.find(item => item.id === id);
    if (!waiter || now !== undefined && now < waiter.deadline)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, waiters: Object.freeze(state.waiters.filter(item => item.id !== id)) }), accepted: true });
}
export function beginWasmOpen(state) {
    if (!wasmAlive(state))
        return Object.freeze({ state, id: null, reason: 'unavailable' });
    if (state.open !== null || state.attachmentPending !== null)
        return Object.freeze({ state, id: null, reason: 'busy' });
    if (!Number.isSafeInteger(state.nextOpen) || state.nextOpen >= Number.MAX_SAFE_INTEGER)
        return Object.freeze({ state, id: null, reason: 'unavailable' });
    return Object.freeze({ state: Object.freeze({ ...state, open: state.nextOpen, nextOpen: state.nextOpen + 1, attachmentFailed: false }), id: state.nextOpen, reason: null });
}
export function ownsWasmOpen(state, id) { return wasmAlive(state) && state.open === id; }
export function finishWasmOpen(state, id) { return state.open === id ? Object.freeze({ ...state, open: null }) : state; }
export function observeWasmFile(state, present) {
    if (!wasmAlive(state))
        return state;
    const seek = present ? clearWasmSeek(state.seek) : state.seek;
    return state.hasFile === present && seek === state.seek ? state : Object.freeze({ ...state, hasFile: present, seek });
}
export function beginWasmPlayerSeek(state, target) {
    const decision = beginWasmSeek(state.seek, target);
    if (!decision.accepted)
        return Object.freeze({ state, reason: 'invalid' });
    if (!wasmAlive(state))
        return Object.freeze({ state, reason: 'unavailable' });
    return Object.freeze({ state: Object.freeze({ ...state, seek: decision.state }), reason: null });
}
export function observeWasmPlayerSeek(state, event) {
    if (!wasmAlive(state))
        return state;
    const seek = observeWasmSeek(state.seek, event);
    return seek === state.seek ? state : Object.freeze({ ...state, seek });
}
export function confirmWasmPlayerSeek(state, id, target, position, settled) {
    const decision = confirmWasmSeek(state.seek, id, target, position, settled);
    return Object.freeze({ state: decision.state === state.seek ? state : Object.freeze({ ...state, seek: decision.state }), confirmed: decision.confirmed });
}
export function retireWasmLifecycle(state) {
    if (state.phase === 'retiring' || state.phase === 'closed')
        return Object.freeze({ state, accepted: false, requests: Object.freeze([]), waiters: Object.freeze([]) });
    return Object.freeze({ state: Object.freeze({ ...state, initialization: state.initialization ? observeWait(state.initialization, { id: state.initialization.id, kind: 'retire', now: 0 }) : null, phase: 'retiring', open: null, attachmentPending: null, hasFile: false, seek: clearWasmSeek(state.seek), requests: Object.freeze([]), waiters: Object.freeze([]) }), accepted: true, requests: Object.freeze(state.requests.map(item => item.id)), waiters: Object.freeze(state.waiters.map(item => item.id)) });
}
export function finishWasmRetirement(state, released = true) { return state.phase === 'retiring' ? Object.freeze({ ...state, phase: released ? 'closed' : 'retiring', releaseFailed: !released }) : state; }
export function applyWasmSetting(state, input) {
    if (!wasmAlive(state))
        return Object.freeze({ state, accepted: false, send: false });
    const decision = updateWasmSettings(state.settings, input);
    return Object.freeze({ state: decision.state === state.settings ? state : Object.freeze({ ...state, settings: decision.state }), accepted: decision.accepted, send: decision.send && (input.kind !== 'watchdog' || state.initSent) });
}
export function admitWasmAttachment(state, bytes, identity) {
    const error = !wasmAlive(state) ? 'Player unavailable' : state.open !== null || state.attachmentPending !== null ? 'Subtitle attachment busy' : state.attachmentFailed ? 'Subtitle attachment state uncertain' : !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > 8 * 1024 * 1024 || identity !== undefined && (typeof identity !== 'string' || identity.length > 256) ? 'Invalid subtitle attachment' : state.attachments.length >= 32 || state.attachments.reduce((sum, item) => sum + item.bytes, 0) + bytes > 16 * 1024 * 1024 || !Number.isSafeInteger(state.attachmentSerial + 1) ? 'Subtitle attachment capacity' : null;
    if (error)
        return Object.freeze({ state, id: null, error });
    const entry = Object.freeze({ id: state.attachmentSerial + 1, source: state.nextOpen - 1, identity, bytes, status: 'pending' });
    return Object.freeze({ state: Object.freeze({ ...state, attachmentSerial: entry.id, attachmentPending: entry.id, attachments: Object.freeze([...state.attachments, entry]) }), id: entry.id, error: null });
}
export function wasmAttachmentCurrent(state, id) { return wasmAlive(state) && state.attachmentPending === id; }
export function finishWasmAttachment(state, id, outcome) {
    if (!wasmAttachmentCurrent(state, id))
        return state;
    const attachments = outcome === 'unsubmitted' ? state.attachments.filter(entry => entry.id !== id) : state.attachments.map(entry => entry.id === id ? Object.freeze({ ...entry, status: outcome, identity: outcome === 'uncertain' ? undefined : entry.identity }) : entry);
    return Object.freeze({ ...state, attachmentPending: null, attachmentFailed: outcome === 'uncertain', attachments: Object.freeze(attachments) });
}
export function wasmAttachmentIdentity(state, index) { return state.attachments.filter(entry => entry.source === state.nextOpen - 1)[index]?.identity; }
export function beginWasmHandshake(state, kind, now) {
    if (kind === 'initialization' ? state.phase !== 'initializing' || state.initialization !== null : state.phase !== 'retiring' || state.retirement !== null)
        return state;
    return Object.freeze({ ...state, [kind]: beginWait(kind === 'initialization' ? 1 : 2, now, kind) });
}
export function observeWasmHandshake(state, kind, event, now) {
    const old = state[kind];
    if (!old || (kind === 'initialization' ? state.phase !== 'initializing' : state.phase !== 'retiring'))
        return { state, effect: 'ignore' };
    const wait = observeWait(old, { id: old.id, kind: event, now });
    if (wait === old)
        return { state, effect: old.phase === 'waiting' ? 'waiting' : 'ignore' };
    const next = Object.freeze({ ...state, [kind]: wait, ...kind === 'initialization' ? { phase: wait.phase === 'ready' ? 'ready' : 'failed' } : {} });
    return { state: next, effect: wait.phase === 'ready' ? 'ready' : kind === 'retirement' ? 'contain' : 'reject' };
}
