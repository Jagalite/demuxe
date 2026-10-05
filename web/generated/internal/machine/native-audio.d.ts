// SPDX-License-Identifier: Apache-2.0
import type { WatchdogPolicy } from '../../types.js';
export type NativeAudioPoint = Readonly<{
    kind: string;
    wallTime: number | null;
    mediaTime: number;
    rate: number;
    generation: number;
    epoch: number;
    audioFrame: number;
}>;
export type NativeAudioDomain = 'open' | 'playback' | 'seek' | 'rate' | 'context' | 'eof' | 'verify';
export type NativeAudioLease = Readonly<{
    epoch: number;
    id: number;
    domain: NativeAudioDomain;
}>;
export type NativeAudioRate = Readonly<{
    id: number;
    generation: number;
    rate: number;
    deadline: number;
    due: number | null;
}>;
export type NativeAudioPublication = Readonly<{
    id: number;
    generation: number;
    deadline: number;
    due: number | null;
    point: NativeAudioPoint | null;
}>;
export type NativeAudioDrift = Readonly<{
    lastObservation: number | null;
    sustained: number;
    release: number;
    soft: boolean;
    softCount: number;
    missingTimeline: number;
    largeError: number;
    hardCount: number;
    rateCount: number;
    errors: readonly number[];
    ordered: readonly number[] | null;
    maxAbsError: number;
}>;
export type NativeAudioState = Readonly<{
    epoch: number;
    serial: number;
    phase: 'active' | 'closed';
    frame: number | null;
    failed: boolean;
    generation: number;
    running: boolean;
    playbackIntent: 'play' | 'pause';
    contextPaused: boolean;
    requestedRate: number;
    effectiveRate: number;
    resumeRate: number | null;
    watchdogs: WatchdogPolicy;
    operations: Readonly<Record<NativeAudioDomain, number | null>>;
    waits: readonly Readonly<{
        id: number;
        deadline: number;
    }>[];
    points: readonly NativeAudioPoint[];
    publication: NativeAudioPublication | null;
    rate: NativeAudioRate | null;
    drift: NativeAudioDrift;
}>;
export declare function initialNativeAudio(watchdogs: WatchdogPolicy): NativeAudioState;
export declare function nativeAudioCurrent(state: NativeAudioState, lease: NativeAudioLease): boolean;
export declare function nativeAudioAlive(state: NativeAudioState, epoch: number): boolean;
export declare function beginNativeAudio(state: NativeAudioState, domain: NativeAudioDomain): Readonly<{
    state: NativeAudioState;
    lease?: NativeAudioLease;
    retire: readonly number[];
}>;
export declare function finishNativeAudio(state: NativeAudioState, lease: NativeAudioLease): NativeAudioState;
export declare function closeNativeAudio(state: NativeAudioState): NativeAudioState;
export declare function failNativeAudio(state: NativeAudioState): Readonly<{
    state: NativeAudioState;
    notify: boolean;
}>;
export declare function nativeAudioEstimate(state: NativeAudioState, now: number, origin: number): number | null;
export type NativeAudioDriftFacts = Readonly<{
    now: number;
    paused: boolean;
    seeking: boolean;
    ended: boolean;
    readyState: number;
    contextRunning: boolean;
    hidden: boolean;
    position: number | null;
    videoTime: number;
}>;
export declare function observeNativeAudioDrift(state: NativeAudioState, facts: NativeAudioDriftFacts): Readonly<{
    state: NativeAudioState;
    failure?: 'missing' | 'drift';
    rate?: number;
}>;
export declare function observeNativeAudioPoint(state: NativeAudioState, point: NativeAudioPoint, origin: number): Readonly<{
    state: NativeAudioState;
    publication?: number;
    rate?: number;
}>;
export type NativeAudioCommand = Readonly<{
    type: 'watchdogs';
    policy: WatchdogPolicy;
}> | Readonly<{
    type: 'playback.intent';
    intent: 'play' | 'pause';
}> | Readonly<{
    type: 'paused';
    context?: boolean;
}> | Readonly<{
    type: 'running';
    value: boolean;
}> | Readonly<{
    type: 'context.clear';
}> | Readonly<{
    type: 'seek.reset';
}> | Readonly<{
    type: 'seek.complete';
}> | Readonly<{
    type: 'rate.request';
    rate: number;
}> | Readonly<{
    type: 'rate.resume';
    rate: number | null;
}> | Readonly<{
    type: 'publication.begin';
    lease: NativeAudioLease;
    now: number;
}> | Readonly<{
    type: 'publication.clear';
    id: number;
}> | Readonly<{
    type: 'publication.schedule';
    id: number;
    origin: number;
    videoTime: number;
    rate: number;
}> | Readonly<{
    type: 'rate.begin';
    lease: NativeAudioLease;
    rate: number;
    now: number;
}> | Readonly<{
    type: 'rate.clear';
    id: number;
    applied?: boolean;
}> | Readonly<{
    type: 'frame.request';
}> | Readonly<{
    type: 'wait.begin';
    lease: NativeAudioLease;
    now: number;
    timeout: number;
}> | Readonly<{
    type: 'wait.finish';
    id: number;
}> | Readonly<{
    type: 'diagnostics';
}>;
export declare function transitionNativeAudio(state: NativeAudioState, command: NativeAudioCommand): NativeAudioState;
export declare function nativeAudioWait(state: NativeAudioState, lease: NativeAudioLease, now: number): 'retired' | 'waiting' | 'timeout';
export declare function nativeAudioTail(state: NativeAudioState, hasHeader: boolean, duration: number, mediaTime: number): boolean;
export declare function observeNativeAudioContext(state: NativeAudioState, running: boolean): Readonly<{
    state: NativeAudioState;
    action?: 'pause' | 'resume';
}>;
export declare function completeNativeAudioFrame(state: NativeAudioState, id: number, hasHeader: boolean, duration: number, mediaTime: number): Readonly<{
    state: NativeAudioState;
    accepted: boolean;
    tail: boolean;
}>;
/** Only an active first-timestamp wait may follow a completed native AO reset.
 * Once publication succeeds, later epochs need a new explicit playback lease. */
export declare function nativeAudioPublicationEpoch(state: NativeAudioState, lease: NativeAudioLease, epoch: number, ack: number, now: number): boolean;
