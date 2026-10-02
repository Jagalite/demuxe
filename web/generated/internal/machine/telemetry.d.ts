// SPDX-License-Identifier: Apache-2.0
import type { PlaybackStats, PlayerState } from '../../types.js';
export type PlaybackStatisticsState = Readonly<{
    data: PlaybackStats;
    waitingAt: number | null;
}>;
export type PlaybackStatisticsObservation = Readonly<{
    sourceId: number | null;
    status: PlayerState['status'];
    playbackIntent: PlayerState['playbackIntent'];
    operationPending: boolean;
}>;
export type PlaybackStatisticsCommand = Readonly<{
    kind: 'clear';
}> | Readonly<{
    kind: 'accept';
    sourceId: number;
    preserve: boolean;
    elapsed: number;
}> | Readonly<{
    kind: 'seek';
    milliseconds: number;
}> | Readonly<{
    kind: 'observe';
    observation: PlaybackStatisticsObservation;
}>;
export type PlaybackStatisticsInput = PlaybackStatisticsCommand & Readonly<{
    timestamps: readonly number[];
}>;
export declare function createPlaybackStatistics(): PlaybackStatisticsState;
/** Sampling is a shell effect. Preserve the previous lazy clock-read cadence:
 * ordinary progressing observations and nonwaiting snapshots need no clock. */
export declare function playbackStatisticsClockReads(state: PlaybackStatisticsState, command: PlaybackStatisticsCommand | Readonly<{
    kind: 'snapshot';
}>): number;
/** Accepted observations only: session/source retirement is checked by the
 * owning playback machine before it submits telemetry, matching existing use. */
export declare function transitionPlaybackStatistics(state: PlaybackStatisticsState, input: PlaybackStatisticsInput): PlaybackStatisticsState;
/** Project elapsed waiting time without advancing or mutating stored counters. */
export declare function selectPlaybackStatistics(state: PlaybackStatisticsState, now?: number): PlaybackStats;
export type NativeProgressSample = {
    eligible: boolean;
    time: number;
    rate?: number;
    frames?: number;
    frameIntervalMs?: number;
    videoEnd?: number;
};
export type NativeProgressState = Readonly<{
    previous: Readonly<NativeProgressSample> | null;
    lastSample: number | null;
    clockSince: number;
    frameSince: number;
}>;
export type NativeProgressResult = Readonly<{
    state: NativeProgressState;
    stalled: 'clock' | 'video' | undefined;
}>;
export declare function createNativeProgress(): NativeProgressState;
export declare function resetNativeProgress(state: NativeProgressState): NativeProgressState;
/** Pure sampled-progress policy. Ineligible samples do not spend a failure
 * budget; suspension, seeks and rate changes establish fresh observation epochs. */
export declare function sampleNativeProgress(state: NativeProgressState, now: number, value: Readonly<NativeProgressSample>, timeoutMs: number): NativeProgressResult;
