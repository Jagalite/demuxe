// SPDX-License-Identifier: Apache-2.0
import { preferredPlanIndices } from './routing.js';
export function initialPromotion() { return Object.freeze({ serial: 0, epoch: 0, timer: null, active: null }); }
export function cancelPromotion(state) { return Object.freeze({ ...state, epoch: state.epoch + 1, timer: null, active: null }); }
export function transitionPromotion(state, change) {
    if (change.kind === 'cancel')
        return cancelPromotion(state);
    if (change.kind === 'schedule') {
        const f = change.facts;
        return !f.automatic || !f.source || !f.current || f.error ? Object.freeze({ ...state, timer: null }) : Object.freeze({ ...state, serial: state.serial + 1, timer: Object.freeze({ id: state.serial + 1, epoch: state.epoch, due: change.now + 200 }) });
    }
    if (change.kind === 'fired') {
        const timer = state.timer, f = change.facts;
        if (!timer || timer.id !== change.id || timer.epoch !== state.epoch || change.now < timer.due)
            return state;
        const admitted = !state.active && !f.queued && f.automatic && f.source && f.current && !f.error && (f.paused || f.background) && !f.waiting;
        return Object.freeze({ ...state, timer: null, active: admitted ? Object.freeze({ id: timer.id, epoch: state.epoch, phase: 'queued' }) : state.active });
    }
    if (change.kind === 'timer-failed')
        return state.timer?.id === change.id ? Object.freeze({ ...state, timer: null }) : state;
    const active = state.active;
    if (!active || active.id !== change.id || active.epoch !== state.epoch)
        return state;
    if (change.kind === 'finished')
        return Object.freeze({ ...state, active: null });
    if (change.kind === 'start') {
        if (active.phase !== 'queued')
            return state;
        const f = change.facts;
        return Object.freeze({ ...state, active: f.automatic && f.source && f.current ? Object.freeze({ ...active, phase: 'inspecting' }) : null });
    }
    if (change.kind === 'attempt') {
        if (active.phase !== 'trying' || active.candidates?.[active.cursor ?? 0] !== change.plan)
            return state;
        return Object.freeze({ ...state, active: change.outcome === 'compatibility' ? Object.freeze({ ...active, cursor: (active.cursor ?? 0) + 1 }) : null });
    }
    return change.kind === 'trying' && active.phase === 'inspecting' ? Object.freeze({ ...state, active: Object.freeze({ ...active, phase: 'trying', candidates: Object.freeze([...(change.candidates ?? [])]), cursor: 0 }) }) : state;
}
/** Only an already admitted plan before the accepted plan can be promoted.
 * Playing handoffs additionally need the Native overlap path. */
export function promotionPlanAllowed(paused, mode, cachedFailure) { return (paused || mode === 'native') && !cachedFailure; }
export function promotionCandidate(state, id) { const active = state.active; return active?.id === id && active.epoch === state.epoch && active.phase === 'trying' ? active.candidates?.[active.cursor ?? 0] : undefined; }
export function promotionCandidates(plans, current, paused) {
    return Object.freeze(preferredPlanIndices(plans, current).filter(index => promotionPlanAllowed(paused, plans[index].mode, plans[index].cachedFailure)).map(index => plans[index].id));
}
