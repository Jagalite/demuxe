// SPDX-License-Identifier: Apache-2.0
export function initialNativeSubtitleTimeline() { return Object.freeze({ serial: 0, tracks: Object.freeze([]), verified: null, suspended: false, queue: Object.freeze([]), active: null, selection: null, verification: null }); }
export function subtitleTimelineCurrent(state, id) { return state.active === id && state.queue.some(operation => operation.id === id); }
export function subtitleTimelineChanging(state) { return state.suspended || state.active !== null || state.queue.length > 0; }
export function subtitleSelection(state, id) { return id === 'no' ? undefined : id === 'auto' ? (state.tracks.find(track => track.external && track.selected) ?? state.tracks.find(track => track.default) ?? state.tracks.find(track => !track.external)) : state.tracks.find(track => track.id === id); }
export function subtitleVerificationNeeded(state) { const selected = state.tracks.find(track => track.selected); return !!selected && state.verified !== selected.mpvId; }
export function subtitleVerificationSample(state, id) {
    if (!subtitleTimelineCurrent(state, id) || !state.verification)
        return undefined;
    const work = state.verification;
    if (work.phase === 'finished')
        return Object.freeze({ kind: 'complete' });
    if (work.phase === 'restore' || work.visible || work.cursor >= work.samples.length)
        return Object.freeze({ kind: 'restore', width: work.width, height: work.height });
    return Object.freeze({ kind: 'sample', seconds: work.samples[work.cursor], width: work.width, height: work.height });
}
export function transitionSubtitleTimeline(state, input) {
    const no = (error) => Object.freeze({ state, accepted: false, ...error ? { error } : {} });
    const patch = (value, extra = {}) => Object.freeze({ state: Object.freeze({ ...state, ...value }), accepted: true, ...extra });
    if (input.kind === 'catalog') {
        if (input.defaultStreamIndex !== undefined && !input.tracks.some(track => track['ff-index'] === input.defaultStreamIndex))
            return no('default');
        return patch({ tracks: Object.freeze(input.tracks.map(track => Object.freeze({ ...track, default: track['ff-index'] === input.defaultStreamIndex }))), verified: null });
    }
    if (input.kind === 'catalog.reset')
        return state.queue.length ? no() : patch({ tracks: Object.freeze([]), verified: null, selection: null, verification: null });
    if (input.kind === 'admit') {
        const id = state.serial + 1;
        return patch({ serial: id, queue: Object.freeze([...state.queue, Object.freeze({ id, kind: input.operation })]) }, { id });
    }
    if (input.kind === 'start') {
        if (state.active !== null || !state.queue.length)
            return no();
        const id = state.queue[0].id;
        return patch({ active: id }, { id });
    }
    if (input.kind === 'suspend')
        return patch({ suspended: input.value });
    if (input.kind === 'retire')
        return patch({ queue: Object.freeze([]), active: null, selection: null, verification: null });
    if (input.kind === 'cancel')
        return state.active === input.id || !state.queue.some(operation => operation.id === input.id) ? no() : patch({ queue: Object.freeze(state.queue.filter(operation => operation.id !== input.id)) });
    if (!subtitleTimelineCurrent(state, input.id))
        return no();
    if (input.kind === 'finish')
        return patch({ queue: Object.freeze(state.queue.filter(operation => operation.id !== input.id)), active: null, selection: null, verification: null });
    if (input.kind === 'select.begin') {
        const track = subtitleSelection(state, input.requested);
        if (track?.selected)
            return Object.freeze({ state, accepted: true, skip: true });
        if (!track && input.requested !== 'no' && input.requested !== 'auto')
            return no('track');
        return patch({ selection: Object.freeze({ previous: state.tracks.find(track => track.selected)?.mpvId ?? null, target: track?.mpvId ?? null }) }, { track, trackId: track?.mpvId ?? -2 });
    }
    if (input.kind === 'select.accept' || input.kind === 'select.rollback') {
        if (!state.selection)
            return no();
        const selected = input.kind === 'select.accept' ? state.selection.target : state.selection.previous;
        return patch({ tracks: Object.freeze(state.tracks.map(track => Object.freeze({ ...track, selected: track.mpvId === selected }))), verified: null, verification: null }, { trackId: selected ?? -2 });
    }
    if (input.kind === 'add') {
        const index = state.tracks.filter(track => track.external).length + 1, track = Object.freeze({ id: String(100000 + index), mpvId: input.mpvId, 'ff-index': -1, type: 'sub', external: true, 'attachment-id': input.attachmentId, 'external-index': index, title: input.title, lang: input.language, codec: input.format });
        return patch({ tracks: Object.freeze([...state.tracks, track]) }, { track });
    }
    if (input.kind === 'remove')
        return patch({ tracks: Object.freeze(state.tracks.filter(track => track.mpvId !== input.track)), verified: state.verified === input.track ? null : state.verified });
    if (input.kind === 'verify.begin') {
        const selected = state.tracks.find(track => track.selected);
        if (!selected || state.verified === selected.mpvId)
            return Object.freeze({ state, accepted: true, skip: true });
        const samples = Object.freeze((selected.external ? [input.seconds] : [input.seconds, 0, 1, 2, 5, 10, 20, 30]).filter((seconds, index, list) => seconds >= 0 && (!Number.isFinite(input.duration) || seconds < input.duration) && list.indexOf(seconds) === index));
        return patch({ verification: Object.freeze({ track: selected.mpvId, external: !!selected.external, width: Math.min(1920, input.width), height: Math.min(1080, input.height), samples, cursor: 0, visible: false, phase: 'samples' }) });
    }
    const work = state.verification;
    if (!work)
        return no();
    if (input.kind === 'verify.sample')
        return work.phase !== 'samples' ? no() : patch({ verification: Object.freeze({ ...work, cursor: work.cursor + 1, visible: work.visible || input.visible }) });
    if (input.kind === 'verify.restore')
        return patch({ verification: Object.freeze({ ...work, phase: 'restore' }) });
    if (input.kind === 'verify.restored')
        return work.phase !== 'restore' ? no() : patch({ verification: Object.freeze({ ...work, phase: 'finished' }) });
    if (input.kind === 'verify.accept') {
        if (work.phase !== 'finished' || !state.tracks.some(track => track.mpvId === work.track && track.selected))
            return no();
        return !work.visible && !work.external ? no('output') : patch({ verified: work.track });
    }
    return no();
}
