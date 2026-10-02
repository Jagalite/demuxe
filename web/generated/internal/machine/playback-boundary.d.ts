// SPDX-License-Identifier: Apache-2.0
import type { PlaybackRange, LoopPolicy } from '../../types.js';
import type { PlayerControlState } from './state.js';
export type RangeFacts = Readonly<{
    hasBackend: boolean;
    time: number;
    duration: number | null;
    seekable: readonly Readonly<PlaybackRange>[];
}>;
export type RangeRejection = Readonly<{
    reason: 'invalid' | 'unsupported';
    message: string;
}>;
export declare function validatePlaybackRange(range: Readonly<PlaybackRange> | null, facts: RangeFacts): RangeRejection | undefined;
export declare function rangeRequirement(kind: 'range' | 'loop', value: Readonly<PlaybackRange> | LoopPolicy | null, range: Readonly<PlaybackRange> | null, loop: LoopPolicy, facts: RangeFacts): Readonly<{
    rejection?: RangeRejection;
    seek?: number;
}>;
type Phase = 'queued' | 'pausing' | 'seeking' | 'verifying' | 'resuming' | 'finished';
export type BoundaryState = Readonly<{
    serial: number;
    pending: Readonly<{
        id: number;
        epoch: number;
        session: number;
        operation: number | null;
        phase: Phase;
        loop: boolean;
        position: number;
    }> | null;
}>;
export type BoundaryInput = Readonly<{
    type: 'boundary.sample';
    time: number;
    duration: number | null;
    ended: boolean;
}> | Readonly<{
    type: 'boundary.start';
    id: number;
    time: number;
    duration: number | null;
    ended: boolean;
}> | Readonly<{
    type: 'boundary.complete';
    id: number;
    phase: Phase;
}> | Readonly<{
    type: 'boundary.failed';
    id: number;
}> | Readonly<{
    type: 'boundary.settled';
    id: number;
}>;
export type BoundaryEffect = Readonly<{
    kind: 'pause' | 'play';
}> | Readonly<{
    kind: 'seek' | 'seek.verify';
    value: number;
}>;
export declare function initialBoundary(): BoundaryState;
export declare function boundaryAuthority(state: PlayerControlState, id: number): boolean;
/** Automatic boundary work shares the Player's operation/session authority.
 * Each completed physical step re-enters this transition before the next runs.
 * Finished work retains its lease until queue publication has completed. */
export declare function transitionBoundary(state: PlayerControlState, input: BoundaryInput): Readonly<{
    state: Readonly<{
        revision: number;
        boundary: BoundaryState;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<import("./settings.js").PlaybackSettings>;
        preferences: import("./settings.js").PlayerPreferences;
        settingsTransactions: import("./settings.js").SettingsTransactions;
        source: import("./source.js").SourceControl;
    }>;
    accepted: boolean;
    effects: readonly BoundaryEffect[];
    id: number | undefined;
    retire: readonly number[];
}>;
export {};
