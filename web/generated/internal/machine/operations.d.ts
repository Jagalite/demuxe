// SPDX-License-Identifier: Apache-2.0
import type { OperationKind, PendingOperation } from '../../types.js';
export type OperationEntry = Readonly<{
    id: number;
    epoch: number;
    kind: OperationKind | null;
    cancelled: boolean;
    phase: 'queued' | 'active' | 'finished';
}>;
export type OperationState = Readonly<{
    serial: number;
    epoch: number;
    terminal: boolean;
    entries: readonly OperationEntry[];
    active: number | null;
}>;
export type OperationInput = Readonly<{
    type: 'operation.admit';
    kind: OperationKind | null;
}> | Readonly<{
    type: 'operation.start' | 'operation.cancel' | 'operation.finish' | 'operation.release';
    id: number;
}> | Readonly<{
    type: 'operation.name';
    id: number;
    kind: OperationKind;
}> | Readonly<{
    type: 'operation.retire';
    terminal: boolean;
}>;
export type OperationDecision = Readonly<{
    state: OperationState;
    id?: number;
    accepted: boolean;
    reason?: 'destroyed' | 'full' | 'retired' | 'order';
}>;
export declare function initialOperations(): OperationState;
export declare function activeOperation(state: OperationState): OperationEntry | undefined;
export declare function pendingOperation(state: OperationState): PendingOperation | null;
/** Admission and logical retirement are synchronous. Queue bookkeeping release
 * is deliberately separate from completion to retain public promise timing. */
export declare function transitionOperations(state: OperationState, input: OperationInput): OperationDecision;
