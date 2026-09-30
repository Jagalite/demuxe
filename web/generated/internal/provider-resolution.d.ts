import type { CapabilityRequest, ProviderDelivery, ProviderTechnology } from './execution-capabilities.js';
export type ProviderAvailability = Readonly<{
    state: 'absent';
    reason: string;
}> | Readonly<{
    state: 'configured-unverified';
}> | Readonly<{
    state: 'available';
}> | Readonly<{
    state: 'failed';
    error: Error;
}>;
export type ProviderFact = Readonly<{
    id: string;
    /** Artifact/build + binding ABI + runtime identity, not an npm package name. */
    implementationIdentity: string;
    technology: ProviderTechnology;
    delivery: readonly ProviderDelivery[];
    offers: readonly CapabilityRequest[];
    availability: ProviderAvailability;
    packageName?: string;
    applicationBuild?: string;
}>;
export type ProviderCatalog = Readonly<{
    revision: string;
    providers: readonly ProviderFact[];
}>;
export type ProviderAssignment = Readonly<{
    providerId: string;
    requirements: readonly CapabilityRequest[];
}>;
export type QualifiedRecipeBinding = Readonly<{
    id: string;
    assignments: readonly ProviderAssignment[];
}>;
export type ResolvableRecipe = Readonly<{
    id: string;
    requirements: readonly CapabilityRequest[];
    bindings: readonly QualifiedRecipeBinding[];
}>;
export type CompositionEvidence = Readonly<{
    recipeId: string;
    bindingId: string;
    /** Source/selected tracks/features/browser/runtime envelope established by
     * admission. Callers must invalidate this key when those facts change. */
    scopeKey: string;
    implementationIdentities: Readonly<Record<string, string>>;
}>;
export type MissingProviderRequirement = Readonly<{
    providerId: string;
    requirements: readonly CapabilityRequest[];
    packageName?: string;
    reason: 'not-configured' | 'absent' | 'capability-not-provided' | 'implementation-not-qualified';
}>;
export type BindingResolution = Readonly<{
    bindingId: string;
    state: 'available' | 'pending';
    providerIds: readonly string[];
}> | Readonly<{
    bindingId: string;
    state: 'unavailable';
    missing: readonly MissingProviderRequirement[];
}> | Readonly<{
    bindingId: string;
    state: 'unqualified';
    reason: string;
}> | Readonly<{
    bindingId: string;
    state: 'failed';
    error: Error;
}>;
export type RecipeResolution = Readonly<{
    recipeId: string;
    deploymentRevision: string;
    scopeKey: string;
    bindings: readonly BindingResolution[];
    state: 'available' | 'pending' | 'unavailable' | 'unqualified' | 'failed';
    code?: 'DEPLOYMENT_UNAVAILABLE' | 'QUALIFICATION_REQUIRED';
}>;
/** Bounded resolution of enumerated compositions, not graph construction.
 * No I/O, global state, environment probes, instantiation or playback decisions.
 * Evidence is supplied by the maintained qualification owner, never a package's
 * self-declared `provides` list. The caller retains route order and terminal
 * error handling; `pending` requires existing bounded acquisition checks.
 */
export declare function resolveProviderRecipe(recipe: ResolvableRecipe, catalog: ProviderCatalog, evidence: readonly CompositionEvidence[], scopeKey: string): RecipeResolution;
/** No negative-result cache is needed yet. Future caches must use this scope,
 * not the source compatibility cache or just the plan/provider name. */
export declare function providerResolutionKey(resolution: RecipeResolution): string;
