import type { CompositionEvidence, ProviderCatalog, RecipeResolution } from './provider-resolution.js';
export type AdmittedProviderPlan = Readonly<{
    id: string;
    eligible: boolean;
    code?: string;
    reason?: string;
}>;
export type ProviderPlanDecision = Readonly<{
    planId: string;
    code?: string;
    reason?: string;
    resolution?: RecipeResolution;
}>;
export type ProviderPlanSelection = Readonly<{
    state: 'available' | 'pending';
    planId: string;
    resolution: RecipeResolution;
    decisions: readonly ProviderPlanDecision[];
}> | Readonly<{
    state: 'failed';
    error: Error;
    decisions: readonly ProviderPlanDecision[];
}> | Readonly<{
    state: 'exhausted';
    error?: Error;
    decisions: readonly ProviderPlanDecision[];
}>;
/** Deployment stage after existing admission and explicit-mode filtering.
 * Pure, ordered, bounded; it never admits a rejected plan or probes later plans
 * while an earlier candidate still needs acquisition. The original backend
 * owner selects its guarded implementation and verifies actual output.
 * Not enabled in Player until package deployment integration is qualified.
 */
export declare function nextProviderPlan(plans: readonly AdmittedProviderPlan[], catalog: ProviderCatalog, evidence: readonly CompositionEvidence[], scopeKey: string): ProviderPlanSelection;
