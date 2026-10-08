// SPDX-License-Identifier: Apache-2.0
export function initialPresentationState() {
    return Object.freeze({ disposed: false, nextRequest: 1, targetOverride: false, viewportVersion: 0, viewportOwner: null, fullscreen: null, pip: null });
}
function result(state) { return Object.freeze({ state: Object.freeze({ ...state }) }); }
function failure(state, code, message, retired = false) {
    return Object.freeze({ state, error: Object.freeze({ code, message }), retired });
}
/** Browser observations are sampled by the caller immediately before admission
 * or completion. Requests stay pending after retirement until physical settlement. */
export function transitionPresentation(state, command) {
    switch (command.type) {
        case 'fullscreen.settled': return result(state.fullscreen?.id === command.id ? { ...state, fullscreen: null } : state);
        case 'pip.settled': return result(state.pip?.id === command.id ? { ...state, pip: null } : state);
        case 'fullscreen.check': return state.disposed || state.fullscreen?.id !== command.id || state.fullscreen.retired || !command.containsHost
            ? failure(state, 'ABORTED', 'Fullscreen request was retired', true) : result(state);
        case 'pip.check': return state.disposed || state.pip?.id !== command.id || state.pip.retired || state.pip.kind === 'video' && (!command.sameSurface || command.subtitles)
            ? failure(state, 'ABORTED', 'Presentation request was retired', true) : result(state);
        case 'destroy': return result(state.disposed ? state : { ...state, disposed: true, viewportOwner: null, viewportVersion: state.viewportVersion + 1, fullscreen: state.fullscreen ? Object.freeze({ ...state.fullscreen, retired: true }) : null, pip: state.pip ? Object.freeze({ ...state.pip, retired: true }) : null });
    }
    if (state.disposed)
        return failure(state, 'ABORTED', 'Presentation controller is destroyed');
    switch (command.type) {
        case 'viewport.replace': return Object.freeze({ state: Object.freeze({ ...state, viewportVersion: state.viewportVersion + 1 }), requestId: state.viewportVersion + 1 });
        case 'viewport.check': return state.viewportVersion === command.id ? result(state) : failure(state, 'ABORTED', 'Viewport adapter replacement was retired');
        case 'viewport.install': return state.viewportVersion === command.id ? result({ ...state, viewportOwner: command.present ? command.id : null }) : failure(state, 'ABORTED', 'Viewport adapter replacement was retired');
        case 'viewport.remove': return result(state.viewportOwner === command.id ? { ...state, viewportOwner: null } : state);
        case 'viewport.request':
            if (state.viewportOwner === null || !command.available)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Browser-viewport expansion is unavailable');
            if (state.fullscreen || state.pip || command.nativePresentation)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Settle and exit fullscreen or Picture-in-Picture before expanding the viewport');
            return Object.freeze({ state, requestId: state.viewportVersion });
        case 'metadata.check':
            if (!Number.isSafeInteger(command.sourceId) || command.sourceId < 1)
                return failure(state, 'INVALID_ARGUMENT', 'Expected a loaded source ID');
            return metadataSourceCurrent(command.sourceId, command.currentSourceId) ? result(state) : failure(state, 'ABORTED', 'Media Session metadata source was retired');
        case 'target':
            if (state.fullscreen || command.fullscreen)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Exit fullscreen before changing its target');
            if (command.override && !command.containsHost)
                return failure(state, 'INVALID_ARGUMENT', 'Fullscreen target must contain the presentation host');
            return result({ ...state, targetOverride: command.override });
        case 'fullscreen.request': {
            if (state.fullscreen)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Fullscreen entry is already pending');
            if (!command.containsHost)
                return failure(state, 'INVALID_ARGUMENT', 'Fullscreen target no longer contains the presentation host');
            if (!command.supported)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Fullscreen is unavailable');
            const id = state.nextRequest;
            return Object.freeze({ state: Object.freeze({ ...state, nextRequest: id + 1, fullscreen: Object.freeze({ id, retired: false }) }), requestId: id });
        }
        case 'fullscreen.exit': return result({ ...state, fullscreen: state.fullscreen ? Object.freeze({ ...state.fullscreen, retired: true }) : null });
        case 'pip.request': {
            if (command.kind !== 'video' && command.kind !== 'document')
                return failure(state, 'INVALID_ARGUMENT', 'Unknown Picture-in-Picture mode');
            if (state.pip)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Picture-in-Picture entry is already pending');
            if (command.kind === 'document' && !command.supported)
                return failure(state, 'UNSUPPORTED_FEATURE', 'Document Picture-in-Picture is unavailable');
            if (command.kind === 'video' && (!command.supported || !command.eligible))
                return failure(state, 'UNSUPPORTED_FEATURE', 'Video Picture-in-Picture requires a Native surface without subtitle composition');
            if (command.kind === 'document' && command.documentOpen)
                return result(state);
            const id = state.nextRequest;
            return Object.freeze({ state: Object.freeze({ ...state, nextRequest: id + 1, pip: Object.freeze({ id, retired: false, kind: command.kind }) }), requestId: id });
        }
        case 'pip.exit': return result({ ...state, pip: state.pip ? Object.freeze({ ...state.pip, retired: true }) : null });
    }
}
export function projectPresentation(observation) {
    return Object.freeze({ fullscreen: observation.fullscreen, viewportExpanded: !!observation.viewportExpanded, pictureInPicture: observation.documentPiP ? 'document' : observation.videoPiP ? 'video' : null, mediaSession: observation.mediaSession });
}
export function presentationLocksSurface(state, videoPiP) {
    return state.pip?.kind === 'video' || videoPiP;
}
export function initialMediaSessionLease() { return Object.freeze({ nextOwner: 1, serial: 0, owner: null, phase: 'idle' }); }
export function allocateMediaSessionOwner(state) { return Object.freeze({ state: Object.freeze({ ...state, nextOwner: state.nextOwner + 1 }), owner: state.nextOwner }); }
export function ownsMediaSession(state, owner, serial = state.serial) { return state.owner === owner && state.serial === serial; }
export function transitionMediaSession(state, command) {
    if (command.type === 'acquire') {
        if (state.owner !== null)
            return Object.freeze({ state, outcome: state.owner === command.owner ? 'retained' : 'denied' });
        return Object.freeze({ state: Object.freeze({ ...state, serial: state.serial + 1, owner: command.owner, phase: 'installing' }), outcome: 'acquired' });
    }
    if (!ownsMediaSession(state, command.owner, command.serial))
        return Object.freeze({ state, outcome: 'ignored' });
    return command.type === 'activate'
        ? Object.freeze({ state: Object.freeze({ ...state, phase: 'active' }), outcome: 'activated' })
        : Object.freeze({ state: Object.freeze({ ...state, owner: null, phase: 'idle' }), outcome: 'released' });
}
export function metadataSourceCurrent(sourceId, currentSourceId) { return sourceId !== undefined && sourceId === currentSourceId; }
