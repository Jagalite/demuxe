// SPDX-License-Identifier: Apache-2.0
export type RangeReaderConfig = Readonly<{
    blockBytes: number;
    cacheBytes: number;
    readDeadlineMs: number;
    immutable: boolean;
}>;
type CachedRange = Readonly<{
    key: string;
    start: bigint;
    length: number;
    owned: number;
}>;
type RangeRead = Readonly<{
    id: number;
    epoch: number;
    start: bigint;
    key: string;
    received: number;
    bodyBytes: number;
    expected: number;
    attempt: number;
    refreshed: boolean;
    deadline: number | null;
    expired: boolean;
    cached: boolean;
    started: boolean;
}>;
export type RangeReaderState = Readonly<{
    config: RangeReaderConfig;
    epoch: number;
    closed: boolean;
    serial: number;
    active: RangeRead | null;
    preview: Readonly<{
        id: number;
        retired: boolean;
    }> | null;
    total?: bigint;
    etag?: string;
    cache: readonly CachedRange[];
    stats: Readonly<{
        fetchedBytes: number;
        requests: number;
        retries: number;
        aborts: number;
        cacheBytes: number;
        peakCacheBytes: number;
        activeBytes: number;
        peakActiveBytes: number;
    }>;
}>;
export type RangeReaderCommand = Readonly<{
    type: 'begin';
    offset: bigint;
    capacity: number;
}> | Readonly<{
    type: 'epoch';
}> | Readonly<{
    type: 'close';
}> | Readonly<{
    type: 'preview-retire';
}> | Readonly<{
    type: 'preview-begin';
    allowFetch: boolean;
}> | Readonly<{
    type: 'preview-finish' | 'finish' | 'timeout' | 'fetch-started';
    id: number;
}> | Readonly<{
    type: 'fetch-begin' | 'check' | 'request';
    id: number;
    now: number;
}> | Readonly<{
    type: 'headers';
    id: number;
    status: number;
    range: string | null;
    encoding: string | null;
    etag: string | null;
    length: string | null;
    refreshAvailable: boolean;
}> | Readonly<{
    type: 'chunk';
    id: number;
    bytes: number;
}> | Readonly<{
    type: 'body-complete';
    id: number;
}> | Readonly<{
    type: 'retry';
    id: number;
    retryable: boolean;
    now: number;
    serverWait: number;
    random: number;
}> | Readonly<{
    type: 'cache';
    id: number;
    length: number;
    owned: number;
}>;
export type RangeReaderDecision = Readonly<{
    state: RangeReaderState;
    error?: string;
    aborted?: boolean;
    retry?: boolean;
    wait?: number;
    refresh?: boolean;
    complete?: boolean;
    empty?: boolean;
    hit?: Readonly<{
        key: string;
        start: bigint;
    }>;
    request?: RangeRead;
    offset?: bigint;
    end?: bigint;
    copyAt?: number;
    evict?: readonly string[];
    previewId?: number;
    retirePreview?: number;
}>;
export declare function initialRangeReader(config: RangeReaderConfig, identity?: Readonly<{
    size: string;
    etag?: string;
}>): RangeReaderState;
export declare function rangeCurrent(state: RangeReaderState, id: number): boolean;
export declare function rangeURLAllowed(facts: Readonly<{
    protocol: string;
    credentials: boolean;
    allowedOrigin: boolean;
}>): boolean;
export declare function rangePeek(state: RangeReaderState, offset: bigint, capacity: number): Readonly<{
    error?: string;
    key?: string;
    at?: number;
}>;
export declare function rangePreviewAllowed(state: RangeReaderState, allowFetch: boolean): boolean;
export declare function transitionRangeReader(state: RangeReaderState, command: RangeReaderCommand): RangeReaderDecision;
export {};
