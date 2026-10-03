// SPDX-License-Identifier: Apache-2.0
export function initialShakaBackend(buffering) { return Object.freeze({ epoch: 0, serial: 0, phase: 'idle', allocated: false, effect: null, requests: Object.freeze([]), source: null, failure: null, buffering: Object.freeze({ ...buffering }), bufferingDefaults: Object.freeze({}), quality: Object.freeze({ mode: 'auto' }), runtimeQuality: false, observedQuality: null, selectionSerial: 0, visible: true, selectedSub: 'auto', audioDisabled: false, attachmentIssued: Object.freeze([]), attachmentUncertain: 0, external: Object.freeze([]) }); }
export function shakaLeaseCurrent(state, lease) { return state.phase !== 'closed' && state.epoch === lease.epoch && state.requests.some(item => item.id === lease.id && item.domain === lease.domain); }
export function transitionShakaBackend(state, command) {
    const result = (next, accepted = true, lease) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), accepted, ...lease ? { lease } : {} });
    if (command.type === 'close')
        return state.phase === 'closed' ? result(state, false) : result({ ...state, epoch: state.epoch + 1, phase: 'closed', requests: Object.freeze([]), source: null, attachmentIssued: Object.freeze([]), attachmentUncertain: 0, external: Object.freeze([]), observedQuality: null, failure: null });
    if (command.type === 'leave')
        return state.effect?.id === command.lease.id && state.effect.epoch === command.lease.epoch && state.effect.domain === command.lease.domain ? result({ ...state, effect: null }) : result(state, false);
    if (state.phase === 'closed')
        return result(state, false);
    if (command.type === 'open') {
        if (state.allocated || state.phase === 'opening')
            return result(state, false);
        const lease = Object.freeze({ epoch: state.epoch + 1, id: state.serial + 1, domain: 'load' });
        return result({ ...state, epoch: lease.epoch, serial: lease.id, phase: 'opening', source: Object.freeze({ ...command.source }), failure: null, observedQuality: null, runtimeQuality: false, quality: Object.freeze({ mode: 'auto', ...command.source.maxBandwidth !== undefined ? { maxBandwidth: command.source.maxBandwidth } : {} }), requests: Object.freeze([lease]) }, true, lease);
    }
    if (command.type === 'begin') {
        if (command.domain === 'attachment' && state.external.length + state.requests.filter(lease => lease.domain === 'attachment').length + state.attachmentUncertain >= 16)
            return Object.freeze({ ...result(state, false), reason: 'capacity' });
        const lease = Object.freeze({ epoch: state.epoch, id: state.serial + 1, domain: command.domain });
        // Attachments coexist; settings supersede only their own domain.
        return result({ ...state, serial: lease.id, ...command.domain === 'selection' ? { selectionSerial: lease.id } : {}, requests: Object.freeze([...state.requests.filter(item => command.domain === 'attachment' || (command.domain === 'quality' || command.domain === 'audio' ? item.domain !== 'quality' && item.domain !== 'audio' : item.domain !== command.domain)), lease]) }, true, lease);
    }
    if (command.type === 'failure')
        return command.epoch !== state.epoch ? result(state, false) : result({ ...state, serial: state.serial + 1, failure: state.serial + 1 });
    if (command.type === 'observed')
        return command.epoch !== state.epoch ? result(state, false) : result({ ...state, observedQuality: command.value ? Object.freeze({ ...command.value }) : null });
    const lease = command.lease;
    if (!shakaLeaseCurrent(state, lease))
        return result(state, false);
    const finish = () => Object.freeze(state.requests.filter(item => item.id !== lease.id));
    switch (command.type) {
        case 'enter': return state.effect ? result(state, false) : result({ ...state, effect: lease });
        case 'allocate': return lease.domain !== 'load' ? result(state, false) : result({ ...state, allocated: true });
        case 'opened':
        case 'failed': return lease.domain !== 'load' ? result(state, false) : result({ ...state, phase: command.type === 'opened' ? 'ready' : 'failed', requests: finish() });
        case 'finish': return result({ ...state, requests: finish(), attachmentIssued: Object.freeze(state.attachmentIssued.filter(id => id !== lease.id)), attachmentUncertain: state.attachmentUncertain + (state.attachmentIssued.includes(lease.id) ? 1 : 0) });
        case 'attachment.issued': return lease.domain !== 'attachment' || state.attachmentIssued.includes(lease.id) ? result(state, false) : result({ ...state, attachmentIssued: Object.freeze([...state.attachmentIssued, lease.id]) });
        case 'defaults': return lease.domain !== 'load' ? result(state, false) : result({ ...state, bufferingDefaults: Object.freeze({ ...command.value }) });
        case 'quality': return !['load', 'quality', 'audio'].includes(lease.domain) ? result(state, false) : result({ ...state, quality: Object.freeze({ ...command.value }), runtimeQuality: command.runtime });
        case 'buffering': return lease.domain !== 'buffering' ? result(state, false) : result({ ...state, buffering: Object.freeze({ ...command.value }) });
        case 'selection': return !['selection', 'audio'].includes(lease.domain) ? result(state, false) : result({ ...state, ...command.audioDisabled !== undefined ? { audioDisabled: command.audioDisabled } : {}, ...command.selectedSub !== undefined ? { selectedSub: command.selectedSub } : {}, ...command.visible !== undefined ? { visible: command.visible } : {} });
        case 'attached': return lease.domain !== 'attachment' ? result(state, false) : result({ ...state, attachmentIssued: Object.freeze(state.attachmentIssued.filter(id => id !== lease.id)), external: Object.freeze([...state.external, Object.freeze({ id: command.id, index: state.external.length + 1, request: lease.id, attachmentId: command.attachmentId })]), ...command.select && shakaAttachmentSelect(state, lease) ? { selectedSub: `shaka-sub-${command.id}`, selectionSerial: lease.id } : {}, requests: finish() });
    }
}
export function shakaRepresentationMatches(track, pin) {
    const token = /^variant:(\d+)$/.exec(pin);
    return token ? String(track.id) === token[1] : track.originalVideoId === pin || (!track.videoCodec && track.originalAudioId === pin);
}
export function shakaQualityCandidates(state, tracks) {
    const active = tracks.find(track => track.active), source = state.source;
    return Object.freeze(tracks.filter(track => (!active || track.audioIdentity === active.audioIdentity) && track.bandwidth <= (source?.maxBandwidth ?? Infinity) && (!source?.representation || shakaRepresentationMatches(track, source.representation))).map(track => track.id));
}
export function shakaQualityPlan(state, tracks, policy) {
    const candidates = shakaQualityCandidates(state, tracks), ids = Object.freeze(tracks.filter(track => candidates.includes(track.id) && (policy.mode === 'manual' ? `variant:${track.id}` === policy.id : (track.height ?? 0) <= (policy.maxHeight ?? Infinity) && track.bandwidth <= (policy.maxBandwidth ?? Infinity))).map(track => track.id));
    return Object.freeze({ ...(policy.mode === 'auto' && state.source?.representation ? { failure: 'source-pin' } : !ids.length ? { failure: 'no-quality' } : {}), ids, abr: policy.mode === 'auto', maxHeight: policy.mode === 'auto' ? (policy.maxHeight ?? Infinity) : Infinity, maxBandwidth: Math.min(state.source?.maxBandwidth ?? Infinity, policy.mode === 'auto' ? (policy.maxBandwidth ?? Infinity) : Infinity) });
}
export function shakaAttachmentSelect(state, lease) { return lease.domain === 'attachment' && shakaLeaseCurrent(state, lease) && state.selectionSerial <= lease.id; }
