// SPDX-License-Identifier: Apache-2.0
import { type OperationInput } from './operations.js';
import { type PlaybackInput } from './playback.js';
import { type SettingsInput } from './settings.js';
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
export type PlayerControlInput = OperationInput | PlaybackInput | SettingsInput | SourceInput | SessionObservation;
export declare function transitionPlayer(state: PlayerControlState, input: PlayerControlInput): Readonly<{
    state: Readonly<{
        revision: number;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<import("./settings.js").PlaybackSettings>;
        source: import("./source.js").SourceControl;
    }>;
    id: number | undefined;
    retire: readonly number[];
    accepted: boolean;
    attempt?: number;
    settings?: Readonly<import("./settings.js").PlaybackSettings>;
    newSource?: boolean;
    reason?: "busy" | "retired" | "phase" | "plan";
}> | Readonly<{
    state: Readonly<{
        revision: number;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<import("./settings.js").PlaybackSettings>;
        source: import("./source.js").SourceControl;
    }>;
    retire: readonly number[];
    id?: number;
    accepted: boolean;
    reason?: "destroyed" | "full" | "retired" | "order";
}>;
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export declare function sessionAuthority(state: PlayerControlState, session: number): 'accepted' | 'candidate' | 'retired';
