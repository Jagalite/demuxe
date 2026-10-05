// SPDX-License-Identifier: Apache-2.0
import { NATIVE_OUTPUT_TIMEOUT_MS, FIREFOX_LOCAL_RECOVERY_MS, fastLocalRecovery } from './playback-deadlines.js';
import { createNativeProgress, resetNativeProgress, sampleNativeProgress } from './telemetry.js';
export function initialPlayerMonitor() { return Object.freeze({ policy: Object.freeze({ nativeProgress: true, hybridDecoder: true, decoderOutput: true, selectiveAudio: true, nativeProgressTimeoutMs: NATIVE_OUTPUT_TIMEOUT_MS }), policyRevision: 0, serial: 0, activity: 0, current: null, fault: null }); }
export function stopPlayerMonitor(state) { return state.current || state.fault ? Object.freeze({ ...state, current: null, fault: null }) : state; }
export function monitorSampleEligible(state, input) {
    return input.session === state.source.acceptedSession && state.source.acceptedEpoch === state.operations.epoch && !state.operations.terminal && !state.source.candidate && state.operations.active === null && state.operations.entries.length === 0 && !state.settings.pause && !input.hidden && !input.retired && !input.error;
}
export function transitionPlayerMonitor(state, input) {
    const old = state.monitor;
    const done = (monitor) => Object.freeze({ state: monitor === old ? state : Object.freeze({ ...state, revision: state.revision + 1, monitor }), accepted: monitor !== old, retire: Object.freeze([]) });
    const no = () => Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
    if (input.type === 'monitor.stop')
        return done(stopPlayerMonitor(old));
    if (state.operations.terminal)
        return no();
    if (input.type === 'monitor.policy')
        return done(Object.freeze({ ...old, policy: Object.freeze({ ...input.policy }), policyRevision: old.policyRevision + 1, current: null, fault: null }));
    if (input.type === 'monitor.activity')
        return done(Object.freeze({ ...old, activity: old.activity + 1 }));
    if (input.epoch !== state.operations.epoch || input.session !== state.source.acceptedSession)
        return no();
    if (input.type === 'monitor.reconcile') {
        if (input.mode !== state.source.mode)
            return no();
        const enabled = input.mode === 'native' ? old.policy.nativeProgress : input.mode === 'hybrid' && old.policy.hybridDecoder;
        if (!input.present || input.session === null || state.source.acceptedEpoch !== state.operations.epoch || input.error || input.closing || !enabled || state.settings.pause || input.backendPaused || input.backendEOF || input.hidden)
            return done(stopPlayerMonitor(old));
        if (old.current?.session === input.session && old.current.policyRevision === old.policyRevision && old.current.mode === input.mode)
            return done(old);
        return done(Object.freeze({ ...old, serial: old.serial + 1, current: Object.freeze({ id: old.serial + 1, session: input.session, mode: input.mode, policyRevision: old.policyRevision, activity: old.activity, progress: createNativeProgress(), inactive: 0 }), fault: null }));
    }
    const current = old.current;
    if (!current || current.id !== input.id || current.session !== input.session || input.activity !== old.activity)
        return no();
    const reset = current.activity !== old.activity || !monitorSampleEligible(state, input);
    let progress = reset ? resetNativeProgress(current.progress) : current.progress, inactive = reset ? 0 : current.inactive, reason;
    if (!monitorSampleEligible(state, input))
        return done(Object.freeze({ ...old, current: Object.freeze({ ...current, activity: old.activity, progress, inactive }) }));
    if (current.mode === 'native') {
        if (!input.native)
            progress = resetNativeProgress(progress);
        else {
            if (!Number.isFinite(input.now))
                return no();
            const sample = { ...input.native }, timing = input.timing;
            if (timing && sample.time >= timing.startTime && sample.time < timing.endTime - .25)
                sample.frameIntervalMs = 1000 * timing.maxIntervalSeconds / (sample.rate ?? 1);
            else
                sample.frames = undefined;
            const decision = sampleNativeProgress(progress, input.now, sample, input.recovery && fastLocalRecovery(input.recovery) ? Math.min(old.policy.nativeProgressTimeoutMs, FIREFOX_LOCAL_RECOVERY_MS) : old.policy.nativeProgressTimeoutMs);
            progress = decision.state;
            if (decision.stalled)
                reason = decision.stalled;
        }
    }
    else {
        inactive = input.hasVideo && input.softwareDecoder ? inactive + 1 : 0;
        if (inactive >= 4)
            reason = 'hybrid';
    }
    if (reason)
        return done(Object.freeze({ ...old, current: null, fault: Object.freeze({ id: current.id, session: current.session, reason }) }));
    return done(Object.freeze({ ...old, current: Object.freeze({ ...current, activity: old.activity, progress, inactive }) }));
}
