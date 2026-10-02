// SPDX-License-Identifier: Apache-2.0
import type { CapabilityEvidenceData } from './routing.js';
import { type NativeLoadState, type NativeLoadRequest, type NativeLoadPolicy, type NativeLoadEvent } from './native-load.js';
type Expected = Readonly<{
    video: boolean;
    audio: boolean;
}>;
export type NativeRequest = Readonly<{
    id: number;
    epoch: number;
    kind: 'verification' | 'seek' | 'load';
}>;
type Verification = Readonly<{
    request: NativeRequest;
    output: boolean;
    budget: number;
    expected: Expected | undefined;
    phase: 'preflight' | 'sampling' | 'classifying' | 'audio' | 'complete';
    deadline: number;
    previouslyVerified: boolean;
    active: Expected;
    initialTime: number;
    initialFrames: number;
    initialAudioBytes: number | undefined;
    metadataPreparation: boolean;
    presented: boolean;
    selectiveAudio: boolean;
}>;
type Seek = Readonly<{
    request: NativeRequest;
    target: number;
    mediaTarget: number;
    correlated: boolean;
    deadline: number;
    accepted: boolean;
    completed: boolean;
    presented: boolean;
    retried: boolean;
    retryAt: number | undefined;
}>;
export type NativeBackendState = Readonly<{
    epoch: number;
    serial: number;
    stopped: boolean;
    expected: Expected | undefined;
    capability: CapabilityEvidenceData;
    verification: Verification | null;
    seek: Seek | null;
    seekPresentationRetries: number;
    load: NativeLoadState;
}>;
export declare function initialNativeBackend(): NativeBackendState;
export declare function nativeRequestCurrent(state: NativeBackendState, request: NativeRequest): boolean;
export type NativeAudioFacts = Readonly<{
    decodedBytes: number | undefined;
    present: boolean | undefined;
    tracksPresent: boolean;
    enabledTrack: boolean;
}>;
export declare function nativeAudioEvidence(facts: NativeAudioFacts, advancing: boolean): Readonly<{
    adapter: string;
    ready: boolean;
    strength: 'unknown' | 'presence' | 'decoded';
}>;
export type NativeVerificationFacts = Readonly<{
    now: number;
    readyState: number;
    videoWidth: number;
    time: number;
    frames: number;
    decodedFrames: number | undefined;
    seeking: boolean;
    paused: boolean;
    ended: boolean;
    audio: NativeAudioFacts;
}>;
type SeekFacts = Readonly<{
    position: number;
    seeking: boolean;
}>;
export type NativeBackendCommand = Readonly<{
    type: 'source';
}> | Readonly<{
    type: 'stop';
}> | Readonly<{
    type: 'load.begin';
    kind: 'source' | 'audio-track';
    policy: NativeLoadPolicy;
    position: number;
    paused: boolean;
}> | Readonly<{
    type: 'load.event';
    request: NativeLoadRequest;
    event: NativeLoadEvent;
}> | Readonly<{
    type: 'metadata';
    epoch: number;
}> | Readonly<{
    type: 'api-hint';
    epoch: number;
    value: string;
}> | Readonly<{
    type: 'verify.begin';
    output: boolean;
    budget: number;
    expected?: Expected;
}> | Readonly<{
    type: 'verify.start';
    request: NativeRequest;
    now: number;
    time: number;
    frames: number;
    audioBytes: number | undefined;
    videoWidth: number;
    selectiveAudio: boolean;
    metadataPreparation: boolean;
    videoEnd?: number;
    audioEnd?: number;
    timelineBias: number;
}> | Readonly<{
    type: 'verify.sample';
    request: NativeRequest;
    facts: NativeVerificationFacts;
}> | Readonly<{
    type: 'verify.presented';
    request: NativeRequest;
}> | Readonly<{
    type: 'verify.classify';
    request: NativeRequest;
}> | Readonly<{
    type: 'verify.deadline';
    request: NativeRequest;
    now: number;
    readyState: number;
    videoWidth: number;
    audioBytes: number | undefined;
    hasAudio: boolean | undefined;
}> | Readonly<{
    type: 'verify.audio';
    request: NativeRequest;
}> | Readonly<{
    type: 'verify.finish';
    request: NativeRequest;
    failed: boolean;
}> | Readonly<{
    type: 'seek.begin';
    target: number;
    mediaTarget: number;
    correlated: boolean;
    now: number;
}> | Readonly<{
    type: 'seek.frame';
    request: NativeRequest;
    facts: SeekFacts;
    mediaTime: number;
    matches: boolean;
}> | Readonly<{
    type: 'seek.seeked';
    request: NativeRequest;
    facts: SeekFacts;
    now: number;
}> | Readonly<{
    type: 'seek.retry';
    request: NativeRequest;
    facts: SeekFacts;
    now: number;
    paused: boolean;
    buffered: boolean;
}> | Readonly<{
    type: 'seek.completed';
    request: NativeRequest;
}> | Readonly<{
    type: 'seek.deadline';
    request: NativeRequest;
    now: number;
}> | Readonly<{
    type: 'seek.finish';
    request: NativeRequest;
}>;
export type NativeBackendDecision = Readonly<{
    state: NativeBackendState;
    accepted: boolean;
    request?: NativeRequest;
    retired?: NativeRequest;
    completed?: boolean;
    sample?: boolean;
    armFrame?: boolean;
    retry?: boolean;
    remaining?: number;
    fallback?: boolean;
    rollback?: boolean;
    resume?: boolean;
    position?: number;
    failure?: 'missing-audio' | 'missing-output' | 'verification-timeout' | 'seek-timeout';
}>;
export declare function transitionNativeBackend(state: NativeBackendState, command: NativeBackendCommand): NativeBackendDecision;
export {};
