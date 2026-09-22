import { bufferingPolicy, resolveBuffering } from './buffering.js';
// SPDX-License-Identifier: GPL-3.0-or-later
import { plainVTT, BrowserCaptionUnsupported } from './plain-vtt.js';
import { nativeMediaError, compatibilityFailure, StartupEvidenceTimeout } from './runtime-capability.js';
import { PlayerError } from './errors.js';
/** Browser media ownership, including listeners, pending loads and object URLs. */
export class NativePlayer extends EventTarget {
    video;
    remuxPolicy;
    assetBase;
    bufferedSeeks;
    audioAdaptation;
    initialAudioTrack;
    nativeASS;
    fonts;
    requestedPlan;
    buffering;
    ready = Promise.resolve();
    properties = new Map();
    stopped = false;
    capability = {};
    ass;
    assAssets = [];
    assIndex = -1;
    captionAssets = new Map();
    captionURLs = new Set();
    gainContext;
    gainSource;
    gainNode;
    gainValue = 1;
    async gain(value) {
        this.assertActive();
        if (!Number.isFinite(value) || value < 0 || value > 1)
            throw new Error('Gain must be between 0 and 1');
        if (!this.gainSource && value !== 1) {
            const context = this.gainContext ?? (this.gainContext = new AudioContext());
            // Resume before redirecting an already playing element into the graph.
            // Ownership is recorded before awaiting; destroy cancels the wait.
            if (!this.video.paused)
                await this.resumeGain();
            this.assertActive();
            const source = context.createMediaElementSource(this.video), gain = context.createGain();
            gain.gain.setValueAtTime(value, context.currentTime);
            source.connect(gain);
            gain.connect(context.destination);
            this.gainSource = source;
            this.gainNode = gain;
        }
        if (this.gainNode)
            this.gainNode.gain.setValueAtTime(value, this.gainContext.currentTime);
        this.gainValue = value;
    }
    async resumeGain() {
        const context = this.gainContext;
        if (!context || context.state !== 'suspended')
            return;
        await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                this.cancelers.delete(cancel);
                error ? reject(error) : resolve();
            };
            const cancel = (error) => finish(error);
            const timer = setTimeout(() => finish(new DOMException('Audio activation timed out', 'NotAllowedError')), 10000);
            this.cancelers.add(cancel);
            context.resume().then(() => finish(), error => finish(error));
        });
        this.assertActive();
    }
    destruction;
    opening = false;
    remux;
    adapted = false;
    remuxSource;
    directFailure;
    remoteSource;
    shiftedCues = new WeakSet();
    sourceTime() { return Math.max(0, this.video.currentTime - (this.remux?.timelineBias ?? 0)); }
    sourceDuration() { if (this.remux?.windowed)
        return this.remux.duration ?? 0; return Number.isFinite(this.video.duration) ? Math.max(0, this.video.duration - (this.remux?.timelineBias ?? 0)) : 0; }
    objectURL;
    selectedSub = 'auto';
    subsVisible = true;
    cancelers = new Set();
    listeners = [];
    constructor(video, remuxPolicy = 'auto', assetBase = new URL('../../../', import.meta.url), bufferedSeeks = false, audioAdaptation, initialAudioTrack, nativeASS = false, fonts = [], requestedPlan, buffering = bufferingPolicy()) {
        super();
        this.video = video;
        this.remuxPolicy = remuxPolicy;
        this.assetBase = assetBase;
        this.bufferedSeeks = bufferedSeeks;
        this.audioAdaptation = audioAdaptation;
        this.initialAudioTrack = initialAudioTrack;
        this.nativeASS = nativeASS;
        this.fonts = fonts;
        this.requestedPlan = requestedPlan;
        this.buffering = buffering;
        video.playsInline = true;
        video.preload = this.buffering.preload;
        for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'volumechange', 'ratechange', 'ended', 'waiting', 'playing', 'progress', 'seeking', 'seeked', 'resize']) {
            const listener = () => {
                this.refresh();
                this.emit('activity', event);
                if (event === 'ended' && (!this.remux?.windowed || this.remux.playbackEnded))
                    this.emit('mpv', { event: 'end-file', reason: 'eof' });
            };
            video.addEventListener(event, listener);
            this.listeners.push(() => video.removeEventListener(event, listener));
        }
        const failed = () => {
            if (this.opening || this.remux?.starting || this.stopped)
                return;
            void this.classifyDirectFailure(nativeMediaError(video.error)).then(error => { if (!this.stopped)
                this.emit('error', error); }, error => { if (!this.stopped)
                this.emit('error', error); });
        };
        video.addEventListener('error', failed);
        this.listeners.push(() => video.removeEventListener('error', failed));
        const tracks = () => this.refresh();
        video.textTracks.addEventListener('change', tracks);
        video.textTracks.addEventListener('addtrack', tracks);
        this.listeners.push(() => { video.textTracks.removeEventListener('change', tracks); video.textTracks.removeEventListener('addtrack', tracks); });
        this.refresh();
    }
    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
    assertActive() { if (this.stopped)
        throw new Error('Player is destroyed'); }
    wait(event, start) {
        this.assertActive();
        return new Promise((resolve, reject) => {
            const finish = (error) => {
                clearTimeout(timer);
                this.video.removeEventListener(event, done);
                this.video.removeEventListener('error', failed);
                this.cancelers.delete(cancel);
                error ? reject(error) : resolve();
            };
            const done = () => finish();
            const failed = () => finish(nativeMediaError(this.video.error));
            const cancel = (error) => finish(error);
            const timer = setTimeout(() => finish(new Error(`Native ${event} timed out`)), 25000);
            this.cancelers.add(cancel);
            this.video.addEventListener(event, done, { once: true });
            this.video.addEventListener('error', failed, { once: true });
            try {
                start();
            }
            catch (error) {
                finish(error);
            }
        });
    }
    // File captions have their own ID range; DOM insertion order must not reassign
    // IDs of URL-backed browser tracks when a session replays both kinds.
    textTrackId(track) {
        const caption = this.captionAssets.get(track);
        return caption ? String(200000 + caption.index) : String(Array.from(this.video.textTracks).filter(t => !this.captionAssets.has(t)).indexOf(track) + 1);
    }
    refresh() {
        const tracks = Array.from(this.video.textTracks, t => ({ id: this.textTrackId(t), type: 'sub', title: t.label, lang: t.language, selected: t.mode === 'showing', ...(this.captionAssets.has(t) ? { external: true, 'external-index': this.captionAssets.get(t).index, codec: 'webvtt' } : {}) }));
        tracks.push(...this.assAssets.map((a, i) => ({ id: String(100001 + i), type: 'sub', codec: a.format, title: a.label, lang: a.language, external: true, 'external-index': i + 1, selected: (this.selectedSub === 'auto' || Number(this.selectedSub) === 100001 + i) && this.assIndex === i })));
        const audio = this.video.audioTracks;
        if (this.remux?.tracks)
            tracks.push(...this.remux.tracks.filter(t => t.type === 'audio').map(t => ({ ...t, selected: t.selected && !this.video.muted })));
        else if (audio)
            tracks.push(...Array.from(audio, (t, i) => ({ id: String(i + 1), type: 'audio', title: t.label, lang: t.language, selected: t.enabled })));
        const timeRanges = (r) => Array.from({ length: r.length }, (_, i) => ({ start: Math.max(0, r.start(i) - (this.remux?.timelineBias ?? 0)), end: Math.max(0, r.end(i) - (this.remux?.timelineBias ?? 0)) }));
        const values = { 'time-pos': this.sourceTime(), duration: Number.isFinite(this.video.duration) ? this.sourceDuration() : null, 'native-buffered': this.remux?.windowed ? (this.remux.ranges?.() ?? []).map(([start, end]) => ({ start, end })) : timeRanges(this.video.buffered), 'native-seekable': this.remux?.windowed ? [{ start: 0, end: this.sourceDuration() }] : timeRanges(this.video.seekable), 'native-live': this.video.duration === Infinity, pause: this.remux?.playbackPaused ?? this.video.paused, 'eof-reached': this.remux?.playbackEnded ?? this.video.ended, volume: this.video.volume * 100, speed: this.video.playbackRate, 'track-list': tracks };
        for (const [name, data] of Object.entries(values)) {
            if (name !== 'track-list' && this.properties.get(name) === data)
                continue;
            this.properties.set(name, data);
            this.emit('mpv', { event: 'property-change', name, data });
        }
    }
    get diagnostics() { const q = this.video.getVideoPlaybackQuality(), remux = this.remux?.snapshot(); return { buffering: { ...resolveBuffering(this.buffering, this.remux ? 'remux' : 'browser'), settings: remux?.buffering ?? { elementPreload: this.video.preload } }, capability: { ...this.capability, ...(remux?.capability ?? {}) }, path: 'native', plan: this.remux ? (this.adapted ? `adapted-${this.audioAdaptation}` : 'remux') : 'direct', subtitleOverlay: this.ass ? { component: 'libass', scope: 'external-ass', destination: 'container-only', ...this.ass.stats } : undefined, audioProcessing: { component: this.gainContext ? 'web-audio-gain' : 'media-element', gain: this.gainValue, contextState: this.gainContext?.state, baseLatency: this.gainContext?.baseLatency }, directFailure: this.directFailure, remux, position: this.sourceTime(), rendered: q.totalVideoFrames, dropped: q.droppedVideoFrames, readyState: this.video.readyState }; }
    async load(url) {
        // open promises metadata even when speculative preload was disabled.
        if (this.buffering.preload === 'none')
            this.video.preload = 'metadata';
        try {
            await this.wait(this.buffering.preload === 'auto' ? 'loadeddata' : 'loadedmetadata', () => { this.video.src = url; this.video.load(); });
        }
        finally {
            this.video.preload = this.buffering.preload;
        }
        this.capability.metadata = true;
        this.refresh();
        this.emit('mpv', { event: 'file-loaded' });
    }
    expectedOutput;
    /** A paused candidate may prepare current data without presenting it. Only
     * verifyOutput can promote this evidence to executed playback. */
    async verifyStartup(expected, output = false) {
        this.assertActive();
        this.expectedOutput = expected ?? this.expectedOutput;
        expected = this.expectedOutput;
        const previouslyVerified = this.capability.outputVerified === true;
        if (output) {
            this.capability.completedAtEOF = false;
            this.capability.outputVerified = false;
            this.capability.videoPresented = false;
            this.capability.playbackReady = false;
            this.capability.audioProgress = false;
        }
        const v = this.video;
        const initialTime = v.currentTime, initialFrames = v.getVideoPlaybackQuality().totalVideoFrames;
        const timing = this.capability.timing ?? (this.capability.timing = {});
        timing[output ? 'outputRequested' : 'preparationRequested'] = performance.now();
        await new Promise((resolve, reject) => {
            let finished = false, classifying = false, frame = 0, presented = false;
            const finish = (error) => { if (finished)
                return; finished = true; clearTimeout(timer); clearInterval(poll); if (frame)
                v.cancelVideoFrameCallback(frame); this.cancelers.delete(cancel); error ? reject(error) : resolve(); };
            const cancel = (error) => finish(error);
            const check = () => {
                if (this.stopped) {
                    finish(new Error('Player is destroyed'));
                    return;
                }
                if (finished || classifying)
                    return;
                if (v.error) {
                    classifying = true;
                    clearInterval(poll);
                    void this.classifyDirectFailure(nativeMediaError(v.error)).then(error => finish(error instanceof Error ? error : new Error(String(error))), error => finish(error));
                    return;
                }
                this.capability.metadata = v.readyState >= 1;
                if (this.capability.metadata)
                    timing.metadata ??= performance.now();
                const hasVideo = expected?.video ?? v.videoWidth > 0;
                const decoded = v.getVideoPlaybackQuality().totalVideoFrames > 0 || (v.mozDecodedFrames ?? 0) > 0;
                if (decoded)
                    this.capability.decoderOutput = true;
                // A previously verified session can naturally finish a short remaining
                // interval without presenting another frame. This is completion, not
                // fresh frame/audio evidence; do not strand play() until its deadline.
                if (output && previouslyVerified && v.ended) {
                    this.capability.completedAtEOF = true;
                    this.capability.outputVerified = true;
                    timing.outputAccepted = performance.now();
                    finish();
                    return;
                }
                const ready = v.readyState >= (!output && !this.remux && this.buffering.preload !== 'auto' ? 1 : 3) && !v.seeking && (!hasVideo || v.videoWidth > 0);
                if (!ready)
                    return;
                this.capability.prepared = true;
                timing.ready ??= performance.now();
                if (!output) {
                    finish();
                    return;
                }
                const advancing = (!v.paused || v.ended) && v.currentTime > initialTime + (v.ended ? 0 : .02);
                if (presented || v.getVideoPlaybackQuality().totalVideoFrames > initialFrames) {
                    this.capability.videoPresented = true;
                    timing.firstFrame ??= performance.now();
                }
                const audioCount = v.webkitAudioDecodedByteCount;
                const audioReady = !expected?.audio || (typeof audioCount === 'number' ? audioCount > 0 : typeof v.mozHasAudio === 'boolean' ? v.mozHasAudio && advancing : advancing);
                // Readiness/clock fallback is explicitly weaker than decoded-sample evidence.
                if (expected?.audio && audioReady) {
                    this.capability.audioProgress = advancing;
                    this.capability.audioEvidence = typeof audioCount === 'number' ? 'decoded-byte-counter' : typeof v.mozHasAudio === 'boolean' ? 'browser-audio-presence-and-clock' : 'browser-readiness-and-clock';
                }
                if (advancing && (!hasVideo || this.capability.videoPresented) && audioReady) {
                    this.capability.playbackReady = true;
                    this.capability.outputVerified = true;
                    timing.outputAccepted = performance.now();
                    finish();
                }
            };
            const timer = setTimeout(() => {
                const missing = v.readyState >= 3 && ((expected?.video && !v.videoWidth) || (output && expected?.audio && (v.webkitAudioDecodedByteCount === 0 || v.mozHasAudio === false)));
                finish(missing ? new PlayerError('DECODE_FAILED', 'Native selected track produced no decoded output') : new StartupEvidenceTimeout(output ? 'output' : 'preparation'));
            }, 10000);
            const poll = setInterval(check, 25);
            this.cancelers.add(cancel);
            if (output && typeof v.requestVideoFrameCallback === 'function')
                frame = v.requestVideoFrameCallback(() => { if (!finished && !this.stopped) {
                    presented = true;
                    check();
                } });
            check();
        });
    }
    verifyOutput() { return this.verifyStartup(this.expectedOutput, true); }
    async startRemux(source, target = 0) {
        this.assertActive();
        if (!crossOriginIsolated || typeof MediaSource === 'undefined')
            throw Error('Native remux requires MediaSource and cross-origin isolation');
        if (source.options?.format && source.options.format !== 'file')
            throw Error('Native remux currently requires a random-access file source; use Hybrid for this manifest');
        const moduleURL = new URL('web/native-remux-player.js', this.assetBase).href;
        const { RemuxPlayer } = await import(moduleURL);
        this.assertActive();
        const { refreshAuthorization, ...options } = source.options ?? {};
        const transport = { ...source, ...(source.options ? { options: options } : {}), refreshAuthorization };
        const attempt = async (adapted) => {
            this.assertActive();
            this.adapted = adapted;
            this.remux ??= new RemuxPlayer(this.video, { buffering: { ...resolveBuffering(this.buffering, 'remux'), preload: this.buffering.preload }, bufferedSeeks: this.bufferedSeeks, audioAdaptation: adapted ? this.audioAdaptation : undefined });
            this.remux.audioAdaptation = adapted ? this.audioAdaptation : undefined;
            this.remux.onError = message => { if (!this.opening && !this.stopped)
                this.emit('error', message); };
            await this.remux.open(transport, target);
            this.assertActive();
        };
        try {
            await attempt(!!this.requestedPlan && !!this.audioAdaptation);
        }
        catch (error) {
            if (this.requestedPlan || this.stopped || !this.audioAdaptation || !String(error).includes('Audio codec has no browser MP4 packet contract'))
                throw error;
            await attempt(true);
        }
        this.remuxSource = source;
        if (this.video.seeking)
            await this.wait('seeked', () => { });
        this.refresh();
        this.emit('source', { plan: this.adapted ? `adapted-${this.audioAdaptation}` : 'remux', tracks: this.remux.tracks });
        this.emit('mpv', { event: 'file-loaded' });
    }
    async loadPlan(source, direct, requiresRemux = false) {
        this.assertActive();
        this.opening = true;
        try {
            if (this.requestedPlan) {
                if (this.requestedPlan.startsWith('native-direct'))
                    await direct();
                else
                    await this.startRemux(source);
                return;
            }
            if (this.remuxPolicy !== 'always' && !requiresRemux) {
                try {
                    await direct();
                    return;
                }
                catch (error) {
                    if (this.stopped || this.remuxPolicy === 'never' || ![3, 4].includes(this.video.error?.code ?? 0))
                        throw error;
                    this.directFailure = String(error);
                }
            }
            else if (this.remuxPolicy === 'never')
                throw Error('Native direct cannot enforce these source permissions; enable native remux or choose Hybrid');
            await this.startRemux(source);
        }
        finally {
            this.opening = false;
        }
    }
    async open(file) {
        this.assertActive();
        const local = file instanceof File ? file : new File([file], 'media');
        this.objectURL = URL.createObjectURL(local);
        try {
            await this.loadPlan({ file: local, audioTrack: this.initialAudioTrack }, () => this.load(this.objectURL));
        }
        catch (error) {
            URL.revokeObjectURL(this.objectURL);
            this.objectURL = undefined;
            throw error;
        }
    }
    async openRemote(source) {
        this.assertActive();
        const url = new URL(source.url, location.href);
        if (!['http:', 'https:'].includes(url.protocol))
            throw Error('Remote sources require HTTP or HTTPS');
        const requiresRemux = !!(source.headers || source.refreshAuthorization || source.allowedOrigins || source.immutable !== undefined || source.credentials === 'omit');
        this.video.crossOrigin = source.credentials === 'include' ? 'use-credentials' : 'anonymous';
        await this.loadPlan({ options: { ...source, url: url.href }, audioTrack: this.initialAudioTrack }, async () => {
            if (source.format && source.format !== 'file') {
                const mime = source.format === 'hls' ? 'application/vnd.apple.mpegurl' : 'application/dash+xml';
                this.capability.apiHint = `canPlayType(${mime})=${this.video.canPlayType(mime) || 'unknown'}`;
            }
            this.remoteSource = { ...source, url: url.href };
            try {
                await this.load(url.href);
                if (source.format && source.format !== 'file' && !Number.isFinite(this.video.duration))
                    throw new PlayerError('SOURCE_PERMISSION', 'Native manifest has no finite VOD duration; live playback requires explicit Shaka live permission');
            }
            catch (error) {
                throw await this.classifyDirectFailure(error);
            }
        }, requiresRemux);
    }
    async classifyDirectFailure(error) {
        const source = this.remoteSource;
        if (this.stopped || this.remux || !source || !compatibilityFailure(error))
            return error;
        if (source.format && source.format !== 'file') {
            // Manifest endpoints need not implement random access or immutable file
            // identity. Check transport without parsing or scheduling the stream;
            // Shaka remains responsible for the next compatibility trial.
            const controller = new AbortController(), cancel = () => controller.abort();
            const timer = setTimeout(cancel, 10000);
            this.cancelers.add(cancel);
            let response;
            try {
                response = await fetch(source.url, { credentials: source.credentials ?? 'same-origin', redirect: 'error', signal: controller.signal });
                this.assertActive();
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}`);
                return error;
            }
            catch (transport) {
                return new Error(`Source transport: ${String(transport)}`);
            }
            finally {
                clearTimeout(timer);
                this.cancelers.delete(cancel);
                await response?.body?.cancel().catch(() => { });
            }
        }
        // MEDIA_ERR_SRC_NOT_SUPPORTED can mask HTTP failures. Only a still-valid
        // inspected representation permits compatibility fallback, including errors
        // reported after acceptance. All validation reads belong to this candidate.
        const { RangeReader } = await import(new URL('web/range-reader.js', this.assetBase).href);
        this.assertActive();
        const reader = new RangeReader({ ...source, credentials: source.credentials ?? 'same-origin', blockBytes: 1024, cacheBytes: 1024 });
        const cancel = () => reader.close();
        this.cancelers.add(cancel);
        try {
            await reader.open();
            this.assertActive();
            return error;
        }
        catch (transport) {
            return new Error(`Source transport: ${String(transport)}`);
        }
        finally {
            this.cancelers.delete(cancel);
            reader.close();
        }
    }
    async play() { this.assertActive(); await this.resumeGain(); this.assertActive(); if (this.remux)
        await this.remux.play();
    else
        await this.video.play(); this.refresh(); }
    async pause() { this.assertActive(); if (this.remux)
        this.remux.pause();
    else
        this.video.pause(); this.refresh(); }
    async seek(seconds) {
        this.assertActive();
        if (this.remux) {
            const paused = this.remux.playbackPaused ?? this.video.paused;
            if (this.remux.canSeekBuffered?.(seconds) && this.video.videoWidth && Math.abs(this.sourceTime() - seconds) > .001) {
                // Hold the presentation clock while verifying the target frame. Otherwise
                // a playing clock can advance beyond the exact target before rVFC runs.
                // Producer/session identity is retained; restore the captured intent below.
                this.remux.pause();
                await this.seekPresented(seconds, () => this.remux.seek(seconds));
            }
            else
                await this.remux.seek(seconds);
            this.assertActive();
            if (this.video.seeking)
                await this.wait('seeked', () => { });
            if (!paused)
                await this.remux.play();
            this.refresh();
            return;
        }
        if (Math.abs(this.video.currentTime - seconds) < .001 && !this.video.seeking)
            return;
        await this.wait('seeked', () => { this.video.currentTime = seconds; });
        this.refresh();
    }
    seekPresented(target, action) {
        return new Promise((resolve, reject) => {
            let frame = 0, accepted = false, completed = false, finished = false;
            const presentation = this.remux, generation = presentation?.generation, mediaTarget = target + (presentation?.timelineBias ?? 0), expected = presentation?.expectedVideoFrame?.(target);
            const correlated = !!presentation?.muxedFrames || expected !== undefined;
            let presented = false;
            const seeked = () => { if (this.stopped || this.remux !== presentation || presentation?.generation !== generation) {
                finish(new Error('Native seek presentation was retired'));
                return;
            } if (correlated && presented && !this.video.seeking && Math.abs(this.video.currentTime - mediaTarget) < .001) {
                accepted = true;
                if (completed)
                    finish();
            } };
            const finish = (error) => { if (finished)
                return; finished = true; clearTimeout(timer); this.video.cancelVideoFrameCallback(frame); this.video.removeEventListener('seeked', seeked); this.cancelers.delete(cancel); error ? reject(error) : resolve(); };
            const cancel = (error) => finish(error);
            const timer = setTimeout(() => finish(new Error('Native seek did not present the target')), 10000);
            const next = (_, metadata) => {
                if (this.stopped || this.remux !== presentation || presentation?.generation !== generation) {
                    finish(new Error('Native seek presentation was retired'));
                    return;
                }
                // A browser may report the frame's PTS or clip that timestamp to the seek
                // point (Firefox). Accept only the corresponding source-frame interval.
                // Legacy remux artifacts without packet metadata retain their prior guard.
                const matches = presentation?.matchesVideoFrame?.(target, metadata.mediaTime) ?? (expected !== undefined && metadata.mediaTime >= expected + (presentation?.timelineBias ?? 0) - .001 && metadata.mediaTime <= mediaTarget + .001);
                if (correlated && matches && Math.abs(this.video.currentTime - mediaTarget) < .001)
                    presented = true;
                if (!this.video.seeking && Math.abs(this.video.currentTime - mediaTarget) < .001 && (correlated ? presented : metadata.mediaTime <= mediaTarget + .001)) {
                    accepted = true;
                    if (completed)
                        finish();
                }
                else
                    frame = this.video.requestVideoFrameCallback(next);
            };
            // Register before currentTime changes: the compositor callback may precede
            // the queued DOM seeking/seeked events, especially for buffered media.
            this.cancelers.add(cancel);
            this.video.addEventListener('seeked', seeked);
            frame = this.video.requestVideoFrameCallback(next);
            Promise.resolve().then(action).then(() => { completed = true; if (accepted)
                finish(); }, error => finish(error));
        });
    }
    async rate(value) { this.assertActive(); this.video.defaultPlaybackRate = value; this.video.playbackRate = value; this.refresh(); }
    async volume(value) { this.assertActive(); this.video.volume = value / 100; this.refresh(); }
    async selectTrack(type, id) {
        this.assertActive();
        if (type === 'audio') {
            const audio = this.video.audioTracks;
            if (id === 'auto') {
                this.video.muted = false;
                return;
            }
            if (id === 'no') {
                this.video.muted = true;
                return;
            }
            if (this.remux && this.remuxSource) {
                const track = this.remux.tracks?.find(t => t.type === 'audio' && t.id === id);
                if (!track)
                    throw Error('Unknown remux audio track');
                if (!track.selected) {
                    const previous = this.remuxSource, position = this.sourceTime(), paused = this.video.paused;
                    this.opening = true;
                    try {
                        await this.startRemux({ ...previous, audioTrack: Number(id) - 1 }, position);
                    }
                    catch (error) {
                        try {
                            await this.startRemux(previous, position);
                        }
                        catch (recovery) {
                            this.emit('error', String(recovery));
                        }
                        throw error;
                    }
                    finally {
                        this.opening = false;
                        if (!paused)
                            await this.video.play();
                    }
                }
                this.video.muted = false;
                this.refresh();
                return;
            }
            if (!audio || !audio[Number(id) - 1])
                throw new Error('Native audio track selection is not supported for this source/browser');
            this.video.muted = false;
            Array.from(audio).forEach((t, i) => { t.enabled = i === Number(id) - 1; });
        }
        else {
            if (Number(id) >= 100001 && Number(id) < 200001) {
                const index = Number(id) - 100001;
                if (!this.assAssets[index])
                    throw Error('Unknown Native ASS track');
                await this.ass.load(this.assAssets[index]);
                this.assIndex = index;
            }
            if (!['auto', 'no'].includes(id) && !this.assAssets[Number(id) - 100001] && !Array.from(this.video.textTracks).some(t => this.textTrackId(t) === id))
                throw new Error('Unknown native subtitle track');
            this.selectedSub = id;
            this.applySubtitles();
        }
        this.refresh();
    }
    applySubtitles() {
        this.ass?.visible(this.assIndex >= 0 && this.subsVisible && this.selectedSub !== 'no' && (this.selectedSub === 'auto' || (Number(this.selectedSub) >= 100001 && Number(this.selectedSub) < 200001)));
        const preferred = this.video.querySelector('track[default]')?.track;
        const autoIndex = preferred ? Array.from(this.video.textTracks).indexOf(preferred) : Array.from(this.video.textTracks).findIndex(t => !this.captionAssets.has(t));
        Array.from(this.video.textTracks).forEach((t, i) => { t.mode = this.subsVisible && !(this.assIndex >= 0 && this.selectedSub === 'auto') && this.selectedSub !== 'no' && (this.selectedSub === 'auto' ? i === autoIndex : this.textTrackId(t) === this.selectedSub) ? 'showing' : 'disabled'; });
    }
    async subtitleVisible(visible) { this.assertActive(); this.subsVisible = visible; this.applySubtitles(); this.refresh(); }
    async addSubtitle(asset) {
        this.assertActive();
        const cues = plainVTT(asset);
        if (cues) {
            const url = URL.createObjectURL(new Blob([asset.bytes], { type: 'text/vtt' }));
            this.captionURLs.add(url);
            try {
                const track = await this.loadTextTrack({ src: url, label: asset.label, language: asset.language, default: false }, true);
                // Disabled tracks hide their cue list; inspect before restoring selection.
                track.track.mode = 'hidden';
                const loaded = Array.from(track.track.cues ?? []), bias = this.remux?.timelineBias ?? 0;
                if (loaded.length !== cues.length || loaded.some((c, i) => Math.abs(c.startTime - bias - cues[i].start) > 1e-6 || Math.abs(c.endTime - bias - cues[i].end) > 1e-6 || c.text !== cues[i].text)) {
                    track.remove();
                    throw new BrowserCaptionUnsupported('Browser WebVTT cue fidelity verification failed');
                }
                this.captionAssets.set(track.track, { asset, index: this.captionAssets.size + 1 });
                if (asset.select) {
                    for (const old of Array.from(this.video.querySelectorAll('track')))
                        old.default = false;
                    track.default = true;
                }
                this.applySubtitles();
                this.refresh();
                return;
            }
            catch (error) {
                URL.revokeObjectURL(url);
                this.captionURLs.delete(url);
                throw error;
            }
        }
        if (this.adapted && this.audioAdaptation === 'opus')
            throw Error('Native Opus plus ASS is not qualified');
        if (!this.nativeASS || !['ass', 'ssa'].includes(asset.format))
            throw Error('Native external ASS/SSA requires explicit experimental admission');
        if (this.assAssets.length >= 16 || asset.bytes.byteLength > 8 * 1024 * 1024 || this.assAssets.reduce((n, a) => n + a.bytes.byteLength, 0) + asset.bytes.byteLength > 16 * 1024 * 1024)
            throw Error('Subtitle budget exceeded');
        if (!this.ass) {
            const { NativeASS } = await import('./native-ass.js');
            this.assertActive();
            this.ass = new NativeASS(this.video, () => this.sourceTime(), this.assetBase, this.fonts, error => { if (!this.stopped)
                this.emit('error', String(error)); });
        }
        if (asset.select) {
            try {
                await this.ass.load(asset);
                this.assertActive();
            }
            catch (error) {
                this.ass.destroy();
                this.ass = undefined;
                throw error;
            }
            this.assIndex = this.assAssets.length;
        }
        this.assAssets.push(asset);
        this.applySubtitles();
        this.refresh();
    }
    async addTextTrack(source) { await this.loadTextTrack(source); }
    async loadTextTrack(source, ownedCaption = false) {
        this.assertActive();
        const url = new URL(source.src, location.href);
        if (!['http:', 'https:', 'blob:'].includes(url.protocol))
            throw new Error('Text tracks require HTTP, HTTPS or a blob URL');
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = source.label;
        track.srclang = source.language || '';
        track.default = !!source.default;
        track.src = url.href;
        await new Promise((resolve, reject) => {
            const finish = (error) => { clearTimeout(timer); track.removeEventListener('load', loaded); track.removeEventListener('error', failed); this.cancelers.delete(cancel); if (error) {
                track.remove();
                reject(error);
            }
            else
                resolve(); };
            const loaded = () => { this.shiftTextTrack(track); finish(); };
            const failed = () => finish(ownedCaption ? new BrowserCaptionUnsupported('Browser cannot load the owned WebVTT caption') : new Error('Native text track failed to load'));
            const cancel = (error) => finish(error);
            const timer = setTimeout(() => finish(new Error('Native text track load timed out')), 15000);
            this.cancelers.add(cancel);
            track.addEventListener('load', loaded);
            track.addEventListener('error', failed);
            this.video.append(track);
            track.addEventListener('load', () => this.shiftTextTrack(track));
            track.track.mode = 'hidden';
        });
        this.applySubtitles();
        this.refresh();
        return track;
    }
    shiftTextTrack(track) {
        if (!this.remux)
            return;
        for (const cue of Array.from(track.track.cues ?? []))
            if (!this.shiftedCues.has(cue)) {
                cue.startTime += this.remux.timelineBias;
                cue.endTime += this.remux.timelineBias;
                this.shiftedCues.add(cue);
            }
    }
    resize(width, height) { this.assertActive(); this.video.width = width; this.video.height = height; }
    audioDiagnostics() { return { state: this.stopped ? 'closed' : this.video.paused ? 'paused' : 'running', source: 'native', decodedSampleCountersAvailable: false }; }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.destruction = this.dispose();
        return this.destruction;
    }
    async dispose() {
        this.stopped = true;
        this.ass?.destroy();
        this.ass = undefined;
        this.assAssets = [];
        for (const cancel of this.cancelers)
            cancel(new Error('Player is destroyed'));
        await this.remux?.destroy();
        this.gainSource?.disconnect();
        this.gainNode?.disconnect();
        if (this.gainContext)
            await this.gainContext.close();
        this.listeners.forEach(remove => remove());
        this.listeners = [];
        for (const url of this.captionURLs)
            URL.revokeObjectURL(url);
        this.captionURLs.clear();
        this.captionAssets.clear();
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.replaceChildren();
        this.video.load();
        if (this.objectURL)
            URL.revokeObjectURL(this.objectURL);
        this.objectURL = undefined;
    }
}
