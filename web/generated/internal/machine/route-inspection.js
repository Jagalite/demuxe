// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
export function initialInspection() { return Object.freeze({ sourceSerial: 0, errorSerial: 0, workSerial: 0, work: null, probe: null, fastSource: null, lossless: null, subtitleAssets: false, selectiveAssets: false, selectiveChecked: false, transcodeAssets: false, transcodeChecked: false, playbackAvailable: false, playbackAssets: undefined, playbackFailure: null }); }
export function transitionInspection(state, change) {
    if (isInspectionWorkChange(change))
        return transitionInspectionWork(state, change);
    switch (change.kind) {
        case 'source.allocate': return Object.freeze({ ...state, sourceSerial: state.sourceSerial + 1 });
        case 'probe': return Object.freeze({ ...state, probe: copyData(change.value) });
        case 'fast': return Object.freeze({ ...state, fastSource: change.source });
        case 'lossless': return Object.freeze({ ...state, lossless: copyData(change.value) });
        case 'assets': return Object.freeze({ ...state, ...copyData(change.value) });
        case 'failure': return Object.freeze({ ...state, errorSerial: state.errorSerial + Number(change.failed), playbackFailure: change.failed ? state.errorSerial + 1 : null });
        case 'restore': return Object.freeze({ ...copyData(change.value), sourceSerial: state.sourceSerial, errorSerial: state.errorSerial, workSerial: state.workSerial });
        case 'reset': {
            const cleared = { subtitleAssets: false, selectiveAssets: false, selectiveChecked: false, transcodeAssets: false, transcodeChecked: false };
            return Object.freeze({ ...state, ...cleared, ...(change.scope === 'assets' ? { playbackAvailable: false, playbackAssets: undefined, playbackFailure: null } : { probe: null }), ...(change.scope === 'initial' ? { fastSource: null, lossless: null, playbackFailure: null } : {}) });
        }
        case 'clear': return Object.freeze({ ...initialInspection(), sourceSerial: state.sourceSerial, errorSerial: state.errorSerial, workSerial: state.workSerial });
    }
}
/** Decisions consume normalized source/configuration facts, never File or DOM handles. */
export function fastInspectionAllowed(facts) {
    return facts.local && !facts.privateDemuxer && (!facts.preserve || facts.componentRepairRetry) && !facts.textTracks && facts.aid === 'auto' && facts.sid === 'auto' && !/\.(?:ogg|oga|opus|ts|m2ts)$/i.test(facts.filename);
}
export function inspectionSelection(probe, facts) {
    const { settings, preserve, mode } = facts;
    let aid = preserve && (mode === 'native' || settings.aid === 'no') ? settings.aid : !facts.hasSource ? settings.aid : 'auto';
    let sid = facts.textTracks ? 'no' : preserve && (mode === 'native' || settings.sid === 'no') ? settings.sid : 'auto';
    if (preserve && mode === 'native' && facts.remuxTracks && !['auto', 'no'].includes(aid))
        aid = probe.tracks.find(t => t.type === 'audio' && t.index === Number(aid) - 1)?.id ?? aid;
    const audio = preserve ? /^audio:stream:(\d+)$/.exec(facts.publicAudio ?? '') : null;
    const subtitle = preserve ? /^sub:stream:(\d+)$/.exec(facts.publicSubtitle ?? '') : null;
    if (subtitle)
        sid = probe.tracks.find(t => t.type === 'sub' && t.index === Number(subtitle[1]))?.id ?? 'missing';
    if (audio)
        aid = probe.tracks.find(t => t.type === 'audio' && t.index === Number(audio[1]))?.id ?? 'missing';
    return Object.freeze({ aid, sid, subtitles: settings.subtitles });
}
export function initialInspectionPolicy(facts) {
    const explicit = !facts.automatic && facts.mode !== 'native';
    return Object.freeze({ privateForced: explicit && facts.privateRemux && (!facts.provider || facts.canInspect) && (facts.mode === 'software' || facts.mode === 'hybrid'), qualityForced: explicit && (!facts.provider || facts.canInspect) && facts.mode === 'software' && (facts.quality !== 'exact' || facts.adaptive) && !facts.inspected, normal: !explicit && facts.start === 0 && (facts.privateRemux || !(facts.videoFilters || facts.audioFilters || facts.toneMapping !== 'off')), manifest: !facts.privateRemux && !!(facts.localDemuxer || facts.remoteDemuxer) || !!facts.remoteFormat && facts.remoteFormat !== 'file' });
}
export function optionalInspectionFallback(facts) {
    return facts.privateRemux && facts.policy === 'auto' && !facts.preserve && !facts.inspectOnly && facts.remote && !facts.identity && facts.aid === 'auto' && facts.sid === 'auto' && !facts.provider && !facts.retired && (facts.assetFailure && !facts.terminalSource || facts.rangeReturnedWhole) && facts.directAdmitted;
}
export function selectInitialInspectionEffect(state) { const work = state.work; return work ? Object.freeze({ kind: work.phase, lease: Object.freeze({ id: work.id, epoch: work.epoch, operation: work.operation }) }) : undefined; }
export function inspectionLeaseCurrent(state, lease) { return !!state.work && state.work.id === lease.id && state.work.epoch === lease.epoch && state.work.operation === lease.operation; }
/** Only normal-inspector failures can request a browser Direct admission check. */
export function inspectionFailureRouteCheck(state, error) {
    const phase = state.work?.phase;
    if (!phase || !['normal-start', 'fast', 'ffmpeg', 'classify', 'assets', 'fast-admission', 'unavailable'].includes(phase))
        return false;
    if (phase === 'fast' && !error.terminalSource && !(error.provider && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(error.code)))
        return false;
    return optionalInspectionFallback(error.optional);
}
function transitionInspectionWork(state, change) {
    if (change.kind === 'work.begin') {
        if (state.work)
            return state;
        const work = Object.freeze({ id: state.workSerial + 1, epoch: change.epoch, operation: change.operation, source: change.source, phase: change.provider ? 'deployment' : 'configure', facts: null, preserve: change.preserve, inspectOnly: change.inspectOnly, componentRepairRetry: false, candidate: null, fast: false, fastFacts: Object.freeze([]), pass: 0, nativeReason: undefined, notice: null });
        return Object.freeze({ ...state, workSerial: work.id, work });
    }
    const work = state.work;
    if (!work || work.id !== change.id)
        return state;
    if (change.kind === 'work.finished')
        return inspectionLeaseCurrent(state, change) ? Object.freeze({ ...state, work: null }) : state;
    const move = (phase, patch = {}, metadata = {}) => Object.freeze({ ...state, ...metadata, work: Object.freeze({ ...work, phase, notice: null, ...patch }) });
    const quality = () => work.facts && initialInspectionPolicy({ ...work.facts, inspected: state.probe?.source === work.source }).qualityForced ? 'quality' : 'replace';
    const afterPrivate = () => work.facts?.mode === 'hybrid' ? 'webgpu' : quality();
    const normal = () => work.facts && initialInspectionPolicy(work.facts).normal ? (initialInspectionPolicy(work.facts).manifest ? 'manifest' : 'normal-start') : 'publish';
    const withoutProbe = () => move('publish', { candidate: null, fast: false, notice: Object.freeze({ outcome: 'skipped', reason: 'Wasm inspection requires cross-origin isolation; browser-native routes remain available' }) });
    switch (change.kind) {
        case 'work.deployed': return work.phase === 'deployment' ? move('configure') : state;
        case 'work.configured': {
            if (work.phase !== 'configure')
                return state;
            const facts = copyData(change.facts), policy = initialInspectionPolicy(facts), explicit = !facts.automatic && facts.mode !== 'native';
            return move(explicit ? (policy.privateForced ? 'private-probe' : facts.mode === 'hybrid' ? 'webgpu' : policy.qualityForced ? 'quality' : 'replace') : 'prepare', { facts }, policy.privateForced ? { playbackFailure: null } : {});
        }
        case 'work.private-probe': return work.phase === 'private-probe' ? move('private-assets', {}, { probe: copyData({ source: work.source, probe: change.probe, settings: change.settings }) }) : state;
        case 'work.private-assets': return work.phase === 'private-assets' ? move(afterPrivate()) : state;
        case 'work.webgpu': return work.phase === 'webgpu' ? move(quality()) : state;
        case 'work.quality': return work.phase === 'quality' ? move('replace', {}, change.probe ? { probe: copyData({ source: work.source, probe: change.probe, settings: change.settings }) } : {}) : state;
        case 'work.prepared': {
            if (work.phase !== 'prepare' || !work.facts)
                return state;
            const reset = work.facts.start === 0 || state.probe?.source !== work.source;
            const metadata = reset ? transitionInspection(state, { kind: 'reset', scope: 'initial' }) : state;
            const fallback = work.facts.start > 0 && metadata.fastSource === work.source;
            return move(fallback ? 'fallback' : normal(), { componentRepairRetry: change.componentRepairRetry }, metadata);
        }
        case 'work.fallback': return work.phase === 'fallback' ? move(normal(), { nativeReason: change.nativeReason }) : state;
        case 'work.manifest': return work.phase === 'manifest' ? move('publish', { nativeReason: change.nativeReason }) : state;
        case 'work.normal-start': return work.phase === 'normal-start' ? (change.fastAllowed ? move('fast') : work.facts?.canInspect ? move('ffmpeg') : withoutProbe()) : state;
        case 'work.fast': {
            if (work.phase !== 'fast')
                return state;
            if (change.probe)
                return move('classify', { candidate: copyData(change.probe), fast: true, fastFacts: Object.freeze([...change.available]), notice: Object.freeze({ outcome: 'selected', reason: `Fast local metadata: ${change.bytes} bytes; routing admission pending` }) });
            return move(work.facts?.canInspect ? 'ffmpeg' : 'unavailable', { notice: Object.freeze({ outcome: 'skipped', reason: `Fast local metadata: ${change.bytes} bytes; ${change.reason}` }) });
        }
        case 'work.unavailable': return work.phase === 'unavailable' ? withoutProbe() : state;
        case 'work.ffmpeg': return work.phase === 'ffmpeg' ? (change.probe ? move('classify', { candidate: copyData(change.probe), fast: false }) : withoutProbe()) : state;
        case 'work.classified': return work.phase === 'classify' && work.candidate ? move('assets', { candidate: null, nativeReason: change.nativeReason }, { probe: copyData({ source: work.source, probe: work.candidate, settings: change.settings }) }) : state;
        case 'work.assets': return work.phase === 'assets' ? move(work.fast ? 'fast-admission' : 'publish') : state;
        case 'work.fast-admission': {
            if (work.phase !== 'fast-admission')
                return state;
            if (change.missing.length) {
                const metadata = transitionInspection(state, { kind: 'reset', scope: 'fallback' });
                return move(work.facts?.canInspect && work.pass === 0 ? 'ffmpeg' : 'publish', { fast: false, pass: work.pass + 1, ...(!work.facts?.canInspect ? { nativeReason: undefined } : {}), notice: Object.freeze({ outcome: 'skipped', reason: `Fast metadata missing ${change.missing.join(', ')} for ${change.first ?? 'routing'}; FFmpeg inspection required` }) }, metadata);
            }
            return move('publish', { notice: Object.freeze({ outcome: 'selected', reason: `Fast Inspector admitted ${change.first} without remux inspector Wasm` }) }, { fastSource: work.source });
        }
        case 'work.published': return work.phase === 'publish' ? move(work.inspectOnly ? 'return' : 'discover') : state;
        case 'work.failed': {
            if (['failed', 'replace', 'discover', 'return'].includes(work.phase))
                return state;
            const error = change.failure;
            const required = error.terminalSource || error.provider && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(error.code);
            if (['private-probe', 'private-assets', 'deployment', 'configure', 'prepare', 'fallback', 'manifest', 'publish'].includes(work.phase))
                return move('failed');
            if (work.phase === 'webgpu' || work.phase === 'quality')
                return move(required ? 'failed' : work.phase === 'webgpu' ? quality() : 'replace');
            if (work.phase === 'fast' && !required)
                return move(work.facts?.canInspect ? 'ffmpeg' : 'unavailable', { notice: Object.freeze({ outcome: 'skipped', reason: `Fast inspector unavailable: ${error.message}` }) });
            if (optionalInspectionFallback(error.optional))
                return move('publish', { nativeReason: undefined, notice: Object.freeze({ outcome: 'skipped', reason: 'Optional private inspection unavailable; trying browser Direct: ' + error.message }) });
            if (error.terminalSource || ['AUTOPLAY_BLOCKED', 'ABORTED', 'SOURCE_CHANGED', 'SOURCE_PERMISSION', 'NETWORK_TIMEOUT', 'ASSET_LOAD_FAILED'].includes(error.code))
                return move('failed');
            return move('publish', { nativeReason: 'Native eligibility could not be established: ' + error.message, notice: Object.freeze({ outcome: 'failed', reason: error.message }) });
        }
    }
}
export function isInspectionWorkChange(change) { return change.kind.startsWith('work.'); }
