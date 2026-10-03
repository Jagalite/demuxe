// SPDX-License-Identifier: Apache-2.0
export type PrivateAudioState = Readonly<{
    running: boolean;
    polling: boolean;
    controlId: number;
    rate: number;
    volume: number;
    gain: number;
    streamIndex: number | null;
    resumeAfterContext: boolean;
    contextObservation: number;
    contextActive: boolean;
    contextWork: number | null;
    contextApplied: number;
    eof: boolean;
    eofTask: number | null;
    nextEOF: number;
    watchAudio: boolean;
    badClock: number;
    outside: number;
    inside: number;
    trim: boolean;
    rateWrites: number;
    errors: readonly number[];
}>;
export declare function createPrivateAudio(): PrivateAudioState;
export declare function selectPrivateAudioStream(state: PrivateAudioState, index: number | undefined): Readonly<{
    state: PrivateAudioState;
    accepted: boolean;
}>;
export declare function privateAudioSettings(state: PrivateAudioState, input: Readonly<{
    rate?: number;
    volume?: number;
    gain?: number;
    watchAudio?: boolean;
}>): PrivateAudioState;
export declare function beginAudioControl(state: PrivateAudioState, kind: 'play' | 'pause' | 'seek'): Readonly<{
    state: PrivateAudioState;
    id: number | null;
    wasRunning: boolean;
}>;
export declare function audioControlCurrent(state: PrivateAudioState, id: number): boolean;
export declare function finishAudioPlay(state: PrivateAudioState, id: number): Readonly<{
    state: PrivateAudioState;
    accepted: boolean;
}>;
export declare function observeAudioContext(state: PrivateAudioState, active: boolean, videoPaused: boolean): Readonly<{
    state: PrivateAudioState;
    id: number;
    pauseVideo: boolean;
}>;
export declare function acknowledgeAudioContext(state: PrivateAudioState, id: number): Readonly<{
    state: PrivateAudioState;
    playVideo: boolean;
}>;
export declare function beginAudioPoll(state: PrivateAudioState, active: boolean): Readonly<{
    state: PrivateAudioState;
    accepted: boolean;
}>;
export declare function finishAudioPoll(state: PrivateAudioState): PrivateAudioState;
export type PrivateAudioClockSample = Readonly<{
    active: boolean;
    contextRunning: boolean;
    videoPaused: boolean;
    videoSeeking: boolean;
    hidden: boolean;
    audioTime: number;
    videoTime: number;
    videoRate: number;
}>;
export declare function privateAudioObservesClock(state: PrivateAudioState, sample: Readonly<{
    active: boolean;
    contextRunning: boolean;
    videoPaused: boolean;
    videoSeeking: boolean;
}>): boolean;
export declare function observeAudioClock(state: PrivateAudioState, sample: PrivateAudioClockSample): Readonly<{
    state: PrivateAudioState;
    failure: boolean;
    rate: number | null;
    latency: boolean;
}>;
export declare function resetAudioClock(state: PrivateAudioState, videoRate: number): Readonly<{
    state: PrivateAudioState;
    rate: number | null;
}>;
export declare function beginAudioEOF(state: PrivateAudioState, active: boolean): Readonly<{
    state: PrivateAudioState;
    id: number | null;
}>;
export declare function audioEOFCurrent(state: PrivateAudioState, id: number): boolean;
export declare function finishAudioEOF(state: PrivateAudioState, id: number): PrivateAudioState;
export declare function retirePrivateAudio(state: PrivateAudioState): PrivateAudioState;
export type PrivateAudioStatus = Readonly<{
    time: number;
    eof: boolean;
    produced: number;
    consumed: number;
    epoch: number;
    ack: boolean;
    nativeEpoch: number;
    ackEpoch: number;
    feedbackCount: number;
    chains: number;
}>;
export type PrivateAudioWait = Readonly<{
    kind: 'play';
    target: number;
} | {
    kind: 'epoch';
    previous: number;
} | {
    kind: 'verify';
} | {
    kind: 'drain';
}>;
export declare function privateAudioDeadline(now: number, timeout: number): Readonly<{
    until: number;
}>;
export declare function privateAudioDeadlineOpen(deadline: Readonly<{
    until: number;
}>, now: number): boolean;
export declare function privateAudioReady(status: PrivateAudioStatus, wait: PrivateAudioWait): boolean;
/** One physical context write with latest-observation coalescing; no queued promise chain. */
export declare function beginAudioContextWork(state: PrivateAudioState): Readonly<{
    state: PrivateAudioState;
    request: Readonly<{
        id: number;
        active: boolean;
    }> | null;
}>;
export declare function finishAudioContextWork(state: PrivateAudioState, id: number): Readonly<{
    state: PrivateAudioState;
    accepted: boolean;
    playVideo: boolean;
}>;
