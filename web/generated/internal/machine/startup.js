// SPDX-License-Identifier: Apache-2.0
export const STARTUP_BYTE_LIMIT = 32 * 1024 * 1024, STARTUP_ENTRY_LIMIT = 8, STARTUP_TIMEOUT_MS = 15000;
export function initialStartup() { return Object.freeze({ serial: 0, stopped: false, entries: Object.freeze([]) }); }
export function transitionStartup(state, event) {
    const result = (next, accepted = true, extra = {}) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), accepted, ...extra });
    if (event.type === 'destroy')
        return result({ ...state, stopped: true, entries: Object.freeze(state.entries.filter(entry => entry.phase !== 'ready').map(entry => Object.freeze({ ...entry, phase: 'retired' }))) });
    if (event.type === 'failed')
        return state.entries.some(entry => entry.id === event.id) ? result({ ...state, entries: Object.freeze(state.entries.filter(entry => entry.id !== event.id)) }) : result(state, false);
    if (state.stopped)
        return result(state, false);
    if (event.type === 'admit') {
        const previous = state.entries.find(entry => entry.path === event.path);
        if (previous)
            return result(state, true, { id: previous.id, existing: true });
        if (state.entries.length >= STARTUP_ENTRY_LIMIT || !Number.isSafeInteger(state.serial + 1))
            return result(state, false);
        const id = state.serial + 1;
        return result({ ...state, serial: id, entries: Object.freeze([...state.entries, Object.freeze({ id, path: event.path, bytes: 0, phase: 'pending', deadline: event.now + STARTUP_TIMEOUT_MS })]) }, true, { id });
    }
    const entry = state.entries.find(entry => entry.id === event.id);
    if (!entry || entry.phase !== 'pending')
        return result(state, false);
    if (event.type === 'cancel')
        return result({ ...state, entries: Object.freeze(state.entries.map(value => value === entry ? Object.freeze({ ...entry, phase: 'retired' }) : value)) });
    if (event.type === 'deadline')
        return event.now < entry.deadline ? result(state, true, { remaining: entry.deadline - event.now }) : result({ ...state, entries: Object.freeze(state.entries.map(value => value === entry ? Object.freeze({ ...entry, phase: 'retired' }) : value)) });
    if (event.type === 'chunk' && (!Number.isSafeInteger(event.bytes) || event.bytes < 0 || entry.bytes + event.bytes > STARTUP_BYTE_LIMIT))
        return result(state, false);
    return result({ ...state, entries: Object.freeze(state.entries.map(value => value !== entry ? value : Object.freeze(event.type === 'chunk' ? { ...entry, bytes: entry.bytes + event.bytes } : { ...entry, phase: 'ready' }))) });
}
export function startupFallbackPlan(original, current, remux, plans) {
    if (!original)
        return;
    if (remux && plans.some(plan => plan.id === remux && plan.included))
        return remux;
    return plans.slice(plans.findIndex(plan => plan.id === current) + 1).find(plan => plan.eligible && plan.fallback && plan.included && !plan.rejected)?.id;
}
export function startupLoadBudget(explicit, switchAfterMs, fallback) { return explicit ?? (fallback ? switchAfterMs : undefined); }
export function startupPrefetchCurrent(stopped, epoch, expectedEpoch, discovery, expectedDiscovery) { return !stopped && epoch === expectedEpoch && discovery === expectedDiscovery; }
export function startupPreparation(planId, runtime, rgb, recipe) {
    const adapted = !!recipe.adaptation;
    if (recipe.backend === 'WasmPlayer') {
        const mode = planId.startsWith('hybrid') ? 'hybrid' : 'software';
        return Object.freeze({ kind: 'engine', mode, path: `web/${mode === 'hybrid' ? 'engine-hybrid' : rgb ? 'engine-software-full' : 'engine-software-yuv'}/player.wasm` });
    }
    if (recipe.backend === 'PrivateSoftwarePlayer')
        return Object.freeze({ kind: 'private', path: `web/engine-mpv-playback-${runtime}/player.wasm` });
    return Object.freeze({ kind: 'remux', adapted, codecPreparation: recipe.adaptation === 'flac24' && planId === 'native-transcode', path: `web/engine-${adapted ? 'adaptation' : 'remux'}${runtime === 'pthread' ? '' : '-' + runtime}/remux.wasm` });
}
