// SPDX-License-Identifier: Apache-2.0
/** Immutable transport policy. Resource IDs are shell-owned aliases: no URLs,
 * credentials, request objects, response bodies, timers or callbacks enter here. */
export type ShakaNetworkFailure = Readonly<{
    code: 'SOURCE_PERMISSION' | 'SOURCE_CHANGED' | 'UNSUPPORTED_FEATURE';
    message: string;
}>;
export type ShakaRange = Readonly<{
    start: bigint;
    requestedEnd: bigint | undefined;
    end: bigint;
    total: bigint | undefined;
    expected: bigint | undefined;
    complete: boolean;
}>;
export type ShakaNetworkRequest = Readonly<{
    id: number;
    kind: 'manifest' | 'segment' | 'other';
    phase: 'fetch' | 'refresh' | 'body' | 'ready' | 'cleanup';
    resource: number | undefined;
    attempt: number;
    cancelled: 'abort' | 'timeout' | null;
    deadline: number | undefined;
    limit: number;
    bytes: number;
    lastProgress: number;
    length: number;
    contentLength: string | undefined;
    range: ShakaRange | null;
}>;
export type ShakaNetworkState = Readonly<{
    active: boolean;
    serial: number;
    terminal: number;
    immutable: boolean;
    preview: boolean;
    requests: readonly ShakaNetworkRequest[];
    validators: readonly Readonly<{
        resource: number;
        value: string;
    }>[];
    totals: readonly Readonly<{
        resource: number;
        value: bigint;
    }>[];
}>;
export type ShakaNetworkDecision = Readonly<{
    state: ShakaNetworkState;
    accepted: boolean;
    failure?: ShakaNetworkFailure;
    id?: number;
    remaining?: number;
    refresh?: boolean;
    progress?: Readonly<{
        elapsed: number;
        bytes: number;
        remaining: number;
    }>;
    slice?: Readonly<{
        start: number;
        end: number;
    }>;
    streamRange?: boolean;
}>;
export declare function initialShakaNetwork(immutable?: boolean, preview?: boolean): ShakaNetworkState;
export declare function shakaNetworkRequest(state: ShakaNetworkState, id: number): ShakaNetworkRequest | undefined;
export declare function shakaNetworkCurrent(state: ShakaNetworkState, id: number): boolean;
export declare function beginShakaNetworkRequest(state: ShakaNetworkState, kind: ShakaNetworkRequest['kind'], timeout: number, now: number): ShakaNetworkDecision;
export declare function setShakaNetworkResource(state: ShakaNetworkState, id: number, resource: number): ShakaNetworkState;
export declare function cancelShakaNetworkRequest(state: ShakaNetworkState, id: number): ShakaNetworkDecision;
export declare function expireShakaNetworkRequest(state: ShakaNetworkState, id: number, now: number): ShakaNetworkDecision;
export declare function cleanupShakaNetworkRequest(state: ShakaNetworkState, id: number): ShakaNetworkState;
export declare function finishShakaNetworkRequest(state: ShakaNetworkState, id: number): ShakaNetworkState;
export declare function failShakaNetwork(state: ShakaNetworkState): ShakaNetworkState;
export declare function retireShakaNetwork(state: ShakaNetworkState): ShakaNetworkState;
export declare function shakaNetworkAdmission(facts: Readonly<{
    license: boolean;
    drm: boolean;
    rangeOverride: boolean;
    ownedBlob: boolean;
    http: boolean;
    userinfo: boolean;
    allowed: boolean;
}>): ShakaNetworkFailure | undefined;
export declare function receiveShakaNetworkStatus(state: ShakaNetworkState, id: number, status: number, canRefresh: boolean): ShakaNetworkDecision;
export declare function finishShakaNetworkRefresh(state: ShakaNetworkState, id: number): ShakaNetworkDecision;
export declare function observeShakaNetworkValidator(state: ShakaNetworkState, id: number, validator: string | null, ownedBlob: boolean): ShakaNetworkDecision;
export type ShakaResponseFacts = Readonly<{
    range: string | null;
    status: number;
    encoding: string | undefined;
    contentRange: string | undefined;
    contentLength: string | undefined;
    now: number;
}>;
export declare function beginShakaNetworkBody(state: ShakaNetworkState, id: number, facts: ShakaResponseFacts): ShakaNetworkDecision;
export declare function appendShakaNetworkBody(state: ShakaNetworkState, id: number, size: number, now: number): ShakaNetworkDecision;
export declare function completeShakaNetworkBody(state: ShakaNetworkState, id: number): ShakaNetworkDecision;
export declare function shakaNetworkResourceIDs(state: ShakaNetworkState): readonly number[];
