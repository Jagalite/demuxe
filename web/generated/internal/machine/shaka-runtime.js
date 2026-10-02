// SPDX-License-Identifier: Apache-2.0
export function createShakaRuntime() { return Object.freeze({ nextLoad: 1, nextConsumer: 1, loads: Object.freeze([]) }); }
export function joinShakaRuntime(state, key, now) {
    const previous = state.loads.find(load => load.key === key && load.phase !== 'failed'), consumer = state.nextConsumer;
    const load = previous ? Object.freeze({ ...previous, consumers: Object.freeze([...previous.consumers, consumer]) }) : Object.freeze({ id: state.nextLoad, key, phase: 'pending', deadline: now + 15000, consumers: Object.freeze([consumer]) });
    return Object.freeze({ state: Object.freeze({ nextLoad: previous ? state.nextLoad : state.nextLoad + 1, nextConsumer: consumer + 1, loads: Object.freeze(previous ? state.loads.map(item => item.id === load.id ? load : item) : [...state.loads, load]) }), load: load.id, consumer, start: !previous });
}
export function shakaRuntimeLoad(state, id) { return state.loads.find(load => load.id === id); }
export function leaveShakaRuntime(state, id, consumer) {
    const load = shakaRuntimeLoad(state, id);
    if (!load?.consumers.includes(consumer))
        return Object.freeze({ state, accepted: false, cancel: false });
    const consumers = Object.freeze(load.consumers.filter(value => value !== consumer)), remove = consumers.length === 0 && load.phase !== 'ready';
    return Object.freeze({ state: Object.freeze({ ...state, loads: Object.freeze(remove ? state.loads.filter(item => item.id !== id) : state.loads.map(item => item.id === id ? Object.freeze({ ...item, consumers }) : item)) }), accepted: true, cancel: remove && load.phase === 'pending' });
}
export function finishShakaRuntime(state, id, success) {
    const load = shakaRuntimeLoad(state, id);
    if (load?.phase !== 'pending')
        return Object.freeze({ state, accepted: false });
    return Object.freeze({ state: Object.freeze({ ...state, loads: Object.freeze(state.loads.map(item => item.id === id ? Object.freeze({ ...item, phase: success ? 'ready' : 'failed' }) : item)) }), accepted: true });
}
export function shakaRuntimeDeadline(state, id, now) {
    const load = shakaRuntimeLoad(state, id);
    return Object.freeze({ current: load?.phase === 'pending', remaining: load?.phase === 'pending' ? Math.max(0, load.deadline - now) : 0 });
}
