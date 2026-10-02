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
