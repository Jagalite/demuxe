// SPDX-License-Identifier: Apache-2.0
export type SharedAssetEntry = Readonly<{
    key: string;
    id: number;
    bytes: number;
    ready: boolean;
}>;
export type SharedAssetsState = Readonly<{
    retired: boolean;
    nextId: number;
    maxBytes: number;
    entries: readonly SharedAssetEntry[];
}>;
export type SharedAssetsCommand = Readonly<{
    type: 'reserve';
    key: string;
    bytes: number;
}> | Readonly<{
    type: 'ready' | 'failed';
    id: number;
}> | Readonly<{
    type: 'clear';
}> | Readonly<{
    type: 'retire';
}>;
export declare function initialSharedAssets(maxBytes: number): SharedAssetsState;
export declare function reservedAssetBytes(state: SharedAssetsState): number;
/** Ordered reservations are the LRU; pending acquisitions cannot be evicted.
 * IDs fence completions after eviction, retry, clear, and retirement. */
export declare function transitionSharedAssets(state: SharedAssetsState, command: SharedAssetsCommand): Readonly<{
    state: Readonly<{
        retired: boolean;
        nextId: number;
        maxBytes: number;
        entries: readonly SharedAssetEntry[];
    }>;
    id: undefined;
    error: "retired";
}> | Readonly<{
    state: Readonly<{
        entries: readonly Readonly<{
            key: string;
            id: number;
            bytes: number;
            ready: boolean;
        }>[];
        retired: boolean;
        nextId: number;
        maxBytes: number;
    }>;
    id: number;
    error: undefined;
}> | Readonly<{
    state: Readonly<{
        retired: boolean;
        nextId: number;
        maxBytes: number;
        entries: readonly SharedAssetEntry[];
    }>;
    id: undefined;
    error: "size";
}> | Readonly<{
    state: Readonly<{
        entries: readonly Readonly<{
            key: string;
            id: number;
            bytes: number;
            ready: boolean;
        }>[];
        retired: boolean;
        nextId: number;
        maxBytes: number;
    }>;
    id: undefined;
    error: "capacity";
}> | Readonly<{
    state: Readonly<{
        entries: readonly Readonly<{
            key: string;
            id: number;
            bytes: number;
            ready: boolean;
        }>[];
        retired: boolean;
        nextId: number;
        maxBytes: number;
    }>;
    id: undefined;
    error: undefined;
}>;
