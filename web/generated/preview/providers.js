// SPDX-License-Identifier: Apache-2.0
import { beginWait, observeWait } from '../internal/machine/async-policy.js';
import { previewMediaPlan } from '../internal/machine/preview.js';
/** Host-authored storyboards can return encoded tiles or references without a decoder. */
export class AuthoredPreviewProvider {
    lookup;
    sourceId;
    id = 'authored';
    priority = 10;
    constructor(lookup, sourceId) {
        this.lookup = lookup;
        this.sourceId = sourceId;
    }
    canHandle(request) { return this.sourceId === undefined || request.sourceId === this.sourceId; }
    getFrame(request) { return this.lookup(request); }
}
/** Uses a separate muted media element and the browser's existing demux/decoder.
 * Local Blob inputs only: no uncontrolled second remote buffering stack. */
export class LocalVideoPreviewProvider {
    source;
    document;
    maxDecodePixels;
    id = 'local-browser';
    priority = 40;
    requiresDecoder = true;
    allowDuringPlayback = true;
    constructor(source, document, maxDecodePixels = 8294400) {
        this.source = source;
        this.document = document;
        this.maxDecodePixels = maxDecodePixels;
    }
    canHandle() { return !!this.source(); }
    async getFrame(request) {
        const source = this.source();
        if (!source)
            return null;
        const start = performance.now();
        let mediaReadyMs = 0, seekMs = 0;
        const actualTime = null;
        const video = this.document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        const url = URL.createObjectURL(source);
        let released;
        request.trackCleanup?.(new Promise(resolve => { released = resolve; }));
        const wait = (event, action) => new Promise((resolve, reject) => {
            let state = beginWait(1, performance.now(), 'preview-media');
            let timer;
            const cleanup = () => {
                const errors = [];
                for (const release of [() => clearTimeout(timer), () => video.removeEventListener(event, done), () => video.removeEventListener('error', fail), () => request.signal.removeEventListener('abort', abort)]) {
                    try {
                        release();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                return errors;
            };
            const settle = (kind) => {
                const next = observeWait(state, { id: 1, kind, now: performance.now() });
                if (next === state)
                    return;
                state = next;
                const errors = cleanup();
                if (state.phase === 'ready') {
                    if (errors.length)
                        reject(errors[0]);
                    else
                        resolve();
                }
                else
                    reject(state.phase === 'retired' ? new DOMException('Preview cancelled', 'AbortError') : new Error('Preview media decode failed'));
            };
            const done = () => settle('ready'), fail = () => settle('failed'), abort = () => settle('retire');
            const expire = () => { settle('deadline'); if (state.phase === 'waiting')
                timer = setTimeout(expire, Math.max(0, state.deadline - performance.now())); };
            try {
                timer = setTimeout(expire, Math.max(0, state.deadline - performance.now()));
                video.addEventListener(event, done, { once: true });
                video.addEventListener('error', fail, { once: true });
                request.signal.addEventListener('abort', abort, { once: true });
                if (request.signal.aborted) {
                    abort();
                    return;
                }
                action();
            }
            catch (error) {
                if (state.phase === 'waiting') {
                    state = observeWait(state, { id: 1, kind: 'failed', now: performance.now() });
                    cleanup();
                    reject(error);
                }
            }
        });
        try {
            await wait('loadedmetadata', () => { video.src = url; });
            const plan = previewMediaPlan({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, position: video.currentTime, readyState: video.readyState }, request.time, this.maxDecodePixels);
            if (!plan)
                return null;
            mediaReadyMs = performance.now() - start;
            const seekStart = performance.now();
            if (plan.event === 'seeked')
                await wait(plan.event, () => { video.currentTime = plan.target; });
            else if (plan.event === 'loadeddata')
                await wait(plan.event, () => { video.preload = 'auto'; });
            seekMs = performance.now() - seekStart;
            request.signal.throwIfAborted();
            const conversionStart = performance.now();
            const scale = Math.min(request.width / video.videoWidth, (request.height ?? 2048) / video.videoHeight, 1);
            const width = Math.max(1, Math.round(video.videoWidth * scale)), height = Math.max(1, Math.round(video.videoHeight * scale));
            const canvas = this.document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context)
                return null;
            context.drawImage(video, 0, 0, width, height);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
            request.signal.throwIfAborted();
            return blob ? { time: video.currentTime, width, height, image: { blob }, path: this.id, actualTime, temporalAccuracy: 'approximate', fidelity: 'full', timestampKind: 'media-time', metrics: { mediaReadyMs, seekMs, resizeConversionMs: performance.now() - conversionStart, bytesFetched: 0, decodedFrames: null } } : null;
        }
        finally {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
                URL.revokeObjectURL(url);
            }
            finally {
                released?.();
            }
        }
    }
}
/** Reuse the accepted packet-copy route for a local container the browser cannot
 * open directly. This is an independent, muted session, never the main player. */
export class LocalRemuxPreviewProvider {
    source;
    document;
    create;
    maxDecodePixels;
    id = 'local-remux';
    priority = 35;
    requiresDecoder = true;
    allowDuringPlayback = true;
    constructor(source, document, create, maxDecodePixels = 8294400) {
        this.source = source;
        this.document = document;
        this.create = create;
        this.maxDecodePixels = maxDecodePixels;
    }
    canHandle() { return !!this.source(); }
    async getFrame(request) {
        const source = this.source();
        if (!source)
            return null;
        request.signal.throwIfAborted();
        const start = performance.now(), video = this.document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        const player = this.create(video);
        let cleanup, release;
        request.trackCleanup?.(new Promise(resolve => { release = resolve; }));
        const dispose = () => cleanup ?? (cleanup = player.destroy().catch(() => { }).finally(() => release?.()));
        const abort = () => { void dispose(); };
        request.signal.addEventListener('abort', abort, { once: true });
        try {
            request.signal.throwIfAborted();
            await player.open(source instanceof File ? source : new File([source], 'preview-media'));
            request.signal.throwIfAborted();
            const plan = previewMediaPlan({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, position: video.currentTime, readyState: video.readyState }, request.time, this.maxDecodePixels);
            if (!plan)
                return null;
            const mediaReadyMs = performance.now() - start, seekStart = performance.now();
            await player.seek(plan.target);
            await player.verifyStartup({ video: true, audio: false });
            request.signal.throwIfAborted();
            const seekMs = performance.now() - seekStart, conversionStart = performance.now();
            const scale = Math.min(request.width / video.videoWidth, (request.height ?? 2048) / video.videoHeight, 1);
            const width = Math.max(1, Math.round(video.videoWidth * scale)), height = Math.max(1, Math.round(video.videoHeight * scale));
            const canvas = this.document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context)
                return null;
            context.drawImage(video, 0, 0, width, height);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
            request.signal.throwIfAborted();
            return blob ? { time: Number(player.properties.get('time-pos')) || 0, width, height, image: { blob }, path: this.id, actualTime: null, temporalAccuracy: 'approximate', fidelity: 'full', timestampKind: 'media-time', metrics: { mediaReadyMs, seekMs, resizeConversionMs: performance.now() - conversionStart, bytesFetched: 0, decodedFrames: null } } : null;
        }
        finally {
            request.signal.removeEventListener('abort', abort);
            await dispose();
        }
    }
}
