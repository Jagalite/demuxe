// SPDX-License-Identifier: Apache-2.0
const original = { capability: 'media.present.original', version: 1, profile: 'selected-source' };
const prepared = { capability: 'media.present.prepared', version: 1, profile: 'selected-streams' };
const complete = { capability: 'media.play.complete', version: 1, profile: 'source-tracks' };
const adaptive = { capability: 'media.play.adaptive', version: 1, profile: 'authorized-manifest' };
const selectedAudio = { capability: 'audio.present.selected', version: 1, profile: 'stereo-synchronized' };
const embedded = { capability: 'subtitle.render', version: 1, profile: 'embedded-file' };
const external = { capability: 'subtitle.render', version: 1, profile: 'external-file' };
const scalarGain = { capability: 'audio.gain', version: 1, profile: 'scalar' };
// Helpers build inert descriptions only. Only the explicit plan table below
// defines compositions; none of these helpers are exported as a graph builder.
function native(preparation) {
    if (!preparation)
        return {
            requirements: [original], backend: 'NativePlayer',
            native: { transport: 'original', selectedAudio: false, subtitles: 'none', mseOwner: 'auto' },
            bindings: [{ id: 'original', owner: 'NativePlayer.loadPlan', providers: [{ provider: 'browser-original', request: original }] }],
            synchronizationOwner: 'NativePlayer / HTMLMediaElement', features: { gain: false, audioFilter: false },
        };
    const request = { capability: 'media.prepare.file', version: 1, profile: preparation };
    const providers = [
        { provider: 'ffmpeg-file-preparation', request },
        { provider: 'browser-prepared', request: prepared },
    ];
    const bindings = [
        { id: 'ffmpeg', owner: 'NativePlayer.startRemux / existing FFmpeg preparation path', providers },
    ];
    if (preparation !== 'opus-permitted')
        for (const runtime of ['jspi', 'asyncify'])
            bindings.push({
                id: 'ffmpeg-' + runtime, owner: 'NativePlayer.startRemux / explicit private runtime', providers: [
                    { provider: runtime === 'jspi' ? 'ffmpeg-file-preparation-jspi' : 'ffmpeg-file-preparation-asyncify', request: { capability: 'media.prepare.file', version: 1, profile: preparation } },
                    { provider: 'browser-prepared', request: prepared },
                ],
            });
    // This pre-existing local MP4 path is conditional, not a universal second
    // implementation. Its exact guard, trial and restoration stay in startRemux.
    if (preparation === 'packet-copy')
        bindings.push({
            id: 'selected-mp4-view',
            owner: 'NativePlayer.startRemux / existing local selectedMP4View trial',
            providers: [
                { provider: 'selected-mp4-view', request: { capability: 'media.prepare.file', version: 1, profile: 'packet-copy' } },
                { provider: 'browser-prepared', request: prepared },
            ],
        });
    return {
        requirements: [request, prepared], backend: 'NativePlayer', bindings,
        native: { transport: 'prepared', selectedAudio: preparation === 'video-only', subtitles: 'none', mseOwner: preparation === 'video-only' ? 'window' : 'auto',
            adaptation: preparation === 'flac-lossless' ? 'flac' : preparation === 'flac24' ? 'flac24' : preparation === 'opus-permitted' ? 'opus' : undefined },
        synchronizationOwner: 'NativePlayer / HTMLMediaElement', features: { gain: false, audioFilter: false },
    };
}
function atomic(provider, audioFilter = false) {
    return {
        requirements: [complete], backend: 'WasmPlayer',
        bindings: [{ id: provider, owner: 'UnifiedPlayer.create / existing WasmPlayer configuration', providers: [{ provider, request: complete }] }],
        synchronizationOwner: 'WasmPlayer / mpv timing and retained presentation', features: { gain: false, audioFilter },
    };
}
function append(base, binding) {
    return {
        ...base, requirements: [...base.requirements, binding.request],
        bindings: base.bindings.map(variant => ({ ...variant, providers: [...variant.providers, binding] })),
    };
}
function gain(base) {
    return { ...append(base, { provider: 'web-audio-gain', request: scalarGain }), features: { ...base.features, gain: true } };
}
function subtitles(base, kind) {
    const composed = append(base, kind === 'embedded'
        ? { provider: 'mpv-embedded-subtitles', request: embedded }
        : { provider: 'mpv-external-subtitles', request: external });
    // Preserve the specific legacy window-MSE request for native-remux-mpv.
    // Transcode+mpv used auto; do not generalize this to all subtitle recipes.
    return { ...composed, native: base.native ? { ...base.native, subtitles: kind,
            mseOwner: kind === 'embedded' && base.requirements.some(r => r.capability === 'media.prepare.file' && r.profile === 'packet-copy') ? 'window' : base.native.mseOwner } : undefined };
}
const direct = native();
const copy = native('packet-copy');
const flac = native('flac-lossless');
const opus = native('opus-permitted');
const flac24 = native('flac24');
const splitAudio = {
    ...append(native('video-only'), { provider: 'mpv-selected-audio', request: selectedAudio }),
    // Runtime implementations do NOT have interchangeable clock contracts.
    synchronizationOwner: 'NativeMpvAudio (pthread) / NativePrivateMpvAudio (JSPI or Asyncify), chosen by existing openServices',
};
const shaka = {
    requirements: [adaptive], backend: 'ShakaBackend',
    bindings: [{ id: 'shaka', owner: 'ShakaBackend', providers: [{ provider: 'shaka-adaptive', request: adaptive }] }],
    synchronizationOwner: 'ShakaBackend / HTMLMediaElement', features: { gain: false, audioFilter: false },
};
const hybrid = atomic('mpv-hybrid');
const hybridFilter = atomic('mpv-hybrid', true);
const software = atomic('mpv-software');
function freezeDescription(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            freezeDescription(child);
        Object.freeze(value);
    }
    return value;
}
/** Source-based inventory including the integrated mpv attachment migration.
 * NOT an admission list, resolver, asset
 * loader or evidence record. PLAYBACK_PLANS remains the ordered policy owner.
 * Runtime, presenter, selected tracks, source access, subtitles, filters and
 * actual output still require their existing per-source admission/verification.
 * Execution reads backend/native configuration; admission remains independent.
 * Record<> intentionally makes added/removed plan IDs a compile-time review
 * point whenever the ordered policy changes.
 */
export const EXECUTION_RECIPES = freezeDescription({
    'native-direct-mpv': subtitles(direct, 'embedded'),
    'native-direct': direct,
    'native-remux-mpv': subtitles(copy, 'embedded'),
    'native-remux': copy,
    'native-direct-gain': gain(direct),
    'shaka-mse': shaka,
    'shaka-mse-gain': gain(shaka),
    'native-remux-gain': gain(copy),
    'native-flac': flac,
    'native-flac-gain': gain(flac),
    'native-direct-ass': subtitles(direct, 'external'),
    'native-direct-ass-gain': gain(subtitles(direct, 'external')),
    'native-remux-ass': subtitles(copy, 'external'),
    'native-remux-ass-gain': gain(subtitles(copy, 'external')),
    'native-flac-ass': subtitles(flac, 'external'),
    'native-flac-ass-gain': gain(subtitles(flac, 'external')),
    'native-opus': opus,
    'native-opus-gain': gain(opus),
    'native-transcode-mpv': subtitles(flac24, 'embedded'),
    'native-transcode-ass': subtitles(flac24, 'external'),
    'native-transcode': flac24,
    'native-video-mpv-audio': splitAudio,
    'native-video-mpv-audio-subtitles': subtitles(splitAudio, 'embedded'),
    'hybrid': hybrid,
    'hybrid-audio-filter': hybridFilter,
    'hybrid-gain': gain(hybrid),
    'hybrid-audio-filter-gain': gain(hybridFilter),
    'software-gain': gain(software),
    'software': software,
});
/** Total lookup for untrusted diagnostic strings; never accepts prototype keys. */
export function executionRecipe(planId) {
    return planId !== undefined && Object.prototype.hasOwnProperty.call(EXECUTION_RECIPES, planId)
        ? EXECUTION_RECIPES[planId] : undefined;
}
/** Adapter for deployment/shadow resolution. Does not supply qualification:
 * source/runtime-specific evidence must still come from the admission owner.
 */
export function resolvableExecutionRecipe(planId, runtime) {
    const recipe = EXECUTION_RECIPES[planId];
    return { id: planId, requirements: recipe.requirements, bindings: recipe.bindings.filter(binding => !runtime || !binding.id.startsWith('ffmpeg') || binding.id === (runtime === 'pthread' ? 'ffmpeg' : 'ffmpeg-' + runtime)).map(binding => ({
            id: binding.id,
            assignments: binding.providers.map(provider => ({ providerId: provider.provider, requirements: [provider.request] })),
        })) };
}
