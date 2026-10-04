// SPDX-License-Identifier: Apache-2.0
import { EXECUTION_CAPABILITIES } from './execution-capabilities.js';
export { compareProviderPreferences } from './machine/provider-runtime.js';
import { PlayerError } from './errors.js';
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
    if (![now, policy.maxAgeMs, policy.maxStartupMs, policy.minThroughputRatio, ...(policy.maxPeakBytes === undefined ? [] : [policy.maxPeakBytes])].every(n => Number.isFinite(n) && n >= 0))
        throw Error('Invalid cost policy limits');
    const candidates = [...new Set(bindingIds)];
    const costs = new Map();
    const excluded = [];
    for (const id of candidates) {
        const matches = records.filter(r => r.bindingId === id && r.contextKey === contextKey && r.measurement === 'complete-recipe'
            && Number.isFinite(r.measuredAt) && r.measuredAt <= now && now - r.measuredAt <= policy.maxAgeMs
            && Number.isSafeInteger(r.samples) && r.samples >= 2 && !!r.evidenceId
            && [r.remainingStartupMs, r.throughputRatio, r.startupUncertaintyMs].every(n => Number.isFinite(n) && n >= 0)
            && [r.steadyCpuMsPerSecond, r.cpuUncertaintyMsPerSecond, r.peakBytes].every(n => n === undefined || (Number.isFinite(n) && n >= 0))
            && (policy.objective !== 'steady-cpu' || (r.steadyCpuMsPerSecond !== undefined && r.cpuUncertaintyMsPerSecond !== undefined))
            && (policy.maxPeakBytes === undefined || r.peakBytes !== undefined));
        const record = matches.sort((a, b) => b.measuredAt - a.measuredAt)[0];
        if (!record)
            continue;
        if (record.remainingStartupMs + record.startupUncertaintyMs > policy.maxStartupMs || (policy.maxPeakBytes !== undefined && record.peakBytes > policy.maxPeakBytes) || record.throughputRatio < policy.minThroughputRatio)
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
/** Capture caller policy once. Provider IDs can name optional deployments;
 * unknown IDs never add offers or qualification. */
export function normalizeProviderPreferences(value) {
    if (value === undefined)
        return Object.freeze([]);
    const invalid = () => new PlayerError('INVALID_ARGUMENT', 'Invalid providerPreferences: use unique capability rules and nonempty, unique provider IDs');
    if (!Array.isArray(value) || value.length > 64)
        throw invalid();
    const capabilities = new Set();
    return Object.freeze(Array.from(value, rule => {
        if (!rule || typeof rule !== 'object' || typeof rule.capability !== 'string' || !Object.prototype.hasOwnProperty.call(EXECUTION_CAPABILITIES, rule.capability)
            || capabilities.has(rule.capability) || !Array.isArray(rule.providers) || !rule.providers.length || rule.providers.length > 256)
            throw invalid();
        capabilities.add(rule.capability);
        const ids = new Set();
        const providers = Array.from(rule.providers, (id) => {
            if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.length > 256 || ids.has(id))
                throw invalid();
            ids.add(id);
            return id;
        });
        return Object.freeze({ capability: rule.capability, providers: Object.freeze(providers) });
    }));
}
