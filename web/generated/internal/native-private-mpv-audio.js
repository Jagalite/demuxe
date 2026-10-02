// SPDX-License-Identifier: Apache-2.0
import { runtimeWorker } from './runtime-worker.js';
import { PlayerError, playerError } from './errors.js';
import { createBackendRequests, admitBackendRequest, settleBackendRequest, failBackendRequests, beginBackendClose, finishBackendClose } from './machine/backend-requests.js';
import { createPrivateAudio, selectPrivateAudioStream, privateAudioSettings, beginAudioControl, audioControlCurrent, finishAudioPlay, observeAudioContext, acknowledgeAudioContext, beginAudioPoll, finishAudioPoll, observeAudioClock, privateAudioObservesClock, resetAudioClock, beginAudioEOF, audioEOFCurrent, finishAudioEOF, retirePrivateAudio, privateAudioReady, privateAudioDeadline, privateAudioDeadlineOpen } from './machine/private-audio.js';
/** Restricted stereo PCM service: private memory, acknowledged consumption and lifecycle. */
export class NativePrivateMpvAudio extends EventTarget {
    video;
    time;
    base;
    runtime;
    onFailure;
    worker;
    context;
    node;
    gain;
    requests = createBackendRequests('audio');
    pending = new Map();
    source;
    get stopped() { return this.requests.phase !== 'active'; }
    get failed() { return this.requests.failed; }
    audio = createPrivateAudio();
    get running() { return this.audio.running; }
    timer;
    destroyPromise;
    get rateValue() { return this.audio.rate; }
    get volumeValue() { return this.audio.volume; }
    get gainValueStored() { return this.audio.gain; }
    get streamIndex() { return this.audio.streamIndex ?? undefined; }
    status;
    facts;
    contextTransition = Promise.resolve();
    eofController;
    lastCleanup;
    constructor(video, time, base, runtime, onFailure) {
        super();
        this.video = video;
        this.time = time;
        this.base = base;
        this.runtime = runtime;
        this.onFailure = onFailure;
        this.worker = runtimeWorker(new URL('web/private-mpv/audio-worker.js', base), { type: 'module' });
        this.worker.onmessage = ({ data: d }) => {
            if (d.type === 'refresh') {
                const refresh = this.source instanceof File ? undefined : this.source?.refreshAuthorization;
                void Promise.resolve().then(() => { if (!refresh)
                    throw Error('Authorization refresh unavailable'); return refresh(d.resource); }).then(update => { if (!this.stopped)
                    this.worker.postMessage({ op: 'refreshed', refreshId: d.refreshId, update }); }, error => { if (!this.stopped)
                    this.worker.postMessage({ op: 'refreshed', refreshId: d.refreshId, error: String(error) }); });
                return;
            }
            if (d.type === 'transportError') {
                this.fail(Error(d.error));
                return;
            }
            const settled = settleBackendRequest(this.requests, d.id, { kind: 'reply' });
            this.requests = settled.state;
            const p = this.pending.get(d.id);
            if (settled.effect.kind !== 'settle' || !p)
                return;
            this.pending.delete(d.id);
            clearTimeout(p.timer);
            d.error ? p.reject(Error(d.error)) : p.resolve(d.result);
        };
        this.worker.onerror = e => { e.preventDefault(); this.fail(Error(e.message || 'Private mpv worker failed')); };
        this.worker.onmessageerror = () => this.fail(Error('Private mpv message failure'));
        video.addEventListener('ended', this.onEnded);
    }
    get selectedStreamIndex() { return this.streamIndex; }
    get selectedTrackId() { return this.streamIndex === undefined ? undefined : String(this.streamIndex + 1); }
    setWatchdogs(policy) { this.audio = privateAudioSettings(this.audio, { watchAudio: policy.selectiveAudio }); }
    fail(error) {
        const failed = failBackendRequests(this.requests);
        this.requests = failed.state;
        if (!failed.notify)
            return;
        for (const id of failed.reject) {
            const pending = this.pending.get(id);
            if (pending) {
                clearTimeout(pending.timer);
                this.pending.delete(id);
                pending.reject(playerError(error));
            }
        }
        this.onFailure(playerError(error));
        void this.destroy();
    }
    rpc(op, data = {}, transfer = []) {
        const admission = admitBackendRequest(this.requests, op, performance.now());
        this.requests = admission.state;
        if (admission.effect.kind === 'reject')
            return Promise.reject(Error('Private mpv audio closed'));
        const { id, deadline } = admission.effect.request;
        return new Promise((resolve, reject) => {
            const pending = { resolve, reject };
            this.pending.set(id, pending);
            const expire = () => {
                const settled = settleBackendRequest(this.requests, id, { kind: 'deadline', now: performance.now() });
                this.requests = settled.state;
                if (settled.effect.kind === 'ignore') {
                    if (this.pending.get(id) === pending)
                        pending.timer = setTimeout(expire, Math.max(0, deadline - performance.now()));
                    return;
                }
                this.pending.delete(id);
                const error = Error('Private mpv audio deadline: ' + op);
                reject(error);
                if (settled.effect.fatal)
                    this.fail(error);
            };
            try {
                pending.timer = setTimeout(expire, Math.max(0, deadline - performance.now()));
                this.worker.postMessage({ id, op, ...data }, transfer);
            }
            catch (error) {
                const settled = settleBackendRequest(this.requests, id, { kind: 'transport-error' });
                this.requests = settled.state;
                if (settled.effect.kind === 'settle') {
                    clearTimeout(pending.timer);
                    this.pending.delete(id);
                    reject(playerError(error));
                }
            }
        });
    }
    latency() { const context = this.context; const stamp = context.getOutputTimestamp?.(); return Math.round(Math.max(0, stamp?.contextTime ? context.currentTime - stamp.contextTime : context.baseLatency + (context.outputLatency || 0)) * 1e6); }
    contextChanged = () => {
        const active = this.context.state === 'running', observation = observeAudioContext(this.audio, active, this.video.paused);
        this.audio = observation.state;
        if (observation.pauseVideo)
            this.video.pause();
        this.contextTransition = this.contextTransition.then(async () => {
            if (this.stopped)
                return;
            await this.rpc('context', { value: active });
            const completion = acknowledgeAudioContext(this.audio, observation.id);
            this.audio = completion.state;
            if (completion.playVideo && !this.stopped)
                await this.video.play();
        }).catch(e => this.fail(e));
    };
    assertControl(id) { if (this.stopped || !audioControlCurrent(this.audio, id))
        throw new PlayerError('ABORTED', 'Private mpv audio operation superseded'); }
    readiness(status, wait) {
        return privateAudioReady({ time: status.time, eof: !!status.eof, produced: status.header[0], consumed: status.header[1], epoch: status.epoch, ack: !!status.ack, nativeEpoch: status.header[3], ackEpoch: status.header[7], feedbackCount: status.feedbackCount, chains: status.chains }, wait);
    }
    async open(source, audioStream) {
        const selection = selectPrivateAudioStream(this.audio, audioStream);
        this.audio = selection.state;
        if (!selection.accepted)
            throw Error('Private mpv selected source stream is missing');
        this.source = source;
        const context = this.context = new AudioContext({ sampleRate: 48000 });
        if (context.sampleRate !== 48000)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Private mpv audio requires 48 kHz output');
        await context.audioWorklet.addModule(new URL('web/private-mpv/audio-worklet.js', this.base));
        if (this.stopped)
            throw Error('Private mpv audio closed');
        const node = this.node = new AudioWorkletNode(context, 'demuxe-private-pcm', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
        const gain = this.gain = context.createGain();
        gain.gain.value = this.volumeValue / 100 * this.gainValueStored;
        node.connect(gain).connect(context.destination);
        node.port.onmessage = ({ data }) => { if (data.type === 'error')
            this.fail(Error(data.error)); };
        const channel = new MessageChannel();
        node.port.postMessage({ type: 'connect', port: channel.port2 }, [channel.port2]);
        this.facts = await this.rpc('init', { backend: this.runtime, rate: context.sampleRate, contextRunning: context.state === 'running', latencyUs: this.latency(), port: channel.port1 }, [channel.port1]);
        context.addEventListener('statechange', this.contextChanged);
        const transport = source instanceof File ? { file: source } : (() => { const { refreshAuthorization, ...options } = source; return { options, canRefresh: !!refreshAuthorization }; })();
        if (await this.rpc('load', transport) !== 1)
            throw Error('Private mpv audio allocated a video chain');
        this.status = await this.rpc('status');
        this.timer = setInterval(() => { void this.observe(); }, 100);
    }
    async observe() {
        const admission = beginAudioPoll(this.audio, !this.stopped);
        this.audio = admission.state;
        if (!admission.accepted)
            return;
        try {
            this.status = await this.rpc('status');
            const activity = { active: !this.stopped, contextRunning: this.context?.state === 'running', videoPaused: this.video.paused, videoSeeking: this.video.seeking };
            if (!privateAudioObservesClock(this.audio, activity))
                return;
            const sample = observeAudioClock(this.audio, { ...activity, hidden: this.audio.watchAudio ? document.hidden : false, audioTime: this.status.time, videoTime: this.time(), videoRate: this.video.playbackRate });
            this.audio = sample.state;
            if (sample.failure)
                throw new PlayerError('PLAYBACK_STALLED', 'Private mpv audio presentation clock did not converge');
            if (sample.rate !== null)
                this.video.playbackRate = sample.rate;
            if (sample.latency)
                await this.rpc('latency', { value: this.latency() });
        }
        catch (e) {
            this.fail(e);
        }
        finally {
            this.audio = finishAudioPoll(this.audio);
        }
    }
    async waitFor(predicate, timeout = 5000, signal) {
        const deadline = privateAudioDeadline(performance.now(), timeout);
        while (privateAudioDeadlineOpen(deadline, performance.now())) {
            signal?.throwIfAborted();
            const s = this.status = await this.rpc('status');
            signal?.throwIfAborted();
            if (predicate(s))
                return s;
            await new Promise(r => setTimeout(r, 10));
        }
        throw Error('Private mpv PCM convergence timed out');
    }
    async play(startVideo) {
        const admission = beginAudioControl(this.audio, 'play');
        this.audio = admission.state;
        if (admission.id === null)
            return;
        const id = admission.id;
        this.assertControl(id);
        // Resume remains a direct call in the caller's activation stack.
        await this.context.resume();
        this.assertControl(id);
        await this.contextTransition;
        this.assertControl(id);
        await this.rpc('context', { value: true });
        this.assertControl(id);
        await this.rpc('pause', { value: false });
        this.assertControl(id);
        const target = this.time();
        await this.waitFor(status => this.readiness(status, { kind: 'play', target }));
        this.assertControl(id);
        try {
            await startVideo();
            this.assertControl(id);
            this.audio = finishAudioPlay(this.audio, id).state;
        }
        catch (error) {
            if (!this.stopped && audioControlCurrent(this.audio, id))
                await this.rpc('pause', { value: true });
            throw error;
        }
    }
    resetClock() { const reset = resetAudioClock(this.audio, this.video.playbackRate); this.audio = reset.state; if (reset.rate !== null)
        this.video.playbackRate = reset.rate; }
    async pauseControl(stopVideo, id) {
        await this.rpc('pause', { value: true });
        this.assertControl(id);
        stopVideo();
        this.assertControl(id);
        this.resetClock();
    }
    async pause(stopVideo) { const admission = beginAudioControl(this.audio, 'pause'); this.audio = admission.state; await this.pauseControl(stopVideo, admission.id); }
    async seek(seconds, seekVideo) {
        const admission = beginAudioControl(this.audio, 'seek');
        this.audio = admission.state;
        const id = admission.id;
        const controller = this.eofController;
        this.eofController = undefined;
        controller?.abort();
        this.assertControl(id);
        this.video.pause();
        this.assertControl(id);
        this.resetClock();
        this.assertControl(id);
        await this.rpc('pause', { value: true });
        this.assertControl(id);
        const before = await this.rpc('status');
        this.assertControl(id);
        const video = seekVideo();
        void video.catch(() => { });
        this.assertControl(id);
        await Promise.all([video, this.rpc('seek', { value: seconds })]);
        this.assertControl(id);
        await this.waitFor(status => this.readiness(status, { kind: 'epoch', previous: before.epoch }));
        this.assertControl(id);
        if (admission.wasRunning)
            await this.play(() => this.video.play());
    }
    async rate(value) {
        if (!Number.isFinite(value) || value < .5 || value > 2)
            throw Error('Playback rate must be 0.5 to 2');
        if (value === this.rateValue)
            return;
        const at = this.time(), admission = beginAudioControl(this.audio, 'pause');
        this.audio = admission.state;
        const id = admission.id;
        if (this.context) {
            await this.pauseControl(() => this.video.pause(), id);
            const before = await this.rpc('status');
            this.assertControl(id);
            await this.rpc('speed', { value });
            this.assertControl(id);
            await this.rpc('seek', { value: at });
            this.assertControl(id);
            await this.waitFor(status => this.readiness(status, { kind: 'epoch', previous: before.epoch }));
            this.assertControl(id);
        }
        this.audio = privateAudioSettings(this.audio, { rate: value });
        this.video.defaultPlaybackRate = value;
        this.assertControl(id);
        this.video.playbackRate = value;
        if (admission.wasRunning)
            await this.play(() => this.video.play());
    }
    async volume(value) { this.audio = privateAudioSettings(this.audio, { volume: value }); if (this.gain)
        this.gain.gain.value = value / 100 * this.gainValueStored; }
    async gainValue(value) { this.audio = privateAudioSettings(this.audio, { gain: value }); if (this.gain)
        this.gain.gain.value = this.volumeValue / 100 * value; }
    async setAudioOutputDevice(id) { const context = this.context; if (!context?.setSinkId)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Audio output selection unavailable'); await context.setSinkId(id); }
    async verifyOutput(signal) { await this.waitFor(status => this.readiness(status, { kind: 'verify' }), 10000, signal); }
    onEnded = () => {
        const admission = beginAudioEOF(this.audio, !this.stopped);
        this.audio = admission.state;
        if (admission.id === null)
            return;
        const id = admission.id;
        const controller = this.eofController = new AbortController();
        const current = () => { controller.signal.throwIfAborted(); if (this.stopped || !audioEOFCurrent(this.audio, id))
            throw new PlayerError('ABORTED', 'Private mpv EOF superseded'); };
        void (async () => {
            await this.waitFor(status => this.readiness(status, { kind: 'drain' }), 2500, controller.signal);
            current();
            await this.pause(() => { });
            current();
            await this.context.suspend();
        })().catch(error => { if (!controller.signal.aborted && audioEOFCurrent(this.audio, id))
            this.fail(error); }).finally(() => { this.audio = finishAudioEOF(this.audio, id); if (this.eofController === controller)
            this.eofController = undefined; });
    };
    get diagnostics() { const sorted = [...this.audio.errors].sort((a, b) => a - b); return { plan: 'native-video-mpv-audio', cleanup: this.lastCleanup, privateRuntime: this.status?.runtime ?? this.facts, clockRateWrites: this.audio.rateWrites, contextState: this.context?.state, requestedRate: this.rateValue, effectiveRate: this.video.playbackRate, estimatedAudioPresentationTime: this.status?.time, errorMs: this.status ? (this.status.time - this.time()) * 1000 : null, absErrorP95Ms: sorted[Math.floor((sorted.length - 1) * .95)] ?? null, maxAbsErrorMs: sorted.at(-1) ?? null, queuedFrames: this.status ? this.status.header[0] - this.status.header[1] : 0, nativeEpoch: this.status?.epoch, ackEpoch: this.status?.header[7], feedbackCount: this.status?.feedbackCount, mpvVideoTracks: this.status ? this.status.chains >> 1 : null, worker: this.status }; }
    destroy() {
        if (this.destroyPromise)
            return this.destroyPromise;
        this.requests = beginBackendClose(this.requests);
        let resolve, reject;
        this.destroyPromise = new Promise((yes, no) => { resolve = yes; reject = no; });
        this.audio = retirePrivateAudio(this.audio);
        const eof = this.eofController;
        this.eofController = undefined;
        eof?.abort();
        clearInterval(this.timer);
        this.video.removeEventListener('ended', this.onEnded);
        this.context?.removeEventListener('statechange', this.contextChanged);
        void (async () => {
            try {
                this.lastCleanup = await this.rpc('close');
            }
            catch (error) {
                this.lastCleanup = { error: String(error) };
            }
            finally {
                const closed = finishBackendClose(this.requests);
                this.requests = closed.state;
                for (const id of closed.reject) {
                    const pending = this.pending.get(id);
                    if (pending) {
                        clearTimeout(pending.timer);
                        this.pending.delete(id);
                        pending.reject(Error('Private mpv audio destroyed'));
                    }
                }
                this.worker.terminate();
                this.node?.disconnect();
                this.node?.port.close();
                this.gain?.disconnect();
                if (this.context?.state !== 'closed')
                    await this.context?.close();
            }
        })().then(resolve, reject);
        return this.destroyPromise;
    }
}
