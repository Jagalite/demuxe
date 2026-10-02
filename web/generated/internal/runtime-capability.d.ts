// SPDX-License-Identifier: Apache-2.0
import { type CapabilityEvidence, type CapabilityRecord } from './machine/routing.js';
export type { CapabilityEvidence, CapabilityRecord } from './machine/routing.js';
import { type CapabilityOwner, type CapabilityChange } from './machine/route-evidence.js';
export type CapabilityStore = {
    read(): CapabilityOwner;
    change(change: CapabilityChange, revision: number): boolean;
};
/** A Player supplies its composed store. Standalone utility users retain a
 * local pure owner; physical object identity never enters either state. */
export declare class RuntimeCapabilities {
    private readonly store;
    private identities;
    private identityEpoch;
    constructor(store?: CapabilityStore);
    begin(source: object, plans: ReadonlyArray<{
        id: string;
        eligible: boolean;
        reason?: string;
    }>): void;
    get revision(): number;
    update(planId: string, state: CapabilityRecord['state'], evidence?: CapabilityEvidence, reason?: string, failureKind?: CapabilityRecord['failureKind'], revision?: number): void;
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
