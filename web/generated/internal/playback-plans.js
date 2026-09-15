/** Finite execution plans; qualification is local to a feature, not a browser claim. */
export const PLAYBACK_PLANS = Object.freeze([
    { id: 'native-direct', mode: 'native', video: 'browser', audio: 'original', qualification: 'existing' },
    { id: 'native-remux', mode: 'native', video: 'packet-copy', audio: 'packet-copy', qualification: 'existing' },
    { id: 'native-direct-gain', mode: 'native', video: 'browser', audio: 'web-audio-gain', qualification: 'experimental' },
    { id: 'native-remux-gain', mode: 'native', video: 'packet-copy', audio: 'web-audio-gain', qualification: 'experimental' },
    { id: 'native-flac', mode: 'native', video: 'packet-copy', audio: 'flac-lossless', qualification: 'experimental' },
    { id: 'native-flac-gain', mode: 'native', video: 'packet-copy', audio: 'flac-lossless+web-audio-gain', qualification: 'experimental' },
    { id: 'hybrid', mode: 'hybrid', video: 'webcodecs', audio: 'mpv', qualification: 'existing' },
    { id: 'hybrid-audio-filter', mode: 'hybrid', video: 'webcodecs', audio: 'mpv-filter', qualification: 'experimental' },
    { id: 'software', mode: 'software', video: 'ffmpeg', audio: 'mpv', qualification: 'existing' },
].map(plan => Object.freeze({ ...plan,
    source: (plan.id.startsWith('native-remux') || plan.id.startsWith('native-flac')) ? 'qualified random-access file and selected codec packaging' : plan.mode === 'native' ? 'browser-supported source and selected tracks' : 'existing mpv source/track contract',
    prerequisites: (plan.id.startsWith('native-remux') || plan.id.startsWith('native-flac')) ? 'MSE, cross-origin isolation, qualified MIME' : plan.mode === 'native' ? 'HTMLMediaElement' + (plan.id.endsWith('gain') ? ', Web Audio and CORS-clean media' : '') : 'cross-origin isolation' + (plan.mode === 'hybrid' ? ', supported complete WebCodecs configuration' : ''),
    subtitles: plan.mode === 'native' ? 'browser text tracks' : 'mpv/libass',
    fidelity: plan.id.startsWith('native-flac') ? 'Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample' : 'No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply',
    resources: plan.mode === 'native' ? 'existing bounded remux buffers when used; browser decoder allocations are opaque' : 'existing mpv allocation, PCM ring and retained-frame limits',
    fallback: plan.mode === 'software' ? 'terminal' : 'existing diagnosed-path fallback with source and user intent preserved',
})));
// Only the demonstrated scalar filter is admitted. Expressions, chains, channel
// remapping, resampling, latency-changing filters and video filters are excluded.
export function qualifiedAudioFilter(chain) {
    const match = /^(?:volume=([0-9]+(?:\.[0-9]+)?)|lavfi=\[volume=([0-9]+(?:\.[0-9]+)?)\])$/.exec(chain);
    return !!match && Number(match[1] ?? match[2]) <= 1;
}
export function featureRejection(mode, features) {
    if (mode === 'software')
        return;
    if (features.vf || features.toneMapping !== 'off')
        return 'Video filters and tone mapping require Software. Clear filters before leaving software mode.';
    if (!features.af)
        return;
    if (mode === 'native')
        return 'Audio filters require mpv. Clear filters before selecting Native.';
    if (!features.hybridAudioFilters)
        return 'Hybrid audio filters require explicit experimental admission';
    if (!qualifiedAudioFilter(features.af))
        return 'This audio filter has not been qualified for Hybrid';
}
export function executionPlan(mode, packaging, audioFilter, gain = 1) {
    return PLAYBACK_PLANS.find(plan => plan.id === (mode === 'native' ? packaging === 'adapted-flac' ? gain !== 1 ? 'native-flac-gain' : 'native-flac' : packaging === 'remux' ? gain !== 1 ? 'native-remux-gain' : 'native-remux' : gain !== 1 ? 'native-direct-gain' : 'native-direct' : mode === 'hybrid' && (audioFilter || gain !== 1) ? 'hybrid-audio-filter' : mode));
}
