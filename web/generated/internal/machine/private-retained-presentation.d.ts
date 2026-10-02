// SPDX-License-Identifier: Apache-2.0
export type RetainedFrame = Readonly<{
    id: number;
    timestamp: number;
    nativeId: number | null;
}>;
export type RetainedPending = Readonly<{
    serial: number;
    frame: number;
    due: number;
}>;
export type PrivateRetainedPresentationState = Readonly<{
    generation: number;
    serial: number;
    awaiting: boolean;
    epoch: number;
    frameSerial: number;
    seekTarget: number | null;
    seekGeneration: number | null;
    frames: readonly RetainedFrame[];
    held: RetainedFrame | null;
    pending: RetainedPending | null;
    selectionSerial: number;
    preparing: Readonly<{
        id: number;
        frame: number;
        serial: number;
        delay: number;
    }> | null;
    received: number;
    presented: number;
    closed: number;
    dropped: number;
    peakFrames: number;
    nativeReleased: number;
}>;
export declare function createPrivateRetainedPresentation(): PrivateRetainedPresentationState;
export declare function clearRetainedPresentation(state: PrivateRetainedPresentationState, target?: number | null, generation?: number): Readonly<{
    state: PrivateRetainedPresentationState;
    close: readonly number[];
}>;
/** Backpressure applies only to a new retained owner. Stale/preroll frames may
 * still be consumed and discarded; invalid/colliding frames keep explicit errors. */
export declare function canReceiveRetainedFrame(state: PrivateRetainedPresentationState, timestamp: number, generation: number): boolean;
export type RetainedFrameAdmission = Readonly<{
    state: PrivateRetainedPresentationState;
    id: number | null;
    close: readonly number[];
    closeInput: boolean;
    clearOverlay: boolean;
    error: string | null;
}>;
export declare function admitRetainedFrame(state: PrivateRetainedPresentationState, timestamp: number, generation: number, nativeId?: number | null): RetainedFrameAdmission;
/** Native final-unref proves that an unselected timing frame cannot be selected
 * later. Keep held/pending output for redraw until normal selection retires it. */
export declare function releaseRetainedNativeFrame(state: PrivateRetainedPresentationState, generation: number, nativeId: number): Readonly<{
    state: PrivateRetainedPresentationState;
    close: readonly number[];
}>;
/** Failed physical ingress returns the input to its caller without closing it. */
export declare function returnRetainedFrame(state: PrivateRetainedPresentationState, id: number): PrivateRetainedPresentationState;
export declare function retainedFrameCurrent(state: PrivateRetainedPresentationState, id: number): boolean;
export type RetainedSelection = Readonly<{
    epoch: number;
    pts: number;
    delay: number;
    serial: number;
}>;
export declare function selectRetainedFrame(state: PrivateRetainedPresentationState, input: RetainedSelection): Readonly<{
    state: PrivateRetainedPresentationState;
    frame: number | null;
    close: readonly number[];
    error: string | null;
}>;
export declare function armRetainedDraw(state: PrivateRetainedPresentationState, id: number, now: number): Readonly<{
    state: PrivateRetainedPresentationState;
    accepted: boolean;
}>;
export declare function beginRetainedDraw(state: PrivateRetainedPresentationState, now: number): Readonly<{
    state: PrivateRetainedPresentationState;
    pending: RetainedPending | null;
}>;
export declare function finishRetainedDraw(state: PrivateRetainedPresentationState, epoch: number): PrivateRetainedPresentationState;
