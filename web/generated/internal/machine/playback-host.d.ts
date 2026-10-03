// SPDX-License-Identifier: Apache-2.0
export type PlaybackHostWork = Readonly<{
    id: number;
    epoch: number;
    cleanup: boolean;
}>;
export type PlaybackHostState = Readonly<{
    workSerial: number;
    queue: readonly PlaybackHostWork[];
    activeWork: PlaybackHostWork | null;
    phase: 'active' | 'closing' | 'closed';
    epoch: number;
    creating: boolean;
    created: boolean;
    duration: number | null;
    seekPreroll: number;
    sourceFailed: boolean;
    renderWidth: number | null;
    renderHeight: number | null;
    draws: number;
    events: number;
    fatalCommandErrors: boolean;
    channels: number;
}>;
export declare function initialPlaybackHost(channels?: number, fatalCommandErrors?: boolean): PlaybackHostState;
export declare function playbackHostCurrent(state: PlaybackHostState, epoch: number): boolean;
export declare function beginPlaybackHostCreate(state: PlaybackHostState, epoch: number): PlaybackHostState;
export declare function finishPlaybackHostCreate(state: PlaybackHostState, success: boolean): PlaybackHostState;
export declare function playbackHostNativeDestroyed(state: PlaybackHostState): PlaybackHostState;
export declare function resetPlaybackHostSource(state: PlaybackHostState): PlaybackHostState;
export declare function setPlaybackHostPreroll(state: PlaybackHostState, duration: number): PlaybackHostState;
export declare function playbackHostSeekPreroll(state: PlaybackHostState, position: number): number;
export declare function observePlaybackHostEvent(state: PlaybackHostState, epoch: number, event: Readonly<{
    kind: string;
    name?: string;
    duration?: number;
    error?: string;
}>): Readonly<{
    state: PlaybackHostState;
    accepted: boolean;
    fatal: boolean;
    trim: boolean;
}>;
export declare function playbackHostEventBudget(): number;
export declare function failPlaybackHostSource(state: PlaybackHostState, epoch: number): PlaybackHostState;
export declare function beginPlaybackHostRender(state: PlaybackHostState, epoch: number, width: number, height: number, force: boolean): Readonly<{
    state: PlaybackHostState;
    accepted: boolean;
    force: boolean;
}>;
export declare function presentPlaybackHost(state: PlaybackHostState, epoch: number): PlaybackHostState;
export declare function closePlaybackHost(state: PlaybackHostState): PlaybackHostState;
export declare function finishPlaybackHostClose(state: PlaybackHostState): PlaybackHostState;
export declare function playbackHostFailureCurrent(failureGeneration: number | undefined, generation: number | undefined): boolean;
export declare function admitPlaybackHostWork(state: PlaybackHostState, cleanup?: boolean): Readonly<{
    state: PlaybackHostState;
    work?: PlaybackHostWork;
    error?: string;
}>;
export declare function startPlaybackHostWork(state: PlaybackHostState): Readonly<{
    state: PlaybackHostState;
    work?: PlaybackHostWork;
}>;
export declare function finishPlaybackHostWork(state: PlaybackHostState, id: number): PlaybackHostState;
