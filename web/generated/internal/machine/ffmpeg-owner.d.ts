// SPDX-License-Identifier: Apache-2.0
/** One serialized native call and its source wait. Physical completion remains
 * accounted after logical shutdown, even when native work ignores cancellation. */
export type FfmpegOwnerState = Readonly<{
    closed: boolean;
    serial: number;
    waitSerial: number;
    active: number | null;
    physical: number | null;
    wait: Readonly<{
        id: number;
        task: number;
        phase: 'pending' | 'ready' | 'delivering';
    }> | null;
    completed: number;
    retired: number;
    cleanupFailures: number;
}>;
export type FfmpegOwnerInput = Readonly<{
    type: 'begin';
}> | Readonly<{
    type: 'complete';
    task: number;
}> | Readonly<{
    type: 'park';
    task: number;
}> | Readonly<{
    type: 'ready' | 'deliver' | 'settled';
    task: number;
    wait: number;
}> | Readonly<{
    type: 'close';
}> | Readonly<{
    type: 'cleanup-failed';
}>;
export type FfmpegOwnerDecision = Readonly<{
    state: FfmpegOwnerState;
    accepted: boolean;
    id?: number;
    retireWait?: number;
    retireTask?: number;
    reason?: 'closed' | 'busy' | 'identity' | 'stale';
}>;
export declare function initialFfmpegOwner(): FfmpegOwnerState;
export declare function transitionFfmpegOwner(state: FfmpegOwnerState, input: FfmpegOwnerInput): FfmpegOwnerDecision;
