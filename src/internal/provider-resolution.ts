// SPDX-License-Identifier: Apache-2.0
import type {CapabilityRequest, ProviderDelivery, ProviderTechnology} from './execution-capabilities.js';

export type ProviderAvailability =
  | Readonly<{state: 'absent'; reason: string}>
  | Readonly<{state: 'configured-unverified'}>
  | Readonly<{state: 'available'}>
  | Readonly<{state: 'failed'; error: Error}>;

export type ProviderFact = Readonly<{
  id: string;
  /** Artifact/build + binding ABI + runtime identity, not an npm package name. */
  implementationIdentity: string;
  technology: ProviderTechnology;
  delivery: readonly ProviderDelivery[];
  offers: readonly CapabilityRequest[];
  availability: ProviderAvailability;
  packageName?: string;
  applicationBuild?: string;
}>;
export type ProviderCatalog = Readonly<{
  revision: string;
  providers: readonly ProviderFact[];
}>;
export type ProviderAssignment = Readonly<{
  providerId: string;
  requirements: readonly CapabilityRequest[];
}>;
export type QualifiedRecipeBinding = Readonly<{
  id: string;
  assignments: readonly ProviderAssignment[];
}>;
export type ResolvableRecipe = Readonly<{
  id: string;
  requirements: readonly CapabilityRequest[];
  bindings: readonly QualifiedRecipeBinding[];
}>;
export type CompositionEvidence = Readonly<{
  recipeId: string;
  bindingId: string;
  /** Source/selected tracks/features/browser/runtime envelope established by
   * admission. Callers must invalidate this key when those facts change. */
  scopeKey: string;
  implementationIdentities: Readonly<Record<string, string>>;
}>;
export type MissingProviderRequirement = Readonly<{
  providerId: string;
  requirements: readonly CapabilityRequest[];
  packageName?: string;
  reason: 'not-configured' | 'absent' | 'capability-not-provided' | 'implementation-not-qualified';
}>;
export type BindingResolution =
  | Readonly<{bindingId: string; state: 'available' | 'pending'; providerIds: readonly string[]}>
  | Readonly<{bindingId: string; state: 'unavailable'; missing: readonly MissingProviderRequirement[]}>
  | Readonly<{bindingId: string; state: 'unqualified'; reason: string}>
  | Readonly<{bindingId: string; state: 'failed'; error: Error}>;
export type RecipeResolution = Readonly<{
  recipeId: string;
  deploymentRevision: string;
  scopeKey: string;
  bindings: readonly BindingResolution[];
  state: 'available' | 'pending' | 'unavailable' | 'unqualified' | 'failed';
  code?: 'DEPLOYMENT_UNAVAILABLE' | 'QUALIFICATION_REQUIRED';
}>;

function key(r: CapabilityRequest): string {
  return JSON.stringify([r.capability, r.version, r.profile]);
}
function same(a: CapabilityRequest, b: CapabilityRequest): boolean { return key(a) === key(b); }

/** Bounded resolution of enumerated compositions, not graph construction.
 * No I/O, global state, environment probes, instantiation or playback decisions.
 * Evidence is supplied by the maintained qualification owner, never a package's
 * self-declared `provides` list. The caller retains route order and terminal
 * error handling; `pending` requires existing bounded acquisition checks.
 */
export function resolveProviderRecipe(recipe: ResolvableRecipe, catalog: ProviderCatalog,
  evidence: readonly CompositionEvidence[], scopeKey: string): RecipeResolution {
  if (!scopeKey || !catalog.revision || !recipe.id || !recipe.requirements.length || recipe.requirements.length > 64
    || recipe.bindings.length > 64 || catalog.providers.length > 256 || evidence.length > 256) throw Error('Invalid or excessive provider resolution scope');
  const providers = new Map<string, ProviderFact>();
  for (const provider of catalog.providers) {
    if (providers.has(provider.id)) throw Error(`Duplicate deployed provider: ${provider.id}`);
    providers.set(provider.id, provider);
  }
  const bindingIds = new Set<string>();
  const required = new Set(recipe.requirements.map(key));
  const bindings: BindingResolution[] = recipe.bindings.map((binding): BindingResolution => {
    if (!binding.id || binding.assignments.length > 64 || binding.assignments.some(a => !a.providerId || !a.requirements.length || a.requirements.length > 64)) throw Error('Invalid provider binding assignments');
    if (bindingIds.has(binding.id)) throw Error(`Duplicate recipe binding: ${binding.id}`);
    bindingIds.add(binding.id);
    const assigned = new Set(binding.assignments.flatMap(a => a.requirements.map(key)));
    if (assigned.size !== required.size || [...required].some(k => !assigned.has(k))) {
      return {bindingId: binding.id, state: 'unqualified', reason: 'Binding does not exactly cover the recipe requirements'};
    }
    const providerIds = [...new Set(binding.assignments.map(a => a.providerId))];
    const envelopes = evidence.filter(e => e.recipeId === recipe.id && e.bindingId === binding.id && e.scopeKey === scopeKey
      && Object.keys(e.implementationIdentities).length === providerIds.length
      && providerIds.every(id => Object.prototype.hasOwnProperty.call(e.implementationIdentities, id)));
    if (!envelopes.length) return {bindingId: binding.id, state: 'unqualified', reason: 'No maintained composition qualification for this source/configuration'};
    // A single evidence record must cover the whole composition; never combine
    // individually qualified providers from different tested binding sets.
    const envelope = envelopes.find(e => providerIds.every(id => {
      const provider = providers.get(id);
      return !provider || e.implementationIdentities[id] === provider.implementationIdentity;
    }));
    // When no complete build set matches, explain the closest single tested
    // set. Do not misleadingly report already-matching providers as missing,
    // and do not combine matching identities from separate records.
    const matches = (e: CompositionEvidence) => providerIds.filter(id => e.implementationIdentities[id] === providers.get(id)?.implementationIdentity).length;
    const expected = envelope ?? envelopes.reduce((best, e) => matches(e) > matches(best) ? e : best);
    const missing: MissingProviderRequirement[] = [];
    let pending = false;
    for (const assignment of binding.assignments) {
      const provider = providers.get(assignment.providerId);
      let reason: MissingProviderRequirement['reason'] | undefined;
      if (!provider) reason = 'not-configured';
      else if (provider.availability.state === 'absent') reason = 'absent';
      else if (!assignment.requirements.every(r => provider.offers.some(offer => same(r, offer)))) reason = 'capability-not-provided';
      else if (expected.implementationIdentities[assignment.providerId] !== provider.implementationIdentity) reason = 'implementation-not-qualified';
      else if (provider.availability.state === 'failed') return {bindingId: binding.id, state: 'failed', error: provider.availability.error};
      else if (provider.availability.state === 'configured-unverified') pending = true;
      if (reason) missing.push({providerId: assignment.providerId, requirements: assignment.requirements,
        ...(provider?.packageName ? {packageName: provider.packageName} : {}), reason});
    }
    return missing.length ? {bindingId: binding.id, state: 'unavailable', missing}
      : {bindingId: binding.id, state: pending ? 'pending' : 'available', providerIds};
  });
  // A declared acquisition failure never becomes absence or permission to try
  // a different implementation. Preserve the original Error object above.
  const state = bindings.some(b => b.state === 'failed') ? 'failed'
    : bindings.some(b => b.state === 'available') ? 'available'
    : bindings.some(b => b.state === 'pending') ? 'pending'
    : bindings.some(b => b.state === 'unavailable') ? 'unavailable' : 'unqualified';
  return {recipeId: recipe.id, deploymentRevision: catalog.revision, scopeKey, bindings, state,
    ...(state === 'unavailable' ? {code: 'DEPLOYMENT_UNAVAILABLE' as const}
      : state === 'unqualified' ? {code: 'QUALIFICATION_REQUIRED' as const} : {})};
}

/** No negative-result cache is needed yet. Future caches must use this scope,
 * not the source compatibility cache or just the plan/provider name. */
export function providerResolutionKey(resolution: RecipeResolution): string {
  return JSON.stringify([resolution.deploymentRevision, resolution.scopeKey, resolution.recipeId]);
}
