// SPDX-License-Identifier: Apache-2.0
import type { SelectionAttempt } from './source-policy.js';
import type { RoutePlan } from './route-admission.js';
import type { DecodingEvidence } from './media-facts.js';
export type RoutingState = Readonly<{
    plans: readonly RoutePlan[];
    attempts: readonly SelectionAttempt[];
    context: Readonly<{
        nativeReason?: string;
        automatic: boolean;
    }>;
}>;
export declare function initialRouting(): RoutingState;
export type RoutingInput = Readonly<{
    type: 'routing.plans';
    plans: readonly RoutePlan[];
}> | Readonly<{
    type: 'routing.context';
    context: RoutingState['context'];
}> | Readonly<{
    type: 'routing.attempts';
    attempts: readonly SelectionAttempt[];
}> | Readonly<{
    type: 'routing.attempt';
    attempt: SelectionAttempt;
}> | Readonly<{
    type: 'routing.reject';
    id: string;
    code: NonNullable<RoutePlan['code']>;
    reason: string;
}> | Readonly<{
    type: 'routing.decoding';
    epoch: number;
    session: number | null;
    answers: readonly Readonly<{
        id: string;
        evidence: DecodingEvidence | undefined;
    }>[];
}>;
export declare function transitionRouting(state: RoutingState, input: RoutingInput): RoutingState;
