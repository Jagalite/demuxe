// SPDX-License-Identifier: Apache-2.0
export type ShakaRuntimeLoad = Readonly<{
    id: number;
    key: string;
    phase: 'pending' | 'ready' | 'failed';
    deadline: number;
    acquiring: boolean;
    consumers: readonly number[];
}>;
export type ShakaRuntimeState = Readonly<{
    nextLoad: number;
    nextConsumer: number;
    loads: readonly ShakaRuntimeLoad[];
}>;
export declare function createShakaRuntime(): ShakaRuntimeState;
export declare function joinShakaRuntime(state: ShakaRuntimeState, key: string, now: number): Readonly<{
    state: ShakaRuntimeState;
    accepted: false;
    error: string;
}> | Readonly<{
    state: ShakaRuntimeState;
    accepted: true;
    load: number;
    consumer: number;
    start: boolean;
}>;
export declare function shakaRuntimeLoad(state: ShakaRuntimeState, id: number): ShakaRuntimeLoad | undefined;
export declare function leaveShakaRuntime(state: ShakaRuntimeState, id: number, consumer: number): Readonly<{
    state: ShakaRuntimeState;
    accepted: boolean;
    cancel: boolean;
}>;
export declare function finishShakaRuntime(state: ShakaRuntimeState, id: number, success: boolean): Readonly<{
    state: ShakaRuntimeState;
    accepted: boolean;
}>;
export declare function shakaRuntimeDeadline(state: ShakaRuntimeState, id: number, now: number): Readonly<{
    current: boolean;
    remaining: number;
}>;
export declare function acquireShakaRuntime(state: ShakaRuntimeState, id: number): ShakaRuntimeState;
export declare function releaseShakaRuntimeAcquisition(state: ShakaRuntimeState, id: number): ShakaRuntimeState;
