// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './internal/errors.js';
import { initialPresentationState, transitionPresentation, metadataSourceCurrent, projectPresentation, presentationLocksSurface, initialMediaSessionLease, allocateMediaSessionOwner, transitionMediaSession, ownsMediaSession, } from './internal/machine/presentation.js';
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
    destruction;
    pipClose;
    viewport;
    stopViewport;
    observers = new Set();
    observerCleanup = new Set();
    metadataValue;
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
    videoPiP(surface = this.player.surface) {
        if (!surface)
            return false;
        // Document observations retarget a shadow video to its component host.
        const root = surface.getRootNode?.();
        return this.ownerDocument.pictureInPictureElement === surface || root?.pictureInPictureElement === surface;
    }
    get state() { return projectPresentation({ fullscreen: this.host().ownerDocument.fullscreenElement === this.fullscreenHost(), viewportExpanded: !!this.viewport?.active, documentPiP: !!this.pipWindow && !this.pipWindow.closed, videoPiP: this.videoPiP(), mediaSession: ownsMediaSession(this.lease.state, this.owner) }); }
    notify = () => { for (const observer of [...this.observers]) {
        try {
            observer();
        }
        catch { }
    } };
    requireAlive() { if (this.control.disposed)
        throw new PlayerError('ABORTED', 'Presentation controller is destroyed'); }
    /** Immediate observation, then changes; unsubscribe never destroys the player. */
    subscribe(listener) {
        this.requireAlive();
        if (typeof listener !== 'function')
            throw new PlayerError('INVALID_ARGUMENT', 'Expected a presentation listener');
        const doc = this.ownerDocument;
        let previous, surface, stopped = false;
        const observe = () => {
            if (stopped || this.control.disposed)
                return;
            const state = this.state;
            if (previous && Object.keys(state).every(key => state[key] === previous[key]))
                return;
            previous = state;
            try {
                listener(state);
            }
            catch { }
        };
        const surfaceEvents = ['enterpictureinpicture', 'leavepictureinpicture'];
        const update = () => {
            if (stopped || this.control.disposed)
                return;
            if (surface !== this.player.surface) {
                for (const event of surfaceEvents)
                    surface?.removeEventListener(event, observe);
                surface = this.player.surface;
                for (const event of surfaceEvents)
                    surface?.addEventListener(event, observe);
            }
            observe();
        };
        let stopPlayer;
        const stop = () => { if (stopped)
            return; stopped = true; this.observers.delete(observe); this.observerCleanup.delete(stop); doc.removeEventListener('fullscreenchange', observe); for (const event of surfaceEvents)
            surface?.removeEventListener(event, observe); stopPlayer?.(); };
        this.observers.add(observe);
        this.observerCleanup.add(stop);
        doc.addEventListener('fullscreenchange', observe);
        try {
            stopPlayer = this.player.subscribe(update);
            if (stopped)
                stopPlayer();
        }
        catch (error) {
            stop();
            throw error;
        }
        return stop;
    }
    get canExpandViewport() { return !this.control.disposed && !!this.viewport?.available; }
    /** Configure at the host boundary; standalone players have no expansion adapter. */
    setViewportExpansionAdapter(adapter) {
        this.requireAlive();
        if (adapter === this.viewport || !adapter && !this.viewport)
            return;
        if (adapter && (!['open', 'close', 'subscribe'].every(key => typeof adapter[key] === 'function')))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid viewport expansion adapter');
        const { requestId: id } = this.accept({ type: 'viewport.replace' });
        const previous = this.viewport;
        previous?.close(false);
        this.accept({ type: 'viewport.check', id: id });
        // Retire the old unsubscribe handle before invoking application code. It
        // may install a successor or destroy this controller synchronously.
        const stop = this.stopViewport;
        this.stopViewport = undefined;
        stop?.();
        this.accept({ type: 'viewport.install', id: id, present: !!adapter });
        this.viewport = undefined;
        if (adapter) {
            this.viewport = adapter;
            try {
                const stop = adapter.subscribe(() => { if (this.control.viewportOwner === id)
                    this.notify(); });
                if (this.control.disposed || this.control.viewportOwner !== id) {
                    stop();
                    if (this.viewport !== adapter)
                        adapter.close(false);
                    return;
                }
                this.stopViewport = stop;
            }
            catch (error) {
                if (this.control.viewportOwner === id) {
                    this.transition({ type: 'viewport.remove', id: id });
                    this.viewport = undefined;
                }
                try {
                    if (this.viewport !== adapter)
                        adapter.close(false);
                }
                finally {
                    this.notify();
                }
                throw error;
            }
        }
        this.notify();
    }
    requestViewportExpansion() {
        this.requireAlive();
        const viewport = this.viewport, version = this.control.viewportVersion;
        const available = !!viewport?.available, observed = this.state;
        // Host getters may replace the adapter while observations are sampled.
        this.accept({ type: 'viewport.check', id: version });
        const { requestId: id } = this.accept({ type: 'viewport.request', available, nativePresentation: observed.fullscreen || !!observed.pictureInPicture });
        viewport.open();
        if (this.transition({ type: 'viewport.check', id: id }).error) {
            if (this.viewport !== viewport || this.control.disposed)
                viewport.close(false);
            throw new PlayerError('ABORTED', 'Viewport expansion was retired');
        }
        this.notify();
    }
    exitViewportExpansion() { this.requireAlive(); this.viewport?.close(); this.notify(); }
    get locksSurface() { return presentationLocksSurface(this.control, this.videoPiP()); }
    async requestFullscreen() {
        this.requireAlive();
        const host = this.fullscreenHost(), request = host.requestFullscreen;
        const { requestId: id } = this.accept({ type: 'fullscreen.request', containsHost: this.containsHost(host), supported: typeof request === 'function' });
        try {
            this.viewport?.close(false);
            this.accept({ type: 'fullscreen.check', id: id, containsHost: this.containsHost(host) });
            // Invoke on the initiating gesture stack, before awaiting completion.
            await request.call(host);
            const decision = this.transition({ type: 'fullscreen.check', id: id, containsHost: this.containsHost(host) });
            if (decision.error) {
                if (host.ownerDocument.fullscreenElement === host)
                    await host.ownerDocument.exitFullscreen();
                throw new PlayerError(decision.error.code, decision.error.message);
            }
        }
        finally {
            this.transition({ type: 'fullscreen.settled', id: id });
            this.notify();
        }
    }
    async exitFullscreen() { this.accept({ type: 'fullscreen.exit' }); const host = this.fullscreenHost(); if (host.ownerDocument.fullscreenElement === host)
        await host.ownerDocument.exitFullscreen(); this.notify(); }
    async requestPictureInPicture(kind = 'video') {
        this.requireAlive();
        // Capture the owning document before document PiP reparents the host.
        void this.ownerDocument;
        const api = globalThis.documentPictureInPicture;
        const surface = this.player.surface;
        const video = typeof HTMLVideoElement !== 'undefined' && surface instanceof HTMLVideoElement;
        const requestWindow = kind === 'document' ? api?.requestWindow : undefined, requestVideo = kind === 'video' && video ? surface.requestPictureInPicture : undefined;
        const { requestId: id } = this.accept({ type: 'pip.request', kind, supported: kind === 'document' ? typeof requestWindow === 'function' : typeof requestVideo === 'function', eligible: kind === 'document' || video && !surface.disablePictureInPicture && !(this.player.state.subtitlesVisible && this.player.state.mediaInfo.subtitle), documentOpen: !!this.pipWindow && !this.pipWindow.closed });
        if (id === undefined)
            return;
        try {
            this.viewport?.close(false);
            this.accept({ type: 'pip.check', id, sameSurface: surface === this.player.surface, subtitles: kind === 'video' && this.player.state.subtitlesVisible && !!this.player.state.mediaInfo.subtitle });
            if (kind === 'document') {
                const win = await requestWindow.call(api, { width: 640, height: 360 });
                let closed = false;
                const close = () => { if (!closed) {
                    closed = true;
                    win.close();
                } };
                const check = () => this.accept({ type: 'pip.check', id, sameSurface: true, subtitles: false });
                let marker, host, restore;
                try {
                    check();
                    host = this.host();
                    check();
                    marker = host.ownerDocument.createComment('demuxe-presentation');
                    check();
                    const before = host.before;
                    check();
                    before.call(host, marker);
                    check();
                    restore = () => {
                        if (this.pipWindow !== win)
                            return;
                        this.pipWindow = undefined;
                        this.restore = undefined;
                        this.pipClose = undefined;
                        try {
                            win.removeEventListener('pagehide', restore);
                        }
                        finally {
                            if (marker?.parentNode)
                                marker.replaceWith(host);
                            this.notify();
                        }
                    };
                    this.restore = restore;
                    this.pipClose = close;
                    this.pipWindow = win;
                    const body = win.document.body;
                    check();
                    const style = body.style;
                    check();
                    style.margin = '0';
                    check();
                    const append = body.append;
                    check();
                    append.call(body, host);
                    check();
                    const listen = win.addEventListener;
                    check();
                    listen.call(win, 'pagehide', restore, { once: true });
                    check();
                    return;
                }
                catch (error) {
                    if (this.pipWindow === win) {
                        this.pipWindow = undefined;
                        this.restore = undefined;
                        this.pipClose = undefined;
                    }
                    try {
                        if (restore)
                            win.removeEventListener('pagehide', restore);
                    }
                    catch { }
                    try {
                        if (marker?.parentNode && host)
                            marker.replaceWith(host);
                    }
                    catch { }
                    try {
                        close();
                    }
                    catch { }
                    throw error;
                }
            }
            await requestVideo.call(surface);
            const decision = this.transition({ type: 'pip.check', id, sameSurface: surface === this.player.surface, subtitles: this.player.state.subtitlesVisible && !!this.player.state.mediaInfo.subtitle });
            if (decision.error) {
                if (this.videoPiP(surface))
                    await this.ownerDocument.exitPictureInPicture();
                throw new PlayerError(decision.error.code, decision.error.message);
            }
        }
        finally {
            this.transition({ type: 'pip.settled', id });
            this.notify();
        }
    }
    async exitPictureInPicture() {
        this.accept({ type: 'pip.exit' });
        if (this.pipWindow) {
            const win = this.pipWindow, close = this.pipClose ?? (() => win.close());
            try {
                this.restore?.();
            }
            finally {
                close();
            }
        }
        if (this.videoPiP())
            await this.ownerDocument.exitPictureInPicture();
        this.notify();
    }
    /** A source ID is mandatory so asynchronous metadata from retired media is rejected. */
    setMediaSessionMetadata(metadata, sourceId) {
        this.requireAlive();
        const current = () => { this.accept({ type: 'metadata.check', sourceId, currentSourceId: this.player.state.sourceId }); };
        current();
        let value = null;
        if (metadata !== null) {
            if (typeof metadata !== 'object')
                throw new PlayerError('INVALID_ARGUMENT', 'Expected Media Session metadata or null');
            const Metadata = this.ownerDocument.defaultView?.MediaMetadata;
            if (!Metadata)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session metadata is unavailable');
            try {
                value = new Metadata(metadata);
            }
            catch {
                throw new PlayerError('INVALID_ARGUMENT', 'Invalid Media Session metadata');
            }
        }
        current();
        this.metadataValue = { sourceId, value };
        if (ownsMediaSession(this.lease.state, this.owner))
            this.mediaSession().metadata = value;
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
                if (!metadataSourceCurrent(this.metadataValue?.sourceId, state.sourceId))
                    this.metadataValue = undefined;
                const metadata = this.metadataValue?.value ?? null;
                if (media.metadata !== metadata)
                    media.metadata = metadata;
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
            this.notify();
        }
        catch {
            this.releaseMediaSession(serial);
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Media Session actions are unavailable');
        }
    }
    releaseMediaSession(expectedSerial) {
        try {
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
            media.metadata = null;
            if (!vacant())
                return;
            media.playbackState = 'none';
            if (vacant())
                try {
                    media.setPositionState?.();
                }
                catch { }
        }
        finally {
            this.notify();
        }
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        let resolve, reject;
        this.destruction = new Promise((yes, no) => { resolve = yes; reject = no; });
        this.transition({ type: 'destroy' });
        const errors = [], win = this.pipWindow, restore = this.restore, close = this.pipClose ?? (() => win?.close());
        const release = (work) => { try {
            work();
        }
        catch (error) {
            errors.push(error);
        } };
        for (const stop of [...this.observerCleanup])
            release(stop);
        const viewport = this.viewport;
        this.viewport = undefined;
        release(() => this.stopViewport?.());
        this.stopViewport = undefined;
        release(() => viewport?.close(false));
        this.metadataValue = undefined;
        release(() => this.releaseMediaSession());
        release(() => restore?.());
        release(close);
        const exits = [];
        release(() => { if (this.videoPiP())
            exits.push(this.ownerDocument.exitPictureInPicture().catch(() => { })); });
        release(() => { if (this.host().ownerDocument.fullscreenElement === this.fullscreenHost())
            exits.push(this.host().ownerDocument.exitFullscreen().catch(() => { })); });
        void Promise.all(exits).then(() => { if (errors.length)
            reject(errors.length === 1 ? errors[0] : new AggregateError(errors, 'Presentation cleanup failed'));
        else
            resolve(); }, reject);
        return this.destruction;
    }
}
