// SPDX-License-Identifier: Apache-2.0
import { type RemuxDeployment, type RemuxDeploymentChange } from './remux-deployment.js';
import { type RecoveryState, type RecoveryChange } from './route-recovery.js';
import { type PromotionState, type PromotionChange } from './route-promotion.js';
import { type RouteEvidence, type CapabilityChange, type TierChange } from './route-evidence.js';
import { type ProviderUpdates, type ProviderUpdateChange } from './provider-updates.js';
import { type DiscoveryState, type DiscoveryChange } from './route-discovery.js';
import { type InspectionState, type InspectionChange } from './route-inspection.js';
import type { SelectionAttempt } from './source-policy.js';
import type { RoutePlan } from './route-admission.js';
import type { DecodingEvidence } from './media-facts.js';
export type RoutingState = Readonly<{
    providers: ProviderUpdates;
    deployment: RemuxDeployment;
    recovery: RecoveryState;
    promotion: PromotionState;
    evidence: RouteEvidence;
    discovery: DiscoveryState;
    inspection: InspectionState;
    plans: readonly RoutePlan[];
    attempts: readonly SelectionAttempt[];
    context: Readonly<{
        nativeReason?: string;
        automatic: boolean;
    }>;
}>;
export declare function initialRouting(): RoutingState;
export type RoutingInput = Readonly<{
    type: 'routing.providers';
    change: ProviderUpdateChange;
}> | Readonly<{
    type: 'routing.deployment';
    epoch: number;
    operation: number | null;
    change: RemuxDeploymentChange;
}> | Readonly<{
    type: 'routing.recovery';
    change: RecoveryChange;
}> | Readonly<{
    type: 'routing.promotion';
    change: PromotionChange;
}> | Readonly<{
    type: 'routing.capabilities';
    revision: number;
    change: CapabilityChange;
}> | Readonly<{
    type: 'routing.tiers';
    revision: number;
    change: TierChange;
}> | Readonly<{
    type: 'routing.discovery';
    epoch: number;
    operation: number | null;
    change: DiscoveryChange;
}> | Readonly<{
    type: 'routing.inspection';
    epoch: number;
    operation: number | null;
    change: InspectionChange;
}> | Readonly<{
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
