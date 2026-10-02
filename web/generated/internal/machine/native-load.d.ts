// SPDX-License-Identifier: Apache-2.0
export type NativeLoadRequest = Readonly<{
    id: number;
    epoch: number;
    kind: 'load';
}>;
export type NativeLoadPolicy = Readonly<{
    requested: boolean;
    original: boolean;
    remux: 'auto' | 'never' | 'always';
    requiresRemux: boolean;
    adaptation: 'flac' | 'opus' | 'flac24' | undefined;
}>;
type Work = Readonly<{
    request: NativeLoadRequest;
    kind: 'source' | 'audio-track';
    phase: 'plan' | 'services' | 'rollback' | 'resuming';
    policy: NativeLoadPolicy;
    position: number;
    paused: boolean;
    attemptedAdaptation: boolean;
}>;
export type NativeLoadState = Readonly<{
    work: Work | null;
    adapted: boolean;
    directFailure: string | undefined;
}>;
export declare function initialNativeLoad(): NativeLoadState;
export declare function nativeLoadOpening(state: NativeLoadState): boolean;
export declare function nativeLoadCurrent(state: NativeLoadState, request: NativeLoadRequest): boolean;
export declare function beginNativeLoad(state: NativeLoadState, request: NativeLoadRequest, kind: Work['kind'], policy: NativeLoadPolicy, position: number, paused: boolean): NativeLoadState;
export declare function retireNativeLoad(state: NativeLoadState): NativeLoadState;
export declare function selectNativeLoadRoute(policy: NativeLoadPolicy): Readonly<{
    route?: 'direct' | 'remux';
    error?: string;
}>;
export declare function selectNativePreparation(facts: Readonly<{
    codecEngine: boolean;
    file: boolean;
    adaptation: 'flac' | 'opus' | 'flac24' | undefined;
    selectiveAudio: boolean;
    embeddedSubtitles: boolean;
    externalSubtitles: boolean;
    prepareAudio: boolean;
}>): Readonly<{
    audio: boolean;
    mp4: boolean;
}>;
export type NativeLoadEvent = Readonly<{
    type: 'direct-failed';
    code: number | undefined;
    reason: string;
}> | Readonly<{
    type: 'projection-failed';
    reason: string;
}> | Readonly<{
    type: 'attempt';
    adapted: boolean;
}> | Readonly<{
    type: 'attempt-failed';
    reason: string;
}> | Readonly<{
    type: 'services';
}> | Readonly<{
    type: 'track-failed';
}> | Readonly<{
    type: 'track-settled';
}> | Readonly<{
    type: 'finish';
}>;
export type NativeLoadDecision = Readonly<{
    state: NativeLoadState;
    accepted: boolean;
    fallback?: boolean;
    rollback?: boolean;
    resume?: boolean;
    position?: number;
}>;
export declare function transitionNativeLoad(state: NativeLoadState, request: NativeLoadRequest, event: NativeLoadEvent): NativeLoadDecision;
export {};
