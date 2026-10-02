// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { RoutePlan } from './route-admission.js';
export type DiscoveryFailure = Readonly<{
    id: string;
    message: string;
    code: string;
    compatible: boolean;
    interrupted: boolean;
    nativeTimeout: boolean;
    budget: number;
    retryRemux?: string;
    inconclusiveOutput: boolean;
    caption?: string;
    fast: boolean;
}>;
export type DiscoveryTransaction = Readonly<{
    id: number;
    attemptSerial: number;
    pendingAttempt: Readonly<{
        id: number;
        planId: string;
    }> | null;
    automatic: boolean;
    pinnedMode?: PlaybackMode;
    start: number;
    cursor: number;
    nativeReason?: string;
    captionFailure?: string;
    interruptedDirect: Readonly<{
        id: string;
        remux: string;
    }> | null;
    errors: readonly string[];
    reinspections: number;
    phase: 'plans' | 'restore' | 'inspect' | 'failed';
    failure: DiscoveryFailure | null;
    restoreId: string | null;
}>;
export type DiscoveryState = Readonly<{
    serial: number;
    current: DiscoveryTransaction | null;
}>;
export type DiscoveryChange = Readonly<{
    kind: 'begin';
    automatic: boolean;
    pinnedMode?: PlaybackMode;
    start: number;
    nativeReason?: string;
}> | Readonly<{
    kind: 'advance';
    id: number;
}> | Readonly<{
    kind: 'attempt';
    id: number;
    planId: string;
}> | Readonly<{
    kind: 'failed';
    id: number;
    attempt: number;
    failure: DiscoveryFailure;
}> | Readonly<{
    kind: 'restore.failed';
    id: number;
    attempt: number;
    failure: DiscoveryFailure;
}> | Readonly<{
    kind: 'reinspected';
    id: number;
    nativeReason?: string;
}> | Readonly<{
    kind: 'finished';
    id: number;
}>;
export declare function initialDiscovery(): DiscoveryState;
export declare function transitionDiscovery(state: DiscoveryState, change: DiscoveryChange): DiscoveryState;
export declare function discoveryPlanPolicy(current: DiscoveryTransaction, plan: RoutePlan, hybridRejection?: string): Readonly<{
    included: boolean;
    hybridRejection?: string;
    captionFailure?: string;
}>;
export type DiscoveryProbeFacts = Readonly<{
    flacOffer: boolean;
    audioPlayback: string;
    automaticLossless: boolean;
    inspected: boolean;
    pcm: boolean;
    losslessInspected: boolean;
    local: boolean;
    transcodeChecked: boolean;
    audioAdaptation: boolean;
    selectiveChecked: boolean;
    fileServices: boolean;
    audioOutput: string;
    gain: number;
}>;
export declare function discoveryOptionalProbe(current: DiscoveryTransaction, plan: RoutePlan, facts: DiscoveryProbeFacts): 'lossless' | 'transcode' | 'selective' | undefined;
export declare function localDiscoveryRemux(planId: string, facts: Readonly<{
    local: boolean;
    inspected: boolean;
    codecRepair: boolean;
    eligible: readonly string[];
    rejected: readonly string[];
}>): string | undefined;
