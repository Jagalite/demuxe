// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
type Phase = 'preparing' | 'configuring' | 'opening' | 'applying' | 'positioning' | 'verifying' | 'accepted';
export type SourceAttempt = Readonly<{
    id: number;
    operationEpoch: number;
    session: number;
    mode: PlaybackMode;
    preserve: boolean;
    phase: Phase;
    planId: string;
}>;
export type SourceControl = Readonly<{
    serial: number;
    attemptSerial: number;
    sessionSerial: number;
    acceptedSession: number | null;
    acceptedEpoch: number | null;
    mode: PlaybackMode;
    automatic: boolean;
    candidate: SourceAttempt | null;
}>;
export type SourceInput = Readonly<{
    type: 'source.configure';
    mode?: PlaybackMode;
    automatic?: boolean;
}> | Readonly<{
    type: 'source.begin';
    operationEpoch: number;
    mode: PlaybackMode;
    preserve: boolean;
    planId: string;
}> | Readonly<{
    type: 'source.created' | 'source.configured' | 'source.opened' | 'source.applied' | 'source.positioned' | 'source.finished';
    attempt: number;
}> | Readonly<{
    type: 'source.accept';
    attempt: number;
    operationEpoch: number;
    settings: Readonly<PlaybackSettings>;
    planMatches: boolean;
    timing?: Readonly<{
        elapsed: number;
        timestamps: readonly number[];
    }>;
    publicSelections?: Readonly<Partial<Record<'audio' | 'sub', string>>>;
}> | Readonly<{
    type: 'source.clear';
}>;
export type SourceDecision = Readonly<{
    state: SourceControl;
    accepted: boolean;
    attempt?: number;
    settings?: Readonly<PlaybackSettings>;
    newSource?: boolean;
    reason?: 'busy' | 'retired' | 'phase' | 'plan';
}>;
export declare function initialSource(): SourceControl;
/** Candidate and accepted identities are separate. A preserving handoff advances
 * session identity without changing the public source identity. Settings commit
 * is returned to the composed transition, never published independently. */
export declare function transitionSource(state: SourceControl, input: SourceInput): SourceDecision;
export declare function sourceDesiredSettings(settings: Readonly<PlaybackSettings>, facts: Readonly<{
    preserve: boolean;
    previousPause: boolean;
    previousSession: boolean;
    previousMode: PlaybackMode;
    mode: PlaybackMode;
}>): Readonly<PlaybackSettings>;
export {};
