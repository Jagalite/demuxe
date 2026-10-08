// SPDX-License-Identifier: Apache-2.0
/** A viewport expansion owns document-wide inert and overflow effects. Reserve
 * before touching the DOM and release only after restoration finishes. */
export type ViewportLease = Readonly<{
    serial: number;
    owner: number | null;
}>;
export declare function initialViewportLease(): ViewportLease;
export declare function acquireViewportLease(state: ViewportLease): Readonly<{
    state: Readonly<{
        serial: number;
        owner: number | null;
    }>;
    id: null;
}> | Readonly<{
    state: Readonly<{
        serial: number;
        owner: number;
    }>;
    id: number;
}>;
export declare function viewportLeaseCurrent(state: ViewportLease, id: number): boolean;
export declare function releaseViewportLease(state: ViewportLease, id: number): ViewportLease;
