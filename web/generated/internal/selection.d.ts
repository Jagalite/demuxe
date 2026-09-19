// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../types.js';
export type ProbeTrack = {
    id: string;
    index: number;
    type: string;
    codec: string;
    codecString?: string;
    default?: boolean;
    forced?: boolean;
    channels?: number;
    aacObject?: number;
    attachedPicture?: boolean;
    sampleRate?: number;
    bits?: number;
    startTime?: number;
    endTime?: number;
    width?: number;
    height?: number;
};
export type Probe = {
    tracks: ProbeTrack[];
    duration: number;
    format?: string;
    identity?: {
        size: string;
        etag?: string;
    };
};
/** Narrow file-only automatic FLAC admission. Unknown or unequal ends are rejected.
 * The runtime still verifies packets, samples, actual MSE output and work bounds. */
export declare function losslessAdaptationRejection(probe: Probe, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}): string | undefined;
export type SelectionAttempt = {
    mode: PlaybackMode | 'probe';
    outcome: 'skipped' | 'failed' | 'selected';
    reason: string;
};
export declare function nativeRejection(probe: Probe, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}, _video?: HTMLVideoElement): string | undefined;
/** These are Demuxe's packet-construction contracts, not browser support.
 * An absent contract excludes preparation only; direct playback stays testable. */
export declare function remuxRejection(probe: Probe, settings: {
    aid: string;
}): string | undefined;
