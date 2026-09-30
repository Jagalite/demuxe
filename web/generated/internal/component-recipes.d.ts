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
    readonly truehd: {
        readonly capability: "audio.decode.truehd";
        readonly version: 1;
        readonly profile: "48khz-integer";
    };
    readonly mlp: {
        readonly capability: "audio.decode.mlp";
        readonly version: 1;
        readonly profile: "48khz-integer";
    };
    readonly 'dts-hd': {
        readonly capability: "audio.decode.dts";
        readonly version: 1;
        readonly profile: "ma-48khz-s32p";
    };
    readonly aac: {
        readonly capability: "audio.decode.aac";
        readonly version: 1;
        readonly profile: "lc-48khz-stereo";
    };
    readonly opus: {
        readonly capability: "audio.decode.opus";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly vorbis: {
        readonly capability: "audio.decode.vorbis";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly flac: {
        readonly capability: "audio.decode.flac";
        readonly version: 1;
        readonly profile: "48khz-integer";
    };
    readonly alac: {
        readonly capability: "audio.decode.alac";
        readonly version: 1;
        readonly profile: "48khz-integer";
    };
    readonly mp3: {
        readonly capability: "audio.decode.mp3";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-s16le': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-s24le': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-s32le': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-f32le': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-f64le': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
};
export type ComponentAudioCodec = keyof typeof decode;
export declare function audioRepairRecipe(codec: ComponentAudioCodec, channels?: 2 | 6 | 8, output?: 'flac' | 'opus'): ResolvableRecipe;
export declare function packetCopyRecipe(): ResolvableRecipe;
export {};
