// SPDX-License-Identifier: Apache-2.0
import {executionRecipe, resolvableExecutionRecipe} from './execution-recipes.js';
import type {PlaybackPlanId} from './execution-recipes.js';
import {resolveProviderRecipe} from './provider-resolution.js';
import type {CompositionEvidence, ProviderCatalog, RecipeResolution} from './provider-resolution.js';
import {providerResolutionError, deploymentRejectionError} from './provider-deployment-errors.js';

export type AdmittedProviderPlan = Readonly<{id: string; eligible: boolean; code?: string; reason?: string}>;
export type ProviderPlanDecision = Readonly<{
  planId: string;
  code?: string;
  reason?: string;
  resolution?: RecipeResolution;
}>;
export type ProviderPlanSelection =
  | Readonly<{state: 'available' | 'pending'; planId: string; resolution: RecipeResolution; decisions: readonly ProviderPlanDecision[]}>
  | Readonly<{state: 'failed'; error: Error; decisions: readonly ProviderPlanDecision[]}>
  | Readonly<{state: 'exhausted'; error?: Error; decisions: readonly ProviderPlanDecision[]}>;

/** Deployment stage after existing admission and explicit-mode filtering.
 * Pure, ordered, bounded; it never admits a rejected plan or probes later plans
 * while an earlier candidate still needs acquisition. The original backend
 * owner selects its guarded implementation and verifies actual output.
 * Not enabled in Player until package deployment integration is qualified.
 */
export function nextProviderPlan(plans: readonly AdmittedProviderPlan[], catalog: ProviderCatalog,
  evidence: readonly CompositionEvidence[], scopeKey: string): ProviderPlanSelection {
  if (plans.length > 64) throw Error('Provider plan budget exceeded');
  const decisions: ProviderPlanDecision[] = [], rejected: RecipeResolution[] = [];
  for (const plan of plans) {
    if (!plan.eligible) {
      decisions.push({planId: plan.id, code: plan.code, reason: plan.reason});
      continue;
    }
    if (!executionRecipe(plan.id)) {
      decisions.push({planId: plan.id, code: 'QUALIFICATION_REQUIRED', reason: 'No registered execution recipe'});
      continue;
    }
    const resolution = resolveProviderRecipe(resolvableExecutionRecipe(plan.id as PlaybackPlanId), catalog, evidence, scopeKey);
    decisions.push({planId: plan.id, resolution, ...(resolution.code ? {code: resolution.code} : {})});
    if (resolution.state === 'failed') return {state: 'failed', error: providerResolutionError([resolution])!, decisions};
    if (resolution.state === 'available' || resolution.state === 'pending') return {state: resolution.state, planId: plan.id, resolution, decisions};
    rejected.push(resolution);
  }
  return {state: 'exhausted', error: providerResolutionError(rejected) ?? deploymentRejectionError(plans.filter(p => !p.eligible)), decisions};
}
