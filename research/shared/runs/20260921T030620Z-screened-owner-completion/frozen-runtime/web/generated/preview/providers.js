// SPDX-License-Identifier: GPL-3.0-or-later
/** Host-authored storyboards can return encoded tiles or references without a decoder. */
export class AuthoredPreviewProvider {
    lookup;
    id = 'authored';
    priority = 10;
    constructor(lookup) {
        this.lookup = lookup;
    }
    canHandle() { return true; }
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
        const video = this.document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        const url = URL.createObjectURL(source);
        const wait = (event, action) => new Promise((resolve, reject) => {
            const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('Preview media decode failed')); }, abort = () => { cleanup(); reject(new DOMException('Preview cancelled', 'AbortError')); };
            const cleanup = () => { video.removeEventListener(event, done); video.removeEventListener('error', fail); request.signal.removeEventListener('abort', abort); };
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
            const time = Math.min(request.time, Math.max(0, video.duration - .001));
            if (time !== video.currentTime)
                await wait('seeked', () => { video.currentTime = time; });
            else if (video.readyState < 2)
                await wait('loadeddata', () => { video.preload = 'auto'; });
            request.signal.throwIfAborted();
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
            return blob ? { time: video.currentTime, width, height, image: { blob }, path: this.id, timestampKind: 'media-time' } : null;
        }
        finally {
            video.pause();
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(url);
        }
    }
}
