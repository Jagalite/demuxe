// SPDX-License-Identifier: Apache-2.0
export type ExternalDecoderLease = Readonly<{
    id: number;
    generation: number;
}>;
export type ExternalDecoderState = Readonly<{
    serial: number;
    generation: number;
    current: Readonly<ExternalDecoderLease & {
        phase: 'acquiring' | 'configured';
    }> | null;
}>;
export declare function initialExternalDecoder(): ExternalDecoderState;
export declare function externalDecoderCurrent(state: ExternalDecoderState, lease: ExternalDecoderLease): boolean;
/** Reserve the successor before closing a previous browser handle. A close
 * callback can retire this reservation or install a newer one synchronously. */
export declare function beginExternalDecoderConfiguration(state: ExternalDecoderState): Readonly<{
    state: ExternalDecoderState;
    lease: ExternalDecoderLease;
    close: number | null;
}>;
export declare function acceptExternalDecoderConfiguration(state: ExternalDecoderState, lease: ExternalDecoderLease): ExternalDecoderState;
export declare function retireExternalDecoder(state: ExternalDecoderState, lease?: ExternalDecoderLease): Readonly<{
    state: ExternalDecoderState;
    close: number | null;
}>;
export declare function externalDecoderSubmission(state: ExternalDecoderState, lease: ExternalDecoderLease | null, facts: Readonly<{
    present: boolean;
    closed: boolean;
    queued: number;
}>): 'closed' | 'again' | 'submit';
