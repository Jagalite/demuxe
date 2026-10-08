// SPDX-License-Identifier: Apache-2.0
/** One reusable child, serialized with its predecessor's teardown. Cache entries
 * belong to the controller; an idle decoder is released after five seconds. */
export class SessionPreviewProvider {
    binding;
    document;
    concurrent;
    maxDecodePixels;
    id = 'selected-engine';
    priority = 30;
    requiresDecoder = true;
    owner;
    cleanup = Promise.resolve();
    idle;
    constructor(binding, document, concurrent, maxDecodePixels = 8294400) {
        this.binding = binding;
        this.document = document;
        this.concurrent = concurrent;
        this.maxDecodePixels = maxDecodePixels;
    }
    get allowDuringPlayback() { return this.concurrent(); }
    canHandle() { return !!this.binding()?.backend.createPreviewSession; }
    release() {
        clearTimeout(this.idle);
        this.idle = undefined;
        const owner = this.owner;
        this.owner = undefined;
        if (owner)
            this.cleanup = Promise.allSettled([this.cleanup, owner.session.destroy()]).then(() => { });
        return this.cleanup;
    }
    async getFrame(request) {
        clearTimeout(this.idle);
        request.signal.throwIfAborted();
        const binding = this.binding();
        if (!binding?.backend.createPreviewSession)
            return null;
        if (this.owner && (this.owner.binding.backend !== binding.backend || this.owner.binding.key !== binding.key))
            await this.release();
        await this.cleanup;
        request.signal.throwIfAborted();
        const start = performance.now(), cold = !this.owner;
        if (!this.owner) {
            const session = binding.backend.createPreviewSession({ document: this.document, maxDecodePixels: this.maxDecodePixels });
            if (!session)
                return null;
            this.owner = { binding, session, opened: Promise.resolve().then(() => session.open(binding.source, request.signal)) };
        }
        const owner = this.owner;
        void owner.opened.catch(() => { });
        const abort = () => { if (this.owner === owner) {
            const cleanup = this.release();
            request.trackCleanup?.(cleanup);
        } };
        request.signal.addEventListener('abort', abort, { once: true });
        try {
            request.signal.throwIfAborted();
            await owner.opened;
            request.signal.throwIfAborted();
            const decoderInitializationMs = cold ? performance.now() - start : 0;
            const frame = await owner.session.frame(request);
            request.signal.throwIfAborted();
            if (this.owner !== owner)
                return null;
            this.idle = setTimeout(() => { void this.release(); }, 5000);
            return frame ? { ...frame, metrics: { ...frame.metrics, decoderInitializationMs } } : null;
        }
        catch (error) {
            if (this.owner === owner)
                await this.release();
            throw error;
        }
        finally {
            request.signal.removeEventListener('abort', abort);
        }
    }
}
