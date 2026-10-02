// SPDX-License-Identifier: Apache-2.0
import { type TierOwner, type TierChange } from './machine/route-evidence.js';
export type TierStore = {
    read(): TierOwner;
    change(change: TierChange, revision: number): boolean;
};
/** Object identity and clock reads stay here; Player evidence shares its one
 * composed authority, while standalone utility instances have a local owner. */
export declare class TierAttempts {
    private readonly store;
    private sources;
    private identityEpoch;
    constructor(store?: TierStore);
    key(source: object, configuration: string, plan: string): string | undefined;
    failure(source: object, configuration: string, plan: string, reason: string, now?: number): void;
    reason(source: object, configuration: string, plan: string, now?: number): string | undefined;
    clear(): void;
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export declare function preferredPlans<T extends {
    id: string;
    eligible: boolean;
}>(plans: readonly T[], current: string): T[];
