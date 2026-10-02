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
    workSerial: number;
    work: InspectionWork | null;
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
export type InspectionChange = InspectionWorkChange | Readonly<{
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
export type InitialInspectionFacts = Readonly<{
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
}>;
export type InspectionPhase = 'deployment' | 'configure' | 'private-probe' | 'private-assets' | 'webgpu' | 'quality' | 'prepare' | 'fallback' | 'manifest' | 'normal-start' | 'fast' | 'unavailable' | 'ffmpeg' | 'classify' | 'assets' | 'fast-admission' | 'publish' | 'replace' | 'discover' | 'return' | 'failed';
export type InspectionLease = Readonly<{
    id: number;
    epoch: number;
    operation: number | null;
}>;
export type InspectionWork = InspectionLease & Readonly<{
    source: number;
    phase: InspectionPhase;
    facts: InitialInspectionFacts | null;
    preserve: boolean;
    inspectOnly: boolean;
    componentRepairRetry: boolean;
    candidate: Probe | null;
    fast: boolean;
    fastFacts: readonly string[];
    pass: number;
    nativeReason: string | undefined;
    notice: Readonly<{
        outcome: 'selected' | 'skipped' | 'failed';
        reason: string;
    }> | null;
}>;
export type InspectionFailureFacts = Readonly<{
    code: string;
    message: string;
    terminalSource: boolean;
    provider: boolean;
    rangeReturnedWhole: boolean;
    optional: Parameters<typeof optionalInspectionFallback>[0];
}>;
export type InspectionWorkChange = Readonly<{
    kind: 'work.begin';
    epoch: number;
    operation: number | null;
    source: number;
    provider: boolean;
    preserve: boolean;
    inspectOnly: boolean;
}> | Readonly<{
    kind: 'work.configured';
    id: number;
    facts: InitialInspectionFacts;
}> | Readonly<{
    kind: 'work.deployed' | 'work.private-assets' | 'work.webgpu' | 'work.assets' | 'work.unavailable';
    id: number;
}> | Readonly<{
    kind: 'work.prepared';
    id: number;
    componentRepairRetry: boolean;
}> | Readonly<{
    kind: 'work.private-probe';
    id: number;
    probe: Probe;
    settings: InspectionSettings;
}> | Readonly<{
    kind: 'work.quality';
    id: number;
    probe?: Probe;
    settings: InspectionSettings;
}> | Readonly<{
    kind: 'work.fallback' | 'work.manifest';
    id: number;
    nativeReason?: string;
}> | Readonly<{
    kind: 'work.normal-start';
    id: number;
    fastAllowed: boolean;
}> | Readonly<{
    kind: 'work.fast';
    id: number;
    probe?: Probe;
    available: readonly string[];
    bytes: number;
    reason?: string;
}> | Readonly<{
    kind: 'work.ffmpeg';
    id: number;
    probe?: Probe;
}> | Readonly<{
    kind: 'work.classified';
    id: number;
    settings: InspectionSettings;
    nativeReason?: string;
}> | Readonly<{
    kind: 'work.fast-admission';
    id: number;
    missing: readonly string[];
    first?: string;
}> | Readonly<{
    kind: 'work.published';
    id: number;
}> | Readonly<{
    kind: 'work.failed';
    id: number;
    failure: InspectionFailureFacts;
}> | Readonly<{
    kind: 'work.finished';
    id: number;
    epoch: number;
    operation: number | null;
}>;
export type InitialInspectionEffect = Readonly<{
    kind: InspectionPhase;
    lease: InspectionLease;
}>;
export declare function selectInitialInspectionEffect(state: InspectionState): InitialInspectionEffect | undefined;
export declare function inspectionLeaseCurrent(state: InspectionState, lease: InspectionLease): boolean;
/** Only normal-inspector failures can request a browser Direct admission check. */
export declare function inspectionFailureRouteCheck(state: InspectionState, error: InspectionFailureFacts): boolean;
export declare function isInspectionWorkChange(change: InspectionChange): change is InspectionWorkChange;
