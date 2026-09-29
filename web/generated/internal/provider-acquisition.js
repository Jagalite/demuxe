// SPDX-License-Identifier: Apache-2.0
import { PlayerError, isPlayerError } from './errors.js';
import { withProviderAvailability } from './provider-catalog.js';
import { resolveProviderRecipe } from './provider-resolution.js';
/** One acquisition scope per attempted execution. Not a global engine cache.
 * Assets are fetched only when a selected owner requests them, shared by content
 * identity within this scope, and checked before any bytes reach owner code.
 * JSPI/Asyncify, compilation and native probes belong to the supplied owner.
 * A fresh scope is required for a different source/runtime qualification key.
 */
export class ProviderAcquisition {
    deployment;
    catalogValue;
    controller = new AbortController();
    owners = new Map();
    assets = new Map();
    bytes = new Map();
    preparations = new Map();
    releases = [];
    reservedBytes = 0;
    scopeKey;
    resolutions = new WeakMap();
    closePromise;
    request;
    timeoutMs;
    maxResidentBytes;
    constructor(deployment, owners, options = {}) {
        this.deployment = deployment;
        this.catalogValue = deployment.catalog;
        this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.timeoutMs = options.timeoutMs ?? 30_000;
        this.maxResidentBytes = options.maxResidentBytes ?? 256 * 1024 * 1024;
        if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 300_000
            || !Number.isSafeInteger(this.maxResidentBytes) || this.maxResidentBytes < 1 || this.maxResidentBytes > 512 * 1024 * 1024)
            throw Error('Invalid provider acquisition limits');
        for (const owner of owners) {
            if (this.owners.has(owner.id))
                throw Error('Duplicate provider acquisition owner');
            const fact = deployment.catalog.providers.find(p => p.id === owner.id);
            if (!fact || fact.implementationIdentity !== owner.implementationIdentity)
                throw Error('Provider owner does not match deployment');
            this.owners.set(owner.id, owner);
        }
        for (const asset of deployment.assets)
            this.assets.set(asset.id, asset);
        // An installed package without its configured owner cannot execute. This is
        // deployment absence, unlike a failed fetch of a declared deployed asset.
        this.catalogValue = withProviderAvailability(this.catalogValue, this.catalogValue.revision, deployment.catalog.providers.filter(p => !this.owners.has(p.id)).map(p => ({ ...p,
            availability: { state: 'absent', reason: 'No configured implementation owner' } })));
    }
    get catalog() { return this.catalogValue; }
    /** Read immutable bytes for explicit inspection/preparation without claiming
     * that an execution composition is qualified or marking an owner ready. */
    readAsset(providerId, implementationIdentity, assetId) {
        this.controller.signal.throwIfAborted();
        const provider = this.deployment.catalog.providers.find(p => p.id === providerId && p.implementationIdentity === implementationIdentity);
        if (!provider || !this.deployment.providerAssets[providerId]?.includes(assetId))
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'No matching deployed provider asset');
        return this.load(this.assets.get(assetId));
    }
    resolve(recipe, evidence, scopeKey) {
        this.controller.signal.throwIfAborted();
        const resolution = resolveProviderRecipe(recipe, this.catalogValue, evidence, scopeKey);
        for (const binding of resolution.bindings) {
            if (binding.state === 'pending' || binding.state === 'available')
                Object.freeze(binding.providerIds);
            Object.freeze(binding);
        }
        Object.freeze(resolution.bindings);
        Object.freeze(resolution);
        this.resolutions.set(resolution, this.catalogValue);
        return resolution;
    }
    /** Resolution must be produced against this exact catalog snapshot. Accept
     * one explicitly selected binding; never guess order among alternatives. */
    async acquire(resolution, bindingId) {
        this.controller.signal.throwIfAborted();
        if (this.resolutions.get(resolution) !== this.catalogValue || resolution.deploymentRevision !== this.catalogValue.revision || !resolution.scopeKey
            || (this.scopeKey !== undefined && this.scopeKey !== resolution.scopeKey))
            throw Error('Stale provider acquisition scope');
        const binding = resolution.bindings.find(b => b.bindingId === bindingId);
        if (resolution.state === 'failed' || !binding || (binding.state !== 'available' && binding.state !== 'pending'))
            throw Error('Cannot acquire an unresolved provider binding');
        this.scopeKey = resolution.scopeKey;
        for (const id of binding.providerIds) {
            this.controller.signal.throwIfAborted();
            const fact = this.catalogValue.providers.find(p => p.id === id);
            if (!fact || fact.availability.state === 'absent')
                throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `No configured provider owner: ${id}`);
            if (fact.availability.state === 'failed')
                throw fact.availability.error;
            let pending = this.preparations.get(id);
            if (!pending) {
                pending = this.prepare(fact);
                this.preparations.set(id, pending);
            }
            await pending;
            // Runtime-unavailable owners update the catalog for ordered re-resolution.
            if (this.catalogValue.providers.find(p => p.id === id)?.availability.state === 'absent')
                return;
        }
    }
    observe(provider, availability) {
        this.catalogValue = withProviderAvailability(this.catalogValue, this.catalogValue.revision, [{ id: provider.id, implementationIdentity: provider.implementationIdentity, availability }]);
    }
    async prepare(provider) {
        try {
            const allowed = new Set(this.deployment.providerAssets[provider.id]);
            const result = await this.owners.get(provider.id).prepare({ provider, signal: this.controller.signal,
                asset: async (id) => {
                    this.controller.signal.throwIfAborted();
                    if (!allowed.has(id))
                        throw new PlayerError('ASSET_LOAD_FAILED', `Provider ${provider.id} requested an undeclared asset`);
                    return this.load(this.assets.get(id));
                } });
            if (result.state === 'ready') {
                if (this.controller.signal.aborted)
                    await result.dispose();
                else
                    this.releases.push(() => result.dispose());
            }
            this.controller.signal.throwIfAborted();
            this.observe(provider, result.state === 'ready' ? { state: 'available' } : { state: 'absent', reason: result.reason });
        }
        catch (error) {
            if (this.controller.signal.aborted)
                throw this.controller.signal.reason;
            const failure = error instanceof Error ? error : new PlayerError('ASSET_LOAD_FAILED', 'Provider initialization failed');
            this.observe(provider, { state: 'failed', error: failure });
            throw failure;
        }
    }
    async load(asset) {
        const identity = JSON.stringify([asset.url, asset.sha256, asset.bytes]);
        let pending = this.bytes.get(identity);
        if (!pending) {
            if (this.reservedBytes + asset.bytes > this.maxResidentBytes)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Provider acquisition byte budget exceeded');
            this.reservedBytes += asset.bytes;
            pending = this.fetchAsset(asset);
            this.bytes.set(identity, pending);
        }
        // An owner may transfer/detach or mutate its copy without poisoning another
        // role sharing a bundle. Cached bytes never leave the acquisition scope.
        return (await pending).slice(0);
    }
    async fetchAsset(asset) {
        const deadline = new AbortController();
        const abort = () => deadline.abort(this.controller.signal.reason);
        this.controller.signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => deadline.abort(new PlayerError('ASSET_LOAD_FAILED', 'Provider asset deadline exceeded')), this.timeoutMs);
        let reader;
        try {
            const response = await this.request(asset.url, { signal: deadline.signal, credentials: 'same-origin', redirect: 'error' });
            if (!response.ok || !response.body)
                throw new PlayerError('ASSET_LOAD_FAILED', `Deployed provider asset could not be read (${response.status})`);
            const result = new Uint8Array(asset.bytes);
            reader = response.body.getReader();
            let offset = 0;
            for (;;) {
                deadline.signal.throwIfAborted();
                const { done, value } = await reader.read();
                if (done)
                    break;
                if (offset + value.byteLength > result.byteLength)
                    throw new PlayerError('ASSET_LOAD_FAILED', 'Provider asset exceeds declared size');
                result.set(value, offset);
                offset += value.byteLength;
            }
            if (offset !== asset.bytes)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Provider asset size mismatch');
            const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', result)), n => n.toString(16).padStart(2, '0')).join('');
            deadline.signal.throwIfAborted();
            if (digest !== asset.sha256)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Provider asset integrity mismatch');
            return result.buffer;
        }
        catch (error) {
            if (deadline.signal.aborted)
                throw deadline.signal.reason;
            if (isPlayerError(error))
                throw error;
            throw new PlayerError('ASSET_LOAD_FAILED', 'Deployed provider asset acquisition failed');
        }
        finally {
            clearTimeout(timer);
            this.controller.signal.removeEventListener('abort', abort);
            if (reader) {
                try {
                    await reader.cancel();
                }
                catch { }
                reader.releaseLock();
            }
        }
    }
    /** Aborts in-flight acquisition, waits for owner cleanup, then releases ready
     * owners in reverse order. Repeated calls share the same completion/error. */
    dispose() {
        if (!this.closePromise) {
            this.closePromise = Promise.resolve().then(async () => {
                await Promise.allSettled(this.preparations.values());
                await Promise.allSettled(this.bytes.values());
                const errors = [];
                for (const release of this.releases.reverse()) {
                    try {
                        await release();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                this.releases.length = 0;
                this.bytes.clear();
                this.reservedBytes = 0;
                if (errors.length)
                    throw new AggregateError(errors, 'Provider cleanup failed');
            });
            // Publish completion before dispatching synchronous abort listeners.
            this.controller.abort(new DOMException('Provider acquisition disposed', 'AbortError'));
        }
        return this.closePromise;
    }
}
