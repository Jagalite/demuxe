// SPDX-License-Identifier: Apache-2.0
import { type PlayerPublicationInput } from './player-publication.js';
import type { PlayerProjection } from './selectors.js';
import { type PlayerMonitorInput } from './player-monitor.js';
import { type BoundaryInput, type BoundaryEffect } from './playback-boundary.js';
import { type OperationInput } from './operations.js';
import { type PlaybackInput } from './playback.js';
import { type SettingsInput, type SettingTransactionInput, type SettingEffect } from './settings.js';
import { type SourceInput } from './source.js';
import { type AttachmentInput, type AttachmentEffect } from './attachments.js';
import { type RoutingInput } from './route-state.js';
import type { PlayerControlState } from './state.js';
export type SessionObservation = Readonly<{
    type: 'playback.sample';
    session: number;
    sequence: number;
    observation: 'waiting' | 'playing' | 'time' | 'pause';
    value?: number | boolean;
    publishedTime?: number;
}>;
export type PlayerControlInput = PlayerPublicationInput | PlayerMonitorInput | RoutingInput | AttachmentInput | BoundaryInput | OperationInput | PlaybackInput | SettingsInput | SettingTransactionInput | SourceInput | SessionObservation;
export type PlayerControlDecision<Effect = SettingEffect | BoundaryEffect | AttachmentEffect> = Readonly<{
    state: PlayerControlState;
    accepted: boolean;
    id?: number;
    reason?: string;
    message?: string;
    retire: readonly number[];
    effects?: readonly Effect[];
    publication?: PlayerProjection;
}>;
/** Publication bookkeeping does not invalidate an otherwise current capture.
 * Every domain change still advances the same composed authority revision. */
export declare function transitionPlayer(state: PlayerControlState, input: PlayerControlInput): PlayerControlDecision;
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export declare function sessionAuthority(state: PlayerControlState, session: number): 'accepted' | 'candidate' | 'retired';
