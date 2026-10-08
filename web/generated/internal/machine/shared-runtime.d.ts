// SPDX-License-Identifier: Apache-2.0
import type { RuntimeProvider } from './provider-runtime.js';
export type SharedRuntimeState = Readonly<{
    retired: boolean;
    revision: number;
    qualified: Readonly<Record<string, string>>;
    providers: readonly RuntimeProvider[];
    loads: readonly Readonly<{
        key: string;
        id: number;
    }>[];
    nextLoad: number;
}>;
export declare function initialSharedRuntime(qualified: Readonly<Record<string, string>>): SharedRuntimeState;
export declare function admitSharedRuntimeLoad(state: SharedRuntimeState, key: string): Readonly<{
    state: Readonly<{
        retired: boolean;
        revision: number;
        qualified: Readonly<Record<string, string>>;
        providers: readonly RuntimeProvider[];
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        nextLoad: number;
    }>;
    id: undefined;
    start: false;
}> | Readonly<{
    state: Readonly<{
        retired: boolean;
        revision: number;
        qualified: Readonly<Record<string, string>>;
        providers: readonly RuntimeProvider[];
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        nextLoad: number;
    }>;
    id: number;
    start: false;
}> | Readonly<{
    state: Readonly<{
        nextLoad: number;
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        retired: boolean;
        revision: number;
        qualified: Readonly<Record<string, string>>;
        providers: readonly RuntimeProvider[];
    }>;
    id: number;
    start: true;
}>;
export declare function failSharedRuntimeLoad(state: SharedRuntimeState, id: number): SharedRuntimeState;
export declare function unqualifiedRuntimeProvider(state: SharedRuntimeState, providers: readonly RuntimeProvider[]): string | undefined;
/** The adapter supplies a validated additive merge against this revision. No
 * asynchronous work may occur between merge and publication. */
export declare function publishSharedRuntime(state: SharedRuntimeState, baseRevision: number, providers: readonly RuntimeProvider[], changed: boolean): Readonly<{
    state: Readonly<{
        retired: boolean;
        revision: number;
        qualified: Readonly<Record<string, string>>;
        providers: readonly RuntimeProvider[];
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        nextLoad: number;
    }>;
    accepted: false;
    published: false;
}> | Readonly<{
    state: Readonly<{
        retired: boolean;
        revision: number;
        qualified: Readonly<Record<string, string>>;
        providers: readonly RuntimeProvider[];
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        nextLoad: number;
    }>;
    accepted: true;
    published: false;
}> | Readonly<{
    state: Readonly<{
        revision: number;
        providers: readonly Readonly<{
            id: string;
            implementationIdentity: string;
            manifestMatches: boolean;
            assets: readonly string[];
            profiles: readonly string[];
        }>[];
        retired: boolean;
        qualified: Readonly<Record<string, string>>;
        loads: readonly Readonly<{
            key: string;
            id: number;
        }>[];
        nextLoad: number;
    }>;
    accepted: true;
    published: true;
}>;
export declare function retireSharedRuntime(state: SharedRuntimeState): SharedRuntimeState;
