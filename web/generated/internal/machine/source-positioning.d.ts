// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
export type SourcePositioningCommand = Readonly<{
    kind: 'settled' | 'seek';
    target: number;
}> | Readonly<{
    kind: 'previous.pause' | 'previous.time' | 'monitor.release' | 'position' | 'positioned' | 'candidate.error' | 'plan' | 'volume.observe' | 'ready';
}> | Readonly<{
    kind: 'play';
    native: boolean;
}> | Readonly<{
    kind: 'volume';
    value: number;
}> | Readonly<{
    kind: 'reject';
    message: string;
}>;
export type SourcePositioningEffect = SourcePositioningCommand & Readonly<{
    step: number;
}>;
export type SourcePositioning = Readonly<{
    commands: readonly SourcePositioningCommand[];
    cursor: number;
    pending: number | null;
    target: number;
    volume: number;
    planId: string;
    planMatches: boolean;
}>;
export type SourcePositioningObservation = Readonly<{
    kind: 'time';
    value: number;
} | {
    kind: 'plan';
    actual: string | null;
    eligible: boolean;
} | {
    kind: 'muted';
    value: boolean;
}>;
export declare function initialSourcePositioning(facts: Readonly<{
    mode: PlaybackMode;
    planId: string;
    target: number;
    overlapping: boolean;
    settings: Readonly<PlaybackSettings>;
}>): SourcePositioning;
export declare function claimSourcePositioning(state: SourcePositioning): Readonly<{
    state: SourcePositioning;
    accepted: boolean;
    effect?: SourcePositioningEffect;
}>;
export declare function sourcePositioningDone(state: SourcePositioning): boolean;
export declare function completeSourcePositioning(state: SourcePositioning, step: number, observation?: SourcePositioningObservation): Readonly<{
    state: SourcePositioning;
    accepted: boolean;
    positioned?: boolean;
}>;
