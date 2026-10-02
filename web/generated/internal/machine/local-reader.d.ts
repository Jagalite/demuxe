// SPDX-License-Identifier: Apache-2.0
export type LocalReaderStats = Readonly<{
    fetchedBytes: number;
    requests: number;
    aborts: number;
    discardedBytes: number;
    cacheBytes: number;
    peakCacheBytes: number;
    cacheHits: number;
    activeBytes: number;
    peakActiveBytes: number;
    peakChunkBytes: number;
    peakOwnedBytes: number;
}>;
type LocalRead = Readonly<{
    id: number;
    epoch: number;
    key: string;
    offset: bigint;
    size: number;
    received: number;
}>;
export type LocalReaderState = Readonly<{
    total: bigint;
    cacheLimit: number;
    maxRequests: number;
    epoch: number;
    closed: boolean;
    serial: number;
    active: LocalRead | null;
    cache: readonly Readonly<{
        key: string;
        size: number;
    }>[];
    stats: LocalReaderStats;
}>;
export type LocalReaderCommand = Readonly<{
    type: 'begin';
    offset: bigint;
    capacity: number;
}> | Readonly<{
    type: 'started';
    id: number;
}> | Readonly<{
    type: 'chunk';
    id: number;
    bytes: number;
    done: boolean;
}> | Readonly<{
    type: 'finish';
    id: number;
    success: boolean;
}> | Readonly<{
    type: 'epoch';
}> | Readonly<{
    type: 'close';
}>;
export type LocalReaderDecision = Readonly<{
    state: LocalReaderState;
    error?: string;
    aborted?: boolean;
    empty?: boolean;
    hit?: string;
    request?: LocalRead;
    publish?: boolean;
    evict?: readonly string[];
}>;
export declare function initialLocalReader(total: bigint, cacheLimit: number, maxRequests: number): LocalReaderState;
export declare function transitionLocalReader(state: LocalReaderState, command: LocalReaderCommand): LocalReaderDecision;
export {};
