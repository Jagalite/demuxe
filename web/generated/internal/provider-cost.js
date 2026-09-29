// SPDX-License-Identifier: Apache-2.0
export function providerReadinessKey(facts) {
    const ids = new Set();
    for (const fact of facts) {
        if (ids.has(fact.providerId))
            throw Error('Duplicate provider readiness');
        ids.add(fact.providerId);
    }
    return JSON.stringify([...facts].sort((a, b) => a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0)
        .map(f => [f.providerId, f.implementationIdentity, f.nativeConfiguration, f.bytes, f.javascript, f.wasm, f.instance]));
}
/** Only accepts already-qualified/available bindings. Complete, comparable
 * recipe evidence is mandatory; no assumed native/cache preference or sum of
 * component microbenchmarks. All times/limits are explicit inputs for replay.
 * Returns undefined if every measured binding fails resource/deadline limits.
 */
export function compareProviderCosts(bindingIds, baselineId, records, contextKey, policy, now) {
    if (!contextKey || bindingIds.length > 64 || records.length > 256 || !['startup', 'steady-cpu'].includes(policy.objective))
        throw Error('Invalid or excessive cost comparison scope');
    if (!bindingIds.includes(baselineId))
        throw Error('Cost baseline must be an available qualified binding');
    if (![now, policy.maxAgeMs, policy.maxStartupMs, policy.maxPeakBytes, policy.minThroughputRatio].every(n => Number.isFinite(n) && n >= 0))
        throw Error('Invalid cost policy limits');
    const candidates = [...new Set(bindingIds)];
    const costs = new Map();
    const excluded = [];
    for (const id of candidates) {
        const matches = records.filter(r => r.bindingId === id && r.contextKey === contextKey && r.measurement === 'complete-recipe'
            && Number.isFinite(r.measuredAt) && r.measuredAt <= now && now - r.measuredAt <= policy.maxAgeMs
            && Number.isSafeInteger(r.samples) && r.samples >= 2
            && [r.remainingStartupMs, r.steadyCpuMsPerSecond, r.peakBytes, r.throughputRatio, r.startupUncertaintyMs, r.cpuUncertaintyMsPerSecond].every(n => Number.isFinite(n) && n >= 0));
        const record = matches.sort((a, b) => b.measuredAt - a.measuredAt)[0];
        if (!record)
            continue;
        if (record.remainingStartupMs + record.startupUncertaintyMs > policy.maxStartupMs || record.peakBytes > policy.maxPeakBytes || record.throughputRatio < policy.minThroughputRatio)
            excluded.push(id);
        else
            costs.set(id, record);
    }
    const eligible = candidates.filter(id => !excluded.includes(id));
    if (!eligible.length)
        return undefined;
    const fallback = eligible.includes(baselineId) ? baselineId : eligible[0];
    const evidenceIds = [...costs.values()].map(c => c.evidenceId);
    if (eligible.some(id => !costs.has(id)))
        return { bindingId: fallback, reason: 'incomplete-evidence', evidenceIds, excluded };
    const value = (c) => policy.objective === 'startup' ? c.remainingStartupMs : c.steadyCpuMsPerSecond;
    const uncertainty = (c) => policy.objective === 'startup' ? c.startupUncertaintyMs : c.cpuUncertaintyMsPerSecond;
    const ranked = eligible.map(id => costs.get(id)).sort((a, b) => value(a) - value(b) || candidates.indexOf(a.bindingId) - candidates.indexOf(b.bindingId));
    const best = ranked[0], previous = costs.get(fallback);
    if (best.bindingId === fallback)
        return { bindingId: fallback, reason: 'baseline', evidenceIds, excluded };
    if (value(best) + uncertainty(best) >= value(previous) - uncertainty(previous))
        return { bindingId: fallback, reason: 'uncertain-difference', evidenceIds, excluded };
    return { bindingId: best.bindingId, reason: 'measured-cost', evidenceIds, excluded };
}
