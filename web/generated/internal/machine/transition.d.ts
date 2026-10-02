// SPDX-License-Identifier: Apache-2.0
import { type BoundaryInput, type BoundaryEffect } from './playback-boundary.js';
import { type OperationInput } from './operations.js';
import { type PlaybackInput } from './playback.js';
import { type SettingsInput, type SettingTransactionInput, type SettingEffect } from './settings.js';
import { type SourceInput } from './source.js';
import type { PlayerControlState } from './state.js';
export type SessionObservation = Readonly<{
    type: 'playback.sample';
    session: number;
    sequence: number;
    observation: 'waiting' | 'playing' | 'time' | 'pause';
    value?: number | boolean;
    publishedTime?: number;
}>;
export type PlayerControlInput = BoundaryInput | OperationInput | PlaybackInput | SettingsInput | SettingTransactionInput | SourceInput | SessionObservation;
export type PlayerControlDecision = Readonly<{
    state: PlayerControlState;
    accepted: boolean;
    id?: number;
    reason?: string;
    message?: string;
    retire: readonly number[];
    effects?: readonly (SettingEffect | BoundaryEffect)[];
}>;
export declare function transitionPlayer(state: PlayerControlState, input: PlayerControlInput): PlayerControlDecision;
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export declare function sessionAuthority(state: PlayerControlState, session: number): 'accepted' | 'candidate' | 'retired';
