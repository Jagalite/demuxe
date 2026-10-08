// SPDX-License-Identifier: Apache-2.0
import type { ParsedProviderDeployment } from './internal/provider-catalog.js';
import type { RuntimeProvider } from './internal/machine/provider-runtime.js';
import type { DemuxeRuntimeHandle, DemuxeRuntimeOptions, ProviderLoadOptions, ProviderCatalogSnapshot } from './runtime-types.js';
export type { DemuxeRuntimeOptions, ProviderLoadOptions, ProviderCatalogSnapshot } from './runtime-types.js';
export type RuntimeDeploymentSnapshot = Readonly<{
    revision: number;
    deployment: ParsedProviderDeployment;
    providers: readonly RuntimeProvider[];
}>;
type RuntimeAccess = {
    snapshot(): RuntimeDeploymentSnapshot;
    read(snapshot: RuntimeDeploymentSnapshot, assetId: string, compile: true): Promise<WebAssembly.Module>;
    read(snapshot: RuntimeDeploymentSnapshot, assetId: string, compile: false): Promise<ArrayBuffer>;
};
/** @internal Only per-player provider owners consume admitted asset snapshots. */
export declare function runtimeAccess(runtime: DemuxeRuntime): RuntimeAccess;
/** Stop waiting without cancelling other consumers of shared work. */
export declare function awaitRuntime<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T>;
/** Application-owned provider catalog and bounded asset cache. Players own
 * independent sessions and never destroy this shared runtime. */
export declare class DemuxeRuntime implements DemuxeRuntimeHandle {
    get assetBase(): string;
    get qualifiedProviders(): Readonly<Record<string, string>>;
    private readonly qualification;
    private control;
    private base;
    private assets;
    private controller;
    private loads;
    private listeners;
    private current;
    private snapshots;
    private destruction?;
    readonly providers: Readonly<{
        load(manifest: string, options?: ProviderLoadOptions): Promise<ProviderCatalogSnapshot>;
        preload(ids?: readonly string[], options?: Pick<ProviderLoadOptions, 'signal'>): Promise<void>;
        readonly snapshot: ProviderCatalogSnapshot;
    }>;
    constructor(options?: DemuxeRuntimeOptions);
    private assertLive;
    get snapshot(): ProviderCatalogSnapshot;
    get cacheStats(): Readonly<{
        entries: number;
        reservedBytes: number;
        maxBytes: number;
    }>;
    clearCache(): void;
    /** @internal Snapshot adoption happens at a player's operation boundary. */
    private deploymentSnapshot;
    /** @internal Listeners schedule work; they must not mutate active sessions. */
    subscribe(listener: () => void): () => void;
    private load;
    private loadManifest;
    private preload;
    /** @internal Asset identity and ownership come from an admitted snapshot. */
    private read;
    destroy(): Promise<void>;
}
