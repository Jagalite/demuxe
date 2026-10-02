// SPDX-License-Identifier: Apache-2.0
export function createPrivatePCM(profile, capacity = 8192, channels = 2) {
    if (![8192, 32768].includes(capacity))
        throw Error('Invalid private PCM capacity');
    if (![2, 6, 8].includes(channels))
        throw Error('Invalid private PCM channel count');
    return Object.freeze({ profile, capacity, channels, epoch: -1, posted: 0, ack: false, running: null, maxOutstanding: 0, feedbackCount: 0, staleFeedback: 0, error: null, pumping: false, phase: 'active', stopDeadline: null });
}
export function beginPrivatePCMPump(state) {
    return state.phase !== 'active' || state.error !== null || state.pumping ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, pumping: true }), accepted: true });
}
export function finishPrivatePCMPump(state) { return state.pumping ? Object.freeze({ ...state, pumping: false }) : state; }
/** One chunk per transition: commit its identity before transferring its buffer. */
export function nextPrivatePCMStep(state, header) {
    const result = (next, effect) => Object.freeze({ state: next, effect: Object.freeze({ ...effect }) });
    if (state.phase !== 'active' || state.error !== null || (header.epoch & 1))
        return result(state, { kind: 'idle' });
    if (header.epoch !== state.epoch)
        return result(Object.freeze({ ...state, epoch: header.epoch, posted: 0, ack: false, running: null }), { kind: 'reset', epoch: header.epoch, capacity: state.capacity, channels: state.channels });
    if (!state.ack)
        return result(state, { kind: 'idle' });
    const running = header.nativeRunning && header.contextRunning && !header.userPaused && (state.profile === 'audio' || state.running === true || state.posted > header.consumed);
    // The selective audio service historically publishes running before samples;
    // playback starts only after queued samples and preserves starvation evidence.
    if (state.profile === 'audio' && running !== state.running)
        return result(Object.freeze({ ...state, running }), { kind: 'state', epoch: state.epoch, running });
    if (header.produced < state.posted || state.posted < header.consumed || header.produced - header.consumed > state.capacity)
        return result(state, { kind: 'error', message: state.profile === 'audio' ? 'Invalid producer/consumer counters' : 'Invalid PCM counters' });
    if (state.posted < header.produced) {
        const frames = Math.min(1024, header.produced - state.posted), posted = state.posted + frames;
        return result(Object.freeze({ ...state, posted, maxOutstanding: Math.max(state.maxOutstanding, posted - header.consumed) }), { kind: 'pcm', epoch: state.epoch, start: state.posted, frames });
    }
    if (running !== state.running)
        return result(Object.freeze({ ...state, running }), { kind: 'state', epoch: state.epoch, running });
    return result(state, { kind: 'idle' });
}
export function privatePCMFeedback(state, input, nativeEpoch, consumed) {
    const result = (next, pump = false, write = null, error = null) => Object.freeze({ state: next, pump, write: write ? Object.freeze({ ...write }) : null, error });
    if (state.phase !== 'active' || state.error !== null)
        return result(state);
    if (input.epoch !== state.epoch || input.epoch !== nativeEpoch)
        return result(Object.freeze({ ...state, staleFeedback: state.staleFeedback + 1 }));
    if (input.kind === 'resetAck')
        return state.ack ? result(state) : result(Object.freeze({ ...state, ack: true }), true, { epoch: state.epoch, consumed: 0 });
    if (input.kind === 'consumed') {
        if (!Number.isInteger(input.frames) || input.frames < consumed || input.frames > state.posted)
            return result(state, false, null, 'Invalid consumption feedback');
        return result(Object.freeze({ ...state, feedbackCount: state.feedbackCount + 1 }), true, { epoch: state.epoch, consumed: input.frames });
    }
    return result(state, state.profile === 'playback');
}
export function failPrivatePCM(state, error) {
    return state.error !== null ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, error }), accepted: true });
}
export function beginPrivatePCMStop(state, now) {
    const accepted = state.phase === 'active', deadline = accepted ? now + 1000 : state.stopDeadline;
    return Object.freeze({ state: accepted ? Object.freeze({ ...state, phase: 'stopping', stopDeadline: deadline }) : state, accepted, id: state.profile === 'audio' ? 'worker-close' : 'playback-close', deadline });
}
export function settlePrivatePCMStop(state, input) {
    if (state.phase !== 'stopping' || input.kind === 'ack' && input.id !== (state.profile === 'audio' ? 'worker-close' : 'playback-close') || input.kind === 'deadline' && input.now < state.stopDeadline)
        return Object.freeze({ state, outcome: 'ignore' });
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'stopped', stopDeadline: null }), outcome: input.kind === 'ack' ? 'resolve' : 'reject' });
}
