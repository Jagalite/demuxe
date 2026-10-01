// SPDX-License-Identifier: Apache-2.0
export const routingRequirements = ['container', 'tracks'];
export function requirementsForPlan(id) {
    if (!id)
        return ['container', 'tracks', 'decoder-config'];
    if (id.startsWith('hybrid-private'))
        return [...routingRequirements, 'duration', 'decoder-config'];
    if (id.startsWith('software-private'))
        return [...routingRequirements, 'duration'];
    if (id.startsWith('software'))
        return [];
    if (id.startsWith('hybrid'))
        return [...routingRequirements, 'decoder-config'];
    if (id.startsWith('native-flac') || id.startsWith('native-opus'))
        return [...routingRequirements, 'duration', 'track-bounds'];
    if (id.includes('mpv') || id.includes('transcode') || id.includes('-ass'))
        return [...routingRequirements, 'duration'];
    if (id.startsWith('native-direct') || id.startsWith('native-remux'))
        return routingRequirements;
    return [...routingRequirements, 'decoder-config'];
}
export function missingProbeFacts(required, available) {
    return required.filter(fact => !available.includes(fact));
}
// Software can run without metadata, but missing evidence must not silently
// eliminate earlier routes. Resolve uncertain candidates before accepting it.
export function missingRoutingFacts(plans, available) {
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
