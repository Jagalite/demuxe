// SPDX-License-Identifier: Apache-2.0
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
            const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('Preview media decode failed')); }, abort = () => { cleanup(); reject(new DOMException('Preview cancelled', 'AbortError')); };
            const timer = setTimeout(fail, 1500);
            const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', fail); request.signal.removeEventListener('abort', abort); };
            video.addEventListener(event, done, { once: true });
            video.addEventListener('error', fail, { once: true });
            request.signal.addEventListener('abort', abort, { once: true });
            if (request.signal.aborted) {
                abort();
                return;
            }
            try {
                action();
            }
            catch (error) {
                cleanup();
                reject(error);
            }
        });
        try {
            await wait('loadedmetadata', () => { video.src = url; });
            if (!video.videoWidth || !video.videoHeight || video.videoWidth * video.videoHeight > this.maxDecodePixels || !Number.isFinite(video.duration) || video.duration <= 0)
                return null;
            mediaReadyMs = performance.now() - start;
            const seekStart = performance.now();
            const time = Math.min(request.time, Math.max(0, video.duration - .001));
            if (time !== video.currentTime)
                await wait('seeked', () => { video.currentTime = time; });
            else if (video.readyState < 2)
                await wait('loadeddata', () => { video.preload = 'auto'; });
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
