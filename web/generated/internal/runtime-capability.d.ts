// SPDX-License-Identifier: Apache-2.0
import { type CapabilityEvidence, type CapabilityRecord } from './machine/routing.js';
export type { CapabilityEvidence, CapabilityRecord } from './machine/routing.js';
/** Player-local object identities are shell resources; retained evidence and
 * admission transitions belong to the immutable routing authority. */
export declare class RuntimeCapabilities {
    private identities;
    private serial;
    private state;
    begin(source: object, plans: ReadonlyArray<{
        id: string;
        eligible: boolean;
        reason?: string;
    }>): void;
    update(planId: string, state: CapabilityRecord['state'], evidence?: CapabilityEvidence, reason?: string, failureKind?: CapabilityRecord['failureKind']): void;
    admission(plans: ReadonlyArray<{
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
    readonly stage: string;
    readonly evidenceTimeout = true;
    constructor(stage: string);
}
/** Missing readiness is inconclusive, not proof of codec incompatibility. */
export declare class NativeLoadTimeout extends StartupEvidenceTimeout {
    readonly budgetMs: number;
    constructor(event: 'loadeddata' | 'loadedmetadata', budgetMs?: number);
}
export declare function evidenceInterrupted(error: unknown): boolean;
