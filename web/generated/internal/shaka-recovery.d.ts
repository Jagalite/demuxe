// SPDX-License-Identifier: Apache-2.0
import type { Shaka } from './shaka-api.js';
/** Observe one source's pinned Shaka networking engine without replacing its
 * scheduler, promises or abort operations. Only an actual retry event enters
 * recovery; settlement of the whole logical request leaves it, even in backoff.
 * URL/header/error payloads never cross the public recovery boundary. */
export declare class ShakaRecovery {
    private player;
    private network;
    private timeoutCode;
    private changed;
    private control;
    private ids;
    private failures;
    private original;
    private forward;
    constructor(player: EventTarget, network: Shaka.extern.NetworkingEngine, timeoutCode: number, changed: () => void);
    private move;
    private readonly failed;
    private readonly retry;
    get snapshot(): Readonly<{
        status: "idle" | "retrying";
        retryingRequests: number;
    }>;
    destroy(): void;
}
