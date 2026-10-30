// SPDX-License-Identifier: Apache-2.0
export type StreamWorker = {
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
    onmessageerror: ((event: MessageEvent) => void) | null;
    postMessage(message: unknown, transfer?: Transferable[]): void;
    terminate(): void;
};
/** Hide byte RPC from the existing presentation protocol. Transport policy and
 * original failures stay in this main-thread lease, never in the SDK worker. */
export declare function bridgeStreamWorker(raw: Worker, { size, read, check, close, readTimeoutMs }: {
    size: number;
    read: (at: number, length: number) => Promise<Uint8Array>;
    check: () => void;
    close: () => void;
    readTimeoutMs?: number;
}): StreamWorker;
