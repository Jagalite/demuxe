// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { parseProviderDeployment, withProviderAvailability } from './provider-catalog.js';
import { ProviderAcquisition } from './provider-acquisition.js';
import { resolvableExecutionRecipe, executionRecipe } from './execution-recipes.js';
import { resolveProviderRecipe } from './provider-resolution.js';
import { providerResolutionError } from './provider-deployment-errors.js';
/** Per-player deployment state. Only the maintained finite recipes are admitted;
 * packaging metadata cannot add compositions or confer build qualification. */
export class ProviderRuntime {
    base;
    qualified;
    controller = new AbortController();
    deployment;
    loading;
    assets;
    modules = new Map();
    acquiredBytes = new Map();
    sources = new WeakMap();
    nextSource = 0;
    manifestIdentities = new Set();
    constructor(base, qualified) {
        this.base = base;
        this.qualified = qualified;
    }
    load() {
        return this.loading ??= (async () => {
            const timeout = setTimeout(() => this.controller.abort(new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment loading timed out')), 15000);
            try {
                this.controller.signal.throwIfAborted();
                const response = await fetch(new URL('demuxe-providers.json', this.base), { signal: this.controller.signal, redirect: 'error' });
                if (response.status === 404)
                    throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'This modular core requires a configured demuxe-providers.json deployment');
                if (!response.ok)
                    throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment could not be loaded');
                const reader = response.body?.getReader();
                if (!reader)
                    throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment has no body');
                const chunks = [];
                let size = 0;
                try {
                    for (;;) {
                        const { value, done } = await reader.read();
                        if (done)
                            break;
                        size += value.length;
                        if (size > 1024 * 1024)
                            throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment exceeds byte budget');
                        chunks.push(value);
                    }
                }
                finally {
                    await reader.cancel().catch(() => { });
                    reader.releaseLock();
                }
                const bytes = new Uint8Array(size);
                let offset = 0;
                for (const chunk of chunks) {
                    bytes.set(chunk, offset);
                    offset += chunk.length;
                }
                this.deployment = parseProviderDeployment(JSON.parse(new TextDecoder().decode(bytes)), this.base);
                // A claimed build identity must describe this exact deployed asset set.
                // Matching only a manifest's identity string would let edited hashes
                // impersonate the core's reviewed build. Metadata grants no trust.
                const absent = [];
                for (const provider of this.deployment.catalog.providers) {
                    const ids = this.deployment.providerAssets[provider.id];
                    if (!ids.length) {
                        this.manifestIdentities.add(provider.id);
                        continue;
                    }
                    const entries = ids.map(id => { const asset = this.deployment.assets.find(a => a.id === id); return ['runtime/' + asset.url.slice(this.base.href.length), asset.sha256]; }).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
                    const artifacts = Object.fromEntries(entries);
                    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(artifacts, null, 2) + '\n'));
                    const identity = 'sha256:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
                    if (Object.keys(artifacts).length === ids.length && identity === provider.implementationIdentity)
                        this.manifestIdentities.add(provider.id);
                    else
                        absent.push({ id: provider.id, implementationIdentity: provider.implementationIdentity, availability: { state: 'absent', reason: 'Deployed asset set does not match qualified build identity' } });
                }
                this.deployment = { ...this.deployment, catalog: withProviderAvailability(this.deployment.catalog, this.deployment.catalog.revision, absent) };
                this.controller.signal.throwIfAborted();
                this.assets = new ProviderAcquisition(this.deployment, []);
            }
            catch (error) {
                if (this.controller.signal.aborted)
                    throw this.controller.signal.reason;
                if (error instanceof PlayerError)
                    throw error;
                throw new PlayerError('ASSET_LOAD_FAILED', 'Invalid provider deployment manifest');
            }
            finally {
                clearTimeout(timeout);
            }
        })();
    }
    has(path) {
        const url = new URL(path, this.base).href;
        return !!this.deployment?.assets.some(asset => asset.url === url && this.deployment.catalog.providers.some(p => this.manifestIdentities.has(p.id) && this.qualified[p.id] === p.implementationIdentity && this.deployment.providerAssets[p.id]?.includes(asset.id)));
    }
    hasOffer(providerId, profile) {
        const provider = this.deployment?.catalog.providers.find(p => p.id === providerId);
        return !!provider && this.manifestIdentities.has(provider.id) && this.qualified[providerId] === provider.implementationIdentity && provider.offers.some(o => o.profile === profile);
    }
    evidence(recipe, scopeKey) {
        return recipe.bindings.filter(binding => binding.assignments.every(a => Object.prototype.hasOwnProperty.call(this.qualified, a.providerId))).map(binding => ({ recipeId: recipe.id, bindingId: binding.id, scopeKey,
            implementationIdentities: Object.fromEntries(binding.assignments.map(a => [a.providerId, this.qualified[a.providerId]])) }));
    }
    /** The caller invokes this only after existing semantic/source admission.
     * Evidence is scoped to source identity, selected settings and runtime. It
     * binds to the core's reviewed implementation registry, never manifest offers. */
    rejection(planId, source, configuration, runtime = 'pthread') {
        if (!this.deployment || !executionRecipe(planId))
            return 'Provider deployment has not been initialized';
        let id = this.sources.get(source);
        if (!id) {
            id = ++this.nextSource;
            this.sources.set(source, id);
        }
        const scope = JSON.stringify([id, configuration]);
        const description = executionRecipe(planId);
        const required = [];
        if (description.native?.transport === 'prepared')
            required.push(`web/engine-${description.native.adaptation ? 'adaptation' : 'remux'}${runtime === 'pthread' ? '' : '-' + runtime}/remux.wasm`);
        if (description.native?.selectedAudio)
            required.push(runtime === 'pthread' ? 'web/engine-selective/player.wasm' : `web/engine-mpv-audio-${runtime}/service.wasm`);
        if (description.backend === 'WasmPlayer') {
            const hybrid = description.bindings.some(b => b.providers.some(p => p.provider === 'mpv-hybrid'));
            required.push(...(hybrid ? ['web/engine-hybrid/player.wasm'] : ['web/engine-software-full/player.wasm', 'web/engine-software-yuv/player.wasm']), 'fixtures/DejaVuSans.ttf');
        }
        const absent = required.filter(path => !this.has(path));
        if (absent.length)
            return 'Required provider runtime assets are not deployed: ' + absent.join(', ');
        const recipe = resolvableExecutionRecipe(planId);
        const resolution = resolveProviderRecipe(recipe, this.deployment.catalog, this.evidence(recipe, scope), scope);
        return resolution.state === 'pending' || resolution.state === 'available' ? undefined
            : providerResolutionError([resolution])?.message ?? 'No qualified deployed composition';
    }
    async bytes(path) {
        await this.load();
        this.controller.signal.throwIfAborted();
        let pending = this.acquiredBytes.get(path);
        if (!pending) {
            pending = this.acquire(path);
            this.acquiredBytes.set(path, pending);
        }
        return (await pending).slice(0);
    }
    async acquire(path) {
        const deployment = this.deployment, url = new URL(path, this.base).href;
        const asset = deployment.assets.find(a => a.url === url);
        if (!asset)
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `Required provider asset is not deployed: ${path}`);
        const provider = deployment.catalog.providers.find(p => deployment.providerAssets[p.id]?.includes(asset.id) && this.manifestIdentities.has(p.id) && this.qualified[p.id] === p.implementationIdentity);
        if (!provider)
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `No qualified provider owns required asset: ${path}`);
        return this.assets.readAsset(provider.id, provider.implementationIdentity, asset.id);
    }
    module(path) {
        let pending = this.modules.get(path);
        if (!pending) {
            pending = this.bytes(path).then(async (data) => {
                try {
                    const module = await WebAssembly.compile(data);
                    this.controller.signal.throwIfAborted();
                    return module;
                }
                catch (error) {
                    if (this.controller.signal.aborted)
                        throw this.controller.signal.reason;
                    throw new PlayerError('ASSET_LOAD_FAILED', 'Qualified provider engine could not compile in this runtime');
                }
            });
            this.modules.set(path, pending);
        }
        return pending;
    }
    async destroy() { this.controller.abort(new DOMException('Provider deployment disposed', 'AbortError')); await this.loading?.catch(() => { }); await this.assets?.dispose(); this.manifestIdentities.clear(); this.modules.clear(); this.acquiredBytes.clear(); }
}
