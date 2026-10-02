// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, AudioOutput } from '../../types.js';
export type WasmTiming = Readonly<{
    latencyUs: number;
    running: boolean;
}>;
export type WasmSettings = Readonly<{
    buffering: BufferingPolicy;
    bufferingSettings: Readonly<Record<string, string>>;
    volume: number;
    gain: number;
    decoderOutput: boolean;
    timing: WasmTiming | null;
}>;
export declare const cloneWasmBuffering: (policy: BufferingPolicy) => BufferingPolicy;
export declare function createWasmSettings(decoderOutput?: boolean): WasmSettings;
export type WasmSettingInput = Readonly<{
    kind: 'buffer-policy';
    policy: BufferingPolicy;
} | {
    kind: 'buffer-setting';
    key: string;
    value: string;
} | {
    kind: 'volume';
    value: number;
} | {
    kind: 'gain';
    value: number;
} | {
    kind: 'watchdog';
    decoderOutput: boolean;
} | {
    kind: 'timing';
    latencyUs: number;
    running: boolean;
    force: boolean;
}>;
export declare function validWasmVolume(value: number): boolean;
export declare function validWasmGain(value: number): boolean;
export declare function effectiveWasmGain(state: WasmSettings, gain?: number): number;
export declare function planWasmGain(state: WasmSettings, value: number, hasStage: boolean): Readonly<{
    valid: boolean;
    createStage: boolean;
    effective: number;
}>;
export declare function updateWasmSettings(state: WasmSettings, input: WasmSettingInput): Readonly<{
    state: WasmSettings;
    accepted: boolean;
    send: boolean;
}>;
export declare function planWasmBuffering(state: WasmSettings, input: Readonly<{
    kind: 'configure';
    preparing: boolean;
} | {
    kind: 'update';
    policy: BufferingPolicy;
    paused: boolean;
}>): Readonly<Record<string, string>>;
export declare function planWasmAudioOutput(requested: AudioOutput, available: number, fallback: 'stereo' | 'reject'): Readonly<{
    channels: number;
    unavailable: boolean;
}>;
