// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy } from '../../types.js';
export type NativeControlDomain = 'playback' | 'gain' | 'volume' | 'rate' | 'output' | 'buffering';
export type NativeControlRequest = Readonly<{
    id: number;
    epoch: number;
    kind: 'control';
    domain: NativeControlDomain;
}>;
export type NativeControls = Readonly<{
    pending: Readonly<Partial<Record<NativeControlDomain, NativeControlRequest>>>;
    activation: Readonly<Partial<Record<NativeControlDomain, Readonly<{
        id: number;
        deadline: number;
    }>>>>;
    sink: Readonly<{
        active: NativeControlRequest | null;
        queued: readonly NativeControlRequest[];
    }>;
    paused: boolean;
    playbackSerial: number;
    gain: number;
    volume: number;
    rate: number;
    outputDevice: string;
    buffering: BufferingPolicy;
}>;
export type NativeControlValue = Readonly<{
    type: 'gain' | 'volume' | 'rate';
    value: number;
}> | Readonly<{
    type: 'output';
    value: string;
}> | Readonly<{
    type: 'buffering';
    value: BufferingPolicy;
}>;
export declare function initialNativeControls(buffering?: BufferingPolicy): NativeControls;
export declare function nativeControlCurrent(state: NativeControls, request: NativeControlRequest): boolean;
export declare function beginNativeControl(state: NativeControls, request: NativeControlRequest, paused?: boolean): NativeControls;
export declare function retireNativeControls(state: NativeControls): NativeControls;
export declare function finishNativeControl(state: NativeControls, request: NativeControlRequest): NativeControls;
export declare function acceptNativeControl(state: NativeControls, request: NativeControlRequest, change: NativeControlValue): NativeControls;
export declare function selectNativeGain(value: number, facts: Readonly<{
    selective: boolean;
    graph: boolean;
    paused: boolean;
    outputDevice: string;
}>): Readonly<{
    error?: string;
    selective: boolean;
    createGraph: boolean;
    resume: boolean;
    selectOutput: boolean;
}>;
export declare function beginNativeActivation(state: NativeControls, request: NativeControlRequest, now: number): NativeControls;
export declare function nativeActivationRemaining(state: NativeControls, request: NativeControlRequest, now: number): number | undefined;
export declare function nativeGainOutputWait(state: NativeControls, request: NativeControlRequest): number | undefined;
export declare function queueNativeSink(state: NativeControls, request: NativeControlRequest): Readonly<{
    state: NativeControls;
    accepted: boolean;
    start?: NativeControlRequest;
}>;
export declare function finishNativeSink(state: NativeControls, request: NativeControlRequest): Readonly<{
    state: NativeControls;
    accepted: boolean;
    start?: NativeControlRequest;
}>;
