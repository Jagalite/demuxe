// SPDX-License-Identifier: Apache-2.0
import { type WaitState } from './async-policy.js';
/** Logical authority shared by the two packaged legacy native workers. */
export interface LegacyPlaybackWorkerState {
    readonly handshakeSerial: number;
    readonly handshakes: Readonly<Partial<Record<WorkerHandshakeKind, WaitState>>>;
    readonly demuxFormat: string;
    readonly seekPreroll: number;
    readonly decoderOutputWatchdog: boolean;
    readonly snapshot: Readonly<{
        id: number;
        source: number;
        capturing: boolean;
    }> | null;
    readonly gpuPauseIntent: boolean | null;
    readonly sourceRendered: number;
    readonly source: number;
    readonly opening: boolean;
    readonly ready: boolean;
    readonly initialized: boolean;
    readonly closing: boolean;
    readonly pumpFailed: boolean;
    readonly force: boolean;
    readonly paused: boolean;
    readonly busyUntil: number;
    readonly pendingTarget: number | null;
    readonly restarted: boolean;
    readonly position: number;
    readonly nextDiagnostics: number;
    readonly commandSerial: number;
    readonly commands: readonly Readonly<{
        id: number;
        source: number;
    }>[];
    readonly timerSerial: number;
    readonly timer: number | null;
}
export declare const initialLegacyPlaybackWorker: () => LegacyPlaybackWorkerState;
export type LegacyPlaybackWorkerEvent = {
    type: 'format';
    format: string;
    software: boolean;
} | {
    type: 'decoder-watchdog';
    enabled: boolean;
} | {
    type: 'gpu-lost';
} | {
    type: 'gpu-intent';
    paused: boolean;
} | {
    type: 'gpu-restored';
} | {
    type: 'frame-presented';
} | {
    type: 'ready';
} | {
    type: 'init';
} | {
    type: 'close';
} | {
    type: 'fail';
} | {
    type: 'invalidate';
} | {
    type: 'rendered';
} | {
    type: 'touch';
    now: number;
} | {
    type: 'pause';
    paused: boolean;
    now: number;
} | {
    type: 'seek';
    target: number;
} | {
    type: 'position';
    position: number;
} | {
    type: 'restart';
} | {
    type: 'seek-released';
} | {
    type: 'diagnostics';
    now: number;
};
export declare function reduceLegacyPlaybackWorker(s: LegacyPlaybackWorkerState, e: LegacyPlaybackWorkerEvent): LegacyPlaybackWorkerState;
export declare function legacySeekComplete(s: LegacyPlaybackWorkerState): boolean;
export declare function legacyPumpDelay(s: LegacyPlaybackWorkerState, now: number, extraWork?: boolean, activeDelay?: number): number;
export declare function admitLegacyCommand(s: LegacyPlaybackWorkerState): {
    state: LegacyPlaybackWorkerState;
    id: number | null;
};
export declare function finishLegacyCommand(s: LegacyPlaybackWorkerState, id: number): LegacyPlaybackWorkerState;
export declare function armLegacyPump(s: LegacyPlaybackWorkerState): {
    state: LegacyPlaybackWorkerState;
    id: number | null;
};
export declare function takeLegacyPump(s: LegacyPlaybackWorkerState, id: number): LegacyPlaybackWorkerState;
export declare function admitLegacySource(s: LegacyPlaybackWorkerState): {
    state: LegacyPlaybackWorkerState;
    id: number | null;
};
export declare function finishLegacySource(s: LegacyPlaybackWorkerState, id: number): LegacyPlaybackWorkerState;
export interface LegacyPCMState {
    readonly epoch: number;
    readonly forwarded: number;
}
export declare const initialLegacyPCM: () => LegacyPCMState;
export declare function planLegacyPCM(s: LegacyPCMState, epoch: number, ack: number, written: number, preserveFinalBatch?: boolean): {
    state: LegacyPCMState;
    kind: 'wait' | 'reset' | 'copy';
    count: number;
};
export declare function commitLegacyPCM(s: LegacyPCMState, epoch: number, written: number): LegacyPCMState;
export declare function legacyCommandCurrent(s: LegacyPlaybackWorkerState, id: number): boolean;
export declare function admitLegacySnapshot(s: LegacyPlaybackWorkerState, id: number): LegacyPlaybackWorkerState;
export declare function captureLegacySnapshot(s: LegacyPlaybackWorkerState): LegacyPlaybackWorkerState;
export declare function finishLegacySnapshot(s: LegacyPlaybackWorkerState, id: number, source: number): {
    state: LegacyPlaybackWorkerState;
    publish: boolean;
};
export type WorkerHandshakeKind = 'io-open' | 'io-close' | 'decoder' | 'threads';
export declare function beginLegacyHandshake(state: LegacyPlaybackWorkerState, kind: WorkerHandshakeKind, now: number): Readonly<{
    state: LegacyPlaybackWorkerState;
    wait: WaitState | null;
}>;
export declare function observeLegacyHandshake(state: LegacyPlaybackWorkerState, kind: WorkerHandshakeKind, id: number, event: 'ready' | 'failed' | 'deadline', now: number): Readonly<{
    state: LegacyPlaybackWorkerState;
    effect: 'ignore' | 'waiting' | 'ready' | 'reject' | 'fatal' | 'contain';
    deadline?: number;
}>;
export declare function legacyHandshakeAllowsMessages(state: LegacyPlaybackWorkerState, kind: WorkerHandshakeKind): boolean;
