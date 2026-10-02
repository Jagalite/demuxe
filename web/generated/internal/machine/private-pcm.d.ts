// SPDX-License-Identifier: Apache-2.0
/** Bounded PCM metadata only. Native memory, copied samples and ports stay in the adapters. */
export type PrivatePCMProfile = 'playback' | 'audio';
export type PrivatePCMState = Readonly<{
    profile: PrivatePCMProfile;
    capacity: number;
    channels: number;
    epoch: number;
    posted: number;
    ack: boolean;
    running: boolean | null;
    maxOutstanding: number;
    feedbackCount: number;
    staleFeedback: number;
    error: string | null;
    pumping: boolean;
    phase: 'active' | 'stopping' | 'stopped';
    stopDeadline: number | null;
}>;
export type PrivatePCMHeader = Readonly<{
    produced: number;
    consumed: number;
    epoch: number;
    nativeRunning: boolean;
    contextRunning: boolean;
    userPaused: boolean;
}>;
export type PrivatePCMStep = Readonly<{
    kind: 'idle';
}> | Readonly<{
    kind: 'reset';
    epoch: number;
    capacity: number;
    channels: number;
}> | Readonly<{
    kind: 'pcm';
    epoch: number;
    start: number;
    frames: number;
}> | Readonly<{
    kind: 'state';
    epoch: number;
    running: boolean;
}> | Readonly<{
    kind: 'error';
    message: string;
}>;
export type PrivatePCMFeedback = Readonly<{
    kind: 'resetAck';
    epoch: number;
}> | Readonly<{
    kind: 'consumed';
    epoch: number;
    frames: number;
}> | Readonly<{
    kind: 'other';
    epoch: number;
}>;
export declare function createPrivatePCM(profile: PrivatePCMProfile, capacity?: number, channels?: number): PrivatePCMState;
export declare function beginPrivatePCMPump(state: PrivatePCMState): Readonly<{
    state: PrivatePCMState;
    accepted: boolean;
}>;
export declare function finishPrivatePCMPump(state: PrivatePCMState): PrivatePCMState;
/** One chunk per transition: commit its identity before transferring its buffer. */
export declare function nextPrivatePCMStep(state: PrivatePCMState, header: PrivatePCMHeader): Readonly<{
    state: PrivatePCMState;
    effect: PrivatePCMStep;
}>;
export declare function privatePCMFeedback(state: PrivatePCMState, input: PrivatePCMFeedback, nativeEpoch: number, consumed: number): Readonly<{
    state: PrivatePCMState;
    write: Readonly<{
        epoch: number;
        consumed: number;
    }> | null;
    pump: boolean;
    error: string | null;
}>;
export declare function failPrivatePCM(state: PrivatePCMState, error: string): Readonly<{
    state: PrivatePCMState;
    accepted: boolean;
}>;
export declare function beginPrivatePCMStop(state: PrivatePCMState, now: number): Readonly<{
    state: PrivatePCMState;
    accepted: boolean;
    id: 'worker-close' | 'playback-close';
    deadline: number | null;
}>;
export declare function settlePrivatePCMStop(state: PrivatePCMState, input: Readonly<{
    kind: 'ack';
    id: string;
} | {
    kind: 'deadline';
    now: number;
} | {
    kind: 'send-error';
}>): Readonly<{
    state: PrivatePCMState;
    outcome: 'ignore' | 'resolve' | 'reject';
}>;
