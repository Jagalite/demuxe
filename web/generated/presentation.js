// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './internal/errors.js';
import { initialPresentationState, transitionPresentation, projectPresentation, presentationLocksSurface, initialMediaSessionLease, allocateMediaSessionOwner, transitionMediaSession, ownsMediaSession, } from './internal/machine/presentation.js';
const documentLeases = new WeakMap();
/** Optional browser presentation controls. Calls requiring activation must come from a gesture. */
export class PlayerPresentation {
    player;
    host;
    control = initialPresentationState();
    fullscreenTarget;
    pipWindow;
    restore;
    subscription;
    leaseValue;
    ownerValue;
    documentValue;
    // Player constructs this facade in a field initializer, before creating its host.
    constructor(player, host) {
        this.player = player;
        this.host = host;
    }
    get ownerDocument() { return this.documentValue ?? (this.documentValue = this.host().ownerDocument); }
    get lease() {
        if (this.leaseValue)
            return this.leaseValue;
        let lease = documentLeases.get(this.ownerDocument);
        if (!lease) {
            lease = { state: initialMediaSessionLease() };
            documentLeases.set(this.ownerDocument, lease);
        }
        const allocated = allocateMediaSessionOwner(lease.state);
        lease.state = allocated.state;
        this.ownerValue = allocated.owner;
        return this.leaseValue = lease;
    }
    get owner() { void this.lease; return this.ownerValue; }
    transition(command) { const decision = transitionPresentation(this.control, command); this.control = decision.state; return decision; }
    accept(command) { const decision = this.transition(command); if (decision.error)
        throw new PlayerError(decision.error.code, decision.error.message); return decision; }
    containsHost(target) { let node = this.host(); while (node && node !== target)
        node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null); return node === target && target.ownerDocument === this.host().ownerDocument; }
    /** Explicit complete-container target, including shadow-DOM composition. */
    setFullscreenTarget(target) {
        this.accept({ type: 'target', override: !!target, fullscreen: this.host().ownerDocument.fullscreenElement === this.fullscreenHost(), containsHost: !target || this.containsHost(target) });
        this.fullscreenTarget = target ?? undefined;
    }
    fullscreenHost() { return this.control.targetOverride ? this.fullscreenTarget : this.host(); }
    videoPiP() { return !!this.player.surface && this.ownerDocument.pictureInPictureElement === this.player.surface; }
    get state() { return projectPresentation({ fullscreen: this.host().ownerDocument.fullscreenElement === this.fullscreenHost(), documentPiP: !!this.pipWindow && !this.pipWindow.closed, videoPiP: this.videoPiP(), mediaSession: ownsMediaSession(this.lease.state, this.owner) }); }
    get locksSurface() { return presentationLocksSurface(this.control, this.videoPiP()); }
    async requestFullscreen() {
        const host = this.fullscreenHost();
        const { requestId: id } = this.accept({ type: 'fullscreen.request', containsHost: this.containsHost(host), supported: typeof host.requestFullscreen === 'function' });
        try {
            // Invoke on the initiating gesture stack, before awaiting completion.
            await host.requestFullscreen();
            const decision = this.transition({ type: 'fullscreen.check', id: id, containsHost: this.containsHost(host) });
            if (decision.error) {
                if (host.ownerDocument.fullscreenElement === host)
                    await host.ownerDocument.exitFullscreen();
                throw new PlayerError(decision.error.code, decision.error.message);
            }
        }
        finally {
            this.transition({ type: 'fullscreen.settled', id: id });
        }
    }
    async exitFullscreen() { this.accept({ type: 'fullscreen.exit' }); const host = this.fullscreenHost(); if (host.ownerDocument.fullscreenElement === host)
        await host.ownerDocument.exitFullscreen(); }
    async requestPictureInPicture(kind = 'video') {
        // Capture the owning document before document PiP reparents the host.
        void this.ownerDocument;
        const api = globalThis.documentPictureInPicture;
        const surface = this.player.surface;
        const video = typeof HTMLVideoElement !== 'undefined' && surface instanceof HTMLVideoElement;
        const { requestId: id } = this.accept({ type: 'pip.request', kind, supported: kind === 'document' ? !!api : video && typeof surface.requestPictureInPicture === 'function', eligible: kind === 'document' || video && !surface.disablePictureInPicture && !(this.player.state.subtitlesVisible && this.player.state.mediaInfo.subtitle), documentOpen: !!this.pipWindow && !this.pipWindow.closed });
        if (id === undefined)
            return;
        try {
            if (kind === 'document') {
                const win = await api.requestWindow({ width: 640, height: 360 });
                const decision = this.transition({ type: 'pip.check', id, sameSurface: true, subtitles: false });
                if (decision.error) {
                    win.close();
                    throw new PlayerError(decision.error.code, decision.error.message);
                }
                const host = this.host(), marker = host.ownerDocument.createComment('demuxe-presentation');
                host.before(marker);
                const restore = () => { if (this.pipWindow !== win)
                    return; if (marker.parentNode)
                    marker.replaceWith(host); this.pipWindow = undefined; this.restore = undefined; };
                this.restore = restore;
                this.pipWindow = win;
                win.document.body.style.margin = '0';
                win.document.body.append(host);
                win.addEventListener('pagehide', restore, { once: true });
                return;
            }
            await surface.requestPictureInPicture();
            const decision = this.transition({ type: 'pip.check', id, sameSurface: surface === this.player.surface, subtitles: this.player.state.subtitlesVisible && !!this.player.state.mediaInfo.subtitle });
            if (decision.error) {
                if (this.ownerDocument.pictureInPictureElement === surface)
                    await this.ownerDocument.exitPictureInPicture();
                throw new PlayerError(decision.error.code, decision.error.message);
            }
        }
        finally {
            this.transition({ type: 'pip.settled', id });
        }
    }
    async exitPictureInPicture() {
        this.accept({ type: 'pip.exit' });
        if (this.pipWindow) {
            const win = this.pipWindow;
            this.restore?.();
            win.close();
        }
        if (this.videoPiP())
            await this.ownerDocument.exitPictureInPicture();
    }
    mediaSession() { return this.ownerDocument.defaultView?.navigator.mediaSession ?? globalThis.navigator?.mediaSession; }
    setMediaSessionEnabled(enabled) {
        if (this.control.disposed)
            throw new PlayerError('ABORTED', 'Presentation controller is destroyed');
        if (typeof enabled !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Expected boolean media-session policy');
        const media = this.mediaSession();
        if (!media)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session is unavailable');
        if (!enabled) {
            this.releaseMediaSession();
            return;
        }
        const decision = transitionMediaSession(this.lease.state, { type: 'acquire', owner: this.owner });
        this.lease.state = decision.state;
        if (decision.outcome === 'denied')
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Another player owns Media Session');
        if (decision.outcome === 'retained')
            return;
        const serial = decision.state.serial, current = () => ownsMediaSession(this.lease.state, this.owner, serial) && !this.control.disposed;
        const actions = { play: () => { if (current())
                void this.player.play().catch(() => { }); }, pause: () => { if (current())
                void this.player.pause().catch(() => { }); }, seekto: event => { if (current() && event.seekTime !== undefined)
                void this.player.seek(event.seekTime, { policy: 'latest' }).catch(() => { }); } };
        try {
            for (const [action, handler] of Object.entries(actions)) {
                if (!current())
                    return;
                media.setActionHandler(action, handler);
            }
            if (!current())
                return;
            const stop = this.player.subscribe(state => {
                if (!current())
                    return;
                media.playbackState = state.sourceId === null ? 'none' : state.playbackIntent === 'play' ? 'playing' : 'paused';
                if (!current())
                    return;
                if (state.duration !== null && state.duration > 0 && state.currentTime <= state.duration)
                    media.setPositionState?.({ duration: state.duration, position: state.currentTime, playbackRate: state.playbackRate });
                else
                    media.setPositionState?.();
            });
            if (!current()) {
                stop();
                return;
            }
            this.subscription = { serial, stop };
            this.lease.state = transitionMediaSession(this.lease.state, { type: 'activate', owner: this.owner, serial }).state;
        }
        catch {
            this.releaseMediaSession(serial);
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session actions are unavailable');
        }
    }
    releaseMediaSession(expectedSerial) {
        const serial = expectedSerial ?? this.lease.state.serial;
        const decision = transitionMediaSession(this.lease.state, { type: 'release', owner: this.owner, serial });
        this.lease.state = decision.state;
        const subscription = this.subscription;
        if (subscription && subscription.serial === serial) {
            this.subscription = undefined;
            try {
                subscription.stop();
            }
            catch { }
        }
        if (decision.outcome !== 'released')
            return;
        const media = this.mediaSession();
        if (!media)
            return;
        const vacant = () => this.lease.state.owner === null && this.lease.state.serial === serial;
        for (const action of ['play', 'pause', 'seekto']) {
            if (!vacant())
                return;
            try {
                media.setActionHandler(action, null);
            }
            catch { }
        }
        if (!vacant())
            return;
        media.playbackState = 'none';
        if (vacant())
            try {
                media.setPositionState?.();
            }
            catch { }
    }
    async destroy() {
        if (this.control.disposed)
            return;
        this.transition({ type: 'destroy' });
        this.releaseMediaSession();
        const win = this.pipWindow;
        this.restore?.();
        win?.close();
        if (this.videoPiP())
            await this.ownerDocument.exitPictureInPicture().catch(() => { });
        if (this.host().ownerDocument.fullscreenElement === this.fullscreenHost())
            await this.host().ownerDocument.exitFullscreen().catch(() => { });
    }
}
