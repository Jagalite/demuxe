// SPDX-License-Identifier: Apache-2.0
import type { planAdmission } from './playback-plans.js';
import type { BrowserMediaCapability, DecodingEvidence } from './media-facts.js';
export type RoutePlan = ReturnType<typeof planAdmission>[number] & {
    browserCapability?: BrowserMediaCapability;
};
export declare function routeCapabilityFamily(id: string): 'selective' | 'direct' | 'flac' | 'opus' | 'remux';
export declare function attachRouteDecoding(plans: readonly RoutePlan[], id: string, evidence: DecodingEvidence | undefined): readonly RoutePlan[];
export type RouteAdmissionFacts = Readonly<{
    inspected: boolean;
    hybridRejection?: string;
    capabilities?: Readonly<{
        direct: BrowserMediaCapability;
        remux: BrowserMediaCapability;
        flac: BrowserMediaCapability;
        opus: BrowserMediaCapability;
        selective: BrowserMediaCapability;
    }>;
    audioTrackCount: number;
    audioOff: boolean;
    selectedAudioKey?: string;
    defaultAudioKey?: string;
    failedPlans: readonly string[];
    timingControls: boolean;
    audioContextSinkUnavailable: boolean;
}>;
/** Applies semantic exclusions to the finite registry. Browser support answers
 * are observations; neither eligibility nor advisory decoding predicts output. */
export declare function refineRouteAdmission(plans: readonly RoutePlan[], facts: RouteAdmissionFacts): readonly RoutePlan[];
export declare function applyDeploymentRejections(plans: readonly RoutePlan[], rejections: Readonly<Record<string, string | undefined>>): readonly RoutePlan[];
