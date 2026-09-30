import type { ProviderAvailability, ProviderCatalog } from './provider-resolution.js';
export type DeployedProviderAsset = Readonly<{
    id: string;
    url: string;
    sha256: string;
    bytes: number;
    dependencies: readonly string[];
}>;
export type ParsedProviderDeployment = Readonly<{
    catalog: ProviderCatalog;
    assets: readonly DeployedProviderAsset[];
    providerAssets: Readonly<Record<string, readonly string[]>>;
}>;
/** Parse configuration only. No fetches, native probes or module initialization.
 * Declared hashes are acquisition expectations, not verified bytes. A deployed
 * provider starts configured-unverified; only the current acquisition/probe
 * owner can supply availability. Packages never supply qualification here.
 */
export declare function parseProviderDeployment(value: unknown, assetBase: URL): ParsedProviderDeployment;
/** Immutable update from a loader/probe owner. Reject stale or cross-build
 * observations rather than transferring availability to another implementation.
 */
export declare function withProviderAvailability(catalog: ProviderCatalog, revision: string, updates: readonly Readonly<{
    id: string;
    implementationIdentity: string;
    availability: ProviderAvailability;
}>[]): ProviderCatalog;
