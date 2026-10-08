// SPDX-License-Identifier: Apache-2.0
import type { DeployedProviderAsset, ParsedProviderDeployment } from './provider-catalog.js';
/** Runtime-owned immutable assets. Consumer cancellation never cancels a shared
 * request; disposal of the runtime does. Eviction drops cache ownership only. */
export declare class SharedProviderAssets {
    private maxBytes;
    private entries;
    private acquisitions;
    private control;
    private get destroyed();
    private destruction?;
    constructor(maxBytes?: number);
    get stats(): Readonly<{
        entries: number;
        reservedBytes: number;
        maxBytes: number;
    }>;
    private transition;
    private entry;
    bytes(deployment: ParsedProviderDeployment, providerId: string, asset: DeployedProviderAsset): Promise<ArrayBuffer>;
    module(deployment: ParsedProviderDeployment, providerId: string, asset: DeployedProviderAsset): Promise<WebAssembly.Module>;
    clear(): void;
    destroy(): Promise<void>;
}
