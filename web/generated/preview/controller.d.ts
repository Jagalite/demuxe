// SPDX-License-Identifier: GPL-3.0-or-later
import type { PreviewOptions } from '../types.js';
export type { PreviewOptions } from '../types.js';
export type PreviewRequest = {
    time: number;
    width?: number;
    height?: number;
    signal?: AbortSignal;
    exact?: boolean;
};
export type PreviewImage = {
    blob: Blob;
} | {
    uris: readonly string[];
    crop: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    startByte?: number;
    endByte?: number;
};
export type PreviewMetrics = {
    providerSelectionMs: number;
    cacheLookupMs: number;
    totalMs: number;
    indexLookupMs: number | null;
    byteAcquisitionMs: number | null;
    decoderInitializationMs: number | null;
    frameDecodeMs: number | null;
    resizeConversionMs: number | null;
    decodedFrames: number | null;
    bytesRead: number | null;
    bytesFetched: number | null;
    mediaReadyMs?: number;
    seekMs?: number;
};
/** time is the provider's best display-time estimate; actualTime is null when the
 * decoder cannot expose a represented PTS. Spatial fidelity is independent of time. */
export type PreviewResult = {
    time: number;
    actualTime?: number | null;
    width: number;
    height: number;
    image: PreviewImage;
    path: string;
    temporalAccuracy?: 'exact' | 'approximate';
    fidelity?: 'full' | 'reduced';
    timestampKind?: 'exact' | 'media-time' | 'interval';
    metrics?: Partial<PreviewMetrics>;
};
export type PreviewFrame = PreviewResult & {
    sourceId: string;
    actualTime: number | null;
    temporalAccuracy: 'exact' | 'approximate';
    fidelity: 'full' | 'reduced';
    requestedTime: number;
    bucketTime: number;
    cache: 'hit' | 'miss';
    metrics: PreviewMetrics;
};
export type PreviewContext = {
    time: number;
    width: number;
    height?: number;
    signal: AbortSignal;
    exact: boolean;
    sourceId: string;
    publish: (frame: PreviewResult) => void;
};
export interface PreviewProvider {
    readonly id: string;
    readonly priority: number;
    canHandle(request: PreviewContext): boolean | Promise<boolean>;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
/** One active provider, one pending job and one caller. Cancelled requests attach
 * no retained promise reactions to an uncooperative provider. */
export declare class PreviewController {
    private providers;
    private cache;
    private bytes;
    private sourceId;
    private revision;
    private active?;
    private pending?;
    private caller?;
    private disposed;
    private counters;
    private lastFailure?;
    private readonly options;
    constructor(providers?: readonly PreviewProvider[], options?: PreviewOptions);
    get diagnostics(): {
        sourceId: string;
        cacheBytes: number;
        cacheEntries: number;
        active: boolean;
        pending: boolean;
        lastFailure: {
            provider: string;
            kind: string;
        } | undefined;
        requests: number;
        hits: number;
        failures: number;
        cancelled: number;
    };
    setSourceIdentity(id: string): void;
    setProviders(providers: readonly PreviewProvider[]): void;
    addProvider(provider: PreviewProvider): () => void;
    private cancelJob;
    private settle;
    clear(): void;
    destroy(): void;
    /** Explicit optional prefetch. Busy lanes decline; a hover always supersedes it. */
    prefetch(request: PreviewRequest): Promise<void>;
    getFrame(request: PreviewRequest): Promise<PreviewFrame | null>;
    /** Optional refinement delivery; getFrame remains a single-final-result API. */
    request(request: PreviewRequest & {
        onUpdate?: (frame: PreviewFrame) => void;
    }): Promise<PreviewFrame | null>;
    private pump;
    private run;
    private validate;
    private publish;
    private notify;
    private frame;
    private remember;
}
