// SPDX-License-Identifier: Apache-2.0
/** Object identity and clock reads stay here; negative-evidence policy is pure. */
export declare class TierAttempts {
    private sources;
    private serial;
    private state;
    key(source: object, configuration: string, plan: string): string;
    failure(source: object, configuration: string, plan: string, reason: string, now?: number): void;
    reason(source: object, configuration: string, plan: string, now?: number): string | undefined;
    clear(): void;
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export declare function preferredPlans<T extends {
    id: string;
    eligible: boolean;
}>(plans: readonly T[], current: string): T[];
