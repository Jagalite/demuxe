// SPDX-License-Identifier: Apache-2.0
/** Data-only evidence. Prepared routes still need output verification on every
 * startup; previous success never bypasses admission or readiness. */
export type CapabilityEvidence = {
    audioEvidenceStrength?: 'unknown' | 'presence' | 'decoded' | 'consumed';
    audioObservation?: {
        initialBytes?: number;
        decodedBytes?: number;
        delta?: number;
        present?: boolean;
        enabledTrack?: boolean;
        clockAdvanced: boolean;
    };
    apiHint?: string;
    prepared?: boolean;
    completedAtEOF?: boolean;
    outputVerified?: boolean;
    audioEvidence?: string;
    timing?: Record<string, number>;
    metadata?: boolean;
    sourceBufferCreated?: boolean;
    initAccepted?: boolean;
    mediaAccepted?: boolean;
    decoderOutput?: boolean;
    videoPresented?: boolean;
    audioProgress?: boolean;
    audioDecoded?: boolean;
    audioDecoderConfigured?: boolean;
    playbackReady?: boolean;
};
export type CapabilityRecord = {
    planId: string;
    sourceIdentity: string;
    eligible: boolean;
    state: 'untested' | 'probing' | 'prepared' | 'verified' | 'failed';
    reason?: string;
    failureKind?: 'compatibility' | 'terminal';
    evidence?: CapabilityEvidence;
    previouslyVerified?: boolean;
};
export type CapabilityPlan = Readonly<{
    id: string;
    eligible: boolean;
    reason?: string;
}>;
export type CapabilityEvidenceData = Readonly<Omit<CapabilityEvidence, 'audioObservation' | 'timing'>> & Readonly<{
    audioObservation?: Readonly<NonNullable<CapabilityEvidence['audioObservation']>>;
    timing?: Readonly<Record<string, number>>;
}>;
export type CapabilityRecordData = Readonly<Omit<CapabilityRecord, 'evidence'>> & Readonly<{
    evidence?: CapabilityEvidenceData;
}>;
export type CapabilityState = Readonly<{
    records: readonly CapabilityRecordData[];
    verified: readonly string[];
}>;
export type CapabilityEvent = {
    kind: 'begin';
    sourceIdentity: string;
    plans: readonly CapabilityPlan[];
} | {
    kind: 'update';
    planId: string;
    state: CapabilityRecord['state'];
    evidence?: CapabilityEvidenceData;
    reason?: string;
    failureKind?: CapabilityRecord['failureKind'];
} | {
    kind: 'admission';
    plans: readonly CapabilityPlan[];
} | {
    kind: 'clear';
};
export declare function createCapabilities(): CapabilityState;
export declare function capabilityUpdateEligible(state: CapabilityState, planId: string): boolean;
export declare function transitionCapabilities(state: CapabilityState, event: CapabilityEvent): CapabilityState;
/** Public diagnostic copies remain mutable, but cannot modify retained evidence. */
export declare function selectCapabilities(state: CapabilityState): CapabilityRecord[];
export type TierFailure = Readonly<{
    key: string;
    reason: string;
    until: number;
}>;
export type TierAttemptState = Readonly<{
    failures: readonly TierFailure[];
}>;
export declare function createTierAttempts(): TierAttemptState;
export declare function recordTierFailure(state: TierAttemptState, key: string, reason: string, now: number): TierAttemptState;
/** Reading an expired key removes only that key and does not refresh recency. */
export declare function readTierFailure(state: TierAttemptState, key: string, now: number): Readonly<{
    state: TierAttemptState;
    reason: string | undefined;
}>;
/** Indices preserve shell plan identity, including duplicate IDs, without ever
 * admitting provider objects or callbacks into this policy. */
export declare function preferredPlanIndices(plans: readonly Readonly<{
    id: string;
    eligible: boolean;
}>[], current: string): readonly number[];
