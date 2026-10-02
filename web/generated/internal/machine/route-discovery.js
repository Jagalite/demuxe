// SPDX-License-Identifier: Apache-2.0
export function initialDiscovery() { return Object.freeze({ serial: 0, current: null }); }
const errors = (previous, value) => Object.freeze([...previous.slice(-127), value]);
function continueFailure(current, failure) {
    const terminal = !current.automatic && failure.code === 'UNSUPPORTED_TIMELINE' || !failure.compatible && !failure.retryRemux && !failure.inconclusiveOutput;
    if (terminal)
        return Object.freeze({ ...current, phase: 'failed', failure, restoreId: null });
    const inspect = failure.fast && !failure.retryRemux && current.reinspections === 0;
    return Object.freeze({ ...current, phase: inspect ? 'inspect' : 'plans', cursor: current.cursor + Number(!inspect), failure: inspect ? failure : null, restoreId: null,
        captionFailure: failure.caption ?? current.captionFailure, interruptedDirect: failure.caption !== undefined ? null : current.interruptedDirect, errors: errors(current.errors, `${failure.id}: ${failure.message}`) });
}
export function transitionDiscovery(state, change) {
    if (change.kind === 'begin')
        return state.current ? state : Object.freeze({ serial: state.serial + 1, current: Object.freeze({ id: state.serial + 1, attemptSerial: 0, pendingAttempt: null, automatic: change.automatic, pinnedMode: change.pinnedMode, start: change.start, cursor: 0, nativeReason: change.nativeReason, interruptedDirect: null, errors: Object.freeze([]), reinspections: 0, phase: 'plans', failure: null, restoreId: null }) });
    const current = state.current;
    if (!current || current.id !== change.id)
        return state;
    if (change.kind === 'finished')
        return Object.freeze({ ...state, current: null });
    let next;
    if (change.kind === 'attempt') {
        if (current.phase !== 'plans' || current.pendingAttempt)
            return state;
        next = Object.freeze({ ...current, attemptSerial: current.attemptSerial + 1, pendingAttempt: Object.freeze({ id: current.attemptSerial + 1, planId: change.planId }) });
    }
    else if (change.kind === 'advance') {
        if (current.phase !== 'plans' || current.pendingAttempt)
            return state;
        next = Object.freeze({ ...current, cursor: current.cursor + 1 });
    }
    else if (change.kind === 'reinspected') {
        if (current.phase !== 'inspect')
            return state;
        next = Object.freeze({ ...current, phase: 'plans', cursor: 0, nativeReason: change.nativeReason, reinspections: current.reinspections + 1, failure: null });
    }
    else if (change.kind === 'restore.failed') {
        if (current.phase !== 'restore' || !current.failure || !current.restoreId || current.pendingAttempt?.id !== change.attempt || current.pendingAttempt.planId !== change.failure.id)
            return state;
        if (!change.failure.compatible)
            next = Object.freeze({ ...current, pendingAttempt: null, phase: 'failed', failure: Object.freeze({ ...change.failure }) });
        else
            next = continueFailure(Object.freeze({ ...current, pendingAttempt: null, errors: errors(current.errors, `${current.restoreId}: ${change.failure.message}`) }), current.failure);
    }
    else {
        if (current.phase !== 'plans' || current.pendingAttempt?.id !== change.attempt || current.pendingAttempt.planId !== change.failure.id)
            return state;
        const failure = Object.freeze({ ...change.failure });
        const interrupted = failure.retryRemux && failure.nativeTimeout && failure.budget < 25000 ? Object.freeze({ id: failure.id, remux: failure.retryRemux }) : current.interruptedDirect;
        const restore = interrupted?.remux === failure.id && failure.caption === undefined && (failure.compatible || ['ASSET_LOAD_FAILED', 'NETWORK_TIMEOUT', 'ISOLATION_REQUIRED'].includes(failure.code));
        next = restore ? Object.freeze({ ...current, attemptSerial: current.attemptSerial + 1, pendingAttempt: Object.freeze({ id: current.attemptSerial + 1, planId: interrupted.id }), phase: 'restore', interruptedDirect: null, restoreId: interrupted.id, failure }) : continueFailure(Object.freeze({ ...current, pendingAttempt: null, interruptedDirect: interrupted }), failure);
    }
    return Object.freeze({ ...state, current: next });
}
export function discoveryPlanPolicy(current, plan, hybridRejection) {
    const included = current.pinnedMode ? plan.mode === current.pinnedMode : ['native', 'hybrid', 'software'].indexOf(plan.mode) >= current.start;
    return Object.freeze({ included, hybridRejection: included && current.automatic && plan.eligible && plan.mode === 'hybrid' ? hybridRejection : undefined, captionFailure: included && plan.mode === 'native' ? current.captionFailure : undefined });
}
export function discoveryOptionalProbe(current, plan, facts) {
    if (!current.automatic)
        return;
    if (facts.flacOffer && plan.id.startsWith('native-flac') && facts.audioPlayback !== 'worklet' && facts.automaticLossless && !current.nativeReason && facts.inspected && facts.pcm && !facts.losslessInspected && facts.local)
        return 'lossless';
    if (plan.id.startsWith('native-transcode') && !facts.transcodeChecked && facts.audioPlayback === 'auto' && !facts.audioAdaptation && !facts.automaticLossless && plan.code === 'DEPLOYMENT_UNAVAILABLE' && plan.reason === 'FLAC24 preparation assets are unavailable')
        return 'transcode';
    if (plan.id.startsWith('native-video-mpv-audio') && !facts.selectiveChecked && facts.fileServices && facts.inspected && facts.audioOutput === 'stereo' && facts.gain === 1 && plan.browserCapability?.status !== 'unsupported')
        return 'selective';
}
export function localDiscoveryRemux(planId, facts) {
    let remux = { 'native-direct': 'native-remux', 'native-direct-mpv': 'native-remux-mpv', 'native-direct-gain': 'native-remux-gain', 'native-direct-ass': 'native-remux-ass', 'native-direct-ass-gain': 'native-remux-ass-gain' }[planId];
    if (planId === 'native-direct' && facts.inspected && !facts.eligible.includes(remux) && facts.codecRepair)
        remux = 'native-transcode';
    return facts.local && facts.inspected && remux && facts.eligible.includes(remux) && !facts.rejected.includes(remux) ? remux : undefined;
}
