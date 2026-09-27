// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './internal/errors.js';
let mediaSessionOwner;
/** Optional browser presentation controls. Calls requiring activation must come from a gesture. */
export class PlayerPresentation {
    player;
    host;
    disposed = false;
    fullscreenTarget;
    fullscreenPending = false;
    fullscreenEpoch = 0;
    containsHost(target) { let node = this.host(); while (node && node !== target)
        node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null); return node === target && target.ownerDocument === this.host().ownerDocument; }
    /** Explicit complete-container target, including shadow-DOM composition. */
    setFullscreenTarget(target) {
        this.active();
        if (this.fullscreenPending || this.host().ownerDocument.fullscreenElement === this.fullscreenHost())
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Exit fullscreen before changing its target');
        if (target && !this.containsHost(target))
            throw new PlayerError('INVALID_ARGUMENT', 'Fullscreen target must contain the presentation host');
        this.fullscreenTarget = target ?? undefined;
    }
    fullscreenHost() { return this.fullscreenTarget ?? this.host(); }
    pipRequest = false;
    pipEpoch = 0;
    pendingVideo;
    pipWindow;
    restore;
    unsubscribe;
    constructor(player, host) {
        this.player = player;
        this.host = host;
    }
    active() { if (this.disposed)
        throw new PlayerError('ABORTED', 'Presentation controller is destroyed'); }
    get state() { const host = this.host(); return Object.freeze({ fullscreen: host.ownerDocument.fullscreenElement === this.fullscreenHost(), pictureInPicture: this.pipWindow && !this.pipWindow.closed ? 'document' : document.pictureInPictureElement === this.player.surface ? 'video' : null, mediaSession: mediaSessionOwner === this }); }
    get locksSurface() { return !!this.pendingVideo || document.pictureInPictureElement === this.player.surface && !!this.player.surface; }
    async requestFullscreen() {
        this.active();
        const host = this.fullscreenHost();
        if (this.fullscreenPending)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Fullscreen entry is already pending');
        if (!this.containsHost(host))
            throw new PlayerError('INVALID_ARGUMENT', 'Fullscreen target no longer contains the presentation host');
        if (!host.requestFullscreen)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Fullscreen is unavailable');
        this.fullscreenPending = true;
        const epoch = this.fullscreenEpoch;
        try {
            await host.requestFullscreen();
            if (this.disposed || epoch !== this.fullscreenEpoch || !this.containsHost(host)) {
                if (host.ownerDocument.fullscreenElement === host)
                    await host.ownerDocument.exitFullscreen();
                throw new PlayerError('ABORTED', 'Fullscreen request was retired');
            }
        }
        finally {
            this.fullscreenPending = false;
        }
    }
    async exitFullscreen() { this.active(); this.fullscreenEpoch++; const host = this.fullscreenHost(); if (host.ownerDocument.fullscreenElement === host)
        await host.ownerDocument.exitFullscreen(); }
    async requestPictureInPicture(kind = 'video') {
        this.active();
        if (!['video', 'document'].includes(kind))
            throw new PlayerError('INVALID_ARGUMENT', 'Unknown Picture-in-Picture mode');
        if (this.pipRequest)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Picture-in-Picture entry is already pending');
        this.pipRequest = true;
        const epoch = this.pipEpoch;
        try {
            if (kind === 'document') {
                const api = globalThis.documentPictureInPicture;
                if (!api)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Document Picture-in-Picture is unavailable');
                if (this.pipWindow && !this.pipWindow.closed)
                    return;
                const win = await api.requestWindow({ width: 640, height: 360 });
                if (this.disposed || epoch !== this.pipEpoch) {
                    win.close();
                    throw new PlayerError('ABORTED', 'Presentation request was retired');
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
            const surface = this.player.surface;
            if (!(surface instanceof HTMLVideoElement) || surface.disablePictureInPicture || this.player.state.subtitlesVisible && this.player.state.mediaInfo.subtitle || !surface.requestPictureInPicture)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Video Picture-in-Picture requires a Native surface without subtitle composition');
            this.pendingVideo = surface;
            await surface.requestPictureInPicture();
            if (this.disposed || epoch !== this.pipEpoch || surface !== this.player.surface || this.player.state.subtitlesVisible && !!this.player.state.mediaInfo.subtitle) {
                if (document.pictureInPictureElement === surface)
                    await document.exitPictureInPicture();
                throw new PlayerError('ABORTED', 'Presentation request was retired');
            }
        }
        finally {
            this.pendingVideo = undefined;
            this.pipRequest = false;
        }
    }
    async exitPictureInPicture() {
        this.active();
        this.pipEpoch++;
        if (this.pipWindow) {
            const win = this.pipWindow;
            this.restore?.();
            win.close();
        }
        if (document.pictureInPictureElement === this.player.surface && this.player.surface)
            await document.exitPictureInPicture();
    }
    setMediaSessionEnabled(enabled) {
        this.active();
        if (typeof enabled !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Expected boolean media-session policy');
        if (!('mediaSession' in navigator))
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session is unavailable');
        if (enabled) {
            if (mediaSessionOwner && mediaSessionOwner !== this)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Another player owns Media Session');
            if (this.unsubscribe)
                return;
            mediaSessionOwner = this;
            const actions = { play: () => { void this.player.play().catch(() => { }); }, pause: () => { void this.player.pause().catch(() => { }); }, seekto: event => { if (event.seekTime !== undefined)
                    void this.player.seek(event.seekTime, { policy: 'latest' }).catch(() => { }); } };
            try {
                for (const [action, handler] of Object.entries(actions))
                    navigator.mediaSession.setActionHandler(action, handler);
                this.unsubscribe = this.player.subscribe(state => { if (mediaSessionOwner !== this)
                    return; navigator.mediaSession.playbackState = state.sourceId === null ? 'none' : state.playbackIntent === 'play' ? 'playing' : 'paused'; if (state.duration !== null && state.duration > 0 && state.currentTime <= state.duration)
                    navigator.mediaSession.setPositionState?.({ duration: state.duration, position: state.currentTime, playbackRate: state.playbackRate });
                else
                    navigator.mediaSession.setPositionState?.(); });
            }
            catch (error) {
                this.releaseMediaSession();
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session actions are unavailable');
            }
        }
        else
            this.releaseMediaSession();
    }
    releaseMediaSession() {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        if (mediaSessionOwner !== this)
            return;
        mediaSessionOwner = undefined;
        for (const action of ['play', 'pause', 'seekto'])
            try {
                navigator.mediaSession.setActionHandler(action, null);
            }
            catch { }
        navigator.mediaSession.playbackState = 'none';
        try {
            navigator.mediaSession.setPositionState?.();
        }
        catch { }
    }
    async destroy() { if (this.disposed)
        return; this.disposed = true; this.pipEpoch++; this.releaseMediaSession(); const win = this.pipWindow; this.restore?.(); win?.close(); if (document.pictureInPictureElement === this.player.surface && this.player.surface)
        await document.exitPictureInPicture().catch(() => { }); if (this.host().ownerDocument.fullscreenElement === this.fullscreenHost())
        await this.host().ownerDocument.exitFullscreen().catch(() => { }); }
}
