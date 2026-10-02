// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode, SnapshotOptions } from '../../types.js';
import type { PlayerControlState } from './state.js';
import type { PlayerControlDecision } from './transition.js';
type Phase = 'pausing' | 'stepping' | 'sampling' | 'waiting' | 'verifying' | 'capturing' | 'live' | 'finished';
export type SnapshotFacts = Readonly<{
    hasSurface: boolean;
    hasVideo: boolean;
    subtitle: boolean;
    readback: boolean;
    width: number;
    height: number;
}>;
export type SnapshotPlan = Readonly<{
    kind: 'native' | 'mpv';
    width: number;
    height: number;
    includesSubtitles: boolean;
}>;
export type PlayerActionState = Readonly<{
    serial: number;
    pending: Readonly<{
        id: number;
        operation: number;
        epoch: number;
        session: number;
        mode: PlaybackMode;
        phase: Phase;
        direction: 1 | -1;
        initial: number;
        deadline: number | null;
        target: number | null;
        snapshot: SnapshotPlan | null;
    }> | null;
}>;
export type PlayerActionScope = Readonly<{
    epoch: number;
    session: number | null;
    operation: number | null;
}>;
export type PlayerActionInput = Readonly<{
    type: 'action.step';
    scope: PlayerActionScope;
    direction: 1 | -1;
    hasVideo: boolean;
    initial: number;
}> | Readonly<{
    type: 'action.snapshot';
    scope: PlayerActionScope;
    options: Readonly<SnapshotOptions>;
    facts: SnapshotFacts;
}> | Readonly<{
    type: 'action.live';
    scope: PlayerActionScope;
    supported: boolean;
}> | Readonly<{
    type: 'action.completed';
    id: number;
    phase: Phase;
    now?: number;
}> | Readonly<{
    type: 'action.sample';
    id: number;
    now: number;
    time: number;
}> | Readonly<{
    type: 'action.finished';
    id: number;
}>;
export type PlayerActionEffect = Readonly<{
    kind: 'action.pause';
}> | Readonly<{
    kind: 'action.step';
    direction: 1 | -1;
}> | Readonly<{
    kind: 'action.sample';
}> | Readonly<{
    kind: 'action.wait';
    milliseconds: 20;
}> | Readonly<{
    kind: 'action.verify';
    target: number;
}> | Readonly<{
    kind: 'action.capture';
    plan: SnapshotPlan;
}> | Readonly<{
    kind: 'action.live';
}>;
export declare function initialPlayerActions(): PlayerActionState;
export declare function retirePlayerActions(state: PlayerActionState): PlayerActionState;
export declare function playerActionAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionPlayerAction(state: PlayerControlState, input: PlayerActionInput): PlayerControlDecision;
export {};
