// SPDX-License-Identifier: Apache-2.0
export function createPrivateAudioWorker() { return Object.freeze({ phase: 'new', initialized: false, configuredRate: null, contextRunning: false, userPaused: true, loadSerial: 0, load: null, controlSerial: 0, control: null, closeStarted: false, refreshSerial: 0, refreshes: Object.freeze([]) }); }
export function admitAudioWorkerInit(state, rate, contextRunning) {
    const error = state.initialized ? 'Audio host already initialized' : state.phase !== 'new' ? 'Audio host closed' : null;
    return Object.freeze({ state: error ? state : Object.freeze({ ...state, phase: 'initializing', initialized: true, configuredRate: rate, contextRunning }), error });
}
export function audioWorkerInitCurrent(state) { return state.phase === 'initializing'; }
export function finishAudioWorkerInit(state) { return Object.freeze({ state: state.phase === 'initializing' ? Object.freeze({ ...state, phase: 'ready' }) : state, accepted: state.phase === 'initializing' }); }
export function audioWorkerAccepts(state, op) { return op === 'close' || state.phase !== 'closing' && state.phase !== 'closed'; }
export function retireAudioWorker(state) {
    if (state.phase === 'closing' || state.phase === 'closed')
        return Object.freeze({ state, revoke: false, refreshes: Object.freeze([]) });
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'closing', load: null, control: null, userPaused: true, refreshes: Object.freeze([]) }), revoke: true, refreshes: Object.freeze(state.refreshes.map(request => request.id)) });
}
export function beginAudioWorkerClose(state) { return state.closeStarted ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, closeStarted: true }), accepted: true }); }
export function finishAudioWorkerClose(state) { return Object.freeze({ ...state, phase: 'closed', load: null, control: null, refreshes: Object.freeze([]) }); }
export function beginAudioWorkerControl(state, kind, value) {
    if (state.phase !== 'ready' || state.control)
        return Object.freeze({ state, id: null, effects: Object.freeze([]) });
    const id = state.controlSerial + 1, control = Object.freeze({ id, kind, value }), effects = [];
    const next = Object.freeze({ ...state, controlSerial: id, control, contextRunning: kind === 'context' ? value : state.contextRunning, userPaused: kind === 'pause' && value ? true : state.userPaused });
    if (kind === 'context' && value)
        effects.push(Object.freeze({ kind: 'device', running: true }));
    if (kind === 'context' && !value || kind === 'pause' && value)
        effects.push(Object.freeze({ kind: 'pump' }));
    effects.push(Object.freeze({ kind: 'native.pause', paused: kind === 'pause' ? value || !next.contextRunning : !value || next.userPaused }));
    return Object.freeze({ state: next, id, effects: Object.freeze(effects) });
}
export function finishAudioWorkerControl(state, id) {
    const pending = state.control;
    if (state.phase !== 'ready' || pending?.id !== id)
        return Object.freeze({ state, accepted: false, effects: Object.freeze([]) });
    const effect = pending.kind === 'context' && !pending.value ? { kind: 'device', running: false } : { kind: 'pump' };
    return Object.freeze({ state: Object.freeze({ ...state, control: null, userPaused: pending.kind === 'pause' ? pending.value : state.userPaused }), accepted: true, effects: Object.freeze([Object.freeze(effect)]) });
}
export function beginAudioWorkerLoad(state, replace) {
    if (state.phase !== 'ready')
        return Object.freeze({ state, id: null, effect: Object.freeze({ kind: 'error', message: 'Audio host closed' }) });
    const id = state.loadSerial + 1, load = Object.freeze({ id, stage: replace ? 'closing' : 'source', flushPolls: 0, loadPolls: 0 });
    return Object.freeze({ state: Object.freeze({ ...state, loadSerial: id, load, userPaused: replace ? true : state.userPaused, refreshes: Object.freeze([]) }), id, effect: Object.freeze({ kind: replace ? 'close' : 'source' }), retire: Object.freeze(state.refreshes.map(request => request.id)) });
}
export function audioWorkerLoadCurrent(state, id) { return state.phase === 'ready' && state.load?.id === id; }
export function advanceAudioWorkerLoad(state, id, input) {
    const current = state.load;
    const error = (message) => Object.freeze({ state, id, effect: Object.freeze({ kind: 'error', message }) });
    if (!audioWorkerLoadCurrent(state, id) || !current)
        return error('Audio host closing');
    const next = (stage, effect, patch = {}) => Object.freeze({ state: Object.freeze({ ...state, load: Object.freeze({ ...current, ...patch, stage }) }), id, effect: Object.freeze({ ...effect }) });
    if (input.kind === 'closed' && current.stage === 'closing')
        return next('flushing', { kind: 'sample.flush' });
    if (input.kind === 'flush' && current.stage === 'flushing')
        return input.ack ? next('handles', { kind: 'handles' }) : current.flushPolls < 200 ? next('flush-wait', { kind: 'wait', phase: 'flush', ms: 5 }, { flushPolls: current.flushPolls + 1 }) : error('Replacement flush deadline');
    if (input.kind === 'flush.waited' && current.stage === 'flush-wait')
        return next('flushing', { kind: 'sample.flush' });
    if (input.kind === 'handles' && current.stage === 'handles')
        return input.live ? error('Old source handle retained') : next('creating', { kind: 'create' });
    if (input.kind === 'created' && current.stage === 'creating')
        return next('source', { kind: 'source' });
    if (input.kind === 'source.opened' && current.stage === 'source')
        return next('opening', { kind: 'open' });
    if (input.kind === 'opened' && current.stage === 'opening')
        return next('loading', { kind: 'loaded' });
    if (input.kind === 'loaded' && current.stage === 'loading')
        return input.loaded ? next('chains', { kind: 'chains' }) : next('load-wait', { kind: 'wait', phase: 'loaded', ms: 5 }, { loadPolls: current.loadPolls + 1 });
    if (input.kind === 'load.waited' && current.stage === 'load-wait')
        return current.loadPolls < 1000 ? next('loading', { kind: 'loaded' }) : error('Load deadline');
    if (input.kind === 'chains' && current.stage === 'chains')
        return next('loaded', { kind: 'done' });
    return error('Audio load phase mismatch');
}
export function admitAudioWorkerRefresh(state, load, now) {
    if (!audioWorkerLoadCurrent(state, load))
        return Object.freeze({ state, request: null });
    const request = Object.freeze({ id: state.refreshSerial + 1, load, deadline: now + 5000 });
    return Object.freeze({ state: Object.freeze({ ...state, refreshSerial: request.id, refreshes: Object.freeze([...state.refreshes, request]) }), request });
}
export function settleAudioWorkerRefresh(state, id, input) {
    const request = state.refreshes.find(entry => entry.id === id);
    if (!request || input.kind === 'deadline' && input.now < request.deadline)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, refreshes: Object.freeze(state.refreshes.filter(entry => entry.id !== id)) }), accepted: true });
}
