// SPDX-License-Identifier: Apache-2.0
export interface MetadataBudgetState {
    readonly reads: number;
    readonly bytes: number;
    readonly reservedBytes: number;
    readonly batches: number;
    readonly active: number;
    readonly processingMs: number;
    readonly processingSince: number | null;
}
export declare const initialMetadataBudget: () => MetadataBudgetState;
export declare function metadataParseMs(s: MetadataBudgetState, now: number): number;
export declare function metadataParseAvailable(s: MetadataBudgetState, now: number): boolean;
export declare function metadataReadsAvailable(s: MetadataBudgetState, count: number): boolean;
export declare function admitMetadataTransfer(s: MetadataBudgetState, reads: number, bytes: number, now: number): MetadataBudgetState;
export declare function recordMetadataBytes(s: MetadataBudgetState, bytes: number): MetadataBudgetState;
export declare function finishMetadataTransfer(s: MetadataBudgetState, now: number): MetadataBudgetState;
