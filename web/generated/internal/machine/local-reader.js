// SPDX-License-Identifier: Apache-2.0
export function initialLocalReader(total, cacheLimit, maxRequests) {
    if (!Number.isInteger(cacheLimit) || cacheLimit < 0 || cacheLimit > 4 * 1024 * 1024)
        throw Error('Invalid local cache budget');
    if (!Number.isInteger(maxRequests) || maxRequests < 0 || maxRequests > 8192)
        throw Error('Invalid local request budget');
    return Object.freeze({ total, cacheLimit, maxRequests, epoch: 0, closed: false, serial: 0, active: null, cache: Object.freeze([]), stats: Object.freeze({ fetchedBytes: 0, requests: 0, aborts: 0, discardedBytes: 0, cacheBytes: 0, peakCacheBytes: 0, cacheHits: 0, activeBytes: 0, peakActiveBytes: 0, peakChunkBytes: 0, peakOwnedBytes: 0 }) });
}
export function transitionLocalReader(state, command) {
    const result = (next, extra = {}) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next }), ...extra });
    if (command.type === 'epoch' || command.type === 'close') {
        if (command.type === 'close' && state.closed)
            return result(state);
        const closing = command.type === 'close';
        return result({ ...state, epoch: state.epoch + 1, closed: state.closed || closing, cache: closing ? Object.freeze([]) : state.cache, stats: Object.freeze({ ...state.stats, aborts: state.stats.aborts + 1, cacheBytes: closing ? 0 : state.stats.cacheBytes }) });
    }
    if (command.type === 'begin') {
        if (state.closed)
            return result(state, { error: 'File reader closed' });
        if (state.active)
            return result(state, { error: 'Concurrent reads are not allowed' });
        if (typeof command.offset !== 'bigint' || command.offset < 0n || !Number.isInteger(command.capacity) || command.capacity < 1 || command.capacity > 262144)
            return result(state, { error: 'Invalid read' });
        if (command.offset >= state.total)
            return result(state, { empty: true });
        const size = Number(state.total - command.offset < BigInt(command.capacity) ? state.total - command.offset : BigInt(command.capacity)), key = `${command.offset}:${size}`, cached = state.cache.find(item => item.key === key);
        if (cached)
            return result({ ...state, cache: Object.freeze([...state.cache.filter(item => item.key !== key), cached]), stats: Object.freeze({ ...state.stats, cacheHits: state.stats.cacheHits + 1 }) }, { hit: key });
        if (state.maxRequests && state.stats.requests >= state.maxRequests)
            return result(state, { error: 'Local source request budget exceeded' });
        const active = Object.freeze({ id: state.serial + 1, epoch: state.epoch, key, offset: command.offset, size, received: 0 });
        return result({ ...state, serial: active.id, active, stats: Object.freeze({ ...state.stats, activeBytes: size, peakActiveBytes: Math.max(state.stats.peakActiveBytes, size) }) }, { request: active });
    }
    const active = state.active;
    if (!active || active.id !== command.id)
        return result(state, { aborted: true });
    if (command.type === 'started')
        return result({ ...state, stats: Object.freeze({ ...state.stats, requests: state.stats.requests + 1 }) });
    if (command.type === 'chunk') {
        const stats = { ...state.stats, fetchedBytes: state.stats.fetchedBytes + command.bytes, peakChunkBytes: Math.max(state.stats.peakChunkBytes, command.bytes), peakOwnedBytes: Math.max(state.stats.peakOwnedBytes, !command.done || command.bytes ? active.size + command.bytes : 0) };
        if (state.closed || active.epoch !== state.epoch)
            return result({ ...state, stats: Object.freeze({ ...stats, discardedBytes: stats.discardedBytes + active.received + command.bytes }) }, { aborted: true });
        if (command.done)
            return result({ ...state, stats: Object.freeze(stats) }, active.received === active.size ? {} : { error: 'Local file changed or truncated' });
        if (active.received + command.bytes > active.size)
            return result({ ...state, stats: Object.freeze(stats) }, { error: 'Local read exceeds requested slice' });
        return result({ ...state, active: Object.freeze({ ...active, received: active.received + command.bytes }), stats: Object.freeze(stats) });
    }
    const current = !state.closed && active.epoch === state.epoch, stats = { ...state.stats, activeBytes: 0 };
    if (command.success && !current)
        stats.discardedBytes += active.received;
    let cache = state.cache;
    const evict = [];
    if (command.success && current && state.cacheLimit && active.size <= state.cacheLimit) {
        let retained = stats.cacheBytes, index = 0;
        while (retained + active.size > state.cacheLimit) {
            const item = cache[index++];
            retained -= item.size;
            evict.push(item.key);
        }
        cache = Object.freeze([...cache.slice(index), Object.freeze({ key: active.key, size: active.size })]);
        stats.cacheBytes = retained + active.size;
        stats.peakCacheBytes = Math.max(stats.peakCacheBytes, stats.cacheBytes);
    }
    return result({ ...state, active: null, cache, stats: Object.freeze(stats) }, { publish: command.success && current, aborted: command.success && !current, evict: Object.freeze(evict) });
}
