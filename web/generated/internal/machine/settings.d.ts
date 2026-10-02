// SPDX-License-Identifier: Apache-2.0
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
