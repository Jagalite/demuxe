// SPDX-License-Identifier: Apache-2.0
import { bufferingPolicy, resolveBuffering, mpvBufferingOptions } from './buffering.js';
import { PlayerError } from './errors.js';
import { resolveDecodePolicy } from './decode-policy.js';
import { webgpuDecoderSupported } from './webgpu-codecs.js';
import { selectExternalDecoderBackend } from './external-decoder-selection.js';
/** One isolated software engine per player; bounded remote ranges and local File reads; ArrayBuffer inputs remain capped. */
export class WasmPlayer extends EventTarget {
    loading = new AbortController();
    worker;
    workerOwner;
    audioContext;
    audioNode;
    analyser;
    gainNode;
    gainValue = 1;
    timing;
    lastTiming;
    nextId = 100;
    pending = new Map();
    destroyed = false;
    destruction;
    onDestroyed;
    readyTimer;
    rejectReady;
    eventWaiters = new Set();
    hasFile = false;
    seekObservation;
    opening = false;
    refreshAuthorization;
    audioHeader;
    outputChannels;
    requestedOutput;
    deviceChannels;
    diagnostics;
    buffering;
    bufferingSettings = {};
    browserCodecsAbsent = false;
    properties = new Map();
    ready;
    constructor(canvas, { prepared, buffering = bufferingPolicy(), disableBrowserCodecs = false, measureOutput = false, mode = 'software', softwarePresenter = 'auto', audioOutput = 'stereo', audioFallback = 'stereo', resourceLimits = {}, fonts = [], assetBase = new URL('../../../', import.meta.url), decodeQuality = 'exact', adaptiveFrameDrop = false, videoTrack } = {}) {
        super();
        this.buffering = buffering;
        if (!crossOriginIsolated)
            throw new Error('This player requires a secure, cross-origin isolated page.');
        this.audioContext = new AudioContext({ latencyHint: 'interactive' });
        this.requestedOutput = audioOutput;
        this.deviceChannels = this.audioContext.destination.maxChannelCount;
        const wanted = audioOutput === 'auto' ? (this.deviceChannels >= 8 ? 8 : this.deviceChannels >= 6 ? 6 : 2) : audioOutput === '7.1' ? 8 : audioOutput === '5.1' ? 6 : 2;
        if (wanted > this.deviceChannels && audioFallback === 'reject') {
            void this.audioContext.close();
            throw Error('Requested audio layout is unavailable on this output device');
        }
        this.outputChannels = wanted <= this.deviceChannels ? wanted : 2;
        try {
            this.audioContext.destination.channelCount = this.outputChannels;
        }
        catch (error) {
            void this.audioContext.close();
            throw error;
        }
        this.audioContext.destination.channelCountMode = 'explicit';
        // A disposable same-origin owner gives the browser a complete worker-tree
        // teardown boundary, including native pthread workers and decoder resources.
        this.workerOwner = canvas.ownerDocument.createElement('iframe');
        this.workerOwner.hidden = true;
        this.workerOwner.setAttribute('aria-hidden', 'true');
        canvas.ownerDocument.body.append(this.workerOwner);
        const owner = this.workerOwner.contentWindow;
        try {
            this.worker = new owner.Worker(new URL(mode === 'hybrid' ? 'web/filter-retained-engine-worker.js?mode=retained' : 'web/software-full-engine-worker.js', assetBase), { type: 'module' });
        }
        catch (error) {
            this.workerOwner.remove();
            void this.audioContext.close();
            throw error;
        }
        const audio = new SharedArrayBuffer(64 + 8192 * this.outputChannels * 4);
        this.audioHeader = new Int32Array(audio, 0, 16);
        this.ready = new Promise((resolve, reject) => {
            this.rejectReady = reject;
            const timeout = this.readyTimer = setTimeout(() => reject(new Error('Player initialization timed out')), 60000);
            this.worker.onerror = event => { clearTimeout(timeout); reject(new PlayerError('ASSET_LOAD_FAILED', 'Playback engine initialization failed: ' + event.message, null, null, 'operation', true)); this.fail(new Error(event.message)); };
            this.worker.onmessage = ({ data }) => {
                if (data.type === 'ready') {
                    clearTimeout(timeout);
                    this.browserCodecsAbsent = data.browserCodecsAbsent;
                    this.sendTiming(true);
                    resolve();
                }
                else if (data.type === 'error') {
                    clearTimeout(timeout);
                    const error = data.assetFailure ? new PlayerError('ASSET_LOAD_FAILED', data.message) : data.decoderFailure ? new PlayerError('DECODE_FAILED', data.message) : new Error(data.message);
                    reject(error instanceof PlayerError ? error : new PlayerError('ASSET_LOAD_FAILED', 'Playback engine initialization failed: ' + error.message, null, null, 'operation', true));
                    this.fail(error, data.id);
                }
                else if (data.type === 'destroyed') {
                    if (this.diagnostics) {
                        this.diagnostics.decoderStats = data.decoderStats;
                        if (data.presentation)
                            this.diagnostics.presentation = data.presentation;
                    }
                    this.onDestroyed?.();
                }
                else if (data.type === 'refresh') {
                    void this.refreshAuthorization?.(data.resource).then(update => { if (!this.destroyed)
                        this.worker.postMessage({ type: 'refreshed', id: data.id, update }); }, () => { if (!this.destroyed)
                        this.worker.postMessage({ type: 'refreshed', id: data.id, error: true }); });
                }
                else if (data.type === 'output')
                    this.dispatchEvent(new CustomEvent('output', { detail: data.data }));
                else if (data.type === 'source')
                    this.dispatchEvent(new CustomEvent('source', { detail: data.info }));
                else if (data.type === 'diagnostics')
                    this.diagnostics = { ...data.data, buffering: { ...resolveBuffering(this.buffering, 'mpv'), settings: { ...this.bufferingSettings, 'demuxer-cache-state': this.properties.get('demuxer-cache-state'), 'paused-for-cache': this.properties.get('paused-for-cache'), 'cache-buffering-state': this.properties.get('cache-buffering-state') } } };
                else if (data.type === 'log')
                    this.dispatchEvent(new CustomEvent('log', { detail: data.message }));
                else if (data.type === 'event') {
                    const event = data.event;
                    if (event.event === 'start-file') {
                        this.hasFile = true;
                        this.seekObservation = undefined;
                    }
                    this.observeSeekEvent(event);
                    if (event.event === 'end-file')
                        this.hasFile = false;
                    if (event.event === 'property-change' && event.name === 'track-list' && Array.isArray(event.data))
                        event.data = event.data.map(track => ({ ...track, id: String(track.id) }));
                    if (event.event === 'command-reply' && event.id) {
                        const pending = this.pending.get(event.id);
                        if (pending) {
                            clearTimeout(pending.timer);
                            this.pending.delete(event.id);
                            event.error ? pending.reject(new Error(event.error)) : pending.resolve(event.result);
                        }
                    }
                    if (event.event === 'property-change' && event.name === 'track-list' && Array.isArray(event.data)) {
                        let external = 0;
                        event.data = event.data.map(t => t.external ? { ...t, 'external-index': ++external } : t);
                    }
                    if (event.event === 'property-change' && event.name)
                        this.properties.set(event.name, event.data);
                    this.dispatchEvent(new CustomEvent('mpv', { detail: event }));
                }
            };
            void (async () => {
                const [font] = await Promise.all([
                    prepared?.font ? Promise.resolve(prepared.font) : (async () => { const response = await fetch(new URL('fixtures/DejaVuSans.ttf', assetBase), { signal: this.loading.signal }); if (!response.ok)
                        throw Error('Could not load the bundled subtitle font'); return response.arrayBuffer(); })(),
                    this.audioContext.audioWorklet.addModule(new URL('web/audio-worklet.js', assetBase)),
                ]);
                if (this.destroyed)
                    throw new Error('Player destroyed during initialization');
                this.audioNode = new AudioWorkletNode(this.audioContext, 'demuxe-pcm', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [this.outputChannels], channelCount: this.outputChannels, channelCountMode: 'explicit', processorOptions: { buffer: audio, capacity: 8192, channels: this.outputChannels, measureOutput } });
                this.audioNode.port.onmessage = ({ data }) => { const stamp = this.audioContext.getOutputTimestamp(); const wallTime = stamp.performanceTime !== undefined && stamp.contextTime !== undefined ? performance.timeOrigin + stamp.performanceTime + (data.audioFrame / data.sampleRate - stamp.contextTime) * 1000 : null; this.dispatchEvent(new CustomEvent('output', { detail: { ...data, wallTime, stamp } })); };
                this.analyser = this.audioContext.createAnalyser();
                this.audioNode.connect(this.analyser);
                this.audioNode.connect(this.audioContext.destination);
                if (this.destroyed)
                    throw new Error('Player destroyed during initialization');
                const offscreen = canvas.transferControlToOffscreen();
                const decodePolicy = resolveDecodePolicy({ codec: videoTrack?.codec, codedWidth: videoTrack?.width, codedHeight: videoTrack?.height, displayWidth: canvas.width, displayHeight: canvas.height, decodeQuality, maxDecodePixels: resourceLimits.maxDecodePixels ?? 8294400 });
                let decoder = mode === 'hybrid' ? 'webcodecs' : 'software';
                if (mode === 'hybrid' && videoTrack?.codec) {
                    // The production registry is empty. Once a codec is qualified, probe
                    // WebCodecs first and use the device-local backend only on rejection.
                    if (webgpuDecoderSupported(videoTrack.codec)) {
                        // Only the complete preflight configuration may reject WebCodecs.
                        // Missing evidence keeps the existing Hybrid/WebCodecs trial.
                        const supported = disableBrowserCodecs ? false : videoTrack.webCodecsSupported;
                        decoder = selectExternalDecoderBackend(videoTrack.codec, supported) ?? 'webcodecs';
                    }
                }
                this.worker.postMessage({ type: 'init', compiledWasm: prepared?.module, canvas: offscreen, audio, font, fonts, audioChannels: this.outputChannels, maxDecodePixels: resourceLimits.maxDecodePixels, maxAllocationBytes: resourceLimits.maxAllocationBytes, sampleRate: this.audioContext.sampleRate, disableBrowserCodecs, measureOutput, decoder, softwarePresenter, decoderFaultAfter: 0, decodeQuality, decodePolicy, adaptiveFrameDrop, videoTrack, displayWidth: canvas.width, displayHeight: canvas.height }, [offscreen, font]);
                this.timing = setInterval(() => this.sendTiming(), 20);
                this.sendTiming();
            })().catch(error => { clearTimeout(timeout); reject(new PlayerError('ASSET_LOAD_FAILED', 'Playback engine initialization failed: ' + String(error), null, null, 'operation', true)); });
        });
    }
    sendTiming(force = false) {
        if (this.destroyed)
            return;
        // Fallback latency estimate, explicitly not an independent A/V sync measurement.
        const latency = (this.audioContext.baseLatency || 0) + (this.audioContext.outputLatency || 0);
        const latencyUs = Math.round(latency * 1e6), running = this.audioContext.state === 'running';
        if (!force && this.lastTiming?.latencyUs === latencyUs && this.lastTiming.running === running)
            return;
        this.lastTiming = { latencyUs, running };
        this.worker.postMessage({ type: 'timing', latencyUs, running });
    }
    fail(error, id, report = true) {
        for (const [key, p] of this.pending)
            if (!id || key === id) {
                clearTimeout(p.timer);
                p.reject(error);
                this.pending.delete(key);
            }
        if (report)
            for (const cancel of this.eventWaiters)
                cancel(error);
        // Preserve typed terminal failures through the session listener. Turning an
        // asset error into a string would make it look like decoder compatibility.
        if (report)
            this.dispatchEvent(new CustomEvent('error', { detail: error instanceof PlayerError ? error : error.message }));
    }
    request(message, transfer = []) {
        if (this.destroyed)
            return Promise.reject(new Error('Player is destroyed'));
        if (this.pending.size >= 128)
            return Promise.reject(new Error('Command queue is full'));
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Command timed out')); }, 15000);
            this.pending.set(id, { resolve, reject, timer });
            this.worker.postMessage({ ...message, id }, transfer);
        });
    }
    async open(file, options = {}) {
        if (this.destroyed)
            throw new Error('Player is destroyed');
        if (this.opening)
            throw new Error('Another open is in progress');
        this.opening = true;
        try {
            await this.openLocal(file, options);
        }
        finally {
            this.opening = false;
        }
    }
    async openRemote(source) {
        if (this.destroyed)
            throw new Error('Player is destroyed');
        if (this.opening)
            throw new Error('Another open is in progress');
        this.opening = true;
        try {
            await this.ready;
            if (this.hasFile)
                await Promise.all([this.waitForEvent(e => e.event === 'end-file'), this.command('stop')]);
            else
                await this.command('stop');
            await this.configureBuffering(true);
            if (source.demuxer && !/^[a-z0-9_]{1,64}$/.test(source.demuxer))
                throw Error('Invalid demuxer hint');
            await this.command('set', 'demuxer-lavf-format', source.demuxer ?? '');
            const { refreshAuthorization, ...options } = source;
            this.refreshAuthorization = refreshAuthorization;
            const loaded = this.waitForEvent(e => e.event === 'file-loaded' || (e.event === 'end-file' && e.reason === 'error' ? new Error(String(e.file_error)) : false));
            await Promise.all([loaded, this.request({ type: 'open-remote', options, canRefresh: !!refreshAuthorization })]);
        }
        finally {
            this.opening = false;
        }
    }
    waitForEvent(predicate) {
        return new Promise((resolve, reject) => {
            const finish = (error) => { clearTimeout(timeout); this.removeEventListener('mpv', listener); this.eventWaiters.delete(cancel); error ? reject(error) : resolve(); };
            const cancel = (error) => finish(error);
            const listener = (event) => { const result = predicate(event.detail); if (result)
                finish(result instanceof Error ? result : undefined); };
            const timeout = setTimeout(() => finish(new Error('Media operation timed out')), 25000);
            this.eventWaiters.add(cancel);
            this.addEventListener('mpv', listener);
        });
    }
    async openLocal(file, options) {
        await this.ready;
        const size = file instanceof File ? file.size : file.byteLength;
        if (!(file instanceof File) && size > 32 * 1024 * 1024)
            throw new Error('ArrayBuffer sources are limited to 32 MiB');
        if (this.hasFile)
            await Promise.all([this.waitForEvent(event => event.event === 'end-file'), this.command('stop')]);
        else
            await this.command('stop');
        await this.configureBuffering(true);
        const suffix = file instanceof File ? file.name.split('.').at(-1)?.toLowerCase() : undefined;
        const demuxer = options.demuxer ?? (suffix === 'sbc' || suffix === 'msbc' ? 'sbc' : '');
        if (demuxer && !/^[a-z0-9_]{1,64}$/.test(demuxer))
            throw Error('Invalid demuxer hint');
        await this.command('set', 'demuxer-lavf-format', demuxer);
        const loaded = this.waitForEvent(event => event.event === 'file-loaded' || (event.event === 'end-file' && event.reason === 'error' ? new Error(String(event.file_error)) : false));
        if (file instanceof File)
            await Promise.all([loaded, this.request({ type: 'open-file', file })]);
        else {
            const bytes = file.slice(0);
            await Promise.all([loaded, this.request({ type: 'open', bytes }, [bytes])]);
        }
    }
    waitForPreviewPresentation() { return this.waitForEvent(event => event.event === 'playback-restart' || (event.event === 'end-file' ? new Error('No preview video frame') : false)); }
    /** Snapshot only this private software surface after a completed presentation. */
    async previewSnapshot() {
        await this.ready;
        return this.request({ type: 'preview-snapshot' });
    }
    async inspectMetadata() {
        const value = await this.request({ type: 'command', args: ['expand-text', '${seekable}'] });
        if (value === 'yes' || value === 'no')
            this.properties.set('seekable', value === 'yes');
        if (!Array.isArray(this.properties.get('track-list')) || !this.properties.get('track-list').length)
            await this.waitForEvent(event => event.event === 'property-change' && event.name === 'track-list' && Array.isArray(event.data) && event.data.length > 0);
    }
    async command(...args) { await this.ready; return this.request({ type: 'command', args }); }
    async setPause(paused) {
        if (this.properties.get('pause') === paused) {
            await this.command('set', 'pause', paused ? 'yes' : 'no');
            return;
        }
        await Promise.all([this.waitForEvent(e => e.event === 'property-change' && e.name === 'pause' && e.data === paused), this.command('set', 'pause', paused ? 'yes' : 'no')]);
    }
    async configureBuffering(preparing) {
        for (const [key, value] of Object.entries(mpvBufferingOptions(this.buffering, preparing))) {
            await this.command('set', key, value);
            this.bufferingSettings[key] = value;
        }
    }
    async play() {
        const resume = this.audioContext.resume();
        void resume.catch(() => { });
        if (this.audioContext.state === 'suspended' && !navigator.userActivation?.isActive)
            throw new DOMException('Playback needs a user gesture', 'NotAllowedError');
        await resume;
        this.sendTiming();
        if (this.buffering.preload !== 'auto')
            await this.configureBuffering(false);
        await this.setPause(false);
    }
    pause() { return this.setPause(true); }
    seek(seconds) { if (!Number.isFinite(seconds) || seconds < 0)
        throw new Error('Invalid seek time'); this.seekObservation = { target: seconds, restarted: false, eof: false }; Atomics.store(this.audioHeader, 2, 0); return this.ready.then(() => this.request({ type: 'seek', seconds })); }
    rate(rate) { if (!Number.isFinite(rate) || rate < 0.5 || rate > 2)
        throw new Error('Playback rate must be 0.5 to 2'); return this.command('set', 'speed', String(rate)); }
    volume(percent) { if (!Number.isFinite(percent) || percent < 0 || percent > 100)
        throw new Error('Invalid volume'); return this.command('set', 'volume', String(percent)); }
    async gain(value) {
        if (!Number.isFinite(value) || value < 0 || value > 1)
            throw new Error('Gain must be between 0 and 1');
        await this.ready;
        if (this.destroyed)
            throw new Error('Player is destroyed');
        if (!this.gainNode && value !== 1) {
            const gain = this.audioContext.createGain();
            gain.channelCount = this.outputChannels;
            gain.channelCountMode = 'explicit';
            gain.channelInterpretation = 'discrete';
            gain.gain.setValueAtTime(value, this.audioContext.currentTime);
            this.audioNode.disconnect();
            this.audioNode.connect(gain);
            gain.connect(this.audioContext.destination);
            gain.connect(this.analyser);
            this.gainNode = gain;
        }
        this.gainNode?.gain.setValueAtTime(value, this.audioContext.currentTime);
        this.gainValue = value;
    }
    selectTrack(type, id) {
        if (!['audio', 'sub'].includes(type) || !/^(?:[1-9][0-9]*|auto|no)$/.test(id))
            throw new Error('Invalid track selection');
        return this.command('set', type === 'audio' ? 'aid' : 'sid', id);
    }
    observeSeekEvent(event) {
        const seek = this.seekObservation;
        if (seek) {
            if (event.event === 'playback-restart') {
                seek.restarted = true;
                const cache = this.properties.get('demuxer-cache-state');
                seek.eof = cache?.eof === true && cache?.idle === true;
            }
            if (seek.restarted && event.event === 'property-change' && event.name === 'demuxer-cache-state') {
                const cache = event.data;
                seek.eof = cache?.eof === true && cache?.idle === true;
            }
            if (seek.restarted && seek.eof && event.event === 'property-change' && event.name === 'time-pos' && typeof event.data === 'number' && event.data < seek.target - .15)
                seek.clamped = event.data;
        }
    }
    async confirmSeek(target) {
        const seek = this.seekObservation;
        if (!seek || seek.target !== target)
            return true;
        // A frame notification can precede mpv's final clamped position. Query the
        // runtime after presentation instead of trusting the requested clock value.
        const value = String(await this.command('expand-text', '${=time-pos}|${seeking}'));
        if (this.seekObservation !== seek)
            return false;
        const [time, seeking] = value.split('|'), position = Number(time);
        if (!Number.isFinite(position) || seeking !== 'no')
            return false;
        if (seek.restarted && seek.eof && position < target - .15)
            seek.clamped = position;
        return Math.abs(position - target) < .15;
    }
    seekBoundary(target) {
        const seek = this.seekObservation;
        return seek?.target === target && seek.restarted && seek.eof ? seek.clamped : undefined;
    }
    async addSubtitle(subtitle) {
        await this.ready;
        const bytes = subtitle.bytes.slice(0);
        const previous = (this.properties.get('track-list') ?? []).filter(t => t.external).length;
        // Command acceptance can precede the track-list event. Selection must wait
        // for the new source-scoped external identity to become observable.
        const listed = this.waitForEvent(e => e.event === 'property-change' && e.name === 'track-list' && Array.isArray(e.data) && e.data.filter(t => t.external).length > previous);
        await Promise.all([listed, this.request({ type: 'subtitle', ...subtitle, bytes }, [bytes])]);
    }
    subtitleVisible(visible) { return this.command('set', 'sub-visibility', visible ? 'yes' : 'no'); }
    resize(width, height) { if (this.destroyed)
        throw new Error('Player is destroyed'); if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1920 || height > 1080)
        throw new Error('Invalid output dimensions'); this.worker.postMessage({ type: 'resize', width, height }); }
    startupEvidence() {
        // Read existing producer/consumer counters; no analyser or frame readback.
        const audioDecoderConfigured = !!this.properties.get('audio-codec-name');
        const audioDecoded = (Atomics.load(this.audioHeader, 0) >>> 0) > 0;
        const audioProgress = (Atomics.load(this.audioHeader, 5) >>> 0) > 0;
        const tracks = this.properties.get('track-list');
        const videoPresented = !!tracks?.some(t => t.type === 'video' && t.selected) && !!this.diagnostics?.rendered && (this.diagnostics.presentation?.position !== undefined || this.diagnostics.presentedPosition !== undefined);
        const stats = this.diagnostics?.decoderStats;
        return { metadata: !!this.properties.get('track-list'), audioDecoderConfigured, audioDecoded, audioProgress, videoPresented,
            decoderOutput: videoPresented || audioDecoded,
            ...(stats?.supportCheck ? { apiHint: JSON.stringify(stats.supportCheck) } : {}) };
    }
    audioDiagnostics() {
        const samples = new Float32Array(this.analyser?.fftSize || 2048);
        this.analyser?.getFloatTimeDomainData(samples);
        return { gain: this.gainValue, gainStage: this.gainNode ? 'web-audio' : 'none', requestedOutput: this.requestedOutput, outputChannels: this.outputChannels, deviceChannels: this.deviceChannels, channelLayout: this.outputChannels === 8 ? '7.1' : this.outputChannels === 6 ? '5.1' : 'stereo', state: this.audioContext.state, sampleRate: this.audioContext.sampleRate, mediaFrames: Atomics.load(this.audioHeader, 5), underruns: Atomics.load(this.audioHeader, 6), rms: Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length), latencyConfidence: 'reported-latency estimate' };
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.destroyed = true;
        this.loading.abort();
        this.refreshAuthorization = undefined;
        clearTimeout(this.readyTimer);
        this.rejectReady?.(new Error('Player destroyed'));
        for (const cancel of this.eventWaiters)
            cancel(new Error('Player destroyed'));
        this.fail(new Error('Player destroyed'), undefined, false);
        clearInterval(this.timing);
        Atomics.store(this.audioHeader, 2, 0);
        this.audioNode?.port.postMessage('close');
        this.audioNode?.disconnect();
        this.audioNode?.port.close();
        this.analyser?.disconnect();
        this.gainNode?.disconnect();
        this.destruction = (async () => {
            let timeout;
            try {
                await new Promise((resolve, reject) => {
                    this.onDestroyed = resolve;
                    timeout = setTimeout(() => reject(new Error('Native cleanup timed out; worker containment applied')), 10000);
                    this.worker.postMessage({ type: 'destroy' });
                });
            }
            finally {
                clearTimeout(timeout);
                this.worker.terminate();
                this.workerOwner.remove();
                await this.audioContext.close();
            }
        })();
        return this.destruction;
    }
}
