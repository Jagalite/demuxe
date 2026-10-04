// SPDX-License-Identifier: Apache-2.0
import type { Shaka } from './shaka-api.js';
import type { RemoteSource } from '../types.js';
import { PlayerError } from './errors.js';
/** Per-session Shaka transport. The immutable owner admits requests and evidence;
 * this shell owns browser handles and private URL/header identity registries.
 * Shaka retains retries, connection/stall deadlines and bandwidth scheduling. */
export declare class ShakaNetworkPolicy {
    private source;
    private runtime;
    private fetcher;
    private preview;
    private control;
    private terminal?;
    private controllers;
    private requests;
    private resources;
    private resourceSerial;
    private allowed;
    private headers;
    private ownedBlobs;
    constructor(source: RemoteSource, runtime: typeof Shaka, fetcher?: typeof fetch, preview?: boolean);
    get terminalError(): PlayerError | undefined;
    private checkActive;
    private checkRequest;
    private fail;
    private failure;
    private accept;
    private admission;
    private checkHeaders;
    authorize(uri: string): string;
    ownBlob(uri: string): void;
    disownBlob(uri: string): void;
    private resource;
    private pruneResources;
    readonly filter: Shaka.extern.RequestFilter;
    readonly plugin: Shaka.extern.SchemePlugin;
    /** Preview copies current credentials; it cannot renew playback authorization. */
    forkForPreview(): ShakaNetworkPolicy;
    destroy(): void;
    get diagnostics(): {
        active: boolean;
        pendingRequests: number;
        pendingRefreshes: number;
        redirects: string;
        credentials: RequestCredentials;
        allowedOriginCount: number;
    };
}
