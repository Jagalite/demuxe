// SPDX-License-Identifier: Apache-2.0
import type { RemuxBufferState } from './remux-buffer.js';
export type RemuxRange = readonly [number, number];
export type RemuxBuffering = Readonly<{
    preload?: string;
    forwardSeconds?: number;
    backwardSeconds?: number;
    forwardLimitBytes?: number;
}>;
export type RemuxSchedule = Readonly<{
    target: number;
    windowed: boolean;
    presentationFloor: number;
    primeVideo: boolean;
    trackBounds: Readonly<{
        videoEnd: number;
        audioEnd: number;
    }> | null;
    raps: readonly number[];
    lastEviction: number;
    lastEvictions: readonly number[];
    buffering: RemuxBuffering | undefined;
    resumeSerial: number;
    resume: number | null;
}>;
export declare function initialRemuxSchedule(): RemuxSchedule;
export declare function resetRemuxSchedule(state: RemuxSchedule, target?: number): RemuxSchedule;
export declare function remuxBuffering(state: RemuxSchedule, policy: RemuxBuffering | undefined): RemuxSchedule;
export type RemuxScheduleCommand = Readonly<{
    type: 'configure';
    windowed: boolean;
    trackBounds?: Readonly<{
        videoEnd: number;
        audioEnd: number;
    }>;
}> | Readonly<{
    type: 'raps';
    values: readonly number[];
}> | Readonly<{
    type: 'seek';
    target: number;
}> | Readonly<{
    type: 'prime-finished';
}> | Readonly<{
    type: 'evict';
    lane: number;
    cut: number;
    allLanes: boolean;
}> | Readonly<{
    type: 'resume';
}> | Readonly<{
    type: 'resumed';
    id: number;
}>;
export declare function transitionRemuxSchedule(state: RemuxSchedule, command: RemuxScheduleCommand): Readonly<{
    state: RemuxSchedule;
    accepted: boolean;
    id?: number;
}>;
export declare function remuxForwardSeconds(state: RemuxSchedule, paused: boolean, playbackRate: number): number;
export declare function remuxStartupCoverage(target: number, duration: number, ranges: readonly RemuxRange[]): boolean;
export declare function remuxPlaybackEnded(state: RemuxSchedule, buffer: RemuxBufferState, facts: Readonly<{
    ended: boolean;
    position: number;
    duration: number;
    timelineBias: number;
}>): boolean;
export type RemuxPumpHeadFacts = Readonly<{
    current: boolean;
    hasSourceBuffer: boolean;
    updating: boolean;
    mediaState: string;
    targetReady: boolean;
    playing: boolean;
}>;
export declare function selectRemuxPumpHead(state: RemuxSchedule, buffer: RemuxBufferState, facts: RemuxPumpHeadFacts): 'wait' | 'delivery' | 'body';
export type RemuxPumpFacts = Readonly<{
    targetReady: boolean;
    playing: boolean;
    position: number;
    paused: boolean;
    readyState: number;
    playbackRate: number;
    ranges: readonly RemuxRange[];
    laneStarts: readonly (number | null)[];
    laneEnds?: readonly number[];
    audioAdaptation: boolean;
    adaptationEnd: number | undefined;
    duration: number;
}>;
type PumpMetrics = Readonly<{
    seconds: number;
    bytes: number;
}>;
export type RemuxPumpContinuation = Readonly<{
    now: number;
    ranges: readonly RemuxRange[];
    bytes: number;
    byteLimit: number;
}>;
type PumpTerminal = Readonly<{
    kind: 'wait';
} | {
    kind: 'pull';
} | {
    kind: 'eof';
    duration?: number;
} | {
    kind: 'fail';
    error: string;
}>;
export type RemuxPumpDecision = Readonly<{
    metrics: PumpMetrics;
    action: Readonly<{
        kind: 'remove';
        lane: number;
        cut: number;
        allLanes: boolean;
    } | {
        kind: 'pending';
    } | {
        kind: 'finish';
        clearPending: boolean;
        gap: Readonly<{
            from: number;
            to: number;
        }> | null;
        continuation: RemuxPumpContinuation;
        next: PumpTerminal;
    }>;
}>;
export declare function selectRemuxPump(state: RemuxSchedule, buffer: RemuxBufferState, facts: RemuxPumpFacts): RemuxPumpDecision;
/** After a gap seek, preserve the original coverage/budget sample but observe
 * pause/rate/intent/policy again before deciding preparation, failure or refill. */
export declare function selectRemuxPumpContinuation(state: RemuxSchedule, buffer: RemuxBufferState, facts: RemuxPumpFacts, context: RemuxPumpContinuation): PumpTerminal;
export declare function selectRemuxWindowResume(state: RemuxSchedule, buffer: RemuxBufferState, facts: Readonly<{
    current: boolean;
    playing: boolean;
    paused: boolean;
    starting: boolean;
    seeking: boolean;
    ended: boolean;
    position: number;
    bufferEnd: number | undefined;
    duration: number;
    timelineBias: number;
}>): 'wait' | 'seek' | 'play';
export declare function selectRemuxBufferedSeek(state: RemuxSchedule, target: number, facts: Readonly<{
    enabled: boolean;
    current: boolean;
    starting: boolean;
    targetReady: boolean;
    accepted: boolean;
    hasSourceBuffer: boolean;
    updating: boolean;
    mediaState: string;
    timelineBias: number;
    ranges: readonly RemuxRange[];
    mediaRanges: readonly RemuxRange[];
}>): boolean;
export {};
