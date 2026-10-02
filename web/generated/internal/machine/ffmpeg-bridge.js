// SPDX-License-Identifier: Apache-2.0
import { initialFfmpegOwner, transitionFfmpegOwner } from './ffmpeg-owner.js';
export function initialFfmpegBridge() { return Object.freeze({ phase: 'ready', sourceSerial: 0, handle: -1, shutdown: null, execution: initialFfmpegOwner(), discard: false }); }
export function transitionFfmpegBridgeExecution(state, input) { const decision = transitionFfmpegOwner(state.execution, input); return Object.freeze({ state: decision.state === state.execution ? state : Object.freeze({ ...state, execution: decision.state }), decision }); }
export function beginFfmpegSource(state) { if (state.phase !== 'ready' || state.execution.active !== null || !Number.isSafeInteger(state.sourceSerial + 1))
    return Object.freeze({ state, id: null }); const id = state.sourceSerial + 1; return Object.freeze({ state: Object.freeze({ ...state, sourceSerial: id }), id }); }
export function ffmpegSourceCurrent(state, id) { return state.phase === 'ready' && state.sourceSerial === id; }
export function setFfmpegHandle(state, id, handle) { return ffmpegSourceCurrent(state, id) ? Object.freeze({ ...state, handle }) : state; }
export function detachFfmpegHandle(state) { return state.handle < 0 ? state : Object.freeze({ ...state, handle: -1 }); }
export function beginFfmpegShutdown(state, now, timeout) { return state.shutdown || state.phase === 'closed' ? state : Object.freeze({ ...state, phase: state.discard ? 'failed' : 'closing', shutdown: Object.freeze({ id: 1, deadline: now + timeout }) }); }
export function ffmpegShutdownRemaining(state, id, now) { return !state.shutdown || state.shutdown.id !== id || state.phase === 'closed' ? null : Math.max(0, state.shutdown.deadline - now); }
export function failFfmpegBridge(state) { return state.discard ? state : Object.freeze({ ...state, phase: 'failed', discard: true }); }
export function finishFfmpegBridge(state) { return Object.freeze({ ...state, phase: state.discard ? 'failed' : 'closed', handle: -1, shutdown: null }); }
