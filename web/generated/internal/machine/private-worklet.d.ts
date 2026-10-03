// SPDX-License-Identifier: Apache-2.0
export type PrivateWorkletState = Readonly<{
    phase: 'active' | 'stopped' | 'failed';
    connected: boolean;
    epoch: number;
    capacity: number;
    channels: number;
    running: boolean;
    recording: boolean;
    error: string | null;
    stale: number;
    maxQueued: number;
}>;
export type PrivateWorkletMessage = Readonly<{
    object: boolean;
    type: string | null;
    epoch: number;
    capacity: number | null;
    channels: number | null;
    running: boolean | null;
    buffer: boolean;
    bytes: number;
    finite: boolean;
    start: number;
}>;
export type PrivateWorkletEffect = 'none' | 'error' | 'stop' | 'reset' | 'append';
export type PrivateWorkletDecision = Readonly<{
    state: PrivateWorkletState;
    effect: PrivateWorkletEffect;
    frames?: number;
}>;
export declare const privateWorkletCaptureLimit = 2000000;
export declare function initialPrivateWorklet(): PrivateWorkletState;
export declare function failPrivateWorklet(state: PrivateWorkletState, error: string): PrivateWorkletDecision;
export declare function connectPrivateWorklet(state: PrivateWorkletState): Readonly<{
    state: PrivateWorkletState;
    accepted: boolean;
    error?: string;
}>;
export declare function recordPrivateWorklet(state: PrivateWorkletState): PrivateWorkletState;
export declare function stopPrivateWorkletRecording(state: PrivateWorkletState): PrivateWorkletState;
export declare function inspectPrivateWorkletPCM(state: PrivateWorkletState, input: PrivateWorkletMessage): boolean;
export declare function receivePrivateWorklet(state: PrivateWorkletState, input: PrivateWorkletMessage, read: number, written: number): PrivateWorkletDecision;
export declare function privateWorkletFrames(state: PrivateWorkletState, read: number, written: number, quantum: number, channels: number): number;
export declare function privateWorkletUnderrun(state: PrivateWorkletState, frames: number, quantum: number): boolean;
export declare function privateWorkletCaptureFits(state: PrivateWorkletState, captured: number, frames: number, limit?: number): boolean;
