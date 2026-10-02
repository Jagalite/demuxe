// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, LoopPolicy, PlaybackRange, QualityPolicy, SubtitleStyle } from '../../types.js';
import type { PlayerControlState } from './state.js';
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
    muted: boolean;
    outputDeviceId: string;
    buffering: BufferingPolicy;
    subtitleDelay: number;
    audioDelay: number;
    subtitleStyle: Readonly<SubtitleStyle>;
    playbackRange: Readonly<PlaybackRange> | null;
    loopPolicy: LoopPolicy;
    qualityPolicy: QualityPolicy | null;
}>;
export declare function initialPreferences(): PlayerPreferences;
export declare function changePreferences(state: PlayerPreferences, value: Partial<PlayerPreferences>): PlayerPreferences;
export declare function clearSourcePreferences(state: PlayerPreferences): PlayerPreferences;
export type SettingCommand = Readonly<{
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
}>;
export type SettingEffect = Readonly<{
    kind: 'volume' | 'rate' | 'gain';
    value: number;
}> | Readonly<{
    kind: 'subtitles';
    value: boolean;
}> | Readonly<{
    kind: 'pause' | 'play';
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
    kind: 'source.reconfigure';
    settings: Readonly<PlaybackSettings>;
}>;
export type SettingTransaction = Readonly<{
    id: number;
    operation: number;
    epoch: number;
    session: number | null;
    phase: 'applying' | 'compensating' | 'accepted';
    reconfigure: boolean;
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
}> | Readonly<{
    type: 'setting.accept' | 'setting.failed' | 'setting.restored' | 'setting.degraded';
    id: number;
}>;
export declare function settingAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionSettingTransaction(state: PlayerControlState, input: SettingTransactionInput): Readonly<{
    state: Readonly<{
        revision: number;
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
    reason: "retired" | undefined;
    retire: readonly number[];
}>;
