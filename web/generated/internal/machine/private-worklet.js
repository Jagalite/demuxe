// SPDX-License-Identifier: Apache-2.0
export const privateWorkletCaptureLimit = 2000000;
export function initialPrivateWorklet() { return Object.freeze({ phase: 'active', connected: false, epoch: -1, capacity: 8192, channels: 2, running: false, recording: false, error: null, stale: 0, maxQueued: 0 }); }
export function failPrivateWorklet(state, error) { return state.phase === 'failed' ? Object.freeze({ state, effect: 'none' }) : Object.freeze({ state: Object.freeze({ ...state, phase: 'failed', running: false, error }), effect: 'error' }); }
export function connectPrivateWorklet(state) { return state.connected || state.phase !== 'active' ? Object.freeze({ state, accepted: false, error: 'Transport already connected or stopped' }) : Object.freeze({ state: Object.freeze({ ...state, connected: true }), accepted: true }); }
export function recordPrivateWorklet(state) { return state.recording ? state : Object.freeze({ ...state, recording: true }); }
export function stopPrivateWorkletRecording(state) { return !state.recording ? state : Object.freeze({ ...state, recording: false }); }
function bufferValid(state, input) { return input.buffer && input.bytes % (state.channels * 4) === 0 && input.bytes >= state.channels * 4 && input.bytes <= 1024 * state.channels * 4; }
// This allocation-free admission check avoids scanning malformed/stale payloads.
export function inspectPrivateWorkletPCM(state, input) { return state.phase === 'active' && input.object && input.type === 'pcm' && input.epoch === state.epoch && bufferValid(state, input); }
export function receivePrivateWorklet(state, input, read, written) {
    const result = (next, effect = 'none', frames) => Object.freeze({ state: next, effect, ...frames === undefined ? {} : { frames } });
    if (input.type === 'stop')
        return result(state.phase === 'stopped' && !state.running ? state : Object.freeze({ ...state, phase: state.phase === 'failed' ? 'failed' : 'stopped', running: false }), 'stop');
    if (state.phase !== 'active')
        return result(state);
    if (!input.object)
        return failPrivateWorklet(state, 'Invalid PCM transport message');
    if (input.type === 'reset') {
        if (!Number.isInteger(input.epoch) || input.epoch < 0 || input.epoch > 0xffffffff || (input.epoch & 1) || input.epoch <= state.epoch)
            return result(Object.freeze({ ...state, stale: state.stale + 1 }));
        const capacity = input.capacity ?? 8192, channels = input.channels ?? 2;
        if (capacity !== 8192 && capacity !== 32768)
            return failPrivateWorklet(state, 'Invalid PCM capacity');
        if (channels !== 2 && channels !== 6 && channels !== 8)
            return failPrivateWorklet(state, 'Invalid PCM channel count');
        return result(Object.freeze({ ...state, epoch: input.epoch, capacity, channels, running: false }), 'reset');
    }
    if (input.epoch !== state.epoch)
        return result(Object.freeze({ ...state, stale: state.stale + 1 }));
    if (input.type === 'state')
        return input.running === null ? failPrivateWorklet(state, 'Invalid PCM running state') : result(input.running === state.running ? state : Object.freeze({ ...state, running: input.running }));
    if (input.type === 'pcm') {
        if (!bufferValid(state, input))
            return failPrivateWorklet(state, 'Invalid PCM buffer');
        if (!input.finite)
            return failPrivateWorklet(state, 'Non-finite PCM sample');
        const frames = input.bytes / (state.channels * 4);
        if (!Number.isInteger(frames) || frames < 1 || frames > 1024 || input.start !== written || written - read + frames > state.capacity)
            return failPrivateWorklet(state, 'Invalid PCM transport bounds');
        const queued = written - read + frames;
        return result(queued <= state.maxQueued ? state : Object.freeze({ ...state, maxQueued: queued }), 'append', frames);
    }
    return result(state);
}
// Primitive results preserve the realtime process loop's allocation behavior.
export function privateWorkletFrames(state, read, written, quantum, channels) { return channels !== state.channels ? -1 : state.running ? Math.min(quantum, written - read) : 0; }
export function privateWorkletUnderrun(state, frames, quantum) { return state.running && frames < quantum; }
export function privateWorkletCaptureFits(state, captured, frames, limit = privateWorkletCaptureLimit) { return captured + frames * state.channels <= limit; }
