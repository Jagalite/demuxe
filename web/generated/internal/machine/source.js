// SPDX-License-Identifier: Apache-2.0
import { initialSourcePreparation, claimSourcePreparation, completeSourcePreparation, sourcePreparationDone } from './source-preparation.js';
export function initialSource() { return Object.freeze({ serial: 0, attemptSerial: 0, sessionSerial: 0, acceptedSession: null, acceptedEpoch: null, mode: 'native', automatic: true, candidate: null }); }
const ok = (state) => Object.freeze({ state: Object.freeze({ ...state }), accepted: true });
const no = (state, reason) => Object.freeze({ state, accepted: false, reason });
/** Candidate and accepted identities are separate. A preserving handoff advances
 * session identity without changing the public source identity. Settings commit
 * is returned to the composed transition, never published independently. */
export function transitionSource(state, input) {
    if (input.type === 'source.configure')
        return ok({ ...state, mode: input.mode ?? state.mode, automatic: input.automatic ?? state.automatic });
    if (input.type === 'source.clear')
        return ok({ ...state, acceptedSession: null, acceptedEpoch: null, candidate: null });
    if (input.type === 'source.begin') {
        if (state.candidate)
            return no(state, 'busy');
        const id = state.attemptSerial + 1, session = state.sessionSerial + 1;
        return Object.freeze({ state: Object.freeze({ ...state, attemptSerial: id, sessionSerial: session, candidate: Object.freeze({ id, session, operationEpoch: input.operationEpoch, operation: input.operation ?? null, mode: input.mode, preserve: input.preserve, planId: input.planId, phase: 'preparing', preparation: null }) }), accepted: true, attempt: id });
    }
    const attempt = state.candidate;
    if (!attempt || attempt.id !== input.attempt)
        return no(state, 'retired');
    if (input.type === 'source.finished')
        return ok({ ...state, candidate: null });
    if (input.type === 'source.preparation.next' || input.type === 'source.preparation.completed') {
        if (input.type === 'source.preparation.next' && attempt.preparation && sourcePreparationDone(attempt.preparation))
            return Object.freeze({ state, accepted: true });
        if (!attempt.preparation || !['configuring', 'opening'].includes(attempt.phase))
            return no(state, 'phase');
        if (input.type === 'source.preparation.next') {
            const next = claimSourcePreparation(attempt.preparation);
            if (!next.accepted)
                return no(state, 'busy');
            const candidate = next.state === attempt.preparation ? attempt : Object.freeze({ ...attempt, preparation: next.state });
            return Object.freeze({ ...ok(candidate === attempt ? state : { ...state, candidate }), preparationEffect: next.effect });
        }
        if (input.facts && input.facts.mode !== attempt.mode)
            return no(state, 'phase');
        const next = completeSourcePreparation(attempt.preparation, input.step, input.facts);
        if (!next.accepted)
            return no(state, 'phase');
        return ok({ ...state, candidate: Object.freeze({ ...attempt, preparation: next.state, phase: next.phase ?? attempt.phase }) });
    }
    if (attempt.preparation && (input.type === 'source.configured' || input.type === 'source.opened'))
        return no(state, 'phase');
    if (input.type === 'source.accept') {
        if (attempt.operationEpoch !== input.operationEpoch)
            return no(state, 'retired');
        if (attempt.phase !== 'verifying')
            return no(state, 'phase');
        if (!input.planMatches)
            return no(state, 'plan');
        return Object.freeze({ state: Object.freeze({ ...state, serial: state.serial + (attempt.preserve ? 0 : 1), acceptedSession: attempt.session, acceptedEpoch: attempt.operationEpoch, mode: attempt.mode, candidate: Object.freeze({ ...attempt, phase: 'accepted' }) }), accepted: true, settings: Object.freeze({ ...input.settings }), newSource: !attempt.preserve });
    }
    const phases = {
        'source.created': ['preparing', 'configuring'],
        'source.configured': ['configuring', 'opening'],
        'source.opened': ['opening', 'applying'],
        'source.applied': ['applying', 'positioning'],
        'source.positioned': ['positioning', 'verifying'],
    };
    const [before, after] = phases[input.type];
    return attempt.phase === before ? ok({ ...state, candidate: Object.freeze({ ...attempt, phase: after, ...(input.type === 'source.created' && input.prepare ? { preparation: initialSourcePreparation() } : {}) }) }) : no(state, 'phase');
}
export function sourceDesiredSettings(settings, facts) {
    const reset = (!facts.preserve && facts.previousSession) || (facts.preserve && (facts.mode === 'native') !== (facts.previousMode === 'native'));
    return Object.freeze({ ...settings, pause: facts.preserve ? facts.previousPause : true, ...(reset ? { aid: facts.preserve && settings.aid === 'no' ? 'no' : 'auto', sid: facts.preserve && settings.sid === 'no' ? 'no' : 'auto' } : {}) });
}
export function sourcePreparationCurrent(state, attempt, step) { return state.candidate?.id === attempt && state.candidate.preparation?.pending === step; }
