// SPDX-License-Identifier: Apache-2.0
import type Shaka from 'shaka-player';
/** Shared runtime policy has one module lifetime; executable code, promises,
 * script nodes, fetch controllers and object URLs stay in this adapter. */
export declare class ShakaRuntimeLoader {
    private state;
    private handles;
    load(base: URL, signal: AbortSignal): Promise<typeof Shaka>;
    private current;
    private cleanup;
    private cancel;
    private finish;
    private deadline;
    private start;
}
export declare function runtimeAt(base: URL, signal: AbortSignal): Promise<typeof Shaka>;
