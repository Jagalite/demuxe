// SPDX-License-Identifier: Apache-2.0
export declare const qualifiedWebGPUCodecs: Readonly<Record<string, {
    module: string;
    assets: string[];
    requiredFeatures: string[];
}>>;
export declare function webgpuDecoderSupported(codec: string): boolean;
export declare function hasQualifiedWebGPUCodecs(): boolean;
