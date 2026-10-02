// SPDX-License-Identifier: Apache-2.0
export function initialRecovery() { return Object.freeze({ serial: 0, attemptedSession: null, pending: null, failedStreaming: null }); }
export function transitionRecovery(state, change) {
    if (change.kind === 'begin') {
        if (state.pending || state.attemptedSession === change.session)
            return state;
        return Object.freeze({ ...state, serial: state.serial + 1, attemptedSession: change.session, pending: Object.freeze({ id: state.serial + 1, epoch: change.epoch, session: change.session }) });
    }
    if (change.kind === 'finished')
        return state.pending?.id === change.id ? Object.freeze({ ...state, pending: null }) : state;
    const plans = state.failedStreaming?.source === change.source ? state.failedStreaming.plans : [];
    return plans.includes(change.plan) ? Object.freeze({ ...state }) : Object.freeze({ ...state, failedStreaming: Object.freeze({ source: change.source, plans: Object.freeze([...plans, change.plan].slice(-128)) }) });
}
export function retireRecovery(state) { return state.pending ? Object.freeze({ ...state, pending: null }) : state; }
export function clearRecovery(state) { return Object.freeze({ ...state, attemptedSession: null, pending: null, failedStreaming: null }); }
export function recoveryRoute(facts) {
    const remux = !facts.streaming && facts.mode === 'native' && (facts.backendPlan === 'direct' || facts.trigger === 'play' && facts.backendPlan === 'direct-mpv') && facts.nativeRemux !== 'never';
    return Object.freeze({ start: facts.streaming || remux || facts.mode === 'native' ? 0 : facts.mode === 'hybrid' ? 2 : 3, requirements: Object.freeze(remux ? { nativeRemux: 'always' } : {}) });
}
