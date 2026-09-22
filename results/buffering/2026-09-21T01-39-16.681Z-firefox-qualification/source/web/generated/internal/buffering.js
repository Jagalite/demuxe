// SPDX-License-Identifier: GPL-3.0-or-later
import { PlayerError } from './errors.js';
const MiB = 1024 * 1024;
export function bufferingPolicy(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid buffering policy');
    const preload = input.preload ?? 'auto', profile = input.profile ?? 'balanced', memoryBudget = input.memoryBudget;
    if (!['none', 'metadata', 'auto'].includes(preload) || !['low-latency', 'balanced', 'resilient'].includes(profile))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid buffering intent');
    if (memoryBudget !== undefined && (!Number.isSafeInteger(memoryBudget) || memoryBudget < 8 * MiB || memoryBudget > 64 * MiB))
        throw new PlayerError('INVALID_ARGUMENT', 'Buffering memoryBudget must be 8–64 MiB in bytes');
    return Object.freeze({ preload, profile, ...(memoryBudget === undefined ? {} : { memoryBudget }) });
}
export function resolveBuffering(policy, backend) {
    const base = { requestedProfile: policy.profile, preload: policy.preload, backend, control: backend === 'browser' ? 'hint' : 'profile' };
    if (backend === 'browser')
        return { ...base, notes: ['Browser owns buffering and eviction; profiles and memoryBudget are not enforceable.', 'Explicit open performs metadata discovery even with preload none.'] };
    if (backend === 'shaka')
        return { ...base, notes: ['Shaka owns ABR, segment scheduling and eviction; memoryBudget is not enforceable.', 'Explicit open prepares a playable segment; none and metadata limit speculative preload, not manifest discovery.'] };
    if (backend === 'remux')
        return { ...base, forwardSeconds: policy.profile === 'low-latency' ? 2 : policy.profile === 'resilient' ? 10 : 5, backwardSeconds: policy.profile === 'low-latency' ? 1 : 3, forwardLimitBytes: Math.min(policy.memoryBudget ?? 12 * MiB, 12 * MiB), notes: ['Byte ceiling applies to coded data accounting; one bounded fragment and browser decoder resources are additional.', 'Forward time grows above 1x playback while playing; slower playback retains the base target and paused preload is bounded.'] };
    const total = Math.min(policy.memoryBudget ?? (policy.profile === 'low-latency' ? 10 : policy.profile === 'resilient' ? 56 : 40) * MiB, 64 * MiB);
    const back = Math.min(policy.profile === 'low-latency' ? 2 * MiB : 8 * MiB, Math.floor(total / 5));
    return { ...base, cache: true, forwardLimitBytes: total - back, backwardLimitBytes: back, notes: ['Packet budgets are mpv limits, not a whole-player memory cap. Packet granularity and unused-forward donation can affect actual history.', 'Source byte cache, decoded frames, audio and Wasm linear memory are separate.', 'Explicit open prepares metadata and initial output; none and metadata limit speculative readahead.'] };
}
export function mpvBufferingOptions(policy, preparing = true) {
    const resolved = resolveBuffering(policy, 'mpv');
    return { cache: 'yes', 'demuxer-max-bytes': String(resolved.forwardLimitBytes), 'demuxer-max-back-bytes': String(resolved.backwardLimitBytes),
        // Bundled mpv 0.40 default. Do not override refill, hysteresis or seek policy.
        ...(policy.preload !== 'auto' ? { 'cache-secs': preparing ? '1' : '3600000' } : {}) };
}
export function shakaBufferingOptions(policy, preparing = true) {
    const profile = policy.profile === 'low-latency' ? { bufferingGoal: 3, bufferBehind: 3 } : policy.profile === 'resilient' ? { bufferingGoal: 30 } : {};
    return { ...profile, ...(preparing && policy.preload !== 'auto' ? { bufferingGoal: 1 } : {}) };
}
