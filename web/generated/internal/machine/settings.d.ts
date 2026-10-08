// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, LoopPolicy, PlaybackRange, QualityPolicy, SubtitleStyle, ToneMapping, PlaybackMode, TrackTypePolicy } from '../../types.js';
import type { PlayerControlState } from './state.js';
import { type TrackSelectionFacts } from './track-selection.js';
import { type RangeFacts } from './playback-boundary.js';
/** Accepted values only. Desired transaction values remain detached until the
 * source/settings acceptance transition commits them together. */
export type PlaybackSettings = {
    pause: boolean;
    volume: number;
    speed: number;
    aid: string;
    sid: string;
    subtitles: boolean;
    vf: string;
    af: string;
    gain: number;
};
export type SettingsInput = Readonly<{
    type: 'settings.accept';
    value: Readonly<PlaybackSettings>;
}> | Readonly<{
    type: 'settings.change';
    value: Readonly<Partial<PlaybackSettings>>;
}>;
export declare function initialSettings(): Readonly<PlaybackSettings>;
export declare function transitionSettings(state: Readonly<PlaybackSettings>, input: SettingsInput): Readonly<PlaybackSettings>;
export type PlayerPreferences = Readonly<{
    publicSelections: Readonly<Partial<Record<'audio' | 'sub', string>>>;
    outputSize: Readonly<{
        width: number;
        height: number;
    }>;
    muted: boolean;
    outputDeviceId: string;
    buffering: BufferingPolicy;
    toneMapping: ToneMapping;
    subtitleDelay: number;
    audioDelay: number;
    subtitleStyle: Readonly<SubtitleStyle>;
    playbackRange: Readonly<PlaybackRange> | null;
    loopPolicy: LoopPolicy;
    qualityPolicy: QualityPolicy | null;
}>;
export declare function initialPreferences(): PlayerPreferences;
export declare function effectiveVideoFilters(settings: Readonly<PlaybackSettings>, preferences: PlayerPreferences): string;
export declare function validOutputSize(width: number, height: number): boolean;
export declare function changePreferences(state: PlayerPreferences, value: Partial<PlayerPreferences>): PlayerPreferences;
export declare function clearSourcePreferences(state: PlayerPreferences): PlayerPreferences;
export type SettingCommand = Readonly<{
    kind: 'automatic';
    value: boolean;
}> | Readonly<{
    kind: 'mode';
    value: PlaybackMode;
}> | Readonly<{
    kind: 'routedGain';
    value: number;
    plan?: string;
    direct: boolean;
}> | Readonly<{
    kind: 'volume' | 'rate' | 'gain';
    value: number;
}> | Readonly<{
    kind: 'mute' | 'subtitles';
    value: boolean;
}> | Readonly<{
    kind: 'pause';
}> | Readonly<{
    kind: 'track';
    track: 'audio' | 'sub';
    value: string;
    verify?: boolean;
    clearPublicSelection?: boolean;
}> | Readonly<{
    kind: 'publicTrack';
    track: 'audio' | 'sub';
    id: string | null;
    facts: TrackSelectionFacts;
}> | Readonly<{
    kind: 'visibility';
    value: boolean;
    facts: Readonly<{
        policy: TrackTypePolicy | undefined;
        hasTracks: boolean;
        surfaceLocked: boolean;
        plan: string | undefined;
    }>;
}> | Readonly<{
    kind: 'buffering';
    value: BufferingPolicy;
}> | Readonly<{
    kind: 'output';
    value: string;
}> | Readonly<{
    kind: 'quality';
    value: QualityPolicy;
    previous: QualityPolicy;
}> | Readonly<{
    kind: 'subtitleDelay' | 'audioDelay';
    value: number;
}> | Readonly<{
    kind: 'subtitleStyle';
    value: SubtitleStyle;
}> | Readonly<{
    kind: 'filters';
    key: 'vf' | 'af';
    value: string;
}> | Readonly<{
    kind: 'toneMapping';
    value: ToneMapping;
}> | Readonly<{
    kind: 'range';
    value: PlaybackRange | null;
    facts: RangeFacts;
}> | Readonly<{
    kind: 'loop';
    value: LoopPolicy;
    facts: RangeFacts;
}>;
export type SettingEffect = Readonly<{
    kind: 'volume' | 'rate' | 'gain';
    value: number;
}> | Readonly<{
    kind: 'subtitles';
    value: boolean;
}> | Readonly<{
    kind: 'pause' | 'play' | 'seek.resume';
}> | Readonly<{
    kind: 'track';
    track: 'audio' | 'sub';
    value: string;
}> | Readonly<{
    kind: 'track.verify';
    track: 'audio' | 'sub';
    value: string;
    settings: Readonly<PlaybackSettings>;
}> | Readonly<{
    kind: 'buffering';
    value: BufferingPolicy;
}> | Readonly<{
    kind: 'output';
    value: string;
}> | Readonly<{
    kind: 'quality';
    value: QualityPolicy;
}> | Readonly<{
    kind: 'filter';
    key: 'vf' | 'af';
    value: string;
}> | Readonly<{
    kind: 'promotion' | 'gain.evidence';
}> | Readonly<{
    kind: 'mode.ready';
    mode: PlaybackMode;
}> | Readonly<{
    kind: 'seek' | 'seek.verify';
    value: number;
}> | Readonly<{
    kind: 'source.reconfigure';
    settings: Readonly<PlaybackSettings>;
}> | Readonly<{
    kind: 'source.replace';
    settings: Readonly<PlaybackSettings>;
    mode: PlaybackMode;
}>;
export type SettingTransaction = Readonly<{
    id: number;
    operation: number;
    epoch: number;
    session: number | null;
    phase: 'applying' | 'compensating' | 'accepted';
    reconfigure: boolean;
    promote: boolean;
    mode?: PlaybackMode;
    automatic?: boolean;
    automaticDuringApply: boolean;
    resumeSuppressed?: boolean;
    after: readonly SettingEffect[];
    settings: Readonly<PlaybackSettings>;
    preferences: PlayerPreferences;
    settingsPatch: Readonly<Partial<PlaybackSettings>>;
    preferencesPatch: Readonly<Partial<PlayerPreferences>>;
    rollback: readonly SettingEffect[];
}>;
export type SettingsTransactions = Readonly<{
    serial: number;
    pending: SettingTransaction | null;
    degraded: Readonly<{
        id: number;
        operation: number;
        session: number | null;
    }> | null;
}>;
export declare function initialSettingsTransactions(): SettingsTransactions;
export type SettingTransactionInput = Readonly<{
    type: 'preferences.change';
    value: Partial<PlayerPreferences>;
}> | Readonly<{
    type: 'setting.begin';
    command: SettingCommand;
    hasBackend: boolean;
    hasSource?: boolean;
    hybridAudioFilters?: boolean;
}> | Readonly<{
    type: 'setting.resume' | 'setting.accept' | 'setting.failed' | 'setting.restored' | 'setting.degraded';
    id: number;
}>;
export declare function settingAutomaticSelection(state: PlayerControlState): boolean;
export declare function settingAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionSettingTransaction(state: PlayerControlState, input: SettingTransactionInput): Readonly<{
    state: Readonly<{
        revision: number;
        captureRevision: number;
        transport: import("./player-transport.js").PlayerTransportState;
        trackConfirmation: import("./track-confirmation.js").TrackConfirmationState;
        resources: import("./resource-ledger.js").ResourceLedgerState;
        executor: import("./effect-runtime.js").EffectRuntimeState;
        readiness: import("./player-readiness.js").PlayerReadinessState;
        actions: import("./player-actions.js").PlayerActionState;
        publication: import("./player-publication.js").PlayerPublicationState;
        monitor: import("./player-monitor.js").PlayerMonitorState;
        attachments: import("./attachments.js").AttachmentState;
        routing: import("./route-state.js").RoutingState;
        boundary: import("./playback-boundary.js").BoundaryState;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<PlaybackSettings>;
        preferences: PlayerPreferences;
        settingsTransactions: SettingsTransactions;
        source: import("./source.js").SourceControl;
    }>;
    accepted: boolean;
    id: number | undefined;
    effects: readonly SettingEffect[];
    message: string | undefined;
    reason: "unsupported" | "retired" | "invalid" | undefined;
    retire: readonly number[];
}>;
