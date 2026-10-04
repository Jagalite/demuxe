// SPDX-License-Identifier: Apache-2.0
import type { ProviderPreferences } from '../types.js';
export { compareProviderPreferences } from './machine/provider-runtime.js';
export type { ProviderPreferencesData } from './machine/provider-runtime.js';
/** Measured selection within qualified compositions; Player plan order is separate. */
export type ProviderReadiness = Readonly<{
    providerId: string;
    implementationIdentity: string;
    nativeConfiguration: 'supported' | 'unsupported' | 'unknown' | 'not-applicable';
    bytes: 'unknown' | 'known-cached' | 'verified-resident';
    javascript: 'not-applicable' | 'not-evaluated' | 'evaluated';
    wasm: 'not-applicable' | 'not-compiled' | 'compiled';
    instance: 'none' | 'initializing' | 'idle-reusable' | 'busy' | 'not-reusable';
}>;
export type MeasuredBindingCost = Readonly<{
    bindingId: string;
    /** Caller-built fingerprint of exact recipe, implementations, deployment,
     * source workload, environment and all readiness states at measurement. */
    contextKey: string;
    evidenceId: string;
    measuredAt: number;
    samples: number;
    measurement: 'complete-recipe';
    remainingStartupMs: number;
    /** Omit unmeasured metrics. They are never imputed as zero; policies that
     * require them retain baseline until comparable evidence exists. */
    steadyCpuMsPerSecond?: number;
    peakBytes?: number;
    throughputRatio: number;
    startupUncertaintyMs: number;
    cpuUncertaintyMsPerSecond?: number;
}>;
export type CostPolicy = Readonly<{
    objective: 'startup' | 'steady-cpu';
    maxAgeMs: number;
    maxStartupMs: number;
    maxPeakBytes?: number;
    minThroughputRatio: number;
}>;
export type CostDecision = Readonly<{
    bindingId: string;
    reason: 'baseline' | 'incomplete-evidence' | 'uncertain-difference' | 'measured-cost' | 'provider-preference';
    evidenceIds: readonly string[];
    excluded: readonly string[];
}>;
export declare function providerReadinessKey(facts: readonly ProviderReadiness[]): string;
/** Only accepts already-qualified/available bindings. Complete, comparable
 * recipe evidence is mandatory; no assumed native/cache preference or sum of
 * component microbenchmarks. All times/limits are explicit inputs for replay.
 * Returns undefined if every measured binding fails resource/deadline limits.
 */
export declare function compareProviderCosts(bindingIds: readonly string[], baselineId: string, records: readonly MeasuredBindingCost[], contextKey: string, policy: CostPolicy, now: number): CostDecision | undefined;
/** Capture caller policy once. Provider IDs can name optional deployments;
 * unknown IDs never add offers or qualification. */
export declare function normalizeProviderPreferences(value: ProviderPreferences | undefined): ProviderPreferences;
