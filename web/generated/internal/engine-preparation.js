// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { createPreparation, admitPreparation, preparationEngine, stepPreparation, completePreparation, retirePreparation, preparationProgress, preparationAsset } from './machine/engine-preparation.js';
export function preparationComponents(value) {
    if (value === 'all')
        return ['inspector', 'hybrid', 'software'];
    if (!Array.isArray(value) || value.some(name => !['inspector', 'hybrid', 'software'].includes(name)))
        throw new PlayerError('INVALID_ARGUMENT', 'prepare must be all or a list of inspector, hybrid, software');
    return [...new Set(value)];
}
/** Per-player, bounded immutable assets. No media, workers or audio devices. */
export class EnginePreparation {
    base;
    software;
    changed;
    remuxRuntime;
    providerAssets;
    controller = new AbortController();
    state = createPreparation();
    pending = new Map();
    modules = new Map();
    font;
    constructor(base, software = 'engine-software-full', changed = () => { }, remuxRuntime = 'pthread', providerAssets) {
        this.base = base;
        this.software = software;
        this.changed = changed;
        this.remuxRuntime = remuxRuntime;
        this.providerAssets = providerAssets;
    }
    environment() {
        return { software: this.software, runtime: this.remuxRuntime, isolated: !!globalThis.crossOriginIsolated, providerAssets: !!this.providerAssets,
            privatePlayback: this.remuxRuntime !== 'pthread' && this.providerAssets?.has?.(`web/engine-mpv-playback-${this.remuxRuntime}/player.wasm`) === true };
    }
    get progress() { return preparationProgress(this.state); }
    phase(name, phase) {
        const step = stepPreparation(this.state, name, { kind: 'phase', phase });
        this.state = step.state;
        if (step.effect === 'notify')
            this.changed();
    }
    module(name) { return this.modules.get(name); }
    fontCopy() { return this.font?.slice(0); }
    async readyModule(name) {
        await this.pending.get(name === 'engine-remux' ? 'inspector' : name === 'engine-hybrid' ? 'hybrid' : 'software');
        return this.module(preparationEngine(name, this.environment()));
    }
    async readyEngine(name) {
        const [module] = await Promise.all([this.readyModule(name), this.pending.get('font')]);
        return { module, font: this.fontCopy() };
    }
    async warm(value) {
        const components = preparationComponents(value), start = performance.now();
        const admission = admitPreparation(this.state, components, this.environment(), start);
        this.state = admission.state;
        if (admission.aborted)
            return { milliseconds: performance.now() - start, assets: admission.aborted.map(asset => ({ ...asset })) };
        const jobs = admission.start.map(name => {
            let resolve, reject;
            const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
            this.pending.set(name, pending);
            return { name, resolve, reject };
        });
        // All shared completions exist before loading publishes a synchronous update.
        const waiting = admission.names.map(name => this.pending.get(name));
        for (const job of jobs)
            void this.load(job.name).then(job.resolve, job.reject);
        const assets = await Promise.all(waiting);
        return { milliseconds: performance.now() - start, assets };
    }
    async load(name) {
        const job = this.state.jobs.find(job => job.name === name), controller = new AbortController(), parent = this.controller.signal;
        const abort = () => controller.abort();
        parent.addEventListener('abort', abort, { once: true });
        if (parent.aborted)
            abort();
        let timer;
        const expire = () => {
            const step = stepPreparation(this.state, name, { kind: 'deadline', now: performance.now() });
            this.state = step.state;
            if (step.effect === 'abort')
                abort();
            else if (!controller.signal.aborted)
                timer = setTimeout(expire, Math.max(0, job.deadline - performance.now()));
        };
        timer = setTimeout(expire, Math.max(0, job.deadline - performance.now()));
        let error, module, data;
        try {
            if (this.state.retired)
                throw new DOMException('Preparation destroyed', 'AbortError');
            if (!job.isolated)
                throw Error('Wasm preparation requires cross-origin isolation');
            this.phase(name, 'loading');
            if (this.providerAssets) {
                data = new Uint8Array(await this.providerAssets.bytes(job.path));
                this.state = stepPreparation(this.state, name, { kind: 'bytes', bytes: data.byteLength }).state;
            }
            else {
                const response = await fetch(new URL(job.path, this.base), { signal: controller.signal, priority: 'low' });
                if (!response.ok)
                    throw Error(`Preparation asset unavailable: ${job.path} (${response.status})`);
                const declared = stepPreparation(this.state, name, { kind: 'bytes', bytes: Number(response.headers.get('content-length')), declared: true });
                this.state = declared.state;
                if (declared.effect === 'overflow') {
                    await response.body?.cancel();
                    throw Error('Preparation asset byte budget exceeded');
                }
                const reader = response.body?.getReader(), chunks = [];
                if (!reader)
                    throw Error('Preparation asset has no body');
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done)
                            break;
                        const chunk = stepPreparation(this.state, name, { kind: 'bytes', bytes: value.byteLength });
                        this.state = chunk.state;
                        if (chunk.effect === 'overflow') {
                            await reader.cancel();
                            throw Error('Preparation asset byte budget exceeded');
                        }
                        chunks.push(value);
                    }
                }
                finally {
                    reader.releaseLock();
                }
                data = new Uint8Array(this.state.jobs.find(job => job.name === name).bytes);
                let offset = 0;
                for (const chunk of chunks) {
                    data.set(chunk, offset);
                    offset += chunk.byteLength;
                }
            }
            if (name !== 'font') {
                this.phase(name, 'compiling');
                module = await WebAssembly.compile(data);
            }
        }
        catch (cause) {
            error = String(cause);
        }
        finally {
            clearTimeout(timer);
            parent.removeEventListener('abort', abort);
        }
        const completion = completePreparation(this.state, name, performance.now(), error);
        this.state = completion.state;
        if (completion.publish) {
            if (name === 'font')
                this.font = data.buffer;
            else
                this.modules.set(job.engine, module);
        }
        if (completion.notify)
            this.changed();
        return { ...preparationAsset(this.state, name) };
    }
    destroy() { this.state = retirePreparation(this.state); this.controller.abort(); this.modules.clear(); this.font = undefined; this.pending.clear(); }
}
