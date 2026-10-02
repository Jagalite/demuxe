// SPDX-License-Identifier: Apache-2.0
export function initialElementView() { return Object.freeze({ sourceName: '', sourceId: null, dimensions: '', trackSignature: '', queueSignature: '', queueRenderSignature: '' }); }
export function transitionElementView(state, command) {
    switch (command.type) {
        case 'source': return Object.freeze({ state: Object.freeze({ ...state, sourceName: command.name, sourceId: command.sourceId }), changed: true });
        case 'observe-source': return state.sourceId !== command.sourceId ? Object.freeze({ state: Object.freeze({ ...state, sourceName: '', sourceId: null }), changed: true }) : Object.freeze({ state, changed: false });
        case 'reset-owner': return Object.freeze({ state: Object.freeze({ ...state, dimensions: '', trackSignature: '' }) });
        case 'geometry': {
            if (!command.ratio)
                return Object.freeze({ state, clearAspect: true });
            const key = `${command.width}x${command.height}`, changed = !command.pending && state.dimensions !== key;
            return Object.freeze({ state: changed ? Object.freeze({ ...state, dimensions: key }) : state, aspect: command.ratio, resize: changed ? Object.freeze({ width: command.width, height: command.height }) : undefined });
        }
        case 'tracks': {
            const signature = JSON.stringify([command.audio, command.subtitles, command.policy]);
            return state.trackSignature === signature ? Object.freeze({ state, changed: false }) : Object.freeze({ state: Object.freeze({ ...state, trackSignature: signature }), changed: true });
        }
        case 'queue': {
            const { queue, labels } = command, busy = queue.operation !== null || command.pending;
            const rendered = JSON.stringify([queue.revision, queue.index, busy, command.sourceControls, labels.queue, labels.clearQueue, labels.previous, labels.next, labels.remove, labels.unnamed, labels.open, labels.addFiles]);
            if (state.queueRenderSignature === rendered)
                return Object.freeze({ state, changed: false, rebuild: false });
            const signature = JSON.stringify([queue.revision, labels.remove, labels.unnamed]);
            return Object.freeze({ state: Object.freeze({ ...state, queueRenderSignature: rendered, queueSignature: signature }), changed: true, rebuild: signature !== state.queueSignature });
        }
    }
}
export function elementTitle(state, facts) {
    const title = facts.mode === 'none' ? '' : facts.mode === 'custom' ? facts.title : facts.mode === 'source' ? state.sourceName : facts.title || state.sourceName;
    return Object.freeze({ title, source: state.sourceName || (!facts.terminal && facts.connected && facts.hasSource ? facts.loadedLabel : facts.emptyLabel) });
}
export function elementTrackOptions(list, policy, labels) {
    const selected = list.find(track => track.selected)?.id;
    return Object.freeze({ options: Object.freeze([
            ...(policy?.allowAuto !== false ? [Object.freeze({ label: labels.automatic, id: 'auto' })] : []),
            ...(policy?.allowOff !== false ? [Object.freeze({ label: labels.off, id: '' })] : []),
            ...list.map(track => Object.freeze({ label: track.label, id: track.id })),
        ]), value: selected ?? (policy?.allowOff !== false ? '' : list.length ? '' : 'auto'), disabled: !!policy?.locked || !list.length });
}
export function elementActivity(state, preparation, openingStage, labels) {
    const preparing = preparation.filter(asset => ['queued', 'loading', 'compiling'].includes(asset.status)), ready = preparation.filter(asset => asset.status === 'ready').length;
    const names = { inspector: 'media inspector', hybrid: 'Hybrid', software: 'Software', font: 'subtitle font' }, phase = preparing.find(asset => asset.status === 'compiling') ?? preparing[0];
    const preparationText = phase ? `${phase.status === 'compiling' ? 'Compiling' : 'Loading'} ${names[phase.name]}… · ${ready}/${preparation.length} ready` : preparation.length ? ready === preparation.length ? `Components ready · ${ready}/${preparation.length}` : `Ready · ${ready}/${preparation.length} prepared; others load when needed` : '';
    const activity = state.pendingOperation?.kind === 'opening' ? (phase ? preparationText : openingStage || labels.loading) : state.pendingOperation?.kind === 'switching' ? labels.switching : state.pendingOperation?.kind === 'seeking' ? labels.seeking : state.status === 'buffering' ? labels.buffering : '';
    const pill = activity || (!state.sourceId ? preparationText : '');
    return Object.freeze({ activity, pill, complete: !activity && !phase, description: preparation.length && !activity ? preparation.map(asset => `${names[asset.name]}: ${asset.status}`).join('; ') : pill, announcement: pill || (state.streamType === 'live' && !state.seekable?.length ? labels.noWindow : '') });
}
