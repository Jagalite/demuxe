// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { Probe } from './media-facts.js';
export type { Probe, ProbeTrack } from './media-facts.js';
/** Narrow file-only automatic FLAC admission. Unknown or unequal ends are rejected.
 * The runtime still verifies packets, samples, actual MSE output and work bounds. */
export declare function losslessAdaptationRejection(probe: Probe, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}): string | undefined;
/** Transcoding replaces selected audio only. Decoder output supplies the speaker
 * layout; runtime packet/sample continuity and browser output remain mandatory. */
export declare function audioTranscodeRejection(probe: Probe, settings: {
    aid: string;
}): string | undefined;
/** A simple browser-supported HLS VOD may avoid a JS streaming engine. All
 * controlled adaptive behavior belongs to Shaka, then eligible mpv fallback.
 * A browser hint admits a trial; actual output is verified separately. */
export declare function nativeManifestRejection(source: Readonly<{
    demuxer?: string;
    format?: string;
    streaming?: Readonly<{
        live?: boolean;
        maxBandwidth?: number;
        representation?: string;
    }>;
}>, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}, browserNativeHLS?: boolean): string | undefined;
export type SelectionAttempt = {
    mode: PlaybackMode | 'probe';
    outcome: 'skipped' | 'failed' | 'selected';
    reason: string;
};
export declare function nativeRejection(probe: Probe, settings: {
    aid: string;
    sid: string;
    subtitles: boolean;
}): string | undefined;
/** These are Demuxe's packet-construction contracts, not browser support.
 * An absent contract excludes preparation only; direct playback stays testable. */
export declare function remuxRejection(probe: Probe, settings: {
    aid: string;
}): string | undefined;
