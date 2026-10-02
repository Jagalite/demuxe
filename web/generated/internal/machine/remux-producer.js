// SPDX-License-Identifier: Apache-2.0
export function initialRemuxProducer() { return Object.freeze({ epoch: 0, serial: 0, active: null, phase: 'new', initialized: false, negotiation: null, fragmentDelivery: 'gather', progressiveEnabled: false, batchBytes: 0, emptyBatches: 0 }); }
export function remuxProducerCurrent(state, operation) { return state.active?.id === operation.id && state.epoch === operation.epoch && state.phase !== 'closed' && state.phase !== 'failed'; }
export function transitionRemuxProducer(state, command) {
    const result = (next, extra = {}, accepted = true) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), accepted, ...extra });
    if (command.type === 'close') {
        if (state.phase === 'closing' || state.phase === 'closed')
            return result(state, {}, false);
        const operation = Object.freeze({ id: state.serial + 1, epoch: state.epoch + 1, kind: 'close', requestId: undefined });
        return result({ ...state, serial: operation.id, epoch: operation.epoch, active: operation, phase: 'closing', negotiation: null, batchBytes: 0 }, { operation, closeNative: state.active === null });
    }
    if (command.type === 'begin') {
        if (['closing', 'closed', 'failed'].includes(state.phase))
            return result(state, {}, false);
        if (state.active)
            return result(state, { error: 'Concurrent remux operation rejected' }, false);
        if (!['init', 'probe', 'select-container', 'next'].includes(command.kind))
            return result(state, {}, false);
        if ((command.kind === 'init' || command.kind === 'probe') && state.initialized)
            return result(state, { error: 'Remux worker already initialized' }, false);
        if (command.kind === 'select-container' && state.phase !== 'negotiating')
            return result(state, { error: 'Invalid remux container selection' }, false);
        if (command.kind === 'next' && state.phase !== 'ready')
            return result(state, { error: 'Remux worker is not ready' }, false);
        const operation = Object.freeze({ id: state.serial + 1, epoch: state.epoch, kind: command.kind, requestId: command.requestId });
        return result({ ...state, serial: operation.id, active: operation, phase: command.kind === 'init' || command.kind === 'probe' ? 'initializing' : state.phase, fragmentDelivery: command.kind === 'init' || command.kind === 'probe' ? command.fragmentDelivery ?? 'gather' : state.fragmentDelivery }, { operation });
    }
    if (!remuxProducerCurrent(state, command.operation))
        return result(state, {}, false);
    if (command.type === 'engine')
        return result({ ...state, initialized: true });
    if (command.type === 'negotiate') {
        const value = command.value;
        if (!value.candidates.length)
            return result(state, { error: 'Selected codecs have no common browser remux packaging' }, false);
        const negotiation = Object.freeze({ ...value, candidates: Object.freeze(value.candidates.map(candidate => Object.freeze({ container: candidate.container, mime: candidate.mime }))) });
        return result({ ...state, negotiation, phase: 'negotiating' });
    }
    if (command.type === 'select') {
        const negotiation = state.negotiation, selected = negotiation?.candidates.find(candidate => candidate.container === command.container);
        if (!negotiation || !selected)
            return result(state, { error: 'Invalid remux container selection' }, false);
        return result({ ...state, negotiation: null, phase: 'starting', progressiveEnabled: selected.container === 'mp4' && !negotiation.windowed && !command.preparationInterface }, { selected, negotiation });
    }
    if (command.type === 'bytes') {
        const batchBytes = state.batchBytes + command.bytes;
        return result({ ...state, batchBytes }, batchBytes > 8 * 1024 * 1024 ? { error: 'Fragment budget exceeded' } : {});
    }
    if (command.type === 'batch') {
        const mode = command.more === undefined ? 'gather' : command.progressive ? 'progressive' : state.progressiveEnabled && state.fragmentDelivery !== 'gather' && state.batchBytes >= 131072 && command.chunks > 1 && command.chunks <= 32 ? 'separate' : 'gather';
        const emptyBatches = command.more === undefined ? state.emptyBatches : state.batchBytes || mode !== 'gather' ? 0 : state.emptyBatches + 1;
        return result({ ...state, batchBytes: 0, emptyBatches }, { mode, bytes: state.batchBytes, ...command.more && emptyBatches > 24 ? { error: 'Remux random-access interval exceeds fragment production budget' } : {} });
    }
    if (command.type === 'failure')
        return result({ ...state, active: null, phase: 'failed', negotiation: null, batchBytes: 0 });
    return result({ ...state, active: null, phase: command.operation.kind === 'close' ? 'closed' : command.operation.kind === 'probe' ? 'probed' : command.operation.kind === 'select-container' ? 'ready' : state.phase });
}
export function remuxProducerTail(facts) {
    const { adaptation, videoEnd, audioEnd } = facts, ends = (videoEnd ?? 0) > 0 && (audioEnd ?? 0) > 0, unequal = ends && Math.abs(videoEnd - audioEnd) > 1, duration = adaptation && ends ? Math.max(videoEnd, audioEnd) : facts.duration;
    const error = adaptation === 'flac24' && unequal ? 'Unsupported FLAC24 unequal-track tails; use AudioWorklet' : adaptation === 'flac' && unequal && (!facts.pcmAudio || !facts.h264Video) ? 'Unsupported unequal-tail Native configuration; qualified H264 and PCM16/24 are required' : undefined;
    return Object.freeze({ duration, decodeTarget: adaptation === 'flac24' && (audioEnd ?? 0) > 0 && audioEnd < videoEnd && facts.target >= audioEnd ? Math.max(0, audioEnd - .5) : facts.target, windowed: adaptation === 'flac' && unequal, ...error ? { error } : {} });
}
