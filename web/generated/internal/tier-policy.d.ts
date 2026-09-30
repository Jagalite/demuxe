// SPDX-License-Identifier: Apache-2.0
/** Configuration-scoped compatibility evidence and optional retry scheduling. */
export declare class TierAttempts {
    private sources;
    private serial;
    private failures;
    private deferredPromotions;
    key(source: object, configuration: string, plan: string): string;
    failure(source: object, configuration: string, plan: string, reason: string, now?: number): void;
    reason(source: object, configuration: string, plan: string, now?: number): string | undefined;
    deferPromotion(source: object, configuration: string, plan: string): void;
    promotionDeferred(source: object, configuration: string, plan: string): boolean;
    clear(): void;
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export declare function preferredPlans<T extends {
    id: string;
    eligible: boolean;
}>(plans: T[], current: string): T[];
