// SPDX-License-Identifier: Apache-2.0
export type ProbeFact = 'container' | 'tracks' | 'duration' | 'decoder-config' | 'track-bounds';
export declare const routingRequirements: readonly ProbeFact[];
export declare function requirementsForPlan(id: string | undefined): readonly ProbeFact[];
export declare function missingProbeFacts(required: readonly ProbeFact[], available: readonly string[]): ProbeFact[];
export declare function missingRoutingFacts(plans: readonly {
    id: string;
    eligible: boolean;
    code?: string;
}[], available: readonly string[]): ProbeFact[];
