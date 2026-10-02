// SPDX-License-Identifier: Apache-2.0
export function initialFfmpegOwner() { return Object.freeze({ closed: false, serial: 0, waitSerial: 0, active: null, physical: null, wait: null, completed: 0, retired: 0, cleanupFailures: 0 }); }
export function transitionFfmpegOwner(state, input) {
    const no = (reason = 'stale') => Object.freeze({ state, accepted: false, reason });
    const ok = (next, extra = {}) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), accepted: true, ...extra });
    if (input.type === 'cleanup-failed')
        return ok({ ...state, cleanupFailures: state.cleanupFailures + 1 });
    if (input.type === 'close')
        return state.closed ? no('closed') : ok({ ...state, closed: true, active: null, wait: null, retired: state.retired + (state.active === null ? 0 : 1) }, { ...(state.active === null ? {} : { retireTask: state.active }), ...(state.wait ? { retireWait: state.wait.id } : {}) });
    if (input.type === 'complete')
        return state.physical !== input.task ? no() : ok({ ...state, physical: null, active: state.active === input.task ? null : state.active, wait: state.wait?.task === input.task ? null : state.wait, completed: state.completed + 1 }, state.wait?.task === input.task ? { retireWait: state.wait.id } : {});
    if (state.closed)
        return no('closed');
    if (input.type === 'begin') {
        if (state.active !== null || state.physical !== null)
            return no('busy');
        const id = state.serial + 1;
        if (!Number.isSafeInteger(id))
            return no('identity');
        return ok({ ...state, serial: id, active: id, physical: id }, { id });
    }
    if (state.active !== input.task)
        return no();
    if (input.type === 'park') {
        if (state.wait)
            return no('busy');
        const id = state.waitSerial + 1;
        if (!Number.isSafeInteger(id))
            return no('identity');
        return ok({ ...state, waitSerial: id, wait: Object.freeze({ id, task: input.task, phase: 'pending' }) }, { id });
    }
    const wait = state.wait;
    if (!wait || wait.id !== input.wait || wait.task !== input.task)
        return no();
    if (input.type === 'settled')
        return ok({ ...state, wait: null });
    if (input.type === 'ready')
        return wait.phase !== 'pending' ? no() : ok({ ...state, wait: Object.freeze({ ...wait, phase: 'ready' }) });
    return wait.phase !== 'ready' ? no() : ok({ ...state, wait: Object.freeze({ ...wait, phase: 'delivering' }) });
}
