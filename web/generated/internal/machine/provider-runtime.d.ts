// SPDX-License-Identifier: Apache-2.0
export type RuntimeProvider = Readonly<{
    id: string;
    implementationIdentity: string;
    manifestMatches: boolean;
    assets: readonly string[];
    profiles: readonly string[];
}>;
export type RuntimeAsset = Readonly<{
    id: string;
    path: string;
    url: string;
}>;
export type RuntimeRequest = Readonly<{
    kind: 'bytes' | 'module';
    path: string;
    status: 'pending' | 'ready' | 'failed';
}>;
export type ProviderRuntimeState = Readonly<{
    phase: 'idle' | 'loading' | 'ready' | 'failed' | 'retiring' | 'closed';
    loadStarted: boolean;
    cancelled: boolean;
    deadline: number;
    manifestBytes: number;
    qualified: Readonly<Record<string, string>>;
    providers: readonly RuntimeProvider[];
    assets: readonly RuntimeAsset[];
    requests: readonly RuntimeRequest[];
}>;
export declare function createProviderRuntime(qualified: Readonly<Record<string, string>>): ProviderRuntimeState;
export declare function admitRuntimeLoad(state: ProviderRuntimeState, now: number): Readonly<{
    state: ProviderRuntimeState;
    effect: 'start' | 'join' | 'retired';
}>;
export declare function observeRuntimeManifest(state: ProviderRuntimeState, event: Readonly<{
    kind: 'bytes';
    bytes: number;
} | {
    kind: 'deadline';
    now: number;
} | {
    kind: 'failed';
}>): Readonly<{
    state: ProviderRuntimeState;
    effect: 'accepted' | 'overflow' | 'abort' | 'ignore';
}>;
export declare function acceptRuntimeDeployment(state: ProviderRuntimeState, providers: readonly RuntimeProvider[], assets: readonly RuntimeAsset[]): Readonly<{
    state: ProviderRuntimeState;
    accepted: boolean;
}>;
export declare function runtimeAssetPath(state: ProviderRuntimeState, path: string, url: string): string;
export declare function runtimeAssetOwner(state: ProviderRuntimeState, url: string): Readonly<{
    kind: 'ready';
    providerId: string;
    implementationIdentity: string;
    assetId: string;
} | {
    kind: 'absent' | 'unqualified';
}>;
export declare function runtimeHasOffer(state: ProviderRuntimeState, providerId: string, profile: string): boolean;
export declare function admitRuntimeRequest(state: ProviderRuntimeState, kind: RuntimeRequest['kind'], path: string): Readonly<{
    state: ProviderRuntimeState;
    effect: 'start' | 'join' | 'retired' | 'unavailable';
}>;
export declare function completeRuntimeRequest(state: ProviderRuntimeState, kind: RuntimeRequest['kind'], path: string, ok: boolean): ProviderRuntimeState;
export declare function retireProviderRuntime(state: ProviderRuntimeState): ProviderRuntimeState;
export declare function closeProviderRuntime(state: ProviderRuntimeState): ProviderRuntimeState;
export declare function runtimeCompositionEvidence(state: ProviderRuntimeState, recipe: Readonly<{
    id: string;
    bindings: readonly Readonly<{
        id: string;
        providerIds: readonly string[];
    }>[];
}>, scopeKey: string): Array<{
    recipeId: string;
    bindingId: string;
    scopeKey: string;
    implementationIdentities: Record<string, string>;
}>;
export declare function requiredRuntimeAssets(input: Readonly<{
    runtime: 'pthread' | 'jspi' | 'asyncify';
    prepared: boolean;
    adaptation: boolean;
    selectedAudio: boolean;
    backend: string;
    hybrid: boolean;
}>): readonly string[];
export type CodecRuntime = 'pthread' | 'jspi' | 'asyncify';
export type RuntimeCodecPreparation = Readonly<{
    providerId: string;
    folder: string;
    wasmPath: string;
    runtime: 'jspi' | 'asyncify';
    audioIndex?: number;
    videoIndex?: number;
}>;
export type RuntimeProbeTrack = Readonly<{
    id: string;
    index: number;
    type: string;
    codec: string;
    attachedPicture?: boolean;
    default?: boolean;
    sampleRate?: number;
    channels?: number;
}>;
export type RuntimeProbe = Readonly<{
    format?: string;
    tracks: readonly RuntimeProbeTrack[];
}>;
export type CodecProfileAvailability = Readonly<{
    profile: string;
    offered: boolean;
    deployed: boolean;
}>;
export declare function captureRuntimeProbe(probe: RuntimeProbe): RuntimeProbe;
export declare function codecProfile(profile: string, runtime: 'jspi' | 'asyncify'): RuntimeCodecPreparation;
export declare function selectCodecInspector(runtime: CodecRuntime, availability: readonly CodecProfileAvailability[]): RuntimeCodecPreparation | undefined;
export declare function selectCodecPreparation(input: Readonly<{
    local: boolean;
    file: boolean;
    runtime: CodecRuntime;
    probe: RuntimeProbe | undefined;
    aid: string;
}>, availability: readonly CodecProfileAvailability[]): RuntimeCodecPreparation | undefined;
export type CodecSourceState = Readonly<{
    hint: RuntimeCodecPreparation | null;
    probe: RuntimeProbe | null;
}>;
/** The shell keeps this detached per-source value in a WeakMap, never a global
 * strong index of media objects. Failed reselection clears only the hint. */
export declare function updateCodecSource(previous: CodecSourceState | undefined, input: Readonly<{
    local: boolean;
    file: boolean;
    runtime: CodecRuntime;
    probe: RuntimeProbe | undefined;
    aid: string;
}>, availability: readonly CodecProfileAvailability[]): CodecSourceState;
export declare function storedCodecPreparation(state: CodecSourceState | undefined, runtime: CodecRuntime, deployed: boolean): RuntimeCodecPreparation | undefined;
export type RepairCandidate = Readonly<{
    codec: 'truehd' | 'mlp' | 'dts-hd';
    channels: 2 | 6 | 8;
}>;
export declare function selectAudioRepair(input: Readonly<{
    local: boolean;
    blob: boolean;
    size: number;
    probe: RuntimeProbe | undefined;
    container: boolean;
    truehd: boolean;
    dts: boolean;
    flac: boolean;
}>): RepairCandidate | undefined;
