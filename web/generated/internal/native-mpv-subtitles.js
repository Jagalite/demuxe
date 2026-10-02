// SPDX-License-Identifier: Apache-2.0
import { initialNativeSubtitleLifetime, acknowledgeNativeSubtitleClose, nativeSubtitleCurrent, startNativeSubtitleInitialization, finishNativeSubtitleInitialization, nativeSubtitleInitializationRemaining, admitNativeSubtitleRequest, settleNativeSubtitleRequest, nativeSubtitleRequestRemaining, closeNativeSubtitleLifetime, nativeSubtitleCloseRemaining, finishNativeSubtitleClose } from './machine/native-subtitle-lifetime.js';
import { runtimeWorker } from './runtime-worker.js';
import { PlayerError } from './errors.js';
import { BrowserCaptionUnsupported } from './plain-vtt.js';
/** One mpv owner for embedded and external subtitles on the accepted media timeline. */
export class NativeMpvSubtitles {
    video;
    time;
    source;
    failed;
    defaultStreamIndex;
    runtime;
    lifetime = initialNativeSubtitleLifetime();
    canvas = document.createElement('canvas');
    worker;
    closed;
    destruction;
    pending = new Map();
    revision = 0;
    timingEpoch = 0;
    deadlineEpoch = -1;
    schedulerMode = 'fallback';
    pumpTimer;
    pumpBusy = false;
    get stopped() { return this.lifetime.requests.phase !== 'active'; }
    current(epoch) { if (!nativeSubtitleCurrent(this.lifetime, epoch))
        throw Error('Subtitle renderer destroyed'); }
    enabled = false;
    busy = false;
    changingTrack = false;
    frame = 0;
    last = '';
    lastRevision = -1;
    verifiedTrack;
    loading = new AbortController();
    cancelInitialization;
    observer;
    handlers = [];
    ready;
    tracks = [];
    service = {};
    stats = { position: -1, renders: 0, bitmapUpdates: 0, bytes: 0, peakBytes: 0, discarded: 0, stateUpdates: 0, scheduler: 'frame' };
    constructor(video, time, base, fonts, source, failed, defaultStreamIndex, runtime = 'pthread') {
        this.video = video;
        this.time = time;
        this.source = source;
        this.failed = failed;
        this.defaultStreamIndex = defaultStreamIndex;
        this.runtime = runtime;
        const epoch = this.lifetime.epoch;
        if (this.runtime === 'pthread' && !crossOriginIsolated)
            throw Error('Native mpv subtitles requires cross-origin isolation');
        this.canvas.className = 'demuxe-native-ass';
        this.canvas.style.cssText = 'position:absolute;pointer-events:none;display:none';
        if (!video.parentElement)
            throw Error('Missing Native presentation container');
        // Worker construction can synchronously fail (CSP, URL or allocation).
        // Do not attach a canvas until its owner exists.
        this.worker = runtimeWorker(new URL('web/mpv-subtitle-worker.js', base), { type: 'module' });
        const parent = video.parentElement, prior = { position: parent.style.position, fit: video.style.objectFit, pip: video.disablePictureInPicture, remote: video.disableRemotePlayback };
        try {
            parent.style.position = 'relative';
            this.current(epoch);
            parent.append(this.canvas);
            this.current(epoch);
            video.style.objectFit = 'contain';
            this.current(epoch);
            video.disablePictureInPicture = true;
            this.current(epoch);
            video.disableRemotePlayback = true;
            this.current(epoch);
            this.current(epoch);
            this.worker.onmessage = ({ data }) => {
                if (data.type === 'closed') {
                    if (this.lifetime.requests.phase === 'closing') {
                        this.lifetime = acknowledgeNativeSubtitleClose(this.lifetime);
                        this.service = { ...this.service, cleanup: data.cleanup, closeError: data.error };
                        this.closed?.();
                    }
                    return;
                }
                if (!nativeSubtitleCurrent(this.lifetime, epoch)) {
                    data.bitmap?.close();
                    return;
                }
                if (data.type === 'refresh') {
                    const source = this.source, refresh = source instanceof File ? undefined : source.refreshAuthorization;
                    void Promise.resolve().then(() => { this.current(epoch); if (!refresh)
                        throw Error('Authorization refresh unavailable'); return refresh.call(source, data.resource); }).then(update => { if (nativeSubtitleCurrent(this.lifetime, epoch))
                        this.worker.postMessage({ type: 'refreshed', id: data.id, update }); }, error => { if (nativeSubtitleCurrent(this.lifetime, epoch))
                        this.worker.postMessage({ type: 'refreshed', id: data.id, error: String(error) }); });
                    return;
                }
                if (data.type === 'subtitleTimingChanged') {
                    this.timingEpoch = data.epoch >>> 0;
                    if (this.schedulerMode !== 'fallback')
                        void this.pump();
                    return;
                }
                if (data.type === 'subtitleDeadline') {
                    if (this.schedulerMode === 'deadline' && data.epoch === this.deadlineEpoch && !this.video.paused && !document.hidden) {
                        if (this.time() + .004 >= data.target)
                            this.invalidate();
                        else
                            void this.pump();
                    }
                    return;
                }
                const error = data.error ? (/^Error: Subtitle (?:decoder unavailable|decode failed|packet deadline exceeded|source load failed|selection failed|seek failed)/.test(data.error) ? new BrowserCaptionUnsupported(data.error) : Error(data.error)) : undefined;
                this.completeRequest(data.id, error === undefined, data, error);
            };
            this.current(epoch);
            this.worker.onerror = e => { e.preventDefault(); this.fail(Error(e.message || 'Subtitle worker failed')); };
            this.current(epoch);
            this.worker.onmessageerror = () => this.fail(Error('Subtitle worker message failure'));
            this.current(epoch);
            const observer = new ResizeObserver(() => this.invalidate());
            if (!nativeSubtitleCurrent(this.lifetime, epoch)) {
                observer.disconnect();
                this.current(epoch);
            }
            this.observer = observer;
            observer.observe(video);
            this.current(epoch);
            const listen = (target, type, listener) => { target.addEventListener(type, listener); if (!nativeSubtitleCurrent(this.lifetime, epoch)) {
                target.removeEventListener(type, listener);
                this.current(epoch);
            } this.handlers.push(() => target.removeEventListener(type, listener)); };
            for (const event of ['seeked', 'seeking', 'pause', 'play', 'ratechange', 'loadedmetadata', 'ended']) {
                const listener = () => { this.syncPump(); this.invalidate(); };
                listen(video, event, listener);
            }
            const visibility = () => { this.syncPump(); this.invalidate(); };
            listen(document, 'visibilitychange', visibility);
            const fullscreen = () => { if (document.fullscreenElement === video)
                this.fail(Error('Native mpv subtitles requires fullscreen on the player container, not the video element'));
            else
                this.invalidate(); };
            listen(document, 'fullscreenchange', fullscreen);
            this.ready = (async () => {
                const cancelDeadline = this.initializationDeadline(epoch);
                try {
                    const directory = this.runtime === 'pthread' ? 'engine-subtitles' : `engine-mpv-subtitles-${this.runtime}`;
                    for (const name of ['service.mjs', 'service.wasm']) {
                        const asset = await fetch(new URL(`web/${directory}/${name}`, base), { method: 'HEAD', signal: this.loading.signal });
                        this.current(epoch);
                        if (asset.status === 404)
                            throw new BrowserCaptionUnsupported('mpv subtitle runtime is not installed');
                        if (!asset.ok)
                            throw new PlayerError(asset.status === 401 || asset.status === 403 ? 'SOURCE_PERMISSION' : 'ASSET_LOAD_FAILED', `mpv subtitle asset check failed (${asset.status})`);
                    }
                    const response = await fetch(new URL('fixtures/DejaVuSans.ttf', base), { signal: this.loading.signal });
                    this.current(epoch);
                    if (!response.ok)
                        throw Error('Subtitle default font unavailable');
                    const bytes = await response.arrayBuffer();
                    this.current(epoch);
                    if (bytes.byteLength > 8 * 1024 * 1024)
                        throw Error('Subtitle font budget exceeded');
                    if (this.stopped)
                        throw Error('Subtitle renderer destroyed');
                    const source = this.source;
                    const transport = source instanceof File ? { file: source } : (() => { const { refreshAuthorization, ...options } = source; return { options, canRefresh: !!refreshAuthorization }; })();
                    const result = await this.request('init', { ...transport, runtime: this.runtime, fonts: [{ name: 'DejaVuSans.ttf', bytes }, ...fonts] });
                    this.current(epoch);
                    this.tracks = result.tracks;
                    if (this.defaultStreamIndex !== undefined && !this.tracks.some(track => track['ff-index'] === this.defaultStreamIndex))
                        throw new PlayerError('UNSUPPORTED_FEATURE', 'Inspected subtitle stream was not enumerated by mpv');
                    for (const track of this.tracks)
                        track.default = track['ff-index'] === this.defaultStreamIndex;
                }
                finally {
                    this.lifetime = finishNativeSubtitleInitialization(this.lifetime, epoch);
                    cancelDeadline();
                }
            })();
            this.ready.catch(() => { });
        }
        catch (error) {
            void this.destroy().catch(() => { });
            parent.style.position = prior.position;
            video.style.objectFit = prior.fit;
            video.disablePictureInPicture = prior.pip;
            video.disableRemotePlayback = prior.remote;
            throw error;
        }
    }
    async add(asset) {
        await this.ready;
        const result = await this.request('add', { asset });
        const index = this.tracks.filter(t => t.external).length + 1;
        const track = { id: String(100000 + index), mpvId: result.mpvId, 'ff-index': -1, type: 'sub', external: true, 'attachment-id': asset.attachmentId, 'external-index': index, title: asset.label, lang: asset.language, codec: asset.format };
        this.tracks.push(track);
        try {
            if (asset.select)
                await this.select(track.id);
        }
        catch (error) {
            this.tracks.splice(this.tracks.indexOf(track), 1);
            await this.request('remove', { trackId: track.mpvId });
            throw error;
        }
        return track.id;
    }
    initializationDeadline(epoch) {
        const now = performance.now();
        this.current(epoch);
        this.lifetime = startNativeSubtitleInitialization(this.lifetime, now);
        let timer;
        const cancel = () => { const pending = timer; timer = undefined; if (pending?.handle !== undefined)
            clearTimeout(pending.handle); };
        const arm = (delay) => {
            const registration = {};
            timer = registration;
            const acquired = setTimeout(() => { if (timer !== registration)
                return; timer = undefined; try {
                const remaining = nativeSubtitleInitializationRemaining(this.lifetime, epoch, performance.now());
                if (remaining === undefined)
                    return;
                if (remaining > 0) {
                    arm(remaining);
                    return;
                }
                this.loading.abort();
            }
            catch (error) {
                try {
                    this.loading.abort();
                }
                finally {
                    this.fail(error);
                }
            } }, delay);
            registration.handle = acquired;
            if (timer !== registration || !nativeSubtitleCurrent(this.lifetime, epoch)) {
                clearTimeout(acquired);
                this.current(epoch);
            }
        };
        this.cancelInitialization = cancel;
        try {
            arm(25000);
        }
        catch (error) {
            if (this.cancelInitialization === cancel)
                this.cancelInitialization = undefined;
            cancel();
            throw error;
        }
        return () => { if (this.cancelInitialization === cancel)
            this.cancelInitialization = undefined; cancel(); };
    }
    completeRequest(id, success, value, error) {
        const p = this.pending.get(id), settled = settleNativeSubtitleRequest(this.lifetime, id);
        this.lifetime = settled.state;
        if (!p || !settled.accepted) {
            value?.bitmap?.close();
            return;
        }
        this.pending.delete(id);
        const timer = p.timer;
        p.timer = undefined;
        let cleanup;
        for (const release of [() => { if (timer?.handle !== undefined)
                clearTimeout(timer.handle); }, p.detach])
            try {
                release();
            }
            catch (failure) {
                cleanup ??= failure;
            }
        if (success && (!nativeSubtitleCurrent(this.lifetime, p.epoch) || cleanup !== undefined)) {
            success = false;
            error = cleanup ?? Error('Subtitle renderer destroyed');
        }
        if (success)
            p.resolve(value);
        else {
            try {
                value?.bitmap?.close();
            }
            finally {
                p.reject(error);
            }
        }
    }
    rejectRequests(ids, error) {
        for (const id of ids) {
            const p = this.pending.get(id);
            if (!p)
                continue;
            this.pending.delete(id);
            const timer = p.timer;
            p.timer = undefined;
            for (const release of [() => { if (timer?.handle !== undefined)
                    clearTimeout(timer.handle); }, p.detach])
                try {
                    release();
                }
                catch { }
            p.reject(error);
        }
    }
    request(type, data = {}, signal) {
        if (signal?.aborted)
            return Promise.reject(signal.reason);
        const now = performance.now(), admission = admitNativeSubtitleRequest(this.lifetime, type, now);
        this.lifetime = admission.state;
        if (admission.effect.kind === 'reject')
            return Promise.reject(Error('Subtitle renderer destroyed'));
        const { id, deadline } = admission.effect.request, epoch = this.lifetime.epoch;
        return new Promise((resolve, reject) => {
            const abort = () => this.completeRequest(id, false, undefined, signal?.reason), p = { epoch, resolve, reject, timer: undefined, detach: () => signal?.removeEventListener('abort', abort) };
            this.pending.set(id, p);
            const arm = (delay) => {
                const registration = {};
                p.timer = registration;
                const acquired = setTimeout(() => { if (p.timer !== registration)
                    return; p.timer = undefined; try {
                    const remaining = nativeSubtitleRequestRemaining(this.lifetime, id, performance.now());
                    if (remaining === undefined)
                        return;
                    if (remaining > 0) {
                        arm(remaining);
                        return;
                    }
                    this.fail(Error('Subtitle worker deadline exceeded'));
                }
                catch (error) {
                    this.fail(error);
                } }, delay);
                registration.handle = acquired;
                if (p.timer !== registration || this.pending.get(id) !== p || !nativeSubtitleCurrent(this.lifetime, epoch)) {
                    clearTimeout(acquired);
                    this.current(epoch);
                }
            };
            try {
                signal?.addEventListener('abort', abort, { once: true });
                if (this.pending.get(id) !== p || !nativeSubtitleCurrent(this.lifetime, epoch)) {
                    p.detach();
                    this.current(epoch);
                    return;
                }
                signal?.throwIfAborted();
                arm(deadline - now);
                this.current(epoch);
                if (this.pending.get(id) !== p)
                    return;
                this.worker.postMessage({ id, type, ...data });
            }
            catch (error) {
                this.completeRequest(id, false, undefined, error);
            }
        });
    }
    fail(error) {
        const now = performance.now(), retired = closeNativeSubtitleLifetime(this.lifetime, now, true);
        this.lifetime = retired.state;
        if (!retired.notify)
            return;
        this.rejectRequests(retired.reject, error);
        void this.destroy().catch(() => { });
        this.failed(error);
    }
    applyMode(mode) {
        const next = mode === 'deadline' || mode === 'animated' ? mode : 'fallback';
        if (this.schedulerMode === next)
            return;
        this.schedulerMode = next;
        this.stats.scheduler = next === 'fallback' ? 'frame' : next;
        this.syncPump();
        this.invalidate();
    }
    syncPump() {
        const running = this.schedulerMode !== 'fallback' && this.enabled && !this.changingTrack && !this.video.paused && !this.video.ended && !document.hidden;
        if (running) {
            if (!this.pumpTimer) {
                this.pumpTimer = setInterval(() => { void this.pump(); }, 100);
                void this.pump();
            }
        }
        else {
            if (this.pumpTimer) {
                clearInterval(this.pumpTimer);
                this.pumpTimer = undefined;
            }
            this.deadlineEpoch = -1;
            if (this.schedulerMode === 'deadline' && !this.stopped)
                void this.request('cancelDeadline').catch(error => this.fail(error));
        }
    }
    async pump() {
        if (this.pumpBusy || this.stopped || this.schedulerMode === 'fallback' || !this.enabled || this.changingTrack || this.video.paused || this.video.ended || document.hidden)
            return;
        this.pumpBusy = true;
        try {
            const result = await this.request('pump', { seconds: this.time(), rate: this.video.playbackRate, running: true });
            if (this.stopped)
                return;
            this.service = result.service ?? this.service;
            this.applyMode(result.mode);
            this.stats.stateUpdates++;
            this.deadlineEpoch = result.schedule?.epoch ?? -1;
            if (result.timingChanged)
                this.invalidate();
        }
        catch (error) {
            this.fail(error);
        }
        finally {
            this.pumpBusy = false;
        }
    }
    async select(id) {
        await this.ready;
        const track = id === 'no' ? undefined : id === 'auto' ? (this.tracks.find(t => t.external && t.selected) ?? this.tracks.find(t => t.default) ?? this.tracks.find(t => !t.external)) : this.tracks.find(t => t.id === id);
        if (track?.selected)
            return;
        if (!track && id !== 'no' && id !== 'auto')
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Requested subtitle track was not enumerated by mpv');
        const previous = this.tracks.find(t => t.selected);
        this.changingTrack = true;
        this.applyMode('fallback');
        this.syncPump();
        this.revision++;
        try {
            await this.request('select', { trackId: track?.mpvId ?? -2 });
            this.tracks.forEach(t => t.selected = t === track);
            this.verifiedTrack = undefined;
            if (track) {
                await this.verify();
                const profile = await this.request('profile');
                this.applyMode(profile.mode);
            }
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
            this.syncPump();
            this.invalidate();
        }
    }
    async verify(signal) {
        signal?.throwIfAborted();
        const selected = this.tracks.find(t => t.selected);
        if (!selected || this.verifiedTrack === selected.mpvId)
            return;
        const width = Math.min(1920, this.video.videoWidth || this.video.width), height = Math.min(1080, this.video.videoHeight || this.video.height);
        const now = this.time(), duration = this.video.duration;
        const samples = (selected.external ? [now] : [now, 0, 1, 2, 5, 10, 20, 30]).filter((time, index, list) => time >= 0 && (!Number.isFinite(duration) || time < duration) && list.indexOf(time) === index);
        let visible = false;
        try {
            for (const seconds of samples) {
                const result = await this.request('render', { seconds, width, height, force: true }, signal);
                result.bitmap?.close();
                signal?.throwIfAborted();
                this.service = result.service;
                if (result.hasOverlay) {
                    visible = true;
                    break;
                }
            }
        }
        finally {
            // Verification samples must not leave mpv ahead of the browser A/V clock.
            if (!signal?.aborted) {
                const result = await this.request('render', { seconds: this.time(), width, height, force: true }, signal);
                result.bitmap?.close();
                signal?.throwIfAborted();
                this.service = result.service;
            }
            else
                this.invalidate();
        }
        // Parsed external files may intentionally have no cue near the playhead.
        if (!visible && !selected.external)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Selected subtitle track produced no output in the bounded startup window');
        this.verifiedTrack = selected.mpvId;
    }
    /** Internal cue oracle for tests; never exposes media text in diagnostics. */
    async currentText() {
        await this.ready;
        const width = Math.min(1920, this.video.videoWidth || this.video.width), height = Math.min(1080, this.video.videoHeight || this.video.height);
        const result = await this.request('render', { seconds: this.time(), width, height, force: false, rate: this.video.playbackRate, running: !this.video.paused && !document.hidden });
        result.bitmap?.close();
        return String(result.text ?? '');
    }
    /** Internal numeric timing probe. The current frame scheduler does not use it. */
    async timingSnapshot(seconds = this.time()) {
        await this.ready;
        const revision = this.revision;
        const result = await this.request('timing', { seconds });
        const newerNotification = this.timingEpoch !== result.epoch && ((this.timingEpoch - result.epoch) >>> 0) < 0x80000000;
        return { ...result, revision, stale: result.unstable || this.stopped || revision !== this.revision || newerNotification };
    }
    suspend(value) { this.changingTrack = value; this.revision++; this.syncPump(); if (!value)
        this.invalidate(); }
    async seek(seconds) { this.changingTrack = true; this.revision++; this.syncPump(); this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height); try {
        await this.request('seek', { seconds });
    }
    finally {
        this.changingTrack = false;
        this.syncPump();
        this.invalidate();
    } }
    visible(value) { this.enabled = value; this.canvas.style.display = value ? 'block' : 'none'; this.syncPump(); this.invalidate(); }
    invalidate() { this.revision++; this.last = ''; if (!this.stopped && !this.frame)
        this.frame = requestAnimationFrame(() => this.tick()); }
    tick() {
        this.frame = 0;
        if (this.stopped || !this.enabled || this.changingTrack || this.schedulerMode === 'deadline' && document.hidden)
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
            this.request('render', { seconds, width: w, height: h, sourceWidth, sourceHeight, force: this.lastRevision !== revision, rate: this.video.playbackRate, running: !this.video.paused && !this.video.ended && !document.hidden }).then(({ bitmap, size, unchanged, service, mode, schedule }) => {
                this.service = service;
                this.applyMode(mode);
                if (this.schedulerMode === 'deadline')
                    this.deadlineEpoch = schedule?.epoch ?? -1;
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
            }, error => this.fail(error)).finally(() => {
                this.busy = false;
                // A static invalidation can arrive while this render is in flight.
                // The old response is discarded above, so schedule its replacement.
                if (this.schedulerMode === 'deadline' && !this.stopped && this.enabled && revision !== this.revision)
                    this.invalidate();
            });
        }
        if (this.schedulerMode !== 'deadline' && (!this.video.paused || this.busy || this.last !== key))
            this.frame = requestAnimationFrame(() => this.tick());
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        const now = performance.now(), retired = closeNativeSubtitleLifetime(this.lifetime, now);
        this.lifetime = retired.state;
        let resolve, reject;
        const done = new Promise((yes, no) => { resolve = yes; reject = no; });
        this.destruction = done;
        const worker = this.worker, observer = this.observer, cancelInitialization = this.cancelInitialization, handlers = this.handlers.splice(0), frame = this.frame, pump = this.pumpTimer;
        this.frame = 0;
        this.pumpTimer = undefined;
        this.observer = undefined;
        this.cancelInitialization = undefined;
        this.revision++;
        let timer, finished = false, cleanupComplete = false, finishRequested = this.lifetime.acknowledged;
        const errors = [];
        const attempt = (work) => { try {
            work();
        }
        catch (error) {
            errors.push(error);
        } };
        const finish = () => { if (finished)
            return; finishRequested = true; if (!cleanupComplete)
            return; finished = true; this.lifetime = finishNativeSubtitleClose(this.lifetime); const pending = timer; timer = undefined; this.closed = undefined; attempt(() => { if (pending?.handle !== undefined)
            clearTimeout(pending.handle); }); attempt(() => worker?.terminate()); errors.length ? reject(errors.length === 1 ? errors[0] : new AggregateError(errors, 'Subtitle renderer cleanup failed')) : resolve(); };
        const arm = (delay) => { const registration = {}; timer = registration; const acquired = setTimeout(() => { if (timer !== registration)
            return; timer = undefined; try {
            const remaining = nativeSubtitleCloseRemaining(this.lifetime, performance.now());
            if (remaining !== undefined && remaining > 0) {
                arm(remaining);
                return;
            }
            finish();
        }
        catch (error) {
            errors.push(error);
            finish();
        } }, delay); registration.handle = acquired; if (finished || timer !== registration)
            clearTimeout(acquired); };
        this.closed = finish;
        this.rejectRequests(retired.reject, Error('Subtitle renderer destroyed'));
        for (const release of [() => cancelInitialization?.(), () => this.loading.abort(), () => cancelAnimationFrame(frame), () => { if (pump)
                clearInterval(pump); }, () => observer?.disconnect(), ...handlers, () => this.canvas.remove()])
            attempt(release);
        cleanupComplete = true;
        if (finishRequested)
            finish();
        try {
            if (!finished)
                arm(nativeSubtitleCloseRemaining(this.lifetime, now) ?? 0);
            if (!finished)
                worker?.postMessage({ type: 'close' });
        }
        catch (error) {
            errors.push(error);
            finish();
        }
        return done;
    }
}
