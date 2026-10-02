// SPDX-License-Identifier: Apache-2.0
import type { DecodeInput, DecodePolicy } from './decode-policy.js';
type AdaptiveSample = Readonly<{
    wall: number;
    position: number;
    decoderDrops: number;
    presentationDrops: number;
}>;
type AdaptiveRequest = Readonly<{
    id: number;
    load: number;
    candidate: DecodePolicy;
    reason: string;
    options: string;
}>;
/** Playback worker policy. Native queues, byte buffers and completion callbacks remain in the shell. */
type Deadline = Readonly<{
    id: number;
    load: number;
    deadline: number;
}>;
type Picture = Readonly<{
    id: number;
    load: number;
    generation: number;
    rendered: number;
}>;
type Fence = Readonly<{
    id: number;
    load: number;
    generation: number;
    rendered: number;
    deadline: number;
}>;
type LoadStage = 'received' | 'destroying' | 'source' | 'creating' | 'configuring' | 'loaded';
export type PrivatePlaybackWorkerState = Readonly<{
    decodeInput: Readonly<DecodeInput> | null;
    decodePolicy: DecodePolicy | null;
    hybrid: boolean;
    adaptiveFrameDrop: boolean;
    adaptiveSerial: number;
    adaptiveRequest: AdaptiveRequest | null;
    adaptivePrevious: AdaptiveSample | null;
    adaptiveStreak: number;
    adaptiveDirection: string;
    adaptiveCooldown: number;
    adaptiveReason: string;
    phase: 'new' | 'initializing' | 'ready' | 'closing' | 'closed';
    initialized: boolean;
    closeStarted: boolean;
    loadSerial: number;
    load: Readonly<{
        id: number;
        stage: LoadStage;
    }> | null;
    replacing: boolean;
    generation: number;
    userPaused: boolean;
    contextRunning: boolean;
    settings: readonly (readonly [string, string])[];
    commandSerial: number;
    commands: readonly Deadline[];
    refreshSerial: number;
    refreshes: readonly Deadline[];
    pumping: boolean;
    pumpSerial: number;
    pumpLoad: number;
    target: number | null;
    opening: boolean;
    restarted: boolean;
    targetDrawBaseline: number;
    pictureSerial: number;
    capture: Picture | null;
    pendingPicture: Picture | null;
    sentDraws: number;
    presentedDraws: number;
    picturePaused: boolean;
    fenceSerial: number;
    fences: readonly Fence[];
    lastDraws: number;
    lastDiagnostics: number;
    subtitleCount: number;
    subtitleBytes: number;
}>;
export declare function createPrivatePlaybackWorker(): PrivatePlaybackWorkerState;
export declare function playbackWorkerAccepts(state: PrivatePlaybackWorkerState, op: string): boolean;
export declare function admitPlaybackWorkerInit(state: PrivatePlaybackWorkerState): Readonly<{
    state: PrivatePlaybackWorkerState;
    error: string | null;
}>;
export declare function playbackWorkerInitCurrent(state: PrivatePlaybackWorkerState): boolean;
export declare function finishPlaybackWorkerInit(state: PrivatePlaybackWorkerState, contextRunning: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function receivePlaybackWorkerLoad(state: PrivatePlaybackWorkerState): Readonly<{
    state: PrivatePlaybackWorkerState;
    id: number | null;
    revoke: boolean;
}>;
export declare function playbackWorkerLoadCurrent(state: PrivatePlaybackWorkerState, id: number): boolean;
export declare function beginPlaybackWorkerLoad(state: PrivatePlaybackWorkerState, id: number, generation: number, replace: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function advancePlaybackWorkerLoad(state: PrivatePlaybackWorkerState, id: number, input: 'destroyed' | 'opened' | 'created' | 'loaded'): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function retirePlaybackWorker(state: PrivatePlaybackWorkerState): Readonly<{
    state: PrivatePlaybackWorkerState;
    revoke: boolean;
}>;
export declare function beginPlaybackWorkerClose(state: PrivatePlaybackWorkerState): PrivatePlaybackWorkerState;
export declare function finishPlaybackWorkerClose(state: PrivatePlaybackWorkerState): PrivatePlaybackWorkerState;
export declare function admitPlaybackWorkerCommand(state: PrivatePlaybackWorkerState, seek: boolean, now: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    id: number | null;
    request: Deadline | null;
    error: string | null;
}>;
export declare function admitPlaybackWorkerRefresh(state: PrivatePlaybackWorkerState, load: number, now: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    request: Deadline | null;
}>;
export declare function settlePlaybackWorkerRequest(state: PrivatePlaybackWorkerState, kind: 'command' | 'refresh', id: number, input: Readonly<{
    kind: 'reply' | 'send-error';
} | {
    kind: 'deadline';
    now: number;
}>): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function playbackWorkerSetting(state: PrivatePlaybackWorkerState, name: string, value: string): PrivatePlaybackWorkerState;
export declare function beginPlaybackWorkerControl(state: PrivatePlaybackWorkerState, kind: 'pause' | 'context', value: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    paused: boolean;
    deviceFirst: boolean;
}>;
export declare function preparePlaybackWorkerCommand(state: PrivatePlaybackWorkerState, args: readonly string[]): PrivatePlaybackWorkerState;
export declare function openPlaybackWorkerPresentation(state: PrivatePlaybackWorkerState): PrivatePlaybackWorkerState;
export declare function beginPlaybackWorkerSeek(state: PrivatePlaybackWorkerState, target: number, draws: number): PrivatePlaybackWorkerState;
export declare function acceptPlaybackWorkerSubtitle(state: PrivatePlaybackWorkerState, bytes: number): PrivatePlaybackWorkerState;
export declare function playbackWorkerSubtitleFits(state: PrivatePlaybackWorkerState, bytes: number): boolean;
export declare function beginPlaybackWorkerPump(state: PrivatePlaybackWorkerState): Readonly<{
    state: PrivatePlaybackWorkerState;
    id: number | null;
}>;
export declare function playbackWorkerPumpCurrent(state: PrivatePlaybackWorkerState, id: number): boolean;
export declare function finishPlaybackWorkerPump(state: PrivatePlaybackWorkerState, id: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    schedule: boolean;
}>;
export declare function observePlaybackWorkerRestart(state: PrivatePlaybackWorkerState): PrivatePlaybackWorkerState;
export declare function observePlaybackWorkerOutput(state: PrivatePlaybackWorkerState, input: Readonly<{
    hasVideo: boolean;
    audioReady: boolean;
    position: number;
    draws: number;
}>): PrivatePlaybackWorkerState;
export declare function beginPlaybackWorkerCapture(state: PrivatePlaybackWorkerState, draws: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    picture: Picture | null;
}>;
export declare function finishPlaybackWorkerCapture(state: PrivatePlaybackWorkerState, id: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    picture: Picture | null;
}>;
export declare function acknowledgePlaybackWorkerPicture(state: PrivatePlaybackWorkerState, id: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    resolved: readonly number[];
}>;
export declare function pausePlaybackWorkerPresentation(state: PrivatePlaybackWorkerState, draws: number, now: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    fence: Fence | null;
    error: string | null;
}>;
export declare function expirePlaybackWorkerPresentation(state: PrivatePlaybackWorkerState, id: number, now: number, failed?: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function publishPlaybackWorkerOutput(state: PrivatePlaybackWorkerState, draws: number): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function publishPlaybackWorkerDiagnostics(state: PrivatePlaybackWorkerState, now: number, force?: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export declare function configurePlaybackWorkerDecode(state: PrivatePlaybackWorkerState, input: DecodeInput, hybrid: boolean, adaptiveFrameDrop: boolean): PrivatePlaybackWorkerState;
export declare function samplePlaybackWorkerAdaptive(state: PrivatePlaybackWorkerState, input: Readonly<{
    now: number;
    position: number;
    decoderDrops: number;
    presentationDrops: number;
    speed: number;
    avsync: number;
    pausedForCache: boolean;
}>): Readonly<{
    state: PrivatePlaybackWorkerState;
    request: AdaptiveRequest | null;
}>;
export declare function settlePlaybackWorkerAdaptive(state: PrivatePlaybackWorkerState, id: number, success: boolean): Readonly<{
    state: PrivatePlaybackWorkerState;
    accepted: boolean;
}>;
export {};
