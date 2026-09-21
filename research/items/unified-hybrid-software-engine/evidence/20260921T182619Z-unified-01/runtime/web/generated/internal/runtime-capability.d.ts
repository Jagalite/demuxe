// SPDX-License-Identifier: Apache-2.0
export type CapabilityEvidence = {
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
/** Player-local, bounded evidence. No URL/credentials, persistent fingerprint or
 * cross-source acceptance shortcut. Every candidate must validate startup again. */
export declare class RuntimeCapabilities {
    private identities;
    private serial;
    private records;
    private verified;
    begin(source: object, plans: Array<{
        id: string;
        eligible: boolean;
        reason?: string;
    }>): void;
    update(planId: string, state: CapabilityRecord['state'], evidence?: CapabilityEvidence, reason?: string, failureKind?: CapabilityRecord['failureKind']): void;
    admission(plans: Array<{
        id: string;
        eligible: boolean;
        reason?: string;
    }>): void;
    clear(): void;
    snapshot(): CapabilityRecord[];
}
/** Only positive compatibility failures permit another pipeline. Unknown errors,
 * missing assets, authorization, identity, network and cancellation stay terminal. */
export declare function compatibilityFailure(error: unknown): boolean;
export declare function nativeMediaError(error: MediaError | null): Error;
export declare class StartupEvidenceTimeout extends Error {
    readonly evidenceTimeout = true;
    constructor(stage: string);
}
export declare function evidenceInterrupted(error: unknown): boolean;
