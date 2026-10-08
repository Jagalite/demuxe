// SPDX-License-Identifier: Apache-2.0
import { compareProviderPreferences, normalizeProviderPreferences } from './provider-cost.js';
import { PlayerError } from './errors.js';
import { identifyDeployment } from './provider-deployment.js';
import { awaitRuntime, runtimeAccess } from '../runtime.js';
import { parseProviderDeployment, withProviderAvailability } from './provider-catalog.js';
import { ProviderAcquisition } from './provider-acquisition.js';
import { resolvableExecutionRecipe, executionRecipe } from './execution-recipes.js';
import { resolveProviderRecipe } from './provider-resolution.js';
import { audioRepairRecipe } from './component-recipes.js';
import { executeComponentBinding } from './component-selection.js';
import { providerResolutionError } from './provider-deployment-errors.js';
import { createProviderRuntime, admitRuntimeLoad, observeRuntimeManifest, acceptRuntimeDeployment, runtimeAssetPath, runtimeAssetOwner, runtimeHasOffer, admitRuntimeRequest, completeRuntimeRequest, retireProviderRuntime, closeProviderRuntime, captureRuntimeProbe, codecProfile, selectCodecInspector, selectCodecPreparation, selectAudioRepair, updateCodecSource, storedCodecPreparation, runtimeCompositionEvidence, requiredRuntimeAssets } from './machine/provider-runtime.js';
/** Per-player deployment state. Only the maintained finite recipes are admitted;
 * packaging metadata cannot add compositions or confer build qualification. */
export class ProviderRuntime {
    base;
    shared;
    controller = new AbortController();
    state;
    destruction;
    deployment;
    loading;
    assets;
    modules = new Map();
    acquiredBytes = new Map();
    sources = new WeakMap();
    nextSource = 0;
    codecSources = new WeakMap();
    sharedSnapshot;
    get revision() { return this.sharedSnapshot?.revision ?? 0; }
    /** Adopt additive provider publications only at a player operation boundary.
     * Existing assets and identities cannot change, so active backend leases
     * remain valid while newly admitted plans see the updated catalog. */
    refresh() {
        if (!this.shared)
            return false;
        this.controller.signal.throwIfAborted();
        const snapshot = runtimeAccess(this.shared).snapshot();
        if (snapshot === this.sharedSnapshot)
            return false;
        const loading = admitRuntimeLoad(createProviderRuntime(this.shared.qualifiedProviders), performance.now()).state;
        this.state = acceptRuntimeDeployment(loading, snapshot.providers, snapshot.deployment.assets.map(asset => ({ id: asset.id, url: asset.url, path: asset.url.slice(this.base.href.length) }))).state;
        this.deployment = snapshot.deployment;
        this.sharedSnapshot = snapshot;
        this.codecSources = new WeakMap();
        return true;
    }
    profileAvailability(runtime, offer) {
        if (runtime === 'pthread')
            return [];
        return ['truehd-mlp', 'dts-hd', 'ac3-eac3'].map(profile => { const candidate = codecProfile(profile, runtime); return { profile, offered: this.hasOffer(candidate.providerId, offer), deployed: this.has(candidate.wasmPath) }; }).sort((a, b) => this.comparePreparation(codecProfile(a.profile, runtime).providerId, codecProfile(b.profile, runtime).providerId));
    }
    comparePreparation(a, b) {
        const assignment = (providerId) => [{ providerId, requirements: [{ capability: 'media.prepare.file', version: 1, profile: 'flac24' }] }];
        return compareProviderPreferences(assignment(a), assignment(b), this.providerPreferences);
    }
    preferBroadPreparation(providerId, runtime) {
        if (!this.providerPreferences.some(rule => rule.capability === 'media.prepare.file'))
            return false;
        const suffix = runtime === 'pthread' ? '' : '-' + runtime, broad = 'ffmpeg-file-preparation' + suffix;
        return this.hasOffer(broad, 'flac24') && this.has('web/engine-adaptation' + suffix + '/remux.wasm') && this.comparePreparation(broad, providerId) < 0;
    }
    /** Qualified identities, with codec slices filtered by inspected source facts. */
    preferenceProviders(source, probe, aid = 'auto') {
        const local = source;
        const compatible = probe ? ['jspi', 'asyncify'].flatMap(runtime => {
            const hint = selectCodecPreparation({ local: local?.kind === 'local', file: local?.file instanceof File, runtime, probe: captureRuntimeProbe(probe), aid }, this.profileAvailability(runtime, 'flac24'));
            return hint ? [hint.providerId] : [];
        }) : undefined;
        return this.deployment?.catalog.providers.filter(provider => provider.offers.some(offer => (offer.capability === 'media.prepare.file' || offer.capability === 'media.play.complete') && this.hasOffer(provider.id, offer.profile))).map(provider => provider.id).filter(id => !compatible || !/^ffmpeg-(truehd-mlp|dts-hd|ac3-eac3)-/.test(id) || compatible.includes(id)) ?? [];
    }
    codecInspector(runtime) {
        return selectCodecInspector(runtime, this.profileAvailability(runtime, 'packet-copy'));
    }
    codecPreparation(source, probe, runtime, aid = 'auto') {
        const local = source, file = local.file instanceof File;
        const captured = probe ? captureRuntimeProbe(probe) : undefined;
        let state = updateCodecSource(file ? this.codecSources.get(local.file) : undefined, { local: local.kind === 'local', file, runtime, probe: captured, aid }, this.profileAvailability(runtime, 'flac24'));
        if (state.hint && this.preferBroadPreparation(state.hint.providerId, runtime))
            state = { ...state, hint: null };
        if (file)
            this.codecSources.set(local.file, state);
        return state.hint ?? undefined;
    }
    preparation(file, runtime, audioTrack) {
        let source = this.codecSources.get(file), hint = source?.hint ?? undefined;
        if (audioTrack !== undefined && audioTrack !== hint?.audioIndex) {
            const probe = source?.probe, audio = probe?.tracks.find(t => t.type === 'audio' && t.index === audioTrack);
            hint = audio ? this.codecPreparation({ kind: 'local', file }, probe ? { format: probe.format, duration: 0, tracks: probe.tracks.map(track => ({ ...track })) } : undefined, runtime, audio.id) : undefined;
        }
        source = this.codecSources.get(file);
        return hint ? storedCodecPreparation(source, runtime, this.has(hint.wasmPath)) : undefined;
    }
    providerPreferences;
    constructor(base, qualified, preferences, shared) {
        this.base = base;
        this.shared = shared;
        this.providerPreferences = normalizeProviderPreferences(preferences);
        this.state = createProviderRuntime(qualified);
    }
    load() {
        if (this.shared) {
            try {
                this.controller.signal.throwIfAborted();
                if (!this.sharedSnapshot)
                    this.refresh();
                return Promise.resolve();
            }
            catch (error) {
                return Promise.reject(error);
            }
        }
        const admission = admitRuntimeLoad(this.state, performance.now());
        this.state = admission.state;
        if (admission.effect === 'join')
            return this.loading;
        if (admission.effect === 'retired')
            return this.loading = Promise.reject(this.controller.signal.reason ?? new DOMException('Provider deployment disposed', 'AbortError'));
        let resolve, reject;
        const loading = new Promise((yes, no) => { resolve = yes; reject = no; });
        this.loading = loading;
        void this.loadDeployment().then(resolve, reject);
        return loading;
    }
    async loadDeployment() {
        const due = this.state.deadline;
        let timeout;
        const expire = () => {
            const step = observeRuntimeManifest(this.state, { kind: 'deadline', now: performance.now() });
            this.state = step.state;
            if (step.effect === 'abort')
                this.controller.abort(new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment loading timed out'));
            else if (!this.controller.signal.aborted)
                timeout = setTimeout(expire, Math.max(0, due - performance.now()));
        };
        timeout = setTimeout(expire, Math.max(0, due - performance.now()));
        try {
            this.controller.signal.throwIfAborted();
            const response = await fetch(new URL('demuxe-providers.json', this.base), { signal: this.controller.signal, redirect: 'error' });
            this.controller.signal.throwIfAborted();
            if (response.status === 404)
                throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'This modular core requires a configured demuxe-providers.json deployment');
            if (!response.ok)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment could not be loaded');
            const reader = response.body?.getReader();
            if (!reader)
                throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment has no body');
            const chunks = [];
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    this.controller.signal.throwIfAborted();
                    if (done)
                        break;
                    const observed = observeRuntimeManifest(this.state, { kind: 'bytes', bytes: value.length });
                    this.state = observed.state;
                    if (observed.effect === 'overflow')
                        throw new PlayerError('ASSET_LOAD_FAILED', 'Provider deployment exceeds byte budget');
                    chunks.push(value);
                }
            }
            finally {
                await reader.cancel().catch(() => { });
                reader.releaseLock();
            }
            const bytes = new Uint8Array(this.state.manifestBytes);
            let offset = 0;
            for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.length;
            }
            const deployment = parseProviderDeployment(JSON.parse(new TextDecoder().decode(bytes)), this.base);
            // Hash the exact declared closure in the shell; qualification is decided
            // from this observed identity and the immutable reviewed registry.
            const providers = await identifyDeployment(deployment, this.base);
            this.controller.signal.throwIfAborted();
            const accepted = acceptRuntimeDeployment(this.state, providers, deployment.assets.map(asset => ({ id: asset.id, url: asset.url, path: asset.url.slice(this.base.href.length) })));
            this.state = accepted.state;
            if (!accepted.accepted)
                throw this.controller.signal.reason ?? new DOMException('Provider deployment disposed', 'AbortError');
            const absent = this.state.providers.filter(provider => !provider.manifestMatches).map(provider => ({ id: provider.id, implementationIdentity: provider.implementationIdentity, availability: { state: 'absent', reason: 'Deployed asset set does not match qualified build identity' } }));
            this.deployment = { ...deployment, catalog: withProviderAvailability(deployment.catalog, deployment.catalog.revision, absent) };
            this.assets = new ProviderAcquisition(this.deployment, []);
        }
        catch (error) {
            this.state = observeRuntimeManifest(this.state, { kind: 'failed' }).state;
            if (this.controller.signal.aborted)
                throw this.controller.signal.reason;
            if (error instanceof PlayerError)
                throw error;
            throw new PlayerError('ASSET_LOAD_FAILED', 'Invalid provider deployment manifest');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    /** Explicit legacy artifacts take precedence over the shared mpv artifact. */
    assetPath(path) { return runtimeAssetPath(this.state, path, new URL(path, this.base).href); }
    has(path) { return runtimeAssetOwner(this.state, new URL(this.assetPath(path), this.base).href).kind === 'ready'; }
    hasOffer(providerId, profile) { return runtimeHasOffer(this.state, providerId, profile); }
    /** A bounded implementation choice inside the existing FLAC24 plan. This
     * does not admit new playback plans, tracks, subtitles or output policies. */
    audioRepairCandidate(source, probe) {
        const local = source, blob = local.file instanceof Blob;
        return selectAudioRepair({ local: local.kind === 'local', blob, size: blob ? local.file.size : 0, probe: probe ? captureRuntimeProbe(probe) : undefined,
            container: this.hasOffer('ts-container', 'finite-clear-av'), truehd: this.hasOffer('audio-truehd-mlp', '48khz-integer'), dts: this.hasOffer('audio-dts-hd', 'ma-48khz-s32p'), flac: this.hasOffer('audio-flac', '48khz-s24') });
    }
    audioProfileRejection(error) {
        if (['web/engine-adaptation/remux.wasm', 'web/engine-adaptation-jspi/remux.wasm', 'web/engine-adaptation-asyncify/remux.wasm'].some(path => this.has(path)))
            return;
        throw new PlayerError('DECODE_FAILED', 'Codec preparation profile rejected this source: ' + String(error));
    }
    async prepareAudio(file, signal, runtime = 'pthread') {
        await this.load();
        signal = AbortSignal.any([signal, this.controller.signal]);
        signal.throwIfAborted();
        if (this.preferBroadPreparation('', runtime))
            return;
        const readerURL = new URL('web/providers/components/provider-container/src/matroska.js', this.base);
        const ownerURL = new URL('web/providers/components/provider-container/src/owners.js', this.base);
        if (!this.has('web/providers/components/provider-container/src/matroska.js') || !this.has('web/providers/components/provider-container/src/owners.js') || file.size > 64 * 1024 * 1024)
            return;
        await Promise.all([this.bytes('web/providers/components/provider-container/src/matroska.js'), this.bytes('web/providers/components/provider-container/src/owners.js')]);
        const readerModule = await import(readerURL.href);
        let reader;
        try {
            reader = await readerModule.MatroskaReader.open(file, signal);
        }
        catch (error) {
            if (error?.code === 'PROVIDER_PROFILE_MISMATCH')
                return this.audioProfileRejection(error);
            throw error;
        }
        const probe = { format: 'matroska', duration: 1, tracks: reader.tracks.map((t, index) => ({ id: String(index + 1), index, type: t.kind, codec: { 'V_MPEG4/ISO/AVC': 'h264', 'V_MPEGH/ISO/HEVC': 'hevc', A_TRUEHD: 'truehd', A_MLP: 'mlp', A_DTS: 'dts' }[t.codec] ?? t.codec, sampleRate: t.rate, channels: t.channels })) };
        const candidate = this.audioRepairCandidate({ kind: 'local', file }, probe);
        if (!candidate)
            return;
        const { createComponentOwners } = await import(ownerURL.href);
        const owners = createComponentOwners(this.deployment, this.base), acquisition = new ProviderAcquisition(this.deployment, owners.owners);
        const abort = () => { void acquisition.dispose(); };
        signal.addEventListener('abort', abort, { once: true });
        try {
            let id = this.sources.get(file);
            if (!id) {
                id = ++this.nextSource;
                this.sources.set(file, id);
            }
            const recipe = audioRepairRecipe(candidate.codec, candidate.channels), scope = JSON.stringify(['bounded-audio-repair', id, candidate, navigator.userAgent]);
            const result = await executeComponentBinding(acquisition, recipe, this.evidence(recipe, scope), scope, 'fine', binding => owners.execute(file, candidate.codec, binding, signal, candidate.channels), undefined, this.providerPreferences);
            signal.throwIfAborted();
            return { file: result.value, tracks: probe.tracks.map(t => ({ id: t.id, type: t.type, codec: t.codec, selected: true })), diagnostics: { kind: 'codec-components', codec: candidate.codec, channels: candidate.channels, binding: result.decision.bindingId, sourceBytes: file.size, outputBytes: result.value.size } };
        }
        catch (error) {
            if (error?.code === 'PROVIDER_PROFILE_MISMATCH')
                return this.audioProfileRejection(error);
            throw error;
        }
        finally {
            signal.removeEventListener('abort', abort);
            await acquisition.dispose();
        }
    }
    evidence(recipe, scopeKey) {
        return runtimeCompositionEvidence(this.state, { id: recipe.id, bindings: recipe.bindings.map(binding => ({ id: binding.id, providerIds: binding.assignments.map(assignment => assignment.providerId) })) }, scopeKey);
    }
    /** The caller invokes this only after existing semantic/source admission.
     * Evidence is scoped to source identity, selected settings and runtime. It
     * binds to the core's reviewed implementation registry, never manifest offers. */
    rejection(planId, source, configuration, runtime = 'pthread', probe, aid = 'auto') {
        if (!this.deployment || !executionRecipe(planId))
            return 'Provider deployment has not been initialized';
        let id = this.sources.get(source);
        if (!id) {
            id = ++this.nextSource;
            this.sources.set(source, id);
        }
        const scope = JSON.stringify([id, configuration]);
        const description = executionRecipe(planId);
        if (planId === 'native-transcode') {
            const engine = this.codecPreparation(source, probe, runtime, aid);
            if (engine) {
                const base = resolvableExecutionRecipe('native-transcode', runtime), recipe = { ...base, bindings: base.bindings.map(binding => ({ ...binding, assignments: binding.assignments.map(a => ({ ...a, providerId: a.providerId.startsWith('ffmpeg-file-preparation') ? engine.providerId : a.providerId })) })) };
                const resolution = resolveProviderRecipe(recipe, this.deployment.catalog, this.evidence(recipe, scope), scope);
                if (resolution.state === 'pending' || resolution.state === 'available')
                    return;
            }
            const candidate = this.audioRepairCandidate(source, probe);
            if (candidate) {
                const recipe = audioRepairRecipe(candidate.codec, candidate.channels), resolution = resolveProviderRecipe(recipe, this.deployment.catalog, this.evidence(recipe, scope), scope);
                if (resolution.state === 'pending' || resolution.state === 'available')
                    return;
            }
        }
        const required = requiredRuntimeAssets({ runtime, prepared: description.native?.transport === 'prepared', adaptation: !!description.native?.adaptation, selectedAudio: !!description.native?.selectedAudio, backend: description.backend, hybrid: description.bindings.some(binding => binding.providers.some(provider => provider.provider === 'mpv-hybrid')) });
        const absent = required.filter(path => !this.has(path));
        if (absent.length)
            return 'Required provider runtime assets are not deployed: ' + absent.join(', ');
        const recipe = resolvableExecutionRecipe(planId, runtime);
        const resolution = resolveProviderRecipe(recipe, this.deployment.catalog, this.evidence(recipe, scope), scope);
        return resolution.state === 'pending' || resolution.state === 'available' ? undefined
            : providerResolutionError([resolution])?.message ?? 'No qualified deployed composition';
    }
    async bytes(path) {
        await this.load();
        this.controller.signal.throwIfAborted();
        path = this.assetPath(path);
        if (this.shared) {
            const asset = this.sharedAsset(path);
            return awaitRuntime(runtimeAccess(this.shared).read(this.sharedSnapshot, asset, false), this.controller.signal);
        }
        const admission = admitRuntimeRequest(this.state, 'bytes', path);
        this.state = admission.state;
        if (admission.effect === 'retired')
            throw this.controller.signal.reason;
        if (admission.effect === 'unavailable')
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `No qualified provider owns required asset: ${path}`);
        let pending = this.acquiredBytes.get(path);
        if (admission.effect === 'start') {
            let resolve, reject;
            pending = new Promise((yes, no) => { resolve = yes; reject = no; });
            this.acquiredBytes.set(path, pending);
            void this.acquire(path).then(value => { this.state = completeRuntimeRequest(this.state, 'bytes', path, true); resolve(value); }, error => { this.state = completeRuntimeRequest(this.state, 'bytes', path, false); reject(error); });
        }
        const bytes = await pending;
        this.controller.signal.throwIfAborted();
        return bytes.slice(0);
    }
    async acquire(path) {
        const ownership = runtimeAssetOwner(this.state, new URL(path, this.base).href);
        if (ownership.kind === 'absent')
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `Required provider asset is not deployed: ${path}`);
        if (ownership.kind !== 'ready')
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `No qualified provider owns required asset: ${path}`);
        return this.assets.readAsset(ownership.providerId, ownership.implementationIdentity, ownership.assetId);
    }
    async module(path) {
        await this.load();
        this.controller.signal.throwIfAborted();
        path = this.assetPath(path);
        if (this.shared) {
            const asset = this.sharedAsset(path);
            return awaitRuntime(runtimeAccess(this.shared).read(this.sharedSnapshot, asset, true), this.controller.signal);
        }
        const admission = admitRuntimeRequest(this.state, 'module', path);
        this.state = admission.state;
        if (admission.effect === 'retired')
            throw this.controller.signal.reason;
        if (admission.effect === 'unavailable')
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', `No qualified provider owns required asset: ${path}`);
        let pending = this.modules.get(path);
        if (admission.effect === 'start') {
            let resolve, reject;
            pending = new Promise((yes, no) => { resolve = yes; reject = no; });
            this.modules.set(path, pending);
            void this.bytes(path).then(async (data) => {
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
            }).then(module => { this.state = completeRuntimeRequest(this.state, 'module', path, true); resolve(module); }, error => { this.state = completeRuntimeRequest(this.state, 'module', path, false); reject(error); });
        }
        return pending;
    }
    sharedAsset(path) {
        const owner = runtimeAssetOwner(this.state, new URL(path, this.base).href);
        if (owner.kind !== 'ready')
            throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'No qualified provider owns required asset: ' + path);
        return owner.assetId;
    }
    destroy() {
        if (this.destruction)
            return this.destruction;
        this.state = retireProviderRuntime(this.state);
        this.destruction = Promise.resolve().then(async () => { await this.loading?.catch(() => { }); try {
            await this.assets?.dispose();
        }
        finally {
            this.state = closeProviderRuntime(this.state);
            this.modules.clear();
            this.acquiredBytes.clear();
        } });
        this.controller.abort(new DOMException('Provider deployment disposed', 'AbortError'));
        return this.destruction;
    }
}
