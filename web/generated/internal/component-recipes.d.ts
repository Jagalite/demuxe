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
    readonly 'adpcm-ima-qt': {
        readonly capability: "audio.decode.adpcm-ima-qt";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'adpcm-g726': {
        readonly capability: "audio.decode.adpcm-g726";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'adpcm-g726le': {
        readonly capability: "audio.decode.adpcm-g726le";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'pcm-alaw': {
        readonly capability: "audio.decode.pcm-alaw";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'pcm-mulaw': {
        readonly capability: "audio.decode.pcm-mulaw";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly gsm: {
        readonly capability: "audio.decode.gsm";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'gsm-ms': {
        readonly capability: "audio.decode.gsm-ms";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'adpcm-ms': {
        readonly capability: "audio.decode.adpcm-ms";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly 'adpcm-ima-wav': {
        readonly capability: "audio.decode.adpcm-ima-wav";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly shorten: {
        readonly capability: "audio.decode.shorten";
        readonly version: 1;
        readonly profile: "canonical-integer";
    };
    readonly tak: {
        readonly capability: "audio.decode.tak";
        readonly version: 1;
        readonly profile: "canonical-integer";
    };
    readonly tta: {
        readonly capability: "audio.decode.tta";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly ape: {
        readonly capability: "audio.decode.ape";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly wavpack: {
        readonly capability: "audio.decode.wavpack";
        readonly version: 1;
        readonly profile: "configured-integer";
    };
    readonly mp2: {
        readonly capability: "audio.decode.mp2";
        readonly version: 1;
        readonly profile: "configured-pcm";
    };
    readonly wmav1: {
        readonly capability: "audio.decode.wmav1";
        readonly version: 1;
        readonly profile: "configured-pcm";
    };
    readonly wmav2: {
        readonly capability: "audio.decode.wmav2";
        readonly version: 1;
        readonly profile: "configured-pcm";
    };
    readonly mp3: {
        readonly capability: "audio.decode.mp3";
        readonly version: 1;
        readonly profile: "48khz-stereo";
    };
    readonly 'pcm-u8': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "integer-8bit";
    };
    readonly 'pcm-s8': {
        readonly capability: "audio.decode.pcm";
        readonly version: 1;
        readonly profile: "integer-8bit";
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
export declare function audioRepairRecipe(codec: ComponentAudioCodec, channels?: 1 | 2 | 6 | 8, output?: 'flac' | 'opus', container?: 'matroska' | 'isobmff' | 'wave-aiff' | 'ogg' | 'wavpack' | 'ape' | 'tta' | 'tak' | 'shorten' | 'adpcm-wave' | 'telephony' | 'wave-g726', sampleRate?: 8000 | 16000 | 22050 | 32000 | 44100 | 48000 | 96000, aacProfile?: 'lc' | 'he' | 'he-v2' | 'usac'): ResolvableRecipe;
export declare function packetCopyRecipe(): ResolvableRecipe;
export declare function webmPacketCopyRecipe(): ResolvableRecipe;
export type G726RawCodec = 'adpcm-g726' | 'adpcm-g726le';
export type G726RawBits = 2 | 3 | 4 | 5;
/** Raw G726 has no header: callers own codec packing and coded width explicitly. */
export declare function g726RawRepairRecipe(codec: G726RawCodec, bits: G726RawBits): ResolvableRecipe;
export {};
