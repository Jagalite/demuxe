// SPDX-License-Identifier: Apache-2.0
import { WasmPlayer } from './wasm-player.js';
import { PlayerError, playerError } from './errors.js';
import { watchdogPolicy } from './watchdogs.js';
import { nativeAudioWait, completeNativeAudioFrame, observeNativeAudioContext, initialNativeAudio, beginNativeAudio, finishNativeAudio, closeNativeAudio, failNativeAudio, nativeAudioCurrent, nativeAudioAlive, nativeAudioEstimate, observeNativeAudioDrift, observeNativeAudioPoint, transitionNativeAudio } from './machine/native-audio.js';
/** Browser presentation clock with isolated mpv demux/decode and timestamped PCM. */
export class NativeMpvAudio extends EventTarget {
    video;
    time;
    assetBase;
    failed;
    engine;
    hidden;
    header;
    context;
    gain;
    machine = initialNativeAudio(watchdogPolicy());
    operations = new Map();
    firstPoint;
    pendingRate;
    contextOperations = Promise.resolve();
    driftTimer;
    drain;
    frameCallback;
    closing;
    get running() { return this.machine.running; }
    get stopped() { return this.machine.phase === 'closed'; }
    get contextPaused() { return this.machine.contextPaused; }
    get generation() { return this.machine.generation; }
    get requestedRate() { return this.machine.requestedRate; }
    get effectiveRate() { return this.machine.effectiveRate; }
    get resumeRate() { return this.machine.resumeRate; }
    get points() { return this.machine.points; }
    change(command) { this.machine = transitionNativeAudio(this.machine, command); }
    assert(lease) { if (!nativeAudioCurrent(this.machine, lease))
        throw new DOMException('Selective audio operation retired', 'AbortError'); }
    async owned(lease, work) {
        const observed = Promise.resolve(work);
        void observed.catch(() => { });
        this.assert(lease);
        const result = await Promise.race([observed, this.operations.get(lease.id).cancel]);
        this.assert(lease);
        return result;
    }
    call(lease, target, key, args = []) {
        this.assert(lease);
        const method = target[key];
        this.assert(lease);
        return this.owned(lease, method.apply(target, args));
    }
    clearTimer(timer) { if (timer?.handle !== undefined) {
        const handle = timer.handle;
        timer.handle = undefined;
        clearTimeout(handle);
    } }
    armTimer(timer, callback, delay, current) {
        if (!current())
            return;
        const acquired = setTimeout(callback, delay);
        timer.handle = acquired;
        if (!current())
            this.clearTimer(timer);
    }
    retireResources() {
        const point = this.firstPoint, rate = this.pendingRate;
        let failed = false, failure;
        const release = (work) => { try {
            work();
        }
        catch (error) {
            if (!failed) {
                failed = true;
                failure = error;
            }
        } };
        if (point && !nativeAudioCurrent(this.machine, point.lease)) {
            this.firstPoint = undefined;
            release(() => this.clearTimer(point.timer));
            point.reject(new DOMException('Selective PCM publication retired', 'AbortError'));
        }
        if (rate && !nativeAudioCurrent(this.machine, rate.lease)) {
            this.pendingRate = undefined;
            release(() => this.clearTimer(rate.timer));
            release(() => this.clearTimer(rate.deadline));
            rate.reject(new DOMException('Selective rate transition retired', 'AbortError'));
        }
        if (failed)
            throw failure;
    }
    run(domain, work, report = false) {
        const decision = beginNativeAudio(this.machine, domain);
        this.machine = decision.state;
        if (!decision.lease)
            return Promise.reject(new DOMException('Selective audio destroyed', 'AbortError'));
        const lease = decision.lease;
        let reject;
        const cancel = new Promise((_, no) => { reject = no; });
        void cancel.catch(() => { });
        this.operations.set(lease.id, { lease, cancel, reject });
        for (const id of decision.retire) {
            const retired = this.operations.get(id);
            this.operations.delete(id);
            retired?.reject(new DOMException('Selective audio operation superseded', 'AbortError'));
        }
        try {
            this.retireResources();
        }
        catch (error) {
            this.machine = finishNativeAudio(this.machine, lease);
            reject(error);
        }
        const result = Promise.resolve().then(() => { this.assert(lease); return work(lease); });
        void result.catch(() => { });
        const finish = () => { const disable = nativeAudioCurrent(this.machine, lease) && this.machine.publication?.id === lease.id && !this.running; this.operations.delete(lease.id); this.machine = finishNativeAudio(this.machine, lease); if (disable && this.header)
            this.set(12, 0); this.retireResources(); };
        return Promise.race([result, cancel]).then(value => { finish(); return value; }, error => { if (report && nativeAudioCurrent(this.machine, lease))
            try {
                this.fail(error);
            }
            catch { } try {
            finish();
        }
        catch { } throw error; });
    }
    async wait(lease, predicate, timeout = 5000, signal) {
        const now = performance.now();
        this.assert(lease);
        this.change({ type: 'wait.begin', lease, now, timeout });
        try {
            for (;;) {
                const status = nativeAudioWait(this.machine, lease, performance.now());
                this.assert(lease);
                if (status === 'timeout')
                    throw Error('Selective audio convergence timed out');
                if (status === 'retired')
                    this.assert(lease);
                signal?.throwIfAborted();
                if (await this.owned(lease, predicate())) {
                    this.assert(lease);
                    signal?.throwIfAborted();
                    return;
                }
                await this.delay(lease, 20);
            }
        }
        finally {
            this.change({ type: 'wait.finish', id: lease.id });
        }
    }
    async delay(lease, duration) {
        let timer;
        try {
            await this.owned(lease, new Promise(resolve => { timer = setTimeout(resolve, duration); }));
        }
        finally {
            clearTimeout(timer);
        }
    }
    contextChanged = () => this.observeContext();
    observeContext() {
        const epoch = this.machine.epoch;
        if (this.stopped)
            return;
        const running = this.context.state === 'running';
        if (!nativeAudioAlive(this.machine, epoch))
            return;
        const decision = observeNativeAudioContext(this.machine, running);
        this.machine = decision.state;
        if (decision.action === 'pause') {
            const work = this.run('playback', async (lease) => { this.assert(lease); this.set(12, 0); this.video.pause(); this.assert(lease); await this.call(lease, this.engine, 'pause', []); this.assert(lease); }, true);
            this.contextOperations = work.catch(() => { });
        }
        else if (decision.action === 'resume') {
            const previous = this.contextOperations;
            this.contextOperations = this.run('playback', async (lease) => { await this.owned(lease, previous); this.assert(lease); if (this.contextPaused) {
                this.change({ type: 'context.clear' });
                await this.start(lease, () => this.video.play());
            } }, true).catch(() => { });
        }
    }
    setWatchdogs(policy) { this.change({ type: 'watchdogs', policy }); this.engine.setWatchdogs(policy); }
    get selectedTrackId() { return this.engine.properties.get('track-list')?.find(t => t.type === 'audio' && t.selected)?.id; }
    get selectedStreamIndex() { return this.engine.properties.get('track-list')?.find(t => t.type === 'audio' && t.selected)?.['ff-index']; }
    ended = () => { void this.finishEOF()?.catch(() => { }); };
    constructor(video, time, assetBase, failed, prepared) {
        super();
        this.video = video;
        this.time = time;
        this.assetBase = assetBase;
        this.failed = failed;
        this.hidden = document.createElement('canvas');
        this.hidden.width = 1;
        this.hidden.height = 1;
        this.hidden.hidden = true;
        document.body.append(this.hidden);
        this.engine = new WasmPlayer(this.hidden, { prepared, assetBase, mode: 'selective-audio', audioOutput: 'stereo' });
        this.engine.addEventListener('output', event => this.onOutput(event.detail));
        this.engine.addEventListener('error', event => this.fail(event.detail));
        video.addEventListener('ended', this.ended);
        this.scheduleFrame();
    }
    scheduleFrame() {
        if (this.stopped || this.machine.frame !== null)
            return;
        this.change({ type: 'frame.request' });
        const id = this.machine.frame, registration = { id };
        this.frameCallback = registration;
        const frame = (_, metadata) => {
            if (this.frameCallback !== registration || this.stopped)
                return;
            this.frameCallback = undefined;
            const duration = this.video.duration, mediaTime = metadata.mediaTime, decision = completeNativeAudioFrame(this.machine, id, !!this.header, duration, mediaTime);
            this.machine = decision.state;
            if (!decision.accepted)
                return;
            if (decision.tail)
                this.set(7, 1);
            this.scheduleFrame();
        };
        const acquired = this.video.requestVideoFrameCallback(frame);
        registration.handle = acquired;
        if (this.frameCallback !== registration || this.stopped)
            this.video.cancelVideoFrameCallback(acquired);
    }
    fail(error) { const decision = failNativeAudio(this.machine); this.machine = decision.state; if (decision.notify)
        this.failed(playerError(error)); }
    h(index) { return Atomics.load(this.header, index); }
    set(index, value) { Atomics.store(this.header, index, value); }
    cancelRate(reason) {
        const pending = this.pendingRate;
        if (!pending)
            return;
        this.pendingRate = undefined;
        this.change({ type: 'rate.clear', id: pending.lease.id });
        try {
            this.clearTimer(pending.timer);
        }
        finally {
            try {
                this.clearTimer(pending.deadline);
            }
            finally {
                pending.reject(new DOMException(reason, 'AbortError'));
            }
        }
    }
    onOutput(point) {
        const origin = performance.timeOrigin, decision = observeNativeAudioPoint(this.machine, point, origin);
        this.machine = decision.state;
        if (decision.publication !== undefined && this.firstPoint?.lease.id === decision.publication) {
            const waiter = this.firstPoint, value = this.machine.publication.point;
            this.firstPoint = undefined;
            try {
                this.clearTimer(waiter.timer);
                waiter.resolve(value);
            }
            catch (error) {
                waiter.reject(error);
            }
        }
        const pending = this.pendingRate;
        if (decision.rate !== undefined && pending?.lease.id === decision.rate) {
            const timer = {};
            pending.timer = timer;
            const apply = () => {
                if (this.pendingRate !== pending || !nativeAudioCurrent(this.machine, pending.lease))
                    return;
                const rate = this.machine.rate, remaining = rate.due - performance.now();
                if (this.pendingRate !== pending || !nativeAudioCurrent(this.machine, pending.lease))
                    return;
                if (remaining > 0) {
                    try {
                        this.armTimer(timer, apply, remaining, () => this.pendingRate === pending && nativeAudioCurrent(this.machine, pending.lease));
                    }
                    catch (error) {
                        this.pendingRate = undefined;
                        this.change({ type: 'rate.clear', id: pending.lease.id });
                        pending.reject(error);
                    }
                    return;
                }
                try {
                    this.clearTimer(pending.deadline);
                    this.assert(pending.lease);
                    this.video.defaultPlaybackRate = rate.rate;
                    this.assert(pending.lease);
                    this.video.playbackRate = rate.rate;
                    this.assert(pending.lease);
                    this.pendingRate = undefined;
                    this.change({ type: 'rate.clear', id: pending.lease.id, applied: true });
                    pending.resolve();
                }
                catch (error) {
                    if (this.pendingRate === pending) {
                        this.pendingRate = undefined;
                        this.change({ type: 'rate.clear', id: pending.lease.id });
                    }
                    pending.reject(error);
                }
            };
            try {
                const delay = Math.max(0, this.machine.rate.due - performance.now());
                this.armTimer(timer, apply, delay, () => this.pendingRate === pending && nativeAudioCurrent(this.machine, pending.lease));
            }
            catch (error) {
                this.pendingRate = undefined;
                this.change({ type: 'rate.clear', id: pending.lease.id });
                pending.reject(error);
            }
        }
    }
    estimatedAudioPresentationTime(at = performance.now()) { return nativeAudioEstimate(this.machine, at, performance.timeOrigin); }
    observe() {
        const epoch = this.machine.epoch, generation = this.generation, now = performance.now(), paused = this.video.paused, seeking = this.video.seeking, ended = this.video.ended, readyState = this.video.readyState, contextRunning = this.context.state === 'running';
        const eligible = this.running && !this.machine.rate && !paused && !seeking && !ended && readyState >= 3 && contextRunning;
        const hidden = eligible ? this.video.ownerDocument.hidden : false, position = eligible ? this.estimatedAudioPresentationTime() : null, videoTime = position === null ? 0 : this.time();
        if (!nativeAudioAlive(this.machine, epoch) || this.generation !== generation)
            return;
        const decision = observeNativeAudioDrift(this.machine, { now, paused, seeking, ended, readyState, contextRunning, hidden, position, videoTime });
        this.machine = decision.state;
        if (decision.failure)
            this.fail(new PlayerError('PLAYBACK_STALLED', decision.failure === 'missing' ? 'Selective audio timeline stopped during playback' : 'Selective A/V sync error remained above 250 ms', null, null, 'session', true));
        if (decision.rate !== undefined && nativeAudioAlive(this.machine, epoch) && this.generation === generation)
            void this.engine.rate(decision.rate).catch(error => { if (nativeAudioAlive(this.machine, epoch) && this.generation === generation)
                this.fail(error); });
    }
    fadeOut = async () => {
        const at = this.context.currentTime;
        this.gain.gain.cancelScheduledValues(at);
        this.gain.gain.setValueAtTime(this.gain.gain.value, at);
        this.gain.gain.linearRampToValueAtTime(0, at + .008);
        await new Promise(resolve => setTimeout(resolve, 12));
    };
    fadeIn() { const at = this.context.currentTime; this.gain.gain.cancelScheduledValues(at); this.gain.gain.setValueAtTime(0, at); this.gain.gain.linearRampToValueAtTime(1, at + .008); }
    open(source, audioStream) {
        return this.run('open', async (lease) => {
            await this.owned(lease, this.engine.ready);
            this.assert(lease);
            const state = this.engine.selectiveAudioState();
            this.assert(lease);
            this.header = state.header;
            this.context = state.context;
            this.gain = state.gain;
            const context = this.context;
            context.addEventListener('statechange', this.contextChanged);
            if (!nativeAudioCurrent(this.machine, lease)) {
                context.removeEventListener('statechange', this.contextChanged);
                this.assert(lease);
            }
            await this.call(lease, this.engine, 'command', ['set', 'vid', 'no']);
            await this.call(lease, this.engine, 'command', ['set', 'sid', 'no']);
            if (audioStream !== undefined)
                await this.call(lease, this.engine, 'command', ['set', 'aid', String(audioStream + 1)]);
            if (source instanceof File)
                await this.call(lease, this.engine, 'open', [source]);
            else
                await this.call(lease, this.engine, 'openRemote', [source]);
            await this.call(lease, this.engine, 'inspectMetadata', []);
            this.assert(lease);
            let tracks = this.engine.properties.get('track-list');
            this.assert(lease);
            if (audioStream !== undefined) {
                const requested = tracks?.find(t => t.type === 'audio' && t['ff-index'] === audioStream);
                if (!requested)
                    throw new PlayerError('DECODE_FAILED', 'Selective requested audio stream is absent');
                if (!requested.selected) {
                    await this.call(lease, this.engine, 'selectTrack', ['audio', requested.id]);
                    await this.wait(lease, () => this.selectedStreamIndex === audioStream);
                    this.assert(lease);
                }
                tracks = this.engine.properties.get('track-list');
                this.assert(lease);
            }
            if (tracks?.some(t => t.type === 'video' && t.selected) || !tracks?.some(t => t.type === 'audio' && t.selected))
                throw new PlayerError('DECODE_FAILED', 'Selective mpv track ownership failed');
            const timer = setInterval(() => this.observe(), 250);
            if (nativeAudioCurrent(this.machine, lease))
                this.driftTimer = timer;
            else {
                clearInterval(timer);
                this.assert(lease);
            }
        });
    }
    async publish(lease, startVideo) {
        this.assert(lease);
        const now = performance.now();
        this.assert(lease);
        this.change({ type: 'publication.begin', lease, now });
        const point = new Promise((resolve, reject) => {
            const waiter = { lease, resolve, reject, timer: {} };
            this.firstPoint = waiter;
            const expired = () => {
                if (this.firstPoint !== waiter)
                    return;
                const remaining = this.machine.publication.deadline - performance.now();
                if (this.firstPoint !== waiter || !nativeAudioCurrent(this.machine, lease))
                    return;
                if (remaining > 0) {
                    try {
                        this.armTimer(waiter.timer, expired, remaining, () => this.firstPoint === waiter && nativeAudioCurrent(this.machine, lease));
                    }
                    catch (error) {
                        this.firstPoint = undefined;
                        reject(error);
                    }
                    return;
                }
                this.firstPoint = undefined;
                reject(Error('Selective PCM timestamp timeout'));
            };
            try {
                this.armTimer(waiter.timer, expired, 3000, () => this.firstPoint === waiter && nativeAudioCurrent(this.machine, lease));
            }
            catch (error) {
                this.firstPoint = undefined;
                reject(error);
            }
        });
        void point.catch(() => { });
        this.assert(lease);
        if (!this.firstPoint && this.machine.publication?.point === null)
            await this.owned(lease, point);
        this.assert(lease);
        this.set(12, 1);
        this.fadeIn();
        this.assert(lease);
        await this.owned(lease, point);
        this.assert(lease);
        const origin = performance.timeOrigin, videoTime = this.time(), rate = this.video.playbackRate;
        this.assert(lease);
        this.change({ type: 'publication.schedule', id: lease.id, origin, videoTime, rate });
        const due = this.machine.publication.due;
        do {
            const delay = Math.max(0, due - performance.now());
            this.assert(lease);
            await this.delay(lease, delay);
            this.assert(lease);
        } while (performance.now() < due);
        this.assert(lease);
        await this.owned(lease, startVideo());
        this.assert(lease);
        this.change({ type: 'running', value: true });
        this.change({ type: 'publication.clear', id: lease.id });
    }
    play(startVideo) { this.change({ type: 'playback.intent', intent: 'play' }); return this.run('playback', async (lease) => { await this.owned(lease, this.contextOperations); this.assert(lease); await this.start(lease, startVideo); }); }
    async start(lease, startVideo) {
        this.assert(lease);
        if (this.running)
            return;
        const context = this.context;
        if (context?.state === 'suspended') {
            this.assert(lease);
            await this.call(lease, context, 'resume');
            this.assert(lease);
        }
        let deferred;
        if (this.resumeRate !== null) {
            deferred = this.waitRate(lease, this.resumeRate);
            void deferred.catch(() => { });
            this.change({ type: 'rate.resume', rate: null });
        }
        await this.call(lease, this.engine, 'play', []);
        this.assert(lease);
        this.set(14, this.h(3));
        await this.publish(lease, startVideo);
        if (deferred)
            await this.owned(lease, deferred);
    }
    pause(stopVideo) {
        this.change({ type: 'playback.intent', intent: 'pause' });
        this.change({ type: 'context.clear' });
        if (this.machine.rate)
            this.change({ type: 'rate.resume', rate: this.requestedRate });
        return this.run('playback', async (lease) => {
            await this.owned(lease, this.contextOperations);
            this.assert(lease);
            if (this.pendingRate) {
                this.change({ type: 'rate.resume', rate: this.requestedRate });
                this.cancelRate('Paused during rate transition');
                this.assert(lease);
            }
            this.change({ type: 'paused' });
            await this.owned(lease, this.fadeOut());
            this.assert(lease);
            this.set(12, 0);
            stopVideo();
            this.assert(lease);
            await this.call(lease, this.engine, 'pause', []);
            this.assert(lease);
        });
    }
    seek(seconds, seekVideo) {
        this.change({ type: 'context.clear' });
        return this.run('seek', async (lease) => {
            await this.owned(lease, this.contextOperations);
            this.assert(lease);
            this.cancelRate('Seek superseded pending rate');
            this.assert(lease);
            this.change({ type: 'rate.resume', rate: null });
            this.video.defaultPlaybackRate = this.requestedRate;
            this.assert(lease);
            this.video.playbackRate = this.requestedRate;
            this.assert(lease);
            const wasRunning = this.running, oldEpoch = this.h(3);
            this.drain = undefined;
            this.change({ type: 'paused' });
            await this.owned(lease, this.fadeOut());
            this.assert(lease);
            this.change({ type: 'seek.reset' });
            this.set(7, 0);
            this.set(12, 0);
            this.set(10, this.generation);
            this.video.pause();
            this.assert(lease);
            await this.call(lease, this.engine, 'pause', []);
            this.assert(lease);
            const context = this.context;
            if (context.state === 'suspended') {
                this.assert(lease);
                await this.call(lease, context, 'resume');
                this.assert(lease);
            }
            const videoSeek = Promise.resolve(seekVideo());
            void videoSeek.catch(() => { });
            this.assert(lease);
            await this.owned(lease, Promise.all([videoSeek, this.call(lease, this.engine, 'seek', [seconds])]));
            this.assert(lease);
            this.change({ type: 'seek.complete' });
            await this.wait(lease, () => this.h(3) !== oldEpoch && this.h(3) === this.h(4));
            await this.call(lease, this.engine, 'play', []);
            this.assert(lease);
            await this.wait(lease, () => this.call(lease, this.engine, 'confirmSeek', [seconds]));
            this.assert(lease);
            this.set(14, this.h(3));
            if (wasRunning)
                await this.publish(lease, async () => { await this.video.play(); });
            else {
                await this.call(lease, this.engine, 'pause', []);
                this.assert(lease);
                this.set(12, 0);
            }
            this.assert(lease);
            this.change({ type: 'running', value: wasRunning });
        });
    }
    waitRate(lease, value) {
        this.cancelRate('Superseded by another rate request');
        this.assert(lease);
        const now = performance.now();
        this.assert(lease);
        this.change({ type: 'rate.begin', lease, rate: value, now });
        return new Promise((resolve, reject) => {
            const pending = { lease, resolve, reject, deadline: {} };
            this.pendingRate = pending;
            const expired = () => {
                if (this.pendingRate !== pending)
                    return;
                const remaining = this.machine.rate.deadline - performance.now();
                if (this.pendingRate !== pending || !nativeAudioCurrent(this.machine, lease))
                    return;
                if (remaining > 0) {
                    try {
                        this.armTimer(pending.deadline, expired, remaining, () => this.pendingRate === pending && nativeAudioCurrent(this.machine, lease));
                    }
                    catch (error) {
                        this.pendingRate = undefined;
                        this.change({ type: 'rate.clear', id: lease.id });
                        reject(error);
                    }
                    return;
                }
                this.pendingRate = undefined;
                this.change({ type: 'rate.clear', id: lease.id });
                const error = new PlayerError('DECODE_FAILED', 'Selective rate boundary timed out');
                try {
                    this.fail(error);
                }
                finally {
                    reject(error);
                }
            };
            try {
                this.armTimer(pending.deadline, expired, 3000, () => this.pendingRate === pending && nativeAudioCurrent(this.machine, lease));
            }
            catch (error) {
                this.pendingRate = undefined;
                this.change({ type: 'rate.clear', id: lease.id });
                reject(error);
            }
        });
    }
    rate(value) {
        return this.run('rate', async (lease) => {
            await this.owned(lease, this.contextOperations);
            this.assert(lease);
            if (!Number.isFinite(value) || value < .5 || value > 2)
                throw Error('Playback rate must be 0.5 to 2');
            if (value === this.requestedRate && value === this.effectiveRate && !this.pendingRate)
                return;
            this.change({ type: 'rate.request', rate: value });
            if (!this.running) {
                await this.call(lease, this.engine, 'rate', [value]);
                this.assert(lease);
                this.change({ type: 'rate.resume', rate: value });
                return;
            }
            const boundary = this.waitRate(lease, value);
            void boundary.catch(() => { });
            await this.call(lease, this.engine, 'rate', [value]);
            await this.owned(lease, boundary);
        });
    }
    async selectAudio(id) {
        if (id === 'auto' || id === 'no')
            throw Error('Selective audio track change requires a new admitted plan');
        const tracks = this.engine.properties.get('track-list');
        if (!tracks?.some(t => t.type === 'audio' && t.id === id))
            throw Error('Unknown mpv audio track');
        await this.engine.selectTrack('audio', id);
    }
    volume(percent) { return this.engine.volume(percent); }
    setAudioOutputDevice(id) { return this.engine.setAudioOutputDevice(id); }
    gainValue(value) { return this.engine.gain(value); }
    verifyOutput(signal) {
        return this.run('verify', async (lease) => {
            await this.wait(lease, () => this.h(5) > 0 && this.points.some(p => p.kind === 'timeline' && p.generation === this.generation), 10000, signal);
            this.assert(lease);
            const tracks = this.engine.properties.get('track-list');
            this.assert(lease);
            if (tracks?.some(t => t.type === 'video' && t.selected) || !tracks?.some(t => t.type === 'audio' && t.selected))
                throw Error('Selective audio output ownership changed');
        });
    }
    finishEOF() {
        if (this.drain || this.stopped)
            return this.drain;
        this.change({ type: 'playback.intent', intent: 'pause' });
        this.drain = this.run('eof', async (lease) => {
            this.change({ type: 'paused' });
            this.set(7, 2);
            await this.wait(lease, () => this.h(0) === this.h(1), 2000);
            this.assert(lease);
            this.set(12, 0);
            this.set(2, 0);
            await this.call(lease, this.engine, 'pause', []);
            this.assert(lease);
            await this.wait(lease, () => this.h(0) === this.h(1) && this.h(3) === this.h(4), 2000);
            this.assert(lease);
            await this.call(lease, this.context, 'suspend');
        }, true);
        return this.drain;
    }
    get diagnostics() {
        if (!this.header)
            return { plan: 'native-video-mpv-audio', state: 'initializing' };
        const estimated = this.estimatedAudioPresentationTime();
        this.change({ type: 'diagnostics' });
        const drift = this.machine.drift, ordered = drift.ordered, p = (q) => ordered[Math.floor((ordered.length - 1) * q)] ?? null;
        return { plan: 'native-video-mpv-audio', requestedRate: this.requestedRate, effectiveRate: this.video.playbackRate, pendingRate: this.machine.rate?.rate,
            generation: this.generation, estimatedAudioPresentationTime: estimated, errorMs: estimated === null ? null : (estimated - this.time()) * 1000,
            absErrorP50Ms: p(.5), absErrorP95Ms: p(.95), absErrorP99Ms: p(.99), maxAbsErrorMs: drift.maxAbsError,
            rateTransitions: drift.rateCount, userSeeks: drift.hardCount, softCorrections: drift.softCount, preEofUnderruns: this.h(8), postEofDrainCallbacks: this.h(9), staleEpochRejects: this.h(15),
            nativeEpoch: this.h(3), ackEpoch: this.h(4), queuedFrames: Math.max(0, this.h(0) - this.h(1)), contextState: this.context.state, mpvVideoTracks: this.engine.properties.get('track-list')?.filter(t => t.type === 'video' && t.selected).length ?? null,
            worker: this.engine.diagnostics };
    }
    destroy() {
        if (this.closing)
            return this.closing;
        let resolve, reject;
        this.closing = new Promise((yes, no) => { resolve = yes; reject = no; });
        this.machine = closeNativeAudio(this.machine);
        const retirement = new DOMException('Selective audio destroyed', 'AbortError');
        for (const operation of this.operations.values())
            operation.reject(retirement);
        const releases = [() => this.retireResources(), () => this.context?.removeEventListener('statechange', this.contextChanged), () => clearInterval(this.driftTimer), () => this.video.removeEventListener('ended', this.ended), () => { const frame = this.frameCallback; this.frameCallback = undefined; if (frame?.handle !== undefined)
                this.video.cancelVideoFrameCallback(frame.handle); }, () => { if (this.header)
                this.set(12, 0); }];
        let failed = false, failure;
        const remember = (error) => { if (!failed) {
            failed = true;
            failure = error;
        } };
        for (const release of releases)
            try {
                release();
            }
            catch (error) {
                remember(error);
            }
        let destruction;
        try {
            destruction = Promise.resolve(this.engine.destroy());
        }
        catch (error) {
            destruction = Promise.reject(error);
        }
        void destruction.catch(remember).then(() => { try {
            this.hidden.remove();
        }
        catch (error) {
            remember(error);
        } if (failed)
            reject(failure);
        else
            resolve(); });
        return this.closing;
    }
}
