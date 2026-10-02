// SPDX-License-Identifier: Apache-2.0
import { type FfmpegOwnerState, type FfmpegOwnerInput, type FfmpegOwnerDecision } from './ffmpeg-owner.js';
export type FfmpegBridgeState = Readonly<{
    phase: 'ready' | 'closing' | 'closed' | 'failed';
    sourceSerial: number;
    handle: number;
    shutdown: Readonly<{
        id: number;
        deadline: number;
    }> | null;
    execution: FfmpegOwnerState;
    discard: boolean;
}>;
export declare function initialFfmpegBridge(): FfmpegBridgeState;
export declare function transitionFfmpegBridgeExecution(state: FfmpegBridgeState, input: FfmpegOwnerInput): Readonly<{
    state: FfmpegBridgeState;
    decision: FfmpegOwnerDecision;
}>;
export declare function beginFfmpegSource(state: FfmpegBridgeState): Readonly<{
    state: FfmpegBridgeState;
    id: number | null;
}>;
export declare function ffmpegSourceCurrent(state: FfmpegBridgeState, id: number): boolean;
export declare function setFfmpegHandle(state: FfmpegBridgeState, id: number, handle: number): FfmpegBridgeState;
export declare function detachFfmpegHandle(state: FfmpegBridgeState): FfmpegBridgeState;
export declare function beginFfmpegShutdown(state: FfmpegBridgeState, now: number, timeout: number): FfmpegBridgeState;
export declare function ffmpegShutdownRemaining(state: FfmpegBridgeState, id: number, now: number): number | null;
export declare function failFfmpegBridge(state: FfmpegBridgeState): FfmpegBridgeState;
export declare function finishFfmpegBridge(state: FfmpegBridgeState): FfmpegBridgeState;
