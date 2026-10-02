// SPDX-License-Identifier: Apache-2.0
import { type BackendRequests, type BackendRequestAdmission } from './backend-requests.js';
export type NativeSubtitleLifetime = Readonly<{
    epoch: number;
    requests: BackendRequests;
    initialization: number | null;
    closeDeadline: number | null;
    acknowledged: boolean;
}>;
export declare function initialNativeSubtitleLifetime(): NativeSubtitleLifetime;
export declare function nativeSubtitleCurrent(state: NativeSubtitleLifetime, epoch: number): boolean;
export declare function startNativeSubtitleInitialization(state: NativeSubtitleLifetime, now: number): NativeSubtitleLifetime;
export declare function finishNativeSubtitleInitialization(state: NativeSubtitleLifetime, epoch: number): NativeSubtitleLifetime;
export declare function nativeSubtitleInitializationRemaining(state: NativeSubtitleLifetime, epoch: number, now: number): number | undefined;
export declare function admitNativeSubtitleRequest(state: NativeSubtitleLifetime, op: string, now: number): Readonly<{
    state: NativeSubtitleLifetime;
    effect: BackendRequestAdmission['effect'];
}>;
export declare function settleNativeSubtitleRequest(state: NativeSubtitleLifetime, id: number): Readonly<{
    state: NativeSubtitleLifetime;
    accepted: boolean;
}>;
export declare function nativeSubtitleRequestRemaining(state: NativeSubtitleLifetime, id: number, now: number): number | undefined;
export declare function closeNativeSubtitleLifetime(state: NativeSubtitleLifetime, now: number, failed?: boolean): Readonly<{
    state: NativeSubtitleLifetime;
    reject: readonly number[];
    notify: boolean;
}>;
export declare function nativeSubtitleCloseRemaining(state: NativeSubtitleLifetime, now: number): number | undefined;
export declare function finishNativeSubtitleClose(state: NativeSubtitleLifetime): NativeSubtitleLifetime;
export declare function acknowledgeNativeSubtitleClose(state: NativeSubtitleLifetime): NativeSubtitleLifetime;
