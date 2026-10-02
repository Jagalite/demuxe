// SPDX-License-Identifier: Apache-2.0
import type { Probe } from './media-facts.js';
import type { PlaybackSettings } from './settings.js';
export type InspectionSettings = Readonly<Pick<PlaybackSettings, 'aid' | 'sid' | 'subtitles'>>;
export type PlaybackAssetFacts = Readonly<{
    codecProfile: 'playback' | 'playback-full';
    retainedDecoder: boolean;
    decoders: string[];
    filters?: string[];
    features?: string[];
    maxHeapBytes?: number;
}>;
export type InspectionState = Readonly<{
    sourceSerial: number;
    errorSerial: number;
    probe: Readonly<{
        source: number;
        probe: Probe;
        settings: InspectionSettings;
    }> | null;
    fastSource: number | null;
    lossless: Readonly<{
        source: number;
        reason?: string;
    }> | null;
    subtitleAssets: boolean;
    selectiveAssets: boolean;
    selectiveChecked: boolean;
    transcodeAssets: boolean;
    transcodeChecked: boolean;
    playbackAvailable: boolean;
    playbackAssets: PlaybackAssetFacts | undefined;
    playbackFailure: number | null;
}>;
export declare function initialInspection(): InspectionState;
export type InspectionChange = Readonly<{
    kind: 'probe';
    value: InspectionState['probe'];
}> | Readonly<{
    kind: 'fast';
    source: number | null;
}> | Readonly<{
    kind: 'lossless';
    value: InspectionState['lossless'];
}> | Readonly<{
    kind: 'assets';
    value: Partial<Pick<InspectionState, 'subtitleAssets' | 'selectiveAssets' | 'selectiveChecked' | 'transcodeAssets' | 'transcodeChecked' | 'playbackAvailable' | 'playbackAssets'>>;
}> | Readonly<{
    kind: 'failure';
    failed: boolean;
}> | Readonly<{
    kind: 'restore';
    value: InspectionState;
}> | Readonly<{
    kind: 'source.allocate';
}> | Readonly<{
    kind: 'reset';
    scope: 'initial' | 'fallback' | 'assets';
}> | Readonly<{
    kind: 'clear';
}>;
export declare function transitionInspection(state: InspectionState, change: InspectionChange): InspectionState;
/** Decisions consume normalized source/configuration facts, never File or DOM handles. */
export declare function fastInspectionAllowed(facts: Readonly<{
    local: boolean;
    privateDemuxer: boolean;
    preserve: boolean;
    componentRepairRetry: boolean;
    textTracks: number;
    aid: string;
    sid: string;
    filename: string;
}>): boolean;
export declare function inspectionSelection(probe: Probe, facts: Readonly<{
    settings: InspectionSettings;
    preserve: boolean;
    mode: string;
    hasSource: boolean;
    textTracks: number;
    remuxTracks: boolean;
    publicAudio?: string;
    publicSubtitle?: string;
}>): InspectionSettings;
export declare function initialInspectionPolicy(facts: Readonly<{
    automatic: boolean;
    mode: string;
    privateRemux: boolean;
    provider: boolean;
    canInspect: boolean;
    quality: string;
    adaptive: boolean;
    inspected: boolean;
    start: number;
    videoFilters: string;
    audioFilters: string;
    toneMapping: string;
    localDemuxer?: string;
    remoteDemuxer?: string;
    remoteFormat?: string;
}>): Readonly<{
    privateForced: boolean;
    qualityForced: boolean;
    normal: boolean;
    manifest: boolean;
}>;
export declare function optionalInspectionFallback(facts: Readonly<{
    privateRemux: boolean;
    policy: string;
    preserve: boolean;
    inspectOnly: boolean;
    remote: boolean;
    identity: boolean;
    aid: string;
    sid: string;
    provider: boolean;
    retired: boolean;
    assetFailure: boolean;
    terminalSource: boolean;
    rangeReturnedWhole: boolean;
    directAdmitted: boolean;
}>): boolean;
