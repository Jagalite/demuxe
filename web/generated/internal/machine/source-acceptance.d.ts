// SPDX-License-Identifier: Apache-2.0
/** Acceptance has already committed source/settings identity. Notification work
 * may retire independently; predecessor cleanup remains mandatory. */
export type SourceAcceptanceKind = 'caller.detach' | 'decoding' | 'admission' | 'evidence' | 'preview.identity' | 'preview.source' | 'publish' | 'surface.show' | 'surface.hide' | 'watchdogs' | 'cleanup' | 'property.next' | 'property.emit' | 'file.loaded' | 'mode.ready';
export type SourceAcceptance = Readonly<{
    phase: SourceAcceptanceKind | 'done';
    serial: number;
    pending: number | null;
    failed: boolean;
    cleanup: 'pending' | 'running' | 'done';
}>;
export type SourceAcceptanceEffect = Readonly<{
    kind: SourceAcceptanceKind;
    step: number;
}>;
export declare function initialSourceAcceptance(predecessor: boolean): SourceAcceptance;
export declare function claimSourceAcceptance(state: SourceAcceptance): Readonly<{
    state: SourceAcceptance;
    accepted: boolean;
    effect?: SourceAcceptanceEffect;
}>;
export declare function completeSourceAcceptance(state: SourceAcceptance, step: number, hasProperty?: boolean): Readonly<{
    state: SourceAcceptance;
    accepted: boolean;
}>;
export declare function failSourceAcceptance(state: SourceAcceptance): SourceAcceptance;
export declare function claimSourceAcceptanceCleanup(state: SourceAcceptance): Readonly<{
    state: SourceAcceptance;
    accepted: boolean;
}>;
export declare function completeSourceAcceptanceCleanup(state: SourceAcceptance): Readonly<{
    state: SourceAcceptance;
    accepted: boolean;
}>;
