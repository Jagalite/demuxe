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
    kind: 'trying' | 'finished' | 'timer-failed';
    id: number;
}>;
export declare function initialPromotion(): PromotionState;
export declare function cancelPromotion(state: PromotionState): PromotionState;
export declare function transitionPromotion(state: PromotionState, change: PromotionChange): PromotionState;
/** Only an already admitted plan before the accepted plan can be promoted.
 * Playing handoffs additionally need the Native overlap path. */
export declare function promotionPlanAllowed(paused: boolean, mode: string, cachedFailure: boolean): boolean;
