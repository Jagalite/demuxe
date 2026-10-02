// SPDX-License-Identifier: Apache-2.0
export function initialPrivateSoftware(buffering) { return Object.freeze({ stopped: false, serial: 0, generation: 0, load: null, playback: null, seek: null, userPaused: true, gain: 1, outputVerified: false, presentedDraws: 0, attachments: Object.freeze([]), buffering: buffering ? Object.freeze({ ...buffering }) : undefined }); }
export function privateSoftwareSourceCurrent(state, generation) { return !state.stopped && state.generation === generation; }
export function privateSoftwareLoadCurrent(state, load) { return !state.stopped && state.load?.id === load.id; }
export function beginPrivateSoftwareLoad(state) {
    if (state.stopped)
        return Object.freeze({ state, load: null });
    const load = Object.freeze({ id: state.serial + 1, generation: state.generation + 1, phase: 'preparing' });
    return Object.freeze({ state: Object.freeze({ ...state, serial: load.id, load }), load });
}
export function startPrivateSoftwareLoad(state, load) {
    if (!privateSoftwareLoadCurrent(state, load) || state.load?.phase !== 'preparing')
        return state;
    return Object.freeze({ ...state, generation: load.generation, load: Object.freeze({ ...load, phase: 'loading' }), playback: null, seek: null, outputVerified: false, presentedDraws: 0, attachments: Object.freeze([]) });
}
export function finishPrivateSoftwareLoad(state, load) { return privateSoftwareLoadCurrent(state, load) && state.load?.phase === 'loading' ? Object.freeze({ ...state, load: Object.freeze({ ...load, phase: 'ready' }) }) : state; }
export function privateSoftwareControlCurrent(state, control) { return privateSoftwareSourceCurrent(state, control.generation) && (control.kind === 'seek' ? state.seek : state.playback)?.id === control.id; }
export function beginPrivateSoftwareControl(state, kind) {
    if (state.stopped)
        return Object.freeze({ state, control: null });
    const control = Object.freeze({ id: state.serial + 1, generation: state.generation, kind });
    return Object.freeze({ state: Object.freeze({ ...state, serial: control.id, ...kind === 'seek' ? { seek: control } : { playback: control } }), control });
}
export function startPrivateSoftwareControl(state, control) { return !privateSoftwareControlCurrent(state, control) || control.kind === 'seek' ? state : Object.freeze({ ...state, userPaused: control.kind === 'pause' }); }
export function finishPrivateSoftwareControl(state, control) { return privateSoftwareControlCurrent(state, control) ? Object.freeze({ ...state, ...control.kind === 'seek' ? { seek: null } : { playback: null } }) : state; }
export function acceptPrivateSoftwarePicture(state, generation, rendered) { return privateSoftwareSourceCurrent(state, generation) ? Object.freeze({ ...state, presentedDraws: rendered }) : state; }
export function privateSoftwareEvidence(state, facts) {
    const videoPresented = facts.video && state.presentedDraws > 0;
    return Object.freeze({ metadata: facts.tracksKnown, audioDecoderConfigured: facts.audioCodec, audioDecoded: facts.audioWritten > 0, audioProgress: facts.audioConsumed > 0, videoPresented, decoderOutput: videoPresented || facts.audioWritten > 0 });
}
export function privateSoftwareReady(state, facts, kind, target = 0) {
    if (kind === 'load')
        return facts.trackCount > 0 && !facts.seeking && (facts.video ? state.presentedDraws > 0 : facts.audio && facts.audioCodec);
    if (kind === 'seek')
        return (!facts.video || state.presentedDraws >= facts.rendered && state.presentedDraws > 0) && !facts.seeking && Math.abs(facts.position - target) < .15;
    const evidence = privateSoftwareEvidence(state, facts);
    return (facts.video || facts.audio) && (!facts.video || evidence.videoPresented) && (!facts.audio || evidence.audioDecoded);
}
export function acceptPrivateSoftwareOutput(state, generation) { return privateSoftwareSourceCurrent(state, generation) ? Object.freeze({ ...state, outputVerified: true }) : state; }
export function privateSoftwareWait(state, generation, now, deadline, ready) {
    if (now >= deadline)
        return 'timeout';
    if (state.stopped)
        return 'closed';
    if (state.generation !== generation)
        return 'retired';
    return ready ? 'ready' : 'wait';
}
export function beginPrivateSoftwareAttachment(state, attachmentId) {
    if (state.stopped)
        return Object.freeze({ state, attachment: null, previous: state.attachments.length });
    const attachment = Object.freeze({ id: state.serial + 1, generation: state.generation, attachmentId });
    return Object.freeze({ state: Object.freeze({ ...state, serial: attachment.id, attachments: Object.freeze([...state.attachments, attachment]) }), attachment, previous: state.attachments.length });
}
export function removePrivateSoftwareAttachment(state, attachment) { return privateSoftwareSourceCurrent(state, attachment.generation) && state.attachments.some(item => item.id === attachment.id) ? Object.freeze({ ...state, attachments: Object.freeze(state.attachments.filter(item => item.id !== attachment.id)) }) : state; }
export function acceptPrivateSoftwareSettings(state, generation, settings) { return privateSoftwareSourceCurrent(state, generation) ? Object.freeze({ ...state, ...settings.gain === undefined ? {} : { gain: settings.gain }, ...settings.buffering === undefined ? {} : { buffering: Object.freeze({ ...settings.buffering }) } }) : state; }
export function retirePrivateSoftware(state) { return state.stopped ? state : Object.freeze({ ...state, stopped: true, load: null, playback: null, seek: null, attachments: Object.freeze([]) }); }
export function privateSoftwareAudioLayout(requested, deviceChannels, rejectFallback) { const wanted = requested === 'auto' ? (deviceChannels >= 8 ? 8 : deviceChannels >= 6 ? 6 : 2) : requested === '7.1' ? 8 : requested === '5.1' ? 6 : 2; return Object.freeze({ channels: wanted <= deviceChannels ? wanted : 2, reject: wanted > deviceChannels && rejectFallback }); }
