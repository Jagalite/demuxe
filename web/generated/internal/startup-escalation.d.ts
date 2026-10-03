// SPDX-License-Identifier: Apache-2.0
import type { StartupEscalationOptions } from '../types.js';
export declare function startupEscalationPolicy(options?: StartupEscalationOptions | false): Readonly<{
    prefetchAfterMs: number;
    switchAfterMs: number;
}> | undefined;
/** Immutable fallback code only. No media, worker, decoder or audio allocation. */
export declare class StartupModules {
    private base;
    private state;
    private controller;
    private binaries;
    private pending;
    constructor(base: URL);
    ready(path: string): Promise<WebAssembly.Module> | undefined;
    bytes(path: string): Promise<ArrayBuffer | undefined>;
    warm(path: string): Promise<WebAssembly.Module>;
    private load;
    destroy(): void;
}
