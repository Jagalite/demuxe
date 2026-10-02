// SPDX-License-Identifier: Apache-2.0
import { PreviewPregenerator } from './pregeneration.js';
import { resolvePreviewStrategy } from './strategies.js';
import { createPreviewControl, transitionPreviewControl, previewJob, previewGenerationAdmission, previewProviderDeferred, previewCanPrefetch, admitPreviewRequest, planPreviewRequest, createPreviewJob, startPreviewJob, lookupPreviewCache, rememberPreviewCache, unloadPreviewCache } from '../internal/machine/preview.js';
class PreviewDeferred extends Error {
}
const aborted = () => new DOMException('Preview superseded or cancelled', 'AbortError');
const now = () => performance.now();
const emptyMetrics = () => ({ providerSelectionMs: 0, cacheLookupMs: 0, totalMs: 0, indexLookupMs: null, byteAcquisitionMs: null, decoderInitializationMs: null, frameDecodeMs: null, resizeConversionMs: null, decodedFrames: null, bytesRead: null, bytesFetched: null });
/** Owns provider resources, timers and caller callbacks. The immutable preview
 * authority contains only data and cannot issue playback or source effects. */
export class PreviewController {
    providers = [];
    cleanups = new Set();
    destruction;
    pregenerator;
    images = new Map();
    jobs = new Map();
    callers = new Map();
    state;
    constructor(providers = [], options = {}) {
        const { pregenerate, strategy, ...settings } = options;
        if (pregenerate !== undefined && strategy !== undefined)
            throw new TypeError('Choose preview strategy or pregenerate, not both');
        this.state = createPreviewControl(settings);
        this.setProviders(providers);
        if (strategy !== undefined)
            this.setStrategy(strategy);
        else if (pregenerate !== undefined) {
            this.pregenerator = this.generator(pregenerate);
            this.pregenerator.setEnabled(this.state.allowed);
        }
        else
            this.dispatch({ kind: 'strategy', value: { type: 'on-demand' } });
    }
    dispatch(event) { this.state = transitionPreviewControl(this.state, event); }
    get active() { return this.state.active ? this.jobs.get(this.state.active.id) : undefined; }
    get pending() { return this.state.pending ? this.jobs.get(this.state.pending.id) : undefined; }
    get caller() { return this.state.caller ? this.callers.get(this.state.caller.id) : undefined; }
    get options() { return this.state.options; }
    get sourceId() { return this.state.sourceId; }
    metadata(job) { return previewJob(this.state, job.id); }
    generator(config) {
        return new PreviewPregenerator(config, this.options.bucketSeconds, async (request) => {
            const admission = previewGenerationAdmission(this.state, now());
            if (admission !== 'run')
                return admission;
            try {
                await this.requestWork(request, true);
                return 'next';
            }
            catch (error) {
                return error instanceof PreviewDeferred || this.state.suspended || now() - this.state.lastForeground < 500 ? 'wait' : 'next';
            }
        });
    }
    get strategy() { return this.state.strategy; }
    /** Switch scheduling without changing playback or discarding useful cached images. */
    setStrategy(value) {
        if (this.state.disposed)
            throw aborted();
        const resolved = resolvePreviewStrategy(value), next = resolved.generation ? this.generator(resolved.generation) : undefined;
        this.pregenerator?.stop();
        for (const job of [this.active, this.pending])
            if (job && this.metadata(job)?.background) {
                if (this.caller?.job === job)
                    this.settle(aborted());
                this.cancelJob(job);
            }
        this.dispatch({ kind: 'strategy', value: resolved.strategy });
        this.pregenerator = next;
        next?.setEnabled(this.state.allowed);
        next?.setFocus(this.state.playbackPosition);
        next?.setDuration(this.state.duration);
    }
    get enabled() { return this.state.allowed; }
    set enabled(value) { this.dispatch({ kind: 'enabled', value }); this.pregenerator?.setEnabled(value); if (!value)
        this.clear(); }
    get diagnostics() { return { ...this.state.counters, sourceId: this.sourceId, cacheBytes: this.state.bytes, cacheEntries: this.state.cache.length, active: !!this.state.active, pending: !!this.state.pending, lastFailure: this.state.lastFailure ? { ...this.state.lastFailure } : undefined }; }
    setSourceIdentity(id) { this.clear(); this.dispatch({ kind: 'source', sourceId: id }); this.setDuration(null); }
    /** Finite VOD duration admits configured source-scoped background generation. */
    setDuration(duration) { this.dispatch({ kind: 'duration', duration }); this.pregenerator?.setDuration(this.state.duration); }
    setPlaybackPosition(time) { if (!Number.isFinite(time) || time < 0)
        return; this.dispatch({ kind: 'position', time }); if (now() >= this.state.hoverUntil)
        this.pregenerator?.setFocus(time); }
    setProviders(providers) { this.clear(); this.dispatch({ kind: 'providers' }); this.providers = [...providers].sort((a, b) => a.priority - b.priority); }
    addProvider(provider) { this.setProviders([...this.providers, provider]); let removed = false; return () => { if (!removed) {
        removed = true;
        this.setProviders(this.providers.filter(p => p !== provider));
    } }; }
    cancelJob(job) {
        const active = this.state.active?.id === job.id;
        this.dispatch({ kind: 'cancel-job', id: job.id });
        clearTimeout(job.timer);
        if (!active)
            this.jobs.delete(job.id);
        job.controller.abort();
    }
    settle(error, frame = null) {
        const caller = this.caller, id = this.state.caller?.id;
        if (!caller || id === undefined)
            return;
        this.dispatch({ kind: 'settle', failed: !!error });
        this.callers.delete(id);
        caller.cleanup();
        if (error)
            caller.reject(error);
        else
            caller.resolve(frame);
    }
    cancelWork() {
        this.dispatch({ kind: 'retire-work' });
        try {
            this.settle(aborted());
            if (this.active)
                this.cancelJob(this.active);
            if (this.pending)
                this.cancelJob(this.pending);
        }
        finally {
            this.dispatch({ kind: 'retired-work' });
        }
    }
    /** Playback pressure cancels generation, but resident thumbnails remain usable. */
    setSuspended(value) { this.dispatch({ kind: 'suspended', value }); if (value)
        this.cancelWork(); }
    /** Suppress expensive decoder providers while allowing independent native previews. */
    setPlaybackActive(value) {
        this.dispatch({ kind: 'playback', value });
        if (value && this.state.active?.requiresDecoder) {
            const job = this.active;
            if (this.caller?.job === job)
                this.settle(this.state.active.background ? new PreviewDeferred() : aborted());
            this.cancelJob(job);
        }
    }
    trackCleanup(completion) {
        const settled = completion.catch(() => { });
        this.cleanups.add(settled);
        void settled.then(() => this.cleanups.delete(settled));
    }
    /** Await registered resource teardown, not arbitrary provider result promises. */
    async drain() { await Promise.all([...this.cleanups]); }
    /** Current cache budgets; changing these never starts decoder work. */
    get cacheLimits() { return Object.freeze({ maxEntries: this.options.maxEntries, maxCacheBytes: this.options.maxCacheBytes }); }
    setCacheLimits(limits) {
        if (this.state.disposed)
            throw aborted();
        const maxEntries = limits.maxEntries ?? this.options.maxEntries, maxCacheBytes = limits.maxCacheBytes ?? this.options.maxCacheBytes;
        const wasDisabled = !this.options.maxEntries || !this.options.maxCacheBytes;
        this.dispatch({ kind: 'limits', maxEntries, maxCacheBytes });
        this.releaseEvictedImages();
        if (wasDisabled && maxEntries && maxCacheBytes)
            this.pregenerator?.reset();
    }
    /** Remove a half-open range of requested buckets, across sizes and exactness. */
    unload(range) {
        if (this.state.disposed)
            throw aborted();
        const next = unloadPreviewCache(this.state, range.start, range.end);
        this.state = next.state;
        this.releaseEvictedImages();
        for (const id of next.jobs) {
            const job = this.jobs.get(id);
            if (job) {
                if (this.caller?.job === job)
                    this.settle(aborted());
                this.cancelJob(job);
            }
        }
        return next.removed;
    }
    releaseEvictedImages() { const retained = new Set(this.state.cache.map(entry => entry.key)); for (const key of this.images.keys())
        if (!retained.has(key))
            this.images.delete(key); }
    clear() { this.cancelWork(); this.dispatch({ kind: 'clear-cache' }); this.images.clear(); this.pregenerator?.reset(); }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.dispatch({ kind: 'dispose' });
        this.clear();
        this.pregenerator?.stop();
        this.providers = [];
        return this.destruction = this.drain();
    }
    /** Explicit optional prefetch. Busy lanes decline; a hover always supersedes it. */
    async prefetch(request) { if (!previewCanPrefetch(this.state))
        return; try {
        await this.requestWork(request, true);
    }
    catch { } }
    getFrame(request) { return this.request(request); }
    /** Optional refinement delivery; getFrame remains a single-final-result API. */
    request(request) {
        if (!request.cacheOnly)
            this.dispatch({ kind: 'foreground', at: now() });
        if (!request.signal?.aborted && Number.isFinite(request.time) && request.time >= 0) {
            this.dispatch({ kind: 'hover', at: now() });
            this.pregenerator?.setFocus(request.time);
        }
        return this.requestWork(request);
    }
    requestWork(request, background = false) {
        const data = { time: request.time, width: request.width, height: request.height, exact: request.exact, maxDistance: request.maxDistance, cacheOnly: request.cacheOnly };
        const admission = admitPreviewRequest(this.state, data, !!request.signal?.aborted);
        if (admission.kind === 'aborted')
            return Promise.reject(aborted());
        if (admission.kind === 'disabled')
            return Promise.resolve(null);
        if (admission.kind === 'invalid')
            return Promise.reject(new RangeError(admission.message));
        const start = now(), { time, width, height, key } = admission;
        this.dispatch({ kind: 'request-count', cacheOnly: !!request.cacheOnly });
        const requestEpoch = this.state.requestEpoch;
        if (!request.cacheOnly)
            this.settle(aborted());
        const plan = planPreviewRequest(this.state, key, !!request.cacheOnly, background);
        this.state = plan.state;
        let job = plan.jobId === null ? undefined : this.jobs.get(plan.jobId);
        for (const id of plan.cancel) {
            const previous = this.jobs.get(id);
            if (previous)
                this.cancelJob(previous);
        }
        // A provider's abort handler may synchronously request a newer frame or
        // retire this source. Do not replace its caller or orphan its pending job.
        if (this.state.requestEpoch !== requestEpoch || this.state.disposed)
            return Promise.reject(aborted());
        const lookup = now(), cached = lookupPreviewCache(this.state, data, admission, background);
        this.state = cached.state;
        const cacheMs = now() - lookup;
        if (cached.key !== null) {
            const frame = this.frame(this.images.get(cached.key), request, JSON.parse(cached.key)[2], 'hit', start, cacheMs, 0);
            this.notify(request.onUpdate, frame);
            return Promise.resolve(frame);
        }
        if (request.cacheOnly || this.state.suspended)
            return Promise.resolve(null);
        if (!job) {
            this.state = createPreviewJob(this.state, admission, background);
            const id = this.state.pending.id, controller = new AbortController();
            job = { id, controller, timer: undefined, context: { time, width, height, signal: controller.signal, exact: !!request.exact, sourceId: this.sourceId, publish: result => this.publish(job, result), trackCleanup: completion => this.trackCleanup(completion) } };
            this.jobs.set(id, job);
            job.timer = setTimeout(() => { this.dispatch({ kind: 'ready', id }); this.pump(); }, this.options.debounceMs);
        }
        const selected = job;
        return new Promise((resolve, reject) => {
            let callerId;
            const cancel = () => { if (this.state.caller?.id === callerId && this.caller?.job === selected) {
                this.settle(aborted());
                this.cancelJob(selected);
            } };
            const timeout = setTimeout(cancel, this.options.timeoutMs);
            const cleanup = () => { clearTimeout(timeout); request.signal?.removeEventListener('abort', cancel); };
            this.dispatch({ kind: 'caller', jobId: selected.id });
            callerId = this.state.caller.id;
            this.callers.set(callerId, { job: selected, request, start, cacheMs, onUpdate: request.onUpdate, resolve, reject, cleanup });
            request.signal?.addEventListener('abort', cancel, { once: true });
        });
    }
    pump() {
        const previous = this.state;
        this.state = startPreviewJob(this.state);
        if (this.state === previous)
            return;
        const job = this.active;
        void this.run(job).finally(() => { this.dispatch({ kind: 'finish-job', id: job.id }); this.jobs.delete(job.id); this.pump(); });
    }
    async run(job) {
        let deferred = false;
        try {
            const scheduler = globalThis.scheduler;
            if (scheduler)
                await scheduler.postTask(() => { }, { priority: 'background', signal: job.controller.signal });
            for (const provider of this.providers) {
                job.context.signal.throwIfAborted();
                if (previewProviderDeferred(this.state, provider.requiresDecoder, provider.allowDuringPlayback)) {
                    deferred = true;
                    continue;
                }
                this.dispatch({ kind: 'provider', id: job.id, requiresDecoder: provider.requiresDecoder && !provider.allowDuringPlayback });
                try {
                    const start = now();
                    let supported;
                    try {
                        supported = await provider.canHandle(job.context);
                    }
                    finally {
                        this.dispatch({ kind: 'selection', id: job.id, milliseconds: now() - start });
                    }
                    job.context.signal.throwIfAborted();
                    if (!supported)
                        continue;
                    if (previewProviderDeferred(this.state, provider.requiresDecoder, provider.allowDuringPlayback)) {
                        deferred = true;
                        continue;
                    }
                    const raw = await provider.getFrame(job.context);
                    job.context.signal.throwIfAborted();
                    const result = this.validate(raw);
                    job.context.signal.throwIfAborted();
                    if (!result || (job.context.exact && (result.temporalAccuracy !== 'exact' || result.actualTime !== job.context.time)))
                        continue;
                    this.remember(this.metadata(job).key, result, this.metadata(job).background);
                    if (this.caller?.job === job) {
                        const c = this.caller, frame = this.frame(result, c.request, job.context.time, 'miss', c.start, c.cacheMs, this.metadata(job).selectionMs);
                        this.notify(c.onUpdate, frame);
                        if (this.caller === c)
                            this.settle(undefined, frame);
                    }
                    return;
                }
                catch (error) {
                    job.context.signal.throwIfAborted();
                    this.dispatch({ kind: 'failure', provider: provider.id, errorKind: error instanceof Error ? error.name : 'Error' });
                }
            }
            if (this.caller?.job === job)
                this.settle(this.metadata(job).background && deferred ? new PreviewDeferred() : undefined);
        }
        catch {
            if (this.caller?.job === job)
                this.settle(aborted());
        }
    }
    validate(result) {
        try {
            if (!result || !Number.isFinite(result.time) || result.time < 0 || typeof result.path !== 'string' || result.path.length > 256 || !Number.isInteger(result.width) || result.width < 1 || result.width > 2048 || !Number.isInteger(result.height) || result.height < 1 || result.height > 2048)
                return null;
            if (result.actualTime != null && (!Number.isFinite(result.actualTime) || result.actualTime < 0))
                return null;
            let image;
            if ('blob' in result.image) {
                if (!(result.image.blob instanceof Blob) || result.image.blob.size > 4 * 1024 * 1024)
                    return null;
                image = Object.freeze({ blob: result.image.blob });
            }
            else {
                const { uris, crop, startByte, endByte } = result.image;
                if (!Array.isArray(uris) || !uris.length || uris.length > 16 || uris.some(uri => typeof uri !== 'string' || uri.length > 16384))
                    return null;
                const { x, y, width, height } = crop;
                if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 16384 || y + height > 16384)
                    return null;
                if ([startByte, endByte].some(n => n !== undefined && (!Number.isSafeInteger(n) || n < 0)) || (endByte !== undefined && endByte < (startByte ?? 0)))
                    return null;
                image = Object.freeze({ uris: Object.freeze([...uris]), crop: Object.freeze({ x, y, width, height }), startByte, endByte });
            }
            const metrics = {};
            for (const key of [...Object.keys(emptyMetrics()), 'mediaReadyMs', 'seekMs']) {
                const value = result.metrics?.[key];
                if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
                    metrics[key] = value;
            }
            return Object.freeze({ time: result.time, actualTime: result.actualTime, width: result.width, height: result.height, path: result.path, image,
                timestampKind: ['exact', 'interval', 'media-time'].includes(result.timestampKind ?? '') ? result.timestampKind : undefined,
                temporalAccuracy: result.temporalAccuracy === 'exact' ? 'exact' : 'approximate', fidelity: result.fidelity === 'reduced' ? 'reduced' : 'full', metrics: Object.freeze(metrics) });
        }
        catch {
            return null;
        }
    }
    publish(job, raw) {
        if (job.controller.signal.aborted || this.caller?.job !== job)
            return;
        const result = this.validate(raw);
        if (!result || job.controller.signal.aborted || this.caller?.job !== job)
            return;
        const c = this.caller;
        this.notify(c.onUpdate, this.frame(result, c.request, job.context.time, 'miss', c.start, c.cacheMs, this.metadata(job).selectionMs));
    }
    notify(callback, frame) { try {
        callback?.(frame);
    }
    catch { /* UI callbacks cannot fail a provider or playback. */ } }
    frame(result, request, time, cache, start, cacheMs, selectionMs) {
        const actualTime = result.actualTime ?? (result.timestampKind === 'exact' || result.timestampKind === 'interval' ? result.time : null);
        return { ...result, sourceId: this.sourceId, actualTime, temporalAccuracy: actualTime === request.time && result.temporalAccuracy === 'exact' ? 'exact' : 'approximate', fidelity: result.fidelity ?? 'full', requestedTime: request.time, bucketTime: time, cache,
            metrics: { ...emptyMetrics(), ...(cache === 'miss' ? result.metrics : {}), providerSelectionMs: selectionMs, cacheLookupMs: cacheMs, totalMs: now() - start } };
    }
    remember(key, result, background = false) {
        const bytes = result.width * result.height * 4 + result.path.length * 2 + key.length * 2 + 256 + ('blob' in result.image ? result.image.blob.size : JSON.stringify(result.image).length * 2);
        this.state = rememberPreviewCache(this.state, { key, time: result.time, bytes, background });
        if (this.state.cache.some(entry => entry.key === key))
            this.images.set(key, result);
        this.releaseEvictedImages();
    }
}
