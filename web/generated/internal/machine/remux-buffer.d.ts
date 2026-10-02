// SPDX-License-Identifier: Apache-2.0
/** MSE transaction metadata. The enclosing RemuxLifecycle owns generation authority. */
export type RemuxBufferResource = Readonly<{
    id: number;
    lane: number;
    bytes: number;
}>;
export type RemuxBufferUpdate = Readonly<{
    id: number;
    lane: number;
    kind: 'append' | 'remove';
    bytes: number;
    initialization: boolean;
    started: number;
}>;
export type RemuxBufferSegment = RemuxBufferUpdate & Readonly<{
    end: number;
}>;
export type RemuxBufferState = Readonly<{
    pullSerial: number;
    pull: number | null;
    resourceSerial: number;
    updateSerial: number;
    delivery: readonly RemuxBufferResource[];
    pending: readonly RemuxBufferResource[] | null;
    updates: readonly RemuxBufferUpdate[];
    segments: readonly RemuxBufferSegment[];
    busy: boolean;
    eof: boolean;
    headerAccepted: boolean;
    initAccepted: boolean;
    mediaAccepted: boolean;
}>;
export type RemuxBufferCommand = Readonly<{
    type: 'pull';
}> | Readonly<{
    type: 'part';
    pullId: number;
    bytes: number;
    updating?: boolean;
}> | Readonly<{
    type: 'fragment';
    pullId: number;
    parts: readonly number[];
    buffers: readonly number[];
    more: boolean;
    updating: boolean;
}> | Readonly<{
    type: 'header';
}> | Readonly<{
    type: 'take-delivery';
}> | Readonly<{
    type: 'take-pending';
}> | Readonly<{
    type: 'append';
    entries: readonly Readonly<{
        lane: number;
        bytes: number;
    }>[];
    initialization: boolean;
    now: number;
}> | Readonly<{
    type: 'remove';
    lane: number;
    cut: number;
    now: number;
    allLanes: boolean;
}> | Readonly<{
    type: 'updated';
    id: number;
    lane: number;
    end: number;
    now: number;
    updating: boolean;
}> | Readonly<{
    type: 'busy';
    value: boolean;
}>;
export type RemuxBufferDecision = Readonly<{
    state: RemuxBufferState;
    accepted: boolean;
    error?: string;
    pullId?: number;
    resources?: readonly RemuxBufferResource[];
    parts?: readonly RemuxBufferResource[];
    buffers?: readonly RemuxBufferResource[];
    updates?: readonly RemuxBufferUpdate[];
    latency?: number;
}>;
export declare function initialRemuxBuffer(): RemuxBufferState;
export declare function resetRemuxBuffer(state: RemuxBufferState, busy?: boolean, clearEvidence?: boolean): RemuxBufferState;
export declare function transitionRemuxBuffer(state: RemuxBufferState, command: RemuxBufferCommand): RemuxBufferDecision;
