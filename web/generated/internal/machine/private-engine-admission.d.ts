// SPDX-License-Identifier: Apache-2.0
export type PrivateRuntime = 'jspi' | 'asyncify';
export type PrivateProfile = 'subtitles' | 'audio' | 'playback';
export declare function privateRuntimeError(runtime: string, jspi: boolean, profile?: string): string | null;
export declare function privateManifestError(runtime: string, profile: string, facts: Readonly<{
    schema: unknown;
    backend: unknown;
    profile: unknown;
}>): string | null;
export declare function privateMpvAbiError(runtime: string, profile: string, names: readonly string[], retained: boolean, declared: unknown): string | null;
export declare function privateRemuxAbiError(runtime: string, names: readonly string[]): string | null;
export declare function privateAudioCapacityValid(capacity: unknown, declared: unknown): boolean;
export type PrivateSourceLifetime = Readonly<{
    phase: 'idle' | 'opening' | 'ready' | 'closed';
    serial: number;
    size: number | null;
}>;
export declare function initialPrivateSourceLifetime(): PrivateSourceLifetime;
export declare function beginPrivateSourceOpen(state: PrivateSourceLifetime): Readonly<{
    state: PrivateSourceLifetime;
    id: number | null;
}>;
export declare function privateSourceCurrent(state: PrivateSourceLifetime, id: number): boolean;
export declare function acceptPrivateSourceOpen(state: PrivateSourceLifetime, id: number, size: number): Readonly<{
    state: PrivateSourceLifetime;
    accepted: boolean;
    invalid: boolean;
}>;
export declare function closePrivateSourceLifetime(state: PrivateSourceLifetime): PrivateSourceLifetime;
