// SPDX-License-Identifier: Apache-2.0
import { runtimeBase } from './internal/assets.js';
import { qualifiedProviderIdentities } from './internal/provider-build.js';
import { parseProviderDeployment } from './internal/provider-catalog.js';
import { identifyDeployment, mergeDeployments } from './internal/provider-deployment.js';
import { initialSharedRuntime, admitSharedRuntimeLoad, failSharedRuntimeLoad, publishSharedRuntime, unqualifiedRuntimeProvider, retireSharedRuntime } from './internal/machine/shared-runtime.js';
import { SharedProviderAssets } from './internal/shared-provider-assets.js';
import { PlayerError } from './internal/errors.js';
const access = new WeakMap();
/** @internal Only per-player provider owners consume admitted asset snapshots. */
export function runtimeAccess(runtime) { return access.get(runtime); }
/** Stop waiting without cancelling other consumers of shared work. */
export function awaitRuntime(pending, signal) {
    if (!signal)
        return pending;
    return new Promise((resolve, reject) => {
        const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason); };
        signal.addEventListener('abort', abort, { once: true });
        pending.then(value => { signal.removeEventListener('abort', abort); if (!signal.aborted)
            resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
        if (signal.aborted)
            abort();
    });
}
/** Application-owned provider catalog and bounded asset cache. Players own
 * independent sessions and never destroy this shared runtime. */
export class DemuxeRuntime {
    get assetBase() { return this.base.href; }
    get qualifiedProviders() { return this.qualification; }
    qualification;
    control;
    base;
    assets;
    controller = new AbortController();
    loads = new Map();
    listeners = new Set();
    current;
    snapshots = new WeakSet();
    destruction;
    providers;
    constructor(options = {}) {
        this.base = runtimeBase(options.assetBase);
        this.qualification = Object.freeze({ ...options.qualifiedProviders ?? qualifiedProviderIdentities });
        for (const [id, identity] of Object.entries(this.qualifiedProviders))
            if (!id || typeof identity !== 'string' || !identity)
                throw new PlayerError('INVALID_ARGUMENT', 'Invalid provider qualification identity');
        this.control = initialSharedRuntime(this.qualification);
        this.assets = new SharedProviderAssets(options.maxCacheBytes);
        this.current = Object.freeze({ revision: 0, providers: Object.freeze([]), deployment: parseProviderDeployment({ schema: 1, providerContractVersion: 1, revision: 'runtime-0', assets: [], providers: [] }, this.base) });
        this.snapshots.add(this.current);
        access.set(this, { snapshot: () => this.deploymentSnapshot(), read: ((snapshot, id, compile) => compile ? this.read(snapshot, id, true) : this.read(snapshot, id, false)) });
        const runtime = this;
        this.providers = Object.freeze({ load: (manifest, options) => runtime.load(manifest, options), preload: (ids, options) => runtime.preload(ids, options), get snapshot() { return runtime.snapshot; } });
    }
    assertLive() { if (this.control.retired)
        throw new PlayerError('ABORTED', 'Demuxe runtime is destroyed'); }
    get snapshot() { return Object.freeze({ revision: this.current.revision, providers: Object.freeze(this.current.providers.map(({ id, implementationIdentity }) => Object.freeze({ id, implementationIdentity }))) }); }
    get cacheStats() { return this.assets.stats; }
    clearCache() { this.assertLive(); this.assets.clear(); }
    /** @internal Snapshot adoption happens at a player's operation boundary. */
    deploymentSnapshot() { this.assertLive(); return this.current; }
    /** @internal Listeners schedule work; they must not mutate active sessions. */
    subscribe(listener) { this.assertLive(); this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
    async load(manifest, options = {}) {
        this.assertLive();
        const { signal, preload } = options;
        signal?.throwIfAborted();
        const url = new URL(manifest, this.base);
        if (url.origin !== this.base.origin || url.username || url.password || url.hash)
            throw new PlayerError('INVALID_ARGUMENT', 'Provider manifests must use the runtime origin');
        const admission = admitSharedRuntimeLoad(this.control, url.href);
        this.control = admission.state;
        if (admission.id === undefined)
            throw new PlayerError('ABORTED', 'Demuxe runtime is destroyed');
        let pending = this.loads.get(url.href);
        if (admission.start) {
            pending = Promise.resolve().then(() => this.loadManifest(url)).catch(error => { this.control = failSharedRuntimeLoad(this.control, admission.id); this.loads.delete(url.href); throw error; });
            this.loads.set(url.href, pending);
        }
        const snapshot = await awaitRuntime(pending, signal);
        // Even a cached load yields: retirement may win before this consumer resumes.
        this.assertLive();
        signal?.throwIfAborted();
        if (preload)
            await this.preload(snapshot.providers.map(provider => provider.id), { signal });
        this.assertLive();
        signal?.throwIfAborted();
        return snapshot;
    }
    async loadManifest(url) {
        this.assertLive();
        const deadline = new AbortController(), abort = () => deadline.abort(this.controller.signal.reason);
        this.controller.signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => deadline.abort(new PlayerError('ASSET_LOAD_FAILED', 'Provider manifest deadline exceeded')), 15000);
        let reader;
        try {
            const response = await fetch(url, { signal: deadline.signal, credentials: 'same-origin', redirect: 'error' });
            if (!response.ok || !response.body)
                throw new PlayerError(response.status === 404 ? 'DEPLOYMENT_UNAVAILABLE' : 'ASSET_LOAD_FAILED', 'Provider manifest could not be loaded');
            reader = response.body.getReader();
            const chunks = [];
            let size = 0;
            for (;;) {
                deadline.signal.throwIfAborted();
                const { value, done } = await reader.read();
                if (done)
                    break;
                size += value.byteLength;
                if (size > 1024 * 1024)
                    throw new PlayerError('ASSET_LOAD_FAILED', 'Provider manifest exceeds byte budget');
                chunks.push(value);
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.byteLength;
            }
            const incoming = parseProviderDeployment(JSON.parse(new TextDecoder().decode(bytes)), this.base);
            const providers = await identifyDeployment(incoming, this.base);
            const unqualified = unqualifiedRuntimeProvider(this.control, providers);
            if (unqualified !== undefined)
                throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'Provider is not qualified by this runtime: ' + unqualified);
            deadline.signal.throwIfAborted();
            this.assertLive();
            // Merge against the latest snapshot after every await: concurrent loads
            // cannot overwrite one another. Conflicts never partially publish.
            const revision = this.current.revision + 1, deployment = mergeDeployments(this.current.deployment, incoming, 'runtime-' + revision);
            const publication = publishSharedRuntime(this.control, this.current.revision, providers, deployment.catalog.providers.length !== this.current.providers.length || deployment.assets.length !== this.current.deployment.assets.length);
            if (!publication.accepted)
                throw new PlayerError('ABORTED', 'Runtime publication was retired');
            this.control = publication.state;
            if (!publication.published)
                return this.snapshot;
            this.current = Object.freeze({ revision: this.control.revision, deployment, providers: this.control.providers });
            this.snapshots.add(this.current);
            for (const listener of [...this.listeners]) {
                try {
                    listener();
                }
                catch { /* A consumer cannot roll back a published catalog. */ }
            }
            return this.snapshot;
        }
        catch (error) {
            if (deadline.signal.aborted)
                throw deadline.signal.reason;
            if (error instanceof PlayerError)
                throw error;
            throw new PlayerError('ASSET_LOAD_FAILED', 'Invalid provider deployment: ' + String(error));
        }
        finally {
            clearTimeout(timer);
            this.controller.signal.removeEventListener('abort', abort);
            if (reader) {
                await reader.cancel().catch(() => { });
                reader.releaseLock();
            }
        }
    }
    async preload(ids = this.current.providers.map(provider => provider.id), options = {}) {
        this.assertLive();
        const { signal } = options;
        signal?.throwIfAborted();
        this.assertLive();
        const snapshot = this.current;
        for (const id of ids) {
            const provider = snapshot.providers.find(provider => provider.id === id);
            if (!provider)
                throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'Unknown runtime provider: ' + id);
            for (const assetId of provider.assets) {
                signal?.throwIfAborted();
                await awaitRuntime(this.read(snapshot, assetId, false), signal);
            }
        }
        this.assertLive();
        signal?.throwIfAborted();
    }
    read(snapshot, assetId, compile) {
        this.assertLive();
        if (!this.snapshots.has(snapshot))
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'Foreign runtime snapshot');
        const asset = snapshot.deployment.assets.find(asset => asset.id === assetId), provider = snapshot.providers.find(provider => provider.assets.includes(assetId));
        if (!asset || !provider)
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'Unknown runtime asset');
        const pending = compile ? this.assets.module(snapshot.deployment, provider.id, asset) : this.assets.bytes(snapshot.deployment, provider.id, asset);
        return awaitRuntime(pending, this.controller.signal);
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.destruction = Promise.resolve().then(async () => { await Promise.all([Promise.allSettled(this.loads.values()), this.assets.destroy()]); this.loads.clear(); });
        this.control = retireSharedRuntime(this.control);
        this.controller.abort(new PlayerError('ABORTED', 'Demuxe runtime is destroyed'));
        this.listeners.clear();
        return this.destruction;
    }
}
