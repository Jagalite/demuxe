// SPDX-License-Identifier: Apache-2.0
export interface ProviderRuntimeAssets {
    module(path: string): Promise<WebAssembly.Module>;
    bytes(path: string): Promise<ArrayBuffer>;
}
/** Per-player deployment state. Only the maintained finite recipes are admitted;
 * packaging metadata cannot add compositions or confer build qualification. */
export declare class ProviderRuntime implements ProviderRuntimeAssets {
    private base;
    private qualified;
    private controller;
    private deployment?;
    private loading?;
    private assets?;
    private modules;
    private acquiredBytes;
    private readonly sources;
    private nextSource;
    private manifestIdentities;
    constructor(base: URL, qualified: Readonly<Record<string, string>>);
    load(): Promise<void>;
    has(path: string): boolean;
    hasOffer(providerId: string, profile: string): boolean;
    private evidence;
    /** The caller invokes this only after existing semantic/source admission.
     * Evidence is scoped to source identity, selected settings and runtime. It
     * binds to the core's reviewed implementation registry, never manifest offers. */
    rejection(planId: string, source: object, configuration: string, runtime?: 'pthread' | 'jspi' | 'asyncify'): string | undefined;
    bytes(path: string): Promise<ArrayBuffer>;
    private acquire;
    module(path: string): Promise<WebAssembly.Module>;
    destroy(): Promise<void>;
}
