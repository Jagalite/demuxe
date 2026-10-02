// SPDX-License-Identifier: Apache-2.0
export function initialCoopState(slots = 24, maxRetainedTasks = 256) { return Object.freeze({ attachment: 'unattached', slots, maxRetainedTasks, nextId: 1, nextWait: 1, tasks: Object.freeze([]), waits: Object.freeze([]), ready: Object.freeze([]), free: Object.freeze(Array.from({ length: slots }, (_, index) => index)), active: null, pendingPump: false, stopped: false, stats: Object.freeze({ created: 0, completed: 0, abandoned: 0, suspensions: 0, resumes: 0, maxLive: 0, timerWakes: 0, signals: 0, stackChecks: 0 }) }); }
export function coopTask(state, id) { return state.tasks.find(task => task.id === id); }
export function coopCanCreate(state) { return !state.stopped && state.free.length > 0 && state.tasks.length < state.maxRetainedTasks && state.nextId <= 0xffffffff; }
export function createCoopTask(state, root) {
    if (state.attachment !== 'attached' || !coopCanCreate(state))
        return Object.freeze({ state, task: null });
    const task = Object.freeze({ id: state.nextId, slot: state.free[state.free.length - 1], status: 'new', root, detached: false, joined: false });
    return Object.freeze({ state: Object.freeze({ ...state, nextId: task.id + 1, tasks: Object.freeze([...state.tasks, task]), ready: Object.freeze([...state.ready, task.id]), free: Object.freeze(state.free.slice(0, -1)), stats: Object.freeze({ ...state.stats, created: state.stats.created + 1, maxLive: Math.max(state.stats.maxLive, state.tasks.filter(task => task.status !== 'done').length + 1) }) }), task });
}
export function scheduleCoopPump(state) { return state.pendingPump || state.stopped ? Object.freeze({ state, send: false }) : Object.freeze({ state: Object.freeze({ ...state, pendingPump: true }), send: true }); }
export function consumeCoopPump(state) { return state.pendingPump ? Object.freeze({ ...state, pendingPump: false }) : state; }
export function startCoopTask(state) {
    if (state.active !== null || state.stopped)
        return Object.freeze({ state, id: null, fresh: false });
    const index = state.ready.findIndex(id => { const task = coopTask(state, id); return task?.status === 'new' || task?.status === 'ready'; });
    if (index < 0)
        return Object.freeze({ state: state.ready.length ? Object.freeze({ ...state, ready: Object.freeze([]) }) : state, id: null, fresh: false });
    const id = state.ready[index], fresh = coopTask(state, id).status === 'new';
    return Object.freeze({ state: Object.freeze({ ...state, active: id, ready: Object.freeze(state.ready.slice(index + 1)), tasks: Object.freeze(state.tasks.map(task => task.id === id ? Object.freeze({ ...task, status: 'running' }) : task)), stats: fresh ? state.stats : Object.freeze({ ...state.stats, resumes: state.stats.resumes + 1 }) }), id, fresh });
}
export function parkCoopTask(state) {
    const task = state.active === null ? undefined : coopTask(state, state.active);
    if (state.stopped || !task || task.status !== 'running')
        return Object.freeze({ state, wait: null });
    const wait = Object.freeze({ id: state.nextWait, task: task.id, key: null, deadline: null, join: null });
    return Object.freeze({ state: Object.freeze({ ...state, nextWait: wait.id + 1, waits: Object.freeze([...state.waits, wait]), tasks: Object.freeze(state.tasks.map(item => item.id === task.id ? Object.freeze({ ...item, status: 'waiting' }) : item)), stats: Object.freeze({ ...state.stats, suspensions: state.stats.suspensions + 1 }) }), wait });
}
export function bindCoopWait(state, id, policy) {
    if (state.stopped || !state.waits.some(wait => wait.id === id))
        return state;
    return Object.freeze({ ...state, waits: Object.freeze(state.waits.map(wait => wait.id === id ? Object.freeze({ ...wait, ...policy.key === undefined ? {} : { key: policy.key }, ...policy.deadline === undefined ? {} : { deadline: policy.deadline }, ...policy.join === undefined ? {} : { join: policy.join } }) : wait)) });
}
export function releaseCoopTask(state, id) {
    if (state.stopped || state.active !== id)
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, active: null }), accepted: true });
}
export function settleCoopWait(state, id, kind = 'ready', now) {
    const wait = state.waits.find(wait => wait.id === id), empty = { state, accepted: false, task: null, remove: null, remaining: null, invalid: false };
    if (!wait || state.stopped)
        return Object.freeze(empty);
    if (wait.join !== null && coopTask(state, wait.join)?.status !== 'done')
        return Object.freeze(empty);
    if (kind === 'timeout' && (now === undefined || wait.deadline === null))
        return Object.freeze(empty);
    if (kind === 'timeout' && now !== undefined && wait.deadline !== null && now < wait.deadline)
        return Object.freeze({ ...empty, remaining: wait.deadline - now });
    const task = coopTask(state, wait.task);
    if (task?.status !== 'waiting')
        return Object.freeze({ ...empty, invalid: true });
    return Object.freeze({ state: Object.freeze({ ...state, waits: Object.freeze(state.waits.filter(item => item.id !== id)), tasks: Object.freeze(state.tasks.filter(item => item.id !== wait.join).map(item => item.id === task.id ? Object.freeze({ ...item, status: 'ready' }) : item)), ready: Object.freeze([...state.ready, task.id]), stats: Object.freeze({ ...state.stats, timerWakes: state.stats.timerWakes + (kind === 'timeout' ? 1 : 0), signals: state.stats.signals + (kind === 'signal' ? 1 : 0) }) }), accepted: true, task: task.id, remove: wait.join, remaining: null, invalid: false });
}
export function coopConditionWaits(state, key, all) { const ids = state.waits.filter(wait => wait.key === key).map(wait => wait.id); return Object.freeze(all ? ids : ids.slice(0, 1)); }
export function prepareCoopJoin(state, id) {
    const task = coopTask(state, id);
    if (!task || task.root || task.detached || task.joined)
        return Object.freeze({ state, code: 1, wait: false, remove: false });
    if (task.id === state.active)
        return Object.freeze({ state, code: 2, wait: false, remove: false });
    const done = task.status === 'done';
    return Object.freeze({ state: Object.freeze({ ...state, tasks: Object.freeze(done ? state.tasks.filter(item => item.id !== id) : state.tasks.map(item => item.id === id ? Object.freeze({ ...item, joined: true }) : item)) }), code: 0, wait: !done, remove: done });
}
export function detachCoopTask(state, id) {
    const task = coopTask(state, id);
    if (!task || task.root || task.detached || task.joined)
        return Object.freeze({ state, code: 1, remove: false });
    const done = task.status === 'done';
    return Object.freeze({ state: Object.freeze({ ...state, tasks: Object.freeze(done ? state.tasks.filter(item => item.id !== id) : state.tasks.map(item => item.id === id ? Object.freeze({ ...item, detached: true }) : item)) }), code: 0, remove: done });
}
export function completeCoopTask(state, id) {
    const task = coopTask(state, id), empty = { state, accepted: false, wake: Object.freeze([]), remove: Object.freeze([]) };
    if (state.stopped || state.active !== id || !task || task.status !== 'running' || task.slot === null)
        return Object.freeze(empty);
    const remove = task.root || task.detached ? [id] : [], wake = state.waits.filter(wait => wait.join === id).map(wait => wait.id);
    let next = Object.freeze({ ...state, active: null, free: Object.freeze([...state.free, task.slot]), tasks: Object.freeze(state.tasks.filter(item => !remove.includes(item.id)).map(item => item.id === id ? Object.freeze({ ...item, status: 'done', slot: null }) : item)), stats: Object.freeze({ ...state.stats, completed: state.stats.completed + 1 }) });
    for (const wait of wake) {
        const settled = settleCoopWait(next, wait);
        next = settled.state;
        if (settled.remove !== null && !remove.includes(settled.remove))
            remove.push(settled.remove);
    }
    return Object.freeze({ state: next, accepted: true, wake: Object.freeze(wake), remove: Object.freeze(remove) });
}
export function checkedCoopStack(state) { return state.stopped ? state : Object.freeze({ ...state, stats: Object.freeze({ ...state.stats, stackChecks: state.stats.stackChecks + 1 }) }); }
export function closeCoopState(state) { return state.stopped ? state : Object.freeze({ ...state, stopped: true, pendingPump: false, active: null, free: Object.freeze([]), ready: Object.freeze([]), waits: Object.freeze([]), tasks: Object.freeze([]), stats: Object.freeze({ ...state.stats, abandoned: state.stats.abandoned + state.tasks.filter(task => task.status !== 'done').length }) }); }
export function snapshotCoopState(state) {
    const keys = [];
    for (const wait of state.waits)
        if (wait.key !== null && !keys.includes(wait.key))
            keys.push(wait.key);
    return Object.freeze({ ...state.stats, liveTasks: state.tasks.filter(task => task.status !== 'done').length, retainedTasks: state.tasks.length, waitKeys: keys.length, freeSlots: state.free.length, stopped: state.stopped });
}
export function beginCoopAttachment(state) { return state.stopped || state.attachment !== 'unattached' ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, attachment: 'attaching' }), accepted: true }); }
export function finishCoopAttachment(state) { return state.stopped || state.attachment !== 'attaching' ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, attachment: 'attached' }), accepted: true }); }
