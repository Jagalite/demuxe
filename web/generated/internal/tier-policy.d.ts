// SPDX-License-Identifier: Apache-2.0
/** Configuration-scoped negative evidence. Never caches transport or deadlines. */
export declare class TierAttempts {
    private sources;
    private serial;
    private failures;
    key(source: object, configuration: string, plan: string): string;
    failure(source: object, configuration: string, plan: string, reason: string, now?: number): void;
    reason(source: object, configuration: string, plan: string, now?: number): string | undefined;
    clear(): void;
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export declare function preferredPlans<T extends {
    id: string;
    eligible: boolean;
}>(plans: T[], current: string): T[];
