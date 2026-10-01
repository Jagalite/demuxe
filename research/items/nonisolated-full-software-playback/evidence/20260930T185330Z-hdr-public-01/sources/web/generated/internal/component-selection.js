// SPDX-License-Identifier: Apache-2.0
import { compareProviderCosts } from './provider-cost.js';
import { providerResolutionError } from './provider-deployment-errors.js';
export class ComponentSelectionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'ComponentSelectionError';
    }
}
/** Selection within one already-admitted, explicitly enumerated composition.
 * This does not reorder playback plans or turn provider failure into absence.
 * Readiness/deployment/source/browser identity belongs in the cost context.
 * Only the maintained owner supplies evidence; manifests never supply costs. */
export function selectComponentBinding(resolution, baseline, measurement) {
    const failed = resolution.bindings.find(b => b.state === 'failed');
    if (failed?.state === 'failed')
        throw failed.error;
    const eligible = resolution.bindings.filter(b => b.state === 'available' || b.state === 'pending').map(b => b.bindingId);
    if (!eligible.length)
        throw providerResolutionError([resolution]) ?? new ComponentSelectionError('QUALIFICATION_REQUIRED', 'No qualified provider-backed recipe remains');
    const fallback = eligible.includes(baseline) ? baseline : eligible[0];
    if (!measurement)
        return { bindingId: fallback, reason: 'baseline', evidenceIds: [], excluded: [] };
    const decision = compareProviderCosts(eligible, fallback, measurement.records, measurement.contextKey, measurement.policy, measurement.now);
    if (!decision)
        throw new ComponentSelectionError('RUNTIME_BUDGET_EXCEEDED', 'No available qualified composition satisfies the measured runtime resource limits');
    return decision;
}
/** Execute a selected composition using existing scoped acquisition. A runtime
 * probe may remove a provider and trigger another admitted binding; an asset or
 * execution failure is terminal here and retains its identity for the plan owner.
 * Cost ranking is used only for the initial readiness snapshot. Resource-limit
 * exclusions survive retries until a new execution supplies fresh evidence. */
export async function executeComponentBinding(acquisition, recipe, evidence, scopeKey, baseline, execute, measurement) {
    const excluded = new Set();
    for (let attempt = 0; attempt <= recipe.bindings.length; attempt++) {
        const resolution = acquisition.resolve(recipe, evidence, scopeKey);
        const failed = resolution.bindings.find(b => b.state === 'failed');
        if (failed?.state === 'failed')
            throw failed.error;
        const available = resolution.bindings.filter(b => b.state === 'available' || b.state === 'pending');
        if (available.length && available.every(b => excluded.has(b.bindingId)))
            throw new ComponentSelectionError('RUNTIME_BUDGET_EXCEEDED', 'Remaining available compositions were excluded by the measured runtime resource limits');
        // Filter only the pure selection input. Acquisition still receives the
        // original immutable resolution ticket issued for the current catalog.
        const selection = { ...resolution, bindings: resolution.bindings.filter(b => !excluded.has(b.bindingId)) };
        const selected = selectComponentBinding(selection, baseline, attempt === 0 ? measurement : undefined);
        for (const id of selected.excluded)
            excluded.add(id);
        const decision = { ...selected, excluded: [...excluded] };
        await acquisition.acquire(resolution, decision.bindingId);
        const after = acquisition.resolve(recipe, evidence, scopeKey);
        const binding = after.bindings.find(b => b.bindingId === decision.bindingId);
        if (binding?.state === 'available')
            return { value: await execute(decision.bindingId), decision };
        if (after.state === 'failed')
            selectComponentBinding(after, baseline);
    }
    throw new ComponentSelectionError('QUALIFICATION_REQUIRED', 'Component availability did not converge within the admitted binding set');
}
