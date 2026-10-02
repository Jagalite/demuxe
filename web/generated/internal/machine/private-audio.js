// SPDX-License-Identifier: Apache-2.0
export function createPrivateAudio() { return Object.freeze({ running: false, polling: false, controlId: 0, rate: 1, volume: 100, gain: 1, streamIndex: null, resumeAfterContext: false, contextObservation: 0, contextActive: false, eof: false, eofTask: null, nextEOF: 1, watchAudio: true, badClock: 0, outside: 0, inside: 0, trim: false, rateWrites: 0, errors: Object.freeze([]) }); }
export function selectPrivateAudioStream(state, index) { return index === undefined ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, streamIndex: index }), accepted: true }); }
export function privateAudioSettings(state, input) {
    return Object.freeze({ ...state, rate: input.rate ?? state.rate, volume: input.volume ?? state.volume, gain: input.gain ?? state.gain, watchAudio: input.watchAudio ?? state.watchAudio, badClock: input.watchAudio === undefined ? state.badClock : 0 });
}
export function beginAudioControl(state, kind) {
    if (kind === 'play' && state.running)
        return Object.freeze({ state, id: null, wasRunning: true });
    const id = state.controlId + 1;
    return Object.freeze({ state: Object.freeze({ ...state, controlId: id, running: kind === 'play' ? state.running : false, resumeAfterContext: kind === 'pause' ? false : state.resumeAfterContext,
            eof: kind === 'seek' ? false : state.eof, eofTask: kind === 'seek' ? null : state.eofTask }), id, wasRunning: state.running });
}
export function audioControlCurrent(state, id) { return state.controlId === id; }
export function finishAudioPlay(state, id) { return state.controlId !== id ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, running: true }), accepted: true }); }
export function observeAudioContext(state, active, videoPaused) {
    const id = state.contextObservation + 1, pauseVideo = !active && state.running && !videoPaused;
    return Object.freeze({ state: Object.freeze({ ...state, contextObservation: id, contextActive: active, resumeAfterContext: pauseVideo || state.resumeAfterContext }), id, pauseVideo });
}
export function acknowledgeAudioContext(state, id) {
    const playVideo = id === state.contextObservation && state.contextActive && state.resumeAfterContext && state.running;
    return Object.freeze({ state: playVideo ? Object.freeze({ ...state, resumeAfterContext: false }) : state, playVideo });
}
export function beginAudioPoll(state, active) { return state.polling || !active ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, polling: true }), accepted: true }); }
export function finishAudioPoll(state) { return Object.freeze({ ...state, polling: false }); }
export function privateAudioObservesClock(state, sample) { return sample.active && state.running && sample.contextRunning && !sample.videoPaused && !sample.videoSeeking; }
export function observeAudioClock(state, sample) {
    if (!privateAudioObservesClock(state, sample))
        return Object.freeze({ state, failure: false, rate: null, latency: false });
    const error = (sample.audioTime - sample.videoTime) * 1000, badClock = state.watchAudio && !sample.hidden && (!Number.isFinite(error) || Math.abs(error) > 250) ? state.badClock + 1 : 0;
    if (badClock >= 8)
        return Object.freeze({ state: Object.freeze({ ...state, badClock }), failure: true, rate: null, latency: false });
    if (!Number.isFinite(error))
        return Object.freeze({ state: Object.freeze({ ...state, badClock }), failure: false, rate: null, latency: true });
    const outside = Math.abs(error) > 50 ? state.outside + 1 : 0, inside = Math.abs(error) < 30 ? state.inside + 1 : 0, trim = inside >= 3 ? false : outside >= 3 ? true : state.trim;
    const target = state.rate * (1 + (trim ? Math.max(-.005, Math.min(.005, error / 1000 * .1)) : 0));
    const write = Math.abs(target - sample.videoRate) > .001 || !trim && sample.videoRate !== state.rate;
    return Object.freeze({ state: Object.freeze({ ...state, badClock, outside, inside, trim, rateWrites: state.rateWrites + (write ? 1 : 0), errors: Object.freeze([...state.errors, Math.abs(error)].slice(-1200)) }), failure: false, rate: write ? target : null, latency: true });
}
export function resetAudioClock(state, videoRate) { return Object.freeze({ state: Object.freeze({ ...state, outside: 0, inside: 0, trim: false }), rate: videoRate !== state.rate ? state.rate : null }); }
export function beginAudioEOF(state, active) {
    if (state.eof || !active)
        return Object.freeze({ state, id: null });
    const id = state.nextEOF;
    return Object.freeze({ state: Object.freeze({ ...state, eof: true, eofTask: id, nextEOF: id + 1 }), id });
}
export function audioEOFCurrent(state, id) { return state.eofTask === id; }
export function finishAudioEOF(state, id) { return state.eofTask === id ? Object.freeze({ ...state, eofTask: null }) : state; }
export function retirePrivateAudio(state) { return Object.freeze({ ...state, controlId: state.controlId + 1, contextObservation: state.contextObservation + 1, contextActive: false, running: false, resumeAfterContext: false, eofTask: null }); }
export function privateAudioDeadline(now, timeout) { return Object.freeze({ until: now + timeout }); }
export function privateAudioDeadlineOpen(deadline, now) { return now < deadline.until; }
export function privateAudioReady(status, wait) {
    if (wait.kind === 'play')
        return status.eof && status.produced === status.consumed || status.consumed > 0 && Number.isFinite(status.time) && status.time >= wait.target;
    if (wait.kind === 'epoch')
        return status.epoch !== wait.previous && status.ack && status.nativeEpoch === status.ackEpoch;
    if (wait.kind === 'verify')
        return status.consumed > 0 && status.feedbackCount > 0 && status.chains === 1;
    return status.eof && status.produced === status.consumed;
}
