// SPDX-License-Identifier: Apache-2.0
const stableAudio = (track) => `shaka-audio-${encodeURIComponent(JSON.stringify([track.language, track.originalLanguage, track.label, track.roles, track.spatialAudio, track.accessibilityPurpose]))}`;
export function shakaAudioCatalog(tracks) { return Object.freeze(tracks.map((track, index) => { const base = stableAudio(track), ambiguous = tracks.filter(other => stableAudio(other) === base).length > 1; return Object.freeze({ index, id: ambiguous ? `${base}:ambiguous:${index}` : base, ambiguous }); })); }
function audioKey(language, original, label, roles, spatial, purpose) { return JSON.stringify([language ?? '', original ?? '', label ?? '', roles ?? [], !!spatial, purpose ?? null]); }
function matchesAudio(track, variant) { return audioKey(track.language, track.originalLanguage, track.label, track.roles, track.spatialAudio, track.accessibilityPurpose) === audioKey(variant.audioLanguage ?? variant.language, variant.originalLanguage, variant.label, variant.audioRoles, variant.spatialAudio, variant.accessibilityPurpose) && (!variant.channelsCount || !track.channelsCount || variant.channelsCount === track.channelsCount) && (!variant.audioCodec || !track.codecs || variant.audioCodec === track.codecs); }
function matchesRepresentation(variant, representation) { const token = /^variant:(\d+)$/.exec(representation); return token ? String(variant.id) === token[1] : variant.originalVideoId === representation || (!variant.videoCodec && variant.originalAudioId === representation); }
export function shakaRequestedAudio(tracks, id) {
    if (id === 'no')
        return Object.freeze({ kind: 'disabled' });
    const catalog = shakaAudioCatalog(tracks), candidates = id === 'auto' ? catalog.filter(entry => tracks[entry.index].active) : catalog.filter(entry => entry.id === id);
    if (!tracks.length && id === 'auto')
        return Object.freeze({ kind: 'empty' });
    if (candidates.length !== 1 || (id !== 'auto' && candidates[0].ambiguous))
        return Object.freeze({ kind: 'failure', reason: 'identity' });
    return Object.freeze({ kind: 'selected', index: candidates[0].index });
}
export function shakaSelectAudio(state, tracks, variants, id) {
    const request = shakaRequestedAudio(tracks, id);
    if (request.kind !== 'selected')
        return request;
    const index = request.index, requested = tracks[index], representation = state.runtimeQuality && state.quality.mode === 'manual' ? state.quality.id : state.source?.representation;
    if (representation) {
        const matches = variants.filter(variant => matchesRepresentation(variant, representation) && variant.bandwidth <= (state.source?.maxBandwidth ?? Infinity) && matchesAudio(requested, variant));
        return matches.length === 1 ? Object.freeze({ kind: 'variant', index, variant: matches[0].id, commitQuality: !state.runtimeQuality }) : Object.freeze({ kind: 'failure', reason: 'pin' });
    }
    const policy = state.quality, allowed = variants.some(variant => matchesAudio(requested, variant) && variant.bandwidth <= Math.min(state.source?.maxBandwidth ?? Infinity, policy.mode === 'auto' ? (policy.maxBandwidth ?? Infinity) : Infinity) && (variant.height ?? 0) <= (policy.mode === 'auto' ? (policy.maxHeight ?? Infinity) : Infinity));
    return !allowed && (state.runtimeQuality || state.source?.maxBandwidth !== undefined) ? Object.freeze({ kind: 'failure', reason: 'constraints' }) : Object.freeze({ kind: 'audio', index });
}
export function shakaInitialRepresentation(variants, representation) {
    const active = variants.find(track => track.active), key = (track) => JSON.stringify([track.audioLanguage ?? track.language, track.originalLanguage, track.label, track.audioRoles, track.channelsCount, track.audioCodec, track.spatialAudio, track.accessibilityPurpose]);
    const matches = variants.filter(track => matchesRepresentation(track, representation)).filter(track => !active || key(track) === key(active));
    return matches.length === 1 ? matches[0].id : null;
}
export function shakaSelectText(tracks, id) { return (id === 'auto' ? tracks.find(track => track.active) ?? tracks[0] : tracks.find(track => `shaka-sub-${track.id}` === id))?.id ?? null; }
export function shakaExpectedOutput(variants, audioDisabled) { const active = variants.find(track => track.active); return Object.freeze({ video: !!active?.videoCodec, audio: !!active?.audioCodec && !audioDisabled }); }
