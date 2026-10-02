// SPDX-License-Identifier: Apache-2.0
export type BackendRequestProfile = 'software' | 'audio' | 'subtitles';
export type BackendRequest = Readonly<{
    id: number;
    op: string;
    deadline: number;
}>;
export type BackendRequests = Readonly<{
    profile: BackendRequestProfile;
    phase: 'active' | 'closing' | 'closed';
    failed: boolean;
    nextId: number;
    pending: readonly BackendRequest[];
}>;
export type BackendRequestAdmission = Readonly<{
    state: BackendRequests;
    effect: Readonly<{
        kind: 'send';
        request: BackendRequest;
    } | {
        kind: 'reject';
        reason: 'closed' | 'failed' | 'capacity';
    }>;
}>;
export declare function createBackendRequests(profile: BackendRequestProfile): BackendRequests;
export declare function admitBackendRequest(state: BackendRequests, op: string, now: number): BackendRequestAdmission;
export type BackendRequestSettlement = Readonly<{
    state: BackendRequests;
    effect: Readonly<{
        kind: 'ignore';
    } | {
        kind: 'settle';
        request: BackendRequest;
        fatal: boolean;
    }>;
}>;
export declare function settleBackendRequest(state: BackendRequests, id: number, event: Readonly<{
    kind: 'reply' | 'transport-error';
} | {
    kind: 'deadline';
    now: number;
}>): BackendRequestSettlement;
export declare function failBackendRequests(state: BackendRequests): Readonly<{
    state: BackendRequests;
    reject: readonly number[];
    notify: boolean;
}>;
/** Closing blocks new ordinary requests while existing replies and the cleanup
 * request retain their original settlement/deadline semantics. */
export declare function beginBackendClose(state: BackendRequests): BackendRequests;
export declare function finishBackendClose(state: BackendRequests): Readonly<{
    state: BackendRequests;
    reject: readonly number[];
}>;
