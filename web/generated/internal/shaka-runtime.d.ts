// SPDX-License-Identifier: Apache-2.0
import type { Shaka } from './shaka-api.js';
import type { ProviderRuntimeAssets } from './provider-runtime.js';
/** Shared runtime policy has one module lifetime; executable code, promises,
 * script nodes, fetch controllers and object URLs stay in this adapter. */
export declare class ShakaRuntimeLoader {
    private readonly providerAssets?;
    private readonly bundledIncluded;
    constructor(providerAssets?: ProviderRuntimeAssets | undefined, bundledIncluded?: boolean);
    private state;
    private handles;
    load(base: URL, signal: AbortSignal): Promise<typeof Shaka>;
    private current;
    private cleanup;
    private cancel;
    private finish;
    private deadline;
    private start;
}
export declare function runtimeAt(base: URL, signal: AbortSignal, assets?: ProviderRuntimeAssets): Promise<typeof Shaka>;
