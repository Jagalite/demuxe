// SPDX-License-Identifier: Apache-2.0
import {compareProviderCosts,compareProviderPreferences,normalizeProviderPreferences} from './provider-cost.js';
import type {CostDecision,CostPolicy,MeasuredBindingCost} from './provider-cost.js';
import type {ProviderPreferences} from '../types.js';
import type {ResolvableRecipe,RecipeResolution} from './provider-resolution.js';
import {providerResolutionError} from './provider-deployment-errors.js';
export class ComponentSelectionError extends Error {
 constructor(readonly code: 'QUALIFICATION_REQUIRED'|'RUNTIME_BUDGET_EXCEEDED',message:string){super(message);this.name='ComponentSelectionError';}
}
/** Selection within one already-admitted, explicitly enumerated composition.
 * This does not reorder playback plans or turn provider failure into absence.
 * Readiness/deployment/source/browser identity belongs in the cost context.
 * Only the maintained owner supplies evidence; manifests never supply costs. */
export function selectComponentBinding(resolution: RecipeResolution, baseline: string,
 measurement?: {records: readonly MeasuredBindingCost[]; contextKey: string; policy: CostPolicy; now: number},
 preference?: {recipe: ResolvableRecipe; providerPreferences: ProviderPreferences}): CostDecision {
 const preferences=normalizeProviderPreferences(preference?.providerPreferences);
 const failed=resolution.bindings.find(b=>b.state==='failed');if(failed?.state==='failed')throw failed.error;
 const eligible=resolution.bindings.filter(b=>b.state==='available'||b.state==='pending').map(b=>b.bindingId);
 if(!eligible.length)throw providerResolutionError([resolution])??new ComponentSelectionError('QUALIFICATION_REQUIRED','No qualified provider-backed recipe remains');
 const fallback=eligible.includes(baseline)?baseline:eligible[0];
 const decision=measurement?compareProviderCosts(eligible,fallback,measurement.records,measurement.contextKey,measurement.policy,measurement.now):{bindingId:fallback,reason:'baseline' as const,evidenceIds:[],excluded:[]};
 if(!decision)throw new ComponentSelectionError('RUNTIME_BUDGET_EXCEEDED','No available qualified composition satisfies the measured runtime resource limits');
 if(preference&&preferences.length){
  if(preference.recipe.id!==resolution.recipeId)throw new ComponentSelectionError('QUALIFICATION_REQUIRED','Preference recipe does not match resolution');
  const assignments=(id:string)=>preference.recipe.bindings.find(b=>b.id===id)?.assignments??[];
  const remaining=eligible.filter(id=>!decision.excluded.includes(id));
  const preferred=[decision.bindingId,...remaining.filter(id=>id!==decision.bindingId)].sort((a,b)=>compareProviderPreferences(assignments(a),assignments(b),preferences))[0];
  if(preferred!==decision.bindingId)return {...decision,bindingId:preferred,reason:'provider-preference'};
 }
 return decision;
}

/** Execute a selected composition using existing scoped acquisition. A runtime
 * probe may remove a provider and trigger another admitted binding; an asset or
 * execution failure is terminal here and retains its identity for the plan owner.
 * Cost ranking is used only for the initial readiness snapshot. Resource-limit
 * exclusions survive retries until a new execution supplies fresh evidence. */
export async function executeComponentBinding<T>(
 acquisition: import('./provider-acquisition.js').ProviderAcquisition,
 recipe: import('./provider-resolution.js').ResolvableRecipe,
 evidence: readonly import('./provider-resolution.js').CompositionEvidence[],
 scopeKey: string, baseline: string,
 execute: (bindingId: string) => Promise<T>,
 measurement?: Parameters<typeof selectComponentBinding>[2],
 providerPreferences?: ProviderPreferences,
): Promise<{value: T; decision: CostDecision}> {
 const preferences=normalizeProviderPreferences(providerPreferences);
 const excluded=new Set<string>();
 for(let attempt=0;attempt<=recipe.bindings.length;attempt++){
  const resolution=acquisition.resolve(recipe,evidence,scopeKey);
  const failed=resolution.bindings.find(b=>b.state==='failed');if(failed?.state==='failed')throw failed.error;
  const available=resolution.bindings.filter(b=>b.state==='available'||b.state==='pending');
  if(available.length&&available.every(b=>excluded.has(b.bindingId)))throw new ComponentSelectionError('RUNTIME_BUDGET_EXCEEDED','Remaining available compositions were excluded by the measured runtime resource limits');
  // Filter only the pure selection input. Acquisition still receives the
  // original immutable resolution ticket issued for the current catalog.
  const selection={...resolution,bindings:resolution.bindings.filter(b=>!excluded.has(b.bindingId))};
  const selected=selectComponentBinding(selection,baseline,attempt===0?measurement:undefined,{recipe,providerPreferences:preferences});
  for(const id of selected.excluded)excluded.add(id);
  const decision={...selected,excluded:[...excluded]};
  await acquisition.acquire(resolution,decision.bindingId);
  const after=acquisition.resolve(recipe,evidence,scopeKey);
  const binding=after.bindings.find(b=>b.bindingId===decision.bindingId);
  if(binding?.state==='available')return {value:await execute(decision.bindingId),decision};
  if(after.state==='failed')selectComponentBinding(after,baseline);
 }
 throw new ComponentSelectionError('QUALIFICATION_REQUIRED','Component availability did not converge within the admitted binding set');
}
