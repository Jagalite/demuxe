// SPDX-License-Identifier: Apache-2.0
/** Finite execution plans; qualification is local to a feature, not a browser claim. */
export const PLAYBACK_PLANS = Object.freeze([
    { id: 'native-direct', mode: 'native', video: 'browser', audio: 'original', qualification: 'existing' },
    { id: 'native-remux', mode: 'native', video: 'packet-copy', audio: 'packet-copy', qualification: 'existing' },
    { id: 'native-direct-gain', mode: 'native', video: 'browser', audio: 'web-audio-gain', qualification: 'experimental' },
    { id: 'shaka-mse', mode: 'native', video: 'browser-mse', audio: 'browser-mse', qualification: 'runtime-verified' },
    { id: 'shaka-mse-gain', mode: 'native', video: 'browser-mse', audio: 'browser-mse+web-audio-gain', qualification: 'runtime-verified' },
    { id: 'native-remux-gain', mode: 'native', video: 'packet-copy', audio: 'web-audio-gain', qualification: 'experimental' },
    { id: 'native-flac', mode: 'native', video: 'packet-copy', audio: 'flac-lossless', qualification: 'experimental' },
    { id: 'native-flac-gain', mode: 'native', video: 'packet-copy', audio: 'flac-lossless+web-audio-gain', qualification: 'experimental' },
    { id: 'native-direct-ass', mode: 'native', video: 'browser', audio: 'original', qualification: 'experimental' },
    { id: 'native-direct-ass-gain', mode: 'native', video: 'browser', audio: 'original+web-audio-gain', qualification: 'experimental' },
    { id: 'native-remux-ass', mode: 'native', video: 'packet-copy', audio: 'packet-copy', qualification: 'experimental' },
    { id: 'native-remux-ass-gain', mode: 'native', video: 'packet-copy', audio: 'packet-copy+web-audio-gain', qualification: 'experimental' },
    { id: 'native-flac-ass', mode: 'native', video: 'packet-copy', audio: 'flac-lossless', qualification: 'experimental' },
    { id: 'native-flac-ass-gain', mode: 'native', video: 'packet-copy', audio: 'flac-lossless+web-audio-gain', qualification: 'experimental' },
    { id: 'native-opus', mode: 'native', video: 'packet-copy', audio: 'opus-lossy', qualification: 'experimental' },
    { id: 'native-opus-gain', mode: 'native', video: 'packet-copy', audio: 'opus-lossy+web-audio-gain', qualification: 'experimental' },
    { id: 'hybrid', mode: 'hybrid', video: 'webcodecs', audio: 'mpv', qualification: 'existing' },
    { id: 'hybrid-audio-filter', mode: 'hybrid', video: 'webcodecs', audio: 'mpv-filter', qualification: 'experimental' },
    { id: 'hybrid-gain', mode: 'hybrid', video: 'webcodecs', audio: 'mpv+web-audio-gain', qualification: 'experimental' },
    { id: 'hybrid-audio-filter-gain', mode: 'hybrid', video: 'webcodecs', audio: 'mpv-filter+web-audio-gain', qualification: 'experimental' },
    { id: 'software-gain', mode: 'software', video: 'ffmpeg', audio: 'mpv+web-audio-gain', qualification: 'experimental' },
    { id: 'software', mode: 'software', video: 'ffmpeg', audio: 'mpv', qualification: 'existing' },
].map(plan => Object.freeze({ ...plan,
    owners: Object.freeze({ video: plan.mode === 'native' ? 'browser-media-element' : plan.mode === 'hybrid' ? 'browser-webcodecs' : 'ffmpeg', audio: plan.mode === 'native' ? 'browser-media-element' : 'mpv-pcm-worklet', subtitle: plan.id.startsWith('shaka-') ? 'shaka-text' : plan.id.includes('-ass') ? 'independent-libass' : plan.mode === 'native' ? 'browser-text-track' : 'mpv', demux: plan.id.startsWith('shaka-') ? 'shaka-manifest-segments-mse' : plan.mode === 'native' ? (plan.id.startsWith('native-direct') ? 'browser' : 'ffmpeg-preparation') : 'mpv', presentation: plan.mode === 'native' ? 'browser-media-element' : 'demuxe-retained-frame' }),
    source: plan.id.startsWith('shaka-') ? 'authorized HLS/DASH adaptive source' : (plan.id.startsWith('native-remux') || plan.id.startsWith('native-flac') || plan.id.startsWith('native-opus')) ? 'qualified random-access file and selected codec packaging' : plan.mode === 'native' ? 'browser-supported source and selected tracks' : 'existing mpv source/track contract',
    prerequisites: plan.id.startsWith('shaka-') ? 'MSE and lazy Shaka runtime; qualified browser codecs' : (plan.id.startsWith('native-remux') || plan.id.startsWith('native-flac') || plan.id.startsWith('native-opus')) ? 'MSE, cross-origin isolation, qualified MIME' : plan.mode === 'native' ? 'HTMLMediaElement' + (plan.id.endsWith('gain') ? ', Web Audio and CORS-clean media' : '') : 'cross-origin isolation' + (plan.mode === 'hybrid' ? ', supported complete WebCodecs configuration' : ''),
    subtitles: plan.id.startsWith('shaka-') ? 'Shaka manifest text selection and rendering' : plan.id.includes('-ass') ? 'external ASS/SSA via pinned libass; container presentation only' : plan.mode === 'native' ? 'browser text tracks' : 'mpv/libass',
    fidelity: plan.id.startsWith('native-opus') ? 'Explicitly permitted lossy audio; no resampling/downmix; video copied' : plan.id.startsWith('native-flac') ? 'Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample' : 'No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply',
    resources: plan.id.startsWith('shaka-') ? 'Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque' : plan.mode === 'native' ? 'existing bounded remux buffers when used; browser decoder allocations are opaque' : 'existing mpv allocation, PCM ring and retained-frame limits',
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
export function executionPlan(mode, packaging, audioFilter, gain = 1, nativeASS = false) {
    if (mode === 'native' && packaging === 'shaka-mse')
        return PLAYBACK_PLANS.find(plan => plan.id === (gain !== 1 ? 'shaka-mse-gain' : 'shaka-mse'));
    let id = (mode === 'native' ? packaging === 'adapted-opus' ? gain !== 1 ? 'native-opus-gain' : 'native-opus' : packaging === 'adapted-flac' ? gain !== 1 ? 'native-flac-gain' : 'native-flac' : packaging === 'remux' ? gain !== 1 ? 'native-remux-gain' : 'native-remux' : gain !== 1 ? 'native-direct-gain' : 'native-direct' : mode === 'hybrid' ? audioFilter ? gain !== 1 ? 'hybrid-audio-filter-gain' : 'hybrid-audio-filter' : gain !== 1 ? 'hybrid-gain' : 'hybrid' : gain !== 1 ? 'software-gain' : 'software');
    if (mode === 'native' && nativeASS)
        id = gain !== 1 ? id.replace(/-gain$/, '-ass-gain') : id + '-ass';
    return PLAYBACK_PLANS.find(plan => plan.id === id);
}
/** Admission is executable and deliberately finite. Runtime output verification
 * still owns acceptance; browser capability signals cannot prove presentation. */
export function planAdmission(f) {
    return PLAYBACK_PLANS.map(plan => {
        let code, reason;
        const reject = (c, r) => { code = c; reason = r; };
        const gain = plan.id.endsWith('-gain'), ass = plan.id.includes('-ass'), flac = plan.id.startsWith('native-flac'), opus = plan.id.startsWith('native-opus');
        const effect = featureRejection(plan.mode, { ...f });
        if (effect)
            reject('FEATURE_UNSUPPORTED', effect);
        else if (gain !== (f.gain !== 1))
            reject('PLAN_NOT_REQUESTED', 'Gain stage does not match the requested presentation');
        else if (gain && !f.webAudio)
            reject('DEPLOYMENT_UNAVAILABLE', 'Web Audio is unavailable');
        else if (plan.id.startsWith('shaka-')) {
            if (!f.manifest)
                reject('SOURCE_UNSUPPORTED', 'Shaka is only used for adaptive HLS/DASH sources');
            else if (!f.mse)
                reject('DEPLOYMENT_UNAVAILABLE', 'Shaka requires MediaSource');
            else if (f.audioOutput !== 'stereo')
                reject('FEATURE_UNSUPPORTED', 'Explicit PCM layout requires mpv');
            else if (f.externalFormats.length || f.browserTextTracks)
                reject('QUALIFICATION_REQUIRED', 'External attachments are not qualified on Shaka manifest timelines');
            else if (f.shakaSourceRejection)
                reject('SOURCE_UNSUPPORTED', f.shakaSourceRejection);
        }
        else if (plan.mode !== 'native' && f.manifest && f.streamingFallbackRejection)
            reject('FEATURE_UNSUPPORTED', f.streamingFallbackRejection);
        else if (plan.mode !== 'native' && !f.isolated)
            reject('ISOLATION_REQUIRED', 'mpv deployment requires cross-origin isolation');
        else if (plan.mode === 'hybrid' && f.hybridSourceRejection)
            reject('QUALIFICATION_REQUIRED', f.hybridSourceRejection);
        else if (plan.mode === 'hybrid' && !f.webCodecs)
            reject('DEPLOYMENT_UNAVAILABLE', 'WebCodecs video decoding is unavailable');
        else if (plan.mode === 'hybrid' && plan.id.includes('audio-filter') !== !!f.af)
            reject('PLAN_NOT_REQUESTED', 'mpv scalar filter stage does not match the request');
        else if (plan.mode !== 'native' && f.browserTextTracks)
            reject('FEATURE_UNSUPPORTED', 'External browser text tracks cannot be silently discarded');
        else if (plan.mode === 'native') {
            const prepared = plan.id.startsWith('native-remux') || flac || opus;
            if (f.audioOutput !== 'stereo')
                reject('FEATURE_UNSUPPORTED', 'Explicit PCM layout requires mpv');
            else if (ass !== f.externalFormats.some(format => format !== 'browser-vtt'))
                reject('PLAN_NOT_REQUESTED', 'Subtitle component does not match the requested presentation');
            else if (f.externalFormats.includes('browser-vtt') && (flac || opus))
                reject('QUALIFICATION_REQUIRED', 'Plain file captions with adapted audio require separate qualification');
            else if (f.externalFormats.includes('browser-vtt') && f.manifest)
                reject('QUALIFICATION_REQUIRED', 'File captions are not qualified on manifest timelines');
            else if (ass && (!f.nativeASS || f.externalFormats.some(format => !['ass', 'ssa'].includes(format))))
                reject('FEATURE_UNSUPPORTED', 'External subtitle format requires mpv or explicit Native ASS admission');
            else if (ass && f.manifest)
                reject('QUALIFICATION_REQUIRED', 'Native ASS is qualified only on file presentations');
            else if (ass && !f.isolated)
                reject('ISOLATION_REQUIRED', 'Native libass requires cross-origin isolation');
            else if (prepared && f.manifest)
                reject('QUALIFICATION_REQUIRED', 'File preparation is not qualified for manifest sources');
            else if (prepared && !f.isolated)
                reject('ISOLATION_REQUIRED', 'Native preparation requires cross-origin isolation');
            else if (prepared && (f.nativeRemux === 'never' || !f.mse))
                reject('DEPLOYMENT_UNAVAILABLE', 'Native preparation requires permitted MSE and cross-origin isolation');
            else if (!prepared && (f.nativeRemux === 'always' || f.requiresRemux))
                reject('SOURCE_UNSUPPORTED', 'This source policy requires controlled remux transport');
            else if ((flac || opus) && (f.automatic ? (!flac || !f.automaticLossless) : f.adaptation !== (flac ? 'flac' : 'opus')))
                reject('QUALIFICATION_REQUIRED', 'Audio adaptation requires explicit profile or qualified automatic lossless policy');
            else if (opus && !f.allowLossy)
                reject('POLICY_PROHIBITS_TRANSFORM', 'Lossy audio permission is absent');
            else if (flac && f.automatic && !f.adaptationSourceQualified)
                reject('SOURCE_UNSUPPORTED', f.adaptationSourceRejection ?? 'Automatic FLAC source has not been qualified');
            else if (f.nativeSourceRejection)
                reject(f.nativeSourceRejection.startsWith('Native eligibility could not') ? 'QUALIFICATION_REQUIRED' : 'SOURCE_UNSUPPORTED', f.nativeSourceRejection);
            else if (plan.id.startsWith('native-remux') && f.remuxSourceRejection)
                reject('QUALIFICATION_REQUIRED', f.remuxSourceRejection);
        }
        return { id: plan.id, mode: plan.mode, eligible: !code, ...(code ? { code, reason } : {}) };
    });
}
