// SPDX-License-Identifier: Apache-2.0
import type { RemoteSource } from '../types.js';
export type RemotePreparationSource = RemoteSource & {
    identity?: {
        size: string;
        etag?: string;
    };
};
export declare function remotePreparationSize(source: RemotePreparationSource): number | undefined;
export declare function snapshotPreparationSource(source: RemotePreparationSource): RemotePreparationSource;
export declare function samePreparationSource(a: RemotePreparationSource, b: RemotePreparationSource): boolean;
/** Borrow the established transport policy; retain exact read ownership here.
 * Serializing reads protects RangeReader's one playback lane across A/V pumps. */
export declare function openPreparationSource(source: RemotePreparationSource, base: URL, signal: AbortSignal, { maxBytes, validate }?: {
    maxBytes?: number;
    validate?: () => void;
}): Promise<{
    size: number;
    read(at: number, length: number): Promise<Uint8Array>;
    close(): void;
}>;
