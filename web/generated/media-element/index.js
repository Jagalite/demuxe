// SPDX-License-Identifier: Apache-2.0
import { MediaView, MEDIA_VIEW_EVENTS, timeRanges } from '../integration/media-view.js';
import { PlayerError } from '../internal/errors.js';
const Base = (typeof HTMLElement === 'undefined' ? class {
} : HTMLElement);
/** Explicitly borrowed, application-owned sources. No automatic registration or playback. */
export class DemuxeMediaElement extends Base {
    view;
    cleanup = Promise.resolve();
    stops = [];
    bind(player) {
        if (this.view)
            throw new PlayerError('INVALID_ARGUMENT', 'Dispose the previous binding before rebinding');
        const view = this.view = new MediaView(player);
        for (const name of MEDIA_VIEW_EVENTS) {
            const listener = (event) => { if (this.view === view)
                this.dispatchEvent(new CustomEvent(name, { detail: event.detail })); };
            view.addEventListener(name, listener);
            this.stops.push(() => view.removeEventListener(name, listener));
        }
        view.synchronize();
        return this;
    }
    get state() { return this.view?.state ?? null; }
    get paused() { return this.view?.paused ?? true; }
    get ended() { return this.view?.ended ?? false; }
    get currentTime() { return this.view?.currentTime ?? 0; }
    set currentTime(value) { this.requireView().currentTime = value; }
    get duration() { return this.view?.duration ?? NaN; }
    get volume() { return this.view?.volume ?? 1; }
    set volume(value) { this.requireView().volume = value; }
    get muted() { return this.view?.muted ?? false; }
    set muted(value) { this.requireView().muted = value; }
    get playbackRate() { return this.view?.playbackRate ?? 1; }
    set playbackRate(value) { this.requireView().playbackRate = value; }
    get seeking() { return this.view?.seeking ?? false; }
    get buffered() { return this.view?.buffered ?? timeRanges(null); }
    get seekable() { return this.view?.seekable ?? timeRanges(null); }
    get error() { return this.view?.error ?? null; }
    // Deliberately never reflect application sources, signed URLs or internal object URLs.
    get currentSrc() { return ''; }
    get src() { return ''; }
    set src(_value) { throw new PlayerError('UNSUPPORTED_FEATURE', 'Sources are application-owned; call Player.open'); }
    play() { try {
        return this.requireView().play();
    }
    catch (error) {
        return Promise.reject(error);
    } }
    pause() { this.requireView().pause(); }
    requireView() { if (!this.view)
        throw new PlayerError('ABORTED', 'Media element is not bound'); return this.view; }
    dispose() { const view = this.view; this.view = undefined; for (const stop of this.stops.splice(0))
        stop(); if (view)
        this.cleanup = view.dispose(); return this.cleanup; }
    disconnectedCallback() { queueMicrotask(() => { if (!this.isConnected)
        void this.dispose(); }); }
}
export function registerMediaElement(name = 'demuxe-media') {
    if (typeof customElements === 'undefined')
        throw new PlayerError('INVALID_ARGUMENT', 'Registration requires a browser');
    const existing = customElements.get(name);
    if (existing && existing !== DemuxeMediaElement)
        throw new PlayerError('INVALID_ARGUMENT', 'Custom element name is already registered');
    if (!existing)
        customElements.define(name, DemuxeMediaElement);
}
