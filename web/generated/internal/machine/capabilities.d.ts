// SPDX-License-Identifier: Apache-2.0
import type { BufferingResolution, PlaybackMode, PlayerCapabilities, PlayerState } from '../../types.js';
/** Observations captured by the shell; no backend instances or ambient APIs.
 * previousDuration deliberately describes the preceding published snapshot.
 * Its initial undefined value is distinct from a known null duration. */
export type CapabilityFacts = Readonly<{
    mode: PlaybackMode;
    hasSession: boolean;
    automaticSelection: boolean;
    previousDuration: number | null | undefined;
    backendPlan: string | null;
    nativeASS: boolean;
    privateRemux: boolean;
    privateFull: boolean;
    providerRuntime: boolean;
    hybridAudioFilters: boolean;
    nativeRemux: 'auto' | 'never' | 'always';
    canInspectFFmpeg: boolean;
    /** Null also represents a local source or an unspecified remote format. */
    remoteFormat: 'file' | 'hls' | 'dash' | null;
    backendMpvSubtitles: boolean;
    backendSetQuality: boolean;
    backendSeekToLive: boolean;
    backendNativeLive: boolean;
    isolated: boolean;
    webCodecs: boolean;
    mediaSource: boolean;
    webAudio: boolean;
    bufferingBackend: BufferingResolution['backend'];
    bufferingControl: BufferingResolution['control'];
}>;
/** Inactive extraction of Player's capability projection. Preserve legacy
 * precedence and reasons, including route availability before a source opens.
 * This selector does not admit routes or execute feature requests. */
export declare function selectCapabilities(facts: CapabilityFacts, seekable: PlayerState['seekable'], audioTrackCount: number, subtitleTrackCount: number): PlayerCapabilities;
