// SPDX-License-Identifier: Apache-2.0
export function initialNativeCaptions() { return Object.freeze({ visible: true, selected: 'auto', revision: 0, selectionSerial: 0, nextIndex: 1, effect: null, queued: Object.freeze([]), attachments: Object.freeze([]) }); }
export function nativeCaptionCurrent(state, request) { return state.attachments.some(item => item.request.id === request.id && item.request.epoch === request.epoch); }
export function nativeCaptionAttachment(state, id) { return state.attachments.find(item => item.request.id === id); }
export function beginNativeCaption(state, request, kind, attachmentId, now) { return Object.freeze({ ...state, attachments: Object.freeze([...state.attachments, Object.freeze({ request: Object.freeze({ ...request }), kind, attachmentId, phase: 'pending', deadline: kind === 'overlay' ? null : now + 15000, index: null, publicId: null })]) }); }
export function acceptNativeCaption(state, request, publicId, select) {
    const entry = nativeCaptionAttachment(state, request.id);
    if (!entry || !nativeCaptionCurrent(state, request) || entry.phase !== 'pending')
        return state;
    const index = entry.kind === 'browser-file' ? state.nextIndex : null;
    return Object.freeze({ ...state, nextIndex: index === null ? state.nextIndex : index + 1, attachments: Object.freeze(state.attachments.map(item => item !== entry ? item : Object.freeze({ ...entry, phase: 'accepted', index, publicId: index === null ? publicId : String(200000 + index) }))), ...entry.kind === 'overlay' && select && publicId !== null && nativeCaptionMaySelect(state, request) ? { selected: publicId, revision: state.revision + 1, selectionSerial: request.id } : {} });
}
export function finishNativeCaption(state, request) { const entry = nativeCaptionAttachment(state, request.id); return !entry || entry.phase === 'accepted' || !nativeCaptionCurrent(state, request) ? state : Object.freeze({ ...state, attachments: Object.freeze(state.attachments.filter(item => item !== entry)) }); }
export function retireNativeCaptions(state) { return Object.freeze({ ...state, revision: state.revision + 1, nextIndex: 1, effect: null, queued: Object.freeze([]), attachments: Object.freeze([]) }); }
export function updateNativeCaptionSelection(state, change) { return Object.freeze({ ...state, revision: state.revision + 1, ...change.selected === undefined ? {} : { selected: change.selected }, ...change.visible === undefined ? {} : { visible: change.visible } }); }
export function nativeCaptionRemaining(state, request, now) { const item = nativeCaptionAttachment(state, request.id); return item?.phase === 'pending' && item.deadline !== null && nativeCaptionCurrent(state, request) ? Math.max(0, item.deadline - now) : undefined; }
export function selectNativeCaptionPresentation(state, facts) {
    const autoIndex = facts.preferredIndex ?? facts.tracks.findIndex(track => !track.caption);
    return Object.freeze({ overlay: state.visible && state.selected !== 'no' && facts.overlaySelected, modes: Object.freeze(facts.tracks.map((track, index) => state.visible && !facts.overlaySelected && state.selected !== 'no' && (state.selected === 'auto' ? index === autoIndex : track.id === state.selected) ? 'showing' : 'disabled')) });
}
export function nativeOverlayAdmission(facts) { return facts.adapted && facts.adaptation === 'opus' ? 'Native Opus plus external subtitles is not qualified' : !facts.enabled || !['ass', 'ssa', 'srt', 'vtt'].includes(facts.format) ? 'Native external subtitles require explicit experimental admission' : undefined; }
export function nativeCaptionFidelity(expected, actual, bias) { return actual.length === expected.length && actual.every((cue, index) => !(Math.abs(cue.start - bias - expected[index].start) > 1e-6 || Math.abs(cue.end - bias - expected[index].end) > 1e-6 || cue.text !== expected[index].text)); }
export function removeNativeCaption(state, request) { return nativeCaptionCurrent(state, request) ? Object.freeze({ ...state, attachments: Object.freeze(state.attachments.filter(item => item.request.id !== request.id)) }) : state; }
export function nativeCaptionMaySelect(state, request) { return nativeCaptionCurrent(state, request) && state.selectionSerial <= request.id; }
export function beginNativeCaptionSelection(state, id) { return Object.freeze({ ...state, selectionSerial: id }); }
export function queueNativeCaptionEffect(state, request, currentIds) {
    if (state.effect?.id === request.id || state.queued.some(item => item.id === request.id))
        return Object.freeze({ state });
    const queued = state.queued.filter(item => currentIds.includes(item.id)), owned = Object.freeze({ ...request });
    return state.effect ? Object.freeze({ state: Object.freeze({ ...state, queued: Object.freeze([...queued, owned]) }) }) : Object.freeze({ state: Object.freeze({ ...state, effect: owned, queued: Object.freeze(queued) }), start: owned });
}
export function finishNativeCaptionEffect(state, request, currentIds) {
    if (state.effect?.id !== request.id || state.effect.epoch !== request.epoch)
        return Object.freeze({ state });
    const queued = state.queued.filter(item => currentIds.includes(item.id)), start = queued[0];
    return Object.freeze({ state: Object.freeze({ ...state, effect: start ?? null, queued: Object.freeze(queued.slice(1)) }), ...start ? { start } : {} });
}
