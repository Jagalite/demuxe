// SPDX-License-Identifier: Apache-2.0
/** Startup code acquisition owns logical admission until physical work settles. */
export type StartupEntry = Readonly<{
    id: number;
    path: string;
    bytes: number;
    phase: 'pending' | 'ready' | 'retired';
    deadline: number;
}>;
export type StartupState = Readonly<{
    serial: number;
    stopped: boolean;
    entries: readonly StartupEntry[];
}>;
export declare const STARTUP_BYTE_LIMIT: number, STARTUP_ENTRY_LIMIT = 8, STARTUP_TIMEOUT_MS = 15000;
export declare function initialStartup(): StartupState;
export type StartupChange = {
    type: 'admit';
    path: string;
    now: number;
} | {
    type: 'deadline';
    id: number;
    now: number;
} | {
    type: 'chunk';
    id: number;
    bytes: number;
} | {
    type: 'complete';
    id: number;
} | {
    type: 'failed';
    id: number;
} | {
    type: 'destroy';
};
export declare function transitionStartup(state: StartupState, event: StartupChange): Readonly<{
    state: StartupState;
    accepted: boolean;
    id?: number;
    existing?: boolean;
    remaining?: number;
}>;
export type StartupCandidate = Readonly<{
    id: string;
    eligible: boolean;
    included: boolean;
    fallback: boolean;
    rejected: boolean;
}>;
export declare function startupFallbackPlan(original: boolean, current: string, remux: string | undefined, plans: readonly StartupCandidate[]): string | undefined;
export declare function startupLoadBudget(explicit: number | undefined, switchAfterMs: number | undefined, fallback: string | undefined): number | undefined;
export declare function startupPrefetchCurrent(stopped: boolean, epoch: number, expectedEpoch: number, discovery: number | undefined, expectedDiscovery: number): boolean;
/** Immutable code warming is player-scoped, and may survive source replacement. */
export type StartupRecipeFacts = Readonly<{
    backend?: 'NativePlayer' | 'ShakaBackend' | 'WasmPlayer' | 'PrivateSoftwarePlayer';
    adaptation?: 'flac' | 'opus' | 'flac24';
}>;
export declare function startupPreparation(planId: string, runtime: 'pthread' | 'jspi' | 'asyncify', rgb: boolean, recipe: StartupRecipeFacts): Readonly<{
    kind: "engine";
    mode: "hybrid" | "software";
    path: "web/engine-hybrid/player.wasm" | "web/engine-software-full/player.wasm" | "web/engine-software-yuv/player.wasm";
}> | Readonly<{
    kind: "private";
    path: "web/engine-mpv-playback-jspi/player.wasm" | "web/engine-mpv-playback-asyncify/player.wasm" | "web/engine-mpv-playback-pthread/player.wasm";
}> | Readonly<{
    kind: "remux";
    adapted: boolean;
    codecPreparation: boolean;
    path: `web/engine-remux${string}/remux.wasm` | `web/engine-adaptation${string}/remux.wasm`;
}>;
