// SPDX-License-Identifier: Apache-2.0
import { resolveDecodePolicy, mpvDecoderOptions, nextAdaptiveState, supportsEmergencyFrameDrop, adaptiveDecodeSignal } from './decode-policy.js';
const policy = (value) => Object.freeze({ ...value, shortcuts: Object.freeze([...value.shortcuts]), ffmpegOptions: Object.freeze({ ...value.ffmpegOptions }) });
export function initialLegacyAdaptiveDecode(input, enabled = false, value = resolveDecodePolicy(input)) { return Object.freeze({ input: Object.freeze({ ...input }), policy: policy(value), enabled, retired: false, reason: enabled ? 'Waiting for sustained decoder pressure' : 'disabled', sampleAt: 0, sampleDecoderDrops: 0, sampleFrameDrops: 0, samplePosition: 0, streak: 0, direction: '', cooldown: 0, serial: 0, decoderDrops: 0, frameDrops: 0, avsync: 0, pausedForCache: false, speed: 1, switching: null }); }
export function transitionLegacyAdaptiveDecode(state, input) {
    const result = (next = state, accepted = true, request) => Object.freeze({ state: next, accepted, ...request ? { request } : {} });
    const patch = (value) => Object.freeze({ ...state, ...value });
    if (input.type === 'retire')
        return result(state.retired ? state : patch({ retired: true, switching: null }));
    if (state.retired)
        return result(state, false);
    if (input.type === 'reset')
        return result(patch({ switching: null, sampleAt: input.now, samplePosition: input.position, sampleDecoderDrops: state.decoderDrops, sampleFrameDrops: state.frameDrops, streak: 0, direction: '', cooldown: 0, reason: state.enabled ? 'Waiting for sustained decoder pressure' : 'disabled' }));
    if (input.type === 'finish') {
        if (state.switching?.id !== input.id)
            return result(state, false);
        return result(patch({ policy: input.success ? state.switching.policy : state.policy, reason: input.success ? state.switching.reason : 'Adaptive decoder configuration failed', switching: null }));
    }
    if (input.type === 'observe') {
        const number = Number(input.value) || 0;
        if (input.name === 'decoder-frame-drop-count')
            return result(patch({ decoderDrops: number }));
        if (input.name === 'frame-drop-count')
            return result(patch({ frameDrops: number }));
        if (input.name === 'avsync')
            return result(patch({ avsync: number }));
        if (input.name === 'paused-for-cache')
            return result(patch({ pausedForCache: !!input.value }));
        if (input.name === 'speed' && number > 0)
            return result(patch({ speed: number, sampleAt: input.now, samplePosition: input.position, sampleDecoderDrops: state.decoderDrops, sampleFrameDrops: state.frameDrops, streak: 0, direction: '' }));
        if (input.name === 'video-codec' && state.policy.codec === 'unknown' && input.value) {
            const label = String(input.value).toLowerCase(), codec = label.includes('h.264') ? 'h264' : label.includes('hevc') || label.includes('h.265') ? 'hevc' : label.includes('mpeg-4 part 2') ? 'mpeg4' : label.includes('mpeg-2') ? 'mpeg2video' : label.includes('mpeg-1') ? 'mpeg1video' : label.includes('av1') ? 'av1' : label.includes('mjpeg') || label.includes('motion jpeg') ? 'mjpeg' : label;
            return result(patch({ input: Object.freeze({ ...state.input, codec }), policy: policy({ ...state.policy, codec }) }));
        }
        return result(state, false);
    }
    if (!state.enabled || state.switching || input.now < state.cooldown || input.now - state.sampleAt < 2000)
        return result(state, false);
    const decoderDrops = Math.max(0, state.decoderDrops - state.sampleDecoderDrops), frameDrops = Math.max(0, state.frameDrops - state.sampleFrameDrops), advance = input.position - state.samplePosition;
    const sampled = patch({ sampleAt: input.now, sampleDecoderDrops: state.decoderDrops, sampleFrameDrops: state.frameDrops, samplePosition: input.position });
    if (!state.sampleAt || input.paused || state.pausedForCache || input.pendingTarget !== null)
        return result(Object.freeze({ ...sampled, streak: 0 }));
    if (!supportsEmergencyFrameDrop(state.policy.codec))
        return result(Object.freeze({ ...sampled, reason: 'Codec has no qualified emergency frame skip' }));
    const { pressure, recovered } = adaptiveDecodeSignal({ elapsedSeconds: (input.now - state.sampleAt) / 1000, playbackSpeed: state.speed, advance, decoderDrops, presentationDrops: frameDrops, avsync: state.avsync });
    const direction = pressure ? 'pressure' : recovered ? 'recovery' : '', streak = direction && direction === state.direction ? state.streak + 1 : direction ? 1 : 0;
    let next = nextAdaptiveState(state.policy.adaptiveState, state.policy.codec, pressure, recovered, streak);
    if (pressure && next === 'reduced-reconstruction' && state.policy.skipLoopFilter === 'noref')
        next = 'drop-non-reference';
    const progressed = Object.freeze({ ...sampled, direction, streak });
    if (next === state.policy.adaptiveState)
        return result(progressed);
    const candidate = policy(resolveDecodePolicy({ ...state.input, adaptiveState: next }));
    if (mpvDecoderOptions(candidate) === mpvDecoderOptions(state.policy))
        return result(Object.freeze({ ...progressed, policy: candidate, reason: 'Recovered to the requested reconstruction profile', streak: 0 }));
    if (!Number.isSafeInteger(state.serial + 1))
        return result(Object.freeze({ ...progressed, reason: 'Adaptive identity exhausted' }), false);
    const id = state.serial + 1, reason = pressure ? `Sustained decode pressure: ${decoderDrops} decoder drops, ${frameDrops} presentation drops, A/V offset ${state.avsync.toFixed(3)} s` : 'Sustained recovery with synchronized playback';
    return result(Object.freeze({ ...progressed, streak: 0, cooldown: input.now + 10000, serial: id, switching: Object.freeze({ id, policy: candidate, reason }) }), true, Object.freeze({ id, options: mpvDecoderOptions(candidate) }));
}
