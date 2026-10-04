// SPDX-License-Identifier: Apache-2.0
import { compareProviderPreferences } from './provider-runtime.js';
export function initialNativeLoad() { return Object.freeze({ work: null, adapted: false, directFailure: undefined }); }
export function nativeLoadOpening(state) { return state.work?.phase === 'plan' || state.work?.phase === 'rollback'; }
export function nativeLoadCurrent(state, request) { return state.work?.request.id === request.id && state.work.request.epoch === request.epoch; }
export function beginNativeLoad(state, request, kind, policy, position, paused) { return Object.freeze({ ...state, work: Object.freeze({ request: Object.freeze({ ...request }), kind, phase: 'plan', policy: Object.freeze({ ...policy }), position, paused, attemptedAdaptation: false }) }); }
export function retireNativeLoad(state) { return state.work ? Object.freeze({ ...state, work: null }) : state; }
export function selectNativeLoadRoute(policy) {
    if (policy.requested)
        return Object.freeze({ route: policy.original ? 'direct' : 'remux' });
    if (policy.remux !== 'always' && !policy.requiresRemux)
        return Object.freeze({ route: 'direct' });
    if (policy.remux === 'never')
        return Object.freeze({ error: 'Native direct cannot enforce these source permissions; enable native remux or choose Hybrid' });
    return Object.freeze({ route: 'remux' });
}
export function selectNativePreparation(facts) { return Object.freeze({ audio: !facts.codecEngine && facts.file && facts.adaptation === 'flac24' && !facts.selectiveAudio && !facts.embeddedSubtitles && !facts.externalSubtitles && facts.prepareAudio, mp4: facts.file && !facts.adaptation && !facts.selectiveAudio && !preferBroadRemux(facts) }); }
export function transitionNativeLoad(state, request, event) {
    const result = (next, extra = {}, accepted = true) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), accepted, ...extra });
    if (!nativeLoadCurrent(state, request))
        return result(state, {}, false);
    const work = state.work;
    if (event.type === 'finish')
        return result({ ...state, work: null });
    if (event.type === 'direct-failed') {
        const fallback = !work.policy.requested && work.policy.remux !== 'never' && [3, 4].includes(event.code ?? 0);
        return fallback ? result({ ...state, directFailure: event.reason }, { fallback }) : result(state, { fallback });
    }
    if (event.type === 'projection-failed')
        return result({ ...state, directFailure: event.reason });
    if (event.type === 'attempt')
        return result({ ...state, adapted: event.adapted, work: Object.freeze({ ...work, attemptedAdaptation: work.attemptedAdaptation || event.adapted }) });
    if (event.type === 'attempt-failed')
        return result(state, { fallback: !work.policy.requested && !!work.policy.adaptation && !work.attemptedAdaptation && event.reason.includes('Audio codec has no browser MP4 packet contract') });
    if (event.type === 'services')
        return result({ ...state, work: Object.freeze({ ...work, phase: 'services' }) });
    if (event.type === 'track-failed')
        return work.kind === 'audio-track' && work.phase === 'plan' ? result({ ...state, work: Object.freeze({ ...work, phase: 'rollback' }) }, { rollback: true, position: work.position }) : result(state, { rollback: false });
    if (work.kind !== 'audio-track' || work.phase === 'resuming')
        return result(state, {}, false);
    return result({ ...state, work: Object.freeze({ ...work, phase: 'resuming' }) }, { resume: !work.paused });
}
function preferBroadRemux(facts) {
    if (!facts.broadAvailable || !facts.providerPreferences?.length)
        return false;
    const assignment = (providerId) => [{ providerId, requirements: [{ capability: 'media.prepare.file', version: 1, profile: 'packet-copy' }] }];
    const broad = 'ffmpeg-file-preparation' + (!facts.runtime || facts.runtime === 'pthread' ? '' : '-' + facts.runtime);
    return compareProviderPreferences(assignment(broad), assignment('selected-mp4-view'), facts.providerPreferences) < 0;
}
