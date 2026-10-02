// SPDX-License-Identifier: Apache-2.0
const MiB = 1024 * 1024;
export function resolveBuffering(policy, backend) {
    const base = { ...(policy.aheadSeconds === undefined ? {} : { requestedAheadSeconds: policy.aheadSeconds }), ...(policy.behindSeconds === undefined ? {} : { requestedBehindSeconds: policy.behindSeconds }), ...(policy.memoryBudget === undefined ? {} : { requestedMemoryBudget: policy.memoryBudget }), requestedProfile: policy.profile, preload: policy.preload, backend, control: backend === 'browser' ? 'hint' : 'profile' };
    if (backend === 'browser')
        return { ...base, notes: ['Browser owns buffering and eviction; profiles, time targets and memoryBudget are not enforceable.', 'Explicit open performs metadata discovery even with preload none.'] };
    if (backend === 'shaka')
        return { ...base, ...(policy.aheadSeconds === undefined ? {} : { forwardSeconds: policy.aheadSeconds }), ...(policy.behindSeconds === undefined ? {} : { backwardSeconds: policy.behindSeconds }), notes: ['Shaka owns ABR, segment scheduling and eviction; memoryBudget is not enforceable.', 'Explicit open prepares a playable segment; none and metadata limit speculative preload, not manifest discovery.'] };
    if (backend === 'remux')
        return { ...base, forwardSeconds: policy.aheadSeconds ?? (policy.profile === 'low-latency' ? 2 : policy.profile === 'resilient' ? 10 : 5), backwardSeconds: policy.behindSeconds ?? (policy.profile === 'low-latency' ? 1 : 3), forwardLimitBytes: Math.min(policy.memoryBudget ?? 12 * MiB, 12 * MiB), notes: ['Byte ceiling applies to coded data accounting; one bounded fragment and browser decoder resources are additional.', 'Forward time grows above 1x playback while playing; slower playback retains the base target and paused preload is bounded.'] };
    const target = (policy.profile === 'low-latency' ? 10 : policy.profile === 'resilient' ? 56 : 40) * MiB;
    const total = Math.min(policy.memoryBudget ?? target, target);
    const back = Math.min(policy.profile === 'low-latency' ? 2 * MiB : 8 * MiB, Math.floor(total / 5));
    return { ...base, cache: true, forwardLimitBytes: total - back, backwardLimitBytes: back, notes: ['Time targets are not applied by the mpv adapter; packet byte budgets control readahead. Packet budgets are mpv limits, not a whole-player memory cap. Packet granularity and unused-forward donation can affect actual history.', 'Source byte cache, decoded frames, audio and Wasm linear memory are separate.', 'Explicit open prepares metadata and initial output; none and metadata limit speculative readahead.'] };
}
export function mpvBufferingOptions(policy, preparing = true) {
    const resolved = resolveBuffering(policy, 'mpv');
    return { cache: 'yes', 'demuxer-max-bytes': String(resolved.forwardLimitBytes), 'demuxer-max-back-bytes': String(resolved.backwardLimitBytes),
        // Bundled mpv 0.40 default. Do not override refill, hysteresis or seek policy.
        ...(policy.preload !== 'auto' ? { 'cache-secs': preparing ? '1' : '3600000' } : {}) };
}
export function shakaBufferingOptions(policy, preparing = true) {
    const profile = policy.profile === 'low-latency' ? { bufferingGoal: 3, bufferBehind: 3 } : policy.profile === 'resilient' ? { bufferingGoal: 30 } : {};
    return { ...profile, ...(policy.aheadSeconds === undefined ? {} : { bufferingGoal: policy.aheadSeconds }), ...(policy.behindSeconds === undefined ? {} : { bufferBehind: policy.behindSeconds }), ...(preparing && policy.preload !== 'auto' ? { bufferingGoal: 1 } : {}) };
}
