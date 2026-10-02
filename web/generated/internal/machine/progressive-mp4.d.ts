// SPDX-License-Identifier: Apache-2.0
export declare function fragmentSamples(moof: Uint8Array, mdatSize: number): number[];
export type ProgressiveMP4State = Readonly<{
    phase: 'pending' | 'active' | 'rejected' | 'failed';
    minimum: number;
    batch: number;
    length: number;
    received: number;
    copiedBytes: number;
    emittedBytes: number;
    parts: number;
    total: number | null;
    position: number | null;
    ends: readonly number[];
}>;
export type ProgressiveMP4Decision = Readonly<{
    state: ProgressiveMP4State;
    emit: number;
    required: number;
}>;
export declare function initialProgressiveMP4(minimum?: number, batch?: number): ProgressiveMP4State;
export declare function appendProgressiveMP4(state: ProgressiveMP4State, bytes: number): ProgressiveMP4State;
/** Consume only bounded header observations; byte storage and output callbacks stay outside. */
export declare function inspectProgressiveMP4(state: ProgressiveMP4State, header: Uint8Array): ProgressiveMP4Decision;
/** Advance represented sample position before handing physical bytes to a callback. */
export declare function advanceProgressiveMP4(state: ProgressiveMP4State): ProgressiveMP4Decision;
export declare function progressiveMP4BudgetError(state: ProgressiveMP4State): string | null;
export declare function copyProgressiveMP4(state: ProgressiveMP4State, bytes: number): ProgressiveMP4State;
export declare function failProgressiveMP4(state: ProgressiveMP4State): ProgressiveMP4State;
export declare function finishProgressiveMP4(state: ProgressiveMP4State, tail: Uint8Array): ProgressiveMP4Decision & Readonly<{
    active: boolean;
}>;
