// SPDX-License-Identifier: Apache-2.0
import { type PreviewInteractionState } from './preview-interaction.js';
import type { PreviewOptionsData, PreviewStrategyData } from '../../types.js';
export type PreviewSettings = Readonly<Required<Omit<PreviewOptionsData, 'pregenerate' | 'strategy'>>>;
export type PreviewRequestData = Readonly<{
    time: number;
    width?: number;
    height?: number;
    exact?: boolean;
    maxDistance?: number;
    cacheOnly?: boolean;
}>;
export type PreviewJobState = Readonly<{
    id: number;
    key: string;
    time: number;
    width: number;
    height?: number;
    exact: boolean;
    sourceId: string;
    background: boolean;
    ready: boolean;
    aborted: boolean;
    requiresDecoder?: boolean;
    selectionMs: number;
}>;
export type PreviewCacheEntry = Readonly<{
    key: string;
    time: number;
    bytes: number;
    background: boolean;
}>;
export type PreviewControlState = Readonly<{
    options: PreviewSettings;
    allowed: boolean;
    suspended: boolean;
    playbackActive: boolean;
    disposed: boolean;
    interaction: PreviewInteractionState;
    strategy: PreviewStrategyData | null;
    duration: number | null;
    hoverUntil: number;
    playbackPosition: number;
    lastForeground: number;
    sourceId: string;
    revision: number;
    serial: number;
    requestEpoch: number;
    retiring: number;
    active: PreviewJobState | null;
    pending: PreviewJobState | null;
    caller: Readonly<{
        id: number;
        jobId: number;
    }> | null;
    cache: readonly PreviewCacheEntry[];
    bytes: number;
    counters: Readonly<{
        requests: number;
        hits: number;
        failures: number;
        cancelled: number;
    }>;
    lastFailure?: Readonly<{
        provider: string;
        kind: string;
    }>;
}>;
export type PreviewControlEvent = {
    kind: 'enabled';
    value: boolean;
} | {
    kind: 'suspended';
    value: boolean;
} | {
    kind: 'playback';
    value: boolean;
} | {
    kind: 'strategy';
    value: PreviewStrategyData;
} | {
    kind: 'source';
    sourceId: string;
} | {
    kind: 'providers';
} | {
    kind: 'focus';
    source: 'hover' | 'playback';
    time: number;
    at: number;
} | {
    kind: 'duration';
    duration: number | null;
} | {
    kind: 'position';
    time: number;
} | {
    kind: 'foreground';
    at: number;
} | {
    kind: 'hover';
    at: number;
} | {
    kind: 'request-count';
    cacheOnly: boolean;
} | {
    kind: 'retire-work';
} | {
    kind: 'retired-work';
} | {
    kind: 'dispose';
} | {
    kind: 'clear-cache';
} | {
    kind: 'limits';
    maxEntries: number;
    maxCacheBytes: number;
} | {
    kind: 'cancel-job';
    id: number;
} | {
    kind: 'ready';
    id: number;
} | {
    kind: 'finish-job';
    id: number;
} | {
    kind: 'provider';
    id: number;
    requiresDecoder: boolean | undefined;
} | {
    kind: 'selection';
    id: number;
    milliseconds: number;
} | {
    kind: 'failure';
    provider: string;
    errorKind: string;
} | {
    kind: 'caller';
    jobId: number;
} | {
    kind: 'settle';
    failed: boolean;
};
export declare function createPreviewControl(settings?: Omit<PreviewOptionsData, 'pregenerate' | 'strategy'>): PreviewControlState;
/** Data-only control updates. Resource cancellation and observer delivery use the
 * committed result; this authority never holds an image, provider or callback. */
export declare function transitionPreviewControl(state: PreviewControlState, event: PreviewControlEvent): PreviewControlState;
export declare function previewJob(state: PreviewControlState, id: number): PreviewJobState | undefined;
export declare function previewGenerationAdmission(state: PreviewControlState, at: number): 'run' | 'wait' | 'stop';
export declare function previewProviderDeferred(state: PreviewControlState, requiresDecoder: boolean | undefined, allowDuringPlayback: boolean | undefined): boolean;
export declare function previewCanPrefetch(state: PreviewControlState): boolean;
export type PreviewAdmission = Readonly<{
    kind: 'aborted';
}> | Readonly<{
    kind: 'disabled';
}> | Readonly<{
    kind: 'invalid';
    message: string;
}> | Readonly<{
    kind: 'ready';
    key: string;
    time: number;
    width: number;
    height: number | undefined;
    exact: boolean;
}>;
export declare function admitPreviewRequest(state: PreviewControlState, request: PreviewRequestData, aborted: boolean): PreviewAdmission;
export declare function planPreviewRequest(state: PreviewControlState, key: string, cacheOnly: boolean, background: boolean): Readonly<{
    state: PreviewControlState;
    jobId: number | null;
    cancel: readonly number[];
}>;
export declare function createPreviewJob(state: PreviewControlState, admission: Extract<PreviewAdmission, {
    kind: 'ready';
}>, background: boolean): PreviewControlState;
export declare function startPreviewJob(state: PreviewControlState): PreviewControlState;
export declare function lookupPreviewCache(state: PreviewControlState, request: PreviewRequestData, admission: Extract<PreviewAdmission, {
    kind: 'ready';
}>, background: boolean): Readonly<{
    state: PreviewControlState;
    key: string | null;
}>;
export declare function rememberPreviewCache(state: PreviewControlState, entry: PreviewCacheEntry): PreviewControlState;
export declare function unloadPreviewCache(state: PreviewControlState, start: number, end: number): Readonly<{
    state: PreviewControlState;
    jobs: readonly number[];
    removed: number;
}>;
