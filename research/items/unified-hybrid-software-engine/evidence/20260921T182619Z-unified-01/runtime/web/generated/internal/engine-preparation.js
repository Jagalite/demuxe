// SPDX-License-Identifier: GPL-3.0-or-later
import { PlayerError } from './errors.js';
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
    controller = new AbortController();
    pending = new Map();
    modules = new Map();
    sharedLoads = new Map();
    font;
    phases = new Map();
    constructor(base, software = 'engine-software-full', changed = () => { }) {
        this.base = base;
        this.software = software;
        this.changed = changed;
    }
    get progress() { return [...this.phases].map(([name, status]) => ({ name, status })); }
    phase(name, status) { if (this.controller.signal.aborted)
        return; this.phases.set(name, status); this.changed(); }
    module(name) { return this.modules.get(['engine-hybrid','engine-software-full'].includes(name)?'engine-unified':name); }
    fontCopy() { return this.font?.slice(0); }
    async readyModule(name) {
        if(['engine-hybrid','engine-software-full'].includes(name)) await this.warm([name==='engine-hybrid'?'hybrid':'software']);
        await this.pending.get(name === 'engine-remux' ? 'inspector' : name === 'engine-hybrid' ? 'hybrid' : 'software');
        return this.module(name);
    }
    async readyEngine(name) {
        const [module] = await Promise.all([this.readyModule(name), this.pending.get('font')]);
        return { module, font: this.fontCopy() };
    }
    async warm(value) {
        const names = preparationComponents(value), start = performance.now();
        if (names.some(name => name === 'hybrid' || name === 'software'))
            names.push('font');
        for (const name of names)
            if (!this.phases.has(name))
                this.phases.set(name, 'queued');
        const assets = await Promise.all(names.map(name => {
            let pending = this.pending.get(name);
            if (!pending) {
                pending = this.load(name);
                this.pending.set(name, pending);
            }
            return pending;
        }));
        return { milliseconds: performance.now() - start, assets };
    }
    async load(name) {
        const key=name==='software' && this.software==='engine-software-full'?'hybrid':name;
        let task=this.sharedLoads.get(key);
        if(!task){task=this.loadAsset(key);this.sharedLoads.set(key,task);}
        const asset=await task;
        this.phase(name,asset.status);
        return {...asset,name};
    }
    async loadAsset(name) {
        const start = performance.now(), controller = new AbortController(), parent = this.controller.signal;
        const abort = () => controller.abort();
        parent.addEventListener('abort', abort, { once: true });
        if (parent.aborted)
            abort();
        const timer = setTimeout(abort, 15000);
        let bytes = 0;
        try {
            this.phase(name, 'loading');
            const engine = name === 'inspector' ? 'engine-remux' : name === 'hybrid' ? 'engine-unified' : this.software;
            const path = name === 'font' ? 'fixtures/DejaVuSans.ttf' : `web/${engine}/${name === 'inspector' ? 'remux' : 'player'}.wasm`;
            const response = await fetch(new URL(path, this.base), { signal: controller.signal, priority: 'low' });
            if (!response.ok)
                throw Error(`Preparation asset unavailable: ${path} (${response.status})`);
            const data = await response.arrayBuffer();
            bytes = data.byteLength;
            if (name === 'font') {
                if (!controller.signal.aborted)
                    this.font = data;
            }
            else {
                this.phase(name, 'compiling');
                const module = await WebAssembly.compile(data);
                if (!controller.signal.aborted)
                    this.modules.set(engine, module);
            }
            this.phase(name, controller.signal.aborted ? 'aborted' : 'ready');
            return { name, status: controller.signal.aborted ? 'aborted' : 'ready', bytes, milliseconds: performance.now() - start };
        }
        catch (error) {
            this.phase(name, controller.signal.aborted ? 'aborted' : 'failed');
            return { name, status: controller.signal.aborted ? 'aborted' : 'failed', bytes, milliseconds: performance.now() - start, error: String(error) };
        }
        finally {
            clearTimeout(timer);
            parent.removeEventListener('abort', abort);
        }
    }
    destroy() { this.controller.abort(); this.modules.clear(); this.font = undefined; this.pending.clear(); this.sharedLoads.clear(); }
}
