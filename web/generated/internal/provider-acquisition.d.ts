import type { ParsedProviderDeployment } from './provider-catalog.js';
import type { CompositionEvidence, ProviderCatalog, ProviderFact, RecipeResolution, ResolvableRecipe } from './provider-resolution.js';
export type ProviderPreparation = Readonly<{
    state: 'ready';
    dispose(): void | Promise<void>;
}> | Readonly<{
    state: 'unavailable';
    reason: string;
}>;
export type ProviderOwner = Readonly<{
    id: string;
    implementationIdentity: string;
    /** Owner code is supplied by the application build, never evaluated from a
     * deployment manifest. It consumes verified bytes and owns runtime/ABI checks,
     * workers, instantiation and disposal. No recipe qualification is granted. */
    prepare(context: Readonly<{
        provider: ProviderFact;
        signal: AbortSignal;
        asset(id: string): Promise<ArrayBuffer>;
    }>): Promise<ProviderPreparation>;
}>;
export type ProviderAcquisitionOptions = Readonly<{
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxResidentBytes?: number;
}>;
/** One acquisition scope per attempted execution. Not a global engine cache.
 * Assets are fetched only when a selected owner requests them, shared by content
 * identity within this scope, and checked before any bytes reach owner code.
 * JSPI/Asyncify, compilation and native probes belong to the supplied owner.
 * A fresh scope is required for a different source/runtime qualification key.
 */
export declare class ProviderAcquisition {
    private readonly deployment;
    private catalogValue;
    private readonly controller;
    private readonly owners;
    private readonly assets;
    private readonly bytes;
    private readonly preparations;
    private readonly releases;
    private reservedBytes;
    private scopeKey?;
    private readonly resolutions;
    private closePromise?;
    private readonly request;
    private readonly timeoutMs;
    private readonly maxResidentBytes;
    constructor(deployment: ParsedProviderDeployment, owners: readonly ProviderOwner[], options?: ProviderAcquisitionOptions);
    get catalog(): ProviderCatalog;
    /** Read immutable bytes for explicit inspection/preparation without claiming
     * that an execution composition is qualified or marking an owner ready. */
    readAsset(providerId: string, implementationIdentity: string, assetId: string): Promise<ArrayBuffer>;
    resolve(recipe: ResolvableRecipe, evidence: readonly CompositionEvidence[], scopeKey: string): RecipeResolution;
    /** Resolution must be produced against this exact catalog snapshot. Accept
     * one explicitly selected binding; never guess order among alternatives. */
    acquire(resolution: RecipeResolution, bindingId: string): Promise<void>;
    private observe;
    private prepare;
    private load;
    private fetchAsset;
    /** Aborts in-flight acquisition, waits for owner cleanup, then releases ready
     * owners in reverse order. Repeated calls share the same completion/error. */
    dispose(): Promise<void>;
}
