export type CapabilityEvidence = {
    apiHint?: string;
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
    state: 'untested' | 'probing' | 'verified' | 'failed';
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
