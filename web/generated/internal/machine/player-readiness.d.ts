// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { PlayerControlState } from './state.js';
import type { PlayerControlDecision } from './transition.js';
type Phase = 'native' | 'sampling' | 'confirming' | 'waiting' | 'finished';
export type PlayerReadinessState = Readonly<{
    serial: number;
    pending: Readonly<{
        id: number;
        epoch: number;
        operation: number;
        session: number;
        mode: PlaybackMode;
        phase: Phase;
        target: number;
        deadline: number | null;
    }> | null;
}>;
export type ReadinessFacts = Readonly<{
    trackCount: number;
    hasVideo: boolean;
    selectedAudio: boolean;
    audioConfigured: boolean;
    unsupportedVideo: boolean;
    rendered: boolean;
    decoderCompatible: boolean;
    seeking: boolean;
    position: number | null;
}>;
export type PlayerReadinessInput = Readonly<{
    type: 'readiness.begin';
    epoch: number;
    operation: number | null;
    session: number | null;
    mode: PlaybackMode;
    target: number;
    now?: number;
    expected?: Readonly<{
        video: boolean;
        audio: boolean;
    }>;
}> | Readonly<{
    type: 'readiness.sample';
    id: number;
    now: number;
    failed: boolean;
    boundary?: number;
    facts?: ReadinessFacts;
}> | Readonly<{
    type: 'readiness.completed';
    id: number;
    phase: Phase;
    confirmed?: boolean;
}> | Readonly<{
    type: 'readiness.finished';
    id: number;
}>;
export type PlayerReadinessEffect = Readonly<{
    kind: 'readiness.native';
    expected?: Readonly<{
        video: boolean;
        audio: boolean;
    }>;
}> | Readonly<{
    kind: 'readiness.sample';
    deadline: number;
}> | Readonly<{
    kind: 'readiness.confirm';
    target: number;
}> | Readonly<{
    kind: 'readiness.wait';
    milliseconds: 25;
}>;
export declare function initialPlayerReadiness(): PlayerReadinessState;
export declare function retirePlayerReadiness(state: PlayerReadinessState): PlayerReadinessState;
export declare function playerReadinessAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionPlayerReadiness(state: PlayerControlState, input: PlayerReadinessInput): PlayerControlDecision;
export {};
