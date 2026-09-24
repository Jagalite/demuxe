// SPDX-License-Identifier: Apache-2.0
export type ExternalDecodeIntent = Readonly<{
    targetWidth: number | null;
    targetHeight: number | null;
    qualityMode: 'exact' | 'reduced';
    allowApproximation: boolean;
}>;
export declare const EXACT_DECODE_INTENT: ExternalDecodeIntent;
export declare function normalizeExternalDecodeIntent(intent?: Partial<ExternalDecodeIntent>): ExternalDecodeIntent;
export declare function chooseExternalDecoderBackend(webcodecsSupported: boolean | undefined, gpuQualified: boolean): 'webcodecs' | 'webgpu' | null;
export declare function selectExternalDecoderBackend(codec: string, webcodecsSupported: boolean | undefined): 'webcodecs' | 'webgpu' | null;
export declare function selectExternalDecoderConfiguration(codec: string, webcodecsSupported: boolean | undefined, intent?: Partial<ExternalDecodeIntent>): {
    decodeIntent?: Readonly<{
        targetWidth: number | null;
        targetHeight: number | null;
        qualityMode: "exact" | "reduced";
        allowApproximation: boolean;
    }> | undefined;
    backend: "webcodecs" | "webgpu" | null;
};
