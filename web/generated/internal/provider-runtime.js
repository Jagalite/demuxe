// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { parseProviderDeployment, withProviderAvailability } from './provider-catalog.js';
import { ProviderAcquisition } from './provider-acquisition.js';
import { resolvableExecutionRecipe, executionRecipe } from './execution-recipes.js';
import { resolveProviderRecipe } from './provider-resolution.js';
import { audioRepairRecipe } from './component-recipes.js';
import { executeComponentBinding } from './component-selection.js';
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
    codecHints = new WeakMap();
    codecProbes = new WeakMap();
    codecInspector(runtime) {
        if (runtime === 'pthread')
            return;
        for (const profile of ['truehd-mlp', 'dts-hd', 'ac3-eac3']) {
            const providerId = 'ffmpeg-' + profile + '-' + runtime, folder = 'web/providers/preparation/' + profile + '-' + runtime + '/', wasmPath = folder + 'engine-adaptation-' + runtime + '/remux.wasm';
            if (this.hasOffer(providerId, 'packet-copy') && this.has(wasmPath))
                return { providerId, folder, wasmPath, runtime };
        }
    }
    codecPreparation(source, probe, runtime, aid = 'auto') {
        const local = source;
        if (local.file instanceof File)
            this.codecHints.delete(local.file);
        if (runtime === 'pthread' || local.kind !== 'local' || !(local.file instanceof File) || !probe || !probe.format?.split(',').includes('matroska'))
            return;
        const videos = probe.tracks.filter(t => t.type === 'video' && !t.attachedPicture), audios = probe.tracks.filter(t => t.type === 'audio');
        if (videos.length !== 1 || !audios.length || !['h264', 'hevc'].includes(videos[0].codec))
            return;
        const audio = aid === 'no' ? undefined : aid === 'auto' ? (audios.find(t => t.default) ?? audios[0]) : audios.find(t => t.id === aid);
        if (!audio || audio.sampleRate !== 48000 || ![2, 6, 8].includes(audio.channels ?? 0))
            return;
        const profile = audio.codec === 'truehd' || audio.codec === 'mlp' && audio.channels !== 8 ? 'truehd-mlp' : audio.codec === 'dts' && audio.channels === 8 ? 'dts-hd' : ['ac3', 'eac3'].includes(audio.codec) && [2, 6].includes(audio.channels ?? 0) ? 'ac3-eac3' : undefined;
        if (!profile)
            return;
        const providerId = 'ffmpeg-' + profile + '-' + runtime, folder = 'web/providers/preparation/' + profile + '-' + runtime + '/', wasmPath = folder + 'engine-adaptation-' + runtime + '/remux.wasm';
        if (!this.hasOffer(providerId, 'flac24') || !this.has(wasmPath))
            return;
        const engine = { providerId, folder, wasmPath, runtime, audioIndex: audio.index, videoIndex: videos[0].index };
        this.codecHints.set(local.file, engine);
        this.codecProbes.set(local.file, probe);
        return engine;
    }
    preparation(file, runtime, audioTrack) {
        let hint = this.codecHints.get(file);
        if (audioTrack !== undefined && audioTrack !== hint?.audioIndex) {
            const probe = this.codecProbes.get(file), audio = probe?.tracks.find(t => t.type === 'audio' && t.index === audioTrack);
            hint = audio ? this.codecPreparation({ kind: 'local', file }, probe, runtime, audio.id) : undefined;
        }
        return hint?.runtime === runtime && this.has(hint.wasmPath) ? hint : undefined;
    }
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
    /** Legacy role names can share the single mpv engine. Prefer an explicitly
     * deployed legacy artifact when both layouts are present. */
    assetPath(path) {
        const url = new URL(path, this.base).href;
        if (this.deployment?.assets.some(asset => asset.url === url))
            return path;
        if (/^web\/engine-(hybrid|selective|software-full|software-yuv)\/player\.wasm$/.test(path)
            && this.deployment?.assets.some(asset => asset.url === new URL('web/engine-mpv/player.wasm', this.base).href))
            return 'web/engine-mpv/player.wasm';
        return path;
    }
    has(path) {
        const url = new URL(this.assetPath(path), this.base).href;
        return !!this.deployment?.assets.some(asset => asset.url === url && this.deployment.catalog.providers.some(p => this.manifestIdentities.has(p.id) && this.qualified[p.id] === p.implementationIdentity && this.deployment.providerAssets[p.id]?.includes(asset.id)));
    }
    hasOffer(providerId, profile) {
        const provider = this.deployment?.catalog.providers.find(p => p.id === providerId);
        return !!provider && this.manifestIdentities.has(provider.id) && this.qualified[providerId] === provider.implementationIdentity && provider.offers.some(o => o.profile === profile);
    }
    /** A bounded implementation choice inside the existing FLAC24 plan. This
     * does not admit new playback plans, tracks, subtitles or output policies. */
    audioRepairCandidate(source, probe) {
        const local = source;
        if (local.kind !== 'local' || !(local.file instanceof Blob) || local.file.size > 64 * 1024 * 1024 || !probe || !probe.format?.split(',').includes('matroska') || probe.tracks.length !== 2)
            return;
        const video = probe.tracks.find(t => t.type === 'video'), audio = probe.tracks.find(t => t.type === 'audio');
        if (!video || video.codec !== 'h264' || !audio || audio.sampleRate !== 48000 || ![2, 6, 8].includes(audio.channels ?? 0))
            return;
        const codec = audio.codec === 'truehd' ? 'truehd' : audio.codec === 'mlp' ? 'mlp' : audio.codec === 'dts' && audio.channels === 8 ? 'dts-hd' : undefined;
        if (!codec || (codec === 'mlp' && audio.channels === 8))
            return;
        const provider = codec === 'dts-hd' ? 'audio-dts-hd' : 'audio-truehd-mlp';
        if (!this.hasOffer('ts-container', 'finite-clear-av') || !this.hasOffer(provider, codec === 'dts-hd' ? 'ma-48khz-s32p' : '48khz-integer') || !this.hasOffer('audio-flac', '48khz-s24'))
            return;
        return { codec, channels: audio.channels };
    }
    audioProfileRejection(error) {
        if (['web/engine-adaptation/remux.wasm', 'web/engine-adaptation-jspi/remux.wasm', 'web/engine-adaptation-asyncify/remux.wasm'].some(path => this.has(path)))
            return;
        throw new PlayerError('DECODE_FAILED', 'Codec preparation profile rejected this source: ' + String(error));
    }
    async prepareAudio(file, signal) {
        await this.load();
        signal = AbortSignal.any([signal, this.controller.signal]);
        signal.throwIfAborted();
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
            const result = await executeComponentBinding(acquisition, recipe, this.evidence(recipe, scope), scope, 'fine', binding => owners.execute(file, candidate.codec, binding, signal, candidate.channels));
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
        return recipe.bindings.filter(binding => binding.assignments.every(a => Object.prototype.hasOwnProperty.call(this.qualified, a.providerId))).map(binding => ({ recipeId: recipe.id, bindingId: binding.id, scopeKey,
            implementationIdentities: Object.fromEntries(binding.assignments.map(a => [a.providerId, this.qualified[a.providerId]])) }));
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
        const required = [];
        if (description.native?.transport === 'prepared')
            required.push(`web/engine-${description.native.adaptation ? 'adaptation' : 'remux'}${runtime === 'pthread' ? '' : '-' + runtime}/remux.wasm`);
        if (description.native?.selectedAudio)
            required.push(runtime === 'pthread' ? 'web/engine-selective/player.wasm' : `web/engine-mpv-audio-${runtime}/service.wasm`);
        if (description.backend === 'WasmPlayer') {
            const hybrid = description.bindings.some(b => b.providers.some(p => p.provider === 'mpv-hybrid'));
            required.push(...(hybrid ? ['web/engine-hybrid/player.wasm'] : ['web/engine-software-full/player.wasm', 'web/engine-software-yuv/player.wasm']), 'fixtures/DejaVuSans.ttf');
        }
        if (description.backend === 'PrivateSoftwarePlayer')
            required.push(`web/engine-mpv-playback-${runtime}/player.wasm`, `web/engine-mpv-playback-${runtime}/manifest.json`, `web/engine-mpv-playback-${runtime}/player.mjs`, 'fixtures/DejaVuSans.ttf');
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
    async module(path) {
        await this.load();
        this.controller.signal.throwIfAborted();
        path = this.assetPath(path);
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
