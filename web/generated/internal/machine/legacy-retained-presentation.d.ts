// SPDX-License-Identifier: Apache-2.0
export type LegacyRetainedFrame = Readonly<{
    id: number;
    key: number;
}>;
export type LegacyRetainedRequest = Readonly<{
    id: number;
    key: number;
    deadline: number;
    scheduled: boolean;
    epoch: number;
}>;
export type LegacyRetainedPresentation = Readonly<{
    preroll: boolean;
    epoch: number;
    generation: number;
    minGeneration: number;
    minPts: number;
    selectedSerial: number;
    closed: boolean;
    serial: number;
    frames: readonly LegacyRetainedFrame[];
    held: LegacyRetainedFrame | null;
    pending: readonly LegacyRetainedRequest[];
    drawing: Readonly<{
        id: number;
        frame: number;
        redraw: boolean;
    }> | null;
    position: number | null;
    received: number;
    drawn: number;
    redraws: number;
    dropped: number;
    peakRetained: number;
    peakPending: number;
    missing: number;
}>;
export declare function initialLegacyRetainedPresentation(): LegacyRetainedPresentation;
export type LegacyRetainedInput = Readonly<{
    type: 'reset';
    target?: number;
    closed?: boolean;
    preroll?: boolean;
}> | Readonly<{
    type: 'receive';
    pts: number;
    generation: number;
    pendingTarget: number | null;
}> | Readonly<{
    type: 'select';
    serial: number;
    key: number;
    now: number;
    delay: number;
    redraw: boolean;
}> | Readonly<{
    type: 'schedule';
    key: number;
}> | Readonly<{
    type: 'draw';
    id: number;
    epoch: number;
    now: number;
}> | Readonly<{
    type: 'presented';
    id: number;
    epoch: number;
}> | Readonly<{
    type: 'check';
    now: number;
}>;
export type LegacyRetainedDecision = Readonly<{
    state: LegacyRetainedPresentation;
    accepted: boolean;
    close: readonly number[];
    cancel: readonly number[];
    accept?: number;
    discard?: boolean;
    request?: LegacyRetainedRequest;
    frame?: number;
    redraw?: number;
    drawing?: number;
    error?: string;
}>;
export declare function legacyRetainedNeedsPump(state: LegacyRetainedPresentation): boolean;
export declare function legacyRetainedRequestCurrent(state: LegacyRetainedPresentation, id: number, epoch: number): boolean;
export declare function transitionLegacyRetainedPresentation(state: LegacyRetainedPresentation, input: LegacyRetainedInput): LegacyRetainedDecision;
