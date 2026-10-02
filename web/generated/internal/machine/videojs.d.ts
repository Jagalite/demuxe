// SPDX-License-Identifier: Apache-2.0
export type VideojsHostLease = Readonly<{
    serial: number;
    owner: number | null;
    phase: 'free' | 'reserved' | 'attached' | 'retiring';
}>;
export type VideojsHostCommand = Readonly<{
    type: 'reserve';
}> | Readonly<{
    type: 'attach' | 'retire' | 'release';
    owner: number;
}>;
export declare function initialVideojsHostLease(): VideojsHostLease;
export declare function transitionVideojsHost(state: VideojsHostLease, command: VideojsHostCommand): Readonly<{
    state: VideojsHostLease;
    accepted: boolean;
    owner?: number;
}>;
export type VideojsState = Readonly<{
    retired: boolean;
    controlsReady: boolean;
    reflectedSource: number | null | undefined;
    errorSerial: number;
    errorId: number | null;
}>;
export type VideojsCommand = Readonly<{
    type: 'ready' | 'dispose' | 'error';
}> | Readonly<{
    type: 'source';
    sourceId: number | null;
}>;
export declare function initialVideojsState(): VideojsState;
export declare function transitionVideojs(state: VideojsState, command: VideojsCommand): Readonly<{
    state: VideojsState;
    accepted: boolean;
    clearError?: boolean;
    errorId?: number;
}>;
export declare function videojsSourceCurrent(state: VideojsState, sourceId: number | null): boolean;
