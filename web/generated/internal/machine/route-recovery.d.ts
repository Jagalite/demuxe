// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
export type RouteRequirements = Readonly<{
    nativeRemux?: 'auto' | 'never' | 'always';
}>;
export type RecoveryState = Readonly<{
    serial: number;
    attemptedSession: number | null;
    pending: Readonly<{
        id: number;
        epoch: number;
        session: number;
        phase: 'classifying' | 'queued' | 'pausing' | 'selecting' | 'failed' | 'selected' | 'terminal';
    }> | null;
    failedStreaming: Readonly<{
        source: number;
        plans: readonly string[];
    }> | null;
}>;
export type RecoveryChange = Readonly<{
    kind: 'begin';
    epoch: number;
    session: number;
}> | Readonly<{
    kind: 'classified';
    id: number;
    compatible: boolean;
}> | Readonly<{
    kind: 'start';
    id: number;
    current: boolean;
    automatic: boolean;
}> | Readonly<{
    kind: 'paused';
    id: number;
}> | Readonly<{
    kind: 'outcome';
    id: number;
    selected: boolean;
}> | Readonly<{
    kind: 'finished';
    id: number;
}> | Readonly<{
    kind: 'streaming.failed';
    source: number;
    session: number;
    plan: string;
}>;
export declare function initialRecovery(): RecoveryState;
export declare function transitionRecovery(state: RecoveryState, change: RecoveryChange): RecoveryState;
export declare function retireRecovery(state: RecoveryState): RecoveryState;
export declare function clearRecovery(state: RecoveryState): RecoveryState;
export declare function recoveryRoute(facts: Readonly<{
    mode: PlaybackMode;
    backendPlan: string | undefined;
    nativeRemux: 'auto' | 'never' | 'always';
    streaming: boolean;
    trigger: 'runtime' | 'play';
}>): Readonly<{
    start: number;
    requirements: RouteRequirements;
}>;
/** Pure response policy. Adapter facts describe the observed fault; no physical
 * error objects, handles or callbacks are retained by this decision. */
export declare function playbackFaultResponse(facts: Readonly<{
    origin: 'watchdog' | 'backend' | 'track-policy';
    current: boolean;
    accepted: boolean;
    busy: boolean;
    destroyed: boolean;
    automatic: boolean;
    mode: PlaybackMode;
    fault: boolean;
    endFileError?: boolean;
}>): 'ignore' | 'recover' | 'pause-error' | 'error' | 'forward';
