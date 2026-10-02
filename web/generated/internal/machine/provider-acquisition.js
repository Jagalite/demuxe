// SPDX-License-Identifier: Apache-2.0
const result = (state, effect) => Object.freeze({ state, effect: Object.freeze({ ...effect }) });
export function createAcquisition(input) {
    return Object.freeze({ phase: 'active', catalogEpoch: 0, scopeKey: null, timeoutMs: input.timeoutMs, maxResidentBytes: input.maxResidentBytes, reservedBytes: 0,
        owners: Object.freeze(input.owners.map(owner => Object.freeze({ id: owner.id, availability: Object.freeze({ ...owner.availability }), preparation: 'idle' }))), assets: Object.freeze([]), releases: Object.freeze([]) });
}
export function admitAcquisition(state, input) {
    if (state.phase !== 'active')
        return result(state, { kind: 'reject', reason: 'retired' });
    if (input.ticketEpoch !== state.catalogEpoch || !input.revisionMatches || !input.scopeKey || state.scopeKey !== null && state.scopeKey !== input.scopeKey)
        return result(state, { kind: 'reject', reason: 'stale' });
    if (!input.resolved)
        return result(state, { kind: 'reject', reason: 'unresolved' });
    return result(Object.freeze({ ...state, scopeKey: input.scopeKey }), { kind: 'accepted' });
}
export function admitAcquisitionOwner(state, id) {
    if (state.phase !== 'active')
        return result(state, { kind: 'reject', reason: 'retired' });
    const owner = state.owners.find(owner => owner.id === id);
    if (!owner || owner.availability.state === 'absent')
        return result(state, { kind: 'reject', reason: 'absent' });
    if (owner.availability.state === 'failed')
        return result(state, { kind: 'reject', reason: 'failed', failureId: owner.availability.failureId });
    if (owner.preparation !== 'idle')
        return result(state, { kind: 'join' });
    return result(Object.freeze({ ...state, owners: Object.freeze(state.owners.map(owner => owner.id === id ? Object.freeze({ ...owner, preparation: 'pending' }) : owner)) }), { kind: 'start' });
}
export function finishAcquisitionOwner(state, id, outcome) {
    const owner = state.owners.find(owner => owner.id === id);
    if (owner?.preparation !== 'pending')
        return result(state, { kind: 'ignore' });
    if (state.phase !== 'active') {
        const next = Object.freeze({ ...state, owners: Object.freeze(state.owners.map(owner => owner.id === id ? Object.freeze({ ...owner, preparation: 'settled' }) : owner)) });
        return result(next, { kind: outcome.kind === 'ready' ? 'release' : 'ignore' });
    }
    const availability = outcome.kind === 'ready' ? Object.freeze({ state: 'available' }) : outcome.kind === 'unavailable' ? Object.freeze({ state: 'absent', reason: outcome.reason }) : Object.freeze({ state: 'failed', failureId: id });
    return result(Object.freeze({ ...state, catalogEpoch: state.catalogEpoch + 1,
        owners: Object.freeze(state.owners.map(owner => owner.id === id ? Object.freeze({ ...owner, availability, preparation: 'settled' }) : owner)),
        releases: outcome.kind === 'ready' ? Object.freeze([...state.releases, id]) : state.releases }), { kind: 'published' });
}
export function admitAcquisitionAsset(state, identity, bytes, now) {
    if (state.phase !== 'active')
        return result(state, { kind: 'reject', reason: 'retired' });
    if (state.assets.some(asset => asset.identity === identity))
        return result(state, { kind: 'join' });
    if (state.reservedBytes + bytes > state.maxResidentBytes)
        return result(state, { kind: 'reject', reason: 'budget' });
    return result(Object.freeze({ ...state, reservedBytes: state.reservedBytes + bytes, assets: Object.freeze([...state.assets, Object.freeze({ identity, bytes, received: 0, deadline: now + state.timeoutMs, status: 'pending', cancelled: false })]) }), { kind: 'start' });
}
export function observeAcquisitionAsset(state, identity, event) {
    const asset = state.assets.find(asset => asset.identity === identity);
    if (!asset || asset.status !== 'pending')
        return result(state, { kind: 'ignore' });
    if (event.kind === 'failed')
        return result(Object.freeze({ ...state, assets: Object.freeze(state.assets.map(asset => asset.identity === identity ? Object.freeze({ ...asset, status: 'failed' }) : asset)) }), { kind: 'accepted' });
    if (state.phase !== 'active' || asset.cancelled)
        return result(state, { kind: 'reject', reason: 'retired' });
    if (event.kind === 'deadline') {
        if (event.now < asset.deadline)
            return result(state, { kind: 'ignore' });
        return result(Object.freeze({ ...state, assets: Object.freeze(state.assets.map(asset => asset.identity === identity ? Object.freeze({ ...asset, cancelled: true }) : asset)) }), { kind: 'accepted' });
    }
    if (event.kind === 'body')
        return result(state, asset.received === asset.bytes ? { kind: 'accepted' } : { kind: 'reject', reason: 'size' });
    if (event.kind === 'chunk' && asset.received + event.bytes > asset.bytes)
        return result(state, { kind: 'reject', reason: 'overflow' });
    if (event.kind === 'digest' && asset.received !== asset.bytes)
        return result(state, { kind: 'reject', reason: 'size' });
    if (event.kind === 'digest' && !event.matches)
        return result(state, { kind: 'reject', reason: 'integrity' });
    return result(Object.freeze({ ...state, assets: Object.freeze(state.assets.map(item => item.identity === identity ? Object.freeze({ ...item, received: event.kind === 'chunk' ? item.received + event.bytes : item.received, status: event.kind === 'digest' ? 'ready' : item.status }) : item)) }), { kind: 'accepted' });
}
export function retireAcquisition(state) {
    if (state.phase !== 'active')
        return result(state, { kind: 'ignore' });
    return result(Object.freeze({ ...state, phase: 'retiring' }), { kind: 'accepted' });
}
/** Called after physical jobs settle; release order is reverse ready completion. */
export function acquisitionReleases(state) { return Object.freeze([...state.releases].reverse()); }
export function closeAcquisition(state) { return Object.freeze({ ...state, phase: 'closed', assets: Object.freeze([]), releases: Object.freeze([]), reservedBytes: 0 }); }
