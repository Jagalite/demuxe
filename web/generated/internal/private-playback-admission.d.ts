// SPDX-License-Identifier: Apache-2.0
import type { Probe } from './selection.js';
export type PrivatePlaybackAssets = {
    codecProfile: 'playback' | 'playback-full';
    retainedDecoder: boolean;
    decoders: string[];
    filters?: string[];
    features?: string[];
    maxHeapBytes?: number;
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
}, assets?: PrivatePlaybackAssets, mode?: 'software' | 'hybrid'): string | undefined;
/** Bound manifest bytes before JSON allocation, including chunked responses. */
export declare function readPrivatePlaybackAssets(response: Response, runtime: string): Promise<PrivatePlaybackAssets | undefined>;
