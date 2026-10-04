// SPDX-License-Identifier: Apache-2.0
import type { CostDecision, CostPolicy, MeasuredBindingCost } from './provider-cost.js';
import type { ProviderPreferences } from '../types.js';
import type { ResolvableRecipe, RecipeResolution } from './provider-resolution.js';
export declare class ComponentSelectionError extends Error {
    readonly code: 'QUALIFICATION_REQUIRED' | 'RUNTIME_BUDGET_EXCEEDED';
    constructor(code: 'QUALIFICATION_REQUIRED' | 'RUNTIME_BUDGET_EXCEEDED', message: string);
}
/** Selection within one already-admitted, explicitly enumerated composition.
 * This does not reorder playback plans or turn provider failure into absence.
 * Readiness/deployment/source/browser identity belongs in the cost context.
 * Only the maintained owner supplies evidence; manifests never supply costs. */
export declare function selectComponentBinding(resolution: RecipeResolution, baseline: string, measurement?: {
    records: readonly MeasuredBindingCost[];
    contextKey: string;
    policy: CostPolicy;
    now: number;
}, preference?: {
    recipe: ResolvableRecipe;
    providerPreferences: ProviderPreferences;
}): CostDecision;
/** Execute a selected composition using existing scoped acquisition. A runtime
 * probe may remove a provider and trigger another admitted binding; an asset or
 * execution failure is terminal here and retains its identity for the plan owner.
 * Cost ranking is used only for the initial readiness snapshot. Resource-limit
 * exclusions survive retries until a new execution supplies fresh evidence. */
export declare function executeComponentBinding<T>(acquisition: import('./provider-acquisition.js').ProviderAcquisition, recipe: import('./provider-resolution.js').ResolvableRecipe, evidence: readonly import('./provider-resolution.js').CompositionEvidence[], scopeKey: string, baseline: string, execute: (bindingId: string) => Promise<T>, measurement?: Parameters<typeof selectComponentBinding>[2], providerPreferences?: ProviderPreferences): Promise<{
    value: T;
    decision: CostDecision;
}>;
