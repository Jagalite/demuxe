// SPDX-License-Identifier: Apache-2.0
export declare function chooseExternalDecoderBackend(webcodecsSupported: boolean | undefined, gpuQualified: boolean): 'webcodecs' | 'webgpu' | null;
export declare function selectExternalDecoderBackend(codec: string, webcodecsSupported: boolean | undefined): 'webcodecs' | 'webgpu' | null;
