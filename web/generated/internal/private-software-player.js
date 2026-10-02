// SPDX-License-Identifier: Apache-2.0
import { bufferingPolicy, mpvBufferingOptions, resolveBuffering } from './buffering.js';
import { runtimeWorker } from './runtime-worker.js';
import { PlayerError, playerError } from './errors.js';
/** Experimental finite Software Backend. Public admission has its own gates. */
export class PrivateSoftwarePlayer extends EventTarget {
    options;
    properties = new Map();
    ready;
    planId;
    diagnostics;
    worker;
    context;
    node;
    gainNode;
    analyser;
    loading = new AbortController();
    pending = new Map();
    nextId = 1;
    generation = 0;
    closing = false;
    destruction;
    failed;
    refresh;
    userPaused = true;
    gainValue = 1;
    outputVerified = false;
    outputChannels;
    deviceChannels;
    requestedOutput;
    attachmentIds = [];
    presentedDraws = 0;
    presentation;
    constructor(canvas, options) {
        super();
        this.options = options;
        this.planId = options.mode === 'hybrid' ? 'hybrid-private' : 'software-private';
        if (typeof AudioContext === 'undefined' || typeof OffscreenCanvas === 'undefined')
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Private Software requires Web Audio and OffscreenCanvas');
        this.context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
        this.requestedOutput = options.audioOutput ?? (options.channels === 8 ? '7.1' : options.channels === 6 ? '5.1' : 'stereo');
        this.deviceChannels = this.context.destination.maxChannelCount;
        const wanted = this.requestedOutput === 'auto' ? (this.deviceChannels >= 8 ? 8 : this.deviceChannels >= 6 ? 6 : 2) : this.requestedOutput === '7.1' ? 8 : this.requestedOutput === '5.1' ? 6 : 2;
        if (wanted > this.deviceChannels && options.audioFallback === 'reject') {
            void this.context.close();
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Requested audio layout is unavailable on this output device');
        }
        this.outputChannels = wanted <= this.deviceChannels ? wanted : 2;
        try {
            this.context.destination.channelCount = this.outputChannels;
            this.context.destination.channelCountMode = 'explicit';
        }
        catch (error) {
            void this.context.close();
            throw error;
        }
        try {
            this.worker = runtimeWorker(new URL('web/private-mpv/playback-worker.js', options.assetBase), { type: 'module' }, Worker, new URL('web/generated/internal/runtime-worker.js', options.assetBase));
        }
        catch (error) {
            void this.context.close();
            throw error;
        }
        this.worker.onmessage = ({ data }) => this.receive(data);
        this.worker.onerror = event => { event.preventDefault(); this.fail(new PlayerError('ASSET_LOAD_FAILED', 'Private Software worker failed: ' + event.message)); };
        this.worker.onmessageerror = () => this.fail(new PlayerError('ASSET_LOAD_FAILED', 'Private Software worker message failure'));
        this.context.onstatechange = () => { if (!this.closing)
            void this.ready.then(() => this.syncContext()).catch(error => this.fail(error)); };
        this.ready = this.initialize(canvas);
        void this.ready.catch(error => { if (!this.closing)
            this.fail(error); });
    }
    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
    async initialize(canvas) {
        const presentation = canvas.getContext('2d');
        if (!presentation)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Private Software canvas presentation unavailable');
        this.presentation = presentation;
        await this.context.audioWorklet.addModule(new URL('web/private-mpv/audio-worklet.js', this.options.assetBase).href);
        if (this.closing)
            throw new PlayerError('ABORTED', 'Private Software closed during initialization');
        this.node = new AudioWorkletNode(this.context, 'demuxe-private-pcm', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [this.outputChannels], channelCount: this.outputChannels, channelCountMode: 'explicit' });
        this.gainNode = this.context.createGain();
        this.analyser = this.context.createAnalyser();
        this.node.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
        this.gainNode.connect(this.analyser);
        this.node.port.onmessage = ({ data }) => { if (data.type === 'error')
            this.fail(new Error(data.error)); };
        const provider = this.options.providerAssets;
        const assetPath = `web/engine-mpv-playback-${this.options.runtime}/`;
        const playbackAssets = provider ? Object.fromEntries(await Promise.all(['manifest.json', 'player.wasm', 'player.mjs'].map(async (name) => [name, await provider.bytes(assetPath + name)]))) : undefined;
        let font;
        if (provider)
            font = await provider.bytes('fixtures/DejaVuSans.ttf');
        else {
            const response = await fetch(new URL('fixtures/DejaVuSans.ttf', this.options.assetBase), { signal: this.loading.signal });
            if (!response.ok)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Private Software font HTTP ' + response.status);
            font = await response.arrayBuffer();
        }
        if (font.byteLength > 8 * 1024 * 1024)
            throw new PlayerError('ASSET_LOAD_FAILED', 'Private Software font byte limit');
        if (this.closing)
            throw new PlayerError('ABORTED', 'Private Software closed during asset acquisition');
        const channel = new MessageChannel();
        this.node.port.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);
        const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
        const fonts = (this.options.fonts ?? []).map(font => ({ ...font, bytes: font.bytes.slice(0) }));
        await this.request('init', { runtime: this.options.runtime, mode: this.options.mode ?? 'software', channels: this.outputChannels, playbackAssets, canvas: offscreen, port: channel.port2, font, fonts, width: canvas.width, height: canvas.height,
            contextRunning: this.context.state === 'running', latencyUs: this.latency(), decodeQuality: this.options.decodeQuality, adaptiveFrameDrop: this.options.adaptiveFrameDrop, videoTrack: this.options.videoTrack, ...this.options.resourceLimits }, [offscreen, channel.port2, font, ...fonts.map(font => font.bytes), ...Object.values(playbackAssets ?? {})]);
    }
    latency() { return Math.round((this.context.baseLatency + (this.context.outputLatency || 0)) * 1e6); }
    request(op, data = {}, transfer = []) {
        if (this.closing && op !== 'close')
            return Promise.reject(new PlayerError('ABORTED', 'Private Software closed'));
        if (this.failed && op !== 'close')
            return Promise.reject(this.failed);
        if (this.pending.size >= 128 && op !== 'close')
            return Promise.reject(new PlayerError('ABORTED', 'Private Software command queue limit'));
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Private Software ' + op + ' deadline')); }, op === 'init' ? 60000 : op === 'close' ? 2000 : 25000);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.worker.postMessage({ id, op, ...data }, transfer);
            }
            catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(playerError(error));
            }
        });
    }
    receive(data) {
        if (data.type === 'picture') {
            try {
                if (!this.closing && data.generation === this.generation && this.presentation) {
                    const canvas = this.presentation.canvas;
                    if (canvas.width !== data.bitmap.width || canvas.height !== data.bitmap.height) {
                        canvas.width = data.bitmap.width;
                        canvas.height = data.bitmap.height;
                    }
                    this.presentation.drawImage(data.bitmap, 0, 0);
                    this.presentedDraws = data.rendered;
                }
            }
            catch (error) {
                this.fail(playerError(error));
            }
            finally {
                data.bitmap.close();
                if (!this.closing)
                    this.worker.postMessage({ op: 'picture-presented', pictureId: data.pictureId });
            }
            return;
        }
        if (data.id !== undefined) {
            const pending = this.pending.get(data.id);
            if (pending) {
                clearTimeout(pending.timer);
                this.pending.delete(data.id);
                data.error ? pending.reject(data.code === 'ASSET_LOAD_FAILED' ? new PlayerError('ASSET_LOAD_FAILED', data.error) : playerError(new Error(data.error))) : pending.resolve(data.result);
            }
            return;
        }
        if (data.type === 'fatal') {
            this.diagnostics = { ...this.diagnostics, cleanup: data.cleanup, cleanupError: data.cleanupError };
            this.fail(playerError(new Error(data.error)));
            return;
        }
        if (data.type === 'refresh') {
            if (data.generation !== this.generation) {
                this.worker.postMessage({ op: 'refreshed', refreshId: data.refreshId, error: 'Authorization source replaced' });
                return;
            }
            const refresh = this.refresh;
            void Promise.resolve().then(() => { if (!refresh)
                throw Error('Authorization refresh unavailable'); return refresh(data.resource); }).then(update => {
                if (!this.closing)
                    this.worker.postMessage({ op: 'refreshed', refreshId: data.refreshId, update });
            }, error => { if (!this.closing)
                this.worker.postMessage({ op: 'refreshed', refreshId: data.refreshId, error: String(error) }); });
            return;
        }
        if (this.closing || data.generation !== this.generation)
            return;
        if (data.type === 'diagnostics') {
            this.diagnostics = { ...data.data, buffering: resolveBuffering(this.options.buffering ?? bufferingPolicy(), 'mpv') };
            this.emit('diagnostics', this.diagnostics);
        }
        if (data.type === 'output') {
            this.emit('output', data);
        }
        if (data.type === 'event') {
            const event = data.event;
            if (event.event === 'property-change' && event.name === 'track-list' && Array.isArray(event.data)) {
                let external = 0;
                event.data = event.data.map((track) => track.type === 'sub' && track.external ? { ...track, 'attachment-id': this.attachmentIds[external++] } : track);
            }
            if (event.event === 'property-change')
                this.properties.set(event.name, event.data);
            if (event.event === 'log-message')
                this.emit('log', event.prefix + ': ' + event.text);
            this.emit('mpv', event);
        }
    }
    fail(error) {
        if (this.failed || this.closing)
            return;
        this.failed = error;
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
        this.emit('error', error);
        void this.destroy().catch(() => { });
    }
    async waitUntil(predicate, signal) {
        const start = performance.now();
        while (performance.now() - start < 25000) {
            if (this.closing)
                throw this.failed ?? new PlayerError('ABORTED', 'Private Software closed');
            signal?.throwIfAborted();
            if (this.failed)
                throw this.failed;
            if (predicate())
                return;
            await new Promise(resolve => setTimeout(resolve, 15));
        }
        throw new PlayerError('PLAYBACK_STALLED', 'Private Software output deadline');
    }
    async open(file, input) {
        const suffix = file instanceof File ? file.name.split('.').at(-1)?.toLowerCase() : undefined;
        const demuxer = input?.demuxer ?? (suffix === 'sbc' || suffix === 'msbc' ? 'sbc' : '');
        if (typeof demuxer !== 'string' || demuxer !== '' && !/^[a-z0-9_]{1,64}$/.test(demuxer))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid demuxer hint');
        const blob = file instanceof ArrayBuffer ? new File([file], 'source') : file;
        if (!Number.isSafeInteger(blob.size) || blob.size <= 0)
            throw new PlayerError('INVALID_ARGUMENT', 'Private playback requires a finite nonempty file');
        if (file instanceof ArrayBuffer && file.byteLength > 32 * 1024 * 1024)
            throw new PlayerError('INVALID_ARGUMENT', 'ArrayBuffer sources are limited to 32 MiB; use File for larger sources');
        await this.load({ file: blob, demuxer });
    }
    async openRemote(source) {
        if (source.format && source.format !== 'file')
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Private Software requires finite HTTP ranges');
        if (source.demuxer !== undefined && (typeof source.demuxer !== 'string' || source.demuxer !== '' && !/^[a-z0-9_]{1,64}$/.test(source.demuxer)))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid demuxer hint');
        const { refreshAuthorization, ...options } = source;
        await this.load({ options, demuxer: source.demuxer ?? '', canRefresh: !!refreshAuthorization }, refreshAuthorization);
    }
    async load(data, refresh) {
        await this.ready;
        await this.configureBuffering(true);
        this.generation++;
        this.properties.clear();
        this.diagnostics = undefined;
        this.outputVerified = false;
        this.attachmentIds = [];
        this.presentedDraws = 0;
        const generation = this.generation;
        this.refresh = refresh;
        await this.request('load', { ...data, generation, duration: this.options.duration });
        await this.waitUntil(() => {
            if (generation !== this.generation)
                throw new PlayerError('ABORTED', 'Source load replaced');
            const tracks = this.properties.get('track-list');
            const video = tracks?.some(track => track.type === 'video' && track.selected);
            const audio = tracks?.some(track => track.type === 'audio' && track.selected);
            return !!tracks?.length && !this.diagnostics?.seeking && (video ? this.presentedDraws > 0 : !!audio && this.startupEvidence().audioDecoderConfigured);
        });
        // Public timeline, loop and range controls require the backend's observed
        // seekability; successful direct seeks alone do not establish this state.
        const seekable = await this.command('expand-text', '${seekable}');
        if (generation !== this.generation)
            throw new PlayerError('ABORTED', 'Source load replaced');
        if (seekable === 'yes' || seekable === 'no')
            this.properties.set('seekable', seekable === 'yes');
    }
    async syncContext() {
        await this.request('context', { value: this.context.state === 'running', latencyUs: this.latency() });
        if (this.context.state !== 'running' && !this.userPaused)
            this.emit('activity', 'waiting');
    }
    async setBuffering(policy) {
        await this.ready;
        const settings = { ...mpvBufferingOptions(policy, this.userPaused), 'cache-secs': policy.preload === 'auto' || !this.userPaused ? '3600000' : '1' };
        for (const [key, value] of Object.entries(settings))
            await this.command('set', key, value);
        this.options.buffering = policy;
    }
    get bufferingDiagnostics() { return resolveBuffering(this.options.buffering ?? bufferingPolicy(), 'mpv'); }
    async configureBuffering(preparing) { for (const [key, value] of Object.entries(mpvBufferingOptions(this.options.buffering ?? bufferingPolicy(), preparing)))
        await this.command('set', key, value); }
    async play() { await this.ready; if (this.options.buffering?.preload && this.options.buffering.preload !== 'auto')
        await this.configureBuffering(false); this.userPaused = false; await this.context.resume(); await this.syncContext(); await this.request('pause', { value: false }); this.emit('activity', 'play'); }
    async pause() { await this.ready; this.userPaused = true; await this.request('pause', { value: true }); this.emit('activity', 'pause'); }
    async seek(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0)
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid seek time');
        await this.ready;
        await this.request('seek', { seconds });
        await this.waitUntil(() => {
            const video = this.properties.get('track-list')?.some(track => track.type === 'video' && track.selected);
            return (!video || this.presentedDraws >= Number(this.diagnostics?.rendered) && this.presentedDraws > 0) && !this.diagnostics?.seeking && Math.abs(Number(this.diagnostics?.presentedPosition) - seconds) < 0.15;
        });
    }
    async confirmSeek(target) { const value = String(await this.command('expand-text', '${=time-pos}|${seeking}')); const [time, seeking] = value.split('|'); return seeking === 'no' && Math.abs(Number(time) - target) < 0.15; }
    rate(value) { if (!Number.isFinite(value) || value < 0.5 || value > 2)
        throw new PlayerError('INVALID_ARGUMENT', 'Playback rate must be 0.5 to 2'); return this.command('set', 'speed', String(value)); }
    volume(value) { if (!Number.isFinite(value) || value < 0 || value > 100)
        throw new PlayerError('INVALID_ARGUMENT', 'Volume must be 0 to 100'); return this.command('set', 'volume', String(value)); }
    async gain(value) { if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new PlayerError('INVALID_ARGUMENT', 'Gain must be 0 to 1'); await this.ready; this.gainValue = value; this.gainNode.gain.setValueAtTime(value, this.context.currentTime); }
    selectTrack(type, id) { if (!['audio', 'sub'].includes(type) || !/^(?:[1-9][0-9]*|auto|no)$/.test(id))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid track selection'); return this.command('set', type === 'audio' ? 'aid' : 'sid', id); }
    subtitleVisible(visible) { return this.command('set', 'sub-visibility', visible ? 'yes' : 'no'); }
    resize(width, height) { if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1920 || height > 1080)
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid dimensions'); void this.ready.then(() => this.request('resize', { width, height })).catch(error => { if (!this.closing)
        this.fail(error); }); }
    async command(...args) { await this.ready; if (args[0] === 'set' && args[1] === 'pause')
        return args[2] === 'yes' ? this.pause() : this.play(); return this.request('command', { args }); }
    async previewSnapshot() { await this.ready; return this.request('snapshot'); }
    async addSubtitle(subtitle) {
        await this.ready;
        const previous = this.attachmentIds.length;
        this.attachmentIds.push(subtitle.attachmentId);
        const bytes = subtitle.bytes.slice(0);
        try {
            await this.request('subtitle', { subtitle: { ...subtitle, bytes } }, [bytes]);
            await this.waitUntil(() => (this.properties.get('track-list') ?? []).filter(t => t.type === 'sub' && t.external).length > previous);
        }
        catch (error) {
            this.attachmentIds.pop();
            throw error;
        }
    }
    startupEvidence() { const h = this.diagnostics?.audio?.header ?? []; return { metadata: !!this.properties.get('track-list'), audioDecoderConfigured: !!this.properties.get('audio-codec-name'), audioDecoded: h[0] > 0, audioProgress: h[1] > 0, videoPresented: !!this.properties.get('track-list')?.some(track => track.type === 'video' && track.selected) && this.presentedDraws > 0, decoderOutput: !!this.properties.get('track-list')?.some(track => track.type === 'video' && track.selected) && this.presentedDraws > 0 || h[0] > 0 }; }
    async verifyOutput(signal) { await this.waitUntil(() => { const evidence = this.startupEvidence(), tracks = this.properties.get('track-list'); return !!tracks?.some(t => (t.type === 'video' || t.type === 'audio') && t.selected) && (!tracks?.some(t => t.type === 'video' && t.selected) || evidence.videoPresented) && (!tracks?.some(t => t.type === 'audio' && t.selected) || evidence.audioDecoded); }, signal); this.outputVerified = true; }
    async setAudioOutputDevice(id) { await this.ready; const context = this.context; if (!context.setSinkId)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'AudioContext output selection unavailable'); await context.setSinkId(id === 'default' ? '' : id); }
    audioDiagnostics() { const samples = new Float32Array(this.analyser?.fftSize ?? 2048); this.analyser?.getFloatTimeDomainData(samples); return { state: this.context.state, sampleRate: this.context.sampleRate, requestedOutput: this.requestedOutput, outputChannels: this.outputChannels, deviceChannels: this.deviceChannels, channelLayout: this.outputChannels === 8 ? '7.1' : this.outputChannels === 6 ? '5.1' : 'stereo', gain: this.gainValue, rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length), mediaFrames: this.diagnostics?.audio?.header?.[1] ?? 0, transport: this.diagnostics?.audio, outputVerified: this.outputVerified }; }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.closing = true;
        this.loading.abort();
        return this.destruction = (async () => {
            try {
                const cleanup = await this.request('close');
                this.diagnostics = { ...this.diagnostics, cleanup };
            }
            finally {
                this.worker.terminate();
                for (const pending of this.pending.values()) {
                    clearTimeout(pending.timer);
                    pending.reject(new PlayerError('ABORTED', 'Private Software closed'));
                }
                this.pending.clear();
                this.node?.disconnect();
                this.node?.port.close();
                this.gainNode?.disconnect();
                this.analyser?.disconnect();
                this.context.onstatechange = null;
                if (this.context.state !== 'closed')
                    await this.context.close();
            }
        })();
    }
}
