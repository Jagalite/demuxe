// SPDX-License-Identifier: Apache-2.0
export type AcquisitionAvailability = Readonly<{
    state: 'configured-unverified' | 'available' | 'absent' | 'failed';
    reason?: string;
    failureId?: string;
}>;
export type AcquisitionOwner = Readonly<{
    id: string;
    availability: AcquisitionAvailability;
    preparation: 'idle' | 'pending' | 'settled';
}>;
export type AcquisitionAsset = Readonly<{
    identity: string;
    bytes: number;
    received: number;
    deadline: number;
    status: 'pending' | 'ready' | 'failed';
    cancelled: boolean;
}>;
export type AcquisitionState = Readonly<{
    phase: 'active' | 'retiring' | 'closed';
    catalogEpoch: number;
    scopeKey: string | null;
    timeoutMs: number;
    maxResidentBytes: number;
    reservedBytes: number;
    owners: readonly AcquisitionOwner[];
    assets: readonly AcquisitionAsset[];
    releases: readonly string[];
}>;
type Fault = Readonly<{
    kind: 'reject';
    reason: 'retired' | 'stale' | 'unresolved' | 'absent' | 'failed' | 'budget' | 'overflow' | 'size' | 'integrity';
    failureId?: string;
}>;
export type AcquisitionDecision = Fault | Readonly<{
    kind: 'start' | 'join' | 'accepted' | 'ignore' | 'release' | 'published';
}>;
export type AcquisitionTransition = Readonly<{
    state: AcquisitionState;
    effect: AcquisitionDecision;
}>;
export declare function createAcquisition(input: Readonly<{
    timeoutMs: number;
    maxResidentBytes: number;
    owners: readonly Readonly<{
        id: string;
        availability: AcquisitionAvailability;
    }>[];
}>): AcquisitionState;
export declare function admitAcquisition(state: AcquisitionState, input: Readonly<{
    ticketEpoch: number | null;
    revisionMatches: boolean;
    scopeKey: string;
    resolved: boolean;
}>): AcquisitionTransition;
export declare function admitAcquisitionOwner(state: AcquisitionState, id: string): AcquisitionTransition;
export declare function finishAcquisitionOwner(state: AcquisitionState, id: string, outcome: Readonly<{
    kind: 'ready';
} | {
    kind: 'unavailable';
    reason: string;
} | {
    kind: 'failed';
}>): AcquisitionTransition;
export declare function admitAcquisitionAsset(state: AcquisitionState, identity: string, bytes: number, now: number): AcquisitionTransition;
export declare function observeAcquisitionAsset(state: AcquisitionState, identity: string, event: Readonly<{
    kind: 'chunk';
    bytes: number;
} | {
    kind: 'body';
} | {
    kind: 'digest';
    matches: boolean;
} | {
    kind: 'failed';
} | {
    kind: 'deadline';
    now: number;
}>): AcquisitionTransition;
export declare function retireAcquisition(state: AcquisitionState): AcquisitionTransition;
/** Called after physical jobs settle; release order is reverse ready completion. */
export declare function acquisitionReleases(state: AcquisitionState): readonly string[];
export declare function closeAcquisition(state: AcquisitionState): AcquisitionState;
export {};
