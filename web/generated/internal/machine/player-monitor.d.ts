// SPDX-License-Identifier: Apache-2.0
import { type NativeRecoveryFacts } from './playback-deadlines.js';
import type { WatchdogPolicy, PlaybackMode } from '../../types.js';
import { type NativeProgressState, type NativeProgressSample } from './telemetry.js';
import type { PlayerControlState } from './state.js';
import type { PlayerControlDecision } from './transition.js';
export type PlayerMonitorState = Readonly<{
    policy: WatchdogPolicy;
    policyRevision: number;
    serial: number;
    activity: number;
    current: Readonly<{
        id: number;
        session: number;
        mode: 'native' | 'hybrid';
        policyRevision: number;
        activity: number;
        progress: NativeProgressState;
        inactive: number;
    }> | null;
    fault: Readonly<{
        id: number;
        session: number;
        reason: 'clock' | 'video' | 'hybrid';
    }> | null;
}>;
export type PlayerMonitorInput = Readonly<{
    type: 'monitor.policy';
    policy: WatchdogPolicy;
}> | Readonly<{
    type: 'monitor.activity';
}> | Readonly<{
    type: 'monitor.stop';
}> | Readonly<{
    type: 'monitor.reconcile';
    epoch: number;
    session: number | null;
    mode: PlaybackMode;
    present: boolean;
    error: boolean;
    closing: boolean;
    backendPaused: boolean;
    backendEOF: boolean;
    hidden: boolean;
}> | Readonly<{
    type: 'monitor.sample';
    id: number;
    epoch: number;
    session: number;
    activity: number;
    hidden: boolean;
    retired: boolean;
    error: boolean;
    now?: number;
    recovery?: NativeRecoveryFacts;
    native: Readonly<NativeProgressSample> | null;
    timing: Readonly<{
        startTime: number;
        endTime: number;
        maxIntervalSeconds: number;
    }> | null;
    hasVideo: boolean;
    softwareDecoder: boolean;
}>;
export declare function initialPlayerMonitor(): PlayerMonitorState;
export declare function stopPlayerMonitor(state: PlayerMonitorState): PlayerMonitorState;
export declare function monitorSampleEligible(state: PlayerControlState, input: Readonly<{
    session: number;
    hidden: boolean;
    retired: boolean;
    error: boolean;
}>): boolean;
export declare function transitionPlayerMonitor(state: PlayerControlState, input: PlayerMonitorInput): PlayerControlDecision;
