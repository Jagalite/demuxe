// SPDX-License-Identifier: GPL-3.0-or-later
import type Shaka from 'shaka-player';
import type { RemoteSource } from '../types.js';
import { PlayerError } from './errors.js';
/** Per-session Shaka transport. Scheduling, retries and bandwidth estimation stay
 * in NetworkingEngine. A WeakMap associates only this player's requests.
 * Fetch redirect:error is intentional: filters cannot authorize a redirect before
 * the browser sends it. Applications must supply final authorized resource URLs. */
export declare class ShakaNetworkPolicy {
    private source;
    private runtime;
    private fetcher;
    private requests;
    terminalError?: PlayerError;
    private active;
    private controllers;
    private allowed;
    private headers;
    private validators;
    private rangeTotals;
    private ownedBlobs;
    constructor(source: RemoteSource, runtime: typeof Shaka, fetcher?: typeof fetch);
    private checkHeaders;
    private checkActive;
    authorize(uri: string): string;
    ownBlob(uri: string): void;
    private fail;
    readonly filter: Shaka.extern.RequestFilter;
    readonly plugin: Shaka.extern.SchemePlugin;
    destroy(): void;
    get diagnostics(): {
        active: boolean;
        pendingRequests: number;
        redirects: string;
        credentials: RequestCredentials;
        allowedOriginCount: number;
    };
}
