// SPDX-License-Identifier: Apache-2.0
import type { PlayerErrorCode } from '../../types.js';
export type ByteFault = Readonly<{
    code: PlayerErrorCode;
    message: string;
}>;
export type ByteIdentity = Readonly<{
    id: string | null;
    size: number | null;
}>;
type ByteRequest = Readonly<{
    id: number;
    offset: number;
    length: number;
    received: number;
    chunk: number;
    chunkSize: number;
}>;
export type ByteReaderState = Readonly<{
    id: string;
    size: number;
    maxReads: number;
    maxBytes: number;
    ownedClose: boolean;
    leaseSerial: number;
    leases: readonly number[];
    reads: number;
    bytes: number;
    nextRequest: number;
    nextChunk: number;
    active: ByteRequest | null;
    retired: boolean;
    closeIssued: boolean;
    failure: ByteFault | null;
}>;
export type ByteReadEffect = Readonly<{
    kind: 'read';
    request: number;
    chunk: number;
    offset: number;
    length: number;
}> | Readonly<{
    kind: 'complete';
    request: number;
}> | Readonly<{
    kind: 'reject';
    fault: ByteFault;
    abort: boolean;
}> | Readonly<{
    kind: 'ignore';
}>;
export type ByteReadTransition = Readonly<{
    state: ByteReaderState;
    effect: ByteReadEffect;
    copyAt: number | null;
}>;
export declare function createByteReader(input: Readonly<{
    id: string;
    size: number;
    maxReads: number;
    maxBytes: number;
    ownedClose: boolean;
}>): ByteReaderState;
/** Validation happens before shell queueing, including after retirement. */
export declare function validateByteRange(state: ByteReaderState, offset: number, length: number): ByteFault | null;
/** Shell serialization calls this when an admitted range reaches the queue head.
 * Identity and byte budgets are evaluated then, not when it was enqueued. */
export declare function beginByteRead(state: ByteReaderState, identity: ByteIdentity, offset: number, length: number): ByteReadTransition;
/** Completions contain observations only. Provider buffers stay in the shell;
 * copyAt authorizes copying those bytes before committing this transition. */
export declare function completeByteRead(state: ByteReaderState, input: Readonly<{
    request: number;
    chunk: number;
    identity: ByteIdentity;
    validBuffer: boolean;
    length: number;
}>): ByteReadTransition;
/** The first provider failure remains authoritative; later queued calls observe
 * retirement. Retiring during an in-flight deadline does not hide that failure. */
export declare function failByteRead(state: ByteReaderState, request: number, chunk: number, error: ByteFault): ByteReadTransition;
export declare function retireByteReader(state: ByteReaderState): ByteReaderState;
export declare function closeByteReader(state: ByteReaderState): Readonly<{
    state: ByteReaderState;
    closeProvider: boolean;
}>;
/** Reserve closure capacity before adding a range to the shell's promise queue.
 * A timeout may settle the caller but does not release an ignored provider call. */
export declare function admitByteReadLease(state: ByteReaderState): Readonly<{
    state: ByteReaderState;
    id: number | null;
    fault: ByteFault | null;
}>;
export declare function finishByteReadLease(state: ByteReaderState, id: number): ByteReaderState;
export {};
