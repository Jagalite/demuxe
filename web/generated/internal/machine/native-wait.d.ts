// SPDX-License-Identifier: Apache-2.0
export type NativeEventRequest = Readonly<{
    id: number;
    epoch: number;
    kind: 'event';
}>;
export type NativeEventWait = Readonly<{
    request: NativeEventRequest;
    event: string;
    loading: boolean;
    budget: number;
    deadline: number;
}>;
export declare function beginNativeEventWait(request: NativeEventRequest, event: string, now: number, loadBudget: number): NativeEventWait;
export declare function nativeEventWaitCurrent(waits: readonly NativeEventWait[], request: NativeEventRequest): boolean;
export declare function nativeEventWaitDeadline(waits: readonly NativeEventWait[], request: NativeEventRequest, now: number): Readonly<{
    remaining?: number;
    event?: string;
    loading?: boolean;
    budget?: number;
}> | undefined;
