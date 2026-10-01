// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { executionRecipe } from './execution-recipes.js';
/** Existing diagnostics already carry per-plan rejection reasons. Preserve that
 * distinction in the final error instead of feeding "no playback route" through
 * the unsupported-media string classifier. Capability names are context, not
 * a claim that every requirement listed is missing.
 */
export function deploymentRejectionError(decisions) {
    const missing = decisions.filter(p => p.code === 'DEPLOYMENT_UNAVAILABLE');
    if (!missing.length)
        return undefined;
    const details = missing.slice(0, 32).map(plan => {
        const capabilities = executionRecipe(plan.id)?.requirements.map(r => `${r.capability}/${r.profile}`).join(', ');
        return `${plan.id}: ${plan.reason ?? 'Required deployment is unavailable'}${capabilities ? ` (recipe requires ${capabilities})` : ''}`;
    });
    return new PlayerError('DEPLOYMENT_UNAVAILABLE', `No available deployment satisfies the remaining playback candidates: ${details.join('; ')}`);
}
/** For explicit provider catalogs: never reinterpret pending validation or an
 * acquisition error as absence. Preserve terminal error identity and do not
 * put deployment failures in source compatibility caches.
 */
export function providerResolutionError(resolutions) {
    for (const resolution of resolutions)
        for (const binding of resolution.bindings) {
            if (binding.state === 'failed')
                return binding.error;
        }
    if (resolutions.some(r => r.state === 'available' || r.state === 'pending'))
        return undefined;
    const reasons = [];
    for (const resolution of resolutions)
        for (const binding of resolution.bindings) {
            if (binding.state !== 'unavailable')
                continue;
            for (const missing of binding.missing) {
                if (reasons.length >= 32)
                    break;
                reasons.push(`${resolution.recipeId}/${binding.bindingId}: ${missing.requirements.map(r => `${r.capability}/${r.profile}`).join(', ')} requires ${missing.providerId}${missing.packageName ? ` (${missing.packageName})` : ''}: ${missing.reason}`);
            }
        }
    return reasons.length ? new PlayerError('DEPLOYMENT_UNAVAILABLE', `Missing qualified provider requirements: ${reasons.join('; ')}`) : undefined;
}
