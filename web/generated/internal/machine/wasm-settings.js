// SPDX-License-Identifier: Apache-2.0
import { mpvBufferingOptions } from './buffering-policy.js';
export const cloneWasmBuffering = (policy) => Object.freeze({ ...policy });
export function createWasmSettings(decoderOutput = true) { return Object.freeze({ buffering: Object.freeze({ preload: 'auto', profile: 'balanced' }), bufferingSettings: Object.freeze({}), volume: 100, gain: 1, decoderOutput, timing: null }); }
export function validWasmVolume(value) { return Number.isFinite(value) && value >= 0 && value <= 100; }
export function validWasmGain(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }
export function effectiveWasmGain(state, gain = state.gain) { return state.volume === 0 ? 0 : gain; }
export function planWasmGain(state, value, hasStage) { return Object.freeze({ valid: validWasmGain(value), createStage: !hasStage && value !== 1, effective: effectiveWasmGain(state, value) }); }
export function updateWasmSettings(state, input) {
    if (input.kind === 'volume' || input.kind === 'gain') {
        if (!(input.kind === 'volume' ? validWasmVolume(input.value) : validWasmGain(input.value)))
            return Object.freeze({ state, accepted: false, send: false });
        return Object.freeze({ state: Object.freeze({ ...state, [input.kind]: input.value }), accepted: true, send: false });
    }
    if (input.kind === 'buffer-policy')
        return Object.freeze({ state: Object.freeze({ ...state, buffering: cloneWasmBuffering(input.policy) }), accepted: true, send: false });
    if (input.kind === 'buffer-setting')
        return Object.freeze({ state: Object.freeze({ ...state, bufferingSettings: Object.freeze({ ...state.bufferingSettings, [input.key]: input.value }) }), accepted: true, send: false });
    if (input.kind === 'watchdog')
        return Object.freeze({ state: Object.freeze({ ...state, decoderOutput: input.decoderOutput }), accepted: true, send: true });
    const unchanged = state.timing?.latencyUs === input.latencyUs && state.timing.running === input.running;
    return unchanged && !input.force ? Object.freeze({ state, accepted: true, send: false }) : Object.freeze({ state: Object.freeze({ ...state, timing: Object.freeze({ latencyUs: input.latencyUs, running: input.running }) }), accepted: true, send: true });
}
export function planWasmBuffering(state, input) {
    if (input.kind === 'configure')
        return Object.freeze({ ...mpvBufferingOptions(state.buffering, input.preparing) });
    return Object.freeze({ ...mpvBufferingOptions(input.policy, input.paused), 'cache-secs': input.policy.preload === 'auto' || !input.paused ? '3600000' : '1' });
}
export function planWasmAudioOutput(requested, available, fallback) {
    const wanted = requested === 'auto' ? (available >= 8 ? 8 : available >= 6 ? 6 : 2) : requested === '7.1' ? 8 : requested === '5.1' ? 6 : 2;
    return Object.freeze({ channels: wanted <= available ? wanted : 2, unavailable: wanted > available && fallback === 'reject' });
}
