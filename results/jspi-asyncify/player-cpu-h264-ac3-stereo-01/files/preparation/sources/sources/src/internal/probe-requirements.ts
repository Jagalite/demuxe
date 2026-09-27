// SPDX-License-Identifier: Apache-2.0
// Admission evidence only. Backends still verify their actual decoder/output.
export type ProbeFact = 'container' | 'tracks' | 'duration' | 'decoder-config' | 'track-bounds';
export const routingRequirements: readonly ProbeFact[] = ['container', 'tracks'];
export function requirementsForPlan(id: string | undefined): readonly ProbeFact[] {
  if (!id) return ['container', 'tracks', 'decoder-config'];
  if (id.startsWith('software')) return [];
  if (id.startsWith('hybrid')) return [...routingRequirements, 'decoder-config'];
  if (id.startsWith('native-flac') || id.startsWith('native-opus')) return [...routingRequirements, 'duration', 'track-bounds'];
  if (id.includes('mpv') || id.includes('transcode') || id.includes('-ass')) return [...routingRequirements, 'duration'];
  if (id.startsWith('native-direct') || id.startsWith('native-remux')) return routingRequirements;
  return [...routingRequirements, 'decoder-config'];
}
export function missingProbeFacts(required: readonly ProbeFact[], available: readonly string[]): ProbeFact[] {
  return required.filter(fact => !available.includes(fact));
}

// Software can run without metadata, but missing evidence must not silently
// eliminate earlier routes. Resolve uncertain candidates before accepting it.
export function missingRoutingFacts(plans: readonly {id:string;eligible:boolean;code?:string}[], available: readonly string[]): ProbeFact[] {
  const first = plans.findIndex(plan => plan.eligible);
  const missing = missingProbeFacts(requirementsForPlan(plans[first]?.id), available);
  if (first >= 0 && plans[first].id.startsWith('software')) {
    for (const plan of plans.slice(0, first)) {
      if (plan.code === 'SOURCE_UNSUPPORTED' || plan.code === 'QUALIFICATION_REQUIRED')
        missing.push(...missingProbeFacts(requirementsForPlan(plan.id), available));
    }
  }
  return [...new Set(missing)];
}
