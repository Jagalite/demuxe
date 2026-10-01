import { PlayerError } from './errors.js';
export function selectRemuxRuntime(options, capabilities = { isolated: globalThis.crossOriginIsolated === true, jspi: typeof WebAssembly !== 'undefined' &&
        typeof WebAssembly.Suspending === 'function' &&
        typeof WebAssembly.promising === 'function' }) {
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
    return { policy, runtime, ...capabilities };
}
/** Deployment filters runtime implementations, never playback-plan order.
 * Explicit policies remain pinned. Absence preserves the original choice so
 * normal plan rejection can report the missing provider requirement. */
export function deployedRemuxRuntime(selection, available) {
    if (!['auto', 'on'].includes(selection.policy))
        return selection;
    const ordered = selection.policy === 'auto' && selection.isolated ? ['pthread', 'jspi', 'asyncify'] : ['jspi', 'asyncify'];
    const runtime = ordered.find(r => (r !== 'jspi' || selection.jspi) && available(r)) ?? selection.runtime;
    return { ...selection, runtime };
}
