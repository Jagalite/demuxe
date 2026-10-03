// SPDX-License-Identifier: Apache-2.0
export type PromotionFacts = Readonly<{
    automatic: boolean;
    source: boolean;
    current: boolean;
    error: boolean;
    paused: boolean;
    background: boolean;
    waiting: boolean;
    queued: number;
}>;
export type PromotionState = Readonly<{
    serial: number;
    epoch: number;
    timer: Readonly<{
        id: number;
        epoch: number;
        due: number;
    }> | null;
    active: Readonly<{
        id: number;
        epoch: number;
        phase: 'queued' | 'inspecting' | 'trying';
        candidates?: readonly string[];
        cursor?: number;
    }> | null;
}>;
export type PromotionChange = Readonly<{
    kind: 'cancel';
}> | Readonly<{
    kind: 'schedule';
    now: number;
    facts: PromotionFacts;
}> | Readonly<{
    kind: 'fired';
    id: number;
    now: number;
    facts: PromotionFacts;
}> | Readonly<{
    kind: 'start';
    id: number;
    facts: PromotionFacts;
}> | Readonly<{
    kind: 'trying';
    id: number;
    candidates?: readonly string[];
}> | Readonly<{
    kind: 'attempt';
    id: number;
    plan: string;
    outcome: 'selected' | 'compatibility' | 'terminal';
}> | Readonly<{
    kind: 'finished' | 'timer-failed';
    id: number;
}>;
export declare function initialPromotion(): PromotionState;
export declare function cancelPromotion(state: PromotionState): PromotionState;
export declare function transitionPromotion(state: PromotionState, change: PromotionChange): PromotionState;
/** Only an already admitted plan before the accepted plan can be promoted.
 * Playing handoffs additionally need the Native overlap path. */
export declare function promotionPlanAllowed(paused: boolean, mode: string, cachedFailure: boolean): boolean;
export declare function promotionCandidate(state: PromotionState, id: number): string | undefined;
export declare function promotionCandidates(plans: readonly Readonly<{
    id: string;
    mode: string;
    eligible: boolean;
    cachedFailure: boolean;
}>[], current: string, paused: boolean): readonly string[];
