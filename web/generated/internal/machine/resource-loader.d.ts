// SPDX-License-Identifier: Apache-2.0
type ResourceHandle = Readonly<{
    id: number;
    start: bigint;
    total: bigint;
    length: number;
}>;
type ResourceOpen = Readonly<{
    id: number;
    epoch: number;
    start?: bigint;
    end?: bigint;
    limit: number;
    attempt: number;
    refreshed: boolean;
    count: number;
    expected?: number;
    total?: bigint;
    phase: 'ready' | 'headers' | 'body' | 'complete' | 'accepted';
    cancelled: boolean;
    started: boolean;
}>;
export type ResourceLoaderState = Readonly<{
    live: boolean;
    closed: boolean;
    epoch: number;
    serial: number;
    nextId: number;
    active: ResourceOpen | null;
    handles: readonly ResourceHandle[];
    stats: Readonly<{
        opens: number;
        requests: number;
        retries: number;
        aborts: number;
        handles: number;
        retainedBytes: number;
        peakRetainedBytes: number;
        fetchedBytes: number;
    }>;
}>;
export type ResourceLoaderCommand = Readonly<{
    type: 'open';
    start?: bigint;
    end?: bigint;
    manifest: boolean;
}> | Readonly<{
    type: 'request' | 'fetch-started' | 'body-complete' | 'accept' | 'finish' | 'cancel';
    id: number;
}> | Readonly<{
    type: 'headers';
    id: number;
    status: number;
    encoding: string | null;
    range: string | null;
    length: string | null;
    refreshAvailable: boolean;
}> | Readonly<{
    type: 'chunk';
    id: number;
    bytes: number;
}> | Readonly<{
    type: 'retry';
    id: number;
    retryable: boolean;
}> | Readonly<{
    type: 'close-handle';
    id: number;
}> | Readonly<{
    type: 'epoch';
}> | Readonly<{
    type: 'close';
}>;
export type ResourceLoaderDecision = Readonly<{
    state: ResourceLoaderState;
    error?: string;
    aborted?: boolean;
    request?: ResourceOpen;
    handle?: ResourceHandle;
    refresh?: boolean;
    retry?: boolean;
    wait?: number;
    release?: readonly number[];
}>;
export declare function initialResourceLoader(live: boolean): ResourceLoaderState;
export declare function resourceURLAllowed(facts: Readonly<{
    length: number;
    protocol: string;
    credentials: boolean;
    allowedOrigin: boolean;
}>): boolean;
export declare function resourceRead(handle: ResourceHandle | undefined, closed: boolean, offset: bigint, capacity: number): Readonly<{
    error?: string;
    at?: number;
    end?: number;
    empty?: boolean;
}>;
export declare function resourceCurrent(state: ResourceLoaderState, id: number): boolean;
export declare function resourceOpenError(state: ResourceLoaderState, start?: bigint, end?: bigint): string | undefined;
export declare function transitionResourceLoader(state: ResourceLoaderState, command: ResourceLoaderCommand): ResourceLoaderDecision;
export {};
