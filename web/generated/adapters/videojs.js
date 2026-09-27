// SPDX-License-Identifier: Apache-2.0
import { MediaView, MEDIA_VIEW_EVENTS } from '../integration/media-view.js';
import { PlayerError } from '../internal/errors.js';
const hosted = new WeakSet();
/** Optional, explicitly registered Video.js 8.24.1 Tech. No runtime dependency import. */
export function registerVideojsTech(videojs, name = 'Demuxe') {
    if (videojs.getTech(name))
        throw new PlayerError('INVALID_ARGUMENT', 'Tech name is already registered');
    const Tech = videojs.getTech('Tech');
    class DemuxeTech extends Tech {
        view;
        controlsReady = false;
        retired = false;
        runtime;
        owner;
        adapterError = null;
        reflectedSource;
        reflectSource() { const id = this.view.state.sourceId; if (id !== this.reflectedSource) {
            this.reflectedSource = id;
            if (id !== null) {
                this.adapterError = null;
                this.owner?.error(null);
            }
            this.trigger({ type: 'sourceset', src: this.currentSrc() });
        } }
        restore;
        stops = [];
        constructor(options, ready) {
            if (!options.demuxePlayer || options.source)
                throw new PlayerError('INVALID_ARGUMENT', 'Supply demuxePlayer with application-owned sources');
            if (options.demuxePlayer.isDestroyed)
                throw new PlayerError('ABORTED', 'Cannot bind a destroyed runtime');
            if (options.demuxePlayer.host.ownerDocument !== document)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Cross-document hosting is not supported');
            if (hosted.has(options.demuxePlayer.host))
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Another Tech owns this presentation host');
            if (!options.demuxePlayer.host.parentNode)
                throw new PlayerError('INVALID_ARGUMENT', 'Presentation host must have a restoration parent');
            super({ ...options, nativeControlsForTouch: false }, ready);
            const runtime = this.runtime = options.demuxePlayer;
            this.owner = videojs.getPlayer(options.playerId);
            this.view = new MediaView(runtime);
            hosted.add(runtime.host);
            const parent = runtime.host.parentNode;
            const marker = runtime.host.ownerDocument.createComment('demuxe-videojs-host');
            runtime.host.before(marker);
            this.el().append(runtime.host);
            this.restore = () => { hosted.delete(runtime.host); if (!runtime.isDestroyed && runtime.host.parentNode === this.el()) {
                if (marker.parentNode)
                    marker.replaceWith(runtime.host);
                else
                    parent.appendChild(runtime.host);
            } marker.remove(); };
            for (const event of MEDIA_VIEW_EVENTS) {
                const listener = (value) => { const detail = value.detail; if (event === 'operationerror')
                    videojs.getPlayer(options.playerId)?.trigger({ type: 'demuxeoperationerror', detail });
                else {
                    if (event === 'loadedmetadata' || event === 'emptied')
                        this.reflectSource();
                    this.trigger({ type: event, detail });
                } };
                this.view.addEventListener(event, listener);
                this.stops.push(() => this.view.removeEventListener(event, listener));
            }
            this.ready(() => { if (this.retired)
                return; this.controlsReady = true; if (this.view.state.sourceId !== null)
                this.reflectSource(); });
            this.triggerReady();
        }
        createEl() { const element = document.createElement('div'); element.className = 'vjs-tech'; return element; }
        static isSupported() { return true; }
        static canPlayType() { return ''; }
        static canPlaySource() { return ''; }
        play() { return this.view.play(); }
        pause() { this.view.pause(); }
        paused() { return this.view.paused; }
        ended() { return this.view.ended; }
        currentTime() { return this.view.currentTime; }
        setCurrentTime(v) { this.view.currentTime = v; return v; }
        duration() { return this.view.duration; }
        seeking() { return this.view.seeking; }
        volume() { return this.view.volume; }
        setVolume(v) { if (this.controlsReady)
            this.view.volume = v; }
        muted() { return this.view.muted; }
        setMuted(v) { this.view.muted = v; }
        playbackRate() { return this.view.playbackRate; }
        setPlaybackRate(v) { this.view.playbackRate = v; }
        buffered() { return this.view.buffered; }
        seekable() { return this.view.seekable; }
        error(value) { if (value !== undefined) {
            this.adapterError = value;
            this.trigger('error');
        } const error = this.view?.error; return error ? { code: 3, message: error.message } : this.adapterError; }
        controls() { return false; }
        poster() { return ''; }
        videoWidth() { return this.view.state.mediaInfo.displayWidth ?? 0; }
        videoHeight() { return this.view.state.mediaInfo.displayHeight ?? 0; }
        currentSrc() { return this.view.state.sourceId === null ? '' : `demuxe-session:${this.view.state.sourceId}`; }
        src() { throw new PlayerError('UNSUPPORTED_FEATURE', 'Sources are application-owned'); }
        load() { throw new PlayerError('UNSUPPORTED_FEATURE', 'Loading belongs to the application'); }
        supportsFullScreen() { return false; }
        dispose() { if (this.retired)
            return; this.retired = true; for (const stop of this.stops.splice(0))
            stop(); void this.view?.dispose(); this.restore?.(); super.dispose(); }
    }
    // Prevent Tech's fallback polling and native text-track renderer installation.
    Object.assign(DemuxeTech.prototype, { featuresTimeupdateEvents: true, featuresProgressEvents: true, featuresNativeTextTracks: true, featuresPlaybackRate: true, featuresVolumeControl: true });
    videojs.registerTech(name, DemuxeTech);
}
