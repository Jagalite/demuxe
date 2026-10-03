// SPDX-License-Identifier: Apache-2.0
export function initialRecovery() { return Object.freeze({ serial: 0, attemptedSession: null, pending: null, failedStreaming: null }); }
export function transitionRecovery(state, change) {
    if (change.kind === 'begin') {
        if (state.pending || state.attemptedSession === change.session)
            return state;
        return Object.freeze({ ...state, serial: state.serial + 1, attemptedSession: change.session, pending: Object.freeze({ id: state.serial + 1, epoch: change.epoch, session: change.session, phase: 'classifying' }) });
    }
    if (change.kind === 'finished')
        return state.pending?.id === change.id ? Object.freeze({ ...state, pending: null }) : state;
    if (change.kind !== 'streaming.failed') {
        const pending = state.pending;
        if (!pending || pending.id !== change.id)
            return state;
        let phase = pending.phase;
        if (change.kind === 'classified' && phase === 'classifying')
            phase = change.compatible ? 'queued' : 'terminal';
        else if (change.kind === 'start' && phase === 'queued') {
            if (!change.current || !change.automatic)
                return Object.freeze({ ...state, pending: null });
            phase = 'pausing';
        }
        else if (change.kind === 'paused' && phase === 'pausing')
            phase = 'selecting';
        else if (change.kind === 'outcome' && (phase === 'selecting' || !change.selected && (phase === 'pausing' || phase === 'queued')))
            phase = change.selected ? 'selected' : 'failed';
        else
            return state;
        return Object.freeze({ ...state, pending: Object.freeze({ ...pending, phase }) });
    }
    const plans = state.failedStreaming?.source === change.source ? state.failedStreaming.plans : [];
    return plans.includes(change.plan) ? Object.freeze({ ...state }) : Object.freeze({ ...state, failedStreaming: Object.freeze({ source: change.source, plans: Object.freeze([...plans, change.plan].slice(-128)) }) });
}
export function retireRecovery(state) { return state.pending ? Object.freeze({ ...state, pending: null }) : state; }
export function clearRecovery(state) { return Object.freeze({ ...state, attemptedSession: null, pending: null, failedStreaming: null }); }
export function recoveryRoute(facts) {
    const remux = !facts.streaming && facts.mode === 'native' && (facts.backendPlan === 'direct' || facts.trigger === 'play' && facts.backendPlan === 'direct-mpv') && facts.nativeRemux !== 'never';
    return Object.freeze({ start: facts.streaming || remux || facts.mode === 'native' ? 0 : facts.mode === 'hybrid' ? 2 : 3, requirements: Object.freeze(remux ? { nativeRemux: 'always' } : {}) });
}
/** Pure response policy. Adapter facts describe the observed fault; no physical
 * error objects, handles or callbacks are retained by this decision. */
export function playbackFaultResponse(facts) {
    if (!facts.current || !facts.accepted || facts.destroyed || facts.origin !== 'watchdog' && facts.busy)
        return 'ignore';
    if (facts.origin === 'track-policy')
        return facts.fault ? 'pause-error' : 'forward';
    if (!facts.fault)
        return 'forward';
    if (facts.automatic && (facts.origin === 'watchdog' || facts.mode !== 'software'))
        return 'recover';
    return facts.origin === 'watchdog' ? 'pause-error' : facts.endFileError ? 'error' : 'forward';
}
