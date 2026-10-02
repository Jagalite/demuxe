// SPDX-License-Identifier: Apache-2.0
export type RemuxPortRead = Readonly<{
    id: number;
    offset: number;
    count: number;
}>;
export type RemuxPortReaderState = Readonly<{
    size: number;
    sequence: number;
    closed: boolean;
    pending: RemuxPortRead | null;
}>;
export type RemuxPortReaderFailure = 'cancelled' | 'concurrent' | 'range' | 'unexpected' | 'transport' | 'bytes';
export type RemuxPortReaderDecision = Readonly<{
    state: RemuxPortReaderState;
    accepted: boolean;
    request: RemuxPortRead | null;
    error?: RemuxPortReaderFailure;
}>;
export declare function initialRemuxPortReader(size: number): RemuxPortReaderState;
export declare function remuxPortReadCurrent(state: RemuxPortReaderState, id: number): boolean;
export declare function beginRemuxPortRead(state: RemuxPortReaderState, offset: number, count: number, aborted: boolean): RemuxPortReaderDecision;
export declare function closeRemuxPortReader(state: RemuxPortReaderState): RemuxPortReaderDecision;
export declare function remuxPortResponseCurrent(state: RemuxPortReaderState, expected: number | null): boolean;
export declare function replyRemuxPortRead(state: RemuxPortReaderState, facts: Readonly<{
    object: boolean;
    id: number | null;
    error: boolean;
    buffer: boolean;
    bytes: number;
}>, expected?: number | null): RemuxPortReaderDecision;
