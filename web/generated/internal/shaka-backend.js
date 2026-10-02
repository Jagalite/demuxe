// SPDX-License-Identifier: Apache-2.0
import { bufferingPolicy, resolveBuffering, shakaBufferingOptions } from './buffering.js';
import { NativePlayer } from './native-player.js';
import { ShakaNetworkPolicy } from './shaka-network.js';
import { PlayerError, isPlayerError } from './errors.js';
import { rasterizePreview } from '../preview/images.js';
import { runtimeAt } from './shaka-runtime.js';
import { initialShakaBackend, transitionShakaBackend, shakaLeaseCurrent, shakaQualityCandidates, shakaQualityPlan, shakaAttachmentSelect } from './machine/shaka-backend.js';
import { shakaAudioCatalog, shakaRequestedAudio, shakaSelectAudio, shakaInitialRepresentation, shakaSelectText, shakaExpectedOutput } from './machine/shaka-selection.js';
import { plainVTT } from './plain-vtt.js';
/** Shaka exclusively owns adaptive manifests, scheduling, ABR and MediaSource.
 * NativePlayer supplies only media-element controls, output verification and gain. */
export class ShakaBackend extends EventTarget {
    video;
    assetBase;
    setWatchdogs(policy) { this.native.setWatchdogs(policy); }
    nativeProgressSample() { return this.native.nativeProgressSample(); }
    ready = Promise.resolve();
    properties = new Map();
    native;
    player;
    policy;
    runtime;
    control;
    get stopped() { return this.control.phase === 'closed'; }
    get opening() { return this.control.phase === 'opening'; }
    get buffering() { return this.control.buffering; }
    get bufferingDefaults() { return this.control.bufferingDefaults; }
    get qualityPolicy() { return this.control.quality; }
    get runtimeQuality() { return this.control.runtimeQuality; }
    get observedQuality() { return this.control.observedQuality; }
    get visible() { return this.control.visible; }
    get selectedSub() { return this.control.selectedSub; }
    get audioDisabled() { return this.control.audioDisabled; }
    move(command) { const decision = transitionShakaBackend(this.control, command); this.control = decision.state; return decision; }
    check(lease) { if (!shakaLeaseCurrent(this.control, lease))
        throw new PlayerError('ABORTED', 'Shaka operation retired'); }
    begin(domain) { this.active(); return this.move({ type: 'begin', domain }).lease; }
    controlWaiters = new Map();
    enter(lease) {
        return new Promise((resolve, reject) => { this.controlWaiters.set(lease.id, { lease, resolve, reject }); this.pumpControls(); });
    }
    pumpControls() {
        for (const [id, waiter] of this.controlWaiters) {
            if (!shakaLeaseCurrent(this.control, waiter.lease)) {
                this.controlWaiters.delete(id);
                waiter.reject(new PlayerError('ABORTED', 'Shaka operation retired'));
                continue;
            }
            if (!this.control.effect && this.move({ type: 'enter', lease: waiter.lease }).accepted) {
                this.controlWaiters.delete(id);
                waiter.resolve();
            }
        }
    }
    finishControl(lease) { this.move({ type: 'finish', lease }); this.move({ type: 'leave', lease }); this.pumpControls(); }
    listen(player, name, listener, lease) {
        this.check(lease);
        player.addEventListener(name, listener);
        if (!shakaLeaseCurrent(this.control, lease)) {
            try {
                player.removeEventListener(name, listener);
            }
            finally {
                this.check(lease);
            }
        }
        this.listeners.push(() => player.removeEventListener(name, listener));
    }
    runtimeLoad = new AbortController();
    failure;
    disposal;
    listeners = [];
    blobs = new Set();
    constructor(video, assetBase = new URL('../../../', import.meta.url), buffering = bufferingPolicy()) {
        super();
        this.video = video;
        this.assetBase = assetBase;
        this.control = initialShakaBackend(buffering);
        this.native = new NativePlayer(video, 'never', assetBase);
        for (const type of ['mpv', 'activity', 'error', 'log']) {
            const listener = (event) => {
                if (this.stopped)
                    return;
                this.refresh();
                if (this.stopped)
                    return;
                const detail = event.detail;
                if (type === 'mpv' && detail.event === 'property-change' && ['track-list', 'native-live', 'native-seekable', 'duration'].includes(detail.name))
                    detail.data = this.properties.get(detail.name);
                if (type === 'error' && this.opening)
                    return;
                this.emit(type, detail);
            };
            this.native.addEventListener(type, listener);
            this.listeners.push(() => this.native.removeEventListener(type, listener));
        }
        this.refresh();
    }
    /** Shaka owns image-track indexing. Return its authored reference without
     * downloading a sprite through playback's network/error/ABR machinery. */
    async previewFrame(request) {
        const player = this.player;
        if (!player || this.stopped)
            return null;
        request.signal.throwIfAborted();
        const indexStart = performance.now();
        // In pinned Shaka, clear DASH JPEG SegmentList/Template indexes are metadata
        // only: SegmentBase/index templates reject non-MP4/WebM at manifest admission.
        // HLS lazy playlists and other formats must already be indexed.
        const streams = player.getManifest()?.imageStreams ?? [];
        const eligible = streams.filter(stream => !stream.encrypted && (stream.segmentIndex ||
            (this.control.source?.format === 'dash' && !player.isDynamic() && stream.mimeType === 'image/jpeg')));
        const ids = new Set(eligible.map(stream => stream.id));
        const tracks = player.getImageTracks().filter(track => ids.has(track.id));
        if (!tracks.length)
            return null;
        const track = [...tracks].sort((a, b) => Math.abs((a.width ?? request.width) - request.width) - Math.abs((b.width ?? request.width) - request.width))[0];
        const stream = eligible.find(stream => stream.id === track.id);
        if (!stream.segmentIndex)
            await stream.createSegmentIndex();
        request.signal.throwIfAborted();
        const thumbnail = await player.getThumbnails(track.id, request.time);
        request.signal.throwIfAborted();
        if (!thumbnail || this.stopped || player !== this.player)
            return null;
        const indexLookupMs = performance.now() - indexStart;
        if (!this.runtime || !this.control.source || !this.policy)
            return null;
        const runtime = this.runtime, policy = this.policy.forkForPreview();
        const type = runtime.net.NetworkingEngine.RequestType.SEGMENT;
        const acquisitionStart = performance.now();
        try {
            for (const uri of thumbnail.uris) {
                request.signal.throwIfAborted();
                const networkRequest = runtime.net.NetworkingEngine.makeRequest([uri], { ...runtime.net.NetworkingEngine.defaultRetryParameters(), timeout: 5000, maxAttempts: 1 });
                if (thumbnail.startByte || thumbnail.endByte !== null)
                    networkRequest.headers.Range = `bytes=${thumbnail.startByte}-${thumbnail.endByte ?? ''}`;
                policy.filter(type, networkRequest);
                const operation = policy.plugin(uri, networkRequest, type, () => { }, () => { }, {});
                const cancel = () => { void operation.abort(); };
                request.signal.addEventListener('abort', cancel, { once: true });
                try {
                    const response = await operation.promise;
                    request.signal.throwIfAborted();
                    const bytes = new Uint8Array(response.data), byteAcquisitionMs = performance.now() - acquisitionStart, conversionStart = performance.now();
                    const image = await rasterizePreview(new Blob([bytes], { type: thumbnail.mimeType ?? 'image/jpeg' }), request, { x: thumbnail.positionX, y: thumbnail.positionY, width: thumbnail.width, height: thumbnail.height });
                    return { time: thumbnail.startTime, actualTime: thumbnail.startTime, width: image.width, height: image.height, path: 'shaka-image-track', timestampKind: 'interval', temporalAccuracy: 'approximate', fidelity: 'full', image: { blob: image.blob }, metrics: { indexLookupMs, byteAcquisitionMs, resizeConversionMs: performance.now() - conversionStart, bytesFetched: bytes.length, bytesRead: bytes.length } };
                }
                catch (error) {
                    request.signal.throwIfAborted();
                    if (uri === thumbnail.uris.at(-1))
                        throw error;
                }
                finally {
                    request.signal.removeEventListener('abort', cancel);
                }
            }
            return null;
        }
        finally {
            policy.destroy();
        }
    }
    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
    active() { if (this.stopped)
        throw new PlayerError('ABORTED', 'Player is destroyed'); }
    loaded() { this.active(); if (!this.player)
        throw new PlayerError('INVALID_ARGUMENT', 'No streaming source'); return this.player; }
    mapped(error) {
        if (this.policy?.terminalError)
            return this.policy.terminalError;
        if (isPlayerError(error))
            return error;
        const e = error;
        if (this.stopped)
            return new PlayerError('ABORTED', 'Player is destroyed');
        if (e.category === 1)
            return new Error(`Source transport: Shaka network failure (${e.code})`);
        if (e.category === 6)
            return new PlayerError('UNSUPPORTED_FEATURE', `Shaka DRM is not configured (${e.code})`);
        if ([2, 3, 4, 5].includes(e.category ?? 0))
            return new PlayerError('UNSUPPORTED_MEDIA', `Shaka cannot execute this stream (${e.code})`);
        return error instanceof Error ? error : new Error(`Shaka operation failed (${e.code ?? 'unknown'})`);
    }
    async open(_file) { throw new PlayerError('UNSUPPORTED_FEATURE', 'Shaka requires a remote HLS or DASH source'); }
    async openRemote(source) {
        this.active();
        if (this.player || this.opening)
            throw new PlayerError('INVALID_ARGUMENT', 'Shaka backend opens only one source');
        if (!['hls', 'dash'].includes(source.format ?? ''))
            throw new PlayerError('INVALID_ARGUMENT', 'Shaka requires HLS or DASH format');
        if (source.streaming?.maxBandwidth !== undefined && (!Number.isFinite(source.streaming.maxBandwidth) || source.streaming.maxBandwidth <= 0))
            throw new PlayerError('INVALID_ARGUMENT', 'maxBandwidth must be positive');
        const lease = this.move({ type: 'open', source: { format: source.format, live: source.streaming?.live === true, maxBandwidth: source.streaming?.maxBandwidth, representation: source.streaming?.representation } }).lease;
        if (!lease)
            throw new PlayerError('INVALID_ARGUMENT', 'Shaka backend opens only one source');
        this.failure = undefined;
        try {
            if (!this.move({ type: 'enter', lease }).accepted)
                await this.enter(lease);
            this.check(lease);
            const runtime = this.runtime = await runtimeAt(this.assetBase, this.runtimeLoad.signal);
            this.check(lease);
            runtime.polyfill.installAll();
            this.check(lease);
            const supported = runtime.Player.isBrowserSupported();
            this.check(lease);
            if (!supported)
                throw new PlayerError('UNSUPPORTED_MEDIA', 'Shaka MSE is unsupported by this browser');
            const player = new runtime.Player();
            if (!shakaLeaseCurrent(this.control, lease)) {
                await player.destroy();
                this.check(lease);
            }
            this.player = player;
            this.move({ type: 'allocate', lease });
            const policy = new ShakaNetworkPolicy(source, runtime);
            if (!shakaLeaseCurrent(this.control, lease)) {
                policy.destroy();
                this.check(lease);
            }
            this.policy = policy;
            const network = player.getNetworkingEngine();
            this.check(lease);
            if (!network)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Shaka networking engine is unavailable');
            network.registerRequestFilter(this.policy.filter);
            this.check(lease);
            const epoch = lease.epoch;
            const changed = () => { if (!this.stopped && this.control.epoch === epoch) {
                this.refresh();
                if (this.stopped || this.control.epoch !== epoch)
                    return;
                this.emit('mpv', { event: 'property-change', name: 'track-list', data: this.properties.get('track-list') });
            } };
            for (const name of ['trackschanged', 'adaptation', 'variantchanged', 'textchanged', 'texttrackvisibility', 'streaming', 'loaded', 'buffering'])
                this.listen(player, name, changed, lease);
            const failed = (event) => { const detail = event.detail; if (detail.severity !== runtime.util.Error.Severity.CRITICAL)
                return; if (this.stopped || this.control.epoch !== epoch)
                return; const error = this.mapped(detail); this.move({ type: 'failure', epoch }); this.failure = error; if (!this.opening)
                this.emit('error', error); };
            this.listen(player, 'error', failed, lease);
            const observed = (event) => { const e = event; if (!this.stopped && this.control.epoch === epoch && e.mediaQuality && Number.isFinite(e.position)) {
                const q = e.mediaQuality, number = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;
                this.move({ type: 'observed', epoch, value: { observation: 'playhead-buffer', position: e.position, contentType: String(q.contentType ?? 'unknown'), width: number(q.width), height: number(q.height), bandwidth: number(q.bandwidth), codec: typeof q.codecs === 'string' ? q.codecs : null } });
                changed();
            } };
            this.listen(player, 'mediaqualitychanged', observed, lease);
            player.configure({ streaming: { observeQualityChanges: true, preferNativeHls: false, preferNativeDash: false, useNativeHlsForFairPlay: false }, abr: { enabled: !source.streaming?.representation }, restrictions: { maxBandwidth: source.streaming?.maxBandwidth ?? Infinity } });
            this.check(lease);
            const defaults = player.getConfiguration().streaming;
            this.check(lease);
            this.move({ type: 'defaults', lease, value: { bufferingGoal: defaults.bufferingGoal, bufferBehind: defaults.bufferBehind } });
            player.configure({ streaming: shakaBufferingOptions(this.buffering) });
            this.check(lease);
            await player.attach(this.video);
            this.check(lease);
            await player.load(source.url, undefined, source.format === 'hls' ? 'application/x-mpegurl' : 'application/dash+xml');
            this.check(lease);
            if (this.failure)
                throw this.failure;
            if (player.getLoadMode() !== runtime.Player.LoadMode.MEDIA_SOURCE)
                throw new PlayerError('UNSUPPORTED_MEDIA', 'Shaka did not create an MSE presentation');
            if (player.isDynamic() && source.streaming?.live !== true)
                throw new PlayerError('SOURCE_PERMISSION', 'Live streaming requires explicit live permission');
            const representation = source.streaming?.representation;
            if (representation) {
                const variants = player.getVariantTracks();
                this.check(lease);
                const facts = this.selectionVariants(variants);
                this.check(lease);
                const id = shakaInitialRepresentation(facts, representation);
                if (id === null)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Cannot preserve requested streaming representation and selected audio unambiguously');
                const track = variants[facts.findIndex(track => track.id === id)], select = player.selectVariantTrack;
                this.check(lease);
                select.call(player, track, true);
                this.check(lease);
                this.move({ type: 'quality', lease, value: { mode: 'manual', id: `variant:${id}` }, runtime: false });
            }
            this.check(lease);
            this.applyText();
            this.check(lease);
            this.refresh();
            this.check(lease);
            this.emit('mpv', { event: 'file-loaded' });
            this.check(lease);
            this.move({ type: 'opened', lease });
        }
        catch (error) {
            this.move({ type: 'failed', lease });
            throw this.mapped(error);
        }
        finally {
            this.finishControl(lease);
        }
    }
    refresh() {
        for (const [key, value] of this.native.properties)
            this.properties.set(key, value);
        const player = this.player;
        if (!player || this.stopped)
            return;
        this.properties.set('paused-for-cache', player.isBuffering?.() ?? false);
        const variants = player.getVariantTracks(), current = variants.find(t => t.active), texts = player.getTextTracks(), audio = this.audioTracks();
        const tracks = audio.map(({ track: t, id }) => ({ id, type: 'audio', codec: t.codecs, title: t.label, lang: t.language, selected: t.active && !this.audioDisabled }));
        tracks.push(...texts.map(t => ({ id: `shaka-sub-${t.id}`, type: 'sub', codec: t.codecs || t.mimeType, title: t.label, lang: t.language, selected: t.active && this.visible && this.selectedSub !== 'no', external: this.control.external.some(item => item.id === t.id), ...(this.control.external.some(item => item.id === t.id) ? { 'external-index': this.control.external.find(item => item.id === t.id).index, 'attachment-id': this.control.external.find(item => item.id === t.id).attachmentId } : {}) })));
        if (current?.videoCodec)
            tracks.push({ id: `shaka-video-${current.videoId}`, type: 'video', codec: current.videoCodec, selected: true, 'demux-w': current.width, 'demux-h': current.height });
        this.properties.set('track-list', tracks);
        this.properties.set('native-live', player.isDynamic());
        const range = player.seekRange();
        this.properties.set('native-seekable', range.end > range.start ? [{ start: range.start, end: range.end }] : []);
        if (player.isDynamic())
            this.properties.set('duration', null);
    }
    audioFacts(tracks) { return tracks.map(track => ({ language: track.language, originalLanguage: track.originalLanguage, label: track.label, roles: track.roles?.slice(), spatialAudio: track.spatialAudio, accessibilityPurpose: track.accessibilityPurpose, channelsCount: track.channelsCount, codecs: track.codecs, active: track.active })); }
    selectionVariants(tracks) { return tracks.map(track => ({ id: track.id, active: track.active, audioLanguage: track.audioLanguage, language: track.language, originalLanguage: track.originalLanguage, label: track.label, audioRoles: track.audioRoles?.slice(), spatialAudio: track.spatialAudio, accessibilityPurpose: track.accessibilityPurpose, channelsCount: track.channelsCount, audioCodec: track.audioCodec, videoCodec: track.videoCodec, originalVideoId: track.originalVideoId, originalAudioId: track.originalAudioId, bandwidth: track.bandwidth, height: track.height })); }
    audioTracks() { const tracks = this.player?.getAudioTracks() ?? []; return shakaAudioCatalog(this.audioFacts(tracks)).map(entry => ({ ...entry, track: tracks[entry.index] })); }
    expected() { return shakaExpectedOutput(this.selectionVariants(this.player?.getVariantTracks() ?? []), this.audioDisabled); }
    async verifyStartup(_expected, output = false) { this.active(); if (this.failure)
        throw this.failure; await this.native.verifyStartup(this.expected(), output); this.active(); if (this.failure)
        throw this.failure; }
    verifyOutput() { return this.verifyStartup(undefined, true); }
    startupEvidence() { return { ...this.native.diagnostics.capability, sourceBufferCreated: !!this.player && this.player.getLoadMode() === this.runtime?.Player.LoadMode.MEDIA_SOURCE }; }
    variantFacts(tracks) { return tracks.map(t => ({ id: t.id, active: t.active, audioIdentity: JSON.stringify([t.audioLanguage ?? t.language, t.originalLanguage, t.label, t.audioRoles, t.channelsCount, t.audioCodec, t.spatialAudio, t.accessibilityPurpose]), videoCodec: t.videoCodec ?? null, originalVideoId: t.originalVideoId ?? null, originalAudioId: t.originalAudioId ?? null, bandwidth: t.bandwidth, height: t.height ?? null })); }
    qualityTracks() { const tracks = this.loaded().getVariantTracks(), ids = shakaQualityCandidates(this.control, this.variantFacts(tracks)); return tracks.filter(track => ids.includes(track.id)); }
    streamingState() {
        const player = this.loaded(), list = this.qualityTracks(), active = list.find(t => t.active), live = player.isDynamic(), range = player.seekRange();
        const number = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
        const playheadDate = live ? player.getPlayheadTimeAsDate?.() : null;
        const latency = playheadDate ? number((Date.now() - playheadDate.getTime()) / 1000) : null;
        return { qualities: list.map(t => ({ id: `variant:${t.id}`, width: number(t.width), height: number(t.height), bandwidth: number(t.bandwidth), frameRate: number(t.frameRate), videoCodec: t.videoCodec ?? null, audioCodec: t.audioCodec ?? null, dynamicRange: t.hdr ?? null })), requested: { ...this.qualityPolicy }, selectedId: active ? `variant:${active.id}` : null, presentedId: null, observedQuality: this.observedQuality ? { ...this.observedQuality } : null, transition: 'unknown', live: { isLive: live, seekable: range.end > range.start ? range : null, latencySeconds: latency, nearLive: live && range.end > range.start ? Math.abs(this.video.currentTime - range.end) <= 2 : null } };
    }
    async setQuality(policy) {
        const lease = this.begin('quality');
        try {
            await this.enter(lease);
            this.check(lease);
            const player = this.loaded(), tracks = player.getVariantTracks(), plan = shakaQualityPlan(this.control, this.variantFacts(tracks), policy);
            this.check(lease);
            if (plan.failure === 'source-pin')
                throw new PlayerError('UNSUPPORTED_FEATURE', 'The source representation pin cannot be removed by quality selection');
            const allowed = tracks.filter(t => plan.ids.includes(t.id));
            if (!allowed.length)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'No quality satisfies the selected audio and source constraints');
            const old = player.getConfiguration();
            this.check(lease);
            try {
                const configured = player.configure({ abr: { enabled: plan.abr }, restrictions: { ...old.restrictions, maxHeight: plan.maxHeight, maxBandwidth: plan.maxBandwidth } });
                this.check(lease);
                if (!configured)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Shaka rejected the quality configuration');
                if (policy.mode === 'manual') {
                    player.selectVariantTrack(allowed[0], false);
                    this.check(lease);
                    if (player.getVariantTracks().find(t => t.active)?.id !== allowed[0].id)
                        throw new PlayerError('UNSUPPORTED_FEATURE', 'Shaka did not select the requested quality');
                }
                this.check(lease);
                this.move({ type: 'quality', lease, value: policy, runtime: true });
                this.refresh();
            }
            catch (error) {
                if (!this.stopped && this.control.effect?.id === lease.id)
                    player.configure({ abr: old.abr, restrictions: old.restrictions });
                throw error;
            }
        }
        finally {
            this.finishControl(lease);
        }
    }
    async seekToLive() { const player = this.loaded(); if (!player.isDynamic())
        throw new PlayerError('UNSUPPORTED_FEATURE', 'The source is not live'); player.goToLive(); await this.native.seek(this.video.currentTime); this.refresh(); }
    async setBuffering(policy) {
        const lease = this.begin('buffering');
        try {
            await this.enter(lease);
            this.check(lease);
            if (this.player?.configure({ streaming: { ...this.bufferingDefaults, ...shakaBufferingOptions(policy, this.video.paused) } }) === false)
                throw new PlayerError('INVALID_ARGUMENT', 'Shaka rejected buffering settings');
            this.check(lease);
            this.video.preload = policy.preload;
            this.check(lease);
            this.move({ type: 'buffering', lease, value: policy });
        }
        finally {
            this.finishControl(lease);
        }
    }
    get bufferingDiagnostics() { return { ...resolveBuffering(this.buffering, 'shaka'), settings: this.player ? { bufferingGoal: this.player.getConfiguration().streaming.bufferingGoal, rebufferingGoal: this.player.getConfiguration().streaming.rebufferingGoal, bufferBehind: this.player.getConfiguration().streaming.bufferBehind } : { ...this.bufferingDefaults, ...shakaBufferingOptions(this.buffering, this.video.paused) } }; }
    async play() { this.active(); if (this.buffering.preload !== 'auto')
        this.player?.configure({ streaming: { ...this.bufferingDefaults, ...shakaBufferingOptions(this.buffering, false) } }); await this.native.play(); }
    async pause() { this.active(); await this.native.pause(); }
    async seek(seconds) { const range = this.loaded().seekRange(); if (!Number.isFinite(seconds) || seconds < range.start - .01 || seconds > range.end + .01)
        throw new PlayerError('INVALID_ARGUMENT', 'Seek target is outside the streaming seekable window'); await this.native.seek(Math.max(range.start, Math.min(range.end, seconds))); }
    async rate(value) { this.active(); await this.native.rate(value); }
    setAudioOutputDevice(id) { return this.native.setAudioOutputDevice(id); }
    async volume(value) { this.active(); await this.native.volume(value); }
    async gain(value) { this.active(); await this.native.gain(value); }
    async selectTrack(type, id) {
        const lease = this.begin(type === 'audio' ? 'audio' : 'selection');
        try {
            await this.enter(lease);
            this.check(lease);
            const player = this.loaded();
            if (type === 'audio') {
                const audio = id === 'no' ? [] : player.getAudioTracks();
                this.check(lease);
                const facts = this.audioFacts(audio);
                this.check(lease);
                const requested = shakaRequestedAudio(facts, id), variants = requested.kind === 'selected' ? player.getVariantTracks() : [];
                this.check(lease);
                const variantsFacts = this.selectionVariants(variants);
                this.check(lease);
                const plan = shakaSelectAudio(this.control, facts, variantsFacts, id);
                if (plan.kind === 'failure')
                    throw new PlayerError('UNSUPPORTED_FEATURE', plan.reason === 'identity' ? 'Cannot preserve requested audio track' : plan.reason === 'pin' ? 'Cannot preserve pinned streaming representation and bandwidth with requested audio track' : 'Requested audio has no variant satisfying the quality constraints');
                if (plan.kind === 'empty') {
                    this.refresh();
                    return;
                }
                if (plan.kind === 'disabled') {
                    this.video.muted = true;
                    this.check(lease);
                    this.move({ type: 'selection', lease, audioDisabled: true });
                }
                else {
                    if (plan.kind === 'variant') {
                        const track = variants[variantsFacts.findIndex(track => track.id === plan.variant)], select = player.selectVariantTrack;
                        this.check(lease);
                        select.call(player, track, true);
                        this.check(lease);
                        if (plan.commitQuality)
                            this.move({ type: 'quality', lease, value: { mode: 'manual', id: `variant:${plan.variant}` }, runtime: false });
                        const selected = player.getVariantTracks().find(track => track.active)?.id;
                        this.check(lease);
                        if (selected !== plan.variant)
                            throw new PlayerError('UNSUPPORTED_FEATURE', 'Shaka did not apply the pinned audio/video variant');
                    }
                    else {
                        const select = player.selectAudioTrack;
                        this.check(lease);
                        select.call(player, audio[plan.index]);
                    }
                    this.check(lease);
                    this.video.muted = false;
                    this.check(lease);
                    this.move({ type: 'selection', lease, audioDisabled: false });
                }
            }
            else {
                if (id === 'no') {
                    this.check(lease);
                    this.move({ type: 'selection', lease, selectedSub: id });
                    this.applyText();
                }
                else {
                    const texts = player.getTextTracks();
                    this.check(lease);
                    const facts = texts.map(track => ({ id: track.id, active: track.active }));
                    this.check(lease);
                    const selected = shakaSelectText(facts, id), track = texts[facts.findIndex(track => track.id === selected)];
                    if (!track && id !== 'auto')
                        throw new PlayerError('UNSUPPORTED_FEATURE', 'Cannot preserve requested subtitle track');
                    if (track) {
                        const select = player.selectTextTrack;
                        this.check(lease);
                        select.call(player, track);
                    }
                    this.check(lease);
                    this.move({ type: 'selection', lease, selectedSub: id });
                    this.applyText();
                }
            }
            this.check(lease);
            this.refresh();
            this.check(lease);
            this.emit('mpv', { event: 'property-change', name: 'track-list', data: this.properties.get('track-list') });
        }
        finally {
            this.finishControl(lease);
        }
    }
    applyText() {
        const player = this.player;
        if (!player || this.stopped)
            return;
        const epoch = this.control.epoch, serial = this.control.selectionSerial, visible = this.visible, id = this.selectedSub;
        const current = () => !this.stopped && this.player === player && this.control.epoch === epoch && this.control.selectionSerial === serial && this.visible === visible && this.selectedSub === id;
        let selected = null;
        if (visible && id !== 'no') {
            const texts = player.getTextTracks();
            if (!current())
                return;
            const facts = texts.map(track => ({ id: track.id, active: track.active }));
            if (!current())
                return;
            const chosen = shakaSelectText(facts, id);
            if (chosen === null)
                return;
            selected = texts[facts.findIndex(track => track.id === chosen)];
        }
        const select = player.selectTextTrack;
        if (current())
            select.call(player, selected);
    }
    async subtitleVisible(visible) { const lease = this.begin('selection'); try {
        await this.enter(lease);
        this.check(lease);
        this.move({ type: 'selection', lease, visible });
        this.applyText();
        this.check(lease);
        this.refresh();
    }
    finally {
        this.finishControl(lease);
    } }
    async addTextTrack(track, attachmentId) { const lease = this.begin('attachment'); try {
        const player = this.loaded();
        this.policy.authorize(track.src);
        this.check(lease);
        const added = await player.addTextTrackAsync(track.src, track.language ?? 'und', 'subtitle', 'text/vtt', undefined, track.label);
        this.check(lease);
        if (track.default && shakaAttachmentSelect(this.control, lease)) {
            player.selectTextTrack(added);
            this.check(lease);
        }
        this.move({ type: 'attached', lease, id: added.id, attachmentId, select: !!track.default });
        this.applyText();
        this.refresh();
    }
    finally {
        this.finishControl(lease);
    } }
    async addSubtitle(asset) {
        this.active();
        if (!plainVTT(asset))
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Shaka external subtitles require plain WebVTT');
        const url = URL.createObjectURL(new Blob([asset.bytes], { type: 'text/vtt' }));
        if (this.stopped) {
            URL.revokeObjectURL(url);
            this.active();
        }
        this.blobs.add(url);
        this.policy?.ownBlob(url);
        await this.addTextTrack({ src: url, label: asset.label, language: asset.language, default: asset.select }, asset.attachmentId);
    }
    resize(width, height) { this.native.resize(width, height); }
    audioDiagnostics() { return { ...this.native.audioDiagnostics(), source: 'shaka-mse' }; }
    get diagnostics() { const native = this.native.diagnostics; return { ...native, buffering: { ...resolveBuffering(this.buffering, 'shaka'), settings: this.player?.getConfiguration?.().streaming ? { bufferingGoal: this.player.getConfiguration().streaming.bufferingGoal, rebufferingGoal: this.player.getConfiguration().streaming.rebufferingGoal, bufferBehind: this.player.getConfiguration().streaming.bufferBehind } : shakaBufferingOptions(this.buffering) }, path: 'shaka-mse', plan: 'shaka-mse', packaging: 'shaka', streaming: { engine: 'shaka', version: this.runtime?.Player.version, format: this.control.source?.format, live: this.player?.isDynamic() ?? false, seekRange: this.player?.seekRange(), abr: this.qualityPolicy.mode === 'auto', maxBandwidth: this.control.source?.maxBandwidth, variants: this.player?.getVariantTracks().map(t => ({ id: `variant:${t.id}`, representation: t.originalVideoId ?? t.originalAudioId, active: t.active, bandwidth: t.bandwidth, width: t.width, height: t.height, audioCodec: t.audioCodec, videoCodec: t.videoCodec })), network: this.policy?.diagnostics }, capability: this.startupEvidence() }; }
    destroy() {
        if (this.disposal)
            return this.disposal;
        this.move({ type: 'close' });
        this.pumpControls();
        let resolve, reject;
        const disposal = this.disposal = new Promise((yes, no) => { resolve = yes; reject = no; });
        void this.dispose().then(resolve, reject);
        return disposal;
    }
    async dispose() {
        const player = this.player;
        this.player = undefined;
        this.failure = undefined;
        let failed = false, failure;
        const attempt = (fn) => { try {
            return fn();
        }
        catch (error) {
            if (!failed) {
                failed = true;
                failure = error;
            }
        } };
        attempt(() => this.runtimeLoad.abort());
        for (const remove of this.listeners.splice(0))
            attempt(remove);
        attempt(() => this.policy?.destroy());
        for (const release of [() => player?.destroy(), () => this.native.destroy()])
            try {
                await release();
            }
            catch (error) {
                if (!failed) {
                    failed = true;
                    failure = error;
                }
            }
        for (const url of this.blobs)
            attempt(() => URL.revokeObjectURL(url));
        this.blobs.clear();
        if (failed)
            throw failure;
    }
}
