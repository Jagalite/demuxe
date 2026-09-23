// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
/** mpv embedded subtitle rendering on the accepted media timeline. One bounded RPC at a time. */
export class NativeMpvSubtitles {
    video;
    time;
    file;
    failed;
    defaultStreamIndex;
    canvas = document.createElement('canvas');
    worker;
    closed;
    destruction;
    pending = new Map();
    sequence = 0;
    revision = 0;
    stopped = false;
    enabled = false;
    busy = false;
    changingTrack = false;
    frame = 0;
    last = '';
    lastRevision = -1;
    verifiedTrack;
    loading = new AbortController();
    observer;
    handlers = [];
    ready;
    tracks = [];
    service = {};
    stats = { position: -1, renders: 0, bitmapUpdates: 0, bytes: 0, peakBytes: 0, discarded: 0 };
    constructor(video, time, base, fonts, file, failed, defaultStreamIndex) {
        this.video = video;
        this.time = time;
        this.file = file;
        this.failed = failed;
        this.defaultStreamIndex = defaultStreamIndex;
        if (!crossOriginIsolated)
            throw Error('Native mpv subtitles requires cross-origin isolation');
        this.canvas.className = 'demuxe-native-ass';
        this.canvas.style.cssText = 'position:absolute;pointer-events:none;display:none';
        if (!video.parentElement)
            throw Error('Missing Native presentation container');
        // Worker construction can synchronously fail (CSP, URL or allocation).
        // Do not attach a canvas until its owner exists.
        this.worker = new Worker(new URL('web/mpv-subtitle-worker.js', base), { type: 'module' });
        const parent = video.parentElement, prior = { position: parent.style.position, fit: video.style.objectFit, pip: video.disablePictureInPicture, remote: video.disableRemotePlayback };
        try {
            parent.style.position = 'relative';
            parent.append(this.canvas);
            video.style.objectFit = 'contain';
            video.disablePictureInPicture = true;
            video.disableRemotePlayback = true;
            this.worker.onmessage = ({ data }) => { if (data.type === 'closed') {
                this.closed?.();
                return;
            } const p = this.pending.get(data.id); if (!p) {
                data.bitmap?.close();
                return;
            } clearTimeout(p.timer); this.pending.delete(data.id); data.error ? p.reject(/^Error: Subtitle (?:decoder unavailable|decode failed|packet deadline exceeded|source load failed|selection failed|seek failed)/.test(data.error) ? new PlayerError('UNSUPPORTED_FEATURE', data.error) : Error(data.error)) : p.resolve(data); };
            this.worker.onerror = e => { e.preventDefault(); this.fail(Error(e.message || 'Subtitle worker failed')); };
            this.worker.onmessageerror = () => this.fail(Error('Subtitle worker message failure'));
            this.observer = new ResizeObserver(() => this.invalidate());
            this.observer.observe(video);
            for (const event of ['seeked', 'seeking', 'pause', 'play', 'ratechange', 'loadedmetadata']) {
                const listener = () => this.invalidate();
                video.addEventListener(event, listener);
                this.handlers.push(() => video.removeEventListener(event, listener));
            }
            const fullscreen = () => { if (document.fullscreenElement === video)
                this.fail(Error('Native mpv subtitles requires fullscreen on the player container, not the video element'));
            else
                this.invalidate(); };
            document.addEventListener('fullscreenchange', fullscreen);
            this.handlers.push(() => document.removeEventListener('fullscreenchange', fullscreen));
            this.ready = (async () => {
                const deadline = setTimeout(() => this.loading.abort(), 25000);
                try {
                    const response = await fetch(new URL('fixtures/DejaVuSans.ttf', base), { signal: this.loading.signal });
                    if (!response.ok)
                        throw Error('Subtitle default font unavailable');
                    const bytes = await response.arrayBuffer();
                    if (bytes.byteLength > 8 * 1024 * 1024)
                        throw Error('Subtitle font budget exceeded');
                    if (this.stopped)
                        throw Error('Subtitle renderer destroyed');
                    const result = await this.request('init', { file: this.file, fonts: [{ name: 'DejaVuSans.ttf', bytes }, ...fonts] });
                    this.tracks = result.tracks;
                    for (const track of this.tracks)
                        track.default = track['ff-index'] === this.defaultStreamIndex;
                }
                finally {
                    clearTimeout(deadline);
                }
            })();
            this.ready.catch(() => { });
        }
        catch (error) {
            this.destroy();
            parent.style.position = prior.position;
            video.style.objectFit = prior.fit;
            video.disablePictureInPicture = prior.pip;
            video.disableRemotePlayback = prior.remote;
            throw error;
        }
    }
    request(type, data = {}) {
        if (this.stopped)
            return Promise.reject(Error('Subtitle renderer destroyed'));
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => this.fail(Error('Subtitle worker deadline exceeded')), 25000);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.worker.postMessage({ id, type, ...data });
            }
            catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error);
            }
        });
    }
    fail(error) { if (this.stopped)
        return; for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(error);
    } this.pending.clear(); this.destroy(); this.failed(error); }
    async select(id) {
        await this.ready;
        const track = id === 'no' ? undefined : id === 'auto' ? (this.tracks.find(t => t.default) ?? this.tracks[0]) : this.tracks.find(t => t.id === id);
        if (track?.selected)
            return;
        if (!track && id !== 'no')
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Requested subtitle track was not enumerated by mpv');
        const previous = this.tracks.find(t => t.selected);
        this.changingTrack = true;
        this.revision++;
        try {
            await this.request('select', { trackId: track?.mpvId ?? -2 });
            this.tracks.forEach(t => t.selected = t === track);
            this.verifiedTrack = undefined;
            if (track)
                await this.verify();
        }
        catch (error) {
            if (!this.stopped) {
                await this.request('select', { trackId: previous?.mpvId ?? -2 });
                this.tracks.forEach(t => t.selected = t === previous);
                this.verifiedTrack = undefined;
            }
            throw error;
        }
        finally {
            this.changingTrack = false;
            this.invalidate();
        }
    }
    async verify() {
        const selected = this.tracks.find(t => t.selected);
        if (!selected || this.verifiedTrack === selected.mpvId)
            return;
        const width = Math.min(1920, this.video.videoWidth || this.video.width), height = Math.min(1080, this.video.videoHeight || this.video.height);
        const now = this.time(), duration = this.video.duration;
        const samples = [now, 0, 1, 2, 5, 10, 20, 30].filter((time, index, list) => time >= 0 && (!Number.isFinite(duration) || time < duration) && list.indexOf(time) === index);
        let visible = false;
        try {
            for (const seconds of samples) {
                const result = await this.request('render', { seconds, width, height, force: true });
                result.bitmap?.close();
                this.service = result.service;
                if (result.hasOverlay) {
                    visible = true;
                    break;
                }
            }
        }
        finally {
            // Verification samples must not leave mpv ahead of the browser A/V clock.
            const result = await this.request('render', { seconds: this.time(), width, height, force: true });
            result.bitmap?.close();
            this.service = result.service;
        }
        if (!visible)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Selected subtitle track produced no output in the bounded startup window');
        this.verifiedTrack = selected.mpvId;
    }
    /** Internal cue oracle for tests; never exposes media text in diagnostics. */
    async currentText() {
        await this.ready;
        const width = Math.min(1920, this.video.videoWidth || this.video.width), height = Math.min(1080, this.video.videoHeight || this.video.height);
        const result = await this.request('render', { seconds: this.time(), width, height, force: false });
        result.bitmap?.close();
        return String(result.text ?? '');
    }
    suspend(value) { this.changingTrack = value; this.revision++; if (!value)
        this.invalidate(); }
    async seek(seconds) { this.changingTrack = true; this.revision++; this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height); try {
        await this.request('seek', { seconds });
    }
    finally {
        this.changingTrack = false;
        this.invalidate();
    } }
    visible(value) { this.enabled = value; this.canvas.style.display = value ? 'block' : 'none'; this.invalidate(); }
    invalidate() { this.revision++; this.last = ''; if (!this.stopped && !this.frame)
        this.frame = requestAnimationFrame(() => this.tick()); }
    tick() {
        this.frame = 0;
        if (this.stopped || !this.enabled || this.changingTrack)
            return;
        const rect = this.video.getBoundingClientRect(), parent = this.video.parentElement.getBoundingClientRect();
        const ratio = this.video.videoWidth / this.video.videoHeight;
        let width = rect.width, height = rect.height;
        if (Number.isFinite(ratio)) {
            if (width / height > ratio)
                width = height * ratio;
            else
                height = width / ratio;
        }
        if (width < 1 || height < 1) {
            this.frame = requestAnimationFrame(() => this.tick());
            return;
        }
        this.canvas.style.left = `${rect.left - parent.left + (rect.width - width) / 2}px`;
        this.canvas.style.top = `${rect.top - parent.top + (rect.height - height) / 2}px`;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        const scale = Math.min(1, 1920 / width, 1080 / height), w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
        const sourceWidth = this.video.videoWidth, sourceHeight = this.video.videoHeight;
        const seconds = this.time(), key = `${w}:${h}:${sourceWidth}:${sourceHeight}:${seconds}`, revision = this.revision;
        if (!this.busy && key !== this.last) {
            this.busy = true;
            this.request('render', { seconds, width: w, height: h, sourceWidth, sourceHeight, force: this.lastRevision !== revision }).then(({ bitmap, size, unchanged, service }) => {
                this.service = service;
                if (this.stopped || !this.enabled || revision !== this.revision) {
                    bitmap?.close();
                    this.stats.discarded++;
                    return;
                }
                this.lastRevision = revision;
                this.stats.position = seconds;
                if (unchanged) {
                    this.stats.renders++;
                    this.last = key;
                    return;
                }
                // Resize only when a complete accepted replacement bitmap is ready. A
                // paused resize must redraw active cues even if libass reports unchanged.
                this.canvas.width = w;
                this.canvas.height = h;
                const context = this.canvas.getContext('2d');
                if (bitmap) {
                    context.drawImage(bitmap, 0, 0);
                    bitmap.close();
                }
                this.stats.renders++;
                this.stats.bitmapUpdates++;
                this.stats.bytes += size;
                this.stats.peakBytes = Math.max(this.stats.peakBytes, size);
                this.last = key;
            }, error => this.fail(error)).finally(() => { this.busy = false; });
        }
        if (!this.video.paused || this.busy || this.last !== key)
            this.frame = requestAnimationFrame(() => this.tick());
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.destruction = new Promise(resolve => { const timer = setTimeout(() => { this.worker.terminate(); resolve(); }, 5000); this.closed = () => { clearTimeout(timer); this.worker.terminate(); resolve(); }; });
        this.stopped = true;
        this.revision++;
        this.loading.abort();
        cancelAnimationFrame(this.frame);
        this.observer?.disconnect();
        this.handlers.forEach(f => f());
        this.worker.postMessage({ type: 'close' });
        for (const p of this.pending.values()) {
            clearTimeout(p.timer);
            p.reject(Error('Subtitle renderer destroyed'));
        }
        this.pending.clear();
        this.canvas.remove();
        return this.destruction;
    }
}
