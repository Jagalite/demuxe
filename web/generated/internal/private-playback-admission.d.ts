// SPDX-License-Identifier: Apache-2.0
import type { Probe } from './selection.js';
export type PrivatePlaybackAssets = {
    codecProfile: 'playback' | 'playback-full';
    retainedDecoder: boolean;
    decoders: string[];
};
export declare function privatePlaybackAssets(value: unknown, runtime: string): PrivatePlaybackAssets | undefined;
/** Admission matches the installed playback codec profile and tested workload. */
export declare function privatePlaybackRejection(probe: Probe | undefined, source: {
    finite: boolean;
    bytes?: number;
}, features: {
    vf: string;
    af: string;
    toneMapping: string;
    audioOutput: string;
    gain: number;
    speed: number;
    externalSubtitles: boolean;
    customFonts: boolean;
    subtitleStyle: boolean;
}, assets?: PrivatePlaybackAssets, mode?: 'software' | 'hybrid'): "Private Software requires a finite random-access file" | "Private Software requires source inspection" | "Private Software requires a source within 64 MiB" | "Private Software currently requires a duration within 60 seconds" | "Private Hybrid requires retained decoder assets" | "Video codec is outside the private Software playback profile" | "Private Software decode dimensions exceed 1920x1080" | "Installed private playback video decoder is unavailable" | "Installed private playback audio decoder is unavailable" | "Private Software currently requires at most one 48 kHz stereo AC-3, MP2, MP3 or PCM16 track" | "Private Software filters and tone mapping are not qualified" | "Requested audio layout, gain or rate is outside the private Software profile" | "Private Software subtitle and font features are not qualified" | undefined;
