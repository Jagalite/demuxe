// SPDX-License-Identifier: Apache-2.0
export type WasmSeek = Readonly<{
    id: number;
    target: number;
    restarted: boolean;
    eof: boolean;
    clamped?: number;
}>;
export type WasmSeekState = Readonly<{
    nextId: number;
    seek: WasmSeek | null;
}>;
export declare function createWasmSeek(): WasmSeekState;
export declare function beginWasmSeek(state: WasmSeekState, target: number): Readonly<{
    state: WasmSeekState;
    accepted: boolean;
}>;
export declare function clearWasmSeek(state: WasmSeekState): WasmSeekState;
export type WasmSeekObservation = Readonly<{
    kind: 'restart' | 'cache';
    eof: boolean;
} | {
    kind: 'position';
    position: number;
}>;
export declare function observeWasmSeek(state: WasmSeekState, event: WasmSeekObservation): WasmSeekState;
/** A stable seek ID survives immutable observation updates, but never a replacement seek. */
export declare function confirmWasmSeek(state: WasmSeekState, id: number, target: number, position: number, settled: boolean): Readonly<{
    state: WasmSeekState;
    confirmed: boolean;
}>;
export declare function wasmSeekBoundary(state: WasmSeekState, target: number): number | undefined;
