// SPDX-License-Identifier: Apache-2.0
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
  reason: 'baseline' | 'incomplete-evidence' | 'uncertain-difference' | 'measured-cost';
  evidenceIds: readonly string[];
  excluded: readonly string[];
}>;

export function providerReadinessKey(facts: readonly ProviderReadiness[]): string {
  const ids = new Set<string>();
  for (const fact of facts) {
    if (ids.has(fact.providerId)) throw Error('Duplicate provider readiness');
    ids.add(fact.providerId);
  }
  return JSON.stringify([...facts].sort((a, b) => a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0)
    .map(f => [f.providerId, f.implementationIdentity, f.nativeConfiguration, f.bytes, f.javascript, f.wasm, f.instance]));
}

/** Only accepts already-qualified/available bindings. Complete, comparable
 * recipe evidence is mandatory; no assumed native/cache preference or sum of
 * component microbenchmarks. All times/limits are explicit inputs for replay.
 * Returns undefined if every measured binding fails resource/deadline limits.
 */
export function compareProviderCosts(bindingIds: readonly string[], baselineId: string,
  records: readonly MeasuredBindingCost[], contextKey: string, policy: CostPolicy, now: number): CostDecision | undefined {
  if (!contextKey || bindingIds.length > 64 || records.length > 256 || !['startup', 'steady-cpu'].includes(policy.objective)) throw Error('Invalid or excessive cost comparison scope');
  if (!bindingIds.includes(baselineId)) throw Error('Cost baseline must be an available qualified binding');
  if (![now, policy.maxAgeMs, policy.maxStartupMs, policy.minThroughputRatio, ...(policy.maxPeakBytes===undefined?[]:[policy.maxPeakBytes])].every(n => Number.isFinite(n) && n >= 0)) throw Error('Invalid cost policy limits');
  const candidates = [...new Set(bindingIds)];
  const costs = new Map<string, MeasuredBindingCost>();
  const excluded: string[] = [];
  for (const id of candidates) {
    const matches = records.filter(r => r.bindingId === id && r.contextKey === contextKey && r.measurement === 'complete-recipe'
      && Number.isFinite(r.measuredAt) && r.measuredAt <= now && now - r.measuredAt <= policy.maxAgeMs
      && Number.isSafeInteger(r.samples) && r.samples >= 2 && !!r.evidenceId
      && [r.remainingStartupMs, r.throughputRatio, r.startupUncertaintyMs].every(n => Number.isFinite(n) && n >= 0)
      && [r.steadyCpuMsPerSecond,r.cpuUncertaintyMsPerSecond,r.peakBytes].every(n=>n===undefined||(Number.isFinite(n)&&n>=0))
      && (policy.objective!=='steady-cpu'||(r.steadyCpuMsPerSecond!==undefined&&r.cpuUncertaintyMsPerSecond!==undefined))
      && (policy.maxPeakBytes===undefined||r.peakBytes!==undefined));
    const record = matches.sort((a, b) => b.measuredAt - a.measuredAt)[0];
    if (!record) continue;
    if (record.remainingStartupMs + record.startupUncertaintyMs > policy.maxStartupMs || (policy.maxPeakBytes!==undefined&&record.peakBytes! > policy.maxPeakBytes) || record.throughputRatio < policy.minThroughputRatio) excluded.push(id);
    else costs.set(id, record);
  }
  const eligible = candidates.filter(id => !excluded.includes(id));
  if (!eligible.length) return undefined;
  const fallback = eligible.includes(baselineId) ? baselineId : eligible[0];
  const evidenceIds = [...costs.values()].map(c => c.evidenceId);
  if (eligible.some(id => !costs.has(id))) return {bindingId: fallback, reason: 'incomplete-evidence', evidenceIds, excluded};
  const value = (c: MeasuredBindingCost) => policy.objective === 'startup' ? c.remainingStartupMs : c.steadyCpuMsPerSecond!;
  const uncertainty = (c: MeasuredBindingCost) => policy.objective === 'startup' ? c.startupUncertaintyMs : c.cpuUncertaintyMsPerSecond!;
  const ranked = eligible.map(id => costs.get(id)!).sort((a, b) => value(a) - value(b) || candidates.indexOf(a.bindingId) - candidates.indexOf(b.bindingId));
  const best = ranked[0], previous = costs.get(fallback)!;
  if (best.bindingId === fallback) return {bindingId: fallback, reason: 'baseline', evidenceIds, excluded};
  if (value(best) + uncertainty(best) >= value(previous) - uncertainty(previous)) return {bindingId: fallback, reason: 'uncertain-difference', evidenceIds, excluded};
  return {bindingId: best.bindingId, reason: 'measured-cost', evidenceIds, excluded};
}
