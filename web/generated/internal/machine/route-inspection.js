// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
export function initialInspection() { return Object.freeze({ sourceSerial: 0, errorSerial: 0, probe: null, fastSource: null, lossless: null, subtitleAssets: false, selectiveAssets: false, selectiveChecked: false, transcodeAssets: false, transcodeChecked: false, playbackAvailable: false, playbackAssets: undefined, playbackFailure: null }); }
export function transitionInspection(state, change) {
    switch (change.kind) {
        case 'source.allocate': return Object.freeze({ ...state, sourceSerial: state.sourceSerial + 1 });
        case 'probe': return Object.freeze({ ...state, probe: copyData(change.value) });
        case 'fast': return Object.freeze({ ...state, fastSource: change.source });
        case 'lossless': return Object.freeze({ ...state, lossless: copyData(change.value) });
        case 'assets': return Object.freeze({ ...state, ...copyData(change.value) });
        case 'failure': return Object.freeze({ ...state, errorSerial: state.errorSerial + Number(change.failed), playbackFailure: change.failed ? state.errorSerial + 1 : null });
        case 'restore': return Object.freeze({ ...copyData(change.value), sourceSerial: state.sourceSerial, errorSerial: state.errorSerial });
        case 'reset': {
            const cleared = { subtitleAssets: false, selectiveAssets: false, selectiveChecked: false, transcodeAssets: false, transcodeChecked: false };
            return Object.freeze({ ...state, ...cleared, ...(change.scope === 'assets' ? { playbackAvailable: false, playbackAssets: undefined, playbackFailure: null } : { probe: null }), ...(change.scope === 'initial' ? { fastSource: null, lossless: null, playbackFailure: null } : {}) });
        }
        case 'clear': return Object.freeze({ ...initialInspection(), sourceSerial: state.sourceSerial, errorSerial: state.errorSerial });
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
