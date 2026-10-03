// SPDX-License-Identifier: Apache-2.0
export function initialPlaybackHost(channels = 2, fatalCommandErrors = true) {
    if (![2, 6, 8].includes(channels))
        throw Error('Invalid private audio channel count');
    return Object.freeze({ workSerial: 0, queue: Object.freeze([]), activeWork: null, phase: 'active', epoch: 0, creating: false, created: false, duration: null, seekPreroll: 2, sourceFailed: false, renderWidth: null, renderHeight: null, draws: 0, events: 0, fatalCommandErrors, channels });
}
export function playbackHostCurrent(state, epoch) { return state.phase === 'active' && state.epoch === epoch; }
export function beginPlaybackHostCreate(state, epoch) {
    if (!playbackHostCurrent(state, epoch))
        throw Error('Playback host closed or replaced');
    if (state.created || state.creating)
        throw Error('Playback host already created');
    return Object.freeze({ ...state, creating: true });
}
// Native success creates a cleanup obligation even when retirement happened while
// the native call was suspended. It never revives admission or output authority.
export function finishPlaybackHostCreate(state, success) { return Object.freeze({ ...state, creating: false, created: state.created || success }); }
export function playbackHostNativeDestroyed(state) { return state.created ? Object.freeze({ ...state, created: false }) : state; }
export function resetPlaybackHostSource(state) {
    if (state.phase !== 'active')
        throw Error('Playback host closed');
    if (!Number.isSafeInteger(state.epoch + 1))
        throw Error('Playback host identity exhausted');
    return Object.freeze({ ...state, epoch: state.epoch + 1, queue: Object.freeze([]), duration: null, sourceFailed: false, draws: 0, events: 0, renderWidth: null, renderHeight: null });
}
export function setPlaybackHostPreroll(state, duration) { return state.phase === 'active' ? Object.freeze({ ...state, seekPreroll: Number.isFinite(duration) && duration > 0 ? Math.min(60, duration) : 2 }) : state; }
export function playbackHostSeekPreroll(state, position) { return state.duration !== null && state.duration > 0 && state.duration <= 60 ? Math.max(state.seekPreroll, Math.min(position + 1, state.duration)) : state.seekPreroll; }
export function observePlaybackHostEvent(state, epoch, event) {
    if (!playbackHostCurrent(state, epoch))
        return Object.freeze({ state, accepted: false, fatal: false, trim: false });
    const fatal = state.fatalCommandErrors && event.kind === 'command-reply' && !!event.error && event.error !== 'success';
    if (fatal)
        return Object.freeze({ state, accepted: false, fatal: true, trim: false });
    const duration = event.kind === 'property-change' && event.name === 'duration' ? (Number.isFinite(event.duration) ? event.duration : null) : state.duration;
    return Object.freeze({ state: Object.freeze({ ...state, duration, events: Math.min(256, state.events + 1) }), accepted: true, fatal: false, trim: state.events === 256 });
}
export function playbackHostEventBudget() { return 64; }
export function failPlaybackHostSource(state, epoch) { return playbackHostCurrent(state, epoch) ? Object.freeze({ ...state, sourceFailed: true }) : state; }
export function beginPlaybackHostRender(state, epoch, width, height, force) {
    if (!playbackHostCurrent(state, epoch))
        return Object.freeze({ state, accepted: false, force: false });
    const resized = state.renderWidth !== width || state.renderHeight !== height;
    return Object.freeze({ state: resized ? Object.freeze({ ...state, renderWidth: width, renderHeight: height }) : state, accepted: true, force: force || resized });
}
export function presentPlaybackHost(state, epoch) { return playbackHostCurrent(state, epoch) ? Object.freeze({ ...state, draws: Math.min(Number.MAX_SAFE_INTEGER, state.draws + 1) }) : state; }
export function closePlaybackHost(state) { return state.phase === 'active' ? Object.freeze({ ...state, phase: 'closing', queue: Object.freeze([]) }) : state; }
export function finishPlaybackHostClose(state) { return state.phase === 'closed' ? state : Object.freeze({ ...state, phase: 'closed', created: false, creating: false }); }
export function playbackHostFailureCurrent(failureGeneration, generation) { return failureGeneration === undefined || failureGeneration === generation; }
export function admitPlaybackHostWork(state, cleanup = false) {
    if (cleanup ? state.phase !== 'closing' || state.queue.some(work => work.cleanup) || state.activeWork?.cleanup : state.phase !== 'active')
        return Object.freeze({ state, error: 'Playback host closed or replaced' });
    if (!cleanup && state.queue.length + (state.activeWork ? 1 : 0) >= 128)
        return Object.freeze({ state, error: 'Playback host queue capacity' });
    if (!cleanup && !Number.isSafeInteger(state.workSerial + 1))
        return Object.freeze({ state, error: 'Playback host work identity exhausted' });
    const work = Object.freeze({ id: cleanup ? 0 : state.workSerial + 1, epoch: state.epoch, cleanup });
    return Object.freeze({ state: Object.freeze({ ...state, workSerial: cleanup ? state.workSerial : work.id, queue: Object.freeze([...state.queue, work]) }), work });
}
export function startPlaybackHostWork(state) {
    if (state.activeWork || !state.queue.length)
        return Object.freeze({ state });
    const work = state.queue[0];
    return Object.freeze({ state: Object.freeze({ ...state, queue: Object.freeze(state.queue.slice(1)), activeWork: work }), work });
}
export function finishPlaybackHostWork(state, id) { return state.activeWork?.id === id ? Object.freeze({ ...state, activeWork: null }) : state; }
