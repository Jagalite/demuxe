// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { initialStartup, transitionStartup, STARTUP_BYTE_LIMIT } from './machine/startup.js';
export function startupEscalationPolicy(options) {
    if (options === false)
        return undefined;
    if (options !== undefined && (!options || typeof options !== 'object' || Array.isArray(options)))
        throw new PlayerError('INVALID_ARGUMENT', 'startupEscalation must be false or an options object');
    const prefetchAfterMs = options?.prefetchAfterMs ?? 400, switchAfterMs = options?.switchAfterMs ?? 500;
    if (!Number.isFinite(prefetchAfterMs) || !Number.isFinite(switchAfterMs) || prefetchAfterMs < 0 || switchAfterMs <= prefetchAfterMs || switchAfterMs >= 25000)
        throw new PlayerError('INVALID_ARGUMENT', 'startupEscalation requires 0 <= prefetchAfterMs < switchAfterMs < 25000');
    return Object.freeze({ prefetchAfterMs, switchAfterMs });
}
/** Immutable fallback code only. No media, worker, decoder or audio allocation. */
export class StartupModules {
    base;
    state = initialStartup();
    controller = new AbortController();
    binaries = new Map();
    pending = new Map();
    constructor(base) {
        this.base = base;
    }
    ready(path) { return this.pending.get(path); }
    async bytes(path) { await this.pending.get(path)?.catch(() => { }); return this.binaries.get(path)?.slice(0); }
    warm(path) {
        const admission = transitionStartup(this.state, { type: 'admit', path, now: performance.now() });
        this.state = admission.state;
        if (!admission.accepted)
            return Promise.reject(new PlayerError(this.state.stopped ? 'ABORTED' : 'ASSET_LOAD_FAILED', 'Startup prefetch is retired or at capacity'));
        const previous = this.pending.get(path);
        if (admission.existing && previous)
            return previous;
        const id = admission.id, work = Promise.resolve().then(() => this.load(path, id));
        this.pending.set(path, work);
        // Speculation must neither reject playback nor prevent an ordinary retry.
        void work.catch(() => { this.state = transitionStartup(this.state, { type: 'failed', id }).state; if (this.pending.get(path) === work)
            this.pending.delete(path); });
        return work;
    }
    async load(path, id) {
        const controller = new AbortController(), abort = () => controller.abort();
        this.controller.signal.addEventListener('abort', abort, { once: true });
        if (this.controller.signal.aborted)
            abort();
        let timer;
        const expired = () => { timer = undefined; try {
            const decision = transitionStartup(this.state, { type: 'deadline', id, now: performance.now() });
            this.state = decision.state;
            if (decision.remaining !== undefined)
                timer = setTimeout(expired, decision.remaining);
            else
                abort();
        }
        catch {
            this.state = transitionStartup(this.state, { type: 'cancel', id }).state;
            abort();
        } };
        const limit = STARTUP_BYTE_LIMIT;
        try {
            expired();
            controller.signal.throwIfAborted();
            const response = await fetch(new URL(path, this.base), { signal: controller.signal, priority: 'low' });
            if (controller.signal.aborted) {
                await response.body?.cancel();
                controller.signal.throwIfAborted();
            }
            if (!response.ok) {
                const failure = new PlayerError('ASSET_LOAD_FAILED', `Startup prefetch HTTP ${response.status}: ${path}`);
                try {
                    await response.body?.cancel();
                }
                catch { /* Preserve the HTTP failure after physical cancellation settles. */ }
                throw failure;
            }
            if (Number(response.headers.get('content-length')) > limit) {
                await response.body?.cancel();
                throw Error('Startup prefetch exceeds byte budget');
            }
            const reader = response.body?.getReader();
            if (!reader)
                throw Error('Startup prefetch has no body');
            const chunks = [];
            let bytes = 0;
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done)
                        break;
                    const decision = transitionStartup(this.state, { type: 'chunk', id, bytes: value.byteLength });
                    this.state = decision.state;
                    bytes += value.byteLength;
                    if (!decision.accepted)
                        throw Error('Startup prefetch exceeds byte budget');
                    chunks.push(value);
                }
            }
            catch (error) {
                try {
                    await reader.cancel();
                }
                catch { /* Preserve the original read failure after cancellation settles. */ }
                throw error;
            }
            finally {
                reader.releaseLock();
            }
            const data = new Uint8Array(bytes);
            let offset = 0;
            for (const chunk of chunks) {
                data.set(chunk, offset);
                offset += chunk.byteLength;
            }
            controller.signal.throwIfAborted();
            const module = await WebAssembly.compile(data);
            controller.signal.throwIfAborted();
            const decision = transitionStartup(this.state, { type: 'complete', id });
            this.state = decision.state;
            if (!decision.accepted)
                throw new PlayerError('ABORTED', 'Startup prefetch was retired');
            this.binaries.set(path, data.buffer);
            return module;
        }
        finally {
            clearTimeout(timer);
            this.controller.signal.removeEventListener('abort', abort);
        }
    }
    destroy() { this.state = transitionStartup(this.state, { type: 'destroy' }).state; this.controller.abort(); for (const path of this.pending.keys())
        if (!this.state.entries.some(entry => entry.path === path))
            this.pending.delete(path); this.binaries.clear(); }
}
