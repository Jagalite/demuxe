// SPDX-License-Identifier: Apache-2.0
export interface LegacyDecoderWorkerState {
    readonly initialized: boolean;
    readonly closed: boolean;
    readonly generation: number;
    readonly serial: number;
    readonly busy: Readonly<{
        id: number;
        ticket: number;
    }> | null;
    readonly frameSerial: number;
    readonly frames: readonly number[];
    readonly needsKey: boolean;
    readonly shared: boolean;
    readonly draining: boolean;
    readonly flushed: boolean;
    readonly failure: string | null;
    readonly decoderTimeout: boolean;
    readonly submitted: number;
    readonly consumed: number;
    readonly outputWaitSince: number | null;
    readonly watchdog: boolean;
    readonly disabled: boolean;
    readonly faultAfter: number;
}
export declare const initialLegacyDecoderWorker: () => LegacyDecoderWorkerState;
export type LegacyDecoderEvent = {
    type: 'init';
    disabled: boolean;
    watchdog: boolean;
    faultAfter: number;
} | {
    type: 'cancel';
} | {
    type: 'reset';
} | {
    type: 'configure';
} | {
    type: 'watchdog';
    enabled: boolean;
} | {
    type: 'shared-unsupported';
} | {
    type: 'submitted';
} | {
    type: 'delivered';
} | {
    type: 'drain';
} | {
    type: 'flushed';
    generation: number;
} | {
    type: 'failed';
    generation: number;
    error: string;
};
export declare function reduceLegacyDecoderWorker(s: LegacyDecoderWorkerState, e: LegacyDecoderEvent): LegacyDecoderWorkerState;
export declare function admitLegacyDecoderWork(s: LegacyDecoderWorkerState, ticket: number): {
    state: LegacyDecoderWorkerState;
    id: number | null;
};
export declare function finishLegacyDecoderWork(s: LegacyDecoderWorkerState, id: number): LegacyDecoderWorkerState;
export declare function legacyDecoderCurrent(s: LegacyDecoderWorkerState, generation: number): boolean;
export declare function admitLegacyDecoderFrame(s: LegacyDecoderWorkerState, generation: number): {
    state: LegacyDecoderWorkerState;
    id: number | null;
    overflow: boolean;
};
export declare function takeLegacyDecoderFrame(s: LegacyDecoderWorkerState): {
    state: LegacyDecoderWorkerState;
    id: number | null;
};
export declare function legacyDecoderPacketAdmission(s: LegacyDecoderWorkerState, queued: number): boolean;
export declare function observeLegacyDecoderWait(s: LegacyDecoderWorkerState, queued: number, now: number): LegacyDecoderWorkerState;
