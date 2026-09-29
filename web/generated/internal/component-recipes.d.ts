// SPDX-License-Identifier: Apache-2.0
import type { ResolvableRecipe } from './provider-resolution.js';
declare const decode: {
    readonly ac3: {
        readonly capability: "audio.decode.ac3";
        readonly version: 1;
        readonly profile: "48khz-fltp";
    };
    readonly eac3: {
        readonly capability: "audio.decode.eac3";
        readonly version: 1;
        readonly profile: "48khz-fltp";
    };
    readonly 'dts-core': {
        readonly capability: "audio.decode.dts";
        readonly version: 1;
        readonly profile: "core-48khz-fltp";
    };
};
export type ComponentAudioCodec = keyof typeof decode;
export declare function audioRepairRecipe(codec: ComponentAudioCodec): ResolvableRecipe;
export declare function packetCopyRecipe(): ResolvableRecipe;
export {};
