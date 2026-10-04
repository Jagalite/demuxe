// SPDX-License-Identifier: Apache-2.0
import { normalizeProviderPreferences } from './provider-cost.js';
import { PlayerError } from './errors.js';
import { remuxDeploymentCandidates, resolveRemuxDeployment } from './machine/remux-deployment.js';
export function selectRemuxRuntime(options, capabilities = { isolated: globalThis.crossOriginIsolated === true, jspi: typeof WebAssembly !== 'undefined' &&
        typeof WebAssembly.Suspending === 'function' &&
        typeof WebAssembly.promising === 'function' }) {
    const providerPreferences = normalizeProviderPreferences(options.providerPreferences);
    const legacy = options.experimentalRemuxRuntime;
    if (legacy !== undefined && !['pthread', 'jspi', 'asyncify'].includes(legacy))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid experimental remux runtime');
    if (legacy !== undefined && options.remuxRuntime !== undefined)
        throw new PlayerError('INVALID_ARGUMENT', 'Use remuxRuntime or experimentalRemuxRuntime, not both');
    if (options.remuxRuntime !== undefined && !['on', 'off', 'auto', 'jspi', 'asyncify'].includes(options.remuxRuntime))
        throw new PlayerError('INVALID_ARGUMENT', 'remuxRuntime must be on, off, auto, jspi or asyncify');
    const policy = options.remuxRuntime ?? (legacy === 'pthread' ? 'off' : legacy) ?? 'auto';
    if (policy === 'jspi' && !capabilities.jspi)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Requested JSPI runtime is unavailable in this browser');
    const runtime = policy === 'off' || (policy === 'auto' && capabilities.isolated) ? 'pthread' :
        policy === 'jspi' || policy === 'asyncify' ? policy : capabilities.jspi ? 'jspi' : 'asyncify';
    const selection = { policy, runtime, ...capabilities, ...(providerPreferences.length ? { providerPreferences } : {}) };
    return Object.freeze({ ...selection, runtime: remuxDeploymentCandidates(selection)[0] ?? runtime });
}
/** Deployment filters runtime implementations, never playback-plan order.
 * Explicit policies remain pinned. Absence preserves the original choice so
 * normal plan rejection can report the missing provider requirement. */
export function deployedRemuxRuntime(selection, available) {
    const facts = {};
    for (const runtime of remuxDeploymentCandidates(selection)) {
        facts[runtime] = available(runtime);
        if (facts[runtime])
            break;
    }
    return resolveRemuxDeployment(selection, facts);
}
