// SPDX-License-Identifier: Apache-2.0
export function createProviderRuntime(qualified) {
    return Object.freeze({ phase: 'idle', loadStarted: false, cancelled: false, deadline: 0, manifestBytes: 0, qualified: Object.freeze({ ...qualified }), providers: Object.freeze([]), assets: Object.freeze([]), requests: Object.freeze([]) });
}
export function admitRuntimeLoad(state, now) {
    if (state.loadStarted)
        return Object.freeze({ state, effect: 'join' });
    if (state.cancelled || state.phase === 'retiring' || state.phase === 'closed')
        return Object.freeze({ state: Object.freeze({ ...state, loadStarted: true }), effect: 'retired' });
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'loading', loadStarted: true, deadline: now + 15000 }), effect: 'start' });
}
export function observeRuntimeManifest(state, event) {
    if (state.phase !== 'loading')
        return Object.freeze({ state, effect: 'ignore' });
    if (event.kind === 'failed')
        return Object.freeze({ state: Object.freeze({ ...state, phase: 'failed' }), effect: 'accepted' });
    if (state.cancelled)
        return Object.freeze({ state, effect: 'ignore' });
    if (event.kind === 'deadline')
        return event.now < state.deadline ? Object.freeze({ state, effect: 'ignore' }) : Object.freeze({ state: Object.freeze({ ...state, cancelled: true }), effect: 'abort' });
    const bytes = state.manifestBytes + event.bytes;
    return Object.freeze({ state: Object.freeze({ ...state, manifestBytes: bytes }), effect: bytes > 1024 * 1024 ? 'overflow' : 'accepted' });
}
export function acceptRuntimeDeployment(state, providers, assets) {
    if (state.phase !== 'loading' || state.cancelled)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, phase: 'ready', providers: Object.freeze(providers.map(provider => Object.freeze({ ...provider, assets: Object.freeze([...provider.assets]), profiles: Object.freeze([...provider.profiles]) }))), assets: Object.freeze(assets.map(asset => Object.freeze({ ...asset }))) }), accepted: true });
}
function qualifiedProvider(state, provider) { return provider.manifestMatches && state.qualified[provider.id] === provider.implementationIdentity; }
export function runtimeAssetPath(state, path, url) {
    const declared = state.assets.find(asset => asset.url === url);
    if (declared)
        return declared.path;
    return /^web\/engine-(hybrid|selective|software-full|software-yuv)\/player\.wasm$/.test(path) && state.assets.some(asset => asset.path === 'web/engine-mpv/player.wasm') ? 'web/engine-mpv/player.wasm' : path;
}
export function runtimeAssetOwner(state, url) {
    const asset = state.assets.find(asset => asset.url === url);
    if (!asset)
        return Object.freeze({ kind: 'absent' });
    const provider = state.phase === 'ready' && !state.cancelled ? state.providers.find(provider => provider.assets.includes(asset.id) && qualifiedProvider(state, provider)) : undefined;
    return provider ? Object.freeze({ kind: 'ready', providerId: provider.id, implementationIdentity: provider.implementationIdentity, assetId: asset.id }) : Object.freeze({ kind: 'unqualified' });
}
export function runtimeHasOffer(state, providerId, profile) {
    return state.phase === 'ready' && !state.cancelled && state.providers.some(provider => provider.id === providerId && qualifiedProvider(state, provider) && provider.profiles.includes(profile));
}
export function admitRuntimeRequest(state, kind, path) {
    if (state.phase !== 'ready' || state.cancelled)
        return Object.freeze({ state, effect: 'retired' });
    const asset = state.assets.find(asset => asset.path === path);
    if (!asset || runtimeAssetOwner(state, asset.url).kind !== 'ready')
        return Object.freeze({ state, effect: 'unavailable' });
    if (state.requests.some(request => request.kind === kind && request.path === path))
        return Object.freeze({ state, effect: 'join' });
    return Object.freeze({ state: Object.freeze({ ...state, requests: Object.freeze([...state.requests, Object.freeze({ kind, path, status: 'pending' })]) }), effect: 'start' });
}
export function completeRuntimeRequest(state, kind, path, ok) {
    if (state.phase !== 'ready' || state.cancelled)
        return state;
    return Object.freeze({ ...state, requests: Object.freeze(state.requests.map(request => request.kind === kind && request.path === path && request.status === 'pending' ? Object.freeze({ ...request, status: ok ? 'ready' : 'failed' }) : request)) });
}
export function retireProviderRuntime(state) { return state.phase === 'closed' || state.phase === 'retiring' ? state : Object.freeze({ ...state, phase: 'retiring', cancelled: true }); }
export function closeProviderRuntime(state) { return Object.freeze({ ...state, phase: 'closed', cancelled: true, providers: Object.freeze([]), assets: Object.freeze([]), requests: Object.freeze([]) }); }
export function runtimeCompositionEvidence(state, recipe, scopeKey) {
    return recipe.bindings.filter(binding => binding.providerIds.every(id => Object.prototype.hasOwnProperty.call(state.qualified, id))).map(binding => ({ recipeId: recipe.id, bindingId: binding.id, scopeKey, implementationIdentities: Object.fromEntries(binding.providerIds.map(id => [id, state.qualified[id]])) }));
}
export function requiredRuntimeAssets(input) {
    const required = [];
    if (input.prepared)
        required.push(`web/engine-${input.adaptation ? 'adaptation' : 'remux'}${input.runtime === 'pthread' ? '' : '-' + input.runtime}/remux.wasm`);
    if (input.selectedAudio)
        required.push(input.runtime === 'pthread' ? 'web/engine-selective/player.wasm' : `web/engine-mpv-audio-${input.runtime}/service.wasm`);
    if (input.backend === 'WasmPlayer')
        required.push(...(input.hybrid ? ['web/engine-hybrid/player.wasm'] : ['web/engine-software-full/player.wasm', 'web/engine-software-yuv/player.wasm']), 'fixtures/DejaVuSans.ttf');
    if (input.backend === 'PrivateSoftwarePlayer')
        required.push(`web/engine-mpv-playback-${input.runtime}/player.wasm`, `web/engine-mpv-playback-${input.runtime}/manifest.json`, `web/engine-mpv-playback-${input.runtime}/player.mjs`, 'fixtures/DejaVuSans.ttf');
    return Object.freeze(required);
}
export function captureRuntimeProbe(probe) { return Object.freeze({ format: probe.format, tracks: Object.freeze(probe.tracks.map(track => Object.freeze({ id: track.id, index: track.index, type: track.type, codec: track.codec, attachedPicture: track.attachedPicture, default: track.default, sampleRate: track.sampleRate, channels: track.channels }))) }); }
export function codecProfile(profile, runtime) {
    const folder = 'web/providers/preparation/' + profile + '-' + runtime + '/';
    return Object.freeze({ providerId: 'ffmpeg-' + profile + '-' + runtime, folder, wasmPath: folder + 'engine-adaptation-' + runtime + '/remux.wasm', runtime });
}
export function selectCodecInspector(runtime, availability) {
    if (runtime === 'pthread')
        return;
    const available = availability.find(item => item.offered && item.deployed);
    return available ? codecProfile(available.profile, runtime) : undefined;
}
export function selectCodecPreparation(input, availability) {
    const { probe, runtime } = input;
    if (runtime === 'pthread' || !input.local || !input.file || !probe?.format?.split(',').includes('matroska'))
        return;
    const videos = probe.tracks.filter(track => track.type === 'video' && !track.attachedPicture), audios = probe.tracks.filter(track => track.type === 'audio');
    if (videos.length !== 1 || !audios.length || !['h264', 'hevc'].includes(videos[0].codec))
        return;
    const audio = input.aid === 'no' ? undefined : input.aid === 'auto' ? (audios.find(track => track.default) ?? audios[0]) : audios.find(track => track.id === input.aid);
    if (!audio || audio.sampleRate !== 48000 || ![2, 6, 8].includes(audio.channels ?? 0))
        return;
    const profile = audio.codec === 'truehd' || audio.codec === 'mlp' && audio.channels !== 8 ? 'truehd-mlp' : audio.codec === 'dts' && audio.channels === 8 ? 'dts-hd' : ['ac3', 'eac3'].includes(audio.codec) && [2, 6].includes(audio.channels ?? 0) ? 'ac3-eac3' : undefined;
    if (!profile || !availability.some(item => item.profile === profile && item.offered && item.deployed))
        return;
    return Object.freeze({ ...codecProfile(profile, runtime), audioIndex: audio.index, videoIndex: videos[0].index });
}
/** The shell keeps this detached per-source value in a WeakMap, never a global
 * strong index of media objects. Failed reselection clears only the hint. */
export function updateCodecSource(previous, input, availability) {
    const hint = selectCodecPreparation(input, availability);
    return Object.freeze({ hint: hint ?? null, probe: hint ? captureRuntimeProbe(input.probe) : previous?.probe ?? null });
}
export function storedCodecPreparation(state, runtime, deployed) { return state?.hint?.runtime === runtime && deployed ? state.hint : undefined; }
export function selectAudioRepair(input) {
    const { probe } = input;
    if (!input.local || !input.blob || input.size > 64 * 1024 * 1024 || !probe?.format?.split(',').includes('matroska') || probe.tracks.length !== 2)
        return;
    const video = probe.tracks.find(track => track.type === 'video'), audio = probe.tracks.find(track => track.type === 'audio');
    if (video?.codec !== 'h264' || !audio || audio.sampleRate !== 48000 || ![2, 6, 8].includes(audio.channels ?? 0))
        return;
    const codec = audio.codec === 'truehd' ? 'truehd' : audio.codec === 'mlp' ? 'mlp' : audio.codec === 'dts' && audio.channels === 8 ? 'dts-hd' : undefined;
    if (!codec || codec === 'mlp' && audio.channels === 8 || !input.container || !input.flac || !(codec === 'dts-hd' ? input.dts : input.truehd))
        return;
    return Object.freeze({ codec, channels: audio.channels });
}
/** Compare only candidates for the same admitted requirements. Earlier rules
 * break conflicts between capabilities; ties preserve the caller's baseline.
 * Multiple owners of one capability must all satisfy its preference. */
export function compareProviderPreferences(a, b, preferences) {
    for (const rule of preferences) {
        const rank = (assignments) => {
            const owners = assignments.filter(a => a.requirements.some(r => r.capability === rule.capability));
            return owners.length ? Math.max(...owners.map(a => {
                const index = rule.providers.indexOf(a.providerId);
                return index < 0 ? rule.providers.length : index;
            })) : rule.providers.length;
        };
        const difference = rank(a) - rank(b);
        if (difference)
            return difference;
    }
    return 0;
}
